/* The AI section: a terminal that lists the tools (pick one, read what it is for) and the flow of how a change gets made. */
(() => {
"use strict";
const NK = window.NK, D = NK.DATA, I = NK.I, $ = NK.$, $$ = NK.$$, B = NK.B;
const { clamp, smooth, FLAT, reduced } = NK;

NK.boot(() => {
  /* ───────── the terminal ───────── */
  const term = $(".it--term"), rows = $$("[data-tool]", term), list = $("[data-tools]", term), out = $(".ai__out", term), nameEl = $("[data-out-name]", term), descEl = $("[data-out-desc]", term), cmd = $("[data-cmd]", term), head = $(".ai__head", term);
  let cur = -1, lastUser = -1e9, lastAuto = 0, printed = FLAT || reduced, typed = FLAT || reduced;
  const select = (i, { user = false, animate = true } = {}) => {
    if (i === cur || i < 0 || i >= D.tools.length) return;
    if (user) lastUser = performance.now();
    const first = cur < 0; cur = i;
    rows.forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    out.setAttribute("aria-labelledby", "ai-tab-" + i);
    const key = "ai." + D.tools[i][1] + ".desc"; descEl.dataset.i18n = key; nameEl.textContent = D.tools[i][0];
    if (first || !animate || reduced) descEl.textContent = I.t(key); else NK.decode.play(descEl, I.t(key), { duration: 440 });
  };
  select(0, { animate: false });
  list.addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (b) select(+b.dataset.tool, { user: true }); });
  list.addEventListener("keydown", (e) => {
    const n = D.tools.length; let next = cur;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (cur + 1) % n; else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (cur - 1 + n) % n; else if (e.key === "Home") next = 0; else if (e.key === "End") next = n - 1; else return;
    e.preventDefault(); select(next, { user: true }); rows[next].focus();
  });

  /* ───────── the flow: idea → draft → review → validate → ship; what is rejected goes back to draft ───────── */
  const flow = $(".it--flow"), steps = $$("[data-step]", flow), wires = $$("[data-wire]", flow), backs = $$("[data-back]", flow), note = $("[data-backnote]", flow);
  const SEQ = [0, 1, 2, 3, -1, 1, 2, 3, 4], HOLD = 3; let lastIdx = -2, seen = new Set();
  const paint = (idx) => {
    if (idx === lastIdx) return; if (idx !== lastIdx + 1) seen = new Set(SEQ.slice(0, idx).filter((v) => v >= 0)); lastIdx = idx;
    const s = idx < SEQ.length ? SEQ[idx] : 4; if (s >= 0) seen.add(s);
    steps.forEach((el, i) => { el.classList.toggle("on", i === s); el.classList.toggle("seen", seen.has(i) && i !== s); });
    wires.forEach((w, j) => w.classList.toggle("on", seen.has(j) && seen.has(j + 1)));
    const rej = idx < SEQ.length && SEQ[idx] === -1; backs.forEach((b) => b.classList.toggle("on", rej)); note.classList.toggle("on", rej);
  };
  if (FLAT || reduced) { steps.forEach((el) => el.classList.add("seen")); wires.forEach((w) => w.classList.add("on")); }

  if (FLAT) return;
  term.classList.add("live"); flow.classList.add("live");
  if (!printed) { rows.forEach((b) => { b.style.opacity = "0"; }); out.style.opacity = "0"; head.style.opacity = "0"; cmd.textContent = ""; }
  NK.onFrame((t) => {
    const now = performance.now(), zT = B.Z.aiB + B.cam, zF = B.Z.aiC + B.cam;
    /* the terminal prints itself as it comes near: the command, then a row at a time, then the output of the selected tool */
    if (!printed && zT > -700 && zT < 300) {
      const k = smooth(-600, -170, zT), n = rows.length + 2;
      rows.forEach((b, i) => { b.style.opacity = clamp(k * n - i - 0.4).toFixed(2); }); out.style.opacity = clamp(k * n - rows.length - 0.4).toFixed(2); head.style.opacity = clamp(k * n).toFixed(2);
      if (!typed && k > 0.15) { typed = true; NK.decode.play(cmd, I.t("ai.term.cmd"), { duration: 420 }); }
      if (k >= 1) printed = true;
    }
    if (!reduced && zT > -420 && zT < 420 && now - lastUser > 6000 && now - lastAuto > 3400) { lastAuto = now; select((cur + 1) % D.tools.length); }
    if (zF > -600 && zF < 300 && !reduced) paint(Math.floor((t * 1.15) % (SEQ.length + HOLD)));
  });
});
})();
