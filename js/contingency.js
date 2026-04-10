// contingency.js — 万が一シミュレーション
// ===== 万が一シミュレーション関数群 =====
function setMGTarget(t){
  mgTarget=t;
  $('mg-target-h').classList.toggle('on',t==='h');
  $('mg-target-w').classList.toggle('on',t==='w');
  updateMGCarParkVisibility();
  updateMGHints();
}
// 車両費・駐車場の継続/なしボタン
function setMGCarPark(type,on){
  $(`mg-${type}-keep`).classList.toggle('on',on);
  $(`mg-${type}-stop`).classList.toggle('on',!on);
  if(type==='car'){
    updateMGCarParkVisibility();
  }else{
    $('mg-park-fields').style.display=on?'':'none';
    updateMGCarParkVisibility();
  }
  live();
}
// ターゲットに応じて車両フィールドの表示を切替
function updateMGCarParkVisibility(){
  const carOn=$('mg-car-keep')?.classList.contains('on');
  const parkOn=$('mg-park-keep')?.classList.contains('on');
  const t=mgTarget;
  const hF=$('mg-car-fields-h'),wF=$('mg-car-fields-w');
  if(!carOn){if(hF)hF.style.display='none';if(wF)wF.style.display='none';}
  else{
    if(hF)hF.style.display=t==='h'?'':'none';
    if(wF)wF.style.display=t==='w'?'':'none';
  }
  const phF=$('mg-park-age-h'),pwF=$('mg-park-age-w');
  if(!parkOn){if(phF)phF.style.display='none';if(pwF)pwF.style.display='none';}
  else{
    if(phF)phF.style.display=t==='h'?'':'none';
    if(pwF)pwF.style.display=t==='w'?'':'none';
  }
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
// 老齢年金の簡易手取り率（年金額面・給与所得有無で段階式）
function pensionNetRate(amt,hasWork){
  if(hasWork){// 社保は給与天引き済、公的年金等控除110万以下は非課税
    if(amt<=110)return 1.00;if(amt<=250)return 0.93;return 0.90;
  }else{// 国保+介護≈10%＋税
    if(amt<=110)return 0.92;if(amt<=155)return 0.90;if(amt<=250)return 0.87;return 0.83;
  }
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
function getMGCarOn(){return document.getElementById('mg-car-keep')?.classList.contains('on')!==false;}
function getMGParkOn(){return document.getElementById('mg-park-keep')?.classList.contains('on')!==false;}
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
function getMGLCMode(){return document.getElementById('mg-lc-mode-step')?.classList.contains('on')?'step':'ratio';}
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
  const _mgIsFlat=loanCategory==='flat35';
  const _mgFlatPair=_mgIsFlat&&pairLoanMode;
  const loanAmt=fv('loan-amt'), delivery=iv('delivery');
  const loanYrs=_mgIsFlat?(_mgFlatPair?Math.max(iv('flat-loan-h-yrs')||35,iv('flat-loan-w-yrs')||35):(iv('flat-loan-yrs')||35)):(iv('loan-yrs')||35);
  const lhAmt=_mgFlatPair?(fv('flat-loan-h-amt')||0):(pairLoanMode?fv('loan-h-amt')||0:0);
  const lwAmt=_mgFlatPair?(fv('flat-loan-w-amt')||0):(pairLoanMode?fv('loan-w-amt')||0:0);
  const lhYrs=_mgFlatPair?(iv('flat-loan-h-yrs')||35):(iv('loan-h-yrs')||35);
  const lwYrs=_mgFlatPair?(iv('flat-loan-w-yrs')||35):(iv('loan-w-yrs')||35);
  const rates=_mgIsFlat?getFlat35Rates():getRates();
  const rHBase=fv('rate-h-base')||0.5, rWBase=fv('rate-w-base')||0.5;
  const ratesH=_mgFlatPair?rates:(pairLoanMode?getPairRates('h'):[]);
  const ratesW=_mgFlatPair?rates:(pairLoanMode?getPairRates('w'):[]);
  const mgLCMode=getMGLCMode();
  const lcRatio=(parseInt($('mg-lc-ratio')?.value)||70)/100;
  const mgLCSteps=mgLCMode==='step'?getMGLCSteps():[];
  const mgCarKeep=getMGCarOn();
  const mgParkKeep=getMGParkOn();
  const mgScholarOn=document.getElementById('mg-scholarship-yes')?.classList.contains('on');
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
  const koseiH_mg=calcKosei('h', pHStart_mg, retAge_mg, pSelf, kisoH_mg);
  const koseiW_mg=calcKosei('w', pWStart_mg, wRetAge_mg, pWife, kisoW_mg);

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
    hInc:[],wInc:[],rPay:[],wRPay:[],survPension:[],insPayArr:[],finLiquid:[],otherInc:[],scholarship:[],
    lCtrl:[],pS:[],pW:[],teate:[],insMat:[],secRedeem:[],secRedeemRows:null,
    dcReceiptH:[],dcReceiptW:[],idecoReceiptH:[],idecoReceiptW:[],incT:[],
    lc:[],lRep:[],lRepH:[],lRepW:[],rep:[],ptx:[],furn:[],senyu:[],edu:[],rent:[],
    secInvest:[],secBuy:[],insMonthly:[],insLumpExp:[],
    dcMatchExpH:[],dcMatchExpW:[],idecoExpH:[],idecoExpW:[],
    carTotal:[],prk:[],wedding:[],ext:[],houseCostArr:[],moveInCost:[],expT:[],
    bal:[],sav:[],savExtra:[],lBal:[],
    finAsset:[],totalAsset:[],finAssetRows:null,
    evH:[],evW:[],evC:[],
    needCoverage:0};
  children.forEach(()=>{MR.edu.push([]);MR.evC.push([]);});

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

  // ── 生存者のDC/iDeCo設定 ──
  const dcIdeco_mg={};
  [_aliveP].forEach(p=>{
    const pRetAge=p==='h'?retAge_mg:wRetAge_mg;
    dcIdeco_mg[p]={
      employer:fv(`dc-${p}-employer`)||0, matching:fv(`dc-${p}-matching`)||0,
      dcRate:fv(`dc-${p}-rate`)/100, dcInitBal:fv(`dc-${p}-bal`)||0,
      idecoMonthly:fv(`ideco-${p}-monthly`)||0, idecoRate:fv(`ideco-${p}-rate`)/100,
      idecoInitBal:fv(`ideco-${p}-bal`)||0,
      receiveAge:iv(`dc-${p}-receive-age`)||60,
      method:document.getElementById(`dc-${p}-method`)?.value||'lump',
      retAge:pRetAge
    };
  });
  const _fvWithInit_mg=(initBal,monthly,rate,yrs)=>{
    const cpd=rate>0?Math.pow(1+rate,yrs):1;
    const mr=rate>0?Math.pow(1+rate,1/12)-1:0;
    return initBal*cpd+(monthly>0?(mr>0?monthly*(cpd-1)/mr:monthly*12*yrs):0);
  };

  const hSteps=getIncomeSteps('h');
  const wSteps=getIncomeSteps('w');
  const leaves_mg=getLeaves();
  const totalYrs=Math.min(100-hAge,80);
  const mgDisp=disp;
  const isM_mg=ST.type==='mansion';
  const sqm_mg=fvd('sqm',75);
  const parking_mg=fv('parking')/10000;
  const propTax_mg=fv('prop-tax')/10000;
  const choki_mg=iv('choki');
  const taxRed_mg=isM_mg?PROP_TAX_RELIEF.mansion_general:(choki_mg?PROP_TAX_RELIEF.kodate_choki:PROP_TAX_RELIEF.kodate_general);
  const extraItems_mg=getExtraItems();

  for(let i=0;i<totalYrs;i++){
    const yr=cYear+i, ha=hAge+i, wa=wAge+i;
    const active=i>=delivery, lcYr=i-delivery;
    MR.yr.push(yr);MR.hA.push(ha);MR.wA.push(wa);

    const isDead=i>=deathYearOffset-1;
    const isDeathYear=i===deathYearOffset-1;
    let dcReceiptH_mg=0,dcReceiptW_mg=0,idecoReceiptH_mg=0,idecoReceiptW_mg=0;

    // ── 収入 ──
    let hInc=0, wInc=0;
    if(targetIsH){
      hInc=isDead?0:getIncomeAtAge(hSteps,ha);
      // 奥様の産休・育休考慮
      const leave=leaves_mg.find(l=>wa>=l.startAge&&wa<l.endAge);
      wInc=leave?ri(leave.income):getIncomeAtAge(wSteps,wa);
    }else{
      hInc=getIncomeAtAge(hSteps,ha);
      wInc=isDead?0:(()=>{const leave=leaves_mg.find(l=>wa>=l.startAge&&wa<l.endAge);return leave?ri(leave.income):getIncomeAtAge(wSteps,wa);})();
    }
    // 生存者のDC/iDeCo節税効果
    if(!isDead||!targetIsH){
      if(hInc>0&&dcIdeco_mg.h&&ha<dcIdeco_mg.h.retAge){
        const ded=(dcIdeco_mg.h.matching+dcIdeco_mg.h.idecoMonthly)*12;
        if(ded>0){const sv=estimateTaxSaving(hInc,ded);hInc+=sv.total;}
      }
    }
    if(!isDead||targetIsH){
      if(wInc>0&&dcIdeco_mg.w&&wa<dcIdeco_mg.w.retAge){
        const ded=(dcIdeco_mg.w.matching+dcIdeco_mg.w.idecoMonthly)*12;
        if(ded>0){const sv=estimateTaxSaving(wInc,ded);wInc+=sv.total;}
      }
    }
    MR.hInc.push(ri(hInc));
    MR.wInc.push(ri(wInc));

    // 退職金（死亡後は受け取れない）
    const rPayH=targetIsH?(isDead?0:(ha===retPayAge?ri(retPay):0)):(ha===retPayAge?ri(retPay):0);
    const rPayW=targetIsH?(wa===wRetPayAge?ri(wRetPay):0):(isDead?0:(wa===wRetPayAge?ri(wRetPay):0));
    MR.rPay.push(rPayH);
    MR.wRPay.push(rPayW);

    // 死亡保険金（死亡年のみ）
    const insPayVal=isDeathYear?insTotal:0;
    MR.insPayArr.push(insPayVal);

    // 遺族年金（既存ロジック維持）
    let survP=0;
    if(isDead){
      if(mgSurvMode==='manual'){
        survP=survManualAmt;
      }else{
        // koseiH_mg/koseiW_mg は既にcalcKosei()で精密計算済み
        const kH=koseiH_mg, kW=koseiW_mg;
        if(targetIsH){
          let childUnder18=0;children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
          const kiso=calcKiso(childUnder18);
          const wAgeAtDeath=wAge+(deathAge-hAge);
          const hadChildren=children.some(c=>c.age+(deathYearOffset-1)<=18);
          const routeA=wAgeAtDeath>=40;const routeB=hadChildren&&wa>=40;
          const chukorei=(kiso===0&&wa>=40&&wa<65&&(routeA||routeB))?ri(61.43):0;
          // 遺族年金＝純粋な遺族厚生年金部分のみ（老齢年金は別行表示）
          if(wa>=pWReceive){survP=Math.max(ri(kH*0.75)-koseiW_mg,0)+kiso+chukorei;}
          else{survP=ri(kH*0.75)+kiso+chukorei;}
        }else{
          let childUnder18=0;children.forEach(c=>{const ca=c.age+i;if(ca>=0&&ca<=18)childUnder18++;});
          const kiso=calcKiso(childUnder18);
          const hIncome=getIncomeAtAge(getIncomeSteps('h'),ha);
          // 遺族年金＝純粋な遺族厚生年金部分のみ（老齢年金は別行表示）
          if(childUnder18>0){if(ha>=pHReceive){survP=Math.max(ri(kW*0.75)-koseiH_mg,0)+kiso;}else{survP=ri(kW*0.75)+kiso;}}
          else if(ha>=60&&hIncome<850){if(ha>=pHReceive){survP=Math.max(ri(kW*0.75)-koseiH_mg,0);}else{survP=ri(kW*0.75);}}
          else if(ha>=55&&ha<60&&hIncome<850){survP=0;}
          else{survP=kiso;}
        }
      }
    }
    MR.survPension.push(survP);

    // その他収入
    const oiVal=i<normalR.otherInc.length?normalR.otherInc[i]:0;
    MR.otherInc.push(oiVal);

    // 児童手当（死亡後は遺族が受け取る）
    const teateVal=i<normalR.teate.length?normalR.teate[i]:0;
    MR.teate.push(teateVal);

    // 住宅ローン控除（団信・ペアローン調整）
    const baseCtrl=i<normalR.lCtrl.length?normalR.lCtrl[i]:0;
    let lctrlVal;
    if(!isDead){lctrlVal=baseCtrl;}
    else if(!pairLoanMode){lctrlVal=(targetIsH&&mgDansin)?0:baseCtrl;}
    else{
      if((targetIsH&&mgDansinH)||(!targetIsH&&mgDansinW)){
        if(active&&lcYr>=0){
          const hBal2=(isDead&&targetIsH&&mgDansinH)?0:(lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr):0);
          const wBal2=(isDead&&!targetIsH&&mgDansinW)?0:(lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr):0);
          const origHBal=lhAmt>0&&lcYr<lhYrs?lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr):0;
          const origWBal=lwAmt>0&&lcYr<lwYrs?lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr):0;
          const origTotal=origHBal+origWBal;
          lctrlVal=origTotal>0?Math.round(baseCtrl*(hBal2+wBal2)/origTotal):0;
        }else{lctrlVal=0;}
      }else{lctrlVal=baseCtrl;}
    }
    MR.lCtrl.push(lctrlVal);

    // 本人年金（老齢年金は手取り率を適用、遺族年金は非課税で別行）
    let pSelfVal=0, pWifeVal=0;
    if(targetIsH){pSelfVal=isDead?0:(ha>=pHReceive?ri(pSelf):0);pWifeVal=wa>=pWReceive?ri(pWife):0;}
    else{pSelfVal=ha>=pHReceive?ri(pSelf):0;pWifeVal=isDead?0:(wa>=pWReceive?ri(pWife):0);}
    if(pSelfVal>0)pSelfVal=ri(pSelfVal*pensionNetRate(pSelfVal,hInc>0));
    if(pWifeVal>0)pWifeVal=ri(pWifeVal*pensionNetRate(pWifeVal,wInc>0));
    MR.pS.push(pSelfVal);
    MR.pW.push(pWifeVal);

    // 奨学金
    let scholarVal=i<normalR.scholarship.length?(normalR.scholarship[i]||0):0;
    if(isDead&&mgScholarAmt>0&&children.length>0){
      const firstChildAge=children[0].age+i;
      if(firstChildAge===mgScholarAge)scholarVal+=mgScholarAmt;
    }
    MR.scholarship.push(scholarVal);

    // 金融資産現金化（死亡年に死亡者の金融資産を一括収入計上）
    const finLiquidVal=isDeathYear?_deadFinTotal:0;
    MR.finLiquid.push(finLiquidVal);

    // 保険満期金（生存者のみ）
    let insMatVal=0;
    const _alivePers=isDead?[_aliveP]:['h','w'];
    _alivePers.forEach(p=>{
      const pAge=p==='h'?ha:wa;const pBaseAge=p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="ins-m-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const matAmt=fv(`ins-mat-${p}-${iid}`)||0;const matAge=iv(`ins-age-${p}-${iid}`)||0;
        const redeemAge=iv(`ins-redeem-${p}-${iid}`)||0;
        if(matAmt>0&&matAge>0&&pAge===matAge&&(redeemAge<=0||redeemAge>=matAge))insMatVal+=matAmt;
      });
      document.querySelectorAll(`[id^="ins-lump-enroll-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const iid=parts[parts.length-1];
        const enrollAge=iv(`ins-lump-enroll-${p}-${iid}`)||pBaseAge;
        const amt=fv(`ins-lump-amt-${p}-${iid}`)||0;const matAge=iv(`ins-lump-matage-${p}-${iid}`)||0;
        const rate=fv(`ins-lump-rate-${p}-${iid}`)||0;const matAmtFixed=fv(`ins-lump-matamt-${p}-${iid}`)||0;
        const pct=fv(`ins-lump-pct-${p}-${iid}`)||0;
        if(amt<=0||matAge<=0||pAge!==matAge)return;
        const yrs=matAge-enrollAge;let matVal=0;
        if(rate>0)matVal=Math.round(amt*Math.pow(1+rate/100,yrs)*10)/10;
        else if(matAmtFixed>0)matVal=matAmtFixed;
        else if(pct>0)matVal=Math.round(amt*pct/100*10)/10;
        insMatVal+=matVal;
      });
    });
    MR.insMat.push(insMatVal);

    // 有価証券解約（生存者のみ）
    if(!MR.secRedeemRows)MR.secRedeemRows=[];
    let secRedeemTotal=0;
    const secRedeemMap_mg={};
    _alivePers.forEach(p=>{
      const pAge=p==='h'?ha:wa;const pBaseAge=p==='h'?hAge:wAge;
      document.querySelectorAll(`[id^="sec-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isAccum=document.getElementById(`sec-acc-${p}-${sid}`)?.classList.contains('on');if(!isAccum)return;
        const redeemAge=iv(`sec-redeem-${p}-${sid}`)||0;if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-bal-${p}-${sid}`)||0;const monthly=fv(`sec-monthly-${p}-${sid}`)||0;
        const endAge=iv(`sec-end-${p}-${sid}`)||0;const rate=fvd(`sec-rate-${p}-${sid}`,5)/100;
        const yrs=i+1;let fv2=0;
        if(endAge===0||pAge<=endAge){const cpd=Math.pow(1+rate,yrs);const mr2=rate>0?Math.pow(1+rate,1/12)-1:0;fv2=Math.round(bal*cpd+(mr2>0?monthly*(cpd-1)/mr2:monthly*12*yrs));}
        else{const mr2=rate>0?Math.pow(1+rate,1/12)-1:0;const yrsA=endAge-pBaseAge;const cpdA=Math.pow(1+rate,yrsA);const bAE=bal*cpdA+(mr2>0?monthly*(cpdA-1)/mr2:monthly*12*yrsA);fv2=Math.round(bAE*Math.pow(1+rate,Math.max(0,yrs-yrsA)));}
        const customLabel=document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'';
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        let net=fv2;if(!isNisa){const cost=bal+monthly*12*(endAge>0&&pAge>endAge?(endAge-pBaseAge):yrs);net=Math.round(fv2-Math.max(0,fv2-cost)*0.20315);}
        const lbl=customLabel||(isNisa?'NISA':'課税')+'積立(解約)';
        secRedeemMap_mg[`accum-${p}-${sid}`]={lbl,val:net};secRedeemTotal+=net;
      });
      document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
        const parts=el.id.split('-');const sid=parts[parts.length-1];
        const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');if(!isStock)return;
        const redeemAge=iv(`sec-stk-redeem-${p}-${sid}`)||0;if(redeemAge<=0||pAge!==redeemAge)return;
        const bal=fv(`sec-stk-bal-${p}-${sid}`)||0;if(bal<=0)return;
        const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;const rate=(fv(`sec-div-${p}-${sid}`)||0)/100;
        const yrsHeld=investAge>0?(pAge-investAge):(i+1);
        let val=Math.round(bal*Math.pow(1+rate,Math.max(0,yrsHeld)));
        const isNisa=document.getElementById(`sec-nisa-${p}-${sid}`)?.classList.contains('on');
        if(!isNisa){val=Math.round(val-Math.max(0,val-bal)*0.20315);}
        const lbl=(document.getElementById(`sec-label-${p}-${sid}`)?.value?.trim()||'')||(isNisa?'NISA':'課税')+'一括(解約)';
        secRedeemMap_mg[`stk-${p}-${sid}`]={lbl,val};secRedeemTotal+=val;
      });
    });
    Object.keys(secRedeemMap_mg).forEach(k=>{if(!MR.secRedeemRows.find(r=>r.key===k))MR.secRedeemRows.push({key:k,lbl:secRedeemMap_mg[k].lbl,vals:new Array(i).fill(0)});});
    MR.secRedeemRows.forEach(row=>{row.vals.push(ri(secRedeemMap_mg[row.key]?.val||0));});
    MR.secRedeem.push(ri(secRedeemTotal));

    // 生存者のDC/iDeCo受取
    [_aliveP].forEach(p=>{
      const d=dcIdeco_mg[p];if(!d)return;
      const pAge=p==='h'?ha:wa;const pBaseAge=p==='h'?hAge:wAge;
      const totalMonthly=d.employer+d.matching;
      const hasDC=totalMonthly>0||d.dcInitBal>0;
      const hasIdeco=d.idecoMonthly>0||d.idecoInitBal>0;
      if(!hasDC&&!hasIdeco)return;
      const yrsToReceive=d.receiveAge-pBaseAge;
      let _dcBR=0,_iBR=0;
      if(hasDC){const yC=Math.min(d.retAge-pBaseAge,yrsToReceive);const bE=_fvWithInit_mg(d.dcInitBal,totalMonthly,d.dcRate,yC);_dcBR=Math.round(bE*(d.dcRate>0?Math.pow(1+d.dcRate,Math.max(0,yrsToReceive-yC)):1));}
      if(hasIdeco){const yC=Math.min(d.retAge-pBaseAge,yrsToReceive);const bE=_fvWithInit_mg(d.idecoInitBal,d.idecoMonthly,d.idecoRate,yC);_iBR=Math.round(bE*(d.idecoRate>0?Math.pow(1+d.idecoRate,Math.max(0,yrsToReceive-yC)):1));}
      if(pAge>=d.receiveAge&&_dcBR>0){
        if(d.method==='lump'){if(pAge===d.receiveAge){if(p==='h')dcReceiptH_mg+=_dcBR;else dcReceiptW_mg+=_dcBR;}}
        else if(d.method==='annuity'){const a=Math.round(_dcBR/20);if(pAge<d.receiveAge+20){if(p==='h')dcReceiptH_mg+=a;else dcReceiptW_mg+=a;}}
        else{const half=Math.round(_dcBR/2);if(pAge===d.receiveAge){if(p==='h')dcReceiptH_mg+=half;else dcReceiptW_mg+=half;}const aH=Math.round(half/20);if(pAge<d.receiveAge+20){if(p==='h')dcReceiptH_mg+=aH;else dcReceiptW_mg+=aH;}}
      }
      if(pAge>=d.receiveAge&&_iBR>0){
        if(d.method==='lump'){if(pAge===d.receiveAge){if(p==='h')idecoReceiptH_mg+=_iBR;else idecoReceiptW_mg+=_iBR;}}
        else if(d.method==='annuity'){const a=Math.round(_iBR/20);if(pAge<d.receiveAge+20){if(p==='h')idecoReceiptH_mg+=a;else idecoReceiptW_mg+=a;}}
        else{const half=Math.round(_iBR/2);if(pAge===d.receiveAge){if(p==='h')idecoReceiptH_mg+=half;else idecoReceiptW_mg+=half;}const aH=Math.round(half/20);if(pAge<d.receiveAge+20){if(p==='h')idecoReceiptH_mg+=aH;else idecoReceiptW_mg+=aH;}}
      }
    });
    MR.dcReceiptH.push(ri(dcReceiptH_mg));MR.dcReceiptW.push(ri(dcReceiptW_mg));
    MR.idecoReceiptH.push(ri(idecoReceiptH_mg));MR.idecoReceiptW.push(ri(idecoReceiptW_mg));

    // 収入合計
    const incTotal=ri(hInc)+ri(wInc)+rPayH+rPayW+insPayVal+survP+oiVal+teateVal+lctrlVal+pSelfVal+pWifeVal+scholarVal+finLiquidVal+insMatVal+ri(secRedeemTotal)+ri(dcReceiptH_mg)+ri(dcReceiptW_mg)+ri(idecoReceiptH_mg)+ri(idecoReceiptW_mg);
    MR.incT.push(incTotal);

    // ── 支出（個別計算） ──
    // 生活費
    const normalLC=i<normalR.lc.length?normalR.lc[i]:0;
    let lcVal=normalLC;
    if(isDead){
      if(mgLCMode==='step'&&mgLCSteps.length>0){
        for(let si=0;si<mgLCSteps.length;si++){const st=mgLCSteps[si];if(st.mode==='pct'&&si>0){st.base=ri((mgLCSteps[si-1].base||normalLC)*(st.pct||80)/100);}if(st.base<=0&&si===0)st.base=normalLC;}
        const yr2=MR.yr[i];let found=false;
        for(const st of mgLCSteps){const from=st.fromYr||0,to=st.toYr||9999;if(yr2>=from&&yr2<=to){lcVal=ri(st.base*Math.pow(1+st.rate/100,yr2-from));found=true;break;}}
        if(!found){const last=mgLCSteps[mgLCSteps.length-1];lcVal=ri(last.base*Math.pow(1+last.rate/100,Math.max(0,yr2-(last.fromYr||0))));}
      }else{lcVal=ri(normalLC*lcRatio);}
    }
    MR.lc.push(lcVal);

    // ローン返済
    let lRep=0,_mlRepH=0,_mlRepW=0;
    if(pairLoanMode||_mgFlatPair){
      if(active){
        let hLA=true,wLA=true;
        if(isDead&&targetIsH&&mgDansinH)hLA=false;
        if(isDead&&!targetIsH&&mgDansinW)wLA=false;
        const _lhType=_mgFlatPair?($('flat-loan-h-type')?.value||'equal_payment'):(document.getElementById('loan-h-type')?.value||'equal_payment');
        const _lwType=_mgFlatPair?($('flat-loan-w-type')?.value||'equal_payment'):(document.getElementById('loan-w-type')?.value||'equal_payment');
        if(hLA&&lhAmt>0&&lcYr<lhYrs){_mlRepH=ri(_lhType==='equal_payment'?mpay(lhAmt,lhYrs,effRate(lcYr,ratesH))*12:mpay_gankin_year(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr));}
        if(wLA&&lwAmt>0&&lcYr<lwYrs){_mlRepW=ri(_lwType==='equal_payment'?mpay(lwAmt,lwYrs,effRate(lcYr,ratesW))*12:mpay_gankin_year(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr));}
      }
      lRep=_mlRepH+_mlRepW;
    }else{
      if(active&&lcYr<loanYrs){
        const dansinApplies=isDead&&targetIsH&&mgDansin;
        if(!dansinApplies){const lt=_mgIsFlat?($('flat-loan-type')?.value||'equal_payment'):(document.getElementById('loan-type')?.value||'equal_payment');const r=effRate(lcYr,rates);lRep=ri(lt==='equal_payment'?mpay(loanAmt,loanYrs,r)*12:mpay_gankin_year(loanAmt,loanYrs,r,lcYr));}
      }
    }
    MR.lRep.push(lRep);MR.lRepH.push(_mlRepH);MR.lRepW.push(_mlRepW);

    // 住宅関連（通常CFから取得）
    MR.rep.push(i<normalR.rep.length?normalR.rep[i]:0);
    MR.ptx.push(i<normalR.ptx.length?normalR.ptx[i]:0);
    MR.furn.push(i<normalR.furn.length?normalR.furn[i]:0);
    MR.senyu.push(i<normalR.senyu.length?normalR.senyu[i]:0);
    MR.rent.push(i<normalR.rent.length?normalR.rent[i]:0);
    MR.houseCostArr.push(i<normalR.houseCostArr.length?normalR.houseCostArr[i]:0);
    MR.moveInCost.push(i<normalR.moveInCost.length?normalR.moveInCost[i]:0);

    // 教育費（通常CFと同じ）
    children.forEach((c,ci)=>{MR.edu[ci].push(normalR.edu[ci]?.[i]||0);});

    // 車両費
    let nCar=0;
    if(!mgCarKeep&&isDead){nCar=0;}
    else if(mgCarKeep&&isDead){
      const cp=targetIsH?'h':'w';
      const mgCarPrice=fv(`mg-car-${cp}-price`)||300;const mgCarCycle=iv(`mg-car-${cp}-cycle`)||7;
      const mgCarInsp=fv(`mg-car-${cp}-insp`)||10;const mgCarEndAge=iv(`mg-car-${cp}-end-age`)||0;
      const survivorAge=targetIsH?wa:ha;
      if(mgCarEndAge>0&&survivorAge>mgCarEndAge){nCar=0;}
      else{const yrsFromDeath=i-(deathYearOffset-1);if(yrsFromDeath>=0){if(yrsFromDeath>0&&yrsFromDeath%mgCarCycle===0)nCar+=mgCarPrice;const carAge=yrsFromDeath%mgCarCycle;if(carAge===3||(carAge>3&&(carAge-3)%2===0))nCar+=mgCarInsp;}}
    }else{nCar=i<normalR.carTotal.length?(normalR.carTotal[i]||0):0;}
    MR.carTotal.push(nCar);

    // 駐車場
    let nPrk=0;
    if(!mgParkKeep&&isDead){nPrk=0;}
    else if(mgParkKeep&&isDead){const cp=targetIsH?'h':'w';const mgParkAmt=fv('mg-parking')||15000;const mgParkFromAge=iv(`mg-park-${cp}-from-age`)||0;const mgParkToAge=iv(`mg-park-${cp}-to-age`)||0;const survivorAge2=targetIsH?wa:ha;nPrk=((mgParkFromAge<=0||survivorAge2>=mgParkFromAge)&&(mgParkToAge<=0||survivorAge2<=mgParkToAge))?ri(mgParkAmt*12/10000):0;}
    else{nPrk=i<normalR.prk.length?(normalR.prk[i]||0):0;}
    MR.prk.push(nPrk);

    // 積立投資（生存者のみ、死亡後は死亡者分を除外）
    let secInvVal=i<normalR.secInvest.length?normalR.secInvest[i]:0;
    if(isDead&&normalR.secInvestRows){
      secInvVal=0;
      normalR.secInvestRows.forEach(row=>{
        const k=row.key||'';const p2=k.includes('-h-')?'h':k.includes('-w-')?'w':'both';
        if(p2===_deadP)return;
        secInvVal+=(row.vals[i]||0);
      });
    }
    MR.secInvest.push(secInvVal);

    // 一括投資（生存者のみ）
    let secBuyVal=i<normalR.secBuy.length?normalR.secBuy[i]:0;
    if(isDead){
      secBuyVal=0;
      _alivePers.forEach(p=>{
        const pAge=p==='h'?ha:wa;
        document.querySelectorAll(`[id^="sec-stk-bal-${p}-"]`).forEach(el=>{
          const parts=el.id.split('-');const sid=parts[parts.length-1];
          const isStock=document.getElementById(`sec-stock-${p}-${sid}`)?.classList.contains('on');if(!isStock)return;
          const investAge=iv(`sec-stk-age-${p}-${sid}`)||0;if(investAge<=0||pAge!==investAge)return;
          secBuyVal+=fv(`sec-stk-bal-${p}-${sid}`)||0;
        });
      });
    }
    MR.secBuy.push(ri(secBuyVal));

    // 保険料（生存者のみ、死亡後は死亡者分を除外）
    let insMonthlyVal=i<normalR.insMonthly.length?normalR.insMonthly[i]:0;
    if(isDead&&normalR.insMonthlyRows){
      insMonthlyVal=0;
      normalR.insMonthlyRows.forEach(row=>{
        const k=row.key||'';const p2=k.includes(`-${_deadP}-`)?_deadP:_aliveP;
        if(p2===_deadP)return;
        insMonthlyVal+=(row.vals[i]||0);
      });
    }
    MR.insMonthly.push(insMonthlyVal);

    // 一時払い保険（生存者のみ）
    let insLumpVal=i<normalR.insLumpExp.length?normalR.insLumpExp[i]:0;
    if(isDead&&normalR.insLumpExpRows){
      insLumpVal=0;
      normalR.insLumpExpRows.forEach(row=>{
        const k=row.key||'';const p2=k.includes(`-${_deadP}-`)?_deadP:_aliveP;
        if(p2===_deadP)return;
        insLumpVal+=(row.vals[i]||0);
      });
    }
    MR.insLumpExp.push(insLumpVal);

    // DC拠出（死亡者分は0）
    const dcMatchH=isDead&&targetIsH?0:(i<normalR.dcMatchExpH.length?normalR.dcMatchExpH[i]:0);
    const dcMatchW=isDead&&!targetIsH?0:(i<normalR.dcMatchExpW.length?normalR.dcMatchExpW[i]:0);
    MR.dcMatchExpH.push(dcMatchH);MR.dcMatchExpW.push(dcMatchW);

    // iDeCo拠出（死亡者分は0）
    const idecoH=isDead&&targetIsH?0:(i<normalR.idecoExpH.length?normalR.idecoExpH[i]:0);
    const idecoW=isDead&&!targetIsH?0:(i<normalR.idecoExpW.length?normalR.idecoExpW[i]:0);
    MR.idecoExpH.push(idecoH);MR.idecoExpW.push(idecoW);

    // 結婚お祝い・特別支出
    MR.wedding.push(i<normalR.wedding.length?normalR.wedding[i]:0);
    MR.ext.push(i<normalR.ext.length?normalR.ext[i]:0);

    // 支出合計（個別計算）
    let expTotal=lcVal+lRep+MR.rep[i]+MR.ptx[i]+MR.furn[i]+MR.senyu[i]+MR.rent[i]+nCar+nPrk+secInvVal+ri(secBuyVal)+insMonthlyVal+insLumpVal+dcMatchH+dcMatchW+idecoH+idecoW+MR.wedding[i]+MR.ext[i];
    children.forEach((c,ci)=>expTotal+=MR.edu[ci][i]);
    MR.expT.push(ri(expTotal));

    // 収支・残高
    const bal=incTotal-ri(expTotal);
    MR.bal.push(bal);
    // 財形貯蓄（生存者のみ）
    let _savExtra=0;
    [_aliveP].forEach(p=>{
      const pAge=p==='h'?ha:wa;const pRetAge=p==='h'?retAge_mg:wRetAge_mg;
      const zm=fv(`zaikei-${p}-monthly`)||0;const ze=iv(`zaikei-${p}-end`)||0;
      if(zm>0&&(ze===0||pAge<(ze||pRetAge))){sav+=zm*12;_savExtra+=zm*12;}
    });
    if(!isDead){
      [_deadP].forEach(p=>{
        const pAge=p==='h'?ha:wa;const pRetAge=p==='h'?retAge_mg:wRetAge_mg;
        const zm=fv(`zaikei-${p}-monthly`)||0;const ze=iv(`zaikei-${p}-end`)||0;
        if(zm>0&&(ze===0||pAge<(ze||pRetAge))){sav+=zm*12;_savExtra+=zm*12;}
      });
    }
    MR.savExtra.push(_savExtra);
    sav+=bal;
    MR.sav.push(ri(sav));

    // ローン残高
    const loanType_mg=_mgIsFlat?($('flat-loan-type')?.value||'equal_payment'):(document.getElementById('loan-type')?.value||'equal_payment');
    let lb=0;
    if(pairLoanMode||_mgFlatPair){
      let hLB=0,wLB=0;
      if(active){
        if(!(isDead&&targetIsH&&mgDansinH)&&lhAmt>0&&lcYr<lhYrs)hLB=lbal(lhAmt,lhYrs,effRate(lcYr,ratesH),lcYr+1);
        if(!(isDead&&!targetIsH&&mgDansinW)&&lwAmt>0&&lcYr<lwYrs)wLB=lbal(lwAmt,lwYrs,effRate(lcYr,ratesW),lcYr+1);
      }else{hLB=lhAmt;wLB=lwAmt;}
      lb=ri(Math.max(0,hLB+wLB));
    }else{
      if(isDead&&targetIsH&&mgDansin){lb=0;}
      else if(active){lb=ri(Math.max(0,loanType_mg==='equal_payment'?lbal(loanAmt,loanYrs,effRate(lcYr,rates),lcYr+1):lbal_gankin(loanAmt,loanYrs,lcYr+1)));}
      else{lb=ri(loanAmt);}
    }
    MR.lBal.push(lb);

    // その他金融資産（生存者分のみ）
    let mgFinAsset=i<normalR.finAsset.length?(normalR.finAsset[i]||0):0;
    if(isDead&&normalR.finAssetRows){
      mgFinAsset=0;const deadP=targetIsH?'h':'w';
      normalR.finAssetRows.forEach(row=>{
        const v=row.vals[i]||0;if(v<=0)return;
        if(row.person===deadP)return;
        if(row.person==='both')mgFinAsset+=Math.round(v/2);
        else mgFinAsset+=v;
      });
    }
    MR.finAsset.push(ri(mgFinAsset));
    MR.totalAsset.push(ri(sav)+ri(mgFinAsset));

    // イベント
    let evH='';
    if(targetIsH&&isDeathYear)evH='🕊️ ご逝去';
    else if(targetIsH&&isDead)evH='';
    else{evH=i<normalR.evH.length?(normalR.evH[i]||''):'';}
    MR.evH.push(evH);
    let evW='';
    if(!targetIsH&&isDeathYear)evW='🕊️ ご逝去';
    else if(!targetIsH&&isDead)evW='';
    else{evW=i<normalR.evW.length?(normalR.evW[i]||''):'';}
    MR.evW.push(evW);
    children.forEach((c,ci)=>{MR.evC[ci].push(i<normalR.evC[ci].length?(normalR.evC[ci][i]||''):'');});
  }

  // ── mgOverrides後処理 ──
  if(Object.keys(mgOverrides).length>0){
    const incKeys=['hInc','wInc','rPay','wRPay','otherInc','insMat','secRedeem','scholarship','pS','pW','survPension','teate','lCtrl','dcReceiptH','dcReceiptW','idecoReceiptH','idecoReceiptW','insPayArr','finLiquid'];
    const expKeys=['lc','secInvest','secBuy','insMonthly','insLumpExp','rent','lRep','rep','ptx','furn','senyu','prk','carTotal','wedding','ext','dcMatchExpH','dcMatchExpW','idecoExpH','idecoExpW'];
    [...incKeys,...expKeys].forEach(key=>{
      if(!mgOverrides[key])return;
      Object.entries(mgOverrides[key]).forEach(([col,val])=>{const c2=parseInt(col);if(MR[key]&&c2<MR[key].length)MR[key][c2]=val;});
    });
    children.forEach((_ch,ci)=>{
      const key='edu'+ci;if(!mgOverrides[key])return;
      Object.entries(mgOverrides[key]).forEach(([col,val])=>{const c2=parseInt(col);if(MR.edu[ci]&&c2<MR.edu[ci].length)MR.edu[ci][c2]=val;});
    });
    if(MR.secRedeemRows){MR.secRedeemRows.forEach(row=>{if(!mgOverrides[row.key])return;Object.entries(mgOverrides[row.key]).forEach(([col,val])=>{row.vals[parseInt(col)]=val;});});}
    let newSav=initSav;
    for(let i=0;i<MR.incT.length;i++){
      if(mgOverrides['incT']?.[i]!==undefined){MR.incT[i]=mgOverrides['incT'][i];}
      else{let t=incKeys.reduce((s,k)=>s+(MR[k]?.[i]||0),0);if(MR.secRedeemRows)MR.secRedeemRows.forEach(row=>t+=(row.vals[i]||0));MR.incT[i]=t;}
      if(mgOverrides['expT']?.[i]!==undefined){MR.expT[i]=mgOverrides['expT'][i];}
      else{let t=expKeys.reduce((s,k)=>s+(MR[k]?.[i]||0),0);children.forEach((_ch,ci)=>t+=(MR.edu[ci]?.[i]||0));MR.expT[i]=t;}
      MR.bal[i]=MR.incT[i]-MR.expT[i];
      newSav+=MR.bal[i]+(MR.savExtra[i]||0);
      MR.sav[i]=ri(newSav);
      MR.totalAsset[i]=MR.sav[i]+ri(MR.finAsset[i]||0);
    }
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

  // 逝去・退職列インデックス計算（通常CF表と同じ col-death / col-retire クラス）
  const wAge0_mg=wAge;
  const hDeathAge_mg=iv('h-death-age'),wDeathAge_mg=iv('w-death-age');
  const wRetireAge_mg=iv('w-retire-age');
  const hDeathCol_mg=hDeathAge_mg>hAge?hDeathAge_mg-hAge:-1;
  const wDeathCol_mg=wDeathAge_mg>wAge0_mg?wDeathAge_mg-wAge0_mg:-1;
  const hRetireCol_mg=retAge_mg>hAge?retAge_mg-hAge:-1;
  const wRetireCol_mg=wRetireAge_mg>wAge0_mg?wRetireAge_mg-wAge0_mg:-1;
  const getMgColCls=i=>{let c='';if(i===hDeathCol_mg||i===wDeathCol_mg)c+=' col-death';if(i===hRetireCol_mg||i===wRetireCol_mg)c+=' col-retire';return c;};

  // サマリーカード（通常CF表と同じ4枚 + 必要保障額）
  const totI_mg=MR.incT.slice(0,mgDisp).reduce((a,b)=>a+b,0);
  const totE_mg=MR.expT.slice(0,mgDisp).reduce((a,b)=>a+b,0);
  const finSav_mg=MR.sav[mgDisp-1]||0;
  const redYrs_mg=MR.bal.slice(0,mgDisp).filter(v=>v<0).length;
  const sc_mg=(icon,lbl,val,unit,color,sub)=>`<div style="background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;flex:1;min-width:140px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${color};border-radius:4px 0 0 4px"></div>
    <div style="margin-left:8px">
      <div style="font-size:10px;color:var(--muted);font-weight:600;letter-spacing:.04em">${icon} ${lbl}</div>
      <div style="font-size:20px;font-weight:800;font-family:'Cascadia Code','Consolas','Menlo',monospace;color:${color};margin-top:2px">${val}<span style="font-size:11px;font-weight:600;margin-left:3px">${unit}</span></div>
      ${sub?`<div style="font-size:9px;color:var(--muted);margin-top:1px">${sub}</div>`:''}
    </div>
  </div>`;

  let h=`<div class="r-summary" style="margin-top:30px;border-top:3px solid #c2185b;padding-top:16px">`;
  h+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
    <span style="background:#c2185b;color:#fff;padding:5px 14px;border-radius:99px;font-size:13px;font-weight:700">🛡️ 万が一CF表</span>
    <span style="font-size:13px;font-weight:600;color:#1e3a5f">${nm} 様 ─ ${targetLabel}が${deathAge}歳で死亡した場合</span>
  </div>`;
  h+=`<div class="cf-summary" style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
    ${sc_mg('💰','総収入',ri(totI_mg).toLocaleString(),'万円','#2d7dd2',`${mgDisp}年間合計`)}
    ${sc_mg('💸','総支出',ri(totE_mg).toLocaleString(),'万円','#fc5b4a',`${mgDisp}年間合計`)}
    ${sc_mg('🏦','最終残高',ri(finSav_mg).toLocaleString(),'万円',finSav_mg>=0?'#0d8a20':'#d63a2a',`${hAge+mgDisp-1}歳時点`)}
    ${sc_mg('⚠️','赤字年数',redYrs_mg,'年',redYrs_mg===0?'#0d8a20':'#d63a2a',redYrs_mg===0?'赤字なし':`${mgDisp}年中${redYrs_mg}年が赤字`)}
    ${MR.needCoverage>0?sc_mg('🛡️','必要保障額',ri(MR.needCoverage).toLocaleString(),'万円','#c2185b','不足分を補う保険金額の目安'):''}
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
  // 自己資金の内訳（通常CF表と同じ形式）
  const N=normalR;
  const mgChip=(icon,label,val,valColor)=>`<div style="display:flex;align-items:center;gap:5px;padding:6px 13px;border-right:1px solid #dce6f0;white-space:nowrap;flex-shrink:0"><span>${icon}</span><span style="color:var(--muted);font-size:10px">${label}</span><strong style="color:${valColor||'var(--navy)'};font-family:'Cascadia Code','Consolas','Menlo',monospace;font-size:11px">${val}</strong></div>`;
  const mgArrow=`<div style="color:#b0bec5;font-size:13px;padding:0 2px;display:flex;align-items:center">▶</div>`;
  const housePrice2=fv('house-price')||0;
  const cashTotal2=(fv('cash-h')||0)+(fv('cash-w')||0)+(fv('cash-joint')||0);
  const downPay2=fv('down-payment')||0;
  const houseCost2=fv('house-cost')||0;
  const movCost2_mov=fv('moving-cost')||0;
  const movCost2_fur=fv('furniture-init')||0;
  const _costType2=document.getElementById('cost-type')?.value||'cash';
  const downFromOwn2=downType==='gift'?0:downPay2;
  const houseCostDeduct2=_costType2==='loan'?0:houseCost2;
  const initialOut2=downFromOwn2+houseCostDeduct2+movCost2_mov+movCost2_fur;
  const cashAfter2=cashTotal2-initialOut2;
  const cashAfterColor2=cashAfter2>=0?'var(--green)':'var(--red)';
  h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:6px;background:#fff">
    <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">💰 自己資金の内訳</div>
    <div style="display:flex;flex-wrap:wrap;align-items:stretch">
      ${mgChip('🏦','現預金合計',cashTotal2.toLocaleString()+'万円')}${mgArrow}${downType==='gift'?mgChip('🎁','頭金（贈与）',downPay2.toLocaleString()+'万円','#2d7dd2'):mgChip('💴','頭金（自己資金）',downPay2.toLocaleString()+'万円','var(--red)')}${_costType2==='loan'?mgChip('📋','諸費用（ローン組込）',houseCost2.toLocaleString()+'万円','#2d7dd2'):mgChip('📋','諸費用',houseCost2.toLocaleString()+'万円','var(--red)')}${mgChip('🚚','引越・家具',(movCost2_mov+movCost2_fur).toLocaleString()+'万円','var(--red)')}${mgArrow}${mgChip('✅','購入後残高',cashAfter2.toLocaleString()+'万円',cashAfterColor2)}
    </div></div>`;
  // 段階金利チップ生成ヘルパー
  const _mgRateChips=(rArr)=>{
    if(rArr.length<=1)return '';
    return rArr.slice(1).map(s=>mgChip('📈',`${s.from+1}年目〜`,`${s.rate}%`)).join('');
  };
  const _mgFlatLabel2=_mgIsFlat?`フラット${flat35Sub==='flat20'?'20':'35'}`:'';
  const _mgFlatPt2=_mgIsFlat?calcFlat35Points():0;
  if(_mgFlatPair){
    const _fhAmtV2=fv('flat-loan-h-amt')||0, _fwAmtV2=fv('flat-loan-w-amt')||0;
    const _fhYrsV2=iv('flat-loan-h-yrs')||35, _fwYrsV2=iv('flat-loan-w-yrs')||35;
    const _mgFRateBase=fv('flat-rate-base')||1.94;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（${_mgFlatLabel2} ペアローン）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏠','住宅価格',housePrice2.toLocaleString()+'万円')}${mgChip('📊','ベース金利',_mgFRateBase+'%')}${_mgFlatPt2>0?mgChip('⭐','ポイント',_mgFlatPt2+'pt','#d63a2a'):''}${_mgRateChips(rates)}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#1e5a9a;background:#f0f6ff">👔 ご主人様</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏦','借入額',_fhAmtV2.toLocaleString()+'万円')}${mgChip('📅','期間',_fhYrsV2+'年')}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#9a1e5a;background:#fff0f6">👩 奥様</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏦','借入額',_fwAmtV2.toLocaleString()+'万円')}${mgChip('📅','期間',_fwYrsV2+'年')}
      </div>
    </div>`;
  } else if(pairLoanMode){
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
  } else if(_mgIsFlat){
    const _mgFRateBase=fv('flat-rate-base')||1.94;
    const _mgFLoanYrs=iv('flat-loan-yrs')||35;
    const _mgDelivery=iv('delivery-year')||0;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（${_mgFlatLabel2}）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏠','住宅価格',housePrice2.toLocaleString()+'万円')}${mgChip('🏦','借入総額',loanAmt.toLocaleString()+'万円')}${mgChip('📊','ベース金利',_mgFRateBase+'%')}${_mgFlatPt2>0?mgChip('⭐','ポイント',_mgFlatPt2+'pt','#d63a2a'):''}${_mgRateChips(rates)}${mgChip('📅','借入期間',_mgFLoanYrs+'年')}${_mgDelivery>0?mgChip('🔑','引き渡し',_mgDelivery+'年'):''}
      </div></div>`;
  } else {
    const _mgRates=getRates();
    const _mgRateBase=fv('rate-base')||0.5;
    const _mgLoanYrs=iv('loan-yrs')||35;
    const _mgDelivery=iv('delivery-year')||0;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${mgChip('🏠','住宅価格',housePrice2.toLocaleString()+'万円')}${mgChip('🏦','借入総額',loanAmt.toLocaleString()+'万円')}${mgChip('📊','当初金利',_mgRateBase+'%')}${_mgRateChips(_mgRates)}${mgChip('📅','借入期間',_mgLoanYrs+'年')}${_mgDelivery>0?mgChip('🔑','引き渡し',_mgDelivery+'年'):''}
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
  for(let i=0;i<mgDisp;i++)h+=`<td>${i+1}</td>`;h+=`<td style="background:#0f2744;color:#8aa4bc">-</td></tr>`;

  // 年齢（死亡後は✝マーク）+ contenteditable + col-death/col-retire
  h+=`<tr class="rage"><td data-row="hAge">年齢</td><td contenteditable="true" data-rowlbl="mg-age-h" data-default="ご主人様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-age-h','ご主人様')}</td>`;
  for(let i=0;i<mgDisp;i++){const d=targetIsH&&i>=deathYearOffset-1;h+=`<td class="${getMgColCls(i).trim()}" style="${d?'color:#ccc':''}">${d?'✝'+MR.hA[i]:MR.hA[i]}</td>`;}
  h+=`<td></td></tr>`;
  h+=`<tr class="rage"><td data-row="wAge"></td><td contenteditable="true" data-rowlbl="mg-age-w" data-default="奥様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-age-w','奥様')}</td>`;
  for(let i=0;i<mgDisp;i++){const d=!targetIsH&&i>=deathYearOffset-1;h+=`<td class="${getMgColCls(i).trim()}" style="${d?'color:#ccc':''}">${d?'✝'+MR.wA[i]:MR.wA[i]}</td>`;}
  h+=`<td></td></tr>`;
  children.forEach((c,ci)=>{h+=`<tr class="rage"><td data-row="cAge${ci}"></td><td contenteditable="true" data-rowlbl="mg-age-c${ci}" data-default="${cLbls[ci]}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-age-c'+ci,cLbls[ci])}</td>`;for(let i=0;i<mgDisp;i++)h+=`<td class="${getMgColCls(i).trim()}">${c.age+i}</td>`;h+=`<td></td></tr>`;});

  // イベント（通常と同じ＋死亡イベント追加）+ contenteditable label + col-class
  h+=`<tr class="rev-h"><td>イベント</td><td contenteditable="true" data-rowlbl="mg-ev-h" data-default="ご主人様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-ev-h','ご主人様')}</td>`;
  for(let i=0;i<mgDisp;i++){
    let ev=N.evH[i]||'';
    if(targetIsH&&i===deathYearOffset-1)ev='🕊️ ご逝去';
    else if(targetIsH&&i>deathYearOffset-1)ev='';
    h+=`<td class="${getMgColCls(i).trim()}">${ev}</td>`;
  }h+=`<td></td></tr>`;
  h+=`<tr class="rev-w"><td></td><td contenteditable="true" data-rowlbl="mg-ev-w" data-default="奥様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-ev-w','奥様')}</td>`;
  for(let i=0;i<mgDisp;i++){
    let ev=N.evW[i]||'';
    if(!targetIsH&&i===deathYearOffset-1)ev='🕊️ ご逝去';
    else if(!targetIsH&&i>deathYearOffset-1)ev='';
    h+=`<td class="${getMgColCls(i).trim()}">${ev}</td>`;
  }h+=`<td></td></tr>`;
  children.forEach((c,ci)=>{
    h+=`<tr class="rev-c"><td></td><td contenteditable="true" data-rowlbl="mg-ev-c${ci}" data-default="${cLbls[ci]}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('mg-ev-c'+ci,cLbls[ci])}</td>`;
    for(let i=0;i<mgDisp;i++){
      const ca=c.age+i;
      let cls='',label='';
      const hStartAge_ev=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
      const hType_ev=_v(`hoiku-type-${ci+1}`)||'hoikuen';
      const hLabel_ev=hType_ev==='youchien'?'幼稚園入園':'保育園入園';
      if(ca===0)label='誕生';
      else if(ca>=hStartAge_ev&&ca<=6){cls='ev-hoiku';if(ca===hStartAge_ev)label=hLabel_ev;}
      else if(ca>=7&&ca<=12){cls='ev-elem';if(ca===7)label='小学入学';}
      else if(ca>=13&&ca<=15){cls='ev-mid';if(ca===13)label='中学入学';}
      else if(ca>=16&&ca<=18){cls='ev-high';if(ca===16)label='高校入学';}
      else if(ca>=19){const un=_v(`cu-${ci+1}`)||'plit_h';const ul=(EDU.univ[un]||[]).length;if(ul>0&&ca<19+ul){cls=un.startsWith('senmon')?'ev-senmon':'ev-univ';if(ca===19)label=un.startsWith('senmon')?'専門入学':'大学入学';}}
      h+=`<td class="${cls}${getMgColCls(i)}">${label}</td>`;
    }h+=`<td></td></tr>`;
  });

  // ─ 収入 ─（contenteditable対応 + 通常との差分ハイライト）
  h+=`<tr class="rcat inc-cat"><td></td><td>収　　入</td>`;for(let i=0;i<mgDisp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const _ce='contenteditable="true"';
  const _kd='onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}"';
  // mgRow: normalArr比較でハイライト + contenteditable + mgOverrides対応
  const mgRow=(lbl,arr,normalArr,rowKey)=>{
    let tot=0;for(let i2=0;i2<mgDisp;i2++){const ov=mgOverrides[rowKey]?.[i2];tot+=(ov!==undefined?ov:(arr[i2]||0));}
    const nTot=normalArr?normalArr.slice(0,mgDisp).reduce((a,b)=>a+b,0):0;
    if(tot===0&&nTot===0)return'';
    const dl=_rl('mg-'+rowKey,lbl);
    let r=`<tr class="rinc"><td></td><td ${_ce} data-rowlbl="mg-${rowKey}" data-default="${lbl}" onblur="rowLabelEdit(this)" ${_kd}>${dl}</td>`;
    for(let i2=0;i2<mgDisp;i2++){
      const ov=mgOverrides[rowKey]?.[i2];const v=ov!==undefined?ov:(arr[i2]||0);const nv=normalArr?(normalArr[i2]||0):0;
      const changed=normalArr&&v!==nv;const isOvr=ov!==undefined;
      const cls=(changed?(v===0?'mg-zero':'mg-changed'):(v===0?'vz':''))+(isOvr?' cell-ovr':'')+getMgColCls(i2);
      r+=`<td class="${cls}" ${_ce} data-row="${rowKey}" data-col="${i2}" data-mg="1" onblur="cellEdit(this)" onfocus="selectAll(this)" ${_kd}>${v>0?ri(v).toLocaleString():(changed?'0':'-')}</td>`;
    }
    return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`;
  };

  // 収入行
  h+=mgRow('ご主人手取年収',MR.hInc,N.hInc,'hInc');
  h+=mgRow('奥様手取年収',MR.wInc,N.wInc,'wInc');
  h+=mgRow('副業・その他収入',MR.otherInc,N.otherInc,'otherInc');
  h+=mgRow('退職金（ご主人）',MR.rPay,N.rPay,'rPay');
  h+=mgRow('退職金（奥様）',MR.wRPay,N.wRPay,'wRPay');
  h+=mgRow('本人年金',MR.pS,N.pS,'pS');
  h+=mgRow('配偶者年金',MR.pW,N.pW,'pW');
  h+=mgRow('遺族年金',MR.survPension,N.survPension,'survPension');
  h+=mgRow('死亡保険金',MR.insPayArr,null,'insPayArr');
  h+=mgRow('金融資産現金化',MR.finLiquid,null,'finLiquid');
  h+=mgRow('DC受取(主)',MR.dcReceiptH,N.dcReceiptH,'dcReceiptH');
  h+=mgRow('DC受取(奥様)',MR.dcReceiptW,N.dcReceiptW,'dcReceiptW');
  h+=mgRow('iDeCo受取(主)',MR.idecoReceiptH,N.idecoReceiptH,'idecoReceiptH');
  h+=mgRow('iDeCo受取(奥様)',MR.idecoReceiptW,N.idecoReceiptW,'idecoReceiptW');
  h+=mgRow('保険満期金',MR.insMat,N.insMat,'insMat');
  if(MR.secRedeemRows)MR.secRedeemRows.forEach(row=>{if(row.vals.slice(0,mgDisp).some(v=>v>0))h+=mgRow(row.lbl,row.vals,null,row.key);});
  h+=mgRow('奨学金',MR.scholarship,N.scholarship,'scholarship');
  h+=mgRow('児童手当',MR.teate,null,'teate');
  h+=mgRow('住宅ローン控除',MR.lCtrl,N.lCtrl,'lCtrl');
  // カスタム収入行
  cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{
    const vals=Array.from({length:mgDisp},(_,i2)=>mgOverrides[r.id]?.[i2]||0);
    const tot=vals.reduce((a,b)=>a+b,0);if(tot===0)return;
    let rr=`<tr class="rinc"><td><button onclick="deleteCustomRow('${r.id}')" class="btn-del-row" title="行を削除">×</button></td><td ${_ce} data-custom-id="${r.id}" onblur="customLabelEdit(this)" class="custom-lbl">${r.label}</td>`;
    for(let i2=0;i2<mgDisp;i2++){const v=vals[i2];const isOvr=mgOverrides[r.id]?.[i2]!==undefined;rr+=`<td class="${v===0?'vz':''}${isOvr?' cell-ovr':''}${getMgColCls(i2)}" ${_ce} data-row="${r.id}" data-col="${i2}" data-mg="1" onblur="cellEdit(this)" onfocus="selectAll(this)" ${_kd}>${v>0?ri(v).toLocaleString():'-'}</td>`;}
    h+=rr+`<td>${tot>0?ri(tot).toLocaleString():'-'}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${r.label}</span></td></tr>`;
  });
  h+=`<tr class="radd"><td colspan="2"><button onclick="addCustomRow('inc')" class="btn-add-row">＋ 収入行を追加</button></td>`;for(let i2=0;i2<mgDisp;i2++)h+=`<td></td>`;h+=`<td></td></tr>`;
  // 収入合計
  h+=`<tr class="rinct"><td>収入合計</td><td></td>`;
  for(let i2=0;i2<mgDisp;i2++)h+=`<td>${ri(MR.incT[i2]).toLocaleString()}</td>`;
  h+=`<td>${ri(MR.incT.slice(0,mgDisp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">収入合計</span></td></tr>`;

  // ─ 支出 ─
  h+=`<tr class="rcat exp-cat"><td></td><td>支　　出</td>`;for(let i2=0;i2<mgDisp;i2++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const mgERow=(lbl,arr,normalArr,rowKey)=>{
    let tot=0;for(let i2=0;i2<mgDisp;i2++){const ov=mgOverrides[rowKey]?.[i2];tot+=(ov!==undefined?ov:(arr[i2]||0));}
    const nTot=normalArr?normalArr.slice(0,mgDisp).reduce((a,b)=>a+b,0):0;
    if(tot===0&&nTot===0)return'';
    const dl=_rl('mg-'+rowKey,lbl);
    let r=`<tr class="rexp"><td></td><td ${_ce} data-rowlbl="mg-${rowKey}" data-default="${lbl}" onblur="rowLabelEdit(this)" ${_kd}>${dl}</td>`;
    for(let i2=0;i2<mgDisp;i2++){
      const ov=mgOverrides[rowKey]?.[i2];const v=ov!==undefined?ov:(arr[i2]||0);const nv=normalArr?(normalArr[i2]||0):0;
      const changed=normalArr&&v!==nv;const isOvr=ov!==undefined;
      const cls=(changed?(v===0?'mg-zero':'mg-changed'):(v===0?'vz':''))+(isOvr?' cell-ovr':'')+getMgColCls(i2);
      r+=`<td class="${cls}" ${_ce} data-row="${rowKey}" data-col="${i2}" data-mg="1" onblur="cellEdit(this)" onfocus="selectAll(this)" ${_kd}>${v>0?ri(v).toLocaleString():(changed?'0':'-')}</td>`;
    }
    return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`;
  };

  h+=mgERow('生活費',MR.lc,N.lc,'lc');
  h+=mgERow('家賃（引渡前）',MR.rent,null,'rent');
  if(pairLoanMode){h+=mgERow('ローン返済(主)',MR.lRepH,N.lRepH,'lRepH');h+=mgERow('ローン返済(奥様)',MR.lRepW,N.lRepW,'lRepW');}
  else{h+=mgERow('住宅ローン返済',MR.lRep,N.lRep,'lRep');}
  if(isM)h+=mgERow('修繕積立金',MR.rep,null,'rep');
  h+=mgERow('固定資産税',MR.ptx,null,'ptx');
  h+=mgERow('家具家電買替',MR.furn,null,'furn');
  h+=mgERow(isM?'専有部分修繕費':'修繕費',MR.senyu,null,'senyu');
  children.forEach((c,ci)=>{
    const eduArr=MR.edu[ci];const tot=eduArr.slice(0,mgDisp).reduce((a,b)=>a+b,0);if(tot===0)return;
    const un=_v(`cu-${ci+1}`)||'plit_h';const univLen=(EDU.univ[un]||[]).length;
    const rowKey='edu'+ci;const dl=_rl('mg-'+rowKey,`${cLbls[ci]}教育費`);
    h+=`<tr class="rexp"><td></td><td ${_ce} data-rowlbl="mg-${rowKey}" data-default="${cLbls[ci]}教育費" onblur="rowLabelEdit(this)" ${_kd}>${dl}</td>`;
    for(let i2=0;i2<mgDisp;i2++){
      const ov=mgOverrides[rowKey]?.[i2];const v=ov!==undefined?ov:(eduArr[i2]||0);const ca=c.age+i2;const isOvr=ov!==undefined;
      let cls=v===0?'vz':'';
      if(v>0){if(ca>=1&&ca<=6)cls='edu-hoiku';else if(ca>=7&&ca<=12)cls='edu-elem';else if(ca>=13&&ca<=15)cls='edu-mid';else if(ca>=16&&ca<=18)cls='edu-high';else if(ca>=19&&ca<19+univLen)cls=un.startsWith('senmon')?'edu-senmon':'edu-univ';}
      if(isOvr)cls+=' cell-ovr';
      cls+=getMgColCls(i2);
      h+=`<td class="${cls}" ${_ce} data-row="${rowKey}" data-col="${i2}" data-mg="1" onblur="cellEdit(this)" onfocus="selectAll(this)" ${_kd}>${v>0?ri(v).toLocaleString():'-'}</td>`;
    }h+=`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`;
  });
  // 車両費：MG独自計算のため集約行で表示（mgCarKeep等で再計算済み）
  h+=mgERow('車両費（購入・車検）',MR.carTotal,N.carTotal,'carTotal');
  h+=mgERow('駐車場代',MR.prk,N.prk,'prk');
  // 積立投資額：通常CF表と同じく個別行（死亡者除外）
  const _mgDeadP=targetIsH?'h':'w';
  if(N.secInvestRows&&N.secInvestRows.length>1){
    N.secInvestRows.forEach(row=>{
      const k=row.key||'';const p2=k.includes('-h-')?'h':k.includes('-w-')?'w':'both';
      if(p2===_mgDeadP)return;// 死亡者の投資は除外
      if(!row.vals.slice(0,mgDisp).some(v=>v>0))return;
      h+=mgERow(row.lbl,row.vals,row.vals,row.key);
    });
  }else if(N.secInvestRows&&N.secInvestRows.length===1){
    const row=N.secInvestRows[0];const k=row.key||'';const p2=k.includes('-h-')?'h':k.includes('-w-')?'w':'both';
    if(p2!==_mgDeadP)h+=mgERow(row.lbl,row.vals,row.vals,row.key);
  }else{h+=mgERow('積立投資額',MR.secInvest,N.secInvest,'secInvest');}
  h+=mgERow('一括投資額',MR.secBuy,N.secBuy,'secBuy');
  // 保険料（積立）：個別行（死亡者除外）
  if(N.insMonthlyRows&&N.insMonthlyRows.length>1){
    N.insMonthlyRows.forEach(row=>{
      const k=row.key||'';const p2=k.includes(`-${_mgDeadP}-`)?_mgDeadP:'alive';
      if(p2===_mgDeadP)return;
      if(!row.vals.slice(0,mgDisp).some(v=>v>0))return;
      h+=mgERow(row.lbl,row.vals,row.vals,row.key);
    });
  }else if(N.insMonthlyRows&&N.insMonthlyRows.length===1){
    const row=N.insMonthlyRows[0];const k=row.key||'';const p2=k.includes(`-${_mgDeadP}-`)?_mgDeadP:'alive';
    if(p2!==_mgDeadP)h+=mgERow(row.lbl,row.vals,row.vals,row.key);
  }else{h+=mgERow('保険料（積立）',MR.insMonthly,N.insMonthly,'insMonthly');}
  // 一時払い保険：個別行（死亡者除外）
  if(N.insLumpExpRows&&N.insLumpExpRows.length>1){
    N.insLumpExpRows.forEach(row=>{
      const k=row.key||'';const p2=k.includes(`-${_mgDeadP}-`)?_mgDeadP:'alive';
      if(p2===_mgDeadP)return;
      if(!row.vals.slice(0,mgDisp).some(v=>v>0))return;
      h+=mgERow(row.lbl,row.vals,row.vals,row.key);
    });
  }else if(N.insLumpExpRows&&N.insLumpExpRows.length===1){
    const row=N.insLumpExpRows[0];const k=row.key||'';const p2=k.includes(`-${_mgDeadP}-`)?_mgDeadP:'alive';
    if(p2!==_mgDeadP)h+=mgERow(row.lbl,row.vals,row.vals,row.key);
  }else{h+=mgERow('一時払い保険',MR.insLumpExp,N.insLumpExp,'insLumpExp');}
  h+=mgERow('結婚のお祝い',MR.wedding,null,'wedding');
  h+=mgERow('DC拠出(主)',MR.dcMatchExpH,N.dcMatchExpH,'dcMatchExpH');
  h+=mgERow('DC拠出(奥様)',MR.dcMatchExpW,N.dcMatchExpW,'dcMatchExpW');
  h+=mgERow('iDeCo拠出(主)',MR.idecoExpH,N.idecoExpH,'idecoExpH');
  h+=mgERow('iDeCo拠出(奥様)',MR.idecoExpW,N.idecoExpW,'idecoExpW');
  // 特別支出：個別行
  if(N.extRows&&N.extRows.length>1){N.extRows.forEach(row=>{if(row.vals.slice(0,mgDisp).some(v=>v>0))h+=mgERow(row.lbl,row.vals,row.vals,row.key);});}
  else if(N.extRows&&N.extRows.length===1){h+=mgERow(N.extRows[0].lbl,N.extRows[0].vals,N.extRows[0].vals,N.extRows[0].key);}
  else{h+=mgERow('特別支出',MR.ext,null,'ext');}
  // カスタム支出行
  cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{
    const vals=Array.from({length:mgDisp},(_,i2)=>mgOverrides[r.id]?.[i2]||0);
    const tot=vals.reduce((a,b)=>a+b,0);if(tot===0)return;
    let rr=`<tr class="rexp"><td><button onclick="deleteCustomRow('${r.id}')" class="btn-del-row" title="行を削除">×</button></td><td ${_ce} data-custom-id="${r.id}" onblur="customLabelEdit(this)" class="custom-lbl">${r.label}</td>`;
    for(let i2=0;i2<mgDisp;i2++){const v=vals[i2];const isOvr=mgOverrides[r.id]?.[i2]!==undefined;rr+=`<td class="${v===0?'vz':''}${isOvr?' cell-ovr':''}${getMgColCls(i2)}" ${_ce} data-row="${r.id}" data-col="${i2}" data-mg="1" onblur="cellEdit(this)" onfocus="selectAll(this)" ${_kd}>${v>0?ri(v).toLocaleString():'-'}</td>`;}
    h+=rr+`<td>${tot>0?ri(tot).toLocaleString():'-'}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${r.label}</span></td></tr>`;
  });
  h+=`<tr class="radd"><td colspan="2"><button onclick="addCustomRow('exp')" class="btn-add-row">＋ 支出行を追加</button></td>`;for(let i2=0;i2<mgDisp;i2++)h+=`<td></td>`;h+=`<td></td></tr>`;
  // 支出合計
  h+=`<tr class="rexpt"><td>支出合計</td><td></td>`;
  for(let i2=0;i2<mgDisp;i2++)h+=`<td>${ri(MR.expT[i2]).toLocaleString()}</td>`;
  h+=`<td>${ri(MR.expT.slice(0,mgDisp).reduce((a,b)=>a+b,0)).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">支出合計</span></td></tr>`;

  // ─ 収支・残高 ─
  h+=`<tr class="rbal"><td>年間収支</td><td></td>`;
  for(let i2=0;i2<mgDisp;i2++){const v=ri(MR.bal[i2]);h+=`<td class="${v<0?'vn':v>0?'vp':'vz'}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`;}
  const bt_mg=MR.bal.slice(0,mgDisp).reduce((a,b)=>a+ri(b),0);
  h+=`<td class="${bt_mg<0?'vn':'vp'}">${bt_mg>=0?bt_mg.toLocaleString():'▲'+Math.abs(bt_mg).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">年間収支</span></td></tr>`;

  const _mgInitSavV=ri(window._purchaseInitSav||0);const _mgInitSavTxt=_mgInitSavV>=0?_mgInitSavV.toLocaleString():'▲'+Math.abs(_mgInitSavV).toLocaleString();const _mgInitSavStyle=_mgInitSavV<0?'color:#ffaaaa':'';
  h+=`<tr class="rsav"><td>預貯金残高</td><td><span style="font-size:9px;font-weight:400;opacity:.8">購入直後</span><br><span style="font-size:10px;font-weight:700;${_mgInitSavStyle}">${_mgInitSavTxt}万円</span></td>`;
  for(let i2=0;i2<mgDisp;i2++){const v=ri(MR.sav[i2]);h+=`<td class="${v<0?'vn':''}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`;}
  const _mgSavLast=ri(MR.sav[mgDisp-1]);h+=`<td>${_mgSavLast>=0?_mgSavLast.toLocaleString():'▲'+Math.abs(_mgSavLast).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">預貯金残高</span></td></tr>`;

  // その他金融資産（個別行 + 合計）
  const _hasFinAsset=MR.finAsset.some(v=>v>0);
  if(_hasFinAsset&&normalR.finAssetRows){
    const deadP2=targetIsH?'h':'w';
    normalR.finAssetRows.forEach(row=>{
      if(row.person===deadP2)return;if(!row.vals.slice(0,mgDisp).some(v=>v>0))return;
      h+=`<tr class="rfin fin-asset-row"><td></td><td>${row.lbl}</td>`;
      for(let i2=0;i2<mgDisp;i2++){let v=row.vals[i2]||0;if(i2>=deathYearOffset-1&&row.person==='both')v=Math.round(v/2);h+=`<td class="${getMgColCls(i2).trim()}">${v>0?ri(v).toLocaleString():'-'}</td>`;}
      h+=`<td>${ri(row.vals[mgDisp-1]||0).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${row.lbl}</span></td></tr>`;
    });
    h+=`<tr class="rfin fin-asset-row" style="font-weight:700"><td>その他金融資産</td><td></td>`;
    for(let i2=0;i2<mgDisp;i2++){const v=ri(MR.finAsset[i2]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`;}
    h+=`<td>${ri(MR.finAsset[mgDisp-1]).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">金融資産計</span></td></tr>`;
  }
  // 総金融資産
  h+=`<tr class="rttl"><td>総金融資産</td><td></td>`;
  for(let i2=0;i2<mgDisp;i2++){const v=ri(MR.totalAsset[i2]);h+=`<td class="${v<0?'vn':''}">${v.toLocaleString()}</td>`;}
  h+=`<td>${ri(MR.totalAsset[mgDisp-1]).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">総金融資産</span></td></tr>`;
  // ローン残高
  if(loanAmt>0||lhAmt>0||lwAmt>0){
    h+=`<tr class="rloan"><td>ローン残高</td><td></td>`;
    for(let i2=0;i2<mgDisp;i2++){const v=ri(MR.lBal[i2]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`;}
    h+=`<td></td></tr>`;
  }

  h+=`</table></div>`;
  // 印刷フッター
  const pi_mg=getPrintInfo();
  h+=`<div class="print-footer"><div class="pf-left">${pi_mg.name?`<div style="font-weight:700">${pi_mg.name}</div>`:''}${pi_mg.company?`<div>${pi_mg.company}</div>`:''}${pi_mg.address?`<div>${pi_mg.address}</div>`:''}${pi_mg.tel||pi_mg.email?`<div>${pi_mg.tel?'TEL：'+pi_mg.tel+'　':''}${pi_mg.email?'E-mail：'+pi_mg.email:''}</div>`:''}</div><div class="pf-notes">${pi_mg.notes.filter(n=>n.trim()).map(n=>`<div>・${n}</div>`).join('')}</div></div>`;
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

  // スクロール位置を保存してから表示、復元
  const _mgRb=$('right-body');
  const _mgPrevTop=_mgRb?_mgRb.scrollTop:0;
  const _mgOldTw=_mgRb?_mgRb.querySelector('.tbl-wrap'):null;
  const _mgPrevLeft=_mgOldTw?_mgOldTw.scrollLeft:0;

  // 自動でそのタブに切り替え
  setRTab(targetIsH?'mg-h':'mg-w');

  // スクロール位置を復元
  if(_mgRb&&_mgPrevTop>0)_mgRb.scrollTop=_mgPrevTop;
  const _mgNewTw=_mgRb?_mgRb.querySelector('.tbl-wrap'):null;
  if(_mgNewTw&&_mgPrevLeft>0)_mgNewTw.scrollLeft=_mgPrevLeft;
  _applyFinAssetVisibility();
}
