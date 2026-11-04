// Cloudflare Pages Function: Google ログインの受け口（/__/auth/*）を cfhyou.pages.dev 自身で受ける中継（v649）
//
// iPhone/iPad のホーム画面アプリでは、ログインのあと firebaseapp.com から戻ってくる方式
// （signInWithRedirect）が「storage-partitioned」の制限で結果を受け取れない。
// Firebase 公式の対策「Option 4: 認証リクエストを firebaseapp.com へプロキシする」に当たるのがこのファイル。
// firebase-init.js 側で、iPhone/iPad のホーム画面アプリのときだけ authDomain を cfhyou.pages.dev にする。
//
// 必要な設定（1回だけ・Google Cloud コンソール）:
//   APIs & Services → 認証情報 → OAuth 2.0 クライアント「Web client (auto created by Google Service)」
//   → 承認済みのリダイレクト URI に https://cfhyou.pages.dev/__/auth/handler を追加
const UPSTREAM = 'https://cfhyou-shared.firebaseapp.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = UPSTREAM + url.pathname + url.search;
  const req = context.request;
  const headers = new Headers(req.headers);
  headers.delete('host');
  const init = { method: req.method, headers, redirect: 'manual' };
  if (req.method !== 'GET' && req.method !== 'HEAD') init.body = await req.arrayBuffer();
  const res = await fetch(target, init);
  // そのまま返す（ヘッダーもコピー。Set-Cookie は firebaseapp.com 向けなので外す）
  const out = new Headers(res.headers);
  out.delete('set-cookie');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
