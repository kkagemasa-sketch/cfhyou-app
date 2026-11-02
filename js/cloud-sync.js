// cloud-sync.js — クラウド同期（段階1: Googleログイン＋同期パネル＋合言葉）
//
// 仕組み（docs/superpowers/specs/2026-11-01-cloud-sync-design.md）
//   - 既存の Firebase（cfhyou-shared）に Google ログインを追加し、Firestore の users/{本人のID}/... だけを
//     本人が読み書きする。ログインしていなければ、アプリは今までどおり何も変わらない。
//   - お客様データは送る前にブラウザで暗号化（AES-GCM 256bit、鍵は合言葉から PBKDF2 で作る）。
//     Firebase には暗号文しか置かない。合言葉はサーバーに送らない。
//   - 合言葉は端末ごとに localStorage に保存し、次回から聞かない。鍵は端末のメモリ内だけ。
//
// Firestore の置き場所
//   users/{uid}/sync/meta      … {kdfSalt, check(合言葉検証用の暗号文), createdAt, updatedAt}
//   users/{uid}/slots/{id}     … 名前付き保存（段階2）
//   users/{uid}/sync/autosave  … 自動保存（段階3）
//
// 公開範囲: いまは本人のGoogleアカウントだけ（CS_ALLOWED_EMAILS）。メンバーにも開放するときは
//   この配列を空にし、Firestore ルールの「request.auth.token.email in [...]」の行を消す。

const CS_ALLOWED_EMAILS=['k.kagemasa@gmail.com','kgmkhmuk@gmail.com']; // 空＝全員OK
const CS_PASS_MIN=8;
const CS_KDF_ITER=200000;
const CS_CHECK_TEXT='cf-sync-ok';
const CS_LS_PASS='cf_sync_pass';   // この端末の合言葉
const CS_LS_ON='cf_cloud_sync_on'; // 「☁ 同期」ボタンを出す端末

const _cs={user:null,key:null,salt:null,metaExists:null,busy:false,lastError:'',
  // 段階2
  listCache:null,lastSyncAt:0,cloudCount:null,cloudError:''};

// ===== ボタンの表示 =====
// 本人専用の間は、URLに ?sync を付けて開いた端末だけボタンを出す（メンバーの画面には出ない）。
// Googleでログイン済みの端末では常に出す。
function _csButtonWanted(){
  try{
    if(location.search.indexOf('sync')>=0){localStorage.setItem(CS_LS_ON,'1');}
    if(localStorage.getItem(CS_LS_ON)==='1')return true;
  }catch(e){}
  return !!_cs.user;
}
function _csUpdateButton(){
  const b=document.getElementById('btn-cloud-sync');
  if(!b)return;
  b.style.display=_csButtonWanted()?'':'none';
  if(_cs.user){
    b.textContent=_cs.key?'☁ 同期中':'☁ 同期（合言葉）';
    b.title='クラウド同期: '+(_cs.user.email||'')+(_cs.key?'':'（合言葉が未設定）');
  }else{
    b.textContent='☁ 同期';
    b.title='クラウド同期（自分の端末どうしでCF表を共有）';
  }
}

// ===== 認証 =====
function _csIsGoogleUser(u){
  return !!(u&&!u.isAnonymous&&(u.providerData||[]).some(p=>p.providerId==='google.com'));
}
function _csEmailAllowed(email){
  if(!CS_ALLOWED_EMAILS.length)return true;
  return CS_ALLOWED_EMAILS.map(s=>s.toLowerCase()).includes(String(email||'').toLowerCase());
}
// firebase-init.js から、ログイン状態が変わるたびに呼ばれる
window._cloudSyncOnAuth=function(user){
  if(_csIsGoogleUser(user)){
    if(!_csEmailAllowed(user.email)){
      // 許可していないアカウント → すぐログアウトして、今までどおり匿名に戻す
      _cs.user=null;_cs.key=null;
      _csSignOutQuiet().then(()=>{
        alert('このGoogleアカウント（'+(user.email||'')+'）はクラウド同期の対象外です。\n今はアプリの持ち主だけが使える設定になっています。');
        _csUpdateButton();_csRerender();
      });
      return;
    }
    _cs.user=user;
    _csUpdateButton();
    // 合言葉がこの端末に保存されていれば、静かに鍵を作って確認する
    _csTryStoredPass()
      .then(async()=>{
        // クラウドが空かどうかを先に調べておく（空なら最初から「確認用」の欄を出す）
        if(!_cs.key&&_cs.metaExists===null){try{await _csLoadMeta();}catch(e){}}
        // 合言葉が通ったら、クラウドの件数も静かに調べておく（段階2）
        if(_cs.key){try{_cs.cloudCount=(await csListCloud(true)||[]).length;}catch(e){_cs.cloudError=_csErr(e);}}
      })
      .finally(()=>{_csUpdateButton();_csRerender();});
  }else{
    _cs.user=null;_cs.key=null;_cs.salt=null;_cs.metaExists=null;
    _cs.listCache=null;_cs.cloudCount=null;_cs.cloudError='';
    _csUpdateButton();_csRerender();
  }
};
window._cloudSyncOnRedirectError=function(e){
  _cs.lastError='Googleログインに失敗しました: '+((e&&e.message)||e);
  _csRerender();
};

async function csLogin(){
  const fb=window._firebase;
  if(!fb||!fb.GoogleAuthProvider){alert('Firebaseの準備ができていません。少し待ってからもう一度押してください。');return;}
  if(!navigator.onLine){alert('インターネットに接続されていません。接続してからログインしてください。');return;}
  const provider=new fb.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  _cs.busy=true;_cs.lastError='';_csRerender();
  try{
    // 画面の中で開いた場合（ホーム画面アプリ・ポップアップ禁止）はリダイレクト方式に切り替える
    const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
    if(standalone){
      await fb.signInWithRedirect(fb.auth,provider);
      return; // ページが切り替わる
    }
    await fb.signInWithPopup(fb.auth,provider);
    // 続きは _cloudSyncOnAuth で
  }catch(e){
    const code=(e&&e.code)||'';
    if(code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment'||code==='auth/cancelled-popup-request'){
      try{await fb.signInWithRedirect(fb.auth,provider);return;}catch(e2){e=e2;}
    }
    if(code==='auth/popup-closed-by-user'){_cs.lastError='';}
    else if(code==='auth/unauthorized-domain'){_cs.lastError='このURL（'+location.hostname+'）はFirebaseの承認済みドメインに入っていません。';}
    else{_cs.lastError='Googleログインに失敗しました: '+((e&&e.message)||e);}
  }finally{
    _cs.busy=false;_csRerender();
  }
}
async function _csSignOutQuiet(){
  const fb=window._firebase;
  try{await fb.signOut(fb.auth);}catch(e){}
  // マンション共有のために、今までどおり匿名で入り直す
  try{if(typeof window._firebaseAnonSignIn==='function')await window._firebaseAnonSignIn();}catch(e){}
}
async function csLogout(){
  if(!confirm('クラウド同期からログアウトしますか？\n\n端末内の保存データ（保存/読込・ファイル）はそのまま残ります。\nこの端末の合言葉も残します（忘れさせるには別のボタンを使ってください）。'))return;
  _cs.busy=true;_csRerender();
  await _csSignOutQuiet();
  _cs.user=null;_cs.key=null;_cs.salt=null;_cs.metaExists=null;_cs.busy=false;
  _csUpdateButton();_csRerender();
}

// ===== 暗号（WebCrypto） =====
function _csB64(bytes){let s='';const a=new Uint8Array(bytes);for(let i=0;i<a.length;i++)s+=String.fromCharCode(a[i]);return btoa(s);}
function _csUnb64(str){const s=atob(str);const a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a;}
async function _csDeriveKey(pass,saltBytes){
  const enc=new TextEncoder();
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:saltBytes,iterations:CS_KDF_ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function _csEncrypt(key,text){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(text));
  return {iv:_csB64(iv),ct:_csB64(ct)};
}
async function _csDecrypt(key,enc){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:_csUnb64(enc.iv)},key,_csUnb64(enc.ct));
  return new TextDecoder().decode(pt);
}
// 段階2以降で使う: オブジェクト ⇄ 暗号文
window._csEncryptObj=async function(obj){ if(!_cs.key)throw new Error('合言葉が未設定'); return _csEncrypt(_cs.key,JSON.stringify(obj)); };
window._csDecryptObj=async function(enc){ if(!_cs.key)throw new Error('合言葉が未設定'); return JSON.parse(await _csDecrypt(_cs.key,enc)); };
window._csState=function(){return {loggedIn:!!_cs.user,email:_cs.user?_cs.user.email:'',uid:_cs.user?_cs.user.uid:'',ready:!!(_cs.user&&_cs.key)};};

// ===== 合言葉（meta） =====
function _csMetaRef(){
  const fb=window._firebase;
  return fb.doc(fb.db,'users',_cs.user.uid,'sync','meta');
}
async function _csLoadMeta(){
  const fb=window._firebase;
  const snap=await fb.getDoc(_csMetaRef());
  _cs.metaExists=snap.exists();
  return snap.exists()?snap.data():null;
}
// 合言葉を設定/確認する。戻り値: 'ok' | 'wrong' | エラー文字列
async function _csApplyPass(pass,opts){
  opts=opts||{};
  if(!_cs.user)return 'ログインしていません';
  if(!pass||pass.length<CS_PASS_MIN)return '合言葉は'+CS_PASS_MIN+'文字以上にしてください';
  let meta;
  try{meta=await _csLoadMeta();}catch(e){return 'クラウドに接続できませんでした（'+((e&&e.message)||e)+'）';}
  if(meta&&meta.kdfSalt&&meta.check){
    const salt=_csUnb64(meta.kdfSalt);
    const key=await _csDeriveKey(pass,salt);
    try{
      const t=await _csDecrypt(key,meta.check);
      if(t!==CS_CHECK_TEXT)return 'wrong';
    }catch(e){return 'wrong';}
    _cs.key=key;_cs.salt=salt;
  }else{
    if(!opts.allowCreate)return 'create';
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const key=await _csDeriveKey(pass,salt);
    const check=await _csEncrypt(key,CS_CHECK_TEXT);
    const fb=window._firebase;
    try{
      await fb.setDoc(_csMetaRef(),{kdfSalt:_csB64(salt),check,createdAt:Date.now(),updatedAt:Date.now(),email:_cs.user.email||''});
    }catch(e){return 'クラウドに書き込めませんでした（'+((e&&e.message)||e)+'）';}
    _cs.key=key;_cs.salt=salt;_cs.metaExists=true;
  }
  try{localStorage.setItem(CS_LS_PASS,pass);}catch(e){}
  return 'ok';
}
async function _csTryStoredPass(){
  let pass='';
  try{pass=localStorage.getItem(CS_LS_PASS)||'';}catch(e){}
  if(!pass)return;
  const r=await _csApplyPass(pass,{allowCreate:false});
  if(r==='wrong'){
    // 別の端末で合言葉を変えた等 → この端末の保存は消して、次回聞き直す
    try{localStorage.removeItem(CS_LS_PASS);}catch(e){}
    _cs.lastError='この端末に保存していた合言葉が、クラウド側と合いません。合言葉を入れ直してください。';
  }else if(r==='create'){
    // クラウドが空（初めて）→ 保存していた合言葉でそのまま作る
    await _csApplyPass(pass,{allowCreate:true});
  }
}
async function csSubmitPass(){
  // ★ 入力欄は描き直しの前に両方読む（描き直すと確認用の欄が空に戻り、必ず「一致しません」になっていた）
  const inp=document.getElementById('cs-pass-input');
  const pass=(inp?inp.value:'').trim();
  const inp2=document.getElementById('cs-pass-input2');
  const pass2=inp2?inp2.value.trim():null; // 確認欄が無い画面なら null
  if(pass.length<CS_PASS_MIN){_csMsg('合言葉は'+CS_PASS_MIN+'文字以上にしてください','#dc2626');return;}
  _cs.busy=true;_csRerender();
  let r=await _csApplyPass(pass,{allowCreate:false});
  if(r==='create'){
    if(pass2===null){
      // 確認欄がまだ出ていなかった（クラウドが空だと分かったのが今）→ 確認欄を出して、もう一度押してもらう
      _cs.busy=false;_csRerender();
      _csMsg('クラウドにはまだ何もありません。確認のため、もう一度同じ合言葉を下の欄にも入れて押してください','#92400e');
      setTimeout(()=>{const e=document.getElementById('cs-pass-input2');if(e)e.focus();},60);
      return;
    }
    if(pass2!==pass){_cs.busy=false;_csRerender();_csMsg('確認用の合言葉が一致しません','#dc2626');return;}
    if(!confirm('クラウドにはまだ何もありません。\nこの合言葉で暗号化を始めます。\n\n合言葉を忘れるとクラウドのデータは読めなくなります（端末内の保存・ファイル保存は残ります）。\nよろしいですか？')){_cs.busy=false;_csRerender();return;}
    r=await _csApplyPass(pass,{allowCreate:true});
  }
  _cs.busy=false;
  if(r==='ok'){_cs.lastError='';_csUpdateButton();_csRerender();_csMsg('合言葉を確認しました。この端末で同期できます。','#16a34a');csRefreshCloudCount();}
  else if(r==='wrong'){_csRerender();_csMsg('合言葉が違います','#dc2626');}
  else{_csRerender();_csMsg(r,'#dc2626');}
}
function csForgetPass(){
  if(!confirm('この端末に保存している合言葉を消しますか？\n次に開いたとき、もう一度合言葉を聞きます。\nクラウドのデータは消えません。'))return;
  try{localStorage.removeItem(CS_LS_PASS);}catch(e){}
  _cs.key=null;_cs.listCache=null;_cs.cloudCount=null;_csUpdateButton();_csRerender();
}

// ===== 段階2: 名前付き保存のクラウド保存・一覧・取り込み =====
// Firestore: users/{uid}/slots/{s_＋名前をURL符号化} … {name, savedAt, updatedAt, enc(暗号文), bytes, pushedAt}
//            users/{uid}/sync/autosave             … 自動保存（同じ形。本格的な自動同期は段階3）
function _csReady(){return !!(_cs.user&&_cs.key);}
function _csSlotId(name){return 's_'+encodeURIComponent(name);}
function _csSlotsCol(){const fb=window._firebase;return fb.collection(fb.db,'users',_cs.user.uid,'slots');}
function _csSlotRef(name){const fb=window._firebase;return fb.doc(fb.db,'users',_cs.user.uid,'slots',_csSlotId(name));}
function _csAutosaveRef(){const fb=window._firebase;return fb.doc(fb.db,'users',_cs.user.uid,'sync','autosave');}
function _csErr(e){return (e&&e.message)||String(e);}
function _csInvalidateList(){_cs.listCache=null;}

// 1件をクラウドへ（暗号化して setDoc）。entry={name,savedAt,updatedAt,data}
async function _csPushEntry(ref,entry){
  const enc=await window._csEncryptObj(entry.data);
  const fb=window._firebase;
  await fb.setDoc(ref,{name:entry.name,savedAt:entry.savedAt||'',updatedAt:entry.updatedAt||Date.now(),enc,bytes:enc.length,pushedAt:Date.now()});
  _cs.lastSyncAt=Date.now();_csInvalidateList();
}
async function csPushSlot(entry){ if(!_csReady())return false; await _csPushEntry(_csSlotRef(entry.name),entry); return true; }

// クラウドの一覧（暗号文は含めない）。30秒だけ記憶して、保存/読込パネルを開くたびの通信を減らす
async function csListCloud(force){
  if(!_csReady())return null;
  if(!force&&_cs.listCache&&Date.now()-_cs.listCache.at<30000)return _cs.listCache.list;
  const fb=window._firebase;
  const snap=await fb.getDocs(_csSlotsCol());
  const list=[];
  snap.forEach(d=>{const v=d.data()||{};list.push({id:d.id,name:v.name||decodeURIComponent(d.id.replace(/^s_/,'')),savedAt:v.savedAt||'',updatedAt:v.updatedAt||0,bytes:v.bytes||0});});
  list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  _cs.listCache={at:Date.now(),list};_cs.lastSyncAt=Date.now();_cs.cloudError='';
  return list;
}
// 保存/読込パネル用: 失敗しても止めない（null を返し、理由は _cs.cloudError に残す）
async function csListCloudSafe(){
  if(!_csReady())return null;
  try{return await csListCloud();}catch(e){_cs.cloudError=_csErr(e);return null;}
}
// 1件をクラウドから取得して復号。無ければ null
async function csFetchSlot(name){
  const fb=window._firebase;
  const snap=await fb.getDoc(_csSlotRef(name));
  if(!snap.exists())return null;
  const v=snap.data();
  const data=await window._csDecryptObj(v.enc);
  return {name:v.name||name,savedAt:v.savedAt||'',updatedAt:v.updatedAt||0,data};
}
async function csDeleteCloudSlot(name){const fb=window._firebase;await fb.deleteDoc(_csSlotRef(name));_csInvalidateList();}

// 保存/読込の「保存」のあとに呼ばれる（save-load.js）。端末内の保存は済んでいるので、失敗しても止めない
async function csAfterLocalSave(entry){
  if(!_csReady())return {ok:false,skipped:true};
  try{await csPushSlot(entry);return {ok:true};}
  catch(e){_cs.cloudError=_csErr(e);return {ok:false,msg:'クラウドへの保存に失敗しました（端末内には保存済み）: '+_csErr(e)};}
}
// 保存/読込の「☁ 取り込む」: クラウド版を端末内の保存に取り込んでから、いつもの読込へ
async function csPullSlot(name){
  if(!_csReady()){alert('クラウド同期の準備ができていません（☁ 同期 でログインと合言葉を確認してください）');return;}
  let cloud;
  try{cloud=await csFetchSlot(name);}
  catch(e){alert('クラウドから取り込めませんでした: '+_csErr(e)+'\n（合言葉が違う場合は ☁ 同期 から入れ直してください）');return;}
  if(!cloud){alert('クラウドに「'+name+'」が見つかりません');return;}
  const local=await dbGet(name);
  if(local&&(local.updatedAt||0)>(cloud.updatedAt||0)){
    if(!confirm('この端末の「'+name+'」（'+_fmtDate(local.updatedAt)+'）の方が、クラウド（'+_fmtDate(cloud.updatedAt)+'）より新しいです。\nクラウド版で端末内の保存を置き換えますか？'))return;
  }
  await dbPut({name:cloud.name,savedAt:cloud.savedAt||_fmtDate(new Date()),updatedAt:cloud.updatedAt||Date.now(),data:cloud.data});
  await loadSlot(name);
}
// 端末内の「↑ 送る」: 端末内の1件をクラウドへ（クラウドの方が新しければ確認）
async function csPushSlotByName(name){
  if(!_csReady()){alert('クラウド同期の準備ができていません');return;}
  const local=await dbGet(name);
  if(!local){alert('データが見つかりません');return;}
  let list=[];try{list=await csListCloud(true)||[];}catch(e){}
  const c=list.find(x=>x.name===name);
  if(c&&(c.updatedAt||0)>(local.updatedAt||0)){
    if(!confirm('クラウドの「'+name+'」（'+_fmtDate(c.updatedAt)+'）の方が、この端末（'+_fmtDate(local.updatedAt)+'）より新しいです。\nこの端末の内容でクラウドを上書きしますか？'))return;
  }
  try{await csPushSlot(local);}catch(e){alert('クラウドへ送れませんでした: '+_csErr(e));return;}
  await openSlotPanel();
}

// 「この端末の保存データをすべてクラウドへ送る」（端末ごとに1回。端末内は消さない）
function _csOldName(name,ts,taken){
  const d=new Date(ts||Date.now());
  const mmdd=String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');
  let n=name+' ＿旧・'+mmdd;
  if(taken.has(n))n+=' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  let i=2;const base=n;while(taken.has(n)){n=base+'('+(i++)+')';}
  taken.add(n);return n;
}
async function csMigrateAll(){
  if(!_csReady()){_csMsg('先にログインと合言葉の確認をしてください','#dc2626');return;}
  let slots,auto;
  try{slots=await dbGetAll();auto=await dbGet(AUTOSAVE_KEY);}
  catch(e){_csMsg('この端末の保存データを読めませんでした: '+_csErr(e),'#dc2626');return;}
  if(slots.length===0&&!auto){_csMsg('この端末には送る保存データがありません','#92400e');return;}
  if(!confirm('この端末の保存データ '+slots.length+'件'+(auto?'と自動保存':'')+' をクラウドへ送ります。\n\n'
    +'・端末内のデータは消しません（そのまま残ります）\n'
    +'・同じ名前がクラウドにある場合は新しい方を優先し、古い方は「名前 ＿旧・月/日」の名前で残します\n'
    +'・件数が多いと少し時間がかかります\n\nよろしいですか？'))return;
  _cs.busy=true;_csRerender();_csMsg('送っています… 0/'+slots.length,'#1e40af');
  const res={added:0,updated:0,same:0,kept:0,auto:'',err:[]};
  try{
    const cloud=await csListCloud(true)||[];
    const taken=new Set(cloud.map(c=>c.name));
    let i=0;
    for(const s of slots){
      i++;_csMsg('送っています… '+i+'/'+slots.length+'「'+s.name+'」','#1e40af');
      try{
        const c=cloud.find(x=>x.name===s.name);
        if(!c){await csPushSlot(s);res.added++;taken.add(s.name);}
        else if((c.updatedAt||0)===(s.updatedAt||0)){res.same++;}
        else if((c.updatedAt||0)>(s.updatedAt||0)){
          // クラウドの方が新しい → 端末のものを「＿旧」で別名保存
          const old=_csOldName(s.name,s.updatedAt,taken);
          await csPushSlot({...s,name:old});res.kept++;
        }else{
          // 端末の方が新しい → クラウドの古い方を「＿旧」に退避してから、端末のもので更新
          const oldEntry=await csFetchSlot(s.name);
          if(oldEntry){const old=_csOldName(s.name,oldEntry.updatedAt,taken);await csPushSlot({...oldEntry,name:old});res.kept++;}
          await csPushSlot(s);res.updated++;
        }
      }catch(e){res.err.push(s.name+': '+_csErr(e));}
    }
    if(auto){
      try{
        const fb=window._firebase;
        const snap=await fb.getDoc(_csAutosaveRef());
        const cu=snap.exists()?(snap.data().updatedAt||0):0;
        if(!snap.exists()||(auto.updatedAt||0)>cu){await _csPushEntry(_csAutosaveRef(),{...auto,name:'autosave'});res.auto='自動保存をクラウドの自動保存にしました';}
        else if((auto.updatedAt||0)===cu){res.auto='自動保存はクラウドと同じでした';}
        else{
          const d=new Date(auto.updatedAt||Date.now());
          const label='自動保存（'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+'）';
          const nm=taken.has(label)?_csOldName(label,auto.updatedAt,taken):label;taken.add(nm);
          await csPushSlot({...auto,name:nm});res.auto='自動保存はクラウドの方が新しかったので「'+nm+'」の名前で残しました';
        }
      }catch(e){res.err.push('自動保存: '+_csErr(e));}
    }
  }catch(e){res.err.push(_csErr(e));}
  _cs.busy=false;_csInvalidateList();
  try{_cs.cloudCount=(await csListCloud(true)||[]).length;}catch(e){}
  _csRerender();
  const lines=['送り終わりました。','新しく追加: '+res.added+'件','クラウドを更新: '+res.updated+'件','同じだった: '+res.same+'件','「＿旧」で残した: '+res.kept+'件'];
  if(res.auto)lines.push(res.auto);
  if(res.err.length)lines.push('失敗: '+res.err.length+'件\n'+res.err.join('\n'));
  lines.push('\n端末内のデータはそのまま残っています。');
  alert(lines.join('\n'));
  _csMsg(res.err.length?'一部送れませんでした（詳細は上のメッセージ）':'すべて送りました','#16a34a');
}
async function csRefreshCloudCount(){
  if(!_csReady())return;
  try{_cs.cloudCount=(await csListCloud(true)||[]).length;_cs.cloudError='';}
  catch(e){_cs.cloudError=_csErr(e);}
  _csRerender();
}

// ===== 同期パネル =====
function _csMsg(text,color){
  const el=document.getElementById('cs-msg');
  if(el){el.textContent=text;el.style.color=color||'#64748b';}
}
function _csRerender(){
  if(document.getElementById('cloud-sync-modal'))openCloudSyncPanel(true);
}
function openCloudSyncPanel(keepMsg){
  const prevMsg=keepMsg?document.getElementById('cs-msg'):null;
  const prevMsgText=prevMsg?prevMsg.textContent:'';const prevMsgColor=prevMsg?prevMsg.style.color:'';
  const prevPass=keepMsg?(document.getElementById('cs-pass-input')||{}).value||'':'';
  const prevPass2=keepMsg?(document.getElementById('cs-pass-input2')||{}).value||'':'';
  document.getElementById('cloud-sync-modal')?.remove();
  const btn=(label,fn,bg,color,border)=>`<button onclick="${fn}" ${_cs.busy?'disabled':''} style="font-size:12px;padding:7px 16px;background:${bg};color:${color};border:1px solid ${border};border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;${_cs.busy?'opacity:.5':''}">${label}</button>`;
  let body='';
  if(!_cs.user){
    body+=`
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;letter-spacing:.04em">ログイン</div>
        <div style="font-size:12px;color:#334155;line-height:1.6;margin-bottom:10px">自分のパソコン・iPad・iPhoneのあいだでCF表を共有するには、同じGoogleアカウントでログインします。<br>ログインしなくても、今までどおりこの端末だけで使えます。</div>
        ${btn(_cs.busy?'ログイン中…':'Googleでログイン','csLogin()','#1e3a5f','#fff','#1e3a5f')}
      </div>`;
  }else{
    body+=`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="min-width:0">
          <div style="font-size:11px;font-weight:700;color:#166534;letter-spacing:.04em">ログイン中</div>
          <div style="font-size:12px;color:#14532d;word-break:break-all">${_cs.user.email||''}</div>
        </div>
        ${btn('ログアウト','csLogout()','#fff','#64748b','#cbd5e1')}
      </div>`;
    if(_cs.key){
      body+=`
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px;letter-spacing:.04em">合言葉</div>
        <div style="font-size:12px;color:#16a34a;font-weight:700;margin-bottom:8px">✓ この端末に設定済み（データは暗号化して送ります）</div>
        <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">他の端末でも同じ合言葉を入れると、同じデータが見えます。</div>
        ${btn('この端末の合言葉を忘れさせる','csForgetPass()','#fff','#92400e','#fed7aa')}
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#1e40af;margin-bottom:6px;letter-spacing:.04em">同期</div>
        <div style="font-size:12px;color:#1e3a5f;line-height:1.6;margin-bottom:8px">
          クラウドの保存データ: <b>${_cs.cloudCount==null?'（未確認）':_cs.cloudCount+'件'}</b>
          ${_cs.lastSyncAt?'<span style="color:#64748b">（最終確認 '+_fmtDate(_cs.lastSyncAt)+'）</span>':''}
          ${_cs.cloudError?'<div style="color:#dc2626;font-size:11px">クラウドに接続できません: '+_cs.cloudError+'</div>':''}
        </div>
        <div style="font-size:11px;color:#475569;line-height:1.6;margin-bottom:10px">「保存/読込」で名前を付けて保存すると、端末内とクラウドの両方に保存されます。保存一覧には「☁ 新しい版あり」「☁ クラウドのみ」が出て、取り込めます。</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${btn('クラウドの件数を確認','csRefreshCloudCount()','#fff','#1e40af','#bfdbfe')}
          ${btn('保存/読込を開く','document.getElementById(\'cloud-sync-modal\').remove();openSlotPanel()','#fff','#1e3a5f','#cbd5e1')}
        </div>
      </div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:6px;letter-spacing:.04em">今までのデータを移す（端末ごとに1回）</div>
        <div style="font-size:11px;color:#78350f;line-height:1.6;margin-bottom:10px">この端末に保存してある全データと自動保存を、暗号化してクラウドへ送ります。端末内のデータは消しません。同じ名前がクラウドにある場合は新しい方を優先し、古い方は「名前 ＿旧・月/日」で残します。</div>
        ${btn(_cs.busy?'送っています…':'この端末の保存データをすべてクラウドへ送る','csMigrateAll()','#92400e','#fff','#92400e')}
      </div>`;
    }else{
      const creating=_cs.metaExists===false;
      body+=`
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:6px;letter-spacing:.04em">同期の合言葉</div>
        <div style="font-size:12px;color:#78350f;line-height:1.6;margin-bottom:10px">${creating
          ?'クラウドにはまだ何もありません。暗号化に使う合言葉を決めてください（'+CS_PASS_MIN+'文字以上）。<br><b>忘れるとクラウドのデータは読めなくなります。</b>端末内の保存とファイル保存は残ります。'
          :'クラウドのデータを読むための合言葉を入れてください（'+CS_PASS_MIN+'文字以上）。他の端末で決めたものと同じです。'}</div>
        <input id="cs-pass-input" type="password" value="${prevPass.replace(/"/g,'&quot;')}" placeholder="合言葉（${CS_PASS_MIN}文字以上）" autocomplete="off"
          style="width:100%;box-sizing:border-box;font-size:13px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:7px;font-family:inherit;outline:none;margin-bottom:8px"
          onkeydown="if(event.key==='Enter')csSubmitPass()">
        ${creating?`<input id="cs-pass-input2" type="password" value="${prevPass2.replace(/"/g,'&quot;')}" placeholder="もう一度（確認）" autocomplete="off"
          style="width:100%;box-sizing:border-box;font-size:13px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:7px;font-family:inherit;outline:none;margin-bottom:8px"
          onkeydown="if(event.key==='Enter')csSubmitPass()">`:''}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${btn(_cs.busy?'確認中…':(creating?'この合言葉で始める':'合言葉を確認'),'csSubmitPass()','#1e3a5f','#fff','#1e3a5f')}
          <label style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" onchange="['cs-pass-input','cs-pass-input2'].forEach(id=>{const e=document.getElementById(id);if(e)e.type=this.checked?'text':'password'})">表示する</label>
        </div>
      </div>`;
    }
  }
  const modal=document.createElement('div');
  modal.id='cloud-sync-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:24px;width:440px;max-width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:15px;color:#1e3a5f">☁ クラウド同期</div>
        <button onclick="document.getElementById('cloud-sync-modal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px" title="閉じる">✕</button>
      </div>
      ${body}
      <div id="cs-msg" style="font-size:12px;min-height:16px;color:${prevMsgColor||'#64748b'}">${prevMsgText||(_cs.lastError||'')}</div>
      <div style="font-size:10px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:10px">データは送る前にこの端末で暗号化します。合言葉はクラウドに送りません。保存場所はFirebase（東京リージョン）です。</div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
  if(_cs.lastError&&!prevMsgText){const m=document.getElementById('cs-msg');if(m)m.style.color='#dc2626';}
  if(!keepMsg)setTimeout(()=>{const inp=document.getElementById('cs-pass-input');if(inp)inp.focus();},60);
}

// 起動時: ボタンの表示だけ決める（ログイン状態は firebase-init からの通知で反映）
(function(){
  function init(){_csUpdateButton();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
