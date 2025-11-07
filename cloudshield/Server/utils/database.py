"""MongoDB connection management with admin and employee role separation."""
import os
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

try:
    from cloudshield.Server.models import Inventory
except ImportError:
    try:
        from ..models import Inventory  # type: ignore[no-redef]
    except ImportError:
        from models import Inventory  # type: ignore[no-redef]

load_dotenv()
MONGO_URI = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
DB_NAME          = os.getenv("MONGO_DB", "cloudshield")
MONGO_URL_ADMIN  = os.getenv("MONGO_URL_ADMIN")
MONGO_URL_EMP    = os.getenv("MONGO_URL_EMP")
MONGO_URL_FALLBACK = os.getenv("MONGO_URL", "mongodb://localhost:27017/")


def _mk_client(url: str) -> MongoClient:
    """Create MongoDB client with short connection timeout."""
    return MongoClient(url, serverSelectionTimeoutMS=5000)

try:
    admin_client = _mk_client(MONGO_URL_ADMIN or MONGO_URL_FALLBACK)
    emp_client   = _mk_client(MONGO_URL_EMP   or MONGO_URL_FALLBACK)

    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    
    client.admin.command("ping")

    admin_client.admin.command("ping")
    emp_client.admin.command("ping")

    db_admin = admin_client[DB_NAME]
    db_emp   = emp_client[DB_NAME]
    
    users_admin  = db_admin["users"]
    users_public = db_emp["users_public"]

    users_admin.create_index("email", unique=True)

    print(f"[database.py] Connected to MongoDB DB='{DB_NAME}' (admin+employee clients ready)")
except PyMongoError as e:
    print(f"[database.py] MongoDB connection failed: {e}")
    raise

__all__ = [
    "db_admin",
    "db_emp",
    "admin_client",
    "emp_client",
    "users_admin",
    "users_public",
    "db",
    "client"
]


def get_inventory_from_org_id(org_id: str):
    """Retrieve IT asset inventory for organization from MongoDB."""
    itam_db = db.itam

    doc = itam_db.find_one({"org_id":org_id})

    if doc is None:
        return None
    print(doc)

    return Inventory(org_id=str(doc["org_id"]), assets=doc["assets"])
