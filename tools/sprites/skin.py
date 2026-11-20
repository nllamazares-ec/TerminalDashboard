import numpy as np
SRC = np.array([248, 179, 124.]); DST = np.array([210, 134, 88.])

def mask(a, smin=.24, smax=.62):
    a = a.astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); v = mx / 255; s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    h = np.where(mx == r, (60 * (g - b) / np.maximum(mx - mn, 1)) % 360, 0)
    return (mx == r) & (h >= 14) & (h <= 36) & (s >= smin) & (s <= smax) & (v >= .74)

def tone(a, src=SRC, dst=DST, smin=.24, smax=.62):
    a = a.copy(); m = mask(a, smin, smax)
    a[m] = np.clip(a[m] * (np.asarray(dst, float) / np.asarray(src, float)), 0, 255).round().astype(a.dtype)
    return a
