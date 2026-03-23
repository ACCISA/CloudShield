#!/bin/bash
set -euo pipefail

exec > /var/log/openvpn-userdata.log 2>&1
set -x

openvpn_address="${openvpn_address:-${OPENVPN_ADDRESS:-}}"
openvpn_protocol="${openvpn_protocol:-${OPENVPN_PROTOCOL:-udp}}"
openvpn_dns="${openvpn_dns:-${OPENVPN_DNS:-}}"
openvpn_port="${openvpn_port:-${OPENVPN_PORT:-1194}}"
openvpn_client_name="${openvpn_client_name:-${OPENVPN_CLIENT_NAME:-client1}}"
openvpn_ip_choice="${openvpn_ip_choice:-${OPENVPN_IP_CHOICE:-1}}"
openvpn_public_address="${openvpn_public_address:-${OPENVPN_PUBLIC_ADDRESS:-}}"

eth0_ip="$(ip -4 -o addr show dev eth0 | awk '{split($4,a,"/"); print a[1]; exit}' || true)"
org_cidr="$(ip -4 route show dev eth0 | awk '/proto kernel/ && $1 ~ /^[0-9]+\./ {print $1; exit}' || true)"
org_net="${org_cidr%/*}"
org_prefix="${org_cidr##*/}"

if [ -z "${org_net}" ] && [ -n "${eth0_ip}" ]; then
  org_net="$(echo "${eth0_ip}" | awk -F. '{print $1"."$2"."$3".0"}')"
  org_prefix="24"
fi

if [ -z "${openvpn_address}" ]; then
  openvpn_address="${eth0_ip}"
fi

if [ -z "${openvpn_dns}" ] && [ -n "${org_net}" ] && [ "${org_prefix}" = "24" ]; then
  openvpn_dns="$(echo "${org_net}" | awk -F. '{print $1"."$2"."$3".10"}')"
fi

MARKER="/etc/openvpn/server/.cloudshield_installed"
INSTALLER="/opt/openvpn-install.sh"
AUTO="/opt/openvpn-auto-install.exp"
SERVER_CONF="/etc/openvpn/server/server.conf"

if [ -f "${MARKER}" ] && [ -f "${SERVER_CONF}" ]; then
  if [ -n "${org_net}" ] && [ "${org_prefix}" = "24" ]; then
    grep -qE "push \"route ${org_net} 255\.255\.255\.0\"" "${SERVER_CONF}" \
      || echo "push \"route ${org_net} 255.255.255.0\"" >> "${SERVER_CONF}"
  fi

  if [ -n "${openvpn_dns}" ]; then
    grep -qE "push \"dhcp-option DNS ${openvpn_dns}\"" "${SERVER_CONF}" \
      || echo "push \"dhcp-option DNS ${openvpn_dns}\"" >> "${SERVER_CONF}"
  fi

  sysctl -w net.ipv4.ip_forward=1 || true
  timeout 20 systemctl restart openvpn-server@server || timeout 20 systemctl restart openvpn || true
  exit 0
fi

export DEBIAN_FRONTEND=noninteractive

echo "Aaaaa" > /ddd
apt-get update -y
apt-get install -y --no-install-recommends wget expect iproute2 iptables ca-certificates
echo "Aaaaa" > /eee

wget -q --tries=3 --timeout=10 https://git.io/vpn -O "${INSTALLER}"
chmod +x "${INSTALLER}"

sed -i 's/read -p "Option: " option/option=1/' "${INSTALLER}" || true
sed -i 's/read -p "Protocol \[1\]: " protocol/protocol=1/' "${INSTALLER}" || true
sed -i 's/read -p "Port \[1194\]: " port/port='"${openvpn_port}"'/' "${INSTALLER}" || true
sed -i 's/read -p "DNS server \[1\]: " dns/dns=1/' "${INSTALLER}" || true
sed -i 's/read -p "Name \[client\]: " unsanitized_client/unsanitized_client='"${openvpn_client_name}"'/' "${INSTALLER}" || true
sed -i '/read -n1 -r -p "Press any key to continue..."/d' "${INSTALLER}" || true

cat > "${AUTO}" <<EOF
#!/usr/bin/expect -f
set timeout 600
set env(TERM) "dumb"

set OPENVPN_IP_CHOICE "${openvpn_ip_choice}"
set OPENVPN_PUBLIC_ADDRESS "${openvpn_public_address}"
set OPENVPN_PROTOCOL "${openvpn_protocol}"
set OPENVPN_PORT "${openvpn_port}"
set OPENVPN_CLIENT_NAME "${openvpn_client_name}"
set OPENVPN_DNS "${openvpn_dns}"

spawn ${INSTALLER}

while {1} {
  expect {
    -re {Which IPv4 address should be used\\?} { exp_continue }
    -re {IPv4 address \\[[0-9]+\\]:} {
      if {[string length \$OPENVPN_IP_CHOICE] == 0} { send "\r" } else { send -- "\$OPENVPN_IP_CHOICE\r" }
      exp_continue
    }
    -re {This server is behind NAT\\..*} { exp_continue }
    -re {Public IPv4 address / hostname.*:} {
      if {[string length \$OPENVPN_PUBLIC_ADDRESS] == 0} { send "\r" } else { send -- "\$OPENVPN_PUBLIC_ADDRESS\r" }
      exp_continue
    }
    -re {Protocol.*\\[1\\]:} {
      if {\$OPENVPN_PROTOCOL eq "udp"} { send "1\r" } else { send "2\r" }
      exp_continue
    }
    -re {Port.*\\[[0-9]+\\]:} { send -- "\$OPENVPN_PORT\r"; exp_continue }
    -re {DNS server.*\\[1\\]:} {
      send "1\r"
      exp_continue
    }
    -re {Do you want to enable IPv6 support\\?.*\\[[yY/nN]+\\]:} { send "n\r"; exp_continue }
    -re {Do you want to enable compression\\?.*\\[[yY/nN]+\\]:} { send "n\r"; exp_continue }
    -re {Do you want to customize encryption settings\\?.*\\[[yY/nN]+\\]:} { send "n\r"; exp_continue }
    -re {Name.*\\[client\\].*:} { send -- "\$OPENVPN_CLIENT_NAME\r"; exp_continue }
    -re {Press any key to continue.*} { send "\r"; exp_continue }
    eof { break }
    timeout { exit 124 }
  }
}
EOF
chmod +x "${AUTO}"

timeout 900 "${AUTO}"

if [ -f "${SERVER_CONF}" ]; then
  if [ -n "${org_net}" ] && [ "${org_prefix}" = "24" ]; then
    grep -qE "push \"route ${org_net} 255\.255\.255\.0\"" "${SERVER_CONF}" \
      || echo "push \"route ${org_net} 255.255.255.0\"" >> "${SERVER_CONF}"
  fi

  if [ -n "${openvpn_dns}" ]; then
    grep -qE "push \"dhcp-option DNS ${openvpn_dns}\"" "${SERVER_CONF}" \
      || echo "push \"dhcp-option DNS ${openvpn_dns}\"" >> "${SERVER_CONF}"
  fi
fi

sysctl -w net.ipv4.ip_forward=1 || true
systemctl restart openvpn-server@server || timeout 20 systemctl restart openvpn || true
systemctl enable cs_rpc
systemctl start cs_rpc
touch "${MARKER}"


