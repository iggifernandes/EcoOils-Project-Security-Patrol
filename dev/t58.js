const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'],ADM=m.props.ADMIN_PIN;
const G=m.call({action:'d_add',gp:D,name:'Tidy Guard'});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async q=>{const body=q.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await q.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',q=>{const u=q.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return q.fallback();q.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));pg.on('dialog',d=>{pg.dlg=d.message();d.accept();});
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));return pg;
 }
 const login=async(pg,pin)=>{await pg.fill('#gpin',pin);await pg.click('#bGpin');await waitPat(pg);await pg.waitForTimeout(700);};
 // supervisor
 let pd=await sess();await login(pd,D);
 ok(await pd.locator('#bHk').isVisible()&&await pd.locator('#bEq').isVisible()&&!(await pd.locator('#bHkA').isVisible()),'supervisor sees Building check + Equipment, not Cleaning actions');
 await pd.click('#bHk');await pd.waitForSelector('[data-hk="ok"]');
 ok(await pd.locator('[data-hk="ok"]').count()===12,'12 check lines');
 await pd.click('#hkSave');
 ok(/Answer every line/i.test(await pd.locator('#hkErr').innerText()),'save with unanswered lines refused');
 const n=await pd.locator('[data-hk="ok"]').count();
 for(let i=0;i<n;i++)await pd.locator('[data-hk="ok"]').nth(i).click();
 await pd.locator('[data-hk="no"]').nth(1).click();await pd.locator('[data-hk="no"]').nth(4).click();
 await pd.click('#hkSave');
 ok(/Write what is wrong/i.test(await pd.locator('#hkErr').innerText()),'Not OK without note refused on the phone');
 await pd.fill('[data-hkn="1"]','Desks dusty and cups left');await pd.fill('[data-hkn="4"]','Bin full and smelly');
 ok(await pd.locator('[data-hk="no"].on').count()===2,'two lines stay marked Not OK after typing');
 await pd.click('#hkSave');await pd.waitForFunction(()=>/Check saved/.test(document.getElementById('hkBody').innerText),null,{timeout:5000});
 ok(m.sheets.HKActions.rows.length===3,'2 actions created ('+m.sheets.HKActions.rows.length+' rows incl. header)');
 // guard
 let pg=await sess();await login(pg,G.pin);
 ok(await pg.locator('#bHkA').isVisible()&&/Cleaning actions \(2\)/.test(await pg.locator('#bHkA').innerText()),'guard button shows 2 open');
 ok(!(await pg.locator('#bHk').isVisible())&&!(await pg.locator('#bEq').isVisible()),'guard does not see inspection buttons');
 await pg.click('#bHkA');await pg.waitForSelector('[data-hd]');
 await pg.locator('[data-hd]').first().click();
 ok(/Describe what you did/i.test(await pg.locator('#hkaErr').innerText()),'done without description refused');
 await pg.fill('[data-hn]','Cleaned desks and removed cups');await pg.locator('[data-hd]').first().click();
 await pg.waitForFunction(()=>document.querySelectorAll('[data-hd]').length===1,null,{timeout:5000});
 ok(/Waiting for the supervisor/i.test(await pg.locator('#hkaBody').innerText()),'finished action waits for verification');
 await pg.click('#lID');ok(/tindakan kebersihan/i.test(await pg.locator('#hkaBody').innerText()),'Bahasa on the guard screen');
 // supervisor verifies
 await pd.click('#dtHk');await pd.waitForSelector('#hkTA');await pd.click('#hkTA');await pd.waitForSelector('[data-vf]');
 await pd.click('[data-vf]');await pd.waitForFunction(()=>!document.querySelector('[data-vf]'),null,{timeout:5000});
 ok(m.sheets.HKActions.rows.some(r=>r[7]==='Verified'),'verified');
 // equipment
 await pd.click('#dtEq');await pd.waitForSelector('[data-eqf="0"]');
 ok(await pd.locator('[data-eqf]').count()===10,'10 equipment lines');
 await pd.fill('[data-eqf="3"]','0');
 await pd.click('#eqSave');
 ok(/Fill the number found/i.test(await pd.locator('#eqErr').innerText()),'empty count lines refused');
 for(const i of [0,1,2,8,9])await pd.fill('[data-eqf="'+i+'"]','4');
 await pd.click('#eqSave');
 ok(/note on every line/i.test(await pd.locator('#eqErr').innerText()),'short count without note refused');
 await pd.fill('[data-eqn="3"]','First aid kit sent for refill');
 await pd.click('#eqSave');await pd.waitForFunction(()=>/Equipment check saved/.test(document.getElementById('eqBody').innerText),null,{timeout:5000});
 ok(m.sheets.Equip.rows.length===11,'10 equipment rows saved');
 ok(await pd.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 // admin
 let pa=await sess();
 await pa.click('#bAdmin');await pa.fill('#pin',ADM);await pa.click('#pinGo');await pa.waitForSelector('#vAdmin:not(.hidden)');await pa.click('#aChk');
 await pa.waitForFunction(()=>/Open cleaning actions/.test(document.getElementById('aBody').innerText),null,{timeout:5000});
 const t=await pa.locator('#aBody').innerText();
 ok(/Recent building checks/.test(t)&&/Equipment: problems/.test(t)&&/First aid/i.test(t),'Admin Checks tab shows checks and the equipment problem');
 // guard view hides buttons
 ok(pd.errs.length===0&&pg.errs.length===0&&pa.errs.length===0,'no page errors '+pd.errs.concat(pg.errs,pa.errs).join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
