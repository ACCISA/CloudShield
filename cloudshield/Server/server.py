from flask import Flask, request, jsonify
from redis_client import task_queue, redis_conn
from tasks import create_ec2, create_vpc, provision_network, destroy_environment
from rq.job import Job

app = Flask(__name__)

@app.route("/task/ec2", methods=["POST"])
def task_ec2():
    data = request.get_json()
    job = task_queue.enqueue(create_ec2, data.get("instance_type", "t2.micro"))
    return jsonify({"job_id": job.id}), 202

@app.route("/task/vpc", methods=["POST"])
def task_vpc():
    data = request.get_json()
    job = task_queue.enqueue(create_vpc, data.get("cidr", "10.0.0.0/16"))
    return jsonify({"job_id": job.id}), 202

@app.route("/task/provision", methods=["POST"])
def task_provision():
    data = request.get_json() or {}
    org_id = data.get("org_id")
    if not org_id:
        return jsonify({"error": "org_id is required"}), 400
    job = task_queue.enqueue(
        provision_network,
        org_id,
        data.get("region", "us-west-2"),
        data.get("ubuntu_ami"),
        data.get("workstation_ami"),
    )
    return jsonify({"job_id": job.id}), 202

@app.route("/status/<job_id>", methods=["GET"])
def job_status(job_id):
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
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
    return jsonify(response), 200

@app.route("/task/destroy", methods=["POST"])
def task_destroy():
    data = request.get_json() or {}
    org_id = data.get("org_id")
    if not org_id:
        return jsonify({"error": "org_id is required"}), 400
    job = task_queue.enqueue(
        destroy_environment,
        org_id,
        data.get("force", False),
    )
    return jsonify({"job_id": job.id}), 202

@app.route("/health", methods=["GET"])
def health():
    try:
        ping = redis_conn.ping()
    except Exception as e:
        return jsonify({"status": "degraded", "redis": False, "error": str(e)}), 503
    return jsonify({"status": "ok", "redis": bool(ping)}), 200

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

