# CF表 セル・行の色付け（上書きセルの黄色廃止）設計書

作成日: 2026-11-06

## 目的
- 手で数値を上書きしたセルに付く黄色（背景・枠・茶色太字）をやめ、画面では右上の小さな点だけにする。PDFには点も出さない。
- 代わりに、任意のセル・行に背景色と文字色を付けられるようにし、PDF・Excel・万が一タブにも反映する。

## 画面の操作
- 数値セル（`td[data-row][data-col]`）を右クリック（タッチ端末は長押し 500ms）→ 色メニュー。
- 行名セル（`td[data-rowlbl]`、万が一は `mg-` 接頭辞付き）を右クリック／長押し → 「この行ぜんぶ」の色メニュー。
- メニュー: 上段「背景」= 赤・オレンジ・黄・緑・青・紫・ピンク・灰（淡色）＋なし。下段「文字」= 赤・オレンジ・緑・青・紫・灰＋黒（なし）。
- セル単位の色は行の色より優先。行メニューの「なし」は行の色とその行のセル単位の色を両方消す。
- 上書きの有無に関係なく付けられる。

## データ
- `cfCellColors = { cf:{}, mg:{} }`（state.js）。キーは `${rowKey}|${col}`、行全体は `${rowKey}|*`。値は `{bg:'o', fg:'r'}`（色コード1文字、無い方は省略）。
- 保存データ（`_collectSaveData`）に `cfCellColors` を追加。復元は `d.cfCellColors||{cf:{},mg:{}}`。新規作成・`_resetSheetState` で空。シナリオごとに独立、Undoにも含まれる。
- 万が一はご主人様／奥様で共通（mgOverrides と同じ）。

## 描画
- `applyCellColors(root, scope)`（utils.js）: 表の `td[data-row][data-col]` と `td[data-rowlbl]` に `style.setProperty('background-color', …, 'important')` / `color` を当てる。行名セルの既存 `!important` 背景に勝たせるため important 指定。
- 呼び出し: cf-table.js の `_rb.innerHTML=h` 直後（scope cf）、cf-ui.js setRTab の万が一挿入直後、mg-qa.js の `rb.innerHTML=html` 直後（scope mg）。
- `.cell-ovr` のCSSを「右上に小さな橙の点（::after）」に変更。print.js の `_ppCleanCell` で `cell-ovr` クラスを外す。

## PDF
- print.js は画面の表を複製するためインラインの色がそのまま出る。`-webkit-print-color-adjust:exact` は既存。

## Excel
- 通常CF: `push(row,type,key)` に rowKey を持たせ（`_incX/_expX` の key を渡す）、スタイル確定直前に `cfCellColors.cf` の `${key}|${c-2}` → `${key}|*` の順で背景・文字色を上書き。行名列（c=1）は行の色のみ。
- 万が一: 行名→rowKey の対応を `_mgStore` のHTMLを `DOMParser` で読んで作り、行名一致で同様に適用。
- 合計列は対象外（既存の帯色を維持）。

## 変更ファイル
state.js / save-load.js / utils.js（applyCellColors・色定義）/ 新規 js/cell-color.js（メニュー）/ cf-table.js / cf-ui.js / mg-qa.js / export.js / print.js / css/style.css / index.html

## 互換
- 旧データは色なしで開く。保存形式は項目追加のみ。計算・並び替えへの影響なし。
