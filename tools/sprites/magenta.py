"""Procesa una hoja de sprites con fondo magenta (#FF00FF) y una animación por fila.

Lo usan los scripts de cada personaje (fran.py, andy.py…) pasándole su configuración:
  filas        nombres de las filas, de arriba hacia abajo
  cuadros      cuántos cuadros tiene cada fila
  referencia   (fila, cuadro) del personaje parado: su alto pasa a ser ALTO
  igualar      filas cuyo 1.er cuadro es el personaje parado y que pueden venir dibujadas a otra
               escala: se igualan a la referencia
  poses        {"parado": (fila, cuadro), ...}
  anims        {"nombre": {"fila", "titulo", "ms", "pausa", "anclaje"?, "mascota"?}}  mascota: True si la
               mascota ya aparece dentro de los cuadros (el tablero no dibuja otra al lado)  anclaje: "grande" (pie de atrás de la figura más ancha, p. ej. la moto), "centro" (por defecto,
               centro del cuerpo) o "talon" (el pie de atrás queda fijo: para caídas hacia adelante)
  podio        {"gana", "otro", "ultimo"}
  por_columnas filas donde cada cuadro tiene varias figuras grandes (ej. Nico + el dino): los cuadros
               se separan por los espacios vacíos más anchos entre columnas
  transformar  función que recibe la imagen (uint8) y la devuelve cambiada (ej. tono de piel)
  mascota      (fila, cuadro, ruta): guarda ese cuadro como imagen de la mascota, en la misma escala
  extras       hojas adicionales del mismo personaje: [{"src", "filas", "cuadros", "por_columnas"?}]
               sus filas se suman a las de la hoja principal (con la misma escala y transformación)
  igualar      también puede ser {fila: fila_de_referencia} para escalar una fila según otra
  poses        un 3.er elemento "solo" toma solo la figura principal (sin efectos ni mascota)
  sin_tinte    True si el personaje no tiene nada magenta/rosa: los píxeles teñidos por el fondo
               (rayos de las ruedas, bordes claros) pasan a gris
"""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage as nd


def procesar(src, out, filas, cuadros, referencia, poses, anims, podio, igualar=(), alto=None, prev=None,
             por_columnas=(), transformar=None, mascota=None, sin_tinte=False, extras=()):
    ALTO = alto or int(os.environ.get('ALTO', 104))
    F, IMG = {}, {}
    _hoja(src, filas, cuadros, por_columnas, transformar, F, IMG)
    for ex in extras:
        _hoja(ex['src'], ex['filas'], ex['cuadros'], ex.get('por_columnas', ()), transformar, F, IMG)
    _salida(F, IMG, out, ALTO, referencia, poses, anims, podio, igualar, prev, mascota, sin_tinte)


def _hoja(src, filas, cuadros, por_columnas, transformar, F, IMG):
    a = np.array(Image.open(src).convert('RGB'))
    if transformar: a = transformar(a)
    a = a.astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # fondo = magenta conectado con el borde (un líquido violeta encerrado en un frasco no se borra)
    mag = (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 70)
    lab, _ = nd.label(mag)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(borde))
    # huecos de fondo encerrados (dentro de humo, anillos, entre brazos): magenta puro, rojo ≈ azul y altos
    fondo |= (g < 30) & (r > 220) & (b > 215) & (np.abs(r - b) < 25)
    fg = nd.binary_opening(~fondo, iterations=1)

    # filas: franjas horizontales con contenido
    franjas, en, y0 = [], False, 0
    for y, hay in enumerate(fg.any(1)):
        if hay and not en: en, y0 = True, y
        if not hay and en:
            en = False
            if y - y0 > 40: franjas.append((y0, y))
    if en: franjas.append((y0, len(fg)))
    # si dos filas se tocan (chispas de una que llegan a la otra), se corta la franja más alta
    # por la línea con menos contenido de su parte central
    cuenta = fg.sum(1)
    while len(franjas) < len(filas):
        i = max(range(len(franjas)), key=lambda i: franjas[i][1] - franjas[i][0])
        y0, y1 = franjas[i]; h = y1 - y0
        corte = y0 + int(h * .3) + int(np.argmin(cuenta[y0 + int(h * .3):y0 + int(h * .7)]))
        franjas[i:i + 1] = [(y0, corte), (corte + 1, y1)]
    # si sobran franjas (chispas sueltas arriba de una fila), la más baja se une a la vecina más cercana
    while len(franjas) > len(filas):
        i = min(range(len(franjas)), key=lambda i: franjas[i][1] - franjas[i][0])
        gap = lambda j: abs(franjas[j][0] - franjas[i][1]) if j > i else abs(franjas[i][0] - franjas[j][1])
        j = min([j for j in (i - 1, i + 1) if 0 <= j < len(franjas)], key=gap)
        a_, b_ = sorted((i, j))
        franjas[a_:b_ + 1] = [(franjas[a_][0], franjas[b_][1])]
    assert len(franjas) == len(filas), f'se esperaban {len(filas)} filas y hay {len(franjas)}: {franjas}'

    def cuadros_de(y0, y1, n):
        """Las n figuras más grandes de la fila, con sus efectos (chispas, humo, zzz) asignados a la más cercana."""
        sub = fg[y0:y1]
        lab, k = nd.label(sub, structure=np.ones((3, 3)))
        objs = nd.find_objects(lab)
        sizes = nd.sum(sub, lab, range(1, k + 1))
        figs = sorted(sorted(range(k), key=lambda i: -sizes[i])[:n], key=lambda i: objs[i][1].start)
        grupos = {f: [f] for f in figs}
        for i in range(k):
            if i in grupos or sizes[i] < 6: continue
            cx = (objs[i][1].start + objs[i][1].stop) / 2
            f = min(figs, key=lambda f: 0 if objs[f][1].start <= cx <= objs[f][1].stop else min(abs(cx - objs[f][1].start), abs(cx - objs[f][1].stop)))
            grupos[f].append(i)
        res = []
        for f in figs:
            cuerpo = nd.binary_erosion(lab == f + 1, iterations=2)          # sin el borde rosado
            extras = np.isin(lab, [i + 1 for i in grupos[f] if i != f])     # efectos finitos: enteros
            res.append((cuerpo, cuerpo | extras, y0))
        return res

    def cuadros_por_columnas(y0, y1, n):
        """n cuadros separados por los n-1 espacios vacíos más anchos; todo lo de cada tramo es un cuadro."""
        sub = fg[y0:y1]
        col = sub.any(0)
        tramos, en, x0 = [], False, 0
        for x, hay in enumerate(col):
            if hay and not en: en, x0 = True, x
            if not hay and en: en = False; tramos.append((x0, x))
        if en: tramos.append((x0, len(col)))
        huecos = sorted(range(len(tramos) - 1), key=lambda i: -(tramos[i + 1][0] - tramos[i][1]))[:n - 1]
        cortes = [0] + sorted(tramos[i][1] for i in huecos) + [len(col)]
        lab, k = nd.label(sub, structure=np.ones((3, 3)))
        sizes = nd.sum(sub, lab, range(1, k + 1))
        grandes = np.isin(lab, [i + 1 for i in range(k) if sizes[i] >= 300])
        limpio = nd.binary_erosion(grandes, iterations=2) | (sub & ~grandes)   # borde rosado fuera solo en lo grande
        res = []
        for c0, c1 in zip(cortes, cortes[1:]):
            m = np.zeros_like(sub); m[:, c0:c1] = limpio[:, c0:c1]
            res.append((m, m, y0))
        return res

    for nombre, (y0, y1), n in zip(filas, franjas, cuadros):
        F[nombre] = (cuadros_por_columnas if nombre in por_columnas else cuadros_de)(y0, y1, n)
        IMG[nombre] = a


def _salida(F, IMG, out, ALTO, referencia, poses, anims, podio, igualar, prev, mascota, sin_tinte):

    def alto_de(fila, i=0):
        yy = np.where(F[fila][i][0].any(1))[0]
        return yy.max() - yy.min() + 1

    ref = alto_de(*referencia)
    k = ALTO / ref
    igualar = igualar if isinstance(igualar, dict) else {f: f for f in igualar}
    escala = {fila: ref / alto_de(base) for fila, base in igualar.items()}

    def recorte(mask, y0, fila):
        kk = k * escala.get(fila, 1)
        ys, xs = np.where(mask)
        t, bt, l, rr = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgb = IMG[fila][y0 + t:y0 + bt, l:rr].copy()
        if sin_tinte:
            R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
            t_ = (R - G > 25) & (B - G > 25) & (np.abs(R - B) < 70)
            gris = (R * .3 + G * .59 + B * .11)[t_]
            rgb[t_] = np.stack([gris, gris, gris], -1)
        rgba = np.dstack([rgb.astype(np.uint8), (mask[t:bt, l:rr] * 255).astype(np.uint8)])
        im = Image.fromarray(rgba, 'RGBA')
        im = im.convert('RGBa').resize((max(1, round(im.width * kk)), max(1, round(im.height * kk))), Image.LANCZOS).convert('RGBA')
        return im, l, kk

    def guardar_anim(fila, carpeta, anclaje='centro'):
        """Cuadros alineados por el centro del cuerpo (o por el pie de atrás), con el piso abajo."""
        ims, anc = [], []
        for cuerpo, todo, y0 in F[fila]:
            im, l, kk = recorte(todo, y0, fila)
            ys, xs = np.where(cuerpo)
            if anclaje == 'talon':
                x = xs[ys >= ys.max() - (ys.max() - ys.min()) * .1].min()
            elif anclaje == 'grande':      # rueda de atrás de la figura más grande (la moto), sin polvo ni rayitas
                lb, kk2 = nd.label(cuerpo)
                ob = nd.find_objects(lb)          # la más ancha (la moto), aunque el personaje tenga más píxeles
                g = 1 + max(range(kk2), key=lambda i: ob[i][1].stop - ob[i][1].start)
                gy, gx = np.where(lb == g)
                x = gx[gy >= gy.max() - (gy.max() - gy.min()) * .1].min()
            else:
                x = xs.mean()
            ims.append(im); anc.append((x - l) * kk)
        L = max(anc); R = max(im.width - cx for im, cx in zip(ims, anc))
        H = max(im.height for im in ims); W = int(np.ceil(L + R))
        os.makedirs(os.path.join(out, carpeta), exist_ok=True)
        for j, (im, cx) in enumerate(zip(ims, anc)):
            c = Image.new('RGBA', (W, H)); c.alpha_composite(im, (int(round(L - cx)), H - im.height))
            c.save(os.path.join(out, carpeta, f'{j + 1}.png'))
        return len(ims)

    os.makedirs(out, exist_ok=True)
    for pose, (fila, i, *modo) in poses.items():
        cuerpo, todo, y0 = F[fila][i]
        if modo and modo[0] == 'solo':          # figura principal sola (sin efectos ni mascota)
            lb, kk2 = nd.label(cuerpo)
            cuerpo = lb == 1 + int(np.argmax(nd.sum(cuerpo, lb, range(1, kk2 + 1))))
            todo = cuerpo
        recorte(todo, y0, fila)[0].save(os.path.join(out, pose + '.png'))

    if mascota:
        fila, i, ruta = mascota
        cuerpo, todo, y0 = F[fila][i]
        recorte(cuerpo, y0, fila)[0].save(ruta)        # solo la figura, sin los efectos de alrededor

    man = {'podio': podio, 'animaciones': {}}
    for nombre, d in anims.items():
        n = guardar_anim(d['fila'], nombre, d.get('anclaje', 'centro'))
        man['animaciones'][nombre] = {'titulo': d['titulo'], 'cuadros': n, 'ms': d['ms'], 'pausa': d['pausa'], 'alto': ALTO}
        if d.get('mascota'): man['animaciones'][nombre]['mascota'] = True    # la mascota ya está en los cuadros
    lines = ',\n'.join(f'    {json.dumps(n) + ":":<12} {json.dumps(v, ensure_ascii=False)}' for n, v in man['animaciones'].items())
    open(os.path.join(out, 'animaciones.json'), 'w', encoding='utf-8').write(
        '{\n  "podio": ' + json.dumps(podio).replace('{', '{ ').replace('}', ' }') + ',\n  "animaciones": {\n' + lines + '\n  }\n}\n')

    if prev:   # vista previa: poses y animaciones, una fila cada una
        filas_prev = [[Image.open(os.path.join(out, p + '.png')) for p in poses]]
        for nombre, v in man['animaciones'].items():
            filas_prev.append([Image.open(os.path.join(out, nombre, f'{j + 1}.png')) for j in range(v['cuadros'])])
        W = max(sum(i.width + 8 for i in f) for f in filas_prev); H = sum(max(i.height for i in f) + 8 for f in filas_prev)
        c = Image.new('RGBA', (W, H), (22, 26, 32, 255)); y = 0
        for f in filas_prev:
            h = max(i.height for i in f); x = 0
            for i in f: c.alpha_composite(i, (x, y + h - i.height)); x += i.width + 8
            y += h + 8
        c.resize((W * 2, H * 2), Image.NEAREST).save(prev)
    print(f'{os.path.basename(out)}: escala {k:.3f}')
