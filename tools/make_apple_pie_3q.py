"""Pixel-art apple pie, 3/4 view (above + side), Fruit Fiesta palette.

Design notes:
  * top ellipse is foreshortened (ry ~ rx/2) so the pie reads as seen from above
  * a side wall is extruded below the front half of the ellipse for volume
  * lattice strips are computed in *plan space* so they foreshorten correctly
  * hard edges only: every pixel is a palette entry, no anti-aliasing

Exports: apple-pie.png (8x) and apple-pie-1x.png (game asset)
"""
from PIL import Image
import math
import random

W = H = 72
CX, CY = 36.0, 29.0
RX, RY = 28.0, 14.5
WALL = 9.0
CYB, RYB = CY + WALL, RY * 0.94

OUT      = (66, 10, 17, 255)
OUT_SOFT = (92, 30, 22, 255)
CRUST_L  = (242, 199, 137, 255)
CRUST_M  = (212, 151, 84, 255)
CRUST_D  = (166, 104, 54, 255)
CRUST_XD = (118, 68, 33, 255)
FILL_D   = (98, 38, 14, 255)
FILL_M   = (138, 56, 20, 255)
APPLE    = (188, 88, 36, 255)
APPLE_L  = (216, 124, 60, 255)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px = img.load()

rng = random.Random(5)
noise = {(gx, gy): rng.random()
         for gy in range(-2, H // 4 + 2)
         for gx in range(-2, W // 4 + 2)}


def front_y(cy, ry, x):
    k = 1.0 - ((x + 0.5 - CX) / RX) ** 2
    return cy + ry * math.sqrt(max(0.0, k))


def d_top(x, y):
    return math.hypot((x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY)


def angle(x, y):
    return math.atan2((y + 0.5 - CY) / RY, (x + 0.5 - CX) / RX)


# ---------------------------------------------------------------- side wall
for x in range(W):
    if abs(x + 0.5 - CX) > RX:
        continue
    y0 = front_y(CY, RY, x)
    y1 = front_y(CYB, RYB, x)
    for y in range(int(round(y0)), int(round(y1)) + 1):
        t = (y - y0) / max(1.0, (y1 - y0))
        c = CRUST_XD if t < 0.12 else CRUST_D
        if t > 0.62:
            c = CRUST_XD
        # fluted seams
        if int((x + 0.5 - CX) % 7) == 0 and 0.12 <= t < 0.9:
            c = CRUST_D if t < 0.45 else CRUST_XD
        # lit left side
        if (x + 0.5 - CX) < -RX * 0.45 and 0.1 < t < 0.45:
            c = CRUST_M
        px[x, y] = c
    # bottom lip outline
    yb = int(round(y1))
    if px[x, yb][3]:
        px[x, yb] = OUT

# ---------------------------------------------------------------- top surface
for y in range(H):
    for x in range(W):
        d = d_top(x, y)
        a = angle(x, y)
        edge = 1.0 + 0.028 * math.sin(a * 9.0)   # crimped silhouette
        if d > edge:
            continue

        dx = (x + 0.5 - CX) / RX
        dy = (y + 0.5 - CY) / RY
        light = -dx * 0.55 - dy * 0.85           # light from top-left

        if d > 0.945:
            px[x, y] = CRUST_M if light > 0 else CRUST_D
            continue

        # ---- rim
        if d > 0.755:
            c = CRUST_M
            if light > 0.45:
                c = CRUST_L
            elif light < -0.25:
                c = CRUST_D
            # crimp marks
            if (a * 9.0 / math.pi) % 1.0 < 0.16:
                c = CRUST_D if light < 0.25 else CRUST_L
            px[x, y] = c
            continue

        # ---- inner shadow under the rim
        if d > 0.726:
            px[x, y] = OUT_SOFT
            continue

        # ---- apple filling
        n = noise[(x // 4, y // 4)]
        c = FILL_D
        if n > 0.55:
            c = FILL_M
        if n > 0.75:
            c = APPLE
        if n > 0.90:
            c = APPLE_L

        # ---- lattice in plan space (so it foreshortens with the pie)
        u = (dx + dy) * 1.5
        v = (dx - dy) * 1.5
        fu = (u + 64.0) % 1.0
        fv = (v + 64.0) % 1.0
        on_u = fu < 0.30
        on_v = fv < 0.30
        if on_u or on_v:
            c = CRUST_L
            if (on_u and 0.22 <= fu < 0.30) or (on_v and 0.22 <= fv < 0.30):
                c = CRUST_D
            if on_u and on_v:
                c = CRUST_M if (fu < 0.08 or fv < 0.08) else CRUST_L
            px[x, y] = c
            continue

        # seam shadow next to each strip
        if fu < 0.37 or fv < 0.37:
            c = OUT_SOFT

        px[x, y] = c

# ------------------------------------------------------- fill pinholes
for _ in range(2):
    src = img.copy()
    sp = src.load()
    for y in range(H):
        for x in range(W):
            if sp[x, y][3] != 0:
                continue
            nb = [sp[nx, ny] for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1))
                  if 0 <= nx < W and 0 <= ny < H and sp[nx, ny][3] != 0]
            if len(nb) >= 3:
                px[x, y] = max(set(nb), key=nb.count)

# ------------------------------------------------------- silhouette outline
src = img.copy()
sp = src.load()
for y in range(H):
    for x in range(W):
        if sp[x, y][3] == 0:
            continue
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < W and 0 <= ny < H and sp[nx, ny][3] == 0:
                px[x, y] = OUT
                break

img.save(r"F:\Fruit Fiesta\apple-pie-1x.png")
img.resize((W * 8, H * 8), Image.NEAREST).save(r"F:\Fruit Fiesta\apple-pie.png")
print("ok")
