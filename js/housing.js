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
      hint.textContent=`住宅価格${price.toLocaleString()}万円 − 頭金${down.toLocaleString()}万円 ＋ 諸費用${cost.toLocaleString()}万円`;
    else
      hint.textContent=`住宅価格${price.toLocaleString()}万円 − 頭金${down.toLocaleString()}万円（諸費用${cost.toLocaleString()}万円は現金）`;
  }
  // rate-base-dummy同期
  const rateDummy=document.getElementById('rate-base-dummy');
  const rateBase=document.getElementById('rate-base');
  if(rateDummy&&rateBase)rateDummy.value=rateBase.value;
  // 頭金・諸費用のオプション表示を同期
  toggleDownOpts();toggleCostOpts();
  live();
}

// ===== 頭金・諸費用のオプション表示切替 =====
function toggleDownOpts(){
  const el=document.getElementById('down-opts');
  const hint=document.getElementById('down-type-hint');
  const v=fv('down-payment')||0;
  if(el)el.style.display=v>0?'flex':'none';
  if(hint)hint.style.display=v>0?'':'none';
}
function toggleCostOpts(){
  const el=document.getElementById('cost-opts');
  const v=fv('house-cost')||0;
  if(el)el.style.display=v>0?'flex':'none';
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
  const hDa=iv('h-death-age')||83;
  const hdh=document.getElementById('h-death-hint');
  if(hdh)hdh.textContent=hDa>0?`✓ ${hDa}歳まで計算`:'83歳（デフォルト）';
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
  // 修繕積立金 自動表示更新
  if(ST.type==='mansion'&&typeof _renderRepAutoDisplay==='function')_renderRepAutoDisplay();
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
  const wDa=iv('w-death-age')||88;
  const wdh=document.getElementById('w-death-hint');
  if(wdh)wdh.textContent=wDa>0?`✓ ${wDa}歳まで計算`:'88歳（デフォルト）';


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

// ===== 修繕積立金 =====
// 手入力チェックボックス切替
function setRepMode(mode){
  const isManual=mode==='manual';
  const chk=document.getElementById('rep-manual-toggle');
  if(chk)chk.checked=isManual;
  const autoWrap=document.getElementById('rep-auto-wrap');
  const manualWrap=document.getElementById('rep-manual-input-wrap');
  if(autoWrap)autoWrap.style.display=isManual?'none':'';
  if(manualWrap)manualWrap.style.display=isManual?'':'none';
  const btnAuto=document.getElementById('rep-mode-auto');
  const btnManual=document.getElementById('rep-mode-manual');
  if(btnAuto)btnAuto.classList.toggle('on',!isManual);
  if(btnManual)btnManual.classList.toggle('on',isManual);
  live();
}
function toggleRepManual(){
  const chk=document.getElementById('rep-manual-toggle');
  setRepMode(chk?.checked?'manual':'auto');
}
// 選択中のマンションマスターを取得
function _getSelectedMansion(){
  if(!_selectedMansionId)return null;
  return _mansionMaster.find(m=>m.id===_selectedMansionId)||null;
}
// 指定年の修繕積立金 単価（円/㎡/月）を返す
// マンションマスターの基準単価＋値上げステップに基づく
function _getMansionRepUnitAtYear(mansion,yr){
  if(!mansion)return 0;
  const base=parseFloat(mansion.repUnit)||0;
  const steps=Array.isArray(mansion.repSteps)?[...mansion.repSteps]:[];
  steps.sort((a,b)=>a.fromYear-b.fromYear);
  let u=base;
  for(const s of steps){if(yr>=s.fromYear&&s.unit>0)u=s.unit;}
  return u;
}
// 自動表示エリア描画（左側：マンション管理からのステップ表）
function _renderRepAutoDisplay(){
  const el=document.getElementById('rep-auto-display');
  if(!el)return;
  const m=_getSelectedMansion();
  if(!m){
    el.innerHTML='<span style="color:var(--muted)">マンションを選択すると自動表示されます</span>';
    return;
  }
  const sqm=ivd('sqm',75);
  const base=parseFloat(m.repUnit)||0;
  const rawSteps=Array.isArray(m.repSteps)?[...m.repSteps]:[];
  // 有効ステップ（単価>0、年度≥2）のみ、かつ同年度重複排除
  const byYear=new Map();
  rawSteps.forEach(s=>{
    const y=parseInt(s.fromYear)||0;
    const u=parseFloat(s.unit)||0;
    if(y>=2&&u>0)byYear.set(y,u);
  });
  const steps=[];
  byYear.forEach((unit,fromYear)=>steps.push({fromYear,unit}));
  steps.sort((a,b)=>a.fromYear-b.fromYear);
  // 1年目〜を先頭に追加
  const allSteps=[{fromYear:1,unit:base},...steps];
  let html='';
  for(let i=0;i<allSteps.length;i++){
    const s=allSteps[i];
    const next=allSteps[i+1];
    const rangeText=next?(s.fromYear+'年目〜'+(next.fromYear-1)+'年目'):(s.fromYear+'年目〜');
    const monthly=Math.round(s.unit*sqm);
    const yearly=(monthly*12/10000);
    const yearlyStr=yearly>=10?Math.round(yearly)+'万円':yearly.toFixed(1)+'万円';
    const bg=i===0?'#f0f9ff':'#fefce8';
    const bd=i===0?'#0ea5e9':'#eab308';
    html+='<div style="padding:4px 8px;background:'+bg+';border-left:3px solid '+bd+';margin-bottom:3px;border-radius:3px">'
      +'<div style="font-weight:700;color:var(--ink);font-size:10px">'+rangeText+'</div>'
      +'<div style="color:var(--muted);font-size:9px">'+s.unit+'円/㎡/月 × '+sqm+'㎡</div>'
      +'<div style="color:var(--teal);font-weight:700;font-size:11px">月 '+monthly.toLocaleString()+'円【年 '+yearlyStr+'】</div>'
      +'</div>';
  }
  if(!html){
    el.innerHTML='<span style="color:var(--muted)">マンション管理で修繕基準単価を設定してください</span>';
    return;
  }
  el.innerHTML=html;
}
// 手入力ステップを収集（1年目基準＋追加ステップ）
function _collectRepManualSteps(){
  const base=fv('rep-manual-base');
  const byYear=new Map();
  document.querySelectorAll('#rep-steps-cont [id^="rpsy-"]').forEach(el=>{
    const sid=el.id.split('-')[1];
    const y=parseInt(el.value)||0;
    const amt=fv('rpsa-'+sid);
    if(y>=2&&amt>0)byYear.set(y,amt);
  });
  const steps=[];
  byYear.forEach((amt,from)=>steps.push({from,amt}));
  steps.sort((a,b)=>a.from-b.from);
  return {base,steps};
}
// 手入力モード：指定年の月額（円）
function _getRepManualMonthlyAtYear(yr){
  const {base,steps}=_collectRepManualSteps();
  let amt=base;
  for(const s of steps){if(yr>=s.from)amt=s.amt;}
  return amt;
}
// 手入力プレビュー描画
function _renderRepManualPreview(){
  const el=document.getElementById('rep-manual-preview');
  if(!el)return;
  const {base,steps}=_collectRepManualSteps();
  if(!(base>0)&&steps.length===0){el.style.display='none';el.innerHTML='';return;}
  const allSteps=[{from:1,amt:base||0},...steps];
  let html='';
  for(let i=0;i<allSteps.length;i++){
    const s=allSteps[i];
    const next=allSteps[i+1];
    const rangeText=next?(s.from+'年目〜'+(next.from-1)+'年目'):(s.from+'年目〜');
    const monthly=Math.round(s.amt);
    const yearly=(monthly*12/10000);
    const yearlyStr=yearly>=10?Math.round(yearly)+'万円':yearly.toFixed(1)+'万円';
    html+='<div>▸ '+rangeText+': '+monthly.toLocaleString()+'円/月【年 '+yearlyStr+'】</div>';
  }
  el.innerHTML=html;
  el.style.display='';
}
// 手入力ステップ行を追加
function addRepStep(){
  const cont=document.getElementById('rep-steps-cont');
  if(!cont)return;
  repStepCnt++;
  const sid=repStepCnt;
  const row=document.createElement('div');
  row.id='rps-'+sid;
  row.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:4px';
  row.innerHTML='<div class="suf" style="flex:0 0 110px"><input class="inp age-inp" id="rpsy-'+sid+'" type="number" min="2" placeholder="例:6" oninput="_renderRepManualPreview();live()" style="font-size:12px"><span class="sl" style="font-size:9px">年目〜</span></div>'
    +'<div class="suf" style="flex:1;min-width:0"><input class="inp amt-inp" id="rpsa-'+sid+'" type="number" min="0" placeholder="例:20000" oninput="_renderRepManualPreview();live()" style="font-size:11px"><span class="sl" style="font-size:9px">円/月</span></div>'
    +'<button class="btn-del" onclick="document.getElementById(\'rps-'+sid+'\').remove();_renderRepManualPreview();live()" style="flex-shrink:0;font-size:10px;padding:2px 6px">×</button>';
  cont.appendChild(row);
}
// 修繕積立金を返す（万円/年）
function getRepFund(sqm,yr){
  // 手入力チェックがONならステップ付き手入力値で上書き
  const manualOn=document.getElementById('rep-manual-toggle')?.checked;
  if(manualOn){
    const amt=_getRepManualMonthlyAtYear(yr);
    if(amt>0)return Math.round(amt*12/10000);
    // 互換：旧データのrep-manual-override
    const override=fv('rep-manual-override');
    if(override>0)return Math.round(override*12/10000);
    return 0;
  }
  // マンションマスターが選択されていればその基準単価＋ステップを使用
  const m=_getSelectedMansion();
  if(m){
    if(sqm<=0)return 0;
    const unit=_getMansionRepUnitAtYear(m,yr);
    if(unit>0)return Math.round(sqm*unit*12/10000);
    return 0;
  }
  // マンション未選択：標準段階単価で算出
  if(sqm<=0)return 0;
  return repFund(sqm,yr);
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
  // マンション選択プルダウン表示制御
  const msRow=$('mansion-select-row');
  if(msRow)msRow.style.display=t==='mansion'?'':'none';
  if(t==='mansion')populateMansionSelect();
  live();
}

// ===== マンションマスター管理（Firebase共有+localStorageキャッシュ） =====
async function loadMansionMaster(){
  // まずlocalStorageキャッシュから即時表示（オフライン対応）
  try{
    const raw=localStorage.getItem('cf_mansion_master');
    _mansionMaster=raw?JSON.parse(raw):[];
  }catch(e){_mansionMaster=[];}
  populateMansionSelect();

  // Firebase準備完了後、クラウドから最新を取得
  if(window._firebaseReadyPromise){
    try{
      const ok=await window._firebaseReadyPromise;
      if(!ok||!window._firebase)return;
      const fb=window._firebase;
      const snap=await fb.getDocs(fb.collection(fb.db,'mansions'));
      _mansionMaster=snap.docs.map(d=>({id:d.id,...d.data()}));
      // ローカルキャッシュを更新
      localStorage.setItem('cf_mansion_master',JSON.stringify(_mansionMaster));
      populateMansionSelect();
      // マンション管理モーダルが開いていれば再描画
      const ov=document.getElementById('mansion-mgmt-overlay');
      if(ov&&ov.style.display!=='none'&&typeof _renderMansionList==='function'){
        _renderMansionList();
      }
    }catch(e){
      console.warn('[Firebase] マンションマスター読込失敗（キャッシュ使用）:',e);
    }
  }
}
window.loadMansionMaster=loadMansionMaster;

// ローカルキャッシュへ保存（Firebase保存は別関数）
function saveMansionMaster(){
  localStorage.setItem('cf_mansion_master',JSON.stringify(_mansionMaster));
}

// 単一マンションをクラウドに保存
async function saveMansionToCloud(mansion){
  if(!window._firebase||!window._firebaseReady){
    alert('クラウド接続中です。数秒待ってから再度お試しください。');
    return false;
  }
  try{
    const fb=window._firebase;
    const ref=fb.doc(fb.db,'mansions',mansion.id);
    await fb.setDoc(ref,{
      name:mansion.name||'',
      mgmtUnit:mansion.mgmtUnit||0,
      repUnit:mansion.repUnit||0,
      netFee:mansion.netFee||0,
      repSteps:Array.isArray(mansion.repSteps)?mansion.repSteps:[],
      updatedAt:Date.now()
    });
    return true;
  }catch(e){
    console.error('[Firebase] マンション保存失敗:',e);
    alert('クラウドへの保存に失敗しました: '+e.message);
    return false;
  }
}
window.saveMansionToCloud=saveMansionToCloud;

// 単一マンションをクラウドから削除
async function deleteMansionFromCloud(id){
  if(!window._firebase||!window._firebaseReady){
    alert('クラウド接続中です。数秒待ってから再度お試しください。');
    return false;
  }
  try{
    const fb=window._firebase;
    const ref=fb.doc(fb.db,'mansions',id);
    await fb.deleteDoc(ref);
    return true;
  }catch(e){
    console.error('[Firebase] マンション削除失敗:',e);
    alert('クラウドからの削除に失敗しました: '+e.message);
    return false;
  }
}
window.deleteMansionFromCloud=deleteMansionFromCloud;
function populateMansionSelect(){
  const sel=$('mansion-select');
  if(!sel)return;
  const cur=sel.value;
  sel.innerHTML='<option value="">-- 選択なし --</option>';
  _mansionMaster.forEach(m=>{
    const o=document.createElement('option');
    o.value=m.id;o.textContent=m.name;
    sel.appendChild(o);
  });
  if(cur)sel.value=cur;
}
function onMansionSelect(id){
  _selectedMansionId=id;
  const sqmRow=$('mansion-sqm-row');
  if(!id){
    if(sqmRow)sqmRow.style.display='none';
    $('mansion-auto-hint').style.display='none';
    return;
  }
  if(sqmRow)sqmRow.style.display='';
  applyMansionData();
}
function onMansionSqmChange(){
  if(!_selectedMansionId)return;
  applyMansionData();
}
function applyMansionData(){
  const m=_mansionMaster.find(x=>x.id===_selectedMansionId);
  if(!m)return;
  const sqmEl=$('mansion-sqm');
  const sqmV=parseFloat(sqmEl?.value)||0;
  if(sqmV<=0){
    const hint=$('mansion-auto-hint');
    if(hint){hint.textContent='※ 専有面積を入力してください';hint.style.display='';}
    return;
  }
  // 管理費自動入力
  const mgmtFee=Math.round(m.mgmtUnit*sqmV);
  const mfEl=$('mgmt-fee');
  if(mfEl)mfEl.value=mgmtFee;
  // インターネット使用料自動入力
  const netEl=$('mgmt-net');
  if(netEl&&m.netFee>0)netEl.value=m.netFee;
  // 専有面積同期
  const sqmMain=$('sqm');
  if(sqmMain)sqmMain.value=sqmV;
  // 修繕積立金 自動表示エリアを更新
  if(typeof _renderRepAutoDisplay==='function')_renderRepAutoDisplay();
  // ヒント表示
  const hint=$('mansion-auto-hint');
  if(hint){
    let hintTxt=`✓ 管理費 ${m.mgmtUnit}円/㎡ → ${mgmtFee.toLocaleString()}円/月、修繕積立金 ${m.repUnit}円/㎡/月`;
    if(m.netFee>0)hintTxt+=`、ネット ${m.netFee.toLocaleString()}円/月`;
    hintTxt+=' をセット';
    hint.textContent=hintTxt;
    hint.style.display='';
  }
  live();
}

// 修繕周期の動的追加
function addRepairCycle(cycle='',cost=''){
  repairCnt++;const id=repairCnt;
  if(repairCnt>=5)$('btn-add-repair').style.display='none';
  const el=document.createElement('div');
  el.id=`rep-${id}`;
  el.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap';
  el.innerHTML=`<span style="font-size:10px;font-weight:600;color:var(--muted);flex-shrink:0">修繕${id}</span>
    <div class="suf" style="flex:0 0 auto;width:100px"><input class="inp age-inp" id="repair-cycle${id}" type="number" onfocus="scrollToCFRow('senyu')" onblur="cfRowBlur()" value="${cycle||30}" min="1" max="50" oninput="live()" style="font-size:11px"><span class="sl" style="font-size:9px">年毎</span></div>
    <div class="suf" style="flex:0 0 auto;width:110px"><input class="inp amt-inp" id="repair-cost${id}" type="number" onfocus="scrollToCFRow('senyu')" onblur="cfRowBlur()" value="${cost||200}" min="0" oninput="live()" style="font-size:11px"><span class="sl" style="font-size:9px">万円/回</span></div>
    <button class="btn-rm" onclick="rmRepairCycle(${id})" style="flex-shrink:0">×</button>`;
  $('repair-cont').appendChild(el);live();
}
function rmRepairCycle(id){$(`rep-${id}`)?.remove();repairCnt--;$('btn-add-repair').style.display='';live()}

// ===== フラット35/20 =====

function setLoanCategory(cat){
  loanCategory=cat;
  $('lcat-std')?.classList.toggle('on',cat==='standard');
  $('lcat-flat')?.classList.toggle('on',cat==='flat35');
  // 単独/ペアトグルは常に表示（フラット35でもペアローン可）
  const toggle=$('loan-mode-toggle');
  if(toggle)toggle.style.display='';
  if(cat==='standard'){
    $('loan-single-body').style.display=pairLoanMode?'none':'';
    $('loan-pair-body').style.display=pairLoanMode?'':'none';
  } else {
    $('loan-single-body').style.display='none';
    $('loan-pair-body').style.display='none';
  }
  const fb=$('flat35-body');
  if(fb)fb.style.display=cat==='flat35'?'':'none';
  // フラット内の単独/ペアパネル切替
  const fsp=$('flat-single-panel');
  const fpp=$('flat-pair-panel');
  if(fsp)fsp.style.display=(cat==='flat35'&&!pairLoanMode)?'':'none';
  if(fpp)fpp.style.display=(cat==='flat35'&&pairLoanMode)?'':'none';
  if(cat==='flat35')updateFlat35Info();
  live();
}

function setFlat35Sub(sub){
  flat35Sub=sub;
  $('flat-sub-35')?.classList.toggle('on',sub==='flat35');
  $('flat-sub-20')?.classList.toggle('on',sub==='flat20');
  $('flat-sub-50')?.classList.toggle('on',sub==='flat50');
  const maxYrs=sub==='flat50'?50:sub==='flat20'?20:35;
  ['flat-loan-yrs','flat-loan-h-yrs','flat-loan-w-yrs'].forEach(id=>{
    const el=$(id);
    if(el){el.max=maxYrs;if(parseInt(el.value)>maxYrs)el.value=maxYrs;}
  });
  // 金利テーブルから選択中なら再適用
  if($('flat-rate-month')?.value)applyFlatRateFromTable();
  updateFlat35Info();
  live();
}

function calcFlat35Points(){
  const perf={'none':0,'b':1,'a':2,'zeh':3,'reno-b':2,'reno-a':4}[$('flat-perf')?.value||'none'];
  const maintain=$('flat-maintain')?.checked?1:0;
  const usedPlus=$('flat-used-plus')?.checked?1:0;
  const region=parseInt($('flat-region')?.value)||0;
  const children=iv('flat-children')||0;
  const youngCouple=$('flat-young-couple')?.checked?1:0;
  return perf+maintain+usedPlus+region+children+youngCouple;
}

function getFlat35Reductions(totalPt){
  // 住宅金融支援機構 公式制度準拠
  // 1pt = 年▲0.25% × 5年間
  // 各5年期間の上限 = 4pt分 = 年▲1.00%
  // 4ptを超えた分は6年目以降に繰り越し（5-8pt→6-10年目、9-12pt→11-15年目）
  let rem=totalPt;
  const p1=Math.min(rem,4); rem-=p1;  // 当初5年: 最大4pt
  const p2=Math.min(rem,4); rem-=p2;  // 6-10年目: 最大4pt
  const p3=Math.min(rem,4);           // 11-15年目: 最大4pt
  return {y0_5:p1*0.25, y6_10:p2*0.25, y11_15:p3*0.25};
}

function getFlat35Rates(){
  const base=fv('flat-rate-base')||1.94;
  const pt=calcFlat35Points();
  const red=getFlat35Reductions(pt);
  const rnd=v=>Math.round(Math.max(0,v)*100)/100; // 浮動小数点丸め
  const rates=[{from:0, rate:rnd(base-red.y0_5)}];
  if(red.y6_10>0||red.y0_5!==red.y6_10)
    rates.push({from:5, rate:rnd(base-red.y6_10)});
  if(red.y11_15>0)
    rates.push({from:10, rate:rnd(base-red.y11_15)});
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
  const isPair=pairLoanMode;
  const loanAmt=isPair?((fv('flat-loan-h-amt')||0)+(fv('flat-loan-w-amt')||0)):fv('loan-amt')||0;
  const yrs=isPair?Math.max(iv('flat-loan-h-yrs')||35,iv('flat-loan-w-yrs')||35):(iv('flat-loan-yrs')||35);
  const loanType=isPair?'equal_payment':($('flat-loan-type')?.value||'equal_payment');
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
    const _hAmt=isPair?(fv('flat-loan-h-amt')||0):0;
    const _wAmt=isPair?(fv('flat-loan-w-amt')||0):0;
    const _hYrs=isPair?(iv('flat-loan-h-yrs')||35):0;
    const _wYrs=isPair?(iv('flat-loan-w-yrs')||35):0;
    const _hTp=isPair?($('flat-loan-h-type')?.value||'equal_payment'):'';
    const _wTp=isPair?($('flat-loan-w-type')?.value||'equal_payment'):'';
    periods.forEach((p,i)=>{
      let mPay=0;
      if(isPair){
        if(_hAmt>0)mPay+=_hTp==='equal_payment'?mpay(_hAmt,_hYrs,p.rate):(mpay_gankin_year(_hAmt,_hYrs,p.rate,0)/12);
        if(_wAmt>0)mPay+=_wTp==='equal_payment'?mpay(_wAmt,_wYrs,p.rate):(mpay_gankin_year(_wAmt,_wYrs,p.rate,0)/12);
      } else {
        mPay=loanAmt>0?(loanType==='equal_payment'?mpay(loanAmt,yrs,p.rate):(mpay_gankin_year(loanAmt,yrs,p.rate,0)/12)):0;
      }
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
    sel.insertAdjacentHTML('beforeend',`<option value="${r[0]}">${label}（35: ${r[1]}% / 20: ${r[2]}% / 50: ${r[3]}%）</option>`);
  }
  // 最新月をデフォルト選択
  const latest=FLAT_RATE_TABLE[FLAT_RATE_TABLE.length-1];
  if(latest){sel.value=latest[0];applyFlatRateFromTable();}
}
function applyFlatRateFromTable(){
  const sel=$('flat-rate-month');if(!sel||!sel.value)return;
  const row=FLAT_RATE_TABLE.find(r=>r[0]===sel.value);
  if(!row)return;
  const sub=flat35Sub;
  const rate=sub==='flat20'?row[2]:sub==='flat50'?row[3]:row[1];
  if(rate==null){alert('この月のフラット50金利データがありません');return;}
  const rateEl=$('flat-rate-base');
  if(rateEl)rateEl.value=rate;
  const hint=$('flat-rate-hint');
  const [y,m]=row[0].split('-');
  const subLabel=sub==='flat20'?'フラット20':sub==='flat50'?'フラット50':'フラット35';
  if(hint)hint.textContent=`✓ ${y}年${parseInt(m)}月の${subLabel}金利を適用`;
  updateFlat35Info();
  live();
}
function updateFlat35PayInfo(){
  const isPair=pairLoanMode;
  const rates=getFlat35Rates();
  const rate0=rates[0]?.rate??1.94;

  if(isPair){
    // ペアローン：合算で月返済額・総返済額を算出
    const hAmt=fv('flat-loan-h-amt')||0, wAmt=fv('flat-loan-w-amt')||0;
    const hYrs=iv('flat-loan-h-yrs')||35, wYrs=iv('flat-loan-w-yrs')||35;
    const hType=$('flat-loan-h-type')?.value||'equal_payment';
    const wType=$('flat-loan-w-type')?.value||'equal_payment';
    const mH=hAmt>0?(hType==='equal_payment'?mpay(hAmt,hYrs,rate0):mpay_gankin_year(hAmt,hYrs,rate0,0)/12):0;
    const mW=wAmt>0?(wType==='equal_payment'?mpay(wAmt,wYrs,rate0):mpay_gankin_year(wAmt,wYrs,rate0,0)/12):0;
    const mEl=$('flat-monthly-pay');
    if(mEl)mEl.value=(mH+mW)>0?(mH+mW).toFixed(2):'―';
    // 総返済額
    let total=0;
    const maxYrs=Math.max(hYrs,wYrs);
    for(let yr=0;yr<maxYrs;yr++){
      const r=effRate(yr,rates);
      if(hAmt>0&&yr<hYrs)total+=(hType==='equal_payment'?mpay(hAmt,hYrs,r)*12:mpay_gankin_year(hAmt,hYrs,r,yr));
      if(wAmt>0&&yr<wYrs)total+=(wType==='equal_payment'?mpay(wAmt,wYrs,r)*12:mpay_gankin_year(wAmt,wYrs,r,yr));
    }
    const tEl=$('flat-result-total');
    if(tEl)tEl.textContent=total>0?Math.round(total).toLocaleString():'―';
    const hEl=$('flat-monthly-hint');
    if(hEl)hEl.textContent='✓ ペアローン合算（当初金利）';
  } else {
    // 単独ローン
    const loanAmt=fv('loan-amt')||0;
    const yrs=iv('flat-loan-yrs')||35;
    const loanType=$('flat-loan-type')?.value||'equal_payment';
    let mPay;
    if(loanType==='equal_payment'){
      mPay=mpay(loanAmt,yrs,rate0);
    } else {
      mPay=mpay_gankin_year(loanAmt,yrs,rate0,0)/12;
    }
    const mEl=$('flat-monthly-pay');
    if(mEl)mEl.value=mPay>0?mPay.toFixed(2):'―';
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
    const hEl=$('flat-monthly-hint');
    if(hEl)hEl.textContent=loanType==='equal_payment'?'✓ 元利均等返済（当初金利）':'✓ 元金均等返済（1年目月額）';
  }
}
