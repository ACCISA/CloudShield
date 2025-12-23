from .task import BaseTask

try:  # Honour legacy flat module first
    from logger import task_logger  # type: ignore
except ImportError:  # pragma: no cover - fallback to package-relative import
    from ..logger import task_logger

import subprocess

class CallBootstrapTask(BaseTask):
    def __init__(self, agent_state):
        super().__init__(agent_state)
        self.agent_state = agent_state

    def run(self):
        task_logger.info("Running bootstrap script to verify agent version")
        try:
            subprocess.run(["bootstrap.exe"])
        except Exception as e:
            task_logger.error(e)
            task_logger.error("Unable to call bootstrap script")

