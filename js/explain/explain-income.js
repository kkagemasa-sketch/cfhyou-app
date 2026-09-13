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
    // 額面入力モードでは「入力した額面が起点」の表現に切り替える
    const _gm=(typeof isGrossInputMode==='function')&&isGrossInputMode(person);
    // 前年からの変化サマリー（額面モード時のみ。手取り入力モードは入力値どおりなので不要）
    const diffHtml=_gm?_buildYearDiff(R,bdKey,i,person):'';
    const simple=diffHtml+`
      <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
        <div style="display:flex;justify-content:space-between">
          <span>📥 ${_gm?'額面年収（入力値ベース）':'推定額面年収'}</span><span>${explainFmt(bd.gross,'万円')}</span>
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
          <span>手取年収${_gm?'（自動計算）':'（入力値）'}</span>
          <span style="color:#1e3a5f;font-size:14px">${explainFmt(bd.net,'万円')}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px">
          ${_gm?'※ 入力された額面から社保・税を自動計算した手取りです（額面はこの手取りからの逆算表示のため入力値と±0.1万円程度ズレることがあります）'
              :`※ 手取りから額面を逆算して算出。入力値とは概ね一致します（逆算誤差あり: 逆算手取 ${explainFmt(bd.netComputed,'万円')}）`}
        </div>
      </div>
    `;

    return { title:titleText, simple, detail:_buildIncomeDetail(bd,person,ctx) };
  }

  // ─── 前年からの変化サマリー（額面モード時のみ・変化があった年だけ表示） ───
  // 「同じ額面なのに手取りが変わる」年に、理由（扶養控除・介護保険・配偶者控除・額面変化）を
  // ポップアップの最上部で一目でわかるように示す（2026-09-14）
  function _buildYearDiff(R, bdKey, i, person){
    if(i<=0) return '';
    const bd=R[bdKey]&&R[bdKey][i];
    const bdPrev=R[bdKey]&&R[bdKey][i-1];
    if(!bd||!bdPrev) return '';
    const dNet=Math.round((bd.net-bdPrev.net)*10)/10;
    const reasons=[];
    // 額面（入力値）の変化 — 逆算表示の丸め誤差(±2万円未満)は変化とみなさない
    if(Math.abs((bd.gross||0)-(bdPrev.gross||0))>=2){
      reasons.push(`📈 額面年収が ${explainFmt(Math.round(bdPrev.gross),'万円')} → ${explainFmt(Math.round(bd.gross),'万円')} に変化`);
    }
    // 介護保険料（40歳開始・65歳終了）
    if(bd.shakaiRate!==bdPrev.shakaiRate){
      reasons.push(bd.shakaiRate>bdPrev.shakaiRate
        ?'👤 40歳到達 → 介護保険料の支払いが始まりました（手取り減）'
        :'👤 65歳到達 → 介護保険料の給与天引きが終わりました（手取り増）');
    }
    // お子様の扶養控除（16歳で開始・19歳で拡大・23歳で卒業）
    const fPrev=bdPrev.fuyoIt||0, fNow=bd.fuyoIt||0;
    if(fNow!==fPrev){
      const c0=_fuyoCountsAt(R,i-1), c1=_fuyoCountsAt(R,i);
      let why='';
      if(c1.n16>c0.n16&&c1.n19===c0.n19)why='お子様が16歳になり控除開始';
      else if(c1.n19>c0.n19)why='お子様が19歳になり控除拡大（大学生年代63万円）';
      else if(fNow<fPrev)why='お子様が23歳になり控除卒業';
      reasons.push(`🎓 扶養控除 ${fPrev}万円 → ${fNow}万円${why?'（'+why+'）':''}`);
    }
    // 配偶者控除の適用/終了
    if(!!bd.hasSpouseDed!==!!bdPrev.hasSpouseDed){
      reasons.push(bd.hasSpouseDed
        ?'💑 配偶者控除の適用が始まりました（配偶者の収入が基準内・手取り増）'
        :'💑 配偶者控除が外れました（配偶者の収入が基準超・手取り減）');
    }
    if(dNet===0&&reasons.length===0) return '';
    if(reasons.length===0) return ''; // 理由が特定できない微小変動（丸め）は出さない
    const col=dNet>0?'#166534':dNet<0?'#b91c1c':'#475569';
    const sign=dNet>0?'+':'';
    return `
      <div style="background:#fefce8;border:1px solid #facc15;border-radius:7px;padding:8px 10px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:800;color:#713f12;margin-bottom:3px">📌 前年からの変化: <span style="color:${col};font-size:13px">${sign}${dNet.toLocaleString()}万円</span></div>
        ${reasons.map(r=>`<div style="font-size:11px;color:#44403c;line-height:1.6">・${r}</div>`).join('')}
      </div>`;
  }

  // その年の扶養対象のお子様人数（16-18歳／19-22歳）を年齢行から数える
  function _fuyoCountsAt(R,i){
    let n16=0,n19=0;
    (R.cA||[]).forEach(arr=>{
      const ag=arr&&arr[i];
      if(typeof ag!=='number')return;
      if(ag>=16&&ag<=18)n16++;
      else if(ag>=19&&ag<=22)n19++;
    });
    return {n16,n19};
  }

  function _buildIncomeDetail(bd,person,ctx){
    const labelSelf=person==='h'?'ご主人':'奥様';
    const shakaiPct=(bd.shakaiRate*100).toFixed(2);
    const ageNote=bd.age>=40&&bd.age<65?'（40歳以上：介護保険料加算）':'';
    const _gm=(typeof isGrossInputMode==='function')&&isGrossInputMode(person);
    // 扶養控除の人数内訳（この年の子の年齢から）
    let fuyoNote='';
    if(bd.fuyoIt>0&&ctx&&ctx.R){
      const c=_fuyoCountsAt(ctx.R,ctx.colIndex);
      const parts=[];
      if(c.n16>0)parts.push(`16〜18歳×${c.n16}人`);
      if(c.n19>0)parts.push(`19〜22歳×${c.n19}人`);
      fuyoNote=parts.length?`（${parts.join('・')}）`:'';
    }
    return `
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px">
        <div style="font-weight:700;color:#1e3a5f;margin-top:2px">▼ 社会保険料</div>
        <div>${_gm?'額面':'推定額面'} ${explainFmt(bd.gross,'万円')} × <strong>${shakaiPct}%</strong> ${ageNote}</div>
        <div>= <strong>${explainFmt(bd.shakai,'万円')}</strong></div>

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 所得税（課税所得から累進）</div>
        <div>給与所得控除: ${explainFmt(bd.kyuyo,'万円')}</div>
        <div>給与所得金額: 額面 − 給与所得控除 = <strong>${explainFmt(bd.grossSyotoku,'万円')}</strong></div>
        <div>基礎控除（所得税）: ${explainFmt(bd.kisoIt,'万円')}</div>
        ${bd.hasSpouseDed?`<div>配偶者控除: ${explainFmt(bd.spouseDedIt,'万円')}</div>`:''}
        ${bd.fuyoIt>0?`<div>扶養控除: ${explainFmt(bd.fuyoIt,'万円')}${fuyoNote}</div>`:''}
        <div>課税所得: ${explainFmt(bd.taxable,'万円')}</div>
        <div>= <strong>${explainFmt(bd.itax,'万円')}</strong> <span style="color:#94a3b8">（復興特別所得税含む）</span></div>

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 住民税</div>
        <div>基礎控除（住民税）: ${explainFmt(bd.kisoJu,'万円')}</div>
        ${bd.hasSpouseDed?`<div>配偶者控除（住民税）: ${explainFmt(bd.spouseDedJu,'万円')}</div>`:''}
        ${bd.fuyoJu>0?`<div>扶養控除（住民税）: ${explainFmt(bd.fuyoJu,'万円')}${fuyoNote}</div>`:''}
        <div>住民税課税所得: ${explainFmt(bd.juminTaxable,'万円')}</div>
        <div>= <strong>${explainFmt(bd.jumin,'万円')}</strong> <span style="color:#94a3b8">（所得割10% + 均等割・調整控除）</span></div>

        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ${_gm?'※ 額面入力モード: 入力された額面から自動計算しています。生命保険料控除・医療費控除など一部の控除は簡略化されています。'
              :'※ 手取り(入力値)から額面を逆算しています。生命保険料控除・医療費控除など一部の控除は簡略化されています。'}
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
