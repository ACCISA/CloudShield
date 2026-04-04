#!/bin/bash
set -euo pipefail

exec > /var/log/openvpn-userdata.log 2>&1
set -x

openvpn_address="${openvpn_address:-${OPENVPN_ADDRESS:-}}"
openvpn_protocol="${openvpn_protocol:-${OPENVPN_PROTOCOL:-tcp}}"
openvpn_dns="${openvpn_dns:-${OPENVPN_DNS:-}}"
openvpn_port="${openvpn_port:-${OPENVPN_PORT:-1194}}"
openvpn_client_name="${openvpn_client_name:-${OPENVPN_CLIENT_NAME:-client1}}"
openvpn_ip_choice="${openvpn_ip_choice:-${OPENVPN_IP_CHOICE:-1}}"
openvpn_public_address="${openvpn_public_address:-${OPENVPN_PUBLIC_ADDRESS:-}}"
org_subnet_cidr="${org_subnet_cidr:-${ORG_SUBNET_CIDR:-}}"
openvpn_force_hosts="${openvpn_force_hosts:-${OPENVPN_FORCE_HOSTS:-}}"
openvpn_force_routes="${openvpn_force_routes:-${OPENVPN_FORCE_ROUTES:-}}"

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

if [ -z "${openvpn_public_address}" ]; then
  openvpn_public_address="${openvpn_address}"
fi

if [ -z "${openvpn_dns}" ] && [ -n "${org_net}" ] && [ "${org_prefix}" = "24" ]; then
  openvpn_dns="$(echo "${org_net}" | awk -F. '{print $1"."$2"."$3".10"}')"
fi

MARKER="/etc/openvpn/server/.cloudshield_installed"
INSTALLER="/opt/openvpn-install.sh"
AUTO="/opt/openvpn-auto-install.exp"
SERVER_CONF="/etc/openvpn/server/server.conf"

ensure_split_tunnel() {
  [ -f "${SERVER_CONF}" ] || return 0
  sed -i '/^[[:space:]]*push "redirect-gateway def1.*"[[:space:]]*$/d' "${SERVER_CONF}" || true
}

cidr_to_mask() {
  local prefix="$1"
  if ! [[ "${prefix}" =~ ^[0-9]+$ ]] || [ "${prefix}" -lt 0 ] || [ "${prefix}" -gt 32 ]; then
    return 1
  fi
  local mask
  if [ "${prefix}" -eq 0 ]; then
    mask=0
  else
    mask=$(( (0xffffffff << (32 - prefix)) & 0xffffffff ))
  fi
  printf '%d.%d.%d.%d' \
    $(( (mask >> 24) & 255 )) \
    $(( (mask >> 16) & 255 )) \
    $(( (mask >> 8) & 255 )) \
    $(( mask & 255 ))
}

push_route_once() {
  local net="$1"
  local mask="$2"
  [ -n "${net}" ] || return 0
  [ -n "${mask}" ] || return 0
  grep -qE "push \"route ${net} ${mask}\"" "${SERVER_CONF}" \
    || echo "push \"route ${net} ${mask}\"" >> "${SERVER_CONF}"
}

ensure_org_route_and_dns() {
  [ -f "${SERVER_CONF}" ] || return 0

  local route_net=""
  local route_prefix=""
  local route_mask=""

  if [ -n "${org_subnet_cidr}" ] && [[ "${org_subnet_cidr}" == */* ]]; then
    route_net="${org_subnet_cidr%/*}"
    route_prefix="${org_subnet_cidr#*/}"
  elif [ -n "${org_net}" ] && [ -n "${org_prefix}" ]; then
    route_net="${org_net}"
    route_prefix="${org_prefix}"
  fi

  if [ -n "${route_net}" ] && [ -n "${route_prefix}" ]; then
    route_mask="$(cidr_to_mask "${route_prefix}" || true)"
    if [ -n "${route_mask}" ]; then
      push_route_once "${route_net}" "${route_mask}"
    fi
  fi

  if [ -n "${openvpn_dns}" ]; then
    # Force the DNS/Samba host itself through the tunnel using a more-specific /32 route.
    push_route_once "${openvpn_dns}" "255.255.255.255"
  fi

  if [ -n "${openvpn_force_hosts}" ]; then
    for host_ip in ${openvpn_force_hosts//,/ }; do
      [ -n "${host_ip}" ] || continue
      push_route_once "${host_ip}" "255.255.255.255"
    done
  fi

  if [ -n "${openvpn_force_routes}" ]; then
    for cidr in ${openvpn_force_routes//,/ }; do
      [ -n "${cidr}" ] || continue
      if [[ "${cidr}" != */* ]]; then
        continue
      fi
      local extra_net="${cidr%/*}"
      local extra_prefix="${cidr#*/}"
      local extra_mask
      extra_mask="$(cidr_to_mask "${extra_prefix}" || true)"
      if [ -n "${extra_mask}" ]; then
        push_route_once "${extra_net}" "${extra_mask}"
      fi
    done
  fi

  if [ -n "${openvpn_dns}" ]; then
    grep -qE "push \"dhcp-option DNS ${openvpn_dns}\"" "${SERVER_CONF}" \
      || echo "push \"dhcp-option DNS ${openvpn_dns}\"" >> "${SERVER_CONF}"
  fi
}

ensure_client_remote_endpoint() {
  local remote_host="${openvpn_public_address:-${openvpn_address}}"
  local remote_port="${openvpn_port}"
  [ -n "${remote_host}" ] || return 0

  if [ -f /etc/openvpn/server/client-common.txt ]; then
    if grep -qE '^remote[[:space:]]+' /etc/openvpn/server/client-common.txt; then
      sed -i "s|^remote[[:space:]].*|remote ${remote_host} ${remote_port}|" /etc/openvpn/server/client-common.txt || true
    else
      printf '\nremote %s %s\n' "${remote_host}" "${remote_port}" >> /etc/openvpn/server/client-common.txt
    fi
  fi

  for ovpn_file in /root/*.ovpn /home/*/*.ovpn /etc/openvpn/server/*.ovpn; do
    [ -f "${ovpn_file}" ] || continue
    if grep -qE '^remote[[:space:]]+' "${ovpn_file}"; then
      sed -i "s|^remote[[:space:]].*|remote ${remote_host} ${remote_port}|" "${ovpn_file}" || true
    fi
  done
}

if [ -f "${MARKER}" ] && [ -f "${SERVER_CONF}" ]; then
  ensure_client_remote_endpoint
  ensure_split_tunnel
  ensure_org_route_and_dns

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
  ensure_client_remote_endpoint
  ensure_split_tunnel
  ensure_org_route_and_dns
fi

sysctl -w net.ipv4.ip_forward=1 || true
systemctl restart openvpn-server@server || timeout 20 systemctl restart openvpn || true
systemctl enable cs_rpc
systemctl start cs_rpc
touch "${MARKER}"

