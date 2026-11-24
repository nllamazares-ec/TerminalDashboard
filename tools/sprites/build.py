import os, json, numpy as np
from PIL import Image
ALTO = int(os.environ.get('ALTO', 104))   # alto del personaje parado en las imágenes de salida

from scipy import ndimage as nd

def anchor(im, mode):
    """(x, y) de referencia del cuadro: los cuadros se superponen haciendo coincidir este punto."""
    arr = np.array(im); al = arr[..., 3] > 0; h = al.shape[0]
    if mode == 'bloque':      # el bloque (? o ladrillo) queda quieto: centro y borde de arriba del bloque
        r, g, b = (arr[..., i].astype(int) for i in range(3))
        m = al & (r > 150) & (g > 50) & (g < 210) & (b < 90) & (r - b > 90)
        m[int(h * .5):] = False
        lab, n = nd.label(m)
        k = 1 + int(np.argmax(nd.sum(m, lab, range(1, n + 1))))
        ys, xs = np.where(lab == k)
        return (xs.min() + xs.max()) / 2, ys.max()
    xs = np.where(al[int(h * .92):].any(0))[0]
    return (xs.min() if mode == 'talon' else (xs.min() + xs.max()) / 2), h

def build(S, stand, out, poses, anims, podio, preview):
    cut = lambda b, i: S.cut(b, i, ALTO / stand[b])
    os.makedirs(out, exist_ok=True)
    for pose, (b, i) in poses.items(): cut(b, i).save(f'{out}/{pose}.png')
    A = {}
    for name, spec in anims.items():
        ims = [cut(b, i) for b, i in spec['frames']]
        anc = [anchor(im, spec.get('anclaje', 'pies')) for im in ims]
        L = max(ax for ax, _ in anc); R = max(im.width - ax for im, (ax, _) in zip(ims, anc))
        T = max(ay for _, ay in anc); H = int(np.ceil(max(T - ay + im.height for im, (_, ay) in zip(ims, anc))))
        W = int(np.ceil(L + R))
        if 'suelo' in spec:       # el piso es el de este cuadro: lo que quede más abajo se recorta
            i = spec['suelo']; H = int(round(T - anc[i][1] + ims[i].height))
        os.makedirs(f'{out}/{name}', exist_ok=True)
        for j, (im, (ax, ay)) in enumerate(zip(ims, anc)):
            c = Image.new('RGBA', (W, H)); c.alpha_composite(im, (int(round(L - ax)), int(round(T - ay)))); c.save(f'{out}/{name}/{j + 1}.png')
        A[name] = {k: v for k, v in dict(titulo=spec['titulo'], cuadros=len(ims), ms=spec['ms'], pausa=spec.get('pausa'), alto=ALTO, mascota=spec.get('mascota')).items() if v is not None}
    lines = ',\n'.join(f'    {json.dumps(k) + ":":<10} {json.dumps(v, ensure_ascii=False)}' for k, v in A.items())
    open(f'{out}/animaciones.json', 'w', encoding='utf-8').write('{\n  "podio": ' + json.dumps(podio).replace('{', '{ ').replace('}', ' }') + ',\n  "animaciones": {\n' + lines + '\n  }\n}\n')
    rows = [[Image.open(f'{out}/{p}.png') for p in poses]]
    for k, v in A.items(): rows.append([Image.open(f'{out}/{k}/{j + 1}.png') for j in range(v['cuadros'])])
    W = max(sum(i.width + 8 for i in r) for r in rows); H = sum(max(i.height for i in r) + 8 for r in rows)
    c = Image.new('RGBA', (W, H), (70, 110, 70, 255)); y = 0
    for r in rows:
        h = max(i.height for i in r); x = 0
        for i in r: c.alpha_composite(i, (x, y + h - i.height)); x += i.width + 8
        y += h + 8
    c.resize((W * 2, H * 2), Image.NEAREST).save(preview)
