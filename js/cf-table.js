// cf-table.js — CF表HTML描画
// ===== CF表レンダリング =====
function renderTable(R,total,disp,cLbls,cYear,loanAmt,isM,hAge,retAge,children,delivery){
  const nm=_v('client-name')||'お客様';
  const _isFlat_t=loanCategory==='flat35';

  // 前提条件の値を取得
  const housePrice=fv('house-price')||0;
  const downPay=fv('down-payment')||0;
  const loanYrsV=_isFlat_t?(iv('flat-loan-yrs')||35):(iv('loan-yrs')||35);
  const rateBaseV=_isFlat_t?(fv('flat-rate-base')||1.94):(fv('rate-base')||0.5);
  const deliveryYrV=iv('delivery-year')||0;
  const rates=_isFlat_t?getFlat35Rates():getRates();
  const _rateChips=(rArr)=>{
    if(rArr.length<=1)return '';
    return rArr.slice(1).map(s=>{
      const yr=s.from+1;
      return chip('📈',`${yr}年目〜`,`${s.rate.toFixed(2)}%`);
    }).join('');
  };

  // 逝去・退職列インデックス計算
  const _isSingle_t=householdType==='single';
  const wAge0=iv('wife-age');
  const hDeathAge=iv('h-death-age')||83,wDeathAge=_isSingle_t?0:(iv('w-death-age')||88);
  const wRetireAge=iv('w-retire-age');
  const hDeathCol=hDeathAge>hAge?hDeathAge-hAge:-1;
  const wDeathCol=wDeathAge>wAge0?wDeathAge-wAge0:-1;
  const hRetireCol=retAge>hAge?retAge-hAge:-1;
  const wRetireCol=wRetireAge>wAge0?wRetireAge-wAge0:-1;
  const getColCls=i=>{let c='';if(i===hDeathCol||i===wDeathCol)c+=' col-death';if(i===hRetireCol||i===wRetireCol)c+=' col-retire';return c;};

  // 詳細ボックス（自己資金の内訳＋住宅ローン条件）の折りたたみ状態
  const _cfSumHidden = (()=>{try{return localStorage.getItem('cf_summary_collapsed')==='1'}catch(e){return false}})();
  const _togLabel = _cfSumHidden ? '▸ 詳細を表示' : '▾ 詳細を隠す';

  // お客様名・物件タイプバッジ
  let h=`<div class="r-summary"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <span style="background:var(--navy);color:#fff;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:600">${nm} 様</span>
      <span style="background:${isM?'var(--teal)':'var(--green)'};color:#fff;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:600">${isM?'🏢 マンション':'🏡 戸建て'}</span>
      <span style="font-size:11px;color:var(--muted)">全${total}年間 / ご主人${hAge}〜${hAge+total-1}歳</span>
    </div>
    <button id="cf-summary-toggle" onclick="toggleCfSummaryDetail()" title="自己資金内訳と住宅ローン条件の詳細ボックスを表示／非表示" style="background:#eef5ff;color:#1e5a9a;border:1px solid #c8d6e8;padding:3px 10px;border-radius:5px;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;white-space:nowrap">${_togLabel}</button>
  </div>`;

  // 詳細ボックスをまとめて折りたたみ可能なコンテナで囲む
  h+=`<div id="cf-summary-detail" style="${_cfSumHidden?'display:none':''}">`;

  // 前提条件バー：自己資金内訳 ＋ 住宅ローン条件
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const cashTotal=cashH+cashW+cashJoint;
  const houseCostV=fv('house-cost')||0;
  const movingCostV=fv('moving-cost')||0;
  const furnitureInitV=fv('furniture-init')||0;
  const _costTypeDisp=document.getElementById('cost-type')?.value||'cash';
  const downFromOwn=downType==='gift'?0:downPay;
  const houseCostDeduct=_costTypeDisp==='loan'?0:houseCostV;
  const initialOut=downFromOwn+houseCostDeduct+movingCostV+furnitureInitV;
  const cashAfter=cashTotal-initialOut;
  const cashAfterColor=cashAfter>=0?'var(--green)':'var(--red)';

  const chip=(icon,label,val,valColor)=>`<div style="display:flex;align-items:center;gap:5px;padding:6px 13px;border-right:1px solid #dce6f0;white-space:nowrap;flex-shrink:0"><span>${icon}</span><span style="color:var(--muted);font-size:10px">${label}</span><strong style="color:${valColor||'var(--navy)'};font-family:'Cascadia Code','Consolas','Menlo',monospace;font-size:11px">${val}</strong></div>`;
  const arrow=`<div style="color:#b0bec5;font-size:13px;padding:0 2px;display:flex;align-items:center">▶</div>`;

  // 行1：自己資金の内訳
  h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:6px;background:#fff">
    <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">💰 自己資金の内訳</div>
    <div style="display:flex;flex-wrap:wrap;align-items:stretch">
      ${chip('🏦','現預金合計',`${cashTotal.toLocaleString()}万円`)}
      ${arrow}
      ${downType==='gift'
        ? chip('🎁','頭金（贈与）',`${downPay.toLocaleString()}万円`,'#2d7dd2')
        : chip('💴','頭金（自己資金）',`${downPay.toLocaleString()}万円`,'var(--red)')
      }
      ${_costTypeDisp==='loan'
        ? chip('📋','諸費用（ローン組込）',`${houseCostV.toLocaleString()}万円`,'#2d7dd2')
        : chip('📋','諸費用',`${houseCostV.toLocaleString()}万円`,'var(--red)')
      }
      ${chip('🚚','引越・家具',`${(movingCostV+furnitureInitV).toLocaleString()}万円`,'var(--red)')}
      ${arrow}
      ${chip('✅','購入後残高',`${cashAfter.toLocaleString()}万円`,cashAfterColor)}
    </div>
  </div>`;

  // 行2：住宅ローン条件
  const _flatLabel=_isFlat_t?`フラット${flat35Sub==='flat50'?'50':flat35Sub==='flat20'?'20':'35'}`:'';
  const _flatPt=_isFlat_t?calcFlat35Points():0;
  if(pairLoanMode&&!_isFlat_t){
    const lhAmtV=fv('loan-h-amt')||0, lwAmtV=fv('loan-w-amt')||0;
    const rHBaseV=fv('rate-h-base')||0.5, rWBaseV=fv('rate-w-base')||0.5;
    const lhYrsV=iv('loan-h-yrs')||35, lwYrsV=iv('loan-w-yrs')||35;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（ペアローン）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏠','住宅価格',`${housePrice.toLocaleString()}万円`)}
        ${deliveryYrV>0?chip('🔑','引き渡し',`${deliveryYrV}年`):''}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#1e5a9a;background:#f0f6ff">👔 ${_rl('age-h','ご主人様')}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏦','借入額',`${lhAmtV.toLocaleString()}万円`)}
        ${chip('📊','当初金利',`${rHBaseV}%`)}
        ${_rateChips(getPairRates('h'))}
        ${chip('📅','期間',`${lhYrsV}年`)}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#9a1e5a;background:#fff0f6">👩 ${_rl('age-w','奥様')}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏦','借入額',`${lwAmtV.toLocaleString()}万円`)}
        ${chip('📊','当初金利',`${rWBaseV}%`)}
        ${_rateChips(getPairRates('w'))}
        ${chip('📅','期間',`${lwYrsV}年`)}
      </div>
    </div>`;
  } else if(_isFlat_t&&pairLoanMode){
    const _fhAmtV=fv('flat-loan-h-amt')||0, _fwAmtV=fv('flat-loan-w-amt')||0;
    const _fhYrsV=iv('flat-loan-h-yrs')||35, _fwYrsV=iv('flat-loan-w-yrs')||35;
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（${_flatLabel} ペアローン）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏠','住宅価格',`${housePrice.toLocaleString()}万円`)}
        ${chip('📊','ベース金利',`${rateBaseV}%`)}
        ${_flatPt>0?chip('⭐','ポイント',`${_flatPt}pt`,'#d63a2a'):''}
        ${_rateChips(rates)}
        ${deliveryYrV>0?chip('🔑','引き渡し',`${deliveryYrV}年`):''}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#1e5a9a;background:#f0f6ff">👔 ${_rl('age-h','ご主人様')}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏦','借入額',`${_fhAmtV.toLocaleString()}万円`)}
        ${chip('📅','期間',`${_fhYrsV}年`)}
      </div>
      <div style="border-top:1px solid #dce6f0;padding:2px 8px;font-size:9px;font-weight:700;color:#9a1e5a;background:#fff0f6">👩 ${_rl('age-w','奥様')}</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏦','借入額',`${_fwAmtV.toLocaleString()}万円`)}
        ${chip('📅','期間',`${_fwYrsV}年`)}
      </div>
    </div>`;
  } else if(_isFlat_t){
    const _red=getFlat35Reductions(_flatPt);
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件（${_flatLabel}）</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏠','住宅価格',`${housePrice.toLocaleString()}万円`)}
        ${chip('🏦','借入総額',`${loanAmt.toLocaleString()}万円`)}
        ${chip('📊','ベース金利',`${rateBaseV}%`)}
        ${_flatPt>0?chip('⭐','ポイント',`${_flatPt}pt`,'#d63a2a'):''}
        ${_rateChips(rates)}
        ${chip('📅','借入期間',`${loanYrsV}年`)}
        ${deliveryYrV>0?chip('🔑','引き渡し',`${deliveryYrV}年`):''}
      </div>
    </div>`;
  } else {
    h+=`<div style="border:1.5px solid #c8d6e8;border-radius:var(--rs);overflow:hidden;margin-bottom:10px;background:#fff">
      <div style="background:#eef5ff;padding:3px 12px;font-size:9px;font-weight:700;color:#2d5282;letter-spacing:.06em;border-bottom:1px solid #c8d6e8">🏦 住宅ローン条件</div>
      <div style="display:flex;flex-wrap:wrap;align-items:stretch">
        ${chip('🏠','住宅価格',`${housePrice.toLocaleString()}万円`)}
        ${chip('🏦','借入総額',`${loanAmt.toLocaleString()}万円`)}
        ${chip('📊','当初金利',`${rateBaseV}%`)}
        ${_rateChips(rates)}
        ${chip('📅','借入期間',`${loanYrsV}年`)}
        ${deliveryYrV>0?chip('🔑','引き渡し',`${deliveryYrV}年`):''}
      </div>
    </div>`;
  }

  h+=`</div><!-- /cf-summary-detail --></div><div class="tbl-wrap"><table class="cf"><thead>`;
  // 年ヘッダー（先頭年はクリックで編集可能）
  const _shkIsActive = (typeof isShockActiveAtYear==='function')
    ? (i)=>isShockActiveAtYear(i, hAge, parseInt(document.getElementById('wife-age')?.value)||0)
    : ()=>false;
  h+=`<tr class="ryr"><th>カテゴリ</th><th>項目</th>`;
  for(let i=0;i<disp;i++){
    if(i===0){
      h+=`<th style="padding:0;background:var(--navy)" title="クリックして開始年を変更"><div style="font-size:8px;font-weight:500;background:#fbbf24;color:#1a1a1a;padding:1px 2px;line-height:1.15;letter-spacing:-.02em;white-space:nowrap">📅開始年を設定</div><div contenteditable="true" data-cf-start-year="1" style="cursor:text;padding:3px 4px;outline:none;color:#fff;background:var(--navy)" onfocus="selectAll(this)" onblur="setCfStartYearFromCell(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${R.yr[i]}</div></th>`;
    }else{
      h+=`<th>${R.yr[i]}</th>`;
    }
  }
  h+=`<th>合計</th></tr>`;

  // 経過年数（ネイビー地で年ヘッダーと連続させる）
  h+=`<tr class="relapsed"><td>経過年</td><td></td>`;
  for(let i=0;i<disp;i++)h+=`<td>${i+1}</td>`;h+=`<td style="background:#0f2744;color:#8aa4bc">-</td></tr>`;

  // 年齢
  h+=`<tr class="rage"><td data-row="hAge">年齢</td><td contenteditable="true" data-rowlbl="age-h" data-default="ご主人様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('age-h','ご主人様')}</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.hA[i]}</td>`;h+=`<td></td></tr>`;
  if(!_isSingle_t){h+=`<tr class="rage"><td data-row="wAge"></td><td contenteditable="true" data-rowlbl="age-w" data-default="奥様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('age-w','奥様')}</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.wA[i]}</td>`;h+=`<td></td></tr>`;}
  children.forEach((c,ci)=>{h+=`<tr class="rage"><td data-row="cAge${ci}"></td><td contenteditable="true" data-rowlbl="age-c${ci}" data-default="${cLbls[ci]}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('age-c'+ci,cLbls[ci])}</td>`;for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.cA[ci][i]}</td>`;h+=`<td></td></tr>`});

  // イベント：ご主人様
  h+=`<tr class="rev-h"><td>イベント</td><td contenteditable="true" data-rowlbl="ev-h" data-default="ご主人様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('ev-h','ご主人様')}</td>`;
  for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.evH[i]}</td>`;h+=`<td></td></tr>`;
  // イベント：奥様
  if(!_isSingle_t){h+=`<tr class="rev-w"><td></td><td contenteditable="true" data-rowlbl="ev-w" data-default="奥様" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('ev-w','奥様')}</td>`;
  for(let i=0;i<disp;i++)h+=`<td class="${getColCls(i).trim()}">${R.evW[i]}</td>`;h+=`<td></td></tr>`;}
  // イベント：子ども（フェーズ別色クラス付与）
  children.forEach((c,ci)=>{
    h+=`<tr class="rev-c"><td></td><td contenteditable="true" data-rowlbl="ev-c${ci}" data-default="${cLbls[ci]}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${_rl('ev-c'+ci,cLbls[ci])}</td>`;
    for(let i=0;i<disp;i++){
      const ca=R.cA[ci][i];
      let cls='',label='';
      // 年度ベース（4月入学）：+1シフト
      const hStartAge=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
      const hType=_v(`hoiku-type-${ci+1}`)||'hoikuen';
      const hLabel=hType==='youchien'?'幼稚園入園':'保育園入園';
      if(ca===0)label='誕生';
      else if(ca>=hStartAge&&ca<=6){cls='ev-hoiku';if(ca===hStartAge)label=hLabel}
      else if(ca>=7&&ca<=12){cls='ev-elem';if(ca===7)label='小学入学'}
      else if(ca>=13&&ca<=15){cls='ev-mid';if(ca===13)label='中学入学'}
      else if(ca>=16&&ca<=18){cls='ev-high';if(ca===16)label='高校入学'}
      else if(ca>=19){
        const un=_v(`cu-${ci+1}`)||'plit_h';
        const univLen=(EDU.univ[un]||[]).length;
        if(univLen>0&&ca<19+univLen){
          cls=un.startsWith('senmon')?'ev-senmon':'ev-univ';
          if(ca===19)label=un.startsWith('senmon')?'専門入学':'大学入学';
        }
      }
      h+=`<td class="${cls}${getColCls(i)}">${label}</td>`;
    }
    h+=`<td></td></tr>`;
  });
  h+=`</thead><tbody>`;

  // カスタム行レンダラー
  const _customRow=(row,disp,cls)=>{
    let tot=0;
    let r=`<tr class="${cls}"><td><button onclick="deleteCustomRow('${row.id}')" class="btn-del-row" title="行を削除">×</button></td><td contenteditable="true" data-custom-id="${row.id}" onblur="customLabelEdit(this)" class="custom-lbl">${row.label}</td>`;
    for(let i=0;i<disp;i++){
      const v=cfOverrides[row.id]?.[i]||0;
      tot+=v;
      const isOvr=cfOverrides[row.id]?.[i]!==undefined;
      r+=`<td class="${v===0?'vz':''}${isOvr?' cell-ovr':''}${getColCls(i)}" contenteditable="true" data-row="${row.id}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${v>0?ri(v).toLocaleString():'-'}</td>`;
    }
    return r+`<td>${tot>0?ri(tot).toLocaleString():'-'}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${row.label}</span></td></tr>`;
  };

  // ─ 収入 ─
  h+=`<tr class="rcat inc-cat"><td></td><td>収　　入</td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const _hasExplain=(typeof isExplainEnabled==='function')?isExplainEnabled:(()=>false);
  const _explainIcon=(typeof explainIconHtml==='function')?explainIconHtml:(()=>'');
  const iRow=(lbl,arr,rowKey)=>{const dl=_rl(rowKey,lbl);let tot=0;const vals=arr.slice(0,disp);for(let i=0;i<vals.length;i++){const ov=cfOverrides[rowKey]?.[i];tot+=ri(ov!==undefined?ov:vals[i]);}if(tot===0&&vals.every(v=>v===0||v===undefined))return'';const _exp=_hasExplain(rowKey);let r=`<tr class="rinc"><td></td><td contenteditable="true" data-rowlbl="${rowKey}" data-default="${lbl}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dl}</td>`;for(let i=0;i<disp;i++){const v=arr[i];const ov=cfOverrides[rowKey]?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;const _hasValue=dv>0;const _showIcon=_exp&&_hasValue;const _icon=_showIcon?_explainIcon(rowKey,i,'cf'):'';r+=`<td class="${dv===0?'vz':''}${isOvr?' cell-ovr':''}${_showIcon?' has-explain':''}${getColCls(i)}" contenteditable="true" data-row="${rowKey}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dv>0?ri(dv).toLocaleString():'-'}${_icon}</td>`}return r+`<td>${tot.toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`};
  // 収入行：年収 → 退職金 → 年金系 → 金融商品解約系 → 奨学金 → 児童手当 → 控除
  const _hLbl=_isSingle_t?'手取年収':'ご主人手取年収';
  h+=iRow(_hLbl,R.hInc,'hInc');
  h+=iRow(_isSingle_t?'iDeCo/DC節税':'iDeCo/DC節税(主)',R.dcTaxSavingH,'dcTaxSavingH');
  if(!_isSingle_t){
    h+=iRow('奥様手取年収',R.wInc,'wInc');
    h+=iRow('iDeCo/DC節税(奥様)',R.dcTaxSavingW,'dcTaxSavingW');
  }
  h+=iRow('副業・その他収入',R.otherInc,'otherInc');
  h+=iRow(_isSingle_t?'退職金':'退職金（ご主人）',R.rPay,'rPay');
  if(!_isSingle_t)h+=iRow('退職金（奥様）',R.wRPay,'wRPay');
  h+=iRow(_isSingle_t?'年金受給額':'ご主人年金受給額',R.pTotalH,'pTotalH');
  if(!_isSingle_t)h+=iRow('奥様年金受給額',R.pTotalW,'pTotalW');
  h+=iRow(_isSingle_t?'DC受取':'DC受取(主)',R.dcReceiptH,'dcReceiptH');
  if(!_isSingle_t)h+=iRow('DC受取(奥様)',R.dcReceiptW,'dcReceiptW');
  h+=iRow(_isSingle_t?'iDeCo受取':'iDeCo受取(主)',R.idecoReceiptH,'idecoReceiptH');
  if(!_isSingle_t)h+=iRow('iDeCo受取(奥様)',R.idecoReceiptW,'idecoReceiptW');
  h+=iRow('保険満期金',R.insMat,'insMat');
  // 有価証券解約：銘柄ごとに個別行で表示
  if(R.secRedeemRows){R.secRedeemRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=iRow(row.lbl,row.vals,row.key);});}
  h+=iRow('奨学金',R.scholarship,'scholarship')+iRow('児童手当',R.teate,'teate')+iRow('住宅ローン控除',R.lCtrl,'lCtrl');
  // カスタム収入行
  cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{h+=_customRow(r,disp,'rinc');});
  h+=`<tr class="radd"><td colspan="2"><button onclick="addCustomRow('inc')" class="btn-add-row">＋ 収入行を追加</button></td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  h+=`<tr class="rinct"><td>収入合計</td><td></td>`;for(let i=0;i<disp;i++)h+=`<td>${ri(R.incT[i]).toLocaleString()}</td>`;h+=`<td>${R.incT.slice(0,disp).reduce((a,b)=>a+ri(b),0).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">収入合計</span></td></tr>`;

  // ─ 支出 ─
  h+=`<tr class="rcat exp-cat"><td></td><td>支　　出</td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  const eRow=(lbl,arr,rowKey)=>{const dl=_rl(rowKey,lbl);let tot=0;const vals=arr.slice(0,disp);for(let i=0;i<vals.length;i++){const ov=cfOverrides[rowKey]?.[i];tot+=ri(ov!==undefined?ov:vals[i]);}if(tot===0&&vals.every(v=>v===0||v===undefined))return'';let r=`<tr class="rexp"><td></td><td contenteditable="true" data-rowlbl="${rowKey}" data-default="${lbl}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dl}</td>`;for(let i=0;i<disp;i++){const v=arr[i];const ov=cfOverrides[rowKey]?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;r+=`<td class="${dv===0?'vz':''}${isOvr?' cell-ovr':''}${getColCls(i)}" contenteditable="true" data-row="${rowKey}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dv>0?ri(dv).toLocaleString():'-'}</td>`}return r+`<td>${tot.toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`};

  // 教育費専用行レンダラー（年齢に応じて色分け・univコース受け取り）
  const eduRow=(lbl,arr,childAge0,univCourse,rowKey)=>{
    const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return'';
    const un=univCourse||'plit_h';
    const univLen=(EDU.univ[un]||[]).length;
    const dl=_rl(rowKey,lbl);
    const _exp=_hasExplain(rowKey);
    let r=`<tr class="rexp"><td></td><td contenteditable="true" data-rowlbl="${rowKey}" data-default="${lbl}" onblur="rowLabelEdit(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dl}</td>`;
    for(let i=0;i<disp;i++){
      const v=arr[i];const ca=childAge0+i;
      const ov=cfOverrides[rowKey||'']?.[i];const dv=ov!==undefined?ov:v;const isOvr=ov!==undefined;
      let cls='';
      if(dv>0){
        if(ca>=1&&ca<=6)cls='edu-hoiku';
        else if(ca>=7&&ca<=12)cls='edu-elem';
        else if(ca>=13&&ca<=15)cls='edu-mid';
        else if(ca>=16&&ca<=18)cls='edu-high';
        else if(ca>=19&&ca<19+univLen)cls=un.startsWith('senmon')?'edu-senmon':'edu-univ';
      } else {cls='vz';}
      if(isOvr)cls+=' cell-ovr';
      const _showIcon=_exp&&dv>0;
      if(_showIcon)cls+=' has-explain';
      cls+=getColCls(i);
      const _icon=_showIcon?_explainIcon(rowKey,i,'cf'):'';
      r+=`<td class="${cls}" contenteditable="true" data-row="${rowKey||''}" data-col="${i}" onblur="cellEdit(this)" onfocus="selectAll(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}">${dv>0?ri(dv).toLocaleString():'-'}${_icon}</td>`;
    }
    return r+`<td>${ri(tot).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${dl}</span></td></tr>`;
  };
  // 支出行：生活費 → 住宅系 → 教育費 → 車 → 駐車場 → 積立投資 → その他
  h+=eRow('生活費',R.lc,'lc')+eRow('家賃（引渡前）',R.rent,'rent');
  if(pairLoanMode&&!_isSingle_t){h+=eRow('ローン返済(主)',R.lRepH,'lRepH')+eRow('ローン返済(奥様)',R.lRepW,'lRepW');}
  else{h+=eRow('住宅ローン返済',R.lRep,'lRep');}
  if(isM)h+=eRow('修繕積立金',R.rep,'rep');
  h+=eRow('固定資産税',R.ptx,'ptx')+eRow('家具家電買替',R.furn,'furn')+eRow(isM?'専有部分修繕費':'修繕費',R.senyu,'senyu');
  children.forEach((c,ci)=>{const uc=_v(`cu-${ci+1}`)||'plit_h';h+=eduRow(`${cLbls[ci]}教育費`,R.edu[ci],c.age,uc,`edu${ci}`);});
  if(R.carRows&&R.carRows.length>1){R.carRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else{h+=eRow('車両費（購入・車検）',R.carTotal,'carTotal');}
  h+=eRow('駐車場代',R.prk,'prk');
  if(R.secInvestRows&&R.secInvestRows.length>1){R.secInvestRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else if(R.secInvestRows&&R.secInvestRows.length===1){h+=eRow(R.secInvestRows[0].lbl,R.secInvestRows[0].vals,R.secInvestRows[0].key);}else{h+=eRow('積立投資額',R.secInvest,'secInvest');}
  h+=eRow('一括投資額',R.secBuy,'secBuy');
  if(R.insMonthlyRows&&R.insMonthlyRows.length>1){R.insMonthlyRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else if(R.insMonthlyRows&&R.insMonthlyRows.length===1){h+=eRow(R.insMonthlyRows[0].lbl,R.insMonthlyRows[0].vals,R.insMonthlyRows[0].key);}else{h+=eRow('保険料（積立）',R.insMonthly,'insMonthly');}
  if(R.insLumpExpRows&&R.insLumpExpRows.length>1){R.insLumpExpRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else if(R.insLumpExpRows&&R.insLumpExpRows.length===1){h+=eRow(R.insLumpExpRows[0].lbl,R.insLumpExpRows[0].vals,R.insLumpExpRows[0].key);}else{h+=eRow('一時払い保険',R.insLumpExp,'insLumpExp');}
  h+=eRow('結婚のお祝い',R.wedding,'wedding');
  h+=eRow(_isSingle_t?'DC拠出':'DC拠出(主)',R.dcMatchExpH,'dcMatchExpH');
  if(!_isSingle_t)h+=eRow('DC拠出(奥様)',R.dcMatchExpW,'dcMatchExpW');
  h+=eRow(_isSingle_t?'iDeCo拠出':'iDeCo拠出(主)',R.idecoExpH,'idecoExpH');
  if(!_isSingle_t)h+=eRow('iDeCo拠出(奥様)',R.idecoExpW,'idecoExpW');
  if(R.extRows&&R.extRows.length>1){R.extRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))h+=eRow(row.lbl,row.vals,row.key);});}else if(R.extRows&&R.extRows.length===1){h+=eRow(R.extRows[0].lbl,R.extRows[0].vals,R.extRows[0].key);}else{h+=eRow('特別支出',R.ext,'ext');}
  // カスタム支出行
  cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{h+=_customRow(r,disp,'rexp');});
  h+=`<tr class="radd"><td colspan="2"><button onclick="addCustomRow('exp')" class="btn-add-row">＋ 支出行を追加</button></td>`;for(let i=0;i<disp;i++)h+=`<td></td>`;h+=`<td></td></tr>`;
  h+=`<tr class="rexpt"><td>支出合計</td><td></td>`;for(let i=0;i<disp;i++)h+=`<td>${ri(R.expT[i]).toLocaleString()}</td>`;h+=`<td>${R.expT.slice(0,disp).reduce((a,b)=>a+ri(b),0).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">支出合計</span></td></tr>`;

  // ─ 収支・残高 ─
  h+=`<tr class="rbal"><td>年間収支</td><td></td>`;
  for(let i=0;i<disp;i++){const v=ri(R.bal[i]);h+=`<td class="${v<0?'vn':v>0?'vp':'vz'}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`}
  const bt=R.bal.slice(0,disp).reduce((a,b)=>a+ri(b),0);
  h+=`<td class="${bt<0?'vn':'vp'}">${bt>=0?bt.toLocaleString():'▲'+Math.abs(bt).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">年間収支</span></td></tr>`;
  const _initSavV=ri(window._purchaseInitSav||0);const _initSavTxt=_initSavV>=0?_initSavV.toLocaleString():'▲'+Math.abs(_initSavV).toLocaleString();const _initSavStyle=_initSavV<0?'color:#ffaaaa':'';
  h+=`<tr class="rsav"><td>預貯金残高</td><td><span style="font-size:11px;font-weight:400;opacity:.8">購入直後</span><br><span style="font-size:12px;font-weight:700;${_initSavStyle}">${_initSavTxt}万円</span></td>`;for(let i=0;i<disp;i++){const v=ri(R.sav[i]);h+=`<td class="${v<0?'vn':''}">${v>=0?v.toLocaleString():'▲'+Math.abs(v).toLocaleString()}</td>`}const savLast=ri(R.sav[disp-1]);h+=`<td>${savLast>=0?savLast.toLocaleString():'▲'+Math.abs(savLast).toLocaleString()}<br><span style="font-size:11px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">預貯金残高</span></td></tr>`;
  if(R.finAsset.some(v=>v>0)){
    // 個別行を表示
    // 「大きなイベント年」の色クラス: その年のシナリオと通常想定の乖離増分で判定
    // delta = (vals[i]-baseVals[i]) - (vals[i-1]-baseVals[i-1])
    // この年の動きが通常想定に比べどれだけ悪化したか(基準:baseVals[i-1])
    const _dropCls = (vals, baseVals, i)=>{
      if(!vals||!baseVals)return '';
      const v=vals[i]||0, b=baseVals[i]||0;
      if(v<=0||b<=0)return '';
      const vP=i>0?(vals[i-1]||0):0;
      const bP=i>0?(baseVals[i-1]||0):0;
      const delta=(v-b)-(vP-bP);
      const denom=Math.max(bP, b, 1);
      const ratio=delta/denom;
      if(ratio<-0.30)return ' shock-drop-heavy';
      if(ratio<-0.15)return ' shock-drop-light';
      return '';
    };
    if(R.finAssetRows&&R.finAssetRows.length>0){
      R.finAssetRows.forEach(row=>{
        if(!row.vals.slice(0,disp).some(v=>v>0))return;
        const _finKey=`fin-${row.lbl}`;
        const _exp=_hasExplain(_finKey);
        h+=`<tr class="rfin fin-asset-row"><td></td><td>${row.lbl}</td>`;
        for(let i=0;i<disp;i++){
          const v=ri(row.vals[i]||0);
          const _dCls=_dropCls(row.vals, row.baseVals, i);
          const _showIcon=_exp&&v>0;
          const _icon=_showIcon?_explainIcon(_finKey,i,'cf'):'';
          const _cls=[_showIcon?'has-explain':'', _dCls.trim()].filter(Boolean).join(' ');
          h+=`<td class="${_cls}">${v>0?v.toLocaleString():'-'}${_icon}</td>`;
        }
        h+=`<td>${ri(row.vals[disp-1]||0).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">${row.lbl}</span></td></tr>`;
      });
    }
    // 合計行（色は個別行側に付けるのでここでは付与しない）
    h+=`<tr class="rfin rfin-total fin-asset-row" style="font-weight:700"><td>その他金融資産<br>合計</td><td></td>`;
    for(let i=0;i<disp;i++){
      const v=ri(R.finAsset[i]);
      h+=`<td>${v>0?v.toLocaleString():'-'}</td>`;
    }
    h+=`<td>${ri(R.finAsset[disp-1]).toLocaleString()}<br><span style="font-size:9px;color:#2d7dd2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">金融資産計</span></td></tr>`;
  }
  // 総金融資産合計
  h+=`<tr class="rttl"><td>総金融資産</td><td></td>`;
  for(let i=0;i<disp;i++){const v=ri(R.totalAsset[i]);h+=`<td class="${v<0?'vn':''}">${v.toLocaleString()}</td>`}
  h+=`<td>${ri(R.totalAsset[disp-1]).toLocaleString()}<br><span style="font-size:9px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif;font-weight:400">総金融資産</span></td></tr>`;
  // ローン残高（一番下）
  if(!_isSingle_t&&(pairLoanMode||_isFlat_t&&pairLoanMode)){
    if(loanAmt>0||(_isFlat_t&&(fv('flat-loan-h-amt')||0)+(fv('flat-loan-w-amt')||0)>0)){
      h+=`<tr class="rloan"><td>ローン残高(主)</td><td></td>`;for(let i=0;i<disp;i++){const v=ri(R.lBalH[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`}h+=`<td></td></tr>`;
      h+=`<tr class="rloan"><td>ローン残高(奥様)</td><td></td>`;for(let i=0;i<disp;i++){const v=ri(R.lBalW[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`}h+=`<td></td></tr>`;
    }
  } else if(loanAmt>0){h+=`<tr class="rloan"><td>ローン残高</td><td></td>`;for(let i=0;i<disp;i++){const v=ri(R.lBal[i]);h+=`<td>${v>0?v.toLocaleString():'-'}</td>`}h+=`<td></td></tr>`;}

  h+=`</tbody></table>`;

  // 印刷フッター（tbl-wrap内に配置）
  const pi=getPrintInfo();
  h+=`<div class="print-footer">
    <div class="pf-left">
      ${pi.name?`<div style="font-weight:700">${pi.name}</div>`:''}
      ${pi.company?`<div>${pi.company}</div>`:''}
      ${pi.address?`<div>${pi.address}</div>`:''}
      ${pi.tel||pi.email?`<div>${pi.tel?'TEL：'+pi.tel+'　':''}${pi.email?'E-mail：'+pi.email:''}</div>`:''}
    </div>
    <div class="pf-notes">${pi.notes.filter(n=>n.trim()).map(n=>`<div>・${n}</div>`).join('')}</div>
  </div></div>`;

  // CF表モード（thead sticky用のflex列レイアウト）
  const _rb=$('right-body');
  if(_rb)_rb.classList.add('cf-mode');

  // スクロール位置を保存してからDOM置換 → 復元
  const _oldTw=_rb?_rb.querySelector('.tbl-wrap'):null;
  const _prevTop=_oldTw?_oldTw.scrollTop:(_rb?_rb.scrollTop:0);
  const _prevLeft=_oldTw?_oldTw.scrollLeft:0;
  _rb.innerHTML=h;

  // 旧万が一タブ（rt-mg-h/rt-mg-w）はQ&A UI一本化に伴い常に非表示
  const _oldH=$('rt-mg-h'); if(_oldH) _oldH.style.display='none';
  const _oldW=$('rt-mg-w'); if(_oldW) _oldW.style.display='none';

  // thead各行のsticky top値を動的計算
  applyStickyTop(_rb);

  // スクロール位置を復元（cf-modeではtbl-wrapが縦横スクロール）
  const _newTw=_rb?_rb.querySelector('.tbl-wrap'):null;
  if(_newTw){
    if(_prevTop>0)_newTw.scrollTop=_prevTop;
    if(_prevLeft>0)_newTw.scrollLeft=_prevLeft;
  }
  _applyFinAssetVisibility();
  _reapplyHighlightAfterRender();
  // ズーム再適用（再描画でtableが差し替わるため）
  if(typeof setCfZoom==='function'&&typeof cfZoomLevel!=='undefined'&&cfZoomLevel!==100)setCfZoom(cfZoomLevel);
}

// thead行にsticky top値を設定（行高さが可変のため動的計算）
function applyStickyTop(container){
  const thead=container?.querySelector('.cf thead');
  if(!thead)return;
  const rows=thead.querySelectorAll('tr');
  let cumTop=0;
  rows.forEach(tr=>{
    const cells=tr.querySelectorAll('th,td');
    cells.forEach(c=>{c.style.top=cumTop+'px'});
    cumTop+=tr.offsetHeight;
  });
}

