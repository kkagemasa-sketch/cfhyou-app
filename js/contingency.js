// contingency.js — 万が一シミュレーション
// ===== 万が一シミュレーション関数群 =====
function setMGTarget(t){
  mgTarget=t;
  $('mg-target-h').classList.toggle('on',t==='h');
  $('mg-target-w').classList.toggle('on',t==='w');
  updateMGHints();
}
function setMGDansin(on){
  mgDansin=on;
  $('mg-dansin-yes').classList.toggle('on',on);
  $('mg-dansin-no').classList.toggle('on',!on);
  $('mg-dansin-hint').textContent=on?'✓ 死亡時にローン残債がゼロになります':'⚠ ローン返済が継続します';
  $('mg-dansin-hint').className=on?'hint ok':'hint warn';
}
function setMGDansinPair(p,on){
  if(p==='h'){mgDansinH=on;$('mg-dansin-h-yes').classList.toggle('on',on);$('mg-dansin-h-no').classList.toggle('on',!on);}
  else{mgDansinW=on;$('mg-dansin-w-yes').classList.toggle('on',on);$('mg-dansin-w-no').classList.toggle('on',!on);}
}
function updateMGDansinUI(){
  const isPair=pairLoanMode;
  if($('mg-dansin-normal'))$('mg-dansin-normal').style.display=isPair?'none':'block';
  if($('mg-dansin-pair'))$('mg-dansin-pair').style.display=isPair?'block':'none';
}
function setMGSurvMode(m){
  // 廃止された 'detail' モードは 'auto' に寄せる
  if(m==='detail')m='auto';
  mgSurvMode=m;
  $('mg-surv-auto')?.classList.toggle('on',m==='auto');
  $('mg-surv-manual')?.classList.toggle('on',m==='manual');
  if($('mg-surv-auto-note'))$('mg-surv-auto-note').style.display=m==='auto'?'':'none';
  if($('mg-surv-manual-wrap'))$('mg-surv-manual-wrap').style.display=m==='manual'?'':'none';
  const hints={auto:'③収入欄の月収・ボーナス設定から自動計算します',manual:'手入力した金額を使用します'};
  if($('mg-surv-hint'))$('mg-surv-hint').textContent=hints[m]||hints.auto;
  live(true);
}
// 遺族基礎年金計算（2024年度）: 基本816,000円＋加算234,800円(1・2子)／78,300円(3子以降)
function calcKiso(n){
  if(n===0)return 0;
  if(n===1)return ri(81.6+23.48);
  if(n===2)return ri(81.6+23.48*2);
  return ri(81.6+23.48*2+7.83*(n-2));
}
function addMGInsurance(){
  mgInsCnt++;
  const cont=$('mg-insurance-cont');
  const d=document.createElement('div');d.className='g2';d.id=`mg-ins-${mgInsCnt}`;
  d.innerHTML=`<div class="fg"><label class="lbl">保険金名称</label>
    <input class="inp" id="mg-ins-name-${mgInsCnt}" placeholder="例：収入保障保険" oninput="live()"></div>
  <div class="fg"><label class="lbl">保険金額</label>
    <div style="display:flex;gap:4px;align-items:center"><div class="suf" style="flex:1"><input class="inp amt-inp" id="mg-ins-amt-${mgInsCnt}" type="number" value="0" min="0" oninput="live()"><span class="sl">万円</span></div>
    <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove()" style="background:#fee;color:#d63a2a;border:1px solid #fca;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px">✕</button></div></div>`;
  cont.appendChild(d);
}
function getMGCarOn(){return document.getElementById('mg-car-keep')?.classList.contains('act')!==false;}
function getMGParkOn(){return document.getElementById('mg-park-keep')?.classList.contains('act')!==false;}
function updateMGHints(){
  const ratio=parseInt($('mg-lc-ratio')?.value)||70;
  $('mg-lc-hint').textContent=`✓ 死亡後は現在の${ratio}%で計算`;
}
// 万が一生活費の段階設定
function addMGLCStep(){
  _mgLCStepCount++;
  const n=_mgLCStepCount;
  const isFirst=n===1;
  const cont=document.getElementById('mg-lc-steps-container');
  const d=document.createElement('div');
  d.className='mg-lc-step';
  d.style.cssText='background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;margin-bottom:6px';
  const modeToggle=isFirst?'':`
  <div style="display:flex;gap:3px;margin-bottom:4px">
    <button class="btn-tog on" id="mg-lsmode-free-${n}" onclick="setMGLCMode(${n},'free')" style="font-size:10px;padding:3px 8px">自由入力</button>
    <button class="btn-tog" id="mg-lsmode-pct-${n}" onclick="setMGLCMode(${n},'pct')" style="font-size:10px;padding:3px 8px">前段階の割合</button>
  </div>`;
  const pctWrap=isFirst?'':`
  <div id="mg-lspct-wrap-${n}" style="display:none;margin-bottom:4px">
    <label style="font-size:10px;color:#92400e;font-weight:600;display:block;margin-bottom:3px">前段階の金額の</label>
    <div class="suf" style="width:90px"><input class="inp amt-inp" id="mg-lspct-${n}" type="number" value="80" min="1" max="200" step="1" oninput="live()"><span class="sl">%</span></div>
  </div>`;
  const phBase=isFirst?'空欄=通常の生活費合計を使用':'空欄=前段階終了時の金額を引継ぎ';
  d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
    <span style="font-size:10px;font-weight:600;color:#64748b">段階${n}</span>
    <button onclick="this.parentElement.parentElement.remove();live()" style="background:#fee;color:#d63a2a;border:1px solid #fca;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px">✕</button>
  </div>
  ${modeToggle}
  <div id="mg-lsfree-wrap-${n}">
    <div class="g2" style="margin-bottom:4px">
      <div class="fg"><label class="lbl">金額</label>
        <div class="suf"><input class="inp amt-inp" id="mg-lsb-${n}" type="number" value="" placeholder="${phBase}" min="0" oninput="live()"><span class="sl">万円/年</span></div></div>
      <div class="fg"><label class="lbl">上昇率（0=横ばい）</label>
        <div class="suf"><input class="inp" id="mg-lsr-${n}" type="number" value="0" step="0.1" oninput="live()"><span class="sl">%/年</span></div></div>
    </div>
  </div>
  ${pctWrap}
  <div class="g2">
    <div class="fg"><label class="lbl">開始年</label>
      <div class="suf"><input class="inp age-inp" id="mg-lsf-${n}" type="number" value="" placeholder="${isFirst?new Date().getFullYear():'前段階+1'}" oninput="live()"><span class="sl">年</span></div></div>
    <div class="fg"><label class="lbl">終了年</label>
      <div class="suf"><input class="inp age-inp" id="mg-lst-${n}" type="number" value="" placeholder="空欄=ずっと" oninput="live()"><span class="sl">年</span></div></div>
  </div>`;
  cont.appendChild(d);
}
function setMGLCMode(n,mode){
  const isFree=mode==='free';
  $(`mg-lsmode-free-${n}`)?.classList.toggle('on',isFree);
  $(`mg-lsmode-pct-${n}`)?.classList.toggle('on',!isFree);
  const fw=$(`mg-lsfree-wrap-${n}`);
  const pw=$(`mg-lspct-wrap-${n}`);
  if(fw)fw.style.display=isFree?'':'none';
  if(pw)pw.style.display=isFree?'none':'block';
  live();
}
function getMGLCSteps(){
  const steps=[];
  let idx=0;
  document.querySelectorAll('.mg-lc-step').forEach(el=>{
    idx++;
    const isPct=el.querySelector(`[id$="lsmode-pct-${idx}"]`)?.classList.contains('on')||false;
    const baseEl=el.querySelector(`[id$="lsb-${idx}"]`);
    const rateEl=el.querySelector(`[id$="lsr-${idx}"]`);
    const fromEl=el.querySelector(`[id$="lsf-${idx}"]`);
    const toEl=el.querySelector(`[id$="lst-${idx}"]`);
    const pctEl=el.querySelector(`[id$="lspct-${idx}"]`);
    steps.push({
      base:isPct?0:(parseFloat(baseEl?.value)||0),
      rate:parseFloat(rateEl?.value)||0,
      fromYr:parseInt(fromEl?.value)||0,
      toYr:parseInt(toEl?.value)||0,
      mode:isPct?'pct':'free',
      pct:isPct?(parseFloat(pctEl?.value)||80):null
    });
  });
  return steps;
}
function getMGLCMode(){return document.getElementById('mg-lc-mode-step')?.classList.contains('act')?'step':'ratio';}
function getMGInsuranceTotal(){
  let total=0;
  document.querySelectorAll('[id^="mg-ins-amt-"]').forEach(el=>{total+=(parseFloat(el.value)||0);});
  return total;
}

// ===== 万が一CF表の計算・描画 =====
function renderContingency(){
  // 先に通常CF表を最新化
  render();
  if(!window.lastR){alert('先にCF表を生成してください');return;}
  const hAge=iv('husband-age')||30, wAge=iv('wife-age')||29;
  const deathYearOffset=iv('mg-death-year')||1;
  const deathYear=new Date().getFullYear()+deathYearOffset-1;
  const targetIsH=mgTarget==='h';
  const deathAge=targetIsH?hAge+deathYearOffset-1:wAge+deathYearOffset-1;

  // 通常render()の結果を取得
  const normalR=window.lastR;
  const disp=window.lastDisp;
  const cYear=window.lastCYear;
  const nm=_v('client-name')||'お客様';

  // ── 万が一CF表の計算 ──
  const loanAmt=fv('loan-amt'), loanYrs=iv('loan-yrs')||35, delivery=iv('delivery');
  const lhAmt=pairLoanMode?fv('loan-h-amt')||0:0;
  const lwAmt=pairLoanMode?fv('loan-w-amt')||0:0;
  const lhYrs=iv('loan-h-yrs')||35, lwYrs=iv('loan-w-yrs')||35;
  const rates=getRates();
  const rHBase=fv('rate-h-base')||0.5, rWBase=fv('rate-w-base')||0.5;
  const ratesH=pairLoanMode?getPairRates('h'):[], ratesW=pairLoanMode?getPairRates('w'):[];
  const mgLCMode=getMGLCMode();
  const lcRatio=(parseInt($('mg-lc-ratio')?.value)||70)/100;
  const mgLCSteps=mgLCMode==='step'?getMGLCSteps():[];
  const mgCarKeep=getMGCarOn();
  const mgParkKeep=getMGParkOn();
  const mgScholarOn=document.getElementById('mg-scholarship-yes')?.classList.contains('act');
  const mgScholarAmt=mgScholarOn?(fv('mg-scholarship-amt')||0):0;
  const mgScholarAge=iv('mg-scholarship-age')||19;
  const insTotal=getMGInsuranceTotal();
  const pSelf=fv('pension-h')||186, pWife=fv('pension-w')||66;
  const pHReceive=iv('pension-h-receive')||65;
  const pWReceive=iv('pension-w-receive')||65;
  const retPay=fv('retire-pay'), retPayAge=iv('retire-pay-age')||iv('retire-age')||65;
  const wRetPay=fv('w-retire-pay')||0, wRetPayAge=iv('w-retire-pay-age')||iv('w-retire-age')||60;
  const survManualAmt=fv('mg-surv-amt')||0;
  // 老齢基礎年金概算（2024年度満額81.6万円 × 加入年数/40年）
  const KISO_FULL=81.6;
  const retAge_mg=iv('retire-age')||65, wRetAge_mg=iv('w-retire-age')||60;
  const pHStart_mg=iv('pension-h-start')||22, pWStart_mg=iv('pension-w-start')||22;
  const kisoH_mg=ri(KISO_FULL*Math.min(retAge_mg-pHStart_mg,40)/40);
  const kisoW_mg=ri(KISO_FULL*Math.min(wRetAge_mg-pWStart_mg,40)/40);
  const koseiH_mg=Math.max(0,pSelf-kisoH_mg);
  const koseiW_mg=Math.max(0,pWife-kisoW_mg);

  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{
    const cid=el.id.split('-')[1];children.push({age:parseInt(el.value)||0,costs:eduCosts(cid)});
  });

  // 初期残高（通常と同じ）
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const zaikiHBal=fv('zaikei-h-bal')||0, zaikiWBal=fv('zaikei-w-bal')||0;
  const downPay0=fv('down-payment')||0;
  const downDeduct=(downType==='own')?downPay0:0;
  const costType0=document.getElementById('cost-type')?.value||'cash';
  const costDeduct=(costType0==='cash')?(fv('house-cost')||0):0;
  const moveDeduct=(fv('moving-cost')||0)+(fv('furniture-init')||0);
  const initSav=cashH+cashW+cashJoint+zaikiHBal+zaikiWBal-downDeduct-costDeduct-moveDeduct;

  let sav=initSav;
  const MR={yr:[],hA:[],wA:[],
    hInc:[],wInc:[],survPension:[],insPayArr:[],finLiquid:[],otherInc:[],scholarship:[],lCtrl:[],pS:[],pW:[],incT:[],
    lc:[],lRep:[],lRepH:[],lRepW:[],carTotal:[],prk:[],expT:[],bal:[],sav:[],lBal:[],
    finAsset:[],totalAsset:[],finAssetRows:null,
    needCoverage:0};

  // ── 死亡者の金融資産を死亡時に現金化するための事前計算 ──
  // 死亡者(p)の有価証券・DC・iDeCoの死亡時点FVを算出
  const _deadP=targetIsH?'h':'w';
  const _aliveP=targetIsH?'w':'h';
  const _deadBaseAge=targetIsH?hAge:wAge;
  const _deadDeathAge=targetIsH?hAge+deathYearOffset-1:wAge+deathYearOffset-1;
  const _yrsAtDeath=deathYearOffset; // i+1 at death year (i=deathYearOffset-1)
  let _deadFinTotal=0;
  // 積立型有価証券
  document.querySelectorAll(`[id^="sec-bal-${_deadP}-"]`).forEach(el=>{
    const parts=el.id.split('-');const sid=parts[parts.length-1];
    const isAccum=document.getElementById(`sec-acc-${_deadP}-${sid}`)?.classList.contains('on');
    if(!isAccum)return;
    const redeemAge=iv(`sec-redeem-${_deadP}-${sid}`)||0;
    if(redeemAge>0&&_deadDeathAge>=redeemAge)return; // 既に解約済み
    const bal=fv(`sec-bal-${_deadP}-${sid}`)||0;
    const monthly=fv(`sec-monthly-${_deadP}-${sid}`)||0;
    if(bal<=0&&monthly<=0)return;
    const endAge=iv(`sec-end-${_deadP}-${sid}`)||0;
    const rate=fvd(`sec-rate-${_deadP}-${sid}`,5)/100;
    const yrs=_yrsAtDeath;
    let fv2=0;
    if(endAge===0||_deadDeathAge<=endAge){
      const cpd=Math.pow(1+rate,yrs);const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
      fv2=bal*cpd+(mr>0?monthly*(cpd-1)/mr:monthly*12*yrs);
    }else{
      const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
      const yrsAccum=endAge-_deadBaseAge;const yrsAfter=yrs-yrsAccum;
      const cpdA=Math.pow(1+rate,yrsAccum);
      const balAtEnd=bal*cpdA+(mr>0?monthly*(cpdA-1)/mr:monthly*12*yrsAccum);
      fv2=balAtEnd*Math.pow(1+rate,Math.max(0,yrsAfter));
    }
    // 課税口座なら譲渡益課税を控除
    const isNisa=document.getElementById(`sec-nisa-${_deadP}-${sid}`)?.classList.contains('on');
    if(!isNisa){
      const costAccum=bal+monthly*12*(endAge>0&&_deadDeathAge>endAge?(endAge-_deadBaseAge):yrs);
      const gain=Math.max(0,fv2-costAccum);
      fv2=fv2-gain*0.20315;
    }
    _deadFinTotal+=Math.round(fv2);
  });
  // 一括投資
  document.querySelectorAll(`[id^="sec-stk-bal-${_deadP}-"]`).forEach(el=>{
    const parts=el.id.split('-');const sid=parts[parts.length-1];
    const isStock=document.getElementById(`sec-stock-${_deadP}-${sid}`)?.classList.contains('on');
    if(!isStock)return;
    const redeemAge=iv(`sec-stk-redeem-${_deadP}-${sid}`)||0;
    if(redeemAge>0&&_deadDeathAge>=redeemAge)return;
    const bal=fv(`sec-stk-bal-${_deadP}-${sid}`)||0;if(bal<=0)return;
    const investAge=iv(`sec-stk-age-${_deadP}-${sid}`)||0;
    if(investAge>0&&_deadDeathAge<investAge)return;
    const rate=(fv(`sec-div-${_deadP}-${sid}`)||0)/100;
    const yrsHeld=investAge>0?(_deadDeathAge-investAge):_yrsAtDeath;
    let val=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
    const isNisa=document.getElementById(`sec-nisa-${_deadP}-${sid}`)?.classList.contains('on');
    if(!isNisa){const gain=Math.max(0,val-bal);val=Math.round(val-gain*0.20315);}
    _deadFinTotal+=val;
  });
  // DC・iDeCo（死亡者分 — 受取前なら残高を現金化）
  const _deadDC={
    employer:fv(`dc-${_deadP}-employer`)||0,matching:fv(`dc-${_deadP}-matching`)||0,
    dcRate:fv(`dc-${_deadP}-rate`)/100, dcInitBal:fv(`dc-${_deadP}-bal`)||0,
    idecoMonthly:fv(`ideco-${_deadP}-monthly`)||0, idecoRate:fv(`ideco-${_deadP}-rate`)/100,
    idecoInitBal:fv(`ideco-${_deadP}-bal`)||0,
    receiveAge:iv(`dc-${_deadP}-receive-age`)||60,
    retAge:_deadP==='h'?retAge_mg:wRetAge_mg
  };
  {
    const _deadPBaseAge=_deadBaseAge;
    const dcTotal=_deadDC.employer+_deadDC.matching;
    const hasDC2=dcTotal>0||_deadDC.dcInitBal>0;
    const hasIdeco2=_deadDC.idecoMonthly>0||_deadDC.idecoInitBal>0;
    const _fvWI2=(initBal,monthly,rate,yrs)=>{
      const cpd=rate>0?Math.pow(1+rate,yrs):1;
      const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
      return initBal*cpd+(monthly>0?(mr>0?monthly*(cpd-1)/mr:monthly*12*yrs):0);
    };
    if(hasDC2&&_deadDeathAge<_deadDC.receiveAge){
      const yrsContrib=Math.min(_deadDC.retAge-_deadPBaseAge,_yrsAtDeath);
      const balAtEnd=_fvWI2(_deadDC.dcInitBal,dcTotal,_deadDC.dcRate,yrsContrib);
      const yrsAfter=Math.max(0,_yrsAtDeath-yrsContrib);
      _deadFinTotal+=Math.round(balAtEnd*(_deadDC.dcRate>0?Math.pow(1+_deadDC.dcRate,yrsAfter):1));
    }
    if(hasIdeco2&&_deadDeathAge<_deadDC.receiveAge){
      const yrsContrib=Math.min(_deadDC.retAge-_deadPBaseAge,_yrsAtDeath);
      const balAtEnd=_fvWI2(_deadDC.idecoInitBal,_deadDC.idecoMonthly,_deadDC.idecoRate,yrsContrib);
      const yrsAfter=Math.max(0,_yrsAtDeath-yrsContrib);
      _deadFinTotal+=Math.round(balAtEnd*(_deadDC.idecoRate>0?Math.pow(1+_deadDC.idecoRate,yrsAfter):1));
    }
  }
  _deadFinTotal=ri(_deadFinTotal);

  const hSteps=getIncomeSteps('h');
  const wSteps=getIncomeSteps('w');
  const totalYrs=Math.min(100-hAge,80);
  const mgDisp=disp;

  for(let i=0;i<totalYrs;i++){
    const yr=cYear+i, ha=hAge+i, wa=wAge+i;
    const active=i>=delivery, lcYr=i-delivery;
    MR.yr.push(yr);MR.hA.push(ha);MR.wA.push(wa);

    const isDead=i>=deathYearOffset-1;
    const isDeathYear=i===deathYearOffset-1;

    // ── 収入 ──
    let hInc=0, wInc=0;
    if(targetIsH){
      // ご主人死亡：ご主人収入=0、奥様収入=継続
      hInc=isDead?0:getIncomeAtAge(hSteps,ha);
      wInc=getIncomeAtAge(wSteps,wa);
    }else{
      // 奥様死亡：奥様収入=0、ご主人収入=継続
      hInc=getIncomeAtAge(hSteps,ha);
      wInc=isDead?0:getIncomeAtAge(wSteps,wa);
    }
    MR.hInc.push(ri(hInc));
    MR.wInc.push(ri(wInc));

    // 退職金（死亡前なら通常通り）
    let rPayVal=0;
    if(targetIsH){
      rPayVal=(isDead&&ha===retPayAge)?0:(ha===retPayAge?ri(retPay):0);
      rPayVal+=(wa===wRetPayAge?ri(wRetPay):0);
    }else{
      rPayVal=(ha===retPayAge?ri(retPay):0);
      rPayVal+=(isDead&&wa===wRetPayAge)?0:(wa===wRetPayAge?ri(wRetPay):0);
    }

    // 死亡保険金（死亡年のみ）
    const insPayVal=isDeathYear?insTotal:0;
    MR.insPayArr.push(insPayVal);

    // 遺族年金
    let survP=0;
    if(isDead){
      if(mgSurvMode==='manual'){
        survP=survManualAmt;
      }else{
        // 収入ステップがあれば生涯平均を精密計算、なければ月収×0.75で推定
        const CAREER_FACTOR=0.75;
        const hGrossM=fv('h-gross-monthly')||0, hGrossB=fv('h-gross-bonus')||0;
        const wGrossM=fv('w-gross-monthly')||0, wGrossB=fv('w-gross-bonus')||0;
        let kH=koseiH_mg, kW=koseiW_mg;
        const hAvg_mg=calcAvgHyojun('h', pHStart_mg, retAge_mg);
        if(hAvg_mg!==null){
          const hJoinM=Math.min(480,Math.max((retAge_mg-pHStart_mg)*12,300));
          kH=hAvg_mg*5.481/1000*hJoinM;
        }else if(hGrossM>0){
          const hCapped=Math.min(hGrossM,65), hBonusCapped=Math.min(hGrossB,300);
          const hHyojun=(hCapped*12+hBonusCapped)/12*CAREER_FACTOR;
          const hJoinM=Math.min(480,Math.max((retAge_mg-pHStart_mg)*12,300));
          kH=hHyojun*5.481/1000*hJoinM;
        }
        const wAvg_mg=calcAvgHyojun('w', pWStart_mg, wRetAge_mg);
        if(wAvg_mg!==null){
          const wJoinM=Math.min(480,Math.max((wRetAge_mg-pWStart_mg)*12,300));
          kW=wAvg_mg*5.481/1000*wJoinM;
        }else if(wGrossM>0){
          const wCapped=Math.min(wGrossM,65), wBonusCapped=Math.min(wGrossB,300);
          const wHyojun=(wCapped*12+wBonusCapped)/12*CAREER_FACTOR;
          const wJoinM=Math.min(480,Math.max((wRetAge_mg-pWStart_mg)*12,300));
          kW=wHyojun*5.481/1000*wJoinM;
        }
        if(targetIsH){
          let childUnder18=0;
          children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
          const kiso=calcKiso(childUnder18);
          // 中高齢寡婦加算（妻40〜64歳 かつ 遺族基礎年金なし）
          // ルートA: 夫死亡時に妻40歳以上で子なし（or子が既に18歳超）
          // ルートB: 夫死亡時に妻40歳未満でも、子が18歳超で基礎年金失権時に妻40歳以上
          const wAgeAtDeath=wAge+(deathAge-hAge);
          const hadChildren=children.some(c=>c.age+(deathYearOffset-1)<=18);
          const routeA=wAgeAtDeath>=40;
          const routeB=hadChildren&&wa>=40; // 子がいた→基礎年金失権後に40歳以上
          const chukorei=(kiso===0&&wa>=40&&wa<65&&(routeA||routeB))?ri(61.43):0;
          if(wa>=pWReceive){
            // 2022年改正後は差額方式のみ（2/3・1/2方式は廃止）
            survP=kisoW_mg+Math.max(ri(kH*0.75),ri(kW))+kiso+chukorei;
          }else{
            survP=ri(kH*0.75)+kiso+chukorei;
          }
        }else{
          // 奥様死亡→ご主人への遺族年金
          let childUnder18=0;
          children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
          const kiso=calcKiso(childUnder18);
          const hIncome=getIncomeAtAge(getIncomeSteps('h'),ha);
          if(childUnder18>0){
            // 子がいる場合：年齢制限なく遺族厚生＋遺族基礎を即支給
            survP=ri(kW*0.75)+kiso;
          }else if(ha>=60&&hIncome<850){
            // 60歳以上（子なし）：遺族厚生年金を支給
            if(ha>=pHReceive){
              // 老齢年金受給後：差額方式（自分の年金と遺族年金の高い方）
              survP=kisoH_mg+Math.max(ri(kW*0.75),ri(kH));
            }else{
              survP=ri(kW*0.75);
            }
          }else if(ha>=55&&ha<60&&hIncome<850){
            // 55〜59歳（子なし）：受給権はあるが支給停止
            survP=0;
          }else{
            survP=kiso;
          }
        }
      }
    }
    MR.survPension.push(survP);

    // その他収入（通常と同じ分を引用）
    const oiVal=i<normalR.otherInc.length?normalR.otherInc[i]:0;
    const teateVal=i<normalR.teate.length?normalR.teate[i]:0;
    // 住宅ローン控除（団信・ペアローン調整）
    const baseCtrl=i<normalR.lCtrl.length?normalR.lCtrl[i]:0;
    let lctrlVal;
    if(!isDead){
      lctrlVal=baseCtrl;
    }else if(!pairLoanMode){
      // 単独ローン：H死亡＋団信 → 控除消滅
      lctrlVal=(targetIsH&&mgDansin)?0:baseCtrl;
    }else{
      // ペアローン：死亡者の団信適用分を除外、残存ローン残高比率で按分
      if((targetIsH&&mgDansinH)||(!targetIsH&&mgDansinW)){
        if(active&&lcYr>=0){
          const hBal=(isDead&&targetIsH&&mgDansinH)?0:(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr):0);
          const wBal=(isDead&&!targetIsH&&mgDansinW)?0:(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr):0);
          const origHBal=lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr):0;
          const origWBal=lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr):0;
          const origTotal=origHBal+origWBal;
          lctrlVal=origTotal>0?Math.round(baseCtrl*(hBal+wBal)/origTotal):0;
        }else{
          lctrlVal=0;
        }
      }else{
        lctrlVal=baseCtrl;
      }
    }
    MR.lCtrl.push(lctrlVal);
    // 本人年金
    let pSelfVal=0, pWifeVal=0;
    if(targetIsH){
      pSelfVal=isDead?0:(ha>=pHReceive?ri(pSelf):0);
      pWifeVal=wa>=pWReceive?ri(pWife):0;
    }else{
      pSelfVal=ha>=pHReceive?ri(pSelf):0;
      pWifeVal=isDead?0:(wa>=pWReceive?ri(pWife):0);
    }
    // 遺族年金受給中は自身の年金と調整（高い方）
    if(isDead&&survP>0){
      if(targetIsH)pWifeVal=0;// 遺族年金に含まれるため
      else pSelfVal=0;
    }

    // 奨学金：通常分 + 万が一追加分（総額を一括で収入計上）
    let scholarVal=i<normalR.scholarship.length?(normalR.scholarship[i]||0):0;
    if(isDead&&mgScholarAmt>0&&children.length>0){
      const firstChildAge=children[0].age+i;
      if(firstChildAge===mgScholarAge){
        scholarVal+=mgScholarAmt;
      }
    }
    MR.scholarship.push(scholarVal);
    MR.pS.push(pSelfVal);
    MR.pW.push(pWifeVal);
    // 金融資産現金化（死亡年に死亡者の金融資産を一括収入計上）
    const finLiquidVal=isDeathYear?_deadFinTotal:0;
    MR.finLiquid.push(finLiquidVal);
    const incTotal=ri(hInc)+ri(wInc)+rPayVal+insPayVal+survP+oiVal+teateVal+lctrlVal+pSelfVal+pWifeVal+scholarVal+finLiquidVal;
    MR.incT.push(incTotal);

    // ── 支出 ──
    // 生活費（死亡後）
    const normalLC=i<normalR.lc.length?normalR.lc[i]:0;
    let lcVal=normalLC;
    if(isDead){
      if(mgLCMode==='step'&&mgLCSteps.length>0){
        // 段階設定モード：西暦ベースで判定
        // 割合モードの段階は前段階のbaseを参照
        for(let si=0;si<mgLCSteps.length;si++){
          const st=mgLCSteps[si];
          if(st.mode==='pct'&&si>0){
            const prevBase=mgLCSteps[si-1].base||normalLC;
            st.base=ri(prevBase*(st.pct||80)/100);
          }
          if(st.base<=0&&si===0)st.base=normalLC; // 段階1が空欄→通常生活費
        }
        const yr=MR.yr[i];
        let found=false;
        for(const st of mgLCSteps){
          const from=st.fromYr||0;
          const to=st.toYr||9999;
          if(yr>=from&&yr<=to){
            const yrInStep=yr-from;
            lcVal=ri(st.base*Math.pow(1+st.rate/100,yrInStep));
            found=true;break;
          }
        }
        if(!found){
          const last=mgLCSteps[mgLCSteps.length-1];
          const from=last.fromYr||0;
          const yrInStep=Math.max(0,yr-from);
          lcVal=ri(last.base*Math.pow(1+last.rate/100,yrInStep));
        }
      }else{
        // 割合モード
        lcVal=ri(normalLC*lcRatio);
      }
    }
    MR.lc.push(lcVal);

    // ローン返済（団信適用）
    let lRep=0,_mlRepH=0,_mlRepW=0;
    if(pairLoanMode){
      if(active){
        // ペアローン：死亡者の分は団信で免除
        let hLoanActive=true, wLoanActive=true;
        if(isDead&&targetIsH&&mgDansinH)hLoanActive=false;
        if(isDead&&!targetIsH&&mgDansinW)wLoanActive=false;
        if(hLoanActive&&lcYr<lhYrs){
          const lhType2=document.getElementById('loan-h-type')?.value||'equal_payment';
          _mlRepH=ri(lhType2==='equal_payment'?mpay(lhAmt,lhYrs,effRate(lcYr,ratesH))*12:mpay_gankin_year(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr));
        }
        if(wLoanActive&&lcYr<lwYrs){
          const lwType2=document.getElementById('loan-w-type')?.value||'equal_payment';
          _mlRepW=ri(lwType2==='equal_payment'?mpay(lwAmt,lwYrs,effRate(lcYr,ratesW))*12:mpay_gankin_year(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr));
        }
      }
      lRep=_mlRepH+_mlRepW;
    }else{
      // 通常ローン：団信で免除
      if(active&&lcYr<loanYrs){
        const dansinApplies=isDead&&targetIsH&&mgDansin;
        if(!dansinApplies){
          const loanType2=document.getElementById('loan-type')?.value||'equal_payment';
          const r=effRate(lcYr,rates);
          lRep=ri(loanType2==='equal_payment'?mpay(loanAmt,loanYrs,r)*12:mpay_gankin_year(loanAmt,loanYrs,r,lcYr));
        }
      }
    }
    MR.lRep.push(lRep);MR.lRepH.push(_mlRepH);MR.lRepW.push(_mlRepW);

    // その他支出（通常と同じ分を引用。車両・駐車場は個別制御）
    // 車両費：万が一用の設定で再計算（ご主人様/奥様別）
    let nCar=0;
    if(!mgCarKeep&&isDead){
      nCar=0;
    }else if(mgCarKeep&&isDead){
      // targetIsH=ご主人様死亡→遺族は奥様(h入力)、奥様死亡→遺族はご主人様(w入力)
      const cp=targetIsH?'h':'w';
      const mgCarPrice=fv(`mg-car-${cp}-price`)||300;
      const mgCarCycle=iv(`mg-car-${cp}-cycle`)||7;
      const mgCarInsp=fv(`mg-car-${cp}-insp`)||10;
      const mgCarEndAge=iv(`mg-car-${cp}-end-age`)||0;
      const survivorAge=targetIsH?wa:ha;
      if(mgCarEndAge>0&&survivorAge>mgCarEndAge){
        nCar=0;
      }else{
        const yrsFromDeath=i-(deathYearOffset-1);
        if(yrsFromDeath>=0){
          if(yrsFromDeath>0&&yrsFromDeath%mgCarCycle===0)nCar+=mgCarPrice;
          // 車検（初回3年後、以降2年ごと）
          const carAge=yrsFromDeath%mgCarCycle;
          if(carAge===3||(carAge>3&&(carAge-3)%2===0))nCar+=mgCarInsp;
        }
      }
    }else{
      nCar=i<normalR.carTotal.length?(normalR.carTotal[i]||0):0;
    }
    // 駐車場
    let nPrk=0;
    if(!mgParkKeep&&isDead){
      nPrk=0;
    }else if(mgParkKeep&&isDead){
      const mgParkAmt=fv('mg-parking')||15000;
      const mgParkFromAge=iv('mg-park-from-age')||0;
      const mgParkToAge=iv('mg-park-to-age')||0;
      const mgParkActive=(mgParkFromAge<=0||ha>=mgParkFromAge)&&(mgParkToAge<=0||ha<=mgParkToAge);
      nPrk=mgParkActive?ri(mgParkAmt*12/10000):0;
    }else{
      nPrk=i<normalR.prk.length?(normalR.prk[i]||0):0;
    }
    MR.carTotal.push(nCar);
    MR.prk.push(nPrk);
    // 通常のその他支出（生活費・ローン・車・駐車場を除く）
    const normalExpBase=(i<normalR.expT.length?normalR.expT[i]:0)
      -(i<normalR.lc.length?normalR.lc[i]:0)
      -(i<normalR.lRep.length?normalR.lRep[i]:0)
      -(i<normalR.carTotal.length?(normalR.carTotal[i]||0):0)
      -(i<normalR.prk.length?(normalR.prk[i]||0):0);
    const expTotal=lcVal+lRep+nCar+nPrk+Math.max(0,normalExpBase);
    MR.expT.push(expTotal);

    // 収支・残高
    const bal=incTotal-expTotal;
    MR.bal.push(bal);
    sav+=bal;
    MR.sav.push(ri(sav));

    // その他金融資産（生存者分のみ。死亡者分は死亡年に現金化済み）
    let mgFinAsset=i<normalR.finAsset.length?(normalR.finAsset[i]||0):0;
    if(isDead&&normalR.finAssetRows){
      // 死亡後：生存者分のみ残す（person属性で判定）
      mgFinAsset=0;
      const deadP=targetIsH?'h':'w';
      normalR.finAssetRows.forEach(row=>{
        const v=row.vals[i]||0;if(v<=0)return;
        // person='h','w','both' — 死亡者単独の行は除外、'both'は半額で近似
        if(row.person===deadP)return;
        if(row.person==='both')mgFinAsset+=Math.round(v/2);
        else mgFinAsset+=v;
      });
    }
    MR.finAsset.push(ri(mgFinAsset));
    MR.totalAsset.push(ri(sav)+ri(mgFinAsset));
  }

  // 必要保障額計算
  let minSav=Infinity;
  for(let i=deathYearOffset-1;i<mgDisp;i++){
    if(MR.sav[i]<minSav)minSav=MR.sav[i];
  }
  MR.needCoverage=minSav<0?Math.abs(minSav):0;

  // ── 表示 ──
  const isM=ST.type==='mansion';
  const targetLabel=targetIsH?'ご主人様':'奥様';
  let h=`<div class="r-summary" style="margin-top:30px;border-top:3px solid #c2185b;padding-top:16px">`;
  h+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <span style="background:#c2185b;color:#fff;padding:5px 14px;border-radius:99px;font-size:13px;font-weight:700">🛡️ 万が一CF表</span>
    <span style="font-size:13px;font-weight:600;color:#1e3a5f">${nm} 様 ─ ${targetLabel}が${deathAge}歳で死亡した場合</span>
  </div>`;

  // 対象者ラベル + 自己資金内訳 + 住宅ローン条件（通常CF表と同じ）
  const mgTargetLabel2=targetIsH?'ご主人様':'奥様';
  const mgSurvivorLabel=targetIsH?'奥様':'ご主人様';
  h+=`<div style="background:${targetIsH?'#1e40af':'#9f1239'};color:#fff;padding:8px 16px;border-radius:var(--rs);margin-bottom:10px;display:flex;align-items:center;gap:10px">
    <span style="font-size:18px">${targetIsH?'👔':'👗'}</span>
    <div>
      <div style="font-size:14px;font-weight:800">${nm} 様【万が一】${mgTargetLabel2}が${deathAge}歳で死亡した場合</div>
      <div style="font-size:10px;opacity:.8">${mgSurvivorLabel}が生活を継続するキャッシュフロー</div>
    </div>
  </div>`;
  // 自己資金の内訳（通常CF表と同じ）
  const N=normalR;
  const mgChip=(icon,label,val,valColor)=>`<div style="display:flex;align-items:center;gap:5px;padding:6px 13px;border-right:1px solid #dce6f0;white-space:nowrap;flex-shrink:0"><span>${icon}</span><span style="color:var(--muted);font-size:10px">${label}</span><strong style="color:${valColor||'var(--navy)'};font-family:'Cascadia Code','Consolas','Menlo',monospace;font-size:11px">${val}</strong></div>`;
  const mgArrow=`<div style="color:#b0bec5;font-size:13px;padding:0 2px;display:flex;align-items:center">▶</div>`;
  const housePrice2=fv('house-price')||0;
  const cashTotal2=(fv('cash-h')||0)+(fv('cash-w')||0)+(fv('cash-joint')||0);
  const downPay2=fv('down-payment')||0;
  const houseCost2=fv('house-cost')||0;
  const movCost2=(fv('moving-cost')||0)+(fv('furniture-init')||0);
  const loanAmt2=fv('loan-amount')||0;
  const loanYrs2=fv('loan-period')||35;
  const loanRate2=fv('loan-rate')||fv('rate-base')||0.5;
  h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:6px;background:#fff">
    <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">💰 自己資金の内訳</div>
    <div style="display:flex;flex-wrap:wrap;align-items:stretch">
      ${mgChip('🏦','現預金合計',cashTotal2.toLocaleString()+'万円')}${mgArrow}${mgChip('💴','頭金',downPay2.toLocaleString()+'万円','var(--red)')}${mgChip('📋','諸費用',houseCost2.toLocaleString()+'万円','var(--red)')}${mgChip('🚚','引越・家具',movCost2.toLocaleString()+'万円','var(--red)')}
    </div></div>`;
  // 段階金利チップ生成ヘルパー
  const _mgRateChips=(rArr)=>{
    if(rArr.length<=1)return '';
    return rArr.slice(1).map(s=>mgChip('📈',`${s.from+1}年目〜`,`${s.rate}%`)).join('');
  };
  if(pairLoanMode){
    const lhAmtV2=fv('loan-h-amt')||0, lwAmtV2=fv('loan-w-amt')||0;
    const rHBaseV2=fv('rate-h-base')||0.5, rWBaseV2=fv('rate-w-base')||0.5;
    const lhYrsV2=iv('loan-h-yrs')||35, lwYrsV2=iv('loan-w-yrs')||35;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（ペアローン）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏠','住宅価格',housePrice2.toLocaleString()+'万円')}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#1e5a9a;background:#f0f6ff">👔 ご主人様</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏦','借入額',lhAmtV2.toLocaleString()+'万円')}${mgChip('📊','当初金利',rHBaseV2+'%')}${_mgRateChips(getPairRates('h'))}${mgChip('📅','期間',lhYrsV2+'年')}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#9a1e5a;background:#fff0f6">👩 奥様</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏦','借入額',lwAmtV2.toLocaleString()+'万円')}${mgChip('📊','当初金利',rWBaseV2+'%')}${_mgRateChips(getPairRates('w'))}${mgChip('📅','期間',lwYrsV2+'年')}
      </div>
    </div>`;
  } else {
    const _mgRates=getRates();
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏠','住宅価格',housePrice2.toLocaleString()+'万円')}${mgChip('🏦','借入総額',loanAmt2.toLocaleString()+'万円')}${mgChip('📊','当初金利',loanRate2+'%')}${_mgRateChips(_mgRates)}${mgChip('📅','借入期間',loanYrs2+'年')}
      </div></div>`;
  }

  // CF表テーブル（通常CF表と同じ構造）
  const cLbls=['第一子','第二子','第三子','第四子'];
  // N=normalR は上で定義済み

  h+=`</div><div class="tbl-wrap"><table class="cf">`;
  h+=`<tr class="ryr"><th>カテゴリ</th><th>項目</th>`;
  for(let i=0;i<mgDisp;i++)h+=`<th>${MR.yr[i]}</th>`;
  h+=`<th>合計</th></tr>`;

  // 経過年数
  h+=`<tr class="relapsed"><td>経過年</td><td></td>`;
  for(let i=0;i<mgDisp;i++)h+=`<td>${i+1}</td>`;h+=`<td>-</td></tr>`;

  // 年齢（死亡後は✝マーク）
  h+=`<tr class="rage"><td>年齢</td><td>ご主人様</td>`;
  for(let i=0;i<mgDisp;i++){const d=targetIsH&&i>=deathYearOffset-1;h+=`<td style="${d?'color:#ccc':''}">${d?'✝'+MR.hA[i]:MR.hA[i]}</td>`;}
  h+=`<td></td></tr>`;
  h+=`<tr class="rage"><td></td><td>奥様</td>`;
  for(let i=0;i<mgDisp;i++){const d=!targetIsH&&i>=deathYearOffset-1;h+=`<td style="${d?'color:#ccc':''}">${d?'✝'+MR.wA[i]:MR.wA[i]}</td>`;}
  h+=`<td></td></tr>`;
  children.forEach((c,ci)=>{h+=`<tr class="rage"><td></td><td>${cLbls[ci]}</td>`;for(let i=0;i<mgDisp;i++)h+=`<td>${N.cA[ci][i]}</td>`;h+=`<td></td></tr>`;});

  // イベント（通常と同じ＋死亡イベント追加）
  h+=`<tr class="rev-h"><td>イベント</td><td>ご主人様</td>`;
  for(let i=0;i<mgDisp;i++){
    let ev=N.evH[i]||'';
    if(targetIsH&&i===deathYearOffset-1)ev='🕊️ ご逝去';
    else if(targetIsH&&i>deathYearOffset-1)ev='';
    h+=`<td>${ev}</td>`;
  }h+=`<td></td></tr>`;
  h+=`<tr class="rev-w"><td></td><td>奥様</td>`;
  for(let i=0;i<mgDisp;i++){
    let ev=N.evW[i]||'';
    if(!targetIsH&&i===deathYearOffset-1)ev='🕊️ ご逝去';
    else if(!targetIsH&&i>deathYearOffset-1)ev='';
    h+=`<td>${ev}</td>`;
  }h+=`<td></td></tr>`;
  children.forEach((c,ci)=>{
    h+=`<tr class="rev-c"><td></td><td>${cLbls[ci]}</td>`;
    for(let i=0;i<mgDisp;i++){
      const ca=N.cA[ci][i];let cls='',label=N.evC[ci][i]||'';
      if(ca>=1&&ca<=6)cls='ev-hoiku';
      else if(ca>=7&&ca<=12)cls='ev-elem';
      else if(ca>=13&&ca<=15)cls='ev-mid';
      else if(ca>=16&&ca<=18)cls='ev-high';
      else if(ca>=19){const un=_v(`cu-${ci+1}`)||'plit_h';const ul=(EDU.univ[un]||[]).length;if(ul>0&&ca<19+ul)cls=un.startsWith('senmon')?'ev-senmon':'ev-univ';}
      h+=`<td class="${cls}">${label}</td>`;
    }h+=`<td></td></tr>`;
  });

  // ─ 収入 ─（通常との差分をハイライト）
  h+=`<tr class="rcat inc-cat"><td></td><td>収　　入</td>`;for(let i=0;i<mgDisp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  // mgRow: normalArr（通常の値）と比較して差分をハイライト。行が0でも通常が0でなければ表示
  const mgRow=(lbl,arr,normalArr)=>{
    const tot=arr.slice(0,mgDisp).reduce((a,b)=>a+b,0);
    const nTot=normalArr?normalArr.slice(0,mgDisp).reduce((a,b)=>a+b,0):0;
    if(tot===0&&nTot===0)return'';// 両方0なら非表示
    let r=`<tr class="rinc"><td></td><td>${lbl}</td>`;
    for(let i=0;i<mgDisp;i++){
      const v=arr[i]||0;const nv=normalArr?(normalArr[i]||0):0;
      const changed=normalArr&&v!==nv;
      const cls=changed?(v===0?'mg-zero':'mg-changed'):(v===0?'vz':'');
      r+=`<td class="${cls}">${v>0?ri(v).toLocaleString():(changed?'0':'-')}</td>`;
    }
    const lblSpan=`<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${lbl}</span>`;
    return r+`<td>${ri(tot).toLocaleString()}${lblSpan}</td></tr>`;
  };

  // 収入行：年収 → 退職金 → 年金系 → 金融商品解約系 → 奨学金 → 児童手当 → 控除
  h+=mgRow('ご主人手取年収',MR.hInc,N.hInc);
  h+=mgRow('奥様手取年収',MR.wInc,N.wInc);
  h+=mgRow('副業・その他収入',N.otherInc);
  // 退職金（死亡者は受け取れない場合あり）
  const rPayMG=MR.hInc.map((_,i)=>{
    let v=0;
    const ha=hAge+i,wa=wAge+i;
    const retPayAge2=iv('retire-pay-age')||iv('retire-age')||65;
    const wRetPayAge2=iv('w-retire-pay-age')||iv('w-retire-age')||60;
    if(targetIsH){if(!(i>=deathYearOffset-1)&&ha===retPayAge2)v+=ri(fv('retire-pay'));if(wa===wRetPayAge2)v+=ri(fv('w-retire-pay'));}
    else{if(ha===retPayAge2)v+=ri(fv('retire-pay'));if(!(i>=deathYearOffset-1)&&wa===wRetPayAge2)v+=ri(fv('w-retire-pay'));}
    return v;
  });
  const rPayNormal=N.hInc.map((_,i)=>(N.rPay[i]||0)+(N.wRPay[i]||0));
  h+=mgRow('退職金',rPayMG,rPayNormal);
  h+=mgRow('本人年金',MR.pS,N.pS);
  h+=mgRow('配偶者年金',MR.pW,N.pW);
  h+=mgRow('遺族年金',MR.survPension,N.survPension);
  h+=mgRow('死亡保険金',MR.insPayArr);
  h+=mgRow('金融資産現金化',MR.finLiquid);
  h+=mgRow('保険満期金',N.insMat);
  if(N.secRedeemRows)N.secRedeemRows.forEach(row=>{h+=mgRow(row.lbl,row.vals);});
  h+=mgRow('奨学金',MR.scholarship,N.scholarship);
  h+=mgRow('児童手当',N.teate);
  h+=mgRow('住宅ローン控除',MR.lCtrl,N.lCtrl);
  // 収入合計
  h+=`<tr class="rinct"><td>収入合計</td><td></td>`;
  for(let i=0;i<mgDisp;i++)h+=`<td>${ri(MR.incT[i]).toLocaleString()}</td>`;
  h+=`<td>${ri(MR.incT.slice(0,mgDisp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">収入合計</span></td></tr>`;

  // ─ 支出 ─（通常との差分をハイライト）
  h+=`<tr class="rcat exp-cat"><td></td><td>支　　出</td>`;for(let i=0;i<mgDisp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const mgERow=(lbl,arr,normalArr)=>{
    const tot=arr.slice(0,mgDisp).reduce((a,b)=>a+b,0);
    const nTot=normalArr?normalArr.slice(0,mgDisp).reduce((a,b)=>a+b,0):0;
    if(tot===0&&nTot===0)return'';
    let r=`<tr class="rexp"><td></td><td>${lbl}</td>`;
    for(let i=0;i<mgDisp;i++){
      const v=arr[i]||0;const nv=normalArr?(normalArr[i]||0):0;
      const changed=normalArr&&v!==nv;
      const cls=changed?(v===0?'mg-zero':'mg-changed'):(v===0?'vz':'');
      r+=`<td class="${cls}">${v>0?ri(v).toLocaleString():(changed?'0':'-')}</td>`;
    }
    const eLblSpan=`<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${lbl}</span>`;
    return r+`<td>${ri(tot).toLocaleString()}${eLblSpan}</td></tr>`;
  };

  // 支出行：生活費 → 住宅系 → 教育費 → 車 → 駐車場 → 積立投資 → その他
  h+=mgERow('生活費',MR.lc,N.lc);
  h+=mgERow('家賃（引渡前）',N.rent);
  if(pairLoanMode){h+=mgERow('ローン返済(主)',MR.lRepH,N.lRepH);h+=mgERow('ローン返済(奥様)',MR.lRepW,N.lRepW);}
  else{h+=mgERow('住宅ローン返済',MR.lRep,N.lRep);}
  if(isM)h+=mgERow('修繕積立金',N.rep);
  h+=mgERow('固定資産税',N.ptx);
  h+=mgERow('家具家電買替',N.furn);
  h+=mgERow(isM?'専有部分修繕費':'修繕費',N.senyu);
  children.forEach((c,ci)=>{
    const eduArr=N.edu[ci];
    const tot=eduArr.slice(0,mgDisp).reduce((a,b)=>a+b,0);if(tot===0)return;
    const un=_v(`cu-${ci+1}`)||'plit_h';const univLen=(EDU.univ[un]||[]).length;
    h+=`<tr class="rexp"><td></td><td>${cLbls[ci]}教育費</td>`;
    for(let i=0;i<mgDisp;i++){
      const v=eduArr[i]||0;const ca=c.age+i;
      let cls=v===0?'vz':'';
      if(v>0){if(ca>=1&&ca<=6)cls='edu-hoiku';else if(ca>=7&&ca<=12)cls='edu-elem';else if(ca>=13&&ca<=15)cls='edu-mid';else if(ca>=16&&ca<=18)cls='edu-high';else if(ca>=19&&ca<19+univLen)cls=un.startsWith('senmon')?'edu-senmon':'edu-univ';}
      h+=`<td class="${cls}">${v>0?ri(v).toLocaleString():'-'}</td>`;
    }h+=`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${cLbls[ci]}教育費</span></td></tr>`;
  });
  h+=mgERow('車両費（購入・車検）',MR.carTotal,N.carTotal);
  h+=mgERow('駐車場代',MR.prk,N.prk);
  h+=mgERow('積立投資額',N.secInvest);
  h+=mgERow('一括投資額',N.secBuy);
  h+=mgERow('結婚のお祝い',N.wedding);
  h+=mgERow('特別支出',N.ext);

  // 支出合計
  h+=`<tr class="rexpt"><td>支出合計</td><td></td>`;
  for(let i=0;i<mgDisp;i++)h+=`<td>${ri(MR.expT[i]).toLocaleString()}</td>`;
  h+=`<td>${ri(MR.expT.slice(0,mgDisp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">支出合計</span></td></tr>`;

  // ─ 収支・残高 ─
  h+=`<tr class="rbal"><td>年間収支</td><td></td>`;
  for(let i=0;i<mgDisp;i++){const v=ri(MR.bal[i]);h+=`<td class="${v<0?'vn':v>0?'vp':'vz'}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`;}
  h+=`<td><br><span style="font-size:9px;color:var(--navy);font-weight:400">年間収支</span></td></tr>`;

  h+=`<tr class="rsav"><td>預貯金残高</td><td></td>`;
  for(let i=0;i<mgDisp;i++){const v=ri(MR.sav[i]);h+=`<td class="${v<0?'vn':''}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`;}
  h+=`<td>${ri(MR.sav[mgDisp-1]).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-weight:400">預貯金残高</span></td></tr>`;

  // その他金融資産（生存者分のみ）
  const _hasFinAsset=MR.finAsset.some(v=>v>0);
  if(_hasFinAsset){
    h+=`<tr class="rfin"><td>その他金融資産</td><td></td>`;
    for(let i=0;i<mgDisp;i++){const v=ri(MR.finAsset[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`;}
    h+=`<td>${ri(MR.finAsset[mgDisp-1]).toLocaleString()}<br><span style="font-size:9px;color:var(--navy);font-weight:400">その他金融資産</span></td></tr>`;
  }
  // 総資産残高
  h+=`<tr class="rtotal"><td>総資産残高</td><td></td>`;
  for(let i=0;i<mgDisp;i++){const v=ri(MR.totalAsset[i]);h+=`<td class="${v<0?'vn':''}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`;}
  h+=`<td>${ri(MR.totalAsset[mgDisp-1]).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-weight:400">総資産残高</span></td></tr>`;

  h+=`</table></div>`;
  h+=`</div>`;

  // タブ別に保存
  if(!window._mgStore)window._mgStore={};
  const mgKey=targetIsH?'h':'w';
  window._mgStore[mgKey]=h;
  MR._deathOffset=deathYearOffset;
  MR._targetIsH=targetIsH;
  window.lastMR=MR;
  // タブごとにMRも保存
  if(!window._mgMRStore)window._mgMRStore={};
  window._mgMRStore[mgKey]=MR;
  window._mgHTML=null;

  // タブボタンを表示（シナリオ名入り）
  const tabId=targetIsH?'rt-mg-h':'rt-mg-w';
  $(tabId).style.display='';
  const _mgScenName=scenarios?.find(s=>s.id===activeScenarioId)?.name||'';
  const _mgPersonLbl=targetIsH?'ご主人様':'奥様';
  $(tabId).textContent=`🛡️ ${_mgScenName?_mgScenName+' ':''}万が一（${_mgPersonLbl}）`;

  // 自動でそのタブに切り替え
  setRTab(targetIsH?'mg-h':'mg-w');
}
