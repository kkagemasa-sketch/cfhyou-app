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
  } finally { try{ await browser.close(); }catch(e){} srv.close(); }
  process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
