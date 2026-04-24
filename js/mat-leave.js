// mat-leave.js — 収入段階ごとの育休フラグ・給付金自動計算・夫婦判定
// Phase 2: 育休チェック時に前段階の手取りから給付金額を自動計算

// ===== 育休給付金レート計算 =====
// 制度: 最初180日(≈6ヶ月) 67%、以降 50%、1年超は原則なし
// 期間に応じた平均給付率を返す（%）
function computeMatLeaveAvgRate(months){
  if(months <= 0) return 0;
  const firstPhase  = Math.min(6, months);                      // 67%期間
  const secondPhase = Math.min(6, Math.max(0, months - 6));     // 50%期間
  // 1年超は給付なし（簡略）
  const totalPct = (firstPhase * 67 + secondPhase * 50) / months;
  return Math.round(totalPct * 10) / 10;
}

// 前段階の手取り終了額を取得（該当段階より前の最後のステップ）
function _getPrevStepTakeHome(stepId){
  const person = stepId.startsWith('h-') ? 'h' : 'w';
  const cont = document.getElementById(`${person}-income-cont`);
  if(!cont) return 0;
  const steps = cont.querySelectorAll(`[id^="${person}-is-"]`);
  let prev = 0;
  let foundSelf = false;
  steps.forEach(el=>{
    if(el.id === stepId){ foundSelf = true; return; }
    if(!foundSelf){
      const nt = _amtVal(document.getElementById(`${el.id}-net-to`)) || _amtVal(document.getElementById(`${el.id}-net-from`));
      if(nt > 0) prev = nt;
    }
  });
  if(prev === 0){
    // 手取り計算機の結果を参照
    const calcRes = document.getElementById(`${person}-calc-result`);
    if(calcRes){
      const txt = calcRes.textContent.replace(/[^0-9.]/g,'');
      prev = parseFloat(txt) || 0;
    }
  }
  return prev;
}

// 育休段階に給付金額を自動反映
function applyMatLeaveBenefit(stepId){
  const fromAge = parseInt(document.getElementById(`${stepId}-from`)?.value) || 0;
  const toAge   = parseInt(document.getElementById(`${stepId}-to`)?.value)   || 0;
  if(fromAge <= 0 || toAge < fromAge) return;
  const years = Math.max(0.5, toAge - fromAge + 1); // 段階の期間（年）
  const months = Math.round(years * 12);
  const avgRate = computeMatLeaveAvgRate(months);
  const prevTH = _getPrevStepTakeHome(stepId);
  if(prevTH <= 0) return;
  // 給付金は非課税。手取り相当として同額を入力欄に反映。
  const benefit = Math.round(prevTH * avgRate / 100);
  // 金額モードに切替
  if(typeof setStepMode === 'function') setStepMode(stepId, 'amt');
  const nfEl = document.getElementById(`${stepId}-net-from`);
  const ntEl = document.getElementById(`${stepId}-net-to`);
  if(nfEl){ nfEl.value = benefit; nfEl._rawValue = benefit; }
  if(ntEl){ ntEl.value = benefit; ntEl._rawValue = benefit; }
  // ヒントを上書き表示
  const hint = document.getElementById(`${stepId}-hint`);
  if(hint){
    const rateDetail = months <= 6
      ? `67%`
      : months <= 12
        ? `最初6ヶ月67% → 以降50%（平均${avgRate}%）`
        : `最初6ヶ月67% → 6〜12ヶ月50% → 12ヶ月以降なし（平均${avgRate}%）`;
    hint.innerHTML = `🍼 育休給付金：前段階手取り <strong>${prevTH}</strong>万 × ${rateDetail} = <strong>${benefit}</strong>万円（非課税）`;
  }
  if(typeof calcStepHint === 'function') calcStepHint(stepId);
}

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
  // 再計算ボタン表示
  const recalcBtn = document.getElementById(`${stepId}-ml-recalc`);
  if(recalcBtn) recalcBtn.style.display = on ? 'inline-block' : 'none';
  // イベント欄が空なら「育休」を自動入力
  if(on && leaveEl && !leaveEl.value.trim()){
    leaveEl.value = '育休';
  }
  // ON時：net欄が空のときのみ自動計算（既入力は尊重）
  if(on){
    const nf = _amtVal(document.getElementById(`${stepId}-net-from`));
    const nt = _amtVal(document.getElementById(`${stepId}-net-to`));
    if(nf === 0 && nt === 0){
      applyMatLeaveBenefit(stepId);
    }
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

  const toYearRange = (step, age) => ({
    id: step.id,
    startYear: curYear + (step.fromAge - age),
    endYear:   curYear + (step.toAge   - age)
  });
  const hRanges = hSteps.map(s=>toYearRange(s, hAge));
  const wRanges = wSteps.map(s=>toYearRange(s, wAge));

  hRanges.forEach(hr=>{
    wRanges.forEach(wr=>{
      let msg = '';
      const overlap = !(hr.endYear < wr.startYear || wr.endYear < hr.startYear);
      if(overlap){
        msg = '👫 夫婦同時期 → 🆕 出生後休業支援給付金（80%・最大28日）の対象になり得ます';
      } else if(Math.abs(hr.startYear - (wr.endYear+1)) === 0 || Math.abs(wr.startYear - (hr.endYear+1)) === 0){
        msg = '👫 夫婦連続取得 → パパ・ママ育休プラスの対象になり得ます';
      }
      if(!msg) return;
      [hr.id, wr.id].forEach(cardId=>{
        const card = document.getElementById(cardId);
        if(card && !card.querySelector('.ml-joint-hint')){
          const hint = document.createElement('div');
          hint.className = 'ml-joint-hint';
          hint.style.cssText = 'font-size:11px;color:#1565c0;font-weight:600;margin-top:6px;padding:4px 8px;background:#e3f2fd;border-radius:4px';
          hint.textContent = msg;
          card.appendChild(hint);
        }
      });
    });
  });
}

window.onMatLeaveToggle = onMatLeaveToggle;
window.applyMatLeaveBenefit = applyMatLeaveBenefit;
window.getMatLeaveSteps = getMatLeaveSteps;
window.updateMatLeaveJointHint = updateMatLeaveJointHint;
window.computeMatLeaveAvgRate = computeMatLeaveAvgRate;
