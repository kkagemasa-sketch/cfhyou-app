// Firebase初期化 + 匿名認証 + マンションマスター共有
// ES Modules (type="module") で読み込む
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// Firebase設定（公開されても問題ない識別子）
const firebaseConfig = {
  apiKey: "AIzaSyDJcMnZ8PhuAm_cRWWrNMTdh4TPTmYyZGg",
  authDomain: "cfhyou-shared.firebaseapp.com",
  projectId: "cfhyou-shared",
  storageBucket: "cfhyou-shared.firebasestorage.app",
  messagingSenderId: "1043679684977",
  appId: "1:1043679684977:web:f1798fb692cded15846ed0"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Firestoreをオフライン永続化付きで初期化（ネット切断時もキャッシュから動作）
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  // 既に初期化済みの場合はフォールバック
  console.warn('Firestore persistence init failed, using default:', e);
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  db = getFirestore(app);
}

// グローバル公開（他のJSファイルから使えるように）
window._firebase = {
  app, auth, db, storage,
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  storageRef, uploadBytes, getDownloadURL, deleteObject,
  signInAnonymously,
  // クラウド同期（cloud-sync.js）用: Googleログイン
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged
};

// Firebase準備完了を通知するPromise
window._firebaseReady = false;
window._firebaseReadyPromise = new Promise((resolve) => {
  window._firebaseReadyResolve = resolve;
});

// 匿名サインイン（Googleでログイン済みの端末では、そのログインを匿名で上書きしない）
//   以前は読み込み直後に無条件で signInAnonymously していたため、Googleログインを入れると
//   次に開いたときに匿名ユーザーに戻ってしまう。認証状態の復元を待ってから、誰もいない時だけ匿名で入る。
function _anonSignIn() {
  return signInAnonymously(auth).catch((e) => {
    console.error('Anonymous sign-in failed:', e);
    // サインイン失敗してもReadyは解決する（オフライン時も動作させるため）
    window._firebaseReadyResolve(false);
  });
}
window._firebaseAnonSignIn = _anonSignIn;

// 認証状態監視
let _firstAuthEvent = true;
onAuthStateChanged(auth, (user) => {
  if (user) {
    window._firebaseReady = true;
    window._firebaseReadyResolve(true);
    // マンションマスターを再読み込み（既に初期ロード済みでも最新に更新）
    if (typeof window.loadMansionMaster === 'function') {
      window.loadMansionMaster();
    }
  } else if (_firstAuthEvent) {
    // 復元されたログインが無い → 今までどおり匿名で入る
    _anonSignIn();
  }
  _firstAuthEvent = false;
  // クラウド同期側に通知（ログイン/ログアウトでボタン表示などを更新）
  if (typeof window._cloudSyncOnAuth === 'function') {
    try { window._cloudSyncOnAuth(user); } catch (e) { console.warn('cloudSyncOnAuth failed', e); }
  }
});

// リダイレクト方式（iPhoneのホーム画面アプリなど、ポップアップが使えない時）の戻りを受け取る
getRedirectResult(auth).catch((e) => {
  console.warn('Google redirect sign-in result error:', e);
  if (typeof window._cloudSyncOnRedirectError === 'function') {
    try { window._cloudSyncOnRedirectError(e); } catch (e2) {}
  }
});
