const {chromium}=require('playwright-core');const qrcode=require('qrcode-generator');
const m=require('./mock.js');const fs=require('fs');
m.ctx.makeDanruPins();
const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const rendi=dp['Rendi Irawan'];
const qr=qrcode(0,'H');qr.addData('https://iggifernandes.github.io/EcoOils-Project-UAUC-Report/?loc=1');qr.make();
const qrUrl='data:image/svg+xml;base64,'+Buffer.from(qr.createSvgTag({cellSize:8,margin:4})).toString('base64');
let fails=0;const ok=(c,msg)=>{console.log((c?'PASS ':'FAIL ')+msg);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},geolocation:{latitude:2.9,longitude:99.1,accuracy:10},permissions:['geolocation','camera']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
 await ctx.addInitScript(({qrUrl})=>{
   navigator.mediaDevices.getUserMedia=function(){const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');const im=new Image();im.onload=()=>{setInterval(()=>{x.fillStyle='#fff';x.fillRect(0,0,640,480);x.drawImage(im,120,40,400,400);},100)};im.src=qrUrl;return Promise.resolve(c.captureStream(10));};
 },{qrUrl});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 ok(await pg.locator('#ver').innerText()==='v1.10','version v1.8 top right');
 ok(await pg.locator('#gpin').isVisible(),'pin screen shown first');
 ok(!(await pg.locator('#guard').count()),'no name picker any more');
 // wrong pin
 await pg.fill('#gpin','111111');await pg.click('#bGpin');await pg.waitForTimeout(500);
 ok((await pg.locator('#setErr').innerText()).length>0&&await pg.locator('#vPatrol').isHidden(),'wrong pin shows error');
 // bahasa toggle
 await pg.click('#lID');ok((await pg.locator('#lGpin').innerText())==='PIN pribadi Anda','BI toggle on login');await pg.click('#lEN');
 // login as danru
 await pg.fill('#gpin',rendi);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 ok((await pg.locator('#who').innerText())==='Rendi Irawan','patrol shows guard name from pin');
 ok(await pg.locator('#bTeamOpen').isVisible(),'danru sees Team button');
 // scan via fake camera
 await pg.click('#bScan');await pg.waitForSelector('#resBody .big',{timeout:15000});
 await pg.waitForTimeout(500);
 const last=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
 ok(last&&last[4]==='Rendi Irawan'&&last[7]===1,'scan recorded for pin owner, point 1');
 ok((await pg.locator('#nDone').innerText())==='1','done counter 1 after scan');
 await pg.click('#resBody [data-act=close]');
 // persistence across reload
 await pg.reload();await pg.waitForSelector('#vPatrol:not(.hidden)');
 ok((await pg.locator('#who').innerText())==='Rendi Irawan','reload keeps login, no re-entry');
 // team tab
 await pg.click('#bTeamOpen');await pg.waitForSelector('#tmName');
 ok((await pg.locator('.mem').count())===25,'25 members listed');
 await pg.fill('#tmName','Budi Santoso');await pg.click('#tmAdd');await pg.waitForSelector('.pinbig');
 const budiPin=await pg.locator('.pinbig').innerText();ok(/^\d{6}$/.test(budiPin),'new pin shown: '+budiPin);
 await pg.click('#resBody [data-act=close]');await pg.waitForTimeout(400);
 ok((await pg.locator('.mem').count())===26,'member added to list');
 await pg.fill('#tmName','budi santoso');await pg.click('#tmAdd');await pg.waitForTimeout(500);
 ok((await pg.locator('#tmErr').innerText()).includes('already'),'duplicate blocked in UI');
 // reset pin through confirm
 await pg.locator('.mem',{hasText:'Budi Santoso'}).locator('[data-a=reset]').click();await pg.click('#resBody [data-act=yes]');await pg.waitForSelector('.pinbig');
 const budi2=await pg.locator('.pinbig').innerText();ok(budi2!==budiPin,'reset gives different pin');await pg.click('#resBody [data-act=close]');
 ok((await pg.locator('.mem',{hasText:'Jhonsen'}).locator('button').count())===0,'danru rows have no buttons for a danru');
 // search
 await pg.fill('#tmQ','budi');await pg.waitForTimeout(200);ok((await pg.locator('.mem').count())===1,'search filters');
 // BI inside team
 await pg.click('#lID');await pg.waitForTimeout(500);ok((await pg.locator('#tBack').innerText())==='Kembali','BI in team view');await pg.click('#lEN');await pg.waitForTimeout(300);
 await pg.click('#tBack');
 // logout, login as ordinary guard
 await pg.click('#bChange');await pg.waitForSelector('#gpin');
 await pg.fill('#gpin',budi2);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 ok((await pg.locator('#who').innerText())==='Budi Santoso','new guard logs in with danru-issued pin');
 ok(await pg.locator('#bTeamOpen').isHidden(),'ordinary guard has no Team button');
 // offline queue with pin
 await ctx.setOffline(true);
 // admin
 await ctx.setOffline(false);
 await pg.click('#bChange');await pg.waitForSelector('#gpin');
 await pg.click('#bAdmin');await pg.fill('#pin',m.props.ADMIN_PIN);await pg.click('#pinGo');await pg.waitForSelector('#vAdmin:not(.hidden)');
 await pg.click('#aTeam');await pg.waitForSelector('#tmName');
 ok((await pg.locator('.mem',{hasText:'Jhonsen'}).locator('[data-a=reset]').count())===1,'admin can reset a danru');
 ok((await pg.locator('.mem',{hasText:'Aldi Ramadhan'}).locator('[data-a=danru]').count())===1,'admin sees make-danru');
 await pg.click('#aOut');await pg.waitForSelector('#gpin');
 // deactivated guard kicked out on next state load
 m.call({action:'d_active',gp:rendi,name:'Budi Santoso',active:false});
 await pg.fill('#gpin',budi2);await pg.click('#bGpin');await pg.waitForTimeout(500);
 ok(await pg.locator('#vPatrol').isHidden(),'deactivated guard cannot log in');
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await pg.screenshot({path:'/tmp/shot-login.png'});
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e);process.exit(2)});
