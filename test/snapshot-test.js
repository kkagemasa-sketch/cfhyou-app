// snapshot-test.js — render()リファクタリング用スナップショットテスト
// 使い方：ブラウザのコンソールで実行
// 1. リファクタリング前: snapshotSave() → localStorage にスナップショット保存
// 2. リファクタリング後: snapshotCompare() → 保存済みスナップショットと比較

const SNAPSHOT_KEY = 'cf_render_snapshot';

// 比較対象の配列キー（計算結果に関わるもの全て）
const CHECK_KEYS = [
  'hInc','wInc','rPay','wRPay','otherInc','scholarship','insMat',
  'pS','pW','teate','lCtrl','survPension','incT',
  'lc','lRep','rep','ptx','furn','senyu',
  'rent','secInvest','secBuy','insMonthly','insLumpExp',
  'carTotal','prk','wedding','ext','expT',
  'bal','sav','savExtra','lBal','finAsset','totalAsset'
];

// スナップショット保存
function snapshotSave(){
  const R = window.lastR;
  if(!R){ console.error('❌ lastR が見つかりません。先にCF表を表示してください。'); return; }
  const snap = {};
  CHECK_KEYS.forEach(k => {
    if(Array.isArray(R[k])) snap[k] = R[k].map(v => v);
  });
  // 教育費（子供ごとの配列）
  if(R.edu) snap.edu = R.edu.map(arr => arr.map(v => v));
  snap._disp = window.lastDisp;
  snap._timestamp = new Date().toISOString();
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  console.log(`✅ スナップショット保存完了（${snap._timestamp}）`);
  console.log(`   配列数: ${Object.keys(snap).filter(k=>!k.startsWith('_')).length}`);
  console.log(`   年数: ${snap._disp}`);
  return snap;
}

// スナップショット比較
function snapshotCompare(){
  const R = window.lastR;
  if(!R){ console.error('❌ lastR が見つかりません。'); return; }
  const saved = localStorage.getItem(SNAPSHOT_KEY);
  if(!saved){ console.error('❌ 保存済みスナップショットがありません。先に snapshotSave() を実行してください。'); return; }
  const snap = JSON.parse(saved);
  console.log(`📋 比較開始（保存: ${snap._timestamp}）`);

  let pass = 0, fail = 0, diffs = [];

  CHECK_KEYS.forEach(k => {
    if(!snap[k] || !R[k]) return;
    const len = Math.min(snap[k].length, R[k].length);
    let keyOk = true;
    for(let i = 0; i < len; i++){
      if(snap[k][i] !== R[k][i]){
        diffs.push({ key: k, col: i, old: snap[k][i], new: R[k][i], diff: R[k][i] - snap[k][i] });
        keyOk = false;
      }
    }
    if(snap[k].length !== R[k].length){
      diffs.push({ key: k, issue: `配列長が異なる: ${snap[k].length} → ${R[k].length}` });
      keyOk = false;
    }
    if(keyOk) pass++; else fail++;
  });

  // 教育費の比較
  if(snap.edu && R.edu){
    snap.edu.forEach((arr, ci) => {
      if(!R.edu[ci]) return;
      const len = Math.min(arr.length, R.edu[ci].length);
      let keyOk = true;
      for(let i = 0; i < len; i++){
        if(arr[i] !== R.edu[ci][i]){
          diffs.push({ key: `edu[${ci}]`, col: i, old: arr[i], new: R.edu[ci][i], diff: R.edu[ci][i] - arr[i] });
          keyOk = false;
        }
      }
      if(keyOk) pass++; else fail++;
    });
  }

  if(fail === 0){
    console.log(`✅ 全${pass}項目 完全一致！リファクタリング成功です。`);
  } else {
    console.warn(`❌ ${fail}項目で差異あり（${pass}項目は一致）`);
    console.table(diffs.slice(0, 50)); // 最初の50件を表示
  }
  return { pass, fail, diffs };
}

// グローバルに公開
window.snapshotSave = snapshotSave;
window.snapshotCompare = snapshotCompare;
