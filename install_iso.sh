#!/bin/bash

# script to install the .iso for windows 11. This will be used to automatically build images for our workstations
# if this install command does not work contact me

FILENAME="win11x64.iso"
VOLUME_NAME="workstation_data"

echo "[+] Starting ISO setup for workstations"

if [ ! -f "$FILENAME" ]; then
	echo "[+] Downloading win11x64.iso from microsoft.com"

	wget "https://software-static.download.prss.microsoft.com/dbazure/888969d5-f34g-4e03-ac9d-1f9786c66749/26200.6584.250915-1905.25h2_ge_release_svc_refresh_CLIENT_CONSUMER_x64FRE_en-us.iso" -O $FILENAME --continue -q --timeout=30 --no-http-keep-alive --user-agent="Mozilla/5.0 (X11; Linux x86_64; rv:148.0) Gecko/20100101 Firefox/148.0" --show-progress --progress=dot:giga
else
    echo "[+] File $FILENAME already exists, skipping download."
fi

if [ -f "$FILENAME" ]; then
    echo "[+] File $FILENAME is present."
else
    echo "[!] Error: Download failed. File not found."
    exit 1
fi

echo "[+] ISO installation complete"
