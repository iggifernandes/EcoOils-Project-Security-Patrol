const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;call({action:'d_add',gp:D,name:'Sheet Guard'});call({action:'d_add',gp:D,name:'Plan Guard'});
const at=(h,mi,day)=>Date.UTC(2026,9,day||19,h-7,mi,0);const T=ms=>{Date.now=()=>ms};
T(at(8,0));
// authorisation: Admin PIN only
ok(call({action:'a_ts_get',pin:'000000'}).err==='pin','timesheet needs the Admin PIN');
ok(call({action:'a_ts_get',gp:D}).err==='pin','a Danru PIN does not open the timesheet (Admin only for now)');
let r=call({action:'a_ts_get',pin:AP,ym:'2026-11'});ok(r.ok&&r.guards.includes('Sheet Guard')&&r.period.from==='2026-10-16'&&r.period.to==='2026-11-15','guard list and period 16 Oct - 15 Nov');
ok(call({action:'a_ts_get',pin:AP,ym:'2026-01'}).period.from==='2025-12-16','January period starts 16 December');
// auto fill: clock-in for Sheet Guard (morning), plan for Plan Guard (night)
call({action:'d_clock',gp:D,name:'Sheet Guard'});
call({action:'d_plan_set',gp:D,date:'2026-10-19',shift:'M',rows:[{duty:'Patrol',guard:'Plan Guard',buddy:'Sheet Guard'}]});
r=call({action:'a_ts_get',pin:AP,ym:'2026-11',guard:'Sheet Guard'});
let d19=r.days.find(x=>x.date==='2026-10-19');
ok(r.ok&&r.days.length===31&&d19.src==='clock'&&d19.start==='07:00'&&d19.end==='15:00'&&d19.hours===8,'day with a real clock-in is pre-filled with the shift hours: '+JSON.stringify(d19));
r=call({action:'a_ts_get',pin:AP,ym:'2026-11',guard:'Plan Guard'});d19=r.days.find(x=>x.date==='2026-10-19');
ok(d19.src==='plan'&&d19.start==='23:00'&&d19.end==='07:00'&&d19.hours===8,'planned night shift crosses midnight, 8 h: '+JSON.stringify(d19));
ok(r.days.filter(x=>x.src==='').length===30,'other days stay blank');
// save + NPK
let s=call({action:'a_ts_save',pin:AP,guard:'Plan Guard',npk:'123456',rows:[{date:'2026-10-19',start:'07:00',end:'16:00',note:''},{date:'2026-10-20',start:'',end:'',note:'OFF'}]});
ok(s.ok&&s.saved===2,'saved two days');
r=call({action:'a_ts_get',pin:AP,ym:'2026-11',guard:'Plan Guard'});d19=r.days.find(x=>x.date==='2026-10-19');const d20=r.days.find(x=>x.date==='2026-10-20');
ok(r.npk==='123456'&&d19.src==='saved'&&d19.hours===9&&d20.note==='OFF'&&d20.hours==='','saved values win over auto-fill, NPK remembered, 9 h with break');
s=call({action:'a_ts_save',pin:AP,guard:'Plan Guard',rows:[{date:'2026-10-19',start:'08:00',end:'17:00',note:'x'}]});r=call({action:'a_ts_get',pin:AP,ym:'2026-11',guard:'Plan Guard'});
ok(r.days.find(x=>x.date==='2026-10-19').start==='08:00'&&m.sheets.Timesheet.rows.filter(x=>String(x[0]).startsWith('2026-10-19')).length===1,'saving again updates the same row (no duplicates)');
ok(call({action:'a_ts_save',pin:AP,guard:'Plan Guard',rows:[{date:'2026-10-19',start:'25:00',end:'',note:''}]}).err==='bad_time','bad time refused');
ok(call({action:'a_ts_save',pin:AP,guard:'Nobody',rows:[]}).err==='bad_guard','unknown guard refused');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
