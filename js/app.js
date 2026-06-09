/* ============================================================
 * UI 構築・計算・レポート生成（見本様式）
 * ========================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LS_KEY = "parapet_input_v1";

  let I = deepClone(window.DEFAULT_INPUT);

  /* ---------- 数値整形 ---------- */
  const f3 = (x) => (x == null || isNaN(x)) ? "—" : Number(x).toFixed(3);
  const f2 = (x) => (x == null || isNaN(x)) ? "—" : Number(x).toFixed(2);
  const f1 = (x) => (x == null || isNaN(x)) ? "—" : Number(x).toFixed(1);
  const judge = (ok) => ok ? '<span class="ok">○</span>' : '<span class="ng">×</span>';
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ========================================================
   * 入力フォーム生成
   * ====================================================== */
  function rows(defs) {
    // defs: [{label, path, unit, type, options}]
    return defs.map((d) => {
      let cell;
      const val = getPath(I, d.path);
      if (d.type === "select") {
        cell = `<select data-path="${d.path}">` +
          d.options.map((o) => `<option ${o == val ? "selected" : ""}>${o}</option>`).join("") +
          `</select>`;
      } else if (d.type === "text") {
        cell = `<input type="text" data-path="${d.path}" value="${val ?? ""}">`;
      } else if (d.type === "checkbox") {
        cell = `<input type="checkbox" data-path="${d.path}" ${val ? "checked" : ""}>`;
      } else {
        cell = `<input type="number" step="${d.step || "any"}" data-path="${d.path}" value="${val ?? ""}">`;
      }
      return `<tr><th>${d.label}</th><td>${cell}</td><td class="unit">${d.unit || ""}</td></tr>`;
    }).join("");
  }
  function grid(defs) { return `<table class="grid">${rows(defs)}</table>`; }

  function buildCond() {
    const html = `
      <h3>工事情報</h3>
      ${grid([
        { label: "表題", path: "project.title", type: "text" },
        { label: "副題", path: "project.subtitle", type: "text" },
        { label: "適用基準", path: "project.standard", type: "text" },
        { label: "形式", path: "project.formType", type: "text" },
        { label: "ブロック長 B", path: "project.blockLength", unit: "m" },
        { label: "設計年月日", path: "project.date", type: "text" },
        { label: "設計者", path: "project.designer", type: "text" },
      ])}
      <h3>使用材料</h3>
      ${grid([
        { label: "躯体単位体積重量 γc", path: "material.gammaC", unit: "kN/m³" },
        { label: "水単位体積重量 γw", path: "material.gammaW", unit: "kN/m³" },
        { label: "コンクリート σck", path: "material.sigmaCk", unit: "N/mm²" },
      ])}
      <h3>土質条件</h3>
      ${grid([
        { label: "土質種別", path: "soil.type", type: "select", options: ["砂質土", "粘性土", "礫質土"] },
        { label: "内部摩擦角 φ", path: "soil.phi", unit: "度" },
        { label: "湿潤重量 γt", path: "soil.gammaWet", unit: "kN/m³" },
        { label: "飽和重量 γsat", path: "soil.gammaSat", unit: "kN/m³" },
      ])}
      <h3>地震条件</h3>
      ${grid([
        { label: "地震規模", path: "seismic.level", type: "select", options: ["レベル1", "レベル2"] },
        { label: "地域区分", path: "seismic.region", type: "select", options: ["A", "B", "C"] },
        { label: "地盤種別", path: "seismic.ground", type: "select", options: ["I種", "II種", "III種"] },
        { label: "設計水平震度 躯体 Kh", path: "seismic.khBody" },
        { label: "設計水平震度 土砂 Kh", path: "seismic.khSoil" },
        { label: "鉛直震度 Kv", path: "seismic.kv" },
      ])}
      <h3>基礎条件</h3>
      ${grid([
        { label: "摩擦係数 tanφB", path: "found.mu" },
        { label: "付着力 CB", path: "found.CB", unit: "kN/m²" },
      ])}
      <h3>水位</h3>
      ${grid([
        { label: "前面水位 Ff", path: "water.frontLevel", unit: "m" },
        { label: "背面水位 Fr", path: "water.backLevel", unit: "m" },
      ])}
      <h3>衝突荷重（防護柵）</h3>
      ${grid([
        { label: "防護柵の種類", path: "collision.type", type: "text" },
        { label: "衝突荷重 P", path: "collision.p", unit: "kN" },
        { label: "前輪荷重 pv", path: "collision.pv", unit: "kN" },
        { label: "載荷距離 λ", path: "collision.lambda", unit: "m" },
        { label: "作用高さ h(天端から)", path: "collision.h", unit: "m" },
        { label: "鉛直荷重位置 x(前面から)", path: "collision.x", unit: "m" },
      ])}`;
    $("#t-cond").innerHTML = html;
  }

  function buildShape() {
    $("#t-shape").innerHTML = `
      <h3>断面寸法（重力式）</h3>
      ${grid([
        { label: "壁高 H1(底版上面〜天端)", path: "shape.H1", unit: "m" },
        { label: "天端幅 b_top", path: "shape.bTop", unit: "m" },
        { label: "壁底厚 b_bottom", path: "shape.bBottom", unit: "m" },
        { label: "前面勾配 nFront(1:n)", path: "shape.nFront" },
        { label: "背面勾配 nBack(1:n)", path: "shape.nBack" },
        { label: "前趾長 toe", path: "shape.toe", unit: "m" },
        { label: "後趾長 heel", path: "shape.heel", unit: "m" },
        { label: "フーチング厚 tf", path: "shape.tf", unit: "m" },
      ])}
      <p class="note">底版幅 B = toe + b_bottom + heel。背面勾配は上方ほど前面側へ後退する量。</p>
      <div id="shapePreview"></div>`;
    drawShapePreview();
  }

  function buildLoad() {
    const html = I.loadCases.map((lc, i) => `
      <div class="lc-card">
        <div class="lc-head">荷重状態 ${i + 1}: ${lc.name}</div>
        <div class="lc-body">
          ${grid([
            { label: "名称", path: `loadCases.${i}.name`, type: "text" },
            { label: "地震時", path: `loadCases.${i}.seismic`, type: "checkbox" },
            { label: "衝突荷重", path: `loadCases.${i}.collision`, type: "checkbox" },
            { label: "満水(水圧浮力)", path: `loadCases.${i}.water`, type: "checkbox" },
            { label: "上載荷重 q", path: `loadCases.${i}.surcharge`, unit: "kN/m²" },
            { label: "上載開始位置(空=全面)", path: `loadCases.${i}.surchargeFrom`, unit: "m" },
            { label: "許容偏心比 ea/B", path: `loadCases.${i}.eaRatio` },
            { label: "許容滑動安全率 Fsa", path: `loadCases.${i}.FsAllow` },
            { label: "許容支持力 qa", path: `loadCases.${i}.qAllow`, unit: "kN/m²" },
            { label: "許容圧縮応力 σca", path: `loadCases.${i}.sigmaCa`, unit: "N/mm²" },
            { label: "許容引張応力 σta", path: `loadCases.${i}.sigmaTa`, unit: "N/mm²" },
            { label: "許容せん断 τa", path: `loadCases.${i}.tauA`, unit: "N/mm²" },
          ])}
        </div>
      </div>`).join("");
    $("#t-load").innerHTML = html;
  }

  /* ---------- path get/set ---------- */
  function getPath(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const ks = path.split(".");
    const last = ks.pop();
    const t = ks.reduce((o, k) => o[k], obj);
    t[last] = val;
  }

  /* ---------- 入力イベント ---------- */
  function bindInputs() {
    $("#inputPanel").addEventListener("input", (e) => {
      const el = e.target;
      const path = el.dataset.path;
      if (!path) return;
      let v;
      if (el.type === "checkbox") v = el.checked;
      else if (el.type === "number") v = el.value === "" ? null : parseFloat(el.value);
      else v = el.value;
      setPath(I, path, v);
      if (path.startsWith("shape.")) drawShapePreview();
      scheduleCalc();
    });
  }

  let calcTimer = null;
  function scheduleCalc() {
    clearTimeout(calcTimer);
    calcTimer = setTimeout(runCalc, 250);
  }

  /* ========================================================
   * 断面図 SVG
   * ====================================================== */
  function sectionSVG(G, w, h, label) {
    const pad = 28;
    const B = G.B, Htot = G.Hg;
    const sx = (w - 2 * pad) / B;
    const sy = (h - 2 * pad) / Htot;
    const s = Math.min(sx, sy);
    const ox = pad, oy = h - pad;
    const X = (x) => ox + x * s;
    const Y = (y) => oy - y * s;
    const poly = (pts, fill, stroke) =>
      `<polygon points="${pts.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
    // 地盤線
    svg += `<line x1="0" y1="${Y(0).toFixed(1)}" x2="${w}" y2="${Y(0).toFixed(1)}" stroke="#8d6e63" stroke-width="1.5"/>`;
    // 背面土砂
    svg += poly(G.backSoilPts, "#fff3e0", "#bcaaa4");
    // フーチング・本体
    svg += poly(G.footPts, "#cfd8dc", "#37474f");
    svg += poly(G.bodyPts, "#b0bec5", "#263238");
    // 寸法線(底版幅)
    svg += `<line x1="${X(0)}" y1="${Y(-0.05)}" x2="${X(B)}" y2="${Y(-0.05)}" stroke="#1565c0" stroke-width="0.8" marker-start="url(#a)" marker-end="url(#a)"/>`;
    svg += `<text x="${X(B / 2)}" y="${Y(-0.05) + 14}" font-size="10" text-anchor="middle" fill="#1565c0">B=${B.toFixed(3)}m</text>`;
    if (label) svg += `<text x="${w / 2}" y="14" font-size="11" text-anchor="middle" fill="#333">${label}</text>`;
    svg += `</svg>`;
    return svg;
  }

  function drawShapePreview() {
    try {
      const G = ParapetCalc.buildGeometry(I);
      $("#shapePreview").innerHTML =
        `<div class="fig">${sectionSVG(G, 360, 300, "断面プレビュー")}</div>`;
    } catch (e) { /* ignore */ }
  }

  /* ========================================================
   * レポート生成（見本様式）
   * ====================================================== */
  function runCalc() {
    let R;
    try { R = ParapetCalc.calculate(I); }
    catch (err) { $("#report").innerHTML = `<div class="sheet"><p class="ng">計算エラー: ${err.message}</p></div>`; return; }
    renderReport(R);
  }

  function renderReport(R) {
    const G = R.geometry;
    const p = I.project;
    const sheets = [];

    /* --- 表紙 --- */
    sheets.push(`<div class="sheet">
      <div class="doc-title">${esc(p.title)}</div>
      <div class="doc-subtitle">${esc(p.subtitle)}</div>
      <table class="doc-meta">
        <tr><td>適用基準</td><td>${esc(p.standard)}</td></tr>
        <tr><td>形式</td><td>${esc(p.formType)}</td></tr>
        <tr><td>ブロック長</td><td>${f3(p.blockLength)} m</td></tr>
        <tr><td>設計年月日</td><td>${esc(p.date || "")}</td></tr>
        <tr><td>設計者</td><td>${esc(p.designer || "")}</td></tr>
      </table>
      <div style="margin-top:40mm" class="fig">${sectionSVG(G, 440, 340, "標準断面図")}
        <figcaption>標準断面図（単位:m）</figcaption></div>
    </div>`);

    /* --- 1. 設計条件 --- */
    sheets.push(`<div class="sheet">
      <h2>1. 設計条件</h2>
      <h3>1.1 適用基準・形式</h3>
      <table class="rep"><tbody>
        <tr><th>適用基準</th><td class="l">${esc(p.standard)}</td></tr>
        <tr><th>形式</th><td class="l">${esc(p.formType)}</td></tr>
        <tr><th>ブロック長 B</th><td class="l">${f3(p.blockLength)} m</td></tr>
      </tbody></table>

      <h3>1.2 形状寸法</h3>
      <table class="rep"><tbody>
        <tr><th>壁高 H1</th><td>${f3(I.shape.H1)} m</td><th>天端幅</th><td>${f3(I.shape.bTop)} m</td></tr>
        <tr><th>壁底厚</th><td>${f3(I.shape.bBottom)} m</td><th>フーチング厚 tf</th><td>${f3(I.shape.tf)} m</td></tr>
        <tr><th>前趾長 toe</th><td>${f3(I.shape.toe)} m</td><th>後趾長 heel</th><td>${f3(I.shape.heel)} m</td></tr>
        <tr><th>前面勾配</th><td>1:${f2(I.shape.nFront)}</td><th>背面勾配</th><td>1:${f2(I.shape.nBack)}</td></tr>
        <tr><th>底版幅 B</th><td colspan="3">${f3(G.B)} m</td></tr>
      </tbody></table>

      <h3>1.3 使用材料・土質</h3>
      <table class="rep"><tbody>
        <tr><th>躯体 γc</th><td>${f3(I.material.gammaC)} kN/m³</td><th>水 γw</th><td>${f3(I.material.gammaW)} kN/m³</td></tr>
        <tr><th>コンクリート σck</th><td>${f1(I.material.sigmaCk)} N/mm²</td><th>土質</th><td>${esc(I.soil.type)}</td></tr>
        <tr><th>内部摩擦角 φ</th><td>${f2(I.soil.phi)} 度</td><th>湿潤重量 γt</th><td>${f3(I.soil.gammaWet)} kN/m³</td></tr>
      </tbody></table>

      <h3>1.4 地震・基礎・水位条件</h3>
      <table class="rep"><tbody>
        <tr><th>地震規模</th><td>${esc(I.seismic.level)}</td><th>地域区分</th><td>${esc(I.seismic.region)}</td><th>地盤種別</th><td>${esc(I.seismic.ground)}</td></tr>
        <tr><th>水平震度 躯体</th><td>${f2(I.seismic.khBody)}</td><th>水平震度 土砂</th><td>${f2(I.seismic.khSoil)}</td><th>鉛直震度</th><td>${f2(I.seismic.kv)}</td></tr>
        <tr><th>摩擦係数 tanφB</th><td>${f3(I.found.mu)}</td><th>付着力 CB</th><td>${f3(I.found.CB)} kN/m²</td><th>—</th><td>—</td></tr>
        <tr><th>前面水位 Ff</th><td>${f3(I.water.frontLevel)} m</td><th>背面水位 Fr</th><td>${f3(I.water.backLevel)} m</td><th>—</th><td>—</td></tr>
      </tbody></table>

      <h3>1.5 荷重組み合わせ</h3>
      <table class="rep">
        <thead><tr><th>No</th><th>荷重状態</th><th>地震</th><th>衝突</th><th>満水</th><th>上載 q(kN/m²)</th><th>照査項目</th></tr></thead>
        <tbody>${I.loadCases.map((lc, i) => `<tr>
          <td>${i + 1}</td><td>${esc(lc.name)}</td>
          <td>${lc.seismic ? "○" : "—"}</td><td>${lc.collision ? "○" : "—"}</td><td>${lc.water ? "○" : "—"}</td>
          <td>${f1(lc.surcharge)}</td><td>安定・断面</td></tr>`).join("")}</tbody>
      </table>
    </div>`);

    /* --- 2. 結果一覧 --- */
    sheets.push(`<div class="sheet">
      <h2>2. 結果一覧</h2>
      <div class="judge-banner ${R.allOK ? "ok" : "ng"}">総合判定: ${R.allOK ? "○ 全照査を満足" : "× 照査を満足しない項目あり"}</div>

      <h3>2.1 安定計算</h3>
      <h4>(1) 転倒に対する照査</h4>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>ΣV(kN)</th><th>合力位置 d(m)</th><th>偏心 e(m)</th><th>許容 ea(m)</th><th>判定</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.V)}</td><td>${f3(s.d)}</td><td>${f3(s.e)}</td>
          <td>≦ ${f3(s.ea)}</td><td>${judge(s.overturnOK)}</td></tr>`).join("")}</tbody>
      </table>

      <h4>(2) 滑動に対する照査</h4>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>ΣV(kN)</th><th>ΣH(kN)</th><th>Fs</th><th>許容 Fsa</th><th>判定</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.V)}</td><td>${f3(s.H)}</td><td>${f3(s.Fs)}</td>
          <td>≧ ${f3(s.FsAllow)}</td><td>${judge(s.FsOK)}</td></tr>`).join("")}</tbody>
      </table>

      <h4>(3) 支持に対する照査</h4>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>分布形</th><th>反力幅(m)</th><th>qmax(kN/m²)</th><th>許容(kN/m²)</th><th>判定</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${s.shape}</td><td>${f3(s.width)}</td><td>${f3(s.qmax)}</td>
          <td>≦ ${f3(s.qAllow)}</td><td>${judge(s.bearingOK)}</td></tr>`).join("")}</tbody>
      </table>

      <h3>2.2 断面計算（重力式・合応力点）</h3>
      <h4>(1) 圧縮・引張応力度</h4>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>N(kN)</th><th>M(kN·m)</th><th>σc(N/mm²)</th><th>許容σca</th><th>σt(N/mm²)</th><th>判定</th></tr></thead>
        <tbody>${R.section.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.N)}</td><td>${f3(s.M)}</td>
          <td>${f3(s.sigmaC)}</td><td>≦ ${f3(s.sigmaCa)}</td>
          <td>${f3(s.tension)}</td><td>${judge(s.compOK && s.tensionOK)}</td></tr>`).join("")}</tbody>
      </table>
      <h4>(2) せん断応力度</h4>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>H(kN)</th><th>τ(N/mm²)</th><th>許容τa</th><th>判定</th></tr></thead>
        <tbody>${R.section.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.H)}</td><td>${f3(s.tau)}</td>
          <td>≦ ${f3(s.tauA)}</td><td>${judge(s.shearOK)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`);

    /* --- 3. 安定計算（詳細） --- */
    sheets.push(stabilityDetailSheets(R, G));

    /* --- 4. 断面計算（詳細） --- */
    sheets.push(sectionDetailSheet(R, G));

    $("#report").innerHTML = sheets.join("");
  }

  function stabilityDetailSheets(R, G) {
    const body = ParapetCalc.polyAreaCentroid(G.bodyPts);
    const foot = ParapetCalc.polyAreaCentroid(G.footPts);
    const bs = ParapetCalc.polyAreaCentroid(G.backSoilPts);
    return `<div class="sheet">
      <h2>3. 安定計算</h2>
      <h3>3.1 形状諸量（体積・図心, 単位奥行1m）</h3>
      <table class="rep">
        <thead><tr><th>区分</th><th>断面積 A(m²)</th><th>図心 X(m)</th><th>図心 Y(m)</th></tr></thead>
        <tbody>
          <tr><td>本体</td><td>${f3(body.area)}</td><td>${f3(body.cx)}</td><td>${f3(body.cy)}</td></tr>
          <tr><td>フーチング</td><td>${f3(foot.area)}</td><td>${f3(foot.cx)}</td><td>${f3(foot.cy)}</td></tr>
          <tr><td>背面土砂</td><td>${f3(bs.area)}</td><td>${f3(bs.cx)}</td><td>${f3(bs.cy)}</td></tr>
        </tbody>
      </table>

      <h3>3.2 土圧（試行くさび法）</h3>
      <p class="formula">P = W·sin(ω−φ) / cos(ω−φ−α−δ＋θ)　（θ:地震合震度角, δ:壁面摩擦角）</p>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>すべり角 ω(度)</th><th>δ(度)</th><th>P(kN)</th><th>Ph(kN)</th><th>Pv(kN)</th><th>作用高 y(m)</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f2(s.ep.omega)}</td><td>${f3(s.ep.delta)}</td>
          <td>${f3(s.ep.P)}</td><td>${f3(s.ep.Ph)}</td><td>${f3(s.ep.Pv)}</td><td>${f3(s.ep.y)}</td></tr>`).join("")}</tbody>
      </table>

      <h3>3.3 作用力の集計（フーチング前面まわり）</h3>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>ΣV(kN)</th><th>ΣH(kN)</th><th>抵抗M Mr(kN·m)</th><th>転倒M Mt(kN·m)</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.V)}</td><td>${f3(s.H)}</td><td>${f3(s.Mr)}</td><td>${f3(s.Mt)}</td></tr>`).join("")}</tbody>
      </table>

      <h3>3.4 安定照査</h3>
      <p class="formula">転倒: d=(ΣMr−ΣMt)/ΣV, e=B/2−d ≦ ea=B·(ea/B)</p>
      <p class="formula">滑動: Fs=(ΣV·μ＋CB·B′)/ΣH ≧ Fsa　（B′=B−2|e|）</p>
      <p class="formula">支持: |e|≦B/6 → q=ΣV/B·(1±6e/B) ／ |e|&gt;B/6 → qmax=2ΣV/{3(B/2−|e|)}</p>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>d(m)</th><th>e(m)</th><th>判定(転倒)</th><th>Fs</th><th>判定(滑動)</th><th>qmax</th><th>判定(支持)</th></tr></thead>
        <tbody>${R.stability.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.d)}</td><td>${f3(s.e)}</td><td>${judge(s.overturnOK)}</td>
          <td>${f3(s.Fs)}</td><td>${judge(s.FsOK)}</td>
          <td>${f3(s.qmax)}</td><td>${judge(s.bearingOK)}</td></tr>`).join("")}</tbody>
      </table>
    </div>`;
  }

  function sectionDetailSheet(R, G) {
    return `<div class="sheet">
      <h2>4. 断面計算（重力式・無筋）</h2>
      <p>照査位置: 壁基部（フーチング上面）水平断面　断面幅 b=${f3(G.bBottom)} m</p>
      <p class="formula">σ = N/A ± M/Z　（A=b·1.0, Z=1.0·b²/6）</p>
      <h3>4.1 断面力</h3>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>N(kN)</th><th>H(kN)</th><th>M(kN·m)</th><th>偏心 e(m)</th></tr></thead>
        <tbody>${R.section.map((s) => `<tr>
          <td>${esc(s.name)}</td><td>${f3(s.N)}</td><td>${f3(s.H)}</td><td>${f3(s.M)}</td><td>${f3(s.e)}</td></tr>`).join("")}</tbody>
      </table>
      <h3>4.2 応力度照査</h3>
      <table class="rep">
        <thead><tr><th>荷重状態</th><th>σc(N/mm²)</th><th>許容σca</th><th>σ背面(N/mm²)</th><th>引張σt</th><th>許容σta</th><th>τ(N/mm²)</th><th>許容τa</th><th>判定</th></tr></thead>
        <tbody>${R.section.map((s) => `<tr>
          <td>${esc(s.name)}</td>
          <td>${f3(s.sigmaC)}</td><td>≦${f3(s.sigmaCa)}</td>
          <td>${f3(s.sigmaT)}</td><td>${f3(s.tension)}</td><td>≦${f3(s.sigmaTa)}</td>
          <td>${f3(s.tau)}</td><td>≦${f3(s.tauA)}</td>
          <td>${judge(s.compOK && s.tensionOK && s.shearOK)}</td></tr>`).join("")}</tbody>
      </table>
      <p class="note">※ 重力式擁壁は原則として断面に引張応力を生じさせない設計とする。σ背面が負の場合は引張応力(σt)を許容引張応力度σtaと照査。</p>
    </div>`;
  }

  function esc(s) { return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  /* ========================================================
   * ツールバー
   * ====================================================== */
  function initToolbar() {
    $("#btnCalc").onclick = runCalc;
    $("#btnPrint").onclick = () => window.print();
    $("#btnReset").onclick = () => { I = deepClone(window.DEFAULT_INPUT); rebuild(); };
    $("#btnSave").onclick = () => {
      const blob = new Blob([JSON.stringify(I, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (I.project.title || "parapet") + ".json";
      a.click();
      localStorage.setItem(LS_KEY, JSON.stringify(I));
    };
    $("#btnLoad").onclick = () => $("#fileLoad").click();
    $("#fileLoad").onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => { try { I = JSON.parse(rd.result); rebuild(); } catch (err) { alert("読込エラー: " + err.message); } };
      rd.readAsText(file);
    };
    $$(".tab").forEach((t) => t.onclick = () => {
      $$(".tab").forEach((x) => x.classList.remove("active"));
      $$(".tabpane").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      $("#" + t.dataset.tab).classList.add("active");
    });
  }

  function rebuild() {
    buildCond(); buildShape(); buildLoad(); runCalc();
  }

  /* ---------- 起動 ---------- */
  function init() {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) { try { I = JSON.parse(saved); } catch (e) {} }
    initToolbar();
    bindInputs();
    rebuild();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
