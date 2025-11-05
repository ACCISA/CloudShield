import json
import urllib.parse
import os
from elasticsearch import Elasticsearch
from pathlib import Path

from logger import server_logger

BASE_DIR = Path(__file__).resolve().parent

def read_hashes():
    if not os.getenv("CLOUDSHIELD_RUNTIME"):
        return ["knownhash"]
    hashes = []
    hashes_path = BASE_DIR / "hashes"
    with open(hashes_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                hashes.append(line)
    return hashes

hashes = read_hashes()

es = Elasticsearch(
    "http://localhost:9200",
    http_auth=("elastic","enKPRIhK")
)
try:
    es.ping()
except Exception:
    server_logger.warning("Unable to connect to ElasticSearch instance")

def es_log(index, doc):
    try:
        es.index(index=index, document=doc)
    except Exception:
        pass



def ingest_processes(processes):
    
    unknown_processes = []

    for proc in processes:
        if proc["hash"] not in hashes:
            unknown_processes.append(proc)

    return unknown_processes


def get_agents():
    # TODO replace with mongodb later
    if not os.getenv("CLOUDSHIELD_RUNTIME"):
        return [{"ip": "127.0.0.1", "agent_id": "agent-test"}]
    agents_path = BASE_DIR / "agents.json"
    with open(agents_path, "r") as f:
        data = json.load(f)
    return data["agents"]

def is_valid_agent(agents, ip, agent_id):

    for agent in agents:
        if ip == agent["ip"] and agent_id == agent["agent_id"]: 
            return True
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
