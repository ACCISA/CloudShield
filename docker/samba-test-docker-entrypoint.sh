#!/bin/bash

# This is a minimal script that will provision a samba ad dc

# disable systemd
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# DC1 should be the host name of our samba ad dc
# Check if hostname is already set to avoid duplication in /etc/hosts
if ! grep -q "DC1.${realm_name_lwr}" /etc/hosts; then
    echo "172.23.0.10 DC1.${realm_name_lwr} DC1" | sudo tee -a /etc/hosts
fi
sudo hostnamectl set-hostname dc1

# --- [FIX] COMMENTED OUT HEAVY BUILD STEPS (From You) ---
# We assume the Dockerfile has already installed samba-ad-dc and dependencies.
# This saves ~20 minutes of boot time.

export DEBIAN_FRONTEND=noninteractive
# sudo apt update
# wget https://download.samba.org/pub/samba/stable/samba-4.18.5.tar.gz
# tar xf samba-4.18.5.tar.gz
# sudo samba-4.18.5/bootstrap/generated-dists/ubuntu2204/bootstrap.sh

# sudo apt-get update -y
# sudo apt-get install -y acl attr samba winbind libpam-winbind libnss-winbind krb5-config krb5-user dnsutils python3-setproctitle
# ---------------------------------------------

# Disable samba services that will prevent us from provisioning a samba ad dc
systemctl stop smbd nmbd winbind
systemctl mask smbd nmbd winbind
systemctl disable smbd nmbd winbind

# --- [FIX] PREVENT DATA LOSS ON RESTART (From You) ---
# Only provision if the config file doesn't exist. 

if [ ! -f /etc/samba/smb.conf ]; then
    echo "Provisioning new Samba AD DC..."
    
    # Remove default config if it exists but hasn't been provisioned
    sudo rm -f /etc/samba/smb.conf

    # Derive NetBIOS name (From Main - Keeping this new logic)
    netbios_name=$(echo "${domain_name%%.*}" | tr '[:lower:]' '[:upper:]')

    # Provision (Using Main's logic with netbios_name)
    sudo samba-tool domain provision --server-role=dc --use-rfc2307 --dns-backend=SAMBA_INTERNAL --realm=${realm_name} --domain=${netbios_name} --adminpass=${dc_admin_password} --option="interfaces=lo eth0" --option="bind interfaces only=yes"

    sudo tee /etc/resolv.conf > /dev/null <<EOF
search ${realm_name_lwr}
nameserver 172.23.0.10
EOF

    # Create Service File (Only need to do this once)
    sudo tee /etc/systemd/system/samba-ad-dc.service > /dev/null <<EOF
[Unit]
Description=Samba Active Directory Domain Controller
After=network.target remote-fs.target nss-lookup.target

[Service]
Type=forking
ExecStart=/usr/sbin/samba -D
PIDFile=/run/samba/samba.pid
ExecReload=/bin/kill -HUP \$MAINPID

[Install]
WantedBy=multi-user.target
EOF

else
    echo "Samba AD DC already provisioned. Skipping..."
fi
# ------------------------------------------

systemctl daemon-reload
systemctl enable samba-ad-dc
systemctl start samba-ad-dc

# Wait for Samba to be ready
sleep 5

# Create Groups (Using your robust '|| true' version)
sudo samba-tool group add LinuxAdmins --gid-number=10005 --nis-domain=${domain_name} || true
sudo samba-tool group addmembers "Domain Admins" LinuxAdmins || true

# DNS entries (Using your robust '|| true' version)
samba-tool dns zonecreate localhost 0.0.99.in-addr.arpa -U Administrator --password=${dc_admin_password} || true
samba-tool dns add localhost 0.0.99.in-addr.arpa 1 PTR dc1.${realm_name_lwr} -U Administrator --password=${dc_admin_password} || true

systemctl enable cs_rpc
systemctl start cs_rpc