# EcoOils Patroli (EN: EcoOils Patrol) - project guide for Claude sessions

Owner: Iggy (Ignatius Ambrosio Viegas e Fernandes), HSSE Manager, Mentari Project, PT EcoOils Jaya Indonesia, Sei Mangkei SEZ.
Go-live: Monday 19 Oct 2026 evening. Security team = PT ALSOK/SOS (Pak Irsan = Security Chief; Danru = squad leaders).

## What it is
Free QR security-patrol app. Guards scan QR stickers at 45 checkpoints on their phones (Android and iPhone, installed as a PWA). Each scan logs guard, point, time and GPS to Google Sheets. 12 rounds per day (every 2 h, Jakarta UTC+7), Done/Remaining countdown, summary email (English + Bahasa Indonesia) to Ignatius.Ambrosio@ecooils.com.my when points are missed.
Same QR also opens the existing UA/UC form from a normal phone camera: payload https://iggifernandes.github.io/EcoOils-Project-UAUC-Report/?loc=<n>. THE UA/UC REPO AND FORM MUST NOT BE CHANGED.

## Files
• index.html - whole front end (PWA, EN/BI toggle, version top right, jsQR scanning). sw.js network-first, bump CACHE on each release. manifest.json, icons, jsQR.js, qrcode.js.
• Code.gs - Google Apps Script backend (container-bound to the "EcoOils Patrol Log" sheet). Pasted by the owner into Extensions > Apps Script, then Deploy > Manage deployments > Edit > New version (same deployment URL). NOT served by GitHub Pages.
• qr-sheet.html - prints the 45 stickers (UAUC on top, number in centre, location below).
• dev/ - mock Google runtime + tests: `cd dev && npm install && npm test` (backend logic in node, UI in headless Chromium against the mock). Keep all green before every push. No access to script.google.com from the sandbox, so the real deploy is tested by the owner.
• App URL https://iggifernandes.github.io/EcoOils-Project-Security-Patrol/ ; Apps Script URL is in index.html (API_URL).

## Current version v1.7 (index.html, Code.gs and sw.js cache all carry it)
• Personal 6-digit PINs. PIN alone identifies the guard (no name picker); stored hashed (salt in script property PIN_SALT) in Guards sheet col D. Remembered on the phone (localStorage sp_gpin).
• Danru (Guards col E = Yes; seeded for Leaders + Supervisor) get a Team button: add guard, New PIN, deactivate. A PIN is shown once. Only the Admin PIN (Admin > Team) can change a Danru. run makeDanruPins() once to create the first Danru PINs (printed in the Execution log).
• 20 wrong PINs in 10 min locks guard logins ~10 min; scans made while locked are queued on the phone.
• v1.7: the photo check is a SELFIE (front camera, capture=user), low resolution (max 640 px, JPEG q0.6, roughly 30-60 KB). Round and daily emails list the photo-check points with 'photo taken' (link) / NO PHOTO / not scanned; the daily table has a Photo column and totals. High-risk (star) points now: 1,2,13,18,21,22,23,26,27,28,30,34,38,41,42 (Points col G Yes); the random photo points stay uniform over all 45 and do not depend on the star. Do not reprint stickers; owner marked them by hand.
• Random photo checks: PHOTO_PER_ROUND (Config sheet, default 5, 0 = off, Admin > Settings). Server picks the points per round from a secret; phones learn only after the scan is accepted (scan returns needPhoto + scanId, then action photo). Missing photo = flag NO_PHOTO. Offline scans cannot be asked, flagged QUEUED + NO_PHOTO.
• Flags: OUTSIDE, NO_GPS, SUSPECT_GPS, LOW_ACCURACY, NO_PHOTO, REPEAT, QUEUED, TOO_FAST, PHOTO_FAIL. Flagged scans still count as done.
• Admin PIN (script property ADMIN_PIN): Live, History, Calibrate (GPS averaging + radius + auto walking route), Settings, Team.
• Points sheet: 45 points, sticker numbers never change, Seq controls walking order, Radius per point, Active flag.

## Owner preferences (apply always)
• Free options first; no pay-as-you-go API use.
• EN / Bahasa Indonesia toggle in every app; version number in one consistent top-right spot.
• Lists as plain "•" bullets. End every update with "Action needed: ..." or "No action required".
• Never ask the owner to paste the Team Code / PINs into chat or WhatsApp groups. PINs are handed over in person.
• Guards' rounds are shared (no personal routes). No photo-per-point requirement now; scanning each QR stays mandatory.

## Open items
• Owner must: paste Code.gs v1.7 in Apps Script, run makeDanruPins, setupTriggers, testEmail, deploy New version; calibrate points on site; print + laminate stickers; Danru issue PINs at Monday familiarization.
• On hold: in-app/Telegram missed-round alerts. Planned later: shift login/logout with GPS (guard clocking in/out; needs decisions on where to log in, grace period, who is covered, SOS schedule link), start rounds at 07:00 to match SOS shifts (P 07-15, S 15-23, M 23-07), Indonesian point names.
• Privacy note: this repo is public and contains Code.gs with the guard names. No PINs or secrets live in the repo (they are script properties / hashes in the sheet).

## Installation record
• 19 Oct 2026: owner installed all 45 stickers on site (laminated, silicone-fixed). Printed stickers still show the original location text below the number.
• Actual installed locations that differ from the original plan (the app name, Points sheet col C, follows the real place): 14 = Soil disposal gate (was VAM shed), 20 = Pipe rack - tank farm (was Oil polishing plant), 32 = SBE 1 (was Hexane tank), 40 = SBE 2 (was Loading/unloading area). UAUC location text (col D) left unchanged.
• Note: the high-risk star follows the point number (Points col G). 32 was starred as Hexane tank; set it to No if SBE 1 is not high risk.
