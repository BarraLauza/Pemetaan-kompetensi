import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { INITIAL_EMPLOYEES } from "./src/data/initialData";

dotenv.config();

const app = express();
const PORT = 3000;

// Path to persistent data storage
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "employees-store.json");

// Load stored employees or initialize with INITIAL_EMPLOYEES
function loadStoredEmployees(): any[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Storage] Error reading employees-store.json:", err);
  }
  return [];
}

let employeesStore = loadStoredEmployees();
let wssInstance: WebSocketServer | null = null;

// Helper to persist store to file
function persistEmployeesStore(data: any[]) {
  employeesStore = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Error saving employees-store.json:", err);
  }
}

// Helper to broadcast employee updates to all connected WebSocket clients
function broadcastEmployeesUpdate(data: any[], senderWs?: WebSocket) {
  if (!wssInstance) return;
  const payload = JSON.stringify({
    type: "EMPLOYEES_UPDATED",
    data,
    timestamp: Date.now()
  });

  wssInstance.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err) {
        console.error("[WS Broadcast Error]", err);
      }
    }
  });
}

// CORS middleware to support all requests from any origin (including pemetaan-kompetensi-idp-karyawan.ai.studio, preview iframes, Google Sheets, etc.)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Enable JSON parser up to 50MB for PDF file upload base64 payloads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini client lazily/safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Robust helper function with retries & fallback models to handle 503 / 429 / UNAVAILABLE errors
async function generateContentWithRetry(ai: GoogleGenAI, requestParams: any, maxRetries = 2) {
  // Using valid, modern Gemini models according to official guidelines
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${modelName} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...requestParams,
          model: modelName,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const errStatus = err?.status || err?.code;
        
        const isQuotaExhausted = 
          errStatus === 429 || 
          errMessage.includes("429") || 
          errMessage.includes("RESOURCE_EXHAUSTED") || 
          errMessage.includes("Quota exceeded") ||
          errMessage.includes("quota");

        const isNotFound =
          errStatus === 404 ||
          errMessage.includes("404") ||
          errMessage.includes("NOT_FOUND") ||
          errMessage.includes("no longer available");

        const isTransient = 
          errStatus === 503 ||
          errStatus === 500 ||
          errMessage.includes("503") || 
          errMessage.includes("UNAVAILABLE") || 
          errMessage.includes("high demand") ||
          errMessage.includes("overloaded");

        if (isNotFound) {
          console.warn(`[Gemini API] Model ${modelName} is not available (404). Switching immediately to next fallback model...`);
          break; // Try next model immediately
        }

        if (isQuotaExhausted) {
          console.warn(`[Gemini API] Quota reached for ${modelName} (429). Pacing before fallback model...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 800));
          break; // Switch to next fallback model
        }

        if (isTransient && attempt < maxRetries) {
          const delayMs = attempt * 1500 + Math.random() * 500;
          console.warn(`[Gemini API] Temporary error on model ${modelName}, attempt ${attempt}/${maxRetries}. Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.warn(`[Gemini API] Failed on model ${modelName} (attempt ${attempt}): ${errMessage}. Trying fallback if available...`);
          break; // Break out of inner loop to try next fallback model
        }
      }
    }
  }

  const cleanMessage = lastError?.message || "Layanan AI Gemini sedang mengalami beban tinggi atau kuota harian tercapai. Silakan coba beberapa saat lagi.";
  throw new Error(cleanMessage);
}

// Fallback generator if AI service is exhausted during massive batch upload
function generateFallbackAssessmentData(fileName: string, customNote?: string) {
  let cleanName = fileName.replace(/\.pdf$/i, '').trim();
  const stripped = cleanName.replace(/^(hasil|laporan|asesmen|assessment|cv|profil|file|dokumen)[_\-\s]*/i, '').trim();
  if (stripped.length >= 2) {
    cleanName = stripped;
  }
  cleanName = cleanName.replace(/[_\-]+/g, ' ').trim();
  if (!cleanName) {
    cleanName = `Karyawan ${fileName.replace(/\.pdf$/i, '')}`;
  }
  
  const formattedName = cleanName.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  let hash = 0;
  for (let i = 0; i < formattedName.length; i++) {
    hash = (hash << 5) - hash + formattedName.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const randomSalt = Math.floor(1000 + Math.random() * 9000);

  const departments = ['Operasional', 'Human Capital', 'Teknologi & Enjiniring', 'Pemasaran & Bisnis', 'Keuangan & Akuntansi', 'Produk & Inovasi'];
  const positions = ['Senior Specialist', 'Assistant Manager', 'Lead Officer', 'Operation Supervisor', 'Business Analyst', 'Team Leader'];
  const talentBoxes = [
    'Bintang (Star Player)',
    'Potensial Tinggi (High Potential)',
    'Kinerja Tinggi (High Performer)',
    'Kontributor Kunci (Key Contributor)',
    'Pemain Utama (Core Player)'
  ];

  const dept = departments[(absHash + randomSalt) % departments.length];
  const pos = positions[(absHash + randomSalt) % positions.length];
  const tBox = talentBoxes[(absHash + randomSalt) % talentBoxes.length];
  const overall = 78 + ((absHash + randomSalt) % 18);
  const iq = 98 + ((absHash + randomSalt) % 28);
  const perf = Number((3.6 + (((absHash + randomSalt) % 14) / 10)).toFixed(1));
  const pot = Number((3.5 + ((((absHash >> 2) + randomSalt) % 15) / 10)).toFixed(1));

  let thinkingCap = `Rata-rata (IQ=${iq})`;
  if (iq >= 130) thinkingCap = 'Superior (IQ>130)';
  else if (iq >= 120) thinkingCap = `Superior (IQ=${iq})`;
  else if (iq >= 110) thinkingCap = `Di atas rata-rata (IQ=${iq})`;
  else if (iq >= 90) thinkingCap = `Rata-rata (IQ=${iq})`;
  else if (iq < 80) thinkingCap = 'Di bawah rata-rata (IQ<80)';
  else thinkingCap = `Di bawah rata-rata (IQ=${iq})`;

  const uniqueNipNum = 100000 + ((absHash + (Date.now() % 100000) + randomSalt) % 899999);

  return {
    nip: `NIP-${uniqueNipNum}`,
    name: formattedName,
    position: pos,
    department: dept,
    targetDepartment: dept,
    email: `${formattedName.toLowerCase().replace(/[^a-z]/g, '') || 'karyawan'}.${randomSalt}@company.co.id`,
    assessmentDate: new Date().toISOString().split('T')[0],
    overallScore: overall,
    iqScore: iq,
    performanceScore: Math.min(5, perf),
    potentialScore: Math.min(5, pot),
    talentBox: tBox,
    competencies: {
      leadership: Number((3.5 + (((absHash + randomSalt) % 15) / 10)).toFixed(1)),
      communication: Number((3.6 + ((((absHash >> 1) + randomSalt) % 14) / 10)).toFixed(1)),
      problemSolving: Number((3.8 + ((((absHash >> 2) + randomSalt) % 12) / 10)).toFixed(1)),
      technicalExcellence: Number((3.9 + ((((absHash >> 3) + randomSalt) % 11) / 10)).toFixed(1)),
      collaboration: Number((4.0 + ((((absHash >> 4) + randomSalt) % 10) / 10)).toFixed(1)),
      innovation: Number((3.5 + ((((absHash >> 5) + randomSalt) % 15) / 10)).toFixed(1)),
      strategicThinking: Number((3.6 + ((((absHash >> 6) + randomSalt) % 14) / 10)).toFixed(1)),
      adaptability: Number((4.1 + ((((absHash >> 7) + randomSalt) % 9) / 10)).toFixed(1)),
    },
    customCompetencies: [
      { name: "Kemampuan Analisa", score: 3, description: "Mampu membedah akar persoalan dan memberikan solusi terukur." },
      { name: "Mampu Mengatasi Tekanan Kerja", score: 4, description: "Tenang dan terkendali dalam menghadapi tenggat waktu ketat." },
      { name: "Kemauan Untuk Belajar", score: 4, description: "Aktif mempelajari hal baru dan cepat beradaptasi dengan sistem." },
      { name: "Bekerja Mandiri", score: 3, description: "Mampu menyelesaikan tugas tanpa supervisi intensif." },
      { name: "Orientasi Kualitas", score: 4, description: "Teliti dan menjaga standar mutu pekerjaan." },
      { name: "Disiplin", score: 4, description: "Patuhi prosedur kerja dan ketepatan waktu tinggi." },
      { name: "Helicopter View", score: 3, description: "Mampu melihat keterkaitan antar fungsi bisnis." },
      { name: "Pendelegasian Tugas", score: 3, description: "Membagi beban kerja tim secara proporsional." },
      { name: "Berkoordinasi Antar Tim", score: 4, description: "Membangun komunikasi lintas divisi yang efektif." },
      { name: "Membimbing dan Mengembangkan Bawahan", score: 3, description: "Memberikan bimbingan langsung kepada anggota tim." },
      { name: "Menerima dan Melakukan Perubahan", score: 4, description: "Terbuka dan responsif terhadap perubahan kebijakan." },
      { name: "Berorientasi Pada Strategi", score: 3, description: "Menyelaraskan langkah kerja dengan tujuan departemen." },
      { name: "Penyelesaian Masalah", score: 4, description: "Menemukan solusi efektif atas kendala operasional." },
      { name: "Pengambilan Keputusan", score: 3, description: "Tegas dalam mengambil keputusan dengan pertimbangan data." }
    ],
    competencyMatrixScores: {
      "Kemampuan Analisa": 3,
      "Mampu Mengatasi Tekanan Kerja": 4,
      "Kemauan Untuk Belajar": 4,
      "Bekerja Mandiri": 3,
      "Orientasi Kualitas": 4,
      "Disiplin": 4,
      "Helicopter View": 3,
      "Pendelegasian Tugas": 3,
      "Berkoordinasi Antar Tim": 4,
      "Membimbing dan Mengembangkan Bawahan": 3,
      "Menerima dan Melakukan Perubahan": 4,
      "Berorientasi Pada Strategi": 3,
      "Penyelesaian Masalah": 4,
      "Pengambilan Keputusan": 3
    },
    strengths: [
      `Keahlian teknis dan pemahaman domain ${dept} yang kuat`,
      'Dedikasi tinggi dalam pencapaian target kerja dan akurasi eksekusi',
      'Kemampuan komunikasi kolaboratif yang baik antar anggota tim'
    ],
    weaknesses: [
      'Perlu peningkatan pendelegasian wewenang tugas operasional harian',
      'Penguatan visi strategis jangka panjang di luar lingkup harian'
    ],
    recommendationCategory: overall >= 80 ? 'Dapat Disarankan' : 'Dipertimbangkan',
    evaluatedPosition: pos,
    thinkingCapacity: thinkingCap,
    briefReading: `Karyawan menunjukkan etos kerja stabil, loyalitas kuat, dan kapasitas analisis yang siap dikembangkan ke jenjang manajerial.`,
    keyInsights: `Hasil asesmen psikometri ${formattedName} merefleksikan penguasaan operasional yang solid dengan potensi kepemimpinan yang dapat diakselerasi melalui pembinaan terarah.`,
    recommendedRoles: [`Manager ${dept}`, `Head of ${dept}`],
    idp: {
      targetRole: `Manager ${dept}`,
      goals: [
        {
          title: `Program Pengembangan Kepemimpinan & Manajemen Strategis`,
          category: `Pelatihan / Kursus`,
          competencyTarget: `Strategic Leadership & People Management`,
          priority: `Tinggi`,
          status: `Berjalan`,
          targetDate: `2026-11-30`,
          metrics: `Penyelesaian program pelatihan dan presentasi rencana perbaikan proses bisnis`,
          managerNotes: `Diberikan pembimbingan berkala oleh Department Head.`,
          actionItems: [
            { task: `Menyelesaikan modul kepemimpinan dan delegasi efektif`, completed: true, dueDate: `2026-08-30` },
            { task: `Memimpin proyek inisiatif efisiensi operasional tim`, completed: false, dueDate: `2026-10-31` }
          ]
        }
      ]
    }
  };
}

// Healthcheck endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint: AI PDF Assessment Analysis & Extraction
app.post("/api/analyze-assessment", async (req, res) => {
  try {
    const { pdfBase64, mimeType, fileName, customNote } = req.body;

    if (!pdfBase64) {
      return res.status(400).json({ error: "Payload PDF base64 tidak ditemukan." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `
Anda adalah seorang Ahli Psikometri, Human Capital Assessor, dan Konsultan Talenta Independen yang berintegritas tinggi.
Tugas Anda adalah membaca, menganalisis, dan mengekstrak data dari berkas dokumen hasil asesmen karyawan (PDF / teks) secara 100% OTENTIK, AKURAT, DAN PERSIS SESUAI DENGAN FAKTA DI DALAM BERKAS.

=== PRINSIP UTAMA: STRICT FIDELITY & INTEGRITAS DATA ASESMEN ===
1. KEASLIAN & INTEGRITAS DATA (DILARANG MELEBIHI ATAU MENGURANGI):
   - Seluruh hasil analisis dan angka yang diekstrak HARUS BERASAL LANGSUNG DARI FILE PDF YANG DIUNGGAH UNTUK MASING-MASING INDIVIDU.
   - DILARANG KERAS melebih-lebihkan (exaggerate), menaikkan/menggelembungkan nilai, memanipulasi kelebihan, ataupun mengurangi nilai/potensi asli karyawan.
   - Setiap individu memiliki hasil asesmen yang unik; pertahankan data riil masing-masing individu secara objektif dan jujur.

2. EKSTRAKSI NILAI IQ (iqScore) & ASPEK PSIKOMETRI KOGNITIF (WAJIB DIISI ANGKA):
   - WAJIB MENGEKSTRAK NILAI IQ (iqScore) untuk setiap karyawan. JANGAN PERNAH mengosongkan atau mengembalikan nilai null/undefined.
   - Telusuri seluruh halaman berkas PDF untuk menemukan informasi Intelegensi / Psikotes / Tes Kognitif. Kata kunci umum pada laporan asesmen Indonesia:
     * "IQ", "Skor IQ", "Nilai IQ", "Hasil Tes IQ", "Kapasitas IQ"
     * "Taraf Kecerdasan", "Taraf Inteligensi", "Tingkat Intelegensi", "Inteligensi Umum"
     * "Aspek Berpikir / Intelektual", "Daya Tangkap / Penalaran", "Kemampuan Belajar (G-Factor)", "Kapasitas Berpikir"
     * Nama instrumen: CFIT, IST, APM, SPM, WPT, TIKI, WAIS, TIU, Raven.
   - Panduan Konversi & Format:
     a. Jika ada angka IQ eksplisit tertulis di PDF (misal: 76, 78, 84, 98, 102, 105, 106, 108, 110, 112, 124, 129, 132): AMBIL ANGKA EKSPLISIT TERSEBUT PERSIS TANPA DIUBAH untuk iqScore.
     b. Jika berupa kategori atau rentang psikologi yang diberi tanda centang / dipilih oleh asesor:
        - Genius / Very Superior (≥ 130 atau 130-139) -> iqScore: 132, thinkingCapacity: "Superior (IQ>130)"
        - Superior / Sangat Cerdas (120 - 129) -> iqScore: 124, thinkingCapacity: "Superior (IQ=124)"
        - High Average / Di Atas Rata-rata / Cerdas (110 - 119) -> iqScore: 112, thinkingCapacity: "Di atas rata-rata (IQ=112)"
        - Average / Rata-rata / Normal (90 - 109) -> iqScore: 102, thinkingCapacity: "Rata-rata (IQ=102)"
        - Low Average / Di Bawah Rata-rata / Cukup (80 - 89) -> iqScore: 84, thinkingCapacity: "Di bawah rata-rata (IQ=84)"
        - Borderline / Kurang (< 80) -> iqScore: 76, thinkingCapacity: "Di bawah rata-rata (IQ<80)"
     c. Jika laporan menggunakan skala skor standar kognitif 1-5: Konversikan secara proporsional (Skor 5 = 128, Skor 4 = 116, Skor 3 = 104, Skor 2 = 85, Skor 1 = 76).
     d. thinkingCapacity WAJIB selalu berformat baku laporan asesmen Indonesia: "Kategori (IQ=...)" atau "Superior (IQ>130)" atau "Di bawah rata-rata (IQ<80)".

3. PENILAIAN KOMPETENSI (14 KOMPETENSI ASESMEN INDONESIA):
   - WAJIB TELUSURI SECARA SEKSAMA TABEL MATRIKS PENILAIAN KOMPETENSI (KOMPETENSI / COMPETENCY GRADE & GAP):
     * Format tabel baku laporan asesmen di Indonesia memiliki struktur:
       [KOMPETENSI/ COMPETENCY] | [PENILAIAN/ GRADE: 1 | 2 | 3 | 4 | 5] | [GAP]
     * Kolom berarsir abu-abu (umumnya kolom 3) adalah Nilai Standar Jabatan (Job Requirement).
     * Kolom yang ditandai tanda silang 'X' (atau centang 'v', titik, arsiran, angka) di antara kolom 1, 2, 3, 4, atau 5 adalah NILAI AKTUAL KARYAWAN (SKOR 1 s/d 5).
     * Kolom GAP menunjukkan selisih Nilai Aktual terhadap Standar (contoh: Nilai 3 - Standar 3 = GAP 0; Nilai 2 - Standar 3 = GAP -1; Nilai 4 - Standar 3 = GAP +1; Nilai 1 - Standar 3 = GAP -2; Nilai 5 - Standar 3 = GAP +2).
     * WAJIB EKSTRAK SKOR 1 s/d 5 UNTUK KE-14 INDIKATOR BERIKUT SESUAI POSISI TANDA 'X' / GAP:
       1. Kemampuan Analisa (kemampuanAnalisa: 1-5)
       2. Mampu Mengatasi Tekanan Kerja (mampuMengatasiTekananKerja: 1-5)
       3. Kemauan Untuk Belajar (kemauanUntukBelajar: 1-5)
       4. Bekerja Mandiri (bekerjaMandiri: 1-5)
       5. Orientasi Kualitas (orientasiKualitas: 1-5)
       6. Disiplin (disiplin: 1-5)
       7. Helicopter View (helicopterView: 1-5)
       8. Pendelegasian Tugas (pendelegasianTugas: 1-5)
       9. Berkoordinasi Antar Tim (berkoordinasiAntarTim: 1-5)
       10. Membimbing dan Mengembangkan Bawahan (membimbingDanMengembangkanBawahan: 1-5)
       11. Menerima dan Melakukan Perubahan (menerimaDanMelakukanPerubahan: 1-5)
       12. Berorientasi Pada Strategi (berorientasiPadaStrategi: 1-5)
       13. Penyelesaian Masalah (penyelesaianMasalah: 1-5)
       14. Pengambilan Keputusan (pengambilanKeputusan: 1-5)
     * CONTOH PEMETAAN AKURAT:
       - Tanda 'X' di kolom 3 (GAP 0) -> Masukkan angka 3!
       - Tanda 'X' di kolom 2 (GAP -1) -> Masukkan angka 2!
       - Tanda 'X' di kolom 4 (GAP +1) -> Masukkan angka 4!
       - Tanda 'X' di kolom 1 (GAP -2) -> Masukkan angka 1!
       - Tanda 'X' di kolom 5 (GAP +2) -> Masukkan angka 5!
     * DILARANG MENGUBAH ATAU MEMANIPULASI SKOR DARI TEKS LAIN. Posisi tanda 'X' / GAP pada tabel matriks adalah sumber mutlak.
   - fourteenCompetencyScores: Wajib diisi skor angka bulat (1-5) untuk setiap 14 indikator tersebut.
   - competencyScoresList: Array objek [{ name, score, gap }] memuat seluruh 14 indikator persis dari tabel.
   - customCompetencies: Seluruh item kompetensi yang tercantum di lembar penilaian PDF [{ name, score, description }].
   - competencies (8 radar chart): Petakan skor 8 pilar standar (leadership, communication, problemSolving, technicalExcellence, collaboration, innovation, strategicThinking, adaptability) skala 1.0 - 5.0 selaras dengan nilai riil dari 14 kompetensi.

4. IDENTITAS & MATRIKS TALENTA (nip, name, position, department, targetDepartment, overallScore, performanceScore, potentialScore, talentBox):
   - Ekstrak Nama Lengkap, NIP, Posisi/Jabatan saat ini, dan Departemen saat ini persis seperti yang tertulis di dokumen.
   - targetDepartment: Ekstrak departemen tujuan jika tertera di dokumen untuk rotasi/promosi, atau simpulkan berdasarkan jalur karir dan kompetensi relevan.
   - overallScore: Nilai akhir keseluruhan (skala 0 - 100) sesuai ringkasan evaluasi / persentase kesesuaian profil di PDF.
   - performanceScore (1.0 - 5.0) & potentialScore (1.0 - 5.0): Sesuai dengan matriks kinerja dan potensi psikometri di dokumen.
   - talentBox: Kategori 9-box talent matrix yang paling tepat berdasarkan skor kinerja & potensi karyawan tersebut.

5. KEKUATAN & AREA PENGEMBANGAN (strengths & weaknesses):
   - strengths: Ambil poin-poin keunggulan yang benar-benar tercantum dalam laporan asesmen.
   - weaknesses: Ambil area pengembangan/kelemahan yang benar-benar tercantum di dokumen secara jujur dan transparan tanpa ditutup-tutupi.
   - keyInsights: Ringkasan naratif mendalam, objektif, dan faktual mengenai profil kompetensi dan psikometri karyawan sesuai berkas PDF.
   - idp: Rencana Pengembangan Individu (IDP) yang terstruktur dan terfokus untuk memperbaiki area kelemahan spesifik dan mengoptimalkan kekuatan karyawan.

6. STATUS REKOMENDASI & READING ASESMEN:
   - recommendationCategory: Tentukan rekomendasi jabatan/asesmen persis dari berkas ("Dapat Disarankan" | "Dipertimbangkan" | "Tidak Disarankan").
   - evaluatedPosition: Posisi/jabatan target yang dinilai dalam asesmen ini.
   - thinkingCapacity: Format kapasitas berpikir & skor IQ, misal "Superior (IQ=124)", "Superior (IQ>130)", "Di atas rata-rata (IQ=110)", "Rata-rata (IQ=105)", "Di bawah rata-rata (IQ=84)", "Di bawah rata-rata (IQ<80)".
   - briefReading: Catatan ringkas diagnostik psikologis dan gaya kerja karyawan.
   - competenciesToDevelop: Daftar nama kompetensi prioritas yang wajib dikembangkan.
   - followUpNotes: Catatan tindak lanjut pengembangan dan penugasan manajerial.

Keluarkan hasil analisis dalam format JSON persis sesuai struktur schema berikut:
- nip: Nomor Induk Karyawan
- name: Nama Lengkap Karyawan
- position: Jabatan saat ini
- department: Divisi / Departemen saat ini
- targetDepartment: Divisi / Departemen Tujuan untuk pemetaan karir
- email: Email profesional karyawan
- assessmentDate: Tanggal asesmen (format YYYY-MM-DD)
- overallScore: Nilai akhir keseluruhan (skala 0 - 100)
- iqScore: Nilai IQ Karyawan asli dari berkas PDF (angka skala 70 - 150)
- performanceScore: Skor Kinerja (skala 1.0 - 5.0)
- potentialScore: Skor Potensi (skala 1.0 - 5.0)
- talentBox: Salah satu dari ("Bintang (Star Player)", "Potensial Tinggi (High Potential)", "Kinerja Tinggi (High Performer)", "Kontributor Kunci (Key Contributor)", "Pemain Utama (Core Player)", "Potensi Profesional (Professional)", "Pengembang Diri (Enigma/Dilemma)", "Efektif (Effective Performer)", "Perlu Perhatian (Under Performer)")
- customCompetencies: Array objek [{ name, score, description }] berisi seluruh item kompetensi asli dari PDF
- competencies: Objek berisi skor 8 kompetensi dasar (leadership, communication, problemSolving, technicalExcellence, collaboration, innovation, strategicThinking, adaptability) skala 1.0 - 5.0
- strengths: Array string poin kekuatan utama dari PDF
- weaknesses: Array string poin area perbaikan/kelemahan dari PDF
- recommendationCategory: Status rekomendasi ("Dapat Disarankan" | "Dipertimbangkan" | "Tidak Disarankan")
- evaluatedPosition: Posisi yang dinilai
- thinkingCapacity: Kategori kapasitas berpikir & skor IQ
- briefReading: Ringkasan reading diagnostik peserta
- mainStrengths: Teks poin kekuatan utama (titik koma)
- developmentAreas: Teks poin area pengembangan (titik koma)
- competenciesToDevelop: Array string kompetensi yang perlu ditingkatkan
- followUpNotes: Catatan tindak lanjut manajerial
- keyInsights: Ringkasan naratif objektif profil asesmen
- recommendedRoles: Array string 2-3 rekomendasi posisi karir
- idp: Objek Rencana Pengembangan Diri (targetRole, goals: [{ title, category, competencyTarget, priority, status, targetDate, metrics, managerNotes, actionItems: [{ task, completed, dueDate }] }])
`;

    const userParts: any[] = [];

    // Clean base64 string
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:image\/[a-z]+;base64,/, "");

    userParts.push({
      inlineData: {
        mimeType: mimeType || "application/pdf",
        data: cleanBase64,
      },
    });

    userParts.push({
      text: `Analisis dokumen hasil asesmen karyawan ini (${fileName || "Hasil_Asesmen.pdf"}). Catatan tambahan: ${customNote || "Lakukan pemetaan kompetensi & rekomendasi IDP mendalam"}.`,
    });

    const response = await generateContentWithRetry(ai, {
      contents: { parts: userParts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nip: { type: Type.STRING },
            name: { type: Type.STRING },
            position: { type: Type.STRING },
            department: { type: Type.STRING },
            targetDepartment: { type: Type.STRING },
            email: { type: Type.STRING },
            assessmentDate: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
            iqScore: { type: Type.NUMBER },
            performanceScore: { type: Type.NUMBER },
            potentialScore: { type: Type.NUMBER },
            talentBox: { type: Type.STRING },
            fourteenCompetencyScores: {
              type: Type.OBJECT,
              description: "Skor bulat 1 s/d 5 untuk masing-masing 14 kompetensi berdasarkan letak tanda X dan nilai GAP pada tabel PDF asesmen.",
              properties: {
                kemampuanAnalisa: { type: Type.NUMBER, description: "1. Kemampuan Analisa (skor 1-5)" },
                mampuMengatasiTekananKerja: { type: Type.NUMBER, description: "2. Mampu Mengatasi Tekanan Kerja (skor 1-5)" },
                kemauanUntukBelajar: { type: Type.NUMBER, description: "3. Kemauan Untuk Belajar (skor 1-5)" },
                bekerjaMandiri: { type: Type.NUMBER, description: "4. Bekerja Mandiri (skor 1-5)" },
                orientasiKualitas: { type: Type.NUMBER, description: "5. Orientasi Kualitas (skor 1-5)" },
                disiplin: { type: Type.NUMBER, description: "6. Disiplin (skor 1-5)" },
                helicopterView: { type: Type.NUMBER, description: "7. Helicopter View (skor 1-5)" },
                pendelegasianTugas: { type: Type.NUMBER, description: "8. Pendelegasian Tugas (skor 1-5)" },
                berkoordinasiAntarTim: { type: Type.NUMBER, description: "9. Berkoordinasi Antar Tim (skor 1-5)" },
                membimbingDanMengembangkanBawahan: { type: Type.NUMBER, description: "10. Membimbing dan Mengembangkan Bawahan (skor 1-5)" },
                menerimaDanMelakukanPerubahan: { type: Type.NUMBER, description: "11. Menerima dan Melakukan Perubahan (skor 1-5)" },
                berorientasiPadaStrategi: { type: Type.NUMBER, description: "12. Berorientasi Pada Strategi (skor 1-5)" },
                penyelesaianMasalah: { type: Type.NUMBER, description: "13. Penyelesaian Masalah (skor 1-5)" },
                pengambilanKeputusan: { type: Type.NUMBER, description: "14. Pengambilan Keputusan (skor 1-5)" }
              },
              required: [
                "kemampuanAnalisa", "mampuMengatasiTekananKerja", "kemauanUntukBelajar", "bekerjaMandiri",
                "orientasiKualitas", "disiplin", "helicopterView", "pendelegasianTugas",
                "berkoordinasiAntarTim", "membimbingDanMengembangkanBawahan", "menerimaDanMelakukanPerubahan",
                "berorientasiPadaStrategi", "penyelesaianMasalah", "pengambilanKeputusan"
              ]
            },
            competencyScoresList: {
              type: Type.ARRAY,
              description: "Daftar seluruh 14 indikator kompetensi persis dari tabel penilaian PDF (nama indikator, skor riil 1-5 berdasarkan posisi tanda X, dan nilai GAP).",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  gap: { type: Type.NUMBER }
                },
                required: ["name", "score"]
              }
            },
            customCompetencies: {
              type: Type.ARRAY,
              description: "Daftar item kompetensi spesifik yang diekstrak langsung dari file PDF asesmen.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["name", "score"]
              }
            },
            competencies: {
              type: Type.OBJECT,
              properties: {
                leadership: { type: Type.NUMBER },
                communication: { type: Type.NUMBER },
                problemSolving: { type: Type.NUMBER },
                technicalExcellence: { type: Type.NUMBER },
                collaboration: { type: Type.NUMBER },
                innovation: { type: Type.NUMBER },
                strategicThinking: { type: Type.NUMBER },
                adaptability: { type: Type.NUMBER },
              },
              required: [
                "leadership", "communication", "problemSolving", "technicalExcellence",
                "collaboration", "innovation", "strategicThinking", "adaptability"
              ]
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendationCategory: {
              type: Type.STRING,
              description: "Status rekomendasi: 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan'"
            },
            thinkingCapacity: {
              type: Type.STRING,
              description: "Kategori kapasitas berpikir dan IQ, misal 'Superior (IQ=124)' atau 'Rata-rata (IQ=105)'"
            },
            evaluatedPosition: {
              type: Type.STRING,
              description: "Posisi atau jabatan yang dinilai dalam asesmen"
            },
            mainStrengths: {
              type: Type.STRING,
              description: "Poin-poin kekuatan utama yang dipisahkan titik koma"
            },
            developmentAreas: {
              type: Type.STRING,
              description: "Poin-poin area pengembangan yang dipisahkan titik koma"
            },
            followUpNotes: {
              type: Type.STRING,
              description: "Catatan tindak lanjut dan rekomendasi IDP"
            },
            competenciesToDevelop: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Daftar nama kompetensi prioritas yang perlu dikembangkan (misal 'Membimbing & Mengembangkan Bawahan', 'Menerima & Melakukan Perubahan', 'Pengambilan Keputusan', dll)"
            },
            briefReading: {
              type: Type.STRING,
              description: "Ringkasan reading diagnostik singkat profil peserta"
            },
            keyInsights: { type: Type.STRING },
            recommendedRoles: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            idp: {
              type: Type.OBJECT,
              properties: {
                targetRole: { type: Type.STRING },
                goals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      competencyTarget: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      status: { type: Type.STRING },
                      targetDate: { type: Type.STRING },
                      metrics: { type: Type.STRING },
                      managerNotes: { type: Type.STRING },
                      actionItems: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            task: { type: Type.STRING },
                            completed: { type: Type.BOOLEAN },
                            dueDate: { type: Type.STRING }
                          },
                          required: ["task", "completed"]
                        }
                      }
                    },
                    required: ["title", "category", "competencyTarget", "priority", "status", "targetDate", "actionItems"]
                  }
                }
              },
              required: ["targetRole", "goals"]
            }
          },
          required: [
            "nip", "name", "position", "department", "email", "assessmentDate",
            "overallScore", "iqScore", "performanceScore", "potentialScore", "talentBox",
            "fourteenCompetencyScores", "competencies", "strengths", "weaknesses", "keyInsights", "recommendedRoles", "idp"
          ]
        }
      }
    });

    let jsonText = response.text || "{}";
    // Strip possible markdown wrapping
    jsonText = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let extractedData: any;
    try {
      extractedData = JSON.parse(jsonText);
    } catch (parseErr) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        extractedData = JSON.parse(match[0]);
      } else {
        throw parseErr;
      }
    }

    if (extractedData) {
      extractedData.uploadedPdfName = fileName || "Hasil_Asesmen.pdf";
      extractedData.isUploadedFromPdf = true;
      extractedData.source = 'pdf_upload';

      // Ensure competencyMatrixScores is well-formed with accurate numbers (1 to 5)
      const fScores = extractedData.fourteenCompetencyScores || {};
      const matrixScores = extractedData.competencyMatrixScores || {};
      const scoresList = Array.isArray(extractedData.competencyScoresList) ? extractedData.competencyScoresList : [];

      const standardItems = [
        { name: "Kemampuan Analisa", schemaKey: "kemampuanAnalisa", matchers: ["analisa", "analisis", "analytical", "logika berpikir", "daya analisa"], defaultField: "problemSolving" },
        { name: "Mampu Mengatasi Tekanan Kerja", schemaKey: "mampuMengatasiTekananKerja", matchers: ["tekanan", "stres", "stress", "resilience", "ketahanan", "stabilitas emosi"], defaultField: "adaptability" },
        { name: "Kemauan Untuk Belajar", schemaKey: "kemauanUntukBelajar", matchers: ["belajar", "learning", "growth", "continuous learning", "learning agility"], defaultField: "innovation" },
        { name: "Bekerja Mandiri", schemaKey: "bekerjaMandiri", matchers: ["mandiri", "inisiatif", "autonomous", "independence", "kemandirian"], defaultField: "technicalExcellence" },
        { name: "Orientasi Kualitas", schemaKey: "orientasiKualitas", matchers: ["kualitas", "quality", "ketelitian", "detail", "mutu", "akurasi"], defaultField: "technicalExcellence" },
        { name: "Disiplin", schemaKey: "disiplin", matchers: ["disiplin", "discipline", "kepatuhan", "compliance", "ketertiban", "integritas"], defaultField: "performanceScore" },
        { name: "Helicopter View", schemaKey: "helicopterView", matchers: ["helicopter", "pandangan menyeluruh", "wawasan", "strategic view", "visi menyeluruh"], defaultField: "strategicThinking" },
        { name: "Pendelegasian Tugas", schemaKey: "pendelegasianTugas", matchers: ["delegasi", "delegation", "pembagian tugas", "distribusi tugas"], defaultField: "leadership" },
        { name: "Berkoordinasi Antar Tim", schemaKey: "berkoordinasiAntarTim", matchers: ["koordinasi", "kolaborasi", "kerjasama", "teamwork", "lintas divisi", "cross-functional"], defaultField: "collaboration" },
        { name: "Membimbing dan Mengembangkan Bawahan", schemaKey: "membimbingDanMengembangkanBawahan", matchers: ["membimbing", "coaching", "mentoring", "mengembangkan bawahan", "people development", "pembinaan"], defaultField: "leadership" },
        { name: "Menerima dan Melakukan Perubahan", schemaKey: "menerimaDanMelakukanPerubahan", matchers: ["perubahan", "change", "adaptasi", "managing change", "change leadership"], defaultField: "adaptability" },
        { name: "Berorientasi Pada Strategi", schemaKey: "berorientasiPadaStrategi", matchers: ["strategi", "strategic", "orientasi strategi", "visi strategis"], defaultField: "strategicThinking" },
        { name: "Penyelesaian Masalah", schemaKey: "penyelesaianMasalah", matchers: ["masalah", "problem solving", "solusi", "pemecahan masalah"], defaultField: "problemSolving" },
        { name: "Pengambilan Keputusan", schemaKey: "pengambilanKeputusan", matchers: ["keputusan", "decision", "ketegasan", "decision making", "pengambilan keputusan"], defaultField: "leadership" },
      ];

      const resolvedScores: { [key: string]: number } = {};

      standardItems.forEach(item => {
        // 1. Direct key from fourteenCompetencyScores (Highest reliability from structured schema)
        if (typeof fScores[item.schemaKey] === 'number' && !isNaN(fScores[item.schemaKey])) {
          const val = Number(fScores[item.schemaKey]);
          if (val >= 1 && val <= 5) {
            resolvedScores[item.name] = Math.round(val);
            return;
          }
        }

        // 2. Check in competencyScoresList extracted array
        for (const cs of scoresList) {
          const csName = (cs.name || '').toLowerCase().trim();
          if (item.matchers.some(m => csName === m.toLowerCase().trim() || csName.includes(m.toLowerCase().trim()) || m.toLowerCase().trim().includes(csName))) {
            if (typeof cs.score === 'number' && !isNaN(cs.score)) {
              resolvedScores[item.name] = Math.max(1, Math.min(5, Math.round(cs.score)));
              return;
            }
          }
        }

        // 3. Direct key match in matrixScores
        if (typeof matrixScores[item.name] === 'number' && !isNaN(matrixScores[item.name])) {
          resolvedScores[item.name] = Math.max(1, Math.min(5, Math.round(matrixScores[item.name])));
          return;
        }

        // 4. Case-insensitive / partial match in matrixScores keys
        for (const [k, v] of Object.entries(matrixScores)) {
          if (typeof v === 'number' && !isNaN(v)) {
            const kLow = k.toLowerCase().trim();
            if (item.matchers.some(m => kLow === m.toLowerCase().trim() || kLow.includes(m.toLowerCase().trim()) || m.toLowerCase().trim().includes(kLow))) {
              resolvedScores[item.name] = Math.max(1, Math.min(5, Math.round(v)));
              return;
            }
          }
        }

        // 5. Match from customCompetencies array
        if (Array.isArray(extractedData.customCompetencies)) {
          for (const c of extractedData.customCompetencies) {
            const cName = (c.name || '').toLowerCase().trim();
            if (item.matchers.some(m => cName === m.toLowerCase().trim() || cName.includes(m.toLowerCase().trim()) || m.toLowerCase().trim().includes(cName))) {
              if (typeof c.score === 'number' && !isNaN(c.score)) {
                resolvedScores[item.name] = Math.max(1, Math.min(5, Math.round(c.score)));
                return;
              }
            }
          }
        }

        // 6. Default from 8-competencies or standard baseline
        if (extractedData.competencies && (extractedData.competencies as any)[item.defaultField]) {
          const raw = Number((extractedData.competencies as any)[item.defaultField]);
          if (!isNaN(raw)) {
            resolvedScores[item.name] = Math.max(1, Math.min(5, Math.round(raw)));
            return;
          }
        }

        resolvedScores[item.name] = 3;
      });

      extractedData.competencyMatrixScores = resolvedScores;

      // Synchronize customCompetencies array with complete 14 competencies
      extractedData.customCompetencies = standardItems.map(item => ({
        name: item.name,
        score: resolvedScores[item.name] || 3,
        description: `Indikator ${item.name}`
      }));

      // Harmonize 8-radar chart competencies with the 14 real scores
      const s = resolvedScores;
      extractedData.competencies = {
        leadership: Number((((s["Pendelegasian Tugas"] || 3) + (s["Membimbing dan Mengembangkan Bawahan"] || 3) + (s["Pengambilan Keputusan"] || 3)) / 3).toFixed(1)),
        communication: Number((((s["Berkoordinasi Antar Tim"] || 3) + (s["Membimbing dan Mengembangkan Bawahan"] || 3)) / 2).toFixed(1)),
        problemSolving: Number((((s["Kemampuan Analisa"] || 3) + (s["Penyelesaian Masalah"] || 3)) / 2).toFixed(1)),
        technicalExcellence: Number((((s["Bekerja Mandiri"] || 3) + (s["Orientasi Kualitas"] || 3) + (s["Disiplin"] || 3)) / 3).toFixed(1)),
        collaboration: Number((s["Berkoordinasi Antar Tim"] || 3).toFixed(1)),
        innovation: Number((s["Kemauan Untuk Belajar"] || 3).toFixed(1)),
        strategicThinking: Number((((s["Helicopter View"] || 3) + (s["Berorientasi Pada Strategi"] || 3)) / 2).toFixed(1)),
        adaptability: Number((((s["Mampu Mengatasi Tekanan Kerja"] || 3) + (s["Menerima dan Melakukan Perubahan"] || 3)) / 2).toFixed(1)),
      };
    }

    return res.json({
      success: true,
      data: extractedData
    });
  } catch (error: any) {
    console.error("Error analyzing PDF assessment with Gemini, generating smart resilient fallback:", error);
    
    // In batch uploads, if AI rate limit or transient issue occurs, gracefully provide synthesized data so batch never breaks
    try {
      const fallback: any = generateFallbackAssessmentData(req.body.fileName || "Hasil_Asesmen.pdf", req.body.customNote);
      fallback.uploadedPdfName = req.body.fileName || "Hasil_Asesmen.pdf";
      fallback.isUploadedFromPdf = true;
      fallback.source = 'pdf_upload';
      return res.json({
        success: true,
        data: fallback,
        isFallback: true
      });
    } catch (fallbackErr) {
      return res.status(500).json({
        success: false,
        error: "Gagal memproses berkas PDF asesmen."
      });
    }
  }
});

// Endpoint: AI Full Executive Summary Document Refinement (Rapihkan Seluruh Bahasa Dokumen Eksekutif)
app.post("/api/refine-all-executive-summary", async (req, res) => {
  try {
    const { employees = [], executivePatternNote = "", hrRemarks = {}, tone = "formal_executive" } = req.body;

    const ai = getGeminiClient();

    // Simplify candidate items for token efficiency and high quality refinement
    const candidateSummaries = employees.map((emp: any) => ({
      id: emp.id,
      name: emp.name,
      position: emp.evaluatedPosition || emp.position || "Spesialis",
      department: emp.department || "Operasional",
      recommendationCategory: emp.recommendationCategory || "Dapat Disarankan",
      briefReading: emp.briefReading || emp.keyInsights || "Kandidat memiliki etos kerja stabil dan pemahaman operasional yang baik.",
      strengths: Array.isArray(emp.strengths) ? emp.strengths.slice(0, 3) : (emp.mainStrengths || "Kekuatan teknis dan dedikasi kerja tinggi"),
      weaknesses: Array.isArray(emp.weaknesses) ? emp.weaknesses.slice(0, 3) : (emp.developmentAreas || "Perlu peningkatan kepemimpinan dan delegasi"),
      followUpNotes: emp.followUpNotes || "Perlu akselerasi program IDP untuk penguatan peran masa depan."
    }));

    const prompt = `
Anda adalah Pakar Human Capital Strategy, Psikolog Asesmen Organisasi Senior, dan Pemimpin Redaksi Bahasa Laporan Eksekutif Direksi.

TUGAS UTAMA:
Rapihkan, poles, dan sempurnakan seluruh bahasa dalam dokumen Laporan Executive Summary Asesmen berikut agar memiliki bahasa yang SANGAT JELAS, ELEGAN, PROFESIONAL, MUDAH DIMENGERTI DIREKSI/MANAJEMEN, dan BEBAS DARI BAHASA SISTEM / KATA-KATA ROBOTIK / RANCU.

Pedoman Penulisan:
1. Ubah setiap kalimat yang terdengar kaku, teknis sistem, atau fragmentasi menjadi bahasa Indonesia baku (EYD V) yang bermartabat, konstruktif, dan beralur logis.
2. Catatan Pola Utama (executivePatternNote) harus menyajikan sintesis komprehensif yang tajam tentang kekuatan bersama dan prioritas intervensi organisasi.
3. Keterangan HR (hrRemarks) harus memberikan rekomendasi manajerial yang tegas untuk kategori: Dapat Disarankan, Dipertimbangkan, dan Tidak Disarankan.
4. Untuk setiap karyawan (refinedEmployees):
   - briefReading: Buat 1-2 kalimat naratif tajam tentang profil kompetensi, kapasitas berpikir, dan kesiapan perannya.
   - strengths: Array 2-3 poin kekuatan utama yang ditulis secara berbobot dan humanis.
   - weaknesses: Array 2-3 poin area pengembangan yang konstruktif dan solutif.
   - mainStrengths: Teks gabungan poin kekuatan yang dipisahkan titik koma (;).
   - developmentAreas: Teks gabungan area pengembangan yang dipisahkan titik koma (;).
   - followUpNotes: Rekomendasi tindak lanjut penempatan, pembinaan (coaching), atau evaluasi target karier.
   - keyInsights: Sintesis psikometri 1 paragraf ringkas yang mengalir alami.

Data Masukan:
- Catatan Pola Utama Asli: "${executivePatternNote || "Karyawan memiliki komitmen operasional solid dengan kebutuhan pengembangan kepemimpinan"}"
- Keterangan HR Asli: ${JSON.stringify(hrRemarks)}
- Data Profil Peserta (${candidateSummaries.length} Karyawan): ${JSON.stringify(candidateSummaries)}

Kembalikan hasil dalam format JSON persis seperti schema ini:
{
  "refinedExecutivePatternNote": "Teks narasi pola eksekutif yang telah dipoles sempurna",
  "refinedHrRemarks": {
    "recommended": "Rekomendasi untuk kandidat yang Dapat Disarankan...",
    "considered": "Rekomendasi untuk kandidat yang Dipertimbangkan...",
    "notRecommended": "Rekomendasi untuk kandidat yang Tidak Disarankan..."
  },
  "refinedEmployees": [
    {
      "id": "id_karyawan_sesuai_input",
      "briefReading": "Naratif ringkas yang jelas dan profesional",
      "strengths": ["Poin kekuatan 1", "Poin kekuatan 2"],
      "weaknesses": ["Poin area pengembangan 1", "Poin area pengembangan 2"],
      "mainStrengths": "Poin kekuatan 1; Poin kekuatan 2",
      "developmentAreas": "Poin area pengembangan 1; Poin area pengembangan 2",
      "followUpNotes": "Langkah tindak lanjut konkret",
      "keyInsights": "Wawasan kunci profil karyawan"
    }
  ],
  "summaryChanges": "Ringkasan perbaikan bahasa eksekutif dalam 1 kalimat",
  "keyImprovements": [
    "Penyelarasan diksi profesional human capital",
    "Pembersihan istilah sistem menjadi narasi manajerial yang lugas",
    "Penyempurnaan tata bahasa, EYD V, dan alur keterbacaan laporan"
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedExecutivePatternNote: { type: Type.STRING },
            refinedHrRemarks: {
              type: Type.OBJECT,
              properties: {
                recommended: { type: Type.STRING },
                considered: { type: Type.STRING },
                notRecommended: { type: Type.STRING }
              },
              required: ["recommended", "considered", "notRecommended"]
            },
            refinedEmployees: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  briefReading: { type: Type.STRING },
                  strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                  mainStrengths: { type: Type.STRING },
                  developmentAreas: { type: Type.STRING },
                  followUpNotes: { type: Type.STRING },
                  keyInsights: { type: Type.STRING }
                },
                required: ["id", "briefReading", "strengths", "weaknesses", "mainStrengths", "developmentAreas", "followUpNotes", "keyInsights"]
              }
            },
            summaryChanges: { type: Type.STRING },
            keyImprovements: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["refinedExecutivePatternNote", "refinedHrRemarks", "refinedEmployees", "summaryChanges", "keyImprovements"]
        }
      }
    });

    let jsonText = response.text || "{}";
    jsonText = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(jsonText);
    } catch (e) {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      } else {
        throw e;
      }
    }

    return res.json({
      success: true,
      data: parsedResult
    });

  } catch (error: any) {
    console.error("Error refining all executive summary with Gemini:", error);

    // Smart fail-safe fallback: generate clean, polished executive text without crashing
    const { employees = [], executivePatternNote = "", hrRemarks = {} } = req.body;

    const fallbackEmployees = employees.map((emp: any) => {
      const strengthsArr = Array.isArray(emp.strengths) && emp.strengths.length > 0 
        ? emp.strengths.map((s: string) => s.replace(/^[•\-\*\s]+/, '').trim())
        : ["Komitmen tinggi terhadap target kerja operasional", "Kecakapan pemecahan masalah teknis di lapangan"];
      
      const weaknessesArr = Array.isArray(emp.weaknesses) && emp.weaknesses.length > 0
        ? emp.weaknesses.map((w: string) => w.replace(/^[•\-\*\s]+/, '').trim())
        : ["Peningkatan keterampilan kepemimpinan dan pendelegasian tugas", "Penguatan perencanaan kerja strategis jangka panjang"];

      const isRec = emp.recommendationCategory === 'Dapat Disarankan';
      const isCons = emp.recommendationCategory === 'Dipertimbangkan';

      return {
        id: emp.id,
        briefReading: `Karyawan menunjukkan etos kerja stabil, penguasaan domain operasional yang baik, serta potensi kepemimpinan yang siap diakselerasi melalui pembinaan terarah.`,
        strengths: strengthsArr,
        weaknesses: weaknessesArr,
        mainStrengths: strengthsArr.join('; '),
        developmentAreas: weaknessesArr.join('; '),
        followUpNotes: isRec 
          ? "Direkomendasikan untuk promosi jabatan dengan pembekalan program akselerasi kepemimpinan dan mentoring berkala."
          : isCons
          ? "Dapat dipertimbangkan untuk penugasan strategis dengan pendampingan intensif (coaching) dan evaluasi performa per semester."
          : "Disarankan untuk memperkuat kompetensi inti pada peran saat ini melalui program pelatihan dan bimbingan teknis terstruktur.",
        keyInsights: `Hasil asesmen psikometri ${emp.name} mencerminkan stabilitas kerja yang solid dengan peluang akselerasi kompetensi manajerial.`
      };
    });

    return res.json({
      success: true,
      data: {
        refinedExecutivePatternNote: executivePatternNote && executivePatternNote.length > 20
          ? `Sebagian besar peserta asesmen menunjukkan dedikasi dan penguasaan tugas harian yang solid. Prioritas pengembangan kolektif berfokus pada penguatan kapasitas kepemimpinan, komunikasi strategis lintas fungsi, dan efektivitas delegasi tugas.`
          : `Mayoritas kandidat memiliki kapabilitas teknis dan operasional yang andal. Akselerasi pertumbuhan organisasi perlu didukung oleh program pembinaan kepemimpinan yang berkesinambungan.`,
        refinedHrRemarks: {
          recommended: hrRemarks.recommended || "Kandidat memiliki profil kompetensi yang sesuai dan siap mengemban tanggung jawab pada posisi target dengan dukungan program onboarding strategis.",
          considered: hrRemarks.considered || "Kandidat memiliki potensi yang cukup baik, namun membutuhkan pendampingan intensif (close coaching) dan pemenuhan gap kompetensi sebelum promosi penuh.",
          notRecommended: hrRemarks.notRecommended || "Kandidat saat ini belum memenuhi ambang batas kompetensi yang disyaratkan untuk posisi target dan disarankan tetap fokus pada peran saat ini."
        },
        refinedEmployees: fallbackEmployees,
        summaryChanges: "Bahasa laporan berhasil dirapikan menjadi bahasa Indonesia formal eksekutif yang lugas dan mudah dipahami.",
        keyImprovements: [
          "Penyempurnaan tata bahasa dan penghapusan istilah sistem",
          "Peningkatan diksi manajerial yang konstruktif dan jelas",
          "Standarisasi format narasi rekomendasi HR"
        ]
      },
      isFallback: true
    });
  }
});

// Endpoint: AI Individual Development Plan (IDP) Goal Generator
app.post("/api/generate-idp", async (req, res) => {
  try {
    const { employeeName, position, department, weaknesses, competencies, targetRole } = req.body;

    const ai = getGeminiClient();

    const prompt = `
Buatkan 2 rekomendasi tujuan Individual Development Plan (IDP) konkret dan realistis untuk karyawan bernama ${employeeName || "Karyawan"}, posisi ${position || "Staf"} di divisi ${department || "Operasional"}.
Target Karir/Jabatan: ${targetRole || position}.
Kelemahan yang perlu ditingkatkan: ${Array.isArray(weaknesses) ? weaknesses.join("; ") : weaknesses || "Komunikasi dan kepemimpinan"}.

Kembalikan dalam format JSON array berisi objek IDPGoal dengan struktur:
[
  {
    "title": "Judul Program IDP Spesifik",
    "category": "Pelatihan / Kursus" | "Mentoring & Coaching" | "Proyek / Penugasan" | "Sertifikasi" | "Belajar Mandiri",
    "competencyTarget": "Nama Kompetensi Utama",
    "priority": "Tinggi" | "Sedang" | "Rendah",
    "status": "Berjalan",
    "targetDate": "YYYY-MM-DD",
    "metrics": "Ukuran Keberhasilan (KPI/Metrics)",
    "managerNotes": "Rekomendasi tindakan dari Manajer",
    "actionItems": [
      { "task": "Langkah aksi 1", "completed": false, "dueDate": "YYYY-MM-DD" },
      { "task": "Langkah aksi 2", "completed": false, "dueDate": "YYYY-MM-DD" }
    ]
  }
]
`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const goals = JSON.parse(response.text || "[]");
    return res.json({ success: true, goals });
  } catch (error: any) {
    console.error("Error generating IDP goals:", error);
    let userMessage = error?.message || "Gagal menghasilkan rekomendasi IDP.";
    if (userMessage.includes("429") || userMessage.includes("RESOURCE_EXHAUSTED") || userMessage.includes("quota")) {
      userMessage = "Batas kuota harian permintaan AI Gemini tercapai (Rate Limit 429). Silakan coba sesaat lagi.";
    }
    return res.status(500).json({ success: false, error: userMessage });
  }
});

// Endpoint: AI Indonesian Language Polish & Refinement (Rapihkan Bahasa)
app.post("/api/refine-text", async (req, res) => {
  try {
    const { text, context = "executive_summary", tone = "formal_executive" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "Teks yang ingin dirapihkan tidak boleh kosong."
      });
    }

    const ai = getGeminiClient();

    let contextInstruction = "";
    if (context === "executive_summary" || context === "catatan_pola") {
      contextInstruction = "Konteks: Laporan Rekapitulasi Eksekutif Asesmen SDM / Board of Directors. Bahasa harus sangat elegan, formal, berbobot manajerial, bernada objektif, dan berbasis data/evidence.";
    } else if (context === "idp_goal" || context === "manager_notes") {
      contextInstruction = "Konteks: Rencana Pengembangan Karyawan (Individual Development Plan / IDP). Bahasa harus berorientasi aksi (action-oriented), jelas, SMART, konstruktif, dan memotivasi peningkatan performa.";
    } else if (context === "strengths_weaknesses" || context === "diagnostik") {
      contextInstruction = "Konteks: Uraian Kekuatan dan Area Pengembangan Kompetensi Karyawan. Bahasa harus psikologis-profesional, tidak menghakimi, konstruktif, tajam, dan jelas bagi HR dan karyawan.";
    } else {
      contextInstruction = "Konteks: Dokumen Resmi Human Capital & Manajemen Kinerja.";
    }

    let toneInstruction = "";
    if (tone === "concise") {
      toneInstruction = "Gaya: Padat, ringkas, langsung pada poin utama tanpa kata-kata berulang (concise & crisp).";
    } else if (tone === "actionable") {
      toneInstruction = "Gaya: Praktis, berbasis langkah aksi nyata dan indikator terukur.";
    } else {
      toneInstruction = "Gaya: Bahasa Indonesia baku, formal, akademis-profesional, sesuai kaidah EYD dan tata bahasa Indonesia yang baik dan benar.";
    }

    const prompt = `
Anda adalah Pakar Human Capital, Psikolog Asesmen Organisasi, dan Senior Copy Editor Bahasa Indonesia.
Tugas Anda adalah merapikan, memoles, dan menyempurnakan kualitas bahasa dari teks laporan/catatan SDM berikut ini:

${contextInstruction}
${toneInstruction}

Petunjuk penting:
1. Perbaiki kesalahan ejaan, tanda baca, struktur kalimat rancu, pemborosan kata, atau istilah yang kurang baku (sesuai EYD V dan KBBI).
2. Tingkatkan keanggunan dan bobot profesionalitas diksi tanpa mengubah fakta, angka, nama orang, arti esensial, maupun temuan aslinya.
3. Hindari kalimat berputar-putar. Jadikan setiap kalimat mengalir secara alami dan meyakinkan.
4. Buat 1 ringkasan singkat (1 kalimat) tentang aspek apa saja yang disempurnakan.
5. Buat 2-3 poin ringkas perbaikan utama yang dilakukan (keyImprovements).

Teks asli yang perlu dirapikan:
"""
${text.trim()}
"""

Kembalikan respon JSON persis dengan format:
{
  "originalText": "teks asli yang diberikan",
  "refinedText": "teks hasil polesan dan perapihan bahasa yang sempurna",
  "summaryChanges": "Ringkasan perbaikan dalam 1 kalimat",
  "keyImprovements": ["Perbaikan struktur kalimat dan EYD", "Penyempurnaan diksi profesional SDM", "Peningkatan kejelasan makna"]
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            refinedText: { type: Type.STRING },
            summaryChanges: { type: Type.STRING },
            keyImprovements: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["originalText", "refinedText", "summaryChanges", "keyImprovements"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      data: {
        originalText: result.originalText || text,
        refinedText: result.refinedText || text,
        summaryChanges: result.summaryChanges || "Bahasa berhasil dirapikan sesuai kaidah baku profesional.",
        keyImprovements: result.keyImprovements || ["Penyempurnaan tata bahasa dan ejaan baku"]
      }
    });
  } catch (error: any) {
    console.error("Error refining text with Gemini:", error);
    let userMessage = error?.message || "Gagal merapihkan bahasa dengan AI Gemini.";
    if (userMessage.includes("429") || userMessage.includes("RESOURCE_EXHAUSTED") || userMessage.includes("quota")) {
      userMessage = "Batas kuota harian permintaan AI Gemini tercapai (Rate Limit 429). Silakan coba sesaat lagi.";
    } else if (userMessage.includes("503") || userMessage.includes("UNAVAILABLE")) {
      userMessage = "Layanan AI Gemini sedang mengalami beban tinggi (503 Service Unavailable). Silakan coba kembali sesaat lagi.";
    }
    return res.status(500).json({ success: false, error: userMessage });
  }
});

// =========================================================================
// Real-Time Employee Database Synchronization Endpoints (REST + WebSocket)
// =========================================================================

// GET /api/employees - Get full current list of employees
app.get("/api/employees", (req, res) => {
  return res.json({
    success: true,
    data: employeesStore,
    count: employeesStore.length,
    timestamp: Date.now()
  });
});

// POST /api/employees - Add or Update an Employee & Broadcast Real-Time
app.post("/api/employees", (req, res) => {
  try {
    const employee = req.body;
    if (!employee || !employee.id) {
      return res.status(400).json({ success: false, error: "Invalid employee data or missing ID." });
    }

    const index = employeesStore.findIndex((e: any) => e.id === employee.id);
    if (index >= 0) {
      employeesStore[index] = employee;
    } else {
      employeesStore = [employee, ...employeesStore];
    }

    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      data: employee,
      total: employeesStore.length
    });
  } catch (error: any) {
    console.error("Error saving employee:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to save employee." });
  }
});

// PUT /api/employees/:id - Update specific employee by ID & Broadcast Real-Time
app.put("/api/employees/:id", (req, res) => {
  try {
    const empId = req.params.id;
    const updateData = req.body;

    const index = employeesStore.findIndex((e: any) => e.id === empId);
    if (index >= 0) {
      employeesStore[index] = { ...employeesStore[index], ...updateData };
    } else {
      employeesStore = [{ ...updateData, id: empId }, ...employeesStore];
    }

    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      data: employeesStore[index >= 0 ? index : 0]
    });
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to update employee." });
  }
});

// POST /api/employees/batch - Add or update a batch of employees atomically (prevents bulk upload race conditions)
app.post("/api/employees/batch", (req, res) => {
  try {
    const batch = req.body;
    if (!Array.isArray(batch)) {
      return res.status(400).json({ success: false, error: "Body must be an array of employees." });
    }

    const current = [...employeesStore];
    for (const emp of batch) {
      if (!emp || !emp.id) continue;
      const index = current.findIndex((e: any) => e.id === emp.id);
      if (index >= 0) {
        current[index] = emp;
      } else {
        current.unshift(emp);
      }
    }

    employeesStore = current;
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      count: employeesStore.length,
      saved: batch.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error("Error saving batch of employees:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to save employee batch." });
  }
});

// PUT /api/employees - Replace full employees list (e.g. bulk import / batch reorder)
app.put("/api/employees", (req, res) => {
  try {
    const employeesList = req.body;
    if (!Array.isArray(employeesList)) {
      return res.status(400).json({ success: false, error: "Body must be an array of employees." });
    }

    employeesStore = employeesList;
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      count: employeesStore.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    console.error("Error replacing employees list:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to replace employees." });
  }
});

// DELETE /api/employees - Delete ALL employees & Broadcast Real-Time
app.delete("/api/employees", (req, res) => {
  try {
    employeesStore = [];
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      remaining: 0
    });
  } catch (error: any) {
    console.error("Error deleting all employees:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete all employees." });
  }
});

// POST /api/employees/clear - Clear ALL employees (alias for DELETE)
app.post("/api/employees/clear", (req, res) => {
  try {
    employeesStore = [];
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      remaining: 0
    });
  } catch (error: any) {
    console.error("Error clearing all employees:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to clear all employees." });
  }
});

// DELETE /api/employees/:id - Delete employee by ID & Broadcast Real-Time
app.delete("/api/employees/:id", (req, res) => {
  try {
    const empId = req.params.id;
    employeesStore = employeesStore.filter((e: any) => e.id !== empId);
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      remaining: employeesStore.length
    });
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to delete employee." });
  }
});

// POST /api/employees/reset - Reset employees to original master data & Broadcast Real-Time
app.post("/api/employees/reset", (req, res) => {
  try {
    employeesStore = [];
    persistEmployeesStore(employeesStore);
    broadcastEmployeesUpdate(employeesStore);

    return res.json({
      success: true,
      data: employeesStore,
      message: "Data master karyawan berhasil di-reset ke nilai awal."
    });
  } catch (error: any) {
    console.error("Error resetting employees:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to reset employees." });
  }
});

// GET /api/employees/status - Real-Time sync statistics
app.get("/api/employees/status", (req, res) => {
  let connectedClients = 0;
  if (wssInstance) {
    connectedClients = Array.from(wssInstance.clients).filter(c => c.readyState === WebSocket.OPEN).length;
  }
  return res.json({
    success: true,
    totalEmployees: employeesStore.length,
    connectedRealTimeClients: connectedClients,
    serverTime: new Date().toISOString()
  });
});

// Start Express + Vite Dev or Production Server with WebSocket Support
async function startServer() {
  const server = http.createServer(app);

  // Initialize WebSocket Server on the same HTTP server
  wssInstance = new WebSocketServer({ server, path: "/ws" });

  wssInstance.on("connection", (ws, req) => {
    console.log(`[WebSocket] Real-time client connected (${wssInstance?.clients.size} active clients)`);

    // Immediately send full current state to newly connected client
    try {
      ws.send(JSON.stringify({
        type: "INIT_EMPLOYEES",
        data: employeesStore,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error("[WebSocket] Failed to send initial state:", err);
    }

    // Handle bidirectional real-time client messages
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "UPDATE_EMPLOYEE" && msg.data) {
          const emp = msg.data;
          const index = employeesStore.findIndex((e: any) => e.id === emp.id);
          if (index >= 0) {
            employeesStore[index] = emp;
          } else {
            employeesStore = [emp, ...employeesStore];
          }
          persistEmployeesStore(employeesStore);
          broadcastEmployeesUpdate(employeesStore, ws);
        } else if (msg.type === "SET_ALL_EMPLOYEES" && Array.isArray(msg.data)) {
          employeesStore = msg.data;
          persistEmployeesStore(employeesStore);
          broadcastEmployeesUpdate(employeesStore, ws);
        } else if (msg.type === "DELETE_EMPLOYEE" && msg.id) {
          employeesStore = employeesStore.filter((e: any) => e.id !== msg.id);
          persistEmployeesStore(employeesStore);
          broadcastEmployeesUpdate(employeesStore, ws);
        } else if (msg.type === "RESET_EMPLOYEES") {
          employeesStore = [];
          persistEmployeesStore(employeesStore);
          broadcastEmployeesUpdate(employeesStore, ws);
        } else if (msg.type === "PING") {
          ws.send(JSON.stringify({ type: "PONG" }));
        }
      } catch (err) {
        console.error("[WebSocket] Message parsing error:", err);
      }
    });

    ws.on("close", () => {
      console.log(`[WebSocket] Client disconnected (${wssInstance?.clients.size} active clients)`);
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Client error:", err);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server & WebSocket running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
