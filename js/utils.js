// utils.js — ユーティリティ関数

function $(id){return document.getElementById(id)}
function _v(id){return $(id)?.value||''}
function iv(id){return parseInt(String($(id)?.value||'').replace(/,/g,''))||0}
function fv(id){return parseFloat(String($(id)?.value||'').replace(/,/g,''))||0}
function tog(h){const b=h.nextElementSibling,t=h.querySelector('.stog'),o=!b.classList.contains('col');b.classList.toggle('col',o);t.classList.toggle('on',!o)}
function ri(n){return Math.round(n)}// 整数丸め（小数点なし）
// 老齢厚生年金相当額を計算（収入ステップ→月収→年金設定から逆算のフォールバック）
function calcKosei(person, startAge, retAge, fallbackPension, kisoAmt){
  const CAREER_FACTOR=0.75;
  const avg=calcAvgHyojun(person, startAge, retAge);
  const joinM=Math.min(480,Math.max((retAge-startAge)*12,300));
  if(avg!==null) return avg*5.481/1000*joinM;
  const gM=fv(`${person}-gross-monthly`)||0, gB=fv(`${person}-gross-bonus`)||0;
  if(gM>0){const hyojun=(Math.min(gM,65)*12+Math.min(gB,300))/12*CAREER_FACTOR;return hyojun*5.481/1000*joinM;}
  return Math.max(0,fallbackPension-kisoAmt);
}

// 遺族厚生年金計算用の厚生年金相当額
// 被保険者期間は「就労開始→死亡年齢」で計算し、300月未満なら300月みなし（短期要件）
function calcKoseiForSurvP(person, startAge, deathAge, fallbackPension, kisoAmt){
  const CAREER_FACTOR=0.75;
  const avg=calcAvgHyojun(person, startAge, deathAge);
  // 遺族厚生年金：死亡時の被保険者期間ベース、300月未満なら300月みなし、上限480月
  const joinM=Math.min(480, Math.max((deathAge-startAge)*12, 300));
  if(avg!==null) return avg*5.481/1000*joinM;
  const gM=fv(`${person}-gross-monthly`)||0, gB=fv(`${person}-gross-bonus`)||0;
  if(gM>0){const hyojun=(Math.min(gM,65)*12+Math.min(gB,300))/12*CAREER_FACTOR;return hyojun*5.481/1000*joinM;}
  return Math.max(0,fallbackPension-kisoAmt);
}
// 空欄→デフォルト値、0を明示入力→0を返す（隠れた初期値問題の対策）
function ivd(id,def){const el=$(id);if(!el||el.value==='')return def;return parseInt(String(el.value).replace(/,/g,''))||0;}
function fvd(id,def){const el=$(id);if(!el||el.value==='')return def;return parseFloat(String(el.value).replace(/,/g,''))||0;}

// 手取り補間
function gn(g){if(!g||g<=0)return 0;for(let i=0;i<TAX.length-1;i++){if(g<=TAX[i][0])return TAX[i][1];if(g<TAX[i+1][0]){const r=(g-TAX[i][0])/(TAX[i+1][0]-TAX[i][0]);return Math.round(TAX[i][1]+r*(TAX[i+1][1]-TAX[i][1]))}}return TAX[TAX.length-1][1]}

// ===== 税制・社会保険ヘルパー =====
// 社会保険料率（協会けんぽ標準／従業員負担分）
// 14.37% = 健康保険5.0% + 厚生年金9.15% + 雇用保険0.22% 相当
// 40-64歳は介護保険料（折半後0.8%）加算
function calcShakaiRate(age){
  if(age>=40&&age<=64)return 0.1437+0.008;
  return 0.1437;
}
// 配偶者控除の適用可否判定（税制準拠・簡略）
// - 配偶者の年収103万以下（合計所得48万以下）
// - 本人の年収おおむね1,095万以下（合計所得900万以下）
function canApplySpouseDed(selfGross, spouseGross){
  if(spouseGross>103)return false;
  if(selfGross>1095)return false;
  return true;
}
// 給与所得控除（令和2年改正後、上限195万）— 国税庁正規表に準拠
// https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm
function calcKyuyoDed(gross){
  if(gross<=162.5)return 55;
  if(gross<=180)return gross*0.4-10;
  if(gross<=360)return gross*0.3+8;
  if(gross<=660)return gross*0.2+44;
  if(gross<=850)return gross*0.1+110;
  return 195; // 850万円超は195万円固定（上限）
}
// 基礎控除（2020年改正：所得2,400万超で逓減）
// 戻り値：[所得税の基礎控除額, 住民税の基礎控除額]
function calcKisoDed(taxableBeforeKiso){
  // 合計所得金額 ≒ taxableBeforeKiso (ほぼ課税所得前＝給与所得)
  if(taxableBeforeKiso<=2400)return [48,43];
  if(taxableBeforeKiso<=2450)return [32,29];
  if(taxableBeforeKiso<=2500)return [16,15];
  return [0,0];
}
// 所得税額の計算（累進税率＋復興特別所得税 ×1.021）
function calcIncomeTax(taxable){
  if(taxable<=0)return 0;
  let it;
  if(taxable<=195)it=taxable*0.05;
  else if(taxable<=330)it=taxable*0.1-9.75;
  else if(taxable<=695)it=taxable*0.2-42.75;
  else if(taxable<=900)it=taxable*0.23-63.6;
  else if(taxable<=1800)it=taxable*0.33-153.6;
  else if(taxable<=4000)it=taxable*0.4-279.6;
  else it=taxable*0.45-479.6;
  return Math.round(it*1.021*10)/10;
}
// 住民税計算（所得割10% + 均等割5,000円 - 調整控除簡略2,500円）
// juminTaxable は住民税課税所得（基礎控除43万・配偶者控除33万等を差し引き済み）
function calcJuminTax(juminTaxable){
  if(juminTaxable<=0)return 0.5; // 均等割のみ
  const shotokuwari=Math.max(0,juminTaxable*0.1-0.25); // 調整控除（簡略：一律2,500円）
  return Math.round((shotokuwari+0.5)*10)/10; // +均等割5,000円
}

// 退職所得控除額（勤続年数ベース）
// - 20年以下: 40万 × 勤続年数（最低80万）
// - 20年超:   800万 + 70万 × (勤続年数 - 20)
function calcTaishokuDed(kinzokuYears){
  const y=Math.max(1,Math.floor(kinzokuYears||0));
  if(y<=20)return Math.max(80, 40*y);
  return 800 + 70*(y-20);
}
// 退職一時金の税引後手取り額を計算
// - 退職所得控除を差し引き、1/2 課税で所得税・住民税を算出
// - grossBumpWan は同一年の他の給与所得の課税所得（退職所得は分離課税のため原則 0 でOK）
function calcTaishokuNet(lumpSum, kinzokuYears){
  if(!lumpSum||lumpSum<=0)return 0;
  const ded=calcTaishokuDed(kinzokuYears);
  const taxable=Math.max(0,(lumpSum-ded)/2);
  const itax=calcIncomeTax(taxable);
  // 退職所得の住民税は所得割10%のみ（均等割なし・調整控除なし）
  const jumin=Math.round(taxable*0.1*10)/10;
  const tax=itax+jumin;
  return Math.round((lumpSum-tax)*10)/10;
}

// 老齢年金（65歳以上・他所得なし前提）の額面→各控除の詳細計算
// 公的年金等控除・社会保険料（介護保険等概算）・所得税・住民税を算出
function breakdownPension65plus(grossWan){
  if(!grossWan||grossWan<=0)return null;
  // 公的年金等控除（65歳以上、他所得1,000万以下）
  let kokinDed;
  if(grossWan<=330)kokinDed=110;
  else if(grossWan<=410)kokinDed=grossWan*0.25+27.5;
  else if(grossWan<=770)kokinDed=grossWan*0.15+68.5;
  else if(grossWan<=1000)kokinDed=grossWan*0.05+145.5;
  else kokinDed=195.5;
  kokinDed=Math.round(kokinDed*10)/10;
  // 社会保険料相当（介護保険料＋国保等の概算、実態は自治体で±大）
  // 65歳以上公的年金からの天引き概算：年金額×9%前後
  const shakai=Math.round(grossWan*0.09*10)/10;
  // 雑所得（年金所得）
  const grossSyotoku=Math.max(0,grossWan-kokinDed);
  // 所得税（基礎控除48万）
  const taxableIT=Math.max(0,grossSyotoku-shakai-48);
  const itax=calcIncomeTax(taxableIT);
  // 住民税（基礎控除43万、均等割＋調整控除は calcJuminTax で処理）
  const taxableJU=Math.max(0,grossSyotoku-shakai-43);
  const jumin=calcJuminTax(taxableJU);
  const net=Math.round((grossWan-shakai-itax-jumin)*10)/10;
  return {gross:grossWan, kokinDed, shakai, itax, jumin, net};
}

// 老齢年金の手取り → 額面 逆算（65歳以上想定）
// breakdownPension65plus を使い二分探索で厳密逆算
function estimatePensionGrossFromNet(netWan){
  if(!netWan||netWan<=0)return 0;
  if(netWan<=110)return Math.round(netWan*10)/10; // 非課税相当
  let lo=netWan, hi=netWan*1.5;
  for(let iter=0;iter<30;iter++){
    const mid=(lo+hi)/2;
    const bd=breakdownPension65plus(mid);
    if(!bd)break;
    if(bd.net>=netWan)hi=mid;else lo=mid;
  }
  return Math.round((lo+hi)/2*10)/10;
}

function getLCtrlRow(yr, tp, isKosodate){
  const key = `${Math.min(Math.max(yr,2024),2030)}_${isKosodate?'kosodate':'general'}`;
  const row = (LCTRL_TABLE[key]||LCTRL_TABLE['2025_general'])[tp]||[0,0];
  return row;
}

function selectAll(el){
  // contenteditable td のテキストを全選択
  try{
    const range=document.createRange();
    range.selectNodeContents(el);
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }catch(e){}
}
function _getAutoCellValue(row,col,isMG){
  const R=isMG?window.lastMR:window.lastR;
  if(!R)return undefined;
  if(Array.isArray(R[row]))return R[row][col];
  const m=row.match(/^edu(\d+)$/);
  if(m&&Array.isArray(R.edu)){const ci=parseInt(m[1]);return R.edu[ci]?.[col];}
  const dynCollections=['carRows','secInvestRows','secRedeemRows','insMonthlyRows','insLumpExpRows','extRows','insAnnuityRows','finAssetRows'];
  for(const dc of dynCollections){
    const coll=R[dc];if(!coll)continue;
    const found=coll.find(r=>r.key===row);
    if(found)return found.vals?.[col];
  }
  return undefined;
}
function cellEdit(td){
  const row=td.dataset.row, col=parseInt(td.dataset.col);
  if(!row&&row!=='0')return;
  const isMG=td.dataset.mg==='1';
  const ovr=isMG?mgOverrides:cfOverrides;
  const raw=td.textContent.replace(/,/g,'').trim();
  const num=parseFloat(raw);
  const hadOvr=ovr[row]?.[col]!==undefined;
  if(raw===''){
    // 明示的に空にした → 0として上書き（自動計算値に戻さない）
    // ただし、自動値が既に0で上書きも無い場合は何もしない（ただのクリックで0化しない）
    const autoE=_getAutoCellValue(row,col,isMG);
    if(!hadOvr&&(autoE===undefined||ri(autoE)===0))return;
    if(!ovr[row])ovr[row]={};
    ovr[row][col]=0;
    td.classList.add('cell-ovr');
    td.textContent='0';
  } else if(raw==='-'){
    // '-' のまま blur（変更なし） → 既存上書きは維持、無ければ何もしない
    if(!hadOvr)return;
  } else if(!isNaN(num)){
    // 数値が自動計算値と一致し、かつ既存上書きも無い場合はクリック扱いとしてスキップ
    if(!hadOvr){
      const auto=_getAutoCellValue(row,col,isMG);
      if(auto!==undefined&&ri(num)===ri(auto))return;
    }
    if(!ovr[row])ovr[row]={};
    ovr[row][col]=num;
    td.classList.add('cell-ovr');
    td.textContent=num.toLocaleString();
  } else {
    return;
  }
  pushUndoSnap();
  if(isMG){
    // Q&A万が一タブがアクティブなら該当タブを再計算
    if(window._mgQA_activeTabId && typeof mgQA_tabs!=='undefined'){
      const tab=mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId);
      if(tab && typeof mgQA_calcAndRender==='function'){mgQA_calcAndRender(tab,true);return;}
    }
    renderContingency();
  } else render();
}
function resetOverrides(){
  if(!confirm('CF表の手動上書きをすべてリセットしますか？'))return;
  cfOverrides={};mgOverrides={};
  // Q&A万が一タブがアクティブなら該当タブを再計算、それ以外は文脈に合わせて再描画
  if(window._mgQA_activeTabId && typeof mgQA_tabs!=='undefined'){
    const tab=mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId);
    if(tab && typeof mgQA_calcAndRender==='function'){mgQA_calcAndRender(tab,true);return;}
  }
  if(rTab==='mg-h'||rTab==='mg-w')renderContingency();
  else render();
}
function rowLabelEdit(td){
  const key=td.dataset.rowlbl;if(!key)return;
  const txt=td.textContent.trim();
  const def=td.dataset.default||'';
  if(!txt||txt===def){delete _cfRowLabels[key];}
  else{_cfRowLabels[key]=txt;}
  scheduleAutoSave();
}

// CF表の詳細ボックス（自己資金内訳・住宅ローン条件）の折りたたみトグル
// 自由記入欄の保存（localStorageに永続化、Excel出力時に参照）
function saveCfSummaryNote(text){
  try{localStorage.setItem('cf_summary_note', text||'')}catch(e){}
}
window.saveCfSummaryNote = saveCfSummaryNote;
// 自動資産取崩しのON/OFF切替
function toggleAutoLiq(){
  try{
    const off = localStorage.getItem('cf_auto_liq_off')==='1';
    localStorage.setItem('cf_auto_liq_off', off?'0':'1');
  }catch(e){}
  if(typeof live==='function')live(true);
}
window.toggleAutoLiq = toggleAutoLiq;

// 自動資産取崩しの計算ルールを説明するモーダル
function showAutoLiqHelp(){
  // 既存モーダルを削除
  document.getElementById('auto-liq-help-modal')?.remove();
  const modal=document.createElement('div');
  modal.id='auto-liq-help-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic UI","Meiryo",sans-serif';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:10px;max-width:780px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      <div style="background:linear-gradient(135deg,#1e40af,#2563eb);color:#fff;padding:16px 24px;border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:16px;font-weight:700">📤 自動資産取崩しの計算ルール</div>
        <button onclick="document.getElementById('auto-liq-help-modal').remove()" style="background:transparent;color:#fff;border:1px solid #fff;border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer">✕ 閉じる</button>
      </div>
      <div style="padding:20px 24px;font-size:13px;line-height:1.7;color:#1a3a6a">

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:0 0 12px">▍ 機能の概要</h3>
        <p style="margin:0 0 16px">預貯金残高がマイナスになる年に、<strong>有価証券から自動的に取崩して補填</strong>します。
        借入による補填を避け、現実的な「資産取崩し計画」をシミュレーションします。</p>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 取崩しの優先順位</h3>
        <ol style="margin:0 0 16px;padding-left:24px">
          <li style="margin-bottom:6px"><strong>課税口座</strong>（一括投資・課税積立）から先に取崩し</li>
          <li style="margin-bottom:6px"><strong>NISA口座</strong>は最後まで温存（非課税枠を長く活かす）</li>
          <li style="margin-bottom:6px">同じ優先順位内では、ご主人/奥様問わず<strong>残高比例で配分</strong></li>
        </ol>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 譲渡益課税の計算</h3>
        <div style="background:#fef7ed;border:1px solid #fcd34d;border-radius:6px;padding:12px;margin-bottom:16px">
          <div style="font-weight:700;margin-bottom:8px">課税口座の場合（NISAは非課税で計算スキップ）</div>
          <div style="font-family:'Cascadia Code',Consolas,monospace;font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:10px;margin-bottom:8px">
            含み益率 = max(0, (現在評価額 − 取得原価) / 現在評価額)<br>
            税率 = 含み益率 × 20.315%<br>
            <small style="color:#475569">※20.315% = 所得税15% + 住民税5% + 復興特別所得税0.315%</small>
          </div>
          <div style="font-size:11px;color:#475569">📌 取得原価は「取得価格累計（basis）」が入力されていればそれを使用、なければ現在評価額で代用（含み益0で計算）</div>
        </div>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 取崩し額の計算フロー</h3>
        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;padding:12px;margin-bottom:16px">
          <div style="margin-bottom:8px"><strong>① 不足額（shortfall）の計算</strong></div>
          <div style="font-family:'Cascadia Code',Consolas,monospace;font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-bottom:12px">
            shortfall = 当年支出 − 当年収入 − 前年預貯金残高
          </div>

          <div style="margin-bottom:8px"><strong>② 取崩し総額（gross）の算出（税込み逆算）</strong></div>
          <div style="font-family:'Cascadia Code',Consolas,monospace;font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:8px;margin-bottom:12px">
            net = take × (1 − 税率)<br>
            合計net = shortfall を満たすには：<br>
            ratio = shortfall / Σ(評価額 × (1 − 税率))<br>
            各証券からの取崩し額 = 評価額 × ratio
          </div>

          <div style="margin-bottom:8px"><strong>③ 結果</strong></div>
          <div style="font-family:'Cascadia Code',Consolas,monospace;font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:4px;padding:8px">
            CF表上の収入「📤 自動資産取崩し」 = gross（取崩し総額）<br>
            CF表上の支出「💰 譲渡益課税」 = gross × 税率<br>
            預貯金残高への補填額 = gross − 税額（= 当初の不足額）
          </div>
        </div>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 取崩し後の残高への影響</h3>
        <p style="margin:0 0 12px">取崩した有価証券は、翌年以降も<strong>取崩し分の複利成長を失った状態</strong>で表示されます。</p>
        <div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:6px;padding:12px;margin-bottom:16px;font-size:12px">
          <strong>計算式:</strong><br>
          <span style="font-family:'Cascadia Code',Consolas,monospace;font-size:11px">
          年N時点の残高 = 元のFV − Σ(取崩し額 × (1 + 利回り)^(N − 取崩し年))
          </span>
        </div>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 計算例</h3>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-bottom:16px;font-size:12px">
          <p style="margin:0 0 8px"><strong>シナリオ:</strong> 課税口座 評価額 2,040万 / 取得原価 1,600万 / 不足額 100万</p>
          <ol style="margin:8px 0;padding-left:20px">
            <li>含み益率 = (2,040 − 1,600) / 2,040 = <strong>21.6%</strong></li>
            <li>税率 = 21.6% × 20.315% = <strong>4.4%</strong></li>
            <li>取崩し額 = 100 / (1 − 0.044) = <strong>104.6万円</strong></li>
            <li>税額 = 104.6 × 4.4% = <strong>4.6万円</strong></li>
            <li>手取り = 104.6 − 4.6 = <strong>100万円</strong> ✓ 不足額をカバー</li>
            <li>取崩し後の残高 = 2,040 − 104.6 = <strong>1,935.4万円</strong></li>
          </ol>
        </div>

        <h3 style="font-size:14px;font-weight:700;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin:24px 0 12px">▍ 注意事項</h3>
        <ul style="margin:0;padding-left:24px">
          <li style="margin-bottom:6px">課税口座の<strong>取得原価（basis）が未入力</strong>の場合、現在評価額を取得原価として近似します（=含み益0 = 税金0で計算されます）。実態と乖離する可能性があります。</li>
          <li style="margin-bottom:6px">解約年齢（redeemAge）に達した有価証券は自動取崩しの対象外。その年に通常解約処理されます。</li>
          <li style="margin-bottom:6px">有価証券の評価額が不足を満たせない場合は、預貯金がマイナスのまま残ります（借入が必要）。</li>
          <li style="margin-bottom:6px">本機能はあくまでシミュレーション。実際の運用では証券担保ローンや部分取崩しなど多様な選択肢があります。</li>
        </ul>

      </div>
    </div>
  `;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}
window.showAutoLiqHelp = showAutoLiqHelp;

function toggleCfSummaryDetail(){
  const box=document.getElementById('cf-summary-detail');
  const btn=document.getElementById('cf-summary-toggle');
  if(!box||!btn) return;
  const hidden=box.style.display==='none';
  if(hidden){
    box.style.display='';
    btn.textContent='▾ 詳細を隠す';
    try{localStorage.setItem('cf_summary_collapsed','0')}catch(e){}
  }else{
    box.style.display='none';
    btn.textContent='▸ 詳細を表示';
    try{localStorage.setItem('cf_summary_collapsed','1')}catch(e){}
  }
}

// 万が一CF表の詳細ボックス折りたたみトグル
function toggleMgSummaryDetail(){
  const box=document.getElementById('mg-summary-detail');
  const btn=document.getElementById('mg-summary-toggle');
  if(!box||!btn) return;
  const hidden=box.style.display==='none';
  if(hidden){
    box.style.display='';
    btn.textContent='▾ 詳細を隠す';
    try{localStorage.setItem('mg_summary_collapsed','0')}catch(e){}
  }else{
    box.style.display='none';
    btn.textContent='▸ 詳細を表示';
    try{localStorage.setItem('mg_summary_collapsed','1')}catch(e){}
  }
}

// CF表の先頭年ヘッダーをクリック編集で変更
function setCfStartYearFromCell(th){
  const raw=String(th.textContent||'').trim();
  const y=parseInt(raw.replace(/[^\d]/g,''));
  const cur=getCfStartYear();
  if(isNaN(y) || y<1900 || y>2200){
    // 無効値は元に戻す
    th.textContent=cur;
    return;
  }
  if(y===cur){
    th.textContent=y;
    return;
  }
  _cfStartYear=y;
  pushUndoSnap();
  scheduleAutoSave();
  // 現在表示中のCF表を即座に再描画（通常・万が一の両方に対応）
  // live() は遅延なのでここでは直接呼ぶ
  const isQATab=!!window._mgQA_activeTabId;
  const isMg=isQATab || ((typeof rTab!=='undefined')&&(rTab==='mg-h'||rTab==='mg-w'));
  if(isQATab && typeof mgQA_tabs!=='undefined'){
    // 万が一Q&Aタブ: 該当タブの再計算・再描画
    const tab=mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId);
    if(tab && typeof mgQA_calcAndRender==='function'){
      mgQA_calcAndRender(tab, true);
    } else if(typeof renderContingency==='function'){
      renderContingency();
    }
  } else if(isMg && typeof renderContingency==='function'){
    renderContingency();
  } else if(typeof render==='function'){
    render();
  }
  if(typeof live==='function') live();
}

// カスタム行操作
function addCustomRow(type){
  _cfCustomId++;
  // Q&A万が一タブがアクティブな場合も MG 文脈として扱う
  const isMG=(rTab==='mg-h'||rTab==='mg-w')||!!window._mgQA_activeTabId;
  const prefix=isMG?'m':'c';
  const id=type==='inc'?prefix+'inc_'+_cfCustomId:prefix+'exp_'+_cfCustomId;
  const target=isMG?mgCustomRows:cfCustomRows;
  target.push({id:id,type:type,label:type==='inc'?'カスタム収入':'カスタム支出'});
  pushUndoSnap();
  if(isMG){
    if(window._mgQA_activeTabId && typeof mgQA_tabs!=='undefined'){
      const tab=mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId);
      if(tab && typeof mgQA_calcAndRender==='function'){mgQA_calcAndRender(tab,true);return;}
    }
    renderContingency();
  } else render();
}
function customLabelEdit(td){
  const id=td.dataset.customId;
  const row=cfCustomRows.find(r=>r.id===id)||mgCustomRows.find(r=>r.id===id);
  if(!row)return;
  const txt=td.textContent.trim();
  row.label=txt||(row.type==='inc'?'カスタム収入':'カスタム支出');
  pushUndoSnap();
  scheduleAutoSave();
}
function deleteCustomRow(id){
  if(!confirm('この行を削除しますか？'))return;
  const inMg=mgCustomRows.some(r=>r.id===id);
  if(inMg){mgCustomRows=mgCustomRows.filter(r=>r.id!==id);delete mgOverrides[id];}
  else{cfCustomRows=cfCustomRows.filter(r=>r.id!==id);delete cfOverrides[id];}
  pushUndoSnap();
  // Q&A万が一タブがアクティブなら該当タブを再計算
  if(window._mgQA_activeTabId && typeof mgQA_tabs!=='undefined'){
    const tab=mgQA_tabs.find(t=>t.id===window._mgQA_activeTabId);
    if(tab && typeof mgQA_calcAndRender==='function'){mgQA_calcAndRender(tab,true);return;}
  }
  if(rTab==='mg-h'||rTab==='mg-w')renderContingency();else render();
}

function _getInputHash(){
  let s='';
  document.querySelectorAll('input,select').forEach(el=>{
    if(!el.id)return;
    // チェックボックスは .value が常に "on" なので .checked を見る必要がある
    // （これを見ないと「自動調整なし」等のトグルでCF表が再計算されない）
    const v = el.type==='checkbox' ? (el.checked?'1':'0') : el.value;
    s += el.id + '=' + v + '|';
  });
  return s;
}
