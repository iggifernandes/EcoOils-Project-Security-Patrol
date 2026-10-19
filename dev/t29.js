const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'];const g=m.call({action:'d_add',gp:D,name:'Clk Guard'});
// fixed server time: 07:05 WIB on 19 Oct 2026 (inside the Morning window)
const fixed=Date.UTC(2026,9,19,0,5,0);const realNow=Date.now;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:3.20,longitude:99.40,accuracy:8},permissions:['geolocation']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();Date.now=()=>fixed;const out=m.ctx.doPost({postData:{contents:body}}).s;Date.now=realNow;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
 await ctx.addInitScript(t=>{const R=Date.now;Date.now=()=>t+(R()-window.__t0);window.__t0=R();},fixed);
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 await pg.fill('#gpin',g.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(1500);
 let t=await pg.locator('#clockBox').innerText();
 ok(await pg.locator('#bClock').count()===0&&/guard house/i.test(t),'far from the gate: no Clock in button, neutral hint: '+t.replace(/\n/g,' '));
 ok(!/gps/i.test(t),'hint says nothing about GPS');
 // move to the gate
 await ctx.setGeolocation({latitude:3.131338+0.0004,longitude:99.347791,accuracy:8});
 await pg.waitForSelector('#bClock',{timeout:15000});
 ok((await pg.locator('#bClock').innerText()).includes('Clock in'),'button appears inside the circle: '+(await pg.locator('#bClock').innerText()));
 // Bahasa
 await pg.click('#lID');await pg.waitForTimeout(300);
 ok(/Absen masuk/.test(await pg.locator('#clockBox').innerText()),'button in Bahasa Indonesia');
 await pg.click('#lEN');
 await pg.click('#bClock');await pg.waitForFunction(()=>/Clocked in/.test(document.querySelector('#clockBox').innerText),null,{timeout:15000});
 t=await pg.locator('#clockBox').innerText();
 ok(/Clocked in 07:05/.test(t)&&/on time/.test(t),'after tapping: Clocked in 07:05, on time: '+t.replace(/\n/g,' '));
 ok(m.sheets.Clock.rows.length===2&&m.sheets.Clock.rows[1][2]==='Clk Guard','one Clock row written');
 // admin stats shows it
 await pg.click('#bChange');await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.evaluate(()=>{});await pg.fill('#stF','2026-10-19').catch(()=>{});
 await pg.fill('#stF','2026-10-19');await pg.fill('#stT','2026-10-19');
 Date.now=()=>fixed;await pg.click('#stGo');await pg.waitForFunction(()=>/Clock-ins/.test(document.querySelector('#aBody').innerText),null,{timeout:8000});Date.now=realNow;
 ok(/Clk Guard/.test(await pg.locator('#aBody').innerText()),'Admin Stats lists the clock-in');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
