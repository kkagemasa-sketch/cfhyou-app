// render.js — メイン計算・CF表描画・グラフ

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
function _getInputHash(){
  let s='';
  document.querySelectorAll('input,select').forEach(el=>{if(el.id)s+=el.id+'='+el.value+'|';});
  return s;
}
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
  rTab=t;
  $('rt-cf')?.classList.toggle('on',t==='cf');
  $('rt-graph')?.classList.toggle('on',t==='graph');
  $('rt-loan')?.classList.toggle('on',t==='loan');
  $('rt-memo')?.classList.toggle('on',t==='memo');
  $('rt-mg-h')?.classList.toggle('on',t==='mg-h');
  $('rt-mg-w')?.classList.toggle('on',t==='mg-w');
  // CF表・万が一タブのみ金融資産ボタン表示
  const finBtn=$('btn-fin-toggle');
  if(finBtn)finBtn.style.display=(t==='cf'||t==='mg-h'||t==='mg-w')?'':'none';
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
    }
    return;
  }
  render();
}

// ===== 印刷情報 =====
function getPrintInfo(){
  const notesRaw=($('pi-notes')?.value||'').split('\n').filter(l=>l.trim());
  return{name:_v('pi-name'),company:_v('pi-company'),address:_v('pi-address'),tel:_v('pi-tel'),email:_v('pi-email'),notes:notesRaw};
}
function _savePrintInfo(){
  const info=getPrintInfo();
  try{localStorage.setItem(PI_STORAGE_KEY,JSON.stringify(info));}catch(e){}
}
function _loadPrintInfo(){
  try{
    const s=localStorage.getItem(PI_STORAGE_KEY);
    if(!s)return;
    const info=JSON.parse(s);
    if(info.name)$('pi-name').value=info.name;
    if(info.company)$('pi-company').value=info.company;
    if(info.address)$('pi-address').value=info.address;
    if(info.tel)$('pi-tel').value=info.tel;
    if(info.email)$('pi-email').value=info.email;
    if(info.notes&&info.notes.length)$('pi-notes').value=info.notes.join('\n');
  }catch(e){}
}

// 出力前モーダル：印刷用情報を確認・編集してから出力
function showExportModal(exportType){
  if(exportType==='mg'){
    const mgKey=rTab==='mg-h'?'h':'w';
    if(!window._mgMRStore||!window._mgMRStore[mgKey]){alert('先に万が一CF表を生成してください');return;}
  }else if(!window.lastR){alert('先にCF表を生成してください');return;}
  document.getElementById('export-modal')?.remove();
  const pi=getPrintInfo();
  const modal=document.createElement('div');
  modal.id='export-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  const fld=(id,lbl,val,ph,span)=>`
    <div class="fg" ${span?'style="grid-column:span 2"':''}>
      <label style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:2px;display:block">${lbl}</label>
      <input id="em-${id}" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}"
        style="width:100%;font-size:12px;padding:6px 8px;border:1.5px solid #cbd5e1;border-radius:6px;font-family:inherit;outline:none;box-sizing:border-box"
        onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#cbd5e1'">
    </div>`;
  const notesText=pi.notes.join('\n');

  modal.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:24px;width:520px;max-width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:15px;color:#1e3a5f">${exportType==='mg'?'📊 万が一CF表 Excel出力':exportType==='excel'?'📊 Excel出力':exportType==='pdf'?'📄 PDF出力':'🖨️ 印刷'}</div>
        <button onclick="document.getElementById('export-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px">✕</button>
      </div>

      <!-- 使用者情報 -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:10px;letter-spacing:.04em">👤 使用者情報</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${fld('name','氏名・役職',pi.name,'')}
          ${fld('company','会社名',pi.company,'')}
          ${fld('address','住所・支社',pi.address,'',true)}
          ${fld('tel','電話番号',pi.tel,'')}
          ${fld('email','メールアドレス',pi.email,'')}
        </div>
      </div>

      <!-- 注意文章 -->
      <div style="background:#fffbf5;border:1px solid #fed7aa;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:8px;letter-spacing:.04em">📋 注意文章（1行ずつ表示されます）</div>
        <textarea id="em-notes" rows="5" style="width:100%;font-size:11px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit;outline:none;color:#475569;resize:vertical;line-height:1.6;box-sizing:border-box"
          onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#e2e8f0'">${notesText}</textarea>
      </div>

      <!-- 出力ボタン -->
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button onclick="document.getElementById('export-modal').remove()" style="font-size:12px;padding:8px 16px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font-weight:600">キャンセル</button>
        <button onclick="_doExport('${exportType}')" style="font-size:12px;padding:8px 24px;background:#1e3a5f;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700">${exportType==='mg'?'📊 Excel出力':exportType==='excel'?'📊 Excel出力':exportType==='pdf'?'📄 PDF出力':'🖨️ 印刷'}</button>
      </div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}

function _applyExportModalValues(){
  // モーダルの値を隠しフィールドに反映＆保存
  const ids=['name','company','address','tel','email'];
  ids.forEach(id=>{
    const el=document.getElementById(`em-${id}`);
    if(el)$(`pi-${id}`).value=el.value;
  });
  const notesEl=document.getElementById('em-notes');
  if(notesEl)$('pi-notes').value=notesEl.value;
  _savePrintInfo();
}

function _doExport(type){
  _applyExportModalValues();
  document.getElementById('export-modal')?.remove();
  if(type==='excel')exportExcel();
  else if(type==='mg')exportExcelMG();
  else if(type==='pdf')exportPDF();
  else window.print();
}

// ===== メイン計算 =====
// グローバル版（万が一シミュレーションからも利用）
function getIncomeSteps(person){
  const steps=[];
  const ids=new Set();
  document.querySelectorAll(`[id^="${person}-is-"]`).forEach(el=>{
    const m=el.id.match(new RegExp(`^${person}-is-(\\d+)-`));
    if(m)ids.add(`${person}-is-${m[1]}`);
  });
  ids.forEach(base=>{
    const ageFrom=parseInt(document.getElementById(`${base}-from`)?.value)||0;
    const ageTo=parseInt(document.getElementById(`${base}-to`)?.value)||0;
    const netFrom=parseFloat(document.getElementById(`${base}-net-from`)?.value)||0;
    const netTo=parseFloat(document.getElementById(`${base}-net-to`)?.value)||netFrom;
    if(netFrom>0||netTo>0)steps.push({ageFrom,ageTo,netFrom,netTo});
  });
  return steps.sort((a,b)=>a.ageFrom-b.ageFrom);
}
function getIncomeAtAge(steps,age){
  if(steps.length===0)return 0;
  for(const s of steps){
    if(age>=s.ageFrom&&age<=s.ageTo){
      const span=Math.max(1,s.ageTo-s.ageFrom);
      const ratio=(age-s.ageFrom)/span;
      return Math.round(s.netFrom+(s.netTo-s.netFrom)*ratio);
    }
  }
  return 0;
}

function render(){
  if(rTab==='loan'){renderLoanCalc();return}
  const hAge=iv('husband-age')||30, wAge=iv('wife-age')||29;
  const loanAmt=fv('loan-amt'), loanYrs=iv('loan-yrs')||35, delivery=iv('delivery');
  // ペアローン用変数
  const lhAmt=pairLoanMode?fv('loan-h-amt')||0:0;
  const lwAmt=pairLoanMode?fv('loan-w-amt')||0:0;
  const lhYrs=iv('loan-h-yrs')||35, lwYrs=iv('loan-w-yrs')||35;
  const lhType=document.getElementById('loan-h-type')?.value||'equal_payment';
  const lwType=document.getElementById('loan-w-type')?.value||'equal_payment';
  const rHBase=fv('rate-h-base')||0.5, rWBase=fv('rate-w-base')||0.5;
  const effLoanAmt=pairLoanMode?(lhAmt+lwAmt):loanAmt;
  // 自己資産：現預金合計を初期残高に
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const zaikiHBal=fv('zaikei-h-bal')||0, zaikiWBal=fv('zaikei-w-bal')||0;
  // 頭金（自己資金）・諸費用（現金払い）・引越/家具費用は前提条件として初期残高から差し引く
  const downPay0=fv('down-payment')||0;
  const downDeduct=(downType==='own')?downPay0:0;
  const costType0=document.getElementById('cost-type')?.value||'cash';
  const costDeduct=(costType0==='cash')?(fv('house-cost')||0):0;
  const moveDeduct=(fv('moving-cost')||0)+(fv('furniture-init')||0);
  const initSav=cashH+cashW+cashJoint+zaikiHBal+zaikiWBal-downDeduct-costDeduct-moveDeduct;
  // ご主人収入設定
  // ※ getIncomeSteps / getIncomeAtAge はグローバル版を使用
  const hSteps=getIncomeSteps('h');
  const wSteps=getIncomeSteps('w');
  const retAge=iv('retire-age')||65, retPay=fv('retire-pay'), pSelf=fv('pension-h')||186;
  const retPayAge=iv('retire-pay-age')||retAge;
  const hDeathAge=iv('h-death-age');
  const wDeathAge=iv('w-death-age');
  const wRetAge=iv('w-retire-age')||60;
  const wRetPay=fv('w-retire-pay')||0;
  const wRetPayAge=iv('w-retire-pay-age')||wRetAge;
  const pWife=fv('pension-w')||66;
  const pHReceive=iv('pension-h-receive')||65;
  const pWReceive=iv('pension-w-receive')||65;
  const leaves=getLeaves();
  // 生活費
  const baseLc=calcLC();
  const lcSteps=getLCSteps();
  // ローン
  const rates=getRates();
  const parking=fv('parking')/10000, propTax=fv('prop-tax')/10000;
  const sqm=fv('sqm')||75;
  const isM=ST.type==='mansion';
  const choki=iv('choki');
  const taxRed=isM?PROP_TAX_RELIEF.mansion_general:(choki?PROP_TAX_RELIEF.kodate_choki:PROP_TAX_RELIEF.kodate_general);
  const extraItems=getExtraItems();
  // ループ外キャッシュ（パフォーマンス最適化）
  const otherIncomesCache=getOtherIncomes();
  // 諸費用（現金払いの場合、引き渡し年に計上）
  const houseCost=fv('house-cost')||0;
  const costType2=document.getElementById('cost-type')?.value||'cash';
  // 子ども
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{
    const cid=el.id.split('-')[1];children.push({age:parseInt(el.value)||0,costs:eduCosts(cid)});
  });
  const cYear=new Date().getFullYear();
  // ご逝去年齢から表示年数を自動計算（夫婦どちらか高い方まで）
  const hEndYr = hDeathAge>0 ? hDeathAge-hAge+1 : 0;
  const wEndYr = wDeathAge>0 ? wDeathAge-wAge+1 : 0;
  const autoDisp = Math.max(hEndYr, wEndYr);
  const totalYrs = Math.max(autoDisp, 60);
  const disp = autoDisp>0 ? autoDisp : 60;
  const cLbls=['第一子','第二子','第三子','第四子'];

  let sav=initSav;
  const R={yr:[],hA:[],wA:[],cA:children.map(()=>[]),
    hInc:[],wInc:[],rPay:[],wRPay:[],otherInc:[],scholarship:[],insMat:[],secRedeem:[],pS:[],pW:[],teate:[],lCtrl:[],survPension:[],incT:[],
    lc:[],lRep:[],rep:[],ptx:[],furn:[],senyu:[],edu:children.map(()=>[]),
    rent:[],houseCostArr:[],moveInCost:[],secInvest:[],secBuy:[],carBuy:[],carInsp:[],carTotal:[],carRows:null,prk:[],wedding:[],ext:[],expT:[],bal:[],sav:[],savExtra:[],lBal:[],finAsset:[],finAssetRows:null,secRedeemRows:null,totalAsset:[],
    // イベント文字列
    evH:[],evW:[],evC:children.map(()=>[])};

  // ── 収入段階の産休・育休設定を事前収集 ──
  const _hStepLeaves=[], _wStepLeaves=[];
  [['h',_hStepLeaves],['w',_wStepLeaves]].forEach(([p,arr])=>{
    document.querySelectorAll(`#${p}-income-cont>[id^="${p}-is-"]`).forEach(stepEl=>{
      const base=stepEl.id;
      const fromAge=parseInt(document.getElementById(`${base}-from`)?.value)||0;
      const toAge=parseInt(document.getElementById(`${base}-to`)?.value)||0;
      const leaveType=document.getElementById(`${base}-leave`)?.value||'';
      if(leaveType&&fromAge>0)arr.push({fromAge,toAge,leaveType});
    });
  });

  for(let i=0;i<totalYrs;i++){
    const yr=cYear+i, ha=hAge+i, wa=wAge+i;
    const active=i>=delivery, lcYr=i-delivery;
    R.yr.push(yr);R.hA.push(ha);R.wA.push(wa);
    children.forEach((c,ci)=>R.cA[ci].push(c.age+i));

    // ─── ご主人収入 ───
    let hInc=0;
    if(!(hDeathAge>0&&ha>hDeathAge)){
      hInc=getIncomeAtAge(hSteps,ha);
    }
    R.hInc.push(ri(hInc));

    // ─── 奥様収入（産休・育休・時短対応） ───
    let wInc=0;
    if(!(wDeathAge>0&&wa>wDeathAge)){
      const leave=leaves.find(l=>wa>=l.startAge&&wa<l.endAge);
      if(leave){
        wInc=ri(leave.income);
      } else {
        wInc=getIncomeAtAge(wSteps,wa);
      }
    }
    R.wInc.push(ri(wInc));

    // ─── その他収入 ───
    R.rPay.push(ha===retPayAge?ri(retPay):0);
    // 奥様退職金
    R.wRPay.push(wa===wRetPayAge?ri(wRetPay):0);
    // 副業・不動産収入
    let oiTotal=0;
    otherIncomesCache.forEach(oi=>{if(oi.amt>0&&(oi.endAge===0||ha<oi.endAge))oiTotal+=oi.amt;});
    R.otherInc.push(ri(oiTotal));
    // 奨学金（大学入学年に収入として計上）
    let scTotal=0;
    document.querySelectorAll('[id^="sc-amt-"]').forEach(el=>{
      const cid=el.id.split('-')[2];
      const scOn=document.getElementById(`sc-yes-${cid}`)?.classList.contains('on');
      if(!scOn)return;
      const scAmt=fv(`sc-amt-${cid}`)||0;
      const childAge=iv(`ca-${cid}`)||0;
      // 大学入学年（子どもが19歳になる年）に計上
      if(childAge+i===19)scTotal+=scAmt;
    });
    R.scholarship.push(scTotal);
    // 積み立て保険満期金（主人・奥様両方）
    let insMatTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        if(matAmt>0&&matAge>0&&pAge===matAge)insMatTotal+=matAmt;
      });
    });
    R.insMat.push(insMatTotal);
    R.pS.push((ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge))?ri(pSelf):0);
    // ご主人死亡後は遺族年金(survPension)に統合されるため配偶者年金は計上しない
    const hAlive=!(hDeathAge>0&&ha>hDeathAge);
    R.pW.push((wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge)&&hAlive)?ri(pWife):0);
    // ─── 児童手当（TEATE_TABLEを参照・2024年10月改正対応） ───
    let t=0;
    if(hDeathAge===0||ha<=hDeathAge){
      const sortedChildren=[...children].sort((a,b)=>b.age-a.age);
      children.forEach((c)=>{
        const ca=c.age+i;
        if(ca<0||ca>18)return;
        const rank=sortedChildren.indexOf(c)+1;
        const ageKey=ca<=2?'age_0_2':'age_3_18';
        const rankKey=rank>=3?'rank3plus':rank===2?'rank2':'rank1';
        const monthly=TEATE_TABLE[ageKey][rankKey]||0;
        t+=Math.round(monthly*12/10000);
      });
    }
    R.teate.push(t);

    // ─── 遺族年金（ご主人ご逝去後） ───
    // 遺族厚生年金：ご主人の老齢厚生年金の3/4
    // 遺族基礎年金：子が18歳未満の間のみ（約100万＋子1人あたり加算）
    let survP=0;
    if(hDeathAge>0&&ha>hDeathAge){
      // 遺族厚生年金：ご主人の年金の3/4（奥様65歳未満でも支給）
      const kosei=ri(pSelf*0.75);
      // 遺族基礎年金：子が18歳未満の間のみ
      let kiso=0;
      let childUnder18=0;
      children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<18)childUnder18++;});
      if(childUnder18>0){
        // 1人目100万、2人目+23万、3人目以降+7.6万（概算）
        kiso=childUnder18===1?100:childUnder18===2?123:Math.round(123+(childUnder18-2)*7.6);
      }
      // 奥様に自身の厚生年金がある場合は高い方を適用（65歳以降）
      const wOwnPension=wa>=pWReceive?ri(pWife):0;
      survP=Math.max(kosei,wOwnPension)+kiso;
    }
    R.survPension.push(survP);

    // ─── 住宅ローン控除（LCTRL_TABLEを参照・所得税・住民税上限考慮） ───
    const lctrlYear=parseInt(document.getElementById('lctrl-year')?.value)||2025;
    const lctrlType=document.getElementById('lctrl-type')?.value||'new_eco';
    const lctrlHH=document.getElementById('lctrl-household')?.value||'general';
    const isKosodate=lctrlHH==='kosodate';
    const lctrlRowR=getLCtrlRow(lctrlYear,lctrlType,isKosodate);
    const lctrlLimit=lctrlRowR[0], lctrlYrs=lctrlRowR[1];
    let lc2=0;
    // 自由入力モード
    if(_lctrlDedMode==='manual'){
      const mv=getLctrlManualValues();
      lc2=lcYr<mv.length?mv[lcYr]:0;
      R.lCtrl.push(ri(lc2));
    }else
    if(active&&lctrlYrs>0&&lcYr<lctrlYrs&&effLoanAmt>0&&lctrlLimit>0){
      const loanType2tmp=document.getElementById('loan-type')?.value||'equal_payment';
      const remainBal=pairLoanMode
        ?(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,rHBase,lcYr):0)+(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,rWBase,lcYr):0)
        :(loanType2tmp==='equal_payment'
          ?lbal(loanAmt,loanYrs,effRate(lcYr,rates),lcYr)
          :lbal_gankin(loanAmt,loanYrs,lcYr));
      const cappedBal=Math.min(remainBal,pairLoanMode?lctrlLimit*2:lctrlLimit);
      const calcCtrl=Math.round(cappedBal*0.007*10)/10;
      // 所得税・住民税から上限を推計（ご主人の手取りから額面を逆算）
      const grossInc=hInc>0?hInc:0;
      let grossEst=0;
      for(let gi=0;gi<TAX.length-1;gi++){
        if(grossInc<=TAX[gi][1]){grossEst=TAX[gi][0];break;}
        if(grossInc<TAX[gi+1][1]){
          const r=(grossInc-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);
          grossEst=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));
          break;
        }
        grossEst=TAX[TAX.length-1][0];
      }
      if(grossEst<=0&&grossInc>0)grossEst=TAX[TAX.length-1][0];
      let itax=0, jumin=0, taxableBase=0;
      if(grossEst>0){
        const shakai=Math.round(grossEst*0.1437*10)/10;
        let kyuyo=grossEst<=180?Math.max(55,grossEst*0.4):grossEst<=360?grossEst*0.3+18:grossEst<=660?grossEst*0.2+54:grossEst<=850?grossEst*0.1+120:grossEst<=1000?grossEst*0.05+172.5:195;
        taxableBase=Math.max(0,grossEst-kyuyo-shakai-48);
        const taxable=Math.max(0,taxableBase-38);
        if(taxable<=195)itax=taxable*0.05;
        else if(taxable<=330)itax=taxable*0.1-9.75;
        else if(taxable<=695)itax=taxable*0.2-42.75;
        else if(taxable<=900)itax=taxable*0.23-63.6;
        else if(taxable<=1800)itax=taxable*0.33-153.6;
        else if(taxable<=4000)itax=taxable*0.4-279.6;
        else itax=taxable*0.45-479.6;
        itax=Math.round(itax*1.021*10)/10;
        jumin=Math.max(0,Math.round((taxableBase*0.1-2.5)*10)/10);
      }
      // 住民税控除上限＝課税総所得金額等×5%（上限9.75万円）
      const juminCtrlMax=Math.min(Math.round(taxableBase*0.05*10)/10, 9.75);
      const taxCapTotal=Math.round((itax+juminCtrlMax)*10)/10;
      lc2=Math.round(Math.min(calcCtrl, taxCapTotal)*10)/10;
      lc2=Math.max(0,lc2);
    }
    if(_lctrlDedMode!=='manual')R.lCtrl.push(ri(lc2));
    // ─── 有価証券・積立保険の解約収入 ───
    if(!R.secRedeemRows)R.secRedeemRows=[];
    let secRedeemTotal=0;
    const secRedeemMap={};
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      // 積立型の解約
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const redeemAge=iv(`sec-redeem-${p}-${sid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-bal-${p}-${sid}`)||0;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=(fv(`sec-rate-${p}-${sid}`)||5)/100;
        const yrs=i+1;
        let fv2=0;
        if(endAge===0||pAge<=endAge){
          const balGrow=bal*Math.pow(1+rate,yrs);
          const accumFV=rate>0?monthly*12*(Math.pow(1+rate,yrs)-1)/rate:monthly*12*yrs;
          fv2=Math.round(balGrow+accumFV);
        } else {
          const yrsAccum=endAge-pBaseAge;
          const yrsAfter=yrs-yrsAccum;
          const balAtEnd=bal*Math.pow(1+rate,yrsAccum);
          const accumAtEnd=rate>0?monthly*12*(Math.pow(1+rate,yrsAccum)-1)/rate:monthly*12*yrsAccum;
          fv2=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+rate,Math.max(0,yrsAfter)));
        }
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        // 課税口座：譲渡益課税 20.315%（所得税15%+住民税5%+復興特別所得税0.315%）
        let netAccum=fv2;
        if(!isNisa){
          const costAccum=bal+monthly*12*(endAge>0&&pAge>endAge?(endAge-pBaseAge):yrs);
          const gainAccum=Math.max(0,fv2-costAccum);
          netAccum=Math.round(fv2-gainAccum*0.20315);
        }
        const lbl=customLabel||(isNisa?'NISA（非課税）':'課税')+'積立投資（解約）';
        secRedeemMap[`accum-${p}-${sid}`]={lbl,val:netAccum};
        secRedeemTotal+=netAccum;
      });
      // 一括投資の解約
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const redeemAge=iv(`sec-stk-redeem-${p}-${sid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        const redeemVal=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        // 課税口座：譲渡益課税 20.315%
        let netStk=redeemVal;
        if(!isNisa){
          const gainStk=Math.max(0,redeemVal-bal);
          netStk=Math.round(redeemVal-gainStk*0.20315);
        }
        const lbl=customLabel||(isNisa?'NISA（非課税）':'課税')+'一括投資（解約）';
        secRedeemMap[`stk-${p}-${sid}`]={lbl,val:netStk};
        secRedeemTotal+=netStk;
      });
      // 積立保険の解約（保険は別行のため secRedeemRows に含めない）
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const monthly=fv(`ins-m-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        if(pAge>=matAge&&matAmt>0){secRedeemTotal+=matAmt;return;}
        if(matAge>0&&monthly>0){
          const totalPayYrs=matAge-pBaseAge;
          const paidYrs2=Math.min(i+1,totalPayYrs);
          const cumPay=monthly*12*paidYrs2;
          const ratio=paidYrs2/totalPayYrs;
          const surrenderCharge=Math.max(0,0.3*(1-ratio));
          secRedeemTotal+=Math.round(cumPay*(1-surrenderCharge)+matAmt*ratio*ratio);
        }
      });
    });
    // per-security 行を追跡（finAssetRows と同パターン）
    Object.keys(secRedeemMap).forEach(k=>{
      if(!R.secRedeemRows.find(r=>r.key===k)){
        R.secRedeemRows.push({key:k,lbl:secRedeemMap[k].lbl,vals:new Array(i).fill(0)});
      }
    });
    R.secRedeemRows.forEach(row=>{row.vals.push(ri(secRedeemMap[row.key]?.val||0));});
    R.secRedeem.push(ri(secRedeemTotal));
    R.incT.push(ri(hInc)+ri(wInc)+(ha===retPayAge?ri(retPay):0)+(wa===wRetPayAge?ri(wRetPay):0)+ri(oiTotal)+scTotal+insMatTotal+ri(secRedeemTotal)+(ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge)?ri(pSelf):0)+(wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge)&&hAlive?ri(pWife):0)+t+lc2+survP);

    // ─── 生活費（段階別複利計算） ───
    let lcVal;{
      if(!lcSteps.length){lcVal=ri(baseLc);}
      else{
        // from<=yr の中で最後の段階をアクティブに（全段階チェック、break無し）
        let ai=-1;
        for(let i=0;i<lcSteps.length;i++){if(lcSteps[i].from<=yr)ai=i;else break;}
        if(ai<0){lcVal=ri(baseLc);}
        else{
          let runBase=baseLc;
          for(let i=0;i<=ai;i++){
            const s=lcSteps[i];const sb=s.mode==='pct'?runBase*(s.pct/100):(s.base>0?s.base:runBase);
            if(i<ai){// 前段階：終了年まで複利を累積（to指定があればその年数、なければ0）
              runBase=sb*Math.pow(1+s.rate/100,s.to!==null?Math.max(0,s.to-s.from):0);
            }else{// アクティブ段階：yr時点の値
              lcVal=ri(sb*Math.pow(1+s.rate/100,Math.max(0,yr-s.from)));
            }
          }
        }
      }
    }
    R.lc.push(lcVal);
    // ─── 有価証券積立額（積立型のみ・解約前年まで）を支出計上 ───
    let secInvestTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        if(monthly<=0)return;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const redeemAge=iv(`sec-redeem-${p}-${sid}`)||0;
        const isActive=(endAge===0||pAge<endAge)&&(redeemAge===0||pAge<redeemAge);
        if(isActive)secInvestTotal+=monthly*12;
      });
    });
    R.secInvest.push(ri(secInvestTotal));
    // ─── 一括投資購入額（投資開始年齢に支出計上）───
    let secBuyTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        if(investAge<=0||pAge!==investAge)return;
        secBuyTotal+=fv(`sec-stk-bal-${p}-${sid}`)||0;
      });
    });
    R.secBuy.push(ri(secBuyTotal));
    // ─── 家賃（引き渡し前）───
    const rentMonthly=(parseFloat(document.getElementById('rent-before')?.value)||0)/10000;
    const rentAmt=(!active&&delivery>0)?ri(rentMonthly*12):0;
    R.rent.push(rentAmt);

    // ─── ローン返済 ───
    const loanType2=document.getElementById('loan-type')?.value||'equal_payment';
    let lRep=0;
    if(pairLoanMode){
      if(active){
        if(lcYr<lhYrs)lRep+=ri(lhType==='equal_payment'?mpay(lhAmt,lhYrs,rHBase)*12:mpay_gankin_year(lhAmt,lhYrs,rHBase,lcYr));
        if(lcYr<lwYrs)lRep+=ri(lwType==='equal_payment'?mpay(lwAmt,lwYrs,rWBase)*12:mpay_gankin_year(lwAmt,lwYrs,rWBase,lcYr));
      }
    } else if(active&&lcYr<loanYrs){
      if(loanType2==='equal_payment'){
        lRep=ri(mpay(loanAmt,loanYrs,effRate(lcYr,rates))*12);
      } else {
        lRep=ri(mpay_gankin_year(loanAmt,loanYrs,effRate(lcYr,rates),lcYr));
      }
    }
    R.lRep.push(lRep);

    // ─── 住宅固有 ───
    const el2=Math.max(1,lcYr+1);
    R.rep.push(isM?getRepFund(sqm,el2):0);
    const ptxV=active&&lcYr<taxRed?ri(propTax*0.5):ri(propTax);
    R.ptx.push(ptxV);
    const furnCycle=iv('furn-cycle')||10;
    const furnCost=iv('furn-cost')||80;
    R.furn.push(active&&el2>0&&el2%furnCycle===0?furnCost:0);
    // 動的修繕周期の集計
    let repTotal=0;
    if(active&&el2>0){
      // 修繕①（固定）
      const rc1=iv('repair-cycle')||15, rco1=iv('repair-cost')||100;
      if(rc1>0&&rco1>0&&el2%rc1===0)repTotal+=rco1;
      // 動的に追加された修繕周期
      document.querySelectorAll('[id^="repair-cycle"]').forEach(el=>{
        const rid=el.id.replace('repair-cycle','');
        if(rid===''||rid==='')return; // 修繕①はスキップ（上で処理済み）
        const cyc=parseInt(el.value)||0;
        const cost=iv('repair-cost'+rid)||0;
        if(cyc>0&&cost>0&&el2%cyc===0)repTotal+=cost;
      });
    }
    R.senyu.push(repTotal);
    children.forEach((c,ci)=>{const ca=c.age+i;R.edu[ci].push(ca>=0&&ca<c.costs.length?c.costs[ca]:0)});
    const parkEndAge=iv('park-end-age')||0;
    const parkActive=parkEndAge<=0||ha<parkEndAge;
    R.prk.push(parkOwn&&parkActive?ri(parking*12):0);
    // 車両購入・車検（複数台対応）
    if(!R.carRows)R.carRows=[];
    let carBuyAmt=0, carInspAmt=0;
    if(carOwn){
      document.querySelectorAll('#car-list>[id^="car-"]').forEach(carEl=>{
        const cIdx=carEl.id.replace('car-','');
        const carType=carEl.dataset.type||'new';
        const carPay=carEl.dataset.pay||'cash';
        const carPrice=fv('car-'+cIdx+'-price')||300;
        const carFirst=(iv('car-'+cIdx+'-first')||1)-1;
        const carCycle=iv('car-'+cIdx+'-cycle')||7;
        const carInsp=fv('car-'+cIdx+'-insp')||10;
        const carDown=fv('car-'+cIdx+'-down')||50;
        const carLoanYrs=iv('car-'+cIdx+'-loan-yrs')||5;
        const carLoanRate=(fv('car-'+cIdx+'-loan-rate')||2.5)/100/12;
        const carEndAge=iv('car-'+cIdx+'-end-age')||0;
        const carActive=carEndAge<=0||ha<carEndAge;
        // 台ごとの行を初期化
        const rowKey='car-'+cIdx;
        if(!R.carRows.find(r=>r.key===rowKey)){
          const carLbl=document.getElementById('car-'+cIdx+'-price')?`${R.carRows.length+1}台目`:cIdx+'台目';
          R.carRows.push({key:rowKey,lbl:`🚗 ${R.carRows.length+1}台目`,vals:new Array(i).fill(0)});
        }
        const carRow=R.carRows.find(r=>r.key===rowKey);
        let lastBuy=-1;
        if(i>=carFirst){
          const elapsed=i-carFirst;
          lastBuy=carFirst+Math.floor(elapsed/carCycle)*carCycle;
        }
        const isBuyYear=carActive&&(i===carFirst||(i>carFirst&&(i-carFirst)%carCycle===0));
        let thisCarAmt=0, thisInspAmt=0;
        if(isBuyYear){
          if(carPay==='cash'){thisCarAmt+=carPrice;}
          else{thisCarAmt+=carDown;}
        }
        if(carPay==='loan'&&carLoanYrs>0&&lastBuy>=0&&!isBuyYear&&carActive){
          const principal=(carPrice-carDown)*10000;
          const monthly=carLoanRate>0?principal*carLoanRate*Math.pow(1+carLoanRate,carLoanYrs*12)/(Math.pow(1+carLoanRate,carLoanYrs*12)-1):principal/carLoanYrs/12;
          const yrsAfterBuy=i-lastBuy;
          if(yrsAfterBuy>0&&yrsAfterBuy<=carLoanYrs){thisCarAmt+=Math.round(monthly*12/10000);}
        }
        if(lastBuy>=0&&!isBuyYear&&carActive){
          const yrFromBuy=i-lastBuy;
          if(carType==='new'){
            if(yrFromBuy===3||(yrFromBuy>3&&(yrFromBuy-3)%2===0))thisInspAmt+=carInsp;
          } else {
            if(yrFromBuy%2===0)thisInspAmt+=carInsp;
          }
        }
        const thisTotal=ri(thisCarAmt)+ri(thisInspAmt);
        if(carRow)carRow.vals.push(thisTotal);
        carBuyAmt+=thisCarAmt; carInspAmt+=thisInspAmt;
      });
      // carRowsのうち今回ループしなかった行（削除済み台）にも0を追加
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    } else {
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    }
    R.carBuy.push(ri(carBuyAmt));
    R.carInsp.push(ri(carInspAmt));
    R.carTotal.push(ri(carBuyAmt)+ri(carInspAmt));
    // 特別支出（複数対応・期間対応）
    const curYr=cYear+i;
    const extSum=extraItems.reduce((s,it)=>{
      if(it.yr>0&&curYr>=it.yr&&curYr<=it.yr2)return s+ri(it.amt);
      return s;
    },0);
    R.ext.push(extSum);
    // 諸費用は前提条件で初期残高から差引済み → CF表には計上しない
    R.houseCostArr.push(0);
    // 引っ越し・家具家電は前提条件で初期残高から差引済み → CF表には計上しない
    R.moveInCost.push(0);
    // 結婚お祝い
    let wedTotal=0;
    document.querySelectorAll('[id^="wed-amt-"]').forEach(el=>{
      const cid=el.id.split('-')[2];
      const wedOn=document.getElementById(`wed-yes-${cid}`)?.classList.contains('on');
      if(!wedOn)return;
      const wedAmt=fv(`wed-amt-${cid}`)||100;
      const wedAge=iv(`wed-age-${cid}`)||28;
      const childAge=iv(`ca-${cid}`)||0;
      if(childAge+i===wedAge)wedTotal+=wedAmt;
    });
    R.wedding.push(wedTotal);
    let exp=R.lc[i]+R.rent[i]+R.secInvest[i]+R.secBuy[i]+lRep+R.rep[i]+R.ptx[i]+R.furn[i]+R.senyu[i]+R.prk[i]+R.carTotal[i]+R.wedding[i]+R.ext[i];
    children.forEach((c,ci)=>exp+=R.edu[ci][i]);
    R.expT.push(ri(exp));
    const b=R.incT[i]-R.expT[i];R.bal.push(b);sav+=b;
    // 財形貯蓄の積立（支出には含めないが資産として加算）
    let _savExtra=0;
    // 財形貯蓄（主人・奥様）
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pRetAge=p==='h'?(iv('retire-age')||65):(iv('w-retire-age')||60);
      const zm=fv(`zaikei-${p}-monthly`)||0;
      const ze=iv(`zaikei-${p}-end`)||0;
      if(zm>0&&(ze===0||pAge<(ze||pRetAge))){sav+=zm*12;_savExtra+=zm*12;}
    });
    // 積み立て証券の資産増加（複利・主人・奥様）
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=(fv(`sec-rate-${p}-${sid}`)||5)/100;
        if(monthly>0&&(endAge===0||pAge<endAge)){sav+=monthly*12*(1+rate*0.5);_savExtra+=monthly*12*(1+rate*0.5);}
      });
    });
    R.savExtra.push(_savExtra);
    R.sav.push(ri(sav));
    // ─── その他金融資産（有価証券＋積立保険 - 個別追跡） ───
    if(!R.finAssetRows)R.finAssetRows=[];
    const finRowMap={};
    // 【積立型有価証券】（主人・奥様両方）正確な複利計算
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const redeemAgeA=iv(`sec-redeem-${p}-${sid}`)||0;
        if(redeemAgeA>0&&pAge>=redeemAgeA)return;
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const lbl=customLabel||(isNisa?'NISA':'課税')+'積み立て';
        const bal=fv(`sec-bal-${p}-${sid}`)||0;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=(fv(`sec-rate-${p}-${sid}`)||5)/100;
        const yrs=i+1;
        let fv2=0;
        if(endAge===0||pAge<endAge){
          const balGrow=bal*Math.pow(1+rate,yrs);
          const accumFV=rate>0?monthly*12*(Math.pow(1+rate,yrs)-1)/rate:monthly*12*yrs;
          fv2=Math.round(balGrow+accumFV);
        } else {
          const yrsAccum=endAge-pBaseAge;
          const yrsAfter=yrs-yrsAccum;
          const balAtEnd=bal*Math.pow(1+rate,yrsAccum);
          const accumAtEnd=rate>0?monthly*12*(Math.pow(1+rate,yrsAccum)-1)/rate:monthly*12*yrsAccum;
          fv2=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+rate,Math.max(0,yrsAfter)));
        }
        finRowMap[lbl]=(finRowMap[lbl]||0)+fv2;
      });
    });
    // 【一括投資】（主人・奥様両方）
    ['h','w'].forEach(p=>{
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const pAge=p==='h'?ha:wa;
        const redeemAgeS=iv(`sec-stk-redeem-${p}-${sid}`)||0;
        if(redeemAgeS>0&&pAge>=redeemAgeS)return;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        if(investAge>0&&pAge<investAge)return;  // 未投資期間は除外
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const lbl=customLabel||(isNisa?'NISA':'課税')+'一括投資';
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
        const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        finRowMap[lbl]=(finRowMap[lbl]||0)+Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
      });
    });
    // 【積立保険】（主人・奥様両方）払込累計ベースで返戻率を線形補間
    ['h','w'].forEach(p=>{
      const pAge2=p==='h'?ha:wa;
      const pBaseAge2=p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const monthly=fv(`ins-m-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        if(monthly<=0&&matAmt<=0)return;
        const redeemAgeI=iv(`ins-redeem-${p}-${iid}`)||0;
        if(redeemAgeI>0&&pAge2>=redeemAgeI)return;
        const lbl='積立保険';
        if(matAge>0&&pAge2>=matAge){
          // 満期以降：満期受取金額を固定表示
          finRowMap[lbl]=(finRowMap[lbl]||0)+matAmt;
        } else if(matAge>0&&monthly>0){
          const totalPayYrs=matAge-pBaseAge2;
          const paidYrs2=Math.min(i+1,totalPayYrs);
          // 払込累計
          const cumPay=monthly*12*paidYrs2;
          // 払込終了時の満期受取予定（線形補間）
          const ratio=paidYrs2/totalPayYrs;
          // 解約返戻金 = 払込累計×(1 - 解約控除率) + 満期金×進捗率×返戻ボーナス
          // 解約控除率：前半は高く後半は低い（最大30%→0%）
          const surrenderCharge=Math.max(0,0.3*(1-ratio));
          const estVal=Math.round(cumPay*(1-surrenderCharge)+matAmt*ratio*ratio);
          finRowMap[lbl]=(finRowMap[lbl]||0)+estVal;
        } else if(monthly>0){
          finRowMap[lbl]=(finRowMap[lbl]||0)+Math.round(monthly*12*(i+1));
        }
      });
    });
    // finAssetRowsに追記（毎年動的にキーを管理）
    Object.keys(finRowMap).forEach(k=>{
      if(!R.finAssetRows.find(r=>r.lbl===k)){
        // 新しいキーが出てきたら過去分を0で埋めて追加
        R.finAssetRows.push({lbl:k,vals:new Array(i).fill(0)});
      }
    });
    R.finAssetRows.forEach(row=>{row.vals.push(ri(finRowMap[row.lbl]||0));});
    const finAssetVal=Object.values(finRowMap).reduce((a,b)=>a+b,0);
    R.finAsset.push(ri(finAssetVal));
    R.totalAsset.push(ri(sav)+ri(finAssetVal));// 預貯金残高＋その他金融資産
    const lb=ri(pairLoanMode
      ?(active?Math.max(0,(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,rHBase,lcYr+1):0)+(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,rWBase,lcYr+1):0)):lhAmt+lwAmt)
      :(active?Math.max(0,(loanType2==='equal_payment'?lbal(loanAmt,loanYrs,effRate(lcYr,rates),lcYr+1):lbal_gankin(loanAmt,loanYrs,lcYr+1))):loanAmt));
    R.lBal.push(lb);

    // ─── イベント文字列 ───
    let evH='';
    if(hDeathAge>0&&ha===hDeathAge)evH='🕊️ ご主人ご逝去';
    else if(hDeathAge>0&&ha>hDeathAge)evH='';
    else if(i===delivery&&delivery>0)evH='🏠引き渡し';
    else if(ha===retAge)evH='定年退職';
    else if(ha===retPayAge&&retPayAge!==retAge)evH='退職金受取';
    else if(ha===pHReceive)evH='年金開始';
    // 収入段階の産休・育休（他イベントがない年のみ表示）
    if(!evH&&!(hDeathAge>0&&ha>hDeathAge)){
      const sl=_hStepLeaves.find(s=>ha===s.fromAge);
      if(sl)evH=sl.leaveType;
    }
    R.evH.push(evH);

    let evW='';
    const wLeave=leaves.find(l=>wa===l.startAge);
    const wLeaveEnd=leaves.find(l=>wa===l.endAge);
    if(wLeave){const lm={maternity:'産休',parental:'育休',reduced:'時短'};evW=lm[wLeave.type]+'開始';}
    else if(wLeaveEnd)evW='職場復帰';
    else if(wa===wRetAge)evW='退職（奥様）';
    else if(wa===pWReceive)evW='年金開始';
    if(wDeathAge>0&&wa===wDeathAge)evW='🕊️ 奥様ご逝去';
    else if(wDeathAge>0&&wa>wDeathAge)evW='';
    // 収入段階の産休・育休（他イベントがない年のみ表示）
    if(!evW&&!(wDeathAge>0&&wa>wDeathAge)){
      const sl=_wStepLeaves.find(s=>wa===s.fromAge);
      if(sl)evW=sl.leaveType;
    }
    R.evW.push(evW);

    children.forEach((c,ci)=>{
      const ca=c.age+i;
      const cid=ci+1;
      const hoikuStartAge=parseInt(document.getElementById(`hoiku-start-${cid}`)?.value)||1;
      const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';
      const hoikuLabel=hoikuType==='youchien'?'幼稚園入園':'保育園入園';
      let ev='';
      if(ca===0)ev='誕生';
      else if(ca>=hoikuStartAge&&ca<=6)ev=ca===hoikuStartAge?hoikuLabel:'';
      else if(ca>=7&&ca<=12)ev=ca===7?'小学入学':'';
      else if(ca>=13&&ca<=15)ev=ca===13?'中学入学':'';
      else if(ca>=16&&ca<=18)ev=ca===16?'高校入学':'';
      else if(ca>=19){const un2=_v(`cu-${cid}`)||'plit_h';const ul2=(EDU.univ[un2]||[]).length;if(ul2>0&&ca<19+ul2)ev=ca===19?(un2.startsWith('senmon')?'専門入学':'大学入学'):'';}
      R.evC[ci].push(ev);
    });
  }

  // ─── cfOverrides後処理: サブ行上書きを合計・収支・残高に反映 ───
  if(Object.keys(cfOverrides).length>0){
    const incKeys=['hInc','wInc','otherInc','insMat','rPay','wRPay','pS','pW','survPension','scholarship','teate','lCtrl'];
    const expKeys=['lc','secInvest','secBuy','rent','lRep','rep','ptx','furn','senyu','prk','carTotal','wedding','ext'];
    [...incKeys,...expKeys].forEach(key=>{
      if(!cfOverrides[key])return;
      Object.entries(cfOverrides[key]).forEach(([col,val])=>{
        const c2=parseInt(col);
        if(R[key]&&c2<R[key].length)R[key][c2]=val;
      });
    });
    children.forEach((_ch,ci)=>{
      const key='edu'+ci;
      if(!cfOverrides[key])return;
      Object.entries(cfOverrides[key]).forEach(([col,val])=>{
        const c2=parseInt(col);
        if(R.edu[ci]&&c2<R.edu[ci].length)R.edu[ci][c2]=val;
      });
    });
    if(R.secRedeemRows){
      R.secRedeemRows.forEach(row=>{
        if(!cfOverrides[row.key])return;
        Object.entries(cfOverrides[row.key]).forEach(([col,val])=>{row.vals[parseInt(col)]=val;});
      });
    }
    let newSav=initSav;
    for(let i=0;i<R.incT.length;i++){
      if(cfOverrides['incT']?.[i]!==undefined){R.incT[i]=cfOverrides['incT'][i];}
      else{let t=incKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);if(R.secRedeemRows)R.secRedeemRows.forEach(row=>t+=(row.vals[i]||0));R.incT[i]=t;}
      if(cfOverrides['expT']?.[i]!==undefined){R.expT[i]=cfOverrides['expT'][i];}
      else{let t=expKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);children.forEach((_ch,ci)=>t+=(R.edu[ci]?.[i]||0));R.expT[i]=t;}
      R.bal[i]=R.incT[i]-R.expT[i];
      newSav+=R.bal[i]+(R.savExtra[i]||0);
      R.sav[i]=ri(newSav);
    }
  }

  // Excel出力用にグローバル保存
  window.lastR=R; window.lastDisp=disp; window.lastCYear=cYear;
  if(rTab==='cf')renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);
  else if(rTab==='graph')renderGraphs(R,disp,isM,totalYrs,hAge);
  else if((rTab==='mg-h'||rTab==='mg-w')&&window._mgStore){
    const key=rTab==='mg-h'?'h':'w';
    if(window._mgStore[key]){$('right-body').innerHTML=window._mgStore[key];}
    else{renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);rTab='cf';$('rt-cf')?.classList.add('on');}
  }else renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);
}

// ===== CF表レンダリング =====
function renderTable(R,total,disp,cLbls,cYear,loanAmt,isM,hAge,retAge,children,delivery){
  const nm=_v('client-name')||'お客様';

  // 前提条件の値を取得
  const housePrice=fv('house-price')||0;
  const downPay=fv('down-payment')||0;
  const loanYrsV=iv('loan-yrs')||35;
  const rateBaseV=fv('rate-base')||0.5;
  const deliveryYrV=iv('delivery-year')||0;
  // 金利変更ステップ（複数ある場合は「〜」で省略）
  const rates=getRates();
  const rateDisp=rates.length>1?`${rateBaseV}%〜`:`${rateBaseV}%`;

  // 逝去・退職列インデックス計算
  const wAge0=iv('wife-age');
  const hDeathAge=iv('h-death-age'),wDeathAge=iv('w-death-age');
  const wRetireAge=iv('w-retire-age');
  const hDeathCol=hDeathAge>hAge?hDeathAge-hAge:-1;
  const wDeathCol=wDeathAge>wAge0?wDeathAge-wAge0:-1;
  const hRetireCol=retAge>hAge?retAge-hAge:-1;
  const wRetireCol=wRetireAge>wAge0?wRetireAge-wAge0:-1;
  const getColCls=i=>{let c='';if(i===hDeathCol||i===wDeathCol)c+=' col-death';if(i===hRetireCol||i===wRetireCol)c+=' col-retire';return c;};

  // サマリーカード（4枚）
  const totI_s=R.incT.slice(0,disp).reduce((a,b)=>a+b,0);
  const totE_s=R.expT.slice(0,disp).reduce((a,b)=>a+b,0);
  const finSav_s=R.sav[disp-1]||0;
  const redYrs_s=R.bal.slice(0,disp).filter(v=>v<0).length;
  const sc=(icon,lbl,val,unit,color,sub)=>`<div style="background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;flex:1;min-width:140px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${color};border-radius:4px 0 0 4px"></div>
    <div style="margin-left:8px">
      <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.04em">${icon} ${lbl}</div>
      <div style="font-size:20px;font-weight:800;font-family:'Cascadia Code','Consolas','Menlo',monospace;color:${color};margin-top:2px">${val}<span style="font-size:11px;font-weight:600;margin-left:3px">${unit}</span></div>
      ${sub?`<div style="font-size:9px;color:var(--muted);margin-top:1px">${sub}</div>`:''}
    </div>
  </div>`;
  let h=`<div class="r-summary"><div class="cf-summary" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
    ${sc('💰','総収入',ri(totI_s).toLocaleString(),'万円','#2d7dd2',`${disp}年間合計`)}
    ${sc('💸','総支出',ri(totE_s).toLocaleString(),'万円','#fc5b4a',`${disp}年間合計`)}
    ${sc('🏦','最終残高',ri(finSav_s).toLocaleString(),'万円',finSav_s>=0?'#0d8a20':'#d63a2a',`${hAge+disp-1}歳時点`)}
    ${sc('⚠️','赤字年数',redYrs_s,'年',redYrs_s===0?'#0d8a20':'#d63a2a',redYrs_s===0?'赤字なし':`${disp}年中${redYrs_s}年が赤字`)}
  </div>`;
  h+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <span style="background:var(--navy);color:#fff;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:600">${nm} 様</span>
      <span style="background:${isM?'var(--teal)':'var(--green)'};color:#fff;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:600">${isM?'🏢 マンション':'🏡 戸建て'}</span>
      <span style="font-size:11px;color:var(--muted)">全${total}年間 / ご主人${hAge}〜${hAge+total-1}歳</span>
    </div>
  </div>`;

  // 前提条件バー：自己資金内訳 ＋ 住宅ローン条件
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const cashTotal=cashH+cashW+cashJoint;
  const houseCostV=fv('house-cost')||0;
  const movingCostV=fv('moving-cost')||0;
  const furnitureInitV=fv('furniture-init')||0;
  // 頭金が贈与の場合は自己資金から差し引かない
  const downFromOwn=downType==='gift'?0:downPay;
  const initialOut=downFromOwn+houseCostV+movingCostV+furnitureInitV;
  const cashAfter=cashTotal-initialOut;
  const cashAfterColor=cashAfter>=0?'var(--green)':'var(--red)';

  const chip=(icon,label,val,valColor)=>`<div style="display:flex;align-items:center;gap:5px;padding:6px 13px;border-right:1px solid #dce6f0;white-space:nowrap;flex-shrink:0"><span>${icon}</span><span style="color:var(--muted);font-size:10px">${label}</span><strong style="color:${valColor||'var(--navy)'};font-family:'Cascadia Code','Consolas','Menlo',monospace;font-size:11px">${val}</strong></div>`;
  const arrow=`<div style="color:#b0bec5;font-size:13px;padding:0 2px;display:flex;align-items:center">▶</div>`;
  const sep=`<div style="width:1px;background:#dce6f0;margin:4px 0"></div>`;

  // 行1：自己資金の内訳
  h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:6px;background:#fff">
    <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">💰 自己資金の内訳</div>
    <div style="display:flex;flex-wrap:wrap;align-items:stretch">
      ${chip('🏦','現預金合計',`${cashTotal.toLocaleString()}万円`)}
      ${arrow}
      ${downType==='gift'
        ? chip('🎁','頭金（贈与）',`${downPay.toLocaleString()}万円`,'#2d7dd2')
        : chip('💴','頭金（自己資金）',`${downPay.toLocaleString()}万円`,'var(--red)')
      }
      ${chip('📋','諸費用',`${houseCostV.toLocaleString()}万円`,'var(--red)')}
      ${chip('🚚','引越・家具',`${(movingCostV+furnitureInitV).toLocaleString()}万円`,'var(--red)')}
      ${arrow}
      ${chip('✅','購入後残高',`${cashAfter.toLocaleString()}万円`,cashAfterColor)}
    </div>
  </div>`;

  // 行2：住宅ローン条件
  h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
    <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件</div>
    <div style="display:flex;flex-wrap:wrap;align-items:stretch">
      ${chip('🏠','住宅価格',`${housePrice.toLocaleString()}万円`)}
      ${chip('🏦','借入総額',`${loanAmt.toLocaleString()}万円`)}
      ${chip('📊','金利',rateDisp)}
      ${chip('📅','借入期間',`${loanYrsV}年`)}
      ${deliveryYrV>0?chip('🔑','引き渡し',`${deliveryYrV}年`):''}
    </div>
  </div>`;

  h+=`</div><div class="tbl-wrap"><table class="cf">`;
  // 年ヘッダー
  h+=`<tr class="ryr"><th>カテゴリ</th><th>項目</th>`;
  for(let i=0;i<disp;i++)h+=`<th>${R.yr[i]}</th>`;
  h+=`<th>合計</th></tr>`;

  // 経過年数（ネイビー地で年ヘッダーと連続させる）
  h+=`<tr class="relapsed"><td>経過年</td><td></td>`;
  for(let i=0;i<disp;i++)h+=`<td>${i+1}</td>`;h+=`<td style="background:#0f2744;color:#8aa4bc">-</td></tr>`;

  // 年齢
  h+=`<tr class="rage"><td data-row="hAge">年齢</td><td>ご主人様</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.hA[i]}</td>`;h+=`<td></td></tr>`;
  h+=`<tr class="rage"><td data-row="wAge"></td><td>奥様</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.wA[i]}</td>`;h+=`<td></td></tr>`;
  children.forEach((c,ci)=>{h+=`<tr class="rage"><td data-row="cAge${ci}"></td><td>${cLbls[ci]}</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.cA[ci][i]}</td>`;h+=`<td></td></tr>`});

  // イベント：ご主人様
  h+=`<tr class="rev-h"><td>イベント</td><td>ご主人様</td>`;
  for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.evH[i]}</td>`;h+=`<td></td></tr>`;
  // イベント：奥様
  h+=`<tr class="rev-w"><td></td><td>奥様</td>`;
  for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.evW[i]}</td>`;h+=`<td></td></tr>`;
  // イベント：子ども（フェーズ別色クラス付与）
  children.forEach((c,ci)=>{
    h+=`<tr class="rev-c"><td></td><td>${cLbls[ci]}</td>`;
    for(let i=0;i<disp;i++){
      const ca=R.cA[ci][i];
      let cls='',label='';
      // 年度ベース（4月入学）：+1シフト
      const hStartAge=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
      const hType=_v(`hoiku-type-${ci+1}`)||'hoikuen';
      const hLabel=hType==='youchien'?'幼稚園入園':'保育園入園';
      if(ca===0)label='誕生';
      else if(ca>=hStartAge&&ca<=6){cls='ev-hoiku';if(ca===hStartAge)label=hLabel}
      else if(ca>=7&&ca<=12){cls='ev-elem';if(ca===7)label='小学入学'}
      else if(ca>=13&&ca<=15){cls='ev-mid';if(ca===13)label='中学入学'}
      else if(ca>=16&&ca<=18){cls='ev-high';if(ca===16)label='高校入学'}
      else if(ca>=19){
        const un=_v(`cu-${ci+1}`)||'plit_h';
        const univLen=(EDU.univ[un]||[]).length;
        if(univLen>0&&ca<19+univLen){
          cls=un.startsWith('senmon')?'ev-senmon':'ev-univ';
          if(ca===19)label=un.startsWith('senmon')?'専門入学':'大学入学';
        }
      }
      h+=`<td class="${cls}${getColCls(i)}">${label}</td>`;
    }
    h+=`<td></td></tr>`;
  });

  // ─ 収入 ─
  h+=`<tr class="rcat inc-cat"><td></td><td>収　　入</td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const iRow=(lbl,arr,rowKey)=>{const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return'';let r=`<tr class="rinc"><td></td><td>${lbl}</td>`;for(let i=0;i<disp;i++){const v=arr[i];const ov=cfOverrides[rowKey]?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;r+=`<td class="${dv===0?'vz':''}${isOvr?' cell-ovr':''}${getColCls(i)}" contenteditable="true" data-row="${rowKey}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)">${dv>0?ri(dv).toLocaleString():'-'}</td>`}return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${lbl}</span></td></tr>`};
  h+=iRow('ご主人手取年収',R.hInc,'hInc')+iRow('奥様手取年収',R.wInc,'wInc')+iRow('副業・その他収入',R.otherInc,'otherInc')+iRow('保険満期金',R.insMat,'insMat');
  // 有価証券解約：銘柄ごとに個別行で表示
  if(R.secRedeemRows){R.secRedeemRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=iRow(row.lbl,row.vals,row.key);});}
  h+=iRow('退職金（ご主人）',R.rPay,'rPay')+iRow('退職金（奥様）',R.wRPay,'wRPay')+iRow('本人年金',R.pS,'pS')+iRow('配偶者年金',R.pW,'pW')+iRow('遺族年金',R.survPension,'survPension')+iRow('奨学金',R.scholarship,'scholarship')+iRow('児童手当',R.teate,'teate')+iRow('住宅ローン控除',R.lCtrl,'lCtrl');
  h+=`<tr class="rinct"><td>収入合計</td><td></td>`;for(let i=0;i<disp;i++)h+=`<td>${ri(R.incT[i]).toLocaleString()}</td>`;h+=`<td>${ri(R.incT.slice(0,disp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">収入合計</span></td></tr>`;

  // ─ 支出 ─
  h+=`<tr class="rcat exp-cat"><td></td><td>支　　出</td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const eRow=(lbl,arr,rowKey)=>{const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return'';let r=`<tr class="rexp"><td></td><td>${lbl}</td>`;for(let i=0;i<disp;i++){const v=arr[i];const ov=cfOverrides[rowKey]?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;r+=`<td class="${dv===0?'vz':''}${isOvr?' cell-ovr':''}${getColCls(i)}" contenteditable="true" data-row="${rowKey}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)">${dv>0?ri(dv).toLocaleString():'-'}</td>`}return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${lbl}</span></td></tr>`};

  // 教育費専用行レンダラー（年齢に応じて色分け・univコース受け取り）
  const eduRow=(lbl,arr,childAge0,univCourse,rowKey)=>{
    const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return'';
    const un=univCourse||'plit_h';
    const univLen=(EDU.univ[un]||[]).length;
    let r=`<tr class="rexp"><td></td><td>${lbl}</td>`;
    for(let i=0;i<disp;i++){
      const v=arr[i];const ca=childAge0+i;
      const ov=cfOverrides[rowKey||'']?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;
      let cls='';
      if(dv>0){
        if(ca>=1&&ca<=6)cls='edu-hoiku';
        else if(ca>=7&&ca<=12)cls='edu-elem';
        else if(ca>=13&&ca<=15)cls='edu-mid';
        else if(ca>=16&&ca<=18)cls='edu-high';
        else if(ca>=19&&ca<19+univLen)cls=un.startsWith('senmon')?'edu-senmon':'edu-univ';
      } else {cls='vz';}
      if(isOvr)cls+=' cell-ovr';
      cls+=getColCls(i);
      r+=`<td class="${cls}" contenteditable="true" data-row="${rowKey||''}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)">${dv>0?ri(dv).toLocaleString():'-'}</td>`;
    }
    return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${lbl}</span></td></tr>`;
  };
  h+=eRow('生活費',R.lc,'lc')+eRow('積立投資額',R.secInvest,'secInvest')+eRow('一括投資額',R.secBuy,'secBuy')+eRow('家賃（引渡前）',R.rent,'rent')+eRow('住宅ローン返済',R.lRep,'lRep');
  if(isM)h+=eRow('修繕積立金',R.rep,'rep');
  h+=eRow('固定資産税',R.ptx,'ptx')+eRow('家具家電買替',R.furn,'furn')+eRow(isM?'専有部分修繕費':'修繕費',R.senyu,'senyu');
  children.forEach((c,ci)=>{const uc=_v(`cu-${ci+1}`)||'plit_h';h+=eduRow(`${cLbls[ci]}教育費`,R.edu[ci],c.age,uc,`edu${ci}`);});
  h+=eRow('駐車場代',R.prk,'prk');
  if(R.carRows&&R.carRows.length>1){R.carRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else{h+=eRow('車両費（購入・車検）',R.carTotal,'carTotal');}
  h+=eRow('結婚のお祝い',R.wedding,'wedding')+eRow('特別支出',R.ext,'ext');
  h+=`<tr class="rexpt"><td>支出合計</td><td></td>`;for(let i=0;i<disp;i++)h+=`<td>${ri(R.expT[i]).toLocaleString()}</td>`;h+=`<td>${ri(R.expT.slice(0,disp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">支出合計</span></td></tr>`;

  // ─ 収支・残高 ─
  h+=`<tr class="rbal"><td>年間収支</td><td></td>`;
  for(let i=0;i<disp;i++){const v=ri(R.bal[i]);h+=`<td class="${v<0?'vn':v>0?'vp':'vz'}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`}
  const bt=R.bal.slice(0,disp).reduce((a,b)=>a+b,0);
  h+=`<td class="${bt<0?'vn':'vp'}">${bt>=0?ri(bt).toLocaleString():'▲'+Math.abs(ri(bt)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">年間収支</span></td></tr>`;
  h+=`<tr class="rsav"><td>預貯金残高</td><td></td>`;for(let i=0;i<disp;i++){const v=ri(R.sav[i]);h+=`<td class="${v<0?'vn':''}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`}const savLast=ri(R.sav[disp-1]);h+=`<td>${savLast>=0?savLast.toLocaleString():'▲'+Math.abs(savLast).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">預貯金残高</span></td></tr>`;
  if(R.finAsset.some(v=>v>0)){
    // 個別行を表示
    if(R.finAssetRows&&R.finAssetRows.length>0){
      R.finAssetRows.forEach(row=>{
        if(!row.vals.slice(0,disp).some(v=>v>0))return;
        h+=`<tr class="rfin fin-asset-row"><td></td><td>${row.lbl}</td>`;
        for(let i=0;i<disp;i++){const v=ri(row.vals[i]||0);h+=`<td class="${getColCls(i).trim()}">${v>0?v.toLocaleString():'-'}</td>`;}
        h+=`<td>${ri(row.vals[disp-1]||0).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${row.lbl}</span></td></tr>`;
      });
    }
    // 合計行
    h+=`<tr class="rfin fin-asset-row" style="font-weight:700"><td>その他金融資産</td><td></td>`;
    for(let i=0;i<disp;i++){const v=ri(R.finAsset[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`;}
    h+=`<td>${ri(R.finAsset[disp-1]).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">金融資産計</span></td></tr>`;
  }
  // 総金融資産合計
  h+=`<tr class="rttl"><td>総金融資産</td><td></td>`;
  for(let i=0;i<disp;i++){const v=ri(R.totalAsset[i]);h+=`<td class="${v<0?'vn':''}">${v.toLocaleString()}</td>`}
  h+=`<td>${ri(R.totalAsset[disp-1]).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">総金融資産</span></td></tr>`;
  // ローン残高（一番下）
  if(loanAmt>0){h+=`<tr class="rloan"><td>ローン残高</td><td></td>`;for(let i=0;i<disp;i++){const v=ri(R.lBal[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`}h+=`<td></td></tr>`;}

  h+=`</table></div>`;

  // 印刷フッター
  const pi=getPrintInfo();
  h+=`<div class="print-footer">
    <div class="pf-left">
      ${pi.name?`<div style="font-weight:700">${pi.name}</div>`:''}
      ${pi.company?`<div>${pi.company}</div>`:''}
      ${pi.address?`<div>${pi.address}</div>`:''}
      ${pi.tel||pi.email?`<div>${pi.tel?'TEL：'+pi.tel+'　':''}${pi.email?'E-mail：'+pi.email:''}</div>`:''}
    </div>
    <div class="pf-notes">${pi.notes.filter(n=>n.trim()).map(n=>`<div>・${n}</div>`).join('')}</div>
  </div>`;

  // スクロール位置を保存してからDOM置換 → 復元
  const _rb=$('right-body');
  const _prevTop=_rb?_rb.scrollTop:0;
  const _oldTw=_rb?_rb.querySelector('.tbl-wrap'):null;
  const _prevLeft=_oldTw?_oldTw.scrollLeft:0;
  _rb.innerHTML=h;

  // 万が一タブが存在すればタブボタンを表示維持
  if(window._mgStore?.h)$('rt-mg-h').style.display='';
  if(window._mgStore?.w)$('rt-mg-w').style.display='';

  // スクロール位置を復元
  if(_rb&&_prevTop>0)_rb.scrollTop=_prevTop;
  const _newTw=_rb?_rb.querySelector('.tbl-wrap'):null;
  if(_newTw&&_prevLeft>0)_newTw.scrollLeft=_prevLeft;
  _applyFinAssetVisibility();
  _reapplyHighlightAfterRender();
}

// ===== グラフ =====
function renderGraphs(R,disp,isM,total,hAge){
  const totI=R.incT.reduce((a,b)=>a+b,0), totE=R.expT.reduce((a,b)=>a+b,0);
  const finS=R.sav[R.sav.length-1], redY=R.bal.filter(v=>v<0).length;
  const n=disp;
  const lbls=Array.from({length:n},(_,i)=>`${hAge+i}歳`);
  const pr=n>25?0:1.5;

  // ── オプション（animation:false で点滅防止）──────────
  const tickX={font:{size:9},maxTicksLimit:16};
  const tickY={font:{size:9},callback:v=>v.toLocaleString()};
  const tooltipCb={callbacks:{label:ctx=>`${ctx.dataset.label}: ${(ctx.parsed.y||0).toLocaleString()}万円`}};
  const gc='#f1f5f9';
  const opt={responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12,padding:6}},tooltip:tooltipCb},
    scales:{x:{ticks:tickX,grid:{color:gc}},y:{ticks:tickY,grid:{color:gc}}}};
  const stkOpt={responsive:true,maintainAspectRatio:false,animation:false,
    plugins:{legend:{position:'bottom',labels:{font:{size:10},boxWidth:12,padding:6}},tooltip:tooltipCb},
    scales:{x:{stacked:true,ticks:tickX,grid:{color:gc}},y:{stacked:true,ticks:tickY,grid:{color:gc}}}};

  // ── サマリー HTML ───────────────────────────────────
  const sumHtml=`
    <div class="sc inc"><div class="sc-lbl">総収入（${total}年）</div><div class="sc-val" style="color:#2d7dd2">${ri(totI).toLocaleString()}</div><div class="sc-sub">万円</div></div>
    <div class="sc exp"><div class="sc-lbl">総支出（${total}年）</div><div class="sc-val" style="color:var(--red-l)">${ri(totE).toLocaleString()}</div><div class="sc-sub">万円</div></div>
    <div class="sc ${finS>=0?'bal':'dng'}"><div class="sc-lbl">最終預貯金残高</div><div class="sc-val" style="color:${finS>=0?'var(--green)':'var(--red)'}">${ri(finS).toLocaleString()}</div><div class="sc-sub">万円（${hAge+total-1}歳時点）</div></div>
    <div class="sc ${redY>0?'dng':'bal'}"><div class="sc-lbl">マイナスの年</div><div class="sc-val" style="color:${redY>0?'var(--red)':'var(--green)'}">${redY}</div><div class="sc-sub">年 / ${total}年中</div></div>`;

  // ── データセット計算 ─────────────────────────────────
  // Chart1: 収入・支出・年間収支（常に3系列）
  const d1=[
    {label:'収入',data:R.incT.slice(0,n),backgroundColor:'rgba(37,99,235,.55)',borderRadius:2,type:'bar'},
    {label:'支出',data:R.expT.slice(0,n),backgroundColor:'rgba(234,88,12,.55)',borderRadius:2,type:'bar'},
    {label:'年間収支',data:R.bal.slice(0,n),type:'line',borderColor:'#059669',
      backgroundColor:'rgba(5,150,105,.08)',tension:.3,fill:'origin',pointRadius:pr,borderWidth:2,order:0}
  ];
  // Chart2: 資産推移（可変系列）
  const hasFinAsset=R.finAsset&&R.finAsset.some(v=>v>0);
  const hasLoan=R.lBal&&R.lBal.some(v=>v>0);
  const c2ds=[
    {label:'預貯金残高',data:R.sav.slice(0,n),borderColor:'#059669',
      backgroundColor:'rgba(5,150,105,.12)',fill:'origin',tension:.4,borderWidth:2,pointRadius:pr}
  ];
  if(hasFinAsset){
    c2ds.push({label:'有価証券等',data:R.finAsset.slice(0,n),borderColor:'#f59e0b',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:2,pointRadius:pr});
    c2ds.push({label:'総金融資産',data:R.totalAsset.slice(0,n),borderColor:'#2d7dd2',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:2.5,pointRadius:pr});
  }
  if(hasLoan)
    c2ds.push({label:'ローン残高',data:R.lBal.slice(0,n),borderColor:'#7c3aed',
      backgroundColor:'transparent',fill:false,tension:.4,borderWidth:1.5,pointRadius:pr,borderDash:[5,3]});
  // Chart4: 支出内訳（可変系列）
  const eduSum=new Array(n).fill(0);
  R.edu.forEach(arr=>arr.slice(0,n).forEach((v,i2)=>eduSum[i2]+=(v||0)));
  const secInvSum=R.secInvest.slice(0,n).map((v,i)=>(v||0)+(R.secBuy?R.secBuy[i]||0:0));
  const otherExp=R.ptx.slice(0,n).map((v,i)=>(v||0)+(R.prk[i]||0));
  const ds4=[{label:'生活費',data:R.lc.slice(0,n),backgroundColor:'rgba(37,99,235,.55)'}];
  if(R.lRep.some(v=>v>0))ds4.push({label:'ローン返済',data:R.lRep.slice(0,n),backgroundColor:'rgba(124,58,237,.55)'});
  if(eduSum.some(v=>v>0))ds4.push({label:'教育費',data:eduSum,backgroundColor:'rgba(217,119,6,.65)'});
  if(isM&&R.rep.some(v=>v>0))ds4.push({label:'修繕積立金',data:R.rep.slice(0,n),backgroundColor:'rgba(8,145,178,.55)'});
  if(secInvSum.some(v=>v>0))ds4.push({label:'投資額',data:secInvSum,backgroundColor:'rgba(5,150,105,.55)'});
  if(otherExp.some(v=>v>0))ds4.push({label:'その他',data:otherExp,backgroundColor:'rgba(107,114,128,.45)'});
  // Chart5: 収入内訳（可変系列）
  const secTotal=new Array(n).fill(0);
  if(R.secRedeemRows)R.secRedeemRows.forEach(row=>row.vals.slice(0,n).forEach((v,i)=>{secTotal[i]+=(v||0);}));
  else if(R.secRedeem)R.secRedeem.slice(0,n).forEach((v,i)=>{secTotal[i]+=(v||0);});
  const ds5=[];
  if(R.hInc.some(v=>v>0))ds5.push({label:'ご主人様手取',data:R.hInc.slice(0,n),backgroundColor:'rgba(37,99,235,.6)'});
  if(R.wInc.some(v=>v>0))ds5.push({label:'奥様手取',data:R.wInc.slice(0,n),backgroundColor:'rgba(219,39,119,.55)'});
  if(R.otherInc&&R.otherInc.some(v=>v>0))ds5.push({label:'副業・その他',data:R.otherInc.slice(0,n),backgroundColor:'rgba(245,158,11,.65)'});
  if(R.insMat&&R.insMat.some(v=>v>0))ds5.push({label:'保険満期金',data:R.insMat.slice(0,n),backgroundColor:'rgba(8,145,178,.6)'});
  if(secTotal.some(v=>v>0))ds5.push({label:'有価証券解約',data:secTotal,backgroundColor:'rgba(5,150,105,.6)'});

  // ── DOM & Chart 更新（点滅防止：グリッドを保持してデータだけ更新）──
  const gridEl=$('ch-graph-grid');
  if(!gridEl){
    // 初回 or タブ切替後：DOM再構築・チャート新規作成
    Object.values(charts).forEach(c=>{try{c.destroy()}catch(e){}});charts={};
    const _rbg=$('right-body');const _gTop=_rbg?_rbg.scrollTop:0;const _gLeft=_rbg?_rbg.scrollLeft:0;
    $('right-body').innerHTML=
      `<div class="sum-row" id="graph-sum-row" style="margin-bottom:12px">${sumHtml}</div>`+
      `<div id="ch-graph-grid" class="ch-grid">`+
      `<div class="ch-card"><div class="ch-title">📊 収入・支出・年間収支</div><div class="ch-wrap"><canvas id="c1"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">🏦 資産推移</div><div class="ch-wrap"><canvas id="c2"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">📚 支出内訳</div><div class="ch-wrap"><canvas id="c4"></canvas></div></div>`+
      `<div class="ch-card"><div class="ch-title">💰 収入内訳</div><div class="ch-wrap"><canvas id="c5"></canvas></div></div>`+
      `</div>`;
    if(_rbg&&(_gTop>0||_gLeft>0)){_rbg.scrollTop=_gTop;_rbg.scrollLeft=_gLeft;}
    charts.c1=new Chart($('c1'),{type:'bar',data:{labels:lbls,datasets:d1},options:opt});
    charts.c2=new Chart($('c2'),{type:'line',data:{labels:lbls,datasets:c2ds},options:opt});
    charts.c4=new Chart($('c4'),{type:'bar',data:{labels:lbls,datasets:ds4},options:stkOpt});
    charts.c5=new Chart($('c5'),{type:'bar',data:{labels:lbls,datasets:ds5},options:stkOpt});
  } else {
    // グリッド既存：サマリーのみ更新、チャートはデータのみ差し替え
    $('graph-sum-row').innerHTML=sumHtml;
    // Chart1（常に3系列）
    charts.c1.data.labels=lbls;
    d1.forEach((ds,i)=>{if(charts.c1.data.datasets[i])charts.c1.data.datasets[i].data=ds.data;});
    charts.c1.update('none');
    // Chart2（系列数が変わった場合だけ再作成）
    if(charts.c2.data.datasets.length===c2ds.length){
      charts.c2.data.labels=lbls;
      c2ds.forEach((ds,i)=>{charts.c2.data.datasets[i].data=ds.data;});
      charts.c2.update('none');
    } else {
      try{charts.c2.destroy()}catch(e){}
      charts.c2=new Chart($('c2'),{type:'line',data:{labels:lbls,datasets:c2ds},options:opt});
    }
    // Chart4
    if(charts.c4.data.datasets.length===ds4.length){
      charts.c4.data.labels=lbls;
      ds4.forEach((ds,i)=>{charts.c4.data.datasets[i].data=ds.data;});
      charts.c4.update('none');
    } else {
      try{charts.c4.destroy()}catch(e){}
      charts.c4=new Chart($('c4'),{type:'bar',data:{labels:lbls,datasets:ds4},options:stkOpt});
    }
    // Chart5
    if(charts.c5.data.datasets.length===ds5.length){
      charts.c5.data.labels=lbls;
      ds5.forEach((ds,i)=>{charts.c5.data.datasets[i].data=ds.data;});
      charts.c5.update('none');
    } else {
      try{charts.c5.destroy()}catch(e){}
      charts.c5=new Chart($('c5'),{type:'bar',data:{labels:lbls,datasets:ds5},options:stkOpt});
    }
  }
}
