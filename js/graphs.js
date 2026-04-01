// graphs.js — グラフ描画

function renderGraphs(R,disp,isM,total,hAge){
  const totI=R.incT.reduce((a,b)=>a+b,0), totE=R.expT.reduce((a,b)=>a+b,0);
  const finS=R.sav[R.sav.length-1], redY=R.bal.filter(v=>v<0).length;
  const n=disp;
  const lbls=Array.from({length:n},(_,i)=>`${hAge+i}歳`);
  const pr=n>25?0:1.5;

  // ── オプション（animation:false で点滅防止）──────────
  const tickX={font:{size:9},maxTicksLimit:16};
  const tickY={font:{size:9},callback:v=>v.toLocaleString()};
  const tooltipCb={callbacks:{label:ctx=>`${ctx.dataset.label}: ${(ctx.parsed.y||0).toLocaleString()}万円`}};
  const gc='#f1f5f9';
  const opt={responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12,padding:6}},tooltip:tooltipCb},
    scales:{x:{ticks:tickX,grid:{color:gc}},y:{ticks:tickY,grid:{color:gc}}}};
  const stkOpt={responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12,padding:6}},tooltip:tooltipCb},
    scales:{x:{stacked:true,ticks:tickX,grid:{color:gc}},y:{stacked:true,ticks:tickY,grid:{color:gc}}}};

  // ── サマリー HTML ───────────────────────────────────
  const sumHtml=`
    <div class="sc inc"><div class="sc-lbl">総収入（${total}年）</div><div class="sc-val" style="color:#2d7dd2">${ri(totI).toLocaleString()}</div><div class="sc-sub">万円</div></div>
    <div class="sc exp"><div class="sc-lbl">総支出（${total}年）</div><div class="sc-val" style="color:var(--red-l)">${ri(totE).toLocaleString()}</div><div class="sc-sub">万円</div></div>
    <div class="sc ${finS>=0?'bal':'dng'}"><div class="sc-lbl">最終預貯金残高</div><div class="sc-val" style="color:${finS>=0?'var(--green)':'var(--red)'}">${ri(finS).toLocaleString()}</div><div class="sc-sub">万円（${hAge+total-1}歳時点）</div></div>
    <div class="sc ${redY>0?'dng':'bal'}"><div class="sc-lbl">マイナスの年</div><div class="sc-val" style="color:${redY>0?'var(--red)':'var(--green)'}">${redY}</div><div class="sc-sub">年 / ${total}年中</div></div>`;

  // ── データセット計算 ─────────────────────────────────
  // Chart1: 収入・支出・年間収支（常に3系列）
  const d1=[
    {label:'収入',data:R.incT.slice(0,n),backgroundColor:'rgba(37,99,235,.55)',borderRadius:2,type:'bar'},
    {label:'支出',data:R.expT.slice(0,n),backgroundColor:'rgba(234,88,12,.55)',borderRadius:2,type:'bar'},
    {label:'年間収支',data:R.bal.slice(0,n),type:'line',borderColor:'#059669',
      backgroundColor:'rgba(5,150,105,.08)',tension:.3,fill:'origin',pointRadius:pr,borderWidth:2,order:0}
  ];
  // Chart2: 資産推移（可変系列）
  const hasFinAsset=R.finAsset&&R.finAsset.some(v=>v>0);
  const hasLoan=R.lBal&&R.lBal.some(v=>v>0);
  const c2ds=[
    {label:'預貯金残高',data:R.sav.slice(0,n),borderColor:'#059669',
      backgroundColor:'rgba(5,150,105,.12)',fill:'origin',tension:.4,borderWidth:2,pointRadius:pr}
  ];
  if(hasFinAsset){
    c2ds.push({label:'有価証券等',data:R.finAsset.slice(0,n),borderColor:'#f59e0b',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:2,pointRadius:pr});
    c2ds.push({label:'総金融資産',data:R.totalAsset.slice(0,n),borderColor:'#2d7dd2',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:2.5,pointRadius:pr});
  }
  if(hasLoan)
    c2ds.push({label:'ローン残高',data:R.lBal.slice(0,n),borderColor:'#7c3aed',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:1.5,pointRadius:pr,borderDash:[5,3]});
  // Chart4: 支出内訳（可変系列）
  const eduSum=new Array(n).fill(0);
  R.edu.forEach(arr=>arr.slice(0,n).forEach((v,i2)=>eduSum[i2]+=(v||0)));
  const secInvSum=R.secInvest.slice(0,n).map((v,i)=>(v||0)+(R.secBuy?R.secBuy[i]||0:0));
  const otherExp=R.ptx.slice(0,n).map((v,i)=>(v||0)+(R.prk[i]||0));
  const ds4=[{label:'生活費',data:R.lc.slice(0,n),backgroundColor:'rgba(37,99,235,.55)'}];
  if(R.lRep.some(v=>v>0))ds4.push({label:'ローン返済',data:R.lRep.slice(0,n),backgroundColor:'rgba(124,58,237,.55)'});
  if(eduSum.some(v=>v>0))ds4.push({label:'教育費',data:eduSum,backgroundColor:'rgba(217,119,6,.65)'});
  if(isM&&R.rep.some(v=>v>0))ds4.push({label:'修繕積立金',data:R.rep.slice(0,n),backgroundColor:'rgba(8,145,178,.55)'});
  if(secInvSum.some(v=>v>0))ds4.push({label:'投資額',data:secInvSum,backgroundColor:'rgba(5,150,105,.55)'});
  if(otherExp.some(v=>v>0))ds4.push({label:'その他',data:otherExp,backgroundColor:'rgba(107,114,128,.45)'});
  // Chart5: 収入内訳（可変系列）
  const secTotal=new Array(n).fill(0);
  if(R.secRedeemRows)R.secRedeemRows.forEach(row=>row.vals.slice(0,n).forEach((v,i)=>{secTotal[i]+=(v||0);}));
  else if(R.secRedeem)R.secRedeem.slice(0,n).forEach((v,i)=>{secTotal[i]+=(v||0);});
  const ds5=[];
  if(R.hInc.some(v=>v>0))ds5.push({label:'ご主人様手取',data:R.hInc.slice(0,n),backgroundColor:'rgba(37,99,235,.6)'});
  if(R.wInc.some(v=>v>0))ds5.push({label:'奥様手取',data:R.wInc.slice(0,n),backgroundColor:'rgba(219,39,119,.55)'});
  if(R.otherInc&&R.otherInc.some(v=>v>0))ds5.push({label:'副業・その他',data:R.otherInc.slice(0,n),backgroundColor:'rgba(245,158,11,.65)'});
  if(R.insMat&&R.insMat.some(v=>v>0))ds5.push({label:'保険満期金',data:R.insMat.slice(0,n),backgroundColor:'rgba(8,145,178,.6)'});
  if(secTotal.some(v=>v>0))ds5.push({label:'有価証券解約',data:secTotal,backgroundColor:'rgba(5,150,105,.6)'});

  // ── DOM & Chart 更新（点滅防止：グリッドを保持してデータだけ更新）──
  const gridEl=$('ch-graph-grid');
  if(!gridEl){
    // 初回 or タブ切替後：DOM再構築・チャート新規作成
    Object.values(charts).forEach(c=>{try{c.destroy()}catch(e){}});charts={};
    const _rbg=$('right-body');const _gTop=_rbg?_rbg.scrollTop:0;const _gLeft=_rbg?_rbg.scrollLeft:0;
    $('right-body').innerHTML=
      `<div class="sum-row" id="graph-sum-row" style="margin-bottom:12px">${sumHtml}</div>`+
      `<div id="ch-graph-grid" class="ch-grid">`+
      `<div class="ch-card"><div class="ch-title">📊 収入・支出・年間収支</div><div class="ch-wrap"><canvas id="c1"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">🏦 資産推移</div><div class="ch-wrap"><canvas id="c2"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">📚 支出内訳</div><div class="ch-wrap"><canvas id="c4"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">💰 収入内訳</div><div class="ch-wrap"><canvas id="c5"></canvas></div></div>`+
      `</div>`;
    if(_rbg&&(_gTop>0||_gLeft>0)){_rbg.scrollTop=_gTop;_rbg.scrollLeft=_gLeft;}
    charts.c1=new Chart($('c1'),{type:'bar',data:{labels:lbls,datasets:d1},options:opt});
    charts.c2=new Chart($('c2'),{type:'line',data:{labels:lbls,datasets:c2ds},options:opt});
    charts.c4=new Chart($('c4'),{type:'bar',data:{labels:lbls,datasets:ds4},options:stkOpt});
    charts.c5=new Chart($('c5'),{type:'bar',data:{labels:lbls,datasets:ds5},options:stkOpt});
  } else {
    // グリッド既存：サマリーのみ更新、チャートはデータのみ差し替え
    $('graph-sum-row').innerHTML=sumHtml;
    charts.c1.data.labels=lbls;
    d1.forEach((ds,i)=>{if(charts.c1.data.datasets[i])charts.c1.data.datasets[i].data=ds.data;});
    charts.c1.update('none');
    if(charts.c2.data.datasets.length===c2ds.length){
      charts.c2.data.labels=lbls;
      c2ds.forEach((ds,i)=>{charts.c2.data.datasets[i].data=ds.data;});
      charts.c2.update('none');
    } else {
      try{charts.c2.destroy()}catch(e){}
      charts.c2=new Chart($('c2'),{type:'line',data:{labels:lbls,datasets:c2ds},options:opt});
    }
    if(charts.c4.data.datasets.length===ds4.length){
      charts.c4.data.labels=lbls;
      ds4.forEach((ds,i)=>{charts.c4.data.datasets[i].data=ds.data;});
      charts.c4.update('none');
    } else {
      try{charts.c4.destroy()}catch(e){}
      charts.c4=new Chart($('c4'),{type:'bar',data:{labels:lbls,datasets:ds4},options:stkOpt});
    }
    if(charts.c5.data.datasets.length===ds5.length){
      charts.c5.data.labels=lbls;
      ds5.forEach((ds,i)=>{charts.c5.data.datasets[i].data=ds.data;});
      charts.c5.update('none');
    } else {
      try{charts.c5.destroy()}catch(e){}
      charts.c5=new Chart($('c5'),{type:'bar',data:{labels:lbls,datasets:ds5},options:stkOpt});
    }
  }
}
