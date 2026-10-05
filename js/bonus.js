// bonus.js — ③収入「年収のうちボーナス」欄と傷病手当金の計算
// ボーナスは傷病手当金（万が一の障害タブ）の計算にだけ使う。手取り・税金・年金・CF表の数字は変えない。
// 入力は任意。未入力のときはボーナス0円として計算し（傷病手当金が多めに出る）、オレンジの印で知らせる。

// 健康保険の標準報酬月額（万円・協会けんぽ 50等級）
const HYOJUN_KENPO_GRADES=[5.8,6.8,7.8,8.8,9.8,10.4,11,11.8,12.6,13.4,14.2,15,16,17,18,19,20,22,24,26,28,30,32,34,36,38,41,44,47,50,53,56,59,62,65,68,71,75,79,83,88,93,98,103,109,115,121,127,133,139];

// 月給（万円）→ 標準報酬月額（万円）。等級の境目は隣の等級との中間で判定
function kenpoHyojunGetsugaku(monthly){
  const G=HYOJUN_KENPO_GRADES;
  if(!(monthly>0))return 0;
  for(let i=0;i<G.length-1;i++){
    if(monthly<(G[i]+G[i+1])/2)return G[i];
  }
  return G[G.length-1];
}
// 傷病手当金の1日あたり（円）＝ 標準報酬月額÷30（10円未満四捨五入）× 2/3（1円未満四捨五入）
function sickBenefitDaily(hyojunMan){
  if(!(hyojunMan>0))return 0;
  const perDay=Math.round(hyojunMan*10000/30/10)*10;
  return Math.round(perDay*2/3);
}

// 傷病手当金の対象か（健康保険に本人加入：会社員・公務員。扶養内パートは対象外）
function bonusApplies(p){
  if(p==='w'&&householdType==='single')return false;
  if(isGrossInputMode(p)&&getWorkType(p)==='part')return false;
  const steps=getIncomeSteps(p);
  return steps.some(s=>(s.netFrom||0)>0||(s.netTo||0)>0);
}
// 未入力か（入力方法に応じた欄が空）
function isBonusBlank(p){
  const mode=document.getElementById(`${p}-bonus-mode`)?.value==='months'?'months':'amt';
  const v=document.getElementById(mode==='months'?`${p}-bonus-months`:`${p}-bonus-amt`)?.value;
  return v===undefined||v===null||String(v).trim()==='';
}

// その年齢の額面年収（万円）。手取り入力なら手取りになる額面を二分探索で逆算
function incomeGrossAtAge(p,age){
  const val=getIncomeAtAge(getIncomeSteps(p),age);
  if(!(val>0))return 0;
  if(isGrossInputMode(p))return val;
  const wt=getWorkType(p);
  let lo=val,hi=val*2.2;
  for(let k=0;k<40;k++){
    const mid=(lo+hi)/2;
    if(grossToNetYearly(mid,age,wt,0,0,0)<val)lo=mid;else hi=mid;
  }
  return Math.round((lo+hi)/2*10)/10;
}

// 額面年収を月給とボーナスに分ける（未入力はボーナス0）
// 戻り値 {gross, monthly, bonus, blank}（万円）
function splitBonus(p,gross){
  const blank=isBonusBlank(p);
  if(!(gross>0))return {gross:0,monthly:0,bonus:0,blank};
  if(blank)return {gross,monthly:gross/12,bonus:0,blank};
  const mode=document.getElementById(`${p}-bonus-mode`)?.value==='months'?'months':'amt';
  if(mode==='months'){
    const m=Math.max(0,parseFloat(document.getElementById(`${p}-bonus-months`).value)||0);
    const monthly=gross/(12+m);
    return {gross,monthly,bonus:monthly*m,blank};
  }
  // 金額は「今年の年収」に対する割合として全段階に適用する
  const amt=Math.max(0,parseFloat(document.getElementById(`${p}-bonus-amt`).value)||0);
  const g0=incomeGrossAtAge(p,currentAgeOf(p))||gross;
  const ratio=g0>0?Math.min(amt/g0,0.9):0;
  const bonus=gross*ratio;
  return {gross,monthly:(gross-bonus)/12,bonus,blank};
}
function currentAgeOf(p){
  return parseInt(document.getElementById(p==='h'?'husband-age':'wife-age')?.value)||0;
}

// 傷病手当金の見込み（その年齢時点）{daily(円), annual(万円), hyojun(万円), monthly, bonus, gross, blank}
function sickBenefitAt(p,age){
  const gross=incomeGrossAtAge(p,age);
  const sp=splitBonus(p,gross);
  const hyojun=kenpoHyojunGetsugaku(sp.monthly);
  const daily=sickBenefitDaily(hyojun);
  return {...sp,hyojun,daily,annual:Math.round(daily*365/1000)/10};
}

// ===== 画面 =====
function setBonusMode(p,mode){
  const el=document.getElementById(`${p}-bonus-mode`); if(!el)return;
  el.value=mode==='months'?'months':'amt';
  updateBonusUI();
  if(typeof live==='function') live(true);
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
}
function onBonusInput(){
  updateBonusUI();
  if(typeof live==='function') live();   // 障害タブの傷病手当金に効くため再計算
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
}
function updateBonusUI(){
  let anyWarn=false;
  ['h','w'].forEach(p=>{
    const box=document.getElementById(`${p}-bonus-box`); if(!box)return;
    const applies=bonusApplies(p);
    box.style.display=applies?'':'none';
    const mode=document.getElementById(`${p}-bonus-mode`)?.value==='months'?'months':'amt';
    box.querySelectorAll('[data-bmode]').forEach(b=>b.classList.toggle('on',b.dataset.bmode===mode));
    const amtWrap=document.getElementById(`${p}-bonus-amt-wrap`), monWrap=document.getElementById(`${p}-bonus-months-wrap`);
    if(amtWrap)amtWrap.style.display=mode==='amt'?'':'none';
    if(monWrap)monWrap.style.display=mode==='months'?'':'none';
    const blank=isBonusBlank(p);
    const warn=applies&&blank;
    if(warn)anyWarn=true;
    box.classList.toggle('warn',warn);
    const badge=document.getElementById(`${p}-bonus-badge`);
    if(badge){badge.textContent=blank?'未入力':'入力済み';badge.className='bonus-badge '+(blank?'warn':'ok');}
    const dot=document.getElementById(`${p}-bonus-dot`);
    if(dot)dot.style.display=warn?'':'none';
    const res=document.getElementById(`${p}-bonus-result`);
    if(res){
      if(!applies){res.innerHTML='';}
      else{
        const age=currentAgeOf(p);
        const sb=sickBenefitAt(p,age);
        const f=x=>(Math.round(x*10)/10).toLocaleString();
        res.innerHTML=blank
          ?`<div class="bonus-warnmsg">⚠ ボーナスが入っていません。このままだと<b>ボーナス0円</b>として計算し、傷病手当金が<b>多めに</b>出ます。ボーナスがない方は「0」と入れるとこの表示が消えます。</div>`
          :`<div class="bonus-res">今年の年収（額面${isGrossInputMode(p)?'':'・手取りから推計'}）${f(sb.gross)}万円 ＝ 月給 <b>${f(sb.monthly)}万円</b> × 12 ＋ ボーナス <b>${f(sb.bonus)}万円</b><br>→ 傷病手当金の見込み：<b>約${f(sb.annual)}万円/年</b>（最長1年6か月）</div>`;
      }
    }
  });
  const secDot=document.getElementById('inc-bonus-dot');
  if(secDot)secDot.style.display=anyWarn?'':'none';
}
