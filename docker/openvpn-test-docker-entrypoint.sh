#!/bin/bash
systemctl start cs_rpc


exec > /home/ubuntu/openvpn-userdata.log 2>&1
set -x
sudo apt update -y
wget https://git.io/vpn -O /home/ubuntu/openvpn-install.sh
sed -i '/read -p "DNS server/c\dns="1"' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Name: " unsanitized_client/unsanitized_client=client1/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Option: " option/option=1/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Public IPv4 address \/ hostname \[\$get_public_ip\]: " public_ip/public_ip=$get_public_ip/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Protocol \[1\]: " protocol/protocol=1/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Port \[1194\]: " port/port=1194/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "DNS server \[1\]: " dns/dns=1/' /home/ubuntu/openvpn-install.sh
sed -i 's/read -p "Name \[client\]: " unsanitized_client/unsanitized_client=client1/' /home/ubuntu/openvpn-install.sh
sed -i '/read -n1 -r -p "Press any key to continue..."/d' /home/ubuntu/openvpn-install.sh
sudo chmod +x /home/ubuntu/openvpn-install.sh
sudo apt install -y expect
sudo touch /home/ubuntu/openvpn-auto-install.sh
sudo cat > /home/ubuntu/openvpn-auto-install.sh <<EOF
#!/usr/bin/expect
set timeout 120
set OPENVPN_ADDRESS "${openvpn_address}"

set OPENVPN_PROTOCOL "${openvpn_protocol}"
set OPENVPN_DNS "${openvpn_dns}"
set OPENVPN_PORT "${openvpn_port}"
set OPENVPN_CLIENT_NAME "${openvpn_client_name}"
spawn sudo /home/ubuntu/openvpn-install.sh
expect -re {Public IPv4 address / hostname \\[.*\\]: }
if { [string length \$OPENVPN_ADDRESS] == 0 } {
    send "\r"
} else {
    send "\$OPENVPN_ADDRESS\r"
}
expect -re {Protocol.*\[1\]: }
if {\$OPENVPN_PROTOCOL eq "udp"} {
    send "1\r"
} else {
    send "2\r"
}
expect -re {Port \[.*\]: }
send "\$OPENVPN_PORT\r"
expect -re {DNS server.*\[1\]: }
if { [string length \$OPENVPN_DNS] == 0 } {
    send "1\r"
} else {
    send "8\r"
    expect -re {DNS.*servers: }
    send "\$OPENVPN_DNS\r"
}
expect ".*Name \[client\]:.*"
send "\$OPENVPN_CLIENT_NAME\r"
expect "Press any key to continue"
send "\r"
expect eof

EOF
sudo chmod +x /home/ubuntu/openvpn-auto-install.sh
/home/ubuntu/openvpn-auto-install.sh
%{ for route in openvpn_routes ~}
echo "push \"route ${route}\"" | sudo tee -a /etc/openvpn/server/server.conf
%{ endfor ~}
sudo sysctl -w net.ipv4.ip_forward=1
echo "Script Completed" >> /home/ubuntu/openvpn-userdata.log
