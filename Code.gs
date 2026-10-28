/* EcoOils Mentari - Security Patrol backend (Google Apps Script)  v1.11
   Paste into Extensions > Apps Script of the "EcoOils Patrol Log" Google Sheet.
   Do NOT upload this file to GitHub (it holds the guard list). */
var VERSION = 'v1.51';
var OFF = 7 * 3600000;      // Jakarta (WIB), no daylight saving
var RMS = 2 * 3600000;      // one round = 2 hours
var RSHIFT = 7 * 3600000;   // rounds start at 07:00 (shift change); the 'date' of a round is the day that started at 07:00, so a night round belongs to the date it started
var TZ = 'Asia/Jakarta';
var ZORDER = ['GT', 'FN', 'PL', 'UT', 'LD', 'BL', 'MP'];
var ZNAME = {GT: 'Gate / entry', FN: 'Perimeter fence', PL: 'Process plant', UT: 'Utilities / tanks', LD: 'Laydown', BL: 'Buildings', MP: 'Muster point'};
var HEAD = {
  Scans: ['ScanId', 'Time (WIB)', 'Date', 'Round', 'Guard', 'Role', 'Point ID', 'No', 'Point name', 'Zone', 'Lat', 'Lng', 'Accuracy m', 'Distance m', 'GPS', 'Flags', 'Photo', 'Time ms', 'Photo taken', 'Photo gap s'],
  Points: ['Point ID', 'No', 'Name', 'UAUC location', 'Zone', 'Radius m', 'Photo', 'Active', 'Lat', 'Lng', 'Calibrated at', 'Notes', 'Seq'],
  Guards: ['Name', 'Role', 'Active', 'PIN hash', 'Danru', 'PIN set (WIB)'],
  Roster: ['Date', 'Shift', 'Duty', 'Guard', 'Buddy', 'Set by', 'Set at (WIB)', 'Batch ms'],
  Hold: ['Time (WIB)', 'Action', 'By', 'Reason', 'Time ms'],
  Videos: ['Time (WIB)', 'Guard', 'Role', 'Seconds', 'Note', 'Link', 'Time ms', 'Client ID'],
  Clock: ['Date', 'Shift', 'Guard', 'Role', 'Clock in (WIB)', 'Lat', 'Lng', 'Acc m', 'Dist m', 'Status', 'Late min', 'Set by', 'Time ms', 'Key'],
  Observations: ['Obs ID', 'Time (WIB)', 'Date', 'Shift', 'Guard', 'Type', 'Category', 'Point No', 'Location', 'Description', 'Photo', 'Closed on spot', 'Status', 'Closed by', 'Closed at (WIB)', 'Close note', 'Time ms'],
  GatePass: ['Time (WIB)', 'Pass ref', 'Decision', 'Guard', 'Role', 'Company', 'Vehicle', 'Reason', 'Lat', 'Lng', 'Acc m', 'Checklist', 'Time ms'],
  HKChecks: ['Check ID', 'Time (WIB)', 'Date', 'Shift', 'Inspector', 'Items', 'Not OK', 'Note', 'Time ms'],
  HKActions: ['Action ID', 'Check ID', 'Created (WIB)', 'Date', 'Shift', 'Item', 'Finding', 'Status', 'Done by', 'Done at (WIB)', 'Done note', 'Verified by', 'Verified at (WIB)', 'Verify note', 'Created ms'],
  Equip: ['Check ID', 'Time (WIB)', 'Date', 'Shift', 'Checked by', 'Item', 'Expected', 'Found', 'Condition', 'Note', 'Time ms'],
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
/* RADIUS RECALIBRATION (owner 25 Oct 2026): the point POSITIONS stay as they are; only the allowed radius (Points col F) is suggested from real scans.
   A scan is accepted when distance <= radius + min(GPS accuracy, 30 m). The part of the distance that the accuracy allowance does not already cover is "needed = max(0, distance - min(acc, 30))".
   Suggested radius = 90th percentile of needed over the last RADIUS_DAYS (default 14) days, rounded UP to 5 m, never below RADIUS_MIN (10) or above RADIUS_MAX (25). Points in GPS_SKIP and points with fewer than RADIUS_MIN_SCANS (5) usable scans are left alone.
   previewRadius() only writes to the log; applyRadius() writes Points col F only (never Lat / Lng). */
function radiusFromScans_(apply) {
  var days = Number(cfg_('RADIUS_DAYS', '14')) || 14, minN = Number(cfg_('RADIUS_MIN_SCANS', '5')) || 5, rMin = Number(cfg_('RADIUS_MIN', '10')) || 10, rMax = Number(cfg_('RADIUS_MAX', '25')) || 25;
  var from = Date.now() - days * 86400000, by = {}, used = 0;
  scans_(6000).forEach(function (r) {
    var ms = Number(r[17]), d = num_(r[13]), ac = num_(r[12]), gps = String(r[14]), fl = String(r[15]);
    if (ms < from || d == null || (gps !== 'OK' && gps !== 'OUTSIDE') || /REPEAT|SUSPECT_GPS|TOO_FAST|VPN_SUSPECT/.test(fl)) return;
    (by[String(r[6])] = by[String(r[6])] || []).push(Math.max(0, d - Math.min(ac == null ? 0 : ac, 30)));
    used++;
  });
  var out = [], changed = 0, sh = sh_('Points');
  points_(false).forEach(function (p) {
    if (gpsSkip_(p.no)) { out.push(p.no + '  ' + p.name + '  radius ' + p.radius + ' m  GPS not checked here (shade / tall structure), unchanged'); return; }
    var f = (by[p.id] || []).slice().sort(function (a, b) { return a - b; });
    if (f.length < minN) { out.push(p.no + '  ' + p.name + '  radius ' + p.radius + ' m  only ' + f.length + ' usable scans (need ' + minN + '), unchanged'); return; }
    var p90 = f[Math.min(f.length - 1, Math.ceil(0.9 * f.length) - 1)], med = f[Math.floor(f.length / 2)];
    var sug = Math.min(rMax, Math.max(rMin, Math.ceil(p90 / 5) * 5));
    var outNow = f.filter(function (x) { return x > p.radius; }).length, outSug = f.filter(function (x) { return x > sug; }).length;
    var mark = sug === p.radius ? 'keep' : (sug > p.radius ? 'RAISE' : 'LOWER');
    if (mark !== 'keep') changed++;
    out.push(p.no + '  ' + p.name + '  radius ' + p.radius + ' -> ' + sug + ' m (' + mark + ')  scans ' + f.length + ', typical extra distance ' + Math.round(med) + ' m, 90% within ' + Math.round(p90) + ' m, outside now ' + Math.round(100 * outNow / f.length) + '%, outside at ' + sug + ' m ' + Math.round(100 * outSug / f.length) + '%');
    if (apply && mark !== 'keep') sh.getRange(p.row, 6).setValue(sug);
  });
  var head = (apply ? 'RADIUS SAVED' : 'PREVIEW ONLY, nothing saved') + ': ' + used + ' usable scans in the last ' + days + ' days; ' + changed + ' point(s) ' + (apply ? 'changed' : 'would change') + '. Positions (Lat / Lng) are never touched.';
  Logger.log(head + '\n' + out.join('\n'));
  return {head: head, lines: out, changed: changed};
}
function previewRadius() { return radiusFromScans_(false); }
function applyRadius() { return radiusFromScans_(true); }
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'roundCheck' || h === 'dailySummary' || h === 'weeklyGps') ScriptApp.deleteTrigger(t);
  });
  ROUNDS.forEach(function (rd) { var h = rd[1] % 24; ScriptApp.newTrigger('roundCheck').timeBased().atHour(h).nearMinute(5).everyDays(1).inTimezone(TZ).create(); });
  ScriptApp.newTrigger('dailySummary').timeBased().atHour(7).nearMinute(10).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('weeklyGps').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).nearMinute(0).inTimezone(TZ).create();
  Logger.log('Triggers created: 1 weekly GPS report on Sunday about 18:00 (for the Monday morning discussion with the Danru), 9 round checks, 5 minutes after each round ends (10:05, 12:05, 14:05, 18:05, 20:05, 22:05, 02:05, 04:05, 06:05 Jakarta time) and 1 daily summary at about 07:10.');
}
/* Delivery check, run from the editor. Logs who is on the lists, the daily mail quota left, the installed triggers, then sends ONE plain test email to EACH address separately, so a failing address shows by name in the log. */
function mailCheck() {
  var lst = function (k) { return String(cfg_(k, '')).split(',').map(function (x) { return x.trim(); }).filter(String); };
  var all = lst('NOTIFY_EMAIL'), dr = lst('DANRU_EMAIL'), q = 'unknown';
  try { q = MailApp.getRemainingDailyQuota(); } catch (e) { q = 'unknown (' + e.message + ')'; }
  Logger.log('NOTIFY_EMAIL (first = full copy, others = copy without GPS flags, none if nothing to report): ' + all.join(' | '));
  Logger.log('DANRU_EMAIL (weekly GPS + catch-up): ' + (dr.join(' | ') || 'NOT SET'));
  Logger.log('GPS_QUIET: ' + (quiet_() ? 'yes' : 'no') + '. Emails left today: ' + q);
  var tc = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { var h = t.getHandlerFunction(); tc[h] = (tc[h] || 0) + 1; });
  Logger.log('Triggers: ' + (Object.keys(tc).map(function (h) { return h + ' x' + tc[h]; }).join(', ') || 'NONE, run setupTriggers'));
  Logger.log('Last round checked by roundCheck: ' + (props_().getProperty('LAST_RC') || 'never'));
  var seen = {};
  all.concat(dr).forEach(function (a) {
    var k = a.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    try {
      MailApp.sendEmail({to: a, subject: 'Patrol app delivery test / Uji pengiriman ' + VERSION, htmlBody: '<p>This is a delivery test from the EcoOils Mentari Security Patrol app. If you can read this, emails reach <b>' + esc_(a) + '</b>. If it was in Spam, mark it Not spam.</p><p>Ini uji pengiriman dari aplikasi Patroli Keamanan EcoOils Mentari. Jika Anda membaca ini, email sampai ke <b>' + esc_(a) + '</b>. Jika masuk Spam, tandai Bukan spam.</p>'});
      Logger.log('Sent OK to ' + a);
    } catch (e) { Logger.log('FAILED to ' + a + ': ' + e.message); }
  });
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
/* Scans rows from about fromD (YYYY-MM-DD, Jakarta) to the end. Reads only the Time ms column first, then just the rows needed, so a week of data does not mean reading months of scans. */
var SCANM_ = {};
function scanRows_(fromD) {
  if (SCANM_[fromD]) return SCANM_[fromD];
  return (SCANM_[fromD] = scanRows0_(fromD));
}
function scanRows0_(fromD) {
  var sh = sh_('Scans'), last = sh.getLastRow();
  if (last < 2) return [];
  var lim = Date.parse(String(fromD) + 'T00:00:00+07:00') - 48 * 3600000, col = sh.getRange(2, 18, last - 1, 1).getValues(), i0 = 0, any = false;
  for (var i = 0; i < col.length; i++) if (Number(col[i][0]) > 0) { any = true; break; }
  if (!any || !isFinite(lim)) return sh.getRange(2, 1, last - 1, 18).getValues();
  for (; i0 < col.length; i0++) if (Number(col[i0][0]) >= lim) break;
  if (i0 >= col.length) return [];
  return sh.getRange(2 + i0, 1, last - 1 - i0, 18).getValues();
}
function scans_(n) {
  var sh = sh_('Scans'), last = sh.getLastRow();
  if (last < 2) return [];
  var st = Math.max(2, last - n + 1);
  return sh.getRange(st, 1, last - st + 1, Math.max(18, Math.min(20, sh.getLastColumn()))).getValues();
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
var CACHE_ON = true;
/* Short result cache for heavy read-only screens (Admin tabs, Danru dashboard). Any write that changes them bumps a counter, so the next read is fresh. */
function cacheVer_() { try { return CacheService.getScriptCache().get('cv') || '0'; } catch (e) { return '0'; } }
function cacheBust_() { try { CacheService.getScriptCache().put('cv', String(Date.now()), 21600); } catch (e) {} }
function cached_(key, ttl, fn, fresh) {
  if (!CACHE_ON) return fn();
  var c; try { c = CacheService.getScriptCache(); } catch (e) { return fn(); }
  var k = 'c' + cacheVer_() + '|' + key + '|' + cfgVer_();
  if (!fresh) { try { var h = c.get(k); if (h) { var o = JSON.parse(h); o.cached = true; return o; } } catch (e2) {} }
  var r = fn();
  try { if (r && r.ok) { var j = JSON.stringify(r); if (j.length < 90000) c.put(k, j, ttl); } } catch (e3) {}
  return r;
}
function cfgVer_() { return String(VERSION); }
var CACHE_TTL = {a_stats: 60, a_missed: 60, a_obsdb: 60, a_chk: 30, a_history: 60, a_live: 15, d_dash: 20, d_gps: 60, d_obs_list: 20, d_hk_list: 20, d_eq_get: 30};
var CACHE_BUST = {obs: 1, hk_done: 1, d_obs_close: 1, d_hk_save: 1, d_hk_verify: 1, d_eq_save: 1, d_hold: 1, d_clock: 1, d_plan_set: 1, d_add: 1, d_active: 1, d_danru: 1, d_reset: 1, a_config: 1, a_points: 1, a_calibrate: 1, a_radius: 1, a_ts_danru: 1, clockin: 1, video: 1};
function cacheKey_(a, b) {
  var o = {}; Object.keys(b).sort().forEach(function (k) { if (k !== 'pin' && k !== 'gp' && k !== 'fresh' && k !== 'action') o[k] = b[k]; });
  return a + '|' + (b.pin ? 'A' : 'D') + '|' + JSON.stringify(o);
}
function route_(b) {
  var a = String(b.action || ''), res;
  res = route2_(b);
  if (CACHE_BUST[a] && res && res.ok) cacheBust_();
  return res;
}
function route2_(b) {
  CFGM_ = null; ROSM_ = null; SCANM_ = {};
  var a = String(b.action || '');
  if (a === 'ping') return {ok: true, version: VERSION};
  if (a.indexOf('a_') === 0) {
    if (!adminOk_(b.pin)) return {ok: false, err: 'pin'};
    if (CACHE_TTL[a]) return cached_(cacheKey_(a, b), CACHE_TTL[a], function () { return admin_(a, b); }, b.fresh);
    return admin_(a, b);
  }
  if (a.indexOf('d_') === 0) return team_(a, b);
  if (a !== 'state' && a !== 'scan' && a !== 'photo' && a !== 'clockin' && a !== 'video' && a !== 'obs' && a !== 'hk_list' && a !== 'hk_done' && a !== 'gate_list' && a !== 'gate_get' && a !== 'gate_release') return {ok: false, err: 'action'};
  if (locked_('fg', 20)) return {ok: false, err: 'locked'};
  var me = guardByPin_(b.gp);
  if (!me) return {ok: false, err: 'pin'};
  if (a === 'state') return state_(me);
  if (a === 'photo') return photo_(b, me);
  if (a === 'clockin') return clockIn_(b, me);
  if (a === 'video') return videoSave_(b, me);
  if (a === 'obs') return obsSave_(b, me);
  if (a === 'hk_list') return me.danru ? {ok: false, err: 'not_guard'} : (hkMay_(me) ? hkList_() : {ok: false, err: 'not_duty'});
  if (a === 'hk_done') return me.danru ? {ok: false, err: 'not_guard'} : (hkMay_(me) ? hkDone_(b, me) : {ok: false, err: 'not_duty'});
  if (a === 'gate_list') return gateList_();
  if (a === 'gate_get') return gateGet_(b);
  if (a === 'gate_release') return gateRelease_(b, me);
  return scan_(b, me);
}
/* ---------- Material Gate Pass release (v1.48) ----------
   The Gate Pass app (separate repo, separate Sheet and Apps Script) holds the passes. A guard releases a vehicle here, after checking it against the
   uploaded signed copy and the paper original. Patroli calls the Gate Pass backend server to server (UrlFetchApp) with a shared secret.
   Script properties (Project Settings > Script properties, never in the code): GATEPASS_URL = the Gate Pass web app URL (ends in /exec), GATEPASS_SECRET = BRIDGE_SECRET from the Gate Pass showCodes.
   Run gateCheck() once from the editor: it asks Google for the permission to call another web address and tests the link. */
function gateOn_() { var p = props_(); return !!(p.getProperty('GATEPASS_URL') && p.getProperty('GATEPASS_SECRET')); }
function gateCall_(payload) {
  var p = props_(), url = p.getProperty('GATEPASS_URL'), sec = p.getProperty('GATEPASS_SECRET');
  if (!url || !sec) return {ok: false, err: 'gate_off'};
  payload.secret = sec;
  try {
    var res = UrlFetchApp.fetch(url, {method: 'post', contentType: 'text/plain;charset=utf-8', payload: JSON.stringify(payload), muteHttpExceptions: true, followRedirects: true});
    return JSON.parse(res.getContentText());
  } catch (e) { return {ok: false, err: 'gate_down'}; }
}
function gateRef_(s) { var m = /MGP-(?:[A-Z0-9]{2,8}-)?\d{4}-\d{3,}/i.exec(String(s || '')); return m ? m[0].toUpperCase() : ''; }
/* pending list is cached 30 s so 25 phones polling do not each call the other script */
function gateList_() {
  var c = CacheService.getScriptCache(), v = c.get('gate_pend');
  if (v) { try { return JSON.parse(v); } catch (e) {} }
  var r = gateCall_({action: 'b_list'});
  if (r && r.ok) c.put('gate_pend', JSON.stringify(r), 30);
  return r && r.ok ? r : {ok: false, err: r && r.err === 'gate_off' ? 'gate_off' : 'gate_down'};
}
function gateGet_(b) {
  var ref = gateRef_(b.ref);
  if (!ref) return {ok: false, err: 'bad_ref'};
  var r = gateCall_({action: 'b_get', ref: ref});
  if (!r || !r.ok) return {ok: false, err: r && (r.err === 'notfound' || r.err === 'gate_off') ? r.err : 'gate_down'};
  return r;
}
function gateSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('GatePass');
  if (!sh) {
    sh = s.insertSheet('GatePass');
    sh.appendRow(HEAD.GatePass);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.GatePass.length).setFontWeight('bold');
  }
  return sh;
}
function gateRelease_(b, me) {
  var ref = gateRef_(b.ref), dec = String(b.decision || ''), why = String(b.reason || '').replace(/\s+/g, ' ').trim().slice(0, 300), ck = b.checks || {};
  if (!ref) return {ok: false, err: 'bad_ref'};
  if (dec !== 'release' && dec !== 'reject') return {ok: false, err: 'bad_decision'};
  if (dec === 'release' && !(ck.signed === true && ck.plate === true && ck.items === true && ck.vehicle === true && ck.idc === true)) return {ok: false, err: 'need_checks'};
  if (dec === 'reject' && why.length < 3) return {ok: false, err: 'need_reason'};
  var r = gateCall_({action: 'b_release', ref: ref, by: me.name, role: me.role, decision: dec, reason: why, lat: num_(b.lat), lng: num_(b.lng), acc: num_(b.acc), checks: ck});
  CacheService.getScriptCache().remove('gate_pend');
  if (!r) return {ok: false, err: 'gate_down'};
  if (!r.ok) return {ok: false, err: r.err || 'gate_down', by: r.by || '', at: r.at || '', status: r.status || ''};
  var now = Date.now();
  gateSheet_().appendRow([ymdhms_(now), ref, dec === 'release' ? 'RELEASED' : 'REJECTED', me.name, me.role, r.company || '', r.vehicle || '', why, num_(b.lat) == null ? '' : num_(b.lat), num_(b.lng) == null ? '' : num_(b.lng), num_(b.acc) == null ? '' : Math.round(num_(b.acc)), dec === 'release' ? 'signed copy, plate, items, vehicle checked' : '', now]);
  return {ok: true, status: r.status, at: r.at, ref: ref};
}
/* Run once from the editor after setting the two script properties. Asks for the permission to call the Gate Pass web app and logs the result. */
function gateCheck() {
  if (!gateOn_()) { Logger.log('Set the script properties GATEPASS_URL and GATEPASS_SECRET first (Project Settings > Script properties).'); return; }
  var r = gateCall_({action: 'b_list'});
  if (r && r.ok) Logger.log('Gate Pass reachable. Passes waiting for release: ' + r.n);
  else Logger.log('Gate Pass NOT reachable or secret wrong: ' + JSON.stringify(r));
}

function state_(me) {
  var now = Date.now(), r = roundAt_(now);
  return {
    ok: true, version: VERSION, now: now, round: r, rlabels: ROUNDS.map(function (x, i) { return rlabel_(i); }), showNames: cfg_('SHOW_NAMES', 'yes') === 'yes', me: {name: me.name, role: me.role, danru: me.danru}, tsOn: cfg_('TS_DANRU', 'no') === 'yes',
    points: points_(true).map(function (p) { var xy = mapXY_(p); return {id: p.id, no: p.no, seq: p.seq, name: p.name, zone: p.zone, hi: p.hi, x: xy.x, y: xy.y}; }),
    done: doneMap_(r), plan: planNow_(), award: awardPublic_(), clock: clockState_(me), hold: holdPublic_(), obs: obsState_(me), hk: {open: hkOpenCount_(), mine: hkMay_(me)}, gate: gateOn_()
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
  if (String(b.vpn || '') === 'S') flags.push('VPN_SUSPECT');
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
        if (String(rw[4]) === g.name && String(rw[6]) === pt.id && rms <= cts + 180000) return {ok: true, gps: 'UNCALIBRATED', dist: '', flags: [], done: Object.keys(prev).length, total: pts.filter(function (q) { return q.active; }).length, round: roundAt_(Date.now()), needPhoto: /NO_PHOTO/.test(String(rw[15])), scanId: String(rw[0]), dup: true};
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
    if (needPhoto && b.photo && String(b.photo).length > 100 && String(b.photo).length < 6000000) {
      try { url = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(b.photo), 'image/jpeg', r.date + '_' + p2_(new Date(ts + OFF).getUTCHours()) + 'h' + p2_(new Date(ts + OFF).getUTCMinutes()) + '_' + pt.id + '_' + g.name + '.jpg')).getUrl(); gotPhoto = true; }
      catch (e2) { flags.push('PHOTO_FAIL'); }
    }
    if (needPhoto && !gotPhoto) flags.push('NO_PHOTO');
    sh_('Scans').appendRow([sid, ymdhms_(ts), r.date, r.label, g.name, g.role, pt.id, pt.no, pt.name, pt.zone,
      lat == null ? '' : lat, lng == null ? '' : lng, acc == null ? '' : Math.round(acc), dist, gps, flags.join(' '), url, ts, needPhoto ? (gotPhoto ? 'Taken' : 'Missing') : '']);
    photoHdr_();
  } finally { lock.releaseLock(); }
  var cur = roundAt_(Date.now()), dn = doneMap_(cur);
  var quiet = quiet_();
  return {ok: true, gps: quiet ? 'UNCALIBRATED' : gps, dist: quiet ? '' : dist, flags: quiet ? [] : flags, done: Object.keys(dn).length, total: pts.filter(function (q) { return q.active; }).length, round: cur, needPhoto: needPhoto && !gotPhoto, scanId: sid, off: !!r.upcoming};
}
/* The Scans sheet gets a 'Photo taken' header in column S once (existing sheets). */
function photoHdr_() {
  try {
    var pr = PropertiesService.getScriptProperties();
    if (pr.getProperty('PH_HDR') === '2') return;
    var sh = sh_('Scans');
    if (!sh.getRange(1, 19).getValue()) sh.getRange(1, 19).setValue('Photo taken');
    if (!sh.getRange(1, 20).getValue()) sh.getRange(1, 20).setValue('Photo gap s');
    pr.setProperty('PH_HDR', '2');
  } catch (e) {}
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
    if (Date.now() - Number(row[17]) > (/QUEUED/.test(String(row[15])) ? 36 * 3600000 : 15 * 60000)) return {ok: false, err: 'too_late'};
    if (!/NO_PHOTO/.test(String(row[15]))) return {ok: false, err: 'not_needed'};
    var ts = Number(row[17]), url;
    try { url = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(photo), 'image/jpeg', row[2] + '_' + p2_(new Date(ts + OFF).getUTCHours()) + 'h' + p2_(new Date(ts + OFF).getUTCMinutes()) + '_' + row[6] + '_' + me.name + '.jpg')).getUrl(); }
    catch (e) { return {ok: false, err: 'photo_fail'}; }
    sh.getRange(st + hit, 17).setValue(url);
    sh.getRange(st + hit, 19).setValue('Taken');
    /* Seconds between the scan and the moment the selfie was taken on the phone (owner only: round email + sheet). Blank for queued (offline) scans. */
    if (!/QUEUED/.test(String(row[15]))) { var shot = Number(b.shot), gap = (isFinite(shot) && shot > ts - 5000 && shot < Date.now() + 60000) ? shot - ts : Date.now() - ts; sh.getRange(st + hit, 20).setValue(Math.max(0, Math.round(gap / 1000))); }
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
  var now = Date.now(), ymd = ymdhms_(now), note = String(b.note || 'Conditions').slice(0, 60), url, cid = String(b.cid || '').slice(0, 40);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (cid) { var vs0 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Videos'); if (vs0 && vs0.getLastRow() >= 2) { var vn = vs0.getLastRow(), vst = Math.max(2, vn - 99), seen = vs0.getRange(vst, 8, vn - vst + 1, 1).getValues(); for (var vi = 0; vi < seen.length; vi++) if (String(seen[vi][0]) === cid) return {ok: true, dup: true}; } }
    try { url = videoFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(v), mime, ymd.slice(0, 10) + '_' + ymd.slice(11, 13) + 'h' + ymd.slice(14, 16) + '_' + me.name + (mime === 'video/mp4' ? '.mp4' : '.webm'))).getUrl(); }
    catch (e) { return {ok: false, err: 'video_fail'}; }
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Videos');
    if (!sh) { sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Videos'); sh.appendRow(HEAD.Videos); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEAD.Videos.length).setFontWeight('bold'); }
    sh.appendRow([ymd, me.name, me.role, secs, note, url, now, cid]);
    if (!sh.getRange(1, 8).getValue()) sh.getRange(1, 8).setValue('Client ID').setFontWeight('bold');
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

/* ---------- Security observations (guards only; everybody else uses the UA/UC form) ----------
   A guard records a Positive observation or an Issue found (category, optional point, description, optional photo, and for an issue: closed on the spot yes/no).
   Issues not closed on the spot stay Open until a Danru / Shift Supervisor closes them (d_obs_close). Escalation to the owner is NOT built: the Danru raises it himself.
   Config: OBS_MIN_PER_SHIFT (default 1; 0 = no minimum shown), OBS_CATS (comma list, default below), OBS_FROM (first day the missing-observation lists count, default 2026-10-24).
   Award criteria use these rows (see awardStats_). */
var OBS_CATS = [['Fence / perimeter', 'Pagar / keliling'], ['Gate / access control', 'Gerbang / kontrol akses'], ['Lighting / CCTV', 'Penerangan / CCTV'], ['Suspicious person or vehicle', 'Orang atau kendaraan mencurigakan'], ['Unsafe act', 'Tindakan tidak aman'], ['Unsafe condition', 'Kondisi tidak aman'], ['Fire / housekeeping', 'Kebakaran / kebersihan'], ['Good practice', 'Praktik baik'], ['Other', 'Lainnya']];
function obsCats_() {
  var c = String(cfg_('OBS_CATS', '')).split(',').map(function (x) { return x.trim(); }).filter(String).slice(0, 20);
  if (c.length) return c.map(function (x) { return {en: x, id: x}; });
  return OBS_CATS.map(function (x) { return {en: x[0], id: x[1]}; });
}
function obsMin_() { var n = parseInt(cfg_('OBS_MIN_PER_SHIFT', '1'), 10); return isFinite(n) && n > 0 ? Math.min(n, 20) : 0; }
function obsSheet_() {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName('Observations');
  if (!sh) {
    sh = s.insertSheet('Observations');
    sh.appendRow(HEAD.Observations);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.Observations.length).setFontWeight('bold');
    sh.getRange('C:D').setNumberFormat('@');
  }
  return sh;
}
function obsRow_(r, row) {
  return {row: row, id: String(r[0]), t: String(r[1]), date: String(r[2]), shift: String(r[3]), guard: String(r[4]), type: String(r[5]), cat: String(r[6]), no: r[7] === '' ? null : Number(r[7]), where: String(r[8]), text: String(r[9]), photo: String(r[10]), spot: String(r[11]) === 'Yes', status: String(r[12]), by: String(r[13]), at: String(r[14]), note: String(r[15]), ms: Number(r[16]) || 0};
}
/* Rows of the Observations sheet (the last n, oldest first). Date and Shift come from the Time ms column so they survive Google Sheets reformatting text cells. */
function obsRows_(n) {
  var sh = obsSheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  var st = n ? Math.max(2, last - n + 1) : 2;
  return sh.getRange(st, 1, last - st + 1, 17).getValues().map(function (r, i) {
    var o = obsRow_(r, st + i), ms = o.ms;
    if (ms) { var sf = shiftAt_(ms); o.date = sf.date; o.shift = sf.code; }
    return o;
  });
}
function obsState_(me) {
  try {
    var now = Date.now(), sf = shiftAt_(now), out = {date: sf.date, shift: sf.code, min: obsMin_(), cats: obsCats_(), guard: !me.danru, mine: 0, open: 0};
    var rows = obsRows_(600);
    rows.forEach(function (o) {
      if (!me.danru && o.guard === me.name && o.date === sf.date && o.shift === sf.code) out.mine++;
      if (o.type === 'Issue' && o.status === 'Open') out.open++;
    });
    if (!me.danru) delete out.open;
    return out;
  } catch (e) { return {guard: !me.danru, mine: 0, min: 0, cats: obsCats_()}; }
}
function obsSave_(b, me) {
  if (me.danru) return {ok: false, err: 'not_guard'};
  var type = b.type === 'Positive' ? 'Positive' : (b.type === 'Issue' ? 'Issue' : '');
  if (!type) return {ok: false, err: 'bad_type'};
  var cat = '', cats = obsCats_();
  cats.forEach(function (c) { if (c.en === String(b.cat)) cat = c.en; });
  if (!cat) return {ok: false, err: 'bad_cat'};
  var text = String(b.text || '').replace(/\s+/g, ' ').trim();
  if (text.length < 3 || text.length > 400) return {ok: false, err: 'bad_text'};
  var no = '', where = '', pn = Number(b.pno);
  if (isFinite(pn) && pn > 0) {
    points_(false).forEach(function (p) { if (p.no === pn) { no = p.no; where = p.name; } });
  }
  var spot = type === 'Issue' && b.spot === true;
  var act = String(b.act || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (spot && act.length < 3) return {ok: false, err: 'need_action'};
  var now = Date.now(), ts = now, cid = String(b.cid || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);
  if (b.queued) { var c0 = Number(b.clientTs); if (c0 && c0 <= now + 60000 && now - c0 < 72 * 3600000) ts = c0; }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sf = shiftAt_(ts), rows = obsRows_(300), photoFail = false, i;
    if (cid) for (i = 0; i < rows.length; i++) if (rows[i].id === cid && rows[i].guard === me.name) return {ok: true, dup: true, id: cid, mine: obsState_(me).mine};
    var id = cid || Utilities.getUuid().slice(0, 8), url = '';
    if (b.photo && String(b.photo).length > 100 && String(b.photo).length < 6000000) {
      try { url = folder_().createFile(Utilities.newBlob(Utilities.base64Decode(b.photo), 'image/jpeg', 'OBS_' + sf.date + '_' + p2_(new Date(ts + OFF).getUTCHours()) + 'h' + p2_(new Date(ts + OFF).getUTCMinutes()) + '_' + type + '_' + me.name + '.jpg')).getUrl(); }
      catch (e) { photoFail = true; }
    }
    obsSheet_().appendRow([id, ymdhms_(ts), sf.date, sf.code, me.name, type, cat, no, where, text, url, spot ? 'Yes' : (type === 'Issue' ? 'No' : ''), type === 'Positive' ? 'Positive' : (spot ? 'Closed on spot' : 'Open'), spot ? me.name : '', spot ? ymdhms_(ts) : '', spot ? act : '', ts]);
    return {ok: true, id: id, photoFail: photoFail, mine: obsState_(me).mine};
  } finally { lock.releaseLock(); }
}
/* Danru / Shift Supervisor / Admin: open issues (oldest first) and the latest closed ones. */
/* Observations from a date on (reads only the Time ms column, then the tail). */
function obsRowsSince_(fromD) {
  var sh = obsSheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  var lim = Date.parse(String(fromD) + 'T00:00:00+07:00') - 48 * 3600000, col = sh.getRange(2, 17, last - 1, 1).getValues(), i0 = 0, any = false;
  for (var i = 0; i < col.length; i++) if (Number(col[i][0]) > 0) { any = true; break; }
  if (!any || !isFinite(lim)) return obsRows_(0);
  for (; i0 < col.length; i0++) if (Number(col[i0][0]) >= lim) break;
  if (i0 >= col.length) return [];
  var st = 2 + i0;
  return sh.getRange(st, 1, last - st + 1, 17).getValues().map(function (r, k) {
    var o = obsRow_(r, st + k), ms = o.ms;
    if (ms) { var sf = shiftAt_(ms); o.date = sf.date; o.shift = sf.code; }
    return o;
  });
}
function obsList_() {
  var rows = obsRows_(800), open = rows.filter(function (o) { return o.type === 'Issue' && o.status === 'Open'; });
  var done = rows.filter(function (o) { return o.type === 'Issue' && o.status !== 'Open'; }).slice(-15).reverse();
  function pub(o) { return {id: o.id, t: o.t, shift: o.shift, guard: o.guard, cat: o.cat, no: o.no, where: o.where, text: o.text, photo: o.photo, spot: o.spot, status: o.status, by: o.by, at: o.at, note: o.note}; }
  return {ok: true, open: open.map(pub), closed: done.map(pub)};
}
function obsClose_(b, by) {
  var id = String(b.id || ''), note = String(b.note || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!id) return {ok: false, err: 'bad_obs'};
  if (note.length < 3) return {ok: false, err: 'need_note'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = obsRows_(1500), hit = null;
    rows.forEach(function (o) { if (o.id === id) hit = o; });
    if (!hit || hit.type !== 'Issue') return {ok: false, err: 'bad_obs'};
    if (hit.status !== 'Open') return {ok: false, err: 'already_closed'};
    var sh = obsSheet_();
    sh.getRange(hit.row, 13, 1, 4).setValues([['Closed', by, ymdhms_(Date.now()), note]]);
    return {ok: true};
  } finally { lock.releaseLock(); }
}
/* Planned guards (not Danru) who finished a shift without recording any observation. Only shifts after OBS_FROM count; only while a minimum is set. */
function obsMissing_(fromD, to) {
  var out = [], min = obsMin_(), now = Date.now(), starts = {P: 7, S: 15, M: 23}, from0 = String(cfg_('OBS_FROM', '2026-10-24'));
  if (!min) return out;
  var cnt = {}, dr = {};
  obsRowsSince_(from0).forEach(function (o) { if (o.type) { var k = o.date + '|' + o.shift + '|' + o.guard.toLowerCase(); cnt[k] = (cnt[k] || 0) + 1; } });
  guardsAll_().forEach(function (g) { if (g.danru) dr[g.name.toLowerCase()] = 1; });
  var dd = Date.parse(fromD + 'T00:00:00Z'), end = Date.parse(to + 'T00:00:00Z'), n = 0;
  for (; dd <= end && n < 31; dd += 86400000, n++) {
    var ds = new Date(dd).toISOString().slice(0, 10);
    if (ds < from0) continue;
    Object.keys(starts).forEach(function (code) {
      var st = Date.UTC(new Date(dd).getUTCFullYear(), new Date(dd).getUTCMonth(), new Date(dd).getUTCDate(), starts[code] - 7, 0, 0);
      if (now < st + 8 * 3600000) return;
      roster_(ds, code).forEach(function (r) {
        [r.guard, r.buddy].forEach(function (nm) {
          if (nm && !dr[nm.toLowerCase()] && (cnt[ds + '|' + code + '|' + nm.toLowerCase()] || 0) < min) out.push({date: ds, shift: code, guard: nm, duty: r.duty});
        });
      });
    });
  }
  return out.slice(0, 200);
}
function obsSummary_(fromD, to) {
  var by = {}, open = 0;
  guards_().forEach(function (g) { if (!g.danru) by[g.name] = {guard: g.name, total: 0, pos: 0, iss: 0, photos: 0, spot: 0, open: 0}; });
  obsRows_(0).forEach(function (o) {
    if (!o.type) return;
    if (o.type === 'Issue' && o.status === 'Open') open++;
    if (o.date < fromD || o.date > to) return;
    var x = by[o.guard] || (by[o.guard] = {guard: o.guard, total: 0, pos: 0, iss: 0, photos: 0, spot: 0, open: 0});
    x.total++; if (o.type === 'Positive') x.pos++; else { x.iss++; if (o.spot) x.spot++; if (o.status === 'Open') x.open++; }
    if (o.photo) x.photos++;
  });
  var guards = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.total - a.total || a.guard.localeCompare(b.guard); });
  var openList = obsList_().open.slice(0, 50);
  return {guards: guards, open: open, openList: openList, missing: obsMissing_(fromD, to), min: obsMin_()};
}
function obsDailyHtml_(L, y) {
  try {
    var rows = obsRows_(0).filter(function (o) { return o.type && o.date === y; }), pos = 0, iss = 0, ph = 0, spot = 0;
    rows.forEach(function (o) { if (o.type === 'Positive') pos++; else { iss++; if (o.spot) spot++; } if (o.photo) ph++; });
    var open = obsList_().open, miss = obsMissing_(y, y);
    var en = L === 'en';
    var h = '<p style="margin:12px 0 2px"><b>' + (en ? 'Security observations' : 'Observasi keamanan') + '</b>: ' + rows.length + ' (' + pos + (en ? ' positive, ' : ' positif, ') + iss + (en ? ' issues, ' : ' temuan, ') + spot + (en ? ' closed on the spot, ' : ' ditutup di tempat, ') + ph + (en ? ' photos)' : ' foto)') + '</p>';
    if (open.length) { h += '<p style="margin:6px 0 2px">' + (en ? 'Open issues waiting for the Danru' : 'Temuan terbuka menunggu Danru') + ': ' + open.length + '</p><ul style="margin:0">'; open.slice(0, 10).forEach(function (o) { h += '<li>' + esc_(o.t.slice(5, 16)) + ' ' + esc_(o.guard) + ': ' + esc_(o.cat) + ' - ' + esc_(o.text) + '</li>'; }); h += '</ul>'; }
    if (miss.length) { h += '<p style="margin:6px 0 2px">' + (en ? 'Shifts with no observation' : 'Shift tanpa observasi') + ':</p><ul style="margin:0">'; miss.slice(0, 30).forEach(function (m) { h += '<li>' + esc_(m.guard) + ' (' + SHIFTS[m.shift] + ')</li>'; }); h += '</ul>'; }
    return h;
  } catch (e) { return ''; }
}

/* ---------- Weekly GPS check: how many scans were OUTSIDE ----------
   Only scans where GPS was really checked count (gps OK or OUTSIDE). Points in Config GPS_SKIP (shaded / tall structure / upper floors) are never checked, so they cannot be OUTSIDE.
   'Good GPS' = OUTSIDE with a fix of 20 m accuracy or better: hard to explain by the phone alone.
   A point where several different guards are OUTSIDE is flagged 'review the point' (position, radius or shade), not a guard problem.
   Recipients: the owner (first NOTIFY_EMAIL address) gets everything, including the no-GPS count, the REVIEW THE POINT flag and the 'how to read' advice (owner decision 24 Oct: those are discussed together with the owner, not sent to the Danru); Config DANRU_EMAIL (comma list) gets the same OUTSIDE counts by guard and by point, nothing else.
   Scheduled Sunday about 18:00 Jakarta (setupTriggers) so the Danru has it for the Monday morning discussion; it covers Monday to Sunday of that week (the last 7 days including today). The Danru can also open it on the phone (d_gps, last 7/14/30 days). */
function gpsWeek_(fromD, to) {
  var sh = sh_('Scans'), last = sh.getLastRow(), G = {}, P = {}, tot = {checked: 0, outside: 0, strong: 0, noGps: 0};
  scanRows_(fromD).forEach(function (r) {
    var dt = rowWhen_(r).date;
    if (dt < fromD || dt > to) return;
    var fl = String(r[15]).split(' ');
    if (fl.indexOf('REPEAT') >= 0) return;
    var gps = String(r[14]), who = String(r[4]);
    var g = G[who] || (G[who] = {guard: who, checked: 0, outside: 0, strong: 0, dist: 0, noGps: 0});
    if (gps === 'NO_GPS') { tot.noGps++; g.noGps++; }
    if (gps !== 'OK' && gps !== 'OUTSIDE') return;
    var no = Number(r[7]), p = P[no] || (P[no] = {no: no, name: String(r[8]), checked: 0, outside: 0, who: {}, dist: 0});
    g.checked++; p.checked++; tot.checked++;
    if (gps === 'OUTSIDE') {
      var acc = r[12] === '' ? null : Number(r[12]), d = Number(r[13]) || 0;
      g.outside++; p.outside++; tot.outside++; g.dist += d; p.dist += d; p.who[who] = 1;
      if (acc != null && acc <= 20) { g.strong++; tot.strong++; }
    }
  });
  var guards = Object.keys(G).map(function (k) { var g = G[k]; return {guard: g.guard, checked: g.checked, outside: g.outside, strong: g.strong, pct: g.checked ? Math.round(100 * g.outside / g.checked) : 0, avgDist: g.outside ? Math.round(g.dist / g.outside) : 0, noGps: g.noGps}; })
    .filter(function (g) { return g.checked || g.noGps; }).sort(function (a, b) { return b.outside - a.outside || b.pct - a.pct || a.guard.localeCompare(b.guard); });
  var points = Object.keys(P).map(function (k) { var p = P[k], ng = Object.keys(p.who).length; return {no: p.no, name: p.name, checked: p.checked, outside: p.outside, guards: ng, pct: p.checked ? Math.round(100 * p.outside / p.checked) : 0, avgDist: p.outside ? Math.round(p.dist / p.outside) : 0, review: ng >= 3 && p.checked >= 5 && p.outside / p.checked >= 0.4}; })
    .filter(function (p) { return p.outside > 0; }).sort(function (a, b) { return b.pct - a.pct || b.outside - a.outside; });
  return {from: fromD, to: to, totals: {checked: tot.checked, outside: tot.outside, strong: tot.strong, pct: tot.checked ? Math.round(100 * tot.outside / tot.checked) : 0, noGps: tot.noGps}, guards: guards, points: points,
    skipped: String(cfg_('GPS_SKIP', '6,18,21,23,26,27,33,34,35')).split(',').map(function (x) { return x.trim(); }).filter(String)};
}
function gpsWeekHtml_(L, rep, owner) {
  var en = L === 'en', t = rep.totals;
  var h = '<h3 style="margin:0 0 6px">' + (en ? 'Weekly GPS check' : 'Pemeriksaan GPS mingguan') + ' ' + rep.from + ' - ' + rep.to + '</h3>';
  h += '<p style="margin:0 0 6px"><b>' + t.outside + '</b> ' + (en ? 'scans outside the point radius, out of' : 'pemindaian di luar radius titik, dari') + ' <b>' + t.checked + '</b> ' + (en ? 'checked' : 'yang diperiksa') + ' (' + t.pct + '%). ' + (en ? 'With a good GPS fix (20 m or better): ' : 'Dengan GPS baik (20 m atau lebih baik): ') + '<b>' + t.strong + '</b>.' + (owner ? ' ' + (en ? 'Scans without GPS: ' : 'Pemindaian tanpa GPS: ') + t.noGps + '.' : '') + '</p>';
  h += '<p style="margin:0 0 8px;color:#555">' + (en ? 'Points in shade, under tall structures or on upper floors are not checked (points ' : 'Titik di area teduh, di bawah struktur tinggi atau lantai atas tidak diperiksa (titik ') + esc_(rep.skipped.join(', ')) + ').</p>';
  h += '<p style="margin:10px 0 2px"><b>' + (en ? 'By guard' : 'Per petugas') + '</b></p>';
  var gl = rep.guards.filter(function (g) { return g.outside > 0; });
  if (gl.length) {
    h += '<table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>' + (en ? 'Guard' : 'Petugas') + '</th><th>' + (en ? 'Outside' : 'Di luar') + '</th><th>' + (en ? 'Checked' : 'Diperiksa') + '</th><th>%</th><th>' + (en ? 'Good GPS' : 'GPS baik') + '</th><th>' + (en ? 'Avg m away' : 'Rata-rata m') + '</th></tr>';
    gl.forEach(function (g) { h += '<tr><td>' + esc_(g.guard) + '</td><td align="right">' + g.outside + '</td><td align="right">' + g.checked + '</td><td align="right">' + g.pct + '</td><td align="right">' + g.strong + '</td><td align="right">' + g.avgDist + '</td></tr>'; });
    h += '</table>';
  } else h += '<p style="margin:0">' + (en ? 'No scan was outside.' : 'Tidak ada pemindaian di luar.') + '</p>';
  h += '<p style="margin:12px 0 2px"><b>' + (en ? 'By point' : 'Per titik') + '</b></p>';
  if (rep.points.length) {
    h += '<table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>' + (en ? 'Point' : 'Titik') + '</th><th>' + (en ? 'Outside' : 'Di luar') + '</th><th>' + (en ? 'Checked' : 'Diperiksa') + '</th><th>%</th><th>' + (en ? 'Guards' : 'Petugas') + '</th>' + (owner ? '<th></th>' : '') + '</tr>';
    rep.points.slice(0, 20).forEach(function (p) { h += '<tr><td>' + p.no + '. ' + esc_(p.name) + '</td><td align="right">' + p.outside + '</td><td align="right">' + p.checked + '</td><td align="right">' + p.pct + '</td><td align="right">' + p.guards + '</td>' + (owner ? '<td>' + (p.review ? (en ? 'REVIEW THE POINT (several guards: position, radius or shade)' : 'PERIKSA TITIK (banyak petugas: posisi, radius atau teduh)') : '') + '</td>' : '') + '</tr>'; });
    h += '</table>';
  } else h += '<p style="margin:0">-</p>';
  if (owner) h += '<p style="margin:10px 0 0;color:#555">' + (en ? 'How to read: one guard outside at many points = look at that guard. Many guards outside at one point = the point needs a new position, a bigger radius, or a place on the shaded list.' : 'Cara membaca: satu petugas di luar di banyak titik = periksa petugas itu. Banyak petugas di luar di satu titik = titik perlu posisi baru, radius lebih besar, atau masuk daftar area teduh.') + '</p>';
  return h;
}
function weeklyGps() {
  var to = ymdhms_(Date.now()).slice(0, 10), fromD = ymdhms_(Date.now() - 6 * 86400000).slice(0, 10);
  var rep = gpsWeek_(fromD, to), foot = '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  var subj = 'Weekly GPS check / Pemeriksaan GPS mingguan ' + fromD + ' - ' + to + ': ' + rep.totals.outside + ' outside / di luar';
  var all = cfg_('NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (all.length) MailApp.sendEmail({to: all[0], subject: subj, htmlBody: both_(gpsWeekHtml_('en', rep, true), gpsWeekHtml_('id', rep, true)) + foot});
  var dr = String(cfg_('DANRU_EMAIL', '')).split(',').map(function (x) { return x.trim(); }).filter(String);
  if (dr.length) MailApp.sendEmail({to: dr.join(','), subject: subj, htmlBody: both_(gpsWeekHtml_('en', rep, false), gpsWeekHtml_('id', rep, false)) + foot});
}

/* ---------- Security building check (Danru / Shift Supervisor inspect, guards act) and equipment check (owner 26 Oct 2026) ---------- */
var HK_DEFAULT = [
  ['Floor swept and mopped', 'Lantai disapu dan dipel'], ['Desks and tables clear and tidy', 'Meja bersih dan rapi'], ['Waste bins emptied, no overflow', 'Tempat sampah dikosongkan, tidak meluap'],
  ['Toilet and washbasin clean', 'Toilet dan wastafel bersih'], ['Pantry area clean, no food left out', 'Area pantry bersih, tidak ada sisa makanan'], ['Uniforms, bags and lockers tidy', 'Seragam, tas dan loker rapi'],
  ['Equipment stored in its place', 'Peralatan disimpan pada tempatnya'], ['Logbooks and registers in place and up to date', 'Buku log dan register ada dan terbarui'], ['Windows, doors and locks in order', 'Jendela, pintu dan kunci dalam kondisi baik'],
  ['Lights, fans and AC working', 'Lampu, kipas dan AC berfungsi'], ['Entrance and walkway clear, no trip hazard', 'Pintu masuk dan jalan bebas hambatan'], ['No pests or bad smell', 'Tidak ada hama atau bau tidak sedap']];
var EQ_DEFAULT = [
  ['Handheld radios', 'Radio genggam', 0], ['Torches', 'Senter', 0], ['Spare batteries', 'Baterai cadangan', 0], ['First aid kit', 'Kotak P3K', 1], ['Fire extinguisher (security building)', 'APAR (pos keamanan)', 1],
  ['Key box and key register', 'Kotak kunci dan register kunci', 1], ['Visitor and vehicle logbook', 'Buku tamu dan kendaraan', 1], ['CCTV monitor working', 'Monitor CCTV berfungsi', 1], ['Raincoats', 'Jas hujan', 0], ['Mobile phones for patrol', 'Ponsel patroli', 0]];
/* Config HK_ITEMS = 'English|Bahasa;English|Bahasa' and EQUIP_ITEMS = 'English|Bahasa|expected number;...' (expected 0 = just count what is there) replace the defaults. */
function hkItems_() {
  var v = String(cfg_('HK_ITEMS', '')).trim(), out = [];
  if (v) v.split(';').forEach(function (x) { var p = x.split('|'); if (p[0].trim()) out.push([p[0].trim(), (p[1] || p[0]).trim()]); });
  return (out.length ? out : HK_DEFAULT).map(function (x, i) { return {i: i, en: x[0], id: x[1]}; });
}
function eqItems_() {
  var v = String(cfg_('EQUIP_ITEMS', '')).trim(), out = [];
  if (v) v.split(';').forEach(function (x) { var p = x.split('|'); if (p[0].trim()) out.push([p[0].trim(), (p[1] || p[0]).trim(), Math.max(0, parseInt(p[2], 10) || 0)]); });
  return (out.length ? out : EQ_DEFAULT).map(function (x, i) { return {i: i, en: x[0], id: x[1], exp: x[2]}; });
}
function lazy_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet(), sh = s.getSheetByName(name);
  if (!sh) { sh = s.insertSheet(name); sh.appendRow(HEAD[name]); sh.setFrozenRows(1); sh.getRange(1, 1, 1, HEAD[name].length).setFontWeight('bold'); }
  return sh;
}
function txt_(v, n) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n); }
function hkActs_() {
  var sh = lazy_('HKActions'), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 15).getValues().map(function (r, i) {
    return {row: i + 2, id: String(r[0]), check: String(r[1]), at: String(r[2]), date: String(r[3]), shift: String(r[4]), item: String(r[5]), finding: String(r[6]), status: String(r[7]), doneBy: String(r[8]), doneAt: String(r[9]), doneNote: String(r[10]), vBy: String(r[11]), vAt: String(r[12]), vNote: String(r[13])};
  });
}
function hkPub_(a) { return {id: a.id, at: a.at, date: a.date, shift: a.shift, item: a.item, finding: a.finding, status: a.status, doneBy: a.doneBy, doneAt: a.doneAt, doneNote: a.doneNote, vBy: a.vBy, vAt: a.vAt, vNote: a.vNote}; }
/* open cleaning actions waiting for the guards (cheap: only the status column is read) */
/* Cleaning of the security building is the duty of the guard on Gate duty (Config HK_DUTY, default 'Gate 1') in the current shift plan, plus his buddy. If nobody is planned on that duty, every guard may act so nothing gets stuck. */
function hkMay_(me) {
  if (me.danru) return false;
  try {
    var sf = shiftAt_(Date.now()), duty = String(cfg_('HK_DUTY', 'Gate 1')).trim().toLowerCase(), k = String(me.name).toLowerCase(), any = false, mine = false;
    roster_(sf.date, sf.code).forEach(function (r) {
      if (String(r.duty).trim().toLowerCase() !== duty) return;
      any = true;
      if (r.guard.toLowerCase() === k || (r.buddy && r.buddy.toLowerCase() === k)) mine = true;
    });
    return any ? mine : true;
  } catch (e) { return true; }
}
function hkOpenCount_() {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HKActions');
  if (!s || s.getLastRow() < 2) return 0;
  var n = 0;
  s.getRange(2, 8, s.getLastRow() - 1, 1).getValues().forEach(function (r) { if (r[0] === 'Open') n++; });
  return n;
}
function hkGet_() {
  var items = hkItems_(), cs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HKChecks'), last = null;
  if (cs && cs.getLastRow() >= 2) { var r = cs.getRange(cs.getLastRow(), 1, 1, 9).getValues()[0]; last = {id: String(r[0]), at: String(r[1]), date: String(r[2]), shift: String(r[3]), by: String(r[4]), items: Number(r[5]), notOk: Number(r[6]), note: String(r[7])}; }
  return {ok: true, items: items, last: last, open: hkOpenCount_()};
}
function hkSave_(b, by) {
  var items = hkItems_(), rows = b.rows;
  if (!rows || rows.length !== items.length) return {ok: false, err: 'hk_all'};
  var bad = [], note = txt_(b.note, 300);
  for (var i = 0; i < items.length; i++) {
    var r = rows[i];
    if (!r || (r.ok !== true && r.ok !== false)) return {ok: false, err: 'hk_all'};
    if (r.ok === false && txt_(r.note, 300).length < 3) return {ok: false, err: 'hk_note'};
    if (r.ok === false) bad.push({item: items[i].en, note: txt_(r.note, 300)});
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = Date.now(), sf = shiftAt_(now), id = Utilities.getUuid().slice(0, 8), t = ymdhms_(now);
    lazy_('HKChecks').appendRow([id, t, sf.date, sf.code, by, items.length, bad.length, note, now]);
    var ash = lazy_('HKActions');
    bad.forEach(function (x, k) { ash.appendRow([id + '-' + (k + 1), id, t, sf.date, sf.code, x.item, x.note, 'Open', '', '', '', '', '', '', now]); });
    return {ok: true, id: id, notOk: bad.length};
  } finally { lock.releaseLock(); }
}
function hkList_() {
  var all = hkActs_().map(hkPub_);
  return {ok: true, open: all.filter(function (a) { return a.status === 'Open'; }), done: all.filter(function (a) { return a.status === 'Done'; }), verified: all.filter(function (a) { return a.status === 'Verified'; }).slice(-10).reverse()};
}
/* a guard reports what he did about an open cleaning action */
function hkDone_(b, me) {
  var id = String(b.id || ''), note = txt_(b.note, 300);
  if (note.length < 3) return {ok: false, err: 'hk_donenote'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var hit = null;
    hkActs_().forEach(function (a) { if (a.id === id) hit = a; });
    if (!hit) return {ok: false, err: 'bad_obs'};
    if (hit.status !== 'Open') return {ok: false, err: 'already_closed'};
    lazy_('HKActions').getRange(hit.row, 8, 1, 4).setValues([['Done', me.name, ymdhms_(Date.now()), note]]);
    return {ok: true, open: hkOpenCount_()};
  } finally { lock.releaseLock(); }
}
/* Danru / Shift Supervisor verifies a finished action, or re-opens it (note required when re-opening) */
function hkVerify_(b, by) {
  var id = String(b.id || ''), note = txt_(b.note, 300), reopen = b.ok === false;
  if (reopen && note.length < 3) return {ok: false, err: 'hk_note'};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var hit = null;
    hkActs_().forEach(function (a) { if (a.id === id) hit = a; });
    if (!hit) return {ok: false, err: 'bad_obs'};
    if (hit.status !== 'Done') return {ok: false, err: 'already_closed'};
    var sh = lazy_('HKActions');
    if (reopen) { sh.getRange(hit.row, 8, 1, 7).setValues([['Open', '', '', '', by, ymdhms_(Date.now()), 'Re-opened: ' + note]]); }
    else sh.getRange(hit.row, 8, 1, 7).setValues([['Verified', hit.doneBy, hit.doneAt, hit.doneNote, by, ymdhms_(Date.now()), note]]);
    return {ok: true};
  } finally { lock.releaseLock(); }
}
function eqLatest_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Equip');
  if (!sh || sh.getLastRow() < 2) return {meta: null, rows: {}};
  var n = sh.getLastRow(), st = Math.max(2, n - 399), rows = sh.getRange(st, 1, n - st + 1, 11).getValues(), id = String(rows[rows.length - 1][0]), out = {}, meta = null;
  rows.forEach(function (r) { if (String(r[0]) === id) { out[String(r[5])] = {found: r[7], cond: String(r[8]), note: String(r[9])}; meta = {id: id, at: String(r[1]), date: String(r[2]), shift: String(r[3]), by: String(r[4])}; } });
  return {meta: meta, rows: out};
}
function eqGet_() {
  var items = eqItems_(), lt = eqLatest_();
  items.forEach(function (x) { x.last = lt.rows[x.en] || null; });
  return {ok: true, items: items, last: lt.meta};
}
function eqSave_(b, by) {
  var items = eqItems_(), rows = b.rows;
  if (!rows || rows.length !== items.length) return {ok: false, err: 'eq_all'};
  var out = [], issues = 0;
  for (var i = 0; i < items.length; i++) {
    var r = rows[i] || {}, found = Number(r.found), cond = String(r.cond || ''), note = txt_(r.note, 200);
    if (['OK', 'Damaged', 'Missing'].indexOf(cond) < 0 || !isFinite(found) || found < 0 || found > 999) return {ok: false, err: 'eq_all'};
    var short = items[i].exp > 0 && found < items[i].exp;
    if ((cond !== 'OK' || short) && note.length < 3) return {ok: false, err: 'eq_note'};
    if (cond !== 'OK' || short) issues++;
    out.push([items[i].en, items[i].exp, Math.floor(found), cond, note]);
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = Date.now(), sf = shiftAt_(now), id = Utilities.getUuid().slice(0, 8), t = ymdhms_(now), sh = lazy_('Equip');
    out.forEach(function (x) { sh.appendRow([id, t, sf.date, sf.code, by, x[0], x[1], x[2], x[3], x[4], now]); });
    return {ok: true, id: id, issues: issues};
  } finally { lock.releaseLock(); }
}
/* Admin overview: recent building checks, actions and equipment problems */
function chkOverview_() {
  var cs = lazy_('HKChecks'), n = cs.getLastRow(), checks = [];
  if (n >= 2) cs.getRange(Math.max(2, n - 29), 1, Math.min(30, n - 1), 9).getValues().forEach(function (r) { checks.push({id: String(r[0]), at: String(r[1]), date: String(r[2]), shift: String(r[3]), by: String(r[4]), items: Number(r[5]), notOk: Number(r[6]), note: String(r[7])}); });
  var acts = hkActs_().map(hkPub_), eq = eqGet_(), prob = [];
  eq.items.forEach(function (x) { var l = x.last; if (l && (l.cond !== 'OK' || (x.exp > 0 && Number(l.found) < x.exp))) prob.push({item: x.en, exp: x.exp, found: l.found, cond: l.cond, note: l.note}); });
  return {ok: true, checks: checks.reverse(), open: acts.filter(function (a) { return a.status === 'Open'; }), done: acts.filter(function (a) { return a.status === 'Done'; }), verified: acts.filter(function (a) { return a.status === 'Verified'; }).slice(-10).reverse(), eqLast: eq.last, eqProblems: prob, eqItems: eq.items.length};
}
/* ---------- Command dashboard for Danru / Shift Supervisors (first screen) ---------- */
/* Finished, non-held rounds between two dates: points nobody scanned = missed. Reads only the tail of Scans. */
function missedRange_(fromD, toD) {
  var now = Date.now(), rounds = [], held = 0, idx = {}, d = Date.parse(fromD + 'T00:00:00Z'), end = Date.parse(toD + 'T00:00:00Z'), c = 0;
  for (; d <= end && c < 31; d += 86400000, c++) {
    var ds = new Date(d).toISOString().slice(0, 10);
    for (var i = 0; i < ROUNDS.length; i++) { var r = roundBy_(ds, i); if (r.end <= now) { if (roundHeld_(r)) held++; else { var o = {date: ds, idx: i, label: r.label, end: r.end, seen: {}}; rounds.push(o); idx[ds + '|' + i] = o; } } }
  }
  scanRows_(fromD).forEach(function (r3) { var wh = rowWhen_(r3); if (wh.idx < 0) return; var o = idx[wh.date + '|' + wh.idx]; if (o) o.seen[String(r3[6])] = 1; });
  var pts = points_(true), missed = 0, withMiss = 0;
  rounds.forEach(function (o) { var m = pts.filter(function (p) { return !o.seen[p.id]; }); o.total = pts.length; o.done = pts.length - m.length; o.missed = m.length; if (m.length) { missed += m.length; withMiss++; } });
  rounds.sort(function (a, b) { return a.end - b.end; });
  var possible = rounds.length * pts.length;
  return {rounds: rounds, held: held, missed: missed, withMiss: withMiss, possible: possible, pct: possible ? Math.round(1000 * missed / possible) / 10 : 0};
}
function dash_() {
  var now = Date.now(), r = roundAt_(now), pts = points_(true), done = doneMap_(r), op = r.opDate;
  var rem = pts.filter(function (p) { return !done[p.id]; }).map(function (p) { return {no: p.no, name: p.name, hi: !!p.hi}; });
  var from7 = new Date(Date.parse(op + 'T00:00:00Z') - 6 * 86400000).toISOString().slice(0, 10);
  var w = missedRange_(from7, op), today = w.rounds.filter(function (x) { return x.date === op; });
  var tm = today.reduce(function (t, x) { return t + x.missed; }, 0), twm = today.filter(function (x) { return x.missed; }).length;
  var lastR = w.rounds.length ? w.rounds[w.rounds.length - 1] : null;
  var oo = obsList_(), hk = hkList_(), eq = eqGet_(), prob = 0;
  eq.items.forEach(function (x) { var l = x.last; if (l && (l.cond !== 'OK' || (x.exp > 0 && Number(l.found) < x.exp))) prob++; });
  var cm = []; try { cm = clockMissing_(op, op); } catch (e) {}
  var gps = null; try { var g = gpsWeek_(from7, op); gps = {checked: g.totals.checked, outside: g.totals.outside, pct: g.totals.pct}; } catch (e2) {}
  var oldest = oo.open.length ? oo.open[oo.open.length - 1] : null;
  return {ok: true, now: now, round: {label: r.label, upcoming: !!r.upcoming, end: r.end, start: r.start, done: pts.length - rem.length, total: pts.length}, remaining: rem.slice(0, 40),
    last: lastR ? {date: lastR.date, label: lastR.label, done: lastR.done, total: lastR.total, missed: lastR.missed} : null,
    today: {rounds: today.length, missed: tm, withMiss: twm, possible: today.length * pts.length, pct: today.length ? Math.round(1000 * tm / (today.length * pts.length)) / 10 : 0},
    week: {rounds: w.rounds.length, held: w.held, missed: w.missed, withMiss: w.withMiss, pct: w.pct, perDay: (function () { var m = {}; w.rounds.forEach(function (x) { var d = m[x.date] || (m[x.date] = {date: x.date, missed: 0, rounds: 0}); d.missed += x.missed; d.rounds++; }); return Object.keys(m).sort().map(function (k) { return m[k]; }); })()},
    issues: {open: oo.open.length, oldest: oldest ? oldest.t : ''}, clean: {open: hk.open.length, done: hk.done.length}, equip: {problems: prob, last: eq.last ? eq.last.date : ''},
    clock: {missing: cm.length, who: cm.slice(0, 8).map(function (x) { return x.guard + ' (' + x.shift + ')'; })}, gps: gps, hold: holdPublic_()};
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
  if (a === 'd_gps') return cached_(cacheKey_(a, b), CACHE_TTL[a], function () {
    var days = Math.max(1, Math.min(31, parseInt(b.days, 10) || 7)), gto = ymdhms_(Date.now()).slice(0, 10), gfrom = ymdhms_(Date.now() - (days - 1) * 86400000).slice(0, 10);
    var gr = gpsWeek_(gfrom, gto);
    gr.totals.noGps = 0; gr.guards.forEach(function (g) { g.noGps = 0; }); gr.points.forEach(function (p) { p.review = false; }); /* the reading advice and the review flag are for the owner only */
    gr.ok = true; gr.days = days;
    return gr;
  }, b.fresh);
  if (a === 'd_dash') return cached_(cacheKey_(a, b), CACHE_TTL[a], function () { return dash_(); }, b.fresh);
  if (a === 'd_hk_get') return hkGet_();
  if (a === 'd_hk_save') return hkSave_(b, adm ? 'Admin' : me.name);
  if (a === 'd_hk_list') return cached_(cacheKey_(a, b), CACHE_TTL[a], function () { return hkList_(); }, b.fresh);
  if (a === 'd_hk_verify') return hkVerify_(b, adm ? 'Admin' : me.name);
  if (a === 'd_eq_get') return cached_(cacheKey_(a, b), CACHE_TTL[a], function () { return eqGet_(); }, b.fresh);
  if (a === 'd_eq_save') return eqSave_(b, adm ? 'Admin' : me.name);
  if (a === 'd_obs_list') return cached_(cacheKey_(a, b), CACHE_TTL[a], function () { return obsList_(); }, b.fresh);
  if (a === 'd_obs_close') return obsClose_(b, adm ? 'Admin' : me.name);
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
    scanRows_(from).forEach(function (r2) {
      var dt = rowWhen_(r2).date;
      if (dt >= from && dt <= to) rows.push({t: r2[1] instanceof Date ? ymdhms_(Number(r2[17])) : String(r2[1]), round: String(r2[3]), guard: String(r2[4]), no: r2[7], name: String(r2[8]), gps: String(r2[14]), dist: r2[13], acc: r2[12], flags: String(r2[15]), photo: String(r2[16] || '')});
    });
    return {ok: true, rows: rows.slice(-2000)};
  }
  if (a === 'a_missed') {
    /* Trends of missed points: a point is missed in a round when nobody scanned it in that round. Weather-hold rounds are excused. */
    var mTo = String(b.to || ymdhms_(Date.now()).slice(0, 10)), mFrom = String(b.from || ymdhms_(Date.now() - 6 * 86400000).slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(mTo) || mFrom > mTo) return {ok: false, err: 'bad_date'};
    var mNow = Date.now(), mHeld = 0, mRounds = [], md = Date.parse(mFrom + 'T00:00:00Z'), mEnd = Date.parse(mTo + 'T00:00:00Z'), mc = 0;
    for (; md <= mEnd && mc < 92; md += 86400000, mc++) {
      var mds = new Date(md).toISOString().slice(0, 10);
      for (var mi = 0; mi < ROUNDS.length; mi++) { var mr = roundBy_(mds, mi); if (mr.end <= mNow) { if (roundHeld_(mr)) mHeld++; else mRounds.push({date: mds, idx: mi, label: mr.label, seen: {}, nScans: 0}); } }
    }
    var mIdx = {}; mRounds.forEach(function (r) { mIdx[r.date + '|' + r.idx] = r; });
    var mSh = sh_('Scans'), mLast = mSh.getLastRow();
    scanRows_(mFrom).forEach(function (r3) {
      var wh = rowWhen_(r3);
      if (wh.idx < 0) return;
      var rr2 = mIdx[wh.date + '|' + wh.idx];
      if (!rr2) return;
      rr2.seen[String(r3[6])] = 1; rr2.nScans++;
    });
    var mPts = points_(true), MP = {}, MD = {}, MS = {}, MZ = {}, MG = {0: 'Morning', 1: 'Morning', 2: 'Morning', 3: 'Afternoon', 4: 'Afternoon', 5: 'Afternoon', 6: 'Night', 7: 'Night', 8: 'Night'}, MSH = {Morning: {missed: 0, rounds: 0}, Afternoon: {missed: 0, rounds: 0}, Night: {missed: 0, rounds: 0}}, detail = [], totMiss = 0, withMiss = 0, empty = 0;
    mPts.forEach(function (p) { MP[p.id] = {no: p.no, name: p.name, zone: p.zone || '', hi: p.hi, missed: 0, rounds: mRounds.length}; });
    for (var q = 0; q < ROUNDS.length; q++) MS[q] = {idx: q, label: rlabel_(q), missed: 0, rounds: 0};
    mRounds.forEach(function (r) {
      var miss = mPts.filter(function (p) { return !r.seen[p.id]; });
      var day = MD[r.date] || (MD[r.date] = {date: r.date, missed: 0, rounds: 0, withMiss: 0});
      day.rounds++; MS[r.idx].rounds++; MSH[MG[r.idx]].rounds++;
      if (miss.length) { day.missed += miss.length; day.withMiss++; withMiss++; MS[r.idx].missed += miss.length; MSH[MG[r.idx]].missed += miss.length; totMiss += miss.length; }
      if (!r.nScans) empty++;
      miss.forEach(function (p) { MP[p.id].missed++; var z = p.zone || '-'; MZ[z] = (MZ[z] || 0) + 1; });
      detail.push({date: r.date, idx: r.idx, label: r.label, shift: MG[r.idx], done: mPts.length - miss.length, total: mPts.length, scans: r.nScans, missed: miss.map(function (p) { return {no: p.no, name: p.name, hi: !!p.hi, zone: p.zone || ''}; })});
    });
    var possible = mRounds.length * mPts.length;
    var byPoint = Object.keys(MP).map(function (k) { var o = MP[k]; o.pct = o.rounds ? Math.round(100 * o.missed / o.rounds) : 0; return o; }).sort(function (x, y) { return y.missed - x.missed || x.no - y.no; });
    return {ok: true, from: mFrom, to: mTo, rounds: mRounds.length, held: mHeld, points: mPts.length, possible: possible, missed: totMiss, roundsWithMiss: withMiss, emptyRounds: empty,
      pct: possible ? Math.round(1000 * totMiss / possible) / 10 : 0,
      byDay: Object.keys(MD).sort().map(function (k) { return MD[k]; }), bySlot: Object.keys(MS).map(function (k) { return MS[k]; }),
      byShift: ['Morning', 'Afternoon', 'Night'].map(function (k) { return {shift: k, missed: MSH[k].missed, rounds: MSH[k].rounds}; }),
      byZone: Object.keys(MZ).map(function (k) { return {zone: k, missed: MZ[k]}; }).sort(function (x, y) { return y.missed - x.missed; }),
      byPoint: byPoint, detail: detail.reverse()};
  }
  if (a === 'a_obsdb') {
    /* Observation database: totals, breakdowns and the full list for a period (Admin only). */
    var oTo = String(b.to || ymdhms_(Date.now()).slice(0, 10)), oFrom = String(b.from || ymdhms_(Date.now() - 29 * 86400000).slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(oFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(oTo) || oFrom > oTo) return {ok: false, err: 'bad_date'};
    var oAll = obsRows_(0).filter(function (o) { return o.date >= oFrom && o.date <= oTo; });
    var T0 = {all: oAll.length, positive: 0, issues: 0, open: 0, closedSpot: 0, closed: 0, withPhoto: 0, avgCloseHrs: null}, OP = {}, OC = {}, OG = {}, OS = {}, OD = {}, hrs = [];
    function bump(m, k, o) {
      var x = m[k] || (m[k] = {key: k, positive: 0, issues: 0, open: 0, closed: 0});
      if (o.type === 'Positive') x.positive++; else { x.issues++; if (o.status === 'Open') x.open++; else x.closed++; }
      return x;
    }
    oAll.forEach(function (o) {
      var iss = o.type !== 'Positive';
      if (iss) T0.issues++; else T0.positive++;
      if (o.photo) T0.withPhoto++;
      if (iss && o.status === 'Open') T0.open++;
      if (iss && o.status === 'Closed on spot') T0.closedSpot++;
      if (iss && o.status === 'Closed') { T0.closed++; var c = Date.parse(String(o.at).replace(' ', 'T') + '+07:00'); if (o.ms && isFinite(c) && c > o.ms) hrs.push((c - o.ms) / 3600000); }
      var loc = (o.no != null ? o.no + '. ' : '') + (o.where || 'No location');
      var lx = bump(OP, loc, o); lx.no = o.no;
      bump(OC, o.cat || '-', o); bump(OG, o.guard || '-', o); bump(OS, o.shift === 'P' ? 'Morning' : (o.shift === 'S' ? 'Afternoon' : (o.shift === 'M' ? 'Night' : '-')), o); bump(OD, o.date || '-', o);
    });
    if (hrs.length) T0.avgCloseHrs = Math.round(10 * hrs.reduce(function (t, x) { return t + x; }, 0) / hrs.length) / 10;
    function arr(m, byKey) { return Object.keys(m).map(function (k) { return m[k]; }).sort(byKey ? function (x, y) { return x.key < y.key ? -1 : 1; } : function (x, y) { return (y.issues + y.positive) - (x.issues + x.positive); }); }
    return {ok: true, from: oFrom, to: oTo, totals: T0, byPoint: arr(OP), byCat: arr(OC), byGuard: arr(OG), byShift: arr(OS), byDay: arr(OD, true),
      list: oAll.slice().reverse().slice(0, 1500).map(function (o) { return {id: o.id, t: o.t, date: o.date, shift: o.shift, guard: o.guard, type: o.type, cat: o.cat, no: o.no, where: o.where, text: o.text, photo: o.photo, status: o.status, by: o.by, at: o.at, note: o.note}; })};
  }
  if (a === 'a_chk') return chkOverview_();
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
    scanRows_(fromD).forEach(function (r3) {
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
    return {ok: true, obs: obsSummary_(fromD, to), outside: {guards: outG, points: outP}, heldRounds: heldN, videos: videoRows_(fromD, to), clock: clk, clockMissing: cmiss, from: fromD, to: to, rounds: n, points: rows, guards: Object.keys(G).map(function (k) { return G[k]; }).sort(function (x, y) { return y.scans - x.scans; }),
      totals: {scans: total, pct: n && rows.length ? Math.round(100 * coveredSum / (n * rows.length)) : 0, calibrated: rows.filter(function (x) { return x.cal; }).length, points: rows.length, noGps: rows.reduce(function (t, x) { return t + x.noGps; }, 0), issues: rows.reduce(function (t, x) { return t + x.issues; }, 0)}};
  }
  if (a === 'a_view') {
    /* Read-only 'view as': the same state a guard's phone gets, for the Admin screen. Nothing is written. */
    var vl = guards_().map(function (g) { return {name: g.name, role: g.role, danru: g.danru}; });
    if (!b.name) return {ok: true, guards: vl};
    var vt = null, vk = String(b.name).trim().toLowerCase();
    guards_().forEach(function (g) { if (g.name.toLowerCase() === vk) vt = g; });
    if (!vt) return {ok: false, err: 'unknown_guard'};
    var vs = state_(vt); vs.guards = vl;
    return vs;
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
    excludeDanru: cfg_('AWARD_EXCLUDE_DANRU', 'yes').toLowerCase() !== 'no',
    minObs: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_OBS', '0')) || 0)),
    minPos: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_POS', '0')) || 0)),
    minIss: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_ISS', '0')) || 0)),
    minOPhotos: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_OPHOTOS', '0')) || 0)),
    minSpot: Math.max(0, Math.round(Number(cfg_('AWARD_MIN_SPOT', '0')) || 0))
  };
}
function awardStats_(month) {
  var c = awardCrit_(), sh = sh_('Scans'), last = sh.getLastRow(), by = {}, eligible = {};
  guards_().forEach(function (g) { if (!(c.excludeDanru && g.danru)) eligible[g.name] = 1; });
  scanRows_(month + '-01').forEach(function (r) {
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
  /* Observations of the month: count, positive : issues, photos, issues closed on the spot. */
  var ob = {};
  try { obsRowsSince_(month + '-01').forEach(function (o) {
    if (!o.type || o.date.slice(0, 7) !== month || !eligible[o.guard]) return;
    var x = ob[o.guard] || (ob[o.guard] = {obs: 0, pos: 0, iss: 0, ophotos: 0, spot: 0});
    x.obs++; if (o.type === 'Positive') x.pos++; else { x.iss++; if (o.spot) x.spot++; }
    if (o.photo) x.ophotos++;
  }); } catch (e1) {}
  var rows = Object.keys(by).map(function (k) {
    var o = by[k], days = Object.keys(o.days).length, x = ob[k] || {obs: 0, pos: 0, iss: 0, ophotos: 0, spot: 0};
    var q = o.scans >= c.minScans && days >= c.minDays && (c.maxIssues == null || o.issues <= c.maxIssues) && o.scans > 0 &&
      x.obs >= c.minObs && x.pos >= c.minPos && x.iss >= c.minIss && x.ophotos >= c.minOPhotos && x.spot >= c.minSpot;
    return {guard: o.guard, scans: o.scans, days: days, issues: o.issues, photos: o.photos, obs: x.obs, pos: x.pos, iss: x.iss, ophotos: x.ophotos, spot: x.spot, q: q};
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
    ['minScans:AWARD_MIN_SCANS', 'minDays:AWARD_MIN_DAYS', 'minObs:AWARD_MIN_OBS', 'minPos:AWARD_MIN_POS', 'minIss:AWARD_MIN_ISS', 'minOPhotos:AWARD_MIN_OPHOTOS', 'minSpot:AWARD_MIN_SPOT'].forEach(function (p) {
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
  en: {OUTSIDE: 'outside radius', NO_GPS: 'no GPS', SUSPECT_GPS: 'suspect GPS', LOW_ACCURACY: 'low GPS accuracy', NO_PHOTO: 'no photo', TOO_FAST: 'moved too fast', PHOTO_FAIL: 'photo failed', VPN_SUSPECT: 'VPN suspected', NOT_ON_PLAN: 'not on the shift plan'},
  id: {OUTSIDE: 'di luar radius', NO_GPS: 'tanpa GPS', SUSPECT_GPS: 'GPS mencurigakan', LOW_ACCURACY: 'akurasi GPS rendah', NO_PHOTO: 'tanpa foto', TOO_FAST: 'bergerak terlalu cepat', PHOTO_FAIL: 'foto gagal', VPN_SUSPECT: 'VPN dicurigai', NOT_ON_PLAN: 'tidak ada di rencana shift'}
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
/* ---------- gpsTrace (v1.51): what is a guard's phone / behaviour doing? Run from the editor. Owner only: result in the log and ONE email to the first NOTIFY_EMAIL.
   Config TRACE_GUARD (part of a name, default 'Irvan'), TRACE_DAYS (default 3). Part 1 compares EVERY guard (so one bad phone shows up as an outlier), part 2 lists the chosen guard's scans in time order. */
function gpsTrace() {
  var gname = String(cfg_('TRACE_GUARD', 'Irvan')).toLowerCase(), days = Math.max(1, Math.min(14, parseInt(cfg_('TRACE_DAYS', '3'), 10) || 3));
  var from = ymdhms_(Date.now() - (days - 1) * 86400000).slice(0, 10), sh = sh_('Scans'), nc = Math.max(18, Math.min(20, sh.getLastColumn()));
  var last = sh.getLastRow(), rows = [];
  if (last >= 2) { var st = Math.max(2, last - 6000 + 1); rows = sh.getRange(st, 1, last - st + 1, nc).getValues(); }
  var lim = Date.now() - days * 86400000;
  rows = rows.filter(function (r) { return Number(r[17]) >= lim && String(r[15]).indexOf('REPEAT') < 0; }).sort(function (a, b) { return Number(a[17]) - Number(b[17]); });
  var pts = {}; points_(true).forEach(function (p) { pts[p.id] = p; });
  var by = {};
  rows.forEach(function (r) { var g = String(r[4]); (by[g] || (by[g] = [])).push(r); });
  function med(a) { if (!a.length) return ''; a = a.slice().sort(function (x, y) { return x - y; }); return a[Math.floor(a.length / 2)]; }
  function stat(list) {
    var n = list.length, acc = [], dist = [], out = 0, low = 0, gaps = [], pos = [];
    list.forEach(function (r) {
      var a = Number(r[12]), d = Number(r[13]), f = String(r[15]), g = String(r[14]);
      if (isFinite(a) && r[12] !== '') acc.push(a);
      if (r[13] !== '' && isFinite(d)) dist.push(d);
      if (g === 'OUTSIDE') out++; if (f.indexOf('LOW_ACCURACY') >= 0) low++;
      if (r.length > 19 && r[19] !== '') gaps.push(Number(r[19]));
      if (r[10] !== '' && r[11] !== '') pos.push([Number(r[10]), Number(r[11])]);
    });
    /* how many recorded positions lie within 25 m of the most common spot while the points they belong to are 60 m or more apart from that spot's point */
    var best = 0;
    pos.forEach(function (p) { var c = 0; pos.forEach(function (q) { if (hav_(p[0], p[1], q[0], q[1]) <= 25) c++; }); if (c > best) best = c; });
    var cx = pos.length ? pos.reduce(function (t, p) { return t + p[0]; }, 0) / pos.length : 0, cy = pos.length ? pos.reduce(function (t, p) { return t + p[1]; }, 0) / pos.length : 0, spread = 0;
    pos.forEach(function (p) { var d = hav_(cx, cy, p[0], p[1]); if (d > spread) spread = d; });
    var pointsSeen = {}; list.forEach(function (r) { pointsSeen[String(r[6])] = 1; });
    return {n: n, medAcc: med(acc), medDist: med(dist), outside: out, low: low, cluster: best, clusterPct: pos.length ? Math.round(100 * best / pos.length) : 0, spread: Math.round(spread), distinct: Object.keys(pointsSeen).length, medGap: med(gaps), gaps: gaps.length};
  }
  var html = '<h3>GPS trace, last ' + days + ' day(s) from ' + from + '</h3><p>Compares every guard. "Same spot" = share of scans whose recorded position is within 25 m of the most common position (a guard really walking the site should be low). "Spread" = furthest recorded position from the middle of his scans (a real patrol covers 150 m or more).</p>';
  html += '<table border="1" cellpadding="4" style="border-collapse:collapse;font-size:13px"><tr><th>Guard</th><th>Scans</th><th>Median accuracy m</th><th>Median distance m</th><th>Outside</th><th>Low acc.</th><th>Same spot %</th><th>Spread m</th><th>Selfie gap s (median)</th></tr>';
  var names = Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; });
  names.forEach(function (g) {
    var x = stat(by[g]), hot = g.toLowerCase().indexOf(gname) >= 0;
    html += '<tr' + (hot ? ' style="background:#fff3cd"' : '') + '><td>' + esc_(g) + '</td><td>' + x.n + '</td><td>' + x.medAcc + '</td><td>' + x.medDist + '</td><td>' + x.outside + '</td><td>' + x.low + '</td><td>' + x.clusterPct + '</td><td>' + x.spread + '</td><td>' + (x.gaps ? x.medGap + ' (' + x.gaps + ')' : '-') + '</td></tr>';
    Logger.log(g + ': scans ' + x.n + ', median acc ' + x.medAcc + ' m, median dist ' + x.medDist + ' m, outside ' + x.outside + ', same spot ' + x.clusterPct + '%, spread ' + x.spread + ' m, selfie gap ' + x.medGap);
  });
  html += '</table>';
  var target = names.filter(function (g) { return g.toLowerCase().indexOf(gname) >= 0; });
  target.forEach(function (g) {
    var list = by[g], x = stat(list), prev = null, jumps = 0;
    html += '<h3>' + esc_(g) + ' in time order</h3><table border="1" cellpadding="3" style="border-collapse:collapse;font-size:12px"><tr><th>Time</th><th>Point</th><th>Acc m</th><th>Dist from point m</th><th>GPS</th><th>Moved since previous scan m</th><th>Seconds since previous</th><th>Speed m/s</th><th>Selfie gap s</th></tr>';
    list.forEach(function (r) {
      var ms = Number(r[17]), moved = '', dt = '', sp = '', note = '';
      if (prev) {
        dt = Math.round((ms - Number(prev[17])) / 1000);
        if (r[10] !== '' && prev[10] !== '') { moved = Math.round(hav_(Number(prev[10]), Number(prev[11]), Number(r[10]), Number(r[11]))); sp = dt > 0 ? Math.round(10 * moved / dt) / 10 : ''; }
        var pa = pts[String(prev[6])], pb = pts[String(r[6])];
        if (pa && pb && pa.lat && pb.lat && moved !== '') { var between = hav_(pa.lat, pa.lng, pb.lat, pb.lng); if (between > 60 && moved < 20) { jumps++; note = ' style="background:#fde2e2"'; } }
      }
      html += '<tr' + note + '><td>' + esc_(String(r[1]).slice(5, 19)) + '</td><td>' + r[7] + ' ' + esc_(String(r[8])) + '</td><td>' + r[12] + '</td><td>' + r[13] + '</td><td>' + esc_(String(r[14])) + '</td><td>' + moved + '</td><td>' + dt + '</td><td>' + sp + '</td><td>' + (r.length > 19 ? r[19] : '') + '</td></tr>';
      prev = r;
    });
    html += '</table><p><b>Reading it:</b> pink rows = two points that are more than 60 m apart on the site but his phone recorded the two scans less than 20 m apart (he did not move between them: same spot, or a phone that reports a fixed place). Count of pink rows: <b>' + jumps + '</b> of ' + list.length + '.</p>';
    Logger.log(g + ': same-spot jumps ' + jumps + ' of ' + list.length + ', spread ' + x.spread + ' m');
  });
  if (!target.length) html += '<p>No scans found for "' + esc_(gname) + '" in this period (set Config TRACE_GUARD).</p>';
  html += '<p><b>How to read the comparison:</b> if only this guard has a high accuracy figure (worse than 50 m) and the other columns look normal for the rest, the cause is his phone settings (precise location off, battery saver). If his positions repeat the same spot (high Same spot %, small Spread) while the points scanned are far apart, the scans were made from one place. A selfie gap well above the others (over 120 s) means he went to the point after scanning. Talk first, decide after.</p>';
  var to = cfg_('NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my').split(',')[0].trim();
  try { MailApp.sendEmail({to: to, subject: 'EcoOils Patrol: GPS trace ' + from + ' (' + target.length + ' guard focus)', htmlBody: html}); Logger.log('Trace emailed to ' + to); } catch (e) { Logger.log('Email FAILED: ' + e); }
}
function sendTo_(subject, htmlFull, htmlQuiet) {
  var lst = function (k) { return String(cfg_(k, '')).split(',').map(function (x) { return x.trim(); }).filter(String); };
  var all = cfg_('NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!all.length) return;
  var seen = {}, rest = [];
  seen[all[0].toLowerCase()] = 1;
  all.slice(1).concat(lst('DANRU_EMAIL')).forEach(function (a) { var k = a.toLowerCase(); if (!seen[k]) { seen[k] = 1; rest.push(a); } }); /* the Danru gets the round and daily emails too */
  if (!quiet_() || htmlQuiet === undefined) { MailApp.sendEmail({to: [all[0]].concat(rest).join(','), subject: subject, htmlBody: htmlFull}); return; }
  MailApp.sendEmail({to: all[0], subject: subject, htmlBody: htmlFull});
  if (htmlQuiet && rest.length) MailApp.sendEmail({to: rest.join(','), subject: subject, htmlBody: htmlQuiet});
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
    var st = 'none', by = '', url = '', gap = '';
    rows.forEach(function (row) {
      var ms = Number(row[17]);
      if (ms >= r.start && ms < r.end && String(row[6]) === p.id) {
        by = String(row[4]);
        if (row[16]) { st = 'taken'; url = String(row[16]); gap = (row.length > 19 && row[19] !== '') ? Number(row[19]) : ''; } else if (st !== 'taken') st = 'missing';
      }
    });
    out.push({no: p.no, name: p.name, status: st, by: by, url: url, gap: gap});
  });
  return out.sort(function (a, b) { return a.no - b.no; });
}
function photoHtml_(list, L, owner) {
  if (!list.length) return '';
  var T = TXT[L], taken = list.filter(function (x) { return x.status === 'taken'; }).length;
  var h = '<p style="margin:12px 0 2px"><b>' + T.photoChecks + ': ' + taken + ' ' + T.of + ' ' + list.length + '</b></p><ul style="margin:0;list-style:none;padding-left:0">';
  list.forEach(function (x) {
    var lab = x.status === 'taken' ? '<span style="color:#1a7f37">&#10003; ' + T.photoTaken + '</span>' + (x.url ? ' (<a href="' + esc_(x.url) + '">' + T.photoLink + '</a>)' : '') : (x.status === 'missing' ? '<b style="color:#b00020">&#10007; ' + T.photoMissing + '</b>' : '<span style="color:#666">- ' + T.photoNone + '</span>');
    var gp = '';
    if (owner && x.status === 'taken' && x.gap !== '' && x.gap !== undefined) { var g = Number(x.gap), late = g > 120, mid = g > 45 && !late; gp = ' - <span style="color:' + (late ? '#b00020' : (mid ? '#a05a00' : '#666')) + '">' + (L === 'id' ? 'selfie ' + g + ' dtk setelah pindai' : 'selfie ' + g + ' s after scan') + (late ? (L === 'id' ? ' (LAMA: mungkin berjalan ke titik)' : ' (LONG: may have walked to the point)') : (mid ? (L === 'id' ? ' (agak lama)' : ' (slow)') : '')) + '</span>'; }
    h += '<li>' + lab + ' - ' + T.no + ' ' + x.no + ' ' + esc_(x.name) + (x.by ? ' - ' + esc_(x.by) : '') + gp + '</li>';
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
function roundHtml_(L, r, pts, missed, hi, flagged, photos, owner) {
  var T = TXT[L];
  var h = '<h3 style="margin:0 0 6px">' + T.round + ' ' + esc_(r.label) + ' (' + r.date + ')</h3><p><b>' + T.done + ' ' + (pts.length - missed.length) + ' ' + T.of + ' ' + pts.length + '. ' + T.missed + ' ' + missed.length + '.</b></p>';
  if (missed.length) h += '<p style="margin:8px 0 0"><b>' + T.notScanned + '</b> (' + T.highFirst + ')</p>' + groupHtml_(hi, L) + groupHtml_(missed.filter(function (p) { return !p.hi; }), L);
  h += photoHtml_(photos, L, owner) + flagHtml_(flagged, L);
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
  var allClear = String(cfg_('ROUND_ALL_CLEAR', 'yes')).toLowerCase() !== 'no'; /* owner 24 Oct: also send an email when every point was scanned */
  if (!missed.length && !flagged.length && !allClear) return;
  var hi = missed.filter(function (p) { return p.hi; });
  var subj = 'Patrol / Patroli ' + r.date + ' ' + r.label + ': ' + (pts.length - missed.length) + '/' + pts.length + (missed.length ? ' - ' + missed.length + ' missed / terlewat' : ' - all done / semua selesai') + (hi.length ? ' (' + hi.length + ' high-risk / risiko tinggi)' : '');
  var foot = '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  var h = both_(roundHtml_('en', r, pts, missed, hi, flagged, photos, true), roundHtml_('id', r, pts, missed, hi, flagged, photos, true)) + foot;
  var fq = hideGps_(flagged), hq = (missed.length || fq.length || allClear) ? both_(roundHtml_('en', r, pts, missed, hi, fq, photos), roundHtml_('id', r, pts, missed, hi, fq, photos)) + foot : '';
  sendTo_(subj, h, hq);
}
/* One-off catch-up for the Danru: every round that ended after CATCHUP_FROM (Config, Jakarta time, default 2026-10-23 20:00) up to now, missed points only (no GPS flags, no photo checks). Run it from the editor; it sends to DANRU_EMAIL (else the other NOTIFY_EMAIL addresses). */
function missedCatchUp() {
  var from = String(cfg_('CATCHUP_FROM', '2026-10-23 20:00')).trim(), m = from.match(/^(\d{4}-\d\d-\d\d)[ T](\d\d):(\d\d)/);
  if (!m) { Logger.log('CATCHUP_FROM must look like 2026-10-23 20:00'); return; }
  var fromMs = Date.parse(m[1] + 'T' + m[2] + ':' + m[3] + ':00Z') - OFF, now = Date.now(), pts = points_(true);
  var base = Date.parse(roundAt_(now).opDate + 'T00:00:00Z'), parts = {en: '', id: ''}, n = 0, tot = 0;
  for (var k = -4; k <= 0; k++) {
    var d = new Date(base + k * 86400000).toISOString().slice(0, 10);
    for (var i = 0; i < ROUNDS.length; i++) {
      var r = roundBy_(d, i);
      if (r.end <= fromMs || r.end > now) continue;
      n++;
      if (roundHeld_(r)) continue;
      var dn = doneMap_(r), missed = pts.filter(function (p) { return !dn[p.id]; });
      if (!missed.length) continue;
      tot += missed.length;
      var hi = missed.filter(function (p) { return p.hi; });
      parts.en += roundHtml_('en', r, pts, missed, hi, [], []);
      parts.id += roundHtml_('id', r, pts, missed, hi, [], []);
    }
  }
  var to = String(cfg_('DANRU_EMAIL', '')).split(',').map(function (x) { return x.trim(); }).filter(String);
  if (!to.length) to = cfg_('NOTIFY_EMAIL', '').split(',').slice(1).map(function (x) { return x.trim(); }).filter(String);
  if (!to.length) { Logger.log('No Danru address: add DANRU_EMAIL to Config'); return; }
  var head = '<p><b>Missed points since / Titik terlewat sejak ' + from + ' (' + n + ' rounds / putaran)</b></p>';
  var body = tot ? parts.en + '<hr style="margin:18px 0;border:0;border-top:2px solid #999">' + parts.id : '<p>No missed points in these rounds. / Tidak ada titik terlewat pada putaran ini.</p>';
  MailApp.sendEmail({to: to.join(','), subject: 'Missed points since / Titik terlewat sejak ' + from + ': ' + tot, htmlBody: '<div style="font-family:Arial,sans-serif;font-size:14px">' + head + body + '</div><p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>'});
  Logger.log('Sent to ' + to.join(',') + ': ' + n + ' rounds, ' + tot + ' missed points');
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
  var h = both_(dailyHtml_('en', y, tr, top, missCount, flagList, phTaken, phReq) + obsDailyHtml_('en', y), dailyHtml_('id', y, tr, top, missCount, flagList, phTaken, phReq) + obsDailyHtml_('id', y)) + foot;
  var fq = hideGps_(flagList), hq = both_(dailyHtml_('en', y, tr, top, missCount, fq, phTaken, phReq) + obsDailyHtml_('en', y), dailyHtml_('id', y, tr, top, missCount, fq, phTaken, phReq) + obsDailyHtml_('id', y)) + foot;
  sendTo_('Daily patrol summary / Ringkasan patroli harian ' + y + ': ' + totalMissed + ' missed / terlewat; photos / foto ' + phTaken + '/' + phReq, h, hq);
}
