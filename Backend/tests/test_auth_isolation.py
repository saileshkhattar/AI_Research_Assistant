def _consent(client, headers):
    assert client.post("/consent", headers=headers).status_code == 200


def test_user_cannot_reach_another_users_agent(client, signed_in_user):
    """
    CreateAgentRequest/agent lookups take no user_id from the client at all —
    every query filters by Agent.user_id == user.id, where `user` comes from
    the verified bearer token (security.get_current_user). Confirm this
    holds functionally: user B cannot see or touch user A's private agent,
    even knowing its id.
    """
    headers_a, _ = signed_in_user("owner")
    headers_b, _ = signed_in_user("intruder")
    _consent(client, headers_a)
    _consent(client, headers_b)

    created = client.post("/agents", json={"name": "A's private agent"}, headers=headers_a)
    assert created.status_code == 200
    agent_id = created.json()["id"]

    # B knows the id but has no token proving ownership — must be denied.
    urls_as_b = client.get(f"/agents/{agent_id}/urls", headers=headers_b)
    assert urls_as_b.status_code == 404

    delete_as_b = client.delete(f"/agents/{agent_id}", headers=headers_b)
    assert delete_as_b.status_code == 404

    # A, the actual owner, can still see it.
    urls_as_a = client.get(f"/agents/{agent_id}/urls", headers=headers_a)
    assert urls_as_a.status_code == 200


def test_no_request_schema_accepts_a_client_supplied_user_id(client, signed_in_user):
    """
    Sanity check on the schemas themselves: none of the mutating request
    bodies has a `user_id` field a client could try to spoof — identity is
    only ever the Depends(get_current_user)/Depends(require_consent) value.
    """
    from requestSchemas.requestSchemas import (
        CreateAgentRequest,
        IngestRequest,
        ProviderKeyRequest,
        QueryRequest,
        RenameChatRequest,
    )

    for schema in (CreateAgentRequest, IngestRequest, ProviderKeyRequest, QueryRequest, RenameChatRequest):
        assert "user_id" not in schema.model_fields, f"{schema.__name__} should not accept a client-supplied user_id"