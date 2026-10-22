const {chromium}=require('playwright-core');
const m=require('./mock.js');
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const rows=m.sheets.Points.rows;
[[1,3.1310,99.3480],[2,3.1305,99.3475]].forEach(([no,la,ln])=>{const r=rows.find((x,i)=>i>0&&Number(x[1])===no);r[8]=la;r[9]=ln;r[10]='2026-10-22';});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:360,height:800}});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const url='file://'+require('path').join(__dirname,'..','index.html');
 await pg.goto(url);
 const bg=()=>pg.evaluate(()=>getComputedStyle(document.body).backgroundColor);
 ok(await bg()==='rgb(255, 255, 255)','starts light');
 ok(/Dark mode/.test(await pg.locator('#bTheme').innerText()),'button offers Dark mode');
 ok(await pg.evaluate(()=>{const i=document.querySelector('#logo');return i&&i.complete&&i.naturalWidth>100&&i.getBoundingClientRect().height>=30&&/^data:image\/png/.test(i.src);}),'logo shown in the header (embedded PNG)');
 await pg.click('#bTheme');
 ok(await bg()==='rgb(26, 23, 24)','dark background after tap');
 ok(/Light mode/.test(await pg.locator('#bTheme').innerText()),'button now offers Light mode');
 ok(await pg.evaluate(()=>getComputedStyle(document.querySelector('header')).backgroundColor)==='rgb(35, 31, 32)','header dark');
 ok(await pg.evaluate(()=>document.querySelector('meta[name=theme-color]').content)==='#231f20','theme-color meta dark');
 await pg.reload();ok(await bg()==='rgb(26, 23, 24)','dark persists after reload');
 await pg.click('#lID');ok(/Mode terang/.test(await pg.locator('#bTheme').innerText()),'Bahasa label: Mode terang');await pg.click('#lEN');
 // version above language toggle still
 ok(await pg.evaluate(()=>{const v=document.querySelector('#ver').getBoundingClientRect(),l=document.querySelector('.lang').getBoundingClientRect();return v.bottom<=l.top+1;}),'version still above the language toggle');
 // map in dark
 await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.click('#aLive');await pg.waitForSelector('#lmSvg');
 ok(await pg.evaluate(()=>getComputedStyle(document.querySelector('#lmSvg polygon')).fill)==='rgb(46, 42, 43)','map outline uses the dark panel colour');
 ok(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow in dark');
 await pg.click('#bTheme');ok(await bg()==='rgb(255, 255, 255)','back to light');
 await pg.reload();ok(await bg()==='rgb(255, 255, 255)','light persists');
 ok(errs.length===0,'no page errors '+errs.join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
