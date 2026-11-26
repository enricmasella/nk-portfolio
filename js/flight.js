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
  const Z = B.Z, LEG = [
    [0, 1400, 1.0], [1400, 1400, 0.3],                                  /* hero → about: the path */
    [1400, 2500, 0.9], [2500, 2500, 0.5],                               /* → about: a bit more about me */
    [2500, 3600, 0.9], [3600, 3600, 0.3], [3600, 4100, 0.55], [4100, 4100, 0.5], [4100, 4600, 0.55], [4600, 4600, 0.45],   /* → about: how I work with AI (stance, tools, flow) */
    [4600, 5800, 0.9], [5800, 6700, 0.8], [6700, 7700, 0.7], [7700, 8700, 0.7], [8700, 9700, 0.7], [9700, 10600, 0.8],        /* → work: the word, four cards, the ring */
    [10600, 10600, 1.1], [10600, 12200, 1.5], [12200, 12200, 1.3], [12200, 13400, 0.9]                                       /* ring, → skills (constellation), → contact */
  ];
  const SUM = LEG.reduce((s, l) => s + l[2], 0), CUM = []; { let a = 0; for (const l of LEG) { CUM.push(a); a += l[2]; } }
  Object.assign(B, { LEG, CUM, SUM, cam: 0, ringVis: 0, contactK: 0, constK: 0 });

  const items = $$(".it", world).map((el, i) => {
    const d = el.dataset, pos = (s) => (s || "0,0,-0.5,0").split(",").map(Number);
    return { el, i, z: +d.z, pw: pos(d.pw), pt: pos(d.pt || d.pw), fi: +d.fi || 1350, fo: +d.fo || 120, zt: d.zt === undefined ? null : +d.zt, zs: d.zs === undefined ? null : +d.zs, ps: d.ps ? pos(d.ps) : null, k: 1, vis: true, frame: el.classList.contains("it--frame"), word: el.classList.contains("word"), dc: !!el.querySelector("[data-dc]"), art: null, at: null };
  });
  $$("[data-art]").forEach((cv) => { const it = items.find((q) => q.el.contains(cv)); if (it) it.art = NK.art(cv, cv.dataset.art); });
  B.items = items;
  const portrait = new NK.Portrait($("[data-frame]"));
  B.portrait = portrait;

  /* ───────── flat page: normal flow, nothing flies ───────── */
  if (FLAT) {
    NK.flatScroll();
    const at = (sel) => () => { const e = $(sel); return e ? e.getBoundingClientRect().top + scrollY - 70 : 0; };
    NK.sections = [
      { key: "nav.index", hash: "top", dock: true, y: () => 0 }, { key: "nav.about", hash: "about", dock: true, y: at(".it--about") }, { key: "nav.work", hash: "work", dock: true, y: at(".pj") },
      { key: "nav.skills", hash: "skills", dock: true, y: at(".it--scap") }, { key: "nav.contact", hash: "contact", dock: true, y: () => NK.scroll.max }
    ];
    NK.dock();
    NK.onFrame((t) => { for (const it of items) if (it.art) { const r = it.el.getBoundingClientRect(); if (r.bottom > 0 && r.top < NK.VH) it.art.draw(reduced ? 0 : t); } });
    return;
  }

  /* ───────── the flight ───────── */
  items.forEach((it) => { if (it.el.dataset.at) { it.at = new B.AT_(it.el, it.el.dataset.at); B.ATs.push(it.at); } });
  /* on a phone the stops that hold several pieces are stacked by their real heights (so no language or font size makes two of them overlap) */
  const stacks = [[".it--about", ".it--tg1", ".it--tg2", ".it--tg3"], [".it--me", ".it--me1", ".it--me2"], [".it--ai", ".it--ailead", ".it--aisplit"]].map((g) => g.map((s) => items.find((it) => it.el.matches(s))).filter(Boolean));
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
    { key: "nav.index", hash: "top", dock: true, y: () => 0 }, { key: "nav.about", hash: "about", dock: true, y: yAt(1, 0.02) }, { key: "nav.work", hash: "work", dock: true, y: yAt(11, 0.02) },
    { key: "nav.project", hash: "project", dock: false, y: yAt(16, 0.5) }, { key: "nav.skills", hash: "skills", dock: true, y: yAt(18, 0.15) },
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
  const CW = { hx: 390, hy: 250, hoff: 60, hz: 160, sr: 125, sv: 85, skx: 1.25, sky: 0.9, skz: 1.2, ex: 270, ey: 175, ez: -720, ey0: -40, cx: 0.13, cy: 0 };
  const CT = { hx: 150, hy: 215, hoff: 34, hz: 130, sr: 48, sv: 44, skx: 1.2, sky: 1, skz: 1.2, ex: 150, ey: 150, ez: -720, ey0: -30, cx: 0, cy: -0.045 };
  const html = document.documentElement;
  let nodes = [], edges = [], CZ = B.Z.const, C = CW, selCat = -1, selNode = null, hoverCat = -1, hoverNode = null, chipNode = null;
  const V = { zoom: 1, cx: 0, cy: 0, cz: 0, yaw: 0, pit: 0 };   /* the view: focus zoom, the point it turns around, and what the pointer has dragged */
  const lg = $$("[data-lg] button"), pick = $("[data-pick]");
  const buildConst = () => {
    C = NK.tall ? CT : CW; nodes = []; edges = [];
    const core = { label: "enric", x: 0, y: 0, z: 0, kind: "core", cat: -1, la: 0, use: [] }; nodes.push(core);
    const hubs = sk.worked.map(([key, list], k) => {
      const a = (k * Math.PI * 2) / 6 + 0.3, hub = { label: I.t(key).toLowerCase(), x: Math.cos(a) * C.hx, y: Math.sin(a) * C.hy + (k % 2 ? C.hoff : -C.hoff), z: Math.sin(a * 1.7) * C.hz, kind: "hub", cat: k, key, la: 0, use: [] }; nodes.push(hub); edges.push([core, hub, 0]);
      /* the skills of a group sit evenly on a sphere around their hub, so their names do not pile up */
      list.forEach((s, j) => { const yy = 1 - ((j + 0.5) / list.length) * 2, rr = Math.sqrt(1 - yy * yy), ph = j * 2.39996 + k * 1.3, r = C.sr + hash(k, j, 43) * C.sv; const n = { label: s, x: hub.x + Math.cos(ph) * rr * r * C.skx, y: hub.y + yy * r * C.sky, z: hub.z + Math.sin(ph) * rr * r * C.skz, kind: "skill", cat: k, la: 0, use: D.projects.filter((p) => p.stack.some((q) => q.toLowerCase() === s.toLowerCase())).map((p) => p.name) }; nodes.push(n); edges.push([hub, n, 0]); });
      return hub;
    });
    hubs.forEach((h, i) => edges.push([h, hubs[(i + 1) % hubs.length], 1]));
    const ex = { label: I.t("skills.exploring").toLowerCase(), x: 0, y: C.ey0, z: C.ez, kind: "hub", cat: 6, exp: true, key: "skills.exploring", la: 0, use: [] }; nodes.push(ex); edges.push([core, ex, 2]);
    sk.exploring.forEach((s, j) => { const a = (j * Math.PI * 2) / 5, n = { label: s, x: Math.cos(a) * C.ex, y: Math.sin(a) * C.ey + C.ey0, z: C.ez + Math.sin(a * 2) * 120, kind: "skill", cat: 6, exp: true, la: 0, use: D.projects.filter((p) => p.stack.some((q) => q.toLowerCase() === s.toLowerCase())).map((p) => p.name) }; nodes.push(n); edges.push([ex, n, 2]); });
    selNode = null; hoverNode = null; chipNode = null; pickCat = -2;
  };
  let pickCat = -2;
  buildConst(); NK.onMode(buildConst); B.nodes = () => nodes;
  /* on a phone the constellation lives between the title and the legend: its centre and size follow that free band */
  const scapIt = items.find((it) => it.el.classList.contains("it--scap")), fitC = { on: false, cy: 0, fy: 1, fx: 1, a: 0, b: 0 };
  B.measureC = () => {
    fitC.on = false; if (!NK.tall || !scapIt) return;
    const el = scapIt.el, tp = $(".scap__top", el), bt = $(".scap__bot", el); if (!tp || !bt) return;
    const a = 64 + tp.offsetHeight + 12, b = 64 + el.offsetHeight - bt.offsetHeight - 12; if (b - a < 90) return;
    fitC.on = true; fitC.a = a; fitC.b = b; fitC.cy = (a + b) / 2; fitC.fx = fitC.fy = Math.min(clamp((b - a) / 470, 0.5, 1.2), clamp(NK.VW / 390, 0.8, 1.15));
  };
  B.measureC();

  /* the name tag that follows a point, and the chips of the lit group in the legend */
  const tip = document.createElement("div"); tip.className = "sktip"; tip.setAttribute("aria-hidden", "true"); document.body.appendChild(tip);
  let tipNode = null, tipW = 0, tipH = 0;
  const tipHTML = (n) => "<b>" + NK.esc(n.label) + "</b><span>" + NK.esc(n.exp ? I.t("skills.exploring") : I.t(sk.worked[n.cat][0]) + " · " + I.t("skills.worked")) + "</span>" + (n.use.length ? '<span class="sktip__u">' + NK.esc(I.t("skills.usedIn")) + " " + NK.esc(n.use.join(" · ")) + "</span>" : "");
  const renderPick = (cat) => {
    if (!pick || cat === pickCat) return; pickCat = cat;
    pick.innerHTML = cat < 0 ? "" : nodes.map((n, i) => (n.kind === "skill" && n.cat === cat ? '<button type="button" class="chip" data-n="' + i + '">' + NK.esc(n.label) + "</button>" : "")).join("");
  };
  I.onLang(() => { for (const n of nodes) if (n.key) n.label = I.t(n.key).toLowerCase(); tipNode = null; });
  const focusCat = (k) => { selNode = null; selCat = selCat === k ? -1 : k; };
  const focusNode = (n) => { if (selNode === n || (n.kind === "hub" && selCat === n.cat)) { selNode = null; selCat = -1; } else { selNode = n.kind === "skill" ? n : null; selCat = n.cat; } };
  lg.forEach((b) => {
    b.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") hoverCat = +b.dataset.k; }); b.addEventListener("pointerleave", () => { hoverCat = -1; });
    b.addEventListener("click", () => focusCat(+b.dataset.k));
  });
  if (pick) {
    pick.addEventListener("pointerover", (e) => { const b = e.target.closest("[data-n]"); if (b && e.pointerType !== "touch") chipNode = nodes[+b.dataset.n] || null; });
    pick.addEventListener("pointerleave", () => { chipNode = null; });
    pick.addEventListener("click", (e) => { const b = e.target.closest("[data-n]"); if (b && nodes[+b.dataset.n]) focusNode(nodes[+b.dataset.n]); });
  }
  /* a click or tap on a point lights and focuses its group, a click on the empty sky lets go; a mouse can also drag the cloud round */
  const own = (el) => !(el instanceof Element) || el.closest("a,button,.dock,.hud-top,.rdet,.skills__lg,.skills__pick,.sktip");
  const pickAt = (x, y, r) => { let best = null, bd = r; for (const n of nodes) { if (n.kind === "core" || n.a < 0.3) continue; const d = Math.hypot(n.sx - x, n.sy - y); if (d < bd) { bd = d; best = n; } } return best; };
  const drag = { on: false, x: 0, y: 0, moved: false, mouse: false };
  addEventListener("pointerdown", (e) => { if (B.constK < 0.5 || e.button || own(e.target)) return; drag.on = true; drag.x = e.clientX; drag.y = e.clientY; drag.moved = false; drag.mouse = e.pointerType === "mouse"; }, { passive: true });
  addEventListener("pointermove", (e) => { if (!drag.on || !drag.mouse) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) < 5) return; drag.moved = true; V.yaw += dx * 0.006; V.pit = clamp(V.pit + dy * 0.004, -0.45, 0.45); drag.x = e.clientX; drag.y = e.clientY; html.classList.add("sk-drag"); }, { passive: true });
  addEventListener("pointerup", (e) => {
    if (!drag.on) return; drag.on = false; html.classList.remove("sk-drag"); if (drag.moved) return;
    const n = pickAt(e.clientX, e.clientY, e.pointerType === "touch" ? 46 : 32); if (n) focusNode(n); else if (selCat >= 0) { selCat = -1; selNode = null; }
  }, { passive: true });
  addEventListener("pointercancel", () => { drag.on = false; html.classList.remove("sk-drag"); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && selCat >= 0 && B.constK > 0.3) { selCat = -1; selNode = null; } });

  const hubOf = (k) => nodes.find((n) => n.kind === "hub" && n.cat === k);
  const drawConst = (t, cam, cx, cy, k, dt) => {
    const base = CZ + cam; if (k < 0.01 || base < -14500 || base > 1600) return;
    const tall = NK.tall, sm = NK.short && VW < 760, small = tall || sm, fsm = sm ? Math.min(clamp((VW - 200) / 640, 0.55, 1), clamp((VH - 110) / 470, 0.5, 1)) : 1, ft = tall && fitC.on, m = NK.mouse;
    /* on a wide screen the cloud grows with the screen; on a phone it follows the free band */
    const zx = small ? 1 : clamp(VW / 1600, 0.7, 1.25), zy = small ? 1 : Math.min(zx, clamp((VH - 150) / 660, 0.7, 1.25));
    /* focus: the view eases to the chosen group (zoom, and the point the cloud turns around) */
    const foc = selCat >= 0, hubF = foc ? hubOf(selCat) : null, ek = 1 - Math.pow(0.9, Math.min(dt || 0.016, 0.05) * 60);
    V.zoom += ((foc ? (tall ? 1.3 : sm ? 1.2 : 1.42) : 1) - V.zoom) * ek; V.cx += ((hubF ? hubF.x : 0) - V.cx) * ek; V.cy += ((hubF ? hubF.y : 0) - V.cy) * ek; V.cz += ((hubF ? hubF.z : 0) - V.cz) * ek;
    const fx = (ft ? fitC.fx : fsm) * zx * V.zoom, fy = (ft ? fitC.fy : fsm) * zy * V.zoom, cyy = ft ? fitC.cy + (cy - VH / 2) : cy + C.cy * VH;
    const yaw = t * 0.06 + cam * 0.0003 + V.yaw + (tall ? 0 : m.nx * 0.3), cyw = Math.cos(yaw), syw = Math.sin(yaw), pit = -0.18 + V.pit + (tall ? 0 : m.ny * 0.1), cp = Math.cos(pit), sp = Math.sin(pit), ox = cx + (sm ? 0.17 : C.cx) * VW;
    let near = null, nd = 30; const le = 0.17 * VW + 150 + (NK.short ? 26 : 0), lsm = 0.04 * VW + Math.min(280, 0.34 * VW) + 10;   /* where the legend ends: wide screens / a phone on its side */
    for (const n of nodes) {
      const dx = n.x - V.cx, dy = n.y - V.cy, dz = n.z - V.cz, x1 = dx * cyw + dz * syw, z1 = -dx * syw + dz * cyw, y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp, zc = z2 + base;
      n.zc = zc; if (zc > 560) { n.sx = 1e5; n.a = 0; continue; }
      const sc = P / (P - zc); n.sc = sc; n.sx = ox + x1 * sc * fx; n.sy = cyy + y2 * sc * fy;
      n.a = smooth(-4200, -1500, zc) * (1 - smooth(260, 540, zc)) * k * smooth(-6, 56, n.sx) * smooth(VW + 6, VW - 56, n.sx);
      if (!small) n.a *= smooth(le - 10, le + 90, n.sx) * smooth(40, 96, n.sy) * smooth(VH, VH - 100, n.sy);   /* nothing under the legend, the bar or the dock */
      else if (ft) n.a *= smooth(fitC.a - 6, fitC.a + 44, n.sy) * smooth(fitC.b + 6, fitC.b - 44, n.sy);   /* a phone: only inside the free band */
      else if (sm) n.a *= smooth(lsm - 14, lsm + 46, n.sx) * smooth(44, 90, n.sy) * smooth(VH - 36, VH - 96, n.sy);   /* a phone on its side: right of the legend, clear of the bar and the dock */
      if (!tall && !drag.moved) { const d = Math.hypot(n.sx - m.x, n.sy - m.y); if (d < nd && n.a > 0.3 && n.kind !== "core") { nd = d; near = n; } }
    }
    hoverNode = chipNode || near;
    const auto = small && selCat < 0 ? Math.floor(t / 2.6) % 7 : -1;
    const hc = selCat >= 0 ? selCat : hoverNode ? hoverNode.cat : hoverCat >= 0 ? hoverCat : auto;
    lg.forEach((b) => b.classList.toggle("on", +b.dataset.k === hc)); renderPick(hc);
    if (pick) for (const c of pick.children) c.classList.toggle("on", nodes[+c.dataset.n] === (selNode || hoverNode));
    html.classList.toggle("sk-live", !tall && B.constK > 0.5); html.classList.toggle("sk-hover", !tall && B.constK > 0.5 && !!near && !drag.moved);
    g.lineWidth = 1;
    for (const [a, b, kind] of edges) {
      const al = Math.min(a.a, b.a); if (al < 0.02) continue; const hot = hc >= 0 && (a.cat === hc || b.cat === hc) && (a.cat === hc || a.kind === "core") && (b.cat === hc || b.kind === "core");
      g.setLineDash(kind ? [3, 7] : []); g.strokeStyle = hot ? "rgba(255,26,26," + (0.8 * al).toFixed(3) + ")" : "rgba(255,255,255," + ((kind === 2 ? 0.1 : kind === 1 ? 0.14 : 0.24) * al * (hc >= 0 ? (foc ? 0.35 : 0.6) : 1)).toFixed(3) + ")";
      g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); g.stroke();
    }
    g.setLineDash([]); const order = nodes.filter((n) => n.a > 0.02).sort((a, b) => a.zc - b.zc), sel = selNode || hoverNode;
    if (g.letterSpacing !== undefined) g.letterSpacing = "0px";
    const ls = small ? 1 : clamp(zx * V.zoom, 1, 1.5);
    for (const n of order) {
      const on = hc >= 0 && n.cat === hc, dim = hc >= 0 && !on && n.kind !== "core", al = n.a * (n.exp ? 0.8 : 1) * (dim ? (foc ? 0.16 : 0.3) : 1), s = clamp(n.sc * (small ? 1 : ls), 0.5, 1.7);
      g.fillStyle = on ? "rgba(255,26,26," + al.toFixed(3) + ")" : n.kind === "hub" ? "rgba(255,26,26," + (al * 0.9).toFixed(3) + ")" : "rgba(255,255,255," + al.toFixed(3) + ")";
      if (n.kind === "core") { const r = 7 + 3 * Math.sin(t * 2.2); g.strokeStyle = "rgba(255,26,26," + (0.7 * al).toFixed(3) + ")"; g.beginPath(); g.arc(n.sx, n.sy, r * s, 0, 6.283); g.stroke(); g.fillStyle = "rgba(255,26,26," + al.toFixed(3) + ")"; g.fillRect(n.sx - 2.5, n.sy - 2.5, 5, 5); }
      else if (n.kind === "hub") g.fillRect(n.sx - 3.5 * s, n.sy - 3.5 * s, 7 * s, 7 * s); else g.fillRect(n.sx - 1.8 * s, n.sy - 1.8 * s, 3.6 * s, 3.6 * s);
      if (n === sel) { g.strokeStyle = "rgba(255,26,26," + al.toFixed(3) + ")"; g.lineWidth = 1.4; g.beginPath(); g.arc(n.sx, n.sy, (n.kind === "hub" ? 9 : 7.5) * s, 0, 6.283); g.stroke(); g.lineWidth = 1; }
    }
    /* the names: most important first (the pointed point, the hubs, the lit group, then the rest nearest first); a name that would land on another one waits */
    const want = [], tag = (n) => (n === sel ? 0 : n.kind === "hub" ? 1 : n.kind === "core" ? 1 : on_(n) ? 2 : 3), on_ = (n) => hc >= 0 && n.cat === hc;
    for (const n of order) { const lit = on_(n) || n === sel; if (n.kind === "skill" && !lit && (small || hc >= 0)) { n.la += (0 - n.la) * 0.3; continue; } want.push(n); }
    want.sort((a, b) => tag(a) - tag(b) || b.zc - a.zc);
    const rects = [], fits = (x0, y0, w, h) => { for (const r of rects) if (x0 < r[2] + 5 && x0 + w > r[0] - 5 && y0 < r[3] + 2 && y0 + h > r[1] - 2) return false; return true; };
    g.textBaseline = "middle"; g.lineJoin = "round";
    for (const n of want) {
      const lit = on_(n) || n === sel, dim = hc >= 0 && !lit && n.kind !== "core" && n.kind !== "hub", s = clamp(n.sc * (small ? 1 : ls), 0.9, 1.25), fs = Math.round((small ? 12 * clamp(s, 0.85, 1.3) * (ft ? clamp(fy * 1.3, 0.82, 1) : 1) : 13 * s) * (n.kind === "hub" ? 0.94 : 1)), lbl = n.kind === "hub" ? n.label.toUpperCase() : n.label;
      const w = lbl.length * fs * 0.6, right = n.sx > VW * (tall ? 0.52 : 0.86) || (!tall && n.sx + 10 + w > VW - 14), x0 = right ? n.sx - 9 * s - w : n.sx + 9 * s, y0 = n.sy - fs * 0.62, ok = fits(x0, y0, w, fs * 1.24) || n === sel;
      if (ok) rects.push([x0, y0, x0 + w, y0 + fs * 1.24]); n.la += ((ok ? 1 : 0) - n.la) * 0.28;
      const a = n.la * n.a * (n.exp ? 0.85 : 1) * (dim ? 0.4 : 1); if (a < 0.03) continue;
      g.font = (n.kind === "hub" || n === sel ? "700 " : "400 ") + fs + 'px "Space Mono", ui-monospace, monospace'; g.textAlign = right ? "right" : "left";
      const tx = n.sx + (right ? -9 : 9) * s, ty = n.sy + 0.5;
      g.lineWidth = 3.2; g.strokeStyle = "rgba(0,0,0," + Math.min(0.9, a * 0.95).toFixed(3) + ")"; g.strokeText(lbl, tx, ty); g.lineWidth = 1;
      g.fillStyle = "rgba(255,255,255," + Math.min(1, a * (n.kind === "hub" ? 1 : lit || n.kind === "core" ? 1.05 : 0.9)).toFixed(3) + ")"; g.fillText(lbl, tx, ty);
    }
    /* the name tag of the pointed or chosen point */
    const tn = sel && sel.kind === "skill" && B.constK > 0.4 && sel.a > 0.3 ? sel : null;
    if (tn !== tipNode) { tipNode = tn; if (tn) { tip.innerHTML = tipHTML(tn); tipW = tip.offsetWidth; tipH = tip.offsetHeight; } }
    if (tn) { const above = tn.sy - tipH - 18 > 64, X = clamp(tn.sx - tipW / 2, 8, VW - tipW - 8), Y = above ? tn.sy - tipH - 18 : Math.min(tn.sy + 18, VH - 60 - tipH); tip.style.transform = "translate(" + X.toFixed(1) + "px," + Y.toFixed(1) + "px)"; tip.style.opacity = "1"; } else tip.style.opacity = "0";
  };

  /* ───────── frame ───────── */
  const hint = $("#hint");
  NK.onFrame((t, dt) => {
    const S = NK.scroll; if (!S) return; const m = NK.mouse, now = performance.now(), T = reduced ? 0 : t;
    VW = NK.VW; VH = NK.VH; const cam = camAt(S), tall = NK.tall; B.cam = cam; if (tall && ((B.fc = (B.fc || 0) + 1) % 90 === 0)) B.measureC();
    B.ringVis = smooth(Z.ring - 600, Z.ring - 50, cam) * (1 - smooth(Z.ring + 50, Z.ring + 500, cam));
    B.contactK = smooth(-1000, -350, B.Z.contact + cam);
    /* the constellation only exists after the ring: nothing of it shows through the cards or the ring */
    const ck = (1 - B.ringVis) * (1 - smooth(-150, 330, CZ + cam)) * smooth(Z.ring + 100, Z.ring + 1000, cam); B.constK = ck * smooth(-4200, -1500, CZ + cam);
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
    if (B.constK < 0.03 && (selCat >= 0 || V.yaw || V.pit)) { selCat = -1; selNode = null; V.yaw = V.pit = 0; }
    drawConst(t, cam, cx, cy, ck, dt);
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
