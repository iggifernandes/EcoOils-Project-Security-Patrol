// Mock Google Apps Script runtime and exercise Code.gs v1.5
const fs=require('fs'),crypto=require('crypto'),vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','Code.gs'),'utf8');
function mkSheet(name){const rows=[];return {name,rows,
  getLastRow:()=>rows.length,
  appendRow:r=>{rows.push(r.slice())},
  setFrozenRows(){},
  insertSheet(){},
  getRange(r,c,nr,nc){nr=nr||1;nc=nc||1;const me=this;
    return {getValues:()=>{const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){const v=(rows[r-1+i]||[])[c-1+j];row.push(v===undefined?'':v)}o.push(row)}return o},
      setValues:(vals)=>{vals.forEach((vr,i)=>{rows[r-1+i]=rows[r-1+i]||[];vr.forEach((v,j)=>{rows[r-1+i][c-1+j]=v})});return this},
      setValue:(v)=>{rows[r-1]=rows[r-1]||[];rows[r-1][c-1]=v;return this},
      getValue:()=>{const v=(rows[r-1]||[])[c-1];return v===undefined?'':v},
      setFontWeight(){return this},setNumberFormat(){return this}}}};}
const sheets={};const props={};const cache={};
const ctx={console,Date,Math,JSON,String,Number,Object,Array,isFinite,parseInt,
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=mkSheet(n),getSheets:()=>Object.values(sheets),deleteSheet(){}})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=String(v)}})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=v}})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>Array.from(crypto.createHash('sha256').update(s).digest()).map(b=>b>127?b-256:b),newBlob:()=>({}),base64Decode:()=>[]},
 ContentService:{createTextOutput:s=>({s,setMimeType(){return this}}),MimeType:{JSON:1}},
 MailApp:{sendEmail(m){ctx.mails.push(m)}},mails:[],
 DriveApp:{createFolder:()=>({getId:()=>'x'}),getFolderById:()=>({})},
 ScriptApp:{getProjectTriggers:()=>[]},Logger:{log:m=>ctx.logs.push(m)},logs:[]};
vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.setup();
const call=b=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(b)}}).s);
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
const ADMIN=props.ADMIN_PIN;
// bootstrap
ok(!props.TEAM_CODE,'no team code created');
ok(sheets.Guards.rows[0].join('|')==='Name|Role|Active|PIN hash|Danru|PIN set (WIB)','guards headers');
ok(sheets.Guards.rows.filter(r=>r[4]==='Yes').length===4,'4 danru seeded (3 leaders + supervisor)');
ctx.makeDanruPins();
const dp={};ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const m=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[m[1]]=m[2]});
ok(Object.keys(dp).length===4,'4 danru pins logged');
ok(!JSON.stringify(sheets.Guards.rows).includes(dp['Rendi Irawan']),'pin not stored in plain text');
const rendi=dp['Rendi Irawan'];
// login
let r=call({action:'state',gp:rendi});
ok(r.ok&&r.me.name==='Rendi Irawan'&&r.me.danru===true,'danru login via state');
ok(!('guards' in r),'state no longer lists guard names');
r=call({action:'state',gp:'123456'});ok(r.err==='pin','wrong pin rejected');
r=call({action:'state'});ok(r.err==='pin','missing pin rejected');
r=call({action:'state',team:'abc'});ok(r.err==='pin','old team-code client rejected');
// danru adds a member
r=call({action:'d_add',gp:rendi,name:'  Budi   Santoso '});
ok(r.ok&&/^\d{6}$/.test(r.pin)&&r.name==='Budi Santoso','danru adds member, gets pin');
const budi=r.pin;
r=call({action:'d_add',gp:rendi,name:'budi santoso'});ok(r.err==='dup','duplicate name rejected');
r=call({action:'d_add',gp:rendi,name:'x'});ok(r.err==='bad_name','short name rejected');
r=call({action:'state',gp:budi});ok(r.ok&&r.me.name==='Budi Santoso'&&!r.me.danru,'new guard can log in, not danru');
// non-danru can't manage
r=call({action:'d_list',gp:budi});ok(r.err==='auth','guard cannot open team list');
r=call({action:'d_reset',gp:budi,name:'Rendi Irawan'});ok(r.err==='auth','guard cannot reset');
// reset
r=call({action:'d_reset',gp:rendi,name:'Budi Santoso'});ok(r.ok&&r.pin!==budi,'danru resets pin');
const budi2=r.pin;
r=call({action:'state',gp:budi});ok(r.err==='pin','old pin dead after reset');
r=call({action:'state',gp:budi2});ok(r.ok,'new pin works');
// danru accounts protected
r=call({action:'d_reset',gp:rendi,name:'Jhonsen Panjaitan'});ok(r.err==='danru_locked','danru cannot reset another danru');
r=call({action:'d_active',gp:rendi,name:'Jhonsen Panjaitan',active:false});ok(r.err==='danru_locked','danru cannot deactivate danru');
// deactivate
r=call({action:'d_active',gp:rendi,name:'Budi Santoso',active:false});ok(r.ok,'deactivate');
r=call({action:'state',gp:budi2});ok(r.err==='pin','deactivated guard cannot log in');
r=call({action:'d_active',gp:rendi,name:'Budi Santoso',active:true});ok(r.ok,'reactivate');
r=call({action:'state',gp:budi2});ok(r.ok,'works again, same pin');
// list
r=call({action:'d_list',gp:rendi});ok(r.ok&&r.members.length===26&&r.members.find(m=>m.name==='Budi Santoso').hasPin&&!r.members.find(m=>m.name==='Aldi Ramadhan').hasPin,'list shows pin status');
ok(!JSON.stringify(r).includes('hash'),'list leaks no hash');
// admin via admin pin
r=call({action:'d_reset',pin:ADMIN,name:'Aldi Ramadhan'});ok(r.ok&&/^\d{6}$/.test(r.pin),'admin sets pin for guard');
const aldi=r.pin;
r=call({action:'d_reset',pin:ADMIN,name:'Jhonsen Panjaitan'});ok(r.ok,'admin can reset a danru');
r=call({action:'d_danru',pin:ADMIN,name:'Aldi Ramadhan',danru:true});ok(r.ok,'admin promotes danru');
r=call({action:'d_list',gp:aldi});ok(r.ok,'promoted guard sees team list');
r=call({action:'d_danru',gp:aldi,name:'Budi Santoso',danru:true});ok(r.err==='action'||r.err==='danru_locked'||r.ok===false,'danru cannot promote');
r=call({action:'d_list',pin:'000000'});ok(r.err==='auth','wrong admin pin on team');
// unique pins
const hs=sheets.Guards.rows.slice(1).map(x=>x[3]).filter(Boolean);ok(new Set(hs).size===hs.length,'all pin hashes unique');
// scan flow with pin
const pid='MEN-SEC-GT-01';
r=call({action:'scan',gp:aldi,pid,lat:2.9,lng:99.1,acc:10});
ok(r.ok&&r.done===1,'scan with pin records');
ok(sheets.Scans.rows[sheets.Scans.rows.length-1][4]==='Aldi Ramadhan','scan attributed to pin owner, not a typed name');
r=call({action:'scan',gp:aldi,guard:'Rendi Irawan',pid:'MEN-SEC-GT-02',lat:2.9,lng:99.1,acc:10});
ok(sheets.Scans.rows[sheets.Scans.rows.length-1][4]==='Aldi Ramadhan','typed guard name ignored');
r=call({action:'scan',gp:'999999',pid});ok(r.err==='pin','scan with bad pin rejected');
r=call({action:'scan',gp:aldi,pid:'nope'});ok(r.err==='unknown_point','unknown point');
// lockout
for(let i=0;i<25;i++)call({action:'state',gp:'000001'});
r=call({action:'state',gp:aldi});ok(r.err==='locked','lockout after many wrong pins (even valid pin)');
r=call({action:'d_add',gp:rendi,name:'Zed'});ok(r.err==='locked','team actions locked too');
r=call({action:'a_live',pin:ADMIN});ok(r.ok,'admin unaffected by guard lockout');
console.log(fails?('FAILURES: '+fails):'ALL PASSED');process.exit(fails?1:0);
