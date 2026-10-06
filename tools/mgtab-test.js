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
  } finally { try{ await browser.close(); }catch(e){} srv.close(); }
  process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
