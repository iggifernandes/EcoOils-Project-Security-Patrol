const m=require('./mock.js');const mkStub=require('./gatestub.js');
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
const G=m.call({action:'d_add',gp:dp['Rendi Irawan'],name:'Gate Guard'});
const SEC='s3cr3t-s3cr3t-s3cr3t-s3cr3t-s3cr3t-1234';
const stub=mkStub(SEC);m.ctx.UrlFetchApp={fetch:(u,o)=>stub.fetch(u,o)};
// not set up yet
ok(m.call({action:'state',gp:G.pin}).gate===false,'state.gate is false until GATEPASS_URL and GATEPASS_SECRET are set');
ok(m.call({action:'gate_list',gp:G.pin}).err==='gate_off','gate_list says gate_off when not set up');
m.props.GATEPASS_URL='https://script.google.com/macros/s/AAA/exec';m.props.GATEPASS_SECRET=SEC;
ok(m.call({action:'state',gp:G.pin}).gate===true,'state.gate is true once both are set');
// login required
ok(m.call({action:'gate_list',gp:'000000'}).err==='pin'&&m.call({action:'gate_get',gp:'000000',ref:'MGP-2610-0001'}).err==='pin'&&m.call({action:'gate_release',gp:'000000',ref:'MGP-2610-0001',decision:'release'}).err==='pin','all three gate actions need a guard PIN');
ok(stub.fetches.length===0,'no call to the gate pass system without a valid PIN');
// list + cache
const l1=m.call({action:'gate_list',gp:G.pin}),l2=m.call({action:'gate_list',gp:G.pin});
ok(l1.ok&&l1.n===2&&l1.list[0].ref==='MGP-2610-0001','pending list: 2 passes');
ok(stub.fetches.filter(f=>f.action==='b_list').length===1,'list is cached (one call to the other script for two phones)');
ok(!JSON.stringify([l1,l2]).includes(SEC),'the secret never goes to a phone');
// get
ok(m.call({action:'gate_get',gp:G.pin,ref:'hello'}).err==='bad_ref','garbage reference refused');
const g=m.call({action:'gate_get',gp:G.pin,ref:'https://iggifernandes.github.io/EcoOils-Project-Material-Gate-Pass/?v=mgp-2610-0001'});
ok(g.ok&&g.ready&&g.pass.vehicle==='BK 1234 XY'&&g.images.signed.length===1&&stub.fetches.slice(-1)[0].ref==='MGP-2610-0001','QR URL is understood; pass and images returned');
ok(m.call({action:'gate_get',gp:G.pin,ref:'MGP-2610-0003'}).ready===false,'a pass with no signed copy is not ready');
ok(m.call({action:'gate_get',gp:G.pin,ref:'MGP-2610-9999'}).err==='notfound','unknown pass');
// release rules
ok(m.call({action:'gate_release',gp:G.pin,ref:'MGP-2610-0001',decision:'release',checks:{signed:true,plate:true,items:true}}).err==='need_checks','release needs all five checks');
ok(m.call({action:'gate_release',gp:G.pin,ref:'MGP-2610-0001',decision:'reject',reason:'  '}).err==='need_reason','reject needs a reason');
ok(!stub.fetches.some(f=>f.action==='b_release'),'nothing sent to the gate pass system for refused requests');
const rel=m.call({action:'gate_release',gp:G.pin,ref:'MGP-2610-0001',decision:'release',by:'Someone Else',role:'Danru',checks:{signed:true,plate:true,items:true,vehicle:true,idc:true},lat:3.13,lng:99.35,acc:9});
ok(rel.ok&&rel.status==='Released','released');
const sent=stub.fetches.filter(f=>f.action==='b_release')[0];
ok(sent.by==='Gate Guard'&&sent.role!=='Danru','the guard name and role come from the PIN, not from what the phone says: '+sent.by+' / '+sent.role);
const gs=m.sheets.GatePass;
ok(gs&&gs.rows.length===2&&gs.rows[1][1]==='MGP-2610-0001'&&gs.rows[1][2]==='RELEASED'&&gs.rows[1][3]==='Gate Guard'&&gs.rows[1][8]===3.13,'Patroli keeps its own GatePass record with guard, time and location');
ok(m.call({action:'gate_list',gp:G.pin}).n===1,'cache cleared after release: list refreshed');
const again=m.call({action:'gate_release',gp:dp['Rendi Irawan'],ref:'MGP-2610-0001',decision:'release',checks:{signed:true,plate:true,items:true,vehicle:true,idc:true}});
ok(!again.ok&&again.err==='already_released'&&again.by==='Gate Guard','second release refused, shows who released it');
ok(m.sheets.GatePass.rows.length===2,'refused release is not logged as a release');
const rj=m.call({action:'gate_release',gp:G.pin,ref:'MGP-2610-0002',decision:'reject',reason:'Quantity does not match'});
ok(rj.ok&&rj.status==='Rejected'&&m.sheets.GatePass.rows[2][2]==='REJECTED'&&m.sheets.GatePass.rows[2][7]==='Quantity does not match','reject with reason recorded');
// failures
stub.down=true;m.ctx.CacheService.getScriptCache().remove('gate_pend');
ok(m.call({action:'gate_list',gp:G.pin}).err==='gate_down'&&m.call({action:'gate_get',gp:G.pin,ref:'MGP-2610-0002'}).err==='gate_down','gate pass system down: clear error, no crash');
ok(m.call({action:'gate_release',gp:G.pin,ref:'MGP-2610-0002',decision:'release',checks:{signed:true,plate:true,items:true,vehicle:true,idc:true}}).err==='gate_down','release is NOT recorded when the system is down');
stub.down=false;
m.props.GATEPASS_SECRET='wrong';
ok(!m.call({action:'gate_list',gp:G.pin}).ok,'wrong secret: gate pass system refuses, Patroli reports an error');
// nothing else changed
ok(m.call({action:'state',gp:G.pin}).ok&&m.call({action:'scan',gp:G.pin,pid:'MEN-SEC-GT-01',lat:3.2,lng:99.4,acc:8}).ok,'normal patrol scanning still works');
console.log(fails?'FAILED':'ALL PASSED');process.exit(fails?1:0);
