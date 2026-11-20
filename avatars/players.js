// ─────────────────────────────────────────────────────────────────────────────
//  Personajes del leaderboard.
//
//  Cada personaje es una carpeta dentro de avatars/sprites/ con cuatro imágenes:
//      parado.png · caminando.png · festejo.png · sentado.png
//
//  Para cambiar el tuyo:
//    1. Creá la carpeta avatars/sprites/<tu-nombre>/ (minúsculas, sin espacios ni acentos).
//    2. Poné adentro las cuatro imágenes en el mismo estilo que las que ya están:
//       PNG con fondo transparente, recortado justo al personaje, mirando a la derecha,
//       con los pies tocando el borde de abajo. Parado mide unos 96 px de alto (pixel art).
//       "festejo" es con los brazos arriba y "sentado" con las piernas cruzadas.
//       Si te falta alguna pose, se usa la de parado.
//    3. Cambiá tu línea en AVATARES para que apunte a tu carpeta y subilo al repo.
//  Los personajes actuales se generan desde hojas de sprites con tools/sprites/generar.sh.
//
//  Animaciones (opcional): dentro de tu carpeta, una carpeta por animación con los cuadros
//  numerados (trofeo/1.png, trofeo/2.png…), todos del mismo tamaño y con los pies a la
//  misma altura, más un archivo animaciones.json. Cada animación es UNA sola acción continua
//  (no mezclar objetos ni actividades distintas). Ejemplo de animaciones.json:
//      "podio": { "gana": "trofeo", "otro": "dino", "ultimo": "piso" }
//          → qué animación usa en el podio: 1.º, 2.º/3.º y 4.º (el 4.º queda en el piso, al costado)
//      "animaciones": { "trofeo": { "titulo": "levanta la copa", "cuadros": 6,
//                                   "ms": 420, "pausa": 1400, "alto": 102 } }
//  ms = tiempo por cuadro, pausa = tiempo en el último cuadro, alto = alto en píxeles del
//  personaje parado dentro de esos cuadros (para que quede en la misma escala que el resto).
//  Se usan en el podio; también aparecen en tu perfil (perfil.html?n=TuNombre).
//
//  Atlas (recomendado): en vez de imágenes sueltas, la carpeta puede tener solo atlas.png (todas las
//  poses y cuadros en una imagen) y atlas.json (dónde está cada uno). Carga más rápido y no parpadea.
//  Se arma desde la carpeta con imágenes sueltas con:  python tools/sprites/empaquetar.py <carpeta> <salida>
//
//  Mascota (opcional): una imagen PNG chica en avatars/mascotas/<id>.png, con fondo
//  transparente y mirando a la derecha. Se agrega en MASCOTAS, más abajo, y aparece
//  a los pies del personaje.
//
//  La corona, las medallas, la estrella, el rayo, la lamparita y los zzz no van en las
//  imágenes: los agrega el tablero según lo que pasa cada día.
// ─────────────────────────────────────────────────────────────────────────────

// Cambiá este número cada vez que actualices imágenes, así todos ven las nuevas sin limpiar la caché.
window.AVATARES_VERSION = "16";

// Personajes de reserva para jugadores que no figuran en AVATARES (siempre el mismo para el mismo
// nombre). Vacío: un jugador sin personaje propio se muestra sin dibujo hasta que se le asigne uno.
window.SPRITES = [];

// Nombre en el tablero → carpeta en avatars/sprites/
window.AVATARES = {
  "Andy": "andy",
  "Dante": "dante",
  "Fran": "fran",
  "Nico": "nico",
};

// Nombre en el tablero → mascota en avatars/mascotas/
window.MASCOTAS = {
  "Nico": "dino",
};
