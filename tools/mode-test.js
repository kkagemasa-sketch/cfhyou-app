#!/usr/bin/env node
/* =========================================================================
 *  モード総当たりテスト（CF表アプリ）— 対策B
 *  資金計画(詳細/総額/現金) × ローン種別(単独/ペア/連帯) × 金利(固定変動/フラット35)
 *  ＝ 18通り全ての組み合わせで「守られるべき約束(不変条件)」を機械が検査する。
 *
 *  各組み合わせで確認すること:
 *   1. JSエラーが出ない
 *   2. 借入金額(loan-amt)がモードの定義どおり
 *        現金=0 / 総額=入力値 / 詳細ペア=夫婦合計 / 詳細単独・連帯=価格-頭金(+組込諸費用)
 *   3. 画面の表示・非表示が正しい（現金→ローン設定・控除・頭金が消える 等）
 *   4. 計算結果(通常CF+万一CF 全数値配列)に NaN/Infinity が混入しない
 *   5. 保存→復元で モード・借入額・支出合計 が変わらない（保存復元の対称性）
 *   6. 詳細設定に戻すと 住宅価格・頭金・諸費用 が元の値に復元される（データ保護）
 *
 *  使い方: node tools/mode-test.js   （不合格なら exit 1 ＝コミット阻止）
 * ========================================================================= */
'use strict';
const { findEdge, startServer, launchEdge, openApp, pageBaseSetup } = require('./edge-harness');

/* ---------- ページ内: 1組み合わせを適用して不変条件を検査 ---------- */
/* combo = {funding:'detail'|'loanOnly'|'cash', mode:'single'|'pair'|'joint', cat:'standard'|'flat35'} */
function pageRunCombo(combo){
  const $=id=>document.getElementById(id);
  const fails=[];
  const ck=(cond,msg)=>{ if(!cond) fails.push(msg); };

  // ── 組み合わせを適用（詳細設定の基準値: 4500/500/200・諸費用現金） ──
  setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
  $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
  setCostType('cash'); if(typeof setDownType==='function')setDownType('own');
  calcLoanAmt();
  setLoanCategory(combo.cat);
  if(combo.cat==='flat35'){
    if(typeof setFlat35Sub==='function')setFlat35Sub('flat35');
    if($('flat-loan-yrs'))$('flat-loan-yrs').value=35;
    if($('flat-rate-base'))$('flat-rate-base').value=1.94;
  } else {
    if($('loan-yrs'))$('loan-yrs').value=35;
    if($('rate-base'))$('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
  }
  setLoanMode(combo.mode);
  if(combo.mode==='pair'){
    const hId=combo.cat==='flat35'?'flat-loan-h-amt':'loan-h-amt';
    const wId=combo.cat==='flat35'?'flat-loan-w-amt':'loan-w-amt';
    if($(hId))$(hId).value=2500; if($(wId))$(wId).value=1500;
  }
  setFundingMode(combo.funding);
  if(combo.funding==='loanOnly'){
    $('loan-total-simple').value=6000;
    onLoanTotalSimpleChange();
  }
  calcLoanAmt();
  if(typeof render==='function')render();
  if(typeof renderContingency==='function'){ try{ renderContingency(); }catch(e){ fails.push('万一CF描画で例外: '+e.message); } }

  // ── 2. 借入金額の定義どおり ──
  const loanAmt=parseFloat($('loan-amt').value)||0;
  if(combo.funding==='cash'){
    ck(loanAmt===0, `借入額が0でない(${loanAmt})`);
  } else if(combo.funding==='loanOnly'){
    ck(loanAmt===6000, `借入額が総額入力6000と不一致(${loanAmt})`);
    if(combo.mode==='pair'){
      const hId=combo.cat==='flat35'?'flat-loan-h-amt':'loan-h-amt';
      const wId=combo.cat==='flat35'?'flat-loan-w-amt':'loan-w-amt';
      const sum=(parseFloat($(hId)?.value)||0)+(parseFloat($(wId)?.value)||0);
      ck(Math.abs(sum-6000)<=1, `ペア合計(${sum})が総額6000と不一致`);
    }
  } else { // detail
    if(combo.mode==='pair'){
      const hId=combo.cat==='flat35'?'flat-loan-h-amt':'loan-h-amt';
      const wId=combo.cat==='flat35'?'flat-loan-w-amt':'loan-w-amt';
      const sum=(parseFloat($(hId)?.value)||0)+(parseFloat($(wId)?.value)||0);
      ck(Math.abs(loanAmt-sum)<=1, `借入額(${loanAmt})≠ペア合計(${sum})`);
    } else {
      ck(loanAmt===4000, `借入額が 価格4500-頭金500=4000 でない(${loanAmt})`);
    }
  }

  // ── 3. 表示・非表示の約束 ──
  const disp=id=>{const el=$(id);return el?el.style.display:'(無)';};
  if(combo.funding==='cash'){
    ck(disp('hg-loan')==='none','現金なのにローン設定が表示');
    ck(disp('lctrl-box')==='none','現金なのに住宅ローン控除が表示');
    ck(disp('down-payment-fg')==='none','現金なのに頭金が表示');
  } else {
    ck(disp('hg-loan')!=='none','ローン設定が非表示のまま');
    ck(disp('lctrl-box')!=='none','住宅ローン控除が非表示のまま');
    ck(disp('funding-cash-note')==='none','現金でないのに現金の案内が表示');
    if(combo.funding==='loanOnly'){
      ck(disp('funding-loan-only-fields')!=='none','総額モードの入力欄が非表示');
      ck(disp('funding-detail-fields')==='none','総額モードなのに詳細欄が表示');
    } else {
      ck(disp('funding-detail-fields')!=='none','詳細欄が非表示');
    }
    // ローン種別ごとのパネル
    if(combo.cat==='flat35'){
      ck(disp('flat35-body')!=='none','フラット選択なのにフラット欄が非表示');
      if(combo.mode==='pair') ck(disp('flat-pair-panel')!=='none','フラットペアのパネルが非表示');
      else ck(disp('flat-single-panel')!=='none','フラット単独/連帯のパネルが非表示');
    } else {
      if(combo.mode==='pair') ck(disp('loan-pair-body')!=='none','ペアの入力欄が非表示');
      else ck(disp('loan-single-body')!=='none','単独/連帯の入力欄が非表示');
    }
    if(combo.mode==='joint') ck(disp('loan-joint-extra')!=='none','連帯債務の追加設定が非表示');
    else ck(disp('loan-joint-extra')==='none','連帯債務でないのに追加設定が表示');
  }

  // ── 4. 計算結果に NaN が混入しない ──
  const scanNaN=(obj,label)=>{
    if(!obj)return;
    Object.keys(obj).forEach(k=>{
      const v=obj[k];
      if(Array.isArray(v)&&v.length&&v.some(x=>typeof x==='number'&&!isFinite(x)))
        fails.push(`${label}.${k} に NaN/Infinity 混入`);
    });
  };
  scanNaN(window.lastR,'通常CF'); scanNaN(window.lastMR,'万一CF');
  ck(window.lastR&&Array.isArray(window.lastR.sav)&&window.lastR.sav.length>0,'通常CFの預貯金残高が空');

  // ── 5. 保存→復元の対称性 ──
  const expBefore=window.lastR&&window.lastR.expT?Math.round(window.lastR.expT[2]||0):null;
  const d=_collectSaveData();
  _applyData(d);
  if(typeof render==='function')render();
  ck(($('funding-mode').value)===combo.funding, `復元でモードが変わった(${$('funding-mode').value})`);
  const loanAfter=parseFloat($('loan-amt').value)||0;
  ck(Math.abs(loanAfter-loanAmt)<=1, `復元で借入額が変わった(${loanAmt}→${loanAfter})`);
  const expAfter=window.lastR&&window.lastR.expT?Math.round(window.lastR.expT[2]||0):null;
  ck(expBefore===expAfter, `復元で支出合計が変わった(3年目 ${expBefore}→${expAfter})`);

  // ── 6. 詳細設定へ戻すとお客様の値が復元される（データ保護） ──
  if(combo.funding!=='detail'){
    setFundingMode('detail');
    ck((parseFloat($('house-price').value)||0)===4500, `詳細へ戻して住宅価格が復元されない(${$('house-price').value})`);
    ck((parseFloat($('down-payment').value)||0)===500, `詳細へ戻して頭金が復元されない(${$('down-payment').value})`);
    ck((parseFloat($('house-cost').value)||0)===200, `詳細へ戻して諸費用が復元されない(${$('house-cost').value})`);
  }
  return fails;
}

/* ---------- メイン ---------- */
(async ()=>{
  const edge=findEdge();
  if(!edge){ console.log('⚠️ Edgeが見つからないためモードテストをスキップしました。'); process.exit(0); }
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }
  catch(e){ console.log('⚠️ puppeteer-core未導入のためモードテストをスキップ（npm install で有効化）。'); process.exit(0); }

  const srv=await startServer();
  const origin=`http://127.0.0.1:${srv.address().port}`;
  let browser;
  const pageErrors=[];
  try{
    browser=await launchEdge(puppeteer, edge);
    const page=await openApp(browser, origin, pageErrors);

    const FUND=['detail','loanOnly','cash'];
    const MODE=['single','pair','joint'];
    const CAT=['standard','flat35'];
    const JP={detail:'詳細',loanOnly:'総額',cash:'現金',single:'単独',pair:'ペア',joint:'連帯',standard:'固定変動',flat35:'フラット35'};

    let bad=0, count=0;
    for(const funding of FUND) for(const mode of MODE) for(const cat of CAT){
      count++;
      const name=`${JP[funding]}×${JP[mode]}×${JP[cat]}`;
      const errBefore=pageErrors.length;
      await page.evaluate(pageBaseSetup);
      const fails=await page.evaluate(pageRunCombo,{funding,mode,cat});
      // 1. JSエラー（この組み合わせ中に増えた分）
      if(pageErrors.length>errBefore) fails.push(`JSエラー発生: ${pageErrors.slice(errBefore).join(' / ')}`);
      if(fails.length){
        bad++;
        console.log(`❌ ${name}: ${fails.length}件の約束違反`);
        fails.slice(0,6).forEach(f=>console.log(`     ・${f}`));
      } else if(process.env.CALC_TEST_VERBOSE){
        console.log(`  ✓ ${name}`);
      }
    }

    // ── CF表(シナリオ)間の干渉テスト ──
    // 再現: A=詳細ペア(3000/1500)→複製でB→Aを総額モード8000に変更→Bへ切替。
    // Bのペア内訳・住宅価格・頭金・モードが無傷であること（過去バグ: 5333/2667・価格8000に汚染）。
    const leak=await page.evaluate(function(){
      const $=id=>document.getElementById(id);
      _resetSheetState(); _cfStartYear=2026;
      $('husband-age').value=30; $('wife-age').value=29;
      setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
      $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
      setCostType('cash');
      $('loan-h-amt').value=3000; $('loan-w-amt').value=1500; calcLoanAmt();
      execAddScenario(true);
      switchScenarioAndShow(scenarios[0].id);
      setFundingMode('loanOnly'); $('loan-total-simple').value=8000; onLoanTotalSimpleChange();
      switchScenarioAndShow(scenarios[scenarios.length-1].id);
      return {mode:$('funding-mode').value,h:$('loan-h-amt').value,w:$('loan-w-amt').value,
        total:$('loan-amt').value,price:$('house-price').value,down:$('down-payment').value};
    });
    const leakFails=[];
    if(leak.mode!=='detail')leakFails.push(`モードが汚染(${leak.mode})`);
    if(String(leak.h)!=='3000'||String(leak.w)!=='1500')leakFails.push(`ペア内訳が汚染(${leak.h}/${leak.w})`);
    if(String(leak.total)!=='4500')leakFails.push(`借入額が汚染(${leak.total})`);
    if(String(leak.price)!=='5000'||String(leak.down)!=='500')leakFails.push(`住宅価格/頭金が汚染(${leak.price}/${leak.down})`);
    if(leakFails.length){ bad++; console.log('❌ CF表間干渉テスト(複製→片方編集→切替): '+leakFails.join(' / ')); }
    else console.log('  ✓ CF表間干渉テスト(複製→片方編集→切替): Bは無傷');

    if(bad){
      console.log(`\n🛑 モード総当たりテスト不合格: ${count}通り中 ${bad}通りで約束違反。`);
      process.exit(1);
    }
    console.log(`✅ モード総当たりテスト合格: ${count}通り全ての組み合わせで約束(借入額・表示・NaN・保存復元・データ保護)を確認。`);
    process.exit(0);
  }catch(e){
    console.log('❌ モードテストの実行に失敗:', e.message);
    process.exit(1);
  }finally{
    try{ if(browser) await browser.close(); }catch(e){}
    try{ srv.close(); }catch(e){}
  }
})();
