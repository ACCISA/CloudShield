#!/bin/bash
#
# configure_all_roaming_profiles.sh
# 
# Helper script to configure roaming profiles for all domain users
# This script should be run on the Samba Domain Controller
#
# Usage:
#   ./configure_all_roaming_profiles.sh
#

set -e

echo "=== Configuring Roaming Profiles for All Users ==="
echo ""

# Get domain information
DOMAIN=$(samba-tool domain info $(hostname -I | awk '{print $1}') | grep "Domain" | head -1 | awk '{print $3}')
DC_HOSTNAME=$(hostname -f)

if [ -z "$DOMAIN" ]; then
    echo "Error: Could not determine domain name"
    exit 1
fi

echo "Domain: $DOMAIN"
echo "DC Hostname: $DC_HOSTNAME"
echo ""

# Get all users (excluding built-in accounts)
USERS=$(samba-tool user list | grep -v "^Administrator$\|^Guest$\|^krbtgt$")

if [ -z "$USERS" ]; then
    echo "No regular users found in the domain."
    exit 0
fi

echo "Found the following users:"
echo "$USERS"
echo ""

read -p "Configure roaming profiles for all these users? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Configuring roaming profiles..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for USERNAME in $USERS; do
    echo -n "Configuring $USERNAME... "
    
    PROFILE_PATH="\\\\${DC_HOSTNAME}\\profiles\\${USERNAME}"
    
    # Create temporary LDIF file
    TEMP_LDIF=$(mktemp)
    cat > "$TEMP_LDIF" <<EOF
dn: CN=${USERNAME},CN=Users,DC=${DOMAIN//./,DC=}
changetype: modify
replace: profilePath
profilePath: ${PROFILE_PATH}
EOF
    
    # Apply the change
    if ldbmodify -H /var/lib/samba/private/sam.ldb "$TEMP_LDIF" 2>/dev/null; then
        echo "✓ Success"
        ((SUCCESS_COUNT++))
    else
        echo "✗ Failed"
        ((FAIL_COUNT++))
    fi
    
    # Clean up
    rm -f "$TEMP_LDIF"
done

echo ""
echo "=== Summary ==="
echo "Successfully configured: $SUCCESS_COUNT users"
echo "Failed: $FAIL_COUNT users"
echo ""
echo "Roaming profiles are now enabled. Users' profiles will be stored at:"
echo "/home/profiles/<username> on the domain controller"
echo ""
echo "Profiles will be created automatically when users first log in."
