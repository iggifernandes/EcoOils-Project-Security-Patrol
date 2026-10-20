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
 ok(await pg.locator('#ver').innerText()==='v1.16','version v1.8');
 await pg.fill('#gpin',dp['Rendi Irawan']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 // scan point 2: photo wanted (all points) -> take photo
 which=2;await pg.click('#bScan');await pg.waitForSelector('#phIn',{state:'attached',timeout:15000});
 ok((await pg.locator('#resBody').innerText()).includes('selfie'),'selfie prompt appears only after the scan is accepted');
 ok(await pg.locator('#phIn').getAttribute('capture')==='user','selfie opens the front camera (capture=user)');
 await pg.setInputFiles('#phIn',{name:'p.png',mimeType:'image/png',buffer:pngBuf});
 await pg.waitForSelector('#resBody .big',{timeout:10000});
 let rows=m.sheets.Scans.rows;let row=rows[rows.length-1];
 ok(row[7]===2&&row[16].startsWith('https://drive')&&!/NO_PHOTO/.test(row[15]),'photo saved on the scan row, no NO_PHOTO flag');
 ok((await pg.locator('#resBody').innerText()).includes('Selfie sent'),'guard sees Selfie sent');
 await pg.click('#resBody [data-act=close]');
 // scan point 3, skip photo
 which=3;await pg.click('#bScan');await pg.waitForSelector('#phSkip',{timeout:15000});await pg.click('#phSkip');await pg.waitForSelector('#resBody .big');
 row=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
 ok(row[7]===3&&/NO_PHOTO/.test(row[15])&&!row[16],'skipped photo stays flagged NO_PHOTO');
 ok((await pg.locator('#resBody').innerText()).includes('flagged'),'guard told it is flagged');
 await pg.click('#resBody [data-act=close]');
 // scan point 4, first upload fails, retry works
 failPhoto=1;which=4;await pg.click('#bScan');await pg.waitForSelector('#phIn',{state:'attached',timeout:15000});
 await pg.setInputFiles('#phIn',{name:'p.png',mimeType:'image/png',buffer:pngBuf});
 await pg.waitForSelector('#phRe',{timeout:10000});await pg.click('#phRe');await pg.waitForSelector('#resBody .big',{timeout:10000});
 row=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
 ok(row[7]===4&&row[16].startsWith('https://drive')&&!/NO_PHOTO/.test(row[15]),'retry after failed upload succeeds');
 await pg.click('#resBody [data-act=close]');
 // photos off -> no prompt
 m.call({action:'a_config',pin:m.props.ADMIN_PIN,photoN:0});
 which=5;await pg.click('#bScan');await pg.waitForSelector('#resBody .big',{timeout:15000});
 ok(await pg.locator('#phIn').count()===0,'no photo prompt when set to 0');
 // admin settings UI
 await pg.click('#resBody [data-act=close]');await pg.click('#bChange');await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.click('#aSet');await pg.waitForSelector('#sP');await pg.waitForTimeout(500);
 ok(await pg.inputValue('#sP')==='0','settings shows current value 0');
 await pg.fill('#sP','5');await pg.click('#sPs');await pg.waitForTimeout(500);
 ok(m.ctx.photoN_()===5,'settings saves 5');
 await pg.click('#aLive');await pg.waitForTimeout(600);
 ok((await pg.locator('#aBody').innerText()).length>0&&(await pg.locator('#aBody .pt').count())>0,'live view renders with camera markers');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
