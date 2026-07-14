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
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const GOLDEN = path.join(ROOT, 'test', 'golden.json');
const UPDATE = process.argv.includes('--update');

/* ---------- Edge 実行ファイルの検出 ---------- */
function findEdge(){
  const cands = [
    process.env.CF_EDGE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  for(const p of cands){ try{ if(fs.existsSync(p)) return p; }catch(e){} }
  return null;
}

/* ---------- 簡易静的サーバ（リポジトリ直下を配信） ---------- */
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
function startServer(){
  return new Promise(resolve=>{
    const srv = http.createServer((req,res)=>{
      let p = decodeURIComponent(req.url.split('?')[0]);
      if(p==='/') p='/index.html';
      const file = path.join(ROOT, p);
      if(!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, {'Content-Type': MIME[path.extname(file)]||'application/octet-stream', 'Cache-Control':'no-store'});
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', ()=>resolve(srv));
  });
}

/* ---------- ページ内で実行する共通セットアップ（決定的な入力） ---------- */
/* 全シナリオ共通の土台。開始年は2026固定（年が変わっても正解表が壊れないように） */
function pageBaseSetup(){
  _resetSheetState();
  _cfStartYear = 2026;
  const $=id=>document.getElementById(id);
  $('husband-age').value=30; $('wife-age').value=29;
  // 子ども1人（3歳）
  addChild(); if($('ca-1'))$('ca-1').value=3;
  // 収入: ご主人 30→65歳 541→700 / 奥様 29→60歳 322→450
  addIncomeStep('h');
  if($('h-is-1-from'))$('h-is-1-from').value=30;
  if($('h-is-1-to'))$('h-is-1-to').value=65;
  if($('h-is-1-net-from'))$('h-is-1-net-from').value=541;
  if($('h-is-1-net-to'))$('h-is-1-net-to').value=700;
  addIncomeStep('w');
  if($('w-is-1-from'))$('w-is-1-from').value=29;
  if($('w-is-1-to'))$('w-is-1-to').value=60;
  if($('w-is-1-net-from'))$('w-is-1-net-from').value=322;
  if($('w-is-1-net-to'))$('w-is-1-net-to').value=450;
  // 退職・年金・現預金・生活費
  if($('retire-age'))$('retire-age').value=60;
  if($('w-retire-age'))$('w-retire-age').value=60;
  if($('retire-pay'))$('retire-pay').value=500;
  if($('w-retire-pay'))$('w-retire-pay').value=300;
  if($('cash-h'))$('cash-h').value=800;
  if($('cash-w'))$('cash-w').value=300;
  if($('lc-food'))$('lc-food').value=60000;
  if($('lc-elec'))$('lc-elec').value=12000;
  if($('lc-comm'))$('lc-comm').value=10000;
  // 引き渡し 2027年（1年後）
  if($('delivery-year'))$('delivery-year').value=2027;
  if(typeof calcDelivery==='function')calcDelivery();
}

/* ---------- シナリオ定義（各々が土台の上にモード・住宅条件を重ねる） ---------- */
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

/* ---------- Edge起動（puppeteer.launchはEdgeの自己再起動で失敗するため、
             自前でspawn→DevToolsポートへconnectする方式） ---------- */
async function launchEdge(puppeteer, edgeExe){
  const {spawn}=require('child_process');
  const os=require('os');
  const udd=fs.mkdtempSync(path.join(os.tmpdir(),'cf-calc-test-'));
  const dbgPort=9222+Math.floor(Math.random()*500);
  spawn(edgeExe,[
    '--headless','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--disable-extensions',`--remote-debugging-port=${dbgPort}`,`--user-data-dir=${udd}`,'about:blank'
  ],{detached:false,stdio:'ignore'});
  // DevToolsが応答するまで待つ（最大15秒）
  const browserURL=`http://127.0.0.1:${dbgPort}`;
  for(let i=0;i<30;i++){
    try{
      const b=await puppeteer.connect({browserURL, defaultViewport:{width:1280,height:900}});
      return b;
    }catch(e){ await new Promise(r=>setTimeout(r,500)); }
  }
  throw new Error('Edge(DevTools)に接続できませんでした');
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
    const page=await browser.newPage();
    // ★ 外部通信を全遮断（本番Firebase・Sentry等に絶対に触れない）
    await page.setRequestInterception(true);
    page.on('request',req=>{ req.url().startsWith(origin)?req.continue():req.abort().catch(()=>{}); });
    // パスワード画面をスキップ（テスト用プロファイル内のみ）
    await page.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('cf-auth-exp', String(Date.now()+86400000)); }catch(e){} });
    page.on('pageerror',e=>{ if(process.env.CALC_TEST_VERBOSE) console.log('[page-error]',e.message); });

    await page.goto(`${origin}/index.html`,{waitUntil:'load',timeout:60000});
    await page.waitForFunction("typeof live==='function'&&typeof _resetSheetState==='function'&&typeof render==='function'&&typeof addIncomeStep==='function'",{timeout:30000});
    await new Promise(r=>setTimeout(r,1200)); // onloadのデフォルト投入(setTimeout)を待ってから上書き

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
