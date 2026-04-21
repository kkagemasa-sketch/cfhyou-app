// explain-income.js — 手取年収とDC/iDeCo節税の計算根拠ポップアップ
// cf-calc.js が R.hIncBd / R.wIncBd / R.dcTaxBdH / R.dcTaxBdW を生成する
// 手取年収: 額面・社会保険料・所得税・住民税の逆算内訳
// DC/iDeCo節税: 拠出額×(限界所得税率×1.021 + 住民税10%) の計算式

(function(){
  enableExplainForRow('hInc');
  enableExplainForRow('wInc');
  enableExplainForRow('dcTaxSavingH');
  enableExplainForRow('dcTaxSavingW');

  // ─── 手取年収の内訳 ───
  function _renderTakeHome(ctx, person){
    const R=ctx.R;
    const i=ctx.colIndex;
    const value=ctx.value;
    const bdKey=person==='h'?'hIncBd':'wIncBd';
    const bd=(R[bdKey]&&R[bdKey][i])||null;
    const labelSelf=person==='h'?'ご主人':'奥様';
    const titleText=`💴 ${labelSelf}手取年収（${ctx.year}年）`;

    // 手動上書き
    if(ctx.isOverridden){
      const autoVal=bd?bd.net:ctx.autoValue;
      const ovStr=explainFmt(ctx.overrideValue,'万円');
      const autoStr=explainFmt(autoVal,'万円');
      const diff=(ctx.overrideValue||0)-(autoVal||0);
      const diffStr=diff===0?'':(diff>0?` (+${explainFmt(Math.abs(diff),'万円')})`:` (-${explainFmt(Math.abs(diff),'万円')})`);
      const simple=`
        <div style="background:#fff9e0;border:1px solid #f0c040;border-radius:6px;padding:8px 10px;margin-bottom:8px">
          <div style="font-size:10px;color:#7a5000;font-weight:700;margin-bottom:4px">📝 セルが手動上書きされています</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #f0c040">
            <span>元の自動計算値</span><strong style="color:#1e3a5f">${autoStr}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0 2px">
            <span>手動入力値</span><strong style="font-size:15px;color:#7a5000">${ovStr}${diffStr}</strong>
          </div>
        </div>
      `;
      return { title:titleText, simple, detail:bd?_buildIncomeDetail(bd,person):null };
    }

    if(!bd){
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の手取は <strong style="color:#1e293b">${explainFmt(value,'万円')}</strong> です。</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:6px">内訳データがありません。CF表を再生成してください。</div>`,
        detail:null
      };
    }

    // シンプル表示: 額面 − 社会保険料 − 所得税 − 住民税 = 手取
    const simple=`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        <div style="display:flex;justify-content:space-between">
          <span>📥 推定額面年収</span><span>${explainFmt(bd.gross,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#b91c1c">
          <span>− 社会保険料</span><span>${explainFmt(bd.shakai,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#b91c1c">
          <span>− 所得税</span><span>${explainFmt(bd.itax,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#b91c1c">
          <span>− 住民税</span><span>${explainFmt(bd.jumin,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>手取年収（入力値）</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(bd.net,'万円')}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">
          ※ 手取りから額面を逆算して算出。入力値とは概ね一致します（逆算誤差あり: 逆算手取 ${explainFmt(bd.netComputed,'万円')}）
        </div>
      </div>
    `;

    return { title:titleText, simple, detail:_buildIncomeDetail(bd,person) };
  }

  function _buildIncomeDetail(bd,person){
    const labelSelf=person==='h'?'ご主人':'奥様';
    const shakaiPct=(bd.shakaiRate*100).toFixed(2);
    const ageNote=bd.age>=40&&bd.age<65?'（40歳以上：介護保険料加算）':'';
    return `
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        <div style="font-weight:700;color:#1e3a5f;margin-top:2px">▼ 社会保険料</div>
        <div>推定額面 ${explainFmt(bd.gross,'万円')} × <strong>${shakaiPct}%</strong> ${ageNote}</div>
        <div>= <strong>${explainFmt(bd.shakai,'万円')}</strong></div>

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 所得税（課税所得から累進）</div>
        <div>給与所得控除: ${explainFmt(bd.kyuyo,'万円')}</div>
        <div>給与所得金額: 額面 − 給与所得控除 = <strong>${explainFmt(bd.grossSyotoku,'万円')}</strong></div>
        <div>基礎控除（所得税）: ${explainFmt(bd.kisoIt,'万円')}</div>
        ${bd.hasSpouseDed?`<div>配偶者控除: ${explainFmt(bd.spouseDedIt,'万円')}</div>`:''}
        <div>課税所得: ${explainFmt(bd.taxable,'万円')}</div>
        <div>= <strong>${explainFmt(bd.itax,'万円')}</strong> <span style="color:#94a3b8">（復興特別所得税含む）</span></div>

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 住民税</div>
        <div>基礎控除（住民税）: ${explainFmt(bd.kisoJu,'万円')}</div>
        ${bd.hasSpouseDed?`<div>配偶者控除（住民税）: ${explainFmt(bd.spouseDedJu,'万円')}</div>`:''}
        <div>住民税課税所得: ${explainFmt(bd.juminTaxable,'万円')}</div>
        <div>= <strong>${explainFmt(bd.jumin,'万円')}</strong> <span style="color:#94a3b8">（所得割10% + 均等割・調整控除）</span></div>

        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 手取り(入力値)から額面を逆算しています。扶養家族数・生命保険料控除・医療費控除など一部の控除は簡略化されています。
        </div>
      </div>
    `;
  }

  // ─── DC/iDeCo節税の計算根拠 ───
  function _renderDCTax(ctx, person){
    const R=ctx.R;
    const i=ctx.colIndex;
    const value=ctx.value;
    const bdKey=person==='h'?'dcTaxBdH':'dcTaxBdW';
    const bd=(R[bdKey]&&R[bdKey][i])||null;
    const labelSelf=person==='h'?'ご主人':'奥様';
    const titleText=`🏦 ${labelSelf}DC/iDeCo節税額（${ctx.year}年）`;

    if(ctx.isOverridden){
      const autoVal=bd?bd.total:ctx.autoValue;
      const ovStr=explainFmt(ctx.overrideValue,'万円');
      const autoStr=explainFmt(autoVal,'万円');
      const simple=`
        <div style="background:#fff9e0;border:1px solid #f0c040;border-radius:6px;padding:8px 10px;margin-bottom:8px">
          <div style="font-size:10px;color:#7a5000;font-weight:700;margin-bottom:4px">📝 セルが手動上書きされています</div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #f0c040">
            <span>元の自動計算値</span><strong style="color:#1e3a5f">${autoStr}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:4px 0 2px">
            <span>手動入力値</span><strong style="font-size:15px;color:#7a5000">${ovStr}</strong>
          </div>
        </div>
      `;
      return { title:titleText, simple, detail:bd?_buildDCDetail(bd):null };
    }

    if(!bd||bd.deduction<=0){
      return {
        title:titleText,
        simple:`<div style="color:#64748b">この年の節税額は <strong style="color:#1e293b">0円</strong> です。</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:6px">拠出期間外か拠出額が0のため対象外です。</div>`,
        detail:null
      };
    }

    // シンプル表示: 計算式
    const marginalPct=(bd.marginalRate*100).toFixed(0);
    const ratePct=((bd.marginalRate*1.021+0.1)*100).toFixed(2);
    const simple=`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        <div style="font-weight:700;color:#1e3a5f;margin-bottom:2px">年間拠出額 × 節税率</div>
        <div style="display:flex;justify-content:space-between">
          <span>年間拠出額</span><span>${explainFmt(bd.deduction,'万円')}</span>
        </div>
        <div style="font-size:10px;color:#64748b;padding-left:10px;line-height:1.4">
          マッチング拠出 ${explainFmt(bd.matching,'万円')} + iDeCo ${explainFmt(bd.ideco,'万円')}
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:3px;border-top:1px dashed #e2e8f0">
          <span>限界所得税率</span><span>${marginalPct}%</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>× (所得税 ${marginalPct}% × 1.021)</span><span style="color:#1e5a9a">${explainFmt(bd.incomeTax,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between">
          <span>+ 住民税 10%</span><span style="color:#1e5a9a">${explainFmt(bd.residentTax,'万円')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
          <span>節税合計</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(bd.total,'万円')}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">
          実効節税率: 約 ${ratePct}%（所得税＋復興税＋住民税）
        </div>
      </div>
    `;

    return { title:titleText, simple, detail:_buildDCDetail(bd) };
  }

  function _buildDCDetail(bd){
    const marginalPct=(bd.marginalRate*100).toFixed(0);
    return `
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        <div style="font-weight:700;color:#1e3a5f;margin-top:2px">▼ 限界所得税率の推定根拠</div>
        <div>手取り年収（入力）: ${explainFmt(bd.takeHome,'万円')}</div>
        <div>推定額面年収: ${explainFmt(bd.gross,'万円')}</div>
        <div>社会保険料（14.37%）: ${explainFmt(bd.shakai,'万円')}</div>
        <div>給与所得控除: ${explainFmt(bd.kyuyo,'万円')}</div>
        <div>課税所得（概算）: ${explainFmt(bd.taxable,'万円')}</div>
        <div>→ <strong>限界所得税率 ${marginalPct}%</strong></div>

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 節税額の計算式</div>
        <div>所得税分: ${explainFmt(bd.deduction,'万円')} × ${marginalPct}% × 1.021（復興税）= <strong>${explainFmt(bd.incomeTax,'万円')}</strong></div>
        <div>住民税分: ${explainFmt(bd.deduction,'万円')} × 10% = <strong>${explainFmt(bd.residentTax,'万円')}</strong></div>
        <div>合計: <strong>${explainFmt(bd.total,'万円')}</strong></div>

        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 確定拠出年金（DC）・iDeCoの掛金は全額が所得控除になります。<br>
          ※ 限界税率は課税所得に応じて 5% / 10% / 20% / 23% / 33% / 40% / 45% のいずれか。
        </div>
      </div>
    `;
  }

  registerExplainRenderer('hInc',function(ctx){return _renderTakeHome(ctx,'h');});
  registerExplainRenderer('wInc',function(ctx){return _renderTakeHome(ctx,'w');});
  registerExplainRenderer('dcTaxSavingH',function(ctx){return _renderDCTax(ctx,'h');});
  registerExplainRenderer('dcTaxSavingW',function(ctx){return _renderDCTax(ctx,'w');});

  console.log('[explain] income renderer registered');
})();
