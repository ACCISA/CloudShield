import os
import re
import sys

# Ensure Server package is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.tasks.dc_management import (  # noqa: E402
    validate_username,
    validate_password,
    short_uuid,
)


def test_validate_username_rules():
    assert validate_username("User_123") is True
    assert validate_username("bad space") is False
    assert validate_username("toolongusernameeeeeeeeeeeee") is False


def test_validate_password_rules():
    assert validate_password("GoodPass1!") is True
    assert validate_password("short") is False
    assert validate_password("Bad\nPass1!") is False


def test_short_uuid_is_urlsafe():
    uid = short_uuid()
    assert len(uid) >= 10
    assert "=" not in uid
    assert re.fullmatch(r"[A-Za-z0-9_-]+", uid)
