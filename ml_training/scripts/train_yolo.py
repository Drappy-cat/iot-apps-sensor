"""
Skrip Training Model YOLOv8 Deteksi Hama & Penyakit Tanaman (6 Kelas)
Dirancang untuk dijalankan di laptop ber-GPU NVIDIA (CUDA) maupun Google Colab.

Contoh jalankan:
  python scripts/train_yolo.py --model yolov8n.pt --epochs 100 --batch 16 --imgsz 640
"""

import argparse
import shutil
from pathlib import Path

import torch
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_YAML = BASE_DIR / "dataset_hama" / "data.yaml"
PROJECT_DIR = BASE_DIR / "hasil_training_hama"
WEIGHTS_DIR = BASE_DIR / "weights"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Training YOLOv8 Deteksi Hama & Penyakit Tanaman")
    parser.add_argument("--model", type=str, default="yolov8n.pt", help="Pre-trained weight (yolov8n.pt / yolov8s.pt)")
    parser.add_argument("--epochs", type=int, default=100, help="Jumlah epoch pelatihan")
    parser.add_argument("--batch", type=int, default=16, help="Ukuran batch (kurangi ke 8 jika VRAM < 6GB)")
    parser.add_argument("--imgsz", type=int, default=640, help="Resolusi input gambar")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience")
    parser.add_argument("--workers", type=int, default=4, help="Jumlah worker data loader")
    parser.add_argument("--name", type=str, default="model_v1_exp", help="Nama eksperimen training")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Konfigurasi dataset tidak ditemukan: {DATA_YAML}")

    use_cuda = torch.cuda.is_available()
    device = 0 if use_cuda else "cpu"
    if use_cuda:
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        print(f"[GPU DETECTED] {gpu_name} ({vram_gb:.1f} GB VRAM) -> device=0")
    else:
        print("[WARNING] GPU CUDA tidak terdeteksi, berjalan pada CPU (pelatihan akan jauh lebih lambat).")

    model = YOLO(args.model)

    model.train(
        data=str(DATA_YAML),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        workers=args.workers,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        mosaic=1.0,
        mixup=0.15,
        save=True,
        project=str(PROJECT_DIR),
        name=args.name,
        device=device,
    )

    best_pt = Path(model.trainer.best)
    if best_pt.exists():
        WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
        dest = WEIGHTS_DIR / "best.pt"
        shutil.copy2(best_pt, dest)
        print(f"\n[DONE] Training selesai! Bobot terbaik disalin ke: {dest}")


if __name__ == "__main__":
    main()
