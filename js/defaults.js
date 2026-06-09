/* 既定の設計データ（重力式 河川パラペット）
 * 値は見本(L型)の条件を重力式向けに置き換えた初期値 */
window.DEFAULT_INPUT = {
  project: {
    title: "河川パラペット設計計算書",
    subtitle: "重力式擁壁（直接基礎）",
    standard: "道路土工 擁壁工指針（平成24年7月, 日本道路協会）",
    formType: "重力式－B（直接基礎）",
    blockLength: 10.0, // ブロック長 (m)
    date: "",
    designer: "",
  },
  shape: {
    H1: 0.730,     // 壁高(フーチング上面〜天端) m
    bTop: 0.200,   // 天端幅 m
    bBottom: 0.450,// 壁底厚 m
    nFront: 0.00,  // 前面勾配(1:n)
    nBack: 0.20,   // 背面勾配(1:n)
    toe: 0.150,    // 前趾長 m
    heel: 0.300,   // 後趾長 m
    tf: 0.120,     // フーチング厚 m
  },
  material: {
    gammaC: 24.500, // 躯体 kN/m3
    gammaW: 9.800,  // 水 kN/m3
    sigmaCk: 18.0,  // コンクリート設計基準強度 N/mm2(無筋)
  },
  soil: {
    phi: 30.0,       // 内部摩擦角 度
    gammaWet: 19.000,// 湿潤重量 kN/m3
    gammaSat: 19.800,// 飽和重量 kN/m3
    type: "砂質土",
  },
  seismic: {
    khBody: 0.16,
    khSoil: 0.16,
    kv: 0.00,
    level: "レベル2", region: "A", ground: "I種",
  },
  found: {
    mu: 0.600,  // 摩擦係数 tanφB
    CB: 0.000,  // 付着力 kN/m2
  },
  water: {
    frontLevel: 0.850, // 前面水位 m
    backLevel: 0.000,  // 背面水位 m
  },
  collision: {
    type: "たわみ性防護柵",
    p: 30.000,   // 衝突荷重 kN
    pv: 25.000,  // 前輪鉛直荷重 kN
    lambda: 1.000, // 載荷距離 m
    h: 0.000,    // 作用高さ(天端から) m
    x: 0.060,    // 鉛直荷重作用位置(前面から) m
  },
  loadCases: [
    { name: "常時1", seismic: false, surcharge: 10.0, surchargeFrom: null,
      eaRatio: 1/6, FsAllow: 1.5, qAllow: 300, sigmaCa: 6.0,
      tauA: 0.39, sigmaTa: 0.40, deltaConst: 0, collision: false, water: false },
    { name: "常時2", seismic: false, surcharge: 10.0, surchargeFrom: 0.78,
      eaRatio: 1/6, FsAllow: 1.5, qAllow: 300, sigmaCa: 6.0,
      tauA: 0.39, sigmaTa: 0.40, deltaConst: 0, collision: false, water: false },
    { name: "地震時", seismic: true, surcharge: 0.0, surchargeFrom: null,
      eaRatio: 1/3, FsAllow: 1.2, qAllow: 450, sigmaCa: 9.0,
      tauA: 0.59, sigmaTa: 0.60, collision: false, water: false },
    { name: "衝突時", seismic: false, surcharge: 0.0, surchargeFrom: null,
      eaRatio: 1/3, FsAllow: 1.2, qAllow: 450, sigmaCa: 9.0,
      tauA: 0.59, sigmaTa: 0.60, deltaConst: 0, collision: true, water: false },
    { name: "満水時", seismic: false, surcharge: 0.0, surchargeFrom: null,
      eaRatio: 1/6, FsAllow: 1.5, qAllow: 300, sigmaCa: 6.0,
      tauA: 0.39, sigmaTa: 0.40, deltaConst: 0, collision: false, water: true },
  ],
};
