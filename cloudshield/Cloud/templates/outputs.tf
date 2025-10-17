# outputs.tf - keep only one file with these outputs

output "created_windows_ami_id" {
  description = "AMI ID created for the Windows builder (empty if not created)"
  value = length(aws_ami_from_instance.cloudshield_windows) > 0 ? aws_ami_from_instance.cloudshield_windows[0].id : ""
}

output "builder_instance_id" {
  description = "Instance ID of the Windows builder instance (empty if not created)"
  value = length(aws_instance.windows_builder) > 0 ? aws_instance.windows_builder[0].id : ""
}

output "agent_s3_bucket" {
  description = "S3 bucket where the agent binary was uploaded (empty if not created)"
  value = (try(aws_s3_bucket.agent_bucket.bucket, "") != "") ? aws_s3_bucket.agent_bucket.bucket : ""
}

output "openvpn_server_info" {
  description = "OpenVPN server information"
  value = {
    instance_id = aws_instance.org_id_openvpn_server.id
    public_ip   = aws_instance.org_id_openvpn_server.public_ip
    private_ip  = aws_instance.org_id_openvpn_server.private_ip
  }
}

output "workstation_info" {
  description = "Workstation information"
  value = {
    instance_id = aws_instance.org_id_workstation.id
    private_ip  = aws_instance.org_id_workstation.private_ip
    ami_id      = aws_instance.org_id_workstation.ami
  }
}

output "ssh_key_path" {
  description = "Path to the generated SSH private key"
  value = local_file.private_key.filename
}
