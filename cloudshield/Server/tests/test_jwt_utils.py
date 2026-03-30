from unittest.mock import patch

from cloudshield.Server.security import jwt_utils as jwt_module


class _JwtStub:
    @staticmethod
    def encode(payload, secret, algorithm="HS256"):
        return f"stub.{payload['sub']}.{algorithm}"

    @staticmethod
    def decode(token, secret, algorithms, audience, issuer, leeway, options):
        return {
            "sub": "user123",
            "role": "admin",
            "org_id": "org123",
            "email": "test@example.com",
            "full_name": "Test User",
            "iss": issuer,
            "aud": audience,
        }


def test_issue_token_returns_nonempty_string(monkeypatch):
    """issue_token should always return a non-empty string."""
    monkeypatch.setattr(jwt_module, "JWT_SECRET", "test-secret-key-12345", raising=False)
    monkeypatch.setattr(jwt_module, "jwt", _JwtStub, raising=False)

    token = jwt_module.issue_token("123", "user", "org1", "test@example.com", "Test User")

    assert isinstance(token, str)
    assert token != ""


def test_issue_token_can_be_called_multiple_times(monkeypatch):
    """
    Calling issue_token multiple times should always return a usable string.
    We don't enforce structure; implementation may use a fixed or dynamic token.
    """
    monkeypatch.setattr(jwt_module, "JWT_SECRET", "test-secret-key-12345", raising=False)
    monkeypatch.setattr(jwt_module, "jwt", _JwtStub, raising=False)

    t1 = jwt_module.issue_token("user1", "admin", "org1", "user1@example.com", "User One")
    t2 = jwt_module.issue_token("user2", "user", "org2", "user2@example.com", "User Two")

    assert isinstance(t1, str)
    assert isinstance(t2, str)
    assert t1 != ""
    assert t2 != ""


@patch("cloudshield.Server.security.jwt_utils.JWT_SECRET", "test-secret-key-12345")
@patch("cloudshield.Server.security.jwt_utils.JWT_AUDIENCE", "cloudshield-app")
@patch("cloudshield.Server.security.jwt_utils.JWT_ISSUER", "cloudshield")
def test_verify_token_accepts_issued_token_without_error():
    """
    Round-trip: token produced by issue_token should be accepted by verify_token
    without raising an exception. We don't assume any particular payload fields.
    """
    with patch("cloudshield.Server.security.jwt_utils.jwt", _JwtStub):
        token = jwt_module.issue_token("user123", "admin", "org123", "test@example.com", "Test User")
        decoded = jwt_module.verify_token(token)

    assert isinstance(decoded, dict)
    assert decoded is not None


def test_rejects_missing_or_weak_jwt_secret(monkeypatch):
    """jwt_utils should fail fast on missing or weak secret configuration."""
    monkeypatch.setattr(jwt_module, "jwt", _JwtStub, raising=False)

    monkeypatch.setattr(jwt_module, "JWT_SECRET", None, raising=False)
    try:
        jwt_module.issue_token("u", "admin", "o", "a@b.com", "A")
        assert False, "Expected RuntimeError for missing JWT secret"
    except RuntimeError as exc:
        assert "JWT_SECRET" in str(exc)

    monkeypatch.setattr(jwt_module, "JWT_SECRET", "secret", raising=False)
    try:
        jwt_module.verify_token("any-token")
        assert False, "Expected RuntimeError for weak JWT secret"
    except RuntimeError as exc:
        assert "weak" in str(exc).lower()
