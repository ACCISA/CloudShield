import time

from logger import logger

class GRPCStateManager:
    
    def __init__(self):
        self.expected = {}
        self.delay = 180

    def set_expected_response(self, agent_id, method):
        # TODO fix this so that we can make the server wait for different type of rpcs
        expected_rpc = self.expected.get(agent_id, None)
        if expected_rpc is not None and expected_rpc["method"] == method:
            logger.warning(f"Agent '{agent_id}' is already expecting a response for '{method}'")
            return
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
        if self.expected.get(agent_id, None) is None:
            return False
        expected_method = self.expected[agent_id]["method"]
        if method == expected_method:
            logger.info(f"Agent '{agent_id}' has responded with '{method}' as expected")
            del self.expected[agent_id]
            return True

        logging.warning(f"Agent '{agent_id}' was expecting '{expected_method}' but received '{method}'")
        return False

state_manager = GRPCStateManager()
