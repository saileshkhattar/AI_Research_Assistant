import security
from database import SessionLocal
from models.agents import Agent
from models.chat import Chat
from models.consent import Consent
from models.deletionLog import DeletionLog
from models.providerKeys import ProviderKey
from models.users import User
from tests.conftest import fake_redis


def _consent(client, headers):
    resp = client.post("/consent", headers=headers)
    assert resp.status_code == 200


def test_delete_account_removes_every_relevant_row(client, signed_in_user):
    headers, user_id = signed_in_user("delete-me")
    _consent(client, headers)

    # Create some data tied to this user: an extra agent, a chat, a groq key.
    agent_resp = client.post("/agents", json={"name": "Custom Agent"}, headers=headers)
    assert agent_resp.status_code == 200
    agent_id = agent_resp.json()["id"]

    chat_resp = client.post("/chats", params={"agent_id": agent_id}, headers=headers)
    assert chat_resp.status_code == 200
    chat_id = chat_resp.json()["id"]

    key_resp = client.put("/me/keys/groq", json={"api_key": "gsk_1234567890abcdefghij"}, headers=headers)
    assert key_resp.status_code == 204

    db = SessionLocal()
    provider_key_row = db.query(ProviderKey).filter(ProviderKey.user_id == user_id).first()
    assert provider_key_row is not None
    ciphertext = provider_key_row.ciphertext
    db.close()

    # Populate the Redis decrypt cache for this key, so we can prove it's
    # purged on deletion rather than just never having existed.
    security.decrypt_secret(ciphertext)
    cache_key = security._cache_key(ciphertext)
    assert fake_redis.get(cache_key) is not None

    deletions_before = SessionLocal().query(DeletionLog).count()

    delete_resp = client.delete("/account", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["deleted"] is True

    db = SessionLocal()
    assert db.query(User).filter(User.id == user_id).first() is None
    assert db.query(Agent).filter(Agent.user_id == user_id).count() == 0
    assert db.query(Chat).filter(Chat.id == chat_id).first() is None
    assert db.query(ProviderKey).filter(ProviderKey.user_id == user_id).count() == 0
    assert db.query(Consent).filter(Consent.user_id == user_id).first() is None

    # Non-personal deletion log gained exactly one row, with no user id in it.
    assert db.query(DeletionLog).count() == deletions_before + 1
    latest_log = db.query(DeletionLog).order_by(DeletionLog.deleted_at.desc()).first()
    assert not hasattr(latest_log, "user_id")
    db.close()

    # Redis-cached plaintext for the now-deleted key is gone.
    assert fake_redis.get(cache_key) is None


def test_delete_account_is_idempotent(client, signed_in_user):
    headers, _ = signed_in_user("delete-twice")
    _consent(client, headers)

    first = client.delete("/account", headers=headers)
    assert first.status_code == 200

    # Same (now-stale) bearer token used again: the user genuinely no
    # longer exists, so get_current_user correctly rejects it — cleanly,
    # not with a 500 from re-running delete logic against gone rows.
    second = client.delete("/account", headers=headers)
    assert second.status_code == 401


def test_delete_account_never_touches_another_users_data(client, signed_in_user):
    headers_a, user_a = signed_in_user("victim")
    headers_b, user_b = signed_in_user("bystander")
    _consent(client, headers_a)
    _consent(client, headers_b)

    client.delete("/account", headers=headers_a)

    # DELETE /account has no user-id parameter at all — identity comes only
    # from the caller's own bearer token — so there is no way for A's
    # deletion request to name B's account. Confirm B is untouched.
    db = SessionLocal()
    assert db.query(User).filter(User.id == user_b).first() is not None
    db.close()

    still_works = client.get("/me", headers=headers_b)
    assert still_works.status_code == 200