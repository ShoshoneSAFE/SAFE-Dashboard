// S.A.F.E. Render Engine — deriveFields, buildSB, render, renderRev, UI helpers
function deriveFields(){
  D.forEach(d=>{
    d.p = d.b > 0 ? Math.round(d.v/d.b*100) : 0;
    const fs = d.forecastPct !== '' ? forecastStatus(d.b, d.v, d.forecastPct) : null;
    const pctUsed = d.p;
    if(fs) d.s = fs;
    else if(pctUsed > 80) d.s='alert';
    else if(pctUsed > 55) d.s='warn';
    else d.s='ok';
    d.li.forEach(l=>{ l.p = l.b > 0 ? Math.round(l.v/l.b*100) : 0; l.ov = l.v > l.b; });
  });
  REV.forEach(r=>{ r.p=r.b>0?Math.round(r.v/r.b*100):0; r.c=r.p<30?'#dc2626':r.p<46?'#d97706':'#059669'; r.w=r.p<40; });
}
deriveFields();

// STATE
let tab='all',st='all',sa=false,srch='';
const f$=n=>'$'+Math.round(n).toLocaleString('en-US');
const pc=p=>p>80?'#dc2626':p>55?'#d97706':'#059669';
const sb=s=>s==='alert'?'<span class="badge bAl">Alert</span>':s==='warn'?'<span class="badge bWn">Watch</span>':'<span class="badge bOk">On Track</span>';
const dc=s=>s==='alert'?'dot-alert':s==='warn'?'dot-warn':'dot-ok';
const fm={'0001':'fl0001','0019':'fl0019','0002':'fl0002','special':'flSp'};

// DEEP SEARCH: matches dept name OR any line item account/name
function deepSearch(q){
  if(!q) return D;
  const ql=q.toLowerCase();
  const results=[];
  D.forEach(d=>{
    const dMatch=d.name.toLowerCase().includes(ql)||d.num.toLowerCase().includes(ql)||d.fund.includes(ql);
    const liMatches=d.li.filter(l=>l.n.toLowerCase().includes(ql)||l.a.toLowerCase().includes(ql));
    if(dMatch||liMatches.length>0){
      results.push({...d, _liFilter: liMatches.length>0&&!dMatch ? liMatches.map(l=>l.a) : null});
    }
  });
  return results;
}

// BUILD SIDEBAR
function buildSB(){
  Object.values(fm).forEach(id=>{document.getElementById(id).innerHTML='';});
  D.forEach(d=>{
    const el=document.createElement('div');
    el.className='dl';el.id='sl'+d.id;
    el.innerHTML=`<span>${d.num} · ${d.name}</span><span class="dot ${dc(d.s)}"></span>`;
    el.onclick=()=>jumpTo(d.id);
    document.getElementById(fm[d.fund]||'flSp').appendChild(el);
  });
}

function sbSearch(v){
  srch=v.toLowerCase().trim();
  // sidebar filter still filters by dept name only
  document.querySelectorAll('.dl').forEach(el=>{
    el.style.display=el.textContent.toLowerCase().includes(srch)||!srch?'flex':'none';
  });
  sa=true;
  render();
  const lbl=srch?`🔍 Filtered: "${v}"  <span style="color:#d97706;font-size:11px;">(${getVis().length} results)</span>`:'All Funds · All Departments';
  document.getElementById('showLbl').innerHTML=lbl;
}

function togFund(id,hdr){
  hdr.classList.toggle('open');
  const el=document.getElementById(id);
  el.classList.toggle('open');
}

// TABLE
function getVis(){
  let base=deepSearch(srch);
  return base.filter(d=>{
    if(tab!=='all'&&d.fund!==tab)return false;
    if(st!=='all'&&d.s!==st)return false;
    return true;
  });
}

function render(){
  const body=document.getElementById('tbody');
  body.innerHTML='';
  let depts=getVis();
  const tot=depts.length;
  if(!sa)depts=depts.slice(0,12);

  // DYNAMIC TOTALS
  const vis=getVis();
  const totB=vis.reduce((s,d)=>s+d.b,0);
  const totV=vis.reduce((s,d)=>s+d.v,0);
  const totVar=totB-totV;
  const totPct=totB>0?Math.round(totV/totB*100):0;
  // update summary cards if they exist
  const cB=document.getElementById('mc-totb');if(cB)cB.textContent=f$(totB);
  const cV=document.getElementById('mc-totv');if(cV)cV.textContent=f$(totV);
  const cVar=document.getElementById('mc-totvr');if(cVar)cVar.textContent=f$(totVar);
  const cPct=document.getElementById('mc-totp');if(cPct)cPct.textContent=totPct+'%';
  // update alert counts
  document.getElementById('cntAll').textContent=D.length;
  document.getElementById('cntAlert').textContent=D.filter(d=>d.s==='alert').length;
  document.getElementById('cntWarn').textContent=D.filter(d=>d.s==='warn').length;
  document.getElementById('cntOk').textContent=D.filter(d=>d.s==='ok').length;

  depts.forEach(d=>{
    const diff=d.v-(d.pv||0);
    const dstr=(diff>=0?'+':'-')+f$(Math.abs(diff));
    const dc2=diff>5000?'cN':diff<-5000?'cP':'cZ';
    // Forecast column
    const fa=calcForecastedActual(d.v,d.forecastPct);
    const fv=calcForecastedVariance(d.b,d.v,d.forecastPct);
    const fCol=fa!==null
      ?`<span style="font-size:11px;">${f$(fa)}<br><span style="font-size:10px;color:${fv>=0?'#059669':'#dc2626'};">${fv>=0?'▼ Under':'▲ Over'} ${f$(Math.abs(fv))}</span></span>`
      :`<span style="color:#aaa;font-size:10px;">—</span>`;
    const tr=document.createElement('tr');
    tr.className='dr';tr.id=d.id+'-row';
    tr.innerHTML=`
      <td><div class="dn">${d.name}</div><div class="df">${d.num} · FUND ${d.fund==='special'?d.num.split(' ')[1]:d.fund}</div></td>
      <td class="mono">${f$(d.b)}</td><td class="mono" style="color:${pc(d.p)};">${f$(d.v)}</td>
      <td class="mono">${f$(d.b-d.v)}</td>
      <td><div class="pw"><div class="pb"><div class="pf" style="width:${Math.min(d.p,100)}%;background:${pc(d.p)};"></div></div><span style="font-size:11px;min-width:26px;">${d.p}%</span></div></td>
      <td><span class="cmp ${dc2}">${dstr}</span></td>
      <td>${fCol}</td>
      <td>${sb(d.s)}</td>`;
    tr.ondblclick=()=>togDrill(d.id);
    body.appendChild(tr);
    const xr=document.createElement('tr');
    xr.className='xrow';xr.id=d.id+'-x';
    xr.innerHTML=`<td colspan="8" class="xtd"><div class="xi" id="${d.id}-xi"></div></td>`;
    body.appendChild(xr);
  });

  // FILTERED TOTALS ROW
  if(vis.length>0){
    const tr=document.createElement('tr');
    tr.style.cssText='background:rgba(26,39,68,.06);font-weight:700;';
    tr.innerHTML=`<td style="font-size:11px;color:var(--navy);">TOTALS (${vis.length} dept${vis.length!==1?'s':''})</td>
      <td class="mono">${f$(totB)}</td><td class="mono">${f$(totV)}</td>
      <td class="mono" style="color:${totVar>=0?'#059669':'#dc2626'};">${f$(totVar)}</td>
      <td><div class="pw"><div class="pb"><div class="pf" style="width:${Math.min(totPct,100)}%;background:${pc(totPct)};"></div></div><span style="font-size:11px;">${totPct}%</span></div></td>
      <td></td><td></td><td></td>`;
    body.appendChild(tr);
  }

  const btn=document.getElementById('saBtn');
  btn.style.display=tot<=12?'none':'inline';
  btn.textContent=sa?'Show less ▲':'Show all '+tot+' ▼';
  document.getElementById('tfNote').textContent=`Double-click any row for detail · Showing ${depts.length} of ${tot} · Actuals thru ${ACTUALS_THRU.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})} · ${Math.round(FY_ELAPSED*100)}% of FY elapsed`;
}

function togShowAll(){sa=!sa;render();}

function buildDrill(d){
  const liList = d._liFilter ? d.li.filter(l=>d._liFilter.includes(l.a)) : d.li;
  const rows=liList.map(l=>{
    const lfa=calcForecastedActual(l.v,l.forecastPct);
    const lfv=calcForecastedVariance(l.b,l.v,l.forecastPct);
    const fcCell=lfa!==null?`${f$(lfa)} <span style="color:${lfv>=0?'#059669':'#dc2626'};font-size:10px;">(${lfv>=0?'↓':'↑'}${f$(Math.abs(lfv))})</span>`:'—';
    const notesTxt=l.notes&&l.notes.length?`<div style="font-size:10px;color:#666;margin-top:2px;">📝 ${l.notes[l.notes.length-1].text}</div>`:'';
    return `<tr class="${l.ov?'ov':''}">
      <td>${l.a}</td><td>${l.n}${notesTxt}</td>
      <td>${f$(l.b)}</td><td style="color:${pc(l.p)};">${f$(l.v)}</td>
      <td>${f$(l.b-l.v)}</td>
      <td><div class="pw"><div class="pb" style="width:50px;"><div class="pf" style="width:${Math.min(l.p,100)}%;background:${pc(l.p)};"></div></div>${l.p}%</div></td>
      <td>${fcCell}</td>
    </tr>`;}).join('');
  // dept-level notes
  const dNotes=d.notes&&d.notes.length?d.notes.map(n=>`<div style="font-size:10px;padding:3px 0;border-bottom:1px solid #eee;"><strong>${n.author||'Staff'}</strong> <span style="color:#999;">${n.date}</span> — ${n.text}</div>`).join(''):'<em style="font-size:11px;color:#aaa;">No notes yet.</em>';
  return `<div class="xhdr"><div class="xtitle">${d.name} — Line Item Detail</div><button class="xcls" onclick="closeDrill('${d.id}')">✕ Close</button></div>
  <div class="xsum">
    <div class="xcard"><div class="xclbl">TOTAL BUDGET</div><div class="xcval">${f$(d.b)}</div></div>
    <div class="xcard"><div class="xclbl">SPENT TO DATE</div><div class="xcval" style="color:${pc(d.p)};">${f$(d.v)}</div></div>
    <div class="xcard"><div class="xclbl">REMAINING</div><div class="xcval">${f$(d.b-d.v)}</div></div>
  </div>
  <table class="xt"><thead><tr><th>Account</th><th>Description</th><th>Budget</th><th>Actual</th><th>Remaining</th><th>% Used</th><th>Forecasted EOY</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:8px;"><div style="font-size:11px;font-weight:600;color:var(--navy);margin-bottom:4px;">📋 Department Notes</div>${dNotes}</div>
  <div style="margin-top:5px;font-size:10px;color:var(--muted);font-style:italic;">Red rows = over budget. Double-click row again to collapse.</div>`;
}
}

function togDrill(id){
  const xr=document.getElementById(id+'-x');
  const xi=document.getElementById(id+'-xi');
  const d=D.find(x=>x.id===id);
  xr.classList.contains('open')?(xr.classList.remove('open')):(xi.innerHTML=buildDrill(d),xr.classList.add('open'));
}
function closeDrill(id){document.getElementById(id+'-x').classList.remove('open');}

function jumpTo(id){
  const row=document.getElementById(id+'-row');
  if(!row){tab='all';st='all';sa=true;render();setTimeout(()=>jumpTo(id),150);return;}
  if(!document.getElementById(id+'-x').classList.contains('open'))togDrill(id);
  row.scrollIntoView({behavior:'smooth',block:'center'});
  row.classList.add('hl');setTimeout(()=>row.classList.remove('hl'),2000);
  document.querySelectorAll('.dl').forEach(el=>el.classList.remove('on'));
  const sl=document.getElementById('sl'+id);if(sl)sl.classList.add('on');
}

function setStatus(s,btn){
  st=s;
  document.querySelectorAll('.sfbtn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');sa=false;render();
  document.getElementById('showLbl').textContent=
    s==='all'?'All Funds · All Departments':s==='alert'?'Alert Departments':s==='warn'?'Watch Departments':'On Track Departments';
}

function switchTab(el,fund){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');tab=fund;sa=false;render();
  document.getElementById('showLbl').textContent=
    fund==='all'?'All Funds · All Departments':fund==='0001'?'Current Expense Fund (0001)':
    fund==='0019'?'Justice Fund (0019)':fund==='0002'?'Road & Bridge (0002)':'Enterprise & Special Funds';
}

function sortDepts(v){
  if(v==='name')D.sort((a,b)=>a.name.localeCompare(b.name));
  else if(v==='phi')D.sort((a,b)=>b.p-a.p);
  else if(v==='plo')D.sort((a,b)=>a.p-b.p);
  else if(v==='bhi')D.sort((a,b)=>b.b-a.b);
  else if(v==='var')D.sort((a,b)=>(b.b-b.v)-(a.b-a.v));
  render();
}

// REVENUE
function renderRev(){
  document.getElementById('rgrid').innerHTML=REV.map(r=>`
    <div class="rcard">
      <div class="rfund">${r.n}</div>
      <div class="rrow"><span>Budgeted Revenue</span><strong>${f$(r.b)}</strong></div>
      <div class="rrow"><span>Received to Date</span><strong style="color:${r.c};">${f$(r.v)}</strong></div>
      <div class="rrow"><span>Remaining</span><strong>${f$(r.b-r.v)}</strong></div>
      <div class="rrow"><span>% Received</span><strong style="color:${r.c};">${r.p}%${r.w?' ⚠':''}</strong></div>
      <div class="rbar"><div class="rfill" style="width:${r.p}%;background:${r.c};"></div></div>
    </div>`).join('');
}

// SPLASH
// Splash functions loaded from splash.js

// PRINT
function doPrint(){
  const vis=getVis();
  const totB=vis.reduce((s,d)=>s+d.b,0);
  const totV=vis.reduce((s,d)=>s+d.v,0);
  const totVar=totB-totV;
  const filterDesc=srch?`Search: "${srch}" · `:'';
  const tabDesc=tab==='all'?'All Funds':tab==='0001'?'Current Expense (0001)':tab==='0019'?'Justice Fund (0019)':tab==='0002'?'Road & Bridge (0002)':'Enterprise & Special Funds';
  const statusDesc=st==='all'?'All Statuses':st==='alert'?'Alert Only':st==='warn'?'Watch Only':'On Track Only';
  document.getElementById('printMeta').innerHTML=
    `${filterDesc}Fund: ${tabDesc} · Status: ${statusDesc} · ${vis.length} departments shown · `+
    `Total Budget: ${f$(totB)} · Actual: ${f$(totV)} · Variance: ${f$(totVar)} · `+
    `Printed: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})} · `+
    `Actuals through ${ACTUALS_THRU.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} (${Math.round(FY_ELAPSED*100)}% of FY elapsed)`;
  window.print();
}

