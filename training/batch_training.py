import gc
import os
import shutil
import subprocess
import sys
from collections import Counter

_CONDA_TF_PYTHON = r"C:\Users\Lenovo\anaconda3\envs\tensorflow\python.exe"
try:
    import torch
    import yaml
    from ultralytics import YOLO
except ModuleNotFoundError:
    if (
        os.path.isfile(_CONDA_TF_PYTHON)
        and os.path.normcase(os.path.abspath(sys.executable))
        != os.path.normcase(os.path.abspath(_CONDA_TF_PYTHON))
    ):
        print(f"Mengalihkan eksekusi ke environment conda 'tensorflow': {_CONDA_TF_PYTHON}")
        raise SystemExit(subprocess.call([_CONDA_TF_PYTHON, *sys.argv]))
    raise

TARGET_CLASSES = [
    "kutu_daun_aphids",    # 0: aphids
    "ulat_grayak",         # 1: army worm
    "daun_layu_fusarium",  # 2: fusarium wilt + penyakit daun plant village
    "ulat_penggulung",     # 3: leaf roller
    "kutu_kebul",          # 4: whitefly
    "tanaman_sehat",       # 5: plant village healthy
]

PLANT_VILLAGE_HEALTHY_IDS = {2, 4, 8, 11, 13}

DATASET_MAPPING = {
    "aphids": {"prefix": "aphids", "default_class": 0},
    "army worm": {"prefix": "armyworm", "default_class": 1},
    "fusarium wilt": {"prefix": "fusarium", "default_class": 2},
    "leaf roller": {"prefix": "leafroller", "default_class": 3},
    "whitefly": {"prefix": "whitefly", "default_class": 4},
    "plant village": {
        "prefix": "plantvillage",
        "class_map": {
            idx: (5 if idx in PLANT_VILLAGE_HEALTHY_IDS else 2)
            for idx in range(14)
        },
    },
}


def convert_label_to_bbox(parts: list[str], target_cls: int) -> str | None:
    """Mengonversi baris label YOLO bbox atau poligon menjadi format bbox standar."""
    if len(parts) == 5:
        xc, yc, w, h = (float(v) for v in parts[1:5])
    elif len(parts) > 5 and (len(parts) - 1) % 2 == 0:
        coords = [float(v) for v in parts[1:]]
        xs = [min(max(x, 0.0), 1.0) for x in coords[0::2]]
        ys = [min(max(y, 0.0), 1.0) for y in coords[1::2]]
        xmin, xmax = min(xs), max(xs)
        ymin, ymax = min(ys), max(ys)
        xc = (xmin + xmax) / 2.0
        yc = (ymin + ymax) / 2.0
        w = xmax - xmin
        h = ymax - ymin
    else:
        return None

    xc = min(max(xc, 0.0), 1.0)
    yc = min(max(yc, 0.0), 1.0)
    w = min(max(w, 0.0), 1.0)
    h = min(max(h, 0.0), 1.0)
    if w <= 1e-6 or h <= 1e-6:
        return None

    return f"{target_cls} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}"


def link_or_copy(src: str, dst: str) -> None:
    """Menggunakan hardlink agar hemat ruang disk, fallback ke copy jika gagal."""
    if os.path.exists(dst):
        return
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def prepare_merged_dataset(source_dir: str, merged_dir: str) -> str:
    """Menggabungkan 6 folder dataset menjadi 1 dataset deteksi 6 kelas."""
    merged_yaml = os.path.join(merged_dir, "data.yaml")
    train_img_check = os.path.join(merged_dir, "train", "images")
    if os.path.isfile(merged_yaml) and os.path.isdir(train_img_check) and os.listdir(train_img_check):
        with open(merged_yaml, "r", encoding="utf-8") as fh:
            existing = yaml.safe_load(fh) or {}
        if existing.get("names") == TARGET_CLASSES:
            print(f"Dataset gabungan sudah tersedia di: {merged_dir}")
            return merged_yaml

    print(f"Menyiapkan dataset gabungan 6 kelas di: {merged_dir}")
    split_stats: dict[str, Counter] = {}
    image_counts: dict[str, int] = {}

    for split in ("train", "valid", "test"):
        out_img_dir = os.path.join(merged_dir, split, "images")
        out_lbl_dir = os.path.join(merged_dir, split, "labels")
        os.makedirs(out_img_dir, exist_ok=True)
        os.makedirs(out_lbl_dir, exist_ok=True)

        cls_counter: Counter = Counter()
        img_total = 0

        for folder_name, cfg in DATASET_MAPPING.items():
            src_img_dir = os.path.join(source_dir, folder_name, split, "images")
            src_lbl_dir = os.path.join(source_dir, folder_name, split, "labels")
            if not os.path.isdir(src_img_dir):
                continue

            prefix = cfg["prefix"]
            class_map = cfg.get("class_map")
            default_cls = cfg.get("default_class")

            for img_name in os.listdir(src_img_dir):
                src_img_path = os.path.join(src_img_dir, img_name)
                if not os.path.isfile(src_img_path):
                    continue

                stem, _ = os.path.splitext(img_name)
                src_lbl_path = os.path.join(src_lbl_dir, f"{stem}.txt")
                dst_img_path = os.path.join(out_img_dir, f"{prefix}__{img_name}")
                dst_lbl_path = os.path.join(out_lbl_dir, f"{prefix}__{stem}.txt")

                converted_lines: list[str] = []
                if os.path.isfile(src_lbl_path):
                    with open(src_lbl_path, "r", encoding="utf-8") as fh:
                        for raw_line in fh:
                            parts = raw_line.strip().split()
                            if not parts:
                                continue
                            src_cls = int(float(parts[0]))
                            target_cls = class_map.get(src_cls, default_cls) if class_map else default_cls
                            if target_cls is None:
                                continue
                            converted = convert_label_to_bbox(parts, target_cls)
                            if converted is not None:
                                converted_lines.append(converted)
                                cls_counter[target_cls] += 1

                link_or_copy(src_img_path, dst_img_path)
                with open(dst_lbl_path, "w", encoding="utf-8") as fh:
                    if converted_lines:
                        fh.write("\n".join(converted_lines) + "\n")
                img_total += 1

        split_stats[split] = cls_counter
        image_counts[split] = img_total

    yaml_payload = {
        "path": os.path.abspath(merged_dir),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(TARGET_CLASSES),
        "names": TARGET_CLASSES,
    }
    with open(merged_yaml, "w", encoding="utf-8") as fh:
        yaml.safe_dump(yaml_payload, fh, sort_keys=False, allow_unicode=True)

    print("Ringkasan dataset gabungan:")
    for split in ("train", "valid", "test"):
        counts_str = ", ".join(
            f"{TARGET_CLASSES[i]}={split_stats[split][i]}" for i in range(len(TARGET_CLASSES))
        )
        print(f"  - {split}: {image_counts[split]} gambar | {counts_str}")

    return merged_yaml


def train_yolo_batch() -> None:
    """Melakukan training deteksi objek YOLOv11 pada dataset hama & penyakit tanaman."""
    if torch.cuda.is_available():
        torch.backends.cudnn.benchmark = True

    models = [
        "yolo11s.pt",
    ]

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_dataset_dir = os.path.join(base_dir, "dataset")
    merged_dataset_dir = os.path.join(base_dir, "dataset_merged")
    data_yaml = prepare_merged_dataset(source_dataset_dir, merged_dataset_dir)

    epochs = 50
    imgsz = 640
    device = 0 if torch.cuda.is_available() else "cpu"
    optimizer = "AdamW"
    batch_size = 8
    workers = 2
    amp = True
    cache = False
    save_period = 10
    plots = True

    lr0 = 0.0010
    lrf = 0.01
    warmup_epochs = 3.0
    cos_lr = True
    patience = 20
    weight_decay = 0.001
    close_mosaic = 10

    degrees = 15.0
    translate = 0.1
    scale = 0.5
    shear = 2.0
    fliplr = 0.5
    mixup = 0.1
    erasing = 0.2

    output_base_dir = os.path.join(base_dir, "models", "trained_weights")
    os.makedirs(output_base_dir, exist_ok=True)

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"Menjalankan pada GPU: {gpu_name} ({vram:.2f} GB VRAM)")
    else:
        print("GPU CUDA tidak terdeteksi! Training akan berjalan di CPU.")

    for model_name in models:
        local_weight = os.path.join(base_dir, model_name)
        model_ref = local_weight if os.path.isfile(local_weight) else model_name
        run_name = f"{os.path.splitext(model_name)[0]}_6cls_e{epochs}"

        print(f"=== Memulai Pelatihan Deteksi: {model_name} ({epochs} epoch) ===")
        model = YOLO(model_ref)

        model.train(
            data=data_yaml,
            epochs=epochs,
            imgsz=imgsz,
            device=device,
            batch=batch_size,
            workers=workers,
            amp=amp,
            cache=cache,
            optimizer=optimizer,
            lr0=lr0,
            lrf=lrf,
            warmup_epochs=warmup_epochs,
            cos_lr=cos_lr,
            patience=patience,
            weight_decay=weight_decay,
            close_mosaic=close_mosaic,
            degrees=degrees,
            translate=translate,
            scale=scale,
            shear=shear,
            fliplr=fliplr,
            mixup=mixup,
            erasing=erasing,
            save_period=save_period,
            plots=plots,
            project=output_base_dir,
            name=run_name,
            exist_ok=True,
        )
        print(f"=== Pelatihan {model_name} Selesai ===\n")

        del model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


if __name__ == "__main__":
    train_yolo_batch()
