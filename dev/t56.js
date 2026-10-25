const m=require('./mock.js');
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const pts=m.ctx.points_(true);
const P=pts.filter(p=>![6,18,21,23,26,27,33,34,35].includes(p.no));
const [a,b,c]=P,skip=pts.find(p=>p.no===6);
// give a, b, c and skip positions
[a,b,c,skip].forEach(p=>{m.sheets.Points.rows[p.row-1][8]=3.13;m.sheets.Points.rows[p.row-1][9]=99.348;});
const now=Date.now();let sid=0;
const add=(p,dist,acc,gps,fl,ageDays)=>m.sheets.Scans.rows.push(['s'+(++sid),'','','','G','guard',p.id,p.no,p.name,'','','',acc,dist,gps,fl||'','',now-(ageDays||1)*86400000,'']);
for(let i=0;i<10;i++)add(a,6+i,5,'OK');            // needed 1..10 -> p90 about 9 -> keep 10
for(let i=0;i<10;i++)add(b,14+i%5,5,'OUTSIDE');     // needed 9..13 -> p90 13 -> raise to 15
for(let i=0;i<10;i++)add(c,30,5,'OUTSIDE','');      // needed 25 -> capped at 25
for(let i=0;i<10;i++)add(skip,50,5,'OUTSIDE');      // GPS_SKIP point never changed
add(a,200,5,'OUTSIDE','REPEAT');add(a,200,5,'OUTSIDE','SUSPECT_GPS');add(a,200,5,'OUTSIDE','',40); // ignored: repeat, suspect, too old
const before=JSON.stringify(m.sheets.Points.rows.map(r=>[r[8],r[9]]));
const n0=m.ctx.logs.length;
let r=m.ctx.previewRadius();
const L=m.ctx.logs.slice(n0).join('\n');
ok(/PREVIEW ONLY/.test(r.head)&&r.changed===2,'preview: 2 points would change ('+r.head+')');
ok([a,b,c].every(p=>Number(m.sheets.Points.rows[p.row-1][5])===10),'preview writes nothing');
ok(new RegExp(b.no+'  .*10 -> 15 m \\(RAISE\\)').test(L),'point b: 10 -> 15');
ok(new RegExp(c.no+'  .*10 -> 25 m \\(RAISE\\)').test(L),'point c: capped at 25');
ok(new RegExp(a.no+'  .*\\(keep\\)').test(L),'point a: keep 10 (repeat, suspect and old scans ignored)');
ok(/GPS not checked here/.test(L),'GPS_SKIP point left alone');
ok(/only 0 usable scans/.test(L),'points without scans are left alone');
r=m.ctx.applyRadius();
ok(/RADIUS SAVED/.test(r.head)&&Number(m.sheets.Points.rows[b.row-1][5])===15&&Number(m.sheets.Points.rows[c.row-1][5])===25&&Number(m.sheets.Points.rows[a.row-1][5])===10&&Number(m.sheets.Points.rows[skip.row-1][5])===10,'apply saves only the radius column of the changed points');
ok(JSON.stringify(m.sheets.Points.rows.map(r=>[r[8],r[9]]))===before,'positions (Lat/Lng) untouched');
m.ctx.setCfg_('RADIUS_MAX','20');m.ctx.setCfg_('RADIUS_MIN','12');
r=m.ctx.previewRadius();const L2=m.ctx.logs.slice(-1)[0];
ok(new RegExp(a.no+'  .*-> 12 m').test(L2)&&new RegExp(c.no+'  .*-> 20 m').test(L2),'RADIUS_MIN / RADIUS_MAX limits are respected');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
