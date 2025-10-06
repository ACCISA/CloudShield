from dotenv import load_dotenv
load_dotenv()
from flask import Flask, request, jsonify
from redis_client import task_queue, redis_conn
from tasks import create_ec2, create_vpc
from rq.job import Job
from routes.users import users_bp

app = Flask(__name__)

app.register_blueprint(users_bp, url_prefix="/api")

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

@app.route("/status/<job_id>", methods=["GET"])
def job_status(job_id):
    try:
        job = Job.fetch(job_id, connection=redis_conn)
    except Exception:
        return jsonify({"error": "Job not found"}), 404

    response = {
        "job_id": job.id,
        "status": job.get_status(),
        "progress": job.meta.get("progress", "No updates yet"),
        "result": job.result if job.is_finished else None,
    }
    return jsonify(response), 200

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5050)

