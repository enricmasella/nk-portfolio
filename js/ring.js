/* The ring of the work section: when the four cards have flown by, the same four projects become a spinning ring of characters.
   Click (or tap) a zone and it explains itself: on wide screens in a column on the left, on tall ones in a sheet at the bottom. */
(() => {
"use strict";
const NK = window.NK, D = NK.DATA, I = NK.I, $ = NK.$, $$ = NK.$$, B = NK.B, esc = NK.esc;
const { clamp, lerp, smooth, hash, FLAT, reduced } = NK;

NK.boot(() => {
  if (FLAT) return;
  const cv = $("#ring"), labs = $("#rlabs"), det = $("#rdet"), root = document.documentElement, Q = NK.quality;
  const field = new NK.Field(cv, { cw: 8, ch: 14, size: 12 });
  const setCells = () => field.set(NK.tall ? { cw: 7, ch: 12, size: 11 } : { cw: 8, ch: 14, size: 12 });
  setCells(); NK.onMode(setCells);
  const NS = D.projects.length, TAU = 6.2832, SEG = TAU / NS, GAP = 0.07, A0 = 1.12, B0 = -0.38;
  const TH = [], PH = []; for (let a = 0; a < TAU; a += 0.07) TH.push([Math.sin(a), Math.cos(a)]); for (let a = 0; a < TAU; a += 0.025) PH.push(a);
  const D0 = Math.atan2(Math.sin(A0) * Math.sin(B0), Math.cos(B0));            // the phase that faces left, for the tilt the ring has
  const E0 = Math.atan2(Math.sin(A0) * Math.cos(B0), -Math.sin(B0));           // the phase that faces down
  let ZB = new Float32Array(1), SB = new Int8Array(1), spin = 0.6, sel = -1, hovSeg = -1, hovUi = -1, shown = false, cursorOn = false, fk = 0, lastHv = -9, rev = 0, lastRev = 0, open = 0, labW = [], sheetH = 0;

  /* ───────── markup: labels around the ring, the core, and the explanation (column or sheet) ───────── */
  const dot = (p) => (p.live ? '<i class="dot live"></i>' : '<i class="dot dim"></i>');
  const status = (p) => (p.live ? I.t("status.live", { year: 2026 }) : I.t("status.dev"));
  labs.innerHTML = '<div class="rcore" data-core><b data-i18n="nav.work"></b><span data-ncore></span></div>' + D.projects.map((p, k) => '<button type="button" class="rlab" data-k="' + k + '">' + dot(p) + esc(p.name.toLowerCase()) + "</button>").join("");
  I.applyDom(labs);
  const lab = $$(".rlab", labs), core = $("[data-core]", labs), ncore = $("[data-ncore]", labs);
  const tabs = (cur) => '<div class="rtabs" role="group" aria-label="' + esc(I.t("paddock.tabs.label")) + '">' + D.projects.map((p, k) => '<button type="button" class="rtab" data-k="' + k + '" aria-pressed="' + (k === cur) + '">' + dot(p) + esc(p.name.toLowerCase()) + "</button>").join("") + "</div>";
  const detailHTML = (k) => {
    const p = D.projects[k];
    return '<div class="rdet__top"><p class="tag"><span class="tag__s">' + dot(p) + esc(status(p)) + '</span><span data-i18n="proj.' + p.id + '.type"></span><span data-i18n="proj.' + p.id + '.area"></span></p><button type="button" class="rdet__x" data-x><span aria-hidden="true">&times;</span> <span data-i18n="ring.close"></span></button></div>' +
      '<h3 class="rdet__h" data-name>' + esc(p.name) + "</h3>" + tabs(k) + B.detailBody(p, true);
  };
  const labels = () => { ncore.textContent = I.t("ring.core", { n: NS }); lab.forEach((b, k) => { b.setAttribute("aria-label", I.t("ring.open", { name: D.projects[k].name })); b.classList.toggle("on", k === sel); }); labW = lab.map((b) => b.offsetWidth || 120); };
  const render = (animate) => {
    rev++;
    if (sel < 0) det.innerHTML = '<p class="tag"><i class="dot live"></i><span data-i18n="nav.work"></span><span>' + esc(I.t("ring.core", { n: NS })) + '</span></p><h2 class="rdet__h" data-i18n="' + (NK.touch ? "ring.titleTap" : "ring.title") + '"></h2><p class="rdet__p" data-i18n="ring.hint"></p>' + tabs(-1) + '<p class="tag rdet__hov" data-hov>&nbsp;</p>';
    else det.innerHTML = detailHTML(sel);
    I.applyDom(det); B.fmtNums(det); det.scrollTop = 0; labels();
    if (sel >= 0 && animate) { const h = det.querySelector("[data-name]"), s = det.querySelector("[data-sum]"); if (h) NK.decode.play(h, h.textContent, { duration: 650 }); if (s) NK.decode.play(s, s.textContent, { duration: 950, delay: 120 }); }
    sheetH = det.offsetHeight;
  };
  const select = (k) => { sel = k === sel ? -1 : k; render(true); };
  render(false);
  det.addEventListener("click", (e) => { const t = e.target.closest(".rtab"), x = e.target.closest("[data-x]"); if (t) select(+t.dataset.k); else if (x) { sel = -1; render(true); } });
  det.addEventListener("pointerover", (e) => { const t = e.target.closest(".rtab"); hovUi = t ? +t.dataset.k : -1; });
  det.addEventListener("pointerleave", () => { hovUi = -1; });
  labs.addEventListener("click", (e) => { const b = e.target.closest(".rlab"); if (b) select(+b.dataset.k); });
  lab.forEach((b) => { b.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") hovUi = +b.dataset.k; }); b.addEventListener("pointerleave", () => { hovUi = -1; }); });
  addEventListener("click", (e) => {
    if (B.ringVis < 0.6 || !(e.target instanceof Element) || e.target.closest("a,button,.rdet,.dock,.hud-top")) return;
    const k = segAt(e.clientX, e.clientY); if (k >= 0) select(k);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && sel >= 0 && B.ringVis > 0.5) { sel = -1; render(true); } });
  I.onLang(() => render(false));
  NK.onResize(() => { labels(); sheetH = det.offsetHeight; }); NK.onMode(() => { labels(); sheetH = det.offsetHeight; });

  /* the point of the ring under a position: the segment recorded in the cells that were drawn */
  const segAt = (px, py) => {
    const cols = field.cols, rows = field.rows, cw = field.cw, ch = field.ch, c0 = (px / cw) | 0, r0 = (py / ch) | 0, rad = NK.touch ? 3 : 1, lim = NK.touch ? ch * 3.2 : ch * 1.3; let best = -1, bd = 1e9;
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) { const c = c0 + dc, r = r0 + dr; if (c < 0 || c >= cols || r < 0 || r >= rows) continue; const i = r * cols + c; if (SB[i] < 0) continue; const d = Math.hypot((c + 0.5) * cw - px, (r + 0.5) * ch - py); if (d < bd) { bd = d; best = SB[i]; } }
    return bd < lim ? best : -1;
  };

  /* ───────── the torus of characters (lit by a light, z-buffered), four segments ───────── */
  const drawRing = (T, vis, hv) => {
    const cols = field.cols, rows = field.rows; if (ZB.length !== cols * rows) { ZB = new Float32Array(cols * rows); SB = new Int8Array(cols * rows); }
    ZB.fill(0); SB.fill(-1); field.D.fill(0); field.Hot.fill(0);
    const W = NK.VW, H = NK.VH, cw = field.cw, ch = field.ch, e = smooth(0, 1, vis), tall = NK.tall, m = NK.mouse;
    /* wide: the ring on the right, the text on the left. tall: the ring in the middle; with a project open it shrinks upward and turns that zone toward the sheet */
    const R0 = tall ? lerp(Math.min(W * 0.42, H * 0.27), Math.min(W * 0.3, H * 0.15), open) : Math.min(W * 0.25, H * 0.36), Rpx = R0 * lerp(0.62, 1, e), K2 = 9, K1 = (Rpx * K2) / 3;
    const cx = tall ? W * 0.5 : W * 0.7, cy = tall ? lerp(H * 0.4, H * 0.215, open) : H * 0.52;
    const A = A0 + 0.1 * Math.sin(T * 0.4) + (tall ? 0 : m.ny * 0.14), Bb = B0 + 0.1 * Math.sin(T * 0.31) + (tall ? 0 : m.nx * 0.2), sA = Math.sin(A), cA = Math.cos(A), sB = Math.sin(Bb), cB = Math.cos(Bb), Ls = cB * cA - sA;
    for (let pi = 0; pi < PH.length; pi++) {
      const base = PH[pi], k = Math.floor(base / SEG), fr = base / SEG - k; if (fr < GAP || fr > 1 - GAP) continue;
      const on = k === sel || k === hv, dim = (sel >= 0 || hv >= 0) && !on, ph = base + spin, sp = Math.sin(ph), cp = Math.cos(ph);
      const cpB = cB * cp + sA * sB * sp, spB = sB * cp - sA * cB * sp, zq = cA * sp, Lc = cp * sB - cA * sp - cB * sA * sp;
      for (let ti = 0; ti < TH.length; ti++) {
        const st = TH[ti][0], ct = TH[ti][1], rx = 2.15 + 0.85 * ct, ry = 0.85 * st;
        const x = rx * cpB - ry * cA * sB, y = rx * spB + ry * cA * cB, z = K2 + rx * zq + ry * sA, ooz = 1 / z;
        const c = ((cx + K1 * ooz * x) / cw) | 0, r = ((cy - K1 * ooz * y) / ch) | 0; if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const i = r * cols + c; if (ooz <= ZB[i]) continue; ZB[i] = ooz; SB[i] = k;
        let d = 0.06 + 0.94 * Math.pow(clamp((ct * Lc + st * Ls + 0.3) / 1.7), 1.25); if (dim) d *= 0.55; if (on) { d = Math.max(d, 0.5); field.Hot[i] = 1; } field.D[i] = d;
      }
    }
    // it forms and dissolves cell by cell, with the flickering edge
    if (vis < 1) { const tk = Math.floor(T * 5); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (field.D[i] <= 0) continue; const k = NK.morph(vis, c, r, cols, rows, 2); if (k === 0) field.D[i] = 0; else if (k === 2) { const hh = hash(c, r, tk + 13); field.D[i] = hh > 0.3 ? 0.3 + 0.62 * hash(c, r, tk + 17) : 0; field.Hot[i] = hh > 0.86 ? 1 : 0; } } }
    field.draw(0.92);
    // the labels ride on the ring, just outside it; they never leave the screen
    const yMax = tall ? (sel >= 0 ? H - 44 - sheetH - 14 : H - 190) : H - 64;
    const place = (el, k, ph, R) => { const sp = Math.sin(ph), cp = Math.cos(ph), x = R * (cB * cp + sA * sB * sp), y = R * (sB * cp - sA * cB * sp), z = K2 + cA * R * sp, hw = (labW[k] || 120) / 2 + 8;
      const px = clamp(cx + (K1 * x) / z, hw, W - hw), py = clamp(cy - (K1 * y) / z, 70, Math.max(80, yMax));
      el.style.transform = "translate3d(" + px.toFixed(1) + "px," + py.toFixed(1) + "px,0) translate(-50%,-50%)"; el.style.opacity = (0.3 + 0.7 * smooth(K2 + 2.2, K2 - 1.6, z)).toFixed(2); };
    lab.forEach((b, k) => place(b, k, (k + 0.5) * SEG + spin, 3.62));
    core.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0) translate(-50%,-50%)";
  };

  NK.onFrame((t, dt) => {
    const vis = B.ringVis, on = vis > 0.01;
    if (!on) { if (shown) { shown = false; field.clear(); for (const el of [labs, det]) { el.style.opacity = "0"; el.style.visibility = "hidden"; } det.classList.remove("on"); if (cursorOn) { cursorOn = false; root.style.cursor = ""; } } return; }
    if (!shown) { shown = true; for (const el of [labs, det]) el.style.visibility = "visible"; sheetH = det.offsetHeight; }
    labs.style.opacity = vis.toFixed(2); det.style.opacity = vis.toFixed(2); det.classList.toggle("on", vis > 0.6);
    const T = reduced ? 0 : t, m = NK.mouse;
    open += ((sel >= 0 ? 1 : 0) - open) * (1 - Math.exp(-dt * 5));
    // pointer over the ring (not over the column or a label): which zone is it? (a phone has no pointer: a tap decides)
    const overUi = !NK.touch && det.matches(":hover"); hovSeg = vis > 0.6 && !overUi && m.moved && !m.touch ? segAt(m.x, m.y) : -1;
    const hv = hovUi >= 0 ? hovUi : hovSeg, cur = hovSeg >= 0 && vis > 0.6;
    if (cur !== cursorOn) { cursorOn = cur; root.style.cursor = cur ? "pointer" : ""; }
    // the ring turns by itself, slower when a zone is under the pointer; with a project open it turns that zone toward the text (wide) or toward the sheet (tall)
    if (sel >= 0) { const tg = (NK.tall ? E0 : Math.PI + D0) - (sel + 0.5) * SEG, d = ((((tg - spin) % TAU) + TAU * 1.5) % TAU) - Math.PI; spin += d * (1 - Math.exp(-dt * 4.5)); }
    else if (!reduced) spin += dt * 0.45 * (hovSeg >= 0 ? 0.25 : 1);
    if (hv !== lastHv || rev !== lastRev) { lastHv = hv; lastRev = rev; const h = det.querySelector("[data-hov]"); if (h) { const p = D.projects[hv]; h.innerHTML = hv >= 0 ? "&gt; " + esc(p.name.toLowerCase()) + " &middot; " + esc(I.t("proj." + p.id + ".type")) + " &middot; " + esc(p.live ? I.t("hero.p1.live") : I.t("hero.p1.dev")) : "&nbsp;"; } det.querySelectorAll(".rtab").forEach((b) => b.classList.toggle("hov", +b.dataset.k === hv)); }
    if (fk++ % Q.skip) return;
    drawRing(T, vis, hv);
  });
});
})();
