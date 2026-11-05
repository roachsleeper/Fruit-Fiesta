"""Redraw a bitten slice as a sunken notch with the inside exposed.

Geometry:
  * bite region B = cells inside a scalloped circle at the chosen edge
  * cells of B that touch the outside (<=2 cells) are removed -> the silhouette gap
  * the remaining cells of B are repainted as a cross-section:
        upper band  -> lit crust
        middle band -> apple filling + chunks
        lower band  -> bottom crust
  * the rim between kept pie and removed gap gets the sprite outline colour

Reference stays read-only; outputs land in assets/variants/<stem>_<ts>_<label>/.
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
FILL = (177, 86, 30, 255)
FILL_D = (150, 68, 24, 255)
APPLE = (252, 196, 106, 255)


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


def carve_dent(im, cx, cy, r, block, teeth, gap_cells=2, chunks=0.3):
    w, h = im.size
    px = im.load()
    cols = (w + block - 1) // block
    rows = (h + block - 1) // block
    amp, lobes = teeth

    # cell opacity map
    opaque = {}
    for gy in range(rows):
        for gx in range(cols):
            n = 0
            total = 0
            for y in range(gy * block, min(h, (gy + 1) * block)):
                for x in range(gx * block, min(w, (gx + 1) * block)):
                    total += 1
                    if px[x, y][3] > 0:
                        n += 1
            opaque[(gx, gy)] = n / max(total, 1)

    solid = {c for c, v in opaque.items() if v > 0.05}

    # bite region
    B = set()
    for gy in range(rows):
        for gx in range(cols):
            ccx, ccy = gx * block + block / 2, gy * block + block / 2
            a = math.atan2(ccy - cy, ccx - cx)
            rr = r + (amp * math.sin(a * lobes) if amp else 0)
            if math.hypot(ccx - cx, ccy - cy) <= rr:
                B.add((gx, gy))
    B &= solid

    if not B:
        return im

    # distance from each solid cell to the outside (in cells)
    INF = 10 ** 6
    dist = {c: (0 if c not in solid else INF) for c in
            ((gx, gy) for gy in range(rows) for gx in range(cols))}
    q = deque([c for c, d in dist.items() if d == 0])
    while q:
        gx, gy = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (gx + dx, gy + dy)
            if n in dist and dist[n] > dist[(gx, gy)] + 1:
                dist[n] = dist[(gx, gy)] + 1
                q.append(n)

    cleared = {c for c in B if dist.get(c, INF) <= gap_cells}
    kept = B - cleared

    def cell_pixels(c):
        gx, gy = c
        for y in range(gy * block, min(h, (gy + 1) * block)):
            for x in range(gx * block, min(w, (gx + 1) * block)):
                yield x, y

    # remove the gap
    for c in cleared:
        for x, y in cell_pixels(c):
            px[x, y] = (0, 0, 0, 0)

    # paint the sunken surface
    for c in kept:
        gx, gy = c
        ccy = gy * block + block / 2
        rel = (ccy - cy) / max(r, 1)
        hsh = (gx * 73856093 ^ gy * 19349663) & 0xFFFF
        if rel < -0.28:
            col = CRUST_L
        elif rel > 0.52:
            col = CRUST_M
        else:
            if hsh % 100 < chunks * 100:
                col = APPLE
            elif hsh % 100 < chunks * 100 + 12:
                col = FILL_D
            else:
                col = FILL
        for x, y in cell_pixels(c):
            if px[x, y][3] > 0:
                px[x, y] = col

    # outline where kept material meets the gap
    outline_cells = set()
    for gx, gy in kept:
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (gx + dx, gy + dy) in cleared:
                    outline_cells.add((gx, gy))
                    break
    for c in outline_cells:
        for x, y in cell_pixels(c):
            if px[x, y][3] > 0:
                px[x, y] = OUTLINE

    # drop islands
    unseen = {(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 0}
    comps = []
    while unseen:
        start = unseen.pop()
        comp, dq = [start], deque([start])
        while dq:
            x, y = dq.popleft()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if n in unseen:
                        unseen.discard(n)
                        comp.append(n)
                        dq.append(n)
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
    ap.add_argument("--teeth", nargs=2, type=float, default=(6, 3))
    ap.add_argument("--gap", type=int, default=2, help="depth of the missing edge, in blocks")
    ap.add_argument("--chunks", type=float, default=0.3)
    ap.add_argument("--label", default="bite")
    ap.add_argument("--scale", type=int, default=2)
    a = ap.parse_args()

    ref = os.path.abspath(a.image)
    backup, digest = protect(ref)
    before = sha256(ref)

    im = Image.open(backup).convert("RGBA")
    carve_dent(im, a.center[0], a.center[1], a.radius, a.block, tuple(a.teeth), a.gap, a.chunks)

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
        "operation": "bite-dent",
        "reference": {"backup": backup, "sha256": digest, "verified_after": after},
        "params": {"center": a.center, "radius": a.radius, "block": a.block, "teeth": a.teeth,
                   "gap": a.gap, "chunks": a.chunks},
        "outputs": {"png": outx, "png_1x": out1},
        "created": dt.datetime.now().isoformat(timespec="seconds"),
    }
    with open(os.path.join(run, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(outx)


if __name__ == "__main__":
    main()
