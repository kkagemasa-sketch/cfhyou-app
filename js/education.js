// education.js — 教育費計算

function eduCosts(cid){
  const c=new Array(32).fill(0);
  const el=_v(`ce-${cid}`)||'public',mi=_v(`cm-${cid}`)||'public',hi=_v(`ch-${cid}`)||'public',un=_v(`cu-${cid}`)||'plit_h';
  // 保育料：hn-A（A歳ラベル）→ c[A]（CF上もA歳に反映）
  const h0=fv(`hn-0-${cid}`), h1=fv(`hn-1-${cid}`), h2=fv(`hn-2-${cid}`);
  const h3=fv(`hn-3-${cid}`), h4=fv(`hn-4-${cid}`), h5=fv(`hn-5-${cid}`), h6=fv(`hn-6-${cid}`);
  const startAge=(x=>isNaN(x)?1:x)(parseInt(document.getElementById(`hoiku-start-${cid}`)?.value));
  const hArr=[h0,h1,h2,h3,h4,h5,h6];
  const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';
  const defaults=hoikuType==='youchien'?[0,0,0,25,25,25,0]:[0,0,41,31,31,31,31]; // 年齢別デフォルト
  for(let a=0;a<=6;a++){
    if(a<startAge){c[a]=0;continue;} // 入園前は0
    const v=hArr[a];
    c[a]=v>0?v:defaults[a]; // 入力値orデフォルト
  }
  // 小学校：7〜12歳
  EDU.elem[el].slice(2).forEach((v,i)=>{c[7+i]=v||0});
  // 中学校：13〜15歳
  EDU.mid[mi].forEach((v,i)=>{c[13+i]=v||0});
  // 高校：16〜18歳
  EDU.high[hi].forEach((v,i)=>{c[16+i]=v||0});
  // 大学：19歳〜
  if(un!=='none')(EDU.univ[un]||EDU.univ.plit_h).forEach((v,i)=>{c[19+i]=v||0});
  return c;
}

// 3区分内訳を返す（各32要素配列）
// 返却: {eduFee, lunch, extra, total, stages}  各c[age] に値
// stages[age] = {stage:'hoiku|elem|mid|high|univ|none', schoolType:'public|private|nat_h|...'}
function eduCostsBd(cid){
  const eduFee=new Array(32).fill(0);
  const lunch =new Array(32).fill(0);
  const extra =new Array(32).fill(0);
  const stages=new Array(32).fill(null);
  const total =eduCosts(cid); // 既存の総額計算を再利用
  const el=_v(`ce-${cid}`)||'public',mi=_v(`cm-${cid}`)||'public',hi=_v(`ch-${cid}`)||'public',un=_v(`cu-${cid}`)||'plit_h';
  const startAge=(x=>isNaN(x)?1:x)(parseInt(document.getElementById(`hoiku-start-${cid}`)?.value));
  const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';

  // 保育（0-6歳）: 3区分ではなく保育料単体を eduFee に計上
  for(let a=0;a<=6;a++){
    if(total[a]>0){
      eduFee[a]=total[a];
      stages[a]={stage:'hoiku', schoolType:hoikuType, gradeName:(hoikuType==='youchien'?'幼稚園':'保育園')+(a)+'歳'};
    }
  }
  // 小学校 7-12歳（EDU_TABLE.elem と同じく index 0,1 はパディングなので slice(2) で揃える）
  if(EDU_BD.elem.eduFee[el]){
    const feeArr=EDU_BD.elem.eduFee[el].slice(2);
    const lunchArr=EDU_BD.elem.lunch[el].slice(2);
    const extraArr=EDU_BD.elem.extra[el].slice(2);
    for(let a=7;a<=12;a++){
      const idx=a-7;
      eduFee[a]=feeArr[idx]||0;
      lunch[a] =lunchArr[idx]||0;
      extra[a] =extraArr[idx]||0;
      if(total[a]>0) stages[a]={stage:'elem', schoolType:el, gradeName:(el==='public'?'公立':'私立')+'小学校'+(a-6)+'年'};
    }
  }
  // 中学校 13-15歳
  if(EDU_BD.mid.eduFee[mi]){
    for(let a=13;a<=15;a++){
      eduFee[a]=EDU_BD.mid.eduFee[mi][a-13]||0;
      lunch[a] =EDU_BD.mid.lunch[mi][a-13]||0;
      extra[a] =EDU_BD.mid.extra[mi][a-13]||0;
      if(total[a]>0) stages[a]={stage:'mid', schoolType:mi, gradeName:(mi==='public'?'公立':'私立')+'中学校'+(a-12)+'年'};
    }
  }
  // 高校 16-18歳
  if(EDU_BD.high.eduFee[hi]){
    for(let a=16;a<=18;a++){
      eduFee[a]=EDU_BD.high.eduFee[hi][a-16]||0;
      lunch[a] =EDU_BD.high.lunch[hi][a-16]||0;
      extra[a] =EDU_BD.high.extra[hi][a-16]||0;
      if(total[a]>0) stages[a]={stage:'high', schoolType:hi, gradeName:(hi==='public'?'公立':'私立')+'高校'+(a-15)+'年'};
    }
  }
  // 大学 19歳〜（3区分の意味が異なる: 授業料/入学金+施設費/生活費）
  if(un!=='none' && EDU_BD.univ.tuition[un]){
    const tuition=EDU_BD.univ.tuition[un]||[];
    const entrance=EDU_BD.univ.entrance[un]||[];
    const living=EDU_BD.univ.living[un]||[];
    const univLen=tuition.length;
    const univNameMap={nat_h:'国立(自宅)',nat_b:'国立(下宿)',plit_h:'私立文系(自宅)',plit_b:'私立文系(下宿)',psci_h:'私立理系(自宅)',psci_b:'私立理系(下宿)',med_h:'私立医科(自宅)',med_b:'私立医科(下宿)',senmon_h:'専門学校(自宅)',senmon_b:'専門学校(下宿)'};
    for(let i=0;i<univLen;i++){
      const a=19+i;
      eduFee[a]=tuition[i]||0;     // 授業料
      lunch[a] =entrance[i]||0;    // 入学金+施設費（lunch枠を流用）
      extra[a] =living[i]||0;      // 生活費
      if(total[a]>0) stages[a]={stage:'univ', schoolType:un, gradeName:(univNameMap[un]||'大学')+(i+1)+'年', isUniv:true};
    }
  }
  return {eduFee, lunch, extra, total, stages};
}

function updateEdu(){
  const sec=$('edu-sec');
  const rows=document.querySelectorAll('[id^="ca-"]');
  if(rows.length===0){sec.innerHTML='';return}
  // 保育料：入園前・年齢を過ぎた欄をグレーアウト
  rows.forEach(el=>{
    const cid=el.id.split('-')[1];
    const age=parseInt(el.value)||0;
    const startAge=(x=>isNaN(x)?1:x)(parseInt(document.getElementById(`hoiku-start-${cid}`)?.value));
    for(let a=0;a<=6;a++){
      const grp=document.getElementById(`hg-${a}-${cid}`);
      const inp=document.getElementById(`hn-${a}-${cid}`);
      if(!grp||!inp)continue;
      const passed=age>a;         // 年齢を過ぎた欄（現在年齢a以下ならまだこれから）
      const beforeEntry=a<startAge; // 入園前の欄
      if(passed||beforeEntry){
        grp.style.opacity='0.35';
        grp.style.pointerEvents='none';
        grp.title=passed?`${a}歳の保育料は入力不要（年齢を過ぎています）`:`入園前（${startAge}歳入園設定）`;
        inp.disabled=true;
        inp.style.background='#e8e8e8';
        inp.style.color='#999';
      } else {
        grp.style.opacity='1';
        grp.style.pointerEvents='';
        grp.title='';
        inp.disabled=false;
        inp.style.background='';
        inp.style.color='';
      }
    }
  });
  const ul={nat_h:'国立自宅',nat_b:'国立下宿',plit_h:'私文自宅',plit_b:'私文下宿',psci_h:'私理自宅',psci_b:'私理下宿',med_h:'医科自宅',med_b:'医科下宿'};
  rows.forEach(el=>{
    const cid=el.id.split('-')[1];
    const pv=$(`cprev-${cid}`);if(!pv)return;
    const costs=eduCosts(cid),tot=costs.reduce((a,b)=>a+b,0);
    const e2=_v(`ce-${cid}`)===  'private'?'小:私立':'小:公立';
    const m=_v(`cm-${cid}`)===  'private'?'中:私立':'中:公立';
    const h=_v(`ch-${cid}`)===  'private'?'高:私立':'高:公立';
    const unv=_v(`cu-${cid}`)||'plit_h';const u='大:'+ul[unv];
    const hoikuStart=(x=>isNaN(x)?1:x)(parseInt(document.getElementById(`hoiku-start-${cid}`)?.value));
    const hoiku=[0,1,2,3,4,5,6].map(a=>a<hoikuStart?0:fv(`hn-${a}-${cid}`));
    const hoikuType=_v(`hoiku-type-${cid}`)||'hoikuen';
    const hoikuDef=hoikuType==='youchien'?[0,0,0,25,25,25,0]:[0,0,41,31,31,31,31];
    const hoikuTot=hoiku.reduce((s,v,i)=>i<hoikuStart?s:s+(v>0?v:hoikuDef[i]),0);
    const hoikuNote=hoiku.some(v=>v>0)?`　保育料合計：<strong style="color:#1a6b2e">${hoikuTot}万円</strong>`:'　保育料：デフォルト値使用';
    pv.innerHTML=`${e2}→${m}→${h}→${u}　教育費合計：<strong style="color:#2d7dd2">${tot}万円</strong>${hoikuNote}`;
  });
}

function getEduStage(age){
  if(age>=1&&age<=6)return 'hoiku';
  if(age>=7&&age<=12)return 'elem';
  if(age>=13&&age<=15)return 'mid';
  if(age>=16&&age<=18)return 'high';
  if(age>=19&&age<=22)return 'univ';
  return null;
}
