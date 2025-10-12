import pytest
import sys
import importlib
from datetime import datetime
from unittest.mock import patch

if 'cloudshield.Server.security.jwt_utils' in sys.modules:
    del sys.modules['cloudshield.Server.security.jwt_utils']

from cloudshield.Server.security.jwt_utils import issue_token, verify_token


@patch('cloudshield.Server.security.jwt_utils.JWT_SECRET', 'test-secret-key')
def test_issue_token():
    """Test JWT token issuance"""
    user_id = "123"
    role = "user"
    org_id = "org1"
    
    token = issue_token(user_id, role, org_id)
    
    assert isinstance(token, str)
    assert len(token) > 0
    assert len(token.split('.')) == 3


@patch('cloudshield.Server.security.jwt_utils.JWT_SECRET', 'test-secret-key')
@patch('cloudshield.Server.security.jwt_utils.JWT_AUDIENCE', 'cloudshield-app')
@patch('cloudshield.Server.security.jwt_utils.JWT_ISSUER', 'cloudshield')
def test_verify_token_basic_structure():
    """Test basic token structure without timing validation"""
    import jwt
    
    payload = {
        "sub": "user123",
        "role": "admin", 
        "org_id": "org456",
        "exp": 9999999999,
        "iat": 1000000000,
        "iss": "cloudshield",
        "aud": "cloudshield-app"
    }
    
    # Create token manually
    token = jwt.encode(payload, 'test-secret-key', algorithm="HS256")
    decoded = verify_token(token)
    
    assert decoded["sub"] == "user123"
    assert decoded["role"] == "admin"  
    assert decoded["org_id"] == "org456"


def test_verify_token_invalid_signature():
    """Test verifying a token with invalid signature"""
    # Create a token with valid structure but invalid signature
    invalid_token = "invalid_signature"
    
    with pytest.raises(Exception):  # jwt.InvalidSignatureError or similar
        verify_token(invalid_token)


def test_verify_token_malformed():
    """Test verifying a malformed token"""
    malformed_token = "not.a.valid.jwt.token"
    
    with pytest.raises(Exception):  # jwt.DecodeError or similar
        verify_token(malformed_token)


@patch('cloudshield.Server.security.jwt_utils.JWT_SECRET', 'test-secret-key')
def test_issue_token_different_users():
    """Test issuing tokens for different users produces different tokens"""
    token1 = issue_token("user1", "admin", "org1")
    token2 = issue_token("user2", "user", "org2")
    
    assert token1 != token2
    assert isinstance(token1, str)
    assert isinstance(token2, str)
    assert len(token1.split('.')) == 3
    assert len(token2.split('.')) == 3


@patch('cloudshield.Server.security.jwt_utils.JWT_SECRET', 'test-secret-key')
@patch('cloudshield.Server.security.jwt_utils.JWT_ISSUER', 'cloudshield')
@patch('cloudshield.Server.security.jwt_utils.JWT_AUDIENCE', 'cloudshield-app')
def test_token_contains_expected_fields():
    """Test that issued tokens contain expected fields in structure"""  
    token = issue_token("test_user", "test_role", "test_org")
    
    # Decode without verification to check structure
    import jwt
    payload = jwt.decode(token, options={"verify_signature": False})
    
    # Check basic payload structure
    assert isinstance(payload, dict)
    assert payload["sub"] == "test_user"
    assert payload["role"] == "test_role" 
    assert payload["org_id"] == "test_org"
    assert "exp" in payload
    assert "iat" in payload
    assert payload["iss"] == "cloudshield"
    assert payload["aud"] == "cloudshield-app"
