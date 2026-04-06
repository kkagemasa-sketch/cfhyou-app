// save-load.js — データ保存・復元・IndexedDB・JSON入出力

// ===== JSON書き出し・読み込み（完全対応版） =====
async function exportJSON(){
  const rawNm = _v('client-name') || 'CF表データ';
  const nm = rawNm.endsWith('様') ? rawNm : rawNm+'様';
  const json = JSON.stringify(_collectSaveData(), null, 2);
  const fileName = `${nm}_CF表.json`;
  // File System Access API が使えれば保存先を選択できる（OneDriveフォルダ等）
  if(window.showSaveFilePicker){
    try{
      const fh = await window.showSaveFilePicker({
        suggestedName: fileName,
        types:[{description:'CF表データ',accept:{'application/json':['.json']}}]
      });
      const ws = await fh.createWritable();
      await ws.write(json); await ws.close();
      return;
    }catch(e){ if(e.name==='AbortError') return; /* キャンセル */ }
  }
  // フォールバック：通常のダウンロード
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  a.click(); URL.revokeObjectURL(url);
}
function importJSON(){
  document.getElementById('json-import-input').click();
}
function onJSONImport(input){
  const file = input.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const d = JSON.parse(e.target.result);
      setType(d.type || 'mansion');
      Object.entries(d.fields || {}).forEach(([id, val]) => { const el=$(id); if(el) el.value=val; });
      // v7以前の後方互換（extrasが直接ある場合）
      if(d.extras && !d.dynamic){
        $('extra-cont').innerHTML = ''; extraCnt = 0;
        d.extras.forEach(it => addExtraItem(it.yr, it.amt, it.lbl, it.yr2||''));
      } else {
        _restoreDynamic(d.dynamic);
      }
      calcLoanAmt(); calcDelivery(); initLCComma(); live();
      alert(`「${d.fields?.['client-name'] || 'データ'}」を読み込みました`);
    }catch(err){ alert('読み込みに失敗しました。\n\nエラー詳細: '+err.message+'\n発生箇所: '+(err.stack||'').split('\n').slice(0,3).join('\n')); console.error('Import error:',err); }
    input.value = '';
  };
  reader.readAsText(file);
}

// ===== 保存・読込（完全対応版：動的要素含む） =====

// 動的要素を収集してオブジェクトを返す
function _collectDynamic(){
  const d={};
  // 子ども
  d.children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{
    const cid=el.id.split('-')[1];
    d.children.push({
      age:el.value, gender:$(`cg-${cid}`)?.value||'m',
      hoikuStart:$(`hoiku-start-${cid}`)?.value||'1',
      hoikuType:$(`hoiku-type-${cid}`)?.value||'hoikuen',
      hoiku:[0,1,2,3,4,5,6].map(a=>$(`hn-${a}-${cid}`)?.value||''),
      elem:$(`ce-${cid}`)?.value||'public', mid:$(`cm-${cid}`)?.value||'public',
      high:$(`ch-${cid}`)?.value||'public', univ:$(`cu-${cid}`)?.value||'plit_h',
      scOn:$(`sc-yes-${cid}`)?.classList.contains('on')||false,
      scAmt:$(`sc-amt-${cid}`)?.value||'', scStart:$(`sc-start-${cid}`)?.value||'',
      wedOn:$(`wed-yes-${cid}`)?.classList.contains('on')||false,
      wedAmt:$(`wed-amt-${cid}`)?.value||'', wedAge:$(`wed-age-${cid}`)?.value||''
    });
  });
  // 収入ステップ
  d.incSteps={h:[],w:[]};
  ['h','w'].forEach(p=>{
    const seen=new Set();const ids=[];
    document.querySelectorAll(`#${p}-income-cont>[id^="${p}-is-"]`).forEach(el=>{
      if(!seen.has(el.id)){seen.add(el.id);ids.push(el.id);}
    });
    ids.forEach(base=>{
      const isPct=document.getElementById(`${base}-mode-pct`)?.classList.contains('on');
      d.incSteps[p].push({
        from:document.getElementById(`${base}-from`)?.value||'',
        to:document.getElementById(`${base}-to`)?.value||'',
        netFrom:document.getElementById(`${base}-net-from`)?.value||'',
        netTo:document.getElementById(`${base}-net-to`)?.value||'',
        pct:document.getElementById(`${base}-pct`)?.value||'',
        mode:isPct?'pct':'amt',
        leave:document.getElementById(`${base}-leave`)?.value||''
      });
    });
  });
    // 金利ステップ
  d.rateSteps=[];
  document.querySelectorAll('[id^="rsf-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    d.rateSteps.push({from:el.value,rate:$(`rsr-${id}`)?.value||''});
  });
  // 生活費ステップ
  d.lcSteps=[];
  document.querySelectorAll('#lc-steps-cont>[id^="ls-"]').forEach(el=>{
    const id=el.dataset.id;
    const _isPct=document.getElementById(`lsmode-pct-${id}`)?.classList.contains('on');
    d.lcSteps.push({base:document.getElementById(`lsb-${id}`)?.value||'',rate:$(`lsr-${id}`)?.value||'',from:document.getElementById(`lsf-${id}`)?.value||'',to:document.getElementById(`lst-${id}`)?.value||'',mode:_isPct?'pct':'free',pct:document.getElementById(`lspct-${id}`)?.value||'80'});
  });
  // 産休・育休・時短
  d.leaves=[];
  document.querySelectorAll('[id^="lvt-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    d.leaves.push({type:el.value,startAge:$(`lvs-${id}`)?.value||'',endAge:$(`lve-${id}`)?.value||'',income:$(`lvi-${id}`)?.value||''});
  });
  // 特別支出
  d.extras=[];
  document.querySelectorAll('[id^="ex-yr-"]').forEach(el=>{
    if(el.id.includes('yr2'))return;
    const id=el.id.split('-')[2];
    d.extras.push({yr:el.value,yr2:$(`ex-yr2-${id}`)?.value||'',amt:$(`ex-amt-${id}`)?.value||'',lbl:$(`ex-lbl-${id}`)?.value||''});
  });
  // 修繕積立金ステップ（手動/自動）
  d.repSteps=[];
  document.querySelectorAll('[id^="rpsy-"]').forEach(el=>{
    const sid=el.id.split('-')[1];
    d.repSteps.push({yr:el.value,amt:$(`rpsa-${sid}`)?.value||''});
  });
  d.repAutoSteps=[];
  document.querySelectorAll('[id^="rpasy-"]').forEach(el=>{
    const sid=el.id.split('-')[1];
    d.repAutoSteps.push({yr:el.value,unit:$(`rpasu-${sid}`)?.value||''});
  });
  // 積み立て保険
  d.insSavings=[];
  ['h','w'].forEach(p=>{
    document.querySelectorAll(`#ins-savings-cont-${p}>[id^="ins-${p}-"]`).forEach(el=>{
      const id=el.id.split('-').pop();
      d.insSavings.push({person:p,enrollAge:$(`ins-enroll-${p}-${id}`)?.value||'',monthly:$(`ins-m-${p}-${id}`)?.value||'',matAge:$(`ins-age-${p}-${id}`)?.value||'',matAmt:$(`ins-mat-${p}-${id}`)?.value||'',redeemAge:$(`ins-redeem-${p}-${id}`)?.value||'',redeemAmt:$(`ins-redeem-amt-${p}-${id}`)?.value||''});
    });
  });
  d.insLumps=[];
  ['h','w'].forEach(p=>{
    document.querySelectorAll(`#ins-lump-cont-${p}>[id^="ins-lump-${p}-"]`).forEach(el=>{
      const id=el.id.split('-').pop();
      d.insLumps.push({person:p,enrollAge:$(`ins-lump-enroll-${p}-${id}`)?.value||'',amt:$(`ins-lump-amt-${p}-${id}`)?.value||'',matAge:$(`ins-lump-matage-${p}-${id}`)?.value||'',rate:$(`ins-lump-rate-${p}-${id}`)?.value||'',matAmt:$(`ins-lump-matamt-${p}-${id}`)?.value||'',pct:$(`ins-lump-pct-${p}-${id}`)?.value||''});
    });
  });
  // 有価証券
  d.securities=[];
  ['h','w'].forEach(p=>{
    document.querySelectorAll(`#securities-cont-${p}>[id^="sec-${p}-"]`).forEach(el=>{
      const id=el.id.split('-').pop();
      const isNisa=$(`sec-nisa-${p}-${id}`)?.classList.contains('on')||false;
      const isStock=$(`sec-stock-${p}-${id}`)?.classList.contains('on')||false;
      d.securities.push({person:p,label:$(`sec-label-${p}-${id}`)?.value||'',taxType:isNisa?'nisa':'taxable',secType:isStock?'stock':'accum',
        bal:$(`sec-bal-${p}-${id}`)?.value||'',monthly:$(`sec-monthly-${p}-${id}`)?.value||'',end:$(`sec-end-${p}-${id}`)?.value||'',rate:$(`sec-rate-${p}-${id}`)?.value||'',redeem:$(`sec-redeem-${p}-${id}`)?.value||'',
        stkBal:$(`sec-stk-bal-${p}-${id}`)?.value||'',stkAge:$(`sec-stk-age-${p}-${id}`)?.value||'',div:$(`sec-div-${p}-${id}`)?.value||'',stkRedeem:$(`sec-stk-redeem-${p}-${id}`)?.value||''});
    });
  });
  // その他収入
  d.otherIncomes=[];
  document.querySelectorAll('[id^="oin-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    d.otherIncomes.push({name:el.value,amt:$(`oia-${id}`)?.value||'',endAge:$(`oie-${id}`)?.value||''});
  });
  // その他メンバー
  d.otherMembers=[];
  document.querySelectorAll('#other-members-cont>[id^="om-"]').forEach(el=>{
    const id=el.id.split('-')[1];
    d.otherMembers.push({label:$(`oml-${id}`)?.value||'',age:$(`oma-${id}`)?.value||'',notes:$(`omn-${id}`)?.value||''});
  });
  // 万が一シミュレーション
  d.mg={target:mgTarget,dansin:mgDansin,dansinH:mgDansinH,dansinW:mgDansinW,survMode:mgSurvMode,
    deathYear:$('mg-death-year')?.value||'',survAmt:$('mg-surv-amt')?.value||'',lcRatio:$('mg-lc-ratio')?.value||'',
    lcMode:$('mg-lc-mode-step')?.classList.contains('act')?'step':'ratio',
    scholarshipOn:$('mg-scholarship-yes')?.classList.contains('act')||false,
    scholarshipAmt:$('mg-scholarship-amt')?.value||'',scholarshipAge:$('mg-scholarship-age')?.value||'',
    carOn:$('mg-car-keep')?.classList.contains('act')!==false,
    carPrice:$('mg-car-price')?.value||'',carCycle:$('mg-car-cycle')?.value||'',carInsp:$('mg-car-insp')?.value||'',carEndAge:$('mg-car-end-age')?.value||'',
    parkOn:$('mg-park-keep')?.classList.contains('act')!==false,parking:$('mg-parking')?.value||'',
    insurances:[],lcSteps:[]};
  document.querySelectorAll('#mg-insurance-cont>[id^="mg-ins-"]').forEach(el=>{
    const id=el.id.split('-').pop();
    d.mg.insurances.push({name:$(`mg-ins-name-${id}`)?.value||'',amt:$(`mg-ins-amt-${id}`)?.value||''});
  });
  document.querySelectorAll('#mg-lc-steps-container>.mg-lc-step, #mg-lc-steps-container>[style]').forEach(el=>{
    const inputs=el.querySelectorAll('input');
    if(inputs.length>=4){
      d.mg.lcSteps.push({base:inputs[0]?.value||'',rate:inputs[1]?.value||'',from:inputs[2]?.value||'',to:inputs[3]?.value||''});
    }
  });
  // 万が一 生活費段階1（静的HTML）
  d.mg.lcStep1={base:$('mg-lsb-1')?.value||'',rate:$('mg-lsr-1')?.value||'',from:$('mg-lsf-1')?.value||'',to:$('mg-lst-1')?.value||''};
  // 通常CF表 遺族年金上書き金額
  d.survHAmt=$('surv-h-amt')?.value||'';
  d.survWAmt=$('surv-w-amt')?.value||'';
  // フラグ系
  d.repMode=repMode; d.retirePayOn=retirePayOn; d.wRetirePayOn=wRetirePayOn;
  d.downType=downType; d.carOwn=carOwn; d.parkOwn=parkOwn;
  d.parkFromYr=document.getElementById('park-from-yr')?.value||'';
  d.parkToYr=document.getElementById('park-to-yr')?.value||'';
  // 動的修繕周期
  d.repairCycles=[];
  document.querySelectorAll('#repair-cont>[id^="rep-"]').forEach(el=>{
    const id=el.id.replace('rep-','');
    d.repairCycles.push({
      cycle:document.getElementById('repair-cycle'+id)?.value||'30',
      cost:document.getElementById('repair-cost'+id)?.value||'200'
    });
  });
  d.carCnt=carCnt;
  d.cars=[];
  document.querySelectorAll('#car-list>[id^="car-"]').forEach(el=>{
    const c=el.id.split('-')[1];
    d.cars.push({
      id:parseInt(c),
      type:el.dataset.type||'new',
      pay:el.dataset.pay||'cash',
      label:document.getElementById('car-'+c+'-label')?.value||'',
      price:document.getElementById('car-'+c+'-price')?.value||'300',
      first:document.getElementById('car-'+c+'-first')?.value||'1',
      cycle:document.getElementById('car-'+c+'-cycle')?.value||'7',
      endAge:document.getElementById('car-'+c+'-end-age')?.value||'',
      insp:document.getElementById('car-'+c+'-insp')?.value||'10',
      down:document.getElementById('car-'+c+'-down')?.value||'50',
      loanYrs:document.getElementById('car-'+c+'-loan-yrs')?.value||'5',
      loanRate:document.getElementById('car-'+c+'-loan-rate')?.value||'2.5',
    });
  });
  d.pairLoanMode=pairLoanMode;
  d.lctrlDedMode=_lctrlDedMode;
  d.lctrlManualDed=_lctrlDedMode==='manual'?getLctrlManualValues():[];
  // 返済計画タブ
  d.loanPlan={
    isPairLoan:_isPairLoan, ppType:_ppType,
    amtA:$('lp-amt-a')?.value||'',rateA:$('lp-rate-a')?.value||'',yrsA:$('lp-yrs-a')?.value||'',methodA:$('lp-method-a')?.value||'',
    amtB:$('lp-amt-b')?.value||'',rateB:$('lp-rate-b')?.value||'',yrsB:$('lp-yrs-b')?.value||'',methodB:$('lp-method-b')?.value||'',
    ppTermFrom:$('pp-term-from')?.value||'',ppTermTo:$('pp-term-to')?.value||'',ppReduceYr:$('pp-reduce-yr')?.value||'',ppReduceMP:$('pp-reduce-mp')?.value||'',
    dedYear:$('lp-ded-year')?.value||'',dedType:$('lp-ded-type')?.value||'',dedHH:$('lp-ded-hh')?.value||'',
    grossH:$('lp-ded-gross-h')?.value||'',grossW:$('lp-ded-gross-w')?.value||'',
    dedMode:_lctrlDedMode,manualDed:_lctrlDedMode==='manual'?getLctrlManualValues():[],
    prepays:[]
  };
  document.querySelectorAll('[id^="pp-yf-"]').forEach(el=>{
    const id=el.id.split('-')[2];
    d.loanPlan.prepays.push({
      yf:el.value,yt:$(`pp-yt-${id}`)?.value||'',amt:$(`pp-amt-${id}`)?.value||''
    });
  });
  return d;
}

// 動的要素を復元する
function _restoreDynamic(d){
  if(!d)return;
  // 子ども
  if($('children-cont'))$('children-cont').innerHTML=''; cCnt=0;
  (d.children||[]).forEach(c=>{
    addChild();
    const cid=cCnt;
    if($(`ca-${cid}`))$(`ca-${cid}`).value=c.age;
    if($(`cg-${cid}`))$(`cg-${cid}`).value=c.gender||'m';
    if($(`hoiku-start-${cid}`))$(`hoiku-start-${cid}`).value=c.hoikuStart||'1';
      if($(`hoiku-type-${cid}`))$(`hoiku-type-${cid}`).value=c.hoikuType||'hoikuen';
    (c.hoiku||[]).forEach((v,a)=>{const el=$(`hn-${a}-${cid}`);if(el)el.value=v;});
    if($(`ce-${cid}`))$(`ce-${cid}`).value=c.elem||'public';
    if($(`cm-${cid}`))$(`cm-${cid}`).value=c.mid||'public';
    if($(`ch-${cid}`))$(`ch-${cid}`).value=c.high||'public';
    if($(`cu-${cid}`))$(`cu-${cid}`).value=c.univ||'plit_h';
    if(c.scOn)setScholarship(cid,true);
    if(c.scOn&&$(`sc-amt-${cid}`))$(`sc-amt-${cid}`).value=c.scAmt;
    if(c.scOn&&$(`sc-start-${cid}`))$(`sc-start-${cid}`).value=c.scStart;
    if(c.wedOn)setWedding(cid,true);
    if(c.wedOn&&$(`wed-amt-${cid}`))$(`wed-amt-${cid}`).value=c.wedAmt;
    if(c.wedOn&&$(`wed-age-${cid}`))$(`wed-age-${cid}`).value=c.wedAge;
  });
  // 収入ステップ
  if($('h-income-cont'))$('h-income-cont').innerHTML=''; if($('w-income-cont'))$('w-income-cont').innerHTML='';
  hIncomeCnt=0; wIncomeCnt=0;
  ['h','w'].forEach(p=>{
    (d.incSteps?.[p]||[]).forEach(s=>{
      addIncomeStep(p);
      const cnt=p==='h'?hIncomeCnt:wIncomeCnt;
      const base=`${p}-is-${cnt}`;
      if(document.getElementById(`${base}-from`))document.getElementById(`${base}-from`).value=s.from;
      if(document.getElementById(`${base}-to`))document.getElementById(`${base}-to`).value=s.to;
      if(document.getElementById(`${base}-net-from`))document.getElementById(`${base}-net-from`).value=s.netFrom||'';
      if(document.getElementById(`${base}-net-to`))document.getElementById(`${base}-net-to`).value=s.netTo||'';
      if(s.mode==='pct'&&typeof setStepMode==='function'){
        setStepMode(base,'pct');
        if(document.getElementById(`${base}-pct`))document.getElementById(`${base}-pct`).value=s.pct||'100';
      }
      if(document.getElementById(`${base}-leave`))document.getElementById(`${base}-leave`).value=s.leave||'';
    });
  });
  // 金利ステップ
  if($('rate-cont'))$('rate-cont').innerHTML=''; rCnt=0; if($('btn-add-rate'))$('btn-add-rate').style.display='';
  (d.rateSteps||[]).forEach(s=>{
    addRate();
    if($(`rsf-${rCnt}`))$(`rsf-${rCnt}`).value=s.from;
    if($(`rsr-${rCnt}`))$(`rsr-${rCnt}`).value=s.rate;
  });
  // 生活費ステップ
  if($('lc-steps-cont'))$('lc-steps-cont').innerHTML=''; lsCnt=0;
  (d.lcSteps||[]).forEach(s=>{
    addLCStep();const _lid=lsCnt;
    if($(`lsb-${_lid}`)&&s.base)$(`lsb-${_lid}`).value=s.base;
    if($(`lsr-${_lid}`)&&s.rate)$(`lsr-${_lid}`).value=s.rate;
    if($(`lsf-${_lid}`)&&s.from)$(`lsf-${_lid}`).value=s.from;
    if($(`lst-${_lid}`)&&s.to)$(`lst-${_lid}`).value=s.to;
    if(s.mode==='pct')setLCMode(_lid,'pct');
    if($(`lspct-${_lid}`)&&s.pct)$(`lspct-${_lid}`).value=s.pct;
  });
  // 産休・育休・時短
  if($('leave-cont'))$('leave-cont').innerHTML=''; lvCnt=0;
  (d.leaves||[]).forEach(s=>{
    addLeave();
    if($(`lvt-${lvCnt}`))$(`lvt-${lvCnt}`).value=s.type;
    if($(`lvs-${lvCnt}`))$(`lvs-${lvCnt}`).value=s.startAge;
    if($(`lve-${lvCnt}`))$(`lve-${lvCnt}`).value=s.endAge;
    if($(`lvi-${lvCnt}`))$(`lvi-${lvCnt}`).value=s.income;
  });
  // 特別支出
  if($('extra-cont'))$('extra-cont').innerHTML=''; extraCnt=0;
  (d.extras||[]).forEach(it=>addExtraItem(it.yr,it.amt,it.lbl,it.yr2||''));
  // 修繕積立金ステップ
  if($('rep-steps-cont'))$('rep-steps-cont').innerHTML=''; repStepCnt=0;
  (d.repSteps||[]).forEach(s=>{addRepStep();if($(`rpsy-${repStepCnt}`))$(`rpsy-${repStepCnt}`).value=s.yr;if($(`rpsa-${repStepCnt}`))$(`rpsa-${repStepCnt}`).value=s.amt;});
  if($('rep-auto-steps-cont'))$('rep-auto-steps-cont').innerHTML=''; repAutoStepCnt=0;
  (d.repAutoSteps||[]).forEach(s=>{addRepAutoStep();if($(`rpasy-${repAutoStepCnt}`))$(`rpasy-${repAutoStepCnt}`).value=s.yr;if($(`rpasu-${repAutoStepCnt}`))$(`rpasu-${repAutoStepCnt}`).value=s.unit;});
  // 一時払い保険
  ['h','w'].forEach(p=>{if($(`ins-lump-cont-${p}`))$(`ins-lump-cont-${p}`).innerHTML='';});
  insLumpCnt=0;
  (d.insLumps||[]).forEach(s=>{
    addInsLump(s.person);
    const id=insLumpCnt;const p=s.person;
    if($(`ins-lump-enroll-${p}-${id}`))$(`ins-lump-enroll-${p}-${id}`).value=s.enrollAge;
    if($(`ins-lump-amt-${p}-${id}`))$(`ins-lump-amt-${p}-${id}`).value=s.amt;
    if($(`ins-lump-matage-${p}-${id}`))$(`ins-lump-matage-${p}-${id}`).value=s.matAge;
    if($(`ins-lump-rate-${p}-${id}`))$(`ins-lump-rate-${p}-${id}`).value=s.rate;
    if($(`ins-lump-matamt-${p}-${id}`))$(`ins-lump-matamt-${p}-${id}`).value=s.matAmt;
    if($(`ins-lump-pct-${p}-${id}`))$(`ins-lump-pct-${p}-${id}`).value=s.pct;
  });
  // 積み立て保険
  ['h','w'].forEach(p=>{if($(`ins-savings-cont-${p}`))$(`ins-savings-cont-${p}`).innerHTML='';});
  insSavCnt=0;
  (d.insSavings||[]).forEach(s=>{
    addInsSaving(s.person);
    const id=insSavCnt;const p=s.person;
    if($(`ins-enroll-${p}-${id}`))$(`ins-enroll-${p}-${id}`).value=s.enrollAge||'';
    if($(`ins-m-${p}-${id}`))$(`ins-m-${p}-${id}`).value=s.monthly;
    if($(`ins-age-${p}-${id}`))$(`ins-age-${p}-${id}`).value=s.matAge;
    if($(`ins-mat-${p}-${id}`))$(`ins-mat-${p}-${id}`).value=s.matAmt;
    if($(`ins-redeem-${p}-${id}`))$(`ins-redeem-${p}-${id}`).value=s.redeemAge;
    if($(`ins-redeem-amt-${p}-${id}`))$(`ins-redeem-amt-${p}-${id}`).value=s.redeemAmt||'';
  });
  // 有価証券
  ['h','w'].forEach(p=>{if($(`securities-cont-${p}`))$(`securities-cont-${p}`).innerHTML='';});
  secCnt=0;
  (d.securities||[]).forEach(s=>{
    addSecurity(s.person);
    const id=secCnt;const p=s.person;
    if($(`sec-label-${p}-${id}`))$(`sec-label-${p}-${id}`).value=s.label;
    if(s.taxType==='nisa')setSecTax(p,id,'nisa');
    if(s.secType==='stock')setSecType(p,id,'stock');
    if($(`sec-bal-${p}-${id}`))$(`sec-bal-${p}-${id}`).value=s.bal;
    if($(`sec-monthly-${p}-${id}`))$(`sec-monthly-${p}-${id}`).value=s.monthly;
    if($(`sec-end-${p}-${id}`))$(`sec-end-${p}-${id}`).value=s.end;
    if($(`sec-rate-${p}-${id}`))$(`sec-rate-${p}-${id}`).value=s.rate;
    if($(`sec-redeem-${p}-${id}`))$(`sec-redeem-${p}-${id}`).value=s.redeem;
    if($(`sec-stk-bal-${p}-${id}`))$(`sec-stk-bal-${p}-${id}`).value=s.stkBal;
    if($(`sec-stk-age-${p}-${id}`))$(`sec-stk-age-${p}-${id}`).value=s.stkAge;
    if($(`sec-div-${p}-${id}`))$(`sec-div-${p}-${id}`).value=s.div;
    if($(`sec-stk-redeem-${p}-${id}`))$(`sec-stk-redeem-${p}-${id}`).value=s.stkRedeem;
  });
  // その他収入
  if($('other-income-cont'))$('other-income-cont').innerHTML='';
  otherIncomeCnt=0;
  (d.otherIncomes||[]).forEach(s=>{
    addOtherIncome(s.name);
    const id=otherIncomeCnt;
    if($(`oia-${id}`))$(`oia-${id}`).value=s.amt;
    if($(`oie-${id}`))$(`oie-${id}`).value=s.endAge;
  });
  // その他メンバー
  if($('other-members-cont'))$('other-members-cont').innerHTML='';
  otherMemberCnt=0;
  (d.otherMembers||[]).forEach(s=>{
    addOther();
    const id=otherMemberCnt;
    if($(`oml-${id}`))$(`oml-${id}`).value=s.label;
    if($(`oma-${id}`))$(`oma-${id}`).value=s.age;
    if($(`omn-${id}`))$(`omn-${id}`).value=s.notes;
  });
  // 万が一シミュレーション
  if(d.mg){
    const mg=d.mg;
    if(typeof setMGTarget==='function')setMGTarget(mg.target||'h');
    if(typeof setMGDansin==='function')setMGDansin(mg.dansin!==false);
    if(typeof setMGDansinPair==='function'){setMGDansinPair('h',mg.dansinH!==false);setMGDansinPair('w',mg.dansinW!==false);}
    if(typeof setMGSurvMode==='function')setMGSurvMode(mg.survMode||'auto');
    if($('mg-death-year'))$('mg-death-year').value=mg.deathYear||'1';
    if($('mg-surv-amt'))$('mg-surv-amt').value=mg.survAmt||'0';
    if($('mg-lc-ratio'))$('mg-lc-ratio').value=mg.lcRatio||'70';
    // 生活費モード
    if(mg.lcMode==='step'){
      $('mg-lc-mode-step')?.classList.add('act');$('mg-lc-mode-ratio')?.classList.remove('act');
      if($('mg-lc-ratio-fields'))$('mg-lc-ratio-fields').style.display='none';
      if($('mg-lc-step-fields'))$('mg-lc-step-fields').style.display='';
    } else {
      $('mg-lc-mode-ratio')?.classList.add('act');$('mg-lc-mode-step')?.classList.remove('act');
      if($('mg-lc-ratio-fields'))$('mg-lc-ratio-fields').style.display='';
      if($('mg-lc-step-fields'))$('mg-lc-step-fields').style.display='none';
    }
    // 段階1（静的HTML）
    if(mg.lcStep1){
      if($('mg-lsb-1'))$('mg-lsb-1').value=mg.lcStep1.base;
      if($('mg-lsr-1'))$('mg-lsr-1').value=mg.lcStep1.rate;
      if($('mg-lsf-1'))$('mg-lsf-1').value=mg.lcStep1.from;
      if($('mg-lst-1'))$('mg-lst-1').value=mg.lcStep1.to;
    }
    // 追加段階
    if($('mg-lc-steps-container')){
      // 動的段階のみ削除（段階1は静的）
      $('mg-lc-steps-container').querySelectorAll('.mg-lc-step').forEach(el=>el.remove());
      _mgLCStepCount=1;
      (mg.lcSteps||[]).forEach(s=>{
        if(typeof addMGLCStep==='function')addMGLCStep();
        const n=_mgLCStepCount;
        if($(`mg-lsb-${n}`))$(`mg-lsb-${n}`).value=s.base;
        if($(`mg-lsr-${n}`))$(`mg-lsr-${n}`).value=s.rate;
        if($(`mg-lsf-${n}`))$(`mg-lsf-${n}`).value=s.from;
        if($(`mg-lst-${n}`))$(`mg-lst-${n}`).value=s.to;
      });
    }
    // 奨学金
    if(mg.scholarshipOn){
      $('mg-scholarship-yes')?.classList.add('act');$('mg-scholarship-none')?.classList.remove('act');
      if($('mg-scholarship-fields'))$('mg-scholarship-fields').style.display='';
    } else {
      $('mg-scholarship-none')?.classList.add('act');$('mg-scholarship-yes')?.classList.remove('act');
      if($('mg-scholarship-fields'))$('mg-scholarship-fields').style.display='none';
    }
    if($('mg-scholarship-amt'))$('mg-scholarship-amt').value=mg.scholarshipAmt||'0';
    if($('mg-scholarship-age'))$('mg-scholarship-age').value=mg.scholarshipAge||'19';
    // 車
    if(mg.carOn!==false){
      $('mg-car-keep')?.classList.add('act');$('mg-car-stop')?.classList.remove('act');
      if($('mg-car-fields'))$('mg-car-fields').style.display='';
    } else {
      $('mg-car-stop')?.classList.add('act');$('mg-car-keep')?.classList.remove('act');
      if($('mg-car-fields'))$('mg-car-fields').style.display='none';
    }
    if($('mg-car-price'))$('mg-car-price').value=mg.carPrice||'300';
    if($('mg-car-cycle'))$('mg-car-cycle').value=mg.carCycle||'7';
    if($('mg-car-insp'))$('mg-car-insp').value=mg.carInsp||'10';
    if($('mg-car-end-age'))$('mg-car-end-age').value=mg.carEndAge||'';
    // 駐車場
    if(mg.parkOn!==false){
      $('mg-park-keep')?.classList.add('act');$('mg-park-stop')?.classList.remove('act');
      if($('mg-park-fields'))$('mg-park-fields').style.display='';
    } else {
      $('mg-park-stop')?.classList.add('act');$('mg-park-keep')?.classList.remove('act');
      if($('mg-park-fields'))$('mg-park-fields').style.display='none';
    }
    if($('mg-parking'))$('mg-parking').value=mg.parking||'15000';
    // 保険金
    if($('mg-insurance-cont'))$('mg-insurance-cont').innerHTML='';
    mgInsCnt=0;
    if((mg.insurances||[]).length>0){
      (mg.insurances).forEach(s=>{
        if(typeof addMGInsurance==='function')addMGInsurance();
        if($(`mg-ins-name-${mgInsCnt}`))$(`mg-ins-name-${mgInsCnt}`).value=s.name;
        if($(`mg-ins-amt-${mgInsCnt}`))$(`mg-ins-amt-${mgInsCnt}`).value=s.amt;
      });
    } else {
      if(typeof addMGInsurance==='function')addMGInsurance();
    }
    if(typeof updateMGHints==='function')updateMGHints();
  }
  // フラグ系
  if(d.repMode)setRepMode(d.repMode);
  if(typeof d.retirePayOn!=='undefined')setRetirePay(d.retirePayOn);
  if(typeof d.wRetirePayOn!=='undefined')setWRetirePay(d.wRetirePayOn);
  if(d.downType)setDownType(d.downType);
  if(typeof d.pairLoanMode!=='undefined')setLoanMode(d.pairLoanMode?'pair':'single');
  if(typeof d.carOwn!=='undefined')setCarOwn(d.carOwn);
  if(typeof d.parkOwn!=='undefined')setParkOwn(d.parkOwn);
  const parkFromEl=document.getElementById('park-from-yr');
  if(parkFromEl&&d.parkFromYr)parkFromEl.value=d.parkFromYr;
  const parkToEl=document.getElementById('park-to-yr');
  if(parkToEl&&d.parkToYr)parkToEl.value=d.parkToYr;
  // 動的修繕周期の復元
  if(d.repairCycles&&d.repairCycles.length>0){
    document.getElementById('repair-cont').innerHTML='';
    repairCnt=0;
    d.repairCycles.forEach(r=>addRepairCycle(r.cycle,r.cost));
  }
  // 車の復元
  if(d.cars&&d.cars.length>0){
    document.getElementById('car-list').innerHTML='';
    carCnt=0;
    d.cars.forEach(c=>{
      addCar({label:c.label||'',type:c.type,pay:c.pay,price:c.price,first:c.first,cycle:c.cycle,endAge:c.endAge,insp:c.insp,down:c.down,loanYrs:c.loanYrs,loanRate:c.loanRate});
    });
  }
  // 通常CF表 遺族年金上書き金額復元
  if($('surv-h-amt')&&d.survHAmt!==undefined)$('surv-h-amt').value=d.survHAmt;
  if($('surv-w-amt')&&d.survWAmt!==undefined)$('surv-w-amt').value=d.survWAmt;
  if(d.lctrlDedMode){
    _lctrlDedMode=d.lctrlDedMode;
    setLctrlDedMode(d.lctrlDedMode);
    if(d.lctrlDedMode==='manual'&&d.lctrlManualDed){
      buildLctrlManualInputs();
      d.lctrlManualDed.forEach((v,i)=>{const el=$(`lctrl-m-${i+1}`);if(el)el.value=v;});
    }
  }
  // 返済計画タブ復元
  if(d.loanPlan){
    const lp=d.loanPlan;
    _isPairLoan=!!lp.isPairLoan;
    _ppType=lp.ppType||'term';
    // renderLoanTab呼び出し後に値を復元するためにフラグ保持
    window._pendingLoanPlan=lp;
  }
}

// ===== IndexedDB データベース =====
function openDB(){
  return new Promise((resolve,reject)=>{
    if(_db){resolve(_db);return;}
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains(STORE_NAME)){
        db.createObjectStore(STORE_NAME,{keyPath:'name'});
      }
    };
    req.onsuccess=e=>{_db=e.target.result;resolve(_db);};
    req.onerror=e=>reject(e.target.error);
  });
}
async function dbGetAll(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readonly');
    const store=tx.objectStore(STORE_NAME);
    const req=store.getAll();
    req.onsuccess=()=>resolve(req.result.filter(s=>s.name!==AUTOSAVE_KEY).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)));
    req.onerror=e=>reject(e.target.error);
  });
}
async function dbGet(name){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readonly');
    const req=tx.objectStore(STORE_NAME).get(name);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=e=>reject(e.target.error);
  });
}
async function dbPut(entry){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete=()=>resolve();
    tx.onerror=e=>reject(e.target.error);
  });
}
async function dbDelete(name){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).delete(name);
    tx.oncomplete=()=>resolve();
    tx.onerror=e=>reject(e.target.error);
  });
}
async function dbCount(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readonly');
    const req=tx.objectStore(STORE_NAME).count();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=e=>reject(e.target.error);
  });
}
async function dbEstimateSize(){
  const all=await dbGetAll();
  const json=JSON.stringify(all);
  return json.length*2; // UTF-16 byte estimate
}

// ===== スロット保存・読込（IndexedDB版） =====

function _collectSaveData(){
  const d={type:ST.type,fields:{},dynamic:_collectDynamic(),cfOverrides:JSON.parse(JSON.stringify(cfOverrides)),cfCustomRows:JSON.parse(JSON.stringify(cfCustomRows)),_cfCustomId:_cfCustomId,version:'9'};
  _STATIC_FIELDS.forEach(id=>{const el=$(id);if(el)d.fields[id]=(el.classList.contains('lc-m')||el.classList.contains('lc-y')||el.classList.contains('amt-inp'))?String(el.value).replace(/,/g,''):el.value});
  return d;
}
function _updateUndoRedoBtns(){
  const u=document.getElementById('btn-undo');
  const r=document.getElementById('btn-redo');
  if(u)u.disabled=_undoStack.length<2;
  if(r)r.disabled=_redoStack.length===0;
}
function pushUndoSnap(){
  const snap=_collectSaveData();
  const snapStr=JSON.stringify(snap);
  if(_undoStack.length>0&&JSON.stringify(_undoStack[_undoStack.length-1])===snapStr)return;
  _undoStack.push(snap);
  if(_undoStack.length>30)_undoStack.shift();
  _redoStack=[];// 新しい操作でRedoスタックをクリア
  _updateUndoRedoBtns();
}
function undoState(){
  if(_undoStack.length<2)return;
  const cur=_undoStack.pop();
  _redoStack.push(cur);
  if(_redoStack.length>30)_redoStack.shift();
  const prev=_undoStack[_undoStack.length-1];
  _applyData(prev);
  _updateUndoRedoBtns();
}
function redoState(){
  if(_redoStack.length===0)return;
  const next=_redoStack.pop();
  _undoStack.push(next);
  _applyData(next);
  _updateUndoRedoBtns();
}
function _applyData(d){
  try{
    setType(d.type||'mansion');
    Object.entries(d.fields||{}).forEach(([id,val])=>{const el=$(id);if(el)el.value=val});
    cfOverrides=d.cfOverrides||{};
    cfCustomRows=d.cfCustomRows||[];
    _cfCustomId=d._cfCustomId||0;
    _restoreDynamic(d.dynamic);
    calcLoanAmt();calcDelivery();initLCComma();live();render();
  }catch(err){
    alert('読み込みに失敗しました。\n\nエラー詳細: '+err.message+'\n発生箇所: '+(err.stack||'').split('\n').slice(0,3).join('\n'));
    console.error('Apply data error:',err);
  }
}
function _fmtDate(d){
  if(!d)return '-';
  if(typeof d==='number')d=new Date(d);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function _fmtSize(bytes){
  if(bytes<1024)return bytes+'B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+'KB';
  return (bytes/(1024*1024)).toFixed(1)+'MB';
}

// localStorage→IndexedDB自動移行（初回のみ）
async function _migrateFromLocalStorage(){
  const old=localStorage.getItem('cf_slots_v9');
  if(!old)return;
  try{
    const slots=JSON.parse(old);
    for(const s of slots){
      const existing=await dbGet(s.name);
      if(!existing){
        await dbPut({name:s.name, savedAt:s.savedAt, updatedAt:Date.now(), data:s.data});
      }
    }
    localStorage.removeItem('cf_slots_v9');
  }catch(e){console.warn('localStorage移行エラー:',e);}
}

// ===== 自動保存 =====
function scheduleAutoSave(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer=setTimeout(async()=>{
    try{
      await dbPut({name:AUTOSAVE_KEY, savedAt:_fmtDate(new Date()), updatedAt:Date.now(), data:_collectSaveData()});
    }catch(e){}
  },2000);
}
// 更新ボタン：先に保存してからページ遷移（2秒デバウンス前に遷移するとデータが消えるのを防止）
async function saveAndRefresh(){
  clearTimeout(_autoSaveTimer);
  try{
    await dbPut({name:AUTOSAVE_KEY, savedAt:_fmtDate(new Date()), updatedAt:Date.now(), data:_collectSaveData()});
  }catch(e){}
  window.location.href=window.location.pathname+'?v='+Date.now();
}
async function restoreAutoSave(){
  try{
    const entry=await dbGet(AUTOSAVE_KEY);
    if(entry&&entry.data){
      _applyData(entry.data);
      _autoSaveRestored=true;
    }
  }catch(e){}
}

// ===== パネルUI =====
async function openSlotPanel(){
  document.getElementById('slot-modal')?.remove();
  const slots=await dbGetAll();
  const rawName=_v('client-name')||'';
  const clientName=rawName&&!rawName.endsWith('様')?rawName+'様':rawName;
  const totalSize=await dbEstimateSize();
  const slotCount=slots.length;

  const listHtml=slots.length===0
    ?'<div style="color:#94a3b8;font-size:12px;padding:16px 0;text-align:center">保存データがありません</div>'
    :slots.map(s=>`
      <div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #f1f5f9">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:12px;color:#1e3a5f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:1px">${_fmtDate(s.updatedAt)} 保存</div>
        </div>
        <button onclick="loadSlot('${s.name.replace(/'/g,"\\'")}')" style="font-size:11px;padding:4px 12px;background:#2d7dd2;color:#fff;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;font-weight:600">読込</button>
        <button onclick="deleteSlot('${s.name.replace(/'/g,"\\'")}')" style="font-size:11px;padding:4px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:5px;cursor:pointer" title="削除">🗑</button>
      </div>`).join('');

  const modal=document.createElement('div');
  modal.id='slot-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:24px;width:480px;max-width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:15px;color:#1e3a5f">💾 お客様データ管理</div>
        <button onclick="document.getElementById('slot-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px" title="閉じる">✕</button>
      </div>

      <!-- 保存フォーム -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:10px;letter-spacing:.04em">現在のデータを保存</div>
        <div style="display:flex;gap:8px">
          <input id="slot-name-input" type="text" value="${clientName}" placeholder="お客様名（例：田中様）"
            style="flex:1;font-size:12px;padding:7px 10px;border:1.5px solid #cbd5e1;border-radius:7px;font-family:inherit;outline:none"
            onkeydown="if(event.key==='Enter')saveSlot()"
            onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#cbd5e1'">
          <button onclick="saveSlot()" style="font-size:12px;padding:7px 18px;background:#1e3a5f;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap">保存</button>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:6px">同名のデータがある場合は上書き確認が表示されます</div>
      </div>

      <!-- スロット一覧 -->
      <div>
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;display:flex;justify-content:space-between">
          <span>保存済みデータ</span>
          <span style="color:#94a3b8">${slotCount}件 / ${_fmtSize(totalSize)}</span>
        </div>
        <div id="slot-list" style="max-height:280px;overflow-y:auto">${listHtml}</div>
      </div>

      <!-- バックアップ -->
      <div style="border-top:1px solid #f1f5f9;padding-top:12px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;letter-spacing:.04em">バックアップ</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="exportJSON();document.getElementById('slot-modal').remove()" style="font-size:11px;padding:5px 12px;background:#eef2f7;color:#1e3a5f;border:1px solid #c8d6e8;border-radius:6px;cursor:pointer;font-weight:600">📤 現在のデータを書き出し</button>
          <button onclick="document.getElementById('slot-modal').remove();importJSON()" style="font-size:11px;padding:5px 12px;background:#eef2f7;color:#1e3a5f;border:1px solid #c8d6e8;border-radius:6px;cursor:pointer;font-weight:600">📥 データを読み込み</button>
          <button onclick="exportAllJSON()" style="font-size:11px;padding:5px 12px;background:#fff7ed;color:#92400e;border:1px solid #fed7aa;border-radius:6px;cursor:pointer;font-weight:600">📦 全件一括バックアップ</button>
          <button onclick="document.getElementById('slot-modal').remove();document.getElementById('json-bulk-import-input').click()" style="font-size:11px;padding:5px 12px;background:#fff7ed;color:#92400e;border:1px solid #fed7aa;border-radius:6px;cursor:pointer;font-weight:600">📦 一括バックアップ復元</button>
        </div>
      </div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
  setTimeout(()=>{const inp=document.getElementById('slot-name-input');if(inp){inp.focus();inp.select();}},60);
}

async function saveSlot(){
  const nameEl=document.getElementById('slot-name-input');
  const name=(nameEl?.value.trim())||(_v('client-name')||'無題');
  if(!name){alert('お客様名を入力してください');return;}

  // 上書き確認
  const existing=await dbGet(name);
  if(existing){
    if(!confirm(`「${name}」は既に保存されています。\n\n前回保存: ${_fmtDate(existing.updatedAt)}\n\n上書きしますか？`))return;
  }

  // 現在のシナリオデータを更新してから全シナリオ保存
  const _curScen=scenarios.find(s=>s.id===activeScenarioId);
  if(_curScen)_curScen.data=_collectSaveData();
  const _saveData={..._collectSaveData(),scenarios:JSON.parse(JSON.stringify(scenarios)),activeScenarioId};
  const entry={name, savedAt:existing?.savedAt||_fmtDate(new Date()), updatedAt:Date.now(), data:_saveData};
  try{
    await dbPut(entry);
    await openSlotPanel();
    setTimeout(()=>{
      const inp=document.getElementById('slot-name-input');
      if(inp){inp.style.borderColor='#4ade80';inp.style.background='#f0fdf4';}
    },30);
  }catch(e){alert('保存に失敗しました。');}
}

async function loadSlot(name){
  const entry=await dbGet(name);
  if(!entry){alert('データが見つかりません');return;}
  if(!confirm(`「${name}」を読み込みますか？\n現在の入力内容は上書きされます。`))return;
  _applyData(entry.data);
  // シナリオ復元
  if(entry.data.scenarios&&entry.data.scenarios.length>0){
    scenarios=JSON.parse(JSON.stringify(entry.data.scenarios));
    activeScenarioId=entry.data.activeScenarioId||scenarios[0].id;
    scenarioCnt=Math.max(...scenarios.map(s=>s.id));
  }else{
    scenarios=[{id:1,name:'CF表1',data:entry.data}];
    activeScenarioId=1;scenarioCnt=1;
  }
  renderScenarioTabs();
  document.getElementById('slot-modal')?.remove();
}

async function deleteSlot(name){
  const entry=await dbGet(name);
  if(!entry)return;
  if(!confirm(`「${name}」を削除しますか？\nこの操作は元に戻せません。`))return;
  await dbDelete(name);
  await openSlotPanel();
}

// JSON一括バックアップ
async function exportAllJSON(){
  const slots=await dbGetAll();
  if(slots.length===0){alert('保存データがありません');return;}
  const json=JSON.stringify({version:'9',exportedAt:_fmtDate(new Date()),slots},null,2);
  const fileName=`CF表_全件バックアップ_${new Date().toLocaleDateString('ja-JP').replace(/\//g,'')}.json`;
  if(window.showSaveFilePicker){
    try{
      const fh=await window.showSaveFilePicker({suggestedName:fileName,types:[{description:'CF表バックアップ',accept:{'application/json':['.json']}}]});
      const ws=await fh.createWritable();await ws.write(json);await ws.close();
      document.getElementById('slot-modal')?.remove();
      return;
    }catch(e){if(e.name==='AbortError')return;}
  }
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=fileName;a.click();URL.revokeObjectURL(url);
  document.getElementById('slot-modal')?.remove();
}

function onBulkJSONImport(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const d=JSON.parse(e.target.result);
      if(!d.slots||!Array.isArray(d.slots)){alert('一括バックアップファイルではありません');return;}
      let imported=0,skipped=0;
      for(const s of d.slots){
        const existing=await dbGet(s.name);
        if(existing){skipped++;continue;}
        await dbPut({name:s.name,savedAt:s.savedAt||_fmtDate(new Date()),updatedAt:s.updatedAt||Date.now(),data:s.data});
        imported++;
      }
      alert(`復元完了: ${imported}件追加${skipped>0?`、${skipped}件は既に存在するためスキップ`:''}`);
      openSlotPanel();
    }catch(err){alert('復元に失敗しました。正しいバックアップファイルか確認してください。');}
    input.value='';
  };
  reader.readAsText(file);
}
