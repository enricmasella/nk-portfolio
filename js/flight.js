/* The flight: camera, the sky of characters, the constellation of skills, and the loop that hangs every item at its depth.
   Three ways to run (see NK.FLAT, NK.tall): wide flight, tall flight (phones), flat page (reduced motion). */
(() => {
"use strict";
const NK = window.NK, D = NK.DATA, I = NK.I, $ = NK.$, $$ = NK.$$, B = NK.B;
const { clamp, lerp, smooth, hash, FLAT, reduced, RAMP } = NK;
const world = B.world, view = $("#view"), sk = D.skills, P = 900, Q = NK.quality;

NK.boot(() => {
  NK.decode.gain = reduced ? 1 : 0;
  /* the camera: [from, to, weight]. weight = how much scroll the leg takes, in screens; a leg with equal ends is a hold */
  const LEG = [[0, 1400, 1.0], [1400, 2600, 0.9], [2600, 3500, 0.8], [3500, 4500, 0.7], [4500, 5500, 0.7], [5500, 6500, 0.7], [6500, 7400, 0.8], [7400, 7400, 1.1], [7400, 9000, 1.5], [9000, 9000, 0.45], [9000, 10000, 0.9], [10000, 10000, 0.3], [10000, 10500, 0.55], [10500, 10500, 0.5], [10500, 11000, 0.55], [11000, 11000, 0.45], [11000, 12100, 0.9]];
  const SUM = LEG.reduce((s, l) => s + l[2], 0), CUM = []; { let a = 0; for (const l of LEG) { CUM.push(a); a += l[2]; } }
  Object.assign(B, { LEG, CUM, SUM, cam: 0, ringVis: 0, contactK: 0, constK: 0 });

  const items = $$(".it", world).map((el, i) => {
    const d = el.dataset, pos = (s) => (s || "0,0,-0.5,0").split(",").map(Number);
    return { el, i, z: +d.z, pw: pos(d.pw), pt: pos(d.pt || d.pw), fi: +d.fi || 1350, fo: +d.fo || 120, zt: d.zt === undefined ? null : +d.zt, zs: d.zs === undefined ? null : +d.zs, ps: d.ps ? pos(d.ps) : null, k: 1, vis: true, frame: el.classList.contains("it--frame"), word: el.classList.contains("word"), dc: !!el.querySelector("[data-dc]"), art: null, at: null };
  });
  $$("[data-art]").forEach((cv) => { const it = items.find((q) => q.el.contains(cv)); if (it) it.art = NK.art(cv, cv.dataset.art); });
  B.items = items;
  const portrait = new NK.Portrait($("[data-frame]"), { zoom: 0.92, cols: 66 });
  B.portrait = portrait;
  const setCols = () => { portrait.o.cols = NK.tall ? 46 : 66; };
  setCols(); NK.onMode(setCols);

  /* ───────── flat page: normal flow, nothing flies ───────── */
  if (FLAT) {
    NK.flatScroll();
    const at = (sel) => () => { const e = $(sel); return e ? e.getBoundingClientRect().top + scrollY - 70 : 0; };
    NK.sections = [
      { key: "nav.index", hash: "top", dock: true, y: () => 0 }, { key: "nav.about", hash: "about", dock: true, y: at(".it--about") }, { key: "nav.work", hash: "work", dock: true, y: at(".pj") },
      { key: "nav.skills", hash: "skills", dock: true, y: at(".it--scap") }, { key: "nav.ai", hash: "ai", dock: true, y: at(".it--ai") }, { key: "nav.contact", hash: "contact", dock: true, y: () => NK.scroll.max }
    ];
    NK.dock();
    NK.onFrame((t) => { for (const it of items) if (it.art) { const r = it.el.getBoundingClientRect(); if (r.bottom > 0 && r.top < NK.VH) it.art.draw(reduced ? 0 : t); } });
    return;
  }

  /* ───────── the flight ───────── */
  items.forEach((it) => { if (it.el.dataset.at) { it.at = new B.AT_(it.el, it.el.dataset.at); B.ATs.push(it.at); } });
  /* on a phone the stops that hold several pieces are stacked by their real heights (so no language or font size makes two of them overlap) */
  const stacks = [[".it--about", ".it--tg1", ".it--tg2", ".it--tg3"], [".it--ai", ".it--ailead", ".it--aisplit"]].map((g) => g.map((s) => items.find((it) => it.el.matches(s))).filter(Boolean));
  const singles = items.filter((it) => it.el.matches(".pj, .it--term, .it--flow, .it--contact"));
  B.stack = () => {
    items.forEach((it) => { it.k = 1; });
    if (!NK.tall) { if (B.measureC) B.measureC(); return; }
    const VH = NK.VH, dock = ($("#dock") || {}).offsetHeight || 44, top = 66, bot = VH - dock - 14, gap = VH < 720 ? 10 : 16, avail = bot - top;
    stacks.forEach((its) => {
      const hs = its.map((it) => it.el.offsetHeight), sum = hs.reduce((a, b) => a + b, 0) || 1, k = clamp((avail - gap * (its.length - 1)) / sum, 0.72, 1), total = sum * k + gap * (its.length - 1);
      let y = Math.max(top, (top + bot - total) / 2);
      its.forEach((it, i) => { const h = hs[i] * k; it.k = k; it.pt[1] = (y + h / 2 - VH / 2) / VH; y += h + gap; });
    });
    singles.forEach((it) => { const h = it.el.offsetHeight; if (h > 0) it.k = clamp(2 * Math.min(VH / 2 - top, bot - VH / 2) / h, 0.72, 1); });
    if (B.measureC) B.measureC();
  };
  B.stack(); NK.onMode(() => requestAnimationFrame(B.stack)); I.onLang(() => setTimeout(B.stack, 60));
  NK.onResize((w, h, modeChanged) => { if (modeChanged) B.ATs.forEach((a) => a.layout()); else B.relayout(140); setTimeout(B.stack, 160); });
  NK.onQuality(() => B.relayout(0));
  I.onLang(() => B.relayout(0));
  NK.scroller({ spacer: $("#spacer"), height: (S) => S.vh * (SUM + 1) });
  const camAt = (S) => {
    const u = clamp(S.p) * SUM;
    for (let i = 0; i < LEG.length; i++) { const l = LEG[i]; if (u <= CUM[i] + l[2] || i === LEG.length - 1) { const f = clamp((u - CUM[i]) / l[2]), s = lerp(f, f * f * (3 - 2 * f), 0.6); return lerp(l[0], l[1], s); } }
    return 0;
  };
  const yAt = (leg, off = 0) => () => NK.scroll.vh * (CUM[leg] + off);
  NK.sections = [
    { key: "nav.index", hash: "top", dock: true, y: () => 0 }, { key: "nav.about", hash: "about", dock: true, y: yAt(1, 0.02) }, { key: "nav.work", hash: "work", dock: true, y: yAt(2, 0.02) },
    { key: "nav.project", hash: "project", dock: false, y: yAt(7, 0.5) }, { key: "nav.skills", hash: "skills", dock: true, y: yAt(9, 0.15) }, { key: "nav.ai", hash: "ai", dock: true, y: yAt(11, 0.1) },
    { key: "nav.contact", hash: "contact", dock: true, y: () => NK.scroll.max }
  ];
  NK.dock();

  /* ───────── sky: ASCII stars streaming toward the camera, and the red heat the pointer leaves ───────── */
  const sky = $("#sky"), g = sky.getContext("2d"), HC = 8, HR = 14, L = 13000, SP = 6.06;
  let VW = 0, VH = 0, CH = 0, dpr = 1, hcols = 0, hrows = 0, heat = new Float32Array(1), N = 0, stars = [];
  const FW = [], FR = []; for (let a = 0; a <= 12; a++) { FW.push("rgba(255,255,255," + (a / 12).toFixed(2) + ")"); FR.push("rgba(255,26,26," + (a / 12).toFixed(2) + ")"); }
  const sizeSky = () => {
    VW = NK.VW; VH = NK.VH; CH = NK.CH; dpr = Q.dpr;
    sky.width = Math.round(VW * dpr); sky.height = Math.round(CH * dpr); sky.style.width = VW + "px"; sky.style.height = CH + "px";
    hcols = Math.ceil(VW / HC); hrows = Math.ceil(CH / HR); heat = new Float32Array(hcols * hrows);
    N = Q.stars; stars = []; for (let i = 0; i < N; i++) stars.push({ u: hash(i, 1, 2) * 2 - 1, v: hash(i, 2, 2) * 2 - 1, z0: -hash(i, 3, 2) * L, b: hash(i, 4, 2), hot: hash(i, 5, 2) > 0.955 });
  };
  NK.onResize(sizeSky); NK.onQuality(sizeSky); sizeSky();

  /* ───────── the constellation of skills (world coordinates around its own centre); one layout for wide screens, one for tall ones ───────── */
  const CW = { hx: 390, hy: 250, hoff: 60, hz: 160, sr: 120, sv: 90, skx: 1.25, sky: 0.85, skz: 1.2, ex: 300, ey: 190, ez: -720, ey0: -40, cx: 0.13, cy: 0 };
  const CT = { hx: 150, hy: 215, hoff: 34, hz: 130, sr: 48, sv: 44, skx: 1.2, sky: 1, skz: 1.2, ex: 150, ey: 150, ez: -720, ey0: -30, cx: 0, cy: -0.045 };
  let nodes = [], edges = [], CZ = B.Z.const, C = CW, selCat = -1, hoverCat = -1;
  const lg = $$("[data-lg] button");
  const buildConst = () => {
    C = NK.tall ? CT : CW; nodes = []; edges = [];
    const core = { label: "enric", x: 0, y: 0, z: 0, kind: "core", cat: -1 }; nodes.push(core);
    const hubs = sk.worked.map(([key, list], k) => {
      const a = (k * Math.PI * 2) / 6 + 0.3, hub = { label: I.t(key).toLowerCase(), x: Math.cos(a) * C.hx, y: Math.sin(a) * C.hy + (k % 2 ? C.hoff : -C.hoff), z: Math.sin(a * 1.7) * C.hz, kind: "hub", cat: k, key }; nodes.push(hub); edges.push([core, hub, 0]);
      list.forEach((s, j) => { const aa = hash(k, j, 41) * 6.283, bb = (hash(k, j, 42) - 0.5) * 2.2, r = C.sr + hash(k, j, 43) * C.sv; const n = { label: s, x: hub.x + Math.cos(aa) * Math.cos(bb) * r * C.skx, y: hub.y + Math.sin(bb) * r * C.sky, z: hub.z + Math.sin(aa) * Math.cos(bb) * r * C.skz, kind: "skill", cat: k }; nodes.push(n); edges.push([hub, n, 0]); });
      return hub;
    });
    hubs.forEach((h, i) => edges.push([h, hubs[(i + 1) % hubs.length], 1]));
    const ex = { label: I.t("skills.exploring").toLowerCase(), x: 0, y: C.ey0, z: C.ez, kind: "hub", cat: 6, exp: true, key: "skills.exploring" }; nodes.push(ex); edges.push([core, ex, 2]);
    sk.exploring.forEach((s, j) => { const a = (j * Math.PI * 2) / 5, n = { label: s, x: Math.cos(a) * C.ex, y: Math.sin(a) * C.ey + C.ey0, z: C.ez + Math.sin(a * 2) * 120, kind: "skill", cat: 6, exp: true }; nodes.push(n); edges.push([ex, n, 2]); });
  };
  buildConst(); NK.onMode(buildConst);
  /* on a phone the constellation lives between the title and the legend: its centre and size follow that free band */
  const scapIt = items.find((it) => it.el.classList.contains("it--scap")), fitC = { on: false, cy: 0, fy: 1, fx: 1 };
  B.measureC = () => {
    fitC.on = false; if (!NK.tall || !scapIt) return;
    const el = scapIt.el, tp = $(".scap__top", el), bt = $(".scap__bot", el); if (!tp || !bt) return;
    const a = 64 + tp.offsetHeight + 12, b = 64 + el.offsetHeight - bt.offsetHeight - 12; if (b - a < 90) return;
    fitC.on = true; fitC.cy = (a + b) / 2; fitC.fx = fitC.fy = Math.min(clamp((b - a) / 470, 0.5, 1.2), clamp(NK.VW / 390, 0.8, 1.15));
  };
  B.measureC();
  I.onLang(() => { for (const n of nodes) if (n.key) n.label = I.t(n.key).toLowerCase(); });
  lg.forEach((b) => {
    b.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") hoverCat = +b.dataset.k; }); b.addEventListener("pointerleave", () => { hoverCat = -1; });
    b.addEventListener("click", () => { const k = +b.dataset.k; selCat = selCat === k ? -1 : k; });
  });
  /* on a phone there is no hover: a tap on a point lights its group, another tap lets go */
  addEventListener("click", (e) => {
    if (!NK.tall || B.constK < 0.5 || !(e.target instanceof Element) || e.target.closest("a,button,.dock,.hud-top,.rdet,.skills__lg")) return;
    let best = null, bd = 44; for (const n of nodes) { if (n.kind === "core" || n.a < 0.3) continue; const d = Math.hypot(n.sx - e.clientX, n.sy - e.clientY); if (d < bd) { bd = d; best = n; } }
    if (best) selCat = selCat === best.cat ? -1 : best.cat;
  });
  const drawConst = (t, cam, cx, cy, k) => {
    const base = CZ + cam; if (k < 0.01 || base < -12800 || base > 1600) return;
    const tall = NK.tall, sm = NK.short && VW < 760, fsm = sm ? Math.min(clamp((VW - 200) / 640, 0.55, 1), clamp((VH - 110) / 470, 0.5, 1)) : 1, ft = tall && fitC.on, fx = ft ? fitC.fx : fsm, fy = ft ? fitC.fy : fsm, cyy = ft ? fitC.cy + (cy - VH / 2) : cy + C.cy * VH, yaw = t * 0.06 + cam * 0.0003, cyw = Math.cos(yaw), syw = Math.sin(yaw), m = NK.mouse, pit = -0.18 + (tall ? 0 : m.ny * 0.1), cp = Math.cos(pit), sp = Math.sin(pit);
    let near = null, nd = 28;
    for (const n of nodes) {
      const x1 = n.x * cyw + n.z * syw, z1 = -n.x * syw + n.z * cyw, y2 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp, zc = z2 + base;
      n.zc = zc; if (zc > 560) { n.sx = 1e5; n.a = 0; continue; }
      const sc = P / (P - zc); n.sc = sc; n.sx = cx + (sm ? 0.14 : C.cx) * VW + x1 * sc * fx; n.sy = cyy + y2 * sc * fy;
      n.a = smooth(-4200, -1500, zc) * (1 - smooth(260, 540, zc)) * k;
      if (!tall) { const d = Math.hypot(n.sx - m.x, n.sy - m.y); if (d < nd && n.a > 0.3 && n.kind !== "core") { nd = d; near = n; } }
    }
    const auto = (tall || sm) && selCat < 0 ? Math.floor(t / 2.6) % 7 : -1;
    const hc = selCat >= 0 ? selCat : tall || sm ? auto : near ? near.cat : hoverCat; lg.forEach((b) => b.classList.toggle("on", +b.dataset.k === hc));
    g.lineWidth = 1;
    for (const [a, b, kind] of edges) {
      const al = Math.min(a.a, b.a); if (al < 0.02) continue; const hot = hc >= 0 && (a.cat === hc || b.cat === hc) && (a.cat === hc || a.kind === "core") && (b.cat === hc || b.kind === "core");
      g.setLineDash(kind ? [3, 7] : []); g.strokeStyle = hot ? "rgba(255,26,26," + (0.75 * al).toFixed(3) + ")" : "rgba(255,255,255," + ((kind === 2 ? 0.1 : kind === 1 ? 0.14 : 0.24) * al * (hc >= 0 ? 0.6 : 1)).toFixed(3) + ")";
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); g.stroke();
    }
    g.setLineDash([]); const order = nodes.filter((n) => n.a > 0.02).sort((a, b) => a.zc - b.zc);
    if (g.letterSpacing !== undefined) g.letterSpacing = "0px";
    for (const n of order) {
      const on = hc >= 0 && n.cat === hc, dim = hc >= 0 && !on && n.kind !== "core", al = n.a * (n.exp ? 0.6 : 1) * (dim ? 0.35 : 1), s = clamp(n.sc, 0.45, 1.5);
      g.fillStyle = on ? "rgba(255,26,26," + al.toFixed(3) + ")" : n.kind === "hub" ? "rgba(255,26,26," + (al * 0.9).toFixed(3) + ")" : "rgba(255,255,255," + al.toFixed(3) + ")";
      if (n.kind === "core") { const r = 7 + 3 * Math.sin(t * 2.2); g.strokeStyle = "rgba(255,26,26," + (0.7 * al).toFixed(3) + ")"; g.beginPath(); g.arc(n.sx, n.sy, r * s, 0, 6.283); g.stroke(); g.fillStyle = "rgba(255,26,26," + al.toFixed(3) + ")"; g.fillRect(n.sx - 2.5, n.sy - 2.5, 5, 5); }
      else if (n.kind === "hub") { g.fillRect(n.sx - 3.5 * s, n.sy - 3.5 * s, 7 * s, 7 * s); } else g.fillRect(n.sx - 1.6 * s, n.sy - 1.6 * s, 3.2 * s, 3.2 * s);
      /* on a phone only the hubs and the lit group carry a name: forty labels would be a wall */
      if ((tall || sm) && n.kind === "skill" && !on) continue;
      g.font = (n.kind === "hub" ? "700 " : "400 ") + Math.round(12 * clamp(s, 0.85, 1.3) * (ft ? clamp(fy * 1.3, 0.82, 1) : 1)) + 'px "Space Mono", ui-monospace, monospace'; g.textBaseline = "middle";
      g.fillStyle = (on || n.kind === "core") ? "rgba(255,255,255," + Math.min(1, al * 1.1).toFixed(3) + ")" : "rgba(255,255,255," + (al * (n.kind === "hub" ? 0.95 : 0.72)).toFixed(3) + ")";
      const lbl = n.kind === "hub" ? n.label.toUpperCase() : n.label, right = n.sx > VW * (tall ? 0.52 : 0.82);
      g.textAlign = right ? "right" : "left"; g.fillText(lbl, n.sx + (right ? -8 : 8) * s, n.sy + 0.5);
    }
  };

  /* ───────── frame ───────── */
  const hint = $("#hint");
  NK.onFrame((t) => {
    const S = NK.scroll; if (!S) return; const m = NK.mouse, now = performance.now(), T = reduced ? 0 : t;
    VW = NK.VW; VH = NK.VH; const cam = camAt(S), tall = NK.tall; B.cam = cam; if (tall && ((B.fc = (B.fc || 0) + 1) % 90 === 0)) B.measureC();
    B.ringVis = smooth(6800, 7350, cam) * (1 - smooth(7450, 7900, cam));
    B.contactK = smooth(-1000, -350, B.Z.contact + cam);
    const ck = (1 - B.ringVis) * (1 - smooth(-150, 330, CZ + cam)); B.constK = ck * smooth(-4200, -1500, CZ + cam);
    NK.decode.gain = reduced ? 1 : smooth(0, 1, (now - NK.startAt - 500) / 1800);
    portrait.ascii = smooth(0.1, 0.85, cam / 1100);
    if (hint) hint.style.opacity = S.y > 40 ? 0 : 1;
    const cx = VW * (0.5 + m.nx * (tall ? 0.015 : 0.03)), cy = VH * (0.5 + m.ny * (tall ? 0.012 : 0.03));
    view.style.perspectiveOrigin = (50 + m.nx * (tall ? 2 : 3)).toFixed(2) + "% " + (50 + m.ny * (tall ? 2 : 3)).toFixed(2) + "%";
    /* the sky */
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, VW, CH); g.textAlign = "center"; g.textBaseline = "middle";
    const streak = clamp(Math.abs(S.vel) / 8000) * 0.2, drift = reduced ? 0 : t * 26;
    for (let pass = 0; pass < 2; pass++) {
      g.font = pass ? '700 17px "Space Mono", ui-monospace, monospace' : '400 10px "Space Mono", ui-monospace, monospace';
      for (let i = 0; i < N; i++) {
        const s = stars[i]; let tt = (s.z0 + cam + drift) % L; if (tt < 0) tt += L; const zc = tt - L + 450, sc = P / (P - zc), x = cx + s.u * (VW / 2) * SP * sc, y = cy + s.v * (VH / 2) * SP * sc;
        if (x < -20 || x > VW + 20 || y < -20 || y > CH + 20) continue;
        const near = clamp(1 + zc / 5200); if ((near > 0.62) !== !!pass) continue;
        const a = (0.1 + 0.62 * near) * (0.45 + 0.55 * s.b); if (a < 0.04) continue;
        const lv = 1 + Math.floor(near * 7 * (0.45 + 0.55 * s.b)), q = Math.round(a * 12);
        g.fillStyle = s.hot ? FR[q] : FW[q];
        if (streak > 0.004 && near > 0.2) { g.strokeStyle = s.hot ? "rgba(255,26,26,.35)" : "rgba(255,255,255,.22)"; g.beginPath(); g.moveTo(x, y); g.lineTo(x - (x - cx) * streak, y - (y - cy) * streak); g.stroke(); }
        g.fillText(RAMP[Math.min(9, lv)], x, y);
      }
    }
    drawConst(t, cam, cx, cy, ck);
    if (!reduced && Q.tier < 2) {
      for (let i = 0; i < heat.length; i++) heat[i] *= 0.9;
      if (m.moved && now - m.at < 450) { const mc = (m.sx / HC) | 0, mr = (m.sy / HR) | 0, tk = Math.floor(t * 5); for (let dr = -4; dr <= 4; dr++) for (let dc = -8; dc <= 8; dc++) { const c = mc + dc, r = mr + dr; if (c < 0 || c >= hcols || r < 0 || r >= hrows) continue; const dd = Math.hypot(dc / 1.9, dr); if (dd < 4) { const i = r * hcols + c, v = (1 - dd / 4) * (0.6 + 0.4 * hash(c, r, tk)); if (v > heat[i]) heat[i] = v; } } }
      g.font = '400 12px "Space Mono", ui-monospace, monospace'; g.textAlign = "center";
      for (let i = 0; i < heat.length; i++) { const hv = heat[i]; if (hv < 0.06) continue; const c = i % hcols, r = (i / hcols) | 0; g.fillStyle = hv > 0.35 ? "rgba(255,26,26," + Math.min(0.9, hv).toFixed(2) + ")" : "rgba(255,255,255," + (hv * 0.8).toFixed(2) + ")"; g.fillText(RAMP[Math.min(9, (hv * 10) | 0)], (c + 0.5) * HC, (r + 0.5) * HR); }
    }
    /* the panels */
    for (const it of items) {
      const zc = (tall && it.zt !== null ? it.zt : NK.short && it.zs !== null ? it.zs : it.z) + cam, fi = it.fi, fo = it.fo, op = it.word ? (1 - smooth(150, 520, zc)) * 0.95 * smooth(-1250, -400, zc) * (1 - B.ringVis) : (1 - smooth(fo, fo + 360, zc)) * smooth(-fi, -fi * 0.333, zc), vis = op > 0.01 && zc > -5200 && zc < 700;
      if (vis !== it.vis) { it.vis = vis; it.el.style.visibility = vis ? "visible" : "hidden"; }
      if (!vis) continue;
      const ps = tall ? it.pt : NK.short && it.ps ? it.ps : it.pw, w = 1 - Math.min(1, Math.abs(zc) / 900), X = ps[0] * VW, Y = ps[1] * VH + Math.sin(t * 0.6 + it.i * 1.7) * 6 * (it.frame ? 1 : 0.7);
      it.el.style.transform = "translate(" + ps[2] * 100 + "%,-50%) translate3d(" + X.toFixed(1) + "px," + Y.toFixed(1) + "px," + zc.toFixed(1) + "px) rotateY(" + (ps[3] + m.nx * 7 * w * (tall ? 0.6 : 1)).toFixed(2) + "deg) rotateX(" + (-m.ny * 5 * w * (tall ? 0.6 : 1)).toFixed(2) + "deg)" + (it.k < 1 ? " scale(" + it.k.toFixed(3) + ")" : "");
      it.el.style.opacity = op.toFixed(3); it.el.style.pointerEvents = op > 0.6 && Math.abs(zc) < 520 ? "auto" : "none";
      if (it.dc) NK.decode.setGroup(it.el, smooth(-fi * 0.85, -fi * 0.22, zc) * (1 - smooth(60, 380, zc)) * NK.decode.gain);
      if (it.art) it.art.draw(T);
      if (it.at) {
        const p = (it.word ? smooth(-1300, -300, zc) * (1 - smooth(150, 480, zc)) : smooth(-fi * 1.11, -fi * 0.333, zc) * (1 - smooth(60, 400, zc))) * NK.decode.gain; let mc = null, mr = 0;
        if (!reduced && m.moved && now - m.at < 450 && op > 0.3 && Math.abs(zc) < 700) { const rc = it.el.getBoundingClientRect(); if (m.sx >= rc.left && m.sx <= rc.right && m.sy >= rc.top && m.sy <= rc.bottom) { mc = Math.floor(((m.sx - rc.left) / rc.width) * it.at.cols); mr = Math.floor(((m.sy - rc.top) / rc.height) * it.at.rows); } }
        it.at.tick(p, T, now, mc, mr);
      }
    }
  });
});
})();
