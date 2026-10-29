const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Muhammad Irsan'],R=dp['Rendi Irawan'];const G=m.call({action:'d_add',gp:D,name:'Plain Guard'});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async q=>{const body=q.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await q.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',q=>{const u=q.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return q.fallback();q.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));return {pg,ctx};
 }
 let {pg,ctx}=await sess();
 await pg.fill('#gpin',D);await pg.click('#bGpin');await pg.waitForSelector('#vDan:not(.hidden)');
 ok(await pg.locator('#dtWarn').isVisible(),'the Danru sees the Warning tab');
 ok((await pg.locator('#dtWarn').innerText())==='Warning','tab says Warning');
 await pg.evaluate(()=>{window.__o=[];window.open=(u,t,f)=>{window.__o.push([u,t,f]);return null;};});
 await pg.click('#dtWarn');
 const o=await pg.evaluate(()=>window.__o);
 ok(o.length===1&&o[0][0]==='https://iggifernandes.github.io/EcoOils-Project-Disciplinary-Record/'&&o[0][1]==='_blank'&&/noopener/.test(o[0][2]),'opens the Warning Record app in a new tab, noopener');
 ok(await pg.locator('#vDan:not(.hidden)').count()===1,'the patrol app stays on its screen');
 await pg.click('#lID');ok((await pg.locator('#dtWarn').innerText())==='Peringatan','Bahasa label');
 const s=await sess();
 await s.pg.fill('#gpin',R);await s.pg.click('#bGpin');await s.pg.waitForSelector('#vDan:not(.hidden)');
 ok(await s.pg.locator('#dTabs').isVisible()&&await s.pg.locator('#dtWarn').isHidden(),'a Shift Supervisor has the tab bar but no Warning tab');
 const g=await sess();
 await g.pg.fill('#gpin',G.pin);await g.pg.click('#bGpin');await g.pg.waitForSelector('#vPatrol:not(.hidden)');
 ok(await g.pg.locator('#dTabs').isHidden(),'a guard sees no tab bar, so no Warning tab');
 ok(pg.errs.length===0&&g.pg.errs.length===0,'no page errors');
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
