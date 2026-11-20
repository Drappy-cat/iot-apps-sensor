"""
Skrip Evaluasi Test Set (mAP@0.5, Precision, Recall) & Export Model Ringan (ONNX / TFLite / TF.js)

Contoh jalankan:
  python scripts/evaluate_and_export.py --weights weights/best.pt --formats onnx tflite
"""

import argparse
import shutil
from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_YAML = BASE_DIR / "dataset_hama" / "data.yaml"
EXPORTS_DIR = BASE_DIR / "exports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluasi & Export Model YOLOv8 Hama Tanaman")
    parser.add_argument("--weights", type=str, default=str(BASE_DIR / "weights" / "best.pt"), help="Path file best.pt")
    parser.add_argument("--imgsz", type=int, default=640, help="Resolusi input export")
    parser.add_argument("--skip-val", action="store_true", help="Lewati evaluasi test set")
    parser.add_argument(
        "--formats",
        nargs="+",
        default=["onnx"],
        choices=["onnx", "tflite", "tfjs"],
        help="Format target export (onnx, tflite, tfjs)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    weights_path = Path(args.weights)
    if not weights_path.exists():
        raise FileNotFoundError(f"File bobot tidak ditemukan: {weights_path}")

    model = YOLO(str(weights_path))

    if not args.skip_val:
        print("\n=== Evaluasi pada Test Set ===")
        metrics = model.val(data=str(DATA_YAML), split="test")
        print(f"  mAP@0.5       : {metrics.box.map50 * 100:.2f}%")
        print(f"  mAP@0.5:0.95  : {metrics.box.map * 100:.2f}%")
        print(f"  Precision     : {metrics.box.mp * 100:.2f}%")
        print(f"  Recall        : {metrics.box.mr * 100:.2f}%")

    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    for fmt in args.formats:
        print(f"\n=== Mengekspor model ke format: {fmt.upper()} ===")
        export_kwargs = {"format": fmt, "imgsz": args.imgsz}
        if fmt == "onnx":
            export_kwargs["dynamic"] = True
        elif fmt == "tflite":
            export_kwargs["int8"] = False

        exported_path = Path(model.export(**export_kwargs))
        if exported_path.exists():
            dest = EXPORTS_DIR / exported_path.name
            if exported_path.is_dir():
                if dest.exists():
                    shutil.rmtree(dest)
                shutil.copytree(exported_path, dest)
            else:
                shutil.copy2(exported_path, dest)
            print(f"[OK] Hasil export tersimpan di: {dest}")


if __name__ == "__main__":
    main()
