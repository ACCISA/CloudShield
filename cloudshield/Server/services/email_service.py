"""
Email rendering + dispatch helpers.
"""
from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape

from utils import get_logger

logger = get_logger("email")

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates", "emails")
env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
)

EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"


def render_template(template_name: str, context: Dict[str, Any]) -> str:
    """Render an email template with the provided context."""
    template = env.get_template(template_name)
    return template.render(**context)


def send_email(
    *,
    to_email: str,
    subject: str,
    html_body: str,
) -> Dict[str, Any]:
    """
    Send an HTML email via SMTP.

    Returns a status dict and never raises to callers, so email failures
    do not impact the primary request flow.
    """
    if not EMAIL_ENABLED:
        logger.info("Email disabled; skipping send to %s", to_email)
        return {"status": "skipped", "reason": "disabled"}

    if not SMTP_HOST or not SMTP_FROM:
        logger.error("Email misconfigured; missing SMTP_HOST or SMTP_FROM")
        return {"status": "error", "reason": "misconfigured"}

    message = EmailMessage()
    message["From"] = SMTP_FROM
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content("Your email client does not support HTML.")
    message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            if SMTP_USE_TLS:
                server.starttls()
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        return {"status": "sent"}
    except Exception as exc:
        logger.exception("Email send failed")
        return {"status": "error", "reason": str(exc)}
