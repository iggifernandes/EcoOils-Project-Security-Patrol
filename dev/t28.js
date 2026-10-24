const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;
const g1=call({action:'d_add',gp:D,name:'Clock One'}),g2=call({action:'d_add',gp:D,name:'Clock Two'}),g3=call({action:'d_add',gp:D,name:'Clock Three'});
const realNow=Date.now;const at=(h,mi,day)=>{day=day||19;return Date.UTC(2026,9,day,h-7,mi,0)};
const T=ms=>{Date.now=()=>ms};
const G={lat:3.131338,lng:99.347791,acc:8};
// window
T(at(5,0));ok(call({action:'clockin',gp:g1.pin,...G}).err==='no_window','05:00 no window');
T(at(6,40));let r=call({action:'clockin',gp:g1.pin,...G});ok(r.ok&&r.status==='ON_TIME'&&r.late===0,'20 min before the shift: allowed, on time');
T(at(7,10));r=call({action:'clockin',gp:g2.pin,...G});ok(r.ok&&r.status==='ON_TIME'&&r.late===10,'10 min after start: on time (grace 15)');
T(at(7,20));r=call({action:'clockin',gp:g3.pin,...G});ok(r.ok&&r.status==='LATE'&&r.late===20,'20 min after start: LATE');
T(at(9,5));ok(call({action:'clockin',gp:D,...G}).err==='no_window','125 min after start: window closed');
// distance
T(at(15,5));
ok(call({action:'clockin',gp:g1.pin,lat:3.131338+0.001357,lng:99.347791,acc:10}).err==='not_here','150 m away: refused');
ok(call({action:'clockin',gp:g1.pin,lat:3.131338+0.001357,lng:99.347791,acc:80}).err==='not_here','150 m, poor accuracy: still refused (allowance capped at 30 m)');
ok(call({action:'clockin',gp:g1.pin}).err==='not_here','no coordinates: refused with the same neutral error');
r=call({action:'clockin',gp:g1.pin,lat:3.131338+0.000543,lng:99.347791,acc:10});ok(r.ok&&r.status==='ON_TIME','60 m away: accepted');
r=call({action:'clockin',gp:g1.pin,...G});ok(r.ok&&r.already,'second tap: already recorded, no duplicate');
ok(m.sheets.Clock.rows.filter(x=>x[2]==='Clock One').length===2,'one row per shift (P and S) for Clock One');
// state
let st=call({action:'state',gp:g1.pin});ok(st.clock&&st.clock.mine&&st.clock.open===false&&st.clock.gate.r===100,'state: already clocked in, gate info sent');
st=call({action:'state',gp:g2.pin});ok(st.clock.open===true&&st.clock.win.shift==='S','state: button window open for someone who has not clocked in');
// night shift belongs to the date it starts
T(at(23,5));r=call({action:'clockin',gp:g2.pin,...G});ok(r.ok,'night shift clock-in');
ok(m.sheets.Clock.rows[m.sheets.Clock.rows.length-1][13]==='2026-10-19|M|clock two','night key uses the start date');
T(at(0,10,20));st=call({action:'state',gp:g2.pin});ok(st.clock.mine&&st.clock.shift==='M'&&st.clock.date==='2026-10-19','after midnight still the same night shift');
// manual
T(at(15,30));r=call({action:'d_clock',gp:D,name:'Clock Three'});ok(r.ok&&r.status==='MANUAL','Danru records a manual clock-in');
ok(call({action:'d_clock',gp:g1.pin,name:'Clock Two'}).err==='auth','plain guard cannot');
ok(call({action:'d_clock',gp:D,name:'Nobody'}).err==='bad_guard','unknown guard refused');
// missing / stats
call({action:'d_plan_set',gp:D,date:'2026-10-19',shift:'P',rows:[{duty:'Gate 1',guard:'Clock One',buddy:''},{duty:'Patrol',guard:'Clock Two',buddy:'Clock Three'}]});
T(at(16,0));r=call({action:'a_stats',pin:AP,from:'2026-10-19',to:'2026-10-19'});
ok(Array.isArray(r.clock)&&r.clock.length>=4,'stats lists clock-ins');
ok(r.clock.some(x=>x.status==='LATE')&&r.clock.some(x=>x.status==='MANUAL'),'stats shows LATE and MANUAL');
call({action:'d_add',gp:D,name:'Clock Four'});
call({action:'d_plan_set',gp:D,date:'2026-10-19',shift:'S',rows:[{duty:'Gate 1',guard:'Clock Four',buddy:''}]});
r=call({action:'a_stats',pin:AP,from:'2026-10-19',to:'2026-10-19'});
ok(r.clockMissing.some(x=>x.guard==='Clock Four'&&x.shift==='S')&&!r.clockMissing.some(x=>x.guard==='Clock One'&&x.shift==='P'),'planned but not clocked in is listed; clocked-in is not');
Date.now=realNow;
ok(m.ctx.VERSION==='v1.40','version v1.10');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
