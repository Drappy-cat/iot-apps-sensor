import gc
import os
import shutil
import subprocess
import sys
import time
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

try:
    import pynvml
except ImportError:
    pynvml = None

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


class GpuThermalGuard:
    """Menjaga suhu GPU di bawah batas aman tanpa memperlambat training saat suhu normal."""

    def __init__(
        self,
        device_index: int = 0,
        max_temp_c: int = 75,
        resume_temp_c: int = 70,
        soft_throttle_temp_c: int = 72,
        check_every_n_batches: int = 4,
        poll_interval_sec: float = 2.0,
        epoch_cooldown_sec: float = 3.0,
    ) -> None:
        self.device_index = device_index
        self.max_temp_c = max_temp_c
        self.resume_temp_c = min(resume_temp_c, max_temp_c - 1)
        self.soft_throttle_temp_c = soft_throttle_temp_c
        self.check_every_n_batches = max(1, check_every_n_batches)
        self.poll_interval_sec = poll_interval_sec
        self.epoch_cooldown_sec = epoch_cooldown_sec
        self._batch_counter = 0
        self._last_status_log = 0.0
        self._nvml_handle = None

        if pynvml is not None and torch.cuda.is_available():
            try:
                pynvml.nvmlInit()
                self._nvml_handle = pynvml.nvmlDeviceGetHandleByIndex(device_index)
            except Exception:
                self._nvml_handle = None

    def get_temp_c(self) -> int | None:
        """Membaca suhu GPU saat ini dalam derajat Celcius."""
        if self._nvml_handle is not None:
            try:
                return int(
                    pynvml.nvmlDeviceGetTemperature(
                        self._nvml_handle, pynvml.NVML_TEMPERATURE_GPU
                    )
                )
            except Exception:
                pass

        if not torch.cuda.is_available():
            return None

        try:
            out = subprocess.check_output(
                [
                    "nvidia-smi",
                    f"--id={self.device_index}",
                    "--query-gpu=temperature.gpu",
                    "--format=csv,noheader,nounits",
                ],
                text=True,
                timeout=3,
            ).strip()
            return int(out.splitlines()[0])
        except Exception:
            return None

    def get_power_w(self) -> float | None:
        """Membaca konsumsi daya GPU saat ini (Watt)."""
        if self._nvml_handle is not None:
            try:
                return pynvml.nvmlDeviceGetPowerUsage(self._nvml_handle) / 1000.0
            except Exception:
                pass
        return None

    def _free_vram_cache(self) -> None:
        """Membersihkan cache VRAM di akhir epoch atau saat thermal stop."""
        if torch.cuda.is_available():
            torch.cuda.synchronize()
            torch.cuda.empty_cache()

    def _wait_until_cool(self, current_temp: int) -> None:
        """Menjeda training saat suhu >= max_temp_c hingga turun ke target aman."""
        self._free_vram_cache()
        print(
            f"\n[THERMAL STOP] Suhu GPU {current_temp}°C (>= {self.max_temp_c}°C). "
            f"Jeda sebentar hingga suhu <= {self.resume_temp_c}°C (< {self.max_temp_c}°C)..."
        )
        last_log = time.monotonic()
        while True:
            time.sleep(self.poll_interval_sec)
            temp = self.get_temp_c()
            if temp is None or temp <= self.resume_temp_c:
                print(
                    f"[THERMAL RESUME] Suhu GPU turun ke {temp}°C (< {self.max_temp_c}°C). Lanjut training!\n"
                )
                return
            now = time.monotonic()
            if now - last_log >= 8.0:
                print(f"[THERMAL COOLING] Suhu GPU: {temp}°C (target <= {self.resume_temp_c}°C)...")
                last_log = now

    def _throttle_step(self) -> None:
        """Kecepatan penuh saat < 72°C; jeda ringan hanya di 72-74°C; auto-stop >= 75°C."""
        if not torch.cuda.is_available():
            return

        self._batch_counter += 1
        if self._batch_counter % self.check_every_n_batches != 0:
            return

        temp = self.get_temp_c()
        if temp is None:
            return

        if temp >= self.max_temp_c:
            self._wait_until_cool(temp)
            return

        if temp >= self.soft_throttle_temp_c:
            torch.cuda.synchronize()
            time.sleep(0.08)

        now = time.monotonic()
        if now - self._last_status_log >= 45.0:
            pwr = self.get_power_w()
            pwr_str = f" | Daya: {pwr:.1f}W" if pwr is not None else ""
            mode = "throttle ringan" if temp >= self.soft_throttle_temp_c else "kecepatan penuh"
            print(f"[THERMAL MONITOR] Suhu GPU: {temp}°C{pwr_str} | Mode: {mode}")
            self._last_status_log = now

    def on_train_batch_end(self, trainer) -> None:
        """Callback tiap batch training."""
        self._throttle_step()

    def on_val_batch_end(self, validator) -> None:
        """Callback tiap batch validasi."""
        self._throttle_step()

    def on_train_epoch_end(self, trainer) -> None:
        """Callback akhir epoch: bersihkan VRAM & jeda singkat antar epoch."""
        self._free_vram_cache()
        temp = self.get_temp_c()
        epoch_num = getattr(trainer, "epoch", 0) + 1
        total_epochs = getattr(trainer, "epochs", "?")
        if temp is not None:
            print(f"[THERMAL] Selesai Epoch {epoch_num}/{total_epochs} | Suhu GPU: {temp}°C")
            if temp >= self.max_temp_c:
                self._wait_until_cool(temp)
                return
        if self.epoch_cooldown_sec > 0:
            time.sleep(self.epoch_cooldown_sec)

    def close(self) -> None:
        if self._nvml_handle is not None and pynvml is not None:
            try:
                pynvml.nvmlShutdown()
            except Exception:
                pass
            self._nvml_handle = None


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


def resolve_training_checkpoint(
    run_dir: str,
    default_model_ref: str,
    target_epochs: int,
) -> tuple[str, bool, bool]:
    """Mengecek apakah ada checkpoint last.pt untuk auto-resume atau sudah selesai."""
    weights_dir = os.path.join(run_dir, "weights")
    last_pt = os.path.join(weights_dir, "last.pt")
    best_pt = os.path.join(weights_dir, "best.pt")

    if not os.path.isfile(last_pt):
        return default_model_ref, False, False

    try:
        ckpt = torch.load(last_pt, map_location="cpu", weights_only=False)
    except Exception as exc:
        print(f"Peringatan: gagal membaca {last_pt} ({exc}), memulai training baru.")
        return default_model_ref, False, False

    done_epoch = ckpt.get("epoch", -1)
    has_optimizer = ckpt.get("optimizer") is not None

    if done_epoch == -1 and os.path.isfile(best_pt):
        print(f"Training pada {run_dir} sudah selesai penuh. Model terbaik: {best_pt}")
        return best_pt, False, True

    if done_epoch >= 0 and has_optimizer and (done_epoch + 1) < target_epochs:
        print(
            f"Checkpoint ditemukan! Melanjutkan training dari {last_pt} "
            f"(sudah selesai {done_epoch + 1}/{target_epochs} epoch)."
        )
        return last_pt, True, False

    return default_model_ref, False, False


def train_yolo_batch() -> None:
    """Melakukan training deteksi objek YOLOv11 dengan kecepatan optimal & proteksi suhu GPU."""
    torch.set_num_threads(4)
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
    batch_size = 16  # 696 iter/epoch (4x lebih cepat dari batch=4, ~3.45 GB dari 6 GB VRAM)
    workers = 2      # DataLoader paralel secukupnya agar GPU tidak menunggu CPU
    amp = True
    cache = False
    save_period = 5
    plots = True

    # Pengaturan batas suhu GPU: cepat saat dingin, rem ringan di 72°C, auto-stop di 75°C
    max_gpu_temp_c = 75
    resume_gpu_temp_c = 70
    soft_throttle_temp_c = 72
    epoch_cooldown_sec = 3.0

    lr0 = 0.0010
    lrf = 0.01
    warmup_epochs = 3.0
    cos_lr = True
    patience = 15
    weight_decay = 0.001
    close_mosaic = 15

    degrees = 10.0
    translate = 0.1
    scale = 0.5
    shear = 0.0
    fliplr = 0.5
    mixup = 0.0
    erasing = 0.2

    output_base_dir = os.path.join(base_dir, "models", "trained_weights")
    os.makedirs(output_base_dir, exist_ok=True)

    thermal_guard = GpuThermalGuard(
        device_index=device if isinstance(device, int) else 0,
        max_temp_c=max_gpu_temp_c,
        resume_temp_c=resume_gpu_temp_c,
        soft_throttle_temp_c=soft_throttle_temp_c,
        epoch_cooldown_sec=epoch_cooldown_sec,
    )

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        start_temp = thermal_guard.get_temp_c()
        temp_info = f" | Suhu awal: {start_temp}°C" if start_temp is not None else ""
        print(f"Menjalankan pada GPU: {gpu_name} ({vram:.2f} GB VRAM){temp_info}")
        print(
            f"Proteksi Suhu Aktif: jeda otomatis >= {max_gpu_temp_c}°C, "
            f"lanjut <= {resume_gpu_temp_c}°C, jeda antar epoch {epoch_cooldown_sec:.0f}s."
        )
    else:
        print("GPU CUDA tidak terdeteksi! Training akan berjalan di CPU.")

    try:
        for model_name in models:
            local_weight = os.path.join(base_dir, model_name)
            default_ref = local_weight if os.path.isfile(local_weight) else model_name
            run_name = f"{os.path.splitext(model_name)[0]}_6cls_e{epochs}"
            run_dir = os.path.join(output_base_dir, run_name)

            model_ref, should_resume, already_done = resolve_training_checkpoint(
                run_dir=run_dir,
                default_model_ref=default_ref,
                target_epochs=epochs,
            )
            if already_done:
                continue

            status_txt = "Melanjutkan (Resume)" if should_resume else "Memulai Baru"
            print(f"=== {status_txt} Pelatihan Deteksi: {model_name} ({epochs} epoch) ===")
            model = YOLO(model_ref)
            model.add_callback("on_train_batch_end", thermal_guard.on_train_batch_end)
            model.add_callback("on_val_batch_end", thermal_guard.on_val_batch_end)
            model.add_callback("on_train_epoch_end", thermal_guard.on_train_epoch_end)

            try:
                if should_resume:
                    model.train(
                        resume=True,
                        imgsz=imgsz,
                        device=device,
                        batch=batch_size,
                        workers=workers,
                        save_period=save_period,
                        plots=plots,
                    )
                else:
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
            except KeyboardInterrupt:
                last_pt = os.path.join(run_dir, "weights", "last.pt")
                print(
                    f"\n[DIHENTIKAN USER] Training dihentikan. Progress epoch terakhir tersimpan di: {last_pt}\n"
                    "Jalankan ulang script ini kapan saja untuk melanjutkan otomatis dari epoch terakhir."
                )
                break
            finally:
                del model
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
    finally:
        thermal_guard.close()


if __name__ == "__main__":
    train_yolo_batch()
