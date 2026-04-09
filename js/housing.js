// housing.js — 住宅設定・修繕積立金・ローン控除

function calcLoanAmt(){
  const price=fv('house-price')||0;
  const down=fv('down-payment')||0;
  const cost=fv('house-cost')||0;
  const costType=document.getElementById('cost-type')?.value||'cash';
  // 借入金額：ローン組み込みなら諸費用を加算
  const loan=Math.max(0,costType==='loan'?price-down+cost:price-down);
  // hidden inputに反映
  const loanEl=document.getElementById('loan-amt');
  if(loanEl)loanEl.value=loan;
  // 表示更新
  const disp=document.getElementById('loan-amt-disp');
  if(disp)disp.textContent=loan.toLocaleString();
  const hint=document.getElementById('loan-breakdown-hint');
  if(hint){
    if(costType==='loan')
      hint.textContent=`（${price.toLocaleString()} − ${down.toLocaleString()} 頭金 ＋ ${cost.toLocaleString()} 諸費用）`;
    else
      hint.textContent=`（${price.toLocaleString()} − ${down.toLocaleString()} 頭金）　諸費用 ${cost.toLocaleString()}万円は現金`;
  }
  // rate-base-dummy同期
  const rateDummy=document.getElementById('rate-base-dummy');
  const rateBase=document.getElementById('rate-base');
  if(rateDummy&&rateBase)rateDummy.value=rateBase.value;
  live();
}

// ===== 住宅：頭金の資金区分切替 =====
function setDownType(t){
  downType=t;
  document.getElementById('down-own').classList.toggle('on',t==='own');
  document.getElementById('down-gift').classList.toggle('on',t==='gift');
  const hint=document.getElementById('down-type-hint');
  if(hint){
    if(t==='gift'){
      hint.textContent='🎁 贈与のため自己資金は減りません';
      hint.style.color='#2d7dd2';
    } else {
      hint.textContent='自己資金から支出';
      hint.style.color='var(--muted)';
    }
  }
  live();
}

// ===== 住宅：諸費用支払い方法切替 =====
function setCostType(t){
  document.getElementById('cost-type').value=t;
  document.getElementById('cost-cash').classList.toggle('on',t==='cash');
  document.getElementById('cost-loan').classList.toggle('on',t==='loan');
  calcLoanAmt();
}

// ===== 住宅：引き渡し年→何年後 自動計算 =====
function calcDelivery(){
  const yr=parseInt(document.getElementById('delivery-year')?.value)||0;
  const curYr=new Date().getFullYear();
  const del=yr>0?Math.max(0,yr-curYr):0;
  // hidden inputに反映
  const delEl=document.getElementById('delivery');
  if(delEl)delEl.value=del;
  const delDisp=document.getElementById('delivery-disp');
  if(delDisp)delDisp.value=del>0?del:'0';
  const hint=document.getElementById('delivery-hint');
  if(hint)hint.textContent=yr>0?(del===0?'✓ 今年引き渡し':`✓ ${yr}年（${del}年後）に引き渡し`):'';
  // 家賃行の表示切替
  const rentRow=document.getElementById('rent-row');
  if(rentRow)rentRow.style.display=del>0?'':'none';
  const rentHint=document.getElementById('rent-hint');
  if(rentHint&&del>0)rentHint.textContent=`引き渡しまでの${del}年間に計上`;
  live();
}

function _updateStepHints(prefix){
  const ids=new Set();
  document.querySelectorAll(`[id^="${prefix}-is-"]`).forEach(el=>{const m=el.id.match(new RegExp(`^(${prefix}-is-\\d+)-`));if(m)ids.add(m[1]);});
  ids.forEach(id=>calcStepHint(id));
}
function updateHints(){
  const hA=iv('husband-age');
  // 収入ステップのヒント更新（新形式）
  _updateStepHints('h');
  const hRetA=iv('retire-age'),hRetP=fv('retire-pay'),hPens=fv('pension-h');
  const hr=document.getElementById('h-retire-hint');
  if(hr)hr.textContent=`✓ ${hRetA}歳で退職`;
  const hrp=document.getElementById('h-retpay-hint');
  if(hrp)hrp.textContent=hRetP>0?`✓ ${hRetP.toLocaleString()}万円（退職時計上）`:'退職金なし';
  const hp=document.getElementById('h-pension-hint');
  const hPRcv=iv('pension-h-receive')||65;
  if(hp)hp.textContent=fv('pension-h')>0?`✓ ${fv('pension-h').toLocaleString()}万円/年（${hPRcv}歳〜）`:`${hPRcv}歳〜 受給`;
  const hDa=iv('h-death-age');
  const hdh=document.getElementById('h-death-hint');
  if(hdh)hdh.textContent=hDa>0?`✓ ${hDa}歳まで計算`:'設定なし';
  const sinfo=document.getElementById('survivor-info');
  if(sinfo)sinfo.style.display=hDa>0?'':'none';
  const d=iv('delivery'),y=new Date().getFullYear();
  // delivery-hint は calcDelivery() で管理（calcLoanAmtはoninputで管理）
  // 現預金合計ヒント＋購入後残高
  const chH=fv('cash-h')||0,chW=fv('cash-w')||0,chJ=fv('cash-joint')||0;
  const chTot=chH+chW+chJ;
  const cashTotEl=document.getElementById('cash-total-hint');
  if(cashTotEl)cashTotEl.textContent=`合計：${chTot.toLocaleString()}万円`;
  const _costType0=document.getElementById('cost-type')?.value||'cash';
  const _downDeduct=(downType==='own')?(fv('down-payment')||0):0;
  const _costDeduct=(_costType0==='cash')?(fv('house-cost')||0):0;
  const _moveDeduct=(fv('moving-cost')||0)+(fv('furniture-init')||0);
  const _cashAfter=chTot-_downDeduct-_costDeduct-_moveDeduct;
  const cashAfterEl=document.getElementById('cash-after-hint');
  if(cashAfterEl){
    cashAfterEl.textContent=`→ 購入後残高：${_cashAfter.toLocaleString()}万円`;
    cashAfterEl.style.color=_cashAfter>=0?'var(--green)':'var(--red)';
  }
  const fc=ivd('furn-cycle',10), fco=ivd('furn-cost',80);
  const fh=document.getElementById('furn-hint');
  if(fh)fh.textContent=`✓ ${fc}年ごとに${fco}万円`;
  // 車手放す年齢ヒント
  const carEA=iv('car-end-age');
  const carEH=document.getElementById('car-end-hint');
  if(carEH)carEH.textContent=carEA>0?`✓ ${carEA}歳で車を手放す`:'空欄＝ずっと乗り続ける';
  const rc=iv('repair-cycle')||15, rco=iv('repair-cost')||100;
  const rh=document.getElementById('repair-hint');
  if(rh)rh.textContent=`✓ ${rc}年ごとに${rco}万円`;
  const rc2=iv('repair-cycle2')||30, rco2=iv('repair-cost2')||0;
  const rh2=document.getElementById('repair-hint2');
  if(rh2)rh2.textContent=rco2>0?`✓ ${rc2}年ごとに${rco2}万円`:'（未設定）';
  // 修繕積立金ヒント
  const repAutoHint=document.getElementById('rep-auto-hint');
  if(repAutoHint&&ST.type==='mansion'){
    const sqmV=ivd('sqm',75);const repUnit=fv('rep-unit');
    if(repUnit>0){
      repAutoHint.textContent=`✓ 固定単価：${repUnit}円/㎡/月 → 年${Math.round(sqmV*repUnit*12/10000)}万円`;
    } else {
      const y1=repFund(sqmV,1),y10=repFund(sqmV,10),y20=repFund(sqmV,20);
      repAutoHint.textContent=`✓ 1年目:${y1}万→10年目:${y10}万→20年目:${y20}万（年額）`;
    }
  }
  const loanType=document.getElementById('loan-type')?.value||'equal_payment';
  const lTypeHint=document.getElementById('loan-type-hint');
  const mHint=document.getElementById('monthly-hint');
  if(loanType==='equal_payment'){
    $('monthly-pay').value=mpay(fv('loan-amt'),iv('loan-yrs')||35,fv('rate-base')).toFixed(2);
    if(lTypeHint)lTypeHint.textContent='月返済額が一定';
    if(mHint)mHint.textContent='✓ 元利均等返済（初年度）';
  } else {
    const ga=mpay_gankin_year(fv('loan-amt'),iv('loan-yrs')||35,fv('rate-base'),0)/12;
    $('monthly-pay').value=(Math.round(ga*100)/100).toFixed(2);
    if(lTypeHint)lTypeHint.textContent='元金部分が均等・利息は逓減';
    if(mHint)mHint.textContent='✓ 元金均等返済（1年目月額）';
  }
  // ペアローン月返済額更新
  if(pairLoanMode){
    const lhA=fv('loan-h-amt')||0,lhY=iv('loan-h-yrs')||35,lhR=fv('rate-h-base')||0.5;
    const lwA=fv('loan-w-amt')||0,lwY=iv('loan-w-yrs')||35,lwR=fv('rate-w-base')||0.5;
    const lhT=document.getElementById('loan-h-type')?.value||'equal_payment';
    const lwT=document.getElementById('loan-w-type')?.value||'equal_payment';
    const mH=lhT==='equal_payment'?mpay(lhA,lhY,lhR):(lhY>0?mpay_gankin_year(lhA,lhY,lhR,0)/12:0);
    const mW=lwT==='equal_payment'?mpay(lwA,lwY,lwR):(lwY>0?mpay_gankin_year(lwA,lwY,lwR,0)/12:0);
    const mhEl=document.getElementById('monthly-h-pay');if(mhEl)mhEl.value=mH.toFixed(2);
    const mwEl=document.getElementById('monthly-w-pay');if(mwEl)mwEl.value=mW.toFixed(2);
    const ptEl=document.getElementById('pair-total-pay');
    if(ptEl)ptEl.textContent=(Math.round((mH+mW)*100)/100).toFixed(2);
    const mhH=document.getElementById('monthly-h-hint');
    if(mhH)mhH.textContent=lhA>0?`✓ ${lhT==='equal_payment'?'元利均等':'元金均等'}`:'-';
    const mwH=document.getElementById('monthly-w-hint');
    if(mwH)mwH.textContent=lwA>0?`✓ ${lwT==='equal_payment'?'元利均等':'元金均等'}`:'-';
  }
  // フラット35月返済額更新
  if(loanCategory==='flat35')updateFlat35PayInfo();


  // ── 奥様ヒント更新 ──
  const wA=iv('wife-age');
  // 奥様収入ステップのヒント更新
  _updateStepHints('w');
  const wRtA=iv('w-retire-age'), wPensV=fv('pension-w');
  const wrth=document.getElementById('w-retire-hint');
  if(wrth)wrth.textContent=`✓ ${wRtA}歳で退職`;
  const wph=document.getElementById('w-pension-hint');
  const wPRcv=iv('pension-w-receive')||65;
  if(wph)wph.textContent=fv('pension-w')>0?`✓ ${fv('pension-w').toLocaleString()}万円/年（${wPRcv}歳〜）`:`${wPRcv}歳〜 受給`;
  const wDa=iv('w-death-age');
  const wdh=document.getElementById('w-death-hint');
  if(wdh)wdh.textContent=wDa>0?`✓ ${wDa}歳まで計算`:'設定なし';


  // マンション管理費を生活費欄に反映
  if(ST.type==='mansion'){
    const feeRow=$('lc-mgmt-fee-row'), netRow=$('lc-mgmt-net-row');
    if(feeRow)feeRow.style.display='';
    if(netRow)netRow.style.display='';
  } else {
    const feeRow=$('lc-mgmt-fee-row'), netRow=$('lc-mgmt-net-row');
    if(feeRow)feeRow.style.display='none';
    if(netRow)netRow.style.display='none';
    const mf=$('mgmt-fee'), mn=$('mgmt-net');
    if(mf)mf.value=''; if(mn)mn.value='';
  }

  // ── 住宅ローン控除ヒント更新 ──
  updateLctrlHint();
}

// ===== 住宅ローン控除ヒント（独立関数・onchangeでも呼べる） =====
function setLctrlDedMode(mode){
  _lctrlDedMode=mode;
  $('lctrl-mode-auto')?.classList.toggle('on',mode==='auto');
  $('lctrl-mode-manual')?.classList.toggle('on',mode==='manual');
  const mb=$('lctrl-manual-body');
  if(mb){
    mb.style.display=mode==='manual'?'block':'none';
    if(mode==='manual')buildLctrlManualInputs();
  }
  live();
}
function buildLctrlManualInputs(){
  const cont=$('lctrl-manual-inputs');if(!cont)return;
  const yr=parseInt($('lctrl-year')?.value)||2025;
  const tp=$('lctrl-type')?.value||'new_eco';
  const hh=$('lctrl-household')?.value||'general';
  const row=getLCtrlRow(yr,tp,hh==='kosodate');
  const yrs=row[1]||13;
  const existing=[];
  cont.querySelectorAll('input').forEach(el=>existing.push(el.value));
  cont.innerHTML='';
  for(let y=1;y<=yrs;y++){
    const prev=existing[y-1]||'';
    const d=document.createElement('div');
    d.className='fg';
    d.innerHTML=`<label class="lbl" style="font-size:9px">${y}年目</label><div class="suf"><input class="inp amt-inp" id="lctrl-m-${y}" type="number" value="${prev}" placeholder="" min="0" step="0.1" onfocus="scrollToCFRow('lCtrl')" onblur="cfRowBlur()" oninput="live()" style="font-size:10px"><span class="sl">万円</span></div>`;
    cont.appendChild(d);
  }
}
function getLctrlManualValues(){
  const vals=[];let y=1;
  while(true){const el=$(`lctrl-m-${y}`);if(!el)break;vals.push(parseFloat(el.value)||0);y++;}
  return vals;
}
function updateLctrlHint(){
  const lctrlHint=document.getElementById('lctrl-hint');
  if(!lctrlHint)return;
  const yr=parseInt(document.getElementById('lctrl-year')?.value)||2025;
  const tp=document.getElementById('lctrl-type')?.value||'new_eco';
  const hh=document.getElementById('lctrl-household')?.value||'general';
  const isK=hh==='kosodate';
  const row=getLCtrlRow(yr,tp,isK);
  const lmt=row[0], yrs=row[1];
  const maxCtrl=lmt>0?Math.round(lmt*0.007*10)/10:0;
  const typeNames={new_long:'新築（長期優良・低炭素）',new_zeh:'新築（ZEH水準）',new_eco:'新築（省エネ基準適合）',new_general:'新築（その他・一般）',used_eco:'中古（省エネ基準適合以上）',used_other:'中古（その他）'};
  const hhName=isK?'子育て・若者夫婦世帯':'一般世帯';
  if(lmt<=0){
    lctrlHint.style.background='#fee9e7';
    lctrlHint.innerHTML=`<span style="color:var(--red)">⚠️ <strong>${yr}年入居・${typeNames[tp]}（${hhName}）は住宅ローン控除の対象外です</strong><br>2024年以降の建築確認を受けた新築一般住宅は省エネ基準適合が必須です。</span>`;
  } else {
    lctrlHint.style.background='#e8f2fc';
    const note=(yr>=2028&&tp==='new_eco')?'<br><span style="color:#d63a2a;font-size:9px">⚠️ 2028年以降の省エネ基準適合新築は借入限度額2,000万・控除10年に縮小</span>':'';
    const note2=(yr>=2026)?'<span style="color:#2d7dd2;font-size:9px">　令和8年度税制改正適用</span>':'';
    lctrlHint.innerHTML=`<span style="color:#1a3a6a">📋 ${yr}年入居 / ${typeNames[tp]} / ${hhName}${note2}<br>借入上限：<strong>${lmt.toLocaleString()}万円</strong>　年最大控除：<strong>${maxCtrl}万円</strong>　控除期間：<strong>${yrs}年間</strong>（所得税・住民税上限内で計算）${note}</span>`;
  }
}

// ===== 修繕積立金モード =====
function setRepMode(m){
  repMode=m;
  document.getElementById('rep-auto').classList.toggle('on',m==='auto');
  document.getElementById('rep-manual').classList.toggle('on',m==='manual');
  document.getElementById('rep-auto-fields').style.display=m==='auto'?'':'none';
  document.getElementById('rep-manual-fields').style.display=m==='manual'?'':'none';
  live();
}
function addRepStep(){
  repStepCnt++;const id=repStepCnt;
  const el=document.createElement('div');
  el.id=`rps-${id}`;el.className='drow';el.style.cssText='display:flex;align-items:center;gap:4px';
  el.innerHTML=`<span class="dlbl" style="color:var(--amber);white-space:nowrap;font-size:9px;width:20px;text-align:center">変更<br>${id}</span>
    <div class="suf" style="flex:1"><input class="inp age-inp" id="rpsy-${id}" onfocus="scrollToCFRow('rep')" onblur="cfRowBlur()" type="number" value="${id*5}" min="1" max="60" oninput="live()"><span class="sl" style="padding:7px 5px;font-size:10px">年〜</span></div>
    <div class="suf" style="flex:1.5"><input class="inp amt-inp" id="rpsa-${id}" onfocus="scrollToCFRow('rep')" onblur="cfRowBlur()" type="number" placeholder="例:20000" min="0" oninput="live()"><span class="sl" style="padding:7px 5px;font-size:10px">円/月</span></div>
    <button class="btn-rm" onclick="document.getElementById('rps-${id}').remove();live()" style="padding:2px 6px;font-size:11px">×</button>`;
  document.getElementById('rep-steps-cont').appendChild(el);live();
}

function addRepAutoStep(){
  repAutoStepCnt++;const id=repAutoStepCnt;
  const el=document.createElement('div');
  el.id=`rpas-${id}`;el.className='drow';el.style.cssText='display:flex;align-items:center;gap:4px';
  el.innerHTML=`<span class="dlbl" style="color:var(--amber);white-space:nowrap;font-size:9px;width:20px;text-align:center">変更<br>${id}</span>
    <div class="suf" style="flex:1"><input class="inp age-inp" id="rpasy-${id}" onfocus="scrollToCFRow('rep')" onblur="cfRowBlur()" type="number" value="${id*5}" min="1" max="70" oninput="live()"><span class="sl" style="padding:7px 5px;font-size:10px">年〜</span></div>
    <div class="suf" style="flex:1.5"><input class="inp amt-inp" id="rpasu-${id}" onfocus="scrollToCFRow('rep')" onblur="cfRowBlur()" type="number" placeholder="例:200" min="0" oninput="live()"><span class="sl" style="padding:7px 5px;font-size:10px">円/㎡</span></div>
    <button class="btn-rm" onclick="document.getElementById('rpas-${id}').remove();live()" style="padding:2px 6px;font-size:11px">×</button>`;
  document.getElementById('rep-auto-steps-cont').appendChild(el);live();
}
// 修繕積立金を返す（万円/年）
function getRepFund(sqm,yr){
  if(sqm<=0&&repMode!=='manual')return 0;
  if(repMode==='manual'){
    // 手動モード：ステップ値を探す
    let base=fvd('rep-manual-base',12000);
    const steps=[];
    document.querySelectorAll('[id^="rpsy-"]').forEach(el=>{
      const sid=el.id.split('-')[1];
      steps.push({from:parseInt(el.value)||0,amt:fv(`rpsa-${sid}`)});
    });
    steps.sort((a,b)=>a.from-b.from);
    let amt=base;
    for(const s of steps)if(yr>=s.from&&s.amt>0)amt=s.amt;
    return Math.round(amt*12/10000);
  } else {
    // 自動モード：当初単価（空欄なら標準段階単価）＋値上げステップ
    const baseUnit=fv('rep-unit');
    // 値上げステップを収集
    const autoSteps=[];
    document.querySelectorAll('[id^="rpasy-"]').forEach(el=>{
      const sid=el.id.split('-')[1];
      const u=fv(`rpasu-${sid}`);
      if(u>0)autoSteps.push({from:parseInt(el.value)||0,unit:u});
    });
    autoSteps.sort((a,b)=>a.from-b.from);
    // 該当年のステップを探す
    let appliedUnit=baseUnit;
    for(const s of autoSteps){if(yr>=s.from)appliedUnit=s.unit;}
    if(appliedUnit>0){
      return Math.round(sqm*appliedUnit*12/10000);
    }
    // 標準段階単価（値上げステップがない場合）
    return repFund(sqm,yr);
  }
}

// ===== 物件タイプ切替 =====
function setType(t){
  ST.type=t;
  $('tc-m').classList.toggle('on',t==='mansion');
  $('tc-k').classList.toggle('on',t==='kodate');
  $('m-fields').style.display=t==='mansion'?'':'none';
  $('k-fields').style.display=t==='kodate'?'':'none';
  const repLbl=document.getElementById('repair-sub-lbl');
  if(repLbl)repLbl.textContent=t==='mansion'?'専有部分の修繕費':'修繕費';
  live();
}

// 修繕周期の動的追加
function addRepairCycle(cycle='',cost=''){
  repairCnt++;const id=repairCnt;
  if(repairCnt>=5)$('btn-add-repair').style.display='none';
  const el=document.createElement('div');
  el.id=`rep-${id}`;
  el.style.cssText='background:var(--light);border:1px solid var(--border);border-radius:var(--rs);padding:9px 11px;margin-bottom:7px';
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><div style="font-size:10px;font-weight:600;color:var(--muted)">修繕${id}</div><button class="btn-rm" onclick="rmRepairCycle(${id})">×</button></div>
    <div class="g2">
      <div class="fg"><label class="lbl">修繕周期</label>
        <div class="suf"><input class="inp age-inp" id="repair-cycle${id}" type="number" onfocus="scrollToCFRow('senyu')" onblur="cfRowBlur()" value="${cycle||30}" min="1" max="50" oninput="live()"><span class="sl">年に1回</span></div></div>
      <div class="fg"><label class="lbl">1回あたりの費用</label>
        <div class="suf"><input class="inp amt-inp" id="repair-cost${id}" type="number" onfocus="scrollToCFRow('senyu')" onblur="cfRowBlur()" value="${cost||200}" min="0" oninput="live()"><span class="sl">万円</span></div></div>
    </div>`;
  $('repair-cont').appendChild(el);live();
}
function rmRepairCycle(id){$(`rep-${id}`)?.remove();repairCnt--;$('btn-add-repair').style.display='';live()}

// ===== フラット35/20 =====

function setLoanCategory(cat){
  loanCategory=cat;
  $('lcat-std')?.classList.toggle('on',cat==='standard');
  $('lcat-flat')?.classList.toggle('on',cat==='flat35');
  // 標準ローンUI表示切替
  const toggle=$('loan-mode-toggle');
  if(toggle)toggle.style.display=cat==='standard'?'':'none';
  if(cat==='standard'){
    $('loan-single-body').style.display=pairLoanMode?'none':'';
    $('loan-pair-body').style.display=pairLoanMode?'':'none';
  } else {
    $('loan-single-body').style.display='none';
    $('loan-pair-body').style.display='none';
  }
  const fb=$('flat35-body');
  if(fb)fb.style.display=cat==='flat35'?'':'none';
  if(cat==='flat35')updateFlat35Info();
  live();
}

function setFlat35Sub(sub){
  flat35Sub=sub;
  $('flat-sub-35')?.classList.toggle('on',sub==='flat35');
  $('flat-sub-20')?.classList.toggle('on',sub==='flat20');
  const yrsEl=$('flat-loan-yrs');
  if(yrsEl){
    if(sub==='flat20'){
      yrsEl.max=20; if(parseInt(yrsEl.value)>20)yrsEl.value=20;
    } else {
      yrsEl.max=35;
    }
  }
  // 金利テーブルから選択中なら再適用
  if($('flat-rate-month')?.value)applyFlatRateFromTable();
  updateFlat35Info();
  live();
}

function calcFlat35Points(){
  const perf={'none':0,'b':1,'a':2,'zeh':3}[$('flat-perf')?.value||'none'];
  const maintain=$('flat-maintain')?.checked?1:0;
  const usedPlus=$('flat-used-plus')?.checked?1:0;
  const region=$('flat-region')?.checked?1:0;
  const children=iv('flat-children')||0;
  return perf+maintain+usedPlus+region+children;
}

function getFlat35Reductions(totalPt){
  // 各5年期間の最大引き下げ=0.50%
  // 1pt=0.25%(5yr), 2pt=0.50%(5yr), 3pt=0.50%+0.25%, 4pt=0.50%+0.50%
  // 5pt以上: 11-15年にオーバーフロー
  let r1=0,r2=0,r3=0;
  if(totalPt>=1)r1=0.25;
  if(totalPt>=2)r1=0.50;
  if(totalPt>=3)r2=0.25;
  if(totalPt>=4)r2=0.50;
  // 5pt以降は11-15年目にオーバーフロー（子育てプラス）
  if(totalPt>=5)r3=0.25;
  if(totalPt>=6)r3=0.50;
  // 7pt以上でも各期間最大0.50%
  return {y0_5:r1, y6_10:r2, y11_15:r3};
}

function getFlat35Rates(){
  const base=fv('flat-rate-base')||1.94;
  const pt=calcFlat35Points();
  const red=getFlat35Reductions(pt);
  const rates=[{from:0, rate:Math.max(0,base-red.y0_5)}];
  if(red.y6_10>0||red.y0_5!==red.y6_10)
    rates.push({from:5, rate:Math.max(0,base-red.y6_10)});
  if(red.y11_15>0)
    rates.push({from:10, rate:Math.max(0,base-red.y11_15)});
  // 引き下げ期間終了後はベース金利に戻る
  const lastRedEnd=red.y11_15>0?15:red.y6_10>0?10:red.y0_5>0?5:0;
  if(lastRedEnd>0&&lastRedEnd<50)
    rates.push({from:lastRedEnd, rate:base});
  return rates.sort((a,b)=>a.from-b.from);
}

function updateFlat35Info(){
  const pt=calcFlat35Points();
  const red=getFlat35Reductions(pt);
  const base=fv('flat-rate-base')||1.94;
  const loanAmt=fv('loan-amt')||0;
  const yrs=iv('flat-loan-yrs')||35;
  const loanType=$('flat-loan-type')?.value||'equal_payment';
  // 合計ポイント
  const ptEl=$('flat-total-pt');
  if(ptEl)ptEl.textContent=pt;
  // 期間ごとの表を構築
  const tbody=$('flat-rate-tbody');
  if(tbody){
    const periods=[];
    if(pt===0){
      periods.push({label:'全期間',red:0,rate:base});
    } else {
      periods.push({label:'当初5年',red:red.y0_5,rate:Math.max(0,base-red.y0_5)});
      if(red.y6_10>0)periods.push({label:'6〜10年目',red:red.y6_10,rate:Math.max(0,base-red.y6_10)});
      if(red.y11_15>0)periods.push({label:'11〜15年目',red:red.y11_15,rate:Math.max(0,base-red.y11_15)});
      const lastEnd=red.y11_15>0?15:red.y6_10>0?10:red.y0_5>0?5:0;
      if(lastEnd>0&&lastEnd<yrs)periods.push({label:`${lastEnd+1}年目〜`,red:0,rate:base});
    }
    let html='';
    periods.forEach((p,i)=>{
      const mPay=loanAmt>0?(loanType==='equal_payment'?mpay(loanAmt,yrs,p.rate):(mpay_gankin_year(loanAmt,yrs,p.rate,0)/12)):0;
      const bg=i%2===0?'#e8f2fc':'#f4f8fd';
      const redTxt=p.red>0?`△${p.red.toFixed(2)}%`:'―';
      const redColor=p.red>0?'color:#d63a2a;font-weight:600':'color:var(--muted)';
      html+=`<tr style="background:${bg}">
        <td style="padding:4px 6px;border:1px solid #b8d0f0">${p.label}</td>
        <td style="padding:4px 6px;border:1px solid #b8d0f0;text-align:right;${redColor}">${redTxt}</td>
        <td style="padding:4px 6px;border:1px solid #b8d0f0;text-align:right;font-weight:600">${p.rate.toFixed(2)}%</td>
        <td style="padding:4px 6px;border:1px solid #b8d0f0;text-align:right;font-weight:700;color:var(--blue)">${mPay>0?mPay.toFixed(2):'―'} 万円</td>
      </tr>`;
    });
    tbody.innerHTML=html;
  }
  // 月返済額ヒント・総返済額
  updateFlat35PayInfo();
}

function initFlatRateSelect(){
  const sel=$('flat-rate-month');if(!sel)return;
  sel.innerHTML='<option value="">-- 手動入力 --</option>';
  // 新しい月が上に来るよう逆順で追加
  for(let i=FLAT_RATE_TABLE.length-1;i>=0;i--){
    const r=FLAT_RATE_TABLE[i];
    const [y,m]=r[0].split('-');
    const label=`${y}年${parseInt(m)}月`;
    sel.insertAdjacentHTML('beforeend',`<option value="${r[0]}">${label}（35: ${r[1]}% / 20: ${r[2]}%）</option>`);
  }
  // 最新月をデフォルト選択
  const latest=FLAT_RATE_TABLE[FLAT_RATE_TABLE.length-1];
  if(latest){sel.value=latest[0];applyFlatRateFromTable();}
}
function applyFlatRateFromTable(){
  const sel=$('flat-rate-month');if(!sel||!sel.value)return;
  const row=FLAT_RATE_TABLE.find(r=>r[0]===sel.value);
  if(!row)return;
  const isFl20=flat35Sub==='flat20';
  const rate=isFl20?row[2]:row[1];
  const rateEl=$('flat-rate-base');
  if(rateEl)rateEl.value=rate;
  const hint=$('flat-rate-hint');
  const [y,m]=row[0].split('-');
  if(hint)hint.textContent=`✓ ${y}年${parseInt(m)}月の${isFl20?'フラット20':'フラット35'}金利を適用`;
  updateFlat35Info();
  live();
}
function updateFlat35PayInfo(){
  const loanAmt=fv('loan-amt')||0;
  const yrs=iv('flat-loan-yrs')||35;
  const loanType=$('flat-loan-type')?.value||'equal_payment';
  const rates=getFlat35Rates();
  const rate0=rates[0]?.rate??1.94;
  // 月返済額（当初）— ヘッダー欄用
  let mPay;
  if(loanType==='equal_payment'){
    mPay=mpay(loanAmt,yrs,rate0);
  } else {
    mPay=mpay_gankin_year(loanAmt,yrs,rate0,0)/12;
  }
  const mEl=$('flat-monthly-pay');
  if(mEl)mEl.value=mPay>0?mPay.toFixed(2):'―';
  // 総返済額（各年の返済額を合算）
  let total=0;
  for(let yr=0;yr<yrs;yr++){
    const r=effRate(yr,rates);
    if(loanType==='equal_payment'){
      total+=mpay(loanAmt,yrs,r)*12;
    } else {
      total+=mpay_gankin_year(loanAmt,yrs,r,yr);
    }
  }
  const tEl=$('flat-result-total');
  if(tEl)tEl.textContent=total>0?Math.round(total).toLocaleString():'―';
  // ヒント
  const hEl=$('flat-monthly-hint');
  if(hEl)hEl.textContent=loanType==='equal_payment'?'✓ 元利均等返済（当初金利）':'✓ 元金均等返済（1年目月額）';
}
