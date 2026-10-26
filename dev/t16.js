const m=require('./mock.js');
m.ctx.setCfg_('GPS_QUIET','no');
m.ctx.makeDanruPins();
const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'];
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const call=m.call;
// guard accounts
const g1=call({action:'d_add',gp:D,name:'Test Gate One'}),g2=call({action:'d_add',gp:D,name:'Test Gate Two'}),g3=call({action:'d_add',gp:D,name:'Test Patrol Three'}),g4=call({action:'d_add',gp:D,name:'Test Outsider'});
ok(g1.ok&&g4.ok,'guards created');
// shift helper
const J=(y,mo,d,h)=>Date.UTC(y,mo-1,d,h-7,0,0);
let s=m.ctx.shiftAt_(J(2026,10,19,8));ok(s.code==='P'&&s.date==='2026-10-19','08:00 = Pagi');
s=m.ctx.shiftAt_(J(2026,10,19,15));ok(s.code==='S','15:00 = Sore');
s=m.ctx.shiftAt_(J(2026,10,19,23));ok(s.code==='M'&&s.date==='2026-10-19','23:00 = Malam same date');
s=m.ctx.shiftAt_(J(2026,10,20,3));ok(s.code==='M'&&s.date==='2026-10-19','03:00 = Malam of previous date');
s=m.ctx.shiftAt_(J(2026,10,20,6)+59*60000);ok(s.code==='M'&&s.date==='2026-10-19','06:59 still Malam');
const now=m.ctx.shiftAt_(Date.now());
// auth
let r=call({action:'d_plan_get',gp:'111111'});ok(r.err==='auth','bad PIN refused');
const plain=call({action:'d_plan_get',gp:g1.pin});ok(plain.err==='auth','plain guard cannot read/edit plan tool');
r=call({action:'d_plan_get',gp:D});
ok(r.ok&&r.duties.join()==='Gate 1,Gate 2,Gate 3,Patrol'&&r.guards.includes('Test Gate One')&&r.rows.length===0,'danru gets empty plan, duties and guards');
// save a night plan with missing buddy
const rows=[{duty:'Gate 1',guard:'Test Gate One',buddy:'Test Gate Two'},{duty:'Patrol',guard:'Test Patrol Three',buddy:''}];
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'M',rows});
ok(r.ok&&r.saved===2&&r.warn.join()==='Patrol','night plan saved, warns Patrol has no buddy');
r=call({action:'d_plan_get',gp:D,date:now.date,shift:'M'});ok(r.rows.length===2&&r.rows[0].buddy==='Test Gate Two','plan reads back');
// day shift: no warning
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'P',rows:[{duty:'Gate 1',guard:'Test Gate One'}]});ok(r.ok&&r.warn.length===0,'day shift needs no buddy');
// validation
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'S',rows:[{duty:'Gate 1',guard:'Nobody'}]});ok(r.err==='bad_guard','unknown guard rejected');
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'S',rows:[{duty:'Gate 9',guard:'Test Gate One'}]});ok(r.err==='bad_duty','unknown duty rejected');
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'S',rows:[{duty:'Gate 1',guard:'Test Gate One',buddy:'Test Gate One'}]});ok(r.err==='bad_buddy','buddy cannot be self');
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'S',rows:[{duty:'Gate 1',guard:'Test Gate One'},{duty:'Gate 2',guard:'Test Gate Two',buddy:'Test Gate One'}]});ok(r.err==='dup_person','person cannot hold two duties');
r=call({action:'d_plan_set',gp:D,date:'2030-01-01',shift:'S',rows:[]});ok(r.err==='bad_date','too far ahead rejected');
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'X',rows:[]});ok(r.err==='bad_shift','bad shift rejected');
r=call({action:'d_plan_set',gp:g1.pin,date:now.date,shift:'S',rows:[]});ok(r.err==='auth','plain guard cannot save plan');
// admin can also
r=call({action:'d_plan_set',pin:m.props.ADMIN_PIN,date:now.date,shift:'S',rows:[{duty:'Gate 2',guard:'Test Gate Two'}]});ok(r.ok,'admin can save plan');
// replace plan (latest wins) and clear
r=call({action:'d_plan_set',gp:D,date:now.date,shift:'M',rows:[{duty:'Gate 3',guard:'Test Gate Two',buddy:'Test Gate One'}]});
r=call({action:'d_plan_get',gp:D,date:now.date,shift:'M'});ok(r.rows.length===1&&r.rows[0].duty==='Gate 3','saving again replaces the plan');
// scan flags: plan for CURRENT shift
const pid=call({action:'state',gp:D}).points[0].id;
call({action:'d_plan_set',gp:D,date:now.date,shift:now.code,rows:[{duty:'Patrol',guard:'Test Patrol Three',buddy:'Test Gate One'}]});
const st=call({action:'state',gp:g3.pin});
ok(st.plan&&st.plan.shift===now.code&&st.plan.rows.length===1&&st.plan.rows[0].guard==='Test Patrol Three','state carries current shift plan for guards');
let sc=call({action:'scan',gp:g3.pin,pid,lat:2.9,lng:99.1,acc:10});ok(sc.ok&&!sc.flags.includes('NOT_ON_PLAN'),'guard on plan: no flag');
sc=call({action:'scan',gp:g1.pin,pid:call({action:'state',gp:D}).points[1].id,lat:2.9,lng:99.1,acc:10});ok(!sc.flags.includes('NOT_ON_PLAN'),'buddy on plan: no flag');
sc=call({action:'scan',gp:g4.pin,pid:call({action:'state',gp:D}).points[2].id,lat:2.9,lng:99.1,acc:10});ok(sc.ok&&sc.flags.includes('NOT_ON_PLAN'),'guard not on plan flagged but scan still counted');
sc=call({action:'scan',gp:D,pid:call({action:'state',gp:D}).points[3].id,lat:2.9,lng:99.1,acc:10});ok(sc.ok&&!sc.flags.includes('NOT_ON_PLAN'),'Danru never flagged');
// empty plan: no flag
call({action:'d_plan_set',gp:D,date:now.date,shift:now.code,rows:[]});
sc=call({action:'scan',gp:g4.pin,pid:call({action:'state',gp:D}).points[4].id,lat:2.9,lng:99.1,acc:10});ok(!sc.flags.includes('NOT_ON_PLAN'),'no plan = no flag');
ok(m.ctx.FLAGTXT.en.NOT_ON_PLAN&&m.ctx.FLAGTXT.id.NOT_ON_PLAN,'email text EN+ID for the flag');
ok(m.ctx.VERSION==='v1.46','version v1.8');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
