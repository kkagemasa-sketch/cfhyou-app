// assets.js — 保険・有価証券・車両・ペアローン

// ===== 一時払い保険 =====
function addInsLump(person){
  person=person||'h';
  insLumpCnt++;const id=insLumpCnt;
  const el=document.createElement('div');
  el.id=`ins-lump-${person}-${id}`;
  el.style.cssText='background:#fff8ee;border:1px solid #f0c060;border-radius:var(--rs);padding:9px 10px;margin-bottom:8px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <input class="inp" id="ins-lump-label-${person}-${id}" type="text" placeholder="保険名（例：ドル建終身）" oninput="live()" style="font-size:11px;padding:4px 8px;flex:1">
      <button class="btn-rm" onclick="document.getElementById('ins-lump-${person}-${id}').remove();live()">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:start">
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
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <input class="inp" id="ins-label-${person}-${id}" type="text" placeholder="保険名（例：学資保険）" oninput="live()" style="font-size:11px;padding:4px 8px;flex:1">
      <button class="btn-rm" onclick="document.getElementById('ins-${person}-${id}').remove();live()">×</button>
    </div>
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
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;align-items:start">
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
      <button class="btn-rm" onclick="document.getElementById('sec-'+this.dataset.p+'-'+this.dataset.i).remove();live();validateNisaLimits&&validateNisaLimits()" data-p="${person}" data-i="${id}">× 削除</button>
    </div>
    <div id="sec-nisa-opts-${person}-${id}" style="display:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px;margin-bottom:6px">
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <div class="tc on" id="sec-frame-tsumi-${person}-${id}" onclick="setSecNisaFrame('${person}',${id},'tsumi')" style="flex:1;padding:3px 6px;font-size:10px">つみたて枠<span style="color:#64748b;margin-left:4px">月10万/年120万</span></div>
        <div class="tc" id="sec-frame-grow-${person}-${id}" onclick="setSecNisaFrame('${person}',${id},'grow')" style="flex:1;padding:3px 6px;font-size:10px">成長枠<span style="color:#64748b;margin-left:4px">年240万</span></div>
      </div>
      <div id="sec-nisa-grow-extra-${person}-${id}" style="display:none;margin-top:6px;padding-top:6px;border-top:1px dashed #bfdbfe">
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">年間投資予定額(万)</label>
          <input class="inp amt-inp" id="sec-nisa-annual-${person}-${id}" type="number" value="" placeholder="例:120" min="0"
            oninput="syncNisaAnnualToMonthly('${person}',${id});live();validateNisaLimits&&validateNisaLimits()"
            style="font-size:11px;padding:4px 6px;width:100%;max-width:180px">
          <span style="font-size:9px;color:#475569;margin-left:6px">※内部で月額に換算して計算</span>
        </div>
      </div>
    </div>
    <div id="sec-nisa-warn-${person}-${id}" style="display:none;color:#b91c1c;font-size:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:5px 8px;margin-bottom:6px;line-height:1.5"></div>
    <div id="sec-type-toggle-${person}-${id}" style="display:flex;gap:6px;margin-bottom:6px">
      <div class="tc on" id="sec-acc-${person}-${id}" onclick="setSecType('${person}',${id},'accum')" style="flex:1;padding:4px 8px;gap:4px">
        <div class="tc-lbl" style="font-size:10px">積み立て投資</div>
      </div>
      <div class="tc" id="sec-stock-${person}-${id}" onclick="setSecType('${person}',${id},'stock')" style="flex:1;padding:4px 8px;gap:4px">
        <div class="tc-lbl" style="font-size:10px">一括投資</div>
      </div>
    </div>
    <div id="sec-accum-fields-${person}-${id}">
      <div id="sec-nisa-basis-row-${person}-${id}" style="display:none;margin-bottom:6px">
        <div class="fg"><label class="lbl" style="font-size:9px;white-space:nowrap">現在の投資金額（取得価格累計 / 万）</label>
          <input class="inp amt-inp" id="sec-basis-${person}-${id}" type="number" value="" placeholder="例:300" min="0" oninput="live();validateNisaLimits&&validateNisaLimits()" style="font-size:11px;padding:4px 6px;width:100%;max-width:220px">
          <span style="font-size:9px;color:#475569;margin-left:6px">※生涯枠1800万の消費判定に使用</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:6px">
        <div class="fg" data-f="bal"><label class="lbl" style="font-size:9px;white-space:nowrap">現時点の評価額(万)</label>
          <input class="inp amt-inp" id="sec-bal-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:200" min="0" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg" data-f="monthly"><label class="lbl" style="font-size:9px;white-space:nowrap">毎月の積立額(万)</label>
          <input class="inp amt-inp" id="sec-monthly-${person}-${id}" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="" placeholder="例:5" min="0" oninput="live();validateNisaLimits&&validateNisaLimits()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg" data-f="rate"><label class="lbl" style="font-size:9px;white-space:nowrap">想定利回り(%)</label>
          <input class="inp amt-inp" id="sec-rate-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="5" placeholder="5" min="0" max="20" step="0.1" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg" data-f="end"><label class="lbl" style="font-size:9px;white-space:nowrap">積立終了年齢(歳)</label>
          <input class="inp age-inp" id="sec-end-${person}-${id}" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="65" placeholder="例:65" min="20" max="90" oninput="live();validateNisaLimits&&validateNisaLimits()" style="font-size:11px;padding:4px 6px;width:100%"></div>
        <div class="fg" data-f="redeem"><label class="lbl" style="font-size:9px;white-space:nowrap;color:#c00">解約年齢(歳)</label>
          <input class="inp age-inp" id="sec-redeem-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="65" placeholder="例:65" min="20" max="100" oninput="live()" style="font-size:11px;padding:4px 6px;width:100%;border-color:#fca5a5"></div>
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
  const opts=document.getElementById(`sec-nisa-opts-${person}-${id}`);
  if(opts) opts.style.display = (t==='nisa')?'':'none';
  const typeToggle = document.getElementById(`sec-type-toggle-${person}-${id}`);
  if(typeToggle) typeToggle.style.display = (t==='nisa')?'none':'';
  const basisRow = document.getElementById(`sec-nisa-basis-row-${person}-${id}`);
  if(basisRow) basisRow.style.display = (t==='nisa')?'':'none';
  if(t==='nisa'){
    // NISAは制度上積立型に固定（一括は不可）
    document.getElementById(`sec-acc-${person}-${id}`)?.classList.add('on');
    document.getElementById(`sec-stock-${person}-${id}`)?.classList.remove('on');
    const accF=document.getElementById(`sec-accum-fields-${person}-${id}`);
    const stkF=document.getElementById(`sec-stock-fields-${person}-${id}`);
    if(accF) accF.style.display='';
    if(stkF) stkF.style.display='none';
    // 新規でNISAを選んだとき、枠未選択なら「つみたて」を既定
    const tsumi=document.getElementById(`sec-frame-tsumi-${person}-${id}`);
    const grow=document.getElementById(`sec-frame-grow-${person}-${id}`);
    if(tsumi && !tsumi.classList.contains('on') && grow && !grow.classList.contains('on')){
      tsumi.classList.add('on');
    }
    const frame = document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.contains('on') ? 'grow' : 'tsumi';
    applyNisaFrameVisibility(person, id, frame);
  } else {
    // 課税に戻す: 全フィールド再表示、成長枠専用UIは隠す
    const accumFields = document.getElementById(`sec-accum-fields-${person}-${id}`);
    if(accumFields){
      accumFields.querySelectorAll('[data-f]').forEach(el=>{ el.style.display=''; });
    }
    const growExtra = document.getElementById(`sec-nisa-grow-extra-${person}-${id}`);
    if(growExtra) growExtra.style.display='none';
  }
  live();
  if(typeof validateNisaLimits==='function') validateNisaLimits();
}
function setSecNisaFrame(person,id,f){
  const prev = document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.contains('on') ? 'grow'
             : document.getElementById(`sec-frame-tsumi-${person}-${id}`)?.classList.contains('on') ? 'tsumi' : null;
  document.getElementById(`sec-frame-tsumi-${person}-${id}`)?.classList.toggle('on',f==='tsumi');
  document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.toggle('on',f==='grow');
  // 枠切替時に前の枠の入力値をクリア（隠れたまま計算に混入するのを防ぐ）
  if(prev && prev!==f){
    if(f==='grow'){
      // 成長枠へ: つみたて用の毎月積立額をクリア
      const monthlyEl=document.getElementById(`sec-monthly-${person}-${id}`);
      if(monthlyEl) monthlyEl.value='';
    } else {
      // つみたて枠へ: 成長枠の年間投資予定額をクリア
      const annualEl=document.getElementById(`sec-nisa-annual-${person}-${id}`);
      if(annualEl) annualEl.value='';
    }
  }
  applyNisaFrameVisibility(person, id, f);
  live();
  if(typeof validateNisaLimits==='function') validateNisaLimits();
}
function applyNisaFrameVisibility(person, id, frame){
  const accumFields = document.getElementById(`sec-accum-fields-${person}-${id}`);
  if(accumFields){
    // 成長枠: 現在評価額(bal)のみ表示。つみたて枠: 全項目表示
    accumFields.querySelectorAll('[data-f]').forEach(el=>{
      const f = el.dataset.f;
      if(frame==='grow') el.style.display = (f==='bal') ? '' : 'none';
      else el.style.display = '';
    });
  }
  const growExtra = document.getElementById(`sec-nisa-grow-extra-${person}-${id}`);
  if(growExtra) growExtra.style.display = (frame==='grow') ? '' : 'none';
}
function syncNisaAnnualToMonthly(person, id){
  const annual = parseFloat(document.getElementById(`sec-nisa-annual-${person}-${id}`)?.value)||0;
  const monthlyEl = document.getElementById(`sec-monthly-${person}-${id}`);
  if(monthlyEl) monthlyEl.value = annual > 0 ? (annual/12).toFixed(2) : '';
  const endEl = document.getElementById(`sec-end-${person}-${id}`);
  if(endEl && !endEl.value) endEl.value = 65;
  const rateEl = document.getElementById(`sec-rate-${person}-${id}`);
  if(rateEl && !rateEl.value) rateEl.value = 5;
}
function setSecType(person,id,t){
  document.getElementById(`sec-acc-${person}-${id}`).classList.toggle('on',t==='accum');
  document.getElementById(`sec-stock-${person}-${id}`).classList.toggle('on',t==='stock');
  document.getElementById(`sec-accum-fields-${person}-${id}`).style.display=t==='accum'?'':'none';
  document.getElementById(`sec-stock-fields-${person}-${id}`).style.display=t==='stock'?'':'none';
  live();
  if(typeof validateNisaLimits==='function') validateNisaLimits();
}

// ===== NISA 上限判定 =====
// 年次上限: つみたて枠120万/年、成長枠240万/年
// 生涯上限: 1800万（うち成長枠1200万）
// 判定は「ご主人・奥様それぞれ」「枠別」に合算して行う
function validateNisaLimits(){
  const ANNUAL_TSUMI = 120; // 万/年
  const ANNUAL_GROW  = 240; // 万/年
  const LIFETIME     = 1800; // 万
  const LIFETIME_GROW= 1200; // 万（成長枠のうち）

  // 各セキュリティを収集
  const items = [];
  ['h','w'].forEach(p=>{
    document.querySelectorAll(`#securities-cont-${p}>[id^="sec-${p}-"]`).forEach(el=>{
      const id = el.id.split('-').pop();
      const isNisa  = document.getElementById(`sec-nisa-${p}-${id}`)?.classList.contains('on');
      if(!isNisa) return;
      const isStock = document.getElementById(`sec-stock-${p}-${id}`)?.classList.contains('on');
      const isTsumi = document.getElementById(`sec-frame-tsumi-${p}-${id}`)?.classList.contains('on');
      const frame   = isTsumi ? 'tsumi' : 'grow';
      const monthly = parseFloat(document.getElementById(`sec-monthly-${p}-${id}`)?.value)||0;
      const stkAmt  = parseFloat(document.getElementById(`sec-stk-bal-${p}-${id}`)?.value)||0;
      const basis   = parseFloat(document.getElementById(`sec-basis-${p}-${id}`)?.value)||0;
      const endAge  = parseInt(document.getElementById(`sec-end-${p}-${id}`)?.value)||0;
      const stkAge  = parseInt(document.getElementById(`sec-stk-age-${p}-${id}`)?.value)||0;
      const curAge  = parseInt(document.getElementById(p==='h'?'husband-age':'wife-age')?.value)||0;
      items.push({p,id,type:isStock?'stock':'accum',frame,monthly,stkAmt,basis,endAge,stkAge,curAge});
    });
  });

  // 集計
  const agg = {
    h:{tsumi:{annual:0,future:0,basis:0,items:[]}, grow:{annual:0,future:0,basis:0,items:[]}},
    w:{tsumi:{annual:0,future:0,basis:0,items:[]}, grow:{annual:0,future:0,basis:0,items:[]}}
  };
  items.forEach(it=>{
    const a = agg[it.p][it.frame];
    a.items.push(it);
    a.basis += it.basis;
    if(it.type==='accum'){
      const annual = it.monthly * 12;
      a.annual += annual;
      const payYrs = Math.max(0, (it.endAge||it.curAge) - it.curAge);
      a.future += annual * payYrs;
    } else {
      // 一括: 想定開始年齢が未来なら未来分、現在以下なら既購入扱い（取得価格に含めるべき）
      if(it.stkAge > it.curAge){
        a.annual += it.stkAmt; // 投資年の年次枠を消費
        a.future += it.stkAmt;
      }
    }
  });

  // 各セキュリティに警告を反映
  items.forEach(it=>{
    const a    = agg[it.p][it.frame];
    const warnEl = document.getElementById(`sec-nisa-warn-${it.p}-${it.id}`);
    if(!warnEl) return;
    const msgs = [];
    const pLbl = it.p==='h'?'ご主人様':'奥様';
    const fLbl = it.frame==='tsumi'?'つみたて枠':'成長枠';
    const limit = it.frame==='tsumi' ? ANNUAL_TSUMI : ANNUAL_GROW;

    // 年次超過
    if(a.annual > limit){
      msgs.push(`⚠️ ${pLbl}の${fLbl}：年間拠出合計 <b>${a.annual.toFixed(1)}万円/年</b> が上限 ${limit}万円/年 を超えています`);
    }
    // つみたて枠に一括投資が入っている
    if(it.frame==='tsumi' && it.type==='stock'){
      msgs.push(`⚠️ つみたて枠は定額積立のみ対象です（一括投資は成長枠を選択してください）`);
    }
    // 生涯枠超過（両枠合算）
    const personTotal = agg[it.p].tsumi.basis + agg[it.p].grow.basis
                      + agg[it.p].tsumi.future + agg[it.p].grow.future;
    if(personTotal > LIFETIME){
      msgs.push(`⚠️ ${pLbl}のNISA生涯枠：既購入+将来拠出の累計 <b>${personTotal.toFixed(0)}万円</b> が生涯枠 ${LIFETIME}万円 を超えます`);
    }
    // 成長枠のみの生涯1200万超過
    const growTotal = agg[it.p].grow.basis + agg[it.p].grow.future;
    if(it.frame==='grow' && growTotal > LIFETIME_GROW){
      msgs.push(`⚠️ ${pLbl}の成長枠：既購入+将来拠出の累計 <b>${growTotal.toFixed(0)}万円</b> が成長枠生涯上限 ${LIFETIME_GROW}万円 を超えます`);
    }
    if(msgs.length){
      warnEl.innerHTML = msgs.map(m=>`・${m}`).join('<br>');
      warnEl.style.display = '';
    } else {
      warnEl.innerHTML = '';
      warnEl.style.display = 'none';
    }
  });
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
  // 既存の車要素数から次の番号を決定（全削除後に1から始まるように）
  const existing=document.querySelectorAll('#car-list>[id^="car-"]');
  carCnt=existing.length>0?Math.max(...[...existing].map(e=>parseInt(e.id.replace('car-',''))))+1:1;
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
        <div class="suf"><input class="inp age-inp" id="car-${id}-end-age" type="number" value="${d.endAge||70}" placeholder="70" min="30" max="100" onfocus="scrollToCFRow('carTotal')" onblur="cfRowBlur()" oninput="syncParkEndAge();live()"><span class="sl">歳</span></div>
        <span class="hint ok" style="font-size:9px">70歳がデフォルト</span></div>
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
function syncParkEndAge(){/* 旧park-end-age連動は廃止 — 呼び出し元互換のため残置 */}

function setLoanMode(mode){
  pairLoanMode=mode==='pair';
  document.getElementById('loan-single-tab')?.classList.toggle('on',!pairLoanMode);
  document.getElementById('loan-pair-tab')?.classList.toggle('on',pairLoanMode);
  // フラット35選択時は標準ローンbodyを非表示、フラット内で単独/ペア切替
  if(loanCategory==='flat35'){
    document.getElementById('loan-single-body').style.display='none';
    document.getElementById('loan-pair-body').style.display='none';
    const fsp=document.getElementById('flat-single-panel');
    const fpp=document.getElementById('flat-pair-panel');
    if(fsp)fsp.style.display=pairLoanMode?'none':'';
    if(fpp)fpp.style.display=pairLoanMode?'':'none';
  } else {
    document.getElementById('loan-single-body').style.display=pairLoanMode?'none':'';
    document.getElementById('loan-pair-body').style.display=pairLoanMode?'':'none';
    const fsp=document.getElementById('flat-single-panel');
    const fpp=document.getElementById('flat-pair-panel');
    if(fsp)fsp.style.display='none';
    if(fpp)fpp.style.display='none';
  }
  if(typeof updateMGDansinUI==='function')updateMGDansinUI();
  if(loanCategory==='flat35')updateFlat35Info();
  live();
}
