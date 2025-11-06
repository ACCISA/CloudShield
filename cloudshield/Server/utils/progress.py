from __future__ import annotations
from rq import get_current_job

def set_progress(text: str) -> None:
    """
    Safely update RQ job progress text.
    Removes copy/paste of job meta boilerplate across tasks.
    """
    job = get_current_job()
    if job is not None:
        job.meta["progress"] = text
        job.save_meta()

def get_job_id_fallback() -> str:
    job = get_current_job()
    return job.id if job else "unknown"