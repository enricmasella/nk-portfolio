/* The world: every panel is an item hung in the sky at its own depth, plus the ASCII type engine.
   Sentences come from translations.js (data-i18n); names, numbers and links come from NK.DATA. */
(() => {
"use strict";
const NK = window.NK, D = NK.DATA, I = NK.I, $ = NK.$, $$ = NK.$$, esc = NK.esc, T = I.t;
const { clamp, hash, FLAT, reduced, RAMP } = NK;
const B = (NK.B = { ATs: [], world: $("#world"), items: [] });
const has = (k) => k in I.dict.en;
const up = (k) => T(k).toUpperCase();

/* depth of every stop on the flight (the camera travels along z).
   The two big words (WORK, SKILLS) sit far in front of what follows them, so each title is seen on its own before its content appears. */
{
  const work = -3800, card0 = work - 1400, ring = -(card0 - 3000) + 900, skillsWord = -(ring + 1300), scap = skillsWord - 1300;
  B.Z = { about: -1400, me: -2500, work, card0, ring, skillsWord, scap, const: scap - 250, contact: scap - 250 - 950 };
}

/* ───────── project explanations (shared by the ring panel, and by the “how it is made” fold on the flat page) ───────── */
const num = (v) => (typeof v === "number" ? ' data-fmt="' + v + '"' : v && v.k ? ' data-i18n="' + v.k + '"' : "");
const stat = ([v, k]) => "<div><dt" + num(v) + ">" + esc(NK.val(v)) + '</dt><dd data-i18n="' + k + '"></dd></div>';
const strip = (p) => {
  let s = "";
  for (let n = 1; n <= p.strip; n++) { const b = "proj." + p.id + ".s" + n + "."; s += "<li>" + (has(b + "top") ? '<small data-i18n="' + b + 'top"></small>' : "") + '<b data-i18n="' + b + 'name"></b>' + (has(b + "bottom") ? '<small data-i18n="' + b + 'bottom"></small>' : "") + "</li>"; }
  return s;
};
B.detailBody = (p, withSum) =>
  (withSum ? '<p class="rdet__p" data-sum data-i18n="proj.' + p.id + '.summary"></p>' : "") +
  '<dl class="rstats">' + p.stats.map(stat).join("") + "</dl>" +
  '<div><p class="tag rstrip__t" data-i18n="proj.' + p.id + '.strip"></p><ul class="rstrip">' + strip(p) + "</ul></div>" +
  '<ul class="rdet__chips">' + p.stack.map((s) => '<li class="chip">' + esc(s) + "</li>").join("") + "</ul>" +
  (p.link ? '<p class="rdet__link"><a class="btn" href="' + p.link[0] + '" target="_blank" rel="noopener"><i class="dot live"></i><span data-i18n="paddock.cta"></span></a><small>' + p.link[1] + ' &middot; <span data-i18n="paddock.credit"></span></small></p>'
    : '<p class="rdet__link"><small data-i18n="access.private"></small></p>');
const live = (p) => (p.live ? '<i class="dot live"></i><span data-i18n="hero.p1.live"></span>' : '<i class="dot dim"></i><span data-i18n="hero.p1.dev"></span>');
B.live = live;

/* ───────── the items ───────── */
/* positions are “x,y,anchor,rotateY”: x and y in fractions of the screen width and height (the flight reads data-pw on wide screens, data-pt on tall ones) */
const parts = [];
const add = (cls, inner, z, pw, pt, extra = "") => parts.push('<div class="it ' + cls + '" data-z="' + z + '" data-pw="' + pw + '" data-pt="' + (pt || pw) + '" ' + extra + ">" + inner + "</div>");
const AT_LINES = { nameL: [["", 0, "ENRIC"]], nameR: [["", 1, "MASELLA"]], about: [["timeline.head1", 0], ["timeline.head2", 1]], me: [["about.me.head1", 0], ["about.me.head2", 1]], work: [["nav.work", 1]], skills: [["nav.skills", 1]] };
/* the ASCII type of an item; the real text sits underneath it (visible only on the flat page) */
const asc = (key, cls, z, pw, pt, extra = "") => add(cls + " asc", AT_LINES[key].map(([k, g, lit]) => '<span class="lt' + (g ? " g" : "") + '" aria-hidden="true"' + (k ? ' data-i18n="' + k + '"' : "") + ">" + (lit || "") + "</span>").join(""), z, pw, pt, 'data-at="' + key + '" aria-hidden="true" ' + extra);
const glass = (inner, z, pw, pt, cls = "", extra = "") => add("glass tg bk " + cls, inner, z, pw, pt, extra);

B.build = () => {
  parts.length = 0;
  parts.push('<h1 class="sr">' + esc(D.name) + "</h1>");
  /* hero */
  asc("nameL", "it--nameL", -260, "-0.205,0.15,-1,0", "0,0,0,0", 'data-zt="0" data-ps="-0.225,0.17,-1,0"');
  asc("nameR", "it--nameR", -260, "0.205,-0.18,0,0", "0,0,-1,0", 'data-zt="0" data-ps="0.22,-0.18,0,0"');
  add("it--frame", NK.frameHTML(), 0, "0,-0.085,-0.5,0", "0,0,-0.5,0", 'data-ps="0,0.01,-0.5,0"');
  add("it--rows", '<p class="tag"><i class="dot live"></i><span data-dc data-i18n="world.portfolio"></span><span data-dc data-i18n="common.location"></span></p><ul class="rows"><li><span class="gt">&gt;</span> <span data-dc data-i18n="hero.rowRole"></span></li><li><span class="gt">&gt;</span> <span data-dc data-i18n="hero.rowAi"></span></li><li><span class="gt">&gt;</span> <span data-dc data-i18n="hero.rowSlop"></span></li></ul><a class="btn" href="mailto:' + D.email + '"><i class="dot live"></i><span data-i18n="hero.mail"></span></a>', 60, "0,0.3,-0.5,0", "0,0,-0.5,0", 'data-zt="0" data-ps="0.3,0.19,-0.5,0"');
  /* about */
  parts.push('<h2 class="sr"><span data-i18n="timeline.head1"></span> <span data-i18n="timeline.head2"></span></h2>');
  asc("about", "it--about", -1400, "0,-0.06,-0.5,0", "0,-0.3,-0.5,0", 'data-zt="-1400" data-zs="-1400" data-ps="0,-0.17,-0.5,0"');
  glass('<p class="tag" data-i18n="timeline.r1.label"></p><p class="big2">daw <span class="mut" data-i18n="timeline.art.now"></span></p><p class="big2 mut">&rarr; dam</p><p class="small" data-i18n="timeline.art.planned"></p>', -1300, "-0.31,0.27,-0.5,0", "-0.07,-0.07,-0.5,0", "it--tg1", 'data-zt="-1400" data-zs="-1400" data-ps="-0.3,0.19,-0.5,0"');
  glass('<p class="tag" data-i18n="timeline.r7.label"></p><p class="big2" data-i18n="about.internship"></p><p class="small"><i class="dot live"></i>&nbsp; <span data-i18n="hero.mail"></span></p>', -1560, "0.1,0.31,-0.5,0", "0.08,0.1,-0.5,0", "it--tg2", 'data-zt="-1400" data-zs="-1400" data-ps="0.3,0.19,-0.5,0"');
  glass('<p class="tag" data-i18n="timeline.r3.label"></p><p class="big2">es &middot; ca &middot; en</p><p class="small"><span data-i18n="hero.lv.native"></span> &middot; <span data-i18n="hero.lv.native"></span> &middot; <span data-i18n="hero.lv.c1"></span></p><p class="small" data-i18n="about.langs.more"></p>', -1200, "0.25,-0.27,-0.5,0", "-0.03,0.27,-0.5,0", "it--tg3", 'data-zt="-1400" data-zs="-1400" data-ps="0,0.19,-0.5,0"');
  /* about, second stop: a bit more about me */
  parts.push('<h2 class="sr"><span data-i18n="about.me.head1"></span> <span data-i18n="about.me.head2"></span></h2>');
  const ME = 'data-fi="720" data-fo="60" data-zt="' + B.Z.me + '" data-zs="' + B.Z.me + '"';
  asc("me", "it--me", B.Z.me, "0,-0.1,-0.5,0", "0,-0.2,-0.5,0", ME + ' data-ps="0,-0.215,-0.5,0"');
  glass('<p class="tag"><i class="dot live"></i><span data-i18n="about.me.label"></span></p><p class="small lead" data-dc data-i18n="about.me.lead"></p>', B.Z.me + 80, "-0.27,0.22,-0.5,0", "0,0.08,-0.5,0", "it--me1", ME + ' data-ps="-0.245,0.11,-0.5,0"');
  glass([1, 2, 3].map((n) => '<div class="mf"><p class="tag" data-i18n="about.me.f' + n + '.label"></p><p class="small" data-i18n="about.me.f' + n + '"></p></div>').join(""), B.Z.me - 80, "0.3,0.23,-0.5,0", "0,0.31,-0.5,0", "it--me2", ME + ' data-ps="0.245,0.11,-0.5,0"');
  /* work: the word, then the four cards flown through quickly */
  parts.push('<h2 class="sr" data-i18n="nav.work"></h2>');
  asc("work", "word", B.Z.work, "0,0,-0.5,0", "0,-0.04,-0.5,0");
  D.projects.forEach((p, i) => add("glass pj bk",
    '<header class="pj__head"><span class="tag">' + live(p) + '</span><span class="tag" data-i18n="proj.' + p.id + '.type"></span></header>' +
    '<h3 class="pj__name" data-dc="line">' + esc(p.name) + '</h3><div class="pj__row"><div><p class="pj__sum" data-dc data-i18n="proj.' + p.id + '.blurb"></p><ul class="pj__stack">' + p.stack.map((s) => '<li class="chip">' + esc(s) + "</li>").join("") + '</ul><dl class="pj__fig">' + p.fig.map(stat).join("") + '</dl></div><div class="pj__art"><canvas data-art="' + p.art + '" aria-hidden="true"></canvas><span class="ft ft--bl" aria-hidden="true" data-i18n="art.' + p.id + '"></span></div></div>' +
    '<details class="pj__more"><summary data-i18n="proj.how"></summary>' + B.detailBody(p, false) + "</details>",
    B.Z.card0 - i * 1000, (i % 2 ? 0.05 : -0.05) + ",0,-0.5," + (i % 2 ? -6 : 6), (i % 2 ? 0.02 : -0.02) + ",0,-0.5," + (i % 2 ? -3 : 3), i ? "" : 'data-fi="1100"'));
  /* skills: the word, then the constellation (drawn on the sky); this caption carries its legend */
  parts.push('<h2 class="sr" data-i18n="nav.skills"></h2>');
  asc("skills", "word", B.Z.skillsWord, "0,0,-0.5,0", "0,-0.04,-0.5,0");
  add("it--scap", '<div class="scap__top"><p class="tag"><i class="dot"></i><span data-i18n="nav.skills"></span></p><h3 class="big2" data-dc="line" data-i18n="skills.title"></h3></div>' +
    '<div class="scap__bot"><div class="skills__lg" data-lg role="group" data-i18n-attr="aria-label:nav.skills">' + D.skills.worked.map(([k, l], i) => '<button type="button" data-k="' + i + '"><i></i><span data-i18n="' + k + '"></span><em>' + l.length + "</em></button>").join("") + '<button type="button" data-k="' + D.skills.worked.length + '"><i></i><span data-i18n="skills.exploring"></span><em>' + D.skills.exploring.length + '</em></button></div><div class="skills__pick" data-pick data-i18n-attr="aria-label:nav.skills;data-hint:' + (NK.touch ? "skills.tapHint" : "skills.hoverHint") + '"></div>' +
    '<p class="skills__note"><span data-i18n="skills.note.near"></span><br><span data-i18n="skills.note.far"></span><br><span data-i18n="skills.exploringNote"></span></p></div>' +
    '<div class="skills__list">' + D.skills.worked.map(([k, it]) => '<div><h4 data-i18n="' + k + '"></h4><div>' + it.map((s) => '<span class="chip">' + esc(s) + "</span>").join("") + "</div></div>").join("") + '<div><h4><span data-i18n="skills.exploring"></span> &mdash; <span data-i18n="skills.exploringNote"></span></h4><div>' + D.skills.exploring.map((s) => '<span class="chip">' + esc(s) + "</span>").join("") + "</div></div></div>",
    B.Z.scap, "-0.33,0,-0.5,0", "0,0,-0.5,0", 'data-fi="1050" data-ps="-0.3,0,-0.5,0"');
  /* contact */
  add("it--contact", '<p class="tag"><i class="dot live"></i><span data-i18n="footer.head1"></span> / <span data-i18n="footer.head2"></span></p><h2 class="sr" data-i18n="footer.cta"></h2><div class="pxs" data-px aria-hidden="true"></div><p class="mail"><a class="mail__a" href="mailto:' + D.email + '">' + D.email + '</a><button type="button" class="btn" data-copy data-i18n="common.copy"></button></p><p class="links"><a class="btn" href="' + D.github + '" target="_blank" rel="noopener" data-i18n="footer.social.github"></a><a class="btn" href="' + D.instagram + '" target="_blank" rel="noopener" data-i18n="footer.social.inst"></a></p><p class="foot"><span data-i18n="footer.credit"></span><br><span data-i18n="footer.copy"></span></p>', B.Z.contact, "0,0,-0.5,0", "0,0,-0.5,0", 'data-fi="950"');
  B.world.innerHTML = parts.join("");
  I.applyDom(B.world);
};
/* numbers carry their value: they are formatted again when the language changes */
B.fmtNums = (scope = document) => $$("[data-fmt]", scope).forEach((el) => { el.textContent = I.fmtNum(+el.dataset.fmt); });

/* ───────── the ASCII type: a word is rasterised once into cells; each frame decides, cell by cell, what it shows ───────── */
/* look of every word: base + one set for wide screens and one for tall ones */
const S = {
  nameL: { base: { capVW: 0.082, capVH: 0.2, maxW: 0.36, cwDiv: 275, track: 0.05, alpha: 0.92 }, sh: { maxW: 0.29 }, t: { capVW: 0.15, capVH: 0.07, capMin: 40, capMax: 64, maxW: 0.9, cwMin: 3.4, cwDiv: 110 } },
  nameR: { base: { capVW: 0.082, capVH: 0.2, maxW: 0.38, cwDiv: 275, track: 0.05, alpha: 0.92 }, sh: { maxW: 0.3 }, t: { capVW: 0.15, capVH: 0.07, capMin: 40, capMax: 64, maxW: 0.92, cwMin: 3.4, cwDiv: 110 } },
  about: { base: { capVW: 0.09, capVH: 0.17, maxW: 0.74, cwDiv: 295, track: 0.045, alpha: 0.92 }, sh: { capVH: 0.14 }, t: { capVW: 0.115, capVH: 0.09, maxW: 0.92, cwMin: 3.6, cwDiv: 105 } },
  work: { base: { capVW: 0.34, capVH: 0.46, maxW: 1.0, cwDiv: 170, track: 0.03, alpha: 0.52, word: 1 }, t: { capVW: 0.5, capVH: 0.3, maxW: 0.94, cwMin: 5, cwDiv: 100, alpha: 0.58 } },
  skills: { base: { capVW: 0.32, capVH: 0.44, maxW: 1.0, cwDiv: 170, track: 0.03, alpha: 0.52, word: 1 }, t: { capVW: 0.46, capVH: 0.3, maxW: 0.94, cwMin: 5, cwDiv: 100, alpha: 0.58 } },
  me: { base: { capVW: 0.075, capVH: 0.15, maxW: 0.7, cwDiv: 295, track: 0.045, alpha: 0.92 }, sh: { capVH: 0.12 }, t: { capVW: 0.115, capVH: 0.09, maxW: 0.92, cwMin: 3.6, cwDiv: 105 } }
};
B.spec = (key) => {
  const s = S[key], o = Object.assign({}, s.base, NK.tall ? s.t : NK.short ? s.sh : null);
  o.lines = AT_LINES[key].map(([k, g, lit]) => [(k ? up(k) : lit), g]);
  return o;
};
const FONT = (s) => "700 " + s + 'px Oswald, "Arial Narrow", Impact, sans-serif';
B.AT_ = class {
  constructor(el, key) { this.el = el; this.key = key; this.cv = document.createElement("canvas"); this.cv.setAttribute("aria-hidden", "true"); el.appendChild(this.cv); this.x = this.cv.getContext("2d"); this.last = 0; this.pl = -1; this.dirty = true; this.hotUntil = 0; this.ph = hash(+el.dataset.z | 0, 7); this.layout(); }
  layout() {
    const s = (this.s = B.spec(this.key)), VW = NK.VW, VH = NK.VH, off = document.createElement("canvas"), ox = off.getContext("2d", { willReadFrequently: true });
    const tr = s.track || 0.04, wid = (t, z) => { let w = 0; for (const c of t) w += ox.measureText(c).width; return w + (t.length - 1) * tr * z; };
    ox.font = FONT(100); const cap100 = ox.measureText("H").actualBoundingBoxAscent || 78; let w100 = 0; for (const [t] of s.lines) w100 = Math.max(w100, wid(t, 100));
    const gap = 0.16, n = s.lines.length;
    let capTarget = Math.min(s.capVW * VW, s.capVH * VH); if (s.capMin) capTarget = clamp(capTarget, s.capMin, s.capMax);
    const fs = Math.min((capTarget / cap100) * 100, ((s.maxW * VW) / w100) * 100);
    const cap = (cap100 * fs) / 100, cw = clamp(VW / s.cwDiv, s.cwMin || 4.6, 12), ch = cw * 1.75, padX = cw * 1.5, padY = ch * 1.2;
    const bw = (w100 * fs) / 100 + 2 * padX, bh = n * cap + (n - 1) * gap * cap + 2 * padY, cols = Math.ceil(bw / cw), rows = Math.ceil(bh / ch), SX = 4, SY = 7, N = cols * rows;
    Object.assign(this, { cols, rows, cw, ch, W: cols * cw, H: rows * ch });
    const d = (this.dpr = NK.quality.dpr);
    this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d); this.cv.style.width = this.W + "px"; this.cv.style.height = this.H + "px";
    this.x.setTransform(d, 0, 0, d, 0, 0); this.x.font = "400 " + (ch * 0.86).toFixed(1) + 'px "Space Mono", ui-monospace, monospace'; this.x.textBaseline = "middle"; this.x.textAlign = "center";
    off.width = cols * SX; off.height = rows * SY; const k = SX / cw, cov = (this.cov = new Float32Array(N)), sty = (this.sty = new Uint8Array(N));
    s.lines.forEach(([t, ghost], li) => {
      ox.clearRect(0, 0, off.width, off.height); ox.fillStyle = "#fff"; ox.textBaseline = "alphabetic"; ox.font = FONT(fs * k);
      { let xx = padX * k; const yy = (padY + cap + li * cap * (1 + gap)) * k; for (const c of t) { ox.fillText(c, xx, yy); xx += ox.measureText(c).width + tr * fs * k; } }
      const px = ox.getImageData(0, 0, off.width, off.height).data;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        let sum = 0; for (let yy = 0; yy < SY; yy++) { let o = ((r * SY + yy) * off.width + c * SX) * 4 + 3; for (let xx = 0; xx < SX; xx++, o += 4) sum += px[o]; }
        const q = clamp((sum / (255 * SX * SY) - 0.1) / 0.75); if (q > 0.02) { cov[r * cols + c] = 0.2 + 0.8 * q; sty[r * cols + c] = ghost ? 1 : 0; }
      }
    });
    const edge = (this.edge = new Uint8Array(N)), halo = (this.halo = new Uint8Array(N)), list = [], at = (c, r) => (c < 0 || c >= cols || r < 0 || r >= rows ? 0 : cov[r * cols + c]);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c; if (cov[i] > 0 && (!at(c - 1, r) || !at(c + 1, r) || !at(c, r - 1) || !at(c, r + 1))) edge[i] = 1;
      let h = cov[i] > 0; for (let dy = -1; dy <= 1 && !h; dy++) for (let dx = -1; dx <= 1; dx++) if (at(c + dx, r + dy) > 0) { h = true; break; }
      if (h) { halo[i] = 1; list.push(i); }
    }
    this.list = Int32Array.from(list); this.heat = new Float32Array(N); this.dirty = true;
  }
  /* p 0..1: how formed the word is (0 = nothing, 1 = fully drawn); mc, mr: the pointer in cells, or null */
  tick(p, Tm, now, mc, mr) {
    const liveNow = mc !== null || this.hotUntil > now, gap = liveNow ? 45 : p > 0.004 && p < 0.996 ? 50 : 125;
    if (!this.dirty && now - this.last < gap && Math.abs(p - this.pl) < 0.012) return;
    this.last = now; this.pl = p; this.dirty = false; this.draw(p, Tm, mc, mr, now);
  }
  draw(p, Tm, mc, mr, now) {
    const { cols, rows, cov, sty, edge, list, heat, x, cw, ch, W, H } = this, ma = this.s.alpha, tk = reduced ? 0 : Math.floor(Tm * 6), sw0 = this.ph - Tm * 0.14;
    for (let j = 0; j < list.length; j++) heat[list[j]] *= 0.87;
    if (mc !== null) { this.hotUntil = now + 500; for (let dr = -4; dr <= 4; dr++) for (let dc = -8; dc <= 8; dc++) { const c = mc + dc, r = mr + dr; if (c < 0 || c >= cols || r < 0 || r >= rows || !this.halo[r * cols + c]) continue; const dd = Math.hypot(dc / 1.9, dr); if (dd < 4) { const v = (1 - dd / 4) * (0.6 + 0.4 * hash(c, r, tk)), i = r * cols + c; if (v > heat[i]) heat[i] = v; } } }
    x.clearRect(0, 0, W, H); let cur = "";
    for (let j = 0; j < list.length; j++) {
      const i = list[j], c = i % cols, r = (i / cols) | 0, k = p >= 1 ? 1 : p <= 0 ? 0 : NK.morph(p, c, r, cols, rows, 2); let d = 0, hot = 0;
      if (k === 2) { const hh = hash(c, r, tk + 13); d = hh > 0.3 ? 0.3 + 0.62 * hash(c, r, tk + 17) : 0; hot = hh > 0.86 ? 1 : 0; }
      else if (k === 1 && cov[i] > 0) {
        d = sty[i] ? (edge[i] ? 0.55 + 0.45 * cov[i] : hash(c, r, tk >> 1) > 0.45 ? 0.17 + 0.1 * hash(c, r, 5) : 0) : cov[i];
        if (d > 0.3) { d *= 0.9 + 0.1 * hash(c, r, tk); let sw = (c / cols) * 0.8 + (r / rows) * 0.45 + sw0; sw -= Math.floor(sw); if (sw < 0.016 || hash(c, r, 41) > 0.993) hot = 1; }
      }
      const hv = heat[i]; if (hv > 0.05) { if (hv * 0.9 > d) d = hv * 0.9; if (hv > 0.35) hot = 1; }
      if (d <= 0.04) continue; const lv = Math.min(9, (d * 10) | 0); if (lv < 1) continue;
      const a = Math.min(ma, 0.05 + d * ma), col = hot ? "255,26,26" : "255,255,255", key = col + "|" + ((a * 24) | 0);
      if (key !== cur) { cur = key; x.fillStyle = "rgba(" + col + "," + (((a * 24) | 0) / 24).toFixed(3) + ")"; }
      x.fillText(RAMP[lv], c * cw + cw * 0.5, r * ch + ch * 0.5);
    }
  }
};
/* every word is measured again when the size, the mode, the quality or the language changes */
let tR = 0;
B.relayout = (delay = 140) => { clearTimeout(tR); tR = setTimeout(() => B.ATs.forEach((a) => a.layout()), delay); };
})();
