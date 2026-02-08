#!/bin/bash
set -e

# Provision a Samba AD DC.  Executed once on first boot via
# the samba-provision.service systemd oneshot unit.

PROVISION_STAMP="/var/lib/samba/.provisioned"

# ------------------------------------------------------------------
# Idempotency: skip if already provisioned (container restart)
# ------------------------------------------------------------------
if [ -f "$PROVISION_STAMP" ]; then
    echo "Samba AD DC already provisioned – skipping."
    # Still make sure services are running after a restart
    systemctl start samba-ad-dc  || true
    systemctl start cs_rpc       || true
    exit 0
fi

# ------------------------------------------------------------------
# Validate required env vars
# ------------------------------------------------------------------
for var in domain_name dc_admin_password realm_name realm_name_lwr; do
    if [ -z "${!var}" ]; then
        echo "ERROR: required env var '$var' is not set" >&2
        exit 1
    fi
done

echo "=== Provisioning Samba AD DC ==="
echo "  realm       = ${realm_name}"
echo "  domain      = ${domain_name}"
echo "  realm (lwr) = ${realm_name_lwr}"

# Derive NetBIOS name from domain (first label, uppercased, max 15 chars)
netbios_name=$(echo "${domain_name%%.*}" | tr '[:lower:]' '[:upper:]')
echo "  netbios     = ${netbios_name}"

# ------------------------------------------------------------------
# 1. Disable systemd-resolved so Samba can own DNS on port 53
# ------------------------------------------------------------------
systemctl stop systemd-resolved  2>/dev/null || true
systemctl disable systemd-resolved 2>/dev/null || true

# ------------------------------------------------------------------
# 2. Set hostname
# ------------------------------------------------------------------
echo "172.23.0.10 DC1.${realm_name_lwr} DC1" | tee -a /etc/hosts
hostnamectl set-hostname dc1 2>/dev/null || echo "WARNING: hostnamectl failed (non-fatal in container)"

# ------------------------------------------------------------------
# 3. Remove default smb.conf (conflicts with AD DC provisioning)
# ------------------------------------------------------------------
rm -f /etc/samba/smb.conf

# ------------------------------------------------------------------
# 4. Provision the AD domain controller
#    (samba-ad-dc & samba-ad-provision already installed via apt)
# ------------------------------------------------------------------
samba-tool domain provision \
    --server-role=dc \
    --use-rfc2307 \
    --dns-backend=SAMBA_INTERNAL \
    --realm="${realm_name}" \
    --domain="${netbios_name}" \
    --adminpass="${dc_admin_password}" \
    --option="interfaces=lo eth0" \
    --option="bind interfaces only=yes"

# ------------------------------------------------------------------
# 5. Point DNS at ourselves
# ------------------------------------------------------------------
tee /etc/resolv.conf > /dev/null <<EOF
search ${realm_name_lwr}
nameserver 172.23.0.10
EOF

# ------------------------------------------------------------------
# 6. Create convenience groups
# ------------------------------------------------------------------
samba-tool group add LinuxAdmins \
    --gid-number=10005 --nis-domain="${netbios_name}" || true
samba-tool group addmembers "Domain Admins" LinuxAdmins || true

# ------------------------------------------------------------------
# 7. Create & start the Samba AD DC systemd service
# ------------------------------------------------------------------
tee /etc/systemd/system/samba-ad-dc.service > /dev/null <<'UNIT'
[Unit]
Description=Samba Active Directory Domain Controller
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
ExecStart=/usr/sbin/samba -D
PIDFile=/run/samba/samba.pid
ExecReload=/bin/kill -HUP $MAINPID

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable samba-ad-dc
systemctl start samba-ad-dc

# ------------------------------------------------------------------
# 8. Wait for Samba, then set up reverse DNS zone
# ------------------------------------------------------------------
sleep 5

samba-tool dns zonecreate localhost 0.0.99.in-addr.arpa \
    -U Administrator --password="${dc_admin_password}" || true
samba-tool dns add localhost 0.0.99.in-addr.arpa 1 PTR \
    "dc1.${realm_name_lwr}" \
    -U Administrator --password="${dc_admin_password}" || true

# ------------------------------------------------------------------
# 9. Enable the CloudShield gRPC node service and start it
# ------------------------------------------------------------------
systemctl enable cs_rpc
systemctl start cs_rpc &

# ------------------------------------------------------------------
# Mark as provisioned
# ------------------------------------------------------------------
touch "$PROVISION_STAMP"
echo "=== Samba AD DC provisioning complete ==="
