# Roaming Profiles - Quick Reference Guide

## For Administrators

### What Are Roaming Profiles?
Roaming profiles store user settings and files on the network, allowing users to have the same desktop experience on any workstation they log into.

### Quick Setup (After Network Provisioning)

1. **SSH into the Samba Domain Controller**
   ```bash
   ssh ubuntu@<samba-dc-ip>
   ```

2. **Navigate to scripts directory**
   ```bash
   cd /path/to/scripts
   ```

3. **Configure roaming profiles for all users**
   ```bash
   sudo ./configure_all_roaming_profiles.sh
   ```
   
   OR for a single user:
   ```bash
   sudo ./configure_user_profile.sh username
   ```

4. **Verify the setup**
   ```bash
   sudo ./verify_roaming_profiles.sh
   ```

### Common Tasks

#### Add roaming profile for a new user
```bash
sudo ./configure_user_profile.sh newuser
```

#### Check if a user has roaming profile enabled
```bash
samba-tool user show username | grep profilePath
```

#### List all profile directories
```bash
ls -la /home/profiles/
```

#### Check profile share is accessible
```bash
smbclient -L localhost -U%
```

### Troubleshooting

#### User profile not loading
1. Verify user has profile path set:
   ```bash
   samba-tool user show username | grep profilePath
   ```

2. Check network share is accessible:
   ```bash
   smbclient //localhost/profiles -U username
   ```

3. Check directory permissions:
   ```bash
   ls -la /home/profiles/
   ```

4. Check Samba logs:
   ```bash
   tail -f /var/log/samba/log.smbd
   ```

#### Slow login/logout
- Check profile size: `du -sh /home/profiles/username`
- Profiles larger than 10GB may cause delays
- Consider implementing folder redirection for large folders

#### Profile corruption
1. Check disk space: `df -h`
2. Review Samba logs: `tail -100 /var/log/samba/log.smbd`
3. Backup and recreate profile if necessary

### Important Locations

| Item | Location |
|------|----------|
| Profile storage | `/home/profiles/` |
| Samba config | `/etc/samba/smb.conf` |
| Samba logs | `/var/log/samba/` |
| Setup log | `/home/ubuntu/samba-userdata.log` |
| Helper scripts | `/path/to/CloudShield/cloudshield/Cloud/templates/scripts/` |

### Network Paths

- **Profiles Share:** `\\dc.<domain>.local\profiles`
- **User Profile:** `\\dc.<domain>.local\profiles\<username>`

### Security Notes

- Each user can only access their own profile directory
- Profiles are transmitted using SMB3 encryption
- Windows ACLs provide additional security layer
- Share is hidden from network browsing

### Best Practices

1. **Configure profiles before users first login** - This ensures a smooth experience from the start
2. **Monitor profile sizes** - Large profiles slow down login/logout
3. **Regular backups** - Backup `/home/profiles/` regularly
4. **Disk space monitoring** - Ensure adequate space on the DC
5. **Use folder redirection** - For large folders like Documents and Desktop (future enhancement)

### User Communication

Inform users that:
- Their files and settings are stored on the network
- They can log into any workstation and have the same experience
- They should log out properly to ensure profile is saved
- Large files should be stored in designated network locations (not desktop)

### For More Information

See the full documentation: `cloudshield/Cloud/README.md`
