"""
Integrasi Multimodal Bayesian: Menggabungkan Skor Visual Model AI dengan Sensor Tanah IoT
(Kelembaban Tanah % & pH Tanah) sesuai rancangan pada ai_training_implementation_guide.md.
"""

from typing import Dict


def hitung_probabilitas_multimodal(
    probabilitas_visual_ai: Dict[str, float],
    sensor_moisture: float,
    sensor_ph: float,
) -> Dict[str, float]:
    """
    Menyesuaikan skor kepercayaan AI visual berdasarkan kondisi kelembaban dan pH tanah.
    """
    skor_akhir = probabilitas_visual_ai.copy()

    # Korelasi 1: Layu Fusarium berkembang pesat pada tanah terlalu basah (>78%) & masam (pH < 6.0)
    if "daun_layu_fusarium" in skor_akhir:
        if sensor_moisture > 78 and sensor_ph < 6.0:
            skor_akhir["daun_layu_fusarium"] = min(0.99, skor_akhir["daun_layu_fusarium"] * 1.35)
        else:
            skor_akhir["daun_layu_fusarium"] = skor_akhir["daun_layu_fusarium"] * 0.70

    # Korelasi 2: Kutu Kebul & Kutu Daun aktif pada kondisi kering (<55%)
    if sensor_moisture < 55:
        if "kutu_kebul" in skor_akhir:
            skor_akhir["kutu_kebul"] = min(0.98, skor_akhir["kutu_kebul"] * 1.25)
        if "kutu_daun_aphids" in skor_akhir:
            skor_akhir["kutu_daun_aphids"] = min(0.98, skor_akhir["kutu_daun_aphids"] * 1.20)

    # Korelasi 3: Ulat Grayak / Penggulung cenderung meningkat pada kelembaban tinggi (>75%)
    if sensor_moisture > 75:
        if "ulat_grayak" in skor_akhir:
            skor_akhir["ulat_grayak"] = min(0.98, skor_akhir["ulat_grayak"] * 1.15)

    total = sum(skor_akhir.values())
    if total <= 0:
        return {k: 0.0 for k in skor_akhir}

    return {k: round((v / total) * 100, 2) for k, v in skor_akhir.items()}


if __name__ == "__main__":
    sample_ai = {
        "daun_layu_fusarium": 0.65,
        "tanaman_sehat": 0.35,
    }
    hasil = hitung_probabilitas_multimodal(sample_ai, sensor_moisture=82.4, sensor_ph=5.4)
    print("Hasil Diagnosa Multimodal (Moisture=82.4%, pH=5.4):", hasil)
