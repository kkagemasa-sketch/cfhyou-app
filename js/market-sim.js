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
    // DC（企業型確定拠出年金）
    const dcMatch=parseFloat(document.getElementById(`dc-${p}-matching`)?.value)||0;
    const dcEmp=parseFloat(document.getElementById(`dc-${p}-employer`)?.value)||0;
    const dcInit=parseFloat(document.getElementById(`dc-${p}-init-bal`)?.value)||0;
    if(dcMatch>0||dcEmp>0||dcInit>0){
      items.push({key:`dc-${p}`, label:`DC（${pLbl}）`, kind:'equity'});
    }
    // iDeCo
    const ideMonthly=parseFloat(document.getElementById(`ideco-${p}-monthly`)?.value)||0;
    const ideInit=parseFloat(document.getElementById(`ideco-${p}-init-bal`)?.value)||0;
    if(ideMonthly>0||ideInit>0){
      items.push({key:`ideco-${p}`, label:`iDeCo（${pLbl}）`, kind:'equity'});
    }
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

  const hAge = parseInt(document.getElementById('husband-age')?.value)||30;
  const wAge = parseInt(document.getElementById('wife-age')?.value)||29;
  const cYear = (typeof getCfStartYear==='function')?getCfStartYear():new Date().getFullYear();

  wrap.innerHTML=marketShocks.map((sh,idx)=>{
    const mode = sh.mode||'historical'; // 'historical' | 'manual' | 'replay50'
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
    // タイミング解決結果の表示
    const startI = mspResolveStartIdx(sh, hAge, wAge);
    let timingResolved = '';
    if(startI>=0){
      const hAgeAt = hAge+startI;
      const yearAt = cYear+startI;
      timingResolved = `<span style="color:#059669;font-weight:700">◆ ${startI+1}年目 (${yearAt}年) / ご主人${hAgeAt}歳</span>`;
    }else{
      timingResolved = `<span style="color:#94a3b8">（タイミング未解決）</span>`;
    }
    // 手動モード入力欄
    const manualDrop = sh.manual?.dropPct ?? 30;
    const manualRecovery = sh.manual?.recoveryYrs ?? 3;
    // 対象指数選択（manual用）
    const manualIdx = sh.manual?.index || 'sp500';
    const idxSelect = `<select onchange="mspSetManualIndex('${sh.id}',this.value)">
      <option value="sp500"${manualIdx==='sp500'?' selected':''}>S&P500</option>
      <option value="acwi"${manualIdx==='acwi'?' selected':''}>オルカン</option>
      <option value="nikkei"${manualIdx==='nikkei'?' selected':''}>日経平均</option>
      <option value="usdjpy"${manualIdx==='usdjpy'?' selected':''}>USD/JPY</option>
    </select>`;
    // カード本体
    const isActive = sh.active!==false;
    return `
      <div class="msp-shock-card${isActive?'':' msp-shock-inactive'}">
        <div class="msp-shock-card-hdr">
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer">
            <input type="checkbox" ${isActive?'checked':''} onchange="mspToggleActive('${sh.id}',this.checked)">
            <span class="msp-shock-card-title">シナリオ ${idx+1}</span>
          </label>
          <button class="msp-btn-del" onclick="mspDelShock('${sh.id}')">削除</button>
        </div>
        <div class="msp-shock-field">
          <label>モード</label>
          <select onchange="mspSetMode('${sh.id}',this.value)">
            <option value="historical"${mode==='historical'?' selected':''}>📜 過去相場再生（単発ショック）</option>
            <option value="replay50"${mode==='replay50'?' selected':''}>📅 過去50年ヒストリカル全期間再生</option>
            <option value="manual"${mode==='manual'?' selected':''}>✏️ 手動指定</option>
          </select>
        </div>
        ${mode==='historical'?(function(){
          const sc=MARKET_SCENARIOS[sh.preset];
          const desc=sc?.description||'';
          return `
          <div class="msp-shock-field">
            <label>プリセット</label>
            <select onchange="mspSetShockPreset('${sh.id}',this.value)">${presetOpts}</select>
          </div>
          ${desc?`<div style="font-size:10px;color:#475569;background:#f1f5f9;border-left:3px solid #c2185b;padding:5px 8px;margin:2px 0 6px;line-height:1.5;border-radius:0 5px 5px 0">📖 ${desc}</div>`:''}
        `;})():mode==='replay50'?(function(){
          const histStart = sh.historicalStartYear||1976;
          const yrOpts = HISTORICAL_50YR.years.map(y=>`<option value="${y}"${y===histStart?' selected':''}>${y}年〜</option>`).join('');
          return `
            <div class="msp-shock-field">
              <label>開始年</label>
              <select onchange="mspSetHistoricalStart('${sh.id}',this.value)" style="flex:1">${yrOpts}</select>
              <button type="button" onclick="mspShowHistoricalTable('${sh.id}')" style="margin-left:6px;padding:4px 10px;background:#1e3a5f;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap">📊 過去データを見る</button>
            </div>
            <div style="font-size:10px;color:#64748b;padding:3px 6px;line-height:1.4">
              CF表1年目から、上記の開始年以降の実際のリターンを順番に適用します。<br>
              例: 1976年スタート → CF1年目=1976年、2年目=1977年...<br>
              <span style="color:#059669">各証券の指数割当（S&P500/オルカン等）に対応したデータが自動で適用されます。</span>
            </div>
          `;
        })():`
          <div class="msp-shock-field"><label>対象指数</label>${idxSelect}</div>
          <div class="msp-shock-field">
            <label>下落率(%)</label>
            <input type="number" min="0" max="100" step="1" value="${manualDrop}" onchange="mspSetManualDrop('${sh.id}',this.value)">
          </div>
          <div class="msp-shock-field">
            <label>回復年数</label>
            <input type="number" min="1" max="30" value="${manualRecovery}" onchange="mspSetManualRecovery('${sh.id}',this.value)">
          </div>
        `}
        ${mode==='replay50'?'':`
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
        <div style="font-size:10px;padding:3px 0 0 6px;">${timingResolved}</div>
        `}
      </div>
    `;
  }).join('');
}

// ===== ONにする/シナリオ追加・変更・削除 =====
function mspAddShock(){
  const firstKey=Object.keys(MARKET_SCENARIOS)[0];
  marketShocks.push({
    id: ++_marketShockId,
    mode: 'replay50',
    preset: firstKey,
    historicalStartYear: HISTORICAL_50YR.startYear,
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
  if(sh){sh.preset=val;mspRenderShockList();if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspToggleActive(id,on){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.active=!!on;mspRenderShockList();if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetMode(id,mode){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(!sh)return;
  sh.mode=mode;
  if(mode==='manual' && !sh.manual){sh.manual={dropPct:30, recoveryYrs:3, index:'sp500'};}
  if(mode==='replay50' && !sh.historicalStartYear){sh.historicalStartYear=1976; sh.manual=sh.manual||{}; sh.manual.index=sh.manual.index||'sp500';}
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
function mspSetManualDrop(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.manual=sh.manual||{};sh.manual.dropPct=Math.max(0,parseFloat(val)||0);
    if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetManualRecovery(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.manual=sh.manual||{};sh.manual.recoveryYrs=Math.max(1,parseInt(val)||1);
    if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetManualIndex(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.manual=sh.manual||{};sh.manual.index=val;
    if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
}
function mspSetHistoricalStart(id,val){
  const sh=marketShocks.find(s=>String(s.id)===String(id));
  if(sh){sh.historicalStartYear=parseInt(val)||1976;
    if(typeof scheduleAutoSave==='function')scheduleAutoSave();if(typeof render==='function')render();}
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
function mspToggleEnabled(on){
  marketShockEnabled=!!on;
  _mspSyncEnabledUi();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
// 適用ボタン＋ヒント文＋ヘッダーボタンの見た目を一元同期
function _mspSyncEnabledUi(){
  const btnHdr=document.getElementById('btn-market-sim');
  if(btnHdr){btnHdr.classList.toggle('msim-active', marketShockEnabled && marketShocks.length>0);}
  const hint=document.getElementById('msp-enabled-hint');
  if(hint){hint.textContent = marketShockEnabled
    ? `登録中のシナリオ${marketShocks.length}件を適用中`
    : '適用OFF（シナリオ設定は保存されています）';}
  const btn=document.getElementById('msp-enabled-btn');
  if(btn){
    btn.classList.toggle('on', !!marketShockEnabled);
    btn.textContent = marketShockEnabled ? '✓ 適用中（クリックで解除）' : '▶ 適用する';
  }
}
function mspClearAll(){
  if(!confirm('全てのシナリオを削除してよいですか?'))return;
  marketShocks=[];
  mspRenderShockList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
// 一括操作: 有価証券（積立・一括）全てに指数を割当
function mspBulkAssignIndex(idx){
  const items=mspCollectSecurities();
  items.filter(it=>it.kind==='equity').forEach(it=>{secIndexMap[it.key]=idx;});
  mspRenderIndexList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
// 一括操作: 保険全てに指数を割当
function mspBulkAssignInsurance(idx){
  const items=mspCollectSecurities();
  items.filter(it=>it.kind==='insurance').forEach(it=>{secIndexMap[it.key]=idx;});
  mspRenderIndexList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}
// 一括操作: 指数割当を全解除
function mspClearIndexAssign(){
  if(!confirm('全ての証券・保険の指数割当を解除してよいですか?'))return;
  secIndexMap={};
  mspRenderIndexList();
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
  if(typeof render==='function')render();
}

function mspRenderAll(){
  mspRenderIndexList();
  mspRenderShockList();
  const cmp=document.getElementById('msp-compare');
  if(cmp)cmp.checked=!!marketShockCompareOn;
  _mspSyncEnabledUi();
}

// ===== 計算用: 指定年iでの指数別リターン =====
// cf-calc.js から呼び出し: getMarketReturnAtYear('sp500', i, hAge, wAge) → 0.05 (5%) など
// 複数シナリオ同時発生時: 掛け合わせ（実効リターン = (1+r1)(1+r2)-1）
// その年(yearIdx)にいずれかのシナリオが影響しているか判定（CF表ヘッダー装飾用）
function isShockActiveAtYear(yearIdx, hAge, wAge){
  if(typeof marketShockEnabled!=='undefined' && !marketShockEnabled) return false;
  if(!marketShocks||marketShocks.length===0)return false;
  for(const sh of marketShocks){
    if(sh.active===false)continue;
    if(sh.mode==='replay50'){
      // 過去50年ヒストリカル再生: CF 1年目からデータ終了まで
      const startY = sh.historicalStartYear||HISTORICAL_50YR.startYear;
      const remaining = HISTORICAL_50YR.endYear - startY + 1;
      if(yearIdx < remaining) return true;
      continue;
    }
    const startI = mspResolveStartIdx(sh, hAge, wAge);
    if(startI<0)continue;
    const offset = yearIdx - startI;
    if(offset<0)continue;
    let len;
    if(sh.mode==='manual'){
      len = 1 + Math.max(1, sh.manual?.recoveryYrs||1);
    }else{
      const sc = MARKET_SCENARIOS[sh.preset];
      if(!sc)continue;
      len = Math.max(...['sp500','acwi','nikkei','usdjpy'].map(k=>sc.returns[k]?.length||0));
    }
    if(offset<len) return true;
  }
  return false;
}

function getMarketReturnAtYear(indexKey, yearIdx, hAge, wAge){
  if(typeof marketShockEnabled!=='undefined' && !marketShockEnabled) return null;
  if(!marketShocks||marketShocks.length===0)return null;
  let totalR=null;
  for(const sh of marketShocks){
    if(sh.active===false)continue;
    // 過去50年ヒストリカル再生モード
    // 各証券はsecIndexMapで割り当てられた指数(indexKey)のヒストリカルデータを自動適用
    // manual.indexフィルタは不要（全指数分のデータが存在するため）
    if(sh.mode==='replay50'){
      const startY = sh.historicalStartYear||HISTORICAL_50YR.startYear;
      const offsetY = startY - HISTORICAL_50YR.startYear + yearIdx;
      const arr = HISTORICAL_50YR.returns[indexKey];
      if(!arr || offsetY<0 || offsetY>=arr.length) continue;
      const r = arr[offsetY]/100;
      totalR = totalR===null ? r : ((1+totalR)*(1+r)-1);
      continue;
    }
    const startI = mspResolveStartIdx(sh, hAge, wAge);
    if(startI<0)continue;
    const offset = yearIdx - startI;
    if(offset<0)continue;
    let r=null;
    if(sh.mode==='manual'){
      // 手動モード: 0年目に下落、以降 N年で均等に回復
      if(sh.manual?.index !== indexKey) continue; // 対象指数が違えばスキップ
      const drop = (sh.manual?.dropPct||0)/100;
      const rec = Math.max(1, sh.manual?.recoveryYrs||1);
      if(offset===0){ r = -drop; }
      else if(offset<=rec){
        // 回復時の年率: 複利で元本復帰: (1-drop) * (1+gain)^rec = 1 → gain = (1/(1-drop))^(1/rec) - 1
        const gain = Math.pow(1/Math.max(0.0001,1-drop), 1/rec) - 1;
        r = gain;
      }else{ continue; } // 回復期間終了、シナリオ影響なし
    }else{
      // 過去相場再生モード（デフォルト）
      const sc=MARKET_SCENARIOS[sh.preset];
      if(!sc)continue;
      const arr = sc.returns[indexKey];
      if(!arr || offset>=arr.length)continue;
      r = arr[offset]/100;
    }
    if(r===null)continue;
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

// ===== 過去50年の主要イベント辞書 =====
const HISTORICAL_EVENTS = {
  1976:'S&P500大幅反発',
  1978:'第2次オイルショック',
  1979:'イラン革命・第2次石油危機',
  1980:'米インフレ・ドル高',
  1981:'日本株バブル序章',
  1985:'プラザ合意（円高へ転換）',
  1987:'ブラックマンデー',
  1989:'日経38,915円ピーク',
  1990:'日本バブル崩壊',
  1991:'湾岸戦争・不動産崩落',
  1994:'メキシコ通貨危機',
  1995:'阪神淡路大震災・超円高',
  1997:'アジア通貨危機・山一破綻',
  1998:'LTCM破綻・ロシア危機',
  2000:'ITバブル崩壊',
  2001:'米同時多発テロ',
  2002:'米IT不況・企業会計スキャンダル',
  2003:'イラク戦争',
  2008:'リーマンショック',
  2009:'金融危機底・S&P500反発',
  2011:'東日本大震災・欧州債務危機',
  2013:'アベノミクス始動',
  2015:'チャイナショック',
  2016:'ブレグジット・トランプ当選',
  2018:'米中貿易戦争',
  2020:'コロナショック',
  2021:'コロナ後金融緩和バブル',
  2022:'ロシアのウクライナ侵攻・世界インフレ',
  2024:'日銀マイナス金利解除',
  2025:'トランプ関税ショック（推定）'
};

// 開始年を「この歴史年をCF表の◯年に配置」から逆算して変更
function mspApplyHistStartFromCF(shId, histYear, cfYearTarget){
  const cYear = (typeof getCfStartYear==='function')?getCfStartYear():new Date().getFullYear();
  const cfY = parseInt(cfYearTarget);
  const hY  = parseInt(histYear);
  if(!cfY || !hY) return;
  let newStart = hY - (cfY - cYear);
  // クランプ: データ範囲内
  if(newStart < HISTORICAL_50YR.startYear) newStart = HISTORICAL_50YR.startYear;
  if(newStart > HISTORICAL_50YR.endYear)   newStart = HISTORICAL_50YR.endYear;
  // 本体select反映
  const sh = marketShocks.find(s=>String(s.id)===String(shId));
  if(sh){
    sh.historicalStartYear = newStart;
    if(typeof scheduleAutoSave==='function') scheduleAutoSave();
    if(typeof render==='function') render();
  }
  // モーダル再描画（スクロール位置保持）
  const scrollBody = document.querySelector('#msp-hist-modal [data-scroll]');
  const savedScroll = scrollBody?.scrollTop || 0;
  mspShowHistoricalTable(shId);
  setTimeout(()=>{
    const newBody = document.querySelector('#msp-hist-modal [data-scroll]');
    if(newBody) newBody.scrollTop = savedScroll;
  },0);
}

// ===== 過去50年データ モーダル表示 =====
function mspShowHistoricalTable(shId){
  // 既存モーダル除去
  document.getElementById('msp-hist-modal')?.remove();

  const sh = marketShocks.find(s=>String(s.id)===String(shId));
  const startY = sh?.historicalStartYear || HISTORICAL_50YR.startYear;
  const cYear = (typeof getCfStartYear==='function')?getCfStartYear():new Date().getFullYear();

  const years = HISTORICAL_50YR.years;
  const R = HISTORICAL_50YR.returns;

  // 統計（各資産の平均・最悪・最良）
  const stats = {};
  ['sp500','acwi','nikkei','usdjpy'].forEach(k=>{
    const arr = R[k];
    let sum=0, mn=Infinity, mx=-Infinity, mnY=0, mxY=0;
    arr.forEach((v,i)=>{
      sum+=v;
      if(v<mn){mn=v;mnY=years[i]}
      if(v>mx){mx=v;mxY=years[i]}
    });
    stats[k] = { avg:(sum/arr.length).toFixed(1), min:mn, minY:mnY, max:mx, maxY:mxY };
  });

  const assetLbl = { sp500:'S&P500', acwi:'オルカン', nikkei:'日経平均', usdjpy:'USD/JPY' };
  const colorOf = v => v>=20?'#b91c1c':v>=10?'#dc2626':v>=0?'#059669':v>=-10?'#f59e0b':v>=-20?'#ea580c':'#7f1d1d';
  const bgOf    = v => v>=20?'#fee2e2':v>=10?'#fef3c7':v>=0?'#d1fae5':v>=-10?'#fef3c7':v>=-20?'#fed7aa':'#fecaca';

  // 行生成
  const rows = years.map((y,i)=>{
    const inRange = y >= startY;
    const cfOffset = y - startY;
    const cfYearActual = cYear + cfOffset;  // 開始年前は cYear より小さい値
    const evt = HISTORICAL_EVENTS[y] || '';
    const rowStyle = inRange
      ? (y===startY
          ? 'background:#dbeafe;border-left:4px solid #1e40af;font-weight:700'
          : 'background:#eff6ff')
      : 'background:#f8fafc';
    const cellFor = (k)=>{
      const v = R[k][i];
      if(!inRange) return `<td style="text-align:right;padding:4px 8px;color:#94a3b8">${v>0?'+':''}${v}%</td>`;
      const isMin = v===stats[k].min;
      const isMax = v===stats[k].max;
      const extra = isMin?'outline:2px solid #dc2626;outline-offset:-2px;':isMax?'outline:2px solid #059669;outline-offset:-2px;':'';
      return `<td style="text-align:right;padding:4px 8px;color:${colorOf(v)};background:${bgOf(v)};font-weight:600;${extra}">${v>0?'+':''}${v}%</td>`;
    };
    // CF年 編集可能入力（入力変更で開始年が自動調整される）
    const cfInputBg = inRange ? '#fff' : '#f1f5f9';
    const cfInputColor = inRange ? '#1e3a5f' : '#94a3b8';
    const cfInput = `<input type="number" value="${cfYearActual}" min="1900" max="2200"
      onchange="mspApplyHistStartFromCF('${shId}', ${y}, this.value)"
      style="width:68px;padding:3px 4px;border:1px solid #94a3b8;border-radius:3px;text-align:center;font-size:11px;color:${cfInputColor};background:${cfInputBg};font-weight:600"
      title="この歴史年(${y})をCF表の何年に配置したいか入力">`;
    const cfOffsetLbl = inRange ? `<span style="color:#64748b;font-size:10px">CF ${cfOffset+1}年目</span>` : '<span style="color:#cbd5e1;font-size:10px">範囲外</span>';
    const evtCol = evt
      ? `<td style="padding:4px 8px;font-size:10px;color:${inRange?'#7c2d12':'#94a3b8'};line-height:1.3">${evt}</td>`
      : `<td style="padding:4px 8px"></td>`;
    return `<tr style="${rowStyle}">
      <td style="padding:4px 8px;text-align:center;font-weight:600;white-space:nowrap">${y}</td>
      <td style="padding:4px 8px;text-align:center;white-space:nowrap">${cfInput}<br>${cfOffsetLbl}</td>
      ${evtCol}
      ${cellFor('sp500')}
      ${cellFor('acwi')}
      ${cellFor('nikkei')}
      ${cellFor('usdjpy')}
    </tr>`;
  }).join('');

  const statBadge = (k)=>{
    const s = stats[k];
    return `<div style="background:#fff;border:1px solid #cbd5e1;border-radius:6px;padding:6px 10px;min-width:140px">
      <div style="font-size:11px;color:#475569;font-weight:700;margin-bottom:3px">${assetLbl[k]}</div>
      <div style="font-size:10px;color:#64748b">平均: <b style="color:#1e3a5f">${s.avg>0?'+':''}${s.avg}%</b></div>
      <div style="font-size:10px;color:#64748b">最悪: <b style="color:#dc2626">${s.min>0?'+':''}${s.min}% (${s.minY})</b></div>
      <div style="font-size:10px;color:#64748b">最良: <b style="color:#059669">${s.max>0?'+':''}${s.max}% (${s.maxY})</b></div>
    </div>`;
  };

  const modal = document.createElement('div');
  modal.id = 'msp-hist-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  modal.innerHTML = `
    <div style="background:#fff;border-radius:10px;max-width:920px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.3);font-family:'Meiryo','Yu Gothic UI',sans-serif">
      <div style="background:#1e3a5f;color:#fff;padding:12px 18px;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:15px;font-weight:700">📊 過去50年の運用データ（1976-2025）</div>
          <div style="font-size:11px;opacity:0.85;margin-top:3px">
            選択中の開始年: <b>${startY}年</b> → CF表 ${cYear}年〜${cYear+(2025-startY)}年 に適用（${2025-startY+1}年分）
          </div>
        </div>
        <button onclick="document.getElementById('msp-hist-modal').remove()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);border-radius:4px;padding:4px 10px;cursor:pointer;font-size:14px">✕ 閉じる</button>
      </div>
      <div style="padding:12px 18px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;flex-wrap:wrap">
        ${statBadge('sp500')}${statBadge('acwi')}${statBadge('nikkei')}${statBadge('usdjpy')}
      </div>
      <div style="padding:8px 18px 4px;background:#fffbeb;border-bottom:1px solid #fde68a;font-size:11px;color:#92400e;line-height:1.5">
        💡 <b>青背景=選択中の開始年</b>／薄青=適用範囲／灰色=適用外（開始年より前）<br>
        <span style="color:#dc2626">赤枠</span>=各資産の最悪年／<span style="color:#059669">緑枠</span>=各資産の最良年<br>
        ✍️ <b>CF表対応列は編集可能</b>：例えば「リーマン2008年をCF表2030年に」と入力すると、開始年が自動計算されます
      </div>
      <div data-scroll style="flex:1;overflow:auto;padding:0 18px 14px">
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          <thead style="position:sticky;top:0;background:#f1f5f9;z-index:1">
            <tr>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:center;white-space:nowrap">西暦</th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:center;white-space:nowrap">CF表対応<br><span style="font-size:10px;color:#64748b;font-weight:400">（編集可）</span></th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:left;white-space:nowrap">主要イベント</th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:right">S&P500</th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:right">オルカン</th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:right">日経平均</th>
              <th style="padding:8px;border-bottom:2px solid #1e3a5f;text-align:right">USD/JPY</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="padding:8px 18px;background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 10px 10px;font-size:10px;color:#64748b;line-height:1.5">
        出典: S&P Global, 日経新聞, 日銀為替レート, MSCI, MUFJヒストリカル等を参考にした概算値（小数第1位四捨五入）。<br>
        信託報酬・売買手数料・為替スプレッド等のコストは含みません。過去の実績は将来の成果を保証するものではありません。
      </div>
    </div>`;
  document.body.appendChild(modal);
}
