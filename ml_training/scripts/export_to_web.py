"""
Ekspor Model YOLOv11s Terlatih (best.pt) ke Format Web/Mobile ONNX & Metadata JSON
Menghasilkan:
  - public/models/yolo11s_6cls.onnx
  - public/models/model_meta.json

Contoh jalankan:
  python ml_training/scripts/export_to_web.py
  python ml_training/scripts/export_to_web.py --quantize
"""

import argparse
import json
import shutil
from pathlib import Path

import numpy as np
import onnxruntime as ort
from ultralytics import YOLO

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_WEIGHTS = ROOT_DIR / "models" / "trained_weights" / "yolo11s_6cls_e50" / "weights" / "best.pt"
PUBLIC_MODELS_DIR = ROOT_DIR / "public" / "models"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export YOLOv11s best.pt ke ONNX untuk aplikasi Web & Android")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Path file best.pt")
    parser.add_argument("--imgsz", type=int, default=640, help="Ukuran input model (default: 640)")
    parser.add_argument("--opset", type=int, default=12, help="Versi ONNX opset (default: 12)")
    parser.add_argument(
        "--quantize",
        action="store_true",
        help="Terapkan dynamic UINT8 weight quantization (opsional untuk memperkecil ukuran file)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    weights_path = Path(args.weights)
    if not weights_path.exists():
        raise FileNotFoundError(f"File bobot tidak ditemukan: {weights_path}")

    PUBLIC_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target_onnx = PUBLIC_MODELS_DIR / "yolo11s_6cls.onnx"
    target_meta = PUBLIC_MODELS_DIR / "model_meta.json"

    print(f"[1/4] Memuat model PyTorch: {weights_path}")
    model = YOLO(str(weights_path))
    class_names = {str(k): str(v) for k, v in model.names.items()}
    print(f"      Kelas terdeteksi di checkpoint: {class_names}")

    print(f"[2/4] Mengekspor ke ONNX (imgsz={args.imgsz}, opset={args.opset}, simplify=True)...")
    exported = Path(
        model.export(
            format="onnx",
            imgsz=args.imgsz,
            opset=args.opset,
            simplify=True,
            dynamic=False,
        )
    )

    if not exported.exists():
        raise RuntimeError(f"Ekspor ONNX gagal, file tidak ditemukan: {exported}")

    if args.quantize:
        try:
            from onnxruntime.quantization import QuantType, quantize_dynamic

            print("[2b] Menerapkan dynamic UINT8 quantization...")
            quantized_tmp = exported.with_name(exported.stem + "_uint8.onnx")
            quantize_dynamic(
                model_input=str(exported),
                model_output=str(quantized_tmp),
                weight_type=QuantType.QUInt8,
            )
            shutil.copy2(quantized_tmp, target_onnx)
        except Exception as exc:
            print(f"[WARNING] Quantization dilewati ({exc}); menyalin ONNX standar.")
            shutil.copy2(exported, target_onnx)
    else:
        shutil.copy2(exported, target_onnx)

    size_mb = target_onnx.stat().st_size / (1024 * 1024)
    print(f"      Disimpan ke: {target_onnx} ({size_mb:.2f} MB)")

    print("[3/4] Memvalidasi inferensi dummy tensor [1, 3, 640, 640] via onnxruntime...")
    session = ort.InferenceSession(str(target_onnx), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    dummy = np.zeros((1, 3, args.imgsz, args.imgsz), dtype=np.float32)
    outputs = session.run([output_name], {input_name: dummy})
    out_shape = list(outputs[0].shape)
    print(f"      Input: {input_name} {list(dummy.shape)} -> Output: {output_name} {out_shape}")

    print("[4/4] Menulis metadata model ke public/models/model_meta.json...")
    meta = {
        "version": "4.0.0",
        "architecture": "YOLOv11s",
        "sourceWeights": "models/trained_weights/yolo11s_6cls_e50/weights/best.pt",
        "onnxFile": "/models/yolo11s_6cls.onnx",
        "onnxSizeMB": round(size_mb, 2),
        "imgsz": args.imgsz,
        "epochs": 50,
        "outputShape": out_shape,
        "metrics": {
            "mAP50": 0.7454,
            "mAP50_95": 0.48024,
            "precision": 0.75146,
            "recall": 0.74146,
        },
        "classes": class_names,
    }
    target_meta.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[DONE] Ekspor selesai! Metadata tersimpan di: {target_meta}")


if __name__ == "__main__":
    main()
