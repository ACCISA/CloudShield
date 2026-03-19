#include "tasks/CreateSambaFileShare/task.hpp"
#include "utils/sanitize.hpp"
#include "utils/safe_exec.hpp"

is::Status _add_share_conf(std::string share_name)
{
	// Validate share name before writing to config
	Sanitize::ValidateShareName(share_name);

	std::ofstream out_file;
	out_file.open(SambaTask::SAMBA_SMB_CONF_PATH, std::ios_base::app);

	if (out_file.is_open()) {

		out_file << "[" << share_name << "]" << std::endl;
		out_file << "	path = /srv/samba/shared/" << share_name << std::endl;
		out_file << "	browseable = yes" << std::endl;
		out_file << "	read only = no" << std::endl;
		out_file << "	valid users = @\"Domain Users" << std::endl;
		out_file << "	create mask = 0660" << std::endl;
		out_file << "	directory mask = 2770" << std::endl;

		out_file.close();

	} else {
		return is::Status::FAILED;
	}

	return is::Status::SUCCESS;
}

bool _delete_sparse_file(std::string share_name)
{
	Sanitize::ValidateShareName(share_name);

	try {
		std::string img_path = "/srv/samba/shares/" + share_name + ".img";
		if (fs::remove(img_path)) {
		    std::cout << "Sparse file deleted successfully " << std::endl;
		    return true;
		} else {
		    std::cout << "File not found: " << img_path << std::endl;
		    return false;
		}
	    } catch (const fs::filesystem_error& e) {
		std::cerr << "Error: " << e.what() << std::endl;
		return false;
	}
}

is::Status _create_sparse_file(std::string share_name, std::string share_size)
{
	// Validate inputs
	Sanitize::ValidateShareName(share_name);
	Sanitize::ValidateShareSize(share_size);

	std::string img_path = "/srv/samba/shares/" + share_name + ".img";
	std::string mount_path = "/srv/samba/shares/" + share_name;

	std::cout << "[FileShare] Creating sparse file: " << img_path << std::endl;

	// dd: create sparse image file using SafeExec
	auto dd_result = SafeExec::RunSudo("dd", {
		"if=/dev/zero",
		"of=" + img_path,
		"bs=" + share_size,
		"count=0", "seek=10"
	});
	std::cout << dd_result.output << std::endl;

	if (dd_result.output.find("No space left on device") != std::string::npos) {
		std::cout << "No space left on device for new share" << std::endl;
		return is::Status::NO_SPACE_LEFT;
	}

	std::cout << "Created space image file" << std::endl;

	// mkfs.ext4: format the image
	auto mkfs_result = SafeExec::RunSudo("mkfs.ext4", {img_path});
	std::cout << mkfs_result.output << std::endl;

	if (mkfs_result.output.find("Permission denied") != std::string::npos) {
		std::cout << "Permissioned denied for formatting" << std::endl;
		_delete_sparse_file(share_name);
		return is::Status::PERMISSION_DENIED;
	}

	std::string not_found_msg = "The file " + img_path + " does not exist";
	if (mkfs_result.output.find(not_found_msg) != std::string::npos) {
		std::cout << "Image file not found" << std::endl;
		return is::Status::FILE_NOT_FOUND;
	}
	
	std::cout << "Formatted image file" << std::endl;

	fs::create_directory(mount_path);

	std::cout << "Created mount directory" << std::endl;

	// mount: mount the image as loopback
	auto mount_result = SafeExec::RunSudo("mount", {
		"-o", "loop",
		img_path,
		mount_path
	});
	std::cout << mount_result.output << std::endl;

	if (mount_result.output.find("failed to setup loop device") != std::string::npos) {
		std::cout << "Failed to setup loop device" << std::endl;
		_delete_sparse_file(share_name);
		return is::Status::MOUNT_FAIL;
	}
	
	std::cout << "Mounted new file share" << std::endl;

	return is::Status::SUCCESS;
}

is::Status _restart_samba_service()
{
	SafeExec::Run("systemctl", {"restart", "samba-ad-dc"});
	return is::Status::SUCCESS;
}
