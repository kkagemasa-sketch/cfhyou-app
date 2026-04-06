// ui.js — UI制御・パネル・iOS対策・初期化ヘルパー


function togglePanel(){
  const pl=document.querySelector('.panel-l');
  const resizer=document.querySelector('.panel-resizer-grip');
  const btn=document.getElementById('btn-toggle-panel');
  const hidden=pl.classList.toggle('hidden');
  if(resizer)resizer.style.display=hidden?'none':'';
  btn.textContent=hidden?'▶ 表示':'◀ 隠す';
  btn.title=hidden?'入力パネルを表示する':'入力パネルを隠す';
}

function toggleCFPanel(){
  const pr=document.querySelector('.panel-r');
  const resizer=document.querySelector('.panel-resizer-grip');
  const pl=document.querySelector('.panel-l');
  const btn=document.getElementById('btn-toggle-cf');
  const hiding=pr.style.display!=='none';
  if(hiding){
    pr.style.display='none';
    if(resizer)resizer.style.display='none';
    pl.style.width='100%';
    pl.style.minWidth='100%';
    btn.textContent='◀ CF表示';
    btn.title='CF表を表示する';
  } else {
    pr.style.display='';
    if(resizer)resizer.style.display='';
    pl.style.width='';
    pl.style.minWidth='';
    btn.textContent='▶ 入力拡大';
    btn.title='CF表を隠して入力画面を広げる';
  }
}

// ===== 入力フィールド フォーカスハイライト（イベント委譲：1回だけ登録） =====
function initInputHighlight(){
  const panel=document.querySelector('.panel-l');
  if(!panel||panel._hlInited)return;
  panel._hlInited=true;
  panel.addEventListener('focusin', e=>{
    if(e.target.matches('.inp:not([readonly]),.sel'))e.target.classList.add('inp-active');
  },{capture:true});
  panel.addEventListener('focusout', e=>{
    if(e.target.matches('.inp,.sel'))e.target.classList.remove('inp-active');
  },{capture:true});
}

// ===== セクションインデックスナビ =====
function scrollToSec(idx){
  const shs=document.querySelectorAll('.fi .sh');
  if(!shs[idx])return;
  const sh=shs[idx];
  // セクションが閉じていたら開く
  const stog=sh.querySelector('.stog');
  if(stog&&!stog.classList.contains('on'))sh.click();
  // スクロール（.fi内でスクロール）- ヘッダーバーが上部に見える位置に
  const fi=document.querySelector('.panel-l>.fi');
  const sec=sh.closest('.sec');
  const target=sec?sec.offsetTop:sh.offsetTop;
  if(fi)fi.scrollTo({top:Math.max(0, target - fi.offsetTop - 8), behavior:'smooth'});
  // アクティブ表示を更新
  updateJumpActive(idx);
}
function updateJumpActive(idx){
  document.querySelectorAll('.sec-jump-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
}
// スクロール時に現在のセクションを検出
function initScrollSpy(){
  const fi=document.querySelector('.panel-l>.fi');
  if(!fi)return;
  fi.addEventListener('scroll',function(){
    const shs=fi.querySelectorAll('.sh');
    const scrollTop=fi.scrollTop+60;
    let activeIdx=0;
    shs.forEach((sh,i)=>{if(sh.offsetTop<=scrollTop)activeIdx=i});
    updateJumpActive(activeIdx);
  });
}

// ===== 生活費カンマフォーマット =====
function initLCComma(){
  document.querySelectorAll('.lc-m,.lc-y').forEach(inp=>{
    if(!inp._lcCommaInit){
      inp.type='text';inp.inputMode='numeric';
      inp.addEventListener('focus',function(){this.value=this.value.replace(/,/g,'');this.select()});
      inp.addEventListener('blur',function(){
        const v=parseFloat(this.value.replace(/,/g,''))||0;
        this.value=v?v.toLocaleString():'';
      });
      inp._lcCommaInit=true;
    }
    // 値をカンマフォーマット（復元後にも対応）
    const raw=String(inp.value).replace(/,/g,'');
    const v=parseFloat(raw)||0;
    inp.value=v?v.toLocaleString():'';
  });
}

// ===== iOS キーボード表示時の画面押し上げ防止 =====
if(/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&'ontouchend' in document)){
  const _iosReset=()=>{document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0)};
  // visualViewport APIで画面サイズ変更を検知
  if(window.visualViewport){
    let _vvTick=null;
    window.visualViewport.addEventListener('resize',()=>{
      _iosReset();
      clearTimeout(_vvTick);
      _vvTick=setTimeout(_iosReset,120);
    });
    window.visualViewport.addEventListener('scroll',()=>{
      if(window.visualViewport.offsetTop>0)_iosReset();
    });
  }
  // input/selectフォーカス時にbodyスクロールをリセット（連続リセットで確実に抑制）
  document.addEventListener('focusin',e=>{
    if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='TEXTAREA'){
      _iosReset();
      setTimeout(_iosReset,50);
      setTimeout(_iosReset,150);
      setTimeout(_iosReset,300);
      setTimeout(_iosReset,600);
    }
  });
  // スクロールイベントでもbody押し上げを検知して戻す
  document.addEventListener('scroll',e=>{
    if(e.target===document||e.target===document.documentElement||e.target===document.body){
      if(document.documentElement.scrollTop>0||document.body.scrollTop>0)_iosReset();
    }
  },true);
}

// パネルリサイザー
(function(){
  const resizer=document.querySelector('.panel-resizer-grip');
  if(!resizer)return;
  let isResizing=false,startX=0,startW=0;
  resizer.addEventListener('mousedown',e=>{
    isResizing=true;startX=e.clientX;
    const pl=document.querySelector('.panel-l');
    startW=pl.getBoundingClientRect().width;
    document.body.style.cursor='col-resize';
    document.body.style.userSelect='none';
    resizer.classList.add('dragging');
    pl.style.transition='none';
    e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!isResizing)return;
    const pl=document.querySelector('.panel-l');
    const dx=e.clientX-startX;
    const maxW=Math.max(200,window.innerWidth-150);const newW=Math.max(200,Math.min(startW+dx,maxW));
    pl.style.setProperty('width',newW+'px','important');
    pl.style.setProperty('min-width','0','important');
  });
  document.addEventListener('mouseup',()=>{
    if(!isResizing)return;
    isResizing=false;
    document.body.style.cursor='';
    document.body.style.userSelect='';
    resizer.classList.remove('dragging');
    pl.style.transition='';
  });
  // タッチ対応
  resizer.addEventListener('touchstart',e=>{
    isResizing=true;startX=e.touches[0].clientX;
    const pl=document.querySelector('.panel-l');
    startW=pl.getBoundingClientRect().width;
    resizer.classList.add('dragging');
    pl.style.transition='none';
    e.preventDefault();
  },{passive:false});
  window.addEventListener('touchmove',e=>{
    if(!isResizing)return;
    e.preventDefault();
    e.stopPropagation();
    const pl=document.querySelector('.panel-l');
    const dx=e.touches[0].clientX-startX;
    const maxW=Math.max(200,window.innerWidth-150);const newW=Math.max(200,Math.min(startW+dx,maxW));
    pl.style.setProperty('width',newW+'px','important');
    pl.style.setProperty('min-width','0','important');
  },{passive:false,capture:true});
  window.addEventListener('touchend',()=>{isResizing=false;resizer.classList.remove('dragging');document.querySelector('.panel-l').style.transition='';},{passive:true});
})();

// 数字入力欄：フォーカス時にカーソルを右端に配置
function setupAmtInputs(){
  document.querySelectorAll('input[type="number"]').forEach(el=>{
    // inputmode: iOS で適切なキーボードを表示
    if(!el.hasAttribute('inputmode')){
      const step=parseFloat(el.getAttribute('step')||'1');
      el.setAttribute('inputmode', step<1 ? 'decimal' : 'numeric');
    }
    el.addEventListener('focus',function(){
      setTimeout(()=>{
        const len=String(this.value).length;
        if(this.setSelectionRange){try{this.setSelectionRange(len,len)}catch(e){}}
      },10);
    });
  });
}
// 金額入力欄にカンマ表示（フォーカス外した時に表示用に変換）
function formatAmtInputs(){
  document.querySelectorAll('.amt-inp').forEach(el=>{
    if(el._commaSetup)return;
    el._commaSetup=true;
    // blur時：カンマ付きテキストに変換
    el.addEventListener('blur',function(){
      const v=parseFloat(this.value);
      if(!isNaN(v)&&this.type==='number'){
        this.type='text';
        this.value=v.toLocaleString();
        this._rawValue=v;
      }
    });
    // focus時：数値に戻す
    el.addEventListener('focus',function(){
      if(this.type==='text'&&this._rawValue!==undefined){
        this.type='number';
        this.value=this._rawValue;
        delete this._rawValue;
      }
    });
  });
}
// MutationObserverで動的要素にも適用
_amtObserver=new MutationObserver(()=>{clearTimeout(_amtObserverTimer);_amtObserverTimer=setTimeout(()=>{formatAmtInputs();setupAmtInputs();},200)});
document.addEventListener('DOMContentLoaded',()=>{
  _amtObserver.observe(document.body,{childList:true,subtree:true});
  formatAmtInputs();setupAmtInputs();
});

// ===== Undo/Redo キーボードショートカット =====
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==='z'){e.preventDefault();undoState();}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='z'))){e.preventDefault();redoState();}
});
