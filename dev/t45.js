const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'];const g=m.call({action:'d_add',gp:D,name:'Map Guard'});
const rows=m.sheets.Points.rows;
[[1,3.1310,99.3480],[2,3.1305,99.3475],[13,3.1300,99.3485]].forEach(([no,la,ln])=>{const r=rows.find((x,i)=>i>0&&Number(x[1])===no);r[8]=la;r[9]=ln;r[10]='2026-10-22';});
const st=m.call({action:'state',gp:g.pin});
const p1=st.points.find(p=>p.no===1),p5=st.points.find(p=>p.no===5);
ok(typeof p1.x==='number'&&typeof p1.y==='number'&&p1.x>0&&p1.x<1000,'state gives map x,y for a calibrated point: '+p1.x+','+p1.y);
ok(p5.x===null&&p5.y===null,'uncalibrated point has null x,y');
ok(!('lat' in p1)&&!('lng' in p1)&&!JSON.stringify(st).includes('3.1310'),'no raw coordinates sent to phones');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(pin){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
  await pg.fill('#gpin',pin);await pg.click('#bGpin');await waitPat(pg);await pg.waitForTimeout(800);return pg;
 }
 let pg=await sess(g.pin);
 await pg.click('#tMap');await pg.waitForSelector('#lmSvg');
 ok(await pg.locator('#lmSvg .lmp').count()===3,'guard sees 3 calibrated points on the map');
 ok(await pg.locator('#lmSvg image').count()===0,'guard map has no plot plan image');
 await pg.locator('#lmSvg .lmp').first().click();
 ok(/not scanned yet/.test(await pg.locator('#lmInfo').innerText()),'tap info (EN): '+(await pg.locator('#lmInfo').innerText()));
 ok(!/Not on the map/.test(await pg.locator('#list').innerText()),'guard is not shown the uncalibrated list');
 await pg.click('#lID');await pg.waitForTimeout(300);
 ok(/Peta/.test(await pg.locator('#tMap').innerText())&&/Perbesar/.test(await pg.locator('#list').innerText()),'Bahasa: tab Peta, button Perbesar');
 await pg.click('#lEN');
 await pg.click('#tRem');ok(await pg.locator('#lmSvg').count()===0,'back to Remaining list');
 ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow');
 ok(pg.errs.length===0,'no page errors '+pg.errs.join('|'));
 // names hidden: guard blocked, danru allowed
 m.call({action:'a_config',pin:m.props.ADMIN_PIN,showNames:false});
 pg=await sess(g.pin);await pg.click('#tMap');await pg.waitForTimeout(300);
 ok(await pg.locator('#lmSvg').count()===0&&/hidden/i.test(await pg.locator('#list').innerText()),'names hidden: guard gets no map');
 const pd=await sess(D);await pd.click('#tMap');await pd.waitForSelector('#lmSvg');
 ok(await pd.locator('#lmSvg .lmp').count()===3,'Danru still sees the map');
 ok(await pd.locator('#lmSvg image').count()===0,'Danru map has no plot plan image');
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
