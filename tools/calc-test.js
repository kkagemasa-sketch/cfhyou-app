#!/usr/bin/env node
/* =========================================================================
 *  計算回帰テスト（CF表アプリ）
 *  代表的なお客様パターンの「全計算結果」を正解表(test/golden.json)と照合する。
 *  1円でもズレたらコミットを止める（意図した計算変更のときだけ --update で正解表を更新）。
 *
 *  使い方:
 *    node tools/calc-test.js            … 照合（不一致なら exit 1）
 *    node tools/calc-test.js --update   … 現在の計算結果を正解として保存
 *
 *  仕組み:
 *    headless Edge で実アプリを起動 → シナリオを適用 → window.lastR / lastMR の
 *    数値配列を吸い上げて比較。外部通信(Firebase/Sentry等)は全て遮断するため、
 *    本番の共有データに影響することは絶対にない。
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, findEdge, startServer, launchEdge, openApp, pageBaseSetup } = require('./edge-harness');

const GOLDEN = path.join(ROOT, 'test', 'golden.json');
const UPDATE = process.argv.includes('--update');

/* ---------- シナリオ定義（各々が edge-harness の共通土台の上にモード・住宅条件を重ねる） ---------- */
const SCENARIOS = {
  'S1_単独ローン標準': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
  },
  'S2_ペアローン': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
    $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
    setCostType('cash'); setDownType('own');
    $('loan-h-amt').value=3000; $('loan-w-amt').value=1500;
    $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
    $('rate-h-base').value=0.6; $('rate-w-base').value=0.7;
    calcLoanAmt();
  },
  'S3_フラット35単独': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanMode('single'); setLoanCategory('flat35');
    if(typeof setFlat35Sub==='function')setFlat35Sub('flat35');
    $('house-price').value=4000; $('down-payment').value=400; $('house-cost').value=150;
    setCostType('cash'); setDownType('own');
    $('flat-loan-yrs').value=35; $('flat-rate-base').value=1.94;
    if(typeof updateFlat35Info==='function')updateFlat35Info();
    calcLoanAmt();
  },
  'S4_住宅ローン総額xペア': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
    setFundingMode('loanOnly');
    $('loan-total-simple').value=6000;
    onLoanTotalSimpleChange();
  },
  'S5_現金一括購入': function(){
    const $=id=>document.getElementById(id);
    setLoanCategory('standard'); setLoanMode('single');
    setFundingMode('cash');
    $('house-price').value=4500; $('house-cost').value=200;
    // 引き渡しを2031年(5年後)に: 将来purchaseの代表ケース
    $('delivery-year').value=2031; if(typeof calcDelivery==='function')calcDelivery();
    calcLoanAmt();
  },
};

/* ---------- ページ内スナップショット関数 ---------- */
function pageSnapshot(){
  if(typeof render==='function') render();
  if(typeof renderContingency==='function'){ try{ renderContingency(); }catch(e){} }
  const out={};
  const rnd=x=>Math.round(x*100)/100;
  const grab=(obj,prefix)=>{
    if(!obj) return;
    Object.keys(obj).sort().forEach(k=>{
      const v=obj[k];
      if(Array.isArray(v) && v.length>0 && v.every(x=>typeof x==='number'&&isFinite(x))){
        out[prefix+k]=v.map(rnd);
      }
    });
  };
  grab(window.lastR,'R.');
  grab(window.lastMR,'MR.');
  out['_disp']=window.lastDisp||0;
  return out;
}

/* ---------- 比較 ---------- */
function diffSnapshots(golden, actual){
  const diffs=[];
  const keys=new Set([...Object.keys(golden),...Object.keys(actual)]);
  for(const k of [...keys].sort()){
    const g=golden[k], a=actual[k];
    if(g===undefined){ diffs.push(`  ＋新しい行が増えた: ${k}`); continue; }
    if(a===undefined){ diffs.push(`  −行が消えた: ${k}`); continue; }
    if(Array.isArray(g)&&Array.isArray(a)){
      if(g.length!==a.length){ diffs.push(`  ${k}: 長さ ${g.length}→${a.length}`); continue; }
      const idx=[];
      for(let i=0;i<g.length;i++) if(g[i]!==a[i]) idx.push(i);
      if(idx.length){
        const show=idx.slice(0,4).map(i=>`[${i}年目] ${g[i]}→${a[i]}`).join(', ');
        diffs.push(`  ${k}: ${idx.length}箇所ズレ ${show}${idx.length>4?' …':''}`);
      }
    } else if(JSON.stringify(g)!==JSON.stringify(a)){
      diffs.push(`  ${k}: ${JSON.stringify(g)}→${JSON.stringify(a)}`);
    }
  }
  return diffs;
}

/* ---------- メイン ---------- */
(async ()=>{
  const edge=findEdge();
  if(!edge){ console.log('⚠️ Edgeが見つからないため計算テストをスキップしました。'); process.exit(0); }
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }
  catch(e){ console.log('⚠️ puppeteer-core未導入のため計算テストをスキップ（npm install で有効化）。'); process.exit(0); }

  const srv=await startServer();
  const port=srv.address().port;
  const origin=`http://127.0.0.1:${port}`;
  let browser;
  try{
    browser=await launchEdge(puppeteer, edge);
    const page=await openApp(browser, origin, null);

    const results={};
    for(const [name,setup] of Object.entries(SCENARIOS)){
      await page.evaluate(pageBaseSetup);
      await page.evaluate(setup);
      results[name]=await page.evaluate(pageSnapshot);
      const rowCount=Object.keys(results[name]).length;
      if(rowCount<10) throw new Error(`${name}: 取得できた行が${rowCount}行しかない（アプリ起動失敗の疑い）`);
      console.log(`  ▸ ${name}: ${rowCount}行の計算結果を取得`);
    }

    if(UPDATE){
      fs.mkdirSync(path.dirname(GOLDEN),{recursive:true});
      fs.writeFileSync(GOLDEN, JSON.stringify(results,null,1));
      console.log(`✅ 正解表を更新しました: test/golden.json（${Object.keys(results).length}シナリオ）`);
      process.exit(0);
    }

    if(!fs.existsSync(GOLDEN)){
      console.log('❌ 正解表(test/golden.json)がありません。node tools/calc-test.js --update で作成してください。');
      process.exit(1);
    }
    const golden=JSON.parse(fs.readFileSync(GOLDEN,'utf8'));
    let bad=0;
    for(const name of Object.keys({...golden,...results})){
      if(!golden[name]){ console.log(`❌ ${name}: 正解表に無い新シナリオ（--updateが必要）`); bad++; continue; }
      if(!results[name]){ console.log(`❌ ${name}: シナリオが実行されなかった`); bad++; continue; }
      const diffs=diffSnapshots(golden[name],results[name]);
      if(diffs.length){
        bad++;
        console.log(`❌ ${name}: 計算結果が正解表とズレています（${diffs.length}行）`);
        diffs.slice(0,8).forEach(d=>console.log(d));
        if(diffs.length>8)console.log(`  …ほか${diffs.length-8}行`);
      }
    }
    if(bad){
      console.log(`\n🛑 計算回帰テスト不合格（${bad}シナリオ）。意図した計算変更なら差分を確認のうえ`);
      console.log('   node tools/calc-test.js --update で正解表を更新してください。');
      process.exit(1);
    }
    console.log('✅ 計算回帰テスト合格：全シナリオの計算結果が正解表と一致。');
    process.exit(0);
  }catch(e){
    console.log('❌ 計算テストの実行に失敗:', e.message);
    process.exit(1);
  }finally{
    try{ if(browser) await browser.close(); }catch(e){}
    try{ srv.close(); }catch(e){}
  }
})();
