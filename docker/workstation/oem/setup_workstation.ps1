# Set DNS to samba and join domain
# Make sure that dynamic variables are capitalized and set by the docker_provisioner
# This script should serve as a template and its variables should be set at by the API server

$adapterName = "Ethernet"
$dnsServers = @("SAMBA_IP")
$domainName = "DOMAIN_NAME"
$adminUser = "ADMIN_USER"
$adminPass = "ADMIN_PASS"

# In our docker_provisioner we must make sure to set the DOMAIN_NAME, SAMBA_IP, ADMIN_USER and ADMIN_PASS

# check if WORKGROUP
$sysInfo = Get-WmiObject -Class Win32_ComputerSystem
$isWorkgroup = $sysInfo.PartofDomain -eq $false

# check dns match
$currentDns = (Get-DnsClientServerAddress -InterfaceAlias $adapterName).ServerAddresses
$dnsMatch = ($currentDns -contains $dnsServers[0])

Write-Host "Starting workstation setup"

if (-not $dnsMatch) {
	try {
		Set-DnsClientServerAddress -InterfaceAlias $adapterName -ServerAddresses $dnsServers
		Write-Host "DNS set to $($dnsServers -join ', ')"
	} catch {
		Write-Host "Failed to set DNS: $_"
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

		$postJoinCommand = "powershell.exe -ExecutionPolicy Bypass -Command ""Add-LocalGroupMember -Group 'Remote Desktop Users' -Member 'DOMAIN_NAME\Domain Users'"""

		$registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce"
		Set-ItemProperty -Path $registryPath -Name "AddDomainUsersToRDP" -Value $postJoinCommand

		Add-Computer -DomainName $domainName -Credential $cred -Force -Restart

	} catch {
		Write-Host "Failed to join domain: $_"
	}
}
