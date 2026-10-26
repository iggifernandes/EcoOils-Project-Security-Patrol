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
 const Dn=dp['Rendi Irawan'];m.call({action:'d_add',gp:Dn,name:'St Guard'});
 const dayS=m.ctx.roundAt_(Date.now()).date; /* the date of the round the mock clock is in (the mock moves its clock into a round when the real time is between rounds) */
 const sc=m.call({action:'state',gp:Dn});const p1=sc.points[0],p2=sc.points[1];
 const cur=m.ctx.roundAt_(Date.now());
 const add=(pt,fl)=>m.sheets.Scans.rows.push(['x'+Math.random(),dayS+' 08:00:00',dayS,cur.label,'St Guard','Security Guard',pt.id,pt.no,pt.name,pt.zone,'','','','','NO_GPS',fl,'',Date.now()]);
 add(p1,'NO_GPS');add(p1,'REPEAT');add(p2,'');
 // backend
 let r=m.call({action:'a_stats',pin:m.props.ADMIN_PIN,from:dayS,to:dayS});
 const A1=r.points.find(x=>x.no===p1.no),N=r.points.find(x=>x.scans===0);
 ok(r.ok&&r.rounds>=1&&A1.scans===2&&A1.covered===1&&A1.noGps===1&&A1.issues===1,'stats count per point (REPEAT not an issue, NO_GPS is)');
 ok(N&&N.pct===0&&N.last==='','never-scanned point at 0%');
 ok(r.points[0].pct<=r.points[r.points.length-1].pct,'sorted lowest coverage first');
 ok(r.guards.length===1&&r.guards[0].scans===3,'guard totals');
 ok(m.call({action:'a_stats',pin:Dn,from:dayS,to:dayS}).err==='pin','Danru PIN cannot see stats');
 ok(m.call({action:'a_stats',pin:m.props.ADMIN_PIN,from:dayS,to:'x'}).err==='bad_date','bad date refused');
 // UI: Stats is the first screen after admin login
 await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.waitForFunction(()=>/Coverage/.test(document.querySelector('#aBody').innerText),null,{timeout:8000});
 const tx=await pg.locator('#aBody').innerText();
 ok(/Coverage/.test(tx)&&tx.includes('St Guard')&&/not calibrated/.test(tx)&&/no GPS x1/.test(tx),'admin login opens on Stats with coverage, guards and honest GPS info');
 ok(await pg.locator('#aStats.on').count()===1,'Stats tab is highlighted');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
