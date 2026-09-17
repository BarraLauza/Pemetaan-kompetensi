import React, { useState, useMemo } from 'react';
import { Employee, COMPETENCY_DEFINITIONS, IDPGoal } from '../types';
import { 
  COMPETENCY_SCORE_MATRIX, 
  resolveEmployeeCompetencyScore 
} from '../utils/pdfExport';
import { 
  TrendingUp, 
  Target, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  Users, 
  BookOpen, 
  Calendar, 
  ArrowRight, 
  Sparkles,
  Layers,
  FileSpreadsheet,
  CheckSquare,
  Clock,
  Briefcase
} from 'lucide-react';

interface CollectiveDevelopmentViewProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onGoToTab: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees') => void;
}

export const CollectiveDevelopmentView: React.FC<CollectiveDevelopmentViewProps> = ({
  employees,
  onSelectEmployee,
  onGoToTab
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filtered employees by department
  const activeEmployees = useMemo(() => {
    if (selectedDept === 'ALL') return employees;
    return employees.filter(e => e.department === selectedDept);
  }, [employees, selectedDept]);

  // Standard Catalog of 14 Assessment Competencies for Collective Development
  const CATALOG = useMemo(() => [
    {
      key: 'coaching',
      displayName: 'Membimbing & Mengembangkan Bawahan',
      matrixItemName: 'Membimbing dan Mengembangkan Bawahan',
      matchers: ['membimbing', 'mengembangkan bawahan', 'coaching', 'mentoring', 'people development', 'pembinaan bawahan', 'bimbingan'],
      impact: 'Kualitas kepemimpinan tim berisiko kurang merata; bimbingan ke bawahan masih cenderung reaktif atau sekadar memberi instruksi satu arah.',
      program: 'Pelatihan teknik coaching & mentoring dialogis, praktik penyusunan IDP tim, dan pembiasaan sesi feedback berkala.'
    },
    {
      key: 'change',
      displayName: 'Menerima & Melakukan Perubahan',
      matrixItemName: 'Menerima dan Melakukan Perubahan',
      matchers: ['menerima & melakukan perubahan', 'menerima dan melakukan perubahan', 'perubahan', 'change', 'adaptasi perubahan', 'change leadership', 'inisiatif perubahan', 'inovasi/change'],
      impact: 'Penerapan sistem atau kebijakan baru berpotensi berjalan lambat apabila leader belum aktif menjadi penggerak perubahan.',
      program: 'Lokakarya kepemimpinan perubahan (Change Leadership), strategi komunikasi efektif ke tim, dan evaluasi pasca-implementasi.'
    },
    {
      key: 'delegation',
      displayName: 'Delegasi / Workload Distribution',
      matrixItemName: 'Pendelegasian Tugas',
      matchers: ['pendelegasian tugas', 'delegasi', 'workload distribution', 'delegation', 'pembagian tugas', 'distribusi kerja'],
      impact: 'Leader cenderung mengerjakan sendiri atau membagi tugas berdasarkan kebiasaan, bukan atas dasar kapasitas dan rencana pengembangan anggota tim.',
      program: 'Pemetaan matriks delegasi (RACI), monitoring pembagian beban kerja, dan evaluasi capaian tim mingguan.'
    },
    {
      key: 'strategy',
      displayName: 'Berorientasi Strategi',
      matrixItemName: 'Berorientasi Pada Strategi',
      matchers: ['berorientasi pada strategi', 'berorientasi strategi', 'strategi', 'strategic thinking', 'strategic', 'helicopter view', 'jangka panjang'],
      impact: 'Perhatian leader masih tersita pada rutinitas harian sehingga perencanaan jangka panjang dan antisipasi pasar belum optimal.',
      program: 'Penyelarasan strategi bisnis & penjualan, penguasaan analisis prospek pasar, serta pelatihan perencanaan bisnis komprehensif.'
    },
    {
      key: 'coordination',
      displayName: 'Koordinasi Antar Tim',
      matrixItemName: 'Berkoordinasi Antar Tim',
      matchers: ['berkoordinasi antar tim', 'koordinasi', 'kolaborasi', 'cross-functional', 'lintas divisi', 'lintas fungsi', 'bonding tim', 'interpersonal'],
      impact: 'Kolaborasi lintas divisi dan kedekatan emosional tim belum terjalin secara konsisten.',
      program: 'Pemetaan pemangku kepentingan (stakeholder mapping), proyek lintas divisi, dan forum penyelarasan target rutin.'
    },
    {
      key: 'decision',
      displayName: 'Pengambilan Keputusan',
      matrixItemName: 'Pengambilan Keputusan',
      matchers: ['pengambilan keputusan', 'decision making', 'keputusan', 'ketegasan keputusan', 'decisive leadership', 'decision-making'],
      impact: 'Penyelesaian masalah tim atau penentuan prioritas target berisiko tertunda atau kurang tegas saat menghadapi situasi krusial.',
      program: 'Pelatihan kerangka pengambilan keputusan berbasis risiko, diskusi studi kasus kepemimpinan riil, dan pembekalan manajemen konflik.'
    },
    {
      key: 'learning',
      displayName: 'Kemauan Untuk Belajar',
      matrixItemName: 'Kemauan Untuk Belajar',
      matchers: ['kemauan untuk belajar', 'kemauan belajar', 'learning agility', 'continuous learning', 'self-development', 'proaktif belajar'],
      impact: 'Kemampuan adaptasi terhadap sistem kerja atau wawasan baru melambat bila inisiatif eksplorasi mandiri rendah.',
      program: 'Rencana pembelajaran individu terstruktur, sesi berbagi pengetahuan (knowledge sharing), dan penugasan eksplorasi mandiri.'
    },
    {
      key: 'stress',
      displayName: 'Mampu Mengatasi Tekanan Kerja',
      matrixItemName: 'Mampu Mengatasi Tekanan Kerja',
      matchers: ['mampu mengatasi tekanan kerja', 'mengatasi tekanan', 'resilience', 'tekanan', 'stres', 'stress', 'workload management'],
      impact: 'Stabilitas performa, ketenangan, dan ketelitian rentan menurun saat menghadapi beban kerja puncak atau tenggat waktu ketat.',
      program: 'Lokakarya ketahanan kerja (work resilience), manajemen prioritas beban kerja, dan teknik menjaga fokus dalam situasi krisis.'
    },
    {
      key: 'quality',
      displayName: 'Orientasi Kualitas',
      matrixItemName: 'Orientasi Kualitas',
      matchers: ['orientasi kualitas', 'kualitas', 'quality control', 'detail', 'ketelitian', 'konsistensi kualitas'],
      impact: 'Hasil kerja atau layanan berpotensi tidak konsisten sehingga dapat memicu komplain dari pelanggan atau pemangku kepentingan.',
      program: 'Penyusunan checklist kendali mutu mandiri, penegakan standar operasional prosedur (SOP), dan evaluasi pencegahan kesalahan kerja.'
    },
    {
      key: 'analytical',
      displayName: 'Kemampuan Analisa',
      matrixItemName: 'Kemampuan Analisa',
      matchers: ['kemampuan analisa', 'analisa', 'analytical', 'analisis data', 'analisis mendalam', 'root cause analysis', 'analytical thinking'],
      impact: 'Pemecahan masalah di lapangan berisiko bersifat reaktif dan belum selalu didasarkan pada akar masalah serta data yang akurat.',
      program: 'Pelatihan berpikir analitis dasar, metode penelusuran akar masalah (root cause analysis), dan membaca dashboard kerja.'
    },
    {
      key: 'helicopter_view',
      displayName: 'Helicopter View',
      matrixItemName: 'Helicopter View',
      matchers: ['helicopter view', 'wawasan helikopter', 'gambaran menyeluruh', 'broad perspective'],
      impact: 'Kecenderungan terjebak dalam aspek mikro tanpa melihat gambaran besar dan implikasi jangka panjang.',
      program: 'Pelatihan pemikiran konseptual, simulasi bisnis makro, dan pembekalan strategic alignment.'
    },
    {
      key: 'autonomy',
      displayName: 'Bekerja Mandiri',
      matrixItemName: 'Bekerja Mandiri',
      matchers: ['bekerja mandiri', 'kemandirian eksekusi', 'autonomous execution', 'inisiatif mandiri', 'mandiri'],
      impact: 'Ketergantungan terhadap arahan atasan masih tinggi sehingga memperlambat kecepatan eksekusi tugas di lapangan.',
      program: 'Pemberian ruang wewenang terukur, penetapan milestone mandiri, dan sesi evaluasi mandiri berkala.'
    },
    {
      key: 'problem_solving',
      displayName: 'Penyelesaian Masalah',
      matrixItemName: 'Penyelesaian Masalah',
      matchers: ['penyelesaian masalah', 'problem solving reaktif', 'problem solving aplikatif'],
      impact: 'Solusi yang diambil hanya mengatasi gejala permukaan tanpa menuntaskan akar persoalan yang sebenarnya.',
      program: 'Pelatihan pemecahan masalah terstruktur (metode 5-Whys / Fishbone), klinik studi kasus mingguan, dan evaluasi hasil tindakan.'
    },
    {
      key: 'discipline',
      displayName: 'Disiplin',
      matrixItemName: 'Disiplin',
      matchers: ['disiplin', 'discipline', 'kepatuhan prosedur'],
      impact: 'Kepatuhan terhadap standar prosedur operasional dan ketepatan waktu berisiko menurun.',
      program: 'Penguatan sistem monitoring kepatuhan SOP, review kedisiplinan kerja, dan evaluasi berkala.'
    }
  ], []);

  // Compute Collective Development Priorities (Matching Executive Summary Table 5)
  const collectiveDevelopmentPriorities = useMemo(() => {
    const allMatrixItems = COMPETENCY_SCORE_MATRIX.flatMap(g => g.items);
    const total = activeEmployees.length;

    return CATALOG.map(cat => {
      const matrixItem = allMatrixItems.find(m => m.name.toLowerCase() === cat.matrixItemName.toLowerCase());
      const affectedEmployees: Employee[] = [];

      activeEmployees.forEach(emp => {
        let isNeedDev = false;
        if (matrixItem) {
          const score = resolveEmployeeCompetencyScore(emp, matrixItem);
          if (score <= 2) isNeedDev = true;
        }
        if (!isNeedDev && cat.matchers) {
          const hasInList = emp.competenciesToDevelop && emp.competenciesToDevelop.some(c => cat.matchers.some(m => c.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.toLowerCase())));
          const hasInDev = emp.developmentAreas && cat.matchers.some(m => emp.developmentAreas!.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(emp.developmentAreas!.toLowerCase()));
          const hasInWeak = emp.weaknesses && emp.weaknesses.some(w => cat.matchers.some(m => w.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(w.toLowerCase())));
          const hasLowCustom = emp.customCompetencies && emp.customCompetencies.some(c => c.score < 3.0 && cat.matchers.some(m => c.name.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.name.toLowerCase())));
          if (hasInList || hasInDev || hasInWeak || hasLowCustom) isNeedDev = true;
        }

        if (isNeedDev) {
          affectedEmployees.push(emp);
        }
      });

      const count = affectedEmployees.length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      return {
        ...cat,
        count,
        total,
        percentage,
        frequencyText: `${count} dari ${total} orang (${percentage}%)`,
        affectedEmployees
      };
    }).filter(item => item.count > 0).sort((a, b) => b.count - a.count);
  }, [activeEmployees, CATALOG]);

  // Calculate Competency Gap Rankings for 8-Pillar Radar
  const competencyGapRanking = useMemo(() => {
    const benchmark = 4.0;
    const allMatrixItems = COMPETENCY_SCORE_MATRIX.flatMap(g => g.items);

    return COMPETENCY_DEFINITIONS.map(comp => {
      const needTrainingEmployees: Employee[] = [];
      const scores: number[] = [];

      activeEmployees.forEach(emp => {
        // Resolve mapped score using matrix resolution first
        let resolvedScore = 3.0;
        const matchingMatrix = allMatrixItems.find(m => 
          m.defaultScoreField === comp.key || 
          m.aliasMatchers.some(al => al.toLowerCase().includes(comp.label.toLowerCase()))
        );

        if (matchingMatrix) {
          resolvedScore = resolveEmployeeCompetencyScore(emp, matchingMatrix);
        } else if (emp.competencies && emp.competencies[comp.key]) {
          resolvedScore = emp.competencies[comp.key];
        }

        scores.push(resolvedScore);

        if (resolvedScore < benchmark) {
          needTrainingEmployees.push(emp);
        }
      });

      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const gap = Number((benchmark - avg).toFixed(2));
      const belowBenchmarkCount = needTrainingEmployees.length;
      const pctNeedDevelopment = scores.length > 0 ? Math.round((belowBenchmarkCount / scores.length) * 100) : 0;

      return {
        key: comp.key,
        label: comp.label,
        description: comp.description,
        avgScore: Number(avg.toFixed(2)),
        benchmark,
        gap,
        belowBenchmarkCount,
        pctNeedDevelopment,
        needTrainingEmployees,
        priorityLevel: avg < 3.0 ? 'Tinggi (Kritis)' : avg < 3.8 ? 'Sedang' : 'Rendah (Tercapai)'
      };
    }).sort((a, b) => a.avgScore - b.avgScore); // Lowest score first = highest priority
  }, [activeEmployees]);

  // Aggregate All IDP Goals across the selection
  const aggregatedGoals = useMemo(() => {
    const map: Record<string, { title: string; category: string; employees: { id: string; name: string; position: string; dept: string }[]; count: number }> = {};

    activeEmployees.forEach(emp => {
      emp.idp?.goals?.forEach(g => {
        const key = g.title.trim().toLowerCase();
        if (!map[key]) {
          map[key] = {
            title: g.title,
            category: g.category,
            employees: [],
            count: 0
          };
        }
        map[key].employees.push({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          dept: emp.department
        });
        map[key].count += 1;
      });
    });

    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [activeEmployees]);

  // Total IDP Stats
  const totalIDPGoals = activeEmployees.reduce((acc, e) => acc + (e.idp?.goals?.length || 0), 0);
  const totalActions = activeEmployees.reduce((acc, e) => {
    return acc + (e.idp?.goals?.reduce((sum, g) => sum + g.actionItems.length, 0) || 0);
  }, 0);
  const completedActions = activeEmployees.reduce((acc, e) => {
    return acc + (e.idp?.goals?.reduce((sum, g) => sum + g.actionItems.filter(a => a.completed).length, 0) || 0);
  }, 0);
  const overallExecutionPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strategi Pengembangan SDM Organisasi</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2 mt-1">
            <Target className="w-6 h-6 text-emerald-400" />
            <span>Prioritas Development Kolektif</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Analisis kesenjangan (gap) kompetensi teragregasi untuk menentukan intervensi pelatihan, coaching, serta penugasan strategis bagi seluruh tim dan departemen.
          </p>
        </div>

        {/* Filter Department */}
        <div className="flex items-center space-x-2 bg-slate-800/90 p-2.5 rounded-xl border border-slate-700">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <label className="block text-[10px] font-semibold text-slate-400">Pilih Lingkup Divisi:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Seluruh Organisasi ({employees.length} org)</option>
              {departments.map(dept => (
                <option key={dept} value={dept} className="bg-slate-900 text-white">
                  {dept} ({employees.filter(e => e.department === dept).length} org)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Execution Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Program IDP</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{totalIDPGoals}</span>
              <span className="text-xs text-slate-500">sasaran</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Eksekusi Aksi IDP</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{completedActions}/{totalActions}</span>
              <span className="text-xs text-slate-500">tugas ({overallExecutionPct}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Kompetensi Kritis (Gap)</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-rose-600">
                {competencyGapRanking.filter(c => c.avgScore < 3.7).length}
              </span>
              <span className="text-xs text-slate-500">dari 8 pilar</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Populasi Sasaran</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-slate-900">{activeEmployees.length}</span>
              <span className="text-xs text-slate-500">karyawan</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 0: PRIORITAS INTERVENSI DEVELOPMENT KOLEKTIF (HASIL ASESMEN DOKUMEN PDF) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Award className="w-5 h-5 text-teal-600" />
              <span>Prioritas Intervensi Development Kolektif (Hasil Asesmen Asli PDF)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Diurutkan dari area pengembangan yang paling banyak dibutuhkan oleh populasi karyawan berdasarkan hasil dokumen asesmen. Sesuai dengan Tabel 5 Dokumen Executive Summary.
            </p>
          </div>
          <span className="px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-bold self-start sm:self-auto">
            {collectiveDevelopmentPriorities.length} Area Teridentifikasi
          </span>
        </div>

        {collectiveDevelopmentPriorities.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Seluruh populasi karyawan telah memenuhi standar kompetensi minimal. Tidak ada prioritas intervensi kolektif yang kritis.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {collectiveDevelopmentPriorities.map((item, idx) => (
              <div 
                key={item.key}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 hover:border-teal-400 hover:bg-white hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                  <div className="flex items-start space-x-3">
                    <span className="w-8 h-8 rounded-xl bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span>{item.displayName}</span>
                      </h4>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">
                        Frekuensi Kebutuhan: <span className="font-extrabold">{item.frequencyText}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="w-32 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs font-black text-slate-800 w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>

                {/* Affected Employees list */}
                {item.affectedEmployees.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Karyawan Sasaran:</span>
                    </span>
                    {item.affectedEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => onSelectEmployee(emp)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-xs font-medium text-slate-800 hover:text-teal-700 transition-colors cursor-pointer shadow-2xs"
                        title={`Lihat IDP ${emp.name}`}
                      >
                        <span className="font-bold">{emp.name}</span>
                        <span className="text-[10px] text-slate-400">({emp.position})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Impact and Recommended Program Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Potensi Risiko Operasional / Bisnis</span>
                    </span>
                    <p className="text-slate-700 text-xs leading-relaxed">{item.impact}</p>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Rekomendasi Program Intervensi & Pelatihan</span>
                    </span>
                    <p className="text-slate-800 text-xs font-semibold leading-relaxed">{item.program}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 1: COMPETENCY GAP RANKING & INTERVENTION MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Matriks Pemeringkatan Gap Kompetensi & Prioritas Intervensi</span>
            </h3>
            <p className="text-xs text-slate-500">
              Diurutkan dari kompetensi dengan rata-rata terendah (membutuhkan intervensi prioritas) hingga kompetensi terkuat. Target Benchmark = 4.0.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {competencyGapRanking.map((comp, idx) => {
            const isCritical = comp.avgScore < 3.5;
            const isModerate = comp.avgScore >= 3.5 && comp.avgScore < 3.9;
            const isStrong = comp.avgScore >= 3.9;

            return (
              <div 
                key={comp.key}
                className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition-all hover:border-emerald-400 hover:bg-white hover:shadow-sm space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <span className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                      isCritical ? 'bg-rose-100 text-rose-800' :
                      isModerate ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span>{comp.label}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          isCritical ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          isModerate ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          Prioritas: {comp.priorityLevel}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{comp.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-semibold block">Rata-rata Skor</span>
                      <span className={`text-base font-black ${
                        isCritical ? 'text-rose-600' : isModerate ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {comp.avgScore} <span className="text-xs text-slate-400">/ 5.0</span>
                      </span>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Perlu Pelatihan</span>
                      <span className="text-xs font-extrabold text-slate-800">
                        {comp.belowBenchmarkCount} org ({comp.pctNeedDevelopment}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-600 font-medium">
                    <span>Capaian Terhadap Target Benchmark (4.0)</span>
                    <span>Gap: {comp.gap > 0 ? `-${comp.gap} poin` : `+${Math.abs(comp.gap)} poin (Target Terpenuhi)`}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                    {/* Benchmark mark line at 80% (4.0 / 5.0) */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10" 
                      style={{ left: '80%' }} 
                      title="Benchmark 4.0"
                    />
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCritical ? 'bg-rose-500' : isModerate ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(comp.avgScore / 5.0) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Target Employees to develop for this competency */}
                {comp.needTrainingEmployees.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Karyawan Sasaran Program:</span>
                    </span>
                    {comp.needTrainingEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => onSelectEmployee(emp)}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-[11px] font-medium text-slate-800 hover:text-teal-700 transition-colors cursor-pointer"
                        title={`Buka IDP ${emp.name}`}
                      >
                        <span>{emp.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({emp.competencies ? emp.competencies[comp.key] : 0})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: AGGREGATED IDP TRAINING PROGRAMS & ACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>Katalog Program Pembelajaran & Pelatihan Kolektif Terpadu</span>
            </h3>
            <p className="text-xs text-slate-500">
              Daftar inisiatif IDP yang dapat dijalankan secara batch/kolektif untuk efisiensi budget dan akselerasi pengembangan kompetensi.
            </p>
          </div>

          <button
            onClick={() => onGoToTab('idp')}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <Target className="w-4 h-4" />
            <span>Buka Dashboard IDP Manager ➔</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregatedGoals.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-500">
              Belum ada program IDP yang terdaftar.
            </div>
          ) : (
            aggregatedGoals.map((program, pIdx) => (
              <div 
                key={pIdx}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-teal-400 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                      {program.category || 'Pelatihan / Kursus'}
                    </span>
                    <span className="text-[10px] font-extrabold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
                      {program.count} Peserta
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {program.title}
                  </h4>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Metode: 70:20:10 Terpadu</span>
                    <span>Status: Aktif</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {program.employees.slice(0, 3).map((emp, eIdx) => (
                      <span key={eIdx} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {emp.name.split(' ')[0]}
                      </span>
                    ))}
                    {program.employees.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-semibold self-center">
                        +{program.employees.length - 3} lagi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
