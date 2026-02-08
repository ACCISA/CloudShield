"""MongoDB connection management with admin and employee role separation."""
import os
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from bson import ObjectId
from bson.errors import InvalidId

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
    """
    Create MongoDB client with short connection timeout.

    Args:
        url (str): Full MongoDB connection URI string.

    Returns:
        MongoClient: Configured client with a 5-second server selection timeout.

    Notes:
        - Used internally to build both admin and employee clients.
        - Keeps startup responsive by failing quickly on unreachable servers.
    """
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
    
    # Admin path: Raw "users" collection (read-write).
    # Employee path: "users_public" VIEW (read-only, excludes sensitive fields).
    users_admin  = db_admin["users"]
    users_public = db_emp["users_public"]
    orgs = db_admin["orgs"]
    audit = db_admin["audit"]    

    try:
        orgs.create_index("company_name", unique=True)
    except Exception as e:
        print(f"[database.py] Note: orgs index creation skipped: {e}")

    organizations = db_admin["organizations"]

    access_groups = db_admin["access_groups"]
    try:
        access_groups.create_index("name", unique=True)
    except Exception as e:
        print(f"[database.py] Note: access_groups index creation skipped: {e}")

    # File shares collection with indexes
    shares = db_admin["shares"]
    try:
        # Ensure unique share names per organization
        shares.create_index([("org_id", 1), ("name", 1)], unique=True)
        # Ensure unique drive letters per organization (Z, Y, X, etc. - excluding C)
        shares.create_index([("org_id", 1), ("drive", 1)], unique=True)
        shares.create_index("org_id")
    except Exception as e:
        print(f"[database.py] Note: shares index creation skipped: {e}")

    # Create a unique index on email for users collection
    users_admin.create_index("email", unique=True)
    
    # Performance optimization: Add text index for efficient user search
    # This enables fast search on email and full_name fields (10x faster than regex)
    try:
        users_admin.create_index([
            ("email", "text"),
            ("full_name", "text")
        ], name="user_search_text_index")
    except Exception as e:
        # Index creation may fail if it already exists with different options
        # or if text indexes conflict - this is non-critical for startup
        print(f"[database.py] Note: Text index creation skipped: {e}")


    organizations.create_index("package")
    organizations.create_index("provisioning_status")

    print(f"[database.py] Connected to MongoDB DB='{DB_NAME}' (admin+employee clients ready)")
except PyMongoError as e:
    print(f"[database.py] MongoDB connection failed: {e}")
    raise

def org_filter(org_id: str) -> dict:
    """Return a MongoDB filter for an organization identifier.

    Behavior:
    - If `org_id` is a valid 24-char ObjectId hex string, return {'_id': ObjectId(org_id)}.
    - If not, fall back to {'org_id': org_id} for backward compatibility.

    This allows callers to transparently support both ObjectId-based orgs and
    older string identifiers during transition.
    """
    if org_id is None:
        return {}
    try:
        return {"_id": ObjectId(org_id)}
    except (InvalidId, TypeError):
        return {"org_id": org_id}


__all__ = [
    "db_admin",
    "db_emp",
    "admin_client",
    "emp_client",
    "users_admin",
    "users_public",
    "organizations",
    "access_groups",
    "db",
    "client",
    "orgs",
    "audit",
    "shares",
    "org_filter",
]


def get_inventory_from_org_id(org_id: str):
    """
    Retrieve IT asset inventory for organization from MongoDB.

    Args:
        org_id (str): Unique organization identifier used to scope inventory records.

    Returns:
        Inventory: A Pydantic 'Inventory' model instance containing the org's assets.

    Raises:
        KeyError: If the document structure in MongoDB is missing expected fields.
        PyMongoError: If MongoDB connection or query execution fails.

    Notes:
        - This function reads from the 'itam' collection in the default DB.
    """
    itam_db = db.itam

    doc = itam_db.find_one({"org_id":org_id})

    if doc is None:
        return None
    print(doc)

    return Inventory(org_id=str(doc["org_id"]), assets=doc["assets"])
