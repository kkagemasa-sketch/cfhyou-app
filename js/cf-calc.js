// cf-calc.js — CF表メイン計算エンジン
// ===== メイン計算 =====
function render(){
  if(rTab==='lctab'){renderLCTab();return}
  if(rTab==='loan'){renderLoanCalc();return}
  if(rTab==='memo'){renderMemo();return}
  const hAge=iv('husband-age')||30, wAge=iv('wife-age')||29;
  const loanAmt=fv('loan-amt'), loanYrs=iv('loan-yrs')||35, delivery=iv('delivery');
  // ペアローン用変数
  const lhAmt=pairLoanMode?fv('loan-h-amt')||0:0;
  const lwAmt=pairLoanMode?fv('loan-w-amt')||0:0;
  const lhYrs=iv('loan-h-yrs')||35, lwYrs=iv('loan-w-yrs')||35;
  const lhType=document.getElementById('loan-h-type')?.value||'equal_payment';
  const lwType=document.getElementById('loan-w-type')?.value||'equal_payment';
  const rHBase=fv('rate-h-base')||0.5, rWBase=fv('rate-w-base')||0.5;
  const ratesH=pairLoanMode?getPairRates('h'):[], ratesW=pairLoanMode?getPairRates('w'):[];
  const effLoanAmt=pairLoanMode?(lhAmt+lwAmt):loanAmt;
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
  const retAge=iv('retire-age')||65, retPay=fv('retire-pay'), pSelf=$('pension-h')?.value===''?0:(fv('pension-h')||186);
  const retPayAge=iv('retire-pay-age')||retAge;
  const hDeathAge=iv('h-death-age');
  const wDeathAge=iv('w-death-age');
  const wRetAge=iv('w-retire-age')||60;
  const wRetPay=fv('w-retire-pay')||0;
  const wRetPayAge=iv('w-retire-pay-age')||wRetAge;
  const pWife=$('pension-w')?.value===''?0:(fv('pension-w')||66);
  const pHReceive=iv('pension-h-receive')||65;
  const pWReceive=iv('pension-w-receive')||65;
  // 老齢基礎年金概算（2024年度満額81.6万円 × 加入年数/40年）
  const KISO_FULL=81.6;
  const pHStart=iv('pension-h-start')||22;
  const pWStart=iv('pension-w-start')||22;
  const kisoH=ri(KISO_FULL*Math.min(retAge-pHStart,40)/40);   // ご主人の老齢基礎年金
  const kisoW=ri(KISO_FULL*Math.min(wRetAge-pWStart,40)/40);  // 奥様の老齢基礎年金
  // 老齢厚生年金相当額の計算
  // 収入ステップがあれば生涯平均を精密計算、なければ月収×0.75で推定、どちらもなければ年金設定から逆算
  const hGrossM=fv('h-gross-monthly')||0, hGrossB=fv('h-gross-bonus')||0;
  const wGrossM=fv('w-gross-monthly')||0, wGrossB=fv('w-gross-bonus')||0;
  const CAREER_FACTOR=0.75;  // フォールバック用
  let koseiH, koseiW;
  // ご主人
  const hAvgHyojun=calcAvgHyojun('h', pHStart, retAge);
  if(hAvgHyojun!==null){
    const hJoinM=Math.min(480,Math.max((retAge-pHStart)*12,300));
    koseiH=hAvgHyojun*5.481/1000*hJoinM;
  }else if(hGrossM>0){
    const hCapped=Math.min(hGrossM,65), hBonusCapped=Math.min(hGrossB,300);
    const hHyojun=(hCapped*12+hBonusCapped)/12*CAREER_FACTOR;
    const hJoinM=Math.min(480,Math.max((retAge-pHStart)*12,300));
    koseiH=hHyojun*5.481/1000*hJoinM;
  }else{koseiH=Math.max(0,pSelf-kisoH);}
  // 奥様
  const wAvgHyojun=calcAvgHyojun('w', pWStart, wRetAge);
  if(wAvgHyojun!==null){
    const wJoinM=Math.min(480,Math.max((wRetAge-pWStart)*12,300));
    koseiW=wAvgHyojun*5.481/1000*wJoinM;
  }else if(wGrossM>0){
    const wCapped=Math.min(wGrossM,65), wBonusCapped=Math.min(wGrossB,300);
    const wHyojun=(wCapped*12+wBonusCapped)/12*CAREER_FACTOR;
    const wJoinM=Math.min(480,Math.max((wRetAge-pWStart)*12,300));
    koseiW=wHyojun*5.481/1000*wJoinM;
  }else{koseiW=Math.max(0,pWife-kisoW);}
  const leaves=getLeaves();
  // 生活費
  const baseLc=calcLC();
  const lcSteps=getLCSteps();
  // ローン
  const rates=getRates();
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
    const cid=el.id.split('-')[1];children.push({age:parseInt(el.value)||0,costs:eduCosts(cid)});
  });
  const cYear=new Date().getFullYear();
  // ご逝去年齢から表示年数を自動計算（夫婦どちらか高い方まで）
  const hEndYr = hDeathAge>0 ? hDeathAge-hAge+1 : 0;
  const wEndYr = wDeathAge>0 ? wDeathAge-wAge+1 : 0;
  const autoDisp = Math.max(hEndYr, wEndYr);
  // ローン全期間が収まるよう totalYrs を確保（delivery + loanYrs が60年を超える場合に対応）
  const loanEnd = delivery + loanYrs + 1;
  const totalYrs = Math.max(autoDisp, 60, loanEnd);
  const disp = Math.max(autoDisp>0 ? autoDisp : 60, loanEnd - 1);
  const cLbls=['第一子','第二子','第三子','第四子'];

  let sav=initSav;
  const R={yr:[],hA:[],wA:[],cA:children.map(()=>[]),
    hInc:[],wInc:[],rPay:[],wRPay:[],otherInc:[],scholarship:[],insMat:[],secRedeem:[],pS:[],pW:[],teate:[],lCtrl:[],survPension:[],dcReceiptH:[],dcReceiptW:[],idecoReceiptH:[],idecoReceiptW:[],incT:[],
    lc:[],lRep:[],lRepH:[],lRepW:[],rep:[],ptx:[],furn:[],senyu:[],edu:children.map(()=>[]),
    rent:[],houseCostArr:[],moveInCost:[],secInvest:[],secBuy:[],insMonthly:[],insLumpExp:[],carBuy:[],carInsp:[],carTotal:[],carRows:null,prk:[],wedding:[],ext:[],dcMatchExpH:[],dcMatchExpW:[],idecoExpH:[],idecoExpW:[],expT:[],bal:[],sav:[],savExtra:[],lBal:[],finAsset:[],finAssetRows:null,secRedeemRows:null,totalAsset:[],
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

  for(let i=0;i<totalYrs;i++){
    const yr=cYear+i, ha=hAge+i, wa=wAge+i;
    const active=i>=delivery, lcYr=i-delivery;
    let dcReceiptH=0,dcReceiptW=0,idecoReceiptH=0,idecoReceiptW=0; // DC/iDeCo受取額（ご主人/奥様別）
    R.yr.push(yr);R.hA.push(ha);R.wA.push(wa);
    children.forEach((c,ci)=>R.cA[ci].push(c.age+i));

    // ─── ご主人収入 ───
    let hInc=0;
    if(!(hDeathAge>0&&ha>hDeathAge)){
      hInc=getIncomeAtAge(hSteps,ha);
      // DC・iDeCo節税効果（拠出期間中のみ）
      if(hInc>0&&ha<dcIdeco.h.retAge){
        const ded=(dcIdeco.h.matching+dcIdeco.h.idecoMonthly)*12;
        if(ded>0){const sv=estimateTaxSaving(hInc,ded);hInc+=sv.total;}
      }
    }
    R.hInc.push(ri(hInc));

    // ─── 奥様収入（産休・育休・時短対応） ───
    let wInc=0;
    if(!(wDeathAge>0&&wa>wDeathAge)){
      const leave=leaves.find(l=>wa>=l.startAge&&wa<l.endAge);
      if(leave){
        wInc=ri(leave.income);
      } else {
        wInc=getIncomeAtAge(wSteps,wa);
      }
      // DC・iDeCo節税効果（拠出期間中のみ）
      if(wInc>0&&wa<dcIdeco.w.retAge){
        const ded=(dcIdeco.w.matching+dcIdeco.w.idecoMonthly)*12;
        if(ded>0){const sv=estimateTaxSaving(wInc,ded);wInc+=sv.total;}
      }
    }
    R.wInc.push(ri(wInc));

    // ─── その他収入 ───
    R.rPay.push(ha===retPayAge?ri(retPay):0);
    // 奥様退職金
    R.wRPay.push(wa===wRetPayAge?ri(wRetPay):0);
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
    ['h','w'].forEach(p=>{
      const pAge=p==='h'?ha:wa;
      const pBaseAge=p==='h'?hAge:wAge;
      // 積み立て保険：満期受取（早期解約がない場合のみ）
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;
        const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        // 早期解約がある場合は満期時に受け取らない
        if(matAmt>0&&matAge>0&&pAge===matAge&&(redeemAge<=0||redeemAge>=matAge))insMatTotal+=matAmt;
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
        let matVal=0;
        if(rate>0)matVal=Math.round(amt*Math.pow(1+rate/100,yrs)*10)/10;
        else if(matAmtFixed>0)matVal=matAmtFixed;
        else if(pct>0)matVal=Math.round(amt*pct/100*10)/10;
        insMatTotal+=matVal;
      });
    });
    R.insMat.push(insMatTotal);
    R.pS.push((ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge))?ri(pSelf):0);
    // ご主人死亡後は遺族年金(survPension)に統合されるため配偶者年金は計上しない
    const hAlive=!(hDeathAge>0&&ha>hDeathAge);
    R.pW.push((wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge)&&hAlive)?ri(pWife):0);
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

    // ─── 遺族年金（ご主人ご逝去後 or 奥様ご逝去後） ───
    let survP=0;
    if(hDeathAge>0&&ha>hDeathAge){
      // ご主人ご逝去後：奥様への遺族年金
      const overrideH=parseFloat(document.getElementById('surv-h-amt')?.value)||0;
      if(overrideH>0){
        survP=overrideH;
      }else{
        // 65歳未満：遺族厚生年金 = 夫の厚生×3/4
        // 65歳以降：差額方式 と 2/3+1/2特例 の高い方
        let childUnder18=0;
        children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
        const kiso=calcKiso(childUnder18);
        // 中高齢寡婦加算: 遺族基礎年金なし かつ 妻40〜64歳 かつ 夫死亡時に妻40歳以上
        const wAgeAtDeath=wAge+(hDeathAge-hAge);
        const chukorei=(kiso===0&&wa>=40&&wa<65&&wAgeAtDeath>=40)?ri(61.43):0;
        if(wa>=pWReceive){
          // 2022年改正後は差額方式のみ（2/3・1/2方式は廃止）
          survP=kisoW+Math.max(ri(koseiH*0.75),ri(koseiW))+kiso+chukorei;
        }else{
          survP=ri(koseiH*0.75)+kiso+chukorei;
        }
      }
    }else if(wDeathAge>0&&wa>wDeathAge){
      // 奥様ご逝去後：ご主人への遺族年金
      const overrideW=parseFloat(document.getElementById('surv-w-amt')?.value)||0;
      if(overrideW>0){
        survP=overrideW;
      }else{
        const hIncome=getIncomeAtAge(hSteps,ha);
        let childUnder18=0;
        children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
        const kiso=calcKiso(childUnder18);
        if(childUnder18>0||(ha>=55&&hIncome<850)){
          survP=ri(koseiW*0.75)+kiso;
        }
      }
    }
    R.survPension.push(survP);

    // ─── 住宅ローン控除（LCTRL_TABLEを参照・所得税・住民税上限考慮） ───
    const lctrlYear=parseInt(document.getElementById('lctrl-year')?.value)||2025;
    const lctrlType=document.getElementById('lctrl-type')?.value||'new_eco';
    const lctrlHH=document.getElementById('lctrl-household')?.value||'general';
    const isKosodate=lctrlHH==='kosodate';
    const lctrlRowR=getLCtrlRow(lctrlYear,lctrlType,isKosodate);
    const lctrlLimit=lctrlRowR[0], lctrlYrs=lctrlRowR[1];
    let lc2=0;
    // 自由入力モード
    if(_lctrlDedMode==='manual'){
      const mv=getLctrlManualValues();
      lc2=lcYr<mv.length?mv[lcYr]:0;
      R.lCtrl.push(ri(lc2));
    }else
    if(active&&lctrlYrs>0&&lcYr<lctrlYrs&&effLoanAmt>0&&lctrlLimit>0){
      const loanType2tmp=document.getElementById('loan-type')?.value||'equal_payment';
      const remainBal=pairLoanMode
        ?(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr):0)+(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr):0)
        :(loanType2tmp==='equal_payment'
          ?lbal(loanAmt,loanYrs,effRate(lcYr,rates),lcYr)
          :lbal_gankin(loanAmt,loanYrs,lcYr));
      const cappedBal=Math.min(remainBal,pairLoanMode?lctrlLimit*2:lctrlLimit);
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
        const shakai=Math.round(grossEst*0.1437*10)/10;
        let kyuyo=grossEst<=180?Math.max(55,grossEst*0.4):grossEst<=360?grossEst*0.3+18:grossEst<=660?grossEst*0.2+54:grossEst<=850?grossEst*0.1+120:grossEst<=1000?grossEst*0.05+172.5:195;
        taxableBase=Math.max(0,grossEst-kyuyo-shakai-48);
        const taxable=Math.max(0,taxableBase-38);
        if(taxable<=195)itax=taxable*0.05;
        else if(taxable<=330)itax=taxable*0.1-9.75;
        else if(taxable<=695)itax=taxable*0.2-42.75;
        else if(taxable<=900)itax=taxable*0.23-63.6;
        else if(taxable<=1800)itax=taxable*0.33-153.6;
        else if(taxable<=4000)itax=taxable*0.4-279.6;
        else itax=taxable*0.45-479.6;
        itax=Math.round(itax*1.021*10)/10;
        jumin=Math.max(0,Math.round((taxableBase*0.1-2.5)*10)/10);
      }
      // 住民税控除上限＝課税総所得金額等×5%（上限JUMIN_CTRL_MAX）
      const juminCtrlMax=Math.min(Math.round(taxableBase*0.05*10)/10, JUMIN_CTRL_MAX);
      const taxCapTotal=Math.round((itax+juminCtrlMax)*10)/10;
      lc2=Math.round(Math.min(calcCtrl, taxCapTotal)*10)/10;
      lc2=Math.max(0,lc2);
    }
    if(_lctrlDedMode!=='manual')R.lCtrl.push(ri(lc2));
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
        let fv2=0;
        if(endAge===0||pAge<=endAge){
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
        let netAccum=fv2;
        if(!isNisa){
          const costAccum=bal+monthly*12*(endAge>0&&pAge>endAge?(endAge-pBaseAge):yrs);
          const gainAccum=Math.max(0,fv2-costAccum);
          netAccum=Math.round(fv2-gainAccum*0.20315);
        }
        const lbl=customLabel||(isNisa?'NISA':'課税')+'積立(解約)';
        secRedeemMap[`accum-${p}-${sid}`]={lbl,val:netAccum};
        secRedeemTotal+=netAccum;
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
        const redeemVal=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        // 課税口座：譲渡益課税 20.315%
        let netStk=redeemVal;
        if(!isNisa){
          const gainStk=Math.max(0,redeemVal-bal);
          netStk=Math.round(redeemVal-gainStk*0.20315);
        }
        const lbl=customLabel||(isNisa?'NISA':'課税')+'一括(解約)';
        secRedeemMap[`stk-${p}-${sid}`]={lbl,val:netStk};
        secRedeemTotal+=netStk;
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
    R.incT.push(ri(hInc)+ri(wInc)+(ha===retPayAge?ri(retPay):0)+(wa===wRetPayAge?ri(wRetPay):0)+ri(oiTotal)+scTotal+insMatTotal+ri(secRedeemTotal)+(ha>=pHReceive&&(hDeathAge===0||ha<=hDeathAge)?ri(pSelf):0)+(wa>=pWReceive&&(wDeathAge===0||wa<=wDeathAge)&&hAlive?ri(pWife):0)+t+lc2+survP);
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
            if(i<ai){// 前段階：終了年まで複利を累積（to指定があればその年数、なければ0）
              runBase=sb*Math.pow(1+s.rate/100,s.to!==null?Math.max(0,s.to-s.from):0);
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
    const rentMonthly=(parseFloat(document.getElementById('rent-before')?.value)||0)/10000;
    const rentAmt=(!active&&delivery>0)?ri(rentMonthly*12):0;
    R.rent.push(rentAmt);

    // ─── ローン返済 ───
    const loanType2=document.getElementById('loan-type')?.value||'equal_payment';
    let lRep=0,_lRepH=0,_lRepW=0;
    if(pairLoanMode){
      if(active){
        if(lcYr<lhYrs)_lRepH=ri(lhType==='equal_payment'?mpay(lhAmt,lhYrs,effRate(lcYr,ratesH))*12:mpay_gankin_year(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr));
        if(lcYr<lwYrs)_lRepW=ri(lwType==='equal_payment'?mpay(lwAmt,lwYrs,effRate(lcYr,ratesW))*12:mpay_gankin_year(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr));
      }
      lRep=_lRepH+_lRepW;
    } else if(active&&lcYr<loanYrs){
      if(loanType2==='equal_payment'){
        lRep=ri(mpay(loanAmt,loanYrs,effRate(lcYr,rates))*12);
      } else {
        lRep=ri(mpay_gankin_year(loanAmt,loanYrs,effRate(lcYr,rates),lcYr));
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
    children.forEach((c,ci)=>{const ca=c.age+i;R.edu[ci].push(ca>=0&&ca<c.costs.length?c.costs[ca]:0)});
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
      const pRetAge=p==='h'?(iv('retire-age')||65):(iv('w-retire-age')||60);
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
        const lbl=customLabel||(isNisa?'NISA':'課税')+'積み立て';
        const bal=fv(`sec-bal-${p}-${sid}`)||0;
        const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        if(bal<=0&&monthly<=0)return; // 残高も積立額もなければスキップ
        const endAge=iv(`sec-end-${p}-${sid}`)||0;
        const rate=fvd(`sec-rate-${p}-${sid}`,5)/100;
        const yrs=i+1;
        let fv2=0;
        if(endAge===0||pAge<endAge){
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
        finRowMap[lbl]=(finRowMap[lbl]||0)+fv2;
        finRowPerson[lbl]=finRowPerson[lbl]&&finRowPerson[lbl]!==p?'both':p;
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
        const lbl=customLabel||(isNisa?'NISA':'課税')+'一括投資';
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;
        if(bal<=0)return; // 残高なければスキップ
        const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        finRowMap[lbl]=(finRowMap[lbl]||0)+Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
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
        let dcBal=0;
        if(pAge<d.receiveAge){
          if(pAge<d.retAge){
            dcBal=_fvWithInit(d.dcInitBal,totalMonthly,d.dcRate,yrs);
          }else{
            const yrsContrib=d.retAge-pBaseAge;
            const balAtRetire=_fvWithInit(d.dcInitBal,totalMonthly,d.dcRate,yrsContrib);
            const yrsAfter=yrs-yrsContrib;
            dcBal=balAtRetire*(d.dcRate>0?Math.pow(1+d.dcRate,Math.max(0,yrsAfter)):1);
          }
        }else if(_totalBalAtReceive>0){
          const elapsed=pAge-d.receiveAge;
          if(d.method==='lump') dcBal=0;
          else if(d.method==='annuity') dcBal=Math.round(_dcBalAtReceive)*Math.max(0,20-elapsed)/20;
          else dcBal=Math.round(_dcBalAtReceive/2)*Math.max(0,20-elapsed)/20;
        }
        if(dcBal>0){finRowMap[lbl]=(finRowMap[lbl]||0)+Math.round(dcBal);finRowPerson[lbl]=p;}
      }
      // iDeCo残高（finRowMap表示用）
      if(hasIdeco){
        const lbl=`iDeCo(${p==='h'?'ご主人様':'奥様'})`;
        const yrs=i+1;
        let idecoBal=0;
        if(pAge<d.receiveAge){
          if(pAge<d.retAge){
            idecoBal=_fvWithInit(d.idecoInitBal,d.idecoMonthly,d.idecoRate,yrs);
          }else{
            const yrsContrib=d.retAge-pBaseAge;
            const balAtRetire=_fvWithInit(d.idecoInitBal,d.idecoMonthly,d.idecoRate,yrsContrib);
            const yrsAfter=yrs-yrsContrib;
            idecoBal=balAtRetire*(d.idecoRate>0?Math.pow(1+d.idecoRate,Math.max(0,yrsAfter)):1);
          }
        }else if(_totalBalAtReceive>0){
          const elapsed=pAge-d.receiveAge;
          if(d.method==='lump') idecoBal=0;
          else if(d.method==='annuity') idecoBal=Math.round(_idecoBalAtReceive)*Math.max(0,20-elapsed)/20;
          else idecoBal=Math.round(_idecoBalAtReceive/2)*Math.max(0,20-elapsed)/20;
        }
        if(idecoBal>0){finRowMap[lbl]=(finRowMap[lbl]||0)+Math.round(idecoBal);finRowPerson[lbl]=p;}
      }
      // DC受取計算
      if(pAge>=d.receiveAge&&Math.round(_dcBalAtReceive)>0){
        const dcBR=Math.round(_dcBalAtReceive);
        if(d.method==='lump'){
          if(pAge===d.receiveAge){if(p==='h')dcReceiptH+=dcBR;else dcReceiptW+=dcBR;}
        }else if(d.method==='annuity'){
          const a=Math.round(dcBR/20);
          if(pAge<d.receiveAge+20){if(p==='h')dcReceiptH+=a;else dcReceiptW+=a;}
        }else{
          const half=Math.round(dcBR/2);
          if(pAge===d.receiveAge){if(p==='h')dcReceiptH+=half;else dcReceiptW+=half;}
          const aH=Math.round(half/20);
          if(pAge<d.receiveAge+20){if(p==='h')dcReceiptH+=aH;else dcReceiptW+=aH;}
        }
      }
      // iDeCo受取計算
      if(pAge>=d.receiveAge&&Math.round(_idecoBalAtReceive)>0){
        const iBR=Math.round(_idecoBalAtReceive);
        if(d.method==='lump'){
          if(pAge===d.receiveAge){if(p==='h')idecoReceiptH+=iBR;else idecoReceiptW+=iBR;}
        }else if(d.method==='annuity'){
          const a=Math.round(iBR/20);
          if(pAge<d.receiveAge+20){if(p==='h')idecoReceiptH+=a;else idecoReceiptW+=a;}
        }else{
          const half=Math.round(iBR/2);
          if(pAge===d.receiveAge){if(p==='h')idecoReceiptH+=half;else idecoReceiptW+=half;}
          const aH=Math.round(half/20);
          if(pAge<d.receiveAge+20){if(p==='h')idecoReceiptH+=aH;else idecoReceiptW+=aH;}
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
        R.finAssetRows.push({lbl:k,vals:new Array(i).fill(0),person:finRowPerson[k]||'both'});
      }
    });
    R.finAssetRows.forEach(row=>{row.vals.push(ri(finRowMap[row.lbl]||0));});
    const finAssetVal=Object.values(finRowMap).reduce((a,b)=>a+b,0);
    R.finAsset.push(ri(finAssetVal));
    R.totalAsset.push(R.sav[i]+ri(finAssetVal));// 預貯金残高＋その他金融資産
    const lb=ri(pairLoanMode
      ?(active?Math.max(0,(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr+1):0)+(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr+1):0)):lhAmt+lwAmt)
      :(active?Math.max(0,(loanType2==='equal_payment'?lbal(loanAmt,loanYrs,effRate(lcYr,rates),lcYr+1):lbal_gankin(loanAmt,loanYrs,lcYr+1))):loanAmt));
    R.lBal.push(lb);

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
    const incKeys=['hInc','wInc','otherInc','insMat','rPay','wRPay','pS','pW','survPension','scholarship','teate','lCtrl','dcReceiptH','dcReceiptW','idecoReceiptH','idecoReceiptW'];
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
    let childUnder18=0;
    children.forEach(c=>{const ca=c.age+i0;if(ca>=0&&ca<=18)childUnder18++;});
    const kiso0=calcKiso(childUnder18);
    const chukorei0=(kiso0===0&&wa0>=40&&wa0<65)?ri(61.43):0;
    let autoH;
    if(wa0>=pWReceive){
      // 2022年改正後は差額方式のみ（2/3・1/2方式は廃止）
      autoH=kisoW+Math.max(ri(koseiH*0.75),ri(koseiW))+kiso0+chukorei0;
    }else{
      autoH=ri(koseiH*0.75)+kiso0+chukorei0;
    }
    survHSpan.textContent=autoH.toLocaleString();
  }
  const survWSpan=document.getElementById('surv-w-auto-val');
  if(survWSpan&&wDeathAge>0){
    const i0=wDeathAge-wAge+1;
    const ha0=hAge+i0;
    let childUnder18=0;
    children.forEach(c=>{const ca=c.age+i0;if(ca>=0&&ca<=18)childUnder18++;});
    const kiso0=calcKiso(childUnder18);
    const hIncome0=getIncomeAtAge(hSteps,ha0);
    const autoW=(childUnder18>0||(ha0>=55&&hIncome0<850))?ri(koseiW*0.75)+kiso0:kiso0;
    survWSpan.textContent=autoW.toLocaleString();
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
