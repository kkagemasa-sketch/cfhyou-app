// explain-financial.js — 金融商品系の計算根拠ポップアップ
// 対象:
//   - insMat (保険満期金)          : R.insMatBd[i] = {items,total}
//   - 有価証券解約 個別行 (accum-*, stk-*) : R.secRedeemBd[rowKey][i] = {type, principal, evaluation, gain, tax, net, isNisa, ...}
//   - その他金融資産 個別行 (fin-*) : R.finAssetBd[lbl][i] = {items,total,principalTotal,gainTotal}

(function(){
  // ─── 共通ユーティリティ ───
  function _nisaBadge(isNisa){
    return isNisa
      ? '<span style="background:#dbeafe;color:#1e40af;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">NISA</span>'
      : '<span style="background:#fee2e2;color:#b91c1c;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">課税</span>';
  }
  function _gainColor(g){ return g>=0 ? '#059669' : '#b91c1c'; }
  function _gainSign(g){ return g>=0 ? '+' : ''; }

  // ─── 1. 保険満期金 (insMat) ───
  enableExplainForRow('insMat');
  registerExplainRenderer('insMat',function(ctx){
    const R=ctx.R;
    const i=ctx.colIndex;
    const bd=(R.insMatBd&&R.insMatBd[i])||null;
    const titleText=`🎁 保険満期金（${ctx.year}年）`;
    if(ctx.isOverridden){
      const autoVal=bd?bd.total:ctx.autoValue;
      const simple=`
        <div style="background:#fff9e0;border:1px solid #f0c040;border-radius:6px;padding:8px 10px;margin-bottom:8px">
          <div style="font-size:10px;color:#7a5000;font-weight:700;margin-bottom:4px">📝 セルが手動上書きされています</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #f0c040">
            <span>元の自動計算値</span><strong>${explainFmt(autoVal,'万円')}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0 2px">
            <span>手動入力値</span><strong style="font-size:15px;color:#7a5000">${explainFmt(ctx.overrideValue,'万円')}</strong>
          </div>
        </div>
      `;
      return { title:titleText, simple, detail:bd?_buildInsMatDetail(bd):null };
    }
    if(!bd||bd.total<=0){
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の満期受取は <strong>0円</strong> です。</div>`,
        detail:null
      };
    }
    // サマリー
    const rows=bd.items.map(it=>{
      const gStr=`<span style="color:${_gainColor(it.gain)};font-weight:700">${_gainSign(it.gain)}${explainFmt(it.gain,'万円')}</span>`;
      return `
        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #e2e8f0">
          <span>${it.lbl} <span style="color:#94a3b8;font-size:10px">(${it.type==='savings'?'積立':'一時払い'})</span></span>
          <span>${explainFmt(it.matAmt,'万円')}</span>
        </div>
        <div style="font-size:10px;color:#64748b;padding:2px 0 4px 10px">
          払込累計: ${explainFmt(it.type==='savings'?it.cumPremium:it.premium,'万円')} → 受取: ${explainFmt(it.matAmt,'万円')}（運用益 ${gStr}）
        </div>
      `;
    }).join('');
    const simple=`
      <div style="display:flex;flex-direction:column;gap:0;font-size:12px">
        ${rows}
        <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>合計受取</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(bd.total,'万円')}</span>
        </div>
      </div>
    `;
    return { title:titleText, simple, detail:_buildInsMatDetail(bd) };
  });

  function _buildInsMatDetail(bd){
    return `
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        ${bd.items.map(it=>{
          if(it.type==='savings'){
            return `
              <div style="font-weight:700;color:#1e3a5f">▼ ${it.lbl}（積立保険）</div>
              <div>加入: ${it.enrollAge}歳 → 満期: ${it.matAge}歳（${it.payYrs}年払込）</div>
              <div>月額保険料: ${explainFmt(it.monthly,'万円')} × 12ヶ月 × ${it.payYrs}年</div>
              <div>= 払込累計: ${explainFmt(it.cumPremium,'万円')}</div>
              <div>満期受取: <strong>${explainFmt(it.matAmt,'万円')}</strong></div>
              <div>運用益: <strong style="color:${_gainColor(it.gain)}">${_gainSign(it.gain)}${explainFmt(it.gain,'万円')}</strong></div>
            `;
          }else{
            const modeStr={rate:'利回り複利',fixed:'固定満期額',pct:'払込額×%'}[it.mode]||it.mode;
            return `
              <div style="font-weight:700;color:#1e3a5f;margin-top:4px">▼ ${it.lbl}（一時払い保険）</div>
              <div>加入: ${it.enrollAge}歳（${explainFmt(it.premium,'万円')}一括） → 満期: ${it.matAge}歳（${it.yrs}年）</div>
              <div>計算方法: ${modeStr} ${it.mode==='rate'?`(${it.rate}%)`:''}${it.mode==='pct'?`(${it.pct}%)`:''}</div>
              <div>満期受取: <strong>${explainFmt(it.matAmt,'万円')}</strong></div>
              <div>運用益: <strong style="color:${_gainColor(it.gain)}">${_gainSign(it.gain)}${explainFmt(it.gain,'万円')}</strong></div>
            `;
          }
        }).join('')}
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 保険の満期受取は原則一時所得扱いで50万円特別控除・1/2課税。CF上は税引前の満期金を計上しています。
        </div>
      </div>
    `;
  }

  // ─── 2. 有価証券解約（個別行） ───
  registerExplainPattern(/^accum-[hw]-/, function(ctx){return _renderRedeem(ctx);});
  registerExplainPattern(/^stk-[hw]-/, function(ctx){return _renderRedeem(ctx);});

  function _renderRedeem(ctx){
    const R=ctx.R;
    const i=ctx.colIndex;
    const rowKey=ctx.rowKey;
    const bd=(R.secRedeemBd&&R.secRedeemBd[rowKey]&&R.secRedeemBd[rowKey][i])||null;
    const titleText=`💹 有価証券解約（${ctx.year}年）`;
    if(ctx.isOverridden){
      const autoVal=bd?bd.net:ctx.autoValue;
      return {
        title:titleText,
        simple:`
          <div style="background:#fff9e0;border:1px solid #f0c040;border-radius:6px;padding:8px 10px;margin-bottom:8px">
            <div style="font-size:10px;color:#7a5000;font-weight:700;margin-bottom:4px">📝 セルが手動上書きされています</div>
            <div style="display:flex;justify-content:space-between">
              <span>元の自動計算値</span><strong>${explainFmt(autoVal,'万円')}</strong>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span>手動入力値</span><strong style="color:#7a5000">${explainFmt(ctx.overrideValue,'万円')}</strong>
            </div>
          </div>
        `,
        detail:bd?_buildRedeemDetail(bd):null
      };
    }
    if(!bd||bd.net<=0){
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の解約はありません。</div>`,
        detail:null
      };
    }
    const typeLbl=bd.type==='accum'?'積立':'一括';
    const simple=`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
          <span style="font-weight:700">${bd.lbl} (${typeLbl})</span>${_nisaBadge(bd.isNisa)}
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>💰 元本（投資額）</span><span>${explainFmt(bd.principal,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>📈 評価額（解約時）</span><span>${explainFmt(bd.evaluation,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:${_gainColor(bd.gain)}">
          <span>　運用損益</span><span>${_gainSign(bd.gain)}${explainFmt(bd.gain,'万円')}</span>
        </div>
        ${bd.isNisa
          ? `<div style="font-size:11px;color:#1e40af;margin:2px 0">✨ NISA口座のため譲渡益は非課税</div>`
          : `<div style="display:flex;justify-content:space-between;color:#b91c1c">
              <span>− 譲渡益税（20.315%）</span><span>${explainFmt(bd.tax,'万円')}</span>
            </div>`}
        <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>手取り受取</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(bd.net,'万円')}</span>
        </div>
      </div>
    `;
    return { title:titleText, simple, detail:_buildRedeemDetail(bd) };
  }
  function _buildRedeemDetail(bd){
    const typeLbl=bd.type==='accum'?'積立投資':'一括投資';
    const personLbl=bd.person==='h'?'ご主人':'奥様';
    return `
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        <div style="font-weight:700;color:#1e3a5f">▼ 商品情報</div>
        <div>種類: ${typeLbl} / 名義: ${personLbl}</div>
        <div>想定利回り: ${bd.rate?bd.rate.toFixed(2):'-'}%</div>
        ${bd.type==='accum'
          ? `<div>初期残高: ${explainFmt(bd.bal,'万円')} / 月額積立: ${explainFmt(bd.monthly,'万円')}</div>
             <div>積立年数: ${bd.yrs}年</div>`
          : `<div>投資開始: ${bd.investAge||'-'}歳 / 保有: ${bd.yrsHeld||'-'}年</div>`
        }
        <div>解約年齢: ${bd.redeemAge}歳</div>
        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 税金計算</div>
        <div>運用益: ${explainFmt(bd.gain,'万円')}</div>
        ${bd.isNisa
          ? `<div style="color:#1e40af">✨ NISA非課税のため税額0円</div>`
          : `<div>譲渡益税 = 運用益 × 20.315%（所得税15%+復興税0.315%+住民税5%）</div>
             <div>= <strong>${explainFmt(bd.tax,'万円')}</strong></div>`
        }
        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 手取り</div>
        <div>評価額 ${explainFmt(bd.evaluation,'万円')} − 税 ${explainFmt(bd.tax,'万円')} = <strong>${explainFmt(bd.net,'万円')}</strong></div>
      </div>
    `;
  }

  // ─── 3. その他金融資産（fin-プレフィックス付きキー） ───
  registerExplainPattern(/^fin-/, function(ctx){return _renderFinAsset(ctx);});

  // 運用シミュレーション：その年のヒストリカル情報（year相当＋指数別リターン）を返す
  function _buildSimYearInfo(i){
    if(typeof marketShocks==='undefined' || !marketShocks.length) return '';
    if(typeof marketShockEnabled!=='undefined' && !marketShockEnabled) return '';
    const hAge0 = parseInt(document.getElementById('husband-age')?.value)||0;
    const wAge0 = parseInt(document.getElementById('wife-age')?.value)||0;
    const idxLabel = {sp500:'S&P500', acwi:'オルカン', nikkei:'日経平均', usdjpy:'USD/JPY'};
    const rows=[];
    for(const sh of marketShocks){
      if(sh.active===false) continue;
      if(sh.mode==='replay50'){
        if(typeof HISTORICAL_50YR==='undefined') continue;
        const startY = sh.historicalStartYear||HISTORICAL_50YR.startYear;
        const offsetY = startY - HISTORICAL_50YR.startYear + i;
        if(offsetY<0 || offsetY>=HISTORICAL_50YR.years.length) continue;
        const histYear = HISTORICAL_50YR.startYear + offsetY;
        const rets = ['sp500','acwi','nikkei','usdjpy'].map(k=>{
          const arr=HISTORICAL_50YR.returns[k];
          const v=(arr && arr[offsetY]!=null)?arr[offsetY]:null;
          if(v===null) return '';
          const col = v<0 ? '#b91c1c' : (v>0 ? '#059669' : '#475569');
          return `<span style="display:inline-block;margin:1px 6px 1px 0"><span style="color:#64748b">${idxLabel[k]}</span> <strong style="color:${col}">${v>=0?'+':''}${v.toFixed(1)}%</strong></span>`;
        }).join('');
        rows.push(`
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:11px">
            <div style="font-weight:700;color:#1e3a5f;margin-bottom:3px">📅 過去50年再生：${histYear}年相当（CF${i+1}年目）</div>
            <div style="line-height:1.6">${rets}</div>
          </div>`);
      }else{
        // preset / manual
        if(typeof mspResolveStartIdx!=='function') continue;
        const startI = mspResolveStartIdx(sh, hAge0, wAge0);
        if(startI<0) continue;
        const offset = i - startI;
        if(offset<0) continue;
        if(sh.mode==='manual'){
          const drop=(sh.manual?.dropPct||0);
          const rec=Math.max(1, sh.manual?.recoveryYrs||1);
          const idxK=sh.manual?.index||'';
          let line='';
          if(offset===0){
            line=`<strong style="color:#b91c1c">-${drop.toFixed(1)}%</strong>（下落初年度）`;
          }else if(offset<=rec){
            const gain=(Math.pow(1/Math.max(0.0001,1-drop/100),1/rec)-1)*100;
            line=`<strong style="color:#059669">+${gain.toFixed(1)}%</strong>（回復 ${offset}/${rec}年目）`;
          }else continue;
          rows.push(`
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:11px">
              <div style="font-weight:700;color:#1e3a5f;margin-bottom:3px">📅 手動シナリオ：${offset+1}年目</div>
              <div><span style="color:#64748b">${idxLabel[idxK]||idxK}</span> ${line}</div>
            </div>`);
        }else{
          const sc=(typeof MARKET_SCENARIOS!=='undefined')?MARKET_SCENARIOS[sh.preset]:null;
          if(!sc) continue;
          const len=Math.max(...['sp500','acwi','nikkei','usdjpy'].map(k=>sc.returns[k]?.length||0));
          if(offset>=len) continue;
          const histYear=(sc.startYear||0)+offset;
          const rets=['sp500','acwi','nikkei','usdjpy'].map(k=>{
            const arr=sc.returns[k];
            const v=(arr && arr[offset]!=null)?arr[offset]:null;
            if(v===null) return '';
            const col=v<0?'#b91c1c':(v>0?'#059669':'#475569');
            return `<span style="display:inline-block;margin:1px 6px 1px 0"><span style="color:#64748b">${idxLabel[k]}</span> <strong style="color:${col}">${v>=0?'+':''}${v.toFixed(1)}%</strong></span>`;
          }).join('');
          rows.push(`
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px;margin-bottom:6px;font-size:11px">
              <div style="font-weight:700;color:#1e3a5f;margin-bottom:3px">📅 ${sc.label}：${offset+1}年目${histYear?`（${histYear}年相当）`:''}</div>
              <div style="line-height:1.6">${rets}</div>
            </div>`);
        }
      }
    }
    return rows.join('');
  }

  function _renderFinAsset(ctx){
    const R=ctx.R;
    const i=ctx.colIndex;
    const rowKey=ctx.rowKey;
    const lbl=rowKey.replace(/^fin-/,''); // ラベル名復元
    const bd=(R.finAssetBd&&R.finAssetBd[lbl]&&R.finAssetBd[lbl][i])||null;
    const titleText=`💎 ${lbl}（${ctx.year}年末）`;
    // 運用シナリオの影響チェック
    const row=(R.finAssetRows||[]).find(r=>r.lbl===lbl);
    const shockVal = row?.vals?.[i] ?? null;
    const baseVal = row?.baseVals?.[i] ?? null;
    const diff = (shockVal!==null && baseVal!==null) ? (shockVal-baseVal) : 0;
    const hasShock = (typeof marketShocks!=='undefined') && (marketShocks.length>0)
      && (typeof marketShockEnabled==='undefined' || marketShockEnabled);
    const simYearInfo = _buildSimYearInfo(i);
    const shockBadge = (hasShock && Math.abs(diff)>=1) ? `
      <div style="background:${diff<0?'#fee2e2':'#dcfce7'};border:1px solid ${diff<0?'#fca5a5':'#86efac'};border-radius:6px;padding:6px 8px;margin-bottom:8px;font-size:11px">
        <div style="font-weight:700;color:${diff<0?'#b91c1c':'#059669'};margin-bottom:3px">${diff<0?'📉':'📈'} 運用シナリオ適用中</div>
        <div style="display:flex;justify-content:space-between"><span>通常想定</span><strong>${explainFmt(baseVal,'万円')}</strong></div>
        <div style="display:flex;justify-content:space-between"><span>シナリオ込み</span><strong>${explainFmt(shockVal,'万円')}</strong></div>
        <div style="display:flex;justify-content:space-between;padding-top:3px;border-top:1px dashed ${diff<0?'#fca5a5':'#86efac'};margin-top:3px">
          <span>影響</span>
          <strong style="color:${diff<0?'#b91c1c':'#059669'}">${diff>=0?'+':''}${explainFmt(diff,'万円')} (${baseVal>0?((diff/baseVal)*100).toFixed(1):'-'}%)</strong>
        </div>
      </div>
    ` : '';
    if(!bd||bd.total<=0){
      return {
        title:titleText,
        simple:simYearInfo+shockBadge+`<div style="color:#64748b">この年の残高はありません。</div>`,
        detail:null
      };
    }
    // 複数アイテム集約
    const items=bd.items;
    const allDCIdeco=items.every(it=>it.type==='dc'||it.type==='ideco');
    let nisaTag;
    if(allDCIdeco){
      nisaTag='<span style="background:#fef3c7;color:#92400e;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">税制優遇</span>';
    }else{
      const allNisa=items.every(it=>it.isNisa);
      const someNisa=items.some(it=>it.isNisa);
      nisaTag=allNisa?_nisaBadge(true):(someNisa?'<span style="background:#e0e7ff;color:#4338ca;font-size:10px;padding:1px 6px;border-radius:10px">NISA+課税</span>':_nisaBadge(false));
    }
    const itemsHtml=items.length>1?items.map(it=>{
      const personLbl=it.person==='h'?'ご主人':(it.person==='w'?'奥様':'共有');
      const typeLbl={accum:'積立',stk:'一括',dc:'DC',ideco:'iDeCo'}[it.type]||it.type;
      return `
        <div style="font-size:10px;color:#64748b;padding:2px 0 2px 10px">
          ${typeLbl}(${personLbl}): 元本 ${explainFmt(it.principal,'万円')} / 評価 ${explainFmt(it.evaluation,'万円')} / <span style="color:${_gainColor(it.gain)}">${_gainSign(it.gain)}${explainFmt(it.gain,'万円')}</span>
        </div>
      `;
    }).join(''):'';
    const simple=`
      ${simYearInfo}
      ${shockBadge}
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-weight:700">${lbl}</span>${nisaTag}
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>💰 積立額（元本累計）</span><span>${explainFmt(bd.principalTotal,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>📈 評価額</span><span>${explainFmt(bd.total,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>運用損益</span>
          <span style="color:${_gainColor(bd.gainTotal)};font-size:14px">${_gainSign(bd.gainTotal)}${explainFmt(bd.gainTotal,'万円')}</span>
        </div>
        ${itemsHtml?`<div style="font-size:10px;color:#94a3b8;margin-top:4px">▼ 内訳</div>${itemsHtml}`:''}
      </div>
    `;
    const detail=`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        ${items.map(it=>{
          const personLbl=it.person==='h'?'ご主人':(it.person==='w'?'奥様':'共有');
          const typeLbl={accum:'積立投資',stk:'一括投資',dc:'DC（確定拠出年金）',ideco:'iDeCo'}[it.type]||it.type;
          let detailLine='';
          if(it.type==='accum')detailLine=`初期残高 ${explainFmt(it.initBal,'万円')} + 月額 ${explainFmt(it.monthly,'万円')} × 12 × ${it.yrs}年、利回り${it.rate.toFixed(2)}%`;
          else if(it.type==='stk')detailLine=`元本 ${explainFmt(it.principal,'万円')}（${it.investAge}歳投資、${it.yrsHeld}年保有）、利回り${it.rate.toFixed(2)}%`;
          else detailLine=`初期残高 ${explainFmt(it.initBal,'万円')} + 月額 ${explainFmt(it.monthly,'万円')} × 12、利回り${it.rate.toFixed(2)}%`;
          const taxTag=(it.type==='dc'||it.type==='ideco')?'[税制優遇]':(it.isNisa?'[NISA]':'[課税]');
          return `
            <div style="font-weight:700;color:#1e3a5f;margin-top:3px">▼ ${typeLbl}（${personLbl}）${taxTag}</div>
            <div>${detailLine}</div>
            <div>元本: ${explainFmt(it.principal,'万円')} / 評価: ${explainFmt(it.evaluation,'万円')}</div>
            <div>損益: <strong style="color:${_gainColor(it.gain)}">${_gainSign(it.gain)}${explainFmt(it.gain,'万円')}</strong> (${it.principal>0?((it.gain/it.principal)*100).toFixed(1):'-'}%)</div>
          `;
        }).join('')}
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 評価額は各商品の想定利回りで複利計算した現在価値です。解約時の税引後金額ではありません。<br>
          ※ NISA枠内は非課税、課税口座は解約時に運用益に対して20.315%課税されます。
        </div>
      </div>
    `;
    return { title:titleText, simple, detail };
  }

  console.log('[explain] financial renderer registered');
})();
