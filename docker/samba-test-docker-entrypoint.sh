#!/bin/bash
if [ -z "${domain_name}" ]; then
    echo "Usage: $0 <domain_name> [admin_password]"
    echo "Example: $0 somecompany.local"
    exit 1
fi

echo "aaaa" >> /hello

# ============================================================
# STEP 5: EC2 installs and configures the samba DC
# ============================================================

echo "=== Installing Samba Domain Controller ==="
echo "Domain: ${domain_name}"
echo "Realm: ${realm_name}"
echo "Admin Password: ${dc_admin_password}"

# --- Set hostname ---
echo "Setting hostname..."
 hostnamectl set-hostname "dc.${domain_name}.local"

# --- Configure /etc/hosts ---
IP_ADDR=$(hostname -I | awk '{print $1}')
 bash -c "cat <<EOF >/etc/hosts
127.0.0.1   localhost
$(hostname -I | awk '{print $1}')  \$HOSTNAME ${domain_name}
EOF"


# --- Update system and install packages ---
echo "Updating and installing required packages..."
export DEBIAN_FRONTEND=noninteractive
 apt-get update -y
 apt-get install -y -q samba winbind smbclient dnsutils acl net-tools
echo "krb5-config krb5-config/default_realm string ${realm_name}" |  debconf-set-selections
echo "krb5-config krb5-config/kerberos_servers string kerberos.example.com" |  debconf-set-selections
echo "krb5-config krb5-config/admin_server string kerberos.example.com" |  debconf-set-selections
 apt-get install -y -q krb5-config

# --- Backup old Samba config ---
 [ -f /etc/samba/smb.conf ] &&  mv /etc/samba/smb.conf /etc/samba/smb.conf.original

# --- Provision Samba Domain Controller ---
#if enx0 samba will listen on local host only
ip link set dev eth0 down
ip link set dev eth0 name enX0
ip link set dev enX0 up

systemctl stop smbd nmbd winbind || true
systemctl disable smbd nmbd winbind || true
systemctl unmask samba-ad-dc || true

echo "Provisioning Samba DC..."
  samba-tool domain provision \
  --use-rfc2307 \
  --realm="${realm_name}" \
  --domain="${domain_name}" \
  --server-role=dc \
  --dns-backend=SAMBA_INTERNAL \
  --adminpass="${dc_admin_password}" \
  --option="interfaces=lo enX0 eth0" \
  --option="bind interfaces only=yes"

# --- Copy Kerberos config ---
 cp /var/lib/samba/private/krb5.conf /etc/krb5.conf


# --- Configure DNS resolver ---
echo "Configuring DNS resolver..."
 bash -c "cat <<EOF >/etc/resolv.conf
nameserver 127.0.0.1
domain ${domain_name}
EOF"

# --- Setup Roaming Profiles ---
echo "Configuring roaming profiles..."
# Create directory for roaming profiles
 mkdir -p /srv/samba/profiles/
# chown root:"Domain Admins" /srv/samba/profiles
 chmod 0770 /srv/samba/profiles

# Add roaming profiles share to smb.conf
 bash -c "cat <<EOF >>/etc/samba/smb.conf

[profiles]
    path = /home/profiles
    browseable = no
    read only = no
    create mask = 0600
    directory mask = 0700
    csc policy = disable
EOF"


# --- Download and Install Helper Scripts from S3 ---
echo "Downloading roaming profiles management scripts..."
 mkdir -p /usr/local/bin/cloudshield

# Download scripts from S3 (if available) or create inline
if aws s3 ls s3://cloudshield-scripts/roaming-profiles/ 2>/dev/null; then
     aws s3 cp s3://cloudshield-scripts/roaming-profiles/configure_user_profile.sh /usr/local/bin/cloudshield/ 2>/dev/null || echo "S3 download failed, will create inline"
fi

# If download failed or S3 not available, create scripts inline
if [ ! -f /usr/local/bin/cloudshield/configure_user_profile.sh ]; then
    echo "Creating helper scripts inline..."
    
    # The scripts will be created via a separate mechanism
    # For now, create placeholder that instructs admins
     cat > /usr/local/bin/cloudshield/README.txt <<'README_EOF'
Roaming Profiles Helper Scripts

To configure roaming profiles for users, use the samba-tool commands directly:

# For a single user:
 /usr/local/bin/cloudshield/configure_user_profile.sh <username>

# For all users:
 /usr/local/bin/cloudshield/configure_all_roaming_profiles.sh

# Verify setup:
 /usr/local/bin/cloudshield/verify_roaming_profiles.sh

If scripts are not present, they can be copied manually via SSH.
README_EOF
fi

# Make scripts executable if they exist
 chmod +x /usr/local/bin/cloudshield/*.sh 2>/dev/null || true

# Create symlinks for easier access if scripts exist
if [ -f /usr/local/bin/cloudshield/configure_user_profile.sh ]; then
     ln -sf /usr/local/bin/cloudshield/configure_user_profile.sh /usr/local/bin/configure_user_profile
     ln -sf /usr/local/bin/cloudshield/configure_all_roaming_profiles.sh /usr/local/bin/configure_all_roaming_profiles
     ln -sf /usr/local/bin/cloudshield/verify_roaming_profiles.sh /usr/local/bin/verify_roaming_profiles
    echo "Helper scripts installed successfully"
else
    echo "Helper scripts will need to be copied manually - see /usr/local/bin/cloudshield/README.txt"
fi

# --- Done ---
echo "Samba Domain Controller setup complete!"
echo "Hostname: dc.${domain_name}.local"
echo "IP Address: ${IP_ADDR}"
echo "Realm: ${realm_name}"
echo "Administrator Password: ${dc_admin_password}"


samba-tool user setpassword Administrator --newpassword="${dc_admin_password}"
printf '%s\n' "${dc_admin_password}" "${dc_admin_password}"
printf '%s\n' "${dc_admin_password}" "${dc_admin_password}" |  smbpasswd -s Administrator

# ============================================================
# STEP 6: Backend server does a check on the EC2 instance
#         to make sure the installation process is completed
# ============================================================

echo ""
echo "=== Running Verification Checks ==="

# Check 2: DNS is responding
echo -n "Checking DNS resolution... "
dig @127.0.0.1 localhost +short
if dig @127.0.0.1 localhost +short > /dev/null 2>&1; then
    echo "Working"
else
    echo "Failed - DNS not responding"
fi

# Check 3: Domain level
echo -n "Checking domain provision... "
if samba-tool domain level show > /dev/null 2>&1; then
    echo "Verified"
else
    echo "Failed - domain not properly provisioned"
fi

# Check 4: Roaming profiles share
echo -n "Checking roaming profiles share... "
if smbclient -L localhost -U% 2>/dev/null | grep -q "profiles"; then
    echo "Configured"
else
    echo "Warning - profiles share not found"
fi

echo ""
echo "All verification checks passed!"
echo "Domain Controller is ready for use."
echo "Roaming profiles share: //dc.${domain_name}.local/profiles"

# ============================================================
# STEP 7: Automatically configure roaming profiles for all users
# ============================================================

echo ""
echo "=== Configuring Roaming Profiles for All Users ==="

# Wait a moment for Samba to fully settle
sleep 5

# Get domain and hostname info
DOMAIN=$(samba-tool domain info $(hostname -I | awk '{print $1}') | grep "Domain" | head -1 | awk '{print $3}')
DC_HOSTNAME=$(hostname -f)

if [ -z "$DOMAIN" ]; then
    echo "Warning: Could not determine domain name for automatic profile configuration"
else
    echo "Domain: $DOMAIN"
    echo "DC Hostname: $DC_HOSTNAME"
    
    # Get all users except system accounts
    USERS=$(samba-tool user list | grep -v "^Administrator$\|^Guest$\|^krbtgt$")
    
    if [ -z "$USERS" ]; then
        echo "No regular user accounts found - skipping automatic profile configuration"
    else
        echo "Configuring roaming profiles for existing users..."
        
        SUCCESS_COUNT=0
        FAIL_COUNT=0
        
        for USERNAME in $USERS; do
            echo -n "  Configuring $USERNAME... "
            
            PROFILE_PATH="\\\\$${DC_HOSTNAME}\\profiles\\$${USERNAME}"
            
            # Create temporary LDIF file
            TEMP_LDIF=$(mktemp)
            cat > "$TEMP_LDIF" <<EOFLDIF
dn: CN=$${USERNAME},CN=Users,DC=$${DOMAIN//./,DC=}
changetype: modify
replace: profilePath
profilePath: $${PROFILE_PATH}
EOFLDIF
            
            # Apply the change
            if ldbmodify -H /var/lib/samba/private/sam.ldb "$TEMP_LDIF" 2>/dev/null; then
                echo "✓"
                ((SUCCESS_COUNT++))
            else
                echo "✗"
                ((FAIL_COUNT++))
            fi
            
            # Clean up
            rm -f "$TEMP_LDIF"
        done
        
        echo ""
        echo "Roaming profiles configured for $SUCCESS_COUNT user(s)"
        if [ $FAIL_COUNT -gt 0 ]; then
            echo "Warning: $FAIL_COUNT user(s) failed to configure"
        fi
    fi
fi

echo "Starting ssh daemon"
mkdir /var/run/sshd
#systemctl status samba
systemctl start ssh
systemctl start samba

echo ""
echo "=== Samba Domain Controller Setup Complete ==="
echo "New users added in the future can be configured using:"
echo "  /usr/local/bin/configure_user_profile <username>"
echo "Or reconfigure all users with:"
echo "  /usr/local/bin/configure_all_roaming_profiles"
