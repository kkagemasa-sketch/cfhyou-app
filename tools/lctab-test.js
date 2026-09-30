/* =========================================================================
 *  生活費タブ（lc-tab.js）の入力連動テスト
 *  - タブで金額を入力 → 入力パネルの欄に反映・合計カードとCF表の生活費が更新される
 *  - 備考の入力 → _lcBikou に保存される
 *  - 「その他」の項目名 → 入力パネルの項目名欄に反映される
 *  使い方: node tools/lctab-test.js
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
      live(true); await wait(1500);
      setRTab('lctab'); await wait(300);
      const rb=document.getElementById('right-body');
      const out={};
      out.cards=rb.querySelectorAll('.lct-cards .card').length;
      out.tables=rb.querySelectorAll('.lct-tbl').length;
      // 金額の入力（食費を 90000 に）
      const amt=rb.querySelector('input[data-srcid="lc-food"]');
      amt.focus(); amt.value='90000'; amt.blur();
      await wait(1500);
      out.panelFood=document.getElementById('lc-food').value;
      const rb2=document.getElementById('right-body');
      out.cardText=rb2.querySelector('.lct-cards .card.fix .v')?.textContent||'';
      out.amtShown=rb2.querySelector('input[data-srcid="lc-food"]')?.value||'';
      // 備考
      const bik=rb2.querySelector('input[data-bikid="lc-food"]');
      bik.value='外食込み'; bik.dispatchEvent(new Event('input',{bubbles:true}));
      out.bikou=_lcBikou['lc-food'];
      // その他の項目名
      const nm=rb2.querySelector('input[data-nameid="lc-other-m-name"]');
      nm.value='習い事'; nm.dispatchEvent(new Event('input',{bubbles:true}));
      await wait(1200);
      out.panelName=document.getElementById('lc-other-m-name').value;
      // 月額合計＝入力パネルの月額項目の合計と一致するか
      const isM=ST.type==='mansion';
      const sumM=LC_MONTHLY_ITEMS.filter(it=>!(it.cond==='mansion'&&!isM)).reduce((s,it)=>s+(parseFloat(String(document.getElementById(it.id)?.value||'').replace(/,/g,''))||0),0);
      out.sumM=sumM;
      out.cardAfter=document.querySelector('#right-body .lct-cards .card.fix .v')?.textContent||'';
      return out;
    });
    const fails=[];
    if(errors.length) fails.push('JSエラー: '+errors.slice(0,2).join(' / '));
    if(r.cards!==3) fails.push(`金額カード ${r.cards}枚（3枚のはず）`);
    if(r.tables!==2) fails.push(`明細表 ${r.tables}個（2個のはず）`);
    if(String(r.panelFood).replace(/,/g,'')!=='90000') fails.push(`タブで入力した食費が入力パネルに反映されない（${r.panelFood}）`);
    if(r.amtShown!=='¥90,000') fails.push(`タブの金額表示 ${r.amtShown}`);
    if(r.bikou!=='外食込み') fails.push('備考が保存されない');
    if(r.panelName!=='習い事') fails.push('その他の項目名が入力パネルに反映されない');
    if(!r.cardAfter.includes('¥'+r.sumM.toLocaleString())) fails.push(`月額カード「${r.cardAfter}」が入力パネルの合計 ${r.sumM} と不一致`);
    if(fails.length){ bad++; console.log('❌ 生活費タブ\n   - '+fails.join('\n   - ')); }
    else console.log(`✅ 生活費タブ: 入力→入力パネル連動・備考保存・項目名連動・合計カード一致（月額 ¥${r.sumM.toLocaleString()}）`);
  } finally { try{ await browser.close(); }catch(e){} srv.close(); }
  process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
