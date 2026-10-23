const {chromium}=require('playwright-core');
const m=require('./mock.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const D=dp['Rendi Irawan'],ADM=m.props.ADMIN_PIN;
const G1=m.call({action:'d_add',gp:D,name:'Gps One'}),G2=m.call({action:'d_add',gp:D,name:'Gps Two'}),G3=m.call({action:'d_add',gp:D,name:'Gps Three'});
const now=Date.now();let n=0;
const nm={1:'Main gate / security building',2:'West gate / security post',3:'Weighbridge',6:'Workshop area(In admin Building)'};
function row(g,no,gps,acc,dist){m.sheets.Scans.rows.push(['s'+(n++),'', '', '',g,'Security Guard','MEN-'+no,no,nm[no],'GT','','',acc,dist,gps,'','',now-n*1000]);}
[['Gps One'],['Gps Two'],['Gps Three']].forEach(([g])=>{row(g,1,'OUTSIDE',8,60);row(g,1,'OUTSIDE',10,45);});
row('Gps One',1,'OK',8,3);row('Gps Two',1,'OK',8,4);
row('Gps One',2,'OUTSIDE',40,70);
row('Gps Three',6,'NOT_CHECKED',30,'');
row('Gps Two',3,'NO_GPS','','');
const rep=m.ctx.gpsWeek_(m.ctx.ymdhms_(now-6*86400000).slice(0,10),m.ctx.ymdhms_(now).slice(0,10));
ok(rep.totals.outside===7&&rep.totals.checked===9&&rep.totals.strong===6&&rep.totals.noGps===1,'totals: 7 outside of 9 checked, 6 with good GPS, 1 no GPS: '+JSON.stringify(rep.totals));
ok(rep.guards[0].guard==='Gps One'&&rep.guards[0].outside===3&&rep.guards[0].checked===4,'guard ranking: Gps One 3 of 4');
const p1=rep.points.find(p=>p.no===1);ok(p1.review===true&&p1.guards===3&&p1.outside===6&&p1.checked===8,'point 1 flagged REVIEW (3 guards outside)');
ok(rep.points.find(p=>p.no===2).review===false,'point 2 (one guard, poor GPS) not flagged');
ok(!rep.points.some(p=>p.no===6)&&rep.skipped.includes('6'),'shaded point 6 is never counted and is listed as not checked');
const dg=m.call({action:'d_gps',gp:D});
ok(dg.ok&&dg.totals.outside===7&&dg.totals.noGps===0&&dg.guards.every(g=>g.noGps===0),'Danru version hides the no-GPS count');
ok(m.call({action:'d_gps',gp:G1.pin}).err==='auth','a guard cannot open the GPS check');
ok(m.call({action:'d_gps',pin:ADM,days:30}).ok,'Admin PIN can open it');
// weekly email
m.ctx.setCfg_('NOTIFY_EMAIL','owner@example.com,other@example.com');m.ctx.setCfg_('DANRU_EMAIL','danru@example.com, squad@example.com');
m.ctx.mails.length=0;m.ctx.weeklyGps();
const mo=m.ctx.mails.find(x=>x.to==='owner@example.com'),md=m.ctx.mails.find(x=>/danru@example.com/.test(x.to));
ok(m.ctx.mails.length===2&&mo&&md&&/squad@example.com/.test(md.to),'two emails: owner, and the Danru list');
ok(/7 outside/.test(mo.subject)&&/Scans without GPS: 1/.test(mo.htmlBody)&&!/without GPS/.test(md.htmlBody),'owner email shows no-GPS count, Danru email does not');
ok(/REVIEW THE POINT/.test(md.htmlBody)&&/PERIKSA TITIK/.test(md.htmlBody)&&/Gps One/.test(md.htmlBody),'Danru email: guards, review flag, English and Bahasa');
ok(!/other@example.com/.test(md.to)&&!/danru@example.com/.test(mo.to),'recipients not mixed');
// trigger definition
const src=require('fs').readFileSync('../Code.gs','utf8');
ok(/onWeekDay\(ScriptApp\.WeekDay\.SUNDAY\)\.atHour\(18\)/.test(src),'weekly trigger is Sunday 18:00 Jakarta');
// UI
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||require('fs').readdirSync('/opt/pw-browsers').filter(x=>x.startsWith('chromium-')).map(x=>'/opt/pw-browsers/'+x+'/chrome-linux/chrome')[0],args:['--no-sandbox']});
 async function sess(pin){
  const ctx=await b.newContext({viewport:{width:360,height:800},geolocation:{latitude:3.2,longitude:99.4,accuracy:8},permissions:['geolocation']});
  await ctx.route('**/script.google.com/**',async r=>{const body=r.request().postData();const out=m.ctx.doPost({postData:{contents:body}}).s;await r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:out});});
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.includes('script.google.com')||u.startsWith('data:'))return r.fallback();r.abort();});
  const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e)));
  await pg.goto('file://'+require('path').join(__dirname,'..','index.html'));
  await pg.fill('#gpin',pin);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(800);return pg;
 }
 const pg=await sess(G1.pin);
 ok(!(await pg.locator('#bGps').isVisible()),'guard does not see the GPS check');
 const pd=await sess(D);
 ok(await pd.locator('#bGps').isVisible(),'Danru sees the GPS check button');
 await pd.click('#bGps');await pd.waitForSelector('#gpDays');
 const tx=await pd.locator('#gpsBody').innerText();
 ok(/Gps One/.test(tx)&&/Gps Three/.test(tx)&&/Review the point/i.test(tx)&&/Workshop/.test(tx)===false,'Danru screen: guards and the review note');
 ok(/\b7\b/.test(await pd.locator('#gpsBody .cnt.r').innerText())&&/\b9\b/.test(await pd.locator('#gpsBody .cnt.d').innerText()),'counts 7 outside, 9 checked');
 ok(!/without gps|no gps/i.test(tx),'no-GPS count is not shown to the Danru');
 await pd.selectOption('#gpDays','30');await pd.waitForSelector('#gpDays');
 ok(await pd.locator('#gpDays').inputValue()==='30','period switch to 30 days works');
 await pd.click('#lID');await pd.waitForTimeout(400);
 ok(/Periksa titik/i.test(await pd.locator('#gpsBody').innerText()),'Bahasa text');
 ok(await pd.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at 360 px');
 await pd.click('#gpBack');await pd.waitForSelector('#vPatrol:not(.hidden)');
 ok(pd.errs.length===0&&pg.errs.length===0,'no page errors '+pd.errs.concat(pg.errs).join('|'));
 await b.close();console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
})();
