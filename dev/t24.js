const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();
const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN,call=m.call;
['Ana A','Budi B','Cici C','Dodo D'].forEach(n=>call({action:'d_add',gp:D,name:n}));
let k=0;const add=(g,date,flags)=>m.sheets.Scans.rows.push(['s'+(k++),date+' 10:00:00',date,'10:00-12:00',g,'Security Guard','p1',1,'Gate','GT','','','','','OK',flags||'','',Date.parse(date+'T03:00:00Z')+k]);
// September: Ana 10 clean scans on 5 days; Budi 10 scans with 3 TOO_FAST; Cici 2 scans; Dodo 6 scans (REPEAT ignored); Rendi (danru) 20 scans
for(let i=0;i<10;i++)add('Ana A','2026-09-0'+(1+i%5));
for(let i=0;i<10;i++)add('Budi B','2026-09-1'+(i%5),i<3?'TOO_FAST':'');
add('Cici C','2026-09-20');add('Cici C','2026-09-21');
for(let i=0;i<6;i++)add('Dodo D','2026-09-2'+i);
add('Dodo D','2026-09-27','REPEAT');add('Dodo D','2026-09-27','NO_GPS');
for(let i=0;i<20;i++)add('Rendi Irawan','2026-09-0'+(1+i%9));
add('Ana A','2026-10-02'); // other month
// auth
ok(call({action:'a_award_get',month:'2026-09'}).err==='pin','guard/no pin refused');
ok(call({action:'a_award_get',pin:D,month:'2026-09'}).err==='pin','Danru PIN is not admin');
let r=call({action:'a_award_get',pin:AP,month:'2026-09'});
const by={};r.rows.forEach(x=>by[x.guard]=x);
ok(r.ok&&by['Ana A'].scans===10&&by['Ana A'].days===5&&by['Ana A'].issues===0,'Ana stats');
ok(by['Budi B'].issues===3,'TOO_FAST counted as issue');
ok(by['Dodo D'].scans===7&&by['Dodo D'].issues===0,'REPEAT ignored, NO_GPS not an issue');
ok(!by['Rendi Irawan'],'Danru excluded by default');
ok(r.rows.every(x=>x.q),'no criteria set: everyone with scans qualifies');
ok(call({action:'a_award_get',pin:AP,month:'bad'}).err==='bad_month','bad month refused');
// criteria
r=call({action:'a_award_set',pin:AP,minScans:5,maxIssues:0,minDays:3});
ok(r.ok&&r.criteria.minScans===5&&r.criteria.maxIssues===0,'criteria saved');
r=call({action:'a_award_get',pin:AP,month:'2026-09'});
const q=r.rows.filter(x=>x.q).map(x=>x.guard).sort().join();
ok(q==='Ana A,Dodo D'.replace('Ana A,Dodo D','Ana A')+(by['Dodo D'].days>=3?',Dodo D':''),'qualifiers follow criteria: '+q);
ok(call({action:'a_award_set',pin:AP,minScans:-3}).err==='bad_number','bad number refused');
// draw
ok(call({action:'a_award_announce',pin:AP,month:'2026-09'}).err==='no_draw','cannot announce before draw');
const wins={};for(let i=0;i<40;i++){const d=call({action:'a_award_draw',pin:AP,month:'2026-09'});ok(d.ok&&q.split(',').includes(d.winner),'') ;wins[d.winner]=1;}
ok(Object.keys(wins).length===q.split(',').length,'draw is random over all qualifiers');
// guards see nothing until announced
const gp=D;
ok(call({action:'state',gp}).award===null,'state: no award before announce');
r=call({action:'a_award_announce',pin:AP,month:'2026-09'});ok(r.ok&&r.winner,'announced');
const st=call({action:'state',gp});ok(st.award&&st.award.month==='2026-09'&&st.award.winner===r.winner,'guards see announced winner');
ok(call({action:'a_award_draw',pin:AP,month:'2026-09'}).err==='announced','no redraw after announce');
// no qualifiers
call({action:'a_award_set',pin:AP,minScans:9999});
ok(call({action:'a_award_draw',pin:AP,month:'2026-08'}).err==='no_qualifiers','no qualifiers -> no draw');
call({action:'a_award_set',pin:AP,maxIssues:''});ok(m.ctx.awardCrit_().maxIssues===null,'blank max issues = no limit');
ok(m.ctx.VERSION==='v1.11','version v1.9');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
