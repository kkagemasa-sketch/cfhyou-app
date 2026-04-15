// Firebase初期化 + 匿名認証 + マンションマスター共有
// ES Modules (type="module") で読み込む
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
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
  collection, doc, getDocs, setDoc, deleteDoc,
  storageRef, uploadBytes, getDownloadURL, deleteObject,
  signInAnonymously
};

// Firebase準備完了を通知するPromise
window._firebaseReady = false;
window._firebaseReadyPromise = new Promise((resolve) => {
  window._firebaseReadyResolve = resolve;
});

// 匿名サインイン実行
signInAnonymously(auth).catch((e) => {
  console.error('Anonymous sign-in failed:', e);
  // サインイン失敗してもReadyは解決する（オフライン時も動作させるため）
  window._firebaseReadyResolve(false);
});

// 認証状態監視
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('[Firebase] 匿名認証完了 uid:', user.uid);
    window._firebaseReady = true;
    window._firebaseReadyResolve(true);
    // マンションマスターを再読み込み（既に初期ロード済みでも最新に更新）
    if (typeof window.loadMansionMaster === 'function') {
      window.loadMansionMaster();
    }
  }
});
