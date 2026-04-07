// cf-ui.js — UI操作・ライブ更新・バリデーション
function _rl(key,def){return _cfRowLabels[key]||def;}

function toggleFinAsset(){
  finAssetVisible=!finAssetVisible;
  _applyFinAssetVisibility();
  const btn=document.getElementById('btn-fin-toggle');
  if(btn)btn.textContent=finAssetVisible?'👁 金融資産行を隠す':'👁 金融資産行を表示';
}
function _applyFinAssetVisibility(){
  document.querySelectorAll('.fin-asset-row').forEach(tr=>{
    tr.style.display=finAssetVisible?'':'none';
  });
}

// ===== 手取り計算機 開閉トグル（共通関数） =====
function toggleCalc(bodyId, btn){
  const b=document.getElementById(bodyId);
  const open=b.style.display!=='none';
  b.style.display=open?'none':'';
  btn.textContent=open?'▶ 表示':'▼ 閉じる';
}

// ===== パネル折りたたみ =====
function showHelp(){
  document.getElementById('help-modal')?.remove();
  const m=document.createElement('div');
  m.id='help-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.6);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px';
  m.onclick=e=>{if(e.target===m)m.remove()};
  const sections=[
    {title:'📖 基本操作',items:[
      '左パネルでお客様情報を入力 → 右パネルにCF表が自動生成されます',
      '下部の①〜⑨ボタンで各セクションにジャンプできます',
      '「◀ 入力を隠す」でCF表を全画面表示できます',
      'CF表のセルをダブルクリックすると値を直接編集できます（「↺ 上書きリセット」で元に戻ります）'
    ]},
    {title:'①👨‍👩‍👧 家族構成',items:[
      'お客様氏名・年齢・想定逝去年齢を入力',
      'お子様は「＋ 子どもを追加」で複数追加可能',
      '保育料は0〜6歳まで年齢ごとに入力（空欄はデフォルト値を使用）',
      '進学コース（公立/私立）を選択すると教育費が自動計算されます',
      '奨学金・結婚のお祝いも設定できます'
    ]},
    {title:'② 💰 自己資産',items:[
      '現預金（ご主人様・奥様・共有）を入力',
      '積立保険：種類（終身/養老等）、保険料、満期時期を設定',
      '財形貯蓄：現時点の残高と毎月の積立額を設定',
      '有価証券：NISA/課税、積立/一括を選択して設定'
    ]},
    {title:'③ 💰 収入設定',items:[
      '手取り計算機：額面年収から概算手取りを自動計算（参考値）',
      '収入段階：年齢に応じた収入の変化を設定（金額または割合で入力可）',
      '退職金：受取年齢と金額を設定',
      '老齢年金：加入開始年齢・受給開始年齢・年金額を設定（概算計算ボタンあり）'
    ]},
    {title:'④ 🚗 車',items:[
      '車両：継続/なし、駐車場：継続/なし を選択',
      '新車/中古、現金/ローンの選択',
      '乗り換え周期と手放す年齢を設定',
      '車検費用・駐車場代も設定可能'
    ]},
    {title:'⑤ 🏠 住宅',items:[
      'マンション/戸建てを最初に選択（修繕費の計算方法が変わります）',
      '住宅価格・頭金・諸費用を入力 → 借入金額が自動計算',
      '住宅ローン控除：入居年・住宅種別・居住属性で自動判定（自由入力も可）',
      '単独ローン/ペアローンを選択可能',
      '金利変更スケジュール：変動金利の将来の金利変更を段階的に設定'
    ]},
    {title:'⑥ 🛒 生活費',items:[
      '毎月の固定費と年間の変動費を入力',
      '合計が自動計算されCF表に反映',
      '生活費の変化設定：年齢ごとに生活費の増減率を設定可能'
    ]},
    {title:'⑦ ✏️ 修繕',items:[
      '家具家電買い替え：周期と費用を設定',
      '修繕費：2つの枠で異なる周期の修繕費を設定（例：10年ごとと30年ごと）'
    ]},
    {title:'⑧ 💸 その他支出',items:[
      '「＋ その他支出を追加」で自由に支出項目を追加',
      '開始年齢〜終了年齢、年額、項目名を設定'
    ]},
    {title:'⑨ 🛡️ 万が一',items:[
      '死亡後の生活費（割合 or 段階設定）を設定',
      '遺族年金は自動計算 or 手入力を選択',
      '「万が一CF表を生成」ボタンでシミュレーション実行',
      '生成後、上部タブに「万が一（ご主人様/奥様）」が表示されます'
    ]},
    {title:'📋 CF表タブ',items:[
      '上部のサマリーカードで総収入・総支出・最終残高・赤字年数を確認',
      '自己資金の内訳と住宅ローン条件が表示されます',
      'セルをダブルクリックで値を直接編集可能'
    ]},
    {title:'📈 グラフタブ',items:[
      '資産推移・収支バランス・支出内訳のグラフが表示されます'
    ]},
    {title:'🏦 返済計画タブ',items:[
      'ローン設定：借入額・金利・返済期間・返済方法を設定',
      '住宅ローン控除：控除率・期間・年間上限を設定（開閉可能）',
      '繰上返済：期間短縮型/返済額軽減型を選択しシミュレーション',
      'Excel出力ボタンで返済計画表をExcel出力可能'
    ]},
    {title:'💾 保存・読込',items:[
      '保存：お客様名で自動ファイル名生成。JSONファイルとしてダウンロード',
      '読込：保存したJSONファイルを選択して復元',
      '別のお客様のデータを切り替えて作業できます'
    ]},
    {title:'📊 Excel出力',items:[
      '各タブの「Excel出力」ボタンからExcelファイルを出力',
      '出力時に使用者情報（氏名・会社名・連絡先）と注意文章を入力可能',
      'CF表・万が一CF表・返済計画それぞれ個別に出力できます'
    ]}
  ];
  let h='';
  sections.forEach(s=>{
    h+=`<div style="margin-bottom:14px"><div style="font-size:13px;font-weight:800;color:var(--navy);margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid var(--border)">${s.title}</div><ul style="margin:0;padding-left:18px;list-style:disc">`;
    s.items.forEach(it=>{h+=`<li style="font-size:11px;color:var(--text);line-height:1.8;margin-bottom:2px">${it}</li>`});
    h+='</ul></div>';
  });
  m.innerHTML=`<div style="background:var(--card);border-radius:12px;max-width:680px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0">
      <span style="font-size:16px;font-weight:800;color:var(--navy)">📖 CF表作成アプリ 使い方ガイド</span>
      <button onclick="document.getElementById('help-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);padding:4px 8px">✕</button>
    </div>
    <div style="overflow-y:auto;padding:20px;-webkit-overflow-scrolling:touch">${h}</div>
    <div style="padding:12px 20px;border-top:1px solid var(--border);text-align:center;flex-shrink:0">
      <span style="font-size:10px;color:var(--muted)">Housing FP CF表作成アプリ v11</span>
    </div>
  </div>`;
  document.body.appendChild(m);
}

// ===== ライブ更新 =====
function live(force){
  clearTimeout(timer);
  const ind=document.getElementById('update-indicator');
  if(ind){ind.style.display='inline';ind.textContent='● 更新中...';}
  timer=setTimeout(()=>{
    const hash=_getInputHash();
    if(!force&&hash===_lastInputHash){
      if(ind)ind.style.display='none';
      return;
    }
    _lastInputHash=hash;
    pushUndoSnap();
    validate();updateHints();calcLC();updateEdu();render();
    document.querySelectorAll('.amt-inp').forEach(el=>{const v=el.value.trim();el.classList.toggle('is-zero',v===''||v==='0');});
    if(ind){
      ind.textContent='✓ 完了';ind.style.background='rgba(74,222,128,0.25)';ind.style.color='#4ade80';
      clearTimeout(indicatorTimer);
      indicatorTimer=setTimeout(()=>{ind.style.display='none';},1200);
    }
  },600);
}

// ===== バリデーション =====
function validate(){
  const errs=[];
  if(!_v('client-name').trim())errs.push({id:'client-name',msg:'お客様氏名を入力してください'});
  const ha=iv('husband-age');if(ha<20||ha>80)errs.push({id:'husband-age',msg:'ご主人様の年齢は20〜80歳'});
  if(fv('loan-amt')<=0)errs.push({id:'loan-amt',msg:'借入金額を入力してください'});
  // ローン完済年齢チェック（80歳超え警告）
  const loanYrsChk=iv('loan-yrs')||35;
  const deliveryChk=iv('delivery')||0;
  const loanEndAge=ha+deliveryChk+loanYrsChk;
  if(loanEndAge>80)errs.push({id:'loan-yrs',msg:`⚠️ ローン完済時${loanEndAge}歳 — 80歳を超えています（銀行審査に影響する可能性）`});
  // 収入ステップは任意入力のためvalidation省略
  document.querySelectorAll('.inp.err').forEach(e=>e.classList.remove('err'));
  const bar=$('err-bar'),lst=$('err-list');
  if(errs.length){bar.classList.add('show');lst.innerHTML=errs.map(e=>`<li>${e.msg}</li>`).join('');errs.forEach(e=>{const el=$(e.id);if(el)el.classList.add('err')})}
  else{bar.classList.remove('show');lst.innerHTML=''}
}

// ===== 右タブ切替 =====
function renderMemo(){
  const scen=scenarios.find(s=>s.id===activeScenarioId);
  const txt=scen?.memo||'';
  const rb=$('right-body');
  rb.innerHTML=`<div style="padding:16px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:700;color:var(--navy)">📝 メモ <span style="font-size:10px;font-weight:400;color:var(--muted)">${scen?.name||''}のメモ</span></div>
    <textarea id="memo-area" placeholder="自由にメモを入力できます" oninput="saveMemo()"
      style="flex:1;resize:none;border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;font-family:inherit;color:var(--navy);outline:none;line-height:1.6">${txt}</textarea>
  </div>`;
}
function saveMemo(){
  const scen=scenarios.find(s=>s.id===activeScenarioId);
  if(scen)scen.memo=$('memo-area')?.value||'';
}
function setRTab(t){
  // グラフタブの場合、直前のタブコンテキストを記憶
  if(t!=='graph')window._lastCFTab=t;
  rTab=t;
  $('rt-lctab')?.classList.toggle('on',t==='lctab');
  $('rt-graph')?.classList.toggle('on',t==='graph');
  $('rt-loan')?.classList.toggle('on',t==='loan');
  $('rt-memo')?.classList.toggle('on',t==='memo');
  $('rt-mg-h')?.classList.toggle('on',t==='mg-h');
  $('rt-mg-w')?.classList.toggle('on',t==='mg-w');
  // シナリオタブのon/offを更新
  renderScenarioTabs();
  // CF表・万が一タブのみ金融資産ボタン表示
  const finBtn=$('btn-fin-toggle');
  if(finBtn)finBtn.style.display=(t==='cf'||t==='mg-h'||t==='mg-w')?'':'none';
  if(t==='lctab'){renderLCTab();return;}
  if(t==='memo'){renderMemo();return;}
  if(t==='loan'){
    renderLoanTab();
    return;
  }
  if(t==='mg-h'||t==='mg-w'){
    const key=t==='mg-h'?'h':'w';
    const html=window._mgStore&&window._mgStore[key];
    if(html){
      const _rb=$('right-body');
      _rb.innerHTML=html;
      _applyFinAssetVisibility();
    }
    return;
  }
  // グラフタブで直前が万が一タブならMGグラフを表示
  if(t==='graph'){
    const lastTab=window._lastCFTab||'cf';
    if((lastTab==='mg-h'||lastTab==='mg-w')&&window._mgMRStore){
      const mgKey2=lastTab==='mg-h'?'h':'w';
      const MR2=window._mgMRStore[mgKey2];
      if(MR2){
        const hAge2=iv('husband-age')||30;
        const isM2=ST.type==='mansion';
        const tLbl2=mgKey2==='h'?'ご主人様':'奥様';
        renderGraphsMG(MR2,MR2.yr.length,isM2,hAge2,tLbl2);
        return;
      }
    }
  }
  render();
}

// ===== 印刷情報 =====
// 遺族基礎年金（2024年度）: 基本816,000円＋加算234,800円(1・2子)／78,300円(3子以降)
function calcKiso(n){
  if(n===0)return 0;
  if(n===1)return ri(81.6+23.48);
  if(n===2)return ri(81.6+23.48*2);
  return ri(81.6+23.48*2+7.83*(n-2));
}
