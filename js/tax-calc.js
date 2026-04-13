/* ============================================================
 *  tax-calc.js — 税金シミュレーター（令和7年度 恒久制度基準）
 *  Phase 1 MVP: 給与→所得税・住民税・社保・手取り
 *  ※ 2025-2026年限定の一時的上乗せ措置は適用外
 * ============================================================ */

/* ---------- 税額状態（タブ切替で保持） ---------- */
var _taxState = { hGross:'', wGross:'', loanBal:'', detailOpen:false };

/* ==========================================================
 *  1. 給与所得控除  (万円 → 万円)
 * ========================================================== */
function taxKyuyoDeduction(gross){
  if(gross<=0) return 0;
  if(gross<=190) return Math.min(gross, 65);          // 恒久改正: 55→65万
  if(gross<=360) return gross*0.30 + 8;
  if(gross<=660) return gross*0.20 + 44;
  if(gross<=850) return gross*0.10 + 110;
  return 195;                                          // 上限195万
}

/* ==========================================================
 *  2. 社会保険料  (万円 → 万円)
 *     健保5.0% + 厚年9.15% + 雇用0.6% ≒ 14.75%
 *     厚生年金: 標準報酬月額65万上限 → 年収780万で頭打ち
 * ========================================================== */
function taxSocialIns(gross){
  if(gross<=0) return 0;
  var kenpo   = gross * 0.050;
  var nenkinBase = Math.min(gross, 780);   // 780万上限
  var nenkin  = nenkinBase * 0.0915;
  var koyou   = gross * 0.006;
  return Math.round((kenpo + nenkin + koyou)*100)/100;
}

/* 社保内訳を返す */
function taxSocialInsDetail(gross){
  if(gross<=0) return {kenpo:0,nenkin:0,koyou:0,total:0};
  var kenpo   = Math.round(gross * 0.050 * 100)/100;
  var nenkinBase = Math.min(gross, 780);
  var nenkin  = Math.round(nenkinBase * 0.0915 * 100)/100;
  var koyou   = Math.round(gross * 0.006 * 100)/100;
  return {kenpo:kenpo, nenkin:nenkin, koyou:koyou, total:Math.round((kenpo+nenkin+koyou)*100)/100};
}

/* ==========================================================
 *  3. 所得控除の計算
 * ========================================================== */

/* 配偶者控除 / 配偶者特別控除（所得税用・住民税用） */
function taxSpouseDeduction(mainIncome, spouseIncome){
  // mainIncome: 本人の合計所得, spouseIncome: 配偶者の合計所得
  // 本人所得900万超は段階的に縮小（簡略化: 900万以下のみフル適用）
  if(mainIncome > 1000) return {shotoku:0, jumin:0};
  if(mainIncome > 950)  {
    if(spouseIncome<=58)  return {shotoku:13, jumin:11};
    if(spouseIncome<=100) return {shotoku:12, jumin:9};
    if(spouseIncome<=105) return {shotoku:9,  jumin:7};
    if(spouseIncome<=110) return {shotoku:6,  jumin:4};
    if(spouseIncome<=115) return {shotoku:4,  jumin:2};
    if(spouseIncome<=120) return {shotoku:2,  jumin:1};
    if(spouseIncome<=133) return {shotoku:1,  jumin:1};
    return {shotoku:0, jumin:0};
  }
  if(mainIncome > 900)  {
    if(spouseIncome<=58)  return {shotoku:26, jumin:22};
    if(spouseIncome<=100) return {shotoku:24, jumin:18};
    if(spouseIncome<=105) return {shotoku:18, jumin:14};
    if(spouseIncome<=110) return {shotoku:12, jumin:9};
    if(spouseIncome<=115) return {shotoku:8,  jumin:4};
    if(spouseIncome<=120) return {shotoku:4,  jumin:2};
    if(spouseIncome<=133) return {shotoku:2,  jumin:1};
    return {shotoku:0, jumin:0};
  }
  // 本人所得900万以下
  if(spouseIncome<=58)  return {shotoku:38, jumin:33};  // 配偶者控除
  if(spouseIncome<=100) return {shotoku:36, jumin:33};  // 配偶者特別控除
  if(spouseIncome<=105) return {shotoku:31, jumin:31};
  if(spouseIncome<=110) return {shotoku:26, jumin:26};
  if(spouseIncome<=115) return {shotoku:21, jumin:21};
  if(spouseIncome<=120) return {shotoku:16, jumin:16};
  if(spouseIncome<=125) return {shotoku:11, jumin:11};
  if(spouseIncome<=130) return {shotoku:6,  jumin:6};
  if(spouseIncome<=133) return {shotoku:3,  jumin:3};
  return {shotoku:0, jumin:0};
}

/* 扶養控除（子どもの年齢から判定） */
function taxDependentDeduction(childAges){
  var shotoku=0, jumin=0;
  (childAges||[]).forEach(function(age){
    if(age<16) return;                    // 16歳未満: 対象外
    if(age>=19 && age<=22){               // 特定扶養（19-22歳）
      shotoku += 63; jumin += 45;
    } else {                               // 一般扶養（16-18歳, 23歳以上）
      shotoku += 38; jumin += 33;
    }
  });
  return {shotoku:shotoku, jumin:jumin};
}

/* ==========================================================
 *  4. 所得税（累進課税 + 復興特別所得税）
 * ========================================================== */
function taxIncomeTax(taxableIncome){
  if(taxableIncome<=0) return 0;
  var t = taxableIncome;
  var tax;
  if(t<=195)       tax = t * 0.05;
  else if(t<=330)  tax = t * 0.10 - 9.75;
  else if(t<=695)  tax = t * 0.20 - 42.75;
  else if(t<=900)  tax = t * 0.23 - 63.6;
  else if(t<=1800) tax = t * 0.33 - 153.6;
  else if(t<=4000) tax = t * 0.40 - 279.6;
  else             tax = t * 0.45 - 479.6;
  // 復興特別所得税 ×1.021
  tax = tax * 1.021;
  return Math.round(tax*100)/100;
}

/* ==========================================================
 *  5. 住民税（所得割10% + 均等割0.5万）
 * ========================================================== */
function taxResidentTax(taxableIncome){
  if(taxableIncome<=0) return 0.5;  // 均等割のみ
  return Math.round((taxableIncome * 0.10 + 0.5)*100)/100;
}

/* ==========================================================
 *  6. 住宅ローン控除（税額控除）
 *     年末残高 × 0.7%  所得税→住民税(上限9.75万)の順で控除
 * ========================================================== */
function taxLoanCredit(loanBal, incomeTax, residentTax){
  if(!loanBal || loanBal<=0) return {shotokuCredit:0, juminCredit:0};
  var credit = Math.round(loanBal * 0.007 * 100)/100;
  var sc = Math.min(credit, incomeTax);
  var remain = credit - sc;
  var jc = Math.min(remain, Math.min(residentTax, 9.75));
  return {shotokuCredit:Math.round(sc*100)/100, juminCredit:Math.round(jc*100)/100};
}

/* ==========================================================
 *  7. 一人分のフル計算
 * ========================================================== */
function taxCalcPerson(gross, deductions, loanBal){
  // deductions: {shotoku: 所得税用控除合計, jumin: 住民税用控除合計}
  var kyuyoDed = taxKyuyoDeduction(gross);
  var shotokuAmount = gross - kyuyoDed;  // 給与所得
  if(shotokuAmount<0) shotokuAmount=0;

  var socialIns = taxSocialIns(gross);
  var socialDetail = taxSocialInsDetail(gross);

  // 課税所得（所得税用）
  var kiso_s = 58;  // 基礎控除（所得税）恒久改正: 48→58万
  var taxableS = shotokuAmount - socialIns - kiso_s - (deductions?deductions.shotoku:0);
  if(taxableS<0) taxableS=0;

  // 課税所得（住民税用）
  var kiso_j = 43;  // 基礎控除（住民税）据え置き
  var taxableJ = shotokuAmount - socialIns - kiso_j - (deductions?deductions.jumin:0);
  if(taxableJ<0) taxableJ=0;

  var incomeTax  = taxIncomeTax(taxableS);
  var residentTax= taxResidentTax(taxableJ);

  // 住宅ローン控除
  var lc = taxLoanCredit(loanBal||0, incomeTax, residentTax);
  incomeTax  = Math.max(0, incomeTax  - lc.shotokuCredit);
  residentTax= Math.max(0, residentTax - lc.juminCredit);

  // 端数処理（百円未満切捨て → 万円単位で小数2桁）
  incomeTax   = Math.round(incomeTax*100)/100;
  residentTax = Math.round(residentTax*100)/100;

  var totalTax = incomeTax + residentTax + socialIns;
  var tedori = gross - totalTax;

  return {
    gross: gross,
    kyuyoDed: kyuyoDed,
    shotokuAmount: shotokuAmount,
    socialIns: socialIns,
    socialDetail: socialDetail,
    kisoS: kiso_s,
    kisoJ: kiso_j,
    taxableS: Math.round(taxableS*100)/100,
    taxableJ: Math.round(taxableJ*100)/100,
    incomeTax: incomeTax,
    residentTax: residentTax,
    loanCredit: lc,
    totalTax: Math.round(totalTax*100)/100,
    tedori: Math.round(tedori*100)/100
  };
}

/* ==========================================================
 *  CF表から子どもの年齢を取得
 * ========================================================== */
function _taxGetChildAges(){
  var ages=[];
  for(var i=1;i<=5;i++){
    var el=document.getElementById('ca-'+i);
    if(el && el.value) ages.push(parseInt(el.value)||0);
  }
  return ages;
}

/* ==========================================================
 *  renderTaxTab() — タブ描画
 * ========================================================== */
function renderTaxTab(){
  var rb=$('right-body');
  if(!rb) return;

  // 状態を復元
  var hG = _taxState.hGross || '';
  var wG = _taxState.wGross || '';
  var lb = _taxState.loanBal || '';
  var detOpen = _taxState.detailOpen;

  // 計算実行
  var hGross = parseFloat(hG)||0;
  var wGross = parseFloat(wG)||0;
  var loanBal = parseFloat(lb)||0;

  // 子どもの年齢
  var childAges = _taxGetChildAges();

  // 配偶者控除判定（ご主人様視点）
  var hIncome = hGross - taxKyuyoDeduction(hGross);
  var wIncome = wGross - taxKyuyoDeduction(wGross);
  var spDed = taxSpouseDeduction(hIncome, wIncome);

  // 扶養控除（ご主人様に帰属）
  var depDed = taxDependentDeduction(childAges);

  // ご主人様の控除合計
  var hDed = {
    shotoku: spDed.shotoku + depDed.shotoku,
    jumin: spDed.jumin + depDed.jumin
  };

  // 奥様の控除（配偶者・扶養なし）
  var wDed = {shotoku:0, jumin:0};

  var hR = taxCalcPerson(hGross, hDed, loanBal);
  var wR = taxCalcPerson(wGross, wDed, 0);

  // 世帯合計
  var famTedori = hR.tedori + wR.tedori;
  var famTax    = hR.totalTax + wR.totalTax;

  // ===== HTML生成 =====
  var html = '';
  html += '<div style="padding:20px;max-width:760px;margin:0 auto">';
  html += '<h2 style="margin:0 0 4px;font-size:18px;color:#e0e0e0">🧮 税金シミュレーター</h2>';
  html += '<div style="font-size:11px;color:#888;margin-bottom:16px">令和7年度 恒久制度基準（一時的上乗せ措置は適用外）</div>';

  // --- 入力エリア ---
  html += '<div style="background:rgba(255,255,255,.06);border-radius:10px;padding:16px;margin-bottom:16px">';
  html += '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end">';
  html += '<div><label style="font-size:12px;color:#aaa">ご主人様 額面年収</label><br>';
  html += '<input id="tax-h-gross" type="number" value="'+hG+'" placeholder="600" style="width:120px;padding:6px 8px;border-radius:6px;border:1px solid #555;background:#1a1a2e;color:#fff;font-size:14px;text-align:right" oninput="_taxOnInput()"> <span style="font-size:13px;color:#aaa">万円</span></div>';
  html += '<div><label style="font-size:12px;color:#aaa">奥様 額面年収</label><br>';
  html += '<input id="tax-w-gross" type="number" value="'+wG+'" placeholder="200" style="width:120px;padding:6px 8px;border-radius:6px;border:1px solid #555;background:#1a1a2e;color:#fff;font-size:14px;text-align:right" oninput="_taxOnInput()"> <span style="font-size:13px;color:#aaa">万円</span></div>';
  html += '<div><label style="font-size:12px;color:#aaa">住宅ローン年末残高</label><br>';
  html += '<input id="tax-loan-bal" type="number" value="'+lb+'" placeholder="0" style="width:120px;padding:6px 8px;border-radius:6px;border:1px solid #555;background:#1a1a2e;color:#fff;font-size:14px;text-align:right" oninput="_taxOnInput()"> <span style="font-size:13px;color:#aaa">万円</span></div>';
  html += '<button onclick="_taxFromCF()" style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:7px 14px;font-size:12px;cursor:pointer;font-weight:600">CF表から取得</button>';
  html += '</div>';

  // 控除情報
  html += '<div style="margin-top:10px;font-size:11px;color:#888">';
  if(childAges.length){
    html += '👶 子ども: ' + childAges.map(function(a){return a+'歳';}).join(', ');
    var depKids = childAges.filter(function(a){return a>=16;});
    if(depKids.length) html += '（扶養控除対象: '+depKids.length+'人）';
    else html += '（16歳未満: 扶養控除対象外）';
  }
  if(spDed.shotoku>0) html += ' ｜ 配偶者控除: '+spDed.shotoku+'万円';
  if(loanBal>0) html += ' ｜ 住宅ローン控除: '+ri(loanBal*0.007)+'万円';
  html += '</div>';
  html += '</div>';

  // --- 結果テーブル ---
  if(hGross>0 || wGross>0){
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">';
    html += '<thead><tr style="background:rgba(255,255,255,.08)">';
    html += '<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #444;color:#aaa;font-weight:600"></th>';
    if(hGross>0) html += '<th style="text-align:right;padding:8px 10px;border-bottom:2px solid #444;color:#7dd3fc;font-weight:600;min-width:100px">ご主人様</th>';
    if(wGross>0) html += '<th style="text-align:right;padding:8px 10px;border-bottom:2px solid #444;color:#f9a8d4;font-weight:600;min-width:100px">奥様</th>';
    if(hGross>0&&wGross>0) html += '<th style="text-align:right;padding:8px 10px;border-bottom:2px solid #444;color:#fcd34d;font-weight:600;min-width:100px">世帯合計</th>';
    html += '</tr></thead><tbody>';

    var rows = [
      {label:'額面年収', hv:hR.gross, wv:wR.gross, fv:hR.gross+wR.gross, cls:''},
      {label:'給与所得控除', hv:hR.kyuyoDed, wv:wR.kyuyoDed, fv:null, cls:'dim'},
      {label:'給与所得', hv:hR.shotokuAmount, wv:wR.shotokuAmount, fv:null, cls:''},
      {label:'社会保険料', hv:hR.socialIns, wv:wR.socialIns, fv:hR.socialIns+wR.socialIns, cls:'red'},
      {label:'所得税', hv:hR.incomeTax, wv:wR.incomeTax, fv:hR.incomeTax+wR.incomeTax, cls:'red'},
      {label:'住民税', hv:hR.residentTax, wv:wR.residentTax, fv:hR.residentTax+wR.residentTax, cls:'red'},
      {label:'税・社保 合計', hv:hR.totalTax, wv:wR.totalTax, fv:famTax, cls:'red bold'},
      {label:'手取り（年額）', hv:hR.tedori, wv:wR.tedori, fv:famTedori, cls:'green bold'},
      {label:'手取り（月額）', hv:ri(hR.tedori/12), wv:ri(wR.tedori/12), fv:ri(famTedori/12), cls:'green'},
      {label:'手取り率', hv:hGross>0?(hR.tedori/hR.gross*100).toFixed(1)+'%':'—', wv:wGross>0?(wR.tedori/wR.gross*100).toFixed(1)+'%':'—', fv:(hR.gross+wR.gross)>0?(famTedori/(hR.gross+wR.gross)*100).toFixed(1)+'%':'—', cls:'green', pct:true}
    ];

    rows.forEach(function(r){
      var bg = r.cls.indexOf('bold')>=0 ? 'background:rgba(255,255,255,.04);' : '';
      var bdr = r.label==='手取り（年額）' ? 'border-top:2px solid #555;' : 'border-bottom:1px solid rgba(255,255,255,.06);';
      html += '<tr style="'+bg+'">';
      html += '<td style="padding:6px 10px;'+bdr+'color:#ccc;font-weight:'+(r.cls.indexOf('bold')>=0?'700':'400')+'">'+r.label+'</td>';

      var colColor = function(cls){
        if(cls.indexOf('green')>=0) return '#4ade80';
        if(cls.indexOf('red')>=0) return '#f87171';
        if(cls.indexOf('dim')>=0) return '#888';
        return '#e0e0e0';
      };
      var cc = colColor(r.cls);
      var fmt = function(v){
        if(r.pct) return v;
        return typeof v==='number' ? ri(v) + ' 万' : v;
      };

      if(hGross>0) html += '<td style="text-align:right;padding:6px 10px;'+bdr+'color:'+cc+';font-weight:'+(r.cls.indexOf('bold')>=0?'700':'400')+'">'+fmt(r.hv)+'</td>';
      if(wGross>0) html += '<td style="text-align:right;padding:6px 10px;'+bdr+'color:'+cc+';font-weight:'+(r.cls.indexOf('bold')>=0?'700':'400')+'">'+fmt(r.wv)+'</td>';
      if(hGross>0&&wGross>0&&r.fv!==null) html += '<td style="text-align:right;padding:6px 10px;'+bdr+'color:'+cc+';font-weight:'+(r.cls.indexOf('bold')>=0?'700':'400')+'">'+fmt(r.fv)+'</td>';
      else if(hGross>0&&wGross>0&&r.fv===null) html += '<td style="text-align:right;padding:6px 10px;'+bdr+'color:#666">—</td>';
      html += '</tr>';
    });

    html += '</tbody></table>';

    // --- 控除明細（折り畳み） ---
    html += '<details '+(detOpen?'open ':'')+' ontoggle="_taxState.detailOpen=this.open" style="margin-bottom:16px">';
    html += '<summary style="cursor:pointer;font-size:13px;color:#aaa;font-weight:600;padding:8px 0">▶ 控除・社保の明細</summary>';
    html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">';

    // 所得控除明細
    var detailCard = function(title, color, items){
      var c = '<div style="flex:1;min-width:220px;background:rgba(255,255,255,.04);border-radius:8px;padding:12px">';
      c += '<div style="font-size:12px;font-weight:700;color:'+color+';margin-bottom:8px">'+title+'</div>';
      items.forEach(function(it){
        if(it.v===0 && !it.show) return;
        c += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#bbb;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)">';
        c += '<span>'+it.label+'</span><span style="color:'+(it.color||'#e0e0e0')+'">'+it.v+' 万</span></div>';
      });
      c += '</div>';
      return c;
    };

    if(hGross>0){
      html += detailCard('ご主人様 所得控除（所得税用）','#7dd3fc',[
        {label:'基礎控除', v:hR.kisoS},
        {label:'社会保険料控除', v:ri(hR.socialIns)},
        {label:'配偶者控除/特別控除', v:spDed.shotoku, show:wGross>0},
        {label:'扶養控除', v:depDed.shotoku, show:depDed.shotoku>0},
        {label:'課税所得', v:ri(hR.taxableS), color:'#fcd34d'}
      ]);
      html += detailCard('ご主人様 社会保険料内訳','#7dd3fc',[
        {label:'健康保険 (5.0%)', v:ri(hR.socialDetail.kenpo), show:true},
        {label:'厚生年金 (9.15%)', v:ri(hR.socialDetail.nenkin), show:true},
        {label:'雇用保険 (0.6%)', v:ri(hR.socialDetail.koyou), show:true},
        {label:'合計', v:ri(hR.socialDetail.total), color:'#f87171', show:true}
      ]);
    }
    if(wGross>0){
      html += detailCard('奥様 所得控除（所得税用）','#f9a8d4',[
        {label:'基礎控除', v:wR.kisoS},
        {label:'社会保険料控除', v:ri(wR.socialIns)},
        {label:'課税所得', v:ri(wR.taxableS), color:'#fcd34d'}
      ]);
      html += detailCard('奥様 社会保険料内訳','#f9a8d4',[
        {label:'健康保険 (5.0%)', v:ri(wR.socialDetail.kenpo), show:true},
        {label:'厚生年金 (9.15%)', v:ri(wR.socialDetail.nenkin), show:true},
        {label:'雇用保険 (0.6%)', v:ri(wR.socialDetail.koyou), show:true},
        {label:'合計', v:ri(wR.socialDetail.total), color:'#f87171', show:true}
      ]);
    }

    // 住宅ローン控除
    if(loanBal>0){
      var totalLC = hR.loanCredit.shotokuCredit + hR.loanCredit.juminCredit;
      html += detailCard('住宅ローン控除','#fcd34d',[
        {label:'年末残高 × 0.7%', v:ri(loanBal*0.007), show:true},
        {label:'所得税から控除', v:ri(hR.loanCredit.shotokuCredit), show:true},
        {label:'住民税から控除 (上限9.75万)', v:ri(hR.loanCredit.juminCredit), show:true},
        {label:'控除合計', v:ri(totalLC), color:'#4ade80', show:true}
      ]);
    }

    html += '</div></details>';
  } else {
    html += '<div style="text-align:center;color:#666;padding:40px 0;font-size:14px">額面年収を入力すると計算結果が表示されます</div>';
  }

  // 注記
  html += '<div style="font-size:10px;color:#555;line-height:1.6;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)">';
  html += '※ 社会保険料は協会けんぽ全国平均（折半後）で概算。厚生年金は標準報酬月額65万（年収780万）上限。<br>';
  html += '※ 復興特別所得税（×1.021）を含みます。調整控除は省略。<br>';
  html += '※ 住宅ローン控除は令和4年以降入居（年末残高×0.7%）。住民税上限9.75万円。<br>';
  html += '※ 配偶者控除は本人所得900万以下でフル適用（900万超は段階的縮小）。';
  html += '</div>';

  html += '</div>';

  rb.innerHTML = html;
}

/* ---------- 入力変更時 ---------- */
function _taxOnInput(){
  var h = $('tax-h-gross');
  var w = $('tax-w-gross');
  var l = $('tax-loan-bal');
  _taxState.hGross = h ? h.value : '';
  _taxState.wGross = w ? w.value : '';
  _taxState.loanBal = l ? l.value : '';
  renderTaxTab();
}

/* ---------- CF表から収入を取得 ---------- */
function _taxFromCF(){
  // income.jsのgetIncomeSteps()から年収を取得
  // 簡略版: 現在年の給与収入を取得
  var hInc = 0, wInc = 0;
  // ご主人様の給与
  var hSalary = $('h-salary');
  if(hSalary && hSalary.value) hInc = parseFloat(hSalary.value)||0;
  // 奥様の給与
  var wSalary = $('w-salary');
  if(wSalary && wSalary.value) wInc = parseFloat(wSalary.value)||0;

  _taxState.hGross = hInc ? String(hInc) : '';
  _taxState.wGross = wInc ? String(wInc) : '';

  // 住宅ローン残高は住宅セクションから
  // Phase2以降で実装

  renderTaxTab();
}
