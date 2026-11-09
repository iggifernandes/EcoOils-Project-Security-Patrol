const {chromium}=require('playwright-core');const qrcode=require('qrcode-generator');const {PNG}=require('pngjs');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
m.call({action:'a_config',pin:m.props.ADMIN_PIN,photoN:45});
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
 await pg.fill('#gpin',dp['Rendi Irawan']);await pg.click('#bGpin');await waitPat(pg);
 // DTP (13): safety reminder about the 2nd floor
 which=13;await pg.click('#bScan');await pg.waitForSelector('#phSkip',{timeout:15000});await pg.click('#phSkip');await pg.waitForSelector('#ptNote',{timeout:10000});
 let t=await pg.locator('#ptNote').innerText();
 ok(t==='The next point is DTP 2nd Floor. Do you have your Full Body Harness?','EN reminder after DTP: '+t);
 await pg.click('#resBody [data-act=close]');
 // another point: no reminder
 which=2;await pg.click('#bScan');await pg.waitForSelector('#phSkip, #resBody .big',{timeout:15000});if(await pg.locator('#phSkip').count())await pg.click('#phSkip');await pg.waitForSelector('#resBody .big',{timeout:10000});
 ok(await pg.locator('#ptNote').count()===0,'no reminder at other points');
 // point 47 itself: selfie compulsory (always asked)
 await pg.click('#resBody [data-act=close]');
 which=47;await pg.click('#bScan');
 const asked=await pg.waitForSelector('#phIn',{state:'attached',timeout:15000}).then(()=>true,()=>false);
 ok(asked,'selfie asked at point 47 (2nd floor)');
 ok(/ID/.test(await pg.evaluate(()=>document.documentElement.innerHTML.match(/dtpNote:'Titik berikutnya adalah DTP Lantai 2\. Apakah Anda membawa Full Body Harness\?'/)?'ID':'')),'Bahasa text present');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
