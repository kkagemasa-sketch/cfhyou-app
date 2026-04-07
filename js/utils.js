// utils.js — ユーティリティ関数

function $(id){return document.getElementById(id)}
function _v(id){return $(id)?.value||''}
function iv(id){return parseInt(String($(id)?.value||'').replace(/,/g,''))||0}
function fv(id){return parseFloat(String($(id)?.value||'').replace(/,/g,''))||0}
function tog(h){const b=h.nextElementSibling,t=h.querySelector('.stog'),o=!b.classList.contains('col');b.classList.toggle('col',o);t.classList.toggle('on',!o)}
function ri(n){return Math.round(n)}// 整数丸め（小数点なし）
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
  if(raw==='-'||raw===''){
    // 上書き削除（自動計算に戻す）
    if(ovr[row])delete ovr[row][col];
    td.classList.remove('cell-ovr');
  } else if(!isNaN(num)){
    if(!ovr[row])ovr[row]={};
    ovr[row][col]=num;
    td.classList.add('cell-ovr');
    td.textContent=num.toLocaleString();
  }
  pushUndoSnap();
  if(isMG)renderContingency();
  else render();
}
function resetOverrides(){if(!confirm('CF表の手動上書きをすべてリセットしますか？'))return;cfOverrides={};mgOverrides={};render();}
function rowLabelEdit(td){
  const key=td.dataset.rowlbl;if(!key)return;
  const txt=td.textContent.trim();
  const def=td.dataset.default||'';
  if(!txt||txt===def){delete _cfRowLabels[key];}
  else{_cfRowLabels[key]=txt;}
  scheduleAutoSave();
}

// カスタム行操作
function addCustomRow(type){
  _cfCustomId++;
  const id=type==='inc'?'cinc_'+_cfCustomId:'cexp_'+_cfCustomId;
  cfCustomRows.push({id:id,type:type,label:type==='inc'?'カスタム収入':'カスタム支出'});
  pushUndoSnap();render();
}
function customLabelEdit(td){
  const id=td.dataset.customId;
  const row=cfCustomRows.find(r=>r.id===id);
  if(!row)return;
  const txt=td.textContent.trim();
  row.label=txt||(row.type==='inc'?'カスタム収入':'カスタム支出');
  pushUndoSnap();
}
function deleteCustomRow(id){
  if(!confirm('この行を削除しますか？'))return;
  cfCustomRows=cfCustomRows.filter(r=>r.id!==id);
  delete cfOverrides[id];
  pushUndoSnap();render();
}

function _getInputHash(){
  let s='';
  document.querySelectorAll('input,select').forEach(el=>{if(el.id)s+=el.id+'='+el.value+'|';});
  return s;
}
