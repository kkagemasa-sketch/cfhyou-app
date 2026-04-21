// education.js — 教育費計算

function eduCosts(cid){
  const c=new Array(32).fill(0);
  const el=_v(`ce-${cid}`)||'public',mi=_v(`cm-${cid}`)||'public',hi=_v(`ch-${cid}`)||'public',un=_v(`cu-${cid}`)||'plit_h';
  // 保育料：hn-A（A歳ラベル）→ c[A]（CF上もA歳に反映）
  const h0=fv(`hn-0-${cid}`), h1=fv(`hn-1-${cid}`), h2=fv(`hn-2-${cid}`);
  const h3=fv(`hn-3-${cid}`), h4=fv(`hn-4-${cid}`), h5=fv(`hn-5-${cid}`), h6=fv(`hn-6-${cid}`);
  const startAge=parseInt(document.getElementById(`hoiku-start-${cid}`)?.value)||1;
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

function updateEdu(){
  const sec=$('edu-sec');
  const rows=document.querySelectorAll('[id^="ca-"]');
  if(rows.length===0){sec.innerHTML='';return}
  // 保育料：入園前・年齢を過ぎた欄をグレーアウト
  rows.forEach(el=>{
    const cid=el.id.split('-')[1];
    const age=parseInt(el.value)||0;
    const startAge=parseInt(document.getElementById(`hoiku-start-${cid}`)?.value)||1;
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
    const hoikuStart=parseInt(document.getElementById(`hoiku-start-${cid}`)?.value)||1;
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
