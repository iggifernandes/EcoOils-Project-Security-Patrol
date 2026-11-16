const {chromium}=require('playwright-core');const qrcode=require('qrcode-generator');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Banner Guard'});
const mk=t=>{const q=qrcode(0,'M');q.addData(t);q.make();return 'data:image/svg+xml;base64,'+Buffer.from(q.createSvgTag({cellSize:8,margin:4,scalable:false})).toString('base64')};
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
let payload='';
(async()=>{
 const exe=process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>['/opt/pw-browsers/'+x+'/chrome-linux/chrome','/opt/pw-browsers/'+x+'/chrome-linux64/chrome']).flat().filter(p=>require('fs').existsSync(p))[0];
 const b=await chromium.launch({executablePath:exe,args:['--no-sandbox']});
 async function mkPage(){
  const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:2.9,longitude:99.1,accuracy:10},permissions:['geolocation','camera']});
  await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
  await ctx.exposeFunction('qrFor',()=>mk(payload));
  await ctx.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async function(){const url=await window.qrFor();const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');const im=new Image();im.onload=()=>{setInterval(()=>{x.fillStyle='#fff';x.fillRect(0,0,640,480);x.drawImage(im,120,40,400,400);},100)};im.src=url;return c.captureStream(10);};});
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.errs=errs;
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));return pg;
 }
 // supervisor
 const sp=await mkPage();
 await sp.fill('#gpin',dp['Rendi Irawan']);await sp.click('#bGpin');
 await sp.waitForSelector('#vDan:not(.hidden),#vPatrol:not(.hidden)');
 if(await sp.locator('#vDan:not(.hidden)').count()){await sp.waitForSelector('#dsMt');await sp.click('#dsMt');}else{await sp.click('#bMt');}
 await sp.waitForSelector('#mtType');
 ok(await sp.locator('#mtType option').count()>=12,'meeting types listed (12)');
 ok(/Regular Apel/.test(await sp.locator('#mtBody .note').last().innerText()),'Apel help text shown');
 await sp.selectOption('#mtType','training');await sp.fill('#mtTopic','Fire safety');await sp.fill('#mtTrainer','HSSE');
 ok(await sp.locator('#mtTrainer').isVisible(),'trainer field for training');
 await sp.selectOption('#mtAud','sel');await sp.click('#mtStartBtn');
 ok(/Tick at least one/.test(await sp.locator('#mtErr').innerText()),'selected audience needs at least one guard');
 await sp.locator('[data-gn="Banner Guard"]').check();
 await sp.click('#mtStartBtn');
 await sp.waitForSelector('#mtQr svg',{timeout:10000});
 ok(true,'meeting started and QR code drawn');
 ok(await sp.locator('#mtLive .cnt').count()===2,'live present / not yet present counters');
 const open=m.ctx.mtRows_().filter(x=>x.status==='Open')[0];payload='MTG:'+open.id+':'+open.token;
 // guard
 const gp=await mkPage();
 await gp.fill('#gpin',G.pin);await gp.click('#bGpin');await gp.waitForSelector('#vPatrol:not(.hidden)');
 await gp.waitForSelector('[data-mtp]',{timeout:10000});
 ok(/Fire safety/.test(await gp.locator('#mtBanner').innerText()),'guard sees the meeting banner');
 await gp.click('[data-mtp]');
 await gp.waitForFunction(()=>/Marked Present/.test(document.getElementById('mtBanner').innerText),null,{timeout:15000});
 ok(true,'guard scanned the QR and is marked Present');
 await gp.waitForFunction(()=>/You are marked Present/.test(document.getElementById('mtBanner').innerText),null,{timeout:10000});
 ok(m.ctx.mtAtt_(open.id).some(a=>a.name==='Banner Guard'&&a.how==='QR'),'attendance row saved');
 // end it
 await sp.waitForFunction(()=>document.querySelectorAll('#mtLive .pt').length>=1,null,{timeout:15000});
 ok(true,'supervisor screen updates with the new Present guard');
 await sp.click('#mtEndBtn');
 ok(/Write what was discussed first/.test(await sp.locator('#mtErr').innerText()),'cannot end without the summary');
 await sp.fill('#mtText','Fire extinguisher use was explained and practised.');
 await sp.click('#mtEndBtn');
 await sp.waitForFunction(()=>/Meeting ended/.test(document.getElementById('mtBody').innerText),null,{timeout:15000});
 ok(/English and Bahasa Indonesia/.test(await sp.locator('#mtBody').innerText()),'end message mentions both languages');
 const mail=m.ctx.mails[m.ctx.mails.length-1];ok(/Fire extinguisher/.test(mail.htmlBody)&&/Banner Guard/.test(mail.htmlBody),'email sent with summary and attendance');
 await sp.click('#mtRecBtn');await sp.waitForSelector('[data-mid]');
 await sp.click('[data-mid]');await sp.waitForFunction(()=>/Bahasa Indonesia/.test(document.getElementById('mtBody').innerText),null,{timeout:10000});
 ok(/\[ID\] Fire/.test(await sp.locator('#mtBody').innerText()),'record opens read-only with the Indonesian summary');
 // Indonesian UI
 await sp.click('#lID');
 ok(/Catatan|Pelatihan/.test(await sp.locator('#mtBody').innerText()),'screen switches to Bahasa Indonesia');
 await gp.waitForTimeout(500);
 
 ok(sp.errs.length===0&&gp.errs.length===0,'no page errors '+sp.errs.concat(gp.errs).join('|'));
 await b.close();
 console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2)});
