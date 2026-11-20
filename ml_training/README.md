# 🧠 ML Training Pipeline — AI Vision Deteksi Hama & Penyakit Tanaman (YOLOv8)

Folder ini disiapkan agar proses kurasi dataset, pelatihan model menggunakan GPU NVIDIA (di laptop lokal maupun Google Colab), evaluasi `mAP@0.5`, serta ekspor model (`TFLite` / `ONNX` / `TF.js`) dapat langsung dijalankan secara terstruktur.

---

## 📋 Daftar 6 Kelas Target (`dataset_hama/data.yaml`)

| Class ID | Label | Kategori | Objek Visual |
|:---:|:---|:---|:---|
| `0` | `ulat_grayak` | Ulat | Larva pengerat bergaris/bintik hitam & daun berlubang |
| `1` | `kutu_kebul` | Serangga | Gerombolan bintik putih halus di balik helai daun |
| `2` | `ulat_penggulung` | Ulat | Daun menggulung berperekat sutra putih & larva hijau |
| `3` | `kutu_daun_aphids` | Serangga | Koloni kutu hijau/hitam mengerubungi pucuk tunas muda |
| `4` | `daun_layu_fusarium` | Penyakit | Helai daun terkulai layu menguning lemas & batang busuk |
| `5` | `tanaman_sehat` | Sehat | Helaian daun hijau mulus tanpa bercak gigitan/kutu |

---

## 📂 Struktur Direktori

```text
ml_training/
├── README.md
├── requirements.txt
├── dataset_hama/
│   ├── data.yaml
│   ├── train/ (images/ & labels/)   # ~70% dataset
│   ├── valid/ (images/ & labels/)   # ~20% dataset
│   └── test/  (images/ & labels/)   # ~10% dataset
├── scripts/
│   ├── check_dataset.py             # Cek jumlah foto, label & sebaran class ID 0-5
│   ├── download_dataset.py          # Template unduh dataset dari Roboflow Universe
│   ├── train_yolo.py                # Skrip training YOLOv8n (auto-deteksi GPU CUDA)
│   ├── evaluate_and_export.py       # Evaluasi test set & ekspor ONNX / TFLite / TF.js
│   └── multimodal_inference.py      # Logika korelasi Bayesian (AI Visual + Moisture & pH)
├── weights/                         # Simpan salinan best.pt terbaik di sini
├── exports/                         # Hasil ekspor .onnx / .tflite / tfjs
└── hasil_training_hama/             # Log & checkpoint runs Ultralytics
```

> **Catatan Git**: Isi folder gambar/label di `dataset_hama/`, checkpoint di `hasil_training_hama/`, file bobot `.pt`, dan hasil ekspor sudah diabaikan otomatis oleh `.gitignore` agar repositori tetap ringan.

---

## 🚀 Langkah Menjalankan di Laptop Ber-GPU NVIDIA

### 1. Buat Virtual Environment & Install PyTorch CUDA
```bash
cd ml_training
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install PyTorch dengan dukungan GPU NVIDIA CUDA 12.1 (sesuaikan versi driver nvidia-smi):
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Install dependensi training lainnya:
pip install -r requirements.txt
```

### 2. Masukkan Dataset & Verifikasi Kelengkapan
Masukkan foto (`.jpg`/`.png`) dan label YOLO (`.txt`) ke `dataset_hama/train/`, `valid/`, dan `test/`, lalu jalankan pemeriksaan:
```bash
python scripts/check_dataset.py
```

### 3. Jalankan Training YOLOv8n di GPU
```bash
python scripts/train_yolo.py --epochs 100 --batch 16 --imgsz 640
```
Model terbaik (`best.pt`) akan otomatis disalin ke `ml_training/weights/best.pt`.

### 4. Evaluasi Akurasi (`mAP@0.5`) & Ekspor ke ONNX / TFLite / TF.js
```bash
python scripts/evaluate_and_export.py --weights weights/best.pt --formats onnx tflite
```
