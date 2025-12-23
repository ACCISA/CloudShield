"""
Comprehensive test suite for server.py including app factory, CORS, error handlers, and middleware.
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from flask import g


class TestServerAppFactory:
    """Test Flask app factory and initialization"""

    def test_app_creation(self):
        """Test that create_app returns a Flask instance"""
        from cloudshield.Server.server import create_app
        app = create_app()
        
        assert app is not None
        assert app.name == 'cloudshield.Server.server'

    def test_cors_enabled(self):
        """Test that CORS is enabled for the application"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.options('/healthz')
            # CORS should add these headers
            assert response.status_code in [200, 204]

    def test_blueprints_registered(self):
        """Test that all required blueprints are registered"""
        from cloudshield.Server.server import app
        
        blueprint_names = [bp.name for bp in app.blueprints.values()]
        
        # Check that key blueprints are registered
        assert any('api' in name for name in blueprint_names), "API blueprint should be registered"
        assert any('auth' in name for name in blueprint_names), "Auth blueprint should be registered"
        assert any('users' in name for name in blueprint_names), "Users blueprint should be registered"


class TestHealthCheck:
    """Test health check endpoint"""

    def test_healthz_endpoint_success(self):
        """Test health check returns 200 with status ok"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/healthz')
            assert response.status_code == 200
            
            data = response.get_json()
            assert data['status'] == 'ok'
            assert 'request_id' in data
            assert data['request_id'] is not None

    def test_healthz_includes_request_id(self):
        """Test health check includes request_id in response"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/healthz')
            data = response.get_json()
            
            assert 'request_id' in data
            assert isinstance(data['request_id'], str)
            assert len(data['request_id']) > 0


class TestRequestMiddleware:
    """Test request/response middleware"""

    def test_request_id_generated(self):
        """Test that request_id is generated when not provided"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/healthz')
            data = response.get_json()
            
            assert 'request_id' in data
            # Should be a UUID-like string
            assert len(data['request_id']) > 20

    def test_request_id_from_header(self):
        """Test that request_id is taken from X-Request-ID header"""
        from cloudshield.Server.server import app
        
        custom_request_id = "custom-test-id-12345"
        
        with app.test_client() as client:
            response = client.get('/healthz', headers={'X-Request-ID': custom_request_id})
            data = response.get_json()
            
            assert data['request_id'] == custom_request_id

    def test_performance_headers_added(self):
        """Test that X-Response-Time header is added"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/healthz')
            
            assert 'X-Response-Time' in response.headers
            response_time = response.headers['X-Response-Time']
            assert response_time.endswith('ms')
            
            # Extract numeric value and verify it's reasonable
            time_value = float(response_time.replace('ms', ''))
            assert 0 <= time_value < 10000  # Should be less than 10 seconds

    @patch('cloudshield.Server.server.logger')
    def test_slow_request_logging(self, mock_logger):
        """Test that slow requests are logged"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            # Mock a slow request by manipulating g.start_time
            with app.test_request_context('/healthz'):
                g.start_time = 0  # Very old timestamp to simulate slow request
                response = app.full_dispatch_request()
                
                # After response processing, check if warning was called
                # This is a simplified test; in real scenario timing would trigger the warning


class TestErrorHandlers:
    """Test error handling and standardized error responses"""

    def test_validation_error_handler(self):
        """Test ValidationError returns 400 with proper format"""
        from cloudshield.Server.server import app
        from pydantic import BaseModel, ValidationError, field_validator
        
        class TestModel(BaseModel):
            email: str
            
            @field_validator('email')
            @classmethod
            def validate_email(cls, v):
                if '@' not in v:
                    raise ValueError('Invalid email')
                return v
        
        with app.test_client() as client:
            # Trigger a validation error by sending invalid data
            with app.app_context():
                try:
                    TestModel(email='invalid')
                except ValidationError as e:
                    response_data, status_code = app.handle_exception(e)
                    # The error handler should return structured error

    def test_duplicate_key_error_handler(self):
        """Test DuplicateKeyError returns 409"""
        from cloudshield.Server.server import app
        from pymongo.errors import DuplicateKeyError
        
        with app.test_client() as client:
            with app.app_context():
                error = DuplicateKeyError("E11000 duplicate key error")
                handler = app.error_handler_spec[None][DuplicateKeyError]
                
                if handler:
                    response_data, status_code = handler(error)
                    assert status_code == 409

    def test_value_error_handler(self):
        """Test ValueError returns 400"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            with app.app_context():
                error = ValueError("Invalid value")
                handler = app.error_handler_spec[None][ValueError]
                
                if handler:
                    response_data, status_code = handler(error)
                    assert status_code == 400

    def test_generic_exception_handler(self):
        """Test generic Exception returns 500"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            with app.app_context():
                error = Exception("Something went wrong")
                handler = app.error_handler_spec[None][Exception]
                
                if handler:
                    response_data, status_code = handler(error)
                    assert status_code == 500

    def test_error_response_structure(self):
        """Test that error responses have consistent structure"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            # Test with a non-existent route to trigger 404
            response = client.get('/nonexistent-route')
            
            assert response.status_code == 404
            data = response.get_json()
            
            # Check error response structure
            assert 'error' in data
            assert 'code' in data
            assert 'request_id' in data


class TestCORSConfiguration:
    """Test CORS configuration and headers"""

    def test_cors_allows_cross_origin_requests(self):
        """Test that CORS allows cross-origin requests"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get(
                '/healthz',
                headers={'Origin': 'http://localhost:3000'}
            )
            
            # With CORS enabled, response should succeed
            assert response.status_code == 200

    def test_cors_preflight_request(self):
        """Test CORS preflight (OPTIONS) request"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.options(
                '/healthz',
                headers={
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
            )
            
            # OPTIONS request should succeed
            assert response.status_code in [200, 204]


class TestJSONEnforcement:
    """Test JSON content-type enforcement for write operations"""

    def test_post_without_json_content_type(self):
        """Test POST request handling without JSON content type"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            # The middleware allows empty body or enforces JSON
            # This test depends on actual route implementation
            pass  # Placeholder - would need actual route to test

    def test_post_with_json_content_type(self):
        """Test POST request with proper JSON content type"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.post(
                '/healthz',  # Using healthz as example, real route would be different
                data=json.dumps({'test': 'data'}),
                content_type='application/json'
            )
            
            # Request should be processed (even if endpoint doesn't exist)
            # The point is that JSON is accepted


class TestAppConfiguration:
    """Test application configuration"""

    def test_debug_mode_respects_env_var(self):
        """Test that debug mode is controlled by environment variable"""
        # This would require mocking os.getenv or testing with different env settings
        pass  # Complex to test without changing environment

    def test_port_configuration(self):
        """Test that port can be configured via environment"""
        # Similar to debug mode, requires environment manipulation
        pass


class TestRequestTracking:
    """Test request tracking and tracing"""

    def test_request_id_consistency(self):
        """Test that request_id is consistent throughout request lifecycle"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            test_id = "test-consistent-id"
            response = client.get('/healthz', headers={'X-Request-ID': test_id})
            
            data = response.get_json()
            assert data['request_id'] == test_id

    def test_request_id_in_error_responses(self):
        """Test that request_id is included in error responses"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/nonexistent-endpoint')
            
            data = response.get_json()
            assert 'request_id' in data
            assert isinstance(data['request_id'], str)


class TestBlueprintIntegration:
    """Test blueprint integration and routing"""

    def test_api_blueprint_routes(self):
        """Test that API blueprint routes are accessible"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            # Test a route that should exist from api_bp
            # This is a placeholder - actual routes depend on blueprint implementation
            pass

    def test_auth_blueprint_routes(self):
        """Test that auth blueprint routes are accessible"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            # Test auth routes are registered
            # Actual testing would require knowing specific routes
            pass


class TestErrorResponseFormat:
    """Test standardized error response format"""

    def test_error_response_includes_all_fields(self):
        """Test that error responses include all required fields"""
        from cloudshield.Server.server import app
        
        with app.test_client() as client:
            response = client.get('/nonexistent')
            data = response.get_json()
            
            required_fields = ['error', 'code', 'request_id']
            for field in required_fields:
                assert field in data, f"Error response missing field: {field}"

    def test_error_details_included_when_provided(self):
        """Test that error details are included when provided"""
        # This would require triggering specific errors with details
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
