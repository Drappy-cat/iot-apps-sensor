"""
Skrip Auto-Merge & Re-index 6 Dataset YOLOv11 menjadi 1 Dataset Terpadu (ml_training/dataset_hama/)

Membaca langsung file .zip (atau folder) dari direktori `dataset/` di root proyek:
  - Fall-ArmyWorm*.zip        -> class 0 (ulat_grayak)        [semua ID asli -> 0]
  - *whitefly*.zip            -> class 1 (kutu_kebul)         [semua ID asli -> 1]
  - *leaf*roller*.zip         -> class 2 (ulat_penggulung)    [semua ID asli -> 2]
  - *aphids*.zip              -> class 3 (kutu_daun_aphids)   [semua ID asli -> 3]
  - *fusarium*.zip            -> class 4 (daun_layu_fusarium) [semua ID asli -> 4]
  - *PlantVillage*.zip        -> class 5 (tanaman_sehat)      [HANYA ID {2,4,8,11,13} (*___healthy) + balancing]

Contoh jalankan:
  python ml_training/scripts/merge_datasets.py --clean
"""

import argparse
import random
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_SOURCE_DIR = ROOT_DIR / "dataset"
TARGET_DIR = ROOT_DIR / "ml_training" / "dataset_hama"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

# ID kelas ___healthy pada PlantVillage.v24i.yolov11 (grape-6veny/plantvillage-nxvdz v24)
PLANTVILLAGE_HEALTHY_IDS: Set[int] = {2, 4, 8, 11, 13}

# Peta deteksi otomatis nama file zip -> (prefix, target_class_id, allowed_source_ids, max_per_split)
DATASET_RULES = [
    {
        "name": "ulat_grayak (Fall Armyworm)",
        "keywords": ["armyworm", "fall-armyworm", "ulat_grayak"],
        "prefix": "faw",
        "target_id": 0,
        "allowed_ids": None,  # Semua sub-label (armyworm/larva/damage) dipetakan ke 0
        "max_limits": None,
    },
    {
        "name": "kutu_kebul (Whitefly)",
        "keywords": ["whitefly", "whiteflies", "kutu_kebul"],
        "prefix": "whitefly",
        "target_id": 1,
        "allowed_ids": None,
        "max_limits": None,
    },
    {
        "name": "ulat_penggulung (Leaf Roller)",
        "keywords": ["leaf roller", "leaf-roller", "leaf_roller", "penggulung"],
        "prefix": "roller",
        "target_id": 2,
        "allowed_ids": None,
        "max_limits": None,
    },
    {
        "name": "kutu_daun_aphids (Aphids)",
        "keywords": ["aphid"],
        "prefix": "aphids",
        "target_id": 3,
        "allowed_ids": None,
        "max_limits": None,
    },
    {
        "name": "daun_layu_fusarium (Fusarium Wilt)",
        "keywords": ["fusarium", "layu"],
        "prefix": "fusarium",
        "target_id": 4,
        "allowed_ids": None,
        "max_limits": None,
    },
    {
        "name": "tanaman_sehat (PlantVillage Healthy Only)",
        "keywords": ["plantvillage", "healthy", "sehat"],
        "prefix": "healthy",
        "target_id": 5,
        "allowed_ids": PLANTVILLAGE_HEALTHY_IDS,
        "max_limits": {"train": 600, "valid": 120, "test": 60},
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge & re-index 6 dataset YOLOv11 ke ml_training/dataset_hama/")
    parser.add_argument("--source", type=str, default=str(DEFAULT_SOURCE_DIR), help="Folder berisi file .zip dataset")
    parser.add_argument("--target", type=str, default=str(TARGET_DIR), help="Folder tujuan dataset gabungan")
    parser.add_argument("--clean", action="store_true", help="Bersihkan isi gambar/label lama di target sebelum merge")
    parser.add_argument("--max-healthy-train", type=int, default=600, help="Batas maksimal foto sehat untuk split train")
    parser.add_argument("--max-healthy-valid", type=int, default=120, help="Batas maksimal foto sehat untuk split valid")
    parser.add_argument("--max-healthy-test", type=int, default=60, help="Batas maksimal foto sehat untuk split test")
    parser.add_argument("--seed", type=int, default=42, help="Random seed untuk sampling deterministik")
    return parser.parse_args()


def match_rule(filename: str) -> Optional[dict]:
    low = filename.lower()
    for rule in DATASET_RULES:
        if any(kw in low for kw in rule["keywords"]):
            return rule
    return None


def remap_label_content(
    raw_text: str,
    target_id: int,
    allowed_ids: Optional[Set[int]] = None,
) -> Optional[str]:
    out_lines: List[str] = []
    for line in raw_text.splitlines():
        parts = line.strip().split()
        if len(parts) < 5:
            continue
        try:
            src_id = int(float(parts[0]))
            coords = [float(v) for v in parts[1:]]
        except ValueError:
            continue
        if allowed_ids is not None and src_id not in allowed_ids:
            continue

        if len(coords) == 4:
            # Format standar YOLO bounding box: cx cy w h
            cx, cy, w, h = coords
        elif len(coords) >= 6 and len(coords) % 2 == 0:
            # Konversi otomatis format polygon (x1 y1 x2 y2 ...) -> YOLO bounding box (cx cy w h)
            xs = coords[0::2]
            ys = coords[1::2]
            x_min, x_max = max(0.0, min(xs)), min(1.0, max(xs))
            y_min, y_max = max(0.0, min(ys)), min(1.0, max(ys))
            w = x_max - x_min
            h = y_max - y_min
            if w <= 0 or h <= 0:
                continue
            cx = x_min + w / 2.0
            cy = y_min + h / 2.0
        else:
            continue

        out_lines.append(f"{target_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}")
    if not out_lines:
        return None
    return "\n".join(out_lines) + "\n"


def clean_target_dir(target_root: Path) -> None:
    for split in ("train", "valid", "test"):
        for sub in ("images", "labels"):
            d = target_root / split / sub
            if not d.exists():
                continue
            for f in d.iterdir():
                if f.is_file() and f.name != ".gitkeep":
                    f.unlink()


def process_zip(
    zip_path: Path,
    rule: dict,
    target_root: Path,
    rng: random.Random,
    custom_limits: Optional[Dict[str, int]] = None,
) -> Dict[str, int]:
    counts = {"train": 0, "valid": 0, "test": 0}
    limits = custom_limits if custom_limits is not None else rule["max_limits"]

    with zipfile.ZipFile(zip_path, "r") as zf:
        # Kelompokkan pasangan (image_entry, label_entry) per split
        split_images: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
        all_names = set(zf.namelist())

        for entry in zf.namelist():
            if entry.endswith("/"):
                continue
            norm = entry.replace("\\", "/")
            parts = norm.split("/")
            # Cari segmen split (train / valid / val / test)
            split_found = None
            for idx, seg in enumerate(parts):
                if seg in ("train", "valid", "val", "test") and idx + 1 < len(parts) and parts[idx + 1] == "images":
                    split_found = "valid" if seg == "val" else seg
                    break
            if not split_found:
                continue
            ext = Path(norm).suffix.lower()
            if ext not in IMAGE_EXTS:
                continue

            stem = Path(norm).stem
            # Bangun path label pasangannya
            lbl_entry = norm.replace("/images/", "/labels/").rsplit(".", 1)[0] + ".txt"
            if lbl_entry not in all_names:
                continue
            split_images[split_found].append((entry, lbl_entry))

        for split in ("train", "valid", "test"):
            pairs = split_images.get(split, [])
            if not pairs:
                continue

            # Filter pasangan valid terlebih dahulu (terutama untuk PlantVillage ___healthy)
            valid_pairs: List[Tuple[str, str, str]] = []
            for img_entry, lbl_entry in pairs:
                raw_lbl = zf.read(lbl_entry).decode("utf-8", errors="replace")
                remapped = remap_label_content(raw_lbl, rule["target_id"], rule["allowed_ids"])
                if remapped is not None:
                    valid_pairs.append((img_entry, lbl_entry, remapped))

            # Terapkan balancing jika ada batas maksimal
            if limits and split in limits and len(valid_pairs) > limits[split]:
                rng.shuffle(valid_pairs)
                valid_pairs = valid_pairs[: limits[split]]

            out_img_dir = target_root / split / "images"
            out_lbl_dir = target_root / split / "labels"
            out_img_dir.mkdir(parents=True, exist_ok=True)
            out_lbl_dir.mkdir(parents=True, exist_ok=True)

            for idx, (img_entry, _lbl_entry, remapped_lbl) in enumerate(valid_pairs):
                img_ext = Path(img_entry).suffix.lower()
                safe_name = f"{rule['prefix']}_{split}_{idx:05d}"
                (out_img_dir / f"{safe_name}{img_ext}").write_bytes(zf.read(img_entry))
                (out_lbl_dir / f"{safe_name}.txt").write_text(remapped_lbl, encoding="utf-8")
                counts[split] += 1

    return counts


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source)
    target_dir = Path(args.target)
    rng = random.Random(args.seed)

    if not source_dir.exists():
        raise FileNotFoundError(f"Folder sumber dataset tidak ditemukan: {source_dir}")

    if args.clean:
        print(f"[CLEAN] Membersihkan file gambar/label lama di {target_dir}...")
        clean_target_dir(target_dir)

    zip_files = sorted(source_dir.glob("*.zip"))
    if not zip_files:
        print(f"[WARNING] Tidak ditemukan file .zip di {source_dir}")
        return

    found_class_ids: Set[int] = set()
    print(f"Memproses {len(zip_files)} file .zip dari {source_dir} -> {target_dir}\n")

    for zp in zip_files:
        rule = match_rule(zp.name)
        if not rule:
            print(f"  [SKIP] {zp.name} (tidak cocok dengan aturan 6 kelas)")
            continue

        custom_limits = None
        if rule["target_id"] == 5:
            custom_limits = {
                "train": args.max_healthy_train,
                "valid": args.max_healthy_valid,
                "test": args.max_healthy_test,
            }

        counts = process_zip(zp, rule, target_dir, rng, custom_limits=custom_limits)
        found_class_ids.add(rule["target_id"])
        print(
            f"  [OK] Class {rule['target_id']} ({rule['name']}) <- {zp.name}\n"
            f"       train={counts['train']}, valid={counts['valid']}, test={counts['test']}"
        )

    missing = sorted(set(range(6)) - found_class_ids)
    if missing:
        print(f"\n[PERHATIAN] Class ID yang belum ditemukan file .zip-nya di {source_dir}: {missing}")
        print("Tambahkan file .zip kelas tersebut lalu jalankan ulang script ini dengan --clean.")
    else:
        print("\n[SUKSES] Seluruh 6 kelas (0-5) berhasil digabungkan!")

    print("Langkah berikutnya: jalankan `python ml_training/scripts/check_dataset.py` untuk verifikasi.")


if __name__ == "__main__":
    main()
