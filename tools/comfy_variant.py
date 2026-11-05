"""Img2img variants of a reference sprite with hard safety guarantees.

Guarantees
----------
1. The reference file is never written to. Before every run it is copied into
   assets/reference/ (content-addressed by SHA-256) and marked read-only.
2. Every run re-hashes the reference before and after generation; if it changed,
   the run aborts and the outputs are moved to a rejected/ folder.
3. Variants go to assets/variants/<stem>_<timestamp>/; the reference path is
   never used as an output path.
4. A manifest.json in every run folder records: reference path + hash, prompt,
   seed, denoise, lora, output files and their hashes.
5. --apply-in-place is the only way to touch the original, and it backs up first.

Usage
-----
  python tools/comfy_variant.py --image ref.png --prompt "cherry pie" --count 3
  python tools/comfy_variant.py --image ref.png --prompt "..." --denoise 0.55 --lock-palette
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import stat
import time
import uuid
from io import BytesIO

import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_STORE = os.path.join(ROOT, "assets", "reference")
VAR_ROOT = os.path.join(ROOT, "assets", "variants")

COMFY = os.environ.get("COMFY_URL", "http://127.0.0.1:8188")
CKPT = os.environ.get("COMFY_CHECKPOINT", "DreamShaper_8_pruned.safetensors")
LORA = os.environ.get("COMFY_LORA", "PixelArtRedmond-Lite64.safetensors")


# --------------------------------------------------------------------- safety
def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def protect_reference(src):
    """Copy the reference into the read-only store, keep the original untouched."""
    digest = sha256(src)
    os.makedirs(REF_STORE, exist_ok=True)
    stem, ext = os.path.splitext(os.path.basename(src))
    dst = os.path.join(REF_STORE, f"{stem}__{digest[:10]}{ext.lower()}")
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        os.chmod(dst, stat.S_IREAD)
        print(f"[safe] reference backed up -> {dst}")
    else:
        print(f"[safe] reference already backed up -> {dst}")
    return dst, digest


def make_run_dir(stem):
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    d = os.path.join(VAR_ROOT, f"{stem}_{ts}")
    os.makedirs(d, exist_ok=True)
    return d


# ---------------------------------------------------------------------- comfy
def upload(path):
    with open(path, "rb") as f:
        r = requests.post(
            f"{COMFY}/upload/image",
            files={"image": (os.path.basename(path), f, "image/png")},
            data={"overwrite": "true"},
            timeout=60,
        )
    r.raise_for_status()
    j = r.json()
    return j["name"], j.get("subfolder", "")


def queue(workflow):
    r = requests.post(f"{COMFY}/prompt", json={"prompt": workflow, "client_id": str(uuid.uuid4())}, timeout=60)
    r.raise_for_status()
    return r.json()["prompt_id"]


def wait(prompt_id, timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        h = requests.get(f"{COMFY}/history/{prompt_id}", timeout=30).json()
        e = h.get(prompt_id)
        if e:
            if e.get("status", {}).get("status_str") == "error":
                raise RuntimeError(json.dumps(e["status"])[:800])
            imgs = [i for node in e.get("outputs", {}).values() for i in node.get("images", [])]
            if imgs:
                return imgs
        time.sleep(1)
    raise TimeoutError("render timeout")


def download(img):
    r = requests.get(
        f"{COMFY}/view",
        params={"filename": img["filename"], "subfolder": img.get("subfolder", ""), "type": img.get("type", "output")},
        timeout=120,
    )
    r.raise_for_status()
    return Image.open(BytesIO(r.content)).convert("RGB")


def build_workflow(name, prompt, negative, denoise, steps, cfg, seed, lora_strength):
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "LoadImage", "inputs": {"image": name}},
        "3": {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["1", 2]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["1", 1]}},
        "6": {"class_type": "KSampler", "inputs": {
            "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "dpmpp_2m",
            "scheduler": "karras", "denoise": denoise, "model": ["1", 0],
            "positive": ["4", 0], "negative": ["5", 0], "latent_image": ["3", 0]}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "variant"}},
    }
    if LORA:
        wf["9"] = {"class_type": "LoraLoader", "inputs": {
            "model": ["1", 0], "clip": ["1", 1], "lora_name": LORA,
            "strength_model": lora_strength, "strength_clip": lora_strength}}
        wf["6"]["inputs"]["model"] = ["9", 0]
        wf["4"]["inputs"]["clip"] = ["9", 1]
        wf["5"]["inputs"]["clip"] = ["9", 1]
    return wf


# -------------------------------------------------------------------- palette
def reference_palette(path, colors=16):
    im = Image.open(path).convert("RGB")
    q = im.quantize(colors=colors, method=Image.MEDIANCUT)
    pal = q.getpalette()[: colors * 3]
    return [tuple(pal[i: i + 3]) for i in range(0, len(pal), 3)]


def lock_palette(src, path, colors=16):
    flat = []
    for c in reference_palette(path, colors):
        flat.extend(c)
    flat += [0] * (768 - len(flat))
    p = Image.new("P", (1, 1))
    p.putpalette(flat)
    return src.quantize(palette=p, dither=Image.NONE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True, help="reference sprite (never modified)")
    ap.add_argument("--prompt", default="pixel art game item, same style and palette")
    ap.add_argument("--negative", default="blurry, low quality, jpeg artifacts, watermark, text, photo, 3d render")
    ap.add_argument("--denoise", type=float, default=0.45)
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--steps", type=int, default=24)
    ap.add_argument("--cfg", type=float, default=6.0)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--lora-strength", type=float, default=0.75)
    ap.add_argument("--lock-palette", action="store_true")
    ap.add_argument("--scale", type=int, default=8)
    ap.add_argument("--apply-in-place", action="store_true", help="also overwrite the original (backup is made first)")
    ap.add_argument("--dry-run", action="store_true", help="only protect the reference and print the plan")
    a = ap.parse_args()

    ref = os.path.abspath(a.image)
    if not os.path.exists(ref):
        raise SystemExit(f"reference not found: {ref}")

    backup, digest = protect_reference(ref)
    before = sha256(ref)

    stem = os.path.splitext(os.path.basename(ref))[0]
    if a.dry_run:
        print(f"[safe] reference hash {digest[:16]}… unchanged")
        print(f"[plan] {a.count} variant(s) -> {os.path.join(VAR_ROOT, stem + '_<timestamp>')}")
        print(f"[plan] denoise={a.denoise} lock_palette={a.lock_palette} seed={a.seed or 'random'}")
        return

    run_dir = make_run_dir(stem)
    name, sub = upload(backup)
    if sub:
        name = f"{sub}/{name}"

    manifest = {
        "reference": {"original": ref, "backup": backup, "sha256": digest},
        "params": {"prompt": a.prompt, "negative": a.negative, "denoise": a.denoise,
                   "steps": a.steps, "cfg": a.cfg, "lora": LORA, "lora_strength": a.lora_strength,
                   "lock_palette": a.lock_palette, "checkpoint": CKPT},
        "variants": [],
        "created": dt.datetime.now().isoformat(timespec="seconds"),
    }

    seeds = [a.seed] if a.seed is not None else []
    while len(seeds) < a.count:
        seeds.append(int.from_bytes(os.urandom(3), "big"))

    for i, seed in enumerate(seeds, 1):
        wf = build_workflow(name, a.prompt, a.negative, a.denoise, a.steps, a.cfg, seed, a.lora_strength)
        out = download(wait(queue(wf))[0])
        if a.lock_palette:
            out = lock_palette(out, ref, 16).convert("RGB")

        base = os.path.join(run_dir, f"v{i}_seed{seed}")
        out.save(base + "-1x.png")
        out.resize((out.width * a.scale, out.height * a.scale), Image.NEAREST).save(base + ".png")
        manifest["variants"].append({
            "seed": seed, "file": base + ".png", "file_1x": base + "-1x.png",
            "sha256": sha256(base + ".png"),
        })
        print(f"[ok] {base}.png")

    after = sha256(ref)
    if after != before:
        os.makedirs(os.path.join(run_dir, "rejected"), exist_ok=True)
        for v in manifest["variants"]:
            shutil.move(v["file"], os.path.join(run_dir, "rejected"))
            shutil.move(v["file_1x"], os.path.join(run_dir, "rejected"))
        raise SystemExit("ABORT: reference image changed during the run; outputs quarantined")

    manifest["reference_verified_after"] = after
    with open(os.path.join(run_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    if a.apply_in_place:
        shutil.copy2(manifest["variants"][0]["file_1x"], ref)
        print(f"[warn] original overwritten ON PURPOSE, backup at {backup}")

    print(f"[done] {len(manifest['variants'])} variant(s) in {run_dir}")


if __name__ == "__main__":
    main()
