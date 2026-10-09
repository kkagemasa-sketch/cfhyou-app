// xl-layout.js — Excel出力の情報欄（頭金の内訳・住宅ローン条件など）を「折り返さずに1行で」並べるための配置計算
// Excelの年の列幅 wch:7 ≒ 54px（既定フォントの数字幅7px×7＋余白5px）。文字の幅は canvas で実測する
const XL_COL_PX = 54;
let _xlCanvas = null;
// 文字列の表示幅（px）。pt はExcelのフォントサイズ
function xlTextPx(text, pt, bold){
  if(!_xlCanvas) _xlCanvas = document.createElement('canvas');
  const ctx = _xlCanvas.getContext('2d');
  ctx.font = `${bold?'bold ':''}${Math.round((pt||10)*96/72)}px "Yu Gothic","Meiryo",sans-serif`;
  return ctx.measureText(String(text==null?'':text)).width;
}
// その文字が1行に収まる列数（左右の余白12px込み）
function xlColsFor(text, opt){
  const o = opt||{};
  return Math.max(o.min||2, Math.ceil((xlTextPx(text, o.pt||12, o.bold!==false) + 12) / (o.colPx||XL_COL_PX)));
}
// items: [{text, pt?, bold?}] を firstCol〜lastCol に左から詰める。1行に入りきらない項目は次の行へ送る
// 戻り値: 行ごとの配列 [[{text, c0, c1, item}], ...]
function xlPack(items, firstCol, lastCol, opt){
  const o = opt||{};
  const lines = [[]]; let c = firstCol;
  (items||[]).forEach(it=>{
    const n = Math.min(xlColsFor(it.text, {pt:it.pt||o.pt, bold:it.bold}), lastCol-firstCol+1);
    if(c + n - 1 > lastCol && lines[lines.length-1].length){ lines.push([]); c = firstCol; }
    lines[lines.length-1].push({text:it.text, c0:c, c1:c+n-1, item:it});
    c += n;
  });
  return lines;
}
window.xlTextPx = xlTextPx; window.xlColsFor = xlColsFor; window.xlPack = xlPack;
