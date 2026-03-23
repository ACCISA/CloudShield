"""Tests for cloudshield/Server/utils/job_status.py."""
from unittest.mock import MagicMock

from utils.job_status import update_job


def test_update_job_none_job_returns_early():
    """update_job with None job should return without error."""
    result = update_job(None, "running")
    assert result is None


def test_update_job_sets_progress_and_saves():
    """update_job updates meta and calls save_meta."""
    job = MagicMock()
    job.id = "job-123"
    job.meta = {}

    update_job(job, "done")

    assert job.meta["progress"] == "done"
    job.save_meta.assert_called_once()


def test_update_job_different_statuses():
    """update_job stores whatever status string is passed."""
    for status in ["queued", "started", "finished", "failed"]:
        job = MagicMock()
        job.id = "j"
        job.meta = {}
        update_job(job, status)
        assert job.meta["progress"] == status
