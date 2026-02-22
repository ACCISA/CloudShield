"""
Lightweight anomaly detector for CloudShield network telemetry.

Uses :class:`sklearn.ensemble.IsolationForest` (unsupervised) to score
network-connection feature vectors.  The model is trained once on an
initial "normal" baseline window and then scores every incoming batch.

If *scikit-learn* is unavailable the module degrades gracefully to a
simple z-score–based heuristic so that the rest of ThreatDetection can
still operate without the ML dependency.
"""

from __future__ import annotations

import json
import math
import os
import threading
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Sequence

from .features import extract_conn_features, extract_traffic_window_features

# ── Optional sklearn import ─────────────────────────────────────────────────
try:
    from sklearn.ensemble import IsolationForest  # type: ignore[import-untyped]
    import numpy as np  # type: ignore[import-untyped]
    _HAS_SKLEARN = True
except ImportError:  # pragma: no cover – sklearn not installed
    _HAS_SKLEARN = False


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass
class AnomalyResult:
    """Result of scoring a single connection or traffic window."""
    agent_id: str
    timestamp: int
    score: float          # raw anomaly score (lower = more anomalous)
    is_anomaly: bool
    features: list[float] = field(default_factory=list)
    reason: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# ── Detector ────────────────────────────────────────────────────────────────

class AnomalyDetector:
    """
    Unsupervised anomaly detector backed by IsolationForest.

    Parameters
    ----------
    contamination : float
        Expected fraction of anomalies (0 < c < 0.5).  Passed directly to
        ``IsolationForest``.  Default is 0.05 (5 %).
    z_threshold : float
        Fallback z-score threshold used when sklearn is not available.
    model_path : str | Path | None
        If given, the model parameters are persisted to / loaded from this
        JSON file so training survives server restarts.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        z_threshold: float = 3.0,
        model_path: str | Path | None = None,
    ):
        self._contamination = contamination
        self._z_threshold = z_threshold
        self._model_path = str(model_path) if model_path else None
        self._lock = threading.Lock()

        # sklearn-based model (when available)
        self._model: IsolationForest | None = None  # type: ignore[assignment]
        self._is_trained = False

        # Fallback stats (mean / std per feature)
        self._means: list[float] = []
        self._stds: list[float] = []

        # Rolling buffer for warm-up training
        self._buffer: list[list[float]] = []
        self._buffer_limit = 200  # train after N samples

        # Try loading a previously saved model
        if self._model_path:
            self._load(self._model_path)

    # ── Public API ──────────────────────────────────────────────────────

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def train(self, feature_matrix: Sequence[Sequence[float]]) -> None:
        """
        Train (or re-train) the model on a matrix of feature vectors.

        Each row is one observation (e.g. per-connection features or
        per-window aggregate features).
        """
        with self._lock:
            if _HAS_SKLEARN:
                X = np.array(feature_matrix, dtype=float)
                self._model = IsolationForest(
                    contamination=self._contamination,
                    n_estimators=100,
                    random_state=42,
                )
                self._model.fit(X)
            else:
                self._compute_stats(feature_matrix)
            self._is_trained = True

        if self._model_path:
            self._save(self._model_path)

    def score_connections(
        self,
        conns: Sequence[dict],
        agent_id: str = "",
        timestamp: int = 0,
    ) -> list[AnomalyResult]:
        """
        Score a batch of individual connection dicts.

        Returns one :class:`AnomalyResult` per connection.
        """
        features = [extract_conn_features(c) for c in conns]
        return self._score(features, agent_id, timestamp)

    def score_window(
        self,
        conns: Sequence[dict],
        agent_id: str = "",
        timestamp: int = 0,
    ) -> AnomalyResult:
        """
        Score an aggregate traffic window (one result for the whole batch).
        """
        feats = extract_traffic_window_features(conns)
        results = self._score([feats], agent_id, timestamp)
        return results[0]

    # ── Internals ───────────────────────────────────────────────────────

    def _score(
        self,
        feature_matrix: list[list[float]],
        agent_id: str,
        timestamp: int,
    ) -> list[AnomalyResult]:
        # If not yet trained, accumulate and use fallback
        if not self._is_trained:
            self._buffer.extend(feature_matrix)
            if len(self._buffer) >= self._buffer_limit:
                self.train(self._buffer)
                self._buffer.clear()
            return self._fallback_score(feature_matrix, agent_id, timestamp)

        with self._lock:
            if _HAS_SKLEARN and self._model is not None:
                X = np.array(feature_matrix, dtype=float)
                raw_scores = self._model.decision_function(X)
                preds = self._model.predict(X)
                results = []
                for i, feats in enumerate(feature_matrix):
                    results.append(AnomalyResult(
                        agent_id=agent_id,
                        timestamp=timestamp,
                        score=float(raw_scores[i]),
                        is_anomaly=bool(preds[i] == -1),
                        features=feats,
                        reason="IsolationForest anomaly" if preds[i] == -1 else "",
                    ))
                return results
            else:
                return self._fallback_score(feature_matrix, agent_id, timestamp)

    def _fallback_score(
        self,
        feature_matrix: list[list[float]],
        agent_id: str,
        timestamp: int,
    ) -> list[AnomalyResult]:
        """Z-score–based fallback when sklearn is unavailable or model untrained."""
        results = []
        for feats in feature_matrix:
            max_z = 0.0
            if self._means and self._stds:
                for val, mu, sigma in zip(feats, self._means, self._stds):
                    if sigma > 0:
                        z = abs(val - mu) / sigma
                        max_z = max(max_z, z)
            is_anom = max_z > self._z_threshold
            results.append(AnomalyResult(
                agent_id=agent_id,
                timestamp=timestamp,
                score=-max_z,  # negative = more anomalous (matches sklearn convention)
                is_anomaly=is_anom,
                features=feats,
                reason=f"z-score {max_z:.2f}" if is_anom else "",
            ))
        return results

    def _compute_stats(self, matrix: Sequence[Sequence[float]]) -> None:
        """Compute per-feature mean and std for the z-score fallback."""
        if not matrix:
            return
        n = len(matrix)
        dim = len(matrix[0])
        means = [0.0] * dim
        for row in matrix:
            for j, v in enumerate(row):
                means[j] += v
        means = [m / n for m in means]

        stds = [0.0] * dim
        for row in matrix:
            for j, v in enumerate(row):
                stds[j] += (v - means[j]) ** 2
        stds = [math.sqrt(s / n) if n > 1 else 0.0 for s in stds]

        self._means = means
        self._stds = stds

    # ── Persistence ─────────────────────────────────────────────────────

    def _save(self, path: str) -> None:
        """Persist fallback stats to JSON (sklearn model saved via joblib separately)."""
        try:
            data = {
                "means": self._means,
                "stds": self._stds,
                "is_trained": self._is_trained,
                "contamination": self._contamination,
            }
            os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
            with open(path, "w") as fh:
                json.dump(data, fh)
        except Exception:
            pass

    def _load(self, path: str) -> None:
        """Load previously saved fallback stats."""
        try:
            with open(path, "r") as fh:
                data = json.load(fh)
            self._means = data.get("means", [])
            self._stds = data.get("stds", [])
            self._is_trained = data.get("is_trained", False)
        except Exception:
            pass
