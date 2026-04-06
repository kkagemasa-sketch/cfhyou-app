// assets.js — 保険・有価証券・車両・ペアローン

// ===== 一時払い保険 =====
function addInsLump(person){
  person=person||'h';
  insLumpCnt++;const id=insLumpCnt;
  const el=document.createElement('div');
  el.id=`ins-lump-${person}-${id}`;
  el.style.cssText='background:#fff8ee;border:1px solid #f0c060;border-radius:var(--rs);padding:9px 10px;margin-bottom:8px';
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:start">
      <div class="fg">
        <label class="lbl" style="font-size:9px">加入年齢</label>
        <div class="suf"><input class="inp age-inp" id="ins-lump-enroll-${person}-${id}" type="number" value="" placeholder="例:40" min="20" max="90" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">拠出額（一括）</label>
        <div class="suf"><input class="inp amt-inp" id="ins-lump-amt-${person}-${id}" type="number" value="" placeholder="例:500" min="0" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万円</span></div>
        <span style="font-size:9px;color:#b8860b;font-weight:600">※支出に自動計上</span>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">満期年齢</label>
        <div class="suf"><input class="inp age-inp" id="ins-lump-matage-${person}-${id}" type="number" value="" placeholder="例:60" min="30" max="100" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div>
      </div>
      <button class="btn-rm" onclick="document.getElementById('ins-lump-${person}-${id}').remove();live()" style="margin-top:18px">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
      <div class="fg">
        <label class="lbl" style="font-size:9px">想定利率（年）</label>
        <div class="suf"><input class="inp amt-inp" id="ins-lump-rate-${person}-${id}" type="number" value="" placeholder="例:1.5" min="0" max="10" step="0.1" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">%/年</span></div>
        <span style="font-size:9px;color:var(--light)">入力時は満期額を自動計算</span>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">満期返戻金</label>
        <div style="display:flex;gap:4px;align-items:center">
          <div class="suf" style="flex:1"><input class="inp amt-inp" id="ins-lump-matamt-${person}-${id}" type="number" value="" placeholder="例:600" min="0" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万円</span></div>
          <span style="font-size:9px;color:var(--light);white-space:nowrap">または</span>
          <div class="suf" style="flex:1"><input class="inp amt-inp" id="ins-lump-pct-${person}-${id}" type="number" value="" placeholder="例:120" min="0" max="300" step="0.1" oninput="calcInsLumpPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">%</span></div>
        </div>
        <span style="font-size:9px;color:var(--light)">固定額 or 拠出額に対する返戻率</span>
      </div>
    </div>
    <div id="ins-lump-preview-${person}-${id}" style="margin-top:6px;font-size:10px;color:#7a5a00;background:#fff3cc;border-radius:4px;padding:4px 8px;display:none"></div>`;
  document.getElementById(`ins-lump-cont-${person}`).appendChild(el);live();
}

function calcInsLumpPreview(person,id){
  const pBaseAge=person==='h'?iv('husband-age'):iv('wife-age');
  const enrollAge=iv(`ins-lump-enroll-${person}-${id}`)||pBaseAge||0;
  const amt=fv(`ins-lump-amt-${person}-${id}`)||0;
  const matAge=iv(`ins-lump-matage-${person}-${id}`)||0;
  const rate=fv(`ins-lump-rate-${person}-${id}`)||0;
  const matAmtFixed=fv(`ins-lump-matamt-${person}-${id}`)||0;
  const pct=fv(`ins-lump-pct-${person}-${id}`)||0;
  const prev=document.getElementById(`ins-lump-preview-${person}-${id}`);
  if(!prev)return live();
  if(amt<=0||matAge<=0){prev.style.display='none';return live();}
  const yrs=matAge-enrollAge;
  if(yrs<=0){prev.style.display='none';return live();}
  let matVal=0;
  if(rate>0){matVal=Math.round(amt*Math.pow(1+rate/100,yrs)*10)/10;}
  else if(matAmtFixed>0){matVal=matAmtFixed;}
  else if(pct>0){matVal=Math.round(amt*pct/100*10)/10;}
  if(matVal<=0){prev.style.display='none';return live();}
  const returnRate=Math.round(matVal/amt*1000)/10;
  const rateColor=returnRate>=100?'#0d8a20':'#d63a2a';
  prev.style.display='';
  prev.innerHTML=`拠出：<strong>${amt.toLocaleString()}万円</strong>（${enrollAge}歳）　満期受取：<strong>${matVal.toLocaleString()}万円</strong>（${matAge}歳・${yrs}年後）　返戻率：<strong style="color:${rateColor}">${returnRate}%</strong>`;
  live();
}

// ===== 積み立て保険 =====
function addInsSaving(person){
  person=person||'h';
  insSavCnt++;const id=insSavCnt;
  const el=document.createElement('div');
  el.id=`ins-${person}-${id}`;
  el.style.cssText='background:#fdf6ff;border:1px solid #d8b8f0;border-radius:var(--rs);padding:9px 10px;margin-bottom:8px';
  el.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:start;margin-bottom:6px">
      <div class="fg">
        <label class="lbl" style="font-size:9px">加入年齢</label>
        <div class="suf"><input class="inp age-inp" id="ins-enroll-${person}-${id}" type="number" value="" placeholder="現在年齢" min="20" max="90" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div>
        <span style="font-size:9px;color:var(--light)">空欄＝現在年齢</span>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">毎月の保険料</label>
        <div class="suf"><input class="inp amt-inp" id="ins-m-${person}-${id}" type="number" value="" placeholder="例:3" min="0" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万/月</span></div>
        <span style="font-size:9px;color:#6a2a8a;font-weight:600">※支出に自動計上</span>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">満期年齢</label>
        <div class="suf"><input class="inp age-inp" id="ins-age-${person}-${id}" type="number" value="" placeholder="例:60" min="30" max="100" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;align-items:start">
      <div class="fg">
        <label class="lbl" style="font-size:9px">満期受取金額</label>
        <div class="suf"><input class="inp amt-inp" id="ins-mat-${person}-${id}" type="number" value="" placeholder="例:500" min="0" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万円</span></div>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px;color:#c00">解約年齢</label>
        <div class="suf"><input class="inp age-inp" id="ins-redeem-${person}-${id}" type="number" value="" placeholder="空欄=満期" min="20" max="100" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px;border-color:#fca5a5"><span class="sl" style="font-size:10px">歳</span></div>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px;color:#c00">解約返戻金</label>
        <div class="suf"><input class="inp amt-inp" id="ins-redeem-amt-${person}-${id}" type="number" value="" placeholder="例:350" min="0" oninput="calcInsPreview('${person}',${id})" style="font-size:11px;padding:4px 6px;border-color:#fca5a5"><span class="sl" style="font-size:10px">万円</span></div>
      </div>
      <button class="btn-rm" onclick="document.getElementById('ins-${person}-${id}').remove();live()" style="margin-top:18px">×</button>
    </div>
    <div id="ins-preview-${person}-${id}" style="margin-top:6px;font-size:10px;color:#6a2a8a;background:#f5e8ff;border-radius:4px;padding:4px 8px;display:none"></div>`;
  document.getElementById(`ins-savings-cont-${person}`).appendChild(el);live();
}

function addSecurity(person){
  person=person||'h';
  secCnt++;const id=secCnt;
  const el=document.createElement('div');
  el.id=`sec-${person}-${id}`;
  el.style.cssText='background:var(--gray-bg);border:1px solid var(--border);border-radius:var(--rs);padding:8px 10px;margin-bottom:6px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <input class="inp" id="sec-label-${person}-${id}" type="text" placeholder="銘柄名（例：eMAXIS Slim）" oninput="live()" style="font-size:11px;padding:4px 8px;flex:1">
      <div style="display:flex;gap:6px">
        <div class="tc on" id="sec-taxable-${person}-${id}" onclick="setSecTax('${person}',${id},'taxable')" style="padding:3px 8px;gap:4px">
          <div class="tc-lbl" style="font-size:10px">課税</div>
        </div>
        <div class="tc" id="sec-nisa-${person}-${id}" onclick="setSecTax('${person}',${id},'nisa')" style="padding:3px 8px;gap:4px">
          <div class="tc-lbl" style="font-size:10px">非課税（NISA）</div>
        </div>
      </div>
      <button class="btn-rm" onclick="document.getElementById('sec-'+this.dataset.p+'-'+this.dataset.i).remove();live()" data-p="${person}" data-i="${id}">× 削除</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <div class="tc on" id="sec-acc-${person}-${id}" onclick="setSecType('${person}',${id},'accum')" style="flex:1;padding:4px 8px;gap:4px">
        <div class="tc-lbl" style="font-size:10px">積み立て投資</div>
      </div>
      <div class="tc" id="sec-stock-${person}-${id}" onclick="setSecType('${person}',${id},'stock')" style="flex:1;padding:4px 8px;gap:4px">
        <div class="tc-lbl" style="font-size:10px">一括投資</div>
      </div>
    </div>
    <div id="sec-accum-fields-${person}-${id}">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:6px">
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">現時点の評価額(万)</label>
          <input class="inp amt-inp" id="sec-bal-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:200" min="0" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">毎月の積立額(万)</label>
          <input class="inp amt-inp" id="sec-monthly-${person}-${id}" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="" placeholder="例:5" min="0" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">積立終了年齢(歳)</label>
          <input class="inp age-inp" id="sec-end-${person}-${id}" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="" placeholder="例:65" min="20" max="90" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">想定利回り(%)</label>
          <input class="inp amt-inp" id="sec-rate-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="5" placeholder="5" min="0" max="20" step="0.1" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap;color:#c00">解約年齢(歳)</label>
          <input class="inp age-inp" id="sec-redeem-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:65" min="20" max="100" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%;border-color:#fca5a5"></div>
      </div>
    </div>
    <div id="sec-stock-fields-${person}-${id}" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">投資額(万)</label>
          <input class="inp amt-inp" id="sec-stk-bal-${person}-${id}" onfocus="scrollToCFRow('secBuy')" onblur="cfRowBlur()" type="number" value="" placeholder="例:500" min="0" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">投資開始年齢(歳)</label>
          <input class="inp age-inp" id="sec-stk-age-${person}-${id}" onfocus="scrollToCFRow('secBuy')" onblur="cfRowBlur()" type="number" value="" placeholder="例:40" min="20" max="90" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">想定利回り(%)</label>
          <input class="inp amt-inp" id="sec-div-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="5" placeholder="5" min="0" max="20" step="0.1" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap;color:#c00">解約年齢(歳)</label>
          <input class="inp age-inp" id="sec-stk-redeem-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:65" min="20" max="100" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%;border-color:#fca5a5"></div>
      </div>
    </div>`;
  document.getElementById(`securities-cont-${person||'h'}`).appendChild(el);live();
}
function setSecTax(person,id,t){
  document.getElementById(`sec-taxable-${person}-${id}`).classList.toggle('on',t==='taxable');
  document.getElementById(`sec-nisa-${person}-${id}`).classList.toggle('on',t==='nisa');
  live();
}
function setSecType(person,id,t){
  document.getElementById(`sec-acc-${person}-${id}`).classList.toggle('on',t==='accum');
  document.getElementById(`sec-stock-${person}-${id}`).classList.toggle('on',t==='stock');
  document.getElementById(`sec-accum-fields-${person}-${id}`).style.display=t==='accum'?'':'none';
  document.getElementById(`sec-stock-fields-${person}-${id}`).style.display=t==='stock'?'':'none';
  live();
}

function calcInsPreview(person,id){
  const pBaseAge=person==='h'?iv('husband-age'):iv('wife-age');
  const enrollAge=iv(`ins-enroll-${person}-${id}`)||pBaseAge||0;
  const monthly=fv(`ins-m-${person}-${id}`)||0;
  const matAge=iv(`ins-age-${person}-${id}`)||0;
  const matAmt=fv(`ins-mat-${person}-${id}`)||0;
  const redeemAge=iv(`ins-redeem-${person}-${id}`)||0;
  const redeemAmt=fv(`ins-redeem-amt-${person}-${id}`)||0;
  const prev=document.getElementById(`ins-preview-${person}-${id}`);
  if(!prev)return live();
  if(monthly<=0||matAge<=0||enrollAge<=0){prev.style.display='none';return live();}
  const payYrs=matAge-enrollAge;
  if(payYrs<=0){prev.style.display='none';return live();}
  const cumPay=Math.round(monthly*12*payYrs*10)/10;
  const returnRate=matAmt>0?Math.round(matAmt/cumPay*1000)/10:0;
  const rateColor=returnRate>=100?'#0d8a20':'#d63a2a';
  let txt=`払込累計：<strong>${cumPay.toLocaleString()}万円</strong>（${payYrs}年間）　満期受取：<strong>${matAmt.toLocaleString()}万円</strong>　返戻率：<strong style="color:${rateColor}">${returnRate}%</strong>`;
  if(redeemAge>0&&redeemAge<matAge){
    const paidYrs2=redeemAge-enrollAge;
    const cum2=Math.round(monthly*12*Math.max(0,paidYrs2)*10)/10;
    if(redeemAmt>0){
      const rateR=cum2>0?Math.round(redeemAmt/cum2*1000)/10:0;
      const rColor=rateR>=100?'#0d8a20':'#d63a2a';
      txt+=`　｜　<span style="color:#c00">解約（${redeemAge}歳）：払込${cum2}万 → 返戻金<strong>${redeemAmt}万</strong>（<span style="color:${rColor}">${rateR}%</span>）</span>`;
    } else {
      const totalPayYrs=payYrs;
      const ratio=Math.max(0,paidYrs2)/totalPayYrs;
      const surrenderCharge=Math.max(0,0.3*(1-ratio));
      const est=Math.round(cum2*(1-surrenderCharge)+matAmt*ratio*ratio);
      const rateEst=cum2>0?Math.round(est/cum2*1000)/10:0;
      const rateColor2=rateEst>=100?'#0d8a20':'#d63a2a';
      txt+=`　｜　<span style="color:#888">解約（${redeemAge}歳）：払込${cum2}万 → 推計${est}万（<span style="color:${rateColor2}">${rateEst}%</span>）</span>`;
    }
  }
  prev.style.display='';
  prev.innerHTML=txt;
  live();
}
function setAssetTab(p){
  document.getElementById('asset-tab-h').classList.toggle('on',p==='h');
  document.getElementById('asset-tab-w').classList.toggle('on',p==='w');
  document.getElementById('asset-panel-h').style.display=p==='h'?'':'none';
  document.getElementById('asset-panel-w').style.display=p==='w'?'':'none';
}
function setCarOwn(on){
  carOwn=on;
  document.getElementById('car-yes')?.classList.toggle('on',on);
  document.getElementById('car-no')?.classList.toggle('on',!on);
  document.getElementById('car-list-container').style.display=on?'':'none';
  live();
}
function setParkOwn(on){
  parkOwn=on;
  document.getElementById('park-yes').classList.toggle('on',on);
  document.getElementById('park-no').classList.toggle('on',!on);
  document.getElementById('park-fields').style.display=on?'':'none';
  live();
}
function setCarType(id,t){
  const el=document.getElementById('car-'+id);
  if(!el)return;
  el.dataset.type=t;
  document.getElementById('car-'+id+'-new')?.classList.toggle('on',t==='new');
  document.getElementById('car-'+id+'-used')?.classList.toggle('on',t==='used');
  const hint=document.getElementById('car-'+id+'-insp-hint');
  if(hint)hint.textContent=t==='new'?'新車：初回3年後・以降2年ごと':'中古：2年ごと';
  live();
}
function setCarPay(id,t){
  const el=document.getElementById('car-'+id);
  if(!el)return;
  el.dataset.pay=t;
  document.getElementById('car-'+id+'-pay-cash')?.classList.toggle('on',t==='cash');
  document.getElementById('car-'+id+'-pay-loan')?.classList.toggle('on',t==='loan');
  const lf=document.getElementById('car-'+id+'-loan-fields');
  if(lf)lf.style.display=t==='loan'?'':'none';
  if(t==='loan'){
    const price=fv('car-'+id+'-price')||300, down=fv('car-'+id+'-down')||50;
    const yrs=iv('car-'+id+'-loan-yrs')||5, rate=(fv('car-'+id+'-loan-rate')||2.5)/100/12;
    const principal=(price-down)*10000;
    const monthly=rate>0?principal*rate*Math.pow(1+rate,yrs*12)/(Math.pow(1+rate,yrs*12)-1):principal/yrs/12;
    const lhint=document.getElementById('car-'+id+'-loan-hint');
    if(lhint)lhint.textContent='月々：'+Math.round(monthly/10000*10)/10+' 万円';
  }
  live();
}
function addCar(defaults){
  carCnt++;
  const id=carCnt;
  const d=defaults||{};
  const cont=document.getElementById('car-list');
  if(!cont)return;
  const el=document.createElement('div');
  el.id='car-'+id;
  el.dataset.type=d.type||'new';
  el.dataset.pay=d.pay||'cash';
  el.style.cssText='background:#f5f0ff;border:1px solid #c4b0e8;border-radius:var(--rs);padding:10px;margin-bottom:10px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span style="font-size:14px">🚗</span>
      <input class="inp" id="car-${id}-label" value="${d.label||''}" placeholder="${id}台目（例:ご主人様車）" style="flex:1;font-size:11px;font-weight:700;padding:4px 8px" oninput="live()">
      <button class="btn-rm" onclick="rmCar(${id})" style="font-size:11px;padding:2px 8px">× 削除</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.type!=='used'?'on':''}" id="car-${id}-new" onclick="setCarType(${id},'new')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px">✨</span><div class="tc-lbl" style="font-size:10px">新車</div><div class="tc-desc" style="font-size:9px">車検：初回3年・以降2年</div>
      </div>
      <div class="tc ${d.type==='used'?'on':''}" id="car-${id}-used" onclick="setCarType(${id},'used')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px">🔄</span><div class="tc-lbl" style="font-size:10px">中古車</div><div class="tc-desc" style="font-size:9px">車検：2年ごと</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.pay!=='loan'?'on':''}" id="car-${id}-pay-cash" onclick="setCarPay(${id},'cash')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">💴 現金一括</div></div>
      <div class="tc ${d.pay==='loan'?'on':''}" id="car-${id}-pay-loan" onclick="setCarPay(${id},'loan')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">🏦 ローン</div></div>
    </div>
    <div class="g3" style="margin-bottom:8px">
      <div class="fg"><label class="lbl" style="font-size:10px">車両価格</label>
        <div class="suf"><input class="inp amt-inp" id="car-${id}-price" type="number" value="${d.price||300}" min="0" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="live()"><span class="sl">万円</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:10px">初回購入（今から）</label>
        <div class="suf"><input class="inp age-inp" id="car-${id}-first" type="number" value="${d.first||1}" min="1" max="30" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="live()"><span class="sl">年目</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:10px">乗り換え周期</label>
        <div class="suf"><input class="inp age-inp" id="car-${id}-cycle" type="number" value="${d.cycle||7}" min="1" max="20" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="live()"><span class="sl">年ごと</span></div></div>
    </div>
    <div class="g2" style="margin-bottom:8px">
      <div class="fg"><label class="lbl" style="font-size:10px">車を手放す年齢</label>
        <div class="suf"><input class="inp age-inp" id="car-${id}-end-age" type="number" value="${d.endAge||''}" placeholder="空欄=ずっと" min="30" max="100" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="syncParkEndAge();live()"><span class="sl">歳</span></div>
        <span class="hint ok" style="font-size:9px">空欄＝ずっと乗り続ける</span></div>
      <div class="fg"><label class="lbl" style="font-size:10px">車検費用（1回）</label>
        <div class="suf"><input class="inp amt-inp" id="car-${id}-insp" type="number" value="${d.insp||10}" min="0" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="live()"><span class="sl">万円</span></div>
        <span class="hint" id="car-${id}-insp-hint" style="font-size:9px">${(d.type||'new')==='new'?'新車：初回3年後・以降2年ごと':'中古：2年ごと'}</span></div>
    </div>
    <div id="car-${id}-loan-fields" style="display:${d.pay==='loan'?'':'none'};background:#f0ecff;border:1px solid #c4b0e8;border-radius:var(--rs);padding:8px">
      <div style="font-size:10px;font-weight:700;color:#6b5ea8;margin-bottom:6px">🏦 カーローン設定</div>
      <div class="g3">
        <div class="fg"><label class="lbl" style="font-size:9px">頭金</label>
          <div class="suf"><input class="inp amt-inp" id="car-${id}-down" type="number" value="${d.down||50}" min="0" oninput="setCarPay(${id},'loan')"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:9px">ローン期間</label>
          <div class="suf"><input class="inp age-inp" id="car-${id}-loan-yrs" type="number" value="${d.loanYrs||5}" min="1" max="10" oninput="setCarPay(${id},'loan')"><span class="sl">年</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:9px">金利</label>
          <div class="suf"><input class="inp amt-inp" id="car-${id}-loan-rate" type="number" value="${d.loanRate||2.5}" min="0" max="10" step="0.1" oninput="setCarPay(${id},'loan')"><span class="sl">%</span></div></div>
      </div>
      <span class="hint ok" id="car-${id}-loan-hint" style="font-size:10px">月々：― 万円</span>
    </div>`;
  cont.appendChild(el);
}
function rmCar(id){
  document.getElementById('car-'+id)?.remove();
  live();
}
function syncParkEndAge(){
  // 全台の「手放す年齢」の最大値を駐車場終了年齢に自動反映（空欄のときは空欄）
  let maxAge=0;
  document.querySelectorAll('#car-list>[id^="car-"]').forEach(carEl=>{
    const cid=carEl.id.replace('car-','');
    const v=iv('car-'+cid+'-end-age')||0;
    if(v>maxAge)maxAge=v;
  });
  const parkEl=document.getElementById('park-end-age');
  if(parkEl&&!parkEl.dataset.manual){
    parkEl.value=maxAge>0?maxAge:'';
  }
}

function setLoanMode(mode){
  pairLoanMode=mode==='pair';
  document.getElementById('loan-single-tab')?.classList.toggle('on',!pairLoanMode);
  document.getElementById('loan-pair-tab')?.classList.toggle('on',pairLoanMode);
  document.getElementById('loan-single-body').style.display=pairLoanMode?'none':'';
  document.getElementById('loan-pair-body').style.display=pairLoanMode?'':'none';
  if(typeof updateMGDansinUI==='function')updateMGDansinUI();
  live();
}
