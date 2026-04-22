// high-cost-medical.js — 高額療養費制度 自己負担上限額計算
//
// 出典：厚生労働省「高額療養費制度」（2024年度基準）
// https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000075807.html
//
// 70歳未満の区分（ア/イ/ウ/エ/オ）、70歳以上の区分（現役並みⅢ/Ⅱ/Ⅰ/一般/低所得Ⅱ/Ⅰ）
// 金額単位：円（本アプリの他ファイルと異なり円で扱う。表示時に万円換算）

(function(){
'use strict';

// ─── 定数テーブル ──────────────────────────────────────
// 70歳未満の自己負担上限額区分（2024年度）
const BRACKET_UNDER70 = [
  {
    code:'ア', name:'区分ア',
    incomeMin: 11600000, // 年収目安 円（約1,160万超）
    incomeMax: Infinity,
    stdMonthlyMin: 830000, // 標準報酬月額 83万以上
    // 上限 = base + max(0, 医療費 - kink) × rate
    base: 252600, kink: 842000, rate: 0.01,
    // 多数回該当（12ヶ月で3回以上）
    multi: 140100,
    desc:'年収 約1,160万円超 / 標報83万円以上'
  },
  {
    code:'イ', name:'区分イ',
    incomeMin: 7700000, incomeMax: 11600000,
    stdMonthlyMin: 530000, stdMonthlyMax: 830000,
    base: 167400, kink: 558000, rate: 0.01,
    multi: 93000,
    desc:'年収 約770万〜1,160万 / 標報53万〜83万'
  },
  {
    code:'ウ', name:'区分ウ',
    incomeMin: 3700000, incomeMax: 7700000,
    stdMonthlyMin: 280000, stdMonthlyMax: 530000,
    base: 80100, kink: 267000, rate: 0.01,
    multi: 44400,
    desc:'年収 約370万〜770万 / 標報28万〜53万'
  },
  {
    code:'エ', name:'区分エ',
    incomeMin: 0, incomeMax: 3700000,
    stdMonthlyMax: 280000,
    base: 57600, kink: 0, rate: 0, // 定額
    multi: 44400,
    desc:'年収 〜約370万 / 標報28万未満'
  },
  {
    code:'オ', name:'区分オ',
    incomeMin: 0, incomeMax: 0,
    base: 35400, kink: 0, rate: 0,
    multi: 24600,
    desc:'住民税非課税世帯'
  }
];

// 70歳以上の区分（2024年度）— 必要時に使用
const BRACKET_OVER70 = [
  { code:'現役Ⅲ', incomeMin:11600000, base:252600, kink:842000, rate:0.01, multi:140100, outpatient:null, desc:'現役並みⅢ 年収約1,160万超' },
  { code:'現役Ⅱ', incomeMin:7700000,  incomeMax:11600000, base:167400, kink:558000, rate:0.01, multi:93000,  outpatient:null, desc:'現役並みⅡ 年収約770〜1,160万' },
  { code:'現役Ⅰ', incomeMin:3700000,  incomeMax:7700000,  base:80100,  kink:267000, rate:0.01, multi:44400,  outpatient:null, desc:'現役並みⅠ 年収約370〜770万' },
  { code:'一般',   incomeMin:0,         incomeMax:3700000,  base:57600,  kink:0, rate:0, multi:44400, outpatient:18000, desc:'一般 年収156万〜約370万' },
  { code:'低所Ⅱ', incomeMin:0, incomeMax:0, base:24600, kink:0, rate:0, multi:24600, outpatient:8000, desc:'住民税非課税 低所得Ⅱ' },
  { code:'低所Ⅰ', incomeMin:0, incomeMax:0, base:15000, kink:0, rate:0, multi:15000, outpatient:8000, desc:'住民税非課税 低所得Ⅰ（年金年80万以下等）' }
];

// ─── 区分判定 ──────────────────────────────────────

// 年収（円）から70歳未満の区分を判定
// 引数：annualIncomeYen（円単位）
// 返却：BRACKET_UNDER70 の要素（必ず1つヒットする）
function judgeBracketUnder70(annualIncomeYen){
  const inc = Math.max(0, annualIncomeYen||0);
  if(inc < 1000) return BRACKET_UNDER70[4]; // 収入ほぼなし → 区分オ扱い
  for(const b of BRACKET_UNDER70){
    if(inc >= (b.incomeMin||0) && inc < (b.incomeMax||Infinity)) return b;
  }
  return BRACKET_UNDER70[3]; // fallback 区分エ
}

// 70歳以上の区分判定
function judgeBracketOver70(annualIncomeYen){
  const inc = Math.max(0, annualIncomeYen||0);
  for(const b of BRACKET_OVER70){
    if(inc >= (b.incomeMin||0) && inc < (b.incomeMax||Infinity)) return b;
  }
  return BRACKET_OVER70[3]; // 一般
}

// 年齢・年収から区分を自動選択
function judgeBracket(annualIncomeYen, age){
  return (age||0) >= 70 ? judgeBracketOver70(annualIncomeYen) : judgeBracketUnder70(annualIncomeYen);
}

// ─── 上限額計算 ──────────────────────────────────────

// 月次自己負担上限額
// bracket: judgeBracket の戻り値
// monthlyMedicalYen: その月の総医療費（10割、円）
// isMultiHit: 多数回該当（直近12ヶ月で3回以上、4回目以降は軽減）
function monthlyCap(bracket, monthlyMedicalYen, isMultiHit){
  if(!bracket) return 0;
  if(isMultiHit) return bracket.multi;
  const m = Math.max(0, monthlyMedicalYen||0);
  return bracket.base + Math.max(0, m - (bracket.kink||0)) * (bracket.rate||0);
}

// 年間自己負担額（同じ月次医療費が12ヶ月続いた場合、多数回該当を自動反映）
function annualBurden(bracket, monthlyMedicalYen){
  if(!bracket) return 0;
  // 最初の3ヶ月は通常上限、4ヶ月目以降は多数回該当上限
  const normal = monthlyCap(bracket, monthlyMedicalYen, false);
  const multi  = monthlyCap(bracket, monthlyMedicalYen, true);
  return normal * 3 + multi * 9;
}

// ─── サマリー生成（ポップアップ用データ） ──────────────

// 複数シナリオの医療費に対する自己負担額をまとめて返す
// 返却：[{medical:医療費, burden:自己負担, saving:節約額}, ...]
function buildCapTable(bracket, scenarios){
  scenarios = scenarios || [1000000, 3000000, 5000000, 10000000]; // 100万, 300万, 500万, 1000万
  return scenarios.map(m => {
    const burden = monthlyCap(bracket, m, false);
    const full30 = m * 0.3; // 3割負担の総額（参考）
    return {
      medical: m,
      burden: burden,
      burdenFull30: full30, // 3割負担だけだった場合
      saving: Math.max(0, full30 - burden)
    };
  });
}

// 円 → 表示用文字列（円、3桁カンマ）
function fmtYen(v){ return (Math.round(v||0)).toLocaleString() + '円'; }
// 円 → 万円表示
function fmtMan(v){ return (Math.round((v||0)/10000*10)/10).toLocaleString() + '万円'; }

// ─── ポップアップHTML生成 ──────────────────────────────

// 高額療養費の解説＋自動計算結果をHTMLで返す
// annualIncomeYen: 年収（円）
// age: 年齢（70歳区分判定用）
// personLabel: 'ご主人様' / '奥様' など
function renderExplainHtml(annualIncomeYen, age, personLabel){
  const b = judgeBracket(annualIncomeYen, age);
  const isOver70 = (age||0) >= 70;
  const table = buildCapTable(b);

  const incomeWan = Math.round((annualIncomeYen||0)/10000);
  const pLbl = personLabel || '対象者';

  let rows = table.map(r => `
    <tr>
      <td style="padding:4px 8px;text-align:right">${fmtMan(r.medical)}</td>
      <td style="padding:4px 8px;text-align:right"><b>${fmtYen(r.burden)}</b></td>
      <td style="padding:4px 8px;text-align:right;color:#1a6b2e">${fmtYen(r.saving)}</td>
    </tr>`).join('');

  return `
    <div style="font-size:13px;margin-bottom:6px">
      <b>${pLbl}</b> 年収 ${incomeWan.toLocaleString()}万円
      → <b style="color:#1a3a6b">${b.name}</b>（${b.desc}）
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
      <thead>
        <tr style="background:#eef3fb">
          <th style="padding:4px 8px;text-align:right">月次医療費(10割)</th>
          <th style="padding:4px 8px;text-align:right">自己負担上限</th>
          <th style="padding:4px 8px;text-align:right">節約額</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="font-size:11px;color:#555;line-height:1.6;margin-bottom:6px">
      💡 <b>多数回該当</b>：直近12ヶ月で3回以上該当すると、4回目以降の上限が <b>${fmtYen(b.multi)}</b> に軽減<br>
      📋 <b>対象外</b>：食事代・差額ベッド代・先進医療費・自由診療（これらは別途自己負担）<br>
      👨‍👩‍👧 <b>世帯合算</b>：同じ世帯の自己負担を合算可能（同一医療保険加入者）
    </div>
    <div style="font-size:10px;color:#888;margin-top:6px">
      出典：厚生労働省「高額療養費制度」／${isOver70?'70歳以上':'70歳未満'}区分・2024年度基準
    </div>`;
}

// ─── 外部公開 ──────────────────────────────────────

window.HighCostMedical = {
  BRACKET_UNDER70: BRACKET_UNDER70,
  BRACKET_OVER70:  BRACKET_OVER70,
  judgeBracket:    judgeBracket,
  judgeBracketUnder70: judgeBracketUnder70,
  judgeBracketOver70:  judgeBracketOver70,
  monthlyCap:      monthlyCap,
  annualBurden:    annualBurden,
  buildCapTable:   buildCapTable,
  renderExplainHtml: renderExplainHtml,
  fmtYen: fmtYen,
  fmtMan: fmtMan
};

})();
