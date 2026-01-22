@echo off
setlocal

set "target_dir=C:\OEM\"

reg add "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Terminal Server" /v fDenyTSConnections /t REG_DWORD /d 0 /f
netsh advfirewall firewall set rule group="remote desktop" new enable=Yes


if not exist "%target_dir%" (
    echo Error: The folder %target_dir% does not exist.
    pause
    exit /b
)

for %%F in ("%target_dir%*.ps1") do (
    echo [EXEC] %%~nxF

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%%F"

    echo [DONE] %%~nxF
    echo -------------------------------------------
)
