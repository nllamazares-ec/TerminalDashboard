import numpy as np
from PIL import Image
from scipy import ndimage as nd

class Sheet:
    def __init__(self, src, bands, blank=(), shadow_azul=False):
        self.a = np.array(Image.open(src).convert('RGB')).astype(int)
        for x0, y0, x1, y1 in blank: self.a[y0:y1, x0:x1] = 255
        mn, mx = self.a.min(2), self.a.max(2)
        b, r = self.a[..., 2], self.a[..., 0]
        self.bgish = ((mn > 222) & (mx - mn < 22)) | ((mn > 100) & (mx - mn < 18))             | (shadow_azul & (mn > 120) & (mx - mn < 60) & (b >= r + 8))      # sombras azuladas bajo los pies
        self.bands = bands
        self.cache = {}

    def band(self, name):
        x0, x1, y0, y1 = self.bands[name]
        lab, _ = nd.label(self.bgish[y0:y1, x0:x1])
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        fg = ~np.isin(lab, list(edge))
        # huecos encerrados (entre las piernas, bajo un brazo): blanco de fondo puro y de cierto tamaño
        a = self.a[y0:y1, x0:x1]; mn, mx = a.min(2), a.max(2)
        abajo = np.zeros_like(fg); abajo[int(fg.shape[0] * .6):] = True      # solo cerca del piso (piernas)
        hueco, n = nd.label(fg & abajo & (mn > 243) & (mx - mn < 8))
        if n:
            sizes = nd.sum(np.ones_like(hueco), hueco, range(1, n + 1))
            fg &= ~np.isin(hueco, [i + 1 for i, s in enumerate(sizes) if s >= 80])
        fg = nd.binary_opening(fg, iterations=1)
        l2, n2 = nd.label(fg)
        sizes = nd.sum(fg, l2, range(1, n2 + 1))
        return np.isin(l2, [i + 1 for i, s in enumerate(sizes) if s >= 12]), (x0, y0)

    def groups(self, name, big=1500):
        if name in self.cache: return self.cache[name]
        fg, off = self.band(name)
        lab, n = nd.label(fg, structure=np.ones((3, 3)))
        objs = nd.find_objects(lab)
        sizes = nd.sum(fg, lab, range(1, n + 1))
        figs = sorted([i for i in range(n) if sizes[i] >= big], key=lambda i: objs[i][1].start)
        assign = {i: [i] for i in figs}
        for i in range(n):
            if i in assign: continue
            cx = (objs[i][1].start + objs[i][1].stop) / 2
            best = min(figs, key=lambda f: 0 if objs[f][1].start <= cx <= objs[f][1].stop else min(abs(cx - objs[f][1].start), abs(cx - objs[f][1].stop)))
            assign[best].append(i)
        out = []
        for f in figs:
            m = np.isin(lab, [k + 1 for k in assign[f]])
            ys, xs = np.where(m)
            out.append(dict(mask=m, box=(xs.min(), ys.min(), xs.max() + 1, ys.max() + 1), off=off))
        self.cache[name] = out
        return out

    def cut(self, band, i, k):
        g = self.groups(band)[i]; x0, y0, x1, y1 = g['box']; ox, oy = g['off']
        m = nd.binary_erosion(g['mask'], iterations=1)[y0:y1, x0:x1]
        rgb = self.a[oy + y0:oy + y1, ox + x0:ox + x1].astype(np.uint8)
        img = Image.fromarray(np.dstack([rgb, (m * 255).astype(np.uint8)]), 'RGBA')
        w, h = max(1, round(img.width * k)), max(1, round(img.height * k))
        arr = np.array(img.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA'))
        al = arr[..., 3]
        arr[..., 3] = np.where(al < 40, 0, np.minimum(255, al * 1.15)).astype(np.uint8)
        out = Image.fromarray(arr, 'RGBA')
        return out.crop(out.getbbox())
