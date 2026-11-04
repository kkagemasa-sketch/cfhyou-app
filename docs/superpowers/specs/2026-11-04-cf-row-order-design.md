# CF表 収入・支出の行の並び替え — 設計（2026-11-04）

## 目的
CF表の収入の行・支出の行を、お客様ごとに好きな順に並べ替えられるようにする。画面・PDF・Excel（通常のCF表）で同じ並びにする。

## 操作
- 収入・支出の各行の左端の列（1列目）に小さな「▲」「▼」ボタンを出す。押すと1つ上／1つ下の行と入れ替わる。
- 収入は収入の中、支出は支出の中だけで動く（またぐ移動はしない）。
- 並びを変えているファイルでは「＋ 収入行を追加」「＋ 支出行を追加」の横に「並びを元に戻す」を出す。押すとその区分の並びを初期状態に戻す。
- ボタンは `<button>` なので、印刷プレビュー（print.js が button を全部消す）には出ない。

## データ
- `_cfRowOrder = {inc:[rowKey,...], exp:[rowKey,...]}`（state.js）。空＝初期の並び。
- rowKey は行名セルの `data-rowlbl`（例 `hInc`, `secDraw-h-1`, `edu0`）、手入力行は `data-custom-id`（`custom-…`）。
- 保存データ `d.cfRowOrder`（save-load.js: collect / restore（`d.dynamic.cfRowOrder` 優先、旧 `d.cfRowOrder` も可）/ 新規作成で `{inc:[],exp:[]}`）。`cfRowLabels` と同じ経路なので自動保存・クラウド同期にも乗る。

## 並べ直しの規則（画面・Excel共通 `cfOrderRows(section, rows)`、utils.js）
- `rows` = 初期の並びで集めた `{key, …}` の配列。
- 保存した並び `S` にある行を `S` の順に並べる。`S` にない行（後から増えた行）は、初期の並びで直前にある「`S` にある行」のすぐ後ろに入れる（直前がなければ先頭）。
- `S` にあるが今は存在しない行は無視する（消さない）。

## 画面（cf-table.js）
- 収入: `iRow`／手入力行／自動資産取崩し等を `incRows.push({key,html})` に集め、収入合計の前で `cfOrderRows('inc',incRows)` の順に出す。
- 支出: `eRow`／`eduRow`／車両費の行／手入力行を同様に `expRows` に集めて出す。
- 1列目に `<button class="row-mv" onclick="moveCfRow('inc','hInc',-1)">▲</button>` 等を出す。
- `moveCfRow(section,key,dir)`: 画面に出ている行のキー一覧（初期並びを `cfOrderRows` で並べたもの）を取り、隣と入れ替えた一覧を `_cfRowOrder[section]` に入れて `render()`、`scheduleAutoSave()`。
- `resetCfRowOrder(section)`: `_cfRowOrder[section]=[]` → `render()`、`scheduleAutoSave()`。

## Excel（export.js 通常CF）
- `addI`／`addE` に rowKey を渡し、まず配列に集めてから `cfOrderRows` で並べ直して `push`。既定の並びのときは今までと同じ順になる（既存の比較テストはそのまま通る）。

## 対象外
- 万が一タブの表（contingency.js）・万が一のExcel・まとめてPDFの万が一ページは初期の並びのまま。

## 確認
- ローカル（port 9065）で ▲▼ → 並びが変わる／保存→新規→読込で並びが戻る／PDFプレビューの表が同じ並び／Excelの行順が同じ。
- `node tools/check.js`、コミット前テスト（golden・印刷・Excel比較）が通ること。
