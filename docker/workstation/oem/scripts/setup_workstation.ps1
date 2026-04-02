# Set DNS to samba and join domain
# Make sure that dynamic variables are capitalized and set by the docker_provisioner
# This script should serve as a template and its variables should be set at by the API server

$dnsServers = @("172.23.17.2")
$domainName = "tdinsurance.local"
$adminUser = "Administrator"
$adminPass = "&%!sH&%<Y#:uQ#KL"
$apiServerIp = "127.0.0.1"
$workstationId = "b60c1c1e34c6436e0d92016ac904821e24fdf80e0d809ce896c48043798d56ee"

# In our docker_provisioner we must make sure to set the tdinsurance.local, 172.23.17.2, Administrator and &%!sH&%<Y#:uQ#KL

# Dynamically detect the active network adapter instead of hardcoding "Ethernet".
# VirtIO drivers may name the adapter differently across Windows versions.
$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceDescription -notlike '*Loopback*' } | Select-Object -First 1
if (-not $adapter) {
	Write-Host "ERROR: No active network adapter found. Retrying in 10 seconds..."
	Start-Sleep -Seconds 10
	$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
}
if (-not $adapter) {
	Write-Host "ERROR: Still no active network adapter. Skipping DNS/domain setup."
	exit 1
}
$adapterName = $adapter.Name
Write-Host "Detected network adapter: $adapterName ($($adapter.InterfaceDescription))"

# check if WORKGROUP
$sysInfo = Get-WmiObject -Class Win32_ComputerSystem
$isWorkgroup = $sysInfo.PartofDomain -eq $false

# check dns match
$currentDns = (Get-DnsClientServerAddress -InterfaceAlias $adapterName -AddressFamily IPv4 -ErrorAction SilentlyContinue).ServerAddresses
$dnsMatch = ($currentDns -contains $dnsServers[0])

Write-Host "Starting workstation setup"

if (-not $dnsMatch) {
	try {
		Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses $dnsServers
		Write-Host "DNS set to $($dnsServers -join ', ') on adapter $adapterName"
	} catch {
		Write-Host "Failed to set DNS on adapter $adapterName : $_"
	}
}


if ($isWorkgroup) {
	try {

		# create a sched task as a fallback for domain join
		$TaskName = "OEMStartupScript"
		$ScriptPath = "C:\OEM\setup_workstation.ps1"
		$Description = "Executes the OEM maintenance script on every system startup."

		$Action = New-ScheduledTaskAction -Execute "powershell.exe" `
		    -Argument "-ExecutionPolicy Bypass -NoProfile -File `"$ScriptPath`""

		$Trigger = New-ScheduledTaskTrigger -AtStartup

		$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

		Register-ScheduledTask -TaskName $TaskName `
		    -Action $Action `
		    -Trigger $Trigger `
		    -Principal $Principal `
		    -Description $Description `
		    -Force

		Write-Host "Successfully created scheduled task: $TaskName" -ForegroundColor Cyan

		$password = ConvertTo-SecureString $adminPass -AsPlainText -Force
		$cred = New-Object System.Management.Automation.PSCredential ("$adminUser", $password)

		$postJoinCommand = "powershell.exe -ExecutionPolicy Bypass -Command ""Add-LocalGroupMember -Group 'Remote Desktop Users' -Member 'tdinsurance.local\Domain Users'"""

		$registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
		Set-ItemProperty -Path $registryPath -Name "AddDomainUsersToRDP" -Value $postJoinCommand

		Add-Computer -DomainName $domainName -Credential $cred -Force -Restart

	} catch {
		Write-Host "Failed to join domain: $_"
	}
} else {
	# Already domain-joined (post-reboot run). Notify the API and clean up.
	Write-Host "Workstation is already domain-joined. Sending API callback..."

	try {
		curl.exe -s -o NUL -w "%{http_code}" "http://${apiServerIp}:5050/workstations/update/?id=${workstationId}&status=online"
		Write-Host "API callback sent successfully."
	} catch {
		Write-Host "API callback failed: $_"
	}

	# Unregister this scheduled task - setup is complete
	$TaskName = "OEMStartupScript"
	$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
	if ($existing) {
		Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
		Write-Host "Unregistered scheduled task '$TaskName' - setup complete."
	}
}
