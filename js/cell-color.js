// cell-color.js — CF表・万が一表のセル／行に背景色・文字色を付ける（2026-11-06）
// 右クリック（タッチ端末は長押し）で色メニューを開く。保存データ cfCellColors に入る（state.js）。
// 設計書: docs/superpowers/specs/2026-11-06-cf-cell-color-design.md

// 色の定義（コード1文字で保存。画面用 css と Excel 用 ARGB）
const CC_BG={
  r:{n:'赤',css:'#fde2e2',xl:'FFFDE2E2'},
  o:{n:'オレンジ',css:'#ffe4c7',xl:'FFFFE4C7'},
  y:{n:'黄',css:'#fff6b3',xl:'FFFFF6B3'},
  g:{n:'緑',css:'#d9f2dc',xl:'FFD9F2DC'},
  b:{n:'青',css:'#d6e8fb',xl:'FFD6E8FB'},
  p:{n:'紫',css:'#e8dcf8',xl:'FFE8DCF8'},
  k:{n:'ピンク',css:'#fbdcea',xl:'FFFBDCEA'},
  a:{n:'灰',css:'#e5e7eb',xl:'FFE5E7EB'},
};
const CC_FG={
  r:{n:'赤',css:'#dc2626',xl:'FFDC2626'},
  o:{n:'オレンジ',css:'#ea580c',xl:'FFEA580C'},
  g:{n:'緑',css:'#15803d',xl:'FF15803D'},
  b:{n:'青',css:'#1d4ed8',xl:'FF1D4ED8'},
  p:{n:'紫',css:'#7c3aed',xl:'FF7C3AED'},
  a:{n:'灰',css:'#6b7280',xl:'FF6B7280'},
};

// 保存・復元時に形を整える（壊れたデータや旧データでも {cf:{},mg:{}} にする）
function _ccNormalize(src){
  const out={cf:{},mg:{}};
  if(!src||typeof src!=='object')return out;
  ['cf','mg'].forEach(sc=>{
    const m=src[sc];if(!m||typeof m!=='object')return;
    Object.keys(m).forEach(k=>{
      const v=m[k];if(!v||typeof v!=='object')return;
      const o={};
      if(v.bg&&CC_BG[v.bg])o.bg=v.bg;
      if(v.fg&&CC_FG[v.fg])o.fg=v.fg;
      if(o.bg||o.fg)out[sc][k]=o;
    });
  });
  return out;
}
function _ccStore(){
  if(typeof cfCellColors!=='object'||!cfCellColors)cfCellColors={cf:{},mg:{}};
  if(!cfCellColors.cf)cfCellColors.cf={};
  if(!cfCellColors.mg)cfCellColors.mg={};
  return cfCellColors;
}
// 行名セルのキー → 表のキー（万が一は 'mg-' を外す）
function _ccRowKeyFromLabel(td){
  const k=td.dataset.rowlbl||'';
  if(!k)return null;
  const mg=k.startsWith('mg-');
  return {scope:mg?'mg':'cf',key:mg?k.slice(3):k};
}
function _ccScopeOfCell(td){return td.dataset.mg==='1'?'mg':'cf';}

// セル1つ分の色（セル指定 → 無ければ行指定）
function ccColorOf(scope,key,col){
  const m=_ccStore()[scope];
  const c=m[`${key}|${col}`]||{}, r=m[`${key}|*`]||{};
  const bg=c.bg||r.bg||null, fg=c.fg||r.fg||null;
  return (bg||fg)?{bg,fg}:null;
}
// Excel 用（ARGB）
function ccExcelColor(scope,key,col){
  const v=ccColorOf(scope,key,col);
  if(!v)return null;
  return {bg:v.bg?CC_BG[v.bg].xl:null,fg:v.fg?CC_FG[v.fg].xl:null};
}

// ===== 画面に当てる =====
// root（right-body など）内の表の td にインライン色を当てる。行名セルの既存 !important 背景に勝たせるため important 指定。
// 先に前回当てた分（data-cc）を外してから当て直す。
function applyCellColors(root){
  root=root||document.getElementById('right-body');
  if(!root)return;
  root.querySelectorAll('td[data-cc]').forEach(td=>{
    td.style.removeProperty('background-color');td.style.removeProperty('color');td.removeAttribute('data-cc');
  });
  const st=_ccStore();
  if(!Object.keys(st.cf).length&&!Object.keys(st.mg).length)return;
  const paint=(td,v)=>{
    if(!v)return;
    if(v.bg)td.style.setProperty('background-color',CC_BG[v.bg].css,'important');
    if(v.fg)td.style.setProperty('color',CC_FG[v.fg].css,'important');
    td.setAttribute('data-cc','1');
  };
  root.querySelectorAll('tr').forEach(tr=>{
    const lbl=tr.querySelector('td[data-rowlbl]');
    const rk=lbl?_ccRowKeyFromLabel(lbl):null;
    if(rk){
      const rv=st[rk.scope][`${rk.key}|*`];
      if(rv)paint(lbl,{bg:rv.bg||null,fg:rv.fg||null});
    }
    tr.querySelectorAll('td[data-row][data-col]').forEach(td=>{
      const scope=_ccScopeOfCell(td);
      paint(td,ccColorOf(scope,td.dataset.row,td.dataset.col));
    });
  });
}

// ===== 変更 =====
// target: {scope,key,col} col='*' で行全体
function ccSet(target,prop,val){
  const st=_ccStore();const m=st[target.scope];
  const k=`${target.key}|${target.col}`;
  if(val){
    m[k]=m[k]||{};m[k][prop]=val;
  }else{
    if(m[k]){delete m[k][prop];if(!m[k].bg&&!m[k].fg)delete m[k];}
    // 行の「なし」はその行のセル指定も消す
    if(target.col==='*'){
      Object.keys(m).forEach(kk=>{
        if(kk.startsWith(target.key+'|')&&kk!==k){delete m[kk][prop];if(!m[kk].bg&&!m[kk].fg)delete m[kk];}
      });
    }
  }
  applyCellColors();
  if(typeof pushUndoSnap==='function')try{pushUndoSnap();}catch(e){}
  if(typeof scheduleAutoSave==='function')try{scheduleAutoSave();}catch(e){}
}

// ===== メニュー =====
let _ccMenuEl=null,_ccTarget=null;
function ccCloseMenu(){if(_ccMenuEl){_ccMenuEl.remove();_ccMenuEl=null;}_ccTarget=null;}
function _ccTargetOf(td){
  if(td.dataset.rowlbl){
    const rk=_ccRowKeyFromLabel(td);if(!rk)return null;
    const name=(td.textContent||'').replace(/\s+/g,' ').trim();
    return {scope:rk.scope,key:rk.key,col:'*',title:`「${name}」の行ぜんぶ`};
  }
  if(td.dataset.row!==undefined&&td.dataset.col!==undefined){
    const tr=td.closest('tr');const lbl=tr?tr.querySelector('td[data-rowlbl]'):null;
    const name=lbl?(lbl.textContent||'').replace(/\s+/g,' ').trim():td.dataset.row;
    // 年の見出し（thead の同じ列）
    let yr='';
    try{
      const tbl=td.closest('table');const idx=td.cellIndex;
      const hr=tbl&&tbl.tHead?tbl.tHead.rows[0]:null;
      if(hr&&hr.cells[idx])yr=(hr.cells[idx].textContent||'').trim();
    }catch(e){}
    return {scope:_ccScopeOfCell(td),key:td.dataset.row,col:String(td.dataset.col),title:`「${name}」${yr?' '+yr:''}のセル`};
  }
  return null;
}
function ccOpenMenu(td,x,y){
  ccCloseMenu();
  const t=_ccTargetOf(td);if(!t)return;
  _ccTarget=t;
  const m=document.createElement('div');m.className='cc-menu';m.id='cc-menu';
  m.innerHTML=_ccMenuHtml();
  m.addEventListener('contextmenu',e=>e.preventDefault());
  document.body.appendChild(m);_ccMenuEl=m;
  // 画面からはみ出さない位置に
  const w=m.offsetWidth,h=m.offsetHeight;
  const vw=window.innerWidth,vh=window.innerHeight;
  m.style.left=Math.max(4,Math.min(x,vw-w-4))+'px';
  m.style.top=Math.max(4,Math.min(y,vh-h-4))+'px';
}
function _ccMenuHtml(){
  const t=_ccTarget;const m=_ccStore()[t.scope];const cur=m[`${t.key}|${t.col}`]||{};
  const sw=(prop,code,def)=>`<div class="cc-sw${cur[prop]===code?' on':''}" title="${def.n}" style="${prop==='bg'?`background:${def.css}`:`color:${def.css}`}" onclick="ccPick('${prop}','${code}')">${prop==='fg'?'文':''}</div>`;
  const none=(prop,lbl)=>`<div class="cc-sw cc-none${!cur[prop]?' on':''}" title="${lbl}" onclick="ccPick('${prop}','')">なし</div>`;
  return `<div class="cc-ttl">${t.title}</div>
    <div class="cc-lbl">背景の色</div>
    <div class="cc-row">${Object.keys(CC_BG).map(c=>sw('bg',c,CC_BG[c])).join('')}${none('bg','背景なし')}</div>
    <div class="cc-lbl">文字の色</div>
    <div class="cc-row">${Object.keys(CC_FG).map(c=>sw('fg',c,CC_FG[c])).join('')}${none('fg','黒（なし）')}</div>
    <div class="cc-close"><button type="button" onclick="ccCloseMenu()">閉じる</button></div>`;
}
function ccPick(prop,code){
  if(!_ccTarget)return;
  ccSet(_ccTarget,prop,code||null);
  if(_ccMenuEl)_ccMenuEl.innerHTML=_ccMenuHtml(); // 選択状態を更新（開いたまま）
}

// ===== イベント（右クリック・長押し） =====
(function(){
  function cellOf(e){
    const td=e.target&&e.target.closest?e.target.closest('td'):null;
    if(!td||!td.closest('#right-body table'))return null;
    if(td.dataset.rowlbl||(td.dataset.row!==undefined&&td.dataset.col!==undefined))return td;
    return null;
  }
  document.addEventListener('contextmenu',e=>{
    const td=cellOf(e);if(!td)return;
    e.preventDefault();
    ccOpenMenu(td,e.clientX,e.clientY);
  });
  // 長押し（タッチ）
  let lpTimer=null,lpX=0,lpY=0;
  document.addEventListener('touchstart',e=>{
    const td=cellOf(e);if(!td||e.touches.length!==1)return;
    lpX=e.touches[0].clientX;lpY=e.touches[0].clientY;
    clearTimeout(lpTimer);
    lpTimer=setTimeout(()=>{lpTimer=null;ccOpenMenu(td,lpX,lpY);},500);
  },{passive:true});
  const cancel=()=>{if(lpTimer){clearTimeout(lpTimer);lpTimer=null;}};
  document.addEventListener('touchmove',e=>{
    if(!lpTimer||!e.touches[0])return;
    if(Math.abs(e.touches[0].clientX-lpX)>8||Math.abs(e.touches[0].clientY-lpY)>8)cancel();
  },{passive:true});
  document.addEventListener('touchend',cancel,{passive:true});
  document.addEventListener('touchcancel',cancel,{passive:true});
  // メニュー外を押したら閉じる
  document.addEventListener('pointerdown',e=>{
    if(_ccMenuEl&&!_ccMenuEl.contains(e.target))ccCloseMenu();
  },{capture:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')ccCloseMenu();});
})();

// Excel 用: 万が一表の「行名 → rowKey」対応（_mgStore のHTMLから読む）
function ccMgLabelMap(){
  const map={};
  try{
    const st=window._mgStore||{};
    ['h','w'].forEach(k=>{
      const html=st[k];if(!html)return;
      const doc=new DOMParser().parseFromString(html,'text/html');
      doc.querySelectorAll('td[data-rowlbl]').forEach(td=>{
        const rk=_ccRowKeyFromLabel(td);if(!rk||rk.scope!=='mg')return;
        const name=(td.textContent||'').replace(/\s+/g,' ').trim();
        if(name&&map[name]===undefined)map[name]=rk.key;
      });
    });
  }catch(e){}
  return map;
}
