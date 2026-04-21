// explain-pension.js — 年金受給額の計算根拠ポップアップ
// cf-calc.js / contingency.js が R.pensionBd[i] に内訳データを格納する
// pTotalH（ご主人年金受給額）= 老齢年金(pS) + 遺族年金(夫が受給)
// pTotalW（奥様年金受給額）= 配偶者年金(pW) + 遺族年金(妻が受給)

(function(){
  enableExplainForRow('pTotalH');
  enableExplainForRow('pTotalW');

  function _renderPension(ctx, person){
    const R=ctx.R;
    const i=ctx.colIndex;
    const value=ctx.value;
    const bd=(R.pensionBd&&R.pensionBd[i])||null;

    const year=ctx.year;
    const labelSelf=person==='h'?'ご主人':'奥様';
    const titleText=`💰 ${labelSelf}年金受給額（${year}年）`;

    // セル手動上書き
    if(ctx.isOverridden){
      const autoVal=person==='h'?(bd?bd.pTotH:ctx.autoValue):(bd?bd.pTotW:ctx.autoValue);
      const autoStr=explainFmt(autoVal,'万円');
      const ovStr=explainFmt(ctx.overrideValue,'万円');
      const diff=(ctx.overrideValue||0)-(autoVal||0);
      const diffStr=diff===0?'':(diff>0?` (+${explainFmt(Math.abs(diff),'万円')})`:` (-${explainFmt(Math.abs(diff),'万円')})`);
      const simple=`
        <div style="background:#fff9e0;border:1px solid #f0c040;border-radius:6px;padding:8px 10px;margin-bottom:8px">
          <div style="font-size:10px;color:#7a5000;font-weight:700;margin-bottom:4px">📝 セルが手動上書きされています</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:1px dashed #f0c040">
            <span>元の自動計算値</span>
            <strong style="color:#1e3a5f">${autoStr}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0 2px">
            <span>手動入力値</span>
            <strong style="font-size:15px;color:#7a5000">${ovStr}${diffStr}</strong>
          </div>
        </div>
      `;
      const detail=bd?_buildDetail(bd,person):null;
      return { title:titleText, simple, detail };
    }

    // breakdown なし
    if(!bd){
      return {
        title:titleText,
        simple:`<div>受給額: <strong>${explainFmt(value,'万円')}</strong></div>
                <div style="font-size:11px;color:#94a3b8;margin-top:6px">計算内訳データがありません。CF表を再生成してください。</div>`,
        detail:null
      };
    }

    const pOwn=person==='h'?bd.pS:bd.pW;          // 本人の老齢年金
    const survThis=person==='h'?bd.survPH:bd.survPW; // 本人が受け取る遺族年金
    const total=pOwn+survThis;

    // 受給なし
    if(total===0){
      let reason='年金受給開始前';
      const recvAge=person==='h'?bd.pHReceive:bd.pWReceive;
      const curAge=person==='h'?bd.ha:bd.wa;
      const deathAge=person==='h'?bd.hDeathAge:bd.wDeathAge;
      if(deathAge>0&&curAge>deathAge)reason='ご逝去後';
      else if(curAge<recvAge)reason=`${recvAge}歳から受給開始`;
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の受給額は <strong style="color:#1e293b">0円</strong> です。</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:6px">理由: ${reason}</div>`,
        detail:null
      };
    }

    // シンプル表示：老齢年金 + 遺族年金 = 合計
    const rows=[];
    if(pOwn>0){
      rows.push(`
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e2e8f0">
          <span>🏛️ ${labelSelf}老齢年金</span><span>${explainFmt(pOwn,'万円')}</span>
        </div>
      `);
    }
    if(survThis>0){
      rows.push(`
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e2e8f0">
          <span>🕊️ 遺族年金</span><span>${explainFmt(survThis,'万円')}</span>
        </div>
      `);
    }
    const simple=`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        ${rows.join('')}
        <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>合計受給額</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(total,'万円')}</span>
        </div>
      </div>
    `;

    const detail=_buildDetail(bd,person);
    return { title:titleText, simple, detail };
  }

  function _buildDetail(bd,person){
    const pOwn=person==='h'?bd.pS:bd.pW;
    const survThis=person==='h'?bd.survPH:bd.survPW;
    const curAge=person==='h'?bd.ha:bd.wa;
    const recvAge=person==='h'?bd.pHReceive:bd.pWReceive;
    const retA=person==='h'?bd.retAge:bd.wRetAge;
    const pStart=person==='h'?bd.pHStart:bd.pWStart;
    const kisoOwn=person==='h'?bd.kisoH:bd.kisoW;
    const koseiOwn=person==='h'?bd.koseiH:bd.koseiW;
    const labelSelf=person==='h'?'ご主人':'奥様';

    // 老齢年金セクション
    let ownSection='';
    if(pOwn>0){
      const koseiPart=Math.max(0,pOwn-kisoOwn);
      ownSection=`
        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ ${labelSelf}老齢年金 内訳</div>
        <div style="font-size:11px;line-height:1.6">
          老齢基礎年金: ${explainFmt(kisoOwn,'万円')} <span style="color:#94a3b8">（満額 × 加入${Math.min(retA-pStart,40)}年 / 40年）</span><br>
          老齢厚生年金: ${explainFmt(koseiPart,'万円')}<br>
          <strong>合計: ${explainFmt(pOwn,'万円')}</strong>
          <span style="color:#94a3b8"> ${recvAge}歳から受給開始</span>
        </div>
      `;
    }else if(curAge<recvAge){
      ownSection=`
        <div style="font-size:11px;color:#94a3b8;margin-top:6px">▼ ${labelSelf}老齢年金: ${recvAge}歳から受給開始（現在${curAge}歳）</div>
      `;
    }

    // 遺族年金セクション
    let survSection='';
    if(survThis>0&&bd.surv){
      const s=bd.surv;
      if(s.manual){
        survSection=`
          <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 遺族年金 内訳</div>
          <div style="font-size:11px;line-height:1.6">
            手動入力値: <strong>${explainFmt(s.total,'万円')}</strong>
          </div>
        `;
      }else{
        const parts=[];
        if(s.kiso>0)parts.push(`遺族基礎年金: ${explainFmt(s.kiso,'万円')} <span style="color:#94a3b8">（18歳以下の子 ${s.childUnder18||0}人）</span>`);
        if(s.kosei3_4>0){
          const adjNote=(s.koseiOwn>0&&s.koseiAdj<s.kosei3_4)
            ?`<br><span style="color:#94a3b8">　→ 本人の老齢厚生年金 ${explainFmt(s.koseiOwn,'万円')} を差引調整: ${explainFmt(s.koseiAdj,'万円')}</span>`
            :'';
          parts.push(`遺族厚生年金 (報酬比例×3/4): ${explainFmt(s.kosei3_4,'万円')} <span style="color:#94a3b8">（300月みなし適用）</span>${adjNote}`);
        }
        if(s.chukorei>0)parts.push(`中高齢寡婦加算: ${explainFmt(s.chukorei,'万円')}`);
        survSection=`
          <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 遺族年金 内訳</div>
          <div style="font-size:11px;line-height:1.6">
            ${parts.map(p=>p+'<br>').join('')}
            <strong>合計: ${explainFmt(survThis,'万円')}</strong>
          </div>
        `;
      }
    }

    // 死亡情報
    let deathNote='';
    const hDead=bd.hDeathAge>0&&bd.ha>bd.hDeathAge;
    const wDead=bd.wDeathAge>0&&bd.wa>bd.wDeathAge;
    if(hDead||wDead){
      const d=hDead?`ご主人ご逝去（${bd.hDeathAge}歳）`:`奥様ご逝去（${bd.wDeathAge}歳）`;
      deathNote=`<div style="font-size:10px;color:#dc2626;margin-top:6px">※ ${d}</div>`;
    }

    return `
      <div style="display:flex;flex-direction:column;gap:2px;font-size:11px">
        ${ownSection}
        ${survSection}
        ${deathNote}
        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 令和7年度の基礎年金満額（82.51万円）を基準に算出。厚生年金は被保険者期間と報酬から概算。
        </div>
      </div>
    `;
  }

  registerExplainRenderer('pTotalH',function(ctx){return _renderPension(ctx,'h');});
  registerExplainRenderer('pTotalW',function(ctx){return _renderPension(ctx,'w');});

  console.log('[explain] pension renderer registered');
})();
