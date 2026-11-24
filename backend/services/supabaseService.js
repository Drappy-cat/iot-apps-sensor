/**
 * ============================================================================
 * SUPABASE STORAGE & DATABASE SERVICE FOR ESP32-CAM TIMELAPSE
 * ============================================================================
 * Mengunggah foto hasil pemotretan berkala tanaman ke Supabase Cloud Storage
 * dan mencatat riwayatnya ke tabel database Supabase secara otomatis.
 * ============================================================================
 */

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET_NAME  = process.env.SUPABASE_BUCKET || "timelapse-tanaman";

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
    console.log(`[SUPABASE] 🚀 Klien Supabase terinisialisasi: ${SUPABASE_URL}`);
  } catch (err) {
    console.warn("[SUPABASE] ⚠️ Gagal menginisialisasi Supabase:", err.message);
    supabase = null;
  }
} else {
  console.log("[SUPABASE] ℹ️ Kredensial Supabase belum diisi di .env. Foto akan disimpan di penyimpanan lokal.");
}

/**
 * Unggah foto JPEG ke Supabase Storage Bucket
 * @param {Buffer} buffer - Binary data JPEG foto
 * @param {string} filename - Nama file (misal: snap_2026-11-24_20-15-00.jpg)
 * @returns {Promise<{ success: boolean, publicUrl?: string, error?: string }>}
 */
async function uploadToSupabase(buffer, filename) {
  if (!supabase) {
    return {
      success: false,
      error: "Supabase belum dikonfigurasi (SUPABASE_URL & SUPABASE_ANON_KEY kosong)",
    };
  }

  try {
    // 1. Unggah buffer binary ke Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[SUPABASE] ❌ Gagal upload ke storage:", uploadError.message);
      return { success: false, error: uploadError.message };
    }

    // 2. Dapatkan Public URL foto
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const publicUrl = urlData?.publicUrl || "";
    console.log(`[SUPABASE] ☁️ Foto berhasil diunggah ke Supabase Cloud! URL: ${publicUrl}`);

    // 3. Catat ke tabel riwayat (opsional jika tabel 'plant_timelapse' sudah dibuat)
    try {
      await supabase.from("plant_timelapse").insert([
        {
          filename: filename,
          image_url: publicUrl,
          size_bytes: buffer.length,
          captured_at: new Date().toISOString(),
        },
      ]);
    } catch (dbErr) {
      // Abaikan jika tabel belum dibuat di Supabase
    }

    return {
      success: true,
      publicUrl,
      path: uploadData?.path,
    };
  } catch (err) {
    console.error("[SUPABASE] ⚠️ Exception upload:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Ambil daftar foto timelapse terbaru dari Supabase
 */
async function getSupabaseTimelapsePhotos(limit = 50) {
  if (!supabase) return { count: 0, photos: [] };

  try {
    // Coba ambil dari tabel database terlebih dahulu
    const { data: dbData, error: dbErr } = await supabase
      .from("plant_timelapse")
      .select("*")
      .order("captured_at", { ascending: false })
      .limit(limit);

    if (!dbErr && dbData && dbData.length > 0) {
      return {
        count: dbData.length,
        photos: dbData.map((row) => ({
          filename: row.filename,
          url: row.image_url,
          sizeBytes: row.size_bytes,
          timestamp: row.captured_at,
          formattedTime: new Date(row.captured_at).toLocaleString("id-ID"),
        })),
      };
    }

    // Fallback: Ambil langsung dari list file storage
    const { data: files, error: storageErr } = await supabase.storage
      .from(BUCKET_NAME)
      .list("", { limit, sortBy: { column: "created_at", order: "desc" } });

    if (!storageErr && files) {
      const photos = files
        .filter((f) => f.name.endsWith(".jpg") || f.name.endsWith(".jpeg"))
        .map((f) => {
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(f.name);
          return {
            filename: f.name,
            url: urlData?.publicUrl || "",
            sizeBytes: f.metadata?.size || 0,
            timestamp: f.created_at,
            formattedTime: new Date(f.created_at).toLocaleString("id-ID"),
          };
        });
      return { count: photos.length, photos };
    }
  } catch (e) {
    console.warn("[SUPABASE] ⚠️ Gagal fetch timelapse list:", e.message);
  }

  return { count: 0, photos: [] };
}

module.exports = {
  supabase,
  uploadToSupabase,
  getSupabaseTimelapsePhotos,
  isConfigured: () => !!supabase,
};
