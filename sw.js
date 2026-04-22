// Service Worker — PWAインストール用
const CACHE_NAME = 'cf-app-v348';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/state.js',
  './js/constants.js',
  './js/utils.js',
  './js/family.js',
  './js/income.js',
  './js/education.js',
  './js/housing.js',
  './js/loan-calc.js',
  './js/living-cost.js',
  './js/assets.js',
  './js/extras.js',
  './js/contingency.js',
  './js/cf-ui.js',
  './js/cf-calc.js',
  './js/cf-table.js',
  './js/lc-tab.js',
  './js/cf-highlight.js',
  './js/graphs.js',
  './js/export.js',
  './js/loan-plan.js',
  './js/scenario.js',
  './js/save-load.js',
  './js/ui.js',
  './js/app.js',
  './js/firebase-init.js',
  './js/mansion-files.js',
  './js/mg-qa.js',
  './js/explain/explain-core.js',
  './js/explain/explain-lctrl.js',
  './js/explain/explain-pension.js',
  './js/explain/explain-income.js',
  './js/explain/explain-financial.js',
  './js/explain/explain-edu.js',
  './js/market-scenarios.js',
  './js/market-sim.js',
  './js/vendors/chart.min.js',
  './js/vendors/jszip.min.js',
  './js/vendors/xlsx-style.min.js',
  './js/vendors/FileSaver.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './favicon.png'
];

// クエリパラメータ(?v=xx)を除去してキャッシュキーを統一
function stripQuery(url){
  const u=new URL(url);
  u.search='';
  return u.href;
}

// インストール時にキャッシュ
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// ネットワーク優先、失敗時キャッシュ（クエリパラメータを正規化して一致させる）
self.addEventListener('fetch', e => {
  const stripped=stripQuery(e.request.url);
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      // クエリなしのURLでキャッシュ保存
      caches.open(CACHE_NAME).then(c => c.put(new Request(stripped), clone));
      return res;
    }).catch(() => caches.match(new Request(stripped)))
  );
});
