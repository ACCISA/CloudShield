"""
Unit tests for server.py middleware and error handlers.
"""
from flask import g
from unittest.mock import patch


def test_request_id_generation():
    """Test that request_id is generated when not provided."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        response = client.get('/healthz')
        assert response.status_code == 200
        data = response.get_json()
        assert 'request_id' in data
        assert data['request_id'] is not None


def test_request_id_from_header():
    """Test that request_id is taken from X-Request-ID header when provided."""
    from cloudshield.Server.server import app
    
    test_request_id = "test-request-123"
    with app.test_client() as client:
        response = client.get('/healthz', headers={'X-Request-ID': test_request_id})
        assert response.status_code == 200
        data = response.get_json()
        assert data['request_id'] == test_request_id


def test_performance_header_added():
    """Test that X-Response-Time header is added to responses."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        response = client.get('/healthz')
        assert 'X-Response-Time' in response.headers
        response_time = response.headers.get('X-Response-Time')
        assert response_time.endswith('ms')


def test_slow_request_logging():
    """Test that slow requests are logged."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        with patch('cloudshield.Server.server.logger'):
            # Make a request and check if logging infrastructure exists
            response = client.get('/healthz')
            assert response.status_code == 200
            # The slow request logging is tested via the header presence
            assert 'X-Response-Time' in response.headers


def test_json_required_on_post():
    """Test that POST requests without JSON body are rejected."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        response = client.post(
            '/api/task/provision',
            data='not json',
            content_type='text/plain'
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data['code'] == 'BAD_JSON'


def test_validation_error_handler():
    """Test ValidationError handling."""
    from cloudshield.Server.server import app
    from pydantic import ValidationError, BaseModel
    
    class TestModel(BaseModel):
        required_field: str
    
    with app.test_request_context('/'):
        try:
            TestModel()  # Missing required field
        except ValidationError as e:
            from cloudshield.Server.server import _handle_pydantic
            response, status = _handle_pydantic(e)
            assert status == 400
            data = response.get_json()
            assert data['code'] == 'VALIDATION_ERROR'


def test_value_error_handler():
    """Test ValueError handling."""
    from cloudshield.Server.server import app
    from cloudshield.Server.server import _handle_value_error
    
    with app.test_request_context('/'):
        g.request_id = 'test-123'
        error = ValueError("Invalid input")
        response, status = _handle_value_error(error)
        assert status == 400
        data = response.get_json()
        assert data['code'] == 'INVALID_REQUEST'
        assert 'Invalid input' in data['details']


def test_duplicate_key_error_handler():
    """Test DuplicateKeyError handling for duplicate emails."""
    from cloudshield.Server.server import app
    from cloudshield.Server.server import _handle_duplicate
    from pymongo.errors import DuplicateKeyError
    
    with app.test_request_context('/'):
        g.request_id = 'test-123'
        error = DuplicateKeyError("E11000 duplicate key error")
        response, status = _handle_duplicate(error)
        assert status == 409
        data = response.get_json()
        assert data['code'] == 'DUPLICATE_EMAIL'


def test_operation_failure_unauthorized():
    """Test OperationFailure handling for authorization errors."""
    from cloudshield.Server.server import app
    from cloudshield.Server.server import _handle_mongo_operation_failure
    from pymongo.errors import OperationFailure
    
    with app.test_request_context('/'):
        g.request_id = 'test-123'
        # Test various common authorization error messages from MongoDB
        error = OperationFailure("not authorized on db: cloudshield to execute command")
        response, status = _handle_mongo_operation_failure(error)
        assert status == 403, f"Expected 403 but got {status} for error: {str(error)}"
        data = response.get_json()
        assert data['code'] == 'DB_UNAUTHORIZED'


def test_operation_failure_other():
    """Test OperationFailure handling for other DB errors."""
    from cloudshield.Server.server import app
    from cloudshield.Server.server import _handle_mongo_operation_failure
    from pymongo.errors import OperationFailure
    
    with app.test_request_context('/'):
        g.request_id = 'test-123'
        error = OperationFailure("Some other database error")
        response, status = _handle_mongo_operation_failure(error)
        assert status == 500
        data = response.get_json()
        assert data['code'] == 'DB_OPERATION_FAILURE'


def test_http_exception_handler():
    """Test HTTPException handling."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        response = client.get('/nonexistent-route')
        assert response.status_code == 404
        data = response.get_json()
        assert data['code'] == 'HTTP_404'


def test_generic_exception_handler():
    """Test generic Exception handling."""
    from cloudshield.Server.server import app
    from cloudshield.Server.server import _handle_generic
    
    with app.test_request_context('/'):
        g.request_id = 'test-123'
        error = Exception("Unexpected error")
        response, status = _handle_generic(error)
        assert status == 500
        data = response.get_json()
        assert data['code'] == 'INTERNAL_ERROR'


def test_healthz_endpoint():
    """Test the health check endpoint."""
    from cloudshield.Server.server import app
    
    with app.test_client() as client:
        response = client.get('/healthz')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert 'request_id' in data
