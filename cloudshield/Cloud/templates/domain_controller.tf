#########################
# Domain Controller Setup
# Provisions Samba DC on Ubuntu instance
#########################

# ============================================================
# STEP 1: Backend server tasks the creation of a Ubuntu 22.04 
#         EC2 Instance (defined in main.tf)
# ============================================================

# ============================================================
# STEP 2-6: Automated deployment of Samba DC
# ============================================================

resource "null_resource" "deploy_samba_dc" {
  # Trigger re-deployment if the DC instance changes
  triggers = {
    instance_id = aws_instance.org_id_domain_controller.id
  }

  # Wait for instance to be ready
  depends_on = [
    aws_instance.org_id_domain_controller,
    aws_route.private_to_internet  # Ensure NAT is available for package downloads
  ]

  # Connection details for SSH
  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.org_id.private_key_pem
    host        = aws_instance.org_id_domain_controller.private_ip
    timeout     = "10m"
    
    # Connect through bastion/OpenVPN server in public subnet
    bastion_host        = aws_instance.org_id_openvpn_server.public_ip
    bastion_user        = "ubuntu"
    bastion_private_key = tls_private_key.org_id.private_key_pem
  }

  # ============================================================
  # STEP 2: Backend server waits for the EC2 instance to start 
  #         and open port 22 (SSH)
  # ============================================================
  # (Handled automatically by Terraform connection block)

  # ============================================================
  # STEP 3: Backend server SSHs to the EC2 instance and copies 
  #         down files needed for the installation
  # ============================================================
  provisioner "file" {
    source      = "${path.module}/scripts/samba.sh"
    destination = "/tmp/samba.sh"
  }

  # ============================================================
  # STEP 4: Backend server executes the installation script on 
  #         the EC2 instance with the needed arguments
  # ============================================================
  # STEP 5: EC2 installs and configures the samba DC (inside script)
  # STEP 6: Verification checks (inside script)
  # ============================================================
  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/samba.sh",
      "sudo /tmp/samba.sh ${var.org_id}.local ${var.dc_admin_password}"
    ]
  }
}

# Output DC information
output "domain_controller_info" {
  value = {
    instance_id = aws_instance.org_id_domain_controller.id
    private_ip  = aws_instance.org_id_domain_controller.private_ip
    domain_name = "${var.org_id}.local"
    admin_user  = "Administrator"
    status      = "deployed"
  }
  description = "Domain Controller deployment information"
}
