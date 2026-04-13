// loan-calc.js — ローン計算・金利管理

// 元利均等：毎月同額
function mpay(a,y,r){
  if(!a||a<=0)return 0;
  const mr=r/100/12, n=y*12;
  if(mr===0)return Math.round(a*10000/n)/10000;
  const cpd=Math.pow(1+mr,n); // 複利係数（二重計算を排除）
  return Math.round(a*10000*mr*cpd/(cpd-1)/10000*100)/100;
}
// 元金均等：年ごとの返済額（元金部分は均等、利息は残高×金利）
function mpay_gankin_year(a,y,r,yi){
  // yi=経過年数(0始まり)。その年の年間返済額を返す（万円）
  if(!a||a<=0||yi>=y)return 0;
  const principal=a/y;// 年間元金返済額（万円）
  const bal_start=a-principal*yi;// 期初残高
  const interest=bal_start*(r/100);// 年間利息
  return Math.round((principal+interest)*10)/10;
}
// 元金均等：ローン残高
function lbal_gankin(a,y,yi){
  if(!a||a<=0||yi>=y)return 0;
  return Math.round(a*(1-yi/y)*10)/10;
}
function lbal(p,y,r,yi){if(yi>=y)return 0;const mr=r/100/12,n=y*12,m=yi*12;if(mr===0)return p*(1-yi/y);return Math.round(p*10000*(Math.pow(1+mr,n)-Math.pow(1+mr,m))/(Math.pow(1+mr,n)-1))/10000}

function syncRateBase(){
  const v=document.getElementById('rate-base')?.value||'0.5';
  const d=document.getElementById('rate-base-dummy');
  if(d)d.value=v;
}
function addRate(){
  if(rCnt>=5){alert('最大5回まで');return}
  rCnt++;const id=rCnt;
  const el=document.createElement('div');el.id=`rs-${id}`;el.className='drow drow-4';
  // 前の段階の金利+1%をデフォルト値にする
  let prevRate=fv('rate-base');
  const prevEl=document.getElementById(`rsr-${id-1}`);
  if(prevEl)prevRate=parseFloat(prevEl.value)||prevRate;
  const newRate=(prevRate+1).toFixed(2);
  const prevFrom=id>1?parseInt(document.getElementById(`rsf-${id-1}`)?.value)||11:0;
  const newFrom=id===1?11:prevFrom+5;
  el.innerHTML=`<span class="dlbl" style="color:var(--amber)">変更${id}</span>
    <div class="suf"><input class="inp" id="rsf-${id}" onfocus="scrollToCFRow('lRep')" onblur="cfRowBlur()" type="number" value="${newFrom}" min="1" max="50" oninput="live()" class="inp age-inp"><span class="sl">年目〜</span></div>
    <div class="suf"><input class="inp" id="rsr-${id}" onfocus="scrollToCFRow('lRep')" onblur="cfRowBlur()" type="number" value="${newRate}" min="0" max="15" step="0.01" oninput="live()" class="inp amt-inp"><span class="sl">%</span></div>
    <button class="btn-rm" onclick="rmRate(${id})">×</button>`;
  $('rate-cont').appendChild(el);
  if(rCnt>=5)$('btn-add-rate').style.display='none';
}
function rmRate(id){$(`rs-${id}`)?.remove();rCnt--;$('btn-add-rate').style.display=''}
function getRates(){
  const s=[{from:0,rate:fv('rate-base')}];
  document.querySelectorAll('[id^="rsf-"]').forEach(el=>{
    const parts=el.id.split('-');
    if(parts.length!==2)return; // ペアローン用(rsf-h-1等)を除外
    const id=parts[1];
    const fromYr=(parseInt(el.value)||0)-1; // UI「○年目」→内部index（0始まり）に変換
    s.push({from:fromYr,rate:parseFloat($(`rsr-${id}`)?.value)||0});
  });
  return s.sort((a,b)=>a.from-b.from);
}
function effRate(yr,rates){let r=rates[0]?.rate??0.5;for(const s of rates)if(yr>=s.from)r=s.rate;return r}

// ── ペアローン段階金利 ──
let rHCnt=0, rWCnt=0;
function addPairRate(p){
  const cnt=p==='h'?rHCnt:rWCnt;
  if(cnt>=5){alert('最大5回まで');return}
  if(p==='h')rHCnt++;else rWCnt++;
  const id=p==='h'?rHCnt:rWCnt;
  const el=document.createElement('div');el.id=`rs-${p}-${id}`;el.className='drow drow-4';
  let prevRate=fv(`rate-${p}-base`);
  const prevEl=document.getElementById(`rsr-${p}-${id-1}`);
  if(prevEl)prevRate=parseFloat(prevEl.value)||prevRate;
  const newRate=(prevRate+1).toFixed(2);
  const prevFrom=id>1?parseInt(document.getElementById(`rsf-${p}-${id-1}`)?.value)||11:0;
  const newFrom=id===1?11:prevFrom+5;
  el.innerHTML=`<span class="dlbl" style="color:var(--amber)">変更${id}</span>
    <div class="suf"><input class="inp" id="rsf-${p}-${id}" onfocus="scrollToCFRow('lRep')" onblur="cfRowBlur()" type="number" value="${newFrom}" min="1" max="50" oninput="live()" class="inp age-inp"><span class="sl">年目〜</span></div>
    <div class="suf"><input class="inp" id="rsr-${p}-${id}" onfocus="scrollToCFRow('lRep')" onblur="cfRowBlur()" type="number" value="${newRate}" min="0" max="15" step="0.01" oninput="live()" class="inp amt-inp"><span class="sl">%</span></div>
    <button class="btn-rm" onclick="rmPairRate('${p}',${id})">×</button>`;
  $(`rate-${p}-cont`).appendChild(el);
  if((p==='h'?rHCnt:rWCnt)>=5)$(`btn-add-rate-${p}`).style.display='none';
}
function rmPairRate(p,id){$(`rs-${p}-${id}`)?.remove();if(p==='h')rHCnt--;else rWCnt--;$(`btn-add-rate-${p}`).style.display=''}
function getPairRates(p){
  const s=[{from:0,rate:fv(`rate-${p}-base`)}];
  document.querySelectorAll(`[id^="rsf-${p}-"]`).forEach(el=>{
    const id=el.id.split('-')[2];
    const fromYr=(parseInt(el.value)||0)-1;
    s.push({from:fromYr,rate:parseFloat($(`rsr-${p}-${id}`)?.value)||0});
  });
  return s.sort((a,b)=>a.from-b.from);
}
