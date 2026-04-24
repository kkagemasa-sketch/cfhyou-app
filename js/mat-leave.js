// mat-leave.js — 収入段階ごとの育休フラグ・夫婦同時/連続取得の判定
// Phase 1: フラグ保存＋イベント自動記入＋夫婦判定表示（CF計算連動は後続）

// 段階の育休チェック切替
function onMatLeaveToggle(stepId){
  const cb = document.getElementById(`${stepId}-matleave`);
  const leaveEl = document.getElementById(`${stepId}-leave`);
  const cardEl = document.getElementById(stepId);
  if(!cb) return;
  const on = cb.checked;
  // 視覚フィードバック：枠をオレンジに
  if(cardEl){
    cardEl.style.background = on ? '#fff8ee' : 'var(--gray-bg)';
    cardEl.style.borderColor = on ? '#ffb74d' : 'var(--border)';
  }
  // イベント欄が空なら「育休」を自動入力
  if(on && leaveEl && !leaveEl.value.trim()){
    leaveEl.value = '育休';
  }
  if(typeof pushUndoSnap === 'function') pushUndoSnap();
  updateMatLeaveJointHint();
  if(typeof live === 'function') live();
}

// 育休フラグの付いた段階を取得
function getMatLeaveSteps(person){
  const result = [];
  document.querySelectorAll(`#${person}-income-cont>[id^="${person}-is-"]`).forEach(el=>{
    const base = el.id;
    const cb = document.getElementById(`${base}-matleave`);
    if(!cb || !cb.checked) return;
    const from = parseInt(document.getElementById(`${base}-from`)?.value) || 0;
    const to   = parseInt(document.getElementById(`${base}-to`)?.value) || 0;
    if(from > 0 && to >= from){
      result.push({ id: base, fromAge: from, toAge: to });
    }
  });
  return result;
}

// 夫婦同時/連続取得の判定（年ベース）
// ご主人様の年齢・奥様の年齢と現在年から年ベースに換算
function updateMatLeaveJointHint(){
  // 既存のヒントを削除
  document.querySelectorAll('.ml-joint-hint').forEach(el=>el.remove());
  const hSteps = getMatLeaveSteps('h');
  const wSteps = getMatLeaveSteps('w');
  if(hSteps.length === 0 || wSteps.length === 0) return;

  const curYear = new Date().getFullYear();
  const hAge = parseInt(document.getElementById('husband-age')?.value) || 0;
  const wAge = parseInt(document.getElementById('wife-age')?.value) || 0;
  if(!hAge || !wAge) return;

  // 各段階を年範囲に変換
  const toYearRange = (step, age) => ({
    id: step.id,
    startYear: curYear + (step.fromAge - age),
    endYear:   curYear + (step.toAge   - age)
  });
  const hRanges = hSteps.map(s=>toYearRange(s, hAge));
  const wRanges = wSteps.map(s=>toYearRange(s, wAge));

  // H/W 全組合せで判定
  hRanges.forEach(hr=>{
    wRanges.forEach(wr=>{
      let msg = '';
      // 期間重なり判定
      const overlap = !(hr.endYear < wr.startYear || wr.endYear < hr.startYear);
      if(overlap){
        msg = '👫 夫婦同時期 → 🆕 出生後休業支援給付金（80%・最大28日）の対象になり得ます';
      } else if(Math.abs(hr.startYear - (wr.endYear+1)) === 0 || Math.abs(wr.startYear - (hr.endYear+1)) === 0){
        msg = '👫 夫婦連続取得 → パパ・ママ育休プラスの対象になり得ます';
      }
      if(!msg) return;
      // H段階の下にヒントを追加（重複防止：同一段階に1つのみ）
      const hCard = document.getElementById(hr.id);
      if(hCard && !hCard.querySelector('.ml-joint-hint')){
        const hint = document.createElement('div');
        hint.className = 'ml-joint-hint';
        hint.style.cssText = 'font-size:11px;color:#1565c0;font-weight:600;margin-top:6px;padding:4px 8px;background:#e3f2fd;border-radius:4px';
        hint.textContent = msg;
        hCard.appendChild(hint);
      }
      const wCard = document.getElementById(wr.id);
      if(wCard && !wCard.querySelector('.ml-joint-hint')){
        const hint = document.createElement('div');
        hint.className = 'ml-joint-hint';
        hint.style.cssText = 'font-size:11px;color:#1565c0;font-weight:600;margin-top:6px;padding:4px 8px;background:#e3f2fd;border-radius:4px';
        hint.textContent = msg;
        wCard.appendChild(hint);
      }
    });
  });
}

// live()から呼ばれても良いように公開
window.onMatLeaveToggle = onMatLeaveToggle;
window.getMatLeaveSteps = getMatLeaveSteps;
window.updateMatLeaveJointHint = updateMatLeaveJointHint;
