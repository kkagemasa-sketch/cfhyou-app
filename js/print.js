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

// 万が一CF表を複数タブまとめて印刷（タブの並び順に 表紙→CF表 を続け、最後にご確認事項を1回）
async function openPrintPreviewMG(ids){
  const list = (typeof _mgPickIds==='function') ? _mgPickIds(ids) : [];
  if(list.length<=1 && list[0]===window._mgQA_activeTabId){ return openPrintPreview('mg'); }
  if(!list.length){ alert('印刷する万が一のタブを選んでください'); return; }
  const act = window._mgQA_activeTabId;
  const secs = [];
  try{
    for(const id of list){
      if(!mgQA_tabs.find(t=>t.id===id)) continue;
      mgQA_switchTab(id);   // 計算（即時）して、そのタブの画面のCF表を写し取る
      const tbl = document.querySelector('#right-body .tbl-wrap > table.cf');
      if(!tbl) continue;
      const banner = document.querySelector('#right-body .r-summary > div');
      const m = (banner?.textContent||'').match(/【万が一】[^\n]*?場合/);
      const pre = document.getElementById('mg-summary-detail');
      secs.push({src: tbl.cloneNode(true), mgTitle: m ? m[0].replace(/\s+/g,'') : '【万が一】', preEl: pre ? pre.cloneNode(true) : null,
        cover: (typeof getCoverData==='function') ? getCoverData('mg') : null});
    }
  }finally{ if(act) mgQA_switchTab(act); }
  if(!secs.length){ alert('万が一CF表が表示されていません'); return; }
  try{ _ppBuild('mg', secs[0].src, secs); }
  catch(e){ console.error('[print]', e); document.getElementById('pp-preview')?.remove(); alert('印刷プレビューの作成に失敗しました: '+e.message); }
}

// sections（省略可）: [{src, mgTitle, preEl}] … 万が一を複数タブまとめて印刷するとき
function _ppBuild(kind, src, sections){
  document.getElementById('pp-preview')?.remove();
  const isMg = kind==='mg';
  const name=(_v('client-name')||'').trim();
  const cn = name ? (name.endsWith('様')?name:name+' 様') : '';
  const pi = getPrintInfo();
  const dObj = (typeof _exportExtra!=='undefined'&&_exportExtra.date) ? new Date(_exportExtra.date) : new Date();
  const dStr = dObj.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const staff = [pi.company, pi.name].filter(Boolean).join('　');
  const docTitle = isMg ? '万が一キャッシュフロー表' : 'キャッシュフロー表';
  // 1つ目の表（画面に表示中のCF表）。万が一の見出し（例：【万が一】ご主人様が45歳で死亡した場合）
  if(!sections){
    let mgTitle='';
    if(isMg){
      const banner=document.querySelector('#right-body .r-summary > div');
      const m=(banner?.textContent||'').match(/【万が一】[^\n]*?場合/);
      mgTitle = m ? m[0].replace(/\s+/g,'') : '【万が一】';
    }
    sections=[{src, mgTitle, preEl: document.getElementById(isMg?'mg-summary-detail':'cf-summary-detail'),
      cover: (typeof getCoverData==='function') ? getCoverData(isMg?'mg':'cf') : null}];
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

  const head=sub=>`<div class="pp-head"><img class="pp-logo" src="img/housingfp-logo.png" alt="Housing FP"><div class="pp-title">${_ppEsc(cn)} ${docTitle}<small>${sub}</small></div>
    <div class="pp-meta">作成日：${dStr}${staff?'<br>担当：'+_ppEsc(staff):''}</div></div>`;
  const addPage=(sub,bodyHtml)=>{
    const p=document.createElement('div'); p.className='pp-page';
    p.innerHTML=`${head(sub)}<div class="pp-body">${bodyHtml}</div><div class="pp-foot"><span>本資料は一定の前提に基づく試算であり、将来の結果を保証するものではありません。</span><span class="pp-pno"></span></div>`;
    box.appendChild(p); return p.querySelector('.pp-body');
  };

  // 表紙（案A-1）：見出し帯なしの全面ページ（下の注意書きとページ番号は残す）
  const addCover=(html)=>{
    const p=document.createElement('div'); p.className='pp-page pp-page-cover';
    p.innerHTML=`<div class="pp-body">${html}</div><div class="pp-foot"><span>本資料は一定の前提に基づく試算であり、将来の結果を保証するものではありません。</span><span class="pp-pno"></span></div>`;
    box.appendChild(p); return p.querySelector('.pp-body');
  };
  const tableBodies=[], problems=[];
  let hiddenCount=0;
  sections.forEach((sec,si)=>{
    const mgTitle=sec.mgTitle||'';
    // ── 元の表から行を取得 ──
    //   ・「＋行を追加」ボタン行は除外
    //   ・画面で非表示の行（「金融資産行を隠す」等）は画面どおり印刷しない
    const allRows=[...sec.src.rows];
    const nCols=allRows[0].cells.length;               // 項目2列 + 年列 + 合計列
    const hiddenRows=allRows.filter(r=>r.cells.length===nCols && r.style.display==='none');
    hiddenCount+=hiddenRows.length;
    const srcRows=allRows.filter(r=>r.cells.length===nCols && r.style.display!=='none' && !/行を追加/.test(r.textContent));
    const yearIdx=[]; for(let i=2;i<nCols-1;i++) yearIdx.push(i);
    const chunks=[]; for(let i=0;i<yearIdx.length;i+=PP_YEARS_PER_PAGE) chunks.push(yearIdx.slice(i,i+PP_YEARS_PER_PAGE));
    // ── 1マス分の複製（画面専用の部品・装飾を取り除く） ──
    const cloneCell=(r,i)=>{
      const c=_ppCleanCell(r.cells[i], i, nCols);
      c.dataset.pp = si+':'+srcRows.indexOf(r)+':'+i;   // 抜け漏れチェック用の目印（表の番号:行:列）
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
    let preHtml='';
    if(sec.preEl){
      const pre=sec.preEl.cloneNode(true);
      pre.removeAttribute('id'); pre.style.display='';
      const ta=pre.querySelector('textarea');
      if(ta){
        const bx=ta.parentElement;
        const note=(window._cfSummaryNote||'').trim();
        if(note){
          const div=document.createElement('div'); div.className='pp-note'; div.innerHTML=_ppEsc(note).replace(/\n/g,'<br>');
          ta.replaceWith(div);
          const hd=bx.firstElementChild; if(hd) hd.textContent='注釈・補足メモ';
        } else bx.remove();
      }
      pre.querySelectorAll('button,input,select').forEach(e=>e.remove());
      preHtml=`<div class="pp-pre">${pre.innerHTML}</div>`;
    }
    // 表紙（前提条件）
    const y0=_ppYear(allRows[0].cells[2]), yN=_ppYear(allRows[0].cells[nCols-2]);
    if(sec.cover){
      const cb=addCover(_ppCoverHtml(sec.cover, {dStr, staff, docTitle}));
      _ppFitCover(cb);
    }else{
      addPage(isMg?_ppEsc(mgTitle):'前提条件', `<div class="pp-cover"><div class="pp-cover-hero${isMg?' mg':''}"><img class="pp-cover-logo" src="img/housingfp-logo.png" alt="Housing FP"><div class="t1">${docTitle}</div>
        <div class="t2">${_ppEsc(cn)}${cn?'　／　':''}${y0}年〜${yN}年（全${yearIdx.length}年間）</div>
        ${isMg?`<div class="t3">${_ppEsc(mgTitle)}</div>`:''}</div>
      ${preHtml?`<div class="pp-cover-lbl">前提条件</div>${preHtml}`:''}</div>`);
    }
    // 生活費の内訳（出力画面で「生活費の内訳を入れる」を選んだときだけ・最初の表の後に1回）
    if(si===0 && typeof _exportExtra!=='undefined' && _exportExtra.includeLC) addPage('生活費の内訳', _ppLCHtml());
    // CF表（20年ごと・縦は1枚）
    const bodies=[];
    chunks.forEach((cols,ci)=>{
      const isLast=ci===chunks.length-1;
      const sub=`${_ppYear(allRows[0].cells[cols[0]])}年〜${_ppYear(allRows[0].cells[cols[cols.length-1]])}年${isMg?'　'+_ppEsc(mgTitle):''}`;
      bodies.push(addPage(sub, buildTable(cols,isLast)));   // 「次ページへ続く」案内は置かず、表に高さを回す
    });
    bodies.forEach(_ppFitPage);
    bodies.forEach(_ppFitTextCells);
    tableBodies.push(...bodies);
    // ── 抜け漏れチェック（この表の分）──
    const pr=_ppVerify(box, srcRows, allRows[0], nCols, si+':');
    problems.push(...(sections.length>1?pr.map(t=>`［${mgTitle}］${t}`):pr));
  });

  // ご確認事項（1枚に収まるよう文字サイズを調整）
  const dcBody=addPage('ご確認事項', discHtml);
  const dcEl=dcBody.querySelector('.pp-dc');
  let lo=7, hi=10.4;
  for(let k=0;k<8;k++){ const m=(lo+hi)/2; dcEl.style.fontSize=m+'px'; if(dcEl.offsetHeight<=dcBody.clientHeight) lo=m; else hi=m; }
  dcEl.style.fontSize=lo+'px';

  // ページ番号
  const pgs=[...box.querySelectorAll('.pp-page')];
  pgs.forEach((p,i)=>p.querySelector('.pp-pno').textContent=`${i+1} / ${pgs.length}`);

  const notes=[];
  if(hiddenCount) notes.push(`画面で非表示にしている行（${hiddenCount}行：金融資産行など）は印刷していません。`);
  if(problems.length){
    const w=document.createElement('div'); w.className='pp-warn';
    w.innerHTML='⚠ 画面のCF表と印刷内容に違いがあります（'+problems.length+'件）。印刷前に内容をご確認ください。<br>'+problems.slice(0,5).map(_ppEsc).join('<br>');
    box.insertBefore(w, pgs[0]);
  }
  if(notes.length){
    const n=document.createElement('div'); n.className='pp-notice'; n.textContent=notes.join(' ');
    box.insertBefore(n, pgs[0]);
  }
  const lcPage=(typeof _exportExtra!=='undefined' && _exportExtra.includeLC)?'・生活費の内訳1':'';
  const coverTxt = sections.length>1 ? `表紙${sections.length}（${sections.length}パターン）` : '表紙1';
  box.querySelector('#pp-info').textContent=`A4横・全${pgs.length}ページ（${coverTxt}${lcPage}・CF表${tableBodies.length}・ご確認事項1）`+(problems.length?'':'　✓ 画面のCF表と全項目一致');
  box.scrollTop=0;
  window._ppLastResult={pages:pgs.length, problems, hiddenRows:hiddenCount, sections:sections.length,
    fontPx:tableBodies.map(b=>+(b._fs||0).toFixed(1)),
    overflow:tableBodies.reduce((n,b)=>n+[...b.querySelectorAll('.pp-tbl td,.pp-tbl th')].filter(c=>c.scrollWidth>c.clientWidth).length,0)};
  document.addEventListener('keydown',_ppKey);
  // 画面が狭い端末（iPad縦など）では、プレビューだけ画面幅に合わせて縮小表示（印刷には影響しない）
  _ppFitScreen();
  window.addEventListener('resize',_ppFitScreen);
}

// ── 表紙（案A-1：左に紺の帯・右に必要保障額と前提条件）。値は cover.js の getCoverData ──
function _ppCoverHtml(d, o){
  const E=_ppEsc, f=n=>Math.round(n||0).toLocaleString();
  const isMg=!!d.mg;
  const cn=d.client?(d.client.endsWith('様')?d.client:d.client+' 様'):'';
  const tags=[d.isM?'マンション':'戸建て', d.loan.form==='cash'?'現金一括購入':(d.loan.label||'')].filter(Boolean);
  const fam=d.family.map(x=>`${E(x.lbl)}${x.age}歳`).join('・');
  const side=`<div class="ppc-side">
      <img class="ppc-logo" src="img/housingfp-logo.png" alt="Housing FP">
      <div class="ppc-k">CASH FLOW REPORT</div>
      <div class="ppc-h1">${isMg?'万が一<br>キャッシュフロー表':'キャッシュフロー表'}</div>
      <div class="ppc-who">${E(cn||'—')}</div>
      <div class="ppc-tags">${tags.map(t=>`<span>${E(t)}</span>`).join('')}</div>
      <div class="ppc-per">${d.period.y0}年〜${d.period.yN}年（全${d.period.n}年間）<br>${fam}</div>
      ${isMg?`<div class="ppc-scn">${E(d.mg.title1)}<br>${E(d.mg.title2)}<small>${E(d.mg.sub)}</small></div>`:''}
      <div class="ppc-meta">作成日：${E(o.dStr)}${o.staff?`<br>担当：${E(o.staff)}`:''}</div>
    </div>`;
  // 必要保障額（万が一）
  let need='';
  if(isMg){
    const n=d.mg.need;
    const card=(cls,bd,bg,t,v,b,x)=>`<div class="ppc-tier ${cls}"><span class="bd" style="background:${bg};${cls==='safe'?'color:#1e3a5f':''}">${bd}</span><div class="tt">${t}</div><div class="v">${f(v)}<small>万円</small></div><div class="g">${E(b)}</div><div class="x">${x}</div></div>`;
    need=`<div class="ppc-need"><div class="ppc-t">必要保障額<span>万が一の年に、保険金などで受け取る想定の額</span></div>
      <div class="ppc-tiers">
        ${card('','最低限','#d97706','お金が尽きないために',n.min,n.bMin,'CF表の最後の年に、預貯金と有価証券がマイナスにならない額')}
        ${card('',`標準・生活費${n.years}年分`,'#0f9d58','暮らしが行き詰まらないために',n.std,n.bStd,`どの年も、預貯金と有価証券で生活費${n.years}年分を確保できる額`)}
        ${card('safe','安心','#fff','今の生活と資産計画を守るために',n.safe,n.bSafe,'CF表の最後の年に残るお金が、万が一がなかった場合と同じになる額'+(n.safeMode==='floor'?'（標準＋生活費2年分）':''))}
      </div>
      <div class="ppc-legend">CF表の総金融資産の色枠：<i style="background:#f59e0b"></i>最低限の根拠<i style="background:#0f9d58"></i>標準の根拠<i style="background:#60a5fa"></i>安心の根拠</div></div>`;
  }
  // 前提条件
  const c=d.cash;
  const cashBlk=`<div class="ppc-blk"><div class="ppc-bh">自己資金の内訳${c.move>0?`<span>${E(c.moveLbl)} ${f(c.move)}万円は、引き渡し年の支出としてCF表に計上</span>`:''}</div>
    <div class="ppc-flow"><div class="b"><div class="l">現預金合計</div><div class="v">${f(c.total)}<small>万円</small></div></div><div class="ar">▶</div>
      <div class="b"><div class="l">${E(c.downLbl)}</div><div class="v ${c.downOut?'neg':''}">${f(c.down)}<small>万円</small></div></div>
      <div class="b"><div class="l">${E(c.costLbl)}</div><div class="v ${c.costOut?'neg':''}">${f(c.cost)}<small>万円</small></div></div><div class="ar">▶</div>
      <div class="b ok"><div class="l">購入後残高</div><div class="v ${c.after>=0?'pos':'neg'}">${f(c.after)}<small>万円</small></div></div></div></div>`;
  const L=d.loan;
  const loanHead=`住宅ローン条件${L.label?`（${E(L.label)}）`:''}<span>住宅価格 ${f(L.price)}万円${L.delivery?`　／　引き渡し ${L.delivery}年`:''}</span>`;
  const loanBlk=L.form==='cash'
    ? `<div class="ppc-blk"><div class="ppc-bh">${loanHead}</div><div class="ppc-note">住宅ローンは利用しない（現金で購入）</div></div>`
    : `<div class="ppc-blk"><div class="ppc-bh">${loanHead}</div><div class="ppc-loan">
        <div class="hd"></div><div class="hd">借入額</div><div class="hd">当初金利</div><div class="hd">返済期間</div>
        ${L.rows.map(r=>`<div class="who ${r.p}">${E(r.who)}</div><div class="v">${f(r.amt)}<small>万円</small></div><div class="v">${r.rate}<small>%${r.steps.length?`（${E(r.steps.join('・'))}）`:''}</small></div><div class="v">${r.yrs}<small>年</small></div>`).join('')}
      </div></div>`;
  const swapBlk=d.swap.length?`<div class="ppc-blk"><div class="ppc-bh">買い替え・住み替え予定</div><div class="ppc-swap">${d.swap.map((w,i)=>`<span>${i+1}回目：${w.age}歳　売却 ${f(w.sell)}万円 → 購入 ${f(w.price)}万円</span>`).join('')}</div></div>`:'';
  const assetBlk=`<div class="ppc-blk"><div class="ppc-bh">その他金融資産（現時点）</div>${d.assets.items.length
    ? `<table class="ppc-kv">${d.assets.items.map(a=>`<tr><td>${E(a.lbl)}</td><td>${f(a.val)}万円</td></tr>`).join('')}<tr class="tot"><td>合計</td><td>${f(d.assets.total)}万円</td></tr></table>`
    : '<div class="ppc-note">なし</div>'}</div>`;
  const memoBlk=`<div class="ppc-blk"><div class="ppc-bh">注釈・補足メモ</div>${d.memo?`<div class="ppc-memo">${E(d.memo).replace(/\n/g,'<br>')}</div>`:'<div class="ppc-note">なし</div>'}</div>`;
  const pre=`<div class="ppc-box">${isMg?'<div class="ppc-blk ppc-pt"><div class="ppc-t">前提条件</div></div>':''}${cashBlk}${loanBlk}${swapBlk}<div class="ppc-two">${assetBlk}${memoBlk}</div></div>`;
  return `<div class="ppc${isMg?' mg':''}" style="--kc:${E(d.color||'#2bb3a3')}">${side}<div class="ppc-main">${isMg?need:'<div class="ppc-t">前提条件</div>'}${pre}</div></div>`;
}
// 表紙の右側が1ページに収まらないときは、文字を少しずつ小さくする（最大5回）
function _ppFitCover(body){
  const m=body.querySelector('.ppc-main'); if(!m)return;
  let z=1;
  for(let k=0;k<5 && m.scrollHeight>m.clientHeight+1;k++){ z-=0.07; m.style.zoom=z; }
}

// ── 生活費の内訳ページ（生活費タブと同じ項目・金額・備考。lc-tab.js の項目定義を共用） ──
//   左：毎月の固定費／右：年間の変動費、下に年間合計。「その他」は項目名も金額もない行を省く
function _ppLCHtml(){
  const isM=(typeof ST!=='undefined'&&ST.type==='mansion');
  const val=id=>{ const el=document.getElementById(id); return el?(parseFloat(String(el.value).replace(/,/g,''))||0):0; };
  const nameOf=nid=>{ const el=nid&&document.getElementById(nid); return el?(el.value||'').trim():''; };
  const bik=id=>(typeof _lcBikou!=='undefined'&&_lcBikou[id])||'';
  const yen=v=>v?'¥'+v.toLocaleString():'－';
  const rowsOf=items=>items.filter(it=>!(it.cond==='mansion'&&!isM)).filter(it=>!it.other||val(it.id)||nameOf(it.nameId)||bik(it.id))
    .map(it=>{ const lbl=it.other?`その他（${_ppEsc(nameOf(it.nameId)||'—')}）`:_ppEsc(it.label);
      const v=val(it.id);
      return `<tr${v?'':' class="z"'}><td>${lbl}</td><td class="num">${yen(v)}</td><td class="bik">${_ppEsc(bik(it.id))}</td></tr>`; }).join('');
  const sum=items=>items.filter(it=>!(it.cond==='mansion'&&!isM)).reduce((s,it)=>s+val(it.id),0);
  const mT=sum(LC_MONTHLY_ITEMS), yT=sum(LC_YEARLY_ITEMS);
  const annualFix=mT*12, total=annualFix+yT;
  const man=v=>Math.round(v/10000).toLocaleString();
  const tbl=(cls,title,unit,items,subLbl,subVal,totLbl,totVal)=>`<table class="pp-lc ${cls}">
      <tr class="h"><td>${title}</td><td class="num">${unit}</td><td>備考</td></tr>
      ${rowsOf(items)}
      <tr class="s"><td>${subLbl}</td><td class="num">¥${subVal.toLocaleString()}</td><td></td></tr>
      <tr class="t"><td>${totLbl}</td><td class="num">¥${totVal.toLocaleString()}</td><td></td></tr>
    </table>`;
  return `<div class="pp-lc-wrap">
    <div class="pp-lc-cards">
      <div class="card fix"><div class="k">毎月の固定費</div><div class="v">¥${mT.toLocaleString()}<small>／月</small></div><div class="s">年間 ¥${annualFix.toLocaleString()}（×12か月）</div></div>
      <div class="card var"><div class="k">年間の変動費</div><div class="v">¥${yT.toLocaleString()}<small>／年</small></div><div class="s">旅行・被服・医療など年単位の支出</div></div>
      <div class="card tot"><div class="k">生活費の年間合計</div><div class="v">¥${total.toLocaleString()}</div><div class="s">約${man(total)}万円（固定費＋変動費）</div></div>
    </div>
    <div class="pp-lc-cols">
      ${tbl('fix','毎月の固定費','月額（円）',LC_MONTHLY_ITEMS,'小計（月額）',mT,'年間（×12か月）',annualFix)}
      ${tbl('var','年間の変動費','年額（円）',LC_YEARLY_ITEMS,'小計（年額）',yT,'年間',yT)}
    </div>
  </div>`;
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
function _ppVerify(box, srcRows, yearRow, nCols, prefix){
  if(prefix===undefined) prefix='0:';   // 表の番号（複数タブまとめて印刷するとき）
  const norm=s=>(s||'').replace(/\s+/g,'');
  const seen={};
  box.querySelectorAll('.pp-tbl [data-pp]').forEach(c=>{ (seen[c.dataset.pp]=seen[c.dataset.pp]||[]).push(norm(c.textContent)); });
  const problems=[];
  srcRows.forEach((r,ri)=>{
    const lbl=norm(r.cells[1].textContent)||norm(r.cells[0].textContent)||`${ri+1}行目`;
    for(let i=0;i<nCols;i++){
      if(ri===0 && i===2) continue;                     // 「開始年を設定」ボタン文字は意図的に除去
      const got=seen[prefix+ri+':'+i];
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
