const m=require('./mock.js');
m.ctx.setCfg_('PHOTO_PER_ROUND','5');m.ctx.setCfg_('PHOTO_PRIORITY','');
m.ctx.makeDanruPins();
const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const A=dp['Rendi Irawan'];
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
// high-risk seeds
const pts=m.ctx.points_(true);const hi=pts.filter(p=>p.hi).map(p=>p.no);
ok(JSON.stringify(hi)===JSON.stringify([1,2,13,18,21,22,23,26,27,28,30,34,38,41,42]),'high-risk set: '+hi.join(','));
ok(!pts.find(p=>p.no===32).hi,'32 (SBE 1) not high risk');
// scan every point; photograph 3 of the 5 photo points, leave 1 skipped, 1 unscanned
const r=m.ctx.roundAt_(Date.now());
const set=m.ctx.photoSet_(r,pts);const photoNos=pts.filter(p=>set[p.id]).map(p=>p.no).sort((a,b)=>a-b);
ok(photoNos.length===5,'5 photo points: '+photoNos.join(','));
const need=[];
pts.forEach(p=>{if(p.no===photoNos[4])return;const x=m.call({action:'scan',gp:A,pid:p.id,lat:2.9,lng:99.1,acc:10});if(x.needPhoto)need.push(x);});
need.slice(0,3).forEach(x=>m.call({action:'photo',gp:A,scanId:x.scanId,photo:'A'.repeat(500)}));
const pc=m.ctx.photoChecks_(r,pts);
ok(pc.filter(x=>x.status==='taken').length===3&&pc.filter(x=>x.status==='missing').length===1&&pc.filter(x=>x.status==='none').length===1,'status: 3 taken, 1 missing, 1 not scanned');
const flagged=m.ctx.flagged_(r);
const en=m.ctx.roundHtml_('en',r,pts,[],[],flagged,pc),id=m.ctx.roundHtml_('id',r,pts,[],[],flagged,pc);
ok(en.includes('Photo checks (selfie): 3 of 5')&&(en.match(/photo taken/g)||[]).length===3&&en.includes('NO PHOTO')&&en.includes('not scanned'),'English round email marks photo taken');
ok(id.includes('Pemeriksaan foto (selfie): 3 dari 5')&&id.includes('foto diambil')&&id.includes('TANPA FOTO'),'Bahasa round email marks photo taken');
ok(en.includes('href="https://drive'),'email links to the photo');
// daily summary: real scans inside yesterday's round 3 (queued clientTs, photo sent inline)
const y=new Date(Date.parse(m.ctx.roundAt_(Date.now()).date+'T00:00:00Z')-86400000).toISOString().slice(0,10);
const r3=m.ctx.roundBy_(y,11),set3=m.ctx.photoSet_(r3,pts),pn=pts.filter(p=>set3[p.id]).map(p=>p.no);
pts.forEach(p=>{if(p.no===pn[4])return;const withPhoto=set3[p.id]&&p.no!==pn[3];
  m.call({action:'scan',gp:A,pid:p.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:r3.start+60000,photo:withPhoto?'A'.repeat(500):''});});
m.ctx.mails.length=0;m.ctx.dailySummary();
const mail=m.ctx.mails[0];
ok(mail&&/photos \/ foto 3\/60/.test(mail.subject),'daily subject shows photos taken: '+(mail&&mail.subject));
ok(mail.htmlBody.includes('Photo checks taken: 3 of 60')&&mail.htmlBody.includes('Pemeriksaan foto terambil: 3 dari 60')&&mail.htmlBody.includes('<th>Photo</th>')&&mail.htmlBody.includes('<th>Foto</th>'),'daily email has photo column and totals in both languages');
ok(mail.htmlBody.includes(r3.label+'</td><td align="right">44</td><td align="right">1</td><td align="right">3/5</td>'),'round row shows 3/5 photos');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
