#!/bin/bash
#
# configure_user_profile.sh
# 
# Helper script to configure roaming profiles for domain users
# This script should be run on the Samba Domain Controller
#
# Usage:
#   ./configure_user_profile.sh <username>
#   ./configure_user_profile.sh john.doe
#

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <username>"
    echo "Example: $0 john.doe"
    exit 1
fi

USERNAME="$1"

# Get domain information
DOMAIN=$(samba-tool domain info $(hostname -I | awk '{print $1}') | grep "Domain" | head -1 | awk '{print $3}')
DC_HOSTNAME=$(hostname -f)

if [ -z "$DOMAIN" ]; then
    echo "Error: Could not determine domain name"
    exit 1
fi

echo "Configuring roaming profile for user: $USERNAME"
echo "Domain: $DOMAIN"
echo "DC Hostname: $DC_HOSTNAME"

# Check if user exists
if ! samba-tool user list | grep -q "^${USERNAME}$"; then
    echo "Error: User $USERNAME does not exist in Active Directory"
    echo "Available users:"
    samba-tool user list
    exit 1
fi

# Set the roaming profile path
PROFILE_PATH="\\\\${DC_HOSTNAME}\\profiles\\${USERNAME}"

echo "Setting profile path to: $PROFILE_PATH"

# Note: Samba-tool doesn't have a direct command to set profile path
# We need to use ldbedit to modify the user's profilePath attribute
echo "Updating user profile path in Active Directory..."

# Create temporary LDIF file
TEMP_LDIF=$(mktemp)
cat > "$TEMP_LDIF" <<EOF
dn: CN=${USERNAME},CN=Users,DC=${DOMAIN//./,DC=}
changetype: modify
replace: profilePath
profilePath: ${PROFILE_PATH}
EOF

# Apply the change
ldbmodify -H /var/lib/samba/private/sam.ldb "$TEMP_LDIF"

# Clean up
rm -f "$TEMP_LDIF"

echo ""
echo "✓ Roaming profile configured successfully!"
echo ""
echo "Profile details:"
echo "  User: $USERNAME"
echo "  Profile path: $PROFILE_PATH"
echo "  Local storage: /home/profiles/${USERNAME}"
echo ""
echo "The user's profile will be stored on the domain controller and will"
echo "follow them to any workstation they log into."
echo ""
echo "Note: The profile directory will be created automatically on first login."
