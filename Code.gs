/* EcoOils Mentari - Security Patrol backend (Google Apps Script)  v1.6
   Paste into Extensions > Apps Script of the "EcoOils Patrol Log" Google Sheet.
   Do NOT upload this file to GitHub (it holds the guard list). */
var VERSION = 'v1.6';
var OFF = 7 * 3600000;      // Jakarta (WIB), no daylight saving
var RMS = 2 * 3600000;      // one round = 2 hours
var TZ = 'Asia/Jakarta';
var ZORDER = ['GT', 'FN', 'PL', 'UT', 'LD', 'BL', 'MP'];
var ZNAME = {GT: 'Gate / entry', FN: 'Perimeter fence', PL: 'Process plant', UT: 'Utilities / tanks', LD: 'Laydown', BL: 'Buildings', MP: 'Muster point'};
var HEAD = {
  Scans: ['ScanId', 'Time (WIB)', 'Date', 'Round', 'Guard', 'Role', 'Point ID', 'No', 'Point name', 'Zone', 'Lat', 'Lng', 'Accuracy m', 'Distance m', 'GPS', 'Flags', 'Photo', 'Time ms'],
  Points: ['Point ID', 'No', 'Name', 'UAUC location', 'Zone', 'Radius m', 'Photo', 'Active', 'Lat', 'Lng', 'Calibrated at', 'Notes', 'Seq'],
  Guards: ['Name', 'Role', 'Active', 'PIN hash', 'Danru', 'PIN set (WIB)'],
  Config: ['Key', 'Value']
};
var SEED_POINTS = [["MEN-SEC-GT-01",1,"Main gate / security building","SECURITY BUILDING","GT",25,"Yes","Entry and exit control"],["MEN-SEC-GT-02",2,"West gate / security post","SECURITY POST","GT",25,"Yes","Confirm actual gate position"],["MEN-SEC-GT-03",3,"Weighbridge","WEIGHT BRIDGE","GT",25,"No","Confirm position"],["MEN-SEC-BL-02",4,"Administration building","ADMINISTRATION BUILDING","BL",25,"No","Confirm position"],["MEN-SEC-BL-03",5,"Warehouse Block B","WAREHOUSE BLOCK B","BL",25,"No","Confirm position"],["MEN-SEC-BL-04",6,"Workshop area(In admin Building)","WORKSHOP AREA","BL",25,"No","Confirm position"],["MEN-SEC-LD-01",7,"Block 6 B South East Corner","BLOCK 6 B SOUTH EAST CORNER","LD",25,"No",""],["MEN-SEC-LD-02",8,"GSB Office","GSB OFFICE","LD",25,"No",""],["MEN-SEC-LD-03",9,"WEN Office","WEN OFFICE","LD",25,"No",""],["MEN-SEC-LD-04",10,"PBS Office","PBS OFFICE","LD",25,"No",""],["MEN-SEC-LD-05",11,"KKS Office","KKS OFFICE","LD",25,"No",""],["MEN-SEC-MP-01",12,"MCC Building","MCC BUILDING","MP",25,"No","Confirm position"],["MEN-SEC-PL-01",13,"DDE treatment plant (DTP)","DDE TREATMENT PLANT (DTP)","PL",40,"No",""],["MEN-SEC-PL-02",14,"Soil disposal gate","VAPOR ABSORPTION MACHINE (VAM) SHED","PL",40,"No",""],["MEN-SEC-PL-03",15,"Pipe rack - north","PIPE RACK","PL",40,"No","Fix on a column; not on pipe"],["MEN-SEC-PL-04",16,"Cooling tower","COOLING TOWER","PL",40,"No","Confirm position"],["MEN-SEC-PL-05",17,"Dirty cooling tower","DIRTY COOLING TOWER","PL",40,"No","Confirm position"],["MEN-SEC-PL-06",18,"FFA plant","FA PLANT","PL",40,"No","Confirm position"],["MEN-SEC-PL-07",19,"Pipe rack - centre","PIPE RACK","PL",40,"No","Fix on a column; not on pipe"],["MEN-SEC-PL-08",20,"Pipe rack - tank farm","OIL POLISHING PLANT","PL",40,"No","Confirm position"],["MEN-SEC-PL-09",21,"Boiler / chimney area","BOILER / CHIMNEY AREA","PL",40,"Yes","High risk; hot surfaces; keep QR clear of heat"],["MEN-SEC-PL-10",22,"Electrical substation (PLN)","ELECTRICAL SUBSTATION (PLN)","PL",40,"Yes","Fix on outer fence or wall only"],["MEN-SEC-PL-11",23,"Extraction plant - north","EXTRACTION PLANT","PL",40,"No",""],["MEN-SEC-PL-12",24,"Pre-treatment unit (PTU)","PRE TREATMENT UNIT (PTU)","PL",40,"No",""],["MEN-SEC-PL-13",25,"Control room / MCC room","CONTROL ROOM, MCC ROOM","PL",40,"No","Outer wall at entrance"],["MEN-SEC-PL-14",26,"Extraction plant - centre","EXTRACTION PLANT","PL",40,"Yes","High risk; hexane process"],["MEN-SEC-PL-15",27,"Silo","SILO","PL",40,"No",""],["MEN-SEC-PL-16",28,"Extraction plant - south","EXTRACTION PLANT","PL",40,"No",""],["MEN-SEC-UT-01",29,"Scheduled and domestic waste shed","SCHEDULED & DOMESTIC WASTE SHED","UT",40,"No",""],["MEN-SEC-UT-02",30,"Dry and liquid chemical storage","DRY AND LIQUID CHEMICAL STORAGE","UT",40,"Yes","Chemical storage"],["MEN-SEC-UT-03",31,"Raw water pit","RAW WATER PIT","UT",40,"No","Fix on fence; not at pit edge"],["MEN-SEC-UT-04",32,"SBE 1","HEXANE TANK","UT",40,"Yes","High risk; outside bund wall"],["MEN-SEC-UT-05",33,"Tank farm -21T03","TANK FARM","UT",40,"No","Outside bund wall"],["MEN-SEC-UT-06",34,"Tank farm - 21T01","TANK FARM","UT",40,"Yes","High risk; outside bund wall"],["MEN-SEC-UT-07",35,"Tank farm - 21T08","TANK FARM","UT",40,"No","Outside bund wall"],["MEN-SEC-UT-08",36,"Fire water tank","FIRE WATER TANK","UT",40,"No","Confirm position"],["MEN-SEC-UT-09",37,"Fire water pump house","FIRE WATER PUMP HOUSE","UT",40,"No","Confirm position"],["MEN-SEC-UT-10",38,"Hexane and diesel receiving bay","HEXANE AND DIESEL RECEIVING BAY","UT",40,"Yes","High risk; offloading area"],["MEN-SEC-UT-11",39,"Water treatment plant (WTP) and tanks","WATER TREATMENT PLANT (WTP) AND WATER TANKS","UT",40,"No",""],["MEN-SEC-UT-12",40,"SBE 2","LOADING/UNLOADING AREA (PUMP HOUSE)","UT",40,"No",""],["MEN-SEC-UT-13",41,"Diesel tank / generator area","DIESEL TANK","UT",40,"Yes","Fuel storage; outside bund wall"],["MEN-SEC-UT-14",42,"Effluent treatment plant (ETP)","EFFLUENT TREATMENT PLANT (ETP)","UT",40,"No","Confirm position"],["MEN-SEC-UT-15",43,"Waste water treatment plant (WWTP)","WASTE WATER TREATMENT PLANT (WWTP)","UT",40,"No","Confirm position"],["MEN-SEC-FN-01",44,"North-west corner Block 6a","NORTH-WEST CORNER BLOCK 6A","FN",25,"No",""],["MEN-SEC-FN-02",45,"EcoOils Ware House","ECOOILS WARE HOUSE","FN",25,"No",""]];
var SEED_GUARDS = [
  ['Agus Fazar', 'Army'], ['Muhammad Irsan', 'Supervisor'], ['Jhonsen Panjaitan', 'Leader'], ['Rendi Irawan', 'Leader'], ['Try Agung Pramana', 'Leader'],
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
  var pts = s.getSheetByName('Points');
  if (pts.getLastRow() < 2) {
    pts.getRange(2, 1, SEED_POINTS.length, 13).setValues(SEED_POINTS.map(function (p) {
      return [p[0], p[1], p[2], p[3], p[4], p[5], p[6], 'Yes', '', '', '', p[7], p[1]];
    }));
  }
  var g = s.getSheetByName('Guards');
  if (g.getLastRow() < 2) g.getRange(2, 1, SEED_GUARDS.length, 6).setValues(SEED_GUARDS.map(function (x) { return [x[0], x[1], 'Yes', '', (x[1] === 'Leader' || x[1] === 'Supervisor') ? 'Yes' : 'No', '']; }));
  upgrade_();
  var c = s.getSheetByName('Config');
  if (c.getLastRow() < 2) c.getRange(2, 1, 3, 2).setValues([['SHOW_NAMES', 'yes'], ['NOTIFY_EMAIL', 'Ignatius.Ambrosio@ecooils.com.my'], ['PHOTO_PER_ROUND', '5']]);
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
  sh.getRange(2, 5, n - 1, 1).setValues(v.map(function (r) { return [(r[1] === 'Leader' || r[1] === 'Supervisor') ? 'Yes' : 'No']; }));
}
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'roundCheck' || h === 'dailySummary') ScriptApp.deleteTrigger(t);
  });
  for (var h = 0; h < 24; h += 2) ScriptApp.newTrigger('roundCheck').timeBased().atHour(h).nearMinute(5).everyDays(1).inTimezone(TZ).create();
  ScriptApp.newTrigger('dailySummary').timeBased().atHour(7).nearMinute(10).everyDays(1).inTimezone(TZ).create();
  Logger.log('Triggers created: 12 round checks (every 2 hours) and 1 daily summary at about 07:10 Jakarta time.');
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
function roundAt_(ms) {
  var l = ms + OFF, day = Math.floor(l / 86400000) * 86400000, i = Math.floor((l - day) / RMS), st = day + i * RMS - OFF;
  return {date: new Date(day).toISOString().slice(0, 10), idx: i, start: st, end: st + RMS, label: p2_(i * 2) + ':00-' + p2_(i * 2 + 2) + ':00'};
}
function roundBy_(date, idx) {
  var day = Date.parse(date + 'T00:00:00Z'), st = day + idx * RMS - OFF;
  return {date: date, idx: idx, start: st, end: st + RMS, label: p2_(idx * 2) + ':00-' + p2_(idx * 2 + 2) + ':00'};
}
function cfg_(k, def) {
  var sh = sh_('Config'), n = sh.getLastRow();
  if (n < 2) return def;
  var v = sh.getRange(2, 1, n - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === k) return String(v[i][1]);
  return def;
}
function setCfg_(k, val) {
  var sh = sh_('Config'), n = sh.getLastRow();
  var v = n > 1 ? sh.getRange(2, 1, n - 1, 2).getValues() : [];
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === k) { sh.getRange(i + 2, 2).setValue(val); return; }
  sh.appendRow([k, val]);
}
function points_(activeOnly) {
  var sh = sh_('Points'), n = sh.getLastRow();
  if (n < 2) return [];
  var out = [];
  sh.getRange(2, 1, n - 1, 13).getValues().forEach(function (r, i) {
    if (!r[0]) return;
    var p = {row: i + 2, id: String(r[0]), no: Number(r[1]), name: String(r[2]), uauc: String(r[3]), zone: String(r[4]), radius: Number(r[5]) || 25,
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
function scans_(n) {
  var sh = sh_('Scans'), last = sh.getLastRow();
  if (last < 2) return [];
  var st = Math.max(2, last - n + 1);
  return sh.getRange(st, 1, last - st + 1, 18).getValues();
}
function doneMap_(r) {
  var d = {};
  scans_(1500).forEach(function (row) {
    var ms = Number(row[17]);
    if (ms >= r.start && ms < r.end && !d[row[6]]) d[row[6]] = {t: ms, by: String(row[4]), flags: String(row[15]), gps: String(row[14]), photo: String(row[16] || '')};
  });
  return d;
}
/* Random photo checks: N points per round, chosen by the server from a secret, stable for the whole round, never sent to the phones in advance. */
function photoN_() { var n = parseInt(cfg_('PHOTO_PER_ROUND', '5'), 10); return isFinite(n) && n > 0 ? Math.min(n, 45) : 0; }
function photoSecret_() {
  var p = props_(), s = p.getProperty('PHOTO_SECRET');
  if (!s) { s = Utilities.getUuid(); p.setProperty('PHOTO_SECRET', s); }
  return s;
}
function photoSet_(r, pts) {
  var n = photoN_(), set = {};
  if (!n) return set;
  var sec = photoSecret_();
  pts.filter(function (p) { return p.active; }).map(function (p) {
    var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sec + '|' + r.date + '|' + r.idx + '|' + p.id).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
    return {id: p.id, h: h};
  }).sort(function (a, b) { return a.h < b.h ? -1 : a.h > b.h ? 1 : 0; }).slice(0, n).forEach(function (x) { set[x.id] = true; });
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
function folder_() {
  var p = props_(), id = p.getProperty('PHOTO_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('EcoOils Patrol Photos');
  p.setProperty('PHOTO_FOLDER', f.getId());
  return f;
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
  var a = String(b.action || '');
  if (a === 'ping') return {ok: true, version: VERSION};
  if (a.indexOf('a_') === 0) {
    if (!adminOk_(b.pin)) return {ok: false, err: 'pin'};
    return admin_(a, b);
  }
  if (a.indexOf('d_') === 0) return team_(a, b);
  if (a !== 'state' && a !== 'scan' && a !== 'photo') return {ok: false, err: 'action'};
  if (locked_('fg', 20)) return {ok: false, err: 'locked'};
  var me = guardByPin_(b.gp);
  if (!me) return {ok: false, err: 'pin'};
  if (a === 'state') return state_(me);
  if (a === 'photo') return photo_(b, me);
  return scan_(b, me);
}
function state_(me) {
  var now = Date.now(), r = roundAt_(now);
  return {
    ok: true, version: VERSION, now: now, round: r, showNames: cfg_('SHOW_NAMES', 'yes') === 'yes', me: {name: me.name, role: me.role, danru: me.danru},
    points: points_(true).map(function (p) { return {id: p.id, no: p.no, seq: p.seq, name: p.name, zone: p.zone, hi: p.hi}; }),
    done: doneMap_(r)
  };
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
  var lat = num_(b.lat), lng = num_(b.lng), acc = num_(b.acc), dist = '', gps;
  if (lat == null || lng == null) { gps = 'NO_GPS'; flags.push('NO_GPS'); }
  else if (pt.lat == null || pt.lng == null) { gps = 'UNCALIBRATED'; }
  else {
    dist = Math.round(hav_(lat, lng, pt.lat, pt.lng));
    if (dist <= pt.radius + Math.min(acc || 0, 30)) gps = 'OK'; else { gps = 'OUTSIDE'; flags.push('OUTSIDE'); }
  }
  if (acc != null && acc === 0) flags.push('SUSPECT_GPS');
  if (acc != null && acc > 50) flags.push('LOW_ACCURACY');
  var lock = LockService.getScriptLock(), sid = Utilities.getUuid().slice(0, 8), needPhoto = false;
  lock.waitLock(20000);
  try {
    var r = roundAt_(ts), prev = doneMap_(r);
    needPhoto = !!photoSet_(r, pts)[pt.id];
    if (prev[pt.id]) flags.push('REPEAT');
    var recent = scans_(200);
    for (i = recent.length - 1; i >= 0; i--) {
      var row = recent[i], pms = Number(row[17]);
      if (ts - pms > 3600000) break;
      if (String(row[4]) === g.name && ts > pms) {
        var pp = null;
        pts.forEach(function (q) { if (q.id === String(row[6])) pp = q; });
        if (pp && pp.lat != null && pt.lat != null && pp.id !== pt.id) {
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
  return {ok: true, gps: gps, dist: dist, flags: flags, done: Object.keys(dn).length, total: points_(true).length, round: cur, needPhoto: needPhoto && !gotPhoto && !b.queued, scanId: sid};
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
  if (a === 'd_list') {
    return {ok: true, admin: adm, me: me ? me.name : '', members: all.map(function (g) { return {name: g.name, role: g.role, active: g.active, danru: g.danru, hasPin: !!g.hash, setAt: g.setAt}; })};
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
  if (a === 'a_live') {
    var r = b.date ? roundBy_(String(b.date), Number(b.idx)) : roundAt_(Date.now());
    var pts = points_(true), d = doneMap_(r), ps = photoSet_(r, pts);
    return {ok: true, round: r, total: pts.length,
      done: pts.filter(function (p) { return d[p.id]; }).map(function (p) { return {no: p.no, name: p.name, zone: p.zone, t: d[p.id].t, by: d[p.id].by, flags: d[p.id].flags, gps: d[p.id].gps, photo: d[p.id].photo, pc: !!ps[p.id]}; }),
      missed: pts.filter(function (p) { return !d[p.id]; }).map(function (p) { return {no: p.no, name: p.name, zone: p.zone, hi: p.hi, pc: !!ps[p.id]}; })};
  }
  if (a === 'a_history') {
    var from = String(b.from || ''), to = String(b.to || from), rows = [];
    scans_(6000).forEach(function (r2) {
      var dt = String(r2[2]);
      if (dt >= from && dt <= to) rows.push({t: String(r2[1]), round: String(r2[3]), guard: String(r2[4]), no: r2[7], name: String(r2[8]), gps: String(r2[14]), dist: r2[13], acc: r2[12], flags: String(r2[15]), photo: String(r2[16] || '')});
    });
    return {ok: true, rows: rows.slice(-2000)};
  }
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
    if (b.photoN != null) { var pn = Math.round(Number(b.photoN)); if (!(pn >= 0 && pn <= 45)) return {ok: false, err: 'bad_number'}; setCfg_('PHOTO_PER_ROUND', String(pn)); }
    return {ok: true, showNames: cfg_('SHOW_NAMES', 'yes') === 'yes', photoN: photoN_()};
  }
  return {ok: false, err: 'action'};
}

/* ---------- emails (English + Bahasa Indonesia) ---------- */
var ZNAME_ID = {GT: 'Gerbang / pintu masuk', FN: 'Pagar keliling', PL: 'Area pabrik', UT: 'Utilitas / tangki', LD: 'Area penyimpanan', BL: 'Bangunan', MP: 'Titik kumpul'};
var FLAGTXT = {
  en: {OUTSIDE: 'outside radius', NO_GPS: 'no GPS', SUSPECT_GPS: 'suspect GPS', LOW_ACCURACY: 'low GPS accuracy', NO_PHOTO: 'no photo', TOO_FAST: 'moved too fast', PHOTO_FAIL: 'photo failed'},
  id: {OUTSIDE: 'di luar radius', NO_GPS: 'tanpa GPS', SUSPECT_GPS: 'GPS mencurigakan', LOW_ACCURACY: 'akurasi GPS rendah', NO_PHOTO: 'tanpa foto', TOO_FAST: 'bergerak terlalu cepat', PHOTO_FAIL: 'foto gagal'}
};
var TXT = {
  en: {round: 'Round', done: 'Done', of: 'of', missed: 'Missed', notScanned: 'Points not scanned in this round', highFirst: 'high-risk first', high: 'HIGH RISK', no: 'No.', flagged: 'Flagged scans', away: 'm from point', daily: 'Daily patrol summary', tRound: 'Round', tDone: 'Done', tMiss: 'Missed', often: 'Points missed most often', missedIn: 'missed in', rounds: 'rounds', app: 'EcoOils Mentari Security Patrol'},
  id: {round: 'Ronde', done: 'Selesai', of: 'dari', missed: 'Terlewat', notScanned: 'Titik yang tidak dipindai pada ronde ini', highFirst: 'risiko tinggi lebih dulu', high: 'RISIKO TINGGI', no: 'No.', flagged: 'Pemindaian bertanda', away: 'm dari titik', daily: 'Ringkasan patroli harian', tRound: 'Ronde', tDone: 'Selesai', tMiss: 'Terlewat', often: 'Titik yang paling sering terlewat', missedIn: 'terlewat pada', rounds: 'ronde', app: 'Patroli Keamanan EcoOils Mentari'}
};
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
function roundHtml_(L, r, pts, missed, hi, flagged) {
  var T = TXT[L];
  var h = '<h3 style="margin:0 0 6px">' + T.round + ' ' + esc_(r.label) + ' (' + r.date + ')</h3><p><b>' + T.done + ' ' + (pts.length - missed.length) + ' ' + T.of + ' ' + pts.length + '. ' + T.missed + ' ' + missed.length + '.</b></p>';
  if (missed.length) h += '<p style="margin:8px 0 0"><b>' + T.notScanned + '</b> (' + T.highFirst + ')</p>' + groupHtml_(hi, L) + groupHtml_(missed.filter(function (p) { return !p.hi; }), L);
  h += flagHtml_(flagged, L);
  return h;
}
function roundCheck() {
  var boundary = Math.floor((Date.now() + OFF) / RMS) * RMS - OFF, r = roundAt_(boundary - 1);
  var pts = points_(true), d = doneMap_(r);
  var missed = pts.filter(function (p) { return !d[p.id]; }), flagged = flagged_(r);
  if (!missed.length && !flagged.length) return;
  var hi = missed.filter(function (p) { return p.hi; });
  var subj = 'Patrol / Patroli ' + r.date + ' ' + r.label + ': ' + (pts.length - missed.length) + '/' + pts.length + (missed.length ? ' - ' + missed.length + ' missed / terlewat' : '') + (hi.length ? ' (' + hi.length + ' high-risk / risiko tinggi)' : '');
  var h = both_(roundHtml_('en', r, pts, missed, hi, flagged), roundHtml_('id', r, pts, missed, hi, flagged)) + '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  send_(subj, h);
}
function dailyHtml_(L, y, tr, top, missCount, flagList) {
  var T = TXT[L];
  var h = '<h3 style="margin:0 0 6px">' + T.daily + ' ' + y + '</h3><table border="1" cellpadding="4" style="border-collapse:collapse"><tr><th>' + T.tRound + '</th><th>' + T.tDone + '</th><th>' + T.tMiss + '</th></tr>' + tr + '</table>';
  if (top.length) { h += '<p style="margin:12px 0 2px"><b>' + T.often + '</b></p><ul style="margin:0">'; top.forEach(function (p) { h += '<li>' + T.no + ' ' + p.no + ' ' + esc_(p.name) + ': ' + T.missedIn + ' ' + missCount[p.id] + ' ' + T.of + ' 12 ' + T.rounds + '</li>'; }); h += '</ul>'; }
  return h + flagHtml_(flagList, L);
}
function dailySummary() {
  var y = new Date(Date.now() + OFF - 86400000).toISOString().slice(0, 10);
  var pts = points_(true), rows = scans_(3000), tr = '', missCount = {}, flagList = [], totalMissed = 0;
  for (var i = 0; i < 12; i++) {
    var r = roundBy_(y, i), seen = {};
    rows.forEach(function (row) { var ms = Number(row[17]); if (ms >= r.start && ms < r.end) seen[row[6]] = 1; });
    var miss = pts.filter(function (p) { return !seen[p.id]; });
    totalMissed += miss.length;
    miss.forEach(function (p) { missCount[p.id] = (missCount[p.id] || 0) + 1; });
    tr += '<tr><td>' + r.label + '</td><td align="right">' + (pts.length - miss.length) + '</td><td align="right">' + miss.length + '</td></tr>';
    flagList = flagList.concat(flagged_(r));
  }
  var top = pts.filter(function (p) { return missCount[p.id]; }).sort(function (a, b) { return missCount[b.id] - missCount[a.id]; }).slice(0, 10);
  var h = both_(dailyHtml_('en', y, tr, top, missCount, flagList), dailyHtml_('id', y, tr, top, missCount, flagList)) + '<p style="color:#666;margin-top:14px">EcoOils Mentari Security Patrol / Patroli Keamanan ' + VERSION + '</p>';
  send_('Daily patrol summary / Ringkasan patroli harian ' + y + ': ' + totalMissed + ' missed / terlewat', h);
}
