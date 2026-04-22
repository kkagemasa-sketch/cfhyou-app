// sickness-benefit.js — 傷病手当金 計算
//
// 出典：全国健康保険協会「傷病手当金」
// https://www.kyoukaikenpo.or.jp/g3/cat310/sb3040/
//
// 制度概要：
//  - 対象：健康保険の被保険者（会社員・公務員）
//  - 対象外：自営業者（国民健康保険には傷病手当金なし）、被扶養者
//  - 金額：直近12ヶ月の標準報酬月額の平均 ÷ 30 × 2/3（＝日額）
//  - 期間：支給開始日から通算1年6ヶ月（2022年改正後、連続していなくてもOK）
//  - 待機：最初の3日間は無給、4日目から支給
//
// 本モジュール：
//  - 年収から簡易推計
//  - 月額・日額・総支給額を出す
//
// 金額単位：円／年

(function(){
'use strict';

// ─── 定数 ───────────────────────────────────────────

const MAX_DAYS = 18 * 30; // 1年6ヶ月を便宜上540日として扱う
const WAITING_DAYS = 3;   // 待機期間

// ─── 計算関数 ──────────────────────────────────────

// 年収から標準報酬月額を逆算（簡易）
function estimateStdMonthly(annualIncomeYen){
  const m = Math.max(0, (annualIncomeYen||0) / 12);
  return Math.max(58000, Math.min(1390000, m));
}

// 日額計算：標報月額 ÷ 30 × 2/3
function dailyAmount(stdMonthlyYen){
  return Math.round((stdMonthlyYen||0) / 30 * 2 / 3);
}

// 月額換算（参考）
function monthlyAmount(stdMonthlyYen){
  return Math.round((stdMonthlyYen||0) * 2 / 3);
}

// 総支給額（期間指定、最大1年6ヶ月）
// months: 休業期間の月数（3日の待機期間は自動控除、540日超は540日で打ち止め）
function totalBenefit(stdMonthlyYen, months){
  const daily = dailyAmount(stdMonthlyYen);
  const requestedDays = Math.max(0, (months||0) * 30);
  const eligibleDays = Math.min(MAX_DAYS, Math.max(0, requestedDays - WAITING_DAYS));
  return Math.round(daily * eligibleDays);
}

// ─── まとめ計算 ──────────────────────────────────

// params: {
//   annualIncomeYen: 年収（円）
//   isEligible: 対象者か（健康保険加入＝会社員/公務員でtrue、自営/扶養はfalse）
//   months: 休業期間（月）。省略時は最大1年6ヶ月
// }
function calcTotal(params){
  const p = params || {};
  if(!p.isEligible){
    return {
      isEligible: false,
      stdMonthly: 0, daily: 0, monthly: 0, total: 0, months: 0,
      message: '傷病手当金の対象外（自営業・被扶養者など）'
    };
  }
  const stdMonthly = estimateStdMonthly(p.annualIncomeYen);
  const daily = dailyAmount(stdMonthly);
  const monthly = monthlyAmount(stdMonthly);
  const months = Math.max(0, Math.min(18, p.months || 18)); // デフォルト最大期間
  const total = totalBenefit(stdMonthly, months);
  return {
    isEligible: true,
    stdMonthly: Math.round(stdMonthly),
    daily: daily,
    monthly: monthly,
    total: total,
    months: months,
    maxMonths: 18
  };
}

// ─── ポップアップ用HTML生成 ──────────────────────────

function fmtYen(v){ return (Math.round(v||0)).toLocaleString() + '円'; }
function fmtMan(v){ return (Math.round((v||0)/10000*10)/10).toLocaleString() + '万円'; }

function renderCalcHtml(params, personLabel){
  const r = calcTotal(params);
  const pLbl = personLabel || '対象者';
  const incomeWan = Math.round((params.annualIncomeYen||0)/10000);

  if(!r.isEligible){
    return `
      <div style="font-size:13px;margin-bottom:6px">
        <b>${pLbl}</b>：${r.message}
      </div>
      <div style="font-size:11px;color:#64748b;line-height:1.6">
        対象者：会社員・公務員（健康保険加入者）<br>
        対象外：自営業・フリーランス・被扶養者・パート（健保未加入）
      </div>
      <div style="font-size:10px;color:#888;margin-top:6px">
        出典：全国健康保険協会「傷病手当金」
      </div>`;
  }

  return `
    <div style="font-size:13px;margin-bottom:6px">
      <b>${pLbl}</b> 年収 ${incomeWan.toLocaleString()}万円（健保加入）
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
      <tr><td style="padding:3px 6px;color:#64748b">標準報酬月額(推定)</td><td style="text-align:right;padding:3px 6px">${fmtYen(r.stdMonthly)}</td></tr>
      <tr><td style="padding:3px 6px">日額（標報÷30×2/3）</td><td style="text-align:right;padding:3px 6px">${fmtYen(r.daily)}</td></tr>
      <tr><td style="padding:3px 6px">月額換算</td><td style="text-align:right;padding:3px 6px">${fmtYen(r.monthly)}/月</td></tr>
      <tr style="border-top:2px solid #333">
        <td style="padding:4px 6px"><b>最大受給額（1年6ヶ月）</b></td>
        <td style="text-align:right;padding:4px 6px"><b style="color:#1a3a6b">${fmtYen(r.total)}</b></td>
      </tr>
    </table>
    <div style="font-size:11px;color:#555;line-height:1.6;margin-bottom:6px">
      💡 <b>支給期間</b>：通算1年6ヶ月（連続していなくてもOK、2022年改正後）<br>
      ⏳ <b>待機期間</b>：最初の3日間は無給、4日目から支給<br>
      🏥 <b>要件</b>：業務外の病気・ケガ／労務不能／連続3日の欠勤<br>
      📝 <b>退職後</b>：要件を満たせば継続受給可（1年以上の被保険者期間等）
    </div>
    <div style="font-size:10px;color:#888;margin-top:6px">
      出典：全国健康保険協会「傷病手当金」
    </div>`;
}

// ─── 外部公開 ──────────────────────────────────────

window.SicknessBenefit = {
  MAX_DAYS: MAX_DAYS,
  WAITING_DAYS: WAITING_DAYS,
  estimateStdMonthly: estimateStdMonthly,
  dailyAmount: dailyAmount,
  monthlyAmount: monthlyAmount,
  totalBenefit: totalBenefit,
  calcTotal: calcTotal,
  renderCalcHtml: renderCalcHtml,
  fmtYen: fmtYen,
  fmtMan: fmtMan
};

})();
