# CloudShield Log Management Guide

## Overview

CloudShield maintains three types of logs:

- **Server Logs**: `logs/server.log` - API server activity
- **General Logs**: `logs/general.log` - Miscellaneous operations
- **Job Logs**: `logs/jobs/job_<job_id>.log` - Individual task execution logs

## Current Configuration

### Log Rotation

- **Max File Size**: 10MB per log file
- **Backup Count**: 5 files (keeps last 50MB of logs per file)
- **Format**: `YYYY-MM-DD HH:MM:SS | LEVEL | logger_name | message`

### Automatic Cleanup

- **Schedule**: Daily (runs every 24 hours)
- **Retention**: 30 days by default
- **Target**: Job logs in `logs/jobs/`

## Log Management Strategies

### 1. Viewing Logs

#### View Recent Job Logs

```bash
# List all job logs sorted by date
ls -lt logs/jobs/

# View the latest job log
ls -t logs/jobs/ | head -1 | xargs -I {} cat logs/jobs/{}

# Search for failed jobs
grep -l "ERROR" logs/jobs/*.log
```

#### View Live Logs (Docker)

```bash
# Follow server logs
docker logs cs-api -f

# View specific job log in real-time
docker exec cs-api tail -f /app/logs/jobs/job_<job_id>.log
```

### 2. Log Search and Analysis

#### Find Specific Errors

```bash
# Search for terraform errors
grep -r "terraform.*failed" logs/jobs/

# Find all failed jobs in the last 7 days
find logs/jobs/ -name "job_*.log" -mtime -7 -exec grep -l "ERROR" {} \;

# Count errors by type
grep -h "ERROR" logs/jobs/*.log | cut -d'|' -f4 | sort | uniq -c | sort -rn
```

#### Analyze Job Duration

```python
# Add this to a management script
from pathlib import Path
import re
from datetime import datetime

def analyze_job_duration(job_id):
    log_file = Path(f"logs/jobs/job_{job_id}.log")
    lines = log_file.read_text().splitlines()

    start_time = None
    end_time = None

    for line in lines:
        if "Provision requested" in line or "Destroy requested" in line:
            start_time = datetime.fromisoformat(line.split('|')[0].strip())
        if "complete" in line.lower():
            end_time = datetime.fromisoformat(line.split('|')[0].strip())

    if start_time and end_time:
        duration = end_time - start_time
        print(f"Job {job_id} took: {duration}")
```

### 3. Archival Strategy

#### Compress Old Logs

```bash
# Compress logs older than 7 days
find logs/jobs/ -name "job_*.log" -mtime +7 -exec gzip {} \;

# Create monthly archives
tar -czf logs/archive/jobs_$(date +%Y-%m).tar.gz logs/jobs/*.log.gz
```

#### Export to External Storage

```bash
# Sync to S3 (for long-term storage)
aws s3 sync logs/jobs/ s3://cloudshield-logs/jobs/ \
    --storage-class GLACIER \
    --exclude "*" --include "job_*.log"

# Or use rsync to backup server
rsync -av logs/ backup-server:/backups/cloudshield/logs/
```

### 4. Monitoring and Alerts

#### Create Alert Scripts

**Check for Failed Jobs:**

```python
# scripts/check_failed_jobs.py
from pathlib import Path
from datetime import datetime, timedelta

def check_recent_failures(hours=24):
    cutoff = datetime.now() - timedelta(hours=hours)
    failed_jobs = []

    for log_file in Path("logs/jobs").glob("job_*.log"):
        if datetime.fromtimestamp(log_file.stat().st_mtime) > cutoff:
            if "ERROR" in log_file.read_text():
                failed_jobs.append(log_file.stem)

    if failed_jobs:
        print(f"⚠️  {len(failed_jobs)} failed jobs in last {hours}h:")
        for job in failed_jobs:
            print(f"  - {job}")
        # Send alert via email/Slack/etc.
    else:
        print(f"✅ No failed jobs in last {hours}h")

if __name__ == "__main__":
    check_recent_failures()
```

**Monitor Disk Usage:**

```bash
# Add to cron
#!/bin/bash
LOG_SIZE=$(du -sm logs/ | cut -f1)
if [ $LOG_SIZE -gt 1000 ]; then
    echo "WARNING: Log directory size is ${LOG_SIZE}MB"
    # Send alert
fi
```

### 5. API Endpoints for Log Management

You can add these endpoints to manage logs programmatically:

```python
# In routes/api.py

@api_bp.route("/logs/jobs", methods=["GET"])
def list_job_logs():
    """List all job logs with metadata"""
    logs = []
    for log_file in JOB_LOG_DIR.glob("job_*.log"):
        stat = log_file.stat()
        logs.append({
            "job_id": log_file.stem.replace("job_", ""),
            "size_bytes": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        })
    return jsonify(logs), 200

@api_bp.route("/logs/jobs/<job_id>", methods=["GET"])
def get_job_log(job_id: str):
    """Retrieve specific job log"""
    log_path = get_job_log_path(job_id)
    if not log_path.exists():
        return jsonify({"error": "Log not found"}), 404

    # Optional: return tail, head, or full log
    lines = request.args.get("lines", type=int)
    content = log_path.read_text()

    if lines:
        content = "\n".join(content.splitlines()[-lines:])

    return jsonify({
        "job_id": job_id,
        "content": content,
        "size_bytes": log_path.stat().st_size
    }), 200

@api_bp.route("/logs/cleanup", methods=["POST"])
def trigger_cleanup():
    """Manually trigger log cleanup"""
    data = request.get_json() or {}
    days = data.get("days", 30)
    cleanup_old_logs(days)
    return jsonify({"message": f"Cleanup complete for logs older than {days} days"}), 200
```

### 6. Docker Volume Management

#### Backup Docker Volumes

```bash
# Backup logs directory
docker run --rm \
  -v cloudshield_logs:/logs \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/logs-$(date +%Y%m%d).tar.gz /logs

# Restore from backup
docker run --rm \
  -v cloudshield_logs:/logs \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/logs-20251101.tar.gz -C /
```

#### Monitor Volume Size

```bash
docker system df -v | grep cloudshield
```

### 7. Log Retention Policies

Update `worker.py` to configure cleanup schedule:

```python
# Adjust retention based on environment
if os.getenv("CLOUDSHIELD_ENV") == "production":
    RETENTION_DAYS = 90  # Keep 3 months in prod
else:
    RETENTION_DAYS = 30  # Keep 1 month in dev

scheduler.schedule(
    scheduled_time=datetime.utcnow(),
    func=cleanup_old_logs,
    args=(RETENTION_DAYS,),
    interval=86400,  # Daily
    repeat=None
)
```

### 8. Log Aggregation (Advanced)

For production environments, consider:

#### ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
# docker-compose.yml
logstash:
  image: docker.elastic.co/logstash/logstash:8.14.0
  volumes:
    - ./logs:/logs:ro
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
```

#### Structured Logging

Modify `logging_setup.py` to output JSON:

```python
import json

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "job_id": getattr(record, 'job_id', None),
        }
        return json.dumps(log_data)
```

## Best Practices

1. **Regular Monitoring**: Check disk usage weekly
2. **Archive Before Delete**: Compress and archive before cleanup
3. **Test Restores**: Periodically test log restoration
4. **Document Incidents**: Keep critical job logs for post-mortems
5. **Index Important Logs**: Consider a log aggregation tool for production
6. **Set Alerts**: Monitor for ERROR patterns and disk space
7. **Version Control**: Keep this guide updated with your team's processes

## Troubleshooting

### Logs Not Being Created

- Check `/app/logs/jobs/` directory exists and is writable
- Verify Docker volume mount: `docker inspect cs-api | grep -A5 Mounts`
- Check worker process is running: `docker exec cs-api ps aux | grep worker`

### Disk Full

```bash
# Emergency cleanup - remove all job logs older than 1 day
find logs/jobs/ -name "job_*.log" -mtime +1 -delete

# Compress all logs immediately
gzip logs/jobs/*.log
```

### Cannot Access Logs

- Check file permissions: `ls -la logs/jobs/`
- Verify user has read access in Docker container
- Check if volume is mounted correctly

## Configuration Reference

All log configuration is in `cloudshield/Server/utils/logging_setup.py`:

```python
BASE_LOG_DIR = Path(os.getenv("CLOUDSHIELD_LOG_DIR", "logs"))
JOB_LOG_DIR = BASE_LOG_DIR / "jobs"
LOG_LEVEL = os.getenv("CLOUDSHIELD_LOG_LEVEL", "INFO").upper()
MAX_BYTES = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5
```

Override via environment variables:

```bash
CLOUDSHIELD_LOG_DIR=/var/log/cloudshield
CLOUDSHIELD_LOG_LEVEL=DEBUG
```
