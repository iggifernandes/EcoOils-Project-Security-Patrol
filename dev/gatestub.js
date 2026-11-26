// A small stand-in for the Gate Pass web app, used by t61 and t62 (the real one is tested in the Gate Pass repo).
module.exports=function(SECRET){
  const st={fetches:[],down:false,pass:{}};
  const mk=(ref,o)=>Object.assign({ref,status:'Pending release',company:'GSB',vehicle:'BK 1234 XY',carrier:'Budi Santoso',icNo:'KTP 1271012345678901',icPhone:'+62 812 3456 7890',purpose:'A',purposeText:'Return rejected pipes',dept:'Stores',icRep:'Andi Wijaya',icPos:'Store lead',items:[{no:1,item:'Pipe 6in',qty:12,unit:'pcs'},{no:2,item:'Gasket',qty:40,unit:''}],signedAt:'2026-10-26 09:00:00',validUntil:Date.now()+40*3600000,decidedBy:'',decidedAt:'',note:''},o||{});
  st.pass['MGP-2610-0001']=mk('MGP-2610-0001');st.pass['MGP-2610-0002']=mk('MGP-2610-0002',{company:'WEN',vehicle:'BK 5555 AA'});st.pass['MGP-2610-0003']=mk('MGP-2610-0003',{status:'Awaiting signatures'});
  const jpg='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAB//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
  st.fetch=function(url,opt){
    if(st.down)throw new Error('unreachable');
    const b=JSON.parse(opt.payload);st.fetches.push(b);
    let r;
    if(b.secret!==SECRET)r={ok:false,err:'auth'};
    else if(b.action==='b_list'){const l=Object.values(st.pass).filter(p=>p.status==='Pending release').map(p=>({ref:p.ref,company:p.company,vehicle:p.vehicle,carrier:p.carrier,items:p.items.length,signedAt:p.signedAt,validUntil:p.validUntil}));r={ok:true,list:l,n:l.length,now:Date.now()};}
    else if(b.action==='b_get'){const p=st.pass[b.ref];r=p?{ok:true,pass:p,images:{front:jpg,load:jpg,signed:[jpg]},ready:p.status==='Pending release',why:p.status==='Pending release'?'':p.status==='Released'?'already_released':'no_signed_copy'}:{ok:false,err:'notfound'};}
    else if(b.action==='b_release'){const p=st.pass[b.ref];if(!p)r={ok:false,err:'notfound'};else if(p.status==='Released')r={ok:false,err:'already_released',by:p.decidedBy,at:p.decidedAt};else if(p.status!=='Pending release')r={ok:false,err:'not_ready',status:p.status};else{p.status=b.decision==='release'?'Released':'Rejected';p.decidedBy=b.by;p.decidedAt='2026-10-26 10:00:00';p.note=b.reason;r={ok:true,status:p.status,at:p.decidedAt,ref:p.ref,company:p.company,vehicle:p.vehicle};}}
    else if(b.action==='b_audit_list'){st.aud=st.aud||{'MGP-2610-0001':{ref:'MGP-2610-0001',company:'GSB',vehicle:'BK 1234 XY',carrier:'Budi Santoso',items:2,releasedBy:'Other Guard',releasedAt:'2026-11-26 10:00:00',status:'Open',score:'Major',flags:'QUICK_RELEASE',why:'Flag'},'MGP-2610-0002':{ref:'MGP-2610-0002',company:'WEN',vehicle:'BK 5555 AA',carrier:'Andi',items:1,releasedBy:'Gate Guard',releasedAt:'2026-11-26 11:00:00',status:'Open',score:'Compliant',flags:'',why:'Random sample'}};const l=Object.values(st.aud).filter(x=>x.status==='Open');r={ok:true,list:l,n:l.length,doneToday:Object.values(st.aud).filter(x=>x.status!=='Open').length};}
    else if(b.action==='b_audit_done'){const a=(st.aud||{})[b.ref];if(!a)r={ok:false,err:'notfound'};else if(a.status!=='Open')r={ok:false,err:'already_done',by:a.by};else if(a.releasedBy.toLowerCase()===String(b.by).toLowerCase())r={ok:false,err:'own_release'};else if((b.paper==='no'||b.photos==='no'||b.items==='no')&&String(b.note).length<3)r={ok:false,err:'need_note'};else{a.status='Done';a.by=b.by;a.role=b.role;a.paper=b.paper;a.photos=b.photos;a.itemsOk=b.items;a.note=b.note;r={ok:true,inconsistency:b.paper==='no'||b.photos==='no'||b.items==='no'};}}
    else r={ok:false,err:'action'};
    return {getContentText:()=>JSON.stringify(r)};
  };
  return st;
};
