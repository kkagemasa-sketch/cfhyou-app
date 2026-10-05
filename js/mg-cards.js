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
  const dt = panel.querySelector('.mgqa-dis-tbl'); if(dt) dt.innerHTML = mgC_disPenTable(tab);
  mgC_fillCompare(tab, panel);
  mgC_fillLcCompare(tab, panel);
  mgC_fillEduCompare(tab, panel);
  mgC_fillCarCompare(tab, panel);
}

// ===== ⑤生活費 =====
// state: lcMode 'same'|'ratio'|'steps'（旧 'step' は以前の形式の段階として従来どおり計算）
//   lcRatio(%) / lcStepsSub 'free'|'normal'
//   lcFree [{ageFrom, ageTo(空=最後), val}] ＋ lcFreeBasis 'pct'|'month'（遺された方の年齢）
//   lcNormal [{fromYr, toYr(null=最後), mode:'keep'|'pct'|'amt', pct, amt}]（通常時の生活費の期間）
function mgC_lcMode(s){ return s.lcMode||'ratio'; }
// 通常時の生活費の期間（⑥生活費の段階）を年の区切りで
function mgC_lcNormalPeriods(){
  const y0 = mgC_startYear();
  const steps = (typeof getLCSteps==='function') ? getLCSteps() : [];
  const out = [];
  const firstFrom = steps.length ? steps[0].from : null;
  if(!steps.length || firstFrom>y0) out.push({fromYr:y0, toYr: steps.length ? firstFrom-1 : null, label:'基本'});
  steps.forEach((st,i)=>{
    out.push({fromYr: Math.max(st.from,y0), toYr: i<steps.length-1 ? steps[i+1].from-1 : null, label:`段階${i+1}`, rate: st.rate});
  });
  return out.filter(p=>p.toYr===null || p.toYr>=y0);
}
function mgC_ensureLcNormal(tab){
  const s = tab.state;
  if(Array.isArray(s.lcNormal) && s.lcNormal.length) return;
  const evYr = mgC_startYear() + (s.deathYear||1) - 1;
  const rows = [];
  mgC_lcNormalPeriods().forEach(p=>{
    // 万が一が期間の途中なら、万が一の年で分ける
    if(p.fromYr<evYr && (p.toYr===null || p.toYr>=evYr)){
      rows.push({fromYr:p.fromYr, toYr:evYr-1, mode:'keep', pct:100, amt:0, label:p.label});
      rows.push({fromYr:evYr, toYr:p.toYr, mode:'keep', pct:100, amt:0, label:p.label+'の続き'});
    }else rows.push({fromYr:p.fromYr, toYr:p.toYr, mode:'keep', pct:100, amt:0, label:p.label});
  });
  s.lcNormal = rows;
}
// 万が一の後の生活費（年額）。null＝通常の計算（％など）に任せる
function mgQA_lcFn(tab){
  const s = tab.state, p = mgC_survivor(tab);
  const mode = mgC_lcMode(s);
  if(mode==='same') return (yr, sAge, normalLC) => normalLC;   // 通常どおり
  if(mode!=='steps') return null;
  if((s.lcStepsSub||'free')==='normal'){
    const rows = Array.isArray(s.lcNormal) ? s.lcNormal : [];
    const normAt = yr => { const i = yr - mgC_startYear(); return ((window.lastR||{}).lc||[])[i]||0; };
    return (yr, sAge, normalLC) => {
      const r = rows.find(x=>yr>=x.fromYr && (x.toYr===null||x.toYr===undefined||yr<=x.toYr));
      if(!r || !r.mode || r.mode==='keep') return normalLC;
      if(r.mode==='pct') return Math.round(normalLC*(+r.pct||0)/100);
      // 金額：期間の始まりの金額として、以後は通常時の変化率を引き継ぐ
      const n0 = normAt(r.fromYr) || normalLC;
      return Math.round((+r.amt||0) * (n0>0 ? normalLC/n0 : 1));
    };
  }
  const rows = (Array.isArray(s.lcFree)?s.lcFree:[]).slice().sort((a,b)=>(+a.ageFrom||0)-(+b.ageFrom||0));
  const month = s.lcFreeBasis==='month';
  return (yr, sAge, normalLC) => {
    const r = rows.find(x=>sAge>=(+x.ageFrom||0) && (x.ageTo===''||x.ageTo===null||x.ageTo===undefined||sAge<=+x.ageTo));
    if(!r) return normalLC;
    return month ? Math.round((+r.val||0)*12) : Math.round(normalLC*(+r.val||0)/100);
  };
}
function mgQA_lcCard(tab){
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  const mode = mgC_lcMode(s);
  const R = window.lastR || {};
  const i0 = (s.deathYear||1)-1;
  const normEv = Math.round((R.lc||[])[i0]||0);
  let body = mgC_seg(id,'lcMode',[['same','通常どおり'],['ratio','％で設定'],['steps','期間ごと']], mode==='step'?'steps':mode);
  if(mode==='same'){
    body += `<div class="mgqa-note">通常のCF表と同じ生活費を使います。万が一の年 <b>年${mgC_man(normEv)}</b></div>`;
  }else if(mode==='ratio'){
    const r = +s.lcRatio||100;
    body += `<div class="g2"><div class="fg"><label class="lbl">通常に対する割合</label><div class="suf"><input class="inp" type="number" min="10" max="200" value="${r}" data-k="lcRatio" data-cf-row="lc"><span class="sl">％</span></div></div><div></div></div>
      <div class="mgqa-quick">${[60,70,80,90].map(v=>`<button type="button" class="${v===r?'on':''}" onclick="mgQA_setState('${id}','lcRatio',${v},{rebuild:true})">${v}%</button>`).join('')}</div>
      <div class="mgqa-note">通常 年${mgC_man(normEv)} → <b>年${mgC_man(normEv*r/100)}</b>（月約${Math.round(normEv*r/100/12*10)/10}万円）。物価上昇の設定はそのまま適用</div>`;
  }else if(mode==='step'){
    body += `<div class="mgqa-note">以前の形式の段階設定（${(s.lcSteps||[]).length}期間）が入っています。「期間ごと」を押すと新しい形式で入力し直せます</div>`;
  }else{
    const sub = s.lcStepsSub||'free';
    body += `<div class="fg" style="margin-top:2px"><label class="lbl">期間の決め方</label>${mgC_seg(id,'lcStepsSub',[['free','自由に入力'],['normal','通常の期間をもとに']],sub)}</div>`;
    body += sub==='normal' ? mgC_lcNormalTable(tab) : mgC_lcFreeTable(tab);
  }
  body += `<div class="mgqa-cmp" data-cmp="lc"></div>`;
  return body;
}
function mgC_lcFreeTable(tab){
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  if(!Array.isArray(s.lcFree) || !s.lcFree.length){
    const ev = mgC_ageAtEvent(tab,p);
    s.lcFree = [{ageFrom:ev, ageTo:'', val:80}];
  }
  const month = s.lcFreeBasis==='month';
  let h = `<div class="fg"><label class="lbl">入力の種類</label>${mgC_seg(id,'lcFreeBasis',[['pct','％'],['month','月額']], month?'month':'pct')}</div>
    <div class="mgqa-rows"><div class="mgqa-row h"><span>開始</span><span></span><span>終了</span><span>${month?'月額':'通常に対する割合'}</span><span></span></div>`;
  s.lcFree.forEach((r,i)=>{
    h += `<div class="mgqa-row">
      <div class="suf"><input class="inp age-inp" type="number" value="${r.ageFrom}" data-k="lcFree.${i}.ageFrom"><span class="sl">歳</span></div><span class="tl">〜</span>
      <div class="suf"><input class="inp age-inp" type="text" inputmode="numeric" placeholder="最後" value="${r.ageTo??''}" data-k="lcFree.${i}.ageTo"><span class="sl">歳</span></div>
      <div class="suf"><input class="inp" type="number" min="0" value="${r.val}" data-k="lcFree.${i}.val"><span class="sl">${month?'万円/月':'％'}</span></div>
      <button type="button" class="x" onclick="mgC_lcFreeDel('${id}',${i})">×</button></div>`;
  });
  const quick = [];
  const indep = mgC_ageWhenYoungestIs(p, 22);
  if(indep) quick.push([indep,'末子の独立で区切る']);
  quick.push([65,'65歳で区切る']);
  h += `</div><button class="btn-add" onclick="mgC_lcFreeAdd('${id}')">＋ 期間を追加</button>
    <div class="mgqa-quick">${quick.map(([a,l])=>`<button type="button" onclick="mgC_lcFreeSplitAt('${id}',${a})">${l}</button>`).join('')}</div>
    <div class="hint">年齢は${mgC_name(p)}（遺された方）の年齢です。期間に入らない年は通常どおり</div>`;
  return h;
}
function mgC_lcFreeAdd(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const rows = tab.state.lcFree = tab.state.lcFree || [];
  const last = rows[rows.length-1];
  const from = last ? ((last.ageTo!==''&&last.ageTo!=null) ? +last.ageTo+1 : (+last.ageFrom||0)+10) : mgC_ageAtEvent(tab, mgC_survivor(tab));
  if(last && (last.ageTo===''||last.ageTo==null)) last.ageTo = from-1;
  rows.push({ageFrom:from, ageTo:'', val: tab.state.lcFreeBasis==='month'?20:70});
  mgQA_switchTab(tabId);
}
function mgC_lcFreeDel(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.lcFree.splice(i,1);
  mgQA_switchTab(tabId);
}
// 指定の年齢で期間を区切る（その年齢を含む期間を2つに分ける）
function mgC_lcFreeSplitAt(tabId, age){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const rows = tab.state.lcFree || [];
  const i = rows.findIndex(r=>age>+r.ageFrom && (r.ageTo===''||r.ageTo==null||age<=+r.ageTo));
  if(i<0) return;
  const r = rows[i];
  rows.splice(i,1,{...r, ageTo: age-1},{...r, ageFrom: age});
  mgQA_switchTab(tabId);
}
function mgC_lcNormalTable(tab){
  mgC_ensureLcNormal(tab);
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  const evYr = mgC_startYear() + (s.deathYear||1) - 1;
  const R = window.lastR || {};
  const y0 = mgC_startYear();
  const normAt = yr => Math.round((R.lc||[])[yr-y0]||0);
  const ageOf = yr => mgC_ageNow(p) + (yr - y0);
  let h = `<div class="mgqa-nt"><div class="r h"><span>期間</span><span>通常時（年額）</span><span>万が一の後</span></div>`;
  s.lcNormal.forEach((r,i)=>{
    const per = `${r.fromYr}${r.toYr===null||r.toYr===undefined?'年〜':`〜${r.toYr}年`}`;
    const sub = `${mgC_name(p)}${ageOf(r.fromYr)}${r.toYr==null?'歳〜':`〜${ageOf(r.toYr)}歳`}`;
    const nv = `${mgC_man(normAt(r.fromYr))}<br><small>${r.label||''}</small>`;
    if(r.toYr!==null && r.toYr!==undefined && r.toYr<evYr){
      h += `<div class="r past"><span class="p">${per}</span><span>${nv}</span><span class="mute">万が一の前（変更なし）</span></div>`;
      return;
    }
    const m = r.mode||'keep';
    const segs = [['pct','％'],['amt','金額'],['keep','そのまま']].map(([v,l])=>`<button type="button" class="${m===v?'on':''}" onclick="mgQA_setState('${id}','lcNormal.${i}.mode','${v}',{rebuild:true})">${l}</button>`).join('');
    const inp = m==='pct' ? `<div class="suf"><input class="inp" type="number" min="0" value="${r.pct??100}" data-k="lcNormal.${i}.pct"><span class="sl">％</span></div>`
      : m==='amt' ? `<div class="suf"><input class="inp amt-inp" type="number" min="0" value="${r.amt||0}" data-k="lcNormal.${i}.amt"><span class="sl">万円/年</span></div>` : '';
    const canSplit = r.toYr!==null && r.toYr!==undefined && r.toYr-r.fromYr>=2;
    h += `<div class="r"><span class="p">${per}<br><small class="mute">${sub}</small>${canSplit?` <button type="button" class="split" onclick="mgC_splitLcNormal('${id}',${i})">分ける</button>`:''}</span><span>${nv}</span><span><span class="mgqa-mini-seg" style="margin:0">${segs}</span>${inp}</span></div>`;
  });
  h += `</div><div class="hint">万が一が段階の途中で起きた場合、その段階は「万が一の年」から始まる期間として表示します。金額で入れた期間も、毎年の変化率は通常時の設定を引き継ぎます</div>
    <button type="button" class="mgqa-linkbtn" onclick="mgC_resetLcNormal('${id}')">通常時の期間で作り直す</button>`;
  return h;
}
function mgC_splitLcNormal(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const r = tab.state.lcNormal[i]; if(!r || r.toYr==null) return;
  const mid = Math.floor((r.fromYr + r.toYr + 1)/2);
  tab.state.lcNormal.splice(i,1,{...r, toYr: mid-1},{...r, fromYr: mid});
  mgQA_switchTab(tabId);
}
function mgC_resetLcNormal(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.lcNormal = [];
  mgQA_switchTab(tabId);
}
// 生活費の比較（万が一の年〜最後）
function mgC_fillLcCompare(tab, panel){
  const el = panel.querySelector('[data-cmp="lc"]'); if(!el) return;
  const MR = window.lastMR, R = window.lastR; if(!MR||!R){ el.innerHTML=''; return; }
  const i0 = (tab.state.deathYear||1)-1;
  let a=0,b=0;
  for(let i=i0;i<(R.lc||[]).length;i++){ a+=R.lc[i]||0; b+=(MR.lc||[])[i]||0; }
  const y0 = mgC_startYear(), y1 = y0+(R.lc||[]).length-1;
  el.innerHTML = `<div><small>通常の生活費合計（${y0+i0}〜${y1}年）</small><b>${mgC_man(a)}</b></div><div><small>万が一の後（同じ期間）</small><b>${mgC_man(b)}</b></div>`;
}

// ===== ⑥住まいとローン =====
// state: houseAfter 'stay'|'sell'、hSellYr（万が一の年=1年目）、hPrice（空=ローン残高）、hCostMode 'auto'|'manual'、hCost、
//   hNext 'rent'|'buy'|'family'、hRent（万円/月）、hRenew（か月分/2年）、hBuy {price,down,cost,loan:'yes'|'no',yrs,rate,kind,mgmt,ptx}
//   旧データ（houseMode）は：rent＝万が一の年に売却して賃貸（売却費用0）、stages＝最初の賃貸段階、ほか＝住み続ける
function mgC_house(s){
  if(s.houseAfter==='sell' || s.houseAfter==='stay'){
    if(s.houseAfter==='stay') return {sell:false};
    const b = s.hBuy || {};
    return {sell:true, sellYr: Math.max(1, parseInt(s.hSellYr)||1), price: (s.hPrice===undefined?'':s.hPrice),
      costMode: s.hCostMode==='manual'?'manual':'auto', cost: +s.hCost||0,
      next: ['rent','buy','family'].includes(s.hNext)?s.hNext:'rent',
      rentMonthly: s.hRent===undefined?8:+s.hRent||0, renewMonths: s.hRenew===undefined?1:+s.hRenew||0,
      buy: {price:+b.price||0, down:+b.down||0, cost:(b.cost===undefined||b.cost===null||String(b.cost).trim()==='')?Math.round((+b.price||0)*0.07):+b.cost||0, loan: b.loan==='yes', yrs:+b.yrs||20, rate:(b.rate===undefined?1.0:+b.rate||0), mgmt:+b.mgmt||0, ptx:+b.ptx||0}};
  }
  if(s.houseMode==='rent') return {sell:true, sellYr:1, price:'', costMode:'manual', cost:0, next:'rent', rentMonthly:+s.houseNewRent||8, renewMonths:0, buy:{}};
  if(s.houseMode==='stages' && Array.isArray(s.houseStages)){
    const st = s.houseStages.find(x=>x&&x.mode==='rent');
    if(st) return {sell:true, sellYr:Math.max(1,parseInt(st.yearsAfterDeath)||1), price:'', costMode:'manual', cost:0, next:'rent', rentMonthly:+st.rentAmt||0, renewMonths:0, buy:{}};
  }
  return {sell:false};
}
// 亡くなったときの住宅ローン（⑤住宅の名義人・一般団信から自動）
function mgC_dansinText(tab){
  const dead = tab.target, deadName = mgC_name(dead);
  const R = window.lastR || {};
  const i0 = (tab.state.deathYear||1)-1;
  const bal = Math.round(i0>0 ? ((R.lBal||[])[i0-1]||0) : ((R.lBal||[])[0]||0));
  const year = mgC_startYear() + i0;
  const anyLoan = (R.lBal||[]).some(v=>v>0);
  if(!anyLoan) return {ok:false, short:'住宅ローンなし', text:'住宅ローンはありません', sub:''};
  if(pairLoanMode){
    const joined = getLoanDansinJoined(dead);
    return joined
      ? {ok:true, short:`${deadName}分を団信で完済`, text:`${deadName}のローンが${year}年に団信で完済されます`, sub:`ペアローン・${deadName}は一般団信に加入。もう一方のローンは続きます（⑤住宅の設定）`}
      : {ok:false, short:'ローン継続', text:`${deadName}のローンは続きます`, sub:`ペアローン・${deadName}は一般団信に加入していません（⑤住宅の設定）`};
  }
  const cov = getSingleLoanDansinCover();
  if(cov[dead]) return {ok:true, short:'団信で完済', text:`${year}年に完済されます（残高${bal.toLocaleString()}万円 → 0円）`, sub: jointLoanMode?'連帯債務・一般団信の対象（⑤住宅の設定）':`${mgC_name(getLoanBorrower())}名義のローン・一般団信に加入（⑤住宅の設定）`};
  if(!jointLoanMode && !getLoanDansinJoined('s')) return {ok:false, short:'ローン継続', text:'ローンは続きます', sub:'一般団信に加入していません（⑤住宅の設定）'};
  return {ok:false, short:'ローン継続', text:'ローンは続きます', sub: jointLoanMode?`連帯債務の団信の対象が${deadName}ではありません（⑤住宅の設定）`:`${mgC_name(getLoanBorrower())}名義のため、${deadName}が亡くなってもローンは続きます（⑤住宅の設定）`};
}
function mgQA_houseCard(tab){
  const s = tab.state, id = tab.id, hs = mgC_house(s);
  const dt = mgC_dansinText(tab);
  const evYr = mgC_startYear() + (s.deathYear||1) - 1;
  let h = mgC_isDis(tab) ? mgQA_disHouseTop(tab) : `<div class="mgqa-step"><span class="no">1</span>亡くなったときの住宅ローン（自動）</div>
    <div class="mgqa-auto ${dt.ok?'ok':'ng'}"><span class="ic">${dt.ok?'✓':'!'}</span><div><b>${dt.text}</b><small>${dt.sub}</small></div></div>`;
  h += `
    <div class="mgqa-step"><span class="no">2</span>その後の住まい</div>
    ${mgC_seg(id,'houseAfter',[['stay','住み続ける'],['sell','売却して住み替える']], hs.sell?'sell':'stay')}`;
  if(!hs.sell) return h + `<div class="mgqa-note">今の家に住み続けます。管理費・固定資産税・修繕費は通常のCF表のとおりです</div>`;
  const sellYear = evYr + hs.sellYr - 1;
  const MR = window.lastMR;
  const iS = (s.deathYear||1)-1 + hs.sellYr - 1;
  const bal = MR && MR.lBal && iS>0 ? Math.round(MR.lBal[iS-1]||0) : 0;
  const price = hs.price===''||hs.price===null ? bal : +hs.price;
  const cost = hs.costMode==='manual' ? hs.cost : Math.round(price*0.04);
  const net = price - cost - bal;
  h += `<div class="mgqa-sub">売却</div>
    <div class="g2">
      <div class="fg"><label class="lbl">いつ</label><div class="suf"><input class="inp age-inp" type="number" min="1" max="50" value="${hs.sellYr}" data-k="hSellYr"><span class="sl">年目（${sellYear}年）</span></div></div>
      <div class="fg"><label class="lbl">売却価格</label><div class="suf"><input class="inp amt-inp" type="text" inputmode="numeric" placeholder="空欄＝ローン残高" value="${hs.price}" data-k="hPrice"><span class="sl">万円</span></div></div>
    </div>
    <div class="g2" style="margin-top:4px">
      <div class="fg"><label class="lbl">売却費用</label>${mgC_seg(id,'hCostMode',[['auto','自動4%'],['manual','手入力']],hs.costMode)}</div>
      <div class="fg"><label class="lbl">&nbsp;</label>${hs.costMode==='manual'?`<div class="suf"><input class="inp amt-inp" type="number" min="0" value="${hs.cost}" data-k="hCost"><span class="sl">万円</span></div>`:`<div class="mgqa-ro">${cost.toLocaleString()}万円</div>`}</div>
    </div>
    <div class="mgqa-note">売却 ${price.toLocaleString()} − 売却費用 ${cost.toLocaleString()} − ローン残高 ${bal.toLocaleString()}${bal===0&&dt.ok?'（団信で完済済み）':''} ＝ <b>手元に${net>=0?'＋':'−'}${Math.abs(net).toLocaleString()}万円</b></div>
    <div class="mgqa-sub">売却後の住まい</div>
    ${mgC_seg(id,'hNext',[['rent','賃貸'],['buy','購入する'],['family','実家など（家賃0）']],hs.next)}`;
  if(hs.next==='rent'){
    h += `<div class="g2">
        <div class="fg"><label class="lbl">家賃</label><div class="suf"><input class="inp amt-inp" type="number" min="0" step="0.1" value="${hs.rentMonthly}" data-k="hRent"><span class="sl">万円/月</span></div></div>
        <div class="fg"><label class="lbl">更新料など</label><div class="suf"><input class="inp" type="number" min="0" step="0.5" value="${hs.renewMonths}" data-k="hRenew"><span class="sl">か月分/2年</span></div></div>
      </div>
      <div class="mgqa-note">${sellYear}年から家賃 年<b>${Math.round(hs.rentMonthly*12).toLocaleString()}万円</b>（＋2年ごとに更新料）。管理費・固定資産税・修繕費は0</div>`;
  }else if(hs.next==='family'){
    h += `<div class="mgqa-note">${sellYear}年から住居費0（家賃・管理費・固定資産税・修繕費なし）</div>`;
  }else{
    const b = hs.buy, bb = s.hBuy || {};
    const L = b.loan ? Math.max(0, b.price - b.down) : 0;
    const pay = L>0 && b.yrs>0 ? Math.round(mpay(L,b.yrs,b.rate)*12) : 0;
    const left = net - (b.price - L + b.cost);
    h += `<div class="g2">
        <div class="fg"><label class="lbl">購入価格</label><div class="suf"><input class="inp amt-inp" type="number" min="0" value="${bb.price||''}" data-k="hBuy.price"><span class="sl">万円</span></div></div>
        <div class="fg"><label class="lbl">諸費用 <span style="font-weight:400">目安7%</span></label><div class="suf"><input class="inp amt-inp" type="text" inputmode="numeric" value="${bb.cost??''}" placeholder="${Math.round(b.price*0.07)||''}" data-k="hBuy.cost"><span class="sl">万円</span></div></div>
      </div>
      <div class="g2" style="margin-top:4px">
        <div class="fg"><label class="lbl">ローン</label>${mgC_seg(id,'hBuy.loan',[['no','借りない（現金）'],['yes','借りる']], b.loan?'yes':'no')}</div>
        <div class="fg">${b.loan?`<label class="lbl">頭金（売却で得たお金から）</label><div class="suf"><input class="inp amt-inp" type="number" min="0" value="${bb.down||''}" data-k="hBuy.down"><span class="sl">万円</span></div>`:''}</div>
      </div>
      ${b.loan?`<div class="g3" style="margin-top:4px">
        <div class="fg"><label class="lbl">借入額</label><div class="mgqa-ro">${L.toLocaleString()}万円</div></div>
        <div class="fg"><label class="lbl">返済期間</label><div class="suf"><input class="inp age-inp" type="number" min="1" max="50" value="${b.yrs}" data-k="hBuy.yrs"><span class="sl">年</span></div></div>
        <div class="fg"><label class="lbl">金利</label><div class="suf"><input class="inp" type="number" min="0" step="0.05" value="${b.rate}" data-k="hBuy.rate"><span class="sl">%</span></div></div>
      </div>`:''}
      <div class="g2" style="margin-top:4px">
        <div class="fg"><label class="lbl">管理費・修繕積立金</label><div class="suf"><input class="inp" type="number" min="0" step="0.1" value="${bb.mgmt||0}" data-k="hBuy.mgmt"><span class="sl">万円/月</span></div></div>
        <div class="fg"><label class="lbl">固定資産税</label><div class="suf"><input class="inp" type="number" min="0" value="${bb.ptx||0}" data-k="hBuy.ptx"><span class="sl">万円/年</span></div></div>
      </div>
      <div class="mgqa-note">${sellYear}年：手元${net>=0?'＋':'−'}${Math.abs(net).toLocaleString()} − ${b.loan?`頭金${(b.price-L).toLocaleString()}`:`購入価格${b.price.toLocaleString()}`} − 諸費用${b.cost.toLocaleString()} ＝ <b>${left>=0?'＋':'−'}${Math.abs(left).toLocaleString()}万円</b>${pay?`<br>${sellYear+1}年から新しいローン返済 年<b>${pay.toLocaleString()}万円</b>（${b.yrs}年）`:''}<br>修繕費・家具家電の買い替えは元の家の設定を引き継ぎます。新しいローンは${mgC_name(mgC_survivor(tab))}が一般団信に加入する前提です</div>`;
  }
  return h;
}

// ===== ⑦教育（進路の変更＋奨学金の受け取り） =====
// state: eduPath {cid:{elem,mid,high,univ}}（''=変えない）、eduSch {cid:[{when,amt,years}]}
//   when: 'hsEntry'=高校入学時(16歳)一時金 / 'univEntry'=大学入学時(19歳)一時金 / 'hs'=高校在学中 毎年(3年) / 'univ'=大学在学中 毎年(年数)
//   旧データ（scholarshipEnabled・scholarships）は初回表示時に eduSch へ移す
const MGC_EDU_LABEL = {
  public:'公立', private:'私立',
  nat_h:'国公立（自宅）', nat_b:'国公立（下宿）', plit_h:'私立文系（自宅）', plit_b:'私立文系（下宿）',
  psci_h:'私立理系（自宅）', psci_b:'私立理系（下宿）', med_h:'医歯系（自宅）', med_b:'医歯系（下宿）',
  senmon_h:'専門学校（自宅）', senmon_b:'専門学校（下宿）', none:'進学しない'
};
const MGC_EDU_STAGES = [
  {k:'elem', label:'小学校', sel:'ce', from:7,  to:12, opts:['public','private']},
  {k:'mid',  label:'中学',   sel:'cm', from:13, to:15, opts:['public','private']},
  {k:'high', label:'高校',   sel:'ch', from:16, to:18, opts:['public','private']},
  {k:'univ', label:'大学など', sel:'cu', from:19, to:24, opts:['nat_h','nat_b','plit_h','plit_b','psci_h','psci_b','med_h','med_b','senmon_h','senmon_b','none']}
];
const MGC_SCH_WHEN = {hsEntry:'高校入学時（16歳）一時金', univEntry:'大学入学時（19歳）一時金', hs:'高校在学中 毎年（3年）', univ:'大学在学中 毎年'};
function mgC_children(){
  return [...document.querySelectorAll('#children-cont > div[id^="cr-"]')].map((row,idx)=>{
    const cid = row.id.replace('cr-','');
    return {cid, idx, age: parseInt(document.getElementById('ca-'+cid)?.value)||0, label: ['第一子','第二子','第三子','第四子'][idx]||`第${idx+1}子`};
  });
}
function mgC_ensureEdu(tab){
  const s = tab.state;
  if(!s.eduPath || typeof s.eduPath!=='object') s.eduPath = {};
  if(!s.eduSch || typeof s.eduSch!=='object'){
    s.eduSch = {};
    // 旧データの移行（高校入学・大学入学の一時金）
    if(s.scholarshipEnabled && s.scholarships){
      const kids = mgC_children();
      Object.keys(s.scholarships).forEach(ix=>{
        const k = kids[parseInt(ix)]; const sc = s.scholarships[ix]; if(!k||!sc) return;
        const list = [];
        if(sc.hs && sc.hs.on && sc.hs.amount>0) list.push({when:'hsEntry', amt:+sc.hs.amount, years:1});
        if(sc.univ && sc.univ.on && sc.univ.amount>0) list.push({when:'univEntry', amt:+sc.univ.amount, years:1});
        if(list.length) s.eduSch[k.cid] = list;
      });
    }
    s.scholarshipEnabled = false;
  }
}
// 子ども1人の、年齢ごとの教育費の差（変更後−通常）
function mgC_eduDelta(cid, path){
  const base = eduCosts(cid);
  const alt = base.slice();
  let changed = false;
  MGC_EDU_STAGES.forEach(st=>{
    const v = path && path[st.k];
    if(!v) return;
    const cur = _v(`${st.sel}-${cid}`) || (st.k==='univ'?'plit_h':'public');
    if(v===cur) return;
    changed = true;
    if(st.k==='elem'){ for(let a=7;a<=12;a++) alt[a]=0; EDU.elem[v].slice(2).forEach((x,i)=>{alt[7+i]=x||0;}); }
    else if(st.k==='mid'){ EDU.mid[v].forEach((x,i)=>{alt[13+i]=x||0;}); }
    else if(st.k==='high'){ EDU.high[v].forEach((x,i)=>{alt[16+i]=x||0;}); }
    else {
      const oldLen = (EDU.univ[cur]||[]).length;
      for(let a=19;a<19+oldLen&&a<alt.length;a++) alt[a]-= (EDU.univ[cur][a-19]||0);
      (EDU.univ[v]||[]).forEach((x,i)=>{ if(19+i<alt.length) alt[19+i]+= (x||0); });
    }
  });
  return changed ? alt.map((x,a)=>x-(base[a]||0)) : null;
}
// 奨学金：年齢→受取額
function mgC_schByAge(list){
  const m = {};
  (list||[]).forEach(it=>{
    const amt = +it.amt||0; if(!(amt>0)) return;
    if(it.when==='hsEntry') m[16]=(m[16]||0)+amt;
    else if(it.when==='univEntry') m[19]=(m[19]||0)+amt;
    else if(it.when==='hs'){ for(let a=16;a<=18;a++) m[a]=(m[a]||0)+amt; }
    else if(it.when==='univ'){ const n=Math.max(1,parseInt(it.years)||4); for(let a=19;a<19+n;a++) m[a]=(m[a]||0)+amt; }
  });
  return m;
}
// 計算に渡す（子の並び順＝①家族の並び順）
function mgQA_eduApply(tab){
  mgC_ensureEdu(tab);
  const s = tab.state, kids = mgC_children();
  window._mgEduDelta = kids.map(k=>mgC_eduDelta(k.cid, s.eduPath[k.cid]));
  window._mgScholarAt = kids.map(k=>mgC_schByAge(s.eduSch[k.cid]));
}
function mgQA_eduCard(tab){
  mgC_ensureEdu(tab);
  const s = tab.state, id = tab.id, kids = mgC_children();
  if(!kids.length) return `<div class="mgqa-note">お子様が登録されていません（①家族で追加すると、進路の変更と奨学金を設定できます）</div>`;
  const evIdx = (s.deathYear||1)-1, evYr = mgC_startYear()+evIdx;
  let h = '';
  kids.forEach(k=>{
    const ageEv = k.age + evIdx;
    const path = s.eduPath[k.cid] || {};
    h += `<div class="mgqa-kid"><div class="mgqa-kid-hd">${k.label}<small>（${evYr}年に${ageEv}歳）</small></div>
      <div class="mgqa-lbl2">万が一の後の進路（通常は①家族の進学コース）</div><div class="mgqa-path">`;
    MGC_EDU_STAGES.forEach(st=>{
      const cur = _v(`${st.sel}-${k.cid}`) || (st.k==='univ'?'plit_h':'public');
      const done = ageEv > st.to;
      const v = path[st.k] || '';
      if(done){ h += `<div class="st past"><span>${st.label}</span><b>${MGC_EDU_LABEL[cur]||cur}</b></div>`; return; }
      h += `<div class="st${v&&v!==cur?' ch':''}"><span>${st.label}</span><select data-k="eduPath.${k.cid}.${st.k}">
        <option value="">${MGC_EDU_LABEL[cur]||cur}（変えない）</option>
        ${st.opts.filter(o=>o!==cur).map(o=>`<option value="${o}" ${v===o?'selected':''}>${MGC_EDU_LABEL[o]}</option>`).join('')}
      </select></div>`;
    });
    h += `</div><div class="mgqa-lbl2">奨学金・給付金など（受け取り）</div>`;
    (s.eduSch[k.cid]||[]).forEach((it,i)=>{
      h += `<div class="mgqa-sch"><select data-k="eduSch.${k.cid}.${i}.when">${Object.entries(MGC_SCH_WHEN).map(([w,l])=>`<option value="${w}" ${it.when===w?'selected':''}>${l}</option>`).join('')}</select>
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${it.amt||0}" data-k="eduSch.${k.cid}.${i}.amt"><span class="sl">${it.when==='hs'||it.when==='univ'?'万円/年':'万円'}</span></div>
        ${it.when==='univ'?`<div class="suf"><input class="inp age-inp" type="number" min="1" max="6" value="${it.years||4}" data-k="eduSch.${k.cid}.${i}.years"><span class="sl">年間</span></div>`:'<span></span>'}
        <button type="button" class="x" onclick="mgC_schDel('${id}','${k.cid}',${i})">×</button></div>`;
    });
    h += `<button class="btn-add" onclick="mgC_schAdd('${id}','${k.cid}')">＋ 奨学金を追加</button></div>`;
  });
  h += `<div class="mgqa-cmp" data-cmp="edu"></div>
    <div class="hint">進路は「変えない」が初期値です。変えたい学校段階だけ選びます。奨学金はCF表の収入の「奨学金」に入ります（返済は扱いません）</div>`;
  return h;
}
function mgC_schAdd(tabId, cid){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  mgC_ensureEdu(tab);
  (tab.state.eduSch[cid] = tab.state.eduSch[cid] || []).push({when:'univEntry', amt:0, years:4});
  mgQA_switchTab(tabId);
}
function mgC_schDel(tabId, cid, i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  (tab.state.eduSch[cid]||[]).splice(i,1);
  mgQA_switchTab(tabId);
}
function mgC_fillEduCompare(tab, panel){
  const el = panel.querySelector('[data-cmp="edu"]'); if(!el) return;
  const MR = window.lastMR, R = window.lastR; if(!MR||!R||!R.edu){ el.innerHTML=''; return; }
  const i0 = (tab.state.deathYear||1)-1;
  let a=0,b=0,sch=0;
  (R.edu||[]).forEach((arr,ci)=>{ for(let i=i0;i<arr.length;i++){ a+=arr[i]||0; b+=((MR.edu||[])[ci]||[])[i]||0; } });
  for(let i=i0;i<(MR.scholarship||[]).length;i++) sch += (MR.scholarship[i]||0) - ((R.scholarship||[])[i]||0);
  el.innerHTML = `<div><small>通常の教育費（万が一の後の合計）</small><b>${mgC_man(a)}</b></div><div><small>万が一の後（奨学金を引いた実質）</small><b>${mgC_man(b-sch)}</b></div>`;
}

// ===== ⑧車・駐車場（1枚にまとめる） =====
// state: carRelease {cid:true}（cid='car-N' 将来車 / 'ecar-N' 現有車）、carAdd [{price,first,cycle,insp,endAge}]
//   手放す車は万が一の年に手放し、売却額は0・残りのローンはその年に精算。以後の買替・車検は0
//   駐車場は従来の parkInherit / parkMode / parkMonthly / parkToAge を使う
//   旧データ（carInherit=false の全台入れ替え）はそのまま計算し、カードに案内を出す
function mgC_normalCars(){
  const out = [];
  document.querySelectorAll('#existing-car-list>[id^="ecar-"]').forEach(el=>{
    const n = el.id.replace('ecar-','');
    out.push({cid:'ecar-'+n, label:(document.getElementById(`ecar-${n}-label`)?.value||'').trim()||`現有車${n}`,
      desc:`${el.dataset.type==='used'?'中古':'新車'}${fvd(`ecar-${n}-price`,0)||''}${fvd(`ecar-${n}-price`,0)?'万円':''}・${el.dataset.pay==='loan'?'ローン中':'現金'}`});
  });
  document.querySelectorAll('#car-list>[id^="car-"]').forEach(el=>{
    const n = el.id.replace('car-','');
    if(!/^\d+$/.test(n)) return;
    out.push({cid:'car-'+n, label:(document.getElementById(`car-${n}-label`)?.value||'').trim()||`${n}台目`,
      desc:`${el.dataset.type==='used'?'中古':'新車'}${fvd(`car-${n}-price`,300)}万円・${iv(`car-${n}-cycle`)||7}年ごと買替`});
  });
  return out;
}
// 手放す車の、万が一の年以降のローン支払い（＝精算する残り）
function mgC_carPayoff(cid, i0){
  const bd = (window.lastR||{}).carBd || [];
  let s = 0;
  for(let i=i0;i<bd.length;i++) (bd[i]||[]).forEach(it=>{ if(it.cid===cid && it.type==='loan') s+=it.amount||0; });
  return Math.round(s);
}
function mgQA_carApply(tab){
  const s = tab.state;
  window._mgCars = (s.carInherit===false) ? null : {
    release: Object.keys(s.carRelease||{}).filter(k=>s.carRelease[k]),
    add: (Array.isArray(s.carAdd)?s.carAdd:[]).map(c=>({price:+c.price||0, first:Math.max(1,parseInt(c.first)||1), cycle:Math.max(1,parseInt(c.cycle)||7), insp:+c.insp||0, endAge:parseInt(c.endAge)||0}))
  };
}
function mgQA_carCard(tab){
  const s = tab.state, id = tab.id, p = mgC_survivor(tab);
  const i0 = (s.deathYear||1)-1, evYr = mgC_startYear()+i0;
  let h = '';
  if(s.carInherit===false){
    h += `<div class="mgqa-note">以前の形式の車の設定（全台の入れ替え）が入っています。<button type="button" class="mgqa-linkbtn" onclick="mgC_carReset('${id}')">新しい形式で設定し直す</button></div>`;
  }else{
    const cars = mgC_normalCars();
    h += `<div class="mgqa-lbl2">今の車（通常のCF表の④車）</div>`;
    if(!cars.length) h += `<div class="hint">通常のCF表に車がありません</div>`;
    cars.forEach(c=>{
      const rel = !!(s.carRelease||{})[c.cid];
      const pay = rel ? mgC_carPayoff(c.cid, i0) : 0;
      h += `<div class="mgqa-car${rel?' rel':''}"><div class="t"><b>${mgQA_escHtml(c.label)}</b><small>${mgQA_escHtml(c.desc)}</small></div>
        <div class="mgqa-mini-seg" style="margin:0"><button type="button" class="${rel?'':'on'}" onclick="mgQA_setState('${id}','carRelease.${c.cid}',false,{rebuild:true})">そのまま</button><button type="button" class="${rel?'on':''}" onclick="mgQA_setState('${id}','carRelease.${c.cid}',true,{rebuild:true})">手放す</button></div>
        ${rel?`<div class="n">${evYr}年に手放す（売却額は0で見込む${pay?`・残りのローン ${pay.toLocaleString()}万円を精算`:''}）。以後の買替・車検は0</div>`:''}</div>`;
    });
    h += `<div class="mgqa-lbl2">万が一の後に車を追加</div>`;
    (s.carAdd||[]).forEach((c,i)=>{
      h += `<div class="mgqa-caradd">
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${c.price??200}" data-k="carAdd.${i}.price"><span class="sl">万円</span></div>
        <div class="suf"><input class="inp age-inp" type="number" min="1" max="40" value="${c.first??1}" data-k="carAdd.${i}.first"><span class="sl">年目に購入</span></div>
        <div class="suf"><input class="inp age-inp" type="number" min="1" max="20" value="${c.cycle??8}" data-k="carAdd.${i}.cycle"><span class="sl">年ごと</span></div>
        <div class="suf"><input class="inp" type="number" min="0" value="${c.insp??8}" data-k="carAdd.${i}.insp"><span class="sl">万円/車検</span></div>
        <div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${c.endAge||''}" placeholder="ずっと" data-k="carAdd.${i}.endAge"><span class="sl">歳まで</span></div>
        <button type="button" class="x" onclick="mgC_carAddDel('${id}',${i})">×</button></div>`;
    });
    h += `<button class="btn-add" onclick="mgC_carAddNew('${id}')">＋ 万が一の後に車を追加</button>
      <div class="hint">「何年目」は万が一の年が1年目。年齢は${mgC_name(p)}（遺された方）の年齢です</div>`;
  }
  // 駐車場
  const pm = s.parkInherit!==false ? 'keep' : (s.parkMode==='stop' ? 'none' : 'change');
  const R = window.lastR || {};
  const prkNow = Math.round(((R.prk||[])[i0]||0)/12*10)/10;
  h += `<div class="mgqa-lbl2">駐車場（通常 ${prkNow}万円/月）</div>
    <div class="mgqa-mini-seg"><button type="button" class="${pm==='keep'?'on':''}" onclick="mgC_parkMode('${id}','keep')">通常どおり</button><button type="button" class="${pm==='change'?'on':''}" onclick="mgC_parkMode('${id}','change')">変更</button><button type="button" class="${pm==='none'?'on':''}" onclick="mgC_parkMode('${id}','none')">なし</button></div>`;
  if(pm==='change'){
    h += `<div class="g2"><div class="fg"><label class="lbl">万が一の後</label><div class="suf"><input class="inp amt-inp" type="number" min="0" step="0.1" value="${s.parkMonthly??1.5}" data-k="parkMonthly" data-cf-row="prk"><span class="sl">万円/月</span></div></div>
      <div class="fg"><label class="lbl">いつまで</label><div class="suf"><input class="inp age-inp" type="number" min="0" max="100" value="${s.parkToAge||''}" placeholder="ずっと" data-k="parkToAge" data-cf-row="prk"><span class="sl">歳まで（${mgC_name(p)}）</span></div></div></div>`;
  }
  h += `<div class="mgqa-cmp" data-cmp="car"></div><div class="hint">万が一の前の年は通常のCF表と同じです</div>`;
  return h;
}
function mgC_carReset(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.carInherit = true; tab.state.mgExistingCars = []; tab.state.mgFutureCars = [];
  mgQA_switchTab(tabId);
}
function mgC_carAddNew(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  (tab.state.carAdd = tab.state.carAdd || []).push({price:200, first:1, cycle:8, insp:8, endAge:''});
  mgQA_switchTab(tabId);
}
function mgC_carAddDel(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  (tab.state.carAdd||[]).splice(i,1);
  mgQA_switchTab(tabId);
}
function mgC_parkMode(tabId, m){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const s = tab.state;
  if(m==='keep'){ s.parkInherit = true; }
  else { s.parkInherit = false; s.parkMode = m==='none' ? 'stop' : 'keep'; }
  mgQA_switchTab(tabId);
}
function mgC_fillCarCompare(tab, panel){
  const el = panel.querySelector('[data-cmp="car"]'); if(!el) return;
  const MR = window.lastMR, R = window.lastR; if(!MR||!R){ el.innerHTML=''; return; }
  const i0 = (tab.state.deathYear||1)-1;
  let a=0,b=0;
  for(let i=i0;i<(R.carTotal||[]).length;i++){ a+=(R.carTotal[i]||0)+((R.prk||[])[i]||0); b+=((MR.carTotal||[])[i]||0)+((MR.prk||[])[i]||0); }
  el.innerHTML = `<div><small>通常の車・駐車場（万が一の後の合計）</small><b>${mgC_man(a)}</b></div><div><small>万が一の後</small><b>${mgC_man(b)}</b></div>`;
}

function mgC_bool(v){ return v===true || v==='true'; }
// ===== 障害タブ（障害1級・2級） =====
// state（障害タブのみ）:
//   selfMode 'none'(働けない)|'pct'(％で減らす)|'steps'(期間ごと)、selfPct（減らす％）、selfSteps [{ageFrom,ageTo,amt}]、selfBasis 'net'|'gross'
//   selfRetire 'onset'(障害になった年に受取)|'normal'(通常どおり定年)
//   disPenMode 'auto'|'manual'、disPenManual、pensionType 'kosei'|'kokumin'
//   disDansin 'clear'|'keep'、stopIns（保険料を止める）、stopInv（積立投資を止める）
//   生活費は lcMode 'ratio' の lcRatio（1級130%／2級110%＝介護・医療費の上乗せ）
function mgC_isDis(tab){ return tab.kind==='dis1' || tab.kind==='dis2'; }
// 種類ごとの初期値（新しく追加したタブだけに入れる）
function mgQA_applyKindDefaults(tab){
  const s = tab.state;
  if(!mgC_isDis(tab)) return;
  const g1 = tab.kind==='dis1';
  Object.assign(s, {
    selfMode: g1 ? 'none' : 'pct', selfPct: 50, selfSteps: [], selfBasis:'net',
    selfRetire: g1 ? 'onset' : 'normal',
    disPenMode:'auto', disPenManual:0, pensionType:'kosei',
    disDansin: g1 ? 'clear' : 'keep', stopIns:false, stopInv:false,
    lcMode:'ratio', lcRatio: g1 ? 130 : 110,
    insurances: [], incomeMode:'same', houseAfter:'stay'
  });
}
// ご本人の収入（障害の後）。null＝通常どおり
function mgQA_selfIncFn(tab){
  const s = tab.state, p = tab.target;
  const m = s.selfMode || 'none';
  if(m==='none') return ()=>0;
  if(m==='pct') return (age, base) => Math.round((base||0)*(1-(+s.selfPct||0)/100));
  const gross = s.selfBasis==='gross';
  const steps = (Array.isArray(s.selfSteps)?s.selfSteps:[]).filter(x=>x&&x.ageTo>=x.ageFrom);
  return age => { const st = steps.find(x=>age>=x.ageFrom&&age<=x.ageTo); if(!st) return 0; return gross ? mgC_g2n(p,+st.amt||0,age) : Math.round(+st.amt||0); };
}
// 傷病手当金（③収入の年収・ボーナスから）。会社員・公務員で厚生年金の方のみ
function mgC_sick(tab){
  const p = tab.target, s = tab.state;
  const age = mgC_ageAtEvent(tab, p);
  const wt = (typeof isGrossInputMode==='function' && isGrossInputMode(p)) ? getWorkType(p) : 'kaishain';
  const ok = s.pensionType!=='kokumin' && wt!=='part' && (typeof sickBenefitAt==='function');
  if(!ok) return {ok:false, reason: s.pensionType==='kokumin' ? '国民年金のみ（自営業など）の方は傷病手当金がありません' : '扶養内パートの方は傷病手当金がありません'};
  const sb = sickBenefitAt(p, age);
  if(!(sb.gross>0)) return {ok:false, reason:'障害になった年の収入がないため、傷病手当金はありません'};
  return {ok:true, ...sb, age, blank: isBonusBlank(p)};
}
function mgQA_disApply(tab){
  const s = tab.state;
  window._mgKind = tab.kind || 'death';
  if(!mgC_isDis(tab)){ window._mgDisCfg = null; window._mgSelfIncFn = null; return; }
  const sk = mgC_sick(tab);
  window._mgDisCfg = {
    retire: s.selfRetire==='onset' ? 'onset' : 'normal',
    penMode: s.disPenMode==='manual' ? 'manual' : 'auto', penManual: +s.disPenManual||0,
    sickOn: !!sk.ok, sickAnnual: sk.ok ? sk.annual : 0,
    stopIns: mgC_bool(s.stopIns), stopInv: mgC_bool(s.stopInv)
  };
  window._mgSelfIncFn = mgQA_selfIncFn(tab);
}

function mgQA_selfCard(tab){
  const s = tab.state, id = tab.id, p = tab.target;
  const m = s.selfMode || 'none';
  const ev = mgC_ageAtEvent(tab, p), evYr = mgC_startYear() + (s.deathYear||1) - 1;
  let h = `<div class="mgqa-lbl2">障害になった後の働き方</div>${mgC_seg(id,'selfMode',[['none','働けない'],['pct','％で減らす'],['steps','期間ごと']],m)}`;
  if(m==='none') h += `<div class="mgqa-note">${evYr}年から${mgC_name(p)}の収入は0です</div>`;
  else if(m==='pct'){
    h += `<div class="g2"><div class="fg"><label class="lbl">通常の収入から</label><div class="suf"><input class="inp" type="number" min="0" max="100" value="${s.selfPct??50}" data-k="selfPct"><span class="sl">％ 減らす</span></div></div><div></div></div>
      <div class="mgqa-quick">${[30,50,70].map(v=>`<button type="button" class="${v===+s.selfPct?'on':''}" onclick="mgQA_setState('${id}','selfPct',${v},{rebuild:true})">−${v}%</button>`).join('')}</div>`;
  }else{
    const steps = Array.isArray(s.selfSteps) ? s.selfSteps : [];
    h += `<div class="fg"><label class="lbl">金額の入力</label>${mgC_seg(id,'selfBasis',[['net','手取り'],['gross','額面']], s.selfBasis==='gross'?'gross':'net')}</div><div class="mgqa-rows">`;
    steps.forEach((st,i)=>{
      h += `<div class="mgqa-row"><div class="suf"><input class="inp age-inp" type="number" value="${st.ageFrom}" data-k="selfSteps.${i}.ageFrom"><span class="sl">歳</span></div><span class="tl">〜</span>
        <div class="suf"><input class="inp age-inp" type="number" value="${st.ageTo}" data-k="selfSteps.${i}.ageTo"><span class="sl">歳</span></div>
        <div class="suf"><input class="inp amt-inp" type="number" min="0" value="${st.amt||0}" data-k="selfSteps.${i}.amt"><span class="sl">万円</span></div>
        <button type="button" class="x" onclick="mgC_selfStepDel('${id}',${i})">×</button></div>`;
    });
    h += `</div><button class="btn-add" onclick="mgC_selfStepAdd('${id}')">＋ 期間を追加</button><div class="hint">期間に入らない年は収入0です</div>`;
  }
  const sk = mgC_sick(tab);
  if(sk.ok) h += `<div class="hint">傷病手当金を受け取る1年6か月は休職として収入0（2年目は半分）で計算します</div>`;
  h += `<div class="mgqa-lbl2">退職金</div>${mgC_seg(id,'selfRetire',[['onset','障害になった年に受取'],['normal','通常どおり定年']], s.selfRetire==='onset'?'onset':'normal')}
    <div class="hint">${s.selfRetire==='onset'?'障害になった年に退職したとして、勤続年数の割合で受け取ります':'通常のCF表と同じ年に受け取ります'}</div>`;
  return h;
}
function mgC_selfStepAdd(tabId){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  const rows = tab.state.selfSteps = tab.state.selfSteps || [];
  const last = rows[rows.length-1];
  const from = last ? +last.ageTo+1 : mgC_ageAtEvent(tab, tab.target);
  rows.push({ageFrom:from, ageTo:from+9, amt:0});
  mgQA_switchTab(tabId);
}
function mgC_selfStepDel(tabId,i){
  const tab = mgQA_tabs.find(t=>t.id===tabId); if(!tab) return;
  tab.state.selfSteps.splice(i,1);
  mgQA_switchTab(tabId);
}
function mgQA_sickCard(tab){
  const sk = mgC_sick(tab), p = tab.target;
  if(!sk.ok) return `<div class="mgqa-note">${sk.reason}</div>`;
  const evYr = mgC_startYear() + (tab.state.deathYear||1) - 1;
  const f = x=>(Math.round(x*10)/10).toLocaleString();
  let h = '';
  if(sk.blank) h += `<div class="mgqa-auto ng"><span class="ic">!</span><div><b>③収入のボーナスが未入力のため、ボーナス0円で計算しています</b><small>年収${f(sk.gross)}万円÷12＝月給${f(sk.monthly)}万円。実際より多めの可能性があります</small></div></div>`;
  h += `<div class="mgqa-note">${evYr}年の年収（額面）${f(sk.gross)}万円・うちボーナス ${f(sk.bonus)}万円（③収入）→ 月給 <b>${f(sk.monthly)}万円</b> → 標準報酬月額 <b>${sk.hyojun}万円</b> → 1日 <b>${sk.daily.toLocaleString()}円</b>
    <br><button type="button" class="mgqa-linkbtn" onclick="mgC_gotoBonus('${p}')">③収入で${sk.blank?'入力':'変更'}</button></div>
    <div class="mgqa-tl"><div class="r h"><span>期間</span><span>金額</span></div>
      <div class="r"><span class="p">${evYr}年</span><span class="a">${f(sk.annual)}万円</span></div>
      <div class="r"><span class="p">${evYr+1}年（6か月）</span><span class="a">${f(sk.annual/2)}万円</span></div></div>
    <div class="hint">給与（ボーナスを除く）の約3分の2を最長1年6か月。非課税なのでそのまま収入に入ります</div>`;
  return h;
}
function mgC_gotoBonus(p){
  const box = document.getElementById(`${p}-bonus-box`); if(!box) return;
  const sb = box.closest('.sb'); const sec = box.closest('.sec');
  if(sb && getComputedStyle(sb).display==='none' && sec) sec.querySelector('.sh')?.click();
  setTimeout(()=>{ box.scrollIntoView({behavior:'smooth', block:'center'}); document.getElementById(`${p}-bonus-amt`)?.focus(); }, 150);
}
function mgQA_disPenCard(tab){
  const s = tab.state, id = tab.id, p = tab.target;
  const g1 = tab.kind==='dis1';
  let h = `<div class="g2">
      <div class="fg"><label class="lbl">計算方法</label>${mgC_seg(id,'disPenMode',[['auto','自動計算'],['manual','手入力']], s.disPenMode==='manual'?'manual':'auto')}</div>
      <div class="fg"><label class="lbl">加入していた年金</label>${mgC_seg(id,'pensionType',[['kosei','厚生年金'],['kokumin','国民年金のみ']], s.pensionType==='kokumin'?'kokumin':'kosei')}</div>
    </div>`;
  if(s.disPenMode==='manual') h += `<div class="fg"><label class="lbl">障害年金（年額・手入力）</label><div class="suf"><input class="inp amt-inp" type="number" min="0" value="${s.disPenManual||0}" data-k="disPenManual"><span class="sl">万円/年</span></div></div>`;
  h += `<div class="mgqa-dis-tbl">${mgC_disPenTable(tab)}</div>
    <div class="hint">障害認定日（発生から1年6か月後）から支給。非課税。${g1?'1級は2級の1.25倍。':''}障害基礎＋子の加算${s.pensionType==='kokumin'?'':'＋障害厚生（300月みなし）＋配偶者加給'}。65歳以降は老齢年金と多いほうを自動で選びます（年金シミュレーターと同じ計算ルール・令和8年度）</div>`;
  return h;
}
function mgC_disPenTable(tab){
  const MR = window.lastMR;
  if(!MR || !Array.isArray(MR.disPension) || window._mgQA_activeTabId!==tab.id) return '';
  const ages = tab.target==='h' ? MR.hA : MR.wA;
  const i0 = (tab.state.deathYear||1)-1;
  const rows = [];
  for(let i=i0;i<MR.disPension.length;i++){
    const v = Math.round(MR.disPension[i]||0), last = rows[rows.length-1];
    if(last && last.v===v) last.to = ages[i]; else rows.push({from:ages[i], to:ages[i], v});
  }
  const shown = rows.filter(r=>r.v>0);
  if(!shown.length) return '<div class="hint" style="margin-top:6px">障害年金はありません</div>';
  return `<div class="mgqa-tl"><div class="r h"><span>期間（${mgC_name(tab.target)}の年齢）</span><span>年額</span></div>${
    shown.slice(0,8).map(r=>`<div class="r"><span class="p">${r.from===r.to?r.from+'歳':`${r.from}〜${r.to}歳`}</span><span class="a">${r.v.toLocaleString()}万円</span></div>`).join('')}</div>`;
}
function mgQA_stopsCard(tab){
  const s = tab.state, id = tab.id;
  return `<div class="g2">
      <div class="fg"><label class="lbl">保険料</label>${mgC_seg(id,'stopIns',[['false','続ける'],['true','止める（払込免除）']], String(mgC_bool(s.stopIns)))}</div>
      <div class="fg"><label class="lbl">積立投資</label>${mgC_seg(id,'stopInv',[['false','続ける'],['true','止める']], String(mgC_bool(s.stopInv)))}</div>
    </div><div class="hint">払込免除の有無は保険ごとに違うため、初期値は「続ける」です。止めるとご本人の分だけ止まります</div>`;
}
// 障害タブの住まい：団信は選ぶ（一般団信は高度障害が対象のため、初期値 1級=完済／2級=残る）
function mgQA_disHouseTop(tab){
  const s = tab.state, id = tab.id;
  const v = s.disDansin==='clear' ? 'clear' : 'keep';
  return `<div class="mgqa-step"><span class="no">1</span>障害のときの住宅ローン</div>
    ${mgC_seg(id,'disDansin',[['clear','団信で完済'],['keep','ローンが残る']], v)}
    <div class="hint">一般団信は「高度障害」の状態が対象です。障害1級でも対象にならない場合があるため、ここで選べます。⑤住宅で一般団信に加入していない場合は完済になりません</div>`;
}
