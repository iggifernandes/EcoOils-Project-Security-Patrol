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
 // upload keeps failing (no signal): dialog explains, selfie is kept on the phone
 failPhoto=99;which=2;await pg.click('#bScan');await pg.waitForSelector('#phIn',{state:'attached',timeout:15000});
 await pg.setInputFiles('#phIn',{name:'p.png',mimeType:'image/png',buffer:pngBuf});
 await pg.waitForSelector('#phRe',{timeout:70000});
 const tx=await pg.locator('#resBody').innerText();
 ok(tx.includes('No signal, or the signal is too slow')&&tx.includes('keeps retrying by itself'),'dialog gives the reason and says it keeps retrying');
 ok(await pg.evaluate(()=>JSON.parse(localStorage.getItem('sp_pq')||'[]').length)===1,'selfie saved on the phone (sp_pq)');
 // signal returns: the background retry delivers it, Retry then reports success too
 failPhoto=0;await pg.evaluate(()=>window.dispatchEvent(new Event('online')));await pg.waitForFunction(()=>JSON.parse(localStorage.getItem('sp_pq')||'[]').length===0,null,{timeout:40000});
 let rows=m.sheets.Scans.rows;let row=rows[rows.length-1];
 ok(row[7]===2&&row[16].startsWith('https://drive')&&!/NO_PHOTO/.test(row[15]),'background retry stored the selfie on the scan row');
 await pg.click('#phRe');await pg.waitForSelector('#resBody .big',{timeout:10000});
 ok((await pg.locator('#resBody').innerText()).includes('Selfie sent'),'Retry after the background send still ends as Selfie sent (has_photo)');
 await pg.click('#resBody [data-act=close]');
 // skip removes the saved selfie
 failPhoto=99;which=3;await pg.click('#bScan');await pg.waitForSelector('#phIn',{state:'attached',timeout:15000});
 await pg.setInputFiles('#phIn',{name:'p.png',mimeType:'image/png',buffer:pngBuf});
 await pg.waitForSelector('#phNo',{timeout:70000});await pg.click('#phNo');await pg.waitForSelector('#resBody .big');
 ok(await pg.evaluate(()=>JSON.parse(localStorage.getItem('sp_pq')||'[]').length)===0,'Skip drops the saved selfie');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
