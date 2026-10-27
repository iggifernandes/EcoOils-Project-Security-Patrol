// Performance profile of the admin actions with ~30 days of data. Not part of npm test.
const m=require('./mock.js');const ctx=m.ctx;
ctx.CACHE_ON=false;
const stats={calls:0,cells:0,sheets:{}};
const wrapped=new Map();
const orig=ctx.SpreadsheetApp.getActiveSpreadsheet();
function wrap(sh){if(!sh)return sh;if(wrapped.has(sh))return wrapped.get(sh);
  const o=Object.create(sh);o.getRange=function(r,c,nr,nc){const rg=sh.getRange(r,c,nr,nc);const gv=rg.getValues;rg.getValues=function(){stats.calls++;const cells=(nr||1)*(nc||1);stats.cells+=cells;stats.sheets[sh.name]=(stats.sheets[sh.name]||0)+cells;return gv()};return rg};
  wrapped.set(sh,o);return o;}
ctx.SpreadsheetApp.getActiveSpreadsheet=()=>({getSheetByName:n=>wrap(orig.getSheetByName(n)),insertSheet:n=>wrap(orig.insertSheet(n)),getSheets:()=>orig.getSheets(),deleteSheet(){}});
m.call({action:'ping'});
const D=(()=>{ctx.makeDanruPins();const dp={};ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});return dp['Rendi Irawan'];})();
const ADM=m.props.ADMIN_PIN;
const guards=[];for(let i=0;i<14;i++)guards.push(m.call({action:'d_add',gp:D,name:'Guard '+i}));
const pts=ctx.points_(true);
// 30 days of scans
const sh=m.sheets.Scans;const now=Date.now();let n=0;
for(let d=30;d>=0;d--){for(let ri=0;ri<9;ri++){const base=Date.parse(new Date(now-d*86400000).toISOString().slice(0,10)+'T00:00:00Z');
  const rr=ctx.roundBy_(new Date(now-d*86400000+7*3600000).toISOString().slice(0,10),ri);if(rr.end>now)continue;
  pts.forEach((p,k)=>{const ts=rr.start+60000+k*20000;const g=guards[(k+ri+d)%14];
   sh.appendRow(['s'+(n++),'2026-10-01 00:00:00',rr.date,rr.label,'Guard '+((k+ri+d)%14),'Guard',p.id,p.no,p.name,p.zone,3.13,99.348,8,k%7,'OK',k%11===0?'REPEAT':'','',ts,k%5===0?'Taken':'']);});}}
for(let i=0;i<300;i++){const g=guards[i%14];m.call({action:'obs',gp:g.pin,type:i%3?'Issue':'Positive',cat:'Fence / perimeter',text:'Observation '+i,cid:'o'+i,pno:String(1+(i%46))});}
console.log('scans rows',sh.rows.length,'obs rows',m.sheets.Observations.rows.length);
function run(label,body){stats.calls=0;stats.cells=0;stats.sheets={};const t=Date.now();const r=m.call(body);const ms=Date.now()-t;
  console.log((label+' ').padEnd(22),'ms',String(ms).padStart(5),'reads',String(stats.calls).padStart(3),'cells',String(stats.cells).padStart(8),'json KB',String(Math.round(JSON.stringify(r).length/1024)).padStart(4),Object.entries(stats.sheets).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]+':'+x[1]).join(' '));return r;}
const A=b=>Object.assign({pin:ADM},b);
run('a_stats 7d',A({action:'a_stats'}));
run('a_stats 30d',A({action:'a_stats',from:new Date(now-29*86400000).toISOString().slice(0,10)}));
run('a_live',A({action:'a_live'}));
run('a_missed 7d',A({action:'a_missed'}));
run('a_missed 30d',A({action:'a_missed',from:new Date(now-29*86400000).toISOString().slice(0,10)}));
run('a_obsdb 30d',A({action:'a_obsdb'}));
run('a_history today',A({action:'a_history',from:new Date().toISOString().slice(0,10)}));
run('a_chk',A({action:'a_chk'}));
run('a_config',A({action:'a_config'}));
run('a_guards/team',A({action:'a_guards'}));
run('a_view list',A({action:'a_view'}));
run('d_dash',{action:'d_dash',gp:D});
run('state guard',{action:'state',gp:guards[0].pin});
run('ping',{action:'ping'});
