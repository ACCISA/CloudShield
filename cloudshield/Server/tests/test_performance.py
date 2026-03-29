"""
Performance regression gate — fails CI if key endpoints exceed defined p95 thresholds.

Methodology:
  - Uses Flask's test client (in-process, no network overhead).
  - Each endpoint is sampled RUNS times; p95 is compared against THRESHOLDS.
  - All tested endpoints are auth-rejected before any DB access, so no real
    MongoDB or Redis is required — the existing conftest stubs are sufficient.
  - When PERF_RESULTS_OUTPUT is set, results are written as JSON for CI artifacts.
"""
import json
import os
import statistics
import time

import pytest

# ── Configuration ─────────────────────────────────────────────────────────────

RUNS = 50  # samples per endpoint

# p95 thresholds in milliseconds
THRESHOLDS = {
    "GET /healthz":                       20,
    "GET /api/auth/me (no token)":        50,
    "GET /api/workstations (no token)":   60,
    "GET /api/workstations/templates (no token)": 60,
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def _sample(client, method: str, path: str, **kwargs) -> list[float]:
    """Return RUNS elapsed times in ms for one endpoint."""
    samples: list[float] = []
    fn = getattr(client, method)
    for _ in range(RUNS):
        t0 = time.perf_counter()
        fn(path, **kwargs)
        samples.append((time.perf_counter() - t0) * 1000)
    return samples


def _p95(samples: list[float]) -> float:
    return sorted(samples)[int(len(samples) * 0.95)]


def _check(label: str, samples: list[float], results: dict) -> None:
    p50 = round(statistics.median(samples), 2)
    p95 = round(_p95(samples), 2)
    threshold = THRESHOLDS[label]
    results[label] = {"p50_ms": p50, "p95_ms": p95, "threshold_ms": threshold, "pass": p95 <= threshold}
    print(f"\n[perf] {label:50s}  p50={p50:6.2f}ms  p95={p95:6.2f}ms  limit={threshold}ms")
    assert p95 <= threshold, (
        f"PERFORMANCE GATE FAILED: '{label}' p95 {p95:.2f}ms > threshold {threshold}ms"
    )


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def perf_client():
    from cloudshield.Server.server import app
    with app.test_client() as client:
        yield client


@pytest.fixture(scope="module")
def results():
    """Accumulate results across all tests; write JSON artifact at teardown."""
    data: dict = {}
    yield data
    output_path = os.getenv("PERF_RESULTS_OUTPUT")
    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w") as f:
            json.dump({"runs_per_endpoint": RUNS, "results": data}, f, indent=2)
        print(f"\n[perf] Results written to {output_path}")


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_healthz_p95(perf_client, results):
    """Health endpoint: no auth, no DB — sets absolute baseline."""
    label = "GET /healthz"
    _check(label, _sample(perf_client, "get", "/healthz"), results)


def test_auth_me_no_token_p95(perf_client, results):
    """Auth /me without token: measures JWT guard rejection cost."""
    label = "GET /api/auth/me (no token)"
    _check(label, _sample(perf_client, "get", "/api/auth/me"), results)


def test_workstations_no_token_p95(perf_client, results):
    """Workstations list without token: measures require_auth guard cost."""
    label = "GET /api/workstations (no token)"
    _check(label, _sample(perf_client, "get", "/api/workstations"), results)


def test_workstation_templates_no_token_p95(perf_client, results):
    """Workstation templates without token: measures require_auth guard cost."""
    label = "GET /api/workstations/templates (no token)"
    _check(label, _sample(perf_client, "get", "/api/workstations/templates",
                           query_string={"org_id": "test"}), results)
