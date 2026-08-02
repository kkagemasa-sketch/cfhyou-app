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
  // 🗑 削除したCF表の復元（ゴミ箱に中身があるときだけ表示）
  try{
    if(_loadScenTrash().length>0){
      const tb=document.createElement('button');
      tb.className='stab-add';tb.textContent='🗑';
      tb.title='削除したCF表を元に戻す（30日間保持）';
      tb.addEventListener('click',()=>showScenarioTrash());
      cont.appendChild(tb);
    }
  }catch(e){}
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

// ===== 削除したCF表のゴミ箱（誤削除からの復元用・この端末に30日保持） =====
const _SCEN_TRASH_KEY='cf_scenario_trash_v1';
function _loadScenTrash(){
  try{
    const raw=localStorage.getItem(_SCEN_TRASH_KEY);
    const arr=raw?JSON.parse(raw):[];
    // 30日より古いものは自動整理
    const limit=Date.now()-30*24*60*60*1000;
    return Array.isArray(arr)?arr.filter(t=>t.deletedAt>limit):[];
  }catch(e){return [];}
}
function _saveScenTrash(arr){
  // 最大5件。容量オーバー時は古いものから間引いて再試行
  let list=arr.slice(-5);
  for(let i=0;i<5;i++){
    try{ localStorage.setItem(_SCEN_TRASH_KEY,JSON.stringify(list)); return; }
    catch(e){ if(list.length<=1){try{localStorage.removeItem(_SCEN_TRASH_KEY);}catch(_){} return;} list=list.slice(1); }
  }
}

function deleteScenario(id){
  if(scenarios.length<=1)return;
  const target=scenarios.find(s=>s.id===id);
  const name=target?target.name:'このCF表';
  if(!confirm('「'+name+'」を削除しますか？\n\n（削除しても、CF表タブ横の 🗑 から30日間は元に戻せます）'))return;
  // ★ 削除前に必ず控えを取る（アクティブなCF表は最新の入力を取り込んでから）
  if(target){
    if(activeScenarioId===id){
      try{ target.data=_collectSaveData(); }catch(e){}
    }
    const trash=_loadScenTrash();
    trash.push({name:target.name, data:target.data, deletedAt:Date.now()});
    _saveScenTrash(trash);
  }
  scenarios=scenarios.filter(s=>s.id!==id);
  if(activeScenarioId===id){
    activeScenarioId=scenarios[0].id;
    const t=scenarios[0];
    if(t.data)_applyData(t.data);
  }
  renderScenarioTabs();
}

// ゴミ箱一覧を表示して復元できるようにする
function showScenarioTrash(){
  document.getElementById('scen-trash-overlay')?.remove();
  const trash=_loadScenTrash();
  const ov=document.createElement('div');
  ov.id='scen-trash-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100002;display:flex;align-items:center;justify-content:center';
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  let rows='';
  if(trash.length===0){
    rows='<div style="color:#64748b;font-size:12px;padding:14px 0">削除したCF表はありません（削除から30日で自動的に消えます）</div>';
  }else{
    [...trash].reverse().forEach((t,revIdx)=>{
      const idx=trash.length-1-revIdx;
      const d=new Date(t.deletedAt);
      const when=(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      rows+='<div style="display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid #e2e8f0">'
        +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+String(t.name||'CF表').replace(/</g,'&lt;')+'</div>'
        +'<div style="font-size:10px;color:#94a3b8">削除: '+when+'</div></div>'
        +'<button onclick="restoreScenarioFromTrash('+idx+')" style="background:#16a34a;color:#fff;border:none;border-radius:5px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">元に戻す</button>'
        +'</div>';
    });
  }
  ov.innerHTML='<div style="background:#fff;border-radius:10px;padding:16px 18px;width:min(92vw,420px);max-height:80vh;overflow:auto;box-shadow:0 10px 40px rgba(0,0,0,.3)" onclick="event.stopPropagation()">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
    +'<div style="font-size:14px;font-weight:800;color:#1e293b">🗑 削除したCF表</div>'
    +'<button onclick="document.getElementById(\'scen-trash-overlay\').remove()" style="background:none;border:none;font-size:16px;cursor:pointer;color:#64748b">✕</button></div>'
    +rows+'</div>';
  document.body.appendChild(ov);
}
function restoreScenarioFromTrash(idx){
  const trash=_loadScenTrash();
  const item=trash[idx];
  if(!item)return;
  scenarioCnt++;
  scenarios.push({id:scenarioCnt, name:item.name||('CF表'+(scenarios.length+1)), data:item.data||null});
  trash.splice(idx,1);
  _saveScenTrash(trash);
  document.getElementById('scen-trash-overlay')?.remove();
  switchScenarioAndShow(scenarioCnt); // 復元したCF表を開く（中でタブ再描画）
  if(typeof scheduleAutoSave==='function')scheduleAutoSave();
}
window.showScenarioTrash=showScenarioTrash;
window.restoreScenarioFromTrash=restoreScenarioFromTrash;

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
