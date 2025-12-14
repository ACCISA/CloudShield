"""
Locust load testing script for CloudShield API

Usage:
    # Install: pip install locust
    
    # Run with web UI:
    locust -f tests/performance/locustfile.py --host=http://localhost:5050
    
    # Run headless (10 users, 2/sec spawn rate, 60 seconds):
    locust -f tests/performance/locustfile.py --host=http://localhost:5050 \
           --users 10 --spawn-rate 2 --run-time 60s --headless
    
    # Generate HTML report:
    locust -f tests/performance/locustfile.py --host=http://localhost:5050 \
           --users 50 --spawn-rate 5 --run-time 120s --headless \
           --html=performance_report.html

Performance Targets:
    - GET /api/users: p95 < 200ms, target 50 RPS
    - GET /api/health: p95 < 50ms, target 200 RPS
    - POST /task/provision: p95 < 100ms (async job)
"""

from locust import HttpUser, task, between, events
import json
import random
import logging

# Configure logging
logger = logging.getLogger(__name__)


class CloudShieldUser(HttpUser):
    """Simulates a CloudShield admin user performing typical operations"""
    
    # Wait 1-3 seconds between tasks (simulates think time)
    wait_time = between(1, 3)
    
    def on_start(self):
        """
        Called when a simulated user starts.
        Authenticates and stores token for subsequent requests.
        """
        # In a real scenario, you'd authenticate here
        # For now, we'll use a mock token or skip auth for public endpoints
        self.token = "mock-token-for-testing"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        logger.info("CloudShield user started")
    
    @task(5)
    def health_check(self):
        """
        Health check endpoint (most frequent operation)
        Weight: 5 (runs 5x more often than weight-1 tasks)
        """
        with self.client.get(
            "/api/health",
            catch_response=True,
            name="GET /api/health"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "ok":
                        response.success()
                    else:
                        response.failure(f"Unhealthy status: {data}")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON response")
            else:
                response.failure(f"Status code: {response.status_code}")
    
    @task(3)
    def list_users(self):
        """
        List users with pagination (common admin operation)
        Weight: 3
        """
        # Vary pagination parameters
        limit = random.choice([10, 20, 50, 100])
        offset = random.randint(0, 100)
        
        with self.client.get(
            f"/api/users?limit={limit}&offset={offset}",
            headers=self.headers,
            catch_response=True,
            name="GET /api/users (list)"
        ) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    # Validate response structure
                    if "items" in data and "total" in data:
                        response.success()
                    else:
                        response.failure("Missing required fields")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON response")
            elif response.status_code == 401:
                # Expected for unauthenticated requests
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")
    
    @task(2)
    def search_users(self):
        """
        Search users by email/name (tests query performance)
        Weight: 2
        """
        search_terms = ["admin", "test", "john", "alice", "@example.com"]
        search = random.choice(search_terms)
        
        with self.client.get(
            f"/api/users?search={search}&limit=20",
            headers=self.headers,
            catch_response=True,
            name="GET /api/users (search)"
        ) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")
    
    @task(1)
    def get_user_details(self):
        """
        Get specific user by ID (tests indexed lookups)
        Weight: 1
        """
        # Mock user IDs (in real test, fetch from list_users first)
        mock_user_ids = [
            "507f1f77bcf86cd799439011",
            "507f1f77bcf86cd799439012",
            "507f1f77bcf86cd799439013"
        ]
        user_id = random.choice(mock_user_ids)
        
        with self.client.get(
            f"/api/users/{user_id}",
            headers=self.headers,
            catch_response=True,
            name="GET /api/users/<id>"
        ) as response:
            # Accept 404 (user doesn't exist in test DB) or 401 (auth)
            if response.status_code in [200, 404, 401]:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")
    
    @task(1)
    def check_job_status(self):
        """
        Check job status (tests Redis performance)
        Weight: 1
        """
        # Mock job IDs
        mock_job_ids = [
            "test-job-1",
            "test-job-2",
            "test-job-3"
        ]
        job_id = random.choice(mock_job_ids)
        
        with self.client.get(
            f"/api/status/{job_id}",
            catch_response=True,
            name="GET /api/status/<job_id>"
        ) as response:
            # 404 is expected for non-existent jobs
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")
    
    @task(1)
    def list_audit_logs(self):
        """
        List audit logs (tests indexed time-series queries)
        Weight: 1
        """
        # Vary query parameters
        params = []
        if random.random() > 0.5:
            params.append(f"action={random.choice(['create', 'update', 'delete'])}")
        
        query_string = "?" + "&".join(params) if params else ""
        
        with self.client.get(
            f"/api/audit{query_string}",
            headers=self.headers,
            catch_response=True,
            name="GET /api/audit"
        ) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Status: {response.status_code}")


class AdminUser(HttpUser):
    """Simulates admin performing heavy operations"""
    
    wait_time = between(5, 10)  # Admins wait longer between actions
    weight = 1  # Fewer admin users
    
    def on_start(self):
        self.headers = {
            "Authorization": "Bearer admin-token",
            "Content-Type": "application/json"
        }
    
    @task(1)
    def provision_infrastructure(self):
        """
        Trigger infrastructure provisioning (async job)
        Tests job enqueueing performance
        """
        payload = {
            "org_id": f"test-org-{random.randint(1, 100)}",
            "region": random.choice(["us-east-1", "ca-central-1", "us-west-2"])
        }
        
        with self.client.post(
            "/api/task/provision",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="POST /api/task/provision"
        ) as response:
            if response.status_code == 202:
                try:
                    data = response.json()
                    if "job_id" in data:
                        response.success()
                        logger.info(f"Enqueued job: {data['job_id']}")
                    else:
                        response.failure("Missing job_id")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON")
            elif response.status_code in [400, 401]:
                response.success()  # Expected for auth/validation
            else:
                response.failure(f"Status: {response.status_code}")


# Custom event handlers for detailed reporting
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the load test starts"""
    logger.info("=" * 60)
    logger.info("CloudShield Performance Test Starting")
    logger.info(f"Target: {environment.host}")
    logger.info("=" * 60)


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the load test stops"""
    logger.info("=" * 60)
    logger.info("CloudShield Performance Test Complete")
    logger.info("=" * 60)
    
    # Print summary statistics
    stats = environment.stats
    logger.info(f"Total requests: {stats.total.num_requests}")
    logger.info(f"Total failures: {stats.total.num_failures}")
    logger.info(f"Average response time: {stats.total.avg_response_time:.2f}ms")
    logger.info(f"95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    logger.info(f"Requests/sec: {stats.total.total_rps:.2f}")


if __name__ == "__main__":
    # This allows running the script directly for debugging
    import os
    os.system("locust -f tests/performance/locustfile.py --host=http://localhost:5050")
