// utils.js — ユーティリティ関数

function $(id){return document.getElementById(id)}
function _v(id){return $(id)?.value||''}
function iv(id){return parseInt(String($(id)?.value||'').replace(/,/g,''))||0}
function fv(id){return parseFloat(String($(id)?.value||'').replace(/,/g,''))||0}
function tog(h){const b=h.nextElementSibling,t=h.querySelector('.stog'),o=!b.classList.contains('col');b.classList.toggle('col',o);t.classList.toggle('on',!o)}
function ri(n){return Math.round(n)}// 整数丸め（小数点なし）
// 老齢厚生年金相当額を計算（収入ステップ→月収→年金設定から逆算のフォールバック）
function calcKosei(person, startAge, retAge, fallbackPension, kisoAmt){
  const CAREER_FACTOR=0.75;
  const avg=calcAvgHyojun(person, startAge, retAge);
  const joinM=Math.min(480,Math.max((retAge-startAge)*12,300));
  if(avg!==null) return avg*5.481/1000*joinM;
  const gM=fv(`${person}-gross-monthly`)||0, gB=fv(`${person}-gross-bonus`)||0;
  if(gM>0){const hyojun=(Math.min(gM,65)*12+Math.min(gB,300))/12*CAREER_FACTOR;return hyojun*5.481/1000*joinM;}
  return Math.max(0,fallbackPension-kisoAmt);
}
// 空欄→デフォルト値、0を明示入力→0を返す（隠れた初期値問題の対策）
function ivd(id,def){const el=$(id);if(!el||el.value==='')return def;return parseInt(String(el.value).replace(/,/g,''))||0;}
function fvd(id,def){const el=$(id);if(!el||el.value==='')return def;return parseFloat(String(el.value).replace(/,/g,''))||0;}

// 手取り補間
function gn(g){if(!g||g<=0)return 0;for(let i=0;i<TAX.length-1;i++){if(g<=TAX[i][0])return TAX[i][1];if(g<TAX[i+1][0]){const r=(g-TAX[i][0])/(TAX[i+1][0]-TAX[i][0]);return Math.round(TAX[i][1]+r*(TAX[i+1][1]-TAX[i][1]))}}return TAX[TAX.length-1][1]}

function getLCtrlRow(yr, tp, isKosodate){
  const key = `${Math.min(Math.max(yr,2024),2030)}_${isKosodate?'kosodate':'general'}`;
  const row = (LCTRL_TABLE[key]||LCTRL_TABLE['2025_general'])[tp]||[0,0];
  return row;
}

function selectAll(el){
  // contenteditable td のテキストを全選択
  try{
    const range=document.createRange();
    range.selectNodeContents(el);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }catch(e){}
}
function cellEdit(td){
  const row=td.dataset.row, col=parseInt(td.dataset.col);
  if(!row&&row!=='0')return;
  const isMG=td.dataset.mg==='1';
  const ovr=isMG?mgOverrides:cfOverrides;
  const raw=td.textContent.replace(/,/g,'').trim();
  const num=parseFloat(raw);
  const hadOvr=ovr[row]?.[col]!==undefined;
  if(raw===''){
    // 明示的に空にした → 0として上書き（自動計算値に戻さない）
    if(!ovr[row])ovr[row]={};
    ovr[row][col]=0;
    td.classList.add('cell-ovr');
    td.textContent='0';
  } else if(raw==='-'){
    // '-' のまま blur（変更なし） → 既存上書きは維持、無ければ何もしない
    if(!hadOvr)return;
  } else if(!isNaN(num)){
    if(!ovr[row])ovr[row]={};
    ovr[row][col]=num;
    td.classList.add('cell-ovr');
    td.textContent=num.toLocaleString();
  } else {
    return;
  }
  pushUndoSnap();
  if(isMG)renderContingency();
  else render();
}
function resetOverrides(){if(!confirm('CF表の手動上書きをすべてリセットしますか？'))return;cfOverrides={};mgOverrides={};if(rTab==='mg-h'||rTab==='mg-w')renderContingency();else render();}
function rowLabelEdit(td){
  const key=td.dataset.rowlbl;if(!key)return;
  const txt=td.textContent.trim();
  const def=td.dataset.default||'';
  if(!txt||txt===def){delete _cfRowLabels[key];}
  else{_cfRowLabels[key]=txt;}
  scheduleAutoSave();
}

// CF表の先頭年ヘッダーをクリック編集で変更
function setCfStartYearFromCell(th){
  const raw=String(th.textContent||'').trim();
  const y=parseInt(raw.replace(/[^\d]/g,''));
  const cur=getCfStartYear();
  if(isNaN(y) || y<1900 || y>2200){
    // 無効値は元に戻す
    th.textContent=cur;
    return;
  }
  if(y===cur){
    th.textContent=y;
    return;
  }
  _cfStartYear=y;
  pushUndoSnap();
  scheduleAutoSave();
  // CF表を即座に再描画（live() は遅延なのでここでは直接呼ぶ）
  if(typeof render==='function') render();
  if(typeof live==='function') live();
}

// カスタム行操作
function addCustomRow(type){
  _cfCustomId++;
  const isMG=rTab==='mg-h'||rTab==='mg-w';
  const prefix=isMG?'m':'c';
  const id=type==='inc'?prefix+'inc_'+_cfCustomId:prefix+'exp_'+_cfCustomId;
  const target=isMG?mgCustomRows:cfCustomRows;
  target.push({id:id,type:type,label:type==='inc'?'カスタム収入':'カスタム支出'});
  pushUndoSnap();
  if(isMG)renderContingency();else render();
}
function customLabelEdit(td){
  const id=td.dataset.customId;
  const row=cfCustomRows.find(r=>r.id===id)||mgCustomRows.find(r=>r.id===id);
  if(!row)return;
  const txt=td.textContent.trim();
  row.label=txt||(row.type==='inc'?'カスタム収入':'カスタム支出');
  pushUndoSnap();
  scheduleAutoSave();
}
function deleteCustomRow(id){
  if(!confirm('この行を削除しますか？'))return;
  const inMg=mgCustomRows.some(r=>r.id===id);
  if(inMg){mgCustomRows=mgCustomRows.filter(r=>r.id!==id);delete mgOverrides[id];}
  else{cfCustomRows=cfCustomRows.filter(r=>r.id!==id);delete cfOverrides[id];}
  pushUndoSnap();
  if(rTab==='mg-h'||rTab==='mg-w')renderContingency();else render();
}

function _getInputHash(){
  let s='';
  document.querySelectorAll('input,select').forEach(el=>{if(el.id)s+=el.id+'='+el.value+'|';});
  return s;
}
