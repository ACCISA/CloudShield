from .logging_setup import get_logger

logger = get_logger("service")

def update_job(job, status):
    if job is None:
        logger.warning("Unable to update job status")
        return

    logger.info(f"JOB UPDATE (job_id={job.id}, status={status})")

    job.meta["progress"] = status
    job.save_meta()
