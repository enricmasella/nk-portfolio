// js/translations.js
// Sistema de idiomas e internacionalización (Català, Español, English)

export const LANGS = ["ca", "es", "en"];
export const LANG_NAMES = { ca: "Català", es: "Español", en: "English" };

export const dict = { en: {}, es: {}, ca: {} };
const listeners = new Set();
export let lang = "en";

export function registerStrings(data) {
  const strings = typeof data === 'function' ? data() : data;
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

export function detect() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
  } catch {}
  try {
    const saved = localStorage.getItem("em-lang");
    if (LANGS.includes(saved)) return saved;
  } catch {}
  const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  for (const p of prefs) {
    const base = String(p).toLowerCase().slice(0, 2);
    if (LANGS.includes(base)) return base;
  }
  return "en";
}

export function applyDom(root = (typeof document !== 'undefined' ? document : null)) {
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
  if (typeof document === 'undefined') return;
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
  if (persist && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem("em-lang", next);
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

export const NAV = [
  { key: "nav.work", id: "work" },
  { key: "nav.about", id: "path" },
  { key: "nav.skills", id: "skills" },
  { key: "nav.project", id: "project" },
  { key: "nav.contact", id: "contact" }
];

// --- Diccionarios de textos por seccion ---

export const strings = {
  en: {
    "meta.title": "Enric Masella \u2014 Web developer in Girona",
    "meta.description": "Enric Masella is a web developer in training based in Girona, Catalonia. He studies DAW, works with PHP, C#, JavaScript and SQL, and is looking for an internship. Featured project: Protecsol Karting Cup.",
    "a11y.skip": "Skip to content",
    "a11y.primaryNav": "Primary",
    "a11y.language": "Language",
    "nav.work": "Work",
    "nav.about": "About",
    "nav.skills": "Skills",
    "nav.project": "Project",
    "nav.contact": "Contact",
    "nav.github": "GitHub",
    "common.comingSoon": "Coming soon",
    "common.location": "Girona, Catalonia"
  },
  es: {
    "meta.title": "Enric Masella \u2014 Desarrollador web en Girona",
    "meta.description": "Enric Masella es desarrollador web en formaci\xF3n en Girona, Catalu\xF1a. Estudia DAW, trabaja con PHP, C#, JavaScript y SQL, y busca pr\xE1cticas. Proyecto destacado: Protecsol Karting Cup.",
    "a11y.skip": "Saltar al contenido",
    "a11y.primaryNav": "Principal",
    "a11y.language": "Idioma",
    "nav.work": "Trabajo",
    "nav.about": "Sobre m\xED",
    "nav.skills": "Habilidades",
    "nav.project": "Proyecto",
    "nav.contact": "Contacto",
    "nav.github": "GitHub",
    "common.comingSoon": "Pr\xF3ximamente",
    "common.location": "Girona, Catalu\xF1a"
  },
  ca: {
    "meta.title": "Enric Masella \u2014 Desenvolupador web a Girona",
    "meta.description": "L'Enric Masella \xE9s desenvolupador web en formaci\xF3 a Girona, Catalunya. Estudia DAW, treballa amb PHP, C#, JavaScript i SQL, i busca pr\xE0ctiques. Projecte destacat: Protecsol Karting Cup.",
    "a11y.skip": "Salta al contingut",
    "a11y.primaryNav": "Principal",
    "a11y.language": "Idioma",
    "nav.work": "Treball",
    "nav.about": "Sobre mi",
    "nav.skills": "Habilitats",
    "nav.project": "Projecte",
    "nav.contact": "Contacte",
    "nav.github": "GitHub",
    "common.comingSoon": "Properament",
    "common.location": "Girona, Catalunya"
  }
};


export const stringsHero = {
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


export const stringsDock = {
  en: { "nav.index": "index" },
  es: { "nav.index": "inicio" },
  ca: { "nav.index": "inici" }
};


export const stringsSeason = {
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
    "season.v.live": `live, 2026`,
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
    "season.v.live": `publicado, 2026`,
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
    "season.v.live": `publicat, 2026`,
    "season.v.role": "de dalt a baix"
  }
};


export const stringsTimeline = {
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


export const stringsPaddock = {
  en: {
    "paddock.head1": "inside the",
    "paddock.head2": "project",
    "paddock.report": "Protecsol Karting Cup is the amateur karting championship of Empuriabrava. Calendar, registration and live rankings live in one site that Enric built end to end \u2014 database, PHP backend, React frontend and SEO.",
    "paddock.cta": "visit live site",
    "paddock.credit": "Shown with the permission of Protecsol.",
    "paddock.fig.alt": "Illustration of the Protecsol Karting Cup website layout",
    "paddock.fig.altShot": "Screenshot of the Protecsol Karting Cup website",
    "paddock.meet.season": `2026 season`,
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
    "paddock.s3.bottom": `2026 season`,
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
    "paddock.meet.season": `temporada 2026`,
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
    "paddock.s3.bottom": `temporada 2026`,
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
    "paddock.meet.season": `temporada 2026`,
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
    "paddock.s3.bottom": `temporada 2026`,
    "paddock.s4.top": "front end",
    "paddock.s4.name": "Interf\xEDcie",
    "paddock.s4.bottom": "React \xB7 TypeScript",
    "paddock.s5.top": "visibilitat",
    "paddock.s5.name": "SEO",
    "paddock.s5.bottom": "cercadors i xarxes"
  }
};


export const stringsFooter = {
  en: {
    "footer.logo.alt": "Enric Masella",
    "footer.head1": "keep",
    "footer.head2": "building",
    "footer.nav.label": "Page sections",
    "footer.fig.alt": "Stylised 3D portrait of Enric Masella",
    "footer.copy": `\xA9 2026 Enric Masella. All rights reserved.`,
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
    "footer.copy": `\xA9 2026 Enric Masella. Todos los derechos reservados.`,
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
    "footer.copy": `\xA9 2026 Enric Masella. Tots els drets reservats.`,
    "footer.credit": "Fet a Girona.",
    "footer.cta": "escriu-me",
    "footer.social.github": "github",
    "footer.social.inst": "inst"
  }
};



// Registro automatico de todos los textos de las secciones
registerStrings(strings);
registerStrings(stringsHero);
registerStrings(stringsDock);
registerStrings(stringsSeason);
registerStrings(stringsTimeline);
registerStrings(stringsPaddock);
registerStrings(stringsFooter);
