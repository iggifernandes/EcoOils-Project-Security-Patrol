const {chromium}=require('playwright-core');
const m=require('./mock.js');const mkStub=require('./gatestub.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Gate Guard'});
const SEC='s3cr3t-1234';const stub=mkStub(SEC);m.ctx.UrlFetchApp={fetch:(u,o)=>stub.fetch(u,o)};
m.props.GATEPASS_URL='https://script.google.com/macros/s/AAA/exec';m.props.GATEPASS_SECRET=SEC;
// backend
ok(m.call({action:'audit_list',gp:G.pin}).err==='not_auditor','a guard cannot audit');
const D=dp['Rendi Irawan'];const names=Object.keys(dp);
const L=m.call({action:'audit_list',gp:D});
ok(L.ok&&L.n===2&&!JSON.stringify(L).match(/flags|score|QUICK/),'supervisor gets the open audits and NO flags or scores: '+JSON.stringify(L).slice(0,120));
ok(m.call({action:'audit_done',gp:D,ref:'MGP-2610-0001',paper:'yes',photos:'no',items:'yes',note:''}).err==='need_note','a No needs a note');
const d1=m.call({action:'audit_done',gp:D,ref:'MGP-2610-0001',paper:'yes',photos:'no',items:'yes',note:'Plate differs from the photo'});
const sent=stub.fetches.filter(f=>f.action==='b_audit_done').pop();
ok(d1.ok&&d1.inconsistency&&sent.by==='Rendi Irawan'&&sent.role==='Shift Supervisor','inconsistency saved; the name and role come from the PIN, not the phone');
ok(m.call({action:'audit_list',gp:D}).n===1,'it leaves the open list');
ok(m.call({action:'audit_done',gp:D,ref:'MGP-2610-0001',paper:'yes',photos:'yes',items:'yes'}).err==='already_done','cannot be audited twice');
stub.down=true;ok(m.call({action:'audit_list',gp:D}).err==='gate_down','Gate Pass unreachable gives gate_down');stub.down=false;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).flatMap(x=>['chrome-linux','chrome-linux64'].map(d=>'/opt/pw-browsers/'+x+'/'+d+'/chrome')).find(p=>require('fs').existsSync(p))});
 async function sess(pin){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));pg.on('dialog',d=>d.accept());
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
  await pg.fill('#gpin',pin);await pg.click('#bGpin');await waitPat(pg);await pg.waitForTimeout(900);return pg;
 }
 let pg=await sess(G.pin);
 ok(!(await pg.locator('#bAudit').isVisible()),'guards do not see the audit button');await pg.context().close();
 pg=await sess(D);
 await pg.waitForFunction(()=>/\(1\)/.test(document.getElementById('bAudit').textContent),null,{timeout:8000});
 ok(await pg.locator('#bAudit').isVisible(),'supervisor sees: '+await pg.locator('#bAudit').innerText());
 ok(await pg.evaluate(()=>/#vPatrol\.pv #bAudit/.test([...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('')}catch(e){return ''}}).join(''))),'hidden in the Admin read-only guard view');
 await pg.click('#bAudit');await pg.waitForSelector('[data-aopen]');
 await pg.click('[data-aopen="MGP-2610-0002"]');await pg.waitForSelector('#aSend');
 ok(await pg.locator('#aSend').isDisabled(),'Send is disabled until all three questions are answered');
 await pg.click('[data-aq=paper][data-av=yes]');await pg.click('[data-aq=photos][data-av=yes]');await pg.click('[data-aq=items][data-av=no]');
 await pg.click('#aSend');await pg.waitForFunction(()=>/Describe what does not match/.test(document.getElementById('auditBody').innerText));
 ok(true,'a No without a note is refused on the phone');
 await pg.fill('#aNote','Only 1 of 2 pipes on the paper');await pg.click('#aSend');
 await pg.waitForFunction(()=>/inconsistency reported/.test(document.getElementById('auditBody').innerText),null,{timeout:8000});
 ok(true,'inconsistency sent');
 ok(!pg.errs.length,'no page errors '+pg.errs.join('|'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})();
