// ===== 🧪 Q&A形式 万が一機能 =====
// 既存コード（setRTab, renderContingency, mgTarget等）は一切変更せず、
// 専用の名前空間 mgQA_* で実装する

// 🧪 syncMGCarFromNormal を無効化（Q&A側で車・駐車場を直接設定するため）
// 旧UIは非表示化されているので副作用なし
window.addEventListener('load', function(){
  if(typeof window.syncMGCarFromNormal === 'function'){
    window._origSyncMGCarFromNormal = window.syncMGCarFromNormal;
    window.syncMGCarFromNormal = function(){
      // no-op when Q&A tab is active, otherwise forward
      if(window._mgQA_activeTabId) return;
      return window._origSyncMGCarFromNormal.apply(this, arguments);
    };
    console.log('[mgQA] syncMGCarFromNormal wrapped (skipped when QA tab active)');
  }
});
//
// 構造:
//  [左パネル] 通常の入力 + 万が一ボタン + (アクティブな万が一タブの) Q&Aパネル
//  [右パネル] 通常CF表タブ / 万が一タブ(複数)
//  万が一タブ切替時 → 左のQ&Aもそのタブ用に切替
//  通常CF表タブ切替時 → 左のQ&Aは非表示

const mgQA_tabs = [];  // {id, target, name, state}
const mgQA_counter = { h: 0, w: 0 };

// --- タブ追加（ボタンから呼ばれる） ---
function mgQA_addTab(target){
  mgQA_counter[target]++;
  const id = `mgqa-${target}-${Date.now()}`;
  const label = target==='h'?'ご主人様':'奥様';
  const n = mgQA_counter[target];
  const name = n>1 ? `${label} 万が一 ${n}` : `${label} 万が一`;
  mgQA_tabs.push({
    id, target, name,
    state: mgQA_buildDefaultState(target)
  });
  mgQA_renderTabs();
  mgQA_switchTab(id);
}

// --- デフォルト状態（前タブコピー or 初期値） ---
function mgQA_buildDefaultState(target){
  // 前回の同target優先、なければ最後のタブ、なければ初期値
  const prev = [...mgQA_tabs].reverse().find(t=>t.target===target) ||
               [...mgQA_tabs].reverse()[0];
  if(prev) return JSON.parse(JSON.stringify(prev.state));
  // 通常CFから車・駐車場の現在設定を読込
  const firstCar = document.querySelector('#car-list > [id^="car-"]');
  const carD = { type:'new', price:300, cycle:7, insp:10, firstAge:0, endAge:0 };
  // 生存配偶者の現在年齢（target='h'なら奥様、target='w'ならご主人様）
  const survivorAge = target==='h'
    ? (mgQA_iv('wife-age') || 0)
    : (mgQA_iv('husband-age') || 0);
  if(firstCar){
    const cid = firstCar.id.replace('car-','');
    carD.type = firstCar.dataset.type || 'new';
    carD.price = mgQA_fv(`car-${cid}-price`) || 300;
    carD.cycle = mgQA_iv(`car-${cid}-cycle`) || 7;
    carD.insp = mgQA_fv(`car-${cid}-insp`) || 10;
    // 初回購入年齢: 通常CFは「年目」入力なので、生存者の現在年齢 + (年目-1) で換算
    const firstYearOffset = mgQA_iv(`car-${cid}-first`) || 1;
    carD.firstAge = survivorAge>0 ? (survivorAge + Math.max(0, firstYearOffset-1)) : 0;
    // 手放す年齢: 通常CFは「歳」入力なのでそのまま継承
    carD.endAge = mgQA_iv(`car-${cid}-end-age`) || 0;
  }
  const parkMonthlyDef = mgQA_iv('parking') || 15000;
  // 駐車場の年齢範囲も通常CFから継承（歳単位なので直接）
  const parkFromDef = mgQA_iv('park-from-age') || 0;
  const parkToDef = mgQA_iv('park-to-age') || 0;
  return {
    deathYear: 1,
    insurances: [{ type:'none', amount:0 }],
    pensionMode: 'auto',
    pensionManual: 0,
    // 配偶者(生存者)の就労収入: 'same'=通常時と同じ / 'override'=段階設定で上書き
    incomeMode: 'same',
    incomeSteps: [
      // { ageFrom, ageTo, netFrom, netTo } - 空で初期化。必要時に追加
    ],
    lcMode: 'ratio',
    lcRatio: 70,
    houseMode: 'keep',
    houseNewRent: 8,
    // 段階的住居: houseMode==='stages' 時に使用
    houseStages: [
      // { yearsAfterDeath: 1, mode: 'danshin', rentAmt: 0 }
    ],
    scholarshipEnabled: false,
    scholarships: {},
    // 車: keep時の詳細設定（通常CFから初期値を引き継ぎ）
    carMode: 'keep',
    carType: carD.type,       // 'new' or 'used'
    carPrice: carD.price,     // 万円
    carCycle: carD.cycle,     // 年
    carInsp: carD.insp,       // 万円（車検費用）
    carFirstAge: carD.firstAge,  // 初回購入年齢（通常CFの年目から換算）
    carEndAge: carD.endAge,      // 手放す年齢（通常CFから継承）
    // 駐車場（通常CFの年齢範囲を継承）
    parkMode: 'keep',
    parkMonthly: parkMonthlyDef,  // 円/月
    parkFromAge: parkFromDef,
    parkToAge: parkToDef
  };
}

// --- タブバー描画（右パネルのタブに追加） ---
function mgQA_renderTabs(){
  const container = document.getElementById('mg-qa-tabs-container');
  if(!container){
    console.warn('[mgQA] tabs container not found');
    return;
  }
  container.innerHTML = '';
  mgQA_tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'rtab mgqa-tab' + (t.target==='w'?' pink':'');
    btn.id = `rt-${t.id}`;
    btn.onclick = () => mgQA_switchTab(t.id);
    btn.innerHTML = `🛡️ ${mgQA_escHtml(t.name)} <span class="stab-rm" style="margin-left:4px" onclick="event.stopPropagation();mgQA_deleteTab('${t.id}')" title="閉じる">×</span>`;
    container.appendChild(btn);
  });
}

// --- タブ切替（万が一タブを開く） ---
function mgQA_switchTab(id){
  const tab = mgQA_tabs.find(t=>t.id===id);
  if(!tab) return;

  // setRTab ラッパーを遅延登録（DOMContentLoaded で失敗している場合のフォールバック）
  if(typeof mgQA_wrapSetRTab === 'function') mgQA_wrapSetRTab();

  // 右タブのアクティブ状態を更新
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('on'));
  const thisBtn = document.getElementById('rt-'+id);
  if(thisBtn) thisBtn.classList.add('on');

  // 左パネル = Q&Aパネル表示
  const leftPanel = document.getElementById('mgqa-left-panel');
  if(leftPanel){
    leftPanel.style.display = '';
    leftPanel.innerHTML = mgQA_buildPanel(tab);
    mgQA_attachHandlers(tab);
  }

  window._mgQA_activeTabId = id;

  // 右パネルに計算結果を表示（即時計算、デバウンスなし）
  mgQA_calcAndRender(tab, true);
}

// --- 計算実行＆右パネル描画（本番ロジック連携） ---
function mgQA_calcAndRender(tab, immediate){
  if(!immediate){
    // デバウンス：入力停止から600ms後に実計算（本番liveと同じ）
    clearTimeout(window._mgQA_debTimer);
    window._mgQA_debTimer = setTimeout(()=>mgQA_calcAndRender(tab, true), 600);
    mgQA_showRightIndicator(tab, '● 計算中…');
    return;
  }

  // 0. CF再計算前にスクロール位置を保存
  // renderTable を no-op 化したので内部描画はもう発生しない。
  // visibility:hidden は不要（逆に一瞬消える現象の原因になる）。
  const _rb0 = document.getElementById('right-body');
  const _oldTw0 = _rb0 ? _rb0.querySelector('.tbl-wrap') : null;
  const _savedTop = _oldTw0 ? _oldTw0.scrollTop : (_rb0 ? _rb0.scrollTop : 0);
  const _savedLeft = _oldTw0 ? _oldTw0.scrollLeft : 0;

  // 1. Q&A state → 既存万が一DOMフィールドに反映
  // applyStateToDOM 内で setMGxxx が live() を呼ぶため、一時的に無効化
  // （二次的な再描画/スクロールリセットを防ぐ）
  const _origLive = window.live;
  window.live = function(){}; // no-op
  try {
    mgQA_applyStateToDOM(tab);
  } catch(e){
    console.error('[mgQA] state→DOM error:', e);
    mgQA_showRightError(tab, 'DOM反映エラー: '+e.message);
    window.live = _origLive;
    return;
  }
  window.live = _origLive;

  // 2. renderContingency() 呼出し
  // ★重要: 内部の render()→renderTable が right-body を通常CFで書き換え、
  //   そのあとで私の MG CF 書込みが発生する二重描画問題を回避するため、
  //   renderTable を一時的に no-op に差し替える。
  //   window.lastR の計算は renderTable 呼び出し前に済んでいるので影響なし。
  window._mgQA_suppressSetRTab = true;
  const _origRenderTable = window.renderTable;
  window.renderTable = function(){ /* no-op during MG calc */ };
  let calcOk = false;
  try {
    if(typeof renderContingency === 'function'){
      renderContingency();
      calcOk = true;
    }
  } catch(e){
    console.error('[mgQA] renderContingency error:', e);
    mgQA_showRightError(tab, '計算エラー: '+e.message);
  } finally {
    window._mgQA_suppressSetRTab = false;
    window.renderTable = _origRenderTable;
  }

  if(!calcOk) return;

  // 3. renderContingencyが_mgStoreに保存したHTMLを取り出して表示
  const mgKey = tab.target;
  const html = window._mgStore && window._mgStore[mgKey];
  if(!html){
    mgQA_showRightError(tab, '計算結果が取得できませんでした（通常CF表を先に生成してください）');
    return;
  }
  const rb = document.getElementById('right-body');
  if(rb){
    // ===== 通常時の renderTable の DOM 更新部分 (cf-table.js 347-373行) と
    //       全く同じ順序で実行。通常時と完全一致した挙動を再現する =====
    rb.classList.add('cf-mode');

    // スクロール位置を保存
    const _oldTw = rb.querySelector('.tbl-wrap');
    const _prevTop = _oldTw ? _oldTw.scrollTop : rb.scrollTop;
    const _prevLeft = _oldTw ? _oldTw.scrollLeft : 0;

    // innerHTML 置換
    rb.innerHTML = html;

    // thead の sticky top 値を動的計算
    if(typeof applyStickyTop === 'function') applyStickyTop(rb);

    // スクロール位置を復元
    const _newTw = rb.querySelector('.tbl-wrap');
    if(_newTw){
      if(_prevTop > 0) _newTw.scrollTop = _prevTop;
      if(_prevLeft > 0) _newTw.scrollLeft = _prevLeft;
    }

    // 通常時 renderTable と同じ順で: _applyFinAssetVisibility → _reapplyHighlightAfterRender
    if(typeof _applyFinAssetVisibility === 'function') _applyFinAssetVisibility();
    if(typeof _reapplyHighlightAfterRender === 'function') _reapplyHighlightAfterRender();

    // ズーム再適用（通常時の renderTable と同じ）
    if(typeof setCfZoom === 'function' && typeof cfZoomLevel !== 'undefined' && cfZoomLevel !== 100){
      setCfZoom(cfZoomLevel);
    }
  }
  // 自タブのタブボタンをアクティブに戻す（setRTab抑制したので手動）
  document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('on'));
  document.getElementById('rt-'+tab.id)?.classList.add('on');

  // タブ別にHTMLを保存
  tab.renderedHTML = html;

  // 🧪 テスト版：新UIに一本化するため、既存の rt-mg-h/rt-mg-w は常に非表示
  const oldH = document.getElementById('rt-mg-h');
  const oldW = document.getElementById('rt-mg-w');
  if(oldH) oldH.style.display = 'none';
  if(oldW) oldW.style.display = 'none';

  // ハイライト再適用は RAF 内で実行済み
}

// --- 右パネルにインジケータ表示 ---
function mgQA_showRightIndicator(tab, msg){
  // 既存CFが表示されていればそのままに、先頭にインジケータを重ねる
  const rb = document.getElementById('right-body');
  if(!rb) return;
  let ind = document.getElementById('mgqa-right-indicator');
  if(!ind){
    ind = document.createElement('div');
    ind.id = 'mgqa-right-indicator';
    ind.style.cssText = 'position:sticky;top:0;z-index:10;background:rgba(194,24,91,0.9);color:#fff;padding:4px 12px;font-size:12px;font-weight:600;text-align:center';
    rb.prepend(ind);
  }
  ind.textContent = msg;
}
function mgQA_hideRightIndicator(){
  document.getElementById('mgqa-right-indicator')?.remove();
}
function mgQA_showRightError(tab, msg){
  const rb = document.getElementById('right-body');
  if(!rb) return;
  rb.style.visibility = '';  // 隠していたら戻す
  rb.innerHTML = `
    <div style="padding:40px 24px;max-width:760px;margin:0 auto">
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:12px;padding:24px">
        <div style="font-size:16px;font-weight:800;color:#b91c1c;margin-bottom:12px">⚠️ 計算できませんでした</div>
        <div style="font-size:13px;color:#7f1d1d;line-height:1.7;margin-bottom:12px">${mgQA_escHtml(msg)}</div>
        <div style="font-size:12px;color:#64748b">まず通常CF表の入力（①家族〜⑦支出）を埋めてCF表が生成される状態にしてください。</div>
      </div>
    </div>
  `;
}

// --- Q&A state を既存の万が一DOMフィールドに書き込む ---
function mgQA_applyStateToDOM(tab){
  const s = tab.state;

  // 対象者（ご主人様/奥様）
  if(typeof setMGTarget === 'function') setMGTarget(tab.target);

  // 死亡年
  const dy = document.getElementById('mg-death-year');
  if(dy) dy.value = s.deathYear;

  // 保険金：既存をクリアして再構築
  const insCont = document.getElementById('mg-insurance-cont');
  if(insCont && typeof addMGInsurance === 'function'){
    insCont.innerHTML = '';
    // mgInsCnt は contingency.js で `let` 宣言されたグローバル変数（window非経由）
    // addMGInsurance() が ++mgInsCnt して新ID生成するので、カウンタはそのまま使う
    s.insurances.forEach(ins => {
      if(!ins || ins.type === 'none') return;
      addMGInsurance();
      // 直前にDOMに追加された保険ボックスのIDを末尾から取得
      const box = insCont.lastElementChild;
      if(!box) return;
      const m = box.id && box.id.match(/^mg-ins-(\d+)$/);
      if(!m) return;
      const id = parseInt(m[1]);
      if(ins.type === 'lump'){
        if(typeof setMGInsType === 'function') setMGInsType(id, 'lump');
        const amtEl = document.getElementById(`mg-ins-amt-${id}`);
        if(amtEl) amtEl.value = ins.amount || 0;
      } else if(ins.type === 'annuity'){
        if(typeof setMGInsType === 'function') setMGInsType(id, 'annuity');
        const annualEl = document.getElementById(`mg-ins-annual-${id}`);
        if(annualEl) annualEl.value = ins.annual || 0;
        const endEl = document.getElementById(`mg-ins-end-age-${id}`);
        if(endEl) endEl.value = ins.endAge || 65;
      }
    });
  }

  // 遺族年金モード
  if(typeof setMGSurvMode === 'function') setMGSurvMode(s.pensionMode);
  const sa = document.getElementById('mg-surv-amt');
  if(sa) sa.value = s.pensionManual || 0;

  // 生活費（割合のみ対応、段階はB-4で）
  const lcRatio = document.getElementById('mg-lc-ratio');
  if(lcRatio) lcRatio.value = s.lcRatio;
  const ratioBtn = document.getElementById('mg-lc-mode-ratio');
  const stepBtn = document.getElementById('mg-lc-mode-step');
  const rF = document.getElementById('mg-lc-ratio-fields');
  const sF = document.getElementById('mg-lc-step-fields');
  if(ratioBtn && stepBtn && rF && sF){
    if(s.lcMode === 'step'){
      ratioBtn.classList.remove('on');
      stepBtn.classList.add('on');
      rF.style.display = 'none';
      sF.style.display = '';
    } else {
      ratioBtn.classList.add('on');
      stepBtn.classList.remove('on');
      rF.style.display = '';
      sF.style.display = 'none';
    }
  }

  // 住居（keep/danshin/rent/stages）— window._mgHousingStages に統一して渡す
  // 'stages' 以外の単一モードは単一ステージに変換
  let stages;
  if(s.houseMode === 'stages' && Array.isArray(s.houseStages)){
    stages = s.houseStages
      .map(st => ({
        yearsAfterDeath: Math.max(1, parseInt(st.yearsAfterDeath)||1),
        mode: ['keep','danshin','rent'].includes(st.mode) ? st.mode : 'keep',
        rentAmt: parseFloat(st.rentAmt)||0
      }))
      .sort((a,b)=>a.yearsAfterDeath-b.yearsAfterDeath);
  } else if(s.houseMode === 'rent'){
    stages = [{yearsAfterDeath:1, mode:'rent', rentAmt: s.houseNewRent||0}];
  } else if(s.houseMode === 'danshin'){
    stages = [{yearsAfterDeath:1, mode:'danshin', rentAmt:0}];
  } else {
    // 'keep' or default
    stages = [{yearsAfterDeath:1, mode:'keep', rentAmt:0}];
  }
  window._mgHousingStages = stages;
  // 1つ目のステージが団信完済 or 売却・賃貸 ならローンを完済する想定で団信ON
  // (stagesによる多段階処理は未実装のため、最初のステージで判定)
  if(typeof setMGDansin === 'function'){
    const firstStage = stages[0] || {};
    const clearsLoan = (firstStage.mode === 'danshin' || firstStage.mode === 'rent');
    setMGDansin(clearsLoan);
  }

  // 車両（keep/stop）
  if(typeof setMGCarPark === 'function'){
    setMGCarPark('car', s.carMode === 'keep');
  }
  // 車の詳細フィールド（target側のみ書き込み）
  const cp = tab.target;  // 'h' or 'w'
  if(s.carMode === 'keep'){
    if(typeof setMGCarType === 'function') setMGCarType(cp, s.carType === 'used' ? 'used' : 'new');
    const priceEl = document.getElementById(`mg-car-${cp}-price`);
    if(priceEl) priceEl.value = s.carPrice || 0;
    const cycleEl = document.getElementById(`mg-car-${cp}-cycle`);
    if(cycleEl) cycleEl.value = s.carCycle || 7;
    const inspEl = document.getElementById(`mg-car-${cp}-insp`);
    if(inspEl) inspEl.value = s.carInsp || 0;
    const firstEl = document.getElementById(`mg-car-${cp}-first`);
    if(firstEl) firstEl.value = s.carFirstAge || '';
    const endEl = document.getElementById(`mg-car-${cp}-end-age`);
    if(endEl) endEl.value = s.carEndAge || '';
  }

  // 駐車場（keep/stop）
  if(typeof setMGCarPark === 'function'){
    setMGCarPark('park', s.parkMode === 'keep');
  }
  // 駐車場の詳細
  if(s.parkMode === 'keep'){
    const monEl = document.getElementById('mg-parking');
    if(monEl) monEl.value = s.parkMonthly || 0;
    const fromEl = document.getElementById(`mg-park-${cp}-from-age`);
    if(fromEl) fromEl.value = s.parkFromAge || '';
    const toEl = document.getElementById(`mg-park-${cp}-to-age`);
    if(toEl) toEl.value = s.parkToAge || '';
  }

  // 就労収入オーバーライド（新形式：window._mgIncomeOverride で contingency.js に渡す）
  // 生存者側のみ上書きする: target='h'→奥様(w)を上書き、target='w'→ご主人様(h)を上書き
  const survivorSide = tab.target === 'h' ? 'w' : 'h';
  if(s.incomeMode === 'override' && Array.isArray(s.incomeSteps)){
    // 有効ステップのみ抽出（ageFrom/ageTo>0 かつ ageTo>=ageFrom）
    const validSteps = s.incomeSteps
      .filter(st => st && st.ageFrom>0 && st.ageTo>=st.ageFrom)
      .map(st => ({
        ageFrom: Math.floor(st.ageFrom),
        ageTo: Math.floor(st.ageTo),
        netFrom: Number(st.netFrom)||0,
        netTo: Number(st.netTo)||0
      }))
      .sort((a,b)=>a.ageFrom-b.ageFrom);
    if(!window._mgIncomeOverride) window._mgIncomeOverride = {};
    if(validSteps.length > 0){
      window._mgIncomeOverride[survivorSide] = validSteps;
    } else {
      delete window._mgIncomeOverride[survivorSide];
    }
  } else {
    // 'same' モード: オーバーライド解除
    if(window._mgIncomeOverride) delete window._mgIncomeOverride[survivorSide];
  }

  // 奨学金（新形式：window._mgScholarshipItems で contingency.js に渡す）
  if(s.scholarshipEnabled && s.scholarships){
    const items = [];
    Object.keys(s.scholarships).forEach(idxKey => {
      const idx = parseInt(idxKey);
      if(isNaN(idx)) return;
      const sc = s.scholarships[idxKey];
      if(sc?.hs?.on && sc.hs.amount>0){
        items.push({ childIdx: idx, phase: 'hs', amount: sc.hs.amount });
      }
      if(sc?.univ?.on && sc.univ.amount>0){
        items.push({ childIdx: idx, phase: 'univ', amount: sc.univ.amount });
      }
    });
    window._mgScholarshipItems = items;
    // 既存の単一入力はクリア（新形式を優先的に使う合図）
    const oldScOn = document.getElementById('mg-scholarship-yes');
    const oldScNo = document.getElementById('mg-scholarship-none');
    if(oldScNo && oldScOn){
      oldScNo.classList.add('on');
      oldScOn.classList.remove('on');
      const fields = document.getElementById('mg-scholarship-fields');
      if(fields) fields.style.display = 'none';
    }
  } else {
    // 無効：旧形式も無効化
    window._mgScholarshipItems = [];
    const oldScOn = document.getElementById('mg-scholarship-yes');
    const oldScNo = document.getElementById('mg-scholarship-none');
    if(oldScNo && oldScOn){
      oldScNo.classList.add('on');
      oldScOn.classList.remove('on');
      const fields = document.getElementById('mg-scholarship-fields');
      if(fields) fields.style.display = 'none';
    }
  }
}

// --- 左パネルのQ&Aを隠す（通常CF表などに切り替えた時） ---
function mgQA_hideLeftPanel(){
  const leftPanel = document.getElementById('mgqa-left-panel');
  if(leftPanel){
    leftPanel.style.display = 'none';
    leftPanel.innerHTML = '';
  }
  // 万が一タブのアクティブ状態も解除
  mgQA_tabs.forEach(t => {
    const btn = document.getElementById('rt-'+t.id);
    if(btn) btn.classList.remove('on');
  });
  window._mgQA_activeTabId = null;
}

// --- 既存 setRTab をラップ：通常タブに切替えられたら左Q&Aを隠す ---
var _mgQA_setRTabWrapped = false;
(function(){
  if(typeof window.setRTab !== 'function'){
    // setRTab がまだ定義されてなければDOMContentLoaded後に再試行
    window.addEventListener('DOMContentLoaded', mgQA_wrapSetRTab);
    window.addEventListener('load', mgQA_wrapSetRTab);
  } else {
    mgQA_wrapSetRTab();
  }
})();

function mgQA_wrapSetRTab(){
  if(_mgQA_setRTabWrapped) return;
  if(typeof window.setRTab !== 'function') return;
  const orig = window.setRTab;
  window.setRTab = function(t){
    // 計算中（renderContingencyが内部でsetRTab呼ぶ）は無視
    if(window._mgQA_suppressSetRTab) return;
    // 通常タブ・既存万が一タブへの切替時は、新Q&Aパネルを隠す
    mgQA_hideLeftPanel();
    return orig.apply(this, arguments);
  };
  _mgQA_setRTabWrapped = true;
  console.log('[mgQA] setRTab wrapped for left-panel Q&A sync');
}

// --- タブ削除 ---
function mgQA_deleteTab(id){
  if(!confirm('このタブを削除しますか？')) return;
  const idx = mgQA_tabs.findIndex(t=>t.id===id);
  if(idx<0) return;
  mgQA_tabs.splice(idx,1);
  mgQA_renderTabs();
  // アクティブなタブを削除した場合はCF表タブに戻す
  if(window._mgQA_activeTabId === id){
    window._mgQA_activeTabId = null;
    if(typeof setRTab === 'function') setRTab('cf');
  }
}

// --- タブ複製 ---
function mgQA_duplicateTab(id){
  const src = mgQA_tabs.find(t=>t.id===id);
  if(!src) return;
  mgQA_counter[src.target]++;
  const newId = `mgqa-${src.target}-${Date.now()}`;
  mgQA_tabs.push({
    id: newId, target: src.target,
    name: `${src.name} のコピー`,
    state: JSON.parse(JSON.stringify(src.state))
  });
  mgQA_renderTabs();
  mgQA_switchTab(newId);
}

// --- タブ名変更 ---
function mgQA_renameTab(id, newName){
  const tab = mgQA_tabs.find(t=>t.id===id);
  if(!tab) return;
  tab.name = (newName||'').trim() || tab.name;
  mgQA_renderTabs();
}

// --- Q&Aパネル本体の生成 ---
function mgQA_buildPanel(tab){
  const s = tab.state;
  const target = tab.target;
  const deceased = target==='h' ? 'ご主人様' : '奥様';
  const spouse = target==='h' ? '奥様' : 'ご主人様';

  // 通常CF表からの参照値（読み取り専用ヒント用）
  const hAge = mgQA_iv('husband-age') || 30;
  const wAge = mgQA_iv('wife-age') || 29;
  const nKids = document.querySelectorAll('#kids-list > div[id^="kid-"]').length || 0;
  const spouseIncomeHint = target==='h'
    ? (mgQA_fv('w-income') || mgQA_fv('income-0') || '---')
    : (mgQA_fv('income-0') || mgQA_fv('h-income') || '---');
  const lcHint = mgQA_fv('living-cost') || '---';

  // btn-tog 風のトグル
  const tog = (key, value, label, opts) => {
    const cur = s[key];
    let active;
    if(opts && opts.asBool){
      active = cur === (value === 'true');
    } else {
      active = cur === value;
    }
    const arg = (opts && opts.asBool) ? (value==='true'?'true':'false') : `'${value}'`;
    return `<button type="button" class="btn-tog ${active?'on':''}" onclick="mgQA_setState('${tab.id}','${key}',${arg},{rebuild:true})">${label}</button>`;
  };

  return `
    <div class="persona" style="background:#fdf2f8;border-color:#f9a8d4;margin-bottom:8px">
      <span class="persona-icon">🛡️</span>
      <input type="text" class="inp" style="flex:1;min-width:0;font-weight:700" value="${mgQA_escHtml(tab.name)}"
        onchange="mgQA_renameTab('${tab.id}', this.value)" title="クリックで名前を編集">
      <button class="btn-tog" onclick="mgQA_duplicateTab('${tab.id}')" style="padding:4px 8px;font-size:11px">📋複製</button>
      <button class="btn-tog" onclick="mgQA_deleteTab('${tab.id}')" style="padding:4px 8px;font-size:11px;color:#dc2626;border-color:#fca5a5">🗑削除</button>
    </div>

    <!-- Q1: 死亡時期 -->
    <div class="sub">⚠️ 逝去時期</div>
    <div class="g2">
      <div class="fg"><label class="lbl">${deceased}のご逝去は何年後？</label>
        <div class="suf"><input class="inp age-inp" type="number" min="1" max="50" value="${s.deathYear}" data-k="deathYear" data-cf-row="lc" data-cf-from="${hAge+(s.deathYear||1)-1}" data-cf-to="${hAge+(s.deathYear||1)-1}"><span class="sl">年後</span></div>
      </div>
    </div>
    <div class="hint">💡 「1年後」=今から1年以内（最も厳しい条件でのシミュレーション）</div>
    <div class="divider"></div>

    <!-- Q2: 死亡保険金 -->
    <div class="sub">💰 死亡保険金</div>
    <div class="hint" style="margin-bottom:6px">💡 複数契約している場合は「+保険を追加」で複数登録。一時金=一括受取 / 年金型=毎年受取</div>
    <div id="mgqa-ins-${tab.id}">
      ${s.insurances.map((ins,i)=>mgQA_renderIns(tab.id, i, ins)).join('')}
    </div>
    <button class="btn-add" onclick="mgQA_addIns('${tab.id}')" style="margin-top:4px">＋ 保険を追加</button>
    <div class="divider"></div>

    <!-- Q3: 遺族年金 -->
    <div class="sub">📋 遺族年金</div>
    <div class="hint" style="margin-bottom:6px">💡 通常時の年収・家族構成から自動計算（遺族厚生年金＋遺族基礎年金＋中高齢寡婦加算）</div>
    <div class="g2">
      <div class="fg"><label class="lbl">遺族年金の設定</label>
        <div style="display:flex;gap:6px">
          ${tog('pensionMode','auto','自動計算')}
          ${tog('pensionMode','manual','手動入力')}
        </div>
      </div>
      <div class="fg" style="${s.pensionMode==='manual'?'':'display:none'}" data-cond="pensionMode:manual">
        <label class="lbl">合計遺族年金</label>
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.pensionManual}" data-k="pensionManual" data-cf-row="survPension" data-cf-from="${hAge+(s.deathYear||1)-1}"><span class="sl">万/年</span></div>
      </div>
    </div>
    <div class="divider"></div>

    <!-- Q4: 配偶者の収入 -->
    <div class="sub">💴 ${spouse}の就労収入</div>
    <div class="hint" style="margin-bottom:6px">💡 通常時の${spouse}の年収: 約${spouseIncomeHint}万/年（左の③収入で編集）。万が一時に変更する場合は段階設定可</div>
    <div class="fg">
      <label class="lbl">万が一後の${spouse}の収入</label>
      <div style="display:flex;gap:6px">
        ${tog('incomeMode','same','通常時と同じ')}
        ${tog('incomeMode','override','変更する')}
      </div>
    </div>
    <div style="margin-top:6px;${s.incomeMode==='override'?'':'display:none'}" data-cond="incomeMode:override">
      ${mgQA_buildIncomeSteps(tab)}
    </div>
    <div class="divider"></div>

    <!-- Q5: 生活費 -->
    <div class="sub">🛒 死亡後の生活費</div>
    <div class="hint" style="margin-bottom:6px">💡 通常時の${lcHint}万円/月を基準に、万が一時の生活費を割合で設定（一般的に70%程度に減少）</div>
    <div class="g2">
      <div class="fg"><label class="lbl">設定方式</label>
        <div style="display:flex;gap:6px">
          ${tog('lcMode','ratio','割合で設定')}
          ${tog('lcMode','step','段階で設定(未対応)')}
        </div>
      </div>
      <div class="fg" style="${s.lcMode==='ratio'?'':'display:none'}" data-cond="lcMode:ratio">
        <label class="lbl">生活費の割合</label>
        <div class="suf"><input class="inp" type="number" min="10" max="150" value="${s.lcRatio}" data-k="lcRatio" data-cf-row="lc" data-cf-from="${hAge+(s.deathYear||1)-1}"><span class="sl">%</span></div>
      </div>
    </div>
    <div class="divider"></div>

    <!-- Q6: 住居 -->
    <div class="sub">🏠 住居</div>
    <div class="hint" style="margin-bottom:6px">💡 団信加入ローンの場合は完済、賃貸への引越しや段階的切替も可能</div>
    <div class="fg">
      <label class="lbl">住居モード</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${tog('houseMode','keep','現状維持(ローン継続)')}
        ${tog('houseMode','danshin','団信で完済')}
        ${tog('houseMode','rent','売却・賃貸')}
        ${tog('houseMode','stages','段階的に変更')}
      </div>
    </div>
    <div class="g2" style="margin-top:6px;${s.houseMode==='rent'?'':'display:none'}" data-cond="houseMode:rent">
      <div class="fg"><label class="lbl">新しい家賃</label>
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.houseNewRent||8}" data-k="houseNewRent" data-cf-row="rent" data-cf-from="${hAge+(s.deathYear||1)-1}"><span class="sl">万/月</span></div>
      </div>
    </div>
    <div style="margin-top:6px;${s.houseMode==='stages'?'':'display:none'}" data-cond="houseMode:stages">
      ${mgQA_buildHouseStages(tab)}
    </div>
    <div class="divider"></div>

    <!-- Q7: 奨学金 -->
    <div class="sub">🎓 お子様の奨学金</div>
    <div class="hint" style="margin-bottom:6px">💡 高校入学時(16歳)・大学入学時(19歳)のタイミングでお子様ごとに設定</div>
    <div class="fg">
      <label class="lbl">万が一時の奨学金</label>
      <div style="display:flex;gap:6px">
        ${tog('scholarshipEnabled','false','借りない',{asBool:true})}
        ${tog('scholarshipEnabled','true','借りる',{asBool:true})}
      </div>
    </div>
    <div style="margin-top:6px;${s.scholarshipEnabled?'':'display:none'}" data-cond="scholarshipEnabled:true">
      ${mgQA_buildScholarshipChildren(tab)}
    </div>
    <div class="divider"></div>

    <!-- Q8: 車 -->
    <div class="sub">🚗 車両費（${spouse}基準）</div>
    <div class="hint" style="margin-bottom:6px">💡 買換周期・新車/中古で車検タイミングが変わる。処分すると以降の車関連費はゼロ</div>
    <div class="fg">
      <label class="lbl">車両</label>
      <div style="display:flex;gap:6px">
        ${tog('carMode','keep','継続(買換含む)')}
        ${tog('carMode','stop','処分')}
      </div>
    </div>
    <div style="margin-top:8px;${s.carMode==='keep'?'':'display:none'}" data-cond="carMode:keep">
      <div class="fg">
        <label class="lbl">車種</label>
        <div style="display:flex;gap:6px">
          ${tog('carType','new','✨ 新車')}
          ${tog('carType','used','🔄 中古')}
        </div>
      </div>
      <div class="g3" style="margin-top:8px">
        <div class="fg"><label class="lbl">車両価格</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.carPrice||300}" data-k="carPrice" data-cf-row="carTotal" data-cf-dyn="carAll"><span class="sl">万円</span></div>
        </div>
        <div class="fg"><label class="lbl">乗換周期</label>
          <div class="suf"><input class="inp age-inp" type="number" min="1" max="20" value="${s.carCycle||7}" data-k="carCycle" data-cf-row="carTotal" data-cf-dyn="carAll"><span class="sl">年ごと</span></div>
        </div>
        <div class="fg"><label class="lbl">車検費用</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.carInsp||10}" data-k="carInsp" data-cf-row="carTotal" data-cf-dyn="carAll"><span class="sl">万円</span></div>
        </div>
      </div>
      <div class="g2" style="margin-top:8px">
        <div class="fg"><label class="lbl">初回購入年齢</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${s.carFirstAge||''}" placeholder="空欄=現在" data-k="carFirstAge" data-cf-row="carTotal" data-cf-dyn="carFirst"><span class="sl">歳</span></div>
        </div>
        <div class="fg"><label class="lbl">手放す年齢</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${s.carEndAge||''}" placeholder="空欄=ずっと" data-k="carEndAge" data-cf-row="carTotal" data-cf-dyn="carEnd"><span class="sl">歳</span></div>
        </div>
      </div>
    </div>
    <div class="divider"></div>

    <!-- Q9: 駐車場 -->
    <div class="sub">🅿️ 駐車場（${spouse}基準）</div>
    <div class="hint" style="margin-bottom:6px">💡 車を処分する場合は通常「停止」。開始/終了年齢で期間限定も可</div>
    <div class="fg">
      <label class="lbl">駐車場</label>
      <div style="display:flex;gap:6px">
        ${tog('parkMode','keep','継続')}
        ${tog('parkMode','stop','停止')}
      </div>
    </div>
    <div style="margin-top:8px;${s.parkMode==='keep'?'':'display:none'}" data-cond="parkMode:keep">
      <div class="g2">
        <div class="fg"><label class="lbl">月額駐車場代</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.parkMonthly||15000}" data-k="parkMonthly" data-cf-row="prk" data-cf-dyn="parkAll"><span class="sl">円/月</span></div>
        </div>
      </div>
      <div class="g2" style="margin-top:6px">
        <div class="fg"><label class="lbl">開始年齢</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${s.parkFromAge||''}" placeholder="空欄=現在" data-k="parkFromAge" data-cf-row="prk" data-cf-dyn="parkFrom"><span class="sl">歳</span></div>
        </div>
        <div class="fg"><label class="lbl">終了年齢</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${s.parkToAge||''}" placeholder="空欄=ずっと" data-k="parkToAge" data-cf-row="prk" data-cf-dyn="parkTo"><span class="sl">歳</span></div>
        </div>
      </div>
    </div>

    <div class="hint" style="text-align:center;margin-top:12px;padding:8px;background:#f8fafc;border-radius:6px">
      💨 入力停止から約0.6秒後に自動で再計算されます
    </div>
  `;
}

// state 更新ユーティリティ（btn-tog クリックハンドラ用）
function mgQA_setState(tabId, key, value, opts){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(key.includes('.')){
    const parts = key.split('.');
    let obj = tab.state;
    for(let i=0;i<parts.length-1;i++){
      const p = /^\d+$/.test(parts[i])?parseInt(parts[i]):parts[i];
      if(obj[p]==null) obj[p] = /^\d+$/.test(parts[i+1])?[]:{};
      obj = obj[p];
    }
    obj[parts[parts.length-1]] = value;
  } else {
    tab.state[key] = value;
  }
  if(opts && opts.rebuild !== false){
    mgQA_switchTab(tabId);
  } else {
    mgQA_calcAndRender(tab, false);
  }
}

// --- 住居段階UI ---
function mgQA_buildHouseStages(tab){
  const stages = Array.isArray(tab.state.houseStages) ? tab.state.houseStages : [];
  let html = `
    <div style="font-size:11px;color:#64748b;margin-bottom:6px;line-height:1.5">
      万が一後、各年数から住居モードを切り替えます（前の段階の設定が次の段階開始まで継続）。
    </div>
  `;

  if(stages.length===0){
    html += '<div style="padding:8px;color:#94a3b8;font-size:11px">段階がまだありません</div>';
  } else {
    stages.forEach((st, i) => {
      const mode = st.mode || 'keep';
      const showRent = mode === 'rent';
      html += `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="font-size:11px;font-weight:700;color:#1a5fa0">段階 ${i+1}</div>
            <button class="mgqa-btn danger" onclick="mgQA_removeHouseStage('${tab.id}', ${i})" title="段階削除">×</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px;align-items:center">
            <label>万が一後
              <input type="number" min="1" max="80" value="${st.yearsAfterDeath||1}"
                data-k="houseStages.${i}.yearsAfterDeath" data-cf-row="rent" style="width:60px"> 年目から
            </label>
            <label>
              <select data-k="houseStages.${i}.mode" data-cf-row="rent" style="font-size:11px">
                <option value="keep" ${mode==='keep'?'selected':''}>現状維持(ローン継続)</option>
                <option value="danshin" ${mode==='danshin'?'selected':''}>団信完済</option>
                <option value="rent" ${mode==='rent'?'selected':''}>売却・賃貸</option>
              </select>
            </label>
            ${showRent ? `
              <label>家賃
                <input type="number" min="0" value="${st.rentAmt||0}"
                  data-k="houseStages.${i}.rentAmt" data-cf-row="rent" style="width:70px"> 万/月
              </label>
            ` : ''}
          </div>
        </div>
      `;
    });
  }

  html += `
    <button class="mgqa-btn" onclick="mgQA_addHouseStage('${tab.id}')" style="margin-top:4px">+ 段階を追加</button>
  `;
  return html;
}

function mgQA_addHouseStage(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.houseStages)) tab.state.houseStages = [];
  const stages = tab.state.houseStages;
  const prev = stages[stages.length-1];
  const newYear = prev ? (prev.yearsAfterDeath+1) : 1;
  stages.push({ yearsAfterDeath: newYear, mode: 'danshin', rentAmt: 0 });
  mgQA_switchTab(tabId);
}

function mgQA_removeHouseStage(tabId, idx){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.houseStages)) return;
  tab.state.houseStages.splice(idx, 1);
  mgQA_switchTab(tabId);
}

// --- 就労収入段階UI ---
function mgQA_buildIncomeSteps(tab){
  const s = tab.state;
  const steps = Array.isArray(s.incomeSteps) ? s.incomeSteps : [];
  const spouse = tab.target==='h' ? '奥様' : 'ご主人様';
  // 生存者の収入行: target='h'→wInc、target='w'→hInc
  const incRow = tab.target==='h' ? 'wInc' : 'hInc';

  let html = `
    <div style="font-size:11px;color:#64748b;margin-bottom:6px;line-height:1.5">
      ${spouse}の就労収入を段階的に設定します（通常時と同じ形式: 開始年齢〜終了年齢、開始金額〜終了金額の線形補間）。
      <br>入力は<strong>手取り年収</strong>です。額面から手取りを計算したいときは下の計算機をご利用ください。
    </div>
    <!-- 🧮 手取り計算機（参考ツール） -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:4px">🧮 手取り計算機（参考）</div>
      <div style="display:flex;gap:6px;margin-bottom:6px;font-size:11px">
        <label><input type="radio" name="mgqa-nc-${tab.id}" value="emp" checked
          onchange="mgQA_recalcNet('${tab.id}','emp')"> 正社員</label>
        <label><input type="radio" name="mgqa-nc-${tab.id}" value="fuyo"
          onchange="mgQA_recalcNet('${tab.id}','fuyo')"> 扶養内パート</label>
      </div>
      <div style="display:flex;gap:6px;align-items:center;font-size:11px;flex-wrap:wrap">
        <label>額面年収 <input type="number" min="0" id="mgqa-nc-gross-${tab.id}"
          oninput="mgQA_recalcNet('${tab.id}')" style="width:80px"> 万円</label>
        <span>→ 手取り: <strong id="mgqa-nc-result-${tab.id}" style="color:#1e40af">―</strong></span>
      </div>
      <div id="mgqa-nc-detail-${tab.id}" style="display:none;font-size:10px;color:#475569;margin-top:4px;line-height:1.5"></div>
    </div>
  `;

  if(steps.length===0){
    html += '<div style="padding:8px;color:#94a3b8;font-size:11px">段階がまだありません</div>';
  } else {
    steps.forEach((st, i) => {
      html += `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="font-size:11px;font-weight:700;color:#1a5fa0">段階 ${i+1}</div>
            <button class="mgqa-btn danger" onclick="mgQA_removeIncomeStep('${tab.id}', ${i})" title="段階削除">×</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
            <label style="display:flex;align-items:center;gap:4px">開始年齢
              <input type="number" min="0" max="100" value="${st.ageFrom||0}"
                data-k="incomeSteps.${i}.ageFrom" data-cf-row="${incRow}" data-cf-from="${st.ageFrom||0}" data-cf-to="${st.ageTo||st.ageFrom||0}" style="width:60px"> 歳
            </label>
            <label style="display:flex;align-items:center;gap:4px">終了年齢
              <input type="number" min="0" max="100" value="${st.ageTo||0}"
                data-k="incomeSteps.${i}.ageTo" data-cf-row="${incRow}" data-cf-from="${st.ageFrom||0}" data-cf-to="${st.ageTo||st.ageFrom||0}" style="width:60px"> 歳
            </label>
            <label style="display:flex;align-items:center;gap:4px">開始時の年収
              <input type="number" min="0" value="${st.netFrom||0}"
                data-k="incomeSteps.${i}.netFrom" data-cf-row="${incRow}" data-cf-from="${st.ageFrom||0}" data-cf-to="${st.ageTo||st.ageFrom||0}" style="width:70px"> 万/年
            </label>
            <label style="display:flex;align-items:center;gap:4px">終了時の年収
              <input type="number" min="0" value="${st.netTo||0}"
                data-k="incomeSteps.${i}.netTo" data-cf-row="${incRow}" data-cf-from="${st.ageFrom||0}" data-cf-to="${st.ageTo||st.ageFrom||0}" style="width:70px"> 万/年
            </label>
          </div>
        </div>
      `;
    });
  }

  html += `
    <button class="mgqa-btn" onclick="mgQA_addIncomeStep('${tab.id}')" style="margin-top:4px">+ 段階を追加</button>
  `;
  return html;
}

// 手取り計算機：額面→手取り計算（既存 calcTakeHomeBase を利用）
function mgQA_recalcNet(tabId, typeOverride){
  const grossEl = document.getElementById(`mgqa-nc-gross-${tabId}`);
  if(!grossEl) return;
  const gross = parseFloat(grossEl.value) || 0;
  // タイプ判定（ラジオから取得、または引数で上書き）
  let isFuyo = false;
  if(typeOverride){
    isFuyo = typeOverride === 'fuyo';
  } else {
    const checked = document.querySelector(`input[name="mgqa-nc-${tabId}"]:checked`);
    isFuyo = checked && checked.value === 'fuyo';
  }
  if(typeof calcTakeHomeBase === 'function'){
    calcTakeHomeBase(gross, `mgqa-nc-result-${tabId}`, `mgqa-nc-detail-${tabId}`, isFuyo);
  }
}

function mgQA_addIncomeStep(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.incomeSteps)) tab.state.incomeSteps = [];
  const steps = tab.state.incomeSteps;
  // 前段階の終了をデフォルトの開始に
  const prev = steps[steps.length-1];
  const newFrom = prev ? (prev.ageTo+1) : 30;
  steps.push({ ageFrom: newFrom, ageTo: newFrom+5, netFrom: 0, netTo: 0 });
  mgQA_switchTab(tabId);
}

function mgQA_removeIncomeStep(tabId, idx){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.incomeSteps)) return;
  tab.state.incomeSteps.splice(idx, 1);
  mgQA_switchTab(tabId);
}

// --- 奨学金：お子様ごとの設定UI ---
function mgQA_buildScholarshipChildren(tab){
  // 通常の①家族セクションからお子様情報を取得
  const childRows = document.querySelectorAll('#children-cont > div[id^="cr-"]');
  if(!childRows.length){
    return '<div style="padding:8px;color:#94a3b8;font-size:11px">※ お子様が登録されていません（①家族セクションで追加してください）</div>';
  }
  const labels = ['第一子','第二子','第三子','第四子'];
  let html = '';
  childRows.forEach((row, idx) => {
    const childDomId = row.id.replace('cr-','');  // "1","2" etc
    const ageEl = document.getElementById('ca-'+childDomId);
    const currentAge = ageEl ? (parseInt(ageEl.value)||0) : 0;
    const lbl = labels[idx] || `第${idx+1}子`;

    // state から取得（childIdx ベース）
    if(!tab.state.scholarships[idx]) tab.state.scholarships[idx] = { hs:{on:false,amount:0}, univ:{on:false,amount:0} };
    const sc = tab.state.scholarships[idx];
    // 現年齢と入学までの年数
    const yearsToHS = 16 - currentAge;
    const yearsToUniv = 19 - currentAge;
    const hsNote = yearsToHS>0?`（あと約${yearsToHS}年）`:(yearsToHS===0?'（今年）':'（過去）');
    const univNote = yearsToUniv>0?`（あと約${yearsToUniv}年）`:(yearsToUniv===0?'（今年）':'（過去）');

    const hAgeNow = mgQA_iv('husband-age') || 30;
    const hsFromAge = hAgeNow + Math.max(0, 16 - currentAge);
    const univFromAge = hAgeNow + Math.max(0, 19 - currentAge);
    html += `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700;color:#1a5fa0;margin-bottom:4px">${lbl} <span style="font-weight:400;color:#64748b">(現${currentAge}歳)</span></div>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;margin-bottom:4px;flex-wrap:wrap">
          <input type="checkbox" ${sc.hs.on?'checked':''}
            data-k="scholarships.${idx}.hs.on"
            data-v-bool="true" data-cf-row="scholarship" data-cf-from="${hsFromAge}"> 🎒 高校入学時 ${hsNote}
          <input type="number" value="${sc.hs.amount||0}" min="0" style="width:80px"
            data-k="scholarships.${idx}.hs.amount" data-cf-row="scholarship" data-cf-from="${hsFromAge}" ${!sc.hs.on?'disabled':''}> 万円
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap">
          <input type="checkbox" ${sc.univ.on?'checked':''}
            data-k="scholarships.${idx}.univ.on"
            data-v-bool="true" data-cf-row="scholarship" data-cf-from="${univFromAge}"> 🎓 大学入学時 ${univNote}
          <input type="number" value="${sc.univ.amount||0}" min="0" style="width:80px"
            data-k="scholarships.${idx}.univ.amount" data-cf-row="scholarship" data-cf-from="${univFromAge}" ${!sc.univ.on?'disabled':''}> 万円
        </label>
      </div>
    `;
  });
  return html;
}

// --- 保険項目の描画 ---
function mgQA_renderIns(tabId, idx, ins){
  const isAnn = ins.type==='annuity';
  const isLump = ins.type==='lump';
  const isNone = ins.type==='none' || !ins.type;
  // 保険金の計上年 = 死亡年
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  const hAgeNow = mgQA_iv('husband-age') || 30;
  const deathYrOffset = tab?.state?.deathYear || 1;
  const deathHAge = hAgeNow + deathYrOffset - 1;
  return `
    <div class="mgqa-ins" data-idx="${idx}">
      <select data-k="insurances.${idx}.type" data-cf-row="insPayArr" data-cf-from="${deathHAge}">
        <option value="none" ${isNone?'selected':''}>選択してください</option>
        <option value="lump" ${isLump?'selected':''}>一時金</option>
        <option value="annuity" ${isAnn?'selected':''}>年金型</option>
      </select>
      ${isAnn ? `
        毎年 <input type="number" value="${ins.annual||0}" data-k="insurances.${idx}.annual" data-cf-row="insAnnuity_${idx}" data-cf-from="${deathHAge}" style="width:70px"> 万 ×
        <input type="number" value="${ins.endAge||65}" data-k="insurances.${idx}.endAge" data-cf-row="insAnnuity_${idx}" data-cf-from="${deathHAge}" style="width:60px"> 歳まで
      ` : isLump ? `
        <input type="number" value="${ins.amount||0}" data-k="insurances.${idx}.amount" data-cf-row="insPayArr" data-cf-from="${deathHAge}" style="width:100px"> 万円
      ` : `
        <span style="color:#94a3b8;font-size:11px">← タイプを選ぶと金額欄が表示されます</span>
      `}
      <button class="mgqa-btn" onclick="mgQA_removeIns('${tabId}', ${idx})" title="削除">×</button>
    </div>
  `;
}

function mgQA_addIns(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  tab.state.insurances.push({ type:'lump', amount:0 });
  mgQA_switchTab(tabId);
}
function mgQA_removeIns(tabId, idx){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  tab.state.insurances.splice(idx,1);
  if(tab.state.insurances.length===0){
    tab.state.insurances.push({ type:'none', amount:0 });
  }
  mgQA_switchTab(tabId);
}

// --- イベントハンドラ ---
function mgQA_attachHandlers(tab){
  const panel = document.getElementById('mgqa-left-panel');
  if(!panel) return;
  panel.querySelectorAll('[data-k]').forEach(el=>{
    const handler = () => mgQA_updateState(tab, el);
    el.addEventListener('change', handler);
    if(el.type==='number' || el.type==='text'){
      el.addEventListener('input', handler);
    }
  });
  // Q&Aタブ上では rTab='mg-h'/'mg-w' なので scrollToCFRow が早期returnしてしまう。
  // scrollToCFRow を1度だけラップして、Q&Aタブ中は一時的に rTab='cf' 扱いにする。
  if(!window._mgQA_scrollWrapped && typeof scrollToCFRow === 'function'){
    const origScrollToCFRow = window.scrollToCFRow;
    window.scrollToCFRow = function(rowKey, fromAge, toAge){
      // Q&Aタブがアクティブな時のみ rTab を一時的に 'cf' に
      if(window._mgQA_activeTabId && typeof rTab !== 'undefined' && rTab !== 'cf'){
        const saved = rTab;
        try {
          rTab = 'cf';
          origScrollToCFRow(rowKey, fromAge, toAge);
        } finally {
          rTab = saved;
        }
      } else {
        origScrollToCFRow(rowKey, fromAge, toAge);
      }
    };
    window._mgQA_scrollWrapped = true;
  }

  // 通常時と完全同一のフォーカス連動ハイライト
  if(!panel._mgQAFocusBound){
    panel.addEventListener('focusin', (e)=>{
      const el = e.target.closest?.('[data-cf-row]');
      if(!el || typeof scrollToCFRow !== 'function') return;
      const row = el.dataset.cfRow;
      let from = el.dataset.cfFrom ? Number(el.dataset.cfFrom) : null;
      let to = el.dataset.cfTo ? Number(el.dataset.cfTo) : null;
      if(el.dataset.cfDyn){
        const range = mgQA_computeCfRange(el.dataset.cfDyn, tab);
        if(range){ from = range.from; to = range.to; }
      }
      scrollToCFRow(row, from, to);
    });
    panel.addEventListener('focusout', (e)=>{
      if(!e.target.closest?.('[data-cf-row]')) return;
      if(typeof cfRowBlur === 'function') cfRowBlur();
    });
    panel._mgQAFocusBound = true;
  }
}

// data-cf-dyn による動的範囲計算
// （car/park 入力は state の firstAge/endAge に基づいて範囲を決める）
function mgQA_computeCfRange(dynKey, tab){
  const s = tab.state;
  const hAge = mgQA_iv('husband-age') || 30;
  const wAge = mgQA_iv('wife-age') || 29;
  // 生存者のage → husband's age スケールに変換
  const toHAge = (survivorAge) => {
    if(tab.target === 'h'){  // 奥様が生存者
      return hAge + (survivorAge - wAge);
    } else {  // ご主人様が生存者
      return survivorAge;
    }
  };
  const survivorCurAge = tab.target === 'h' ? wAge : hAge;
  const deathYearOffset = s.deathYear || 1;
  // 死亡年の生存者年齢
  const survivorAgeAtDeath = survivorCurAge + deathYearOffset - 1;
  // 最後までの目安（husband's age で 100 歳まで）
  const maxHAge = hAge + 70;

  switch(dynKey){
    case 'carAll': {
      const firstSurvivorAge = s.carFirstAge || survivorAgeAtDeath;
      const endSurvivorAge = s.carEndAge || (survivorCurAge + 70);
      return { from: toHAge(firstSurvivorAge), to: toHAge(endSurvivorAge) };
    }
    case 'carFirst': {
      const firstSurvivorAge = s.carFirstAge || survivorAgeAtDeath;
      return { from: toHAge(firstSurvivorAge), to: toHAge(firstSurvivorAge) };
    }
    case 'carEnd': {
      const endSurvivorAge = s.carEndAge || (survivorCurAge + 70);
      return { from: toHAge(endSurvivorAge), to: toHAge(endSurvivorAge) };
    }
    case 'parkAll': {
      const fromSurvivorAge = s.parkFromAge || survivorAgeAtDeath;
      const toSurvivorAge = s.parkToAge || (survivorCurAge + 70);
      return { from: toHAge(fromSurvivorAge), to: toHAge(toSurvivorAge) };
    }
    case 'parkFrom': {
      const fromSurvivorAge = s.parkFromAge || survivorAgeAtDeath;
      return { from: toHAge(fromSurvivorAge), to: toHAge(fromSurvivorAge) };
    }
    case 'parkTo': {
      const toSurvivorAge = s.parkToAge || (survivorCurAge + 70);
      return { from: toHAge(toSurvivorAge), to: toHAge(toSurvivorAge) };
    }
    default:
      return null;
  }
}

function mgQA_updateState(tab, el){
  const key = el.dataset.k;
  // 値の解釈
  let val;
  if(el.type==='checkbox'){
    val = el.checked;
  } else if(el.type==='number'){
    val = parseFloat(el.value)||0;
  } else if(el.type==='radio'){
    // data-v-bool="true" ならブール変換（scholarshipEnabled等）
    if(el.dataset.vBool){
      val = el.value==='on'||el.value==='true';
    } else {
      val = el.value;
    }
  } else {
    val = el.value;
  }

  // state 更新（ネストパス対応: "scholarships.0.hs.on" など）
  if(key.includes('.')){
    const parts = key.split('.');
    let obj = tab.state;
    for(let i=0;i<parts.length-1;i++){
      const p = /^\d+$/.test(parts[i]) ? parseInt(parts[i]) : parts[i];
      if(obj[p]==null){
        // 存在しない中間オブジェクトは作成
        obj[p] = /^\d+$/.test(parts[i+1]) ? [] : {};
      }
      obj = obj[p];
    }
    obj[parts[parts.length-1]] = val;
    // 保険金のtype変更時はパネル再描画
    if(key.endsWith('.type')){
      mgQA_switchTab(tab.id);
      return;
    }
    // 住居ステージのmode変更時もパネル再描画（rent↔それ以外で家賃欄表示切替）
    if(key.startsWith('houseStages.')&&key.endsWith('.mode')){
      mgQA_switchTab(tab.id);
      return;
    }
    // 奨学金のon/off切替は該当行の金額欄を有効/無効化＋保持（再描画で反映）
    if(key.startsWith('scholarships.')&&key.endsWith('.on')){
      mgQA_switchTab(tab.id);
      return;
    }
  } else {
    tab.state[key] = val;
    // 条件表示の更新
    document.querySelectorAll('[data-cond]').forEach(cond=>{
      const [k, v] = cond.dataset.cond.split(':');
      if(k===key){
        // 値を文字列比較（'true' と true を同一視）
        const cur = String(tab.state[k]);
        cond.classList.toggle('hidden', cur!==v);
      }
    });
    // 奨学金enabledの切替でタブ再描画（子リスト表示切替）
    if(key==='scholarshipEnabled'){
      mgQA_switchTab(tab.id);
      return;
    }
  }

  // Q&A入力後、デバウンスでCF表を再計算
  mgQA_calcAndRender(tab, false);
}

// --- 入力フォーカス時のCF表ハイライト＆スクロール ---
// 既存のcf-highlight.js機構はrTab='cf'前提なので、ここでは独立に実装
// doScroll=true なら該当位置にスクロール、false ならハイライトのみ
// 全処理を requestAnimationFrame でラップし、描画完了後に動作させる
function mgQA_scrollCF(rowKey, fromAge, toAge, doScroll){
  if(doScroll===undefined) doScroll = true;
  requestAnimationFrame(() => {
    const body = document.getElementById('right-body');
    if(!body) return;
    // 既存ハイライトをクリア
    body.querySelectorAll('.cf-row-highlight').forEach(el=>el.classList.remove('cf-row-highlight'));
    body.querySelectorAll('.cf-cell-range').forEach(el=>el.classList.remove('cf-cell-range'));
    if(!rowKey) return;

    // 車両費は複数行にまたがる可能性あり
    let selector = `td[data-row="${rowKey}"]`;
    if(rowKey === 'carTotal'){
      selector = `td[data-row="carTotal"], td[data-row^="car-"]`;
    }
    const targetCell = body.querySelector(selector);
    if(!targetCell) return;
    const row = targetCell.closest('tr');
    if(!row) return;

    row.classList.add('cf-row-highlight');

    // 年齢範囲のハイライト
    const hAge = parseInt(document.getElementById('husband-age')?.value) || 30;
    const wAge = parseInt(document.getElementById('wife-age')?.value) || 29;
    const W_ROWS = ['wInc','wRPay','pW'];
    const isW = W_ROWS.includes(rowKey);
    const cvt = a => isW ? (a - wAge + hAge) : a;
    let colFrom = null;
    if(fromAge != null){
      colFrom = cvt(Number(fromAge)) - hAge;
      const colTo = cvt(Number(toAge != null ? toAge : fromAge)) - hAge;
      const tds = row.querySelectorAll('td');
      // index 2 からがデータ列（0:項目名, 1:単位）
      for(let c = colFrom; c <= colTo; c++){
        if(c < 0) continue;
        const td = tds[c + 2];
        if(td) td.classList.add('cf-cell-range');
      }
    }

    if(!doScroll) return;

    // スクロール処理
    const scroller = body.querySelector('.tbl-wrap') || body;
    const rowRect = row.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const isVisible = rowRect.top >= scrollerRect.top && rowRect.bottom <= scrollerRect.bottom;

    if(!isVisible){
      const targetScrollTop = scroller.scrollTop + (rowRect.top - scrollerRect.top) - (scroller.clientHeight / 3);
      scroller.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'auto' });
    }

    // 横スクロール
    if(colFrom != null && colFrom >= 0){
      const ths = body.querySelectorAll('tr.ryr th');
      const targetTh = ths[colFrom + 2];
      if(targetTh){
        const thRect = targetTh.getBoundingClientRect();
        // 左側の固定列(固定項目名など、約190px)を考慮
        const isColVisible = thRect.left >= scrollerRect.left + 190 && thRect.right <= scrollerRect.right;
        if(!isColVisible){
          scroller.scrollTo({
            left: Math.max(0, scroller.scrollLeft + (thRect.left - scrollerRect.left) - 200),
            behavior: 'auto'
          });
        }
      }
    }
  });
}

function mgQA_blurCF(){
  setTimeout(() => {
    // 別入力にフォーカス移動した場合はハイライトを維持
    const panel = document.querySelector('.panel-l');
    if(panel && panel.contains(document.activeElement)) return;
    const body = document.getElementById('right-body');
    if(!body) return;
    body.querySelectorAll('.cf-row-highlight').forEach(el=>el.classList.remove('cf-row-highlight'));
    body.querySelectorAll('.cf-cell-range').forEach(el=>el.classList.remove('cf-cell-range'));
  }, 80);
}

// --- ユーティリティ ---
function mgQA_iv(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  return parseInt(String(el.value||'').replace(/,/g,'')) || 0;
}
function mgQA_fv(id){
  const el = document.getElementById(id);
  if(!el) return 0;
  return parseFloat(String(el.value||'').replace(/,/g,'')) || 0;
}
function mgQA_escHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

console.log('[mgQA] Q&A万が一機能 loaded');
