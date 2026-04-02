$wallpaperPath = "C:\OEM\background.png"

if (Test-Path $wallpaperPath) {
    Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop\' -Name wallpaper -Value $wallpaperPath

    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class Wallpaper {
        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
    }
"@
    [Wallpaper]::SystemParametersInfo(0x0014, 0, $wallpaperPath, 0x01 -bor 0x02)
} else {
    $logPath = "C:\OEM\wallpaper_errors.txt"
    "$(Get-Date): Wallpaper missing for $env:USERNAME on $env:COMPUTERNAME" | Out-File -FilePath $logPath -Append
}
