// disability-pension.js — 障害年金 計算
//
// 出典：日本年金機構「障害年金」（2024年度新規裁定・67歳以下）
// https://www.nenkin.go.jp/service/jukyu/shougainenkin/
//
// 2024年度の満額基礎年金：816,000円/年
// 障害基礎年金1級 = 満額基礎 × 1.25 = 1,020,000円/年
// 障害基礎年金2級 = 満額基礎         = 816,000円/年
// 障害基礎年金3級 = なし（厚生年金のみ）
//
// 障害厚生年金：
//  1級 = 報酬比例年金 × 1.25 + 配偶者加給
//  2級 = 報酬比例年金 × 1.00 + 配偶者加給
//  3級 = 報酬比例年金 × 1.00（最低保障 612,000円/年）
//
// 報酬比例年金（2003/4以降・総報酬制）：
//  平均標準報酬額 × 5.481/1000 × 被保険者期間月数
//  ※本モジュールでは簡易式で年額を推定（詳細精度は社労士計算に譲る）
//
// 金額単位：円／年

(function(){
'use strict';

// ─── 定数テーブル（2024年度） ──────────────────────────

const BASIC_FULL     = 816000;   // 満額基礎年金
const DISABILITY_1   = 1020000;  // 障害基礎 1級（満額×1.25）
const DISABILITY_2   = 816000;   // 障害基礎 2級（満額）
const DISABILITY_3_MIN = 612000; // 障害厚生 3級 最低保障
const CHILD_ADD_12   = 234800;   // 子の加算（第1・2子）
const CHILD_ADD_3P   = 78300;    // 子の加算（第3子以降）
const SPOUSE_ADD     = 234800;   // 配偶者加給年金

// ─── 等級メタデータ ────────────────────────────────────

const GRADES = {
  1: {
    code: 1,
    label: '1級',
    summary: '日常生活に常時介護を要する状態',
    disease: [
      '末期がん（寝たきり）',
      '重度の脳梗塞後遺症（寝たきり・意思疎通困難）',
      '人工呼吸器の常時使用',
      '人工透析＋重度合併症',
      '重度の心疾患（NYHA IV度）',
      '両眼失明、両下肢切断（膝上）',
      '重度の精神疾患（常時介護が必要）'
    ],
    life: [
      '自分で起き上がれない',
      '自分で食事を口に運べない',
      '排泄に全介助が必要',
      '着替えができない',
      '歩行ができない（寝たきり〜車椅子）'
    ],
    criteria: [
      '両眼の視力の和が 0.04 以下',
      '両耳の聴力レベルが 100dB 以上',
      '両上肢の機能が全く失われた状態',
      '両下肢の機能が全く失われた状態',
      '体幹の機能に座っていることができない程度の障害',
      '精神障害で日常生活の用を弁ずることを不能ならしめる程度'
    ],
    cases: [
      {
        age:45, who:'男性 会社員',
        cause:'くも膜下出血による重度後遺症',
        income_before:600,  // 万円
        pension_year:238,   // 万円
        note:'配偶者+子2人。傷病手当金は発症後1.5年で終了、以降は障害年金のみ'
      }
    ],
    stat: {
      recipients: '約37万人',
      avgAge: '約58歳',
      workRate: '就労継続率 5%未満',
      avgIncome: '年金のみで年 約100〜150万円'
    }
  },
  2: {
    code: 2,
    label: '2級',
    summary: '日常生活が著しい制限を受ける状態（労働不可）',
    disease: [
      '脳梗塞後遺症（片麻痺）',
      '中等度の心疾患（NYHA III度）',
      'がん（化学療法継続中で労働困難）',
      'うつ病・統合失調症（重度）',
      '関節リウマチ（重度）',
      '糖尿病合併症（人工透析導入）',
      '一眼失明＋他眼視力0.02以下'
    ],
    life: [
      '杖や装具があれば歩行可能',
      '食事・着替えは時間をかければ自力',
      '家事の多くに介助・休憩が必要',
      '長時間の労働は困難',
      '外出には付き添いが必要なことも'
    ],
    criteria: [
      '両眼の視力の和が 0.05〜0.08',
      '両耳の聴力レベルが 90dB 以上',
      '平衡機能に著しい障害',
      '体幹の機能に立ち上がりの困難',
      '精神障害で日常生活が著しい制限を受ける'
    ],
    cases: [
      {
        age:50, who:'男性 会社員',
        cause:'脳梗塞（片麻痺）',
        income_before:550,
        pension_year:160,
        note:'リハビリ後に短時間パートで復職、収入3割に減少'
      },
      {
        age:38, who:'女性 会社員',
        cause:'うつ病（重度）',
        income_before:420,
        pension_year:130,
        note:'休職→退職、障害厚生2級で年金受給中'
      }
    ],
    stat: {
      recipients: '約140万人',
      avgAge: '約54歳',
      workRate: '就労継続率 約20〜30%（短時間が大半）',
      avgIncome: '年金+障害者雇用で年 約200〜300万円'
    }
  },
  3: {
    code: 3,
    label: '3級',
    summary: '労働に著しい制限を受ける状態（厚生年金のみ）',
    disease: [
      '軽〜中等度の心疾患',
      'がん（寛解後の経過観察中）',
      '脳梗塞軽度後遺症',
      '人工関節置換術後',
      '中等度のうつ病',
      '肝硬変・糖尿病（中等度）',
      '一眼失明（他眼は正常）'
    ],
    life: [
      '日常生活はほぼ自立',
      '通勤・勤務時間に制限が必要',
      '肉体労働や残業は困難',
      '短時間勤務・配置転換が必要'
    ],
    criteria: [
      '両眼の視力の和が 0.1 以下',
      '両耳の聴力レベルが 70dB 以上',
      '人工関節・人工骨頭を挿入',
      '労働に著しい制限を受ける精神障害'
    ],
    cases: [
      {
        age:48, who:'男性 会社員',
        cause:'心筋梗塞後・ステント留置',
        income_before:650,
        pension_year:90,
        note:'配置転換で収入2割減、残業制限あり'
      }
    ],
    stat: {
      recipients: '約20万人',
      avgAge: '約52歳',
      workRate: '就労継続率 約60〜70%',
      avgIncome: '年金+就労で年 約400〜500万円'
    }
  }
};

// ─── 計算関数 ──────────────────────────────────────

// 報酬比例年金額（簡易式）
// params: avgStdMonthlyYen（平均標準報酬月額、円）, monthsCovered（被保険者期間月数）
// 返却: 年額（円）
// ※ 正確には2003/3以前と以降で計算式が分かれるが、本機能では2003/4以降一律で簡易計算
function reportProportion(avgStdMonthlyYen, monthsCovered){
  const stdMonthly = Math.max(0, avgStdMonthlyYen||0);
  // 平均標準報酬額（総報酬制） ≒ 標報月額 × 1.3（賞与込み係数の簡易想定）
  const avgAnnualRem = stdMonthly * 1.3;
  const months = Math.max(1, monthsCovered||1);
  return avgAnnualRem * 5.481 / 1000 * months;
}

// 年収から標準報酬月額を逆算（簡易）
// annualIncomeYen: 額面年収（円）
// ※ 概算：額面年収 ÷ 12 が目安（厚生年金加入前提）
function estimateStdMonthly(annualIncomeYen){
  const m = Math.max(0, (annualIncomeYen||0) / 12);
  // 標報月額には上限（65万円）・下限（8.8万円）がある
  return Math.max(88000, Math.min(650000, m));
}

// 加入月数の推定（加入開始年齢から発症年齢まで）
function estimateMonthsCovered(startAge, currentAge){
  const years = Math.max(1, (currentAge||65) - (startAge||22));
  return years * 12;
}

// 障害基礎年金 年額
// grade: 1 or 2（3級は基礎なし）
// numChildren: 子の人数（18歳年度末まで）
function basicAnnual(grade, numChildren){
  if(grade === 1) var base = DISABILITY_1;
  else if(grade === 2) var base = DISABILITY_2;
  else return 0;
  // 子の加算
  const n = Math.max(0, numChildren||0);
  let childAdd = 0;
  if(n >= 1) childAdd += CHILD_ADD_12;
  if(n >= 2) childAdd += CHILD_ADD_12;
  if(n >= 3) childAdd += (n - 2) * CHILD_ADD_3P;
  return base + childAdd;
}

// 障害厚生年金 年額
// grade: 1/2/3
// avgStdMonthlyYen, monthsCovered: 報酬比例の計算に使用
// hasSpouse: 配偶者加給の有無（1・2級のみ対象）
function employeeAnnual(grade, avgStdMonthlyYen, monthsCovered, hasSpouse){
  const prop = reportProportion(avgStdMonthlyYen, monthsCovered);
  let result = 0;
  if(grade === 1)      result = prop * 1.25 + (hasSpouse ? SPOUSE_ADD : 0);
  else if(grade === 2) result = prop * 1.00 + (hasSpouse ? SPOUSE_ADD : 0);
  else if(grade === 3) result = Math.max(prop * 1.00, DISABILITY_3_MIN);
  return result;
}

// 障害年金トータル（基礎＋厚生）
// params: {
//   grade: 1|2|3
//   annualIncomeYen: 年収（円）← ここから標準報酬月額を推定
//   startAge: 厚生年金加入開始年齢（既定22）
//   currentAge: 発症年齢
//   numChildren: 子の人数
//   hasSpouse: 配偶者の有無
//   isEmployee: 厚生年金加入の有無（会社員=true、自営=false）
// }
function calcTotal(params){
  const p = params || {};
  const grade = p.grade || 2;
  const stdMonth = estimateStdMonthly(p.annualIncomeYen);
  const months = estimateMonthsCovered(p.startAge||22, p.currentAge||40);
  const basic = basicAnnual(grade, p.numChildren);
  const employee = p.isEmployee ? employeeAnnual(grade, stdMonth, months, !!p.hasSpouse) : 0;
  const reportProp = p.isEmployee ? reportProportion(stdMonth, months) : 0;
  return {
    grade: grade,
    basic: Math.round(basic),
    employee: Math.round(employee),
    reportProp: Math.round(reportProp),
    total: Math.round(basic + employee),
    monthly: Math.round((basic + employee) / 12),
    stdMonthly: Math.round(stdMonth),
    monthsCovered: months
  };
}

// ─── ポップアップ用HTML生成 ──────────────────────────

function fmtYen(v){ return (Math.round(v||0)).toLocaleString() + '円'; }
function fmtMan(v){ return (Math.round((v||0)/10000*10)/10).toLocaleString() + '万円'; }

// 等級別の詳細情報をHTMLで返す（タブ切替形式のデータを一括）
function renderGradeInfo(grade){
  const g = GRADES[grade] || GRADES[2];
  return {
    label: g.label,
    summary: g.summary,
    disease: g.disease,
    life: g.life,
    criteria: g.criteria,
    cases: g.cases,
    stat: g.stat
  };
}

// 計算結果のサマリーHTML
function renderCalcHtml(params, personLabel){
  const r = calcTotal(params);
  const g = GRADES[r.grade] || GRADES[2];
  const pLbl = personLabel || '対象者';
  const incomeWan = Math.round((params.annualIncomeYen||0)/10000);

  const childRow = (params.numChildren||0) > 0
    ? `<tr><td style="padding:3px 6px;color:#64748b">　うち子の加算</td><td style="text-align:right;padding:3px 6px">${fmtYen(Math.max(0,r.basic - (r.grade===1?DISABILITY_1:DISABILITY_2)))}</td></tr>`
    : '';

  const employeeRow = params.isEmployee ? `
    <tr><td style="padding:3px 6px">障害厚生年金</td><td style="text-align:right;padding:3px 6px">${fmtYen(r.employee)}</td></tr>
    <tr><td style="padding:3px 6px;color:#64748b">　報酬比例部分(参考)</td><td style="text-align:right;padding:3px 6px;color:#64748b">${fmtYen(r.reportProp)}</td></tr>
    ${params.hasSpouse && r.grade<3 ? `<tr><td style="padding:3px 6px;color:#64748b">　配偶者加給</td><td style="text-align:right;padding:3px 6px;color:#64748b">${fmtYen(SPOUSE_ADD)}</td></tr>` : ''}
  ` : `<tr><td style="padding:3px 6px;color:#888">障害厚生年金</td><td style="text-align:right;padding:3px 6px;color:#888">なし（自営等）</td></tr>`;

  return `
    <div style="font-size:13px;margin-bottom:6px">
      <b>${pLbl}</b> 年収 ${incomeWan.toLocaleString()}万円 / <b>${g.label}</b>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
      <tr><td style="padding:3px 6px">障害基礎年金</td><td style="text-align:right;padding:3px 6px">${fmtYen(r.basic)}</td></tr>
      ${childRow}
      ${employeeRow}
      <tr style="border-top:2px solid #333">
        <td style="padding:4px 6px"><b>年額合計</b></td>
        <td style="text-align:right;padding:4px 6px"><b style="color:#1a3a6b">${fmtYen(r.total)}</b></td>
      </tr>
      <tr><td style="padding:3px 6px;color:#64748b">月額換算</td><td style="text-align:right;padding:3px 6px;color:#64748b">${fmtYen(r.monthly)}/月</td></tr>
    </table>
    <div style="font-size:10px;color:#888;margin-top:6px">
      出典：日本年金機構「障害年金」2024年度（新規裁定・67歳以下）<br>
      ※ 報酬比例は簡易推定。加入期間・標報月額は実績に依存
    </div>`;
}

// ─── 外部公開 ──────────────────────────────────────

window.DisabilityPension = {
  // 定数
  BASIC_FULL: BASIC_FULL,
  DISABILITY_1: DISABILITY_1,
  DISABILITY_2: DISABILITY_2,
  DISABILITY_3_MIN: DISABILITY_3_MIN,
  CHILD_ADD_12: CHILD_ADD_12,
  CHILD_ADD_3P: CHILD_ADD_3P,
  SPOUSE_ADD: SPOUSE_ADD,
  GRADES: GRADES,
  // 計算
  reportProportion: reportProportion,
  estimateStdMonthly: estimateStdMonthly,
  estimateMonthsCovered: estimateMonthsCovered,
  basicAnnual: basicAnnual,
  employeeAnnual: employeeAnnual,
  calcTotal: calcTotal,
  // 表示
  renderGradeInfo: renderGradeInfo,
  renderCalcHtml: renderCalcHtml,
  fmtYen: fmtYen,
  fmtMan: fmtMan
};

})();
