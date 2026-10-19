const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const pin=n=>m.ctx.logs.filter(l=>new RegExp('DANRU PIN\\s+'+n).test(l))[0].match(/(\d{6})$/)[1];
const I=pin('Muhammad Irsan'),R=pin('Rendi Irawan');
const pts=m.call({action:'state',gp:I}).points;const d=x=>x/111320;
const base=pts.map((p,i)=>({lat:2.9+i*0.001,lng:99.1}));
const sc=(gp,i,dy,acc)=>m.call({action:'scan',gp,pid:pts[i].id,lat:base[i].lat+d(dy),lng:base[i].lng,acc});
sc(I,0,0,5);sc(I,0,2,4);sc(I,0,-1,6);            // point 1: 3 good fixes
sc(I,1,0,8);                                     // point 2: single reading
sc(I,2,0,30);                                    // point 3: poor accuracy -> excluded
sc(I,3,0,0);                                     // point 4: acc 0 suspect -> excluded
sc(R,4,0,3);                                     // point 5: other guard -> excluded
sc(I,5,0,5);sc(I,5,1,5);sc(I,5,60,5);sc(I,5,0,6);// point 6: one outlier 60 m away
m.ctx.setCfg_('CAL_GUARD','Muhammad Irsan');
const before=JSON.stringify(m.sheets.Points.rows);
let r=m.ctx.previewCalFromScans();
ok(JSON.stringify(m.sheets.Points.rows)===before,'preview writes nothing');
ok(r.lines.some(l=>/^1  .*n=3.*OK/.test(l)),'point 1: 3 readings, OK');
ok(r.lines.some(l=>/^2  .*n=1.*single reading/.test(l)),'point 2: flagged single reading');
ok(r.lines.some(l=>/^3  .*NO DATA/.test(l)),'point 3 (accuracy 30 m) ignored');
ok(r.lines.some(l=>/^4  .*NO DATA/.test(l)),'point 4 (suspect accuracy 0) ignored');
ok(r.lines.some(l=>/^5  .*NO DATA/.test(l)),'point 5 (other guard) ignored');
ok(r.lines.some(l=>/^6  .*n=3/.test(l)),'point 6: 60 m outlier dropped');
r=m.ctx.applyCalFromScans();
const P=m.ctx.points_(false);
ok(r.saved===3&&P[0].lat!=null&&P[1].lat!=null&&P[5].lat!=null&&P[2].lat==null&&P[4].lat==null,'apply saves only the 3 usable points');
ok(Math.abs(P[0].lat-base[0].lat)<d(3)&&Math.abs(P[5].lat-base[5].lat)<d(2),'saved coordinates are the weighted average');
ok(/from scans, n=3/.test(String(m.sheets.Points.rows[1][10])),'Calibrated at note says from scans');
ok(m.sheets.Points.rows.slice(1).every(r=>r[5]===10),'radius untouched (10)');
// all guards (default): other guard's scan on point 5 now counts
m.ctx.setCfg_('CAL_GUARD','');
const all=m.ctx.previewCalFromScans();
ok(all.lines.some(l=>/^5  .*n=1 guards=1/.test(l)),'blank CAL_GUARD = every guard counts');
ok(all.lines.some(l=>/^1  .*n=3 guards=1/.test(l)),'preview shows how many guards');
// now a scan at the calibrated point is judged
const o=m.call({action:'scan',gp:I,pid:pts[0].id,lat:base[0].lat+d(40),lng:base[0].lng,acc:5});ok(o.gps==='OUTSIDE','after calibration a far scan is OUTSIDE');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
