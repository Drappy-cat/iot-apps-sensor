"""
Skrip Utilitas Pengecekan Dataset YOLO 6 Kelas (dataset_hama/)
Memverifikasi jumlah gambar, pasangan label .txt, serta distribusi Class ID 0-5.
"""

from collections import Counter
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset_hama"

CLASS_NAMES = {
    0: "ulat_grayak",
    1: "kutu_kebul",
    2: "ulat_penggulung",
    3: "kutu_daun_aphids",
    4: "daun_layu_fusarium",
    5: "tanaman_sehat",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def check_split(split_name: str) -> None:
    img_dir = DATASET_DIR / split_name / "images"
    lbl_dir = DATASET_DIR / split_name / "labels"

    images = [p for p in img_dir.glob("*") if p.suffix.lower() in IMAGE_EXTS] if img_dir.exists() else []
    labels = [p for p in lbl_dir.glob("*.txt")] if lbl_dir.exists() else []

    class_counter: Counter[int] = Counter()
    invalid_lines = 0
    missing_labels = 0

    for img_path in images:
        lbl_path = lbl_dir / f"{img_path.stem}.txt"
        if not lbl_path.exists():
            missing_labels += 1
            continue
        for line in lbl_path.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if not parts:
                continue
            try:
                cls_id = int(parts[0])
                if cls_id in CLASS_NAMES and len(parts) == 5:
                    class_counter[cls_id] += 1
                else:
                    invalid_lines += 1
            except ValueError:
                invalid_lines += 1

    print(f"\n=== Split: {split_name.upper()} ===")
    print(f"  Total Gambar     : {len(images)}")
    print(f"  Total File Label : {len(labels)}")
    print(f"  Gambar Tanpa Lbl : {missing_labels}")
    print(f"  Baris Label Error: {invalid_lines}")
    for cid, cname in CLASS_NAMES.items():
        print(f"    [{cid}] {cname:<20}: {class_counter[cid]} box")


if __name__ == "__main__":
    print(f"Memeriksa struktur dataset di: {DATASET_DIR}")
    for split in ("train", "valid", "test"):
        check_split(split)
