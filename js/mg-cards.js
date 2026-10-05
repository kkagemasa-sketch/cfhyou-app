// mg-cards.js — 万が一タブの質問カード（フェーズ4で作り直した中身）
// mg-qa.js の mgQA_buildPanel から呼ばれる。state の更新は mgQA_setState / data-k（mgQA_updateState）を使う。

// ===== 共通 =====
function mgC_survivor(tab){ return tab.target==='h' ? 'w' : 'h'; }
function mgC_name(p){ return p==='h' ? (householdType==='single'?'ご本人':'ご主人様') : '奥様'; }
function mgC_ageNow(p){ return p==='h' ? (mgQA_iv('husband-age')||30) : (mgQA_iv('wife-age')||29); }
function mgC_retireAge(p){ return p==='h' ? (mgQA_iv('retire-age')||60) : (mgQA_iv('w-retire-age')||60); }
function mgC_startYear(){ return (typeof getCfStartYear==='function') ? getCfStartYear() : new Date().getFullYear(); }
// 万が一の年の、その人の年齢
function mgC_ageAtEvent(tab, p){ return mgC_ageNow(p) + (tab.state.deathYear||1) - 1; }
function mgC_yearOfAge(p, age){ return mgC_startYear() + (age - mgC_ageNow(p)); }
function mgC_man(x){ return `${Math.round(x||0).toLocaleString()}万円`; }
// 額面→手取り（社会保険に加入する前提。公務員はその計算）
function mgC_g2n(p, gross, age){
  if(!(gross>0)) return 0;
  const wt = (typeof getWorkType==='function' && getWorkType(p)==='komuin') ? 'komuin' : 'kaishain';
  return Math.round(grossToNetYearly(gross, age, wt, 0, 0, 0));
}
function mgC_seg(tabId, key, opts, cur, extra){
  return `<div class="mgqa-mini-seg"${extra||''}>${opts.map(([v,label])=>`<button type="button" class="${String(cur)===String(v)?'on':''}" onclick="mgQA_setState('${tabId}','${key}',${typeof v==='number'?v:`'${v}'`},{rebuild:true})">${label}</button>`).join('')}</div>`;
}
// 末子が◯歳になる年の、その人の年齢（子がいなければ null）
function mgC_ageWhenYoungestIs(p, childAge){
  const ages = [...document.querySelectorAll('#children-cont input[id^="ca-"]')].map(e=>parseInt(e.value)).filter(a=>a>=0);
  if(!ages.length) return null;
  const y = Math.min(...ages);
  if(y>=childAge) return null;
  return mgC_ageNow(p) + (childAge - y);
}

// ===== ④配偶者の収入 =====
// state: incomeMode 'same'|'pct'|'part'|'steps'|'none'（旧 'override' は steps/free として扱う）
//   incPctDir 'down'|'up', incPctAbs, incUntil
//   incPart {amt, from, to}, incBasis 'net'|'gross'（パート・期間ごとの金額の種類）
//   incStepsSub 'free'|'normal', incomeSteps [{ageFrom,ageTo,amt}], incNormal [{ageFrom,ageTo,mode,pct,amt}]
function mgC_incMode(s){ return s.incomeMode==='override' ? 'steps' : (s.incomeMode||'same'); }
function mgC_incSub(s){ return s.incomeMode==='override' ? 'free' : (s.incStepsSub||'free'); }

// 遺された方の手取り収入（万が一の後の年）。null＝通常どおり
function mgQA_incomeFn(tab){
  const s = tab.state, p = mgC_survivor(tab);
  const mode = mgC_incMode(s);
  const basis = s.incBasis==='gross' ? 'gross' : 'net';
  const toNet = (amt, age) => basis==='gross' ? mgC_g2n(p, amt, age) : Math.round(amt);
  if(mode==='same') return null;
  if(mode==='none') return ()=>0;
  if(mode==='pct'){
    const pct = (s.incPctDir==='up'?1:-1) * (+s.incPctAbs||0);
    const until = +s.incUntil || mgC_retireAge(p);
    return (age, base) => age>until ? 0 : Math.round((base||0)*(1+pct/100));
  }
  if(mode==='part'){
    const pt = s.incPart || {};
    const from = +pt.from || mgC_ageAtEvent(tab,p), to = +pt.to || mgC_retireAge(p);
    return age => (age<from||age>to) ? 0 : toNet(+pt.amt||0, age);
  }
  // 期間ごと
  if(mgC_incSub(s)==='normal'){
    const rows = Array.isArray(s.incNormal) ? s.incNormal : [];
    const normGross = typeof isGrossInputMode==='function' && isGrossInputMode(p);
    return (age, base) => {
      const r = rows.find(x=>age>=x.ageFrom && age<=x.ageTo);
      if(!r || r.mode==='keep' || !r.mode) return null;
      if(r.mode==='pct'){
        if(normGross){
          const g = getIncomeAtAge(getIncomeSteps(p), age);
          return mgC_g2n(p, g*(1+(+r.pct||0)/100), age);
        }
        return Math.round((base||0)*(1+(+r.pct||0)/100));
      }
      return toNet(+r.amt||0, age);
    };
  }
  const steps = (Array.isArray(s.incomeSteps)?s.incomeSteps:[]).filter(st=>st && st.ageTo>=st.ageFrom);
  return age => {
    const st = steps.find(x=>age>=x.ageFrom && age<=x.ageTo);
    if(!st) return s.incomeMode==='override' ? null : 0;  // 期間外は収入なし（旧データは通常どおり）
    if(st.amt!==undefined) return toNet(+st.amt||0, age);
    // 旧データ（開始〜終了の手取りを直線で）
    const a1=+st.ageFrom, a2=+st.ageTo, n1=+st.netFrom||0, n2=(st.netTo===undefined?n1:+st.netTo||0);
    return Math.round(a2===a1 ? n1 : n1+(n2-n1)*(age-a1)/(a2-a1));
  };
}

function mgQA_incomeCard(tab){
  const s = tab.state, id = tab.id, p = mgC_survivor(tab), who = mgC_name(p);
  const mode = mgC_incMode(s);
  const evAge = mgC_ageAtEvent(tab, p), ret = mgC_retireAge(p);
  const R = window.lastR || {};
  const normNow = Math.round(((p==='h'?R.hInc:R.wInc)||[])[(s.deathYear||1)-1]||0);
  let body = mgC_seg(id,'incomeMode',[['same','通常どおり'],['pct','％で増減'],['part','パート'],['steps','期間ごと'],['none','働かない']],mode);
  const basisSeg = mgC_seg(id,'incBasis',[['net','手取り'],['gross','額面']], s.incBasis==='gross'?'gross':'net');
  if(mode==='same'){
    body += `<div class="mgqa-note">通常のCF表と同じ収入（③収入の設定）をそのまま使います。万が一の年 手取り <b>${mgC_man(normNow)}</b>、${ret}歳まで</div>`;
  }else if(mode==='none'){
    body += `<div class="mgqa-note">万が一の後（${mgC_yearOfAge(p,evAge)}年〜）の${who}の収入を <b>0円</b> にします</div>`;
  }else if(mode==='pct'){
    const dir = s.incPctDir==='up'?'up':'down', abs = +s.incPctAbs||0;
    const pct = (dir==='up'?1:-1)*abs;
    body += `<div class="g2">
        <div class="fg"><label class="lbl">増やす・減らす</label>${mgC_seg(id,'incPctDir',[['up','増やす'],['down','減らす']],dir)}</div>
        <div class="fg"><label class="lbl">割合</label><div class="suf"><input class="inp" type="number" min="0" max="100" value="${abs}" data-k="incPctAbs" data-cf-row="${p}Inc"><span class="sl">％ ${dir==='up'?'増':'減'}</span></div></div>
      </div>
      <div class="mgqa-quick">${[[-50,'−50%'],[-30,'−30%'],[-20,'−20%'],[10,'+10%'],[20,'+20%']].map(([v,l])=>`<button type="button" class="${v===pct?'on':''}" onclick="mgC_setPct('${id}',${v})">${l}</button>`).join('')}</div>
      <div class="mgqa-note">通常 万が一の年 ${mgC_man(normNow)} → <b>${mgC_man(normNow*(1+pct/100))}</b>（以後の昇給も同じ割合）</div>
      <div class="fg" style="margin-top:6px"><label class="lbl">いつまで</label><div class="suf" style="max-width:180px"><input class="inp age-inp" type="number" min="${evAge}" max="80" value="${s.incUntil||ret}" data-k="incUntil"><span class="sl">歳まで</span></div></div>`;
  }else if(mode==='part'){
    const pt = s.incPart || {};
    const amt = pt.amt===undefined ? 130 : +pt.amt||0;
    const from = +pt.from || evAge, to = +pt.to || ret;
    const quick = [[evAge,'万が一の直後から']];
    const a7 = mgC_ageWhenYoungestIs(p,7), a13 = mgC_ageWhenYoungestIs(p,13);
    if(a7 && a7>evAge) quick.push([a7,'末子が小学校入学']);
    if(a13 && a13>evAge) quick.push([a13,'末子が中学入学']);
    const net = s.incBasis==='gross' ? mgC_g2n(p, amt, from) : amt;
    body += `<div class="g2">
        <div class="fg"><label class="lbl">年収</label><div class="suf"><input class="inp amt-inp" type="number" min="0" value="${amt}" data-k="incPart.amt"><span class="sl">万円/年</span></div></div>
        <div class="fg"><label class="lbl">入力の種類</label>${basisSeg}</div>
      </div>
      <div class="g2" style="margin-top:4px">
        <div class="fg"><label class="lbl">いつから</label><div class="suf"><input class="inp age-inp" type="number" min="${evAge}" max="80" value="${from}" data-k="incPart.from"><span class="sl">歳から（${mgC_yearOfAge(p,from)}年）</span></div></div>
        <div class="fg"><label class="lbl">いつまで</label><div class="suf"><input class="inp age-inp" type="number" min="${evAge}" max="80" value="${to}" data-k="incPart.to"><span class="sl">歳まで</span></div></div>
      </div>
      <div class="mgqa-quick">${quick.map(([a,l])=>`<button type="button" class="${a===from?'on':''}" onclick="mgQA_setState('${id}','incPart.from',${a},{rebuild:true})">${l}</button>`).join('')}</div>
      <div class="mgqa-note">${s.incBasis==='gross'?`額面${mgC_man(amt)} → 手取り 約<b>${mgC_man(net)}</b>（社会保険に加入する場合）`:`手取り <b>${mgC_man(amt)}</b>`}。${from>evAge?`それまで（${evAge}〜${from-1}歳）は収入0`:''}</div>`;
  }else{
    const sub = mgC_incSub(s);
    body += `<div class="g2" style="margin-top:2px">
        <div class="fg"><label class="lbl">期間の決め方</label>${mgC_seg(id,'incStepsSub',[['free','自由に期間を入れる'],['normal','通常時の期間ごとに変える']],sub)}</div>
        <div class="fg"><label class="lbl">金額の入力</label>${basisSeg}</div>
      </div>`;
    body += sub==='normal' ? mgC_incNormalTable(tab) : mgC_incFreeTable(tab);
  }
  body += `<div class="mgqa-cmp" data-cmp="income"></div>`;
  return body;
}
function mgC_setPct(tabId, v){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.incPctDir = v>0 ? 'up' : 'down';
  tab.state.incPctAbs = Math.abs(v);
  mgQA_switchTab(tabId);
}
function mgC_incFreeTable(tab){
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  const steps = Array.isArray(s.incomeSteps) ? s.incomeSteps : [];
  const gross = s.incBasis==='gross';
  let h = `<div class="mgqa-rows"><div class="mgqa-row h"><span>開始</span><span></span><span>終了</span><span>年収（${gross?'額面':'手取り'}）</span><span></span></div>`;
  steps.forEach((st,i)=>{
    const amt = st.amt!==undefined ? st.amt : (st.netFrom||0);
    h += `<div class="mgqa-row">
      <div class="suf"><input class="inp age-inp" type="number" value="${st.ageFrom}" data-k="incomeSteps.${i}.ageFrom"><span class="sl">歳</span></div><span class="tl">〜</span>
      <div class="suf"><input class="inp age-inp" type="number" value="${st.ageTo}" data-k="incomeSteps.${i}.ageTo"><span class="sl">歳</span></div>
      <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${amt}" data-k="incomeSteps.${i}.amt"><span class="sl">万円</span></div>
      <button type="button" class="x" onclick="mgQA_removeIncomeStep('${id}',${i})">×</button></div>`;
  });
  h += `</div><button class="btn-add" onclick="mgQA_addIncomeStep('${id}')">＋ 期間を追加</button>`;
  if(gross && steps.length){
    h += `<div class="mgqa-note">手取り換算：${steps.map(st=>{const a=st.amt!==undefined?+st.amt:+st.netFrom||0;return `${st.ageFrom}〜${st.ageTo}歳 約${mgC_man(mgC_g2n(p,a,st.ageFrom))}`;}).join('／')}</div>`;
  }
  h += `<div class="hint">期間に入らない年は収入0になります</div>`;
  return h;
}
// 通常時の収入の期間（③収入の段階）を一覧にして、期間ごとに ％／金額／そのまま
function mgC_ensureIncNormal(tab){
  const s = tab.state, p = mgC_survivor(tab);
  if(Array.isArray(s.incNormal) && s.incNormal.length) return;
  const steps = getIncomeSteps(p);
  s.incNormal = steps.map((st,i)=>({ageFrom:st.ageFrom, ageTo: i<steps.length-1 ? steps[i+1].ageFrom-1 : st.ageTo, mode:'keep', pct:0, amt:0}));
}
function mgC_incNormalTable(tab){
  mgC_ensureIncNormal(tab);
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  const evAge = mgC_ageAtEvent(tab, p);
  const steps = getIncomeSteps(p);
  const normAt = a => getIncomeAtAge(steps, a);
  const normGross = typeof isGrossInputMode==='function' && isGrossInputMode(p);
  if(!s.incNormal.length) return `<div class="hint">③収入に${mgC_name(p)}の収入の段階がありません</div>`;
  let h = `<div class="mgqa-nt"><div class="r h"><span>期間</span><span>通常時（${normGross?'額面':'手取り'}）</span><span>万が一の後</span></div>`;
  s.incNormal.forEach((r,i)=>{
    const range = `${mgC_man(normAt(r.ageFrom))}${r.ageTo>r.ageFrom?`→${mgC_man(normAt(r.ageTo))}`:''}`;
    if(r.ageTo<evAge){
      h += `<div class="r past"><span class="p">${r.ageFrom}〜${r.ageTo}歳</span><span>${range}</span><span class="mute">万が一の前（変更なし）</span></div>`;
      return;
    }
    const m = r.mode||'keep';
    const segs = [['pct','％'],['amt','金額'],['keep','そのまま']].map(([v,l])=>`<button type="button" class="${m===v?'on':''}" onclick="mgQA_setState('${id}','incNormal.${i}.mode','${v}',{rebuild:true})">${l}</button>`).join('');
    const inp = m==='pct' ? `<div class="suf"><input class="inp" type="number" value="${r.pct||0}" data-k="incNormal.${i}.pct"><span class="sl">％</span></div>`
      : m==='amt' ? `<div class="suf"><input class="inp amt-inp" type="number" min="0" value="${r.amt||0}" data-k="incNormal.${i}.amt"><span class="sl">万円/年</span></div>` : '';
    h += `<div class="r"><span class="p">${r.ageFrom}〜${r.ageTo}歳${r.ageTo-r.ageFrom>=2?` <button type="button" class="split" title="この期間を2つに分ける" onclick="mgC_splitIncNormal('${id}',${i})">分ける</button>`:''}</span><span>${range}</span><span><span class="mgqa-mini-seg" style="margin:0">${segs}</span>${inp}</span></div>`;
  });
  h += `</div><div class="hint">通常時の期間は③収入の設定をそのまま表示します。％は通常の金額に対する増減です</div>
    <button type="button" class="mgqa-linkbtn" onclick="mgC_resetIncNormal('${id}')">③収入の期間で作り直す</button>`;
  return h;
}
function mgC_splitIncNormal(tabId, i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const r = tab.state.incNormal[i]; if(!r) return;
  const mid = Math.floor((r.ageFrom + r.ageTo + 1)/2);
  tab.state.incNormal.splice(i, 1, {...r, ageTo: mid-1}, {...r, ageFrom: mid});
  mgQA_switchTab(tabId);
}
function mgC_resetIncNormal(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.incNormal = [];
  mgQA_switchTab(tabId);
}

// 計算のあと：通常と万が一の後の合計を比べる
function mgC_fillCompare(tab, panel){
  const el = panel.querySelector('[data-cmp="income"]'); if(!el) return;
  const MR = window.lastMR, R = window.lastR; if(!MR||!R) { el.innerHTML=''; return; }
  const p = mgC_survivor(tab), key = p==='h'?'hInc':'wInc';
  const i0 = (tab.state.deathYear||1)-1;
  const ages = p==='h' ? R.hA : R.wA;
  const end = Math.max(+tab.state.incUntil||0, +(tab.state.incPart||{}).to||0, mgC_retireAge(p));
  let a=0,b=0, i1=i0;
  for(let i=i0;i<(R[key]||[]).length;i++){
    if(ages && ages[i]>end) break;
    a += R[key][i]||0; b += (MR[key]||[])[i]||0; i1=i;
  }
  const y0 = mgC_startYear();
  el.innerHTML = `<div><small>通常の手取り合計（${y0+i0}〜${y0+i1}年）</small><b>${mgC_man(a)}</b></div><div><small>万が一の後（同じ期間）</small><b>${mgC_man(b)}</b></div>`;
}
function mgQA_afterCalcExtra(tab, panel){
  mgC_fillCompare(tab, panel);
}
