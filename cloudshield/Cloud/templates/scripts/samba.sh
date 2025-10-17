#!/bin/bash
set -euo pipefail

DOMAIN_NAME=$1
REALM=$(echo "$DOMAIN_NAME" | tr '[:lower:]' '[:upper:]')
ADMIN_PASSWORD=${2:-"CloudShield2024!"}
HOSTNAME="dc.${DOMAIN_NAME%%.*}"

if [ -z "$DOMAIN_NAME" ]; then
    echo "Usage: $0 <domain_name> [admin_password]"
    echo "Example: $0 somecompany.local"
    exit 1
fi

# ============================================================
# STEP 5: EC2 installs and configures the samba DC
# ============================================================

echo "=== Installing Samba Domain Controller ==="
echo "Domain: $DOMAIN_NAME"
echo "Realm: $REALM"
echo "Admin Password: $ADMIN_PASSWORD"

# --- Set hostname ---
echo "Setting hostname..."
hostnamectl set-hostname "$HOSTNAME"

# --- Configure /etc/hosts ---
IP_ADDR=$(hostname -I | awk '{print $1}')
cat <<EOF >/etc/hosts
127.0.0.1   localhost
${IP_ADDR}  ${HOSTNAME} ${DOMAIN_NAME}
EOF

# --- Update system and install packages ---
echo "Updating and installing required packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y samba krb5-config winbind smbclient dnsutils acl net-tools

# --- Backup old Samba config ---
[ -f /etc/samba/smb.conf ] && mv /etc/samba/smb.conf /etc/samba/smb.conf.original

# --- Stop conflicting services ---
systemctl stop smbd nmbd winbind systemd-resolved || true
systemctl disable smbd nmbd winbind || true
systemctl unmask samba-ad-dc || true

# --- Provision Samba Domain Controller ---
echo "Provisioning Samba DC..."
samba-tool domain provision \
  --use-rfc2307 \
  --realm="${REALM}" \
  --domain="${REALM%%.*}" \
  --server-role=dc \
  --dns-backend=SAMBA_INTERNAL \
  --adminpass="${ADMIN_PASSWORD}" \
  --option="interfaces=lo eth0" \
  --option="bind interfaces only=yes"

# --- Copy Kerberos config ---
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf

# --- Enable Samba AD DC service ---
systemctl enable --now samba-ad-dc

# --- Configure DNS resolver ---
echo "Configuring DNS resolver..."
rm -f /etc/resolv.conf
cat <<EOF >/etc/resolv.conf
nameserver 127.0.0.1
domain ${DOMAIN_NAME}
EOF

# --- Done ---
echo "✅ Samba Domain Controller setup complete!"
echo "Hostname: ${HOSTNAME}"
echo "IP Address: ${IP_ADDR}"
echo "Realm: ${REALM}"
echo "Administrator Password: ${ADMIN_PASSWORD}"

systemctl status samba-ad-dc --no-pager

# ============================================================
# STEP 6: Backend server does a check on the EC2 instance
#         to make sure the installation process is completed
# ============================================================

echo ""
echo "=== Running Verification Checks ==="

# Check 1: Service is active
echo -n "Checking Samba service status... "
if systemctl is-active --quiet samba-ad-dc; then
    echo "✅ Active"
else
    echo "❌ Failed - service not active"
    exit 1
fi

# Check 2: DNS is responding
echo -n "Checking DNS resolution... "
if dig @127.0.0.1 localhost +short > /dev/null 2>&1; then
    echo "✅ Working"
else
    echo "❌ Failed - DNS not responding"
    exit 1
fi

# Check 3: Domain level
echo -n "Checking domain provision... "
if samba-tool domain level show > /dev/null 2>&1; then
    echo "✅ Verified"
else
    echo "❌ Failed - domain not properly provisioned"
    exit 1
fi

echo ""
echo "✅ All verification checks passed!"
echo "Domain Controller is ready for use."
