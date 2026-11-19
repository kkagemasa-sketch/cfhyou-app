// auth-gate.js — アプリの入口（v660〜）: 共通パスワードをやめて、名簿に登録された Google アカウントだけ入れる
//
// 流れ
//   1) 入口画面（#pw-lock）に免責事項と「同意してGoogleでログイン」ボタン
//   2) Googleでログイン → cloud-sync.js が名簿（syncMembers）を確認
//        登録あり → window._gateOnMember(user, role)  … 入口を閉じる。role は 'team'（チーム）/'external'（外部）
//        登録なし → window._gateOnNotMember(email)    … ログアウトして入口に案内を出す
//      ログインしていない（匿名のみ）→ window._gateOnNoUser() … 入口を出す
//   3) 一度入った端末は 7日間、開いたときに入口を出さない（localStorage 'cf-gate'）。7日たったら免責事項をもう一度出す
//
// ※ この入口は「ふだん使う上での鍵」。お客様データ（同期）とマンションのデータは Firestore ルールで守っている。
// ※ テスト（tools/edge-harness.js）は localhost で localStorage 'cf-gate-test'='1' を入れて入口を飛ばす

const GATE_KEY='cf-gate';
const GATE_DAYS=7;
const GATE_AGREE_KEY='cf-gate-agree'; // ログインボタンを押した印（リダイレクト方式で画面が切り替わっても覚えておく）
const _gate={member:false,role:null,email:'',busy:false};

function _gateTestBypass(){
  try{return /^(localhost|127\.0\.0\.1)$/.test(location.hostname)&&localStorage.getItem('cf-gate-test')==='1';}catch(e){return false;}
}
function _gateHint(){
  try{const g=JSON.parse(localStorage.getItem(GATE_KEY)||'null');return (g&&g.exp>Date.now())?g:null;}catch(e){return null;}
}
function _gateSetHint(email){
  try{localStorage.setItem(GATE_KEY,JSON.stringify({email:String(email||''),exp:Date.now()+GATE_DAYS*24*60*60*1000}));}catch(e){}
}
function _gateClearHint(){try{localStorage.removeItem(GATE_KEY);}catch(e){}}
function _gateAgreed(){try{return sessionStorage.getItem(GATE_AGREE_KEY)==='1';}catch(e){return false;}}
function _gateSetAgreed(v){try{v?sessionStorage.setItem(GATE_AGREE_KEY,'1'):sessionStorage.removeItem(GATE_AGREE_KEY);}catch(e){}}

function _gateMsg(text,color){
  const el=document.getElementById('pw-err');
  if(el){el.textContent=text||'';el.style.color=color||'#d63a2a';}
}
function _gateRenderButton(){
  const b=document.getElementById('gate-btn');
  if(!b)return;
  if(_gate.busy){b.textContent='確認しています…';b.disabled=true;b.style.opacity='.6';return;}
  b.disabled=false;b.style.opacity='';
  b.textContent=_gate.member?'同意して始める':'同意してGoogleでログイン';
  const who=document.getElementById('gate-who');
  if(who)who.textContent=_gate.member&&_gate.email?(_gate.email+' でログイン中'):'';
}
function _gateShow(msg,color){
  if(_gateTestBypass())return;
  document.getElementById('gate-hide-style')?.remove();
  const lock=document.getElementById('pw-lock');
  if(lock)lock.style.display='flex';
  if(msg!==undefined)_gateMsg(msg,color);
  _gateRenderButton();
}
function _gateHide(){
  const lock=document.getElementById('pw-lock');
  if(lock)lock.style.display='none';
  _gateMsg('');
}

// 入口のボタン
function gateButton(){
  if(_gate.member){
    // もうログイン済み（7日たって免責事項をもう一度出したとき）→ 同意して入る
    _gateSetHint(_gate.email);_gateHide();
    return;
  }
  if(typeof csLogin!=='function'||!window._firebase){
    _gateMsg('準備中です。数秒待ってから、もう一度押してください。');
    return;
  }
  _gateSetAgreed(true);
  _gateMsg('Googleのログイン画面を開いています…','#1e40af');
  csLogin();
}

// cloud-sync.js から呼ばれる
window._gateOnMember=function(user,role){
  _gate.member=true;_gate.role=role||'team';_gate.email=(user&&user.email)||'';_gate.busy=false;
  window._cfRole=_gate.role;
  _gateApplyRole();
  if(_gateAgreed()||_gateHint()){
    _gateSetAgreed(false);
    _gateSetHint(_gate.email);
    _gateHide();
  }else{
    // ログインは残っているが7日たった → 免責事項をもう一度出して「同意して始める」
    _gateShow('');
  }
};
window._gateOnNotMember=function(email){
  _gate.member=false;_gate.role=null;_gate.email='';_gate.busy=false;window._cfRole=null;
  _gateSetAgreed(false);_gateClearHint();
  _gateShow('このGoogleアカウント（'+(email||'')+'）は、まだ利用者として登録されていません（または停止中です）。アプリの管理者に、このメールアドレスの登録を頼んでください。');
};
window._gateOnNoUser=function(){
  _gate.member=false;_gate.role=null;_gate.email='';window._cfRole=null;
  _gateClearHint();
  _gateShow();
};
window._gateOnLoginError=function(text){
  _gateSetAgreed(false);
  if(text)_gateShow(text);else if(!_gate.member)_gateMsg('');
};
window._gateIsOpen=function(){return _gate.member;};

// 外部の利用者には、チームのマンション共有を出さない（データも Firestore ルールで読めない）
function _gateApplyRole(){
  const ext=_gate.role==='external';
  ['btn-mansion-mgmt','mansion-select-row'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=ext?'none':'';});
  if(ext){
    try{localStorage.removeItem('cf_mansion_master');}catch(e){}
    try{if(typeof _mansionMaster!=='undefined'){_mansionMaster=[];if(typeof populateMansionSelect==='function')populateMansionSelect();}}catch(e){}
  }
}
// 画面ができてから（役割が先に決まっていた場合に備えて）もう一度当てる
document.addEventListener('DOMContentLoaded',()=>{if(_gate.role)_gateApplyRole();_gateRenderButton();});
