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
  loadMansionMaster();
  initFlatRateSelect();
  calcLoanAmt();
  addCar();
  addRepairCycle(15,100); // デフォルト修繕周期
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
    // 駐車場開始年齢デフォルトは空欄（=現在年齢から）
    // ヒント更新
    ['h-is-1','h-is-2','w-is-1','w-is-2'].forEach(id=>calcStepHint(id));
    live();
  },100);
  live();
  updateLctrlHint();
  initInputHighlight();

  // 数値入力欄: フォーカス時・クリック時に全選択（先頭0問題の解消）+ サジェスト無効化
  const selectInput=e=>{
    if(e.target.tagName==='INPUT'&&e.target.type==='number'){
      e.target.setAttribute('autocomplete','off');
      requestAnimationFrame(()=>setTimeout(()=>e.target.select(),0));
    }
  };
  document.addEventListener('focus',selectInput,true);
  document.addEventListener('click',selectInput,true);

  // 全角数字→半角数字の自動変換（数値入力欄のみ、IME変換中はスキップ）
  document.addEventListener('input',e=>{
    // IME変換中は絶対にvalueを書き換えない（日本語入力が壊れる）
    if(e.isComposing||e.inputType==='insertCompositionText')return;
    const el=e.target;
    if(el.tagName!=='INPUT')return;
    if(el.isComposing)return;
    const t=el.type;
    // 数値入力欄のみ対象（type="number" または inputMode="numeric" のtext）
    const isNumeric=(t==='number')||(t==='text'&&el.inputMode==='numeric');
    if(!isNumeric)return;
    const v=el.value;
    const converted=v.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0))
                     .replace(/．/g,'.').replace(/ー/g,'-').replace(/，/g,',');
    if(v!==converted)el.value=converted;
  },true);

  initLCComma();
  initScrollSpy();

  // 印刷用情報を復元
  _loadPrintInfo();

  // IndexedDB初期化：localStorage移行 → 自動保存復元
  (async()=>{
    try{
      await _migrateFromLocalStorage();
      await restoreAutoSave();
      // 万が一CF表を復元（ページリロードで_mgStoreが消えるため再生成）
      if(_autoSaveRestored&&typeof renderContingency==='function'){
        try{renderContingency();}catch(e){}
        // 復元後は通常CF表タブに戻す
        if(typeof setRTab==='function')setRTab('cf');
      }
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

  // 矢印キー → セル移動（Shift押下時は範囲選択側に委譲）
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)===-1)return;
  if(e.shiftKey)return; // Shift+矢印は範囲選択ハンドラで処理
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
  var _fhMousePos=null; // マウス位置（自動スクロール用）
  var _fhScrollRAF=null;

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
      _fhMousePos={x:ev.clientX,y:ev.clientY};
      document.addEventListener('mousemove',_onMove);
      document.addEventListener('mouseup',_onUp);
      _startFHScroll();
    });
  });

  function _removeFH(){
    if(_fh&&_fh.parentElement){_fh.parentElement.style.overflow='';_fh.remove();}
    _fh=null;
  }

  // フィルハンドル用自動スクロール
  function _startFHScroll(){
    var EDGE=80,BASE_SPEED=6,MAX_SPEED=24;
    function tick(){
      _fhScrollRAF=null;
      if(!_dragging||!_fhMousePos)return;
      var rb=$('right-body');
      if(!rb)return;
      var rect=rb.getBoundingClientRect();
      var scrolled=false;
      var distR=Math.min(rect.right,window.innerWidth)-_fhMousePos.x;
      if(distR<EDGE){
        var speed=Math.round(BASE_SPEED+(MAX_SPEED-BASE_SPEED)*(1-distR/EDGE));
        rb.scrollLeft+=speed;scrolled=true;
      }
      var distL=_fhMousePos.x-(rect.left+191);
      if(distL<EDGE&&distL<_fhMousePos.x){
        var speed=Math.round(BASE_SPEED+(MAX_SPEED-BASE_SPEED)*(1-Math.max(0,distL)/EDGE));
        rb.scrollLeft-=speed;scrolled=true;
      }
      if(scrolled)_updatePreview();
      if(_dragging)_fhScrollRAF=requestAnimationFrame(tick);
    }
    if(_fhScrollRAF)cancelAnimationFrame(_fhScrollRAF);
    _fhScrollRAF=requestAnimationFrame(tick);
  }
  function _stopFHScroll(){
    if(_fhScrollRAF){cancelAnimationFrame(_fhScrollRAF);_fhScrollRAF=null;}
  }

  function _updatePreview(){
    if(!_dragging||!_srcTd||!_fhMousePos)return;
    _preview.forEach(function(t){t.classList.remove('fill-preview');});
    _preview=[];
    var row=_srcTd.parentElement;
    var cells=Array.from(row.children);
    var si=cells.indexOf(_srcTd);
    var mouseX=_fhMousePos.x;
    for(var i=si+1;i<cells.length;i++){
      var c=cells[i];
      if(!c.hasAttribute('contenteditable'))continue;
      var rect=c.getBoundingClientRect();
      if(rect.left>mouseX)break;
      _preview.push(c);
      c.classList.add('fill-preview');
    }
  }

  function _onMove(e){
    if(!_dragging||!_srcTd)return;
    _fhMousePos={x:e.clientX,y:e.clientY};
    _updatePreview();
  }

  function _onUp(){
    document.removeEventListener('mousemove',_onMove);
    document.removeEventListener('mouseup',_onUp);
    _stopFHScroll();
    if(!_dragging)return;
    _dragging=false;
    // プレビューセルに値を適用
    var rowKey=_srcTd.dataset.row;
    var isMG=_srcTd.dataset.mg==='1';
    var ovr=isMG?mgOverrides:cfOverrides;
    _preview.forEach(function(td){
      td.classList.remove('fill-preview');
      var col=parseInt(td.dataset.col);
      if(!ovr[rowKey])ovr[rowKey]={};
      ovr[rowKey][col]=_srcVal;
    });
    _preview=[];
    if(_srcTd){pushUndoSnap();if(isMG)renderContingency();else render();}
    _srcTd=null;
    _fhMousePos=null;
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

  var _draggingSel=false;
  var _dragMoved=false;
  var _skipNextClick=false;
  var _dragScrollIv=null;
  var _dragMouseX=0;
  var _dragMouseY=0;
  var _lastDragTarget=null;

  // mousedown → ドラッグ選択開始（captureフェーズ）
  document.addEventListener('mousedown',function(e){
    var td=e.target.closest?e.target.closest('td[contenteditable]'):null;
    if(!td||!td.dataset.row){
      if(_selected.length>0&&!(e.target.closest&&e.target.closest('.fill-handle')))_clearSel();
      return;
    }

    if(e.shiftKey&&_anchorTd){
      e.preventDefault();
      _selectRange(_anchorTd,td);
      return;
    }

    // テキスト選択を防止
    e.preventDefault();

    // ドラッグ選択開始
    _clearSel();
    _anchorTd=td;
    _draggingSel=true;
    _dragMoved=false;
    _dragMouseX=e.clientX;
    _dragMouseY=e.clientY;
    _lastDragTarget=null;

    // mousemoveでマウス位置追跡 + セル検出
    var onMove=function(ev){
      if(!_draggingSel)return;
      _dragMouseX=ev.clientX;
      _dragMouseY=ev.clientY;
      // セル検出
      var target=ev.target.closest?ev.target.closest('td[contenteditable]'):null;
      if(target&&target.dataset.row&&target!==_anchorTd){
        if(!_dragMoved)_dragMoved=true;
        _lastDragTarget=target;
        _selectRange(_anchorTd,target);
      }
    };

    var onUp=function(){
      document.removeEventListener('mousemove',onMove);
      document.removeEventListener('mouseup',onUp);
      _draggingSel=false;
      _lastDragTarget=null;
      if(_dragScrollIv){clearInterval(_dragScrollIv);_dragScrollIv=null;}
      if(!_dragMoved){
        _clearSel();
        _anchorTd=td;
        td.focus();
        selectAll(td);
      }else{
        _skipNextClick=true;
        document.body.focus();
      }
    };
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);

    // 自動スクロール: setIntervalで30ms毎にチェック
    if(_dragScrollIv)clearInterval(_dragScrollIv);
    _dragScrollIv=setInterval(function(){
      if(!_draggingSel){clearInterval(_dragScrollIv);_dragScrollIv=null;return;}
      var rb=$('right-body');
      if(!rb)return;
      var rect=rb.getBoundingClientRect();
      var EDGE=80,speed=0,scrolled=false;
      // 右方向スクロール
      var distR=rect.right-_dragMouseX;
      if(distR<EDGE&&distR>=0){speed=Math.max(4,Math.round(20*(1-distR/EDGE)));rb.scrollLeft+=speed;scrolled=true;}
      // 左方向スクロール
      var distL=_dragMouseX-(rect.left+191);
      if(distL<EDGE&&distL>=0){speed=Math.max(4,Math.round(20*(1-distL/EDGE)));rb.scrollLeft-=speed;scrolled=true;}
      // 下方向スクロール
      var distB=rect.bottom-_dragMouseY;
      if(distB<EDGE&&distB>=0){speed=Math.max(4,Math.round(20*(1-distB/EDGE)));rb.scrollTop+=speed;scrolled=true;}
      // 上方向スクロール
      var distT=_dragMouseY-rect.top;
      if(distT<EDGE&&distT>=0){speed=Math.max(4,Math.round(20*(1-distT/EDGE)));rb.scrollTop-=speed;scrolled=true;}
      // スクロール後、新しいセルを検出して選択更新
      if(scrolled&&_anchorTd){
        var el=document.elementFromPoint(
          Math.min(Math.max(_dragMouseX,rect.left+195),rect.right-10),
          Math.min(Math.max(_dragMouseY,rect.top+5),rect.bottom-5)
        );
        if(el){
          var t=el.closest?el.closest('td[contenteditable]'):null;
          if(t&&t.dataset.row&&t!==_anchorTd){
            if(!_dragMoved)_dragMoved=true;
            _lastDragTarget=t;
            _selectRange(_anchorTd,t);
          }
        }
      }
    },30);
  },true); // captureフェーズ

  // セル外クリックで選択解除
  document.addEventListener('click',function(e){
    if(_skipNextClick){_skipNextClick=false;return;}
    var td=e.target.closest?e.target.closest('td[contenteditable]'):null;
    if(!td&&_selected.length>0&&!(e.target.closest&&e.target.closest('.fill-handle'))){
      _clearSel();
    }
  });

  // Shift+矢印キーで範囲拡張（captureフェーズでブラウザのテキスト選択より先に捕捉）
  document.addEventListener('keydown',function(e){
    if(!e.shiftKey)return;
    var td=document.activeElement;
    if(!td||!td.hasAttribute||!td.hasAttribute('contenteditable')||!td.dataset.row)return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].indexOf(e.key)===-1)return;

    e.preventDefault();
    e.stopImmediatePropagation();
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
  },true); // ← captureフェーズ

  // Delete/Backspace で選択範囲を0にする（cfOverrides/mgOverridesに0をセット）
  document.addEventListener('keydown',function(e){
    if(_selected.length<=1)return;
    if(e.key!=='Delete'&&e.key!=='Backspace')return;
    e.preventDefault();
    var hasMG=false;
    _selected.forEach(function(td){
      var rowKey=td.dataset.row;
      var col=parseInt(td.dataset.col);
      var isMG=td.dataset.mg==='1';
      if(isMG)hasMG=true;
      var ovr=isMG?mgOverrides:cfOverrides;
      if(!ovr[rowKey])ovr[rowKey]={};
      ovr[rowKey][col]=0;
    });
    _clearSel();
    _anchorTd=null;
    pushUndoSnap();
    if(hasMG)renderContingency();else render();
  });

  // Escで選択解除
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&_selected.length>0){
      _clearSel();
      _anchorTd=null;
    }
  });
})();

// ===== 年ヘッダーJS sticky（iPad Safari対策） =====
// CSSのsticky topとsticky leftが同テーブル内で競合しz-indexが壊れるため、
// 年ヘッダーの縦固定をJSのtranslateYで実装する。
(function(){
  var _rb=document.getElementById('right-body');
  if(!_rb)return;
  var _raf=null;
  _rb.addEventListener('scroll',function(){
    if(_raf)return;
    _raf=requestAnimationFrame(function(){
      _raf=null;
      var ths=_rb.querySelectorAll('.ryr th');
      if(!ths.length)return;
      var st=_rb.scrollTop;
      var v=st>0?'translateY('+st+'px)':'';
      for(var i=0;i<ths.length;i++)ths[i].style.transform=v;
    });
  },{passive:true});
})();

// ===== iPadキーボード表示時にsec-jumpを非表示 =====
(function(){
  if(!window.visualViewport)return;
  var secJump=document.querySelector('.sec-jump');
  if(!secJump)return;
  var origDisplay=secJump.style.display||'';
  window.visualViewport.addEventListener('resize',function(){
    // ビューポートがウィンドウより小さい＝キーボード表示中
    var kbVisible=window.visualViewport.height<window.innerHeight*0.85;
    secJump.style.display=kbVisible?'none':origDisplay;
  });
})();
