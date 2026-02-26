# Kiosk Project

Web-based interactive kiosk application.

## Stack
- Node.js
- Express
- Frontend: HTML / JavaScript
- Backend: REST API

## Project Structure
kiosk/
├── public/        # Frontend UI
├── server/        # Backend API
├── package.json
├── package-lock.json
└── README.md

## Setup
npm install
npm run dev

## Usage
- Open: http://localhost:3000
- Optimized for touch-based kiosk displays

## Notes
- node_modules/ is ignored
- data/ is runtime-only and not versioned


## npm start

## To print in ubuntu bash
google-chrome --kiosk --kiosk-printing --user-data-dir=/tmp/kiosk-profile http://192.168.0.180/

## To print in windows
you go inside chrome folder
.\chrome.exe --kiosk --kiosk-printing --window-size=1080,1920 --user-data-dir="C:\kiosk" http://192.168.0.180:3000/
