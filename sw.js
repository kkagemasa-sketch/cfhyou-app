// Service Worker — PWAインストール用
const CACHE_NAME = 'cf-app-v5';
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
  './js/render.js',
  './js/cf-highlight.js',
  './js/graphs.js',
  './js/export.js',
  './js/loan-plan.js',
  './js/handbook.js',
  './js/scenario.js',
  './js/save-load.js',
  './js/ui.js',
  './js/app.js',
  './js/vendors/chart.min.js',
  './js/vendors/jszip.min.js',
  './js/vendors/xlsx-style.min.js',
  './js/vendors/FileSaver.min.js',
  './icon-192.png',
  './icon-512.png',
  './favicon.svg'
];

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

// ネットワーク優先、失敗時キャッシュ
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
