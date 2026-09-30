// print.js — CF表の印刷・PDF保存（A4横・1枚20年分・縦は1枚に収める）
//
// 方針: 画面に表示中のCF表(#right-body table.cf)をそのまま複製して印刷用ページを組み立てる。
//   → セル上書き・追加行・行名変更・解約金などの個別行は、画面に出ていれば自動で印刷にも入る
//     （Excel出力のような「書き出し側の対応漏れ」が構造的に起きない）。
//   → 組み立て後に「画面の全マス ⇔ 印刷の全マス」を照合し、1マスでも違えばプレビューに警告を出す。
// 構成: 表紙（前提条件） → CF表（20年ごと） → ご確認事項（Excel出力と同じ文面）

const PP_YEARS_PER_PAGE = 20;

// 印刷・PDFボタン（Excel出力の横）
function printCurrentTab(){
  const _isMgActive=(rTab==='mg-h'||rTab==='mg-w')||!!window._mgQA_activeTabId;
  showExportModal(_isMgActive?'print-mg':'print');
}

// 出力モーダルで「印刷プレビュー」を押した後に呼ばれる
async function openPrintPreview(kind){
  // CF表以外のタブ（グラフ・生活費・ローン等）から開いた場合は通常CF表に切り替える
  if(kind!=='mg' && rTab!=='cf' && typeof setRTab==='function') setRTab('cf');
  await _ppWaitCalcDone();
  const src=document.querySelector('#right-body .tbl-wrap > table.cf');
  if(!src){ alert('CF表が表示されていません。CF表を表示してから印刷してください。'); return; }
  try{
    _ppBuild(kind, src);
  }catch(e){
    console.error('[print]', e);
    document.getElementById('pp-preview')?.remove();
    alert('印刷プレビューの作成に失敗しました: '+e.message);
  }
}

// 入力直後の再計算（live のデバウンス）が終わるまで待つ（最大5秒）
function _ppWaitCalcDone(){
  return new Promise(resolve=>{
    const t0=Date.now();
    const tick=()=>{
      const ind=document.getElementById('update-indicator');
      const busy=ind && /計算中/.test(ind.textContent||'');
      if(!busy || Date.now()-t0>5000) return requestAnimationFrame(()=>resolve());
      setTimeout(tick,100);
    };
    tick();
  });
}

// 画面のマスを複製し、画面専用の部品（ボタン・説明アイコン・操作用の属性や装飾）を取り除く
function _ppCleanCell(cell, i, nCols){
  const c=cell.cloneNode(true);
  c.removeAttribute('onclick'); c.removeAttribute('ondblclick'); c.removeAttribute('contenteditable'); c.removeAttribute('title');
  c.classList.remove('cf-cell-range','cf-row-highlight');
  c.querySelectorAll('button,input,select,textarea,.explain-ic').forEach(e=>e.remove());
  if(i===2) c.innerHTML=c.innerHTML.replace('開始年を設定','');
  // 合計列は「数字<br>画面用の説明文字」の形があるので、改行以降を取り除いて数字だけにする
  if(i===nCols-1){ const br=c.querySelector('br'); if(br){ while(br.nextSibling) br.nextSibling.remove(); br.remove(); } }
  // カテゴリ列の改行（例：その他金融資産<br>合計）は1行につなげる
  if(i===0) c.querySelectorAll('br').forEach(e=>e.remove());
  return c;
}
function _ppEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _ppIsNum(t){ return /^[\d,▲\-−–\s]+$/.test((t||'').trim()); }
function _ppYear(cell){ return (cell.textContent||'').replace(/\D/g,'').slice(-4); }

function _ppBuild(kind, src){
  document.getElementById('pp-preview')?.remove();
  const isMg = kind==='mg';
  const name=(_v('client-name')||'').trim();
  const cn = name ? (name.endsWith('様')?name:name+' 様') : '';
  const pi = getPrintInfo();
  const dObj = (typeof _exportExtra!=='undefined'&&_exportExtra.date) ? new Date(_exportExtra.date) : new Date();
  const dStr = dObj.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const staff = [pi.company, pi.name].filter(Boolean).join('　');
  // 万が一CF表の見出し（例：【万が一】ご主人様が45歳で死亡した場合）
  let mgTitle='';
  if(isMg){
    const banner=document.querySelector('#right-body .r-summary > div');
    const m=(banner?.textContent||'').match(/【万が一】[^\n]*?場合/);
    mgTitle = m ? m[0].replace(/\s+/g,'') : '【万が一】';
  }
  const docTitle = isMg ? '万が一キャッシュフロー表' : 'キャッシュフロー表';

  // ── 元の表から行を取得 ──
  //   ・「＋行を追加」ボタン行は除外
  //   ・画面で非表示の行（「金融資産行を隠す」等）は画面どおり印刷しない
  const allRows=[...src.rows];
  const nCols=allRows[0].cells.length;               // 項目2列 + 年列 + 合計列
  const hiddenRows=allRows.filter(r=>r.cells.length===nCols && r.style.display==='none');
  const srcRows=allRows.filter(r=>r.cells.length===nCols && r.style.display!=='none' && !/行を追加/.test(r.textContent));
  const yearIdx=[]; for(let i=2;i<nCols-1;i++) yearIdx.push(i);
  const chunks=[]; for(let i=0;i<yearIdx.length;i+=PP_YEARS_PER_PAGE) chunks.push(yearIdx.slice(i,i+PP_YEARS_PER_PAGE));

  // ── 1マス分の複製（画面専用の部品・装飾を取り除く） ──
  const cloneCell=(r,i)=>{
    const c=_ppCleanCell(r.cells[i], i, nCols);
    c.dataset.pp = srcRows.indexOf(r)+':'+i;   // 抜け漏れチェック用の目印
    return c.outerHTML;
  };
  const buildTable=(cols,isLast)=>{
    const take = isLast ? [0,1,...cols,nCols-1] : [0,1,...cols];
    let t=`<table class="pp-tbl cf"><colgroup><col class="c1"><col class="c2">${cols.map(()=>'<col>').join('')}${isLast?'<col class="cT">':''}</colgroup>`;
    srcRows.forEach(r=>{
      const cls=(r.className||'').replace(/\bcf-row-highlight\b/g,'');
      t+=`<tr class="${cls}" style="${r.getAttribute('style')||''}">`+take.map(i=>cloneCell(r,i)).join('')
        // 途中ページの最終年が「合計列」の書式にならないよう、見えないダミー列を最後に置く
        +(isLast?'':'<td class="pp-dummy"></td>')+'</tr>';
    });
    return t+'</table>';
  };

  // ── 前提条件（画面のCF表上部の欄をそのまま複製） ──
  const preSrc=document.getElementById(isMg?'mg-summary-detail':'cf-summary-detail');
  let preHtml='';
  if(preSrc){
    const pre=preSrc.cloneNode(true);
    pre.removeAttribute('id'); pre.style.display='';
    const ta=pre.querySelector('textarea');
    if(ta){
      const box=ta.parentElement;
      const note=(window._cfSummaryNote||'').trim();
      if(note){
        const div=document.createElement('div'); div.className='pp-note'; div.innerHTML=_ppEsc(note).replace(/\n/g,'<br>');
        ta.replaceWith(div);
        const hd=box.firstElementChild; if(hd) hd.textContent='注釈・補足メモ';
      } else box.remove();
    }
    pre.querySelectorAll('button,input,select').forEach(e=>e.remove());
    preHtml=`<div class="pp-pre">${pre.innerHTML}</div>`;
  }

  // ── ご確認事項（Excel出力と同じ文面：export.js getDisclaimerContent） ──
  const dc=getDisclaimerContent(`${dObj.getFullYear()}年${dObj.getMonth()+1}月`);
  const contact=[pi.address,pi.tel,pi.email].filter(Boolean).join(' / ');
  const secHtml=s=>`<div class="dc-sec"><div class="dc-h">${_ppEsc(s.title)}</div><ul>${s.items.map(t=>`<li>${_ppEsc(t)}</li>`).join('')}</ul></div>`;
  const metaParts=[`お客様：${_ppEsc(cn||'—')}`, `作成日：${dStr}`];
  if(pi.company||pi.name) metaParts.push(`作成者：${_ppEsc(pi.company||'')}${pi.name?(pi.company?'（'+_ppEsc(pi.name)+'）':_ppEsc(pi.name)):''}`);
  const discHtml=`<div class="pp-dc">
    <div class="dc-title">${_ppEsc(dc.title)}</div>
    <div class="dc-meta">${metaParts.join('　／　')}</div>
    <div class="dc-lead">${_ppEsc(dc.lead)}</div>
    <div class="dc-alert">${_ppEsc(dc.alert)}</div>
    <div class="dc-cols"><div>${dc.sections.slice(0,3).map(secHtml).join('')}</div><div>${dc.sections.slice(3).map(secHtml).join('')}</div></div>
    ${(pi.company||contact)?`<div class="dc-foot">${_ppEsc(pi.company||'')}${contact?'　'+_ppEsc(contact):''}</div>`:''}
  </div>`;

  // ── プレビュー枠 ──
  const box=document.createElement('div'); box.id='pp-preview';
  box.innerHTML=`<div class="pp-bar">
      <div class="pp-bar-info"><b>印刷プレビュー</b>　<span id="pp-info"></span></div>
      <div class="pp-bar-btns">
        <button class="pp-btn-print" onclick="window.print()">印刷／PDF保存</button>
        <button class="pp-btn-close" onclick="closePrintPreview()">閉じる</button>
      </div>
      <div class="pp-bar-tip">印刷画面で「用紙：A4・横」を選び、「背景のグラフィック」をオン、「ヘッダーとフッター」をオフにすると、きれいに印刷できます。PDFにするときは送信先で「PDFに保存」を選んでください。</div>
    </div>`;
  document.body.appendChild(box);
  document.body.classList.add('pp-open');

  const head=sub=>`<div class="pp-head"><div class="pp-title">${_ppEsc(cn)} ${docTitle}<small>${sub}</small></div>
    <div class="pp-meta">作成日：${dStr}${staff?'<br>担当：'+_ppEsc(staff):''}</div></div>`;
  const addPage=(sub,bodyHtml)=>{
    const p=document.createElement('div'); p.className='pp-page';
    p.innerHTML=`${head(sub)}<div class="pp-body">${bodyHtml}</div><div class="pp-foot"><span>本資料は一定の前提に基づく試算であり、将来の結果を保証するものではありません。</span><span class="pp-pno"></span></div>`;
    box.appendChild(p); return p.querySelector('.pp-body');
  };

  // 表紙（前提条件）
  const y0=_ppYear(allRows[0].cells[2]), yN=_ppYear(allRows[0].cells[nCols-2]);
  addPage(isMg?_ppEsc(mgTitle):'前提条件', `<div class="pp-cover"><div class="pp-cover-hero${isMg?' mg':''}"><div class="t1">${docTitle}</div>
      <div class="t2">${_ppEsc(cn)}${cn?'　／　':''}${y0}年〜${yN}年（全${yearIdx.length}年間）</div>
      ${isMg?`<div class="t3">${_ppEsc(mgTitle)}</div>`:''}</div>
    ${preHtml?`<div class="pp-cover-lbl">前提条件</div>${preHtml}`:''}</div>`);

  // CF表（20年ごと・縦は1枚）
  const tableBodies=[];
  chunks.forEach((cols,ci)=>{
    const isLast=ci===chunks.length-1;
    const sub=`${_ppYear(allRows[0].cells[cols[0]])}年〜${_ppYear(allRows[0].cells[cols[cols.length-1]])}年${isMg?'　'+_ppEsc(mgTitle):''}`;
    const b=addPage(sub, buildTable(cols,isLast));   // 「次ページへ続く」案内は置かず、表に高さを回す
    tableBodies.push(b);
  });
  tableBodies.forEach(_ppFitPage);
  tableBodies.forEach(_ppFitTextCells);

  // ご確認事項（1枚に収まるよう文字サイズを調整）
  const dcBody=addPage('ご確認事項', discHtml);
  const dcEl=dcBody.querySelector('.pp-dc');
  let lo=7, hi=10.4;
  for(let k=0;k<8;k++){ const m=(lo+hi)/2; dcEl.style.fontSize=m+'px'; if(dcEl.offsetHeight<=dcBody.clientHeight) lo=m; else hi=m; }
  dcEl.style.fontSize=lo+'px';

  // ページ番号
  const pgs=[...box.querySelectorAll('.pp-page')];
  pgs.forEach((p,i)=>p.querySelector('.pp-pno').textContent=`${i+1} / ${pgs.length}`);

  // ── 抜け漏れチェック ──
  const problems=_ppVerify(box, srcRows, allRows[0], nCols);
  const notes=[];
  if(hiddenRows.length) notes.push(`画面で非表示にしている行（${hiddenRows.length}行：金融資産行など）は印刷していません。`);
  if(problems.length){
    const w=document.createElement('div'); w.className='pp-warn';
    w.innerHTML='⚠ 画面のCF表と印刷内容に違いがあります（'+problems.length+'件）。印刷前に内容をご確認ください。<br>'+problems.slice(0,5).map(_ppEsc).join('<br>');
    box.insertBefore(w, pgs[0]);
  }
  if(notes.length){
    const n=document.createElement('div'); n.className='pp-notice'; n.textContent=notes.join(' ');
    box.insertBefore(n, pgs[0]);
  }
  box.querySelector('#pp-info').textContent=`A4横・全${pgs.length}ページ（表紙1・CF表${tableBodies.length}・ご確認事項1）`+(problems.length?'':'　✓ 画面のCF表と全項目一致');
  box.scrollTop=0;
  window._ppLastResult={pages:pgs.length, problems, hiddenRows:hiddenRows.length,
    fontPx:tableBodies.map(b=>+(b._fs||0).toFixed(1)),
    overflow:tableBodies.reduce((n,b)=>n+[...b.querySelectorAll('.pp-tbl td,.pp-tbl th')].filter(c=>c.scrollWidth>c.clientWidth).length,0)};
  document.addEventListener('keydown',_ppKey);
  // 画面が狭い端末（iPad縦など）では、プレビューだけ画面幅に合わせて縮小表示（印刷には影響しない）
  _ppFitScreen();
  window.addEventListener('resize',_ppFitScreen);
}

function closePrintPreview(){
  document.getElementById('pp-preview')?.remove();
  document.body.classList.remove('pp-open');
  document.removeEventListener('keydown',_ppKey);
  window.removeEventListener('resize',_ppFitScreen);
}
function _ppFitScreen(){
  const box=document.getElementById('pp-preview'); if(!box) return;
  const pg=box.querySelector('.pp-page'); if(!pg) return;
  box.classList.remove('pp-ready');                      // 縮小前の本来の幅を測る
  const z=Math.min(1,(box.clientWidth-16)/pg.offsetWidth);
  box.style.setProperty('--pp-z', z.toFixed(3));
  box.classList.add('pp-ready');
}
function _ppKey(e){ if(e.key==='Escape') closePrintPreview(); }

// ── 表の文字サイズ：ページごとに、用紙に収まる範囲で最大（二分探索） ──
//   縦は必ず1枚。行が多いほど小さくなる（下限4px）。行間は文字サイズに比例して詰める。
function _ppSetFont(b,fs){
  const pd=Math.max(0.2, Math.min(1.1, 0.2+(fs-7)*0.3));    // 上下の余白(mm)：7px以下は最小、10px以上で最大
  b.querySelectorAll('.pp-tbl th,.pp-tbl td').forEach(c=>{
    c.style.setProperty('font-size',fs+'px','important');
    c.style.setProperty('padding',pd+'mm 0.5mm','important');   // 左右は詰めて5桁の金額が入る幅を確保
  });
}
function _ppRoom(b){ let h=b.clientHeight-8; [...b.children].forEach(e=>{ if(!e.matches('table')) h-=e.offsetHeight+6; }); return h; }
function _ppFits(b){
  const t=b.querySelector('table');
  if(t.offsetHeight>_ppRoom(b) || t.offsetWidth>b.clientWidth) return false;
  // 数字のマスは1文字も欠けないこと（マス内の部品も含めて）
  return [...t.rows].every(r=>[...r.cells].slice(2).every(c=>!_ppIsNum(c.textContent)||[c,...c.querySelectorAll('*')].every(e=>!e.clientWidth||e.scrollWidth<=e.clientWidth)));
}
function _ppFitPage(b){
  let lo=4, hi=12;
  _ppSetFont(b,hi);
  if(!_ppFits(b)){
    for(let k=0;k<9;k++){ const m=(lo+hi)/2; _ppSetFont(b,m); if(_ppFits(b)) lo=m; else hi=m; }
    hi=lo;
  }
  const fs=Math.floor(hi*10)/10; _ppSetFont(b,fs); b._fs=fs;
  // 余った高さは各行に均等に配分し、表を用紙の下端まで広げる
  const t=b.querySelector('table'); const room=_ppRoom(b);
  if(t.offsetHeight<room) t.style.height=room+'px';
}
// ── 文字のマス（項目名・イベント名など）は折り返さず、1行に収まるまでそのマスだけ縮小 ──
function _ppFitTextCells(b){
  b.querySelectorAll('.pp-tbl td,.pp-tbl th').forEach(c=>{
    if(_ppIsNum(c.textContent) || !c.textContent.trim() || c.classList.contains('pp-dummy')) return;
    if(c.scrollWidth<=c.clientWidth) return;
    c.style.setProperty('padding-left','0.2mm','important'); c.style.setProperty('padding-right','0.2mm','important');
    let f=parseFloat(c.style.fontSize)||b._fs||8;
    while(c.scrollWidth>c.clientWidth && f>3.5){
      f-=0.25; c.style.setProperty('font-size',f+'px','important');
      c.querySelectorAll('*').forEach(e=>e.style.setProperty('font-size','inherit','important'));
    }
  });
}

// ── 抜け漏れチェック：画面の表の全マス（項目名・各年・合計）が、印刷にちょうど1回・同じ中身で入っているか ──
function _ppVerify(box, srcRows, yearRow, nCols){
  const norm=s=>(s||'').replace(/\s+/g,'');
  const seen={};
  box.querySelectorAll('.pp-tbl [data-pp]').forEach(c=>{ (seen[c.dataset.pp]=seen[c.dataset.pp]||[]).push(norm(c.textContent)); });
  const problems=[];
  srcRows.forEach((r,ri)=>{
    const lbl=norm(r.cells[1].textContent)||norm(r.cells[0].textContent)||`${ri+1}行目`;
    for(let i=0;i<nCols;i++){
      if(ri===0 && i===2) continue;                     // 「開始年を設定」ボタン文字は意図的に除去
      const got=seen[ri+':'+i];
      const where = i<=1 ? '項目名' : (i===nCols-1 ? '合計' : _ppYear(yearRow.cells[i])+'年');
      if(!got){ problems.push(`「${lbl}」の${where}が印刷に入っていません`); continue; }
      if(i<=1) continue;                                // 項目名はページごとに繰り返すので回数は問わない
      if(got.length!==1){ problems.push(`「${lbl}」の${where}が${got.length}回入っています`); continue; }
      // 画面のマスから画面専用の部品だけを除いた中身と比べる（合計列は数字部分）
      const want=norm(_ppCleanCell(r.cells[i], i, nCols).textContent);
      if(got[0]!==want) problems.push(`「${lbl}」の${where}の値が画面と違います（画面:${want} 印刷:${got[0]}）`);
    }
  });
  return problems;
}
