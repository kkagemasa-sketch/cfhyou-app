// contingency-v2-ui.js — 万が一 v2 UI土台（Phase 2）
//
// 役割：
//  - 対象者トグル（ご主人様／奥様）
//  - 4シナリオ（死亡・高度障害・就労不能・三大疾病）のチェックボックス管理
//  - チェックされたシナリオのアコーディオン入力パネルを動的に描画
//
// 依存：
//  - window.HighCostMedical, DisabilityPension, SicknessBenefit, CareCost
//  - window.live()（リアルタイム再計算）
//
// 注意：
//  - 既存 v1（mgQA_*）には一切触らない
//  - 出力（CF表）はフェーズ4以降で実装、本ファイルは入力UIのみ

(function(){
'use strict';

// ─── ステート ────────────────────────────────────
const state = {
  enabled: false,
  target: 'h',                // 'h' | 'w'
  scenarios: {                // 各シナリオのON/OFFと入力値
    death: { on:false, data:{} },
    disab: { on:false, data:{ grade:1, careType:'home', incomeDrop:100 } },
    work:  { on:false, data:{ months:18, incomeDrop:50 } },
    '3d':  { on:false, data:{ disease:'cancer', lumpSum:1000000, incomeDrop:50 } }
  }
};

// ─── シナリオ定義（アコーディオン中身） ─────────
const SCENARIOS = {
  death: {
    label: '💀 死亡',
    color: '#7c2d12',
    render(){
      return `
        <div style="font-size:11px;color:#64748b;line-height:1.6;padding:6px">
          ※ 既存の「ご主人様/奥様 万が一」タブ（Q&A方式）と連携予定。<br>
          　現段階ではチェック表示のみ（Phase 4 で統合実装）。
        </div>`;
    }
  },
  disab: {
    label: '♿ 高度障害',
    color: '#1e3a8a',
    render(){
      const d = state.scenarios.disab.data;
      return `
        <div style="padding:6px;font-size:11px">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="color:#444">障害等級：</span>
            <select onchange="CV2.setScenarioField('disab','grade',+this.value)" style="font-size:11px;padding:2px 4px">
              <option value="1" ${d.grade===1?'selected':''}>1級（重度）</option>
              <option value="2" ${d.grade===2?'selected':''}>2級</option>
              <option value="3" ${d.grade===3?'selected':''}>3級（厚生のみ）</option>
            </select>
            <button type="button" onclick="CV2.showGradeInfo(${d.grade})" style="background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;font-size:10px;padding:2px 6px;border-radius:3px;cursor:pointer">症状・事例 ℹ️</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="color:#444">介護形態：</span>
            <label style="font-size:11px"><input type="radio" name="cv2-disab-care" ${d.careType==='home'?'checked':''} onchange="CV2.setScenarioField('disab','careType','home')"> 在宅</label>
            <label style="font-size:11px"><input type="radio" name="cv2-disab-care" ${d.careType==='facility'?'checked':''} onchange="CV2.setScenarioField('disab','careType','facility')"> 施設</label>
            <button type="button" onclick="CV2.showCareInfo()" style="background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;font-size:10px;padding:2px 6px;border-radius:3px;cursor:pointer">費用目安 ℹ️</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="color:#444">収入減：</span>
            <input type="number" min="0" max="100" value="${d.incomeDrop}" onchange="CV2.setScenarioField('disab','incomeDrop',+this.value)" style="width:60px;font-size:11px;padding:2px 4px"> %
          </div>
        </div>`;
    }
  },
  work: {
    label: '🏥 就労不能',
    color: '#065f46',
    render(){
      const d = state.scenarios.work.data;
      return `
        <div style="padding:6px;font-size:11px">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="color:#444">休業期間：</span>
            <input type="number" min="1" max="60" value="${d.months}" onchange="CV2.setScenarioField('work','months',+this.value)" style="width:60px;font-size:11px;padding:2px 4px"> ヶ月
            <button type="button" onclick="CV2.showSicknessInfo()" style="background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;font-size:10px;padding:2px 6px;border-radius:3px;cursor:pointer">傷病手当金 ℹ️</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="color:#444">収入減：</span>
            <input type="number" min="0" max="100" value="${d.incomeDrop}" onchange="CV2.setScenarioField('work','incomeDrop',+this.value)" style="width:60px;font-size:11px;padding:2px 4px"> %
          </div>
        </div>`;
    }
  },
  '3d': {
    label: '🎗️ 三大疾病',
    color: '#92400e',
    render(){
      const d = state.scenarios['3d'].data;
      return `
        <div style="padding:6px;font-size:11px">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="color:#444">疾病：</span>
            <select onchange="CV2.setScenarioField('3d','disease',this.value)" style="font-size:11px;padding:2px 4px">
              <option value="cancer" ${d.disease==='cancer'?'selected':''}>がん</option>
              <option value="heart"  ${d.disease==='heart'?'selected':''}>心疾患（急性心筋梗塞）</option>
              <option value="stroke" ${d.disease==='stroke'?'selected':''}>脳血管疾患（脳卒中）</option>
            </select>
            <button type="button" onclick="CV2.showMedicalInfo()" style="background:#fef3c7;border:1px solid #fcd34d;color:#92400e;font-size:10px;padding:2px 6px;border-radius:3px;cursor:pointer">高額療養費 ℹ️</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="color:#444">一時費用：</span>
            <input type="number" min="0" step="10000" value="${d.lumpSum}" onchange="CV2.setScenarioField('3d','lumpSum',+this.value)" style="width:100px;font-size:11px;padding:2px 4px"> 円
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="color:#444">収入減：</span>
            <input type="number" min="0" max="100" value="${d.incomeDrop}" onchange="CV2.setScenarioField('3d','incomeDrop',+this.value)" style="width:60px;font-size:11px;padding:2px 4px"> %
          </div>
        </div>`;
    }
  }
};

// ─── 描画 ──────────────────────────────────────
function renderAccordions(){
  const host = document.getElementById('cv2-accordions');
  if(!host) return;
  const keys = Object.keys(SCENARIOS).filter(k => state.scenarios[k].on);
  if(keys.length === 0){
    host.innerHTML = '<div style="font-size:11px;color:#94a3b8;padding:8px;text-align:center">上のチェックで対象シナリオを選択してください</div>';
    return;
  }
  host.innerHTML = keys.map(k => {
    const s = SCENARIOS[k];
    return `
      <details open style="margin-bottom:6px;border:1px solid #e5d5e0;border-radius:6px;background:#fff">
        <summary style="padding:6px 10px;font-size:12px;font-weight:700;color:${s.color};cursor:pointer;user-select:none">${s.label}</summary>
        ${s.render()}
      </details>`;
  }).join('');
}

function refreshTargetButtons(){
  const h = document.getElementById('cv2-target-h');
  const w = document.getElementById('cv2-target-w');
  if(h) h.classList.toggle('on', state.target==='h');
  if(w) w.classList.toggle('on', state.target==='w');
}

// ─── 公開API ────────────────────────────────────
function setEnabled(on){
  state.enabled = !!on;
  const root = document.getElementById('cv2-root');
  const btn  = document.getElementById('cv2-open-btn');
  if(root) root.style.display = state.enabled ? '' : 'none';
  if(btn)  btn.style.display  = state.enabled ? 'none' : '';
  if(state.enabled){
    refreshTargetButtons();
    renderAccordions();
  }
}

function setTarget(t){
  state.target = (t==='w') ? 'w' : 'h';
  refreshTargetButtons();
  scheduleLive();
}

function toggleScenario(key, on){
  if(!state.scenarios[key]) return;
  state.scenarios[key].on = !!on;
  renderAccordions();
  scheduleLive();
}

function setScenarioField(key, field, value){
  if(!state.scenarios[key]) return;
  state.scenarios[key].data[field] = value;
  scheduleLive();
}

// live() は既存 CF 表を再描画する（v2 計算結果は Phase 4 以降で差し込む）
function scheduleLive(){
  if(typeof window.live === 'function') window.live();
}

// ─── ポップアップ（Phase 3 で本実装、ここは最低限） ───
function popup(html, title){
  // 既存の共通モーダルがあれば利用、なければ alert 風の簡易表示
  if(typeof window.showExplainModal === 'function'){
    window.showExplainModal(title||'', html);
    return;
  }
  const w = window.open('', '_blank', 'width=520,height=640');
  if(w){ w.document.write(`<html><head><title>${title||''}</title><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:12px">${html}</body></html>`); }
}

function showGradeInfo(grade){
  if(!window.DisabilityPension || !window.DisabilityPension.renderGradeInfo){
    popup('<p>障害等級情報モジュール未ロード</p>', '障害等級'); return;
  }
  popup(window.DisabilityPension.renderGradeInfo(grade), `障害${grade}級`);
}
function showCareInfo(){
  if(!window.CareCost || !window.CareCost.renderExplainHtml){ popup('<p>介護費用モジュール未ロード</p>','介護費用'); return; }
  popup(window.CareCost.renderExplainHtml(), '介護費用');
}
function showSicknessInfo(){
  if(!window.SicknessBenefit || !window.SicknessBenefit.renderCalcHtml){ popup('<p>傷病手当金モジュール未ロード</p>','傷病手当金'); return; }
  // 対象者年収は assets.js/income.js の現状値から取る想定（Phase 4 で精緻化）
  const params = { annualIncomeYen: 5000000, isEligible: true, months: state.scenarios.work.data.months };
  popup(window.SicknessBenefit.renderCalcHtml(params, state.target==='w'?'奥様':'ご主人様'), '傷病手当金');
}
function showMedicalInfo(){
  if(!window.HighCostMedical || !window.HighCostMedical.renderExplainHtml){ popup('<p>高額療養費モジュール未ロード</p>','高額療養費'); return; }
  popup(window.HighCostMedical.renderExplainHtml(), '高額療養費制度');
}

// ─── 外部公開 ──────────────────────────────────
window.CV2 = {
  state: state,
  setEnabled: setEnabled,
  setTarget: setTarget,
  toggleScenario: toggleScenario,
  setScenarioField: setScenarioField,
  showGradeInfo: showGradeInfo,
  showCareInfo: showCareInfo,
  showSicknessInfo: showSicknessInfo,
  showMedicalInfo: showMedicalInfo
};

// 初期化：ルートは既定 hidden（β版ボタンから開く）
document.addEventListener('DOMContentLoaded', function(){
  // 奥様ボタンは既存の wife-only クラスに従うので touchなし
});

})();
