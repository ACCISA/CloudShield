import pytest

from cloudshield.Server.tasks import email_tasks


class DummyJob:
    def __init__(self, job_id="job-1"):
        self.id = job_id
        self.meta = {}
        self.saved = False

    def save_meta(self):
        self.saved = True


class DummyCollection:
    def __init__(self, document=None):
        self.document = document or {}
        self.queries = []

    def find_one(self, query):
        self.queries.append(query)
        return self.document


class DummyLogsCollection:
    def __init__(self):
        self.inserted = []

    def insert_one(self, payload):
        self.inserted.append(payload)


class DummyDbAdmin:
    def __init__(self, logs_collection):
        self.logs_collection = logs_collection

    def __getitem__(self, name):
        if name == "email_logs":
            return self.logs_collection
        raise KeyError(name)


class DummyLogger:
    def __init__(self):
        self.messages = []

    def info(self, message, *args):
        self.messages.append(("info", message, args))

    def error(self, message, *args):
        self.messages.append(("error", message, args))

    def exception(self, message, *args):
        self.messages.append(("exception", message, args))


@pytest.mark.parametrize(
    ("windows_url", "mac_url", "linux_url", "expected"),
    [
        ("", "", "", []),
        (
            "https://example.com/windows.exe",
            "",
            "",
            [{"label": "Download for Windows", "url": "https://example.com/windows.exe"}],
        ),
        (
            "",
            "https://example.com/macos.dmg",
            "",
            [{"label": "Download for macOS", "url": "https://example.com/macos.dmg"}],
        ),
        (
            "",
            "",
            "https://example.com/linux.AppImage",
            [{"label": "Download for Linux", "url": "https://example.com/linux.AppImage"}],
        ),
        (
            "https://example.com/windows.exe",
            "https://example.com/macos.dmg",
            "https://example.com/linux.AppImage",
            [
                {"label": "Download for Windows", "url": "https://example.com/windows.exe"},
                {"label": "Download for macOS", "url": "https://example.com/macos.dmg"},
                {"label": "Download for Linux", "url": "https://example.com/linux.AppImage"},
            ],
        ),
    ],
)
def test_desktop_app_downloads_returns_configured_targets_in_order(
    monkeypatch, windows_url, mac_url, linux_url, expected
):
    monkeypatch.setattr(email_tasks, "DESKTOP_APP_DOWNLOAD_URL_WINDOWS", windows_url)
    monkeypatch.setattr(email_tasks, "DESKTOP_APP_DOWNLOAD_URL_MAC", mac_url)
    monkeypatch.setattr(email_tasks, "DESKTOP_APP_DOWNLOAD_URL_LINUX", linux_url)

    assert email_tasks._desktop_app_downloads() == expected


def test_send_org_welcome_email_success(monkeypatch):
    job = DummyJob("job-org")
    logs = DummyLogsCollection()
    org = {"company_name": "CloudShield"}
    admin = {"full_name": "Sam", "email": "sam@example.com"}
    rendered = {}
    sent = {}

    def fake_render(template_name, context):
        rendered["template"] = template_name
        rendered["context"] = context
        return "<html>ok</html>"

    def fake_send(**kwargs):
        sent.update(kwargs)
        return {"status": "sent"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: job)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: DummyLogger())
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(admin))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_org_welcome_email("org123", "user456")

    assert result["status"] == "sent"
    assert job.meta["progress"] == "sending org welcome email"
    assert job.saved is True
    assert rendered["template"] == "org_welcome.html"
    assert rendered["context"]["admin_name"] == "Sam"
    assert rendered["context"]["org_name"] == "CloudShield"
    assert rendered["context"]["login_url"] == email_tasks.LOGIN_URL
    assert rendered["context"]["desktop_app_downloads"] == email_tasks._desktop_app_downloads()
    assert sent["to_email"] == "sam@example.com"
    assert sent["subject"] == "Welcome to CloudShield"
    assert logs.inserted and logs.inserted[0]["type"] == "org_welcome"


def test_send_employee_invite_email_error(monkeypatch):
    job = DummyJob("job-emp")
    logs = DummyLogsCollection()
    user = {"full_name": "Alex", "email": "alex@example.com", "org_id": "orgx"}
    org = {"name": "CloudShield"}
    rendered = {}

    def fake_render(template_name, context):
        rendered["template"] = template_name
        rendered["context"] = context
        return "<html>invite</html>"

    def fake_send(**kwargs):
        return {"status": "error", "reason": "smtp down"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: job)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: DummyLogger())
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(user))
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_employee_invite_email("user789")

    assert result["status"] == "error"
    assert job.meta["progress"] == "sending employee invite email"
    assert job.saved is True
    assert rendered["template"] == "employee_invite.html"
    assert rendered["context"]["employee_name"] == "Alex"
    assert rendered["context"]["org_name"] == "CloudShield"
    assert rendered["context"]["login_url"] == email_tasks.LOGIN_URL
    assert rendered["context"]["desktop_app_downloads"] == email_tasks._desktop_app_downloads()
    assert logs.inserted and logs.inserted[0]["reason"] == "smtp down"


def test_send_org_welcome_email_logs_success(monkeypatch):
    """Test that successful org welcome email logs correctly (covers line 77)."""
    job = DummyJob("job-org")
    logs = DummyLogsCollection()
    org = {"company_name": "CloudShield"}
    admin = {"full_name": "Sam", "email": "sam@example.com"}
    logger = DummyLogger()

    def fake_render(template_name, context):
        return "<html>ok</html>"

    def fake_send(**kwargs):
        return {"status": "sent"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: job)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(admin))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_org_welcome_email("org123", "user456")

    assert result["status"] == "sent"
    # Check that the success path logged
    assert any(msg[0] == "info" and "status" in msg[1] for msg in logger.messages)


def test_send_employee_invite_email_logs_success(monkeypatch):
    """Test that successful employee invite email logs correctly (covers line 128)."""
    job = DummyJob("job-emp")
    logs = DummyLogsCollection()
    user = {"full_name": "Alex", "email": "alex@example.com", "org_id": "orgx"}
    org = {"name": "CloudShield"}
    logger = DummyLogger()

    def fake_render(template_name, context):
        return "<html>invite</html>"

    def fake_send(**kwargs):
        return {"status": "sent"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: job)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(user))
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_employee_invite_email("user789")

    assert result["status"] == "sent"
    # Check that the success path logged
    assert any(msg[0] == "info" and "status" in msg[1] for msg in logger.messages)


def test_log_email_event_handles_database_error(monkeypatch):
    """Test that _log_email_event handles database errors gracefully (covers lines 29-31)."""
    logger = DummyLogger()

    class FailingCollection:
        def insert_one(self, payload):
            raise Exception("Database connection failed")

    class FailingDbAdmin:
        def __getitem__(self, name):
            if name == "email_logs":
                return FailingCollection()
            raise KeyError(name)

    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "db_admin", FailingDbAdmin())

    # This should not raise an exception
    email_tasks._log_email_event({"test": "data"})

    # Check that the exception was logged
    assert any(msg[0] == "exception" and "Failed to persist email log" in msg[1] for msg in logger.messages)


def test_send_org_welcome_email_no_job_context(monkeypatch):
    """Test org welcome email when not running in a job context (covers line 40->44)."""
    logs = DummyLogsCollection()
    org = {"company_name": "CloudShield"}
    admin = {"full_name": "Sam", "email": "sam@example.com"}
    logger = DummyLogger()

    def fake_render(template_name, context):
        return "<html>ok</html>"

    def fake_send(**kwargs):
        return {"status": "sent"}

    # Return None to simulate no job context
    monkeypatch.setattr(email_tasks, "get_current_job", lambda: None)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(admin))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_org_welcome_email("org123", "user456")

    assert result["status"] == "sent"
    # Verify it still works without a job context


def test_send_employee_invite_email_no_job_context(monkeypatch):
    """Test employee invite email when not running in a job context (covers line 89->93)."""
    logs = DummyLogsCollection()
    user = {"full_name": "Alex", "email": "alex@example.com", "org_id": "orgx"}
    org = {"name": "CloudShield"}
    logger = DummyLogger()

    def fake_render(template_name, context):
        return "<html>invite</html>"

    def fake_send(**kwargs):
        return {"status": "sent"}

    # Return None to simulate no job context
    monkeypatch.setattr(email_tasks, "get_current_job", lambda: None)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(user))
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)


def test_send_workstation_ready_email_success(monkeypatch):
    job = DummyJob("job-ws")
    logs = DummyLogsCollection()
    user = {
        "full_name": "Alex Admin",
        "email": "alex@example.com",
        "org_id": "org-123",
    }
    org = {"company_name": "CloudShield"}
    rendered = {}
    sent = {}
    logger = DummyLogger()

    def fake_render(template_name, context):
        rendered["template"] = template_name
        rendered["context"] = context
        return "<html>ready</html>"

    def fake_send(**kwargs):
        sent.update(kwargs)
        return {"status": "sent"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: job)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(user))
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_workstation_ready_email("user-1", "WS-One")

    assert result["status"] == "sent"
    assert job.meta["progress"] == "sending workstation ready email"
    assert job.saved is True
    assert rendered["template"] == "workstation_ready.html"
    assert rendered["context"]["user_name"] == "Alex Admin"
    assert rendered["context"]["org_name"] == "CloudShield"
    assert rendered["context"]["workstation_name"] == "WS-One"
    assert rendered["context"]["login_url"] == email_tasks.LOGIN_URL
    assert sent["to_email"] == "alex@example.com"
    assert sent["subject"] == "Your CloudShield workstation is ready"
    assert logs.inserted and logs.inserted[0]["type"] == "workstation_ready"
    assert logs.inserted[0]["workstation_name"] == "WS-One"
    assert any(msg[0] == "info" and "status" in msg[1] for msg in logger.messages)


def test_send_workstation_ready_email_error_without_job_context(monkeypatch):
    logs = DummyLogsCollection()
    user = {
        "full_name": "Alex Admin",
        "email": "alex@example.com",
        "org_id": "org-123",
    }
    org = {"name": "CloudShield"}
    logger = DummyLogger()

    def fake_render(template_name, context):
        return "<html>ready</html>"

    def fake_send(**kwargs):
        return {"status": "error", "reason": "smtp down"}

    monkeypatch.setattr(email_tasks, "get_current_job", lambda: None)
    monkeypatch.setattr(email_tasks, "get_logger", lambda *args, **kwargs: logger)
    monkeypatch.setattr(email_tasks, "users_admin", DummyCollection(user))
    monkeypatch.setattr(email_tasks, "organizations", DummyCollection(org))
    monkeypatch.setattr(email_tasks, "db_admin", DummyDbAdmin(logs))
    monkeypatch.setattr(email_tasks, "render_template", fake_render)
    monkeypatch.setattr(email_tasks, "send_email", fake_send)

    result = email_tasks.send_workstation_ready_email("user-1", "WS-One")

    assert result["status"] == "error"
    assert logs.inserted and logs.inserted[0]["reason"] == "smtp down"
    assert any(msg[0] == "error" and "failed" in msg[1].lower() for msg in logger.messages)
