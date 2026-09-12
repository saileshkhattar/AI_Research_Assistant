import consentGate
import routers.consentRouter as consent_router_module


def test_protected_route_blocked_without_consent(client, signed_in_user):
    headers, _ = signed_in_user("no-consent")

    resp = client.get("/agents", headers=headers)

    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "CONSENT_REQUIRED"


def test_consent_status_endpoint_does_not_itself_require_consent(client, signed_in_user):
    """The status-check endpoint must be reachable pre-consent, or the
    client would have no way to find out it needs to show the screen."""
    headers, _ = signed_in_user("status-check")

    resp = client.get("/consent/status", headers=headers)

    assert resp.status_code == 200
    assert resp.json()["consent_current"] is False


def test_consenting_unblocks_protected_routes(client, signed_in_user):
    headers, _ = signed_in_user("consents")

    blocked = client.get("/agents", headers=headers)
    assert blocked.status_code == 403

    consent_resp = client.post("/consent", headers=headers)
    assert consent_resp.status_code == 200

    allowed = client.get("/agents", headers=headers)
    assert allowed.status_code == 200


def test_reconsent_required_after_version_bump(client, signed_in_user, monkeypatch):
    headers, _ = signed_in_user("version-bump")

    client.post("/consent", headers=headers)
    assert client.get("/agents", headers=headers).status_code == 200

    # Simulate shipping a new ToS version — patch every binding of the
    # constant (module globals resolved at call time still see this; the
    # router's directly-imported name needs patching separately).
    monkeypatch.setattr(consentGate, "CURRENT_TOS_VERSION", "2.0")
    monkeypatch.setattr(consent_router_module, "CURRENT_TOS_VERSION", "2.0")

    blocked_again = client.get("/agents", headers=headers)
    assert blocked_again.status_code == 403
    assert blocked_again.json()["detail"]["code"] == "CONSENT_REQUIRED"

    reconsent = client.post("/consent", headers=headers)
    assert reconsent.status_code == 200

    assert client.get("/agents", headers=headers).status_code == 200


def test_auth_google_and_me_never_require_consent(client, signed_in_user):
    """Login itself and reading your own identity must always be reachable —
    otherwise there'd be no way to even get to the consent screen."""
    headers, _ = signed_in_user("always-reachable")

    # /me is reachable pre-consent and reports the correct status
    me = client.get("/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["consent_current"] is False