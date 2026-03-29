import time

from logger import state_logger

class GRPCStateManager:
    """
    The GRPC state manager allows our central server to detect anomalies in requests sent by agents. Certain RPCs should only be made if the server is expecting it.
    """
    
    def __init__(self, delay):
        self.expected = []
        self.delay = delay

    def is_duplicated(self, agent_id, request_method, response_method):
        """
        Check if the state manager already has an entry for this RPC combination.
        """
        expected_requests = self.get_agent_requests(agent_id)
        if len([request for request in expected_requests if request_method == request["request_method"] and response_method == request["response_method"]]) == 0: 
            return False
        return True

    def set_expected_response(self, agent_id, request_method, response_method):
        """
        Set an expected RPC response after a RPC request made by an agent.
        Example: A SendProcessList should follow with a SendProcessListInformation
        """
        
        if self.is_duplicated(agent_id, request_method, response_method):
            state_logger.info(f"'{agent_id}' is already expecting a response (request_method='{request_method}', response_method='{response_method}'")
            return

        self.expected.append({
            "agent_id": agent_id,
            "request_method": request_method,
            "request_timestamp": int(time.time()),
            "response_method": response_method
        })

        state_logger.info(f"Expected response added for '{agent_id}' (request_method='{request_method}', response_method='{response_method}')")
    
    def get_agent_requests(self, agent_id):
        """
        Get the expected RPCs from an agent.
        """
        return [request for request in self.expected if request["agent_id"] == agent_id]
        
    def alert_missing_responses(self):
        """
        This function is ran to log agents that have not responded with expected RPCs.
        Example: An agent sent a SendProcessList and the server notified the agent to send a
        SendProcessListInformation. If the agent never replies back with a SendProcessListInformation, an event should be logged.
        """
        curtime = int(time.time())
        stale = []
        for request in self.expected:
            request_method = request["request_method"]
            response_method = request["response_method"]
            agent_id = request["agent_id"]
            request_timestamp = request["request_timestamp"]
            if (curtime - request_timestamp) > self.delay:
                state_logger.warning(f"Agent '{agent_id}' was expected to respond with '{response_method}' after a '{request_method}' call")
                stale.append(request)
        for request in stale:
            self.expected.remove(request)

    def is_expected(self, agent_id, new_response_method):
        """
        This function is ran on RPCs that are meant to be responses from previous RPC calls.
        Example: SendProcessListInformation should only be sent after a SendProcessList.
        If a SendProcessListInformation is sent without a SendProcessList, an event should be logged.
        """
        agent_requests = self.get_agent_requests(agent_id)

        if len(agent_requests) == 0: 
            return False

        for idx, request in enumerate(agent_requests):
            request_method = request["request_method"]
            response_method = request["response_method"]
            if new_response_method == response_method:
                state_logger.info(f"Agent '{agent_id}' has responded with '{response_method}' after '{request_method}' as expected")
                self.expected.pop(idx)
                return True

        state_logger.warning(f"Agent '{agent_id}' was not expecting a '{new_response_method}'")
        return False

state_manager = GRPCStateManager(delay=180)
