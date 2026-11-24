/* Contact: the pixel-block "say hello" over an audio wave of characters along the bottom. */
(() => {
"use strict";
const NK = window.NK, D = NK.DATA, I = NK.I, $ = NK.$, B = NK.B;
const { clamp, smooth, hash, FLAT, reduced } = NK;

NK.boot(() => {
  const box = $(".it--contact"), el = $("[data-px]", box), cvs = $("#wave"), cp = $("[data-copy]", box);
  let svgs = [], pl = -1, clean = false, on = false, fk = 0, field = null;
  /* the pixel type has no room for a long line on a phone: words go one under the other, all at the same pixel size */
  const build = () => {
    const text = I.t("footer.cta"), words = NK.tall && /\s/.test(text.trim()) ? text.trim().split(/\s+/) : [text];
    const made = words.map((w) => NK.pixelText(w, { track: 2.6 })), wmax = Math.max(...made.map((m) => m.W));
    el.innerHTML = ""; svgs = [];
    made.forEach((m) => { const row = document.createElement("div"); row.className = "pxl"; row.style.width = ((m.W / wmax) * 100).toFixed(2) + "%"; row.style.setProperty("--ar", m.W / m.H); row.innerHTML = m.html; el.appendChild(row); svgs.push(row.firstChild); });
    pl = -1; clean = false;
    const p = FLAT ? 1 : 0; svgs.forEach((s) => NK.pixelReveal(s, p)); if (FLAT) clean = true;
  };
  build(); I.onLang(build); NK.onMode(build);

  if (cp) cp.addEventListener("click", () => {
    const done = (ok) => { cp.removeAttribute("data-i18n"); cp.textContent = I.t(ok ? "common.copied" : "common.copyFail"); setTimeout(() => { cp.setAttribute("data-i18n", "common.copy"); cp.textContent = I.t("common.copy"); }, 1700); };
    try { navigator.clipboard.writeText(D.email).then(() => done(true), () => done(false)); } catch (e) { done(false); }
  });
  if (FLAT) return;

  field = new NK.Field(cvs, { cw: 9, ch: 16, size: 13 });
  const setCells = () => field.set(NK.tall ? { cw: 11, ch: 18, size: 14 } : { cw: 9, ch: 16, size: 13 });
  setCells(); NK.onMode(setCells);

  NK.onFrame((t) => {
    const S = NK.scroll; if (!S) return; const m = NK.mouse;
    /* how present the contact stop is (0..1), and how far the pixels have arrived */
    const k = B.contactK, zc = B.Z.contact + B.cam, pr = reduced ? 1 : smooth(-950, -300, zc) * (1 - smooth(60, 380, zc));
    if (pr >= 1 && clean) { /* settled */ } else if (Math.abs(pr - pl) > 0.003 || pr < 1) { if (pr > 0 || pl !== 0) svgs.forEach((s) => NK.pixelReveal(s, pr)); pl = pr; clean = pr >= 1; }
    /* the wave */
    if (k < 0.01) { if (on) { on = false; field.clear(); cvs.style.opacity = "0"; } return; }
    on = true; cvs.style.opacity = k.toFixed(2);
    if (fk++ % NK.quality.skip) return;
    const T = reduced ? 0 : t, cols = field.cols, rows = field.rows, cw = field.cw, tk = Math.floor(T * 5), beat = 0.55 + 0.45 * Math.sin(T * 2.6), react = clamp(Math.abs(S.vel) / 2500);
    for (let c = 0; c < cols; c++) {
      /* the line: two slow sines, plus peaks that jump like a level meter, higher near the pointer and while scrolling */
      const near = Math.exp(-Math.pow(((c + 0.5) * cw - m.sx) / 280, 2)), sp = Math.pow(Math.max(0, Math.sin(c * 0.52 + T * 7.3) * Math.sin(c * 0.131 - T * 2.1)), 2) * 5 * beat * (0.55 + 1.1 * near + react);
      const y0 = rows * 0.84 + 2.4 * Math.sin(c * 0.17 + T * 0.9) + 1.6 * Math.sin(c * 0.43 - T * 0.6) - sp;
      for (let r = 0; r < rows; r++) {
        const i = r * cols + c; let d = 0, hot = 0;
        if (r < y0) { if (r > rows * 0.6 && hash(c, r, 4) > 0.985) d = 0.5; }
        else { const q = r - y0; if (q < 1) { hot = 1; d = 1; } else d = Math.max(0, 0.5 - q * 0.07) * (0.6 + 0.4 * hash(c, r, 3 + (tk & 3))); }
        field.D[i] = d; field.Hot[i] = hot;
      }
    }
    field.draw(0.78);
  });
});
})();
