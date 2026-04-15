// mansion-files.js — マンションごとのPDF/画像ファイル添付機能
// Firebase Storage保存、1マンション5ファイルまで、画像自動縮小、画像ライトボックスプレビュー

const MANSION_FILE_MAX_COUNT = 5;
const MANSION_FILE_MAX_SIZE_MB = 10; // 10MBまで
const MANSION_IMAGE_MAX_WIDTH = 1920; // 画像縮小の最大幅
const MANSION_IMAGE_JPEG_QUALITY = 0.85;
const MANSION_FILE_ACCEPT = 'application/pdf,image/jpeg,image/png';

// ファイル種別判定
function _mfFileType(file){
  const t=(file.type||'').toLowerCase();
  if(t==='application/pdf')return 'pdf';
  if(t.startsWith('image/'))return 'image';
  return 'other';
}

// 画像を縮小してBlobで返す
function _mfResizeImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const reader=new FileReader();
    reader.onload=e=>{img.src=e.target.result;};
    reader.onerror=()=>reject(new Error('画像読込失敗'));
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>MANSION_IMAGE_MAX_WIDTH){
        h=Math.round(h*(MANSION_IMAGE_MAX_WIDTH/w));
        w=MANSION_IMAGE_MAX_WIDTH;
      }
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>{
        if(!blob)return reject(new Error('画像変換失敗'));
        resolve(blob);
      },'image/jpeg',MANSION_IMAGE_JPEG_QUALITY);
    };
    img.onerror=()=>reject(new Error('画像読込失敗'));
    reader.readAsDataURL(file);
  });
}

// ファイル選択ダイアログを開く
function pickMansionFiles(mansionId){
  const m=_mansionMaster.find(x=>x.id===mansionId);
  if(!m)return;
  if(!Array.isArray(m.files))m.files=[];
  const remain=MANSION_FILE_MAX_COUNT-m.files.length;
  if(remain<=0){
    alert('1マンションあたり最大'+MANSION_FILE_MAX_COUNT+'ファイルまでです。\n不要なファイルを削除してください。');
    return;
  }
  const input=document.createElement('input');
  input.type='file';
  input.accept=MANSION_FILE_ACCEPT;
  input.multiple=true;
  input.onchange=async()=>{
    const files=Array.from(input.files||[]);
    if(files.length===0)return;
    if(files.length>remain){
      alert('残り'+remain+'ファイルまで追加できます。\n選択された'+files.length+'ファイルのうち、先頭'+remain+'ファイルのみ処理します。');
    }
    const toUpload=files.slice(0,remain);
    for(const f of toUpload){
      await uploadMansionFile(mansionId,f);
    }
  };
  input.click();
}

// 単一ファイルをアップロード
async function uploadMansionFile(mansionId,file){
  const m=_mansionMaster.find(x=>x.id===mansionId);
  if(!m)return;
  if(!window._firebase||!window._firebaseReady){
    alert('クラウド接続中です。数秒待ってから再度お試しください。');
    return;
  }
  const ft=_mfFileType(file);
  if(ft==='other'){
    alert('PDF・JPG・PNG以外は添付できません: '+file.name);
    return;
  }
  if(file.size>MANSION_FILE_MAX_SIZE_MB*1024*1024){
    alert('ファイルサイズが大きすぎます（'+MANSION_FILE_MAX_SIZE_MB+'MBまで）: '+file.name);
    return;
  }
  const progressId='mfup-'+Date.now();
  _mfShowProgress(progressId,'アップロード中: '+file.name);
  try{
    let uploadBlob=file;
    let uploadName=file.name;
    let uploadType=file.type;
    if(ft==='image'){
      uploadBlob=await _mfResizeImage(file);
      // JPEGに統一
      uploadName=file.name.replace(/\.(png|jpe?g)$/i,'')+'.jpg';
      uploadType='image/jpeg';
    }
    const fileId=String(Date.now())+'-'+Math.floor(Math.random()*10000);
    const safeName=uploadName.replace(/[^\w.\-]/g,'_');
    const path='mansions/'+mansionId+'/'+fileId+'_'+safeName;
    const fb=window._firebase;
    const ref=fb.storageRef(fb.storage,path);
    await fb.uploadBytes(ref,uploadBlob,{contentType:uploadType});
    const url=await fb.getDownloadURL(ref);
    if(!Array.isArray(m.files))m.files=[];
    m.files.push({
      id:fileId,
      name:file.name,
      type:ft,
      url:url,
      storagePath:path,
      size:uploadBlob.size,
      uploadedAt:Date.now()
    });
    saveMansionMaster();
    await saveMansionToCloud(m);
    _renderMansionList();
    // 編集画面が開いていたら再描画
    const editBox=document.getElementById('med-files-'+mansionId);
    if(editBox)_renderMansionFilesInEdit(mansionId);
  }catch(e){
    console.error('[Mansion Files] アップロード失敗:',e);
    alert('アップロードに失敗しました: '+(e.message||e));
  }finally{
    _mfHideProgress(progressId);
  }
}

// 単一ファイル削除
async function deleteMansionFileEntry(mansionId,fileId){
  const m=_mansionMaster.find(x=>x.id===mansionId);
  if(!m||!Array.isArray(m.files))return;
  const f=m.files.find(x=>x.id===fileId);
  if(!f)return;
  if(!confirm('「'+f.name+'」を削除しますか？'))return;
  if(!window._firebase||!window._firebaseReady){
    alert('クラウド接続中です。数秒待ってから再度お試しください。');
    return;
  }
  try{
    const fb=window._firebase;
    if(f.storagePath){
      try{
        const ref=fb.storageRef(fb.storage,f.storagePath);
        await fb.deleteObject(ref);
      }catch(e){
        // ストレージに無い場合もDBからは消す
        console.warn('[Mansion Files] Storage削除失敗（継続）:',e);
      }
    }
    m.files=m.files.filter(x=>x.id!==fileId);
    saveMansionMaster();
    await saveMansionToCloud(m);
    _renderMansionList();
    const editBox=document.getElementById('med-files-'+mansionId);
    if(editBox)_renderMansionFilesInEdit(mansionId);
  }catch(e){
    console.error('[Mansion Files] 削除失敗:',e);
    alert('削除に失敗しました: '+(e.message||e));
  }
}

// マンション削除時: 全ファイルをStorageから削除
async function deleteAllMansionFiles(mansion){
  if(!mansion||!Array.isArray(mansion.files)||mansion.files.length===0)return;
  if(!window._firebase||!window._firebaseReady)return;
  const fb=window._firebase;
  for(const f of mansion.files){
    if(!f.storagePath)continue;
    try{
      const ref=fb.storageRef(fb.storage,f.storagePath);
      await fb.deleteObject(ref);
    }catch(e){
      console.warn('[Mansion Files] Storage削除失敗（継続）:',f.storagePath,e);
    }
  }
}
window.deleteAllMansionFiles=deleteAllMansionFiles;

// 画像ライトボックス
function previewMansionImage(url,name){
  let ov=document.getElementById('mf-lightbox');
  if(ov){ov.remove();}
  ov=document.createElement('div');
  ov.id='mf-lightbox';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:10001;cursor:zoom-out;padding:20px';
  ov.onclick=()=>ov.remove();
  ov.innerHTML='<div style="position:relative;max-width:95%;max-height:95%">'
    +'<img src="'+url+'" alt="'+_mfEsc(name||'')+'" style="max-width:100%;max-height:90vh;display:block;border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,.5)">'
    +'<div style="position:absolute;top:-30px;right:0;color:#fff;font-size:12px">'+_mfEsc(name||'')+' — クリックで閉じる</div>'
    +'</div>';
  document.body.appendChild(ov);
}

// 編集画面内のファイル一覧描画
function _renderMansionFilesInEdit(mansionId){
  const box=document.getElementById('med-files-'+mansionId);
  if(!box)return;
  const m=_mansionMaster.find(x=>x.id===mansionId);
  if(!m)return;
  const files=Array.isArray(m.files)?m.files:[];
  const count=files.length;
  let h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
  h+='<div style="font-size:11px;font-weight:700;color:#1e3a5f">📎 添付ファイル（'+count+'/'+MANSION_FILE_MAX_COUNT+'）</div>';
  h+='<button onclick="pickMansionFiles(\''+mansionId+'\')" '+(count>=MANSION_FILE_MAX_COUNT?'disabled':'')+' style="background:'+(count>=MANSION_FILE_MAX_COUNT?'#cbd5e1':'#0ea5e9')+';color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;cursor:'+(count>=MANSION_FILE_MAX_COUNT?'not-allowed':'pointer')+'">＋ 追加</button>';
  h+='</div>';
  if(count===0){
    h+='<div style="font-size:10px;color:#94a3b8;padding:8px;text-align:center;background:#f8fafc;border-radius:4px">PDF・JPG・PNG（最大'+MANSION_FILE_MAX_SIZE_MB+'MB/ファイル）を添付できます</div>';
  }else{
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px">';
    files.forEach(f=>{
      h+=_mfFileThumbHTML(mansionId,f,true);
    });
    h+='</div>';
  }
  box.innerHTML=h;
}
window._renderMansionFilesInEdit=_renderMansionFilesInEdit;

// サムネイル/リンクのHTML生成（edit=trueなら削除ボタン付き）
function _mfFileThumbHTML(mansionId,f,edit){
  const nm=_mfEsc(f.name||'');
  let inner='';
  if(f.type==='image'){
    inner='<div onclick="previewMansionImage(\''+f.url+'\',\''+nm.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\')" style="cursor:zoom-in;background:#f1f5f9;height:60px;border-radius:4px;overflow:hidden;display:flex;align-items:center;justify-content:center">'
      +'<img src="'+f.url+'" alt="'+nm+'" style="max-width:100%;max-height:100%;object-fit:cover">'
      +'</div>';
  }else{
    inner='<a href="'+f.url+'" target="_blank" rel="noopener" style="text-decoration:none;display:block;background:#fee2e2;height:60px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#991b1b;font-size:22px">📄</a>';
  }
  let h='<div style="position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:5px;padding:4px" title="'+nm+'">';
  h+=inner;
  h+='<div style="font-size:9px;color:#475569;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+nm+'</div>';
  if(edit){
    h+='<button onclick="deleteMansionFileEntry(\''+mansionId+'\',\''+f.id+'\')" style="position:absolute;top:-6px;right:-6px;background:#dc2626;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:1;padding:0">×</button>';
  }
  h+='</div>';
  return h;
}
window._mfFileThumbHTML=_mfFileThumbHTML;

// 一覧カード内の簡易ファイル表示（読み取り専用）
function _mfFilesDisplayHTML(mansionId){
  const m=_mansionMaster.find(x=>x.id===mansionId);
  if(!m)return '';
  const files=Array.isArray(m.files)?m.files:[];
  if(files.length===0)return '';
  let h='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">';
  files.forEach(f=>{
    if(f.type==='image'){
      h+='<img src="'+f.url+'" alt="'+_mfEsc(f.name)+'" onclick="event.stopPropagation();previewMansionImage(\''+f.url+'\',\''+_mfEsc(f.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")+'\')" style="width:34px;height:34px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;cursor:zoom-in" title="'+_mfEsc(f.name)+'">';
    }else{
      h+='<a href="'+f.url+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="'+_mfEsc(f.name)+'" style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background:#fee2e2;color:#991b1b;border-radius:4px;font-size:16px;text-decoration:none;border:1px solid #fecaca">📄</a>';
    }
  });
  h+='</div>';
  return h;
}
window._mfFilesDisplayHTML=_mfFilesDisplayHTML;

// 進行状況トースト
function _mfShowProgress(id,msg){
  let el=document.getElementById('mf-progress');
  if(!el){
    el=document.createElement('div');
    el.id='mf-progress';
    el.style.cssText='position:fixed;bottom:20px;right:20px;background:#1e3a5f;color:#fff;padding:10px 16px;border-radius:6px;font-size:12px;z-index:10002;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  el.dataset.pid=id;
  el.textContent='⏳ '+msg;
  el.style.display='block';
}
function _mfHideProgress(id){
  const el=document.getElementById('mf-progress');
  if(el&&el.dataset.pid===id)el.style.display='none';
}

function _mfEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

window.pickMansionFiles=pickMansionFiles;
window.uploadMansionFile=uploadMansionFile;
window.deleteMansionFileEntry=deleteMansionFileEntry;
window.previewMansionImage=previewMansionImage;
