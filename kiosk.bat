@echo off

echo Setting default printer...
powershell -NoProfile -Command "(New-Object -ComObject WScript.Network).SetDefaultPrinter('BIXOLON BK3-3')"
echo Done.

echo Launching Chrome...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --window-size=1080,1920 --user-data-dir="C:\kiosk" http://192.168.0.180:3000/

pause
