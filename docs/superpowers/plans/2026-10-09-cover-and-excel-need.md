# PDF表紙A-1＋必要保障額のPDF・Excel＋Excelの折り返しなし Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計書 `docs/superpowers/specs/2026-10-06-cover-and-excel-need-design.md` のとおり、PDF表紙を案A-1に作り直し、必要保障額をPDF表紙とExcelに載せ、ExcelのCF表シートで折り返しをなくす。

**Architecture:** 表紙に載せる値は新しい `js/cover.js` の `getCoverData()` が1か所で作り、print.js はそれを A-1 の HTML に組む。Excel の情報欄は新しい `js/xl-layout.js` の `xlPack()` が文字幅（canvas で実測）から結合列数を決め、1行に収まらない分は次の行へ送る。万が一Excelには必要保障額の4行×3枠（行の型 `need`）を追加し、総金融資産の根拠のマスに色枠を付ける。計算（R・MR）は一切変えない。

**Tech Stack:** バニラJS（GitHub Pages）、xlsx-js-style、headless Edge テスト（tools/edge-harness.js）。

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| Create `js/cover.js` | `getCoverData(kind)`：表紙の値（お客様・家族・期間・自己資金・ローン・資産・買い替え・メモ・万が一の見出し／必要保障額） |
| Create `js/xl-layout.js` | `xlTextPx(text,pt,bold)`・`xlColsFor(text,opt)`・`xlPack(items,firstCol,lastCol,opt)`：Excel情報欄の配置計算 |
| Modify `js/print.js` | `_ppBuild` の表紙を `_ppCoverHtml(data)` に置き換え、表紙は見出し帯なしの全面ページ。複数タブは各タブの `getCoverData` を写し取る |
| Modify `css/style.css` | `.ppc-*`（A-1 表紙）のクラスを追加 |
| Modify `js/export.js` | 万が一・通常とも情報欄を `xlPack` で組む（infoSpan/infoDataLens を廃止）、万が一に `need` 行と根拠マスの色枠、info 行の wrapText をやめ行高を1行分に |
| Modify `index.html` / `sw.js` | 新しい2ファイルの読込（`?v=1`）と ASSETS 追加 |
| Modify `tools/print-test.js` | 表紙の検査（1ページに収まる・必要保障額が MR.need と一致・前提条件の数字が画面と一致） |
| Modify `tools/mgtab-test.js` | Excel の検査（必要保障額3枠の値、根拠マスの色枠、CF表シートに wrapText なし（注釈・警告を除く）、情報欄の文字が結合幅に収まる） |

---

### Task 1: xl-layout.js（文字幅と配置）

**Files:** Create `js/xl-layout.js`; Modify `index.html`（`<script src="js/xl-layout.js?v=1">` を export.js の前に）, `sw.js`（ASSETS に追加）

- [ ] **Step 1: 実装**

```js
// xl-layout.js — Excel出力の情報欄を「折り返さずに1行で」並べるための配置計算
// Excelの列幅 wch:7 ≒ 54px（既定フォントの数字幅7px×7＋余白5px）。文字幅は canvas で実測する
const XL_COL_PX = 54;
let _xlCanvas = null;
function xlTextPx(text, pt, bold){
  if(!_xlCanvas) _xlCanvas = document.createElement('canvas');
  const ctx = _xlCanvas.getContext('2d');
  ctx.font = `${bold?'bold ':''}${Math.round((pt||10)*96/72)}px "Yu Gothic","Meiryo",sans-serif`;
  return ctx.measureText(String(text||'')).width;
}
// その文字が1行で収まる列数（左右の余白12px込み）
function xlColsFor(text, opt){
  const o = opt||{};
  return Math.max(o.min||2, Math.ceil((xlTextPx(text, o.pt||12, o.bold!==false) + 12) / (o.colPx||XL_COL_PX)));
}
// items: [{text, pt?, bold?}] を firstCol〜lastCol に左から詰める。入りきらない項目は次の行へ
// 戻り値: [[{text, c0, c1, item}], ...]（行ごと）
function xlPack(items, firstCol, lastCol, opt){
  const lines = [[]]; let c = firstCol;
  items.forEach(it=>{
    const n = Math.min(xlColsFor(it.text, {pt:it.pt||(opt&&opt.pt), bold:it.bold}), lastCol-firstCol+1);
    if(c + n - 1 > lastCol && lines[lines.length-1].length){ lines.push([]); c = firstCol; }
    lines[lines.length-1].push({text:it.text, c0:c, c1:c+n-1, item:it});
    c += n;
  });
  return lines;
}
```

- [ ] **Step 2:** `node tools/check.js` が合格すること。コミット。

### Task 2: 万が一Excelの情報欄を xlPack で組む

**Files:** Modify `js/export.js`（`exportExcelMG` 内の 頭金の内訳〜その他金融資産、セル結合、info 行の書式）

- [ ] **Step 1:** 情報欄を項目配列で作り、`pushInfo(label, items, cls)` で追加する。`pushInfo` は `xlPack(items, 2, disp+1)` の各行を `[label or '', '', ...cells]` として push し、`xlInfoCells.push({r, c0, c1})` を記録する（2行目以降のラベルは空）。ペアローンの「ご主人様のローン」「奥様のローン」も `pushInfo` で（ラベルは今と同じ）。
- [ ] **Step 2:** セル結合は `xlInfoCells` から作る（`ws['!merges'].push({s:{r,c:c0},e:{r,c:c1}})`）。`infoSpan`・`infoDataLens` の計算を削除。info 行の A+B 結合はそのまま。
- [ ] **Step 3:** 書式：info 行の値セルは `xlInfoCells` に含まれるセルだけ塗る（含まれない列は `_noFill`/`_noBorder`）。`wrapText:false`、行の高さ `hpt:20`（ペア行も20）。
- [ ] **Step 4:** `node tools/diff-excel.js` 合格（金額は変わらない）。コミット。

### Task 3: 通常Excelの情報欄を xlPack で組む

**Files:** Modify `js/export.js`（`exportExcel` 内の同じ部分・結合・書式）

- [ ] 手順は Task 2 と同じ（`_isPairRow` の「3チップ目5列」特例は不要になる）。`node tools/diff-excel.js`・`node tools/calc-test.js` 合格でコミット。

### Task 4: 万が一Excelの必要保障額（4行×3枠＋説明）と根拠マスの色枠

**Files:** Modify `js/export.js`

- [ ] **Step 1:** 今の `必要保障額` の1行（`push(needRow,'info')`）を次に置き換える。年の列 `2..disp+1` を3等分（`span=Math.floor(disp/3)`、最後の枠は残り全部）。4行を型 `need` で push し、`xlNeedCells` に {r,c0,c1,tier,line} を記録。
  - 1行目：`最低限　お金が尽きないために`／`標準（生活費N年分）　暮らしが行き詰まらないために`／`安心　今の生活と資産計画を守るために`
  - 2行目：`1,250万円`（MR.need.min/std/safe）
  - 3行目：`根拠：2085年（奥様88歳）`（根拠の列 i が -1 なら空）
  - 4行目：最低限＝`CF表の最後の年に、預貯金と有価証券がマイナスにならない額`／標準＝`どの年も、預貯金と有価証券で生活費N年分を確保できる額`／安心＝`CF表の最後の年に残るお金が、万が一がなかった場合と同じになる額`（safeMode==='floor' なら `（標準＋生活費2年分）` を付ける）
  - 続けて説明行（型 `need`）：`枠の色：■最低限の根拠　■標準の根拠　■安心の根拠（総金融資産のマス）。保険金などで万が一の年に受け取る想定の額です`
  - A列ラベル `必要保障額` は1〜4行目を縦に結合。
- [ ] **Step 2:** 書式：`need` 行は枠ごとに薄い背景（最低限 FFFFF7E6・標準 FFEAF7EF・安心 FFEEF2F9）、1行目は枠の色の文字・太字＋上罫線 medium（D97706／0F9D58／1E3A5F）、2行目は sz15 太字、3行目 sz9 灰、4行目 sz9。wrapText:false。行高 18/24/16/16、説明行 16。
- [ ] **Step 3:** 総金融資産の行（型 `totalAsset`）で、列 `2+MR.need.iMin`（min>0 のとき）・`2+iStd`・`2+iSafe` のセルに border 4辺 `medium`、色 F59E0B／0F9D58／60A5FA（同じセルに重なったら安心→標準→最低限の順で上書き）。
- [ ] **Step 4:** diff-excel の INFO_ROWS は「必要保障額」で始まる行と説明行を無視するので変更不要か確認（説明行のラベルは空。値に数字が無いので onlyExcel に出ないことを確認）。コミット。

### Task 5: CF表シートの残りの折り返しをやめる

- [ ] 万が一・通常の両方で `wrapText` を使う箇所を確認し、注釈行（改行を保つ）と残高警告行（全列結合）以外は `wrapText:false`。info 行の高さを 20 に。`node tools/print-test.js`（印刷は Excel と無関係だが一式）・`diff-excel` 合格でコミット。

### Task 6: cover.js（表紙の値）

**Files:** Create `js/cover.js`; Modify `index.html`・`sw.js`

- [ ] `getCoverData(kind)` を実装。値の出どころは画面の上部サマリー（cf-table.js 60〜274 行）と同じ入力欄・同じ計算：
  - `client, isM, loanForm('single'|'pair'|'joint'|'flat'|'flatPair'|'cash'), period{y0,yN,n}, family[{lbl,age}], date, staff`
  - `cash{total, down, downLbl, cost, costLbl, move, moveLbl, after}`
  - `loan{price, delivery, rows:[{who, amt, rate, rateKind, yrs}]}`（現金一括は rows 空）
  - `assets{items:[{lbl,val}], total}`、`swap`（買い替え予定の文、無ければ null）、`memo`（window._cfSummaryNote）
  - kind==='mg' のとき `mg{title, sub(その年・家族の年齢), color(window._mgKindColor), need:MR.need, basis(i)→'2085年（奥様88歳）'}`
- [ ] コミット。

### Task 7: PDF表紙を A-1 に

**Files:** Modify `js/print.js`, `css/style.css`

- [ ] `_ppBuild` の表紙ページを、見出し帯なしの全面ページ `addCover(html)` に変更（ページ番号の pp-foot は残す）。中身は `_ppCoverHtml(data)`：左帯（白一色ロゴ `filter:brightness(0) invert(1)`・表題・お客様名・タグ・期間・家族・万が一の見出し・作成日／担当）、右（万が一は必要保障額3枚＋色枠説明、前提条件の大枠：自己資金フロー／ローン表／買い替え／資産＋メモ）。デザインは `docs/superpowers/specs/mock_cover_n2.html`・`mock_cover_mg2.html` を 277×193mm に合わせて移植（クラス名 `ppc-`）。
- [ ] 1ページに収まらないときは右側の文字を 0.92 倍ずつ最大4回縮める（`scrollHeight>clientHeight` で判定）。
- [ ] `openPrintPreviewMG` で各タブ切替時に `getCoverData('mg')` を写し取り、sections に `cover` として渡す。単独印刷も同様。
- [ ] 旧 `.pp-cover*` のCSSは残す（削除はユーザー確認が必要なため）。コミット。

### Task 8: テスト

- [ ] print-test：通常（単独・ペア・現金一括・買い替えあり・長いメモ）と万が一（死亡・障害1級）で、表紙が1ページに収まる（`.ppc-right` の scrollHeight≦clientHeight）、必要保障額の3つの数字が MR.need と一致、前提条件の現預金合計・購入後残高・借入額が画面の上部サマリーの数字と一致。
- [ ] mgtab-test：万が一Excel（`exportExcelMG` の ws を横取り）で need 行の金額が MR.need と一致、根拠マスに medium の色枠、CF表シートの wrapText セルが注釈・警告以外に無い、情報欄の各セルで `xlTextPx(text)+12 ≦ (c1-c0+1)*54`。通常Excelも wrapText と幅を同様に検査。
- [ ] 自動チェック一式合格でコミット。

### Task 9: 確認と本番

- [ ] 見本と同じ条件でPDF表紙・Excelを撮影してユーザーに送る。了承後、版数を上げて（`origin/main` を fetch して差分確認してから）本番へ。
