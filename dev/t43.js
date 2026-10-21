const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const NEW='1LDSiie7L6CfPuaxlsVHLdZTduFpjGqx3';
const made=[],moved=[];let trashed=0;
function mk(id,name,files){return {getId:()=>id,getName:()=>name,createFile:()=>({getUrl:()=>'u',setTrashed(){}}),getFiles:()=>{let i=0;return {hasNext:()=>i<files.length,next:()=>({moveTo(f){moved.push(f.getId());i++;}})};},getFolders:()=>({hasNext:()=>false}),setTrashed(){trashed++;}};}
// 1) chosen folder cannot be opened: fallback, property untouched
m.props.PHOTO_FOLDER=NEW;
m.ctx.DriveApp.getFolderById=id=>{if(id===NEW)throw new Error('No access');if(id==='OLD')return mk('OLD','old',[1,2,3]);if(id.startsWith('FB'))return mk(id,'fb',[]);return mk(id,'x',[]);};
m.ctx.DriveApp.createFolder=n=>{const f=mk('FB'+made.length,n,[]);made.push(n);return f;};
const f1=m.ctx.folder_();
ok(made.length===1&&/FALLBACK/.test(made[0]),'unreachable folder: files go to a clearly named fallback, not lost');
ok(m.props.PHOTO_FOLDER===NEW,'chosen folder id is NOT overwritten');
m.ctx.folder_();ok(made.length===1,'fallback folder is reused, not created again');
// 2) setDriveFolders refuses when the folder is not reachable
const r0=m.ctx.setDriveFolders();ok(r0.ok===false,'setDriveFolders reports when the folder cannot be written');
// 3) works once shared: moves old files, sets both properties
m.props.PHOTO_FOLDER='OLD';m.props.VIDEO_FOLDER='OLD';
m.ctx.DriveApp.getFolderById=id=>{if(id===NEW)return mk(NEW,'Security Patrol Photos',[]);if(id==='OLD')return mk('OLD','old',[1,2,3]);return mk(id,'x',[]);};
const r1=m.ctx.setDriveFolders();
ok(r1.ok&&m.props.PHOTO_FOLDER===NEW&&m.props.VIDEO_FOLDER===NEW,'photos and videos now use the new folder');
ok(r1.moved===3&&moved.every(x=>x===NEW),'old files moved into the new folder ('+r1.moved+')');
ok(trashed===1,'emptied old folder trashed');
ok(!m.props.PHOTO_FOLDER_FALLBACK,'fallback markers cleared');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
