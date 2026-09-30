// lc-tab.js — 生活費タブ（お客様確認用）
// 入力パネルの生活費欄と双方向バインディング

// 項目定義: {id: パネル側のinput ID, label: 表示名, type: 'm'(月額)/'y'(年額), nameId?: その他の項目名ID}
const LC_MONTHLY_ITEMS=[
  {id:'lc-food',label:'食費'},
  {id:'lc-water',label:'水道代'},
  {id:'lc-gas',label:'ガス代'},
  {id:'lc-elec',label:'電気代'},
  {id:'lc-fuel',label:'燃料費（ガソリン代等）'},
  {id:'lc-comm',label:'通信費'},
  {id:'lc-misc',label:'雑費（消耗品など）'},
  {id:'lc-pocket',label:'小遣い'},
  {id:'lc-ins-m',label:'月払い保険料'},
  {id:'mgmt-fee',label:'管理費',cond:'mansion'},
  {id:'mgmt-net',label:'インターネット代',cond:'mansion'},
  {id:'lc-other-m',label:'その他１',nameId:'lc-other-m-name',other:true},
  {id:'lc-other-m2',label:'その他２',nameId:'lc-other-m2-name',other:true},
  {id:'lc-other-m3',label:'その他３',nameId:'lc-other-m3-name',other:true},
  {id:'lc-other-m4',label:'その他４',nameId:'lc-other-m4-name',other:true}
];
const LC_YEARLY_ITEMS=[
  {id:'lc-travel',label:'娯楽費用'},
  {id:'lc-social',label:'交際費'},
  {id:'lc-clothes',label:'被服費'},
  {id:'lc-ins-y',label:'年払保険料'},
  {id:'lc-medical',label:'医療費'},
  {id:'lc-home',label:'帰省費用'},
  {id:'lc-car-tax',label:'自動車税'},
  {id:'lc-other-y',label:'その他１',nameId:'lc-other-y-name',other:true},
  {id:'lc-other-y2',label:'その他２',nameId:'lc-other-y2-name',other:true},
  {id:'lc-other-y3',label:'その他３',nameId:'lc-other-y3-name',other:true},
  {id:'lc-other-y4',label:'その他４',nameId:'lc-other-y4-name',other:true}
];

function renderLCTab(){
  const rb=$('right-body');if(!rb)return;
  const isM=ST.type==='mansion';

  function getVal(id){
    const el=document.getElementById(id);if(!el)return 0;
    return parseFloat(String(el.value).replace(/,/g,''))||0;
  }
  function getName(nameId){
    if(!nameId)return '';
    const el=document.getElementById(nameId);
    return el?el.value:'';
  }
  function getBikou(id){
    return _lcBikou[id]||'';
  }

  function escAttr(s){return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  // 行HTML生成（見た目は印刷・PDFの「生活費の内訳」と同じデザイン。入力欄とdata-*はそのまま）
  function row(item){
    if(item.cond==='mansion'&&!isM)return '';
    const val=getVal(item.id);
    const bikou=getBikou(item.id);
    let labelHtml;
    if(item.other){
      labelHtml=`その他（<input class="lct-name" data-nameid="${item.nameId}" value="${escAttr(getName(item.nameId))}" placeholder="項目名" oninput="syncLCTabName(this)">）`;
    }else{
      labelHtml=item.label;
    }
    return `<tr class="${val?'':'z'}">
      <td class="lbl">${labelHtml}</td>
      <td class="num"><input class="lct-amt" data-srcid="${item.id}" value="${val?'¥'+val.toLocaleString():''}" placeholder="－" onfocus="this.value=this.value.replace(/[¥,]/g,'')" onblur="syncLCTabAmt(this)"></td>
      <td class="bik"><input class="lct-bik" data-bikid="${item.id}" value="${escAttr(bikou)}" placeholder="備考を入力" oninput="_lcBikou['${item.id}']=this.value;scheduleAutoSave()"></td>
    </tr>`;
  }

  // 月額小計
  let mTotal=0;
  LC_MONTHLY_ITEMS.forEach(item=>{
    if(item.cond==='mansion'&&!isM)return;
    mTotal+=getVal(item.id);
  });
  // 年額小計
  let yTotal=0;
  LC_YEARLY_ITEMS.forEach(item=>{yTotal+=getVal(item.id);});
  // FP記入欄（年間合計）
  const mYearTotal=mTotal*12;
  const grandTotal=mYearTotal+yTotal;

  const tbl=(cls,title,unit,items,subLbl,subVal,totLbl,totVal)=>{
    let t=`<table class="lct-tbl ${cls}">
      <tr class="h"><td>${title}</td><td class="num">${unit}</td><td>備考</td></tr>`;
    items.forEach(item=>{t+=row(item);});
    t+=`<tr class="s"><td>${subLbl}</td><td class="num">¥${subVal.toLocaleString()}</td><td></td></tr>
      <tr class="t"><td>${totLbl}</td><td class="num">¥${totVal.toLocaleString()}</td><td></td></tr>
    </table>`;
    return t;
  };

  const _scenNm=(typeof _activeScenName==='function')?_activeScenName():'';
  let h=`<div class="lct-wrap">
  <div class="lct-head"><div class="t">生活費</div>${_scenNm?`<div class="sc">${_scenNm}</div>`:''}<div class="hint">金額・備考はこの画面で直接入力できます（入力パネルと連動）</div></div>
  <div class="lct-cards">
    <div class="card fix"><div class="k">毎月の固定費</div><div class="v">¥${mTotal.toLocaleString()}<small>／月</small></div><div class="s">年間 ¥${mYearTotal.toLocaleString()}（×12か月）</div></div>
    <div class="card var"><div class="k">年間の変動費</div><div class="v">¥${yTotal.toLocaleString()}<small>／年</small></div><div class="s">旅行・被服・医療など年単位の支出</div></div>
    <div class="card tot"><div class="k">生活費の年間合計</div><div class="v">¥${grandTotal.toLocaleString()}</div><div class="s">約${Math.round(grandTotal/10000).toLocaleString()}万円（固定費＋変動費）</div></div>
  </div>
  <div class="lct-cols">
    ${tbl('fix','毎月の固定費','月額（円）',LC_MONTHLY_ITEMS,'小計（月額）',mTotal,'年間（×12か月）',mYearTotal)}
    ${tbl('var','年間の変動費','年額（円）',LC_YEARLY_ITEMS,'小計（年額）',yTotal,'合計（固定費＋変動費）',grandTotal)}
  </div>
  </div>`;
  rb.innerHTML=h;
}

// 生活費タブ→入力パネルへの同期（金額）
function syncLCTabAmt(el){
  const srcId=el.dataset.srcid;
  const raw=el.value.replace(/[¥,]/g,'');
  const v=parseFloat(raw)||0;
  el.value=v?'¥'+v.toLocaleString():'';
  const src=document.getElementById(srcId);
  if(src){src.value=v||'';live();}
}
// 生活費タブ→入力パネルへの同期（その他の項目名）
function syncLCTabName(el){
  const nameId=el.dataset.nameid;
  const src=document.getElementById(nameId);
  if(src){src.value=el.value;live();}
}

// 備考データはstate.jsの_lcBikouに保持、save-loadで永続化
