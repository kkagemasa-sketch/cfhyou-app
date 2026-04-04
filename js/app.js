// app.js — アプリ初期化
window.onload=()=>{
  renderScenarioTabs();
  addChild();addChild();
  // 収入ステップの初期値
  addIncomeStep('h');addIncomeStep('h');
  addIncomeStep('w');addIncomeStep('w');
  // 特別支出の初期値（1件）
  addExtraItem(new Date().getFullYear(),'','');
  // 初期値を設定
  calcLoanAmt();
  addCar();
  calcDelivery();
  setTimeout(()=>{
    if(_autoSaveRestored)return; // 自動保存復元済みならデフォルト値で上書きしない
    const hA=parseInt($('husband-age')?.value)||30;
    const wA=parseInt($('wife-age')?.value)||29;
    // ご主人様：30歳→50歳 700万→1000万
    const h1f=document.getElementById('h-is-1-from');if(h1f)h1f.value=hA;
    const h1t=document.getElementById('h-is-1-to');if(h1t)h1t.value=hA+20;
    const h1gf=document.getElementById('h-is-1-net-from');if(h1gf)h1gf.value=541;
    const h1gt=document.getElementById('h-is-1-net-to');if(h1gt)h1gt.value=739;
    // 段階2：50歳→65歳 1000万→800万
    const h2f=document.getElementById('h-is-2-from');if(h2f)h2f.value=hA+21;
    const h2t=document.getElementById('h-is-2-to');if(h2t)h2t.value=65;
    const h2gf=document.getElementById('h-is-2-net-from');if(h2gf)h2gf.value=739;
    const h2gt=document.getElementById('h-is-2-net-to');if(h2gt)h2gt.value=630;
    // 奥様：29歳→60歳 400万→600万
    const w1f=document.getElementById('w-is-1-from');if(w1f)w1f.value=wA;
    const w1t=document.getElementById('w-is-1-to');if(w1t)w1t.value=60;
    const w1gf=document.getElementById('w-is-1-net-from');if(w1gf)w1gf.value=322;
    const w1gt=document.getElementById('w-is-1-net-to');if(w1gt)w1gt.value=471;
    // 段階2：61歳→65歳
    const w1tVal=parseInt(document.getElementById('w-is-1-to')?.value)||60;
    const w2f=document.getElementById('w-is-2-from');if(w2f)w2f.value=w1tVal+1;
    const w2t=document.getElementById('w-is-2-to');if(w2t)w2t.value=65;
    const w2gf=document.getElementById('w-is-2-net-from');if(w2gf)w2gf.value=471;
    const w2gt=document.getElementById('w-is-2-net-to');if(w2gt)w2gt.value=471;
    // ヒント更新
    ['h-is-1','h-is-2','w-is-1','w-is-2'].forEach(id=>calcStepHint(id));
    live();
  },100);
  live();
  updateLctrlHint();
  initInputHighlight();

  initLCComma();
  initScrollSpy();

  // 印刷用情報を復元
  _loadPrintInfo();

  // IndexedDB初期化：localStorage移行 → 自動保存復元
  (async()=>{
    try{
      await _migrateFromLocalStorage();
      await restoreAutoSave();
    }catch(e){console.warn('初期化エラー:',e);}
  })();

  // 自動保存：入力変更を検知
  document.querySelector('.panel-l')?.addEventListener('input',()=>scheduleAutoSave());
  document.querySelector('.panel-l')?.addEventListener('change',()=>scheduleAutoSave());

  // ペアローン状態に応じて団信UIを切り替え
  if(typeof updateMGDansinUI==='function')updateMGDansinUI();
};

// CF表セル: キーボード操作（document委譲・onload外で確実に登録）
document.addEventListener('keydown',function(e){
  var td=e.target;
  if(!td.hasAttribute||!td.hasAttribute('contenteditable'))return;

  // Enter → 確定（改行防止）
  if(e.key==='Enter'){
    e.preventDefault();
    td.blur();
    return;
  }

  // 矢印キー → セル移動
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)===-1)return;
  e.preventDefault();
  td.blur(); // 現在のセルを確定

  var row=td.parentElement;
  var table=td.closest('table');
  if(!row||!table)return;
  var cells=Array.from(row.children);
  var ci=cells.indexOf(td);
  var rows=Array.from(table.querySelectorAll('tr'));
  var ri=rows.indexOf(row);

  var nextTd=null;
  if(e.key==='ArrowRight'){
    // 同じ行で右の編集可能セルを探す
    for(var i=ci+1;i<cells.length;i++){if(cells[i].hasAttribute('contenteditable')){nextTd=cells[i];break;}}
  }else if(e.key==='ArrowLeft'){
    for(var i=ci-1;i>=0;i--){if(cells[i].hasAttribute('contenteditable')){nextTd=cells[i];break;}}
  }else if(e.key==='ArrowDown'){
    for(var i=ri+1;i<rows.length;i++){var c=rows[i].children[ci];if(c&&c.hasAttribute('contenteditable')){nextTd=c;break;}}
  }else if(e.key==='ArrowUp'){
    for(var i=ri-1;i>=0;i--){var c=rows[i].children[ci];if(c&&c.hasAttribute('contenteditable')){nextTd=c;break;}}
  }
  if(nextTd){nextTd.focus();selectAll(nextTd);}
});

// ===== Fill Handle（ドラッグコピー） =====
(function(){
  var _fh=null;       // fill handleのDOM要素
  var _srcTd=null;    // ドラッグ元セル
  var _srcVal=0;      // ドラッグ元の値
  var _dragging=false;
  var _preview=[];    // プレビュー中のセル

  // フォーカス時にfill handleを表示
  document.addEventListener('focusin',function(e){
    var td=e.target;
    if(!td.hasAttribute||!td.hasAttribute('contenteditable')||!td.dataset.row)return;
    _removeFH();
    _fh=document.createElement('div');
    _fh.className='fill-handle';
    td.style.overflow='visible';
    td.appendChild(_fh);

    _fh.addEventListener('mousedown',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      _dragging=true;
      _srcTd=td;
      var raw=td.textContent.replace(/,/g,'').trim();
      _srcVal=parseFloat(raw)||0;
      _preview=[];
      document.addEventListener('mousemove',_onMove);
      document.addEventListener('mouseup',_onUp);
    });
  });

  function _removeFH(){
    if(_fh&&_fh.parentElement){_fh.parentElement.style.overflow='';_fh.remove();}
    _fh=null;
  }

  function _onMove(e){
    if(!_dragging||!_srcTd)return;
    // プレビュークリア
    _preview.forEach(function(t){t.classList.remove('fill-preview');});
    _preview=[];
    // マウス位置から対象セルを特定（同じ行の右方向のみ）
    var row=_srcTd.parentElement;
    var cells=Array.from(row.children);
    var si=cells.indexOf(_srcTd);
    var mouseX=e.clientX;
    for(var i=si+1;i<cells.length;i++){
      var c=cells[i];
      if(!c.hasAttribute('contenteditable'))continue;
      var rect=c.getBoundingClientRect();
      if(rect.left>mouseX)break;
      _preview.push(c);
      c.classList.add('fill-preview');
    }
  }

  function _onUp(){
    document.removeEventListener('mousemove',_onMove);
    document.removeEventListener('mouseup',_onUp);
    if(!_dragging)return;
    _dragging=false;
    // プレビューセルに値を適用
    var rowKey=_srcTd.dataset.row;
    _preview.forEach(function(td){
      td.classList.remove('fill-preview');
      var col=parseInt(td.dataset.col);
      if(!cfOverrides[rowKey])cfOverrides[rowKey]={};
      cfOverrides[rowKey][col]=_srcVal;
    });
    _preview=[];
    if(_srcTd)render();
    _srcTd=null;
  }
})();

// ===== 範囲選択 + 一括削除 =====
(function(){
  var _selected=[];
  var _anchorTd=null; // 最初にクリックしたセル

  function _clearSel(){
    _selected.forEach(function(td){td.classList.remove('cell-selected');});
    _selected=[];
  }
  // グローバルからアクセス可能にする
  window._cfClearSel=_clearSel;
  window._cfGetSelected=function(){return _selected;};

  function _selectRange(startTd,endTd){
    _clearSel();
    var tbl=startTd.closest('table');
    if(!tbl)return;
    var rows=Array.from(tbl.querySelectorAll('tr'));
    var r1=rows.indexOf(startTd.parentElement);
    var r2=rows.indexOf(endTd.parentElement);
    var c1=Array.from(startTd.parentElement.children).indexOf(startTd);
    var c2=Array.from(endTd.parentElement.children).indexOf(endTd);
    var rMin=Math.min(r1,r2), rMax=Math.max(r1,r2);
    var cMin=Math.min(c1,c2), cMax=Math.max(c1,c2);
    for(var r=rMin;r<=rMax;r++){
      var cells=rows[r].children;
      for(var c=cMin;c<=cMax;c++){
        var td=cells[c];
        if(td&&td.hasAttribute('contenteditable')){
          td.classList.add('cell-selected');
          _selected.push(td);
        }
      }
    }
  }

  // クリック → アンカー記憶、Shift+クリック → 範囲選択
  document.addEventListener('click',function(e){
    var td=e.target;
    if(!td.hasAttribute||!td.hasAttribute('contenteditable')||!td.dataset.row){
      // セル外クリック → 選択解除
      if(_selected.length>0&&!td.closest('.fill-handle'))_clearSel();
      return;
    }
    if(e.shiftKey&&_anchorTd){
      e.preventDefault();
      _selectRange(_anchorTd,td);
      // フォーカスを外して編集モードにしない
      td.blur();
    }else{
      _clearSel();
      _anchorTd=td;
    }
  });

  // Shift+矢印キーで範囲拡張
  document.addEventListener('keydown',function(e){
    if(!e.shiftKey)return;
    var td=document.activeElement;
    if(!td||!td.hasAttribute||!td.hasAttribute('contenteditable')||!td.dataset.row)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)===-1)return;

    e.preventDefault();
    if(!_anchorTd)_anchorTd=td;

    // 移動先を見つける
    var row=td.parentElement;
    var table=td.closest('table');
    if(!row||!table)return;
    var cells=Array.from(row.children);
    var ci=cells.indexOf(td);
    var rows=Array.from(table.querySelectorAll('tr'));
    var ri=rows.indexOf(row);
    var nextTd=null;

    if(e.key==='ArrowRight'){
      for(var i=ci+1;i<cells.length;i++){if(cells[i].hasAttribute('contenteditable')){nextTd=cells[i];break;}}
    }else if(e.key==='ArrowLeft'){
      for(var i=ci-1;i>=0;i--){if(cells[i].hasAttribute('contenteditable')){nextTd=cells[i];break;}}
    }else if(e.key==='ArrowDown'){
      for(var i=ri+1;i<rows.length;i++){var c=rows[i].children[ci];if(c&&c.hasAttribute('contenteditable')){nextTd=c;break;}}
    }else if(e.key==='ArrowUp'){
      for(var i=ri-1;i>=0;i--){var c=rows[i].children[ci];if(c&&c.hasAttribute('contenteditable')){nextTd=c;break;}}
    }
    if(nextTd){
      nextTd.focus();
      _selectRange(_anchorTd,nextTd);
    }
  });

  // Delete/Backspace で選択範囲の上書きを一括削除
  document.addEventListener('keydown',function(e){
    if(_selected.length<=1)return;
    if(e.key!=='Delete'&&e.key!=='Backspace')return;
    e.preventDefault();
    _selected.forEach(function(td){
      var rowKey=td.dataset.row;
      var col=parseInt(td.dataset.col);
      if(cfOverrides[rowKey])delete cfOverrides[rowKey][col];
    });
    _clearSel();
    _anchorTd=null;
    render();
  });

  // Escで選択解除
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&_selected.length>0){
      _clearSel();
      _anchorTd=null;
    }
  });
})();
