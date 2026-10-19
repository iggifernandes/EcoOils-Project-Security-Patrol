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
 let sent=null;pg.on('request',r=>{try{const b=JSON.parse(r.postData()||'{}');if(b.photo&&b.photo.length>100)sent=b.photo;}catch(e){}});
 await pg.fill('#gpin',dp['Rendi Irawan']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 which=2;await pg.click('#bScan');await pg.waitForSelector('#phIn',{state:'attached',timeout:15000});
 const big=new PNG({width:640,height:480});for(let y=0;y<480;y++)for(let x=0;x<640;x++){const i=(y*640+x)*4;big.data[i]=40+(x%90);big.data[i+1]=90+(y%80);big.data[i+2]=60;big.data[i+3]=255}
 const bigBuf=PNG.sync.write(big);
 await pg.setInputFiles('#phIn',{name:'p.png',mimeType:'image/png',buffer:bigBuf});
 await pg.waitForSelector('#resBody .big',{timeout:10000});
 ok(!!sent,'a photo was uploaded');
 require('fs').writeFileSync(process.env.OUT||'/tmp/stamped.jpg',Buffer.from(sent,'base64'));
 const stats=await pg.evaluate(async b64=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/jpeg;base64,'+b64});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  const bar=x.getImageData(0,im.height-40,im.width,40).data;let white=0;for(let i=0;i<bar.length;i+=4)if(bar[i]>235&&bar[i+1]>235&&bar[i+2]>235)white++;
  const top=x.getImageData(0,0,im.width,20).data;let tw=0;for(let i=0;i<top.length;i+=4)if(top[i]>235&&top[i+1]>235&&top[i+2]>235)tw++;
  return {w:im.width,h:im.height,white,tw,len:b64.length};},sent);
 ok(stats.white>60,'stamp text pixels present at the bottom ('+stats.white+')');
 ok(stats.tw===0,'no stamp pixels at the top');
 ok(Math.max(stats.w,stats.h)<=640&&stats.len<90000,'still low resolution and small ('+stats.w+'x'+stats.h+', '+Math.round(stats.len*0.75/1000)+' KB)');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
