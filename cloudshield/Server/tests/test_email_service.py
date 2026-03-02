from cloudshield.Server.services import email_service
from cloudshield.Server.services.email_service import render_template, send_email


def test_render_org_welcome_template_smoke():
    html = render_template(
        "org_welcome.html",
        {
            "admin_name": "Sam",
            "org_name": "CloudShield",
            "login_url": "http://real.encs.concordia.ca/login",
        },
    )
    assert "Welcome to CloudShield" in html
    assert "CloudShield" in html
    assert "http://real.encs.concordia.ca/login" in html
    assert "http://real.encs.concordia.ca/cloudshield_logo_white.png" in html


def test_render_employee_invite_template_smoke():
    html = render_template(
        "employee_invite.html",
        {
            "employee_name": "Alex",
            "org_name": "CloudShield",
            "login_url": "http://real.encs.concordia.ca/login",
        },
    )
    assert "You're invited to CloudShield" in html
    assert "CloudShield" in html
    assert "http://real.encs.concordia.ca/login" in html
    assert "http://real.encs.concordia.ca/cloudshield_logo_white.png" in html


def test_send_email_disabled(monkeypatch):
    monkeypatch.setattr(email_service, "EMAIL_ENABLED", False)
    result = send_email(
        to_email="sam@example.com",
        subject="Hello",
        html_body="<p>Hi</p>",
    )
    assert result["status"] == "skipped"
    assert result["reason"] == "disabled"


def test_send_email_misconfigured(monkeypatch):
    monkeypatch.setattr(email_service, "EMAIL_ENABLED", True)
    monkeypatch.setattr(email_service, "SMTP_HOST", "")
    monkeypatch.setattr(email_service, "SMTP_FROM", "")
    result = send_email(
        to_email="sam@example.com",
        subject="Hello",
        html_body="<p>Hi</p>",
    )
    assert result["status"] == "error"
    assert result["reason"] == "misconfigured"


def test_send_email_success_without_login(monkeypatch):
    actions = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            actions.append(("init", host, port, timeout))

        def __enter__(self):
            actions.append(("enter",))
            return self

        def __exit__(self, exc_type, exc, tb):
            actions.append(("exit",))

        def starttls(self):
            actions.append(("starttls",))

        def login(self, user, password):
            actions.append(("login", user, password))

        def send_message(self, message):
            actions.append(("send", message["To"], message["Subject"]))

    monkeypatch.setattr(email_service, "EMAIL_ENABLED", True)
    monkeypatch.setattr(email_service, "SMTP_HOST", "smtp.local")
    monkeypatch.setattr(email_service, "SMTP_PORT", 1025)
    monkeypatch.setattr(email_service, "SMTP_FROM", "noreply@example.com")
    monkeypatch.setattr(email_service, "SMTP_USER", "")
    monkeypatch.setattr(email_service, "SMTP_PASSWORD", "")
    monkeypatch.setattr(email_service, "SMTP_USE_TLS", False)
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    result = send_email(
        to_email="sam@example.com",
        subject="Hello",
        html_body="<p>Hi</p>",
    )

    assert result["status"] == "sent"
    assert ("starttls",) not in actions
    assert ("send", "sam@example.com", "Hello") in actions


def test_send_email_success_with_login(monkeypatch):
    actions = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            actions.append(("init", host, port, timeout))

        def __enter__(self):
            actions.append(("enter",))
            return self

        def __exit__(self, exc_type, exc, tb):
            actions.append(("exit",))

        def starttls(self):
            actions.append(("starttls",))

        def login(self, user, password):
            actions.append(("login", user, password))

        def send_message(self, message):
            actions.append(("send", message["To"], message["Subject"]))

    monkeypatch.setattr(email_service, "EMAIL_ENABLED", True)
    monkeypatch.setattr(email_service, "SMTP_HOST", "smtp.local")
    monkeypatch.setattr(email_service, "SMTP_PORT", 587)
    monkeypatch.setattr(email_service, "SMTP_FROM", "noreply@example.com")
    monkeypatch.setattr(email_service, "SMTP_USER", "user")
    monkeypatch.setattr(email_service, "SMTP_PASSWORD", "pass")
    monkeypatch.setattr(email_service, "SMTP_USE_TLS", True)
    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSMTP)

    result = send_email(
        to_email="sam@example.com",
        subject="Hello",
        html_body="<p>Hi</p>",
    )

    assert result["status"] == "sent"
    assert ("starttls",) in actions
    assert ("login", "user", "pass") in actions
    assert ("send", "sam@example.com", "Hello") in actions
