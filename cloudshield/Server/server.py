import os
from flask import Flask, request, jsonify
from redis_client import task_queue, redis_conn
from tasks import provision_network, destroy_environment
from rq.job import Job
from logging_setup import logger
from rq import Retry

app = Flask(__name__)

# Allow overriding per-job timeout (seconds) when enqueuing. Falls back to queue default.
JOB_TIMEOUT = int(os.getenv("CLOUDSHIELD_JOB_TIMEOUT", "1200"))


@app.route("/task/provision", methods=["POST"])
def task_provision():
    data = request.get_json() or {}
    logger.info("/task/provision POST body=%s", data)
    org_id = data.get("org_id")
    if not org_id:
        logger.warning("Provision request missing org_id")
        return jsonify({"error": "org_id is required"}), 400
    job = task_queue.enqueue(
        provision_network,
        org_id,
        data.get("region", "us-west-2"),
        data.get("ubuntu_ami"),
        data.get("workstation_ami"),
        job_timeout=JOB_TIMEOUT,
        retry = Retry(max=3, interval=[10, 30, 60])
    )
    logger.info("Enqueued provision job id=%s org_id=%s", job.id, org_id)
    return jsonify({"job_id": job.id}), 202

@app.route("/status/<job_id>", methods=["GET"])
def job_status(job_id):
    logger.debug("Status check for job_id=%s", job_id)
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        logger.warning("Status requested for unknown job_id=%s", job_id)
        return jsonify({"error": "job not found"}), 404

    status = job.get_status()
    meta = getattr(job, "meta", {}) or {}
    response = {
        "job_id": job.id,
        "status": status,
        "progress": meta.get("progress"),
    }
    if status == "finished":
        response["result"] = job.result
    elif status == "failed":
        response["error"] = (job.exc_info or "failed").splitlines()[-1] if job.exc_info else "failed"
    logger.debug("Status response: %s", response)
    return jsonify(response), 200

@app.route("/task/destroy", methods=["POST"])
def task_destroy():
    data = request.get_json() or {}
    logger.info("/task/destroy POST body=%s", data)
    org_id = data.get("org_id")
    if not org_id:
        logger.warning("Destroy request missing org_id")
        return jsonify({"error": "org_id is required"}), 400
    job = task_queue.enqueue(
        destroy_environment,
        org_id,
        data.get("force", False),
        job_timeout=JOB_TIMEOUT,
        retry = Retry(max=3, interval=[10, 30, 60])
    )
    logger.info("Enqueued destroy job id=%s org_id=%s", job.id, org_id)
    return jsonify({"job_id": job.id}), 202

@app.route("/health", methods=["GET"])
def health():
    try:
        ping = redis_conn.ping()
    except Exception as e:
        logger.error("Health check failed: %s", e)
        return jsonify({"status": "degraded", "redis": False, "error": str(e)}), 503
    logger.debug("Health ok")
    return jsonify({"status": "ok", "redis": bool(ping)}), 200



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

