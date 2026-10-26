# EcoOils Project Security Patrol (v1.6)

## Files
Upload to the GitHub repo (EcoOils-Project-Security-Patrol): index.html, sw.js, manifest.json, icon.svg, jsQR.js, README.md
Do NOT upload Code.gs (it goes into Google Sheets) or qr-sheet.html (print it from your PC, keep it private).

## Setup
1. GitHub: create repo, upload files above, Settings > Pages > Deploy from branch main / root.
2. Google Sheet: create a new sheet > Extensions > Apps Script > paste Code.gs > Save.
3. Run in order: setup, showCodes (read ADMIN_PIN in Execution log), makeDanruPins (prints each Danru's first PIN in the Execution log; hand them over in person), setupTriggers, testEmail.
4. Deploy > New deployment > Web app > Execute as: Me, Access: Anyone. Copy the URL.
5. Edit index.html: var API_URL='<that URL>'; re-upload.
6. Phones: open https://iggifernandes.github.io/EcoOils-Project-Security-Patrol/ and enter your personal 6-digit PIN once. The Danru creates PINs in the app: Team > Add and create PIN (new person) or New PIN (forgotten or lost PIN). A PIN is shown once and cannot be read back. The PIN identifies the guard, so there is no name picker.
7. Admin > Calibrate: stand at each sticker, pick the point, set the radius, Start reading (averaged GPS). When done tap Auto-sequence walking route (orders the guard list from real positions; sticker numbers never change). Radius can also be edited alone, or in the Points sheet.
8. Print qr-sheet.html (6 per A4), laminate, seal with silicone.
9. UA/UC form: no change needed..

## Notes
- Random photo checks: 5 points per round (change in Admin > Settings, 0 = off). The server picks them and the phone only learns a photo is wanted after the scan is accepted. A skipped or missing photo leaves the scan flagged NO_PHOTO. Photos go to the Drive folder 'EcoOils Patrol Photos' (about 60 per day, roughly 2 GB a year).
- Danru = Yes in column E of the Guards sheet (seeded for Leaders and Supervisor). A Danru can add guards, make new PINs and deactivate guards, but cannot change another Danru; only the Admin PIN can (Admin > Team).
- 20 wrong PIN tries in 10 minutes locks guard logins for about 10 minutes. Scans made while locked are saved on the phone and sent later.
- Rounds: 12 per day, 2 hours, Jakarta time. Missed-point email at 5 min past each round end, daily summary 07:10.
- Flagged scans (outside radius, no GPS, etc.) still count as done and are marked in history.
- To drop a point: set Active = No in the Points sheet.

- Gate pass (v1.45): Project Settings > Script properties: GATEPASS_URL (Gate Pass web app URL) and GATEPASS_SECRET (BRIDGE_SECRET from the Gate Pass showCodes). Run gateCheck once, then Deploy > New version. Never put the secret in the code.
- Adding a point later: add a row in the Points sheet (next free number in No and Seq, Active = Yes), then type 'number, name' in the Extra box on qr-sheet.html and print.

Note: the UA/UC form is NOT changed. A normal phone scanning a sticker opens the form as it is today; the ?loc= part of the address is ignored by the form.
