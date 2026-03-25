import os
try:
    from google import genai
except ImportError:  # pragma: no cover - exercised via runtime guard
    genai = None

from cloudshield.Server.utils.logging_setup import get_logger

logger = get_logger("ai_explainer")

def generate_alert_explanation(alert_data: dict) -> str:
    """
    Takes a dictionary of alert metadata and returns a stateless,
    AI-generated markdown explanation using the Cortex AI.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY not set. Alert explainer disabled.")
            return "Error: AI explanation is currently unavailable because the API key is missing."

        if genai is None:
            logger.warning("google-genai package is not installed. Alert explainer disabled.")
            return "Error: AI explanation is currently unavailable because the AI SDK is missing."

        # Safely extract alert details
        risk_level = alert_data.get("risk", "Unknown")
        alert_type = alert_data.get("type", "Unknown")
        category = alert_data.get("category", "Unknown")
        source = alert_data.get("source", "Unknown")
        description = alert_data.get("description", "No description provided.")

        prompt = f"""
You are CloudShield Cortex, a Senior Security Analyst for the CloudShield SECaaS platform.
Your job is to analyze security alerts triggered by our endpoints and explain them clearly to system administrators.

PLATFORM CONTEXT:
- CloudShield delivers secure virtual desktops (Windows EC2 instances) for small businesses.
- A background security agent on each workstation forwards telemetry to our servers.
- Admins manage policies and review alerts through the CloudShield WebUI.

Please analyze the following security alert:
- Risk Level: {risk_level}
- Type: {alert_type}
- Category: {category}
- Source: {source}
- Description: {description}

Provide a concise, easy-to-understand explanation broken down into three brief sections:
1. **What Happened:** Explain the description in plain English without excessive technical jargon.
2. **Potential Impact:** What could have happened if this wasn't caught or blocked?
3. **Preventative Measures:** Give 1-2 actionable tips to prevent this specific vector in the future.

STRICT RULES:
- Keep the tone professional, objective, and brief. 
- Format using Markdown. 
- Do NOT include any greeting or sign-off. 
- Do NOT hallucinate or make up fake IP addresses/data not implied by the alert.
"""
        client = genai.Client(api_key=api_key)
        
        # Using the same model from your ticketing system
        response = client.models.generate_content(
            model="gemma-3-27b-it", 
            contents=prompt
        )

        if not response or not response.text:
            logger.warning("Gemini returned empty response for alert explanation.")
            return "Error: The AI model returned an empty response."

        logger.info("Successfully generated AI explanation for alert type: %s", alert_type)
        return response.text.strip()

    except Exception as e:
        logger.error("AI Alert Explainer Error: %s", str(e), exc_info=True)
        return "An error occurred while trying to generate the AI explanation. Please check the server logs."
