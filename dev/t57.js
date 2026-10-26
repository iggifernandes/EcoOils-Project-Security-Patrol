const {chromium}=require('playwright-core');
const m=require('./mock.js');const mkStub=require('./gatestub.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Gate Guard'});
const SEC='s3cr3t-1234';const stub=mkStub(SEC);m.ctx.UrlFetchApp={fetch:(u,o)=>stub.fetch(u,o)};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).flatMap(x=>['chrome-linux','chrome-linux64'].map(d=>'/opt/pw-browsers/'+x+'/'+d+'/chrome')).find(p=>require('fs').existsSync(p)),args:['--no-sandbox']});
 async function sess(pin){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));pg.on('dialog',d=>d.accept());
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
  await pg.fill('#gpin',pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(900);return pg;
 }
 // not set up: no button
 let pg=await sess(G.pin);
 ok(!(await pg.locator('#bGate').isVisible()),'no Gate pass button while the link is not set up');
 await pg.context().close();
 m.props.GATEPASS_URL='https://script.google.com/macros/s/AAA/exec';m.props.GATEPASS_SECRET=SEC;
 pg=await sess(G.pin);
 await pg.waitForFunction(()=>/\(2\)/.test(document.getElementById('bGate').textContent),null,{timeout:8000});
 ok(await pg.locator('#bGate').isVisible()&&/Gate pass \(2\)/.test(await pg.locator('#bGate').innerText()),'button shows the pending count: '+await pg.locator('#bGate').innerText());
 ok(await pg.evaluate(()=>/#vPatrol\.pv #bGate/.test([...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('')}catch(e){return ''}}).join(''))),'hidden in the Admin read-only guard view');
 await pg.screenshot({path:'/tmp/pat_home.png'});
 await pg.click('#bGate');await pg.waitForSelector('#vGate:not(.hidden)');await pg.waitForSelector('[data-gopen]');
 ok((await pg.locator('[data-gopen]').count())===2,'list shows 2 pending passes');
 // typed reference with a URL, not-ready pass
 await pg.fill('#gRef','https://x/?v=MGP-2610-0003');await pg.click('#gRefGo');await pg.waitForSelector('#gBackList');
 ok(/DO NOT RELEASE/.test(await pg.locator('#gateBody').innerText())&&!(await pg.locator('#gRelease').count()),'not-ready pass: DO NOT RELEASE and no release button');
 await pg.click('#gBackList');
 await pg.fill('#gRef','hello');await pg.click('#gRefGo');
 ok(/not a gate pass QR/.test(await pg.locator('#gateBody').innerText()),'bad reference text refused');
 // open the first pending pass
 await pg.click('[data-gopen="MGP-2610-0001"]');await pg.waitForSelector('#gRelease');
 const t=await pg.locator('#gateBody').innerText();
 ok(/READY FOR RELEASE CHECK/.test(t)&&/BK 1234 XY/.test(t)&&/Pipe 6in/.test(t)&&/Budi Santoso/.test(t),'pass screen shows banner, vehicle, driver and items');
 ok((await pg.locator('.gimg').count())===5,'signed copy + 4 vehicle photos are shown');
 ok(await pg.locator('#gRelease').isDisabled(),'Release is disabled until all checks are ticked');
 const cks=pg.locator('[data-gck]');ok((await cks.count())===4,'four checks');
 for(let i=0;i<3;i++)await cks.nth(i).check();
 ok(await pg.locator('#gRelease').isDisabled(),'still disabled with 3 of 4');
 await pg.locator('[data-gck]').nth(3).check();
 ok(!(await pg.locator('#gRelease').isDisabled()),'enabled with all 4');
 await pg.screenshot({path:'/tmp/pat_pass.png',fullPage:true});
 await pg.locator('.gimg').first().click();ok(await pg.locator('#gzModal').isVisible(),'tap on a photo zooms it');await pg.locator('#gzModal').click();ok(!(await pg.locator('#gzModal').isVisible()),'tap again closes the zoom');
 await pg.click('#gRelease');await pg.waitForSelector('.okc');
 ok(/Vehicle released/.test(await pg.locator('#gateBody').innerText()),'success message');
 const sent=stub.fetches.filter(f=>f.action==='b_release').pop();
 ok(sent&&sent.by==='Gate Guard'&&sent.decision==='release'&&sent.lat!=null,'recorded under the guard and with the phone location');
 await pg.click('#gBackList');await pg.waitForTimeout(900);
 ok((await pg.locator('[data-gopen]').count())===1,'list now shows 1 pending');
 // reject flow
 await pg.click('[data-gopen="MGP-2610-0002"]');await pg.waitForSelector('#gReject');await pg.click('#gReject');await pg.click('#gRejGo');
 ok(/Write the reason/.test(await pg.locator('#gErr').innerText()),'reject without a reason is refused on the phone');
 await pg.fill('#gWhy','Quantity does not match');await pg.click('#gRejGo');await pg.waitForSelector('.okc');
 ok(stub.pass['MGP-2610-0002'].status==='Rejected'&&stub.pass['MGP-2610-0002'].note==='Quantity does not match','rejected with the reason');
 // already released pass opened by another guard
 await pg.click('#gBackList');await pg.fill('#gRef','MGP-2610-0001');await pg.click('#gRefGo');await pg.waitForSelector('#gBackList');
 ok(/DO NOT RELEASE/.test(await pg.locator('#gateBody').innerText())&&/Already released/.test(await pg.locator('#gateBody').innerText())&&/Gate Guard/.test(await pg.locator('#gateBody').innerText()),'an already released pass shows who released it');
 // Bahasa Indonesia
 await pg.click('#gBackList');await pg.click('#lID');
 ok(/Pindai QR surat/.test(await pg.locator('#gateBody').innerText()),'Bahasa Indonesia strings');
 await pg.click('#lEN');
 // system down
 stub.down=true;await pg.click('#gHome');await pg.waitForTimeout(100);
 await pg.evaluate(()=>{});await pg.click('#bGate');await pg.fill('#gRef','MGP-2610-0001');await pg.click('#gRefGo');await pg.waitForTimeout(900);
 ok(/Cannot reach the gate pass system/.test(await pg.locator('#gateBody').innerText()),'system down: clear message, nothing released');
 ok(pg.errs.length===0,'no page errors '+pg.errs.join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
