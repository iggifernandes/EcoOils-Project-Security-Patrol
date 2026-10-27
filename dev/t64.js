const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'],ADM=m.props.ADMIN_PIN;
const G=m.call({action:'d_add',gp:D,name:'Perf Guard'});
const pts=m.ctx.points_(true),now=Date.now(),sh=m.sheets.Scans;
// old scans (20 days) and recent ones
for(let d=20;d>=0;d--){for(let ri=0;ri<9;ri++){const rr=m.ctx.roundBy_(new Date(now-d*86400000+7*3600000).toISOString().slice(0,10),ri);if(rr.end>now)continue;
 pts.slice(0,8).forEach((p,k)=>sh.appendRow(['s'+d+ri+k,'2026-10-01 00:00:00',rr.date,rr.label,'Perf Guard','Guard',p.id,p.no,p.name,p.zone,3.13,99.348,8,3,'OK','',0,rr.start+60000+k*20000]));}}
const from=new Date(now-6*86400000).toISOString().slice(0,10);
// scanRows_ equals a full read for the period (compare a_missed with cache off, then full-sheet count)
const full=sh.rows.length;
const r1=m.call({action:'a_missed',pin:ADM,from,to:new Date(now).toISOString().slice(0,10)});
ok(r1.ok&&r1.rounds>0&&r1.missed>0,'a_missed works with date-range read');
const rs=m.ctx.scanRows_(from);ok(rs.length<full&&rs.length>0,'scanRows_ reads less than the whole sheet ('+rs.length+' of '+full+')');
const lim=Date.parse(from+'T00:00:00+07:00')-48*3600000;
ok(sh.rows.filter(r=>Number(r[17])>=lim).length===rs.length,'scanRows_ keeps every row from the cut-off on');
// cache
m.ctx.CACHE_ON=true;
const c1=m.call({action:'a_stats',pin:ADM});const c2=m.call({action:'a_stats',pin:ADM});
ok(c1.ok&&!c1.cached&&c2.cached===true,'second Stats call is served from cache');
ok(!m.call({action:'a_stats',pin:ADM,fresh:1}).cached,'fresh=1 bypasses the cache');
ok(m.call({action:'a_stats',pin:'000000'}).err==='pin','wrong Admin PIN is refused even when cached');
const dd1=m.call({action:'d_dash',gp:D}),dd2=m.call({action:'d_dash',gp:D});
ok(!dd1.cached&&dd2.cached,'dashboard cached');
ok(m.call({action:'d_dash',gp:G.pin}).err==='auth','guard still refused (cache is behind the PIN check)');
m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Cache test issue',cid:'cc1'});
const dd3=m.call({action:'d_dash',gp:D});
ok(!dd3.cached&&dd3.issues.open===1,'a new observation clears the cache, dashboard shows it at once');
const o1=m.call({action:'d_obs_list',gp:D});const id=o1.open[0].id;
m.call({action:'d_obs_close',gp:D,id,note:'fixed'});
ok(m.call({action:'d_obs_list',gp:D}).open.length===0,'closing an issue clears the cache');
const h=m.call({action:'a_obsdb',pin:ADM});ok(h.ok,'obs database still works');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
