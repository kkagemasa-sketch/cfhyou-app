/* =========================================================================
 *  テスト共通ハーネス（計算回帰テスト / モード総当たりテストが共用）
 *  - リポジトリ直下を配信する簡易サーバ
 *  - headless Edge の起動（spawn→DevTools connect。launchはEdgeの自己再起動で失敗するため）
 *  - アプリを開いて準備完了まで待つ（外部通信は全遮断＝本番Firebase等に影響ゼロ）
 *  - 全テスト共通の決定的なシナリオ土台（開始年2026固定）
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');

function findEdge(){
  const cands = [
    process.env.CF_EDGE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  for(const p of cands){ try{ if(fs.existsSync(p)) return p; }catch(e){} }
  return null;
}

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

async function launchEdge(puppeteer, edgeExe){
  const {spawn}=require('child_process');
  const os=require('os');
  const udd=fs.mkdtempSync(path.join(os.tmpdir(),'cf-test-'));
  const dbgPort=9222+Math.floor(Math.random()*500);
  spawn(edgeExe,[
    '--headless','--disable-gpu','--no-first-run','--no-default-browser-check',
    '--disable-extensions',`--remote-debugging-port=${dbgPort}`,`--user-data-dir=${udd}`,'about:blank'
  ],{detached:false,stdio:'ignore'});
  const browserURL=`http://127.0.0.1:${dbgPort}`;
  for(let i=0;i<30;i++){
    try{ return await puppeteer.connect({browserURL, defaultViewport:{width:1280,height:900}}); }
    catch(e){ await new Promise(r=>setTimeout(r,500)); }
  }
  throw new Error('Edge(DevTools)に接続できませんでした');
}

/* アプリを開き、準備完了まで待って page を返す。pageerror は errors 配列に蓄積。 */
async function openApp(browser, origin, errors){
  const page=await browser.newPage();
  // ★ 外部通信を全遮断（本番Firebase・Sentry等に絶対に触れない）
  await page.setRequestInterception(true);
  page.on('request',req=>{ req.url().startsWith(origin)?req.continue():req.abort().catch(()=>{}); });
  // パスワード画面をスキップ（テスト用一時プロファイル内のみ）
  await page.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('cf-auth-exp', String(Date.now()+86400000)); }catch(e){} });
  page.on('pageerror',e=>{
    const m=String(e&&e.message||e);
    // 外部遮断に伴う既知の無害エラーは無視（firebaseモジュール読込失敗等）
    if(/firebase|dynamically imported module|Sentry/i.test(m)) return;
    if(errors) errors.push(m);
    if(process.env.CALC_TEST_VERBOSE) console.log('[page-error]',m);
  });
  await page.goto(`${origin}/index.html`,{waitUntil:'load',timeout:60000});
  await page.waitForFunction("typeof live==='function'&&typeof _resetSheetState==='function'&&typeof render==='function'&&typeof addIncomeStep==='function'",{timeout:30000});
  await new Promise(r=>setTimeout(r,1200)); // onloadのデフォルト投入(setTimeout)を待ってから上書き
  return page;
}

/* ---------- ページ内で実行する共通セットアップ（決定的な入力） ----------
 * 全テスト共通の土台。開始年は2026固定（年が変わっても正解表が壊れないように） */
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

module.exports = { ROOT, findEdge, startServer, launchEdge, openApp, pageBaseSetup };
