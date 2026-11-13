// js/translations.js
// Sistema de idiomas e internacionalización (Català, Español, English).
//
// ÚNICA FUENTE DE TEXTOS: todo el copy visible vive en este archivo (main.js ya no lleva copias
// en línea). Para cambiar un texto, cámbialo aquí, en los tres idiomas.
// Idioma al abrir: inglés. Solo se cambia con ?lang=xx o con el selector (la elección se recuerda
// durante la sesión, no entre visitas).

export const LANGS = ["ca", "es", "en"];
export const LANG_NAMES = { ca: "Català", es: "Español", en: "English" };
export const DEFAULT_LANG = "en";

export const dict = { en: {}, es: {}, ca: {} };
const listeners = new Set();
export let lang = DEFAULT_LANG;

export function registerStrings(data) {
  const strings = typeof data === "function" ? data() : data;
  if (!strings) return;
  for (const l of LANGS) {
    if (strings[l]) Object.assign(dict[l], strings[l]);
  }
}

export function t(key, vars) {
  const s = dict[lang][key] ?? dict.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : s;
}

export const getLang = () => lang;

// Números con separador de millares según el idioma (1,203 · 1.203).
export function fmtNum(n) {
  const tag = lang === "es" ? "es-ES" : lang === "ca" ? "ca-ES" : "en-GB";
  try {
    return new Intl.NumberFormat(tag, { useGrouping: "always" }).format(n);
  } catch {
    return String(n);
  }
}

const SESSION_KEY = "em-lang-session";

export function detect() {
  // 1) ?lang=xx  2) la elección hecha en esta sesión  3) inglés. El idioma del navegador NO se usa.
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
  } catch {}
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {}
  return DEFAULT_LANG;
}

export function applyDom(root = (typeof document !== "undefined" ? document : null)) {
  if (!root) return;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el.hasAttribute("data-tr")) return;
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const i = pair.indexOf(":");
      if (i < 0) return;
      el.setAttribute(pair.slice(0, i).trim(), t(pair.slice(i + 1).trim()));
    });
  });
}

export function applyMeta() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  const set = (sel, val) => {
    const el = document.querySelector(sel);
    if (el && val) el.setAttribute("content", val);
  };
  if (dict[lang]["meta.title"]) document.title = t("meta.title");
  set('meta[name="description"]', t("meta.description"));
  set('meta[property="og:title"]', t("meta.title"));
  set('meta[property="og:description"]', t("meta.description"));
  set('meta[name="twitter:title"]', t("meta.title"));
  set('meta[name="twitter:description"]', t("meta.description"));
  set('meta[property="og:locale"]', { ca: "ca_ES", es: "es_ES", en: "en_GB" }[lang]);
}

export function setLang(next, { persist = true } = {}) {
  if (!LANGS.includes(next)) return;
  lang = next;
  if (persist && typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.setItem(SESSION_KEY, next);
    } catch {}
  }
  applyMeta();
  applyDom();
  listeners.forEach((cb) => cb(next));
}

export function onLang(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function initI18n() {
  lang = detect();
  applyMeta();
  applyDom();
}

// Orden del dock y del pie. `ai` es la sección nueva (AI Tools & Development Workflow).
export const NAV = [
  { key: "nav.work", id: "work" },
  { key: "nav.about", id: "path" },
  { key: "nav.skills", id: "skills" },
  { key: "nav.project", id: "project" },
  { key: "nav.ai", id: "ai" },
  { key: "nav.contact", id: "contact" }
];

// ─────────────────────────────────────────────────────────────────────────────
// Diccionarios de textos por sección
// ─────────────────────────────────────────────────────────────────────────────

export const strings = {
  en: {
    "meta.title": "Enric Masella — Aspiring Full-Stack Developer",
    "meta.description": "Aspiring full-stack developer in Girona. AI-augmented, human-driven, anti-AI slop. Projects: Protecsol Karting Cup (live), NK_Chess, uni and SnapRoulette.",
    "a11y.skip": "Skip to content",
    "a11y.primaryNav": "Primary",
    "a11y.language": "Language",
    "nav.work": "Work",
    "nav.about": "About",
    "nav.skills": "Skills",
    "nav.project": "Project",
    "nav.ai": "AI",
    "nav.contact": "Contact",
    "nav.github": "GitHub",
    "common.comingSoon": "Coming soon",
    "common.location": "Girona, Catalonia",
    "status.live": "live, {year}",
    "status.dev": "in development",
    "access.private": "private repo, no demo yet"
  },
  es: {
    "meta.title": "Enric Masella — Desarrollador Full-Stack en formación",
    "meta.description": "Desarrollador full-stack en formación en Girona. Con IA pero guiado por humanos, anti-AI slop. Proyectos: Protecsol Karting Cup (publicado), NK_Chess, uni y SnapRoulette.",
    "a11y.skip": "Saltar al contenido",
    "a11y.primaryNav": "Principal",
    "a11y.language": "Idioma",
    "nav.work": "Trabajo",
    "nav.about": "Sobre mí",
    "nav.skills": "Habilidades",
    "nav.project": "Proyecto",
    "nav.ai": "IA",
    "nav.contact": "Contacto",
    "nav.github": "GitHub",
    "common.comingSoon": "Próximamente",
    "common.location": "Girona, Cataluña",
    "status.live": "publicado, {year}",
    "status.dev": "en desarrollo",
    "access.private": "repo privado, sin demo por ahora"
  },
  ca: {
    "meta.title": "Enric Masella — Desenvolupador Full-Stack en formació",
    "meta.description": "Desenvolupador full-stack en formació a Girona. Amb IA però guiat per humans, anti-AI slop. Projectes: Protecsol Karting Cup (publicat), NK_Chess, uni i SnapRoulette.",
    "a11y.skip": "Salta al contingut",
    "a11y.primaryNav": "Principal",
    "a11y.language": "Idioma",
    "nav.work": "Treball",
    "nav.about": "Sobre mi",
    "nav.skills": "Habilitats",
    "nav.project": "Projecte",
    "nav.ai": "IA",
    "nav.contact": "Contacte",
    "nav.github": "GitHub",
    "common.comingSoon": "Properament",
    "common.location": "Girona, Catalunya",
    "status.live": "publicat, {year}",
    "status.dev": "en desenvolupament",
    "access.private": "repo privat, sense demo de moment"
  }
};


export const stringsHero = {
  en: {
    "hero.logoLabel": "Enric Masella — back to top",
    "hero.rowRole": "Aspiring Full-Stack Developer",
    "hero.rowAi": "AI-Augmented, Human-Driven",
    "hero.rowSlop": "Anti-AI Slop",
    "hero.p1.eyebrow": "projects",
    "hero.p1.live": "live",
    "hero.p1.dev": "in development",
    "hero.p2.eyebrow": "languages",
    "hero.lv.native": "native",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Spanish: native",
    "hero.lv.ca": "Catalan: native",
    "hero.lv.en": "English: C1",
    "hero.mail": "open to internships",
    "hero.cta": "view projects",
    "hero.photoAlt": "Photo of Enric Masella in silver sunglasses. Moving the cursor over it reveals an X-ray of the same photo."
  },
  es: {
    "hero.logoLabel": "Enric Masella — volver arriba",
    "hero.rowRole": "Desarrollador Full-Stack en formación",
    "hero.rowAi": "Aumentado con IA, guiado por humanos",
    "hero.rowSlop": "Anti-AI Slop",
    "hero.p1.eyebrow": "proyectos",
    "hero.p1.live": "publicado",
    "hero.p1.dev": "en desarrollo",
    "hero.p2.eyebrow": "idiomas",
    "hero.lv.native": "nativo",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Español: nativo",
    "hero.lv.ca": "Catalán: nativo",
    "hero.lv.en": "Inglés: C1",
    "hero.mail": "abierto a prácticas",
    "hero.cta": "ver proyectos",
    "hero.photoAlt": "Foto de Enric Masella con gafas de sol plateadas. Al mover el cursor sobre ella aparece una radiografía de la misma foto."
  },
  ca: {
    "hero.logoLabel": "Enric Masella — torna a dalt",
    "hero.rowRole": "Desenvolupador Full-Stack en formació",
    "hero.rowAi": "Augmentat amb IA, guiat per humans",
    "hero.rowSlop": "Anti-AI Slop",
    "hero.p1.eyebrow": "projectes",
    "hero.p1.live": "publicat",
    "hero.p1.dev": "en desenvolupament",
    "hero.p2.eyebrow": "idiomes",
    "hero.lv.native": "natiu",
    "hero.lv.c1": "C1",
    "hero.lv.es": "Castellà: natiu",
    "hero.lv.ca": "Català: natiu",
    "hero.lv.en": "Anglès: C1",
    "hero.mail": "obert a pràctiques",
    "hero.cta": "veure projectes",
    "hero.photoAlt": "Foto d'Enric Masella amb ulleres de sol platejades. En moure el cursor per sobre apareix una radiografia de la mateixa foto."
  }
};


export const stringsDock = {
  en: { "nav.index": "index" },
  es: { "nav.index": "inicio" },
  ca: { "nav.index": "inici" }
};


export const stringsSeason = {
  en: {
    "season.head1": "selected work",
    "season.head2": "so far",
    "season.intro": "Four projects: one live, three in development.",
    "season.index.label": "Projects",
    "season.scroll": "scroll",
    "season.k.type": "type",
    "season.k.stack": "stack",
    "season.k.access": "access",
    "season.go": "project details"
  },
  es: {
    "season.head1": "trabajo destacado",
    "season.head2": "hasta ahora",
    "season.intro": "Cuatro proyectos: uno publicado y tres en desarrollo.",
    "season.index.label": "Proyectos",
    "season.scroll": "desliza",
    "season.k.type": "tipo",
    "season.k.stack": "stack",
    "season.k.access": "acceso",
    "season.go": "ver el proyecto"
  },
  ca: {
    "season.head1": "treball destacat",
    "season.head2": "fins ara",
    "season.intro": "Quatre projectes: un de publicat i tres en desenvolupament.",
    "season.index.label": "Projectes",
    "season.scroll": "llisca",
    "season.k.type": "tipus",
    "season.k.stack": "stack",
    "season.k.access": "accés",
    "season.go": "veure el projecte"
  }
};


// Los cuatro proyectos. Misma estructura para todos: área, tipo, resumen, datos y franja.
// Solo se escribe lo que está confirmado; lo que está en desarrollo lo dice su estado.
export const stringsProjects = {
  en: {
    "stat.gp": "grands prix",
    "stat.class": "classifications",
    "stat.cc": "engine cc",
    "stat.format": "format",
    "stat.courses": "published courses",
    "stat.prep": "more in preparation",
    "stat.chapters": "chapters",
    "stat.lines": "lines",
    "stat.exercises": "exercises",
    "stat.framework": "framework",
    "stat.database": "database",
    "stat.audience": "audience",
    "stat.price": "price",
    "stat.runtime": "runtime",
    "stat.realtime": "real time",
    "stat.rooms": "rooms",
    "stat.license": "license",

    "proj.pkc.area": "web development",
    "proj.pkc.type": "championship platform",
    "proj.pkc.summary": "Protecsol Karting Cup is the amateur karting championship of Empuriabrava. Calendar, registration and live rankings live in one site that Enric built end to end — database, PHP backend, React frontend and SEO.",
    "proj.pkc.meet3": "2026 season",
    "proj.pkc.alt": "Illustration of the Protecsol Karting Cup website layout",
    "proj.pkc.strip": "How the live site is made",
    "proj.pkc.s1.top": "back end", "proj.pkc.s1.name": "Database", "proj.pkc.s1.bottom": "data layer",
    "proj.pkc.s2.top": "back end", "proj.pkc.s2.name": "PHP", "proj.pkc.s2.bottom": "MVC",
    "proj.pkc.s3.top": "online", "proj.pkc.s3.name": "Live site", "proj.pkc.s3.bottom": "2026 season",
    "proj.pkc.s4.top": "front end", "proj.pkc.s4.name": "Interface", "proj.pkc.s4.bottom": "React · TypeScript",
    "proj.pkc.s5.top": "visibility", "proj.pkc.s5.name": "SEO", "proj.pkc.s5.bottom": "search & sharing",

    "proj.chess.area": "chess education",
    "proj.chess.type": "learning platform",
    "proj.chess.summary": "A chess learning platform. Courses are built from studies and lines, and the exercises are derived from those lines and their traps. Moves are audited with Stockfish 19. Progress and XP are saved in the browser: no accounts, no backend, no videos.",
    "proj.chess.meet2": "chess platform",
    "proj.chess.alt": "Line drawing of a chess course: a board with a highlighted line and a list of exercises",
    "proj.chess.strip": "How the content is built",
    "proj.chess.s1.top": "content", "proj.chess.s1.name": "Courses", "proj.chess.s1.bottom": "studies and lines",
    "proj.chess.s2.top": "structure", "proj.chess.s2.name": "Chapters", "proj.chess.s2.bottom": "inside each course",
    "proj.chess.s3.top": "content", "proj.chess.s3.name": "Lines", "proj.chess.s3.bottom": "variations and traps",
    "proj.chess.s4.top": "practice", "proj.chess.s4.name": "Exercises", "proj.chess.s4.bottom": "from lines and traps",
    "proj.chess.s5.top": "quality", "proj.chess.s5.name": "Audit", "proj.chess.s5.bottom": "Stockfish 19",

    "proj.uni.area": "student tools",
    "proj.uni.type": "study tools",
    "proj.uni.summary": "Free tools for students taking the PAU, the Spanish university entrance exams. Made to work out grades, weightings and access marks without the spreadsheet.",
    "proj.uni.meet2": "tools for PAU students",
    "proj.uni.alt": "Line drawing of study tools: a grade calculator with input fields and a result",
    "proj.uni.strip": "Scope, in development",
    "proj.uni.fig.price": "free",
    "proj.uni.s1.name": "Grade calculation",
    "proj.uni.s2.name": "Weightings",
    "proj.uni.s3.name": "Cut-off marks",
    "proj.uni.s4.name": "Access simulator",
    "proj.uni.s5.name": "Study utilities",

    "proj.snap.area": "real-time multiplayer",
    "proj.snap.type": "guessing game",
    "proj.snap.summary": "A real-time multiplayer game: players join private rooms and try to guess who sent a photo or video before it disappears.",
    "proj.snap.meet2": "multiplayer game",
    "proj.snap.alt": "Line drawing of a game room: player avatars around a photo that is fading away",
    "proj.snap.strip": "The game loop, in development",
    "proj.snap.fig.rooms": "private",
    "proj.snap.s1.name": "Private room",
    "proj.snap.s2.name": "Photo or video",
    "proj.snap.s3.name": "It disappears",
    "proj.snap.s4.name": "Guess the sender"
  },
  es: {
    "stat.gp": "grandes premios",
    "stat.class": "clasificaciones",
    "stat.cc": "cc de motor",
    "stat.format": "formato",
    "stat.courses": "cursos publicados",
    "stat.prep": "más en preparación",
    "stat.chapters": "capítulos",
    "stat.lines": "líneas",
    "stat.exercises": "ejercicios",
    "stat.framework": "framework",
    "stat.database": "base de datos",
    "stat.audience": "público",
    "stat.price": "precio",
    "stat.runtime": "runtime",
    "stat.realtime": "tiempo real",
    "stat.rooms": "salas",
    "stat.license": "licencia",

    "proj.pkc.area": "desarrollo web",
    "proj.pkc.type": "plataforma de campeonato",
    "proj.pkc.summary": "Protecsol Karting Cup es el campeonato amateur de karting de Empuriabrava. El calendario, las inscripciones y las clasificaciones en directo están en una sola web que Enric ha desarrollado de principio a fin: base de datos, backend en PHP, frontend en React y SEO.",
    "proj.pkc.meet3": "temporada 2026",
    "proj.pkc.alt": "Ilustración del diseño de la web de Protecsol Karting Cup",
    "proj.pkc.strip": "Cómo está hecha la web",
    "proj.pkc.s1.top": "back end", "proj.pkc.s1.name": "Base de datos", "proj.pkc.s1.bottom": "capa de datos",
    "proj.pkc.s2.top": "back end", "proj.pkc.s2.name": "PHP", "proj.pkc.s2.bottom": "MVC",
    "proj.pkc.s3.top": "online", "proj.pkc.s3.name": "Web publicada", "proj.pkc.s3.bottom": "temporada 2026",
    "proj.pkc.s4.top": "front end", "proj.pkc.s4.name": "Interfaz", "proj.pkc.s4.bottom": "React · TypeScript",
    "proj.pkc.s5.top": "visibilidad", "proj.pkc.s5.name": "SEO", "proj.pkc.s5.bottom": "buscadores y redes",

    "proj.chess.area": "ajedrez educativo",
    "proj.chess.type": "plataforma de aprendizaje",
    "proj.chess.summary": "Una plataforma para aprender ajedrez. Los cursos se construyen con estudios y líneas, y los ejercicios salen de esas líneas y de sus trampas. Las jugadas se auditan con Stockfish 19. El progreso y la XP se guardan en el navegador: sin cuentas, sin backend y sin vídeos.",
    "proj.chess.meet2": "plataforma de ajedrez",
    "proj.chess.alt": "Dibujo de un curso de ajedrez: un tablero con una línea resaltada y una lista de ejercicios",
    "proj.chess.strip": "Cómo se construye el contenido",
    "proj.chess.s1.top": "contenido", "proj.chess.s1.name": "Cursos", "proj.chess.s1.bottom": "estudios y líneas",
    "proj.chess.s2.top": "estructura", "proj.chess.s2.name": "Capítulos", "proj.chess.s2.bottom": "dentro de cada curso",
    "proj.chess.s3.top": "contenido", "proj.chess.s3.name": "Líneas", "proj.chess.s3.bottom": "variantes y trampas",
    "proj.chess.s4.top": "práctica", "proj.chess.s4.name": "Ejercicios", "proj.chess.s4.bottom": "de líneas y trampas",
    "proj.chess.s5.top": "calidad", "proj.chess.s5.name": "Auditoría", "proj.chess.s5.bottom": "Stockfish 19",

    "proj.uni.area": "herramientas para estudiantes",
    "proj.uni.type": "herramientas de estudio",
    "proj.uni.summary": "Herramientas gratuitas para estudiantes que se presentan a la PAU (selectividad). Hechas para calcular notas, ponderaciones y notas de acceso sin hojas de cálculo.",
    "proj.uni.meet2": "herramientas para la PAU",
    "proj.uni.alt": "Dibujo de herramientas de estudio: una calculadora de notas con campos y un resultado",
    "proj.uni.strip": "Alcance, en desarrollo",
    "proj.uni.fig.price": "gratis",
    "proj.uni.s1.name": "Cálculo de notas",
    "proj.uni.s2.name": "Ponderaciones",
    "proj.uni.s3.name": "Notas de corte",
    "proj.uni.s4.name": "Simulador de acceso",
    "proj.uni.s5.name": "Utilidades de estudio",

    "proj.snap.area": "multijugador en tiempo real",
    "proj.snap.type": "juego de adivinar",
    "proj.snap.summary": "Un juego multijugador en tiempo real: los jugadores entran en salas privadas e intentan adivinar quién ha enviado una foto o un vídeo antes de que desaparezca.",
    "proj.snap.meet2": "juego multijugador",
    "proj.snap.alt": "Dibujo de una sala de juego: avatares de jugadores alrededor de una foto que se desvanece",
    "proj.snap.strip": "El bucle de juego, en desarrollo",
    "proj.snap.fig.rooms": "privadas",
    "proj.snap.s1.name": "Sala privada",
    "proj.snap.s2.name": "Foto o vídeo",
    "proj.snap.s3.name": "Desaparece",
    "proj.snap.s4.name": "Adivina quién fue"
  },
  ca: {
    "stat.gp": "grans premis",
    "stat.class": "classificacions",
    "stat.cc": "cc de motor",
    "stat.format": "format",
    "stat.courses": "cursos publicats",
    "stat.prep": "més en preparació",
    "stat.chapters": "capítols",
    "stat.lines": "línies",
    "stat.exercises": "exercicis",
    "stat.framework": "framework",
    "stat.database": "base de dades",
    "stat.audience": "públic",
    "stat.price": "preu",
    "stat.runtime": "runtime",
    "stat.realtime": "temps real",
    "stat.rooms": "sales",
    "stat.license": "llicència",

    "proj.pkc.area": "programació web",
    "proj.pkc.type": "plataforma de campionat",
    "proj.pkc.summary": "Protecsol Karting Cup és el campionat amateur de karting d'Empuriabrava. El calendari, les inscripcions i les classificacions en directe són en un sol lloc web que l'Enric ha desenvolupat de dalt a baix: base de dades, backend en PHP, frontend en React i SEO.",
    "proj.pkc.meet3": "temporada 2026",
    "proj.pkc.alt": "Il·lustració del disseny del lloc web de Protecsol Karting Cup",
    "proj.pkc.strip": "Com està fet el lloc web",
    "proj.pkc.s1.top": "back end", "proj.pkc.s1.name": "Base de dades", "proj.pkc.s1.bottom": "capa de dades",
    "proj.pkc.s2.top": "back end", "proj.pkc.s2.name": "PHP", "proj.pkc.s2.bottom": "MVC",
    "proj.pkc.s3.top": "en línia", "proj.pkc.s3.name": "Lloc web publicat", "proj.pkc.s3.bottom": "temporada 2026",
    "proj.pkc.s4.top": "front end", "proj.pkc.s4.name": "Interfície", "proj.pkc.s4.bottom": "React · TypeScript",
    "proj.pkc.s5.top": "visibilitat", "proj.pkc.s5.name": "SEO", "proj.pkc.s5.bottom": "cercadors i xarxes",

    "proj.chess.area": "escacs educatius",
    "proj.chess.type": "plataforma d'aprenentatge",
    "proj.chess.summary": "Una plataforma per aprendre escacs. Els cursos es construeixen amb estudis i línies, i els exercicis surten d'aquestes línies i de les seves trampes. Les jugades s'auditen amb Stockfish 19. El progrés i l'XP es desen al navegador: sense comptes, sense backend i sense vídeos.",
    "proj.chess.meet2": "plataforma d'escacs",
    "proj.chess.alt": "Dibuix d'un curs d'escacs: un tauler amb una línia ressaltada i una llista d'exercicis",
    "proj.chess.strip": "Com es construeix el contingut",
    "proj.chess.s1.top": "contingut", "proj.chess.s1.name": "Cursos", "proj.chess.s1.bottom": "estudis i línies",
    "proj.chess.s2.top": "estructura", "proj.chess.s2.name": "Capítols", "proj.chess.s2.bottom": "dins de cada curs",
    "proj.chess.s3.top": "contingut", "proj.chess.s3.name": "Línies", "proj.chess.s3.bottom": "variants i trampes",
    "proj.chess.s4.top": "pràctica", "proj.chess.s4.name": "Exercicis", "proj.chess.s4.bottom": "de línies i trampes",
    "proj.chess.s5.top": "qualitat", "proj.chess.s5.name": "Auditoria", "proj.chess.s5.bottom": "Stockfish 19",

    "proj.uni.area": "eines per a estudiants",
    "proj.uni.type": "eines d'estudi",
    "proj.uni.summary": "Eines gratuïtes per a estudiants que es presenten a la PAU (selectivitat). Fetes per calcular notes, ponderacions i notes d'accés sense fulls de càlcul.",
    "proj.uni.meet2": "eines per a la PAU",
    "proj.uni.alt": "Dibuix d'eines d'estudi: una calculadora de notes amb camps i un resultat",
    "proj.uni.strip": "Abast, en desenvolupament",
    "proj.uni.fig.price": "gratuït",
    "proj.uni.s1.name": "Càlcul de notes",
    "proj.uni.s2.name": "Ponderacions",
    "proj.uni.s3.name": "Notes de tall",
    "proj.uni.s4.name": "Simulador d'accés",
    "proj.uni.s5.name": "Utilitats d'estudi",

    "proj.snap.area": "multijugador en temps real",
    "proj.snap.type": "joc d'endevinar",
    "proj.snap.summary": "Un joc multijugador en temps real: els jugadors entren a sales privades i intenten endevinar qui ha enviat una foto o un vídeo abans que desaparegui.",
    "proj.snap.meet2": "joc multijugador",
    "proj.snap.alt": "Dibuix d'una sala de joc: avatars de jugadors al voltant d'una foto que s'esvaeix",
    "proj.snap.strip": "El bucle de joc, en desenvolupament",
    "proj.snap.fig.rooms": "privades",
    "proj.snap.s1.name": "Sala privada",
    "proj.snap.s2.name": "Foto o vídeo",
    "proj.snap.s3.name": "Desapareix",
    "proj.snap.s4.name": "Endevina qui ha estat"
  }
};


export const stringsTimeline = {
  en: {
    "timeline.head1": "from learning",
    "timeline.head2": "to building",
    "timeline.listLabel": "The path so far",
    "timeline.r1.label": "studies",
    "timeline.r1.lead": "Learning by building.",
    "timeline.r1.body": "Enric studies DAW (Web Application Development) and plans to continue into DAM. With a science background, he approaches technical problems analytically and looks for logical, efficient solutions. Martial arts and music gave him discipline and focus.",
    "timeline.r1.alt": "Roadmap drawn as a diagram: DAW now, DAM planned next, on a grid",
    "timeline.r2.label": "skills",
    "timeline.r2.lead": "Grouped by area.",
    "timeline.r2.body": "What Enric has worked with, and what he is still exploring.",
    "timeline.r3.label": "languages",
    "timeline.r3.lead": "Five languages.",
    "timeline.r3.body": "Spanish and Catalan are native, English is C1, Italian is upper-intermediate and French intermediate.",
    "timeline.r3.alt": "Five language codes — ES, CA, EN, IT and FR — each above a row of level markers, the fullest for Spanish and Catalan",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Sketch of interface components: a button, a toggle, a slider and a row of cards",
    "timeline.r5.label": "projects",
    "timeline.r5.lead": "Four projects, four different problems.",
    "timeline.r5.body": "A live championship site, a chess learning platform, study tools for students and a real-time multiplayer game. One is live; three are in development.",
    "timeline.r5.alt": "Four small line drawings, one per project: a website, a chessboard, a calculator and a game room",
    "timeline.r6.label": "exploring",
    "timeline.r7.label": "next",
    "timeline.r7.lead": "What's next.",
    "timeline.r7.body": "An internship to contribute from the first day and keep learning, then DAM on the way to a full-stack profile. New projects will be added here as they become official.",
    "timeline.r7.alt": "A stylised circuit map seen from above, with one lap lit in red",
    "timeline.art.now": "now",
    "timeline.art.planned": "planned",

    "skills.worked": "worked with",
    "skills.exploring": "exploring",
    "skills.cat.frontend": "Frontend",
    "skills.cat.backend": "Backend",
    "skills.cat.data": "Databases",
    "skills.cat.ops": "DevOps & Systems",
    "skills.cat.vcs": "Version control",
    "skills.cat.ai": "AI & workflow",
    "skills.exploringNote": "learning, not claiming"
  },
  es: {
    "timeline.head1": "de aprender",
    "timeline.head2": "a construir",
    "timeline.listLabel": "Trayectoria hasta ahora",
    "timeline.r1.label": "estudios",
    "timeline.r1.lead": "Aprender construyendo.",
    "timeline.r1.body": "Enric estudia DAW (Desarrollo de Aplicaciones Web) y piensa seguir con DAM. Con base científica, afronta los problemas técnicos de forma analítica y busca soluciones lógicas y eficientes. Las artes marciales y la música le han dado disciplina y foco.",
    "timeline.r1.alt": "Hoja de ruta dibujada como diagrama: DAW ahora y DAM previsto después, sobre una cuadrícula",
    "timeline.r2.label": "habilidades",
    "timeline.r2.lead": "Agrupadas por áreas.",
    "timeline.r2.body": "Con lo que Enric ha trabajado y lo que todavía está explorando.",
    "timeline.r3.label": "idiomas",
    "timeline.r3.lead": "Cinco idiomas.",
    "timeline.r3.body": "Español y catalán son nativos, el inglés es C1, el italiano es de nivel intermedio-alto y el francés, intermedio.",
    "timeline.r3.alt": "Cinco códigos de idioma —ES, CA, EN, IT y FR—, cada uno sobre una fila de marcadores de nivel, la más llena la del español y el catalán",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Boceto de componentes de interfaz: un botón, un interruptor, un deslizador y una fila de tarjetas",
    "timeline.r5.label": "proyectos",
    "timeline.r5.lead": "Cuatro proyectos, cuatro problemas distintos.",
    "timeline.r5.body": "Una web de campeonato publicada, una plataforma para aprender ajedrez, herramientas de estudio para estudiantes y un juego multijugador en tiempo real. Uno está publicado; tres están en desarrollo.",
    "timeline.r5.alt": "Cuatro pequeños dibujos de líneas, uno por proyecto: una web, un tablero de ajedrez, una calculadora y una sala de juego",
    "timeline.r6.label": "explorando",
    "timeline.r7.label": "siguiente",
    "timeline.r7.lead": "Lo que viene.",
    "timeline.r7.body": "Unas prácticas donde aportar desde el primer día y seguir aprendiendo, y después DAM para avanzar hacia un perfil full-stack. Los nuevos proyectos se irán añadiendo aquí cuando sean oficiales.",
    "timeline.r7.alt": "Un mapa estilizado de un circuito visto desde arriba, con una vuelta iluminada en rojo",
    "timeline.art.now": "ahora",
    "timeline.art.planned": "previsto",

    "skills.worked": "trabajado con",
    "skills.exploring": "explorando",
    "skills.cat.frontend": "Frontend",
    "skills.cat.backend": "Backend",
    "skills.cat.data": "Bases de datos",
    "skills.cat.ops": "DevOps y sistemas",
    "skills.cat.vcs": "Control de versiones",
    "skills.cat.ai": "IA y flujo de trabajo",
    "skills.exploringNote": "aprendiendo, sin presumir"
  },
  ca: {
    "timeline.head1": "d'aprendre",
    "timeline.head2": "a construir",
    "timeline.listLabel": "Trajectòria fins ara",
    "timeline.r1.label": "estudis",
    "timeline.r1.lead": "Aprendre construint.",
    "timeline.r1.body": "L'Enric estudia DAW (Desenvolupament d'Aplicacions Web) i pensa continuar amb DAM. Amb base científica, afronta els problemes tècnics de manera analítica i busca solucions lògiques i eficients. Les arts marcials i la música li han donat disciplina i focus.",
    "timeline.r1.alt": "Full de ruta dibuixat com a diagrama: DAW ara i DAM previst després, sobre una quadrícula",
    "timeline.r2.label": "habilitats",
    "timeline.r2.lead": "Agrupades per àrees.",
    "timeline.r2.body": "Amb el que l'Enric ha treballat i el que encara està explorant.",
    "timeline.r3.label": "idiomes",
    "timeline.r3.lead": "Cinc idiomes.",
    "timeline.r3.body": "Castellà i català són natius, l'anglès és C1, l'italià és de nivell intermedi-alt i el francès, intermedi.",
    "timeline.r3.alt": "Cinc codis d'idioma —ES, CA, EN, IT i FR—, cadascun sobre una fila de marcadors de nivell, la més plena la del castellà i el català",
    "timeline.r4.label": "frontend",
    "timeline.r4.alt": "Esbós de components d'interfície: un botó, un interruptor, un lliscador i una fila de targetes",
    "timeline.r5.label": "projectes",
    "timeline.r5.lead": "Quatre projectes, quatre problemes diferents.",
    "timeline.r5.body": "Un lloc web de campionat publicat, una plataforma per aprendre escacs, eines d'estudi per a estudiants i un joc multijugador en temps real. Un està publicat; tres estan en desenvolupament.",
    "timeline.r5.alt": "Quatre petits dibuixos de línies, un per projecte: un lloc web, un tauler d'escacs, una calculadora i una sala de joc",
    "timeline.r6.label": "explorant",
    "timeline.r7.label": "següent",
    "timeline.r7.lead": "El que ve.",
    "timeline.r7.body": "Unes pràctiques on aportar des del primer dia i continuar aprenent, i després DAM per avançar cap a un perfil full-stack. Els nous projectes s'aniran afegint aquí quan siguin oficials.",
    "timeline.r7.alt": "Un mapa estilitzat d'un circuit vist des de dalt, amb una volta il·luminada en vermell",
    "timeline.art.now": "ara",
    "timeline.art.planned": "previst",

    "skills.worked": "treballat amb",
    "skills.exploring": "explorant",
    "skills.cat.frontend": "Frontend",
    "skills.cat.backend": "Backend",
    "skills.cat.data": "Bases de dades",
    "skills.cat.ops": "DevOps i sistemes",
    "skills.cat.vcs": "Control de versions",
    "skills.cat.ai": "IA i flux de treball",
    "skills.exploringNote": "aprenent, sense presumir"
  }
};


export const stringsPaddock = {
  en: {
    "paddock.head1": "inside the",
    "paddock.head2": "projects",
    "paddock.tabs.label": "Choose a project",
    "paddock.cta": "visit live site",
    "paddock.credit": "Shown with the permission of Protecsol."
  },
  es: {
    "paddock.head1": "dentro de los",
    "paddock.head2": "proyectos",
    "paddock.tabs.label": "Elige un proyecto",
    "paddock.cta": "visitar la web",
    "paddock.credit": "Se muestra con permiso de Protecsol."
  },
  ca: {
    "paddock.head1": "dins dels",
    "paddock.head2": "projectes",
    "paddock.tabs.label": "Tria un projecte",
    "paddock.cta": "visita el lloc web",
    "paddock.credit": "Es mostra amb permís de Protecsol."
  }
};


// AI Tools & Development Workflow
export const stringsAI = {
  en: {
    "ai.label": "AI tools & development workflow",
    "ai.head1": "AI-augmented,",
    "ai.head2": "human-driven",
    "ai.slop": "Anti-AI slop.",
    "ai.lead": "AI speeds up the repetitive work, explores options, reads code, spots mistakes and helps me learn. I read, test and decide what ships.",
    "ai.term.cmd": "ps tools",
    "ai.term.tool": "tool",
    "ai.term.use": "used for",
    "ai.term.pick": "select a tool",
    "ai.t1.use": "routing · testing",
    "ai.t1.desc": "Local LLM gateway and router. It lets me develop and test efficiently against different models.",
    "ai.t2.use": "dev · tests · review",
    "ai.t2.desc": "Coding agent for development, tests and continuous code review.",
    "ai.t3.use": "orchestration · skills",
    "ai.t3.desc": "Agent orchestration, skills management and complex tasks that run locally.",
    "ai.t4.use": "refactor · debug · design",
    "ai.t4.desc": "Advanced programming help: refactoring, debugging and architecture.",
    "ai.t5.use": "code · design · docs",
    "ai.t5.desc": "Code generation, technical solution design and documentation.",
    "ai.t6.use": "repos · context · support",
    "ai.t6.desc": "Large-repo analysis, contextual reasoning and technical support.",
    "ai.flow.label": "How a change gets made",
    "ai.flow.ai": "AI",
    "ai.flow.me": "me",
    "ai.f1.name": "idea",
    "ai.f1.desc": "I frame the problem",
    "ai.f2.name": "draft",
    "ai.f2.desc": "AI explores and writes options",
    "ai.f3.name": "review",
    "ai.f3.desc": "I read and question every change",
    "ai.f4.name": "validate",
    "ai.f4.desc": "Tests and my own judgement",
    "ai.f5.name": "ship",
    "ai.f5.desc": "Only what passes both",
    "ai.back": "anything rejected goes back to draft",
    "ai.helps.label": "AI helps with",
    "ai.helps": "repetitive tasks · exploring solutions · reading code · improving the process · learning · catching errors",
    "ai.keep.label": "I keep",
    "ai.keep": "the judgement · the validation · the final result"
  },
  es: {
    "ai.label": "Herramientas de IA y flujo de desarrollo",
    "ai.head1": "Con IA,",
    "ai.head2": "guiado por humanos",
    "ai.slop": "Anti-AI slop.",
    "ai.lead": "La IA acelera lo repetitivo, explora opciones, lee código, detecta errores y me ayuda a aprender. Yo reviso, pruebo y decido qué se publica.",
    "ai.term.cmd": "ps tools",
    "ai.term.tool": "herramienta",
    "ai.term.use": "para qué",
    "ai.term.pick": "elige una herramienta",
    "ai.t1.use": "enrutado · pruebas",
    "ai.t1.desc": "Gateway y enrutador local de modelos LLM. Me permite desarrollar y probar de forma eficiente con distintos modelos.",
    "ai.t2.use": "desarrollo · tests · revisión",
    "ai.t2.desc": "Agente de programación para desarrollo, tests y revisión continua de código.",
    "ai.t3.use": "orquestación · skills",
    "ai.t3.desc": "Orquestación de agentes, gestión de skills y tareas complejas que se ejecutan en local.",
    "ai.t4.use": "refactor · debug · diseño",
    "ai.t4.desc": "Ayuda avanzada de programación: refactorización, depuración y arquitectura.",
    "ai.t5.use": "código · diseño · docs",
    "ai.t5.desc": "Generación de código, diseño de soluciones técnicas y documentación.",
    "ai.t6.use": "repos · contexto · soporte",
    "ai.t6.desc": "Análisis de repositorios grandes, razonamiento contextual y soporte técnico.",
    "ai.flow.label": "Cómo se hace un cambio",
    "ai.flow.ai": "IA",
    "ai.flow.me": "yo",
    "ai.f1.name": "idea",
    "ai.f1.desc": "Yo planteo el problema",
    "ai.f2.name": "borrador",
    "ai.f2.desc": "La IA explora y escribe opciones",
    "ai.f3.name": "revisión",
    "ai.f3.desc": "Leo y cuestiono cada cambio",
    "ai.f4.name": "validación",
    "ai.f4.desc": "Tests y mi propio criterio",
    "ai.f5.name": "publicar",
    "ai.f5.desc": "Solo lo que pasa ambas",
    "ai.back": "lo rechazado vuelve al borrador",
    "ai.helps.label": "La IA ayuda con",
    "ai.helps": "tareas repetitivas · explorar soluciones · leer código · mejorar el proceso · aprender · detectar errores",
    "ai.keep.label": "Me quedo con",
    "ai.keep": "el criterio · la validación · el resultado final"
  },
  ca: {
    "ai.label": "Eines d'IA i flux de desenvolupament",
    "ai.head1": "Amb IA,",
    "ai.head2": "guiat per humans",
    "ai.slop": "Anti-AI slop.",
    "ai.lead": "La IA accelera el que és repetitiu, explora opcions, llegeix codi, detecta errors i m'ajuda a aprendre. Jo reviso, provo i decideixo què es publica.",
    "ai.term.cmd": "ps tools",
    "ai.term.tool": "eina",
    "ai.term.use": "per a què",
    "ai.term.pick": "tria una eina",
    "ai.t1.use": "enrutament · proves",
    "ai.t1.desc": "Gateway i encaminador local de models LLM. Em permet desenvolupar i provar de manera eficient amb diferents models.",
    "ai.t2.use": "desenvolupament · tests · revisió",
    "ai.t2.desc": "Agent de programació per a desenvolupament, tests i revisió contínua de codi.",
    "ai.t3.use": "orquestració · skills",
    "ai.t3.desc": "Orquestració d'agents, gestió de skills i tasques complexes que s'executen en local.",
    "ai.t4.use": "refactor · debug · disseny",
    "ai.t4.desc": "Ajuda avançada de programació: refactorització, depuració i arquitectura.",
    "ai.t5.use": "codi · disseny · docs",
    "ai.t5.desc": "Generació de codi, disseny de solucions tècniques i documentació.",
    "ai.t6.use": "repos · context · suport",
    "ai.t6.desc": "Anàlisi de repositoris grans, raonament contextual i suport tècnic.",
    "ai.flow.label": "Com es fa un canvi",
    "ai.flow.ai": "IA",
    "ai.flow.me": "jo",
    "ai.f1.name": "idea",
    "ai.f1.desc": "Jo plantejo el problema",
    "ai.f2.name": "esborrany",
    "ai.f2.desc": "La IA explora i escriu opcions",
    "ai.f3.name": "revisió",
    "ai.f3.desc": "Llegeixo i qüestiono cada canvi",
    "ai.f4.name": "validació",
    "ai.f4.desc": "Tests i el meu propi criteri",
    "ai.f5.name": "publicar",
    "ai.f5.desc": "Només el que passa totes dues",
    "ai.back": "el que es rebutja torna a l'esborrany",
    "ai.helps.label": "La IA ajuda amb",
    "ai.helps": "tasques repetitives · explorar solucions · llegir codi · millorar el procés · aprendre · detectar errors",
    "ai.keep.label": "Em quedo amb",
    "ai.keep": "el criteri · la validació · el resultat final"
  }
};


export const stringsFooter = {
  en: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "keep",
    "footer.head2": "building",
    "footer.nav.label": "Page sections",
    "footer.fig.alt": "Stylised 3D portrait of Enric Masella",
    "footer.copy": "© 2026 Enric Masella. All rights reserved.",
    "footer.credit": "Made in Girona.",
    "footer.cta": "say hello",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  },
  es: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "sigue",
    "footer.head2": "construyendo",
    "footer.nav.label": "Secciones de la página",
    "footer.fig.alt": "Retrato 3D estilizado de Enric Masella",
    "footer.copy": "© 2026 Enric Masella. Todos los derechos reservados.",
    "footer.credit": "Hecho en Girona.",
    "footer.cta": "escríbeme",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  },
  ca: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "segueix",
    "footer.head2": "construint",
    "footer.nav.label": "Seccions de la pàgina",
    "footer.fig.alt": "Retrat 3D estilitzat d'Enric Masella",
    "footer.copy": "© 2026 Enric Masella. Tots els drets reservats.",
    "footer.credit": "Fet a Girona.",
    "footer.cta": "escriu-me",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  }
};


// Registro automático de todos los textos (main.js no registra nada más).
registerStrings(strings);
registerStrings(stringsHero);
registerStrings(stringsDock);
registerStrings(stringsSeason);
registerStrings(stringsProjects);
registerStrings(stringsTimeline);
registerStrings(stringsPaddock);
registerStrings(stringsAI);
registerStrings(stringsFooter);
