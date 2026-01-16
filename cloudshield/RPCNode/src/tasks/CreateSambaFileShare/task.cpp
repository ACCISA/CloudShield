#include "tasks/CreateSambaFileShare/task.hpp"

bool _add_share_conf(std::string share_name)
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
		return false;
	}

	return true;
}

bool _create_sparse_file(std::string share_name, std::string share_size)
{
	std::string dd_cmd = BuildCommand("dd if=/dev/zero of=/srv/samba/shares/%s.img bs=%s count=0 seek=10" );
	std::string format_cmd = BuildCommand("mkfs.ext4 /srv/samba/shares/%s.img");
	std::string mount_cmd = BuildCommand("mount -o loop /srv/samba/shares/%s.img /srv/samba/shares/%s");


	return false;
}

bool _restart_samba_service()
{
	std::system(SambaTask::RESTART_SAMBA_CMD);
	return true;
}
