const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'],ADM=m.props.ADMIN_PIN;
const G=m.call({action:'d_add',gp:D,name:'Act Guard'});
// guard: closed on the spot needs the action taken
ok(m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Gap in fence',spot:true,cid:'a1'}).err==='need_action','spot without action refused');
ok(m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Gap in fence',spot:true,act:'ab',cid:'a1'}).err==='need_action','too short action refused');
ok(m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Gap in fence',spot:true,act:'Tied the gap with wire',cid:'a1'}).ok,'spot with action accepted');
const row=m.sheets.Observations.rows.find(r=>r[0]==='a1');
ok(row&&row[12]==='Closed on spot'&&row[13]==='Act Guard'&&/\d{4}-\d\d-\d\d/.test(String(row[14]))&&row[15]==='Tied the gap with wire','action stored as close note, closed by the guard, with time');
ok(m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Loose cable',cid:'a2'}).ok&&m.sheets.Observations.rows.find(r=>r[0]==='a2')[12]==='Open','issue not fixed needs no action text');
// danru close needs a comment
ok(m.call({action:'d_obs_close',gp:D,id:'a2'}).err==='need_note','Danru close without a comment refused');
ok(m.call({action:'d_obs_close',gp:D,id:'a2',note:'  '}).err==='need_note','blank comment refused');
ok(m.sheets.Observations.rows.find(r=>r[0]==='a2')[12]==='Open','still open after refusals');
ok(m.call({action:'d_obs_close',gp:D,id:'a2',note:'Cable fixed by electrician'}).ok&&m.sheets.Observations.rows.find(r=>r[0]==='a2')[15]==='Cable fixed by electrician','close with comment works and is stored');
// missed dashboard
ok(m.call({action:'a_missed',pin:'000000'}).err==='pin','missed: wrong admin PIN refused');
ok(m.call({action:'a_missed',pin:ADM,from:'2026-10-10',to:'2026-10-01'}).err==='bad_date','missed: bad dates refused');
const r=m.call({action:'a_missed',pin:ADM,from:'2026-10-20',to:'2026-10-21'});
const sum=a=>a.reduce((x,y)=>x+y.missed,0);
ok(r.ok&&r.rounds===18&&r.points>=46&&r.possible===r.rounds*r.points,'missed: 2 days = 18 rounds, possible = rounds x points');
ok(r.missed===sum(r.byDay)&&r.missed===sum(r.bySlot)&&r.missed===sum(r.byShift)&&r.missed===sum(r.byZone)&&r.missed===sum(r.byPoint)&&r.missed===r.detail.reduce((x,d)=>x+d.missed.length,0),'missed: every breakdown adds up to the same total');
ok(r.byDay.length===2&&r.bySlot.length===9&&r.byShift.length===3&&r.byPoint.length===r.points&&r.detail.length===18,'missed: 2 days, 9 slots, 3 shifts, all points, 18 rounds listed');
ok(r.detail[0].date>=r.detail[r.detail.length-1].date,'missed: newest round first');
ok(!/\d{6}/.test(JSON.stringify(r).replace(/\d{4}-\d{2}-\d{2}/g,'')),'missed: no PINs in the reply');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async q=>{const body=q.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await q.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',q=>{const u=q.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return q.fallback();q.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));pg.on('dialog',d=>{pg.dlg=d.message();d.accept();});
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));return pg;
 }
 let pg=await sess();
 await pg.fill('#gpin',G.pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(700);
 await pg.click('#bObs');await pg.waitForSelector('#vObs:not(.hidden)');
 await pg.click('#obIss');
 ok(!(await pg.locator('#obAct').count()),'no action box until the tick');
 await pg.fill('#obText','Door left open at store');
 await pg.check('#obSpot');
 ok(await pg.locator('#obAct').isVisible()&&/required/i.test(await pg.locator('label[for=obAct]').innerText()),'action box appears and is marked required');
 ok(await pg.locator('#obText').inputValue()==='Door left open at store','description kept after the tick');
 await pg.click('#obSend');
 ok(/Describe the action/i.test(await pg.locator('#obErr').innerText()),'send without the action is refused on the phone');
 await pg.fill('#obAct','Closed and locked the door');
 await pg.click('#obSend');await pg.waitForSelector('#obAgain');
 ok(m.sheets.Observations.rows.some(r=>r[9]==='Door left open at store'&&r[15]==='Closed and locked the door'),'action saved');
 await pg.click('#lID');await pg.click('#obAgain');await pg.click('#obIss');await pg.check('#obSpot');
 ok(/wajib/i.test(await pg.locator('label[for=obAct]').innerText()),'Bahasa label for the action box');
 ok(pg.errs.length===0,'no page errors (guard) '+pg.errs.join('|'));
 // Danru: cannot close without a comment
 m.call({action:'obs',gp:G.pin,type:'Issue',cat:'Fence / perimeter',text:'Needs a Danru close',cid:'a9'});
 let pd=await sess();
 await pd.fill('#gpin',D);await pd.click('#bGpin');await pd.waitForSelector('#vPatrol:not(.hidden)');await pd.waitForTimeout(700);
 await pd.click('#bObsL');await pd.waitForSelector('[data-close]');
 pd.dlg='';await pd.click('[data-close]');await pd.waitForTimeout(300);
 ok(/close-out comment/i.test(pd.dlg||'')&&m.sheets.Observations.rows.find(r=>r[0]==='a9')[12]==='Open','Danru: close without a comment is blocked on the phone');
 ok(/required/i.test(await pd.locator('[data-note]').getAttribute('placeholder')),'comment box marked required');
 await pd.fill('[data-note]','Reported to maintenance, fixed');await pd.click('[data-close]');
 await pd.waitForFunction(()=>/no open issues/i.test(document.getElementById('obsLBody').innerText));
 ok(/Closed on the spot|Reported to maintenance/i.test(await pd.locator('#obsLBody').innerText()),'closed list shows comments');
 // admin Missed tab
 let pa=await sess();
 await pa.click('#bAdmin');await pa.fill('#pin',ADM);await pa.click('#pinGo');await pa.waitForSelector('#vAdmin:not(.hidden)');
 await pa.click('#aMiss');await pa.waitForSelector('#msOut .counts');
 const t=await pa.locator('#msOut').innerText();
 ok(/missed point-rounds/i.test(t)&&/by day/i.test(t)&&/by shift/i.test(t)&&/by round time/i.test(t)&&/by zone/i.test(t)&&/by point/i.test(t)&&/every round with misses/i.test(t),'Missed tab shows all sections');
 ok(await pa.locator('#msOut details').count()>0,'round details can be opened');
 await pa.locator('#msOut details summary').first().click();
 ok(await pa.locator('#msOut details[open] li').count()>0,'a round lists its missed points');
 await pa.click('[data-msq="14"]');await pa.waitForSelector('#msOut .counts');
 ok(await pa.locator('#msF').inputValue()<await pa.locator('#msT').inputValue(),'14 days button changes the period');
 const dl=pa.waitForEvent('download');await pa.click('#msCsv');const d=await dl;
 ok(/^missed-points-.*\.csv$/.test(d.suggestedFilename()),'CSV download: '+d.suggestedFilename());
 ok(await pa.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Missed tab: no horizontal overflow');
 ok(pa.errs.length===0&&pd.errs.length===0,'no page errors '+pa.errs.concat(pd.errs).join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
