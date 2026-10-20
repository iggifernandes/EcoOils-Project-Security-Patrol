const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'];const g=m.call({action:'d_add',gp:D,name:'Vid Guard'});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:390,height:800},permissions:['geolocation','camera','microphone']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:m.ctx.doPost({postData:{contents:body}}).s});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:')||u.startsWith('blob:'))return r.fallback();r.abort();});
 await ctx.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async function(){const c=document.createElement('canvas');c.width=480;c.height=270;const x=c.getContext('2d');let n=0;setInterval(()=>{x.fillStyle='hsl('+(n++*9%360)+',70%,50%)';x.fillRect(0,0,480,270);},60);return c.captureStream(15);};});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('dialog',d=>d.accept());
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 // plain guard: no hold button, sees banner when Danru starts a hold
 await pg.fill('#gpin',g.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(500);
 ok(await pg.locator('#bHold').isVisible()===false,'plain guard has no hold button');
 ok(/Record video/.test(await pg.locator('#bVid').innerText()),'Record video button for every login');
 m.call({action:'d_hold',gp:D,on:true,reason:'Lightning'});
 await pg.evaluate(()=>{});await pg.reload();await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForFunction(()=>/paused/i.test(document.querySelector('#holdBox').innerText),null,{timeout:10000});
 let t=await pg.locator('#holdBox').innerText();ok(/Rendi Irawan/.test(t)&&/Lightning/.test(t),'guard sees banner with who and why: '+t.replace(/\n/g,' '));
 await pg.click('#lID');ok(/dihentikan/.test(await pg.locator('#holdBox').innerText()),'banner in Bahasa Indonesia');await pg.click('#lEN');
 // video
 await pg.click('#bVid');await pg.waitForSelector('#vRec:not(.hidden)');await pg.waitForTimeout(500);
 await pg.click('#vRec');await pg.waitForTimeout(2500);
 ok(/Stop/.test(await pg.locator('#vRec').innerText()),'recording started');
 await pg.click('#vRec');await pg.waitForSelector('#vSend:not(.hidden)',{timeout:8000});
 ok(/\d+ s/.test(await pg.locator('#vTime').innerText()),'recorded clip length shown');
 await pg.click('#vSend');await pg.waitForFunction(()=>/sent/i.test(document.querySelector('#vMsg').innerText),null,{timeout:15000});
 const row=m.sheets.Videos&&m.sheets.Videos.rows[1];
 ok(row&&row[1]==='Vid Guard'&&row[4]==='Weather hold'&&/drive\.example/.test(row[5]),'video stored: guard, note "Weather hold", Drive link');
 await pg.waitForSelector('#vPatrol:not(.hidden)',{timeout:8000});
 // Danru can resume
 await pg.click('#bChange');await pg.fill('#gpin',D);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(600);
 ok(/Resume rounds/.test(await pg.locator('#bHold').innerText()),'Danru sees Resume rounds');
 await pg.click('#bHold');await pg.waitForFunction(()=>!/paused/i.test(document.querySelector('#holdBox').innerText),null,{timeout:10000});
 ok(/Pause rounds/.test(await pg.locator('#bHold').innerText()),'after resume the button says Pause rounds');
 ok(m.sheets.Hold.rows.map(r=>r[1]).join()==='Action,START,END','Hold log: START then END');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
