## Windows installation automation

This folder is Windows-specific (`C:\OEM` during OOBE). For Linux/macOS host
startup installers, use:

- `cloudshield/Agent/installers/linux/install_cloudshield_agent_linux.sh`
- `cloudshield/Agent/installers/macos/install_cloudshield_agent_macos.sh`

We can create as many powershell scripts to automate installation. As long as they end with .ps1 they will get executed when the windows image is installed. We can use this mechanism to customize
our windows installations. For example, setup_workstation.ps1 will set the DNS server and will join the samba domain. Other usages could be a script to set the background image or automatically install an application.

Make sure to test your scripts locally or on in a vm.
