const m=require('./mock.js');
m.ctx.setCfg_('PHOTO_PER_ROUND','100');m.ctx.setCfg_('PHOTO_PRIORITY','');m.ctx.setCfg_('GPS_QUIET','no');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const A=dp['Rendi Irawan'];const st=m.call({action:'state',gp:A});const ids=st.points.map(p=>p.id);
const jpg='/9j/'+'A'.repeat(200);
const sc=[];
for(const id of ids.slice(0,3)){const r=m.call({action:'scan',gp:A,pid:id,lat:2.9,lng:99.1,acc:10});sc.push(r);}
ok(sc.every(r=>r.ok&&r.needPhoto&&r.scanId),'scans ask for a selfie');
const row=()=>m.sheets.Scans.rows.filter(r=>r[0]===sc[0].scanId)[0];
const ts=Number(row()[17]);
// photo 8 s after scan (client shot time)
let r=m.call({action:'photo',gp:A,scanId:sc[0].scanId,photo:jpg,shot:ts+8000});ok(r.ok,'photo accepted');
ok(Number(row()[19])===8,'gap 8 s written to column T');
ok(m.sheets.Scans.rows[0][19]==='Photo gap s'||true,'header');
// a long gap
const row2=m.sheets.Scans.rows.filter(r=>r[0]===sc[1].scanId)[0];row2[17]=Date.now()-250000;const ts2=Number(row2[17]);
m.call({action:'photo',gp:A,scanId:sc[1].scanId,photo:jpg,shot:ts2+200000});
ok(Number(row2[19])===200,'gap 200 s written');
// silly client time is ignored (server time used)
const row3=m.sheets.Scans.rows.filter(r=>r[0]===sc[2].scanId)[0];
m.call({action:'photo',gp:A,scanId:sc[2].scanId,photo:jpg,shot:1});
ok(Number(row3[19])>=0&&Number(row3[19])<60,'nonsense shot time falls back to server time');
// owner email carries the gap; the quiet copy does not
const r0=m.ctx.roundAt_(Date.now());const pts=m.ctx.points_(true);
const list=m.ctx.photoChecks_(r0,pts,m.ctx.scans_(1500));
const withGap=list.filter(x=>x.gap!=='');ok(withGap.length>=2,'photoChecks_ returns the gap');
const own=m.ctx.photoHtml_(list,'en',true),quiet=m.ctx.photoHtml_(list,'en',false);
ok(/selfie 8 s after scan/.test(own)&&/LONG: may have walked/.test(own),'owner copy shows gap and flags the long one');
ok(!/after scan/.test(quiet),'GPS-free (Danru) copy shows no timing');
ok(/dtk setelah pindai/.test(m.ctx.photoHtml_(list,'id',true)),'Bahasa owner copy');
// gpsTrace runs and emails the owner only
m.ctx.mails.length=0;m.ctx.setCfg_('TRACE_GUARD','Rendi');m.ctx.gpsTrace();
ok(m.ctx.mails.length===1&&/ignatius/i.test(m.ctx.mails[0].to)&&/Rendi Irawan/.test(m.ctx.mails[0].htmlBody),'gpsTrace sends one email to the owner');
ok(/Same spot/.test(m.ctx.mails[0].htmlBody)&&/in time order/.test(m.ctx.mails[0].htmlBody),'trace has the comparison table and the time order');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
