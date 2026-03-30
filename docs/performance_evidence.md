# CloudShield — Verified Performance Evidence

> **Rule:** This page is the single source of truth for performance evidence.
> The "Last Verified Results" table below must only be updated by pasting the
> output of a real CI run (download the `performance-results` artifact from the
> `Performance Gate` workflow and copy the values here). Do not edit numbers
> manually.

---

## Methodology

| Property | Value |
|---|---|
| Test file | `cloudshield/Server/tests/test_performance.py` |
| Transport | Flask in-process test client (no network overhead) |
| Samples per endpoint | 50 |
| Reported statistic | p95 (95th percentile of 50 samples) |
| DB / Redis required | No — auth-rejected endpoints only; conftest stubs cover all external deps |
| CI workflow | `.github/workflows/performance_gate.yml` |

**Why in-process?** Network I/O and OS scheduling noise would dwarf small
per-request differences on a shared CI runner. In-process timing isolates
application-layer cost (middleware, auth guards, serialization) and produces
stable, reproducible measurements.

---

## Enforced Thresholds

These thresholds are checked on every pull request. A breach **fails the build**.

| Endpoint | p95 Limit |
|---|---|
| `GET /healthz` | 20 ms |
| `GET /api/auth/me` (no token) | 50 ms |
| `GET /api/workstations` (no token) | 60 ms |
| `GET /api/workstations/templates` (no token) | 60 ms |

To tighten or loosen a threshold, update `THRESHOLDS` in
`cloudshield/Server/tests/test_performance.py` and update the table above in
the same commit.

---

## Last Verified Results

*Replace this section by pasting the contents of the `performance-results`
artifact (`tests/perf/results.json`) from the most recent green CI run.*

| Endpoint | p50 (ms) | p95 (ms) | Limit (ms) | Pass |
|---|---|---|---|---|
| `GET /healthz` | — | — | 20 | — |
| `GET /api/auth/me (no token)` | — | — | 50 | — |
| `GET /api/workstations (no token)` | — | — | 60 | — |
| `GET /api/workstations/templates (no token)` | — | — | 60 | — |

**Last updated from CI run:** _not yet recorded_

---

## How to Update This Page

1. Open the `Performance Gate` workflow run for the relevant commit on GitHub Actions.
2. Download the `performance-results` artifact and open `results.json`.
3. Copy the `p50_ms` and `p95_ms` values for each endpoint into the table above.
4. Update the "Last updated from CI run" line with the run URL.
5. Commit the change — title: `docs: update performance evidence from CI run <sha>`.

---

## Adding a New Endpoint

1. Add a test function to `test_performance.py` following the existing pattern.
2. Add the endpoint and its threshold to the `THRESHOLDS` dict in the same file.
3. Add a row to the "Enforced Thresholds" table above.
4. Add a placeholder row to "Last Verified Results".
5. Let CI run and fill in the real numbers.
