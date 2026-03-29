// cf-highlight.js — CF表スクロール・ハイライト

// ===== CF表フォーカス連動スクロール＋ハイライト =====

// ── 外部API ──
function scrollToCFRow(rowKey, fromAge, toAge){
  const fa = (fromAge != null) ? Number(fromAge) : null;
  const ta = (toAge   != null) ? Number(toAge)   : fa;
  _cfActive = { rowKey, fromAge: fa, toAge: ta };
  _needsScrollAfterRender = true;  // render後もスクロールが必要
  clearTimeout(_cfBlurTimer);
  clearTimeout(_cfScrollTimer);
  if(rTab !== 'cf'){
    setRTab('cf');
    _cfScrollTimer = setTimeout(()=>_applyHighlight(true), 400);
    return;
  }
  _cfScrollTimer = setTimeout(()=>_applyHighlight(true), 30);
}
function scrollToCFRowSelf(rowKey, el){
  scrollToCFRow(rowKey, parseInt(el.value) || null);
}
function scrollToCFRowRange(rowKey, fromId, toId){
  const f = parseInt(document.getElementById(fromId)?.value) || null;
  const t = parseInt(document.getElementById(toId)?.value)   || null;
  scrollToCFRow(rowKey, f, t);
  // ステップIDを記憶（h-is-1-from → h-is-1）
  const m = fromId.match(/^([hw]-is-\d+)-from$/);
  if(m && _cfActive) _cfActive.stepId = m[1];
}

// 教育費系スクロール共通初期値
function _eduCtx(childId){
  const cIdx     = childId - 1;
  return {
    cIdx,
    rowKey   : `edu${cIdx}`,
    hAge     : iv('husband-age') || 30,
    childAge : parseInt(document.getElementById(`ca-${childId}`)?.value) || 0,
  };
}

// 保育料個別入力：hn-A-id が影響するCF列（costs[A]）に正確にスクロール
function scrollToCFRowHoiku(childId, hoikuAge){
  const { rowKey, hAge, childAge } = _eduCtx(childId);
  const col = Math.max(0, hoikuAge - childAge);
  scrollToCFRow(rowKey, hAge + col, hAge + col);
}

// 奨学金：子どもが19歳になる列をハイライト
function scrollToCFRowScholarship(childId){
  const hAge     = iv('husband-age') || 30;
  const childAge = iv(`ca-${childId}`) || 0;
  scrollToCFRow('scholarship', hAge + 19 - childAge);
}

// 結婚のお祝い：子どもの結婚年齢の列をハイライト
function scrollToCFRowWedding(childId){
  const hAge     = iv('husband-age') || 30;
  const childAge = iv(`ca-${childId}`) || 0;
  const wedAge   = iv(`wed-age-${childId}`) || 28;
  scrollToCFRow('wedding', hAge + wedAge - childAge);
}

// 教育費ステージ別：保育料/小学校/中学校/高校/大学の該当列のみハイライト
function scrollToCFRowEduStage(childId, stage){
  const { rowKey, hAge, childAge } = _eduCtx(childId);
  const costs    = eduCosts(childId);
  // stage → costs配列のインデックス範囲（= 子ども年齢）
  const ranges   = { hoiku:[0,6], elem:[7,12], mid:[13,15], high:[16,18], univ:[19,31] };
  const [s, e]   = ranges[stage] || [0, 31];
  let firstAge = -1, lastAge = -1;
  for(let a = s; a <= e && a < costs.length; a++){
    if(costs[a] > 0){ if(firstAge < 0) firstAge = a; lastAge = a; }
  }
  // そのステージに費用がなければステージ固定範囲でハイライト
  if(firstAge < 0){ firstAge = s; lastAge = e; }
  const fromHAge = Math.max(hAge, hAge + (firstAge - childAge));
  const toHAge   = Math.max(hAge, hAge + (lastAge  - childAge));
  scrollToCFRow(rowKey, fromHAge, toHAge);
}

// フォーカスが外れた：少し待ってパネル内に別のフォーカスが移っていないか確認してから消灯
function cfRowBlur(){
  clearTimeout(_cfBlurTimer);
  _cfBlurTimer = setTimeout(()=>{
    if(document.querySelector('.panel-l:focus-within')) return; // 別入力へ移動した→消灯しない
    _cfActive = null;
    clearTimeout(_cfScrollTimer);
    _clearHighlight();
  }, 80);
}

// ── 内部処理 ──
// doScroll=true のとき必ずスクロール。doScroll=false はハイライトのみ
function _applyHighlight(doScroll){
  if(!_cfActive) return;
  const body = document.getElementById('right-body');
  if(!body) return;
  const targetRow = _findTargetRow(body, _cfActive.rowKey);
  if(!targetRow) return;

  // ハイライト付与
  _clearHighlight();
  targetRow.classList.add('cf-row-highlight');
  const hAge  = iv('husband-age') || 30;
  const wAge  = iv('wife-age')    || 29;
  if(_cfActive.fromAge != null){
    const cvt     = a => _W_ROWS.includes(_cfActive.rowKey) ? (a - wAge + hAge) : a;
    const colFrom = cvt(_cfActive.fromAge) - hAge;
    const colTo   = cvt(_cfActive.toAge)   - hAge;
    const tds = targetRow.querySelectorAll('td');
    for(let c = colFrom; c <= colTo; c++){
      if(c < 0) continue;
      const td = tds[c + 2];
      if(td) td.classList.add('cf-cell-range');
    }
  }

  if(!doScroll) return;

  // 縦スクロール（getBoundingClientRect で確実に計算）
  const bodyRect = body.getBoundingClientRect();
  const rowRect  = targetRow.getBoundingClientRect();
  const scrollTop = Math.max(0, body.scrollTop + (rowRect.top - bodyRect.top) - body.clientHeight / 3);

  // 横スクロール：fromAge の列が見えるように調整（getBoundingClientRect でオフセット誤差を排除）
  let scrollLeft = body.scrollLeft;
  if(_cfActive.fromAge != null){
    const focusHAge = _W_ROWS.includes(_cfActive.rowKey) ? (_cfActive.fromAge - wAge + hAge) : _cfActive.fromAge;
    const colIdx = focusHAge - hAge;
    if(colIdx >= 0){
      const ths = body.querySelectorAll('tr.ryr th');
      const th  = ths[colIdx + 2];
      if(th){
        const thRect = th.getBoundingClientRect();
        // th の現在の視覚的位置 → 固定列(191px)の直後に来るよう調整
        scrollLeft = Math.max(0, body.scrollLeft + (thRect.left - bodyRect.left) - 191 - 8);
      }
    }
  }

  body.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'smooth' });
}

function _findTargetRow(body, rowKey){
  if(!rowKey) return null;
  const cell = body.querySelector(`td[data-row="${rowKey}"]`);
  if(cell) return cell.closest('tr');
  const cls = _ROW_CLS[rowKey];
  return cls ? body.querySelector(`tr.${cls}`) : null;
}

function _clearHighlight(){
  document.querySelectorAll('.cf-row-highlight').forEach(r => r.classList.remove('cf-row-highlight'));
  document.querySelectorAll('.cf-cell-range').forEach(c => c.classList.remove('cf-cell-range'));
}

// live()再レンダリング後：ハイライト再付与 + フラグがあればスクロールも実行
function _reapplyHighlightAfterRender(){
  if(!_cfActive) return;
  const doScroll = _needsScrollAfterRender;
  _needsScrollAfterRender = false;
  _applyHighlight(doScroll);
}
