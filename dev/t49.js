const {chromium}=require('playwright-core');const qrcode=require('qrcode-generator');
const m=require('./mock.js');
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const qr=qrcode(0,'H');qr.addData('https://iggifernandes.github.io/EcoOils-Project-UAUC-Report/?loc=1');qr.make();
const qrUrl='data:image/svg+xml;base64,'+Buffer.from(qr.createSvgTag({cellSize:8,margin:4})).toString('base64');
const g=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Off Guard'});
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:2.9,longitude:99.1,accuracy:10},permissions:['geolocation','camera']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();if(global.BLOCK&&/"action":"scan"/.test(body))return r.abort();await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:m.ctx.doPost({postData:{contents:body}}).s});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:')||u.startsWith('blob:'))return r.fallback();r.abort();});
 await ctx.addInitScript(({qrUrl})=>{navigator.mediaDevices.getUserMedia=function(){const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');const im=new Image();im.onload=()=>{setInterval(()=>{x.fillStyle='#fff';x.fillRect(0,0,640,480);x.drawImage(im,120,40,400,400);},100)};im.src=qrUrl;return Promise.resolve(c.captureStream(10));};},{qrUrl});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('dialog',d=>d.accept());
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 await pg.fill('#gpin',g.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(600);
 const st=await pg.evaluate(()=>JSON.parse(localStorage.getItem('sp_state')));
 const p0=st.points[0];global.BLOCK=true;
 // offline scan: the phone must ask for a selfie even though it cannot know
 await pg.click('#bScan');
 await pg.waitForSelector('#phSkip',{timeout:15000});
 ok(true,'offline scan asks for a selfie');
 const jpg='/9j/'+'A'.repeat(400);
 await pg.evaluate(j=>{document.getElementById('phSkip').click();},jpg);
 await pg.waitForTimeout(500);
 let q=await pg.evaluate(()=>JSON.parse(localStorage.getItem('sp_q')||'[]'));
 ok(q.length===1&&q[0].photo==='','skipped selfie is queued without a photo');
 // server: a photo sent with a queued scan is kept ONLY where a selfie was due
 const pts=m.ctx.points_(false);let withP=0,without=0;
 const jpg2='/9j/'+'A'.repeat(400);
 const rr=m.ctx.roundAt_(Date.now());
 pts.forEach(p=>{if(!p.active)return;const cts=Date.now()-1000*(withP+without+5);
  const r=m.call({action:'scan',gp:g.pin,pid:p.id,lat:2.9,lng:99.1,acc:10,queued:true,clientTs:cts,photo:jpg2});
  const row=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
  if(r.dup)return;
  if(/NO_PHOTO/.test(row[15])){without++;ok(false,'queued scan with photo still NO_PHOTO at '+p.no);}
  else if(row[16]){withP++;} });
 ok(withP>0,'selfie sent with queued scan is saved at selfie points: '+withP);
 const kept=m.sheets.Scans.rows.filter(r=>r[16]&&r[0]!=='ScanId'&&r[4]!=='Guard').length;if(kept!==withP)console.log(m.sheets.Scans.rows.filter(r=>r[16]).map(r=>r[4]+' '+r[7]+' '+r[15]).join('\n'));
 ok(kept===withP,'photos kept only at selfie points ('+kept+' kept)');
 ok(errs.length===0,'no page errors '+errs.join('|'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})();
