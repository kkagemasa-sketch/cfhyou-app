// cloud-sync.js（v659 目次方式）の動作確認。にせの Firestore を使う（ネットにはつながない）。実行: node tools/sync-index-test.js
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
  async getDoc(ref) { return snapOf(ref.path); },
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
  document: { readyState: 'complete', getElementById: () => null, addEventListener() {}, querySelector: () => null, body: { appendChild() {} }, createElement: () => ({ style: {}, addEventListener() {}, appendChild() {} }) },
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
  _cs.user={uid:'u1',email:'k.kagemasa@gmail.com'};
  _cs.key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const rnd=n=>{const out=[];const a=new Uint8Array(60000);while(out.length<n){crypto.getRandomValues(a);for(const b of a){if(out.length>=n)break;out.push(String.fromCharCode(33+b%90));}}return out.join('');};
  const small=(t)=>({who:t,memo:'x'.repeat(5000)});
  const big=()=>({blob:rnd(900000)}); // 圧縮しても 700000 文字を超える → 分割

  console.log('1) v658以前の形（目次なし）の本体を置いておく');
  // 旧版の書き方を再現: 本体だけ書く
  const old=async(name,data)=>{const enc=await window._csEncryptObj(data);await __fb.setDoc(_csSlotRef(name),{name,savedAt:'s',updatedAt:1000,enc,bytes:enc.ct.length,pushedAt:1});};
  await old('田中様',small('tanaka'));await old('佐藤様',small('sato'));
  await __fb.setDoc(_csAutosaveRef(),{name:'autosave',savedAt:'s',updatedAt:500,enc:await window._csEncryptObj({who:'auto-old'}),bytes:1,pushedAt:1,device:'PC-old'});
  ok(!__store.has('users/u1/sync/index'),'まだ目次は無い');

  console.log('2) 一覧（初回は目次を作る）');
  let l=await csListCloud(true);
  ok(l.length===2&&l.map(x=>x.name).sort().join()==='佐藤様,田中様','一覧に2件: '+l.map(x=>x.name).join(','));
  ok(__store.has('users/u1/sync/index'),'目次ができた');

  console.log('3) 2回目以降の一覧は目次だけを読む');
  __st.reset();l=await csListCloud(true);
  ok(__st.reads===1,'読み込み回数 '+__st.reads+' 回（目次1件）');ok(__st.bytes<1000,'読んだ量 '+__st.bytes+' 文字（本体を読んでいない）');

  console.log('4) 新しく保存（小さい）→ 目次に入る。送る前に本体を読まない');
  __st.reset();await csPushSlot({name:'鈴木様.v2',savedAt:'s',updatedAt:2000,data:small('suzuki')});
  ok(__st.bytes<1000,'送るときの読み込み '+__st.bytes+' 文字');
  l=await csListCloud(true);ok(l[0].name==='鈴木様.v2'&&l.length===3,'一覧の先頭が鈴木様.v2（名前に点があってもOK）');
  let f=await csFetchSlot('鈴木様.v2');ok(f&&f.data.who==='suzuki','取り込むと中身が戻る');

  console.log('5) 大きいデータ（分けて送る）→ 小さく上書き → 余った分割が消える');
  await csPushSlot({name:'大きい様',savedAt:'s',updatedAt:3000,data:big()});
  const parts=()=>[...__store.keys()].filter(k=>k.startsWith('users/u1/slots/'+_csSlotId('大きい様')+'/parts/')).length;
  const p1=parts();ok(p1>=2,'分割 '+p1+' 個');
  ok((_cs.index[_csSlotId('大きい様')]||{}).parts===p1,'目次に分割数が入っている');
  f=await csFetchSlot('大きい様');ok(f&&f.data.blob.length===900000,'分割データを取り込める');
  __st.reset();await csPushSlot({name:'大きい様',savedAt:'s',updatedAt:3100,data:small('now-small')});
  ok(parts()===0,'上書き後の分割の残り '+parts()+' 個');ok(__st.bytes<1000,'上書き前に本体を読んでいない（'+__st.bytes+' 文字）');
  f=await csFetchSlot('大きい様');ok(f.data.who==='now-small','上書き後の中身');

  console.log('6) 削除 → 本体・分割・目次から消える');
  await csPushSlot({name:'消す様',savedAt:'s',updatedAt:4000,data:big()});
  await csDeleteCloudSlot('消す様');
  ok(![...__store.keys()].some(k=>k.indexOf(_csSlotId('消す様'))>=0),'本体と分割が消えた');
  l=await csListCloud(true);ok(!l.find(x=>x.name==='消す様'),'一覧から消えた（'+l.length+'件）');

  console.log('7) 自動保存: 旧形式（目次なし）を初めて確認 → 目次を作る');
  __st.reset();confirmAnswer=false;await _csCheckRemoteAutosave(true);
  ok(__store.has('users/u1/sync/autohead'),'自動保存の目次ができた');
  __st.reset();await _csCheckRemoteAutosave(false);
  ok(__st.reads===1&&__st.bytes<500,'1分ごとの確認は目次だけ: '+__st.reads+'回 '+__st.bytes+'文字');

  console.log('8) 自動保存を送る → 目次の時刻・端末名が変わる。送る前に本体を読まない');
  __st.reset();await _csFlushAutosave(true,{who:'auto-mine'});
  const h=__store.get('users/u1/sync/autohead');ok(h&&h.device===_csDeviceName()&&h.updatedAt===_csAuto.lastSentAt,'目次に自分の端末名・時刻');
  ok(__st.bytes<500,'送る前の読み込み '+__st.bytes+' 文字');

  console.log('9) 他の端末が新しく送った → 確認して読み込む');
  await __fb.setDoc(_csAutosaveRef(),{name:'autosave',savedAt:'s2',updatedAt:Date.now()+5000,enc:await window._csEncryptObj({who:'auto-ipad'}),bytes:1,pushedAt:1,device:'iPad-x'});
  await __fb.setDoc(_csAutoHeadRef(),{updatedAt:Date.now()+5000,savedAt:'s2',device:'iPad-x',pushedAt:1,bytes:1,parts:0});
  confirmAnswer=true;__applied.length=0;await _csCheckRemoteAutosave(false);
  ok(__applied.length===1&&__applied[0].who==='auto-ipad','iPadの作業中データを画面に読み込んだ');
  __st.reset();await _csCheckRemoteAutosave(false);ok(__applied.length===1,'同じものは2回聞かない');

  console.log('10) 大きい自動保存（分割）→ 小さく送る → 分割が消える');
  await _csFlushAutosave(true,big());
  const ap=()=>[...__store.keys()].filter(k=>k.startsWith('users/u1/sync/autosave/parts/')).length;
  ok(ap()>=2,'自動保存の分割 '+ap()+' 個');
  await _csFlushAutosave(true,{who:'small-again'});ok(ap()===0,'分割の残り '+ap()+' 個');

  console.log('11) 「クラウドの一覧を作り直す」: 旧版の端末が目次を書かずに送った分も出る');
  await old('旧版から様',small('oldapp'));
  l=await csListCloud(true);ok(!l.find(x=>x.name==='旧版から様'),'作り直す前は出ない（想定どおり）');
  await csRefreshCloudCount(true);
  l=await csListCloud(true);ok(!!l.find(x=>x.name==='旧版から様')&&_cs.cloudCount===l.length,'作り直した後は出る（'+l.length+'件）');

  console.log('12) ログアウトで記憶を消す');
  window._cloudSyncOnAuth(null);ok(_cs.index===null&&_cs.autoParts===null,'目次の記憶が消えた');

  console.log(__fail.n?'\\n失敗 '+__fail.n+' 件':'\\nすべて合格');
})().catch(e=>{console.log('ERROR',e&&e.stack||e);__fail.n++;});
`;
ctx.__fb = fb; ctx.__store = store; ctx.__applied = applied; ctx.__fail = { n: 0 };
ctx.__st = { reset() { reads = 0; readBytes = 0; }, get reads() { return reads; }, get bytes() { return readBytes; } };
vm.runInContext(src + test, ctx, { filename: 'cloud-sync.js' });
