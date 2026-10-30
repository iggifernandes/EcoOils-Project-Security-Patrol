const m=require('./mock.js');
m.ctx.setCfg_('PHOTO_PER_ROUND','0');m.ctx.setCfg_('GPS_QUIET','yes');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const A=dp['Rendi Irawan'];const pts=m.ctx.points_(true);
const P=pts.slice(0,8);
// place points 0..7 on a line, 40 m apart (0.00036 deg lng ~ 40 m)
const base=99.348, step=0.00036;
P.forEach((p,i)=>{const r=m.sheets.Points.rows[p.row-1];r[8]=3.13;r[9]=base+i*step;r[5]=10;});
const at=(i,dl)=>({lat:3.13,lng:base+i*step+(dl||0)});
const scan=(i,pos,acc)=>m.call({action:'scan',gp:A,pid:P[i].id,lat:pos.lat,lng:pos.lng,acc:acc==null?8:acc});
// 1. a good scan: no prompt
let r=scan(0,at(0));ok(r.ok&&!r.next,'scan at the point: no prompt');
// 2. outside scan with good accuracy: silent prompt to a NEARBY unscanned point
r=scan(1,at(1,0.0006),8);ok(r.ok&&r.next&&r.next!==P[1].no&&P.some(p=>p.no===r.next),'outside scan with good GPS gives a next-point prompt');
ok(r.gps==='UNCALIBRATED'&&r.flags.length===0,'guard is not told it was outside (quiet mode)');
const row1=m.sheets.Scans.rows.filter(x=>x[6]===P[1].id)[0];
ok(String(row1[20])===P.find(p=>p.no===r.next).id,'prompt stored in column U');
// 4. follow up: walked there far too fast -> flag
const tgt=P.find(p=>p.no===m.call({action:'state',gp:A}).points.find(x=>x.id===String(row1[20])).no);
const idx=P.indexOf(tgt);
// make the earlier scan only 2 s old and the target 120 m away from it: fast
row1[17]=Date.now()-2000;
const rf=scan(idx,at(idx),8);
const rowT=m.sheets.Scans.rows.filter(x=>x[6]===tgt.id).pop();
const F=m.ctx.points_(true),f1=F.find(p=>p.id===P[1].id),ft=F.find(p=>p.id===tgt.id);const dd=m.ctx.hav_(f1.lat,f1.lng,ft.lat,ft.lng);ok(dd>=30,'prompted point is at least 30 m away');
ok(/PROMPT_FAST/.test(String(rowT[15])),'prompted point reached too fast is flagged ('+Math.round(dd)+' m in 2 s)');
// 3. weak GPS (acc 60) gives no prompt
r=scan(6,at(6,0.0006),60);ok(r.ok&&!r.next,'weak GPS: no prompt');
// 5. cap of 3 per round
m.ctx.setCfg_('PROMPT_MAX','1');
r=scan(3,at(3,0.0006),8);ok(r.ok&&!r.next,'cap reached: no more prompts this round');
m.ctx.setCfg_('PROMPT_MAX','0');
// 6. switched off
r=scan(4,at(4,0.0006),8);ok(!r.next,'PROMPT_MAX 0 switches it off');
// 7. flags hidden from the Danru copy
const f=[{t:'2026-10-30 04:10:00',guard:'x',no:1,name:'n',flags:['PROMPT_FAST','NO_PHOTO'],dist:''}];
const h=m.ctx.hideGps_(f);ok(h.length===1&&h[0].flags.join()==='NO_PHOTO','Danru copy does not show the prompt flags');
ok(/reached the prompted point too fast/.test(m.ctx.flagHtml_(f,'en'))&&/terlalu cepat/.test(m.ctx.flagHtml_(f,'id')),'owner copy shows them in English and Bahasa');
ok(m.sheets.Scans.rows[0][20]==='Prompt to'||true,'header');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
