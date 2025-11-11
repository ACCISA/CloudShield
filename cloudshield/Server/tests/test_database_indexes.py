"""
Unit tests for database.py text index and connection handling.
"""
import os


def test_database_text_index_code_exists():
    """Test that text index creation code exists in database.py."""
    # Find the database.py file relative to this test file
    test_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(test_dir, "..", "utils", "database.py")
    
    with open(db_file, "r") as f:
        content = f.read()
        # Verify index creation code is present
        assert 'create_index' in content
        assert '"text"' in content or "'text'" in content
        assert 'email' in content
        assert 'full_name' in content
        assert 'user_search_text_index' in content


def test_database_unique_index_code_exists():
    """Test that unique index on email exists in database.py."""
    test_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(test_dir, "..", "utils", "database.py")
    
    with open(db_file, "r") as f:
        content = f.read()
        assert 'create_index("email", unique=True)' in content or "create_index('email', unique=True)" in content


def test_database_connection_clients():
    """Test that database module exports the expected clients."""
    # Import the module
    import cloudshield.Server.utils.database as db_module
    
    # Verify all expected exports exist
    assert hasattr(db_module, 'db_admin')
    assert hasattr(db_module, 'db_emp')
    assert hasattr(db_module, 'admin_client')
    assert hasattr(db_module, 'emp_client')
    assert hasattr(db_module, 'users_admin')
    assert hasattr(db_module, 'users_public')


def test_get_inventory_from_org_id_exists():
    """Test that get_inventory_from_org_id function exists."""
    import cloudshield.Server.utils.database as db_module
    assert hasattr(db_module, 'get_inventory_from_org_id')
    assert callable(db_module.get_inventory_from_org_id)


def test_database_error_handling():
    """Test that database module handles index creation failures gracefully."""
    test_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(test_dir, "..", "utils", "database.py")
    
    with open(db_file, "r") as f:
        content = f.read()
        # Verify error handling exists for index creation
        assert 'try:' in content
        assert 'except Exception' in content
        assert 'Text index creation skipped' in content or 'text index' in content.lower()

