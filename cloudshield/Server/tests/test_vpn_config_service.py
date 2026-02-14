"""Tests for services.vpn_config_service (store / retrieve .ovpn configs)."""
import base64
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from bson import Binary, ObjectId


# ---------------------------------------------------------------------------
# store_vpn_config
# ---------------------------------------------------------------------------

class TestStoreVpnConfig:
    """Unit tests for store_vpn_config."""

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_store_inserts_new_config(self, mock_get_col):
        from services.vpn_config_service import store_vpn_config

        mock_col = MagicMock()
        mock_col.update_one.return_value = MagicMock(
            matched_count=0,
            modified_count=0,
            upserted_id=ObjectId(),
        )
        mock_get_col.return_value = mock_col

        result = store_vpn_config("org1", "alice", "alice.ovpn", b"ovpn-bytes")

        assert result["matched_count"] == 0
        assert result["modified_count"] == 0
        assert result["upserted_id"] is not None

        # Verify update_one was called with correct filter
        call_args = mock_col.update_one.call_args
        assert call_args[0][0] == {"org_id": "org1", "username": "alice"}

        # Verify $set contains Binary content
        set_doc = call_args[0][1]["$set"]
        assert set_doc["filename"] == "alice.ovpn"
        assert isinstance(set_doc["content"], Binary)
        assert bytes(set_doc["content"]) == b"ovpn-bytes"

        # Verify upsert=True
        assert call_args[1]["upsert"] is True

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_store_updates_existing_config(self, mock_get_col):
        from services.vpn_config_service import store_vpn_config

        mock_col = MagicMock()
        mock_col.update_one.return_value = MagicMock(
            matched_count=1,
            modified_count=1,
            upserted_id=None,
        )
        mock_get_col.return_value = mock_col

        result = store_vpn_config("org1", "alice", "alice.ovpn", b"new-bytes")

        assert result["matched_count"] == 1
        assert result["modified_count"] == 1
        assert result["upserted_id"] is None

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_store_sets_timestamps(self, mock_get_col):
        from services.vpn_config_service import store_vpn_config

        mock_col = MagicMock()
        mock_col.update_one.return_value = MagicMock(
            matched_count=0, modified_count=0, upserted_id=ObjectId(),
        )
        mock_get_col.return_value = mock_col

        store_vpn_config("org1", "bob", "bob.ovpn", b"data")

        call_args = mock_col.update_one.call_args
        set_doc = call_args[0][1]["$set"]
        insert_doc = call_args[0][1]["$setOnInsert"]

        assert "updated_at" in set_doc
        assert isinstance(set_doc["updated_at"], datetime)
        assert "created_at" in insert_doc
        assert isinstance(insert_doc["created_at"], datetime)


# ---------------------------------------------------------------------------
# get_vpn_config
# ---------------------------------------------------------------------------

class TestGetVpnConfig:
    """Unit tests for get_vpn_config."""

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_get_returns_none_when_not_found(self, mock_get_col):
        from services.vpn_config_service import get_vpn_config

        mock_col = MagicMock()
        mock_col.find_one.return_value = None
        mock_get_col.return_value = mock_col

        result = get_vpn_config("org1", "nobody")
        assert result is None

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_get_returns_base64_encoded_content(self, mock_get_col):
        from services.vpn_config_service import get_vpn_config

        raw = b"client\ndev tun\nproto udp\n"
        now = datetime.now(timezone.utc)
        mock_col = MagicMock()
        mock_col.find_one.return_value = {
            "filename": "alice.ovpn",
            "content": Binary(raw),
            "created_at": now,
            "updated_at": now,
        }
        mock_get_col.return_value = mock_col

        result = get_vpn_config("org1", "alice")

        assert result is not None
        assert result["filename"] == "alice.ovpn"
        assert result["content_b64"] == base64.b64encode(raw).decode("ascii")
        assert result["created_at"] == now
        assert result["updated_at"] == now

        # Verify find_one was called with correct filter
        mock_col.find_one.assert_called_once_with(
            {"org_id": "org1", "username": "alice"}
        )

    @patch("services.vpn_config_service._get_vpn_configs_collection")
    def test_get_handles_missing_timestamps(self, mock_get_col):
        from services.vpn_config_service import get_vpn_config

        mock_col = MagicMock()
        mock_col.find_one.return_value = {
            "filename": "bob.ovpn",
            "content": Binary(b"data"),
        }
        mock_get_col.return_value = mock_col

        result = get_vpn_config("org1", "bob")

        assert result["filename"] == "bob.ovpn"
        assert result["created_at"] is None
        assert result["updated_at"] is None
