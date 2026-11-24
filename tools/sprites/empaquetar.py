"""Empaqueta una carpeta de sprites (poses + carpetas de animación + animaciones.json) en
una sola imagen atlas.png y un atlas.json con la posición de cada cuadro.

Uso:  python empaquetar.py <carpeta-con-sprites> <carpeta-de-salida>

atlas.json:
  { "imagen": "atlas.png",
    "poses": { "parado": [x, y, w, h], ... },
    "podio": { "gana": "...", "otro": "...", "ultimo": "..." },
    "animaciones": { "trofeo": { "titulo", "ms", "pausa", "alto", "mascota",
                                 "w", "h", "cuadros": [[x, y], ...] }, ... } }
Todos los cuadros de una animación tienen el mismo tamaño (w × h).
"""
import sys, os, json
from PIL import Image

POSES = ["parado", "caminando", "festejo", "sentado"]
PAD = 4          # separación transparente entre cuadros, para que no se mezclen al agrandar
ANCHO = 1024     # ancho máximo del atlas


def empaquetar(src, out):
    items = []   # (clave, imagen)
    for p in POSES:
        f = os.path.join(src, p + ".png")
        if os.path.exists(f): items.append((("pose", p), Image.open(f).convert("RGBA")))
    man = {}
    fj = os.path.join(src, "animaciones.json")
    if os.path.exists(fj):
        man = json.load(open(fj, encoding="utf-8"))
    for nombre, a in man.get("animaciones", {}).items():
        for i in range(a["cuadros"]):
            items.append((("anim", nombre, i), Image.open(os.path.join(src, nombre, f"{i + 1}.png")).convert("RGBA")))

    # estantes: de más alto a más bajo, llenando filas de hasta ANCHO px
    orden = sorted(range(len(items)), key=lambda i: -items[i][1].height)
    pos, x, y, fila = {}, PAD, PAD, 0
    for i in orden:
        im = items[i][1]
        if x + im.width + PAD > ANCHO and x > PAD:
            x, y, fila = PAD, y + fila + PAD, 0
        pos[i] = (x, y)
        x += im.width + PAD
        fila = max(fila, im.height)
    W = max(pos[i][0] + items[i][1].width for i in pos) + PAD
    H = y + fila + PAD
    atlas = Image.new("RGBA", (W, H))
    for i, (x, y) in pos.items():
        atlas.paste(items[i][1], (x, y))

    poses, anims = {}, {}
    for i, (clave, im) in enumerate(items):
        x, y = pos[i]
        if clave[0] == "pose":
            poses[clave[1]] = [x, y, im.width, im.height]
        else:
            nombre = clave[1]
            a = man["animaciones"][nombre]
            if nombre not in anims:
                anims[nombre] = {k: a[k] for k in ("titulo", "ms", "pausa", "pausaEn", "alto", "mascota") if k in a}
                anims[nombre].update(w=im.width, h=im.height, cuadros=[None] * a["cuadros"])
            anims[nombre]["cuadros"][clave[2]] = [x, y]
    # "orden": secuencia de reproducción (puede repetir cuadros, p. ej. ida y vuelta) sin duplicar imágenes
    for nombre, a in man.get("animaciones", {}).items():
        if "orden" in a and nombre in anims:
            anims[nombre]["cuadros"] = [anims[nombre]["cuadros"][i] for i in a["orden"]]

    os.makedirs(out, exist_ok=True)
    atlas.save(os.path.join(out, "atlas.png"), optimize=True)
    data = {"imagen": "atlas.png", "poses": poses, "podio": man.get("podio", {}), "animaciones": anims}
    # una línea por animación: fácil de leer y de comparar en git
    partes = [f'  "imagen": "atlas.png"',
              f'  "poses": {json.dumps(poses)}',
              f'  "podio": {json.dumps(data["podio"])}',
              '  "animaciones": {\n' + ",\n".join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in anims.items()) + "\n  }"]
    open(os.path.join(out, "atlas.json"), "w", encoding="utf-8").write("{\n" + ",\n".join(partes) + "\n}\n")
    return W, H, len(items)


if __name__ == "__main__":
    W, H, n = empaquetar(sys.argv[1], sys.argv[2])
    print(f"{sys.argv[2]}: {n} cuadros en {W}×{H}")
