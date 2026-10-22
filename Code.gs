/* EcoOils Mentari - Security Patrol backend (Google Apps Script)  v1.11
   Paste into Extensions > Apps Script of the "EcoOils Patrol Log" Google Sheet.
   Do NOT upload this file to GitHub (it holds the guard list). */
var VERSION = 'v1.30';
var OFF = 7 * 3600000;      // Jakarta (WIB), no daylight saving
var RMS = 2 * 3600000;      // one round = 2 hours
var RSHIFT = 7 * 3600000;   // rounds start at 07:00 (shift change); the 'date' of a round is the day that started at 07:00, so a night round belongs to the date it started
var TZ = 'Asia/Jakarta';
var ZORDER = ['GT', 'FN', 'PL', 'UT', 'LD', 'BL', 'MP'];
var ZNAME = {GT: 'Gate / entry', FN: 'Perimeter fence', PL: 'Process plant', UT: 'Utilities / tanks', LD: 'Laydown', BL: 'Buildings', MP: 'Muster point'};
var HEAD = {
  Scans: ['ScanId', 'Time (WIB)', 'Date', 'Round', 'Guard', 'Role', 'Point ID', 'No', 'Point name', 'Zone', 'Lat', 'Lng', 'Accuracy m', 'Distance m', 'GPS', 'Flags', 'Photo', 'Time ms'],
  Points: ['Point ID', 'No', 'Name', 'UAUC location', 'Zone', 'Radius m', 'Photo', 'Active', 'Lat', 'Lng', 'Calibrated at', 'Notes', 'Seq'],
  Guards: ['Name', 'Role', 'Active', 'PIN hash', 'Danru', 'PIN set (WIB)'],
  Roster: ['Date', 'Shift', 'Duty', 'Guard', 'Buddy', 'Set by', 'Set at (WIB)', 'Batch ms'],
  Hold: ['Time (WIB)', 'Action', 'By', 'Reason', 'Time ms'],
  Videos: ['Time (WIB)', 'Guard', 'Role', 'Seconds', 'Note', 'Link', 'Time ms'],
  Clock: ['Date', 'Shift', 'Guard', 'Role', 'Clock in (WIB)', 'Lat', 'Lng', 'Acc m', 'Dist m', 'Status', 'Late min', 'Set by', 'Time ms', 'Key'],
  Awards: ['Month', 'Winner', 'Qualifiers', 'Drawn at (WIB)', 'Drawn by', 'Status', 'Batch ms'],
  Timesheet: ['Key', 'Date', 'Guard', 'Start', 'End', 'Hours', 'Note', 'Set by', 'Time ms'],
  Staff: ['Guard', 'NPK'],
  Config: ['Key', 'Value']
};
var SEED_POINTS = [["MEN-SEC-GT-01",1,"Main gate / security building","SECURITY BUILDING","GT",10,"Yes","Entry and exit control"],["MEN-SEC-GT-02",2,"West gate / security post","SECURITY POST","GT",10,"Yes","Confirm actual gate position"],["MEN-SEC-GT-03",3,"Weighbridge","WEIGHT BRIDGE","GT",10,"No","Confirm position"],["MEN-SEC-BL-02",4,"Administration building","ADMINISTRATION BUILDING","BL",10,"No","Confirm position"],["MEN-SEC-BL-03",5,"Warehouse Block B","WAREHOUSE BLOCK B","BL",10,"No","Confirm position"],["MEN-SEC-BL-04",6,"Workshop area(In admin Building)","WORKSHOP AREA","BL",10,"No","Confirm position"],["MEN-SEC-LD-01",7,"Block 6 B South East Corner","BLOCK 6 B SOUTH EAST CORNER","LD",10,"No",""],["MEN-SEC-LD-02",8,"GSB Office","GSB OFFICE","LD",10,"No",""],["MEN-SEC-LD-03",9,"WEN Office","WEN OFFICE","LD",10,"No",""],["MEN-SEC-LD-04",10,"PBS Office","PBS OFFICE","LD",10,"No",""],["MEN-SEC-LD-05",11,"KKS Office","KKS OFFICE","LD",10,"No",""],["MEN-SEC-MP-01",12,"MCC Building","MCC BUILDING","MP",10,"No","Confirm position"],["MEN-SEC-PL-01",13,"DDE treatment plant (DTP)","DDE TREATMENT PLANT (DTP)","PL",10,"Yes",""],["MEN-SEC-PL-02",14,"Soil disposal gate","VAPOR ABSORPTION MACHINE (VAM) SHED","PL",10,"No",""],["MEN-SEC-PL-03",15,"Pipe rack - north","PIPE RACK","PL",10,"No","Fix on a column; not on pipe"],["MEN-SEC-PL-04",16,"Cooling tower","COOLING TOWER","PL",10,"No","Confirm position"],["MEN-SEC-PL-05",17,"Dirty cooling tower","DIRTY COOLING TOWER","PL",10,"No","Confirm position"],["MEN-SEC-PL-06",18,"FFA plant","FA PLANT","PL",10,"Yes","Confirm position"],["MEN-SEC-PL-07",19,"Pipe rack - centre","PIPE RACK","PL",10,"No","Fix on a column; not on pipe"],["MEN-SEC-PL-08",20,"Pipe rack - tank farm","OIL POLISHING PLANT","PL",10,"No","Confirm position"],["MEN-SEC-PL-09",21,"Boiler / chimney area","BOILER / CHIMNEY AREA","PL",10,"Yes","High risk; hot surfaces; keep QR clear of heat"],["MEN-SEC-PL-10",22,"Electrical substation (PLN)","ELECTRICAL SUBSTATION (PLN)","PL",10,"Yes","Fix on outer fence or wall only"],["MEN-SEC-PL-11",23,"Extraction plant - north","EXTRACTION PLANT","PL",10,"Yes",""],["MEN-SEC-PL-12",24,"Pre-treatment unit (PTU)","PRE TREATMENT UNIT (PTU)","PL",10,"No",""],["MEN-SEC-PL-13",25,"Control room / MCC room","CONTROL ROOM, MCC ROOM","PL",10,"No","Outer wall at entrance"],["MEN-SEC-PL-14",26,"Extraction plant - centre","EXTRACTION PLANT","PL",10,"Yes","High risk; hexane process"],["MEN-SEC-PL-15",27,"Silo","SILO","PL",10,"Yes",""],["MEN-SEC-PL-16",28,"Extraction plant - south","EXTRACTION PLANT","PL",10,"Yes",""],["MEN-SEC-UT-01",29,"Scheduled and domestic waste shed","SCHEDULED & DOMESTIC WASTE SHED","UT",10,"No",""],["MEN-SEC-UT-02",30,"Dry and liquid chemical storage","DRY AND LIQUID CHEMICAL STORAGE","UT",10,"Yes","Chemical storage"],["MEN-SEC-UT-03",31,"Raw water pit","RAW WATER PIT","UT",10,"No","Fix on fence; not at pit edge"],["MEN-SEC-UT-04",32,"SBE 1","HEXANE TANK","UT",10,"No","High risk; outside bund wall"],["MEN-SEC-UT-05",33,"Tank farm -21T03","TANK FARM","UT",10,"No","Outside bund wall"],["MEN-SEC-UT-06",34,"Tank farm - 21T01","TANK FARM","UT",10,"Yes","High risk; outside bund wall"],["MEN-SEC-UT-07",35,"Tank farm - 21T08","TANK FARM","UT",10,"No","Outside bund wall"],["MEN-SEC-UT-08",36,"Fire water tank","FIRE WATER TANK","UT",10,"No","Confirm position"],["MEN-SEC-UT-09",37,"Fire water pump house","FIRE WATER PUMP HOUSE","UT",10,"No","Confirm position"],["MEN-SEC-UT-10",38,"Hexane and diesel receiving bay","HEXANE AND DIESEL RECEIVING BAY","UT",10,"Yes","High risk; offloading area"],["MEN-SEC-UT-11",39,"Water treatment plant (WTP) and tanks","WATER TREATMENT PLANT (WTP) AND WATER TANKS","UT",10,"No",""],["MEN-SEC-UT-12",40,"SBE 2","LOADING/UNLOADING AREA (PUMP HOUSE)","UT",10,"No",""],["MEN-SEC-UT-13",41,"Diesel tank / generator area","DIESEL TANK","UT",10,"Yes","Fuel storage; outside bund wall"],["MEN-SEC-UT-14",42,"Effluent treatment plant (ETP)","EFFLUENT TREATMENT PLANT (ETP)","UT",10,"Yes","Confirm position"],["MEN-SEC-UT-15",43,"Waste water treatment plant (WWTP)","WASTE WATER TREATMENT PLANT (WWTP)","UT",10,"No","Confirm position"],["MEN-SEC-FN-01",44,"North-west corner Block 6a","NORTH-WEST CORNER BLOCK 6A","FN",10,"No",""],["MEN-SEC-FN-02",45,"EcoOils Ware House","ECOOILS WARE HOUSE","FN",10,"No",""],["MEN-SEC-GT-04",46,"Block 6B East Gate","BLOCK 6B EAST GATE","GT",10,"Yes","Entry and exit control, Block 6B"]];
var SEED_GUARDS = [
  ['Agus Fazar', 'Army'], ['Muhammad Irsan', 'Danru'], ['Jhonsen Panjaitan', 'Shift Supervisor'], ['Rendi Irawan', 'Shift Supervisor'], ['Try Agung Pramana', 'Shift Supervisor'],
  ['Arya Fahrul Manurung', 'Security Guard'], ['Syafrizal Marpaung', 'Security Guard'], ['Valen Andriano', 'Security Guard'], ['Muhammad Alfaroby Siregar', 'Security Guard'],
  ['Jona Alfian', 'Security Guard'], ['Dian Akmal', 'Security Guard'], ['Aril Septiadi', 'Security Guard'], ['Febrianto', 'Security Guard'], ['Aldi Ramadhan', 'Security Guard'],
  ['Irvan Firmansyah', 'Security Guard'], ['Muhammad Syahputra', 'Security Guard'], ['Pahrurrozi Nasution', 'Security Guard'], ['Ilham Affandi', 'Security Guard'],
  ['Muhammad Siddik', 'Security Guard'], ['Febry Ibrahim', 'Security Guard'], ['Dani Hardyansyah', 'Security Guard'], ['Binhot Eben Siahaan', 'Security Guard'],
  ['Deddy Satria', 'Security Guard'], ['Handoko Pranata', 'Security Guard'], ['Renaldi', 'Security Guard']
];

/* ---------- one-time setup (run from the editor) ---------- */
function setup() {
  var s = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HEAD).forEach(function (n) {
    var sh = s.getSheetByName(n) || s.insertSheet(n);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEAD[n]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEAD[n].length).setFontWeight('bold');
    }
  });
  var d = s.getSheetByName('Sheet1');
  if (d && s.getSheets().length > 1 && d.getLastRow() === 0) s.deleteSheet(d);
  s.getSheetByName('Scans').getRange('B:C').setNumberFormat('@');
  s.getSheetByName('Roster').getRange('A:B').setNumberFormat('@');
  var pts = s.getSheetByName('Points');
  if (pts.getLastRow() < 2) {
    pts.getRange(2, 1, SEED_POINTS.length, 13).setValues(SEED_POINTS.map(function (p) {
      return [p[0], p[1], p[2], p[3], p[4], p[5], p[6], 'Yes', '', '', '', p[7], p[1]];
    }));
  }
  var g = s.getSheetByName('Guards');
  if (g.getLastRow() < 2) g.getRange(2, 1, SEED_GUARDS.length, 6).setValues(SEED_GUARDS.map(function (x) { return [x[0], x[1], 'Yes', '', isLead_(x[1]) ? 'Yes' : 'No', '']; }));
  upgrade_();
  var c = s.getSheetByName('Config');
  if (c.getLastRow() < 2) c.getRange(2, 1, 3, 2).setValues([['SHOW_NAMES', 'yes'], ['NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my'], ['PHOTO_PER_ROUND', '8']]);
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('ADMIN_PIN')) p.setProperty('ADMIN_PIN', rand6_());
  folder_();
  showCodes();
}
function rand6_() { return String(Math.floor(100000 + Math.random() * 900000)); }
function showCodes() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('ADMIN_PIN (for you only): ' + p.getProperty('ADMIN_PIN'));
  Logger.log('To change it, edit it in Project Settings > Script Properties.');
  Logger.log('Guards log in with a personal PIN given by their Danru. Run makeDanruPins() once to create the first PINs for the Danru.');
}
/* Run once from the editor: gives every Danru without a PIN a new PIN and prints them in the log (execution log). Hand each one over in person. */
function makeDanruPins() {
  upgrade_();
  var sh = sh_('Guards'), n = sh.getLastRow(), v = sh.getRange(2, 1, n - 1, 6).getValues(), made = 0;
  v.forEach(function (r, i) {
    if (!r[0] || String(r[2]) === 'No' || String(r[4]) !== 'Yes' || r[3]) return;
    var pin = newPin_();
    sh.getRange(i + 2, 4).setValue(hash_(pin));
    sh.getRange(i + 2, 6).setValue(ymdhms_(Date.now()));
    Logger.log('DANRU PIN  ' + r[0] + '  =  ' + pin);
    made++;
  });
  Logger.log(made ? 'Done. Give each PIN to its owner in person. PINs cannot be read back later; use New PIN in the Team tab to reissue.' : 'No Danru without a PIN found. Check the Guards sheet: column E (Danru) must say Yes.');
}
/* Adds the new Guards columns on an existing sheet and marks Leaders and Supervisors as Danru the first time. */
function upgrade_() {
  var sh = sh_('Guards');
  if (!sh) return;
  if (String(sh.getRange(1, 4).getValue()) === 'PIN hash') return;
  sh.getRange(1, 4, 1, 3).setValues([['PIN hash', 'Danru', 'PIN set (WIB)']]).setFontWeight('bold');
  var n = sh.getLastRow();
  if (n < 2) return;
  var v = sh.getRange(2, 1, n - 1, 2).getValues();
  sh.getRange(2, 5, n - 1, 1).setValues(v.map(function (r) { return [isLead_(r[1]) ? 'Yes' : 'No']; }));
}
/* One-time (run from the editor on an EXISTING sheet): adds checkpoint 46 'Block 6B East Gate' to the Points sheet (no coordinates yet: calibrate it standing at the gate in Admin > Calibrate). Safe to run twice. */
function addEastGate() {
  var sh = sh_('Points');
  var have = points_(false).some(function (p) { return p.no === 46; });
  if (have) { Logger.log('Point 46 already exists. Nothing changed.'); return; }
  sh.appendRow(['MEN-SEC-GT-04', 46, 'Block 6B East Gate', 'BLOCK 6B EAST GATE', 'GT', 10, 'Yes', 'Yes', '', '', '', 'Entry and exit control, Block 6B', 46]);
  Logger.log('Point 46 (Block 6B East Gate) added. Calibrate it on site.');
}
function isLead_(role) { return ['Leader', 'Supervisor', 'Danru', 'Shift Supervisor'].indexOf(String(role)) >= 0; }
/* One-time (run from the editor): Pak Irsan = Danru, the other former Leaders / Supervisors = Shift Supervisor. All keep Danru access (Team + Shift plan). PINs are not touched. */
function fixRoles() {
  var sh = sh_('Guards'), n = sh.getLastRow(), done = 0;
  for (var i = 2; i <= n; i++) {
    var nm = String(sh.getRange(i, 1).getValue()).trim(), role = String(sh.getRange(i, 2).getValue());
    if (!nm) continue;
    if (nm.toLowerCase() === 'muhammad irsan') { sh.getRange(i, 2).setValue('Danru'); sh.getRange(i, 5).setValue('Yes'); done++; }
    else if (role === 'Leader' || role === 'Supervisor') { sh.getRange(i, 2).setValue('Shift Supervisor'); sh.getRange(i, 5).setValue('Yes'); done++; }
  }
  Logger.log('Roles updated for ' + done + ' people.');
}
/* ---------- calibrate from patrol scans (run from the editor) ----------
   Idea: patrol scans taken standing at the sticker give each point's position. By default every guard's scans are used (many guards = outliers drop out); Config CAL_GUARD limits it to one named person.
   Each scan stores the best GPS fix. previewCalFromScans() shows what would be saved (writes nothing, see View > Logs / Execution log).
   applyCalFromScans() saves it to Points (Lat, Lng, Calibrated at). Radius is not changed.
   Config keys (optional): CAL_GUARD (name; default blank = all guards), CAL_FROM (WIB 'yyyy-mm-dd hh:mm', default last 24 h), CAL_MAX_ACC (m, default 15). */
function calFromScans_(apply) {
  var guard = cfg_('CAL_GUARD', '').trim().toLowerCase(), maxAcc = Number(cfg_('CAL_MAX_ACC', '15')) || 15;
  var from = Date.now() - 24 * 3600000, cf = cfg_('CAL_FROM', '');
  if (cf) { var t = Date.parse(cf.replace(' ', 'T') + ':00Z') - OFF; if (isFinite(t)) from = t; }
  var by = {};
  scans_(6000).forEach(function (r) {
    var ms = Number(r[17]), la = num_(r[10]), ln = num_(r[11]), ac = num_(r[12]), fl = String(r[15]);
    if (ms < from || la == null || ln == null || ac == null || ac <= 0 || ac > maxAcc) return;
    if (guard && String(r[4]).trim().toLowerCase() !== guard) return;
    if (/SUSPECT_GPS|NO_GPS|TOO_FAST/.test(fl)) return;
    (by[String(r[6])] = by[String(r[6])] || []).push({lat: la, lng: ln, acc: ac, g: String(r[4])});
  });
  var out = [], saved = 0, check = 0, none = 0, sh = sh_('Points');
  points_(false).forEach(function (p) {
    var f = by[p.id] || [];
    if (f.length >= 3) {  /* drop fixes far from the median */
      var ml = f.map(function (x) { return x.lat; }).sort(function (a, b) { return a - b; })[Math.floor(f.length / 2)];
      var mn = f.map(function (x) { return x.lng; }).sort(function (a, b) { return a - b; })[Math.floor(f.length / 2)];
      f = f.filter(function (x) { return hav_(x.lat, x.lng, ml, mn) <= 20; });
    }
    if (!f.length) { none++; out.push(p.no + '  ' + p.name + '  NO DATA'); return; }
    var sw = 0, la = 0, ln = 0, best = 1e9;
    f.forEach(function (x) { var w = 1 / (Math.max(x.acc, 3) * Math.max(x.acc, 3)); sw += w; la += x.lat * w; ln += x.lng * w; best = Math.min(best, x.acc); });
    la /= sw; ln /= sw;
    var spread = 0;
    f.forEach(function (x) { spread = Math.max(spread, hav_(x.lat, x.lng, la, ln)); });
    var gs = {};
    f.forEach(function (x) { gs[x.g] = 1; });
    var note = [];
    if (f.length === 1) note.push('single reading');
    if (best > 10) note.push('best accuracy over 10 m');
    if (spread > 15) note.push('readings spread ' + Math.round(spread) + ' m');
    if (note.length) check++;
    out.push(p.no + '  ' + p.name + '  n=' + f.length + ' guards=' + Object.keys(gs).length + '  best ' + Math.round(best) + ' m  spread ' + Math.round(spread) + ' m  ' + (note.length ? 'CHECK: ' + note.join(', ') : 'OK'));
    if (apply) { sh.getRange(p.row, 9, 1, 3).setValues([[la, ln, ymdhms_(Date.now()) + ' (from scans, n=' + f.length + ', ' + Math.round(best) + ' m)']]); saved++; }
  });
  out.forEach(function (l) { Logger.log(l); });
  Logger.log((apply ? 'SAVED ' + saved + ' points. ' : 'PREVIEW only, nothing saved. ') + none + ' points have no usable scan yet, ' + check + ' need a check.');
  return {saved: saved, none: none, check: check, lines: out};
}
function previewCalFromScans() { return calFromScans_(false); }
function applyCalFromScans() { return calFromScans_(true); }
/* One-time: set the allowed radius of every point to 10 m (run from the editor). Calibration can still change a single point. */
function setRadius10() {
  var sh = sh_('Points'), n = sh.getLastRow();
  if (n < 2) return;
  for (var i = 2; i <= n; i++) if (sh.getRange(i, 1).getValue()) sh.getRange(i, 6).setValue(10);
  Logger.log('Radius set to 10 m for ' + (n - 1) + ' points.');
}
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'roundCheck' || h === 'dailySummary') ScriptApp.deleteTrigger(t);
  });
  ROUNDS.forEach(function (rd) { var h = rd[1] % 24; ScriptApp.newTrigger('roundCheck').timeBased().atHour(h).nearMinute(5).everyDays(1).inTimezone(TZ).create(); });
  ScriptApp.newTrigger('dailySummary').timeBased().atHour(7).nearMinute(10).everyDays(1).inTimezone(TZ).create();
  Logger.log('Triggers created: 9 round checks, 5 minutes after each round ends (10:05, 12:05, 14:05, 18:05, 20:05, 22:05, 02:05, 04:05, 06:05 Jakarta time) and 1 daily summary at about 07:10.');
}
function testEmail() { send_('Patrol app test email / Email uji coba', '<p>This is a test from the EcoOils Mentari Security Patrol app ' + VERSION + '. If you can read this, missed-point summaries will reach you.</p><hr><p>Ini adalah email uji coba dari aplikasi Patroli Keamanan EcoOils Mentari ' + VERSION + '. Jika Anda dapat membaca ini, ringkasan titik yang terlewat akan sampai kepada Anda.</p>'); }

/* ---------- helpers ---------- */
function sh_(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }
function p2_(n) { return (n < 10 ? '0' : '') + n; }
function ymdhms_(ms) { return new Date(ms + OFF).toISOString().replace('T', ' ').slice(0, 19); }
function num_(v) { if (v === '' || v == null) return null; var n = Number(v); return isFinite(n) ? n : null; }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hav_(a, b, c, d) {
  var R = 6371000, t = Math.PI / 180, dl = (c - a) * t, dn = (d - b) * t;
  var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dn / 2) * Math.sin(dn / 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
/* Patrol rounds (owner schedule 20 Oct 2026). Hours counted from 00:00 of the round's date; 24 and up = the next morning, so a night round belongs to the date the shift started.
   Morning 08-10, 10-12, 12-14; Afternoon 16-18, 18-20, 20-22; Night 00-02, 02-04, 04-06. Between rounds there is no patrol: a scan then is recorded (flag OFF_ROUND) but counts for no round. */
var ROUNDS = [[8, 10], [10, 12], [12, 14], [16, 18], [18, 20], [20, 22], [24, 26], [26, 28], [28, 30]];
function rlabel_(i) { var a = ROUNDS[i]; return p2_(a[0] % 24) + ':00-' + p2_(a[1] % 24) + ':00'; }
function roundBy_(date, idx) {
  var day = Date.parse(date + 'T00:00:00Z'), a = ROUNDS[idx];
  return {date: date, idx: idx, start: day + a[0] * 3600000 - OFF, end: day + a[1] * 3600000 - OFF, label: rlabel_(idx)};
}
/* The round that contains ms. In a gap it returns the NEXT round with upcoming:true. opDate = the 07:00-to-07:00 day that ms belongs to. */
function roundAt_(ms) {
  var l = ms + OFF - RSHIFT, day = Math.floor(l / 86400000) * 86400000, d = new Date(day).toISOString().slice(0, 10), up = null;
  for (var i = 0; i < ROUNDS.length; i++) {
    var r = roundBy_(d, i);
    r.opDate = d;
    if (ms >= r.start && ms < r.end) return r;
    if (r.start > ms && !up) up = r;
  }
  if (!up) { up = roundBy_(new Date(day + 86400000).toISOString().slice(0, 10), 0); up.opDate = d; }
  up.upcoming = true;
  return up;
}
/* The most recent round that has finished at ms. */
function lastEnded_(ms) {
  var base = Date.parse(roundAt_(ms).opDate + 'T00:00:00Z'), best = null;
  [0, -1, -2].forEach(function (k) {
    var d = new Date(base + k * 86400000).toISOString().slice(0, 10);
    for (var i = 0; i < ROUNDS.length; i++) { var r = roundBy_(d, i); if (r.end <= ms && (!best || r.end > best.end)) best = r; }
  });
  return best;
}
/* Config is read once per request (CFGM_), not once per setting: a request used to re-read the sheet hundreds of times. */
var CFGM_ = null;
function cfg_(k, def) {
  if (!CFGM_) {
    CFGM_ = {};
    var sh = sh_('Config'), n = sh.getLastRow();
    if (n > 1) sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) { var key = String(r[0]); if (!Object.prototype.hasOwnProperty.call(CFGM_, key)) CFGM_[key] = String(r[1]); });
  }
  return Object.prototype.hasOwnProperty.call(CFGM_, k) ? CFGM_[k] : def;
}
function setCfg_(k, val) {
  CFGM_ = null;
  var sh = sh_('Config'), n = sh.getLastRow();
  var v = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === k) { sh.getRange(i + 2, 2).setValue(val); return; }
  sh.appendRow([k, val]);
}
/* Live map position of a calibrated point on the Plot 6A + 6B outline (1000 x 511 units, about 2.57 units per metre; same box as LM in index.html). Phones get these rounded positions, not raw coordinates. */
var MAP_BOX = {lat1: 3.13145, lat0: 3.12965, lng0: 99.34720, lng1: 99.35070, W: 1000, H: 511};
function mapXY_(p) {
  if (p.lat == null || p.lng == null || p.lat === '' || p.lng === '') return {x: null, y: null};
  var B = MAP_BOX;
  return {x: Math.round((p.lng - B.lng0) / (B.lng1 - B.lng0) * B.W), y: Math.round((B.lat1 - p.lat) / (B.lat1 - B.lat0) * B.H)};
}
function points_(activeOnly) {
  var sh = sh_('Points'), n = sh.getLastRow();
  if (n < 2) return [];
  var out = [];
  sh.getRange(2, 1, n - 1, 13).getValues().forEach(function (r, i) {
    if (!r[0]) return;
    var p = {row: i + 2, id: String(r[0]), no: Number(r[1]), name: String(r[2]), uauc: String(r[3]), zone: String(r[4]), radius: Number(r[5]) || 10,
      hi: String(r[6]) === 'Yes', photo: false, active: String(r[7]) !== 'No', lat: num_(r[8]), lng: num_(r[9]), cal: r[10] ? String(r[10]) : '', notes: String(r[11] || ''), seq: Number(r[12]) || Number(r[1])};
    if (!activeOnly || p.active) out.push(p);
  });
  out.sort(function (a, b) { return a.seq - b.seq || a.no - b.no; });
  return out;
}
function guardsAll_() {
  upgrade_();
  var sh = sh_('Guards'), n = sh.getLastRow();
  if (n < 2) return [];
  var out = [];
  sh.getRange(2, 1, n - 1, 6).getValues().forEach(function (r, i) {
    if (!r[0]) return;
    out.push({row: i + 2, name: String(r[0]).trim(), role: String(r[1]), active: String(r[2]) !== 'No', hash: String(r[3] || ''), danru: String(r[4]) === 'Yes', setAt: String(r[5] || '')});
  });
  return out;
}
function guards_() { return guardsAll_().filter(function (g) { return g.active; }); }
function salt_() {
  var p = props_(), s = p.getProperty('PIN_SALT');
  if (!s) { s = Utilities.getUuid(); p.setProperty('PIN_SALT', s); }
  return s;
}
function hash_(pin) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt_() + '|' + String(pin).trim()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
/* A new, unused 6-digit PIN. The PIN alone identifies the guard, so it must be unique. */
function newPin_() {
  var used = {};
  guardsAll_().forEach(function (g) { if (g.hash) used[g.hash] = 1; });
  for (var i = 0; i < 200; i++) {
    var pin = rand6_();
    if (!used[hash_(pin)]) return pin;
  }
  throw new Error('no free PIN');
}
/* Returns the active guard who owns this PIN, or null. Wrong guesses are counted; too many wrong guesses lock everyone out for about 10 minutes. */
function guardByPin_(pin) {
  if (!pin || !/^\d{6}$/.test(String(pin).trim())) { failed_('fg'); return null; }
  var h = hash_(pin), hit = null;
  guards_().forEach(function (g) { if (g.hash && g.hash === h) hit = g; });
  if (!hit) failed_('fg');
  return hit;
}
/* Date and round of a Scans row, taken from the Time ms column (col R) so it still works when Google Sheets has turned the Date or Round text cells into real dates/times. */
function rowWhen_(r) {
  var ms = Number(r[17]);
  if (ms > 0) { var ra = roundAt_(ms); return ra.upcoming ? {date: ra.opDate, idx: -1} : {date: ra.date, idx: ra.idx}; }
  var d = r[2] instanceof Date ? Utilities.formatDate(r[2], TZ, 'yyyy-MM-dd') : String(r[2]);
  var li = -1; for (var q = 0; q < ROUNDS.length; q++) if (rlabel_(q).slice(0, 2) === String(r[3]).slice(0, 2)) li = q;
  return {date: d, idx: li};
}
function scans_(n) {
  var sh = sh_('Scans'), last = sh.getLastRow();
  if (last < 2) return [];
  var st = Math.max(2, last - n + 1);
  return sh.getRange(st, 1, last - st + 1, 18).getValues();
}
function doneMap_(r) {
  var d = {}, rows = scans_(300);
  if (rows.length >= 300 && Number(rows[0][17]) >= r.start) rows = scans_(1500);
  rows.forEach(function (row) {
    var ms = Number(row[17]);
    if (ms >= r.start && ms < r.end && !d[row[6]]) d[row[6]] = {t: ms, by: String(row[4]), flags: String(row[15]), gps: String(row[14]), photo: String(row[16] || '')};
  });
  return d;
}
/* Random photo checks: N points per round, chosen by the server from a secret, stable for the whole round, never sent to the phones in advance. */
/* ---------- shift plan (Danru assigns guards and buddies per shift) ---------- */
var SHIFTS = {P: '07:00-15:00', S: '15:00-23:00', M: '23:00-07:00'};
function shiftAt_(ms) {
  var l = ms + OFF, h = new Date(l).getUTCHours(), code = h >= 7 && h < 15 ? 'P' : (h >= 15 && h < 23 ? 'S' : 'M');
  var d = new Date(h < 7 ? l - 86400000 : l).toISOString().slice(0, 10);
  return {date: d, code: code, label: SHIFTS[code]};
}
function dutyList_() { return cfg_('DUTIES', 'Gate 1,Gate 2,Gate 3,Patrol').split(',').map(function (x) { return x.trim(); }).filter(String); }
function rosterSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('Roster');
  if (!sh) {
    sh = s.insertSheet('Roster');
    sh.appendRow(HEAD.Roster);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.Roster.length).setFontWeight('bold');
    sh.getRange('A:B').setNumberFormat('@');
  }
  return sh;
}
var ROSM_ = null;
function roster_(date, code) {
  if (!ROSM_) { var rsh = rosterSheet_(), rn = rsh.getLastRow(); ROSM_ = rn < 2 ? [] : rsh.getRange(2, 1, rn - 1, 8).getValues(); }
  var best = 0, rows = [];
  ROSM_.forEach(function (r) {
    var dv = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd') : String(r[0]);
    if (dv !== date || String(r[1]) !== code) return;
    var b = Number(r[7]) || 0;
    if (b > best) { best = b; rows = []; }
    if (b === best && r[3]) rows.push({duty: String(r[2]), guard: String(r[3]), buddy: String(r[4] || '')});
  });
  return rows;
}
function dayPlan_(date) { return {P: roster_(date, 'P'), S: roster_(date, 'S'), M: roster_(date, 'M')}; }
function onPlan_(plan, name) {
  var k = String(name).toLowerCase(), on = false;
  plan.forEach(function (r) { if (r.guard.toLowerCase() === k || (r.buddy && r.buddy.toLowerCase() === k)) on = true; });
  return on;
}
function photoN_() { var n = parseInt(cfg_('PHOTO_PER_ROUND', '8'), 10); return isFinite(n) && n > 0 ? Math.min(n, 100) : 0; }
function photoSecret_() {
  var p = props_(), s = p.getProperty('PHOTO_SECRET');
  if (!s) { s = Utilities.getUuid(); p.setProperty('PHOTO_SECRET', s); }
  return s;
}
/* Selfie checks per round (default 8). Points in Config PHOTO_PRIORITY (default 7,9,18,23: SE corner, WEN office, FFA, Extraction north - places a guard might avoid)
   are picked for most rounds (PHOTO_PRIORITY_PCT, default 75 percent each); the rest of the places are filled at random. Still secret and stable for the whole round. */
function photoSet_(r, pts) {
  var n = photoN_(), set = {};
  if (!n) return set;
  var sec = photoSecret_(), pri = {}, pct = Math.min(100, Math.max(0, Number(cfg_('PHOTO_PRIORITY_PCT', '75')) || 0));
  String(cfg_('PHOTO_PRIORITY', '7,9,18,23')).split(',').forEach(function (x) { x = x.trim(); if (x) pri[x] = 1; });
  var all = pts.filter(function (p) { return p.active; }).map(function (p) {
    var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sec + '|' + r.date + '|' + r.idx + '|' + p.id).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
    return {id: p.id, h: h, first: !!pri[String(p.no)] && parseInt(h.slice(8, 16), 16) / 4294967296 < pct / 100};
  }).sort(function (a, b) { return a.h < b.h ? -1 : a.h > b.h ? 1 : 0; });
  all.filter(function (x) { return x.first; }).concat(all.filter(function (x) { return !x.first; })).slice(0, n).forEach(function (x) { set[x.id] = true; });
  return set;
}
function props_() { return PropertiesService.getScriptProperties(); }
function failed_(k) { var c = CacheService.getScriptCache(); c.put(k, String(Number(c.get(k) || 0) + 1), 600); }
function locked_(k, max) { return Number(CacheService.getScriptCache().get(k) || 0) >= max; }
function adminOk_(pin) {
  if (locked_('fp', 10)) return false;
  var ok = !!pin && String(pin).trim() === String(props_().getProperty('ADMIN_PIN') || '').trim();
  if (!ok) failed_('fp');
  return ok;
}
/* Photos and videos go to the Drive folder in script properties PHOTO_FOLDER / VIDEO_FOLDER (run setDriveFolders once to set both to DRIVE_FOLDER_ID).
   If the chosen folder cannot be opened (for example it is not shared with the account that owns this script) the file is NOT lost: it goes to a clearly named FALLBACK folder in the script owner's own Drive,
   and the chosen folder id is left untouched so fixing the sharing is enough. */
var DRIVE_FOLDER_ID = '1LDSiie7L6CfPuaxlsVHLdZTduFpjGqx3';
function driveFolder_(prop, name) {
  var p = props_(), id = p.getProperty(prop);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { Logger.log(prop + ' cannot be opened: ' + e); } }
  var fk = prop + '_FALLBACK', fid = id ? p.getProperty(fk) : '';
  if (fid) { try { return DriveApp.getFolderById(fid); } catch (e2) {} }
  var f = DriveApp.createFolder(id ? name + ' (FALLBACK - chosen folder cannot be opened)' : name);
  p.setProperty(id ? fk : prop, f.getId());
  return f;
}
function folder_() { return driveFolder_('PHOTO_FOLDER', 'EcoOils Patrol Photos'); }
/* Run once from the editor: points photos and videos at DRIVE_FOLDER_ID, moves anything already saved in the old folders into it, and trashes old folders that end up empty. Safe to run again. */
function setDriveFolders() {
  var id = DRIVE_FOLDER_ID, f;
  try { f = DriveApp.getFolderById(id); var t = f.createFile('patrol-write-test.txt', 'ok'); t.setTrashed(true); }
  catch (e) { Logger.log('CANNOT USE THE FOLDER. Open it in Google Drive > Share and give the Google account that owns this script EDITOR access, then run setDriveFolders again. Error: ' + e); return {ok: false}; }
  var p = props_(), olds = {}, moved = 0, left = 0, start = Date.now();
  ['PHOTO_FOLDER', 'VIDEO_FOLDER', 'PHOTO_FOLDER_FALLBACK', 'VIDEO_FOLDER_FALLBACK'].forEach(function (k) { var o = p.getProperty(k); if (o && o !== id) olds[o] = 1; });
  p.setProperty('PHOTO_FOLDER', id); p.setProperty('VIDEO_FOLDER', id);
  p.deleteProperty('PHOTO_FOLDER_FALLBACK'); p.deleteProperty('VIDEO_FOLDER_FALLBACK');
  Object.keys(olds).forEach(function (oid) {
    try {
      var of = DriveApp.getFolderById(oid), it = of.getFiles();
      while (it.hasNext()) { if (Date.now() - start > 270000) { left++; break; } it.next().moveTo(f); moved++; }
      if (!left && !of.getFiles().hasNext() && !of.getFolders().hasNext()) of.setTrashed(true);
    } catch (e3) { Logger.log('Old folder ' + oid + ' skipped: ' + e3); }
  });
  Logger.log('Photos and videos now go to: ' + f.getName() + ' (' + id + '). Moved ' + moved + ' old file(s).' + (left ? ' Time ran out: run setDriveFolders again to move the rest.' : ''));
  return {ok: true, moved: moved, more: left > 0};
}

/* ---------- web app ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet() { return out_({ok: true, version: VERSION}); }
function doPost(e) {
  var res;
  try { res = route_(JSON.parse(e.postData.contents)); } catch (err) { res = {ok: false, err: 'server', msg: String(err)}; }
  return out_(res);
}
function route_(b) {
  CFGM_ = null; ROSM_ = null;
  var a = String(b.action || '');
  if (a === 'ping') return {ok: true, version: VERSION};
  if (a.indexOf('a_') === 0) {
    if (!adminOk_(b.pin)) return {ok: false, err: 'pin'};
    return admin_(a, b);
  }
  if (a.indexOf('d_') === 0) return team_(a, b);
  if (a !== 'state' && a !== 'scan' && a !== 'photo' && a !== 'clockin' && a !== 'video') return {ok: false, err: 'action'};
  if (locked_('fg', 20)) return {ok: false, err: 'locked'};
  var me = guardByPin_(b.gp);
  if (!me) return {ok: false, err: 'pin'};
  if (a === 'state') return state_(me);
  if (a === 'photo') return photo_(b, me);
  if (a === 'clockin') return clockIn_(b, me);
  if (a === 'video') return videoSave_(b, me);
  return scan_(b, me);
}
function state_(me) {
  var now = Date.now(), r = roundAt_(now);
  return {
    ok: true, version: VERSION, now: now, round: r, rlabels: ROUNDS.map(function (x, i) { return rlabel_(i); }), showNames: cfg_('SHOW_NAMES', 'yes') === 'yes', me: {name: me.name, role: me.role, danru: me.danru}, tsOn: cfg_('TS_DANRU', 'no') === 'yes',
    points: points_(true).map(function (p) { var xy = mapXY_(p); return {id: p.id, no: p.no, seq: p.seq, name: p.name, zone: p.zone, hi: p.hi, x: xy.x, y: xy.y}; }),
    done: doneMap_(r), plan: planNow_(), award: awardPublic_(), clock: clockState_(me), hold: holdPublic_()
  };
}
function planNow_() {
  try { var sf = shiftAt_(Date.now()); return {date: sf.date, shift: sf.code, label: sf.label, rows: roster_(sf.date, sf.code), day: dayPlan_(sf.date)}; }
  catch (e) { return {date: '', shift: '', label: '', rows: []}; }
}
/* Points where GPS is not reliable (indoors, on upper floors, under tank shadow): the scan is recorded as normal but never flagged OUTSIDE, NO_GPS or LOW_ACCURACY. Config GPS_SKIP = point numbers, comma separated. */
function gpsSkip_(no) {
  return String(cfg_('GPS_SKIP', '6,18,21,23,26,27,33,34,35')).split(',').map(function (x) { return x.trim(); }).indexOf(String(no)) >= 0;
}
function scan_(b, g) {
  var pts = points_(false), pt = null, i;
  for (i = 0; i < pts.length; i++) if (pts[i].id === String(b.pid)) pt = pts[i];
  if (!pt || !pt.active) return {ok: false, err: 'unknown_point'};
  var now = Date.now(), ts = now, flags = [];
  if (b.queued) {
    var c = Number(b.clientTs);
    if (c && c <= now + 60000 && now - c < 36 * 3600000) ts = c;
    flags.push('QUEUED');
  }
  var lat = num_(b.lat), lng = num_(b.lng), acc = num_(b.acc), dist = '', gps, skipG = gpsSkip_(pt.no);
  if (skipG) { gps = 'NOT_CHECKED'; }
  else if (lat == null || lng == null) { gps = 'NO_GPS'; flags.push('NO_GPS'); }
  else if (pt.lat == null || pt.lng == null) { gps = 'UNCALIBRATED'; }
  else {
    dist = Math.round(hav_(lat, lng, pt.lat, pt.lng));
    if (dist <= pt.radius + Math.min(acc || 0, 30)) gps = 'OK'; else { gps = 'OUTSIDE'; flags.push('OUTSIDE'); }
  }
  try {
    var sf = shiftAt_(ts), pl = roster_(sf.date, sf.code);
    if (pl.length && !g.danru && !onPlan_(pl, g.name)) flags.push('NOT_ON_PLAN');
  } catch (e0) {}
  if (acc != null && acc === 0) flags.push('SUSPECT_GPS');
  if (acc != null && acc > 50 && !skipG) flags.push('LOW_ACCURACY');
  var lock = LockService.getScriptLock(), sid = Utilities.getUuid().slice(0, 8), needPhoto = false;
  lock.waitLock(20000);
  try {
    var r = roundAt_(ts), prev = doneMap_(r);
    if (r.upcoming) flags.push('OFF_ROUND');
    needPhoto = !r.upcoming && !!photoSet_(r, pts)[pt.id];
    if (!r.upcoming && prev[pt.id]) flags.push('REPEAT');
    var recent = scans_(200);
    /* A scan that timed out on the phone may already have arrived. When the phone re-sends it, do not write it twice. */
    if (b.queued && Number(b.clientTs)) {
      var cts = Number(b.clientTs);
      for (i = recent.length - 1; i >= 0; i--) {
        var rw = recent[i], rms = Number(rw[17]);
        if (rms < cts - 10000) break;
        if (String(rw[4]) === g.name && String(rw[6]) === pt.id && rms <= cts + 180000) return {ok: true, gps: 'UNCALIBRATED', dist: '', flags: [], done: Object.keys(prev).length, total: pts.filter(function (q) { return q.active; }).length, round: roundAt_(Date.now()), needPhoto: false, scanId: String(rw[0]), dup: true};
      }
    }
    for (i = recent.length - 1; i >= 0; i--) {
      var row = recent[i], pms = Number(row[17]);
      if (ts - pms > 3600000) break;
      if (String(row[4]) === g.name && ts > pms) {
        var pp = null;
        pts.forEach(function (q) { if (q.id === String(row[6])) pp = q; });
        if (pp && pp.lat != null && pt.lat != null && pp.id !== pt.id && !skipG && !gpsSkip_(pp.no)) {
          var d2 = hav_(pp.lat, pp.lng, pt.lat, pt.lng), sec = (ts - pms) / 1000;
          if (d2 > 100 && d2 / sec > 5) flags.push('TOO_FAST');
        }
        break;
      }
    }
    var url = '', gotPhoto = false;
    if (b.photo && String(b.photo).length > 100 && String(b.photo).length < 6000000) {
      try { url = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(b.photo), 'image/jpeg', r.date + '_' + p2_(new Date(ts + OFF).getUTCHours()) + 'h' + p2_(new Date(ts + OFF).getUTCMinutes()) + '_' + pt.id + '_' + g.name + '.jpg')).getUrl(); gotPhoto = true; }
      catch (e2) { flags.push('PHOTO_FAIL'); }
    }
    if (needPhoto && !gotPhoto) flags.push('NO_PHOTO');
    sh_('Scans').appendRow([sid, ymdhms_(ts), r.date, r.label, g.name, g.role, pt.id, pt.no, pt.name, pt.zone,
      lat == null ? '' : lat, lng == null ? '' : lng, acc == null ? '' : Math.round(acc), dist, gps, flags.join(' '), url, ts]);
  } finally { lock.releaseLock(); }
  var cur = roundAt_(Date.now()), dn = doneMap_(cur);
  var quiet = quiet_();
  return {ok: true, gps: quiet ? 'UNCALIBRATED' : gps, dist: quiet ? '' : dist, flags: quiet ? [] : flags, done: Object.keys(dn).length, total: pts.filter(function (q) { return q.active; }).length, round: cur, needPhoto: needPhoto && !gotPhoto && !b.queued, scanId: sid, off: !!r.upcoming};
}
/* A photo sent after the scan (the phone only learns that a photo is wanted when the scan is accepted). Removes the NO_PHOTO flag. */
function photo_(b, me) {
  var photo = String(b.photo || '');
  if (photo.length < 100 || photo.length > 6000000) return {ok: false, err: 'bad_photo'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sh_('Scans'), last = sh.getLastRow();
    if (last < 2) return {ok: false, err: 'no_scan'};
    var st = Math.max(2, last - 300 + 1), v = sh.getRange(st, 1, last - st + 1, 18).getValues(), hit = -1, i;
    for (i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === String(b.scanId) && String(v[i][4]) === me.name) { hit = i; break; }
    if (hit < 0) return {ok: false, err: 'no_scan'};
    var row = v[hit];
    if (row[16]) return {ok: false, err: 'has_photo'};
    if (Date.now() - Number(row[17]) > 15 * 60000) return {ok: false, err: 'too_late'};
    var ts = Number(row[17]), url;
    try { url = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(photo), 'image/jpeg', row[2] + '_' + p2_(new Date(ts + OFF).getUTCHours()) + 'h' + p2_(new Date(ts + OFF).getUTCMinutes()) + '_' + row[6] + '_' + me.name + '.jpg')).getUrl(); }
    catch (e) { return {ok: false, err: 'photo_fail'}; }
    sh.getRange(st + hit, 17).setValue(url);
    sh.getRange(st + hit, 16).setValue(String(row[15]).split(' ').filter(function (f) { return f && f !== 'NO_PHOTO'; }).join(' '));
    return {ok: true};
  } finally { lock.releaseLock(); }
}


/* ---------- clock-in (shift start; no clock-out) ----------
   The Clock in button only appears on the phone inside the circle around the guard house (Config CLOCK_LAT, CLOCK_LNG, CLOCK_RADIUS m);
   the server checks the distance again, so a tap from outside is refused. Window: CLOCK_EARLY min before the shift start until CLOCK_AFTER min after.
   More than CLOCK_GRACE min after the start = LATE. One clock-in per guard per shift. Record only, never blocks patrolling. */
function clockCfg_() {
  return {lat: Number(cfg_('CLOCK_LAT', '3.131338')), lng: Number(cfg_('CLOCK_LNG', '99.347791')), r: Math.max(10, Number(cfg_('CLOCK_RADIUS', '100')) || 100),
    grace: Math.max(0, Number(cfg_('CLOCK_GRACE', '15')) || 0), early: Math.max(0, Number(cfg_('CLOCK_EARLY', '30')) || 0), after: Math.max(10, Number(cfg_('CLOCK_AFTER', '120')) || 120)};
}
function clockSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('Clock');
  if (!sh) {
    sh = s.insertSheet('Clock');
    sh.appendRow(HEAD.Clock);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.Clock.length).setFontWeight('bold');
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange('N:N').setNumberFormat('@');
  }
  return sh;
}
/* The shift whose clock-in window is open at ms (or null): {date, shift, label, start, opens, closes}. */
function clockWin_(ms, cfg) {
  var c = cfg || clockCfg_(), hours = {P: 7, S: 15, M: 23}, best = null;
  var base = new Date(ms + OFF), y = base.getUTCFullYear(), mo = base.getUTCMonth(), d = base.getUTCDate();
  for (var off = -1; off <= 1; off++) {
    Object.keys(hours).forEach(function (code) {
      var start = Date.UTC(y, mo, d + off, hours[code] - 7, 0, 0), opens = start - c.early * 60000, closes = start + c.after * 60000;
      if (ms >= opens && ms <= closes) best = {date: new Date(start + OFF).toISOString().slice(0, 10), shift: code, label: SHIFTS[code], start: start, opens: opens, closes: closes};
    });
  }
  return best;
}
function clockKey_(date, shift, name) { return date + '|' + shift + '|' + String(name).toLowerCase(); }
function clockRows_() {
  var sh = clockSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 14).getValues().map(function (r) {
    var k = String(r[13] || '').split('|');
    return {date: k[0] || '', shift: k[1] || String(r[1]), guard: String(r[2]), role: String(r[3]), at: String(r[4]), status: String(r[9]), late: Number(r[10]) || 0, by: String(r[11]), ms: Number(r[12]) || 0, key: String(r[13])};
  });
}
function clockMine_(date, shift, name) {
  var key = clockKey_(date, shift, name), hit = null, sh = clockSheet_(), n = sh.getLastRow();
  if (n < 2) return null;
  var st = Math.max(2, n - 150 + 1);
  sh.getRange(st, 14, n - st + 1, 1).getValues().forEach(function (r) { if (String(r[0]) === key) hit = true; });
  if (!hit) return null;
  hit = null;
  clockRows_().forEach(function (r) { if (r.key === key) hit = r; });
  return hit;
}
function clockState_(me) {
  try {
    var now = Date.now(), c = clockCfg_(), w = clockWin_(now, c), cur = shiftAt_(now), tgt = w ? {date: w.date, shift: w.shift} : {date: cur.date, shift: cur.code};
    var mine = clockMine_(tgt.date, tgt.shift, me.name);
    var nx = null;
    if (!w) { [7, 15, 23].forEach(function (hh) { for (var off = -1; off <= 2; off++) { var op = Date.UTC(new Date(now + OFF).getUTCFullYear(), new Date(now + OFF).getUTCMonth(), new Date(now + OFF).getUTCDate() + off, hh - 7, 0, 0) - c.early * 60000; if (op > now && (nx === null || op < nx)) nx = op; } }); }
    return {open: !!w && !mine, nextOpens: nx, win: w ? {date: w.date, shift: w.shift, label: w.label, opens: w.opens, closes: w.closes} : null, shift: tgt.shift, date: tgt.date, label: SHIFTS[tgt.shift],
      mine: mine ? {at: mine.at.slice(11, 16), status: mine.status, late: mine.late} : null, gate: {lat: c.lat, lng: c.lng, r: c.r}};
  } catch (e) { return {open: false, win: null, mine: null}; }
}
function clockIn_(b, me) {
  var now = Date.now(), c = clockCfg_(), w = clockWin_(now);
  if (!w) return {ok: false, err: 'no_window'};
  var lat = num_(b.lat), lng = num_(b.lng), acc = num_(b.acc);
  if (lat == null || lng == null) return {ok: false, err: 'not_here'};
  var dist = Math.round(hav_(lat, lng, c.lat, c.lng));
  if (dist > c.r + Math.min(acc || 0, 30)) return {ok: false, err: 'not_here'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ex = clockMine_(w.date, w.shift, me.name);
    if (ex) return {ok: true, already: true, at: ex.at.slice(11, 16), status: ex.status, late: ex.late};
    var late = Math.max(0, Math.round((now - w.start) / 60000)), status = late > c.grace ? 'LATE' : 'ON_TIME';
    clockSheet_().appendRow([w.date, w.shift, me.name, me.role, ymdhms_(now), lat, lng, acc == null ? '' : Math.round(acc), dist, status, late, 'Self', now, clockKey_(w.date, w.shift, me.name)]);
    return {ok: true, at: ymdhms_(now).slice(11, 16), status: status, late: late};
  } finally { lock.releaseLock(); }
}
/* Danru / Admin records a clock-in by hand for the shift that is open (or running now); marked MANUAL. */
function clockManual_(name, by) {
  var now = Date.now(), w = clockWin_(now), cur = shiftAt_(now), date = w ? w.date : cur.date, shift = w ? w.shift : cur.code, start = w ? w.start : null;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ex = clockMine_(date, shift, name.name);
    if (ex) return {ok: true, already: true, status: ex.status, shift: shift};
    clockSheet_().appendRow([date, shift, name.name, name.role, ymdhms_(now), '', '', '', '', 'MANUAL', start ? Math.max(0, Math.round((now - start) / 60000)) : '', by, now, clockKey_(date, shift, name.name)]);
    return {ok: true, status: 'MANUAL', shift: shift, date: date};
  } finally { lock.releaseLock(); }
}

/* Guards (and buddies) on the shift plan with no clock-in, for shifts whose start + grace has passed. */
function clockMissing_(fromD, to) {
  var out = [], c = clockCfg_(), now = Date.now(), hours = {P: 7, S: 15, M: 23}, have = {};
  clockRows_().forEach(function (r) { have[r.key] = 1; });
  var dd = Date.parse(fromD + 'T00:00:00Z'), end = Date.parse(to + 'T00:00:00Z'), cnt = 0;
  for (; dd <= end && cnt < 31; dd += 86400000, cnt++) {
    var ds = new Date(dd).toISOString().slice(0, 10);
    Object.keys(hours).forEach(function (code) {
      var start = Date.UTC(new Date(dd).getUTCFullYear(), new Date(dd).getUTCMonth(), new Date(dd).getUTCDate(), hours[code] - 7, 0, 0);
      if (now < start + c.grace * 60000) return;
      roster_(ds, code).forEach(function (r) {
        [r.guard, r.buddy].forEach(function (nm) { if (nm && !have[clockKey_(ds, code, nm)]) out.push({date: ds, shift: code, guard: nm, duty: r.duty}); });
      });
    });
  }
  return out.slice(0, 200);
}


/* ---------- Timesheet (Form Kehadiran Reguler): Admin always; Danru only while Config TS_DANRU = yes (Admin > Timesheet switch) ----------
   One row per guard per day (sheet Timesheet, upserted by Key = date|guard). Days with no saved row are pre-filled from the real clock-in (sheet Clock) or, failing that, from the shift plan (Roster),
   using the shift hours in Config TS_P / TS_S / TS_M (default 07:00-15:00, 15:00-23:00, 23:00-07:00). The period runs from the 16th of the previous month to the 15th. */
function tsSheet_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName(name);
  if (!sh) {
    sh = s.insertSheet(name);
    sh.appendRow(HEAD[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD[name].length).setFontWeight('bold');
    if (name === 'Timesheet') sh.getRange('A:E').setNumberFormat('@');
    if (name === 'Staff') sh.getRange('A:B').setNumberFormat('@');
  }
  return sh;
}
function tsMin_(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '')); if (!m) return null; var h = Number(m[1]), mi = Number(m[2]); return h < 24 && mi < 60 ? h * 60 + mi : null; }
function tsHours_(st, en) {
  var a = tsMin_(st), b = tsMin_(en);
  if (a == null || b == null) return '';
  var d = b - a; if (d <= 0) d += 1440;
  return Math.round(d / 6) / 10;
}
function tsShiftTimes_() {
  var out = {};
  [['P', '07:00-15:00'], ['S', '15:00-23:00'], ['M', '23:00-07:00']].forEach(function (x) { var v = String(cfg_('TS_' + x[0], x[1])).split('-'); out[x[0]] = {start: (v[0] || '').trim(), end: (v[1] || '').trim()}; });
  return out;
}
function tsPeriod_(ym) {
  var m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(ym || ''));
  if (!m) { var now = new Date(Date.now() + OFF), y = now.getUTCFullYear(), mo = now.getUTCMonth() + 1; if (now.getUTCDate() > 15) { mo++; if (mo > 12) { mo = 1; y++; } } m = [0, String(y), p2_(mo)]; }
  var y2 = Number(m[1]), mo2 = Number(m[2]), py = mo2 === 1 ? y2 - 1 : y2, pm = mo2 === 1 ? 12 : mo2 - 1;
  return {ym: m[1] + '-' + m[2], from: py + '-' + p2_(pm) + '-16', to: m[1] + '-' + m[2] + '-15'};
}
function npkOf_(name) {
  var sh = sh_('Staff'), k = String(name).toLowerCase();
  if (!sh || sh.getLastRow() < 2) return '';
  var hit = '';
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) { if (String(r[0]).toLowerCase() === k) hit = String(r[1] || ''); });
  return hit;
}
function setNpk_(name, npk) {
  var sh = tsSheet_('Staff'), n = sh.getLastRow(), k = String(name).toLowerCase();
  if (n >= 2) { var v = sh.getRange(2, 1, n - 1, 1).getValues(); for (var i = 0; i < v.length; i++) if (String(v[i][0]).toLowerCase() === k) { sh.getRange(i + 2, 2).setValue(npk); return; } }
  sh.appendRow([name, npk]);
}
function tsNotes_() { return String(cfg_('TS_NOTES', 'OFF,HARI LIBUR NASIONAL,CUTI,CUTI TAHUNAN,CUTI BERSAMA,SAKIT,IZIN,ALPHA,LIBUR PENGGANTI,LEMBUR,TUKAR SHIFT,PENGGANTI,TERLAMBAT,PULANG CEPAT,TRAINING,DINAS LUAR')).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; }).slice(0, 40); }
function timesheet_(a, b, by) {
  var all = guards_().sort(function (x, y) { return x.name.localeCompare(y.name); });
  if (a === 'a_ts_get') {
    var per = tsPeriod_(b.ym);
    if (!b.guard) return {ok: true, guards: all.map(function (g) { return g.name; }), period: per, danruOn: cfg_('TS_DANRU', 'no') === 'yes', notes: tsNotes_()};
    var g = null; all.forEach(function (x) { if (x.name.toLowerCase() === String(b.guard).toLowerCase()) g = x; });
    if (!g) return {ok: false, err: 'bad_guard'};
    var key = g.name.toLowerCase(), saved = {}, sh = sh_('Timesheet');
    if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues().forEach(function (r) { var k = String(r[0]); if (k.slice(-key.length - 1) === '|' + key) saved[String(r[1])] = {start: String(r[3] || ''), end: String(r[4] || ''), note: String(r[6] || '')}; });
    var clock = {}, cin = {}; clockRows_().forEach(function (r) { if (r.guard.toLowerCase() === key) { clock[r.date] = r.shift; cin[r.date] = String(r.at || '').slice(11, 16); } });
    var tm = tsShiftTimes_(), days = [], d = Date.parse(per.from + 'T00:00:00Z'), end = Date.parse(per.to + 'T00:00:00Z');
    for (; d <= end; d += 86400000) {
      var ds = new Date(d).toISOString().slice(0, 10), row = {date: ds, start: '', end: '', hours: '', note: '', src: '', cin: cin[ds] || ''};
      if (saved[ds]) { row.start = saved[ds].start; row.end = saved[ds].end; row.note = saved[ds].note; row.src = 'saved'; }
      else {
        var code = clock[ds] || null, src = 'clock';
        if (!code) { src = 'plan'; ['P', 'S', 'M'].forEach(function (c) { if (!code && onPlan_(roster_(ds, c), g.name)) code = c; }); }
        if (code && tm[code]) { row.start = tm[code].start; row.end = tm[code].end; row.src = src; }
      }
      row.hours = tsHours_(row.start, row.end);
      days.push(row);
    }
    return {ok: true, guard: g.name, role: g.role, npk: npkOf_(g.name), project: cfg_('TS_PROJECT', 'ECOOILS'), period: per, days: days, danruOn: cfg_('TS_DANRU', 'no') === 'yes', notes: tsNotes_(), guards: all.map(function (x) { return x.name; })};
  }
  if (a === 'a_ts_reset') {
    /* Forget the saved rows of one guard (or everyone when no guard is given) for the period, so the days go back to the automatic pre-fill. NPK numbers are kept. */
    var per2 = tsPeriod_(b.ym), only = b.guard ? String(b.guard).toLowerCase() : '', removed = 0;
    if (only) { var okg = false; all.forEach(function (x) { if (x.name.toLowerCase() === only) okg = true; }); if (!okg) return {ok: false, err: 'bad_guard'}; }
    var lk0 = LockService.getScriptLock();
    lk0.waitLock(20000);
    try {
      var sh0 = sh_('Timesheet');
      if (sh0 && sh0.getLastRow() >= 2) {
        var v0 = sh0.getRange(2, 1, sh0.getLastRow() - 1, 3).getValues();
        for (var z = v0.length - 1; z >= 0; z--) {
          var dd0 = String(v0[z][1]), who0 = String(v0[z][2]).toLowerCase();
          if (dd0 >= per2.from && dd0 <= per2.to && (!only || who0 === only)) { sh0.deleteRow(z + 2); removed++; }
        }
      }
    } finally { lk0.releaseLock(); }
    return {ok: true, removed: removed};
  }
  if (a === 'a_ts_all') {
    var outAll = [];
    all.forEach(function (g0) { var r0 = timesheet_('a_ts_get', {guard: g0.name, ym: b.ym}, by); if (r0.ok) { delete r0.guards; delete r0.notes; outAll.push(r0); } });
    return {ok: true, period: tsPeriod_(b.ym), items: outAll, notes: tsNotes_(), danruOn: cfg_('TS_DANRU', 'no') === 'yes'};
  }
  /* a_ts_save (one guard) and a_ts_saveall (every guard in one go): validate everything first, then write under one lock */
  var items = a === 'a_ts_saveall' ? (b.items instanceof Array ? b.items : []) : [{guard: b.guard, npk: b.npk, rows: b.rows}];
  if (items.length > 80) return {ok: false, err: 'too_many'};
  var jobs = [], total = 0;
  for (var q = 0; q < items.length; q++) {
    var it = items[q] || {}, gg = null;
    all.forEach(function (x) { if (x.name.toLowerCase() === String(it.guard || '').toLowerCase()) gg = x; });
    if (!gg) return {ok: false, err: 'bad_guard'};
    var rows = it.rows instanceof Array ? it.rows : [];
    if (rows.length > 40) return {ok: false, err: 'too_many'};
    var clean = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {}, dt = String(r.date || ''), st = String(r.start || '').trim(), en = String(r.end || '').trim(), nt = String(r.note || '').trim().slice(0, 60);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || isNaN(Date.parse(dt + 'T00:00:00Z'))) return {ok: false, err: 'bad_date'};
      if ((st && tsMin_(st) == null) || (en && tsMin_(en) == null)) return {ok: false, err: 'bad_time'};
      clean.push({date: dt, start: st, end: en, note: nt});
    }
    jobs.push({gg: gg, clean: clean, npk: it.npk});
    total += clean.length;
  }
  var lk = LockService.getScriptLock();
  lk.waitLock(20000);
  try {
    var sh2 = tsSheet_('Timesheet'), n = sh2.getLastRow(), idx = {}, now = Date.now();
    if (n >= 2) sh2.getRange(2, 1, n - 1, 1).getValues().forEach(function (x, j) { idx[String(x[0])] = j + 2; });
    jobs.forEach(function (jb) {
      var k2 = jb.gg.name.toLowerCase();
      jb.clean.forEach(function (c) {
        var key2 = c.date + '|' + k2, vals = [key2, c.date, jb.gg.name, c.start, c.end, tsHours_(c.start, c.end), c.note, by || 'Admin', now];
        if (idx[key2]) sh2.getRange(idx[key2], 1, 1, 9).setValues([vals]); else { sh2.appendRow(vals); idx[key2] = sh2.getLastRow(); }
      });
      if (jb.npk != null) setNpk_(jb.gg.name, String(jb.npk).trim().slice(0, 30));
    });
  } finally { lk.releaseLock(); }
  return {ok: true, saved: total, guards: jobs.length};
}

/* ---------- weather hold (Danru / Shift Supervisor / Admin) ----------
   While a hold is on, rounds are paused for safety: a round that overlaps a hold is EXCUSED (no missed-round email, not counted in coverage).
   Scans still count if guards do them. A hold ends by itself after HOLD_MAX_HOURS (Config, default 2) so it can never be left on by mistake.
   Sheet Hold is an append-only log of START / END events. */
function holdSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('Hold');
  if (!sh) {
    sh = s.insertSheet('Hold');
    sh.appendRow(HEAD.Hold);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.Hold.length).setFontWeight('bold');
  }
  return sh;
}
function holdIntervals_() {
  var sh = holdSheet_(), n = sh.getLastRow(), out = [], open = null, maxMs = Math.max(1, Number(cfg_('HOLD_MAX_HOURS', '2')) || 2) * 3600000, now = Date.now();
  if (n >= 2) sh.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) {
    var act = String(r[1]), ms = Number(r[4]) || 0;
    if (act === 'START' && !open) open = {start: ms, end: null, by: String(r[2]), reason: String(r[3]), auto: false};
    else if (act === 'END' && open) { open.end = Math.min(ms, open.start + maxMs); out.push(open); open = null; }
  });
  if (open) { var lim = open.start + maxMs; open.end = now < lim ? null : lim; open.auto = now >= lim; out.push(open); }
  return out;
}
function holdActive_() {
  var cur = null;
  holdIntervals_().forEach(function (i) { if (i.end == null) cur = i; });
  return cur;
}
function holdPublic_() {
  try { var h = holdActive_(); return h ? {on: true, since: h.start, by: h.by, reason: h.reason} : {on: false}; } catch (e) { return {on: false}; }
}
/* True when a hold was on at any moment during round r. */
function roundHeld_(r) {
  var held = false, now = Date.now();
  holdIntervals_().forEach(function (i) { var end = i.end == null ? now : i.end; if (i.start < r.end && end > r.start) held = true; });
  return held;
}
function holdSet_(on, by, reason) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cur = holdActive_(), now = Date.now();
    if (on && cur) return {ok: true, already: true, hold: holdPublic_()};
    if (!on && !cur) return {ok: true, already: true, hold: holdPublic_()};
    holdSheet_().appendRow([ymdhms_(now), on ? 'START' : 'END', by, String(reason || 'Weather').slice(0, 80), now]);
    return {ok: true, hold: holdPublic_()};
  } finally { lock.releaseLock(); }
}

/* ---------- short low-resolution video (weather / conditions), stored in Google Drive ---------- */
function videoFolder_() { return driveFolder_('VIDEO_FOLDER', 'EcoOils Patrol Videos'); }
function videoSave_(b, me) {
  var v = String(b.video || ''), mime = String(b.mime || '').toLowerCase().indexOf('mp4') >= 0 ? 'video/mp4' : 'video/webm', secs = Math.round(Number(b.sec) || 0);
  if (v.length < 100 || v.length > 12000000) return {ok: false, err: 'bad_video'};
  var now = Date.now(), ymd = ymdhms_(now), note = String(b.note || 'Conditions').slice(0, 60), url;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    try { url = videoFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(v), mime, ymd.slice(0, 10) + '_' + ymd.slice(11, 13) + 'h' + ymd.slice(14, 16) + '_' + me.name + (mime === 'video/mp4' ? '.mp4' : '.webm'))).getUrl(); }
    catch (e) { return {ok: false, err: 'video_fail'}; }
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Videos');
    if (!sh) { sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Videos'); sh.appendRow(HEAD.Videos); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEAD.Videos.length).setFontWeight('bold'); }
    sh.appendRow([ymd, me.name, me.role, secs, note, url, now]);
    return {ok: true};
  } finally { lock.releaseLock(); }
}
function videoRows_(fromD, to) {
  var sh = sh_('Videos');
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues().map(function (r) {
    var ms = Number(r[6]) || 0;
    return {t: ms ? ymdhms_(ms) : String(r[0]), guard: String(r[1]), sec: Number(r[3]) || 0, note: String(r[4]), link: String(r[5]), date: ms ? ymdhms_(ms).slice(0, 10) : String(r[0]).slice(0, 10)};
  }).filter(function (x) { return x.date >= fromD && x.date <= to; }).reverse().slice(0, 100);
}

/* ---------- Danru team management (Danru PIN or admin PIN) ---------- */
function team_(a, b) {
  var adm = false, me = null;
  if (b.pin) { adm = adminOk_(b.pin); if (!adm) return {ok: false, err: locked_('fp', 10) ? 'locked' : 'auth'}; }
  else {
    if (locked_('fg', 20)) return {ok: false, err: 'locked'};
    me = guardByPin_(b.gp);
    if (!me || !me.danru) return {ok: false, err: 'auth'};
  }
  var all = guardsAll_(), sh = sh_('Guards');
  function find(name) { var h = null, k = String(name || '').trim().toLowerCase(); all.forEach(function (g) { if (g.name.toLowerCase() === k) h = g; }); return h; }
  function setPin(g) {
    var pin = newPin_();
    sh.getRange(g.row, 4).setValue(hash_(pin));
    sh.getRange(g.row, 6).setValue(ymdhms_(Date.now()));
    return pin;
  }
  if (a === 'd_ts_get' || a === 'd_ts_save' || a === 'd_ts_all' || a === 'd_ts_saveall' || a === 'd_ts_reset') {
    if (!adm && cfg_('TS_DANRU', 'no') !== 'yes') return {ok: false, err: 'ts_off'};
    return timesheet_('a_' + a.slice(2), b, adm ? 'Admin' : me.name);
  }
  if (a === 'd_hold') return holdSet_(b.on === true, adm ? 'Admin' : me.name, b.reason);
  if (a === 'd_clock') {
    var tg = find(b.name);
    if (!tg || !tg.active) return {ok: false, err: 'bad_guard'};
    return clockManual_(tg, adm ? 'Admin' : me.name);
  }
  if (a === 'd_list') {
    return {ok: true, admin: adm, me: me ? me.name : '', members: all.map(function (g) { return {name: g.name, role: g.role, active: g.active, danru: g.danru, hasPin: !!g.hash, setAt: g.setAt}; })};
  }
  if (a === 'd_plan_get') {
    var now = shiftAt_(Date.now()), pd = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? String(b.date) : now.date, pc = SHIFTS[b.shift] ? String(b.shift) : now.code;
    return {ok: true, date: pd, shift: pc, label: SHIFTS[pc], now: now, shifts: SHIFTS, duties: dutyList_(), rows: roster_(pd, pc), day: dayPlan_(pd),
      guards: all.filter(function (g) { return g.active; }).map(function (g) { return g.name; })};
  }
  if (a === 'd_plan_set') {
    var nw = shiftAt_(Date.now()), dt = String(b.date || ''), sc = String(b.shift || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dt) || isNaN(Date.parse(dt + 'T00:00:00Z'))) return {ok: false, err: 'bad_date'};
    var dd = (Date.parse(dt + 'T00:00:00Z') - Date.parse(nw.date + 'T00:00:00Z')) / 86400000;
    if (dd < -1 || dd > 14) return {ok: false, err: 'bad_date'};
    if (!SHIFTS[sc]) return {ok: false, err: 'bad_shift'};
    var inRows = b.rows instanceof Array ? b.rows : [];
    if (inRows.length > 30) return {ok: false, err: 'too_many'};
    var duties = dutyList_(), used = {}, clean = [], warn = [];
    function who(v) { var h = find(v); return h && h.active ? h.name : null; }
    for (var qi = 0; qi < inRows.length; qi++) {
      var ir = inRows[qi] || {};
      if (!ir.guard) continue;
      if (duties.indexOf(String(ir.duty)) < 0) return {ok: false, err: 'bad_duty'};
      var gn = who(ir.guard);
      if (!gn) return {ok: false, err: 'bad_guard'};
      var bn = '';
      if (ir.buddy) { bn = who(ir.buddy); if (!bn || bn === gn) return {ok: false, err: 'bad_buddy'}; }
      if (used[gn.toLowerCase()] || (bn && used[bn.toLowerCase()])) return {ok: false, err: 'dup_person'};
      used[gn.toLowerCase()] = 1; if (bn) used[bn.toLowerCase()] = 1;
      clean.push([dt, sc, String(ir.duty), gn, bn]);
      if (sc === 'M' && !bn) warn.push(String(ir.duty));
    }
    var stamp = Date.now(), by = me ? me.name : 'Admin', lk = LockService.getScriptLock();
    lk.waitLock(20000);
    try {
      var rs = rosterSheet_();
      rs.getRange('A:B').setNumberFormat('@');
      if (!clean.length) rs.appendRow([dt, sc, '', '', '', by, ymdhms_(stamp), stamp]);
      clean.forEach(function (c) { rs.appendRow(c.concat([by, ymdhms_(stamp), stamp])); });
      ROSM_ = null;
    } finally { lk.releaseLock(); }
    return {ok: true, saved: clean.length, warn: warn};
  }
  if (a === 'd_add') {
    var nm = String(b.name || '').replace(/\s+/g, ' ').trim();
    if (nm.length < 2 || nm.length > 40) return {ok: false, err: 'bad_name'};
    if (find(nm)) return {ok: false, err: 'dup'};
    var role = adm && b.role ? String(b.role).trim().slice(0, 30) : 'Security Guard';
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      sh.appendRow([nm, role, 'Yes', '', 'No', '']);
      all = guardsAll_();
      var g = find(nm), pin = setPin(g);
      return {ok: true, name: g.name, pin: pin};
    } finally { lock.releaseLock(); }
  }
  var t = find(b.name);
  if (!t) return {ok: false, err: 'unknown_guard'};
  /* Only the admin may touch a Danru account (a Danru cannot take over a colleague's login). */
  if (t.danru && !adm) return {ok: false, err: 'danru_locked'};
  if (a === 'd_reset') return {ok: true, name: t.name, pin: setPin(t)};
  if (a === 'd_active') {
    if (me && me.name === t.name) return {ok: false, err: 'self'};
    sh.getRange(t.row, 3).setValue(b.active ? 'Yes' : 'No');
    return {ok: true};
  }
  if (a === 'd_danru' && adm) {
    sh.getRange(t.row, 5).setValue(b.danru ? 'Yes' : 'No');
    return {ok: true};
  }
  return {ok: false, err: 'action'};
}

/* ---------- admin ---------- */
function admin_(a, b) {
  if (a.indexOf('a_award') === 0) { try { return award_(a, b); } catch (e) { return {ok: false, err: String(e.message || e)}; } }
  if (a === 'a_live') {
    var r = b.date ? roundBy_(String(b.date), Number(b.idx)) : roundAt_(Date.now());
    var pts = points_(true), d = doneMap_(r), ps = photoSet_(r, pts);
    return {ok: true, held: roundHeld_(r), hold: holdPublic_(), round: r, total: pts.length,
      done: pts.filter(function (p) { return d[p.id]; }).map(function (p) { return {no: p.no, name: p.name, zone: p.zone, t: d[p.id].t, by: d[p.id].by, flags: d[p.id].flags, gps: d[p.id].gps, photo: d[p.id].photo, pc: !!ps[p.id], hi: p.hi, lat: p.lat, lng: p.lng}; }),
      missed: pts.filter(function (p) { return !d[p.id]; }).map(function (p) { return {no: p.no, name: p.name, zone: p.zone, hi: p.hi, pc: !!ps[p.id], lat: p.lat, lng: p.lng}; })};
  }
  if (a === 'a_history') {
    var from = String(b.from || ''), to = String(b.to || from), rows = [];
    scans_(6000).forEach(function (r2) {
      var dt = rowWhen_(r2).date;
      if (dt >= from && dt <= to) rows.push({t: r2[1] instanceof Date ? ymdhms_(Number(r2[17])) : String(r2[1]), round: String(r2[3]), guard: String(r2[4]), no: r2[7], name: String(r2[8]), gps: String(r2[14]), dist: r2[13], acc: r2[12], flags: String(r2[15]), photo: String(r2[16] || '')});
    });
    return {ok: true, rows: rows.slice(-2000)};
  }
  if (a === 'a_stats') {
    var to = String(b.to || ymdhms_(Date.now()).slice(0, 10)), fromD = String(b.from || ymdhms_(Date.now() - 6 * 86400000).slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromD) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || fromD > to) return {ok: false, err: 'bad_date'};
    var nowMs = Date.now(), heldN = 0, rs = [], dd = Date.parse(fromD + 'T00:00:00Z'), end = Date.parse(to + 'T00:00:00Z'), cnt = 0;
    for (; dd <= end && cnt < 92; dd += 86400000, cnt++) {
      var ds = new Date(dd).toISOString().slice(0, 10);
      for (var ri = 0; ri < ROUNDS.length; ri++) { var rr = roundBy_(ds, ri); if (rr.start <= nowMs) { if (roundHeld_(rr)) heldN++; else rs.push(ds + '|' + ri); } }
    }
    var OG = {}, OP = {}, pts2 = points_(true), P = {}, G = {}, total = 0, sh2 = sh_('Scans'), last2 = sh2.getLastRow(), full = {};
    pts2.forEach(function (p) { P[p.id] = {no: p.no, name: p.name, zone: p.zone, hi: p.hi, cal: p.lat != null, rounds: {}, scans: 0, issues: 0, noGps: 0, photos: 0, lastMs: 0, lastBy: ''}; });
    if (last2 >= 2) sh2.getRange(2, 1, last2 - 1, 18).getValues().forEach(function (r3) {
      var wh = rowWhen_(r3), dt = wh.date;
      if (dt < fromD || dt > to) return;
      var o = P[String(r3[6])];
      if (!o) return;
      var fl = String(r3[15]).split(' ').filter(String), key = dt + '|' + wh.idx;
      o.rounds[key] = 1; total++; o.scans++;
      if (fl.some(function (f) { return f !== 'REPEAT' && f !== 'QUEUED'; })) o.issues++;
      if (fl.indexOf('NO_GPS') >= 0) o.noGps++;
      if (r3[16]) o.photos++;
      var ms = Number(r3[17]) || 0;
      if (ms >= o.lastMs) { o.lastMs = ms; o.lastBy = String(r3[4]); }
      var gg = G[String(r3[4])] || (G[String(r3[4])] = {guard: String(r3[4]), scans: 0, issues: 0, noGps: 0});
      gg.scans++;
      if (fl.some(function (f) { return f !== 'REPEAT' && f !== 'QUEUED'; })) gg.issues++;
      if (fl.indexOf('NO_GPS') >= 0) gg.noGps++;
      if (String(r3[14]) === 'OUTSIDE') {
        var og = OG[String(r3[4])] || (OG[String(r3[4])] = {guard: String(r3[4]), n: 0, dist: 0, acc: 0}), op = OP[o.no] || (OP[o.no] = {no: o.no, name: o.name, n: 0, dist: 0, who: {}});
        og.n++; og.dist += Number(r3[13]) || 0; og.acc += Number(r3[12]) || 0; op.n++; op.dist += Number(r3[13]) || 0; op.who[String(r3[4])] = 1;
      }
    });
    var n = rs.length, rows = Object.keys(P).map(function (k) {
      var o = P[k], c = rs.filter(function (x) { return o.rounds[x]; }).length;
      return {no: o.no, name: o.name, zone: o.zone, hi: o.hi, cal: o.cal, covered: c, rounds: n, pct: n ? Math.round(100 * c / n) : 0, scans: o.scans, issues: o.issues, noGps: o.noGps, photos: o.photos, last: o.lastMs ? ymdhms_(o.lastMs) : '', lastBy: o.lastBy};
    }).sort(function (x, y) { return x.pct - y.pct || x.no - y.no; });
    var clk = clockRows_().filter(function (x) { return x.date >= fromD && x.date <= to; }).sort(function (x, y) { return y.ms - x.ms; }).slice(0, 300).map(function (x) { return {date: x.date, shift: x.shift, guard: x.guard, at: x.at.slice(11, 16), status: x.status, late: x.late, by: x.by}; });
    var cmiss = clockMissing_(fromD, to);
    var coveredSum = rows.reduce(function (t, x) { return t + x.covered; }, 0);
    var outG = Object.keys(OG).map(function (k) { var x = OG[k]; return {guard: x.guard, n: x.n, avgDist: Math.round(x.dist / x.n), avgAcc: Math.round(x.acc / x.n)}; }).sort(function (x, y) { return y.n - x.n; }).slice(0, 10);
    var outP = Object.keys(OP).map(function (k) { var x = OP[k]; return {no: x.no, name: x.name, n: x.n, guards: Object.keys(x.who).length, avgDist: Math.round(x.dist / x.n)}; }).sort(function (x, y) { return y.n - x.n; }).slice(0, 10);
    return {ok: true, outside: {guards: outG, points: outP}, heldRounds: heldN, videos: videoRows_(fromD, to), clock: clk, clockMissing: cmiss, from: fromD, to: to, rounds: n, points: rows, guards: Object.keys(G).map(function (k) { return G[k]; }).sort(function (x, y) { return y.scans - x.scans; }),
      totals: {scans: total, pct: n && rows.length ? Math.round(100 * coveredSum / (n * rows.length)) : 0, calibrated: rows.filter(function (x) { return x.cal; }).length, points: rows.length, noGps: rows.reduce(function (t, x) { return t + x.noGps; }, 0), issues: rows.reduce(function (t, x) { return t + x.issues; }, 0)}};
  }
  if (a === 'a_ts_get' || a === 'a_ts_save' || a === 'a_ts_all' || a === 'a_ts_saveall' || a === 'a_ts_reset') return timesheet_(a, b, 'Admin');
  if (a === 'a_ts_danru') { setCfg_('TS_DANRU', b.on === true ? 'yes' : 'no'); return {ok: true, danruOn: b.on === true}; }
  if (a === 'a_points') {
    return {ok: true, points: points_(false).map(function (p) { return {id: p.id, no: p.no, seq: p.seq, name: p.name, zone: p.zone, cal: p.cal, radius: p.radius, active: p.active}; })};
  }
  if (a === 'a_radius') {
    var rad = Math.round(num_(b.radius));
    if (!(rad >= 5 && rad <= 200)) return {ok: false, err: 'bad_radius'};
    var h2 = null;
    points_(false).forEach(function (p) { if (p.id === String(b.pid)) h2 = p; });
    if (!h2) return {ok: false, err: 'unknown_point'};
    sh_('Points').getRange(h2.row, 6).setValue(rad);
    return {ok: true};
  }
  if (a === 'a_route') {
    /* Re-sequence the walking order: nearest neighbour from the first point, using calibrated GPS. Uncalibrated points go last in sticker order. */
    var all = points_(true).sort(function (x, y) { return x.no - y.no; });
    var withGps = all.filter(function (p) { return p.lat != null && p.lng != null; });
    var noGps = all.filter(function (p) { return p.lat == null || p.lng == null; });
    if (withGps.length < 2) return {ok: false, err: 'calibrate_first'};
    var order = [], cur = withGps.shift();
    order.push(cur);
    while (withGps.length) {
      var bi = 0, bd = 1e12;
      withGps.forEach(function (p, i) { var d = hav_(cur.lat, cur.lng, p.lat, p.lng); if (d < bd) { bd = d; bi = i; } });
      cur = withGps.splice(bi, 1)[0];
      order.push(cur);
    }
    order = order.concat(noGps);
    order.forEach(function (p, i) { sh_('Points').getRange(p.row, 13).setValue(i + 1); });
    return {ok: true, n: order.length, uncal: noGps.length};
  }
  if (a === 'a_calibrate') {
    var lat = num_(b.lat), lng = num_(b.lng);
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return {ok: false, err: 'bad_coords'};
    var hit = null;
    points_(false).forEach(function (p) { if (p.id === String(b.pid)) hit = p; });
    if (!hit) return {ok: false, err: 'unknown_point'};
    if (b.radius != null && num_(b.radius) >= 5 && num_(b.radius) <= 200) sh_('Points').getRange(hit.row, 6).setValue(Math.round(num_(b.radius)));
    sh_('Points').getRange(hit.row, 9, 1, 3).setValues([[lat, lng, ymdhms_(Date.now()) + ' (n=' + (b.n || '?') + ', ' + Math.round(Number(b.acc) || 0) + ' m)']]);
    return {ok: true};
  }
  if (a === 'a_config') {
    if (b.showNames != null) setCfg_('SHOW_NAMES', b.showNames ? 'yes' : 'no');
    if (b.photoN != null) { var pn = Math.round(Number(b.photoN)); if (!(pn >= 0 && pn <= 100)) return {ok: false, err: 'bad_number'}; setCfg_('PHOTO_PER_ROUND', String(pn)); }
    return {ok: true, showNames: cfg_('SHOW_NAMES', 'yes') === 'yes', photoN: photoN_()};
  }
  return {ok: false, err: 'action'};
}


/* ---------- Best Guard of the month (Admin only; random draw among guards who meet the criteria) ----------
   Criteria live in the Config sheet (all optional, Admin > Award can edit the numbers):
   AWARD_MIN_SCANS (default 0), AWARD_MIN_DAYS (default 0 = days with at least one scan), AWARD_MAX_ISSUES (blank = no limit),
   AWARD_ISSUE_FLAGS (default SUSPECT_GPS,TOO_FAST,PHOTO_FAIL,NO_PHOTO), AWARD_EXCLUDE_DANRU (default yes).
   Awards sheet is append-only: Draft rows (every draw), Announced row (what guards see). */
function awardsSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('Awards');
  if (!sh) {
    sh = s.insertSheet('Awards');
    sh.appendRow(HEAD.Awards);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.Awards.length).setFontWeight('bold');
    sh.getRange('A:A').setNumberFormat('@');
  }
  return sh;
}
function awardRows_() {
  var sh = awardsSheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 7).getValues().map(function (r) {
    var m = r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM') : String(r[0]);
    return {month: m, winner: String(r[1]), q: Number(r[2]) || 0, at: String(r[3]), by: String(r[4]), status: String(r[5]), ms: Number(r[6]) || 0};
  });
}
function awardCrit_() {
  var mi = String(cfg_('AWARD_MAX_ISSUES', '')).trim();
  return {
    minScans: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_SCANS', '0')) || 0)),
    minDays: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_DAYS', '0')) || 0)),
    maxIssues: mi === '' || !isFinite(Number(mi)) ? null : Math.max(0, Math.round(Number(mi))),
    issueFlags: cfg_('AWARD_ISSUE_FLAGS', 'SUSPECT_GPS,TOO_FAST,PHOTO_FAIL,NO_PHOTO').split(',').map(function (x) { return x.trim(); }).filter(String),
    excludeDanru: cfg_('AWARD_EXCLUDE_DANRU', 'yes').toLowerCase() !== 'no'
  };
}
function awardStats_(month) {
  var c = awardCrit_(), sh = sh_('Scans'), last = sh.getLastRow(), by = {}, eligible = {};
  guards_().forEach(function (g) { if (!(c.excludeDanru && g.danru)) eligible[g.name] = 1; });
  if (last >= 2) sh.getRange(2, 1, last - 1, 18).getValues().forEach(function (r) {
    if (rowWhen_(r).date.slice(0, 7) !== month) return;
    var fl = String(r[15]).split(' ');
    if (fl.indexOf('REPEAT') >= 0) return;
    var nm = String(r[4]);
    if (!eligible[nm]) return;
    var o = by[nm] || (by[nm] = {guard: nm, scans: 0, days: {}, issues: 0, photos: 0});
    o.scans++; o.days[String(r[2])] = 1;
    if (r[16]) o.photos++;
    if (fl.some(function (f) { return c.issueFlags.indexOf(f) >= 0; })) o.issues++;
  });
  var rows = Object.keys(by).map(function (k) {
    var o = by[k], days = Object.keys(o.days).length;
    var q = o.scans >= c.minScans && days >= c.minDays && (c.maxIssues == null || o.issues <= c.maxIssues) && o.scans > 0;
    return {guard: o.guard, scans: o.scans, days: days, issues: o.issues, photos: o.photos, q: q};
  }).sort(function (x, y) { return y.scans - x.scans || x.guard.localeCompare(y.guard); });
  return {criteria: c, rows: rows};
}
function awardPublic_() {
  try {
    var best = null;
    awardRows_().forEach(function (r) { if (r.status === 'Announced' && (!best || r.ms >= best.ms)) best = r; });
    return best ? {month: best.month, winner: best.winner} : null;
  } catch (e) { return null; }
}
function award_(a, b) {
  var month = String(b.month || '');
  if (a === 'a_award_set') {
    ['minScans:AWARD_MIN_SCANS', 'minDays:AWARD_MIN_DAYS'].forEach(function (p) {
      var k = p.split(':'), v = b[k[0]];
      if (v != null && v !== '') { v = Math.round(Number(v)); if (!(v >= 0 && v <= 100000)) throw new Error('bad_number'); setCfg_(k[1], String(v)); }
    });
    if (b.maxIssues != null) {
      if (b.maxIssues === '') setCfg_('AWARD_MAX_ISSUES', '');
      else { var mv = Math.round(Number(b.maxIssues)); if (!(mv >= 0 && mv <= 100000)) throw new Error('bad_number'); setCfg_('AWARD_MAX_ISSUES', String(mv)); }
    }
    return {ok: true, criteria: awardCrit_()};
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return {ok: false, err: 'bad_month'};
  var hist = awardRows_().filter(function (r) { return r.month === month; });
  var announced = hist.filter(function (r) { return r.status === 'Announced'; })[0] || null;
  if (a === 'a_award_get') {
    var st = awardStats_(month);
    return {ok: true, month: month, criteria: st.criteria, rows: st.rows, history: hist, announced: announced ? {winner: announced.winner, at: announced.at} : null};
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (announced) return {ok: false, err: 'announced'};
    if (a === 'a_award_draw') {
      var q = awardStats_(month).rows.filter(function (r) { return r.q; });
      if (!q.length) return {ok: false, err: 'no_qualifiers'};
      var win = q[Math.floor(Math.random() * q.length)].guard, now = Date.now();
      awardsSheet_().appendRow([month, win, q.length, ymdhms_(now), 'Admin', 'Draft', now]);
      return {ok: true, winner: win, qualifiers: q.length};
    }
    if (a === 'a_award_announce') {
      var drafts = hist.filter(function (r) { return r.status === 'Draft'; });
      if (!drafts.length) return {ok: false, err: 'no_draw'};
      var d = drafts[drafts.length - 1], t = Date.now();
      awardsSheet_().appendRow([month, d.winner, d.q, ymdhms_(t), 'Admin', 'Announced', t]);
      return {ok: true, winner: d.winner};
    }
  } finally { lock.releaseLock(); }
  return {ok: false, err: 'action'};
}

/* ---------- emails (English + Bahasa Indonesia) ---------- */
var ZNAME_ID = {GT: 'Gerbang / pintu masuk', FN: 'Pagar keliling', PL: 'Area pabrik', UT: 'Utilitas / tangki', LD: 'Area penyimpanan', BL: 'Bangunan', MP: 'Titik kumpul'};
var FLAGTXT = {
  en: {OUTSIDE: 'outside radius', NO_GPS: 'no GPS', SUSPECT_GPS: 'suspect GPS', LOW_ACCURACY: 'low GPS accuracy', NO_PHOTO: 'no photo', TOO_FAST: 'moved too fast', PHOTO_FAIL: 'photo failed', NOT_ON_PLAN: 'not on the shift plan'},
  id: {OUTSIDE: 'di luar radius', NO_GPS: 'tanpa GPS', SUSPECT_GPS: 'GPS mencurigakan', LOW_ACCURACY: 'akurasi GPS rendah', NO_PHOTO: 'tanpa foto', TOO_FAST: 'bergerak terlalu cepat', PHOTO_FAIL: 'foto gagal', NOT_ON_PLAN: 'tidak ada di rencana shift'}
};
var TXT = {
  en: {round: 'Round', done: 'Done', of: 'of', missed: 'Missed', notScanned: 'Points not scanned in this round', highFirst: 'high-risk first', high: 'HIGH RISK', no: 'No.', flagged: 'Flagged scans', away: 'm from point', daily: 'Daily patrol summary', tRound: 'Round', tDone: 'Done', tMiss: 'Missed', often: 'Points missed most often', missedIn: 'missed in', rounds: 'rounds', app: 'EcoOils Mentari Security Patrol', photoChecks: 'Photo checks (selfie)', photoTaken: 'photo taken', photoMissing: 'NO PHOTO', photoNone: 'not scanned', photoCol: 'Photo', photoTotal: 'Photo checks taken', photoLink: 'view'},
  id: {round: 'Ronde', done: 'Selesai', of: 'dari', missed: 'Terlewat', notScanned: 'Titik yang tidak dipindai pada ronde ini', highFirst: 'risiko tinggi lebih dulu', high: 'RISIKO TINGGI', no: 'No.', flagged: 'Pemindaian bertanda', away: 'm dari titik', daily: 'Ringkasan patroli harian', tRound: 'Ronde', tDone: 'Selesai', tMiss: 'Terlewat', often: 'Titik yang paling sering terlewat', missedIn: 'terlewat pada', rounds: 'ronde', app: 'Patroli Keamanan EcoOils Mentari', photoChecks: 'Pemeriksaan foto (selfie)', photoTaken: 'foto diambil', photoMissing: 'TANPA FOTO', photoNone: 'tidak dipindai', photoCol: 'Foto', photoTotal: 'Pemeriksaan foto terambil', photoLink: 'lihat'}
};
/* GPS_QUIET (Config, default yes): while points are being calibrated, guards are not told about GPS problems (the scan screen just says Recorded)
   and addresses after the first in NOTIFY_EMAIL get emails without GPS flags. The first address (owner) and the Admin screens see everything. Set GPS_QUIET to no to switch off. */
function quiet_() { return cfg_('GPS_QUIET', 'yes').toLowerCase() !== 'no'; }
var GPS_FLAGS = ['NO_GPS', 'OUTSIDE', 'SUSPECT_GPS', 'LOW_ACCURACY'];
function hideGps_(list) {
  var out = [];
  list.forEach(function (f) {
    var k = f.flags.filter(function (x) { return GPS_FLAGS.indexOf(x) < 0; });
    if (k.length) out.push({t: f.t, guard: f.guard, no: f.no, name: f.name, flags: k, dist: ''});
  });
  return out;
}
function sendTo_(subject, htmlFull, htmlQuiet) {
  var all = cfg_('NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!all.length) return;
  if (!quiet_() || all.length < 2 || htmlQuiet === undefined) { MailApp.sendEmail({to: all.join(','), subject: subject, htmlBody: htmlFull}); return; }
  MailApp.sendEmail({to: all[0], subject: subject, htmlBody: htmlFull});
  if (htmlQuiet) MailApp.sendEmail({to: all.slice(1).join(','), subject: subject, htmlBody: htmlQuiet});
}
function send_(subject, html) {
  var to = cfg_('NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my');
  MailApp.sendEmail({to: to, subject: subject, htmlBody: html});
}
function both_(enHtml, idHtml) {
  return '<div style="font-family:Arial,sans-serif;font-size:14px">' + enHtml + '<hr style="margin:18px 0;border:0;border-top:2px solid #999">' + idHtml + '</div>';
}
function groupHtml_(arr, L) {
  var h = '', T = TXT[L], Z = L === 'id' ? ZNAME_ID : ZNAME;
  ZORDER.forEach(function (z) {
    var items = arr.filter(function (p) { return p.zone === z; });
    if (!items.length) return;
    h += '<p style="margin:8px 0 2px"><b>' + esc_(Z[z]) + '</b></p><ul style="margin:0">';
    items.forEach(function (p) { h += '<li>' + (p.hi ? '<b>[' + T.high + '] ' : '') + T.no + ' ' + p.no + ' ' + esc_(p.name) + (p.hi ? '</b>' : '') + '</li>'; });
    h += '</ul>';
  });
  return h;
}
function flagged_(r) {
  var out = [];
  scans_(1500).forEach(function (row) {
    var ms = Number(row[17]);
    if (ms < r.start || ms >= r.end) return;
    var f = String(row[15]).split(' ').filter(function (x) { return x && x !== 'QUEUED' && x !== 'REPEAT'; });
    if (f.length) out.push({t: String(row[1]), guard: String(row[4]), no: row[7], name: String(row[8]), flags: f, dist: row[13]});
  });
  return out;
}
function photoChecks_(r, pts, rows) {
  rows = rows || scans_(1500);
  var set = photoSet_(r, pts), out = [];
  pts.filter(function (p) { return set[p.id]; }).forEach(function (p) {
    var st = 'none', by = '', url = '';
    rows.forEach(function (row) {
      var ms = Number(row[17]);
      if (ms >= r.start && ms < r.end && String(row[6]) === p.id) {
        by = String(row[4]);
        if (row[16]) { st = 'taken'; url = String(row[16]); } else if (st !== 'taken') st = 'missing';
      }
    });
    out.push({no: p.no, name: p.name, status: st, by: by, url: url});
  });
  return out.sort(function (a, b) { return a.no - b.no; });
}
function photoHtml_(list, L) {
  if (!list.length) return '';
  var T = TXT[L], taken = list.filter(function (x) { return x.status === 'taken'; }).length;
  var h = '<p style="margin:12px 0 2px"><b>' + T.photoChecks + ': ' + taken + ' ' + T.of + ' ' + list.length + '</b></p><ul style="margin:0;list-style:none;padding-left:0">';
  list.forEach(function (x) {
    var lab = x.status === 'taken' ? '<span style="color:#1a7f37">&#10003; ' + T.photoTaken + '</span>' + (x.url ? ' (<a href="' + esc_(x.url) + '">' + T.photoLink + '</a>)' : '') : (x.status === 'missing' ? '<b style="color:#b00020">&#10007; ' + T.photoMissing + '</b>' : '<span style="color:#666">- ' + T.photoNone + '</span>');
    h += '<li>' + lab + ' - ' + T.no + ' ' + x.no + ' ' + esc_(x.name) + (x.by ? ' - ' + esc_(x.by) : '') + '</li>';
  });
  return h + '</ul>';
}
function flagHtml_(list, L) {
  if (!list.length) return '';
  var T = TXT[L], F = FLAGTXT[L];
  var h = '<p style="margin:12px 0 2px"><b>' + T.flagged + '</b></p><ul style="margin:0">';
  list.slice(0, 40).forEach(function (f) {
    var ft = f.flags.map(function (x) { return F[x] || x; }).join(', ');
    h += '<li>' + esc_(f.t.slice(11, 16)) + ' ' + esc_(f.guard) + ' - ' + T.no + ' ' + f.no + ' ' + esc_(f.name) + ' - ' + esc_(ft) + (f.dist !== '' ? ' (' + f.dist + ' ' + T.away + ')' : '') + '</li>';
  });
  return h + '</ul>';
}
function roundHtml_(L, r, pts, missed, hi, flagged, photos) {
  var T = TXT[L];
  var h = '<h3 style="margin:0 0 6px">' + T.round + ' ' + esc_(r.label) + ' (' + r.date + ')</h3><p><b>' + T.done + ' ' + (pts.length - missed.length) + ' ' + T.of + ' ' + pts.length + '. ' + T.missed + ' ' + missed.length + '.</b></p>';
  if (missed.length) h += '<p style="margin:8px 0 0"><b>' + T.notScanned + '</b> (' + T.highFirst + ')</p>' + groupHtml_(hi, L) + groupHtml_(missed.filter(function (p) { return !p.hi; }), L);
  h += photoHtml_(photos, L) + flagHtml_(flagged, L);
  return h;
}
function roundCheck() {
  var r = lastEnded_(Date.now());
  if (!r) return;
  var lastKey = r.date + '|' + r.idx;
  if (props_().getProperty('LAST_RC') === lastKey) return;
  props_().setProperty('LAST_RC', lastKey);
  if (roundHeld_(r)) return;
  var pts = points_(true), d = doneMap_(r);
  var missed = pts.filter(function (p) { return !d[p.id]; }), flagged = flagged_(r), photos = photoChecks_(r, pts);
  if (!missed.length && !flagged.length) return;
  var hi = missed.filter(function (p) { return p.hi; });
  var subj = 'Patrol / Patroli ' + r.date + ' ' + r.label + ': ' + (pts.length - missed.length) + '/' + pts.length + (missed.length ? ' - ' + missed.length + ' missed / terlewat' : '') + (hi.length ? ' (' + hi.length + ' high-risk / risiko tinggi)' : '');
  var foot = '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  var h = both_(roundHtml_('en', r, pts, missed, hi, flagged, photos), roundHtml_('id', r, pts, missed, hi, flagged, photos)) + foot;
  var fq = hideGps_(flagged), hq = (missed.length || fq.length) ? both_(roundHtml_('en', r, pts, missed, hi, fq, photos), roundHtml_('id', r, pts, missed, hi, fq, photos)) + foot : '';
  sendTo_(subj, h, hq);
}
function dailyHtml_(L, y, tr, top, missCount, flagList, phTaken, phReq) {
  var T = TXT[L];
  var h = '<h3 style="margin:0 0 6px">' + T.daily + ' ' + y + '</h3><table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>' + T.tRound + '</th><th>' + T.tDone + '</th><th>' + T.tMiss + '</th><th>' + T.photoCol + '</th></tr>' + tr + '</table><p style="margin:8px 0 0"><b>' + T.photoTotal + ': ' + phTaken + ' ' + T.of + ' ' + phReq + '</b></p>';
  if (top.length) { h += '<p style="margin:12px 0 2px"><b>' + T.often + '</b></p><ul style="margin:0">'; top.forEach(function (p) { h += '<li>' + T.no + ' ' + p.no + ' ' + esc_(p.name) + ': ' + T.missedIn + ' ' + missCount[p.id] + ' ' + T.of + ' 12 ' + T.rounds + '</li>'; }); h += '</ul>'; }
  return h + flagHtml_(flagList, L);
}
function dailySummary() {
  var y = new Date(Date.parse(roundAt_(Date.now()).opDate + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10); /* the last finished 07:00-07:00 day */
  var pts = points_(true), rows = scans_(3000), tr = '', missCount = {}, flagList = [], totalMissed = 0, phTaken = 0, phReq = 0;
  for (var i = 0; i < ROUNDS.length; i++) {
    var r = roundBy_(y, i), seen = {};
    rows.forEach(function (row) { var ms = Number(row[17]); if (ms >= r.start && ms < r.end) seen[row[6]] = 1; });
    var held = roundHeld_(r), miss = held ? [] : pts.filter(function (p) { return !seen[p.id]; });
    totalMissed += miss.length;
    miss.forEach(function (p) { missCount[p.id] = (missCount[p.id] || 0) + 1; });
    var pc = photoChecks_(r, pts, rows), pt2 = pc.filter(function (x) { return x.status === 'taken'; }).length;
    phTaken += pt2; phReq += pc.length;
    tr += '<tr><td>' + r.label + (held ? ' (weather hold / jeda cuaca)' : '') + '</td><td align="right">' + (held ? Object.keys(seen).length : pts.length - miss.length) + '</td><td align="right">' + miss.length + '</td><td align="right">' + (pc.length ? pt2 + '/' + pc.length : '-') + '</td></tr>';
    flagList = flagList.concat(flagged_(r));
  }
  var top = pts.filter(function (p) { return missCount[p.id]; }).sort(function (a, b) { return missCount[b.id] - missCount[a.id]; }).slice(0, 10);
  var foot = '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  var h = both_(dailyHtml_('en', y, tr, top, missCount, flagList, phTaken, phReq), dailyHtml_('id', y, tr, top, missCount, flagList, phTaken, phReq)) + foot;
  var fq = hideGps_(flagList), hq = both_(dailyHtml_('en', y, tr, top, missCount, fq, phTaken, phReq), dailyHtml_('id', y, tr, top, missCount, fq, phTaken, phReq)) + foot;
  sendTo_('Daily patrol summary / Ringkasan patroli harian ' + y + ': ' + totalMissed + ' missed / terlewat; photos / foto ' + phTaken + '/' + phReq, h, hq);
}
