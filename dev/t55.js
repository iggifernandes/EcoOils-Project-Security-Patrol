const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Clear Guard'});
const prev=m.ctx.lastEnded_(Date.now());
const pts=m.ctx.points_(true);
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com,irsan@example.com');m.ctx.setCfg_('GPS_QUIET','yes');
pts.forEach((p,i)=>m.call({action:'scan',gp:G.pin,pid:p.id,queued:true,clientTs:prev.start+60000+i*1000,lat:3.2,lng:99.4,acc:8,photo:''}));
const fresh=()=>{m.ctx.mails.length=0;delete m.props.LAST_RC;m.ctx.roundCheck();return m.ctx.mails.map(x=>x);};
let mm=fresh();
ok(mm.length===2&&mm.some(x=>x.to==='owner@example.com')&&mm.some(x=>x.to==='irsan@example.com'),'every point scanned: owner AND Irsan still get an email ('+mm.map(x=>x.to)+')');
ok(mm.every(x=>/all done/i.test(x.subject)&&new RegExp(pts.length+'/'+pts.length).test(x.subject)),'subject says all done: '+(mm[0]&&mm[0].subject));
ok(mm.every(x=>/Missed 0/.test(x.htmlBody||x.html||x.body||JSON.stringify(x))),'body says Missed 0');
m.ctx.setCfg_('ROUND_ALL_CLEAR','no');
const nf=m.ctx.flagged_(prev).length;
ok(fresh().length===(nf?2:0),'ROUND_ALL_CLEAR=no is the old behaviour: email only if something is flagged or missed (flagged '+nf+')');
m.ctx.setCfg_('ROUND_ALL_CLEAR','yes');
// Danru address only in DANRU_EMAIL still gets the round email (GPS-free copy)
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com');m.ctx.setCfg_('DANRU_EMAIL','Irsan@example.com, owner@example.com');
mm=fresh();
ok(mm.length===2&&mm[0].to==='owner@example.com'&&mm[1].to==='Irsan@example.com','DANRU_EMAIL gets it too, the owner is not duplicated: '+mm.map(x=>x.to));
// daily summary also reaches him
m.ctx.mails.length=0;m.ctx.dailySummary();
ok(m.ctx.mails.some(x=>x.to==='Irsan@example.com')&&m.ctx.mails.some(x=>x.to==='owner@example.com'),'daily summary reaches owner and Irsan');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
