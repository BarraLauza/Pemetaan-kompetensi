import React, { useState, useMemo } from 'react';
import { Employee, COMPETENCY_DEFINITIONS } from '../types';
import { 
  Search, 
  ListOrdered, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Building2, 
  Target, 
  FileDown, 
  Eye, 
  Sparkles,
  Users,
  Brain,
  ShieldAlert
} from 'lucide-react';
import { exportEmployeeAssessmentPdf, formatIqScoreDisplay } from '../utils/pdfExport';

interface StrengthsWeaknessesTableProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onGoToIndividualView: (empId: string) => void;
}

export const StrengthsWeaknessesTable: React.FC<StrengthsWeaknessesTableProps> = ({
  employees,
  onSelectEmployee,
  onGoToIndividualView
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        emp.name.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        (emp.strengths && emp.strengths.some(s => s.toLowerCase().includes(q))) ||
        (emp.weaknesses && emp.weaknesses.some(w => w.toLowerCase().includes(q))) ||
        (emp.summary && emp.summary.toLowerCase().includes(q));

      const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;

      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, selectedDept]);

  // Extract top collective strengths & weaknesses across the organization
  const { topStrengthsList, topWeaknessesList } = useMemo(() => {
    const sMap: Record<string, number> = {};
    const wMap: Record<string, number> = {};

    employees.forEach(e => {
      e.strengths?.forEach(s => {
        sMap[s] = (sMap[s] || 0) + 1;
      });
      e.weaknesses?.forEach(w => {
        wMap[w] = (wMap[w] || 0) + 1;
      });
    });

    const sortedS = Object.entries(sMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const sortedW = Object.entries(wMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { topStrengthsList: sortedS, topWeaknessesList: sortedW };
  }, [employees]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
              <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
              <span>Analisis Kualitatif & Profil Perilaku</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2 mt-1">
            <ListOrdered className="w-6 h-6 text-amber-400" />
            <span>Tabel Kekuatan, Area Pengembangan, dan Keterangan Lain</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Tabel pemetaan detail faktor keunggulan individu (Strengths), area yang membutuhkan intervensi (Areas for Improvement), dan catatan evaluasi psikometri komprehensif.
          </p>
        </div>

        {/* Top Summary Chips */}
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5 min-w-[240px]">
          <div className="text-[11px] text-amber-300 font-bold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kekuatan Paling Menonjol:</span>
          </div>
          <p className="text-xs text-slate-200 truncate font-medium">
            {topStrengthsList[0] ? `✔ ${topStrengthsList[0][0]} (${topStrengthsList[0][1]} org)` : '-'}
          </p>
          <div className="text-[11px] text-rose-300 font-bold flex items-center space-x-1.5 pt-1 border-t border-slate-700/80">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Fokus Perbaikan Utama:</span>
          </div>
          <p className="text-xs text-slate-200 truncate font-medium">
            {topWeaknessesList[0] ? `⚠ ${topWeaknessesList[0][0]} (${topWeaknessesList[0][1]} org)` : '-'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, kata kunci kekuatan, kelemahan, atau catatan..."
            className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <label className="text-xs font-semibold text-slate-600">Divisi:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Departemen ({employees.length})</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept} ({employees.filter(e => e.department === dept).length})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4 w-60">Karyawan & Posisi</th>
                <th className="py-3.5 px-4 w-72">
                  <div className="flex items-center space-x-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Kekuatan Utama (Strengths)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 w-72">
                  <div className="flex items-center space-x-1 text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Area Pengembangan (Weaknesses)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center space-x-1 text-cyan-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Catatan Asesor & Keterangan Lain</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 bg-slate-50">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold">Tidak ada data karyawan yang sesuai dengan kata kunci pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50/90 transition-colors group align-top">
                    {/* No */}
                    <td className="py-4 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Employee info */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                              {emp.name}
                            </p>
                          </div>
                        </div>
                        <p className="text-slate-700 font-medium text-[11px]">{emp.position}</p>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {emp.department}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {formatIqScoreDisplay(emp, { prefix: true })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Strengths */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        {emp.strengths && emp.strengths.length > 0 ? (
                          emp.strengths.map((s, sIdx) => (
                            <div 
                              key={sIdx}
                              className="flex items-start space-x-1.5 bg-emerald-50/80 text-emerald-900 border border-emerald-200/80 p-2 rounded-lg text-[11px] font-medium"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{s}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Belum ada catatan kekuatan</span>
                        )}
                      </div>
                    </td>

                    {/* Weaknesses / Areas for Development */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        {emp.weaknesses && emp.weaknesses.length > 0 ? (
                          emp.weaknesses.map((w, wIdx) => (
                            <div 
                              key={wIdx}
                              className="flex items-start space-x-1.5 bg-amber-50/80 text-amber-900 border border-amber-200/80 p-2 rounded-lg text-[11px] font-medium"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{w}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Belum ada catatan perbaikan</span>
                        )}
                      </div>
                    </td>

                    {/* Evaluator Notes & Summary */}
                    <td className="py-4 px-4">
                      <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {emp.summary || 'Karyawan menunjukkan kapabilitas operasional yang stabil dengan potensi pengembangan manajerial dan analitikal.'}
                        </p>
                        
                        {/* Psychological details */}
                        {emp.psychologicalProfile && (
                          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-400 font-semibold block">Gaya Kerja:</span>
                              <span className="font-semibold text-slate-800">{emp.psychologicalProfile.workStyle || 'Sistematis & Terstruktur'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block">Tipe Kepemimpinan:</span>
                              <span className="font-semibold text-slate-800">{emp.psychologicalProfile.leadershipStyle || 'Kolaboratif & Partisipatif'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col space-y-1.5 items-center">
                        <button
                          onClick={() => onGoToIndividualView(emp.id)}
                          className="w-full px-2 py-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          title="Lihat Detail Profil & Radar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profil</span>
                        </button>
                        <button
                          onClick={() => onSelectEmployee(emp)}
                          className="w-full px-2 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          title="Buka IDP"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>IDP</span>
                        </button>
                        <button
                          onClick={() => exportEmployeeAssessmentPdf(emp)}
                          className="w-full px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          title="Unduh PDF Resmi"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan <strong>{filteredEmployees.length}</strong> catatan kualitatif profil kompetensi karyawan</span>
        </div>
      </div>
    </div>
  );
};
