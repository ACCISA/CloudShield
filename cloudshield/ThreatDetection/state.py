import time

from logger import logger

class GRPCStateManager:
    
    def __init__(self):
        self.expected = {}
        self.delay = 180

    def set_expected_response(self, agent_id, method):
        self.expected[agent_id] = {
            "method": method,
            "timestamp": int(time.time())
        }
        
        logger.info(f"Expected response added for '{agent_id}' (method='{method}')")
    
    def get_missing_responses(self):
        for agent_id in self.expected.keys():
            method = self.expected[agent_id]["method"]
            curtime = int(time.time())
            timestamp = self.expected[agent_id]["timestamp"]
            if (curtime - timestamp) > self.delay:
                logger.warning(f"Agent '{agent_id}' was expected to respond with '{method}'")

    def is_expected(self, agent_id, method):
        if self.expected["agent_id"] == method:
            logger.info(f"Agent '{agent_id}' has responded with '{method}' as expected")
            del self.expected["agent_id"]

        


