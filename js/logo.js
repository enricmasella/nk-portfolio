/* The mark: a cornicello (the horn) under a chess king's crown, drawn in characters.
   At rest it is a small dot-matrix emblem in the corner. Now and then, and whenever it is touched, it grows and burns:
   three layers of ASCII fire rise behind it so the shape can be seen. With reduced motion it stays still. */
(() => {
"use strict";
const NK = window.NK, $ = NK.$, { clamp, lerp, smooth, reduced, RAMP } = NK, Q = NK.quality;

/* the symbol as a grid of 64 x 92 cells, each 0 (nothing) to 9 (solid); a cell is 1 wide and 1.75 high */
const ROWS = [
  "0000000000000000000000000000000060000000000000000000000000000000",
  "0000000000000000000000000000000090000000000000000000000000000000",
  "0000000000000000000000000000004796000000000000000000000000000000",
  "0000000000000000000000000000049987740000000000000000000000000000",
  "0000000000000000000000000000002796000000000000000000000000000000",
  "0000000000000000000000002500000590000004200000000000000000000000",
  "0000000000000000000000369863000492003478740000000000000000000000",
  "0000000000000000000000498789999997899887880000000000000000000000",
  "0000000000000000000000035750000290000357500000000000000000000000",
  "0000000000000000000000000500000494000004000000000000000000000000",
  "0000000000000000000000000000003997000000000000000000000000000000",
  "0000000000000000000000000000479997755000000000000000000000000000",
  "0000000000000000000000000006866403344500000000000000000000000000",
  "0000000000000000000000000077999996566652000000000000000000000000",
  "0000000000000000000000038999999877667669930000000000000000000000",
  "0004666300000000000000026444766543232224640000000002000004666000",
  "3489889854988980000000003999999998655469400000000029987477787873",
  "0043304686445893000000000099999929655684000000000099733665332320",
  "0036765004457952000000000029999705656730000000000037865003554500",
  "0003877302659800000000000009999907755720000000000000964004663000",
  "0000398650568900000000000009999905866730000000000004970055952000",
  "0000039760054970000000000299989400975594000000000039620457700000",
  "0000000997205798400000004999899050297668300000002698305776000000",
  "0000000397520569895002699999880040037666864200367763036762000000",
  "0000000039640035468999753354555550000000335676754530058700000000",
  "0000000006962003445567999999999999998976675454344200479000000000",
  "0000000000972356699778655520000022000003434555775740590000000000",
  "0000000000048765300035689999999739786654220200024479820000000000",
  "0000000000895302437725999999996552699986665434522204893000000000",
  "0000000000246642366492289999944884048755523860442466220000000000",
  "0000000000006975464260399999997032798876530300343599000000000000",
  "0000000000039555457605899999999959987778664223433648500000000000",
  "0000000000034367657555444466666666654544233554556754300000000000",
  "0000000000000664457789999999999999787867777655443490000000000000",
  "0000000000004788787654333220000000000002223455666985000000000000",
  "0000000000009975420000235589977666555433000000234789000000000000",
  "0000000000009800000446555553202202002332444453000049200000000000",
  "0000000000000452403500002365534242202000000025303450000000000000",
  "0000000000000002320043335898776463443020002300023000000000000000",
  "0000000000000000000095245899976775343230003462000000000000000000",
  "0000000000000000000029446799999877554322003465000000000000000000",
  "0000000000000000000009854689999998765343200456200000000000000000",
  "0000000000000000000002985588999999886533300347400000000000000000",
  "0000000000000000000000297557799999997643230236600000000000000000",
  "0000000000000000000000048756799999998765442245800000000000000000",
  "0000000000000000000000003874457999998654332033800000000000000000",
  "0000000000000000000000000098558799999987433003900000000000000000",
  "0000000000000000000000000006956798999977544402950000000000000000",
  "0000000000000000000000000000374467799865433230660000000000000000",
  "0000000000000000000000000000078567879977544340670000000000000000",
  "0000000000000000000000000000006977899987654540770000000000000000",
  "0000000000000000000000000000002965689976443300550000000000000000",
  "0000000000000000000000000000000397879998754330850000000000000000",
  "0000000000000000000000000000000396889997644232920000000000000000",
  "0000000000000000000000000000000598899997542224800000000000000000",
  "0000000000000000000000000000002999899987643336800000000000000000",
  "0000000000000000000000000000003999999965330244200000000000000000",
  "0000000000000000000000000000039999999754302366000000000000000000",
  "0000000000000000000000000000299999998654203662000000000000000000",
  "0000000000000000000000000004999999864300004500000000000000000000",
  "0000000000000000000000000069999997665420266300000000000000000000",
  "0000000000000000000000000699999887433002460000000000000000000000",
  "0000000000000000000000039999999654200046500000000000000000000000",
  "0000000000000000000000299999985542002653000000000000000000000000",
  "0000000000000000000000699997653200036300000000000000000000000000",
  "0000000000000000000009999978634003560000000000000000000000000000",
  "0000000000000000000008999775420026600000000000000000000000000000",
  "0000000000000000000059997654202066000000000000000000000000000000",
  "0000000000000000000099997655304570000000000000000000000000000000",
  "0000000000000000000059965430204600000000000000000000000000000000",
  "0000000000000000000009987653404900000000000000000000000000000000",
  "0000000000000000000009976654205700000000000000000000000000000000",
  "0000000000000000000009997762404700000000000000000000000000000000",
  "0000000000000000000000997664302550000000000000000000000000000000",
  "0000000000000000000000699676640483000000000000000000000000000000",
  "0000000000000000000000269967643047000000000000000000000000000000",
  "0000000000000000000000002897665305700000000000000000000000000000",
  "0000000000000000000000000059996632390000000000000000000000000000",
  "0000000000000000000000000000579765246200000000000000000000000000",
  "0000000000000000000000000000000699853760000000000000000000000000",
  "0000000000000000000000000000000006998475000000000000000000000000",
  "0000000000000000000000000000000000059947300000000000000000000000",
  "0000000000000000000000000000000000004985720000000000000000000000",
  "0000000000000000000000000000000000000597750000000000000000000000",
  "0000000000000000000000000000000000000099630000000000000000000000",
  "0000000000000000000000000000000000000059830000000000000000000000",
  "0000000000000000000000000000000000000079400000000000000000000000",
  "0000000000000000000000000000000000000099000000000000000000000000",
  "0000000000000000000000000000000000000493000000000000000000000000",
  "0000000000000000000000000000000000000600000000000000000000000000",
  "0000000000000000000000000000000000027000000000000000000000000000",
  "0000000000000000000000000000000000040000000000000000000000000000"
];
const GC = 64, GR = 92, CW0 = 6, CH0 = 10.5;
const SRC = new Float32Array(GC * GR); ROWS.forEach((row, y) => { for (let x = 0; x < GC; x++) SRC[y * GC + x] = (row.charCodeAt(x) - 48) / 9; });
/* the same symbol coarser: f x f cells become one */
const pool = (f, gain) => { const c = GC / f, r = GR / f, d = new Float32Array(c * r); for (let y = 0; y < GR; y++) for (let x = 0; x < GC; x++) d[((y / f) | 0) * c + ((x / f) | 0)] += SRC[y * GC + x]; for (let i = 0; i < d.length; i++) d[i] = Math.pow(clamp((d[i] / (f * f)) * gain), 0.9); return { c, r, d }; };
const REST = pool(4, 1.9), SHOW = pool(2, 1.3);   /* 16 x 23 dots for the corner, 32 x 46 characters for the showcase */

/* ───────── fire: noise, and the shape the symbol gives it ───────── */
const rnd = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = rnd(xi, yi), b = rnd(xi + 1, yi), c = rnd(xi, yi + 1), d = rnd(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y) => 0.65 * vn(x, y) + 0.35 * vn(x * 2.1 + 7.3, y * 2.1 + 3.1);
/* three layers of fire, one in front of the other: the back one is wide, slow and dark; the front one is small, quick and hot.
   Each is a flame-shaped bed (tip: rows above the crown, hw: half width at the base) that its own noise eats into tongues. */
const LAYERS = [
  { m: 1.6, tip: 23, hw: 25, sx: 0.2, sy: 0.055, sp: 3.2, thr: 0.2, gn: 1.6, ph: 3.1, wob: 1.8, col: ["rgba(112,9,9,.22)", "rgba(145,12,12,.32)", "rgba(180,16,16,.42)", "rgba(214,22,22,.52)"] },
  { m: 1.0, tip: 17, hw: 20, sx: 0.4, sy: 0.08, sp: 5.4, thr: 0.26, gn: 1.65, ph: 0, wob: 1.2, col: ["rgba(205,16,16,.4)", "rgba(255,26,26,.6)", "rgba(255,52,30,.76)", "rgba(255,98,48,.88)"] },
  { m: 0.72, tip: 10, hw: 14, sx: 0.7, sy: 0.12, sp: 7.8, thr: 0.3, gn: 1.75, ph: 5.7, wob: 0.8, col: ["rgba(255,70,30,.55)", "rgba(255,112,52,.74)", "rgba(255,166,96,.88)", "rgba(255,214,160,.96)"] }
];
const PL = 10, PR = 10, PT = 24, PB = 3, SC = PL + SHOW.c + PR, SR = PT + SHOW.r + PB;   /* the stage around the symbol, in showcase cells */
const YB = PT + SHOW.r, CX = (SC - 1) / 2;
const bed = LAYERS.map((L) => { const e = new Float32Array(SC * SR), yt = PT - L.tip; for (let y = 0; y < SR; y++) { const t = (YB - y) / (YB - yt); if (t < 0 || t > 1) continue; const hw = L.hw * Math.pow(1 - Math.pow(t, 1.4), 0.6) * (0.5 + 0.5 * smooth(0, 0.34, t)); if (hw < 0.5) continue; for (let x = 0; x < SC; x++) { const d = Math.abs(x - CX) / hw; if (d < 1) e[y * SC + x] = (1 - Math.pow(d, 1.6)) * (0.62 + 0.38 * smooth(0, 0.45, t)) * (1 - Math.pow(t, 1.8)); } } return e; });

/* ───────── the stage ───────── */
const T = 5.4;                                   /* seconds one burn lasts */
const st = { cv: null, g: null, dpr: 1, rx: 0, ry: 0, kr: 0.14, ks: 1, cws: 6, chs: 10.5, W: 0, H: 0, run: false, t0: 0, next: 0, cool: 0, dirty: true, n: 0, lv: [], tq: [] };
const FONT = (px) => "700 " + px.toFixed(1) + 'px "Space Mono", ui-monospace, monospace';

const layout = () => {
  const a = $(".logo"), cv = st.cv; if (!a || !cv) return;
  const r = a.getBoundingClientRect(), VH = NK.VH;
  const showH = NK.tall ? clamp(VH * 0.36, 190, 300) : NK.short ? clamp(VH * 0.6, 170, 230) : clamp(VH * 0.47, 240, 440);
  st.ks = showH / (SHOW.r * CH0); st.kr = (r.height || 64) / (SHOW.r * CH0); st.rx = r.left; st.ry = r.top;
  st.cws = CW0 * st.ks; st.chs = CH0 * st.ks; st.W = SC * st.cws; st.H = SR * st.chs; st.dpr = Q.dpr;
  cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr); cv.style.width = st.W + "px"; cv.style.height = st.H + "px";
  st.lv = LAYERS.map((L) => new Float32Array(Math.ceil(SC / L.m) * Math.ceil(SR / L.m))); st.tq = LAYERS.map((L) => new Float32Array(Math.ceil(SC / L.m) * Math.ceil(SR / L.m)));
  st.run = false; st.dirty = true;
};

const fire = (g, ta, fe) => {
  const tier = Q.tier;
  LAYERS.forEach((L, li) => {
    if (tier >= 2 && li === 2) return;
    const m = tier ? L.m * 1.3 : L.m, cols = Math.ceil(SC / m), rows = Math.ceil(SR / m), lv = st.lv[li].length >= cols * rows ? st.lv[li] : (st.lv[li] = new Float32Array(cols * rows)), tq = st.tq[li].length >= cols * rows ? st.tq[li] : (st.tq[li] = new Float32Array(cols * rows)), E = bed[li], cwl = st.cws * m, chl = st.chs * m, yt = PT - L.tip;
    for (let j = 0; j < rows; j++) {
      const by = (j + 0.5) * m, yi = Math.min(SR - 1, by | 0), th = clamp((YB - by) / (YB - yt));
      for (let i = 0; i < cols; i++) {
        const bx = (i + 0.5) * m, core = E[yi * SC + Math.min(SC - 1, bx | 0)];
        if (core < 0.03) { lv[j * cols + i] = 0; continue; }
        const n = fbm(bx * L.sx + L.wob * Math.sin(by * 0.21 + ta * 1.3 + L.ph) + L.ph, (by + ta * L.sp) * L.sy);
        const h = core * L.gn * fe * (0.2 + 1.7 * smooth(0.22, 0.78, n)) - L.thr, k = h > 0 ? Math.min(1, h / (1 - L.thr)) : 0;
        lv[j * cols + i] = k; tq[j * cols + i] = Math.min(0.999, k * 0.72 + (1 - th) * 0.28);
      }
    }
    g.font = FONT(chl * 0.92);
    for (let b = 0; b < 4; b++) {
      g.fillStyle = L.col[b];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const v = lv[j * cols + i]; if (v > 0.02 && (tq[j * cols + i] * 4) >> 0 === b) g.fillText(RAMP[1 + Math.min(8, (v * 8.99) | 0)], (i + 0.5) * cwl, (j + 0.5) * chl); }
    }
  });
};

/* e: how far the symbol has grown (0 at rest, 1 in the showcase); fe: how much fire there is; ta: seconds since the burn began */
const draw = (e, fe, ta) => {
  const g = st.g; if (!g) return;
  g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); g.clearRect(0, 0, st.W, st.H);
  g.textAlign = "center"; g.textBaseline = "middle";
  if (fe > 0.01) fire(g, ta, fe);
  const k = lerp(st.kr, st.ks, e), x0 = lerp(st.rx, PL * st.cws, e), y0 = lerp(st.ry, PT * st.chs, e), cw = CW0 * k, ch = CH0 * k, m = smooth(0.25, 0.7, e);
  if (m < 0.999) {   /* the dots of the corner emblem */
    const w = cw * 2, h = ch * 2, dw = w * 0.88, dh = h * 0.86;
    for (let y = 0; y < REST.r; y++) for (let x = 0; x < REST.c; x++) { const v = REST.d[y * REST.c + x]; if (v < 0.07) continue; g.fillStyle = "rgba(255,255,255," + ((0.2 + 0.8 * v) * (1 - m)).toFixed(3) + ")"; g.fillRect(x0 + x * w + (w - dw) / 2, y0 + y * h + (h - dh) / 2, dw, dh); }
  }
  if (m > 0.001) {   /* the characters of the showcase, over a dark halo so the fire does not eat them */
    const halo = 0.66 * smooth(0, 0.35, fe) * m;
    if (halo > 0.01) { g.fillStyle = "rgba(0,0,0," + halo.toFixed(3) + ")"; for (let y = 0; y < SHOW.r; y++) for (let x = 0; x < SHOW.c; x++) if (SHOW.d[y * SHOW.c + x] > 0.1) g.fillRect(x0 + (x - 0.1) * cw, y0 + (y - 0.05) * ch, cw * 1.2, ch * 1.1); }
    g.font = FONT(ch * 0.92);
    for (let b = 0; b < 3; b++) {
      g.fillStyle = "rgba(255," + (b === 2 ? 246 - ((24 * fe) | 0) : 255) + "," + (b === 2 ? 238 - ((52 * fe) | 0) : 255) + "," + (m * [0.64, 0.86, 1][b]).toFixed(3) + ")";
      const lo = [0.07, 0.35, 0.7][b], hi = [0.35, 0.7, 2][b];
      for (let y = 0; y < SHOW.r; y++) for (let x = 0; x < SHOW.c; x++) { const v = SHOW.d[y * SHOW.c + x]; if (v >= lo && v < hi) g.fillText(RAMP[Math.max(1, Math.min(9, Math.round(v * 9)))], x0 + (x + 0.5) * cw, y0 + (y + 0.5) * ch); }
    }
  }
};

const start = (t) => { if (st.run || reduced || !st.g) return; st.run = true; st.t0 = t; st.n = 0; };

NK.boot(() => {
  const a = $(".logo"); if (!a) return;
  const cv = (st.cv = a.querySelector("canvas")); if (!cv) return; st.g = cv.getContext("2d");
  layout(); NK.onResize(layout); NK.onQuality(layout);
  if (!reduced) {
  a.addEventListener("pointerenter", (e) => { const t = performance.now() / 1000; if (e.pointerType === "mouse" && t >= st.cool) start(t); });
  a.addEventListener("focus", () => { const t = performance.now() / 1000; if (t >= st.cool) start(t); });
  a.addEventListener("click", () => { const t = performance.now() / 1000; if (t >= st.cool) start(t); });
  }
  NK.onFrame((t) => {
    if (!st.run) {
      if (st.dirty) { draw(0, 0, 0); st.dirty = false; }
      if (reduced || !NK.started) return;
      if (!st.next) st.next = t + 5.5;
      if (t >= st.next) { const S = NK.scroll; if (!document.hidden && S && S.y < NK.VH * 0.7 && Math.abs(S.vel || 0) < 300) start(t); else st.next = t + 8; }
      return;
    }
    const ta = t - st.t0;
    if (ta >= T) { st.run = false; st.dirty = true; st.cool = t + 4; st.next = t + 50 + Math.random() * 25; return; }
    if (Q.tier > 0 && (++st.n & 1)) return;
    const e = smooth(0, 0.9, ta) * (1 - smooth(T - 0.9, T, ta)), fe = smooth(0.55, 1.7, ta) * (1 - smooth(3.5, 4.7, ta)) * smooth(0.6, 1, e);
    draw(e, fe, ta);
  });
});
})();
