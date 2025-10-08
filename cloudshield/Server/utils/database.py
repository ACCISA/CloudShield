import os
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Load environment variables
DB_NAME          = os.getenv("MONGO_DB", "cloudshield")
MONGO_URL_ADMIN  = os.getenv("MONGO_URL_ADMIN") # admin user (read-write)
MONGO_URL_EMP    = os.getenv("MONGO_URL_EMP")   # employee user (read-only)
#  fallback for local dev if specific URLs aren't set
MONGO_URL_FALLBACK = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

# Helper to create a MongoClient with a short timeout
def _mk_client(url: str) -> MongoClient:
    return MongoClient(url, serverSelectionTimeoutMS=5000)

try:
    # Prefer explicit admin/emp URLs; fall back gracefully for local/dev.
    admin_client = _mk_client(MONGO_URL_ADMIN or MONGO_URL_FALLBACK)
    emp_client   = _mk_client(MONGO_URL_EMP   or MONGO_URL_FALLBACK)

    # ping both so startup fails fast if misconfigured
    admin_client.admin.command("ping")
    emp_client.admin.command("ping")

    db_admin = admin_client[DB_NAME]
    db_emp   = emp_client[DB_NAME]

    # Collections/views:
    # - Admin path uses the raw 'users' collection (can write).
    # - Employee path uses the 'users_public' VIEW (read-only; hides sensitive fields).
    #   If the view isn't created yet, we still bind it; reads will 404 at DB level until you create it.
    users_admin  = db_admin["users"]
    users_public = db_emp["users_public"]  # <-- View created in the Mongo bootstrap

    # Create key indexes (idempotent) on the admin side (write-capable connection)
    # If you use tenant-scoped uniqueness, replace with compound index.
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
]
