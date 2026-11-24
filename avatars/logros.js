// Logros y medallas del crucigrama.
// Se calculan en el navegador a partir de public_scores (no hace falta tocar la base de datos).
// Los usan index.html (columna "logros" y vitrina) y perfil.html (medallero).
//
// Para cambiar las reglas: editá DEFS (texto y nivel) y la función calcular() (condiciones).
// Las imágenes: si existe avatars/medallas.png (hoja de 4×3 íconos, en el orden de DEFS) se usa esa;
// si no, se dibujan íconos provisorios en pixel art.
(function (global) {
  "use strict";

  // orden = posición en la hoja de medallas (izquierda a derecha, arriba a abajo)
  const DEFS = [
    { id: "primera",   nombre: "Primera victoria",     nivel: "bronce", desc: "Ganar un día" },
    { id: "racha3",    nombre: "Racha de 3",           nivel: "bronce", desc: "Ganar 3 días de juego seguidos" },
    { id: "racha5",    nombre: "Racha de 5",           nivel: "plata",  desc: "Ganar 5 días de juego seguidos" },
    { id: "racha10",   nombre: "Racha de 10",          nivel: "oro",    desc: "Ganar 10 días de juego seguidos" },
    { id: "perfecto",  nombre: "Perfecto",             nivel: "plata",  desc: "Completar el 100% de las palabras" },
    { id: "relampago", nombre: "Relámpago",            nivel: "oro",    desc: "100% en menos de 5 minutos" },
    { id: "constante", nombre: "Constante",            nivel: "bronce", desc: "Jugar los 5 días hábiles de una semana" },
    { id: "maraton",   nombre: "Maratón",              nivel: "oro",    desc: "Jugar 20 días de juego seguidos sin faltar" },
    { id: "remontada", nombre: "Remontada",            nivel: "plata",  desc: "Ganar el día después de salir último" },
    { id: "semana",    nombre: "Ganador de la semana", nivel: "plata",  desc: "Sumar más puntos en una semana completa" },
    { id: "record",    nombre: "Récord histórico",     nivel: "oro",    desc: "Tener el mejor puntaje de todos" },
    { id: "photo",     nombre: "Photo finish",         nivel: "plata",  desc: "Ganar un día por menos de 10 puntos" },
  ];
  const POR_ID = Object.fromEntries(DEFS.map((d, i) => [d.id, { ...d, i }]));
  const PESO = { oro: 3, plata: 2, bronce: 1 };

  // ───────────────────────── fechas ("YYYY-MM-DD", en UTC) ─────────────────────────
  const parse = s => new Date(s + "T00:00:00Z");
  const fmt = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return fmt(d); };
  const lunes = s => addDays(s, -((parse(s).getUTCDay() + 6) % 7));

  // ───────────────────────── cálculo ─────────────────────────
  // scores: filas de public_scores · hoy: "YYYY-MM-DD"
  // → { de: { nombre: { id: { veces, primera, ultima } } }, eventos: [{ name, id, fecha }] (más nuevo primero) }
  function calcular(scores, hoy) {
    const de = {}, eventos = [];
    const add = (name, id, fecha) => {
      const m = de[name] || (de[name] = {});
      const r = m[id] || (m[id] = { veces: 0, primera: fecha, ultima: fecha });
      r.veces++;
      if (fecha < r.primera) r.primera = fecha;
      if (fecha > r.ultima) r.ultima = fecha;
      eventos.push({ name, id, fecha });
    };
    const validos = scores.filter(s => s.play_date <= hoy);
    const porDia = new Map();
    for (const s of validos) { if (!porDia.has(s.play_date)) porDia.set(s.play_date, []); porDia.get(s.play_date).push(s); }
    const dias = [...porDia.keys()].sort();             // "días de juego": fechas en que jugó alguien
    const nombres = [...new Set(validos.map(s => s.name))];

    const ganados = {}, racha = {}, seguidos = {};
    let ultimosAyer = new Set();
    for (const d of dias) {
      const ss = porDia.get(d).slice().sort((a, b) => b.score - a.score || a.elapsed - b.elapsed);
      const max = ss[0].score;
      const ganadores = new Set(ss.filter(s => s.score === max && max > 0).map(s => s.name));
      for (const name of ganadores) {
        if (!ganados[name]) add(name, "primera", d);
        ganados[name] = (ganados[name] || 0) + 1;
        if (ultimosAyer.has(name)) add(name, "remontada", d);
      }
      if (ganadores.size === 1 && ss.length > 1 && max - ss[1].score < 10) add(ss[0].name, "photo", d);
      for (const name of nombres) {
        racha[name] = ganadores.has(name) ? (racha[name] || 0) + 1 : 0;
        for (const [n, id] of [[3, "racha3"], [5, "racha5"], [10, "racha10"]]) if (racha[name] === n) add(name, id, d);
        const jugo = ss.some(s => s.name === name);
        seguidos[name] = jugo ? (seguidos[name] || 0) + 1 : 0;
        if (seguidos[name] === 20) add(name, "maraton", d);
      }
      for (const s of ss) {
        if (s.total > 0 && s.ok === s.total) {
          add(s.name, "perfecto", d);
          if (s.elapsed < 300) add(s.name, "relampago", d);
        }
      }
      // último del día (con al menos 3 jugadores): si gana el siguiente día de juego, es remontada
      const min = ss[ss.length - 1].score;
      ultimosAyer = ss.length >= 3 ? new Set(ss.filter(s => s.score === min).map(s => s.name)) : new Set();
    }

    // semanas: "constante" (jugó lunes a viernes) y "ganador de la semana" (solo semanas ya terminadas)
    const semanas = new Map();
    for (const s of validos) {
      const l = lunes(s.play_date);
      if (!semanas.has(l)) semanas.set(l, []);
      semanas.get(l).push(s);
    }
    const lunesHoy = lunes(hoy);
    for (const [l, ss] of [...semanas].sort()) {
      const viernes = addDays(l, 4);
      const diasDe = {};
      for (const s of ss) (diasDe[s.name] || (diasDe[s.name] = new Set())).add(s.play_date);
      for (const [name, set] of Object.entries(diasDe)) if (set.size >= 5) add(name, "constante", viernes);
      if (l < lunesHoy) {
        const tot = {};
        for (const s of ss) tot[s.name] = (tot[s.name] || 0) + s.score;
        const max = Math.max(...Object.values(tot));
        if (max > 0) for (const [name, t] of Object.entries(tot)) if (t === max) add(name, "semana", viernes);
      }
    }

    // récord histórico: quien tiene hoy el mejor puntaje
    const best = Math.max(0, ...validos.map(s => s.score));
    if (best > 0) for (const s of validos) if (s.score === best && !de[s.name]?.record) add(s.name, "record", s.play_date);

    eventos.sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : PESO[POR_ID[b.id].nivel] - PESO[POR_ID[a.id].nivel]);
    return { de, eventos };
  }

  // Medallas de un jugador, de la más valiosa a la menos (nivel y después la más reciente)
  function ordenadas(res, name) {
    const m = res.de[name] || {};
    return Object.entries(m).map(([id, r]) => ({ ...POR_ID[id], ...r }))
      .sort((a, b) => PESO[b.nivel] - PESO[a.nivel] || (a.ultima < b.ultima ? 1 : -1));
  }

  // ───────────────────────── íconos ─────────────────────────
  const METAL = {
    oro:    { m: "#e8b04a", l: "#ffe08a", d: "#a8762a", g: "#6b4a14", c: "#3f86c4" },
    plata:  { m: "#c8ccd2", l: "#eef0f3", d: "#8e939a", g: "#4b5058", c: "#5aa9e6" },
    bronce: { m: "#c07a48", l: "#e0a070", d: "#8a5230", g: "#4e2c16", c: "#c0463e" },
    gris:   { m: "#3a3f47", l: "#4a5059", d: "#2c3036", g: "#22262b", c: "#33373e" },
  };
  // símbolos de 5×5 (# = color del símbolo)
  const GLIFOS = {
    primera: ["#...#", "#####", ".###.", "..#..", ".###."],
    racha3: ["..#..", ".##..", ".###.", "#####", ".###."],
    racha5: ["#.#..", "#.##.", "##.#.", "#####", ".###."],
    racha10: ["#.#.#", "#####", "#####", "#####", ".###."],
    perfecto: ["..#..", "#####", ".###.", ".#.#.", "#...#"],
    relampago: ["..##.", ".##..", "####.", "..##.", ".##.."],
    constante: ["#####", "#.#.#", "#####", "#.#.#", "#####"],
    maraton: [".....", "#....", "###..", "#####", "....."],
    remontada: ["..#..", ".###.", "#.#.#", "..#..", "###.."],
    semana: ["#.#.#", "#####", "#####", ".....", "....."],
    record: [".###.", "#####", ".###.", "..#..", "....."],
    photo: ["#.#..", "##.#.", "#.#..", "#....", "#...."],
  };
  // medalla de 11×13: cinta (2 filas) + disco de 11×11 con el símbolo en el centro
  function mapa(id) {
    const rows = [];
    rows.push("...cc.cc...", "....ccc....");
    for (let y = 0; y < 11; y++) {
      let r = "";
      for (let x = 0; x < 11; x++) {
        const dx = x - 5, dy = y - 5, d2 = dx * dx + dy * dy;
        if (d2 > 26) { r += "."; continue; }
        const gy = y - 3, gx = x - 3, g = GLIFOS[id] || GLIFOS.perfecto;
        if (gy >= 0 && gy < 5 && gx >= 0 && gx < 5 && g[gy][gx] === "#") { r += "g"; continue; }
        r += d2 > 17 ? (dx + dy < 0 ? "l" : "d") : "m";
      }
      rows.push(r);
    }
    return rows;
  }

  // hoja de medallas real (avatars/medallas.png, 4×3 celdas): si está, reemplaza a los provisorios
  let HOJA = null;
  function cargar(base = "avatars/") {
    const v = global.AVATARES_VERSION ? "?v=" + encodeURIComponent(global.AVATARES_VERSION) : "";
    return new Promise(res => {
      const im = new Image();
      im.onload = () => { HOJA = { src: im.src, w: im.naturalWidth / 4, h: im.naturalHeight / 3, aw: im.naturalWidth, ah: im.naturalHeight }; res(); };
      im.onerror = () => res();
      im.src = base + "medallas.png" + v;
    });
  }

  function medalla(id, alto = 16, bloqueada = false) {
    const d = POR_ID[id];
    if (!d) return "";
    const tit = ` title="${d.nombre} — ${d.desc}"`;
    if (HOJA) {
      const k = alto / HOJA.h, col = d.i % 4, fila = Math.floor(d.i / 4);
      return `<span class="medalla${bloqueada ? " bloq" : ""}"${tit} style="width:${(HOJA.w * k).toFixed(1)}px;height:${alto}px;background:url('${HOJA.src}') ${(-col * HOJA.w * k).toFixed(1)}px ${(-fila * HOJA.h * k).toFixed(1)}px / ${(HOJA.aw * k).toFixed(1)}px ${(HOJA.ah * k).toFixed(1)}px no-repeat"></span>`;
    }
    const svg = global.Avatares.pixelArte(mapa(id), METAL[bloqueada ? "gris" : d.nivel], alto, "medalla-svg");
    return `<span class="medalla${bloqueada ? " bloq" : ""}"${tit}>${svg}</span>`;
  }

  global.Logros = { DEFS, POR_ID, calcular, ordenadas, medalla, cargar };
})(typeof window !== "undefined" ? window : globalThis);
