import unittest.mock
import subprocess

# ======== get_workstation_count tests ========

def test_get_workstation_count_success(monkeypatch, tmp_path):
    """Test successful retrieval of workstation count"""
    from cloudshield.Server.utils.terraform import get_workstation_count

    monkeypatch.setattr(
        "cloudshield.Server.utils.terraform.base_dir",
        tmp_path
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.terraform.get_target_dir",
        lambda org_id, generated_dir: str(tmp_path / "terraform" / "target")
    )

    mock_check_output = unittest.mock.MagicMock(return_value="5\n")
    monkeypatch.setattr(subprocess, "check_output", mock_check_output)

    result = get_workstation_count("test_org")

    assert result == 5
    mock_check_output.assert_called_once()

def test_get_workstation_count_non_existing(monkeypatch, tmp_path):
    """Test successful retrieval of workstation count"""
    from cloudshield.Server.utils.terraform import get_workstation_count

    monkeypatch.setattr(
        "cloudshield.Server.utils.terraform.base_dir",
        tmp_path
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.terraform.get_target_dir",
        lambda org_id, generated_dir: str(tmp_path / "terraform" / "target")
    )

    mock_check_output = unittest.mock.MagicMock(side_effect=subprocess.CalledProcessError(1, "cmd"))
    monkeypatch.setattr(subprocess, "check_output", mock_check_output)

    result = get_workstation_count("test_org")

    assert result == 0
    mock_check_output.assert_called_once()
