#!/bin/bash
systemctl start cs_rpc

exec > /home/ubuntu/openvpn-create-client.log 2>&1
set -x
if [ -f "/home/ubuntu/${1}.ovpn" ]; then
    echo "Client configuration already exists!"
    exit 0
fi
if [ ! -f "/home/ubuntu/openvpn-install.sh" ]; then
    echo "OpenVPN installation script not found!"
    exit 1
fi
if [ ! -f "/home/ubuntu/openvpn-create-client-expect.sh" ]; then
touch /home/ubuntu/openvpn-create-client-expect.sh
cat > /home/ubuntu/openvpn-create-client-expect.sh <<EOF
#!/usr/bin/expect
set timeout 120
set OPENVPN_CLIENT_NAME "${1}"
spawn sudo /home/ubuntu/openvpn-install.sh
expect "Option: "
send "1\r"
expect "Name: "
send "\$OPENVPN_CLIENT_NAME\r"
expect eof
EOF
    
fi
sudo chmod +x /home/ubuntu/openvpn-create-client-expect.sh
/home/ubuntu/openvpn-create-client-expect.sh "${1}"