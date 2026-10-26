// Mock Google Apps Script runtime and exercise Code.gs v1.5
const fs=require('fs'),crypto=require('crypto'),vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'..','Code.gs'),'utf8');
function mkSheet(name){const rows=[];return {name,rows,
  getLastRow:()=>rows.length,
  appendRow:r=>{rows.push(r.slice())},
  deleteRow:r=>{rows.splice(r-1,1)},
  setFrozenRows(){},
  insertSheet(){},
  getRange(r,c,nr,nc){nr=nr||1;nc=nc||1;const me=this;
    const rg={getValues:()=>{const o=[];for(let i=0;i<nr;i++){const row=[];for(let j=0;j<nc;j++){const v=(rows[r-1+i]||[])[c-1+j];row.push(v===undefined?'':v)}o.push(row)}return o},
      setValues:(vals)=>{vals.forEach((vr,i)=>{rows[r-1+i]=rows[r-1+i]||[];vr.forEach((v,j)=>{rows[r-1+i][c-1+j]=v})});return rg},
      setValue:(v)=>{rows[r-1]=rows[r-1]||[];rows[r-1][c-1]=v;return rg},
      getValue:()=>{const v=(rows[r-1]||[])[c-1];return v===undefined?'':v},
      setFontWeight(){return rg},setNumberFormat(){return rg}};return rg}};}
const sheets={};const props={};const cache={};
const ctx={console,Date,Math,JSON,String,Number,Object,Array,isFinite,parseInt,
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n]||null,insertSheet:n=>sheets[n]=mkSheet(n),getSheets:()=>Object.values(sheets),deleteSheet(){}})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]||null,setProperty:(k,v)=>{props[k]=String(v)},deleteProperty:k=>{delete props[k]}})},
 CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>{cache[k]=v}})},
 LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 Utilities:{getUuid:()=>crypto.randomUUID(),DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(a,s)=>Array.from(crypto.createHash('sha256').update(s).digest()).map(b=>b>127?b-256:b),newBlob:()=>({}),base64Decode:()=>[1,2,3]},
 ContentService:{createTextOutput:s=>({s,setMimeType(){return this}}),MimeType:{JSON:1}},
 MailApp:{sendEmail(m){ctx.mails.push(m)}},mails:[],
 DriveApp:{createFolder:()=>({getId:()=>'x',createFile:()=>({getUrl:()=>'https://drive.example/photo'+Math.random()})}),getFolderById:()=>({createFile:()=>({getUrl:()=>'https://drive.example/photo'+Math.random()})})},
 ScriptApp:{getProjectTriggers:()=>[]},Logger:{log:m=>ctx.logs.push(m)},logs:[]};
vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.setup();

/* The tests use the real clock. When it is in a gap between patrol rounds (no round running), jump the clock to one minute into the next round so the tests do not depend on the time of day. */
{const real=Date.now.bind(Date),r0=ctx.roundAt_(real());if(r0.upcoming){const off=r0.start+60000-real();Date.now=()=>real()+off;}}
module.exports={ctx,sheets,props,call:b=>JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(b)}}).s)};

global.waitPat=async function(pg){await pg.waitForSelector('#vPatrol:not(.hidden),#vDan:not(.hidden)');if(await pg.locator('#vDan:not(.hidden)').count())await pg.click('#dtPat');await pg.waitForSelector('#vPatrol:not(.hidden)');};
