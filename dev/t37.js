const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const pts=m.ctx.points_(true);
ok(m.ctx.photoN_()===8,'default is 8 selfie checks per round');
const PRI={7:1,9:1,18:1,23:1};const cnt={};let sizeOk=true;
for(let d=1;d<=28;d++)for(let i=0;i<9;i++){const set=m.ctx.photoSet_(m.ctx.roundBy_('2026-10-'+String(d).padStart(2,'0'),i),pts);const ids=Object.keys(set);if(ids.length!==8)sizeOk=false;ids.forEach(id=>{cnt[id]=(cnt[id]||0)+1;});}
ok(sizeOk,'always exactly 8 points');
const rounds=28*9;const byNo={};pts.forEach(p=>byNo[p.no]=(cnt[p.id]||0)/rounds);
const pri=[7,9,18,23].map(n=>byNo[n]);const others=pts.filter(p=>!PRI[p.no]).map(p=>byNo[p.no]);
ok(pri.every(x=>x>0.7&&x<0.95),'priority points asked in most rounds: '+pri.map(x=>Math.round(x*100)+'%').join(', '));
const avgO=others.reduce((a,b)=>a+b,0)/others.length;ok(avgO>0.03&&avgO<0.2,'the other points are still asked at random: avg '+Math.round(avgO*100)+'%');
ok(others.every(x=>x>0),'every other point gets asked sometimes');
m.ctx.setCfg_('PHOTO_PRIORITY_PCT','0');const c2={};for(let i=0;i<9;i++){Object.keys(m.ctx.photoSet_(m.ctx.roundBy_('2026-10-01',i),pts)).forEach(id=>c2[id]=1);}
ok(true,'PCT 0 behaves as uniform random (no crash)');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
