// Personajes del leaderboard.
// Cada personaje es una carpeta en avatars/sprites/<id>/ con cuatro imágenes PNG:
//   parado.png · caminando.png · festejo.png · sentado.png
// Este archivo las muestra y les agrega encima lo que pasó en el día (corona, medalla,
// estrella, rayo, lamparita, zzz) y dibuja el podio. Para elegir o cambiar tu personaje
// editá avatars/players.js; este archivo no hace falta tocarlo.
(function (global) {
  "use strict";

  const BASE = "avatars/sprites/";
  const PET_BASE = "avatars/mascotas/";
  // se agrega a cada URL para que el navegador no muestre imágenes viejas guardadas en caché
  const V = () => global.AVATARES_VERSION ? "?v=" + encodeURIComponent(global.AVATARES_VERSION) : "";
  const PET_ALTO = .3;             // alto de la mascota respecto del personaje parado
  const POSES = ["parado", "caminando", "festejo", "sentado"];
  const OUT = "#1a1210";
  const G = "#e8b04a", GL = "#ffe08a", GD = "#a8762a";
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ───────────────────────── color ─────────────────────────
  function mix(a, b, t) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const A = p(a), B = p(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  const dk = (c, t = .3) => mix(c, "#000000", t);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ───────────────────────── qué personaje usa cada jugador ─────────────────────────
  function hash(s) {
    let h = 2166136261;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function spriteDe(nombre) {
    const elegido = (global.AVATARES || {})[nombre];
    if (typeof elegido === "string" && /^[a-z0-9_-]+$/i.test(elegido)) return elegido;
    if (elegido !== undefined) console.warn(`[avatares] ${nombre}: "${elegido}" no es un nombre de carpeta válido.`);
    // sin personaje propio: uno de SPRITES (si hay); si no, ninguno (null)
    const pool = global.SPRITES || [];
    return pool.length ? pool[hash(nombre) % pool.length] : null;
  }

  // ───────────────────────── medidas de cada imagen ─────────────────────────
  // Se leen al cargar: tamaño, dónde empieza la cabeza y su centro, y el tamaño de un "pixel"
  // del dibujo (u) para que los agregados queden en la misma escala que el personaje.
  const META = new Map();          // "id/pose" → { w, h, top, cx, u, ok, ...cuadro }

  // Un "cuadro" es un rectángulo dentro de una imagen: { src, x, y, w, h, aw, ah } (aw × ah = tamaño de la
  // imagen completa). Con atlas.png es la posición del cuadro en el atlas; con imágenes sueltas, x = y = 0.
  function cuadro(img, r) {
    const aw = img.naturalWidth, ah = img.naturalHeight;
    return r ? { src: img.src, x: r[0], y: r[1], w: r[2], h: r[3], aw, ah } : { src: img.src, x: 0, y: 0, w: aw, h: ah, aw, ah };
  }

  function medir(img, c = cuadro(img)) {
    const { w, h } = c;
    // u: tamaño de un píxel del dibujo, para que la corona, las medallas, etc. queden en la misma escala
    const m = { w, h, top: 0, cx: w / 2, u: Math.max(1, Math.round(h / 43)), ok: false };
    try {
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const g = cv.getContext("2d");
      g.drawImage(img, c.x, c.y, w, h, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      // la cabeza empieza en la franja del medio, después del último hueco vacío de arriba:
      // así se saltean las rayitas de festejo (separadas por un hueco) y las manos levantadas
      // (que quedan a los costados, fuera de la franja)
      const a = Math.round(w * .3), b = Math.round(w * .7);
      const filled = y => { let n = 0; for (let x = a; x < b; x++) if (d[(y * w + x) * 4 + 3] > 40) n++; return n; };
      let top = 0;
      while (top < h && !filled(top)) top++;
      for (let y = top; y < h * .35; y++) if (!filled(y)) { let z = y; while (z < h && !filled(z)) z++; top = z; y = z; }
      let sx = 0, n = 0;
      for (let y = top; y < Math.min(h, top + Math.round(h * .1)); y++) for (let x = Math.round(w * .2); x < Math.round(w * .8); x++) if (d[(y * w + x) * 4 + 3] > 40) { sx += x; n++; }
      // talón: el punto más a la izquierda de los pies (el personaje mira a la derecha)
      let talon = w;
      for (let y = Math.round(h * .9); y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { talon = Math.min(talon, x); break; }
      Object.assign(m, { top: top < h ? top : 0, cx: n ? sx / n : w / 2, talon: talon < w ? talon : 0, ok: true });
    } catch (e) { /* abierto como archivo local: se usan medidas aproximadas */ }
    return m;
  }

  // Mascotas: avatars/mascotas/<id>.png, una imagen chica que acompaña al personaje.
  const PETS = new Map();          // id → { w, h, src }
  function mascotaDe(nombre) {
    const id = (global.MASCOTAS || {})[nombre];
    return typeof id === "string" && /^[a-z0-9_-]+$/i.test(id) && PETS.has(id) ? PETS.get(id) : null;
  }

  function cargar(ids) {
    const jobs = [];
    for (const id of new Set(Object.values(global.MASCOTAS || {}))) {
      if (typeof id !== "string" || PETS.has(id)) continue;
      jobs.push(new Promise(res => {
        const img = new Image();
        img.onload = () => { PETS.set(id, { w: img.naturalWidth, h: img.naturalHeight, src: img.src }); res(); };
        img.onerror = () => { console.warn(`[avatares] falta ${PET_BASE}${id}.png`); res(); };
        img.src = PET_BASE + id + ".png" + V();
      }));
    }
    for (const id of new Set(ids.filter(Boolean))) {
      if (ANIMS.has(id)) continue;
      ANIMS.set(id, null);
      // primero atlas.json (una sola imagen con todo); si no está, imágenes sueltas
      jobs.push(fetch(BASE + id + "/atlas.json" + V()).then(r => r.ok ? r.json() : null).catch(() => null)
        .then(at => at ? cargarAtlas(id, at) : cargarSueltas(id)));
    }
    return Promise.all(jobs);
  }

  const imagen = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  async function cargarAtlas(id, at) {
    const img = await imagen(BASE + id + "/" + (at.imagen || "atlas.png") + V());
    if (!img) { console.warn(`[avatares] falta ${BASE}${id}/atlas.png`); return; }
    for (const [pose, r] of Object.entries(at.poses || {})) {
      const c = cuadro(img, r);
      META.set(id + "/" + pose, { ...medir(img, c), ...c });
    }
    const anims = {};
    for (const [nombre, a] of Object.entries(at.animaciones || {})) {
      const frames = (a.cuadros || []).map(([x, y]) => cuadro(img, [x, y, a.w, a.h]));
      if (!frames.length) continue;
      const m = medir(img, frames[0]);
      anims[nombre] = {
        nombre, titulo: a.titulo || nombre, cuadros: frames.length, ms: a.ms || 300, pausa: a.pausa || a.ms || 300,
        pausaEn: a.pausaEn ?? frames.length - 1,       // cuadro donde se detiene (el clímax); por defecto, el último
        alto: a.alto || m.h, mascota: !!a.mascota, w: a.w, h: a.h, talon: m.talon || 0, frames, img,
      };
    }
    ANIMS.set(id, { podio: at.podio || {}, anims });
  }

  // Formato con imágenes sueltas: <pose>.png + animaciones.json + <animación>/1.png, 2.png…
  async function cargarSueltas(id) {
    await Promise.all(POSES.map(async pose => {
      const img = await imagen(BASE + id + "/" + pose + ".png" + V());
      if (img) META.set(id + "/" + pose, { ...medir(img), ...cuadro(img) });
      else if (pose === "parado") console.warn(`[avatares] falta ${BASE}${id}/parado.png`);
    }));
    const man = await fetch(BASE + id + "/animaciones.json" + V()).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!man || !man.animaciones) return;
    const anims = {};
    for (const [nombre, a] of Object.entries(man.animaciones)) {
      const n = Math.max(1, Math.min(60, a.cuadros | 0));
      const imgs = await Promise.all(Array.from({ length: n }, (_, i) => imagen(`${BASE}${id}/${nombre}/${i + 1}.png${V()}`)));
      if (!imgs[0]) { console.warn(`[avatares] falta ${BASE}${id}/${nombre}/1.png`); continue; }
      const m = medir(imgs[0]);
      anims[nombre] = {
        nombre, titulo: a.titulo || nombre, cuadros: n, ms: a.ms || 300, pausa: a.pausa || a.ms || 300,
        alto: a.alto || m.h, mascota: !!a.mascota, w: m.w, h: m.h, talon: m.talon || 0,
        frames: imgs.map(im => cuadro(im || imgs[0])), imgs,           // imgs: quedan en memoria para no parpadear
      };
    }
    ANIMS.set(id, { podio: man.podio || {}, anims });
  }

  // ───────────────────────── dibujar un cuadro ─────────────────────────
  // En HTML: un <span> con la imagen de fondo recortada al cuadro, escalada por k.
  function cuadroHTML(c, k, estilo = "", attrs = "") {
    return `<span class="spr" style="width:${(c.w * k).toFixed(2)}px;height:${(c.h * k).toFixed(2)}px;background-image:url('${esc(c.src)}');` +
      `background-size:${(c.aw * k).toFixed(2)}px ${(c.ah * k).toFixed(2)}px;background-position:${(-c.x * k).toFixed(2)}px ${(-c.y * k).toFixed(2)}px;${estilo}"${attrs}></span>`;
  }
  // En SVG: un <svg> cuyo viewBox es el cuadro, con la imagen completa adentro.
  function cuadroSVG(c, x, y, w, h, attrs = "") {
    return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="${c.x} ${c.y} ${c.w} ${c.h}" preserveAspectRatio="none" overflow="hidden"${attrs}>` +
      `<image href="${esc(c.src)}" width="${c.aw}" height="${c.ah}"/></svg>`;
  }
  // Atributos para que el reloj de animación cambie de cuadro: "src x y|src x y|…"
  const framesAttr = (an, k) => ` data-frames="${esc(an.frames.map(f => `${f.src} ${f.x} ${f.y}`).join("|"))}" data-ms="${an.ms}" data-pausa="${an.pausa}" data-pi="${an.pausaEn ?? an.frames.length - 1}"${k ? ` data-k="${k}"` : ""}`;

  // Animaciones: avatars/sprites/<id>/animaciones.json + una carpeta por animación con 1.png, 2.png…
  const ANIMS = new Map();         // id → { podio: { gana, otro }, anims: { nombre → {...} } }
  function animDe(id, nombre) { const s = ANIMS.get(id); return s && nombre && s.anims[nombre] || null; }
  // poses que el personaje tiene de verdad (sin contar las que se reemplazan por "parado")
  function posesDe(nombre) { const id = spriteDe(nombre); return POSES.filter(p => META.has(id + "/" + p)); }
  function animaciones(nombre) { const s = ANIMS.get(spriteDe(nombre)); return s ? Object.values(s.anims).map(a => ({ nombre: a.nombre, titulo: a.titulo, ancho: a.w / a.alto })) : []; }

  // Un solo reloj para todas las animaciones de la página: cambia el cuadro de cada
  // elemento con data-frames cuando le toca. En el último cuadro espera "pausa".
  function animar() {
    if (global.__avataresReloj) return;
    if (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    global.__avataresReloj = setInterval(() => {
      const now = performance.now();
      for (const el of document.querySelectorAll("[data-frames]")) {
        if (now < +(el.dataset.t || 0)) continue;
        const fr = el.dataset.frames.split("|");
        const i = (+(el.dataset.i || 0) + 1) % fr.length;
        el.dataset.i = i;
        const pi = el.dataset.pi !== undefined ? +el.dataset.pi : fr.length - 1;
        el.dataset.t = now + (i === pi ? +el.dataset.pausa : +el.dataset.ms);
        const [src, x, y] = fr[i].split(" ");
        if (el.tagName.toLowerCase() === "svg") {            // podio: se mueve el viewBox sobre el atlas
          const vb = el.viewBox.baseVal;
          el.setAttribute("viewBox", `${x} ${y} ${vb.width} ${vb.height}`);
          const im = el.firstElementChild;
          if (im.getAttribute("href") !== src) im.setAttribute("href", src);
        } else {                                               // HTML: se mueve el fondo del <span>
          const k = +el.dataset.k;
          el.style.backgroundPosition = `${(-x * k).toFixed(2)}px ${(-y * k).toFixed(2)}px`;
          if (el.dataset.src !== src) { el.dataset.src = src; el.style.backgroundImage = `url('${src}')`; }
        }
      }
    }, 40);
  }

  // si falta una pose se usa la de parado; si falta todo, el primer personaje cargado
  function meta(id, pose) {
    return META.get(id + "/" + pose) || META.get(id + "/parado") || null;
  }

  // ───────────────────────── agregados en pixel art ─────────────────────────
  const CROWN = ["a...a...a", "g...g...g", "gg.ggg.gg", "ggggggggg", "gxgxgxgxg", "ddddddddd"];
  const CROWN_PAL = {
    dorada: { a: GL, g: G, d: GD, x: G },
    gemas: { a: GL, g: G, d: GD, x: "#3f86c4" },
    real: { a: "#fff6dc", g: G, d: GD, x: "#c23a7a" },
  };
  const MEDAL = { oro: [G, GL, GD], plata: ["#c8ccd2", "#eef0f3", "#8e939a"], bronce: ["#c07a48", "#e0a070", "#8a5230"] };
  const MEDAL_MAP = ["r.r", ".r.", "mlm", "mmm", "dmd"];
  const STAR = ["..y..", ".yyy.", "yywyy", ".yyy.", ".y.y."];
  const BULB = [".yyy.", "ywyyy", "yyyyy", ".yyy.", "..g..", ".ggg."];
  const BOLT = ["..y", ".y.", "yyy", ".y.", "y.."];
  const ZED = ["####", "..#.", ".#..", "####"];
  const ZED3 = ["###", ".#.", "###"];
  const TROPHY = ["l.ggg.g", "lgggggg", ".ggggg.", "..ggd..", "...g...", "..ddd.."];
  const FLAME = [".....r.....", "....rr.....", "....rro....", "...rroo..r.", "..rrooo.rr.", "..roooorro.", ".rrooyooor.", ".rooyyyoor.", "rrooyyyyoor", "rooyywyyoor", "rooyyyyyoor", ".rooyyyoor.", "..rrooorr..", "...rrrrr..."];
  const FLAME_PAL = [
    null,
    { r: "#d9462a", o: "#f5892e", y: "#ffd24a", w: "#fff1a8" },
    { r: "#c8361f", o: "#f07a26", y: "#ffc93a", w: "#fff1a8" },
    { r: "#2f6fd6", o: "#4f9dff", y: "#9fd0ff", w: "#e6f4ff" },
    { r: "#6a3cc8", o: "#a77bff", y: "#d4bcff", w: "#f6eeff" },
  ];

  // Pasa un dibujo de letras a píxeles, con contorno, en una grilla de lado u.
  function pixelMap(rows, pal, ox, oy, u, cls, outline = true) {
    const m = new Map();
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) m.set(i + "," + j, pal[ch]); }));
    if (outline) for (const k of [...m.keys()]) {
      const [x, y] = k.split(",").map(Number);
      for (const [ex, ey] of N4) { const kk = (x + ex) + "," + (y + ey); if (!m.has(kk)) m.set(kk, m.get(kk) || null); }
    }
    let out = "";
    const byRow = new Map();
    for (const [k, c] of m) { const [x, y] = k.split(",").map(Number); if (!byRow.has(y)) byRow.set(y, []); byRow.get(y).push([x, c || OUT]); }
    for (const [y, list] of byRow) {
      list.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < list.length;) {
        let j = i + 1;
        while (j < list.length && list[j][0] === list[j - 1][0] + 1 && list[j][1] === list[i][1]) j++;
        out += `<rect x="${ox + list[i][0] * u}" y="${oy + y * u}" width="${(list[j - 1][0] - list[i][0] + 1) * u}" height="${u}" fill="${list[i][1]}"/>`;
        i = j;
      }
    }
    return `<g class="${cls}">${out}</g>`;
  }

  // Agregados del día, en coordenadas de la imagen del personaje.
  // estado: { corona: "dorada"|"gemas"|"real", medalla: "oro"|"plata"|"bronce", perfecto, rapido, basico, pendiente }
  function agregados(mt, estado, pose) {
    const { top, cx, u, h } = mt;
    let s = "";
    if (estado.corona) s += pixelMap(CROWN, CROWN_PAL[estado.corona] || CROWN_PAL.dorada, Math.round(cx - 4.5 * u), top - 5 * u, u, "corona");
    if (estado.medalla && pose !== "sentado") {
      const [b, l, d] = MEDAL[estado.medalla] || MEDAL.oro;
      s += pixelMap(MEDAL_MAP, { r: "#8e2f2a", m: b, l, d }, Math.round(cx - 1.5 * u), Math.round(top + (h - top) * .5), u, "medalla");
    }
    if (estado.perfecto) s += pixelMap(STAR, { y: "#f2c94c", w: "#fff1b8" }, Math.round(cx - 11 * u), top - 2 * u, u, "star");
    if (estado.basico) s += pixelMap(BULB, { y: "#ffd75a", w: "#fff6c8", g: "#9a8f80" }, Math.round(cx + 6 * u), top - 3 * u, u, "bulb");
    if (estado.rapido) s += pixelMap(BOLT, { y: "#ffd84d" }, Math.round(cx + 9 * u), top + 4 * u, u, "bolt");
    if (estado.pendiente) {
      s += pixelMap(ZED, { "#": "#cfe3ff" }, Math.round(cx + 6 * u), top - 1 * u, u, "zz1", false);
      s += pixelMap(ZED3, { "#": "#cfe3ff" }, Math.round(cx + 10 * u), top - 5 * u, u, "zz2", false);
    }
    return s;
  }

  // ───────────────────────── personaje en HTML ─────────────────────────
  // opts: { pose, recorte: "cuerpo" | "busto", alto (px), titulo }
  function avatar(nombre, estado = {}, opts = {}) {
    const id = spriteDe(nombre);
    const pose = POSES.includes(opts.pose) ? opts.pose : "parado";
    const mt = meta(id, pose);
    const alto = opts.alto || 48;
    const label = opts.titulo ? ` role="img" aria-label="${esc(opts.titulo)}"` : ' aria-hidden="true"';
    if (!mt) return `<span class="avt avt-${opts.recorte || "cuerpo"}" style="width:${alto}px;height:${alto}px"${label}></span>`;
    const fx = agregados(mt, estado, pose);
    if (opts.recorte === "busto") {
      // cuadrado alrededor de la cabeza, con lugar arriba para la corona
      const lado = Math.round((meta(id, "parado") || mt).h * .55);
      const k = alto / lado;
      const x0 = mt.cx - lado / 2, y0 = mt.top - 6 * mt.u;
      const pos = `left:${(-x0 * k).toFixed(1)}px;top:${(-y0 * k).toFixed(1)}px;`;
      return `<span class="avt avt-busto" style="width:${alto}px;height:${alto}px"${label}>${cuadroHTML(mt, k, pos)}<svg viewBox="0 0 ${mt.w} ${mt.h}" style="${pos}width:${(mt.w * k).toFixed(1)}px;height:${(mt.h * k).toFixed(1)}px" overflow="visible" shape-rendering="crispEdges">${fx}</svg></span>`;
    }
    // de cuerpo entero, "alto" es la altura del personaje parado: así todas las poses y
    // animaciones de un mismo personaje quedan en la misma escala
    const pet = opts.mascota === false ? null : mascotaDe(nombre);
    const an = animDe(id, opts.anim);
    let k, cw, ch, pj;
    if (an) {
      k = alto / an.alto; cw = an.w * k; ch = an.h * k;
      pj = `<span class="avt-pj" style="width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px">${cuadroHTML(an.frames[0], k, "", framesAttr(an, k))}</span>`;
    } else {
      k = alto / (meta(id, "parado") || mt).h; cw = mt.w * k; ch = mt.h * k;
      pj = `<span class="avt-pj quieto" style="width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px">${cuadroHTML(mt, k)}<svg viewBox="0 0 ${mt.w} ${mt.h}" overflow="visible" shape-rendering="crispEdges">${fx}</svg></span>`;
    }
    if (!pet || (an && an.mascota)) return `<span class="avt avt-cuerpo" style="width:${cw.toFixed(1)}px;height:${ch.toFixed(1)}px"${label}>${pj}</span>`;
    // la mascota va a los pies, a la derecha, en la misma escala que el personaje parado
    const ph = Math.round(alto * PET_ALTO), pw = ph * pet.w / pet.h;
    return `<span class="avt avt-cuerpo" style="width:${(cw + pw).toFixed(1)}px;height:${ch.toFixed(1)}px"${label}>${pj}<img class="mascota" src="${esc(pet.src)}" alt="" style="left:${(cw - pw * .15).toFixed(1)}px;top:auto;bottom:0;width:${pw.toFixed(1)}px;height:${ph}px"></span>`;
  }

  // ───────────────────────── insignias sueltas ─────────────────────────
  function nivelRacha(n) { return n >= 10 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : n >= 2 ? 1 : 0; }
  function rachaSVG(n, alto = 16) {
    const t = nivelRacha(n);
    if (!t) return "";
    return `<span class="racha r${t}" title="${n} victorias seguidas"><svg viewBox="0 0 13 16" width="${Math.round(alto * 13 / 16)}" height="${alto}" shape-rendering="crispEdges" aria-hidden="true">${pixelMap(FLAME, FLAME_PAL[t], 1, 1, 1, "llama")}</svg><b>${n}</b></span>`;
  }
  function iconoSVG(nombre, alto = 14) {
    const maps = { trofeo: [TROPHY, { g: G, l: GL, d: GD }], estrella: [STAR, { y: "#f2c94c", w: "#fff1b8" }], rayo: [BOLT, { y: "#ffd84d" }], lamparita: [BULB, { y: "#ffd75a", w: "#fff6c8", g: "#9a8f80" }] };
    const [rows, pal] = maps[nombre] || maps.estrella;
    const w = rows[0].length + 2, h = rows.length + 2;
    return `<svg class="ico" viewBox="0 0 ${w} ${h}" width="${Math.round(alto * w / h)}" height="${alto}" shape-rendering="crispEdges" aria-hidden="true">${pixelMap(rows, pal, 1, 1, 1, "ico")}</svg>`;
  }

  // Dibujo de pixel art genérico (filas de letras + paleta), con contorno: lo usan las medallas.
  function pixelArte(rows, pal, alto = 16, cls = "ico") {
    const w = rows[0].length + 2, h = rows.length + 2;
    return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${Math.round(alto * w / h)}" height="${alto}" shape-rendering="crispEdges" aria-hidden="true">${pixelMap(rows, pal, 1, 1, 1, "")}</svg>`;
  }

  // ───────────────────────── podio ─────────────────────────
  const DIGITS = {
    1: ["...##...", "..###...", ".####...", "...##...", "...##...", "...##...", "...##...", "...##...", "...##...", ".######.", ".######."],
    2: [".#####..", "##...##.", ".....##.", ".....##.", "....##..", "...##...", "..##....", ".##.....", "##......", "#######.", "#######."],
    3: [".#####..", "##...##.", ".....##.", ".....##.", "..####..", ".....##.", ".....##.", ".....##.", "##...##.", ".#####..", "........"],
  };
  const LAUREL = ["...#.", "..##.", ".#.#.", "##.#.", ".#.##", "#..#.", "##.#.", ".###.", "..#.."];
  const BLOCKS = [
    { lugar: 2, x: 6, h: 30, lid: "#9a9aa0", lidL: "#c6c6ca", lidD: "#6c6c72", front: "#38373d", speck: "#42414a", num: "#ebe6dc", laurel: "#8a8a90", frame: "left" },
    { lugar: 3, x: 118, h: 24, lid: "#b0623a", lidL: "#d08a5a", lidD: "#7e4128", front: "#45291f", speck: "#523126", num: "#efdcc4", laurel: "#a85a36" },
    { lugar: 1, x: 62, h: 40, lid: "#e0a93a", lidL: "#f4cb62", lidD: "#a8762a", front: "#3a3024", speck: "#45392a", num: "#f4cb62", laurel: "#d9a23a", frame: "both" },
  ];
  const GROUND = 112, BW = 56, ANCHO = 290, ALTO_PJ = 44;   // alto de un personaje parado, en píxeles del podio
  const CUARTO = { x: 178, w: 110 };                         // 4.º lugar: en el piso, a la derecha del podio (ancho: hay caídas largas)

  function rectsDe(map) {
    const byRow = new Map();
    for (const [k, c] of map) { const [x, y] = k.split(",").map(Number); if (!byRow.has(y)) byRow.set(y, []); byRow.get(y).push([x, c]); }
    let out = "";
    for (const [y, list] of byRow) {
      list.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < list.length;) {
        let j = i + 1;
        while (j < list.length && list[j][0] === list[j - 1][0] + 1 && list[j][1] === list[i][1]) j++;
        out += `<rect x="${list[i][0]}" y="${y}" width="${list[j - 1][0] - list[i][0] + 1}" height="1" fill="${list[i][1]}"/>`;
        i = j;
      }
    }
    return out;
  }

  // ───────────────────────── efectos del podio (en código, no en las imágenes) ─────────────────────────
  // Sombra bajo los pies, en píxeles: dos franjas semitransparentes, más oscura en el centro.
  function sombra(cx, y, ancho) {
    const f = (w, a) => `<rect x="${Math.round(cx - w / 2)}" y="${y}" width="${Math.round(w)}" height="2" fill="rgba(0,0,0,${a})"/>`;
    return `<g class="sombra" shape-rendering="crispEdges">${f(ancho, .22)}${f(ancho * .6, .22)}</g>`;
  }
  // Un personaje del podio: la sombra queda quieta y el resto puede "entrar" cayendo (solo la 1.ª vez).
  const ORDEN_ENTRADA = { 3: 0, 2: .25, 1: .5, 4: .8 };
  function grupoPJ(lugar, partes, cx, piso, ancho, entrada) {
    const e = entrada ? ` class="entra" style="animation-delay:${ORDEN_ENTRADA[lugar]}s"` : "";
    return `<g>${sombra(cx, piso, ancho)}<g${e}>${partes.join("")}</g></g>`;
  }
  // Confeti sobre el ganador: papelitos de 2×1 que caen en loop, con posiciones fijas (no cambian al refrescar).
  const CONFETI = [G, GL, "#e0566a", "#5aa9e6", "#7bd389", "#f4f1e8"];
  function confeti(x0, ancho, piso) {
    let r = 7, out = "";
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 18; i++) {
      const x = Math.round(x0 - 6 + rnd() * (ancho + 12)), dx = Math.round((rnd() - .5) * 10);
      const d = (2.6 + rnd() * 1.8).toFixed(2), del = (-rnd() * 4).toFixed(2), vert = rnd() < .4;
      out += `<rect class="papel" x="${x}" y="${piso - 8}" width="${vert ? 1 : 2}" height="${vert ? 2 : 1}" fill="${CONFETI[i % CONFETI.length]}" style="--dx:${dx}px;--d:${d}s;--r:${del}s"/>`;
    }
    return `<g class="confeti" shape-rendering="crispEdges">${out}</g>`;
  }

  // top: [{ nombre, estado }, …] en orden 1.º, 2.º, 3.º, 4.º (null = lugar vacío)
  // opts.entrada: los personajes caen al podio con un rebote (para la primera vez que se muestra)
  function podioSVG(top3, opts = {}) {
    const m = new Map();
    const set = (x, y, c) => m.set(x + "," + y, c);
    const rect = (x1, y1, x2, y2, c) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) set(x, y, typeof c === "function" ? c(x, y) : c); };
    const chars = [];
    for (const b of BLOCKS) {
      const p = top3[b.lugar - 1];
      const dim = c => p ? c : mix(c, "#111418", .55);
      const top = GROUND - b.h, x2 = b.x + BW - 1;
      rect(b.x - 1, top + 6, x2 + 1, GROUND, OUT);
      rect(b.x, top + 6, x2, GROUND - 1, (x, y) => dim((x * 7 + y * 13) % 11 === 0 ? b.speck : b.front));
      if (b.frame === "both") { rect(b.x, top + 6, b.x + 1, GROUND - 1, dim(b.lidD)); rect(x2 - 1, top + 6, x2, GROUND - 1, dim(b.lidD)); }
      if (b.frame === "left") rect(b.x, top + 6, b.x, GROUND - 1, dim(b.lidD));
      rect(b.x - 2, top - 1, x2 + 2, top + 6, OUT);
      rect(b.x - 1, top, x2 + 1, top + 5, (x, y) => dim(y === top ? b.lidL : y === top + 4 ? b.lidD : y === top + 5 ? dk(b.lidD, .3) : (x * 5 + y * 3) % 9 === 0 ? b.lidL : b.lid));
      const dig = DIGITS[b.lugar], dx = b.x + (BW - 8) / 2, ddy = top + 6 + Math.floor((b.h - 6 - 11) / 2) + 1;
      const dm = new Set();
      dig.forEach((r, i) => [...r].forEach((ch, j) => { if (ch === "#") dm.add((dx + j) + "," + (ddy + i)); }));
      for (const k of dm) { const [x, y] = k.split(",").map(Number); for (const [ex, ey] of N4) if (!dm.has((x + ex) + "," + (y + ey))) set(x + ex, y + ey, OUT); }
      for (const k of dm) { const [x, y] = k.split(",").map(Number); set(x, y, dim(b.num)); }
      LAUREL.forEach((r, i) => [...r].forEach((ch, j) => { if (ch === "#") { set(dx - 8 + j, ddy + 1 + i, dim(b.laurel)); set(dx + 11 + (4 - j), ddy + 1 + i, dim(b.laurel)); } }));
      if (p) {
        const g = [];
        const id = spriteDe(p.nombre), set = ANIMS.get(id);
        // si el personaje tiene animaciones de podio: "gana" para el 1.º, "otro" para 2.º y 3.º
        const an = set ? animDe(id, b.lugar === 1 ? set.podio.gana : set.podio.otro) : null;
        const pose = b.lugar === 1 ? "festejo" : "parado", mt = meta(id, pose), base = meta(id, "parado");
        if (an) {
          const k = ALTO_PJ / an.alto, w = an.w * k, h = an.h * k;
          const x = b.x + BW / 2 - (an.talon + an.alto * .22) * k, y = top - h;
          g.push(cuadroSVG(an.frames[0], x, y, w, h, framesAttr(an)));
          const pet = an.mascota ? null : mascotaDe(p.nombre);
          if (pet) {
            // detrás del personaje (mira a la derecha), así no tapa lo que tiene en las manos
            const ph = Math.round(ALTO_PJ * PET_ALTO), pw = ph * pet.w / pet.h;
            const px = Math.max(b.x - 2, x + an.talon * k - pw + 1);
            g.unshift(`<image class="mascota" href="${esc(pet.src)}" x="${px.toFixed(2)}" y="${top - ph}" width="${pw.toFixed(2)}" height="${ph}" style="image-rendering:pixelated"/>`);
          }
        } else if (mt) {
          const k = ALTO_PJ / (base || mt).h;                 // misma escala para todas las poses del personaje
          const w = mt.w * k, h = mt.h * k, x = b.x + BW / 2 - mt.cx * k, y = top - h;
          g.push(`<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="0 0 ${mt.w} ${mt.h}" overflow="visible">${cuadroSVG(mt, 0, 0, mt.w, mt.h)}<g shape-rendering="crispEdges">${agregados(mt, p.estado || {}, pose)}</g></svg>`);
          const pet = mascotaDe(p.nombre);
          if (pet) {
            const ph = Math.round(ALTO_PJ * PET_ALTO), pw = ph * pet.w / pet.h;
            const px = Math.min(b.x + BW - pw + 2, x + w - 2);
            g.push(`<image class="mascota" href="${esc(pet.src)}" x="${px.toFixed(2)}" y="${top - ph}" width="${pw.toFixed(2)}" height="${ph}" style="image-rendering:pixelated"/>`);
          }
        }
        chars.push(grupoPJ(b.lugar, g, b.x + BW / 2, top, 22, opts.entrada));
        if (b.lugar === 1) chars.push(confeti(b.x, BW, top));
      }
    }
    // 4.º lugar: sin bloque, tirado en el piso ("podio.ultimo" del personaje); si no tiene esa animación, sentado
    const p4 = top3[3];
    if (p4) {
      const id = spriteDe(p4.nombre), st = ANIMS.get(id);
      const an = st ? animDe(id, st.podio.ultimo) : null;
      const cx = CUARTO.x + CUARTO.w / 2, base = meta(id, "parado");
      if (an) {
        const k = ALTO_PJ / an.alto, w = an.w * k, h = an.h * k;
        chars.push(grupoPJ(4, [cuadroSVG(an.frames[0], cx - w / 2, GROUND - h, w, h, framesAttr(an))], cx, GROUND - 1, Math.min(40, w * .8), opts.entrada));
      } else {
        const mt = meta(id, "sentado");
        if (mt) {
          const k = ALTO_PJ / (base || mt).h, w = mt.w * k, h = mt.h * k, x = cx - mt.cx * k;
          chars.push(grupoPJ(4, [`<svg x="${x.toFixed(2)}" y="${(GROUND - h).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="0 0 ${mt.w} ${mt.h}" overflow="visible">${cuadroSVG(mt, 0, 0, mt.w, mt.h)}<g shape-rendering="crispEdges">${agregados(mt, p4.estado || {}, "sentado")}</g></svg>`], cx, GROUND - 1, Math.min(30, w * .8), opts.entrada));
        }
      }
    }
    rect(0, GROUND, ANCHO - 1, GROUND, "#7d9a3e"); rect(0, GROUND + 1, ANCHO - 1, GROUND + 2, "#5d7a2e"); rect(0, GROUND + 3, ANCHO - 1, GROUND + 3, "#3f5222");
    const tuft = (x, h) => { for (let i = 0; i < h; i++) set(x, GROUND - 1 - i, i === h - 1 ? "#9ab84e" : "#6d8a34"); set(x + 2, GROUND - 1, "#6d8a34"); set(x + 2, GROUND - 2, "#9ab84e"); set(x - 1, GROUND - 1, "#6d8a34"); };
    [[2, 3], [12, 2], [36, 3], [58, 4], [70, 2], [96, 3], [114, 4], [124, 2], [150, 3], [168, 3], [176, 2], [214, 3], [252, 2], [272, 3], [286, 2]].forEach(([x, h]) => tuft(x, h));
    const rock = x => { rect(x, GROUND - 2, x + 3, GROUND - 1, "#8a8680"); rect(x + 1, GROUND - 3, x + 2, GROUND - 3, "#a8a49e"); set(x, GROUND - 2, "#6e6a64"); };
    rock(16); rock(160);
    return `<svg class="podio-svg" viewBox="0 20 ${ANCHO} 97" role="img" aria-label="Podio del día"><g shape-rendering="crispEdges">${rectsDe(m)}</g>${chars.join("")}</svg>`;
  }

  animar();
  global.Avatares = { cargar, avatar, spriteDe, mascotaDe, animaciones, posesDe, podioSVG, rachaSVG, nivelRacha, iconoSVG, pixelArte, POSES };
})(typeof window !== "undefined" ? window : globalThis);
