# Kiosk — E-Reader Recommendation Quiz

Touch-screen kiosk for Innowave Global. Runs a 4-question quiz and recommends an e-reader, then prints a receipt.

## Stack
- **Server**: Node.js + Express (Ubuntu)
- **Client**: Vanilla HTML/CSS/JS
- **Printer**: BIXOLON BK3-3 (Windows, paper: ibraheem[BK33] 72mm × 170mm)

## Setup

```bash
npm install
npm start
```

Server runs on `http://192.168.0.180:3000`

## Launch Kiosk (Windows)

Double-click `kiosk.bat` — sets BIXOLON as default printer and opens Chrome in kiosk mode.

Or manually:

```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --window-size=1080,1920 --user-data-dir="C:\kiosk" http://192.168.0.180:3000/
```

## Printer Setup (one-time)

1. Set paper size `ibraheem[BK33]` (72mm × 170mm) as default in BIXOLON printing preferences
2. Run the Chrome policy registry fix:

```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Google\Chrome' -Name 'PrintingPaperSizeDefault' -Value '{"custom_size":{"height":170000,"width":80000},"name":"custom"}'
```

## Network

- Ubuntu server IP: `192.168.0.180`
- Port 3000 must be open: `sudo ufw allow 3000/tcp`
- Server binds to `0.0.0.0` — accessible from all machines on the network

## Quiz Flow

1. User answers 4 A/B questions
2. Result screen shows recommended device
3. User taps print → receipt auto-prints → screen resets after 3 seconds

## Devices

| Code | Device |
|------|--------|
|루나2 | Entry-level, image content |
| 루나 X2 | Mid-range, image content |
| 지구 | Home use, image content |
| 코멧 | Portable, text content |
| 마스 A | Premium, text content |
