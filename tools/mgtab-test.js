/* =========================================================================
 *  万が一タブの独立性テスト
 *  - マス上書き・追加行がタブごとに独立（タブAで直してもタブBに効かない）
 *  - タブを行き来しても、保存→復元しても、各タブの上書きが残る
 *  - 行の削除・複製がそのタブだけに効く
 *  - 旧データ（上書きが全タブ共有・種類なし）は各タブに同じ内容を配り、種類=死亡で読む
 *  - タブの種類（死亡/障害1級/障害2級）を持てる
 *  使い方: node tools/mgtab-test.js
 * ========================================================================= */
'use strict';
const { findEdge, startServer, launchEdge, openApp, pageBaseSetup } = require('./edge-harness');
(async()=>{
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }catch(e){ console.log('⚠ puppeteer-core なし → スキップ'); process.exit(0); }
  const edge=findEdge(); if(!edge){ console.log('⚠ Edge なし → スキップ'); process.exit(0); }
  const srv=await startServer(); const origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await launchEdge(puppeteer, edge);
  const errors=[]; let bad=0;
  try{
    const page=await openApp(browser, origin, errors);
    await page.evaluate(pageBaseSetup);
    const r=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const out={};
      live(true); await wait(1200);
      const tabOf=id=>mgQA_tabs.find(t=>t.id===id);
      const lc3=()=>Math.round((window.lastMR&&window.lastMR.lc&&window.lastMR.lc[3])||0);

      // タブA（ご主人様・死亡）で生活費の4年目を999に上書き＋追加行
      setRTab('cf'); mgQA_addTab('h');
      const A=mgQA_tabs[mgQA_tabs.length-1].id;
      mgOverrides['lc']={3:999};
      mgCustomRows.push({id:'mexp_t1',type:'exp',label:'テスト支出'});
      mgOverrides['mexp_t1']={2:50};
      mgQA_calcAndRender(tabOf(A),true);
      out.aLc=lc3();

      // タブB（奥様・障害1級）を追加 → Aの上書きが効いていないこと
      mgQA_addTab('w','dis1');
      const B=mgQA_tabs[mgQA_tabs.length-1].id;
      out.bKind=tabOf(B).kind;
      out.aKind=tabOf(A).kind;
      out.bOvrKeys=Object.keys(mgOverrides).length;
      out.bRows=mgCustomRows.length;
      out.bLc=lc3();

      // Aに戻る → 上書き・追加行が残っている
      mgQA_switchTab(A);
      out.aBackLc=lc3();
      out.aBackRows=mgCustomRows.length;

      // 通常CFに出て戻っても残る
      setRTab('cf');
      out.cfOvrKeys=Object.keys(mgOverrides).length;
      mgQA_switchTab(A);
      out.aBack2=mgOverrides['lc']&&mgOverrides['lc'][3];

      // 複製 → 中身は同じだが独立（複製側を変えても元は変わらない）
      mgQA_duplicateTab(A);
      const C=mgQA_tabs[mgQA_tabs.length-1].id;
      out.cCopy=mgOverrides['lc']&&mgOverrides['lc'][3];
      mgOverrides['lc'][3]=111;
      mgQA_switchTab(A);
      out.aAfterCopyEdit=mgOverrides['lc'][3];

      // Aで追加行を削除（再代入されるケース）→ 他タブへ移動して戻っても消えたまま
      window.confirm=()=>true;
      deleteCustomRow('mexp_t1');
      mgQA_switchTab(B); mgQA_switchTab(A);
      out.aRowsAfterDel=mgCustomRows.length;
      out.cRows=tabOf(C).mgCustomRows.length;

      // 保存→復元（Aを表示したまま）
      const saved=JSON.parse(JSON.stringify(_collectSaveData()));
      _applyData(saved); await wait(800);
      out.rA=tabOf(A)&&tabOf(A).mgOverrides.lc&&tabOf(A).mgOverrides.lc[3];
      out.rB=tabOf(B)&&Object.keys(tabOf(B).mgOverrides).length;
      out.rC=tabOf(C)&&tabOf(C).mgOverrides.lc&&tabOf(C).mgOverrides.lc[3];
      out.rBKind=tabOf(B)&&tabOf(B).kind;

      // 旧データ形式（タブに上書き・種類なし、全体で1つの上書き）
      const old=JSON.parse(JSON.stringify(saved));
      old.mgQATabs.forEach(t=>{ delete t.mgOverrides; delete t.mgCustomRows; delete t.kind; });
      old.mgOverrides={lc:{2:555}};
      old.mgCustomRows=[{id:'mexp_old',type:'exp',label:'旧行'}];
      setRTab('cf');
      _applyData(old); await wait(800);
      out.oldAll=mgQA_tabs.map(t=>(t.mgOverrides.lc&&t.mgOverrides.lc[2])+'/'+t.mgCustomRows.length+'/'+t.kind).join(',');
      // 配った内容はタブごとに別物（片方を変えても他に効かない）
      mgQA_tabs[0].mgOverrides.lc[2]=1;
      out.oldIndependent=mgQA_tabs[1].mgOverrides.lc[2];
      return out;
    });
    const fails=[];
    if(errors.length) fails.push('JSエラー: '+errors.slice(0,2).join(' / '));
    if(r.aLc!==999) fails.push(`タブAの上書きが計算に効いていない（${r.aLc}）`);
    if(r.aKind!=='death'||r.bKind!=='dis1') fails.push(`タブの種類 A=${r.aKind} B=${r.bKind}`);
    if(r.bOvrKeys!==0||r.bRows!==0) fails.push(`タブBにAの上書き/追加行が混入（${r.bOvrKeys}件/${r.bRows}行）`);
    if(r.bLc===999) fails.push('タブBの計算にAの上書きが効いている');
    if(r.aBackLc!==999||r.aBackRows!==1) fails.push(`Aに戻ると上書きが消える（${r.aBackLc}/${r.aBackRows}行）`);
    if(r.cfOvrKeys!==0) fails.push('通常CFに出ても万が一の上書きが残っている');
    if(r.aBack2!==999) fails.push('通常CF経由で戻るとAの上書きが消える');
    if(r.cCopy!==999) fails.push('複製に上書きがコピーされない');
    if(r.aAfterCopyEdit!==999) fails.push('複製側の変更が元タブに効いている');
    if(r.aRowsAfterDel!==0) fails.push(`削除した追加行がタブ移動で復活（${r.aRowsAfterDel}行）`);
    if(r.cRows!==1) fails.push('Aの行削除が複製タブにも効いている');
    if(r.rA!==999||r.rB!==0||r.rC!==111||r.rBKind!=='dis1') fails.push(`保存→復元でタブ別の上書き/種類が崩れる（A=${r.rA} B=${r.rB}件 C=${r.rC} B種類=${r.rBKind}）`);
    if(!/^555\/1\/death(,555\/1\/death)+$/.test(r.oldAll)) fails.push(`旧データの移行が不正（${r.oldAll}）`);
    if(r.oldIndependent!==555) fails.push('旧データで配った上書きがタブ間で共有されている');
    if(fails.length){ bad++; console.log('❌ 万が一タブの独立性\n   - '+fails.join('\n   - ')); }
    else console.log('✅ 万が一タブ: 上書き・追加行がタブごとに独立（移動・複製・削除・保存復元・旧データ移行・種類）');

    /* ---- ⑤住宅：名義人・一般団信の欄 ---- */
    await page.evaluate(pageBaseSetup);
    const L=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      const vis=id=>{const e=$(id);return !!e&&e.style.display!=='none'&&e.offsetParent!==null;};
      const onV=key=>[...document.querySelectorAll(`[data-ldb="${key}"].on`)].map(b=>b.dataset.v).join('|');
      const o={};
      setRTab('cf');
      if(typeof toggleHousingGroup==='function'){ const hg=$('loan-dansin-box').closest('.hg-body'); if(hg&&hg.offsetParent===null) toggleHousingGroup('loan'); }
      setLoanMode('single'); await wait(100);
      o.single=[vis('ldb-single'),vis('ldb-pair'),vis('ldb-joint')].join(',');
      o.defOn=onV('loan-borrower')+'/'+onV('loan-dansin');
      document.querySelector('[data-ldb="loan-borrower"][data-v="w"]').click();
      document.querySelector('[data-ldb="loan-dansin"][data-v="no"]').click();
      o.afterClick=$('loan-borrower').value+'/'+$('loan-dansin').value+'/'+onV('loan-borrower')+'/'+onV('loan-dansin');
      o.note=$('ldb-note').textContent;
      setLoanMode('pair'); await wait(100);
      o.pair=[vis('ldb-single'),vis('ldb-pair'),vis('ldb-joint')].join(',');
      setLoanMode('joint'); await wait(100);
      o.joint=[vis('ldb-single'),vis('ldb-pair'),vis('ldb-joint')].join(',');
      document.querySelector('[data-ldb="joint-dansin-sel"][data-v="none"]').click();
      setLoanMode('single'); await wait(100);
      // 保存→復元
      const saved=JSON.parse(JSON.stringify(_collectSaveData()));
      setLoanMode('pair'); $('loan-borrower').value='h'; $('loan-dansin').value='yes';
      _applyData(saved); await wait(800);
      o.restored=$('loan-borrower').value+'/'+$('loan-dansin').value+'/'+$('joint-dansin-sel').value+'/'+onV('loan-borrower')+'/'+onV('loan-dansin');
      // 旧データ（項目なし）→ 初期値
      const old=JSON.parse(JSON.stringify(saved));
      ['loan-borrower','loan-dansin','loan-dansin-h','loan-dansin-w','joint-dansin-sel'].forEach(k=>delete old.fields[k]);
      _applyData(old); await wait(800);
      o.oldDef=$('loan-borrower').value+'/'+$('loan-dansin').value+'/'+$('joint-dansin-sel').value+'/'+onV('loan-borrower');
      // 単身世帯は名義人欄を隠す・計算は本人名義
      $('loan-borrower').value='w'; setHouseholdType('single'); await wait(100);
      o.singleHH=vis('ldb-borrower-wrap')+'/'+getLoanBorrower();
      setHouseholdType('couple');
      return o;
    });
    const f2=[];
    if(L.single!=='true,false,false') f2.push(`単独ローンの欄の表示 ${L.single}`);
    if(L.defOn!=='h/yes') f2.push(`初期値の選択表示 ${L.defOn}`);
    if(L.afterClick!=='w/no/w/no') f2.push(`ボタンで値が変わらない ${L.afterClick}`);
    if(!L.note.includes('団信なし')) f2.push(`説明文が設定に追従しない「${L.note}」`);
    if(L.pair!=='false,true,false') f2.push(`ペアローンの欄の表示 ${L.pair}`);
    if(L.joint!=='false,false,true') f2.push(`連帯債務の欄の表示 ${L.joint}`);
    if(L.restored!=='w/no/none/w/no') f2.push(`保存→復元で戻らない ${L.restored}`);
    if(L.oldDef!=='h/yes/h/h') f2.push(`旧データで初期値にならない ${L.oldDef}`);
    if(L.singleHH!=='false/h') f2.push(`単身世帯で名義人欄が残る／奥様名義になる ${L.singleHH}`);
    if(f2.length){ bad++; console.log('❌ 名義人・一般団信の欄\n   - '+f2.join('\n   - ')); }
    else console.log('✅ 名義人・一般団信: ローン種別ごとの表示・ボタン・説明文・保存復元・旧データ初期値・単身世帯');

    /* ---- ③収入：年収のうちボーナス ---- */
    await page.evaluate(pageBaseSetup);
    const B=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      const o={};
      setRTab('cf'); live(true); await wait(1200);
      const st=()=>['h','w'].map(p=>($(`${p}-bonus-box`).classList.contains('warn')?'W':'-')+($(`${p}-bonus-dot`).style.display==='none'?'':'!')).join(',')+'|'+($('inc-bonus-dot').style.display==='none'?'':'!');
      o.blank=st();
      // ご主人様：0を入力 → 警告が消える（奥様はまだ未入力なので③の印は残る）
      $('h-bonus-amt').value='0'; onBonusInput();
      o.h0=st();
      $('w-bonus-amt').value='50'; onBonusInput();
      o.both=st();
      // 計算：額面700万・ボーナス200万 → 月給41.7万 → 標準報酬41万 → 日額9,113円
      $('h-income-mode').value='gross'; onIncomeModeChange();
      const s0=getIncomeSteps('h')[0]; // 最初の段階を額面700→700に
      const sid=document.querySelector('#h-income-cont [id^="h-is-"]').id;
      $(`${sid}-net-from`).value=700; $(`${sid}-net-to`).value=700;
      $(`${sid}-from`).value=parseInt($('husband-age').value);
      $('h-bonus-amt').value='200'; onBonusInput();
      const a=sickBenefitAt('h',parseInt($('husband-age').value));
      o.amt=[a.gross,Math.round(a.monthly*10)/10,a.hyojun,a.daily,a.annual].join('/');
      // 月給の何か月分：4か月 → 月給43.75万 → 標準報酬44万 → 日額9,780円
      setBonusMode('h','months'); $('h-bonus-months').value='4'; onBonusInput();
      const m=sickBenefitAt('h',parseInt($('husband-age').value));
      o.months=[Math.round(m.monthly*100)/100,m.hyojun,m.daily].join('/');
      o.monthsUI=$('h-bonus-months-wrap').style.display+'|'+$('h-bonus-amt-wrap').style.display;
      // 保存→復元
      const saved=JSON.parse(JSON.stringify(_collectSaveData()));
      $('h-bonus-months').value=''; setBonusMode('h','amt');
      _applyData(saved); await wait(1200);
      o.restored=$('h-bonus-mode').value+'/'+$('h-bonus-months').value+'/'+$('h-bonus-amt').value;
      // 扶養内パート（額面入力）は対象外 → 欄を隠し警告も出さない
      $('h-bonus-months').value=''; $('h-bonus-amt').value=''; setBonusMode('h','amt');
      $('h-work-type').value='part'; updateBonusUI();
      o.part=$('h-bonus-box').style.display+'|'+$('h-bonus-dot').style.display;
      return o;
    });
    const f3=[];
    if(B.blank!=='W!,W!|!') f3.push(`未入力の印が出ない（${B.blank}）`);
    if(B.h0!=='-,W!|!') f3.push(`0入力で警告が消えない／奥様の警告が消える（${B.h0}）`);
    if(B.both!=='-,-|') f3.push(`両方入力しても③の印が残る（${B.both}）`);
    if(B.amt!=='700/41.7/41/9113/332.6') f3.push(`金額入力の傷病手当金 ${B.amt}（700/41.7/41/9113/332.6 のはず）`);
    if(B.months!=='43.75/44/9780') f3.push(`か月分入力の傷病手当金 ${B.months}（43.75/44/9780 のはず）`);
    if(B.monthsUI!=='|none') f3.push(`入力のしかたの切替で欄が切り替わらない ${B.monthsUI}`);
    if(B.restored!=='months/4/200') f3.push(`保存→復元で戻らない ${B.restored}`);
    if(B.part!=='none|none') f3.push(`扶養内パートでも欄・警告が出る ${B.part}`);
    if(f3.length){ bad++; console.log('❌ ボーナス欄\n   - '+f3.join('\n   - ')); }
    else console.log('✅ ボーナス欄: 未入力の印・0で解除・傷病手当金(金額/か月分)・保存復元・扶養内パート除外');

    /* ---- 万が一を複数タブまとめてExcel出力（シート別・1ファイル） ---- */
    await page.evaluate(pageBaseSetup);
    const X=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      document.getElementById('client-name').value='テスト 太郎';
      live(true); await wait(1200);
      setRTab('cf'); mgQA_addTab('h','death'); const a=mgQA_tabs[mgQA_tabs.length-1].id;
      mgQA_addTab('h','dis1'); const b=mgQA_tabs[mgQA_tabs.length-1].id;
      mgQA_switchTab(a);
      let cap=null; const orig=window._writeXlsxWithPageSetup;
      window._writeXlsxWithPageSetup=async(wb,fname,names,opts)=>{ cap={sheets:wb.SheetNames.slice(),fname,names,scales:opts&&opts.scales,
        hasDis:wb.SheetNames.map(n=>JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1})).includes('障害年金'))}; };
      _exportExtra.includeDisclaimer=true;
      try{ await exportExcelMGTabs([a,b]); } finally { window._writeXlsxWithPageSetup=orig; }
      return {cap, back: window._mgQA_activeTabId===a};
    });
    const f4=[];
    if(!X.cap) f4.push('Excelが作られない');
    else{
      if(X.cap.sheets.length!==3) f4.push(`シート数 ${X.cap.sheets.length}（2タブ＋ご確認事項=3のはず）: ${X.cap.sheets.join(',')}`);
      if(!(X.cap.names&&X.cap.names.length===2&&X.cap.scales&&X.cap.scales.length===2)) f4.push('ページ設定がシートごとに渡っていない');
      if(!(X.cap.hasDis[0]===false&&X.cap.hasDis[1]===true)) f4.push(`障害年金の行が障害タブのシートだけに出ていない ${X.cap.hasDis}`);
      if(!/2パターン/.test(X.cap.fname)) f4.push(`ファイル名 ${X.cap.fname}`);
    }
    if(!X.back) f4.push('出力のあと元のタブに戻っていない');
    if(f4.length){ bad++; console.log('❌ 万が一 まとめてExcel\n   - '+f4.join('\n   - ')); }
    else console.log(`✅ 万が一 まとめてExcel: タブごとのシート（${X.cap.sheets.join('・')}）・ページ設定・元のタブに戻る`);

    /* ---- 別タブの保険金が紛れ込まない（新しい障害タブ・保険を全部消したタブ） ---- */
    await page.evaluate(pageBaseSetup);
    const I=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      live(true); await wait(1000);
      setRTab('cf'); mgQA_addTab('h','death'); const a=mgQA_tabs[mgQA_tabs.length-1];
      a.state.insurances=[{type:'lump',name:'終身',amount:3000}]; mgQA_switchTab(a.id);
      mgQA_addTab('h','dis1'); const b=mgQA_tabs[mgQA_tabs.length-1];
      const disIns=(b.state.insurances||[]).filter(x=>x&&x.type!=='none').length;
      const disPay=Math.round((window.lastMR.insPayArr||[]).reduce((s,v)=>s+v,0));
      mgQA_switchTab(a.id); window.confirm=()=>true; mgQA_removeIns(a.id,0);
      const after=(a.state.insurances||[]).filter(x=>x&&x.type!=='none').length;
      const aPay=Math.round((window.lastMR.insPayArr||[]).reduce((s,v)=>s+v,0));
      return {disIns,disPay,after,aPay};
    });
    const f5=[];
    if(I.disIns!==0||I.disPay!==0) f5.push(`障害タブに死亡タブの保険が入った（${I.disIns}件・${I.disPay}万円）`);
    if(I.after!==0||I.aPay!==0) f5.push(`保険を削除しても戻ってくる（${I.after}件・${I.aPay}万円）`);
    if(f5.length){ bad++; console.log('❌ 保険金の紛れ込み\n   - '+f5.join('\n   - ')); }
    else console.log('✅ 保険金: 新しい障害タブ・全部削除したタブに別タブの保険が紛れ込まない');

    /* ---- 積立の「取崩し発生で積立をやめる」：初期値・保存復元・古いデータは「続ける」 ---- */
    await page.evaluate(pageBaseSetup);
    const S=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      addSecurity('h'); addSecurity('h');
      const ids=[...document.querySelectorAll('[id^="sec-bal-h-"]')].map(e=>e.id.split('-').pop());
      const a=ids[ids.length-2], b=ids[ids.length-1];
      const def=document.getElementById(`sec-stopliq-h-${a}`)?.classList.contains('on');
      setSecStopLiq('h',b,false);
      const d=_collectSaveData();
      const saved=(d.dynamic.securities||[]).slice(-2).map(x=>x.stopOnShort);
      _applyData(JSON.parse(JSON.stringify(d))); await wait(300);
      const ids2=[...document.querySelectorAll('[id^="sec-bal-h-"]')].map(e=>e.id.split('-').pop());
      const r1=ids2.slice(-2).map(id=>document.getElementById(`sec-stopliq-h-${id}`)?.classList.contains('on'));
      const old=JSON.parse(JSON.stringify(d)); old.dynamic.securities.forEach(x=>delete x.stopOnShort);
      _applyData(old); await wait(300);
      const ids3=[...document.querySelectorAll('[id^="sec-bal-h-"]')].map(e=>e.id.split('-').pop());
      const r2=ids3.slice(-2).map(id=>document.getElementById(`sec-stopliq-h-${id}`)?.classList.contains('on'));
      return {def,saved,r1,r2};
    });
    const f6=[];
    if(S.def!==true) f6.push('新しい積立の初期値が「やめる」になっていない');
    if(JSON.stringify(S.saved)!=='[true,false]') f6.push(`保存値が違う ${JSON.stringify(S.saved)}`);
    if(JSON.stringify(S.r1)!=='[true,false]') f6.push(`復元値が違う ${JSON.stringify(S.r1)}`);
    if(JSON.stringify(S.r2)!=='[false,false]') f6.push(`古いデータが「続ける」にならない ${JSON.stringify(S.r2)}`);
    if(f6.length){ bad++; console.log('❌ 取崩し発生で積立をやめる\n   - '+f6.join('\n   - ')); }
    else console.log('✅ 取崩し発生で積立をやめる: 初期値「やめる」・保存復元・古いデータは「続ける」');

    /* ---- 必要保障額：通常のCF表も赤字の家計でも 最低限≦標準≦安心、カードを隠す／表示 ---- */
    await page.evaluate(pageBaseSetup);
    const NE=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      try{localStorage.setItem('mg_need_collapsed','0')}catch(e){}
      setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
      $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
      setCostType('cash'); setDownType('own'); $('loan-yrs').value=35; $('rate-base').value=0.5; calcLoanAmt();
      $('lc-food').value=600000; $('lc-elec').value=60000; $('lc-comm').value=60000;
      live(true); await wait(800);
      setRTab('cf'); mgQA_addTab('h'); const t=mgQA_tabs[mgQA_tabs.length-1];
      Object.assign(t.state,{deathYear:3,insurances:[{type:'lump',amount:500}],lcMode:'ratio',lcRatio:80}); mgQA_calcAndRender(t,true);
      const nd=JSON.parse(JSON.stringify(window.lastMR.need));
      const shown1=$('mg-need-wrap')?.style.display!=='none';
      toggleMgNeed();
      const hidden=$('mg-need-wrap')?.style.display==='none';
      const cell=document.querySelector('#right-body table.cf td.need-m1,#right-body table.cf td.need-m2,#right-body table.cf td.need-m3');
      const outlineHidden=cell?getComputedStyle(cell).outlineStyle==='none':true;
      mgQA_calcAndRender(t,true);
      const keep=$('mg-need-wrap')?.style.display==='none' && /表示/.test($('mg-need-toggle')?.textContent||'');
      toggleMgNeed();
      const back=$('mg-need-wrap')?.style.display!=='none';
      return {nd,shown1,hidden,outlineHidden,keep,back};
    });
    const f7=[];
    if(!(NE.nd.min<NE.nd.std && NE.nd.std<NE.nd.safe)) f7.push(`最低限＜標準＜安心 になっていない 最低限${NE.nd.min}・標準${NE.nd.std}・安心${NE.nd.safe}`);
    if(!NE.shown1||!NE.hidden||!NE.outlineHidden||!NE.keep||!NE.back) f7.push(`カードの表示切替 ${JSON.stringify({shown:NE.shown1,hidden:NE.hidden,outline:NE.outlineHidden,keep:NE.keep,back:NE.back})}`);
    if(f7.length){ bad++; console.log('❌ 必要保障額\n   - '+f7.join('\n   - ')); }
    else console.log(`✅ 必要保障額: 通常も赤字の家計で 最低限${NE.nd.min.toLocaleString()}＜標準${NE.nd.std.toLocaleString()}＜安心${NE.nd.safe.toLocaleString()}（${NE.nd.safeMode==='floor'?'標準＋2年分':'最後の年の比較'}）・カードを隠す/表示（色枠も連動・再計算後も保持）`);

    /* ---- 入力欄の保存漏れ・新規作成の残り：左の入力欄すべてに値を入れて確かめる ---- */
    await page.evaluate(pageBaseSetup);
    const LK=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      if(typeof setHouseholdType==='function') setHouseholdType('couple');   // 前のテストの単身世帯を戻す（単身は奥様欄を使わない）
      const oc=window.confirm, oa=window.alert;
      window.confirm=(()=>{let n=0;return ()=>(n++%2===1);})(); window.alert=()=>{};
      try{
        const targets=()=>[...document.querySelectorAll('.panel-l input[id]')].filter(el=>(el.type==='number'||el.type==='text')&&!el.readOnly&&!el.disabled);
        // 意図して残す／オンのときだけ保存する欄（その他の文言は端末に記憶、奨学金・結婚援助・収入％はオンのときだけ）
        const skip=id=>/-other-text$/.test(id)||/^(sc|wed)-(amt|start|age)-\d+$/.test(id)||/^[hw]-is-\d+-pct$/.test(id);
        // 入れる値：年齢はありえる値（読込時にありえない年齢は自動で直るため）、ほかは7
        const mk=id=>/death-age/.test(id)?'95':/age/.test(id)?'50':'7';
        targets().forEach(el=>{el.value=mk(el.id);});
        const filled=targets().map(el=>el.id).filter(id=>!skip(id));
        const d=JSON.parse(JSON.stringify(_collectSaveData()));
        targets().forEach(el=>{el.value='';});
        _applyData(d); await wait(400);
        const notSaved=filled.filter(id=>document.getElementById(id)&&document.getElementById(id).value!==mk(id)).map(id=>id+'（保存'+JSON.stringify((d.fields||{})[id])+'→読込後'+JSON.stringify(document.getElementById(id).value)+'・'+d.householdType+'）');
        targets().forEach(el=>{el.value=mk(el.id);});
        await newCFSheet(); await wait(600);
        const leaked=filled.filter(id=>document.getElementById(id)&&document.getElementById(id).value===mk(id)&&mk(id)!==({'h-death-age':'83','w-death-age':'88','retire-age':'60','w-retire-age':'60'}[id]||''));
        return {n:filled.length,notSaved,leaked};
      } finally { window.confirm=oc; window.alert=oa; }
    });
    const f8=[];
    if(LK.notSaved.length) f8.push('保存→読込で戻らない欄: '+LK.notSaved.join(', '));
    if(LK.leaked.length) f8.push('新規作成で前の値が残る欄: '+LK.leaked.join(', '));
    if(f8.length){ bad++; console.log('❌ 入力欄の保存・新規作成\n   - '+f8.join('\n   - ')); }
    else console.log(`✅ 入力欄の保存・新規作成: 左の入力欄${LK.n}個すべて、保存→読込で戻り・新規作成で消える`);

    /* ---- 資産が空のときの種類ボタン：クリックでその種類のカードが追加される ---- */
    await page.evaluate(pageBaseSetup);
    const QA=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const oc=window.confirm, oa=window.alert;
      window.confirm=(()=>{let n=0;return ()=>(n++%2===1);})(); window.alert=()=>{};
      const out={};
      try{
        for(const t of ['tax-accum','nisa-tsumi','nisa-grow','stock','bond','ins','zaikei']){
          await newCFSheet(); await wait(200);
          if(typeof setAssetPerson==='function') setAssetPerson('h');
          if(typeof refreshAssetUI==='function') refreshAssetUI();
          const empty=document.getElementById('asset-empty-h');
          const btn=[...(empty?empty.querySelectorAll('button'):[])].find(b=>(b.getAttribute('onclick')||'').includes(`'${t}'`));
          if(!btn){ out[t]='ボタンなし'; continue; }
          btn.click(); await wait(150);
          let got='';
          if(t==='ins') got=document.querySelector('#ins-savings-cont-h>[id^="ins-h-"]')?'ins':'';
          else if(t==='zaikei') got=(typeof _zaikeiVisible==='function'&&_zaikeiVisible('h'))?'zaikei':'';
          else { const id=secCnt; got=(typeof secCurType==='function')?secCurType('h',id):''; }
          out[t]=got===t?'OK':`違う(${got})`;
          out[t+'_empty']=empty.hidden?'消えた':'残った';
        }
      } finally { window.confirm=oc; window.alert=oa; }
      return out;
    });
    const f9=Object.entries(QA).filter(([k,v])=>!k.endsWith('_empty')&&v!=='OK').map(([k,v])=>`${k}: ${v}`)
      .concat(Object.entries(QA).filter(([k,v])=>k.endsWith('_empty')&&v!=='消えた').map(([k])=>`${k.replace('_empty','')}: 追加後も「まだ登録されていません」が残る`));
    if(f9.length){ bad++; console.log('❌ 資産の種類ボタン\n   - '+f9.join('\n   - ')); }
    else console.log('✅ 資産の種類ボタン: 空のときの7種類（課税積立・NISAつみたて・NISA成長枠・課税一括・債券・積立保険・財形）をクリックでその種類のカードが追加される');

    /* ---- Excel：CF表シートで折り返さない・情報欄の文字が結合したセルの幅に収まる（通常・万が一） ---- */
    await page.evaluate(pageBaseSetup);
    const XW=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      if(typeof setHouseholdType==='function') setHouseholdType('couple');
      $('client-name').value='山田 太郎';
      setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
      $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=200;
      setCostType('cash'); setDownType('own');
      $('loan-h-amt').value=3000; $('loan-w-amt').value=1500; $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
      $('rate-h-base').value=0.6; $('rate-w-base').value=0.7; calcLoanAmt();
      addSecurity('h'); { const els=document.querySelectorAll('[id^="sec-bal-h-"]'); const sid=els[els.length-1].id.split('-').pop(); document.getElementById('sec-acc-h-'+sid)?.classList.add('on'); $('sec-bal-h-'+sid).value=120; $('sec-monthly-h-'+sid).value=3; $('sec-label-h-'+sid).value='eMAXIS Slim 全世界株式（オール・カントリー）'; }
      window._cfSummaryNote='退職金で一部繰上返済を予定。\n教育費は私立大学を想定。';
      live(true); await wait(900);
      // ws を横取り（ファイルは作らない）
      const caught=[];
      const oA=XLSX.utils.book_append_sheet, oW=XLSX.writeFile, oS=window.saveAs;
      XLSX.utils.book_append_sheet=function(wb,ws,name){caught.push({ws,name});return oA.apply(this,arguments);};
      XLSX.writeFile=function(){}; window.saveAs=function(){};
      let nChecked=0;
      const check=()=>{
        const bad=[];
        caught.filter(x=>!/確認/.test(x.name||'')).forEach(({ws,name})=>{
          const merges=ws['!merges']||[];
          const cols=ws['!cols']||[];
          const colPx=c=>((cols[c]&&cols[c].wch)||8)*7+5;
          Object.keys(ws).filter(k=>k[0]!=='!').forEach(k=>{
            const cell=ws[k]; const st=cell.s||{}; const al=st.alignment||{};
            const v=String(cell.v==null?'':cell.v);
            const rc=XLSX.utils.decode_cell(k);
            const isNote=/退職金で一部繰上返済/.test(v);
            if(al.wrapText && !isNote && v && !/お金が不足|マイナス/.test(v)) bad.push(`${name} ${k} 折り返し設定:「${v.slice(0,20)}」`);
            if(rc.c>=2 && v && /: /.test(v) && !isNote){
              const m=merges.find(x=>x.s.r===rc.r&&x.s.c===rc.c);
              const c1=m?m.e.c:rc.c;
              let w=0; for(let c=rc.c;c<=c1;c++) w+=colPx(c);
              const f=st.font||{};
              const need=xlTextPx(v,f.sz||10,!!f.bold)+8; nChecked++;
              if(need>w) bad.push(`${name} ${k} はみ出し「${v.slice(0,24)}」 必要${Math.round(need)}px／幅${w}px`);
            }
          });
        });
        return bad;
      };
      try{
        setRTab('cf'); render(); await exportExcel(); await wait(300);
        const normalBad=check(); caught.length=0;
        mgQA_addTab('h'); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,{deathYear:3}); mgQA_calcAndRender(t,true);
        await exportExcelMG(); await wait(300);
        const mgBad=check();
        // 必要保障額の3つの金額と、総金融資産の根拠のマスの色枠
        { const nd=window.lastMR.need; const ws=(caught.find(x=>!/確認/.test(x.name||''))||{}).ws||{};
          const vals=Object.keys(ws).filter(k=>k[0]!=='!').map(k=>String(ws[k].v||''));
          [['最低限',nd.min],['標準',nd.std],['安心',nd.safe]].forEach(([n,v])=>{ if(!vals.includes(v.toLocaleString()+'万円')) mgBad.push('必要保障額の'+n+' '+v+'万円がExcelにない'); });
          const taR=Object.keys(ws).filter(k=>k[0]!=='!'&&ws[k].v==='総金融資産').map(k=>XLSX.utils.decode_cell(k).r)[0];
          [['標準',nd.iStd],['安心',nd.iSafe]].forEach(([n,i])=>{ if(i==null||i<0)return; const c=ws[XLSX.utils.encode_cell({r:taR,c:2+i})]; if(!(c&&c.s&&c.s.border&&c.s.border.top&&c.s.border.top.style==='medium')) mgBad.push(n+'の根拠のマスに色枠がない'); });
        }
        if(nChecked<10) normalBad.push('調べた情報欄のセルが少なすぎる（'+nChecked+'個）');
        return {normalBad,mgBad,nChecked};
      } finally { XLSX.utils.book_append_sheet=oA; XLSX.writeFile=oW; window.saveAs=oS; }
    });
    const f10=[...XW.normalBad.map(x=>'通常 '+x),...XW.mgBad.map(x=>'万が一 '+x)];
    if(f10.length){ bad++; console.log('❌ Excelの折り返し・はみ出し\n   - '+f10.slice(0,12).join('\n   - ')); }
    else console.log('✅ Excel: 通常・万が一とも、CF表シートに折り返しなし・情報欄の文字'+XW.nChecked+'個が結合したセルに収まる（ペアローン・長い銘柄名・注釈あり）');

    /* ---- PDF表紙（案A-1）：1ページに収まる・必要保障額と前提条件の数字が画面と同じ（通常／万が一／現金一括／長いメモ） ---- */
    await page.evaluate(pageBaseSetup);
    const CV=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      const out=[];
      const coverOf=()=>document.querySelector('#pp-preview .pp-page-cover');
      const fits=c=>{const m=c&&c.querySelector('.ppc-main');return !!m&&m.scrollHeight<=m.clientHeight+1;};
      const num=t=>parseInt(String(t||'').replace(/[^\d-]/g,''))||0;
      if(typeof setHouseholdType==='function') setHouseholdType('couple');
      $('client-name').value='山田 太郎';
      setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
      $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
      setCostType('cash'); setDownType('own');
      $('loan-h-amt').value=2800; $('loan-w-amt').value=1200; calcLoanAmt();
      $('lc-food').value=600000; $('lc-elec').value=60000; $('lc-comm').value=60000;
      addAssetOfType('h','nisa-tsumi'); $('sec-bal-h-'+secCnt).value=120;
      window._cfSummaryNote=Array.from({length:9},(_,i)=>`補足メモ${i+1}行目：退職金で一部繰上返済を予定しています。`).join('\n');
      setRTab('cf'); live(true); await wait(900);
      // 通常（長いメモ）
      openPrintPreview('cf'); await wait(900);
      let c=coverOf();
      if(!c) out.push('通常の表紙が無い'); else {
        if(!fits(c)) out.push('通常の表紙が1ページに収まらない（長いメモ）');
        const cashV=num(c.querySelector('.ppc-flow .b .v')?.textContent);
        if(cashV!==1100) out.push(`通常の表紙の現預金合計 ${cashV}（画面は1,100）`);
      }
      closePrintPreview();
      // 万が一
      window._cfSummaryNote='教育費は私立大学を想定。';
      mgQA_addTab('h'); const t=mgQA_tabs[mgQA_tabs.length-1];
      Object.assign(t.state,{deathYear:3,insurances:[{type:'lump',amount:500}]}); mgQA_calcAndRender(t,true); await wait(300);
      openPrintPreview('mg'); await wait(900);
      c=coverOf();
      if(!c) out.push('万が一の表紙が無い'); else {
        if(!fits(c)) out.push('万が一の表紙が1ページに収まらない');
        const nd=window.lastMR.need;
        const vs=[...c.querySelectorAll('.ppc-tier .v')].map(e=>num(e.textContent));
        if(JSON.stringify(vs)!==JSON.stringify([nd.min,nd.std,nd.safe])) out.push(`表紙の必要保障額 ${vs} が画面 ${[nd.min,nd.std,nd.safe]} と違う`);
        if(!/死亡した場合/.test(c.querySelector('.ppc-scn')?.textContent||'')) out.push('帯に「死亡した場合」が無い');
      }
      closePrintPreview();
      // 現金一括購入
      setRTab('cf'); setFundingMode('cash'); live(true); await wait(700);
      openPrintPreview('cf'); await wait(900);
      c=coverOf();
      if(!c||!/住宅ローンは利用しない/.test(c.textContent)) out.push('現金一括購入の表紙に「住宅ローンは利用しない」が無い');
      else if(!fits(c)) out.push('現金一括購入の表紙が1ページに収まらない');
      closePrintPreview();
      return out;
    });
    if(CV.length){ bad++; console.log('❌ PDF表紙\n   - '+CV.join('\n   - ')); }
    else console.log('✅ PDF表紙: 通常（長いメモ）・万が一・現金一括とも1ページに収まり、必要保障額と前提条件の数字が画面と同じ');

    /* ---- 収入の段階ごとの働き方：奥様 会社員(29〜34)→扶養内パート(35〜60)、社保ありパート、前の形式は数字そのまま ---- */
    await page.evaluate(pageBaseSetup);
    const WT=await page.evaluate(async()=>{
      const wait=ms=>new Promise(res=>setTimeout(res,ms));
      const $=id=>document.getElementById(id);
      const out=[], info={};
      if(typeof setHouseholdType==='function') setHouseholdType('couple');
      $('wife-age').value=29; $('w-retire-age').value=60; $('pension-w-start').value=22;
      $('w-income-mode').value='gross'; if(typeof onIncomeModeChange==='function') onIncomeModeChange();
      // 奥様の段階を作り直す
      $('w-income-cont').innerHTML=''; wIncomeCnt=0;
      addIncomeStep('w'); { const b='w-is-'+wIncomeCnt; $(b+'-from').value=29; $(b+'-to').value=34; $(b+'-net-from').value=400; $(b+'-net-to').value=400; $(b+'-wt').value='kaishain'; }
      addIncomeStep('w'); { const b='w-is-'+wIncomeCnt; $(b+'-from').value=35; $(b+'-to').value=60; $(b+'-net-from').value=100; $(b+'-net-to').value=100; $(b+'-wt').value='part'; }
      live(true); await wait(900); render();   // 待ち時間に左右されないよう直接計算してから読む
      const R=window.lastR, wa0=29;
      const net30=R.wInc[30-wa0], net40=R.wInc[40-wa0];
      info.net30=net30; info.net40=net40;
      if(!(net30>0&&net30<400)) out.push(`会社員の年の手取り ${net30}（社会保険料が引かれていない）`);
      if(Math.round(net40)!==100) out.push(`扶養内パートの年の手取り ${net40}（100のはず：社会保険料なし・税なし）`);
      // 老齢年金：厚生年金は 22〜34歳の13年、扶養内パート26年
      calcPension('w'); const hint=$('w-pension-hint')?.textContent||''; info.hint=hint;
      if(!/厚生年金13年・扶養内パート25年/.test(hint)&&!/厚生年金13年・扶養内パート26年/.test(hint)) out.push('年金のヒントに厚生年金・扶養内パートの年数が出ない: '+hint);
      const pPart=+$('pension-w').value;
      // 社保ありパートなら厚生年金に入る → 年金が増える
      $('w-is-2-wt').value='shaho-part'; calcPension('w'); const pShaho=+$('pension-w').value;
      info.pPart=pPart; info.pShaho=pShaho;
      if(!(pShaho>pPart)) out.push(`社保ありパートの年金(${pShaho})が扶養内パート(${pPart})より多くない`);
      $('w-is-2-wt').value='part';
      // 障害（扶養内パートの年に発病）：障害厚生年金なし・傷病手当金なし
      setRTab('cf'); mgQA_addTab('w','dis2'); const t=mgQA_tabs[mgQA_tabs.length-1];
      Object.assign(t.state,{deathYear:13}); mgQA_calcAndRender(t,true);   // 41歳
      const sick=mgC_sick(t); info.sick=sick.ok;
      if(sick.ok) out.push('扶養内パートの年に障害：傷病手当金が出ている');
      // 遺族厚生（扶養内パートの年の死亡）は長期要件＝実月数（13年）
      const kShort=calcKoseiForSurvP('w',22,41,0,0,true);
      const avg=calcAvgHyojun('w',22,41);
      const expect=avg*5.481/1000*(41-22-(41-35))*12;
      if(Math.abs(kShort-expect)>0.5) out.push(`扶養内パート中の死亡の遺族厚生の基礎 ${kShort.toFixed(1)}（実月数 ${expect.toFixed(1)} のはず）`);
      // 前の形式（段階に働き方なし＋全体の働き方が扶養内パート）は年金が前のまま
      const d=JSON.parse(JSON.stringify(_collectSaveData()));
      d.dynamic.incSteps.w.forEach(x=>{delete x.workType; delete x.wtLegacy;});
      d.fields['w-work-type']='part';
      _applyData(d); await wait(500);
      const legacyMarked=[...document.querySelectorAll('#w-income-cont>[id^="w-is-"]')].every(el=>el.dataset.wtLegacy==='1');
      calcPension('w'); const pLegacy=+$('pension-w').value;
      const hintL=$('w-pension-hint')?.textContent||'';
      info.pLegacy=pLegacy;
      if(!legacyMarked) out.push('前の形式の段階に目印が付かない');
      if(/扶養内パート\d+年/.test(hintL)) out.push('前の形式なのに扶養内パートの年を厚生年金から外している');
      // 目印は保存し直しても残る
      const d2=JSON.parse(JSON.stringify(_collectSaveData()));
      if(!d2.dynamic.incSteps.w.every(x=>x.wtLegacy)) out.push('保存し直すと前の形式の目印が消える');
      return {out,info};
    });
    if(WT.out.length){ bad++; console.log('❌ 収入の段階ごとの働き方\n   - '+WT.out.join('\n   - ')+'\n   '+JSON.stringify(WT.info)); }
    else console.log(`✅ 段階ごとの働き方: 会社員→扶養内パート（手取り${WT.info.net30}→${WT.info.net40}・年金${WT.info.pPart}万／社保ありなら${WT.info.pShaho}万）・パート中の障害は傷病手当金なし・遺族厚生は実月数・前の形式は前のまま`);
  } finally { try{ await browser.close(); }catch(e){} srv.close(); }
  process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
