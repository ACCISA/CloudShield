#!/bin/bash
apk add -X https://dl-cdn.alpinelinux.org/alpine/v3.16/main -u alpine-keys

/usr/local/bin/ovpn_genconfig -u udp://VPN.ANISS.LOCALZ

ls -la /etc/openvpn
ls -la /usr/local/bin/

sysctl net.ipv6.conf.default.forwarding=1

/usr/local/bin/ovpn_run
