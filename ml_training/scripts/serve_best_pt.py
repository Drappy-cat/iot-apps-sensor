"""
Local Python FastAPI Inference Server untuk Model YOLOv11s Asli (best.pt)
Menyediakan endpoint REST agar frontend React (Web / Mobile Wi-Fi LAN) dapat
melakukan offloading deteksi hama & penyakit daun secara langsung ke PyTorch.

Contoh jalankan:
  python ml_training/scripts/serve_best_pt.py
  python ml_training/scripts/serve_best_pt.py --host 0.0.0.0 --port 8000
"""

import argparse
import base64
import io
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from ultralytics import YOLO

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_WEIGHTS = ROOT_DIR / "models" / "trained_weights" / "yolo11s_6cls_e50" / "weights" / "best.pt"


class DetectRequest(BaseModel):
    imageBase64: str
    confThreshold: float = 0.25
    iouThreshold: float = 0.45
    moisture: Optional[float] = None
    ph: Optional[float] = None


def create_app(weights_path: Path) -> FastAPI:
    if not weights_path.exists():
        raise FileNotFoundError(f"File model best.pt tidak ditemukan: {weights_path}")

    app = FastAPI(title="IoT Smart Agriculture YOLOv11s API", version="4.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    device = "0" if torch.cuda.is_available() else "cpu"
    model = YOLO(str(weights_path))
    class_names = {int(k): str(v) for k, v in model.names.items()}

    @app.get("/api/health")
    def health() -> Dict[str, Any]:
        return {
            "status": "ok",
            "engine": "ultralytics-best-pt",
            "model": weights_path.parent.parent.name,
            "device": f"cuda:{torch.cuda.get_device_name(0)}" if device == "0" else "cpu",
            "classes": class_names,
        }

    @app.post("/api/detect")
    def detect(req: DetectRequest) -> Dict[str, Any]:
        raw = req.imageBase64.strip()
        if "," in raw and raw.startswith("data:"):
            raw = raw.split(",", 1)[1]

        try:
            img_bytes = base64.b64decode(raw)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Gambar base64 tidak valid: {exc}") from exc

        img_w, img_h = img.size
        t0 = time.perf_counter()
        results = model.predict(
            source=img,
            conf=max(0.05, min(0.95, req.confThreshold)),
            iou=max(0.1, min(0.9, req.iouThreshold)),
            imgsz=640,
            device=device,
            verbose=False,
        )
        infer_ms = round((time.perf_counter() - t0) * 1000, 1)

        detections: List[Dict[str, Any]] = []
        if results and len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            xyxyn = boxes.xyxyn.cpu().tolist()
            confs = boxes.conf.cpu().tolist()
            clss = boxes.cls.cpu().tolist()

            for box, conf, cls_idx in zip(xyxyn, confs, clss):
                cid = int(cls_idx)
                detections.append(
                    {
                        "classId": cid,
                        "className": class_names.get(cid, f"class_{cid}"),
                        "confidence": round(float(conf), 4),
                        "bbox": [round(float(v), 5) for v in box],
                    }
                )

        detections.sort(key=lambda d: d["confidence"], reverse=True)

        return {
            "engine": "python_best_pt",
            "inferMs": infer_ms,
            "imgWidth": img_w,
            "imgHeight": img_h,
            "detections": detections,
        }

    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Jalankan Server REST API YOLOv11s best.pt")
    parser.add_argument("--weights", type=str, default=str(DEFAULT_WEIGHTS), help="Path file best.pt")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host bind server")
    parser.add_argument("--port", type=int, default=8000, help="Port server")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    app_instance = create_app(Path(args.weights))
    uvicorn.run(app_instance, host=args.host, port=args.port)
