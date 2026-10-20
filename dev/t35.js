const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;const g=call({action:'d_add',gp:D,name:'Gps Guard'});
const at=(h,mi,day)=>Date.UTC(2026,9,day||19,h-7,mi,0);const T=ms=>{Date.now=()=>ms};
// patrol schedule: 08-10, 10-12, 12-14, 16-18, 18-20, 20-22, 00-02, 02-04, 04-06
let r=m.ctx.roundAt_(at(8,0));ok(r.idx===0&&r.label==='08:00-10:00'&&r.date==='2026-10-19'&&!r.upcoming,'08:00 starts round 1');
r=m.ctx.roundAt_(at(13,59));ok(r.idx===2&&r.label==='12:00-14:00'&&!r.upcoming,'13:59 is still round 3');
r=m.ctx.roundAt_(at(15,0));ok(r.upcoming===true&&r.label==='16:00-18:00'&&r.idx===3,'15:00 is a gap, next round 16:00-18:00');
r=m.ctx.roundAt_(at(21,59));ok(r.label==='20:00-22:00'&&!r.upcoming,'21:59 in 20:00-22:00');
r=m.ctx.roundAt_(at(23,0));ok(r.upcoming===true&&r.label==='00:00-02:00'&&r.date==='2026-10-19','23:00 gap, next is the night round of the same date');
r=m.ctx.roundAt_(at(1,30,20));ok(r.label==='00:00-02:00'&&r.date==='2026-10-19'&&r.idx===6&&!r.upcoming,'01:30 is a night round belonging to the date the shift started');
r=m.ctx.roundAt_(at(5,59,20));ok(r.label==='04:00-06:00'&&r.idx===8,'05:59 last round');
r=m.ctx.roundAt_(at(6,30,20));ok(r.upcoming===true&&r.label==='08:00-10:00'&&r.date==='2026-10-20'&&r.opDate==='2026-10-19','06:30 gap, next 08:00 the same morning');
ok(m.ctx.lastEnded_(at(14,5)).label==='12:00-14:00'&&m.ctx.lastEnded_(at(3,0,20)).label==='00:00-02:00'&&m.ctx.lastEnded_(at(7,0,20)).label==='04:00-06:00','lastEnded_ finds the finished round');
r=m.ctx.roundBy_('2026-10-19',6);ok(r.start===at(0,0,20)&&r.end===at(2,0,20),'night round index 6 starts at midnight');
// scan in a gap: recorded, flagged, counts for no round
T(at(15,0));let gs=call({action:'state',gp:g.pin});ok(gs.round.upcoming===true&&gs.rlabels.length===9,'state tells the phone it is a gap');
const gp=gs.points[0];let sg=call({action:'scan',gp:g.pin,pid:gp.id,lat:2.9,lng:99.1,acc:10});
ok(sg.ok&&sg.off===true&&sg.needPhoto===false,'scan in a gap accepted, off:true, no selfie asked');
ok(/OFF_ROUND/.test(m.sheets.Scans.rows[m.sheets.Scans.rows.length-1][15]),'row flagged OFF_ROUND');
ok(Object.keys(call({action:'state',gp:g.pin}).done).length===0,'gap scan counts for no round');
let sc=call({action:'a_stats',pin:AP,from:'2026-10-19',to:'2026-10-19'});ok(sc.points.every(p=>p.covered===0),'stats do not count the gap scan as coverage');
// GPS skip points
T(at(10,0));const pts=call({action:'state',gp:g.pin}).points;
const p6=pts.find(p=>p.no===6),p3=pts.find(p=>p.no===3);
[p6,p3].forEach(p=>call({action:'a_calibrate',pin:AP,pid:p.id,radius:10,lat:3.1300,lng:99.3480,acc:3,n:5}));
m.ctx.setCfg_('GPS_QUIET','no');
let s=call({action:'scan',gp:g.pin,pid:p6.id,lat:3.1310,lng:99.3490,acc:5});
ok(s.ok&&s.gps==='NOT_CHECKED'&&!s.flags.includes('OUTSIDE'),'indoor point far from its coordinates: not flagged OUTSIDE ('+s.gps+')');
s=call({action:'scan',gp:g.pin,pid:p6.id,acc:null});ok(s.ok&&!s.flags.includes('NO_GPS'),'indoor point without GPS: not flagged NO_GPS');
s=call({action:'scan',gp:g.pin,pid:p3.id,lat:3.1310,lng:99.3490,acc:5});ok(s.gps==='OUTSIDE','normal point far away is still OUTSIDE');
m.ctx.setCfg_('GPS_SKIP','');s=call({action:'scan',gp:g.pin,pid:p6.id,lat:3.1310,lng:99.3490,acc:5});ok(s.gps==='OUTSIDE','GPS_SKIP can be emptied in Config');
// OUTSIDE ranking in stats
let st=call({action:'a_stats',pin:AP,from:'2026-10-19',to:'2026-10-19'});
ok(st.outside&&st.outside.guards.length===1&&st.outside.guards[0].n===2&&st.outside.points.length===2,'stats outside ranking: '+JSON.stringify(st.outside&&st.outside.guards));
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
