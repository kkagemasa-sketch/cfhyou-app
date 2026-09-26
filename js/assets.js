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
  el.className='sec-card';
  el.innerHTML=`
    <div class="row-head">
      <input class="nm" id="ins-label-${person}-${id}" type="text" placeholder="保険名（例: 学資保険）" oninput="live()">
      <button class="abdg ab-ins" id="ins-badge-${person}-${id}" onclick="insPicker('${person}',${id})" title="クリックで種別を変更">積立保険 ▾</button>
      <button class="btn-rm" onclick="document.getElementById('ins-${person}-${id}').remove();live();refreshAssetUI&&refreshAssetUI()">× 削除</button>
    </div>
    <div class="apick" id="ins-picker-${person}-${id}" hidden></div>
    <div class="frow">
      <span class="ilb" title="支出に自動計上されます"><span class="pre">保険料</span><input id="ins-m-${person}-${id}" type="number" value="" placeholder="例:3" min="0" oninput="calcInsPreview('${person}',${id})"><span class="un">万/月</span></span>
      <span class="ilb" title="保険料の支払いが終わる年齢"><span class="pre">払込満期</span><input id="ins-age-${person}-${id}" type="number" value="" placeholder="例:60" min="30" max="100" oninput="calcInsPreview('${person}',${id})"><span class="un">歳</span></span>
      <span class="ilb"><span class="pre">受取</span><input id="ins-redeem-${person}-${id}" type="number" value="" placeholder="例:60" min="20" max="100" oninput="calcInsPreview('${person}',${id})"><span class="un">歳</span></span>
      <span class="ilb"><span class="pre">受取額</span><input class="w6" id="ins-redeem-amt-${person}-${id}" type="number" value="" placeholder="例:500" min="0" oninput="calcInsPreview('${person}',${id})"><span class="un">万</span></span>
    </div>
    <div class="a-chips">
      <span class="a-gear">⚙</span>
      <span class="a-chip" id="ins-chip-enroll-${person}-${id}" onclick="secChip('${person}',${id},'enroll')">✎ 加入年齢（空欄=現在から）</span>
      <span class="a-chip info" id="ins-chip-est-${person}-${id}" style="display:none">受取額 未入力 → 概算で計算</span>
    </div>
    <div class="a-dtl" id="ins-dtl-enroll-${person}-${id}" hidden>
      <span class="ilb"><span class="pre">加入</span><input id="ins-enroll-${person}-${id}" type="number" value="" placeholder="現在年齢" min="20" max="90" oninput="calcInsPreview('${person}',${id})"><span class="un">歳</span></span>
      <span style="font-size:9px;color:#475569;margin-left:6px">空欄＝現在年齢から加入</span>
    </div>
    <div id="ins-preview-${person}-${id}" style="margin-top:5px;font-size:10px;color:#6a2a8a;background:#f5e8ff;border-radius:4px;padding:4px 8px;display:none"></div>`;
  document.getElementById(`ins-savings-cont-${person}`).appendChild(el);live();
  if(typeof insRefreshCard==='function')insRefreshCard(person,id);
  if(typeof refreshAssetUI==='function')refreshAssetUI();
}

function addSecurity(person){
  person=person||'h';
  secCnt++;const id=secCnt;
  const el=document.createElement('div');
  el.id=`sec-${person}-${id}`;
  el.className='sec-card';
  el.innerHTML=`
    <div class="row-head">
      <input class="nm" id="sec-label-${person}-${id}" type="text" placeholder="銘柄名（例: eMAXIS Slim）" oninput="live()">
      <button class="abdg ab-tax" id="sec-badge-${person}-${id}" onclick="secPicker('${person}',${id})" title="クリックで種別を変更（課税/NISA/一括/債券/保険/財形）">課税・積立 ▾</button>
      <button class="btn-rm" onclick="document.getElementById('sec-'+this.dataset.p+'-'+this.dataset.i).remove();live();validateNisaLimits&&validateNisaLimits();refreshAssetUI&&refreshAssetUI()" data-p="${person}" data-i="${id}">× 削除</button>
    </div>
    <div class="apick" id="sec-picker-${person}-${id}" hidden></div>
    <div id="sec-nisa-warn-${person}-${id}" style="display:none;color:#b91c1c;font-size:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:4px;padding:5px 8px;margin:5px 0 0;line-height:1.5"></div>
    <div class="frow" id="sec-accum-fields-${person}-${id}">
      <span class="ilb" data-f="bal"><span class="pre">評価額</span><input class="w6" id="sec-bal-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="0" min="0" oninput="live()"><span class="un">万</span></span>
      <span class="ilb" data-f="monthly"><span class="pre">積立</span><input id="sec-monthly-${person}-${id}" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="" placeholder="0" min="0" oninput="syncNisaMonthlyToAnnual('${person}',${id});live();validateNisaLimits&&validateNisaLimits()"><span class="un">万/月</span></span>
      <span class="ilb" id="sec-nisa-grow-extra-${person}-${id}" style="display:none" title="毎月の積立額と連動（どちらを入力してもOK）"><span class="pre">年間</span><input class="w6" id="sec-nisa-annual-${person}-${id}" type="number" value="" placeholder="例:120" min="0" oninput="syncNisaAnnualToMonthly('${person}',${id});live();validateNisaLimits&&validateNisaLimits()"><span class="un">万/年</span></span>
      <span class="ilb" data-f="rate"><span class="pre">利回り</span><input id="sec-rate-${person}-${id}" data-def="5" class="adef" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="5" placeholder="5" min="0" max="20" step="0.1" oninput="live()"><span class="un">%</span></span>
      <span class="ilb" data-f="end"><span class="pre">終了</span><input id="sec-end-${person}-${id}" data-def="65" class="adef" onfocus="scrollToCFRow('secInvest')" onblur="cfRowBlur()" type="number" value="65" placeholder="65" min="20" max="90" oninput="live();validateNisaLimits&&validateNisaLimits()"><span class="un">歳</span></span>
      <span class="ilb" data-f="redeem" title="空欄=売らずに持ち続ける"><span class="pre">解約</span><input id="sec-redeem-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="—" min="20" max="100" oninput="live()"><span class="un">歳</span></span>
    </div>
    <div class="frow" id="sec-stock-fields-${person}-${id}" style="display:none">
      <span class="ilb"><span class="pre">投資額</span><input class="w6" id="sec-stk-bal-${person}-${id}" onfocus="scrollToCFRow('secBuy')" onblur="cfRowBlur()" type="number" value="" placeholder="0" min="0" oninput="live()"><span class="un">万</span></span>
      <span class="ilb" title="空欄=すでに保有中"><span class="pre">開始</span><input id="sec-stk-age-${person}-${id}" onfocus="scrollToCFRow('secBuy')" onblur="cfRowBlur()" type="number" value="" placeholder="保有中" min="20" max="90" oninput="live()"><span class="un">歳</span></span>
      <span class="ilb"><span class="pre">利回り</span><input id="sec-div-${person}-${id}" data-def="5" class="adef" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="5" placeholder="5" min="0" max="20" step="0.1" oninput="live()"><span class="un">%</span></span>
      <span class="ilb" title="空欄=売らずに持ち続ける"><span class="pre">解約</span><input id="sec-stk-redeem-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="—" min="20" max="100" oninput="live()"><span class="un">歳</span></span>
    </div>
    <div class="frow" id="sec-bond-fields-${person}-${id}" style="display:none">
      <span class="ilb"><span class="pre">投資額</span><input class="w6" id="sec-bond-bal-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="0" min="0" oninput="live()"><span class="un">万</span></span>
      <span class="ilb"><span class="pre">利回り</span><input id="sec-bond-rate-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:3" min="0" max="20" step="0.1" oninput="live()"><span class="un">%/年</span></span>
      <span class="ilb"><span class="pre">償還</span><input id="sec-bond-mat-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="例:50" min="20" max="100" oninput="live()"><span class="un">歳</span></span>
      <span style="display:inline-flex;gap:3px;align-items:center" title="「受取」=毎年の利息（税引後）が収入に入り、償還年に元本が戻る。「再投資」=複利で増えて償還年にまとめて受取（利益に20.315%課税。債券は課税口座のみ対応）">
        <span class="pre" style="font-size:9px;font-weight:700;color:var(--light)">利払い</span>
        <div class="tc tc-mini on" id="sec-bond-pay-${person}-${id}" onclick="setBondPay('${person}',${id},'int')">受取</div>
        <div class="tc tc-mini" id="sec-bond-reinv-${person}-${id}" onclick="setBondPay('${person}',${id},'reinv')">再投資</div>
      </span>
    </div>
    <div class="a-chips" id="sec-chips-${person}-${id}">
      <span class="a-gear">⚙</span>
      <span class="a-chip" id="sec-chip-basis-${person}-${id}" onclick="secChip('${person}',${id},'basis')">✎ 取得価格を入力</span>
      <span class="a-chip" id="sec-chip-draw-${person}-${id}" onclick="secChip('${person}',${id},'draw')">✎ 取り崩しを設定</span>
      <span class="a-chip" id="sec-chip-bondbuy-${person}-${id}" style="display:none" onclick="secChip('${person}',${id},'bondbuy')">✎ 将来購入なら年齢を指定</span>
      <span class="a-chip info" id="sec-chip-nofund-${person}-${id}" style="display:none">追加投資なし・保有分のみ運用</span>
      <span class="a-chip info" id="sec-chip-hold-${person}-${id}" style="display:none"></span>
    </div>
    <div class="a-dtl" id="sec-dtl-basis-${person}-${id}" hidden>
      <div id="sec-nisa-basis-row-${person}-${id}">
        <span class="ilb"><span class="pre">取得価格累計</span><input class="w6" id="sec-basis-${person}-${id}" type="number" value="" placeholder="例:300" min="0" oninput="live();validateNisaLimits&&validateNisaLimits();updateBasisHint&&updateBasisHint('${person}','${id}')"><span class="un">万</span></span>
        <span id="sec-basis-hint-${person}-${id}" style="font-size:9px;color:#475569;margin-left:6px">※NISAは生涯枠1800万の判定／課税口座は譲渡益課税の取得原価に使用</span>
      </div>
    </div>
    <div class="a-dtl" id="sec-dtl-draw-${person}-${id}" hidden>
      <div id="sec-draw-wrap-${person}-${id}">
        <div class="frow" style="margin-top:0">
          <span class="ilb"><span class="pre">取崩</span><input id="sec-draw-start-${person}-${id}" onfocus="scrollToCFRow('totalAsset')" onblur="cfRowBlur()" type="number" value="" placeholder="65" min="20" max="100" oninput="live()"><span class="un">歳〜</span><input class="w6" id="sec-draw-end-${person}-${id}" type="number" value="" placeholder="尽きるまで" min="20" max="110" oninput="live()"><span class="un">歳</span></span>
          <span style="display:inline-flex;gap:3px;align-items:center">
            <div class="tc tc-mini on" id="sec-draw-rate-${person}-${id}" onclick="setSecDrawMode('${person}',${id},'pct')">定率</div>
            <div class="tc tc-mini" id="sec-draw-fix-${person}-${id}" onclick="setSecDrawMode('${person}',${id},'amt')">定額</div>
          </span>
          <span class="ilb" id="sec-draw-pct-wrap-${person}-${id}"><span class="pre">毎年 残高の</span><input id="sec-draw-pct-${person}-${id}" type="number" value="" placeholder="例:4" min="0" max="100" step="0.1" oninput="live()"><span class="un">%</span></span>
          <span class="ilb" id="sec-draw-amt-wrap-${person}-${id}" style="display:none"><span class="pre">毎年</span><input id="sec-draw-amt-${person}-${id}" type="number" value="" placeholder="例:120" min="0" oninput="live()"><span class="un">万円</span></span>
        </div>
        <span class="hint" style="font-size:9px">開始年齢＋率(額)で有効。積立は開始年齢で自動終了。課税口座は利益部分に20.315%を考慮（NISA非課税）。解約年齢も入れるとその年に残りを一括受取</span>
        <div id="sec-draw-conflict-${person}-${id}" style="display:none;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:6px 8px;margin-top:5px">
          <div style="font-size:10px;color:#b91c1c;line-height:1.6">⚠ 解約年齢が取り崩し開始と同じか早いため、<strong>取り崩しは実行されず全額一括解約</strong>になります</div>
          <button onclick="clearSecRedeemForDraw('${person}',${id})" style="margin-top:4px;font-size:10px;padding:4px 10px;background:#2d7dd2;color:#fff;border:none;border-radius:5px;cursor:pointer;font-family:inherit;font-weight:600">解約年齢を空にして取り崩しを有効にする</button>
        </div>
      </div>
    </div>
    <div class="a-dtl" id="sec-dtl-bondbuy-${person}-${id}" hidden>
      <span class="ilb" title="空欄=すでに保有中。年齢を入れるとその年に投資額を支出計上"><span class="pre">購入</span><input id="sec-bond-age-${person}-${id}" onfocus="scrollToCFRow('secBuy')" onblur="cfRowBlur()" type="number" value="" placeholder="保有中" min="20" max="90" oninput="live()"><span class="un">歳</span></span>
      <span style="font-size:9px;color:#475569;margin-left:6px">空欄=すでに保有中（支出は計上されません）</span>
    </div>
    <div style="display:none">
      <div class="tc on" id="sec-taxable-${person}-${id}" onclick="setSecTax('${person}',${id},'taxable')"><div class="tc-lbl">課税</div></div>
      <div class="tc" id="sec-nisa-${person}-${id}" onclick="setSecTax('${person}',${id},'nisa')"><div class="tc-lbl">非課税（NISA）</div></div>
      <div id="sec-nisa-opts-${person}-${id}" style="display:none">
        <div class="tc on" id="sec-frame-tsumi-${person}-${id}" onclick="setSecNisaFrame('${person}',${id},'tsumi')">つみたて枠</div>
        <div class="tc" id="sec-frame-grow-${person}-${id}" onclick="setSecNisaFrame('${person}',${id},'grow')">成長枠</div>
      </div>
      <div id="sec-type-toggle-${person}-${id}">
        <div class="tc on" id="sec-acc-${person}-${id}" onclick="setSecType('${person}',${id},'accum')"><div class="tc-lbl">積み立て投資</div></div>
        <div class="tc" id="sec-stock-${person}-${id}" onclick="setSecType('${person}',${id},'stock')"><div class="tc-lbl">一括投資</div></div>
        <div class="tc" id="sec-bond-${person}-${id}" onclick="setSecType('${person}',${id},'bond')"><div class="tc-lbl">債券</div></div>
      </div>
    </div>`;
  document.getElementById(`securities-cont-${person||'h'}`).appendChild(el);live();
  if(typeof secRefreshCard==='function')secRefreshCard(person,id);
  if(typeof refreshAssetUI==='function')refreshAssetUI();
}
// 「＋ 資産を追加」: 課税・積立で作成し、種別はバッジのピッカーで変更する
function addAsset(person){
  addSecurity(person);
  const el=document.getElementById(`sec-label-${person}-${secCnt}`);
  if(el)el.focus();
}
window.addAsset=addAsset;
function setSecTax(person,id,t){
  document.getElementById(`sec-taxable-${person}-${id}`).classList.toggle('on',t==='taxable');
  document.getElementById(`sec-nisa-${person}-${id}`).classList.toggle('on',t==='nisa');
  const opts=document.getElementById(`sec-nisa-opts-${person}-${id}`);
  if(opts) opts.style.display = (t==='nisa')?'':'none';
  const typeToggle = document.getElementById(`sec-type-toggle-${person}-${id}`);
  if(typeToggle) typeToggle.style.display = (t==='nisa')?'none':'';
  const basisRow = document.getElementById(`sec-nisa-basis-row-${person}-${id}`);
  // 課税口座でも譲渡益課税の取得原価として使うため常時表示
  if(basisRow) basisRow.style.display = '';
  if(typeof updateBasisHint==='function') updateBasisHint(person, id);
  if(t==='nisa'){
    // NISAは制度上積立型に固定（一括・債券は不可）
    document.getElementById(`sec-acc-${person}-${id}`)?.classList.add('on');
    document.getElementById(`sec-stock-${person}-${id}`)?.classList.remove('on');
    document.getElementById(`sec-bond-${person}-${id}`)?.classList.remove('on');
    const accF=document.getElementById(`sec-accum-fields-${person}-${id}`);
    const stkF=document.getElementById(`sec-stock-fields-${person}-${id}`);
    const bondF2=document.getElementById(`sec-bond-fields-${person}-${id}`);
    if(accF) accF.style.display='';
    if(stkF) stkF.style.display='none';
    if(bondF2) bondF2.style.display='none';
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
// basis(取得価格累計) のヒント表示更新
// 課税口座でbasis未入力 → 含み益の課税漏れを警告
function updateBasisHint(person, id){
  const hintEl = document.getElementById(`sec-basis-hint-${person}-${id}`);
  if(!hintEl) return;
  const isNisa = document.getElementById(`sec-nisa-${person}-${id}`)?.classList.contains('on');
  const basis = parseFloat(document.getElementById(`sec-basis-${person}-${id}`)?.value)||0;
  const bal = parseFloat(document.getElementById(`sec-bal-${person}-${id}`)?.value)||0;
  if(isNisa){
    hintEl.style.color='#475569';
    hintEl.textContent='※生涯枠1800万の判定に使用';
  } else if(basis<=0 && bal>0){
    hintEl.style.color='#dc2626';
    hintEl.style.fontWeight='700';
    hintEl.innerHTML='未入力のため現在評価額を取得原価とみなします。含み益がある場合は税金が過少評価されます';
  } else {
    hintEl.style.color='#475569';
    hintEl.style.fontWeight='400';
    hintEl.textContent='※課税口座の譲渡益課税(20.315%)の取得原価として使用';
  }
}
window.updateBasisHint = updateBasisHint;
function setSecNisaFrame(person,id,f){
  const prev = document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.contains('on') ? 'grow'
             : document.getElementById(`sec-frame-tsumi-${person}-${id}`)?.classList.contains('on') ? 'tsumi' : null;
  document.getElementById(`sec-frame-tsumi-${person}-${id}`)?.classList.toggle('on',f==='tsumi');
  document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.toggle('on',f==='grow');
  // 枠切替時の入力値の扱い
  if(prev && prev!==f){
    if(f==='grow'){
      // 成長枠へ: 毎月の積立額は成長枠でも正規の入力欄になった（2026-09-20）ため
      // 引き継ぎ、年間投資予定額を月額×12で連動セットする
      if(typeof syncNisaMonthlyToAnnual==='function')syncNisaMonthlyToAnnual(person,id);
    } else {
      // つみたて枠へ: 成長枠の年間投資予定額をクリア（つみたて枠では非表示＝混入防止）
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
    // ★2026-09-20修正: 成長枠でも毎月の積立額(monthly)を表示（積立設定を直接入力可能に）。
    //   年間投資予定額と双方向連動（syncNisaAnnualToMonthly / syncNisaMonthlyToAnnual）。
    // ★2026-09-13修正: 旧実装は想定利回り・積立終了/解約年齢まで隠していたため
    //   成長枠で年利を入力する場所がなかった（計算には使われていたのに変更不可だった）
    accumFields.querySelectorAll('[data-f]').forEach(el=>{ el.style.display=''; });
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
// 成長枠で毎月の積立額を直接入力したとき、年間投資予定額の表示を連動更新（月額×12）
function syncNisaMonthlyToAnnual(person, id){
  const isGrow = document.getElementById(`sec-frame-grow-${person}-${id}`)?.classList.contains('on');
  if(!isGrow) return;
  const monthly = parseFloat(document.getElementById(`sec-monthly-${person}-${id}`)?.value)||0;
  const annualEl = document.getElementById(`sec-nisa-annual-${person}-${id}`);
  if(annualEl) annualEl.value = monthly > 0 ? String(Math.round(monthly*12*10)/10) : '';
}
window.syncNisaMonthlyToAnnual = syncNisaMonthlyToAnnual;
function setSecType(person,id,t){
  document.getElementById(`sec-acc-${person}-${id}`).classList.toggle('on',t==='accum');
  document.getElementById(`sec-stock-${person}-${id}`).classList.toggle('on',t==='stock');
  document.getElementById(`sec-bond-${person}-${id}`)?.classList.toggle('on',t==='bond');
  document.getElementById(`sec-accum-fields-${person}-${id}`).style.display=t==='accum'?'':'none';
  document.getElementById(`sec-stock-fields-${person}-${id}`).style.display=t==='stock'?'':'none';
  const bondF=document.getElementById(`sec-bond-fields-${person}-${id}`);
  if(bondF)bondF.style.display=t==='bond'?'':'none';
  // 取り崩し設定は積立型・一括投資のみ（債券は満期保有前提のため非表示）
  const drawW=document.getElementById(`sec-draw-wrap-${person}-${id}`);
  if(drawW)drawW.style.display=t==='bond'?'none':'';
  live();
  if(typeof validateNisaLimits==='function') validateNisaLimits();
}
// 取り崩し方式切替（pct=定率 / amt=定額）
function setSecDrawMode(person,id,m){
  document.getElementById(`sec-draw-rate-${person}-${id}`)?.classList.toggle('on',m==='pct');
  document.getElementById(`sec-draw-fix-${person}-${id}`)?.classList.toggle('on',m==='amt');
  const pctW=document.getElementById(`sec-draw-pct-wrap-${person}-${id}`);
  const amtW=document.getElementById(`sec-draw-amt-wrap-${person}-${id}`);
  if(pctW)pctW.style.display=m==='pct'?'':'none';
  if(amtW)amtW.style.display=m==='amt'?'':'none';
  live();
  if(typeof secRefreshCard==='function')secRefreshCard(person,id);
}
window.setSecDrawMode=setSecDrawMode;
// 取り崩しと解約年齢の衝突警告: 「解約年齢を空にして取り崩しを有効にする」ボタン
function clearSecRedeemForDraw(person,id){
  const acc=document.getElementById(`sec-redeem-${person}-${id}`);
  const stk=document.getElementById(`sec-stk-redeem-${person}-${id}`);
  if(acc)acc.value='';
  if(stk)stk.value='';
  live();
}
window.clearSecRedeemForDraw=clearSecRedeemForDraw;
// 債券の利払いタイプ切替（int=利息を毎年受け取る / reinv=再投資・複利）
function setBondPay(person,id,t){
  document.getElementById(`sec-bond-pay-${person}-${id}`)?.classList.toggle('on',t==='int');
  document.getElementById(`sec-bond-reinv-${person}-${id}`)?.classList.toggle('on',t==='reinv');
  live();
  if(typeof secRefreshCard==='function')secRefreshCard(person,id);
}
window.setBondPay=setBondPay;

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
      // ★ 境界修正(2026-09-25): 終了年齢の年も積立する(inclusive)ため +1（CF計算式と統一）
      const payYrs = it.endAge ? Math.max(0, it.endAge - it.curAge + 1) : 0;
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
      msgs.push(`${pLbl}の${fLbl}：年間拠出合計 <b>${a.annual.toFixed(1)}万円/年</b> が上限 ${limit}万円/年 を超えています`);
    }
    // つみたて枠に一括投資が入っている
    if(it.frame==='tsumi' && it.type==='stock'){
      msgs.push(`つみたて枠は定額積立のみ対象です（一括投資は成長枠を選択してください）`);
    }
    // 生涯枠超過（両枠合算）
    const personTotal = agg[it.p].tsumi.basis + agg[it.p].grow.basis
                      + agg[it.p].tsumi.future + agg[it.p].grow.future;
    if(personTotal > LIFETIME){
      msgs.push(`${pLbl}のNISA生涯枠：既購入+将来拠出の累計 <b>${personTotal.toFixed(0)}万円</b> が生涯枠 ${LIFETIME}万円 を超えます`);
    }
    // 成長枠のみの生涯1200万超過
    const growTotal = agg[it.p].grow.basis + agg[it.p].grow.future;
    if(it.frame==='grow' && growTotal > LIFETIME_GROW){
      msgs.push(`${pLbl}の成長枠：既購入+将来拠出の累計 <b>${growTotal.toFixed(0)}万円</b> が成長枠生涯上限 ${LIFETIME_GROW}万円 を超えます`);
    }
    if(msgs.length){
      warnEl.innerHTML = msgs.map(m=>`・${m}`).join('<br>');
      warnEl.style.display = '';
    } else {
      warnEl.innerHTML = '';
      warnEl.style.display = 'none';
    }
  });

  // NISA使用状況サマリ（両者を常に両パネルに表示）
  const bar = (used, limit) => {
    const pct = Math.min(100, limit>0 ? used/limit*100 : 0);
    const over = used > limit;
    const color = over ? '#d63a2a' : (pct>=80?'#e6a300':'#2d7dd2');
    return `<div style="background:#eee;border-radius:3px;height:6px;overflow:hidden;margin-top:2px">
      <div style="width:${Math.min(100,pct).toFixed(1)}%;height:100%;background:${color}"></div></div>`;
  };
  const fmt = v => (Math.round(v*10)/10).toLocaleString();
  const summarize = (p) => {
    const pLbl = p==='h'?'ご主人様':'奥様';
    const t = agg[p].tsumi, g = agg[p].grow;
    const lifeUsed = t.basis + g.basis + t.future + g.future;
    const lifeRem = Math.max(0, LIFETIME - lifeUsed);
    const growLife = g.basis + g.future;
    const growRem = Math.max(0, LIFETIME_GROW - growLife);
    const tAnnRem = Math.max(0, ANNUAL_TSUMI - t.annual);
    const gAnnRem = Math.max(0, ANNUAL_GROW - g.annual);
    const over = lifeUsed>LIFETIME || growLife>LIFETIME_GROW || t.annual>ANNUAL_TSUMI || g.annual>ANNUAL_GROW;
    return `<div style="border:1px solid ${over?'#d63a2a':'#d0d7e2'};border-radius:6px;padding:8px 10px;margin-bottom:6px;background:#fafbfd">
      <div style="font-weight:600;font-size:12px;margin-bottom:6px;color:#1a3a6b">${pLbl} のNISA枠使用状況</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr><td style="padding:2px 4px;color:#555">つみたて 年次</td>
          <td style="padding:2px 4px;text-align:right"><b>${fmt(t.annual)}</b>/${ANNUAL_TSUMI}万<span style="color:#888"> (残${fmt(tAnnRem)})</span>${bar(t.annual,ANNUAL_TSUMI)}</td></tr>
        <tr><td style="padding:2px 4px;color:#555">成長 年次</td>
          <td style="padding:2px 4px;text-align:right"><b>${fmt(g.annual)}</b>/${ANNUAL_GROW}万<span style="color:#888"> (残${fmt(gAnnRem)})</span>${bar(g.annual,ANNUAL_GROW)}</td></tr>
        <tr><td style="padding:2px 4px;color:#555">成長 生涯<span style="color:#888;font-size:10px">(既+将来)</span></td>
          <td style="padding:2px 4px;text-align:right"><b>${fmt(growLife)}</b>/${LIFETIME_GROW}万<span style="color:#888"> (残${fmt(growRem)})</span>${bar(growLife,LIFETIME_GROW)}</td></tr>
        <tr style="border-top:1px solid #ccd"><td style="padding:3px 4px;color:#222"><b>生涯合算</b><span style="color:#888;font-size:10px"> (つみ+成長)</span></td>
          <td style="padding:3px 4px;text-align:right"><b style="color:${lifeUsed>LIFETIME?'#d63a2a':'#1a3a6b'}">${fmt(lifeUsed)}</b>/${LIFETIME}万<span style="color:#888"> (残${fmt(lifeRem)})</span>${bar(lifeUsed,LIFETIME)}</td></tr>
      </table>
      <div style="font-size:10px;color:#888;margin-top:4px">※ 既購入取得価格+将来拠出累計の合計。売却・枠復活は未考慮。</div>
    </div>`;
  };
  const html = summarize('h') + summarize('w');
  const hasH = agg.h.tsumi.items.length + agg.h.grow.items.length > 0;
  const hasW = agg.w.tsumi.items.length + agg.w.grow.items.length > 0;
  const sh = document.getElementById('nisa-summary-h');
  const sw = document.getElementById('nisa-summary-w');
  // 各パネルは、そのパネルの本人がNISAを1つでも選択しているときだけ表示
  if(sh){ sh.innerHTML = hasH ? html : ''; sh.style.display = hasH ? '' : 'none'; }
  if(sw){ sw.innerHTML = hasW ? html : ''; sw.style.display = hasW ? '' : 'none'; }
}

function calcInsPreview(person,id){
  const pBaseAge=person==='h'?iv('husband-age'):iv('wife-age');
  const enrollAge=iv(`ins-enroll-${person}-${id}`)||pBaseAge||0;
  const monthly=fv(`ins-m-${person}-${id}`)||0;
  const matAge=iv(`ins-age-${person}-${id}`)||0;
  const redeemAge=iv(`ins-redeem-${person}-${id}`)||0;
  const redeemAmt=fv(`ins-redeem-amt-${person}-${id}`)||0;
  const prev=document.getElementById(`ins-preview-${person}-${id}`);
  if(!prev)return live();
  if(monthly<=0||matAge<=0||enrollAge<=0){prev.style.display='none';return live();}
  const payYrs=matAge-enrollAge;
  if(payYrs<=0){prev.style.display='none';return live();}
  const cumPay=Math.round(monthly*12*payYrs*10)/10;
  let txt=`払込累計：<strong>${cumPay.toLocaleString()}万円</strong>（${payYrs}年間・満期${matAge}歳）`;
  if(redeemAge>0){
    const paidYrs2=redeemAge-enrollAge;
    const cum2=Math.round(monthly*12*Math.max(0,paidYrs2)*10)/10;
    if(redeemAmt>0){
      const rateR=cum2>0?Math.round(redeemAmt/cum2*1000)/10:0;
      const rColor=rateR>=100?'#0d8a20':'#d63a2a';
      const lblR=redeemAge>=matAge?'満期受取':'解約返戻金';
      txt+=`　｜　<span style="color:#c00">${lblR}（${redeemAge}歳）：払込${cum2}万 → <strong>${redeemAmt}万</strong>（<span style="color:${rColor}">返戻率${rateR}%</span>）</span>`;
    } else {
      const totalPayYrs=payYrs;
      const ratio=Math.max(0,paidYrs2)/totalPayYrs;
      const surrenderCharge=Math.max(0,0.3*(1-ratio));
      const est=Math.round(cum2*(1-surrenderCharge));
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
      <span style="font-size:14px"></span>
      <input class="inp" id="car-${id}-label" value="${d.label||''}" placeholder="${id}台目（例:ご主人様車）" style="flex:1;font-size:11px;font-weight:700;padding:4px 8px" oninput="live()">
      <select class="sel" id="car-${id}-owner" onchange="live()" title="CF表で所有者ごとの行に分けて表示します" style="width:92px;font-size:10px;padding:4px 4px">
        <option value=""${!d.owner?' selected':''}>所有者:未設定</option>
        <option value="h"${d.owner==='h'?' selected':''}>ご主人様</option>
        <option value="w"${d.owner==='w'?' selected':''}>奥様</option>
        <option value="share"${d.owner==='share'?' selected':''}>共用</option>
      </select>
      <button class="btn-rm" onclick="rmCar(${id})" style="font-size:11px;padding:2px 8px">× 削除</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.type!=='used'?'on':''}" id="car-${id}-new" onclick="setCarType(${id},'new')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px"></span><div class="tc-lbl" style="font-size:10px">新車</div><div class="tc-desc" style="font-size:9px">車検：初回3年・以降2年</div>
      </div>
      <div class="tc ${d.type==='used'?'on':''}" id="car-${id}-used" onclick="setCarType(${id},'used')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px"></span><div class="tc-lbl" style="font-size:10px">中古車</div><div class="tc-desc" style="font-size:9px">車検：2年ごと</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.pay!=='loan'?'on':''}" id="car-${id}-pay-cash" onclick="setCarPay(${id},'cash')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">現金一括</div></div>
      <div class="tc ${d.pay==='loan'?'on':''}" id="car-${id}-pay-loan" onclick="setCarPay(${id},'loan')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">ローン</div></div>
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
      <div style="font-size:10px;font-weight:700;color:#6b5ea8;margin-bottom:6px">カーローン設定</div>
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
// ===== 現有車（既保有）セクション =====
function addExistingCar(defaults){
  // ★ L1修正: state.js で `let existingCarCnt=0` 既宣言済みのため
  //   `typeof existingCarCnt==='undefined'` は常に false。dead code を削除。
  existingCarCnt++;
  const id=existingCarCnt;
  const d=defaults||{};
  const cont=document.getElementById('existing-car-list');
  if(!cont)return;
  const el=document.createElement('div');
  el.id='ecar-'+id;
  el.dataset.type=d.type||'new';
  el.dataset.pay=d.pay||'cash';
  el.style.cssText='background:#fff8e6;border:1px solid #ffc000;border-radius:var(--rs);padding:10px;margin-bottom:8px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <span style="font-size:14px"></span>
      <input class="inp" id="ecar-${id}-label" value="${d.label||''}" placeholder="現有車${id}台目（例:ご主人様車）" style="flex:1;font-size:11px;font-weight:700;padding:4px 8px" oninput="live()">
      <select class="sel" id="ecar-${id}-owner" onchange="live()" title="CF表で所有者ごとの行に分けて表示します" style="width:92px;font-size:10px;padding:4px 4px">
        <option value=""${!d.owner?' selected':''}>所有者:未設定</option>
        <option value="h"${d.owner==='h'?' selected':''}>ご主人様</option>
        <option value="w"${d.owner==='w'?' selected':''}>奥様</option>
        <option value="share"${d.owner==='share'?' selected':''}>共用</option>
      </select>
      <button class="btn-rm" onclick="rmExistingCar(${id})" style="font-size:11px;padding:2px 8px">× 削除</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.type!=='used'?'on':''}" id="ecar-${id}-new" onclick="setExistingCarType(${id},'new')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px"></span><div class="tc-lbl" style="font-size:10px">新車</div><div class="tc-desc" style="font-size:9px">車検：初回3年・以降2年</div>
      </div>
      <div class="tc ${d.type==='used'?'on':''}" id="ecar-${id}-used" onclick="setExistingCarType(${id},'used')" style="flex:1;padding:6px;flex-direction:column;align-items:center;text-align:center;gap:2px">
        <span style="font-size:16px"></span><div class="tc-lbl" style="font-size:10px">中古車</div><div class="tc-desc" style="font-size:9px">車検：2年ごと</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px">
      <div class="tc ${d.pay!=='loan'?'on':''}" id="ecar-${id}-pay-cash" onclick="setExistingCarPay(${id},'cash')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">現金一括</div></div>
      <div class="tc ${d.pay==='loan'?'on':''}" id="ecar-${id}-pay-loan" onclick="setExistingCarPay(${id},'loan')" style="flex:1;padding:5px 6px;gap:3px"><div class="tc-lbl" style="font-size:10px">ローン中</div></div>
    </div>
    <!-- 共通の最低限入力（pay/mode に依存しない） -->
    <div class="g2" style="margin-bottom:8px">
      <div class="fg"><label class="lbl" style="font-size:10px">手放す時期</label>
        <div class="suf"><input class="inp age-inp" id="ecar-${id}-end-yrs" type="number" value="${d.endYrs||5}" min="0" max="30" oninput="live()"><span class="sl">年後</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:10px">車検費用（1回）</label>
        <div class="suf"><input class="inp amt-inp" id="ecar-${id}-insp" type="number" value="${d.insp||10}" min="0" oninput="live()"><span class="sl">万円</span></div>
        <span class="hint" id="ecar-${id}-insp-hint" style="font-size:9px">${(d.type||'new')==='new'?'新車：購入から3年後・以降2年ごと':'中古：購入から2年ごと'}</span></div>
    </div>
    <!--
      ※ 購入時期/購入価格 は当初借入条件モードでのみ表示する。
        cash払い・逆算モード時は input が display:none で隠れるが、
        DOM 上に存在し続けるので fvd で値を読める。
        車検タイミングは購入時期（既定3年前）を基準に計算され続ける。
    -->
    <div id="ecar-${id}-loan-fields" style="display:${d.pay==='loan'?'':'none'};background:#fff3d0;border:1px solid #ffc000;border-radius:var(--rs);padding:8px">
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <div class="tc ${(d.loanInputMode||'original')==='original'?'on':''}" id="ecar-${id}-loan-mode-original" onclick="setExistingCarLoanMode(${id},'original')" style="flex:1;padding:4px 6px"><div class="tc-lbl" style="font-size:10px">当初借入条件から</div></div>
        <div class="tc ${d.loanInputMode==='reverse'?'on':''}" id="ecar-${id}-loan-mode-reverse" onclick="setExistingCarLoanMode(${id},'reverse')" style="flex:1;padding:4px 6px"><div class="tc-lbl" style="font-size:10px">現在の支払いから逆算</div></div>
      </div>
      <input type="hidden" id="ecar-${id}-loan-mode" value="${d.loanInputMode||'original'}">

      <!-- モード①: 当初借入条件 -->
      <div id="ecar-${id}-loan-original-fields" style="display:${(d.loanInputMode||'original')==='original'?'':'none'}">
        <div style="font-size:10px;font-weight:700;color:#7a5000;margin-bottom:4px">当初ローン条件（自動で残債計算）</div>
        <div class="g3" style="margin-bottom:6px">
          <div class="fg"><label class="lbl" style="font-size:9px">当初借入時期</label>
            <div class="suf"><input class="inp age-inp" id="ecar-${id}-bought-ago" type="number" value="${d.boughtAgo||3}" min="0" max="20" oninput="setExistingCarPay(${id},'loan')"><span class="sl">年前</span></div></div>
          <div class="fg"><label class="lbl" style="font-size:9px">購入価格</label>
            <div class="suf"><input class="inp amt-inp" id="ecar-${id}-price" type="number" value="${d.price||300}" min="0" oninput="setExistingCarPay(${id},'loan')"><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl" style="font-size:9px">当初頭金</label>
            <div class="suf"><input class="inp amt-inp" id="ecar-${id}-down" type="number" value="${d.down||50}" min="0" oninput="setExistingCarPay(${id},'loan')"><span class="sl">万円</span></div></div>
        </div>
        <div class="g2">
          <div class="fg"><label class="lbl" style="font-size:9px">当初借入年数</label>
            <div class="suf"><input class="inp age-inp" id="ecar-${id}-loan-yrs" type="number" value="${d.loanYrs||5}" min="1" max="10" oninput="setExistingCarPay(${id},'loan')"><span class="sl">年</span></div></div>
          <div class="fg"><label class="lbl" style="font-size:9px">当初金利</label>
            <div class="suf"><input class="inp amt-inp" id="ecar-${id}-loan-rate" type="number" value="${d.loanRate||2.5}" min="0" max="10" step="0.1" oninput="setExistingCarPay(${id},'loan')"><span class="sl">%</span></div></div>
        </div>
      </div>

      <!-- モード②: 現在の支払いから逆算 -->
      <div id="ecar-${id}-loan-reverse-fields" style="display:${d.loanInputMode==='reverse'?'':'none'}">
        <div style="font-size:10px;font-weight:700;color:#7a5000;margin-bottom:4px">現在の支払い情報を入力（金額×期間で残債を概算）</div>
        <div class="g3">
          <div class="fg"><label class="lbl" style="font-size:9px">月々の支払い</label>
            <div class="suf"><input class="inp amt-inp" id="ecar-${id}-loan-monthly" type="number" value="${d.loanMonthly||3}" min="0" step="0.1" oninput="setExistingCarPay(${id},'loan')"><span class="sl">万円/月</span></div></div>
          <div class="fg"><label class="lbl" style="font-size:9px">ボーナス時加算</label>
            <div class="suf"><input class="inp amt-inp" id="ecar-${id}-loan-bonus" type="number" value="${d.loanBonus||0}" min="0" step="0.1" oninput="setExistingCarPay(${id},'loan')"><span class="sl">万円/回</span></div></div>
          <div class="fg"><label class="lbl" style="font-size:9px">残りの返済年数</label>
            <div class="suf"><input class="inp age-inp" id="ecar-${id}-loan-remain-yrs" type="number" value="${d.loanRemainYrs||3}" min="0" max="20" step="0.5" oninput="setExistingCarPay(${id},'loan')"><span class="sl">年</span></div></div>
        </div>
        <div style="font-size:9px;color:#475569;margin-top:3px">※ボーナスは年2回（6月・12月）想定。残債は (月々×12 + ボーナス×2) × 残年数 で概算</div>
      </div>

      <span class="hint ok" id="ecar-${id}-loan-hint" style="font-size:10px;display:block;margin-top:6px">月々：― 万円</span>
    </div>`;
  cont.appendChild(el);
  setExistingCarPay(id,d.pay||'cash');
}
function rmExistingCar(id){
  document.getElementById('ecar-'+id)?.remove();
  live();
}
function setExistingCarType(id,type){
  const el=document.getElementById('ecar-'+id);
  if(!el)return;
  el.dataset.type=type;
  document.getElementById(`ecar-${id}-new`)?.classList.toggle('on',type!=='used');
  document.getElementById(`ecar-${id}-used`)?.classList.toggle('on',type==='used');
  const hint=document.getElementById(`ecar-${id}-insp-hint`);
  if(hint)hint.textContent=type==='used'?'中古：購入から2年ごと':'新車：購入から3年後・以降2年ごと';
  live();
}
function setExistingCarPay(id,pay){
  const el=document.getElementById('ecar-'+id);
  if(!el)return;
  el.dataset.pay=pay;
  document.getElementById(`ecar-${id}-pay-cash`)?.classList.toggle('on',pay!=='loan');
  document.getElementById(`ecar-${id}-pay-loan`)?.classList.toggle('on',pay==='loan');
  const lf=document.getElementById(`ecar-${id}-loan-fields`);
  if(lf)lf.style.display=pay==='loan'?'':'none';
  // 残ローン月数のヒント表示
  if(pay==='loan'){
    const hint=document.getElementById(`ecar-${id}-loan-hint`);
    const mode=document.getElementById(`ecar-${id}-loan-mode`)?.value||'original';
    if(mode==='reverse'){
      // 逆算モード: 月々 + ボーナス × 残年数 で年額と残債を概算
      const monthly=parseFloat(document.getElementById(`ecar-${id}-loan-monthly`)?.value)||0;
      const bonus=parseFloat(document.getElementById(`ecar-${id}-loan-bonus`)?.value)||0;
      const remainYrs=parseFloat(document.getElementById(`ecar-${id}-loan-remain-yrs`)?.value)||0;
      const annual=monthly*12+bonus*2;
      const totalRemain=Math.round(annual*remainYrs*10)/10;
      if(hint){
        if(remainYrs<=0||annual<=0){
          hint.textContent='月々と残年数を入力してください';
          hint.className='hint';
        }else{
          hint.textContent=`年額: ${Math.round(annual*10)/10}万円/年（月々${monthly}万＋ボーナス${bonus}万×2）× あと${remainYrs}年 → 残債概算 ${totalRemain}万円`;
          hint.className='hint ok';
        }
      }
    }else{
      // 当初借入モード: 既存の計算
      const boughtAgo=parseFloat(document.getElementById(`ecar-${id}-bought-ago`)?.value)||0;
      const loanYrs=parseFloat(document.getElementById(`ecar-${id}-loan-yrs`)?.value)||0;
      const price=parseFloat(document.getElementById(`ecar-${id}-price`)?.value)||0;
      const down=parseFloat(document.getElementById(`ecar-${id}-down`)?.value)||0;
      const rate=parseFloat(document.getElementById(`ecar-${id}-loan-rate`)?.value)||0;
      const principal=Math.max(0,(price-down)*10000);
      const mr=rate/100/12;
      const totalMonths=loanYrs*12;
      const elapsedMonths=boughtAgo*12;
      const remainMonths=Math.max(0,totalMonths-elapsedMonths);
      const monthly=mr>0?principal*mr*Math.pow(1+mr,totalMonths)/(Math.pow(1+mr,totalMonths)-1):principal/totalMonths;
      const monthlyManny=Math.round(monthly/10000*10)/10;
      const remainYrsCalc=Math.round(remainMonths/12*10)/10;
      if(hint){
        if(remainMonths<=0){
          hint.textContent=`✓ ローン完済済み（経過${boughtAgo}年 ≧ 借入${loanYrs}年）`;
          hint.className='hint ok';
        }else{
          hint.textContent=`月々: ${monthlyManny}万円 × あと約${remainYrsCalc}年（残${remainMonths}ヶ月）`;
          hint.className='hint ok';
        }
      }
    }
  }
  live();
}
// 既保有車ローン入力モード切替（original=当初借入条件 / reverse=現在の支払いから逆算）
function setExistingCarLoanMode(id, mode){
  const modeEl=document.getElementById(`ecar-${id}-loan-mode`);
  if(modeEl)modeEl.value=mode;
  document.getElementById(`ecar-${id}-loan-mode-original`)?.classList.toggle('on',mode==='original');
  document.getElementById(`ecar-${id}-loan-mode-reverse`)?.classList.toggle('on',mode==='reverse');
  const origF=document.getElementById(`ecar-${id}-loan-original-fields`);
  const revF=document.getElementById(`ecar-${id}-loan-reverse-fields`);
  if(origF)origF.style.display=mode==='original'?'':'none';
  if(revF)revF.style.display=mode==='reverse'?'':'none';
  // 再計算してヒント更新＋CF表反映
  setExistingCarPay(id,'loan');
}
window.setExistingCarLoanMode=setExistingCarLoanMode;
window.addExistingCar=addExistingCar;
window.rmExistingCar=rmExistingCar;
window.setExistingCarType=setExistingCarType;
window.setExistingCarPay=setExistingCarPay;

function rmCar(id){
  document.getElementById('car-'+id)?.remove();
  live();
}
function syncParkEndAge(){/* 旧park-end-age連動は廃止 — 呼び出し元互換のため残置 */}

function setLoanMode(mode){
  pairLoanMode=mode==='pair';
  jointLoanMode=mode==='joint';
  document.getElementById('loan-single-tab')?.classList.toggle('on',mode==='single');
  document.getElementById('loan-pair-tab')?.classList.toggle('on',mode==='pair');
  document.getElementById('loan-joint-tab')?.classList.toggle('on',mode==='joint');
  // 連帯債務はローン本数1本（単独ローンbodyを使う）。追加パネルだけ表示
  const jointExtra=document.getElementById('loan-joint-extra');
  if(jointExtra)jointExtra.style.display=jointLoanMode?'':'none';
  // フラット35選択時は標準ローンbodyを非表示、フラット内で単独/ペア切替
  if(loanCategory==='flat35'){
    document.getElementById('loan-single-body').style.display='none';
    document.getElementById('loan-pair-body').style.display='none';
    const fsp=document.getElementById('flat-single-panel');
    const fpp=document.getElementById('flat-pair-panel');
    if(fsp)fsp.style.display=pairLoanMode?'none':'';
    if(fpp)fpp.style.display=pairLoanMode?'':'none';
  } else {
    // 連帯債務は単独ローンbodyを表示（借入は1本）
    const useSingleBody = !pairLoanMode;
    document.getElementById('loan-single-body').style.display=useSingleBody?'':'none';
    document.getElementById('loan-pair-body').style.display=pairLoanMode?'':'none';
    const fsp=document.getElementById('flat-single-panel');
    const fpp=document.getElementById('flat-pair-panel');
    if(fsp)fsp.style.display='none';
    if(fpp)fpp.style.display='none';
  }
  if(typeof updateMGDansinUI==='function')updateMGDansinUI();
  if(typeof syncPrepayUIVisibility==='function')syncPrepayUIVisibility(); // 繰上返済欄の単独/ペア切替
  if(loanCategory==='flat35')updateFlat35Info();
  // 借入金額表示をモードに合わせて再計算
  if(typeof calcLoanAmt==='function')calcLoanAmt();
  // ★ ペアローンに切替えたら半々で初期化（既に値があれば維持）
  if(pairLoanMode && typeof syncPairLoanHalfHalf==='function'){
    syncPairLoanHalfHalf(loanCategory==='flat35');
  }
  // 連帯債務の場合は持分合計ヒントも初期更新
  if(jointLoanMode&&typeof syncJointShare==='function')syncJointShare(null);
  // モード切替はJS変数変化のため入力ハッシュに反映されない。強制再描画。
  live(true);
}

// 連帯債務 持分の自動補正（一方を変えたら他方を借入額-持分で更新）
function syncJointShare(changed){
  const loanAmt=fv('loan-amt')||0;
  const hShare=fv('joint-share-h')||0;
  const wShare=fv('joint-share-w')||0;
  if(loanAmt>0&&changed){
    if(changed==='h'){
      const newW=Math.max(0, loanAmt-hShare);
      const wEl=document.getElementById('joint-share-w');
      if(wEl){wEl.value=newW;wEl._rawValue=newW;}
    } else if(changed==='w'){
      const newH=Math.max(0, loanAmt-wShare);
      const hEl=document.getElementById('joint-share-h');
      if(hEl){hEl.value=newH;hEl._rawValue=newH;}
    }
  }
  // ヒント更新
  const hint=document.getElementById('joint-share-hint');
  if(hint){
    const _h=fv('joint-share-h')||0, _w=fv('joint-share-w')||0;
    const sum=_h+_w;
    const ok=sum===loanAmt;
    hint.style.color=ok?'#3a8a3a':'#d63a2a';
    hint.textContent=ok
      ? `✓ 持分合計: ${sum}万円（借入額と一致）`
      : `持分合計: ${sum}万円（借入額${loanAmt}万円と${sum>loanAmt?'+':''}${sum-loanAmt}万円ズレています）`;
  }
}
window.syncJointShare = syncJointShare;

/* ═══════════ ②資産 高密度UI（2026-09-26 リニューアル） ═══════════
 * 方針: 入力欄のID・保存形式・計算は一切変えず「ガワ」だけ差し替える。
 * 種別の実体は従来どおり隠しトグル(.tc/.on = 再計算ハッシュ対象)が持ち、
 * バッジ/ピッカーはそれを操作するリモコン。 */
const ASSET_TYPES={
  'tax-accum' :{cls:'ab-tax',   label:'課税・積立'},
  'nisa-tsumi':{cls:'ab-nisa',  label:'NISAつみたて'},
  'nisa-grow' :{cls:'ab-grow',  label:'NISA成長枠'},
  'stock'     :{cls:'ab-stk',   label:'課税・一括'},
  'bond'      :{cls:'ab-bond',  label:'債券'},
  'ins'       :{cls:'ab-ins',   label:'積立保険'},
  'zaikei'    :{cls:'ab-zaikei',label:'財形'}
};
function secCurType(p,id){
  const g=x=>document.getElementById(x+'-'+p+'-'+id);
  if(g('sec-bond')&&g('sec-bond').classList.contains('on'))return 'bond';
  if(g('sec-stock')&&g('sec-stock').classList.contains('on'))return 'stock';
  if(g('sec-nisa')&&g('sec-nisa').classList.contains('on'))return (g('sec-frame-grow')&&g('sec-frame-grow').classList.contains('on'))?'nisa-grow':'nisa-tsumi';
  return 'tax-accum';
}
function _secHasValues(p,id){
  return ['sec-bal','sec-monthly','sec-basis','sec-stk-bal','sec-bond-bal']
    .some(k=>{const el=document.getElementById(k+'-'+p+'-'+id);return el&&parseFloat(el.value)>0;});
}
function _insHasValues(p,id){
  return ['ins-m','ins-redeem-amt'].some(k=>{const el=document.getElementById(k+'-'+p+'-'+id);return el&&parseFloat(el.value)>0;});
}
function _mkPicker(cont,cur,zaikeiTaken,onPick){
  cont.innerHTML='';
  Object.entries(ASSET_TYPES).forEach(pair=>{
    const k=pair[0],v=pair[1];
    const b=document.createElement('button');
    b.className='abdg '+v.cls+(k===cur?' cur':'')+((k==='zaikei'&&zaikeiTaken)?' dis':'');
    b.textContent=v.label;
    if(k==='zaikei'&&zaikeiTaken){b.title='財形貯蓄はすでに設定されています（1人1つ）';}
    else b.onclick=function(){onPick(k);};
    cont.appendChild(b);
  });
}
function _zaikeiVisible(p){
  const card=document.getElementById('zaikei-card-'+p);
  return !!(card&&!card.hidden);
}
// ── 有価証券カードのピッカー ──
function secPicker(p,id){
  const cont=document.getElementById('sec-picker-'+p+'-'+id);
  if(!cont)return;
  if(!cont.hidden){cont.hidden=true;return;}
  _mkPicker(cont,secCurType(p,id),_zaikeiVisible(p),function(t){secPickType(p,id,t);});
  cont.hidden=false;
}
function secPickType(p,id,t){
  const cont=document.getElementById('sec-picker-'+p+'-'+id);
  if(cont)cont.hidden=true;
  if(t==='ins'||t==='zaikei'){
    if(_secHasValues(p,id)&&!confirm('このカードを「'+ASSET_TYPES[t].label+'」に変更します。\n入力済みの有価証券の数値（評価額・積立額など）は削除されます。よろしいですか？'))return;
    const label=(document.getElementById('sec-label-'+p+'-'+id)||{}).value||'';
    const card=document.getElementById('sec-'+p+'-'+id);
    if(card)card.remove();
    if(t==='ins'){
      addInsSaving(p);
      const nm=document.getElementById('ins-label-'+p+'-'+insSavCnt);
      if(nm){nm.value=label;nm.focus();}
    }else{
      zaikeiShow(p);
    }
    live();if(typeof validateNisaLimits==='function')validateNisaLimits();
    refreshAssetUI();
    return;
  }
  // 証券ファミリー内の切替: 既存トグルを操作するだけ（IDも保存形式も不変）
  if(t==='bond'){setSecTax(p,id,'taxable');setSecType(p,id,'bond');}
  else if(t==='stock'){setSecTax(p,id,'taxable');setSecType(p,id,'stock');}
  else if(t==='tax-accum'){setSecTax(p,id,'taxable');setSecType(p,id,'accum');}
  else if(t==='nisa-tsumi'){setSecTax(p,id,'nisa');setSecNisaFrame(p,id,'tsumi');}
  else if(t==='nisa-grow'){setSecTax(p,id,'nisa');setSecNisaFrame(p,id,'grow');}
  secRefreshCard(p,id);
  refreshAssetUI();
}
// ── 保険カードのピッカー ──
function insPicker(p,id){
  const cont=document.getElementById('ins-picker-'+p+'-'+id);
  if(!cont)return;
  if(!cont.hidden){cont.hidden=true;return;}
  _mkPicker(cont,'ins',_zaikeiVisible(p),function(t){insPickType(p,id,t);});
  cont.hidden=false;
}
function insPickType(p,id,t){
  const cont=document.getElementById('ins-picker-'+p+'-'+id);
  if(cont)cont.hidden=true;
  if(t==='ins')return;
  if(_insHasValues(p,id)&&!confirm('このカードを「'+ASSET_TYPES[t].label+'」に変更します。\n入力済みの保険の数値（保険料・受取額など）は削除されます。よろしいですか？'))return;
  const label=(document.getElementById('ins-label-'+p+'-'+id)||{}).value||'';
  const card=document.getElementById('ins-'+p+'-'+id);
  if(card)card.remove();
  if(t==='zaikei'){zaikeiShow(p);}
  else{
    addSecurity(p);
    const nid=secCnt;
    const nm=document.getElementById('sec-label-'+p+'-'+nid);
    if(nm)nm.value=label;
    secPickType(p,nid,t);
    if(nm)nm.focus();
  }
  live();refreshAssetUI();
}
// ── チップ ⇄ 詳細設定の開閉（sec/ins共通） ──
function secChip(p,id,kind){
  const map={basis:'sec-dtl-basis-'+p+'-'+id,draw:'sec-dtl-draw-'+p+'-'+id,bondbuy:'sec-dtl-bondbuy-'+p+'-'+id,enroll:'ins-dtl-enroll-'+p+'-'+id};
  const d=document.getElementById(map[kind]);
  if(!d)return;
  d.hidden=!d.hidden;
  if(!d.hidden){const inp=d.querySelector('input');if(inp)inp.focus();}
}
window.secPicker=secPicker;window.secPickType=secPickType;
window.insPicker=insPicker;window.insPickType=insPickType;window.secChip=secChip;
// ── カード表示のリフレッシュ（バッジ・チップ文言・薄字・取崩し強調） ──
function _fmtDef(el){
  if(!el)return;
  const d=el.dataset.def;
  if(d!==undefined)el.classList.toggle('adef',String(el.value)===String(d));
}
function secRefreshCard(p,id){
  const g=x=>document.getElementById(x+'-'+p+'-'+id);
  const card=g('sec');if(!card)return;
  const t=secCurType(p,id);
  const badge=g('sec-badge');
  if(badge){badge.className='abdg '+ASSET_TYPES[t].cls;badge.textContent=ASSET_TYPES[t].label+' ▾';}
  const isBond=t==='bond';
  const chipB=g('sec-chip-basis'),chipD=g('sec-chip-draw'),chipBB=g('sec-chip-bondbuy');
  if(chipB){
    chipB.style.display=isBond?'none':'';
    const v=parseFloat((g('sec-basis')||{}).value)||0;
    chipB.textContent=v>0?('取得価格 '+v.toLocaleString()+'万'):'✎ 取得価格を入力';
    chipB.classList.toggle('mod',v>0);
  }
  if(chipD){
    chipD.style.display=isBond?'none':'';
    const st=parseInt((g('sec-draw-start')||{}).value)||0;
    const en=parseInt((g('sec-draw-end')||{}).value)||0;
    const isAmt=g('sec-draw-fix')&&g('sec-draw-fix').classList.contains('on');
    const val=parseFloat(((isAmt?g('sec-draw-amt'):g('sec-draw-pct'))||{}).value)||0;
    const active=st>0&&val>0;
    chipD.textContent=active
      ?('取崩し '+st+'歳〜'+(en>0?en+'歳':'')+'・'+(isAmt?('定額'+val+'万/年'):('定率'+val+'%/年')))
      :'✎ 取り崩しを設定';
    chipD.classList.toggle('mod',active);
    chipD.classList.toggle('mod-draw',active);
    card.classList.toggle('has-draw',active&&!isBond);
    if(isBond)card.classList.remove('has-draw');
  }
  if(chipBB){
    chipBB.style.display=isBond?'':'none';
    const a=parseInt((g('sec-bond-age')||{}).value)||0;
    chipBB.textContent=a>0?('購入 '+a+'歳'):'✎ 将来購入なら年齢を指定（現在は保有中）';
    chipBB.classList.toggle('mod',a>0);
  }
  const chipNF=g('sec-chip-nofund');
  if(chipNF){
    const bal=parseFloat((g('sec-bal')||{}).value)||0;
    const mon=parseFloat((g('sec-monthly')||{}).value)||0;
    chipNF.style.display=(!isBond&&t!=='stock'&&bal>0&&mon<=0)?'':'none';
  }
  const chipH=g('sec-chip-hold');
  if(chipH){
    const en2=parseInt((g('sec-end')||{}).value)||0;
    const rd=parseInt((g('sec-redeem')||{}).value)||0;
    const show=(!isBond&&t!=='stock'&&en2>0&&rd>en2);
    chipH.style.display=show?'':'none';
    if(show)chipH.textContent=en2+'歳以降は積立なしで'+rd+'歳まで運用継続';
  }
  ['sec-rate','sec-end','sec-div'].forEach(k=>_fmtDef(g(k)));
}
function insRefreshCard(p,id){
  const g=x=>document.getElementById(x+'-'+p+'-'+id);
  if(!g('ins'))return;
  const chipE=g('ins-chip-enroll');
  if(chipE){
    const a=parseInt((g('ins-enroll')||{}).value)||0;
    chipE.textContent=a>0?('加入 '+a+'歳'):'✎ 加入年齢（空欄=現在から）';
    chipE.classList.toggle('mod',a>0);
  }
  const chipEst=g('ins-chip-est');
  if(chipEst){
    const amt=parseFloat((g('ins-redeem-amt')||{}).value)||0;
    const m=parseFloat((g('ins-m')||{}).value)||0;
    const mat=parseInt((g('ins-age')||{}).value)||0;
    const rd=parseInt((g('ins-redeem')||{}).value)||0;
    chipEst.style.display=(amt<=0&&m>0&&mat>0&&rd>0)?'':'none';
  }
}
window.secRefreshCard=secRefreshCard;window.insRefreshCard=insRefreshCard;
// ── 財形カード ──
function zaikeiShow(p){
  const card=document.getElementById('zaikei-card-'+p);
  if(card){card.hidden=false;card.dataset.open='1';}
  refreshAssetUI();
  const b=document.getElementById('zaikei-'+p+'-bal');
  if(b)b.focus();
}
function zaikeiClear(p){
  if(!confirm('財形貯蓄の入力（残高・積立額・年齢）をクリアして非表示にします。よろしいですか？'))return;
  ['bal','monthly','end','redeem'].forEach(k=>{
    const el=document.getElementById('zaikei-'+p+'-'+k);
    if(el)el.value=(k==='bal'||k==='monthly')?'0':'';
  });
  const card=document.getElementById('zaikei-card-'+p);
  if(card){card.hidden=true;card.dataset.open='';}
  live();refreshAssetUI();
}
window.zaikeiShow=zaikeiShow;window.zaikeiClear=zaikeiClear;
// ── 全体リフレッシュ（合計・財形表示・空状態・薄字） ──
function refreshAssetUI(){
  try{
    ['h','w'].forEach(p=>{
      const secCont=document.getElementById('securities-cont-'+p);
      const insCont=document.getElementById('ins-savings-cont-'+p);
      if(!secCont)return;
      let secTotal=0,insMonthly=0;
      secCont.querySelectorAll('[id^="sec-'+p+'-"]').forEach(el=>{
        const sid=el.id.split('-').pop();
        secRefreshCard(p,sid);
        const t=secCurType(p,sid);
        const gv=x=>parseFloat((document.getElementById(x+'-'+p+'-'+sid)||{}).value)||0;
        if(t==='stock'){if(!(parseInt((document.getElementById('sec-stk-age-'+p+'-'+sid)||{}).value)>0))secTotal+=gv('sec-stk-bal');}
        else if(t==='bond'){if(!(parseInt((document.getElementById('sec-bond-age-'+p+'-'+sid)||{}).value)>0))secTotal+=gv('sec-bond-bal');}
        else secTotal+=gv('sec-bal');
      });
      if(insCont)insCont.querySelectorAll('[id^="ins-'+p+'-"]').forEach(el=>{
        const iid=el.id.split('-').pop();
        insRefreshCard(p,iid);
        insMonthly+=parseFloat((document.getElementById('ins-m-'+p+'-'+iid)||{}).value)||0;
      });
      // 財形カードの表示: 値があるか、明示的に開いたとき
      const zb=parseFloat((document.getElementById('zaikei-'+p+'-bal')||{}).value)||0;
      const zm=parseFloat((document.getElementById('zaikei-'+p+'-monthly')||{}).value)||0;
      const zCard=document.getElementById('zaikei-card-'+p);
      let zShown=false;
      if(zCard){
        zShown=zb>0||zm>0||zCard.dataset.open==='1';
        zCard.hidden=!zShown;
        if(zShown)secTotal+=zb;
      }
      // 見出し・タブの合計
      const sumEl=document.getElementById('asset-sec-sum-'+p);
      if(sumEl)sumEl.textContent='計 '+Math.round(secTotal).toLocaleString()+'万';
      const tabEl=document.getElementById('asset-sum-'+p);
      if(tabEl)tabEl.textContent='資産 '+Math.round(secTotal).toLocaleString()+'万'+(insMonthly>0?('・保険 月'+insMonthly+'万'):'');
      // 空状態ガイド
      const emptyEl=document.getElementById('asset-empty-'+p);
      if(emptyEl){
        const hasSec=!!secCont.querySelector('[id^="sec-'+p+'-"]');
        const hasIns=!!(insCont&&insCont.querySelector('[id^="ins-'+p+'-"]'));
        emptyEl.hidden=hasSec||hasIns||zShown;
      }
    });
  }catch(e){/* UI装飾の失敗は計算に影響させない */}
}
window.refreshAssetUI=refreshAssetUI;
// ── 使い方ガイド（3ステップ。？ボタンから表示） ──
let _aCoach=null,_aSpot=null;
const ASSET_GUIDE=[
  {sel:'.abdg',    t:'種別バッジ',  d:'クリックすると候補が開き、課税/NISA/一括/債券/保険/財形を切り替えられます。入力欄も種別に合わせて変わります。'},
  {sel:'input.adef',t:'薄い数字',   d:'薄いグレーの数字は「初期値のまま」の印。変更すると濃くなるので、どこを個別設定したか一目で分かります。'},
  {sel:'.a-chip',  t:'設定チップ',  d:'取り崩しや取得価格など、たまにしか使わない設定はここ。タップで開き、設定したものは色付きチップで残ります（取り崩しは濃色＋カード左に線）。'}
];
function assetGuide(step){
  step=step||0;
  assetGuideEnd(false);
  if(step>=ASSET_GUIDE.length){try{localStorage.setItem('cf_asset_guide_done','1');}catch(e){}return;}
  const g=ASSET_GUIDE[step];
  const ph=document.getElementById('asset-panel-h');
  const panel=(ph&&ph.style.display!=='none')?ph:document.getElementById('asset-panel-w');
  const el=(panel||document).querySelector(g.sel);
  if(el){el.classList.add('a-spot');el.scrollIntoView({block:'center',behavior:'smooth'});_aSpot=el;}
  _aCoach=document.createElement('div');
  _aCoach.className='a-coach';
  _aCoach.innerHTML='<div class="step">資産入力の使い方 '+(step+1)+' / '+ASSET_GUIDE.length+' — '+g.t+'</div>'+g.d+
    '<div class="btns"><button class="cl" onclick="assetGuideEnd(true)">閉じる</button>'+
    '<button class="nx" onclick="assetGuide('+(step+1)+')">'+((step+1<ASSET_GUIDE.length)?'次へ':'完了')+'</button></div>';
  document.body.appendChild(_aCoach);
}
function assetGuideEnd(done){
  if(_aSpot){_aSpot.classList.remove('a-spot');_aSpot=null;}
  if(_aCoach){_aCoach.remove();_aCoach=null;}
  if(done){try{localStorage.setItem('cf_asset_guide_done','1');}catch(e){}}
}
window.assetGuide=assetGuide;window.assetGuideEnd=assetGuideEnd;
// ── 入力の薄字更新＋UIリフレッシュ（②資産パネル内のみ・軽量） ──
document.addEventListener('input',function(e){
  const t=e.target;
  if(!t||!t.closest)return;
  if(!t.closest('#asset-panel-h,#asset-panel-w'))return;
  if(t.dataset&&t.dataset.def!==undefined)_fmtDef(t);
  if(window._assetUiRaf)return;
  window._assetUiRaf=requestAnimationFrame(function(){window._assetUiRaf=null;refreshAssetUI();});
});
document.addEventListener('DOMContentLoaded',function(){try{refreshAssetUI();}catch(e){}});
