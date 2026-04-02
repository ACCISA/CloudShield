$ImagePath = "C:\OEM\background.png"

if (-not (Test-Path $ImagePath)) {
    Write-Error "The file at $ImagePath was not found."
    return
}

$RegistryPath = "HKCU:\Control Panel\Desktop"
Set-ItemProperty -Path $RegistryPath -Name Wallpaper -Value $ImagePath

$Code = @'
using System.Runtime.InteropServices;
public class Wallpaper {
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
'@

Add-Type -TypeDefinition $Code

[Wallpaper]::SystemParametersInfo(20, 0, $ImagePath, 0x01 -bor 0x02)

Write-Host "Wallpaper successfully set to $ImagePath" -ForegroundColor Cyan
