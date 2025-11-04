#!/bin/bash
#
# verify_roaming_profiles.sh
# 
# Verification script to check if roaming profiles are properly configured
# This script should be run on the Samba Domain Controller
#
# Usage:
#   ./verify_roaming_profiles.sh
#

echo "=== CloudShield Roaming Profiles Verification ==="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
WARN=0
FAIL=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            ((PASS++))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            ((WARN++))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            ((FAIL++))
            ;;
    esac
}

# Check 1: Verify /home/profiles directory exists
echo "Checking profiles directory..."
if [ -d "/home/profiles" ]; then
    perms=$(stat -c "%a" /home/profiles 2>/dev/null || stat -f "%Lp" /home/profiles 2>/dev/null)
    if [ "$perms" = "1777" ]; then
        print_status "PASS" "/home/profiles exists with correct permissions (1777)"
    else
        print_status "WARN" "/home/profiles exists but has permissions $perms (expected 1777)"
    fi
else
    print_status "FAIL" "/home/profiles directory does not exist"
fi

echo ""
echo "Checking Samba configuration..."

# Check 2: Verify smb.conf has profiles share
if grep -q "^\[profiles\]" /etc/samba/smb.conf; then
    print_status "PASS" "[profiles] share defined in smb.conf"
    
    # Check individual settings
    if grep -A 10 "^\[profiles\]" /etc/samba/smb.conf | grep -q "path = /home/profiles"; then
        print_status "PASS" "Profile path correctly set to /home/profiles"
    else
        print_status "FAIL" "Profile path not set correctly"
    fi
    
    if grep -A 10 "^\[profiles\]" /etc/samba/smb.conf | grep -q "browseable = no"; then
        print_status "PASS" "Share is not browseable (security best practice)"
    else
        print_status "WARN" "Share may be browseable"
    fi
    
    if grep -A 10 "^\[profiles\]" /etc/samba/smb.conf | grep -q "profile acls = yes"; then
        print_status "PASS" "Profile ACLs enabled"
    else
        print_status "FAIL" "Profile ACLs not enabled"
    fi
    
    if grep -A 10 "^\[profiles\]" /etc/samba/smb.conf | grep -q "csc policy = disable"; then
        print_status "PASS" "Client-side caching disabled"
    else
        print_status "WARN" "Client-side caching may be enabled"
    fi
else
    print_status "FAIL" "[profiles] share not found in smb.conf"
fi

echo ""
echo "Checking Samba service..."

# Check 3: Verify Samba is running
if systemctl is-active --quiet samba-ad-dc; then
    print_status "PASS" "Samba AD DC service is active"
else
    print_status "FAIL" "Samba AD DC service is not running"
fi

echo ""
echo "Checking share accessibility..."

# Check 4: Verify profiles share is accessible
if smbclient -L localhost -U% 2>/dev/null | grep -q "profiles"; then
    print_status "PASS" "Profiles share is accessible via SMB"
else
    print_status "FAIL" "Profiles share is not accessible via SMB"
fi

echo ""
echo "Checking user configurations..."

# Check 5: Check if any users have roaming profiles configured
DOMAIN=$(samba-tool domain info $(hostname -I | awk '{print $1}') 2>/dev/null | grep "Domain" | head -1 | awk '{print $3}')
if [ -n "$DOMAIN" ]; then
    print_status "PASS" "Domain detected: $DOMAIN"
    
    # Count users with profile paths set
    USERS_WITH_PROFILES=0
    TOTAL_USERS=0
    
    for user in $(samba-tool user list 2>/dev/null | grep -v "^Administrator$\|^Guest$\|^krbtgt$"); do
        ((TOTAL_USERS++))
        # Check if user has profilePath set
        if ldbsearch -H /var/lib/samba/private/sam.ldb "sAMAccountName=$user" profilePath 2>/dev/null | grep -q "profilePath:"; then
            ((USERS_WITH_PROFILES++))
        fi
    done
    
    if [ $USERS_WITH_PROFILES -gt 0 ]; then
        print_status "PASS" "$USERS_WITH_PROFILES out of $TOTAL_USERS regular users have roaming profiles configured"
    elif [ $TOTAL_USERS -gt 0 ]; then
        print_status "WARN" "No users have roaming profiles configured yet (0/$TOTAL_USERS)"
        echo "         Run configure_user_profile.sh or configure_all_roaming_profiles.sh to set up users"
    else
        print_status "WARN" "No regular user accounts found in domain"
    fi
else
    print_status "FAIL" "Could not detect domain information"
fi

echo ""
echo "Checking network configuration..."

# Check 6: Verify hostname is set correctly
HOSTNAME=$(hostname -f)
if [[ $HOSTNAME == dc.*.local ]]; then
    print_status "PASS" "Domain controller hostname is correctly formatted: $HOSTNAME"
else
    print_status "WARN" "Hostname may not be correctly formatted: $HOSTNAME (expected dc.<domain>.local)"
fi

echo ""
echo "=== Summary ==="
echo -e "${GREEN}Passed: $PASS${NC}"
if [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARN${NC}"
fi
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}Failed: $FAIL${NC}"
fi

echo ""

if [ $FAIL -gt 0 ]; then
    echo "❌ Roaming profiles are NOT properly configured"
    echo "   Please review the failed checks above and consult Cloud/README.md for setup instructions"
    exit 1
elif [ $WARN -gt 0 ]; then
    echo "⚠️  Roaming profiles are configured but there are warnings"
    echo "   Review the warnings above - these may or may not require action"
    exit 0
else
    echo "✅ Roaming profiles are properly configured!"
    echo "   Users with roaming profiles will have their settings follow them across workstations"
    exit 0
fi
