// extras.js — その他収入・産休育休・特別支出

function addOtherIncome(name=''){
  otherIncomeCnt++;const id=otherIncomeCnt;
  const el=document.createElement('div');
  el.id=`oi-${id}`;el.className='drow';el.style.gridTemplateColumns='1fr 1fr 1fr auto';
  el.innerHTML=`
    <div class="fg">
      <label class="lbl" style="font-size:9px">収入の種類</label>
      <input class="inp" id="oin-${id}" onfocus="scrollToCFRow('otherInc')" onblur="cfRowBlur()" value="${name}" placeholder="例:株式配当" oninput="live()" style="font-size:11px;padding:4px 6px">
    </div>
    <div class="fg">
      <label class="lbl" style="font-size:9px">年間金額（万円）</label>
      <div class="suf"><input class="inp amt-inp" id="oia-${id}" type="number" onfocus="scrollToCFRow('otherInc')" onblur="cfRowBlur()" value="" min="0" placeholder="例:60" oninput="live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万</span></div>
    </div>
    <div class="fg">
      <label class="lbl" style="font-size:9px">終了年齢（空欄=ずっと）</label>
      <div class="suf"><input class="inp age-inp" id="oie-${id}" onfocus="scrollToCFRow('otherInc')" onblur="cfRowBlur()" type="number" value="" placeholder="例:70" min="20" max="100" oninput="live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div>
    </div>
    <button class="btn-rm" onclick="document.getElementById('oi-${id}').remove();live()" style="margin-top:18px">×</button>`;
  document.getElementById('other-income-cont').appendChild(el);live();
}
function getOtherIncomes(){
  const s=[];
  document.querySelectorAll('[id^="oin-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    s.push({name:el.value,amt:fv(`oia-${id}`),endAge:iv(`oie-${id}`)});
  });
  return s;
}

function addLeave(){
  lvCnt++;const id=lvCnt;
  const el=document.createElement('div');el.id=`lv-${id}`;el.className='drow';el.style.padding='8px 10px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px">
      <select class="sel" id="lvt-${id}" style="font-size:11px;padding:5px;flex:1" onfocus="scrollToCFRow('wInc',null)" onblur="cfRowBlur()" onchange="live()">
        <option value="maternity">産休</option>
        <option value="parental">育休</option>
        <option value="reduced">時短</option>
      </select>
      <button class="btn-rm" onclick="rmLeave(${id})" style="flex-shrink:0">× 削除</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      <div class="fg">
        <label class="lbl" style="font-size:9px">開始（奥様年齢）</label>
        <div class="suf"><input class="inp age-inp" id="lvs-${id}" onfocus="scrollToCFRow('wInc',null)" onblur="cfRowBlur()" type="number" value="${iv('wife-age')}" min="20" max="65" oninput="live()"><span class="sl">歳</span></div>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">終了（奥様年齢）</label>
        <div class="suf"><input class="inp age-inp" id="lve-${id}" onfocus="scrollToCFRow('wInc',null)" onblur="cfRowBlur()" type="number" value="${iv('wife-age')+1}" min="20" max="65" oninput="live()"><span class="sl">歳</span></div>
      </div>
      <div class="fg">
        <label class="lbl" style="font-size:9px">収入（万円/年）</label>
        <div class="suf"><input class="inp amt-inp" id="lvi-${id}" onfocus="scrollToCFRow('wInc',null)" onblur="cfRowBlur()" type="number" value="0" min="0" placeholder="0=産休" oninput="live()"><span class="sl">万</span></div>
      </div>
    </div>`;
  if($('leave-cont'))$('leave-cont').appendChild(el);live();
}
function rmLeave(id){$(`lv-${id}`)?.remove();live()}
function getLeaves(){
  const s=[];
  document.querySelectorAll('[id^="lvt-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    s.push({type:el.value,startAge:iv(`lvs-${id}`),endAge:iv(`lve-${id}`),income:fv(`lvi-${id}`)});
  });
  return s;
}

// ===== 特別支出（複数件） =====
function addExtraItem(yr='', amt='', lbl='', yrTo=''){
  extraCnt++;
  const id = extraCnt;
  const el = document.createElement('div');
  el.id = `ex-${id}`;
  el.style.cssText='background:var(--light);border:1px solid var(--border);border-radius:var(--rs);padding:9px 11px;margin-bottom:7px';
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <span style="font-size:10px;font-weight:600;color:var(--muted)">特別支出${id}</span>
      <button class="btn-rm" onclick="document.getElementById('ex-${id}').remove();live()">×</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:5px">
      <div class="fg"><label class="lbl" style="font-size:9px">開始（引渡から何年後）</label>
        <div class="suf"><input class="inp age-inp" id="ex-yr-${id}" type="number" onfocus="scrollToCFRow('ext')" onblur="cfRowBlur()" value="${yr}" placeholder="例:5" min="1" max="70" oninput="updateExtraHint(${id});live()"><span class="sl">年後</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:9px">終了（空欄=1回のみ）</label>
        <div class="suf"><input class="inp age-inp" id="ex-yr2-${id}" type="number" onfocus="scrollToCFRow('ext')" onblur="cfRowBlur()" value="${yrTo}" placeholder="空欄=単年" min="1" max="70" oninput="updateExtraHint(${id});live()"><span class="sl">年後</span></div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div class="fg"><label class="lbl" style="font-size:9px">金額（毎年）</label>
        <div class="suf"><input class="inp amt-inp" id="ex-amt-${id}" type="number" onfocus="scrollToCFRow('ext')" onblur="cfRowBlur()" value="${amt}" placeholder="例:100" min="0" oninput="updateExtraHint(${id});live()"><span class="sl">万円/年</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:9px">内容</label>
        <input class="inp" id="ex-lbl-${id}" onfocus="scrollToCFRow('ext')" onblur="cfRowBlur()" value="${lbl}" placeholder="例:リフォーム" oninput="updateExtraHint(${id});live()"></div>
    </div>
    <div id="ex-hint-${id}" style="font-size:10px;color:#3a8a3a;margin-top:4px"></div>`;
  document.getElementById('extra-cont').appendChild(el);
  updateExtraHint(id);
  live();
}
function updateExtraHint(id){
  const yr=parseInt($(`ex-yr-${id}`)?.value)||0;
  const yr2=parseInt($(`ex-yr2-${id}`)?.value)||0;
  const amt=parseFloat($(`ex-amt-${id}`)?.value)||0;
  const lbl=$(`ex-lbl-${id}`)?.value||'';
  const h=$(`ex-hint-${id}`);
  if(!h)return;
  if(!yr||!amt){h.textContent='';return}
  if(yr2>0&&yr2>yr){
    h.textContent=`✓ ${yr}年後〜${yr2}年後 ${amt}万円/年 ${lbl}（${yr2-yr+1}年間 計${amt*(yr2-yr+1)}万円）`;
  }else{
    h.textContent=`✓ ${yr}年後 ${amt}万円 ${lbl}`;
  }
}
function getExtraItems(){
  const items = [];
  document.querySelectorAll('[id^="ex-yr-"]').forEach(el => {
    // ex-yr2-* もマッチするので除外
    if(el.id.includes('yr2'))return;
    const id = el.id.split('-')[2];
    const yr = parseInt(el.value) || 0;
    const yr2 = parseInt(document.getElementById(`ex-yr2-${id}`)?.value) || 0;
    const amt = parseFloat(document.getElementById(`ex-amt-${id}`)?.value) || 0;
    const lbl = document.getElementById(`ex-lbl-${id}`)?.value || '特別支出';
    if(yr > 0 && amt > 0) items.push({ yr, yr2: yr2 > yr ? yr2 : yr, amt, lbl });
  });
  return items;
}
