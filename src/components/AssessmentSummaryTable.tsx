import React, { useState, useMemo } from 'react';
import { Employee, COMPETENCY_DEFINITIONS } from '../types';
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Eye, 
  Target, 
  FileDown, 
  Edit3, 
  Check, 
  TrendingUp, 
  Brain, 
  Users, 
  ArrowUpDown, 
  Building2,
  Sparkles,
  Award,
  FileText
} from 'lucide-react';
import { exportEmployeeAssessmentPdf, formatThinkingCapacity, formatIqScoreDisplay } from '../utils/pdfExport';

interface AssessmentSummaryTableProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onGoToIndividualView: (empId: string) => void;
  onUpdateEmployee?: (emp: Employee) => void;
}

export const AssessmentSummaryTable: React.FC<AssessmentSummaryTableProps> = ({
  employees,
  onSelectEmployee,
  onGoToIndividualView,
  onUpdateEmployee
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedTalentBox, setSelectedTalentBox] = useState('ALL');
  const [sortBy, setSortBy] = useState<'overallScore' | 'iqScore' | 'performance' | 'potential' | 'name'>('overallScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Inline IQ Editing
  const [editingIqEmpId, setEditingIqEmpId] = useState<string | null>(null);
  const [tempIqValue, setTempIqValue] = useState<number>(115);

  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  const talentBoxes = useMemo(() => {
    const set = new Set(employees.map(e => e.talentBox).filter(Boolean));
    return Array.from(set);
  }, [employees]);

  // Filtering and Sorting
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
      const matchesTalentBox = selectedTalentBox === 'ALL' || emp.talentBox === selectedTalentBox;

      return matchesSearch && matchesDept && matchesTalentBox;
    }).sort((a, b) => {
      let valA: any = a[sortBy] ?? 0;
      let valB: any = b[sortBy] ?? 0;

      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [employees, searchQuery, selectedDept, selectedTalentBox, sortBy, sortOrder]);

  const handleSort = (field: 'overallScore' | 'iqScore' | 'performance' | 'potential' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleSaveIq = (emp: Employee) => {
    if (onUpdateEmployee && tempIqValue >= 50 && tempIqValue <= 170) {
      onUpdateEmployee({ 
        ...emp, 
        iqScore: tempIqValue,
        thinkingCapacity: formatThinkingCapacity({ iqScore: tempIqValue })
      });
    }
    setEditingIqEmpId(null);
  };

  const getIqCategory = (empOrIq?: Employee | number) => {
    if (!empOrIq) return { label: 'Standar', color: 'bg-slate-100 text-slate-700' };
    if (typeof empOrIq === 'object') {
      const rawCap = empOrIq.thinkingCapacity || '';
      if (/<80|< 80/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore < 80)) {
        return { label: 'Di Bawah Rata-rata (<80)', color: 'bg-rose-100 text-rose-800' };
      }
      if (/>130|> 130/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore >= 130)) {
        return { label: 'Very Superior (>130)', color: 'bg-indigo-100 text-indigo-800' };
      }
      const iq = empOrIq.iqScore;
      if (!iq) return { label: 'Average', color: 'bg-slate-100 text-slate-700' };
      if (iq >= 130) return { label: 'Very Superior', color: 'bg-indigo-100 text-indigo-800' };
      if (iq >= 120) return { label: 'Superior', color: 'bg-blue-100 text-blue-800' };
      if (iq >= 110) return { label: 'High Average', color: 'bg-teal-100 text-teal-800' };
      if (iq >= 90) return { label: 'Average', color: 'bg-slate-100 text-slate-700' };
      if (iq < 80) return { label: 'Di Bawah Rata-rata (<80)', color: 'bg-rose-100 text-rose-800' };
      return { label: 'Low Average', color: 'bg-amber-100 text-amber-800' };
    }

    const iq = empOrIq;
    if (iq >= 130) return { label: 'Very Superior', color: 'bg-indigo-100 text-indigo-800' };
    if (iq >= 120) return { label: 'Superior', color: 'bg-blue-100 text-blue-800' };
    if (iq >= 110) return { label: 'High Average', color: 'bg-teal-100 text-teal-800' };
    if (iq >= 90) return { label: 'Average', color: 'bg-slate-100 text-slate-700' };
    if (iq < 80) return { label: 'Di Bawah Rata-rata (<80)', color: 'bg-rose-100 text-rose-800' };
    return { label: 'Low Average', color: 'bg-amber-100 text-amber-800' };
  };

  const getTalentBoxBadge = (box: string) => {
    if (box.includes('Bintang') || box.includes('Star')) {
      return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    }
    if (box.includes('Potensial') || box.includes('Kinerja Tinggi')) {
      return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
    }
    if (box.includes('Kunci') || box.includes('Utama')) {
      return 'bg-teal-100 text-teal-900 border-teal-300';
    }
    if (box.includes('Perhatian')) {
      return 'bg-rose-100 text-rose-900 border-rose-300';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  // Stats calculation
  const totalCount = filteredEmployees.length;
  const avgScore = totalCount > 0 
    ? (filteredEmployees.reduce((acc, e) => acc + e.overallScore, 0) / totalCount).toFixed(1)
    : '0';
  const avgIq = totalCount > 0
    ? Math.round(filteredEmployees.reduce((acc, e) => acc + (e.iqScore ?? 115), 0) / totalCount)
    : 115;
  const starCount = filteredEmployees.filter(e => e.talentBox.includes('Bintang')).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rekapitulasi Asesmen Karyawan</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2 mt-1">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            <span>Tabel Ringkasan Hasil Assessment</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Matriks komparatif lengkap skor asesmen psikometri, estimasi IQ, penilaian kinerja, potensi 9-box, serta status rekomendasi per individu.
          </p>
        </div>

        {/* Quick KPI Counters */}
        <div className="flex items-center space-x-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
          <div className="text-center px-3 border-r border-slate-700">
            <span className="text-[10px] text-slate-400 font-semibold block">Total Talent</span>
            <span className="text-base font-extrabold text-white">{totalCount} org</span>
          </div>
          <div className="text-center px-3 border-r border-slate-700">
            <span className="text-[10px] text-cyan-400 font-semibold block">Rata-rata Skor</span>
            <span className="text-base font-extrabold text-cyan-300">{avgScore} / 100</span>
          </div>
          <div className="text-center px-3">
            <span className="text-[10px] text-indigo-400 font-semibold block">Rata-rata IQ</span>
            <span className="text-base font-extrabold text-indigo-300">{avgIq}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama, NIP, jabatan, atau divisi..."
              className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
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

            {/* 9-Box Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <label className="text-xs font-semibold text-slate-600">9-Box:</label>
              <select
                value={selectedTalentBox}
                onChange={(e) => setSelectedTalentBox(e.target.value)}
                className="text-xs bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Kategori 9-Box</option>
                {talentBoxes.map(box => (
                  <option key={box} value={box}>{box}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Karyawan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Jabatan & Departemen</th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => handleSort('iqScore')}
                >
                  <div className="flex items-center space-x-1">
                    <Brain className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Nilai IQ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => handleSort('overallScore')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Skor Asesmen</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-800 transition-colors text-center"
                  onClick={() => handleSort('performance')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Kinerja</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  className="py-3.5 px-3 cursor-pointer hover:bg-slate-800 transition-colors text-center"
                  onClick={() => handleSort('potential')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Potensi</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Matriks 9-Box</th>
                <th className="py-3.5 px-4">Status Rekomendasi</th>
                <th className="py-3.5 px-4 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 bg-slate-50">
                    <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold">Tidak ada data karyawan yang cocok dengan kriteria pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const iqInfo = getIqCategory(emp);
                  const iqDisplay = formatIqScoreDisplay(emp);
                  return (
                    <tr 
                      key={emp.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Number */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                              {emp.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Position & Dept */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800">{emp.position}</p>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded border border-teal-200">
                          {emp.department}
                        </span>
                      </td>

                      {/* IQ Score & Edit */}
                      <td className="py-3.5 px-4">
                        {editingIqEmpId === emp.id ? (
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min={70}
                              max={160}
                              value={tempIqValue}
                              onChange={(e) => setTempIqValue(Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 text-xs font-bold border border-indigo-500 rounded bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveIq(emp)}
                              className="p-1 text-white bg-indigo-600 rounded hover:bg-indigo-500"
                              title="Simpan"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-indigo-950 text-sm">
                              {iqDisplay}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${iqInfo.color}`}>
                              {iqInfo.label}
                            </span>
                            <button
                              onClick={() => {
                                setEditingIqEmpId(emp.id);
                                setTempIqValue(emp.iqScore || 115);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-0.5 transition-opacity cursor-pointer"
                              title="Edit Skor IQ"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Overall Assessment Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-sm w-8">
                            {emp.overallScore}
                          </span>
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                emp.overallScore >= 85 ? 'bg-emerald-500' :
                                emp.overallScore >= 75 ? 'bg-teal-500' :
                                emp.overallScore >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(emp.overallScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                          {(emp.performanceScore ?? emp.performance ?? 3).toFixed(1)} / 5
                        </span>
                      </td>

                      {/* Potential */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                          {(emp.potentialScore ?? emp.potential ?? 3).toFixed(1)} / 5
                        </span>
                      </td>

                      {/* 9-Box Placement */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] border ${getTalentBoxBadge(emp.talentBox)}`}>
                          {emp.talentBox}
                        </span>
                      </td>

                      {/* Recommendation Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.talentBox.includes('Bintang') || emp.talentBox.includes('Potensial') 
                            ? 'bg-emerald-100 text-emerald-800' :
                          emp.talentBox.includes('Kinerja') || emp.talentBox.includes('Kunci')
                            ? 'bg-teal-100 text-teal-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.talentBox.includes('Bintang') ? '🚀 Siap Promosi Cepat' :
                           emp.talentBox.includes('Potensial') ? '📈 Fast-Track Leadership' :
                           emp.talentBox.includes('Kinerja') ? '⭐ Expert / Specialization' :
                           emp.talentBox.includes('Kunci') ? '🛡️ Retensi & Pengayaan' :
                           '🎯 Peningkatan Kompetensi'}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onGoToIndividualView(emp.id)}
                            className="p-1.5 text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                            title="Lihat Detail Profil & Radar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectEmployee(emp)}
                            className="p-1.5 text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                            title="Buka Dashboard IDP"
                          >
                            <Target className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportEmployeeAssessmentPdf(emp)}
                            className="p-1.5 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                            title="Unduh Laporan PDF Asesmen Resmi"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>Menampilkan <strong>{filteredEmployees.length}</strong> dari total <strong>{employees.length}</strong> data asesmen karyawan</span>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-medium text-slate-600">Format data sesuai standar Human Capital Assessment & 9-Box Matrix</span>
          </div>
        </div>
      </div>
    </div>
  );
};
