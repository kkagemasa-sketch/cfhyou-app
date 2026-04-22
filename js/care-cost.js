// care-cost.js — 介護費用 目安
//
// 出典：
//  - 厚生労働省「介護保険事業状況報告」
//  - 生命保険文化センター「生命保険に関する全国実態調査」2021
//  - 要介護度別の平均費用（在宅/施設）
//
// 公的介護保険：
//  - 自己負担 1〜3割（所得による）
//  - 支給限度基準額：要介護度ごとに月額の上限あり
//  - 限度額超過分と、食費・居住費・日用品は全額自己負担
//
// 本モジュール：
//  - 要介護度×介護形態（在宅/施設）→ 月額・年額の目安
//  - 高度障害シナリオ（1級相当＝要介護4〜5）用
//
// 金額単位：円／月・年

(function(){
'use strict';

// ─── 要介護度別・月額費用目安（自己負担含む総額） ──────

// 在宅介護：公的サービス自己負担＋家族介護による機会損失は除く
// 施設介護：特養・老健・民間施設の中央値想定（食費・居住費込）
const COST_TABLE = {
  youshien1: { label:'要支援1', home: 30000,  facility: 100000, desc:'日常生活はほぼ自立、一部に支援が必要' },
  youshien2: { label:'要支援2', home: 40000,  facility: 110000, desc:'立ち上がり・歩行に支えが必要' },
  youkaigo1: { label:'要介護1', home: 55000,  facility: 130000, desc:'食事・排泄に部分介助' },
  youkaigo2: { label:'要介護2', home: 75000,  facility: 150000, desc:'起き上がり・歩行に介助' },
  youkaigo3: { label:'要介護3', home: 95000,  facility: 170000, desc:'入浴・排泄・着替えに全介助' },
  youkaigo4: { label:'要介護4', home: 120000, facility: 200000, desc:'日常生活全般に介助必要、意思疎通困難' },
  youkaigo5: { label:'要介護5', home: 160000, facility: 250000, desc:'寝たきり、常時介護必要' }
};

// 平均介護期間（生保文化センター調査）
const AVG_CARE_YEARS = 5.1;  // 年
const INITIAL_COST   = 740000; // 一時的費用（住宅改修・介護ベッド等、生保文化センター平均）

// ─── 計算関数 ──────────────────────────────────────

// 月額費用の取得
// gradeKey: 'youshien1'〜'youkaigo5'
// type: 'home' | 'facility'
function monthlyCost(gradeKey, type){
  const g = COST_TABLE[gradeKey];
  if(!g) return 0;
  return type === 'facility' ? g.facility : g.home;
}

// 年額費用
function annualCost(gradeKey, type){
  return monthlyCost(gradeKey, type) * 12;
}

// 生涯コスト（平均期間で計算、一時費用込み）
function lifetimeCost(gradeKey, type, years){
  const yr = years != null ? years : AVG_CARE_YEARS;
  return annualCost(gradeKey, type) * yr + INITIAL_COST;
}

// 高度障害シナリオのデフォルト（1級相当＝要介護4〜5）
// 保守的に要介護4・在宅を既定
function defaultForDisability1(){
  return {
    gradeKey: 'youkaigo4',
    type: 'home',
    monthly: monthlyCost('youkaigo4', 'home'),
    annual: annualCost('youkaigo4', 'home'),
    note: '障害年金1級の想定として要介護4・在宅介護を既定値としています'
  };
}

// ─── ポップアップ用HTML生成 ──────────────────────────

function fmtYen(v){ return (Math.round(v||0)).toLocaleString() + '円'; }
function fmtMan(v){ return (Math.round((v||0)/10000*10)/10).toLocaleString() + '万円'; }

function renderExplainHtml(){
  const rows = Object.entries(COST_TABLE).map(([k, g]) => `
    <tr>
      <td style="padding:3px 6px"><b>${g.label}</b></td>
      <td style="padding:3px 6px;font-size:11px;color:#64748b">${g.desc}</td>
      <td style="text-align:right;padding:3px 6px">${fmtYen(g.home)}</td>
      <td style="text-align:right;padding:3px 6px">${fmtYen(g.facility)}</td>
    </tr>`).join('');

  return `
    <div style="font-size:13px;margin-bottom:6px">
      <b>介護費用の目安</b>（月額・自己負担＋自費サービス込み）
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
      <thead>
        <tr style="background:#eef3fb">
          <th style="padding:4px 6px;text-align:left">要介護度</th>
          <th style="padding:4px 6px;text-align:left">状態</th>
          <th style="padding:4px 6px;text-align:right">在宅</th>
          <th style="padding:4px 6px;text-align:right">施設</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:#555;line-height:1.6;margin-bottom:6px">
      💰 <b>一時費用</b>：住宅改修・介護ベッド等で平均 ${fmtMan(INITIAL_COST)}<br>
      ⏳ <b>平均介護期間</b>：約 ${AVG_CARE_YEARS} 年<br>
      👨‍👩 <b>家族介護</b>：家族が介護する場合の機会損失（離職・時短）は別途考慮
    </div>
    <div style="font-size:10px;color:#888;margin-top:6px">
      出典：生命保険文化センター「生命保険に関する全国実態調査」／厚生労働省「介護保険事業状況報告」
    </div>`;
}

// ─── 外部公開 ──────────────────────────────────────

window.CareCost = {
  COST_TABLE: COST_TABLE,
  AVG_CARE_YEARS: AVG_CARE_YEARS,
  INITIAL_COST: INITIAL_COST,
  monthlyCost: monthlyCost,
  annualCost: annualCost,
  lifetimeCost: lifetimeCost,
  defaultForDisability1: defaultForDisability1,
  renderExplainHtml: renderExplainHtml,
  fmtYen: fmtYen,
  fmtMan: fmtMan
};

})();
