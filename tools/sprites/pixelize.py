"""Convierte una carpeta de sprites a pixel art real: alfa binario y una paleta común por personaje."""
import sys, glob, numpy as np
from PIL import Image

def _pal(px, n):
    strip = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8), 'RGB')
    q = strip.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return np.array(q.getpalette()[:3 * n]).reshape(-1, 3)

def _unir_parecidos(pal, px, umbral=14):
    """Une colores de la paleta casi idénticos (p. ej. varios negros con apenas otro tinte, que se ven
    como puntitos). Se queda con el más usado de cada grupo."""
    d = ((px[:, None, :].astype(int) - pal[None]) ** 2 * np.array([3, 4, 2])).sum(-1)
    usos = np.bincount(d.argmin(1), minlength=len(pal))
    orden = np.argsort(-usos)
    final = []
    for i in orden:
        if all(np.sqrt(((pal[i] - pal[j]) ** 2).sum()) > umbral for j in final):
            final.append(i)
    return pal[final]


def pixelize(folder, extra=(), grandes=32, acentos=24):
    files = sorted(glob.glob(f'{folder}/**/*.png', recursive=True)) + list(extra)
    ims = {f: np.array(Image.open(f).convert('RGBA')) for f in files}
    for a in ims.values():
        a[..., 3] = np.where(a[..., 3] >= 120, 255, 0)
    px = np.concatenate([a[a[..., 3] > 0][:, :3] for a in ims.values()])
    # paleta = colores según cuánto ocupan (ropa, pelo, piel) + colores pesando todos igual
    # (acentos chicos como el dorado del trofeo, las zapatillas o el corazón)
    pal = [_pal(px, grandes), _pal(np.unique((px // 6) * 6 + 3, axis=0), acentos)]
    # muy saturados: un claro y un oscuro por cada franja de tono (así el rojo del corazón no se vuelve naranja)
    mx, mn = px.max(1).astype(float), px.min(1).astype(float)
    vivos = px[(mx - mn) > .55 * np.maximum(mx, 1)].astype(float)
    if len(vivos):
        r, g, b = vivos.T; M, m = vivos.max(1), vivos.min(1); d = np.maximum(M - m, 1)
        h = np.where(M == r, ((g - b) / d) % 6, np.where(M == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
        for k in range(30):
            sel = vivos[(h >= k * 12) & (h < k * 12 + 12)]
            if len(sel) >= 6:
                br = sel.sum(1); lo, hi = np.percentile(br, [25, 75])
                pal.append(np.array([np.median(sel[br <= lo], 0), np.median(sel[br >= hi], 0)]))
    pal = np.concatenate(pal)
    pal = np.unique(pal.round().astype(int), axis=0)
    pal = _unir_parecidos(pal, px)
    for f, a in ims.items():
        # color más cercano de la paleta (distancia ponderada como la ve el ojo)
        c = a[..., :3].reshape(-1, 1, 3).astype(int)
        d = ((c - pal[None]) ** 2 * np.array([3, 4, 2])).sum(-1)
        rgb = pal[d.argmin(1)].reshape(a.shape[:2] + (3,)).astype(np.uint8)
        out = np.dstack([rgb, a[..., 3]])
        out[out[..., 3] == 0] = 0
        Image.fromarray(out, 'RGBA').save(f, optimize=True)

if __name__ == '__main__':
    pixelize(sys.argv[1], sys.argv[2:])
