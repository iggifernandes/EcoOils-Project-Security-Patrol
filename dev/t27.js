const m=require('./mock.js');let fails=0;const ok=(c,t)=>{console.log((c?'PASS ':'FAIL ')+t);if(!c)fails++};
m.ctx.makeDanruPins();const dp={};m.ctx.logs.filter(l=>l.startsWith('DANRU PIN')).forEach(l=>{const x=l.match(/DANRU PIN\s+(.*?)\s+=\s+(\d{6})/);dp[x[1]]=x[2]});
const D=dp['Rendi Irawan'],AP=m.props.ADMIN_PIN;
const st=m.call({action:'state',gp:D});const pt=st.points[0];
const ms=Date.now(),cur=m.ctx.roundAt_(ms);
// a real scan (text cells), then simulate Google Sheets turning Date/Time/Round into Date objects
m.call({action:'scan',gp:D,pid:pt.id});
const row=m.sheets.Scans.rows[m.sheets.Scans.rows.length-1];
row[1]=new Date(ms);row[2]=new Date(cur.start);row[3]=new Date(1899,11,30,10,0);
const r=m.call({action:'a_stats',pin:AP,from:cur.date,to:cur.date});
const p=r.points.find(x=>x.no===pt.no);
ok(r.ok&&p.scans===1&&p.covered===1&&r.totals.scans===1,'stats still count a scan when Date/Round cells were converted by Sheets');
const h=m.call({action:'a_history',pin:AP,from:cur.date,to:cur.date});
ok(h.ok&&h.rows.length===1,'history still finds it');
console.log(fails?'FAILURES '+fails:'ALL PASSED');process.exit(fails?1:0);
