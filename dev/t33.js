const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],call=m.call;const g=call({action:'d_add',gp:D,name:'Perf Guard'});
const at=(h,mi,day)=>Date.UTC(2026,9,day||19,h-7,mi,0);const T=ms=>{Date.now=()=>ms};
T(at(10,0));
const st=call({action:'state',gp:g.pin});const p=st.points[0];
// next clock window opens 30 min before the 15:00 shift
ok(st.clock.nextOpens===at(14,30),'next clock window opens 14:30: '+new Date(st.clock.nextOpens).toISOString());
T(at(21,45));ok(call({action:'state',gp:g.pin}).clock.nextOpens===at(22,30),'evening: next window 22:30');
T(at(10,0));
// a scan that timed out on the phone arrives, then the phone re-sends it: written once
const n0=m.sheets.Scans.rows.length;
let r=call({action:'scan',gp:g.pin,pid:p.id,lat:2.9,lng:99.1,acc:10,clientTs:at(10,0)-1500});ok(r.ok,'first scan ok');
T(at(10,0)+30000);
r=call({action:'scan',gp:g.pin,pid:p.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:at(10,0)-1500});
ok(r.ok&&r.dup===true,'re-sent scan recognised as already recorded');
ok(m.sheets.Scans.rows.length===n0+1,'only one row written');
// a genuine later offline scan of the same point is still written
r=call({action:'scan',gp:g.pin,pid:p.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:at(10,0)+20*60000});
T(at(10,25));r=call({action:'scan',gp:g.pin,pid:p.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:at(10,24)});
ok(r.ok&&!r.dup&&m.sheets.Scans.rows.length>=n0+2,'a later genuine queued scan is kept');
// config change is seen on the next request
m.ctx.setCfg_('PHOTO_PER_ROUND','0');ok(call({action:'state',gp:g.pin}).ok,'state after config change');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
