#!/usr/bin/env node
/* =========================================================================
 *  画面↔Excel 突き合わせ診断（CF表アプリ）
 *  画面のCF表(DOM)と、Excel出力(exportExcel)が書き出す全行を行ラベルで照合し、
 *  「画面にあってExcelに無い行 / Excelだけの行 / 数値がズレる行」を列挙する。
 *  使い方: node tools/diff-excel.js
 * ========================================================================= */
'use strict';
const { findEdge, startServer, launchEdge, openApp, pageBaseSetup } = require('./edge-harness');

/* ページ内: シナリオ適用は呼び出し側で。画面行とExcel行を収集して比較 */
async function pageCollectAndDiff(){
  // ダイアログでヘッドレスが固まらないよう無効化（氏名未入力confirm等）
  window.alert=()=>{}; window.confirm=()=>true; window.prompt=()=>null;
  const disp=window.lastDisp||60;
  const normNum=s=>{
    s=String(s).replace(/[,，\s]/g,'').replace(/[^\d.▲\-]/g,'');
    if(s===''||s==='-')return 0;
    const neg=s.includes('▲');
    const v=parseFloat(s.replace(/[▲]/g,''))||0;
    return neg?-v:v;
  };
  const rowsFromCells=cells=>{
    if(cells.length<disp+1)return null;
    const label=(cells[0]||cells[1]||'').trim();
    if(!label)return null;
    const vals=cells.slice(cells.length-1-disp,cells.length-1).map(normNum);
    return {label,vals};
  };
  // ── 画面側: CF表テーブルの全行 ──
  const screen=[];
  const tbl=document.querySelector('.panel-r table.cf')||document.querySelector('table.cf');
  if(tbl){
    tbl.querySelectorAll('tr').forEach(tr=>{
      const cells=[...tr.cells].map(td=>td.textContent.trim());
      const r=rowsFromCells(cells);
      if(r)screen.push(r);
    });
  }
  // ── Excel側: aoa_to_sheet を横取りして exportExcel を実行 ──
  window.__aoaCaptured=null;
  const origAoa=XLSX.utils.aoa_to_sheet;
  const origWrite=XLSX.writeFile;
  XLSX.utils.aoa_to_sheet=function(rows){ if(!window.__aoaCaptured)window.__aoaCaptured=JSON.parse(JSON.stringify(rows)); return origAoa.apply(this,arguments); };
  XLSX.writeFile=function(){ /* ファイルは書かない */ };
  let excelErr=null;
  try{ await exportExcel(); }catch(e){ excelErr=e.message; }
  XLSX.utils.aoa_to_sheet=origAoa; XLSX.writeFile=origWrite;
  const excel=[];
  (window.__aoaCaptured||[]).forEach(row=>{
    const cells=row.map(c=>c==null?'':String(c));
    const r=rowsFromCells(cells);
    if(r)excel.push(r);
  });
  // ── ラベルで照合（同名は出現順で対応付け） ──
  const useCount={};
  const take=(list,label)=>{
    const k=label; useCount[k]=useCount[k]||0;
    let n=0;
    for(const r of list){ if(r.label===k){ if(n===useCount[k])return r; n++; } }
    return null;
  };
  const diffs=[], onlyScreen=[], onlyExcel=[];
  const excelUsed=new Set();
  screen.forEach(sr=>{
    // Excel側から同ラベルを出現順に対応付け
    let match=null;
    for(let i=0;i<excel.length;i++){
      if(!excelUsed.has(i)&&excel[i].label===sr.label){ match=i; break; }
    }
    if(match===null){ if(sr.vals.some(v=>v!==0))onlyScreen.push(sr.label); return; }
    excelUsed.add(match);
    const er=excel[match];
    const bad=[];
    for(let i=0;i<disp;i++){
      if(Math.abs((sr.vals[i]||0)-(er.vals[i]||0))>0.5)bad.push(`[${i+1}年目]画面${sr.vals[i]}→Excel${er.vals[i]}`);
    }
    if(bad.length)diffs.push({label:sr.label,count:bad.length,sample:bad.slice(0,3)});
  });
  // Excel側だけにある「条件メモ行」（計算行ではない情報ブロック）は差分として扱わない
  const INFO_ROWS=['💰 頭金の内訳','🏦 住宅ローン条件','👔 ご主人様','👩 奥様','📝 注釈・補足'];
  excel.forEach((er,i)=>{
    if(excelUsed.has(i))return;
    if(INFO_ROWS.some(p=>er.label.startsWith(p)))return;
    if(er.vals.some(v=>v!==0))onlyExcel.push(er.label);
  });
  return {excelErr, screenRows:screen.length, excelRows:excel.length, diffs, onlyScreen, onlyExcel};
}

(async ()=>{
  const puppeteer=require('puppeteer-core');
  const srv=await startServer();
  const origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await launchEdge(puppeteer, findEdge());
  try{
    const page=await openApp(browser, origin, null);
    const SCN={
      '基本(単独ローン)': function(){
        const $=id=>document.getElementById(id);
        setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
        $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
        setCostType('cash'); setDownType('own');
        $('loan-yrs').value=35; $('rate-base').value=0.5;
        if(typeof syncRateBase==='function')syncRateBase(); calcLoanAmt();
      },
      'ペアローン': function(){
        const $=id=>document.getElementById(id);
        setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
        $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
        setCostType('cash'); $('loan-h-amt').value=3000; $('loan-w-amt').value=1500;
        $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
        $('rate-h-base').value=0.6; $('rate-w-base').value=0.7; calcLoanAmt();
      },
      '現金一括購入': function(){
        const $=id=>document.getElementById(id);
        setLoanCategory('standard'); setLoanMode('single'); setFundingMode('cash');
        $('house-price').value=4500; $('house-cost').value=200;
        $('delivery-year').value=2031; if(typeof calcDelivery==='function')calcDelivery();
        calcLoanAmt();
      },
      '繰上返済あり': function(){
        const $=id=>document.getElementById(id);
        setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
        $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
        setCostType('cash'); $('loan-h-amt').value=3000; $('loan-w-amt').value=1500; calcLoanAmt();
        addPrepayRow('h',{yr:10,type:'term',mode:'amt',val:200,_noLive:true});
        addPrepayRow('w',{yr:8,type:'reduce',mode:'amt',val:100,_noLive:true});
      },
      'セル編集(上書き)': function(){
        const $=id=>document.getElementById(id);
        setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
        $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
        setCostType('cash'); $('loan-h-amt').value=3000; $('loan-w-amt').value=1500; calcLoanAmt();
        setCarOwn(true);
        addExistingCar({label:'ご主人様車',owner:'h',type:'new',pay:'loan',boughtAgo:'2',price:'350',endYrs:'10',insp:'12',down:'50',loanYrs:'5',loanRate:'2.0'});
        render();
        // 各タイプの行にセル編集（上書き）を仕込む → 画面とExcelが同じ値になるべき
        cfOverrides['lc']={2:999};
        cfOverrides['lRepH']={3:888};
        cfOverrides['carTotalH']={1:77};
      },
      '車所有者別': function(){
        const $=id=>document.getElementById(id);
        setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
        $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
        setCostType('cash'); $('loan-yrs').value=35; $('rate-base').value=0.5; calcLoanAmt();
        setCarOwn(true);
        addExistingCar({label:'ご主人様車',owner:'h',type:'new',pay:'loan',boughtAgo:'2',price:'350',endYrs:'10',insp:'12',down:'50',loanYrs:'5',loanRate:'2.0'});
        addCar({label:'奥様車',owner:'w',type:'new',pay:'cash',price:'250',first:'3',cycle:'7',insp:'10'});
      },
    };
    let anyBad=false;
    for(const [name,setup] of Object.entries(SCN)){
      await page.evaluate(pageBaseSetup);
      await page.evaluate(setup);
      await page.evaluate('render()');
      const r=await page.evaluate(pageCollectAndDiff);
      const bad=(r.diffs.length||r.onlyScreen.length||r.onlyExcel.length||r.excelErr);
      console.log(`\n=== ${name} === 画面${r.screenRows}行 / Excel${r.excelRows}行 ${bad?'❌':'✅一致'}`);
      if(r.excelErr)console.log('  Excel出力が例外:', r.excelErr);
      r.onlyScreen.forEach(l=>console.log(`  ・画面にあるがExcelに無い: ${l}`));
      r.onlyExcel.forEach(l=>console.log(`  ・Excelだけにある: ${l}`));
      r.diffs.forEach(d=>console.log(`  ・数値ズレ ${d.label}: ${d.count}箇所 ${d.sample.join(', ')}`));
      if(bad)anyBad=true;
    }
    process.exit(anyBad?1:0);
  }catch(e){ console.log('ERR',e.message); process.exit(1); }
  finally{ try{await browser.close();}catch(e){} srv.close(); }
})();
