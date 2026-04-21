// scenario.js — シナリオ管理
// ===== シナリオ管理 =====
function renderScenarioTabs(){
  const cont=document.getElementById('scen-tabs');
  if(!cont)return;
  cont.innerHTML='';
  scenarios.forEach(s=>{
    const btn=document.createElement('button');
    btn.className='rtab'+(s.id===activeScenarioId&&rTab==='cf'?' on':'');
    btn.id='stab-'+s.id;
    // 名前表示（ダブルクリックで編集可能）
    const inp=document.createElement('input');
    inp.className='stab-name';
    inp.value=s.name;
    inp.title='ダブルクリックで名前変更';
    inp.readOnly=true;
    inp.style.width=(Math.max(40,s.name.length*14))+'px';
    inp.addEventListener('dblclick',e=>{e.stopPropagation();inp.readOnly=false;inp.select();});
    inp.addEventListener('blur',()=>{inp.readOnly=true;s.name=inp.value||s.name;inp.style.width=(Math.max(40,s.name.length*14))+'px';});
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){inp.blur();}if(e.key==='Escape'){inp.value=s.name;inp.blur();}});
    inp.addEventListener('click',e=>{
      if(inp.readOnly){e.stopPropagation();switchScenarioAndShow(s.id);}
    });
    btn.appendChild(inp);
    if(scenarios.length>1){
      const rm=document.createElement('button');
      rm.className='stab-rm';rm.textContent='×';rm.title='このCF表を削除';
      rm.addEventListener('click',e=>{e.stopPropagation();deleteScenario(s.id);});
      btn.appendChild(rm);
    }
    btn.addEventListener('click',()=>{if(inp.readOnly)switchScenarioAndShow(s.id);});
    cont.appendChild(btn);
  });
  const addBtn=document.createElement('button');
  addBtn.className='stab-add';addBtn.textContent='＋';addBtn.title='CF表を追加';
  addBtn.addEventListener('click',()=>showScenarioModal());
  cont.appendChild(addBtn);
}

function switchScenarioAndShow(id){
  if(id!==activeScenarioId){
    switchScenario(id);
  } else if(rTab!=='cf' || window._mgQA_activeTabId){
    // Q&A万が一タブがアクティブな場合も CF に戻す
    setRTab('cf');
  }
  // renderScenarioTabs()はsetRTab内で呼ばれる
}

function switchScenario(id){
  // 現在の状態を保存
  const cur=scenarios.find(s=>s.id===activeScenarioId);
  if(cur)cur.data=_collectSaveData();
  // 切替
  activeScenarioId=id;
  const target=scenarios.find(s=>s.id===id);
  if(target&&target.data){
    _applyData(target.data);
  } else {
    // 新規作成（data=null）: 白紙化してから切替
    if(typeof _resetSheetState==='function') _resetSheetState();
    if(typeof live==='function') live();
    if(typeof render==='function') render();
  }
  setRTab('cf'); // setRTab内でrenderScenarioTabs()も呼ばれる
}

function deleteScenario(id){
  if(scenarios.length<=1)return;
  if(!confirm('このCF表を削除しますか？'))return;
  scenarios=scenarios.filter(s=>s.id!==id);
  if(activeScenarioId===id){
    activeScenarioId=scenarios[0].id;
    const t=scenarios[0];
    if(t.data)_applyData(t.data);
  }
  renderScenarioTabs();
}

function showScenarioModal(){
  let overlay=document.getElementById('scen-modal-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='scen-modal-overlay';
    overlay.className='scen-modal-overlay';
    overlay.innerHTML=`
      <div class="scen-modal">
        <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:16px">CF表を追加</div>
        <div style="margin-bottom:12px">
          <label style="font-size:11px;color:#64748b;font-weight:600;display:block;margin-bottom:4px">CF表の名前</label>
          <input id="scen-new-name" class="inp" placeholder="例：奥様パートver" style="width:100%;font-size:13px;padding:7px 10px">
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
          <button onclick="execAddScenario(false)" style="background:#1d4ed8;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">📄 新規で作成</button>
          <button onclick="execAddScenario(true)" style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">📋 現在のCF表を複製</button>
        </div>
        <button onclick="document.getElementById('scen-modal-overlay').remove()" style="width:100%;background:#f1f5f9;color:#64748b;border:none;border-radius:8px;padding:8px;font-size:12px;cursor:pointer">キャンセル</button>
      </div>`;
    document.body.appendChild(overlay);
  }else{
    overlay.style.display='flex';
  }
  setTimeout(()=>document.getElementById('scen-new-name')?.focus(),50);
}

function execAddScenario(isDuplicate){
  const nameEl=document.getElementById('scen-new-name');
  const name=(nameEl?.value||'').trim()||('CF表'+(scenarios.length+1));
  // 現在の状態を保存
  const cur=scenarios.find(s=>s.id===activeScenarioId);
  if(cur)cur.data=_collectSaveData();
  // 新規作成
  scenarioCnt++;
  const newData=isDuplicate?JSON.parse(JSON.stringify(cur.data)):null;
  scenarios.push({id:scenarioCnt,name,data:newData});
  document.getElementById('scen-modal-overlay')?.remove();
  switchScenario(scenarioCnt);
}

// 初期化はwindow.onloadで行う（下部のwindow.onloadに統合）
