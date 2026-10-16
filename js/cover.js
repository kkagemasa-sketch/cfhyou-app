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

  // ★ 2026-10-16 表紙の右側の作り直し：毎月の返済（目安）・住宅ローン控除の年数・団信などの札
  loan.monthly = loan.rows.reduce((s,r)=>s+(typeof mpay==='function'?mpay(r.amt,r.yrs,r.rate):0),0);
  loan.lctrlYears = (R.lCtrl||[]).filter(v=>v>0).length;
  loan.tags = [];
  if(loan.form!=='cash'){
    if(loan.form==='pair'||loan.form==='flatPair'){
      const j = ['h','w'].filter(p=>typeof getLoanDansinJoined==='function'&&getLoanDansinJoined(p)).map(p=>p==='h'?'ご主人様':'奥様');
      loan.tags.push(j.length?`団信：${j.join('・')}（一般団信）`:'団信なし');
    }else if(typeof jointLoanMode!=='undefined'&&jointLoanMode){
      const sel = document.getElementById('joint-dansin-sel')?.value||'h';
      loan.tags.push(sel==='none'?'団信なし':`団信：${sel==='both'?'おふたり':sel==='w'?'奥様':hLbl}（連帯債務）`);
    }else{
      loan.tags.push((typeof getLoanDansinJoined==='function'&&getLoanDansinJoined('s'))?`団信：${loan.rows[0].who}（一般団信）`:'団信なし');
    }
    loan.tags.push((R.prepayExp||[]).some(v=>v>0)?'繰上返済あり':'繰上返済なし');
    if(loan.lctrlYears>0) loan.tags.push(`住宅ローン控除 ${loan.lctrlYears}年`);
  }

  // その他金融資産（現時点）— 画面と同じ集計（財形も含む）。表紙ではご主人様／奥様に分けて出す
  const items = [];
  const groups = [];
  ['h','w'].forEach(p=>{
    const pLbl = p==='h'?hLbl:'奥様';
    if(single && p==='w') return;
    const g = {p, lbl:pLbl, items:[], subBal:0, subMonthly:0};
    const pushG = (o)=>{ g.items.push(o); g.subBal+=o.bal; g.subMonthly+=o.monthly||0; };
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
      let val=0, cat='', monthly=0, rate=0, until='', kind='', pill='', name='';
      if(isBond){ if((iv(`sec-bond-age-${p}-${sid}`)||0)>0)return; val=fv(`sec-bond-bal-${p}-${sid}`)||0; cat='債券'; kind='bond'; pill='債券'; rate=fv(`sec-bond-rate-${p}-${sid}`)||0; const m=iv(`sec-bond-mat-${p}-${sid}`)||0; until=m>0?`${m}歳 満期`:''; name='債券'; }
      else if(isAcc){ val=fv(`sec-bal-${p}-${sid}`)||0; cat=isNisa?'NISA積立':'課税積立'; kind='accum'; pill=isNisa?'NISA':'課税'; monthly=fv(`sec-monthly-${p}-${sid}`)||0; rate=fvd(`sec-rate-${p}-${sid}`,5); const e=iv(`sec-end-${p}-${sid}`)||0, r=iv(`sec-redeem-${p}-${sid}`)||0; until=r>0?`${r}歳 解約${e>0&&e<r?`（積立は${e}歳まで）`:''}`:(e>0?`${e}歳 積立まで`:''); name=isNisa?(document.getElementById(`sec-frame-grow-${p}-${sid}`)?.classList.contains('on')?'成長枠':'つみたて枠'):'積立'; }
      else if(isStock){ val=fv(`sec-stk-bal-${p}-${sid}`)||0; cat=isNisa?'NISA一括':'課税一括'; kind='stock'; pill=isNisa?'NISA':'課税'; rate=fv(`sec-div-${p}-${sid}`)||0; const r=iv(`sec-stk-redeem-${p}-${sid}`)||0; until=r>0?`${r}歳 解約`:''; name=isNisa?'成長枠（一括）':'一括投資'; }
      else return;
      if(val<=0 && monthly<=0)return;
      items.push({lbl:custom||`${cat}（${pLbl}）`, val});
      pushG({kind, sid, rkey:`${kind}|${p}|${sid}`, pill, lbl:custom||name, bal:val, monthly, rate, until});
    });
    const z = fv(`zaikei-${p}-bal`)||0, zm = fv(`zaikei-${p}-monthly`)||0;
    if(z>0 || zm>0){
      if(z>0) items.push({lbl:`財形貯蓄（${pLbl}）`, val:z});
      const pr = p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60), ze=iv(`zaikei-${p}-end`)||0, zr=iv(`zaikei-${p}-redeem`)||0;
      pushG({kind:'zaikei', sid:'zk', rkey:`zaikei|${p}`, pill:'財形', lbl:'財形貯蓄', bal:z, monthly:zm, rate:0, until:`${zr>0?zr:(ze>0?ze:pr)}歳 解約`});
    }
    if(g.items.length) groups.push(g);
  });
  const assets = {items, total:items.reduce((s,x)=>s+x.val,0), groups, totalMonthly:groups.reduce((s,g)=>s+g.subMonthly,0)};

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
    d.mg.kindLbl = isDis ? (MR._evLbl||'障害') : '死亡';
    d.mg.when = `${y0+off}年（${off+1}年目）`;
    d.mg.at = at.join('・');
    // 万が一の画面で決めたこと（カードの要約と同じ）
    const tab = (typeof mgQA_tabs!=='undefined') ? mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId) : null;
    d.mg.cards = [];
    if(tab && typeof mgQA_cardSummary==='function'){
      const defs = isDis
        ? [['self',`${tLbl}の収入`],['sick','傷病手当金'],['dispen','障害年金'],['lc','生活費'],['house','住まい']]
        : [['ins','保険金'],['pension','遺族年金'],['income',`${sLbl}の収入`],['lc','生活費'],['house','住まい']];
      defs.forEach(([k,t])=>{ try{ const sm=mgQA_cardSummary(tab,k); d.mg.cards.push({key:k, t, v:sm.v||'', sub:String(sm.sub||'').replace(/^(\d+)〜歳$/,'$1歳から'), changed:!!sm.changed, auto:(k==='lc'&&tab.state.lcMode==='auto')}); }catch(e){} });
      // 住まい：団信の結果を添える
      const hc = d.mg.cards.find(c=>c.key==='house');
      if(hc){ try{ hc.v = isDis ? (tab.state.disDansin==='clear'?'団信で完済':'ローンが残る') : mgC_dansinText(tab).short; hc.sub = mgQA_cardSummary(tab,'house').v==='住み続ける' ? '住み続ける' : mgQA_cardSummary(tab,'house').v; }catch(e){} }
      // その他金融資産：万が一の後の扱い
      const st = (typeof mgC_assetsState==='function') ? mgC_assetsState(tab) : {};
      const deadP = isDis ? null : (tH?'h':'w');
      assets.groups.forEach(g=>g.items.forEach(it=>{
        if(g.p===deadP){ it.dead=true; it.after={cls:'cash', txt:'万が一の年に現金化'}; return; }
        if(it.kind==='bond'){ it.after={cls:'', txt:'そのまま'}; return; }
        const c = st[it.rkey]||{};
        const parts=[];
        if(it.monthly>0){ if(c.acc==='stop') parts.push({cls:'stop',txt:'積立を止める'}); else if(c.acc==='change') parts.push({cls:'stop',txt:`積立 月${(+c.monthly||0)}万に`}); else parts.push({cls:'keep',txt:'続ける'}); }
        let rd='';
        if(c.rd==='event') rd={cls:'cash',txt:'万が一の年に解約'};
        else if(c.rd==='never') rd={cls:'',txt:'解約しない'};
        else if(c.rd==='age' && +c.age>0) rd={cls:'',txt:`${+c.age}歳で解約`};
        else rd={cls:'',txt: it.until||'そのまま'};
        it.after = parts[0]||{cls:'',txt:''}; it.after2 = rd;
      }));
    }
  }
  return d;
}
window.getCoverData = getCoverData;
