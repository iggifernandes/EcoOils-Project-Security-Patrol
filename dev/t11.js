// existing v1.4 sheet (3-column Guards, no PIN columns) upgraded in place
const m=require('./mock.js');
const g=m.sheets.Guards;
// emulate old sheet: strip new columns
g.rows.forEach(r=>{r.length=3});
let ok=true;const chk=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)ok=false};
const r=m.call({action:'state',gp:'123456'});
chk(r.err==='pin','old sheet: login attempt handled without crash');
chk(g.rows[0].length===6&&g.rows[0][3]==='PIN hash','headers upgraded in place');
chk(g.rows.filter(x=>x[4]==='Yes').length===4,'danru flags seeded');
chk(g.rows[1][0]==='Agus Fazar'&&g.rows[1][2]==='Yes','names and active flags untouched');
m.ctx.makeDanruPins();
chk(m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).length===4,'makeDanruPins works after upgrade');
const a=m.call({action:'d_list',pin:m.props.ADMIN_PIN});chk(a.ok&&a.members.length===25,'admin list after upgrade');
process.exit(ok?0:1);
