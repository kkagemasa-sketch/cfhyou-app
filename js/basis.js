// basis.js — 計算根拠タブ描画
// 6項目: 遺族年金 / 老齢年金 / 退職金手取り / 住宅ローン控除 / 教育費 / iDeCo・DC節税

function renderBasisTab(){
  const rb=$('right-body');
  if(!rb)return;
  const hAge=iv('husband-age')||30, wAge=iv('wife-age')||29;
  const retAge=iv('retire-age')||65, wRetAge=iv('w-retire-age')||60;
  const pHStart=iv('pension-h-start')||22, pWStart=iv('pension-w-start')||22;
  const KISO_FULL=81.6;
  const nm=_v('client-name')||'お客様';

  let h='<div class="r-summary" style="margin-top:16px;border-top:3px solid #6366f1;padding-top:14px">';
  h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">';
  h+='<span style="background:#6366f1;color:#fff;padding:5px 14px;border-radius:99px;font-size:13px;font-weight:700">📐 計算根拠</span>';
  h+=`<span style="font-size:13px;font-weight:600;color:#1e3a5f">${nm} 様 ─ CF表の主要項目の算出根拠</span>`;
  h+='</div>';

  // ===== 1. 老齢年金 =====
  h+=_basisPension(hAge,wAge,retAge,wRetAge,pHStart,pWStart,KISO_FULL);

  // ===== 2. 遺族年金 =====
  h+=_basisSurvivorPension(hAge,wAge,retAge,wRetAge,pHStart,pWStart,KISO_FULL);

  // ===== 3. 退職金の手取り =====
  h+=_basisRetirePay(retAge,wRetAge,pHStart,pWStart);

  // ===== 4. 住宅ローン控除 =====
  h+=_basisLoanCtrl();

  // ===== 5. 教育費のコース別積算 =====
  h+=_basisEducation();

  // ===== 6. iDeCo/DC節税効果 =====
  h+=_basisDCTax(hAge,wAge,retAge,wRetAge);

  h+='</div>';
  rb.innerHTML=h;
}

// ── ヘルパー ──
function _bCard(icon,title,body,refLinks){
  let r='<div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;margin-bottom:10px;overflow:hidden">';
  r+=`<div style="background:#f8fafc;padding:8px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.parentElement.querySelector('.b-body').classList.toggle('col')">`;
  r+=`<span style="font-size:15px">${icon}</span>`;
  r+=`<span style="font-size:13px;font-weight:700;color:#1e3a5f;flex:1">${title}</span>`;
  r+='<span style="font-size:10px;color:#94a3b8">▼</span>';
  r+='</div>';
  r+=`<div class="b-body" style="padding:12px 16px;font-size:12px;line-height:1.7">`;
  r+=body;
  if(refLinks&&refLinks.length>0){
    r+='<div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9">';
    r+='<div style="font-size:10px;color:#94a3b8;font-weight:600;margin-bottom:4px">📚 根拠・参考</div>';
    refLinks.forEach(l=>{
      r+=`<div style="font-size:10px"><a href="${l.url}" target="_blank" rel="noopener" style="color:#6366f1;text-decoration:none">${l.label}</a></div>`;
    });
    r+='</div>';
  }
  r+='</div></div>';
  return r;
}

function _bFormula(formula,subst,result){
  let r='<div style="background:#f0f4ff;border-radius:6px;padding:8px 12px;margin:6px 0;font-family:\'Cascadia Code\',\'Consolas\',monospace;font-size:11px">';
  r+=`<div style="color:#6366f1;font-weight:600">${formula}</div>`;
  if(subst)r+=`<div style="color:#475569;margin-top:2px">= ${subst}</div>`;
  r+=`<div style="color:#0f172a;font-weight:700;margin-top:2px">= ${result}</div>`;
  r+='</div>';
  return r;
}

function _bRow(label,value,unit){
  return `<div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#64748b">${label}</span><strong style="color:#1e3a5f">${value}<span style="font-weight:400;font-size:10px;margin-left:2px">${unit||''}</span></strong></div>`;
}

function _bNote(text){
  return `<div style="font-size:10px;color:#94a3b8;margin-top:4px;padding:4px 8px;background:#fafafa;border-radius:4px">💡 ${text}</div>`;
}

function _bSub(title){
  return `<div style="font-size:11px;font-weight:700;color:#334155;margin:10px 0 4px;padding-bottom:2px;border-bottom:1px solid #e2e8f0">${title}</div>`;
}

// ===== 1. 老齢年金 =====
function _basisPension(hAge,wAge,retAge,wRetAge,pHStart,pWStart,KISO_FULL){
  const pSelf=$('pension-h')?.value===''?0:(fv('pension-h')||186);
  const pWife=$('pension-w')?.value===''?0:(fv('pension-w')||66);
  const pHReceive=iv('pension-h-receive')||65;
  const pWReceive=iv('pension-w-receive')||65;
  const kisoH=ri(KISO_FULL*Math.min(retAge-pHStart,40)/40);
  const kisoW=ri(KISO_FULL*Math.min(wRetAge-pWStart,40)/40);
  const koseiH=calcKosei('h',pHStart,retAge,pSelf,kisoH);
  const koseiW=calcKosei('w',pWStart,wRetAge,pWife,kisoW);

  let b='';
  // ご主人
  b+=_bSub('👔 ご主人様');
  b+=_bRow('年金受給開始',pHReceive+'歳','');
  b+=_bRow('老齢基礎年金（概算）',kisoH.toLocaleString(),'万円/年');
  const hJoinYrs=Math.min(retAge-pHStart,40);
  b+=_bFormula(
    '老齢基礎年金 = 81.6万 × 加入年数 / 40年',
    `81.6 × ${hJoinYrs} / 40`,
    kisoH.toLocaleString()+' 万円/年'
  );
  b+=_bRow('老齢厚生年金（概算）',Math.round(koseiH).toLocaleString(),'万円/年');
  // 厚生年金の計算根拠
  const avgH=calcAvgHyojun('h',pHStart,retAge);
  const joinMH=Math.min(480,Math.max((retAge-pHStart)*12,300));
  if(avgH!==null){
    b+=_bFormula(
      '老齢厚生年金 = 平均標準報酬月額 × 5.481/1000 × 加入月数',
      `${Math.round(avgH*10)/10}万 × 5.481/1000 × ${joinMH}月`,
      Math.round(koseiH).toLocaleString()+' 万円/年'
    );
  }else{
    const gMH=fv('h-gross-monthly')||0, gBH=fv('h-gross-bonus')||0;
    if(gMH>0){
      const hyojunH=(Math.min(gMH,65)*12+Math.min(gBH,300))/12*0.75;
      b+=_bFormula(
        '報酬比例部分 = 平均標準報酬 × 5.481/1000 × 加入月数',
        `${Math.round(hyojunH*10)/10}万 × 5.481/1000 × ${joinMH}月`,
        Math.round(koseiH).toLocaleString()+' 万円/年'
      );
    }else{
      b+=_bNote('年金入力額('+pSelf+'万) − 基礎年金('+kisoH+'万) = 厚生年金('+Math.round(koseiH)+'万)で概算');
    }
  }
  b+=_bRow('合計年金額',pSelf.toLocaleString(),'万円/年');

  // 奥様
  b+=_bSub('👗 奥様');
  b+=_bRow('年金受給開始',pWReceive+'歳','');
  b+=_bRow('老齢基礎年金（概算）',kisoW.toLocaleString(),'万円/年');
  const wJoinYrs=Math.min(wRetAge-pWStart,40);
  b+=_bFormula(
    '老齢基礎年金 = 81.6万 × 加入年数 / 40年',
    `81.6 × ${wJoinYrs} / 40`,
    kisoW.toLocaleString()+' 万円/年'
  );
  b+=_bRow('老齢厚生年金（概算）',Math.round(koseiW).toLocaleString(),'万円/年');
  b+=_bRow('合計年金額',pWife.toLocaleString(),'万円/年');

  return _bCard('🏛️','老齢年金（基礎＋厚生）',b,[
    {label:'日本年金機構 — 老齢基礎年金の受給要件・支給開始時期・年金額',url:'https://www.nenkin.go.jp/service/jukyu/roureinenkin/jukyu-yoken/20150401-01.html'},
    {label:'日本年金機構 — 老齢厚生年金の受給要件・支給開始時期・年金額',url:'https://www.nenkin.go.jp/service/jukyu/roureinenkin/jukyu-yoken/20140421-01.html'}
  ]);
}

// ===== 2. 遺族年金 =====
function _basisSurvivorPension(hAge,wAge,retAge,wRetAge,pHStart,pWStart,KISO_FULL){
  const kisoH=ri(KISO_FULL*Math.min(retAge-pHStart,40)/40);
  const kisoW=ri(KISO_FULL*Math.min(wRetAge-pWStart,40)/40);
  const koseiH=calcKosei('h',pHStart,retAge,fv('pension-h')||186,kisoH);
  const koseiW=calcKosei('w',pWStart,wRetAge,fv('pension-w')||66,kisoW);
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{children.push(parseInt(el.value)||0);});
  const childCount=children.length;

  let b='';
  b+=_bNote('遺族年金は万が一CF表で使用される項目です。死亡時点の状況に応じて金額が変動します。');

  // ご主人死亡時
  b+=_bSub('👔 ご主人様が死亡した場合（奥様が受給）');
  // 遺族基礎年金
  b+='<div style="font-size:11px;font-weight:600;color:#475569;margin:6px 0 2px">遺族基礎年金</div>';
  if(childCount>0){
    const kiso1=calcKiso(childCount);
    const childCalc=childCount<=2?'23.48×'+childCount:(childCount>2?'23.48×2 + 7.83×'+(childCount-2):'');
    b+=_bFormula(
      '遺族基礎年金 = 81.6万 + 子の加算',
      `81.6 + ${childCalc}`,
      kiso1.toLocaleString()+' 万円/年'
    );
    b+=_bNote('子が18歳年度末を超えると加算対象外（金額は年々変動）');
  }else{
    b+=_bNote('18歳未満の子がいない場合、遺族基礎年金は支給されません');
  }

  // 遺族厚生年金
  b+='<div style="font-size:11px;font-weight:600;color:#475569;margin:6px 0 2px">遺族厚生年金</div>';
  const survKosei=ri(koseiH*0.75);
  b+=_bFormula(
    '遺族厚生年金 = 死亡者の老齢厚生年金 × 3/4',
    `${Math.round(koseiH)} × 0.75`,
    survKosei.toLocaleString()+' 万円/年'
  );

  // 中高齢寡婦加算
  b+='<div style="font-size:11px;font-weight:600;color:#475569;margin:6px 0 2px">中高齢寡婦加算</div>';
  b+=_bFormula(
    '中高齢寡婦加算 = 61.43万円/年',
    '条件: 子なし ＋ 妻40〜65歳',
    '条件を満たす期間に加算'
  );

  // 差額方式
  b+='<div style="font-size:11px;font-weight:600;color:#475569;margin:6px 0 2px">65歳以降の差額方式</div>';
  const diff=Math.max(0,ri(koseiH*0.75)-Math.round(koseiW));
  b+=_bFormula(
    '差額 = 遺族厚生年金 − 奥様の老齢厚生年金',
    `${survKosei} − ${Math.round(koseiW)}`,
    diff.toLocaleString()+' 万円/年（差額のみ支給）'
  );

  // 奥様死亡時
  b+=_bSub('👗 奥様が死亡した場合（ご主人様が受給）');
  const survKoseiW=ri(koseiW*0.75);
  b+=_bFormula(
    '遺族厚生年金 = 奥様の老齢厚生年金 × 3/4',
    `${Math.round(koseiW)} × 0.75`,
    survKoseiW.toLocaleString()+' 万円/年'
  );
  b+=_bNote('夫の受給: 子がいるか、55歳以上かつ年収850万未満が条件（支給は60歳から）');

  return _bCard('🛡️','遺族年金（基礎＋厚生＋中高齢寡婦加算）',b,[
    {label:'日本年金機構 — 遺族基礎年金の受給要件',url:'https://www.nenkin.go.jp/service/jukyu/izokunenkin/jukyu-yoken/20150401-04.html'},
    {label:'日本年金機構 — 遺族厚生年金の受給要件',url:'https://www.nenkin.go.jp/service/jukyu/izokunenkin/jukyu-yoken/20150401-03.html'}
  ]);
}

// ===== 3. 退職金の手取り =====
function _basisRetirePay(retAge,wRetAge,pHStart,pWStart){
  const retPay=fv('retire-pay')||0;
  const wRetPay=fv('w-retire-pay')||0;
  let b='';

  const calcRetireNet=(grossPay,joinYrs,label)=>{
    if(grossPay<=0)return `<div style="color:#94a3b8;font-size:11px">${label}：退職金の入力なし</div>`;
    let s='';
    // 退職所得控除
    const ctrl=joinYrs<=20?40*joinYrs:800+70*(joinYrs-20);
    s+=_bFormula(
      joinYrs<=20?'退職所得控除 = 40万 × 勤続年数':'退職所得控除 = 800万 + 70万 × (勤続年数 − 20)',
      joinYrs<=20?`40 × ${joinYrs}`:`800 + 70 × (${joinYrs} − 20)`,
      ctrl.toLocaleString()+' 万円'
    );
    // 退職所得
    const taxableRet=Math.max(0,Math.round((grossPay-ctrl)/2*10)/10);
    s+=_bFormula(
      '退職所得 = (退職金 − 控除額) × 1/2',
      `(${grossPay.toLocaleString()} − ${ctrl.toLocaleString()}) × 1/2`,
      taxableRet.toLocaleString()+' 万円'
    );
    // 税率概算
    let taxRate=0.05, deductAmt=0;
    if(taxableRet<=195){taxRate=0.05;deductAmt=0;}
    else if(taxableRet<=330){taxRate=0.10;deductAmt=9.75;}
    else if(taxableRet<=695){taxRate=0.20;deductAmt=42.75;}
    else if(taxableRet<=900){taxRate=0.23;deductAmt=63.6;}
    else if(taxableRet<=1800){taxRate=0.33;deductAmt=153.6;}
    else if(taxableRet<=4000){taxRate=0.40;deductAmt=279.6;}
    else{taxRate=0.45;deductAmt=479.6;}
    const incomeTax=Math.round((taxableRet*taxRate-deductAmt)*1.021*10)/10;
    const residentTax=Math.round(taxableRet*0.1*10)/10;
    const totalTax=Math.max(0,Math.round((incomeTax+residentTax)*10)/10);
    const netPay=Math.round((grossPay-totalTax)*10)/10;
    s+=_bRow('所得税（税率'+Math.round(taxRate*100)+'%）',Math.max(0,incomeTax).toLocaleString(),'万円');
    s+=_bRow('住民税（10%）',residentTax.toLocaleString(),'万円');
    s+=_bRow('税金合計',totalTax.toLocaleString(),'万円');
    s+=`<div style="margin-top:6px;padding:6px 10px;background:#ecfdf5;border-radius:6px;display:flex;justify-content:space-between">`;
    s+=`<span style="font-weight:700;color:#059669">手取り概算</span>`;
    s+=`<strong style="font-size:14px;color:#059669">${Math.max(0,netPay).toLocaleString()} 万円</strong></div>`;
    s+=_bNote('CF表に入力されている退職金額はそのまま計上されます。この概算は参考値です。');
    return s;
  };

  const hJoinYrs=Math.max(1,retAge-(pHStart));
  const wJoinYrs=Math.max(1,wRetAge-(pWStart));

  b+=_bSub('👔 ご主人様');
  b+=_bRow('退職金（入力額）',retPay>0?retPay.toLocaleString()+'万円':'未入力','');
  b+=_bRow('勤続年数（概算）',hJoinYrs+'年','');
  b+=calcRetireNet(retPay,hJoinYrs,'ご主人様');

  b+=_bSub('👗 奥様');
  b+=_bRow('退職金（入力額）',wRetPay>0?wRetPay.toLocaleString()+'万円':'未入力','');
  b+=_bRow('勤続年数（概算）',wJoinYrs+'年','');
  b+=calcRetireNet(wRetPay,wJoinYrs,'奥様');

  return _bCard('💰','退職金の手取り概算',b,[
    {label:'国税庁 — 退職金と税',url:'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1420.htm'},
    {label:'国税庁 — 退職所得控除額の計算方法',url:'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1426.htm'}
  ]);
}

// ===== 4. 住宅ローン控除 =====
function _basisLoanCtrl(){
  const lctrlYear=parseInt(document.getElementById('lctrl-year')?.value)||2025;
  const lctrlType=document.getElementById('lctrl-type')?.value||'new_eco';
  const lctrlHH=document.getElementById('lctrl-household')?.value||'general';
  const isKosodate=lctrlHH==='kosodate';
  const lctrlRow=getLCtrlRow(lctrlYear,lctrlType,isKosodate);
  const lctrlLimit=lctrlRow[0], lctrlYrs=lctrlRow[1];
  const loanAmt=fv('loan-amt')||0;

  const typeLabels={new_long:'認定長期優良住宅',new_zeh:'ZEH水準省エネ住宅',new_eco:'省エネ基準適合住宅',new_general:'その他の新築',used_eco:'買取再販・既存(省エネ)',used_other:'その他の既存住宅'};

  let b='';
  b+=_bRow('入居年',lctrlYear+'年','');
  b+=_bRow('住宅タイプ',typeLabels[lctrlType]||lctrlType,'');
  b+=_bRow('世帯区分',isKosodate?'子育て・若者夫婦':'一般','');
  b+=_bRow('借入限度額',lctrlLimit>0?lctrlLimit.toLocaleString()+'万円':'対象外','');
  b+=_bRow('控除期間',lctrlYrs>0?lctrlYrs+'年':'なし','');

  if(lctrlLimit>0&&lctrlYrs>0){
    b+=_bFormula(
      '年間控除額 = min(年末ローン残高, 借入限度額) × 0.7%',
      `min(残高, ${lctrlLimit.toLocaleString()}) × 0.007`,
      '最大 '+Math.round(lctrlLimit*0.007*10)/10+' 万円/年'
    );
    const maxTotal=Math.round(lctrlLimit*0.007*lctrlYrs*10)/10;
    b+=_bRow('最大控除総額（上限）',maxTotal.toLocaleString(),'万円');
    b+=_bNote('実際の控除額は、所得税＋住民税（課税所得×5%、上限9.75万）が上限になります');

    // 初年度のローン残高ベースの控除概算
    if(loanAmt>0){
      const cappedBal=Math.min(loanAmt,lctrlLimit);
      const yr1=Math.round(cappedBal*0.007*10)/10;
      b+=_bSub('初年度の控除概算');
      b+=_bFormula(
        `min(${loanAmt.toLocaleString()}, ${lctrlLimit.toLocaleString()}) × 0.7%`,
        `${cappedBal.toLocaleString()} × 0.007`,
        yr1+' 万円'
      );
    }
  }else{
    b+=_bNote('選択された住宅タイプ・入居年では住宅ローン控除の対象外です');
  }

  return _bCard('🏠','住宅ローン控除',b,[
    {label:'国税庁 — 住宅借入金等特別控除',url:'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1211-1.htm'},
    {label:'国土交通省 — 住宅ローン減税制度について',url:'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk2_000017.html'}
  ]);
}

// ===== 5. 教育費 =====
function _basisEducation(){
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{
    const cid=el.id.split('-')[1];
    children.push({id:parseInt(cid),age:parseInt(el.value)||0});
  });
  if(children.length===0)return _bCard('🎓','教育費のコース別積算','<div style="color:#94a3b8">お子様の情報が入力されていません</div>',[]);

  const cLbls=['第一子','第二子','第三子','第四子'];
  const stageLabels={public:'公立',private:'私立'};
  const univLabels={nat_h:'国立(自宅)',nat_b:'国立(下宿)',plit_h:'私立文系(自宅)',plit_b:'私立文系(下宿)',psci_h:'私立理系(自宅)',psci_b:'私立理系(下宿)',med_h:'私立医歯薬(自宅)',med_b:'私立医歯薬(下宿)',senmon_h:'専門学校(自宅)',senmon_b:'専門学校(下宿)',none:'進学なし'};

  let b='';
  children.forEach((c,idx)=>{
    const ci=c.id;
    b+=_bSub(`${cLbls[idx]}（現在${c.age}歳）`);
    const el=_v(`ce-${ci}`)||'public';
    const mi=_v(`cm-${ci}`)||'public';
    const hi=_v(`ch-${ci}`)||'public';
    const un=_v(`cu-${ci}`)||'plit_h';

    // コース
    b+=_bRow('小学校',stageLabels[el]||el,'');
    b+=_bRow('中学校',stageLabels[mi]||mi,'');
    b+=_bRow('高校',stageLabels[hi]||hi,'');
    b+=_bRow('大学等',univLabels[un]||un,'');

    // 積算
    const costs=typeof eduCosts==='function'?eduCosts(ci):[];
    const hoikuTotal=costs.slice(0,7).reduce((a,v)=>a+v,0);
    const elemTotal=(EDU.elem[el]||EDU.elem.public).slice(2).reduce((a,v)=>a+v,0);
    const midTotal=(EDU.mid[mi]||EDU.mid.public).reduce((a,v)=>a+v,0);
    const highTotal=(EDU.high[hi]||EDU.high.public).reduce((a,v)=>a+v,0);
    const univArr=un!=='none'?(EDU.univ[un]||[]):[];
    const univTotal=univArr.reduce((a,v)=>a+v,0);
    const grandTotal=hoikuTotal+elemTotal+midTotal+highTotal+univTotal;

    if(hoikuTotal>0)b+=_bRow('保育園/幼稚園（0〜6歳）',hoikuTotal.toLocaleString(),'万円');
    b+=_bRow('小学校（7〜12歳）',elemTotal.toLocaleString(),'万円');
    b+=_bRow('中学校（13〜15歳）',midTotal.toLocaleString(),'万円');
    b+=_bRow('高校（16〜18歳）',highTotal.toLocaleString(),'万円');
    if(univTotal>0)b+=_bRow('大学等（19歳〜）',univTotal.toLocaleString(),'万円');

    b+=`<div style="margin-top:4px;padding:4px 10px;background:#eff6ff;border-radius:6px;display:flex;justify-content:space-between">`;
    b+=`<span style="font-weight:700;color:#2563eb">教育費合計</span>`;
    b+=`<strong style="font-size:13px;color:#2563eb">${grandTotal.toLocaleString()} 万円</strong></div>`;
  });

  // 全体合計
  if(children.length>1){
    let allTotal=0;
    children.forEach(c=>{
      const costs=typeof eduCosts==='function'?eduCosts(c.id):[];
      allTotal+=costs.reduce((a,v)=>a+v,0);
    });
    b+=`<div style="margin-top:8px;padding:6px 10px;background:#ecfdf5;border-radius:6px;display:flex;justify-content:space-between">`;
    b+=`<span style="font-weight:700;color:#059669">全子合計</span>`;
    b+=`<strong style="font-size:14px;color:#059669">${allTotal.toLocaleString()} 万円</strong></div>`;
  }

  return _bCard('🎓','教育費のコース別積算',b,[
    {label:'文部科学省 — 令和3年度子供の学習費調査',url:'https://www.mext.go.jp/b_menu/toukei/chousa03/gakushuuhi/kekka/k_detail/mext_00001.html'},
    {label:'日本学生支援機構 — 学生生活調査',url:'https://www.jasso.go.jp/about/statistics/gakusei_chosa/index.html'}
  ]);
}

// ===== 6. iDeCo/DC節税 =====
function _basisDCTax(hAge,wAge,retAge,wRetAge){
  let b='';
  const renderPerson=(p,label,age,pRetAge)=>{
    const matching=fv(`dc-${p}-matching`)||0;
    const idecoMonthly=fv(`ideco-${p}-monthly`)||0;
    const annual=(matching+idecoMonthly)*12;
    b+=_bSub(label);
    if(annual<=0){
      b+=`<div style="color:#94a3b8;font-size:11px">DC/iDeCoの拠出なし</div>`;
      return;
    }
    b+=_bRow('DC マッチング拠出',matching>0?matching+'万円/月':'なし','');
    b+=_bRow('iDeCo 拠出',idecoMonthly>0?idecoMonthly+'万円/月':'なし','');
    b+=_bRow('年間控除対象額',annual.toLocaleString(),'万円');

    // 節税額計算
    const steps=getIncomeSteps(p);
    const takeHome=getIncomeAtAge(steps,age)||0;
    if(takeHome<=0){
      b+=_bNote('手取り年収が不明のため節税額を計算できません');
      return;
    }
    const saving=estimateTaxSaving(takeHome,annual);

    b+=_bFormula(
      '所得税節税 = 年間拠出額 × 限界税率 × 1.021',
      `${annual} × 税率 × 1.021`,
      saving.incomeTax.toLocaleString()+' 万円/年'
    );
    b+=_bFormula(
      '住民税節税 = 年間拠出額 × 10%',
      `${annual} × 0.1`,
      saving.residentTax.toLocaleString()+' 万円/年'
    );
    b+=`<div style="margin-top:4px;padding:4px 10px;background:#ecfdf5;border-radius:6px;display:flex;justify-content:space-between">`;
    b+=`<span style="font-weight:700;color:#059669">年間節税額</span>`;
    b+=`<strong style="font-size:13px;color:#059669">${saving.total.toLocaleString()} 万円</strong></div>`;

    // 拠出期間と累計
    const yrsLeft=Math.max(0,pRetAge-age);
    if(yrsLeft>0){
      const totalSaving=Math.round(saving.total*yrsLeft*10)/10;
      b+=_bRow('残り拠出期間',yrsLeft+'年（〜'+pRetAge+'歳）','');
      b+=_bRow('累計節税額（概算）',totalSaving.toLocaleString(),'万円');
    }
  };

  renderPerson('h','👔 ご主人様',hAge,retAge);
  renderPerson('w','👗 奥様',wAge,wRetAge);

  return _bCard('📊','iDeCo・DC節税効果',b,[
    {label:'iDeCo公式サイト — 税制メリット',url:'https://www.ideco-koushiki.jp/guide/tax.html'},
    {label:'国税庁 — 小規模企業共済等掛金控除',url:'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1135.htm'}
  ]);
}
