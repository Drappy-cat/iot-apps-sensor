"""
Ekspor Model YOLOv11s Terlatih (best.pt) ke Format Web/Mobile ONNX Dual-Varian (416x416) & Metadata JSON
Menghasilkan:
  - public/models/yolo11s_416.onnx        (FP32 standar untuk profil RAM >= 6 GB / Delay Rendah)
  - public/models/yolo11s_416_uint8.onnx  (UINT8 terkuantisasi untuk profil RAM < 6 GB / Kompresi Ekstrem)
  - public/models/model_meta.json

Contoh jalankan:
  python ml_training/scripts/export_to_web.py
  python ml_training/scripts/export_to_web.py --imgsz 416
"""

import argparse
import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
from ultralytics import YOLO

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_WEIGHTS = ROOT_DIR / "models" / "trained_weights" / "yolo11s_6cls_e50" / "weights" / "best.pt"
PUBLIC_MODELS_DIR = ROOT_DIR / "public" / "models"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export YOLOv11s best.pt ke ONNX dual-varian untuk Web & Android")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Path file best.pt")
    parser.add_argument("--imgsz", type=int, default=416, help="Ukuran input model (default: 416)")
    parser.add_argument("--opset", type=int, default=12, help="Versi ONNX opset (default: 12)")
    parser.add_argument(
        "--keep-legacy",
        action="store_true",
        help="Jangan hapus model lama yolo11s_6cls.onnx (default: dihapus agar APK ramping)",
    )
    return parser.parse_args()


def validate_onnx_session(onnx_path: Path, imgsz: int) -> list[int]:
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    dummy = np.zeros((1, 3, imgsz, imgsz), dtype=np.float32)
    outputs = session.run([output_name], {input_name: dummy})
    return list(outputs[0].shape)


def build_quantized_uint8(fp32_path: Path, uint8_path: Path, imgsz: int) -> list[int]:
    from onnxruntime.quantization import QuantType, quantize_dynamic

    with tempfile.TemporaryDirectory() as tmp_dir:
        source_for_quant = fp32_path
        preproc_path = Path(tmp_dir) / "preproc.onnx"
        try:
            from onnxruntime.quantization.shape_inference import quant_pre_process

            quant_pre_process(str(fp32_path), str(preproc_path))
            if preproc_path.exists() and preproc_path.stat().st_size > 0:
                source_for_quant = preproc_path
                print("      [quant_pre_process] Shape inference praproses berhasil.")
        except Exception as exc:
            print(f"      [INFO] quant_pre_process dilewati ({exc}); lanjut quantize langsung.")

        try:
            quantize_dynamic(
                model_input=str(source_for_quant),
                model_output=str(uint8_path),
                weight_type=QuantType.QUInt8,
            )
            return validate_onnx_session(uint8_path, imgsz)
        except Exception as exc:
            if source_for_quant != fp32_path:
                print(f"      [WARNING] Validasi preproc UINT8 gagal ({exc}); ulangi dari FP32 standar.")
                quantize_dynamic(
                    model_input=str(fp32_path),
                    model_output=str(uint8_path),
                    weight_type=QuantType.QUInt8,
                )
                return validate_onnx_session(uint8_path, imgsz)
            raise


def main() -> None:
    args = parse_args()
    weights_path = Path(args.weights)
    if not weights_path.exists():
        raise FileNotFoundError(f"File bobot tidak ditemukan: {weights_path}")

    PUBLIC_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    target_fp32 = PUBLIC_MODELS_DIR / f"yolo11s_{args.imgsz}.onnx"
    target_uint8 = PUBLIC_MODELS_DIR / f"yolo11s_{args.imgsz}_uint8.onnx"
    target_meta = PUBLIC_MODELS_DIR / "model_meta.json"
    legacy_onnx = PUBLIC_MODELS_DIR / "yolo11s_6cls.onnx"

    print(f"[1/5] Memuat model PyTorch: {weights_path}")
    model = YOLO(str(weights_path))
    class_names = {str(k): str(v) for k, v in model.names.items()}
    print(f"      Kelas terdeteksi di checkpoint: {class_names}")

    print(f"[2/5] Mengekspor ke ONNX FP32 (imgsz={args.imgsz}, opset={args.opset}, simplify=True)...")
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

    shutil.copy2(exported, target_fp32)
    fp32_mb = target_fp32.stat().st_size / (1024 * 1024)
    fp32_shape = validate_onnx_session(target_fp32, args.imgsz)
    print(f"      [RAM >= 6 GB] Disimpan & tervalidasi: {target_fp32.name} ({fp32_mb:.2f} MB), shape={fp32_shape}")

    print("[3/5] Membuat varian terkuantisasi UINT8 untuk profil RAM < 6 GB...")
    uint8_shape = build_quantized_uint8(target_fp32, target_uint8, args.imgsz)
    uint8_mb = target_uint8.stat().st_size / (1024 * 1024)
    print(f"      [RAM < 6 GB]  Disimpan & tervalidasi: {target_uint8.name} ({uint8_mb:.2f} MB), shape={uint8_shape}")

    print("[4/5] Membersihkan model lama & merapikan aset APK...")
    if not args.keep_legacy and legacy_onnx.exists():
        legacy_onnx.unlink()
        print(f"      Menghapus model lama {legacy_onnx.name} agar ukuran APK tetap ramping.")

    print("[5/5] Menulis metadata model ke public/models/model_meta.json...")
    meta = {
        "version": "4.2.0",
        "architecture": "YOLOv11s",
        "sourceWeights": "models/trained_weights/yolo11s_6cls_e50/weights/best.pt",
        "onnxFile": f"/models/{target_fp32.name}",
        "onnxQuantizedFile": f"/models/{target_uint8.name}",
        "onnxSizeMB": round(fp32_mb, 2),
        "onnxQuantizedSizeMB": round(uint8_mb, 2),
        "imgsz": args.imgsz,
        "epochs": 50,
        "outputShape": fp32_shape,
        "profiles": {
            "extreme_low_ram": {
                "ramCondition": "< 6 GB",
                "onnxFile": f"/models/{target_uint8.name}",
                "sizeMB": round(uint8_mb, 2),
                "imgsz": args.imgsz,
            },
            "balanced_low_latency": {
                "ramCondition": ">= 6 GB",
                "onnxFile": f"/models/{target_fp32.name}",
                "sizeMB": round(fp32_mb, 2),
                "imgsz": args.imgsz,
            },
        },
        "metrics": {
            "mAP50": 0.7454,
            "mAP50_95": 0.48024,
            "precision": 0.75146,
            "recall": 0.74146,
        },
        "classes": class_names,
    }
    target_meta.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"[DONE] Ekspor dual-varian selesai! Metadata tersimpan di: {target_meta}")


if __name__ == "__main__":
    main()
