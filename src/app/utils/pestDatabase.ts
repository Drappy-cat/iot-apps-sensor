export interface PestDetectionResult {
  id: string;
  name: string;
  scientificName: string;
  category: "Ulat" | "Serangga" | "Penyakit Daun" | "Tanaman Sehat";
  severity: "Aman" | "Waspada" | "Tinggi" | "Kritis";
  confidence: number;
  symptoms: string[];
  immediateActions: string[];
  preventionSolutions: string[];
  organicTreatment: string;
  sensorCorrelation: string;
  sampleDescription: string;
}

export const PEST_DATABASE: Record<string, PestDetectionResult> = {
  ulat_grayak: {
    id: "ulat_grayak",
    name: "Ulat Grayak (Pengerat Daun)",
    scientificName: "Spodoptera litura",
    category: "Ulat",
    severity: "Tinggi",
    confidence: 96,
    symptoms: [
      "Daun berlubang tidak beraturan dan tersisa tulang daun/epidermis transparan.",
      "Ditemukan larva ulat berwarna hijau kecokelatan dengan bintik hitam bergaris di punggung.",
      "Terdapat kotoran ulat berbutir hitam kecil di permukaan daun bagian bawah.",
    ],
    immediateActions: [
      "Kumpulkan dan musnahkan kelompok telur dan larva ulat secara manual pada pagi atau sore hari saat ulat aktif keluar.",
      "Semprotkan biopestisida bakteri Bacillus thuringiensis (Bt) atau ekstrak daun mimba dengan konsentrasi 10-15 ml/liter.",
      "Pangkas dan bakar daun yang telah rusak parah untuk mencegah larva berpindah ke tanaman sebelah.",
    ],
    preventionSolutions: [
      "Pasang perangkap feromon seks (Sex Pheromone Trap) 10-15 buah/hektar untuk menangkap ngengat jantan dewasa.",
      "Gunakan jaring serangga (insect net) di sekitar perimeter tanaman persemaian/lahan.",
      "Lakukan sanitasi gulma sekitar lahan yang sering menjadi sarang inang sementara ngengat.",
    ],
    organicTreatment: "Larutan ekstrak bawang putih + daun mimba + sabun cuci piring lembut (sebagai perekat alami).",
    sensorCorrelation: "Kelembaban mikro tajuk yang tinggi (>75%) mempercepat penetasan telur ngengat grayak.",
    sampleDescription: "Larva ulat abu-abu kehitaman bergerigi memakan helai daun tanaman.",
  },
  ulat_penggulung: {
    id: "ulat_penggulung",
    name: "Ulat Penggulung Daun",
    scientificName: "Cnaphalocrocis medinalis",
    category: "Ulat",
    severity: "Waspada",
    confidence: 92,
    symptoms: [
      "Helai daun terlipat memanjang dan direkatkan oleh benang sutra putih halus.",
      "Permukaan dalam daun dikikis menyisakan lapisan membran putih transparan.",
      "Ulat kecil berwarna hijau muda bening bersembunyi di dalam gulungan daun.",
    ],
    immediateActions: [
      "Buka lipatan daun yang tergulung dan tekan/musnahkan ulat di dalamnya secara mekanis.",
      "Semprotkan bio-insektisida berbasis jamur entomopatogen Beauveria bassiana pada sore hari.",
      "Hindari pemupukan Nitrogen berlebih yang membuat dinding sel daun terlalu sukulen dan disukai larva.",
    ],
    preventionSolutions: [
      "Atur jarak tanam lebih renggang agar sirkulasi udara dan penetrasi cahaya matahari maksimal ke sela daun.",
      "Konservasi musuh alami seperti tabuhan parasitoid Trichogramma sp. dan laba-laba predator.",
      "Rotasi tanaman dengan varietas non-inang setelah masa panen.",
    ],
    organicTreatment: "Aplikasi ekstrak daun tembakau dan brotowali secara teratur seminggu sekali.",
    sensorCorrelation: "Suhu lembab memicu perkembangan larva penggulung daun.",
    sampleDescription: "Daun muda menggulung membujur dengan bercak putih transparan di dalamnya.",
  },
  kutu_kebul: {
    id: "kutu_kebul",
    name: "Kutu Kebul (Vektor Virus Kuning)",
    scientificName: "Bemisia tabaci",
    category: "Serangga",
    severity: "Kritis",
    confidence: 95,
    symptoms: [
      "Koloni serangga putih kecil beterbangan menyerupai kabut halus saat daun disentuh.",
      "Muncul lapisan lengket berjamur hitam (embun jelaga) pada daun akibat ekskresi kutu.",
      "Daun mengalami klorosis (kuning belang) dan berisiko tinggi tertular Gemini Virus.",
    ],
    immediateActions: [
      "Semprotkan larutan sabun kalium / minyak mimba (neem oil) langsung menyasar bagian bawah permukaan daun.",
      "Pasang perangkap lekat kuning (Yellow Sticky Trap) setinggi tajuk tanaman untuk mereduksi populasi imago dewasa.",
      "Isolasi atau singkirkan tanaman yang sudah menunjukkan gejala virus keriting kuning permanen.",
    ],
    preventionSolutions: [
      "Tanam tanaman barrier/perangkap berbunga kuning di pematang seperti Marigold / Bunga Tahi Ayam.",
      "Semprotkan bio-pestisida jamur Lecanicillium lecanii secara berkala untuk memparasiti telur dan nimfa kutu.",
      "Gunakan mulsa plastik perak-hitam untuk memantulkan sinar UV yang menyilaukan dan mengusir kutu kebul.",
    ],
    organicTreatment: "Semprotan ramuan fermentasi air cabai, bawang putih, dan minyak goreng nabati.",
    sensorCorrelation: "Kutu kebul sangat agresif saat cuaca terik dan kelembaban tanah fluktuatif.",
    sampleDescription: "Kumpulan bintik putih kecil di bawah daun disertai noda embun jelaga hitam.",
  },
  kutu_daun_aphids: {
    id: "kutu_daun_aphids",
    name: "Kutu Daun (Aphids)",
    scientificName: "Aphis gossypii",
    category: "Serangga",
    severity: "Waspada",
    confidence: 93,
    symptoms: [
      "Koloni kutu kecil hijau kehitaman bergerombol mengerumuni pucuk daun muda dan kuncup bunga.",
      "Daun muda mengkerut, keriting, kerdil, dan pertumbuhannya terhambat.",
      "Sering terlihat semut bersimbiosis melindungi kutu di tajuk tanaman.",
    ],
    immediateActions: [
      "Semprot pucuk tanaman dengan semprotan air bertekanan tinggi untuk merontokkan koloni kutu.",
      "Aplikasikan larutan minyak mimba (neem oil) atau air sabun lerak organik di pagi/sore hari.",
      "Taburkan kapur sirih tipis di sekitar pangkal batang untuk menghentikan akses semut pembawa kutu.",
    ],
    preventionSolutions: [
      "Lestarikan kumbang kubah (ladybug / Coccinellidae) yang merupakan predator alami paling rakus pemangsa aphids.",
      "Pasang jaring insect net berkerapatan 50 mesh.",
      "Jaga keseimbangan nutrisi tanah agar tanaman memiliki lignin selulosa yang tebal dan kokoh.",
    ],
    organicTreatment: "Air rendaman abu gosok yang disaring, dicampur ekstrak daun papaya dan tembakau.",
    sensorCorrelation: "pH tanah yang terlalu asam (<6.0) melemahkan daya tahan tanaman terhadap hisapan hama kutu.",
    sampleDescription: "Pucuk daun muda berkerut dipenuhi koloni kutu hijau kecil.",
  },
  daun_layu_fusarium: {
    id: "daun_layu_fusarium",
    name: "Gejala Daun Layu & Menguning (Fusarium/Bakteri)",
    scientificName: "Fusarium oxysporum / Ralstonia",
    category: "Penyakit Daun",
    severity: "Kritis",
    confidence: 94,
    symptoms: [
      "Daun menguning mulai dari bawah lalu menjalar ke atas, terkulai layu di siang hari terik.",
      "Saat malam hari tanaman sempat tampak segar kembali, namun akhirnya layu permanen dalam 3-5 hari.",
      "Pangkal batang di dekat permukaan tanah terlihat mencokelat/busuk jika dibelah.",
    ],
    immediateActions: [
      "Segera cabut tanaman yang layu permanen bersama perakarannya dan musnahkan (bakar/kubur jauh dari lahan).",
      "Kocor lubang tanam bekas tanaman layu dengan bio-fungisida Trichoderma harzianum atau larutan PGPR.",
      "Hentikan penyiraman irigasi yang berlebihan untuk mencegah spora jamur terbawa aliran air ke tanaman sehat.",
    ],
    preventionSolutions: [
      "Pantau kelembaban tanah melalui sensor: jaga di rentang 50% - 70% dan hindari genangan air becek (>80%).",
      "Koreksi pH tanah jika masam (<6.0) dengan menaburkan kapur pertanian (Dolomit) agar jamur patogen tertekan.",
      "Gunakan benih/bibit bersertifikat tahan layu dan selalu sterilkan peralatan pangkas sebelum digunakan.",
    ],
    organicTreatment: "Kocoran suspensi jamur antagonis Trichoderma sp. dicampur kompos fermentasi matang.",
    sensorCorrelation: "Kelembaban tanah tinggi (>80%) berpadu pH asam (<5.8) adalah pemicu utama ledakan spora Fusarium.",
    sampleDescription: "Helai daun tanaman lemas terkulai lunglai dengan warna memucat kekuningan.",
  },
  tanaman_sehat: {
    id: "tanaman_sehat",
    name: "Daun & Tanaman Sehat Bebas Hama",
    scientificName: "Healthy Plant Foliage",
    category: "Tanaman Sehat",
    severity: "Aman",
    confidence: 98,
    symptoms: [
      "Warna daun hijau cerah merata dengan kilau kutikula yang sehat.",
      "Tepi dan helaian daun utuh tanpa bekas gigitan ulat atau lubang pengerat.",
      "Permukaan atas dan bawah daun bersih bebas koloni kutu, embun jelaga, maupun jaring laba-laba hama.",
    ],
    immediateActions: [
      "Pertahankan kondisi lingkungan dan siklus irigasi tetes sesuai setpoint ambang kelembaban saat ini.",
      "Lakukan inspeksi visual rutin 2 hari sekali untuk deteksi dini kemungkinan adanya hama baru.",
    ],
    preventionSolutions: [
      "Semprotkan bioprotektan penguat imun tanaman berbahan asam amino nabati atau pupuk organik cair seimbang.",
      "Pertahankan pH tanah di angka 6.0 - 7.0 agar unsur hara terserap optimal tanpa membuat tanaman stres.",
      "Bersihkan gulma liar di sekitar bedengan secara preventif.",
    ],
    organicTreatment: "Penyemprotan pupuk hayati cair mikroorganisme fotosintesis (PSB) untuk mempertebal daun.",
    sensorCorrelation: "Kelembaban (60-70%) dan pH tanah (6.5) berada dalam batas emas kesuburan perakaran.",
    sampleDescription: "Daun hijau segar bertekstur kencang tanpa noda gigitan hama.",
  },
};
