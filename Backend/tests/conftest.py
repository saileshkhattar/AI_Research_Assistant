"""
Shared test setup.

These tests exercise consent-gating and account-deletion logic, not actual
connectivity to AWS KMS, Redis, or Google — so we fake those three
integration points with small deterministic stand-ins, isolate the DB to a
throwaway sqlite file, and point Chroma's persist dir at a temp folder.
Everything else (routing, DB cascades, JWT auth) runs for real.
"""
import os
import tempfile

# ---- Environment must be set BEFORE `main` (and everything it imports) ----
os.environ.setdefault("AUTH_JWT_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_OAUTH_CLIENT_ID", "test-client-id")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("KMS_KEY_ID", "arn:aws:kms:us-east-1:123456789012:key/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("HUGGINGFACE_API_KEY", "test-hf-token")

_tmp_db_fd, _tmp_db_path = tempfile.mkstemp(suffix=".db")
os.close(_tmp_db_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_path}"

# Chroma writes to a relative "chroma_db" dir by default — isolate it.
os.chdir(tempfile.mkdtemp())

import pytest
from fastapi.testclient import TestClient

import security
import routers.userRouter as user_router_module
import routers.accountRouter as account_router_module


class _FakeRedis:
    """Minimal in-memory stand-in for the redis client — get/setex/delete only."""

    def __init__(self):
        self.store = {}

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.store[key] = value

    def delete(self, key):
        self.store.pop(key, None)


fake_redis = _FakeRedis()


def _fake_encrypt(plaintext: str) -> str:
    """Deterministic, reversible stand-in for a KMS Encrypt call."""
    return f"enc::{plaintext}"


def _fake_decrypt(ciphertext_b64: str) -> str:
    """Mirrors real decrypt_secret's cache-then-source behaviour, but the
    'source' here is just decoding our fake prefix instead of calling KMS."""
    cache_key = security._cache_key(ciphertext_b64)
    cached = fake_redis.get(cache_key)
    if cached is not None:
        return cached
    if not ciphertext_b64.startswith("enc::"):
        raise ValueError("not a fake-encrypted value")
    plaintext = ciphertext_b64[len("enc::"):]
    fake_redis.setex(cache_key, 300, plaintext)
    return plaintext


def _fake_forget_cached_secret(ciphertext_b64: str) -> None:
    fake_redis.delete(security._cache_key(ciphertext_b64))


async def _fake_verify_google_access_token(access_token: str) -> dict:
    """Every distinct `access_token` string maps to a distinct fake Google identity."""
    return {
        "sub": f"google-sub-{access_token}",
        "email": f"{access_token}@example.com",
        "verified_email": "true",
        "aud": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
    }


# Patch the *source* module...
security._redis_client = fake_redis
security.encrypt_secret = _fake_encrypt
security.decrypt_secret = _fake_decrypt
security.forget_cached_secret = _fake_forget_cached_secret
security.verify_google_access_token = _fake_verify_google_access_token

# ...and every module that already did `from security import X`, since that
# creates an independent binding untouched by patching the source module.
user_router_module.encrypt_secret = _fake_encrypt
user_router_module.decrypt_secret = _fake_decrypt
user_router_module.verify_google_access_token = _fake_verify_google_access_token
account_router_module.forget_cached_secret = _fake_forget_cached_secret

import main  # noqa: E402  (must come after the patches above)
import rateLimit  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """The sliding-window limiter is a module-level singleton keyed by
    client IP + path — every test shares the same fake TestClient IP, so
    without a reset, unrelated tests would trip each other's limits."""
    rateLimit.limiter._requests.clear()
    yield


@pytest.fixture()
def client():
    return TestClient(main.app)


@pytest.fixture()
def signed_in_user(client):
    """Signs up a fresh user (unique per test) and returns (headers, user_id)."""

    def _sign_in(token_suffix: str = "u1"):
        resp = client.post("/auth/google", json={"access_token": f"tok-{token_suffix}-{os.urandom(16).hex()}"})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        headers = {"Authorization": f"Bearer {body['access_token']}"}
        return headers, body["user"]["id"]

    return _sign_in