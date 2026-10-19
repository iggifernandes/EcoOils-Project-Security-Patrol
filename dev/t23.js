const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const D=m.ctx.logs.filter(l=>/DANRU PIN\s+Rendi/.test(l))[0].match(/(\d{6})$/)[1];
const pts=m.call({action:'state',gp:D}).points;
// guard scan with NO location: the guard is told nothing
let r=m.call({action:'scan',gp:D,pid:pts[0].id});
ok(r.ok&&r.gps==='UNCALIBRATED'&&r.flags.length===0&&r.dist==='','guard screen: no GPS problem shown (default quiet)');
const row=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
ok(row[14]==='NO_GPS'&&/NO_GPS/.test(row[15]),'the owner still has the real NO_GPS in the Scans sheet');
const live=m.call({action:'a_live',pin:m.props.ADMIN_PIN});
ok(JSON.stringify(live).includes('NO_GPS'),'Admin Live view still shows NO_GPS');
// switch off
m.ctx.setCfg_('GPS_QUIET','no');
r=m.call({action:'scan',gp:D,pid:pts[1].id});ok(r.gps==='NO_GPS'&&r.flags.includes('NO_GPS'),'GPS_QUIET=no: guard is told (normal behaviour)');
m.ctx.setCfg_('GPS_QUIET','yes');
// emails: owner gets full, second address gets no GPS flags
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com,irsan@example.com');
const prev=m.ctx.roundAt_(Date.now()-2*3600000);
m.call({action:'scan',gp:D,pid:pts[2].id,queued:true,clientTs:prev.start+120000});                       // NO_GPS (no coords)
m.call({action:'scan',gp:D,pid:pts[3].id,queued:true,clientTs:prev.start+130000,lat:2.9,lng:99.1,acc:10,photo:''}); // other flags only
m.ctx.mails.length=0;m.ctx.roundCheck();
const to=m.ctx.mails.map(x=>x.to);
ok(to.includes('owner@example.com')&&to.includes('irsan@example.com')&&m.ctx.mails.length===2,'two separate emails: owner and the rest');
const own=m.ctx.mails.find(x=>x.to==='owner@example.com').htmlBody,oth=m.ctx.mails.find(x=>x.to==='irsan@example.com').htmlBody;
ok(/no GPS/.test(own)&&/tanpa GPS/.test(own),'owner email lists "no GPS" (EN+ID)');
ok(!/no GPS|tanpa GPS|outside radius|di luar radius|GPS/i.test(oth),'second recipient email has no GPS wording at all');
// daily summary the same
m.ctx.mails.length=0;m.ctx.dailySummary();
ok(m.ctx.mails.length===2,'daily summary also sent as two emails');
const dOwn=m.ctx.mails.find(x=>x.to==='owner@example.com').htmlBody,dOth=m.ctx.mails.find(x=>x.to==='irsan@example.com').htmlBody;
ok(!/no GPS|tanpa GPS/.test(dOth)&&(dOwn.length>=dOth.length),'daily: no GPS wording for second recipient');
// single recipient / quiet off: one email with everything
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com');m.ctx.mails.length=0;m.ctx.roundCheck();
ok(m.ctx.mails.length===1&&/no GPS/.test(m.ctx.mails[0].htmlBody),'single address: one full email');
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com,irsan@example.com');m.ctx.setCfg_('GPS_QUIET','no');m.ctx.mails.length=0;m.ctx.roundCheck();
ok(m.ctx.mails.length===1&&m.ctx.mails[0].to==='owner@example.com,irsan@example.com'&&/no GPS/.test(m.ctx.mails[0].htmlBody),'GPS_QUIET=no: everyone gets the full email');
ok(m.ctx.VERSION==='v1.8.6','version v1.8.6');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
