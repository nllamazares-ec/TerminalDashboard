"""Hoja de medallas: hojas/medallas.png (fondo magenta, 12 medallas en 4×3, en el orden de DEFS de
avatars/logros.js) → salida/medallas.png (grilla de 4×3 celdas de LADO px, fondo transparente, pixel art).

Uso:  python medallas.py hojas/medallas.png salida/medallas.png
"""
import sys, os, shutil, numpy as np
from PIL import Image
from scipy import ndimage as nd
from pixelize import pixelize

src, out = sys.argv[1], sys.argv[2]
LADO = 64

a = np.array(Image.open(src).convert('RGB')).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mag = (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 70)
lab, _ = nd.label(mag)
borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
fg = nd.binary_opening(~np.isin(lab, list(borde)), iterations=1)

lab, n = nd.label(fg, structure=np.ones((3, 3)))
objs = nd.find_objects(lab)
sizes = nd.sum(fg, lab, range(1, n + 1))
figs = sorted(range(n), key=lambda i: -sizes[i])[:12]
# orden de lectura: por fila (centro en y) y después por x
alto_fila = a.shape[0] / 3
figs.sort(key=lambda i: (int(((objs[i][0].start + objs[i][0].stop) / 2) // alto_fila), objs[i][1].start))
grupos = {f: [f] for f in figs}
for i in range(n):                       # brillitos sueltos: a la medalla más cercana
    if i in grupos or sizes[i] < 6: continue
    cy, cx = [(s.start + s.stop) / 2 for s in objs[i]]
    f = min(figs, key=lambda f: ((objs[f][0].start + objs[f][0].stop) / 2 - cy) ** 2 + ((objs[f][1].start + objs[f][1].stop) / 2 - cx) ** 2)
    grupos[f].append(i)

tmp = os.path.join(os.path.dirname(out) or '.', '_medallas')
shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
for j, f in enumerate(figs):
    principal = nd.binary_erosion(lab == f + 1, iterations=2)       # sin el borde rosado
    m = principal | np.isin(lab, [i + 1 for i in grupos[f] if i != f])
    ys, xs = np.where(m)
    t, bt, l, rr = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    im = Image.fromarray(np.dstack([a[t:bt, l:rr].astype(np.uint8), (m[t:bt, l:rr] * 255).astype(np.uint8)]), 'RGBA')
    k = (LADO - 2) / max(im.width, im.height)
    im = im.convert('RGBa').resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).convert('RGBA')
    im.save(os.path.join(tmp, f'{j + 1:02d}.png'))
pixelize(tmp)

hoja = Image.new('RGBA', (LADO * 4, LADO * 3))
for j in range(12):
    im = Image.open(os.path.join(tmp, f'{j + 1:02d}.png'))
    x, y = (j % 4) * LADO, (j // 4) * LADO
    hoja.alpha_composite(im, (x + (LADO - im.width) // 2, y + (LADO - im.height) // 2))
hoja.save(out, optimize=True)
shutil.rmtree(tmp)
print(f'medallas: 12 en {hoja.width}x{hoja.height}')
