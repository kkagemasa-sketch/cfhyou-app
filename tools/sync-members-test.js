// cloud-sync.js（v660 メンバー登録）の動作確認。にせの Firestore を使う（ネットにはつながない）。実行: node tools/sync-members-test.js
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2] || require('path').join(__dirname, '..', 'js', 'cloud-sync.js'), 'utf8');

// ---- にせ Firestore ----
const store = new Map(); // path -> data
let readBytes = 0, reads = 0, writes = 0;
const DEL = { __del: true };
const clone = o => JSON.parse(JSON.stringify(o));
function mkDoc(path) { const seg = path.split('/'); return { path, id: seg[seg.length - 1], type: 'doc' }; }
function mkCol(path) { return { path, type: 'col' }; }
function deepMerge(t, s) {
  for (const k of Object.keys(s)) {
    const v = s[k];
    if (v === DEL) { delete t[k]; continue; }
    if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object') deepMerge(t[k], v);
    else t[k] = (v && typeof v === 'object') ? stripDel(clone(v)) : v;
  }
  return t;
}
function stripDel(o) { return o; }
function snapOf(path) {
  const d = store.get(path);
  reads++; if (d) readBytes += JSON.stringify(d).length;
  return { id: path.split('/').pop(), exists: () => !!d, data: () => d ? clone(d) : undefined };
}
const fb = {
  db: { root: true },
  collection(base, ...seg) { const p = (base.root ? '' : base.path + '/') + seg.join('/'); return mkCol(p.replace(/^\//, '')); },
  doc(base, ...seg) { const p = (base.root ? '' : base.path + '/') + seg.join('/'); return mkDoc(p.replace(/^\//, '')); },
  async getDoc(ref) { if (ctx.__deny && ref.path.startsWith('syncMembers/')) { const e = new Error('Missing or insufficient permissions.'); e.code = 'permission-denied'; throw e; } if (ctx.__netFail && ref.path.startsWith('syncMembers/')) { const e = new Error('Failed to get document because the client is offline.'); e.code = 'unavailable'; throw e; } return snapOf(ref.path); },
  async getDocs(col) {
    const docs = [];
    for (const [p] of store) { if (p.startsWith(col.path + '/') && p.slice(col.path.length + 1).indexOf('/') < 0) docs.push(snapOf(p)); }
    return { forEach: f => docs.forEach(f), size: docs.length };
  },
  async setDoc(ref, data, opt) {
    writes++;
    if (JSON.stringify(data).length > 1048000) throw new Error('too big ' + ref.path);
    if (opt && opt.merge && store.has(ref.path)) store.set(ref.path, deepMerge(store.get(ref.path), data));
    else store.set(ref.path, deepMerge({}, data));
  },
  async deleteDoc(ref) { writes++; store.delete(ref.path); },
  deleteField() { return DEL; },
};

// ---- ブラウザ部分のスタブ ----
const ls = {}; let confirmAnswer = true; const applied = [];
const local = new Map();
const ctx = {
  console, crypto: globalThis.crypto, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Response, Uint8Array,
  btoa, atob, setTimeout, clearTimeout, Date, Math, JSON, Object, Array, String, Promise, Error, Set, Map,
  setInterval: () => 0, clearInterval: () => {},
  localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
  navigator: { onLine: true, userAgent: 'test', maxTouchPoints: 0 },
  location: { search: '', hostname: 'localhost' },
  document: { readyState: 'complete', getElementById: () => null, addEventListener() {}, querySelector: () => null, body: { appendChild() {} }, createElement: () => { const el={ style: {}, addEventListener() {}, appendChild() {} }; ctx.__lastEl=el; return el; } },
  alert: m => { console.log('  [alert]', String(m).split('\n')[0]); }, confirm: () => confirmAnswer, prompt: () => null,
  dbGet: async k => local.get(k) || null, dbPut: async e => { local.set(e.name, e); }, dbGetAll: async () => [...local.values()],
  AUTOSAVE_KEY: '__autosave__', _fmtDate: d => new Date(d).toISOString(), _applyData: d => applied.push(d),
  live: () => {}, encodeURIComponent, decodeURIComponent, parseInt, isNaN,
};
ctx.window = ctx; ctx._firebase = fb; ctx._restoreDone = true;
vm.createContext(ctx);

const test = `
;(async()=>{
  const ok=(c,m)=>{console.log((c?'  OK  ':'  NG  ')+m);if(!c)__fail.n++;};
  const alerts=[];window.alert=m=>alerts.push(String(m));
  let signedOut=0;window._firebase.signOut=async()=>{signedOut++;};window._firebase.auth={};
  const g=(email)=>({email,uid:'uid-'+email,isAnonymous:false,providerData:[{providerId:'google.com'}]});
  const wait=()=>new Promise(r=>setTimeout(r,30));
  const txt=h=>h.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ');

  console.log('1) ボタンは全員に出す');
  ok(_csButtonWanted()===true,'ログイン前でもボタンを出す');

  console.log('2) 管理者はそのまま使える');
  await _csOnGoogleUser(g('K.Kagemasa@gmail.com'));await wait();
  ok(_cs.user&&_cs.isAdmin===true&&signedOut===0,'管理者（大文字まじりでもOK）');

  console.log('3) 管理者がメンバーを登録・停止・再開');
  confirmAnswer=true;
  await openSyncMemberPanel();
  ok(txt(__lastEl.innerHTML).indexOf('まだ誰も登録されていません')>=0,'最初は空');
  const setv=(id,v)=>{};
  // 入力欄のまね
  const fields={};document.getElementById=id=>fields[id]||null;
  fields['csm-name']={value:'山田 花子'};fields['csm-mail']={value:' Hanako.Yamada@Example.co.jp '};
  await csAddMember();
  const d=__store.get('syncMembers/hanako.yamada@example.co.jp');
  ok(d&&d.active===true&&d.name==='山田 花子','会社のアドレスを小文字で登録');
  ok(txt(__lastEl.innerHTML).indexOf('山田 花子')>=0&&txt(__lastEl.innerHTML).indexOf('使用中')>=0,'一覧に「使用中」で出る');
  fields['csm-name']={value:'x'};fields['csm-mail']={value:'hanako.yamada@example.co.jp'};
  await csAddMember();ok(txt(__lastEl.innerHTML).indexOf('もう登録されています')>=0,'二重登録しない');
  fields['csm-mail']={value:'not-an-email'};await csAddMember();
  ok(txt(__lastEl.innerHTML).indexOf('形が正しくありません')>=0,'メールの形をチェック');
  fields['csm-mail']={value:'kgmkhmuk@gmail.com'};await csAddMember();
  ok(txt(__lastEl.innerHTML).indexOf('管理者なので')>=0,'管理者は登録不要と出る');
  fields['csm-name']={value:'佐藤 太郎'};fields['csm-mail']={value:'taro@gmail.com'};await csAddMember();
  await csSetMemberActive('taro@gmail.com',false);
  ok(__store.get('syncMembers/taro@gmail.com').active===false&&__store.has('syncMembers/taro@gmail.com'),'停止しても名簿からは消えない');
  ok(txt(__lastEl.innerHTML).indexOf('停止中')>=0,'一覧に「停止中」');

  console.log('4) メンバーのログイン');
  _cs.user=null;signedOut=0;alerts.length=0;
  await _csOnGoogleUser(g('hanako.yamada@example.co.jp'));await wait();
  ok(_cs.user&&_cs.isAdmin===false&&signedOut===0,'登録済みメンバーは使える（管理者ではない）');
  window._cloudSyncOnAuth(null);
  await _csOnGoogleUser(g('taro@gmail.com'));await wait();
  ok(!_cs.user&&signedOut===1&&alerts.some(a=>a.indexOf('登録されていません')>=0),'停止中の人は使えない');
  signedOut=0;alerts.length=0;
  await _csOnGoogleUser(g('stranger@gmail.com'));await wait();
  ok(!_cs.user&&signedOut===1,'未登録の人は使えない');
  signedOut=0;__deny=true;
  await _csOnGoogleUser(g('someone@gmail.com'));await wait();
  ok(!_cs.user&&signedOut===1,'ルールで拒否されたら使えない');
  __deny=false;signedOut=0;__netFail=true;
  await _csOnGoogleUser(g('hanako.yamada@example.co.jp'));await wait();
  ok(_cs.user&&signedOut===0,'通信が一時的に切れても、登録済みの人を追い出さない');
  __netFail=false;

  console.log('5) メンバーには「メンバー管理」が出ない／管理者には出る');
  _cs.key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  openCloudSyncPanel();ok(__lastEl.innerHTML.indexOf('メンバー管理を開く')<0,'メンバーの画面に出ない');
  _cs.isAdmin=false;await openSyncMemberPanel();ok(alerts.some(a=>a.indexOf('管理者だけ')>=0),'メンバーが開こうとしても開けない');
  _cs.isAdmin=true;openCloudSyncPanel();ok(__lastEl.innerHTML.indexOf('メンバー管理を開く')>=0,'管理者の画面に出る');

  console.log('6) 合言葉を初めて作るときは「戻せない」のチェックが必須');
  _cs.key=null;_cs.metaExists=false;openCloudSyncPanel();
  ok(__lastEl.innerHTML.indexOf('cs-pass-agree')>=0,'チェック欄が出る');
  fields['cs-pass-input']={value:'abcdefgh1',focus(){}};fields['cs-pass-input2']={value:'abcdefgh1'};fields['cs-pass-agree']={checked:false};
  fields['cs-msg']={style:{},textContent:''};
  _csApplyPass=async()=>'create';
  await csSubmitPass();
  ok(fields['cs-msg'].textContent.indexOf('チェックを入れて')>=0,'チェックなしでは始められない');

  console.log(__fail.n?'\\n失敗 '+__fail.n+' 件':'\\nすべて合格');
})().catch(e=>{console.log('ERROR',e&&e.stack||e);__fail.n++;});
`;
ctx.__deny = false; ctx.__netFail = false;
ctx.__fb = fb; ctx.__store = store; ctx.__applied = applied; ctx.__fail = { n: 0 };
ctx.__st = { reset() { reads = 0; readBytes = 0; }, get reads() { return reads; }, get bytes() { return readBytes; } };
vm.runInContext(src + test, ctx, { filename: 'cloud-sync.js' });
