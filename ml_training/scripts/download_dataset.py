"""
Template Skrip Download Otomatis Dataset Hama & Penyakit dari Roboflow Universe.
Set environment variable ROBOFLOW_API_KEY sebelum menjalankan:
  $env:ROBOFLOW_API_KEY="API_KEY_ANDA"
  python scripts/download_dataset.py
"""

import os
from pathlib import Path
from roboflow import Roboflow

BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOAD_DIR = BASE_DIR / "downloads_raw"


def main() -> None:
    api_key = os.getenv("ROBOFLOW_API_KEY", "").strip()
    if not api_key:
        print("[ERROR] Environment variable ROBOFLOW_API_KEY belum diisi.")
        print("Dapatkan API key gratis di https://app.roboflow.com/ lalu jalankan:")
        print('  $env:ROBOFLOW_API_KEY="YOUR_KEY"; python scripts/download_dataset.py')
        return

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    rf = Roboflow(api_key=api_key)

    # Sesuaikan workspace, project, dan version sesuai dataset kurasi Roboflow pilihan Anda
    targets = [
        # ("research", "fall-armyworm", 1),
        # ("bugsagriculture", "whitefly-detection", 2),
    ]

    if not targets:
        print("[INFO] Belum ada target Roboflow yang diaktifkan di daftar 'targets'.")
        print("Edit ml_training/scripts/download_dataset.py untuk memasukkan workspace/project Roboflow Anda.")
        return

    for workspace, project_name, version_num in targets:
        print(f"Mengunduh {workspace}/{project_name} v{version_num} (format yolov8)...")
        project = rf.workspace(workspace).project(project_name)
        ds = project.version(version_num).download("yolov8", location=str(DOWNLOAD_DIR / project_name))
        print(f"Selesai diunduh ke: {ds.location}")


if __name__ == "__main__":
    main()
