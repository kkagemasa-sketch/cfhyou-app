// living-cost.js — 生活費計算・ステップ管理

function calcLC(){
  let ms=0;document.querySelectorAll('.lc-m').forEach(e=>{ms+=parseFloat(String(e.value).replace(/,/g,''))||0});
  let ys=0;document.querySelectorAll('.lc-y').forEach(e=>{ys+=parseFloat(String(e.value).replace(/,/g,''))||0});
  const tot=ri((ms*12+ys)/10000);
  $('lc-m-tot').textContent=Math.round(ms*12/10000*10)/10;
  $('lc-y-tot').textContent=Math.round(ys/10000*10)/10;
  const yenEl=$('lc-m-yen');if(yenEl)yenEl.textContent='（'+Math.round(ms).toLocaleString()+' 円/月）';
  $('lc-grand').textContent=tot;
  return tot;
}

function applyLCPrevPct(id){
  const pct=parseFloat(document.getElementById('lcp-pct-'+id)?.value)||80;
  const steps=document.querySelectorAll('#lc-steps-cont>[id^="ls-"]');
  let prevAmt=null;
  for(let i=0;i<steps.length;i++){
    if(steps[i].dataset.id===String(id)){
      // 直前ステップの金額を取得
      if(i>0){
        const prevId=steps[i-1].dataset.id;
        const prevBase=parseFloat(document.getElementById('lsb-'+prevId)?.value)||null;
        if(prevBase!==null){prevAmt=prevBase;}
        else{
          // 直前ステップに金額未設定→全体生活費合計を使用
          const totalEl=document.getElementById('lc-total-hint');
          if(totalEl){const m=totalEl.textContent.match(/([\d,]+)/);if(m)prevAmt=parseFloat(m[1].replace(/,/g,''));}
        }
      }
      break;
    }
  }
  if(prevAmt===null){
    // 段階1の場合は生活費合計（lc-total）を参照
    const totalEl=document.getElementById('lc-month-total-hint')||document.getElementById('lc-total-hint');
    if(totalEl){const m=totalEl.textContent.match(/([\d.]+)/);if(m)prevAmt=parseFloat(m[1]);}
  }
  if(prevAmt===null){alert('前段階の生活費が設定されていません');return;}
  const newAmt=Math.round(prevAmt*pct/100*10)/10;
  const el=document.getElementById('lsb-'+id);
  if(el){el.value=newAmt;live();}
}
function addLCStep(){
  lsCnt++;const id=lsCnt;
  const thisYear=new Date().getFullYear();
  const existing=document.querySelectorAll('#lc-steps-cont>[id^="ls-"]');
  const isFirst=existing.length===0;
  let defFrom=thisYear, defTo=thisYear+7;
  if(!isFirst){
    const lastId=existing[existing.length-1].dataset.id;
    const lastTo=parseInt(document.getElementById(`lst-${lastId}`)?.value)||thisYear+5;
    defFrom=lastTo+1; defTo=defFrom+9;
  }
  const el=document.createElement('div');el.id=`ls-${id}`;
  el.dataset.id=String(id);
  el.style.cssText='background:var(--light);border:1px solid var(--border);border-radius:var(--rs);padding:9px 11px;margin-bottom:7px;display:flex;flex-direction:column;gap:5px';
  const defRate=isFirst?1:0;
  const phBase=isFirst?'空欄=上の生活費合計を使用':'空欄=前段階終了時の金額を引継ぎ';
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <span class="dlbl" style="min-width:40px;flex-shrink:0">段階${id}</span>
      <div style="display:flex;gap:3px">
        <button class="btn-tog on" id="lsmode-free-${id}" onclick="setLCMode(${id},'free')" style="font-size:10px;padding:3px 8px">自由入力</button>
        <button class="btn-tog" id="lsmode-pct-${id}" onclick="setLCMode(${id},'pct')" style="font-size:10px;padding:3px 8px">割合</button>
      </div>
      <button class="btn-rm" onclick="rmLCStep(${id})">×</button>
    </div>
    <div id="lsfree-wrap-${id}" style="padding-left:46px">
      <div class="suf"><input class="inp amt-inp" id="lsb-${id}" type="number" onfocus="scrollToCFRow('lc')" onblur="cfRowBlur()" placeholder="${phBase}" min="0" step="1" oninput="live()"><span class="sl">万円/年</span></div>
    </div>
    <div id="lspct-wrap-${id}" style="padding-left:46px;display:none">
      <label style="font-size:10px;color:#92400e;font-weight:600;display:block;margin-bottom:3px">前段階の基準額の</label>
      <div class="suf" style="width:90px"><input class="inp amt-inp" id="lspct-${id}" type="number" value="80" min="1" max="200" step="1" oninput="live()"><span class="sl">%</span></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;padding-left:46px;margin-bottom:3px">
      <div class="suf"><input class="inp" id="lsf-${id}" type="number" onfocus="scrollToCFRow('lc')" onblur="cfRowBlur()" value="${defFrom}" min="2020" max="2100" step="1" oninput="live()" style="width:100%"><span class="sl">年〜</span></div>
      <div class="suf"><input class="inp" id="lst-${id}" type="number" onfocus="scrollToCFRow('lc')" onblur="cfRowBlur()" value="${defTo}" placeholder="空欄=ずっと" min="2020" max="2100" step="1" oninput="live()" style="width:100%"><span class="sl">年</span></div>
    </div>
    <div style="padding-left:46px">
      <label class="lbl" style="font-size:10px">毎年の変化率（基準額を毎年〇%増減）</label>
      <div class="suf"><input class="inp amt-inp" id="lsr-${id}" type="number" onfocus="scrollToCFRow('lc')" onblur="cfRowBlur()" value="${defRate}" min="-100" max="200" step="0.1" oninput="live()" style="width:70px"><span class="sl">%/年</span></div>
    </div>`;
  $('lc-steps-cont').appendChild(el);live();
}
function rmLCStep(id){$(`ls-${id}`)?.remove();live()}
function setLCMode(id,mode){
  const isFree=mode==='free';
  document.getElementById(`lsmode-free-${id}`)?.classList.toggle('on',isFree);
  document.getElementById(`lsmode-pct-${id}`)?.classList.toggle('on',!isFree);
  const fw=document.getElementById(`lsfree-wrap-${id}`);
  const pw=document.getElementById(`lspct-wrap-${id}`);
  if(fw)fw.style.display=isFree?'flex':'none';
  if(pw)pw.style.display=isFree?'none':'block';
  live();
}
function getLCSteps(){
  const s=[];
  document.querySelectorAll('#lc-steps-cont>[id^="ls-"]').forEach(el=>{
    const id=el.dataset.id;
    const isPct=document.getElementById(`lsmode-pct-${id}`)?.classList.contains('on');
    const base=isPct?0:(parseFloat(document.getElementById(`lsb-${id}`)?.value)||0);
    const pct=isPct?(parseFloat(document.getElementById(`lspct-${id}`)?.value)||80):null;
    const rate=parseFloat($(`lsr-${id}`)?.value)||0;
    const from=parseInt(document.getElementById(`lsf-${id}`)?.value)||0;
    const toEl=document.getElementById(`lst-${id}`);
    const to=toEl&&toEl.value?parseInt(toEl.value)||null:null;
    s.push({base,pct,rate,from,to,mode:isPct?'pct':'free'});
  });
  return s.sort((a,b)=>a.from-b.from);
}
