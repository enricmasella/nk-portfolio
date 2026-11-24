/* NK engine — viewport and modes, quality, input, scroll, ASCII fields, decode, pixel type, portrait, dock.
   Plain script (no modules, no build): it works the same from disk or from a server. Needs translations.js first. */
(() => {
"use strict";
const NK = (window.NK = {});
const I = window.NK_I18N;
const root = document.documentElement;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (a, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const mq = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
const reduced = mq("(prefers-reduced-motion: reduce)");
const touch = mq("(hover: none)") || mq("(pointer: coarse)");
const FLAT = reduced || /[?&]flat(=1|&|$)/.test(location.search);   // no flight: the page keeps its normal flow (reduced motion, or ?flat)
Object.assign(NK, { clamp, lerp, smooth, hash, $, $$, reduced, touch, FLAT, t: I.t, num: I.fmtNum, I });
root.classList.toggle("flat", FLAT); root.classList.toggle("touch", touch);

/* ───────── the content that is not text: names, links, numbers (every sentence lives in translations.js) ───────── */
NK.DATA = {
  name: "Enric Masella", email: "nkdevelopmentss@gmail.com", github: "https://github.com/enricmasella", instagram: "https://www.instagram.com/enric.masella/",
  projects: [
    { id: "pkc", name: "Protecsol Karting Cup", live: true, art: "track", stack: ["PHP", "React", "TypeScript", "SEO"], strip: 5,
      fig: [[8, "stat.gp"], [5, "stat.class"]], stats: [[8, "stat.gp"], [5, "stat.class"], [270, "stat.cc"], ["sprint", "stat.format"]], link: ["https://protecsolkartingcup.com", "protecsolkartingcup.com"] },
    { id: "chess", name: "NK_Chess", live: false, art: "board", stack: ["React", "Vite", "chess.js"], strip: 5,
      fig: [[67, "stat.courses"], [1203, "stat.exercises"]], stats: [[67, "stat.courses"], [181, "stat.chapters"], [286, "stat.lines"], [1203, "stat.exercises"]] },
    { id: "uni", name: "uni", live: false, art: "bars", stack: ["Next.js", "PostgreSQL"], strip: 5,
      fig: [["PAU", "stat.audience"], [{ k: "proj.uni.fig.price" }, "stat.price"]], stats: [["PAU", "stat.audience"], [{ k: "proj.uni.fig.price" }, "stat.price"], ["Next.js", "stat.framework"], ["PostgreSQL", "stat.database"]] },
    { id: "snap", name: "SnapRoulette", live: false, art: "wheel", stack: ["Node.js", "Socket.IO"], strip: 4,
      fig: [[{ k: "proj.snap.fig.rooms" }, "stat.rooms"], ["Socket.IO", "stat.realtime"]], stats: [["Node.js", "stat.runtime"], ["Socket.IO", "stat.realtime"], [{ k: "proj.snap.fig.rooms" }, "stat.rooms"], ["MIT", "stat.license"]] }
  ],
  skills: {
    worked: [
      ["skills.cat.frontend", ["HTML5", "CSS3", "XML", "JavaScript"]], ["skills.cat.backend", ["PHP", "Symfony", "C#", "Unit testing"]],
      ["skills.cat.data", ["SQL", "MySQL", "PostgreSQL", "SQLite"]], ["skills.cat.ops", ["Linux", "Bash", "Apache", "Docker", "DNS", "Active Directory"]],
      ["skills.cat.vcs", ["Git", "GitHub", "GitHub Actions"]], ["skills.cat.ai", ["Claude Code", "GPT", "Gemini", "OpenCode", "Hermes", "OmniRoute"]]
    ],
    exploring: ["React", "Vue.js", "Next.js", "Node.js", "Socket.IO"]
  },
  tools: [["OmniRoute", "t1"], ["OpenCode", "t2"], ["Hermes", "t3"], ["Claude Code", "t4"], ["GPT", "t5"], ["Gemini", "t6"]],
  flow: [["f1", "me"], ["f2", "ai"], ["f3", "me"], ["f4", "me"], ["f5", "me"]]
};
/* a value is a number (formatted for the language), a literal, or { k: key } (translated) */
NK.val = (v) => (typeof v === "number" ? I.fmtNum(v) : v && v.k ? I.t(v.k) : v);
NK.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ───────── viewport: one stable height (the small viewport, so the phone's address bar never moves the layout), and the mode ───────── */
const modeCbs = [], sizeCbs = [], qualCbs = [];
NK.onResize = (fn) => sizeCbs.push(fn);
NK.onMode = (fn) => modeCbs.push(fn);
NK.onQuality = (fn) => qualCbs.push(fn);
NK.VW = innerWidth; NK.VH = innerHeight; NK.CH = innerHeight; NK.tall = false; NK.short = false;
let pSmall = null, pLarge = null;
const probe = (unit) => {
  const d = document.createElement("div"); d.setAttribute("aria-hidden", "true");
  d.style.cssText = "position:fixed;left:0;top:0;width:1px;height:100" + unit + ";visibility:hidden;pointer-events:none;z-index:-1";
  (document.body || root).appendChild(d); return d;
};
NK.sync = (force) => {
  if (!pSmall) { pSmall = probe("svh"); pLarge = probe("lvh"); }
  const vw = Math.max(1, root.clientWidth || innerWidth);
  let vh = pSmall.offsetHeight; if (!(vh > 120)) vh = innerHeight;
  let ch = pLarge.offsetHeight; if (!(ch >= vh)) ch = vh; ch = Math.max(ch, innerHeight, vh);
  const tall = vw / vh < 0.92 || vw < 520, short = !tall && vh < 560, modeChanged = tall !== NK.tall || short !== NK.short;
  const changed = force || vw !== NK.VW || Math.abs(vh - NK.VH) > 1 || ch !== NK.CH || modeChanged;
  NK.VW = vw; NK.VH = vh; NK.CH = ch; NK.tall = tall; NK.short = short;
  root.classList.toggle("tall", tall); root.classList.toggle("short", short); root.classList.toggle("hs", tall && vh < 720); root.classList.toggle("hxs", tall && vh < 600);
  root.style.setProperty("--vh", vh + "px"); root.style.setProperty("--ch", ch + "px"); root.style.setProperty("--vw", vw + "px");
  if (!changed) return;
  for (let i = 0; i < sizeCbs.length; i++) sizeCbs[i](vw, vh, modeChanged);
  if (modeChanged) for (let i = 0; i < modeCbs.length; i++) modeCbs[i](tall);
};
let rzT = 0, rzF = 0;
addEventListener("resize", () => { if (rzF) return; rzF = requestAnimationFrame(() => { rzF = 0; NK.sync(); }); });
addEventListener("orientationchange", () => { clearTimeout(rzT); rzT = setTimeout(() => NK.sync(), 260); });

/* ───────── quality: three tiers, chosen by what the device can do (the loop steps down when frames are slow; ?q=0|1|2 pins one) ───────── */
const qm = location.search.match(/[?&]q=([0-2])/);
const Q = (NK.quality = { tier: qm ? +qm[1] : 0, fixed: !!qm, dpr: 1, stars: 600, skip: 2 });
NK.applyQuality = () => {
  const t = Q.tier, cap = [2, 1.25, 1][t];
  Q.dpr = Math.min(devicePixelRatio || 1, cap); Q.stars = Math.round((NK.tall ? 300 : 820) * [1, 0.62, 0.36][t]); Q.skip = [2, 2, 3][t];
  for (let i = 0; i < qualCbs.length; i++) qualCbs[i](Q);
};
NK.onMode(() => NK.applyQuality());

/* ───────── frame loop, pointer, touch ───────── */
const loops = []; let lastT = 0, ema = 0, qn = 0, bad = 0; const boot0 = performance.now();
NK.onFrame = (fn) => loops.push(fn);
const tick = (now) => {
  const t = now / 1000, dt = Math.min(0.05, Math.max(0.001, t - (lastT || t - 0.016))); lastT = t;
  for (let i = 0; i < loops.length; i++) loops[i](t, dt);
  if (!Q.fixed && !document.hidden && NK.started) {
    ema = ema ? ema * 0.94 + dt * 0.06 : dt;
    if (now - boot0 > 4500 && ++qn >= 70) { qn = 0; bad = ema > 0.036 ? bad + 1 : Math.max(0, bad - 1); if (bad >= 3 && Q.tier < 2) { Q.tier++; bad = 0; NK.applyQuality(); } }
  }
  requestAnimationFrame(tick);
};
const mouse = (NK.mouse = { x: innerWidth * 0.62, y: innerHeight * 0.46, sx: innerWidth * 0.62, sy: innerHeight * 0.46, nx: 0.24, ny: -0.08, moved: false, at: -1e9, down: false, touch: false });
addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.moved = true; mouse.at = performance.now(); mouse.touch = e.pointerType === "touch"; }, { passive: true });
addEventListener("pointerdown", (e) => { mouse.down = true; mouse.touch = e.pointerType === "touch"; }, { passive: true });
addEventListener("pointerup", () => { mouse.down = false; }, { passive: true });
const finger = (e) => { const q = e.touches && e.touches[0]; if (!q) return; mouse.x = q.clientX; mouse.y = q.clientY; mouse.moved = true; mouse.at = performance.now(); mouse.touch = true; };
addEventListener("touchstart", finger, { passive: true }); addEventListener("touchmove", finger, { passive: true });
NK.onFrame((t, dt) => {
  const now = performance.now(), idle = touch && now - mouse.at > 2200;
  /* with no pointer (a phone) the view sways on its own, slowly; a finger on the glass takes over */
  const tx = idle ? NK.VW * (0.5 + 0.3 * Math.sin(t * 0.23)) : mouse.x, ty = idle ? NK.VH * (0.5 + 0.22 * Math.sin(t * 0.31 + 1.3)) : mouse.y;
  const k = 1 - Math.pow(1 - (idle ? 0.05 : 0.16), dt * 60);
  mouse.sx += (tx - mouse.sx) * k; mouse.sy += (ty - mouse.sy) * k;
  mouse.nx = (mouse.sx / NK.VW) * 2 - 1; mouse.ny = (mouse.sy / NK.VH) * 2 - 1;
});

/* ───────── assets: the photo layers, the ASCII grid of the photo, and the fonts (the ASCII type is measured with them) ───────── */
NK.img = {};
NK.PLATE = { w: 1520, h: 1136, visible: 1060, bust: 1327, face: 1026, glasses: { x: 556, y: 318, w: 388, h: 140 }, head: { x: 760, y: 470 } };
NK.ready = (async () => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  const [photo, xray, glasses] = await Promise.all([load("assets/hero-photo.webp"), load("assets/hero-xray.webp"), load("assets/hero-glasses.webp")]);
  NK.img = { photo, xray, glasses };
  try { await Promise.all([document.fonts.load('700 100px Oswald'), document.fonts.load('500 40px Oswald'), document.fonts.load('400 13px "Space Mono"'), document.fonts.load('700 13px "Space Mono"')]); } catch (e) {}
  if (document.fonts && document.fonts.ready) { try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) {} }
  const g = window.NK_GRID;
  if (g) {
    const bin = atob(g.b64), n = g.cols * g.rows, L = new Uint8Array(n), A = new Uint8Array(n);
    for (let i = 0; i < n; i++) { L[i] = bin.charCodeAt(i); A[i] = bin.charCodeAt(n + i); }
    NK.grid = { cols: g.cols, rows: g.rows, L, A };
  }
  return NK;
})();
const boots = []; NK.boot = (fn) => boots.push(fn); NK.boots = boots;
NK.started = false; NK.startAt = 0;

/* ───────── smooth scroll: native scroll gives the height, a lerped value drives everything that moves ───────── */
NK.scroller = ({ spacer, ease = 0.085, height }) => {
  const S = (NK.scroll = { y: 0, target: 0, vel: 0, max: 1, p: 0, vh: NK.VH, vw: NK.VW, flat: false });
  const measure = () => { S.vh = NK.VH; S.vw = NK.VW; const h = height(S); spacer.style.height = Math.round(h + (NK.CH - NK.VH)) + "px"; S.max = Math.max(1, h - S.vh); };
  NK.onResize(measure); measure();
  S.y = S.target = scrollY;
  NK.onFrame((t, dt) => {
    S.target = scrollY;
    const k = reduced ? 1 : 1 - Math.pow(1 - ease, dt * 60);
    const prev = S.y; S.y += (S.target - S.y) * k; if (Math.abs(S.target - S.y) < 0.05) S.y = S.target;
    S.vel = (S.y - prev) / Math.max(dt, 1e-3); S.p = clamp(S.y / S.max);
  });
  S.remeasure = measure;
  NK.goto = (y, snap) => { const to = clamp(y, 0, S.max); scrollTo({ top: to, left: 0, behavior: "auto" }); if (snap) S.y = S.target = to; };
  return S;
};
/* flat page: the browser scrolls the normal flow; this only feeds the dock and the readouts */
NK.flatScroll = () => {
  const S = (NK.scroll = { y: scrollY, target: scrollY, vel: 0, max: 1, p: 0, vh: NK.VH, vw: NK.VW, flat: true });
  NK.onFrame(() => { S.y = S.target = scrollY; S.vh = NK.VH; S.vw = NK.VW; S.max = Math.max(1, root.scrollHeight - innerHeight); S.p = clamp(S.y / S.max); });
  NK.goto = (y) => scrollTo({ top: clamp(y, 0, S.max), behavior: reduced ? "auto" : "smooth" });
  return S;
};

/* ───────── ASCII field: a canvas of glyphs whose density the caller fills in ───────── */
const RAMP = " .:-=+*#%@";
NK.RAMP = RAMP;
NK.Field = class {
  constructor(canvas, { cw = 9, ch = 16, size = 13, ink = "255,255,255", hot = "255,26,26" } = {}) {
    this.c = canvas; this.x = canvas.getContext("2d"); this.cw = cw; this.ch = ch; this.size = size; this.ink = ink; this.hot = hot;
    this.resize(); NK.onResize(() => this.resize()); NK.onQuality(() => this.resize());
  }
  set(o) { Object.assign(this, o); this.resize(); }
  resize() {
    const w = NK.VW, h = NK.VH, d = (this.dpr = Q.dpr); this.W = w; this.H = h;
    this.c.width = Math.round(w * d); this.c.height = Math.round(h * d); this.c.style.width = w + "px"; this.c.style.height = h + "px";
    this.cols = Math.ceil(w / this.cw); this.rows = Math.ceil(h / this.ch);
    this.D = new Float32Array(this.cols * this.rows); this.Hot = new Float32Array(this.cols * this.rows);
    this.x.setTransform(d, 0, 0, d, 0, 0); this.x.font = "400 " + this.size + 'px "Space Mono", ui-monospace, monospace'; this.x.textBaseline = "middle"; this.x.textAlign = "center";
  }
  /* D[i] = density 0..1, Hot[i] = how red 0..1 (the caller fills both, then calls draw) */
  draw(maxAlpha = 0.5) {
    const x = this.x, { cols, rows, cw, ch, D, Hot } = this; x.clearRect(0, 0, this.W, this.H);
    let cur = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, d = D[i]; if (d <= 0.04) continue;
      const lv = Math.min(9, (d * 10) | 0); if (lv < 1) continue;
      const hot = Hot[i], a = Math.min(maxAlpha, 0.05 + d * maxAlpha);
      const col = hot > 0.5 ? this.hot : this.ink, key = col + "|" + ((a * 24) | 0);
      if (key !== cur) { cur = key; x.fillStyle = "rgba(" + col + "," + (((a * 24) | 0) / 24).toFixed(3) + ")"; }
      x.fillText(RAMP[lv], c * cw + cw * 0.5, r * ch + ch * 0.5);
    }
  }
  clear() { this.x.clearRect(0, 0, this.W, this.H); }
};

/* ───────── text: scrubbed decode, driven by depth or by position ───────── */
const NOISE = "/\\|_-+*#<>[]{}=:;.%&$@0123456789";
NK.scrub = (text, p, tick = 0, lead = 4) => {
  const n = text.length, front = p * (n + lead); let out = "";
  for (let i = 0; i < n; i++) {
    const ch = text[i];
    if (ch === " " || ch === "\n") out += ch;
    else if (i < front - lead) out += ch;
    else if (i < front) out += NOISE[Math.floor(hash(i * 131 + tick * 17 + 3) * NOISE.length)];
    else out += " ";
  }
  return out;
};
NK.decode = (() => {
  const items = []; const norm = (s) => s.replace(/\s+/g, " ").trim();
  /* a heading must not reflow while it decodes: it keeps the width of its finished text */
  const lock = (it) => { if (it.el.dataset.dc !== "line") return; it.el.style.minWidth = ""; it.el.textContent = it.text; it.el.style.minWidth = Math.ceil(it.el.offsetWidth) + "px"; };
  const say = (it) => { if (it.sr) it.sr.textContent = it.text; else it.el.setAttribute("aria-label", it.text); };
  return {
    gain: 1,
    /* scrambled text is noise for a screen reader: headings carry the finished text as their label, anything else hides the noise and has a hidden twin */
    init(scope = document) {
      $$("[data-dc]", scope).forEach((el) => {
        if (el.__dc) return; const text = norm(el.dataset.i18n ? I.t(el.dataset.i18n) : el.textContent); const it = (el.__dc = { el, text, p: -1, tick: -1, sr: null });
        if (!/^H[1-6]$/.test(el.tagName)) { it.sr = document.createElement("span"); it.sr.className = "sr"; el.setAttribute("aria-hidden", "true"); el.after(it.sr); }
        el.textContent = text; say(it); lock(it); items.push(it);
      });
    },
    /* after a language change: new text, new locked width, forced redraw */
    refresh() { for (const it of items) { if (it.el.dataset.i18n) it.text = norm(I.t(it.el.dataset.i18n)); say(it); lock(it); it.p = -1; it.tick = -1; } },
    /* zone: how much of the viewport (from the centre) is fully decoded; for pages that keep their flow */
    update(vh = NK.VH, now = performance.now(), zone = 0.9) {
      const tick = Math.floor(now / 70);
      for (let i = 0; i < items.length; i++) {
        const it = items[i], r = it.el.getBoundingClientRect();
        if (r.bottom < -20 || r.top > vh + 20) { if (it.p !== 0) { it.p = 0; it.el.textContent = NK.scrub(it.text, 0); } continue; }
        const cy = (r.top + r.bottom) / 2, d = Math.abs(cy - vh / 2) / (vh / 2), p = reduced ? 1 : (1 - smooth(zone, zone + 0.34, d)) * NK.decode.gain;
        if (Math.abs(p - it.p) < 0.004 && (p >= 1 || p <= 0 || it.tick === tick)) continue;
        it.p = p; it.tick = tick; it.el.textContent = p >= 1 ? it.text : NK.scrub(it.text, p, tick);
      }
    },
    /* every [data-dc] inside an item at the same progress p (0 noise .. 1 text): for scenes that decide by depth */
    setGroup(el0, p) {
      const tick = Math.floor(performance.now() / 70);
      el0.querySelectorAll("[data-dc]").forEach((el) => { const it = el.__dc; if (!it) return; if (Math.abs(p - it.p) < 0.004 && (p >= 1 || p <= 0 || it.tick === tick)) return; it.p = p; it.tick = tick; el.textContent = p >= 1 ? it.text : NK.scrub(it.text, p, tick); });
    },
    /* one-shot decode of a single element (the text it should end as is given) */
    play(el, text, { duration = 900, delay = 0 } = {}) {
      if (reduced) { el.textContent = text; return; }
      const t0 = performance.now() + delay; el.textContent = NK.scrub(text, 0);
      const step = (now) => { const k = (now - t0) / duration; if (k < 0) { requestAnimationFrame(step); return; } if (k >= 1) { el.textContent = text; return; } el.textContent = NK.scrub(text, k, Math.floor(now / 55)); requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
  };
})();

/* ───────── pixel-block type: A–Z, 0–9 and a little punctuation (no accents: they are folded away) ───────── */
const F = (s) => s.split("/");
const GLYPHS = {
  A: F(".###./#...#/#...#/#####/#...#/#...#/#...#"), B: F("####./#...#/#...#/####./#...#/#...#/####."), C: F(".####/#..../#..../#..../#..../#..../.####"),
  D: F("####./#...#/#...#/#...#/#...#/#...#/####."), E: F("#####/#..../#..../####./#..../#..../#####"), F: F("#####/#..../#..../####./#..../#..../#...."),
  G: F(".####/#..../#..../#..##/#...#/#...#/.####"), H: F("#...#/#...#/#...#/#####/#...#/#...#/#...#"), I: F("#####/..#../..#../..#../..#../..#../#####"),
  J: F("..###/...#./...#./...#./...#./#..#./.##.."), K: F("#...#/#..#./#.#../##.../#.#../#..#./#...#"), L: F("#..../#..../#..../#..../#..../#..../#####"),
  M: F("#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#"), N: F("#...#/##..#/#.#.#/#..##/#...#/#...#/#...#"), O: F(".###./#...#/#...#/#...#/#...#/#...#/.###."),
  P: F("####./#...#/#...#/####./#..../#..../#...."), Q: F(".###./#...#/#...#/#...#/#.#.#/#..#./.##.#"), R: F("####./#...#/#...#/####./#.#../#..#./#...#"),
  S: F(".####/#..../#..../.###./....#/....#/####."), T: F("#####/..#../..#../..#../..#../..#../..#.."), U: F("#...#/#...#/#...#/#...#/#...#/#...#/.###."),
  V: F("#...#/#...#/#...#/#...#/#...#/.#.#./..#.."), W: F("#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#"), X: F("#...#/#...#/.#.#./..#../.#.#./#...#/#...#"),
  Y: F("#...#/#...#/.#.#./..#../..#../..#../..#.."), Z: F("#####/....#/...#./..#../.#.../#..../#####"),
  0: F(".###./#...#/#..##/#.#.#/##..#/#...#/.###."), 1: F("..#../.##../..#../..#../..#../..#../.###."), 2: F(".###./#...#/....#/...#./..#../.#.../#####"),
  3: F("####./....#/....#/.###./....#/....#/####."), 4: F("...#./..##./.#.#./#..#./#####/...#./...#."), 5: F("#####/#..../####./....#/....#/#...#/.###."),
  6: F(".###./#..../#..../####./#...#/#...#/.###."), 7: F("#####/....#/...#./..#../.#.../.#.../.#..."), 8: F(".###./#...#/#...#/.###./#...#/#...#/.###."),
  9: F(".###./#...#/#...#/.####/....#/....#/.###."), ".": F("./././././././#"), ":": F("./#/./././#/."), "/": F("....#/....#/...#./..#../.#.../#..../#...."), "+": F("...../..#../..#../#####/..#../..#../.....")
};
GLYPHS["-"] = ["", "", "", "####", "", "", ""]; GLYPHS["_"] = ["", "", "", "", "", "", "#####"];
NK.plain = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
NK.pixelText = (text, { track = 3.4, fill = 0.8 } = {}) => {
  const rects = []; let x0 = 0; const pitch = 10, size = pitch * fill, off = (pitch - size) / 2, src = NK.plain(text);
  for (const chr of src) {
    const g = GLYPHS[chr.toUpperCase()];
    if (!g) { x0 += 3 + track * 0.4; continue; }
    let w = 0; for (const row of g) w = Math.max(w, row.length);
    for (let r = 0; r < g.length; r++) for (let c = 0; c < (g[r] || "").length; c++) if (g[r][c] === "#") rects.push({ x: (x0 + c) * pitch + off, y: r * pitch + off, k: hash(x0 + c, r, 9) });
    x0 += w + track;
  }
  const W = Math.max(1, x0 - track) * pitch, H = 7 * pitch;
  let s = '<svg class="px" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true" focusable="false" preserveAspectRatio="xMinYMid meet">';
  rects.forEach((q) => { s += '<rect x="' + q.x.toFixed(1) + '" y="' + q.y.toFixed(1) + '" width="' + size + '" height="' + size + '" data-k="' + q.k.toFixed(3) + '"/>'; });
  return { html: s + "</svg>", W, H, rects: rects.length };
};
/* p 0..1: the cells switch on in a random order with a short flicker, red while they arrive */
NK.pixelReveal = (svg, p) => {
  const rs = svg.children, now = Math.floor(performance.now() / 60);
  for (let i = 0; i < rs.length; i++) {
    const k = +rs[i].dataset.k, t = clamp((p * 1.35 - k * 0.35) / 0.35);
    const flick = t > 0 && t < 1 ? (hash(i, now) > 0.4 ? 1 : 0.15) : 1;
    rs[i].style.opacity = t <= 0 ? 0 : (t * flick).toFixed(2); rs[i].style.fill = t > 0 && t < 0.7 ? "var(--red)" : "";
  }
};
NK.pixel = (el, text, opt) => { const r = NK.pixelText(text, opt); el.innerHTML = r.html; el.style.setProperty("--ar", r.W / r.H); return el.firstChild; };

/* ───────── morph between two scenes, cell by cell: 0 = still A, 1 = already B, 2 = the flickering edge ───────── */
NK.morph = (m, c, r, cols, rows, dir = 2) => {
  const w = dir === 0 ? c / cols : dir === 1 ? r / rows : (c / cols + r / rows) * 0.5;
  const thr = hash(c, r, 11) * 0.55 + w * 0.45, v = m * 1.35 - 0.175;
  return v > thr + 0.035 ? 1 : v > thr - 0.035 ? 2 : 0;
};

/* ───────── little ASCII plates, one per project (a track, a board, bars, a wheel), drawn live ───────── */
NK.art = (canvas, kind, { cols = 46, rows = 17 } = {}) => {
  const x = canvas.getContext("2d"); let W = 0, H = 0, cw = 0, ch = 0, d = Q.dpr;
  const size = () => { d = Q.dpr; W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return; canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); cw = W / cols; ch = H / rows; x.setTransform(d, 0, 0, d, 0, 0); };
  if (window.ResizeObserver) new ResizeObserver(size).observe(canvas); size(); NK.onQuality(size);
  const sm = (a, b, v) => smooth(a, b, v);
  const fns = {
    track: (u, v, t, A) => { const e = Math.hypot((u - 0.5) / 0.4, (v - 0.5) / 0.34), dd = Math.abs(e - 1), ring = 1 - sm(0, 0.12, dd), inner = (1 - sm(0, 0.1, Math.abs(Math.hypot((u - 0.5) / 0.26, (v - 0.5) / 0.2) - 1))) * 0.35;
      const a = t * 0.9, kx = 0.5 + 0.4 * Math.cos(a), ky = 0.5 + 0.34 * Math.sin(a), kd = Math.hypot((u - kx) * A, (v - ky)), kart = Math.exp(-kd * kd / 0.0016);
      return [Math.max(ring, inner, kart), kart > 0.3 ? 1 : 0]; },
    board: (u, v, t, A) => { const S = 0.9, bw = S / A, ox = 0.5 - bw / 2, oy = 0.5 - S / 2, i = Math.floor(((u - ox) / bw) * 8), j = Math.floor(((v - oy) / S) * 8); if (i < 0 || i > 7 || j < 0 || j > 7) return [0, 0];
      const path = [[1, 6], [2, 4], [4, 3], [6, 2], [5, 0], [3, 1]], n = Math.floor(t * 1.3) % path.length; let hot = 0, dens = ((i + j) % 2) * 0.5 + 0.1;
      for (let q = 0; q < path.length; q++) { if (path[q][0] === i && path[q][1] === j) { const age = (n - q + path.length) % path.length; if (age < 3) { dens = 0.95 - age * 0.18; hot = age === 0 ? 1 : 0; } } } return [dens, hot]; },
    bars: (u, v, t) => { const n = 9, k = Math.floor(u * n), f = u * n - k; if (f < 0.18 || f > 0.9) return [0, 0]; const h = 0.22 + 0.62 * (0.5 + 0.5 * Math.sin(t * 0.7 + k * 0.95)), top = 1 - h, inBar = v > top, hot = v > top && v < top + 0.07 ? 1 : 0, mark = Math.abs(v - 0.4) < 0.025 && ((u * 60) | 0) % 3 === 0 ? 0.8 : 0;
      return [inBar ? 0.35 + 0.5 * (v - top) / Math.max(h, 0.05) : mark, hot || (mark ? 1 : 0)]; },
    wheel: (u, v, t, A) => { const dx = (u - 0.5) * A, dy = v - 0.5, r = Math.hypot(dx, dy), R = 0.42, a = Math.atan2(dy, dx) - t * 0.5, ring = 1 - sm(0, 0.045, Math.abs(r - R)), sp = r < R ? (1 - sm(0, 0.07, Math.abs(((a % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4) * r))) * 0.6 : 0, hub = r < 0.06 ? 1 : 0;
      const ba = -t * 1.7, bx = 0.74 * R * Math.cos(ba), by = 0.74 * R * Math.sin(ba), bd = Math.hypot(dx - bx, dy - by), ball = Math.exp(-bd * bd / 0.0012); return [Math.max(ring, sp, hub, ball), ball > 0.3 ? 1 : 0]; }
  };
  const fn = fns[kind] || fns.track;
  return { draw(t) {
    if (!W) return; const A = W / H; x.clearRect(0, 0, W, H); x.font = "400 " + (ch * 0.92).toFixed(1) + 'px "Space Mono", ui-monospace, monospace'; x.textAlign = "center"; x.textBaseline = "middle";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const [dn, hot] = fn((c + 0.5) / cols, (r + 0.5) / rows, t, A); if (dn < 0.08) continue; const lv = Math.min(9, 1 + ((dn * 9) | 0)); x.fillStyle = hot ? "rgba(255,26,26," + (0.55 + dn * 0.45).toFixed(2) + ")" : "rgba(255,255,255," + (0.18 + dn * 0.7).toFixed(2) + ")"; x.fillText(RAMP[lv], (c + 0.5) * cw, (r + 0.5) * ch); }
  } };
};

/* markup of the framed portrait (the canvas is driven by NK.Portrait) */
NK.frameHTML = () => '<figure class="frame bk" data-frame role="img" data-i18n-attr="aria-label:hero.photoAlt"><canvas aria-hidden="true"></canvas><span class="ruler ruler--t"></span><span class="ruler ruler--l"></span>' +
  '<span class="ft ft--tl" aria-hidden="true"><i class="dot live"></i>enric masella</span>' +
  '<span class="ft ft--tr" data-pst aria-hidden="true"><span data-i18n="frame.lens">x-ray lens</span> <b class="st st--i" data-i18n="frame.idle">idle</b><b class="st st--a" data-i18n="frame.active">active</b></span>' +
  '<span class="ft ft--bl" data-pxy aria-hidden="true">x 000 y 000</span><span class="ft ft--br" aria-hidden="true" data-i18n="frame.place">girona, cat</span><i class="reticle" data-rt aria-hidden="true"></i></figure>';

/* ───────── the dock (bottom bar): sections, clock, readouts; the section in view is also the #hash of the address ───────── */
NK.sections = [];
NK.dock = () => {
  const dock = $("#dock"), a = $("[data-links]", dock), clock = $("[data-clock]", dock), sc = $("[data-sc]", dock), xy = $("[data-xy]", dock);
  const links = NK.sections.filter((s) => s.dock);
  a.innerHTML = links.map((l, i) => '<button type="button" data-i="' + i + '" data-i18n="' + l.key + '"></button>').join("");
  I.applyDom(a);
  const btn = $$("button", a), ypos = (s) => (typeof s.y === "function" ? s.y() : s.y);
  a.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; NK.goto(ypos(links[+b.dataset.i])); });
  const pad = (n, l) => String(Math.round(n)).padStart(l, "0");
  let lastSec = -1, cur = -1, hashAt = 0, hashNow = "";
  NK.onFrame(() => {
    const S = NK.scroll; if (!S) return;
    sc.textContent = "scroll " + pad(S.p * 100, 3) + "%"; xy.textContent = "x " + pad(mouse.x, 4) + " y " + pad(mouse.y, 4);
    const d = new Date(), sec = d.getSeconds();
    if (sec !== lastSec) { lastSec = sec; const off = -d.getTimezoneOffset() / 60; clock.textContent = "gmt" + (off >= 0 ? "+" : "") + off + " " + pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2) + ":" + pad(sec, 2); }
    /* the section in view: the last one whose start is already behind the middle of the screen */
    let now = 0, nowAll = 0; links.forEach((l, i) => { if (S.y >= ypos(l) - S.vh * 0.45) now = i; }); NK.sections.forEach((s, i) => { if (S.y >= ypos(s) - S.vh * 0.45) nowAll = i; });
    if (now !== cur) { cur = now; btn.forEach((b, i) => { b.classList.toggle("on", i === now); if (i === now) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); }); }
    const h = NK.sections[nowAll].hash, tn = performance.now();
    if (h !== hashNow && tn - hashAt > 500 && NK.hashReady) { hashAt = tn; hashNow = h; try { history.replaceState(null, "", "#" + h); } catch (e) {} }
  });
};
/* open the section named in the address, if there is one (called once the world exists) */
NK.openHash = () => {
  const h = decodeURIComponent((location.hash || "").slice(1)).toLowerCase(); NK.hashReady = true;
  if (!h) return; const s = NK.sections.find((q) => q.hash === h); if (!s) return;
  NK.goto(typeof s.y === "function" ? s.y() : s.y, true);
};

/* ───────── the portrait in its frame: photo, X-ray lens under the cursor, sunglasses on top, photo → ASCII ───────── */
NK.Portrait = class {
  constructor(el, opt = {}) {
    this.el = el; this.cv = $("canvas", el); this.cx = this.cv.getContext("2d");
    this.o = Object.assign({ fit: 0.97, cols: 76, auto: true }, opt);
    this.ascii = 0; this.intro = reduced ? 1 : 0; this.t0 = null; this.trail = []; this.hover = false; this.pos = { x: 0, y: 0 }; this.sweep = { t0: 0, on: false, next: 4 };
    this.rt = $("[data-rt]", el); this.xyEl = $("[data-pxy]", el); this.stEl = $("[data-pst]", el);
    this.layer = document.createElement("canvas"); this.lx = this.layer.getContext("2d"); this.mask = document.createElement("canvas"); this.mx = this.mask.getContext("2d");
    this.panel = document.createElement("canvas"); this.size();
    if (window.ResizeObserver) new ResizeObserver(() => this.size()).observe(el);
    NK.onQuality(() => this.size());
    el.addEventListener("pointerenter", () => { this.hover = true; }); el.addEventListener("pointerleave", () => { this.hover = false; });
    el.addEventListener("pointermove", (e) => this.point(e), { passive: true });
    NK.onFrame((t, dt) => this.frame(t, dt));
  }
  point(e) { const r = this.cv.getBoundingClientRect(), sx = this.w / Math.max(r.width, 1), sy = this.h / Math.max(r.height, 1); this.pos.x = (e.clientX - r.left) * sx; this.pos.y = (e.clientY - r.top) * sy; }
  size() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return; const d = (this.dpr = Q.dpr);
    this.w = w; this.h = h; for (const c of [this.cv, this.layer, this.mask, this.panel]) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    this.cv.style.width = w + "px"; this.cv.style.height = h + "px"; this.makePanel();
    // the bust is bottom-aligned in the frame, rows 60..1136 of the plate fill the height (zoom < 1 leaves air above the head)
    const P = NK.PLATE, zoom = this.o.zoom || 0.92; this.s = (h / 1076) * zoom;
    this.px = w / 2 - 760 * this.s + (this.o.dx || 0) * this.s; this.py = h - 1136 * this.s + (this.o.dy || 0) * this.s; this.R = 0.27 * P.face * this.s;
  }
  makePanel() {
    const d = this.dpr, x = this.panel.getContext("2d"), w = this.w, h = this.h; x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
    x.fillStyle = "#050506"; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.75); g.addColorStop(0, "#1b1c22"); g.addColorStop(0.55, "#0a0a0d"); g.addColorStop(1, "#050506"); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(255,255,255,.07)"; x.lineWidth = 1; const hx = w * 0.5, hy = h * 0.46;
    for (const k of [0.34, 0.52, 0.74]) { x.beginPath(); x.arc(hx, hy, h * k, 0, Math.PI * 2); x.stroke(); }
    x.fillStyle = "rgba(255,255,255,.09)"; for (let yy = 8; yy < h; yy += 16) for (let xx = 8; xx < w; xx += 16) x.fillRect(xx, yy, 1, 1);
    x.fillStyle = "rgba(0,0,0,.18)"; for (let yy = 0; yy < h; yy += 3) x.fillRect(0, yy, w, 1);
  }
  visible() { const r = this.el.getBoundingClientRect(); return r.bottom > -40 && r.top < NK.VH + 40 && r.right > -40 && r.left < NK.VW + 40; }
  frame(t, dt) {
    if (!NK.started || !this.w || !NK.img.photo) return; if (!this.visible()) return;
    if (this.t0 === null) this.t0 = performance.now(); const now = performance.now();
    if (this.intro < 1) this.intro = Math.min(1, (now - this.t0) / (this.o.introMs || 2600));
    const { cx, w, h, s, px, py } = this, d = this.dpr, P = NK.PLATE, nx = mouse.nx, ny = mouse.ny;
    const par = { x: nx * 5, y: ny * 3.5 }, rise = (1 - smooth(0, 0.5, this.intro)) * 26 * s * 3;
    const ox = px + par.x, oy = py + par.y + rise;
    // lens position: the pointer when it is over the frame, the idle sweep otherwise
    let lens = null;
    if (this.hover) { lens = { x: this.pos.x, y: this.pos.y, k: 1 }; this.sweep.on = false; this.sweep.next = t + 5; }
    else if (this.o.auto && this.intro >= 1 && !reduced) {
      if (!this.sweep.on && t > this.sweep.next) { this.sweep.on = true; this.sweep.t0 = t; }
      if (this.sweep.on) { const k = (t - this.sweep.t0) / 2.4; if (k >= 1) { this.sweep.on = false; this.sweep.next = t + 7; } else { const e = k * k * (3 - 2 * k); lens = { x: lerp(w * 0.22, w * 0.8, e), y: h * (0.44 + 0.07 * Math.sin(e * 6.2)), k: Math.sin(Math.PI * k) }; } }
    }
    if (lens) { this.trail.push({ x: lens.x, y: lens.y, t, k: lens.k }); }
    while (this.trail.length && t - this.trail[0].t > 0.6) this.trail.shift();
    // base: panel, photo
    cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, w, h); cx.drawImage(this.panel, 0, 0, w, h);
    const lx = this.lx; lx.setTransform(d, 0, 0, d, 0, 0); lx.clearRect(0, 0, w, h);
    const scan = this.intro < 1 ? smooth(0.06, 0.92, this.intro) : 1, scanY = py + lerp(40 * s, P.h * s + 250 * s, scan) + rise, depth = 250 * s;
    if (this.intro < 1) {
      lx.save(); lx.beginPath(); lx.rect(0, 0, w, Math.max(0, scanY - depth)); lx.clip(); lx.drawImage(NK.img.photo, ox, oy, P.w * s, P.h * s); lx.restore();
      lx.save(); lx.beginPath(); lx.rect(0, Math.max(0, scanY - depth), w, Math.min(depth, scanY)); lx.clip(); lx.drawImage(NK.img.xray, ox, oy, P.w * s, P.h * s); lx.restore();
    } else lx.drawImage(NK.img.photo, ox, oy, P.w * s, P.h * s);
    // ASCII: cells flip from photo to glyph
    const A = this.ascii; let cells = null;
    if (A > 0.001 && NK.grid) cells = this.asciiCells(lx, A, ox, oy);
    // lens
    if (this.trail.length && this.intro >= 1) {
      const m = this.mx; m.setTransform(d, 0, 0, d, 0, 0); m.clearRect(0, 0, w, h); m.fillStyle = "#fff";
      if ("filter" in m) m.filter = "blur(" + (3 + this.R * 0.05).toFixed(1) + "px)";
      for (const q of this.trail) { const age = (t - q.t) / 0.6, rr = this.R * (1 - age) ** 0.8 * (0.75 + 0.25 * q.k); if (rr < 1) continue; m.beginPath(); for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2, rad = rr * (1 + 0.07 * Math.sin(a * 3 + t * 2.2 + q.x * 0.02) + 0.04 * Math.sin(a * 5 - t * 3)), X = q.x + Math.cos(a) * rad, Y = q.y + Math.sin(a) * rad; i ? m.lineTo(X, Y) : m.moveTo(X, Y); } m.fill(); }
      if ("filter" in m) m.filter = "none";
      // x-ray into a temp layer, masked
      if (!this.tmp) { this.tmp = document.createElement("canvas"); } const tc = this.tmp; if (tc.width !== this.cv.width) { tc.width = this.cv.width; tc.height = this.cv.height; }
      const tx = tc.getContext("2d"); tx.setTransform(d, 0, 0, d, 0, 0); tx.globalCompositeOperation = "source-over"; tx.clearRect(0, 0, w, h);
      tx.drawImage(NK.img.xray, ox, oy, P.w * s, P.h * s);
      tx.globalCompositeOperation = "destination-in"; tx.setTransform(1, 0, 0, 1, 0, 0); tx.drawImage(this.mask, 0, 0); tx.globalCompositeOperation = "source-over"; tx.setTransform(d, 0, 0, d, 0, 0);
      cx.drawImage(lx.canvas, 0, 0, w, h); cx.drawImage(tc, 0, 0, w, h);
      // the red rim of the brush: a ring on the newest point
      const q = this.trail[this.trail.length - 1]; cx.save(); cx.strokeStyle = "rgba(255,26,26," + (0.55 * q.k).toFixed(2) + ")"; cx.lineWidth = 1.2; cx.shadowColor = "rgba(255,26,26,.9)"; cx.shadowBlur = 10; cx.beginPath(); cx.arc(q.x, q.y, this.R * (0.75 + 0.25 * q.k), 0, Math.PI * 2); cx.stroke(); cx.restore();
      if (this.stEl) this.stEl.classList.add("on");
    } else { cx.drawImage(lx.canvas, 0, 0, w, h); if (this.stEl) this.stEl.classList.remove("on"); }
    // sunglasses, always on top and in place
    if (NK.img.glasses) { const G = P.glasses, gy = oy + G.y * s; if (this.intro >= 1 || gy + G.h * s < scanY) { cx.save(); cx.globalAlpha = 1 - 0.92 * smooth(0.15, 0.75, A); cx.drawImage(NK.img.glasses, ox + G.x * s, gy, G.w * s, G.h * s); cx.restore(); } }
    if (cells) this.drawGlyphs(cx, cells);
    // scan line
    if (this.intro < 1) { cx.save(); const g = cx.createLinearGradient(0, scanY - 14, 0, scanY + 4); g.addColorStop(0, "rgba(255,26,26,0)"); g.addColorStop(0.8, "rgba(255,120,110,.55)"); g.addColorStop(1, "rgba(255,255,255,.95)"); cx.fillStyle = g; cx.fillRect(0, scanY - 14, w, 18); cx.restore(); }
    // DOM chrome: reticle + readout
    if (this.rt) { const on = this.hover; this.rt.style.opacity = on ? 1 : 0; if (on) this.rt.style.transform = "translate3d(" + (this.pos.x - 14).toFixed(1) + "px," + (this.pos.y - 14).toFixed(1) + "px,0)"; }
    if (this.xyEl) { const px2 = this.hover ? this.pos.x : w / 2, py2 = this.hover ? this.pos.y : h / 2; this.xyEl.textContent = "x " + String(Math.round(px2)).padStart(3, "0") + " y " + String(Math.round(py2)).padStart(3, "0"); }
  }
  asciiCells(lx, A, ox, oy) {
    const { w, h, s } = this, G = NK.grid, P = NK.PLATE, cols = this.o.cols, cw = w / cols, ch = cw * 2.0, rows = Math.ceil(h / ch), out = [];
    lx.save(); lx.globalCompositeOperation = "destination-out";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const thr = hash(c, r, 3) * 0.72 + (c / cols) * 0.18 + (1 - r / rows) * 0.1;
      if (A * 1.15 - 0.08 <= thr) continue;
      const x = c * cw, y = r * ch; lx.fillStyle = "#000"; lx.fillRect(x, y, cw + 0.5, ch + 0.5);
      const u = (x + cw / 2 - ox) / (P.w * s), v = (y + ch / 2 - oy) / (P.h * s); if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const gx = Math.min(G.cols - 1, (u * G.cols) | 0), gy = Math.min(G.rows - 1, (v * G.rows) | 0), gi = gy * G.cols + gx;
      const al = G.A[gi]; if (al < 90) continue; const L = G.L[gi] / 255, lv = Math.min(9, Math.floor(Math.pow(L, 0.9) * 10)); if (lv < 1) continue;
      out.push(x + cw / 2, y + ch / 2, lv, L, hash(c, r, 7) < 0.05 ? 1 : 0);
    }
    lx.restore(); this.cw = cw; this.chh = ch; return out;
  }
  drawGlyphs(cx, out) {
    cx.save(); cx.font = "700 " + (this.cw * 1.55).toFixed(1) + 'px "Space Mono", monospace'; cx.textAlign = "center"; cx.textBaseline = "middle";
    for (let i = 0; i < out.length; i += 5) { const lv = out[i + 2], L = out[i + 3]; cx.fillStyle = out[i + 4] ? "rgba(255,26,26," + (0.5 + L * 0.5).toFixed(2) + ")" : "rgba(255,255,255," + (0.22 + L * 0.78).toFixed(2) + ")"; cx.fillText(RAMP[lv], out[i], out[i + 1]); }
    cx.restore();
  }
};

/* the frame loop starts now; the world is built and started by main.js */
NK.sync(true); NK.applyQuality();
requestAnimationFrame(tick);
})();
