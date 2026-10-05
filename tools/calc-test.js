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
  'S7_繰上返済': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    // 10年目に期間短縮型300万 + 20年目に返済額軽減型200万（4パターンのうち金額指定2種）
    addPrepayRow('s',{yr:10,type:'term',mode:'amt',val:300,_noLive:true});
    addPrepayRow('s',{yr:20,type:'reduce',mode:'amt',val:200,_noLive:true});
  },
  'S6_車所有者別': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    // 現有車=ご主人様(ローン中) / 将来車=奥様(7年周期買替) / 共用の将来車1台
    setCarOwn(true);
    addExistingCar({label:'ご主人様車',owner:'h',type:'new',pay:'loan',boughtAgo:'2',price:'350',endYrs:'10',insp:'12',down:'50',loanYrs:'5',loanRate:'2.0'});
    addCar({label:'奥様車',owner:'w',type:'new',pay:'cash',price:'250',first:'3',cycle:'7',insp:'10'});
    addCar({label:'家族車',owner:'share',type:'used',pay:'cash',price:'150',first:'5',cycle:'9',insp:'8'});
    calcLoanAmt();
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
  'S8_財形自動取崩し': function(){
    // 赤字家計＋財形＋課税積立: 財形→課税の順で自動取崩し、解約年ネットまで検査
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    $('lc-food').value=600000; $('lc-elec').value=60000; $('lc-comm').value=60000;
    addSecurity('h');
    const els=document.querySelectorAll('[id^="sec-bal-h-"]');
    const sid=els[els.length-1].id.split('-').pop();
    document.getElementById(`sec-acc-h-${sid}`)?.classList.add('on');
    document.getElementById(`sec-bal-h-${sid}`).value=3000;
    document.getElementById(`sec-monthly-h-${sid}`).value=2;
    document.getElementById(`sec-rate-h-${sid}`).value=3;
    if($('zaikei-h-bal'))$('zaikei-h-bal').value=600;
    if($('zaikei-h-monthly'))$('zaikei-h-monthly').value=1;
  },
  'S9_上書き自動取崩し': function(){
    // セル上書き＋カスタム支出行があっても「マイナスなら0まで取崩す」約束を検査
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    $('lc-food').value=600000; $('lc-elec').value=60000; $('lc-comm').value=60000;
    addSecurity('h');
    const els=document.querySelectorAll('[id^="sec-bal-h-"]');
    const sid=els[els.length-1].id.split('-').pop();
    document.getElementById(`sec-acc-h-${sid}`)?.classList.add('on');
    document.getElementById(`sec-bal-h-${sid}`).value=3000;
    document.getElementById(`sec-monthly-h-${sid}`).value=2;
    document.getElementById(`sec-rate-h-${sid}`).value=3;
    // 生活費セル上書き(5年目1000万) ＋ カスタム支出行(8年目71万)
    cfOverrides['lc']={5:1000};
    cfCustomRows.push({id:'cexp_reg1',type:'exp',label:'回帰テスト支出'});
    cfOverrides['cexp_reg1']={8:71};
  },
  'S10_引越引渡年計上': function(){
    // 引越・家具家電が引き渡し年の支出として計上され、購入直後からは差引かれないことを検査
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    $('moving-cost').value=150;
    setMoveType('own');
  },
  /* ---- 万が一（Q&Aタブ経由。実際の操作と同じ道を通す） ----
   * 各シナリオ内の mg() は「通常CFに戻す→Q&Aタブ追加→stateを書換→即時計算」。
   * page.evaluate は関数単位で送られるため、mg() は各シナリオ内に書く。 */
  'M1_夫死亡_単独_団信完済_保険金': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:3,houseMode:'danshin',lcRatio:70,insurances:[{type:'lump',amount:1000,annual:0,endAge:65}]});
  },
  'M2_妻死亡_単独_ローン継続': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('w',{deathYear:5,houseMode:'keep',lcRatio:80});
  },
  'M3_夫死亡_ペア_ローン継続': function(){
    // 不具合1の再発防止: ペアローン＋住居「ローン継続」で死亡者のローンが残ること
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
    $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
    setCostType('cash'); setDownType('own');
    $('loan-h-amt').value=3000; $('loan-w-amt').value=1500;
    $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
    $('rate-h-base').value=0.6; $('rate-w-base').value=0.7;
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:2,houseMode:'keep'});
  },
  'M4_妻死亡_ペア_団信完済': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
    $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
    setCostType('cash'); setDownType('own');
    $('loan-h-amt').value=3000; $('loan-w-amt').value=1500;
    $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
    $('rate-h-base').value=0.6; $('rate-w-base').value=0.7;
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('w',{deathYear:4,houseMode:'danshin'});
  },
  'M5_夫死亡_連帯_団信完済': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('joint');
    $('house-price').value=4800; $('down-payment').value=300; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:6,houseMode:'danshin'});
  },
  'M6_夫死亡_車駐車場変更': function(){
    // 不具合3の再発防止: 死亡前の年は通常CFの車・駐車場、駐車場0円は0円のまま
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    setCarOwn(true);
    addCar({label:'家族車',owner:'share',type:'new',pay:'cash',price:'300',first:'2',cycle:'7',insp:'10'});
    if($('parking'))$('parking').value=2;
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:4,houseMode:'danshin',
      carInherit:false,mgExistingCars:[],mgFutureCars:[{type:'used',pay:'cash',price:150,first:2,cycle:9,insp:8,endAge:70}],
      parkInherit:false,parkMode:'keep',parkMonthly:0});
  },
  'M7_夫死亡_収入生活費段階_年金型保険': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:2,houseMode:'danshin',
      insurances:[{type:'annuity',amount:0,annual:120,endAge:60}],
      incomeMode:'override',incomeSteps:[{ageFrom:30,ageTo:44,netFrom:180,netTo:180},{ageFrom:45,ageTo:60,netFrom:300,netTo:300}],
      lcMode:'step',lcSteps:[{base:300,rate:0,fromYr:2027,toYr:2040,mode:'free',pct:0},{base:250,rate:0,fromYr:2041,toYr:2080,mode:'free',pct:0}]});
  },
  'S11_単独_奥様名義': function(){
    // 住宅ローン控除を奥様の税額から計算（⑤住宅の名義人）
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    $('loan-borrower').value='w'; syncLoanDansinUI();
    calcLoanAmt();
  },
  'M9_妻死亡_単独奥様名義_団信完済': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    $('loan-borrower').value='w'; syncLoanDansinUI();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('w',{deathYear:4,houseMode:'danshin'});
  },
  'M10_夫死亡_団信加入なし': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    $('loan-dansin').value='no'; syncLoanDansinUI();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:3,houseMode:'danshin'});
  },
  'M11_妻死亡_連帯おふたり_ペア奥様なし': function(){
    // 連帯債務「おふたり」→奥様死亡でも完済
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('joint');
    $('house-price').value=4800; $('down-payment').value=300; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    $('joint-dansin-sel').value='both'; syncLoanDansinUI();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('w',{deathYear:3,houseMode:'danshin'});
  },
  'M12_妻死亡_ペア奥様団信なし': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('pair');
    $('house-price').value=5000; $('down-payment').value=500; $('house-cost').value=0;
    setCostType('cash'); setDownType('own');
    $('loan-h-amt').value=3000; $('loan-w-amt').value=1500;
    $('loan-h-yrs').value=35; $('loan-w-yrs').value=30;
    $('rate-h-base').value=0.6; $('rate-w-base').value=0.7;
    $('loan-dansin-w').value='no'; syncLoanDansinUI();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('w',{deathYear:4,houseMode:'danshin'});
  },
  'M8_夫死亡_賃貸へ_奨学金': function(){
    const $=id=>document.getElementById(id);
    setFundingMode('detail'); setLoanCategory('standard'); setLoanMode('single');
    $('house-price').value=4500; $('down-payment').value=500; $('house-cost').value=200;
    setCostType('cash'); setDownType('own');
    $('loan-yrs').value=35; $('rate-base').value=0.5;
    if(typeof syncRateBase==='function')syncRateBase();
    calcLoanAmt();
    const mg=(target,patch)=>{ setRTab('cf'); mgQA_addTab(target); const t=mgQA_tabs[mgQA_tabs.length-1]; Object.assign(t.state,patch); mgQA_calcAndRender(t,true); };
    mg('h',{deathYear:5,houseMode:'rent',houseNewRent:10,
      scholarshipEnabled:true,scholarships:{0:{hs:{on:false,amount:0},univ:{on:true,amount:240}}}});
  },
};

/* ---------- ページ内スナップショット関数 ---------- */
function pageSnapshot(){
  // ★ 決定化: シナリオ設定が仕込んだ年金自動再計算(400ms)が発火する前に必ず打ち切る。
  //   正解表は「自動計算が発火していない状態」を正とする（pension欄は入力値のまま）。
  try{ clearTimeout(window._pensionRecalcTimer); }catch(e){}
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
