import pytest
from cloudshield.Server.security.passwords import hash_password, verify_password


class TestPasswords:
    """Test suite for password hashing and verification"""

    def test_hash_password_returns_string(self):
        """Test that hash_password returns a string"""
        password = "test_password_123"
        hashed = hash_password(password)
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_hash_password_different_salts(self):
        """Test that same password produces different hashes (due to salt)"""
        password = "same_password"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        assert hash1 != hash2  # Different salts should produce different hashes
        assert isinstance(hash1, str)
        assert isinstance(hash2, str)

    def test_hash_password_empty_string(self):
        """Test hashing empty string"""
        hashed = hash_password("")
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_password_unicode_characters(self):
        """Test hashing password with unicode characters"""
        password = "pássw0rd_üñíc0dé_123"
        hashed = hash_password(password)
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed != password

    def test_hash_password_long_password(self):
        """Test hashing password at bcrypt limit (72 bytes)"""
        password = "a" * 72 
        hashed = hash_password(password)
        
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_password_too_long_password(self):
        """Test that very long passwords raise ValueError"""
        password = "a" * 1000  
        
        with pytest.raises(ValueError, match="password cannot be longer than 72 bytes"):
            print(hash_password)
            print(type(hash_password))
            hash_password(password)

    def test_verify_password_correct_password(self):
        """Test verification with correct password"""
        password = "correct_password_123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed)

    def test_verify_password_incorrect_password(self):
        """Test verification with incorrect password"""
        password = "correct_password"
        wrong_password = "wrong_password"
        hashed = hash_password(password)
        
        assert not verify_password(wrong_password, hashed)

    def test_verify_password_empty_strings(self):
        """Test verification with empty strings"""
        hashed_empty = hash_password("")
        
        assert verify_password("", hashed_empty)
        assert not verify_password("not_empty", hashed_empty)

    def test_verify_password_case_sensitive(self):
        """Test that password verification is case sensitive"""
        password = "CaseSensitive123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed)
        assert not verify_password(password.lower(), hashed)
        assert not verify_password(password.upper(), hashed)

    def test_verify_password_unicode(self):
        """Test verification with unicode passwords"""
        password = "pássw0rd_üñíc0dé_123"
        hashed = hash_password(password)
        
        assert verify_password(password, hashed)
        assert not verify_password("different_üñíc0dé", hashed)

    def test_hash_format_is_valid_bcrypt(self):
        """Test that the hash format is valid bcrypt"""
        password = "test_password"
        hashed = hash_password(password)
        
        assert hashed.startswith('$2b$')
        assert len(hashed) == 60 

    def test_verify_password_with_invalid_hash_format(self):
        """Test verification with invalid hash format"""
        password = "test_password"
        invalid_hash = "not_a_valid_bcrypt_hash"
        
        result = verify_password(password, invalid_hash)
        assert result is False

    def test_bcrypt_cost_factor(self):
        """Test that bcrypt uses appropriate cost factor"""
        password = "test_password"
        hashed = hash_password(password)
        
        parts = hashed.split('$')
        assert len(parts) >= 4
        cost = int(parts[2])
        assert cost >= 4 
        assert cost <= 15 

    def test_password_roundtrip_consistency(self):
        """Test multiple roundtrips of hash and verify"""
        passwords = [
            "simple",
            "Complex!P@ssw0rd123",
            "üñíc0dé_pássw0rd",
            "a" * 71,
            ""
        ]
        
        for password in passwords:
            hashed = hash_password(password)
            assert verify_password(password, hashed)
            if len(password) < 71:
                assert not verify_password(password + "x", hashed)
