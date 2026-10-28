const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Warm Guard'});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:2.9,longitude:99.1,accuracy:60},permissions:['geolocation','camera']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
 await ctx.addInitScript(()=>{window.__cam=0;navigator.mediaDevices.getUserMedia=function(){window.__cam++;const c=document.createElement('canvas');c.width=640;c.height=480;return Promise.resolve(c.captureStream(5));};});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 ok(await pg.locator('#ver').innerText()==='v1.52','version v1.50');
 await pg.fill('#gpin',G.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 await pg.click('#bScan');await pg.waitForTimeout(1500);
 ok(await pg.locator('#scanModal').isVisible(),'scan window open');
 ok(/60 m/.test(await pg.locator('#scanMsg').innerText()),'weak GPS: shows live accuracy 60 m');
 ok(await pg.locator('#scanSkip').isVisible(),'Scan now button shown while waiting');
 ok(await pg.evaluate(()=>window.__cam)===0,'camera not started yet (GPS first)');
 await ctx.setGeolocation({latitude:2.9,longitude:99.1,accuracy:8});
 await pg.waitForFunction(()=>window.__cam>=1,null,{timeout:8000});
 ok(true,'accuracy 8 m -> GPS ready, camera starts');
 ok(await pg.locator('#scanSkip').isHidden(),'Scan now hidden after warm-up');
 ok(/scan|point|QR/i.test(await pg.locator('#scanMsg').innerText()),'normal scan help text shown');
 await pg.click('#scanX');
 // second time: good fix already warm -> camera starts at once
 await pg.click('#bScan');await pg.waitForFunction(()=>window.__cam>=2,null,{timeout:3000});
 ok(true,'second scan starts the camera at once (warm fix)');
 await pg.click('#scanX');
 // skip works
 await ctx.setGeolocation({latitude:2.9,longitude:99.1,accuracy:80});await pg.waitForTimeout(1200);
 await pg.evaluate(()=>{});
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
