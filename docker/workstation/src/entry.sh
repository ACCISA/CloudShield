#!/usr/bin/env bash

set -Eeuo pipefail

: "${APP:="Windows"}"
: "${PLATFORM:="x64"}"
: "${BOOT_MODE:="windows"}"
: "${SUPPORT:="https://github.com/dockur/windows"}"

cd /run

# Use E1000 NIC model instead of VirtIO for better Windows 11 compatibility
: "${ADAPTER:="e1000"}"

. start.sh      # Startup hook
. utils.sh      # Load functions
. reset.sh      # Initialize system
. server.sh     # Start webserver
. define.sh     # Define versions
. mido.sh       # Download Windows
. install.sh    # Run installation
. disk.sh       # Initialize disks
. display.sh    # Initialize graphics
. network.sh    # Initialize network
. samba.sh      # Configure samba
. boot.sh       # Configure boot
. proc.sh       # Initialize processor
. power.sh      # Configure shutdown
. memory.sh     # Check available memory
. config.sh     # Configure arguments
. finish.sh     # Finish initialization

trap - ERR

version=$(qemu-system-x86_64 --version | head -n 1 | cut -d '(' -f 1 | awk '{ print $NF }')
info "Booting ${APP}${BOOT_DESC} using QEMU v$version..."

iptables -t nat -A PREROUTING -i eth0 -p tcp -m multiport --dports 3389,5900,7100,8006 -j ACCEPT
iptables -t nat -A PREROUTING -i eth0 -p tcp -j DNAT --to-destination 10.0.2.15
iptables -t nat -A PREROUTING -i eth0 -p udp -j DNAT --to-destination 10.0.2.15
iptables -t nat -A PREROUTING -i eth0 -p icmp -j DNAT --to-destination 10.0.2.15
iptables -t nat -A POSTROUTING -s 172.30.0.14 -d 172.23.0.0/24 -j MASQUERADE
iptables -t nat -A POSTROUTING -j MASQUERADE

{ qemu-system-x86_64 ${ARGS:+ $ARGS} >"$QEMU_OUT" 2>"$QEMU_LOG"; rc=$?; } || :
(( rc != 0 )) && error "$(<"$QEMU_LOG")" && exit 15

terminal
( sleep 30; boot ) &
tail -fn +0 "$QEMU_LOG" --pid=$$ 2>/dev/null &
cat "$QEMU_TERM" 2> /dev/null | tee "$QEMU_PTY" | \
sed -u -e 's/\x1B\[[=0-9;]*[a-z]//gi' \
-e 's/\x1B\x63//g' -e 's/\x1B\[[=?]7l//g' \
-e '/^$/d' -e 's/\x44\x53\x73//g' \
-e 's/failed to load Boot/skipped Boot/g' \
-e 's/0): Not Found/0)/g' & wait $! || :

sleep 1 & wait $!
[ ! -f "$QEMU_END" ] && finish 0
