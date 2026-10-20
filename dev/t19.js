const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const G=()=>m.sheets.Guards.rows.slice(1);
const role=n=>G().find(r=>r[0]===n)[1],dan=n=>G().find(r=>r[0]===n)[4];
ok(role('Muhammad Irsan')==='Danru'&&dan('Muhammad Irsan')==='Yes','seed: Irsan = Danru with access');
['Jhonsen Panjaitan','Rendi Irawan','Try Agung Pramana'].forEach(n=>ok(role(n)==='Shift Supervisor'&&dan(n)==='Yes',n+' = Shift Supervisor with access'));
ok(G().filter(r=>r[4]==='Yes').length===4,'exactly 4 people have Danru access');
// old sheet: roles Leader/Supervisor -> fixRoles
const sh=m.sheets.Guards.rows;sh.forEach(r=>{if(r[0]==='Muhammad Irsan')r[1]='Supervisor';if(['Jhonsen Panjaitan','Rendi Irawan','Try Agung Pramana'].includes(r[0]))r[1]='Leader';});
m.ctx.fixRoles();
ok(role('Muhammad Irsan')==='Danru'&&role('Rendi Irawan')==='Shift Supervisor','fixRoles migrates an old sheet');
ok(G().find(r=>r[0]==='Agus Fazar')[1]==='Army','fixRoles leaves others alone');
// day overview
m.ctx.makeDanruPins();const D=m.ctx.logs.filter(l=>/DANRU PIN\s+Rendi/.test(l))[0].match(/(\d{6})$/)[1];
const now=m.ctx.shiftAt_(Date.now());
['P','S','M'].forEach((c,i)=>m.call({action:'d_plan_set',gp:D,date:now.date,shift:c,rows:[{duty:'Gate 1',guard:['Agus Fazar','Valen Andriano','Jona Alfian'][i],buddy:['Dian Akmal','Aril Septiadi','Febrianto'][i]}]}));
let r=m.call({action:'d_plan_get',gp:D,date:now.date,shift:'P'});
ok(r.day.P[0].guard==='Agus Fazar'&&r.day.S[0].guard==='Valen Andriano'&&r.day.M[0].guard==='Jona Alfian','d_plan_get returns all 3 shifts of the day');
const st=m.call({action:'state',gp:D});
ok(st.plan.day.P.length===1&&st.plan.day.S.length===1&&st.plan.day.M.length===1&&st.plan.date===now.date,'state carries the day overview for guards');
ok(m.ctx.VERSION==='v1.16','version v1.8.2');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
