// explain-edu.js — 教育費の3区分内訳ポップアップ
// rowKey: edu0, edu1, edu2, edu3 （子ごと）

(function(){
  if(typeof registerExplainRenderer!=='function') return;
  // 子どもは最大4人想定（第一子〜第四子）
  for(let ci=0;ci<4;ci++){
    enableExplainForRow(`edu${ci}`);
    (function(childIdx){
      registerExplainRenderer(`edu${childIdx}`, function(ctx){
        const R=ctx.R;
        const i=ctx.colIndex;
        const bd=R.eduBd && R.eduBd[childIdx] ? R.eduBd[childIdx][i] : null;
        const cLbls=['第一子','第二子','第三子','第四子'];
        const cLabel=cLbls[childIdx]||'お子様';
        const year=ctx.year;

        if(!bd || bd.total<=0 || !bd.stage){
          return {
            title:`${cLabel} 教育費 内訳`,
            simple:`${year}年は教育費の計上がありません。`,
            detail:null
          };
        }

        const s=bd.stage;
        const yen=(v)=>v>0?v.toLocaleString()+'万':'—';

        // 保育は1区分のみ
        if(s.stage==='hoiku'){
          return {
            title:`${cLabel} 教育費 内訳`,
            simple:`<div style="font-size:13px;margin-bottom:6px"><b>${year}年 / ${s.gradeName}</b></div>
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <tr><td style="padding:4px 6px">保育料</td><td style="text-align:right;padding:4px 6px"><b>${yen(bd.total)}</b></td></tr>
                <tr style="border-top:2px solid #333"><td style="padding:4px 6px"><b>合計</b></td><td style="text-align:right;padding:4px 6px"><b>${yen(bd.total)}</b></td></tr>
              </table>
              <div style="font-size:11px;color:#64748b;margin-top:8px">※ 2019年10月から認可保育園・幼稚園の3-5歳は原則無償化対象です（世帯による）</div>`,
            detail:null
          };
        }

        // 大学は 授業料/入学金+施設費/生活費
        if(s.stage==='univ'){
          return {
            title:`${cLabel} 教育費 内訳`,
            simple:`<div style="font-size:13px;margin-bottom:6px"><b>${year}年 / ${s.gradeName}</b></div>
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <tr><td style="padding:4px 6px">授業料</td><td style="text-align:right;padding:4px 6px">${yen(bd.eduFee)}</td></tr>
                <tr><td style="padding:4px 6px">入学金・施設費</td><td style="text-align:right;padding:4px 6px">${yen(bd.lunch)}</td></tr>
                <tr><td style="padding:4px 6px">生活費</td><td style="text-align:right;padding:4px 6px">${yen(bd.extra)}</td></tr>
                <tr style="border-top:2px solid #333"><td style="padding:4px 6px"><b>合計</b></td><td style="text-align:right;padding:4px 6px"><b>${yen(bd.total)}</b></td></tr>
              </table>
              <div style="font-size:11px;color:#64748b;margin-top:8px">※ 文科省「私立大学入学者に係る初年度学生納付金平均額」およびJASSO「学生生活調査」を参照</div>`,
            detail:null
          };
        }

        // 小中高は3区分
        const hasLunch=bd.lunch>0;
        return {
          title:`${cLabel} 教育費 内訳`,
          simple:`<div style="font-size:13px;margin-bottom:6px"><b>${year}年 / ${s.gradeName}</b></div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <tr><td style="padding:4px 6px">学校教育費<span style="color:#64748b;font-size:10px"> (授業料・教材・制服等)</span></td><td style="text-align:right;padding:4px 6px">${yen(bd.eduFee)}</td></tr>
              ${hasLunch?`<tr><td style="padding:4px 6px">学校給食費</td><td style="text-align:right;padding:4px 6px">${yen(bd.lunch)}</td></tr>`:''}
              <tr><td style="padding:4px 6px">学校外活動費<span style="color:#64748b;font-size:10px"> (塾・習い事等)</span></td><td style="text-align:right;padding:4px 6px">${yen(bd.extra)}</td></tr>
              <tr style="border-top:2px solid #333"><td style="padding:4px 6px"><b>合計</b></td><td style="text-align:right;padding:4px 6px"><b>${yen(bd.total)}</b></td></tr>
            </table>
            <div style="font-size:11px;color:#64748b;margin-top:8px">※ 文部科学省「子供の学習費調査」の区分に準拠${s.stage==='high'&&s.schoolType==='public'?'<br>※ 高校公立は「就学支援金控除前」の金額です':''}</div>`,
          detail:null
        };
      });
    })(ci);
  }
})();
