# Terraform-Based Domain Controller Integration

## Overview

The Samba Domain Controller deployment is now **fully automated through Terraform** as part of the infrastructure provisioning process. When you run `provision_network`, the DC is automatically deployed and configured.

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend Server (Flask/RQ)                         │
│                                                                       │
│  POST /task/provision                                                │
│         │                                                             │
│         ▼                                                             │
│  provision_network() task                                            │
│         │                                                             │
│         └──▶ Terraform apply                                         │
└──────────────────────────────────────┼──────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Terraform                                    │
│                                                                       │
│  1. Create VPC, Subnets, Security Groups                             │
│  2. Create OpenVPN Server (public subnet)                            │
│  3. Create Domain Controller EC2 (private subnet)                    │
│  4. Create Workstation EC2 (private subnet)                          │
│  5. Run null_resource with remote-exec:                              │
│     ┌──────────────────────────────────────────────────────┐        │
│     │  STEP 2: Connect via SSH (bastion through OpenVPN)  │        │
│     │  STEP 3: Upload samba.sh script                     │        │
│     │  STEP 4: Execute samba.sh                           │        │
│     │  STEP 5-6: Installation & Verification (in script)  │        │
│     └──────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation

### Terraform Resources

#### 1. Domain Controller EC2 Instance

**File:** `cloudshield/Cloud/templates/main.tf`

```terraform
resource "aws_instance" "org_id_domain_controller" {
  ami                    = var.ubuntu_ami
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.org_id_private_subnet.id
  vpc_security_group_ids = [aws_security_group.allow_ssh.id]
  key_name               = aws_key_pair.org_id_key.key_name
  tags = { Name = "org_id_domain_controller" }
}
```

#### 2. Automated Deployment via null_resource

**File:** `cloudshield/Cloud/templates/domain_controller.tf`

```terraform
resource "null_resource" "deploy_samba_dc" {
  depends_on = [
    aws_instance.org_id_domain_controller,
    aws_route.private_to_internet
  ]

  connection {
    type        = "ssh"
    user        = "ubuntu"
    private_key = tls_private_key.org_id.private_key_pem
    host        = aws_instance.org_id_domain_controller.private_ip

    # Connect through bastion (OpenVPN server)
    bastion_host        = aws_instance.org_id_openvpn_server.public_ip
    bastion_user        = "ubuntu"
    bastion_private_key = tls_private_key.org_id.private_key_pem
  }

  # STEP 3: Copy script
  provisioner "file" {
    source      = "${path.module}/scripts/samba.sh"
    destination = "/tmp/samba.sh"
  }

  # STEP 4-6: Execute and verify
  provisioner "remote-exec" {
    inline = [
      "chmod +x /tmp/samba.sh",
      "sudo /tmp/samba.sh ${var.org_id}.local ${var.dc_admin_password}"
    ]
  }
}
```

#### 3. Outputs

**File:** `cloudshield/Cloud/templates/outputs.tf`

```terraform
output "domain_controller_info" {
  value = {
    instance_id  = aws_instance.org_id_domain_controller.id
    private_ip   = aws_instance.org_id_domain_controller.private_ip
    domain_name  = "${var.org_id}.local"
    admin_user   = "Administrator"
    realm        = upper("${var.org_id}.local")
  }
}
```

## Step-by-Step Workflow

### STEP 1: EC2 Instance Creation

- **Location:** Terraform - `aws_instance.org_id_domain_controller`
- **Details:** Ubuntu 22.04 t2.micro in private subnet
- **Network:** Behind NAT Gateway, accessible via bastion

### STEP 2: Wait for SSH Connection

- **Location:** Terraform connection block
- **Implementation:** Automatic retry with timeout
- **Connection:** Through bastion host (OpenVPN server) in public subnet

### STEP 3: Copy Installation Files

- **Location:** Terraform `file` provisioner
- **Implementation:** Uploads `samba.sh` to `/tmp/samba.sh`

### STEP 4: Execute Installation Script

- **Location:** Terraform `remote-exec` provisioner
- **Command:** `sudo /tmp/samba.sh ${org_id}.local ${dc_admin_password}`

### STEP 5: Install and Configure Samba DC

- **Location:** Inside `samba.sh` script
- **Actions:** Package install, domain provision, DNS setup

### STEP 6: Verification Checks

- **Location:** End of `samba.sh` script
- **Checks:** Service status, DNS resolution, domain provision

## Usage

### Single Command Provisioning

```bash
# Provision entire network including DC
python cloudshield/Cloud/terraform/main.py --org-id=SomeCompany --region=us-east-1
```

This will:

1. ✅ Create VPC and networking
2. ✅ Launch OpenVPN server
3. ✅ Launch Domain Controller
4. ✅ Deploy and configure Samba
5. ✅ Verify installation
6. ✅ Launch Windows workstation
7. ✅ Output all connection details

### Via API

```bash
# Start provisioning job
curl -X POST http://localhost:5050/task/provision \
  -H "Content-Type: application/json" \
  -d '{"org_id": "SomeCompany", "region": "us-east-1"}'

# Response: {"job_id": "abc123"}

# Check status
curl http://localhost:5050/status/abc123

# Watch progress in real-time
watch -n 2 'curl -s http://localhost:5050/status/abc123 | jq'
```

### Output Example

```
[✓] Phase 2 finished.
[✓] Terraform apply complete for all resources.

[~] Retrieving Domain Controller information...

[✓] Domain Controller Deployment:
    Domain Name: somecompany.local
    Realm: SOMECOMPANY.LOCAL
    Private IP: 10.0.2.45
    Instance ID: i-0abc123def456
    Admin User: Administrator
    Status: ✅ Deployed and Verified

[+] EC2 Instances for SomeCompany:
  - somecompany_openvpn_server (i-0123456789) → running
      Private IP: 10.0.1.10
      Public IP:  54.123.45.67

  - somecompany_domain_controller (i-0abc123def456) → running
      Private IP: 10.0.2.45
      Public IP:  None

  - somecompany_workstation (i-0def789ghi012) → running
      Private IP: 10.0.2.50
      Public IP:  None

[✓] Finished provisioning for SomeCompany.
```

## Files Modified/Created

### New Files

- ✅ `cloudshield/Cloud/templates/domain_controller.tf` - Terraform DC provisioner
- ✅ `cloudshield/Cloud/templates/scripts/samba.sh` - Installation script
- ✅ `TERRAFORM_DC_INTEGRATION.md` - This documentation

### Modified Files

- ✅ `cloudshield/Cloud/templates/variables.tf` - Added `dc_admin_password` variable
- ✅ `cloudshield/Cloud/templates/outputs.tf` - Added DC outputs
- ✅ `cloudshield/Cloud/terraform/main.py` - Added DC info display

### Unchanged (No manual deployment needed)

- ✅ `cloudshield/Server/tasks.py` - Keep existing provision_network task
- ✅ `cloudshield/Server/routes/api.py` - Use existing /task/provision endpoint
- ✅ No separate DC deployment endpoint needed!

## Configuration

### Custom Admin Password

```bash
# Via Terraform directly
python cloudshield/Cloud/terraform/main.py \
  --org-id=SomeCompany \
  --region=us-east-1

# Then override password:
cd cloudshield/Cloud/terraform/generated/SomeCompany
terraform apply -var="dc_admin_password=MySecurePass123!"
```

### Via terraform.tfvars

Create `cloudshield/Cloud/templates/terraform.tfvars`:

```hcl
dc_admin_password = "MyCustomPassword123!"
```

## Advantages of Terraform Integration

### ✅ Fully Automated

- No manual API calls needed
- DC deployed as part of infrastructure
- Single command provisions everything

### ✅ Idempotent

- Re-running terraform won't break DC
- Terraform tracks resource state
- Safe to update configuration

### ✅ Bastion Security

- DC in private subnet (no public IP)
- Accessed only through OpenVPN server
- More secure than direct SSH

### ✅ Dependencies Handled

- Terraform ensures proper order
- Waits for NAT Gateway before install
- Network must be ready before provisioning

### ✅ Infrastructure as Code

- All configuration versioned
- Easy to replicate environments
- Audit trail in Git

## Troubleshooting

### Check Terraform Logs

```bash
cd cloudshield/Cloud/terraform/generated/SomeCompany

# View state
terraform show

# Check outputs
terraform output

# Re-run just DC provisioning
terraform taint null_resource.deploy_samba_dc
terraform apply
```

### SSH to DC via Bastion

```bash
# Get IPs from terraform output
cd cloudshield/Cloud/terraform/generated/SomeCompany

BASTION_IP=$(terraform output -raw openvpn_server_info | jq -r .public_ip)
DC_IP=$(terraform output -raw domain_controller_info | jq -r .private_ip)

# SSH through bastion
ssh -i somecompany_key.pem \
  -o ProxyCommand="ssh -W %h:%p -i somecompany_key.pem ubuntu@$BASTION_IP" \
  ubuntu@$DC_IP

# Check Samba status
sudo systemctl status samba-ad-dc
sudo samba-tool domain level show
```

### Force DC Redeployment

```bash
cd cloudshield/Cloud/terraform/generated/SomeCompany

# Mark DC provisioner for recreation
terraform taint null_resource.deploy_samba_dc

# Reapply
terraform apply
```

### Common Issues

**Issue:** "Error connecting to bastion"

- **Cause:** OpenVPN server not ready or security group issue
- **Solution:** Verify bastion is running, check security groups allow SSH

**Issue:** "Timeout waiting for SSH"

- **Cause:** NAT Gateway not configured, instance not ready
- **Solution:** Check route table, verify internet connectivity from private subnet

**Issue:** "samba.sh: No such file"

- **Cause:** Script not copied to templates/scripts
- **Solution:** Ensure `samba.sh` exists in `templates/scripts/` before terraform apply

**Issue:** "Installation verification failed"

- **Cause:** Package installation failed, DNS issues
- **Solution:** SSH to DC and check `/var/log/samba/` logs

## Security Considerations

### SSH Keys

- Generated by Terraform per organization
- Stored in `{org_id}_key.pem`
- Permissions automatically set to 0600

### Admin Passwords

- Marked as `sensitive = true` in Terraform
- Not shown in terraform output
- Consider using AWS Secrets Manager for production

### Network Security

- DC has no public IP address
- Only accessible via bastion host
- Security group limits access to SSH only
- All outbound traffic via NAT Gateway

## Future Enhancements

1. **User Management Integration**

   - Hook into employee onboarding API
   - Automatically create AD users
   - Sync with CloudShield user database

2. **Backup Strategy**

   - Automated Samba DC backups to S3
   - Point-in-time recovery
   - Disaster recovery procedures

3. **Monitoring & Alerting**

   - CloudWatch metrics for DC health
   - SNS alerts on service failures
   - Automated health checks

4. **Multi-DC Deployment**

   - Primary and backup DCs
   - Automatic failover
   - Replication configuration

5. **Windows Server Option**
   - Support Windows Server AD
   - Terraform module selection
   - Hybrid Samba/Windows environments
