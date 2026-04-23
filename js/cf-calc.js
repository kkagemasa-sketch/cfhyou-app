// cf-calc.js — CF表メイン計算エンジン
// ===== メイン計算 =====
function render(){
  if(rTab==='lctab'){renderLCTab();return}
  if(rTab==='loan'){if($('lp-table-wrap'))renderLoanCalc();return}
  if(rTab==='memo'){renderMemo();return}
  const _isSingle=householdType==='single';
  const hAge=iv('husband-age')||30, wAge=_isSingle?0:(iv('wife-age')||29);
  const loanAmt=fv('loan-amt'), loanYrs=iv('loan-yrs')||35, delivery=iv('delivery');
  // ペアローン用変数
  const lhAmt=pairLoanMode?fv('loan-h-amt')||0:0;
  const lwAmt=pairLoanMode?fv('loan-w-amt')||0:0;
  const lhYrs=iv('loan-h-yrs')||35, lwYrs=iv('loan-w-yrs')||35;
  const lhType=document.getElementById('loan-h-type')?.value||'equal_payment';
  const lwType=document.getElementById('loan-w-type')?.value||'equal_payment';
  const rHBase=fv('rate-h-base')||0.5, rWBase=fv('rate-w-base')||0.5;
  const ratesH=pairLoanMode?getPairRates('h'):[], ratesW=pairLoanMode?getPairRates('w'):[];
  // 自己資産：現預金合計を初期残高に
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const zaikiHBal=fv('zaikei-h-bal')||0, zaikiWBal=fv('zaikei-w-bal')||0;
  // 頭金（自己資金）・諸費用（現金払い）・引越/家具費用は前提条件として初期残高から差し引く
  const downPay0=fv('down-payment')||0;
  const downDeduct=(downType==='own')?downPay0:0;
  const costType0=document.getElementById('cost-type')?.value||'cash';
  const costDeduct=(costType0==='cash')?(fv('house-cost')||0):0;
  const moveDeduct=(fv('moving-cost')||0)+(fv('furniture-init')||0);
  const initSav=cashH+cashW+cashJoint+zaikiHBal+zaikiWBal-downDeduct-costDeduct-moveDeduct;
  // ご主人収入設定
  // ※ getIncomeSteps / getIncomeAtAge はグローバル版を使用
  const hSteps=getIncomeSteps('h');
  const wSteps=getIncomeSteps('w');
  const retAge=iv('retire-age')||60, retPay=fv('retire-pay'), pSelf=$('pension-h')?.value===''?0:(fv('pension-h')||186);
  const retPayAge=iv('retire-pay-age')||retAge;
  const hDeathAge=iv('h-death-age')||83;
  const wDeathAge=_isSingle?0:(iv('w-death-age')||88);
  const wRetAge=iv('w-retire-age')||60;
  const wRetPay=fv('w-retire-pay')||0;
  const wRetPayAge=iv('w-retire-pay-age')||wRetAge;
  const pWife=$('pension-w')?.value===''?0:(fv('pension-w')||66);
  const pHReceive=iv('pension-h-receive')||65;
  const pWReceive=iv('pension-w-receive')||65;
  // 老齢基礎年金概算（令和7年度満額82.51万円 × 加入年数/40年、constants.js で一元管理）
  const KISO_FULL=KISO_FULL_AMT;
  const pHStart=iv('pension-h-start')||22;
  const pWStart=iv('pension-w-start')||22;
  const kisoH=ri(KISO_FULL*Math.min(retAge-pHStart,40)/40);   // ご主人の老齢基礎年金
  const kisoW=ri(KISO_FULL*Math.min(wRetAge-pWStart,40)/40);  // 奥様の老齢基礎年金
  // 老齢厚生年金相当額の計算
  const koseiH=calcKosei('h', pHStart, retAge, pSelf, kisoH);
  const koseiW=calcKosei('w', pWStart, wRetAge, pWife, kisoW);
  const leaves=getLeaves();
  // 生活費
  const baseLc=calcLC();
  const lcSteps=getLCSteps();
  // ローン
  const rates=getRates();
  // フラット35用実効変数（loanCategory==='flat35'時に上書き）
  const _isFlat=loanCategory==='flat35';
  const _flatRates=_isFlat?getFlat35Rates():null;
  const _flatYrs=_isFlat?(iv('flat-loan-yrs')||35):0;
  const _flatType=_isFlat?($('flat-loan-type')?.value||'equal_payment'):'';
  // フラット35ペアローン変数
  const _flatPair=_isFlat&&pairLoanMode;
  const _fhAmt=_flatPair?(fv('flat-loan-h-amt')||0):0;
  const _fwAmt=_flatPair?(fv('flat-loan-w-amt')||0):0;
  const _fhYrs=_flatPair?(iv('flat-loan-h-yrs')||35):0;
  const _fwYrs=_flatPair?(iv('flat-loan-w-yrs')||35):0;
  const _fhType=_flatPair?($('flat-loan-h-type')?.value||'equal_payment'):'';
  const _fwType=_flatPair?($('flat-loan-w-type')?.value||'equal_payment'):'';
  // 実効ローン変数（フラット35/標準で切替）
  const effLoanAmt=_flatPair?(_fhAmt+_fwAmt):pairLoanMode?(lhAmt+lwAmt):loanAmt;
  const eLoanYrs=_isFlat?(_flatPair?Math.max(_fhYrs,_fwYrs):_flatYrs):loanYrs;
  const eRates=_isFlat?_flatRates:rates;
  const eLoanType=_isFlat?_flatType:(document.getElementById('loan-type')?.value||'equal_payment');
  const parking=fv('parking')/10000, propTax=fv('prop-tax')/10000;
  const sqm=fvd('sqm',75);
  const isM=ST.type==='mansion';
  const choki=iv('choki');
  const taxRed=isM?PROP_TAX_RELIEF.mansion_general:(choki?PROP_TAX_RELIEF.kodate_choki:PROP_TAX_RELIEF.kodate_general);
  const extraItems=getExtraItems();
  // DC・iDeCo入力値
  const dcIdeco={};
  ['h','w'].forEach(p=>{
    const pRetAge=p==='h'?retAge:wRetAge;
    dcIdeco[p]={
      employer: fv(`dc-${p}-employer`)||0,
      matching: fv(`dc-${p}-matching`)||0,
      dcRate: fv(`dc-${p}-rate`)/100,
      dcInitBal: fv(`dc-${p}-bal`)||0,
      idecoMonthly: fv(`ideco-${p}-monthly`)||0,
      idecoRate: fv(`ideco-${p}-rate`)/100,
      idecoInitBal: fv(`ideco-${p}-bal`)||0,
      receiveAge: iv(`dc-${p}-receive-age`)||60,
      method: document.getElementById(`dc-${p}-method`)?.value||'lump',
      retAge: pRetAge,
      joinStart: p==='h'?(iv('pension-h-start')||22):(iv('pension-w-start')||22)
    };
  });
  // ループ外キャッシュ（パフォーマンス最適化）
  const otherIncomesCache=getOtherIncomes();
  // 諸費用（現金払いの場合、引き渡し年に計上）
  const houseCost=fv('house-cost')||0;
  const costType2=document.getElementById('cost-type')?.value||'cash';
  // 子ども
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{
    const cid=el.id.split('-')[1];children.push({age:parseInt(el.value)||0,costs:eduCosts(cid),costsBd:(typeof eduCostsBd==='function'?eduCostsBd(cid):null)});
  });
  const cYear=getCfStartYear();
  // ご逝去年齢から表示年数を自動計算（夫婦どちらか高い方まで）
  const hEndYr = hDeathAge>0 ? hDeathAge-hAge+1 : 0;
  const wEndYr = wDeathAge>0 ? wDeathAge-wAge+1 : 0;
  const autoDisp = Math.max(hEndYr, wEndYr);
  // ローン全期間が収まるよう totalYrs を確保（delivery + loanYrs が60年を超える場合に対応）
  const loanEnd = delivery + (_isFlat?eLoanYrs:loanYrs) + 1;
  const totalYrs = Math.max(autoDisp, 60, loanEnd);
  const disp = Math.max(autoDisp>0 ? autoDisp : 60, loanEnd - 1);
  const cLbls=['第一子','第二子','第三子','第四子'];

  let sav=initSav;
  const R={yr:[],hA:[],wA:[],cA:children.map(()=>[]),
    hInc:[],wInc:[],hIncBd:[],wIncBd:[],dcTaxSavingH:[],dcTaxSavingW:[],dcTaxBdH:[],dcTaxBdW:[],rPay:[],wRPay:[],otherInc:[],scholarship:[],insMat:[],insMatBd:[],secRedeem:[],secRedeemBd:{},finAssetBd:{},pS:[],pW:[],pTotalH:[],pTotalW:[],pensionBd:[],teate:[],lCtrl:[],lCtrlBreakdown:[],survPension:[],dcReceiptH:[],dcReceiptW:[],idecoReceiptH:[],idecoReceiptW:[],incT:[],
    lc:[],lRep:[],lRepH:[],lRepW:[],rep:[],ptx:[],furn:[],senyu:[],edu:children.map(()=>[]),eduBd:children.map(()=>[]),
    rent:[],houseCostArr:[],moveInCost:[],secInvest:[],secBuy:[],insMonthly:[],insLumpExp:[],carBuy:[],carInsp:[],carTotal:[],carRows:null,prk:[],wedding:[],ext:[],dcMatchExpH:[],dcMatchExpW:[],idecoExpH:[],idecoExpW:[],expT:[],bal:[],sav:[],savExtra:[],lBal:[],lBalH:[],lBalW:[],finAsset:[],finAssetBase:[],finAssetRows:null,secRedeemRows:null,totalAsset:[],totalAssetBase:[],
    // イベント文字列
    evH:[],evW:[],evC:children.map(()=>[])};

  // ── 収入段階の産休・育休設定を事前収集 ──
  const _hStepLeaves=[], _wStepLeaves=[];
  [['h',_hStepLeaves],['w',_wStepLeaves]].forEach(([p,arr])=>{
    document.querySelectorAll(`#${p}-income-cont>[id^="${p}-is-"]`).forEach(stepEl=>{
      const base=stepEl.id;
      const fromAge=parseInt(document.getElementById(`${base}-from`)?.value)||0;
      const toAge=parseInt(document.getElementById(`${base}-to`)?.value)||0;
      const leaveType=document.getElementById(`${base}-leave`)?.value||'';
      if(leaveType&&fromAge>0)arr.push({fromAge,toAge,leaveType});
    });
  });

  // 住宅ローン控除の年シフト用（引き渡しの翌年セルから還付計上）
  let _prevLc2=0, _prevLctrlBd=null;

  // ─── 下落シミュレーション: セキュリティごとの年次複利（シナリオ対応） ───
  // secKey: セキュリティID (例: 'sec-accum-h-1')
  // 戻り値: [fv at end of each year] の配列（長さ totalYrs）。シナリオなしなら null → 呼び出し側で従来計算
  const _shocksActive = (typeof marketShocks!=='undefined' && marketShocks.length>0);
  function _computeAccumSeries(secKey, initBal, monthly, defaultRate, endAgePAge, pAgeAt0, pBaseAge){
    if(!_shocksActive) return null;
    const idx = (typeof secIndexMap!=='undefined') ? secIndexMap[secKey] : null;
    if(!idx || idx==='none') return null; // 指数未指定なら従来計算
    const series = [];
    let balance = initBal;
    for(let k=0;k<totalYrs;k++){
      const pAgeCur = pAgeAt0 + k;
      const scR = (typeof getMarketReturnAtYear==='function')
        ? getMarketReturnAtYear(idx, k, hAge, wAge) : null;
      const r = (scR!==null && scR!==undefined) ? scR : defaultRate;
      // 積立継続期間か? endAgePAge=0 なら常に継続
      const contribActive = endAgePAge===0 || pAgeCur < endAgePAge;
      const annualContrib = contribActive ? monthly*12 : 0;
      // 半年分の運用を乗せて近似（月額積立の平均的な運用期間）
      balance = balance*(1+r) + annualContrib*(r>=0?Math.pow(1+r,0.5):1+r*0.5);
      series.push(Math.round(balance));
    }
    return series;
  }
  // 一括投資（バイアンドホールド）の年次シリーズ
  function _computeStkSeries(secKey, bal, defaultRate, pAgeAt0, investAge){
    if(!_shocksActive) return null;
    const idx = (typeof secIndexMap!=='undefined') ? secIndexMap[secKey] : null;
    if(!idx || idx==='none') return null;
    const series = [];
    let balance = bal;
    let started = false;
    for(let k=0;k<totalYrs;k++){
      const pAgeCur = pAgeAt0 + k;
      if(!started && pAgeCur>=investAge){ started = true; }
      if(!started){ series.push(bal); continue; }
      const scR = (typeof getMarketReturnAtYear==='function')
        ? getMarketReturnAtYear(idx, k, hAge, wAge) : null;
      const r = (scR!==null && scR!==undefined) ? scR : defaultRate;
      balance = balance*(1+r);
      series.push(Math.round(balance));
    }
    return series;
  }
  // DC/iDeCo の拠出期間内の残高をシナリオ対応で年次計算
  // retAge までは拠出+運用、以降は運用のみ（受取フェーズは呼び出し側で別扱い）
  function _computeDCSeries(secKey, initBal, monthly, defaultRate, retAge, receiveAge, pBaseAge){
    if(!_shocksActive) return null;
    const idx = (typeof secIndexMap!=='undefined') ? secIndexMap[secKey] : null;
    if(!idx || idx==='none') return null;
    const series = [];
    let balance = initBal;
    for(let k=0;k<totalYrs;k++){
      const pAgeCur = pBaseAge + k + 1; // k年目末時点の年齢
      const scR = (typeof getMarketReturnAtYear==='function')
        ? getMarketReturnAtYear(idx, k, hAge, wAge) : null;
      const r = (scR!==null && scR!==undefined) ? scR : defaultRate;
      // 受取開始前の年のみ、拠出期間内か判定
      const inAccumPhase = (pBaseAge+k) < receiveAge;
      const contribActive = inAccumPhase && (pBaseAge+k) < retAge;
      const annualContrib = contribActive ? monthly*12 : 0;
      balance = balance*(1+r) + annualContrib*(r>=0?Math.pow(1+r,0.5):1+r*0.5);
      series.push(Math.round(balance));
    }
    return series;
  }
  // 一時払い保険: 加入から満期まで複利運用
  function _computeLumpInsSeries(secKey, premium, defaultRate, enrollAge, matAge, pBaseAge){
    if(!_shocksActive) return null;
    const idx = (typeof secIndexMap!=='undefined') ? secIndexMap[secKey] : null;
    if(!idx || idx==='none') return null;
    const series = [];
    let balance = premium;
    for(let k=0;k<totalYrs;k++){
      const pAgeCur = pBaseAge+k;
      if(pAgeCur < enrollAge){ series.push(0); continue; }
      if(pAgeCur >= matAge){ series.push(Math.round(balance)); continue; }
      const scR = (typeof getMarketReturnAtYear==='function')
        ? getMarketReturnAtYear(idx, k, hAge, wAge) : null;
      const r = (scR!==null && scR!==undefined) ? scR : defaultRate;
      balance = balance*(1+r);
      series.push(Math.round(balance));
    }
    return series;
  }
  // 事前計算キャッシュ（シナリオ適用時のみ値が入る）
  const _accumSeriesCache = {};
  const _stkSeriesCache = {};
  const _dcSeriesCache = {};
  const _idecoSeriesCache = {};
  const _lumpInsSeriesCache = {};
  if(_shocksActive){
    ['h','w'].forEach(p=>{
      const pBaseAge = p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const sid = el.id.split('-').pop();
        const isAccum = document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum) return;
        const bal = fv(`sec-bal-${p}-${sid}`)||0;
        const monthly = fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge = iv(`sec-end-${p}-${sid}`)||0;
        const rate = fvd(`sec-rate-${p}-${sid}`,5)/100;
        const secKey = `sec-accum-${p}-${sid}`;
        const series = _computeAccumSeries(secKey, bal, monthly, rate, endAge, pBaseAge, pBaseAge);
        if(series) _accumSeriesCache[secKey] = series;
      });
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const sid = el.id.split('-').pop();
        const isStock = document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock) return;
        const bal = fv(`sec-stk-bal-${p}-${sid}`)||0;
        const rate = (fv(`sec-div-${p}-${sid}`)||0)/100;
        const investAge = iv(`sec-stk-age-${p}-${sid}`)||pBaseAge;
        const secKey = `sec-stk-${p}-${sid}`;
        const series = _computeStkSeries(secKey, bal, rate, pBaseAge, investAge);
        if(series) _stkSeriesCache[secKey] = series;
      });
      // 一時払い保険シリーズ
      document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`).forEach(el=>{
        const iid = el.id.split('-').pop();
        const enrollAge = iv(`ins-lump-enroll-${p}-${iid}`)||pBaseAge;
        const amt = fv(`ins-lump-amt-${p}-${iid}`)||0;
        const matAge = iv(`ins-lump-matage-${p}-${iid}`)||0;
        const rate = (fv(`ins-lump-rate-${p}-${iid}`)||0)/100;
        if(amt<=0||matAge<=0) return;
        const secKey = `ins-lump-${p}-${iid}`;
        const series = _computeLumpInsSeries(secKey, amt, rate, enrollAge, matAge, pBaseAge);
        if(series) _lumpInsSeriesCache[secKey] = series;
      });
      // DC/iDeCo シリーズ
      const d = dcIdeco[p];
      if(d){
        const dcTotalMonthly = (d.employer||0)+(d.matching||0);
        const dcHasAny = dcTotalMonthly>0 || (d.dcInitBal||0)>0;
        if(dcHasAny){
          const dcSeries = _computeDCSeries(`dc-${p}`, d.dcInitBal||0, dcTotalMonthly, d.dcRate||0, d.retAge, d.receiveAge, pBaseAge);
          if(dcSeries) _dcSeriesCache[`dc-${p}`] = dcSeries;
        }
        const idecoHasAny = (d.idecoMonthly||0)>0 || (d.idecoInitBal||0)>0;
        if(idecoHasAny){
          const idecoSeries = _computeDCSeries(`ideco-${p}`, d.idecoInitBal||0, d.idecoMonthly||0, d.idecoRate||0, d.retAge, d.receiveAge, pBaseAge);
          if(idecoSeries) _idecoSeriesCache[`ideco-${p}`] = idecoSeries;
        }
      }
    });
  }

  // ─── 手取年収→額面・税金の逆算ヘルパー ───
  // netInc: 手取年収(万円), age: 年齢, isSelfSingle: 単身か, spouseNetInc: 配偶者の手取(配偶者控除判定用), isHSide: ご主人側か
  function _calcNetBreakdown(netInc, age, isSelfSingle, spouseNetInc, isHSide){
    if(netInc<=0)return null;
    // 手取り→額面（TAX表を線形補間）
    const _netToGross=(net)=>{
      let g=0;
      for(let gi=0;gi<TAX.length-1;gi++){
        if(net<=TAX[gi][1]){g=TAX[gi][0];break;}
        if(net<TAX[gi+1][1]){const r=(net-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);g=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));break;}
        g=TAX[TAX.length-1][0];
      }
      if(g<=0&&net>0)g=TAX[TAX.length-1][0];
      return g;
    };
    const gross=_netToGross(netInc);
    const shakaiRate=calcShakaiRate(age);
    const shakai=Math.round(gross*shakaiRate*10)/10;
    const kyuyo=calcKyuyoDed(gross);
    const grossSyotoku=Math.max(0,gross-kyuyo);
    const [kisoIt,kisoJu]=calcKisoDed(grossSyotoku);
    // 配偶者控除（ご主人側のみ適用、奥様視点では基本無し）
    let spouseGross=0;
    let hasSpouseDed=false, spouseDedIt=0, spouseDedJu=0;
    if(!isSelfSingle&&isHSide&&spouseNetInc>0){
      spouseGross=_netToGross(spouseNetInc);
      hasSpouseDed=canApplySpouseDed(gross,spouseGross);
      spouseDedIt=hasSpouseDed?38:0;
      spouseDedJu=hasSpouseDed?33:0;
    }else if(!isSelfSingle&&isHSide&&spouseNetInc===0){
      // 配偶者が無収入(0万円) → 配偶者控除適用
      hasSpouseDed=canApplySpouseDed(gross,0);
      spouseDedIt=hasSpouseDed?38:0;
      spouseDedJu=hasSpouseDed?33:0;
    }
    const taxableBase=Math.max(0,grossSyotoku-shakai-kisoIt);
    const taxable=Math.max(0,taxableBase-spouseDedIt);
    const itax=calcIncomeTax(taxable);
    const juminTaxable=Math.max(0,grossSyotoku-shakai-kisoJu-spouseDedJu);
    const jumin=calcJuminTax(juminTaxable);
    return {
      net:netInc, gross, shakaiRate, shakai, kyuyo, grossSyotoku,
      kisoIt, kisoJu, hasSpouseDed, spouseDedIt, spouseDedJu,
      taxableBase, taxable, itax, juminTaxable, jumin,
      netComputed:Math.round((gross-shakai-itax-jumin)*10)/10,
      age, isSingle:isSelfSingle, isHSide
    };
  }

  for(let i=0;i<totalYrs;i++){
    const yr=cYear+i, ha=hAge+i, wa=wAge+i;
    const active=i>=delivery, lcYr=i-delivery;
    let dcReceiptH=0,dcReceiptW=0,idecoReceiptH=0,idecoReceiptW=0; // DC/iDeCo受取額（ご主人/奥様別）
    R.yr.push(yr);R.hA.push(ha);R.wA.push(wa);
    children.forEach((c,ci)=>R.cA[ci].push(c.age+i));

    // ─── ご主人収入 ───
    let hInc=0, hDCSaving=0, _hDCSv=null, _hDedMatching=0, _hDedIdeco=0;
    if(!(hDeathAge>0&&ha>hDeathAge)){
      hInc=getIncomeAtAge(hSteps,ha);
      // DC・iDeCo節税効果（拠出期間中のみ）— 別行で計上
      if(hInc>0&&ha<dcIdeco.h.retAge){
        _hDedMatching=dcIdeco.h.matching*12;
        _hDedIdeco=dcIdeco.h.idecoMonthly*12;
        const ded=_hDedMatching+_hDedIdeco;
        if(ded>0){_hDCSv=estimateTaxSaving(hInc,ded);hDCSaving=_hDCSv.total;}
      }
    }
    R.hInc.push(ri(hInc));
    R.dcTaxSavingH.push(ri(hDCSaving));

    // ─── 奥様収入（産休・育休・時短対応）※単身時スキップ ───
    let wInc=0, wDCSaving=0, _wDCSv=null, _wDedMatching=0, _wDedIdeco=0, _wLeaveType=null;
    if(!_isSingle&&!(wDeathAge>0&&wa>wDeathAge)){
      const leave=leaves.find(l=>wa>=l.startAge&&wa<l.endAge);
      if(leave){
        wInc=ri(leave.income);
        _wLeaveType=leave.type;
      } else {
        wInc=getIncomeAtAge(wSteps,wa);
      }
      // DC・iDeCo節税効果（拠出期間中のみ）— 別行で計上
      if(wInc>0&&wa<dcIdeco.w.retAge){
        _wDedMatching=dcIdeco.w.matching*12;
        _wDedIdeco=dcIdeco.w.idecoMonthly*12;
        const ded=_wDedMatching+_wDedIdeco;
        if(ded>0){_wDCSv=estimateTaxSaving(wInc,ded);wDCSaving=_wDCSv.total;}
      }
    }
    R.wInc.push(ri(wInc));
    R.dcTaxSavingW.push(ri(wDCSaving));

    // ─── 手取年収の内訳（額面・社会保険料・所得税・住民税の逆算） ───
    R.hIncBd.push(hInc>0?_calcNetBreakdown(hInc,ha,_isSingle,wInc,true):null);
    R.wIncBd.push(wInc>0?_calcNetBreakdown(wInc,wa,true,0,false):null);
    // DC/iDeCo節税の内訳
    R.dcTaxBdH.push(_hDCSv?{..._hDCSv, matching:_hDedMatching, ideco:_hDedIdeco, takeHome:hInc, age:ha}:null);
    R.dcTaxBdW.push(_wDCSv?{..._wDCSv, matching:_wDedMatching, ideco:_wDedIdeco, takeHome:wInc, age:wa, leaveType:_wLeaveType}:null);

    // ─── その他収入 ───
    // 退職金：退職所得控除＋1/2課税で税引後手取りを計上
    if(ha===retPayAge&&retPay>0){
      const hKinzoku=retPayAge-pHStart; // 勤続年数（就労開始→退職金受取年齢）
      R.rPay.push(ri(calcTaishokuNet(retPay,hKinzoku)));
    } else {
      R.rPay.push(0);
    }
    // 奥様退職金
    if(!_isSingle&&wa===wRetPayAge&&wRetPay>0){
      const wKinzoku=wRetPayAge-pWStart;
      R.wRPay.push(ri(calcTaishokuNet(wRetPay,wKinzoku)));
    } else {
      R.wRPay.push(0);
    }
    // 副業・不動産収入
    let oiTotal=0;
    otherIncomesCache.forEach(oi=>{if(oi.amt>0&&(oi.endAge===0||ha<oi.endAge))oiTotal+=oi.amt;});
    R.otherInc.push(ri(oiTotal));
    // 奨学金（大学入学年に収入として計上）
    let scTotal=0;
    document.querySelectorAll('[id^="sc-amt-"]').forEach(el=>{
      const cid=el.id.split('-')[2];
      const scOn=document.getElementById(`sc-yes-${cid}`)?.classList.contains('on');
      if(!scOn)return;
      const scAmt=fv(`sc-amt-${cid}`)||0;
      const childAge=iv(`ca-${cid}`)||0;
      // 大学入学年（子どもが19歳になる年）に計上
      if(childAge+i===19)scTotal+=scAmt;
    });
    R.scholarship.push(scTotal);
    // 保険満期金（積み立て保険 + 一時払い保険）
    let insMatTotal=0;
    const _insMatItems=[];
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      const pLabel=p==='h'?'ご主人':'奥様';
      // 積み立て保険：満期受取（早期解約がない場合のみ）
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        // 早期解約がある場合は満期時に受け取らない
        if(matAmt>0&&matAge>0&&pAge===matAge&&(redeemAge<=0||redeemAge>=matAge)){
          insMatTotal+=matAmt;
          const monthly=fv(`ins-m-${p}-${iid}`)||0;
          const enrollAge=iv(`ins-enroll-${p}-${iid}`)||pBaseAge;
          const payYrs=matAge-enrollAge;
          const cumPremium=Math.round(monthly*12*Math.max(0,payYrs)*10)/10;
          const customLbl=document.getElementById(`ins-label-${p}-${iid}`)?.value?.trim()||'';
          _insMatItems.push({
            lbl:customLbl||`積立保険(${pLabel})`, type:'savings', person:p,
            enrollAge, matAge, payYrs, monthly, cumPremium, matAmt,
            gain:Math.round((matAmt-cumPremium)*10)/10
          });
        }
      });
      // 一時払い保険：満期受取
      document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const enrollAge=iv(`ins-lump-enroll-${p}-${iid}`)||pBaseAge;
        const amt=fv(`ins-lump-amt-${p}-${iid}`)||0;
        const matAge=iv(`ins-lump-matage-${p}-${iid}`)||0;
        const rate=fv(`ins-lump-rate-${p}-${iid}`)||0;
        const matAmtFixed=fv(`ins-lump-matamt-${p}-${iid}`)||0;
        const pct=fv(`ins-lump-pct-${p}-${iid}`)||0;
        if(amt<=0||matAge<=0||pAge!==matAge)return;
        const yrs=matAge-enrollAge;
        let matVal=0, mode='';
        const _lumpSecKey=`ins-lump-${p}-${iid}`;
        const _lumpSeries=_lumpInsSeriesCache[_lumpSecKey];
        if(_lumpSeries && rate>0){
          // シナリオ適用時（rate方式のみ）: 満期年iの値を使用
          matVal = _lumpSeries[i]||Math.round(amt*Math.pow(1+rate/100,yrs)*10)/10;
          mode='rate';
        } else if(rate>0){matVal=Math.round(amt*Math.pow(1+rate/100,yrs)*10)/10;mode='rate';}
        else if(matAmtFixed>0){matVal=matAmtFixed;mode='fixed';}
        else if(pct>0){matVal=Math.round(amt*pct/100*10)/10;mode='pct';}
        insMatTotal+=matVal;
        const customLbl=document.getElementById(`ins-lump-label-${p}-${iid}`)?.value?.trim()||'';
        _insMatItems.push({
          lbl:customLbl||`一時払い保険(${pLabel})`, type:'lump', person:p,
          enrollAge, matAge, yrs, premium:amt, matAmt:matVal,
          rate, matAmtFixed, pct, mode,
          gain:Math.round((matVal-amt)*10)/10
        });
      });
    });
    R.insMat.push(insMatTotal);
    R.insMatBd.push(_insMatItems.length>0?{items:_insMatItems,total:insMatTotal,year:yr,age_h:ha,age_w:wa}:null);
    // 老齢年金（死亡後も生存配偶者の年金は継続表示）
    const _pSVal=(ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge))?ri(pSelf):0;
    const _pWVal=(!_isSingle&&wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge))?ri(pWife):0;
    R.pS.push(_pSVal);
    R.pW.push(_pWVal);
    // ─── 児童手当（TEATE_TABLEを参照・2024年10月改正対応） ───
    let t=0;
    if(hDeathAge===0||ha<=hDeathAge){
      const sortedChildren=[...children].sort((a,b)=>b.age-a.age);
      children.forEach((c)=>{
        const ca=c.age+i;
        if(ca<0||ca>18)return;
        const rank=sortedChildren.indexOf(c)+1;
        const ageKey=ca<=2?'age_0_2':'age_3_18';
        const rankKey=rank>=3?'rank3plus':rank===2?'rank2':'rank1';
        const monthly=TEATE_TABLE[ageKey][rankKey]||0;
        t+=Math.round(monthly*12/10000);
      });
    }
    R.teate.push(t);

    // ─── 遺族年金（純粋な遺族年金部分のみ、老齢年金は別行表示）※単身時スキップ ───
    let survP=0, survPH=0, survPW=0; // survPH: ご主人が受給, survPW: 奥様が受給
    let _survBd=null; // 内訳（explain用）
    if(!_isSingle&&hDeathAge>0&&ha>hDeathAge){
      // ── ご主人ご逝去後：奥様への遺族年金 ──
      const overrideH=fv('surv-h-amt');
      if(overrideH>0){
        survP=overrideH;
        _survBd={receiver:'w', manual:true, total:survP};
      }else{
        let childUnder18=0;
        children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
        const kiso=calcKiso(childUnder18);
        const wAgeAtDeath=wAge+(hDeathAge-hAge);
        const hadChildren=children.some(c=>c.age+(hDeathAge-hAge)<=18);
        // 30歳未満・子なし妻の5年有期ルール（H19年改正）
        const noChildAtDeath=!children.length&&!hadChildren;
        const yearsSinceDeath=ha-hDeathAge;
        if(noChildAtDeath&&wAgeAtDeath<30&&yearsSinceDeath>5){
          survP=0; // 5年経過で遺族厚生年金失権
          _survBd={receiver:'w', manual:false, expired:true, total:0};
        }else{
          const routeA=wAgeAtDeath>=40;const routeB=hadChildren&&wa>=40;
          const chukorei=(kiso===0&&wa>=40&&wa<65&&(routeA||routeB))?ri(CHUKOREI_KAFU):0;
          // 遺族厚生年金用：死亡時点の被保険者期間ベース＋300月みなし
          const koseiHSurv=calcKoseiForSurvP('h', pHStart, hDeathAge, pSelf, kisoH);
          let kosei3_4=0, koseiAdj=0;
          if(wa>=pWReceive){
            kosei3_4=ri(koseiHSurv*0.75);
            koseiAdj=Math.max(kosei3_4-koseiW,0);
            survP=koseiAdj+kiso+chukorei;
          }else{
            kosei3_4=ri(koseiHSurv*0.75);
            koseiAdj=kosei3_4;
            survP=kosei3_4+kiso+chukorei;
          }
          _survBd={receiver:'w', manual:false, kiso, kosei3_4, koseiAdj, koseiOwn:wa>=pWReceive?koseiW:0, chukorei, total:survP, childUnder18};
        }
      }
      survPW=survP;
    }else if(wDeathAge>0&&wa>wDeathAge){
      // ── 奥様ご逝去後：ご主人への遺族年金 ──
      const overrideW=fv('surv-w-amt');
      if(overrideW>0){
        survP=overrideW;
        _survBd={receiver:'h', manual:true, total:survP};
      }else{
        const hIncome=getIncomeAtAge(hSteps,ha);
        let childUnder18=0;
        children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
        const kiso=calcKiso(childUnder18);
        const hAgeAtDeath=hAge+(wDeathAge-wAge); // 妻死亡時のご主人の年齢
        const hadChildAtDeath=children.some(c=>c.age+(wDeathAge-wAge)<=18);
        // 遺族厚生年金用：妻の死亡時点の被保険者期間ベース＋300月みなし
        const koseiWSurv=calcKoseiForSurvP('w', pWStart, wDeathAge, pWife, kisoW);
        let kosei3_4=0, koseiAdj=0, suspended=false;
        // 夫の遺族厚生年金要件: 死亡時に(子ありOR55歳以上)が必須
        if(childUnder18>0){
          kosei3_4=ri(koseiWSurv*0.75);
          if(ha>=pHReceive){koseiAdj=Math.max(kosei3_4-koseiH,0);survP=koseiAdj+kiso;}
          else{koseiAdj=kosei3_4;survP=kosei3_4+kiso;}
        }else if(hadChildAtDeath||hAgeAtDeath>=55){
          // 死亡時に子ありだった or 55歳以上→受給権あり、60歳から支給
          if(ha>=60&&hIncome<850){
            kosei3_4=ri(koseiWSurv*0.75);
            if(ha>=pHReceive){koseiAdj=Math.max(kosei3_4-koseiH,0);survP=koseiAdj;}
            else{koseiAdj=kosei3_4;survP=kosei3_4;}
          }else{suspended=true;}// 60歳未満 or 高収入は支給停止
        }
        // 死亡時55歳未満・子なし → survP=0（受給権なし）
        _survBd={receiver:'h', manual:false, kiso, kosei3_4, koseiAdj, koseiOwn:ha>=pHReceive?koseiH:0, chukorei:0, total:survP, childUnder18, suspended};
      }
      survPH=survP;
    }
    R.survPension.push(survP);
    // 年金合算行（pTotalH: ご主人受給分 = 老齢年金 + 遺族年金, pTotalW: 奥様受給分）
    const _pTotH=_pSVal+survPH;
    const _pTotW=_pWVal+survPW;
    R.pTotalH.push(_pTotH);
    R.pTotalW.push(_pTotW);
    R.pensionBd.push({
      pS:_pSVal, pW:_pWVal, survPH, survPW,
      kisoH, kisoW, koseiH, koseiW,
      pHReceive, pWReceive, retAge, wRetAge, pHStart, pWStart,
      hDeathAge, wDeathAge, hAge, wAge, ha, wa,
      surv:_survBd,
      pTotH:_pTotH, pTotW:_pTotW
    });

    // ─── 住宅ローン控除（LCTRL_TABLEを参照・所得税・住民税上限考慮） ───
    const lctrlYear=parseInt(document.getElementById('lctrl-year')?.value)||2025;
    const lctrlType=document.getElementById('lctrl-type')?.value||'new_eco';
    const lctrlHH=document.getElementById('lctrl-household')?.value||'general';
    const isKosodate=lctrlHH==='kosodate';
    const lctrlRowR=getLCtrlRow(lctrlYear,lctrlType,isKosodate);
    const lctrlLimit=lctrlRowR[0], lctrlYrs=lctrlRowR[1];
    let lc2=0;
    // 計算根拠データ（explain-lctrl.jsが読む）
    let _lctrlBd={
      mode: _lctrlDedMode,
      lctrlYear, lctrlType, isKosodate,
      totalYrs: lctrlYrs,
      yearIndex: lcYr+1,
      inPeriod: lctrlYrs>0 && lcYr<lctrlYrs,
      hasLoan: effLoanAmt>0,
      hasLimit: lctrlLimit>0,
      remainBal: 0, balCap: lctrlLimit*((pairLoanMode||_flatPair)?2:1),
      pairMode: pairLoanMode||_flatPair,
      rate: 0.7,
      calcAmount: 0,
      grossEst: 0, taxableBase: 0, itax: 0, juminCtrlMax: 0,
      taxCapTotal: 0
    };
    // 自由入力モード
    if(_lctrlDedMode==='manual'){
      const mv=getLctrlManualValues();
      lc2=lcYr<mv.length?mv[lcYr]:0;
      _lctrlBd.autoValue=ri(lc2);
    }else
    if(active&&lctrlYrs>0&&lcYr<lctrlYrs&&effLoanAmt>0&&lctrlLimit>0){
      const loanType2tmp=_isFlat?eLoanType:(document.getElementById('loan-type')?.value||'equal_payment');
      let remainBal=0;
      let _hBal=0,_wBal=0; // ペアローン時の各自残高
      // 住宅ローン控除は「12/31時点（年末）残高」× 0.7%。lbal(...,lcYr+1) が年末残高
      if(_flatPair){
        if(_fhAmt>0&&lcYr<_fhYrs)_hBal=(_fhType==='equal_payment'?lbal(_fhAmt,_fhYrs,effRate(lcYr,_flatRates),lcYr+1):lbal_gankin(_fhAmt,_fhYrs,lcYr+1));
        if(_fwAmt>0&&lcYr<_fwYrs)_wBal=(_fwType==='equal_payment'?lbal(_fwAmt,_fwYrs,effRate(lcYr,_flatRates),lcYr+1):lbal_gankin(_fwAmt,_fwYrs,lcYr+1));
        remainBal=_hBal+_wBal;
      }else if(pairLoanMode){
        _hBal=(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr+1):0);
        _wBal=(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr+1):0);
        remainBal=_hBal+_wBal;
      }else{
        remainBal=loanType2tmp==='equal_payment'?lbal(loanAmt,eLoanYrs,effRate(lcYr,eRates),lcYr+1):lbal_gankin(loanAmt,eLoanYrs,lcYr+1);
      }
      _lctrlBd.hBal=_hBal; _lctrlBd.wBal=_wBal;
      const cappedBal=Math.min(remainBal,(pairLoanMode||_flatPair)?lctrlLimit*2:lctrlLimit);
      const calcCtrl=Math.round(cappedBal*0.007*10)/10;
      // 所得税・住民税から上限を推計（ご主人の手取りから額面を逆算）
      const grossInc=hInc>0?hInc:0;
      let grossEst=0;
      for(let gi=0;gi<TAX.length-1;gi++){
        if(grossInc<=TAX[gi][1]){grossEst=TAX[gi][0];break;}
        if(grossInc<TAX[gi+1][1]){
          const r=(grossInc-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);
          grossEst=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));
          break;
        }
        grossEst=TAX[TAX.length-1][0];
      }
      if(grossEst<=0&&grossInc>0)grossEst=TAX[TAX.length-1][0];
      let itax=0, jumin=0, taxableBase=0;
      if(grossEst>0){
        // 社会保険料（年齢に応じて介護保険料加算）
        const shakai=Math.round(grossEst*calcShakaiRate(ha)*10)/10;
        const kyuyo=calcKyuyoDed(grossEst);
        const grossSyotoku=Math.max(0,grossEst-kyuyo); // 給与所得金額
        const [kisoIt,kisoJu]=calcKisoDed(grossSyotoku); // 基礎控除（所得税／住民税）
        // 配偶者控除の適用判定（奥様の年収をグロス推定）
        let wGrossForDed=0;
        if(!_isSingle){
          const wIncLocal=wInc>0?wInc:0;
          for(let gi=0;gi<TAX.length-1;gi++){
            if(wIncLocal<=TAX[gi][1]){wGrossForDed=TAX[gi][0];break;}
            if(wIncLocal<TAX[gi+1][1]){const r=(wIncLocal-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);wGrossForDed=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));break;}
            wGrossForDed=TAX[TAX.length-1][0];
          }
          if(wGrossForDed<=0&&wIncLocal>0)wGrossForDed=TAX[TAX.length-1][0];
        }
        const hasSpouseDed=!_isSingle&&canApplySpouseDed(grossEst,wGrossForDed);
        const spouseDedIt=hasSpouseDed?38:0;
        const spouseDedJu=hasSpouseDed?33:0;
        // 所得税の課税所得
        taxableBase=Math.max(0,grossSyotoku-shakai-kisoIt);
        const taxable=Math.max(0,taxableBase-spouseDedIt);
        itax=calcIncomeTax(taxable);
        // 住民税（基礎控除43万、配偶者控除33万、調整控除・均等割含む）
        const juminTaxable=Math.max(0,grossSyotoku-shakai-kisoJu-spouseDedJu);
        jumin=calcJuminTax(juminTaxable);
      }
      // 住民税控除上限＝課税総所得金額等×5%（上限JUMIN_CTRL_MAX）
      const juminCtrlMax=Math.min(Math.round(taxableBase*0.05*10)/10, JUMIN_CTRL_MAX);
      const taxCapTotal=Math.round((itax+juminCtrlMax)*10)/10;
      lc2=Math.round(Math.min(calcCtrl, taxCapTotal)*10)/10;
      lc2=Math.max(0,lc2);
      // breakdown 更新
      _lctrlBd.remainBal=remainBal;
      _lctrlBd.calcAmount=calcCtrl;
      _lctrlBd.grossEst=grossEst;
      _lctrlBd.taxableBase=taxableBase;
      _lctrlBd.itax=itax;
      _lctrlBd.juminCtrlMax=juminCtrlMax;
      _lctrlBd.taxCapTotal=taxCapTotal;
      // ペアローン時は奥様側の税額情報も追加
      if((pairLoanMode||_flatPair)&&!_isSingle){
        const wGrossInc=wInc>0?wInc:0;
        let wGrossEst=0;
        for(let gi=0;gi<TAX.length-1;gi++){
          if(wGrossInc<=TAX[gi][1]){wGrossEst=TAX[gi][0];break;}
          if(wGrossInc<TAX[gi+1][1]){
            const r=(wGrossInc-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);
            wGrossEst=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));
            break;
          }
          wGrossEst=TAX[TAX.length-1][0];
        }
        if(wGrossEst<=0&&wGrossInc>0)wGrossEst=TAX[TAX.length-1][0];
        let wItax=0, wTaxableBase=0;
        if(wGrossEst>0){
          const wShakai=Math.round(wGrossEst*calcShakaiRate(wa)*10)/10;
          const wKyuyo=calcKyuyoDed(wGrossEst);
          const wGrossSyotoku=Math.max(0,wGrossEst-wKyuyo);
          const [wKisoIt]=calcKisoDed(wGrossSyotoku);
          // 配偶者控除：奥様が本人視点の場合（ご主人様の所得で判定）
          // ここではペアローン共働き想定のため奥様は基本的に配偶者控除なし
          wTaxableBase=Math.max(0,wGrossSyotoku-wShakai-wKisoIt);
          wItax=calcIncomeTax(wTaxableBase);
        }
        const wJuminCtrlMax=Math.min(Math.round(wTaxableBase*0.05*10)/10, JUMIN_CTRL_MAX);
        const wTaxCapTotal=Math.round((wItax+wJuminCtrlMax)*10)/10;
        _lctrlBd.wGrossEst=wGrossEst;
        _lctrlBd.wTaxableBase=wTaxableBase;
        _lctrlBd.wItax=wItax;
        _lctrlBd.wJuminCtrlMax=wJuminCtrlMax;
        _lctrlBd.wTaxCapTotal=wTaxCapTotal;
        // 各自の計算上の控除額（自分のローン残高 × 0.7%、単独ローン上限で頭打ち）
        const hCalcAmt=Math.round(Math.min(_hBal,lctrlLimit)*0.007*10)/10;
        const wCalcAmt=Math.round(Math.min(_wBal,lctrlLimit)*0.007*10)/10;
        _lctrlBd.hCalcAmount=hCalcAmt;
        _lctrlBd.wCalcAmount=wCalcAmt;
        // 【厳密計算】各自の適用控除額 = min(計算上の控除額, 自分の税額上限)
        const hApplied=Math.max(0,Math.round(Math.min(hCalcAmt, taxCapTotal)*10)/10);
        const wApplied=Math.max(0,Math.round(Math.min(wCalcAmt, wTaxCapTotal)*10)/10);
        _lctrlBd.hApplied=hApplied;
        _lctrlBd.wApplied=wApplied;
        // ペアローン時は夫婦別計算の合算をlc2として採用（厳密計算）
        lc2=Math.round((hApplied+wApplied)*10)/10;
        lc2=Math.max(0,lc2);
      }
    }
    if(_lctrlDedMode!=='manual'){
      // 元の自動計算値を breakdown に保存（Pass2 の override 上書きに影響されない）
      _lctrlBd.autoValue=ri(lc2);
    }
    // 住宅ローン控除は引き渡しの翌年セルから反映（税還付の入金タイミング）
    // そのため、この年に計上するのは「前年に計算された控除額」
    const _pushLc2=_prevLc2;
    const _pushBd=_prevLctrlBd||{
      mode:_lctrlDedMode, lctrlYear, lctrlType, isKosodate,
      totalYrs:lctrlYrs, yearIndex:0, inPeriod:false,
      hasLoan:false, hasLimit:false,
      remainBal:0, balCap:lctrlLimit*((pairLoanMode||_flatPair)?2:1),
      pairMode:pairLoanMode||_flatPair, rate:0.7,
      calcAmount:0, grossEst:0, taxableBase:0, itax:0, juminCtrlMax:0, taxCapTotal:0,
      autoValue:0
    };
    R.lCtrl.push(ri(_pushLc2));
    R.lCtrlBreakdown.push(_pushBd);
    _prevLc2=lc2;
    _prevLctrlBd=_lctrlBd;
    // ─── 有価証券・積立保険の解約収入 ───
    if(!R.secRedeemRows)R.secRedeemRows=[];
    let secRedeemTotal=0;
    const secRedeemMap={};
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      // 積立型の解約
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const redeemAge=iv(`sec-redeem-${p}-${sid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-bal-${p}-${sid}`)||0;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=fvd(`sec-rate-${p}-${sid}`,5)/100;
        const yrs=i+1;
        // シナリオ適用時はシリーズキャッシュの解約年の値を使う
        const _redeemSecKey=`sec-accum-${p}-${sid}`;
        const _redeemSeries=_accumSeriesCache[_redeemSecKey];
        let fv2=0;
        if(_redeemSeries){
          fv2 = _redeemSeries[i]||0;
        } else if(endAge===0||pAge<=endAge){
          const cpd=Math.pow(1+rate,yrs);
          const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
          const balGrow=bal*cpd;
          const accumFV=mr>0?monthly*(cpd-1)/mr:monthly*12*yrs;
          fv2=Math.round(balGrow+accumFV);
        } else {
          const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
          const yrsAccum=endAge-pBaseAge;
          const yrsAfter=yrs-yrsAccum;
          const cpdA=Math.pow(1+rate,yrsAccum);
          const balAtEnd=bal*cpdA;
          const accumAtEnd=mr>0?monthly*(cpdA-1)/mr:monthly*12*yrsAccum;
          fv2=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+rate,Math.max(0,yrsAfter)));
        }
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        // 課税口座：譲渡益課税 20.315%（所得税15%+住民税5%+復興特別所得税0.315%）
        // 取得原価は「取得価格累計(basis)」が入力されていればそれを使用、なければ現在評価額(bal)で近似
        const basis=fv(`sec-basis-${p}-${sid}`)||0;
        const initialCost=basis>0?basis:bal;
        const costAccum=initialCost+monthly*12*(endAge>0&&pAge>endAge?(endAge-pBaseAge):yrs);
        const gainAccum=Math.max(0,fv2-costAccum);
        let netAccum=fv2, taxAccum=0;
        if(!isNisa){
          taxAccum=Math.round(gainAccum*0.20315*10)/10;
          netAccum=Math.round(fv2-taxAccum);
        }
        const lbl=customLabel||(isNisa?'NISA':'課税')+'積立(解約)';
        const _accumKey=`accum-${p}-${sid}`;
        secRedeemMap[_accumKey]={lbl,val:netAccum};
        secRedeemTotal+=netAccum;
        // 内訳保存
        if(!R.secRedeemBd[_accumKey])R.secRedeemBd[_accumKey]={};
        R.secRedeemBd[_accumKey][i]={
          type:'accum', lbl, person:p, isNisa,
          principal:Math.round(costAccum*10)/10,
          evaluation:fv2, gain:Math.round(gainAccum*10)/10,
          tax:taxAccum, net:netAccum,
          redeemAge, yrs, monthly, bal, rate:rate*100
        };
      });
      // 一括投資の解約
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const redeemAge=iv(`sec-stk-redeem-${p}-${sid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        // シナリオ適用時はシリーズキャッシュの解約年の値を使う
        const _redeemStkKey=`sec-stk-${p}-${sid}`;
        const _redeemStkSeries=_stkSeriesCache[_redeemStkKey];
        const redeemVal = _redeemStkSeries ? (_redeemStkSeries[i]||0) : Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        // 課税口座：譲渡益課税 20.315%
        const gainStk=Math.max(0,redeemVal-bal);
        let netStk=redeemVal, taxStk=0;
        if(!isNisa){
          taxStk=Math.round(gainStk*0.20315*10)/10;
          netStk=Math.round(redeemVal-taxStk);
        }
        const lbl=customLabel||(isNisa?'NISA':'課税')+'一括(解約)';
        const _stkKey=`stk-${p}-${sid}`;
        secRedeemMap[_stkKey]={lbl,val:netStk};
        secRedeemTotal+=netStk;
        // 内訳保存
        if(!R.secRedeemBd[_stkKey])R.secRedeemBd[_stkKey]={};
        R.secRedeemBd[_stkKey][i]={
          type:'stk', lbl, person:p, isNisa,
          principal:bal, evaluation:redeemVal,
          gain:Math.round(gainStk*10)/10, tax:taxStk, net:netStk,
          redeemAge, yrsHeld, investAge, rate:rate*100
        };
      });
      // 積立保険の解約（保険は別行のため secRedeemRows に含めない）
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const monthly=fv(`ins-m-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        const redeemAmt=fv(`ins-redeem-amt-${p}-${iid}`)||0;
        if(pAge>=matAge&&matAmt>0){secRedeemTotal+=matAmt;return;}
        if(redeemAmt>0){secRedeemTotal+=redeemAmt;return;}
        if(matAge>0&&monthly>0){
          const enrollAge=iv(`ins-enroll-${p}-${iid}`)||pBaseAge;
          const totalPayYrs=matAge-enrollAge;
          const paidYrs2=Math.min(redeemAge-enrollAge,totalPayYrs);
          const cumPay=monthly*12*Math.max(0,paidYrs2);
          const ratio=totalPayYrs>0?paidYrs2/totalPayYrs:0;
          const surrenderCharge=Math.max(0,0.3*(1-ratio));
          secRedeemTotal+=Math.round(cumPay*(1-surrenderCharge)+matAmt*ratio*ratio);
        }
      });
    });
    // per-security 行を追跡（finAssetRows と同パターン）
    Object.keys(secRedeemMap).forEach(k=>{
      if(!R.secRedeemRows.find(r=>r.key===k)){
        R.secRedeemRows.push({key:k,lbl:secRedeemMap[k].lbl,vals:new Array(i).fill(0)});
      }
    });
    R.secRedeemRows.forEach(row=>{row.vals.push(ri(secRedeemMap[row.key]?.val||0));});
    R.secRedeem.push(ri(secRedeemTotal));
    R.incT.push(ri(hInc)+ri(wInc)+ri(hDCSaving)+ri(wDCSaving)+(ha===retPayAge?ri(retPay):0)+(wa===wRetPayAge?ri(wRetPay):0)+ri(oiTotal)+scTotal+insMatTotal+ri(secRedeemTotal)+_pTotH+_pTotW+t+_pushLc2);
    // DC・iDeCo受取は後でfinRowMap計算後にincTに加算される（Pass2でincKeysに含む）

    // ─── 生活費（段階別複利計算） ───
    let lcVal;{
      if(!lcSteps.length){lcVal=ri(baseLc);}
      else{
        // from<=yr の中で最後の段階をアクティブに（全段階チェック、break無し）
        let ai=-1;
        for(let i=0;i<lcSteps.length;i++){if(lcSteps[i].from<=yr)ai=i;else break;}
        if(ai<0){lcVal=ri(baseLc);}
        else{
          let runBase=baseLc;
          for(let i=0;i<=ai;i++){
            const s=lcSteps[i];const sb=s.mode==='pct'?runBase*(s.pct/100):(s.base>0?s.base:runBase);
            if(i<ai){// 前段階：終了年まで複利を累積（to指定があれば年数、なければ次段階開始前年まで）
              const effTo=s.to!==null?s.to:(lcSteps[i+1].from-1);
              runBase=sb*Math.pow(1+s.rate/100,Math.max(0,effTo-s.from));
            }else{// アクティブ段階：yr時点の値
              lcVal=ri(sb*Math.pow(1+s.rate/100,Math.max(0,yr-s.from)));
            }
          }
        }
      }
    }
    R.lc.push(lcVal);
    // ─── 有価証券積立額（積立型のみ・解約前年まで）を支出計上（個別行） ───
    if(!R.secInvestRows)R.secInvestRows=[];
    let secInvestTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pLabel=p==='h'?'ご主人様':'奥様';
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        if(monthly<=0)return;
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const rowKey=`secInv-${p}-${sid}`;
        const lbl=customLabel||`積立投資(${pLabel})`;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const redeemAge=iv(`sec-redeem-${p}-${sid}`)||0;
        const isActive=(endAge===0||pAge<endAge)&&(redeemAge===0||pAge<redeemAge);
        const v=isActive?ri(monthly*12):0;
        let row=R.secInvestRows.find(r=>r.key===rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.secInvestRows.push(row);}
        row.vals.push(v);
        secInvestTotal+=v;
      });
    });
    R.secInvest.push(ri(secInvestTotal));
    // ─── 一括投資購入額（投資開始年齢に支出計上）───
    let secBuyTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        if(investAge<=0||pAge!==investAge)return;
        secBuyTotal+=fv(`sec-stk-bal-${p}-${sid}`)||0;
      });
    });
    R.secBuy.push(ri(secBuyTotal));
    // ─── 家賃（引き渡し前）───
    const rentMonthly=fv('rent-before')/10000;
    const rentAmt=(!active&&delivery>0)?ri(rentMonthly*12):0;
    R.rent.push(rentAmt);

    // ─── ローン返済 ───
    const loanType2=_isFlat?eLoanType:(document.getElementById('loan-type')?.value||'equal_payment');
    let lRep=0,_lRepH=0,_lRepW=0;
    if(_flatPair){
      if(active){
        if(_fhAmt>0&&lcYr<_fhYrs)_lRepH=ri(_fhType==='equal_payment'?mpay(_fhAmt,_fhYrs,effRate(lcYr,_flatRates))*12:mpay_gankin_year(_fhAmt,_fhYrs,effRate(lcYr,_flatRates),lcYr));
        if(_fwAmt>0&&lcYr<_fwYrs)_lRepW=ri(_fwType==='equal_payment'?mpay(_fwAmt,_fwYrs,effRate(lcYr,_flatRates))*12:mpay_gankin_year(_fwAmt,_fwYrs,effRate(lcYr,_flatRates),lcYr));
      }
      lRep=_lRepH+_lRepW;
    } else if(pairLoanMode){
      if(active){
        if(lcYr<lhYrs)_lRepH=ri(lhType==='equal_payment'?mpay(lhAmt,lhYrs,effRate(lcYr,ratesH))*12:mpay_gankin_year(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr));
        if(lcYr<lwYrs)_lRepW=ri(lwType==='equal_payment'?mpay(lwAmt,lwYrs,effRate(lcYr,ratesW))*12:mpay_gankin_year(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr));
      }
      lRep=_lRepH+_lRepW;
    } else if(active&&lcYr<eLoanYrs){
      if(eLoanType==='equal_payment'){
        lRep=ri(mpay(loanAmt,eLoanYrs,effRate(lcYr,eRates))*12);
      } else {
        lRep=ri(mpay_gankin_year(loanAmt,eLoanYrs,effRate(lcYr,eRates),lcYr));
      }
    }
    R.lRep.push(lRep);R.lRepH.push(_lRepH);R.lRepW.push(_lRepW);

    // ─── 住宅固有 ───
    const el2=Math.max(1,lcYr+1);
    R.rep.push(active&&isM?getRepFund(sqm,el2):0);
    const ptxV=active?(lcYr<taxRed?ri(propTax*0.5):ri(propTax)):0;
    R.ptx.push(ptxV);
    const furnCycle=ivd('furn-cycle',10);
    const furnCost=ivd('furn-cost',80);
    R.furn.push(active&&el2>0&&el2%furnCycle===0?furnCost:0);
    // 修繕周期の集計（動的要素のみ）
    let repTotal=0;
    if(active&&el2>0){
      document.querySelectorAll('#repair-cont>[id^="rep-"]').forEach(repEl=>{
        const rid=repEl.id.replace('rep-','');
        const cyc=parseInt(document.getElementById('repair-cycle'+rid)?.value)||0;
        const cost=iv('repair-cost'+rid)||0;
        if(cyc>0&&cost>0&&el2%cyc===0)repTotal+=cost;
      });
    }
    R.senyu.push(repTotal);
    children.forEach((c,ci)=>{
      const ca=c.age+i;
      R.edu[ci].push(ca>=0&&ca<c.costs.length?c.costs[ca]:0);
      if(c.costsBd && ca>=0 && ca<32){
        R.eduBd[ci].push({
          age:ca,
          eduFee:c.costsBd.eduFee[ca]||0,
          lunch:c.costsBd.lunch[ca]||0,
          extra:c.costsBd.extra[ca]||0,
          total:c.costsBd.total[ca]||0,
          stage:c.costsBd.stages[ca]||null
        });
      } else {
        R.eduBd[ci].push(null);
      }
    });
    const parkFromAge=iv('park-from-age')||0;
    const parkToAge=iv('park-to-age')||0;
    const parkActive=(parkFromAge<=0||ha>=parkFromAge)&&(parkToAge<=0||ha<=parkToAge);
    R.prk.push(parkOwn&&parkActive?ri(parking*12):0);
    // 車両購入・車検（複数台対応）
    if(!R.carRows)R.carRows=[];
    let carBuyAmt=0, carInspAmt=0;
    if(carOwn){
      document.querySelectorAll('#car-list>[id^="car-"]').forEach(carEl=>{
        const cIdx=carEl.id.replace('car-','');
        const carType=carEl.dataset.type||'new';
        const carPay=carEl.dataset.pay||'cash';
        const carPrice=fvd('car-'+cIdx+'-price',300);
        const carFirst=(iv('car-'+cIdx+'-first')||1)-1;
        const carCycle=iv('car-'+cIdx+'-cycle')||7;
        const carInsp=fvd('car-'+cIdx+'-insp',10);
        const carDown=fvd('car-'+cIdx+'-down',50);
        const carLoanYrs=iv('car-'+cIdx+'-loan-yrs')||5;
        const carLoanRate=fvd('car-'+cIdx+'-loan-rate',2.5)/100/12;
        const carEndAge=iv('car-'+cIdx+'-end-age')||0;
        const carActive=carEndAge<30||ha<carEndAge; // 30未満は無効値→常にアクティブ
        // 台ごとの行を初期化
        const rowKey='car-'+cIdx;
        if(!R.carRows.find(r=>r.key===rowKey)){
          const carLblEl=document.getElementById('car-'+cIdx+'-label');
          const carLblTxt=carLblEl?.value?.trim()||`${R.carRows.length+1}台目`;
          R.carRows.push({key:rowKey,lbl:'🚗 '+carLblTxt,vals:new Array(i).fill(0)});
        }
        const carRow=R.carRows.find(r=>r.key===rowKey);
        let lastBuy=-1;
        if(i>=carFirst){
          const elapsed=i-carFirst;
          lastBuy=carFirst+Math.floor(elapsed/carCycle)*carCycle;
        }
        const isBuyYear=carActive&&(i===carFirst||(i>carFirst&&(i-carFirst)%carCycle===0));
        let thisCarAmt=0, thisInspAmt=0;
        if(isBuyYear){
          if(carPay==='cash'){thisCarAmt+=carPrice;}
          else{thisCarAmt+=carDown;}
        }
        if(carPay==='loan'&&carLoanYrs>0&&lastBuy>=0&&!isBuyYear&&carActive){
          const principal=(carPrice-carDown)*10000;
          const monthly=carLoanRate>0?principal*carLoanRate*Math.pow(1+carLoanRate,carLoanYrs*12)/(Math.pow(1+carLoanRate,carLoanYrs*12)-1):principal/carLoanYrs/12;
          const yrsAfterBuy=i-lastBuy;
          if(yrsAfterBuy>0&&yrsAfterBuy<=carLoanYrs){thisCarAmt+=Math.round(monthly*12/10000);}
        }
        if(lastBuy>=0&&!isBuyYear&&carActive){
          const yrFromBuy=i-lastBuy;
          if(carType==='new'){
            if(yrFromBuy===3||(yrFromBuy>3&&(yrFromBuy-3)%2===0))thisInspAmt+=carInsp;
          } else {
            if(yrFromBuy%2===0)thisInspAmt+=carInsp;
          }
        }
        const thisTotal=ri(thisCarAmt)+ri(thisInspAmt);
        if(carRow)carRow.vals.push(thisTotal);
        carBuyAmt+=thisCarAmt; carInspAmt+=thisInspAmt;
      });
      // carRowsのうち今回ループしなかった行（削除済み台）にも0を追加
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    } else {
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    }
    R.carBuy.push(ri(carBuyAmt));
    R.carInsp.push(ri(carInspAmt));
    R.carTotal.push(ri(carBuyAmt)+ri(carInspAmt));
    // 特別支出（複数対応・期間対応・個別行）
    const curYr=cYear+i;
    if(!R.extRows)R.extRows=[];
    let extSum=0;
    extraItems.forEach((it,ei)=>{
      if(!R.extRows[ei])R.extRows[ei]={lbl:it.lbl||'特別支出',vals:[],key:'ext'+ei};
      const v=(it.yr>0&&curYr>=it.yr&&curYr<=it.yr2)?ri(it.amt):0;
      R.extRows[ei].vals.push(v);
      extSum+=v;
    });
    R.ext.push(extSum);
    // 諸費用は前提条件で初期残高から差引済み → CF表には計上しない
    R.houseCostArr.push(0);
    // 引っ越し・家具家電は前提条件で初期残高から差引済み → CF表には計上しない
    R.moveInCost.push(0);
    // 結婚お祝い
    let wedTotal=0;
    document.querySelectorAll('[id^="wed-amt-"]').forEach(el=>{
      const cid=el.id.split('-')[2];
      const wedOn=document.getElementById(`wed-yes-${cid}`)?.classList.contains('on');
      if(!wedOn)return;
      const wedAmt=fvd(`wed-amt-${cid}`,100);
      const wedAge=iv(`wed-age-${cid}`)||28;
      const childAge=iv(`ca-${cid}`)||0;
      if(childAge+i===wedAge)wedTotal+=wedAmt;
    });
    R.wedding.push(wedTotal);
    // 積み立て保険 月払い保険料（加入年齢〜満期/解約年齢まで支出計上・個別行）
    if(!R.insMonthlyRows)R.insMonthlyRows=[];
    let insMonthlyTotal=0;
    ['h','w'].forEach(p=>{
      const pAge2=p==='h'?ha:wa;
      const pBase2=p==='h'?hAge:wAge;
      const pLabel2=p==='h'?'ご主人様':'奥様';
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const enrollAge2=iv(`ins-enroll-${p}-${iid}`)||pBase2;
        const matAge2=iv(`ins-age-${p}-${iid}`)||0;
        const monthly2=fv(`ins-m-${p}-${iid}`)||0;
        const redeemAge2=iv(`ins-redeem-${p}-${iid}`)||0;
        const endAge2=(redeemAge2>0&&redeemAge2<matAge2)?redeemAge2:matAge2;
        const customLabel=document.getElementById(`ins-label-${p}-${iid}`)?.value?.trim()||'';
        const rowKey=`insM-${p}-${iid}`;
        const lbl=customLabel||`積立保険(${pLabel2})`;
        const v=(monthly2>0&&matAge2>0&&pAge2>=enrollAge2&&pAge2<endAge2)?ri(monthly2*12):0;
        let row=R.insMonthlyRows.find(r=>r.key===rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.insMonthlyRows.push(row);}
        row.vals.push(v);
        insMonthlyTotal+=v;
      });
    });
    R.insMonthly.push(ri(insMonthlyTotal));
    // 一時払い保険 拠出（加入年齢の年のみ支出計上・個別行）
    if(!R.insLumpExpRows)R.insLumpExpRows=[];
    let insLumpExpTotal=0;
    ['h','w'].forEach(p=>{
      const pAge2=p==='h'?ha:wa;
      const pBase2=p==='h'?hAge:wAge;
      const pLabel2=p==='h'?'ご主人様':'奥様';
      document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const enrollAge2=iv(`ins-lump-enroll-${p}-${iid}`)||pBase2;
        const amt2=fv(`ins-lump-amt-${p}-${iid}`)||0;
        const customLabel=document.getElementById(`ins-lump-label-${p}-${iid}`)?.value?.trim()||'';
        const rowKey=`insL-${p}-${iid}`;
        const lbl=customLabel||`一時払保険(${pLabel2})`;
        const v=(amt2>0&&pAge2===enrollAge2)?ri(amt2):0;
        let row=R.insLumpExpRows.find(r=>r.key===rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.insLumpExpRows.push(row);}
        row.vals.push(v);
        insLumpExpTotal+=v;
      });
    });
    R.insLumpExp.push(ri(insLumpExpTotal));
    // DC マッチング拠出（支出として計上）ご主人/奥様別
    const _dcMatchH=(dcIdeco.h.matching>0&&ha<dcIdeco.h.retAge)?ri(dcIdeco.h.matching*12):0;
    const _dcMatchW=(dcIdeco.w.matching>0&&wa<dcIdeco.w.retAge)?ri(dcIdeco.w.matching*12):0;
    R.dcMatchExpH.push(_dcMatchH);R.dcMatchExpW.push(_dcMatchW);
    // iDeCo拠出（支出として計上＝預貯金から差し引く）ご主人/奥様別
    const _idecoH=(dcIdeco.h.idecoMonthly>0&&ha<dcIdeco.h.retAge)?ri(dcIdeco.h.idecoMonthly*12):0;
    const _idecoW=(dcIdeco.w.idecoMonthly>0&&wa<dcIdeco.w.retAge)?ri(dcIdeco.w.idecoMonthly*12):0;
    R.idecoExpH.push(_idecoH);R.idecoExpW.push(_idecoW);
    let exp=R.lc[i]+R.rent[i]+R.secInvest[i]+R.secBuy[i]+R.insMonthly[i]+R.insLumpExp[i]+lRep+R.rep[i]+R.ptx[i]+R.furn[i]+R.senyu[i]+R.prk[i]+R.carTotal[i]+R.wedding[i]+R.ext[i]+R.dcMatchExpH[i]+R.dcMatchExpW[i]+R.idecoExpH[i]+R.idecoExpW[i];
    children.forEach((c,ci)=>exp+=R.edu[ci][i]);
    R.expT.push(ri(exp));
    const b=R.incT[i]-R.expT[i];R.bal.push(b);sav+=b;
    // 財形貯蓄の積立（支出には含めないが資産として加算）
    let _savExtra=0;
    // 財形貯蓄（主人・奥様）
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pRetAge=p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60);
      const zm=fv(`zaikei-${p}-monthly`)||0;
      const ze=iv(`zaikei-${p}-end`)||0;
      if(zm>0&&(ze===0||pAge<(ze||pRetAge))){sav+=zm*12;_savExtra+=zm*12;}
    });
    // 積み立て証券の資産増加は預貯金残高に含めない（その他金融資産で別途表示）
    R.savExtra.push(_savExtra);
    R.sav.push(ri(sav));
    // ─── その他金融資産（有価証券＋積立保険 - 個別追跡） ───
    if(!R.finAssetRows)R.finAssetRows=[];
    const finRowMap={};
    const finRowMapBase={}; // 下落シナリオなしの通常利回り版（グラフ通常線用）
    const finRowPerson={}; // finRowMap のキーごとの所有者 ('h' or 'w' or 'both')
    // 【積立型有価証券】（主人・奥様両方）正確な複利計算
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
        if(!isAccum)return;
        const redeemAgeA=iv(`sec-redeem-${p}-${sid}`)||0;
        if(redeemAgeA>0&&pAge>=redeemAgeA)return;
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const _pLbl=p==='h'?'ご主人様':'奥様';
        const lbl=customLabel||((isNisa?'NISA':'課税')+'積み立て('+_pLbl+')');
        const bal=fv(`sec-bal-${p}-${sid}`)||0;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        if(bal<=0&&monthly<=0)return; // 残高も積立額もなければスキップ
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=fvd(`sec-rate-${p}-${sid}`,5)/100;
        const yrs=i+1;
        const _secKey=`sec-accum-${p}-${sid}`;
        const _series=_accumSeriesCache[_secKey];
        // 通常利回り版（常に計算し finRowMapBase に足す）
        let fv2Base=0;
        if(endAge===0||pAge<endAge){
          const cpd=Math.pow(1+rate,yrs);
          const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
          const balGrow=bal*cpd;
          const accumFV=mr>0?monthly*(cpd-1)/mr:monthly*12*yrs;
          fv2Base=Math.round(balGrow+accumFV);
        } else {
          const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
          const yrsAccum=endAge-pBaseAge;
          const yrsAfter=yrs-yrsAccum;
          const cpdA=Math.pow(1+rate,yrsAccum);
          const balAtEnd=bal*cpdA;
          const accumAtEnd=mr>0?monthly*(cpdA-1)/mr:monthly*12*yrsAccum;
          fv2Base=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+rate,Math.max(0,yrsAfter)));
        }
        // シナリオ適用版（シリーズがあれば使用、なければ通常版と同じ）
        const fv2 = _series ? (_series[i]||0) : fv2Base;
        finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+fv2Base;
        // 積立額累計（開始から現時点まで、積立終了後は endAge 時点で停止）
        const _effYrsAccum=endAge>0&&pAge>endAge?(endAge-pBaseAge):yrs;
        const _principal=Math.round((bal+monthly*12*Math.max(0,_effYrsAccum))*10)/10;
        finRowMap[lbl]=(finRowMap[lbl]||0)+fv2;
        finRowPerson[lbl]=finRowPerson[lbl]&&finRowPerson[lbl]!==p?'both':p;
        // 内訳保存: ラベル単位で年ごとに追加
        if(!R.finAssetBd[lbl])R.finAssetBd[lbl]={};
        if(!R.finAssetBd[lbl][i])R.finAssetBd[lbl][i]={items:[],total:0,principalTotal:0,gainTotal:0};
        const _gainA=Math.round((fv2-_principal)*10)/10;
        R.finAssetBd[lbl][i].items.push({
          type:'accum', person:p, isNisa,
          initBal:bal, monthly, rate:rate*100,
          principal:_principal, evaluation:fv2, gain:_gainA,
          yrs, endAge
        });
        R.finAssetBd[lbl][i].total+=fv2;
        R.finAssetBd[lbl][i].principalTotal+=_principal;
        R.finAssetBd[lbl][i].gainTotal+=_gainA;
      });
    });
    // 【一括投資】（主人・奥様両方）
    ['h','w'].forEach(p=>{
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
        if(!isStock)return;
        const pAge=p==='h'?ha:wa;
        const redeemAgeS=iv(`sec-stk-redeem-${p}-${sid}`)||0;
        if(redeemAgeS>0&&pAge>=redeemAgeS)return;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;
        if(investAge>0&&pAge<investAge)return;  // 未投資期間は除外
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const _pLbl=p==='h'?'ご主人様':'奥様';
        const lbl=customLabel||((isNisa?'NISA':'課税')+'一括投資('+_pLbl+')');
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
        if(bal<=0)return; // 残高なければスキップ
        const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        const _stkKey=`sec-stk-${p}-${sid}`;
        const _stkSeries=_stkSeriesCache[_stkKey];
        const _evalBase=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const _eval=_stkSeries?(_stkSeries[i]||0):_evalBase;
        finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+_evalBase;
        const _gainS=Math.round((_eval-bal)*10)/10;
        finRowMap[lbl]=(finRowMap[lbl]||0)+_eval;
        // 内訳保存
        if(!R.finAssetBd[lbl])R.finAssetBd[lbl]={};
        if(!R.finAssetBd[lbl][i])R.finAssetBd[lbl][i]={items:[],total:0,principalTotal:0,gainTotal:0};
        R.finAssetBd[lbl][i].items.push({
          type:'stk', person:p, isNisa,
          principal:bal, evaluation:_eval, gain:_gainS,
          rate:rate*100, yrsHeld, investAge
        });
        R.finAssetBd[lbl][i].total+=_eval;
        R.finAssetBd[lbl][i].principalTotal+=bal;
        R.finAssetBd[lbl][i].gainTotal+=_gainS;
        finRowPerson[lbl]=finRowPerson[lbl]&&finRowPerson[lbl]!==p?'both':p;
      });
    });
    // 【DC・iDeCo運用残高】
    ['h','w'].forEach(p=>{
      const d=dcIdeco[p];
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      const totalMonthly=d.employer+d.matching; // DC合計月額
      const hasDC=totalMonthly>0||d.dcInitBal>0;
      const hasIdeco=d.idecoMonthly>0||d.idecoInitBal>0;
      if(!hasDC&&!hasIdeco)return;
      // 初期残高付き将来価値ヘルパー（実効年利ベース月複利）
      // grow = initBal*(1+r)^yrs,  contrib = monthly*((1+r)^yrs-1)/mr,  mr=(1+r)^(1/12)-1
      const _fvWithInit=(initBal,monthly,rate,yrs)=>{
        const cpd=rate>0?Math.pow(1+rate,yrs):1;
        const grow=initBal*cpd;
        const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
        const contrib=monthly>0?(mr>0?monthly*(cpd-1)/mr:monthly*12*yrs):0;
        return grow+contrib;
      };
      // 受取開始時点の総残高を計算（DC+iDeCo共通で使う）
      const yrsToReceive=d.receiveAge-pBaseAge;
      let _dcBalAtReceive=0, _idecoBalAtReceive=0;
      if(hasDC){
        const yrsContrib=Math.min(d.retAge-pBaseAge, yrsToReceive);
        const rate=d.dcRate;
        const balAtEnd=_fvWithInit(d.dcInitBal,totalMonthly,rate,yrsContrib);
        _dcBalAtReceive=balAtEnd*(rate>0?Math.pow(1+rate,Math.max(0,yrsToReceive-yrsContrib)):1);
      }
      if(hasIdeco){
        const yrsContrib=Math.min(d.retAge-pBaseAge, yrsToReceive);
        const rate=d.idecoRate;
        const balAtEnd=_fvWithInit(d.idecoInitBal,d.idecoMonthly,rate,yrsContrib);
        _idecoBalAtReceive=balAtEnd*(rate>0?Math.pow(1+rate,Math.max(0,yrsToReceive-yrsContrib)):1);
      }
      const _totalBalAtReceive=Math.round(_dcBalAtReceive+_idecoBalAtReceive);
      // DC残高（finRowMap表示用）
      if(hasDC){
        const lbl=`DC(${p==='h'?'ご主人様':'奥様'})`;
        const yrs=i+1;
        const _dcSeries = _dcSeriesCache[`dc-${p}`];
        let dcBal=0, dcBalBase=0;
        if(pAge<d.receiveAge){
          // 通常（base）計算
          if(pAge<d.retAge){
            dcBalBase=_fvWithInit(d.dcInitBal,totalMonthly,d.dcRate,yrs);
          }else{
            const yrsContrib=d.retAge-pBaseAge;
            const balAtRetire=_fvWithInit(d.dcInitBal,totalMonthly,d.dcRate,yrsContrib);
            const yrsAfter=yrs-yrsContrib;
            dcBalBase=balAtRetire*(d.dcRate>0?Math.pow(1+d.dcRate,Math.max(0,yrsAfter)):1);
          }
          // シナリオ適用版
          dcBal = _dcSeries ? (_dcSeries[i]||0) : dcBalBase;
        }else if(_totalBalAtReceive>0){
          const elapsed=pAge-d.receiveAge;
          const _ay=(function(){const mt=String(d.method||'').match(/(annuity|combo)(\d+)?/);return mt&&mt[2]?parseInt(mt[2]):20;})();
          const _isLump=d.method==='lump';
          const _isAnn=/^annuity/.test(d.method||'');
          if(_isLump) dcBal=0;
          else if(_isAnn) dcBal=Math.round(_dcBalAtReceive)*Math.max(0,_ay-elapsed)/_ay;
          else dcBal=Math.round(_dcBalAtReceive/2)*Math.max(0,_ay-elapsed)/_ay;
        }
        if(dcBal>0){
          const _dcFv=Math.round(dcBal);
          const _dcFvBase=Math.round(dcBalBase>0?dcBalBase:dcBal);
          finRowMap[lbl]=(finRowMap[lbl]||0)+_dcFv;
          finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+_dcFvBase;
          finRowPerson[lbl]=p;
          // 内訳: 累計拠出額(月額×12×経過年、初期残高含む)
          const _yrs=i+1;
          const _contribYrs=Math.min(d.retAge-pBaseAge,_yrs);
          const _principal=Math.round((d.dcInitBal+totalMonthly*12*Math.max(0,_contribYrs))*10)/10;
          if(!R.finAssetBd[lbl])R.finAssetBd[lbl]={};
          R.finAssetBd[lbl][i]={
            items:[{type:'dc', person:p, isNisa:false, initBal:d.dcInitBal, monthly:totalMonthly, rate:d.dcRate*100, principal:_principal, evaluation:_dcFv, gain:Math.round((_dcFv-_principal)*10)/10, yrs:_yrs}],
            total:_dcFv, principalTotal:_principal, gainTotal:Math.round((_dcFv-_principal)*10)/10
          };
        }
      }
      // iDeCo残高（finRowMap表示用）
      if(hasIdeco){
        const lbl=`iDeCo(${p==='h'?'ご主人様':'奥様'})`;
        const yrs=i+1;
        const _idecoSeries = _idecoSeriesCache[`ideco-${p}`];
        let idecoBal=0, idecoBalBase=0;
        if(pAge<d.receiveAge){
          // 通常（base）計算
          if(pAge<d.retAge){
            idecoBalBase=_fvWithInit(d.idecoInitBal,d.idecoMonthly,d.idecoRate,yrs);
          }else{
            const yrsContrib=d.retAge-pBaseAge;
            const balAtRetire=_fvWithInit(d.idecoInitBal,d.idecoMonthly,d.idecoRate,yrsContrib);
            const yrsAfter=yrs-yrsContrib;
            idecoBalBase=balAtRetire*(d.idecoRate>0?Math.pow(1+d.idecoRate,Math.max(0,yrsAfter)):1);
          }
          // シナリオ適用版
          idecoBal = _idecoSeries ? (_idecoSeries[i]||0) : idecoBalBase;
        }else if(_totalBalAtReceive>0){
          const elapsed=pAge-d.receiveAge;
          const _ay=(function(){const mt=String(d.method||'').match(/(annuity|combo)(\d+)?/);return mt&&mt[2]?parseInt(mt[2]):20;})();
          const _isLump=d.method==='lump';
          const _isAnn=/^annuity/.test(d.method||'');
          if(_isLump) idecoBal=0;
          else if(_isAnn) idecoBal=Math.round(_idecoBalAtReceive)*Math.max(0,_ay-elapsed)/_ay;
          else idecoBal=Math.round(_idecoBalAtReceive/2)*Math.max(0,_ay-elapsed)/_ay;
        }
        if(idecoBal>0){
          const _idecoFv=Math.round(idecoBal);
          const _idecoFvBase=Math.round(idecoBalBase>0?idecoBalBase:idecoBal);
          finRowMap[lbl]=(finRowMap[lbl]||0)+_idecoFv;
          finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+_idecoFvBase;
          finRowPerson[lbl]=p;
          const _yrs=i+1;
          const _contribYrs=Math.min(d.retAge-pBaseAge,_yrs);
          const _principal=Math.round((d.idecoInitBal+d.idecoMonthly*12*Math.max(0,_contribYrs))*10)/10;
          if(!R.finAssetBd[lbl])R.finAssetBd[lbl]={};
          R.finAssetBd[lbl][i]={
            items:[{type:'ideco', person:p, isNisa:false, initBal:d.idecoInitBal, monthly:d.idecoMonthly, rate:d.idecoRate*100, principal:_principal, evaluation:_idecoFv, gain:Math.round((_idecoFv-_principal)*10)/10, yrs:_yrs}],
            total:_idecoFv, principalTotal:_principal, gainTotal:Math.round((_idecoFv-_principal)*10)/10
          };
        }
      }
      // 一時金課税の簡略拠出期間（就労開始→退職）を勤続年数の代替として使用
      const dcKinzoku=Math.max(1, d.retAge - (p==='h'?pHStart:pWStart));
      // method から年金受給期間を抽出（annuity5/10/15, combo5/10/15 等、未指定は20年）
      const _parseAnnuityYears=(m)=>{const mt=String(m||'').match(/(annuity|combo)(\d+)?/);return mt&&mt[2]?parseInt(mt[2]):20;};
      const annuityYears=_parseAnnuityYears(d.method);
      const isLump=d.method==='lump';
      const isAnnuity=/^annuity/.test(d.method||'');
      const isCombo=/^combo/.test(d.method||'');
      // 死亡後は年金受取停止（遺族への一時金は別途イベント扱い）
      const _aliveForDC = (p==='h') ? (hDeathAge===0||ha<=hDeathAge) : (wDeathAge===0||wa<=wDeathAge);
      // DC受取計算（一時金は退職所得控除＋1/2課税で手取り化）
      if(pAge>=d.receiveAge&&Math.round(_dcBalAtReceive)>0){
        const dcBR=Math.round(_dcBalAtReceive);
        if(isLump){
          if(pAge===d.receiveAge&&_aliveForDC){
            const net=calcTaishokuNet(dcBR,dcKinzoku);
            if(p==='h')dcReceiptH+=net;else dcReceiptW+=net;
          }
        }else if(isAnnuity){
          const a=Math.round(dcBR/annuityYears);
          if(pAge<d.receiveAge+annuityYears&&_aliveForDC){if(p==='h')dcReceiptH+=a;else dcReceiptW+=a;}
        }else if(isCombo){
          const half=Math.round(dcBR/2);
          if(pAge===d.receiveAge&&_aliveForDC){
            const net=calcTaishokuNet(half,dcKinzoku);
            if(p==='h')dcReceiptH+=net;else dcReceiptW+=net;
          }
          const aH=Math.round(half/annuityYears);
          if(pAge<d.receiveAge+annuityYears&&_aliveForDC){if(p==='h')dcReceiptH+=aH;else dcReceiptW+=aH;}
        }
      }
      // iDeCo受取計算（一時金は退職所得控除＋1/2課税で手取り化）
      if(pAge>=d.receiveAge&&Math.round(_idecoBalAtReceive)>0){
        const iBR=Math.round(_idecoBalAtReceive);
        if(isLump){
          if(pAge===d.receiveAge&&_aliveForDC){
            const net=calcTaishokuNet(iBR,dcKinzoku);
            if(p==='h')idecoReceiptH+=net;else idecoReceiptW+=net;
          }
        }else if(isAnnuity){
          const a=Math.round(iBR/annuityYears);
          if(pAge<d.receiveAge+annuityYears&&_aliveForDC){if(p==='h')idecoReceiptH+=a;else idecoReceiptW+=a;}
        }else if(isCombo){
          const half=Math.round(iBR/2);
          if(pAge===d.receiveAge&&_aliveForDC){
            const net=calcTaishokuNet(half,dcKinzoku);
            if(p==='h')idecoReceiptH+=net;else idecoReceiptW+=net;
          }
          const aH=Math.round(half/annuityYears);
          if(pAge<d.receiveAge+annuityYears&&_aliveForDC){if(p==='h')idecoReceiptH+=aH;else idecoReceiptW+=aH;}
        }
      }
    });
    R.dcReceiptH.push(ri(dcReceiptH));R.dcReceiptW.push(ri(dcReceiptW));
    R.idecoReceiptH.push(ri(idecoReceiptH));R.idecoReceiptW.push(ri(idecoReceiptW));
    // DC/iDeCo受取をincTに加算
    const dcIdecoReceiptTotal=dcReceiptH+dcReceiptW+idecoReceiptH+idecoReceiptW;
    if(dcIdecoReceiptTotal>0){R.incT[i]+=ri(dcIdecoReceiptTotal);R.bal[i]+=ri(dcIdecoReceiptTotal);sav+=ri(dcIdecoReceiptTotal);R.sav[i]=ri(sav);}
    // 【積立保険】はその他金融資産行から除外（推計精度が低いため）
    // finAssetRowsに追記（毎年動的にキーを管理）
    Object.keys(finRowMap).forEach(k=>{
      if(!R.finAssetRows.find(r=>r.lbl===k)){
        // 新しいキーが出てきたら過去分を0で埋めて追加
        R.finAssetRows.push({lbl:k,vals:new Array(i).fill(0),baseVals:new Array(i).fill(0),person:finRowPerson[k]||'both'});
      }
    });
    R.finAssetRows.forEach(row=>{
      row.vals.push(ri(finRowMap[row.lbl]||0));
      if(!row.baseVals)row.baseVals=new Array(row.vals.length-1).fill(0);
      row.baseVals.push(ri(finRowMapBase[row.lbl]||0));
    });
    const finAssetVal=Object.values(finRowMap).reduce((a,b)=>a+b,0);
    R.finAsset.push(ri(finAssetVal));
    R.totalAsset.push(R.sav[i]+ri(finAssetVal));// 預貯金残高＋その他金融資産
    // 下落シナリオなしの通常計算版（グラフ比較線用）
    const finAssetValBase=Object.values(finRowMapBase).reduce((a,b)=>a+b,0);
    R.finAssetBase.push(ri(finAssetValBase));
    R.totalAssetBase.push(R.sav[i]+ri(finAssetValBase));
    let lb=0,_lbH=0,_lbW=0;
    if(_flatPair){
      if(active){
        _lbH=_fhAmt>0&&lcYr<_fhYrs?ri(_fhType==='equal_payment'?lbal(_fhAmt,_fhYrs,effRate(lcYr,_flatRates),lcYr+1):lbal_gankin(_fhAmt,_fhYrs,lcYr+1)):0;
        _lbW=_fwAmt>0&&lcYr<_fwYrs?ri(_fwType==='equal_payment'?lbal(_fwAmt,_fwYrs,effRate(lcYr,_flatRates),lcYr+1):lbal_gankin(_fwAmt,_fwYrs,lcYr+1)):0;
      }else{_lbH=ri(_fhAmt);_lbW=ri(_fwAmt);}
      lb=ri(Math.max(0,_lbH+_lbW));
    }else if(pairLoanMode){
      if(active){
        _lbH=ri(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr+1):0);
        _lbW=ri(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr+1):0);
      }else{_lbH=ri(lhAmt);_lbW=ri(lwAmt);}
      lb=ri(Math.max(0,_lbH+_lbW));
    }else{
      lb=ri(active?Math.max(0,(eLoanType==='equal_payment'?lbal(loanAmt,eLoanYrs,effRate(lcYr,eRates),lcYr+1):lbal_gankin(loanAmt,eLoanYrs,lcYr+1))):loanAmt);
    }
    R.lBal.push(lb);R.lBalH.push(_lbH);R.lBalW.push(_lbW);

    // ─── イベント文字列 ───
    let evH='';
    if(hDeathAge>0&&ha===hDeathAge)evH='ご主人ご逝去';
    else if(hDeathAge>0&&ha>hDeathAge)evH='';
    else if(i===delivery&&delivery>0)evH='引き渡し';
    else if(ha===retAge)evH='退職';
    else if(ha===retPayAge&&retPayAge!==retAge)evH='退職金受取';
    else if(ha===pHReceive)evH='年金開始';
    // 収入段階の産休・育休（他イベントがない年のみ表示）
    if(!evH&&!(hDeathAge>0&&ha>hDeathAge)){
      const sl=_hStepLeaves.find(s=>ha===s.fromAge);
      if(sl)evH=sl.leaveType;
    }
    R.evH.push(evH);

    let evW='';
    const wLeave=leaves.find(l=>wa===l.startAge);
    const wLeaveEnd=leaves.find(l=>wa===l.endAge);
    if(wLeave){const lm={maternity:'産休',parental:'育休',reduced:'時短'};evW=lm[wLeave.type]+'開始';}
    else if(wLeaveEnd)evW='職場復帰';
    else if(wa===wRetAge)evW='退職';
    else if(wa===pWReceive)evW='年金開始';
    if(wDeathAge>0&&wa===wDeathAge)evW='奥様ご逝去';
    else if(wDeathAge>0&&wa>wDeathAge)evW='';
    // 収入段階の産休・育休（他イベントがない年のみ表示）
    if(!evW&&!(wDeathAge>0&&wa>wDeathAge)){
      const sl=_wStepLeaves.find(s=>wa===s.fromAge);
      if(sl)evW=sl.leaveType;
    }
    R.evW.push(evW);

    children.forEach((c,ci)=>{
      const ca=c.age+i;
      const cid=ci+1;
      const hoikuStartAge=parseInt(document.getElementById(`hoiku-start-${cid}`)?.value)||1;
      const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';
      const hoikuLabel=hoikuType==='youchien'?'幼稚園入園':'保育園入園';
      let ev='';
      if(ca===0)ev='誕生';
      else if(ca>=hoikuStartAge&&ca<=6)ev=ca===hoikuStartAge?hoikuLabel:'';
      else if(ca>=7&&ca<=12)ev=ca===7?'小学入学':'';
      else if(ca>=13&&ca<=15)ev=ca===13?'中学入学':'';
      else if(ca>=16&&ca<=18)ev=ca===16?'高校入学':'';
      else if(ca>=19){const un2=_v(`cu-${cid}`)||'plit_h';const ul2=(EDU.univ[un2]||[]).length;if(ul2>0&&ca<19+ul2)ev=ca===19?(un2.startsWith('senmon')?'専門入学':'大学入学'):'';}
      R.evC[ci].push(ev);
    });
  }

  // ─── cfOverrides後処理: サブ行上書きを合計・収支・残高に反映 ───
  if(Object.keys(cfOverrides).length>0||cfCustomRows.length>0){
    const incKeys=['hInc','wInc','dcTaxSavingH','dcTaxSavingW','otherInc','insMat','rPay','wRPay','pTotalH','pTotalW','scholarship','teate','lCtrl','dcReceiptH','dcReceiptW','idecoReceiptH','idecoReceiptW'];
    const expKeys=['lc','secInvest','secBuy','insMonthly','insLumpExp','rent','lRep','rep','ptx','furn','senyu','prk','carTotal','wedding','ext','dcMatchExpH','dcMatchExpW','idecoExpH','idecoExpW'];
    [...incKeys,...expKeys].forEach(key=>{
      if(!cfOverrides[key])return;
      Object.entries(cfOverrides[key]).forEach(([col,val])=>{
        const c2=parseInt(col);
        if(R[key]&&c2<R[key].length)R[key][c2]=val;
      });
    });
    children.forEach((_ch,ci)=>{
      const key='edu'+ci;
      if(!cfOverrides[key])return;
      Object.entries(cfOverrides[key]).forEach(([col,val])=>{
        const c2=parseInt(col);
        if(R.edu[ci]&&c2<R.edu[ci].length)R.edu[ci][c2]=val;
      });
    });
    if(R.secRedeemRows){
      R.secRedeemRows.forEach(row=>{
        if(!cfOverrides[row.key])return;
        Object.entries(cfOverrides[row.key]).forEach(([col,val])=>{row.vals[parseInt(col)]=val;});
      });
    }
    // 車両費の個別行（複数台）への上書きを反映 → R.carTotal を再計算してexpTに反映
    if(R.carRows&&R.carRows.length>0){
      R.carRows.forEach(row=>{
        if(!cfOverrides[row.key])return;
        Object.entries(cfOverrides[row.key]).forEach(([col,val])=>{row.vals[parseInt(col)]=val;});
      });
      if(R.carRows&&R.carRows.length>0){
        for(let i=0;i<R.carTotal.length;i++){
          let sum=0;
          R.carRows.forEach(row=>sum+=ri(row.vals[i]||0));
          R.carTotal[i]=sum;
        }
      }
    }
    let newSav=initSav;
    for(let i=0;i<R.incT.length;i++){
      if(cfOverrides['incT']?.[i]!==undefined){R.incT[i]=cfOverrides['incT'][i];}
      else{let t=incKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);if(R.secRedeemRows)R.secRedeemRows.forEach(row=>t+=(row.vals[i]||0));cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{t+=(cfOverrides[r.id]?.[i]||0);});R.incT[i]=t;}
      if(cfOverrides['expT']?.[i]!==undefined){R.expT[i]=cfOverrides['expT'][i];}
      else{let t=expKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);children.forEach((_ch,ci)=>t+=(R.edu[ci]?.[i]||0));cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{t+=(cfOverrides[r.id]?.[i]||0);});R.expT[i]=t;}
      R.bal[i]=R.incT[i]-R.expT[i];
      newSav+=R.bal[i]+(R.savExtra[i]||0);
      R.sav[i]=ri(newSav);
      R.totalAsset[i]=R.sav[i]+ri(R.finAsset[i]||0);
    }
  }

  // 遺族年金ボックス表示/非表示＋自動値スパン更新
  const survHBox=document.getElementById('surv-h-box');
  const survWBox=document.getElementById('surv-w-box');
  if(survHBox)survHBox.style.display=hDeathAge>0?'':'none';
  if(survWBox)survWBox.style.display=wDeathAge>0?'':'none';
  const survHSpan=document.getElementById('surv-h-auto-val');
  if(survHSpan&&hDeathAge>0){
    const i0=hDeathAge-hAge+1;
    const wa0=wAge+i0;
    const wAgeAtDeath0=wAge+(hDeathAge-hAge);
    let childUnder18=0;
    children.forEach(c=>{const ca=c.age+i0;if(ca>=0&&ca<=18)childUnder18++;});
    const kiso0=calcKiso(childUnder18);
    const hadChildren0=children.some(c=>c.age+(hDeathAge-hAge)<=18);
    const routeA0=wAgeAtDeath0>=40;const routeB0=hadChildren0&&wa0>=40;
    const chukorei0=(kiso0===0&&wa0>=40&&wa0<65&&(routeA0||routeB0))?ri(61.43):0;
    let autoH;
    if(wa0>=pWReceive){
      autoH=Math.max(ri(koseiH*0.75)-koseiW,0)+kiso0+chukorei0;
    }else{
      autoH=ri(koseiH*0.75)+kiso0+chukorei0;
    }
    // 30歳未満子なし妻の5年有期ルール注記
    const noChild0=!children.length&&!hadChildren0;
    const is5yr=noChild0&&wAgeAtDeath0<30;
    survHSpan.textContent=autoH.toLocaleString()+(is5yr?' (5年有期)':'');
  }
  const survWSpan=document.getElementById('surv-w-auto-val');
  if(survWSpan&&wDeathAge>0){
    const i0=wDeathAge-wAge+1;
    const ha0=hAge+i0;
    let childUnder18=0;
    children.forEach(c=>{const ca=c.age+i0;if(ca>=0&&ca<=18)childUnder18++;});
    const kiso0=calcKiso(childUnder18);
    const hIncome0=getIncomeAtAge(hSteps,ha0);
    let autoW;
    const hAgeAtWDeath=hAge+(wDeathAge-wAge); // 妻死亡時のご主人の年齢
    const hadChildAtWDeath=children.some(c=>c.age+(wDeathAge-wAge)<=18);
    if(childUnder18>0){
      autoW=ha0>=pHReceive?Math.max(ri(koseiW*0.75)-koseiH,0)+kiso0:ri(koseiW*0.75)+kiso0;
    }else if(hadChildAtWDeath||hAgeAtWDeath>=55){
      // 死亡時に子あり or 55歳以上→受給権あり
      const hInc0=getIncomeAtAge(hSteps,ha0);
      if(ha0>=60&&hInc0<850){
        autoW=ha0>=pHReceive?Math.max(ri(koseiW*0.75)-koseiH,0):ri(koseiW*0.75);
      }else{autoW=0;}
    }else{
      autoW=0; // 死亡時55歳未満・子なし→受給権なし
    }
    const noRightW=!hadChildAtWDeath&&hAgeAtWDeath<55&&!children.length;
    survWSpan.textContent=autoW.toLocaleString()+(noRightW?' (受給権なし)':'');
  }

  // Excel出力用にグローバル保存
  window.lastR=R; window.lastDisp=disp; window.lastCYear=cYear; window._purchaseInitSav=initSav;
  if(rTab==='cf')renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);
  else if(rTab==='graph')renderGraphs(R,disp,isM,totalYrs,hAge);
  else if((rTab==='mg-h'||rTab==='mg-w')&&window._mgStore){
    const key=rTab==='mg-h'?'h':'w';
    if(window._mgStore[key]){$('right-body').innerHTML=window._mgStore[key];}
    else{renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);rTab='cf';$('rt-cf')?.classList.add('on');}
  }else renderTable(R,totalYrs,disp,cLbls,cYear,effLoanAmt,isM,hAge,retAge,children,delivery);
}
