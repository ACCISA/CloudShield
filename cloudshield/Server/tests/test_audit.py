import unittest.mock
import sys
import types
import importlib
import pytest
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
        collection.insert_one.return_value.inserted_id = ObjectId("123456789012345678901234")
        return collection

    @pytest.fixture
    def mock_guards(self):
        """Mock authentication and authorization guards"""
        def require_auth(fn):
            from functools import wraps
            @wraps(fn)
            def wrapper(*args, **kwargs):
                if not hasattr(g, 'user'):
                    g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
                return fn(*args, **kwargs)
            return wrapper

        def require_role(*roles):
            from functools import wraps
            def deco(fn):
                @wraps(fn)
                def wrapper(*args, **kwargs):
                    if g.get("user") is None or g.user.get("role") not in roles:
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
        
        # Mock the database 
        mock_db_module = types.ModuleType("utils.database")
        mock_db_admin = {"audit_logs": mock_audit_collection}
        mock_db_module.db_admin = mock_db_admin
        monkeypatch.setitem(sys.modules, "cloudshield.Server.utils.database", mock_db_module)
        
        mock_guards_module = types.ModuleType("security.guards")
        for name, mock_func in mock_guards.items():
            setattr(mock_guards_module, name, mock_func)
        monkeypatch.setitem(sys.modules, "cloudshield.Server.security.guards", mock_guards_module)
        
        # Clear any cached imports
        modules_to_clear = [name for name in sys.modules.keys() if 'cloudshield.Server.utils.audit' in name]
        for module_name in modules_to_clear:
            monkeypatch.delitem(sys.modules, module_name, raising=False)
        
        # Import and register the audit blueprint
        from cloudshield.Server.utils.audit import audit_bp
        app.register_blueprint(audit_bp)
        
        with app.test_client() as client:
            yield app, client, mock_audit_collection


    def test_log_audit_comprehensive(self, app_with_audit):
        """Test comprehensive audit logging functionality"""
        app, client, mock_collection = app_with_audit
        
        with app.app_context():
            from cloudshield.Server.utils.audit import log_audit
            
            # Basic functionality with all fields
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
            
            assert result == "123456789012345678901234"
            call_args = mock_collection.insert_one.call_args[0][0]
            assert call_args["action"] == "create"
            assert call_args["resource"] == "users"
            assert call_args["actor"]["id"] == "admin123"
            assert call_args["target"]["email"] == "john@example.com"
            assert call_args["reason"] == "New user registration"
            assert call_args["severity"] == "info"
            assert call_args["before"] == {"status": "inactive"}
            assert call_args["after"] == {"status": "active"}
            assert call_args["meta"] == {"batch_id": "batch_123"}
            assert isinstance(call_args["ts"], datetime)
            
            #Default values (minimal required fields)
            mock_collection.reset_mock()
            log_audit(action="read", resource="users")
            
            call_args = mock_collection.insert_one.call_args[0][0]
            assert call_args["actor"] is None
            assert call_args["target"] is None
            assert call_args["reason"] is None
            assert call_args["before"] == {}
            assert call_args["after"] == {}
            assert call_args["severity"] == "info"
            assert call_args["meta"] == {}
            
            # Different severity levels
            for severity in ["info", "warning", "error", "critical"]:
                mock_collection.reset_mock()
                log_audit(action="test", resource="test", severity=severity)
                call_args = mock_collection.insert_one.call_args[0][0]
                assert call_args["severity"] == severity
            
            # Database exception handling
            mock_collection.insert_one.side_effect = Exception("Database failed")
            result = log_audit(action="create", resource="users")
            assert result == ""
            
            
            mock_collection.reset_mock()
            mock_collection.insert_one.side_effect = None  # Reset exception
            
        with app.test_request_context('/', headers={
            'X-Forwarded-For': '192.168.1.100',
            'User-Agent': 'TestClient/1.0'
        }):
            log_audit(action="login", resource="auth")
            call_args = mock_collection.insert_one.call_args[0][0]
            assert call_args["ip"] == "192.168.1.100"
            assert call_args["ua"] == "TestClient/1.0"
        
        # Remote addr fallback
        with app.test_request_context('/', environ_base={'REMOTE_ADDR': '127.0.0.1'}):
            mock_collection.reset_mock()
            log_audit(action="login", resource="auth")
            call_args = mock_collection.insert_one.call_args[0][0]
            assert call_args["ip"] == "127.0.0.1"

    def test_list_audit_success_and_features(self, app_with_audit):
        """Test successful audit retrieval with various filters and features"""
        app, client, mock_collection = app_with_audit
        
        # Setup mock response
        mock_cursor = unittest.mock.MagicMock()
        mock_log = {
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
        }
        
        mock_cursor.__iter__.return_value = iter([mock_log])
        mock_find = mock_collection.find.return_value
        mock_sort = mock_find.sort.return_value
        mock_sort.limit.return_value = mock_cursor
        
        with app.app_context():
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            
            # Basic successful retrieval
            response = client.get('/audit')
            assert response.status_code == 200
            data = response.get_json()
            assert "items" in data
            assert len(data["items"]) == 1
            
            item = data["items"][0]
            assert item["_id"] == "123456789012345678901234"
            assert item["action"] == "create"
            assert item["resource"] == "users"
            assert item["actor"]["id"] == "admin123"
            
            # Verify proper sorting and limiting
            mock_find.sort.assert_called_with("ts", -1)
            mock_sort.limit.assert_called_with(200)
            
            # Verify response format (only expected fields)
            expected_fields = ["_id", "ts", "severity", "action", "resource", "actor", "target", "reason", "before", "after", "ip", "ua"]
            assert set(item.keys()) == set(expected_fields)
            assert "meta" not in item
            assert "extra_field" not in item
            
            # Query filters (action, actor, target)
            mock_collection.reset_mock()
            mock_cursor.__iter__.return_value = iter([])
            mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
            
            response = client.get('/audit?action=create&actor=admin123&target=user456')
            assert response.status_code == 200
            
            query = mock_collection.find.call_args[0][0]
            assert query["action"] == "create"
            assert query["actor.id"] == "admin123"
            assert query["target.id"] == "user456"
            
            # Date range filters
            mock_collection.reset_mock()
            response = client.get('/audit?since=2023-01-01T00:00:00Z&until=2023-12-31T23:59:59Z')
            assert response.status_code == 200
            
            query = mock_collection.find.call_args[0][0]
            assert "$gte" in query["ts"]
            assert "$lte" in query["ts"]
            assert query["ts"]["$gte"].year == 2023
            assert query["ts"]["$lte"].year == 2023
            
            # Single date filters
            mock_collection.reset_mock()
            response = client.get('/audit?since=2023-06-01T00:00:00Z')
            query = mock_collection.find.call_args[0][0]
            assert "$gte" in query["ts"]
            assert "$lte" not in query["ts"]
            
            mock_collection.reset_mock()
            response = client.get('/audit?until=2023-06-30T23:59:59Z')
            query = mock_collection.find.call_args[0][0]
            assert "$lte" in query["ts"]
            assert "$gte" not in query["ts"]

    def test_list_audit_security(self, app_with_audit):
        """Test authentication and authorization for audit endpoint"""
        app, client, mock_collection = app_with_audit
        
        mock_cursor = unittest.mock.MagicMock()
        mock_cursor.__iter__.return_value = iter([])
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        
        with app.app_context():
            # Admin role required, non-admin should be forbidden
            g.user = {"id": "user123", "role": "employee", "org_id": "org_001"}
            response = client.get('/audit')
            assert response.status_code == 403
            data = response.get_json()
            assert data["error"] == "Forbidden"
            
            # Admin role should be allowed
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            response = client.get('/audit')
            assert response.status_code == 200
            

    def test_list_audit_edge_cases(self, app_with_audit):
        """Test edge cases and error handling for audit endpoint"""
        app, client, mock_collection = app_with_audit
        
        with app.app_context():
            g.user = {"id": "admin123", "role": "admin", "org_id": "org_001"}
            
            # Malformed date handling (should cause 500 error)
            response = client.get('/audit?since=invalid-date')
            assert response.status_code == 500
            
            # Empty query (no filters)
            mock_cursor = unittest.mock.MagicMock()
            mock_cursor.__iter__.return_value = iter([])
            mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
            
            response = client.get('/audit')
            assert response.status_code == 200
            query = mock_collection.find.call_args[0][0]
            assert query == {} 

