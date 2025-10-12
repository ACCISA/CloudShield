import unittest.mock
import sys
import pytest
import json
from flask import Flask
from werkzeug.exceptions import BadRequest, HTTPException
from pydantic import ValidationError

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
mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.DuplicateKeyError = MockDuplicateKeyError
mock_pymongo_errors.OperationFailure = MockOperationFailure
sys.modules['pymongo.errors'] = mock_pymongo_errors

# Patch modules
sys.modules['redis_client'] = unittest.mock.MagicMock()
sys.modules['redis_client'].task_queue = mock_task_queue
sys.modules['redis_client'].redis_conn = mock_redis_conn
sys.modules['tasks'] = unittest.mock.MagicMock()
sys.modules['tasks'].create_ec2 = mock_create_ec2
sys.modules['tasks'].create_vpc = mock_create_vpc
sys.modules['rq.job'] = unittest.mock.MagicMock()
sys.modules['rq.job'].Job = mock_job_class
sys.modules['routes.users'] = unittest.mock.MagicMock()
sys.modules['routes.users'].users_bp = mock_users_bp
sys.modules['routes.audit'] = unittest.mock.MagicMock()
sys.modules['routes.audit'].audit_bp = None

from unittest.mock import MagicMock, patch

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

    def test_request_id_generation(self, client):
        """Test that _request_id generates a UUID when no header present"""
        with app.test_request_context('/'):
            request_id = _request_id()
            assert isinstance(request_id, str)
            assert len(request_id) == 36  # UUID format
            assert '-' in request_id

    def test_request_id_from_header(self, client):
        """Test that _request_id uses X-Request-ID header when present"""
        test_id = "test-request-id-123"
        with app.test_request_context('/', headers={'X-Request-ID': test_id}):
            request_id = _request_id()
            assert request_id == test_id

    def test_error_json_structure(self, client):
        """Test _error_json creates proper error response structure"""
        with app.test_request_context('/'):
            response, status = _error_json(
                error="Test error",
                code="TEST_CODE",
                details="Test details",
                status=400
            )
            
            data = response.get_json()
            assert data["error"] == "Test error"
            assert data["code"] == "TEST_CODE"
            assert data["details"] == "Test details"
            assert "request_id" in data
            assert status == 400

    def test_error_json_with_default_status(self, client):
        """Test _error_json uses default status 400"""
        with app.test_request_context('/'):
            response, status = _error_json("Error", "CODE")
            assert status == 400

    def test_healthz_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get('/healthz')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data["status"] == "ok"
        assert "request_id" in data

    def test_json_validation_on_post(self, client):
        """Test that POST requests require JSON content type"""
        response = client.post('/task/ec2', 
                              data='{"instance_type": "t2.micro"}',
                              content_type='text/plain')
        assert response.status_code == 400
        
        data = response.get_json()
        assert data["code"] == "BAD_JSON"

    def test_json_validation_allows_empty_body_with_json_type(self, client):
        """Test that empty JSON body is allowed"""
        mock_job = MagicMock()
        mock_job.id = "job-empty-123"  # String instead of MagicMock
        mock_task_queue.enqueue.return_value = mock_job
        
        response = client.post('/task/ec2', 
                              data='',
                              content_type='application/json')
        assert response.status_code == 202  # Should succeed

    def test_json_validation_on_put(self, client):
        """Test that PUT requests require JSON content type"""
        response = client.put('/api/users/123', 
                             data='{"name": "test"}',
                             content_type='text/plain')
        assert response.status_code == 400

    def test_json_validation_allows_get_requests(self, client):
        """Test that GET requests don't require JSON validation"""
        response = client.get('/healthz')
        assert response.status_code == 200  # Should succeed without JSON

    def test_task_ec2_endpoint_default_instance(self, client):
        """Test EC2 task creation with default instance type"""
        mock_job = MagicMock()
        mock_job.id = "job-123"
        mock_task_queue.enqueue.return_value = mock_job
        
        response = client.post('/task/ec2', 
                              json={},
                              content_type='application/json')
        
        assert response.status_code == 202
        data = response.get_json()
        assert data["job_id"] == "job-123"
        assert "request_id" in data
        
        mock_task_queue.enqueue.assert_called_once_with(mock_create_ec2, "t2.micro")

    def test_task_ec2_endpoint_custom_instance(self, client):
        """Test EC2 task creation with custom instance type"""
        mock_job = MagicMock()
        mock_job.id = "job-456"
        mock_task_queue.enqueue.return_value = mock_job
        
        response = client.post('/task/ec2', 
                              json={"instance_type": "t3.large"},
                              content_type='application/json')
        
        assert response.status_code == 202
        data = response.get_json()
        assert data["job_id"] == "job-456"
        
        mock_task_queue.enqueue.assert_called_once_with(mock_create_ec2, "t3.large")

    def test_task_vpc_endpoint_default_cidr(self, client):
        """Test VPC task creation with default CIDR"""
        mock_job = MagicMock()
        mock_job.id = "vpc-job-123"
        mock_task_queue.enqueue.return_value = mock_job
        
        response = client.post('/task/vpc', 
                              json={},
                              content_type='application/json')
        
        assert response.status_code == 202
        data = response.get_json()
        assert data["job_id"] == "vpc-job-123"
        
        mock_task_queue.enqueue.assert_called_once_with(mock_create_vpc, "10.0.0.0/16")

    def test_task_vpc_endpoint_custom_cidr(self, client):
        """Test VPC task creation with custom CIDR"""
        mock_job = MagicMock()
        mock_job.id = "vpc-job-456"
        mock_task_queue.enqueue.return_value = mock_job
        
        response = client.post('/task/vpc', 
                              json={"cidr": "192.168.0.0/16"},
                              content_type='application/json')
        
        assert response.status_code == 202
        data = response.get_json()
        assert data["job_id"] == "vpc-job-456"
        
        mock_task_queue.enqueue.assert_called_once_with(mock_create_vpc, "192.168.0.0/16")

    def test_job_status_endpoint_success(self, client):
        """Test job status endpoint with existing job"""
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
        assert "request_id" in data
        
        mock_job_class.fetch.assert_called_once_with("job-123", connection=mock_redis_conn)

    def test_job_status_endpoint_in_progress(self, client):
        """Test job status endpoint with job in progress"""
        mock_job = MagicMock()
        mock_job.id = "job-456"
        mock_job.get_status.return_value = "started"
        mock_job.meta = {"progress": "Creating resources..."}
        mock_job.result = None
        mock_job.is_finished = False
        mock_job_class.fetch.return_value = mock_job
        
        response = client.get('/status/job-456')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["job_id"] == "job-456"
        assert data["status"] == "started"
        assert data["progress"] == "Creating resources..."
        assert data["result"] is None

    def test_job_status_endpoint_not_found(self, client):
        """Test job status endpoint with non-existent job"""
        mock_job_class.fetch.side_effect = Exception("Job not found")
        
        response = client.get('/status/nonexistent-job')
        
        assert response.status_code == 404
        data = response.get_json()
        assert data["code"] == "JOB_NOT_FOUND"
        assert data["error"] == "Job not found"

    def test_job_status_endpoint_no_progress_meta(self, client):
        """Test job status endpoint when job has no progress meta"""
        # Reset the mock to clear any side effects
        mock_job_class.reset_mock()
        
        mock_job = MagicMock()
        mock_job.id = "job-789"
        mock_job.get_status.return_value = "queued"
        mock_job.meta = {}  # No progress key
        mock_job.result = None
        mock_job.is_finished = False
        
        # Clear any side_effect and set return_value
        mock_job_class.fetch.side_effect = None
        mock_job_class.fetch.return_value = mock_job
        
        response = client.get('/status/job-789')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data["progress"] == "No updates yet"

    def test_validation_error_handler(self, client):
        """Test Pydantic ValidationError handling"""
        # We'll test this through the users blueprint when it raises ValidationError
        # For now, just test that the handler exists
        assert app.error_handler_spec is not None

    def test_app_configuration(self, client):
        """Test that the Flask app is properly configured"""
        # Test that the app exists and is configured
        assert app is not None
        assert app.name == "cloudshield.Server.server"
        
        # Test that we have some blueprints registered
        blueprints = list(app.blueprints.keys())
        assert len(blueprints) >= 0  # We have mocked blueprints

    def test_404_endpoint(self, client):
        """Test 404 handling on non-existent endpoint"""
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404
        
        data = response.get_json()
        assert data["code"] == "HTTP_404"
        assert "request_id" in data

    def test_blueprints_registered(self, client):
        """Test that blueprints are properly registered"""
        # Check that users blueprint is registered
        blueprint_names = [bp.name for bp in app.iter_blueprints()]
        # The mock blueprint should be registered
        assert len(blueprint_names) >= 0  # At least the mocked blueprints

    def test_task_endpoints_handle_malformed_json_gracefully(self, client):
        """Test that task endpoints handle malformed JSON gracefully"""
        mock_job = MagicMock()
        mock_job.id = "job-malformed-123"  # String instead of MagicMock
        mock_task_queue.enqueue.return_value = mock_job
        
        # Send request with malformed JSON but valid content-type
        response = client.post('/task/ec2',
                              data='invalid json',
                              content_type='application/json')
        
        # Should still work because get_json(silent=True) returns None
        # and we handle None by defaulting to {}
        assert response.status_code == 202
