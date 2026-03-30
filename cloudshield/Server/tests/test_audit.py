import unittest.mock
import sys
import types
import pytest
import importlib.util
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify, g
from bson import ObjectId


# Mock pymongo and related dependencies first
mock_mongo_client = unittest.mock.MagicMock()
mock_mongo_client.return_value.admin.command.return_value = None

mock_errors = unittest.mock.MagicMock()
mock_errors.PyMongoError = Exception
mock_errors.DuplicateKeyError = Exception
mock_errors.OperationFailure = Exception

mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.MongoClient = mock_mongo_client
mock_pymongo.errors = mock_errors

sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = mock_errors


class TestAudit:
    """test suite for audit functionality"""
    
    @pytest.fixture
    def mock_audit_collection(self):
        """Mock the audit logs collection"""
        collection = unittest.mock.MagicMock()
        # Configure the mock to return a proper inserted_id string when insert_one is called
        def insert_one_side_effect(doc):
            result = unittest.mock.MagicMock()
            # Use str(ObjectId()) to generate a valid ID, or use a test ID
            result.inserted_id = "123456789012345678901234"
            return result
        
        collection.insert_one.side_effect = insert_one_side_effect
        return collection

    @pytest.fixture
    def mock_guards(self):
        """Mock authentication and authorization guards"""
        def require_auth(fn):
            from functools import wraps
            @wraps(fn)
            def wrapper(*args, **kwargs):
                # Auto-set admin user for testing
                g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
                return fn(*args, **kwargs)
            return wrapper

        def require_role(*roles):
            from functools import wraps
            def deco(fn):
                @wraps(fn)
                def wrapper(*args, **kwargs):
                    # Auto-set user if not present
                    if not hasattr(g, 'user') or g.user is None:
                        g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
                    # Check role
                    if g.user.get("role") not in roles:
                        return jsonify({"error": "Forbidden"}), 403
                    return fn(*args, **kwargs)
                return wrapper
            return deco

        return {
            'require_auth': require_auth,
            'require_role': require_role
        }

    @pytest.fixture
    def app_with_audit(self, mock_audit_collection, mock_guards, monkeypatch):
        """Create Flask app with mocked audit functionality"""
        app = Flask(__name__)
        
        # Mock the database at cloudshield.Server.utils level
        mock_db_module = types.ModuleType("cloudshield.Server.utils")
        # Configure db_admin as a dict-like object where accessing "audit_logs" returns our mock
        mock_db_admin = {"audit_logs": mock_audit_collection}
        mock_db_module.db_admin = mock_db_admin
        monkeypatch.setitem(sys.modules, "cloudshield.Server.utils", mock_db_module)
        
        # Ensure parent packages exist
        mock_server_module = types.ModuleType("cloudshield.Server")
        monkeypatch.setitem(sys.modules, "cloudshield.Server", mock_server_module)
        mock_cs_module = types.ModuleType("cloudshield")
        monkeypatch.setitem(sys.modules, "cloudshield", mock_cs_module)
        
        # Mock the guards at cloudshield.Server.security level BEFORE importing audit
        mock_guards_module = types.ModuleType("cloudshield.Server.security")
        for name, mock_func in mock_guards.items():
            setattr(mock_guards_module, name, mock_func)
        monkeypatch.setitem(sys.modules, "cloudshield.Server.security", mock_guards_module)
        
        # Also mock at just "security" level for fallback imports
        mock_guards_module2 = types.ModuleType("security")
        for name, mock_func in mock_guards.items():
            setattr(mock_guards_module2, name, mock_func)
        monkeypatch.setitem(sys.modules, "security", mock_guards_module2)
        
        # Clear any cached imports of audit
        modules_to_clear = [name for name in sys.modules.keys() if 'audit' in name and 'test_audit' not in name]
        for module_name in modules_to_clear:
            monkeypatch.delitem(sys.modules, module_name, raising=False)
        
        # Import and register the audit blueprint from the mocked cloudshield.Server.utils
        audit_path = Path(__file__).resolve().parents[1] / "utils" / "audit.py"
        audit_spec = importlib.util.spec_from_file_location("cloudshield.Server.utils.audit", audit_path)
        audit_mod = importlib.util.module_from_spec(audit_spec)
        
        # Pre-populate sys.modules to ensure imports work correctly
        monkeypatch.setitem(sys.modules, "cloudshield.Server.utils.audit", audit_mod)
        
        # Execute the module with the mocked dependencies
        audit_spec.loader.exec_module(audit_mod)
        
        # Replace the module-level _audit variable to use our mock collection
        audit_mod._audit = mock_audit_collection
        
        app.register_blueprint(audit_mod.audit_bp)
        
        with app.test_client() as client:
            yield app, client, mock_audit_collection


    def test_log_audit_comprehensive(self, monkeypatch):
        """Test comprehensive audit logging functionality"""
        # Create a fresh mock collection for this test
        mock_collection = unittest.mock.MagicMock()
        
        # Set up the mock to return proper values
        def mock_insert_one(doc):
            result = unittest.mock.MagicMock()
            result.inserted_id = "123456789012345678901234"
            return result
        
        mock_collection.insert_one.side_effect = mock_insert_one
        
        # Patch the audit module's _audit variable
        import cloudshield.Server.utils.audit as audit_module
        monkeypatch.setattr(audit_module, "_audit", mock_collection)
        
        from cloudshield.Server.utils.audit import log_audit
        
        # Test basic functionality with all fields
        result = log_audit(
            action="create",
            resource="users",
            actor={"id": "admin123", "role": "admin", "org_id": "org_001"},
            target={"id": "user456", "email": "john@example.com"},
            reason="New user registration",
            severity="info",
            before={"status": "inactive"},
            after={"status": "active"},
            meta={"batch_id": "batch_123"}
        )
        
        # Result should be the string ID
        assert result == "123456789012345678901234"
        assert mock_collection.insert_one.called
        
        # Verify the document structure
        call_args = mock_collection.insert_one.call_args[0][0]
        assert call_args["action"] == "create"
        assert call_args["resource"] == "users"
        assert call_args["severity"] == "info"
        assert call_args["reason"] == "New user registration"
        
        # Test with different severity
        mock_collection.reset_mock()
        result = log_audit(action="read", resource="users", severity="warning")
        assert result == "123456789012345678901234"
        
        # Test exception handling - should return empty string
        mock_collection.insert_one.side_effect = Exception("Database failed")
        result = log_audit(action="create", resource="users")
        assert result == ""

    def test_list_audit_success_and_features(self, monkeypatch):
        """Test successful audit retrieval with various filters and features"""
        import cloudshield.Server.utils.audit as audit_module
        from cloudshield.Server.security import require_auth, require_role
        
        # Create a mock collection for this test
        mock_collection = unittest.mock.MagicMock()
        monkeypatch.setattr(audit_module, "_audit", mock_collection)
        
        # Setup mock response with proper cursor iteration
        mock_logs = [
            {
                "_id": ObjectId("123456789012345678901234"),
                "ts": datetime(2023, 1, 1, 12, 0, 0),
                "severity": "info",
                "action": "create",
                "resource": "users",
                "actor": {"id": "admin123", "role": "admin"},
                "target": {"id": "user456", "email": "john@example.com"},
                "reason": "New user",
                "before": {},
                "after": {"status": "active"},
                "ip": "192.168.1.1",
                "ua": "Browser/1.0",
                "meta": {"extra": "data"},
                "extra_field": "should_not_appear"
            },
            {
                "_id": ObjectId("234567890123456789012345"),
                "ts": datetime(2023, 1, 2, 12, 0, 0),
                "severity": "warning",
                "action": "update",
                "resource": "users",
                "actor": {"id": "admin123", "role": "admin"},
                "target": {"id": "user789", "email": "jane@example.com"},
                "reason": "Permission update",
                "before": {"role": "user"},
                "after": {"role": "moderator"},
                "ip": "192.168.1.2",
                "ua": "Browser/2.0",
                "meta": {"reason_code": "promo"}
            }
        ]
        
        mock_cursor = unittest.mock.MagicMock()
        mock_cursor.__iter__.return_value = iter(mock_logs)
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        
        from cloudshield.Server.utils.audit import list_audit
        from flask import Flask, g
        
        app = Flask(__name__)
        with app.test_request_context('/audit'):
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            
            # Call list_audit directly since it's wrapped by decorators
            response = list_audit()
            assert response[1] == 200
            data = response[0].get_json()
            assert "items" in data
            assert len(data["items"]) == 2
            
            # Verify first item fields
            assert data["items"][0]["action"] == "create"
            assert data["items"][0]["resource"] == "users"
            assert "extra_field" not in data["items"][0]
            
            # Test filtering  by action
            mock_collection.reset_mock()
            mock_cursor_filtered = unittest.mock.MagicMock()
            mock_cursor_filtered.__iter__.return_value = iter([mock_logs[0]])
            mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor_filtered
            
            # Make a request with filters
            with app.test_request_context('/audit?action=create'):
                g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
                response = list_audit()
                call_args = mock_collection.find.call_args[0][0]
                assert call_args.get("action") == "create"
            

    def test_list_audit_security(self, monkeypatch):
        """Test authentication and authorization for audit endpoint"""
        import cloudshield.Server.utils.audit as audit_module
        
        # Create a mock collection for this test
        mock_collection = unittest.mock.MagicMock()
        monkeypatch.setattr(audit_module, "_audit", mock_collection)
        
        # Mock the cursor for successful responses
        mock_cursor = unittest.mock.MagicMock()
        mock_cursor.__iter__.return_value = iter([])
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        
        from cloudshield.Server.utils.audit import list_audit
        from flask import Flask, g
        
        app = Flask(__name__)
        
        with app.test_request_context('/audit'):
            # Test with admin role - should succeed
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            response = list_audit()
            assert response[1] == 200
            data = response[0].get_json()
            assert "items" in data
            
            # Test with non-admin role - should be forbidden
            g.user = {"id": "user123", "role": "employee", "org_id": "org_001"}
            response = list_audit()
            assert response[1] == 403
            data = response[0].get_json()
            assert "error" in data
            assert data["error"] == "Forbidden"
            

    def test_list_audit_edge_cases(self, monkeypatch):
        """Test edge cases and error handling for audit endpoint"""
        import cloudshield.Server.utils.audit as audit_module
        
        # Create a mock collection for this test
        mock_collection = unittest.mock.MagicMock()
        monkeypatch.setattr(audit_module, "_audit", mock_collection)
        
        from cloudshield.Server.utils.audit import list_audit
        from flask import Flask, g
        
        app = Flask(__name__)
        
        with app.test_request_context('/audit?since=invalid-date'):
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            # Malformed date should cause an error (either 400 or 500)
            try:
                response = list_audit()
                # If it doesn't raise, check the status
                assert response[1] in [400, 500]
            except ValueError:
                # It's also acceptable if it raises ValueError
                pass
            
        # Empty query (no filters)
        mock_collection.reset_mock()
        mock_cursor = unittest.mock.MagicMock()
        mock_cursor.__iter__.return_value = iter([])
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        
        with app.test_request_context('/audit'):
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            response = list_audit()
            assert response[1] == 200
            data = response[0].get_json()
            assert data["items"] == []
            
        # Query with multiple filters
        mock_collection.reset_mock()
        with app.test_request_context('/audit?action=create&actor=admin123&target=user456'):
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            response = list_audit()
            assert response[1] == 200
            call_args = mock_collection.find.call_args[0][0]
            assert call_args.get("action") == "create"
            assert call_args.get("actor.id") == "admin123"
            assert call_args.get("target.id") == "user456"
            
        # Date range filtering with valid ISO format
        mock_collection.reset_mock()
        with app.test_request_context('/audit?since=2023-01-01T00:00:00&until=2023-01-02T00:00:00'):
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            response = list_audit()
            assert response[1] == 200
            call_args = mock_collection.find.call_args[0][0]
            assert "$gte" in call_args.get("ts", {})
            assert "$lte" in call_args.get("ts", {})


def test_log_audit_basic(monkeypatch):
    """Test basic log_audit functionality without Flask context"""
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "test_id_12345"
    mock_collection.insert_one.return_value = mock_result
    
    # Mock the db_admin
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    result = log_audit(
        action="create",
        resource="users",
        actor={"id": "user1"},
        target={"id": "user2"}
    )
    
    assert result == "test_id_12345"
    assert mock_collection.insert_one.called


def test_log_audit_with_all_fields(monkeypatch):
    """Test log_audit with all optional fields"""
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "full_test_id"
    mock_collection.insert_one.return_value = mock_result
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    result = log_audit(
        action="update",
        resource="users",
        actor={"id": "admin", "role": "admin"},
        target={"id": "user123", "email": "test@example.com"},
        reason="User profile update",
        before={"name": "Old Name"},
        after={"name": "New Name"},
        severity="warning",
        meta={"source": "api"}
    )
    
    assert result == "full_test_id"
    call_args = mock_collection.insert_one.call_args[0][0]
    assert call_args["action"] == "update"
    assert call_args["resource"] == "users"
    assert call_args["severity"] == "warning"
    assert call_args["reason"] == "User profile update"
    assert call_args["before"] == {"name": "Old Name"}
    assert call_args["after"] == {"name": "New Name"}
    assert call_args["meta"] == {"source": "api"}


def test_log_audit_minimal_fields(monkeypatch):
    """Test log_audit with only required fields"""
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "minimal_id"
    mock_collection.insert_one.return_value = mock_result
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    result = log_audit(action="read", resource="data")
    
    assert result == "minimal_id"
    call_args = mock_collection.insert_one.call_args[0][0]
    assert call_args["action"] == "read"
    assert call_args["resource"] == "data"
    assert call_args["actor"] is None
    assert call_args["target"] is None
    assert call_args["before"] == {}
    assert call_args["after"] == {}
    assert call_args["meta"] == {}


def test_log_audit_exception_handling(monkeypatch):
    """Test log_audit when database insert fails"""
    mock_collection = unittest.mock.MagicMock()
    mock_collection.insert_one.side_effect = Exception("Database error")
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    result = log_audit(action="test", resource="test")
    
    # Should return empty string on exception
    assert result == ""


def test_log_audit_with_request_context(monkeypatch):
    """Test log_audit captures IP and User-Agent from Flask request context"""
    from flask import Flask
    
    app = Flask(__name__)
    
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "context_id"
    mock_collection.insert_one.return_value = mock_result
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    with app.test_request_context(
        '/',
        headers={
            'X-Forwarded-For': '10.0.0.1',
            'User-Agent': 'TestBrowser/1.0'
        }
    ):
        log_audit(action="login", resource="auth")
        
        call_args = mock_collection.insert_one.call_args[0][0]
        assert call_args["ip"] == "10.0.0.1"
        assert call_args["ua"] == "TestBrowser/1.0"


def test_log_audit_remote_addr_fallback(monkeypatch):
    """Test log_audit uses remote_addr when X-Forwarded-For is not present"""
    from flask import Flask
    
    app = Flask(__name__)
    
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "remote_id"
    mock_collection.insert_one.return_value = mock_result
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
        log_audit(action="access", resource="page")
        
        call_args = mock_collection.insert_one.call_args[0][0]
        assert call_args["ip"] == "127.0.0.1"


def test_log_audit_different_severities(monkeypatch):
    """Test log_audit with different severity levels"""
    mock_collection = unittest.mock.MagicMock()
    mock_result = unittest.mock.MagicMock()
    mock_result.inserted_id = "severity_id"
    mock_collection.insert_one.return_value = mock_result
    
    monkeypatch.setattr("cloudshield.Server.utils.audit._audit", mock_collection)
    
    from cloudshield.Server.utils.audit import log_audit
    
    for severity in ["info", "warning", "error", "critical"]:
        mock_collection.reset_mock()
        log_audit(action="test", resource="test", severity=severity)
        
        call_args = mock_collection.insert_one.call_args[0][0]
        assert call_args["severity"] == severity


def test_audit_blueprint_registered():
    """Test that audit_bp can be imported and is a Blueprint"""
    from cloudshield.Server.utils.audit import audit_bp
    from flask import Blueprint
    
    assert isinstance(audit_bp, Blueprint)
    assert audit_bp.name == "audit"


def test_audit_module_exports():
    """Test that audit module exports expected items"""
    from cloudshield.Server.utils import audit
    
    assert hasattr(audit, "audit_bp")
    assert hasattr(audit, "log_audit")
    assert "audit_bp" in audit.__all__
    assert "log_audit" in audit.__all__


def test_audit_collection_accessible():
    """Test that audit collection is accessible"""
    from cloudshield.Server.utils.audit import _audit
    
    assert _audit is not None
    # Collection should have MongoDB methods (or be a mock)
    assert hasattr(_audit, 'insert_one') or hasattr(_audit, '_mock_name')
    assert hasattr(_audit, 'find') or hasattr(_audit, '_mock_name')


