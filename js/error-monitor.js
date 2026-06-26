// error-monitor.js — エラー監視（Sentry + ローカルログ）
// Sentry が設定されていればクラウド送信、未設定でもローカルに記録します
// 個人情報（顧客名・年収等）は送信しません

(function(){
  'use strict';

  // ===== 設定 =====
  // Sentryアカウント作成後、ここに DSN を貼り付けてください
  // 例: const SENTRY_DSN = 'https://abc123@o123456.ingest.sentry.io/789';
  const SENTRY_DSN = ''; // ← ここに DSN を入れる

  // ローカルログの最大保持件数
  const MAX_LOCAL_LOGS = 100;
  const LOCAL_STORAGE_KEY = 'cf_error_log_v1';

  // 個人情報を含む可能性のあるキーパターン（送信時にマスク）
  const PII_PATTERNS = [
    /client[-_]?name/i,
    /husband[-_]?name/i,
    /wife[-_]?name/i,
    /address/i,
    /tel|phone/i,
    /email|mail/i,
    /password|passwd/i,
    /pi[-_]?notes/i,
    /surv[-_]?notes/i
  ];

  function _isPiiKey(key){
    if(!key) return false;
    return PII_PATTERNS.some(re => re.test(key));
  }

  // エラー情報から個人情報を除外
  function _sanitizeError(errInfo){
    if(!errInfo || typeof errInfo !== 'object') return errInfo;
    const sanitized = JSON.parse(JSON.stringify(errInfo));
    function _scrub(obj){
      if(!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(k=>{
        if(_isPiiKey(k)){
          obj[k] = '[REDACTED]';
        } else if(typeof obj[k] === 'object'){
          _scrub(obj[k]);
        } else if(typeof obj[k] === 'string' && obj[k].length > 500){
          // 長すぎる文字列も切り詰め
          obj[k] = obj[k].substring(0, 500) + '...[truncated]';
        }
      });
    }
    try{ _scrub(sanitized); }catch(e){}
    return sanitized;
  }

  // ===== ローカルエラーログ =====
  function _loadLocalLog(){
    try{
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }

  function _saveLocalLog(logs){
    try{
      // 古いものから削除して上限維持
      const trimmed = logs.slice(-MAX_LOCAL_LOGS);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
    }catch(e){ /* 容量超過等は無視 */ }
  }

  function _appendLocalLog(entry){
    const logs = _loadLocalLog();
    logs.push(entry);
    _saveLocalLog(logs);
    // バッジ表示更新
    _updateBadge();
  }

  // ===== エラーバッジ表示 =====
  function _updateBadge(){
    // 右上の赤い数字バッジは表示しない（ユーザーから「うっとおしい」との要望）。
    // エラー記録自体は裏で継続し、必要時は「エラーログをダウンロード」で取得できる。
    // 既に表示済みのバッジがあれば消す。
    document.querySelectorAll('.err-badge').forEach(el=>el.remove());
  }

  // ===== Sentry 初期化（DSN設定時のみ） =====
  function _initSentry(){
    if(!SENTRY_DSN) return false;
    if(typeof Sentry === 'undefined') return false;
    try{
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: location.hostname.includes('localhost') ? 'dev' : 'production',
        release: 'housefit@' + (window._appVersion || 'unknown'),
        // パフォーマンス監視は無効化（無料枠節約）
        tracesSampleRate: 0,
        // セッションリプレイも無効化
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // 送信前フィルター
        beforeSend(event, hint){
          // 個人情報をマスク
          if(event.user) delete event.user;
          if(event.request && event.request.cookies) delete event.request.cookies;
          // タグから機微な情報を除外
          try{ event = _sanitizeError(event); }catch(e){}
          return event;
        },
        // 一部の頻発・無害なエラーを無視
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          /^Network request failed/,
          /Loading chunk \d+ failed/
        ]
      });
      console.info('[error-monitor] Sentry initialized');
      return true;
    }catch(e){
      console.warn('[error-monitor] Sentry init failed:', e);
      return false;
    }
  }

  // 既知・無害で記録しないエラー（ログとバッジのノイズ防止）
  // 例: PWA更新確認の一時的な通信失敗（計算・表示に影響なし）
  const _IGNORE_MESSAGES = [
    /Failed to update a ServiceWorker/i,
    /ServiceWorker[^]*fetching the script/i,
    /ResizeObserver loop/i
  ];
  function _isIgnorable(info){
    const msg = info && info.message ? String(info.message) : '';
    return _IGNORE_MESSAGES.some(re => re.test(msg));
  }

  // ===== グローバルエラーハンドラ =====
  function _captureError(type, info){
    if(_isIgnorable(info)) return; // 無害な既知エラーは記録しない
    const entry = {
      type: type,
      timestamp: new Date().toISOString(),
      url: location.href.replace(/\?.*$/, ''), // クエリストリング除去
      userAgent: navigator.userAgent,
      ...info
    };
    // ローカル保存（常に）
    _appendLocalLog(_sanitizeError(entry));
    // Sentryへ送信（設定されていれば）
    if(SENTRY_DSN && typeof Sentry !== 'undefined' && Sentry.captureException){
      try{
        if(info.error instanceof Error){
          Sentry.captureException(info.error);
        } else {
          Sentry.captureMessage(info.message || 'unknown error');
        }
      }catch(e){ console.warn('Sentry capture failed:', e); }
    }
  }

  // ===== グローバルハンドラ登録 =====
  function _registerHandlers(){
    window.addEventListener('error', function(ev){
      _captureError('javascript', {
        message: ev.message,
        source: ev.filename,
        line: ev.lineno,
        column: ev.colno,
        stack: ev.error && ev.error.stack ? ev.error.stack : null,
        error: ev.error
      });
    });
    window.addEventListener('unhandledrejection', function(ev){
      const reason = ev.reason;
      _captureError('promise', {
        message: reason && reason.message ? reason.message : String(reason),
        stack: reason && reason.stack ? reason.stack : null,
        error: reason instanceof Error ? reason : null
      });
    });
  }

  // ===== エラーログのダウンロード（ユーザー向け） =====
  function downloadErrorLog(){
    const logs = _loadLocalLog();
    if(logs.length === 0){
      alert('現在エラーログはありません。');
      return;
    }
    const blob = new Blob([JSON.stringify({
      app: 'HouseFit',
      version: window._appVersion || 'unknown',
      exported: new Date().toISOString(),
      userAgent: navigator.userAgent,
      logCount: logs.length,
      logs: logs
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `housefit-error-log-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  window.downloadErrorLog = downloadErrorLog;

  // エラーログのクリア
  function clearErrorLog(){
    if(!confirm(`エラーログ ${_loadLocalLog().length} 件を削除します。よろしいですか？`)) return;
    try{ localStorage.removeItem(LOCAL_STORAGE_KEY); }catch(e){}
    _updateBadge();
    alert('エラーログを削除しました。');
  }
  window.clearErrorLog = clearErrorLog;

  // エラーログ件数を取得（外部向け）
  function getErrorLogCount(){ return _loadLocalLog().length; }
  window.getErrorLogCount = getErrorLogCount;

  // ===== 起動 =====
  _registerHandlers();
  _initSentry();

  // バッジ表示は DOM 準備後
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', _updateBadge);
  } else {
    _updateBadge();
  }

  console.info('[error-monitor] active. Local logs:', _loadLocalLog().length, 'entries');
})();
