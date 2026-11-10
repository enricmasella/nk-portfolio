// js/main.js
// Punto de entrada del portfolio: interacción, scroll suave Lenis, dock HUD y montaje de secciones

import Lenis from "lenis";
import {
  LANGS,
  LANG_NAMES,
  NAV,
  dict,
  lang,
  registerStrings,
  t,
  getLang,
  detect,
  applyDom,
  applyMeta,
  setLang,
  onLang,
  initI18n,
  strings,
  stringsHero,
  stringsDock,
  stringsSeason,
  stringsTimeline,
  stringsPaddock,
  stringsFooter
} from "./translations.js";
import { HeroScene, getSceneTier, isEnergySaver, PLATE, DEFAULT_PARAMS, fitSubjectToBox } from "./scene.js";

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// Rutas de assets
const footer_figure_default = "./assets/footer-figure.webp";
const hero_photo_default = "./assets/hero-photo.webp";
const hero_xray_default = "./assets/hero-xray.webp";
const hero_edge_default = "./assets/hero-edge.webp";
const hero_arc_default = "./assets/hero-arc.webp";

var clamp01 = (x) => Math.min(1, Math.max(0, x));
var reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var easeOutQuad = (x) => 1 - (1 - x) * (1 - x);
var easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
var easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
function onResize(cb) {
  let raf = 0;
  const run = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => cb());
  };
  window.addEventListener("resize", run, { passive: true });
  window.addEventListener("orientationchange", run, { passive: true });
  return () => {
    window.removeEventListener("resize", run);
    window.removeEventListener("orientationchange", run);
    cancelAnimationFrame(raf);
  };
}
var subs = /* @__PURE__ */ new Set();
var rafId = 0;
function frame(time) {
  rafId = requestAnimationFrame(frame);
  for (const s of Array.from(subs)) {
    if (!subs.has(s)) continue;
    if (time - s.last > s.fr()) {
      s.last = time;
      s.cb(time);
    }
  }
}
function subscribe(cb, getFramerate = () => 0) {
  const s = { cb, fr: getFramerate, last: 0 };
  subs.add(s);
  if (subs.size === 1) rafId = requestAnimationFrame(frame);
  return () => {
    subs.delete(s);
    if (!subs.size) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}
var lenis = null;
function startLenis() {
  if (lenis || reduced()) return lenis;
  lenis = new Lenis({ smoothWheel: true });
  subscribe((time) => lenis.raf(time), () => 0);
  return lenis;
}
function scrollToTarget(target, opts = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.4, easing: (x) => 1 - Math.pow(1 - x, 4), ...opts });
  else el.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" });
}
var CFG = {
  REVEAL: { tension: 90, friction: 26 },
  ROW: { tension: 170, friction: 24 },
  ITEM: { tension: 170, friction: 24 },
  SHEET: { tension: 190, friction: 26 },
  FIGURE: { tension: 200, friction: 24 },
  TYPE: { tension: 210, friction: 24 },
  YEAR: { tension: 190, friction: 24 },
  COPY: { tension: 110, friction: 26 },
  COPY2: { tension: 150, friction: 24 },
  NAME: { tension: 190, friction: 24 },
  YEAR_SETTLE: { tension: 32, friction: 26 },
  TRIGGER: { tension: 140, friction: 30 },
  IMMEDIATE: { duration: 1 }
};
var Motion = class {
  constructor(initial, apply2) {
    this.apply = apply2;
    this.ch = {};
    this.unsub = null;
    this.last = 0;
    for (const k in initial) this.ch[k] = { v: initial[k], vel: 0, to: initial[k], cfg: CFG.REVEAL, at: 0, from: initial[k], prec: 1e-3, active: false };
  }
  get(k) {
    return this.ch[k].v;
  }
  values() {
    const o = {};
    for (const k in this.ch) o[k] = this.ch[k].v;
    return o;
  }
  get resting() {
    for (const k in this.ch) if (this.ch[k].active) return false;
    return true;
  }
  /** Jump to values with no animation. */
  set(values) {
    for (const k in values) {
      const c = this.ch[k];
      c.v = c.to = values[k];
      c.vel = 0;
      c.active = false;
    }
    this.apply(this.values());
  }
  /** Animate the given channels toward targets. `delay` is the wait before the spring starts (ms). */
  to(targets, cfg = CFG.REVEAL, delay = 0) {
    const now = performance.now();
    for (const k in targets) {
      const c = this.ch[k];
      c.to = targets[k];
      c.cfg = cfg;
      c.at = now + delay;
      c.from = c.v;
      c.active = true;
      c.prec = Math.max(1e-4, Math.min(0.05, Math.abs(c.to - c.v) * 1e-3 || 5e-4));
    }
    if (!this.unsub) {
      this.last = now;
      this.unsub = subscribe(this.step, () => 0);
    }
  }
  step = () => {
    const now = performance.now();
    const dt = Math.min(64, now - this.last);
    this.last = now;
    let moving = false;
    for (const k in this.ch) {
      const c = this.ch[k];
      if (!c.active) continue;
      if (now < c.at) {
        moving = true;
        continue;
      }
      if (c.cfg.duration != null) {
        const u = clamp01((now - c.at) / Math.max(1, c.cfg.duration));
        if (u >= 1) {
          c.v = c.to;
          c.active = false;
        } else {
          c.v = c.from + (c.to - c.from) * (c.cfg.easing || easeOutCubic)(u);
          moving = true;
        }
        continue;
      }
      const { tension, friction, mass = 1 } = c.cfg;
      const n = Math.max(1, Math.round(dt));
      for (let i = 0; i < n; i++) {
        const force = -tension * 1e-6 * (c.v - c.to) - friction * 1e-3 * c.vel;
        c.vel += force / mass;
        c.v += c.vel;
      }
      if (Math.abs(c.vel) < c.prec * 0.1 && Math.abs(c.to - c.v) <= c.prec) {
        c.v = c.to;
        c.vel = 0;
        c.active = false;
      } else moving = true;
    }
    this.apply(this.values());
    if (!moving && this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  };
  destroy() {
    if (this.unsub) this.unsub();
    this.unsub = null;
  }
};
var UNIT_RE = /^(-?\d*\.?\d+)([a-z%]*)$/i;
var parseVal = (x) => {
  if (typeof x === "number") return { n: x, u: "" };
  const m = UNIT_RE.exec(String(x).trim());
  return m ? { n: parseFloat(m[1]), u: m[2] } : { n: 0, u: "" };
};
var IDENTITY = { opacity: 1, x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0 };
function applyChannels(el, v, units) {
  if ("opacity" in v) el.style.opacity = v.opacity >= 0.999 ? "" : String(Math.max(0, v.opacity));
  const parts = [];
  const x = v.x || 0, y = v.y || 0;
  if (x || y) parts.push(`translate(${x}${units.x || "px"}, ${y}${units.y || "px"})`);
  if ("scale" in v && v.scale !== 1) parts.push(`scale(${v.scale})`);
  if ("scaleX" in v && v.scaleX !== 1) parts.push(`scaleX(${v.scaleX})`);
  if ("scaleY" in v && v.scaleY !== 1) parts.push(`scaleY(${v.scaleY})`);
  if (v.rotate) parts.push(`rotate(${v.rotate}deg)`);
  el.style.transform = parts.join(" ");
}
function animateEl(el, from, to, { config = CFG.REVEAL, delay = 0 } = {}) {
  const f = {}, tt = {}, units = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(from), ...Object.keys(to)])) {
    const a = parseVal(from[k] ?? IDENTITY[k]);
    const b = parseVal(to[k] ?? IDENTITY[k]);
    f[k] = a.n;
    tt[k] = b.n;
    units[k] = b.u || a.u;
  }
  const m = new Motion(f, (v) => applyChannels(el, v, units));
  applyChannels(el, f, units);
  return {
    motion: m,
    play(d = delay, cfg = config) {
      reduced() ? m.set(tt) : m.to(tt, cfg, d);
    },
    back(d = 0, cfg = config) {
      reduced() ? m.set(f) : m.to(f, cfg, d);
    },
    jump(end = true) {
      m.set(end ? tt : f);
    }
  };
}
function inView(el, { rootMargin = "0px", threshold = 0, once = false, onChange } = {}) {
  let io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      onChange?.(e.isIntersecting, e);
      if (once && e.isIntersecting) {
        io.disconnect();
        io = null;
        return;
      }
    }
  }, { rootMargin, threshold });
  io.observe(el);
  return { destroy() {
    io?.disconnect();
    io = null;
  } };
}
var scrolledPast = (el) => el.getBoundingClientRect().top <= 0;
function makeGate({ el, mode, onOn, onOff }) {
  let played = false;
  return (enabled) => {
    if (mode === "once" && played) return;
    if (enabled) {
      played = true;
      onOn();
      return;
    }
    if (mode === "forward" && scrolledPast(el)) return;
    if (played) {
      played = false;
      onOff();
    }
  };
}
function rise(el, { from = { opacity: 0, y: "0.75rem" }, to = { opacity: 1, y: "0rem" }, config = CFG.REVEAL, delay = 0, mode = "once", view = true, rootMargin = "0px" } = {}) {
  const a = animateEl(el, from, to, { config, delay });
  const gate = makeGate({ el, mode, onOn: () => a.play(delay, config), onOff: () => a.back(0, config) });
  let iv = null;
  if (view !== false) iv = inView(el, { rootMargin: typeof view === "string" ? view : rootMargin, onChange: gate });
  return { enable: gate, anim: a, destroy() {
    iv?.destroy();
    a.motion.destroy();
  } };
}
function revealText(el, opts = {}) {
  const o = {
    key: el.dataset.i18n || null,
    text: null,
    by: "words",
    stagger: 110,
    config: CFG.REVEAL,
    delay: 0,
    gap: 0.3,
    justify: "flex-start",
    mode: "once",
    view: true,
    rootMargin: "0px",
    ...opts
  };
  el.setAttribute("data-tr", "");
  let text = o.text ?? (o.key ? t(o.key) : el.textContent.trim());
  const dy = o.by === "letters" ? 0.3 : 0.35;
  let units = [];
  let motion = null;
  let shown = false;
  let enabledOnce = false;
  function build() {
    motion?.destroy();
    el.textContent = "";
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    wrap.className = "tr";
    wrap.style.cssText = `display:flex;flex-wrap:wrap;column-gap:${o.gap}em;justify-content:${o.justify};`;
    units = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const w = document.createElement("span");
      w.className = "tr-w";
      w.style.cssText = "display:inline-block;white-space:nowrap;";
      if (o.by === "letters") {
        for (const ch of Array.from(word)) {
          const u = document.createElement("span");
          u.className = "tr-u";
          u.style.cssText = "display:inline-block;";
          u.textContent = ch;
          w.appendChild(u);
          units.push(u);
        }
      } else {
        w.textContent = word;
        units.push(w);
      }
      wrap.appendChild(w);
    }
    el.append(sr, wrap);
    const init = {};
    units.forEach((_, i) => {
      init["o" + i] = shown ? 1 : 0;
      init["y" + i] = shown ? 0 : dy;
    });
    motion = new Motion(init, (v) => {
      for (let i = 0; i < units.length; i++) {
        const s = units[i].style, op = v["o" + i], y = v["y" + i];
        s.opacity = op >= 0.999 ? "" : String(Math.max(0, op));
        s.transform = Math.abs(y) < 5e-4 ? "" : `translateY(${y}em)`;
      }
    });
    motion.set(init);
  }
  function play() {
    shown = true;
    if (reduced()) {
      const v = {};
      units.forEach((_, i) => {
        v["o" + i] = 1;
        v["y" + i] = 0;
      });
      motion.set(v);
      return;
    }
    units.forEach((_, i) => motion.to({ ["o" + i]: 1, ["y" + i]: 0 }, o.config, o.delay + i * o.stagger));
  }
  function back() {
    const v = {};
    units.forEach((_, i) => {
      v["o" + i] = 0;
      v["y" + i] = dy;
    });
    shown = false;
    reduced() ? motion.set(v) : units.forEach((_, i) => motion.to({ ["o" + i]: 0, ["y" + i]: dy }, o.config, 0));
  }
  build();
  const gate = makeGate({ el, mode: o.mode, onOn: () => {
    enabledOnce = true;
    play();
  }, onOff: back });
  let iv = null;
  if (o.view !== false) iv = inView(el, { rootMargin: typeof o.view === "string" ? o.view : o.rootMargin, onChange: gate });
  const off = o.key ? onLang(() => ctrl.setText(t(o.key))) : null;
  const ctrl = {
    el,
    enable: gate,
    /** Swap the string (language change). Already-revealed text stays revealed — no replay. */
    setText(next) {
      if (next === text) return;
      text = next;
      build();
    },
    get text() {
      return text;
    },
    destroy() {
      iv?.destroy();
      off?.();
      motion?.destroy();
    }
  };
  return ctrl;
}
function scrollTrigger({ el, start = "top bottom", end = "top top", onUpdate, onToggle, config = CFG.TRIGGER, smoothing = true }) {
  const [sE, sV] = start.split(" ");
  const [eE, eV] = end.split(" ");
  let visible = false, grace = 0, progress = 0, toggled = false;
  const sm = new Motion({ p: 0 }, () => onUpdate?.(progress, sm.get("p")));
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) grace = 10;
  }, { rootMargin: "0px" });
  io.observe(el);
  const poses = (bb, vh) => ({
    top_top: bb.top,
    center_top: bb.top + bb.height / 2,
    bottom_top: bb.bottom,
    top_bottom: bb.top - vh,
    center_bottom: bb.top + bb.height / 2 - vh,
    bottom_bottom: bb.bottom - vh,
    top_center: bb.top - vh / 2,
    center_center: bb.top + bb.height / 2 - vh / 2,
    bottom_center: bb.bottom - vh / 2
  });
  function compute() {
    const bb = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const p = poses(bb, vh);
    const a = p[`${sE}_${sV}`], b = p[`${eE}_${eV}`];
    const length = Math.abs(a - b) || 1;
    const next = Math.min(Math.max(0, 1 - (a + length) / length), 1);
    if (next === progress && sm.resting) return;
    progress = next;
    if (smoothing && !reduced()) sm.to({ p: progress }, config, 0);
    else {
      sm.set({ p: progress });
    }
    if (onToggle) {
      const now = progress >= 1;
      if (now !== toggled) {
        toggled = now;
        onToggle(now);
      }
    }
  }
  const unsub = subscribe(() => {
    if (!visible) {
      if (grace <= 0) return;
      grace--;
    }
    compute();
  }, () => 10);
  compute();
  return {
    get progress() {
      return progress;
    },
    get smooth() {
      return sm.get("p");
    },
    refresh: compute,
    destroy() {
      unsub();
      io.disconnect();
      sm.destroy();
    }
  };
}
function loopInView(el, draw, getFramerate = () => 0) {
  let visible = false, grace = 0;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) grace = 10;
  });
  io.observe(el);
  const unsub = subscribe((time) => {
    if (document.hidden) return;
    if (!visible) {
      if (grace <= 0) return;
      grace--;
    }
    draw(time);
  }, getFramerate);
  return { destroy() {
    unsub();
    io.disconnect();
  }, get visible() {
    return visible;
  } };
}
var DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:" || /[?&]dev\b/.test(location.search);


// src/hero/markup.html
var markup_default = '<section class="hero" data-hero aria-labelledby="hero-title">\n  <div class="hero__scene" aria-hidden="true" data-i18n-attr="aria-label:hero.photoAlt">\n    <canvas class="hero__canvas" data-canvas></canvas>\n    <div class="hero__plate" data-hero-plate></div>\n    <img class="hero__fallback" data-fallback alt="" hidden width="1536" height="1024">\n  </div>\n  <div class="hero__ramp" aria-hidden="true"></div>\n\n  <div class="hero__col">\n    <header class="mast" data-mast>\n      <a class="mast__logo" href="#top" data-i18n-attr="aria-label:hero.logoLabel"><span aria-hidden="true">Enric Masella</span></a>\n      <div class="mast__right">\n        <div class="lang" role="group" data-i18n-attr="aria-label:a11y.language" data-lang-switch></div>\n        <a class="mast__github link-accent" data-github target="_blank" rel="noopener noreferrer"><span aria-hidden="true">[ </span><span data-i18n="nav.github">GitHub</span><span aria-hidden="true"> \u2192 ]</span></a>\n      </div>\n    </header>\n\n    <div class="hero__fitwrap" aria-hidden="true"><div class="hero__fit" data-hero-fit><i class="hero__ramp2"></i></div></div>\n\n    <div class="hero__main">\n      <div class="ident">\n        <p class="ident__id" data-id>developer_001<i class="ident__caret" data-caret aria-hidden="true"></i></p>\n        <h1 class="ident__name" id="hero-title" data-name></h1>\n        <ul class="ident__meta" data-meta>\n          <li data-meta-row>\n            <svg class="ico ico--loc" viewBox="0 0 18 12" aria-hidden="true" focusable="false"><path d="M9 11.5C9 11.5 3 7.2 3 4.4a6 6 0 0 1 12 0C15 7.2 9 11.5 9 11.5Z M9 6a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 9 6Z" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" transform="translate(0 0.2) scale(1 0.98)"/></svg>\n            <span data-i18n="common.location">Girona, Catalonia</span>\n          </li>\n          <li data-meta-row>\n            <svg class="ico ico--learn" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4M9.2 2.5 6.8 13.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg>\n            <span data-i18n="hero.rowLearning">DAW \xB7 Web development</span>\n          </li>\n          <li data-meta-row>\n            <svg class="ico ico--seek" viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M1 7h10M7.2 3.2 11 7l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg>\n            <span data-i18n="hero.rowSeeking">Looking for an internship</span>\n          </li>\n        </ul>\n      </div>\n\n      <div class="panels" data-hero-panels>\n        <div class="bracket panel" data-bracket>\n          <p class="eyebrow eyebrow--accent" data-i18n="hero.p1.eyebrow">featured project</p>\n          <div class="panel__row">\n            <dl class="panel__list">\n              <dt>Protecsol Karting Cup</dt>\n              <dd data-i18n="hero.p1.kind">karting championship</dd>\n              <dd><time datetime="2026" data-i18n="hero.p1.season">2026 season</time></dd>\n            </dl>\n            <svg class="panel__map" data-hero-map viewBox="0 0 78 50" role="img" data-i18n-attr="aria-label:hero.p1.mapAlt"><path data-map-path d="" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>\n          </div>\n        </div>\n        <div class="bracket panel" data-bracket>\n          <p class="eyebrow" data-i18n="hero.p2.eyebrow">languages</p>\n          <dl class="stats" data-hero-stats>\n            <div class="stats__cell"><dt><span aria-hidden="true" data-i18n="hero.lv.native">native</span><span class="sr-only" data-i18n="hero.lv.es">Spanish: native</span></dt><dd data-stat="es" aria-hidden="true"></dd></div>\n            <div class="stats__cell"><dt><span aria-hidden="true" data-i18n="hero.lv.native">native</span><span class="sr-only" data-i18n="hero.lv.ca">Catalan: native</span></dt><dd data-stat="ca" aria-hidden="true"></dd></div>\n            <div class="stats__cell"><dt><span aria-hidden="true" data-i18n="hero.lv.c1">C1</span><span class="sr-only" data-i18n="hero.lv.en">English: C1</span></dt><dd data-stat="en" aria-hidden="true"></dd></div>\n          </dl>\n        </div>\n      </div>\n    </div>\n\n    <div class="actions" data-actions>\n      <a class="live link-accent" data-mail>\n        <svg class="live__ico" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="15.5" fill="none" stroke="currentColor"/><path d="M11.5 20.5 20.5 11.5M13 11.5h7.5V19" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="square"/></svg>\n        <span class="live__text"><span class="live__label" data-i18n="hero.mail">get in touch</span><span class="live__host" data-mail-host></span></span>\n      </a>\n      <div class="actions__cta" data-cta></div>\n      <ul class="socials"><li><a class="link-accent" data-social="github" target="_blank" rel="noopener noreferrer">github</a></li><li><a class="link-accent" data-social="inst" target="_blank" rel="noopener noreferrer">inst</a></li></ul>\n    </div>\n  </div>\n</section>\n';

// src/generated/footer-figure.webp

var SITE = {
  name: "Enric Masella",
  email: "nkdevelopmentss@gmail.com",
  instagram: "enric.masella",
  instagramUrl: "https://www.instagram.com/enric.masella/",
  github: "https://github.com/enricmasella",
  githubHandle: "enricmasella",
  // LinkedIn intentionally absent (not supplied).
  location: "Girona, Catalonia",
  year: 2026,
  // Filled in when the portfolio gets its own domain; left empty so no wrong canonical ships.
  origin: ""
};
var HERO_SUBJECT = "photo";
var CV = {
  languages: [
    { code: "es", level: "native" },
    { code: "ca", level: "native" },
    { code: "en", level: "c1" },
    { code: "it", level: "upper" },
    // "alto-intermedio"
    { code: "fr", level: "mid" }
    // "intermedio"
  ],
  // the languages and markup he lists, then the tools, then what he picked up on projects
  core: ["HTML5", "CSS3", "JavaScript", "PHP", "C#", "SQL", "XML"],
  tools: ["Git", "GitHub", "Linux", "Bash"],
  alsoTools: ["DNS", "Active Directory", "Unit testing"],
  learned: ["React", "TypeScript", "Tailwind CSS", "Framer Motion"]
};
var PKC = {
  name: "Protecsol Karting Cup",
  url: "https://protecsolkartingcup.com",
  host: "protecsolkartingcup.com",
  season: 2026,
  // The site's own meta description says "8 grandes premios" (the first brief said 7). Change here only.
  gp: 8,
  classifications: ["General", "F\xE9minas", "Sub-18", "Veterano", "Peso Plus"],
  kart: "SODI SR4",
  engineCc: 270,
  format: "Sprint CUP",
  series: "SODI World Series",
  place: "Empuriabrava"
};
var ASSET_BASE_URL = "./assets/";
var PKC_SCREENS_SHIPPED = false;
var PKC_SCREENS = {
  home: "pkc/home.webp",
  calendar: "pkc/calendar.webp",
  rankings: "pkc/rankings.webp",
  mobile: "pkc/mobile.webp",
  collaborators: "pkc/collaborators.webp"
};

// src/generated/hero-xray.webp

// src/tokens.js
var cache = /* @__PURE__ */ new Map();
function token(name) {
  if (cache.has(name)) return cache.get(name);
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  cache.set(name, resolved);
  return resolved;
}

// src/ascii.js
var NOISE = "/\\|_-+*#<>[]{}=:;.%&$@0123456789";
var NBSP = "\xA0";
var hash = (n) => {
  let h = Math.imul(n ^ 2654435769, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
function scrubText(text, p, { tick = 0, lead = 5, hidden = true } = {}) {
  const n = text.length;
  const front = p * (n + lead);
  let out = "";
  for (let i = 0; i < n; i += 1) {
    const ch = text[i];
    if (ch === " ") out += " ";
    else if (i < front - lead) out += ch;
    else if (i < front || !hidden) out += NOISE[Math.floor(hash(i * 131 + tick * 17 + 3) * NOISE.length)];
    else out += NBSP;
  }
  return out;
}
function scrambleText(el, { text = el.textContent, duration = 520, delay = 0, hidden = false } = {}) {
  if (reduced()) {
    el.textContent = text;
    return () => {
    };
  }
  let raf = 0, t0 = 0, last = -1, alive = true;
  const step = (now) => {
    if (!alive) return;
    if (!t0) t0 = now + delay;
    const k = (now - t0) / duration;
    if (k >= 1) {
      el.textContent = text;
      return;
    }
    if (k >= 0) {
      const tick = Math.floor(now / 55);
      if (tick !== last) {
        last = tick;
        el.textContent = scrubText(text, k, { tick, hidden });
      }
    }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    el.textContent = text;
  };
}
function blink(el, ms = 530) {
  if (reduced()) return () => {
  };
  let on = true;
  const id = setInterval(() => {
    on = !on;
    el.style.opacity = on ? "1" : "0";
  }, ms);
  return () => {
    clearInterval(id);
    el.style.opacity = "1";
  };
}
var RAMP = " .:+#";
var FONT_ADVANCE = 0.612;
function mountGlyphs(host, { color = "--glyph", size = 13, line = 16, seed = 1, speed = 1, floor = 0.4, ceil = 0.88 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "glyphs";
  canvas.setAttribute("aria-hidden", "true");
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, ratio = 1, cols = 0, rows = 0, t2 = seed * 17, fontReady = false, drawn = false;
  const still = reduced();
  const field2 = (x, y, time) => {
    let f = Math.sin(x * 1 + time * 0.6) * 0.5;
    f += Math.sin(y * 0.85 - time * 0.45) * 0.45;
    f += Math.sin((x + y) * 0.65 + time * 0.35) * 0.35;
    f += Math.sin((x - y) * 0.95 - time * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  };
  function draw() {
    if (!w || !h) return;
    drawn = true;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = `400 ${size}px "Space Mono", ui-monospace, monospace`;
    ctx.fillStyle = token(color);
    ctx.textBaseline = "alphabetic";
    for (let r = 0; r < rows; r += 1) {
      let s = "";
      for (let c = 0; c < cols; c += 1) {
        const f = field2(c / cols * 11, r / rows * 7, t2);
        const jitter = hash(c * 7919 + r * 104729 + seed * 31);
        const dens = Math.min(1, Math.max(0, (f - floor) / (ceil - floor))) + (jitter - 0.5) * 0.24;
        s += RAMP[Math.min(4, Math.max(0, Math.floor(dens * 5)))];
      }
      if (s.trim()) ctx.fillText(s, 0, (r + 1) * line - 4);
    }
  }
  function measure() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    w = host.clientWidth;
    h = host.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    cols = Math.ceil(w / (size * FONT_ADVANCE));
    rows = Math.ceil(h / line);
    if (fontReady) draw();
  }
  const ro = new ResizeObserver(measure);
  ro.observe(host);
  measure();
  const loadFont = document.fonts?.load ? document.fonts.load(`400 ${size}px "Space Mono"`) : Promise.resolve();
  loadFont.catch(() => {
  }).then(() => {
    fontReady = true;
    draw();
  });
  const loop = still ? null : loopInView(host, (time) => {
    t2 = seed * 17 + time / 1e3 * 0.5 * speed;
    if (fontReady) draw();
  }, () => 150);
  return { canvas, redraw: draw, destroy() {
    loop?.destroy();
    ro.disconnect();
    canvas.remove();
  } };
}

// src/ui.js
function ctaHTML({ href, labelKey, label, ext = false, cls = "" }) {
  const path = "M220 42L212.932 50H0V0H220V42Z";
  const text = labelKey ? `data-i18n="${labelKey}"` : "";
  const rel = ext ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a class="cta ${cls}" href="${href}"${rel}>
    <svg class="cta__frame" viewBox="0 0 220 50" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="${path}" fill="#0E0F14"/>
      <path class="cta__flood" d="${path}" fill="var(--accent)"/>
      <path d="${path}" fill="none" stroke="var(--accent)" stroke-opacity="0.25"/>
      <path d="M205 49.5H213L219.5 42V36M212 0.5H219.5V7M8 0.5H0.5V7M7.5 49.5H0.5V42.5" fill="none" stroke="var(--accent)"/>
    </svg>
    <span class="cta__label" ${text}>${label ?? (labelKey ? t(labelKey) : "")}</span>
    <svg class="cta__arrow" viewBox="0 0 13.7071 10.7071" aria-hidden="true" focusable="false"><path d="M0 5.35355H13M8 10.3536L13 5.35355L8 0.353553" fill="none"/></svg>
  </a>`;
}
var bracketCorners = () => ["tr", "tl", "bl", "br"].map((c) => `<svg class="bk bk--${c}" viewBox="0 0 10.5 10.5" aria-hidden="true" focusable="false"><path d="M0 0.5H10V10.5"/></svg>`).join("");
var esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// src/tracks/pkc-track.js
var MAP_VIEW = { width: 2560, height: 1440, band: 11.67 };
var ART_BOX = { top: 2, width: 1438.43, height: 796 };
var ART_SCALE_X = MAP_VIEW.width / ART_BOX.width;
var ART_SCALE_Y = (MAP_VIEW.height - MAP_VIEW.band * 2) / ART_BOX.height;
var artboardToMap = (x, y) => [x * ART_SCALE_X, MAP_VIEW.band + (y - ART_BOX.top) * ART_SCALE_Y];
var CIRCUIT_STEP = 3;
var LAYOUT = [
  // start/finish straight runs right → left along the foot, then the hairpin
  { x: 300, y: 566, r: 21, mark: true },
  // 1 — the hairpin
  // the long diagonal climbs to the first sweeper
  { x: 560, y: 345, r: 0 },
  { x: 705, y: 205, r: 52 },
  // gentle left-right dogleg on the climb
  { x: 835, y: 150, r: 0 },
  { x: 985, y: 82, r: 78, mark: true },
  // 2 — the top sweeper
  { x: 1090, y: 250, r: 54 },
  { x: 1e3, y: 332, r: 30, mark: true },
  // 3 — the chicane, left…
  { x: 1090, y: 392, r: 30 },
  //     … then right
  { x: 1070, y: 590, r: 56, mark: true },
  // 4 — the foot corner
  { x: 800, y: 612, r: 0 }
];
var FLAG_AT = 150;
var hyp = Math.hypot;
function roundedPolygon(vertices) {
  const n = vertices.length;
  const radius = vertices.map((v) => v.r || 0);
  const geo = vertices.map((v, i) => {
    const p = vertices[(i + n - 1) % n], q = vertices[(i + 1) % n];
    const ax = p.x - v.x, ay = p.y - v.y, bx = q.x - v.x, by = q.y - v.y;
    const la = hyp(ax, ay), lb = hyp(bx, by);
    const ux = ax / la, uy = ay / la, vx = bx / lb, vy = by / lb;
    const theta = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy)));
    return { ux, uy, vx, vy, theta, la, lb };
  });
  const tangent = (i) => radius[i] > 0 ? radius[i] / Math.tan(geo[i].theta / 2) : 0;
  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const len = geo[j].la;
      const need = tangent(i) + tangent(j);
      if (need > len * 0.98) {
        const k = len * 0.98 / need;
        radius[i] *= k;
        radius[j] *= k;
      }
    }
  }
  const points = [], apexes = [];
  vertices.forEach((v, i) => {
    const g = geo[i], r = radius[i];
    if (r <= 0) {
      points.push([v.x, v.y]);
      apexes.push({ at: points.length - 1, mark: !!v.mark });
      return;
    }
    const t2 = r / Math.tan(g.theta / 2);
    const t1 = [v.x + g.ux * t2, v.y + g.uy * t2];
    const t22 = [v.x + g.vx * t2, v.y + g.vy * t2];
    let bx = g.ux + g.vx, by = g.uy + g.vy;
    const bl = hyp(bx, by);
    bx /= bl;
    by /= bl;
    const centre = [v.x + bx * (r / Math.sin(g.theta / 2)), v.y + by * (r / Math.sin(g.theta / 2))];
    const a0 = Math.atan2(t1[1] - centre[1], t1[0] - centre[0]);
    let da = Math.atan2(t22[1] - centre[1], t22[0] - centre[0]) - a0;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const steps = Math.max(4, Math.ceil(Math.abs(da) * r / 1.5));
    const first = points.length;
    for (let k = 0; k <= steps; k += 1) {
      const a = a0 + da * k / steps;
      points.push([centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r]);
    }
    apexes.push({ at: first + Math.round(steps / 2), mark: !!v.mark });
  });
  return { points, apexes };
}
function resampleClosed(points, step, from = 0) {
  const n = points.length;
  const cum = [0];
  for (let i = 1; i <= n; i += 1) {
    const a = points[i - 1], b = points[i % n];
    cum.push(cum[i - 1] + hyp(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[n];
  const count = Math.round(total / step);
  const even = total / count;
  const at = (s) => {
    s = (s % total + total) % total;
    let lo = 0, hi = n;
    while (lo < hi - 1) {
      const mid = lo + hi >> 1;
      if (cum[mid] <= s) lo = mid;
      else hi = mid;
    }
    const a = points[lo], b = points[(lo + 1) % n];
    const k = (s - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const out = [];
  for (let i = 0; i < count; i += 1) out.push(at(from + i * even));
  out.push(out[0]);
  return { out, cum, total, even, count, at };
}
function simplify(points, tolerance) {
  const last = points.length - 1;
  if (last > 2 && hyp(points[0][0] - points[last][0], points[0][1] - points[last][1]) < 1e-6) {
    let m = 1, far = 0;
    for (let i = 1; i < last; i += 1) {
      const d = hyp(points[i][0] - points[0][0], points[i][1] - points[0][1]);
      if (d > far) {
        far = d;
        m = i;
      }
    }
    return simplifyOpen(points.slice(0, m + 1), tolerance).concat(simplifyOpen(points.slice(m), tolerance).slice(1));
  }
  return simplifyOpen(points, tolerance);
}
function simplifyOpen(points, tolerance) {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    const [ax, ay] = points[lo], [bx, by] = points[hi];
    const dx = bx - ax, dy = by - ay, len = hyp(dx, dy) || 1;
    let worst = 0, at = -1;
    for (let i = lo + 1; i < hi; i += 1) {
      const d = Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance && at > 0) {
      keep[at] = 1;
      stack.push([lo, at], [at, hi]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
var round1 = (v) => (Math.round(v * 10) / 10).toString();
var f2 = (v) => (Math.round(v * 100) / 100).toString();
var polyD = (pts, fmt = f2) => pts.map((p, i) => `${i ? "L" : "M"}${fmt(p[0])} ${fmt(p[1])}`).join("");
var ROUNDED = roundedPolygon(LAYOUT);
var DENSE = resampleClosed(ROUNDED.points, 0.5);
var flagStart = (() => {
  const n = DENSE.out.length - 1;
  const hairpin = ROUNDED.apexes[0].at;
  const ref = ROUNDED.points[hairpin];
  let best = 0, bestD = Infinity;
  for (let i = 0; i < n; i += 1) {
    const d = hyp(DENSE.out[i][0] - ref[0], DENSE.out[i][1] - ref[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return (best * DENSE.even - FLAG_AT + DENSE.total) % DENSE.total;
})();
var WALK = resampleClosed(ROUNDED.points, CIRCUIT_STEP, flagStart);
var CIRCUIT_PATH = WALK.out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
var CUMULATIVE = CIRCUIT_PATH.reduce((acc, p, i) => {
  if (i === 0) return [0];
  const q = CIRCUIT_PATH[i - 1];
  acc.push(acc[i - 1] + hyp(p[0] - q[0], p[1] - q[1]));
  return acc;
}, []);
var CIRCUIT_LENGTH = Math.round(CUMULATIVE[CUMULATIVE.length - 1] * 10) / 10;
var nearestIndex = (p) => {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < CIRCUIT_PATH.length - 1; i += 1) {
    const d = hyp(CIRCUIT_PATH[i][0] - p[0], CIRCUIT_PATH[i][1] - p[1]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
};
var headingAt = (i) => {
  const a = CIRCUIT_PATH[Math.max(0, i - 2)], b = CIRCUIT_PATH[Math.min(CIRCUIT_PATH.length - 1, i + 2)];
  return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
};
var MARKER_INDEX = ROUNDED.apexes.filter((a) => a.mark).map((a) => nearestIndex(ROUNDED.points[a.at])).sort((a, b) => a - b);
var CIRCUIT_MARKERS = MARKER_INDEX.map((i) => ({ x: CIRCUIT_PATH[i][0], y: CIRCUIT_PATH[i][1], d: Math.round(CUMULATIVE[i] * 10) / 10 }));
var TRACK_BOX = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of CIRCUIT_PATH) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const pad3 = 46;
  return { x: minX - pad3, y: minY - pad3, width: maxX - minX + pad3 * 2, height: maxY - minY + pad3 * 2, pad: pad3 };
})();
var MAP_PATH = CIRCUIT_PATH.map(([x, y]) => artboardToMap(x, y));
var LAP_CENTRELINE = polyD(simplify(MAP_PATH, 0.35), f2);
var LAP_LENGTH = (() => {
  const pts = simplify(MAP_PATH, 0.35).map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
  let sum = 0;
  for (let i = 1; i < pts.length; i += 1) sum += hyp(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return Math.round(sum * 100) / 100;
})();
var TRACK_RIBBON = (() => {
  const n = MAP_PATH.length - 1;
  const turn = new Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const a2 = MAP_PATH[(i + n - 1) % n], b2 = MAP_PATH[i], c = MAP_PATH[(i + 1) % n];
    const ux = b2[0] - a2[0], uy = b2[1] - a2[1], vx = c[0] - b2[0], vy = c[1] - b2[1];
    turn[i] = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / ((hyp(ux, uy) || 1) * (hyp(vx, vy) || 1)))));
  }
  const window2 = 14;
  const half = turn.map((_, i) => {
    let sum = 0;
    for (let j = -window2; j <= window2; j += 1) sum += turn[(i + j + n) % n];
    const k = Math.min(1, sum / (window2 * 2 + 1) / 0.1);
    return 5.1 + 3.4 * k * k * (3 - 2 * k);
  });
  const left = [], right = [];
  for (let i = 0; i < n; i += 1) {
    const a2 = MAP_PATH[(i + n - 1) % n], c = MAP_PATH[(i + 1) % n], p = MAP_PATH[i];
    const dx = c[0] - a2[0], dy = c[1] - a2[1], len = hyp(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    left.push([p[0] + nx * half[i], p[1] + ny * half[i]]);
    right.push([p[0] - nx * half[i], p[1] - ny * half[i]]);
  }
  const close = (pts) => pts.concat([pts[0]]);
  const a = simplify(close(left), 0.06), b = simplify(close(right), 0.06);
  return `${polyD(a, f2)}Z${polyD(b, f2)}Z`;
})();
var TURNS = CIRCUIT_MARKERS.map((m) => {
  const [x, y] = artboardToMap(m.x, m.y);
  const i = nearestIndex([m.x, m.y]);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, angle: Math.round(headingAt(i) * 10) / 10 };
});
var FLAG_CUT = (() => {
  const [x, y] = artboardToMap(CIRCUIT_PATH[0][0], CIRCUIT_PATH[0][1]);
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, along: 36, across: 40, angle: Math.round(headingAt(0) * 10) / 10 };
})();
var FLAG_SQUARES = (() => {
  const pitch = 9.4, side = 8.6;
  const rad = FLAG_CUT.angle * Math.PI / 180;
  const ux = Math.cos(rad), uy = Math.sin(rad), vx = -uy, vy = ux;
  let d = "";
  for (let i = -1; i <= 1; i += 1) {
    for (let j = -2; j <= 2; j += 1) {
      if (i + j & 1) continue;
      const cx = FLAG_CUT.x + ux * i * pitch + vx * j * pitch;
      const cy = FLAG_CUT.y + uy * i * pitch + vy * j * pitch;
      const h = side / 2;
      const corners2 = [[-h, -h], [h, -h], [h, h], [-h, h]].map(([a, b]) => [cx + ux * a + vx * b, cy + uy * a + vy * b]);
      d += `${polyD(corners2, f2)}Z`;
    }
  }
  return d;
})();
var TRACK_MINI_D = (() => {
  const margin = 4, w = 78 - margin * 2, h = 50 - margin * 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of CIRCUIT_PATH) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const k = Math.min(w / (maxX - minX), h / (maxY - minY));
  const ox = margin + (w - (maxX - minX) * k) / 2, oy = margin + (h - (maxY - minY) * k) / 2;
  const pts = CIRCUIT_PATH.slice(0, -1).map(([x, y]) => [ox + (x - minX) * k, oy + (y - minY) * k]);
  return `${polyD(simplify(pts.concat([pts[0]]), 0.12), round1)}Z`;
})();

// src/hero/index.js
var strings2 = {
  en: {
    "hero.logoLabel": "Enric Masella \u2014 back to top",
    "hero.rowLearning": "DAW \xB7 Web development",
    "hero.rowSeeking": "Looking for an internship",
    "hero.p1.eyebrow": "featured project",
    "hero.p1.kind": "karting championship",
    "hero.p1.season": "2026 season",
    "hero.p1.mapAlt": "Stylised karting circuit motif",
    "hero.p2.eyebrow": "languages",
    "hero.lv.native": "native",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Spanish: native",
    "hero.lv.ca": "Catalan: native",
    "hero.lv.en": "English: C1",
    "hero.mail": "get in touch",
    "hero.cta": "view projects",
    "hero.photoAlt": "Photo of Enric Masella in silver sunglasses. Moving the cursor over it reveals an X-ray of the same photo."
  },
  es: {
    "hero.logoLabel": "Enric Masella \u2014 volver arriba",
    "hero.rowLearning": "DAW \xB7 Desarrollo web",
    "hero.rowSeeking": "En busca de pr\xE1cticas",
    "hero.p1.eyebrow": "proyecto destacado",
    "hero.p1.kind": "campeonato de karting",
    "hero.p1.season": "temporada 2026",
    "hero.p1.mapAlt": "Motivo estilizado de un circuito de karting",
    "hero.p2.eyebrow": "idiomas",
    "hero.lv.native": "nativo",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Espa\xF1ol: nativo",
    "hero.lv.ca": "Catal\xE1n: nativo",
    "hero.lv.en": "Ingl\xE9s: C1",
    "hero.mail": "escr\xEDbeme",
    "hero.cta": "ver proyectos",
    "hero.photoAlt": "Foto de Enric Masella con gafas de sol plateadas. Al mover el cursor sobre ella aparece una radiograf\xEDa de la misma foto."
  },
  ca: {
    "hero.logoLabel": "Enric Masella \u2014 torna a dalt",
    "hero.rowLearning": "DAW \xB7 Desenvolupament web",
    "hero.rowSeeking": "A la recerca de pr\xE0ctiques",
    "hero.p1.eyebrow": "projecte destacat",
    "hero.p1.kind": "campionat de karting",
    "hero.p1.season": "temporada 2026",
    "hero.p1.mapAlt": "Motiu estilitzat d'un circuit de karting",
    "hero.p2.eyebrow": "idiomes",
    "hero.lv.native": "natiu",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Castell\xE0: natiu",
    "hero.lv.ca": "Catal\xE0: natiu",
    "hero.lv.en": "Angl\xE8s: C1",
    "hero.mail": "escriu-me",
    "hero.cta": "veure projectes",
    "hero.photoAlt": "Foto d'Enric Masella amb ulleres de sol platejades. En moure el cursor per sobre apareix una radiografia de la mateixa foto."
  }
};
// LANG_NAMES importado de translations.js
var mm = (query) => window.matchMedia(query).matches;
function mount(slot) {
  slot.innerHTML = markup_default;
  const root = slot.querySelector("[data-hero]");
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));
  const photo = HERO_SUBJECT === "photo";
  root.dataset.subject = HERO_SUBJECT;
  const offs = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    offs.push(() => target.removeEventListener(type, fn, opts));
  };
  qa("[data-bracket]").forEach((el) => el.insertAdjacentHTML("beforeend", bracketCorners()));
  q("[data-map-path]").setAttribute("d", TRACK_MINI_D);
  q("[data-github]").href = SITE.github;
  q("[data-mail]").href = `mailto:${SITE.email}`;
  q("[data-mail-host]").textContent = SITE.email;
  q('[data-social="github"]').href = SITE.github;
  q('[data-social="inst"]').href = SITE.instagramUrl;
  q("[data-cta]").innerHTML = ctaHTML({ href: "#work", labelKey: "hero.cta" });
  const still = q("[data-fallback]");
  still.src = photo ? hero_photo_default : footer_figure_default;
  applyDom(root);
  const wireLang = (host) => {
    host.innerHTML = LANGS.map((l) => `<button type="button" data-lang="${l}" lang="${l}" aria-label="${LANG_NAMES[l]}" aria-pressed="${l === getLang()}">${l}</button>`).join("");
    host.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang]");
      if (b) setLang(b.dataset.lang);
    });
  };
  wireLang(q("[data-lang-switch]"));
  offs.push(onLang((l) => document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === l)))));
  const entrances = [];
  const add = (el, opts = {}) => {
    const r = rise(el, { view: false, ...opts });
    entrances.push(r);
    return r;
  };
  add(q("[data-mast]"));
  add(q("[data-id]"), { from: { opacity: 0 }, to: { opacity: 1 }, delay: 180 });
  entrances.push(revealText(q("[data-name]"), { text: SITE.name.toLowerCase(), by: "words", stagger: 110, config: CFG.REVEAL, delay: 180, mode: "once", view: false }));
  qa("[data-meta-row]").forEach((li, i) => add(li, { delay: 180 + 260 + i * 130 }));
  add(q("[data-hero-panels]"), { from: { opacity: 0, y: "1.25rem" }, delay: 900 });
  add(q("[data-actions]"), { delay: 1500 });
  ["es", "ca", "en"].forEach((code, i) => {
    entrances.push(revealText(q(`[data-stat="${code}"]`), { text: code.toUpperCase(), by: "letters", stagger: 26, config: CFG.FIGURE, delay: 900 + i * 90, mode: "forward", view: false }));
  });
  let scene = null, ready = false, watchdog = 0;
  const startEntrances = requestAnimationFrame(() => entrances.forEach((e) => e.enable(true)));
  const afterPaint = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const onReady = () => {
    if (ready) return;
    ready = true;
    clearTimeout(watchdog);
    scene?.beginRise();
    root.dataset.sceneReady = "";
    document.documentElement.dataset.heroReady = "1";
  };
  const showStill = () => {
    if (photo) q("[data-hero-plate]").appendChild(still);
    still.hidden = false;
    q("[data-canvas]").hidden = true;
    root.dataset.noWebgl = "";
  };
  const canvas = q("[data-canvas]");
  const stage = q(".hero__scene"), col = q(".hero__col"), fitwrap = q(".hero__fitwrap"), box2 = q("[data-hero-fit]"), slotEl = q("[data-hero-plate]");
  if (photo) {
    stage.removeAttribute("aria-hidden");
    stage.setAttribute("role", "img");
  }
  try {
    scene = new HeroScene(canvas);
  } catch (err) {
    console.warn("[hero] WebGL is not available \u2014 showing the still figure.", err);
    scene = null;
  }
  let pointerBound = false;
  const onMove = (e) => scene?.setPointer(e.clientX / window.innerWidth * 2 - 1, e.clientY / window.innerHeight * 2 - 1);
  const syncPointer = () => {
    const want = Boolean(scene && scene.tier.pointerEnabled);
    if (want === pointerBound) return;
    pointerBound = want;
    if (want) window.addEventListener("pointermove", onMove, { passive: true });
    else window.removeEventListener("pointermove", onMove);
  };
  offs.push(() => window.removeEventListener("pointermove", onMove));
  const plateRect = () => {
    if (!slotEl.offsetParent) return null;
    const sw = slotEl.offsetWidth, sh = slotEl.offsetHeight;
    let scale = Math.min(sh / PLATE.visible, sw / PLATE.bust);
    if (getComputedStyle(slotEl).getPropertyValue("--plate-cover").trim() === "1") scale = Math.max(scale, stage.clientWidth * 1.02 / PLATE.bust);
    const w = PLATE.width * scale, h = PLATE.height * scale;
    return { left: slotEl.offsetLeft + (sw - w) / 2, top: slotEl.offsetTop + sh - PLATE.visible * scale, width: w, height: h, scale };
  };
  const applyFit = () => {
    if (!scene) return;
    if (photo) {
      const rect = plateRect();
      scene.setPlate(rect);
      const radius = rect ? 0.2 * (2 * PLATE.face * rect.scale / Math.max(stage.clientHeight, 1)) : DEFAULT_PARAMS.trailRadius;
      const k = radius / DEFAULT_PARAMS.trailRadius;
      scene.setParams({
        ...DEFAULT_PARAMS,
        trailRadius: radius,
        revealWarp: DEFAULT_PARAMS.revealWarp * k,
        sweepRadius: radius,
        sweepWarp: DEFAULT_PARAMS.sweepWarp * k,
        // Where there is no cursor the idle sweep draws the skeleton for the reader. Its path is already mapped onto the photo, so no scaling.
        autoSweepAmount: mm("(hover: none)") ? 1 : 0,
        // The page answers the cursor too, not only the photo: a small lens over the backdrop wherever it runs. A fine pointer only —
        // on touch the idle sweep is the photo's alone, and the backdrop's trail loop is the cost a phone should not pay.
        bgLens: scene.tier.pointerEnabled ? 1 : 0
      });
      return;
    }
    const fit = box2.offsetParent !== null ? fitSubjectToBox(DEFAULT_PARAMS, { top: col.offsetTop + fitwrap.offsetTop + box2.offsetTop, height: box2.offsetHeight }, stage.clientHeight) : null;
    scene.setParams({
      ...DEFAULT_PARAMS,
      ...fit,
      // Every touch width, not just phones: the parked cursor reveal never moves and reads as a blob.
      ...mm("(max-width: 1023px)") ? { bgRevealOpacity: 0 } : null,
      // Where there is no pointer at all the reveal is driven for the reader by the idle sweep.
      ...mm("(hover: none)") ? { autoSweepAmount: 0.76 } : null,
      // The brush is sized for the screen: on a phone a wider brush reveals the head as one mass.
      ...mm("(max-width: 639px)") ? { sweepRadius: 0.95, sweepWarp: 0.18, autoSweepAmount: 0.55 } : null,
      // Last, because it overrides the two above: the mobile tier has no reveal after the burn at all.
      ...scene.tier.reveal ? null : { autoSweepAmount: 0 }
    });
  };
  let lastW = 0, lastH = 0, frame2 = 0;
  const measure = () => {
    frame2 = 0;
    if (!scene) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h || w === lastW && h === lastH) return;
    const widthChanged = w !== lastW;
    if (!widthChanged && scene.tier.coarsePointer) return;
    lastW = w;
    lastH = h;
    if (widthChanged) {
      scene.retune();
      syncPointer();
    }
    scene.resize(w, h);
    applyFit();
  };
  const schedule2 = () => {
    if (!frame2) frame2 = requestAnimationFrame(measure);
  };
  let loop = null;
  if (scene) {
    scene.onReady = onReady;
    const ro = new ResizeObserver(schedule2);
    ro.observe(root);
    offs.push(() => ro.disconnect());
    const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");
    const onCoarse = () => {
      if (!scene) return;
      scene.retune();
      syncPointer();
      applyFit();
    };
    coarse.addEventListener("change", onCoarse);
    offs.push(() => coarse.removeEventListener("change", onCoarse));
    measure();
    syncPointer();
    loop = loopInView(root, (time) => {
      if (scene && window.scrollY <= window.innerHeight * 1.15) scene.update(time);
    }, () => scene ? scene.tier.frameInterval : 0);
    watchdog = setTimeout(() => {
      if (ready) return;
      console.warn("[hero] the scene did not report ready in time \u2014 showing the still figure.");
      try {
        scene.dispose();
      } catch {
      }
      scene = null;
      syncPointer();
      showStill();
      afterPaint(onReady);
    }, 4e4);
  } else {
    showStill();
    afterPaint(onReady);
  }
  offs.push(blink(q("[data-caret]")));
  return {
    el: root,
    get scene() {
      return scene;
    },
    // for the test harness
    destroy() {
      clearTimeout(watchdog);
      cancelAnimationFrame(startEntrances);
      cancelAnimationFrame(frame2);
      loop?.destroy();
      offs.forEach((off) => off());
      entrances.forEach((e) => e.destroy?.());
      try {
        scene?.dispose();
      } catch {
      }
      scene = null;
      slot.innerHTML = "";
    }
  };
}

// src/dock.js
var strings3 = {
  en: { "nav.index": "index" },
  es: { "nav.index": "inicio" },
  ca: { "nav.index": "inici" }
};
var ITEMS = [{ key: "nav.index", id: "top" }, ...NAV];
var ORDER = ITEMS.map((it) => it.id);
var TZ = "Europe/Madrid";
var pad = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, "0");
function mountDock() {
  const root = document.createElement("nav");
  root.className = "dock";
  root.dataset.dock = "";
  root.setAttribute("aria-label", t("a11y.primaryNav"));
  root.innerHTML = `
    <ul class="dock__nav">${ITEMS.map((it) => `<li><a class="dock__link" href="#${it.id}" data-dock="${it.id}" aria-label="${esc(t(it.key))}"><span class="dock__br" aria-hidden="true">[</span><span class="dock__txt" aria-hidden="true">${esc(t(it.key))}</span><span class="dock__br" aria-hidden="true">]</span></a></li>`).join("")}</ul>
    <span class="dock__fill" aria-hidden="true">${"/".repeat(220)}</span>
    <p class="dock__read dock__clock" aria-hidden="true"><span data-dock-tz>gmt+1</span> <time data-dock-time>00:00:00</time></p>
    <p class="dock__read dock__scroll" aria-hidden="true">scroll <b data-dock-scroll>000</b>%</p>
    <p class="dock__read dock__xy" aria-hidden="true">x <b data-dock-x>0000</b> y <b data-dock-y>0000</b></p>`;
  document.body.appendChild(root);
  const $ = (sel) => root.querySelector(sel);
  const links = Array.from(root.querySelectorAll("[data-dock]"));
  const label = (a) => t(ITEMS.find((it) => it.id === a.dataset.dock).key);
  const cancels = /* @__PURE__ */ new Map();
  const decode = (a, ms = 420) => {
    cancels.get(a)?.();
    cancels.set(a, scrambleText(a.querySelector(".dock__txt"), { text: label(a), duration: ms }));
  };
  const offs = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    offs.push(() => target.removeEventListener(type, fn, opts));
  };
  for (const a of links) on(a, "pointerenter", (e) => {
    if (e.pointerType === "mouse") decode(a, 360);
  });
  const frameOf = (id) => {
    const el = document.getElementById(id);
    return id === "top" || id === "work" || id === "path" ? el?.closest(".layer") ?? el : el;
  };
  let active = "";
  const setActive = (id, first = false) => {
    if (id === active) return;
    active = id;
    for (const a of links) {
      const on2 = a.dataset.dock === id;
      a.classList.toggle("is-active", on2);
      if (on2) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
      if (on2 && !first) decode(a, 480);
    }
  };
  const currentSection = (vh) => {
    const y = vh * 0.5;
    let now = "top";
    for (const id of ORDER) {
      const frame2 = frameOf(id);
      if (!frame2) continue;
      const r = frame2.getBoundingClientRect();
      if (id === "skills") {
        if (r.top <= y && r.bottom >= y) now = "skills";
        continue;
      }
      if (r.top <= y) now = id;
    }
    return now;
  };
  const tzEl = $("[data-dock-tz]"), timeEl = $("[data-dock-time]"), scrollEl = $("[data-dock-scroll]"), xEl = $("[data-dock-x]"), yEl = $("[data-dock-y]");
  let clockFmt = null, zoneFmt = null;
  try {
    clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    zoneFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, timeZoneName: "shortOffset" });
  } catch {
  }
  let lastZone = 0;
  const tick = () => {
    if (!clockFmt) return;
    const now = /* @__PURE__ */ new Date();
    timeEl.textContent = clockFmt.format(now);
    if (now - lastZone > 6e4) {
      lastZone = +now;
      const part = zoneFmt.formatToParts(now).find((p) => p.type === "timeZoneName");
      if (part) tzEl.textContent = part.value.toLowerCase();
    }
  };
  tick();
  const clock = setInterval(tick, 1e3);
  offs.push(() => clearInterval(clock));
  let px = 0, py = 0, queued2 = 0;
  const paint = () => {
    queued2 = 0;
    const view = window.innerHeight || 1;
    const max = Math.max(1, document.documentElement.scrollHeight - view);
    scrollEl.textContent = pad(Math.min(Math.max(window.scrollY, 0), max) / max * 100, 3);
    xEl.textContent = pad(px, 4);
    yEl.textContent = pad(py, 4);
    setActive(currentSection(view));
  };
  const schedule2 = () => {
    if (!queued2) queued2 = requestAnimationFrame(paint);
  };
  on(window, "scroll", schedule2, { passive: true });
  on(window, "resize", schedule2, { passive: true });
  on(window, "pointermove", (e) => {
    px = e.clientX;
    py = e.clientY;
    schedule2();
  }, { passive: true });
  paint();
  setActive(currentSection(window.innerHeight || 1), true);
  offs.push(onLang(() => {
    root.setAttribute("aria-label", t("a11y.primaryNav"));
    for (const a of links) {
      a.setAttribute("aria-label", label(a));
      a.querySelector(".dock__txt").textContent = label(a);
    }
  }));
  if (!reduced()) links.forEach((a, i) => {
    cancels.set(a, scrambleText(a.querySelector(".dock__txt"), { text: label(a), duration: 520, delay: 700 + i * 70, hidden: true }));
  });
  return {
    el: root,
    destroy() {
      offs.forEach((off) => off());
      cancels.forEach((c) => c());
      cancelAnimationFrame(queued2);
      root.remove();
    }
  };
}

// src/blocks/season/index.js
var season_exports = {};
__export(season_exports, {
  mount: () => mount2,
  strings: () => strings4
});

// src/blocks/season/markup.html
var markup_default2 = '<section class="sw" data-season aria-labelledby="sw-title">\n  <div class="sw__stage" data-stage data-recede>\n    <div class="sw__field" data-field aria-hidden="true"></div>\n\n    <div class="sw__tick sw__tick--top" aria-hidden="true"><div class="sw__tick-track" data-tick="0"></div></div>\n    <div class="sw__tick sw__tick--bottom" aria-hidden="true"><div class="sw__tick-track" data-tick="1"></div></div>\n\n    <header class="sw__hud sw__hud--top" aria-hidden="true">\n      <span class="sw__tag">[ <span data-i18n="season.head1"></span> ]</span>\n      <span class="sw__fill">////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////</span>\n      <span class="sw__count"><b data-count>001</b>/003</span>\n    </header>\n\n    <div class="sw__slides">\n      <!-- the title -->\n      <article class="sw__slide sw__slide--title" data-slide="0">\n        <div class="sw__in">\n          <p class="sw__eyebrow" data-scrub="eyebrow0"></p>\n          <h2 class="sw__title" id="sw-title">\n            <span class="sw__t-line" data-i18n="season.head1"></span>\n            <span class="sw__t-line"><span data-i18n="season.head2"></span><span class="sw__dot" aria-hidden="true">.</span></span>\n          </h2>\n          <p class="sw__intro" data-scrub="intro"></p>\n        </div>\n      </article>\n\n      <!-- 001 \u2014 the live project -->\n      <article class="sw__slide sw__slide--case" data-slide="1" aria-labelledby="sw-name-1">\n        <div class="sw__in sw__in--split">\n          <div class="sw__col">\n            <p class="sw__eyebrow" data-scrub="eyebrow1"></p>\n            <h3 class="sw__name" id="sw-name-1">__NAME__</h3>\n            <p class="sw__live"><i class="sw__led" data-led aria-hidden="true"></i><span data-scrub="live"></span></p>\n          </div>\n          <div class="sw__col sw__col--file">\n            <div class="sw__file bracket">\n              __CORNERS__\n              <p class="sw__file-head" data-scrub="path1"></p>\n              <dl class="sw__rows">\n                <div><dt data-i18n="season.k.site"></dt><dd data-scrub="site"></dd></div>\n                <div><dt data-i18n="season.k.role"></dt><dd data-scrub="role"></dd></div>\n                <div><dt data-i18n="season.k.stack"></dt><dd data-scrub="stack"></dd></div>\n              </dl>\n              <dl class="sw__figs">\n                <div class="sw__fig"><dt data-i18n="season.stat.gp"></dt><dd class="sw__fig-n" data-count-to="gp"></dd></div>\n                <div class="sw__fig"><dt data-i18n="season.stat.class"></dt><dd class="sw__fig-n" data-count-to="class"></dd></div>\n              </dl>\n            </div>\n            <a class="sw__go" href="#project" data-scrub="go"></a>\n          </div>\n        </div>\n      </article>\n\n      <!-- 002 \u2014 what comes next -->\n      <article class="sw__slide sw__slide--next" data-slide="2" aria-labelledby="sw-name-2">\n        <div class="sw__in sw__in--split">\n          <div class="sw__col">\n            <p class="sw__eyebrow" data-scrub="eyebrow2"></p>\n            <h3 class="sw__name" id="sw-name-2" data-soon-a></h3>\n            <p class="sw__soon"><span data-scrub="soon"></span><i class="sw__caret" data-caret aria-hidden="true"></i></p>\n          </div>\n          <div class="sw__col sw__col--file" aria-hidden="true">\n            <div class="sw__file sw__file--empty bracket">\n              __CORNERS__\n              <p class="sw__file-head" data-scrub="path2"></p>\n              <dl class="sw__rows">\n                <div><dt data-i18n="season.k.site"></dt><dd>________________</dd></div>\n                <div><dt data-i18n="season.k.role"></dt><dd>________</dd></div>\n                <div><dt data-i18n="season.k.stack"></dt><dd>____________</dd></div>\n              </dl>\n            </div>\n          </div>\n        </div>\n      </article>\n    </div>\n\n    <div class="sw__scan" data-scan aria-hidden="true">\n      <span class="sw__scan-noise" data-scan-noise></span>\n      <span class="sw__scan-read" data-scan-read>scan 000</span>\n    </div>\n\n    <footer class="sw__hud sw__hud--bottom" aria-hidden="true">\n      <div class="sw__chap">\n        <span class="sw__seg" data-seg="0" style="flex-grow:31"><em data-chap="0"></em><i></i></span>\n        <span class="sw__seg" data-seg="1" style="flex-grow:38"><em>001</em><i></i></span>\n        <span class="sw__seg" data-seg="2" style="flex-grow:31"><em>002</em><i></i></span>\n      </div>\n      <span class="sw__hint"><span data-i18n="season.scroll"></span>\n        <svg viewBox="0 0 9 13" width="9" height="13" focusable="false"><path d="M4.5 0V12M0.5 8l4 4 4-4"/></svg></span>\n    </footer>\n  </div>\n</section>\n';

// src/dissolve.js
var SIZE = 12;
var ADVANCE = 0.612;
var HEIGHT = 14;
var ACCENT_SHARE = 0.07;
var SWEEP = 0.7;
var SPREAD = 0.22;
var NOISE2 = ".:+#/\\|<>=";
var noise = (x, y) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
};
function mountDissolve(host) {
  const band = document.createElement("div");
  band.className = "dissolve";
  band.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  band.appendChild(canvas);
  host.appendChild(band);
  const context = canvas.getContext("2d");
  const still = reduced();
  let width = 0, columns = 0, progress = still ? 1 : 0, drawn = null, ratio = 1, fontReady = false;
  function render() {
    if (!width || !fontReady) return;
    const key = Math.round(progress * 400);
    if (drawn === key) return;
    drawn = key;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, HEIGHT);
    if (progress <= 0) return;
    context.font = `400 ${SIZE}px "Space Mono", ui-monospace, monospace`;
    context.textBaseline = "alphabetic";
    const ink = token("--foreground-on-dark-faint");
    const accent = token("--accent");
    const cell = SIZE * ADVANCE;
    for (let column = 0; column < columns; column += 1) {
      const arrival = SWEEP * (column / columns) + (1 - SWEEP) * noise(column, 3);
      const t2 = clamp01((progress * (1 + SPREAD) - arrival) / SPREAD);
      if (t2 <= 0) continue;
      const hot = noise(column + 101, 57) < ACCENT_SHARE;
      const glyph = t2 >= 1 ? "/" : NOISE2[Math.floor(noise(column + 7, key >> 2) * NOISE2.length)];
      context.fillStyle = hot ? accent : ink;
      context.fillText(glyph, column * cell, HEIGHT - 3);
    }
  }
  function measure() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = band.clientWidth;
    columns = Math.ceil(width / (SIZE * ADVANCE));
    const pixelsWide = Math.max(1, Math.round(width * ratio));
    const pixelsHigh = Math.round(HEIGHT * ratio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
      canvas.style.height = `${HEIGHT}px`;
      drawn = null;
    }
    render();
  }
  const ro = new ResizeObserver(measure);
  ro.observe(host);
  measure();
  const loadFont = document.fonts?.load ? document.fonts.load(`400 ${SIZE}px "Space Mono"`) : Promise.resolve();
  loadFont.catch(() => {
  }).then(() => {
    fontReady = true;
    drawn = null;
    render();
  });
  const trig = still ? null : scrollTrigger({
    el: band,
    start: "top bottom",
    end: "top center",
    config: CFG.TRIGGER,
    onUpdate: (_raw, smooth2) => {
      progress = smooth2;
      render();
    }
  });
  return {
    band,
    destroy() {
      trig?.destroy();
      ro.disconnect();
      band.remove();
    }
  };
}

// src/blocks/season/index.js
var STEPS = 3;
var CUTS = [0.31, 0.69];
var HALF = 0.07;
var REST = [0, 0.5, 0.95];
var NOISE3 = ".:+#/\\|<>[]=%$@0123456789";
var KEYWORDS = ["PHP", "React", "TypeScript", "SQL", "C#", "JavaScript"].filter((k) => [...CV.core, ...CV.learned].includes(k));
var strings4 = {
  en: {
    "season.head1": "selected work",
    "season.head2": "so far",
    "season.intro": "Every project is a step forward. One is live today; the next ones will land here.",
    "season.index.label": "Projects",
    "season.index.soon": "More projects \u2014 coming soon",
    "season.plate.eyebrow": "web development",
    "season.stat.gp": "grands prix",
    "season.stat.class": "classifications",
    "season.scroll": "scroll",
    "season.k.site": "site",
    "season.k.role": "role",
    "season.k.stack": "stack",
    "season.v.live": `live, ${PKC.season}`,
    "season.v.role": "built end to end"
  },
  es: {
    "season.head1": "trabajo destacado",
    "season.head2": "hasta ahora",
    "season.intro": "Cada proyecto es un paso adelante. Hoy hay uno publicado; los siguientes ir\xE1n apareciendo aqu\xED.",
    "season.index.label": "Proyectos",
    "season.index.soon": "M\xE1s proyectos \u2014 pr\xF3ximamente",
    "season.plate.eyebrow": "desarrollo web",
    "season.stat.gp": "grandes premios",
    "season.stat.class": "clasificaciones",
    "season.scroll": "desliza",
    "season.k.site": "web",
    "season.k.role": "rol",
    "season.k.stack": "stack",
    "season.v.live": `publicado, ${PKC.season}`,
    "season.v.role": "de principio a fin"
  },
  ca: {
    "season.head1": "treball destacat",
    "season.head2": "fins ara",
    "season.intro": "Cada projecte \xE9s un pas endavant. Ara n'hi ha un de publicat; els seg\xFCents aniran apareixent aqu\xED.",
    "season.index.label": "Projectes",
    "season.index.soon": "M\xE9s projectes \u2014 aviat",
    "season.plate.eyebrow": "programaci\xF3 web",
    "season.stat.gp": "grans premis",
    "season.stat.class": "classificacions",
    "season.scroll": "llisca",
    "season.k.site": "web",
    "season.k.role": "rol",
    "season.k.stack": "stack",
    "season.v.live": `publicat, ${PKC.season}`,
    "season.v.role": "de dalt a baix"
  }
};
var split = (s) => {
  const i = s.indexOf(" \u2014 ");
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 3)];
};
var pad2 = (n, w) => String(Math.max(0, Math.round(n))).padStart(w, "0");
var TEXT = {
  eyebrow0: () => ({ text: `// ${t("season.index.label").toLowerCase()}`, sr: "" }),
  intro: () => ({ text: t("season.intro") }),
  eyebrow1: () => ({ text: `001 // ${t("season.plate.eyebrow")}`, sr: t("season.plate.eyebrow") }),
  live: () => ({ text: t("season.v.live") }),
  path1: () => ({ text: "~/work/001", sr: "" }),
  site: () => ({ text: PKC.host }),
  role: () => ({ text: t("season.v.role") }),
  stack: () => ({ text: [t("paddock.s1.name"), "PHP", "React", "SEO"].join(" \xB7 ").toLowerCase() }),
  go: () => {
    const label = `${t("paddock.head1")} ${t("paddock.head2")}`;
    return { text: `[ ${label} -> ]`, sr: label };
  },
  eyebrow2: () => ({ text: `002 // ${t("timeline.r7.label")}`, sr: "" }),
  soon: () => ({ text: split(t("season.index.soon"))[1] }),
  path2: () => ({ text: "~/work/002", sr: "" })
};
var RANGE = {
  eyebrow1: [0.25, 0.33],
  live: [0.29, 0.37],
  path1: [0.27, 0.35],
  site: [0.32, 0.42],
  role: [0.35, 0.45],
  stack: [0.38, 0.5],
  go: [0.46, 0.54],
  eyebrow2: [0.63, 0.71],
  soon: [0.67, 0.77],
  path2: [0.65, 0.73]
};
var COUNT = { gp: { to: PKC.gp, range: [0.37, 0.5] }, class: { to: PKC.classifications.length, range: [0.41, 0.54] } };
var nameHTML = () => {
  const [first, ...rest] = PKC.name.split(" ");
  return `<span class="sw__n-line">${esc(first)}</span> <span class="sw__n-line">${esc(rest.join(" "))}</span>`;
};
function mount2(slot) {
  const still = reduced();
  slot.innerHTML = markup_default2.replaceAll("__CORNERS__", bracketCorners()).replace("__NAME__", nameHTML());
  const root = slot.querySelector("[data-season]");
  const stage = root.querySelector("[data-stage]");
  const layer = slot.closest(".layer");
  applyDom(root);
  const parts = [];
  const offs = [];
  const on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    offs.push(() => target.removeEventListener(type, fn, opts));
  };
  if (still) {
    root.dataset.static = "";
    layer?.classList.add("layer--flow");
  } else if (layer) {
    layer.classList.add("layer--tall");
    layer.style.setProperty("--work-steps", String(STEPS));
  }
  parts.push(mountDissolve(root, { carry: "light" }));
  parts.push(mountGlyphs(root.querySelector("[data-field]"), { size: 13, line: 16, seed: 5, speed: 0.7 }));
  const items = [...root.querySelectorAll("[data-scrub]")].map((el) => {
    el.insertAdjacentHTML("beforeend", '<span class="sr-only"></span><span class="sw__s" aria-hidden="true"></span>');
    const key = el.dataset.scrub;
    return { key, el, sr: el.querySelector(".sr-only"), vis: el.querySelector(".sw__s"), range: RANGE[key] ?? null, full: "", mark: "" };
  });
  const counters = [...root.querySelectorAll("[data-count-to]")].map((el) => {
    el.insertAdjacentHTML("beforeend", '<span class="sr-only"></span><span class="sw__s" aria-hidden="true"></span>');
    const spec = COUNT[el.dataset.countTo];
    return { el, sr: el.querySelector(".sr-only"), vis: el.querySelector(".sw__s"), to: spec.to, range: spec.range, mark: "" };
  });
  const byKey = (k) => items.find((it) => it.key === k);
  const soonEl = root.querySelector("[data-soon-a]");
  const chapEl = root.querySelector("[data-chap='0']");
  const ticks2 = [...root.querySelectorAll("[data-tick]")];
  const tickUnit = [
    () => `<span class="sw__tk">${esc(t("season.head1").toUpperCase())}</span><span class="sw__tk-sep">////</span>`,
    () => KEYWORDS.map((k) => `<span class="sw__tk">${esc(k.toUpperCase())}</span><span class="sw__tk-sep">/</span>`).join("")
  ];
  const travel = [0, 0];
  let stageW = 0, stageH = 0;
  const fillTicks = () => {
    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    ticks2.forEach((track, i) => {
      const unit = tickUnit[i]();
      track.innerHTML = unit;
      for (let guard = 0; track.offsetWidth < stageW * 2.3 && guard < 10; guard += 1) track.insertAdjacentHTML("beforeend", unit);
      travel[i] = Math.max(0, Math.min(track.offsetWidth - stageW, stageW * 1.1));
    });
  };
  const titleEl = root.querySelector(".sw__title");
  const fitTitle = () => {
    titleEl.style.fontSize = "";
    const avail = titleEl.parentElement.clientWidth;
    let widest = 0;
    for (const line of titleEl.querySelectorAll(".sw__t-line")) widest = Math.max(widest, line.scrollWidth);
    if (avail > 0 && widest > avail) titleEl.style.fontSize = `${(parseFloat(getComputedStyle(titleEl).fontSize) * (avail / widest) * 0.985).toFixed(2)}px`;
  };
  const fill = () => {
    for (const it of items) {
      const { text, sr = text } = TEXT[it.key]();
      it.full = text;
      it.sr.textContent = sr;
      it.mark = "";
    }
    for (const c of counters) {
      c.sr.textContent = String(c.to);
      c.mark = "";
    }
    soonEl.textContent = split(t("season.index.soon"))[0];
    chapEl.textContent = t("nav.index");
    fillTicks();
    fitTitle();
  };
  fill();
  offs.push(onLang(() => {
    fill();
    if (still) {
      paintStatic();
      return;
    }
    if (entryDone) settleEntry();
    else for (const k of ["eyebrow0", "intro"]) {
      const it = byKey(k);
      it.vis.textContent = scrubText(it.full, 0);
    }
    paint(pd, true);
  }));
  function paintStatic() {
    for (const it of items) it.vis.textContent = it.full;
    for (const c of counters) c.vis.textContent = pad2(c.to, 2);
  }
  let entryDone = false, entryStops = [];
  const settleEntry = () => {
    entryStops.forEach((stop) => stop());
    for (const k of ["eyebrow0", "intro"]) {
      const it = byKey(k);
      it.vis.textContent = it.full;
    }
  };
  const entry = () => {
    if (entryDone) return;
    entryDone = true;
    entryStops = [["eyebrow0", 120, 420], ["intro", 260, 1100]].map(([k, delay, duration]) => {
      const it = byKey(k);
      return scrambleText(it.vis, { text: it.full, duration, delay, hidden: true });
    });
  };
  if (still) paintStatic();
  else {
    for (const k of ["eyebrow0", "intro"]) {
      const it = byKey(k);
      it.vis.textContent = scrubText(it.full, 0);
    }
    parts.push(inView(stage, { threshold: 0.25, once: true, onChange: (visible) => {
      if (visible) entry();
    } }));
  }
  parts.push({ destroy() {
    entryStops.forEach((stop) => stop());
  } });
  const stops = [blink(root.querySelector("[data-led]"), 640), blink(root.querySelector("[data-caret]"), 530)];
  parts.push({ destroy() {
    stops.forEach((s) => s());
  } });
  const slides = [...root.querySelectorAll("[data-slide]")];
  const scan = root.querySelector("[data-scan]");
  const scanRead = root.querySelector("[data-scan-read]");
  const scanNoise = root.querySelector("[data-scan-noise]");
  const countEl = root.querySelector("[data-count]");
  const segs = [...root.querySelectorAll("[data-seg]")];
  const segFill = segs.map((s) => s.querySelector("i"));
  const segLabel = segs.map((s) => s.querySelector("em"));
  const wipe = (i, p) => easeInOutSine(clamp01((p - (CUTS[i] - HALF)) / (2 * HALF)));
  const slideAt = (p) => p < CUTS[0] ? 0 : p < CUTS[1] ? 1 : 2;
  let pd = 0, shown = -1, cur = 0, noiseAt = 0, countCancel = () => {
  };
  const clips = ["", "", ""], events = ["", "", ""];
  function paint(p, force = false) {
    const y = [wipe(0, p), wipe(1, p)];
    for (let s = 0; s < 3; s += 1) {
      const top = s < 2 ? y[s] : 0;
      const bottom = s > 0 ? y[s - 1] : 1;
      const clip = bottom - top <= 5e-4 ? "inset(100% 0 0 0)" : `inset(${(top * 100).toFixed(2)}% 0 ${((1 - bottom) * 100).toFixed(2)}% 0)`;
      if (force || clip !== clips[s]) {
        slides[s].style.clipPath = clip;
        clips[s] = clip;
      }
      const ev = bottom - top > 0.5 ? "auto" : "none";
      if (force || ev !== events[s]) {
        slides[s].style.pointerEvents = ev;
        events[s] = ev;
      }
    }
    const live = y[0] > 0 && y[0] < 1 ? y[0] : y[1] > 0 && y[1] < 1 ? y[1] : -1;
    if (live >= 0) {
      scan.style.opacity = "1";
      scan.style.transform = `translate3d(0, ${(live * stageH).toFixed(1)}px, 0)`;
      scanRead.textContent = `scan ${pad2(live * 100, 3)}`;
      const now2 = performance.now();
      if (now2 - noiseAt > 70) {
        noiseAt = now2;
        let row = "";
        for (let i = 0, n = Math.ceil(stageW / 7.3); i < n; i += 1) row += NOISE3[Math.random() * NOISE3.length | 0];
        scanNoise.textContent = row;
      }
    } else if (scan.style.opacity !== "0") scan.style.opacity = "0";
    const now = slideAt(p);
    if (now !== cur || force) {
      const changed = now !== cur;
      cur = now;
      countCancel();
      if (changed) countCancel = scrambleText(countEl, { text: pad2(cur + 1, 3), duration: 320 });
      else countEl.textContent = pad2(cur + 1, 3);
      segLabel.forEach((el, i) => el.classList.toggle("is-on", i === cur));
    }
    const bounds = [0, CUTS[0], CUTS[1], 1];
    segFill.forEach((el, i) => {
      el.style.transform = `scaleX(${clamp01((p - bounds[i]) / (bounds[i + 1] - bounds[i])).toFixed(4)})`;
    });
    ticks2.forEach((track, i) => {
      track.style.transform = `translate3d(${(-(i === 0 ? p : 1 - p) * travel[i]).toFixed(1)}px, 0, 0)`;
    });
    const tickNoise = Math.floor(p * 140);
    for (const it of items) {
      if (!it.range) continue;
      const [a, b] = it.range;
      const k = clamp01((p - a) / (b - a));
      const mark = k <= 0 ? "0" : k >= 1 ? "1" : `${Math.floor(k * 60)}|${tickNoise}`;
      if (!force && mark === it.mark) continue;
      it.mark = mark;
      it.vis.textContent = k >= 1 ? it.full : scrubText(it.full, k, { tick: tickNoise, hidden: true });
    }
    for (const c of counters) {
      const k = clamp01((p - c.range[0]) / (c.range[1] - c.range[0]));
      const v = Math.round(c.to * easeOutQuad(k));
      const mark = String(v);
      if (!force && mark === c.mark) continue;
      c.mark = mark;
      c.vis.textContent = pad2(v, 2);
    }
    shown = p;
  }
  const stageHeight = () => stage.clientHeight || window.innerHeight;
  const rawProgress = () => {
    if (!layer) return 0;
    return clamp01(-layer.getBoundingClientRect().top / (STEPS * stageHeight()));
  };
  if (!still) {
    pd = rawProgress();
    let last = 0;
    parts.push(loopInView(stage, (time) => {
      const dt = Math.min(0.1, Math.max(1e-3, last ? (time - last) / 1e3 : 0.016));
      last = time;
      const target = rawProgress();
      pd += (target - pd) * (1 - Math.exp(-dt * 16));
      if (Math.abs(target - pd) < 4e-4) pd = target;
      if (pd !== shown) paint(pd);
    }));
    paint(pd, true);
    offs.push(onResize(() => {
      fillTicks();
      fitTitle();
      paint(pd, true);
    }));
    if (document.fonts?.ready) document.fonts.ready.then(() => {
      fillTicks();
      fitTitle();
      paint(pd, true);
    });
  } else {
    offs.push(onResize(fitTitle));
    if (document.fonts?.ready) document.fonts.ready.then(fitTitle);
  }
  on(root, "focusin", (e) => {
    if (still || !layer) return;
    const slide = e.target.closest?.("[data-slide]");
    if (!slide) return;
    const i = Number(slide.dataset.slide);
    if (i === slideAt(pd)) return;
    const y = window.scrollY + layer.getBoundingClientRect().top + REST[i] * STEPS * stageHeight();
    if (lenis) lenis.scrollTo(y, { duration: 1.1, easing: (x) => 1 - Math.pow(1 - x, 4) });
    else window.scrollTo({ top: y, behavior: "smooth" });
  });
  return {
    el: root,
    /** For the test harness: jump to progress `p` (0…1). */
    setProgress(p) {
      if (!layer) return;
      const y = window.scrollY + layer.getBoundingClientRect().top + clamp01(p) * STEPS * stageHeight();
      window.scrollTo(0, y);
    },
    destroy() {
      offs.forEach((off) => off());
      parts.forEach((p) => p.destroy?.());
      if (layer) {
        layer.classList.remove("layer--tall", "layer--flow");
        layer.style.removeProperty("--work-steps");
      }
      slot.innerHTML = "";
    }
  };
}

// src/blocks/timeline/index.js
var timeline_exports = {};
__export(timeline_exports, {
  mount: () => mount3,
  strings: () => strings5
});

// src/blocks/timeline/markup.html
var markup_default3 = '<section class="tl" data-timeline aria-labelledby="tl-title">\n  <svg class="tl__defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><clipPath id="tl-plate-clip" clipPathUnits="objectBoundingBox"><path d="__PLATE_CLIP__"/></clipPath></defs></svg>\n  <div class="tl__pad">\n    <h2 class="tl__head" id="tl-title" data-head>\n      <span class="tl__line"><span class="tl__line-text" data-i18n="timeline.head1"></span></span>\n      <span class="tl__line"><span class="tl__line-text" data-i18n="timeline.head2"></span><span class="tl__stop" aria-hidden="true">.</span></span>\n    </h2>\n    <div class="tl__rail" data-rail aria-hidden="true">\n      <svg class="tl__rail-svg" viewBox="0 0 16 2668" focusable="false">\n        <line class="tl__track tl__track--solid" x1="8" y1="0" x2="8" y2="98"/>\n        <line class="tl__track tl__track--dash" x1="8" y1="102" x2="8" y2="2387"/>\n        <rect class="tl__thread" x="7.5" y="0" width="1" height="0"/>\n        <rect class="tl__marker" x="-4.5" y="-4.5" width="9" height="9" transform="translate(8 0)"/>\n      </svg>\n    </div>\n    <ol class="tl__rows" data-rows data-i18n-attr="aria-label:timeline.listLabel"></ol>\n  </div>\n  <div class="tl__foot" aria-hidden="true"></div>\n</section>\n';

// src/assets.js
var assetUrl = (rel) => new URL(ASSET_BASE_URL + rel, document.baseURI).href;
function tryImage(rel) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = assetUrl(rel);
  });
}

// src/blocks/timeline/plate-shape.js
var PLATE_OUTLINE = "M13.6168 0.497469H697.378C700.858 0.497469 704.195 1.38786 706.655 2.97277C709.115 4.55769 710.498 6.70729 710.498 8.94869V411.208C710.498 413.449 709.115 415.599 706.655 417.183C704.195 418.768 700.858 419.659 697.378 419.659H460.249C454.073 419.659 447.976 420.555 442.411 422.281C436.847 424.008 431.958 426.519 428.107 429.63L399.246 452.95C395.559 455.928 390.878 458.333 385.55 459.986C380.223 461.639 374.385 462.497 368.472 462.497H13.6168C10.1373 462.497 6.80038 461.607 4.34003 460.022C1.87968 458.437 0.497469 456.288 0.497469 454.046V8.94869C0.497469 6.70729 1.87968 4.55769 4.34003 2.97277C6.80038 1.38786 10.1373 0.497469 13.6168 0.497469Z";
var PLATE_CLIP = "M 0.01915,0.00107H 0.98085C 0.98574,0.00107 0.99044,0.00300 0.99390,0.00642C 0.99736,0.00984 0.99930,0.01449 0.99930,0.01933V 0.88815C 0.99930,0.89299 0.99736,0.89763 0.99390,0.90105C 0.99044,0.90448 0.98574,0.90640 0.98085,0.90640H 0.64733C 0.63864,0.90640 0.63007,0.90834 0.62224,0.91206C 0.61442,0.91579 0.60754,0.92122 0.60212,0.92794L 0.56153,0.97830C 0.55635,0.98474 0.54976,0.98993 0.54227,0.99350C 0.53478,0.99707 0.52656,0.99892 0.51825,0.99892H 0.01915C 0.01426,0.99892 0.00956,0.99700 0.00610,0.99358C 0.00264,0.99016 0.00070,0.98551 0.00070,0.98067V 0.01933C 0.00070,0.01449 0.00264,0.00984 0.00610,0.00642C 0.00956,0.00300 0.01426,0.00107 0.01915,0.00107Z";

// src/blocks/timeline/art.js
var svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
var ticks = (x0, x1, y, step, every, short = 6, tall = 14) => {
  let d = "";
  for (let i = 0, x = x0; x <= x1 + 0.1; i += 1, x = x0 + i * step) d += `M${x} ${y}v${i % every === 0 ? tall : short}`;
  return d;
};
var corners = (w, h, m, n) => `M${m} ${m + n}V${m}H${m + n}M${w - m - n} ${m}H${w - m}V${m + n}M${w - m} ${h - m - n}V${h - m}H${w - m - n}M${m + n} ${h - m}H${m}V${h - m - n}`;
var studiesArt = () => svg(710, 462, `
  <defs><pattern id="tlp-grid" width="38" height="38" patternUnits="userSpaceOnUse"><path class="s-faint" d="M38 0H0V38"/></pattern></defs>
  <rect width="710" height="462" fill="url(#tlp-grid)" opacity=".6"/>
  <path class="s-mid" d="${corners(710, 462, 40, 22)}"/>
  <text class="glyph" x="355" y="166" text-anchor="middle">&lt;/&gt;</text>
  <path class="s-acc" d="M104 338H236" stroke-width="2"/>
  <path class="s-mid" d="M264 338H604" stroke-dasharray="3 7"/>
  <path class="s-mid" d="M596 330l8 8-8 8"/>
  <path class="f-acc" d="M250 324l14 14-14 14-14-14z"/>
  <path class="s-steel f-dark" d="M470 322l16 16-16 16-16-16z" stroke-dasharray="3 3"/>
  <text class="art-tag" x="250" y="304" text-anchor="middle">DAW</text>
  <text class="art-tag art-tag--dim" x="470" y="304" text-anchor="middle">DAM</text>
  <text class="art-note art-note--acc" x="250" y="376" text-anchor="middle" data-i18n="timeline.art.now"></text>
  <text class="art-note" x="470" y="376" text-anchor="middle" data-i18n="timeline.art.planned"></text>
  <path class="s-mid" d="M90 412H620"/>
  <path class="s-faint" d="${ticks(90, 620, 412, 10, 5)}"/>`);
var LEVEL_PIPS = { native: 5, c1: 4, upper: 3, mid: 2 };
var languagesArt = () => {
  let cols = "";
  CV.languages.forEach(({ code, level }, i) => {
    const cx = 120 + i * 117.5, n = LEVEL_PIPS[level];
    let pips = "";
    for (let p = 0; p < 5; p += 1) pips += `<rect class="${p < n ? "f-acc" : "s-faint"}" x="${cx - 45 + p * 19}" y="316" width="12" height="12"${p < n ? "" : ' fill="none"'}/>`;
    cols += `<text class="art-code${i > 1 ? " art-code--dim" : ""}" x="${cx}" y="168" text-anchor="middle">${code.toUpperCase()}</text>${pips}`;
  });
  return svg(710, 462, `
  <path class="s-faint" d="${corners(710, 462, 40, 22)}"/>
  <path class="s-mid" d="M90 92H620"/>
  ${cols}
  <path class="s-mid" d="M90 412H620"/>
  <path class="s-faint" d="${ticks(90, 620, 412, 10, 5)}"/>`);
};
var frontendArt = () => svg(333, 217, `
  <path class="s-faint" d="${corners(333, 217, 12, 12)}"/>
  <rect class="f-steel" x="30" y="22" width="64" height="6" rx="3" opacity=".7"/>
  <rect class="f-faint" x="30" y="33" width="118" height="5" rx="2.5"/>
  <rect class="s-acc" x="30" y="46" width="74" height="24" rx="12"/>
  <rect class="f-acc" x="48" y="56" width="38" height="4" rx="2"/>
  <path class="f-white" d="M92 60l0 18 5-4.5 3.8 8.5 3.4-1.5-3.8-8.3 6.8 0z"/>
  <rect class="s-steel" x="124" y="48" width="42" height="20" rx="10"/>
  <circle class="f-acc" cx="156" cy="58" r="7"/>
  <path class="s-mid" d="M188 58H302"/>
  <path class="s-acc" d="M188 58H240" stroke-width="2"/>
  <circle class="f-white" cx="240" cy="58" r="5.5"/>
  <rect class="f-accm s-acc" x="30" y="142" width="46" height="42" rx="5"/>
  <rect class="s-mid" x="88" y="142" width="46" height="42" rx="5"/>
  <circle class="s-steel" cx="111" cy="159" r="8"/><path class="s-steel" d="M99 176H123"/>
  <rect class="s-mid" x="146" y="142" width="46" height="42" rx="5"/>
  <path class="s-steel" d="M156 156H182M156 164H174M156 172H180"/>
  <rect class="s-mid" x="204" y="142" width="46" height="42" rx="5" stroke-dasharray="3 3"/>
  <rect class="s-faint" x="262" y="142" width="40" height="42" rx="5" stroke-dasharray="3 3"/>`);
var protecsolArt = () => {
  let cards = "";
  for (let i = 0; i < 8; i += 1) {
    const x = 104 + i % 4 * 78, y = 232 + Math.floor(i / 4) * 54;
    cards += `<rect class="s-mid" x="${x}" y="${y}" width="68" height="44" rx="3"/><rect class="f-steel" x="${x + 8}" y="${y + 9}" width="30" height="4" rx="2" opacity=".75"/><rect class="f-faint" x="${x + 8}" y="${y + 19}" width="46" height="3" rx="1.5"/><rect class="${i === 2 ? "f-acc" : "f-faint"}" x="${x + 8}" y="${y + 29}" width="12" height="6" rx="1"/>`;
  }
  let rows = "";
  for (let i = 0; i < 5; i += 1) rows += `<rect class="f-faint" x="426" y="${244 + i * 17}" width="150" height="3" rx="1.5"/><rect class="${i === 0 ? "f-acc" : "f-steel"}" x="426" y="${251 + i * 17}" width="${100 - i * 12}" height="3" rx="1.5" opacity="${i === 0 ? 1 : 0.5}"/>`;
  return svg(710, 462, `
  <rect class="s-mid" x="88" y="46" width="534" height="368" rx="8"/>
  <path class="s-mid" d="M88 78H622"/>
  <circle class="f-steel" cx="106" cy="62" r="3.5" opacity=".6"/><circle class="f-steel" cx="120" cy="62" r="3.5" opacity=".6"/><circle class="f-steel" cx="134" cy="62" r="3.5" opacity=".6"/>
  <rect class="s-faint" x="214" y="53" width="282" height="18" rx="9"/>
  <text class="art-url" x="355" y="66" text-anchor="middle">protecsolkartingcup.com</text>
  <rect class="f-acc" x="104" y="92" width="26" height="9" rx="1.5"/>
  <path class="s-steel" d="M470 96H488M504 96H522M538 96H556M572 96H604"/>
  <rect class="f-faint" x="104" y="116" width="518" height="62" opacity=".55"/>
  <rect class="f-white" x="120" y="128" width="150" height="9" rx="2"/>
  <rect class="f-steel" x="120" y="144" width="96" height="5" rx="2.5" opacity=".7"/>
  <rect class="s-acc" x="120" y="156" width="64" height="14" rx="2"/>
  <path class="s-mid" d="M104 198H622"/>
  <rect class="f-acc" x="104" y="206" width="38" height="12" rx="6"/>
  <rect class="s-steel" x="148" y="206" width="44" height="12" rx="6"/><rect class="s-steel" x="198" y="206" width="38" height="12" rx="6"/><rect class="s-steel" x="242" y="206" width="46" height="12" rx="6"/><rect class="s-steel" x="294" y="206" width="52" height="12" rx="6"/>
  ${cards}
  ${rows}
  <path class="s-mid" d="M418 232V340"/>`);
};
var mapArt = () => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of CIRCUIT_PATH) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const k = Math.min(540 / (maxX - minX), 292 / (maxY - minY));
  const ox = (710 - (maxX - minX) * k) / 2, oy = (462 - (maxY - minY) * k) / 2 - 14;
  const at = ([x, y]) => [ox + (x - minX) * k, oy + (y - minY) * k];
  const pts = CIRCUIT_PATH.filter((_, i) => i % 2 === 0 || i === CIRCUIT_PATH.length - 1).map(at);
  const d = (list2) => list2.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const lit = Math.round(pts.length * 0.62);
  const head = pts[lit];
  const flag = at(CIRCUIT_PATH[0]);
  const marks = CIRCUIT_MARKERS.map((m) => {
    const [x, y] = at([m.x, m.y]);
    return `<path class="s-mid" d="M${(x - 5).toFixed(1)} ${y.toFixed(1)}h10M${x.toFixed(1)} ${(y - 5).toFixed(1)}v10"/>`;
  }).join("");
  let grid = "";
  for (let x = 76; x < 710; x += 76) grid += `M${x} 40V422`;
  for (let y = 78; y < 462; y += 76) grid += `M40 ${y}H670`;
  return svg(710, 462, `
  <defs><mask id="tlp-quiet"><rect width="710" height="462" fill="#fff"/><rect x="250" y="203" width="210" height="56" fill="#000"/></mask></defs>
  <path class="s-faint" d="${grid}" stroke-dasharray="3 7" opacity=".7"/>
  <path class="s-faint" d="${corners(710, 462, 40, 22)}"/>
  <circle class="s-faint" cx="355" cy="231" r="128"/>
  <circle class="s-faint" cx="355" cy="231" r="196" opacity=".6"/>
  <g mask="url(#tlp-quiet)">
    <path class="s-steel" d="${d(pts)}Z"/>
    <path class="s-acc" d="${d(pts.slice(0, lit + 1))}" stroke-width="2.5"/>
    ${marks}
    <path class="s-mid" d="M${(flag[0] - 1).toFixed(1)} ${(flag[1] - 9).toFixed(1)}v18"/>
    <circle class="s-acc" cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="12" opacity=".5"/>
    <circle class="f-acc" cx="${head[0].toFixed(1)}" cy="${head[1].toFixed(1)}" r="4.5"/>
  </g>
  <path class="s-mid" d="M92 112H114M103 101V123M596 96H618M607 85V107M552 176H568M560 168V184"/>`);
};
var list = (cls, items) => `<ul class="${cls}">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
var skillsArt = () => `
  <div class="tl__skills">
    ${list("tl__skills-core", CV.core)}
    <div class="tl__skills-bottom">
      <p class="tl__skills-label" data-i18n="timeline.skills.through"></p>
      ${list("tl__skills-more", CV.learned)}
    </div>
  </div>`;
var toolsArt = () => `
  <div class="tl__skills">
    ${list("tl__skills-core", CV.tools)}
    <div class="tl__skills-bottom">
      <p class="tl__skills-label" data-i18n="timeline.tools.also"></p>
      ${list("tl__skills-more", CV.alsoTools)}
    </div>
  </div>`;

// src/blocks/timeline/index.js
var ROW_HEIGHT = { side: 217, centre: 462 };
var PARALLAX = { plate: { side: 60, centre: 20 }, copy: 110 };
var TOP_PAD = 169;
var MARK_RISE = 50;
var RAIL_SOLID = 98;
var RAIL_GAP = 4;
var RAIL_DASH = 6;
var MARK_SIZE = 9;
var MARK_SIZE_NARROW = 20;
var cqw = (px) => `${(px / 1440 * 100).toFixed(4)}cqw`;
var ROWS = [
  { k: "r1", frame: "centre", art: studiesArt, img: true },
  { k: "r2", frame: "side", align: "right", art: skillsArt, id: "skills" },
  { k: "r3", frame: "centre", art: languagesArt, img: true },
  { k: "r4", frame: "side", align: "left", art: frontendArt, img: true },
  { k: "r5", frame: "centre", art: protecsolArt, img: true, shot: true },
  { k: "r6", frame: "side", align: "right", art: toolsArt },
  { k: "r7", frame: "centre", art: mapArt, img: true }
];
var heights = ROWS.map((r) => ROW_HEIGHT[r.frame]);
var RAIL_HEIGHT = TOP_PAD + heights.reduce((a, b) => a + b, 0);
var REST2 = TOP_PAD + heights.slice(0, -1).reduce((a, b) => a + b, 0) + heights[heights.length - 1] / 2 - MARK_RISE;
var strings5 = {
  en: {
    "timeline.head1": "from learning",
    "timeline.head2": "to building",
    "timeline.listLabel": "The path so far",
    "timeline.r1.label": "studies",
    "timeline.r1.lead": "Learning by building.",
    "timeline.r1.body": "Enric studies DAW (Web Application Development) and plans to continue into DAM. He picks up new technologies quickly and likes finding logical, efficient solutions to technical problems.",
    "timeline.r1.alt": "Roadmap drawn as a diagram: DAW now, DAM planned next, on a grid",
    "timeline.r2.label": "skills",
    "timeline.r3.label": "languages",
    "timeline.r3.lead": "Five languages.",
    "timeline.r3.body": "Spanish and Catalan are native, English is C1, Italian is upper-intermediate and French intermediate.",
    "timeline.r3.alt": "Five language codes \u2014 ES, CA, EN, IT and FR \u2014 each above a row of level markers, the fullest for Spanish and Catalan",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Sketch of interface components: a button, a toggle, a slider and a row of cards",
    "timeline.r5.label": "protecsol",
    "timeline.r5.lead": "A project built for a real championship.",
    "timeline.r5.body": "Protecsol Karting Cup is the featured project: a full-stack site \u2014 database, PHP backend, React and TypeScript frontend, and SEO \u2014 for an amateur karting championship.",
    "timeline.r5.alt": "Stylised wireframe of the Protecsol Karting Cup website: a calendar and standings",
    "timeline.r5.shotAlt": "Protecsol Karting Cup website",
    "timeline.r6.label": "tools",
    "timeline.r7.label": "next",
    "timeline.r7.lead": "What's next.",
    "timeline.r7.body": "An internship to contribute from the first day and keep learning, then DAM on the way to a full-stack profile. New projects will be added here as they become official.",
    "timeline.r7.alt": "A stylised circuit map seen from above, with one lap lit in red",
    "timeline.skills.through": "learned on projects",
    "timeline.tools.also": "and also",
    "timeline.art.now": "now",
    "timeline.art.planned": "planned"
  },
  es: {
    "timeline.head1": "de aprender",
    "timeline.head2": "a construir",
    "timeline.listLabel": "Trayectoria hasta ahora",
    "timeline.r1.label": "estudios",
    "timeline.r1.lead": "Aprender construyendo.",
    "timeline.r1.body": "Enric estudia DAW (Desarrollo de Aplicaciones Web) y piensa seguir con DAM. Aprende tecnolog\xEDas nuevas con facilidad y le gusta encontrar soluciones l\xF3gicas y eficientes a los problemas t\xE9cnicos.",
    "timeline.r1.alt": "Hoja de ruta dibujada como diagrama: DAW ahora y DAM previsto despu\xE9s, sobre una cuadr\xEDcula",
    "timeline.r2.label": "habilidades",
    "timeline.r3.label": "idiomas",
    "timeline.r3.lead": "Cinco idiomas.",
    "timeline.r3.body": "Espa\xF1ol y catal\xE1n son nativos, el ingl\xE9s es C1, el italiano es de nivel intermedio-alto y el franc\xE9s, intermedio.",
    "timeline.r3.alt": "Cinco c\xF3digos de idioma \u2014ES, CA, EN, IT y FR\u2014, cada uno sobre una fila de marcadores de nivel, la m\xE1s llena la del espa\xF1ol y el catal\xE1n",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Boceto de componentes de interfaz: un bot\xF3n, un interruptor, un deslizador y una fila de tarjetas",
    "timeline.r5.label": "protecsol",
    "timeline.r5.lead": "Un proyecto para un campeonato real.",
    "timeline.r5.body": "Protecsol Karting Cup es el proyecto destacado: una web full-stack \u2014base de datos, backend en PHP, frontend en React y TypeScript, y SEO\u2014 para un campeonato de karting amateur.",
    "timeline.r5.alt": "Esquema estilizado de la web de Protecsol Karting Cup: un calendario y las clasificaciones",
    "timeline.r5.shotAlt": "Web de Protecsol Karting Cup",
    "timeline.r6.label": "herramientas",
    "timeline.r7.label": "siguiente",
    "timeline.r7.lead": "Lo que viene.",
    "timeline.r7.body": "Unas pr\xE1cticas donde aportar desde el primer d\xEDa y seguir aprendiendo, y despu\xE9s DAM para avanzar hacia un perfil full-stack. Los nuevos proyectos se ir\xE1n a\xF1adiendo aqu\xED cuando sean oficiales.",
    "timeline.r7.alt": "Un mapa estilizado de un circuito visto desde arriba, con una vuelta iluminada en rojo",
    "timeline.skills.through": "aprendido en proyectos",
    "timeline.tools.also": "y tambi\xE9n",
    "timeline.art.now": "ahora",
    "timeline.art.planned": "previsto"
  },
  ca: {
    "timeline.head1": "d'aprendre",
    "timeline.head2": "a construir",
    "timeline.listLabel": "Traject\xF2ria fins ara",
    "timeline.r1.label": "estudis",
    "timeline.r1.lead": "Aprendre construint.",
    "timeline.r1.body": "L'Enric estudia DAW (Desenvolupament d'Aplicacions Web) i pensa continuar amb DAM. Apr\xE8n tecnologies noves amb facilitat i li agrada trobar solucions l\xF2giques i eficients als problemes t\xE8cnics.",
    "timeline.r1.alt": "Full de ruta dibuixat com a diagrama: DAW ara i DAM previst despr\xE9s, sobre una quadr\xEDcula",
    "timeline.r2.label": "habilitats",
    "timeline.r3.label": "idiomes",
    "timeline.r3.lead": "Cinc idiomes.",
    "timeline.r3.body": "Castell\xE0 i catal\xE0 s\xF3n natius, l'angl\xE8s \xE9s C1, l'itali\xE0 \xE9s de nivell intermedi-alt i el franc\xE8s, intermedi.",
    "timeline.r3.alt": "Cinc codis d'idioma \u2014ES, CA, EN, IT i FR\u2014, cadascun sobre una fila de marcadors de nivell, la m\xE9s plena la del castell\xE0 i el catal\xE0",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Esb\xF3s de components d'interf\xEDcie: un bot\xF3, un interruptor, un lliscador i una fila de targetes",
    "timeline.r5.label": "protecsol",
    "timeline.r5.lead": "Un projecte per a un campionat real.",
    "timeline.r5.body": "Protecsol Karting Cup \xE9s el projecte destacat: un lloc web full-stack \u2014base de dades, backend en PHP, frontend en React i TypeScript, i SEO\u2014 per a un campionat de karting amateur.",
    "timeline.r5.alt": "Esquema estilitzat del lloc web de Protecsol Karting Cup: un calendari i les classificacions",
    "timeline.r5.shotAlt": "Lloc web de Protecsol Karting Cup",
    "timeline.r6.label": "eines",
    "timeline.r7.label": "seg\xFCent",
    "timeline.r7.lead": "El que ve.",
    "timeline.r7.body": "Unes pr\xE0ctiques on aportar des del primer dia i continuar aprenent, i despr\xE9s DAM per avan\xE7ar cap a un perfil full-stack. Els nous projectes s'aniran afegint aqu\xED quan siguin oficials.",
    "timeline.r7.alt": "Un mapa estilitzat d'un circuit vist des de dalt, amb una volta il\xB7luminada en vermell",
    "timeline.skills.through": "apr\xE8s en projectes",
    "timeline.tools.also": "i tamb\xE9",
    "timeline.art.now": "ara",
    "timeline.art.planned": "previst"
  }
};
var rowHTML = (r, i) => `
  <li class="tl__row tl__row--${r.frame}${r.align ? ` tl__row--${r.align}` : ""} ${i % 2 ? "is-odd" : "is-even"}" data-row="${i}"${r.id ? ` id="${r.id}" data-align="center"` : ""}>
    <div class="tl__layer tl__layer--plate" data-layer-plate>
      <div class="tl__plate" data-plate>
        <div class="tl__fill"><div class="tl__slot" data-slot><div class="tl__art"${r.img ? ` role="img" data-i18n-attr="aria-label:timeline.${r.k}.alt"` : ""} data-art>${r.art()}</div></div></div>
        <svg class="tl__outline" viewBox="0 0 710.995 462.995" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${PLATE_OUTLINE}"/></svg>
        <span class="tl__year" data-year data-i18n="timeline.${r.k}.label"></span>
      </div>
    </div>${r.frame === "centre" ? `
    <div class="tl__layer tl__layer--copy" data-layer-copy><div class="tl__copy"><p class="tl__copy-text" data-copy><b data-i18n="timeline.${r.k}.lead"></b> <span data-i18n="timeline.${r.k}.body"></span></p></div></div>` : ""}
  </li>`;
function mount3(slot) {
  slot.innerHTML = markup_default3.replace("__PLATE_CLIP__", PLATE_CLIP);
  const root = slot.querySelector("[data-timeline]");
  const rowsEl = root.querySelector("[data-rows]");
  rowsEl.innerHTML = ROWS.map(rowHTML).join("");
  applyDom(root);
  const parts = [];
  const timers = /* @__PURE__ */ new Set();
  const offs = [];
  const soft = reduced();
  parts.push(mountDissolve(root, { carry: "light" }));
  const head = root.querySelector("[data-head]");
  const lines = [...root.querySelectorAll(".tl__line-text")];
  const headCtrls = lines.map((el, i) => revealText(el, { by: "words", stagger: 130, delay: i * 260, gap: 0.28, config: CFG.REVEAL, mode: "once", view: false }));
  const stop = rise(root.querySelector(".tl__stop"), { from: { opacity: 0, y: "0.3em" }, to: { opacity: 1, y: "0em" }, config: CFG.REVEAL, delay: 130 * 3 + 110, mode: "once", view: false });
  parts.push(...headCtrls, stop);
  parts.push(inView(head, { once: true, onChange: (on) => {
    if (!on) return;
    headCtrls.forEach((c) => c.enable(true));
    stop.enable(true);
  } }));
  const railEl = root.querySelector("[data-rail]");
  const rsvg = railEl.querySelector("svg");
  const solid = rsvg.querySelector(".tl__track--solid");
  const dash = rsvg.querySelector(".tl__track--dash");
  const thread = rsvg.querySelector(".tl__thread");
  const marker = rsvg.querySelector(".tl__marker");
  const narrowQuery = window.matchMedia("(max-width: 1023px)");
  let rest = REST2, run = 0, progress = 0;
  const drawRail = () => {
    thread.setAttribute("height", String(Math.max(0, run)));
    const side = narrowQuery.matches ? MARK_SIZE_NARROW : MARK_SIZE;
    marker.setAttribute("x", String(-side / 2));
    marker.setAttribute("y", String(-side / 2));
    marker.setAttribute("width", String(side));
    marker.setAttribute("height", String(side));
    marker.setAttribute("transform", `translate(8 ${run}) rotate(${run / rest * 1800})`);
  };
  const layoutRail = () => {
    const origin = narrowQuery.matches ? TOP_PAD : 0;
    rest = REST2 - origin;
    rsvg.setAttribute("viewBox", `0 0 16 ${RAIL_HEIGHT - origin}`);
    solid.setAttribute("y2", String(RAIL_SOLID));
    dash.setAttribute("y1", String(RAIL_SOLID + RAIL_GAP));
    dash.setAttribute("y2", String(rest));
    dash.setAttribute("stroke-dasharray", `${RAIL_DASH} ${RAIL_DASH}`);
    run = progress * rest;
    drawRail();
  };
  layoutRail();
  narrowQuery.addEventListener("change", layoutRail);
  offs.push(() => narrowQuery.removeEventListener("change", layoutRail));
  parts.push(scrollTrigger({ el: railEl, start: "top center", end: "bottom bottom", config: CFG.TRIGGER, smoothing: true, onUpdate: (_raw, smooth2) => {
    progress = smooth2;
    run = smooth2 * rest;
    drawRail();
  } }));
  const rowEls = [...rowsEl.querySelectorAll(".tl__row")];
  const hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
  rowEls.forEach((row, i) => {
    const spec = ROWS[i];
    const layerPlate = row.querySelector("[data-layer-plate]");
    const layerCopy = row.querySelector("[data-layer-copy]");
    const slotEl = row.querySelector("[data-slot]");
    const plate = row.querySelector("[data-plate]");
    const yearEl = row.querySelector("[data-year]");
    const copyEl = row.querySelector("[data-copy]");
    if (!soft) {
      const travel = PARALLAX.plate[spec.frame];
      parts.push(scrollTrigger({
        el: row,
        start: "top bottom",
        end: "bottom top",
        smoothing: false,
        onUpdate: (p) => {
          layerPlate.style.top = cqw((1 - 2 * p) * travel);
          if (layerCopy) layerCopy.style.top = cqw((1 - 2 * p) * PARALLAX.copy);
        }
      }));
      parts.push(scrollTrigger({ el: row, start: "top bottom", end: "top center", smoothing: false, onUpdate: (p) => {
        slotEl.style.top = `${-10 + 10 * p}%`;
      } }));
    }
    const year = revealText(yearEl, { by: "letters", stagger: 26, config: CFG.YEAR, gap: 0.3, mode: "forward", view: false });
    parts.push(year);
    const settle = new Motion({ o: 1 }, (v) => {
      yearEl.style.opacity = v.o >= 0.999 ? "" : String(v.o);
    });
    parts.push({ destroy: () => settle.destroy() });
    const copy = copyEl ? rise(copyEl, { from: { opacity: 0, y: "0.75rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.COPY, delay: 220, mode: "once", view: false }) : null;
    if (copy) parts.push(copy);
    parts.push(inView(row, {
      rootMargin: "0% 0% -25% 0%",
      once: true,
      onChange: (on) => {
        if (!on) return;
        year.enable(true);
        copy?.enable(true);
        if (spec.frame === "centre") {
          const id = setTimeout(() => {
            timers.delete(id);
            soft ? settle.set({ o: 0.4 }) : settle.to({ o: 0.4 }, CFG.YEAR_SETTLE);
          }, 2200);
          timers.add(id);
        }
      }
    }));
    const dim = (on) => {
      if (!hoverable.matches) return;
      rowEls.forEach((r) => r.classList.toggle("is-dim", on && r !== row));
    };
    const onEnter = () => dim(true), onLeave = () => dim(false);
    plate.addEventListener("pointerenter", onEnter);
    plate.addEventListener("pointerleave", onLeave);
    offs.push(() => {
      plate.removeEventListener("pointerenter", onEnter);
      plate.removeEventListener("pointerleave", onLeave);
    });
  });
  let shotImg = null;
  const shotRow = rowEls[ROWS.findIndex((r) => r.shot)];
  (PKC_SCREENS_SHIPPED ? tryImage(PKC_SCREENS.calendar).then((img) => img || tryImage(PKC_SCREENS.home)) : Promise.resolve(null)).then((img) => {
    if (!img || !shotRow || !root.isConnected) return;
    const art = shotRow.querySelector("[data-art]");
    art.removeAttribute("role");
    art.removeAttribute("aria-label");
    art.removeAttribute("data-i18n-attr");
    art.textContent = "";
    img.className = "tl__shot";
    img.alt = t("timeline.r5.shotAlt");
    art.append(img);
    shotImg = img;
  });
  offs.push(onLang(() => {
    if (shotImg) shotImg.alt = t("timeline.r5.shotAlt");
  }));
  return {
    el: root,
    destroy() {
      timers.forEach(clearTimeout);
      offs.forEach((off) => off());
      parts.forEach((p) => p.destroy?.());
      slot.innerHTML = "";
    }
  };
}

// src/blocks/paddock/index.js
var paddock_exports = {};
__export(paddock_exports, {
  mount: () => mount4,
  strings: () => strings6
});

// src/blocks/paddock/markup.html
var markup_default4 = '<section class="pd" data-paddock aria-labelledby="pd-title">\n  <div class="pd__band" aria-hidden="true"></div>\n  <div class="pd__fig-layer" data-fig-layer>\n    <figure class="pd__figure" data-figure role="img" data-i18n-attr="aria-label:paddock.fig.alt">__FIGURE__</figure>\n  </div>\n  <div class="pd__melt" aria-hidden="true"></div>\n\n  <h2 class="pd__head" id="pd-title">\n    <span class="pd__line"><span class="pd__line-text" data-i18n="paddock.head1"></span></span>\n    <span class="pd__line"><span class="pd__line-text" data-i18n="paddock.head2"></span><span class="pd__stop" aria-hidden="true">.</span></span>\n  </h2>\n\n  <div class="pd__intro">\n    <p class="pd__report" data-report data-i18n="paddock.report"></p>\n    <div class="pd__action" data-action>\n      __CTA__\n      <p class="pd__credit" data-i18n="paddock.credit"></p>\n    </div>\n  </div>\n\n  <div class="pd__frame pd__frame--meet bracket" data-frame="meet" aria-hidden="true">__BRACKETS__</div>\n  <div class="pd__meet" data-meet>\n    <p class="pd__meet-name">__PKC_NAME__</p>\n    <p>__PKC_PLACE__</p>\n    <p data-i18n="paddock.meet.season"></p>\n  </div>\n\n  <div class="pd__frame pd__frame--stats bracket" data-frame="stats" aria-hidden="true">__BRACKETS__</div>\n  <ul class="pd__stats" data-stats>__STATS__</ul>\n\n  <ol class="pd__strip" data-strip data-i18n-attr="aria-label:paddock.strip.label">\n    __LINKS__\n    __CARDS__\n    __MARKERS__\n    <span class="pd__live-bracket" data-live-bracket aria-hidden="true">__LIVE_BRACKETS__</span>\n  </ol>\n</section>\n';

// src/contours.js
var LINE_SCALE = 3.8;
var LINE_COUNT = 2.5;
var WAVE_AMOUNT = 0.37;
var WAVE_SPEED = 1.66;
var LINE_OPACITY = 0.85;
var CELLS = 96;
var FRAME_MS = 24;
var field = (x, y, t2) => {
  let f = Math.sin(x * 1 + t2 * 0.6) * 0.5;
  f += Math.sin(y * 0.85 - t2 * 0.45) * 0.45;
  f += Math.sin((x + y) * 0.65 + t2 * 0.35) * 0.35;
  f += Math.sin((x - y) * 0.95 - t2 * 0.55) * 0.25;
  return f * 0.5 + 0.5;
};
function mountContours(host, { colorVar = "--paddock-contour" } = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "contours";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  host.prepend(canvas);
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, ratio = 1, colour = "", start = performance.now(), values = null;
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return false;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * ratio), bh = Math.round(h * ratio);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    width = w;
    height = h;
    colour = token(colorVar);
    return true;
  };
  const draw = (now) => {
    if (!width && !size()) return;
    const t2 = (now - start) / 1e3 * WAVE_SPEED;
    const cols = width >= height ? CELLS : Math.max(8, Math.round(CELLS * width / height));
    const rows = Math.max(8, Math.round(cols * height / width));
    const stepX = width / cols, stepY = height / rows, aspect = width / height;
    if (!values || values.length !== (cols + 1) * (rows + 1)) values = new Float32Array((cols + 1) * (rows + 1));
    for (let j = 0; j <= rows; j += 1) {
      for (let i = 0; i <= cols; i += 1) {
        const nx = (i / cols * 2 - 1) * aspect * LINE_SCALE;
        const ny = (j / rows * 2 - 1) * LINE_SCALE;
        const qx = nx + Math.sin(ny * 0.8 + t2 * 0.7) * WAVE_AMOUNT;
        const qy = ny + Math.cos(nx * 0.7 - t2 * 0.6) * WAVE_AMOUNT;
        values[j * (cols + 1) + i] = field(qx, qy, t2) * LINE_COUNT;
      }
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.globalAlpha = LINE_OPACITY;
    ctx.beginPath();
    for (let level = 0.5; level < LINE_COUNT; level += 1) {
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          const a = values[j * (cols + 1) + i], b = values[j * (cols + 1) + i + 1];
          const c = values[(j + 1) * (cols + 1) + i + 1], d = values[(j + 1) * (cols + 1) + i];
          const index = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          if (index === 0 || index === 15) continue;
          const x0 = i * stepX, y0 = j * stepY;
          const top = [x0 + stepX * ((level - a) / (b - a)), y0];
          const right = [x0 + stepX, y0 + stepY * ((level - b) / (c - b))];
          const bottom = [x0 + stepX * ((level - d) / (c - d)), y0 + stepY];
          const left = [x0, y0 + stepY * ((level - a) / (d - a))];
          const seg = (p, q) => {
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(q[0], q[1]);
          };
          switch (index) {
            case 1:
            case 14:
              seg(left, bottom);
              break;
            case 2:
            case 13:
              seg(bottom, right);
              break;
            case 3:
            case 12:
              seg(left, right);
              break;
            case 4:
            case 11:
              seg(top, right);
              break;
            case 6:
            case 9:
              seg(top, bottom);
              break;
            case 7:
            case 8:
              seg(left, top);
              break;
            case 5:
              seg(left, top);
              seg(bottom, right);
              break;
            case 10:
              seg(left, bottom);
              seg(top, right);
              break;
          }
        }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  let loop = null;
  const unResize = onResize(() => {
    if (size()) draw(performance.now());
  });
  if (reduced()) {
    requestAnimationFrame(() => {
      if (size()) draw(start + 4e3);
    });
  } else {
    loop = loopInView(canvas, draw, () => FRAME_MS);
  }
  return { el: canvas, destroy() {
    loop?.destroy();
    unResize();
    canvas.remove();
  } };
}

// src/blocks/paddock/figure.js
var bars = (items) => items.map(([x, y, w, h, cls = "pf-bar"]) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(3, h / 2)}"/>`).join("");
var calendarRows = () => Array.from({ length: 5 }, (_, i) => {
  const y = 450 + i * 54, hot = i === 2;
  return `<g>
    <rect class="${hot ? "pf-line pf-line--hot" : "pf-line"}" x="84" y="${y}" width="246" height="44"/>
    <rect class="${hot ? "pf-fill" : "pf-line"}" x="96" y="${y + 11}" width="22" height="22"/>
    ${bars([[132, y + 12, 96 - i % 3 * 12, 7], [132, y + 27, 62, 5]])}
    <rect class="pf-line" x="268" y="${y + 13}" width="50" height="18" rx="9"/>
  </g>`;
}).join("");
var rankingRows = () => Array.from({ length: 6 }, (_, j) => {
  const y = 450 + j * 40, hot = j === 0;
  return `<g>
    ${hot ? `<rect class="pf-wash" x="352" y="${y}" width="264" height="34"/><rect class="pf-fill" x="352" y="${y}" width="3" height="34"/>` : `<line class="pf-hair" x1="352" y1="${y + 34}" x2="616" y2="${y + 34}"/>`}
    <circle class="${hot ? "pf-dot pf-dot--hot" : "pf-dot"}" cx="374" cy="${y + 17}" r="9"/>
    ${bars([[396, y + 13, 132 - j * 14, 7], [572, y + 13, 30, 7, hot ? "pf-bar pf-bar--hot" : "pf-bar"]])}
  </g>`;
}).join("");
var phoneCards = () => [0, 1, 2].map((n) => {
  const y = 466 + n * 80;
  return `<g>
    <rect class="${n === 0 ? "pf-line pf-line--hot" : "pf-line"}" x="36" y="${y}" width="118" height="66"/>
    <rect class="${n === 0 ? "pf-fill" : "pf-line"}" x="46" y="${y + 10}" width="20" height="20"/>
    ${bars([[74, y + 12, 62, 6], [74, y + 24, 40, 5], [46, y + 44, 90, 5], [46, y + 54, 56, 5]])}
  </g>`;
}).join("");
var figureSVG = () => `
<svg class="pd__art" viewBox="0 0 946 816" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <g transform="translate(16 0)">
  <rect class="pf-echo" x="76" y="104" width="570" height="760"/>
  <rect class="pf-win" x="60" y="120" width="580" height="740"/>
  <rect class="pf-chrome" x="60" y="120" width="580" height="34"/>
  <circle class="pf-chip" cx="80" cy="137" r="4"/><circle class="pf-chip" cx="95" cy="137" r="4"/><circle class="pf-chip" cx="110" cy="137" r="4"/>
  <rect class="pf-line" x="136" y="127" width="300" height="20" rx="10"/>
  <text class="pf-t pf-muted" x="152" y="141" font-size="11">${esc(PKC.host)}</text>

  <rect class="pf-fill" x="84" y="176" width="14" height="14"/>
  <text class="pf-d pf-white" x="106" y="188" font-size="13" letter-spacing="1">${esc(PKC.name.toUpperCase())}</text>
  ${bars([[470, 180, 34, 6], [518, 180, 34, 6], [566, 180, 34, 6]])}

  <text class="pf-d pf-white" x="84" y="262" font-size="54">PROTECSOL</text>
  <text class="pf-d pf-accent" x="84" y="318" font-size="54">KARTING CUP</text>
  <g transform="translate(404 214) scale(2.5)"><path class="pf-circuit" d="${TRACK_MINI_D}"/></g>
  ${bars([[84, 342, 250, 7], [84, 358, 190, 7]])}
  <path class="pf-line pf-line--hot" d="M84.5 380.5H214.5V404L207 411.5H84.5Z"/>

  <text class="pf-t pf-muted" x="84" y="436" font-size="11" letter-spacing="1.6">CALENDAR</text>
  <text class="pf-t pf-muted" x="352" y="436" font-size="11" letter-spacing="1.6">RANKINGS</text>
  ${calendarRows()}
  ${rankingRows()}
  </g>

  <g class="pf-phone">
  <rect class="pf-win" x="20" y="392" width="150" height="440" rx="24"/>
  <rect class="pf-chrome-line" x="20" y="392" width="150" height="440" rx="24"/>
  <rect class="pf-chip" x="75" y="404" width="40" height="6" rx="3"/>
  <text class="pf-d pf-accent" x="36" y="442" font-size="13" letter-spacing="1">PKC</text>
  ${bars([[36, 452, 70, 4]])}
  ${phoneCards()}
  </g>
</svg>`;

// src/blocks/paddock/index.js
var FORMAT = PKC.format.split(" ")[0].toLowerCase();
var strings6 = {
  en: {
    "paddock.head1": "inside the",
    "paddock.head2": "project",
    "paddock.report": "Protecsol Karting Cup is the amateur karting championship of Empuriabrava. Calendar, registration and live rankings live in one site that Enric built end to end \u2014 database, PHP backend, React frontend and SEO.",
    "paddock.cta": "visit live site",
    "paddock.credit": "Shown with the permission of Protecsol.",
    "paddock.fig.alt": "Illustration of the Protecsol Karting Cup website layout",
    "paddock.fig.altShot": "Screenshot of the Protecsol Karting Cup website",
    "paddock.meet.season": `${PKC.season} season`,
    "paddock.stat.gp": "grands prix",
    "paddock.stat.class": "classifications",
    "paddock.stat.cc": "engine cc",
    "paddock.stat.format": "format",
    "paddock.strip.label": "How the live site is made",
    "paddock.s1.top": "back end",
    "paddock.s1.name": "Database",
    "paddock.s1.bottom": "data layer",
    "paddock.s2.top": "back end",
    "paddock.s2.name": "PHP",
    "paddock.s2.bottom": "MVC",
    "paddock.s3.top": "online",
    "paddock.s3.name": "Live site",
    "paddock.s3.bottom": `${PKC.season} season`,
    "paddock.s4.top": "front end",
    "paddock.s4.name": "Interface",
    "paddock.s4.bottom": "React \xB7 TypeScript",
    "paddock.s5.top": "visibility",
    "paddock.s5.name": "SEO",
    "paddock.s5.bottom": "search & sharing"
  },
  es: {
    "paddock.head1": "dentro del",
    "paddock.head2": "proyecto",
    "paddock.report": "Protecsol Karting Cup es el campeonato amateur de karting de Empuriabrava. El calendario, las inscripciones y las clasificaciones en directo est\xE1n en una sola web que Enric ha desarrollado de principio a fin: base de datos, backend en PHP, frontend en React y SEO.",
    "paddock.cta": "visitar la web",
    "paddock.credit": "Se muestra con permiso de Protecsol.",
    "paddock.fig.alt": "Ilustraci\xF3n del dise\xF1o de la web de Protecsol Karting Cup",
    "paddock.fig.altShot": "Captura de la web de Protecsol Karting Cup",
    "paddock.meet.season": `temporada ${PKC.season}`,
    "paddock.stat.gp": "grandes premios",
    "paddock.stat.class": "clasificaciones",
    "paddock.stat.cc": "cc de motor",
    "paddock.stat.format": "formato",
    "paddock.strip.label": "C\xF3mo est\xE1 hecha la web",
    "paddock.s1.top": "back end",
    "paddock.s1.name": "Base de datos",
    "paddock.s1.bottom": "capa de datos",
    "paddock.s2.top": "back end",
    "paddock.s2.name": "PHP",
    "paddock.s2.bottom": "MVC",
    "paddock.s3.top": "online",
    "paddock.s3.name": "Web publicada",
    "paddock.s3.bottom": `temporada ${PKC.season}`,
    "paddock.s4.top": "front end",
    "paddock.s4.name": "Interfaz",
    "paddock.s4.bottom": "React \xB7 TypeScript",
    "paddock.s5.top": "visibilidad",
    "paddock.s5.name": "SEO",
    "paddock.s5.bottom": "buscadores y redes"
  },
  ca: {
    "paddock.head1": "dins del",
    "paddock.head2": "projecte",
    "paddock.report": "Protecsol Karting Cup \xE9s el campionat amateur de karting d'Empuriabrava. El calendari, les inscripcions i les classificacions en directe s\xF3n en un sol lloc web que l'Enric ha desenvolupat de dalt a baix: base de dades, backend en PHP, frontend en React i SEO.",
    "paddock.cta": "visita el lloc web",
    "paddock.credit": "Es mostra amb perm\xEDs de Protecsol.",
    "paddock.fig.alt": "Il\xB7lustraci\xF3 del disseny del lloc web de Protecsol Karting Cup",
    "paddock.fig.altShot": "Captura del lloc web de Protecsol Karting Cup",
    "paddock.meet.season": `temporada ${PKC.season}`,
    "paddock.stat.gp": "grans premis",
    "paddock.stat.class": "classificacions",
    "paddock.stat.cc": "cc de motor",
    "paddock.stat.format": "format",
    "paddock.strip.label": "Com est\xE0 fet el lloc web",
    "paddock.s1.top": "back end",
    "paddock.s1.name": "Base de dades",
    "paddock.s1.bottom": "capa de dades",
    "paddock.s2.top": "back end",
    "paddock.s2.name": "PHP",
    "paddock.s2.bottom": "MVC",
    "paddock.s3.top": "en l\xEDnia",
    "paddock.s3.name": "Lloc web publicat",
    "paddock.s3.bottom": `temporada ${PKC.season}`,
    "paddock.s4.top": "front end",
    "paddock.s4.name": "Interf\xEDcie",
    "paddock.s4.bottom": "React \xB7 TypeScript",
    "paddock.s5.top": "visibilitat",
    "paddock.s5.name": "SEO",
    "paddock.s5.bottom": "cercadors i xarxes"
  }
};
var ICONS = {
  flag: '<path d="M7 27V4M7 5h16l-3 5.5 3 5.5H7"/>',
  trophy: '<path d="M10 5h11v7a5.5 5.5 0 0 1-11 0V5ZM10 8H5v2a4 4 0 0 0 5 3.8M21 8h5v2a4 4 0 0 1-5 3.8M15.5 17.5V23M12 23h7M10.5 26.5h10"/>',
  gauge: '<path d="M4 22a11.5 11.5 0 1 1 23 0M15.5 22l5-8"/><circle cx="15.5" cy="22" r="1.6"/>',
  bars: '<path d="M5 26V16h5v10M13 26V8h5v18M21 26V12h5v14M3 26.5h25"/>'
};
var STATS = [
  { icon: "flag", key: "paddock.stat.gp", fig: String(PKC.gp) },
  { icon: "trophy", key: "paddock.stat.class", fig: String(PKC.classifications.length) },
  { icon: "gauge", key: "paddock.stat.cc", fig: String(PKC.engineCc) },
  { icon: "bars", key: "paddock.stat.format", fig: FORMAT }
];
var statsHTML = () => STATS.map((s, i) => `
  <li class="pd__stat" data-stat="${i}">${i ? '<span class="pd__rule" data-rule></span>' : ""}
    <div class="pd__stat-row" data-row>
      <svg class="pd__icon" viewBox="0 0 31 31" aria-hidden="true" focusable="false">${ICONS[s.icon]}</svg>
      <div class="pd__stat-text"><span class="pd__stat-label" data-i18n="${s.key}"></span><span class="pd__stat-fig" data-fig="${i}"></span></div>
    </div>
  </li>`).join("");
var STOPS = [{ x: 397 }, { x: 561 }, { x: 725, live: true }, { x: 896 }, { x: 1055 }];
var LINKS = [{ x: 416, w: 126 }, { x: 580, w: 128 }, { x: 743, w: 136 }, { x: 914, w: 124 }];
var CARD_W = 136;
var linksHTML = () => LINKS.map((l, i) => `<li class="pd__link" aria-hidden="true" data-link="${i}" style="--x:${l.x};--w:${l.w}"></li>`).join("");
var cardsHTML = () => STOPS.map((s, i) => `
  <li class="pd__card${s.live ? " pd__card--live" : ""}${i < 2 ? " pd__card--extra" : ""}" data-card="${i}" style="--x:${s.x};--w:${CARD_W}">
    <span class="pd__round" data-i18n="paddock.s${i + 1}.top"></span>
    <b class="pd__name" data-name data-i18n="paddock.s${i + 1}.name"></b>
    <span class="pd__date" data-i18n="paddock.s${i + 1}.bottom"></span>
  </li>`).join("");
var markersHTML = () => STOPS.map((s, i) => `<li class="pd__mark${s.live ? " pd__mark--live" : ""}" aria-hidden="true" data-mark="${i}" style="--x:${s.x}">
  <svg viewBox="0 0 11 11" focusable="false">${s.live ? '<circle class="pd__pulse" data-pulse cx="5.5" cy="5.5" r="5.5" opacity="0"/><circle class="pd__disc" cx="5.5" cy="5.5" r="5.5"/>' : '<circle class="pd__ring" cx="5.5" cy="5.5" r="5"/>'}</svg></li>`).join("");
var cqw2 = (px) => `${(px / 1440 * 100).toFixed(4)}cqw`;
var MARK_DASH = 11.45;
function mount4(slot) {
  slot.innerHTML = markup_default4.replace("__FIGURE__", figureSVG()).replace("__CTA__", ctaHTML({ href: PKC.url, labelKey: "paddock.cta", ext: true })).replaceAll("__BRACKETS__", bracketCorners()).replace("__LIVE_BRACKETS__", bracketCorners()).replace("__PKC_NAME__", esc(PKC.name)).replace("__PKC_PLACE__", esc(PKC.place)).replace("__STATS__", statsHTML()).replace("__LINKS__", linksHTML()).replace("__CARDS__", cardsHTML()).replace("__MARKERS__", markersHTML());
  const root = slot.querySelector("[data-paddock]");
  applyDom(root);
  const parts = [];
  const offs = [];
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const FWD = "forward";
  parts.push(mountContours(root, { colorVar: "--paddock-contour" }));
  parts.push(mountDissolve(root, { carry: "dark" }));
  qa(".pd__line-text").forEach((el, i) => parts.push(revealText(el, { by: "words", stagger: 130, config: CFG.REVEAL, delay: i * 130, mode: FWD })));
  parts.push(rise(q(".pd__stop"), { from: { opacity: 0, y: "0.3em" }, to: { opacity: 1, y: "0em" }, config: CFG.REVEAL, delay: 130 + 110, mode: FWD }));
  parts.push(revealText(q("[data-report]"), { by: "words", stagger: 30, config: { tension: 150, friction: 24 }, gap: 0.22, delay: 2 * 130 + 90, mode: FWD }));
  parts.push(rise(q("[data-action]"), { from: { opacity: 0, y: "0.75rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.REVEAL, delay: 2 * 130 + 260, mode: FWD }));
  const fade = { from: { opacity: 0 }, to: { opacity: 1 }, config: CFG.REVEAL, mode: FWD };
  parts.push(rise(q('[data-frame="meet"]'), { ...fade, delay: 320 }));
  parts.push(rise(q("[data-meet]"), { from: { opacity: 0, y: "0.75rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.REVEAL, delay: 410, mode: FWD }));
  parts.push(rise(q('[data-frame="stats"]'), { ...fade, delay: 460 }));
  qa("[data-stat]").forEach((li, i) => {
    const base = 460 + i * 90;
    const rule = li.querySelector("[data-rule]");
    if (rule) parts.push(rise(rule, { from: { scaleX: 0 }, to: { scaleX: 1 }, config: CFG.REVEAL, delay: base, mode: FWD }));
    parts.push(rise(li.querySelector("[data-row]"), { from: { opacity: 0, y: "0.75rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.REVEAL, delay: base + 40, mode: FWD }));
    parts.push(revealText(li.querySelector("[data-fig]"), { by: "letters", stagger: 24, config: CFG.FIGURE, gap: 0.3, text: STATS[i].fig, delay: base + 120, mode: FWD }));
  });
  const layer = q("[data-fig-layer]");
  if (!reduced()) {
    parts.push(scrollTrigger({ el: root, start: "top bottom", end: "bottom top", smoothing: false, onUpdate: (p) => {
      layer.style.top = cqw2(-48 * p);
    } }));
  }
  const figure2 = q("[data-figure]");
  (PKC_SCREENS_SHIPPED ? tryImage(PKC_SCREENS.home) : Promise.resolve(null)).then((img) => {
    if (!img || !root.isConnected) return;
    figure2.innerHTML = '<div class="pd__shot"><div class="pd__shot-bar" aria-hidden="true"><i></i><i></i><i></i></div></div>';
    img.alt = "";
    figure2.querySelector(".pd__shot").append(img);
    figure2.setAttribute("data-i18n-attr", "aria-label:paddock.fig.altShot");
    figure2.setAttribute("aria-label", t("paddock.fig.altShot"));
  });
  const strip = q("[data-strip]");
  const ctrls = [];
  qa("[data-link]").forEach((el, i) => ctrls.push(rise(el, { from: { scaleX: 0 }, to: { scaleX: 1 }, config: CFG.REVEAL, delay: 560 + i * 90, mode: "once", view: false })));
  qa("[data-card]").forEach((el, i) => {
    const base = 560 + i * 90;
    ctrls.push(rise(el, { from: { opacity: 0, y: "0.5rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.REVEAL, delay: base, mode: "once", view: false }));
    ctrls.push(rise(el.querySelector("[data-name]"), { from: { opacity: 0, y: "0.3em" }, to: { opacity: 1, y: "0em" }, config: CFG.NAME, delay: base + 110, mode: "once", view: false }));
  });
  qa("[data-mark]").forEach((el, i) => ctrls.push(rise(el, { from: { opacity: 0 }, to: { opacity: 1 }, config: CFG.REVEAL, delay: 560 + i * 90 + 60, mode: "once", view: false })));
  ctrls.push(rise(q("[data-live-bracket]"), { from: { opacity: 0 }, to: { opacity: 1 }, config: CFG.REVEAL, delay: 560 + 5 * 90, mode: "once", view: false }));
  parts.push(...ctrls);
  parts.push(inView(strip, { rootMargin: "0% 0% -20% 0%", once: true, onChange: (on) => {
    if (on) ctrls.forEach((c) => c.enable(true));
  } }));
  if (!reduced()) {
    const links = qa("[data-link]");
    const pulse = q("[data-pulse]");
    parts.push(loopInView(strip, (time) => {
      const f = time % 5200 / 5200;
      links.forEach((el, i) => {
        el.style.backgroundPositionX = `calc(var(--u) * ${(i < 2 ? 1 : -1) * f * MARK_DASH})`;
      });
      const v = easeOutQuad(time % 3200 / 3200);
      pulse.setAttribute("r", String(5.5 + v * 5.5 * 3.4));
      pulse.setAttribute("opacity", String(0.5 * (1 - v) * (1 - v)));
    }, () => 16));
  }
  return {
    el: root,
    destroy() {
      offs.forEach((off) => off());
      parts.forEach((p) => p.destroy?.());
      slot.innerHTML = "";
    }
  };
}

// src/blocks/footer/index.js
var footer_exports = {};
__export(footer_exports, {
  mount: () => mount5,
  strings: () => strings7
});

// src/blocks/footer/markup.html
var markup_default5 = '<section class="ft" data-footer aria-label="Footer">\n  <div class="ft__panel" data-panel>\n    <div class="ft__fig-layer" data-fig-layer aria-hidden="false">\n      <div class="ft__fig" data-fig>\n        <img class="ft__plate" src="__FIGURE__" alt="" data-fig-img data-i18n-attr="alt:footer.fig.alt" width="1536" height="1024" decoding="async">\n      </div>\n    </div>\n  </div>\n\n  <svg class="ft__logo" data-logo viewBox="0 0 106 24" role="img" data-i18n-attr="aria-label:footer.logo.alt" focusable="false">\n    <text x="0" y="19.5" textLength="106" lengthAdjust="spacingAndGlyphs">ENRIC MASELLA</text>\n  </svg>\n\n  <h2 class="ft__head" data-head>\n    <span class="ft__line"><span class="ft__line-text" data-i18n="footer.head1"></span></span>\n    <span class="ft__line"><span class="ft__line-text" data-i18n="footer.head2"></span><span class="ft__stop" aria-hidden="true">.</span></span>\n  </h2>\n\n  <nav class="ft__nav" data-nav data-i18n-attr="aria-label:footer.nav.label">__NAV__</nav>\n\n  <div class="ft__copy" data-copy>\n    <p class="ft__rights" data-i18n="footer.copy"></p>\n    <p class="ft__credit" data-i18n="footer.credit"></p>\n  </div>\n  <div class="ft__cta" data-cta>__CTA__</div>\n  <div class="ft__social" data-social>\n    <a class="ft__social-link" href="https://github.com/enricmasella" target="_blank" rel="noopener noreferrer" data-i18n="footer.social.github"></a>\n    <a class="ft__social-link" href="https://www.instagram.com/enric.masella/" target="_blank" rel="noopener noreferrer" data-i18n="footer.social.inst"></a>\n  </div>\n</section>\n';

// src/blocks/footer/index.js
var strings7 = {
  en: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "keep",
    "footer.head2": "building",
    "footer.nav.label": "Page sections",
    "footer.fig.alt": "Stylised 3D portrait of Enric Masella",
    "footer.copy": `\xA9 ${SITE.year} Enric Masella. All rights reserved.`,
    "footer.credit": "Made in Girona.",
    "footer.cta": "say hello",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  },
  es: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "sigue",
    "footer.head2": "construyendo",
    "footer.nav.label": "Secciones de la p\xE1gina",
    "footer.fig.alt": "Retrato 3D estilizado de Enric Masella",
    "footer.copy": `\xA9 ${SITE.year} Enric Masella. Todos los derechos reservados.`,
    "footer.credit": "Hecho en Girona.",
    "footer.cta": "escr\xEDbeme",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  },
  ca: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "segueix",
    "footer.head2": "construint",
    "footer.nav.label": "Seccions de la p\xE0gina",
    "footer.fig.alt": "Retrat 3D estilitzat d'Enric Masella",
    "footer.copy": `\xA9 ${SITE.year} Enric Masella. Tots els drets reservats.`,
    "footer.credit": "Fet a Girona.",
    "footer.cta": "escriu-me",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  }
};
var navHTML = () => NAV.map((n) => `<a class="ft__link" href="#${n.id}"><span class="ft__link-text" data-i18n="${n.key}"></span><svg class="ft__link-arrow" viewBox="0 0 13.7071 10.7071" aria-hidden="true" focusable="false"><path d="M0 5.35355H13M8 10.3536L13 5.35355L8 0.353553" fill="none"/></svg></a>`).join("");
function mount5(slot) {
  slot.innerHTML = markup_default5.replace("__FIGURE__", footer_figure_default).replace("__NAV__", navHTML()).replace("__CTA__", ctaHTML({ href: `mailto:${SITE.email}`, labelKey: "footer.cta" })).replace("https://github.com/enricmasella", esc(SITE.github)).replace("https://www.instagram.com/enric.masella/", esc(SITE.instagramUrl));
  const root = slot.querySelector("[data-footer]");
  applyDom(root);
  const parts = [];
  const q = (s) => root.querySelector(s);
  const qa = (s) => [...root.querySelectorAll(s)];
  const FWD = "forward";
  parts.push(mountContours(q("[data-panel]"), { colorVar: "--footer-contour" }));
  parts.push(rise(q("[data-logo]"), { from: { opacity: 0 }, to: { opacity: 1 }, config: CFG.REVEAL, delay: 120, mode: FWD }));
  qa(".ft__line-text").forEach((el, i) => parts.push(revealText(el, { by: "words", stagger: 130, config: CFG.REVEAL, delay: i * 130, mode: FWD })));
  parts.push(rise(q(".ft__stop"), { from: { opacity: 0, y: "0.3em" }, to: { opacity: 1, y: "0em" }, config: CFG.REVEAL, delay: 130 + 110, mode: FWD }));
  qa(".ft__link-text").forEach((el, i) => parts.push(revealText(el, { by: "letters", stagger: 22, config: CFG.ROW, gap: 0.2, delay: 260 + i * 80, mode: FWD })));
  const lift = { from: { opacity: 0, y: "0.75rem" }, to: { opacity: 1, y: "0rem" }, config: CFG.REVEAL, mode: FWD };
  parts.push(rise(q("[data-copy]"), { ...lift, delay: 640 }));
  parts.push(rise(q("[data-cta]"), { ...lift, delay: 720 }));
  parts.push(rise(q("[data-social]"), { ...lift, delay: 800 }));
  const layer = q("[data-fig-layer]");
  if (!reduced()) {
    layer.style.top = "4.1667cqw";
    parts.push(scrollTrigger({ el: root, start: "top bottom", end: "bottom bottom", smoothing: false, onUpdate: (p) => {
      layer.style.top = `${((1 - p) * 4.1667).toFixed(4)}cqw`;
    } }));
  }
  return {
    el: root,
    destroy() {
      parts.forEach((p) => p.destroy?.());
      slot.innerHTML = "";
    }
  };
}

// src/blocks/_manifest.js
var blocks = { season: season_exports, timeline: timeline_exports, paddock: paddock_exports, footer: footer_exports };

// src/main.js
history.scrollRestoration = "manual";
window.scrollTo(0, 0);
registerStrings(strings);
registerStrings(strings2);
registerStrings(strings3);
for (const block of Object.values(blocks)) if (block) registerStrings(block.strings);
initI18n();
var rootEl = document.documentElement;
var fitRoot = () => {
  const w = window.innerWidth;
  rootEl.style.fontSize = w > 1920 ? `${16 * w / 1920}px` : "";
};
fitRoot();
window.addEventListener("resize", fitRoot, { passive: true });
startLenis();
var slotOf = (name) => document.querySelector(`[data-slot="${name}"]`);
var mounted = [mount(slotOf("hero"))];
for (const [name, block] of Object.entries(blocks)) {
  if (block) mounted.push(block.mount(slotOf(name)));
}
mountDock();
var RECEDE_SCALE = 0.9;
var RECEDE_SHADE = 0.55;
var phone = window.matchMedia("(max-width: 639px)");
var layers = Array.from(document.querySelectorAll("[data-stack] > .layer"));
var pinned = layers.slice(0, -1).map((layer, i) => ({
  layer,
  // what recedes: a layer whose content is a pinned stage of its own (Selected work) names it; otherwise it is the layer's whole inner box
  inner: layer.querySelector("[data-recede]") || layer.querySelector(":scope > .inner"),
  shade: layer.querySelector(":scope > .shade"),
  next: layers[i + 1]
}));
var apply = () => {
  const view = window.innerHeight || 1;
  const shrink = phone.matches ? 0 : 1 - RECEDE_SCALE;
  for (const { layer, inner, shade, next } of pinned) {
    if (layer.classList.contains("layer--flow")) {
      inner.style.transform = "";
      inner.style.willChange = "";
      inner.style.visibility = "visible";
      shade.style.opacity = "0";
      continue;
    }
    const p = Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / view));
    inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : "";
    inner.style.willChange = p > 0 && shrink > 0 ? "transform" : "";
    shade.style.opacity = `${RECEDE_SHADE * p}`;
    inner.style.visibility = p >= 1 ? "hidden" : "visible";
  }
};
var queued = 0;
var schedule = () => {
  if (!queued) queued = requestAnimationFrame(() => {
    queued = 0;
    apply();
  });
};
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule, { passive: true });
apply();
document.addEventListener("click", (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const id = a.getAttribute("href").slice(1);
  const target = id && document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  scrollToTarget(target);
});
window.__portfolio = { mounted };

