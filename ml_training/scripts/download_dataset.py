"""
Skrip Download Otomatis 6 Dataset Hama & Penyakit (Format YOLOv11) dari Roboflow Universe.
Set environment variable ROBOFLOW_API_KEY sebelum menjalankan:
  $env:ROBOFLOW_API_KEY="API_KEY_ANDA"
  python ml_training/scripts/download_dataset.py
"""

import os
from pathlib import Path
from roboflow import Roboflow

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = BASE_DIR / "downloads_raw"

# 6 Dataset Terkurasi (Format YOLOv11)
ROBOFLOW_TARGETS = [
    ("research-jcrht",    "fall-armyworm-marl3", 11, "0: ulat_grayak"),
    ("whiteflies-chili",  "whitefly-osaxv",       2, "1: kutu_kebul"),
    ("detectionnienluan", "dataset-leaf-roller",  1, "2: ulat_penggulung"),
    ("brocode-2ih4l",     "aphids-mtqc7",         1, "3: kutu_daun_aphids"),
    ("myworkspace-bg7vm", "fusarium-wilt-xinhs",  1, "4: daun_layu_fusarium"),
    ("grape-6veny",       "plantvillage-nxvdz",  24, "5: tanaman_sehat (filter ___healthy)"),
]


def main() -> None:
    api_key = os.getenv("ROBOFLOW_API_KEY", "").strip()
    if not api_key:
        print("[ERROR] Environment variable ROBOFLOW_API_KEY belum diisi.")
        print("Dapatkan API key gratis di https://app.roboflow.com/ lalu jalankan:")
        print('  $env:ROBOFLOW_API_KEY="YOUR_KEY"; python ml_training/scripts/download_dataset.py')
        return

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    rf = Roboflow(api_key=api_key)

    for workspace, project_name, version_num, label_desc in ROBOFLOW_TARGETS:
        print(f"Mengunduh [{label_desc}] -> {workspace}/{project_name} v{version_num} (yolov11)...")
        project = rf.workspace(workspace).project(project_name)
        ds = project.version(version_num).download("yolov11", location=str(DOWNLOAD_DIR / project_name))
        print(f"  Selesai diunduh ke: {ds.location}")


if __name__ == "__main__":
    main()
