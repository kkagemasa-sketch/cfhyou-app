// explain-lctrl.js — 住宅ローン控除の計算根拠表示
// cf-calc.js / contingency.js が R.lCtrlBreakdown[i] に詳細データを出力する前提

(function(){
  // 住宅ローン控除 制度表（令和6年度税制改正後）
  const LCTRL_REF_TABLE = `
    <div style="font-weight:700;color:#1e3a5f;margin-top:10px;margin-bottom:4px">▼ 住宅ローン控除 制度表</div>
    <style>
      .lctrl-ref-tbl{border-collapse:collapse;width:100%;font-size:10px;line-height:1.3;table-layout:fixed}
      .lctrl-ref-tbl th,.lctrl-ref-tbl td{border:1px solid #94a3b8;padding:3px 4px;text-align:center;vertical-align:middle;word-break:break-all}
      .lctrl-ref-tbl th{background:#e2e8f0;color:#1e293b;font-weight:700}
      .lctrl-ref-tbl td.cat{background:#f1f5f9;font-weight:700}
      .lctrl-ref-tbl td.blk{background:#000}
      .lctrl-ref-tbl td.dashed{color:#64748b;letter-spacing:2px}
      .lctrl-ref-tbl td.red{color:#dc2626;font-weight:600}
      .lctrl-ref-tbl .sub{font-size:9px;color:#475569}
      .lctrl-ref-tbl td.red .sub{color:#b91c1c}
    </style>
    <table class="lctrl-ref-tbl">
      <thead>
        <tr>
          <th colspan="3" rowspan="2">入居時期</th>
          <th>改正前</th>
          <th colspan="2">改正後</th>
        </tr>
        <tr>
          <th>2024(令和6)年<br>2025(令和7)年</th>
          <th>2026(令和8)年<br>2027(令和9)年</th>
          <th>2028(令和10)年〜<br>2030(令和12)年</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="cat" rowspan="9">控除対象<br>借入<br>限度額</td>
          <td class="cat" rowspan="4">新築・<br>買取<br>再販</td>
          <td class="cat">認定住宅</td>
          <td>4,500万円<br><span class="sub">(特例対象個人5,000万円)</span></td>
          <td colspan="2">4,500万円<br><span class="sub">(特例対象個人5,000万円)</span></td>
        </tr>
        <tr>
          <td class="cat">ZEH水準省エネ住宅</td>
          <td>3,500万円<br><span class="sub">(特例対象個人4,500万円)</span></td>
          <td colspan="2">3,500万円<br><span class="sub">(特例対象個人4,500万円)</span></td>
        </tr>
        <tr>
          <td class="cat">省エネ基準適合住宅</td>
          <td class="blk"></td>
          <td class="red">2,000万円<br><span class="sub">(特例対象個人3,000万円)</span></td>
          <td class="red">新築：適用対象外 ※2<br>買取再販：2,000万円<br><span class="sub">(特例対象個人3,000万円)</span></td>
        </tr>
        <tr>
          <td class="cat">一般住宅</td>
          <td class="blk"></td>
          <td colspan="2" class="dashed">―――――――</td>
        </tr>
        <tr>
          <td class="cat" rowspan="4">中古</td>
          <td class="cat">認定住宅</td>
          <td class="blk"></td>
          <td colspan="2" class="red">3,500万円<br><span class="sub">(特例対象個人4,500万円)</span></td>
        </tr>
        <tr>
          <td class="cat">ZEH水準省エネ住宅</td>
          <td class="blk"></td>
          <td colspan="2" class="red">3,500万円<br><span class="sub">(特例対象個人4,500万円)</span></td>
        </tr>
        <tr>
          <td class="cat">省エネ基準適合住宅</td>
          <td class="blk"></td>
          <td colspan="2" class="red">2,000万円<br><span class="sub">(特例対象個人3,000万円)</span></td>
        </tr>
        <tr>
          <td class="cat">一般住宅</td>
          <td>2,000万円</td>
          <td colspan="2">2,000万円</td>
        </tr>
        <tr>
          <td class="cat" rowspan="5">控除<br>期間</td>
          <td class="cat" rowspan="2">新築・<br>買取<br>再販</td>
          <td class="cat">認定住宅・ZEH水準省エネ住宅</td>
          <td>13年</td>
          <td colspan="2">13年</td>
        </tr>
        <tr>
          <td class="cat">省エネ基準適合住宅</td>
          <td>13年</td>
          <td colspan="2" class="red">新築：適用対象外 ※2<br>買取再販：13年</td>
        </tr>
        <tr>
          <td class="cat blk"></td>
          <td class="cat blk"></td>
          <td>10年</td>
          <td colspan="2" rowspan="3" class="red" style="font-size:14px;font-weight:700">13年</td>
        </tr>
        <tr>
          <td class="cat" rowspan="2">中古</td>
          <td class="cat blk"></td>
          <td>10年</td>
        </tr>
        <tr>
          <td class="cat blk"></td>
          <td>10年</td>
        </tr>
        <tr>
          <td class="cat" colspan="3">控除率</td>
          <td colspan="3">0.7%</td>
        </tr>
      </tbody>
    </table>
    <div style="font-size:9px;color:#64748b;margin-top:6px;line-height:1.6">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:3px">
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:14px;height:10px;background:#000;border:1px solid #94a3b8"></span>該当区分なし（制度対象外）</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="color:#dc2626;font-weight:600">赤字</span>：改正後に追加・変更された区分</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="letter-spacing:2px">―</span>：控除対象外（制度適用なし）</span>
      </div>
      ※2 省エネ基準適合住宅の新築は、2024年(令和6年)6月30日以前に建築確認を受けたもの、または2024年12月31日以前に建築されたものに限り適用。
    </div>
  `;

  // この行種別に対して ⓘ を表示するよう登録
  enableExplainForRow('lCtrl');

  registerExplainRenderer('lCtrl', function(ctx){
    const R = ctx.R;
    const i = ctx.colIndex;
    const value = ctx.value;
    const bd = (R.lCtrlBreakdown && R.lCtrlBreakdown[i]) || null;

    const year = ctx.year;
    const elapsed = ctx.elapsed;
    const titleText = `🏠 住宅ローン控除（${year}年・経過${elapsed}年目）`;

    // セル手動上書きの場合は自動計算値と並べて表示
    if(ctx.isOverridden){
      // breakdown に保存した元の自動計算値を優先（Pass2 で R.lCtrl が override に上書きされているため）
      const bdAuto = (R.lCtrlBreakdown && R.lCtrlBreakdown[i]) || null;
      const autoVal = (bdAuto && bdAuto.autoValue !== undefined) ? bdAuto.autoValue : ctx.autoValue;
      const autoStr = explainFmt(autoVal, '万円');
      const ovStr = explainFmt(ctx.overrideValue, '万円');
      const diffVal = (ctx.overrideValue||0) - (autoVal||0);
      const diffStr = diffVal === 0 ? '' : (diffVal > 0 ? ` (+${explainFmt(Math.abs(diffVal),'万円')})` : ` (-${explainFmt(Math.abs(diffVal),'万円')})`);
      const simple = `
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
        <div style="font-size:10px;color:#94a3b8;margin-top:6px;line-height:1.5">
          ※ 自動計算に戻すには、「手動上書きをリセット」ボタンを使ってください
        </div>
      `;
      // 詳細には元の自動計算の内訳を表示
      const bdOrig = (R.lCtrlBreakdown && R.lCtrlBreakdown[i]) || null;
      let detail = null;
      if(bdOrig && bdOrig.remainBal){
        const typeLabel = {
          'new_eco':'新築ZEH水準以上',
          'new_standard':'新築（その他）',
          'used':'中古',
          'used_eco':'中古省エネ'
        }[bdOrig.lctrlType] || '-';
        const hhLabel = bdOrig.isKosodate ? '子育て・若者夫婦世帯' : '一般世帯';
        detail = `
          <div style="font-size:11px;color:#1e3a5f;font-weight:700;margin-bottom:4px">▼ 自動計算の内訳</div>
          <div style="font-size:11px;line-height:1.6">
            年末ローン残高: ${explainFmt(bdOrig.remainBal,'万円')}<br>
            控除率: × ${bdOrig.rate}%<br>
            計算上の控除額: ${explainFmt(bdOrig.calcAmount,'万円')}<br>
            税額上限: ${explainFmt(bdOrig.taxCapTotal,'万円')}<br>
            <strong>自動適用額: ${autoStr}</strong>
            <br><br>
            <span style="color:#94a3b8">入居${bdOrig.lctrlYear}年 / ${typeLabel} / ${hhLabel} / ${bdOrig.yearIndex}年目</span>
          </div>
        `;
      }
      return { title: titleText, simple, detail: (detail||'') + LCTRL_REF_TABLE };
    }

    // 値なし（控除期間外など）
    if(value === 0 || value === null || value === undefined){
      let reason = '控除対象外';
      if(bd){
        if(bd.mode === 'manual')      reason = '手動入力（0円）';
        else if(!bd.inPeriod)          reason = `控除期間（${bd.totalYrs||'?'}年）を終了しています`;
        else if(!bd.hasLoan)           reason = 'ローン残高がない';
        else if(!bd.hasLimit)          reason = '対象外の入居年・住宅種別';
        else if(bd.calcAmount === 0)   reason = '残高上限・控除率から0円';
        else if(bd.taxCapTotal === 0)  reason = '所得税・住民税からの上限が0円';
      }
      return {
        title: titleText,
        simple: `<div style="color:#64748b">この年の控除額は <strong style="color:#1e293b">0円</strong> です。</div>
                 <div style="font-size:11px;color:#94a3b8;margin-top:6px">理由: ${reason}</div>`,
        detail: LCTRL_REF_TABLE
      };
    }

    // 手動入力モード
    if(bd && bd.mode === 'manual'){
      return {
        title: titleText,
        simple: `
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span>手動入力値</span>
            <strong style="font-size:15px;color:#1e3a5f">${explainFmt(value,'万円')}</strong>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:6px">「自由入力」モードで直接入力された値です。</div>
        `,
        detail: LCTRL_REF_TABLE
      };
    }

    // 自動計算（breakdown なしの旧データ）
    if(!bd){
      return {
        title: titleText,
        simple: `<div>控除額: <strong>${explainFmt(value,'万円')}</strong></div>
                 <div style="font-size:11px;color:#94a3b8;margin-top:6px">計算内訳データがありません。CF表を再生成してください。</div>`,
        detail: LCTRL_REF_TABLE
      };
    }

    // 通常の自動計算
    const capBal = Math.min(bd.remainBal || 0, bd.balCap || 0);
    const calcAmt = bd.calcAmount || 0;
    const taxCap = bd.taxCapTotal || 0;
    const applied = value;

    // ペアローン時の簡潔表示：夫婦別の控除額を明示
    let simple;
    if(bd.pairMode && bd.hApplied !== undefined){
      simple = `
        <div style="display:flex;flex-direction:column;gap:4px;font-size:12px">
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e2e8f0">
            <span>👔 ご主人様の控除</span><span>${explainFmt(bd.hApplied,'万円')}</span>
          </div>
          <div style="font-size:10px;color:#64748b;padding-left:16px;line-height:1.4">
            = min(残高${explainFmt(bd.hBal,'万円')}×0.7%=${explainFmt(bd.hCalcAmount,'万円')}, 税額上限${explainFmt(bd.taxCapTotal,'万円')})
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px dashed #e2e8f0">
            <span>👩 奥様の控除</span><span>${explainFmt(bd.wApplied,'万円')}</span>
          </div>
          <div style="font-size:10px;color:#64748b;padding-left:16px;line-height:1.4">
            = min(残高${explainFmt(bd.wBal,'万円')}×0.7%=${explainFmt(bd.wCalcAmount,'万円')}, 税額上限${explainFmt(bd.wTaxCapTotal,'万円')})
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
            <span>適用控除額（合算）</span>
            <span style="color:#1e3a5f;font-size:14px">${explainFmt(applied,'万円')}</span>
          </div>
        </div>
      `;
    } else {
      // 通常ローンの簡潔表示：年末残高 × 0.7% = 計算値、税金上限との min が適用額
      simple = `
        <div style="display:flex;flex-direction:column;gap:3px;font-size:12px">
          <div style="display:flex;justify-content:space-between">
            <span>年末ローン残高</span><span>${explainFmt(bd.remainBal,'万円')}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>控除率</span><span>× ${bd.rate || 0.7}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:3px;border-top:1px dashed #e2e8f0">
            <span>計算上の控除額</span><span>${explainFmt(calcAmt,'万円')}</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span>税額上限（所得税+住民税）</span><span>${explainFmt(taxCap,'万円')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:5px;border-top:2px solid #1e3a5f;font-weight:700">
            <span>適用控除額</span>
            <span style="color:#1e3a5f;font-size:14px">${explainFmt(applied,'万円')}</span>
          </div>
        </div>
      `;
    }

    // 詳細：各種上限・条件
    const typeLabel = {
      'new_eco':'新築ZEH水準以上',
      'new_standard':'新築（その他）',
      'used':'中古',
      'used_eco':'中古省エネ'
    }[bd.lctrlType] || bd.lctrlType || '-';
    const hhLabel = bd.isKosodate ? '子育て・若者夫婦世帯' : '一般世帯';

    // ペアローン時は夫婦それぞれのセクションを表示
    let pairSection = '';
    if(bd.pairMode && (bd.hBal !== undefined || bd.wBal !== undefined)){
      pairSection = `
        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ ローン内訳（ペアローン・各自独立計算）</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
          <div style="background:#f0f6ff;border:1px solid #bfdbfe;border-radius:6px;padding:6px 8px">
            <div style="font-weight:700;color:#1e5a9a;margin-bottom:3px">👔 ご主人様</div>
            <div>年末残高: ${explainFmt(bd.hBal,'万円')}</div>
            <div>計算上の控除: ${explainFmt(bd.hCalcAmount,'万円')}</div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #bfdbfe">推定額面年収: ${explainFmt(bd.grossEst,'万円')}</div>
            <div>課税所得: ${explainFmt(bd.taxableBase,'万円')}</div>
            <div>所得税: ${explainFmt(bd.itax,'万円')}</div>
            <div>住民税上限: ${explainFmt(bd.juminCtrlMax,'万円')}</div>
            <div style="margin-top:3px;padding-top:3px;border-top:1px solid #bfdbfe">税額上限: ${explainFmt((bd.itax||0)+(bd.juminCtrlMax||0),'万円')}</div>
            <div style="font-weight:700;margin-top:3px;padding-top:3px;border-top:2px solid #1e5a9a;color:#1e5a9a">適用: ${explainFmt(bd.hApplied,'万円')}</div>
          </div>
          <div style="background:#fff0f6;border:1px solid #fbcfe8;border-radius:6px;padding:6px 8px">
            <div style="font-weight:700;color:#9a1e5a;margin-bottom:3px">👩 奥様</div>
            <div>年末残高: ${explainFmt(bd.wBal,'万円')}</div>
            <div>計算上の控除: ${explainFmt(bd.wCalcAmount,'万円')}</div>
            <div style="margin-top:4px;padding-top:4px;border-top:1px dashed #fbcfe8">推定額面年収: ${explainFmt(bd.wGrossEst,'万円')}</div>
            <div>課税所得: ${explainFmt(bd.wTaxableBase,'万円')}</div>
            <div>所得税: ${explainFmt(bd.wItax,'万円')}</div>
            <div>住民税上限: ${explainFmt(bd.wJuminCtrlMax,'万円')}</div>
            <div style="margin-top:3px;padding-top:3px;border-top:1px solid #fbcfe8">税額上限: ${explainFmt(bd.wTaxCapTotal,'万円')}</div>
            <div style="font-weight:700;margin-top:3px;padding-top:3px;border-top:2px solid #9a1e5a;color:#9a1e5a">適用: ${explainFmt(bd.wApplied,'万円')}</div>
          </div>
        </div>
        <div style="font-size:10px;color:#94a3b8;margin-top:4px;line-height:1.5">
          ※ 各自の控除は自分のローン残高×0.7%（単独上限で頭打ち）を自分の税額上限で頭打ち。各自独立に計算し合算します。
        </div>
      `;
    }

    // 通常ローン時の税額計算セクション（ペアローン時は上のブロックで代替）
    const singleTaxSection = bd.pairMode ? '' : `
        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 税額計算（ご主人様）</div>
        <div>推定額面年収: ${explainFmt(bd.grossEst,'万円')}</div>
        <div>課税所得ベース: ${explainFmt(bd.taxableBase,'万円')}</div>
        <div>所得税: ${explainFmt(bd.itax,'万円')}</div>
        <div>住民税控除上限: ${explainFmt(bd.juminCtrlMax,'万円')} <span style="color:#94a3b8">（課税所得×5%、上限9.75万円）</span></div>
    `;

    const detail = `
      <div style="display:flex;flex-direction:column;gap:4px;font-size:11px">
        <div style="font-weight:700;color:#1e3a5f;margin-top:2px">▼ 適用条件</div>
        <div>入居年: <strong>${bd.lctrlYear || '-'}年</strong></div>
        <div>住宅種別: ${typeLabel}</div>
        <div>世帯属性: ${hhLabel}</div>
        <div>控除期間: ${bd.totalYrs || '-'}年 / 本年は<strong>${bd.yearIndex || '?'}年目</strong></div>
        <div>残高上限: ${explainFmt(bd.balCap,'万円')}${bd.pairMode?'（ペアローン×2適用）':''}</div>

        ${pairSection}
        ${singleTaxSection}

        <div style="font-weight:700;color:#1e3a5f;margin-top:6px">▼ 最終適用</div>
        ${bd.pairMode ? `
          <div>ご主人様適用: <strong>${explainFmt(bd.hApplied,'万円')}</strong> ＋ 奥様適用: <strong>${explainFmt(bd.wApplied,'万円')}</strong></div>
          <div>= <strong style="color:#1e3a5f">${explainFmt(applied,'万円')}</strong></div>
        ` : `
          <div>= min(計算上の控除額 <strong>${explainFmt(calcAmt,'万円')}</strong>, 税額上限 <strong>${explainFmt(taxCap,'万円')}</strong>)</div>
          <div>= <strong style="color:#1e3a5f">${explainFmt(applied,'万円')}</strong></div>
        `}

        <div style="font-size:10px;color:#94a3b8;margin-top:8px;line-height:1.5">
          ※ 令和6年度税制改正に基づく計算。所得税から控除しきれない分は住民税から控除されます（上限9.75万円）。
        </div>
      </div>
      ${LCTRL_REF_TABLE}
    `;

    return { title: titleText, simple, detail };
  });

  console.log('[explain] lctrl renderer registered');
})();
