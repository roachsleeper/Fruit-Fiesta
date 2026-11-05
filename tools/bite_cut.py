"""Bite + explicit cross-section face (crust rim, syrup, big apple chunks).

Unlike ring painting, the cut face is drawn as an explicit band along the bite
arc, facing into the pie, with hand-placed apple chunks so the filling is
actually readable at 1x.

Reference is never modified (read-only backup + hash check); outputs go to
assets/variants/<stem>_<ts>_<label>/.
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
SYRUP = (150, 64, 22, 255)
SYRUP_D = (128, 52, 17, 255)
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


def draw(im, cx, cy, r, teeth, cut=26, rim=6, chunk_r=9, chunks=(-0.38, 0.02, 0.42), face_dir=1.0):
    w, h = im.size
    px = im.load()
    amp, lobes = teeth

    def bite_r(theta):
        return r + (amp * math.sin(theta * lobes) if amp else 0)

    # chunk centres in cartesian space (staggered depth so it reads as fruit)
    dist_f = (0.42, 0.56, 0.36)
    sizes = (18, 20, 11)
    chunk_pts = []
    for a, f, sz in zip(chunks, dist_f, sizes):
        th = a * face_dir
        d = r + cut * f
        chunk_pts.append((cx + d * math.cos(th), cy + d * math.sin(th), sz))

    for y in range(max(0, int(cy - r - cut - rim - 4)), min(h, int(cy + r + cut + rim + 4))):
        for x in range(max(0, int(cx - r - cut - rim - 4)), min(w, int(cx + r + cut + rim + 4))):
            if px[x, y][3] == 0:
                continue
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            th = math.atan2(dy, dx)
            facing = math.cos(th) * face_dir

            if d <= bite_r(th):
                px[x, y] = (0, 0, 0, 0)
                continue

            if d <= bite_r(th) + 4:            # cut edge line
                px[x, y] = OUTLINE
                continue

            # tapered cut face: wide where it faces the viewer, thin at the ends
            face = 0.35 + 0.65 * max(0.0, facing) ** 0.7
            band = cut * face

            if facing > 0.02 and d <= bite_r(th) + 4 + band:
                col = SYRUP
                for ccx, ccy, cr in chunk_pts:
                    dx2, dy2 = x + 0.5 - ccx, y + 0.5 - ccy
                    ax, ay = abs(dx2) / cr, abs(dy2) / (cr * 0.82)
                    # squarish blob (superellipse) instead of a circle
                    if ax ** 3 + ay ** 3 <= 1.0:
                        col = APPLE
                        if dx2 < -1 and dy2 < -1 and ax ** 3 + ay ** 3 <= 0.45:
                            col = APPLE_L
                    elif ax ** 3 + ay ** 3 <= 1.55:
                        col = SYRUP_D
                # dark seam where the syrup meets the crust rim
                if d > bite_r(th) + 4 + band - 3:
                    col = SYRUP_D
                px[x, y] = col
                continue

            if facing > 0.02 and d <= bite_r(th) + 4 + band + rim:
                px[x, y] = CRUST_L
                continue

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
    ap.add_argument("--radius", type=float, default=46)
    ap.add_argument("--teeth", nargs=2, type=float, default=(8, 4))
    ap.add_argument("--cut", type=float, default=26)
    ap.add_argument("--rim", type=float, default=6)
    ap.add_argument("--face-dir", type=float, default=1.0)
    ap.add_argument("--label", default="cut")
    ap.add_argument("--scale", type=int, default=2)
    a = ap.parse_args()

    ref = os.path.abspath(a.image)
    backup, digest = protect(ref)
    before = sha256(ref)

    im = Image.open(backup).convert("RGBA")
    draw(im, a.center[0], a.center[1], a.radius, tuple(a.teeth), a.cut, a.rim, face_dir=a.face_dir)

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
        "operation": "bite-cut",
        "reference": {"backup": backup, "sha256": digest, "verified_after": after},
        "params": {"center": a.center, "radius": a.radius, "teeth": a.teeth,
                   "cut": a.cut, "rim": a.rim, "face_dir": a.face_dir},
        "outputs": {"png": outx, "png_1x": out1},
        "created": dt.datetime.now().isoformat(timespec="seconds"),
    }
    with open(os.path.join(run, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(outx)


if __name__ == "__main__":
    main()

