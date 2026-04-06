// loan-plan.js — 返済計画タブ
// ===== 返済計画タブ =====
function addPrepay(yrFrom='',yrTo='',amt=''){
  _loanPrepayId++;
  const id=_loanPrepayId;
  const el=document.createElement('div');
  el.id=`pp-${id}`;
  el.style.cssText='background:var(--light);border:1px solid var(--border);border-radius:var(--rs);padding:8px;margin-bottom:5px';
  el.innerHTML=`<div style="display:flex;gap:6px;align-items:center">
    <div class="suf" style="flex:1"><input type="number" class="inp age-inp" id="pp-yf-${id}" value="${yrFrom}" placeholder="開始" min="1" max="50" onchange="renderLoanCalc()"><span class="sl">年目〜</span></div>
    <div class="suf" style="flex:1"><input type="number" class="inp age-inp" id="pp-yt-${id}" value="${yrTo}" placeholder="終了" min="1" max="50" onchange="renderLoanCalc()"><span class="sl">年目</span></div>
    <div class="suf" style="flex:1"><input type="number" class="inp amt-inp" id="pp-amt-${id}" value="${amt}" placeholder="万円/年" min="0" onchange="renderLoanCalc()"><span class="sl">万円/年</span></div>
    <button class="btn-rm" onclick="document.getElementById('pp-${id}').remove();renderLoanCalc()">×</button>
  </div>`;
  return el;
}
function calcAmortization(principal,rateAnnual,years,prepays,ppType,rateSchedule){
  // rateSchedule: [{yr:年目,rate:年利},...] 金利変更スケジュール（省略時は固定金利）
  const sched=rateSchedule||[];
  function rateForYear(y){
    let r=rateAnnual;
    for(const s of sched){if(y>=s.yr)r=s.rate;else break;}
    return r;
  }
  let mr=rateAnnual/12;
  let n=years*12;
  if(rateAnnual===0&&sched.length===0){
    let mp=principal/n;
    const rows=[];let bal=principal;
    for(let y=1;y<=years&&bal>0;y++){
      let pp=0;prepays.forEach(p=>{if(p.yr===y)pp+=p.amt});
      const pay=Math.min(mp*12,bal);const princ=pay;
      bal=Math.max(0,bal-princ-pp);
      if(ppType==='reduce'&&pp>0&&bal>0){const remM=(years-y)*12;mp=remM>0?bal/remM:0}
      rows.push({yr:y,pay:Math.round(pay),principal:Math.round(princ),interest:0,balance:Math.round(bal),prepay:Math.round(pp),monthly:Math.round(mp)});
      if(bal<=0)break;
    }
    return rows;
  }
  let mp=mr>0?principal*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1):principal/n;
  const rows=[];let bal=principal;
  for(let y=1;y<=50&&bal>0;y++){
    // 金利変更チェック
    const curRate=rateForYear(y);
    const curMR=curRate/12;
    if(curMR!==mr){
      mr=curMR;
      // 残期間で月額を再計算
      const remM=Math.max(1,(years-(y-1))*12);
      mp=mr>0?bal*mr*Math.pow(1+mr,remM)/(Math.pow(1+mr,remM)-1):bal/remM;
    }
    let yearPay=0,yearPrinc=0,yearInt=0;
    for(let m=1;m<=12&&bal>0;m++){
      const intM=bal*mr;
      const princM=Math.min(mp-intM,bal);
      yearInt+=intM;yearPrinc+=princM;yearPay+=(intM+princM);
      bal=Math.max(0,bal-princM);
      if(bal<1)bal=0;
    }
    let pp=0;prepays.forEach(p=>{if(p.yr===y)pp+=p.amt});
    if(pp>0){
      pp=Math.min(pp,bal);
      bal=Math.max(0,bal-pp);
      if(ppType==='reduce'&&bal>0){
        const remM=Math.max(1,(years-y)*12);
        mp=mr>0?bal*mr*Math.pow(1+mr,remM)/(Math.pow(1+mr,remM)-1):bal/remM;
      }
    }
    rows.push({yr:y,pay:Math.round(yearPay),principal:Math.round(yearPrinc),interest:Math.round(yearInt),balance:Math.round(bal),prepay:Math.round(pp),monthly:Math.round(mp)});
    if(bal<=0)break;
  }
  return rows;
}
function renderLoanTab(){
  const rb=$('right-body');
  // ペアローン時はH側、単独時は共通の値を使用
  const loanAmt=(pairLoanMode?(parseFloat($('loan-h-amt')?.value)||0):(parseFloat($('loan-amt')?.value)||4500))*10000;
  const loanRate=(pairLoanMode?(parseFloat($('rate-h-base')?.value)||0.5):(parseFloat($('rate-base')?.value)||0.5))/100;
  const loanYrs=pairLoanMode?(parseInt($('loan-h-yrs')?.value)||35):(parseInt($('loan-yrs')?.value)||35);
  const loanAmtB=(parseFloat($('loan-w-amt')?.value)||0)*10000;
  const loanRateB=(parseFloat($('rate-w-base')?.value)||loanRate*100)/100;
  const loanYrsB=parseInt($('loan-w-yrs')?.value)||loanYrs;
  let h=`<div style="padding:16px;max-width:1400px">
    <h2 style="font-size:18px;font-weight:800;color:var(--navy);margin-bottom:14px">🏦 返済計画シミュレーション</h2>
    <!-- ペアローン切替 -->
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <button class="btn-tog on" id="lp-single-btn" onclick="togglePairLoan(false)" style="font-size:11px;padding:5px 14px">単独ローン</button>
      <button class="btn-tog" id="lp-pair-btn" onclick="togglePairLoan(true)" style="font-size:11px;padding:5px 14px">ペアローン</button>
    </div>
    <!-- ローン設定 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px" id="lp-loan-cards">
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:12px" id="lp-card-a">
        <div style="font-size:12px;font-weight:700;color:var(--navy);margin-bottom:6px" id="lp-label-a">ローン設定</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
          <div class="fg"><label class="lbl">借入額</label><div class="suf"><input class="inp amt-inp" id="lp-amt-a" type="number" value="${loanAmt/10000}" min="0" onchange="renderLoanCalc()"><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">金利（年）</label><div class="suf"><input class="inp" id="lp-rate-a" type="number" value="${loanRate*100}" min="0" max="15" step="0.01" onchange="renderLoanCalc()"><span class="sl">%</span></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
          <div class="fg"><label class="lbl">返済期間</label><div class="suf"><input class="inp age-inp" id="lp-yrs-a" type="number" value="${loanYrs}" min="1" max="50" onchange="renderLoanCalc()"><span class="sl">年</span></div></div>
          <div class="fg"><label class="lbl">返済方法</label><select class="sel" id="lp-method-a" onchange="renderLoanCalc()"><option value="equal">元利均等</option></select></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:var(--navy)">月々返済額：</span>
          <span id="lp-monthly-a" style="font-size:16px;font-weight:800;color:#2563eb;font-family:'Cascadia Code','Consolas',monospace">―</span>
          <span style="font-size:11px;color:var(--muted)">円</span>
        </div>
        <details style="margin-top:4px">
          <summary style="font-size:10px;font-weight:700;color:var(--muted);cursor:pointer">金利変更スケジュール</summary>
          <div id="lp-rate-cont-a" style="margin-top:4px"></div>
          <button class="btn-add" onclick="addLPRate('a')" style="font-size:10px;padding:3px 8px;margin-top:3px">＋ 金利変更を追加</button>
        </details>
      </div>
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:12px;display:none" id="lp-card-b">
        <div style="font-size:12px;font-weight:700;color:#e67e22;margin-bottom:6px">ペアローン（配偶者）</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
          <div class="fg"><label class="lbl">借入額</label><div class="suf"><input class="inp amt-inp" id="lp-amt-b" type="number" value="${loanAmtB/10000}" min="0" onchange="renderLoanCalc()"><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">金利（年）</label><div class="suf"><input class="inp" id="lp-rate-b" type="number" value="${loanRateB*100}" min="0" max="15" step="0.01" onchange="renderLoanCalc()"><span class="sl">%</span></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px">
          <div class="fg"><label class="lbl">返済期間</label><div class="suf"><input class="inp age-inp" id="lp-yrs-b" type="number" value="${loanYrsB}" min="1" max="50" onchange="renderLoanCalc()"><span class="sl">年</span></div></div>
          <div class="fg"><label class="lbl">返済方法</label><select class="sel" id="lp-method-b" onchange="renderLoanCalc()"><option value="equal">元利均等</option></select></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:#e67e22">月々返済額：</span>
          <span id="lp-monthly-b" style="font-size:16px;font-weight:800;color:#e67e22;font-family:'Cascadia Code','Consolas',monospace">―</span>
          <span style="font-size:11px;color:var(--muted)">円</span>
        </div>
        <details style="margin-top:4px">
          <summary style="font-size:10px;font-weight:700;color:var(--muted);cursor:pointer">金利変更スケジュール</summary>
          <div id="lp-rate-cont-b" style="margin-top:4px"></div>
          <button class="btn-add" onclick="addLPRate('b')" style="font-size:10px;padding:3px 8px;margin-top:3px">＋ 金利変更を追加</button>
        </details>
      </div>
    </div>
    <!-- 住宅ローン控除 -->
    <details style="background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:12px;margin-bottom:16px" id="lp-deduction-card">
      <summary style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:6px;cursor:pointer;user-select:none">🏠 住宅ローン控除</summary>
      <div style="font-size:10px;color:var(--muted);margin-bottom:8px">入居年・住宅種別・世帯属性により借入限度額が変わります。控除額＝年末残高（上限以内）×0.7%<br><span style="color:#b45309">※本計算は概算であり実際の控除額とは異なる場合があります。詳細は税理士にご相談ください。</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">
        <div class="fg"><label class="lbl">入居（引渡）予定年</label>
          <select class="sel" id="lp-ded-year" onchange="updateLPDedHint();renderLoanCalc()" style="font-size:11px">
            <option value="2024">2024年入居</option><option value="2025">2025年入居</option>
            <option value="2026" selected>2026年入居</option><option value="2027">2027年入居</option>
            <option value="2028">2028年入居</option><option value="2029">2029年入居</option>
            <option value="2030">2030年入居</option>
          </select></div>
        <div class="fg"><label class="lbl">住宅の種別</label>
          <select class="sel" id="lp-ded-type" onchange="updateLPDedHint();renderLoanCalc()" style="font-size:11px">
            <option value="new_long">新築（長期優良・低炭素）</option>
            <option value="new_zeh">新築（ZEH水準省エネ）</option>
            <option value="new_eco" selected>新築（省エネ基準適合）</option>
            <option value="new_general">新築（その他・一般）</option>
            <option value="used_eco">中古（省エネ基準適合以上）</option>
            <option value="used_other">中古（その他）</option>
          </select></div>
        <div class="fg"><label class="lbl">世帯属性</label>
          <select class="sel" id="lp-ded-hh" onchange="updateLPDedHint();renderLoanCalc()" style="font-size:11px">
            <option value="general">一般世帯</option>
            <option value="kosodate">子育て・若者夫婦世帯</option>
          </select></div>
      </div>
      <div id="lp-ded-hint" style="font-size:10px;font-weight:600;padding:6px 10px;background:#e8f2fc;border-radius:5px;line-height:1.8;margin-bottom:8px"></div>
      <!-- 税額推計 -->
      <div id="lp-ded-auto-body">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">控除額は所得税＋住民税（課税所得×5%、上限9.75万円）を超えません。額面年収から自動推計します。</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <div class="fg"><label class="lbl">ご本人 額面年収</label><div class="suf"><input class="inp amt-inp" id="lp-ded-gross-h" type="number" value="" placeholder="万円" min="0" onchange="calcLPTaxFromGross('h');renderLoanCalc()" style="font-size:11px"><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">→ 所得税（推計）</label><div class="suf"><input class="inp amt-inp" id="lp-ded-itax-h" type="number" value="" placeholder="自動" min="0" step="0.1" style="font-size:11px;background:#f8fafc" readonly><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">→ 住民税（推計）</label><div class="suf"><input class="inp amt-inp" id="lp-ded-jtax-h" type="number" value="" placeholder="自動" min="0" step="0.1" style="font-size:11px;background:#f8fafc" readonly><span class="sl">万円</span></div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;display:none" id="lp-ded-tax-b">
          <div class="fg"><label class="lbl">配偶者 額面年収</label><div class="suf"><input class="inp amt-inp" id="lp-ded-gross-w" type="number" value="" placeholder="万円" min="0" onchange="calcLPTaxFromGross('w');renderLoanCalc()" style="font-size:11px"><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">→ 所得税（推計）</label><div class="suf"><input class="inp amt-inp" id="lp-ded-itax-w" type="number" value="" placeholder="自動" min="0" step="0.1" style="font-size:11px;background:#f8fafc" readonly><span class="sl">万円</span></div></div>
          <div class="fg"><label class="lbl">→ 住民税（推計）</label><div class="suf"><input class="inp amt-inp" id="lp-ded-jtax-w" type="number" value="" placeholder="自動" min="0" step="0.1" style="font-size:11px;background:#f8fafc" readonly><span class="sl">万円</span></div></div>
        </div>
      </div>
      <div id="lp-ded-detail-wrap" style="margin-bottom:8px"></div>
      <div style="display:flex;gap:12px;font-size:12px">
        <span style="color:var(--navy);font-weight:700">控除総額：</span>
        <span id="lp-ded-total" style="font-weight:800;color:#059669">―</span>
      </div>
    </details>
    <!-- 繰上返済 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:12px">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:6px">🔄 繰上返済シミュレーション</div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <button class="btn-tog on" id="pp-type-term" onclick="setPPType('term')" style="flex:1;font-size:11px;padding:5px">期間短縮型</button>
          <button class="btn-tog" id="pp-type-reduce" onclick="setPPType('reduce')" style="flex:1;font-size:11px;padding:5px">返済額軽減型</button>
        </div>
        <!-- 期間短縮型 -->
        <div id="pp-term-body">
          <div style="font-size:9px;color:var(--muted);margin-bottom:6px">短縮したい期間を入力 → その元金分を繰上返済した場合の利息軽減効果</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <div class="fg"><label class="lbl">短縮開始</label><div class="suf"><input class="inp age-inp" id="pp-term-from" type="number" value="" placeholder="例:30" min="1" max="50" onchange="renderLoanCalc()" style="font-size:11px"><span class="sl">年目〜</span></div></div>
            <div class="fg"><label class="lbl">短縮終了</label><div class="suf"><input class="inp age-inp" id="pp-term-to" type="number" value="" placeholder="例:35" min="1" max="50" onchange="renderLoanCalc()" style="font-size:11px"><span class="sl">年目</span></div></div>
          </div>
          <div id="pp-term-info" style="font-size:11px;color:var(--muted)"></div>
        </div>
        <!-- 返済額軽減型 -->
        <div id="pp-reduce-body" style="display:none">
          <div style="font-size:9px;color:var(--muted);margin-bottom:6px">繰上返済後の希望月額から逆算して必要な繰上返済額を計算</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
            <div class="fg"><label class="lbl">繰上返済実行年</label><div class="suf"><input class="inp age-inp" id="pp-reduce-yr" type="number" value="" placeholder="例:5" min="1" max="50" onchange="renderLoanCalc()" style="font-size:11px"><span class="sl">年目</span></div></div>
            <div class="fg"><label class="lbl">希望月額</label><div class="suf"><input class="inp amt-inp" id="pp-reduce-mp" type="number" value="" placeholder="円" min="0" onchange="renderLoanCalc()" style="font-size:11px"><span class="sl">円</span></div></div>
          </div>
          <div id="pp-reduce-info" style="font-size:11px;color:var(--muted)"></div>
        </div>
      </div>
      <div style="background:var(--card);border:1.5px solid var(--border);border-radius:var(--r);padding:12px">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px">💰 繰上返済効果</div>
        <div id="lp-effect" style="font-size:12px;color:var(--muted)">繰上返済を設定すると効果が表示されます</div>
      </div>
    </div>
    <div id="lp-table-wrap" style="overflow-x:auto"></div>
  </div>`;
  rb.innerHTML=h;
  if(_isPairLoan) togglePairLoan(true);
  // 保存データの復元
  if(window._pendingLoanPlan){
    const lp=window._pendingLoanPlan;
    if(lp.amtA&&$('lp-amt-a'))$('lp-amt-a').value=lp.amtA;
    if(lp.rateA&&$('lp-rate-a'))$('lp-rate-a').value=lp.rateA;
    if(lp.yrsA&&$('lp-yrs-a'))$('lp-yrs-a').value=lp.yrsA;
    if(lp.methodA&&$('lp-method-a'))$('lp-method-a').value=lp.methodA;
    if(lp.amtB&&$('lp-amt-b'))$('lp-amt-b').value=lp.amtB;
    if(lp.rateB&&$('lp-rate-b'))$('lp-rate-b').value=lp.rateB;
    if(lp.yrsB&&$('lp-yrs-b'))$('lp-yrs-b').value=lp.yrsB;
    if(lp.methodB&&$('lp-method-b'))$('lp-method-b').value=lp.methodB;
    if(lp.ppTermFrom&&$('pp-term-from'))$('pp-term-from').value=lp.ppTermFrom;
    if(lp.ppTermTo&&$('pp-term-to'))$('pp-term-to').value=lp.ppTermTo;
    if(lp.ppReduceYr&&$('pp-reduce-yr'))$('pp-reduce-yr').value=lp.ppReduceYr;
    if(lp.ppReduceMP&&$('pp-reduce-mp'))$('pp-reduce-mp').value=lp.ppReduceMP;
    if(lp.dedYear&&$('lp-ded-year'))$('lp-ded-year').value=lp.dedYear;
    if(lp.dedType&&$('lp-ded-type'))$('lp-ded-type').value=lp.dedType;
    if(lp.dedHH&&$('lp-ded-hh'))$('lp-ded-hh').value=lp.dedHH;
    if(lp.grossH&&$('lp-ded-gross-h'))$('lp-ded-gross-h').value=lp.grossH;
    if(lp.grossW&&$('lp-ded-gross-w'))$('lp-ded-gross-w').value=lp.grossW;
    // 自由入力の復元は左パネル側(_lctrlDedMode)で管理
    if(lp.ppType)setPPType(lp.ppType);
    (lp.prepays||[]).forEach(p=>{
      const cont=$('lp-prepay-cont');
      if(cont)cont.appendChild(addPrepay(p.yf,p.yt,p.amt));
    });
    // 金利変更スケジュール復元
    (lp.ratesA||[]).forEach(r=>{
      addLPRate('a');
      const last=$(`lp-rate-cont-a`)?.lastElementChild;
      if(last){
        const yrEl=last.querySelector('[id$="-yr"]');
        const rtEl=last.querySelector('[id$="-rate"]');
        if(yrEl)yrEl.value=r.yr;
        if(rtEl)rtEl.value=(r.rate*100).toFixed(2);
      }
    });
    (lp.ratesB||[]).forEach(r=>{
      addLPRate('b');
      const last=$(`lp-rate-cont-b`)?.lastElementChild;
      if(last){
        const yrEl=last.querySelector('[id$="-yr"]');
        const rtEl=last.querySelector('[id$="-rate"]');
        if(yrEl)yrEl.value=r.yr;
        if(rtEl)rtEl.value=(r.rate*100).toFixed(2);
      }
    });
    delete window._pendingLoanPlan;
  }else{
    // 入力パネルの設定を同期
    const srcYr=$('lctrl-year');if(srcYr&&$('lp-ded-year'))$('lp-ded-year').value=srcYr.value;
    const srcTp=$('lctrl-type');if(srcTp&&$('lp-ded-type'))$('lp-ded-type').value=srcTp.value;
    const srcHH=$('lctrl-household');if(srcHH&&$('lp-ded-hh'))$('lp-ded-hh').value=srcHH.value;
  }
  if(_isPairLoan){const taxB=$('lp-ded-tax-b');if(taxB)taxB.style.display='grid';}
  updateLPDedHint();
  renderLoanCalc();
}
function togglePairLoan(on){
  _isPairLoan=on;
  $('lp-single-btn')?.classList.toggle('on',!on);
  $('lp-pair-btn')?.classList.toggle('on',on);
  const cb=$('lp-card-b');
  if(cb)cb.style.display=on?'block':'none';
  $('lp-label-a').textContent=on?'ローンA（ご本人様）':'ローン設定';
  const taxB=$('lp-ded-tax-b');if(taxB)taxB.style.display=on?'grid':'none';
  renderLoanCalc();
}
function estimateTaxFromGross(grossEst){
  // 額面年収(万円)→所得税・住民税・課税所得を計算（CF表と同じロジック）
  if(!grossEst||grossEst<=0)return{itax:0,jumin:0,taxableBase:0};
  const shakai=Math.round(grossEst*0.1437*10)/10;
  let kyuyo=grossEst<=180?Math.max(55,grossEst*0.4):grossEst<=360?grossEst*0.3+18:grossEst<=660?grossEst*0.2+54:grossEst<=850?grossEst*0.1+120:grossEst<=1000?grossEst*0.05+172.5:195;
  const taxableBase=Math.max(0,grossEst-kyuyo-shakai-48);
  const taxable=Math.max(0,taxableBase-38);
  let itax=0;
  if(taxable<=195)itax=taxable*0.05;
  else if(taxable<=330)itax=taxable*0.1-9.75;
  else if(taxable<=695)itax=taxable*0.2-42.75;
  else if(taxable<=900)itax=taxable*0.23-63.6;
  else if(taxable<=1800)itax=taxable*0.33-153.6;
  else if(taxable<=4000)itax=taxable*0.4-279.6;
  else itax=taxable*0.45-479.6;
  itax=Math.round(itax*1.021*10)/10;
  const jumin=Math.max(0,Math.round((taxableBase*0.1-2.5)*10)/10);
  return{itax:Math.max(0,itax),jumin:Math.max(0,jumin),taxableBase};
}
function calcLPTaxFromGross(who){
  const suffix=who==='w'?'-w':'-h';
  const gross=parseFloat($(`lp-ded-gross${suffix}`)?.value)||0;
  const t=estimateTaxFromGross(gross);
  if($(`lp-ded-itax${suffix}`))$(`lp-ded-itax${suffix}`).value=t.itax;
  if($(`lp-ded-jtax${suffix}`))$(`lp-ded-jtax${suffix}`).value=t.jumin;
}
// 返済計画タブ用金利変更スケジュール
function addLPRate(who){
  const cont=$(`lp-rate-cont-${who}`);if(!cont)return;
  const cnt=who==='a'?++_lpRateCntA:++_lpRateCntB;
  const id=`lpr-${who}-${cnt}`;
  const el=document.createElement('div');
  el.id=id;
  el.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:4px;margin-bottom:3px';
  el.innerHTML=`<div class="suf"><input class="inp age-inp" id="${id}-yr" type="number" placeholder="年目〜" min="1" max="50" style="font-size:10px" onchange="renderLoanCalc()"><span class="sl">年目〜</span></div>
    <div class="suf"><input class="inp" id="${id}-rate" type="number" placeholder="%" step="0.01" min="0" max="15" style="font-size:10px" onchange="renderLoanCalc()"><span class="sl">%</span></div>
    <button class="btn-rm" onclick="document.getElementById('${id}').remove();renderLoanCalc()">×</button>`;
  cont.appendChild(el);
}
function getLPRates(who){
  const rates=[];
  const cont=$(`lp-rate-cont-${who}`);if(!cont)return rates;
  cont.querySelectorAll('[id^="lpr-"]').forEach(el=>{
    const yr=parseInt(el.querySelector('[id$="-yr"]')?.value)||0;
    const rate=parseFloat(el.querySelector('[id$="-rate"]')?.value)||0;
    if(yr>0&&rate>=0)rates.push({yr,rate:rate/100});
  });
  return rates.sort((a,b)=>a.yr-b.yr);
}
function updateLPDedHint(){
  const yr=parseInt($('lp-ded-year')?.value)||2026;
  const tp=$('lp-ded-type')?.value||'new_eco';
  const hh=$('lp-ded-hh')?.value||'general';
  const row=getLCtrlRow(yr,tp,hh==='kosodate');
  const lmt=row[0],yrs=row[1];
  const typeNames={new_long:'新築（長期優良・低炭素）',new_zeh:'新築（ZEH水準）',new_eco:'新築（省エネ基準適合）',new_general:'新築（その他・一般）',used_eco:'中古（省エネ基準適合以上）',used_other:'中古（その他）'};
  const hhName=hh==='kosodate'?'子育て・若者夫婦世帯':'一般世帯';
  const hint=$('lp-ded-hint');
  if(!hint)return;
  if(lmt===0){
    hint.innerHTML=`<span style="color:var(--red)">⚠️ <strong>${yr}年入居・${typeNames[tp]}（${hhName}）は住宅ローン控除の対象外です</strong></span>`;
  }else{
    const maxCtrl=Math.round(lmt*0.007);
    hint.innerHTML=`<span style="color:#1a3a6a">📋 ${yr}年入居 / ${typeNames[tp]} / ${hhName}<br>借入上限：<strong>${lmt.toLocaleString()}万円</strong>　年最大控除：<strong>${maxCtrl}万円</strong>　控除期間：<strong>${yrs}年間</strong></span>`;
  }
}
function setPPType(t){
  _ppType=t;
  $('pp-type-term')?.classList.toggle('on',t==='term');
  $('pp-type-reduce')?.classList.toggle('on',t==='reduce');
  const tb=$('pp-term-body'),rb=$('pp-reduce-body');
  if(tb)tb.style.display=t==='term'?'block':'none';
  if(rb)rb.style.display=t==='reduce'?'block':'none';
  renderLoanCalc();
}
function renderLoanCalc(){
  // ローンA
  const amtA=(parseFloat($('lp-amt-a')?.value)||0)*10000;
  const rateA=(parseFloat($('lp-rate-a')?.value)||0)/100;
  const yrsA=parseInt($('lp-yrs-a')?.value)||35;
  // ローンB（ペアローン）
  const amtB=_isPairLoan?(parseFloat($('lp-amt-b')?.value)||0)*10000:0;
  const rateB=_isPairLoan?(parseFloat($('lp-rate-b')?.value)||0)/100:0;
  const yrsB=_isPairLoan?parseInt($('lp-yrs-b')?.value)||35:0;
  if(amtA<=0&&amtB<=0){$('lp-table-wrap').innerHTML='';return}
  function calcMP(amt,rate,yrs){const mr=rate/12;const n=yrs*12;return mr>0?amt*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1):amt/n}
  const mpA=amtA>0?calcMP(amtA,rateA,yrsA):0;
  const mpB=amtB>0?calcMP(amtB,rateB,yrsB):0;
  if($('lp-monthly-a'))$('lp-monthly-a').textContent=amtA>0?Math.round(mpA).toLocaleString():'―';
  if($('lp-monthly-b'))$('lp-monthly-b').textContent=amtB>0?Math.round(mpB).toLocaleString():'―';
  // 金利変更スケジュール取得
  const ratesA=getLPRates('a');
  const ratesB=getLPRates('b');
  // 通常償還
  const normalA=amtA>0?calcAmortization(amtA,rateA,yrsA,[],'term',ratesA):[];
  const normalB=amtB>0?calcAmortization(amtB,rateB,yrsB,[],'term',ratesB):[];
  // 繰上返済計算（A+B合算で計算）
  let withPPA=null,withPPB=null;
  let ppAmountA=0,ppAmountB=0,ppAmountTotal=0;
  let ppSavedTotal=0;
  const showPP=_isPairLoan&&amtB>0;
  if(_ppType==='term'){
    // 期間短縮型：短縮開始年〜終了年の元金分を一括繰上
    const termFrom=parseInt($('pp-term-from')?.value)||0;
    const termTo=parseInt($('pp-term-to')?.value)||0;
    const maxLen=Math.max(normalA.length,normalB.length);
    if(termFrom>0&&termTo>=termFrom&&maxLen>0){
      // ローンA
      if(normalA.length>0){
        const bfA=termFrom<=1?amtA:(termFrom-1<=normalA.length?normalA[termFrom-2]?.balance||0:0);
        const afA=termTo<=normalA.length?normalA[termTo-1]?.balance||0:0;
        ppAmountA=Math.max(0,bfA-afA);
        if(ppAmountA>0){
          withPPA=calcAmortization(amtA,rateA,yrsA,[{yr:Math.max(1,termFrom-1),amt:ppAmountA}],'term',ratesA);
        }
      }
      // ローンB（ペアローン時）
      if(showPP&&normalB.length>0){
        const bfB=termFrom<=1?amtB:(termFrom-1<=normalB.length?normalB[termFrom-2]?.balance||0:0);
        const afB=termTo<=normalB.length?normalB[termTo-1]?.balance||0:0;
        ppAmountB=Math.max(0,bfB-afB);
        if(ppAmountB>0){
          withPPB=calcAmortization(amtB,rateB,yrsB,[{yr:Math.max(1,termFrom-1),amt:ppAmountB}],'term',ratesB);
        }
      }
      ppAmountTotal=ppAmountA+ppAmountB;
      const nIntA=normalA.reduce((s,r)=>s+r.interest,0);
      const nIntB=normalB.reduce((s,r)=>s+r.interest,0);
      const ppIntA=withPPA?withPPA.reduce((s,r)=>s+r.interest,0):nIntA;
      const ppIntB=withPPB?withPPB.reduce((s,r)=>s+r.interest,0):nIntB;
      ppSavedTotal=(nIntA-ppIntA)+(nIntB-ppIntB);
      const info=$('pp-term-info');
      if(info&&ppAmountTotal>0){
        let detail='';
        if(showPP){
          detail=`<div style="font-size:10px;color:var(--muted);margin-top:4px;border-top:1px solid #d1fae5;padding-top:4px">A: ${Math.round(ppAmountA).toLocaleString()}円 / B: ${Math.round(ppAmountB).toLocaleString()}円</div>`;
        }
        info.innerHTML=`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--rs);padding:8px;margin-top:6px">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${termFrom}年目〜${termTo}年目（${termTo-termFrom+1}年間）を短縮</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div><span style="color:var(--muted);font-size:10px">繰上返済に必要な元金</span><br><strong style="color:var(--navy);font-size:15px">${Math.round(ppAmountTotal).toLocaleString()}</strong> <span style="font-size:10px">円</span></div>
            <div><span style="color:var(--muted);font-size:10px">利息軽減額</span><br><strong style="color:#dc2626;font-size:15px">${Math.round(ppSavedTotal).toLocaleString()}</strong> <span style="font-size:10px">円</span></div>
          </div>${detail}
        </div>`;
      }else if(info){info.innerHTML='';}
    }else{
      const info=$('pp-term-info');if(info)info.innerHTML='';
    }
  }else{
    // 返済額軽減型：希望月額から逆算（A+B合算）
    const reduceYr=parseInt($('pp-reduce-yr')?.value)||0;
    const desiredMP=parseFloat($('pp-reduce-mp')?.value)||0;
    const totalMP=mpA+mpB;
    if(reduceYr>0&&desiredMP>0&&desiredMP<totalMP){
      // A+Bの合計月額を希望月額にするため、按分して繰上返済額を計算
      const ratioA=mpA/totalMP;
      const desiredMPA=desiredMP*ratioA;
      const desiredMPB=showPP?desiredMP*(1-ratioA):0;
      // ローンA
      if(normalA.length>=reduceYr){
        const balA=normalA[reduceYr-1]?.balance||0;
        const remMA=(yrsA-reduceYr)*12;const mrA=rateA/12;
        let newBalA=mrA>0?desiredMPA*(Math.pow(1+mrA,remMA)-1)/(mrA*Math.pow(1+mrA,remMA)):desiredMPA*remMA;
        ppAmountA=Math.max(0,balA-newBalA);
        if(ppAmountA>0)withPPA=calcAmortization(amtA,rateA,yrsA,[{yr:reduceYr,amt:ppAmountA}],'reduce',ratesA);
      }
      // ローンB
      if(showPP&&normalB.length>=reduceYr){
        const balB=normalB[reduceYr-1]?.balance||0;
        const remMB=(yrsB-reduceYr)*12;const mrB=rateB/12;
        let newBalB=mrB>0?desiredMPB*(Math.pow(1+mrB,remMB)-1)/(mrB*Math.pow(1+mrB,remMB)):desiredMPB*remMB;
        ppAmountB=Math.max(0,balB-newBalB);
        if(ppAmountB>0)withPPB=calcAmortization(amtB,rateB,yrsB,[{yr:reduceYr,amt:ppAmountB}],'reduce',ratesB);
      }
      ppAmountTotal=ppAmountA+ppAmountB;
      const nIntA=normalA.reduce((s,r)=>s+r.interest,0);
      const nIntB=normalB.reduce((s,r)=>s+r.interest,0);
      const ppIntA=withPPA?withPPA.reduce((s,r)=>s+r.interest,0):nIntA;
      const ppIntB=withPPB?withPPB.reduce((s,r)=>s+r.interest,0):nIntB;
      ppSavedTotal=(nIntA-ppIntA)+(nIntB-ppIntB);
      const info=$('pp-reduce-info');
      if(info&&ppAmountTotal>0){
        let detail='';
        if(showPP){
          detail=`<div style="font-size:10px;color:var(--muted);margin-top:4px;border-top:1px solid #d1fae5;padding-top:4px">A: ${Math.round(ppAmountA).toLocaleString()}円 / B: ${Math.round(ppAmountB).toLocaleString()}円</div>`;
        }
        info.innerHTML=`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:var(--rs);padding:8px;margin-top:6px">
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${reduceYr}年目に繰上返済 → 月額合計 ${Math.round(desiredMP).toLocaleString()}円へ（現在 ${Math.round(totalMP).toLocaleString()}円）</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div><span style="color:var(--muted);font-size:10px">繰上返済に必要な元金</span><br><strong style="color:var(--navy);font-size:15px">${Math.round(ppAmountTotal).toLocaleString()}</strong> <span style="font-size:10px">円</span></div>
            <div><span style="color:var(--muted);font-size:10px">利息軽減額</span><br><strong style="color:#dc2626;font-size:15px">${Math.round(ppSavedTotal).toLocaleString()}</strong> <span style="font-size:10px">円</span></div>
          </div>${detail}
        </div>`;
      }else if(info){info.innerHTML='';}
    }else{
      const info=$('pp-reduce-info');if(info)info.innerHTML='';
    }
  }
  // 住宅ローン控除（LCTRL_TABLE連動）
  const dedYr=parseInt($('lp-ded-year')?.value)||2026;
  const dedTp=$('lp-ded-type')?.value||'new_eco';
  const dedHH=$('lp-ded-hh')?.value||'general';
  const lctrlRow=getLCtrlRow(dedYr,dedTp,dedHH==='kosodate');
  const dedLimitMan=lctrlRow[0]; // 借入限度額（万円）
  const dedYrs=lctrlRow[1]; // 控除年数
  const dedLimit=dedLimitMan*10000; // 円換算
  const dedRate=0.007; // 0.7%固定
  const dataA=withPPA||normalA;
  // 額面年収から所得税・住民税・課税所得を計算
  const grossH=parseFloat($('lp-ded-gross-h')?.value)||0;
  const grossW=parseFloat($('lp-ded-gross-w')?.value)||0;
  const taxInfoH=grossH>0?estimateTaxFromGross(grossH):{itax:0,jumin:0,taxableBase:0};
  const taxInfoW=grossW>0?estimateTaxFromGross(grossW):{itax:0,jumin:0,taxableBase:0};
  if(grossH>0)calcLPTaxFromGross('h');
  if(grossW>0)calcLPTaxFromGross('w');
  const itaxH=taxInfoH.itax;
  const itaxW=taxInfoW.itax;
  // 住民税からの控除上限＝課税総所得金額等×5%（上限JUMIN_CTRL_MAX）
  const jCapH=Math.min(Math.round(taxInfoH.taxableBase*0.05*10)/10,JUMIN_CTRL_MAX);
  const jCapW=Math.min(Math.round(taxInfoW.taxableBase*0.05*10)/10,JUMIN_CTRL_MAX);
  const taxCapH=(itaxH+jCapH)*10000;
  const taxCapW=(itaxW+jCapW)*10000;
  const hasTaxLimit=grossH>0;
  const hasTaxLimitW=grossW>0;
  let dedTotal=0,dedTotalA=0,dedTotalB=0;
  const dedByYear=[],dedAByYear=[],dedBByYear=[];
  // 所得税/住民税内訳（円単位）
  const dedItaxA=[],dedJtaxA=[],dedItaxB=[],dedJtaxB=[];
  if(_lctrlDedMode==='manual'){
    const manualVals=getLctrlManualValues().map(v=>v*10000);
    for(let y=0;y<Math.max(dedYrs,manualVals.length);y++){
      const dT=y<manualVals.length?manualVals[y]:0;
      dedAByYear.push(dT);dedBByYear.push(0);
      dedByYear.push(dT);
      dedItaxA.push(dT);dedJtaxA.push(0);dedItaxB.push(0);dedJtaxB.push(0);
      dedTotalA+=dT;dedTotal+=dT;
    }
  }else{
    for(let y=0;y<dedYrs;y++){
      const balAEnd=y<dataA.length?dataA[y].balance:0;
      const balBEnd=y<normalB.length?normalB[y].balance:0;
      let rawA=Math.round(Math.min(balAEnd,dedLimit)*dedRate);
      let rawB=_isPairLoan?Math.round(Math.min(balBEnd,dedLimit)*dedRate):0;
      // A: 所得税から控除→残りを住民税（上限jCapH万円）
      let itPartA=hasTaxLimit?Math.min(rawA,itaxH*10000):rawA;
      let remA=rawA-itPartA;
      let jtPartA=hasTaxLimit?Math.min(remA,jCapH*10000):0;
      let dA=hasTaxLimit?Math.round(itPartA+jtPartA):rawA;
      // B: 同様
      let itPartB=hasTaxLimitW?Math.min(rawB,itaxW*10000):rawB;
      let remB=rawB-itPartB;
      let jtPartB=hasTaxLimitW?Math.min(remB,jCapW*10000):0;
      let dB=(_isPairLoan&&hasTaxLimitW)?Math.round(itPartB+jtPartB):rawB;
      dedAByYear.push(dA);dedBByYear.push(dB);
      dedByYear.push(dA+dB);
      dedItaxA.push(Math.round(itPartA));dedJtaxA.push(Math.round(jtPartA));
      dedItaxB.push(Math.round(itPartB));dedJtaxB.push(Math.round(jtPartB));
      dedTotalA+=dA;dedTotalB+=dB;
      dedTotal+=dA+dB;
    }
  }
  if($('lp-ded-total')){
    if(dedLimitMan<=0){$('lp-ded-total').textContent='対象外'}
    else if(_isPairLoan&&amtB>0){
      $('lp-ded-total').innerHTML=`${Math.round(dedTotal/10000).toLocaleString()} 万円（${dedYrs}年間）<span style="font-size:10px;color:var(--muted);margin-left:8px">A: ${Math.round(dedTotalA/10000).toLocaleString()}万円 / B: ${Math.round(dedTotalB/10000).toLocaleString()}万円</span>`;
    }else{
      $('lp-ded-total').textContent=`${Math.round(dedTotal/10000).toLocaleString()} 万円（${dedYrs}年間）`;
    }
  }
  // 控除額の年別内訳テーブル（所得税/住民税内訳付き）
  const dedWrap=$('lp-ded-detail-wrap');
  if(dedWrap&&dedYrs>0&&dedLimitMan>0){
    const showPairDed=_isPairLoan&&amtB>0;
    const tp='padding:3px 6px;text-align:right;font-size:10px;white-space:nowrap';
    const th2='padding:3px 5px;font-size:9px;white-space:nowrap';
    let dt=`<details open style="margin-top:4px"><summary style="font-size:11px;font-weight:700;color:var(--navy);cursor:pointer;user-select:none">📋 控除額の年別内訳（${dedYrs}年間）</summary>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:10px">
      <thead>`;
    // 2行ヘッダー
    if(showPairDed){
      dt+=`<tr style="background:var(--navy);color:#fff">
        <th rowspan="2" style="${th2};text-align:center;width:28px">年</th>
        <th colspan="${hasTaxLimit?4:3}" style="${th2};text-align:center;background:#1e40af;border-bottom:1px solid rgba(255,255,255,.3)">🅰 ご本人様</th>
        <th colspan="${hasTaxLimitW?4:3}" style="${th2};text-align:center;background:#92400e;border-bottom:1px solid rgba(255,255,255,.3)">🅱 配偶者</th>
        <th rowspan="2" style="${th2};text-align:right;background:#065f46">合計</th>
      </tr><tr style="background:var(--navy);color:#fff;font-size:9px">
        <th style="${th2};background:#1e40af">年末残高</th><th style="${th2};background:#1e40af">所得税</th><th style="${th2};background:#1e40af">住民税</th>`;
      if(hasTaxLimit)dt+=`<th style="${th2};background:#1e40af">控除計</th>`;
      dt+=`<th style="${th2};background:#92400e">年末残高</th><th style="${th2};background:#92400e">所得税</th><th style="${th2};background:#92400e">住民税</th>`;
      if(hasTaxLimitW)dt+=`<th style="${th2};background:#92400e">控除計</th>`;
      dt+=`</tr>`;
    }else{
      dt+=`<tr style="background:var(--navy);color:#fff">
        <th style="${th2};text-align:center;width:28px">年</th>
        <th style="${th2}">年末残高</th><th style="${th2}">所得税控除</th><th style="${th2}">住民税控除</th><th style="${th2};font-weight:700">控除合計</th>
      </tr>`;
    }
    dt+=`</thead><tbody>`;
    let sumItA=0,sumJtA=0,sumItB=0,sumJtB=0;
    for(let y=0;y<dedYrs;y++){
      const bg=y%2===0?'#fff':'#f8fafc';
      const balA=y<dataA.length?dataA[y].balance:0;
      const balB=y<normalB.length?normalB[y].balance:0;
      const iA=dedItaxA[y]||0,jA=dedJtaxA[y]||0;
      const iB=dedItaxB[y]||0,jB=dedJtaxB[y]||0;
      const dA=dedAByYear[y]||0,dB=dedBByYear[y]||0,dT=dedByYear[y]||0;
      sumItA+=iA;sumJtA+=jA;sumItB+=iB;sumJtB+=jB;
      if(showPairDed){
        dt+=`<tr style="background:${bg}">
          <td style="${tp};text-align:center;font-weight:700">${y+1}</td>
          <td style="${tp};background:${y%2===0?'#eff6ff':'#e8f1fc'}">${Math.round(balA).toLocaleString()}</td>
          <td style="${tp};color:#2563eb;background:${y%2===0?'#eff6ff':'#e8f1fc'}">${Math.round(iA).toLocaleString()}</td>
          <td style="${tp};color:#7c3aed;background:${y%2===0?'#eff6ff':'#e8f1fc'}">${Math.round(jA).toLocaleString()}</td>`;
        if(hasTaxLimit)dt+=`<td style="${tp};font-weight:700;color:#059669;background:${y%2===0?'#eff6ff':'#e8f1fc'}">${Math.round(dA).toLocaleString()}</td>`;
        dt+=`<td style="${tp};background:${y%2===0?'#fef7ed':'#fdf2e2'}">${Math.round(balB).toLocaleString()}</td>
          <td style="${tp};color:#2563eb;background:${y%2===0?'#fef7ed':'#fdf2e2'}">${Math.round(iB).toLocaleString()}</td>
          <td style="${tp};color:#7c3aed;background:${y%2===0?'#fef7ed':'#fdf2e2'}">${Math.round(jB).toLocaleString()}</td>`;
        if(hasTaxLimitW)dt+=`<td style="${tp};font-weight:700;color:#047857;background:${y%2===0?'#fef7ed':'#fdf2e2'}">${Math.round(dB).toLocaleString()}</td>`;
        dt+=`<td style="${tp};font-weight:700;color:#065f46">${Math.round(dT).toLocaleString()}</td></tr>`;
      }else{
        dt+=`<tr style="background:${bg}">
          <td style="${tp};text-align:center;font-weight:700">${y+1}</td>
          <td style="${tp}">${Math.round(balA).toLocaleString()}</td>
          <td style="${tp};color:#2563eb">${Math.round(iA).toLocaleString()}</td>
          <td style="${tp};color:#7c3aed">${Math.round(jA).toLocaleString()}</td>
          <td style="${tp};font-weight:700;color:#065f46">${Math.round(dA).toLocaleString()}</td></tr>`;
      }
    }
    // 合計行
    dt+=`<tr style="background:var(--navy);color:#fff;font-weight:700">
      <td style="${tp};text-align:center">計</td><td style="${tp}">-</td>
      <td style="${tp}">${Math.round(sumItA).toLocaleString()}</td><td style="${tp}">${Math.round(sumJtA).toLocaleString()}</td>`;
    if(showPairDed){
      if(hasTaxLimit)dt+=`<td style="${tp}">${Math.round(dedTotalA).toLocaleString()}</td>`;
      dt+=`<td style="${tp}">-</td><td style="${tp}">${Math.round(sumItB).toLocaleString()}</td><td style="${tp}">${Math.round(sumJtB).toLocaleString()}</td>`;
      if(hasTaxLimitW)dt+=`<td style="${tp}">${Math.round(dedTotalB).toLocaleString()}</td>`;
    }
    dt+=`<td style="${tp}">${Math.round(dedTotal).toLocaleString()}</td></tr>`;
    dt+=`</tbody></table></div></details>`;
    dedWrap.innerHTML=dt;
  }else if(dedWrap){dedWrap.innerHTML='';}
  // 効果表示
  if(ppAmountTotal>0){
    const typeLabel=_ppType==='term'?'期間短縮型':'返済額軽減型';
    $('lp-effect').innerHTML=`
      <div style="font-size:10px;font-weight:700;color:var(--teal);margin-bottom:8px;padding:3px 8px;background:#e0f7f3;border-radius:4px;display:inline-block">${typeLabel}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px">
        <div style="background:#f8fafc;border-radius:var(--rs);padding:10px;text-align:center">
          <div style="color:var(--muted);font-size:10px;margin-bottom:4px">繰上返済に必要な元金</div>
          <div style="font-size:18px;font-weight:800;color:var(--navy)">${Math.round(ppAmountTotal).toLocaleString()}<span style="font-size:11px">円</span></div>
          <div style="font-size:10px;color:var(--muted)">（${Math.round(ppAmountTotal/10000).toLocaleString()}万円）</div>
        </div>
        <div style="background:#fef2f2;border-radius:var(--rs);padding:10px;text-align:center">
          <div style="color:var(--muted);font-size:10px;margin-bottom:4px">利息軽減額</div>
          <div style="font-size:18px;font-weight:800;color:#dc2626">${Math.round(ppSavedTotal).toLocaleString()}<span style="font-size:11px">円</span></div>
          <div style="font-size:10px;color:var(--muted)">（${Math.round(ppSavedTotal/10000).toLocaleString()}万円）</div>
        </div>
      </div>`;
  }else{
    const nTotIntA=normalA.reduce((s,r)=>s+r.interest,0);
    const nTotIntB=normalB.reduce((s,r)=>s+r.interest,0);
    const nTotPayA=normalA.reduce((s,r)=>s+r.pay,0);
    const nTotPayB=normalB.reduce((s,r)=>s+r.pay,0);
    let pairDetail='';
    if(_isPairLoan&&amtB>0){
      pairDetail=`<div style="border-top:1px solid var(--border);margin-top:6px;padding-top:6px">
        <div style="font-size:10px;font-weight:700;color:var(--navy);margin-bottom:4px">内訳</div>
        <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:2px 8px;font-size:11px">
          <span></span><span style="color:var(--muted);font-size:10px">総返済額</span><span style="color:var(--muted);font-size:10px">うち利息</span>
          <span style="font-weight:700;color:#2563eb">A</span><span>${Math.round(nTotPayA/10000).toLocaleString()}万円</span><span style="color:#dc2626">${Math.round(nTotIntA/10000).toLocaleString()}万円</span>
          <span style="font-weight:700;color:#b45309">B</span><span>${Math.round(nTotPayB/10000).toLocaleString()}万円</span><span style="color:#dc2626">${Math.round(nTotIntB/10000).toLocaleString()}万円</span>
        </div></div>`;
    }
    $('lp-effect').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
        <div><span style="color:var(--muted)">総返済額</span><br><strong style="color:var(--navy)">${Math.round((nTotPayA+nTotPayB)/10000).toLocaleString()}</strong> 万円</div>
        <div><span style="color:var(--muted)">うち利息</span><br><strong style="color:#dc2626">${Math.round((nTotIntA+nTotIntB)/10000).toLocaleString()}</strong> 万円</div>
      </div>${pairDetail}`;
  }
  // テーブル生成
  const showPair=_isPairLoan&&amtB>0;
  const td='padding:3px 6px;text-align:right;font-size:11px;white-space:nowrap';
  const thS='padding:4px 6px;font-size:10px;white-space:nowrap';
  const thG='padding:3px 6px;font-size:10px;font-weight:700;text-align:center;border-bottom:2px solid rgba(255,255,255,.3)';
  let colsA=5,ppCol=withPPA?2:0,dedCol=showPair?3:1;
  let t=`<table class="cf" style="font-size:11px;border-collapse:collapse"><thead>`;
  if(showPair){
    // 2行ヘッダー：グループ行
    t+=`<tr style="background:var(--navy);color:#fff">
      <th rowspan="2" style="${thS};width:30px;text-align:center;border-right:1px solid rgba(255,255,255,.2)">年</th>
      <th colspan="5" style="${thG};background:#1e40af;border-right:1px solid rgba(255,255,255,.3)">🅰 ご本人様</th>
      <th colspan="4" style="${thG};background:#92400e;border-right:1px solid rgba(255,255,255,.3)">🅱 配偶者</th>
      <th colspan="2" style="${thG};background:#065f46;border-right:1px solid rgba(255,255,255,.3)">合計</th>
      <th colspan="3" style="${thG};background:#059669;border-right:${withPPA?'1px solid rgba(255,255,255,.3)':'none'}">ローン控除</th>`;
    if(withPPA)t+=`<th colspan="2" style="${thG};background:#6b21a8">繰上効果</th>`;
    t+=`</tr><tr style="background:var(--navy);color:#fff;font-size:9px">
      <th style="${thS};background:#1e40af">返済額</th><th style="${thS};background:#1e40af">元金</th><th style="${thS};background:#1e40af">利息</th><th style="${thS};background:#1e40af">繰上</th><th style="${thS};background:#1e40af;border-right:1px solid rgba(255,255,255,.3)">残高</th>
      <th style="${thS};background:#92400e">返済額</th><th style="${thS};background:#92400e">元金</th><th style="${thS};background:#92400e">利息</th><th style="${thS};background:#92400e;border-right:1px solid rgba(255,255,255,.3)">残高</th>
      <th style="${thS};background:#14532d">返済額</th><th style="${thS};background:#14532d;border-right:1px solid rgba(255,255,255,.3)">残高</th>
      <th style="${thS};background:#059669">A</th><th style="${thS};background:#047857">B</th><th style="${thS};background:#065f46;border-right:${withPPA?'1px solid rgba(255,255,255,.3)':'none'}">計</th>`;
    if(withPPA)t+=`<th style="${thS};background:#7c3aed">通常残高</th><th style="${thS};background:#dc2626">軽減累計</th>`;
    t+=`</tr>`;
  }else{
    t+=`<tr style="background:var(--navy);color:#fff">
      <th style="${thS};width:30px;text-align:center">年</th>
      <th style="${thS}">月額</th><th style="${thS}">返済合計</th><th style="${thS}">元金</th><th style="${thS}">利息</th><th style="${thS}">繰上返済</th><th style="${thS}">元金残高</th>
      <th style="${thS};background:#059669">ローン控除</th>`;
    if(withPPA)t+=`<th style="${thS};background:#6b5ea8">通常残高</th><th style="${thS};background:#dc2626">利息軽減累計</th>`;
    t+=`</tr>`;
  }
  t+=`</thead><tbody>`;
  let cumSaved=0;
  const rowCount=Math.max(dataA.length,normalA.length,normalB.length);
  const bdR='border-right:1px solid #e2e8f0';
  for(let i=0;i<rowCount;i++){
    const rA=i<dataA.length?dataA[i]:null;
    const nrA=i<normalA.length?normalA[i]:null;
    const rB=i<normalB.length?normalB[i]:null;
    const intDiff=nrA&&rA?(nrA.interest-(rA.interest||0)):0;
    cumSaved+=intDiff;
    const bg=i%2===0?'#fff':'#f8fafc';
    const yr=i+1;
    const ded=i<dedByYear.length?dedByYear[i]:0;
    const isFinishedA=rA===null;
    if(showPair){
      const payAB=(rA?rA.pay:0)+(rB?rB.pay:0);
      const balAB=(rA?rA.balance:0)+(rB?rB.balance:0);
      t+=`<tr style="background:${bg}${isFinishedA&&!rB?';opacity:.5':''}">
        <td style="${td};text-align:center;font-weight:700;width:30px;${bdR}">${yr}</td>
        <td style="${td};background:${i%2===0?'#eff6ff':'#e8f1fc'}">${rA?Math.round(rA.pay).toLocaleString():'-'}</td>
        <td style="${td};color:#2563eb;background:${i%2===0?'#eff6ff':'#e8f1fc'}">${rA?Math.round(rA.principal).toLocaleString():'-'}</td>
        <td style="${td};color:#dc2626;background:${i%2===0?'#eff6ff':'#e8f1fc'}">${rA?Math.round(rA.interest).toLocaleString():'-'}</td>
        <td style="${td};color:#7c3aed;background:${i%2===0?'#eff6ff':'#e8f1fc'}">${rA&&rA.prepay>0?Math.round(rA.prepay).toLocaleString():'-'}</td>
        <td style="${td};font-weight:700;background:${i%2===0?'#eff6ff':'#e8f1fc'};${bdR}">${rA?Math.round(rA.balance).toLocaleString():'完済'}</td>
        <td style="${td};background:${i%2===0?'#fef7ed':'#fdf2e2'}">${rB?Math.round(rB.pay).toLocaleString():'-'}</td>
        <td style="${td};color:#2563eb;background:${i%2===0?'#fef7ed':'#fdf2e2'}">${rB?Math.round(rB.principal).toLocaleString():'-'}</td>
        <td style="${td};color:#dc2626;background:${i%2===0?'#fef7ed':'#fdf2e2'}">${rB?Math.round(rB.interest).toLocaleString():'-'}</td>
        <td style="${td};font-weight:700;background:${i%2===0?'#fef7ed':'#fdf2e2'};${bdR}">${rB?Math.round(rB.balance).toLocaleString():'完済'}</td>
        <td style="${td};font-weight:700">${Math.round(payAB).toLocaleString()}</td>
        <td style="${td};font-weight:700;${bdR}">${Math.round(balAB).toLocaleString()}</td>`;
      const dA=i<dedAByYear.length?dedAByYear[i]:0;
      const dB=i<dedBByYear.length?dedBByYear[i]:0;
      t+=`<td style="${td};color:#059669">${dA>0?Math.round(dA).toLocaleString():'-'}</td>`;
      t+=`<td style="${td};color:#047857">${dB>0?Math.round(dB).toLocaleString():'-'}</td>`;
      t+=`<td style="${td};color:#065f46;font-weight:700;${withPPA?bdR:''}">${ded>0?Math.round(ded).toLocaleString():'-'}</td>`;
      if(withPPA){
        t+=`<td style="${td};color:#888">${nrA?Math.round(nrA.balance).toLocaleString():'-'}</td>`;
        t+=`<td style="${td};color:#dc2626;font-weight:600">${cumSaved>0?Math.round(cumSaved).toLocaleString():'-'}</td>`;
      }
      t+=`</tr>`;
    }else{
      t+=`<tr style="background:${bg}${isFinishedA?';opacity:.5':''}">
        <td style="${td};text-align:center;font-weight:700;width:30px">${yr}</td>
        <td style="${td};color:#059669">${rA?(rA.monthly||0).toLocaleString():'-'}</td>
        <td style="${td}">${rA?Math.round(rA.pay).toLocaleString():'-'}</td>
        <td style="${td};color:#2563eb">${rA?Math.round(rA.principal).toLocaleString():'-'}</td>
        <td style="${td};color:#dc2626">${rA?Math.round(rA.interest).toLocaleString():'-'}</td>
        <td style="${td};color:#7c3aed;font-weight:${rA&&rA.prepay>0?700:400}">${rA&&rA.prepay>0?Math.round(rA.prepay).toLocaleString():'-'}</td>
        <td style="${td};font-weight:700">${rA?Math.round(rA.balance).toLocaleString():'完済'}</td>
        <td style="${td};color:#059669;font-weight:${ded>0?700:400}">${ded>0?Math.round(ded).toLocaleString():'-'}</td>`;
      if(withPPA){
        t+=`<td style="${td};color:#888">${nrA?Math.round(nrA.balance).toLocaleString():'-'}</td>`;
        t+=`<td style="${td};color:#dc2626;font-weight:600">${cumSaved>0?Math.round(cumSaved).toLocaleString():'-'}</td>`;
      }
      t+=`</tr>`;
    }
  }
  // 合計行
  const totPayA=dataA.reduce((s,r)=>s+r.pay,0);
  const totPrincA=dataA.reduce((s,r)=>s+r.principal,0);
  const totIntA=dataA.reduce((s,r)=>s+r.interest,0);
  const totPP=dataA.reduce((s,r)=>s+r.prepay,0);
  if(showPair){
    const totPayB=normalB.reduce((s,r)=>s+r.pay,0);
    const totPrincB=normalB.reduce((s,r)=>s+r.principal,0);
    const totIntB=normalB.reduce((s,r)=>s+r.interest,0);
    t+=`<tr style="background:var(--navy);color:#fff;font-weight:700">
      <td style="${td};text-align:center;${bdR}">計</td>
      <td style="${td};background:#1e3a5f">${Math.round(totPayA).toLocaleString()}</td>
      <td style="${td};background:#1e3a5f">${Math.round(totPrincA).toLocaleString()}</td>
      <td style="${td};background:#1e3a5f">${Math.round(totIntA).toLocaleString()}</td>
      <td style="${td};background:#1e3a5f">${totPP>0?Math.round(totPP).toLocaleString():'-'}</td>
      <td style="${td};background:#1e3a5f;${bdR}">-</td>
      <td style="${td};background:#5c3a0f">${Math.round(totPayB).toLocaleString()}</td>
      <td style="${td};background:#5c3a0f">${Math.round(totPrincB).toLocaleString()}</td>
      <td style="${td};background:#5c3a0f">${Math.round(totIntB).toLocaleString()}</td>
      <td style="${td};background:#5c3a0f;${bdR}">-</td>
      <td style="${td}">${Math.round(totPayA+totPayB).toLocaleString()}</td>
      <td style="${td};${bdR}">-</td>
      <td style="${td}">${Math.round(dedTotalA).toLocaleString()}</td>
      <td style="${td}">${Math.round(dedTotalB).toLocaleString()}</td>
      <td style="${td};${withPPA?bdR:''}">${Math.round(dedTotal).toLocaleString()}</td>`;
    if(withPPA){const nTotInt=normalA.reduce((s,r)=>s+r.interest,0);t+=`<td style="${td}">-</td><td style="${td}">${Math.round(nTotInt-totIntA).toLocaleString()}</td>`;}
    t+=`</tr>`;
  }else{
    t+=`<tr style="background:var(--navy);color:#fff;font-weight:700">
      <td style="${td};text-align:center">計</td>
      <td style="${td}">-</td>
      <td style="${td}">${Math.round(totPayA).toLocaleString()}</td>
      <td style="${td}">${Math.round(totPrincA).toLocaleString()}</td>
      <td style="${td}">${Math.round(totIntA).toLocaleString()}</td>
      <td style="${td}">${totPP>0?Math.round(totPP).toLocaleString():'-'}</td>
      <td style="${td}">-</td>
      <td style="${td}">${Math.round(dedTotal).toLocaleString()}</td>`;
    if(withPPA){const nTotInt=normalA.reduce((s,r)=>s+r.interest,0);t+=`<td style="${td}">-</td><td style="${td}">${Math.round(nTotInt-totIntA).toLocaleString()}</td>`;}
    t+=`</tr>`;
  }
  t+=`</tbody></table>`;
  $('lp-table-wrap').innerHTML=t;
}
function exportLoanExcel(){
  const amtA=(parseFloat($('lp-amt-a')?.value)||0)*10000;
  const rateA=(parseFloat($('lp-rate-a')?.value)||0)/100;
  const yrsA=parseInt($('lp-yrs-a')?.value)||35;
  const amtB=_isPairLoan?(parseFloat($('lp-amt-b')?.value)||0)*10000:0;
  const rateB=_isPairLoan?(parseFloat($('lp-rate-b')?.value)||0)/100:0;
  const yrsB=_isPairLoan?parseInt($('lp-yrs-b')?.value)||35:0;
  if(amtA<=0&&amtB<=0){alert('ローン設定を入力してください');return;}
  const ratesAx=getLPRates('a'),ratesBx=getLPRates('b');
  const normalA=amtA>0?calcAmortization(amtA,rateA,yrsA,[],'term',ratesAx):[];
  const normalB=amtB>0?calcAmortization(amtB,rateB,yrsB,[],'term',ratesBx):[];
  const showPair=_isPairLoan&&amtB>0;
  const clientName=_v('client-name')||'CF表';
  const rows=[];const types=[];
  const push=(r,t)=>{rows.push(r);types.push(t)};

  // ── 繰上返済シミュレーション結果を取得 ──
  let hasPP=false,ppTypeLabel='',ppTermFrom=0,ppTermTo=0;
  let ppAmtA=0,ppAmtB=0,ppAmtTotal=0,ppSaved=0;
  let withPPA=null,withPPB=null;
  let ppReduceAmt=0,ppReduceNewMP=0;

  if(_ppType==='term'){
    ppTermFrom=parseInt($('pp-term-from')?.value)||0;
    ppTermTo=parseInt($('pp-term-to')?.value)||0;
    if(ppTermFrom>0&&ppTermTo>=ppTermFrom){
      ppTypeLabel='期間短縮型';
      if(normalA.length>0){
        const bfA=ppTermFrom<=1?amtA:(ppTermFrom-1<=normalA.length?normalA[ppTermFrom-2]?.balance||0:0);
        const afA=ppTermTo<=normalA.length?normalA[ppTermTo-1]?.balance||0:0;
        ppAmtA=Math.max(0,bfA-afA);
        if(ppAmtA>0)withPPA=calcAmortization(amtA,rateA,yrsA,[{yr:Math.max(1,ppTermFrom-1),amt:ppAmtA}],'term',ratesAx);
      }
      if(showPair&&normalB.length>0){
        const bfB=ppTermFrom<=1?amtB:(ppTermFrom-1<=normalB.length?normalB[ppTermFrom-2]?.balance||0:0);
        const afB=ppTermTo<=normalB.length?normalB[ppTermTo-1]?.balance||0:0;
        ppAmtB=Math.max(0,bfB-afB);
        if(ppAmtB>0)withPPB=calcAmortization(amtB,rateB,yrsB,[{yr:Math.max(1,ppTermFrom-1),amt:ppAmtB}],'term',ratesBx);
      }
      ppAmtTotal=ppAmtA+ppAmtB;
      const nIntA=normalA.reduce((s,r)=>s+r.interest,0);
      const nIntB=normalB.reduce((s,r)=>s+r.interest,0);
      const ppIntA=withPPA?withPPA.reduce((s,r)=>s+r.interest,0):nIntA;
      const ppIntB=withPPB?withPPB.reduce((s,r)=>s+r.interest,0):nIntB;
      ppSaved=(nIntA-ppIntA)+(nIntB-ppIntB);
      hasPP=ppAmtTotal>0;
    }
  }else if(_ppType==='reduce'){
    ppReduceAmt=(parseFloat($('pp-reduce-amt')?.value)||0)*10000;
    if(ppReduceAmt>0){
      ppTypeLabel='返済額軽減型';
      ppAmtTotal=ppReduceAmt;
      if(normalA.length>0){
        const ratio=showPair?(amtA/(amtA+amtB)):1;
        ppAmtA=Math.round(ppReduceAmt*ratio);
        withPPA=calcAmortization(amtA,rateA,yrsA,[{yr:1,amt:ppAmtA}],'reduce',ratesAx);
      }
      if(showPair&&normalB.length>0){
        ppAmtB=ppReduceAmt-ppAmtA;
        withPPB=calcAmortization(amtB,rateB,yrsB,[{yr:1,amt:ppAmtB}],'reduce',ratesBx);
      }
      const nIntA=normalA.reduce((s,r)=>s+r.interest,0);
      const nIntB=normalB.reduce((s,r)=>s+r.interest,0);
      const ppIntA=withPPA?withPPA.reduce((s,r)=>s+r.interest,0):nIntA;
      const ppIntB=withPPB?withPPB.reduce((s,r)=>s+r.interest,0):nIntB;
      ppSaved=(nIntA-ppIntA)+(nIntB-ppIntB);
      hasPP=true;
    }
  }

  // ── タイトル ──
  push([`${clientName} 様 返済計画シミュレーション`,''],'title');
  push([''],'blank');

  // ── ローン条件 ──
  if(showPair){
    push(['ローンA',`借入額 ${(amtA/10000).toLocaleString()}万円`,`金利 ${(rateA*100)}%`,`期間 ${yrsA}年`],'info');
    push(['ローンB',`借入額 ${(amtB/10000).toLocaleString()}万円`,`金利 ${(rateB*100)}%`,`期間 ${yrsB}年`],'info');
  }else{
    push(['ローン条件',`借入額 ${(amtA/10000).toLocaleString()}万円`,`金利 ${(rateA*100)}%`,`期間 ${yrsA}年`],'info');
  }

  // ── 繰上返済シミュレーション情報 ──
  if(hasPP){
    push([''],'blank');
    push(['繰上返済シミュレーション','','',''],'ppHeader');
    push(['タイプ',ppTypeLabel,'',''],'ppInfo');
    if(_ppType==='term'){
      push(['短縮期間',`${ppTermFrom}年目〜${ppTermTo}年目（${ppTermTo-ppTermFrom+1}年間）`,'',''],'ppInfo');
    }
    push(['繰上返済に必要な元金',`${Math.round(ppAmtTotal).toLocaleString()}円`,'',''],'ppInfo');
    push(['利息軽減額',`${Math.round(ppSaved).toLocaleString()}円`,'',''],'ppResult');
    if(showPair){
      push(['','A: '+Math.round(ppAmtA).toLocaleString()+'円','B: '+Math.round(ppAmtB).toLocaleString()+'円',''],'ppDetail');
    }
  }

  push([''],'blank');

  // ── ヘッダー ──
  if(showPair){
    push(['年次','A返済額','A元金','A利息','A繰上返済','A残高','B返済額','B元金','B利息','B残高','合計返済額','合計残高'],'header');
  }else{
    push(['年次','月額','返済合計','元金','利息','繰上返済','元金残高'],'header');
  }

  // ── データ行（繰上返済ありの場合はそちらを使用） ──
  const dataA=hasPP&&withPPA?withPPA:normalA;
  const dataB=hasPP&&withPPB?withPPB:normalB;
  const maxLen=Math.max(dataA.length,dataB.length);
  let totPayA=0,totPrincA=0,totIntA=0,totPPA2=0,totPayB=0,totPrincB=0,totIntB=0;
  for(let i=0;i<maxLen;i++){
    const rA=i<dataA.length?dataA[i]:null;
    const rB=i<dataB.length?dataB[i]:null;
    if(rA){totPayA+=rA.pay;totPrincA+=rA.principal;totIntA+=rA.interest;totPPA2+=rA.prepay;}
    if(rB){totPayB+=rB.pay;totPrincB+=rB.principal;totIntB+=rB.interest;}
    if(showPair){
      push([
        i+1,
        rA?Math.round(rA.pay):'-',rA?Math.round(rA.principal):'-',rA?Math.round(rA.interest):'-',
        rA&&rA.prepay>0?Math.round(rA.prepay):'-',rA?Math.round(rA.balance):'-',
        rB?Math.round(rB.pay):'-',rB?Math.round(rB.principal):'-',rB?Math.round(rB.interest):'-',
        rB?Math.round(rB.balance):'-',
        Math.round((rA?rA.pay:0)+(rB?rB.pay:0)),
        Math.round((rA?rA.balance:0)+(rB?rB.balance:0))
      ],'data');
    }else{
      push([
        i+1,rA?(rA.monthly||0):'-',rA?Math.round(rA.pay):'-',
        rA?Math.round(rA.principal):'-',rA?Math.round(rA.interest):'-',
        rA&&rA.prepay>0?Math.round(rA.prepay):'-',rA?Math.round(rA.balance):'-'
      ],'data');
    }
  }
  // 合計行
  if(showPair){
    push(['合計',Math.round(totPayA),Math.round(totPrincA),Math.round(totIntA),Math.round(totPPA2),'-',
      Math.round(totPayB),Math.round(totPrincB),Math.round(totIntB),'-',
      Math.round(totPayA+totPayB),'-'],'total');
  }else{
    push(['合計','-',Math.round(totPayA),Math.round(totPrincA),Math.round(totIntA),Math.round(totPPA2),'-'],'total');
  }

  // ── Excel生成 ──
  const ws=XLSX.utils.aoa_to_sheet(rows);
  const colCount=showPair?12:7;
  ws['!cols']=[{wch:22},{wch:18},...Array(colCount-2).fill({wch:14})];
  // セル結合（タイトル行、繰上返済情報行）
  if(!ws['!merges'])ws['!merges']=[];
  ws['!merges'].push({s:{r:0,c:0},e:{r:0,c:Math.min(colCount-1,5)}});// タイトル行結合
  // 繰上返済情報行の結合（B列以降を結合して文字が見切れないように）
  types.forEach((t,ri)=>{
    if(t==='ppHeader'||t==='ppInfo'||t==='ppResult'||t==='ppDetail'){
      ws['!merges'].push({s:{r:ri,c:1},e:{r:ri,c:Math.min(colCount-1,3)}});
    }
    if(t==='info'){
      ws['!merges'].push({s:{r:ri,c:1},e:{r:ri,c:Math.min(colCount-1,3)}});
    }
  });
  // スタイル
  rows.forEach((row,ri)=>{
    const t=types[ri];
    row.forEach((v,ci)=>{
      const ref=XLSX.utils.encode_cell({r:ri,c:ci});
      if(!ws[ref])ws[ref]={v:v,t:typeof v==='number'?'n':'s'};
      const cell=ws[ref];
      if(!cell.s)cell.s={};
      if(t==='title')cell.s={font:{bold:true,sz:14,color:{rgb:'1A3A6A'}},fill:{fgColor:{rgb:'EEF5FF'}}};
      else if(t==='header')cell.s={font:{bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1A3A6A'}},alignment:{horizontal:'center'}};
      else if(t==='info')cell.s={font:{sz:10,color:{rgb:'1A3A6A'}},fill:{fgColor:{rgb:'EEF5FF'}}};
      else if(t==='ppHeader')cell.s={font:{bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'059669'}}};
      else if(t==='ppInfo')cell.s={font:{sz:10,color:{rgb:'1A3A6A'}},fill:{fgColor:{rgb:'D1FAE5'}}};
      else if(t==='ppResult')cell.s={font:{bold:true,sz:11,color:{rgb:'DC2626'}},fill:{fgColor:{rgb:'FEF2F2'}}};
      else if(t==='ppDetail')cell.s={font:{sz:9,color:{rgb:'6B7280'}},fill:{fgColor:{rgb:'F0FDF4'}}};
      else if(t==='total')cell.s={font:{bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1A3A6A'}},numFmt:'#,##0'};
      else if(t==='data'){
        cell.s={font:{sz:10},alignment:{horizontal:ci===0?'center':'right'}};
        if(typeof v==='number')cell.s.numFmt='#,##0';
      }
    });
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'返済計画');
  XLSX.writeFile(wb,`${clientName}様_返済計画.xlsx`);
}
