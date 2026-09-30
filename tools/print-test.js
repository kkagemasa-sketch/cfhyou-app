/* =========================================================================
 *  印刷・PDF機能のテスト（print.js）
 *  - 代表シナリオで印刷プレビューを組み立て、次を検査する
 *    ① 画面のCF表と印刷の全マスが一致（抜け・重複・値違いが0件）
 *    ② 数字・文字の欠け（はみ出し）が0件
 *    ③ ページ構成 = 表紙1 + CF表(20年ごと・縦1枚) + ご確認事項1
 *    ④ 印刷モードで各ページの中身が用紙からはみ出さない
 *    ⑤ わざと1マス消すと抜け漏れチェックが検知する（チェック自体の動作確認）
 *  - 使い方: node tools/print-test.js [--pdf 出力フォルダ]   ※--pdf で確認用PDFも保存
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const { findEdge, startServer, launchEdge, openApp, pageBaseSetup } = require('./edge-harness');

const PDF_DIR = (()=>{ const i=process.argv.indexOf('--pdf'); return i>0 ? process.argv[i+1] : null; })();

// 行が多いお客様（子3人・車3台・有価証券3件(解約あり)・積立保険2件・財形・特別支出3件・手入力行・上書き・行名変更）
function heavySetup(){
  const $=id=>document.getElementById(id);
  const set=(id,v)=>{ const e=$(id); if(e) e.value=v; };
  setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
  $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=250;
  setCostType('cash'); setDownType('own'); $('loan-yrs').value=35; $('rate-base').value=0.7;
  if(typeof syncRateBase==='function')syncRateBase(); calcLoanAmt();
  addChild(); if($('ca-2'))$('ca-2').value=1; addChild(); if($('ca-3'))$('ca-3').value=0;
  setCarOwn(true);
  addExistingCar({label:'ご主人様車',owner:'h',type:'new',pay:'loan',boughtAgo:'2',price:'350',endYrs:'10',insp:'12',down:'50',loanYrs:'5',loanRate:'2.0'});
  addCar({label:'奥様車',owner:'w',type:'new',pay:'cash',price:'250',first:'3',cycle:'7',insp:'10'});
  addCar({label:'家族車',owner:'share',type:'used',pay:'cash',price:'150',first:'5',cycle:'9',insp:'8'});
  const addSec=(p,o)=>{ addSecurity(p);
    const els=document.querySelectorAll(`[id^="sec-bal-${p}-"]`); const sid=els[els.length-1].id.split('-').pop();
    $(`sec-acc-${p}-${sid}`)?.classList.add('on'); if(o.nisa) $(`sec-nisa-${p}-${sid}`)?.classList.add('on');
    set(`sec-label-${p}-${sid}`,o.label); set(`sec-bal-${p}-${sid}`,o.bal); set(`sec-monthly-${p}-${sid}`,o.m); set(`sec-rate-${p}-${sid}`,o.rate);
    if(o.redeem) set(`sec-redeem-${p}-${sid}`,o.redeem); };
  addSec('h',{label:'全世界株式インデックス',bal:300,m:3,rate:4,nisa:true});
  addSec('h',{label:'米国高配当株ファンド',bal:200,m:2,rate:3,redeem:55});
  addSec('w',{label:'バランスファンド',bal:100,m:1,rate:2.5,nisa:true,redeem:60});
  addInsSaving('h'); { const id=insSavCnt; set(`ins-label-h-${id}`,'米ドル建て積立利率変動型終身保険'); set(`ins-m-h-${id}`,2); set(`ins-age-h-${id}`,60); set(`ins-redeem-h-${id}`,65); set(`ins-redeem-amt-h-${id}`,800); }
  addInsSaving('w'); { const id=insSavCnt; set(`ins-label-w-${id}`,'学資保険（第一子）'); set(`ins-m-w-${id}`,1); set(`ins-age-w-${id}`,50); set(`ins-redeem-w-${id}`,48); set(`ins-redeem-amt-w-${id}`,200); }
  set('zaikei-h-bal',150); set('zaikei-h-monthly',1);
  addExtraItem(2030,200,'リフォーム（キッチン・浴室まわり）');
  addExtraItem(2035,50,'家族旅行',2045);
  addExtraItem(2040,300,'親の介護費用（見込み）');
  cfCustomRows.push({id:'cinc_pt1',type:'inc',label:'副業収入（ブログ・講師業）'}); cfOverrides['cinc_pt1']={3:30,4:30,5:30};
  cfCustomRows.push({id:'cexp_pt1',type:'exp',label:'ペット関連費用'}); cfOverrides['cexp_pt1']={2:15,3:15};
  cfOverrides['lc']={5:200};
  _cfRowLabels['lc']='生活費（見直し後）';
  window._cfSummaryNote='諸費用は見積書の金額です。\n金利は変動金利で試算しています。';
}
function normalSetup(){
  const $=id=>document.getElementById(id);
  setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
  $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
  setCostType('cash'); setDownType('own'); $('loan-yrs').value=35; $('rate-base').value=0.5;
  if(typeof syncRateBase==='function')syncRateBase(); calcLoanAmt();
}

const CASES = [
  { name:'通常CF_標準',        setup:normalSetup, kind:'cf' },
  { name:'通常CF_行が多い',    setup:heavySetup,  kind:'cf', expectRowsAtLeast:50 },
  { name:'通常CF_金融資産行を隠す', setup:heavySetup, kind:'cf', hideFin:true },
  { name:'万が一CF_行が多い',  setup:heavySetup,  kind:'mg' },
];

(async()=>{
  let puppeteer;
  try{ puppeteer=require('puppeteer-core'); }
  catch(e){ console.log('⚠ puppeteer-core がありません（npm install）→ 印刷テストをスキップ'); process.exit(0); }
  const edge=findEdge();
  if(!edge){ console.log('⚠ Edge が見つかりません → 印刷テストをスキップ'); process.exit(0); }
  const srv=await startServer();
  const origin=`http://127.0.0.1:${srv.address().port}`;
  const browser=await launchEdge(puppeteer, edge);
  let bad=0;
  try{
    for(const c of CASES){
      const errors=[];
      const page=await openApp(browser, origin, errors);
      await page.evaluate(pageBaseSetup);
      await page.evaluate(c.setup);
      const r = await page.evaluate(async(c)=>{
        document.getElementById('client-name').value='テスト 太郎';
        if(typeof live==='function') live(true);
        await new Promise(res=>setTimeout(res,1800));
        if(c.kind==='mg'){
          renderContingency();
          await new Promise(res=>setTimeout(res,300));
        } else if(typeof setRTab==='function') setRTab('cf');
        if(c.hideFin){ finAssetVisible=false; _applyFinAssetVisibility(); }
        await openPrintPreview(c.kind);
        const res = window._ppLastResult || {};
        const box = document.getElementById('pp-preview');
        const src = document.querySelector('#right-body .tbl-wrap > table.cf');
        const nCols = src.rows[0].cells.length;
        const years = nCols-3;
        const visibleRows = [...src.rows].filter(r=>r.cells.length===nCols && r.style.display!=='none' && !/行を追加/.test(r.textContent)).length;
        const tablePages = box.querySelectorAll('.pp-tbl').length;
        // ⑤ チェック自体の動作確認：1マス消して再照合
        const victim = box.querySelectorAll('.pp-tbl td[data-pp]')[40];
        victim.remove();
        const nCols2 = nCols;
        const srcRows = [...src.rows].filter(r=>r.cells.length===nCols2 && r.style.display!=='none' && !/行を追加/.test(r.textContent));
        const detected = _ppVerify(box, srcRows, src.rows[0], nCols).length;
        return { pages:res.pages, problems:res.problems, hiddenRows:res.hiddenRows, fontPx:res.fontPx, overflow:res.overflow,
                 years, visibleRows, tablePages, detected, title:box.querySelector('.pp-title')?.textContent||'' };
      }, c);
      // ④ 印刷モードでページからはみ出さないか（⑤で消したマスを戻すため作り直す）
      await page.evaluate(async(c)=>{ await openPrintPreview(c.kind); }, c);
      await page.emulateMediaType('print');
      const printFit = await page.evaluate(()=>[...document.querySelectorAll('#pp-preview .pp-body')].every(b=>b.scrollHeight<=b.clientHeight+1));
      if(PDF_DIR){ fs.mkdirSync(PDF_DIR,{recursive:true}); await page.pdf({path:path.join(PDF_DIR,c.name+'.pdf'),preferCSSPageSize:true,printBackground:true}); }
      await page.emulateMediaType(null);

      const expPages = 1 + Math.ceil(r.years/20) + 1;
      const fails=[];
      if(errors.length) fails.push('JSエラー: '+errors.slice(0,2).join(' / '));
      if(!r.problems || r.problems.length) fails.push(`抜け漏れ ${r.problems?r.problems.length:'?'}件: ${(r.problems||[]).slice(0,2).join(' / ')}`);
      if(r.overflow) fails.push(`はみ出し ${r.overflow}件`);
      if(r.pages!==expPages) fails.push(`ページ数 ${r.pages}（期待 ${expPages}）`);
      if(r.tablePages!==Math.ceil(r.years/20)) fails.push(`CF表ページ ${r.tablePages}（縦1枚なら ${Math.ceil(r.years/20)}）`);
      if(!printFit) fails.push('印刷モードでページからはみ出し');
      if(!(r.detected>0)) fails.push('1マス消しても抜け漏れチェックが検知しない');
      if(c.expectRowsAtLeast && r.visibleRows<c.expectRowsAtLeast) fails.push(`行数 ${r.visibleRows}（${c.expectRowsAtLeast}行以上のはず）`);
      if(c.hideFin && !(r.hiddenRows>0)) fails.push('金融資産行を隠したのに非表示行が0');
      if(c.kind==='mg' && !/万が一/.test(r.title)) fails.push('万が一CF表の見出しになっていない');
      const info=`${r.visibleRows}行・${r.pages}ページ・文字${(r.fontPx||[]).join('/')}px`;
      if(fails.length){ bad++; console.log(`❌ ${c.name}（${info}）\n   - ${fails.join('\n   - ')}`); }
      else console.log(`✅ ${c.name}（${info}・抜け漏れ0・はみ出し0・検知テストOK）`);
      await page.close();
    }
  } finally {
    try{ await browser.close(); }catch(e){}
    srv.close();
  }
  if(bad){ console.log(`\n❌ 印刷テスト: ${bad}件 失敗`); process.exit(1); }
  console.log('\n✅ 印刷テスト: 全件合格');
})().catch(e=>{ console.error(e); process.exit(1); });
