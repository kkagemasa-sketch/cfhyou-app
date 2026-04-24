// income.js — 収入ステップ・手取り計算・年金

// ===== 遺族厚生年金の概算ヒント更新 =====
function updateSurvHint(p){
  const gross=fv(`${p}-gross-monthly`)||0;
  const bonus=fv(`${p}-gross-bonus`)||0;
  const hintEl=document.getElementById(`${p}-surv-hint`);
  if(!hintEl)return;
  if(gross<=0){
    hintEl.textContent='入力すると遺族厚生年金の目安を表示します';
    hintEl.style.color='var(--light)';
    return;
  }
  const start=iv(`pension-${p}-start`)||22;
  const retA=p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60);
  const joinM=Math.min(480,Math.max((retA-start)*12,300));
  // 収入ステップがあれば精密計算、なければ額面月収×0.75で推定
  let hyojun;
  const avgH=calcAvgHyojun(p, start, retA);
  if(avgH!==null){
    hyojun=avgH;
  }else{
    const capped=Math.min(gross,65);
    const bonusCapped=Math.min(bonus,300);
    hyojun=(capped*12+bonusCapped)/12*0.75;
  }
  const iko=Math.round(hyojun*5.481/1000*joinM*0.75*10)/10;
  hintEl.textContent=`遺族厚生年金（目安）約${iko}万円/年（就職${start}歳・退職${retA}歳）`;
  hintEl.style.color='#3a8a3a';
}

// ===== 現在年齢 → 段階１開始年齢 の単方向連動 =====
function syncStep1From(person, ageEl){
  const age=parseInt(ageEl.value)||0;
  if(age<=0)return;
  const el=document.getElementById(`${person}-is-1-from`);
  if(el)el.value=age;
}

function setRetirePay(on){
  retirePayOn=on;
  document.getElementById('rp-yes').classList.toggle('on', on);
  document.getElementById('rp-no').classList.toggle('on', !on);
  document.getElementById('rp-fields').style.display=on?'':'none';
  if(!on){
    const rp=document.getElementById('retire-pay');
    if(rp)rp.value='';
  }
  live();
}

function setWRetirePay(on){
  wRetirePayOn=on;
  document.getElementById('w-rp-yes').classList.toggle('on', on);
  document.getElementById('w-rp-no').classList.toggle('on', !on);
  document.getElementById('w-rp-fields').style.display=on?'':'none';
  if(!on){
    const rp=document.getElementById('w-retire-pay');
    if(rp)rp.value='';
  }
  live();
}

// ===== 手取り計算機 =====
let _calcTypeH='emp', _calcTypeW='emp'; // 'emp'=正社員, 'fuyo'=扶養内パート
function setCalcType(person,type){
  if(person==='h'){
    _calcTypeH=type;
    $('calc-type-emp')?.classList.toggle('on',type==='emp');
    $('calc-type-fuyo')?.classList.toggle('on',type==='fuyo');
    const note=$('calc-note');
    if(note)note.textContent=type==='fuyo'?'※扶養内パート：社会保険は配偶者の扶養に加入（自己負担なし）':'※会社員・協会けんぽ標準モデルによる概算';
    calcTakeHome();
  }else{
    _calcTypeW=type;
    $('w-calc-type-emp')?.classList.toggle('on',type==='emp');
    $('w-calc-type-fuyo')?.classList.toggle('on',type==='fuyo');
    const note=$('w-calc-note');
    if(note)note.textContent=type==='fuyo'?'※扶養内パート：社会保険は配偶者の扶養に加入（自己負担なし）':'※会社員・協会けんぽ標準モデルによる概算';
    calcTakeHomeW();
  }
}
function calcTakeHomeBase(gross, resultId, detailId, isFuyo){
  const result = document.getElementById(resultId);
  const detail = document.getElementById(detailId);
  if(!gross||gross<=0){
    if(result)result.textContent='―';
    if(detail)detail.style.display='none';
    return;
  }
  // 扶養内パート：社会保険料なし（配偶者の社保に加入）
  // 年齢は参考計算機なので40歳想定（介護保険料加算）
  const shakai = isFuyo ? 0 : Math.round(gross * calcShakaiRate(40) * 10) / 10;
  const kyuyo = calcKyuyoDed(gross);
  const grossSyotoku = Math.max(0, gross - kyuyo);
  const [kisoIt, kisoJu] = calcKisoDed(grossSyotoku);
  const taxableBase = Math.max(0, grossSyotoku - shakai - kisoIt);
  // 配偶者控除：参考計算機では一律適用（簡略）
  const taxable = Math.max(0, taxableBase - 38);
  let income_tax = 0;
  // 扶養内パート：給与収入103万以下は所得税0（給与所得控除55万+基礎控除48万=103万）
  if(!isFuyo || gross > 103){
    income_tax = calcIncomeTax(taxable);
  }
  // 住民税：非課税基準は自治体によるが概ね100万以下で非課税
  let jumin;
  if(isFuyo && gross <= 100){
    jumin = 0; // 住民税非課税
  } else {
    const juminTaxable = Math.max(0, grossSyotoku - shakai - kisoJu - 33);
    jumin = calcJuminTax(juminTaxable);
  }
  const takeHome = Math.round((gross - shakai - income_tax - jumin) * 10) / 10;
  if(result)result.textContent = takeHome.toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1}) + '万円';
  if(detail){
    detail.style.display='block';
    const shakaiD=Math.round(shakai*10)/10;
    const itaxD=Math.round(income_tax*10)/10;
    const juminD=Math.round(jumin*10)/10;
    let html = `社会保険料：<strong>${shakaiD.toLocaleString()}万円</strong>　所得税：<strong>${itaxD.toLocaleString()}万円</strong>　住民税：<strong>${juminD.toLocaleString()}万円</strong>`;
    // 扶養内パートで壁を超えている場合に注意表示
    if(isFuyo && gross > 130){
      html += `<div style="color:#d63a2a;font-weight:600;margin-top:4px">⚠ 年収130万超：社会保険の扶養から外れる可能性があります</div>`;
    } else if(isFuyo && gross > 106){
      html += `<div style="color:#e67e22;font-weight:600;margin-top:4px">⚠ 年収106万超：従業員51人以上の会社では社保加入の可能性あり</div>`;
    }
    detail.innerHTML = html;
  }
}
function calcTakeHomeW(){
  calcTakeHomeBase(fv('w-calc-gross'),'w-calc-result','w-calc-detail',_calcTypeW==='fuyo');
}
function calcTakeHome(){
  calcTakeHomeBase(fv('calc-gross'),'calc-result','calc-detail',_calcTypeH==='fuyo');
}

// ===== 年金概算計算 =====
function calcPension(person){
  const isH = person==='h';
  const startAge = iv(`pension-${person}-start`)||22;
  const retireAge = isH ? (iv('retire-age')||60) : (iv('w-retire-age')||60);
  // 加入月数（最大480ヶ月=40年）
  const months = Math.min(480, Math.max(0, retireAge - startAge) * 12);
  // 生涯平均標準報酬月額を精密計算（収入ステップ活用）
  let avgMonthly;
  const avgH=calcAvgHyojun(person, startAge, retireAge);
  if(avgH!==null){
    avgMonthly=Math.round(avgH);
  }else{
    // フォールバック: ステップ端の平均から推計
    const steps = getStepsForPension(person);
    const avgNet = steps.length > 0 ? steps.reduce((s,v)=>s+v,0)/steps.length : (isH?541:322);
    const _coeff=avgNet<300?0.84:avgNet<500?0.80:avgNet<700?0.77:avgNet<900?0.74:avgNet<1100?0.71:0.68;
    const avgGrossYear = Math.round(avgNet / _coeff);
    avgMonthly = Math.round(avgGrossYear / 12);
  }
  // 老齢厚生年金（本来水準）= 平均標準報酬月額 × 5.481/1000 × 加入月数
  const koseiRaw = Math.round(avgMonthly * 5.481 / 1000 * months);
  // 老齢基礎年金 = 満額約80万 × 加入月数/480
  const kisoRaw = Math.round(80 * months / 480);
  // 税・社保控除（概算15%）
  const total = Math.round((koseiRaw + kisoRaw) * 0.85);
  // 入力欄に反映
  const el = document.getElementById(`pension-${person}`);
  if(el) el.value = total;
  // ヒントに内訳表示
  const hint = document.getElementById(`${person}-pension-hint`);
  if(hint) hint.textContent = `✓ 厚生年金:${koseiRaw}万+基礎年金:${kisoRaw}万 → 手取り概算:${total}万円/年（平均月収${avgMonthly}万・加入${Math.round(months/12)}年）`;
  live();
}
function getStepsForPension(person){
  const nets=[];
  const ids=new Set();
  document.querySelectorAll(`[id^="${person}-is-"]`).forEach(el=>{
    const m=el.id.match(new RegExp(`^${person}-is-(\d+)-`));
    if(m)ids.add(`${person}-is-${m[1]}`);
  });
  ids.forEach(base=>{
    const nf=_amtVal(document.getElementById(`${base}-net-from`));
    const nt=_amtVal(document.getElementById(`${base}-net-to`))||nf;
    if(nf>0)nets.push(nf,nt);
  });
  return nets;
}

function syncNextStepFrom(id){
  // id形式: h-is-1 → 次は h-is-2
  const m=id.match(/^([hw]-is-)(\d+)$/);
  if(!m)return;
  const nextId=m[1]+(parseInt(m[2])+1);
  const toEl=document.getElementById(id+'-to');
  const fromEl=document.getElementById(nextId+'-from');
  if(!toEl||!fromEl)return;
  const toVal=parseInt(toEl.value)||0;
  if(toVal>0)fromEl.value=toVal+1;
  live();
}
function addIncomeStep(person){
  const cnt = person==='h' ? ++hIncomeCnt : ++wIncomeCnt;
  const id = `${person}-is-${cnt}`;
  const hAge = parseInt(document.getElementById('husband-age')?.value)||30;
  const wAge = parseInt(document.getElementById('wife-age')?.value)||29;
  const baseAge = person==='h' ? hAge : wAge;
  // 直前ステップの終了年齢+1 を開始年齢にデフォルト設定
  const cont = document.getElementById(`${person}-income-cont`);
  const prevTos = cont ? cont.querySelectorAll('[id$="-to"]:not([id*="-net-to"])') : [];
  const lastTo = prevTos.length > 0 ? (parseInt(prevTos[prevTos.length-1].value)||0) : 0;
  const defFrom = lastTo > 0 ? lastTo + 1 : baseAge;
  const defTo = defFrom + 10;
  const el=document.createElement('div');
  el.id=id;
  el.style.cssText='background:var(--gray-bg);border:1px solid var(--border);border-radius:var(--rs);padding:8px 10px;margin-bottom:6px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--navy)">段階${cnt}</span>
      <button class="btn-rm" onclick="document.getElementById('${id}').remove();live()">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;margin-bottom:6px">
      <div class="fg">
        <label class="lbl">開始年齢</label>
        <div class="suf"><input class="inp age-inp" id="${id}-from" type="number" onfocus="scrollToCFRowRange(this.id.includes('h-is')?'hInc':'wInc','${id}-from','${id}-to')" onblur="cfRowBlur()" value="${defFrom}" min="18" max="80" oninput="calcStepHint('${id}')"><span class="sl">歳</span></div>
      </div>
      <div style="font-size:13px;color:var(--muted);text-align:center;padding-top:18px">→</div>
      <div class="fg">
        <label class="lbl">終了年齢</label>
        <div class="suf"><input class="inp age-inp" id="${id}-to" type="number" onfocus="scrollToCFRowRange(this.id.includes('h-is')?'hInc':'wInc','${id}-from','${id}-to')" onblur="cfRowBlur()" value="${defTo}" min="18" max="80" oninput="calcStepHint('${id}');syncNextStepFrom('${id}')"><span class="sl">歳</span></div>
      </div>
    </div>
    <div style="display:flex;gap:4px;margin-bottom:6px">
      <button class="btn-tog on" id="${id}-mode-amt" onclick="setStepMode('${id}','amt')" style="flex:1;padding:6px 4px">金額で入力</button>
      <button class="btn-tog" id="${id}-mode-pct" onclick="setStepMode('${id}','pct')" style="flex:1;padding:6px 4px">割合で入力</button>
    </div>
    <div id="${id}-amt-body">
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center">
        <div class="fg">
          <label class="lbl">開始時の手取り年収</label>
          <div class="suf"><input class="inp amt-inp" id="${id}-net-from" type="number" onfocus="scrollToCFRowRange(this.id.startsWith('h')?'hInc':'wInc','${id}-from','${id}-to')" onblur="cfRowBlur()" value="" placeholder="例:500" min="0" oninput="calcStepHint('${id}')"><span class="sl">万円</span></div>
        </div>
        <div style="font-size:13px;color:var(--muted);text-align:center;padding-top:18px">→</div>
        <div class="fg">
          <label class="lbl">終了時の手取り年収</label>
          <div class="suf"><input class="inp amt-inp" id="${id}-net-to" type="number" onfocus="scrollToCFRowRange(this.id.startsWith('h')?'hInc':'wInc','${id}-from','${id}-to')" onblur="cfRowBlur()" value="" placeholder="例:1000" min="0" oninput="calcStepHint('${id}')"><span class="sl">万円</span></div>
        </div>
      </div>
    </div>
    <div id="${id}-pct-body" style="display:none">
      <div class="fg">
        <label class="lbl">直前の手取りに対する割合</label>
        <div class="suf"><input class="inp" id="${id}-pct" type="number" value="100" min="0" max="200" step="5" oninput="calcPctIncome('${id}')" style="font-size:14px;font-weight:700;width:80px"><span class="sl">%</span></div>
      </div>
      <div id="${id}-pct-hint" style="font-size:11px;color:#2d7dd2;margin-top:4px"></div>
    </div>
    <div id="${id}-hint" style="font-size:11px;color:#3a8a3a;margin-top:6px;font-weight:600">手取り：― 万円 → ― 万円</div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:7px;border-top:1px solid var(--border);flex-wrap:wrap">
      <label title="この段階は育休期間" style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:#d97706;cursor:pointer;white-space:nowrap;background:#fff3e0;border:1px solid #ffb74d;border-radius:4px;padding:3px 6px;user-select:none">
        <input type="checkbox" id="${id}-matleave" onchange="onMatLeaveToggle('${id}')" style="margin:0;cursor:pointer;accent-color:#d97706">
        🍼 育休
      </label>
      <span style="font-size:10px;font-weight:700;color:var(--muted);white-space:nowrap">イベント</span>
      <input id="${id}-leave" class="inp" oninput="live()" style="font-size:11px;padding:4px 8px;border-radius:5px;flex:1;min-width:120px" placeholder="例:産休・育休、時短、転職 等" value="">
      <span style="font-size:10px;color:var(--muted);white-space:nowrap">← CF表のイベント行に表示</span>
    </div>`;
  document.getElementById(`${person}-income-cont`).appendChild(el);
  live();
}
// カンマ付きamt-inp対応：_rawValueがあればそちらを使う
function _amtVal(el){
  if(!el)return 0;
  if(el._rawValue!==undefined)return el._rawValue;
  return parseFloat(String(el.value).replace(/,/g,''))||0;
}
function calcStepHint(id){
  const nf=_amtVal(document.getElementById(`${id}-net-from`));
  const nt=_amtVal(document.getElementById(`${id}-net-to`));
  const af=parseInt(document.getElementById(`${id}-from`)?.value)||0;
  const at=parseInt(document.getElementById(`${id}-to`)?.value)||0;
  const hint=document.getElementById(`${id}-hint`);
  if(hint){
    if(!nf&&!nt){hint.textContent='手取り：― 万円 → ― 万円';}
    else{
      const span=Math.max(1,at-af);
      const annual=Math.round((nt-nf)/span*10)/10;
      const dir=annual>0?`+${annual}万円/年増加`:annual<0?`${annual}万円/年減少`:'変動なし';
      hint.textContent=`✓ ${af}歳${nf.toLocaleString()}万→${at}歳${nt.toLocaleString()}万　（${dir}）`;
    }
  }
  // フォーカス中のステップのみハイライト更新（updateHints 一括呼び出しで別ステップを上書きしない）
  const rowKey = id.startsWith('h-is') ? 'hInc' : 'wInc';
  if(_cfActive && _cfActive.rowKey === rowKey && af > 0 && at > 0){
    // stepId または activeElement で「このステップが編集中」か確認
    const ae = document.activeElement;
    const focusedHere = (_cfActive.stepId === id) ||
      (ae && (ae.id===`${id}-from`||ae.id===`${id}-to`||
              ae.id===`${id}-net-from`||ae.id===`${id}-net-to`));
    if(focusedHere){
      _cfActive.fromAge = af;
      _cfActive.toAge   = at;
      clearTimeout(_cfScrollTimer);
      _cfScrollTimer = setTimeout(()=>_applyHighlight(false), 30);
    }
  }
  live();
}

// ── 収入段階：金額/割合モード切替 ──
function setStepMode(id,mode){
  const amtBtn=$(`${id}-mode-amt`),pctBtn=$(`${id}-mode-pct`);
  const amtBody=$(`${id}-amt-body`),pctBody=$(`${id}-pct-body`);
  if(amtBtn)amtBtn.classList.toggle('on',mode==='amt');
  if(pctBtn)pctBtn.classList.toggle('on',mode==='pct');
  if(amtBody)amtBody.style.display=mode==='amt'?'block':'none';
  if(pctBody)pctBody.style.display=mode==='pct'?'block':'none';
  if(mode==='pct')calcPctIncome(id);
}
function calcPctIncome(id){
  const pct=parseFloat($(`${id}-pct`)?.value)||0;
  // 直前の段階の終了時手取りを探す
  const person=id.startsWith('h-')?'h':'w';
  const cont=$(`${person}-income-cont`);
  if(!cont)return;
  const steps=cont.querySelectorAll('[id^="'+person+'-is-"]');
  let prevIncome=0;
  let foundSelf=false;
  steps.forEach(el=>{
    if(el.id===id){foundSelf=true;return;}
    if(!foundSelf){
      const nt=_amtVal($(`${el.id}-net-to`))||_amtVal($(`${el.id}-net-from`));
      if(nt>0)prevIncome=nt;
    }
  });
  if(prevIncome===0){
    // 段階が1つ目なら手取り計算機の値を参照
    const calcResult=$(`${person}-calc-result`);
    if(calcResult){
      const txt=calcResult.textContent.replace(/[^0-9.]/g,'');
      prevIncome=parseFloat(txt)||0;
    }
  }
  const calcIncome=Math.round(prevIncome*pct/100);
  const hint=$(`${id}-pct-hint`);
  if(hint){
    if(prevIncome>0){
      hint.innerHTML=`直前の手取り <strong>${prevIncome}</strong>万円 × ${pct}% = <strong>${calcIncome}</strong>万円`;
    }else{
      hint.textContent='直前の段階を入力してください';
    }
  }
  // 金額欄に自動反映
  const nfEl=$(`${id}-net-from`);
  const ntEl=$(`${id}-net-to`);
  if(nfEl)nfEl.value=calcIncome;
  if(ntEl)ntEl.value=calcIncome;
  calcStepHint(id);
}
// ── プリセット追加 ──
function addPresetIncome(type){
  addIncomeStep('w');
  const cont=$('w-income-cont');
  if(!cont)return;
  const steps=cont.querySelectorAll('[id^="w-is-"]');
  const lastStep=steps[steps.length-1];
  if(!lastStep)return;
  const id=lastStep.id;
  // 開始年齢：直前ステップの終了年齢
  const fromEl=$(`${id}-from`),toEl=$(`${id}-to`);
  if(type==='maternity'){
    // 産休・育休: 1年間60%
    if(toEl)toEl.value=parseInt(fromEl?.value||30)+1;
    setStepMode(id,'pct');
    const pctEl=$(`${id}-pct`);if(pctEl)pctEl.value=60;
    const leaveEl=$(`${id}-leave`);if(leaveEl)leaveEl.value='産休・育休';
    const mlCb=$(`${id}-matleave`);if(mlCb){mlCb.checked=true;if(typeof onMatLeaveToggle==='function')onMatLeaveToggle(id);}
    calcPctIncome(id);
  }else if(type==='short'){
    // 時短勤務: 3年間80%
    if(toEl)toEl.value=parseInt(fromEl?.value||30)+3;
    setStepMode(id,'pct');
    const pctEl=$(`${id}-pct`);if(pctEl)pctEl.value=80;
    const leaveEl=$(`${id}-leave`);if(leaveEl)leaveEl.value='時短勤務';
    calcPctIncome(id);
  }
}

// ===== DC・iDeCoバリデーション =====
const IDECO_LIMITS={emp_dc:2.0, emp_nodc:2.3, civil:1.2, self:6.8, homemaker:2.3};

function validateDC(p){
  const otherPension=document.getElementById(`dc-${p}-other-pension`)?.value||'none';
  const cap=otherPension==='none'?5.5:2.75;
  const employer=fv(`dc-${p}-employer`)||0;
  const matchEl=document.getElementById(`dc-${p}-matching`);
  let matching=fv(`dc-${p}-matching`)||0;
  // マッチング≦事業主掛金、合計≦上限
  if(matching>employer){matching=employer;if(matchEl)matchEl.value=matching;}
  if(employer+matching>cap){matching=Math.max(0,cap-employer);if(matchEl)matchEl.value=matching;}
  const hint=document.getElementById(`dc-${p}-hint`);
  if(hint){
    if(employer>0||matching>0){
      hint.textContent=`✓ 掛金合計 ${(employer+matching).toFixed(1)}万円/月（上限${cap}万円）`;
    }else{hint.textContent='';}
  }
}

function validateiDeCo(p){
  const job=document.getElementById(`ideco-${p}-job`)?.value||'emp_dc';
  const cap=IDECO_LIMITS[job]||2.3;
  const el=document.getElementById(`ideco-${p}-monthly`);
  let monthly=fv(`ideco-${p}-monthly`)||0;
  if(monthly>cap){monthly=cap;if(el)el.value=monthly;}
  const hint=document.getElementById(`ideco-${p}-hint`);
  if(hint){
    if(monthly>0){
      hint.textContent=`✓ 月額${monthly.toFixed(1)}万円（上限${cap}万円）`;
    }else{hint.textContent='';}
  }
}

function estimateTaxSaving(takeHome, deduction){
  // 手取り年収から限界税率を推定して節税額を計算
  if(deduction<=0)return{total:0,incomeTax:0,residentTax:0};
  // 手取り→額面変換
  let gross=0;
  for(let gi=0;gi<TAX.length-1;gi++){
    if(takeHome<=TAX[gi][1]){gross=TAX[gi][0];break;}
    if(takeHome<TAX[gi+1][1]){
      const r=(takeHome-TAX[gi][1])/(TAX[gi+1][1]-TAX[gi][1]);
      gross=Math.round(TAX[gi][0]+r*(TAX[gi+1][0]-TAX[gi][0]));break;
    }
    gross=TAX[TAX.length-1][0];
  }
  if(gross<=0&&takeHome>0)gross=TAX[TAX.length-1][0];
  // 限界所得税率を推定
  const shakai=gross*0.1437;
  let kyuyo;
  if(gross<=180)kyuyo=Math.max(55,gross*0.4);
  else if(gross<=360)kyuyo=gross*0.3+18;
  else if(gross<=660)kyuyo=gross*0.2+54;
  else if(gross<=850)kyuyo=gross*0.1+120;
  else if(gross<=1000)kyuyo=gross*0.05+172.5;
  else kyuyo=195;
  const taxable=Math.max(0,gross-kyuyo-shakai-48-38);
  let marginalRate;
  if(taxable<=195)marginalRate=0.05;
  else if(taxable<=330)marginalRate=0.10;
  else if(taxable<=695)marginalRate=0.20;
  else if(taxable<=900)marginalRate=0.23;
  else if(taxable<=1800)marginalRate=0.33;
  else if(taxable<=4000)marginalRate=0.40;
  else marginalRate=0.45;
  const incomeTax=Math.round(deduction*marginalRate*1.021*10)/10;
  const residentTax=Math.round(deduction*0.1*10)/10;
  return{
    total:Math.round((incomeTax+residentTax)*10)/10, incomeTax, residentTax,
    gross, shakai, kyuyo, taxable, marginalRate, deduction
  };
}

function updateDCTaxHint(p){
  const matching=fv(`dc-${p}-matching`)||0;
  const idecoMonthly=fv(`ideco-${p}-monthly`)||0;
  const annualDeduction=(matching+idecoMonthly)*12; // 年間控除対象額
  // 手取り年収を推定（現在の最初のステップから）
  const steps=getIncomeSteps(p==='h'?'h':'w');
  const baseAge=p==='h'?(iv('husband-age')||30):(iv('wife-age')||29);
  const takeHome=getIncomeAtAge(steps, baseAge)||0;
  const saving=estimateTaxSaving(takeHome, annualDeduction);
  const hint=document.getElementById(`dc-${p}-tax-hint`);
  if(hint){
    if(saving.total>0){
      hint.textContent=`💰 年間約${saving.total}万円の節税効果（所得税${saving.incomeTax}万＋住民税${saving.residentTax}万）`;
    }else{hint.textContent='';}
  }
  // 受取方法ヒント
  updateDCReceiptHint(p);
}

function updateDCReceiptHint(p){
  const method=document.getElementById(`dc-${p}-method`)?.value||'lump';
  const receiveAge=iv(`dc-${p}-receive-age`)||60;
  const retAge=p==='h'?(iv('retire-age')||60):(iv('w-retire-age')||60);
  const joinYrs=Math.max(1,retAge-(p==='h'?(iv('pension-h-start')||22):(iv('pension-w-start')||22)));
  const hint=document.getElementById(`dc-${p}-receipt-hint`);
  if(!hint)return;
  // method から年金受給期間を抽出
  const _parseYrs=(m)=>{const mt=String(m||'').match(/(annuity|combo)(\d+)?/);return mt&&mt[2]?parseInt(mt[2]):20;};
  const annYrs=_parseYrs(method);
  if(method==='lump'){
    // 退職所得控除の概算
    const ctrl=joinYrs<=20?40*joinYrs:800+70*(joinYrs-20);
    hint.innerHTML=`一時金受取：退職所得控除 約${ctrl}万円（勤続${joinYrs}年）`;
  }else if(/^annuity/.test(method)){
    hint.innerHTML=`年金受取：${receiveAge}歳〜${receiveAge+annYrs-1}歳の${annYrs}年間に分割（公的年金等控除あり）`;
  }else{
    hint.innerHTML=`併用：半額を一時金＋残り半額を${receiveAge}歳〜${receiveAge+annYrs-1}歳の${annYrs}年年金`;
  }
}

// ===== 生涯平均標準報酬月額の計算 =====
// 収入ステップを活用して加入期間全体の平均を精密に計算する
// - ステップがカバーする期間: 手取り→額面変換で正確に計算
// - ステップより前の期間（就職～現在）: 最初のステップ値から60%→100%の線形推定
// - ステップがない場合: null を返す（呼び出し側でフォールバック）
function calcAvgHyojun(person, startAge, retireAge){
  const steps=getIncomeSteps(person);
  if(steps.length===0) return null;
  const NET2GROSS=function(net){
    // 手取り年収→額面年収の変換係数（calcPensionと同じ）
    const c=net<300?0.84:net<500?0.80:net<700?0.77:net<900?0.74:net<1100?0.71:0.68;
    return net/c;
  };
  let sumHyojun=0, countMonths=0;
  const firstAgeFrom=steps[0].ageFrom;
  const firstNetFrom=steps[0].netFrom;
  for(let age=startAge; age<retireAge; age++){
    let net=getIncomeAtAge(steps, age);
    if(net<=0 && age<firstAgeFrom && firstNetFrom>0){
      // 就職〜最初のステップ: 60%→100%の線形成長で推定
      const span=Math.max(1, firstAgeFrom-startAge);
      const progress=(age-startAge)/span;
      net=firstNetFrom*(0.6+0.4*progress);
    }
    if(net<=0) continue; // カバーされない期間はスキップ
    const grossYear=NET2GROSS(net);
    const hyojunMonth=Math.min(grossYear/12, 65); // 標準報酬月額上限65万
    sumHyojun+=hyojunMonth*12;
    countMonths+=12;
  }
  return countMonths>0 ? sumHyojun/countMonths : null;
}

// ===== メイン計算 =====
// グローバル版（万が一シミュレーションからも利用）
function getIncomeSteps(person){
  const steps=[];
  const ids=new Set();
  document.querySelectorAll(`[id^="${person}-is-"]`).forEach(el=>{
    const m=el.id.match(new RegExp(`^${person}-is-(\\d+)-`));
    if(m)ids.add(`${person}-is-${m[1]}`);
  });
  ids.forEach(base=>{
    const ageFrom=parseInt(document.getElementById(`${base}-from`)?.value)||0;
    const ageTo=parseInt(document.getElementById(`${base}-to`)?.value)||0;
    const nfEl=document.getElementById(`${base}-net-from`);
    const ntEl=document.getElementById(`${base}-net-to`);
    const nfRaw=nfEl?.value;
    const ntRaw=ntEl?.value;
    const netFrom=_amtVal(nfEl);
    const netTo=ntEl?_amtVal(ntEl):netFrom;
    // 「明示的に0と入力された」ステップも有効として扱う（産休・育休の0万円表現を保持）
    const hasNF=typeof nfRaw==='string'&&nfRaw.replace(/,/g,'').trim()!=='';
    const hasNT=typeof ntRaw==='string'&&ntRaw.replace(/,/g,'').trim()!=='';
    if(ageFrom>0&&ageTo>=ageFrom&&(hasNF||hasNT||netFrom>0||netTo>0)){
      steps.push({ageFrom,ageTo,netFrom,netTo});
    }
  });
  return steps.sort((a,b)=>a.ageFrom-b.ageFrom);
}
function getIncomeAtAge(steps,age){
  if(steps.length===0)return 0;
  for(let si=0;si<steps.length;si++){
    const s=steps[si];
    const isLast=si===steps.length-1;
    const nextFrom=isLast?Infinity:steps[si+1].ageFrom;
    // 次ステップの開始年齢未満まで現ステップが担当（隙間を作らない）
    if(age>=s.ageFrom&&(isLast?age<=s.ageTo:age<nextFrom)){
      const span=Math.max(1,s.ageTo-s.ageFrom);
      const ratio=(age-s.ageFrom)/span;
      return Math.round(s.netFrom+(s.netTo-s.netFrom)*ratio);
    }
  }
  return 0;
}
