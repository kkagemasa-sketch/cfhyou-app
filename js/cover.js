// cover.js — PDF表紙（案A-1）に載せる値を1か所で作る
// 値の出どころは画面のCF表の上の前提条件（cf-table.js）と同じ入力欄・同じ計算。表示は print.js の _ppCoverHtml
// kind: 'cf'（通常）| 'mg'（万が一。window.lastMR と万が一タブの設定を使う）
function getCoverData(kind){
  const single = householdType==='single';
  const hAge = iv('husband-age')||30, wAge = single?0:(iv('wife-age')||0);
  const isFlat = loanCategory==='flat35';
  const isCash = document.getElementById('funding-mode')?.value==='cash';
  const R = window.lastR||{};
  const disp = window.lastDisp||(R.yr||[]).length;
  const y0 = (R.yr||[])[0]||getCfStartYear(), yN = (R.yr||[])[Math.max(0,disp-1)]||y0;
  const hLbl = single?'ご本人':'ご主人様';
  const cLbls = ['第一子','第二子','第三子','第四子','第五子'];
  const kids = [...document.querySelectorAll('[id^="ca-"]')].map((el,i)=>({lbl:cLbls[i]||`第${i+1}子`, age:parseInt(el.value)||0}));
  const family = [{lbl:hLbl, age:hAge, p:'h'}];
  if(!single && wAge>0) family.push({lbl:'奥様', age:wAge, p:'w'});
  kids.forEach(k=>family.push(k));

  // 自己資金の内訳（画面と同じ）
  const _ot = (k,d)=>{try{return localStorage.getItem(k)||d}catch(e){return d}};
  const cashTotal = (fv('cash-h')||0)+(fv('cash-w')||0)+(fv('cash-joint')||0);
  const downPay = fv('down-payment')||0;
  const cost = fv('house-cost')||0;
  const costType = document.getElementById('cost-type')?.value||'cash';
  const move = (fv('moving-cost')||0)+(fv('furniture-init')||0);
  const moveType = document.getElementById('move-type')?.value||'own';
  const downOut = (downType==='gift'||downType==='other')?0:downPay;
  const costOut = (costType==='loan'||costType==='other')?0:cost;
  const cash = {
    total:cashTotal,
    down:downPay, downLbl: downType==='gift'?'頭金（贈与）':downType==='other'?`頭金（${_ot('cf_down_other_text','その他')}）`:'頭金（自己資金）', downOut:downOut>0,
    cost, costLbl: costType==='loan'?'諸費用（ローン組込）':costType==='other'?`諸費用（${_ot('cf_cost_other_text','その他')}）`:'諸費用', costOut:costOut>0,
    move, moveLbl: moveType==='other'?`引越・家具家電（${_ot('cf_move_other_text','その他')}）`:'引越・家具家電',
    after: cashTotal-downOut-costOut
  };

  // 住宅ローン条件（画面と同じ）
  const price = fv('house-price')||0;
  const delivery = iv('delivery-year')||0;
  const stepsOf = rs=>(rs||[]).slice(1).map(s=>`${s.from+1}年目〜${s.rate.toFixed(2)}%`);
  let loan;
  if(isCash){
    loan = {form:'cash', label:'現金一括購入', price, delivery, total:0, rows:[]};
  }else if(pairLoanMode && !isFlat){
    const ha=fv('loan-h-amt')||0, wa=fv('loan-w-amt')||0;
    loan = {form:'pair', label:'ペアローン', price, delivery, total:ha+wa, rows:[
      {who:'ご主人様', p:'h', amt:ha, rate:fv('rate-h-base')||0.5, yrs:iv('loan-h-yrs')||35, steps:stepsOf(getPairRates('h'))},
      {who:'奥様', p:'w', amt:wa, rate:fv('rate-w-base')||0.5, yrs:iv('loan-w-yrs')||35, steps:stepsOf(getPairRates('w'))}]};
  }else if(isFlat && pairLoanMode){
    const ha=fv('flat-loan-h-amt')||0, wa=fv('flat-loan-w-amt')||0, rb=fv('flat-rate-base')||1.94, st=stepsOf(getFlat35Rates());
    loan = {form:'flatPair', label:'フラット35 ペアローン', price, delivery, total:ha+wa, rows:[
      {who:'ご主人様', p:'h', amt:ha, rate:rb, yrs:iv('flat-loan-h-yrs')||35, steps:st},
      {who:'奥様', p:'w', amt:wa, rate:rb, yrs:iv('flat-loan-w-yrs')||35, steps:st}]};
  }else{
    const amt = fv('loan-amt')||0;
    const rb = isFlat?(fv('flat-rate-base')||1.94):(fv('rate-base')||0.5);
    const yrs = isFlat?(iv('flat-loan-yrs')||35):(iv('loan-yrs')||35);
    const who = (typeof getLoanBorrower==='function' && getLoanBorrower()==='w')?'奥様':hLbl;
    loan = {form:isFlat?'flat':'single', label:isFlat?'フラット35':'', price, delivery, total:amt, rows:[
      {who, p:who==='奥様'?'w':'h', amt, rate:rb, yrs, steps:stepsOf(isFlat?getFlat35Rates():getRates())}]};
  }

  // その他金融資産（現時点）— 画面と同じ集計（財形も含む）
  const items = [];
  ['h','w'].forEach(p=>{
    const pLbl = p==='h'?hLbl:'奥様';
    const seen = new Set();
    document.querySelectorAll(`[id^="sec-bal-${p}-"],[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
      const m = el.id.match(new RegExp(`^sec-(?:stk-)?bal-${p}-(\\d+)$`));
      if(!m||seen.has(m[1]))return; seen.add(m[1]);
      const sid = m[1];
      const isAcc = document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
      const isStock = document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
      const isBond = document.getElementById(`sec-bond-${p}-${sid}`)?.classList.contains('on');
      const isNisa = document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
      const custom = document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
      let val=0, cat='';
      if(isBond){ if((iv(`sec-bond-age-${p}-${sid}`)||0)>0)return; val=fv(`sec-bond-bal-${p}-${sid}`)||0; cat='債券'; }
      else if(isAcc){ val=fv(`sec-bal-${p}-${sid}`)||0; cat=isNisa?'NISA積立':'課税積立'; }
      else if(isStock){ val=fv(`sec-stk-bal-${p}-${sid}`)||0; cat=isNisa?'NISA一括':'課税一括'; }
      else return;
      if(val<=0)return;
      items.push({lbl:custom||`${cat}（${pLbl}）`, val});
    });
    const z = fv(`zaikei-${p}-bal`)||0;
    if(z>0) items.push({lbl:`財形貯蓄（${pLbl}）`, val:z});
  });
  const assets = {items, total:items.reduce((s,x)=>s+x.val,0)};

  const swap = (typeof getSwapEvents==='function') ? getSwapEvents().map(sw=>({age:sw.age, sell:sw.sell, price:sw.price})) : [];
  const memo = String(window._cfSummaryNote||'').trim();

  const d = {kind, client:(_v('client-name')||'').trim(), isM:ST.type==='mansion', single, period:{y0, yN, n:disp},
    family, cash, loan, assets, swap, memo, color:'#2bb3a3'};

  // 万が一：見出し・その年の家族の年齢・必要保障額
  const MR = window.lastMR;
  if(kind==='mg' && MR){
    const off = (MR._deathOffset||1)-1;
    const isDis = !!MR._isDis, tH = MR._targetIsH!==false;
    const tLbl = single?'ご本人':(tH?'ご主人様':'奥様');
    const sLbl = single?'':(tH?'奥様':'ご主人様');
    const tAge = (tH?hAge:wAge)+off;
    const ev = isDis?((MR._evLbl||'障害')+'になった'):'死亡した';
    const at = family.filter(f=>isDis || !f.p || f.p!==(tH?'h':'w')).map(f=>`${f.lbl}${f.age+off}歳`);
    const nd = MR.need||{};
    const pLbl = isDis?tLbl:sLbl;
    const ageAt = i=>((isDis?(tH?hAge:wAge):(tH?wAge:hAge))+i);
    const basis = i=>(i==null||i<0)?'':`根拠：${y0+i}年${pLbl?`（${pLbl}${ageAt(i)}歳）`:''}`;
    d.mg = {
      title:`${tLbl}が${tAge}歳で${ev}場合`, title1:`${tLbl}が${tAge}歳で`, title2:`${ev}場合`,
      sub:`${y0+off}年・${at.join('・')}`,
      need:{min:nd.min||0, std:nd.std||0, safe:nd.safe||0, years:nd.years||3, safeMode:nd.safeMode||'end',
        bMin:basis((nd.min||0)>0?nd.iMin:-1), bStd:basis(nd.iStd), bSafe:basis(nd.iSafe)}
    };
    d.color = window._mgKindColor||'#c2185b';
  }
  return d;
}
window.getCoverData = getCoverData;
