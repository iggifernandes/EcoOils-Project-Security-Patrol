const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const rows=m.sheets.Points.rows.slice(1);
ok(rows.length===45&&rows.every(r=>r[5]===10),'all 45 seeded points have radius 10');
rows.forEach(r=>r[5]=25);ok(m.sheets.Points.rows[1][5]===25,'(simulate old sheet with 25)');
m.ctx.setRadius10();
ok(m.sheets.Points.rows.slice(1).every(r=>r[5]===10),'setRadius10 sets 10 on every point');
ok(m.ctx.points_(false).every(p=>p.radius===10),'app reads radius 10');
// uncalibrated point: no GPS check, no OUTSIDE flag
m.ctx.makeDanruPins();const D=m.ctx.logs.filter(l=>l.startsWith('DANRU PIN'))[0].match(/(\d{6})$/)[1];
const pid=m.call({action:'state',gp:D}).points[0].id;
let r=m.call({action:'scan',gp:D,pid,lat:2.9,lng:99.1,acc:10});ok(r.ok&&r.gps==='UNCALIBRATED'&&!r.flags.includes('OUTSIDE'),'uncalibrated point records GPS, no OUTSIDE flag');
// calibrated point with radius 10: 8 m ok, 40 m outside
const id2=m.call({action:'state',gp:D}).points[1].id;
m.call({action:'a_calibrate',pin:m.props.ADMIN_PIN,pid:id2,radius:10,lat:2.9,lng:99.1,acc:5,n:20});
const dLat=m=>m/111320;
r=m.call({action:'scan',gp:D,pid:id2,lat:2.9+dLat(8),lng:99.1,acc:5});ok(r.gps==='OK','8 m away with 5 m accuracy: OK');
r=m.call({action:'scan',gp:D,pid:id2,lat:2.9+dLat(40),lng:99.1,acc:5});ok(r.gps==='OUTSIDE','40 m away: OUTSIDE');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
