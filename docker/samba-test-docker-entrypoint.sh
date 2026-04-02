#!/bin/bash

# This is a minimal script that will provision a samba ad dc

# disable systemd
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# DC1 should be the host name of our samba ad dc
echo "172.23.0.10 DC1.${realm_name_lwr} DC1" | sudo tee -a /etc/hosts
sudo hostnamectl set-hostname dc1

# Install samba dependencies (I got this from samba wiki)
export DEBIAN_FRONTEND=noninteractive
sudo apt update
wget https://download.samba.org/pub/samba/stable/samba-4.18.5.tar.gz
tar xf samba-4.18.5.tar.gz
sudo samba-4.18.5/bootstrap/generated-dists/ubuntu2204/bootstrap.sh

sudo apt-get update -y
sudo apt-get install -y acl attr samba winbind libpam-winbind libnss-winbind krb5-config krb5-user dnsutils python3-setproctitle

sudo rm /etc/samba/smb.conf

# Disable samba services that will prevent us from provisioning a samba ad dc
systemctl stop smbd nmbd winbind
systemctl mask smbd nmbd winbind
systemctl disable smbd nmbd winbind

# Derive NetBIOS name from domain (first label, uppercased, max 15 chars)
netbios_name=$(echo "${domain_name%%.*}" | tr '[:lower:]' '[:upper:]')

# Provision
sudo samba-tool domain provision --server-role=dc --use-rfc2307 --dns-backend=SAMBA_INTERNAL --realm=${realm_name} --domain=${netbios_name} --adminpass=${dc_admin_password} --option="interfaces=lo eth0" --option="bind interfaces only=yes"

sudo tee /etc/resolv.conf > /dev/null <<EOF
search ${realm_name_lwr}
nameserver 172.23.0.10
EOF

# add logon.bat logon script
sudo sed -i "/\[global\]/a \    logon script = logon.bat" /etc/samba/smb.conf

sudo mv /usr/local/bin/logon.bat /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
sudo mv /usr/local/bin/SetWallpaper.ps1 /var/lib/samba/sysvol/${realm_name_lwr}/scripts/SetWallpaper.ps1
sudo mv /usr/local/bin/MountDrives.ps1 /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1

sudo chmod --reference=/var/lib/samba/sysvol/${realm_name_lwr}/scripts /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
sudo chmod --reference=/var/lib/samba/sysvol/${realm_name_lwr}/scripts /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1

sudo chown root:"BUILTIN\administrators" /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
sudo chown root:"BUILTIN\administrators" /var/lib/samba/sysvol/${realm_name_lwr}/scripts/SetWallpaper.ps1
sudo chown root:"BUILTIN\administrators" /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1

sudo chmod +x /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
sudo chmod +x /var/lib/samba/sysvol/${realm_name_lwr}/scripts/SetWallpaper.ps1
sudo chmod +x /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1

chmod 755 /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
chmod 755 /var/lib/samba/sysvol/${realm_name_lwr}/scripts/SetWallpaper.ps1
chmod 755 /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1


# set SERVER with netbios name in logon.bat and MountDrives.ps1
sudo sed -i "s/SERVER/${netbios_name}/g" /var/lib/samba/sysvol/${realm_name_lwr}/scripts/logon.bat
sudo sed -i "s/SERVER/${realm_name}/g" /var/lib/samba/sysvol/${realm_name_lwr}/scripts/MountDrives.ps1

sudo samba-tool group add LinuxAdmins --gid-number=10005 --nis-domain=${domain_name}
sudo samba-tool group addmembers "Domain Admins" LinuxAdmins

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

systemctl enable samba-ad-dc
systemctl start samba-ad-dc

sleep 5

samba-tool dns zonecreate localhost 0.0.99.in-addr.arpa -U Administrator --password=${dc_admin_password}
samba-tool dns add localhost 0.0.99.in-addr.arpa 1 PTR dc1.${realm_name_lwr} -U Administrator --password=${dc_admin_password}
systemctl enable cs_rpc
systemctl start cs_rpc
