const {chromium}=require('playwright-core');const qrcode=require('qrcode-generator');const {PNG}=require('pngjs');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});

const png=new PNG({width:80,height:60});for(let i=0;i<png.data.length;i+=4){png.data[i]=200;png.data[i+1]=(i/4)%255;png.data[i+2]=90;png.data[i+3]=255}
const pngBuf=PNG.sync.write(png);
const mk=n=>{const q=qrcode(0,'H');q.addData('https://iggifernandes.github.io/EcoOils-Project-UAUC-Report/?loc='+n);q.make();return 'data:image/svg+xml;base64,'+Buffer.from(q.createSvgTag({cellSize:8,margin:4})).toString('base64')};
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:2.9,longitude:99.1,accuracy:10},permissions:['geolocation','camera']});
 let failPhoto=0;
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();if(failPhoto>0&&JSON.parse(body).action==='photo'){failPhoto--;return r.abort();}await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:m.ctx.doPost({postData:{contents:body}}).s});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
 let which=2;
 await ctx.exposeFunction('qrFor',()=>mk(which));
 await ctx.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async function(){const url=await window.qrFor();const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');const im=new Image();im.onload=()=>{setInterval(()=>{x.fillStyle='#fff';x.fillRect(0,0,640,480);x.drawImage(im,120,40,400,400);},100)};im.src=url;return c.captureStream(10);};});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 const now=m.ctx.shiftAt_(Date.now());
 const Dn=dp['Rendi Irawan'];
 const g=m.call({action:'d_add',gp:Dn,name:'Ui Guard One'});const g2=m.call({action:'d_add',gp:Dn,name:'Ui Guard Two'});
 ['P','S','M'].forEach(c=>m.call({action:'d_plan_set',gp:Dn,date:now.date,shift:c,rows:[{duty:'Gate 1',guard:'Ui Guard One',buddy:c==='M'?'Ui Guard Two':''}]}));
 // Danru: Team badge shows Shift Supervisor for Rendi, Danru for Irsan
 await pg.fill('#gpin',Dn);await pg.click('#bGpin');await waitPat(pg);await pg.waitForTimeout(400);
 const card=await pg.locator('#planCard').innerText();
 ok(card.includes('Morning')&&card.includes('Afternoon')&&card.includes('Night')&&card.includes('now'),'patrol screen shows all three shifts, current marked: '+card.replace(/\n/g,' | '));
 await pg.click('#bTeamOpen');await pg.waitForSelector('.mem');
 const tm=await pg.locator('#teamBody').innerText();
 ok(/Rendi Irawan[\s\S]{0,40}Shift Supervisor/.test(tm),'Rendi shown as Shift Supervisor');
 ok(/Muhammad Irsan[\s\S]{0,30}Danru/.test(tm),'Irsan shown as Danru');
 await pg.click('#tBack');await pg.click('#dtPat');
 // Danru plan screen has the overview
 await pg.click('#bPlanOpen');await pg.waitForSelector('#plDate');
 const pt=await pg.locator('#planBody').innerText();
 ok(pt.includes('All shifts')&&pt.includes('Ui Guard One')&&pt.includes('Ui Guard Two'),'plan screen shows the all-shifts overview with the buddy');
 await pg.click('#pBack');await pg.click('#dtPat');await pg.click('#bChange');
 // Admin has a Plan tab
 await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.click('#aPlan');await pg.waitForSelector('#plDate',{timeout:8000});
 ok((await pg.locator('#aBody').innerText()).includes('Ui Guard One'),'admin Plan tab shows the plan');
 await pg.locator('select[data-f=guard]').nth(1).selectOption('Ui Guard Two').catch(()=>{});
 await pg.click('[data-a=sh][data-v=P]');await pg.waitForTimeout(400);
 await pg.click('[data-a=save]');await pg.waitForFunction(()=>/saved|buddy/i.test((document.querySelector('#plMsg')||{}).textContent||''),null,{timeout:8000});
 ok(m.sheets.Roster.rows.some(r=>r[5]==='Admin'),'admin save recorded as set by Admin');
 await pg.click('#aTeam');await pg.waitForSelector('.mem');
 ok((await pg.locator('#aBody').innerText()).includes('Shift Supervisor'),'admin Team tab shows Shift Supervisor');
 // switching tabs must not leave plan handlers acting on team clicks
 ok(await pg.locator('#plDate').count()===0,'plan screen gone after switching tab');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
