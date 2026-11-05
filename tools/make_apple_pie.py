"""Draw a pixel-art apple pie matching the Fruit Fiesta palette.

Grid is 64x64; the exported game asset is the 1x version, plus a 8x preview.
Palette is taken from assets/apple-fruit.png (outline #420A11, red #D33A35 ...)
extended with warm crust / filling tones.
"""
from PIL import Image
import math
import random

W = H = 64
CX, CY = 32.0, 33.5
RX, RY = 27.0, 20.0

OUT     = (66, 10, 17, 255)
OUT_SOFT= (96, 34, 24, 255)
CRUST_L = (236, 190, 124, 255)
CRUST_M = (208, 146, 78, 255)
CRUST_D = (160, 99, 50, 255)
FILL_D  = (108, 44, 16, 255)
FILL_M  = (146, 62, 24, 255)
APPLE   = (196, 96, 42, 255)
APPLE_L = (219, 128, 62, 255)

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
px = img.load()

rng = random.Random(7)
noise = {}
for gy in range(0, H // 4 + 1):
    for gx in range(0, W // 4 + 1):
        noise[(gx, gy)] = rng.random()


def norm(x, y):
    return math.hypot((x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY)


def angle(x, y):
    return math.atan2((y + 0.5 - CY) / RY, (x + 0.5 - CX) / RX)


def scallop(a):
    """Hand-crimped edge: 9 gentle bumps."""
    return 1.0 + 0.028 * math.sin(a * 9.0)


for y in range(H):
    for x in range(W):
        d = norm(x, y)
        a = angle(x, y)
        if d > scallop(a):
            continue

        dx = (x + 0.5 - CX) / RX
        dy = (y + 0.5 - CY) / RY
        light = (-dx - dy)  # -1 top-left .. +1 bottom-right

        # --- outer silhouette outline
        if d > 0.962:
            px[x, y] = OUT
            continue

        # --- crust rim
        if d > 0.74:
            c = CRUST_M
            if light > 0.55:
                c = CRUST_L
            elif light < -0.45:
                c = CRUST_D
            # crimp ridges radiating outwards
            if (a * 9.0 / math.pi) % 1.0 < 0.16:
                c = CRUST_D if light < 0.5 else CRUST_L
            if d < 0.765:
                c = OUT_SOFT
            px[x, y] = c
            continue

        # --- filling
        n = noise[(x // 4, y // 4)]
        c = FILL_M
        if n > 0.55:
            c = APPLE
        if n > 0.78:
            c = APPLE_L
        if n > 0.92:
            c = (230, 150, 80, 255)
        # inner shadow just under the rim
        if d > 0.69:
            c = FILL_D

        # --- lattice: two diagonal strip sets
        u = (x + 0.5 - CX) + (y + 0.5 - CY)
        v = (x + 0.5 - CX) - (y + 0.5 - CY)
        su = (u + 256.0) % 13.0
        sv = (v + 256.0) % 13.0
        on_u = su < 3.6
        on_v = sv < 3.6
        if on_u or on_v:
            c = CRUST_L
            # shadow on the lower/right edge of each strip
            if (on_u and 2.4 <= su < 3.6) or (on_v and 2.4 <= sv < 3.6):
                c = CRUST_D
            # overlapping strip gets a deeper seam
            if on_u and on_v:
                c = CRUST_M if (su < 0.9 or sv < 0.9) else CRUST_L
            px[x, y] = c
            continue

        # thin dark seam where strips sink into the filling
        if su < 4.8 or sv < 4.8:
            c = OUT_SOFT

        px[x, y] = c

# --- a couple of glints on the filling for readability
for gx, gy in ((24, 35), (40, 31), (33, 41)):
    d = norm(gx, gy)
    u = (gx + 0.5 - CX) + (gy + 0.5 - CY)
    v = (gx + 0.5 - CX) - (gy + 0.5 - CY)
    if d < 0.74 and ((u + 256) % 13) >= 5.6 and ((v + 256) % 13) >= 5.6:
        px[gx, gy] = (238, 168, 96, 255)

img.save(r"F:\Fruit Fiesta\apple-pie-1x.png")
img.resize((W * 8, H * 8), Image.NEAREST).save(r"F:\Fruit Fiesta\apple-pie.png")
print("wrote apple-pie.png (512) and apple-pie-1x.png (64)")
