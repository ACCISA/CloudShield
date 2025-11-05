# CloudShield - Cloud Infrastructure

This directory contains the Terraform templates and scripts for provisioning CloudShield's cloud infrastructure on AWS.

## Overview

The Cloud module provisions a complete enterprise network infrastructure including:
- VPC with public/private subnets
- OpenVPN server for secure remote access
- Samba Active Directory Domain Controller
- Windows workstations
- S3 storage and IAM roles

## Components

### Samba Domain Controller

The Samba DC (`samba.tftpl`) provisions an Ubuntu-based Active Directory-compatible domain controller with:
- Active Directory Domain Services
- DNS server (SAMBA_INTERNAL backend)
- Kerberos authentication
- **Roaming Profiles** support

### Roaming Profiles

Roaming profiles allow users to maintain consistent settings and files across different workstations in the domain. When a user logs into any domain-joined workstation, their profile is downloaded from the network share.

#### Server-Side Configuration

The Samba DC automatically configures a roaming profiles share during provisioning:

**Share Location:** `/home/profiles` on the domain controller

**SMB Share Configuration:**
```ini
[profiles]
    path = /home/profiles
    browseable = no
    read only = no
    create mask = 0600
    directory mask = 0700
    profile acls = yes
    csc policy = disable
```

**Key Settings:**
- `browseable = no`: The share is hidden from network browsing
- `create mask = 0600`: User files have read/write permissions for owner only
- `directory mask = 0700`: User directories have full permissions for owner only
- `profile acls = yes`: Enables Windows ACLs for profile security
- `csc policy = disable`: Disables client-side caching to ensure profiles are always current

#### Client-Side Configuration

To enable roaming profiles for domain users, configure each user account via Active Directory:

**Using samba-tool (on the domain controller):**
```bash
# Set roaming profile path for a user
samba-tool user edit <username> --profile-path="\\\\dc.${domain_name}.local\\profiles\\%USERNAME%"
```

**Using PowerShell (on Windows client):**
```powershell
# Set roaming profile path for a user
Set-ADUser -Identity "username" -ProfilePath "\\dc.domain.local\profiles\%USERNAME%"
```

**Using Active Directory Users and Computers GUI:**
1. Open Active Directory Users and Computers
2. Right-click the user → Properties
3. Go to the Profile tab
4. Set Profile path: `\\dc.domain.local\profiles\%USERNAME%`

#### How It Works

1. User logs into a domain-joined workstation
2. Windows checks if the user has a roaming profile configured
3. If yes, Windows downloads the profile from `\\dc.domain.local\profiles\<username>`
4. User works with their personalized environment
5. On logout, changes are synchronized back to the network share
6. Next login (on same or different workstation) uses the updated profile

#### Benefits

- **Consistency:** Same desktop, settings, and documents on any workstation
- **Flexibility:** Users can work from any available workstation
- **Centralized Management:** Profiles stored centrally for backup and policy enforcement
- **Non-Persistent Workstations:** Workstations can be reimaged without losing user data

#### Troubleshooting

**Profile not loading:**
- Verify the user's profile path is set correctly in AD
- Check network connectivity to the domain controller
- Ensure the profiles share is accessible: `smbclient -L dc.domain.local -U username`
- Check permissions on `/home/profiles` directory

**Slow login/logout:**
- Large profiles (>10GB) can cause delays
- Use folder redirection for large folders (Documents, Desktop, etc.)
- Consider setting up Offline Files/Client Side Caching selectively

**Profile corruption:**
- Check disk space on the domain controller
- Review `/home/ubuntu/samba-userdata.log` for errors
- Check Samba logs: `/var/log/samba/`

## Deployment

The infrastructure is deployed using Terraform through the Server module's task queue:

```python
from cloudshield.Server.tasks import provision_network

# Provision a new network for an organization
provision_network(org_id="company123", region="us-west-2")
```

## File Structure

```
Cloud/
├── README.md                          # This file
├── requirements.txt                   # Python dependencies
├── templates/                         # Terraform templates
│   ├── main.tf                       # Main infrastructure definition
│   ├── variables.tf                  # Terraform variables
│   ├── outputs.tf                    # Output values
│   ├── s3_and_iam.tf                # S3 and IAM resources
│   ├── ami_builder.tf               # AMI builder configuration
│   └── scripts/
│       ├── samba.tftpl              # Samba DC provisioning script
│       └── userdata.ps1.tpl         # Windows workstation user data
└── terraform/
    ├── main.py                       # Terraform execution wrapper
    └── destroy_infra.py             # Infrastructure teardown
```

## Security Considerations

- Roaming profiles share uses secure Windows ACLs
- Profile data is transmitted over SMB with encryption (SMB3)
- Each user can only access their own profile directory
- Administrator account has full access for troubleshooting
- Profiles are not browseable on the network

## Future Enhancements

- Folder Redirection for Documents, Desktop, Pictures
- Mandatory Profiles for specific user groups
- Profile size quotas and cleanup policies
- Profile backup and disaster recovery
- Integration with Group Policy for profile management
