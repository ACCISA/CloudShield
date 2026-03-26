"""Background email tasks for onboarding notifications."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from rq import get_current_job

from services.email_service import render_template, send_email
from utils import get_logger
from utils.database import db_admin, organizations, users_admin, org_filter

LOGIN_URL = "http://real.encs.concordia.ca/login" # NOSONAR


def _coerce_object_id(value: str):
    """Coerce a value into ObjectId when possible, otherwise return as-is."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return value


def _log_email_event(payload: dict) -> None:
    """Persist an email delivery event without raising to callers."""
    try:
        db_admin["email_logs"].insert_one(payload)
    except Exception:
        logger = get_logger("email")
        logger.exception("Failed to persist email log")


def send_org_welcome_email(org_id: str, admin_user_id: str) -> dict:
    """Send the org welcome email to the primary admin via background worker."""
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "sending org welcome email"
        job.save_meta()

    org = organizations.find_one(org_filter(org_id)) or {}
    admin = users_admin.find_one({"_id": _coerce_object_id(admin_user_id)}) or {}

    subject = "Welcome to CloudShield"
    html_body = render_template(
        "org_welcome.html",
        {
            "admin_name": admin.get("full_name"),
            "org_name": org.get("company_name") or org.get("name"),
            "login_url": LOGIN_URL,
        },
    )

    result = send_email(
        to_email=admin.get("email", ""),
        subject=subject,
        html_body=html_body,
    )

    _log_email_event(
        {
            "type": "org_welcome",
            "org_id": org_id,
            "user_id": admin_user_id,
            "to_email": admin.get("email"),
            "subject": subject,
            "status": result.get("status"),
            "reason": result.get("reason"),
            "created_at": datetime.now(timezone.utc),
        }
    )

    if result.get("status") == "error":
        logger.error("Org welcome email failed: %s", result.get("reason"))
    else:
        logger.info("Org welcome email status: %s", result.get("status"))
    return result


def send_employee_invite_email(user_id: str) -> dict:
    """Send the employee invite email via background worker."""
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "sending employee invite email"
        job.save_meta()

    user = users_admin.find_one({"_id": _coerce_object_id(user_id)}) or {}
    org = organizations.find_one(org_filter(user.get("org_id"))) or {}

    subject = "You're invited to CloudShield"
    html_body = render_template(
        "employee_invite.html",
        {
            "employee_name": user.get("full_name"),
            "org_name": org.get("company_name") or org.get("name"),
            "login_url": LOGIN_URL,
        },
    )

    result = send_email(
        to_email=user.get("email", ""),
        subject=subject,
        html_body=html_body,
    )

    _log_email_event(
        {
            "type": "employee_invite",
            "org_id": user.get("org_id"),
            "user_id": user_id,
            "to_email": user.get("email"),
            "subject": subject,
            "status": result.get("status"),
            "reason": result.get("reason"),
            "created_at": datetime.now(timezone.utc),
        }
    )

    if result.get("status") == "error":
        logger.error("Employee invite email failed: %s", result.get("reason"))
    else:
        logger.info("Employee invite email status: %s", result.get("status"))
    return result


def send_workstation_ready_email(user_id: str, workstation_name: str) -> dict:
    """Send a workstation-ready email to the requesting user via background worker."""
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "sending workstation ready email"
        job.save_meta()

    user = users_admin.find_one({"_id": _coerce_object_id(user_id)}) or {}
    org = organizations.find_one(org_filter(user.get("org_id"))) or {}

    subject = "Your CloudShield workstation is ready"
    html_body = render_template(
        "workstation_ready.html",
        {
            "user_name": user.get("full_name"),
            "org_name": org.get("company_name") or org.get("name"),
            "workstation_name": workstation_name,
            "login_url": LOGIN_URL,
        },
    )

    result = send_email(
        to_email=user.get("email", ""),
        subject=subject,
        html_body=html_body,
    )

    _log_email_event(
        {
            "type": "workstation_ready",
            "org_id": user.get("org_id"),
            "user_id": user_id,
            "to_email": user.get("email"),
            "subject": subject,
            "status": result.get("status"),
            "reason": result.get("reason"),
            "workstation_name": workstation_name,
            "created_at": datetime.now(timezone.utc),
        }
    )

    if result.get("status") == "error":
        logger.error("Workstation ready email failed: %s", result.get("reason"))
    else:
        logger.info("Workstation ready email status: %s", result.get("status"))
    return result
