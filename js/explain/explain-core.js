// explain-core.js — 計算根拠ポップアップ共通UI
// セル右上のⓘアイコンをクリックすると、その年の計算根拠をポップアップ表示する
// 各行種別の具体的な内容は explain-<行種別>.js に登録する

// ===== レンダラ登録機構 =====
// 使い方: registerExplainRenderer('lCtrl', function(ctx){ return {title, simple, detail} })
// ctx = { rowKey, colIndex, value, R, cYear, cfType:'cf'|'mg', ... }
window._explainRenderers = window._explainRenderers || {};
function registerExplainRenderer(rowKey, fn){
  window._explainRenderers[rowKey] = fn;
}

// ===== ⓘアイコンを持つべき行種別の集合 =====
window._explainEnabledRows = window._explainEnabledRows || new Set();
function enableExplainForRow(rowKey){
  window._explainEnabledRows.add(rowKey);
}
function isExplainEnabled(rowKey){
  return window._explainEnabledRows.has(rowKey);
}

// ===== セルに ⓘ アイコンHTMLを生成 =====
// cf-table.js / contingency.js のセル生成時に呼び出す
function explainIconHtml(rowKey, colIndex, cfType){
  if(!isExplainEnabled(rowKey)) return '';
  return `<span class="explain-ic" data-explain-row="${rowKey}" data-explain-col="${colIndex}" data-explain-type="${cfType||'cf'}" title="計算根拠を表示" onclick="event.stopPropagation();openExplainPopup(this)">ⓘ</span>`;
}

// ===== ポップアップ開閉 =====
let _explainPopupEl = null;
let _explainDetailOpen = false;

function closeExplainPopup(){
  if(_explainPopupEl){
    _explainPopupEl.remove();
    _explainPopupEl = null;
  }
  _explainDetailOpen = false;
  document.removeEventListener('click', _explainOutsideClick, true);
  document.removeEventListener('keydown', _explainEscKey, true);
}

function _explainOutsideClick(e){
  if(!_explainPopupEl) return;
  if(_explainPopupEl.contains(e.target)) return;
  // セル内のⓘアイコン自身をクリックした場合は別のポップアップ処理で閉じ直される
  if(e.target.classList && e.target.classList.contains('explain-ic')) return;
  closeExplainPopup();
}

function _explainEscKey(e){
  if(e.key === 'Escape') closeExplainPopup();
}

function openExplainPopup(iconEl){
  const rowKey = iconEl.dataset.explainRow;
  const colIndex = parseInt(iconEl.dataset.explainCol);
  const cfType = iconEl.dataset.explainType || 'cf';
  if(!rowKey || isNaN(colIndex)) return;

  // 既に同じセルのポップアップが開いていれば閉じる（トグル動作）
  if(_explainPopupEl && _explainPopupEl.dataset.row === rowKey &&
     parseInt(_explainPopupEl.dataset.col) === colIndex){
    closeExplainPopup();
    return;
  }
  closeExplainPopup();

  // ソースデータを取得
  const R = cfType === 'mg' ? window.lastMR : window.lastR;
  if(!R){
    alert('計算結果が見つかりません。CF表を再生成してください。');
    return;
  }

  // レンダラ取得
  const renderer = window._explainRenderers[rowKey];
  if(!renderer){
    console.warn('[explain] no renderer for', rowKey);
    return;
  }

  // コンテキスト構築
  const cYear = cfType === 'mg' ? (window.lastMRCYear || window.lastCYear) : window.lastCYear;
  const hAge = parseInt(document.getElementById('husband-age')?.value) || 0;
  const wAge = parseInt(document.getElementById('wife-age')?.value) || 0;
  // セル手動上書きの検出
  const overrideMap = cfType === 'mg'
    ? (typeof mgOverrides !== 'undefined' ? mgOverrides : {})
    : (typeof cfOverrides !== 'undefined' ? cfOverrides : {});
  const overrideValue = overrideMap[rowKey]?.[colIndex];
  const isOverridden = overrideValue !== undefined;
  const autoValue = R[rowKey] ? R[rowKey][colIndex] : null;
  const value = isOverridden ? overrideValue : autoValue;
  const ctx = {
    rowKey, colIndex, value,
    autoValue, overrideValue, isOverridden,
    R, cYear, cfType,
    hAge: hAge + colIndex,
    wAge: wAge + colIndex,
    year: (cYear || 0) + colIndex,
    elapsed: colIndex + 1
  };

  // レンダラ実行
  let content;
  try {
    content = renderer(ctx);
  } catch(e){
    console.error('[explain] render error', e);
    content = { title: 'エラー', simple: '計算根拠の取得に失敗しました: ' + e.message, detail: null };
  }

  // ポップアップ生成
  _buildPopup(iconEl, rowKey, colIndex, content);

  // 外部クリック・Escで閉じる（次フレームで登録、即閉じ防止）
  setTimeout(()=>{
    document.addEventListener('click', _explainOutsideClick, true);
    document.addEventListener('keydown', _explainEscKey, true);
  }, 0);
}

function _buildPopup(anchorEl, rowKey, colIndex, content){
  const pop = document.createElement('div');
  pop.className = 'explain-popup';
  pop.dataset.row = rowKey;
  pop.dataset.col = String(colIndex);
  const simple = content.simple || '';
  const detail = content.detail || '';
  pop.innerHTML = `
    <div class="explain-popup-header" data-drag-handle="1" title="ドラッグで移動">
      <span class="explain-popup-title">${content.title || '計算根拠'}</span>
      <button class="explain-popup-close" onclick="closeExplainPopup()">×</button>
    </div>
    <div class="explain-popup-simple">${simple}</div>
    ${detail ? `
      <div class="explain-popup-detail-wrap" style="display:none">
        <div class="explain-popup-detail">${detail}</div>
      </div>
      <button class="explain-popup-toggle" onclick="toggleExplainDetail(this)">もっと詳しく ▾</button>
    ` : ''}
  `;
  document.body.appendChild(pop);
  _explainPopupEl = pop;

  // 位置決め：アイコンの下に表示、画面からはみ出たら上に
  const r = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let top = r.bottom + 6;
  let left = r.left - popRect.width / 2 + r.width / 2;
  if(left < 8) left = 8;
  if(left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
  if(top + popRect.height > window.innerHeight - 8){
    top = r.top - popRect.height - 6;
  }
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';

  // ヘッダーをドラッグハンドルにしてポップアップを移動可能に
  _enableDrag(pop);
}

// ===== ドラッグ移動 =====
function _enableDrag(pop){
  const handle = pop.querySelector('[data-drag-handle="1"]');
  if(!handle) return;
  let startX=0, startY=0, startLeft=0, startTop=0, dragging=false;
  const onMove = (e)=>{
    if(!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    let nl = startLeft + dx;
    let nt = startTop + dy;
    // 画面内に収める
    const rect = pop.getBoundingClientRect();
    nl = Math.max(8, Math.min(window.innerWidth - rect.width - 8, nl));
    nt = Math.max(8, Math.min(window.innerHeight - rect.height - 8, nt));
    pop.style.left = nl + 'px';
    pop.style.top = nt + 'px';
  };
  const onUp = ()=>{
    dragging = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    handle.classList.remove('dragging');
  };
  const onDown = (e)=>{
    // ×ボタンクリック時はドラッグしない
    if(e.target.closest && e.target.closest('.explain-popup-close')) return;
    const p = e.touches ? e.touches[0] : e;
    const rect = pop.getBoundingClientRect();
    startX = p.clientX;
    startY = p.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    dragging = true;
    handle.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:true});
    document.addEventListener('touchend', onUp);
    e.preventDefault();
  };
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, {passive:false});
}

function toggleExplainDetail(btn){
  const wrap = btn.parentElement.querySelector('.explain-popup-detail-wrap');
  if(!wrap) return;
  _explainDetailOpen = !_explainDetailOpen;
  if(_explainDetailOpen){
    wrap.style.display = '';
    btn.textContent = '閉じる ▴';
  } else {
    wrap.style.display = 'none';
    btn.textContent = 'もっと詳しく ▾';
  }
}

// ===== ユーティリティ =====
// 数値をフォーマット
// - suffix が '万円' の場合: 万円単位で受け取り、円単位（1円精度）で表示
//   例: 17.5（万円） → "175,000円"
// - suffix が '円' の場合: そのまま円単位で表示
// - suffix が '%' の場合: 小数点1桁で表示
// - その他（null 等）: 小数点1桁で表示
function explainFmt(n, suffix){
  if(n === null || n === undefined || isNaN(n)) return '-';
  if(suffix === '万円'){
    // 万円単位の値を 1円精度で表示
    const yen = Math.round(n * 10000);
    return yen.toLocaleString() + '円';
  }
  if(suffix === '円'){
    return Math.round(n).toLocaleString() + '円';
  }
  // それ以外（%, 単位なし等）
  const v = Math.round(n * 10) / 10;
  return v.toLocaleString() + (suffix || '');
}

console.log('[explain] core loaded');
