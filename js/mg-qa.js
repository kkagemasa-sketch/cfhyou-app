// ===== Q&A形式 万が一機能 =====
// 既存コード（setRTab, renderContingency, mgTarget等）は一切変更せず、
// 専用の名前空間 mgQA_* で実装する

//
// 構造:
//  [左パネル] 通常の入力 + 万が一ボタン + (アクティブな万が一タブの) Q&Aパネル
//  [右パネル] 通常CF表タブ / 万が一タブ(複数)
//  万が一タブ切替時 → 左のQ&Aもそのタブ用に切替
//  通常CF表タブ切替時 → 左のQ&Aは非表示

const mgQA_tabs = [];  // {id, target, kind, name, state, mgOverrides, mgCustomRows}
const mgQA_counter = { h: 0, w: 0 };
// 万が一の種類: 'death'=死亡 / 'dis1'=障害1級 / 'dis2'=障害2級（種類ごとに独立したタブ）
const MGQA_KINDS = ['death','dis1','dis2'];

// --- タブ追加（ボタンから呼ばれる） ---
function mgQA_addTab(target, kind){
  mgQA_counter[target]++;
  const id = `mgqa-${target}-${Date.now()}`;
  const label = target==='h'?(householdType==='single'?'ご本人':'ご主人様'):'奥様';
  const n = mgQA_counter[target];
  const _k = MGQA_KINDS.includes(kind) ? kind : 'death';
  const _sameKind = mgQA_tabs.filter(t=>t.target===target&&(t.kind||'death')===_k).length + 1;
  const _kl = {death:'死亡',dis1:'障害1級',dis2:'障害2級'}[_k];
  const name = _sameKind>1 ? `${label} ${_kl} ${_sameKind}` : `${label} ${_kl}`;
  mgQA_tabs.push({
    id, target, name,
    kind: MGQA_KINDS.includes(kind) ? kind : 'death',
    state: mgQA_buildDefaultState(target),
    // CF表のマス上書き・追加行はタブごとに独立（他の万が一タブに効かない）
    mgOverrides: {},
    mgCustomRows: []
  });
  if(typeof mgQA_applyKindDefaults==='function') mgQA_applyKindDefaults(mgQA_tabs[mgQA_tabs.length-1]);
  mgQA_renderTabs();
  mgQA_switchTab(id);
}

// --- タブごとのマス上書き・追加行 ---
// グローバルの mgOverrides / mgCustomRows は「表示中タブの分」を指す。
// 再代入（リセット・行削除・Undo）で参照が切れるため、タブを離れる時・保存時に書き戻す。
function mgQA_activeTab(){
  return mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId) || null;
}
function mgQA_stashOverrides(){
  const t = mgQA_activeTab();
  if(t){ t.mgOverrides = mgOverrides; t.mgCustomRows = mgCustomRows; }
}
function mgQA_loadOverrides(t){
  if(!t.mgOverrides || typeof t.mgOverrides!=='object') t.mgOverrides = {};
  if(!Array.isArray(t.mgCustomRows)) t.mgCustomRows = [];
  mgOverrides = t.mgOverrides;
  mgCustomRows = t.mgCustomRows;
}
// 旧データ（種類・上書きをタブに持たない）を読み込んだ時の移行
// 旧仕様では上書き・追加行が全タブ共有だったので、各タブに同じ内容を配る
function mgQA_migrateTabs(legacyOverrides, legacyCustomRows){
  mgQA_tabs.forEach(t=>{
    if(!MGQA_KINDS.includes(t.kind)) t.kind = 'death';
    if(t.mgOverrides===undefined) t.mgOverrides = JSON.parse(JSON.stringify(legacyOverrides||{}));
    if(t.mgCustomRows===undefined) t.mgCustomRows = JSON.parse(JSON.stringify(legacyCustomRows||[]));
  });
}

// 新しい画面になる前のファイルの保険（保存データ d.mg.insurances）を Q&A 形式で取得
// 最初の万が一タブを作るときに、前の画面で入れた死亡保険金・年金型保険を引き継ぐ
function _mgQA_collectLegacyInsurances(){
  const out = [];
  const num = v => parseFloat(String(v??'').replace(/,/g,''))||0;
  const list = (window._mgLegacy && Array.isArray(window._mgLegacy.insurances)) ? window._mgLegacy.insurances : [];
  list.forEach(ins=>{
    if(!ins) return;
    if(ins.insType==='annuity'){
      const annual = num(ins.annual);
      if(annual>0) out.push({ type:'annuity', name:ins.name||'', annual, endAge:parseInt(ins.endAge)||65, amount:0 });
    }else{
      const amt = num(ins.amt);
      if(amt>0) out.push({ type:'lump', name:ins.name||'', amount:amt, annual:0, endAge:65 });
    }
  });
  return out;
}

// --- デフォルト状態（前タブコピー or 初期値） ---
function mgQA_buildDefaultState(target){
  // 前回の同target優先、なければ最後のタブ、なければ初期値
  const prev = [...mgQA_tabs].reverse().find(t=>t.target===target) ||
               [...mgQA_tabs].reverse()[0];
  if(prev){
    const cloned = JSON.parse(JSON.stringify(prev.state));
    // ★ 以前は保険が空のとき裏の旧入力欄から取り込んでいたが、直前に表示した別タブの保険が
    //   紛れ込むため廃止（新しいタブの最初の1枚だけ、下の初期値で旧データを取り込む）
    return cloned;
  }
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
  const parkMonthlyDef = fv('parking') || 1.5;  // 万円/月（小数があるためiv不可）
  // 駐車場の年齢範囲も通常CFから継承（歳単位なので直接）
  const parkFromDef = mgQA_iv('park-from-age') || 0;
  const parkToDef = mgQA_iv('park-to-age') || 0;
  // 新しい画面になる前のファイルの死亡保険金・年金型保険を取り込む（最初のタブだけ）
  const _legacyIns = _mgQA_collectLegacyInsurances();
  const _initialIns = _legacyIns.length>0 ? _legacyIns : [{ type:'none', amount:0 }];
  return {
    deathYear: 1,
    insurances: _initialIns,
    pensionMode: 'auto',
    pensionManual: 0,
    // 配偶者(生存者)の就労収入: 'same'=通常時と同じ / 'override'=段階設定で上書き
    incomeMode: 'same',
    incomeSteps: [
      // { ageFrom, ageTo, netFrom, netTo } - 空で初期化。必要時に追加
    ],
    lcMode: 'ratio',
    lcRatio: 70,
    // 段階モード（lcMode='step'時に使用）: {base, rate, fromYr, toYr, mode:'free'|'pct', pct}
    lcSteps: [],
    houseMode: 'keep',
    houseNewRent: 8,
    // 段階的住居: houseMode==='stages' 時に使用
    houseStages: [
      // { yearsAfterDeath: 1, mode: 'danshin', rentAmt: 0 }
    ],
    scholarshipEnabled: false,
    scholarships: {},
    // 車: 万一時の挙動（デフォルト=通常時と同じ）
    carInherit: true,         // true=通常CF設定をそのまま使う / false=以下の多台設定を使う
    // 多台対応: 現有車・将来車の配列（carInherit=false時に使用）
    mgExistingCars: [],       // [{type, pay, boughtAgo, price, insp, endYrs, loanYrs, down, loanRate}]
    mgFutureCars: [],         // [{type, pay, price, first, cycle, insp, endAge, loanYrs, down, loanRate}]
    // 旧UI互換用（廃止予定だが既存タブの保存データのため残す）
    carMode: 'keep',
    carType: carD.type,
    carPrice: carD.price,
    carCycle: carD.cycle,
    carInsp: carD.insp,
    carFirstAge: carD.firstAge,
    carEndAge: carD.endAge,
    // 駐車場（デフォルト=通常時と同じ）
    parkInherit: true,        // true=通常CF設定をそのまま使う
    parkMode: 'keep',
    parkMonthly: parkMonthlyDef,
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
    btn.className = 'rtab mgqa-tab';
    btn.id = `rt-${t.id}`;
    // 種類のラベル（死亡／1級／2級）
    const _ki = MGQA_KIND_INFO[t.kind] || MGQA_KIND_INFO.death;
    btn.style.setProperty('--kc', _ki.color);
    const icon = document.createElement('span');
    icon.className = 'mgqa-tab-lab';
    icon.textContent = _ki.short;
    icon.style.cssText = 'pointer-events:none';
    btn.appendChild(icon);
    // ★ 名前入力（CF表タブと同じ：ダブルクリックで編集可能）
    const inp = document.createElement('input');
    inp.className = 'stab-name';
    inp.value = t.name;
    inp.title = 'ダブルクリックで名前変更';
    inp.readOnly = true;
    inp.style.width = (Math.max(40, (t.name||'').length*14))+'px';
    inp.addEventListener('dblclick', e=>{ e.stopPropagation(); inp.readOnly=false; inp.select(); });
    inp.addEventListener('blur', ()=>{
      inp.readOnly = true;
      t.name = inp.value || t.name;
      inp.value = t.name;
      inp.style.width = (Math.max(40, t.name.length*14))+'px';
      // 保存トリガ（mgQA_tabs の状態を永続化）
      if(typeof scheduleAutoSave==='function') scheduleAutoSave();
    });
    inp.addEventListener('keydown', e=>{
      if(e.key==='Enter'){ inp.blur(); }
      if(e.key==='Escape'){ inp.value = t.name; inp.blur(); }
    });
    inp.addEventListener('click', e=>{
      if(inp.readOnly){ e.stopPropagation(); mgQA_switchTab(t.id); }
    });
    btn.appendChild(inp);
    // ×（削除）ボタン
    const rm = document.createElement('span');
    rm.className = 'stab-rm';
    rm.textContent = '×';
    rm.style.marginLeft = '4px';
    rm.title = '閉じる';
    rm.addEventListener('click', e=>{ e.stopPropagation(); mgQA_deleteTab(t.id); });
    btn.appendChild(rm);
    btn.onclick = () => { if(inp.readOnly) mgQA_switchTab(t.id); };
    container.appendChild(btn);
  });
}

// --- タブ切替（万が一タブを開く） ---
function mgQA_switchTab(id){
  const tab = mgQA_tabs.find(t=>t.id===id);
  if(!tab) return;
  clearTimeout(window._mgQA_debTimer);   // 前のタブの計算予約（入力から0.6秒後）を取り消す

  // 前のタブの上書きを書き戻してから、このタブの上書きに切り替える
  mgQA_stashOverrides();
  mgQA_loadOverrides(tab);

  // setRTab ラッパーを遅延登録（DOMContentLoaded で失敗している場合のフォールバック）
  if(typeof mgQA_wrapSetRTab === 'function') mgQA_wrapSetRTab();

  // 右タブのアクティブ状態を更新（二重タブ: 上段のCF表タブは対象外）
  document.querySelectorAll('.rtab').forEach(b=>{if(!b.closest('.scen-tabs'))b.classList.remove('on');});
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
  // 自タブのタブボタンをアクティブに戻す（setRTab抑制したので手動。二重タブ: 上段は対象外）
  document.querySelectorAll('.rtab').forEach(b=>{if(!b.closest('.scen-tabs'))b.classList.remove('on');});
  document.getElementById('rt-'+tab.id)?.classList.add('on');
  // rTab グローバル変数も手動で同期（Excel出力等が rTab を参照するため）
  // setRTab を直接呼ぶと右パネルの再描画など副作用があるので変数のみ更新
  if(typeof window !== 'undefined'){
    window.rTab = tab.target==='h' ? 'mg-h' : 'mg-w';
  }
  try { rTab = tab.target==='h' ? 'mg-h' : 'mg-w'; } catch(e){}

  // タブ別にHTMLを保存
  tab.renderedHTML = html;

  // テスト版：新UIに一本化するため、既存の rt-mg-h/rt-mg-w は常に非表示
  const oldH = document.getElementById('rt-mg-h');
  const oldW = document.getElementById('rt-mg-w');
  if(oldH) oldH.style.display = 'none';
  if(oldW) oldW.style.display = 'none';

  // 計算結果に依存する表示（遺族年金の内訳など）を更新
  if(typeof mgQA_afterCalc==='function') mgQA_afterCalc(tab);

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
        <div style="font-size:16px;font-weight:800;color:#b91c1c;margin-bottom:12px">計算できませんでした</div>
        <div style="font-size:13px;color:#7f1d1d;line-height:1.7;margin-bottom:12px">${mgQA_escHtml(msg)}</div>
        <div style="font-size:12px;color:#64748b">まず通常CF表の入力（①家族〜⑦支出）を埋めてCF表が生成される状態にしてください。</div>
      </div>
    </div>
  `;
}

// --- Q&A state を計算に渡す（window._mgIn と window._mg* ） ---
function mgQA_applyStateToDOM(tab){
  const s = tab.state;

  // 対象者（ご主人様/奥様）
  setMGTarget(tab.target);

  // 計算に渡す値（contingency.js の window._mgIn）
  const mi = window._mgIn = mgIn_default();
  // 死亡年（障害タブは障害になった年）
  mi.deathYear = parseInt(s.deathYear)||1;
  // 保険金
  if(!Array.isArray(s.insurances)) s.insurances = [];
  mi.insurances = s.insurances;

  // 必要保障額（標準の年数）と見出し帯の種類色
  window._mgNeedYears = s.needYears || 3;
  window._mgKindColor = (MGQA_KIND_INFO[tab.kind]||MGQA_KIND_INFO.death).color;
  // 亡くなった方の加入年金（厚生／国民のみ）。持たない旧タブは前の画面の設定（保存データ）を引き継ぐ
  if(s.pensionType!=='kosei' && s.pensionType!=='kokumin'){
    s.pensionType = (window._mgLegacy && window._mgLegacy.pensionType==='kokumin') ? 'kokumin' : 'kosei';
  }
  mi.pensionType = s.pensionType;
  // 遺族年金モード
  setMGSurvMode(s.pensionMode);
  mi.survManual = s.pensionManual || 0;

  // 生活費：新形式（通常どおり／期間ごと）は関数で渡す。％と以前の段階形式は値で渡す
  window._mgLcFn = (typeof mgQA_lcFn==='function') ? mgQA_lcFn(tab) : null;
  mi.lcRatio = s.lcRatio;
  mi.lcMode = s.lcMode==='step' ? 'step' : 'ratio';
  mi.lcSteps = Array.isArray(s.lcSteps) ? s.lcSteps : [];

  // 住まい：その後の住まいを渡す。死亡タブの団信は選ばせない（⑤住宅の名義人・一般団信で自動）
  window._mgHousingStages = null;
  window._mgHouse = (typeof mgC_house==='function') ? mgC_house(s) : null;
  // 障害タブは団信を選ぶ（完済／残る）。⑤の名義人・一般団信の設定と両方満たす時だけ完済
  if(typeof mgQA_disApply==='function') mgQA_disApply(tab);
  const _dansinOn = (tab.kind==='dis1'||tab.kind==='dis2') ? (s.disDansin==='clear') : true;
  setMGDansin(_dansinOn);
  setMGDansinPair('h', _dansinOn); setMGDansinPair('w', _dansinOn);

  // 車：手放す車・追加する車（新形式）
  if(typeof mgQA_carApply==='function') mgQA_carApply(tab);
  // 車・駐車場の継承フラグを contingency.js に伝える
  // true=通常CF設定をそのまま使う / false=Q&A詳細設定を使う
  window._mgQA_carInherit = s.carInherit !== false;
  window._mgQA_parkInherit = s.parkInherit !== false;
  // 多台対応：現有車・将来車の配列を contingency.js から参照可能に
  if(s.carInherit === false){
    window._mgQA_existingCars = Array.isArray(s.mgExistingCars) ? s.mgExistingCars : [];
    window._mgQA_futureCars   = Array.isArray(s.mgFutureCars)   ? s.mgFutureCars   : [];
  } else {
    window._mgQA_existingCars = null;
    window._mgQA_futureCars   = null;
  }
  // 駐車場（keep/stop）— 継承時は keep 扱い
  mi.park = {
    on: s.parkInherit !== false ? true : (s.parkMode === 'keep'),
    monthly: parseFloat(String(s.parkMonthly??'').replace(/,/g,''))||0,
    from: parseInt(s.parkFromAge)||0,
    to: parseInt(s.parkToAge)||0
  };

  // 就労収入オーバーライド（新形式：window._mgIncomeOverride で contingency.js に渡す）
  // 生存者側のみ上書きする: target='h'→奥様(w)を上書き、target='w'→ご主人様(h)を上書き
  const survivorSide = tab.target === 'h' ? 'w' : 'h';
  // 新形式：遺された方の収入を関数で渡す（通常どおり／％／パート／期間ごと／働かない）
  window._mgIncomeFn = window._mgIncomeFn || {};
  const _incFn = (typeof mgQA_incomeFn==='function') ? mgQA_incomeFn(tab) : null;
  if(_incFn) window._mgIncomeFn[survivorSide] = _incFn; else delete window._mgIncomeFn[survivorSide];
  if(false){
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

  // 教育：進路の変更・奨学金（新形式。旧の奨学金設定はここで新形式へ移る）
  if(typeof mgQA_eduApply==='function') mgQA_eduApply(tab);
  // 奨学金（旧形式：window._mgScholarshipItems で contingency.js に渡す）
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
  } else {
    window._mgScholarshipItems = [];
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
  // 離れるタブの上書きを書き戻し、タブ外では空にする（他の文脈に紛れ込ませない）
  mgQA_stashOverrides();
  mgOverrides = {};
  mgCustomRows = [];
  window._mgQA_activeTabId = null;
  // ★ M5修正: Q&A タブを離れたら、その時の Q&A 専用グローバル状態を初期化する
  //   これをしないと「前タブで設定した車多台/駐車場/収入オーバーライド/奨学金/住居ステージ」
  //   が通常CFセッションの計算（renderContingency）に紛れ込む可能性があった。
  //   既定値（継承ON / 上書きなし / 空配列）に戻す。
  window._mgQA_existingCars = null;
  window._mgQA_futureCars = null;
  window._mgQA_carInherit = true;
  window._mgQA_parkInherit = true;
  window._mgIncomeOverride = {};
  window._mgIncomeFn = {};
  window._mgLcFn = null;
  window._mgScholarshipItems = [];
  window._mgHousingStages = null;
  window._mgHouse = null;
  window._mgEduDelta = null;
  window._mgCars = null;
  window._mgKind = null;
  window._mgNeedYears = 3;
  window._mgKindColor = null;
  window._mgDisCfg = null;
  window._mgSelfIncFn = null;
  window._mgScholarAt = null;
  window._mgIn = mgIn_default();
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
  mgQA_stashOverrides();
  mgQA_counter[src.target]++;
  const newId = `mgqa-${src.target}-${Date.now()}`;
  mgQA_tabs.push({
    id: newId, target: src.target,
    kind: src.kind || 'death',
    name: `${src.name} のコピー`,
    state: JSON.parse(JSON.stringify(src.state)),
    mgOverrides: JSON.parse(JSON.stringify(src.mgOverrides||{})),
    mgCustomRows: JSON.parse(JSON.stringify(src.mgCustomRows||[]))
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
  const _single = householdType==='single';
  const deceased = target==='h' ? (_single?'ご本人':'ご主人様') : '奥様';
  const spouse = target==='h' ? '奥様' : 'ご主人様';

  // 通常CF表からの参照値（読み取り専用ヒント用）
  const hAge = mgQA_iv('husband-age') || 30;
  const wAge = mgQA_iv('wife-age') || 29;
  // ④⑤の目安は通常CF表の計算結果（lastR）から取る
  // ※以前は存在しない入力欄ID（w-income / living-cost 等）を読んでいて常に「---」表示だった
  const _R = window.lastR || {};
  const _first = arr => Array.isArray(arr) && arr.length ? Math.round(arr[0]||0) : null;
  const _spInc = _first(target==='h' ? _R.wInc : _R.hInc);
  const spouseIncomeHint = _spInc!=null ? _spInc.toLocaleString() : '---';
  const _lcY = _first(_R.lc);
  const lcHint = _lcY!=null ? `年${_lcY.toLocaleString()}万円（月約${Math.round(_lcY/12*10)/10}万円）` : '---';
  // ③の説明：遺族年金の制度モードと、受け取る人（妻か夫か）で中身が変わる
  const _izoku2028 = (document.getElementById('izoku-mode')?.value||'current') === 'r2028';
  const survHint = _izoku2028
    ? '遺族厚生年金＋遺族基礎年金（子がいる場合）。2028年改正モード：子のない60歳未満の配偶者は5年間の有期給付、中高齢寡婦加算なし'
    : (target==='h'
        ? '遺族厚生年金＋遺族基礎年金（子がいる場合）＋中高齢寡婦加算（40〜65歳で子がいない期間）。30歳未満で子がいない場合は遺族厚生年金が5年間'
        : '遺族厚生年金（ご主人様が死亡時55歳以上なら60歳から。子がいる場合はすぐ）＋遺族基礎年金（子がいる場合）');

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

  // カード：閉じた状態で右に設定内容、変更していれば青線＋「変更」印。開閉状態はタブごとに記憶
  const card = (key, side, icon, title, body) => {
    const sm = mgQA_cardSummary(tab, key);
    const open = mgQA_isCardOpen(tab.id, key);
    return `
    <div class="mgqa-c2 ${side}${sm.changed?' ch':''}${open?' open':''}" data-card="${key}">
      <div class="mgqa-c2-hd" onclick="mgQA_toggleCard2('${tab.id}','${key}',this)">
        <span class="mgqa-c2-ic">${icon}</span>
        <span class="mgqa-c2-t">${title}${sm.changed?'<span class="mgqa-c2-tag">変更</span>':''}</span>
        <span class="mgqa-c2-v">${sm.v}${sm.sub?`<small>${sm.sub}</small>`:''}</span>
        <span class="mgqa-c2-arw">▾</span>
      </div>
      <div class="mgqa-c2-bd">${body}</div>
    </div>`;
  };
  const kind = MGQA_KIND_INFO[tab.kind] || MGQA_KIND_INFO.death;
  const _isDis = tab.kind==='dis1' || tab.kind==='dis2';
  const _nChanged = mgQA_cardKeys(tab).filter(k=>mgQA_cardSummary(tab,k).changed).length;

  return `
    <div class="mgqa-ph" style="--kc:${kind.color}">
      <div class="mgqa-ph-row">
        <span class="mgqa-ph-lab">${kind.short}</span>
        <span class="mgqa-ph-t">${deceased} ${kind.label}</span>
        <span class="mgqa-ph-acts">
          <button type="button" onclick="mgQA_duplicateTab('${tab.id}')">複製</button>
          <button type="button" onclick="mgQA_promptRename('${tab.id}')">名前変更</button>
          <button type="button" class="del" onclick="mgQA_deleteTab('${tab.id}')">削除</button>
        </span>
      </div>
      <div class="mgqa-ph-name">タブ名：${mgQA_escHtml(tab.name)}</div>
      <div class="mgqa-ph-chips"><span class="e">${mgQA_eventText(tab)}</span><span class="o">変更 ${_nChanged}項目</span></div>
    </div>

    <div class="mgqa-base">
      <div class="mgqa-base-hd"><span>いつ起きたら</span><span class="mgqa-base-ev">${mgQA_eventText(tab).replace(/に.*$/,'')}</span></div>
      <div class="g2 mgqa-when">
        <div class="fg"><label class="lbl">今から</label>
          <div class="suf"><input class="inp age-inp" id="mgqa-when-yr" type="number" min="1" max="70" value="${s.deathYear}" data-k="deathYear" data-cf-row="lc" data-cf-from="${hAge+(s.deathYear||1)-1}" data-cf-to="${hAge+(s.deathYear||1)-1}"><span class="sl">年後</span></div>
        </div>
        <div class="fg"><label class="lbl">${deceased}の年齢</label>
          <div class="suf"><input class="inp age-inp" id="mgqa-when-age" type="number" min="${(target==='h'?hAge:wAge)}" max="100" value="${(target==='h'?hAge:wAge)+(s.deathYear||1)-1}" oninput="mgQA_onWhenAge('${tab.id}',this)"><span class="sl" id="mgqa-when-agey">歳（${mgQA_eventYear(tab)}年）</span></div>
        </div>
      </div>
      <div class="mgqa-quick">${mgQA_whenQuick(tab).map(q=>`<button type="button" class="${q.n===(s.deathYear||1)?'on':''}" onclick="mgQA_setState('${tab.id}','deathYear',${q.n},{rebuild:true})">${q.label}</button>`).join('')}</div>
      <div class="hint">どちらに入力しても連動します。「1年後」がいちばん厳しい条件の試算です</div>
    </div>

    <div class="mgqa-sec inc"><span class="bar"></span>入ってくるお金</div>
    ${_isDis ? card('self','inc','人',`${deceased}の収入`, mgQA_selfCard(tab)) + card('sick','inc','傷','傷病手当金', mgQA_sickCard(tab)) + card('dispen','inc','年','障害年金', mgQA_disPenCard(tab)) : ''}
    ${card('ins','inc','保',_isDis?'保険金・給付金':'死亡保険金',`
      <div id="mgqa-ins-${tab.id}">
        ${s.insurances.map((ins,i)=>mgQA_renderIns(tab.id, i, ins)).join('') || '<div class="hint">保険金はありません。「＋ 保険を追加」で入力します</div>'}
      </div>
      <button class="btn-add" onclick="mgQA_addIns('${tab.id}')" style="margin-top:4px">＋ 保険を追加</button>
      <div class="mgqa-total"><span>保険金の合計（受取総額）</span><b>${Math.round(mgQA_insTotal(tab)).toLocaleString()}万円</b></div>
    `)}

    ${_isDis ? '' : card('pension','inc','年','遺族年金',`
      <div class="g2">
        <div class="fg"><label class="lbl">計算方法</label>
          <div class="mgqa-mini-seg">${tog('pensionMode','auto','自動計算')}${tog('pensionMode','manual','手入力')}</div></div>
        <div class="fg"><label class="lbl">制度 <span style="font-weight:400">（通常のCF表にも反映）</span></label>
          <div class="mgqa-mini-seg">
            <button type="button" class="${_izoku2028?'':'on'}" onclick="mgQA_setIzoku('${tab.id}','current')">現行</button>
            <button type="button" class="${_izoku2028?'on':''}" onclick="mgQA_setIzoku('${tab.id}','r2028')">2028年改正</button>
          </div></div>
      </div>
      <div class="fg"><label class="lbl">${deceased}の加入していた年金</label>
        <div class="mgqa-mini-seg">${tog('pensionType','kosei','厚生年金（会社員・公務員）')}${tog('pensionType','kokumin','国民年金のみ（自営業など）')}</div></div>
      <div class="fg" style="${s.pensionMode==='manual'?'':'display:none'}" data-cond="pensionMode:manual">
        <label class="lbl">遺族年金（年額・手入力）</label>
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.pensionManual}" data-k="pensionManual" data-cf-row="survPension" data-cf-from="${hAge+(s.deathYear||1)-1}"><span class="sl">万円/年</span></div>
      </div>
      <div class="mgqa-surv-tbl">${mgQA_survTable(tab)}</div>
      <div class="hint">${s.pensionMode==='manual'?'手入力の金額を万が一の年から毎年受け取る形で計算します':`${deceased}の年収・加入期間とお子様の年齢から自動で計算します（${survHint}）`}</div>
    `)}

    ${_single ? '' : card('income','inc','人',`${spouse}の収入`, mgQA_incomeCard(tab))}

    <div class="mgqa-sec exp"><span class="bar"></span>出ていくお金</div>
    ${card('lc','exp','生','生活費', mgQA_lcCard(tab))}
    ${_isDis ? card('stops','exp','保',`${deceased}の保険料・積立投資`, mgQA_stopsCard(tab)) : ''}

    ${card('house','exp','家','住まいとローン', mgQA_houseCard(tab))}

    ${card('edu','exp','学','教育', mgQA_eduCard(tab))}

    ${card('car','exp','車','車・駐車場', mgQA_carCard(tab))}

    <div class="hint" style="text-align:center;margin-top:12px;padding:8px;background:#f8fafc;border-radius:6px">
      入力停止から約0.6秒後に自動で再計算されます
    </div>
  `;
}

// カードの折りたたみ切替
function mgQA_toggleCard(headerEl){
  const card=headerEl?.closest('.mgqa-card');
  if(card)card.classList.toggle('collapsed');
}
window.mgQA_toggleCard=mgQA_toggleCard;

// ===== ③遺族年金 =====
function mgQA_setIzoku(tabId, mode){
  const sel = document.getElementById('izoku-mode');
  if(sel){ sel.value = mode; }
  if(typeof scheduleAutoSave==='function') scheduleAutoSave();
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(tab){ mgQA_switchTab(tabId); }
}
// 期間別の内訳表（直近の計算結果から、金額が変わる区切りごとにまとめる）
function mgQA_survTable(tab){
  const MR = window.lastMR, R = window.lastR;
  if(!MR || !Array.isArray(MR.survPension) || MR._targetIsH!==(tab.target==='h') || window._mgQA_activeTabId!==tab.id) return '';
  const survAges = tab.target==='h' ? MR.wA : MR.hA;
  if(!Array.isArray(survAges)) return '';
  const y0 = (tab.state.deathYear||1) - 1;
  const rows = [];
  for(let i=y0;i<MR.survPension.length;i++){
    const v = Math.round(MR.survPension[i]||0);
    const last = rows[rows.length-1];
    if(last && last.v===v){ last.to = survAges[i]; }
    else rows.push({from:survAges[i], to:survAges[i], v});
  }
  const shown = rows.filter(r=>r.v>0);
  if(!shown.length) return '<div class="hint" style="margin-top:6px">遺族年金はありません</div>';
  const who = tab.target==='h' ? '奥様' : 'ご主人様';
  return `<div class="mgqa-tl"><div class="r h"><span>期間（${who}の年齢）</span><span>年額</span></div>${
    shown.slice(0,8).map(r=>`<div class="r"><span class="p">${r.from===r.to?r.from+'歳':`${r.from}〜${r.to}歳`}</span><span class="a">${r.v.toLocaleString()}万円</span></div>`).join('')
  }</div>`;
}

// 計算のあとに更新する表示
function mgQA_afterCalc(tab){
  if(window._mgQA_activeTabId!==tab.id) return;
  const panel = document.getElementById('mgqa-left-panel'); if(!panel) return;
  const st = panel.querySelector('.mgqa-surv-tbl'); if(st) st.innerHTML = mgQA_survTable(tab);
  if(typeof mgQA_afterCalcExtra==='function') mgQA_afterCalcExtra(tab, panel);
}

// 必要保障額「標準」の年数（右のカードで選ぶ）
function mgQA_setNeedYears(v){
  const tab = mgQA_activeTab(); if(!tab) return;
  tab.state.needYears = Math.max(1, parseInt(v)||3);
  mgQA_calcAndRender(tab, true);
  if(typeof scheduleAutoSave==='function') scheduleAutoSave();
}

// ===== ①いつ起きたら =====
function mgQA_eventYear(tab){
  const y0 = (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear();
  return y0 + (tab.state.deathYear||1) - 1;
}
// 年齢を入れたら「何年後」に換算（現在の年齢＝1年後）
function mgQA_onWhenAge(tabId, el){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const cur = tab.target==='h' ? (mgQA_iv('husband-age')||30) : (mgQA_iv('wife-age')||29);
  const age = parseInt(el.value);
  if(!(age>=cur)) return;
  const yr = document.getElementById('mgqa-when-yr');
  if(yr){ yr.value = age - cur + 1; mgQA_updateState(tab, yr); }
}
// よく使う時点のボタン（該当しないものは出さない）
function mgQA_whenQuick(tab){
  const out = [{n:1,label:'1年後'},{n:5,label:'5年後'},{n:10,label:'10年後'}];
  // 末子が中学入学（13歳になる年）
  const ages = [...document.querySelectorAll('#children-cont input[id^="ca-"]')].map(e=>parseInt(e.value)).filter(a=>a>=0);
  if(ages.length){
    const youngest = Math.min(...ages);
    if(youngest<13) out.push({n:13-youngest+1, label:'末子が中学入学'});
  }
  // 住宅ローン完済前（返済が残っている最後の年）
  const lb = (window.lastR && window.lastR.lBal) || [];
  let last=-1; for(let i=0;i<lb.length;i++){ if((lb[i]||0)>0) last=i; }
  if(last>=1) out.push({n:last+1, label:'住宅ローン完済前'});
  return out;
}

// ===== 万が一パネルの枠組み（種類・カード要約・開閉） =====
const MGQA_KIND_INFO = {
  death:{label:'死亡',   short:'死亡', color:'#c2185b', event:'ご逝去'},
  dis1: {label:'障害1級',short:'1級',  color:'#3459ca', event:'障害1級'},
  dis2: {label:'障害2級',short:'2級',  color:'#159ea3', event:'障害2級'}
};
const MGQA_CARD_KEYS = ['ins','pension','income','lc','house','edu','car'];
function mgQA_cardKeys(tab){ return (tab.kind==='dis1'||tab.kind==='dis2') ? ['self','sick','dispen','ins','income','lc','stops','house','edu','car'] : MGQA_CARD_KEYS; }
window._mgQA_openCards = window._mgQA_openCards || {};
function mgQA_isCardOpen(tabId,key){ return !!(window._mgQA_openCards[tabId]||{})[key]; }
function mgQA_toggleCard2(tabId,key,hdEl){
  const m = window._mgQA_openCards[tabId] = window._mgQA_openCards[tabId] || {};
  m[key] = !m[key];
  const c = hdEl && hdEl.closest('.mgqa-c2');
  if(c) c.classList.toggle('open', m[key]);
}
function mgQA_promptRename(tabId){
  const t = mgQA_tabs.find(x=>x.id===tabId); if(!t) return;
  const v = prompt('タブの名前', t.name);
  if(v===null) return;
  mgQA_renameTab(tabId, v);
  if(window._mgQA_activeTabId===tabId) mgQA_refreshHeader(t);
  if(typeof scheduleAutoSave==='function') scheduleAutoSave();
}
// カードの要約（閉じた状態の右側）と「変更」判定
function mgQA_cardSummary(tab, key){
  const s = tab.state;
  const man = x => `${Math.round(x||0).toLocaleString()}万円`;
  switch(key){
    case 'self': {
      const m = s.selfMode||'none';
      const ret = s.selfRetire==='onset' ? '退職金は障害の年に受取' : '';
      if(m==='none') return {changed:true, v:'働けない', sub: ret||'収入0'};
      if(m==='pct') return {changed:true, v:`通常の${100-(+s.selfPct||0)}%`, sub: ret};
      return {changed:true, v:'期間ごと', sub: ret};
    }
    case 'sick': {
      const sk = mgC_sick(tab);
      return sk.ok ? {changed:false, v:`合計 約${Math.round(sk.annual*1.5).toLocaleString()}万円`, sub: sk.blank?'ボーナス未入力':'1年6か月・自動計算'} : {changed:false, v:'なし'};
    }
    case 'dispen':
      return s.disPenMode==='manual' ? {changed:true, v:`年${man(s.disPenManual)}`, sub:'手入力'} : {changed:false, v:'自動計算', sub:(tab.kind==='dis1'?'障害1級':'障害2級')+(s.pensionType==='kokumin'?'・国民年金のみ':'')};
    case 'stops': {
      const a = mgC_bool(s.stopIns), b = mgC_bool(s.stopInv);
      if(!a&&!b) return {changed:false, v:'続ける'};
      return {changed:true, v:[a?'保険料を止める':'',b?'積立を止める':''].filter(Boolean).join('・')};
    }
    case 'ins': {
      const list = (s.insurances||[]).filter(x=>x&&x.type!=='none');
      if(!list.length) return {changed:false, v:'なし'};
      const lump = list.filter(x=>x.type==='lump').reduce((a,x)=>a+(+x.amount||0),0);
      const ann = list.filter(x=>x.type==='annuity').reduce((a,x)=>a+mgQA_insAnnual(x),0);
      return {changed:true, v: lump>0?man(lump):`年${man(ann)}`, sub: `${list.length}件${lump>0&&ann>0?`・年金 年${man(ann)}`:''}`};
    }
    case 'pension':
      return s.pensionMode==='manual'
        ? {changed:true, v:`年${man(s.pensionManual)}`, sub:'手入力'}
        : {changed:s.pensionType==='kokumin', v:'自動計算', sub:[(document.getElementById('izoku-mode')?.value==='r2028')?'2028年改正後':'現行制度', s.pensionType==='kokumin'?'国民年金のみ':''].filter(Boolean).join('・')};
    case 'income': {
      const m = mgC_incMode(s);
      if(m==='same') return {changed:false, v:'通常どおり'};
      if(m==='none') return {changed:true, v:'働かない', sub:'万が一の後は収入0'};
      if(m==='pct'){ const pct=(s.incPctDir==='up'?1:-1)*(+s.incPctAbs||0); return {changed:pct!==0, v:`通常の${100+pct}%`}; }
      if(m==='part'){ const pt=s.incPart||{}; return {changed:true, v:`パート ${s.incBasis==='gross'?'額面':'手取り'}${man(pt.amt===undefined?130:pt.amt)}`, sub: pt.from?`${pt.from}〜${pt.to||''}歳`:''}; }
      return {changed:true, v:'期間ごと', sub: mgC_incSub(s)==='normal' ? '通常時の期間で変更' : `${(s.incomeSteps||[]).length}期間`};
    }
    case 'lc':
      if(s.lcMode==='same') return {changed:false, v:'通常どおり'};
      if(s.lcMode==='step') return {changed:true, v:'期間ごと', sub:`${(s.lcSteps||[]).length}期間（以前の形式）`};
      if(s.lcMode==='steps') return {changed:true, v:'期間ごと', sub:(s.lcStepsSub==='normal')?'通常の期間をもとに':`${(s.lcFree||[]).length}期間`};
      return {changed:(+s.lcRatio||100)!==100, v:`通常の${s.lcRatio||100}%`};
    case 'house': {
      const hs = mgC_house(s);
      const dan = (tab.kind==='dis1'||tab.kind==='dis2') ? (s.disDansin==='clear'?'団信で完済':'ローンが残る') : mgC_dansinText(tab).short;
      if(!hs.sell) return {changed:false, v:'住み続ける', sub:dan};
      const nx = hs.next==='rent'?`賃貸 家賃${hs.rentMonthly}万円`:hs.next==='buy'?`${mgC_man((hs.buy||{}).price)}の家を購入`:'実家など';
      return {changed:true, v:`${hs.sellYr}年目に売却`, sub:nx};
    }
    case 'edu': {
      const nPath = Object.values(s.eduPath||{}).reduce((a,p)=>a+Object.values(p||{}).filter(Boolean).length,0);
      const nSch = Object.values(s.eduSch||{}).reduce((a,l)=>a+(l||[]).filter(x=>+x.amt>0).length,0) + (s.scholarshipEnabled?1:0);
      if(!nPath && !nSch) return {changed:false, v:'変えない'};
      return {changed:true, v: nPath?`進路の変更 ${nPath}件`:'進路は変えない', sub: nSch?`奨学金 ${nSch}件`:''};
    }
    case 'car': {
      const parts = [];
      if(s.carInherit===false) parts.push('車を変更（以前の形式）');
      else {
        const nRel = Object.values(s.carRelease||{}).filter(Boolean).length, nAdd = (s.carAdd||[]).length;
        if(nRel) parts.push(`${nRel}台を手放す`);
        if(nAdd) parts.push(`${nAdd}台を追加`);
      }
      const park = s.parkInherit===false ? (s.parkMode==='stop' ? '駐車場なし' : `駐車場 月${s.parkMonthly??1.5}万円`) : '';
      if(!parts.length && !park) return {changed:false, v:'通常どおり'};
      return {changed:true, v: parts.join('・')||'車は通常どおり', sub: park};
    }
  }
  return {changed:false, v:''};
}
// 入力中（再構築しない更新）にも見出しの要約・変更数を追従させる
function mgQA_refreshHeader(tab){
  const panel = document.getElementById('mgqa-left-panel'); if(!panel) return;
  mgQA_cardKeys(tab).forEach(k=>{
    const c = panel.querySelector(`.mgqa-c2[data-card="${k}"]`); if(!c) return;
    const sm = mgQA_cardSummary(tab,k);
    c.classList.toggle('ch', sm.changed);
    const t = c.querySelector('.mgqa-c2-t'); const v = c.querySelector('.mgqa-c2-v');
    if(t){ const tag=t.querySelector('.mgqa-c2-tag'); if(sm.changed&&!tag) t.insertAdjacentHTML('beforeend','<span class="mgqa-c2-tag">変更</span>'); if(!sm.changed&&tag) tag.remove(); }
    if(v) v.innerHTML = `${sm.v}${sm.sub?`<small>${sm.sub}</small>`:''}`;
  });
  const n = mgQA_cardKeys(tab).filter(k=>mgQA_cardSummary(tab,k).changed).length;
  const chip = panel.querySelector('.mgqa-ph-chips .o'); if(chip) chip.textContent = `変更 ${n}項目`;
  const nm = panel.querySelector('.mgqa-ph-name'); if(nm) nm.textContent = `タブ名：${tab.name}`;
  const ev = panel.querySelector('.mgqa-ph-chips .e'); if(ev) ev.textContent = mgQA_eventText(tab);
  const bev = panel.querySelector('.mgqa-base-ev'); if(bev) bev.textContent = mgQA_eventText(tab).replace(/に.*$/,'');
  const cur = tab.target==='h' ? (mgQA_iv('husband-age')||30) : (mgQA_iv('wife-age')||29);
  const ageEl = document.getElementById('mgqa-when-age');
  if(ageEl && document.activeElement!==ageEl) ageEl.value = cur + (tab.state.deathYear||1) - 1;
  const agey = document.getElementById('mgqa-when-agey'); if(agey) agey.textContent = `歳（${mgQA_eventYear(tab)}年）`;
  panel.querySelectorAll('.mgqa-quick button').forEach(b=>{ const m=(b.getAttribute('onclick')||'').match(/'deathYear',(\d+)/); b.classList.toggle('on', !!m && +m[1]===(tab.state.deathYear||1)); });
}
// 「2030年（ご主人様34歳）にご逝去」
function mgQA_eventText(tab){
  const kind = MGQA_KIND_INFO[tab.kind] || MGQA_KIND_INFO.death;
  const y0 = (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear();
  const n = (tab.state.deathYear||1) - 1;
  const age = (tab.target==='h' ? (mgQA_iv('husband-age')||30) : (mgQA_iv('wife-age')||29)) + n;
  return `${y0+n}年（${tab.target==='h'?'ご主人様':'奥様'}${age}歳）に${kind.event}`;
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
  if(typeof scheduleAutoSave==='function') scheduleAutoSave();
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

// --- 死亡後生活費 段階UI ---
function mgQA_buildLcSteps(tab){
  const steps = Array.isArray(tab.state.lcSteps) ? tab.state.lcSteps : [];
  const startYr = (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear();
  let html = `
    <div style="font-size:11px;color:#64748b;margin-bottom:6px;line-height:1.5">
      期間ごとに生活費を変えられます。<b>段階1=自由入力のみ</b>、<b>段階2以降は「前段階の割合」モードも選択可</b>。
    </div>
  `;
  if(steps.length===0){
    html += '<div style="padding:8px;color:#94a3b8;font-size:11px">段階がまだありません。「+ 段階を追加」してください。</div>';
  } else {
    steps.forEach((st, i) => {
      const isFirst = i===0;
      const mode = st.mode || 'free';
      const isPct = mode === 'pct';
      html += `
        <div style="background:#fff8e6;border:1px solid #fbbf24;border-radius:6px;padding:8px;margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <div style="font-size:11px;font-weight:700;color:#92400e">段階 ${i+1}</div>
            <button class="mgqa-btn danger" onclick="mgQA_removeLcStep('${tab.id}', ${i})" title="段階削除">×</button>
          </div>
          ${isFirst ? '' : `
            <div style="display:flex;gap:3px;margin-bottom:6px">
              <button type="button" class="btn-tog ${!isPct?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setLcStepMode('${tab.id}',${i},'free')">自由入力</button>
              <button type="button" class="btn-tog ${isPct?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setLcStepMode('${tab.id}',${i},'pct')">前段階の割合</button>
            </div>
          `}
          ${!isPct ? `
            <div class="g2" style="margin-bottom:4px">
              <div class="fg"><label class="lbl" style="font-size:10px">金額</label>
                <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${st.base||''}" placeholder="${isFirst?'空欄=通常生活費':'空欄=前段階引継ぎ'}" data-k="lcSteps.${i}.base" data-cf-row="lc"><span class="sl">万円/年</span></div>
              </div>
              <div class="fg"><label class="lbl" style="font-size:10px">上昇率</label>
                <div class="suf"><input class="inp" type="number" step="0.1" value="${st.rate||0}" data-k="lcSteps.${i}.rate" data-cf-row="lc"><span class="sl">%/年</span></div>
              </div>
            </div>
          ` : `
            <div class="fg" style="margin-bottom:4px">
              <label class="lbl" style="font-size:10px">前段階の何%</label>
              <div class="suf"><input class="inp" type="number" min="1" max="200" value="${st.pct||80}" data-k="lcSteps.${i}.pct" data-cf-row="lc"><span class="sl">%</span></div>
            </div>
          `}
          <div class="g2">
            <div class="fg"><label class="lbl" style="font-size:10px">開始年</label>
              <div class="suf"><input class="inp age-inp" type="number" value="${st.fromYr||''}" placeholder="${isFirst?String(startYr):'前段階+1'}" data-k="lcSteps.${i}.fromYr" data-cf-row="lc"><span class="sl">年</span></div>
            </div>
            <div class="fg"><label class="lbl" style="font-size:10px">終了年</label>
              <div class="suf"><input class="inp age-inp" type="number" value="${st.toYr||''}" placeholder="空欄=ずっと" data-k="lcSteps.${i}.toYr" data-cf-row="lc"><span class="sl">年</span></div>
            </div>
          </div>
        </div>
      `;
    });
  }
  html += `<button class="mgqa-btn" onclick="mgQA_addLcStep('${tab.id}')" style="margin-top:4px">+ 段階を追加</button>`;
  return html;
}
function mgQA_addLcStep(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.lcSteps)) tab.state.lcSteps = [];
  const steps = tab.state.lcSteps;
  const prev = steps[steps.length-1];
  const startYr = (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear();
  const newFromYr = prev ? ((prev.toYr||prev.fromYr||startYr) + (prev.toYr?1:5)) : startYr;
  steps.push({ base: 0, rate: 0, fromYr: newFromYr, toYr: 0, mode: steps.length===0?'free':'pct', pct: 80 });
  mgQA_switchTab(tabId);
}
function mgQA_removeLcStep(tabId, idx){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.lcSteps)) return;
  tab.state.lcSteps.splice(idx, 1);
  mgQA_switchTab(tabId);
}
function mgQA_setLcStepMode(tabId, idx, mode){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.lcSteps)) return;
  if(!tab.state.lcSteps[idx]) return;
  tab.state.lcSteps[idx].mode = mode;
  mgQA_switchTab(tabId);
}
window.mgQA_addLcStep = mgQA_addLcStep;
window.mgQA_removeLcStep = mgQA_removeLcStep;
window.mgQA_setLcStepMode = mgQA_setLcStepMode;

// --- 万一の現有車・将来車（複数台対応）---
function mgQA_buildMgCars(tab){
  const ec = Array.isArray(tab.state.mgExistingCars) ? tab.state.mgExistingCars : [];
  const fc = Array.isArray(tab.state.mgFutureCars) ? tab.state.mgFutureCars : [];
  let html = '';
  // 現有車セクション
  html += `<div style="background:#fff8e6;border:1px solid #ffc000;border-radius:8px;padding:10px;margin-bottom:10px">`;
  html += `<div style="font-size:11px;font-weight:700;color:#7a5000;margin-bottom:6px">現有車（既保有）</div>`;
  if(ec.length===0){
    html += `<div style="padding:6px;color:#94a3b8;font-size:11px">未登録</div>`;
  } else {
    ec.forEach((c,i)=>{
      html += mgQA_buildExistingCarCard(tab.id,i,c);
    });
  }
  html += `<button class="mgqa-btn" onclick="mgQA_addMgExistingCar('${tab.id}')" style="margin-top:4px">+ 現有車を追加</button>`;
  html += `</div>`;
  // 将来車セクション
  html += `<div style="background:#f0ecff;border:1px solid #c4b0e8;border-radius:8px;padding:10px">`;
  html += `<div style="font-size:11px;font-weight:700;color:#6b5ea8;margin-bottom:6px">将来購入予定の車</div>`;
  if(fc.length===0){
    html += `<div style="padding:6px;color:#94a3b8;font-size:11px">未登録</div>`;
  } else {
    fc.forEach((c,i)=>{
      html += mgQA_buildFutureCarCard(tab.id,i,c);
    });
  }
  html += `<button class="mgqa-btn" onclick="mgQA_addMgFutureCar('${tab.id}')" style="margin-top:4px">+ 将来車を追加</button>`;
  html += `</div>`;
  return html;
}
function mgQA_buildExistingCarCard(tabId,i,c){
  const isLoan = c.pay==='loan';
  const isUsed = c.type==='used';
  return `
    <div style="background:white;border:1px solid #fbbf24;border-radius:6px;padding:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;color:#92400e">現有車 ${i+1}</div>
        <button class="mgqa-btn danger" onclick="mgQA_removeMgExistingCar('${tabId}',${i})">×</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button type="button" class="btn-tog ${!isUsed?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'type','new')">新車</button>
        <button type="button" class="btn-tog ${isUsed?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'type','used')">中古</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button type="button" class="btn-tog ${!isLoan?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'pay','cash')">現金一括</button>
        <button type="button" class="btn-tog ${isLoan?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'pay','loan')">ローン中</button>
      </div>
      <div class="g3" style="margin-bottom:4px">
        <div class="fg"><label class="lbl" style="font-size:10px">購入時期</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" value="${c.boughtAgo||3}" data-k="mgExistingCars.${i}.boughtAgo" data-cf-row="carTotal"><span class="sl">年前</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:10px">購入価格</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.price||300}" data-k="mgExistingCars.${i}.price" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:10px">手放す</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" value="${c.endYrs||5}" data-k="mgExistingCars.${i}.endYrs" data-cf-row="carTotal"><span class="sl">年後</span></div></div>
      </div>
      <div class="g2" style="margin-bottom:4px">
        <div class="fg"><label class="lbl" style="font-size:10px">車検費用</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.insp||10}" data-k="mgExistingCars.${i}.insp" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
      </div>
      ${isLoan ? (()=>{
        const loanMode = c.loanInputMode || 'original';
        return `
        <div style="background:#fff3d0;border:1px solid #ffc000;border-radius:6px;padding:6px;margin-top:4px">
          <div style="display:flex;gap:4px;margin-bottom:4px">
            <button type="button" class="btn-tog ${loanMode==='original'?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'loanInputMode','original')">当初借入条件から</button>
            <button type="button" class="btn-tog ${loanMode==='reverse'?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','existing',${i},'loanInputMode','reverse')">現在の支払いから逆算</button>
          </div>
          ${loanMode==='reverse' ? `
            <div style="font-size:10px;font-weight:700;color:#7a5000;margin-bottom:4px">現在の支払い情報</div>
            <div class="g3">
              <div class="fg"><label class="lbl" style="font-size:9px">月々の支払い</label>
                <div class="suf"><input class="inp amt-inp" type="number" min="0" step="0.1" value="${c.loanMonthly||3}" data-k="mgExistingCars.${i}.loanMonthly" data-cf-row="carTotal"><span class="sl">万円/月</span></div></div>
              <div class="fg"><label class="lbl" style="font-size:9px">ボーナス時加算</label>
                <div class="suf"><input class="inp amt-inp" type="number" min="0" step="0.1" value="${c.loanBonus||0}" data-k="mgExistingCars.${i}.loanBonus" data-cf-row="carTotal"><span class="sl">万円/回</span></div></div>
              <div class="fg"><label class="lbl" style="font-size:9px">残りの返済年数</label>
                <div class="suf"><input class="inp age-inp" type="number" min="0" max="20" step="0.5" value="${c.loanRemainYrs||3}" data-k="mgExistingCars.${i}.loanRemainYrs" data-cf-row="carTotal"><span class="sl">年</span></div></div>
            </div>
            <div style="font-size:9px;color:#475569;margin-top:3px">※ボーナスは年2回想定。年額=月々×12+ボーナス×2</div>
          ` : `
            <div style="font-size:10px;font-weight:700;color:#7a5000;margin-bottom:4px">当初ローン条件</div>
            <div class="g3">
              <div class="fg"><label class="lbl" style="font-size:9px">当初頭金</label>
                <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.down||50}" data-k="mgExistingCars.${i}.down" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
              <div class="fg"><label class="lbl" style="font-size:9px">当初借入年数</label>
                <div class="suf"><input class="inp age-inp" type="number" min="1" max="10" value="${c.loanYrs||5}" data-k="mgExistingCars.${i}.loanYrs" data-cf-row="carTotal"><span class="sl">年</span></div></div>
              <div class="fg"><label class="lbl" style="font-size:9px">当初金利</label>
                <div class="suf"><input class="inp amt-inp" type="number" min="0" max="10" step="0.1" value="${c.loanRate||2.5}" data-k="mgExistingCars.${i}.loanRate" data-cf-row="carTotal"><span class="sl">%</span></div></div>
            </div>
          `}
        </div>`;
      })() : ''}
    </div>`;
}
function mgQA_buildFutureCarCard(tabId,i,c){
  const isLoan = c.pay==='loan';
  const isUsed = c.type==='used';
  return `
    <div style="background:white;border:1px solid #c4b0e8;border-radius:6px;padding:8px;margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:700;color:#6b5ea8">将来車 ${i+1}</div>
        <button class="mgqa-btn danger" onclick="mgQA_removeMgFutureCar('${tabId}',${i})">×</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button type="button" class="btn-tog ${!isUsed?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','future',${i},'type','new')">新車</button>
        <button type="button" class="btn-tog ${isUsed?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','future',${i},'type','used')">中古</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button type="button" class="btn-tog ${!isLoan?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','future',${i},'pay','cash')">現金一括</button>
        <button type="button" class="btn-tog ${isLoan?'on':''}" style="font-size:10px;padding:3px 8px" onclick="mgQA_setMgCarField('${tabId}','future',${i},'pay','loan')">ローン</button>
      </div>
      <div class="g3" style="margin-bottom:4px">
        <div class="fg"><label class="lbl" style="font-size:10px">車両価格</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.price||300}" data-k="mgFutureCars.${i}.price" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:10px">初回購入</label>
          <div class="suf"><input class="inp age-inp" type="number" min="1" max="30" value="${c.first||1}" data-k="mgFutureCars.${i}.first" data-cf-row="carTotal"><span class="sl">年目</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:10px">乗換周期</label>
          <div class="suf"><input class="inp age-inp" type="number" min="1" max="20" value="${c.cycle||7}" data-k="mgFutureCars.${i}.cycle" data-cf-row="carTotal"><span class="sl">年ごと</span></div></div>
      </div>
      <div class="g2" style="margin-bottom:4px">
        <div class="fg"><label class="lbl" style="font-size:10px">車検費用</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.insp||10}" data-k="mgFutureCars.${i}.insp" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:10px">手放す年齢</label>
          <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${c.endAge||''}" placeholder="空欄=ずっと" data-k="mgFutureCars.${i}.endAge" data-cf-row="carTotal"><span class="sl">歳</span></div></div>
      </div>
      ${isLoan ? `
        <div style="background:#f0ecff;border:1px solid #c4b0e8;border-radius:6px;padding:6px;margin-top:4px">
          <div style="font-size:10px;font-weight:700;color:#6b5ea8;margin-bottom:4px">ローン条件</div>
          <div class="g3">
            <div class="fg"><label class="lbl" style="font-size:9px">頭金</label>
              <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.down||50}" data-k="mgFutureCars.${i}.down" data-cf-row="carTotal"><span class="sl">万円</span></div></div>
            <div class="fg"><label class="lbl" style="font-size:9px">借入年数</label>
              <div class="suf"><input class="inp age-inp" type="number" min="1" max="10" value="${c.loanYrs||5}" data-k="mgFutureCars.${i}.loanYrs" data-cf-row="carTotal"><span class="sl">年</span></div></div>
            <div class="fg"><label class="lbl" style="font-size:9px">金利</label>
              <div class="suf"><input class="inp amt-inp" type="number" min="0" max="10" step="0.1" value="${c.loanRate||2.5}" data-k="mgFutureCars.${i}.loanRate" data-cf-row="carTotal"><span class="sl">%</span></div></div>
          </div>
        </div>` : ''}
    </div>`;
}
function mgQA_addMgExistingCar(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.mgExistingCars)) tab.state.mgExistingCars = [];
  tab.state.mgExistingCars.push({type:'new',pay:'cash',boughtAgo:3,price:300,insp:10,endYrs:5,loanYrs:5,down:50,loanRate:2.5,loanInputMode:'original',loanMonthly:3,loanBonus:0,loanRemainYrs:3});
  mgQA_switchTab(tabId);
}
function mgQA_removeMgExistingCar(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.mgExistingCars)) return;
  tab.state.mgExistingCars.splice(i,1);
  mgQA_switchTab(tabId);
}
function mgQA_addMgFutureCar(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.mgFutureCars)) tab.state.mgFutureCars = [];
  tab.state.mgFutureCars.push({type:'new',pay:'cash',price:300,first:1,cycle:7,insp:10,endAge:0,loanYrs:5,down:50,loanRate:2.5});
  mgQA_switchTab(tabId);
}
function mgQA_removeMgFutureCar(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.mgFutureCars)) return;
  tab.state.mgFutureCars.splice(i,1);
  mgQA_switchTab(tabId);
}
function mgQA_setMgCarField(tabId,which,i,field,value){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  const arr = which==='existing' ? tab.state.mgExistingCars : tab.state.mgFutureCars;
  if(!Array.isArray(arr) || !arr[i]) return;
  arr[i][field] = value;
  mgQA_switchTab(tabId);
}
window.mgQA_addMgExistingCar = mgQA_addMgExistingCar;
window.mgQA_removeMgExistingCar = mgQA_removeMgExistingCar;
window.mgQA_addMgFutureCar = mgQA_addMgFutureCar;
window.mgQA_removeMgFutureCar = mgQA_removeMgFutureCar;
window.mgQA_setMgCarField = mgQA_setMgCarField;

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
    <!-- 手取り計算機（参考ツール） -->
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:8px;margin-bottom:8px">
      <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:4px">手取り計算機（参考）</div>
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
    // 万一後の遺族収入: 配偶者は他界しているため配偶者控除なし（false固定）
    calcTakeHomeBase(gross, `mgqa-nc-result-${tabId}`, `mgqa-nc-detail-${tabId}`, isFuyo, undefined, false);
  }
}

function mgQA_addIncomeStep(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  if(!Array.isArray(tab.state.incomeSteps)) tab.state.incomeSteps = [];
  const steps = tab.state.incomeSteps;
  // 前段階の終了をデフォルトの開始に
  const prev = steps[steps.length-1];
  const sp = tab.target==='h' ? 'w' : 'h';
  const newFrom = prev ? (prev.ageTo+1) : mgC_ageAtEvent(tab, sp);
  steps.push({ ageFrom: newFrom, ageTo: newFrom+9, amt: 0 });
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
            data-v-bool="true" data-cf-row="scholarship" data-cf-from="${hsFromAge}"> 高校入学時 ${hsNote}
          <input type="number" value="${sc.hs.amount||0}" min="0" style="width:80px"
            data-k="scholarships.${idx}.hs.amount" data-cf-row="scholarship" data-cf-from="${hsFromAge}" ${!sc.hs.on?'disabled':''}> 万円
        </label>
        <label style="display:flex;align-items:center;gap:6px;font-size:11px;flex-wrap:wrap">
          <input type="checkbox" ${sc.univ.on?'checked':''}
            data-k="scholarships.${idx}.univ.on"
            data-v-bool="true" data-cf-row="scholarship" data-cf-from="${univFromAge}"> 大学入学時 ${univNote}
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
  if(!ins || ins.type==='none' || !ins.type) return '';
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  const st = tab?.state || {};
  const isAnn = ins.type==='annuity';
  const deceased = tab?.target==='h' ? 'ご主人様' : '奥様';
  const survivor = (tab&&(tab.kind==='dis1'||tab.kind==='dis2')) ? deceased : (householdType==='single' ? 'ご遺族' : (tab?.target==='h' ? '奥様' : 'ご主人様'));
  const hAgeNow = mgQA_iv('husband-age') || 30;
  const deathHAge = hAgeNow + (st.deathYear||1) - 1;
  const seg = (v,label) => `<button type="button" class="${ins.type===v?'on':''}" onclick="mgQA_setState('${tabId}','insurances.${idx}.type','${v}',{rebuild:true})">${label}</button>`;
  let body;
  if(isAnn){
    const p = mgQA_insAnnuityPeriod(tab, ins);
    const monthly = mgQA_insMonthly(ins);
    const by = ins.endBy==='receiver' ? 'receiver' : 'insured';
    const bySeg = (v,label) => `<button type="button" class="${by===v?'on':''}" onclick="mgQA_setState('${tabId}','insurances.${idx}.endBy','${v}',{rebuild:true})">${label}</button>`;
    body = `
      <div class="g2">
        <div class="fg"><label class="lbl">毎月の受取額</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" step="0.1" value="${monthly}" data-k="insurances.${idx}.monthly" data-cf-row="insAnnuity_${idx}" data-cf-from="${deathHAge}"><span class="sl">万円/月</span></div></div>
        <div class="fg"><label class="lbl">受け取り終わり</label>
          <div class="suf"><input class="inp age-inp" type="number" min="20" max="100" value="${ins.endAge||65}" data-k="insurances.${idx}.endAge" data-cf-row="insAnnuity_${idx}" data-cf-from="${deathHAge}"><span class="sl">歳まで</span></div></div>
      </div>
      <div class="mgqa-mini-seg" style="margin-top:6px"><span class="lbl" style="margin:0 6px 0 0">終わりの年齢は</span>${bySeg('insured',deceased+'（被保険者）')}${bySeg('receiver',survivor+'（受取人）')}</div>
      <div class="mgqa-ins-sum">${p.years>0?`受取期間 ${p.years}年（${p.from}〜${p.to}年）　合計 <b>${Math.round(p.total).toLocaleString()}万円</b>`:'受取期間がありません（終わりの年齢を確認してください）'}</div>`;
  }else{
    body = `
      <div class="g2">
        <div class="fg"><label class="lbl">受取額</label>
          <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${ins.amount||0}" data-k="insurances.${idx}.amount" data-cf-row="insPayArr" data-cf-from="${deathHAge}"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl">受取人</label><div class="mgqa-ro">${survivor}</div></div>
      </div>`;
  }
  return `
    <div class="mgqa-ins2" data-idx="${idx}">
      <div class="mgqa-ins2-hd">
        <input class="inp" type="text" placeholder="保険の名前（例：収入保障保険）" value="${mgQA_escHtml(ins.name||'')}" data-k="insurances.${idx}.name">
        <button type="button" class="mgqa-del" onclick="mgQA_removeIns('${tabId}', ${idx})">削除</button>
      </div>
      <div class="mgqa-mini-seg">${seg('lump','一時金')}${seg('annuity','毎年受け取る')}</div>
      ${body}
    </div>`;
}
// 年金型の月額（旧データは年額だけ持っている）
function mgQA_insMonthly(ins){
  if(ins.monthly!==undefined && ins.monthly!==null && ins.monthly!=='') return +ins.monthly||0;
  return Math.round((+ins.annual||0)/12*10)/10;
}
function mgQA_insAnnual(ins){
  if(ins.monthly!==undefined && ins.monthly!==null && ins.monthly!=='') return Math.round((+ins.monthly||0)*12*10)/10;
  return +ins.annual||0;
}
// 年金型の受取期間（万が一の年から、終わりの年齢の年まで）
function mgQA_insAnnuityPeriod(tab, ins){
  const st = tab.state;
  const y0 = (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear();
  const from = y0 + (st.deathYear||1) - 1;
  const insured = ins.endBy!=='receiver';
  const who = insured ? tab.target : (tab.target==='h'?'w':'h');
  const curAge = who==='h' ? (mgQA_iv('husband-age')||30) : (mgQA_iv('wife-age')||29);
  const ageAtFrom = curAge + (st.deathYear||1) - 1;
  const years = Math.max(0, (+ins.endAge||65) - ageAtFrom + 1);
  return {from, to: from+years-1, years, total: years*mgQA_insAnnual(ins)};
}
// 保険金の受取総額（一時金＋年金型の合計）
function mgQA_insTotal(tab){
  return (tab.state.insurances||[]).reduce((a,ins)=>{
    if(!ins||ins.type==='none') return a;
    if(ins.type==='lump') return a+(+ins.amount||0);
    return a+mgQA_insAnnuityPeriod(tab,ins).total;
  },0);
}

function mgQA_addIns(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId);
  if(!tab) return;
  tab.state.insurances = (tab.state.insurances||[]).filter(x=>x&&x.type!=='none');
  tab.state.insurances.push({ type:'lump', amount:0, name:'', endAge:65, endBy:'insured' });
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
    if(key.startsWith('eduSch.')&&key.endsWith('.when')){
      mgQA_switchTab(tab.id);
      return;
    }
    if(key.startsWith('scholarships.')&&key.endsWith('.on')){
      mgQA_switchTab(tab.id);
      return;
    }
  } else {
    tab.state[key] = val;
    // 条件表示の更新
    // ★ L3修正: 旧コードは classList.toggle('hidden', ...) を使っていたが、
    //   mgQA_buildPanel は条件付き要素を style="display:none" インラインで生成しており、
    //   .hidden クラスは CSS で定義されていないため切替が効かない場合があった。
    //   style.display を直接いじるように変更。
    document.querySelectorAll('[data-cond]').forEach(cond=>{
      const [k, v] = cond.dataset.cond.split(':');
      if(k===key){
        // 値を文字列比較（'true' と true を同一視）
        const cur = String(tab.state[k]);
        cond.style.display = (cur===v) ? '' : 'none';
      }
    });
    // 奨学金enabledの切替でタブ再描画（子リスト表示切替）
    if(key==='scholarshipEnabled'){
      mgQA_switchTab(tab.id);
      return;
    }
  }

  // 見出しの要約・変更数を追従
  mgQA_refreshHeader(tab);
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
