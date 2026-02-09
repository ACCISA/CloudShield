from cloudshield.Server.services.email_service import render_template


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
