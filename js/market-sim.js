// market-sim.js — 下落シミュレーション UI & ロジック
// - サイドパネル表示/非表示
// - シナリオの登録/削除（複数同時可）
// - 各証券への指数割当
// - 適用年リターン配列の生成（cf-calc.js から参照）

// ===== パネル開閉 =====
function toggleMarketSimPanel(){
  const panel=document.getElementById('market-sim-panel');
  if(!panel)return;
  const hidden=panel.style.display==='none'||panel.style.display==='';
  if(hidden){
    panel.style.display='flex';
    document.body.classList.add('market-sim-on');
    mspRenderAll();
  }else{
    panel.style.display='none';
    document.body.classList.remove('market-sim-on');
  }
}

// ===== 指数割当リスト =====
// 現在アプリに登録されている有価証券・外貨建て保険を列挙
function mspCollectSecurities(){
  const items=[];
  ['h','w'].forEach(p=>{
    const pLbl=p==='h'?'ご主人':'奥様';
    // 積立投資
    document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
      const sid=el.id.split('-').pop();
      const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
      const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
      if(!isAccum)return;
      items.push({key:`sec-accum-${p}-${sid}`, label:customLabel||`積立投資(${pLbl})`, kind:'equity'});
    });
    // 一括投資
    document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
      const sid=el.id.split('-').pop();
      const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
      const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
      if(!isStock)return;
      items.push({key:`sec-stk-${p}-${sid}`, label:customLabel||`一括投資(${pLbl})`, kind:'equity'});
    });
    // 一時払い保険
    document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`).forEach(el=>{
      const iid=el.id.split('-').pop();
      const customLbl=document.getElementById(`ins-lump-label-${p}-${iid}`)?.value?.trim()||'';
      items.push({key:`ins-lump-${p}-${iid}`, label:customLbl||`一時払い保険(${pLbl})`, kind:'insurance'});
    });
    // 積立保険
    document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
      const iid=el.id.split('-').pop();
      const customLbl=document.getElementById(`ins-label-${p}-${iid}`)?.value?.trim()||'';
      items.push({key:`ins-m-${p}-${iid}`, label:customLbl||`積立保険(${pLbl})`, kind:'insurance'});
    });
  });
  return items;
}

// ===== 指数割当リストを描画 =====
function mspRenderIndexList(){
  const wrap=document.getElementById('msp-index-list');
  if(!wrap)return;
  const items=mspCollectSecurities();
  if(items.length===0){
    wrap.innerHTML='<div style="color:#94a3b8;font-size:11px;padding:8px">（証券・保険を登録するとここに表示）</div>';
    return;
  }
  // 保険のみ選択肢にUSD/JPYを出す
  const optsEq=`<option value="none">指数なし</option><option value="sp500">S&P500</option><option value="acwi">オルカン（全世界株）</option><option value="nikkei">日経平均</option>`;
  const optsIns=`<option value="none">指数なし</option><option value="usdjpy">USD/JPY（外貨建て）</option><option value="sp500">S&P500</option><option value="acwi">オルカン</option><option value="nikkei">日経平均</option>`;
  wrap.innerHTML=items.map(it=>{
    const cur=secIndexMap[it.key]||'none';
    const opts=it.kind==='insurance'?optsIns:optsEq;
    const sel=opts.replace(`value="${cur}"`,`value="${cur}" selected`);
    return `<div class="msp-index-row">
      <span>${it.label}</span>
      <select onchange="mspSetIndex('${it.key}',this.value)">${sel}</select>
    </div>`;
  }).join('');
}

function mspSetIndex(key,val){
  if(val==='none')delete secIndexMap[key];
  else secIndexMap[key]=val;
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}

// ===== シナリオ登録リストを描画 =====
function mspRenderShockList(){
  const wrap=document.getElementById('msp-shock-list');
  if(!wrap)return;
  if(marketShocks.length===0){
    wrap.innerHTML='<div style="color:#94a3b8;font-size:11px;padding:8px 0">（シナリオ未登録）</div>';
    return;
  }
  // プリセット選択肢をカテゴリ別に構築
  const groups={};
  Object.entries(MARKET_SCENARIOS).forEach(([key,sc])=>{
    const cat=sc.category||'stock';
    if(!groups[cat])groups[cat]=[];
    groups[cat].push({key,label:sc.label});
  });
  const optsHtml=Object.entries(SCENARIO_CATEGORIES)
    .sort(([,a],[,b])=>a.order-b.order)
    .map(([cat,meta])=>{
      const list=(groups[cat]||[]).map(s=>`<option value="${s.key}">${s.label}</option>`).join('');
      return `<optgroup label="${meta.label}">${list}</optgroup>`;
    }).join('');

  wrap.innerHTML=marketShocks.map((sh,idx)=>{
    const presetOpts=optsHtml.replace(`value="${sh.preset}"`,`value="${sh.preset}" selected`);
    const timingVal=sh.timing?.type==='age'?sh.timing.age:'';
    const eventVal=sh.timing?.type==='event'?sh.timing.key:'';
    const isEvent=sh.timing?.type==='event';
    const eventOpts=[
      {k:'h-retire',label:'🎯 ご主人の退職時'},
      {k:'w-retire',label:'🎯 奥様の退職時'},
      {k:'h-pension',label:'🎯 ご主人の年金開始時'},
      {k:'child1-univ',label:'🎯 第一子の大学入学時'},
      {k:'child2-univ',label:'🎯 第二子の大学入学時'},
      {k:'now',label:'🎯 現在（1年目）'}
    ].map(e=>`<option value="${e.k}"${eventVal===e.k?' selected':''}>${e.label}</option>`).join('');
    return `
      <div class="msp-shock-card">
        <div class="msp-shock-card-hdr">
          <span class="msp-shock-card-title">シナリオ ${idx+1}</span>
          <button class="msp-btn-del" onclick="mspDelShock('${sh.id}')">削除</button>
        </div>
        <div class="msp-shock-field">
          <label>プリセット</label>
          <select onchange="mspSetShockPreset('${sh.id}',this.value)">${presetOpts}</select>
        </div>
        <div class="msp-shock-field">
          <label>タイミング種別</label>
          <select onchange="mspSetTimingType('${sh.id}',this.value)">
            <option value="age"${!isEvent?' selected':''}>年齢で指定</option>
            <option value="event"${isEvent?' selected':''}>ライフイベントに連動</option>
          </select>
        </div>
        <div class="msp-shock-field">
          ${isEvent?`<label>イベント</label><select onchange="mspSetTimingEvent('${sh.id}',this.value)">${eventOpts}</select>`
            :`<label>ご主人年齢</label><input type="number" min="0" max="120" value="${timingVal}" onchange="mspSetTimingAge('${sh.id}',this.value)">`}
        </div>
      </div>
    `;
  }).join('');
}

// ===== ONにする/シナリオ追加・変更・削除 =====
function mspAddShock(){
  const firstKey=Object.keys(MARKET_SCENARIOS)[0];
  marketShocks.push({
    id: ++_marketShockId,
    preset: firstKey,
    timing: {type:'event', key:'h-retire'},
    active: true
  });
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
function mspDelShock(id){
  marketShocks=marketShocks.filter(s=>String(s.id)!==String(id));
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
function mspSetShockPreset(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.preset=val;if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetTimingType(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(!sh)return;
  sh.timing = val==='age' ? {type:'age',age:60} : {type:'event',key:'h-retire'};
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
function mspSetTimingAge(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh&&sh.timing.type==='age'){sh.timing.age=parseInt(val)||60;if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetTimingEvent(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh&&sh.timing.type==='event'){sh.timing.key=val;if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspToggleCompare(on){
  marketShockCompareOn=!!on;
  if(typeof render==='function')render();
}
function mspClearAll(){
  if(!confirm('全てのシナリオを削除してよいですか?'))return;
  marketShocks=[];
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}

function mspRenderAll(){
  mspRenderIndexList();
  mspRenderShockList();
  const cmp=document.getElementById('msp-compare');
  if(cmp)cmp.checked=!!marketShockCompareOn;
}

// ===== 計算用: 指定年iでの指数別リターン =====
// cf-calc.js から呼び出し: getMarketReturnAtYear('sp500', i, hAge, wAge) → 0.05 (5%) など
// 複数シナリオ同時発生時: 掛け合わせ（実効リターン = (1+r1)(1+r2)-1）
function getMarketReturnAtYear(indexKey, yearIdx, hAge, wAge){
  if(!marketShocks||marketShocks.length===0)return null;
  let totalR=null;
  for(const sh of marketShocks){
    if(!sh.active)continue;
    const sc=MARKET_SCENARIOS[sh.preset];
    if(!sc)continue;
    const startI = mspResolveStartIdx(sh, hAge, wAge);
    if(startI<0)continue;
    const offset = yearIdx - startI;
    if(offset<0)continue;
    const arr = sc.returns[indexKey];
    if(!arr || offset>=arr.length)continue;
    const r = arr[offset]/100;
    totalR = totalR===null ? r : ((1+totalR)*(1+r)-1);
  }
  return totalR;
}

// シナリオの開始年インデックスを算出（CF表のi=0が現在年）
function mspResolveStartIdx(sh, hAge, wAge){
  const t=sh.timing;
  if(!t)return -1;
  if(t.type==='age'){
    return Math.max(0, (parseInt(t.age)||0) - hAge);
  }
  if(t.type==='event'){
    switch(t.key){
      case 'h-retire': {
        const retAge=parseInt(document.getElementById('retire-age')?.value)||60;
        return Math.max(0, retAge - hAge);
      }
      case 'w-retire': {
        const retAge=parseInt(document.getElementById('w-retire-age')?.value)||60;
        return Math.max(0, retAge - wAge);
      }
      case 'h-pension': {
        const rec=parseInt(document.getElementById('pension-h-receive')?.value)||65;
        return Math.max(0, rec - hAge);
      }
      case 'child1-univ': {
        const c1=parseInt(document.getElementById('ca-1')?.value)||0;
        return Math.max(0, 19 - c1);
      }
      case 'child2-univ': {
        const c2=parseInt(document.getElementById('ca-2')?.value)||0;
        return Math.max(0, 19 - c2);
      }
      case 'now': return 0;
    }
  }
  return -1;
}
