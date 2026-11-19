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
// 公開範囲（v660〜）: 管理者（CS_ADMIN_EMAILS）と、管理者が「利用者管理」で登録した利用者だけ（role: 'team' チーム / 'external' 外部）。
//   メンバー名簿は Firestore の syncMembers/{メールアドレス小文字} … {email,name,active,addedAt,updatedAt}
//   名簿の読み書きは管理者だけ。メンバーは自分の1件だけ読める（Firestore ルールで守る）。
//   メンバーを消すことはせず「停止」にする（active:false）。停止中の人はログインしても使えない。

const CS_ADMIN_EMAILS=['k.kagemasa@gmail.com','kgmkhmuk@gmail.com']; // 管理者（メンバー管理ができる人）
const CS_PASS_MIN=8;
const CS_KDF_ITER=200000;
const CS_CHECK_TEXT='cf-sync-ok';
const CS_LS_PASS='cf_sync_pass';   // この端末の合言葉
const CS_LS_ON='cf_cloud_sync_on'; // 「☁ 同期」ボタンを出す端末

const _cs={user:null,key:null,salt:null,metaExists:null,busy:false,lastError:'',
  // 段階2
  listCache:null,lastSyncAt:0,cloudCount:null,cloudError:'',detailsOpen:false,isAdmin:false,
  // v659: 目次（null＝まだ読んでいない）
  index:null,autoParts:null};

// ===== ボタンの表示 =====
// 本人専用の間は、URLに ?sync を付けて開いた端末だけボタンを出す（メンバーの画面には出ない）。
// Googleでログイン済みの端末では常に出す。
// v660: 「☁ 同期」ボタンは全員の画面に出す（使えるのは登録されたメンバーだけ）
function _csButtonWanted(){return true;}
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
function _csEmailKey(email){return String(email||'').trim().toLowerCase();}
function _csIsAdmin(email){return CS_ADMIN_EMAILS.map(_csEmailKey).includes(_csEmailKey(email));}
function _csMemberRef(email){const fb=window._firebase;return fb.doc(fb.db,'syncMembers',_csEmailKey(email));}
// 管理者なら {ok:true, role:'team'}。それ以外は名簿に「使用中」で載っていれば {ok:true, role:'team'|'external'}。
// 読めない（未登録・ルールで拒否）なら {ok:false}
async function _csIsMember(email){
  if(_csIsAdmin(email))return {ok:true,role:'team'};
  try{
    const snap=await window._firebase.getDoc(_csMemberRef(email));
    if(!snap.exists())return {ok:false};
    const v=snap.data()||{};
    return v.active!==false?{ok:true,role:v.role==='external'?'external':'team'}:{ok:false};
  }catch(e){
    // 名簿を読む権利が無い＝未登録（ルールで拒否）。通信の失敗など、それ以外は追い出さない
    //（クラウドのデータそのものは Firestore ルールで守られているので、ここで通しても他人のデータは読めない）
    const code=String((e&&e.code)||'');
    if(code==='permission-denied'||/permission/i.test(String(e&&e.message)))return {ok:false};
    // 通信できないときは、前回この端末で確認した役割を使う（無ければチーム扱い。データはルールで守られている）
    let role='team';try{const g=JSON.parse(localStorage.getItem('cf-gate-role')||'null');if(g&&g.email===_csEmailKey(email))role=g.role;}catch(e2){}
    return {ok:true,role};
  }
}
// firebase-init.js から、ログイン状態が変わるたびに呼ばれる
window._cloudSyncOnAuth=function(user){
  if(_csIsGoogleUser(user)){
    _csOnGoogleUser(user);
  }else{
    _cs.user=null;_cs.key=null;_cs.salt=null;_cs.metaExists=null;_cs.isAdmin=false;_cs.role=null;
    _cs.listCache=null;_cs.cloudCount=null;_cs.cloudError='';_cs.index=null;_cs.autoParts=null;
    _csUpdateButton();_csRerender();
    // Googleでログインしていない（匿名だけ）→ 入口を出す
    if(typeof window._gateOnNoUser==='function')window._gateOnNoUser();
  }
};
async function _csOnGoogleUser(user){
  {
    // v660: 管理者か、名簿に登録された（停止中でない）メンバーだけ使える
    const mem=await _csIsMember(user.email);
    if(!mem.ok){
      // 登録されていないアカウント → すぐログアウトして、入口に案内を出す
      _cs.user=null;_cs.key=null;
      _csSignOutQuiet().then(()=>{
        if(typeof window._gateOnNotMember==='function')window._gateOnNotMember(user.email);
        else alert('このGoogleアカウント（'+(user.email||'')+'）は、まだ利用者として登録されていません（または停止中です）。\n\nアプリの管理者に、このメールアドレスの登録を頼んでください。');
        _csUpdateButton();_csRerender();
      });
      return;
    }
    _cs.isAdmin=_csIsAdmin(user.email);
    _cs.role=mem.role;
    try{localStorage.setItem('cf-gate-role',JSON.stringify({email:_csEmailKey(user.email),role:mem.role}));}catch(e){}
    _cs.user=user;
    if(typeof window._gateOnMember==='function')window._gateOnMember(user,mem.role);
    _csUpdateButton();
    // 合言葉がこの端末に保存されていれば、静かに鍵を作って確認する
    _csTryStoredPass()
      .then(async()=>{
        // クラウドが空かどうかを先に調べておく（空なら最初から「確認用」の欄を出す）
        if(!_cs.key&&_cs.metaExists===null){try{await _csLoadMeta();}catch(e){}}
        // 合言葉が通ったら、クラウドの件数も静かに調べておく（段階2）
        if(_cs.key){try{_cs.cloudCount=(await csListCloud(true)||[]).length;}catch(e){_cs.cloudError=_csErr(e);}}
        if(_cs.key)_csAutoStart(); // 段階3: 自動保存の同期を始める（他端末の編集があれば確認）
      })
      .finally(()=>{_csUpdateButton();_csRerender();});
  }
}
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
    // iPhone/iPad のホーム画面アプリだけリダイレクト方式（ポップアップが戻ってこられない）。
    // PC にインストールしたアプリ（Edge/Chrome）はポップアップが使えるので、ブラウザと同じ方式にする(v647)。
    // ※ リダイレクト方式は最近のブラウザでは結果を受け取れないことが多いので、使う場面を最小にする
    const standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
    if(standalone&&ios){
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
    if(typeof window._gateOnLoginError==='function')window._gateOnLoginError(_cs.lastError);
  }
}
async function _csSignOutQuiet(){
  const fb=window._firebase;
  try{await fb.signOut(fb.auth);}catch(e){}
  // マンション共有のために、今までどおり匿名で入り直す
  try{if(typeof window._firebaseAnonSignIn==='function')await window._firebaseAnonSignIn();}catch(e){}
}
async function csLogout(){
  if(!confirm('ログアウトしますか？\n\n・アプリをまた使うときは、もう一度Googleでログインします\n・端末内の保存データ（保存/読込・ファイル）はそのまま残ります\n・この端末の合言葉も残します（忘れさせるには別のボタンを使ってください）'))return;
  _cs.busy=true;_csRerender();
  await _csSignOutQuiet();
  _cs.user=null;_cs.key=null;_cs.salt=null;_cs.metaExists=null;_cs.busy=false;_cs.isAdmin=false;
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
// ★ v648: 大きいデータ対策。送る前に gzip 圧縮してから暗号化する（enc.z=1）。
//   圧縮できないブラウザでは従来どおり（z なし）。受け取り側は z の有無で切り替えるので、v647以前に送った分もそのまま読める
async function _csGzip(bytes){
  const cs=new CompressionStream('gzip');const w=cs.writable.getWriter();w.write(bytes);w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function _csGunzip(bytes){
  const ds=new DecompressionStream('gzip');const w=ds.writable.getWriter();w.write(bytes);w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
async function _csEncryptBytes(key,bytes){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);
  return {iv:_csB64(iv),ct:_csB64(ct)};
}
// 段階2以降で使う: オブジェクト ⇄ 暗号文
window._csEncryptObj=async function(obj){
  if(!_cs.key)throw new Error('合言葉が未設定');
  const raw=new TextEncoder().encode(JSON.stringify(obj));
  if(typeof CompressionStream==='function'){
    try{const z=await _csGzip(raw);const e=await _csEncryptBytes(_cs.key,z);e.z=1;e.raw=raw.length;return e;}catch(err){}
  }
  return _csEncrypt(_cs.key,JSON.stringify(obj));
};
window._csDecryptObj=async function(enc){
  if(!_cs.key)throw new Error('合言葉が未設定');
  if(enc&&enc.z){
    const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:_csUnb64(enc.iv)},_cs.key,_csUnb64(enc.ct));
    const raw=await _csGunzip(new Uint8Array(pt));
    return JSON.parse(new TextDecoder().decode(raw));
  }
  return JSON.parse(await _csDecrypt(_cs.key,enc));
};
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
    const agree=document.getElementById('cs-pass-agree');
    if(!agree||!agree.checked){_cs.busy=false;_csRerender();_csMsg('「合言葉を忘れると戻せない」ことを確認して、チェックを入れてください','#dc2626');return;}
    if(!confirm('クラウドにはまだ何もありません。\nこの合言葉で暗号化を始めます。\n\n合言葉を忘れるとクラウドのデータは読めなくなります（端末内の保存・ファイル保存は残ります）。\nよろしいですか？')){_cs.busy=false;_csRerender();return;}
    r=await _csApplyPass(pass,{allowCreate:true});
  }
  _cs.busy=false;
  if(r==='ok'){_cs.lastError='';_csUpdateButton();_csRerender();_csMsg('合言葉を確認しました。この端末で同期できます。','#16a34a');csRefreshCloudCount();_csAutoStart();}
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

// ===== v659: 「目次」（通信量を減らすため） =====
// 以前は一覧・件数・1分ごとの確認・送る前に、暗号文の本体ごとダウンロードしていた（通信量が多い）。
// 名前・日付・大きさ・分割数だけの小さな目次を別に置き、ふだんは目次だけを読む。本体は取り込むときだけ読む。
//   users/{uid}/sync/index    … {v:1, slots:{[slotId]:{name,savedAt,updatedAt,bytes,parts,pushedAt}}, builtAt}
//   users/{uid}/sync/autohead … 自動保存の目次 {updatedAt,savedAt,device,pushedAt,bytes,parts}
// 目次が無いとき（最初の1回・v658以前のデータ）は、本体を1回だけ読んで目次を作る。
function _csIndexRef(){const fb=window._firebase;return fb.doc(fb.db,'users',_cs.user.uid,'sync','index');}
function _csAutoHeadRef(){const fb=window._firebase;return fb.doc(fb.db,'users',_cs.user.uid,'sync','autohead');}
function _csEntryMeta(v){
  const e=(v&&v.enc)||{};
  return {name:v.name||'',savedAt:v.savedAt||'',updatedAt:v.updatedAt||0,bytes:v.bytes||0,parts:e.parts||0,pushedAt:v.pushedAt||0};
}
// 本体を全部読んで目次を作り直す（目次が無いとき・「一覧を作り直す」のときだけ）
async function _csRebuildIndex(){
  const fb=window._firebase;
  const snap=await fb.getDocs(_csSlotsCol());
  const slots={};
  snap.forEach(d=>{const v=d.data()||{};const m=_csEntryMeta(v);if(!m.name)m.name=decodeURIComponent(d.id.replace(/^s_/,''));slots[d.id]=m;});
  await fb.setDoc(_csIndexRef(),{v:1,slots,builtAt:Date.now()});
  _cs.index=slots;
  return slots;
}
// 目次を読む（無ければ作る）。_cs.index に記憶する
async function _csLoadIndex(){
  const fb=window._firebase;
  const snap=await fb.getDoc(_csIndexRef());
  if(!snap.exists())return await _csRebuildIndex();
  _cs.index=(snap.data()||{}).slots||{};
  return _cs.index;
}
async function _csIndexPut(id,meta){
  const fb=window._firebase;
  await fb.setDoc(_csIndexRef(),{v:1,slots:{[id]:meta}},{merge:true});
  if(_cs.index)_cs.index[id]=meta;
}
async function _csIndexRemove(id){
  const fb=window._firebase;
  await fb.setDoc(_csIndexRef(),{slots:{[id]:fb.deleteField()}},{merge:true});
  if(_cs.index)delete _cs.index[id];
}
// 自動保存の目次を読む。無ければ（v658以前）本体を1回だけ読んで目次を作る。どちらも無ければ null
async function _csReadAutoHead(){
  const fb=window._firebase;
  const h=await fb.getDoc(_csAutoHeadRef());
  if(h.exists()){const v=h.data()||{};_cs.autoParts=v.parts||0;return v;}
  const b=await fb.getDoc(_csAutosaveRef());
  if(!b.exists()){_cs.autoParts=0;return null;}
  const bv=b.data()||{};
  const head=Object.assign(_csEntryMeta(bv),{device:bv.device||''});
  delete head.name;
  try{await fb.setDoc(_csAutoHeadRef(),head);}catch(e){}
  _cs.autoParts=head.parts||0;
  return head;
}

// 1件をクラウドへ（暗号化して setDoc）。entry={name,savedAt,updatedAt,data}
// ★ v648: Firestore は1件あたり約1MBまで。暗号文が CS_PART_SIZE 文字を超えるときは
//   本体には {iv, z, parts:n} だけ置き、暗号文を ref/parts/0..n-1 に分けて置く（受け取り時につなぐ）
// ★ v659: 前の版の分割数は目次から知る（本体を読み直さない）。送ったあと目次も書く
//   kind: 'slot'（名前付き保存）/'auto'（自動保存）
const CS_PART_SIZE=700000;
function _csPartsCol(ref){const fb=window._firebase;return fb.collection(ref,'parts');}
async function _csPushEntry(ref,entry,extra,kind){
  const enc=await window._csEncryptObj(entry.data);
  const fb=window._firebase;
  // ★ enc は {iv, ct} の形。enc.length は undefined になり Firestore が「Unsupported field value: undefined」で拒否していた(v644)
  const bytes=((enc&&enc.ct)||'').length+((enc&&enc.iv)||'').length;
  // 前の版が分割されていたら、その数を覚えておいて余った分を後で消す（数は目次から）
  let oldParts=0;
  try{
    if(kind==='auto'){
      if(_cs.autoParts==null)await _csReadAutoHead();
      oldParts=_cs.autoParts||0;
    }else{
      if(!_cs.index)await _csLoadIndex();
      const m=_cs.index&&_cs.index[ref.id];oldParts=(m&&m.parts)||0;
    }
  }catch(e){}
  let meta;
  if(enc.ct.length>CS_PART_SIZE){
    const ct=enc.ct;const n=Math.ceil(ct.length/CS_PART_SIZE);
    for(let i=0;i<n;i++){
      await fb.setDoc(fb.doc(_csPartsCol(ref),String(i)),{i,ct:ct.slice(i*CS_PART_SIZE,(i+1)*CS_PART_SIZE)});
    }
    meta={iv:enc.iv,parts:n};if(enc.z)meta.z=1;
  }else{
    meta=enc;
  }
  const body=Object.assign({name:entry.name,savedAt:entry.savedAt||'',updatedAt:entry.updatedAt||Date.now(),enc:meta,bytes,pushedAt:Date.now()},extra||{});
  await fb.setDoc(ref,body);
  const newParts=meta.parts||0;
  for(let i=newParts;i<oldParts;i++){try{await fb.deleteDoc(fb.doc(_csPartsCol(ref),String(i)));}catch(e){}}
  // 本体を書いてから目次を書く（他の端末は目次を見て本体を取りに来るので、この順番）
  if(kind==='auto'){
    const head=Object.assign(_csEntryMeta(body),{device:body.device||''});delete head.name;
    await fb.setDoc(_csAutoHeadRef(),head);
    _cs.autoParts=newParts;
  }else{
    await _csIndexPut(ref.id,_csEntryMeta(body));
  }
  _cs.lastSyncAt=Date.now();_csInvalidateList();
}
// 本体の enc が分割形式なら parts を集めて 1つの暗号文に戻す
async function _csResolveEnc(ref,enc){
  if(!enc||!enc.parts)return enc;
  const fb=window._firebase;
  const parts=[];
  for(let i=0;i<enc.parts;i++){
    const s=await fb.getDoc(fb.doc(_csPartsCol(ref),String(i)));
    if(!s.exists())throw new Error('クラウドのデータが欠けています（分割 '+(i+1)+'/'+enc.parts+'）');
    parts.push((s.data()||{}).ct||'');
  }
  const out={iv:enc.iv,ct:parts.join('')};if(enc.z)out.z=1;
  return out;
}
// 名前付き保存を消す（分割数は目次から。目次に無ければ本体を読んで確かめる）。目次からも消す
async function _csDeleteDoc(ref){
  const fb=window._firebase;
  let n=null;
  try{if(!_cs.index)await _csLoadIndex();const m=_cs.index&&_cs.index[ref.id];if(m)n=m.parts||0;}catch(e){}
  if(n===null){n=0;try{const s=await fb.getDoc(ref);if(s.exists()){const e=(s.data()||{}).enc;n=(e&&e.parts)||0;}}catch(e){}}
  for(let i=0;i<n;i++){try{await fb.deleteDoc(fb.doc(_csPartsCol(ref),String(i)));}catch(e){}}
  await fb.deleteDoc(ref);
  await _csIndexRemove(ref.id);
}
async function csPushSlot(entry){ if(!_csReady())return false; await _csPushEntry(_csSlotRef(entry.name),entry,null,'slot'); return true; }

// クラウドの一覧（暗号文は含めない）。v659: 目次1件だけを読む。30秒だけ記憶する
//   rebuild=true のときは本体を全部読んで目次を作り直す（「一覧を作り直す」ボタン）
async function csListCloud(force,rebuild){
  if(!_csReady())return null;
  if(!force&&!rebuild&&_cs.listCache&&Date.now()-_cs.listCache.at<30000)return _cs.listCache.list;
  const slots=rebuild?await _csRebuildIndex():await _csLoadIndex();
  const list=[];
  Object.keys(slots).forEach(id=>{const v=slots[id]||{};list.push({id,name:v.name||decodeURIComponent(id.replace(/^s_/,'')),savedAt:v.savedAt||'',updatedAt:v.updatedAt||0,bytes:v.bytes||0});});
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
  const data=await window._csDecryptObj(await _csResolveEnc(_csSlotRef(name),v.enc));
  return {name:v.name||name,savedAt:v.savedAt||'',updatedAt:v.updatedAt||0,data};
}
async function csDeleteCloudSlot(name){await _csDeleteDoc(_csSlotRef(name));_csInvalidateList();}

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
  catch(e){alert('クラウドから取り出せませんでした: '+_csErr(e)+'\n（合言葉が違う場合は ☁ 同期 から入れ直してください）');return;}
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
  try{await csPushSlot(local);}catch(e){alert('クラウドに保存できませんでした: '+_csErr(e));return;}
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
  if(slots.length===0&&!auto){_csMsg('この端末には保存データがありません','#92400e');return;}
  if(!confirm('この端末の保存データ '+slots.length+'件'+(auto?'と自動保存':'')+' をクラウドに保存します。\n\n'
    +'・端末内のデータは消しません（そのまま残ります）\n'
    +'・同じ名前がクラウドにある場合は新しい方を優先し、古い方は「名前 ＿旧・月/日」の名前で残します\n'
    +'・件数が多いと少し時間がかかります\n\nよろしいですか？'))return;
  _cs.busy=true;_csRerender();_csMsg('クラウドに保存しています… 0/'+slots.length,'#1e40af');
  const res={added:0,updated:0,same:0,kept:0,auto:'',err:[]};
  try{
    const cloud=await csListCloud(true)||[];
    const taken=new Set(cloud.map(c=>c.name));
    let i=0;
    for(const s of slots){
      i++;_csMsg('クラウドに保存しています… '+i+'/'+slots.length+'「'+s.name+'」','#1e40af');
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
      }catch(e){let sz='';try{sz='（大きさ '+_fmtSize(JSON.stringify(s.data).length*2)+'）';}catch(e2){}res.err.push(s.name+sz+': '+_csErr(e));}
    }
    if(auto){
      try{
        const head=await _csReadAutoHead(); // v659: 本体ではなく目次で比べる
        const cu=head?(head.updatedAt||0):0;
        if(!head||(auto.updatedAt||0)>cu){await _csPushEntry(_csAutosaveRef(),{...auto,name:'autosave'},null,'auto');res.auto='自動保存をクラウドの自動保存にしました';}
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
  const lines=['クラウドへの保存が終わりました。','新しく追加: '+res.added+'件','クラウドを更新: '+res.updated+'件','同じだった: '+res.same+'件','「＿旧」で残した: '+res.kept+'件'];
  if(res.auto)lines.push(res.auto);
  if(res.err.length)lines.push('失敗: '+res.err.length+'件\n'+res.err.join('\n'));
  lines.push('\n端末内のデータはそのまま残っています。');
  alert(lines.join('\n'));
  _csMsg(res.err.length?'一部保存できませんでした（詳細は上のメッセージ）':'すべてクラウドに保存しました','#16a34a');
}
// ===== 段階3: 作業中の自動保存の同期 =====
// 端末内の自動保存（scheduleAutoSave）が書かれるたびに「未送信」の印を付け、
// 1分ごとに「手が止まっていて・内容が前回送ったものと違えば」クラウド sync/autosave に送る。
// 画面を離れるとき（pagehide / 非表示）と「今すぐ送る」でも送る。
// 開いたとき（と手が止まっているとき）は、他の端末の自動保存が新しければ確認してから取り込む。
const CS_AUTO_INTERVAL=60000; // 1分
const CS_AUTO_IDLE=5000;      // 手が止まってから5秒
const CS_LS_DIRTY='cf_sync_auto_dirty';   // 未送信の変更あり（閉じたあと次回に送るため）
const CS_LS_DEVICE='cf_sync_device';      // この端末の名前
const _csAuto={started:false,timer:null,dirty:false,lastChangeAt:0,lastSentJson:'',lastSentAt:0,sending:false,declinedAt:0,remoteSeenAt:0,lastRemote:null,lastError:''};
function _csDeviceName(){
  let n='';try{n=localStorage.getItem(CS_LS_DEVICE)||'';}catch(e){}
  if(n)return n;
  const ua=navigator.userAgent||'';
  let base='端末';
  if(/iPhone/.test(ua))base='iPhone';
  else if(/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1))base='iPad';
  else if(/Android/.test(ua))base='Android';
  else if(/Windows/.test(ua))base='Windows PC';
  else if(/Macintosh/.test(ua))base='Mac';
  n=base+'-'+Math.random().toString(36).slice(2,5);
  try{localStorage.setItem(CS_LS_DEVICE,n);}catch(e){}
  return n;
}
function csRenameDevice(){
  const cur=_csDeviceName();
  const n=prompt('この端末の名前（他の端末で「○○で編集中」と表示されます）',cur);
  if(n===null)return;
  const v=n.trim();if(!v)return;
  try{localStorage.setItem(CS_LS_DEVICE,v);}catch(e){}
  _csRerender();
}
// save-load.js の scheduleAutoSave から呼ばれる（端末内の自動保存を書いた直後）
function _csNoteLocalChange(){
  _csAuto.dirty=true;_csAuto.lastChangeAt=Date.now();
  try{localStorage.setItem(CS_LS_DIRTY,'1');}catch(e){}
}
function _csAutoStart(){
  if(_csAuto.started)return;
  _csAuto.started=true;
  let dirtyFromLast=false;try{dirtyFromLast=localStorage.getItem(CS_LS_DIRTY)==='1';}catch(e){}
  if(dirtyFromLast){_csAuto.dirty=true;_csAuto.lastChangeAt=0;}
  _csAuto.timer=setInterval(_csAutoTick,CS_AUTO_INTERVAL);
  window.addEventListener('online',()=>{_csAutoTick();});
  // 復元が終わってから、他端末の自動保存を確認 → そのあと未送信分を送る
  _csWhenRestored(async()=>{
    await _csCheckRemoteAutosave(true);
    if(_csAuto.dirty)_csFlushAutosave(false);
  });
}
function _csWhenRestored(fn){
  let n=0;
  const t=setInterval(()=>{n++;if(window._restoreDone||n>60){clearInterval(t);try{fn();}catch(e){}}},500);
}
async function _csAutoTick(){
  if(!_csReady()||!navigator.onLine)return;
  if(_csAuto.dirty){
    if(Date.now()-_csAuto.lastChangeAt<CS_AUTO_IDLE)return; // まだ手が動いている → 次の1分で
    await _csFlushAutosave(false);
  }else{
    // こちらに変更が無いときだけ、他端末の新しい編集が無いか見る
    await _csCheckRemoteAutosave(false);
  }
}
function _csCurrentState(){
  try{return (typeof _collectFullState==='function')?_collectFullState():null;}catch(e){return null;}
}
// 送る。force=true は「今すぐ送る」（内容が同じでも送る）
async function _csFlushAutosave(force,dataGiven){
  if(!_csReady()||_csAuto.sending)return false;
  if(!window._restoreDone)return false; // 白紙の状態を送らない
  const data=dataGiven||_csCurrentState();
  if(!data)return false;
  const json=JSON.stringify(data);
  if(!force&&json===_csAuto.lastSentJson){_csAuto.dirty=false;try{localStorage.removeItem(CS_LS_DIRTY);}catch(e){}return true;}
  _csAuto.sending=true;
  try{
    const ts=Date.now();
    await _csPushEntry(_csAutosaveRef(),{name:'autosave',savedAt:_fmtDate(new Date()),updatedAt:ts,data},{device:_csDeviceName()},'auto');
    _csAuto.lastSentJson=json;_csAuto.lastSentAt=ts;_csAuto.remoteSeenAt=ts;_csAuto.dirty=false;_csAuto.lastError='';_cs.cloudError='';
    try{localStorage.removeItem(CS_LS_DIRTY);}catch(e){}
    _csAutoRerenderStatus();
    return true;
  }catch(e){_csAuto.lastError=_csErr(e);_csAutoRerenderStatus();return false;}
  finally{_csAuto.sending=false;}
}
// 画面を離れるとき（save-load.js の _saveNow から）。待たずに送るだけ送る
function _csFlushOnHide(data){
  if(!_csReady())return;
  try{_csFlushAutosave(false,data);}catch(e){} // 内容が前回送ったものと同じなら送らない
}
// 「今すぐ送る」
async function csSendNow(){
  if(!_csReady()){_csMsg('先にログインと合言葉の確認をしてください','#dc2626');return;}
  _csMsg('クラウドに保存しています…','#1e40af');
  const ok=await _csFlushAutosave(true);
  _csRerender();
  _csMsg(ok?'いまの作業をクラウドに保存しました（'+_csShortTime(_csAuto.lastSentAt)+'）':'クラウドに保存できませんでした: '+_csAuto.lastError,ok?'#16a34a':'#dc2626');
}
// 他端末の自動保存を確認。askIfNewer=true なら新しければ確認して取り込む
async function _csCheckRemoteAutosave(onOpen){
  if(!_csReady())return;
  // v659: 1分ごとに読むのは小さな目次だけ。新しくて「OK」のときだけ本体を読む
  let v;
  try{v=await _csReadAutoHead();}catch(e){_csAuto.lastError=_csErr(e);return;}
  if(!v)return;
  _csAuto.lastRemote={updatedAt:v.updatedAt||0,device:v.device||'',pushedAt:v.pushedAt||0};
  const ru=v.updatedAt||0;
  if(v.device===_csDeviceName())return;          // 自分が送ったもの
  if(ru<=_csAuto.remoteSeenAt||ru<=_csAuto.lastSentAt)return; // もう見た／こちらの方が新しい
  if(ru===_csAuto.declinedAt)return;             // さっき「読み込まない」と答えたもの
  // こちらの端末内の自動保存と比べる
  let local=null;try{local=await dbGet(AUTOSAVE_KEY);}catch(e){}
  const lu=local?(local.updatedAt||0):0;
  if(ru<=lu)return;
  if(!onOpen&&_csAuto.dirty)return; // こちらで作業中なら、いまは聞かない
  if(document.getElementById('slot-modal')||document.getElementById('cloud-sync-modal'))return; // 画面が開いているときは邪魔しない
  const when=_fmtDate(ru);
  const ok=confirm('他の端末（'+(v.device||'不明')+'）で '+when+' に編集した作業中の内容がクラウドにあります。\n\nこの端末に読み込みますか？\n「OK」→ いまの画面の内容は、その内容で置き換わります\n「キャンセル」→ この端末の内容のまま続けます（次にこの端末で変更すると、クラウドの方がこの端末の内容に置き換わります）');
  if(!ok){_csAuto.declinedAt=ru;return;}
  try{
    const bsnap=await window._firebase.getDoc(_csAutosaveRef());
    if(!bsnap.exists())throw new Error('クラウドの作業中データが見つかりません');
    const bv=bsnap.data()||{};
    const bu=Math.max(bv.updatedAt||0,ru); // 目次を見たあとに本体が新しくなっていたら、そちらの時刻
    const data=await window._csDecryptObj(await _csResolveEnc(_csAutosaveRef(),bv.enc));
    _applyData(data);
    if(typeof _restoreScenarios==='function')_restoreScenarios(data);
    await dbPut({name:AUTOSAVE_KEY,savedAt:bv.savedAt||v.savedAt||_fmtDate(new Date()),updatedAt:bu,data});
    _csAuto.lastSentJson=JSON.stringify(data);_csAuto.remoteSeenAt=bu;_csAuto.dirty=false;
    try{localStorage.removeItem(CS_LS_DIRTY);}catch(e){}
    if(typeof live==='function')live();
    if(typeof notifyTalkMemoClient==='function')setTimeout(notifyTalkMemoClient,200);
  }catch(e){alert('読み込めませんでした: '+_csErr(e)+'\n（合言葉が違う場合は ☁ 同期 から入れ直してください）');}
}
function _csAutoRerenderStatus(){
  const el=document.getElementById('cs-auto-status');
  if(el)el.innerHTML=_csAutoStatusHtml();
}
// v659: 時刻を短く（今日なら「11:05」、それ以外は「11/18 11:05」）
function _csShortTime(t){
  if(!t)return '';
  const d=new Date(t),n=new Date();
  const hm=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  if(d.toDateString()===n.toDateString())return '今日 '+hm;
  return (d.getMonth()+1)+'/'+d.getDate()+' '+hm;
}
// 同期画面の一番上「今の状態」（v659: 言葉をやさしく。#cs-auto-status の中身）
function _csAutoStatusHtml(){
  const err=!navigator.onLine?'インターネットにつながっていません':(_cs.cloudError||_csAuto.lastError||'');
  let head,bg,bd,col;
  if(err){head='❌ クラウドにつながっていません';bg='#fef2f2';bd='#fecaca';col='#991b1b';}
  else if(_csAuto.dirty){head='⚠ まだクラウドに保存していない変更があります';bg='#fffbeb';bd='#fde68a';col='#92400e';}
  else{head='✅ 同期できています';bg='#f0fdf4';bd='#bbf7d0';col='#166534';}
  const lines=[];
  if(err)lines.push('この端末の中には保存されています。つながると自動でクラウドに保存します。');
  else if(_csAuto.dirty)lines.push('手を止めると1分以内に、自動でクラウドに保存します。');
  let mine;
  if(_csAuto.dirty)mine=_csAuto.lastSentAt?_csShortTime(_csAuto.lastSentAt)+' に保存（そのあと変更あり）':'まだクラウドに保存していません';
  else mine=_csAuto.lastSentAt?_csShortTime(_csAuto.lastSentAt)+' にクラウドへ保存済み':'変更はありません';
  lines.push('この端末の作業：'+mine);
  const r=_csAuto.lastRemote;
  lines.push('他の端末の最新：'+((r&&r.device&&r.device!==_csDeviceName()&&r.updatedAt)?r.device+' で '+_csShortTime(r.updatedAt)+' に編集':'ありません'));
  let h=`<div style="background:${bg};border:1px solid ${bd};border-radius:10px;padding:14px">
    <div style="font-size:14px;font-weight:800;color:${col};margin-bottom:6px">${head}</div>
    <div style="font-size:12px;color:#334155;line-height:1.8">${lines.join('<br>')}</div>`;
  if(err)h+=`<div style="font-size:10px;color:#991b1b;margin-top:6px;word-break:break-all">くわしい理由: ${err}</div>`;
  return h+'</div>';
}

// rebuild=true:「クラウドの一覧を作り直す」— 本体を全部読んで目次を作り直す（通信が多いので押したときだけ）
async function csRefreshCloudCount(rebuild){
  if(!_csReady())return;
  if(rebuild)_csMsg('クラウドの一覧を作り直しています…','#1e40af');
  try{_cs.cloudCount=(await csListCloud(true,!!rebuild)||[]).length;_cs.cloudError='';if(rebuild)_csMsg('クラウドの一覧を作り直しました（'+_cs.cloudCount+'件）','#16a34a');}
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
  const prevAgree=keepMsg?!!(document.getElementById('cs-pass-agree')||{}).checked:false;
  document.getElementById('cloud-sync-modal')?.remove();
  const btn=(label,fn,bg,color,border)=>`<button onclick="${fn}" ${_cs.busy?'disabled':''} style="font-size:12px;padding:7px 16px;background:${bg};color:${color};border:1px solid ${border};border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;${_cs.busy?'opacity:.5':''}">${label}</button>`;
  let body='';
  if(!_cs.user){
    body+=`
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px">
        <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px;letter-spacing:.04em">ログイン</div>
        <div style="font-size:12px;color:#334155;line-height:1.6;margin-bottom:10px">自分のパソコン・iPad・iPhoneのあいだでCF表を共有するには、同じGoogleアカウントでログインします。<br>ログインしなくても、今までどおりこの端末だけで使えます。<br><span style="color:#64748b">※使えるのは、アプリの管理者にメンバー登録してもらったGoogleアカウントだけです（個人のGmail・会社のGoogleアカウントどちらでも）。</span></div>
        ${btn(_cs.busy?'ログイン中…':'Googleでログイン','csLogin()','#1e3a5f','#fff','#1e3a5f')}
      </div>`;
  }else{
    if(!_cs.key)body+=`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="min-width:0">
          <div style="font-size:11px;font-weight:700;color:#166534;letter-spacing:.04em">ログイン中</div>
          <div style="font-size:12px;color:#14532d;word-break:break-all">${_cs.user.email||''}</div>
        </div>
        ${btn('ログアウト','csLogout()','#fff','#64748b','#cbd5e1')}
      </div>`;
    if(_cs.key){
      // v659: 一番上に「今の状態」、ボタン2つ、ふだん使わないものは「くわしい設定」に畳む
      const row=(label,button)=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px solid #e2e8f0"><div style="font-size:12px;color:#334155;line-height:1.5;flex:1;min-width:160px">${label}</div>${button}</div>`;
      const small=(label,fn,color,border)=>`<button onclick="${fn}" ${_cs.busy?'disabled':''} style="font-size:11px;padding:5px 12px;background:#fff;color:${color};border:1px solid ${border};border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;${_cs.busy?'opacity:.5':''}">${label}</button>`;
      body+=`
      <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:-6px">クラウド＝インターネット上にある、自分専用の保管庫です。<br>パソコン・iPad・iPhone で同じデータを見られます。</div>
      <div id="cs-auto-status">${_csAutoStatusHtml()}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${btn(_csAuto.sending?'保存しています…':'いまの作業をクラウドに保存する','csSendNow()','#1e3a5f','#fff','#1e3a5f')}
        ${btn('保存/読込を開く','document.getElementById(\'cloud-sync-modal\').remove();openSlotPanel()','#fff','#1e3a5f','#cbd5e1')}
      </div>
      <details ${_cs.detailsOpen?'open':''} ontoggle="_cs.detailsOpen=this.open" style="border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;background:#f8fafc">
        <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#475569">くわしい設定（ふだんは使いません）</summary>
        <div style="margin-top:8px">
          ${_cs.isAdmin?row(`<b>利用者管理</b>（管理者だけに出ています）<br><span style="font-size:10px;color:#94a3b8">アプリを使える人の登録・停止・チーム/外部の区分</span>`,small('利用者管理を開く','openSyncMemberPanel()','#166534','#bbf7d0')):''}
          ${row(`<b>${_cs.user.email||''}</b> でログイン中`,small('ログアウト','csLogout()','#64748b','#cbd5e1'))}
          ${row(`この端末の名前：<b>${_csDeviceName()}</b><br><span style="font-size:10px;color:#94a3b8">他の端末に「○○で編集」と出る名前です</span>`,small('変更','csRenameDevice()','#1e40af','#bfdbfe'))}
          ${row(`この端末のデータを全部クラウドに保存<br><span style="font-size:10px;color:#94a3b8">端末ごとに最初の1回だけ。端末の中のデータは消えません</span>`,small(_cs.busy?'保存しています…':'全部保存する','csMigrateAll()','#92400e','#fed7aa'))}
          ${row(`クラウドの一覧が合わないとき<br><span style="font-size:10px;color:#94a3b8">いまクラウドにあるお客様データ：${_cs.cloudCount==null?'未確認':_cs.cloudCount+'件'}</span>`,small('一覧を作り直す','csRefreshCloudCount(true)','#1e40af','#bfdbfe'))}
          ${row(`合言葉（この端末に設定済み）<br><span style="font-size:10px;color:#94a3b8">忘れさせると、次に開いたとき入れ直しになります</span>`,small('この端末で忘れさせる','csForgetPass()','#92400e','#fed7aa'))}
        </div>
      </details>`;
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
          onkeydown="if(event.key==='Enter')csSubmitPass()">
        <label style="display:flex;gap:6px;align-items:flex-start;font-size:12px;color:#991b1b;font-weight:700;line-height:1.5;margin-bottom:10px;cursor:pointer;background:#fef2f2;border:1px solid #fecaca;border-radius:7px;padding:8px">
          <input id="cs-pass-agree" type="checkbox" ${prevAgree?'checked':''} style="margin-top:2px">
          <span>合言葉を忘れると、クラウドのデータは<u>管理者を含めて誰にも戻せない</u>ことを理解しました（紙に書くなどして大切に保管してください）</span>
        </label>`:''}
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
      <div style="font-size:10px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:10px">データはこの端末で暗号化してからクラウドに保存します。合言葉はクラウドに送りません。保存場所はFirebase（東京リージョン）です。</div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
  if(_cs.lastError&&!prevMsgText){const m=document.getElementById('cs-msg');if(m)m.style.color='#dc2626';}
  if(!keepMsg)setTimeout(()=>{const inp=document.getElementById('cs-pass-input');if(inp)inp.focus();},60);
}

// ホーム画面に追加したアプリ（iPhone/iPad）では URL に ?sync を付けられないので、
// 右上の版番号を3秒以内に5回続けて押しても「☁ 同期」ボタンを出せるようにする（v646）。
// 持ち主の Google アカウント以外はログインできないので、メンバーが誤って押しても何も起きない。
function _csSetupVersionTap(){
  const el=document.getElementById('app-ver');
  if(!el)return;
  let n=0,first=0;
  el.style.cursor='pointer';
  el.addEventListener('click',()=>{
    const now=Date.now();
    if(now-first>3000){n=0;first=now;}
    n++;
    if(n>=5){
      n=0;
      try{localStorage.setItem(CS_LS_ON,'1');}catch(e){}
      _csUpdateButton();
      alert('「☁ 同期」ボタンを出しました。右上の「保存 / 読込」の隣にあります。');
    }
  });
}
// ===== v660: メンバー管理（管理者だけ） =====
// syncMembers/{メール小文字} … {email,name,active,addedAt,updatedAt,addedBy}
// 消さずに「停止」にする（停止中の人はログインしても使えない。再開もできる）
const _csMem={list:null,error:'',busy:false};
async function _csLoadMembers(){
  const fb=window._firebase;
  const snap=await fb.getDocs(fb.collection(fb.db,'syncMembers'));
  const list=[];
  snap.forEach(d=>{const v=d.data()||{};list.push({id:d.id,email:v.email||d.id,name:v.name||'',active:v.active!==false,role:v.role==='external'?'external':'team',addedAt:v.addedAt||0,updatedAt:v.updatedAt||0});});
  list.sort((a,b)=>(b.active-a.active)||String(a.name||a.email).localeCompare(String(b.name||b.email),'ja'));
  return list;
}
async function openSyncMemberPanel(){
  if(!_cs.isAdmin){alert('利用者管理は管理者だけが使えます');return;}
  document.getElementById('cloud-sync-modal')?.remove();
  _csMem.error='';
  _csRenderMemberPanel();
  try{_csMem.list=await _csLoadMembers();}catch(e){_csMem.error='名簿を読めませんでした: '+_csErr(e);}
  _csRenderMemberPanel();
}
function _csMemEsc(t){return String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function _csRenderMemberPanel(msg,color){
  const keepName=(document.getElementById('csm-name')||{}).value||'';
  const keepMail=(document.getElementById('csm-mail')||{}).value||'';
  const keepRole=((document.querySelector&&document.querySelector('input[name="csm-role"]:checked'))||{}).value||'team';
  document.getElementById('sync-member-modal')?.remove();
  const L=_csMem.list;
  const rows=L==null?'<div style="font-size:12px;color:#64748b;padding:8px 0">読み込んでいます…</div>'
    :L.length===0?'<div style="font-size:12px;color:#64748b;padding:8px 0">まだ誰も登録されていません（管理者は登録しなくても使えます）</div>'
    :L.map(m=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-top:1px solid #e2e8f0;${m.active?'':'opacity:.55'}">
        <div style="min-width:0;flex:1">
          <div style="font-size:13px;font-weight:700;color:#1e3a5f">${_csMemEsc(m.name||'（名前なし）')} <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:9px;${m.role==='external'?'background:#fef3c7;color:#92400e':'background:#dbeafe;color:#1e40af'}">${m.role==='external'?'外部':'チーム'}</span> <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:9px;${m.active?'background:#dcfce7;color:#166534':'background:#f1f5f9;color:#64748b'}">${m.active?'使用中':'停止中'}</span></div>
          <div style="font-size:11px;color:#64748b;word-break:break-all">${_csMemEsc(m.email)}　登録 ${m.addedAt?_csShortTime(m.addedAt):'-'}　<a href="#" onclick="csSetMemberRole('${_csMemEsc(m.id)}','${m.role==='external'?'team':'external'}');return false" style="color:#1e40af">${m.role==='external'?'チームにする':'外部にする'}</a></div>
        </div>
        <button onclick="csSetMemberActive('${_csMemEsc(m.id)}',${m.active?'false':'true'})" ${_csMem.busy?'disabled':''} style="font-size:11px;padding:5px 12px;background:#fff;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;${m.active?'color:#92400e;border:1px solid #fed7aa':'color:#166534;border:1px solid #bbf7d0'}">${m.active?'停止する':'再開する'}</button>
        <button onclick="csRemoveMember('${_csMemEsc(m.id)}')" ${_csMem.busy?'disabled':''} style="font-size:11px;padding:5px 10px;background:#fff;border-radius:7px;cursor:pointer;font-weight:700;white-space:nowrap;color:#991b1b;border:1px solid #fecaca">名簿から消す</button>
      </div>`).join('');
  const inp='width:100%;box-sizing:border-box;font-size:13px;padding:8px 10px;border:1.5px solid #cbd5e1;border-radius:7px;font-family:inherit;outline:none';
  const modal=document.createElement('div');
  modal.id='sync-member-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(15,39,68,.5);z-index:9001;display:flex;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:24px;width:460px;max-width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.28);display:flex;flex-direction:column;gap:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Yu Gothic UI','Meiryo',sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:800;font-size:15px;color:#1e3a5f">👥 利用者管理</div>
        <button onclick="document.getElementById('sync-member-modal').remove();openCloudSyncPanel()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1;padding:0 4px" title="閉じる">✕</button>
      </div>
      <div style="font-size:12px;color:#475569;line-height:1.6;margin-top:-6px">ここに登録したGoogleアカウントだけが、このアプリに入れます。<br>「チーム」はマンション共有も使え、「外部」はCF表と自分の同期だけ使えます。<br>同期のデータは本人の合言葉で暗号化されるので、管理者にも中身は見えません。</div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.04em">利用者を追加</div>
        <input id="csm-name" placeholder="名前（例：山田 花子）" value="${_csMemEsc(keepName)}" style="${inp}">
        <input id="csm-mail" type="email" placeholder="Googleアカウントのメールアドレス" value="${_csMemEsc(keepMail)}" style="${inp}" onkeydown="if(event.key==='Enter')csAddMember()">
        <div style="display:flex;gap:14px;font-size:12px;color:#334155;align-items:center;flex-wrap:wrap">
          <span style="font-weight:700">区分</span>
          <label style="display:flex;gap:4px;align-items:center;cursor:pointer"><input type="radio" name="csm-role" value="team" ${keepRole!=='external'?'checked':''}>チーム（マンション共有あり）</label>
          <label style="display:flex;gap:4px;align-items:center;cursor:pointer"><input type="radio" name="csm-role" value="external" ${keepRole==='external'?'checked':''}>外部（CF表と自分の同期だけ）</label>
        </div>
        <div style="font-size:10px;color:#94a3b8">個人のGmailでも、会社のGoogleアカウントでも登録できます。</div>
        <div><button onclick="csAddMember()" ${_csMem.busy?'disabled':''} style="font-size:12px;padding:7px 16px;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;border-radius:7px;cursor:pointer;font-weight:700">${_csMem.busy?'登録しています…':'登録する'}</button></div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.04em;margin-bottom:2px">登録済みの利用者${L?'（'+L.filter(m=>m.active).length+'人 使用中）':''}</div>
        ${rows}
      </div>
      <div id="csm-msg" style="font-size:12px;min-height:16px;color:${color||'#64748b'}">${_csMemEsc(msg||_csMem.error||'')}</div>
      <div style="font-size:10px;color:#94a3b8;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:10px">しばらく使わない人は「停止する」（再開できます）、間違えて登録した人・辞めた人は「名簿から消す」にしてください。どちらも、その人のクラウドのデータと端末の中のデータは消えません。</div>
    </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal){modal.remove();openCloudSyncPanel();}});
  document.body.appendChild(modal);
  if(_csMem.error&&!msg){const m=document.getElementById('csm-msg');if(m)m.style.color='#dc2626';}
}
async function csAddMember(){
  if(!_cs.isAdmin)return;
  const name=((document.getElementById('csm-name')||{}).value||'').trim();
  const mail=_csEmailKey((document.getElementById('csm-mail')||{}).value);
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)){_csRenderMemberPanel('メールアドレスの形が正しくありません','#dc2626');return;}
  if(_csIsAdmin(mail)){_csRenderMemberPanel('このアドレスは管理者なので、登録しなくても使えます','#92400e');return;}
  const ex=(_csMem.list||[]).find(m=>m.id===mail);
  if(ex&&ex.active){_csRenderMemberPanel('このアドレスはもう登録されています','#92400e');return;}
  if(ex&&!ex.active){
    if(!confirm('「'+mail+'」は停止中です。再開しますか？'))return;
    return csSetMemberActive(mail,true);
  }
  const role=((document.querySelector&&document.querySelector('input[name="csm-role"]:checked'))||{}).value==='external'?'external':'team';
  if(!confirm('次の人を登録します。\n\n名前：'+(name||'（なし）')+'\nメール：'+mail+'\n区分：'+(role==='external'?'外部（CF表と自分の同期だけ）':'チーム（マンション共有あり）')+'\n\nこの人がアプリに入れるようになります。よろしいですか？'))return;
  _csMem.busy=true;_csRenderMemberPanel('登録しています…','#1e40af');
  try{
    const fb=window._firebase;const now=Date.now();
    await fb.setDoc(_csMemberRef(mail),{email:mail,name,role,active:true,addedAt:now,updatedAt:now,addedBy:_csEmailKey(_cs.user&&_cs.user.email)});
    _csMem.list=await _csLoadMembers();
    _csMem.busy=false;
    const n=document.getElementById('csm-name'),m=document.getElementById('csm-mail');if(n)n.value='';if(m)m.value='';
    _csRenderMemberPanel('「'+(name||mail)+'」を登録しました','#16a34a');
  }catch(e){_csMem.busy=false;_csRenderMemberPanel('登録できませんでした: '+_csErr(e),'#dc2626');}
}
async function csSetMemberActive(id,active){
  if(!_cs.isAdmin)return;
  const m=(_csMem.list||[]).find(x=>x.id===id);
  const who=m?(m.name||m.email):id;
  if(!active&&!confirm('「'+who+'」を停止しますか？\n\n・この人はアプリに入れなくなります\n・この人のクラウドのデータは消えません（再開すればまた使えます）\n・この人の端末の中のデータもそのまま残ります'))return;
  _csMem.busy=true;_csRenderMemberPanel(active?'再開しています…':'停止しています…','#1e40af');
  try{
    await window._firebase.setDoc(_csMemberRef(id),{active,updatedAt:Date.now()},{merge:true});
    _csMem.list=await _csLoadMembers();
    _csMem.busy=false;_csRenderMemberPanel('「'+who+'」を'+(active?'再開':'停止')+'しました','#16a34a');
  }catch(e){_csMem.busy=false;_csRenderMemberPanel('変更できませんでした: '+_csErr(e),'#dc2626');}
}

// チーム⇄外部の切り替え
async function csSetMemberRole(id,role){
  if(!_cs.isAdmin)return;
  const m=(_csMem.list||[]).find(x=>x.id===id);
  const who=m?(m.name||m.email):id;
  const label=role==='external'?'外部（CF表と自分の同期だけ。マンション共有は使えない）':'チーム（マンション共有も使える）';
  if(!confirm('「'+who+'」を「'+label+'」にしますか？\n（本人がアプリを開き直したときから変わります）'))return;
  _csMem.busy=true;_csRenderMemberPanel('変更しています…','#1e40af');
  try{
    await window._firebase.setDoc(_csMemberRef(id),{role:role==='external'?'external':'team',updatedAt:Date.now()},{merge:true});
    _csMem.list=await _csLoadMembers();
    _csMem.busy=false;_csRenderMemberPanel('「'+who+'」を'+(role==='external'?'外部':'チーム')+'にしました','#16a34a');
  }catch(e){_csMem.busy=false;_csRenderMemberPanel('変更できませんでした: '+_csErr(e),'#dc2626');}
}
// 名簿から1件消す（その人のデータは消さない。管理者にはそもそも消す権限が無い）
async function csRemoveMember(id){
  if(!_cs.isAdmin)return;
  const m=(_csMem.list||[]).find(x=>x.id===id);
  const who=m?((m.name?m.name+'（'+m.email+'）':m.email)):id;
  if(!confirm('「'+who+'」を名簿から消しますか？\n\n・この人はアプリに入れなくなります\n・名簿の一覧からも消えます（あとで使うときは、もう一度登録すればOK）\n・この人のクラウドのデータは消えません\n・この人の端末の中のデータも消えません'))return;
  _csMem.busy=true;_csRenderMemberPanel('名簿から消しています…','#1e40af');
  try{
    await window._firebase.deleteDoc(_csMemberRef(id));
    _csMem.list=await _csLoadMembers();
    _csMem.busy=false;_csRenderMemberPanel('「'+(m?(m.name||m.email):id)+'」を名簿から消しました','#16a34a');
  }catch(e){_csMem.busy=false;_csRenderMemberPanel('消せませんでした: '+_csErr(e),'#dc2626');}
}

// 起動時: ボタンの表示だけ決める（ログイン状態は firebase-init からの通知で反映）
(function(){
  function init(){_csUpdateButton();_csSetupVersionTap();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
