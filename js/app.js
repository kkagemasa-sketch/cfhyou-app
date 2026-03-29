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
  updateMGDansinUI();
};
