#!/usr/bin/env node
/* =========================================================================
 *  自動チェック（CF表アプリ）
 *  過去に何度も起きたバグの「観点」を機械が点検する。
 *  - ① 存在しないID参照   … ERROR（コミットを止める）
 *  - ② JS構文エラー        … ERROR（コミットを止める）
 *  - ③ 新規作成クリア漏れ  … WARN （警告のみ・止めない）
 *
 *  使い方:  node tools/check.js
 *  終了コード: ERRORが1件でもあれば 1 / それ以外は 0
 * ========================================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const errors = [];
const warns  = [];
const E = (m) => errors.push(m);
const W = (m) => warns.push(m);

function read(f){ try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch(e){ return ''; } }
function listJs(){ return fs.readdirSync(path.join(ROOT,'js')).filter(f=>f.endsWith('.js')).map(f=>'js/'+f); }
function listHtml(){ return fs.readdirSync(ROOT).filter(f=>f.endsWith('.html')); }

/* ---------------------------------------------------------------------------
 * 定義済みID（HTML+JSのどこかで作られているID）を集める
 * --------------------------------------------------------------------------- */
function collectDefinedIds(){
  const staticIds = new Set();   // 完全に固定のID
  const dynamicPatterns = [];    // ${} を含む動的ID → 正規表現に変換

  const addFromText = (text)=>{
    // id="...", id='...', id=`...`
    const re = /\bid\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    let m;
    while((m = re.exec(text))){
      const v = m[2] ?? m[3] ?? m[4] ?? '';
      addId(v);
    }
    // el.id = '...', .setAttribute('id','...')
    const re2 = /\.id\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    while((m = re2.exec(text))){
      const v = m[2] ?? m[3] ?? m[4] ?? '';
      addId(v);
    }
    const re3 = /setAttribute\(\s*['"]id['"]\s*,\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/g;
    while((m = re3.exec(text))){
      const v = m[2] ?? m[3] ?? m[4] ?? '';
      addId(v);
    }
  };
  const addId = (v)=>{
    if(!v) return;
    if(v.includes('${') || v.includes('"+') || v.includes("'+")){
      // 動的ID → ${...} を「ID文字として妥当な範囲」に置換した正規表現を作る。
      // ただし固定部分(リテラル)が乏しい(=ほぼ何でも一致する)パターンは、
      // 全IDを"定義済み"扱いして検知不能にするため採用しない。
      const literalOnly = v.replace(/\$\{[^}]*\}/g,'').replace(/["'+]/g,'');
      if(literalOnly.length === 0) return; // 例: "${x}" 単体は「何でも一致」になるため無視
      const esc = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 一旦全エスケープ
      const pat = esc.replace(/\\\$\\\{[^}]*\\\}/g, "[^\"'\\s]+"); // \${...} を「クォート/空白以外」に
      dynamicPatterns.push(new RegExp('^'+pat+'$'));
    } else {
      staticIds.add(v);
    }
  };

  listHtml().forEach(f=>addFromText(read(f)));
  listJs().forEach(f=>addFromText(read(f)));
  return { staticIds, dynamicPatterns };
}

/* ---------------------------------------------------------------------------
 * ① 存在しないID参照（ERROR）
 *   iv('x') fv('x') _v('x') getElementById('x') $('x') 等で読むIDが
 *   どこにも定義されていなければエラー。
 *   （${}や文字列連結の動的読み取りは対象外＝静的に判定できないため）
 * --------------------------------------------------------------------------- */
function checkMissingIds(defined){
  const { staticIds, dynamicPatterns } = defined;
  // 絶対的なDOM ID を読む関数だけを対象にする。
  // _v / _lpf / _lpi / mgQA_iv / mgQA_fv は「カード内の相対名」や「保存データのキー」を
  // 読むスコープ付きヘルパーで、引数は本物のIDではないため対象外。
  const HELPERS = '(?:iv|fv|fvd|ivd|getElementById|\\$)';
  // HELPER('...') の直後に + が続けば「文字列連結('mcard-'+id 等)」＝動的なので除外する
  // 左に英数字/_/$ があれば別関数の一部（例: mgQA_fv の fv）なので除外（負の後読み）
  const re = new RegExp("(?<![A-Za-z0-9_$])" + HELPERS + "\\(\\s*('([^'$+]*)'|\"([^\"$+]*)\")\\s*(\\+)?", 'g');
  // 既知・調査済み: いずれも if(...) でガードされ落ちはしないが、参照先IDが存在しない
  // （＝古い機能の残骸 or 別経路に置換済み）。新規の参照ミスを止めるためベースラインから除外。
  // ※ユーザー判断で整理する候補。整理が済んだら下から削除する。
  const allowlist = new Set([
    // 遺族年金「夫婦個別の手動上書き」欄（現在は単一 mg-surv-amt に置換済み＝常に無効）
    'surv-h-amt','surv-w-amt','surv-h-box','surv-w-box','surv-h-auto-val','surv-w-auto-val','mg-surv-auto-note',
    // 休業(産休育休)の旧コンテナ（addLeave の追加先が無く画面に出ない＝旧経路）
    'leave-cont',
    // 繰上返済プラン/CF切替トグルの旧ID（ガード済みで無害）
    'lp-prepay-cont','btn-toggle-cf',
  ]);
  const found = new Map(); // id -> [file...]

  listJs().forEach(f=>{
    const text = read(f);
    let m;
    while((m = re.exec(text))){
      const id = m[2] ?? m[3] ?? '';
      const concat = !!m[4];
      if(!id) continue;                 // $() 空など
      if(concat) continue;              // 'prefix-'+var の連結 → 動的IDなので対象外
      if(/[-_]$/.test(id) || /^[-_]/.test(id)) continue; // 連結の断片(末尾/先頭が区切り)
      if(id.includes(' ')) continue;    // CSSセレクタ等は除外
      if(allowlist.has(id)) continue;
      const ok = staticIds.has(id) || dynamicPatterns.some(p=>p.test(id));
      if(!ok){
        if(!found.has(id)) found.set(id, new Set());
        found.get(id).add(f);
      }
    }
  });

  found.forEach((files, id)=>{
    E(`存在しないID参照: '${id}' を読んでいますが、HTML/JSのどこにも定義がありません`
      + `\n      → 読んでいる場所: ${[...files].join(', ')}`
      + `\n      → 過去の「iv('ha')」「flat-loan-amt」と同じ型のバグ。IDのスペルか、入力欄の追加漏れを確認してください。`);
  });
}

/* ---------------------------------------------------------------------------
 * ② JS構文エラー（ERROR）
 * --------------------------------------------------------------------------- */
function checkSyntax(){
  listJs().forEach(f=>{
    try {
      cp.execSync(`node --check "${path.join(ROOT,f)}"`, {stdio:'pipe'});
    } catch(e){
      const msg = (e.stderr ? e.stderr.toString() : e.message).trim().split('\n').slice(0,3).join('\n      ');
      E(`JS構文エラー: ${f}\n      ${msg}`);
    }
  });
}

/* ---------------------------------------------------------------------------
 * ③ 新規作成クリア漏れ（WARN）
 *   動的に行が増えるコンテナ(id末尾 -cont/-list/-container)が、
 *   新規作成のリセット関数 _resetSheetState でクリアされているか。
 *   （買い替えイベント残留・その他家族残留 と同じ型）
 * --------------------------------------------------------------------------- */
function checkResetClears(){
  const html = listHtml().map(read).join('\n');
  const allText = listJs().map(read).join('\n');

  // 指定名の関数本体をざっくり取り出す（function宣言 / window.x=function / x=function）
  const fnBody = (name)=>{
    const pats = [
      'function\\s+'+name+'\\s*\\(',
      '\\b'+name+'\\s*=\\s*function\\s*\\(',
      '\\b'+name+'\\s*[:=]\\s*function\\s*\\(',
    ];
    for(const p of pats){
      const m = new RegExp(p).exec(allText);
      if(m){
        const start = m.index;
        // 次の関数宣言までを本体とみなす（近似）
        const next = allText.slice(start+m[0].length).search(/\n(?:function |window\.\w+\s*=\s*function|\w+\s*=\s*function)/);
        return next<0 ? allText.slice(start) : allText.slice(start, start+m[0].length+next);
      }
    }
    return '';
  };

  let resetCore = fnBody('_resetSheetState');
  if(!resetCore){ W('③ _resetSheetState が見つからず、新規作成クリアの点検をスキップしました'); return; }

  // リセットが呼ぶ関数の中身も「新規作成で実行される範囲」に含める（1段階）
  const called = new Set();
  let cm; const callRe = /\b([a-zA-Z_]\w*)\s*\(/g;
  const SKIP = new Set(['if','for','while','switch','parseInt','parseFloat','Math','Number','String','Object','Array','JSON','getElementById','querySelector','querySelectorAll','forEach','typeof','console','Boolean','setTimeout','function','isArray','fvd','iv','fv','$']);
  while((cm = callRe.exec(resetCore))){ if(!SKIP.has(cm[1])) called.add(cm[1]); }
  let reset = resetCore;
  called.forEach(fn=>{ reset += '\n' + fnBody(fn); });

  // reset範囲内で innerHTML クリアされるIDを集める（テンプレート ${} も対応）
  const clearedStatic = new Set();
  const clearedPatterns = [];
  const clrRe = /(?:getElementById|\$)\(\s*(`[^`]*`|'[^']*'|"[^"]*")\s*\)\s*\.innerHTML\s*=/g;
  let km;
  while((km = clrRe.exec(reset))){
    const raw = km[1].slice(1,-1); // クォート除去
    if(raw.includes('${')){
      const esc = raw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\$\\\{[^}]*\\\}/g,'.+');
      clearedPatterns.push(new RegExp('^'+esc+'$'));
    } else {
      clearedStatic.add(raw);
    }
  }
  const isCleared = (id)=> reset.includes(id) || clearedStatic.has(id) || clearedPatterns.some(p=>p.test(id));

  const allJs = listJs().map(read).join('\n');
  // 顧客データではないUI用コンテナ（毎回作り直すバリデーション表示など）は除外
  const allowlist = new Set(['err-list']);

  const re = /\bid\s*=\s*("([^"]*)"|'([^']*)')/g;
  const containers = new Set();
  let m;
  while((m = re.exec(html))){
    const v = m[2] ?? m[3] ?? '';
    if(/(-cont|-list|-container)$/.test(v)) containers.add(v);
  }

  containers.forEach(id=>{
    if(allowlist.has(id)) return;
    if(isCleared(id)) return;                     // 新規作成の範囲でクリア済み＝安全

    // このコンテナを掴む変数名（別名）を集める: const x = getElementById('id') / $('id')
    const aliases = new Set();
    const aliasRe = new RegExp("(\\w+)\\s*=\\s*(?:document\\.)?(?:getElementById|\\$)\\(\\s*['\"]"+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"['\"]\\s*\\)", 'g');
    let a;
    while((a = aliasRe.exec(allJs))) aliases.add(a[1]);

    // 「追加式」で書かれているか（appendChild / insertAdjacentHTML / innerHTML += ）
    const targets = [id, ...aliases];
    const isAdditive = targets.some(t=>{
      const tEsc = t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const reAdd = new RegExp("(?:getElementById|\\$)\\(\\s*['\"]"+tEsc+"['\"]\\s*\\)\\s*\\.(?:appendChild|insertAdjacentHTML)|\\b"+tEsc+"\\s*\\.(?:appendChild|insertAdjacentHTML)|\\b"+tEsc+"(?:'\\))?\\s*\\.innerHTML\\s*\\+=");
      return reAdd.test(allJs);
    });
    if(!isAdditive) return;                      // 追加式でない＝毎回作り直す or 静的 → 安全
    // 注: 他の場所に innerHTML='' があっても「新規作成時に必ず消える」保証にはならない。
    //     （swap-events-cont は復元関数内にクリアがあったが、保存データが無い新規作成では
    //       呼ばれず古いカードが残った＝実バグだった）。よって _resetSheetState を唯一の正とする。

    W(`③ 新規作成クリア漏れの疑い: コンテナ '${id}' は行を追加(appendChild)しますが、_resetSheetState でクリアされていません`
      + `\n      → 新規作成で前のお客様のデータが残る恐れ（買い替えイベント残留と同じ型）。`
      + `\n      → 本当に追加式なら save-load.js の _resetSheetState に「$('${id}').innerHTML='';」を足してください。`);
  });
}

/* ------------------------------ 実行 ------------------------------ */
console.log('🔍 自動チェック開始 …\n');
const defined = collectDefinedIds();
checkSyntax();
checkMissingIds(defined);
checkResetClears();

if(warns.length){
  console.log(`⚠️  警告 ${warns.length}件（コミットは止めません）:`);
  warns.forEach((w,i)=>console.log(`  ${i+1}. ${w}`));
  console.log('');
}
if(errors.length){
  console.log(`❌ エラー ${errors.length}件（コミットを止めます）:`);
  errors.forEach((e,i)=>console.log(`  ${i+1}. ${e}`));
  console.log('\n→ 上のエラーを直してから、もう一度コミットしてください。');
  process.exit(1);
}
console.log('✅ チェック完了：止めるべきエラーはありません。');
process.exit(0);
