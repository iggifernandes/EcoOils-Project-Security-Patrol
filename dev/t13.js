const m=require('./mock.js');const roundAt=m.ctx.roundAt_;
m.ctx.setCfg_('PHOTO_PER_ROUND','5');m.ctx.setCfg_('PHOTO_PRIORITY','');
m.ctx.setCfg_('GPS_QUIET','no');
m.ctx.makeDanruPins();
const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const A=dp['Rendi Irawan'],B=dp['Jhonsen Panjaitan'];
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const call=m.call;
const st=call({action:'state',gp:A});
ok(!JSON.stringify(st.points).includes('photo'),'state does not reveal photo points');
ok(st.points.every(p=>!('photo' in p)),'no photo field on points');
const pts=st.points.map(p=>p.id);
// which points need a photo this round (probe by scanning each with a different... use admin view)
const live=call({action:'a_live',pin:m.props.ADMIN_PIN});
ok(live.missed.filter(p=>p.pc).length===5,'admin sees exactly 5 photo points this round');
const again=call({action:'a_live',pin:m.props.ADMIN_PIN});
ok(JSON.stringify(live.missed.filter(p=>p.pc).map(p=>p.no))===JSON.stringify(again.missed.filter(p=>p.pc).map(p=>p.no)),'same 5 all round (stable)');
// other rounds differ
const r0=m.ctx.roundBy_('2026-10-19',0),r1=m.ctx.roundBy_('2026-10-19',1),r2=m.ctx.roundBy_('2026-10-20',0);
const pp=m.ctx.points_(true);
const k=r=>Object.keys(m.ctx.photoSet_(r,pp)).sort().join(',');
ok(k(r0)!==k(r1)&&k(r0)!==k(r2),'different points in other rounds');
ok(Object.keys(m.ctx.photoSet_(r0,pp)).length===5,'5 per round');
// scan every point, count needPhoto responses
let need=[];let noPhotoFlags=0;
pts.forEach((id,i)=>{const r=call({action:'scan',gp:i%2?A:B,pid:id,lat:2.9,lng:99.1,acc:10});if(r.needPhoto)need.push({id,sid:r.scanId,by:i%2?A:B});});
ok(need.length===5,'exactly 5 scans ask for a photo: '+need.length);
const rows=m.sheets.Scans.rows;
ok(rows.filter(r=>/NO_PHOTO/.test(r[15])).length===5,'those 5 rows start flagged NO_PHOTO');
ok(rows.slice(1).filter(r=>!/NO_PHOTO/.test(r[15])).length===40,'other 40 not flagged for photo');
// upload photo
const n0=need[0];let r=call({action:'photo',gp:n0.by,scanId:n0.sid,photo:'A'.repeat(500)});
ok(r.ok,'photo accepted');
const row=rows.find(x=>x[0]===n0.sid);
ok(row[16].startsWith('https://drive')&&!/NO_PHOTO/.test(row[15]),'photo link saved, flag cleared');
r=call({action:'photo',gp:n0.by,scanId:n0.sid,photo:'A'.repeat(500)});ok(r.err==='has_photo','cannot add second photo');
const n1=need[1];
r=call({action:'photo',gp:n1.by===A?B:A,scanId:n1.sid,photo:'A'.repeat(500)});ok(r.err==='no_scan','other guard cannot attach to my scan');
r=call({action:'photo',gp:n1.by,scanId:n1.sid,photo:'tiny'});ok(r.err==='bad_photo','tiny photo rejected');
r=call({action:'photo',gp:'111111',scanId:n1.sid,photo:'A'.repeat(500)});ok(r.err==='pin','bad pin rejected');
// too late
const row1=rows.find(x=>x[0]===n1.sid);row1[17]=Date.now()-16*60000;
r=call({action:'photo',gp:n1.by,scanId:n1.sid,photo:'A'.repeat(500)});ok(r.err==='too_late','late photo rejected');
// skipped stays flagged; repeat scan of same point does not re-ask? (REPEAT)
// queued scans: flagged, not asked
const q=need[2];
rows.forEach(x=>{if(x[6]===q.id)x[17]=Number(x[17])-600000;});
const rq=call({action:'scan',gp:A,pid:q.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:Date.now()-1000});
ok(rq.ok&&rq.needPhoto===false&&/QUEUED/.test(rq.flags.join(' '))&&/NO_PHOTO/.test(rq.flags.join(' ')),'queued scan not prompted, flagged NO_PHOTO+QUEUED');
// setting
r=call({action:'a_config',pin:m.props.ADMIN_PIN,photoN:0});ok(r.ok&&r.photoN===0,'admin sets 0 = off');
ok(Object.keys(m.ctx.photoSet_(m.ctx.roundAt_(Date.now()),pp)).length===0,'0 disables photos');
r=call({action:'a_config',pin:m.props.ADMIN_PIN,photoN:8});ok(r.photoN===8,'admin sets 8');
r=call({action:'a_config',pin:m.props.ADMIN_PIN,photoN:99});ok(r.err==='bad_number','rejects 99');
r=call({action:'a_config',pin:m.props.ADMIN_PIN});ok(r.photoN===8,'a_config reads value');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
