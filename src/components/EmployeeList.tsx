import React, { useState } from 'react';
import { Employee, COMPETENCY_DEFINITIONS } from '../types';
import { 
  Search, 
  Sliders, 
  UserCheck, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Mail, 
  Calendar, 
  Target, 
  Trash2, 
  Edit3,
  X,
  Plus,
  FileDown,
  FileText,
  BarChart3,
  Eye,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { exportEmployeeAssessmentPdf, formatIqScoreDisplay } from '../utils/pdfExport';

interface EmployeeListProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onGoToVisualization?: (emp: Employee) => void;
  onDeleteEmployee: (empId: string) => void;
  onOpenAddModal?: () => void;
  onGoToIDP: (emp: Employee) => void;
  onDeleteAll?: () => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  onSelectEmployee,
  onGoToVisualization,
  onDeleteEmployee,
  onGoToIDP,
  onDeleteAll
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('SEMUA');
  const [selectedTalentBox, setSelectedTalentBox] = useState<string>('SEMUA');
  const [activeDetailEmp, setActiveDetailEmp] = useState<Employee | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);

  const departments = ['SEMUA', ...Array.from(new Set(employees.map(e => e.department)))];
  const talentBoxes = ['SEMUA', ...Array.from(new Set(employees.map(e => e.talentBox)))];

  const isFilterActive = searchQuery.trim() !== '' || selectedDept !== 'SEMUA' || selectedTalentBox !== 'SEMUA';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('SEMUA');
    setSelectedTalentBox('SEMUA');
  };

  // Filter logic
  const filtered = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'SEMUA' || emp.department === selectedDept;
    const matchesBox = selectedTalentBox === 'SEMUA' || emp.talentBox === selectedTalentBox;

    return matchesSearch && matchesDept && matchesBox;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIP, jabatan..."
            className="w-full text-xs pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Reset Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex items-center space-x-1 text-xs text-slate-600">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Divisi:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1 text-xs text-slate-600">
            <span>Matriks:</span>
            <select
              value={selectedTalentBox}
              onChange={(e) => setSelectedTalentBox(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              {talentBoxes.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Delete All Button */}
          {onDeleteAll && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              disabled={employees.length === 0}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 shadow-2xs ${
                employees.length > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title="Hapus semua data karyawan yang ada"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete All</span>
            </button>
          )}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
            <UserCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Tidak ada karyawan yang sesuai filter.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedDept('SEMUA'); setSelectedTalentBox('SEMUA'); }}
              className="text-xs text-teal-600 hover:underline font-semibold"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          filtered.map(emp => (
            <div
              key={emp.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-teal-400 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">
                        {emp.name}
                      </h3>
                      <p className="text-xs text-slate-500">{emp.position}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                      {emp.overallScore} / 100
                    </span>
                    {emp.iqScore ? (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {formatIqScoreDisplay(emp, { prefix: true })}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Sub info */}
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Asal: {emp.department}</span>
                    <span>NIP: {emp.nip}</span>
                  </div>
                  {emp.targetDepartment && (
                    <div className="flex items-center space-x-1 text-teal-800 bg-teal-50/80 px-2 py-0.5 rounded border border-teal-200/80 text-[10px] font-semibold">
                      <span>🎯 Target Mapping:</span>
                      <strong className="text-teal-900">{emp.targetDepartment}</strong>
                    </div>
                  )}
                </div>

                {/* Talent Box Badge */}
                <div className="mt-2">
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {emp.talentBox}
                  </span>
                </div>

                {/* Strengths / Weaknesses preview */}
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-emerald-700 text-[11px] font-medium truncate flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="truncate"><strong>Kekuatan:</strong> {emp.strengths[0]}</span>
                  </p>
                  <p className="text-amber-800 text-[11px] font-medium truncate flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="truncate"><strong>Kelemahan:</strong> {emp.weaknesses[0]}</span>
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectEmployee(emp)}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 transition-colors flex items-center space-x-1.5"
                  title="Buka Visualisasi Kompetensi Karyawan & Departemen"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Visualisasi Kompetensi ➔</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveDetailEmp(emp)}
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Analisis Ringkas"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => exportEmployeeAssessmentPdf(emp)}
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                    title="Download PDF Hasil Analisa"
                  >
                    <FileDown className="w-4 h-4 text-teal-600" />
                  </button>

                  <button
                    onClick={() => onGoToIDP(emp)}
                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Buka IDP Karyawan"
                  >
                    <Target className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteEmployee(emp.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Karyawan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Deep-Dive Employee Detail Modal */}
      {activeDetailEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white text-xl font-bold flex items-center justify-center">
                  {activeDetailEmp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeDetailEmp.name}</h2>
                  <p className="text-xs text-slate-500">{activeDetailEmp.position} • {activeDetailEmp.department}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      NIP: {activeDetailEmp.nip}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      {activeDetailEmp.talentBox}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveDetailEmp(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Score Badge Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Nilai Akhir Hasil Asesmen Psikometri AI</p>
                <p className="text-2xl font-extrabold text-teal-400">{activeDetailEmp.overallScore} / 100</p>
                <p className="text-[11px] text-slate-300">
                  {activeDetailEmp.iqScore ? `Nilai IQ: ${activeDetailEmp.iqScore} • ` : ''}Skor Kinerja: {activeDetailEmp.performanceScore} • Skor Potensi: {activeDetailEmp.potentialScore}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const emp = activeDetailEmp;
                    setActiveDetailEmp(null);
                    onSelectEmployee(emp);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Buka Visualisasi Kompetensi & Departemen"
                >
                  <BarChart3 className="w-4 h-4 text-slate-950" />
                  <span>Visualisasi Kompetensi</span>
                </button>
                <button
                  onClick={() => exportEmployeeAssessmentPdf(activeDetailEmp)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Download Dokumen PDF Laporan Hasil Analisa Asesmen"
                >
                  <FileDown className="w-4 h-4 text-teal-400" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    const emp = activeDetailEmp;
                    setActiveDetailEmp(null);
                    onGoToIDP(emp);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Target className="w-4 h-4 text-teal-400" />
                  <span>Buka IDP</span>
                </button>
                <button
                  onClick={() => {
                    const empId = activeDetailEmp.id;
                    setActiveDetailEmp(null);
                    onDeleteEmployee(empId);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors flex items-center space-x-1.5 cursor-pointer"
                  title="Hapus Karyawan"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>

            {/* Strengths & Weaknesses Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Strengths */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Analisis Mendalam Kekuatan Utama</span>
                </h3>
                <ul className="space-y-2">
                  {activeDetailEmp.strengths.map((s, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Analisis Mendalam Kelemahan & Area Pengembangan</span>
                </h3>
                <ul className="space-y-2">
                  {activeDetailEmp.weaknesses.map((w, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Key AI Insights */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Rangkuman Naratif & Rekomendasi Kepemimpinan AI</span>
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeDetailEmp.keyInsights}
              </p>
            </div>

            {/* Competency Scores List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between">
                <span>
                  {activeDetailEmp.customCompetencies && activeDetailEmp.customCompetencies.length > 0
                    ? `Rincian ${activeDetailEmp.customCompetencies.length} Skor Kompetensi Spesifik (Hasil PDF Asesmen)`
                    : 'Rincian Skor 8 Dimensi Kompetensi'}
                </span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeDetailEmp.customCompetencies && activeDetailEmp.customCompetencies.length > 0 ? (
                  activeDetailEmp.customCompetencies.map((comp, idx) => {
                    const score = comp.score || 0;
                    const pct = Math.round((score / 5) * 100);

                    return (
                      <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-800">
                          <span className="truncate pr-2" title={comp.name}>{comp.name}</span>
                          <span className="text-teal-700 font-bold shrink-0">{score.toFixed(1)} / 5.0</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${score >= 4.5 ? 'bg-teal-500' : score >= 3.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        {comp.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1">{comp.description}</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  COMPETENCY_DEFINITIONS.map(comp => {
                    const score = activeDetailEmp.competencies[comp.key] || 0;
                    const pct = (score / 5) * 100;

                    return (
                      <div key={comp.key} className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-800">
                          <span>{comp.label.split(' (')[0]}</span>
                          <span className="text-teal-700 font-bold">{score} / 5.0</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${score >= 4.5 ? 'bg-teal-500' : score >= 3.8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recommended Future Roles */}
            {activeDetailEmp.recommendedRoles && activeDetailEmp.recommendedRoles.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700">Rekomendasi Suksesi / Jabatan Karir Mendorong:</h4>
                <div className="flex flex-wrap gap-2">
                  {activeDetailEmp.recommendedRoles.map((role, idx) => (
                    <span key={idx} className="text-xs px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 font-medium rounded-full">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete All Employees */}
      {showDeleteAllModal && onDeleteAll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Semua Data Karyawan?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengosongkan seluruh daftar ({employees.length} orang)</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus seluruh data karyawan? Semua profil, skor kompetensi, dan rencana IDP akan dihapus. Anda dapat mengunggah berkas PDF asesmen baru kapan saja.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAll();
                  handleResetFilters();
                  setShowDeleteAllModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
