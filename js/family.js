// family.js — 子ども・その他メンバー管理

function addOther(){
  otherMemberCnt++;const id=otherMemberCnt;
  const el=document.createElement('div');
  el.id=`om-${id}`;
  el.style.cssText='background:#f0f4ff;border:1px solid #b0c0e0;border-radius:var(--rs);padding:8px 10px;margin-bottom:6px';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:#2a4a8a">その他</span>
      <button class="btn-rm" onclick="document.getElementById('om-${id}').remove();live()">× 削除</button>
    </div>
    <div class="g3">
      <div class="fg"><label class="lbl" style="font-size:9px">続柄・名称</label>
        <input class="inp" id="oml-${id}" placeholder="例:父・義母" oninput="live()" style="font-size:11px;padding:5px 8px"></div>
      <div class="fg"><label class="lbl" style="font-size:9px">現在年齢</label>
        <div class="suf"><input class="inp age-inp" id="oma-${id}" onfocus="scrollToCFRow('hInc',null)" onblur="cfRowBlur()" type="number" value="" placeholder="例:60" min="0" max="110" oninput="live()" style="font-size:11px;padding:5px 6px"><span class="sl" style="font-size:10px">歳</span></div></div>
      <div class="fg"><label class="lbl" style="font-size:9px">備考</label>
        <input class="inp" id="omn-${id}" placeholder="例:要介護" oninput="live()" style="font-size:11px;padding:5px 8px"></div>
    </div>`;
  document.getElementById('other-members-cont').appendChild(el);
}

function addChild(){
  if(cCnt>=4){alert('子どもは最大4人まで');return}
  cCnt++;const id=cCnt;
  const el=document.createElement('div');
  el.id=`cr-${id}`;
  el.style.cssText='background:#eef6fc;border:1px solid #b8d8ee;border-radius:var(--rs);padding:10px;margin-bottom:8px';
  const labs=['第一子','第二子','第三子','第四子'],defAges=[2,0,-2,-4];
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:#3a6a8a">${labs[id-1]}</span>
      <button class="btn-rm" onclick="rmChild(${id})">× 削除</button>
    </div>
    <div class="g3" style="margin-bottom:8px">
      <div class="fg"><label class="lbl">現在年齢</label>
        <div class="suf"><input class="inp" id="ca-${id}" type="number" value="${defAges[id-1]}" onfocus="scrollToCFRow('cAge${id-1}',iv('husband-age')||30)" onblur="cfRowBlur()" oninput="scrollToCFRow('cAge${id-1}',iv('husband-age')||30);live()" class="inp age-inp"><span class="sl">歳</span></div></div>
      <div class="fg"><label class="lbl">性別</label>
        <select class="sel" id="cg-${id}" onchange="live()"><option value="m">男の子</option><option value="f">女の子</option></select></div>
    </div>
    <div style="padding-top:2px;border-top:1px solid #a7f3d0;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:10px;font-weight:700;color:#1a6b2e">🍼 保育料（万円/年・実費入力）</div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <select class="sel" id="hoiku-type-${id}" onchange="live()" style="font-size:10px;padding:3px 5px;width:auto">
            <option value="hoikuen" selected>保育園</option>
            <option value="youchien">幼稚園</option>
          </select>
          <label style="font-size:10px;color:#5a6a7e;font-weight:600">入園年齢</label>
          <select class="sel" id="hoiku-start-${id}" onfocus="scrollToCFRowEduStage(${id},'hoiku')" onblur="cfRowBlur()" onchange="scrollToCFRowEduStage(${id},'hoiku');live()" style="font-size:11px;padding:3px 5px;width:auto">
            <option value="0">0歳</option>
            <option value="1" selected>1歳</option>
            <option value="2">2歳</option>
            <option value="3">3歳</option>
          </select>
        </div>
      </div>
      <div style="font-size:10px;color:#5a6a7e;margin-bottom:5px">※ 空欄でデフォルト値使用。入園前・年齢を過ぎた欄はグレー表示。</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px" id="hoiku-grid-${id}">
        <div class="fg" id="hg-0-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">0歳</label>
          <input class="inp amt-inp" id="hn-0-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},0)" onblur="cfRowBlur()" value="" placeholder="0" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-1-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">1歳</label>
          <input class="inp amt-inp" id="hn-1-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},1)" onblur="cfRowBlur()" value="" placeholder="0" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-2-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">2歳</label>
          <input class="inp amt-inp" id="hn-2-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},2)" onblur="cfRowBlur()" value="" placeholder="41" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-3-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">3歳</label>
          <input class="inp amt-inp" id="hn-3-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},3)" onblur="cfRowBlur()" value="" placeholder="31" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-4-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">4歳</label>
          <input class="inp amt-inp" id="hn-4-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},4)" onblur="cfRowBlur()" value="" placeholder="31" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-5-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">5歳</label>
          <input class="inp amt-inp" id="hn-5-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},5)" onblur="cfRowBlur()" value="" placeholder="31" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
        <div class="fg" id="hg-6-${id}">
          <label class="lbl" style="font-size:9px;text-align:center">6歳</label>
          <input class="inp amt-inp" id="hn-6-${id}" type="number" onfocus="scrollToCFRowHoiku(${id},6)" onblur="cfRowBlur()" value="" placeholder="31" min="0" oninput="live()" style="font-size:11px;padding:3px 4px;text-align:center;width:100%"></div>
      </div>
      <div style="font-size:9px;color:#5a6a7e;text-align:right">単位：万円/年</div>
    </div>
    <div style="font-size:10px;font-weight:700;color:#1a6b2e;margin-bottom:5px">📚 進学コース</div>
    <div class="g4">
      <div class="fg"><label class="lbl" style="font-size:9px">小学校</label>
        <select class="sel" id="ce-${id}" onfocus="scrollToCFRowEduStage(${id},'elem')" onblur="cfRowBlur()" onchange="scrollToCFRowEduStage(${id},'elem');live()" style="font-size:11px;padding:4px 6px">
          <option value="public">公立</option><option value="private">私立</option></select></div>
      <div class="fg"><label class="lbl" style="font-size:9px">中学校</label>
        <select class="sel" id="cm-${id}" onfocus="scrollToCFRowEduStage(${id},'mid')" onblur="cfRowBlur()" onchange="scrollToCFRowEduStage(${id},'mid');live()" style="font-size:11px;padding:4px 6px">
          <option value="public">公立</option><option value="private">私立</option></select></div>
      <div class="fg"><label class="lbl" style="font-size:9px">高校</label>
        <select class="sel" id="ch-${id}" onfocus="scrollToCFRowEduStage(${id},'high')" onblur="cfRowBlur()" onchange="scrollToCFRowEduStage(${id},'high');live()" style="font-size:11px;padding:4px 6px">
          <option value="public">公立</option><option value="private">私立</option></select></div>
      <div class="fg"><label class="lbl" style="font-size:9px">大学</label>
        <select class="sel" id="cu-${id}" onfocus="scrollToCFRowEduStage(${id},'univ')" onblur="cfRowBlur()" onchange="scrollToCFRowEduStage(${id},'univ');live()" style="font-size:11px;padding:4px 6px">
          <option value="nat_h">国立（自宅）</option><option value="nat_b">国立（下宿）</option>
          <option value="plit_h" selected>私立文系（自宅）</option><option value="plit_b">私立文系（下宿）</option>
          <option value="psci_h">私立理系（自宅）</option><option value="psci_b">私立理系（下宿）</option>
          <option value="med_h">私立医科（自宅）</option><option value="med_b">私立医科（下宿）</option>
          <option value="senmon_h">専門学校（自宅）</option><option value="senmon_b">専門学校（下宿）</option>
          <option value="none">進学なし</option>
        </select></div>
    </div>
    <div id="cprev-${id}" style="margin-top:5px;font-size:10px;color:var(--muted)"></div>
    <div class="divider" style="margin:8px 0"></div>
    <div style="font-size:10px;font-weight:700;color:#1a6b2e;margin-bottom:5px">🎓 奨学金</div>
    <div style="display:flex;gap:8px;margin-bottom:6px" id="scholarship-toggle-${id}">
      <div class="tc on" id="sc-no-${id}" onclick="setScholarship(${id},false)" style="flex:1;padding:5px 8px;gap:4px">
        <span style="font-size:12px">❌</span><div><div class="tc-lbl" style="font-size:10px">不要</div></div>
      </div>
      <div class="tc" id="sc-yes-${id}" onclick="setScholarship(${id},true)" style="flex:1;padding:5px 8px;gap:4px">
        <span style="font-size:12px">✅</span><div><div class="tc-lbl" style="font-size:10px">必要</div></div>
      </div>
    </div>
    <div id="sc-fields-${id}" style="display:none">
      <div class="g2">
        <div class="fg"><label class="lbl" style="font-size:9px">借入総額（万円）</label>
          <div class="suf"><input class="inp amt-inp" id="sc-amt-${id}" onfocus="scrollToCFRowScholarship(${id})" onblur="cfRowBlur()" type="number" value="200" min="0" oninput="scrollToCFRowScholarship(${id});live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:9px">返済開始年齢</label>
          <div class="suf"><input class="inp age-inp" id="sc-start-${id}" onfocus="scrollToCFRowScholarship(${id})" onblur="cfRowBlur()" type="number" value="23" min="18" max="30" oninput="scrollToCFRowScholarship(${id});live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div></div>
      </div>
      <span class="hint" style="font-size:9px">※ 子どもの収入からの返済のため保護者負担なし（参考情報として表示）</span>
    </div>
    <div style="font-size:10px;font-weight:700;color:#1a6b2e;margin-bottom:5px;margin-top:8px">💒 結婚のお祝い</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <div class="tc on" id="wed-no-${id}" onclick="setWedding(${id},false)" style="flex:1;padding:5px 8px;gap:4px">
        <span style="font-size:12px">❌</span><div><div class="tc-lbl" style="font-size:10px">不要</div></div>
      </div>
      <div class="tc" id="wed-yes-${id}" onclick="setWedding(${id},true)" style="flex:1;padding:5px 8px;gap:4px">
        <span style="font-size:12px">✅</span><div><div class="tc-lbl" style="font-size:10px">必要</div></div>
      </div>
    </div>
    <div id="wed-fields-${id}" style="display:none">
      <div class="g2">
        <div class="fg"><label class="lbl" style="font-size:9px">お祝い金額（万円）</label>
          <div class="suf"><input class="inp amt-inp" id="wed-amt-${id}" onfocus="scrollToCFRowWedding(${id})" onblur="cfRowBlur()" type="number" value="100" min="0" oninput="scrollToCFRowWedding(${id});live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">万</span></div></div>
        <div class="fg"><label class="lbl" style="font-size:9px">お子様の結婚年齢（想定）</label>
          <div class="suf"><input class="inp age-inp" id="wed-age-${id}" onfocus="scrollToCFRowWedding(${id})" onblur="cfRowBlur()" type="number" value="28" min="18" max="50" oninput="scrollToCFRowWedding(${id});live()" style="font-size:11px;padding:4px 6px"><span class="sl" style="font-size:10px">歳</span></div></div>
      </div>
    </div>`;
  $('children-cont').appendChild(el);live();
}
function rmChild(id){$(`cr-${id}`)?.remove();live()}
function setScholarship(id,on){
  document.getElementById(`sc-no-${id}`).classList.toggle('on',!on);
  document.getElementById(`sc-yes-${id}`).classList.toggle('on',on);
  document.getElementById(`sc-fields-${id}`).style.display=on?'':'none';
  live();
}
function setWedding(id,on){
  document.getElementById(`wed-no-${id}`).classList.toggle('on',!on);
  document.getElementById(`wed-yes-${id}`).classList.toggle('on',on);
  document.getElementById(`wed-fields-${id}`).style.display=on?'':'none';
  live();
}
