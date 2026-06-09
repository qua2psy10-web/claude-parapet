/* ============================================================
 * 重力式 河川パラペット（重力式擁壁）設計計算エンジン
 *   準拠: 道路土工 擁壁工指針（平成24年7月, 日本道路協会）の考え方
 *   ・安定計算 : 転倒（偏心量）・滑動（安全率）・支持（地盤反力）
 *   ・土圧     : 試行くさび法（常時／地震時、地震時δ自動算定）
 *   ・断面照査 : 重力式（無筋）合応力点の圧縮・引張応力度照査
 *  注) 本エンジンは標準的な算定式に基づく実用計算であり、
 *      個別ソフトの数値を完全一致させるものではない。
 * ========================================================== */
(function (global) {
  "use strict";

  const DEG = Math.PI / 180;
  const r2 = (x) => Math.round(x * 1000) / 1000; // 表示丸め用ではなく内部はそのまま

  /* ---- 多角形の面積・図心（shoelace, 反時計回り正） ---- */
  function polyAreaCentroid(pts) {
    let A = 0, Cx = 0, Cy = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      const cross = x0 * y1 - x1 * y0;
      A += cross;
      Cx += (x0 + x1) * cross;
      Cy += (y0 + y1) * cross;
    }
    A /= 2;
    if (Math.abs(A) < 1e-12) return { area: 0, cx: 0, cy: 0 };
    Cx /= 6 * A;
    Cy /= 6 * A;
    return { area: Math.abs(A), cx: Cx, cy: Cy };
  }

  /* =========================================================
   * 形状の構築
   * 座標系: 原点=フーチング前面下端, x=背面方向(+), y=上方向(+)
   * ========================================================= */
  function buildGeometry(I) {
    const { H1, bTop, bBottom, toe, heel, tf } = I.shape;
    const B = toe + bBottom + heel; // 底版幅
    const xf0 = toe;                // 壁底前端
    const xb0 = toe + bBottom;      // 壁底背端
    // 前面・背面勾配 (1:n, 上に行くほど x が変化)
    const nf = I.shape.nFront;      // 前面勾配(前傾を正としx増)
    const nb = I.shape.nBack;       // 背面勾配(後退を正としx減)
    const xfTop = xf0 + nf * H1;
    const xbTop = xb0 - nb * H1;

    // 本体（台形）
    const body = [
      [xf0, tf],
      [xbTop, tf + H1],
      [xfTop, tf + H1],
      // 上記2点の順序を頂点が交差しないよう調整
    ];
    // 正しい頂点順（反時計）: 前面下→前面上→背面上→背面下
    const bodyPts = [
      [xf0, tf],
      [xfTop, tf + H1],
      [xbTop, tf + H1],
      [xb0, tf],
    ];
    // フーチング（矩形）
    const footPts = [
      [0, 0], [B, 0], [B, tf], [0, tf],
    ];
    // 背面土砂（壁背面より後方〜底版背端, 地表=壁天端レベル）
    const Hg = tf + H1; // 地表面高さ
    const backSoilPts = [
      [xb0, tf],
      [xbTop, tf + H1],
      [B, Hg],
      [B, tf],
    ];

    return { B, xf0, xb0, xfTop, xbTop, tf, H1, Hg, bBottom,
             bodyPts, footPts, backSoilPts };
  }

  /* =========================================================
   * 試行くさび法による主働土圧
   *   仮想背面: かかと端 x=B から鉛直, 高さ H(=Hg)
   *   常時 : P = W·sin(ω-φ)/cos(ω-φ-α-δ)
   *   地震 : 合震度角 θ を考慮し δ を自動算定
   * 戻り: { P, Ph, Pv, y(作用高さ,底版下端から), omega, delta }
   * ========================================================= */
  function trialWedge(G, soil, q, seismic) {
    const H = G.Hg;                  // 仮想背面高さ
    const phi = soil.phi * DEG;
    const gamma = soil.gamma;
    const alpha = 0;                 // 仮想背面が鉛直となす角(=0)
    const kh = seismic ? soil.kh : 0;
    const kv = seismic ? (soil.kv || 0) : 0;

    // 地震合震度角
    const theta = Math.atan(kh / (1 - kv));
    let delta;
    if (seismic) {
      // 地震時 壁面摩擦角の自動算定
      const sphi = Math.sin(phi);
      const sinDelta = Math.sin(theta) / sphi;
      const Delta = Math.asin(Math.min(1, Math.max(-1, sinDelta)));
      const num = sphi * Math.sin(theta + Delta);
      const den = 1 - sphi * Math.cos(theta + Delta);
      delta = Math.atan2(num, den);
    } else {
      delta = (soil.deltaConst || 0) * DEG;
    }

    let best = { P: -Infinity };
    for (let wDeg = soil.phi + 0.1; wDeg < 89.9; wDeg += 0.1) {
      const w = wDeg * DEG;
      // くさび: 仮想背面(高さH,鉛直) と すべり面(底端から角度w) と 地表(水平)
      const base = H / Math.tan(w);          // 地表での水平距離
      if (base <= 0) continue;
      const areaSoil = 0.5 * H * base;       // 土塊断面積
      const Wsoil = gamma * areaSoil;        // 土塊自重(/m)
      const Wq = q * base;                   // 上載荷重ぶん
      const W = Wsoil + Wq;
      // 地震時は合力を θ 回転（等価重力法）
      const We = (W) * (1 - kv);
      // クーロン試行くさび（α=0, 地表水平）
      const denom = Math.cos(w - phi - alpha - delta + theta);
      if (Math.abs(denom) < 1e-6) continue;
      const P = We * Math.sin(w - phi) / denom;
      if (P > best.P) best = { P, omega: wDeg, W };
    }
    const P = Math.max(0, best.P);
    // 作用方向: 仮想背面法線(水平)から δ 下向き
    const Ph = P * Math.cos(delta);
    const Pv = P * Math.sin(delta);
    const y = H / 3; // 三角形分布の作用高さ（底版下端から）
    return { P, Ph, Pv, y, omega: best.omega || 0, delta: delta / DEG, theta: theta / DEG };
  }

  /* =========================================================
   * 水圧・浮力（満水時）
   * ========================================================= */
  function waterForces(G, w, water) {
    // 前面静水圧（前面水位 Ff）, 背面静水圧（背面水位 Fr）
    const gw = w.gammaW;
    const Ff = water.frontLevel, Fr = water.backLevel;
    const PwF = 0.5 * gw * Ff * Ff;   // 前面水圧合力(水平, 前面→背面を負方向に押す)
    const PwR = 0.5 * gw * Fr * Fr;   // 背面水圧合力
    const yF = Ff / 3, yR = Fr / 3;
    // 揚圧力（浮力相当）: 底面に作用、前面水位Ff〜背面Frの台形分布
    const pf = gw * Ff;
    const pr = gw * Fr;
    const U = 0.5 * (pf + pr) * G.B; // /m
    const xU = G.B * (pf + 2 * pr) / (3 * (pf + pr || 1)); // 前面からの作用位置
    return { PwF, PwR, yF, yR, U, xU, pf, pr };
  }

  /* =========================================================
   * 1つの荷重状態の安定計算
   * ========================================================= */
  function stabilityCase(I, G, lc) {
    const seismic = lc.seismic;
    const w = I.material;
    const soil = {
      phi: I.soil.phi, gamma: I.soil.gammaWet,
      kh: I.seismic.khSoil, kv: I.seismic.kv || 0,
      deltaConst: lc.deltaConst != null ? lc.deltaConst : 0,
    };

    // --- 鉛直力 V と モーメント(フーチング前面まわり) ---
    let V = 0, Mr = 0, Mt = 0; // Mr:抵抗(前面まわり時計回り), Mt:転倒
    let Hsum = 0, Mh = 0;      // 水平力とそのモーメント

    // 自重（本体＋フーチング）
    const body = polyAreaCentroid(G.bodyPts);
    const foot = polyAreaCentroid(G.footPts);
    const Wbody = w.gammaC * body.area;
    const Wfoot = w.gammaC * foot.area;
    V += Wbody + Wfoot;
    Mr += Wbody * body.cx + Wfoot * foot.cx;
    if (seismic) {
      const Hb = (Wbody + Wfoot) * I.seismic.khBody;
      Hsum += Hb;
      Mh += Wbody * I.seismic.khBody * body.cy + Wfoot * I.seismic.khBody * foot.cy;
    }

    // 背面土砂自重
    const bs = polyAreaCentroid(G.backSoilPts);
    const Wsoil = I.soil.gammaWet * bs.area;
    V += Wsoil;
    Mr += Wsoil * bs.cx;
    if (seismic) {
      const Hs = Wsoil * I.seismic.khSoil;
      Hsum += Hs;
      Mh += Hs * bs.cy;
    }

    // 上載荷重（背面土砂上面に作用）
    if (lc.surcharge > 0) {
      const x0 = lc.surchargeFrom != null ? lc.surchargeFrom : G.xb0;
      const x1 = G.B;
      const wq = lc.surcharge * (x1 - x0);
      const xq = (x0 + x1) / 2;
      V += wq;
      Mr += wq * xq;
    }

    // 主働土圧（仮想背面=かかと端）
    const q = lc.surcharge || 0;
    const ep = trialWedge(G, soil, q, seismic);
    Hsum += ep.Ph;
    Mh += ep.Ph * ep.y;
    V += ep.Pv;
    Mr += ep.Pv * G.B; // 鉛直土圧成分は仮想背面(x=B)に作用

    // 衝突荷重（安定計算: 有効幅=ブロック長 → 単位幅当りに換算）
    if (lc.collision) {
      const c = I.collision;
      const L = I.project.blockLength || 1;
      const Pu = c.p / L;            // 単位幅水平力
      const Pv = c.pv / L;           // 単位幅鉛直力
      Hsum += Pu;
      Mh += Pu * (G.Hg + c.h);       // 天端より h 上に作用
      V += Pv;
      Mr += Pv * c.x;                // 作用位置x(前面から)
    }

    // 水圧・浮力（満水時）
    let water = null;
    if (lc.water) {
      water = waterForces(G, w, { frontLevel: I.water.frontLevel, backLevel: I.water.backLevel, gammaW: w.gammaW });
      // 前面水圧は背面→前面方向（抵抗側, 水平力を減じる）
      Hsum += -water.PwF + water.PwR;
      Mh += -water.PwF * water.yF + water.PwR * water.yR;
      // 揚圧力（上向き, V を減じ, 前面まわりにモーメント）
      V -= water.U;
      Mr -= water.U * water.xU;
    }

    // 水平力による転倒モーメント
    Mt += Mh;

    // --- 安定照査 ---
    const B = G.B;
    const d = (Mr - Mt) / V;       // 合力作用位置(前面から)
    const e = B / 2 - d;           // 偏心量
    const eaRatio = lc.eaRatio;    // 許容偏心比 (1/6 or 1/3)
    const ea = B * eaRatio;
    const overturnOK = Math.abs(e) <= ea + 1e-9;

    // 滑動
    const mu = I.found.mu, CB = I.found.CB;
    const Bp = B - 2 * Math.abs(e);
    const Fs = (V * mu + CB * Math.max(0, Bp)) / Math.abs(Hsum);
    const FsOK = Fs >= lc.FsAllow - 1e-9;

    // 支持（地盤反力）
    let q1, q2, qmax, width, shape;
    if (Math.abs(e) <= B / 6 + 1e-9) {
      q1 = V / B * (1 + 6 * e / B); // 前面側
      q2 = V / B * (1 - 6 * e / B); // 背面側
      qmax = Math.max(q1, q2);
      width = B; shape = "台形";
    } else {
      // 三角形分布
      const a = B / 2 - Math.abs(e);
      qmax = 2 * V / (3 * a);
      q1 = qmax; q2 = 0;
      width = 3 * a; shape = "三角形";
    }
    const bearingOK = qmax <= lc.qAllow + 1e-9;

    return {
      name: lc.name,
      V, H: Hsum, Mr, Mt, d, e, ea, eaRatio,
      overturnOK, mu, CB, Bp, Fs, FsAllow: lc.FsAllow, FsOK,
      q1, q2, qmax, qAllow: lc.qAllow, width, shape, bearingOK,
      ep, water, B,
      Mcenter: V * B / 2 - (Mr - Mt), // 参考: 中心まわりモーメント
    };
  }

  /* =========================================================
   * 断面照査（重力式・無筋）: 壁基部水平断面
   * ========================================================= */
  function sectionCase(I, G, lc) {
    const seismic = lc.seismic;
    const w = I.material;
    const soil = {
      phi: I.soil.phi, gamma: I.soil.gammaWet,
      kh: I.seismic.khSoil, kv: I.seismic.kv || 0,
      deltaConst: lc.deltaConst != null ? lc.deltaConst : 0,
    };
    // 壁基部より上の本体のみ
    const bodyUpper = polyAreaCentroid(G.bodyPts);
    const Wb = w.gammaC * bodyUpper.area;
    const xb = bodyUpper.cx;        // 図心x
    const yb = bodyUpper.cy;        // 図心y
    const yBase = G.tf;             // 断面位置

    // 断面諸量（壁底厚 bBottom, 単位奥行1m）
    const b = G.bBottom;
    const A = b * 1.0;
    const Z = 1.0 * b * b / 6;

    let N = Wb, H = 0, Mbase = 0;
    // 土圧（壁背面に作用, 高さ H1 部分のみ近似: 仮想背面=壁背端鉛直, 高さ H1+? ）
    // 簡略化: 壁高さ H1 に対する試行くさび
    const Gwall = Object.assign({}, G, { Hg: G.H1 });
    const ep = trialWedge(Gwall, soil, lc.surcharge || 0, seismic);
    H += ep.Ph;
    Mbase += ep.Ph * ep.y;
    N += ep.Pv;

    if (seismic) {
      const Hb = Wb * I.seismic.khBody;
      H += Hb;
      Mbase += Hb * (yb - yBase);
    }

    // 衝突荷重（竪壁設計: 有効幅考慮）
    if (lc.collision) {
      const c = I.collision;
      const Pu = c.p / (c.lambda + G.H1); // 有効幅 λ+壁高
      H += Pu;
      Mbase += Pu * (G.H1 + c.h);
    }

    // 水圧（満水時, 前面側のみ壁前面に作用→抵抗）
    if (lc.water) {
      const gw = w.gammaW;
      const hf = Math.min(I.water.frontLevel, G.H1);
      const Pw = 0.5 * gw * hf * hf;
      H += -Pw;
      Mbase += -Pw * (hf / 3);
    }

    // 断面下端まわりの偏心
    const e = Mbase / N; // 断面中心からの偏心(土圧側を正)
    // 合応力点での縁応力度 [kN/m²] → [N/mm²] (×1e-3)
    const UNIT = 1e-3;
    const sigmaC = (N / A + Math.abs(Mbase) / Z) * UNIT; // 圧縮側(前面)
    const sigmaT = (N / A - Math.abs(Mbase) / Z) * UNIT; // 背面側(負なら引張)
    const ecc = Math.abs(Mbase) / N;
    const compOK = sigmaC <= lc.sigmaCa + 1e-9;
    const tension = sigmaT < 0 ? -sigmaT : 0;
    const tensionOK = tension <= (lc.sigmaTa || 0) + 1e-9;

    // せん断
    const tau = Math.abs(H) / (A * 1000) ; // N/mm2 ※ A[m2]→簡易
    const tauMm = Math.abs(H) * 1000 / (b * 1000 * 1.0 * 1000); // kN→N, m→mm
    const shearOK = tauMm <= lc.tauA + 1e-9;

    return {
      name: lc.name, N, H, M: Mbase, e: ecc, b, A, Z,
      sigmaC, sigmaT, sigmaCa: lc.sigmaCa, sigmaTa: lc.sigmaTa || 0,
      tension, compOK, tensionOK,
      tau: tauMm, tauA: lc.tauA, shearOK,
      ep,
    };
  }

  /* =========================================================
   * 全体計算
   * ========================================================= */
  function calculate(I) {
    const G = buildGeometry(I);
    const stability = I.loadCases.map((lc) => stabilityCase(I, G, lc));
    const section = I.loadCases.map((lc) => sectionCase(I, G, lc));
    const allOK =
      stability.every((s) => s.overturnOK && s.FsOK && s.bearingOK) &&
      section.every((s) => s.compOK && s.tensionOK && s.shearOK);
    return { geometry: G, stability, section, allOK };
  }

  global.ParapetCalc = { calculate, buildGeometry, polyAreaCentroid, trialWedge };
})(typeof window !== "undefined" ? window : globalThis);
