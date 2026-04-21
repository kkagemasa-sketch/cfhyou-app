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

  function _renderFinAsset(ctx){
    const R=ctx.R;
    const i=ctx.colIndex;
    const rowKey=ctx.rowKey;
    const lbl=rowKey.replace(/^fin-/,''); // ラベル名復元
    const bd=(R.finAssetBd&&R.finAssetBd[lbl]&&R.finAssetBd[lbl][i])||null;
    const titleText=`💎 ${lbl}（${ctx.year}年末）`;
    if(!bd||bd.total<=0){
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の残高はありません。</div>`,
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
