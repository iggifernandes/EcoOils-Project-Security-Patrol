const m=require('./mock.js');
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const pts=m.ctx.points_(true),p47=pts.find(p=>p.no===47);
ok(p47&&m.ctx.gpsSkip_(47)&&m.ctx.gpsSkipList_().indexOf('47')>=0,'point 47 is always GPS-skipped (shade)');
m.props.GPS_SKIP_X=1;
let all=true,other=new Set();
for(let i=0;i<30;i++){const r=m.ctx.roundBy_('2026-11-0'+(1+i%9),i%9);const set=m.ctx.photoSet_(r,pts);if(!set[p47.id])all=false;other.add(Object.keys(set).filter(k=>k!==p47.id).sort().join());}
ok(all,'point 47 is a selfie point in EVERY round');
const r0=m.ctx.roundBy_('2026-11-03',2);
ok(Object.keys(m.ctx.photoSet_(r0,pts)).length===m.ctx.photoN_(),'total stays PHOTO_PER_ROUND (47 counted inside it)');
ok(other.size>5,'the other selfie points still change from round to round');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
