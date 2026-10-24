const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;const g=call({action:'d_add',gp:D,name:'Hold Guard'});
const realNow=Date.now;const at=(h,mi,day)=>Date.UTC(2026,9,day||19,h-7,mi,0);const T=ms=>{Date.now=()=>ms};
// authorisation
T(at(8,30));
ok(call({action:'d_hold',gp:g.pin,on:true}).err==='auth','plain guard cannot start a hold');
ok(call({action:'state',gp:g.pin}).hold.on===false,'no hold at first');
let r=call({action:'d_hold',gp:D,on:true,reason:'Lightning'});
ok(r.ok&&r.hold.on&&r.hold.by==='Rendi Irawan','Shift Supervisor starts a hold');
ok(call({action:'d_hold',gp:D,on:true}).already===true,'second start is a no-op');
let st=call({action:'state',gp:g.pin});ok(st.hold.on&&st.hold.reason==='Lightning'&&st.hold.by==='Rendi Irawan','every guard sees the hold, who set it and why');
T(at(9,30));r=call({action:'d_hold',pin:AP,on:false});ok(r.ok&&!r.hold.on,'Admin ends the hold');
ok(call({action:'state',gp:g.pin}).hold.on===false,'guards see it ended');
// rounds: 08-10 overlaps the hold -> excused, no email; 10-12 not held -> email
m.ctx.mails.length=0;T(at(10,2));(delete m.props.LAST_RC,m.ctx.roundCheck());ok(m.ctx.mails.length===0,'held round: no missed-round email');
T(at(14,2));(delete m.props.LAST_RC,m.ctx.roundCheck());ok(m.ctx.mails.length>=1,'next round (no hold): normal email');
// daily summary next day
m.ctx.mails.length=0;T(at(7,5,20));m.ctx.dailySummary();
const body=m.ctx.mails[0]&&m.ctx.mails[0].htmlBody||'';
ok(/weather hold/.test(body)&&/jeda cuaca/.test(body),'daily summary marks the held round (EN+ID)');
// stats
r=call({action:'a_stats',pin:AP,from:'2026-10-19',to:'2026-10-19'});
ok(r.heldRounds===1,'stats: 1 held round excluded from coverage: '+r.heldRounds);
// live
T(at(9,0));r=call({action:'a_live',pin:AP,date:'2026-10-19',idx:0});ok(r.held===true,'Admin Live flags the held round');
// auto expiry after 2 h
T(at(10,0));call({action:'d_hold',gp:D,on:true});
T(at(11,30));ok(call({action:'state',gp:g.pin}).hold.on===true,'still on after 1.5 h');
T(at(12,30));ok(call({action:'state',gp:g.pin}).hold.on===false,'switches itself off after 2 h');
T(at(12,31));ok(m.ctx.roundHeld_(m.ctx.roundAt_(at(10,5)))===true&&m.ctx.roundHeld_(m.ctx.roundAt_(at(13,5)))===false,'rounds after the auto end are not held');
// video
Date.now=realNow;
const big='A'.repeat(2000);
ok(call({action:'video',gp:g.pin,video:'x',mime:'video/webm',sec:5}).err==='bad_video','tiny/invalid video refused');
r=call({action:'video',gp:g.pin,video:big,mime:'video/webm;codecs=vp8',sec:12,note:'Heavy rain'});ok(r.ok,'video accepted');
ok(m.sheets.Videos.rows.length===2&&m.sheets.Videos.rows[1][1]==='Hold Guard'&&m.sheets.Videos.rows[1][3]===12&&/drive\.example/.test(m.sheets.Videos.rows[1][5]),'row in Videos sheet with Drive link');
ok(call({action:'video',gp:'111111',video:big,mime:'video/webm',sec:5}).err==='pin','video needs a valid PIN');
const td=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
r=call({action:'a_stats',pin:AP,from:td,to:td});ok(r.videos.length===1&&r.videos[0].guard==='Hold Guard','Admin stats lists the video');
ok(m.ctx.VERSION==='v1.38','version v1.11');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
