// mat-leave.js — 育休設定UIの開閉・夫婦同時/連続取得の判定
// Phase 1: UIと保存のみ（CF計算連動は後続フェーズ）

function toggleMatLeave(p){
  const body = document.getElementById(`ml-${p}-body`);
  const btn  = document.getElementById(`ml-${p}-toggle`);
  const hid  = document.getElementById(`ml-${p}-enabled`);
  const card = document.getElementById(`ml-${p}-card`);
  if(!body || !btn || !hid) return;
  const on = body.style.display === 'none' || body.style.display === '';
  _setMatLeaveUI(p, on);
  if(!on){
    // 解除時：入力欄をクリア
    const sy = document.getElementById(`ml-${p}-start-year`);
    const yr = document.getElementById(`ml-${p}-years`);
    if(sy) sy.value = '';
    if(yr) yr.value = '1';
  }
  updateMatLeaveHint();
  if(typeof pushUndoSnap === 'function') pushUndoSnap();
  if(typeof live === 'function') live();
}

function _setMatLeaveUI(p, on){
  const body = document.getElementById(`ml-${p}-body`);
  const btn  = document.getElementById(`ml-${p}-toggle`);
  const hid  = document.getElementById(`ml-${p}-enabled`);
  const card = document.getElementById(`ml-${p}-card`);
  if(!body || !btn || !hid) return;
  body.style.display = on ? 'block' : 'none';
  hid.value = on ? '1' : '0';
  btn.textContent = on ? '× 育休設定を解除' : '＋ 育休を設定する';
  btn.classList.toggle('on', on);
  if(card){
    card.style.background = on ? '#fff3e0' : '#fafafa';
    card.style.borderColor = on ? '#ffb74d' : '#e0e0e0';
  }
}

function updateMatLeaveHint(){
  ['h','w'].forEach(p=>{
    const hint = document.getElementById(`ml-${p}-hint`);
    if(!hint) return;
    const on = document.getElementById(`ml-${p}-enabled`)?.value === '1';
    const y  = parseInt(document.getElementById(`ml-${p}-start-year`)?.value) || 0;
    const yrs= parseFloat(document.getElementById(`ml-${p}-years`)?.value) || 0;
    if(!on || !y || !yrs){ hint.textContent = ''; return; }
    const endYear = y + Math.ceil(yrs) - 1;
    const label = p==='h' ? 'ご主人様' : '奥様';
    hint.textContent = `✓ ${label}の育休：${y}年〜${endYear}年（${yrs}年間）`;
  });
  _updateJointLeaveHint();
}

function _updateJointLeaveHint(){
  ['h','w'].forEach(p=>{
    const other = p==='h' ? 'w' : 'h';
    const extra = document.getElementById(`ml-${p}-joint`);
    if(!extra) return;
    const pOn = document.getElementById(`ml-${p}-enabled`)?.value === '1';
    const oOn = document.getElementById(`ml-${other}-enabled`)?.value === '1';
    if(!pOn || !oOn){ extra.style.display = 'none'; extra.textContent = ''; return; }
    const py = parseInt(document.getElementById(`ml-${p}-start-year`)?.value) || 0;
    const pyrs = parseFloat(document.getElementById(`ml-${p}-years`)?.value) || 0;
    const oy = parseInt(document.getElementById(`ml-${other}-start-year`)?.value) || 0;
    const oyrs = parseFloat(document.getElementById(`ml-${other}-years`)?.value) || 0;
    if(!py || !oy){ extra.style.display='none'; return; }
    const pEnd = py + Math.ceil(pyrs) - 1;
    const oEnd = oy + Math.ceil(oyrs) - 1;
    let msg = '';
    if(py === oy){
      msg = '👫 夫婦同時期に取得 → 🆕 出生後休業支援給付金（80%・最大28日）の対象になり得ます';
    } else if((py - (oEnd+1) === 0) || (oy - (pEnd+1) === 0)){
      msg = '👫 夫婦連続取得 → パパ・ママ育休プラス（1歳2ヶ月まで延長可）の対象になり得ます';
    } else {
      // 期間が重なっているが同年でない場合
      const overlap = !(pEnd < oy || oEnd < py);
      msg = overlap ? '👫 夫婦同時期（期間が重なる）に取得中' : '👫 夫婦とも育休を取得（時期は離れています）';
    }
    extra.style.display = 'block';
    extra.textContent = msg;
  });
}

// 保存データ適用後・起動時に呼ばれる：hidden値からUIを復元
function syncMatLeaveUIFromState(){
  ['h','w'].forEach(p=>{
    const hid = document.getElementById(`ml-${p}-enabled`);
    if(!hid) return;
    const on = hid.value === '1';
    _setMatLeaveUI(p, on);
  });
  updateMatLeaveHint();
}

// 育休データ取得（後続フェーズのCF計算から呼ぶ想定）
function getMatLeaveData(){
  const read = (p)=>({
    enabled: document.getElementById(`ml-${p}-enabled`)?.value === '1',
    startYear: parseInt(document.getElementById(`ml-${p}-start-year`)?.value) || 0,
    years: parseFloat(document.getElementById(`ml-${p}-years`)?.value) || 0
  });
  return { h: read('h'), w: read('w') };
}

document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(syncMatLeaveUIFromState, 100);
});
