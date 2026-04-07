// export.js — Excel・PDF出力

// ===== Excel印刷設定XML注入（xlsx-js-styleはpageSetup非対応のため） =====
// A4横: 印刷可能領域 = 幅:267mm 高:190mm（余白0.3inch左右, 0.4inch上下）
// scale=行数から自動計算してfitToPage相当を実現する
async function _writeXlsxWithPageSetup(wb, fname, sheetName) {
  try {
    if(typeof JSZip === 'undefined') throw new Error('JSZip未ロード');
    // xlsx-js-styleはtype:'binary'対応
    const bin = XLSX.write(wb, {bookType:'xlsx', type:'binary'});
    // binary string → Uint8Array
    const u8 = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i)&0xFF;

    const zip = await JSZip.loadAsync(u8);
    const sheetIdx = wb.SheetNames.indexOf(sheetName);
    const xmlPath = `xl/worksheets/sheet${sheetIdx+1}.xml`;
    let xml = await zip.file(xmlPath).async('string');

    // 「すべての行を1ページに印刷」
    // ① sheetPrにpageSetUpPr fitToPage="1"を挿入
    const sheetPrTag = '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
    if(/<sheetPr/.test(xml)){
      // 既存sheetPrにpageSetUpPrを追加/置換
      if(/<pageSetUpPr/.test(xml)){
        xml = xml.replace(/<pageSetUpPr[^/]*\/>/,'<pageSetUpPr fitToPage="1"/>');
      } else {
        xml = xml.replace(/<sheetPr\s*\/>/,sheetPrTag);
        xml = xml.replace(/(<sheetPr(?:\s[^>]*)?>)(?!<pageSetUpPr)/,'$1<pageSetUpPr fitToPage="1"/>');
      }
    } else {
      // sheetPrがない場合: worksheetの直後に挿入
      xml = xml.replace(/(<worksheet[^>]*>)/,'$1'+sheetPrTag);
    }
    // ② pageSetupタグを挿入/置換
    const setupTag = `<pageSetup paperSize="9" orientation="landscape" fitToHeight="1" fitToWidth="0"/>`;
    if(/<pageSetup/.test(xml)){
      xml = xml.replace(/<pageSetup[^/]*\/>/,setupTag);
    } else if(/<pageMargins/.test(xml)){
      xml = xml.replace(/(<pageMargins[^/]*\/>)/,'$1'+setupTag);
    } else {
      xml = xml.replace(/<\/worksheet>/,setupTag+'</worksheet>');
    }
    zip.file(xmlPath, xml);

    const out = await zip.generateAsync({type:'uint8array'});
    const blob = new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    // FileSaver.jsを使ってダウンロード（async内でも確実に動作）
    saveAs(blob, fname);
  } catch(e) {
    console.error('_writeXlsxWithPageSetup error:', e);
    XLSX.writeFile(wb, fname);
  }
}

// ===== 印刷用情報 =====
function getPrintInfo(){
  const notesRaw=($('pi-notes')?.value||'').split('\n').filter(l=>l.trim());
  return{name:_v('pi-name'),company:_v('pi-company'),address:_v('pi-address'),tel:_v('pi-tel'),email:_v('pi-email'),notes:notesRaw};
}
function _savePrintInfo(){
  const info=getPrintInfo();
  try{localStorage.setItem(PI_STORAGE_KEY,JSON.stringify(info));}catch(e){}
}
function _loadPrintInfo(){
  try{
    const s=localStorage.getItem(PI_STORAGE_KEY);
    if(!s)return;
    const info=JSON.parse(s);
    if(info.name)$('pi-name').value=info.name;
    if(info.company)$('pi-company').value=info.company;
    if(info.address)$('pi-address').value=info.address;
    if(info.tel)$('pi-tel').value=info.tel;
    if(info.email)$('pi-email').value=info.email;
    if(info.notes&&info.notes.length)$('pi-notes').value=info.notes.join('\n');
  }catch(e){}
}

// ===== 出力前モーダル =====
function showExportModal(exportType){
  if(exportType==='mg'){
    const mgKey=rTab==='mg-h'?'h':'w';
    if(!window._mgMRStore||!window._mgMRStore[mgKey]){alert('先に万が一CF表を生成してください');return;}
  }else if(!window.lastR){alert('先にCF表を生成してください');return;}
  document.getElementById('export-modal')?.remove();
  _loadPrintInfo();
  const pi=getPrintInfo();
  const modal=document.createElement('div');
  modal.id='export-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  const fld=(id,lbl,val,ph,span)=>`
    <div class="fg" ${span?'style="grid-column:span 2"':''}>
      <label style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:2px;display:block">${lbl}</label>
      <input id="em-${id}" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}"
        style="width:100%;font-size:12px;padding:6px 8px;border:1.5px solid #cbd5e1;border-radius:6px;font-family:inherit;outline:none;box-sizing:border-box"
        onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#cbd5e1'">
    </div>`;
  const notesText=pi.notes.join('\n');
  modal.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:24px;width:520px;max-width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:15px;color:#1e3a5f">${exportType==='mg'?'📊 万が一CF表 Excel出力':exportType==='excel'?'📊 Excel出力':exportType==='pdf'?'📄 PDF出力':'🖨️ 印刷'}</div>
        <button onclick="document.getElementById('export-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px">✕</button>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:10px;letter-spacing:.04em">👤 使用者情報</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${fld('name','氏名・役職',pi.name,'')}
          ${fld('company','会社名',pi.company,'')}
          ${fld('address','住所・支社',pi.address,'',true)}
          ${fld('tel','電話番号',pi.tel,'')}
          ${fld('email','メールアドレス',pi.email,'')}
        </div>
      </div>
      <div style="background:#fffbf5;border:1px solid #fed7aa;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:8px;letter-spacing:.04em">📋 注意文章（1行ずつ表示されます）</div>
        <textarea id="em-notes" rows="5" style="width:100%;font-size:11px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-family:inherit;outline:none;color:#475569;resize:vertical;line-height:1.6;box-sizing:border-box"
          onfocus="this.style.borderColor='#2d7dd2'" onblur="this.style.borderColor='#e2e8f0'">${notesText}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:4px">
        <button onclick="document.getElementById('export-modal').remove()" style="font-size:12px;padding:8px 16px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font-weight:600">キャンセル</button>
        <button onclick="_doExport('${exportType}')" style="font-size:12px;padding:8px 24px;background:#1e3a5f;color:#fff;border:none;border-radius:7px;cursor:pointer;font-weight:700">${exportType==='mg'?'📊 Excel出力':exportType==='excel'?'📊 Excel出力':exportType==='pdf'?'📄 PDF出力':'🖨️ 印刷'}</button>
      </div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}
function _applyExportModalValues(){
  const ids=['name','company','address','tel','email'];
  ids.forEach(id=>{const el=document.getElementById(`em-${id}`);if(el)$(`pi-${id}`).value=el.value;});
  const notesEl=document.getElementById('em-notes');
  if(notesEl)$('pi-notes').value=notesEl.value;
  _savePrintInfo();
}
function _doExport(type){
  _applyExportModalValues();
  document.getElementById('export-modal')?.remove();
  if(type==='excel')exportExcel();
  else if(type==='mg')exportExcelMG();
  else if(type==='pdf')exportPDF();
  else window.print();
}

async function exportExcelMG(){
  const mgKey=rTab==='mg-h'?'h':'w';
  const MR=window._mgMRStore&&window._mgMRStore[mgKey];
  if(!MR){alert('先に万が一CF表を生成してください');return;}
  const N=window.lastR;
  const disp=MR.yr.length;
  const infoSpan=3; // info行1項目あたりの列数（shrinkToFitで収める）
  const cLbls=['第一子','第二子','第三子','第四子'];
  const isM=ST.type==='mansion';
  const clientName=(_v('client-name')||'').trim()||'CF表';
  if(!(_v('client-name')||'').trim()){
    if(!confirm('お客様氏名が未入力です。このまま出力しますか？')){
      document.getElementById('client-name')?.focus();
      return;
    }
  }
  const targetIsH=rTab==='mg-h';
  const targetLabel=targetIsH?'ご主人様':'奥様';
  const hAge=iv('ha')||30, wAge=iv('wa')||28;

  const wb=XLSX.utils.book_new();
  const rows=[], types=[];
  const push=(data,type)=>{rows.push(data);types.push(type);};

  // ── 前提条件情報（通常CFと同じ形式） ──
  const housePrice=fv('house-price')||0;
  const downPay=fv('down-payment')||0;
  const houseCostV=fv('house-cost')||0;
  const movingCostV=fv('moving-cost')||0;
  const furnitureInitV=fv('furniture-init')||0;
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const cashTotal=cashH+cashW+cashJoint;
  const costTypeV_mg=document.getElementById('cost-type')?.value||'cash';
  const downFromOwn=downType==='gift'?0:downPay;
  const houseCostDeductMG=costTypeV_mg==='loan'?0:houseCostV;
  const initialOut=downFromOwn+houseCostDeductMG+movingCostV+furnitureInitV;
  const cashAfter=cashTotal-initialOut;
  const loanAmtV=fv('loan-amt')||0;
  const loanYrsV=iv('loan-yrs')||35;
  const rateBaseV=fv('rate-base')||0.5;
  const rates=getRates();
  const rateDisp=rates.length>1?`${rateBaseV}%〜`:`${rateBaseV}%`;
  const deliveryYrV=iv('delivery-year')||0;

  // ── タイトル行（通常CFと同形式 + E列に万が一ラベル） ──
  const mgLabel=`${targetLabel} 万が一`;
  const titleRow=[`${clientName} 様`,'',isM?'マンション':'戸建て','',mgLabel];
  while(titleRow.length<disp+3)titleRow.push('');
  push(titleRow,'title');

  // ── 頭金の内訳（通常CFと同じ個別セル形式） ──
  // info行：ラベル:値を1セルに統合しinfoSpan列分統合（隠れ防止）
  const _pad=(n)=>Array(n-1).fill('');
  const infoRow1=['💰 頭金の内訳','',
    `現預金: ${cashTotal}万円`,..._pad(infoSpan),
    `${downType==='gift'?'頭金(贈与)':'頭金'}: ${downPay}万円`,..._pad(infoSpan),
    `${costTypeV_mg==='loan'?'諸費用(込)':'諸費用'}: ${houseCostV}万円`,..._pad(infoSpan),
    `引越家具: ${(movingCostV+furnitureInitV)}万円`,..._pad(infoSpan),
    `購入後残高: ${cashAfter}万円`,..._pad(infoSpan),
  ];
  const infoRow1Len=infoRow1.length;
  while(infoRow1.length<disp+3)infoRow1.push('');
  push(infoRow1,'info');

  // ── 住宅ローン条件 ──
  const infoRow2=['🏦 住宅ローン条件','',
    `物件価格: ${housePrice}万円`,..._pad(infoSpan),
    `借入額: ${loanAmtV}万円`,..._pad(infoSpan),
    `金利: ${rateDisp}`,..._pad(infoSpan),
    `期間: ${loanYrsV}年`,..._pad(infoSpan),
  ];
  if(deliveryYrV>0){infoRow2.push(`引渡し: ${deliveryYrV}年`,..._pad(infoSpan));}
  const infoRow2Len=infoRow2.length;
  while(infoRow2.length<disp+3)infoRow2.push('');
  push(infoRow2,'info');

  // 空行
  push(Array(disp+3).fill(''),'blank');

  // info行のデータ長を記録
  const infoDataLens=[infoRow1Len,infoRow2Len];

  // ── ヘッダー ──
  push(['カテゴリ','項目',...MR.yr.map(String),'合計'],'header');
  // 経過年
  push(['経過年','',...MR.yr.map((_,i)=>i+1),'-'],'elapsed');

  // ── 年齢（ご主人様と奥様の両方を表示） ──
  push(['年齢','ご主人様',...MR.hA.slice(0,disp),''],'age');
  push(['','奥様',...MR.wA.slice(0,disp),''],'age');

  // 子ども年齢
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{children.push({age:parseInt(el.value)||0});});
  children.forEach((c,ci)=>{
    push(['',cLbls[ci],...MR.yr.map((_,i)=>c.age+i),''],'age');
  });

  // ── イベント（ご主人様と奥様の両方を表示） ──
  // ご主人様イベント
  push(['イベント','ご主人様',...MR.yr.map((_,i)=>{
    const ha=hAge+i;
    if(targetIsH&&MR._deathOffset&&i===MR._deathOffset-1)return 'ご逝去';
    if(ha===60)return '定年';
    if(ha===65)return '年金開始';
    return '';
  }),''],'event');
  // 奥様イベント
  push(['','奥様',...MR.yr.map((_,i)=>{
    const wa=wAge+i;
    if(!targetIsH&&MR._deathOffset&&i===MR._deathOffset-1)return 'ご逝去';
    if(wa===60)return '定年';
    if(wa===65)return '年金開始';
    return '';
  }),''],'event');

  // 子どもイベント
  const childEvRows2=[];
  children.forEach((c,ci)=>{
    const ages=MR.yr.map((_,i)=>c.age+i);
    const hStartAge_mg=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
    childEvRows2.push({rowIdx:rows.length,ages,hStartAge:hStartAge_mg});
    const un=_v(`cu-${ci+1}`)||'plit_h';
    const hSA=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
    const hTp=_v(`hoiku-type-${ci+1}`)||'hoikuen';
    const hLb=hTp==='youchien'?'幼稚園入園':'保育園入園';
    push(['',cLbls[ci],...ages.map(ca=>{
      if(ca===0)return '誕生';
      if(ca===hSA&&ca<=6)return hLb;
      if(ca===7)return '小学入学';
      if(ca===13)return '中学入学';
      if(ca===16)return '高校入学';
      if(ca===19)return un.startsWith('senmon')?'専門入学':'大学入学';
      return '';
    }),''],'event');
  });

  // ── 収入 ──
  push(['収　入','',...Array(disp).fill(''),''],'incCat');
  // 万が一では消失項目も0で表示（通常CFと同じ項目構成）
  const addI=(lbl,arr)=>{
    if(!arr){arr=Array(disp).fill(0);}
    const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'inc');
  };
  const addISkip=(lbl,arr)=>{
    if(!arr)return;const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    if(tot===0)return;
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'inc');
  };
  addI('ご主人手取年収',MR.hInc);
  addI('奥様手取年収',MR.wInc);
  addISkip('副業・その他収入',MR.otherInc);
  addISkip('退職金（ご主人）',MR.rPay);
  addISkip('退職金（奥様）',MR.wRPay);
  addISkip('本人年金',MR.pS);
  addISkip('配偶者年金',MR.pW);
  addI('遺族年金',MR.survPension);
  addISkip('死亡保険金',MR.insPayArr);
  addISkip('金融資産現金化',MR.finLiquid);
  addISkip('DC受取(主)',MR.dcReceiptH);
  addISkip('DC受取(奥様)',MR.dcReceiptW);
  addISkip('iDeCo受取(主)',MR.idecoReceiptH);
  addISkip('iDeCo受取(奥様)',MR.idecoReceiptW);
  addISkip('保険満期金',MR.insMat);
  if(MR.secRedeemRows)MR.secRedeemRows.forEach(row=>{if(row.vals.slice(0,disp).some(v=>v>0))addISkip(row.lbl,row.vals);});
  addISkip('奨学金',MR.scholarship);
  addI('児童手当',MR.teate||N.teate);
  addI('住宅ローン控除',MR.lCtrl||N.lCtrl);
  cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{const vals=Array.from({length:disp},(_,i)=>mgOverrides[r.id]?.[i]||0);addI(r.label,vals);});
  push(['収入合計','',...MR.incT.slice(0,disp).map(v=>ri(v)),ri(MR.incT.slice(0,disp).reduce((a,b)=>a+b,0))],'incTotal');

  // ── 支出 ──
  push(['支　出','',...Array(disp).fill(''),''],'expCat');
  const addE=(lbl,arr)=>{
    if(!arr){arr=Array(disp).fill(0);}
    const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'exp');
  };
  const addESkip=(lbl,arr)=>{
    if(!arr)return;const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    if(tot===0)return;
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'exp');
  };
  addE(_rl('mg-lc','生活費'),MR.lc);
  addESkip(_rl('mg-rent','家賃（引渡前）'),MR.rent);
  if(pairLoanMode){addE(_rl('mg-lRepH','ローン返済(主)'),MR.lRepH);addE(_rl('mg-lRepW','ローン返済(奥様)'),MR.lRepW);}
  else{addE(_rl('mg-lRep','住宅ローン返済'),MR.lRep);}
  if(isM)addE(_rl('mg-rep','修繕積立金'),MR.rep);
  addE(_rl('mg-ptx','固定資産税'),MR.ptx);
  addESkip(_rl('mg-furn','家具家電買替'),MR.furn);
  addESkip(_rl('mg-senyu',isM?'専有部分修繕費':'修繕費'),MR.senyu);
  children.forEach((c,ci)=>{
    if(MR.edu&&MR.edu[ci]){
      const arr=MR.edu[ci];
      const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return;
      const ages=arr.map((_,i)=>c.age+i);
      push(['',_rl('mg-edu'+ci,`${cLbls[ci]}教育費`),...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],{type:'edu',ages});
    }
  });
  addE(_rl('mg-carTotal','車両費（購入・車検）'),MR.carTotal);
  addE(_rl('mg-prk','駐車場代'),MR.prk);
  addESkip(_rl('mg-secInvest','積立投資額'),MR.secInvest);
  addESkip(_rl('mg-secBuy','一括投資額'),MR.secBuy);
  addESkip(_rl('mg-insMonthly','保険料（積立）'),MR.insMonthly);
  addESkip(_rl('mg-insLumpExp','一時払い保険'),MR.insLumpExp);
  addESkip(_rl('mg-wedding','結婚のお祝い'),MR.wedding);
  addESkip(_rl('mg-dcMatchExpH','DC拠出(主)'),MR.dcMatchExpH);
  addESkip(_rl('mg-dcMatchExpW','DC拠出(奥様)'),MR.dcMatchExpW);
  addESkip(_rl('mg-idecoExpH','iDeCo拠出(主)'),MR.idecoExpH);
  addESkip(_rl('mg-idecoExpW','iDeCo拠出(奥様)'),MR.idecoExpW);
  addESkip(_rl('mg-ext','特別支出'),MR.ext);
  cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{const vals=Array.from({length:disp},(_,i)=>mgOverrides[r.id]?.[i]||0);addE(r.label,vals);});
  push(['支出合計','',...MR.expT.slice(0,disp).map(v=>ri(v)),ri(MR.expT.slice(0,disp).reduce((a,b)=>a+b,0))],'expTotal');

  // ── 収支・残高 ──
  push(['年間収支','',...MR.bal.slice(0,disp).map(v=>ri(v)),ri(MR.bal.slice(0,disp).reduce((a,b)=>a+b,0))],'balance');
  push(['預貯金残高','',...MR.sav.slice(0,disp).map(v=>ri(v)),ri(MR.sav[disp-1])],'savings');
  // その他金融資産
  const _hasFAMG=MR.finAsset&&MR.finAsset.some(v=>v>0);
  if(_hasFAMG){
    if(N.finAssetRows&&N.finAssetRows.length>0){
      const _deadPExp=targetIsH?'h':'w';
      N.finAssetRows.forEach(row=>{
        if(row.person===_deadPExp)return;
        if(!row.vals.slice(0,disp).some(v=>v>0))return;
        push(['',row.lbl,...row.vals.slice(0,disp).map(v=>ri(v||0)),ri(row.vals[disp-1]||0)],'inc');
      });
    }
    push(['その他金融資産','',...MR.finAsset.slice(0,disp).map(v=>ri(v)),ri(MR.finAsset[disp-1])],'inc');
  }
  // 総金融資産
  if(MR.totalAsset)push(['総金融資産','',...MR.totalAsset.slice(0,disp).map(v=>ri(v)),ri(MR.totalAsset[disp-1])],'savings');
  // ローン残高
  if(MR.lBal&&MR.lBal.some(v=>v>0))push(['ローン残高','',...MR.lBal.slice(0,disp).map(v=>ri(v)),ri(MR.lBal[disp-1]||0)],'balance');

  // ── 注意文章・使用者情報（通常CFと同じ形式） ──
  const pi=getPrintInfo();
  const noteLines=pi.notes.filter(n=>n.trim()).map(n=>`・${n}`);
  const piLines=[];
  if(pi.name)piLines.push(pi.name);
  if(pi.company)piLines.push(pi.company);
  if(pi.address)piLines.push(pi.address);
  const piContact=[pi.tel,pi.email].filter(v=>v).join('　');
  if(piContact)piLines.push(piContact);

  // 免責事項
  push(Array(disp+3).fill(''),'blank');
  const disclaimerRow=Array(disp+3).fill('');
  disclaimerRow[0]='※本シミュレーションの住宅ローン控除額・税額は概算であり、実際の金額とは異なる場合があります。税務に関する詳細は税理士にご相談ください。';
  push(disclaimerRow,'footer');
  // 空行 + 注意文（左）と使用者情報（右隣）を横並びで配置
  push(Array(disp+3).fill(''),'blank');
  const footerStartRow=rows.length;
  const footerRowCount=Math.max(noteLines.length,piLines.length,1);
  const piEndCol=4;
  const splitCol=5;
  const noteEndCol=13;
  for(let i=0;i<footerRowCount;i++){
    const row=Array(disp+3).fill('');
    if(i<piLines.length)row[0]=piLines[i];
    if(i<noteLines.length)row[splitCol]=noteLines[i];
    push(row,'footer');
  }

  const ws=XLSX.utils.aoa_to_sheet(rows);

  // ── セル結合（通常CFと同じ + 万が一ラベル結合） ──
  if(!ws['!merges'])ws['!merges']=[];
  // title行(row0)のA+B結合、C+D結合（物件タイプ）
  ws['!merges'].push({s:{r:0,c:0},e:{r:0,c:1}});
  ws['!merges'].push({s:{r:0,c:2},e:{r:0,c:3}});
  // title行E列の万が一ラベル結合（4セル分、中央揃え）
  ws['!merges'].push({s:{r:0,c:4},e:{r:0,c:7}});
  // info行(row1,row2)のA+B結合＋各項目をinfoSpan列統合
  const infoRowIndices=[];
  types.forEach((t,i)=>{if(t==='info')infoRowIndices.push(i);});
  infoRowIndices.forEach(ri=>{
    ws['!merges'].push({s:{r:ri,c:0},e:{r:ri,c:1}});
    for(let k=0;k<6;k++){
      const sc=2+k*infoSpan;
      const ec=Math.min(sc+infoSpan-1,disp+2);
      if(sc<=disp+2)ws['!merges'].push({s:{r:ri,c:sc},e:{r:ri,c:ec}});
    }
  });
  // 免責事項行の結合（全列にわたって結合）
  const disclaimerRowIdx=types.indexOf('footer');
  if(disclaimerRowIdx>=0)ws['!merges'].push({s:{r:disclaimerRowIdx,c:0},e:{r:disclaimerRowIdx,c:disp+2}});
  // 使用者情報（左）、注意文（右隣）
  for(let i=0;i<footerRowCount;i++){
    const r=footerStartRow+i;
    ws['!merges'].push({s:{r,c:0},e:{r,c:piEndCol}});
    ws['!merges'].push({s:{r,c:splitCol},e:{r,c:noteEndCol}});
  }

  // ── 列幅 ──
  ws['!cols']=[{wch:10},{wch:18},...Array(disp).fill({wch:7}),{wch:8}];

  // ── 行高さ（イベント/年齢/経過年は低め、データ行は高め）──
  ws['!rows']=types.map(t=>{
    if(t==='event'||t==='age'||t==='elapsed')return{hpt:14};
    if(t==='blank')return{hpt:6};
    if(t==='footer')return{hpt:13};
    return{hpt:18};
  });

  // 行固定＋左2列固定
  const headerRowIdx=types.indexOf('header');
  ws['!freeze']={xSplit:2,ySplit:headerRowIdx+1,topLeftCell:XLSX.utils.encode_cell({r:headerRowIdx+1,c:2}),state:'frozen'};

  // ── 印刷設定：A4横・全行1ページに収める ──
  // A4横の印刷可能高さ≒6.77inch、デフォルト行高15pt=0.208inch → 100%で約32行
  // 行数に応じてscaleを自動計算（ライブラリはfitToPageを非対応のためscaleで代替）
  // footer/blank行を除いたデータ行数でスケール計算（用紙いっぱいに印刷）
  const _dataRows=types.filter(t=>t&&t!=='footer'&&t!=='blank').length;
  const _printScale=Math.min(100,Math.max(45,Math.floor(4800/_dataRows)));
  ws['!pageSetup']={paperSize:9,orientation:'landscape',scale:_printScale};
  ws['!margins']={left:0.2,right:0.2,top:0.15,bottom:0.15,header:0.1,footer:0.1};
  wb.Workbook=wb.Workbook||{};
  wb.Workbook.Names=wb.Workbook.Names||[];
  wb.Workbook.Names.push({
    Name:'_xlnm.Print_Titles',
    Ref:`'万が一CF表'!$1:$${headerRowIdx+1}`,
    Sheet:0
  });

  // ── スタイル定義（通常CFと同じ + col0対応） ──
  const styleDefs={
    title:     {fill:C.navy, font:{sz:12,bold:true,color:C.white}},
    info:      {fill:'FFeef5ff', font:{sz:12,color:'FF2d5282'}, col0:{fill:'FF2d5282',font:{sz:12,bold:true,color:C.white}}},
    blank:     {fill:null, font:{sz:10,color:C.white}, noBorder:true},
    footer:    {fill:C.white, font:{sz:8,color:C.black}, noBorder:true},
    header:    {fill:C.navy, font:{sz:10,bold:true,color:C.white}, align:'center'},
    elapsed:   {fill:C.navyD, font:{sz:8,color:'FFa0b4c8'}, align:'center'},
    age:       {fill:C.ageBg, font:{sz:8,color:C.ageFg}, align:'center', col0:{fill:C.ageBgL,font:{sz:8,bold:true,color:C.ageFgD}}},
    event:     {fill:C.evBg, font:{sz:8,color:C.evFg}, align:'center', col0:{fill:C.evHdr,font:{sz:8,bold:true,color:C.evHdrFg}}},
    incCat:    {fill:C.incCat, font:{sz:10,bold:true,color:C.white}},
    inc:       {fill:C.incBg, font:{sz:10,color:C.black}, col0:{fill:'FFe8f2fc',font:{sz:10,bold:true,color:C.incFg}}},
    incTotal:  {fill:C.blue, font:{sz:10,bold:true,color:C.white}},
    expCat:    {fill:C.expCat, font:{sz:10,bold:true,color:C.white}},
    exp:       {fill:C.expBg, font:{sz:10,color:C.black}, col0:{fill:'FFfdecea',font:{sz:10,bold:true,color:C.expFg}}},
    expTotal:  {fill:C.redL, font:{sz:10,bold:true,color:C.white}},
    balance:   {fill:C.white, font:{sz:10,bold:true,color:C.black}},
    savings:   {fill:C.green, font:{sz:10,bold:true,color:C.white}},
  };

  // 子どもイベント行マップ（入園年齢を含む）
  const childEvMapMG={};
  childEvRows2.forEach(cr=>{childEvMapMG[cr.rowIdx]={ages:cr.ages,hStartAge:cr.hStartAge};});
  // 教育費行マップ
  const eduRowMapMG={};
  types.forEach((tp,r)=>{
    if(tp&&typeof tp==='object'&&tp.type==='edu'){eduRowMapMG[r]=tp.ages;}
  });

  const lastCol=disp+2; // 合計列index
  rows.forEach((row,r)=>{
    const rawTp=types[r];
    const tp=(rawTp&&typeof rawTp==='object')?rawTp.type:rawTp;
    const def=styleDefs[tp]||styleDefs['exp']||{};
    row.forEach((_,c)=>{
      const addr=XLSX.utils.encode_cell({r,c});
      if(!ws[addr])ws[addr]={t:'s',v:''};
      const cell=ws[addr];
      const isFixed=c<=1;
      const isLastCol=c===lastCol;
      // フォント（col0対応）
      const fDef=(isFixed&&def.col0)?def.col0.font:def.font;
      const fObj={name:'Yu Gothic',sz:fDef?.sz||10};
      if(fDef?.bold)fObj.bold=true;
      if(fDef?.color)fObj.color={rgb:fDef.color};
      // info行：ラベルセルは太字、値セル（万円等）は強調
      if(tp==='info'&&c===0){fObj.bold=true;fObj.sz=9;fObj.color={rgb:C.white};}
      if(tp==='info'&&c>=2){
        const infoIdx=infoRowIndices.indexOf(r);
        const dataLen=infoIdx>=0&&infoIdx<infoDataLens.length?infoDataLens[infoIdx]:999;
        if(c>=dataLen){
          cell._noFill=true;
        }else{
          const v=String(cell.v||'');
          if(v.includes('万円')||v.includes('%')||v.includes('年')){
            fObj.bold=true;fObj.sz=12;fObj.color={rgb:C.navy};
          }else if(v&&v!=='▶'){
            fObj.bold=true;fObj.color={rgb:'FF5a6a7e'};
          }
          if(v.includes('購入後残高')){
            if(v.includes('万円')){
              fObj.bold=true;fObj.sz=12;
              fObj.color={rgb:cashAfter>=0?'FF0d8a20':C.red};
            }else{
              fObj.bold=true;fObj.color={rgb:'FF2d5282'};
            }
          }
        }
      }
      // title行：データ範囲外は塗りつぶしなし（E列の万が一ラベルは除く）
      if(tp==='title'&&c>=3){
        if(c!==4||!String(cell.v||'').includes('万が一')){
          cell._noFill=true;
        }
      }
      // title行の物件タイプ（C列）
      if(tp==='title'&&c===2){fObj.sz=10;}
      // title行：データ範囲外は罫線なし（万が一ラベル範囲を除く）
      if(tp==='title'&&c>=4){
        if(!String(cell.v||'').includes('万が一')){
          cell._noBorder=true;cell._noFill=true;
        }
      }
      // info行：データ範囲外は罫線なし
      if(tp==='info'&&cell._noFill){cell._noBorder=true;}
      // 年間収支の赤/緑
      if(tp==='balance'&&c>=2&&typeof cell.v==='number'){
        fObj.color={rgb:cell.v<0?C.red:'FF0d8a20'};
      }
      // 預貯金残高の赤字（赤文字）
      if(tp==='savings'&&c>=2&&typeof cell.v==='number'&&cell.v<0){
        fObj.color={rgb:C.red};
      }
      // 0値はグレー
      if((tp==='inc'||tp==='exp'||tp==='edu')&&c>=2&&typeof cell.v==='number'&&cell.v===0){
        fObj.color={rgb:C.zero};
      }
      // 背景色（col0対応）
      const bgColor=(isFixed&&def.col0)?def.col0.fill:def.fill;
      const fillObj=bgColor?{patternType:'solid',fgColor:{rgb:bgColor}}:undefined;
      // 合計列の特別背景
      let lastFill=fillObj;
      if(isLastCol){
        if(tp==='header')lastFill={patternType:'solid',fgColor:{rgb:'FF1a2e4a'}};
        else if(tp==='incTotal'||tp==='inc')lastFill={patternType:'solid',fgColor:{rgb:C.blue}};
        else if(tp==='expTotal'||tp==='exp'||tp==='edu')lastFill={patternType:'solid',fgColor:{rgb:C.redL}};
        else if(tp==='savings')lastFill={patternType:'solid',fgColor:{rgb:C.green}};
        if(tp==='inc'||tp==='exp'||tp==='edu'||tp==='incTotal'||tp==='expTotal'||tp==='savings'){
          fObj.color={rgb:C.white};fObj.bold=true;
        }
      }
      // ボーダー（blank/footer行はボーダーなし）
      const noBorder=def.noBorder||cell._noBorder||false;
      const border=noBorder?{}:{...baseBorder};
      if(!noBorder&&isFixed&&c===1){border.right=bdrH;}

      // 水平揃え
      let hAlign=(tp==='event'||tp==='age'||tp==='elapsed'||tp==='header')
        ? 'center'
        : (c>=2?'right':'left');
      if(tp==='footer'){hAlign='left';}
      if(tp==='title'&&c===2){hAlign='center';}
      if(tp==='info'&&c>=2){hAlign='left';}
      let cellFill=isLastCol&&lastFill?lastFill:fillObj;

      // 子どもイベント行：教育段階ごとの色分け（入園年齢を考慮）
      if(childEvMapMG[r]&&c>=2&&c<lastCol){
        const {ages,hStartAge=1}=childEvMapMG[r];
        const colIdx=c-2;
        if(ages&&ages[colIdx]!==undefined){
          const age=ages[colIdx];
          let stage=null;
          if(age>=hStartAge&&age<=6)stage='hoiku';
          else if(age>=7)stage=getEduStage(age);
          if(stage&&eduColors[stage]){
            cellFill={patternType:'solid',fgColor:{rgb:eduColors[stage].bg}};
            fObj.color={rgb:eduColors[stage].fg};
            fObj.bold=true;
          }
        }
      }
      // 教育費行：費用>0のセルのみ年齢に応じた色分け（入園前の0円セルは色なし）
      if(eduRowMapMG[r]&&c>=2&&c<lastCol&&typeof cell.v==='number'&&cell.v>0){
        const ages=eduRowMapMG[r];
        const colIdx=c-2;
        if(ages&&ages[colIdx]!==undefined){
          const stage=getEduStage(ages[colIdx]);
          if(stage&&eduColors[stage]){
            cellFill={patternType:'solid',fgColor:{rgb:eduColors[stage].bg}};
            fObj.color={rgb:eduColors[stage].fg};
          }
        }
      }

      // ★ 万が一特有：タイトル行E列の万が一ラベル（赤背景・白文字太字）
      if(tp==='title'&&c===4&&String(cell.v||'').includes('万が一')){
        cellFill={patternType:'solid',fgColor:{rgb:'FFdc2626'}};
        fObj.color={rgb:'FFFFFFFF'};fObj.bold=true;fObj.sz=12;
        cell._centerAlign=true;
      }

      // ★ 万が一特有：通常CF表との差分色分け（文字色を赤に変更）
      if((tp==='inc'||tp==='exp'||tp==='balance'||tp==='savings')&&c>=2&&c<lastCol&&typeof cell.v==='number'){
        const colIdx=c-2;
        let normalVal=null;
        const label=row[1]||row[0]||'';
        if(label==='ご主人手取年収'&&N.hInc)normalVal=N.hInc[colIdx];
        else if(label==='奥様手取年収'&&N.wInc)normalVal=N.wInc[colIdx];
        else if(label==='住宅ローン返済'&&N.lRep)normalVal=N.lRep[colIdx];
        else if(label==='生活費'&&N.lc)normalVal=N.lc[colIdx];
        else if(label==='遺族年金'&&N.survPension)normalVal=N.survPension[colIdx];
        else if(label==='駐車場代'&&N.prk)normalVal=N.prk[colIdx];
        else if(label==='車両費（購入・車検）'&&N.carTotal)normalVal=N.carTotal[colIdx];
        else if(tp==='balance'&&N.bal)normalVal=N.bal[colIdx];
        else if(tp==='savings'&&N.sav)normalVal=N.sav[colIdx];
        if(normalVal!==null&&Math.round(normalVal)!==Math.round(cell.v)){
          fObj.color={rgb:C.red};fObj.bold=true;
        }
      }

      // blank/footer行・範囲外セルは塗りつぶしなし
      const finalFill=(noBorder||cell._noFill)?undefined:cellFill;
      const finalAlign=cell._centerAlign?'center':hAlign;
      const shrinkToFit=(tp==='info'&&c>=2&&!cell._noFill);
      cell.s={
        font:fObj,
        fill:finalFill,
        alignment:{vertical:'center',horizontal:finalAlign,wrapText:false,shrinkToFit},
        border:border,
      };
      // 数値フォーマット（年齢・経過年は通常数字）
      if(typeof cell.v==='number'&&c>=2){
        if(tp==='age'||tp==='elapsed'){
          cell.z='0';
        }else{
          cell.z='#,##0;▲#,##0;"-"';
        }
      }
    });
  });

  XLSX.utils.book_append_sheet(wb,ws,'万が一CF表');
  const cnSama=clientName.endsWith('様')?clientName:clientName+'様';
  const fname=`万が一_${cnSama}_${targetLabel}_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.xlsx`;
  await _writeXlsxWithPageSetup(wb,fname,'万が一CF表');
}

// ===== Excel出力 =====
function exportCurrentTab(){
  if(rTab==='cf')showExportModal('excel');
  else if(rTab==='lctab')exportLCTabExcel();
  else if(rTab==='loan')exportLoanExcel();
  else if(rTab==='mg-h'||rTab==='mg-w')showExportModal('mg');
  else if(rTab==='graph')showExportModal('excel');
  else showExportModal('excel');
}
async function exportExcel(){
  // 万が一タブが開いている場合は万が一用Excel出力
  if((rTab==='mg-h'||rTab==='mg-w')&&window.lastMR){
    exportExcelMG();return;
  }
  if(!window.lastR){alert('先にCF表を生成してください');return;}
  const R=window.lastR, disp=window.lastDisp, cYear=window.lastCYear;
  const infoSpan=3; // info行1項目あたりの列数（shrinkToFitで収める）
  const cLbls=['第一子','第二子','第三子','第四子'];
  const isM=ST.type==='mansion';
  const clientName=_v('client-name')||'';
  if(!clientName.trim()){
    if(!confirm('お客様氏名が未入力です。このまま出力しますか？')){
      document.getElementById('client-name')?.focus();
      return;
    }
  }

  const wb=XLSX.utils.book_new();
  // rows配列: [data, rowType] のペアで管理
  const rows=[], types=[];
  const push=(data,type)=>{rows.push(data);types.push(type);};

  // ── 前提条件情報 ──
  const housePrice=fv('house-price')||0;
  const downPay=fv('down-payment')||0;
  const houseCostV=fv('house-cost')||0;
  const movingCostV=fv('moving-cost')||0;
  const furnitureInitV=fv('furniture-init')||0;
  const cashH=fv('cash-h')||0, cashW=fv('cash-w')||0, cashJoint=fv('cash-joint')||0;
  const cashTotal=cashH+cashW+cashJoint;
  const costTypeV=document.getElementById('cost-type')?.value||'cash';
  const downFromOwn=downType==='gift'?0:downPay;
  const houseCostDeductE=costTypeV==='loan'?0:houseCostV;
  const initialOut=downFromOwn+houseCostDeductE+movingCostV+furnitureInitV;
  const cashAfter=cashTotal-initialOut;
  const loanAmtV=fv('loan-amt')||0;
  const loanYrsV=iv('loan-yrs')||35;
  const rateBaseV=fv('rate-base')||0.5;
  const rates=getRates();
  const rateDisp=rates.length>1?`${rateBaseV}%〜`:`${rateBaseV}%`;
  const deliveryYrV=iv('delivery-year')||0;
  const emptyFill=Array(disp-1).fill('');

  // お客様名（左上）- A+B結合、C+D結合で物件タイプ
  const titleRow=[`${clientName} 様`,'',isM?'マンション':'戸建て',''];
  while(titleRow.length<disp+3)titleRow.push('');
  push(titleRow,'title');

  // info行：ラベル:値を1セルに統合しinfoSpan列分統合（隠れ防止）
  const _pad=(n)=>Array(n-1).fill('');
  const infoRow1=['💰 頭金の内訳','',
    `現預金: ${cashTotal}万円`,..._pad(infoSpan),
    `${downType==='gift'?'頭金(贈与)':'頭金'}: ${downPay}万円`,..._pad(infoSpan),
    `${costTypeV==='loan'?'諸費用(込)':'諸費用'}: ${houseCostV}万円`,..._pad(infoSpan),
    `引越家具: ${(movingCostV+furnitureInitV)}万円`,..._pad(infoSpan),
    `購入後残高: ${cashAfter}万円`,..._pad(infoSpan),
  ];
  // infoRowの実データ長を記録（これ以降は塗りつぶしなし）
  const infoRow1Len=infoRow1.length;
  while(infoRow1.length<disp+3)infoRow1.push('');
  push(infoRow1,'info');

  // 住宅ローン条件
  const infoRow2=['🏦 住宅ローン条件','',
    `物件価格: ${housePrice}万円`,..._pad(infoSpan),
    `借入額: ${loanAmtV}万円`,..._pad(infoSpan),
    `金利: ${rateDisp}`,..._pad(infoSpan),
    `期間: ${loanYrsV}年`,..._pad(infoSpan),
  ];
  if(deliveryYrV>0){infoRow2.push(`引渡し: ${deliveryYrV}年`,..._pad(infoSpan));}
  const infoRow2Len=infoRow2.length;
  while(infoRow2.length<disp+3)infoRow2.push('');
  push(infoRow2,'info');

  // 空行（塗りつぶしなし）
  push(Array(disp+3).fill(''),'blank');

  // info行のデータ長を記録（スタイル適用時に使用）
  const infoDataLens=[infoRow1Len,infoRow2Len];

  // ── 行データ構築 ──
  // 年ヘッダー
  push(['カテゴリ','項目',...R.yr.slice(0,disp).map(String),'合計'],'header');
  // 経過年数
  push(['経過年','',... R.yr.slice(0,disp).map((_,i)=>i+1),'-'],'elapsed');
  // 年齢
  push(['年齢','ご主人様',...R.hA.slice(0,disp),''],'age');
  push(['','奥様',...R.wA.slice(0,disp),''],'age');
  // 子ども年齢
  const children=[];
  document.querySelectorAll('[id^="ca-"]').forEach(el=>{children.push({age:parseInt(el.value)||0});});
  children.forEach((c,ci)=>{
    if(R.cA&&R.cA[ci])push(['',cLbls[ci],...R.cA[ci].slice(0,disp),''],'age');
  });
  // イベント
  push(['イベント','ご主人様',...R.evH.slice(0,disp),''],'event');
  push(['','奥様',...R.evW.slice(0,disp),''],'event');
  // 子どもイベント行の行番号と年齢配列を記録（教育段階色分け用）
  const childEvRows=[];
  if(R.evC)R.evC.forEach((ev,ci)=>{
    const hStartAge=parseInt(document.getElementById(`hoiku-start-${ci+1}`)?.value)||1;
    childEvRows.push({rowIdx:rows.length, ages:R.cA?R.cA[ci]:null, hStartAge});
    push(['',cLbls[ci],...ev.slice(0,disp),''],'event');
  });

  // ── 収入 ──
  push(['収　入','',...Array(disp).fill(''),''],'incCat');
  const addI=(lbl,arr)=>{
    if(!arr)return;const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    if(tot===0)return;
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'inc');
  };
  addI(_rl('hInc','ご主人手取年収'),R.hInc);addI(_rl('wInc','奥様手取年収'),R.wInc);
  addI(_rl('otherInc','副業・その他収入'),R.otherInc);addI(_rl('insMat','保険満期金'),R.insMat);
  if(R.secRedeemRows)R.secRedeemRows.forEach(row=>{addI(row.lbl,row.vals);});
  addI(_rl('rPay','退職金（ご主人）'),R.rPay);addI(_rl('wRPay','退職金（奥様）'),R.wRPay);
  addI(_rl('pS','本人年金'),R.pS);addI(_rl('pW','配偶者年金'),R.pW);addI(_rl('survPension','遺族年金'),R.survPension);
  addI(_rl('scholarship','奨学金'),R.scholarship);addI(_rl('teate','児童手当'),R.teate);addI(_rl('lCtrl','住宅ローン控除'),R.lCtrl);
  addI(_rl('dcReceiptH','DC受取(主)'),R.dcReceiptH);addI(_rl('dcReceiptW','DC受取(奥様)'),R.dcReceiptW);
  addI(_rl('idecoReceiptH','iDeCo受取(主)'),R.idecoReceiptH);addI(_rl('idecoReceiptW','iDeCo受取(奥様)'),R.idecoReceiptW);
  cfCustomRows.filter(r=>r.type==='inc').forEach(r=>{const vals=Array.from({length:disp},(_,i)=>cfOverrides[r.id]?.[i]||0);addI(r.label,vals);});
  push(['収入合計','',...R.incT.slice(0,disp).map(v=>ri(v)),ri(R.incT.slice(0,disp).reduce((a,b)=>a+b,0))],'incTotal');

  // ── 支出 ──
  push(['支　出','',...Array(disp).fill(''),''],'expCat');
  const addE=(lbl,arr)=>{
    if(!arr)return;const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);
    if(tot===0)return;
    push(['',lbl,...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],'exp');
  };
  addE(_rl('lc','生活費'),R.lc);
  if(R.secInvestRows&&R.secInvestRows.length>0){R.secInvestRows.forEach(row=>{addE(row.lbl,row.vals);});}else{addE(_rl('secInvest','積立投資額'),R.secInvest);}
  addE(_rl('secBuy','一括投資額'),R.secBuy);
  addE(_rl('rent','家賃（引渡前）'),R.rent);
  if(pairLoanMode){addE(_rl('lRepH','ローン返済(主)'),R.lRepH);addE(_rl('lRepW','ローン返済(奥様)'),R.lRepW);}
  else{addE(_rl('lRep','住宅ローン返済'),R.lRep);}
  if(isM)addE(_rl('rep','修繕積立金'),R.rep);
  addE(_rl('ptx','固定資産税'),R.ptx);addE(_rl('furn','家具家電買替'),R.furn);
  addE(_rl('senyu',isM?'専有部分修繕費':'修繕費'),R.senyu);
  children.forEach((c,ci)=>{
    const arr=R.edu[ci];if(!arr)return;
    const tot=arr.slice(0,disp).reduce((a,b)=>a+b,0);if(tot===0)return;
    const ages=arr.slice(0,disp).map((_,i)=>c.age+i);
    push(['',_rl('edu'+ci,`${cLbls[ci]}教育費`),...arr.slice(0,disp).map(v=>ri(v)),ri(tot)],{type:'edu',ages});
  });
  addE(_rl('prk','駐車場代'),R.prk);
  if(R.carRows&&R.carRows.length>1){R.carRows.forEach(row=>{addE(row.lbl,row.vals);});}
  else{addE('車両費（購入・車検）',R.carTotal);}
  if(R.insMonthlyRows&&R.insMonthlyRows.length>0){R.insMonthlyRows.forEach(row=>{addE(row.lbl,row.vals);});}else{addE('保険料（積立）',R.insMonthly);}
  if(R.insLumpExpRows&&R.insLumpExpRows.length>0){R.insLumpExpRows.forEach(row=>{addE(row.lbl,row.vals);});}else{addE('一時払い保険',R.insLumpExp);}
  addE('結婚のお祝い',R.wedding);
  addE('DC拠出(主)',R.dcMatchExpH);addE('DC拠出(奥様)',R.dcMatchExpW);
  addE('iDeCo拠出(主)',R.idecoExpH);addE('iDeCo拠出(奥様)',R.idecoExpW);
  if(R.extRows&&R.extRows.length>0){R.extRows.forEach(row=>{addE(row.lbl,row.vals);});}else{addE('特別支出',R.ext);}
  cfCustomRows.filter(r=>r.type==='exp').forEach(r=>{const vals=Array.from({length:disp},(_,i)=>cfOverrides[r.id]?.[i]||0);addE(r.label,vals);});
  push(['支出合計','',...R.expT.slice(0,disp).map(v=>ri(v)),ri(R.expT.slice(0,disp).reduce((a,b)=>a+b,0))],'expTotal');

  // ── 収支・残高 ──
  push(['年間収支','',...R.bal.slice(0,disp).map(v=>ri(v)),ri(R.bal.slice(0,disp).reduce((a,b)=>a+b,0))],'balance');
  const _initSavForXls=ri(window._purchaseInitSav||0);
  push(['預貯金残高',_initSavForXls,...R.sav.slice(0,disp).map(v=>ri(v)),ri(R.sav[disp-1])],'savings');
  // 金融資産（finAssetVisibleがfalseの場合は出力しない）
  if(typeof finAssetVisible==='undefined'||finAssetVisible!==false){
    if(R.finAssetRows)R.finAssetRows.forEach(row=>{
      if(row.vals.slice(0,disp).some(v=>v>0))push(['',row.lbl,...row.vals.slice(0,disp).map(v=>ri(v)),ri(row.vals[disp-1]||0)],'fin');
    });
    if(R.finAsset.some(v=>v>0))push(['その他金融資産','',...R.finAsset.slice(0,disp).map(v=>ri(v)),ri(R.finAsset[disp-1])],'finTotal');
    push(['総金融資産','',...R.totalAsset.slice(0,disp).map(v=>ri(v)),ri(R.totalAsset[disp-1])],'totalAsset');
  }
  if(fv('loan-amt')>0)push(['ローン残高','',...R.lBal.slice(0,disp).map(v=>ri(v)),''],'loan');

  // ── 注意文章・使用者情報 ──
  const pi=getPrintInfo();
  const noteLines=pi.notes.filter(n=>n.trim()).map(n=>`・${n}`);
  const piLines=[];
  if(pi.name)piLines.push(pi.name);
  if(pi.company)piLines.push(pi.company);
  if(pi.address)piLines.push(pi.address);
  const piContact=[pi.tel,pi.email].filter(v=>v).join('　');
  if(piContact)piLines.push(piContact);

  // 免責事項
  push(Array(disp+3).fill(''),'blank');
  const disclaimerRow=Array(disp+3).fill('');
  disclaimerRow[0]='※本シミュレーションの住宅ローン控除額・税額は概算であり、実際の金額とは異なる場合があります。税務に関する詳細は税理士にご相談ください。';
  push(disclaimerRow,'footer');
  // 空行 + 注意文（左）と使用者情報（右隣）を横並びで配置
  push(Array(disp+3).fill(''),'blank');
  const footerStartRow=rows.length;
  const footerRowCount=Math.max(noteLines.length,piLines.length,1);
  // 使用者情報（左）：A〜E列（0〜4）、注意文（右隣）：F〜N列（5〜13）
  const piEndCol=4;     // 使用者情報はA〜E（5列分）
  const splitCol=5;     // 注意文はF列から
  const noteEndCol=13;  // 注意文はF〜N（9列分）
  for(let i=0;i<footerRowCount;i++){
    const row=Array(disp+3).fill('');
    if(i<piLines.length)row[0]=piLines[i];
    if(i<noteLines.length)row[splitCol]=noteLines[i];
    push(row,'footer');
  }

  const ws=XLSX.utils.aoa_to_sheet(rows);

  // セル結合
  if(!ws['!merges'])ws['!merges']=[];
  // title行(row0)のA+B結合、C+D結合（物件タイプ）
  ws['!merges'].push({s:{r:0,c:0},e:{r:0,c:1}});
  ws['!merges'].push({s:{r:0,c:2},e:{r:0,c:3}});
  // info行(row1,row2)のA+B結合＋各項目をinfoSpan列統合
  const infoRowIndices=[];
  types.forEach((t,i)=>{if(t==='info')infoRowIndices.push(i);});
  infoRowIndices.forEach(ri=>{
    ws['!merges'].push({s:{r:ri,c:0},e:{r:ri,c:1}});
    for(let k=0;k<6;k++){
      const sc=2+k*infoSpan;
      const ec=Math.min(sc+infoSpan-1,disp+2);
      if(sc<=disp+2)ws['!merges'].push({s:{r:ri,c:sc},e:{r:ri,c:ec}});
    }
  });
  // 免責事項行の結合（全列にわたって結合）
  const disclaimerRowIdx=types.indexOf('footer');
  if(disclaimerRowIdx>=0)ws['!merges'].push({s:{r:disclaimerRowIdx,c:0},e:{r:disclaimerRowIdx,c:disp+2}});
  // 使用者情報（左）、注意文（右隣）
  for(let i=0;i<footerRowCount;i++){
    const r=footerStartRow+i;
    ws['!merges'].push({s:{r,c:0},e:{r,c:piEndCol}});
    ws['!merges'].push({s:{r,c:splitCol},e:{r,c:noteEndCol}});
  }

  // 列幅
  ws['!cols']=[{wch:10},{wch:18},...Array(disp).fill({wch:7}),{wch:8}];

  // 行高さ（イベント/年齢/経過年は低め、データ行は高め）
  ws['!rows']=types.map(t=>{
    if(t==='event'||t==='age'||t==='elapsed')return{hpt:14};
    if(t==='blank')return{hpt:6};
    if(t==='footer')return{hpt:13};
    return{hpt:18};
  });

  // 行固定＋左2列固定
  const headerRowIdx=types.indexOf('header');
  ws['!freeze']={xSplit:2,ySplit:headerRowIdx+1,topLeftCell:XLSX.utils.encode_cell({r:headerRowIdx+1,c:2}),state:'frozen'};

  // ── 印刷設定：A4横・全行1ページに収める ──
  // footer/blank行を除いたデータ行数でスケール計算（用紙いっぱいに印刷）
  const _dataRows=types.filter(t=>t&&t!=='footer'&&t!=='blank').length;
  const _printScale=Math.min(100,Math.max(45,Math.floor(4800/_dataRows)));
  ws['!pageSetup']={paperSize:9,orientation:'landscape',scale:_printScale};
  ws['!margins']={left:0.2,right:0.2,top:0.15,bottom:0.15,header:0.1,footer:0.1};

  // 印刷タイトル行：前提条件＋ヘッダー行を各ページ上部に繰り返し
  wb.Workbook=wb.Workbook||{};
  wb.Workbook.Names=wb.Workbook.Names||[];
  wb.Workbook.Names.push({
    Name:'_xlnm.Print_Titles',
    Ref:`CF表!$1:$${headerRowIdx+1}`,
    Sheet:0
  });

  // ── スタイル適用 ──
  const styleDefs={
    title:     {fill:C.navy, font:{sz:12,bold:true,color:C.white}},
    info:      {fill:'FFeef5ff', font:{sz:12,color:'FF2d5282'}, col0:{fill:'FF2d5282',font:{sz:12,bold:true,color:C.white}}},
    blank:     {fill:null, font:{sz:10,color:C.white}, noBorder:true},
    footer:    {fill:C.white, font:{sz:8,color:C.black}, noBorder:true},
    header:    {fill:C.navy, font:{sz:10,bold:true,color:C.white}, align:'center'},
    elapsed:   {fill:C.navyD, font:{sz:8,color:'FFa0b4c8'}, align:'center'},
    age:       {fill:C.ageBg, font:{sz:8,color:C.ageFg}, align:'center', col0:{fill:C.ageBgL,font:{sz:8,bold:true,color:C.ageFgD}}},
    event:     {fill:C.evBg, font:{sz:8,color:C.evFg}, align:'center', col0:{fill:C.evHdr,font:{sz:8,bold:true,color:C.evHdrFg}}},
    incCat:    {fill:C.incCat, font:{sz:10,bold:true,color:C.white}},
    inc:       {fill:C.incBg, font:{sz:10,color:C.black}, col0:{fill:'FFe8f2fc',font:{sz:10,bold:true,color:C.incFg}}},
    incTotal:  {fill:C.blue, font:{sz:10,bold:true,color:C.white}},
    expCat:    {fill:C.expCat, font:{sz:10,bold:true,color:C.white}},
    exp:       {fill:C.expBg, font:{sz:10,color:C.black}, col0:{fill:'FFfdecea',font:{sz:10,bold:true,color:C.expFg}}},
    expTotal:  {fill:C.redL, font:{sz:10,bold:true,color:C.white}},
    balance:   {fill:C.white, font:{sz:10,bold:true,color:C.black}},
    savings:   {fill:C.green, font:{sz:10,bold:true,color:C.white}},
    fin:       {fill:C.finBg, font:{sz:10,bold:true,color:C.finFg}},
    finTotal:  {fill:'FFdbeeff', font:{sz:10,bold:true,color:C.finFg}},
    totalAsset:{fill:C.finHdrBg, font:{sz:10,bold:true,color:C.white}},
    loan:      {fill:C.loanBg, font:{sz:10,color:C.muted}},
  };

  // 子どもイベント行の行番号→{ages, hStartAge}マップ
  const childEvMap={};
  childEvRows.forEach(cr=>{childEvMap[cr.rowIdx]={ages:cr.ages,hStartAge:cr.hStartAge};});

  // 教育費行マップ（行番号→年齢配列）
  const eduRowMap={};
  types.forEach((tp,r)=>{
    if(tp&&typeof tp==='object'&&tp.type==='edu'){eduRowMap[r]=tp.ages;}
  });

  const lastCol=disp+2; // 合計列index
  rows.forEach((row,r)=>{
    const rawTp=types[r];
    const tp=(rawTp&&typeof rawTp==='object')?rawTp.type:rawTp;
    const def=styleDefs[tp]||styleDefs['exp']||{};
    row.forEach((_,c)=>{
      const addr=XLSX.utils.encode_cell({r,c});
      if(!ws[addr])ws[addr]={t:'s',v:''};
      const cell=ws[addr];
      const isFixed=c<=1;
      const isLastCol=c===lastCol;
      // フォント
      const fDef=(isFixed&&def.col0)?def.col0.font:def.font;
      const fObj={name:'Yu Gothic',sz:fDef?.sz||10};
      if(fDef?.bold)fObj.bold=true;
      if(fDef?.color)fObj.color={rgb:fDef.color};
      // info行：ラベルセルは太字、値セル（万円等）は強調
      if(tp==='info'&&c===0){fObj.bold=true;fObj.sz=9;fObj.color={rgb:C.white};}
      if(tp==='info'&&c>=2){
        // infoデータ範囲外は塗りつぶしなし
        const infoIdx=infoRowIndices.indexOf(r);
        const dataLen=infoIdx>=0&&infoIdx<infoDataLens.length?infoDataLens[infoIdx]:999;
        if(c>=dataLen){
          // 範囲外：塗りつぶしなし扱い
          cell._noFill=true;
        }else{
          const v=String(cell.v||'');
          if(v.includes('万円')||v.includes('%')||v.includes('年')){
            fObj.bold=true;fObj.sz=12;fObj.color={rgb:C.navy};
          }else if(v&&v!=='▶'){
            fObj.bold=true;fObj.color={rgb:'FF5a6a7e'};
          }
          // 購入後残高の色分け
          if(v.includes('購入後残高')){
            if(v.includes('万円')){
              fObj.bold=true;fObj.sz=12;
              fObj.color={rgb:cashAfter>=0?'FF0d8a20':C.red};
            }else{
              fObj.bold=true;fObj.color={rgb:'FF2d5282'};
            }
          }
        }
      }
      // title行：データ範囲外は塗りつぶしなし
      if(tp==='title'&&c>=3){cell._noFill=true;}
      // title行の物件タイプ（C列）中央揃え
      if(tp==='title'&&c===2){fObj.sz=10;}
      // title行：データ範囲外は罫線なし
      if(tp==='title'&&c>=4){cell._noBorder=true;cell._noFill=true;}
      // info行：データ範囲外は罫線なし
      if(tp==='info'&&cell._noFill){cell._noBorder=true;}
      // 年間収支の赤/緑
      if(tp==='balance'&&c>=2&&typeof cell.v==='number'){
        fObj.color={rgb:cell.v<0?C.red:'FF0d8a20'};
      }
      // 預貯金残高の赤字（赤文字）
      if(tp==='savings'&&c>=1&&typeof cell.v==='number'&&cell.v<0){
        fObj.color={rgb:C.red};
      }
      // 0値はグレー
      if((tp==='inc'||tp==='exp'||tp==='edu')&&c>=2&&typeof cell.v==='number'&&cell.v===0){
        fObj.color={rgb:C.zero};
      }
      // 背景色
      const bgColor=(isFixed&&def.col0)?def.col0.fill:def.fill;
      const fillObj=bgColor?{patternType:'solid',fgColor:{rgb:bgColor}}:undefined;
      // 合計列は特別な背景
      let lastFill=fillObj;
      if(isLastCol){
        if(tp==='header')lastFill={patternType:'solid',fgColor:{rgb:'FF1a2e4a'}};
        else if(tp==='incTotal'||tp==='inc')lastFill={patternType:'solid',fgColor:{rgb:C.blue}};
        else if(tp==='expTotal'||tp==='exp'||tp==='edu')lastFill={patternType:'solid',fgColor:{rgb:C.redL}};
        else if(tp==='savings')lastFill={patternType:'solid',fgColor:{rgb:C.green}};
        else if(tp==='totalAsset')lastFill={patternType:'solid',fgColor:{rgb:'FF0d2a4a'}};
        if(tp==='inc'||tp==='exp'||tp==='edu'||tp==='incTotal'||tp==='expTotal'||tp==='savings'||tp==='totalAsset'){
          fObj.color={rgb:C.white};fObj.bold=true;
        }
      }
      // ボーダー（blank/footer行はボーダーなし）
      const noBorder=def.noBorder||cell._noBorder||false;
      const border=noBorder?{}:{...baseBorder};
      if(!noBorder&&isFixed&&c===1){border.right=bdrH;}

      // 水平揃え
      let hAlign=(tp==='event'||tp==='age'||tp==='elapsed'||tp==='header')
        ? 'center'
        : (c>=2?'right':'left');
      // footer行：すべて左寄せ
      if(tp==='footer'){hAlign='left';}
      // title行C列（マンション/戸建て）：中央揃え
      if(tp==='title'&&c===2){hAlign='center';}
      if(tp==='info'&&c>=2){hAlign='left';}
      let cellFill=isLastCol&&lastFill?lastFill:fillObj;

      // 子どもイベント行：教育段階ごとの色分け（入園年齢を考慮）
      if(childEvMap[r]&&c>=2&&c<lastCol){
        const {ages,hStartAge=1}=childEvMap[r];
        const colIdx=c-2;
        if(ages&&ages[colIdx]!==undefined){
          const age=ages[colIdx];
          let stage=null;
          if(age>=hStartAge&&age<=6)stage='hoiku';
          else if(age>=7)stage=getEduStage(age);
          if(stage&&eduColors[stage]){
            cellFill={patternType:'solid',fgColor:{rgb:eduColors[stage].bg}};
            fObj.color={rgb:eduColors[stage].fg};
            fObj.bold=true;
          }
        }
      }
      // 教育費行：費用>0のセルのみ年齢に応じた色分け（入園前の0円セルは色なし）
      if(eduRowMap[r]&&c>=2&&c<lastCol&&typeof cell.v==='number'&&cell.v>0){
        const ages=eduRowMap[r];
        const colIdx=c-2;
        if(ages&&ages[colIdx]!==undefined){
          const stage=getEduStage(ages[colIdx]);
          if(stage&&eduColors[stage]){
            cellFill={patternType:'solid',fgColor:{rgb:eduColors[stage].bg}};
            fObj.color={rgb:eduColors[stage].fg};
          }
        }
      }

      // blank/footer行・範囲外セルは塗りつぶしなし
      const finalFill=(noBorder||cell._noFill)?undefined:cellFill;
      const shrinkToFit=(tp==='info'&&c>=2&&!cell._noFill);
      cell.s={
        font:fObj,
        fill:finalFill,
        alignment:{vertical:'center',horizontal:hAlign,wrapText:false,shrinkToFit},
        border:border,
      };
      // 数値フォーマット（年齢・経過年は通常数字）
      if(typeof cell.v==='number'&&c>=2){
        if(tp==='age'||tp==='elapsed'){
          cell.z='0';
        }else{
          cell.z='#,##0;▲#,##0;"-"';
        }
      }
    });
  });

  XLSX.utils.book_append_sheet(wb,ws,'CF表');
  const cnSama2=clientName.endsWith('様')?clientName:clientName+'様';
  await _writeXlsxWithPageSetup(wb,`CF表_${cnSama2}_${new Date().toLocaleDateString('ja-JP').replace(/\//g,'')}.xlsx`,'CF表');
}

// ===== 生活費タブExcel出力 =====
function exportLCTabExcel(){
  const wb=XLSX.utils.book_new();
  const isM=ST.type==='mansion';
  const clientName=_v('client-name')||'';
  const dispName=clientName&&!clientName.endsWith('様')?clientName+'様':clientName;

  function gv(id){const el=document.getElementById(id);if(!el)return 0;return parseFloat(String(el.value).replace(/,/g,''))||0;}
  function gn(id){const el=document.getElementById(id);return el?el.value:'';}
  function bk(id){return _lcBikou[id]||'';}

  const rows=[];
  // ヘッダー色
  const hdrFill={patternType:'solid',fgColor:{rgb:'FFFFF8C4'}};
  const hdrFont={bold:true,sz:12,color:{rgb:'FF000000'}};
  const subFill={patternType:'solid',fgColor:{rgb:'FFF0F0E8'}};
  const totalFill={patternType:'solid',fgColor:{rgb:'FFFFF8C4'}};
  const totalFont={bold:true,sz:12,color:{rgb:'FF0D6A0D'}};
  const border={top:{style:'thin',color:{rgb:'FFC5C5C5'}},bottom:{style:'thin',color:{rgb:'FFC5C5C5'}},left:{style:'thin',color:{rgb:'FFC5C5C5'}},right:{style:'thin',color:{rgb:'FFC5C5C5'}}};
  const baseFont={sz:11};

  function addHeader(label){
    rows.push([
      {v:label,s:{font:hdrFont,fill:hdrFill,border}},
      {v:'円',s:{font:hdrFont,fill:hdrFill,border,alignment:{horizontal:'center'}}},
      {v:'備考',s:{font:hdrFont,fill:hdrFill,border,alignment:{horizontal:'center'}}}
    ]);
  }
  function addItem(label,val,bikou){
    rows.push([
      {v:label,s:{font:baseFont,border}},
      {v:val||'',t:val?'n':'s',s:{font:baseFont,border,numFmt:'¥#,##0',alignment:{horizontal:'right'}}},
      {v:bikou,s:{font:{sz:10,color:{rgb:'FF555555'}},border}}
    ]);
  }
  function addSubtotal(val){
    rows.push([
      {v:'小計',s:{font:{bold:true,sz:11},fill:subFill,border}},
      {v:val,t:'n',s:{font:{bold:true,sz:11},fill:subFill,border,numFmt:'¥#,##0',alignment:{horizontal:'right'}}},
      {v:'',s:{fill:subFill,border}}
    ]);
  }
  function addTotal(label,val){
    rows.push([
      {v:label,s:{font:totalFont,fill:totalFill,border}},
      {v:val,t:'n',s:{font:totalFont,fill:totalFill,border,numFmt:'¥#,##0',alignment:{horizontal:'right'}}},
      {v:'',s:{fill:totalFill,border}}
    ]);
  }

  // === 毎月の固定費 ===
  addHeader('毎月の固定費');
  LC_MONTHLY_ITEMS.forEach(item=>{
    if(item.cond==='mansion'&&!isM)return;
    const label=item.other?'その他（'+(gn(item.nameId)||'')+' ）':item.label;
    addItem(label,gv(item.id),bk(item.id));
  });
  let mTotal=0;
  LC_MONTHLY_ITEMS.forEach(item=>{if(item.cond==='mansion'&&!isM)return;mTotal+=gv(item.id);});
  addSubtotal(mTotal);
  const mYearTotal=mTotal*12;
  addTotal('合計（年間）',mYearTotal);

  // 空行
  rows.push([{v:'',s:{}},{v:'',s:{}},{v:'',s:{}}]);

  // === 年間の変動費 ===
  addHeader('年間の変動費');
  LC_YEARLY_ITEMS.forEach(item=>{
    const label=item.other?'その他（'+(gn(item.nameId)||'')+' ）':item.label;
    addItem(label,gv(item.id),bk(item.id));
  });
  let yTotal=0;
  LC_YEARLY_ITEMS.forEach(item=>{yTotal+=gv(item.id);});
  addSubtotal(yTotal);
  addTotal('合計（固定費＋変動費）',mYearTotal+yTotal);

  // シート作成
  const ws=XLSX.utils.aoa_to_sheet(rows.map(r=>r.map(c=>c.v)));
  // スタイル適用
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<3;c++){
      const addr=XLSX.utils.encode_cell({r,c});
      if(ws[addr])ws[addr].s=rows[r][c].s;
      if(rows[r][c].t)ws[addr].t=rows[r][c].t;
    }
  }
  // 列幅
  ws['!cols']=[{wch:30},{wch:16},{wch:28}];

  XLSX.utils.book_append_sheet(wb,ws,'生活費');
  const fname=(dispName?dispName+'_':'')+'生活費一覧.xlsx';
  XLSX.writeFile(wb,fname);
}

// ===== PDF出力（印刷ダイアログ経由） =====
function exportPDF(){
  // 入力パネルを一時的に隠して印刷
  const pl=document.querySelector('.panel-l');
  const wasHidden=pl.classList.contains('hidden');
  if(!wasHidden){
    pl.classList.add('hidden');
  }
  // 少し待ってから印刷（レイアウト安定のため）
  setTimeout(()=>{
    window.print();
    // 印刷後に復元
    setTimeout(()=>{
      if(!wasHidden)pl.classList.remove('hidden');
    },500);
  },200);
}
