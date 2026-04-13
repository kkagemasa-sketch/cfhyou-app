// cf-ui.js — UI操作・ライブ更新・バリデーション
function _rl(key,def){return _cfRowLabels[key]||def;}

function toggleFinAsset(){
  finAssetVisible=!finAssetVisible;
  _applyFinAssetVisibility();
  const btn=document.getElementById('btn-fin-toggle');
  if(btn)btn.textContent=finAssetVisible?'👁 金融資産行を隠す':'👁 金融資産行を表示';
}
function _applyFinAssetVisibility(){
  document.querySelectorAll('.fin-asset-row').forEach(tr=>{
    tr.style.display=finAssetVisible?'':'none';
  });
}

// ===== 手取り計算機 開閉トグル（共通関数） =====
function toggleCalc(bodyId, btn){
  const b=document.getElementById(bodyId);
  const open=b.style.display!=='none';
  b.style.display=open?'none':'';
  btn.textContent=open?'▶ 表示':'▼ 閉じる';
}

// ===== ライブ更新 =====
function live(force){
  clearTimeout(timer);
  const ind=document.getElementById('update-indicator');
  if(ind){ind.style.display='inline';ind.textContent='● 更新中...';}
  timer=setTimeout(()=>{
    const hash=_getInputHash();
    if(!force&&hash===_lastInputHash){
      if(ind)ind.style.display='none';
      return;
    }
    _lastInputHash=hash;
    pushUndoSnap();
    validate();updateHints();calcLC();updateEdu();
    // 万が一タブ表示中はrenderContingency()（内部でrender()も呼ばれる）
    if((rTab==='mg-h'||rTab==='mg-w')&&typeof renderContingency==='function'){
      renderContingency();
    }else{render();}
    document.querySelectorAll('.amt-inp').forEach(el=>{const v=el.value.trim();el.classList.toggle('is-zero',v===''||v==='0');});
    if(ind){
      ind.textContent='✓ 完了';ind.style.background='rgba(74,222,128,0.25)';ind.style.color='#4ade80';
      clearTimeout(indicatorTimer);
      indicatorTimer=setTimeout(()=>{ind.style.display='none';},1200);
    }
  },600);
}

// ===== バリデーション =====
function validate(){
  const errs=[];
  if(!_v('client-name').trim())errs.push({id:'client-name',msg:'お客様氏名を入力してください'});
  const ha=iv('husband-age');if(ha<20||ha>80)errs.push({id:'husband-age',msg:'ご主人様の年齢は20〜80歳'});
  if(fv('loan-amt')<=0)errs.push({id:'loan-amt',msg:'借入金額を入力してください'});
  // ローン完済年齢チェック（80歳超え警告）
  const loanYrsChk=iv('loan-yrs')||35;
  const deliveryChk=iv('delivery')||0;
  const loanEndAge=ha+deliveryChk+loanYrsChk;
  if(loanEndAge>80)errs.push({id:'loan-yrs',msg:`⚠️ ローン完済時${loanEndAge}歳 — 80歳を超えています（銀行審査に影響する可能性）`});
  // 収入ステップは任意入力のためvalidation省略
  document.querySelectorAll('.inp.err').forEach(e=>e.classList.remove('err'));
  const bar=$('err-bar'),lst=$('err-list');
  if(errs.length){bar.classList.add('show');lst.innerHTML=errs.map(e=>`<li>${e.msg}</li>`).join('');errs.forEach(e=>{const el=$(e.id);if(el)el.classList.add('err')})}
  else{bar.classList.remove('show');lst.innerHTML=''}
}

// ===== 右タブ切替 =====
function renderMemo(){
  const scen=scenarios.find(s=>s.id===activeScenarioId);
  const txt=scen?.memo||'';
  const rb=$('right-body');
  rb.innerHTML=`<div style="padding:16px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:8px">
    <div style="font-size:12px;font-weight:700;color:var(--navy)">📝 メモ <span style="font-size:10px;font-weight:400;color:var(--muted)">${scen?.name||''}のメモ</span></div>
    <textarea id="memo-area" placeholder="自由にメモを入力できます" oninput="saveMemo()"
      style="flex:1;resize:none;border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;font-family:inherit;color:var(--navy);outline:none;line-height:1.6">${txt}</textarea>
  </div>`;
}
function saveMemo(){
  const scen=scenarios.find(s=>s.id===activeScenarioId);
  if(scen)scen.memo=$('memo-area')?.value||'';
}
function setRTab(t){
  // グラフタブの場合、直前のタブコンテキストを記憶
  if(t!=='graph')window._lastCFTab=t;
  rTab=t;
  $('rt-lctab')?.classList.toggle('on',t==='lctab');
  $('rt-graph')?.classList.toggle('on',t==='graph');
  $('rt-loan')?.classList.toggle('on',t==='loan');
  $('rt-memo')?.classList.toggle('on',t==='memo');
  $('rt-basis')?.classList.toggle('on',t==='basis');
  $('rt-mg-h')?.classList.toggle('on',t==='mg-h');
  $('rt-mg-w')?.classList.toggle('on',t==='mg-w');
  // rt-mansion removed — now in header
  // シ���リオタブのon/offを更新
  renderScenarioTabs();
  // CF表・万が一タブのみ金融資産ボタン表示
  const finBtn=$('btn-fin-toggle');
  if(finBtn)finBtn.style.display=(t==='cf'||t==='mg-h'||t==='mg-w')?'':'none';
  if(t==='lctab'){renderLCTab();return;}
  if(t==='memo'){renderMemo();return;}
  if(t==='basis'){renderBasisTab();return;}
  if(t==='loan'){
    renderLoanTab();
    return;
  }
  if(t==='mg-h'||t==='mg-w'){
    if(!_mgRendering&&typeof renderContingency==='function'){
      renderContingency();
    } else {
      const key=t==='mg-h'?'h':'w';
      const html=window._mgStore&&window._mgStore[key];
      if(html){
        const _rb=$('right-body');
        _rb.innerHTML=html;
        _applyFinAssetVisibility();
      }
    }
    return;
  }
  // グラフタブで直前が万が一タブならMGグラフを表示
  if(t==='graph'){
    const lastTab=window._lastCFTab||'cf';
    if((lastTab==='mg-h'||lastTab==='mg-w')&&window._mgMRStore){
      const mgKey2=lastTab==='mg-h'?'h':'w';
      const MR2=window._mgMRStore[mgKey2];
      if(MR2){
        const hAge2=iv('husband-age')||30;
        const isM2=ST.type==='mansion';
        const tLbl2=mgKey2==='h'?'ご主人様':'奥様';
        renderGraphsMG(MR2,MR2.yr.length,isM2,hAge2,tLbl2);
        return;
      }
    }
  }
  render();
}

// ===== マンション管理（モーダル） =====
function openMansionMgmt(){
  let ov=document.getElementById('mansion-mgmt-overlay');
  if(ov){ov.style.display='flex';_renderMansionList();return;}
  ov=document.createElement('div');
  ov.id='mansion-mgmt-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999';
  ov.onclick=function(e){if(e.target===ov)closeMansionMgmt();};
  const box=document.createElement('div');
  box.id='mansion-mgmt-box';
  box.style.cssText='background:#fff;border-radius:12px;width:90%;max-width:520px;max-height:80vh;overflow-y:auto;padding:20px 24px;box-shadow:0 8px 32px rgba(0,0,0,.25)';
  ov.appendChild(box);
  document.body.appendChild(ov);
  _renderMansionList();
}
function closeMansionMgmt(){
  const ov=document.getElementById('mansion-mgmt-overlay');
  if(ov)ov.style.display='none';
}
function _renderMansionList(){
  const box=document.getElementById('mansion-mgmt-box');
  if(!box)return;
  let h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">';
  h+='<div style="font-size:16px;font-weight:700;color:#1e3a5f">🏢 マンション管理</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button onclick="addMansion()" style="background:#0d9488;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer">＋ 新規追加</button>';
  h+='<button onclick="closeMansionMgmt()" style="background:#94a3b8;color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer">閉じる</button>';
  h+='</div></div>';
  if(_mansionMaster.length===0){
    h+='<div style="text-align:center;padding:30px;color:#94a3b8;font-size:13px">マンションが登録されていません。<br>「＋ 新規追加」から登録してください。</div>';
  } else {
    _mansionMaster.forEach(m=>{
      h+='<div id="mcard-'+m.id+'" style="background:#f7f9fb;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center">';
      h+='<div style="font-size:13px;font-weight:700;color:#1e3a5f">'+_escH(m.name||'（未入力）')+'</div>';
      h+='<div style="display:flex;gap:6px">';
      h+='<button onclick="editMansion(\''+m.id+'\')" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer">編集</button>';
      h+='<button onclick="deleteMansion(\''+m.id+'\')" style="background:#dc2626;color:#fff;border:none;border-radius:4px;padding:3px 10px;font-size:11px;cursor:pointer">削除</button>';
      h+='</div></div>';
      h+='<div style="font-size:11px;color:#64748b;margin-top:6px">';
      h+='管理費: <strong>'+m.mgmtUnit+'</strong>円/㎡/月　修繕積立金: <strong>'+m.repUnit+'</strong>円/㎡/月　ネット: <strong>'+(m.netFee||0)+'</strong>円/月';
      h+='</div>';
      // 値上げステップ表示
      const rs=Array.isArray(m.repSteps)?m.repSteps:[];
      if(rs.length>0){
        const sorted=[...rs].sort((a,b)=>a.fromYear-b.fromYear);
        h+='<div style="font-size:10px;color:#0369a1;margin-top:4px;padding:4px 8px;background:#f0f9ff;border-radius:4px">📈 値上げ: ';
        h+=sorted.map(s=>s.fromYear+'年目〜'+s.unit+'円').join('、 ');
        h+='</div>';
      }
      h+='</div>';
    });
  }
  box.innerHTML=h;
}
function _escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function addMansion(){
  const id=String(Date.now());
  _mansionMaster.push({id:id,name:'',mgmtUnit:200,repUnit:160,netFee:0,repSteps:[]});
  saveMansionMaster();
  _renderMansionList();
  editMansion(id);
  // ※ クラウド保存は保存ボタン押下時（saveMansionEdit）に実行
}
function editMansion(id){
  const m=_mansionMaster.find(x=>x.id===id);
  if(!m)return;
  const card=document.getElementById('mcard-'+id);
  if(!card)return;
  if(!Array.isArray(m.repSteps))m.repSteps=[];
  card.innerHTML='<div style="display:grid;grid-template-columns:1fr;gap:10px">'
    +'<div><label style="font-size:10px;font-weight:600;color:#64748b">マンション名</label>'
    +'<input id="med-name-'+id+'" class="inp" style="font-size:12px" value="'+_escH(m.name)+'" placeholder="例: グランドメゾン東京"></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +'<div><label style="font-size:10px;font-weight:600;color:#64748b">管理費単価（円/㎡/月）</label>'
    +'<input id="med-mgmt-'+id+'" class="inp" type="number" style="font-size:12px" value="'+m.mgmtUnit+'" min="0" oninput="_updateMansionPreview(\''+id+'\')" inputmode="numeric"></div>'
    +'<div><label style="font-size:10px;font-weight:600;color:#64748b">インターネット（円/月）</label>'
    +'<input id="med-net-'+id+'" class="inp" type="number" style="font-size:12px" value="'+(m.netFee||0)+'" min="0" inputmode="numeric"></div>'
    +'</div>'
    // 修繕積立金 値上げステップ
    +'<div style="border-top:1px dashed #cbd5e1;padding-top:10px;margin-top:4px">'
    +'<div style="font-size:11px;font-weight:700;color:#1e3a5f;margin-bottom:6px">📈 修繕積立金 値上げステップ</div>'
    +'<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:10px;color:#92400e;line-height:1.5">'
    +'⚠️ 「〇年目」は<strong>CF表の1年目を基準</strong>とします（購入時=1年目）。<br>'
    +'<strong>※ 現在からの経過年ではありません。</strong>ご注意ください。'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
    +'<label style="font-size:10px;color:#64748b">プレビュー用 専有面積:</label>'
    +'<input id="med-preview-sqm-'+id+'" class="inp" type="number" style="font-size:11px;width:70px" value="75" min="1" max="500" step="1" oninput="_updateMansionPreview(\''+id+'\')">'
    +'<span style="font-size:10px;color:#64748b">㎡</span>'
    +'</div>'
    +'<div id="med-steps-wrap-'+id+'" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
    +'<div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:4px">入力欄</div>'
    // 1年目〜 基準単価（固定行）
    +'<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">'
    +'<span style="display:inline-block;width:50px;font-size:11px;text-align:center;padding:3px 0;background:#e0f2fe;border:1px solid #bae6fd;border-radius:4px;color:#0369a1;font-weight:600">1</span>'
    +'<span style="font-size:10px;color:#64748b">年目〜</span>'
    +'<input id="med-rep-'+id+'" type="number" style="width:60px;font-size:11px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:4px" value="'+m.repUnit+'" min="0" step="1" oninput="_updateMansionPreview(\''+id+'\')" inputmode="numeric">'
    +'<span style="font-size:10px;color:#64748b">円/㎡/月</span>'
    +'</div>'
    +'<div id="med-steps-inputs-'+id+'"></div>'
    +'<button onclick="addMansionStep(\''+id+'\')" style="background:#0ea5e9;color:#fff;border:none;border-radius:4px;padding:4px 12px;font-size:11px;cursor:pointer;margin-top:4px">＋ ステップ追加</button>'
    +'</div>'
    +'<div><div style="font-size:10px;font-weight:600;color:#64748b;margin-bottom:4px">プレビュー</div>'
    +'<div id="med-steps-preview-'+id+'" style="font-size:11px;color:#1e293b;line-height:1.6"></div>'
    +'</div>'
    +'</div></div>'
    // 保存・キャンセル
    +'<div style="display:flex;gap:6px;justify-content:flex-end;border-top:1px solid #e2e8f0;padding-top:8px">'
    +'<button onclick="saveMansionEdit(\''+id+'\')" style="background:#16a34a;color:#fff;border:none;border-radius:4px;padding:5px 18px;font-size:12px;font-weight:600;cursor:pointer">保存</button>'
    +'<button onclick="_renderMansionList()" style="background:#94a3b8;color:#fff;border:none;border-radius:4px;padding:5px 18px;font-size:12px;cursor:pointer">キャンセル</button>'
    +'</div></div>';
  // 既存ステップを描画
  m.repSteps.forEach(s=>_appendMansionStepRow(id,s.fromYear,s.unit));
  _updateMansionPreview(id);
  document.getElementById('med-name-'+id)?.focus();
}
// ステップ入力行を追加
function _appendMansionStepRow(id,fromYear,unit){
  const wrap=document.getElementById('med-steps-inputs-'+id);
  if(!wrap)return;
  const rowId='mst-'+id+'-'+Date.now()+Math.floor(Math.random()*1000);
  const row=document.createElement('div');
  row.id=rowId;
  row.style.cssText='display:flex;align-items:center;gap:4px;margin-bottom:4px';
  row.innerHTML='<input type="number" class="mst-year" style="width:50px;font-size:11px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:4px" value="'+(fromYear||6)+'" min="2" max="100" step="1">'
    +'<span style="font-size:10px;color:#64748b">年目〜</span>'
    +'<input type="number" class="mst-unit" style="width:60px;font-size:11px;padding:3px 5px;border:1px solid #cbd5e1;border-radius:4px" value="'+(unit||0)+'" min="0" step="1">'
    +'<span style="font-size:10px;color:#64748b">円/㎡/月</span>'
    +'<button onclick="document.getElementById(\''+rowId+'\').remove();_updateMansionPreview(\''+id+'\')" style="background:#ef4444;color:#fff;border:none;border-radius:4px;width:20px;height:20px;font-size:11px;cursor:pointer;line-height:1">×</button>';
  wrap.appendChild(row);
  // 入力変更でプレビュー更新
  row.querySelectorAll('input').forEach(el=>el.addEventListener('input',()=>_updateMansionPreview(id)));
}
function addMansionStep(id){
  _appendMansionStepRow(id,6,0);
  _updateMansionPreview(id);
}
// 現在の入力欄からステップ情報を収集
// ・同じ年度の重複は「後入力」が優先
// ・単価が0以下の行は未入力扱いとして無視
function _collectMansionSteps(id){
  const wrap=document.getElementById('med-steps-inputs-'+id);
  if(!wrap)return [];
  const byYear=new Map();
  wrap.querySelectorAll('[id^="mst-'+id+'-"]').forEach(row=>{
    const y=parseInt(row.querySelector('.mst-year')?.value)||0;
    const u=parseFloat(row.querySelector('.mst-unit')?.value)||0;
    // 年度が2以上かつ単価が正のもののみ有効（未入力/空行は除外）
    if(y>=2&&u>0)byYear.set(y,u);
  });
  const steps=[];
  byYear.forEach((unit,fromYear)=>steps.push({fromYear,unit}));
  steps.sort((a,b)=>a.fromYear-b.fromYear);
  return steps;
}
// プレビュー描画
function _updateMansionPreview(id){
  const previewEl=document.getElementById('med-steps-preview-'+id);
  if(!previewEl)return;
  const baseUnit=parseFloat(document.getElementById('med-rep-'+id)?.value)||0;
  const sqm=parseFloat(document.getElementById('med-preview-sqm-'+id)?.value)||75;
  const steps=_collectMansionSteps(id);
  // 全期間構築: [1年目〜, ...steps]
  const allSteps=[{fromYear:1,unit:baseUnit},...steps];
  let html='';
  for(let i=0;i<allSteps.length;i++){
    const s=allSteps[i];
    const next=allSteps[i+1];
    const rangeText=next?(s.fromYear+'年目〜'+(next.fromYear-1)+'年目'):(s.fromYear+'年目〜');
    const monthly=Math.round(s.unit*sqm);
    const yearly=(monthly*12/10000);
    const yearlyStr=yearly>=10?Math.round(yearly)+'万円':yearly.toFixed(1)+'万円';
    html+='<div style="padding:4px 8px;background:'+(i===0?'#f0f9ff':'#fefce8')+';border-left:3px solid '+(i===0?'#0ea5e9':'#eab308')+';margin-bottom:4px;border-radius:3px">'
      +'<div style="font-weight:700;color:#1e293b">'+rangeText+'</div>'
      +'<div style="color:#475569;font-size:10px">'+s.unit+'円/㎡/月 × '+sqm+'㎡</div>'
      +'<div style="color:#0f766e;font-weight:600">月 '+monthly.toLocaleString()+'円【年 '+yearlyStr+'】</div>'
      +'</div>';
  }
  previewEl.innerHTML=html||'<div style="color:#94a3b8;font-size:10px">基準単価を入力してください</div>';
}
async function saveMansionEdit(id){
  const m=_mansionMaster.find(x=>x.id===id);
  if(!m)return;
  const name=(document.getElementById('med-name-'+id)?.value||'').trim();
  if(!name){alert('マンション名を入力してください');return;}
  m.name=name;
  m.mgmtUnit=parseFloat(document.getElementById('med-mgmt-'+id)?.value)||0;
  m.repUnit=parseFloat(document.getElementById('med-rep-'+id)?.value)||0;
  m.netFee=parseFloat(document.getElementById('med-net-'+id)?.value)||0;
  m.repSteps=_collectMansionSteps(id); // NEW: 値上げステップ
  saveMansionMaster(); // ローカルキャッシュ即時更新
  populateMansionSelect();
  _renderMansionList();
  if(_selectedMansionId===id)applyMansionData();
  // クラウド保存（チーム共有）
  const ok=await saveMansionToCloud(m);
  if(ok){
    console.log('[Firebase] マンション「'+name+'」をクラウドに保存しました');
  }
}
async function deleteMansion(id){
  const m=_mansionMaster.find(x=>x.id===id);
  if(!m)return;
  if(!confirm('「'+m.name+'」を削除しますか？\n※ チーム全員のデータから削除されます'))return;
  _mansionMaster=_mansionMaster.filter(x=>x.id!==id);
  saveMansionMaster(); // ローカルキャッシュ即時更新
  populateMansionSelect();
  if(_selectedMansionId===id){_selectedMansionId='';const sel=document.getElementById('mansion-select');if(sel)sel.value='';}
  _renderMansionList();
  // クラウド削除（チーム全員に反映）
  await deleteMansionFromCloud(id);
}

// ===== 印刷情報 =====
// 遺族基礎年金（2024年度）: 基本816,000円＋加算234,800円(1・2子)／78,300円(3子以降)
function calcKiso(n){
  if(n===0)return 0;
  if(n===1)return ri(81.6+23.48);
  if(n===2)return ri(81.6+23.48*2);
  return ri(81.6+23.48*2+7.83*(n-2));
}
