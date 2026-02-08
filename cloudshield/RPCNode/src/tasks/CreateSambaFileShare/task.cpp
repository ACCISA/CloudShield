#include "tasks/CreateSambaFileShare/task.hpp"

is::Status _add_share_conf(std::string share_name)
{
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
	try {
		if (fs::remove(BuildCommand("/srv/samba/shares/{}.img", share_name))) {
		    std::cout << "Sparse file deleted successfully " << std::endl;
		    return true;
		} else {
		    std::cout << "File not found: " << BuildCommand("/srv/samba/shares/{}.img", share_name) << std::endl;
		    return false;
		}
	    } catch (const fs::filesystem_error& e) {
		std::cerr << "Error: " << e.what() << std::endl;
		return false;
	}
}

is::Status _create_sparse_file(std::string share_name, std::string share_size)
{
	int exit_status;
	std::string result_str;

	std::string dd_cmd = BuildCommand("sudo dd if=/dev/zero of=/srv/samba/shares/{}.img bs={} count=0 seek=10", share_name, share_size);
	std::string format_cmd = BuildCommand("sudo mkfs.ext4 /srv/samba/shares/{}.img", share_name);
	std::string mkdir_path = BuildCommand("/srv/samba/shares/{}", share_name);
	std::string mount_cmd = BuildCommand("sudo mount -o loop /srv/samba/shares/{}.img /srv/samba/shares/{}", share_name, share_name);

	std::cout << dd_cmd << std::endl;
	std::cout << format_cmd << std::endl;
	std::cout << mount_cmd << std::endl;

	result_str = ExecuteBinary(dd_cmd);
	std::cout << result_str << std::endl;

	if (result_str.find("No space left on device") != std::string::npos) {
		std::cout << "No space left on device for new share" << std::endl;
		return is::Status::NO_SPACE_LEFT;
	}

	std::cout << "Created space image file" << std::endl;

	result_str = ExecuteBinary(format_cmd);
	std::cout << result_str << std::endl;

	if (result_str.find("Permission denied") != std::string::npos) {
		std::cout << "Permissioned denied for formatting" << std::endl;
		_delete_sparse_file(share_name);
		return is::Status::PERMISSION_DENIED;
	}

	if (result_str.find(BuildCommand("The file /srv/samba/shares/{}.img does not exist", share_name)) != std::string::npos) {
		std::cout << "Image file not found" << std::endl;
		return is::Status::FILE_NOT_FOUND;
	}
	
	std::cout << "Formatted image file" << std::endl;

	fs::create_directory(mkdir_path);

	std::cout << "aaadd" << std::endl;

	result_str = ExecuteBinary(mount_cmd);
	std::cout << result_str << std::endl;

	if (result_str.find("failed to setup loop device") != std::string::npos) {
		std::cout << "Failed to setup loop device" << std::endl;
		_delete_sparse_file(share_name);
		return is::Status::MOUNT_FAIL;
	}
	
	std::cout << "Mounted new file share" << std::endl;

	return is::Status::SUCCESS;
}

is::Status _restart_samba_service()
{
	std::system(SambaTask::RESTART_SAMBA_CMD);
	return is::Status::SUCCESS;
}
