# Set DNS to samba and join domain
# Make sure that dynamic variables are capitalized and set by the docker_provisioner
# This script should serve as a template and its variables should be set at by the API server

$adapterName = "Ethernet"
$dnsServers = @("SAMBA_IP")
$domainName = "DOMAIN_NAME"
$adminUser = "ADMIN_USER"
$adminPass = "ADMIN_PASS"

# In our docker_provisioner we must make sure to set the DOMAIN_NAME, SAMBA_IP, ADMIN_USER and ADMIN_PASS

Write-Host "Starting workstation setup"

try {
	Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses $dnsServers
	Write-Host "DNS set to $($dnsServers -join ', ')"
} catch {
	Write-Host "Failed to set DNS: $_"
}


try {
	$password = ConvertTo-SecureString $adminPass -AsPlainText -Force
	$cred = New-Object System.Management.Automation.PSCredential ("$adminUser", $password)

	$postJoinCommand = "powershell.exe -ExecutionPolicy Bypass -Command ""Add-LocalGroupMember -Group 'Remote Desktop Users' -Member 'DOMAIN_NAME\Domain Users'"""

	$registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
	Set-ItemProperty -Path $registryPath -Name "AddDomainUsersToRDP" -Value $postJoinCommand

	Add-Computer -DomainName $domainName -Credential $cred -Force -Restart

} catch {
	Write-Host "Failed to join domain: $_"
}

