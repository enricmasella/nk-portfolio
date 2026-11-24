/* Start: the world is built once the photo and the fonts are in; every part then starts in order, and the stage fades in. */
(() => {
"use strict";
const NK = window.NK, I = NK.I, B = NK.B, $ = NK.$, $$ = NK.$$, root = document.documentElement;

const wireLang = () => {
  const box = $("[data-lang-switch]"); if (!box) return;
  box.innerHTML = I.LANGS.map((l) => '<button type="button" data-l="' + l + '" lang="' + l + '" aria-label="' + NK.esc(I.LANG_NAMES[l]) + '"><span aria-hidden="true">' + l + "</span></button>").join("");
  const mark = () => $$("button", box).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.l === I.getLang())));
  box.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) I.setLang(b.dataset.l); });
  mark(); I.onLang(mark);
};

(async () => {
  await NK.ready;
  const hint = $("#hint [data-i18n]"); if (hint) hint.dataset.i18n = NK.touch ? "hint.swipe" : "hint.scroll";
  B.build();
  I.applyDom();
  if (!NK.FLAT) NK.decode.init();
  for (const f of NK.boots) { try { await f(); } catch (e) { console.error(e); } }
  I.onLang(() => { B.fmtNums(); if (!NK.FLAT) NK.decode.refresh(); });
  wireLang();
  const logo = $(".logo"); if (logo) logo.addEventListener("click", (e) => { e.preventDefault(); NK.goto(0); });
  NK.openHash();
  NK.startAt = performance.now(); NK.started = true; root.dataset.ready = "1";
})();
})();
