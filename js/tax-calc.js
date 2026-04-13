/* ============================================================
 *  tax-calc.js — 税金シミュレーター（令和7年度 恒久制度基準）
 *  kaikei7.com風の詳細入力 + 計算ボタン → 結果表示
 *  ※ 2025-2026年限定の一時的上乗せ措置は適用外
 * ============================================================ */

/* ---------- 入力状態（タブ切替で保持） ---------- */
var _taxState = {
  // 本人
  age:'', disabled:'none', widow:'none', student:false,
  salary:'',  withheld:'',
  // 配偶者
  married:false, spAge:'', spDisabled:'none', spHasIncome:false, spSalary:'',
  // 扶養
  dep15:0, dep16_18:0, dep19_22:0, dep23_69:0, dep70:0, dep70dou:0,
  // ふるさと納税
  furusato:'',
  // 社会保険
  socialAuto:true, socialManual:'',
  // iDeCo
  ideco:'',
  // 生命保険
  seimei:'', iryo:'', nenkin_hoken:'',
  // 住宅ローン
  loanEnabled:false, loanBal:'', loanType:'new',
  // 結果表示
  showResult:false
};

/* ==========================================================
 *  計算ロジック（万円単位）
 * ========================================================== */

/* 給与所得控除 */
function taxKyuyoDeduction(gross){
  if(gross<=0) return 0;
  if(gross<=190) return Math.min(gross, 65);
  if(gross<=360) return gross*0.30 + 8;
  if(gross<=660) return gross*0.20 + 44;
  if(gross<=850) return gross*0.10 + 110;
  return 195;
}

/* 社会保険料（自動計算: 協会けんぽ全国平均） */
function taxSocialIns(gross){
  if(gross<=0) return 0;
  var kenpo   = gross * 0.050;
  var nenkinBase = Math.min(gross, 780);
  var nenkin  = nenkinBase * 0.0915;
  var koyou   = gross * 0.006;
  return Math.round((kenpo + nenkin + koyou)*100)/100;
}
function taxSocialInsDetail(gross){
  if(gross<=0) return {kenpo:0,nenkin:0,koyou:0,total:0};
  var kenpo   = Math.round(gross * 0.050 * 100)/100;
  var nenkinBase = Math.min(gross, 780);
  var nenkin  = Math.round(nenkinBase * 0.0915 * 100)/100;
  var koyou   = Math.round(gross * 0.006 * 100)/100;
  return {kenpo:kenpo, nenkin:nenkin, koyou:koyou, total:Math.round((kenpo+nenkin+koyou)*100)/100};
}

/* 所得税（累進） */
function taxIncomeTax(taxableIncome){
  if(taxableIncome<=0) return 0;
  var t = taxableIncome, tax;
  if(t<=195)       tax = t * 0.05;
  else if(t<=330)  tax = t * 0.10 - 9.75;
  else if(t<=695)  tax = t * 0.20 - 42.75;
  else if(t<=900)  tax = t * 0.23 - 63.6;
  else if(t<=1800) tax = t * 0.33 - 153.6;
  else if(t<=4000) tax = t * 0.40 - 279.6;
  else             tax = t * 0.45 - 479.6;
  return Math.round(tax * 1.021 * 100)/100;  // 復興特別所得税
}

/* 住民税 */
function taxResidentTax(taxableIncome){
  if(taxableIncome<=0) return 0.5;
  return Math.round((taxableIncome * 0.10 + 0.5)*100)/100;
}

/* 住宅ローン控除 */
function taxLoanCredit(loanBal, incomeTax, residentTax){
  if(!loanBal || loanBal<=0) return {sc:0, jc:0, total:0};
  var credit = Math.round(loanBal * 0.007 * 100)/100;
  var sc = Math.min(credit, incomeTax);
  var remain = credit - sc;
  var jc = Math.min(remain, Math.min(residentTax, 9.75));
  return {sc:Math.round(sc*100)/100, jc:Math.round(jc*100)/100, total:Math.round((sc+jc)*100)/100};
}

/* 配偶者控除/特別控除 */
function taxSpouseDeduction(mainIncome, spouseIncome, mainAge){
  if(mainIncome > 1000) return {s:0, j:0};
  // 本人所得による段階
  var tier = mainIncome<=900 ? 0 : mainIncome<=950 ? 1 : 2;
  var table = [
    // [spouseIncome上限, [所得税900以下, 950以下, 1000以下], [住民税同]]
    [58,  [38,26,13],[33,22,11]],
    [100, [36,24,12],[33,18,9]],
    [105, [31,18,9], [31,14,7]],
    [110, [26,12,6], [26,9,4]],
    [115, [21,8,4],  [21,4,2]],
    [120, [16,4,2],  [16,2,1]],
    [125, [11,2,1],  [11,1,1]],
    [130, [6,2,1],   [6,1,1]],
    [133, [3,1,1],   [3,1,1]]
  ];
  for(var i=0;i<table.length;i++){
    if(spouseIncome<=table[i][0]) return {s:table[i][1][tier], j:table[i][2][tier]};
  }
  return {s:0, j:0};
}

/* 生命保険料控除 */
function taxLifeInsDeduction(seimei, iryo, nenkin){
  // 新制度（2012年以降）: 各区分最大4万（所得税）/ 2.8万（住民税）
  function calcS(premium){ // 所得税用
    if(premium<=2) return premium;
    if(premium<=4) return premium*0.5+1;
    if(premium<=8) return premium*0.25+2;
    return 4;
  }
  function calcJ(premium){ // 住民税用
    if(premium<=1.2) return premium;
    if(premium<=3.2) return premium*0.5+0.6;
    if(premium<=5.6) return premium*0.25+1.4;
    return 2.8;
  }
  var s = calcS(seimei||0) + calcS(iryo||0) + calcS(nenkin||0);
  var j = calcJ(seimei||0) + calcJ(iryo||0) + calcJ(nenkin||0);
  return {s:Math.min(s,12), j:Math.min(j,7)}; // 合計上限12万/7万
}

/* ==========================================================
 *  メイン計算
 * ========================================================== */
function _taxCalcFull(){
  var S = _taxState;
  var gross = (parseFloat(S.salary)||0) / 10000; // 円→万円

  if(gross<=0) return null;

  var kyuyoDed = taxKyuyoDeduction(gross);
  var shotoku = Math.max(0, gross - kyuyoDed);

  // 社会保険料
  var social;
  if(S.socialAuto){
    social = taxSocialIns(gross);
  } else {
    social = (parseFloat(S.socialManual)||0) / 10000;
  }
  var socialDetail = S.socialAuto ? taxSocialInsDetail(gross) : null;

  // --- 所得控除（所得税用 / 住民税用）---
  var dedS = 0, dedJ = 0;
  var dedItems = [];

  // 基礎控除
  if(shotoku <= 2350){
    dedS += 58; dedJ += 43;
    dedItems.push({name:'基礎控除', s:58, j:43});
  }

  // 社会保険料控除
  dedS += social; dedJ += social;
  dedItems.push({name:'社会保険料控除', s:Math.round(social*100)/100, j:Math.round(social*100)/100});

  // 配偶者控除
  if(S.married){
    var spGross = S.spHasIncome ? (parseFloat(S.spSalary)||0)/10000 : 0;
    var spIncome = Math.max(0, spGross - taxKyuyoDeduction(spGross));
    var spd = taxSpouseDeduction(shotoku, spIncome, parseInt(S.age)||30);
    if(spd.s>0 || spd.j>0){
      dedS += spd.s; dedJ += spd.j;
      dedItems.push({name:'配偶者控除/特別控除', s:spd.s, j:spd.j});
    }
  }

  // 扶養控除
  var depS=0, depJ=0;
  var d16 = parseInt(S.dep16_18)||0;
  var d19 = parseInt(S.dep19_22)||0;
  var d23 = parseInt(S.dep23_69)||0;
  var d70 = parseInt(S.dep70)||0;
  var d70d = parseInt(S.dep70dou)||0;
  depS += d16*38 + d19*63 + d23*38 + d70*48 + d70d*58;
  depJ += d16*33 + d19*45 + d23*33 + d70*38 + d70d*45;
  if(depS>0){
    dedS += depS; dedJ += depJ;
    dedItems.push({name:'扶養控除', s:depS, j:depJ});
  }

  // 障害者控除
  if(S.disabled==='normal'){ dedS+=27; dedJ+=26; dedItems.push({name:'障害者控除', s:27, j:26}); }
  if(S.disabled==='special'){ dedS+=40; dedJ+=30; dedItems.push({name:'特別障害者控除', s:40, j:30}); }

  // 寡婦/ひとり親
  if(S.widow==='widow'){ dedS+=27; dedJ+=26; dedItems.push({name:'寡婦控除', s:27, j:26}); }
  if(S.widow==='single'){ dedS+=35; dedJ+=30; dedItems.push({name:'ひとり親控除', s:35, j:30}); }

  // 勤労学生
  if(S.student){ dedS+=27; dedJ+=26; dedItems.push({name:'勤労学生控除', s:27, j:26}); }

  // iDeCo（小規模企業共済等掛金控除）
  var ideco = (parseFloat(S.ideco)||0)/10000;
  if(ideco>0){ dedS+=ideco; dedJ+=ideco; dedItems.push({name:'小規模企業共済等掛金控除 (iDeCo)', s:Math.round(ideco*100)/100, j:Math.round(ideco*100)/100}); }

  // 生命保険料控除
  var seimei = (parseFloat(S.seimei)||0)/10000;
  var iryoIns = (parseFloat(S.iryo)||0)/10000;
  var nenkinIns = (parseFloat(S.nenkin_hoken)||0)/10000;
  if(seimei>0 || iryoIns>0 || nenkinIns>0){
    var lid = taxLifeInsDeduction(seimei, iryoIns, nenkinIns);
    dedS += lid.s; dedJ += lid.j;
    dedItems.push({name:'生命保険料控除', s:Math.round(lid.s*100)/100, j:Math.round(lid.j*100)/100});
  }

  // ふるさと納税（所得控除としての寄附金控除: ふるさと納税-2000円）
  var furusato = (parseFloat(S.furusato)||0)/10000;
  if(furusato>0){
    var kifu = Math.max(0, furusato - 0.2); // 2000円=0.2万
    dedS += kifu; dedJ += kifu;
    dedItems.push({name:'寄附金控除（ふるさと納税）', s:Math.round(kifu*100)/100, j:Math.round(kifu*100)/100});
  }

  // 課税所得
  var taxableS = Math.max(0, shotoku - dedS);
  var taxableJ = Math.max(0, shotoku - dedJ);

  // 税額
  var incomeTax = taxIncomeTax(taxableS);
  var residentTax = taxResidentTax(taxableJ);

  // 住宅ローン控除
  var lc = {sc:0, jc:0, total:0};
  if(S.loanEnabled){
    var bal = (parseFloat(S.loanBal)||0)/10000;
    lc = taxLoanCredit(bal, incomeTax, residentTax);
    incomeTax = Math.max(0, incomeTax - lc.sc);
    residentTax = Math.max(0, residentTax - lc.jc);
  }

  // ふるさと納税の税額控除部分（住民税特例分）は簡略化のため省略

  incomeTax = Math.round(incomeTax*100)/100;
  residentTax = Math.round(residentTax*100)/100;

  var totalTax = incomeTax + residentTax + social;
  var tedori = gross - totalTax;

  return {
    gross: gross,
    kyuyoDed: kyuyoDed,
    shotoku: shotoku,
    social: social,
    socialDetail: socialDetail,
    dedItems: dedItems,
    dedS: Math.round(dedS*100)/100,
    dedJ: Math.round(dedJ*100)/100,
    taxableS: Math.round(taxableS*100)/100,
    taxableJ: Math.round(taxableJ*100)/100,
    incomeTax: incomeTax,
    residentTax: residentTax,
    loanCredit: lc,
    totalTax: Math.round(totalTax*100)/100,
    tedori: Math.round(tedori*100)/100,
    withheld: (parseFloat(S.withheld)||0)/10000
  };
}

/* ==========================================================
 *  _taxSaveInputs — DOM→_taxState に保存
 * ========================================================== */
function _taxSaveInputs(){
  var S = _taxState;
  var v = function(id){ var e=document.getElementById(id); return e?e.value:''; };
  var ck = function(id){ var e=document.getElementById(id); return e?e.checked:false; };
  var sel = function(id){ var e=document.getElementById(id); return e?e.value:''; };

  S.age = v('tax-age');
  S.disabled = sel('tax-disabled');
  S.widow = sel('tax-widow');
  S.student = ck('tax-student');
  S.salary = v('tax-salary');
  S.withheld = v('tax-withheld');

  S.married = ck('tax-married');
  S.spAge = v('tax-sp-age');
  S.spDisabled = sel('tax-sp-disabled');
  S.spHasIncome = ck('tax-sp-has-income');
  S.spSalary = v('tax-sp-salary');

  S.dep15 = v('tax-dep15');
  S.dep16_18 = v('tax-dep16');
  S.dep19_22 = v('tax-dep19');
  S.dep23_69 = v('tax-dep23');
  S.dep70 = v('tax-dep70');
  S.dep70dou = v('tax-dep70d');

  S.furusato = v('tax-furusato');

  S.socialAuto = ck('tax-social-auto');
  S.socialManual = v('tax-social-manual');

  S.ideco = v('tax-ideco');
  S.seimei = v('tax-seimei');
  S.iryo = v('tax-iryo');
  S.nenkin_hoken = v('tax-nenkin-hoken');

  S.loanEnabled = ck('tax-loan-enabled');
  S.loanBal = v('tax-loan-bal');
  S.loanType = sel('tax-loan-type');
}

/* ==========================================================
 *  renderTaxTab — タブ描画（入力フォーム + 計算ボタン + 結果）
 * ========================================================== */
function renderTaxTab(){
  var rb=$('right-body');
  if(!rb) return;
  var S = _taxState;

  // ===== スタイル =====
  var stInput = 'width:140px;padding:5px 8px;border-radius:4px;border:1px solid #555;background:#1e1e2e;color:#fff;font-size:13px;text-align:right;';
  var stInputS = 'width:90px;padding:5px 8px;border-radius:4px;border:1px solid #555;background:#1e1e2e;color:#fff;font-size:13px;text-align:right;';
  var stSelect = 'padding:5px 8px;border-radius:4px;border:1px solid #555;background:#1e1e2e;color:#fff;font-size:12px;';
  var stLabel = 'font-size:12px;color:#bbb;';
  var stSection = 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:14px 16px;margin-bottom:12px;';
  var stSectionTitle = 'font-size:13px;font-weight:700;color:#e0e0e0;margin-bottom:10px;';
  var stRow = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;';
  var stUnit = 'font-size:12px;color:#888;';
  var stCheck = 'accent-color:#4ade80;';

  var html = '<div style="padding:16px 20px;max-width:780px;margin:0 auto">';
  html += '<h2 style="margin:0 0 2px;font-size:17px;color:#e0e0e0">🧮 税金シミュレーター</h2>';
  html += '<div style="font-size:10px;color:#666;margin-bottom:14px">令和7年度 恒久制度基準 ｜ 一時的上乗せ措置は適用外</div>';

  // ─── あなたについて ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">📋 あなたについて</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">年齢（12/31時点）</span>';
  html += '<input id="tax-age" type="number" value="'+_esc(S.age)+'" placeholder="40" style="'+stInputS+'">';
  html += '<span style="'+stUnit+'">歳</span>';
  html += '</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">障害者に該当するか</span>';
  html += '<select id="tax-disabled" style="'+stSelect+'">';
  html += '<option value="none"'+(S.disabled==='none'?' selected':'')+'>障害者ではない</option>';
  html += '<option value="normal"'+(S.disabled==='normal'?' selected':'')+'>障害者</option>';
  html += '<option value="special"'+(S.disabled==='special'?' selected':'')+'>特別障害者</option>';
  html += '</select></div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">寡婦 / ひとり親</span>';
  html += '<select id="tax-widow" style="'+stSelect+'">';
  html += '<option value="none"'+(S.widow==='none'?' selected':'')+'>該当しない</option>';
  html += '<option value="widow"'+(S.widow==='widow'?' selected':'')+'>寡婦</option>';
  html += '<option value="single"'+(S.widow==='single'?' selected':'')+'>ひとり親</option>';
  html += '</select></div>';
  html += '<div style="'+stRow+'">';
  html += '<label><input id="tax-student" type="checkbox"'+(S.student?' checked':'')+' style="'+stCheck+'"> <span style="'+stLabel+'">勤労学生に該当する</span></label>';
  html += '</div></div>';

  // ─── 給与 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">💰 給与（賞与・役員報酬含む）</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">給与収入</span>';
  html += '<input id="tax-salary" type="number" value="'+_esc(S.salary)+'" placeholder="7,000,000" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '<button onclick="_taxFromCF()" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:5px 10px;font-size:11px;cursor:pointer;font-weight:600" title="CF表のご主人様の給与を取得">CF表から取得</button>';
  html += '</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">源泉所得税</span>';
  html += '<input id="tax-withheld" type="number" value="'+_esc(S.withheld)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円（源泉徴収票から）</span>';
  html += '</div></div>';

  // ─── 配偶者 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">💑 結婚している</div>';
  html += '<div style="'+stRow+'">';
  html += '<label><input id="tax-married" type="checkbox"'+(S.married?' checked':'')+' onchange="_taxToggleMarried()" style="'+stCheck+'"> <span style="'+stLabel+'">はい</span></label>';
  html += '</div>';
  html += '<div id="tax-married-area" style="'+(S.married?'':'display:none;')+'padding-left:16px">';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">配偶者の年齢</span>';
  html += '<input id="tax-sp-age" type="number" value="'+_esc(S.spAge)+'" placeholder="38" style="'+stInputS+'">';
  html += '<span style="'+stUnit+'">歳</span>';
  html += '<select id="tax-sp-disabled" style="'+stSelect+'">';
  html += '<option value="none"'+(S.spDisabled==='none'?' selected':'')+'>障害者ではない</option>';
  html += '<option value="normal"'+(S.spDisabled==='normal'?' selected':'')+'>障害者</option>';
  html += '<option value="special"'+(S.spDisabled==='special'?' selected':'')+'>特別障害者</option>';
  html += '</select></div>';
  html += '<div style="'+stRow+'">';
  html += '<label><input id="tax-sp-has-income" type="checkbox"'+(S.spHasIncome?' checked':'')+' onchange="_taxToggleSpIncome()" style="'+stCheck+'"> <span style="'+stLabel+'">配偶者に給与収入がある</span></label>';
  html += '</div>';
  html += '<div id="tax-sp-income-area" style="'+(S.spHasIncome?'':'display:none;')+stRow+'">';
  html += '<span style="'+stLabel+'">配偶者の給与収入</span>';
  html += '<input id="tax-sp-salary" type="number" value="'+_esc(S.spSalary)+'" placeholder="1,030,000" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '</div></div></div>';

  // ─── 扶養家族 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">👨‍👩‍👧‍👦 扶養している家族等の人数</div>';
  html += '<div style="font-size:11px;color:#888;margin-bottom:8px">配偶者以外で、主にあなたのお金で生活している家族</div>';
  html += '<table style="width:100%;font-size:12px;border-collapse:collapse">';
  var depRows = [
    ['（年少）〜15才', 'tax-dep15', S.dep15, '扶養控除対象外'],
    ['（一般）16〜18才', 'tax-dep16', S.dep16_18, ''],
    ['（特定）19〜22才', 'tax-dep19', S.dep19_22, '控除額大'],
    ['（一般）23〜69才', 'tax-dep23', S.dep23_69, ''],
    ['（老親等）70才以上', 'tax-dep70', S.dep70, '同居以外'],
    ['（同居老親）70才以上', 'tax-dep70d', S.dep70dou, '同居']
  ];
  depRows.forEach(function(r){
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.05)">';
    html += '<td style="padding:5px 4px;color:#bbb">'+r[0]+'</td>';
    html += '<td style="padding:5px 4px;width:80px"><select id="'+r[1]+'" style="'+stSelect+'width:70px;">';
    var cur = parseInt(r[2])||0;
    for(var i=0;i<=10;i++){
      html += '<option value="'+i+'"'+(cur===i?' selected':'')+'>'+(!i?'なし':i+'人')+'</option>';
    }
    html += '</select></td>';
    if(r[3]) html += '<td style="padding:5px 4px;font-size:10px;color:#666">'+r[3]+'</td>';
    else html += '<td></td>';
    html += '</tr>';
  });
  html += '</table></div>';

  // ─── ふるさと納税 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">🏠 ふるさと納税</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">寄附金額</span>';
  html += '<input id="tax-furusato" type="number" value="'+_esc(S.furusato)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '</div></div>';

  // ─── 社会保険料 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">🏥 社会保険料</div>';
  html += '<div style="'+stRow+'">';
  html += '<label><input id="tax-social-auto" type="checkbox"'+(S.socialAuto?' checked':'')+' onchange="_taxToggleSocialAuto()" style="'+stCheck+'"> <span style="'+stLabel+'">自動計算（65才未満の会社員）</span></label>';
  html += '</div>';
  html += '<div id="tax-social-manual-area" style="'+(S.socialAuto?'display:none;':'')+stRow+'">';
  html += '<span style="'+stLabel+'">社会保険料の合計</span>';
  html += '<input id="tax-social-manual" type="number" value="'+_esc(S.socialManual)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '</div></div>';

  // ─── iDeCo ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">📈 iDeCo（小規模企業共済等掛金）</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">年間掛金額</span>';
  html += '<input id="tax-ideco" type="number" value="'+_esc(S.ideco)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '</div></div>';

  // ─── 生命保険料 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">🛡️ 生命保険料控除（新制度）</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">一般生命保険料</span>';
  html += '<input id="tax-seimei" type="number" value="'+_esc(S.seimei)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円/年</span>';
  html += '</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">介護医療保険料</span>';
  html += '<input id="tax-iryo" type="number" value="'+_esc(S.iryo)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円/年</span>';
  html += '</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">個人年金保険料</span>';
  html += '<input id="tax-nenkin-hoken" type="number" value="'+_esc(S.nenkin_hoken)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円/年</span>';
  html += '</div></div>';

  // ─── 住宅ローン控除 ───
  html += '<div style="'+stSection+'">';
  html += '<div style="'+stSectionTitle+'">🏦 住宅ローン控除</div>';
  html += '<div style="'+stRow+'">';
  html += '<label><input id="tax-loan-enabled" type="checkbox"'+(S.loanEnabled?' checked':'')+' onchange="_taxToggleLoan()" style="'+stCheck+'"> <span style="'+stLabel+'">住宅ローン控除を受けている</span></label>';
  html += '</div>';
  html += '<div id="tax-loan-area" style="'+(S.loanEnabled?'':'display:none;')+'padding-left:16px">';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">年末ローン残高</span>';
  html += '<input id="tax-loan-bal" type="number" value="'+_esc(S.loanBal)+'" placeholder="0" style="'+stInput+'">';
  html += '<span style="'+stUnit+'">円</span>';
  html += '</div>';
  html += '<div style="'+stRow+'">';
  html += '<span style="'+stLabel+'">物件種別</span>';
  html += '<select id="tax-loan-type" style="'+stSelect+'">';
  html += '<option value="new"'+(S.loanType==='new'?' selected':'')+'>新築（控除期間13年）</option>';
  html += '<option value="used"'+(S.loanType==='used'?' selected':'')+'>中古（控除期間10年）</option>';
  html += '</select></div></div></div>';

  // ─── 計算ボタン ───
  html += '<div style="text-align:center;margin:16px 0">';
  html += '<button onclick="_taxDoCalc()" style="background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border:none;border-radius:8px;padding:12px 40px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.4);letter-spacing:1px">計 算</button>';
  html += '</div>';

  // ─── 結果エリア ───
  html += '<div id="tax-result-area">';
  if(S.showResult){
    html += _taxBuildResult();
  }
  html += '</div>';

  html += '</div>'; // /container
  rb.innerHTML = html;
}

/* HTML escape helper */
function _esc(v){ return v==null?'':String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

/* ==========================================================
 *  計算ボタン押下
 * ========================================================== */
function _taxDoCalc(){
  _taxSaveInputs();
  _taxState.showResult = true;
  var area = document.getElementById('tax-result-area');
  if(area) area.innerHTML = _taxBuildResult();
}

/* ==========================================================
 *  結果HTML生成
 * ========================================================== */
function _taxBuildResult(){
  var R = _taxCalcFull();
  if(!R) return '<div style="text-align:center;color:#f87171;padding:20px;font-size:13px">給与収入を入力してください</div>';

  var html = '';
  html += '<div style="border-top:2px solid #444;padding-top:16px;margin-top:8px">';
  html += '<h3 style="font-size:15px;color:#e0e0e0;margin:0 0 12px">📊 計算結果</h3>';

  // メインテーブル
  html += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">';
  var trs = [
    ['額面年収（給与収入）', _f(R.gross), ''],
    ['給与所得控除', '▲ '+_f(R.kyuyoDed), 'dim'],
    ['給与所得', _f(R.shotoku), ''],
    ['', '', 'sep'],
    ['所得控除合計（所得税用）', '▲ '+_f(R.dedS), 'dim'],
    ['課税所得（所得税用）', _f(R.taxableS), ''],
    ['', '', 'sep'],
    ['所得税', _f(R.incomeTax), 'red'],
    ['住民税', _f(R.residentTax), 'red'],
    ['社会保険料', _f(R.social), 'red'],
    ['', '', 'sep'],
    ['税・社保 合計', _f(R.totalTax), 'red bold'],
    ['手取り（年額）', _f(R.tedori), 'green bold'],
    ['手取り（月額）', _f(R.tedori/12), 'green'],
    ['手取り率', (R.tedori/R.gross*100).toFixed(1)+'%', 'green pct']
  ];

  if(R.withheld>0){
    var diff = R.withheld - R.incomeTax;
    trs.push(['','','sep']);
    trs.push(['源泉所得税（天引き済み）', _f(R.withheld), '']);
    trs.push([diff>=0?'還付金（もらえる）':'追加徴収（払う）', (diff>=0?'+':'')+_f(Math.abs(diff)), diff>=0?'green bold':'red bold']);
  }

  trs.forEach(function(r){
    if(r[2]==='sep'){
      html += '<tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,.1);padding:2px 0"></td></tr>';
      return;
    }
    var isBold = r[2].indexOf('bold')>=0;
    var color = '#e0e0e0';
    if(r[2].indexOf('green')>=0) color='#4ade80';
    if(r[2].indexOf('red')>=0) color='#f87171';
    if(r[2].indexOf('dim')>=0) color='#888';
    var bg = isBold ? 'background:rgba(255,255,255,.04);' : '';
    html += '<tr style="'+bg+'">';
    html += '<td style="padding:6px 10px;color:#ccc;font-weight:'+(isBold?'700':'400')+'">'+r[0]+'</td>';
    html += '<td style="text-align:right;padding:6px 10px;color:'+color+';font-weight:'+(isBold?'700':'400')+'">'+r[1]+(r[2].indexOf('pct')>=0?'':' 万円')+'</td>';
    html += '</tr>';
  });
  html += '</table>';

  // 控除明細
  html += '<details style="margin-bottom:12px">';
  html += '<summary style="cursor:pointer;font-size:12px;color:#aaa;font-weight:600;padding:6px 0">▶ 所得控除の明細</summary>';
  html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">';
  html += '<tr style="background:rgba(255,255,255,.06)"><th style="text-align:left;padding:4px 8px;color:#aaa">控除名</th><th style="text-align:right;padding:4px 8px;color:#7dd3fc">所得税</th><th style="text-align:right;padding:4px 8px;color:#f9a8d4">住民税</th></tr>';
  R.dedItems.forEach(function(d){
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)">';
    html += '<td style="padding:4px 8px;color:#bbb">'+d.name+'</td>';
    html += '<td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(d.s)+' 万</td>';
    html += '<td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(d.j)+' 万</td>';
    html += '</tr>';
  });
  html += '<tr style="background:rgba(255,255,255,.04);font-weight:700">';
  html += '<td style="padding:4px 8px;color:#ccc">合計</td>';
  html += '<td style="text-align:right;padding:4px 8px;color:#7dd3fc">'+_f(R.dedS)+' 万</td>';
  html += '<td style="text-align:right;padding:4px 8px;color:#f9a8d4">'+_f(R.dedJ)+' 万</td>';
  html += '</tr></table></details>';

  // 社保内訳
  if(R.socialDetail){
    html += '<details style="margin-bottom:12px">';
    html += '<summary style="cursor:pointer;font-size:12px;color:#aaa;font-weight:600;padding:6px 0">▶ 社会保険料の内訳</summary>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">健康保険 (5.0%)</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(R.socialDetail.kenpo)+' 万</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">厚生年金 (9.15%)</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(R.socialDetail.nenkin)+' 万</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">雇用保険 (0.6%)</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(R.socialDetail.koyou)+' 万</td></tr>';
    html += '<tr style="background:rgba(255,255,255,.04);font-weight:700"><td style="padding:4px 8px;color:#ccc">合計</td><td style="text-align:right;padding:4px 8px;color:#f87171">'+_f(R.socialDetail.total)+' 万</td></tr>';
    html += '</table></details>';
  }

  // 住宅ローン控除
  if(_taxState.loanEnabled && R.loanCredit.total>0){
    html += '<details style="margin-bottom:12px">';
    html += '<summary style="cursor:pointer;font-size:12px;color:#aaa;font-weight:600;padding:6px 0">▶ 住宅ローン控除の明細</summary>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px">';
    var bal = (parseFloat(_taxState.loanBal)||0)/10000;
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">年末残高 × 0.7%</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(bal*0.007)+' 万</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">所得税から控除</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(R.loanCredit.sc)+' 万</td></tr>';
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,.04)"><td style="padding:4px 8px;color:#bbb">住民税から控除（上限9.75万）</td><td style="text-align:right;padding:4px 8px;color:#ddd">'+_f(R.loanCredit.jc)+' 万</td></tr>';
    html += '<tr style="background:rgba(255,255,255,.04);font-weight:700"><td style="padding:4px 8px;color:#ccc">控除合計</td><td style="text-align:right;padding:4px 8px;color:#4ade80">'+_f(R.loanCredit.total)+' 万</td></tr>';
    html += '</table></details>';
  }

  // 注記
  html += '<div style="font-size:10px;color:#555;line-height:1.6;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)">';
  html += '※ 社会保険料は協会けんぽ全国平均（折半後）概算。厚生年金は標準報酬月額65万上限。<br>';
  html += '※ 復興特別所得税（×1.021）を含む。調整控除は省略。<br>';
  html += '※ 住宅ローン控除は令和4年以降入居（年末残高×0.7%）。住民税上限9.75万。<br>';
  html += '※ ふるさと納税は所得控除（寄附金控除）のみ反映。住民税特例分は省略。';
  html += '</div></div>';

  return html;
}

/* 万円フォーマット */
function _f(v){
  return (Math.round(v*100)/100).toLocaleString('ja-JP',{minimumFractionDigits:0, maximumFractionDigits:2});
}

/* ==========================================================
 *  トグル系
 * ========================================================== */
function _taxToggleMarried(){
  var el = document.getElementById('tax-married');
  var area = document.getElementById('tax-married-area');
  if(el && area) area.style.display = el.checked ? '' : 'none';
}
function _taxToggleSpIncome(){
  var el = document.getElementById('tax-sp-has-income');
  var area = document.getElementById('tax-sp-income-area');
  if(el && area) area.style.display = el.checked ? '' : 'none';
}
function _taxToggleSocialAuto(){
  var el = document.getElementById('tax-social-auto');
  var area = document.getElementById('tax-social-manual-area');
  if(el && area) area.style.display = el.checked ? 'none' : '';
}
function _taxToggleLoan(){
  var el = document.getElementById('tax-loan-enabled');
  var area = document.getElementById('tax-loan-area');
  if(el && area) area.style.display = el.checked ? '' : 'none';
}

/* ==========================================================
 *  CF表から取得
 * ========================================================== */
function _taxFromCF(){
  var hSalary = document.getElementById('h-salary');
  if(hSalary && hSalary.value){
    var val = parseFloat(hSalary.value)||0;
    var el = document.getElementById('tax-salary');
    if(el) el.value = Math.round(val * 10000); // 万円→円
  }
}
