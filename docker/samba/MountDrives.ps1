$Server = "SERVER"

$Shares = net view \\$Server | Where-Object { $_ -match "Disk" } | ForEach-Object {
    $_.Split('  ')[0].Trim()
}

$FilteredShares = $Shares | Where-Object { $_ -ne "netlogon" -and $_ -ne "sysvol" }

foreach ($ShareName in $FilteredShares) {
    net use * "\\$Server\$ShareName" /persistent:no
}
