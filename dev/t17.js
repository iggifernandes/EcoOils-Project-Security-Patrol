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
 const ids={};
 for(const n of ['Plan Gate One','Plan Gate Two','Plan Patrol Three']){const r=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:n});ids[n]=r.pin}
 // guard login: no plan, no buttons
 await pg.fill('#gpin',ids['Plan Gate One']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 ok(await pg.locator('#bPlanOpen').isHidden(),'plain guard does not see Shift plan button');
 ok((await pg.locator('#planCard').innerText())==='','no plan card when no plan');
 await pg.click('#bChange');
 // danru
 await pg.fill('#gpin',dp['Rendi Irawan']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');
 ok(await pg.locator('#bPlanOpen').isVisible(),'Danru sees Shift plan button');
 ok((await pg.locator('#bPlanOpen').innerText())==='Shift plan','button text EN');
 await pg.click('#bPlanOpen');await pg.waitForSelector('#plDate',{timeout:8000});
 ok(await pg.locator('select[data-f=duty]').count()===4,'4 default duty rows (Gate 1-3, Patrol)');
 // fill Gate 1: guard + buddy, Patrol: guard only
 const sels=pg.locator('select[data-f=guard]');
 await sels.nth(0).selectOption('Plan Gate One');
 await pg.locator('select[data-f=buddy]').nth(0).selectOption('Plan Gate Two');
 const opt=await pg.locator('select[data-f=guard]').nth(3).locator('option[value="Plan Gate One"]').getAttribute('disabled');
 ok(opt!==null,'a guard already used is disabled in other rows');
 await pg.locator('select[data-f=guard]').nth(3).selectOption('Plan Patrol Three');
 // switch to Night: reloads, then fill again
 await pg.click('[data-a=sh][data-v=M]');await pg.waitForSelector('select[data-f=duty]');await pg.waitForTimeout(400);
 await pg.locator('select[data-f=guard]').nth(3).selectOption('Plan Patrol Three');
 ok((await pg.locator('#planBody').innerText()).includes('buddy is needed'),'night shift shows buddy needed hint');
 await pg.click('[data-a=save]');await pg.waitForFunction(()=>document.querySelector('#plMsg')&&document.querySelector('#plMsg').textContent.length>0);
 ok((await pg.locator('#plMsg').innerText()).includes('no buddy for: Patrol'),'night save warns which duty has no buddy');
 // pick buddy then save clean
 await pg.locator('select[data-f=buddy]').nth(3).selectOption('Plan Gate Two');
 await pg.click('[data-a=save]');await pg.waitForFunction(()=>/saved/i.test(document.querySelector('#plMsg').textContent));
 const sf=m.ctx.shiftAt_(Date.now());
 const nightRows=m.ctx.roster_(sf.date,'M');
 ok(nightRows.length===1&&nightRows[0].duty==='Patrol'&&nightRows[0].buddy==='Plan Gate Two','night plan stored in Roster sheet');
 // day plan for the current shift so guards see it
 await pg.click('[data-a=sh][data-v='+sf.code+']');await pg.waitForTimeout(500);
 await pg.locator('select[data-f=guard]').nth(0).selectOption('Plan Gate One');
 await pg.click('[data-a=save]');await pg.waitForFunction(()=>/saved/i.test(document.querySelector('#plMsg').textContent));
 // Bahasa toggle on plan screen
 await pg.click('#lID');await pg.waitForTimeout(300);
 ok((await pg.locator('#planBody').innerText()).includes('Simpan rencana'),'plan screen switches to Bahasa Indonesia');
 await pg.click('#lEN');
 await pg.click('#pBack');await pg.waitForSelector('#vPatrol:not(.hidden)');
 await pg.click('#bChange');
 // guard now sees the card with his duty
 await pg.fill('#gpin',ids['Plan Gate One']);await pg.click('#bGpin');await pg.waitForSelector('#vPatrol:not(.hidden)');await pg.waitForTimeout(500);
 const card=await pg.locator('#planCard').innerText();
 ok(card.includes('Gate 1')&&card.includes('Plan Gate One'),'guard sees his duty on the plan card: '+card.replace(/\n/g,' | '));
 ok(errs.length===0,'no page errors '+errs.join(';'));
 await b.close();console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
})().catch(e=>{console.error('ERR',e.message);process.exit(2)});
