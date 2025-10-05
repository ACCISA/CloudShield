import os
from pymongo import MongoClient

# Environment configuration
MONGO_URI = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME = os.getenv("MONGO_DB", "cloudshield")

try:
    # Initialize MongoDB client
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    client.admin.command("ping")

    print(f"[database.py] Connected to MongoDB: {DB_NAME}")
except Exception as e:
    print(f"[database.py] MongoDB connection failed: {e}")
    raise

# Export db and client for reuse
__all__ = ["db", "client"]