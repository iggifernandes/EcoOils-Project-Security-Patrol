# EcoOils Project Security Patrol (v1.2)

## Files
Upload to the GitHub repo (EcoOils-Project-Security-Patrol): index.html, sw.js, manifest.json, icon.svg, jsQR.js, README.md
Do NOT upload Code.gs (it goes into Google Sheets) or qr-sheet.html (print it from your PC, keep it private).

## Setup
1. GitHub: create repo, upload files above, Settings > Pages > Deploy from branch main / root.
2. Google Sheet: create a new sheet > Extensions > Apps Script > paste Code.gs > Save.
3. Run in order: setup, showCodes (read TEAM_CODE and ADMIN_PIN in Execution log), setupTriggers, testEmail.
4. Deploy > New deployment > Web app > Execute as: Me, Access: Anyone. Copy the URL.
5. Edit index.html: var API_URL='<that URL>'; re-upload.
6. Phones: open https://iggifernandes.github.io/EcoOils-Project-Security-Patrol/ , enter Team Code once, pick name.
7. Admin > Calibrate: stand at each sticker, pick the point, set the radius, Start reading (averaged GPS). When done tap Auto-sequence walking route (orders the guard list from real positions; sticker numbers never change). Radius can also be edited alone, or in the Points sheet.
8. Print qr-sheet.html (6 per A4), laminate, seal with silicone.
9. UA/UC form: no change needed..

## Notes
- Rounds: 12 per day, 2 hours, Jakarta time. Missed-point email at 5 min past each round end, daily summary 07:10.
- Flagged scans (outside radius, no GPS, etc.) still count as done and are marked in history.
- To drop a point: set Active = No in the Points sheet.

- Adding a point later: add a row in the Points sheet (next free number in No and Seq, Active = Yes), then type 'number, name' in the Extra box on qr-sheet.html and print.

Note: the UA/UC form is NOT changed. A normal phone scanning a sticker opens the form as it is today; the ?loc= part of the address is ignored by the form.
