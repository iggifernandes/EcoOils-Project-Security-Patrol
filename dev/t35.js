const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;const g=call({action:'d_add',gp:D,name:'Gps Guard'});
const at=(h,mi,day)=>Date.UTC(2026,9,day||19,h-7,mi,0);const T=ms=>{Date.now=()=>ms};
// rounds start at 07:00
let r=m.ctx.roundAt_(at(7,0));ok(r.idx===0&&r.label==='07:00-09:00'&&r.date==='2026-10-19','07:00 starts round 1 of the day');
r=m.ctx.roundAt_(at(6,59));ok(r.idx===11&&r.label==='05:00-07:00'&&r.date==='2026-10-18','06:59 is the last round of the previous day');
r=m.ctx.roundAt_(at(1,30));ok(r.label==='01:00-03:00'&&r.date==='2026-10-18','night round belongs to the date it started');
r=m.ctx.roundBy_('2026-10-19',9);ok(r.label==='01:00-03:00'&&r.start===at(1,0,20),'roundBy_ index 9 = 01:00 next morning');
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
