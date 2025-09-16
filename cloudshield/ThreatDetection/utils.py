import json
import urllib.parse
def read_hashes():
    hashes = []
    f = open("hashes", "r")
    for line in f:
        hashes.append(line.strip())
    return hashes

hashes = read_hashes()

def ingest_processes(processes):
    
    unknown_processes = []

    for proc in processes:
        if proc["hash"] not in hashes:
            unknown_processes.append(proc)

    return unknown_processes


def get_agents():

    # TODO replace this with mongodb
    
    f = open("agents.json", "r")
    data = json.load(f)

    return data["agents"]

def is_valid_agent(agents, ip, agent_id):

    for agent in agents:
        if ip == agent["ip"] and agent_id == agent["agent_id"]: return True
    return False

def get_ip(peer: str) -> str:
    # Example peer formats:
    #  "ipv4:127.0.0.1:54321"
    #  "ipv6:%5B::1%5D:60300"
    if peer.startswith("ipv4:"):
        return peer.split(":")[1]
    elif peer.startswith("ipv6:"):
        # Remove "ipv6:" and split host/port
        addr = peer[5:]
        # Decode percent encoding (%5B, %5D)
        decoded = urllib.parse.unquote(addr)
        # decoded will be like "[::1]:60300"
        host = decoded.split("]")[0].strip("[")
        return host
    return "unknown"
