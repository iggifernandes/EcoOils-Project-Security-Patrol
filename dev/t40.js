const {chromium}=require('playwright-core');
const m=require('./mock.js');const {PNG}=require('pngjs');
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Crew One'});
// backend gating
ok(m.call({action:'d_ts_get',gp:dp['Rendi Irawan']}).err==='ts_off','Danru refused while TS_DANRU is off');
ok(m.call({action:'a_ts_danru',pin:m.props.ADMIN_PIN,on:true}).danruOn===true,'Admin switches Danru access on');
const g=m.call({action:'d_ts_get',gp:dp['Rendi Irawan']});ok(g.ok&&g.guards.includes('Crew One')&&g.danruOn===true,'Danru can list the crew');
const gg=m.call({action:'d_ts_get',gp:dp['Rendi Irawan'],guard:'Crew One',ym:'2026-10'});ok(gg.ok&&gg.days.length>=30,'Danru gets the period days');
ok(m.call({action:'d_ts_save',gp:dp['Rendi Irawan'],guard:'Crew One',npk:'N1',rows:[{date:'2026-10-16',start:'07:00',end:'15:00',note:''}]}).saved===1,'Danru saves');
ok(m.sheets.Timesheet.rows.some(x=>x[2]==='Crew One'&&x[7]==='Rendi Irawan'),'Set by = the Danru who saved');
ok(m.call({action:'d_ts_get',gp:'000000'}).ok===false,'wrong PIN refused');
ok(m.call({action:'state',gp:dp['Rendi Irawan']}).tsOn===true,'state tells the phone the timesheet is on');
m.call({action:'a_ts_danru',pin:m.props.ADMIN_PIN,on:false});ok(m.call({action:'d_ts_get',gp:dp['Rendi Irawan']}).err==='ts_off','switch off again works');
m.call({action:'a_ts_danru',pin:m.props.ADMIN_PIN,on:true});
const png=new PNG({width:200,height:80});for(let i=0;i<png.data.length;i+=4){png.data[i]=png.data[i+1]=png.data[i+2]=255;png.data[i+3]=255;}for(let x=10;x<190;x++){const y=40+Math.round(20*Math.sin(x/12));for(let d=0;d<3;d++){const k=((y+d)*200+x)*4;png.data[k]=20;png.data[k+1]=20;png.data[k+2]=120;}}
const buf=PNG.sync.write(png);
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:800},permissions:['geolocation']});
 await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:m.ctx.doPost({postData:{contents:body}}).s});});
 await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:')||u.startsWith('blob:'))return r.fallback();r.abort();});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('dialog',d=>d.accept());
 await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
 await pg.evaluate(()=>{window.__printed=0;window.print=function(){window.__printed++;};});
 await pg.fill('#gpin',dp['Rendi Irawan']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 await pg.waitForSelector('#bTsOpen:not(.hidden)',{timeout:8000});
 ok(await pg.locator('#bTsOpen').isVisible(),'Danru sees the Timesheet button');
 ok((await pg.locator('#aTs').isVisible())===false,'Admin tabs stay hidden');
 await pg.click('#bTsOpen');await pg.waitForSelector('#vTs:not(.hidden)');await pg.waitForSelector('#tsG');
 ok((await pg.locator('#tsDanru').count())===0,'Danru has no access switch');
 ok((await pg.inputValue('#tsSigN'))==='Rendi Irawan','signer name defaults to the Danru');
 await pg.selectOption('#tsG','Crew One');await pg.waitForSelector('#tsOut .tst');
 // sign by hand: blank
 await pg.click('#tsPrintBtn');await pg.waitForFunction(()=>window.__printed===1,null,{timeout:8000});
 let pen=await pg.evaluate(()=>[...document.querySelectorAll('#tsPrint .tss td')].map(x=>x.textContent.trim()));
 ok(pen.filter(x=>x==='Nama :').length===3&&(await pg.locator('#tsPrint .sgi').count())===0,'manual print: boxes blank, no signature image');
 // needs signature
 await pg.click('#tsPrintSig');ok(/Upload your signature/.test(await pg.locator('#tsMsg').innerText()),'asks for a signature first');
 await pg.setInputFiles('#tsSigF',{name:'sig.png',mimeType:'image/png',buffer:buf});
 await pg.waitForSelector('#tsSigBox img',{timeout:8000});
 ok(/^data:image\/png/.test(await pg.evaluate(()=>localStorage.getItem('sp_sig')||'')),'signature saved on the phone as PNG');
 await pg.click('#tsPrintSig');await pg.waitForFunction(()=>window.__printed===2,null,{timeout:8000});
 const ph=await pg.locator('#tsPrint').innerHTML();
 ok(/class="sgi" src="data:image\/png/.test(ph),'signature image placed in Kolom Pengesahan');
 pen=await pg.evaluate(()=>[...document.querySelectorAll('#tsPrint .tss td')].map(x=>x.textContent.trim()));
 ok(pen[6]==='Nama : Rendi Irawan'&&/^Tanggal : \d{1,2} \w+ 20\d\d$/.test(pen[9])&&pen[7]==='Nama :'&&pen[10]==='Tanggal :','Danru name and date only in the Pengesahan box: '+pen[6]+' / '+pen[9]);
 ok(!/Crew One/.test(pen.join('|')),'guard name not in the signature boxes');
 await pg.click('#tsSigX');await pg.waitForFunction(()=>!localStorage.getItem('sp_sig'));
 ok((await pg.locator('#tsSigBox img').count())===0,'signature can be removed');
 await pg.click('#tsBack');await pg.waitForSelector('#vPatrol:not(.hidden)');
 // Bahasa toggle keeps working on the new screen
 ok(errs.length===0,'no page errors '+errs.join('|'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})();
