"""Redraw a bitten apple-pie slice on the reference's own pixel grid.

Not a hole punch: the bite is carved and then REDRAWN as a cross-section:
  outline -> crust -> exposed apple filling (with chunks) -> inner shadow
so the notch shows the inside of the pie.

Reference handling is unchanged: backed up read-only, hash verified before/after,
outputs in assets/variants/<stem>_<ts>_<label>/ with manifest.json.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
import os
import shutil
import stat
from collections import deque

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_STORE = os.path.join(ROOT, "assets", "reference")
VAR_ROOT = os.path.join(ROOT, "assets", "variants")

OUTLINE = (49, 24, 23, 255)
CRUST_L = (254, 224, 123, 255)
CRUST_M = (250, 185, 92, 255)
FILL = (156, 70, 25, 255)
FILL_D = (160, 76, 27, 255)
APPLE = (252, 196, 106, 255)
APPLE_L = (254, 224, 123, 255)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def protect(src):
    digest = sha256(src)
    os.makedirs(REF_STORE, exist_ok=True)
    stem, ext = os.path.splitext(os.path.basename(src))
    dst = os.path.join(REF_STORE, f"{stem}__{digest[:10]}{ext.lower()}")
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        os.chmod(dst, stat.S_IREAD)
    return dst, digest


def carve(im, cx, cy, r, block, teeth, crust_blocks=1, fill_blocks=2, shadow_blocks=1, cross=False):
    w, h = im.size
    px = im.load()
    cols = (w + block - 1) // block
    rows = (h + block - 1) // block
    amp, lobes = teeth

    def bite_radius(a):
        return r + (amp * math.sin(a * lobes) if amp else 0.0)

    removed = set()
    for gy in range(rows):
        for gx in range(cols):
            ccx, ccy = gx * block + block / 2, gy * block + block / 2
            a = math.atan2(ccy - cy, ccx - cx)
            if math.hypot(ccx - cx, ccy - cy) <= bite_radius(a):
                removed.add((gx, gy))

    def coverage(cell):
        gx, gy = cell
        total = opaque = 0
        for y in range(gy * block, min(h, (gy + 1) * block)):
            for x in range(gx * block, min(w, (gx + 1) * block)):
                total += 1
                if px[x, y][3] > 0:
                    opaque += 1
        return opaque / max(total, 1)

    removed = {c for c in removed if coverage(c) > 0}
    if not removed:
        return im

    # clear
    for gx, gy in removed:
        for y in range(gy * block, min(h, (gy + 1) * block)):
            for x in range(gx * block, min(w, (gx + 1) * block)):
                px[x, y] = (0, 0, 0, 0)

    def ring(cells, n):
        return {
            (gx + dx, gy + dy)
            for gx, gy in cells
            for dy in range(-n, n + 1)
            for dx in range(-n, n + 1)
            if max(abs(dx), abs(dy)) == n
        }

    layers = []
    bands = [
        (1, 1, "outline"),
        (2, 1 + crust_blocks, "crust"),
        (2 + crust_blocks, 1 + crust_blocks + fill_blocks, "fill"),
        (2 + crust_blocks + fill_blocks,
         1 + crust_blocks + fill_blocks + shadow_blocks, "shadow"),
    ]
    painted = set(removed)
    for lo, hi, kind in bands:
        cells = set()
        for n in range(lo, hi + 1):
            cells |= ring(removed, n)
        cells -= painted
        painted |= cells
        layers.append((cells, kind))

    def paint_cells(cells, colour, min_cov=0.25):
        for gx, gy in cells:
            if coverage((gx, gy)) < min_cov:
                continue
            for y in range(gy * block, min(h, (gy + 1) * block)):
                for x in range(gx * block, min(w, (gx + 1) * block)):
                    if px[x, y][3] > 0:
                        px[x, y] = colour

    for cells, kind in layers:
        if kind == "outline":
            paint_cells(cells, OUTLINE, 0.45)
        elif kind == "crust":
            if cross:
                # cut face: top crust / filling / bottom crust by vertical position
                for gx, gy in cells:
                    ccy = gy * block + block / 2
                    rel = (ccy - cy) / max(r, 1)
                    if rel < -0.35:
                        paint_cells({(gx, gy)}, CRUST_L, 0.0)
                    elif rel > 0.45:
                        paint_cells({(gx, gy)}, CRUST_M, 0.0)
                    else:
                        paint_cells({(gx, gy)}, FILL, 0.0)
            else:
                paint_cells(cells, CRUST_L, 0.30)
        elif kind == "fill":
            # exposed apple filling only on the face pointing into the pie
            for gx, gy in cells:
                ccx = gx * block + block / 2
                ccy = gy * block + block / 2
                theta = math.atan2(ccy - cy, ccx - cx)
                if math.cos(theta) < 0.15:
                    paint_cells({(gx, gy)}, CRUST_M, 0.0)
                    continue
                hsh = ((gx // 2) * 73856093 ^ (gy // 2) * 19349663) & 0xFFFF
                v = hsh % 100
                if v < 42:
                    col = APPLE
                elif v < 54:
                    col = APPLE_L
                elif v < 66:
                    col = FILL_D
                else:
                    col = FILL
                paint_cells({(gx, gy)}, col, 0.0)
        else:
            paint_cells(cells, FILL_D, 0.30)

    # drop islands
    unseen = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    comps = []
    while unseen:
        start = unseen.pop()
        comp, q = [start], deque([start])
        while q:
            x, y = q.popleft()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if n in unseen:
                        unseen.discard(n)
                        comp.append(n)
                        q.append(n)
        comps.append(comp)
    if comps:
        biggest = max(comps, key=len)
        for comp in comps:
            if comp is biggest:
                continue
            for x, y in comp:
                px[x, y] = (0, 0, 0, 0)

    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", default=os.path.join(REF_STORE, "apple-pie-slice__de650f7eba.png"))
    ap.add_argument("--center", nargs=2, type=float, required=True)
    ap.add_argument("--radius", type=float, default=44)
    ap.add_argument("--block", type=int, default=9)
    ap.add_argument("--teeth", nargs=2, type=float, default=(5, 5))
    ap.add_argument("--crust", type=int, default=1, help="crust band width in blocks")
    ap.add_argument("--filling", type=int, default=2, help="exposed filling width in blocks")
    ap.add_argument("--shadow", type=int, default=1)
    ap.add_argument("--cross", action="store_true", help="paint the bite as a layered cross-section")
    ap.add_argument("--label", default="bite")
    ap.add_argument("--scale", type=int, default=2)
    a = ap.parse_args()

    ref = os.path.abspath(a.image)
    backup, digest = protect(ref)
    before = sha256(ref)

    im = Image.open(backup).convert("RGBA")
    carve(im, a.center[0], a.center[1], a.radius, a.block, tuple(a.teeth),
          a.crust, a.filling, a.shadow, a.cross)

    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    stem = os.path.splitext(os.path.basename(ref))[0]
    run = os.path.join(VAR_ROOT, f"{stem}_{ts}_{a.label}")
    os.makedirs(run, exist_ok=True)
    out1 = os.path.join(run, f"{a.label}-1x.png")
    outx = os.path.join(run, f"{a.label}.png")
    im.save(out1)
    im.resize((im.width * a.scale, im.height * a.scale), Image.NEAREST).save(outx)

    after = sha256(ref)
    if after != before:
        raise SystemExit("ABORT: reference changed")

    manifest = {
        "operation": "bite-redraw",
        "reference": {"backup": backup, "sha256": digest, "verified_after": after},
        "params": {"center": a.center, "radius": a.radius, "block": a.block, "teeth": a.teeth,
                   "crust_blocks": a.crust, "filling_blocks": a.filling, "shadow_blocks": a.shadow},
        "outputs": {"png": outx, "png_1x": out1},
        "created": dt.datetime.now().isoformat(timespec="seconds"),
    }
    with open(os.path.join(run, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(outx)


if __name__ == "__main__":
    main()
