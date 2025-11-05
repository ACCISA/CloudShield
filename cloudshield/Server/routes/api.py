"""API route definitions (Flask Blueprint).

This module defines the HTTP endpoints and delegates logic to the services
layer.
"""
from __future__ import annotations

from flask import Blueprint, request, jsonify
from services import service_dispatcher, get_job_status, health_status
from utils.logging_setup import get_logger

logger = get_logger("api")

api_bp = Blueprint("api", __name__)

@api_bp.route("/task/dc/add_user", methods=["POST"])
def task_dc_add_user():
    data = request.get_json() or {}

    org_id = data.get("org_id")
    username = data.get("username")
    password = data.get("password")
    
    # handle missing args
    for arg, val in {"org_id":org_id, "username":username, "password":password}.items():
        if val is None:
            logger.warning(f"DC add_user request missing {arg}")
            return jsonify({"error":"{arg} is required"})

    job = service_dispatcher("dc_add_user", org_id=org_id, username=username, password=password)
    return jsonify({"job_id": job.id}), 202



@api_bp.route("/task/provision", methods=["POST"])
def task_provision():
    data = request.get_json() or {}
    # Avoid logging user-controlled request body

    logger.info("Received /task/provision POST request")
    org_id = data.get("org_id")
    workstation_count = data.get("workstation_count", 0)

    if not org_id:
        logger.warning("Provision request missing org_id")
        return jsonify({"error": "org_id is required"}), 400

    job = service_dispatcher("provision_network", org_id=org_id, region=data.get("region", "ca-central-1"), ubuntu_ami=data.get("ubuntu_ami"), workstation_ami=data.get("workstation_ami"), workstation_count=workstation_count)

    return jsonify({"job_id": job.id}), 202

@api_bp.route("/task/provisionworkstations", methods=["POST"])
def task_provision_workstations():
    data = request.get_json() or {}
    # Avoid logging user-controlled request body
    logger.info("Received /task/provisionworkstations POST request")
    org_id = data.get("org_id")

    if not org_id:
        logger.warning("Provision workstations request missing org_id")
        return jsonify({"error": "org_id is required"}), 400\

    count = data.get("count", 1)
    job = service_dispatcher("provision_workstations",org_id=org_id, region=data.get("region", "us-west-2"), count=count)

    return jsonify({"job_id": job.id}), 202

@api_bp.route("/task/destroy", methods=["POST"])
def task_destroy():
    data = request.get_json() or {}
    # Avoid logging user-controlled request body
    logger.info("Received /task/destroy POST request")
    org_id = data.get("org_id")

    if not org_id:
        logger.warning("Destroy request missing org_id")
        return jsonify({"error": "org_id is required"}), 400

    job = service_dispatcher("destroy", org_id=org_id, force=data.get("force", False))

    return jsonify({"job_id": job.id}), 202


@api_bp.route("/status/<job_id>", methods=["GET"])
def job_status(job_id: str):
    status_payload, code = get_job_status(job_id)
    return jsonify(status_payload), code


@api_bp.route("/health", methods=["GET"])
def health():
    payload, code = health_status()
    return jsonify(payload), code

