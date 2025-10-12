import unittest.mock
import sys
import pytest

# Create proper exception classes for mocking
class MockDuplicateKeyError(Exception):
    pass

class MockOperationFailure(Exception):
    pass

mock_task_queue = unittest.mock.MagicMock()
mock_redis_conn = unittest.mock.MagicMock()
mock_create_ec2 = unittest.mock.MagicMock()
mock_create_vpc = unittest.mock.MagicMock()
mock_job_class = unittest.mock.MagicMock()

# Mock users blueprint
mock_users_bp = unittest.mock.MagicMock()

# Mock pymongo.errors with proper exception classes
class MockPyMongoError(Exception):
    pass

mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.DuplicateKeyError = MockDuplicateKeyError
mock_pymongo_errors.OperationFailure = MockOperationFailure
mock_pymongo_errors.PyMongoError = MockPyMongoError

# Patch modules - these need to be set before server.py import
mock_redis_client = unittest.mock.MagicMock()
mock_redis_client.task_queue = mock_task_queue
mock_redis_client.redis_conn = mock_redis_conn
mock_pymongo = unittest.mock.MagicMock()
mock_pymongo.errors = mock_pymongo_errors
sys.modules['pymongo'] = mock_pymongo
sys.modules['pymongo.errors'] = mock_pymongo_errors
sys.modules['redis_client'] = mock_redis_client
sys.modules['tasks'] = unittest.mock.MagicMock()
sys.modules['tasks'].create_ec2 = mock_create_ec2
sys.modules['tasks'].create_vpc = mock_create_vpc
sys.modules['rq.job'] = unittest.mock.MagicMock()
sys.modules['rq.job'].Job = mock_job_class
sys.modules['routes.users'] = unittest.mock.MagicMock()
sys.modules['routes.users'].users_bp = mock_users_bp
sys.modules['routes.audit'] = unittest.mock.MagicMock()
sys.modules['routes.audit'].audit_bp = None

from unittest.mock import MagicMock

from cloudshield.Server.server import app, _request_id, _error_json


class TestServer:
    """Test suite for server.py Flask application"""

    @pytest.fixture
    def client(self):
        """Create a test client for the Flask app"""
        app.config['TESTING'] = True
        with app.test_client() as client:
            with app.app_context():
                yield client

    def setup_method(self):
        """Reset mocks before each test"""
        mock_task_queue.reset_mock()
        mock_redis_conn.reset_mock()
        mock_create_ec2.reset_mock()
        mock_create_vpc.reset_mock()
        mock_job_class.reset_mock()

    def test_helper_functions(self, client):
        """Test helper functions: _request_id and _error_json"""
        # Test request ID generation
        with app.test_request_context('/'):
            request_id = _request_id()
            assert isinstance(request_id, str) and len(request_id) == 36
        
        # Test request ID from header
        test_id = "test-123"
        with app.test_request_context('/', headers={'X-Request-ID': test_id}):
            assert _request_id() == test_id
        
        # Test error JSON structure
        with app.test_request_context('/'):
            response, status = _error_json("Test error", "TEST_CODE", "details", 500)
            data = response.get_json()
            assert data["error"] == "Test error"
            assert data["code"] == "TEST_CODE"
            assert data["details"] == "details"
            assert "request_id" in data
            assert status == 500

    def test_healthz_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get('/healthz')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["status"] == "ok"
        assert "request_id" in data

    def test_json_validation_middleware(self, client):
        """Test JSON validation on write methods"""
        # Test POST with wrong content type
        response = client.post('/task/ec2', data='{"test": "data"}', content_type='text/plain')
        assert response.status_code == 400
        assert response.get_json()["code"] == "BAD_JSON"
        
        # Test GET requests pass through (no JSON required)
        response = client.get('/healthz')
        assert response.status_code == 200

    def test_task_endpoints(self, client):
        """Test EC2 and VPC task creation endpoints"""
        mock_job = MagicMock()
        mock_job.id = "job-123"
        mock_task_queue.enqueue.return_value = mock_job
        
        # Test EC2 with default instance type
        response = client.post('/task/ec2', json={})
        assert response.status_code == 202
        assert response.get_json()["job_id"] == "job-123"
        mock_task_queue.enqueue.assert_called_with(mock_create_ec2, "t2.micro")
        
        # Test EC2 with custom instance type
        mock_task_queue.reset_mock()
        response = client.post('/task/ec2', json={"instance_type": "t3.large"})
        assert response.status_code == 202
        mock_task_queue.enqueue.assert_called_with(mock_create_ec2, "t3.large")
        
        # Test VPC with default CIDR
        mock_task_queue.reset_mock()
        response = client.post('/task/vpc', json={})
        assert response.status_code == 202
        mock_task_queue.enqueue.assert_called_with(mock_create_vpc, "10.0.0.0/16")
        
        # Test VPC with custom CIDR
        mock_task_queue.reset_mock()
        response = client.post('/task/vpc', json={"cidr": "192.168.0.0/16"})
        assert response.status_code == 202
        mock_task_queue.enqueue.assert_called_with(mock_create_vpc, "192.168.0.0/16")

    def test_job_status_endpoint(self, client):
        """Test job status endpoint for various scenarios"""
        # Test successful job status
        mock_job = MagicMock()
        mock_job.id = "job-123"
        mock_job.get_status.return_value = "finished"
        mock_job.meta = {"progress": "100%"}
        mock_job.result = {"instance_id": "i-123456"}
        mock_job.is_finished = True
        mock_job_class.fetch.return_value = mock_job
        
        response = client.get('/status/job-123')
        assert response.status_code == 200
        data = response.get_json()
        assert data["job_id"] == "job-123"
        assert data["status"] == "finished"
        assert data["progress"] == "100%"
        assert data["result"] == {"instance_id": "i-123456"}
        
        # Test job not found
        mock_job_class.fetch.side_effect = Exception("Job not found")
        response = client.get('/status/nonexistent-job')
        assert response.status_code == 404
        assert response.get_json()["code"] == "JOB_NOT_FOUND"
        
        # Test job without progress meta
        mock_job_class.fetch.side_effect = None
        mock_job.meta = {}
        mock_job_class.fetch.return_value = mock_job
        response = client.get('/status/job-789')
        assert response.status_code == 200
        assert response.get_json()["progress"] == "No updates yet"

    def test_error_handling_and_endpoints(self, client):
        """Test error handlers and basic endpoint functionality"""
        # Test 404 handling
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404
        assert response.get_json()["code"] == "HTTP_404"
        
        # Test malformed JSON handling
        mock_job = MagicMock()
        mock_job.id = "job-malformed-123"
        mock_task_queue.enqueue.return_value = mock_job
        response = client.post('/task/ec2', data='invalid json', content_type='application/json')
        assert response.status_code == 202 
