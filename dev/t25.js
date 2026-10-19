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
 const Dn=dp['Rendi Irawan'];
 ['Aa One','Bb Two','Cc Three'].forEach(n=>m.call({action:'d_add',gp:Dn,name:n}));
 let k=0;const add=(g,date,fl)=>m.sheets.Scans.rows.push(['s'+(k++),date+' 10:00:00',date,'10:00-12:00',g,'Security Guard','p1',1,'Gate','GT','','','','','OK',fl||'','',Date.parse(date+'T03:00:00Z')+k]);
 const pm=new Date(Date.now()+7*3600000);const mon=pm.toISOString().slice(0,7);
 for(let i=0;i<6;i++){add('Aa One',mon+'-0'+(1+i%3));add('Bb Two',mon+'-0'+(1+i%3));}
 add('Cc Three',mon+'-05');
 await pg.fill('#gpin',Dn);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(400);
 ok((await pg.locator('#awardCard').innerText())==='','no award card before announcement');
 await pg.click('#bChange');
 await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.click('#aAward');await pg.waitForSelector('#awM');
 let tx=await pg.locator('#aBody').innerText();
 ok(tx.includes('Aa One')&&tx.includes('Bb Two')&&tx.includes('Cc Three')&&/3 of 3 guards qualify/.test(tx),'award tab lists guards, all qualify with no criteria: '+tx.slice(0,30).replace(/\n/g,' '));
 ok(!tx.includes('Rendi Irawan'),'Danru not listed');
 await pg.fill('#awS','3');await pg.click('#awSave');await pg.waitForFunction(()=>/2 of 3 guards qualify/.test(document.querySelector('#aBody').innerText),null,{timeout:8000});
 ok(m.ctx.awardCrit_().minScans===3,'criteria saved to Config');
 ok(await pg.locator('#awAnn').count()===0,'no Announce before a draw');
 await pg.click('#awDraw');await pg.waitForSelector('#awAnn');
 const drawn=(await pg.locator('#aBody').innerText()).match(/Drawn: (.+)/)[1].trim();
 ok(['Aa One','Bb Two'].includes(drawn),'winner drawn from qualifiers only: '+drawn);
 pg.once('dialog',d=>d.accept());
 await pg.click('#awAnn');await pg.waitForFunction(()=>/Announced:/.test(document.querySelector('#aBody').innerText),null,{timeout:8000});
 ok(await pg.locator('#awDraw').count()===0,'no redraw button after announcing');
 await pg.click('#aLive').catch(()=>{});
 // guard (not admin) sees the card, EN and BI
 await pg.click('#aOut');
 await pg.waitForSelector('#gpin,#vPatrol:not(.hidden)');
 if(await pg.locator('#gpin').count()&&await pg.locator('#gpin').isVisible()){await pg.fill('#gpin',Dn);await pg.click('#bGpin');}
 await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForFunction(()=>document.querySelector('#awardCard').innerText.length>0,null,{timeout:8000});
 const card=await pg.locator('#awardCard').innerText();
 ok(card.includes(drawn)&&card.includes('Best Guard'),'guard sees winner card: '+card.replace(/\n/g,' | '));
 await pg.click('#lID');
 ok((await pg.locator('#awardCard').innerText()).includes('Petugas Terbaik'),'card in Bahasa Indonesia');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
