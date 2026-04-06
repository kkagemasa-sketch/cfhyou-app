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
  // 行HTML生成
  function row(item){
    if(item.cond==='mansion'&&!isM)return '';
    const val=getVal(item.id);
    const bikou=getBikou(item.id);
    let labelHtml;
    if(item.other){
      labelHtml=`その他（<input data-nameid="${item.nameId}" value="${escAttr(getName(item.nameId))}" placeholder="項目名" style="border:none;border-bottom:1px dashed #aaa;background:#f0f7ff;font-size:12px;width:70px;outline:none;font-family:inherit;padding:1px 3px" oninput="syncLCTabName(this)">）`;
    }else{
      labelHtml=item.label;
    }
    return `<tr>
      <td style="padding:4px 8px;border:1px solid #c5c5c5;font-size:12px;white-space:nowrap">${labelHtml}</td>
      <td style="padding:4px 8px;border:1px solid #c5c5c5;text-align:right;font-size:12px;white-space:nowrap;background:#f0f7ff"><input data-srcid="${item.id}" value="${val?'¥'+val.toLocaleString():''}" style="border:none;background:transparent;text-align:right;font-size:12px;width:100%;outline:none;font-family:inherit" onfocus="this.value=this.value.replace(/[¥,]/g,'')" onblur="syncLCTabAmt(this)"></td>
      <td style="padding:4px 8px;border:1px solid #c5c5c5;font-size:11px;background:#f0f7ff"><input data-bikid="${item.id}" value="${escAttr(bikou)}" placeholder="備考を入力" style="border:none;background:transparent;font-size:11px;width:100%;outline:none;font-family:inherit;color:#555" oninput="_lcBikou['${item.id}']=this.value;scheduleAutoSave()"></td>
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

  let h=`<div style="max-width:600px;margin:20px auto;font-family:inherit">
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <tr style="background:#fff8c4">
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:13px">毎月の固定費</td>
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;text-align:center;font-size:13px;width:130px">円</td>
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;text-align:center;font-size:13px;width:200px">備考</td>
    </tr>`;
  LC_MONTHLY_ITEMS.forEach(item=>{h+=row(item);});
  h+=`<tr style="background:#f0f0e8">
      <td style="padding:5px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:13px">小計</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;text-align:right;font-weight:700;font-size:13px">¥${mTotal.toLocaleString()}</td>
      <td style="border:1px solid #c5c5c5"></td>
    </tr>
    <tr style="background:#fff8c4">
      <td style="padding:5px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:12px">合計（年間）</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;text-align:right;font-weight:700;font-size:13px;color:#0d6a0d">¥${mYearTotal.toLocaleString()}</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;background:#fff8c4"></td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:16px;margin-bottom:6px">
    <tr style="background:#fff8c4">
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:13px">年間の変動費</td>
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;text-align:center;font-size:13px;width:130px">円</td>
      <td style="padding:6px 8px;border:1px solid #c5c5c5;font-weight:700;text-align:center;font-size:13px;width:200px">備考</td>
    </tr>`;
  LC_YEARLY_ITEMS.forEach(item=>{h+=row(item);});
  h+=`<tr style="background:#f0f0e8">
      <td style="padding:5px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:13px">小計</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;text-align:right;font-weight:700;font-size:13px">¥${yTotal.toLocaleString()}</td>
      <td style="border:1px solid #c5c5c5"></td>
    </tr>
    <tr style="background:#fff8c4">
      <td style="padding:5px 8px;border:1px solid #c5c5c5;font-weight:700;font-size:12px">合計（固定費＋変動費）</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;text-align:right;font-weight:700;font-size:13px;color:#0d6a0d">¥${grandTotal.toLocaleString()}</td>
      <td style="padding:5px 8px;border:1px solid #c5c5c5;background:#fff8c4"></td>
    </tr>
  </table>
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
