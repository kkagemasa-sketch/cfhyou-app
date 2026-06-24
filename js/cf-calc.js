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
  // 財形貯蓄は「その他金融資産」扱い（預貯金には含めない）
  // 頭金（自己資金）・諸費用（現金払い）・引越/家具費用は前提条件として初期残高から差し引く
  const downPay0=fv('down-payment')||0;
  const downDeduct=(downType==='own')?downPay0:0;
  const costType0=document.getElementById('cost-type')?.value||'cash';
  // 'cash'のときだけ現預金から差し引き（loan・other は外部資金扱い）
  const costDeduct=(costType0==='cash')?(fv('house-cost')||0):0;
  const _moveType0=document.getElementById('move-type')?.value||'own';
  const moveDeduct=(_moveType0==='other')?0:((fv('moving-cost')||0)+(fv('furniture-init')||0));
  // ★ 定期借地権付き物件：契約時の前払い地代を初期残高から差し引き
  const _leaseholdOn=!!document.getElementById('leasehold-on')?.checked;
  const _leaseholdMaeharai=_leaseholdOn?(fv('leasehold-maeharai')||0):0;
  const initSav=cashH+cashW+cashJoint-downDeduct-costDeduct-moveDeduct-_leaseholdMaeharai;
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
  // 繰上げ・繰下げ自動調整（デフォルトON。「自動調整しない」がチェックONのときだけ旧挙動）
  const pHNoAdjust = !!document.getElementById('pension-h-noadjust')?.checked;
  const pWNoAdjust = !!document.getElementById('pension-w-noadjust')?.checked;
  const _pAdjRate = (age)=>{
    if(typeof calcPensionAdjustRate==='function') return calcPensionAdjustRate(age);
    if(age<65) return 1 - 0.004*((65-age)*12);
    if(age>65) return 1 + 0.007*((age-65)*12);
    return 1;
  };
  const pHAdjRate = pHNoAdjust ? 1 : _pAdjRate(pHReceive);
  const pWAdjRate = pWNoAdjust ? 1 : _pAdjRate(pWReceive);
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
  // ★ 買い替えイベント（最大2回）
  const swapEvents = (typeof getSwapEvents==='function') ? getSwapEvents() : [];
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
    rent:[],houseCostArr:[],moveInCost:[],secInvest:[],secBuy:[],insMonthly:[],insLumpExp:[],carBuy:[],carInsp:[],carTotal:[],carBd:[],carRows:null,prk:[],wedding:[],ext:[],dcMatchExpH:[],dcMatchExpW:[],idecoExpH:[],idecoExpW:[],zaikeiExp:[],zaikeiRows:null,zaikeiRedeem:[],zaikeiRedeemRows:null,chidai:[],kaitai:[],
    // 買い替えイベント
    swapSell:[],swapTax:[],swapPayoff:[],swapBuy:[],
    expT:[],bal:[],sav:[],savExtra:[],lBal:[],lBalH:[],lBalW:[],finAsset:[],finAssetBase:[],finAssetRows:null,secRedeemRows:null,totalAsset:[],totalAssetBase:[],
    // 自動資産取崩し: 預貯金マイナス時に有価証券から自動取崩し
    // autoLiq: 当年取崩し総額の配列
    // autoLiqTax: 当年譲渡益課税の配列
    // autoLiqDetails[i] = {lbl: {gross, tax}} — 当年の各証券別取崩し内訳
    autoLiq:[],autoLiqTax:[],autoLiqDetails:[],
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
      const isMatLeave=!!document.getElementById(`${base}-matleave`)?.checked;
      if((leaveType||isMatLeave)&&fromAge>0)arr.push({fromAge,toAge,leaveType,isMatLeave});
    });
  });
  // 年度ごとの「育休フラグ」配列を R に追加（後でセルツールチップに利用）
  R.mlH=[]; R.mlW=[];

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
    // ★ C2修正(2026-06): _secBalByP/_secStkByP/_insLumpByP は line 403-405 で宣言されるため
    //   このブロック時点では TDZ。`_secBalByP && ...` でガードしても const TDZ は
    //   ReferenceError を投げるため、ここでは直接 document.querySelectorAll を使う
    //   （シナリオ事前計算ブロックは1回しか走らないので perf 影響は無視できる）。
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
  // 手取り計算機(calcTakeHomeBase)と同じ式を二分探索で逆算する（TAX表の補間を廃止）
  function _calcNetBreakdown(netInc, age, isSelfSingle, spouseNetInc, isHSide){
    if(netInc<=0)return null;
    const shakaiRate=calcShakaiRate(age);
    // 配偶者の額面を推定（配偶者控除判定用）
    // - 手取り103万以下: 扶養内パート想定で社保ゼロ → gross ≈ net
    // - 手取り103万超: 単身扱いで二分探索（isSelfSingle=true, spouseNetInc=0 で再帰停止）
    let spouseGrossEst = 0;
    if(spouseNetInc>0){
      if(spouseNetInc<=103){
        spouseGrossEst = spouseNetInc;
      } else {
        const _wBd = _calcNetBreakdown(spouseNetInc, age, true, 0, false);
        spouseGrossEst = _wBd ? _wBd.gross : Math.round(spouseNetInc*1.33);
      }
    }
    // 与えられた gross から内訳を計算する内部関数
    const _compute=(gross)=>{
      const shakai=Math.round(gross*shakaiRate*10)/10;
      const kyuyo=calcKyuyoDed(gross);
      const grossSyotoku=Math.max(0,gross-kyuyo);
      const [kisoIt,kisoJu]=calcKisoDed(grossSyotoku);
      let hasSpouseDed=false, spouseDedIt=0, spouseDedJu=0;
      if(!isSelfSingle&&isHSide){
        const sg = spouseNetInc>0 ? spouseGrossEst : 0;
        hasSpouseDed=canApplySpouseDed(gross,sg);
        spouseDedIt=hasSpouseDed?38:0;
        spouseDedJu=hasSpouseDed?33:0;
      }
      const taxableBase=Math.max(0,grossSyotoku-shakai-kisoIt);
      const taxable=Math.max(0,taxableBase-spouseDedIt);
      const itax=calcIncomeTax(taxable);
      const juminTaxable=Math.max(0,grossSyotoku-shakai-kisoJu-spouseDedJu);
      const jumin=calcJuminTax(juminTaxable);
      const netComputed=Math.round((gross-shakai-itax-jumin)*10)/10;
      return {gross, shakai, kyuyo, grossSyotoku, kisoIt, kisoJu,
              hasSpouseDed, spouseDedIt, spouseDedJu,
              taxableBase, taxable, itax, juminTaxable, jumin, netComputed};
    };
    // 二分探索: gross ∈ [netInc, netInc*2.5] で netComputed ≈ netInc を満たすgrossを求める
    let lo=netInc, hi=netInc*2.5;
    let mid=lo, br=_compute(lo);
    for(let iter=0;iter<60;iter++){
      mid=(lo+hi)/2;
      br=_compute(mid);
      const diff=br.netComputed - netInc;
      if(Math.abs(diff)<0.01) break;
      if(diff>0) hi=mid; else lo=mid;
    }
    // gross は0.1万円(=千円)単位に丸めて再計算（誤差最小化）
    const grossR=Math.round(mid*10)/10;
    br=_compute(grossR);
    return {
      net:netInc, gross:grossR, shakaiRate,
      shakai:br.shakai, kyuyo:br.kyuyo, grossSyotoku:br.grossSyotoku,
      kisoIt:br.kisoIt, kisoJu:br.kisoJu,
      hasSpouseDed:br.hasSpouseDed, spouseDedIt:br.spouseDedIt, spouseDedJu:br.spouseDedJu,
      taxableBase:br.taxableBase, taxable:br.taxable, itax:br.itax,
      juminTaxable:br.juminTaxable, jumin:br.jumin,
      netComputed:br.netComputed,
      age, isSingle:isSelfSingle, isHSide
    };
  }

  // ===== 年ループ前にDOMクエリをキャッシュ化（パフォーマンス改善） =====
  // 同一データの場合、ループ内で何度も querySelectorAll するのを避ける
  // 動作は完全に同じ（ループ中にDOMが変わらない前提）
  const _scAmtEls=Array.from(document.querySelectorAll('[id^="sc-amt-"]'));
  const _insMHEls=Array.from(document.querySelectorAll('[id^="ins-m-h-"]'));
  const _insMWEls=Array.from(document.querySelectorAll('[id^="ins-m-w-"]'));
  const _insLumpHEls=Array.from(document.querySelectorAll('[id^="ins-lump-enroll-h-"]'));
  const _insLumpWEls=Array.from(document.querySelectorAll('[id^="ins-lump-enroll-w-"]'));
  const _secBalHEls=Array.from(document.querySelectorAll('[id^="sec-bal-h-"]'));
  const _secBalWEls=Array.from(document.querySelectorAll('[id^="sec-bal-w-"]'));
  const _secStkHEls=Array.from(document.querySelectorAll('[id^="sec-stk-bal-h-"]'));
  const _secStkWEls=Array.from(document.querySelectorAll('[id^="sec-stk-bal-w-"]'));
  const _wedAmtEls=Array.from(document.querySelectorAll('[id^="wed-amt-"]'));
  const _repairEls=Array.from(document.querySelectorAll('#repair-cont>[id^="rep-"]'));
  const _carEls=Array.from(document.querySelectorAll('#car-list>[id^="car-"]'));
  const _ecarEls=Array.from(document.querySelectorAll('#existing-car-list>[id^="ecar-"]'));
  // 人別ヘルパー
  const _insMByP={h:_insMHEls,w:_insMWEls};
  const _insLumpByP={h:_insLumpHEls,w:_insLumpWEls};
  const _secBalByP={h:_secBalHEls,w:_secBalWEls};
  const _secStkByP={h:_secStkHEls,w:_secStkWEls};

  // ===== 自動資産取崩し: 預貯金マイナス時に有価証券から取崩し =====
  // デフォルトON（localStorage 'cf_auto_liq_off'='1' の場合のみ OFF）
  const _autoLiqEnabled = (()=>{try{return localStorage.getItem('cf_auto_liq_off')!=='1'}catch(e){return true}})();
  // 全有価証券のメタ情報を事前収集（年ループ内で参照、取崩し履歴を蓄積）
  const securityState = [];
  ['h','w'].forEach(p=>{
    const pBaseAge = p==='h'?hAge:wAge;
    const pLbl = p==='h'?'ご主人様':'奥様';
    // 積立型
    (_secBalByP[p]||[]).forEach(el=>{
      const sid=el.id.split('-').pop();
      const isAcc=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');
      if(!isAcc)return;
      const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on')||false;
      const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
      const lbl=customLabel||((isNisa?'NISA':'課税')+'積み立て('+pLbl+')');
      const bal=fv(`sec-bal-${p}-${sid}`)||0;
      const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
      if(bal<=0&&monthly<=0)return;
      securityState.push({
        sid, p, type:'accum', lbl, isNisa, baseAge:pBaseAge,
        bal, monthly,
        endAge:iv(`sec-end-${p}-${sid}`)||0,
        rate:fvd(`sec-rate-${p}-${sid}`,5)/100,
        redeemAge:iv(`sec-redeem-${p}-${sid}`)||0,
        basisInput:fv(`sec-basis-${p}-${sid}`)||0,
        liquidations:[]  // [{year, gross, tax, costReduced}]
      });
    });
    // 一括投資
    (_secStkByP[p]||[]).forEach(el=>{
      const sid=el.id.split('-').pop();
      const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');
      if(!isStock)return;
      const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on')||false;
      const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
      const lbl=customLabel||((isNisa?'NISA':'課税')+'一括投資('+pLbl+')');
      const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
      if(bal<=0)return;
      securityState.push({
        sid, p, type:'stock', lbl, isNisa, baseAge:pBaseAge,
        bal, monthly:0,
        rate:(fv(`sec-div-${p}-${sid}`)||0)/100,
        investAge:iv(`sec-stk-age-${p}-${sid}`)||0,
        redeemAge:iv(`sec-stk-redeem-${p}-${sid}`)||0,
        basisInput:fv(`sec-basis-${p}-${sid}`)||0,
        liquidations:[]
      });
    });
  });
  // ★ パフォーマンス改善: securityState を Map 化（O(1) 検索）
  //   年ループ内で多用される `securityState.find(...)` を高速化（O(N²) → O(N)）。
  //   キー: `${type}|${p}|${sid}` の文字列。
  const _secStateMap = new Map();
  securityState.forEach(s=>_secStateMap.set(`${s.type}|${s.p}|${s.sid}`, s));
  // 取崩し優先順位（デフォルト: 課税口座 → NISA口座）
  // 将来のUI拡張用にlocalStorageから優先順位を読み込み（priorityKey: sid-p）
  // この実装では未使用、defaultはfilter()で課税/NISA分け
  // 年iにおける生(raw)将来価値（クローズドフォーム）
  function _rawFV(s,i){
    const pAge = (s.p==='h'?hAge:wAge)+i;
    if(s.redeemAge>0 && pAge>=s.redeemAge)return 0;
    if(s.type==='accum'){
      const yrs=i+1;
      const mr=s.rate/12;
      if(s.endAge===0||pAge<=s.endAge){
        const cpd=Math.pow(1+mr,12*yrs);
        return s.bal*cpd + (mr>0?s.monthly*(cpd-1)/mr:s.monthly*12*yrs);
      } else {
        const yrsAccum=s.endAge-s.baseAge+1;
        const yrsAfter=yrs-yrsAccum;
        const cpdA=Math.pow(1+mr,12*yrsAccum);
        return (s.bal*cpdA + (mr>0?s.monthly*(cpdA-1)/mr:s.monthly*12*yrsAccum))*Math.pow(1+mr,12*Math.max(0,yrsAfter));
      }
    } else {
      if(s.investAge>0 && pAge<s.investAge)return 0;
      const yrsHeld=s.investAge>0?(pAge-s.investAge):(i+1);
      return s.bal*Math.pow(1+s.rate,Math.max(0,yrsHeld));
    }
  }
  // 年iにおける有効残高（過去の取崩しを差し引き、複利成長分も含む）
  function _effFV(s,i,includeCurrentYear){
    let raw=_rawFV(s,i);
    let reduction=0;
    for(const liq of s.liquidations){
      const cmp = includeCurrentYear ? (liq.year<=i) : (liq.year<i);
      if(cmp) reduction += liq.gross*Math.pow(1+s.rate,i-liq.year);
    }
    return Math.max(0,raw-reduction);
  }
  // 年iにおける取得原価（過去の取崩しによる原価減少を差し引き）
  function _effCost(s,i){
    const pAge=(s.p==='h'?hAge:wAge)+i;
    let cost;
    if(s.type==='accum'){
      const effYrs=(s.endAge>0&&pAge>s.endAge)?(s.endAge-s.baseAge+1):(i+1);
      cost = (s.basisInput>0?s.basisInput:s.bal) + s.monthly*12*Math.max(0,effYrs);
    } else {
      cost = s.basisInput>0?s.basisInput:s.bal;
    }
    for(const liq of s.liquidations){
      if(liq.year<i) cost -= liq.costReduced;
    }
    return Math.max(0,cost);
  }
  // DC/iDeCo受取の事前計算（auto-liq判定で使用）
  // 当年のDC/iDeCo受取金額を、本来のfinAsset計算前にプレ計算する
  // これにより、退職時の一時金などが反映され、不要な自動取崩しが回避される
  function _peekDcIdecoReceipts(yearIdx){
    let total=0;
    ['h','w'].forEach(p=>{
      const d=dcIdeco[p];
      if(!d)return;
      const ha_y=hAge+yearIdx, wa_y=wAge+yearIdx;
      const pAge=p==='h'?ha_y:wa_y;
      const pBaseAge=p==='h'?hAge:wAge;
      const totalMonthly=d.employer+d.matching;
      const hasDC=totalMonthly>0||d.dcInitBal>0;
      const hasIdeco=d.idecoMonthly>0||d.idecoInitBal>0;
      if(!hasDC&&!hasIdeco)return;
      const _aliveForDC=(p==='h')?(hDeathAge===0||ha_y<=hDeathAge):(wDeathAge===0||wa_y<=wDeathAge);
      if(!_aliveForDC)return;
      if(pAge<d.receiveAge)return;  // まだ受取開始前
      const _fvWithInit=(initBal,monthly,rate,yrs)=>{
        const mr=rate/12;
        const cpd=mr>0?Math.pow(1+mr,12*yrs):1;
        const grow=initBal*cpd;
        const contrib=monthly>0?(mr>0?monthly*(cpd-1)/mr:monthly*12*yrs):0;
        return grow+contrib;
      };
      const yrsToReceive=d.receiveAge-pBaseAge;
      let _dcBalAtR=0, _idecoBalAtR=0;
      if(hasDC){
        const yrsContrib=Math.min(d.retAge-pBaseAge, yrsToReceive);
        const rate=d.dcRate;
        const balAtEnd=_fvWithInit(d.dcInitBal,totalMonthly,rate,yrsContrib);
        _dcBalAtR=balAtEnd*(rate>0?Math.pow(1+rate/12,12*Math.max(0,yrsToReceive-yrsContrib)):1);
      }
      if(hasIdeco){
        const yrsContrib=Math.min(d.retAge-pBaseAge, yrsToReceive);
        const rate=d.idecoRate;
        const balAtEnd=_fvWithInit(d.idecoInitBal,d.idecoMonthly,rate,yrsContrib);
        _idecoBalAtR=balAtEnd*(rate>0?Math.pow(1+rate/12,12*Math.max(0,yrsToReceive-yrsContrib)):1);
      }
      const dcKinzoku=Math.max(1,d.retAge-(p==='h'?pHStart:pWStart));
      const _parseAY=(m)=>{const mt=String(m||'').match(/(annuity|combo)(\d+)?/);return mt&&mt[2]?parseInt(mt[2]):20;};
      const annuityYears=_parseAY(d.method);
      const isLump=d.method==='lump';
      const isAnnuity=/^annuity/.test(d.method||'');
      const isCombo=/^combo/.test(d.method||'');
      // DC
      if(Math.round(_dcBalAtR)>0){
        const br=Math.round(_dcBalAtR);
        if(isLump){
          if(pAge===d.receiveAge) total += (typeof calcTaishokuNet==='function'?calcTaishokuNet(br,dcKinzoku):br);
        } else if(isAnnuity){
          if(pAge<d.receiveAge+annuityYears) total += Math.round(br/annuityYears);
        } else if(isCombo){
          const half=Math.round(br/2);
          if(pAge===d.receiveAge) total += (typeof calcTaishokuNet==='function'?calcTaishokuNet(half,dcKinzoku):half);
          if(pAge<d.receiveAge+annuityYears) total += Math.round(half/annuityYears);
        }
      }
      // iDeCo
      if(Math.round(_idecoBalAtR)>0){
        const br=Math.round(_idecoBalAtR);
        if(isLump){
          if(pAge===d.receiveAge) total += (typeof calcTaishokuNet==='function'?calcTaishokuNet(br,dcKinzoku):br);
        } else if(isAnnuity){
          if(pAge<d.receiveAge+annuityYears) total += Math.round(br/annuityYears);
        } else if(isCombo){
          const half=Math.round(br/2);
          if(pAge===d.receiveAge) total += (typeof calcTaishokuNet==='function'?calcTaishokuNet(half,dcKinzoku):half);
          if(pAge<d.receiveAge+annuityYears) total += Math.round(half/annuityYears);
        }
      }
    });
    return total;
  }

  // 自動取崩し実行：shortfallネット円を確保するため、優先順位順に取崩し
  // 戻り値: {gross:総取崩し額, tax:税額合計, byLbl:{lbl→gross/tax}}
  function _autoLiquidate(shortfall, year){
    if(shortfall<=0) return {gross:0,tax:0,byLbl:{}};
    let totalGross=0, totalTax=0;
    const byLbl={};
    // 優先順位グループ: 課税口座 → NISA口座（H/W問わず比例配分）
    const groups = [
      securityState.filter(s=>!s.isNisa),
      securityState.filter(s=>s.isNisa)
    ];
    for(const group of groups){
      if(shortfall<=0.01) break;
      const eligibles = group.map(s=>{
        const eff=_effFV(s,year,false);  // 当年の取崩しは含まない（これから取崩し）
        const cost=_effCost(s,year);
        const gainRatio = eff>0 ? Math.max(0,(eff-cost)/eff) : 0;
        const taxRate = s.isNisa ? 0 : gainRatio*0.20315;
        return {s,eff,cost,taxRate};
      }).filter(x=>x.eff>0);
      if(eligibles.length===0)continue;
      // 比例配分: take_i = eff_i × ratio （ratio共通）
      // sum(net_i) = sum(take_i × (1-taxRate_i)) = ratio × sum(eff_i × (1-taxRate_i)) = shortfall
      const weightedNetMax = eligibles.reduce((s,x)=>s+x.eff*(1-x.taxRate),0);
      if(weightedNetMax<=0)continue;
      const ratio = Math.min(1, shortfall/weightedNetMax);
      let groupNet=0;
      eligibles.forEach(x=>{
        const take = x.eff*ratio;
        if(take<=0.01)return;
        const tax = take*x.taxRate;
        const net = take-tax;
        const costReduced = x.eff>0 ? x.cost*take/x.eff : 0;
        x.s.liquidations.push({year, gross:take, tax, costReduced});
        totalGross += take;
        totalTax += tax;
        groupNet += net;
        byLbl[x.s.lbl] = byLbl[x.s.lbl] || {gross:0, tax:0};
        byLbl[x.s.lbl].gross += take;
        byLbl[x.s.lbl].tax += tax;
      });
      shortfall -= groupNet;
    }
    return {gross:totalGross, tax:totalTax, byLbl};
  }

  // ★ パフォーマンス改善: Rows 配列を年ループで毎年 find する代わりに
  //   ローカル Map で O(1) 検索する。push と同時に Map にも set する。
  //   keyMap_xxx: row.key → row オブジェクトへの参照
  const _secRedeemKeyMap = new Map();
  const _secInvestKeyMap = new Map();
  const _zaikeiKeyMap = new Map();
  const _zaikeiRedeemKeyMap = new Map();
  const _carKeyMap = new Map();
  const _insMonthlyKeyMap = new Map();
  const _insLumpExpKeyMap = new Map();
  const _finAssetLblMap = new Map();

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
    (_scAmtEls||document.querySelectorAll('[id^="sc-amt-"]')).forEach(el=>{
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
      const pLabel=p==='h'?'ご主人様':'奥様';
      // 積み立て保険：満期受取（早期解約がない場合のみ）
      (_insMByP&&_insMByP[p]||document.querySelectorAll(`[id^="ins-m-${p}-"]`)).forEach(el=>{
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
      (_insLumpByP&&_insLumpByP[p]||document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`)).forEach(el=>{
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
    const _pSVal=(ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge))?ri(pSelf*pHAdjRate):0;
    const _pWVal=(!_isSingle&&wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge))?ri(pWife*pWAdjRate):0;
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
      remainBal: 0, balCap: lctrlLimit*((pairLoanMode||_flatPair||jointLoanMode)?2:1),
      pairMode: pairLoanMode||_flatPair||jointLoanMode,
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
      // _calcNetBreakdown の二分探索を再利用して TAX 表の線形補間を廃止
      // 育休年は給付金が主体で非課税扱い→所得税0として住宅ローン控除を計算
      // ★ R.mlH/mlW.push はループ後半（line 2099/2117）で実行されるため、
      //   ここでは _hStepLeaves/_wStepLeaves から直接判定する必要がある
      const _hMatLeave = _hStepLeaves.some(s=>s.isMatLeave&&ha>=s.fromAge&&ha<=s.toAge);
      const _wMatLeaveForSpouse = _wStepLeaves.some(s=>s.isMatLeave&&wa>=s.fromAge&&wa<=s.toAge);
      const grossInc=(hInc>0 && !_hMatLeave)?hInc:0;
      const spouseIncForCalc = (wInc>0 && !_wMatLeaveForSpouse) ? wInc : 0;
      const _hLctrlBd = _calcNetBreakdown(grossInc, ha, _isSingle, spouseIncForCalc, true);
      let itax=0, jumin=0, taxableBase=0, grossEst=0;
      if(_hLctrlBd){
        grossEst=_hLctrlBd.gross;
        itax=_hLctrlBd.itax;
        jumin=_hLctrlBd.jumin;
        taxableBase=_hLctrlBd.taxableBase;
      }
      // 住民税控除上限＝課税総所得金額等×5%（上限JUMIN_CTRL_MAX）
      // ★ バグ修正(v525): 基準は「所得税の課税総所得金額等」＝配偶者控除を引いた後の taxable。
      //   旧コードは配偶者控除前の taxableBase を使っており、住民税控除上限が過大になり
      //   「住民税控除＞所得税」という制度上ありえない結果が出ていた（所得税 ≧ 住民税控除上限 が法令上常に成立）。
      const _capBaseH = _hLctrlBd ? _hLctrlBd.taxable : 0;
      const juminCtrlMax=Math.min(Math.round(_capBaseH*0.05*10)/10, JUMIN_CTRL_MAX);
      const taxCapTotal=Math.round((itax+juminCtrlMax)*10)/10;
      lc2=Math.round(Math.min(calcCtrl, taxCapTotal)*10)/10;
      lc2=Math.max(0,lc2);
      // breakdown 更新
      _lctrlBd.remainBal=remainBal;
      _lctrlBd.calcAmount=calcCtrl;
      _lctrlBd.grossEst=grossEst;
      _lctrlBd.taxableBase=taxableBase;
      _lctrlBd.itax=itax;
      _lctrlBd.jumin=jumin;  // 本来の住民税額（参考値・控除上限の根拠を可視化するため）
      _lctrlBd.juminCtrlMax=juminCtrlMax;
      _lctrlBd.taxCapTotal=taxCapTotal;
      _lctrlBd.hMatLeave=!!_hMatLeave;  // ご主人の当年が育休フラグ（説明モーダル用）
      // ペアローン時は奥様側の税額情報も追加
      if((pairLoanMode||_flatPair)&&!_isSingle){
        // 奥様の手取りから額面を二分探索で逆算（ペアローン共働き想定で配偶者控除なし＝isHSide=false, 単身扱い）
        // 育休年は給付金が主体で非課税扱い→所得税0として住宅ローン控除を計算
        // ★ R.mlW.push はループ後半（line 2117）で実行されるため _wStepLeaves から直接判定
        const _wMatLeave = _wStepLeaves.some(s=>s.isMatLeave&&wa>=s.fromAge&&wa<=s.toAge);
        const wGrossInc=(wInc>0 && !_wMatLeave)?wInc:0;
        const _wLctrlBd = _calcNetBreakdown(wGrossInc, wa, true, 0, false);
        let wItax=0, wJumin=0, wTaxableBase=0, wGrossEst=0;
        if(_wLctrlBd){
          wGrossEst=_wLctrlBd.gross;
          wItax=_wLctrlBd.itax;
          wJumin=_wLctrlBd.jumin;
          wTaxableBase=_wLctrlBd.taxableBase;
        }
        // ★ バグ修正(v525): 住民税控除上限の基準は配偶者控除後の taxable
        const _wCapBase = _wLctrlBd ? _wLctrlBd.taxable : 0;
        const wJuminCtrlMax=Math.min(Math.round(_wCapBase*0.05*10)/10, JUMIN_CTRL_MAX);
        const wTaxCapTotal=Math.round((wItax+wJuminCtrlMax)*10)/10;
        _lctrlBd.wGrossEst=wGrossEst;
        _lctrlBd.wTaxableBase=wTaxableBase;
        _lctrlBd.wItax=wItax;
        _lctrlBd.wJumin=wJumin;  // 本来の住民税額（参考値）
        _lctrlBd.wJuminCtrlMax=wJuminCtrlMax;
        _lctrlBd.wTaxCapTotal=wTaxCapTotal;
        _lctrlBd.wMatLeave=!!_wMatLeave;  // 奥様の当年が育休フラグ（説明モーダル用）
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
      // 連帯債務モード：借入は1本(remainBalは単独ローンと同じ)。持分按分で住宅ローン控除を分割
      else if(jointLoanMode&&!_isSingle){
        const hShare=fv('joint-share-h')||0;
        const wShare=fv('joint-share-w')||0;
        const totalShare=hShare+wShare;
        if(totalShare>0){
          // 残高を持分按分
          const hShareBal=remainBal*(hShare/totalShare);
          const wShareBal=remainBal*(wShare/totalShare);
          // 奥様の額面・税額を二分探索で逆算
          // 育休年は給付金が主体で非課税扱い→所得税0として住宅ローン控除を計算
          // ★ R.mlW.push はループ後半で実行されるため _wStepLeaves から直接判定
          const _wJointMatLeave = _wStepLeaves.some(s=>s.isMatLeave&&wa>=s.fromAge&&wa<=s.toAge);
          const wGrossInc=(wInc>0 && !_wJointMatLeave)?wInc:0;
          const _wJointBd=_calcNetBreakdown(wGrossInc, wa, true, 0, false);
          let wItax=0, wTaxableBase=0, wGrossEst=0;
          if(_wJointBd){
            wGrossEst=_wJointBd.gross;
            wItax=_wJointBd.itax;
            wTaxableBase=_wJointBd.taxableBase;
          }
          // ★ バグ修正(v525): 住民税控除上限の基準は配偶者控除後の taxable
          const _wjCapBase = _wJointBd ? _wJointBd.taxable : 0;
          const wJuminCtrlMax=Math.min(Math.round(_wjCapBase*0.05*10)/10, JUMIN_CTRL_MAX);
          const wTaxCapTotal=Math.round((wItax+wJuminCtrlMax)*10)/10;
          // 各自の計算上の控除額（持分残高 × 0.7%、単独ローン上限で頭打ち）
          const hCalcAmt=Math.round(Math.min(hShareBal, lctrlLimit)*0.007*10)/10;
          const wCalcAmt=Math.round(Math.min(wShareBal, lctrlLimit)*0.007*10)/10;
          // 各自の税額上限で頭打ち
          const hApplied=Math.max(0, Math.round(Math.min(hCalcAmt, taxCapTotal)*10)/10);
          const wApplied=Math.max(0, Math.round(Math.min(wCalcAmt, wTaxCapTotal)*10)/10);
          // 合算をlc2として採用
          lc2=Math.round((hApplied+wApplied)*10)/10;
          lc2=Math.max(0, lc2);
          // breakdown 保存
          _lctrlBd.jointMode=true;
          _lctrlBd.hShare=hShare; _lctrlBd.wShare=wShare;
          _lctrlBd.hBal=Math.round(hShareBal); _lctrlBd.wBal=Math.round(wShareBal);
          _lctrlBd.hCalcAmount=hCalcAmt; _lctrlBd.wCalcAmount=wCalcAmt;
          _lctrlBd.hApplied=hApplied; _lctrlBd.wApplied=wApplied;
          _lctrlBd.wGrossEst=wGrossEst; _lctrlBd.wTaxableBase=wTaxableBase;
          _lctrlBd.wItax=wItax; _lctrlBd.wJuminCtrlMax=wJuminCtrlMax; _lctrlBd.wTaxCapTotal=wTaxCapTotal;
        }
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
      remainBal:0, balCap:lctrlLimit*((pairLoanMode||_flatPair||jointLoanMode)?2:1),
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
      // ★ パフォーマンス改善 #1: securityState から事前キャッシュした値を使い、
      //   年ループ内での fv/iv/document.getElementById の呼び出しを大幅削減
      (_secBalByP&&_secBalByP[p]||document.querySelectorAll(`[id^="sec-bal-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const _s = _secStateMap.get(`accum|${p}|${sid}`);
        if(!_s) return; // 積立OFF or bal+monthly=0 のレコードはスキップ
        const redeemAge=_s.redeemAge;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=_s.bal;
        const monthly=_s.monthly;
        const endAge=_s.endAge;
        const rate=_s.rate;
        const yrs=i+1;
        // シナリオ適用時はシリーズキャッシュの解約年の値を使う
        const _redeemSecKey=`sec-accum-${p}-${sid}`;
        const _redeemSeries=_accumSeriesCache[_redeemSecKey];
        let fv2=0;
        if(_redeemSeries){
          fv2 = _redeemSeries[i]||0;
        } else if(endAge===0||pAge<=endAge){
          // 野村シミュレーター準拠: 月利 r/12, 月末払い
          // endAge は inclusive（=その年齢まで積立継続）
          const mr=rate/12;
          const cpd=Math.pow(1+mr,12*yrs);
          const balGrow=bal*cpd;
          const accumFV=mr>0?monthly*(cpd-1)/mr:monthly*12*yrs;
          fv2=Math.round(balGrow+accumFV);
        } else {
          const mr=rate/12;
          const yrsAccum=endAge-pBaseAge+1;  // inclusive: endAgeの年も積立
          const yrsAfter=yrs-yrsAccum;
          const cpdA=Math.pow(1+mr,12*yrsAccum);
          const balAtEnd=bal*cpdA;
          const accumAtEnd=mr>0?monthly*(cpdA-1)/mr:monthly*12*yrsAccum;
          fv2=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+mr,12*Math.max(0,yrsAfter)));
        }
        // ★ #1: customLabel と isNisa は securityState に cache 済みでないため
        //   引き続き DOM 読みするが、isNisa はキャッシュ可能
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=_s.isNisa;
        // ── 自動取崩しによる減額（過去の取崩しを複利成長分も含めて差し引き） ──
        // securityStateの該当エントリーから過去の取崩し履歴を取得
        const _redeemMatchAcc = _s;
        let _redeemLiqReductionAcc = 0;
        let _redeemCostReductionAcc = 0;
        if(_redeemMatchAcc){
          for(const liq of _redeemMatchAcc.liquidations){
            if(liq.year < i){
              _redeemLiqReductionAcc += liq.gross*Math.pow(1+_redeemMatchAcc.rate, i-liq.year);
              _redeemCostReductionAcc += liq.costReduced;
            }
          }
          fv2 = Math.max(0, fv2 - Math.round(_redeemLiqReductionAcc));
        }
        // 課税口座：譲渡益課税 20.315%（所得税15%+住民税5%+復興特別所得税0.315%）
        // 取得原価は「取得価格累計(basis)」が入力されていればそれを使用、なければ現在評価額(bal)で近似
        const basis=_s.basisInput;
        const initialCost=basis>0?basis:bal;
        const costAccumRaw=initialCost+monthly*12*(endAge>0&&pAge>endAge?(endAge-pBaseAge+1):yrs);
        // 自動取崩しで減少した取得原価を反映
        const costAccum=Math.max(0, costAccumRaw - _redeemCostReductionAcc);
        const gainAccum=Math.max(0,fv2-costAccum);
        let netAccum=fv2, taxAccum=0;
        if(!isNisa){
          taxAccum=Math.round(gainAccum*0.20315*10)/10;
          netAccum=Math.round(fv2-taxAccum);
        }
        const _pLblR=p==='h'?'ご主人様':'奥様';
        const lbl=customLabel||`${isNisa?'積立NISA':'課税積立'}解約(${_pLblR})`;
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
      // ★ パフォーマンス改善 #1: securityState から事前キャッシュした値を使う
      (_secStkByP&&_secStkByP[p]||document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const _s = _secStateMap.get(`stock|${p}|${sid}`);
        if(!_s) return; // 一括投資OFF or bal=0
        const redeemAge=_s.redeemAge;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=_s.bal;
        const investAge=_s.investAge||0;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        const rate=_s.rate;
        // シナリオ適用時はシリーズキャッシュの解約年の値を使う
        const _redeemStkKey=`sec-stk-${p}-${sid}`;
        const _redeemStkSeries=_stkSeriesCache[_redeemStkKey];
        let redeemVal = _redeemStkSeries ? (_redeemStkSeries[i]||0) : Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=_s.isNisa;
        // ── 自動取崩しによる減額（過去の取崩しを複利成長分も含めて差し引き） ──
        const _redeemMatchStk = _s;
        let _redeemCostReductionStk = 0;
        if(_redeemMatchStk){
          let _redeemLiqReductionStk = 0;
          for(const liq of _redeemMatchStk.liquidations){
            if(liq.year < i){
              _redeemLiqReductionStk += liq.gross*Math.pow(1+_redeemMatchStk.rate, i-liq.year);
              _redeemCostReductionStk += liq.costReduced;
            }
          }
          redeemVal = Math.max(0, redeemVal - Math.round(_redeemLiqReductionStk));
        }
        // 取得原価: basisが入力されていればそれを、なければ初期評価額bal
        // ★ #1: basis も securityState にキャッシュ済み
        const _stkBasis = _s.basisInput;
        const _stkCostBase = _stkBasis>0 ? _stkBasis : bal;
        // 自動取崩しで減少した取得原価を反映
        const _stkCostAdjusted = Math.max(0, _stkCostBase - _redeemCostReductionStk);
        // 課税口座：譲渡益課税 20.315%
        const gainStk=Math.max(0,redeemVal-_stkCostAdjusted);
        let netStk=redeemVal, taxStk=0;
        if(!isNisa){
          taxStk=Math.round(gainStk*0.20315*10)/10;
          netStk=Math.round(redeemVal-taxStk);
        }
        const _pLblS=p==='h'?'ご主人様':'奥様';
        const lbl=customLabel||`${isNisa?'NISA':'課税'}一括投資解約(${_pLblS})`;
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
      // 積立保険の解約／満期受取（個別行として secRedeemRows に追加）
      (_insMByP&&_insMByP[p]||document.querySelectorAll(`[id^="ins-m-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        if(redeemAge<=0||pAge!==redeemAge)return;
        const monthly=fv(`ins-m-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        const redeemAmt=fv(`ins-redeem-amt-${p}-${iid}`)||0;
        let insRedeemVal=0;
        if(pAge>=matAge&&matAmt>0){insRedeemVal=matAmt;}
        else if(redeemAmt>0){insRedeemVal=redeemAmt;}
        else if(matAge>0&&monthly>0){
          const enrollAge=iv(`ins-enroll-${p}-${iid}`)||pBaseAge;
          const totalPayYrs=matAge-enrollAge;
          const paidYrs2=Math.min(redeemAge-enrollAge,totalPayYrs);
          const cumPay=monthly*12*Math.max(0,paidYrs2);
          const ratio=totalPayYrs>0?paidYrs2/totalPayYrs:0;
          const surrenderCharge=Math.max(0,0.3*(1-ratio));
          insRedeemVal=Math.round(cumPay*(1-surrenderCharge)+matAmt*ratio*ratio);
        }
        if(insRedeemVal<=0)return;
        secRedeemTotal+=insRedeemVal;
        const customLbl=document.getElementById(`ins-label-${p}-${iid}`)?.value?.trim()||'';
        const pLabel=p==='h'?'ご主人様':'奥様';
        const lbl=customLbl||`積立保険 解約(${pLabel})`;
        const _insKey=`ins-${p}-${iid}`;
        secRedeemMap[_insKey]={lbl,val:insRedeemVal};
      });
    });
    // per-security 行を追跡（finAssetRows と同パターン）
    Object.keys(secRedeemMap).forEach(k=>{
      if(!_secRedeemKeyMap.has(k)){
        const row={key:k,lbl:secRedeemMap[k].lbl,vals:new Array(i).fill(0)};
        R.secRedeemRows.push(row);
        _secRedeemKeyMap.set(k,row);
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
      // ★ パフォーマンス改善 #1: securityState のキャッシュ値を使う
      (_secBalByP&&_secBalByP[p]||document.querySelectorAll(`[id^="sec-bal-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const _s = _secStateMap.get(`accum|${p}|${sid}`);
        if(!_s) return; // 積立OFF or bal+monthly=0
        const monthly=_s.monthly;
        if(monthly<=0)return;
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const rowKey=`secInv-${p}-${sid}`;
        const isNisa=_s.isNisa;
        const lbl=customLabel||`${isNisa?'積立NISA':'積立投資'}(${pLabel})`;
        const endAge=_s.endAge;
        const redeemAge=_s.redeemAge;
        const isActive=(endAge===0||pAge<endAge)&&(redeemAge===0||pAge<redeemAge);
        const v=isActive?ri(monthly*12):0;
        let row=_secInvestKeyMap.get(rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.secInvestRows.push(row);_secInvestKeyMap.set(rowKey,row);}
        row.vals.push(v);
        secInvestTotal+=v;
      });
    });
    R.secInvest.push(ri(secInvestTotal));
    // ─── 財形貯蓄積立額（支出計上・個別行） ───
    // 手取年収は財形天引き前の額面なので、財形積立を支出に計上することで
    // 預貯金から差し引かれて財形その他金融資産へ移動する流れが表現される。
    if(!R.zaikeiRows)R.zaikeiRows=[];
    if(!R.zaikeiRedeemRows)R.zaikeiRedeemRows=[];
    let zaikeiExpTotal=0;
    let zaikeiRedeemTotal=0;
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      const pLabel=p==='h'?'ご主人様':'奥様';
      const pRetAge=p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60);
      const zbal=fv(`zaikei-${p}-bal`)||0;
      const zm=fv(`zaikei-${p}-monthly`)||0;
      const ze=iv(`zaikei-${p}-end`)||0;
      const zr=iv(`zaikei-${p}-redeem`)||0;
      if(zbal<=0&&zm<=0)return;
      // 積立終了年齢（未入力なら定年）／解約年齢（未入力なら積立終了と同時）
      const _zEnd=ze>0?ze:pRetAge;
      const _zRedeemAge=zr>0?zr:_zEnd;
      // 解約年齢 < 積立終了年齢 のときは解約年齢で積立も打ち切り
      const _zStopContribAge=Math.min(_zEnd,_zRedeemAge);
      const isActiveZ=pAge<_zStopContribAge;
      const vZ=isActiveZ?ri(zm*12):0;
      // 支出行（積立）
      const rowKeyZ=`zaikei-${p}`;
      let rowZ=_zaikeiKeyMap.get(rowKeyZ);
      if(!rowZ){rowZ={lbl:`財形積立(${pLabel})`,vals:[],key:rowKeyZ};R.zaikeiRows.push(rowZ);_zaikeiKeyMap.set(rowKeyZ,rowZ);}
      rowZ.vals.push(vZ);
      zaikeiExpTotal+=vZ;
      // 解約処理：解約年齢に到達した年に累計残高を全額収入計上
      const rowKeyZR=`zaikeiRedeem-${p}`;
      let rowZR=_zaikeiRedeemKeyMap.get(rowKeyZR);
      if(!rowZR){rowZR={lbl:`財形解約(${pLabel})`,vals:[],key:rowKeyZR};R.zaikeiRedeemRows.push(rowZR);_zaikeiRedeemKeyMap.set(rowKeyZR,rowZR);}
      let vZR=0;
      if(pAge===_zRedeemAge){
        // 解約時点までの拠出年数（解約年齢が積立終了より前なら短くなる）
        const _contribYrsR=Math.max(0,_zStopContribAge-pBaseAge);
        vZR=Math.round(zbal+zm*12*_contribYrsR);
      }
      rowZR.vals.push(vZR);
      zaikeiRedeemTotal+=vZR;
    });
    R.zaikeiExp.push(ri(zaikeiExpTotal));
    R.zaikeiRedeem.push(ri(zaikeiRedeemTotal));
    // 解約金は初回計算の R.incT[i] に後から加算（順序の都合：incT.push は line 1217）
    if(zaikeiRedeemTotal>0)R.incT[i]=ri((R.incT[i]||0)+zaikeiRedeemTotal);
    // ─── 一括投資購入額（投資開始年齢に支出計上）───
    let secBuyTotal=0;
    // ★ パフォーマンス改善 #1: securityState のキャッシュ値を使う
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      (_secStkByP&&_secStkByP[p]||document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const _s = _secStateMap.get(`stock|${p}|${sid}`);
        if(!_s) return;
        const investAge=_s.investAge||0;
        if(investAge<=0||pAge!==investAge)return;
        secBuyTotal+=_s.bal;
      });
    });
    R.secBuy.push(ri(secBuyTotal));
    // ─── 家賃（引き渡し前）───
    const rentMonthly=fv('rent-before')/10000;
    const rentAmt=(!active&&delivery>0)?ri(rentMonthly*12):0;
    R.rent.push(rentAmt);

    // ─── 定期借地権付き物件：地代・解体準備金（住宅取得後〜借地期間中のみ計上） ───
    let _chidaiYr=0, _kaitaiYr=0;
    if(_leaseholdOn && active){
      // 引き渡し（active）後に計上開始
      const _leaseYrs=iv('leasehold-years')||0;
      // ★ B1修正: lcYr は既に (i-delivery) なので、さらに -delivery を引くと
      //   i - 2*delivery + 1 という意味不明な値になり、借地期間判定が誤動作していた。
      //   正しくは lcYr+1（引き渡し年=1年目）。
      const _yrsSinceDelivery=lcYr+1;
      const _withinLease = _leaseYrs<=0 || _yrsSinceDelivery<=_leaseYrs;
      if(_withinLease){
        // 円/月入力 → 万円/年に換算（CF表は万円単位）
        const chidaiMon=fv('leasehold-chidai')||0;  // 円/月
        const kaitaiMon=fv('leasehold-kaitai')||0;  // 円/月
        _chidaiYr=ri(chidaiMon*12/10000);  // 万円/年
        _kaitaiYr=ri(kaitaiMon*12/10000);
      }
    }
    R.chidai.push(_chidaiYr);
    R.kaitai.push(_kaitaiYr);

    // ─── 買い替えイベント判定 ───
    // この年に発生する買い替えと、過去に発生して現在「アクティブ」な買い替えを判定
    const _swapAtThisYear = swapEvents.find(sw=>sw.age===ha);
    // 過去に発生した最新の買い替え（現在のローン・新居の状態を決める）
    let _activeSwap = null;
    swapEvents.forEach(sw=>{ if(sw.age>0 && sw.age<=ha) _activeSwap=sw; });
    const _useSwapLoan = !!_activeSwap;
    const _swapPurchaseInfo = (()=>{
      // 取得費の決定：前回 swap の購入価格、または初回の house-price
      // ★ A1修正: 旧コードの `hAge+delivery-(cYear-1)` は -1990 等の非現実値になり、
      //   結果として _yrsLapsed = ha-_acqAge が常に巨大値となり _yrsLapsed<_origYrs が
      //   永遠に偽 → 旧ローン残債の一括返済 _swPayoff が常に0になっていた。
      //   譲渡所得税の長短判定 _holdYrs=ha-_acqAge も常に長期（20.315%）扱いになる
      //   副作用もあり、買い替えシミュレーションが実態より大幅に楽観的に出ていた。
      //   正しくは「初回購入時の主の年齢」= hAge + delivery（引き渡し年の年齢）。
      if(swapEvents.length===0)return {origPrice:(fv('house-price')||0),acqAge:hAge+delivery};
      // 最新 active swap の前回購入を取得
      const idx=swapEvents.findIndex(s=>s===_activeSwap);
      if(idx<=0){ return {origPrice:(fv('house-price')||0),acqAge:hAge+delivery}; }
      const prev=swapEvents[idx-1];
      return {origPrice:prev.price,acqAge:prev.age};
    })();

    // ─── ローン返済 ───
    const loanType2=_isFlat?eLoanType:(document.getElementById('loan-type')?.value||'equal_payment');
    let lRep=0,_lRepH=0,_lRepW=0;
    if(_useSwapLoan){
      // ★ 買い替え後のローン（最新 active swap の新ローンで計算）
      // 買い替え年=ローン開始年とする（翌年から返済でも近似的に同年から計上）
      const _yrOff = ha - _activeSwap.age;
      if(_activeSwap.loanMode==='pair'){
        if(_yrOff<_activeSwap.loanYrsH && _activeSwap.loanAmtH>0)
          _lRepH=ri(mpay(_activeSwap.loanAmtH,_activeSwap.loanYrsH,_activeSwap.loanRateH)*12);
        if(_yrOff<_activeSwap.loanYrsW && _activeSwap.loanAmtW>0)
          _lRepW=ri(mpay(_activeSwap.loanAmtW,_activeSwap.loanYrsW,_activeSwap.loanRateW)*12);
        lRep=_lRepH+_lRepW;
      } else {
        if(_yrOff<_activeSwap.loanYrs && _activeSwap.loanAmt>0)
          lRep=ri(mpay(_activeSwap.loanAmt,_activeSwap.loanYrs,_activeSwap.loanRate)*12);
      }
    } else if(_flatPair){
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

    // ─── 買い替えイベント：売却・税金・買付・残債一括返済 ───
    let _swSell=0, _swTax=0, _swPayoff=0, _swBuy=0;
    if(_swapAtThisYear){
      const sw=_swapAtThisYear;
      _swSell=sw.sell;
      // 旧ローン残債（買い替え年時点の残債）
      // 簡略：原ローンか前回 swap のローンを使用
      const prevIdx=swapEvents.findIndex(s=>s===sw);
      if(prevIdx===0){
        // 初回 swap：原ローンの残債
        const _origYrs=loanYrs; const _origAmt=loanAmt;
        const _yrsLapsed=ha-(hAge+delivery); // ★ A1修正: 同上、cYear-1 は不要
        const _origRate=effRate(_yrsLapsed,eRates)*100;  // %表記
        if(_yrsLapsed>0 && _yrsLapsed<_origYrs && _origAmt>0){
          _swPayoff = lbal(_origAmt,_origYrs,_origRate,_yrsLapsed);
        }
      } else {
        // 2回目 swap：前回 swap のローンの残債
        const prev=swapEvents[prevIdx-1];
        const _yrsLapsed=ha-prev.age;
        if(prev.loanMode==='pair'){
          let bal=0;
          if(_yrsLapsed>0 && _yrsLapsed<prev.loanYrsH && prev.loanAmtH>0)
            bal+=lbal(prev.loanAmtH,prev.loanYrsH,prev.loanRateH,_yrsLapsed);
          if(_yrsLapsed>0 && _yrsLapsed<prev.loanYrsW && prev.loanAmtW>0)
            bal+=lbal(prev.loanAmtW,prev.loanYrsW,prev.loanRateW,_yrsLapsed);
          _swPayoff=bal;
        } else if(_yrsLapsed>0 && _yrsLapsed<prev.loanYrs && prev.loanAmt>0){
          _swPayoff=lbal(prev.loanAmt,prev.loanYrs,prev.loanRate,_yrsLapsed);
        }
      }
      // 譲渡所得税（簡易：3000万円特別控除 + 長期/短期判定）
      const _origPrice=_swapPurchaseInfo.origPrice;
      const _acqAge=_swapPurchaseInfo.acqAge;
      const _holdYrs=ha-_acqAge;
      const _sellCost=Math.round(sw.sell*0.03+6);  // 仲介手数料 3%+6万
      const _profit=sw.sell-_origPrice-_sellCost;
      const _taxable=Math.max(0,_profit-3000);  // 3000万円特別控除
      const _isLongTerm=_holdYrs>5;
      const _taxRate=_isLongTerm?0.20315:0.3963;
      _swTax=Math.round(_taxable*_taxRate);
      // 買付費用（頭金・諸費用・引越家具）
      _swBuy=sw.down+sw.cost+sw.move;
    }
    R.swapSell.push(_swSell);
    R.swapTax.push(_swTax);
    R.swapPayoff.push(_swPayoff);
    R.swapBuy.push(_swBuy);
    // 売却額を当年 incT に加算（incT.push は line 1242 で実行済み）
    if(_swSell>0) R.incT[i] = ri((R.incT[i]||0) + _swSell);

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
      (_repairEls||document.querySelectorAll('#repair-cont>[id^="rep-"]')).forEach(repEl=>{
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
    const _carBdItems=[]; // 内訳記録: {label, type:'buy'|'loan'|'insp', amount}
    if(carOwn){
      (_carEls||document.querySelectorAll('#car-list>[id^="car-"]')).forEach(carEl=>{
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
        // ★ M3修正: 旧コードは「30歳未満は無効値」と扱っていたため、27〜29歳のお客様で
        //   carEndAge を有効値として設定しても効かない問題があった。0/空欄のみ無効値とする。
        const carActive=carEndAge<=0||ha<carEndAge;
        // 台ごとの行を初期化
        const rowKey='car-'+cIdx;
        if(!_carKeyMap.has(rowKey)){
          const carLblEl=document.getElementById('car-'+cIdx+'-label');
          const carLblTxt=carLblEl?.value?.trim()||`${R.carRows.length+1}台目`;
          const newRow={key:rowKey,lbl:'🚗 '+carLblTxt,vals:new Array(i).fill(0)};
          R.carRows.push(newRow);
          _carKeyMap.set(rowKey,newRow);
        }
        const carRow=_carKeyMap.get(rowKey);
        let lastBuy=-1;
        if(i>=carFirst){
          const elapsed=i-carFirst;
          lastBuy=carFirst+Math.floor(elapsed/carCycle)*carCycle;
        }
        const isBuyYear=carActive&&(i===carFirst||(i>carFirst&&(i-carFirst)%carCycle===0));
        let thisCarAmt=0, thisInspAmt=0;
        // 内訳ラベル: ユーザーカスタム or 1台目/2台目...
        const _cLblEl=document.getElementById('car-'+cIdx+'-label');
        const _carLbl=_cLblEl?.value?.trim()||`${cIdx}台目`;
        if(isBuyYear){
          if(carPay==='cash'){
            thisCarAmt+=carPrice;
            _carBdItems.push({label:_carLbl,type:'buy',amount:carPrice});
          }else{
            thisCarAmt+=carDown;
            _carBdItems.push({label:_carLbl,type:'buy',amount:carDown,note:'頭金'});
          }
        }
        if(carPay==='loan'&&carLoanYrs>0&&lastBuy>=0&&!isBuyYear&&carActive){
          const principal=(carPrice-carDown)*10000;
          const monthly=carLoanRate>0?principal*carLoanRate*Math.pow(1+carLoanRate,carLoanYrs*12)/(Math.pow(1+carLoanRate,carLoanYrs*12)-1):principal/carLoanYrs/12;
          const yrsAfterBuy=i-lastBuy;
          if(yrsAfterBuy>0&&yrsAfterBuy<=carLoanYrs){
            const _loanAmt=Math.round(monthly*12/10000);
            thisCarAmt+=_loanAmt;
            _carBdItems.push({label:_carLbl,type:'loan',amount:_loanAmt});
          }
        }
        if(lastBuy>=0&&!isBuyYear&&carActive){
          const yrFromBuy=i-lastBuy;
          let inspThisCar=0;
          if(carType==='new'){
            if(yrFromBuy===3||(yrFromBuy>3&&(yrFromBuy-3)%2===0))inspThisCar=carInsp;
          } else {
            if(yrFromBuy%2===0)inspThisCar=carInsp;
          }
          if(inspThisCar>0){
            thisInspAmt+=inspThisCar;
            _carBdItems.push({label:_carLbl,type:'insp',amount:inspThisCar});
          }
        }
        const thisTotal=ri(thisCarAmt)+ri(thisInspAmt);
        if(carRow)carRow.vals.push(thisTotal);
        carBuyAmt+=thisCarAmt; carInspAmt+=thisInspAmt;
      });
      // 現有車（既保有）の計算: ローン残債継続 + 車検 + 手放し
      // 全現有車を「🚗 車両費」1行に集約するため、carRows ではなく carBuyAmt/carInspAmt に加算
      (_ecarEls||document.querySelectorAll('#existing-car-list>[id^="ecar-"]')).forEach(ecEl=>{
        const ecIdx=ecEl.id.replace('ecar-','');
        const ecType=ecEl.dataset.type||'new';
        const ecPay=ecEl.dataset.pay||'cash';
        // ★ 当初借入時期 (bought-ago) は「当初借入条件」モード内に移動したが、
        //   input 自体は DOM 上に残っているため display:none でも fvd で読み出せる。
        //   現金払い・逆算モード時は車検タイミングの基準としてだけ使われる。
        const boughtAgo=fvd('ecar-'+ecIdx+'-bought-ago',3);
        const ecPrice=fvd('ecar-'+ecIdx+'-price',300);
        const ecInsp=fvd('ecar-'+ecIdx+'-insp',10);
        const ecEndYrs=fvd('ecar-'+ecIdx+'-end-yrs',5);
        // 内訳ラベル
        const _ecLblEl=document.getElementById('ecar-'+ecIdx+'-label');
        const _ecLbl=_ecLblEl?.value?.trim()||`現有車${ecIdx}`;
        // 経過年i が手放し年に到達したら以降0
        if(i>=ecEndYrs)return;
        // ローン残債継続（経過年0以降、当初借入年数 - 経過年数 が残月数）
        if(ecPay==='loan'){
          const ecLoanMode=document.getElementById('ecar-'+ecIdx+'-loan-mode')?.value||'original';
          if(ecLoanMode==='reverse'){
            // 逆算モード: 月々 + ボーナス × 残年数
            const ecMonthly=fvd('ecar-'+ecIdx+'-loan-monthly',0);
            const ecBonus=fvd('ecar-'+ecIdx+'-loan-bonus',0);
            const ecRemainYrs=fvd('ecar-'+ecIdx+'-loan-remain-yrs',0);
            // CF表のi年目（0=現在年）にローン支払いを計上
            // 残年数 ecRemainYrs を超えたら支払い終了
            if(i<ecRemainYrs){
              // 部分年（例: 残年数3.5年で i=3 の場合、月々半年分のみ）
              const fracYear=Math.min(1, ecRemainYrs-i);
              const monthsThisYear=Math.round(12*fracYear);
              const bonusThisYear=fracYear>=0.5?2:(fracYear>=0.25?1:0); // 半年以上残→2回、四半期以上→1回
              const _ecLoanAmt=Math.round(ecMonthly*monthsThisYear+ecBonus*bonusThisYear);
              carBuyAmt+=_ecLoanAmt;
              if(_ecLoanAmt>0)_carBdItems.push({label:_ecLbl,type:'loan',amount:_ecLoanAmt});
            }
          } else {
            // 当初借入モード（既存ロジック）
            const ecDown=fvd('ecar-'+ecIdx+'-down',50);
            const ecLoanYrs=fvd('ecar-'+ecIdx+'-loan-yrs',5);
            const ecLoanRate=fvd('ecar-'+ecIdx+'-loan-rate',2.5)/100/12;
            const principal=Math.max(0,(ecPrice-ecDown)*10000);
            const totalMonths=ecLoanYrs*12;
            const elapsedMonthsAtStart=boughtAgo*12;
            const remainMonthsAtStart=Math.max(0,totalMonths-elapsedMonthsAtStart);
            const monthsBeforeThisYear=i*12;
            const remainAtThisYear=Math.max(0,remainMonthsAtStart-monthsBeforeThisYear);
            if(remainAtThisYear>0){
              const monthly=ecLoanRate>0?principal*ecLoanRate*Math.pow(1+ecLoanRate,totalMonths)/(Math.pow(1+ecLoanRate,totalMonths)-1):principal/totalMonths;
              const monthsThisYear=Math.min(12,remainAtThisYear);
              const _ecLoanAmt=Math.round(monthly*monthsThisYear/10000);
              carBuyAmt+=_ecLoanAmt;
              if(_ecLoanAmt>0)_carBdItems.push({label:_ecLbl,type:'loan',amount:_ecLoanAmt});
            }
          }
        }
        // 車検（過去基準）: 購入年からの経過年で次回車検タイミングを計算
        const yrFromBuy=boughtAgo+i;
        if(yrFromBuy>0){
          let inspThisCar=0;
          if(ecType==='new'){
            if(yrFromBuy===3||(yrFromBuy>3&&(yrFromBuy-3)%2===0))inspThisCar=ecInsp;
          } else {
            if(yrFromBuy%2===0)inspThisCar=ecInsp;
          }
          if(inspThisCar>0){
            carInspAmt+=inspThisCar;
            _carBdItems.push({label:_ecLbl,type:'insp',amount:inspThisCar});
          }
        }
      });
      // carRowsのうち今回ループしなかった行（削除済み台）にも0を追加
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    } else {
      R.carRows.forEach(row=>{if(row.vals.length<=i)row.vals.push(0);});
    }
    R.carBuy.push(ri(carBuyAmt));
    R.carInsp.push(ri(carInspAmt));
    R.carTotal.push(ri(carBuyAmt)+ri(carInspAmt));
    // 内訳を保存（hover ツールチップ用）
    R.carBd.push(_carBdItems);
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
    (_wedAmtEls||document.querySelectorAll('[id^="wed-amt-"]')).forEach(el=>{
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
      (_insMByP&&_insMByP[p]||document.querySelectorAll(`[id^="ins-m-${p}-"]`)).forEach(el=>{
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
        let row=_insMonthlyKeyMap.get(rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.insMonthlyRows.push(row);_insMonthlyKeyMap.set(rowKey,row);}
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
      (_insLumpByP&&_insLumpByP[p]||document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`)).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const enrollAge2=iv(`ins-lump-enroll-${p}-${iid}`)||pBase2;
        const amt2=fv(`ins-lump-amt-${p}-${iid}`)||0;
        const customLabel=document.getElementById(`ins-lump-label-${p}-${iid}`)?.value?.trim()||'';
        const rowKey=`insL-${p}-${iid}`;
        const lbl=customLabel||`一時払保険(${pLabel2})`;
        const v=(amt2>0&&pAge2===enrollAge2)?ri(amt2):0;
        let row=_insLumpExpKeyMap.get(rowKey);
        if(!row){row={lbl,vals:[],key:rowKey};R.insLumpExpRows.push(row);_insLumpExpKeyMap.set(rowKey,row);}
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
    let exp=R.lc[i]+R.rent[i]+R.secInvest[i]+R.secBuy[i]+R.insMonthly[i]+R.insLumpExp[i]+lRep+R.rep[i]+R.ptx[i]+R.furn[i]+R.senyu[i]+R.prk[i]+R.carTotal[i]+R.wedding[i]+R.ext[i]+R.dcMatchExpH[i]+R.dcMatchExpW[i]+R.idecoExpH[i]+R.idecoExpW[i]+R.zaikeiExp[i]+R.chidai[i]+R.kaitai[i]+R.swapTax[i]+R.swapPayoff[i]+R.swapBuy[i];
    children.forEach((c,ci)=>exp+=R.edu[ci][i]);
    R.expT.push(ri(exp));
    // ─ 自動資産取崩し（預貯金マイナス時のみ） ─
    let _autoLiqG=0, _autoLiqT=0, _autoLiqByLbl={};
    if(_autoLiqEnabled){
      // DC/iDeCo受取は後の処理で R.incT に加算されるが、自動取崩し判定では
      // 先回りして考慮する（受取年に不必要な取崩しを防ぐ）
      const _peekDcIdeco = _peekDcIdecoReceipts(i);
      const _tentBal = R.incT[i] + _peekDcIdeco - R.expT[i];
      const _tentSav = sav + _tentBal;
      if(_tentSav < -0.5){  // 0.5円未満の誤差は無視
        const _liq = _autoLiquidate(-_tentSav, i);
        _autoLiqG = _liq.gross;
        _autoLiqT = _liq.tax;
        _autoLiqByLbl = _liq.byLbl;
        // 収入合計＋取崩し額（net＝gross-tax で預貯金を補填）、支出合計＋税額
        R.incT[i] = ri(R.incT[i] + _autoLiqG);
        R.expT[i] = ri(R.expT[i] + _autoLiqT);
      }
    }
    R.autoLiq.push(ri(_autoLiqG));
    R.autoLiqTax.push(ri(_autoLiqT));
    R.autoLiqDetails.push(_autoLiqByLbl);
    const b=R.incT[i]-R.expT[i];R.bal.push(b);sav+=b;
    // 丸め誤差吸収: 自動取崩しが直近の年で実行されている、または前年が0付近の場合、
    // sav が ±2万円以内なら 0 にスナップ。これは：
    // - 取崩し時の整数四捨五入で 0 付近に1〜2万円のドリフトが累積するため
    // - 自動取崩しが続いている期間は理論上 sav=0 が期待されるため
    const _wasNearZero = i>0 && R.sav.length>0 && Math.abs(R.sav[i-1]) <= 1;
    if((_autoLiqG > 0 || _wasNearZero) && sav > -2 && sav < 2 && _autoLiqEnabled){
      sav = 0;
    }
    // 財形貯蓄は「その他金融資産」扱いに移行したため、預貯金残高には加算しない
    // （財形の残高推移は後段の finRowMap で別途追跡する）
    R.savExtra.push(0);
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
      (_secBalByP&&_secBalByP[p]||document.querySelectorAll(`[id^="sec-bal-${p}-"]`)).forEach(el=>{
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
        if(endAge===0||pAge<=endAge){
          // 野村シミュレーター準拠: 月利 r/12, 月末払い
          // endAge は inclusive（=その年齢まで積立継続）
          const mr=rate/12;
          const cpd=Math.pow(1+mr,12*yrs);
          const balGrow=bal*cpd;
          const accumFV=mr>0?monthly*(cpd-1)/mr:monthly*12*yrs;
          fv2Base=Math.round(balGrow+accumFV);
        } else {
          const mr=rate/12;
          const yrsAccum=endAge-pBaseAge+1;  // inclusive: endAgeの年も積立
          const yrsAfter=yrs-yrsAccum;
          const cpdA=Math.pow(1+mr,12*yrsAccum);
          const balAtEnd=bal*cpdA;
          const accumAtEnd=mr>0?monthly*(cpdA-1)/mr:monthly*12*yrsAccum;
          fv2Base=Math.round((balAtEnd+accumAtEnd)*Math.pow(1+mr,12*Math.max(0,yrsAfter)));
        }
        // 自動取崩しによる減額（過去の取崩しは複利成長分も含めて差し引き）
        let _liqReduction = 0;
        const _matchSec = _secStateMap.get(`accum|${p}|${sid}`);
        if(_matchSec){
          for(const liq of _matchSec.liquidations){
            if(liq.year<=i) _liqReduction += liq.gross*Math.pow(1+_matchSec.rate, i-liq.year);
          }
        }
        // シナリオ適用版（シリーズがあれば使用、なければ通常版と同じ）
        let fv2 = _series ? (_series[i]||0) : fv2Base;
        if(_liqReduction>0){
          fv2 = Math.max(0, fv2 - Math.round(_liqReduction));
          fv2Base = Math.max(0, fv2Base - Math.round(_liqReduction));
        }
        finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+fv2Base;
        // 積立額累計（開始から現時点まで、積立終了後は endAge 時点で停止）
        const _effYrsAccum=endAge>0&&pAge>endAge?(endAge-pBaseAge+1):yrs;
        let _principal=Math.round((bal+monthly*12*Math.max(0,_effYrsAccum))*10)/10;
        // 自動取崩しによる取得原価の減少も反映（breakdown表示の整合性）
        if(_matchSec){
          let _principalReduction=0;
          for(const liq of _matchSec.liquidations){
            if(liq.year<=i) _principalReduction += liq.costReduced;
          }
          _principal = Math.max(0, Math.round((_principal - _principalReduction)*10)/10);
        }
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
      (_secStkByP&&_secStkByP[p]||document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`)).forEach(el=>{
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
        let _evalBase=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        let _eval=_stkSeries?(_stkSeries[i]||0):_evalBase;
        // 自動取崩しによる減額（過去の取崩しは複利成長分も含めて差し引き）
        const _matchSecStk = _secStateMap.get(`stock|${p}|${sid}`);
        if(_matchSecStk){
          let _liqReductionStk = 0;
          for(const liq of _matchSecStk.liquidations){
            if(liq.year<=i) _liqReductionStk += liq.gross*Math.pow(1+_matchSecStk.rate, i-liq.year);
          }
          if(_liqReductionStk>0){
            _eval = Math.max(0, _eval - Math.round(_liqReductionStk));
            _evalBase = Math.max(0, _evalBase - Math.round(_liqReductionStk));
          }
        }
        finRowMapBase[lbl]=(finRowMapBase[lbl]||0)+_evalBase;
        // 一括投資の取得原価: basisがあればそれ、なければ初期評価額(bal) — 取崩しによる原価減少も反映
        const _stkBasisIn = fv(`sec-basis-${p}-${sid}`)||0;
        let _stkPrincipal = _stkBasisIn>0 ? _stkBasisIn : bal;
        if(_matchSecStk){
          let _stkPrincReduction=0;
          for(const liq of _matchSecStk.liquidations){
            if(liq.year<=i) _stkPrincReduction += liq.costReduced;
          }
          _stkPrincipal = Math.max(0, Math.round((_stkPrincipal - _stkPrincReduction)*10)/10);
        }
        const _gainS=Math.round((_eval-_stkPrincipal)*10)/10;
        finRowMap[lbl]=(finRowMap[lbl]||0)+_eval;
        // 内訳保存
        if(!R.finAssetBd[lbl])R.finAssetBd[lbl]={};
        if(!R.finAssetBd[lbl][i])R.finAssetBd[lbl][i]={items:[],total:0,principalTotal:0,gainTotal:0};
        R.finAssetBd[lbl][i].items.push({
          type:'stk', person:p, isNisa,
          principal:_stkPrincipal, evaluation:_eval, gain:_gainS,
          rate:rate*100, yrsHeld, investAge
        });
        R.finAssetBd[lbl][i].total+=_eval;
        R.finAssetBd[lbl][i].principalTotal+=_stkPrincipal;
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
      // 初期残高付き将来価値ヘルパー（野村シミュレーター準拠: 月利 r/12）
      // grow = initBal*(1+r/12)^(12*yrs),  contrib = monthly*((1+r/12)^(12*yrs)-1)/(r/12)
      const _fvWithInit=(initBal,monthly,rate,yrs)=>{
        const mr=rate/12;
        const cpd=mr>0?Math.pow(1+mr,12*yrs):1;
        const grow=initBal*cpd;
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
        _dcBalAtReceive=balAtEnd*(rate>0?Math.pow(1+rate/12,12*Math.max(0,yrsToReceive-yrsContrib)):1);
      }
      if(hasIdeco){
        const yrsContrib=Math.min(d.retAge-pBaseAge, yrsToReceive);
        const rate=d.idecoRate;
        const balAtEnd=_fvWithInit(d.idecoInitBal,d.idecoMonthly,rate,yrsContrib);
        _idecoBalAtReceive=balAtEnd*(rate>0?Math.pow(1+rate/12,12*Math.max(0,yrsToReceive-yrsContrib)):1);
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
            dcBalBase=balAtRetire*(d.dcRate>0?Math.pow(1+d.dcRate/12,12*Math.max(0,yrsAfter)):1);
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
            idecoBalBase=balAtRetire*(d.idecoRate>0?Math.pow(1+d.idecoRate/12,12*Math.max(0,yrsAfter)):1);
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
    // ─── 財形貯蓄（その他金融資産扱い・利回り0%固定） ───
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      const pRetAge=p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60);
      const zbal=fv(`zaikei-${p}-bal`)||0;
      const zm=fv(`zaikei-${p}-monthly`)||0;
      const ze=iv(`zaikei-${p}-end`)||0;
      const zr=iv(`zaikei-${p}-redeem`)||0;
      if(zbal<=0&&zm<=0)return;
      const _zEnd=ze>0?ze:pRetAge;
      const _zRedeemAge=zr>0?zr:_zEnd;
      const _zStopContribAge=Math.min(_zEnd,_zRedeemAge);
      // 拠出は積立終了 or 解約年齢のどちらか早い方まで
      const _zContribYrs=Math.min(i+1,Math.max(0,_zStopContribAge-pBaseAge));
      // 解約年齢に到達したらその年から残高を0に（一括解約済みの扱い）
      const _zRedeemed=pAge>=_zRedeemAge;
      const zVal=_zRedeemed?0:Math.round(zbal+zm*12*_zContribYrs);
      const _pLblZ=p==='h'?'ご主人様':'奥様';
      const lblZ=`財形貯蓄(${_pLblZ})`;
      finRowMap[lblZ]=(finRowMap[lblZ]||0)+zVal;
      finRowMapBase[lblZ]=(finRowMapBase[lblZ]||0)+zVal;
      finRowPerson[lblZ]=p;
      if(!R.finAssetBd[lblZ])R.finAssetBd[lblZ]={};
      if(!R.finAssetBd[lblZ][i])R.finAssetBd[lblZ][i]={items:[],total:0,principalTotal:0,gainTotal:0};
      R.finAssetBd[lblZ][i].items.push({
        type:'zaikei', person:p, isNisa:false,
        initBal:zbal, monthly:zm, rate:0,
        principal:zVal, evaluation:zVal, gain:0,
        yrs:i+1, endAge:_zEnd, redeemAge:_zRedeemAge
      });
      R.finAssetBd[lblZ][i].total+=zVal;
      R.finAssetBd[lblZ][i].principalTotal+=zVal;
    });
    // 【積立保険】はその他金融資産行から除外（推計精度が低いため）
    // finAssetRowsに追記（毎年動的にキーを管理）
    Object.keys(finRowMap).forEach(k=>{
      if(!_finAssetLblMap.has(k)){
        // 新しいキーが出てきたら過去分を0で埋めて追加
        const newFinRow={lbl:k,vals:new Array(i).fill(0),baseVals:new Array(i).fill(0),person:finRowPerson[k]||'both'};
        R.finAssetRows.push(newFinRow);
        _finAssetLblMap.set(k,newFinRow);
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
    // 育休期間フラグ（ご主人様）
    R.mlH.push(_hStepLeaves.some(s=>s.isMatLeave&&ha>=s.fromAge&&ha<=s.toAge));

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
    // 育休期間フラグ（奥様）
    R.mlW.push(_wStepLeaves.some(s=>s.isMatLeave&&wa>=s.fromAge&&wa<=s.toAge));

    children.forEach((c,ci)=>{
      const ca=c.age+i;
      const cid=ci+1;
      const hoikuStartAge=(x=>isNaN(x)?1:x)(parseInt(document.getElementById(`hoiku-start-${cid}`)?.value));
      const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';
      const hoikuLabel=hoikuType==='youchien'?'幼稚園入園':'保育園入園';
      let ev='';
      if(ca===0)ev='誕生';
      else if(ca>=hoikuStartAge&&ca<=6)ev=ca===hoikuStartAge?hoikuLabel:'';
      else if(ca>=7&&ca<=12)ev=ca===7?'小学入学':'';
      else if(ca>=13&&ca<=15)ev=ca===13?'中学入学':'';
      else if(ca>=16&&ca<=18)ev=ca===16?'高校入学':'';
      else if(ca>=19){
        const un2=_v(`cu-${cid}`)||'plit_h';
        const ul2=(EDU.univ[un2]||[]).length;
        const gPath=_v(`cgrad-path-${cid}`)||'none';
        const gCourse=_v(`cgrad-course-${cid}`)||'psci_h';
        let mLen2=0,dLen2=0,medLen2=0;
        if(gPath==='master'){mLen2=(EDU.grad?.master?.[gCourse]||[]).length;}
        else if(gPath==='both'){mLen2=(EDU.grad?.master?.[gCourse]||[]).length;dLen2=(EDU.grad?.doctor?.[gCourse]||[]).length;}
        else if(gPath==='doctor'){dLen2=(EDU.grad?.doctor?.[gCourse]||[]).length;}
        else if(gPath==='med'){const _mc=['nat_h','nat_b','med_h','med_b'].includes(gCourse)?gCourse:'med_h';medLen2=(EDU.grad?.medical?.[_mc]||[]).length;}
        if(ul2>0 && ca<19+ul2) ev=ca===19?(un2.startsWith('senmon')?'専門入学':'大学入学'):'';
        else if(mLen2>0 && ca===19+ul2) ev='修士入学';
        else if(dLen2>0 && ca===19+ul2+mLen2) ev='博士入学';
        else if(medLen2>0 && ca===19+ul2) ev='医歯博士入学';
      }
      R.evC[ci].push(ev);
    });
  }

  // ─── cfOverrides後処理: サブ行上書きを合計・収支・残高に反映 ───
  if(Object.keys(cfOverrides).length>0||cfCustomRows.length>0){
    // ★ autoLiq (自動資産取崩し) と autoLiqTax (譲渡益課税) を含めないと、
    //   手動編集発生時に年間収支から自動取崩し分が消えて計算ズレが発生
    const incKeys=['hInc','wInc','dcTaxSavingH','dcTaxSavingW','otherInc','insMat','rPay','wRPay','pTotalH','pTotalW','scholarship','teate','lCtrl','dcReceiptH','dcReceiptW','idecoReceiptH','idecoReceiptW','zaikeiRedeem','swapSell','autoLiq'];
    const expKeys=['lc','secInvest','secBuy','insMonthly','insLumpExp','rent','lRep','rep','ptx','furn','senyu','prk','carTotal','wedding','ext','dcMatchExpH','dcMatchExpW','idecoExpH','idecoExpW','zaikeiExp','chidai','kaitai','swapTax','swapPayoff','swapBuy','autoLiqTax'];
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
    // ★ バグ修正(v530): 車両費アグリゲート行(carTotal)を直接編集した場合、上の carRows 再集計で
    //   上書きが消えてしまうため、直接上書きを最後に再適用して優先させる。
    if(cfOverrides['carTotal']){
      Object.entries(cfOverrides['carTotal']).forEach(([col,val])=>{
        const c2=parseInt(col); if(R.carTotal&&c2<R.carTotal.length)R.carTotal[c2]=val;
      });
    }
    // ★ バグ修正(v530): 積立投資/保険料/一時払い保険/財形 などの「個別行」を直接編集しても
    //   合計(支出合計・収入合計)に反映されなかった。各個別行の上書きを vals に反映し、
    //   対応するアグリゲート(R.secInvest 等)を再集計して incT/expT に確実に効かせる。
    const _aggRowFix=(rowsArr, aggArr)=>{
      if(!rowsArr||!rowsArr.length||!aggArr)return;
      let hasOvr=false;
      rowsArr.forEach(row=>{
        if(cfOverrides[row.key]){
          Object.entries(cfOverrides[row.key]).forEach(([col,val])=>{row.vals[parseInt(col)]=val;});
          hasOvr=true;
        }
      });
      if(hasOvr){
        for(let i=0;i<aggArr.length;i++){
          let s=0; rowsArr.forEach(row=>s+=ri(row.vals[i]||0)); aggArr[i]=s;
        }
      }
    };
    _aggRowFix(R.secInvestRows, R.secInvest);     // 積立投資/NISA
    _aggRowFix(R.insMonthlyRows, R.insMonthly);   // 保険料（積立）
    _aggRowFix(R.insLumpExpRows, R.insLumpExp);   // 一時払い保険
    _aggRowFix(R.zaikeiRows, R.zaikeiExp);        // 財形積立（支出）
    _aggRowFix(R.zaikeiRedeemRows, R.zaikeiRedeem); // 財形解約（収入）
    let newSav=initSav;
    for(let i=0;i<R.incT.length;i++){
      if(cfOverrides['incT']?.[i]!==undefined){R.incT[i]=cfOverrides['incT'][i];}
      else{let t=incKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);if(R.secRedeemRows)R.secRedeemRows.forEach(row=>t+=(row.vals[i]||0));cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{t+=(cfOverrides[r.id]?.[i]||0);});R.incT[i]=t;}
      if(cfOverrides['expT']?.[i]!==undefined){R.expT[i]=cfOverrides['expT'][i];}
      else{let t=expKeys.reduce((s,k)=>s+(R[k]?.[i]||0),0);children.forEach((_ch,ci)=>t+=(R.edu[ci]?.[i]||0));cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{t+=(cfOverrides[r.id]?.[i]||0);});R.expT[i]=t;}
      R.bal[i]=R.incT[i]-R.expT[i];
      // ★ 初回計算と同じ順序でsavを更新（snap処理を再現）：
      //   1) bal（DC受取を除く）を加算
      //   2) snap判定（±2万円以内かつ自動取崩し中なら0にスナップ）
      //   3) savExtra（財形）を加算
      //   4) DC受取（dcReceiptH/W + idecoReceiptH/W）を加算
      const _dcContrib = (R.dcReceiptH?.[i]||0) + (R.dcReceiptW?.[i]||0)
                       + (R.idecoReceiptH?.[i]||0) + (R.idecoReceiptW?.[i]||0);
      const _balNoDc = R.bal[i] - _dcContrib;
      newSav += _balNoDc;
      // snap判定（初回計算と同条件）
      const _autoLiqG_i = R.autoLiq?.[i] || 0;
      const _prevSavForSnap = i>0 ? R.sav[i-1] : initSav;
      const _wasNearZeroR = i>0 && Math.abs(_prevSavForSnap) <= 1;
      if((_autoLiqG_i > 0 || _wasNearZeroR) && newSav > -2 && newSav < 2 && _autoLiqEnabled){
        newSav = 0;
      }
      newSav += (R.savExtra[i]||0);
      newSav += _dcContrib;
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
