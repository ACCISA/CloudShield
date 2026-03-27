from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from flask import Flask

from cloudshield.Server.routes.threat import threat_bp
from cloudshield.Server.utils import ai_explainer


@pytest.fixture
def threat_client():
    app = Flask(__name__)
    app.register_blueprint(threat_bp, url_prefix="/api/threat")
    return app.test_client()


def test_generate_alert_explanation_returns_missing_api_key_message(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    result = ai_explainer.generate_alert_explanation({})

    assert "API key is missing" in result


def test_generate_alert_explanation_returns_missing_sdk_message(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_explainer, "genai", None)

    result = ai_explainer.generate_alert_explanation({})

    assert "AI SDK is missing" in result


def test_generate_alert_explanation_returns_model_text(monkeypatch):
    mock_response = SimpleNamespace(text="  Example explanation  ")
    mock_client = Mock()
    mock_client.models.generate_content.return_value = mock_response
    mock_genai = SimpleNamespace(Client=Mock(return_value=mock_client))

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_explainer, "genai", mock_genai)

    result = ai_explainer.generate_alert_explanation(
        {
            "risk": "HIGH",
            "type": "Malware",
            "category": "Execution",
            "source": "Snort",
            "description": "Suspicious process detected",
        }
    )

    assert result == "Example explanation"
    mock_genai.Client.assert_called_once_with(api_key="test-key")
    mock_client.models.generate_content.assert_called_once()


def test_generate_alert_explanation_handles_empty_model_response(monkeypatch):
    mock_client = Mock()
    mock_client.models.generate_content.return_value = SimpleNamespace(text="")
    mock_genai = SimpleNamespace(Client=Mock(return_value=mock_client))

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_explainer, "genai", mock_genai)

    result = ai_explainer.generate_alert_explanation({"type": "Malware"})

    assert "empty response" in result


def test_generate_alert_explanation_handles_client_errors(monkeypatch):
    mock_client = Mock()
    mock_client.models.generate_content.side_effect = RuntimeError("boom")
    mock_genai = SimpleNamespace(Client=Mock(return_value=mock_client))

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_explainer, "genai", mock_genai)

    result = ai_explainer.generate_alert_explanation({"type": "Malware"})

    assert "An error occurred while trying to generate the AI explanation" in result


def test_explain_alert_returns_400_without_payload(threat_client):
    response = threat_client.post("/api/threat/alerts/explain", json={})

    assert response.status_code == 400
    assert response.get_json() == {"error": "No alert data provided"}


def test_explain_alert_returns_generated_explanation(threat_client, monkeypatch):
    monkeypatch.setattr(
        "cloudshield.Server.routes.threat.generate_alert_explanation",
        lambda payload: f"Explained {payload['type']}",
    )

    response = threat_client.post(
        "/api/threat/alerts/explain",
        json={"type": "Malware", "risk": "HIGH"},
    )

    assert response.status_code == 200
    assert response.get_json() == {"explanation": "Explained Malware"}


def test_explain_alert_returns_500_on_generator_error(threat_client, monkeypatch):
    def _raise(_payload):
        raise RuntimeError("boom")

    monkeypatch.setattr("cloudshield.Server.routes.threat.generate_alert_explanation", _raise)

    response = threat_client.post(
        "/api/threat/alerts/explain",
        json={"type": "Malware"},
    )

    assert response.status_code == 500
    assert response.get_json() == {"error": "Internal server error during AI analysis"}
