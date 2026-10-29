const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'];
const G=m.call({action:'d_add',gp:D,name:'Gate Guard'});const G2=m.call({action:'d_add',gp:D,name:'Other Guard'});
const now=m.ctx.shiftAt_(Date.now());
m.call({action:'d_plan_set',gp:D,date:now.date,shift:now.code,rows:[{duty:'Gate 1',guard:'Gate Guard',buddy:''},{duty:'Patrol',guard:'Other Guard',buddy:''}]});
m.call({action:'obs',gp:G2.pin,type:'Issue',cat:'Fence / perimeter',text:'Light out',cid:'q1'});
m.call({action:'d_hk_save',gp:D,rows:m.call({action:'d_hk_get',gp:D}).items.map((x,i)=>({i,ok:i!==0,note:i===0?'Dirty floor':''}))});
// gate duty rule (backend)
ok(m.call({action:'state',gp:G.pin}).hk.mine===true&&m.call({action:'state',gp:G2.pin}).hk.mine===false,'only the guard on Gate 1 is responsible for cleaning');
ok(m.call({action:'hk_list',gp:G2.pin}).err==='not_duty'&&m.call({action:'hk_list',gp:G.pin}).ok,'other guard refused, gate guard sees the actions');
const id=m.call({action:'hk_list',gp:G.pin}).open[0].id;
ok(m.call({action:'hk_done',gp:G2.pin,id,note:'I cleaned it'}).err==='not_duty','other guard cannot close it');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async q=>{const body=q.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await q.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',q=>{const u=q.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return q.fallback();q.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));pg.on('dialog',d=>d.accept());
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));return pg;
 }
 let pd=await sess();
 await pd.fill('#gpin',D);await pd.click('#bGpin');await pd.waitForSelector('#vDan:not(.hidden)');
 ok(true,'Danru lands on the dashboard');
 await pd.waitForFunction(()=>document.querySelectorAll('#danBody .kpi').length>=8,null,{timeout:6000});
 const t=await pd.locator('#danBody').innerText();
 ok(/open issues/i.test(t)&&/cleaning actions open/i.test(t)&&/missed today/i.test(t)&&/last 7 days/i.test(t)&&/equipment problems/i.test(t),'dashboard shows the critical metrics');
 ok((await pd.locator('#dTabs button:visible').allInnerTexts()).join('|')==='Dashboard|Patrol|Update issues|Building|Equipment','tab bar for a Shift Supervisor (no Warning)');
 ok(await pd.locator('#dtDash.on').count()===1,'Dashboard tab is active');
 ok((await pd.locator('.kpi[data-go="iss"] b').innerText())==='1','1 open issue on the tile');
 await pd.click('#dtIss');await pd.waitForSelector('#vObsL:not(.hidden)');
 ok(await pd.locator('#dtIss.on').count()===1&&await pd.locator('#dTabs').isVisible(),'Update issues tab opens the close-out list, tab bar stays');
 await pd.click('#dtHk');await pd.waitForSelector('#vHk:not(.hidden)');await pd.click('#dtEq');await pd.waitForSelector('#vEq:not(.hidden)');
 await pd.click('#dtPat');await pd.waitForSelector('#vPatrol:not(.hidden)');
 await pd.click('#dtDash');await pd.waitForSelector('#vDan:not(.hidden)');
 await pd.click('.kpi[data-go="iss"]');await pd.waitForSelector('#vObsL:not(.hidden)');
 await pd.click('#dtDash');await pd.click('#lID');
 ok(/Dasbor/.test(await pd.locator('#dtDash').innerText())&&/ringkasan/i.test(await pd.locator('#danBody').innerText()),'Bahasa on tabs and dashboard');
 ok(await pd.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 ok(await pd.evaluate(()=>getComputedStyle(document.body).overscrollBehaviorY==='contain'),'pull-down refresh locked');
 // guards: no tab bar, straight to patrol
 let pg=await sess();
 await pg.fill('#gpin',G.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(600);
 ok(!(await pg.locator('#dTabs').isVisible()),'guard has no tab bar');
 ok(await pg.locator('#bHkA').isVisible(),'gate guard sees Cleaning actions');
 let po=await sess();
 await po.fill('#gpin',G2.pin);await po.click('#bGpin');await po.waitForSelector('#vPatrol:not(.hidden)');await po.waitForTimeout(600);
 ok(!(await po.locator('#bHkA').isVisible()),'other guard does not see Cleaning actions');
 ok(pd.errs.length+pg.errs.length+po.errs.length===0,'no page errors '+pd.errs.concat(pg.errs,po.errs).join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
