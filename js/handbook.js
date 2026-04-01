// handbook.js — FP手帳（制度・税率早見表）

const HB_MEMO_KEY = 'cf_handbook_memo';

function openHandbook(tabId) {
  document.getElementById('handbook-modal')?.remove();

  const tabs = [
    { id: 'income-tax',    label: '所得税・住民税' },
    { id: 'social-ins',    label: '社会保険料' },
    { id: 'deduction',     label: '所得控除' },
    { id: 'retirement',    label: '退職所得' },
    { id: 'loan-ctrl',     label: '住宅ローン控除' },
    { id: 'pension',       label: '年金' },
    { id: 'inheritance',   label: '相続税・贈与税' },
    { id: 'hb-memo',       label: 'メモ' },
  ];
  const activeTab = tabId || 'income-tax';
  const savedMemo = localStorage.getItem(HB_MEMO_KEY) || '';

  const modal = document.createElement('div');
  modal.id = 'handbook-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(10,30,60,.55);z-index:8500;display:flex;align-items:center;justify-content:center;padding:12px';

  const navHtml = tabs.map(t =>
    `<button onclick="hbSwitchTab('${t.id}')" id="hbtab-${t.id}"
      style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:12px;font-weight:600;
      border:none;border-radius:6px;cursor:pointer;font-family:inherit;margin-bottom:2px;
      background:${t.id===activeTab?'#1e3a5f':'transparent'};
      color:${t.id===activeTab?'#fff':'#475569'}"
    >${t.label}</button>`
  ).join('');

  modal.innerHTML = `
    <div style="background:#fff;border-radius:14px;width:900px;max-width:98vw;height:85vh;max-height:85vh;
      box-shadow:0 24px 64px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden">
      <!-- ヘッダー -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;
        background:#1e3a5f;border-radius:14px 14px 0 0">
        <div style="font-weight:800;font-size:15px;color:#fff">📖 FP手帳</div>
        <button onclick="document.getElementById('handbook-modal').remove()"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px">✕</button>
      </div>
      <!-- ボディ -->
      <div style="display:flex;flex:1;overflow:hidden">
        <!-- 左ナビ -->
        <div style="width:130px;min-width:130px;background:#f8fafc;border-right:1px solid #e2e8f0;padding:10px 8px;overflow-y:auto">
          ${navHtml}
        </div>
        <!-- コンテンツ -->
        <div id="hb-content" style="flex:1;overflow-y:auto;padding:20px 24px;font-size:12px;line-height:1.7;color:#1e293b">
          ${hbContent(activeTab, savedMemo)}
        </div>
      </div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function hbSwitchTab(tabId) {
  // ナビボタンのスタイル更新
  document.querySelectorAll('[id^="hbtab-"]').forEach(btn => {
    const isActive = btn.id === `hbtab-${tabId}`;
    btn.style.background = isActive ? '#1e3a5f' : 'transparent';
    btn.style.color = isActive ? '#fff' : '#475569';
  });
  const savedMemo = localStorage.getItem(HB_MEMO_KEY) || '';
  document.getElementById('hb-content').innerHTML = hbContent(tabId, savedMemo);
}

function hbSaveMemo() {
  const v = document.getElementById('hb-memo-area')?.value || '';
  localStorage.setItem(HB_MEMO_KEY, v);
}

// ===== コンテンツ生成 =====
function hbContent(tabId, savedMemo) {
  switch (tabId) {
    case 'income-tax':  return hbIncomeTax();
    case 'social-ins':  return hbSocialIns();
    case 'deduction':   return hbDeduction();
    case 'retirement':  return hbRetirement();
    case 'loan-ctrl':   return hbLoanCtrl();
    case 'pension':      return hbPension();
    case 'inheritance':  return hbInheritance();
    case 'hb-memo':      return hbMemo(savedMemo);
    default: return '';
  }
}

// ===== ユーティリティ =====
function hbH(text) {
  return `<div style="font-size:14px;font-weight:800;color:#1e3a5f;border-left:4px solid #2d7dd2;
    padding:4px 0 4px 10px;margin:18px 0 10px">${text}</div>`;
}
function hbH2(text) {
  return `<div style="font-size:12px;font-weight:700;color:#334155;margin:14px 0 6px;padding-bottom:4px;
    border-bottom:1px solid #e2e8f0">${text}</div>`;
}
function hbNote(text) {
  return `<div style="background:#fffbf5;border-left:3px solid #f59e0b;padding:8px 12px;
    margin:8px 0;font-size:11px;color:#78350f;border-radius:0 6px 6px 0">${text}</div>`;
}
function hbTable(headers, rows, colWidths) {
  const ths = headers.map((h, i) =>
    `<th style="background:#1e3a5f;color:#fff;padding:6px 10px;text-align:center;font-size:11px;
      white-space:nowrap;${colWidths?.[i]?'width:'+colWidths[i]:''}">${h}</th>`
  ).join('');
  const trs = rows.map((row, ri) =>
    `<tr style="background:${ri%2===0?'#f8fafc':'#fff'}">`+
    row.map((cell, ci) =>
      `<td style="padding:5px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;
        text-align:${ci===0?'left':'right'};white-space:nowrap">${cell}</td>`
    ).join('')+`</tr>`
  ).join('');
  return `<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;width:100%">
    <thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
}

// ===== ① 所得税・住民税 =====
function hbIncomeTax() {
  return hbH('所得税・住民税') +
  hbH2('所得税 速算表（2025年度）') +
  hbTable(
    ['課税所得金額','税率','控除額'],
    [
      ['195万円以下', '5%', '0円'],
      ['195万円超 〜 330万円以下', '10%', '97,500円'],
      ['330万円超 〜 695万円以下', '20%', '427,500円'],
      ['695万円超 〜 900万円以下', '23%', '636,000円'],
      ['900万円超 〜 1,800万円以下', '33%', '1,536,000円'],
      ['1,800万円超 〜 4,000万円以下', '40%', '2,796,000円'],
      ['4,000万円超', '45%', '4,796,000円'],
    ]
  ) +
  hbNote('所得税額 ＝ 課税所得 × 税率 − 控除額　（復興特別所得税 2.1% を加算）') +

  hbH2('住民税') +
  `<div style="margin:6px 0">
    <span style="background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:4px;font-weight:700;font-size:11px">所得割：一律 10%</span>
    <span style="display:inline-block;margin-left:8px;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:4px;font-weight:700;font-size:11px">均等割：5,000円（令和6年度〜：森林環境税1,000円含む）</span>
  </div>` +
  hbNote('住民税の課税所得は所得税とほぼ同じだが、基礎控除が43万円（所得税は48万円）') +

  hbH2('給与所得控除額（2020年以降）') +
  hbTable(
    ['給与等の収入金額', '給与所得控除額'],
    [
      ['162.5万円以下', '55万円'],
      ['162.5万円超 〜 180万円以下', '収入 × 40% − 10万円'],
      ['180万円超 〜 360万円以下', '収入 × 30% + 8万円'],
      ['360万円超 〜 660万円以下', '収入 × 20% + 44万円'],
      ['660万円超 〜 850万円以下', '収入 × 10% + 110万円'],
      ['850万円超', '195万円（上限）'],
    ]
  ) +

  hbH2('実効税率の目安（給与収入ベース・社会保険料控除後）') +
  hbTable(
    ['年収（目安）', '所得税', '住民税', '合計'],
    [
      ['400万円', '約3〜4%', '約7%', '約10〜11%'],
      ['500万円', '約5〜6%', '約8%', '約13〜14%'],
      ['700万円', '約9〜11%', '約9%', '約18〜20%'],
      ['1,000万円', '約15〜17%', '約10%', '約25〜27%'],
      ['1,500万円', '約22〜25%', '約10%', '約32〜35%'],
    ]
  ) +
  hbNote('上記は概算。社会保険料・各種控除により実際の税額は異なります。');
}

// ===== ② 社会保険料 =====
function hbSocialIns() {
  return hbH('社会保険料（2025年度）') +

  hbH2('健康保険（協会けんぽ・全国平均）') +
  hbTable(
    ['区分', '本人負担率', '会社負担率', '合計'],
    [
      ['健康保険', '4.90%', '4.90%', '9.80%'],
      ['介護保険（40〜64歳）', '0.90%', '0.90%', '1.80%'],
    ]
  ) +
  hbNote('都道府県により料率が異なります。東京：本人9.98%（介護含む）÷2=4.99%（2024年度）') +

  hbH2('厚生年金保険') +
  hbTable(
    ['区分', '本人負担率', '会社負担率', '合計'],
    [['厚生年金', '9.15%', '9.15%', '18.30%']]
  ) +
  hbNote('標準報酬月額の上限：65万円（第32等級）/ 下限：8.8万円') +

  hbH2('雇用保険（一般の事業）') +
  hbTable(
    ['区分', '労働者負担', '事業主負担'],
    [['雇用保険料率', '0.6%', '0.95%']]
  ) +

  hbH2('国民健康保険・国民年金（自営業・フリーランス）') +
  `<ul style="margin:6px 0;padding-left:20px;color:#334155;font-size:12px">
    <li style="margin-bottom:4px"><b>国民健康保険</b>：所得・資産割等により市区町村ごとに異なる</li>
    <li style="margin-bottom:4px"><b>国民年金保険料</b>：<b>月額 16,980円</b>（2025年度）</li>
    <li><b>付加年金</b>：月額400円を加算→受給時に毎年「200円×納付月数」加算</li>
  </ul>` +

  hbH2('社会保険料の概算（給与収入別）') +
  hbTable(
    ['月収（目安）', '健保+介護', '厚年', '雇用', '本人負担合計（月額）'],
    [
      ['25万円', '約12,250円', '約22,875円', '約1,500円', '約36,625円'],
      ['30万円', '約14,700円', '約27,450円', '約1,800円', '約43,950円'],
      ['40万円', '約19,600円', '約36,600円', '約2,400円', '約58,600円'],
      ['50万円', '約24,500円', '約45,750円', '約3,000円', '約73,250円'],
      ['65万円（上限）', '約31,850円', '約59,475円', '約3,900円', '約95,225円'],
    ]
  ) +
  hbNote('健保は協会けんぽ全国平均（介護40歳以上）で試算。実際の料率を確認してください。');
}

// ===== ③ 所得控除 =====
function hbDeduction() {
  return hbH('所得控除 一覧（2025年度）') +

  hbH2('人的控除') +
  hbTable(
    ['控除の種類', '所得税', '住民税', '備考'],
    [
      ['基礎控除', '48万円', '43万円', '合計所得2,400万円超で逓減、2,500万円超は0'],
      ['配偶者控除（一般）', '38万円', '33万円', '配偶者の合計所得48万円以下（給与収入103万円以下）'],
      ['配偶者控除（老人）', '48万円', '38万円', '配偶者が70歳以上'],
      ['配偶者特別控除', '1〜38万円', '1〜33万円', '配偶者の合計所得48万超〜133万円以下'],
      ['扶養控除（一般）', '38万円', '33万円', '16歳以上の扶養親族'],
      ['扶養控除（特定）', '63万円', '45万円', '19〜22歳の扶養親族'],
      ['扶養控除（老人同居）', '58万円', '45万円', '70歳以上・同居老親等'],
      ['扶養控除（老人別居）', '48万円', '38万円', '70歳以上・その他'],
      ['障害者控除', '27万円', '26万円', '特別障害者：40万円（住民税30万円）'],
      ['寡婦控除', '27万円', '26万円', ''],
      ['ひとり親控除', '35万円', '30万円', '未婚・死別・離別のひとり親'],
      ['勤労学生控除', '27万円', '26万円', ''],
    ]
  ) +

  hbH2('物的控除') +
  hbTable(
    ['控除の種類', '控除額', '備考'],
    [
      ['社会保険料控除', '全額', '支払った社会保険料の全額'],
      ['生命保険料控除', '最大12万円', '新制度：一般・介護・個人年金 各4万円（所得税）'],
      ['地震保険料控除', '最大5万円', '旧長期損害保険は最大1.5万円'],
      ['小規模企業共済等掛金控除', '全額', 'iDeCo・小規模企業共済等の掛金全額'],
      ['医療費控除', '最大200万円', '（医療費−10万円）または（医療費−総所得×5%）'],
      ['セルフメディケーション税制', '最大8.8万円', '対象OTC薬購入費−1.2万円。医療費控除との選択制'],
      ['雑損控除', '損害額−総所得×10%等', '災害・盗難等による損失'],
      ['寄附金控除（所得控除）', '寄附額−2,000円', 'ふるさと納税等。税額控除との選択制'],
      ['住宅借入金等特別控除', '別表参照', '住宅ローン控除タブを参照'],
    ]
  ) +

  hbH2('生命保険料控除 詳細（新制度・所得税）') +
  hbTable(
    ['年間払込保険料', '控除額'],
    [
      ['2万円以下', '払込保険料全額'],
      ['2万円超 〜 4万円以下', '払込保険料 × 1/2 + 1万円'],
      ['4万円超 〜 8万円以下', '払込保険料 × 1/4 + 2万円'],
      ['8万円超', '4万円（上限）'],
    ]
  ) +
  hbNote('一般生命保険料・介護医療保険料・個人年金保険料の各区分ごとに上限4万円、合計最大12万円（所得税）') +

  hbH2('扶養の判定基準（給与収入の場合）') +
  `<ul style="margin:6px 0;padding-left:20px;font-size:12px">
    <li style="margin-bottom:3px">扶養控除（所得税）：<b>合計所得48万円以下</b>＝給与収入 <b>103万円以下</b></li>
    <li style="margin-bottom:3px">配偶者控除（所得税）：<b>合計所得48万円以下</b>＝給与収入 <b>103万円以下</b></li>
    <li style="margin-bottom:3px">配偶者特別控除：配偶者の合計所得 <b>48万円超〜133万円以下</b>（給与収入103万超〜201.6万円以下）</li>
    <li>社会保険の扶養（130万円の壁）：<b>年収130万円未満</b>（被保険者の健保組合による）</li>
  </ul>`;
}

// ===== ④ 退職所得 =====
function hbRetirement() {
  return hbH('退職所得控除・退職所得の計算') +

  hbH2('退職所得控除額') +
  hbTable(
    ['勤続年数', '退職所得控除額'],
    [
      ['20年以下', '40万円 × 勤続年数　（最低80万円）'],
      ['20年超', '800万円 + 70万円 × （勤続年数 − 20年）'],
    ]
  ) +
  hbNote('勤続年数は1年未満の端数を切り上げ（例：20年3ヶ月→21年）') +

  hbH2('退職所得金額・税額の計算式') +
  `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:12px">
    <div style="margin-bottom:6px">① 退職所得 ＝ <b>（退職金 − 退職所得控除額）× 1/2</b></div>
    <div style="margin-bottom:6px">② 所得税 ＝ 退職所得 × 所得税率 − 控除額　（通常の所得税速算表を適用）</div>
    <div>③ 住民税 ＝ 退職所得 × 10%</div>
  </div>` +
  hbNote('役員退職金の場合、勤続5年以内は1/2課税の優遇なし（令和4年〜）') +

  hbH2('退職所得控除 簡易シミュレーター') +
  `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:8px 0">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">勤続年数</label>
        <div style="display:flex;align-items:center;gap:6px">
          <input id="hb-ret-yrs" type="number" value="30" min="1" max="60"
            style="width:70px;padding:6px 8px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:13px;font-family:inherit"
            oninput="hbCalcRetirement()">
          <span style="font-size:12px;color:#64748b">年</span>
        </div>
      </div>
      <div>
        <label style="font-size:11px;font-weight:600;color:#64748b;display:block;margin-bottom:4px">退職金額</label>
        <div style="display:flex;align-items:center;gap:6px">
          <input id="hb-ret-amt" type="number" value="2000" min="0"
            style="width:90px;padding:6px 8px;border:1.5px solid #cbd5e1;border-radius:6px;font-size:13px;font-family:inherit"
            oninput="hbCalcRetirement()">
          <span style="font-size:12px;color:#64748b">万円</span>
        </div>
      </div>
    </div>
    <div id="hb-ret-result" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px">
      計算中...
    </div>
  </div>` +
  `<script>setTimeout(hbCalcRetirement, 100);</script>`;
}

function hbCalcRetirement() {
  const yrs = parseInt(document.getElementById('hb-ret-yrs')?.value) || 0;
  const amt = parseFloat(document.getElementById('hb-ret-amt')?.value) || 0;
  const el = document.getElementById('hb-ret-result');
  if (!el) return;

  // 退職所得控除
  const yrsUp = Math.ceil(yrs);
  let ded = yrsUp <= 20 ? Math.max(80, 40 * yrsUp) : 800 + 70 * (yrsUp - 20);

  // 退職所得
  const taxableBase = Math.max(0, amt - ded);
  const taxable = Math.floor(taxableBase / 2);

  // 所得税（速算表）
  const TAX_TABLE = [
    [195, 0.05, 0], [330, 0.10, 9.75], [695, 0.20, 42.75],
    [900, 0.23, 63.6], [1800, 0.33, 153.6], [4000, 0.40, 279.6], [Infinity, 0.45, 479.6]
  ];
  let incomeTax = 0;
  for (const [limit, rate, ded2] of TAX_TABLE) {
    if (taxable <= limit) { incomeTax = Math.floor(taxable * rate - ded2); break; }
  }
  incomeTax = Math.max(0, Math.round(incomeTax * 1.021)); // 復興税
  const residentTax = Math.round(taxable * 0.1);
  const totalTax = incomeTax + residentTax;
  const takeHome = amt - totalTax / 100; // 万円ベース
  const taxRate = amt > 0 ? (totalTax / (amt * 100) * 100).toFixed(1) : 0;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
      <div style="background:#eff6ff;border-radius:6px;padding:8px">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px">退職所得控除額</div>
        <div style="font-size:15px;font-weight:800;color:#1e3a5f">${ded.toLocaleString()}<span style="font-size:10px;font-weight:400">万円</span></div>
      </div>
      <div style="background:#f0fdf4;border-radius:6px;padding:8px">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px">課税退職所得</div>
        <div style="font-size:15px;font-weight:800;color:#166534">${taxable.toLocaleString()}<span style="font-size:10px;font-weight:400">万円</span></div>
      </div>
      <div style="background:#fff7ed;border-radius:6px;padding:8px">
        <div style="font-size:10px;color:#64748b;margin-bottom:2px">税金合計（実効${taxRate}%）</div>
        <div style="font-size:15px;font-weight:800;color:#c2410c">${(totalTax/10000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,',')}万<span style="font-size:9px;font-weight:400">${totalTax.toLocaleString()}円</span></div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#64748b;text-align:right">
      所得税（復興税込）：${(incomeTax/10000).toFixed(1)}万円　住民税：${(residentTax/10000).toFixed(1)}万円　手取り：約${(amt - totalTax/10000).toFixed(0)}万円
    </div>`;
}

// ===== ⑤ 住宅ローン控除 =====
function hbLoanCtrl() {
  return hbH('住宅ローン控除（令和6〜8年度改正対応）') +

  hbH2('借入限度額・控除期間 一覧') +
  `<div style="overflow-x:auto;margin:8px 0">
  <table style="border-collapse:collapse;width:100%;font-size:11px">
    <thead>
      <tr style="background:#1e3a5f;color:#fff">
        <th style="padding:6px 8px;text-align:left" rowspan="2">住宅の区分</th>
        <th style="padding:6px 8px;text-align:center" colspan="2">2024〜2025年入居</th>
        <th style="padding:6px 8px;text-align:center" colspan="2">2026〜2027年入居</th>
        <th style="padding:6px 8px;text-align:center" colspan="2">2028〜2030年入居</th>
      </tr>
      <tr style="background:#2d5282;color:#fff">
        <th style="padding:4px 8px;text-align:center">限度額</th><th style="padding:4px 8px;text-align:center">期間</th>
        <th style="padding:4px 8px;text-align:center">限度額</th><th style="padding:4px 8px;text-align:center">期間</th>
        <th style="padding:4px 8px;text-align:center">限度額</th><th style="padding:4px 8px;text-align:center">期間</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ['新築：長期優良・低炭素', '5,000', '13', '5,000', '13', '4,500', '13'],
        ['新築：ZEH水準省エネ', '4,500', '13', '4,500', '13', '3,500', '13'],
        ['新築：省エネ基準適合', '4,000', '13', '3,000', '13', '2,000', '10'],
        ['新築：一般（省エネ基準不適合）', '−', '−', '−', '−', '−', '−'],
        ['中古：長期優良・ZEH・省エネ', '2,000', '10', '4,500', '13', '3,500', '13'],
        ['中古：一般（認定外）', '2,000', '10', '2,000', '10', '2,000', '10'],
      ].map((r,i)=>`<tr style="background:${i%2===0?'#f8fafc':'#fff'}">
        <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0">${r[0]}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:${r[1]==='−'?'#94a3b8':'#1e3a5f'}">${r[1]==='−'?r[1]:r[1]+'万円'}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0">${r[2]==='−'?r[2]:r[2]+'年'}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:${r[3]==='−'?'#94a3b8':'#1e3a5f'}">${r[3]==='−'?r[3]:r[3]+'万円'}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0">${r[4]==='−'?r[4]:r[4]+'年'}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0;font-weight:700;color:${r[5]==='−'?'#94a3b8':'#1e3a5f'}">${r[5]==='−'?r[5]:r[5]+'万円'}</td>
        <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e2e8f0">${r[6]==='−'?r[6]:r[6]+'年'}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>` +
  hbNote('2024〜2025年の子育て・若者夫婦世帯（年齢・扶養要件あり）：新築ZEH→4,500万、省エネ→4,000万、長期優良→5,000万') +
  hbNote('2026〜2030年の子育て・若者夫婦世帯：新築ZEH→4,500万、省エネ→3,000万、長期優良→5,000万、中古省エネ→4,500万') +

  hbH2('控除率・主な要件') +
  hbTable(
    ['項目', '内容'],
    [
      ['控除率', '年末ローン残高の 0.7%'],
      ['所得要件', '合計所得 2,000万円以下（配偶者取得も同様）'],
      ['床面積', '50㎡以上（新築所得1,000万円以下は40㎡以上）'],
      ['居住要件', '取得後6ヶ月以内に居住、年末まで継続居住'],
      ['中古の築年数', '1982年以降建築（昭和57年以降）または耐震基準適合'],
      ['繰り上げ返済', '残高が10年以上残る場合は控除対象を維持'],
    ]
  );
}

// ===== ⑥ 年金 =====
function hbPension() {
  return hbH('公的年金（2025年度）') +

  hbH2('老齢基礎年金（国民年金）') +
  hbTable(
    ['項目', '内容'],
    [
      ['満額（40年加入）', '816,000円／年（68,000円／月）※2025年度'],
      ['計算式', '816,000円 × 保険料納付月数 ÷ 480ヶ月'],
      ['受給開始', '原則65歳（60〜75歳の間で繰上げ・繰下げ可能）'],
      ['繰上げ受給', '1ヶ月繰上げごとに 0.4% 減額（最大 24% 減）'],
      ['繰下げ受給', '1ヶ月繰下げごとに 0.7% 増額（最大 84% 増、75歳）'],
    ]
  ) +

  hbH2('老齢厚生年金（報酬比例部分）') +
  `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:12px">
    <b>年金額 ＝ 平均標準報酬額 × 5.481/1000 × 厚生年金加入月数</b>
    <div style="margin-top:6px;font-size:11px;color:#475569">
      ※ 2003年3月以前の期間は平均標準報酬月額 × 7.125/1000 を使用<br>
      ※ 平均標準報酬額：賞与含む全加入期間の報酬を現役期間で割ったもの
    </div>
  </div>` +

  hbH2('在職老齢年金（65歳以上）') +
  hbTable(
    ['項目', '内容'],
    [
      ['支給停止基準額', '月50万円（2024年度・年金月額＋給与月額の合計）'],
      ['停止額の計算', '（年金月額 + 総報酬月額 − 50万円）× 1/2 を停止'],
    ]
  ) +

  hbH2('遺族年金') +
  hbTable(
    ['種類', '受給要件・金額'],
    [
      ['遺族基礎年金', '18歳未満の子がいる配偶者・子。816,000円＋子の加算（234,800円/人）'],
      ['遺族厚生年金', '厚生年金加入中に死亡。老齢厚生年金の報酬比例部分 × 3/4'],
      ['中高齢寡婦加算', '40〜65歳の妻（子なし等）。612,000円／年（2025年度）'],
    ]
  ) +

  hbH2('障害年金') +
  hbTable(
    ['種類', '金額（2025年度）'],
    [
      ['障害基礎年金 1級', '1,020,000円／年（＋子の加算）'],
      ['障害基礎年金 2級', '816,000円／年（＋子の加算）'],
      ['障害厚生年金 1・2級', '老齢厚生年金の報酬比例部分 × 1.25（1級）または × 1（2級）＋ 障害基礎年金'],
      ['障害厚生年金 3級', '報酬比例部分（最低保障 612,000円）'],
    ]
  ) +

  hbH2('マクロ経済スライド') +
  hbNote('物価・賃金の伸びから「スライド調整率」を差し引いて実質的な給付水準を抑制する仕組み。年金財政の持続性を確保するために導入（2004年〜）。') +

  hbH2('年金の課税') +
  `<ul style="margin:6px 0;padding-left:20px;font-size:12px">
    <li style="margin-bottom:3px">年金は<b>雑所得</b>として課税（公的年金等控除を差し引いた残額）</li>
    <li style="margin-bottom:3px">65歳未満：公的年金等控除 60万円（110万円以下なら0）</li>
    <li>65歳以上：公的年金等控除 110万円（330万円以下なら0）</li>
  </ul>`;
}

// ===== ⑦ 相続税・贈与税 =====
function hbInheritance() {
  return hbH('相続税・贈与税（2025年度）') +

  hbH2('相続税 速算表') +
  hbTable(
    ['法定相続分に応ずる取得金額', '税率', '控除額'],
    [
      ['1,000万円以下',              '10%', '−'],
      ['1,000万円超 〜 3,000万円以下','15%', '50万円'],
      ['3,000万円超 〜 5,000万円以下','20%', '200万円'],
      ['5,000万円超 〜 1億円以下',    '30%', '700万円'],
      ['1億円超 〜 2億円以下',        '40%', '1,700万円'],
      ['2億円超 〜 3億円以下',        '45%', '2,700万円'],
      ['3億円超 〜 6億円以下',        '50%', '4,200万円'],
      ['6億円超',                    '55%', '7,200万円'],
    ]
  ) +
  `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:12px">
    <b>相続税の計算手順</b>
    <ol style="margin:6px 0 0;padding-left:18px;line-height:1.9">
      <li>課税遺産総額 ＝ 正味遺産額 − 基礎控除額（3,000万円 ＋ 600万円 × 法定相続人数）</li>
      <li>各法定相続人が法定相続分で取得したと仮定して相続税の総額を計算</li>
      <li>相続税の総額を実際の取得割合で按分→各人の納付税額を算出</li>
    </ol>
  </div>` +
  hbNote('配偶者の税額軽減：配偶者が取得した財産が「1億6,000万円」または「法定相続分相当額」のいずれか多い額まで非課税') +

  hbH2('基礎控除額の目安') +
  hbTable(
    ['法定相続人の数', '基礎控除額'],
    [
      ['1人', '3,600万円'],
      ['2人', '4,200万円'],
      ['3人', '4,800万円'],
      ['4人', '5,400万円'],
      ['5人', '6,000万円'],
    ]
  ) +

  hbH2('主な相続税の非課税・特例') +
  hbTable(
    ['特例・非課税', '内容'],
    [
      ['死亡保険金の非課税', '500万円 × 法定相続人数'],
      ['死亡退職金の非課税', '500万円 × 法定相続人数'],
      ['小規模宅地等の特例（特定居住用）', '330㎡まで 80% 減額'],
      ['小規模宅地等の特例（特定事業用）', '400㎡まで 80% 減額'],
      ['小規模宅地等の特例（貸付事業用）', '200㎡まで 50% 減額'],
      ['配偶者居住権', '配偶者が自宅に終身居住できる権利'],
    ]
  ) +

  hbH2('贈与税 速算表（暦年課税・一般贈与）') +
  hbTable(
    ['基礎控除後の課税価格', '税率', '控除額'],
    [
      ['200万円以下',              '10%', '−'],
      ['200万円超 〜 300万円以下', '15%', '10万円'],
      ['300万円超 〜 400万円以下', '20%', '25万円'],
      ['400万円超 〜 600万円以下', '30%', '65万円'],
      ['600万円超 〜 1,000万円以下','40%', '125万円'],
      ['1,000万円超 〜 1,500万円以下','45%', '175万円'],
      ['1,500万円超 〜 3,000万円以下','50%', '250万円'],
      ['3,000万円超',              '55%', '400万円'],
    ]
  ) +

  hbH2('贈与税 速算表（暦年課税・特例贈与）') +
  `<div style="font-size:11px;color:#475569;margin-bottom:6px">直系尊属（父母・祖父母等）から18歳以上の子・孫への贈与</div>` +
  hbTable(
    ['基礎控除後の課税価格', '税率', '控除額'],
    [
      ['200万円以下',              '10%', '−'],
      ['200万円超 〜 400万円以下', '15%', '10万円'],
      ['400万円超 〜 600万円以下', '20%', '30万円'],
      ['600万円超 〜 1,000万円以下','30%', '90万円'],
      ['1,000万円超 〜 1,500万円以下','40%', '190万円'],
      ['1,500万円超 〜 3,000万円以下','45%', '265万円'],
      ['3,000万円超 〜 4,500万円以下','50%', '415万円'],
      ['4,500万円超',              '55%', '640万円'],
    ]
  ) +
  hbNote('贈与税の基礎控除：年間110万円（暦年課税）。2024年1月〜相続時精算課税の基礎控除も年間110万円に変更') +

  hbH2('主な贈与税の非課税制度') +
  hbTable(
    ['制度', '非課税限度額', '主な要件'],
    [
      ['暦年課税の基礎控除',     '110万円/年', '誰でも利用可。相続前3〜7年分は相続財産に加算（2024年〜順次延長）'],
      ['相続時精算課税',         '累計2,500万円', '60歳以上の父母・祖父母→18歳以上の子・孫。相続時に精算'],
      ['住宅取得等資金贈与',     '最大1,000万円', '良質な住宅：1,000万円、一般住宅：500万円（2026年末まで）'],
      ['教育資金一括贈与',       '1,500万円', '30歳未満の子・孫への教育資金（金融機関経由）'],
      ['結婚・子育て資金贈与',   '1,000万円', '18〜50歳未満への結婚・育児資金'],
      ['配偶者への居住用不動産', '2,000万円', '婚姻期間20年以上の配偶者への自宅・購入資金'],
    ]
  );
}

// ===== ⑧ メモ =====
function hbMemo(savedMemo) {
  return hbH('メモ') +
  `<div style="font-size:11px;color:#64748b;margin-bottom:8px">FP業務で使うメモを自由に記録できます。このブラウザに保存されます。</div>
  <textarea id="hb-memo-area" oninput="hbSaveMemo()" rows="20"
    style="width:100%;font-size:12px;padding:10px;border:1.5px solid #cbd5e1;border-radius:8px;
    font-family:inherit;outline:none;resize:vertical;line-height:1.7;box-sizing:border-box;color:#1e293b"
    onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#cbd5e1'"
  >${savedMemo.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>
  <div style="font-size:10px;color:#94a3b8;margin-top:4px;text-align:right">自動保存されます</div>`;
}
