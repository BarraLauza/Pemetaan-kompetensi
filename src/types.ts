export interface CompetencyScore {
  leadership: number; // 1 - 5
  communication: number; // 1 - 5
  problemSolving: number; // 1 - 5
  technicalExcellence: number; // 1 - 5
  collaboration: number; // 1 - 5
  innovation: number; // 1 - 5
  strategicThinking: number; // 1 - 5
  adaptability: number; // 1 - 5
}

export type PriorityLevel = 'Tinggi' | 'Sedang' | 'Rendah';
export type GoalStatus = 'Belum Dimulai' | 'Berjalan' | 'Selesai' | 'Tertunda';
export type CategoryType = 'Pelatihan / Kursus' | 'Mentoring & Coaching' | 'Proyek / Penugasan' | 'Sertifikasi' | 'Belajar Mandiri';

export interface IDPActionItem {
  id: string;
  task: string;
  completed: boolean;
  dueDate?: string;
}

export interface IDPGoal {
  id: string;
  title: string;
  category: CategoryType;
  competencyTarget: string;
  actionItems: IDPActionItem[];
  targetDate: string;
  priority: PriorityLevel;
  status: GoalStatus;
  managerNotes?: string;
  metrics?: string;
}

export interface IDPPlan {
  id: string;
  employeeId: string;
  targetRole: string;
  overallProgress: number; // 0 - 100
  updatedAt: string;
  goals: IDPGoal[];
}

export interface CustomCompetencyItem {
  name: string;
  score: number; // 1.0 - 5.0
  description?: string;
  category?: string;
}

export interface Employee {
  id: string;
  nip: string;
  name: string;
  position: string;
  department: string;
  email: string;
  assessmentDate: string;
  overallScore: number; // 0 - 100
  performanceScore: number; // 1 - 5
  potentialScore: number; // 1 - 5
  talentBox: string; // e.g. "Bintang / Top Talent", "Pekerja Keras", "Pemain Utama", "Potensial Tinggi", dll.
  competencies: CompetencyScore;
  customCompetencies?: CustomCompetencyItem[]; // Competency items extracted directly from PDF assessment file
  competencyMatrixScores?: { [competencyName: string]: number }; // Exact scores (1-5) for standard 14 matrix competencies from PDF
  strengths: string[];
  weaknesses: string[];
  keyInsights: string;
  recommendedRoles: string[];
  recommendationCategory?: 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan';
  evaluatedPosition?: string;
  thinkingCapacity?: string;
  competenciesToDevelop?: string[];
  briefReading?: string;
  mainStrengths?: string;
  developmentAreas?: string;
  followUpNotes?: string;
  idp: IDPPlan;
  iqScore?: number; // Nilai IQ (skala 90-145)
  targetDepartment?: string; // Departemen Tujuan untuk Mapping Karir / Rotasi / Promosi
  summary?: string;
  uploadedPdfName?: string; // Nama file dokumen PDF assessment asli yang diunggah
  isUploadedFromPdf?: boolean; // Penanda dokumen berasal dari berkas PDF asesmen
  source?: 'pdf_upload' | 'manual'; // Sumber data kandidat
  psychologicalProfile?: {
    intellectual?: string;
    workStyle?: string;
    personality?: string;
    leadershipStyle?: string;
  };
  performance?: number;
  potential?: number;
}

export interface CompetencyDefinition {
  key: keyof CompetencyScore;
  label: string;
  description: string;
}

export const COMPETENCY_DEFINITIONS: CompetencyDefinition[] = [
  { key: 'leadership', label: 'Kepemimpinan (Leadership)', description: 'Kemampuan memimpin, mengarahkan, dan menginspirasi anggota tim.' },
  { key: 'communication', label: 'Komunikasi', description: 'Kejelasan dalam menyampaikan gagasan dan mendengarkan masukan.' },
  { key: 'problemSolving', label: 'Pemecahan Masalah (Problem Solving)', description: 'Kemampuan menganalisis akar masalah dan menemukan solusi efektif.' },
  { key: 'technicalExcellence', label: 'Keahlian Teknis (Technical)', description: 'Penguasaan keterampilan dan alat teknis sesuai bidang pekerjaan.' },
  { key: 'collaboration', label: 'Kolaborasi & Kerjasama', description: 'Kemampuan bekerja efektif dalam tim lintas divisi.' },
  { key: 'innovation', label: 'Inovasi & Kreativitas', description: 'Kemampuan menghasilkan ide baru dan pembaruan proses kerja.' },
  { key: 'strategicThinking', label: 'Berpikir Strategis', description: 'Visi jangka panjang dan pemahaman arah bisnis organisasi.' },
  { key: 'adaptability', label: 'Adaptabilitas & Resiliensi', description: 'Kemampuan beradaptasi cepat terhadap perubahan kondisi kerja.' },
];

export const TALENT_BOX_CATEGORIES = [
  'Bintang (Star Player)',
  'Potensial Tinggi (High Potential)',
  'Kinerja Tinggi (High Performer)',
  'Kontributor Kunci (Key Contributor)',
  'Pemain Utama (Core Player)',
  'Potensi Profesional (Professional)',
  'Pengembang Diri (Enigma/Dilemma)',
  'Efektif (Effective Performer)',
  'Perlu Perhatian (Under Performer)',
] as const;

export type VisualizationSubTab = 
  | 'executive_summary'
  | 'competency_charts'
  | 'assessment_summary_table'
  | 'strengths_weaknesses_table'
  | 'collective_development';

export interface VisualizationMenuOption {
  id: VisualizationSubTab;
  title: string;
  shortTitle: string;
  description: string;
}

export const VISUALIZATION_MENU_OPTIONS: VisualizationMenuOption[] = [
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    shortTitle: 'Executive Summary',
    description: 'Ringkasan eksekutif laporan lengkap: ringkasan rekomendasi, tabel hasil assessment, matriks kekuatan & pengembangan, dan prioritas intervensi kolektif.'
  },
  {
    id: 'competency_charts',
    title: 'Visualisasi Kompetensi Karyawan & Departemen',
    shortTitle: 'Visualisasi Kompetensi',
    description: 'Radar spider chart, komparasi standar benchmark (4.0), pemetaan talenta per divisi & profil individu.'
  }
];
