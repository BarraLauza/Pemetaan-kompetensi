import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types';
import { formatIqScoreDisplay } from '../utils/pdfExport';
import { 
  Award, 
  Sliders, 
  Users, 
  Grid,
  ChevronDown,
  Check,
  Search,
  X,
  Filter,
  UserCheck,
  Building2
} from 'lucide-react';

interface NineBoxMappingProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
  onGoToTab: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees') => void;
  onDeleteEmployee?: (empId: string) => void;
}

interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  title: string;
  icon: React.ReactNode;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectProps> = ({
  title,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder = 'Cari...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map(o => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // Button Label Text
  let buttonLabel = `Semua ${title}`;
  if (selectedValues.length === 1) {
    const match = options.find(o => o.value === selectedValues[0]);
    buttonLabel = match ? match.label : selectedValues[0];
  } else if (selectedValues.length > 1 && selectedValues.length < options.length) {
    buttonLabel = `${selectedValues.length} ${title} Dipilih`;
  } else if (selectedValues.length === options.length && options.length > 0) {
    buttonLabel = `Semua ${title}`;
  }

  const isFiltered = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 text-xs border rounded-xl px-3 py-2 transition-all font-semibold ${
          isFiltered
            ? 'bg-teal-50 border-teal-400 text-teal-900 shadow-xs ring-2 ring-teal-500/20'
            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="text-teal-600">{icon}</span>
        <span className="truncate max-w-[150px]">{buttonLabel}</span>
        {isFiltered && (
          <span className="bg-teal-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-3 space-y-2.5 animate-in fade-in duration-150">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action Buttons: Select All / Reset */}
          <div className="flex items-center justify-between text-[11px] pt-1 pb-1 border-b border-slate-100">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-teal-700 hover:text-teal-800 font-bold hover:underline"
            >
              Pilih Semua ({options.length})
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-600 font-semibold"
            >
              Hapus Filter
            </button>
          </div>

          {/* Options Checklist */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-3 text-center">Tidak ada data ditemukan</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-teal-50 text-teal-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="text-[10px] text-slate-400 font-normal truncate">{opt.sublabel}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Done Button */}
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg w-full"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const NineBoxMapping: React.FC<NineBoxMappingProps> = ({
  employees,
  onSelectEmployee,
  onGoToTab
}) => {
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [activeEmpCardId, setActiveEmpCardId] = useState<string>('');

  // Extract all unique departments
  const allDepartments: string[] = Array.from(
    new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d)))
  );

  const deptOptions: MultiSelectOption[] = allDepartments.map(d => ({
    value: d,
    label: d
  }));

  // Employee options filtered by selected departments if any
  const availableEmployeesForDropdown = selectedDepts.length > 0
    ? employees.filter(e => selectedDepts.includes(e.department))
    : employees;

  const employeeOptions: MultiSelectOption[] = availableEmployeesForDropdown.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: `${e.position} (${e.department})`
  }));

  // Main filter function
  const filteredEmployees = employees.filter(e => {
    const matchesDept = selectedDepts.length === 0 || selectedDepts.includes(e.department);
    const matchesEmp = selectedEmpIds.length === 0 || selectedEmpIds.includes(e.id);
    return matchesDept && matchesEmp;
  });

  // 9-Box Matrix Grid Titles & Badges
  const nineBoxGrid = [
    [
      { title: 'Potensial Tinggi', badge: 'High Pot / Mid Perf', color: 'bg-emerald-50/70 border-emerald-200 text-emerald-900' },
      { title: 'Kinerja Tinggi', badge: 'High Perf / Mid Pot', color: 'bg-teal-50/70 border-teal-200 text-teal-900' },
      { title: 'Bintang (Star Player)', badge: 'High Perf / High Pot ⭐', color: 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold ring-1 ring-indigo-200' },
    ],
    [
      { title: 'Pengembang Diri (Dilemma)', badge: 'Mid Pot / Low Perf', color: 'bg-amber-50/70 border-amber-200 text-amber-900' },
      { title: 'Pemain Utama (Core Player)', badge: 'Mid Perf / Mid Pot', color: 'bg-slate-50 border-slate-200 text-slate-800' },
      { title: 'Kontributor Kunci', badge: 'High Perf / Low Pot', color: 'bg-sky-50/70 border-sky-200 text-sky-900' },
    ],
    [
      { title: 'Perlu Perhatian (Under Performer)', badge: 'Low Perf / Low Pot', color: 'bg-rose-50/70 border-rose-200 text-rose-900' },
      { title: 'Efektif (Effective)', badge: 'Mid Perf / Low Pot', color: 'bg-orange-50/70 border-orange-200 text-orange-900' },
      { title: 'Potensi Profesional', badge: 'Low Perf / High Pot', color: 'bg-purple-50/70 border-purple-200 text-purple-900' },
    ]
  ];

  // Helper mapping 9-box cell coordinates
  const getBoxPosition = (perf: number, pot: number) => {
    const row = perf >= 4.2 ? 0 : perf >= 3.5 ? 1 : 2; // 0: High, 1: Medium, 2: Low
    const col = pot >= 4.2 ? 2 : pot >= 3.5 ? 1 : 0; // 0: Low, 1: Medium, 2: High
    return { row, col };
  };

  const matrixCells: Employee[][][] = [
    [[], [], []],
    [[], [], []],
    [[], [], []]
  ];

  filteredEmployees.forEach(emp => {
    const { row, col } = getBoxPosition(emp.performanceScore, emp.potentialScore);
    matrixCells[row][col].push(emp);
  });

  const starPlayersCount = employees.filter(e => e.talentBox.includes('Bintang')).length;
  const highPotentialsCount = employees.filter(e => e.talentBox.includes('Potensial') || e.talentBox.includes('Tinggi')).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & KPI Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1">
              <Grid className="w-3 h-3 text-teal-400" />
              <span>Standar Talent Management 9-Box</span>
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Award className="w-6 h-6 text-teal-400" />
            <span>Matriks Pemetaan Talent 9-Box Organisasi</span>
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sistem analisis matriks 9-Box memetakan kombinasi <strong>Kinerja (Performance)</strong> vs <strong>Potensi (Potential)</strong> seluruh SDM untuk mengidentifikasi talenta terbaik dan arah pengembangan karir.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total SDM</span>
            <span className="text-xl font-extrabold text-white">{employees.length}</span>
            <span className="text-[10px] text-slate-400 block">Orang</span>
          </div>
          <div className="bg-indigo-950/60 border border-indigo-500/40 p-3 rounded-xl text-center">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase block">Star Players</span>
            <span className="text-xl font-extrabold text-indigo-300">{starPlayersCount}</span>
            <span className="text-[10px] text-indigo-400 block">Top Talent</span>
          </div>
          <div className="bg-teal-950/60 border border-teal-500/40 p-3 rounded-xl text-center">
            <span className="text-[10px] text-teal-300 font-semibold uppercase block">High Potential</span>
            <span className="text-xl font-extrabold text-teal-300">{highPotentialsCount}</span>
            <span className="text-[10px] text-teal-400 block">Kandidat</span>
          </div>
        </div>
      </div>

      {/* 9-BOX MATRIX CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Controls & Multi-Select Filter Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Grid className="w-5 h-5 text-teal-600" />
              <span>Matriks Distribusi Talenta (3x3 Grid)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Gunakan filter multi-select Divisi dan Nama Karyawan untuk memfilter peta talenta secara spesifik.
            </p>
          </div>

          {/* Multi-Select Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Multi-Select Divisi Filter */}
            <div className="flex items-center space-x-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Divisi:</span>
              </label>
              <MultiSelectDropdown
                title="Divisi"
                icon={<Building2 className="w-3.5 h-3.5" />}
                options={deptOptions}
                selectedValues={selectedDepts}
                onChange={setSelectedDepts}
                placeholder="Cari Divisi..."
              />
            </div>

            {/* Multi-Select Nama Karyawan Filter */}
            <div className="flex items-center space-x-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Nama Karyawan:</span>
              </label>
              <MultiSelectDropdown
                title="Karyawan"
                icon={<UserCheck className="w-3.5 h-3.5" />}
                options={employeeOptions}
                selectedValues={selectedEmpIds}
                onChange={setSelectedEmpIds}
                placeholder="Cari Karyawan..."
              />
            </div>

            {/* Reset Filter Button */}
            {(selectedDepts.length > 0 || selectedEmpIds.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDepts([]);
                  setSelectedEmpIds([]);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-2 rounded-xl flex items-center space-x-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Banner for Active Mapping View */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/70 p-3 rounded-xl flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            <span>
              Menampilkan <strong>{filteredEmployees.length}</strong> dari <strong>{employees.length}</strong> karyawan
              {selectedDepts.length > 0 && <span> — Divisi: <strong>{selectedDepts.join(', ')}</strong></span>}
              {selectedEmpIds.length > 0 && <span> — Karyawan Terpilih: <strong>{selectedEmpIds.length} orang</strong></span>}
            </span>
          </div>
          <span className="font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded border border-teal-200">
            {filteredEmployees.length} Karyawan Terpetakan
          </span>
        </div>

        {/* 9-Box Grid Layout */}
        <div className="flex gap-3 items-stretch pt-2">
          {/* Y-Axis Label Column (Kinerja / Performance) */}
          <div className="flex flex-col justify-between items-center py-4 bg-slate-50 border border-slate-200 rounded-xl px-1.5 shrink-0 select-none text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span className="text-teal-700 font-extrabold text-[10px]">▲ TINGGI</span>
            <div className="[writing-mode:vertical-lr] rotate-180 py-6 font-extrabold text-slate-700 tracking-widest text-[11px] flex items-center gap-1">
              <span>KINERJA (PERFORMANCE)</span>
            </div>
            <span className="text-slate-400 font-medium text-[10px]">▼ RENDAH</span>
          </div>

          {/* Main Grid & X-Axis Column Headers */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* Top X-Axis Column Headers (Potensi / Potential) */}
            <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wide">
              <div className="bg-slate-50 py-1.5 rounded-lg border border-slate-200/90 text-slate-600">
                Potensi: Rendah
              </div>
              <div className="bg-slate-50 py-1.5 rounded-lg border border-slate-200/90 text-slate-600">
                Potensi: Sedang
              </div>
              <div className="bg-slate-50 py-1.5 rounded-lg border border-slate-200/90 text-teal-800 font-extrabold">
                Potensi: Tinggi ⭐
              </div>
            </div>

            {/* 3x3 Grid Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {nineBoxGrid.map((row, rIdx) => (
                <React.Fragment key={rIdx}>
                  {row.map((cell, cIdx) => {
                    const cellEmployees = matrixCells[rIdx][cIdx];
                    return (
                      <div
                        key={cIdx}
                        className={`min-h-[150px] p-3.5 rounded-xl border transition-all ${cell.color} flex flex-col justify-between shadow-2xs`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold truncate pr-1">{cell.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/90 font-bold text-slate-700 shrink-0">
                              {cellEmployees.length} orang
                            </span>
                          </div>
                          <p className="text-[10px] opacity-75 mb-3 font-medium">{cell.badge}</p>
                        </div>

                        {/* Employee List in cell */}
                        <div className="space-y-2 mt-auto">
                          {cellEmployees.length === 0 ? (
                            <span className="text-[11px] italic text-slate-400 block text-center py-3 bg-white/40 rounded-lg border border-dashed border-slate-200">
                              (Belum ada karyawan)
                            </span>
                          ) : (
                            cellEmployees.map(emp => (
                              <div
                                key={emp.id}
                                onClick={() => {
                                  setActiveEmpCardId(emp.id);
                                  onSelectEmployee(emp);
                                }}
                                className={`bg-white border rounded-xl p-2.5 space-y-2 cursor-pointer group transition-all shadow-2xs hover:shadow-md ${
                                  emp.id === activeEmpCardId 
                                    ? 'border-teal-500 ring-2 ring-teal-500/30 font-semibold bg-teal-50/40' 
                                    : 'border-slate-200/90 hover:border-teal-400'
                                }`}
                              >
                                {/* Name + Position + IQ */}
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-slate-900 group-hover:text-teal-600 truncate">
                                      {emp.name}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate font-medium">{emp.position}</p>
                                  </div>
                                  {emp.iqScore ? (
                                    <span className="text-[10px] font-extrabold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200/80 shrink-0">
                                      {formatIqScoreDisplay(emp, { prefix: true })}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Divisi Badge */}
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400 font-medium">Divisi:</span>
                                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[160px]">
                                    {emp.department}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Bottom X-Axis Title (Potensi / Potential) */}
            <div className="text-center pt-2 text-[11px] font-bold text-slate-600 tracking-wider uppercase flex items-center justify-center space-x-2">
              <span>POTENSI (POTENTIAL)</span>
              <span className="text-teal-600 font-black">►</span>
            </div>
          </div>
        </div>
      </div>

      {/* RINGKASAN DISTRIBUSI TALENTA PER DIVISI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Ringkasan Distribusi Talenta per Divisi</span>
            </h3>
            <p className="text-xs text-slate-500">
              Rincian karyawan dan klasifikasi 9-box di masing-masing divisi.
            </p>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
            {filteredEmployees.length} Karyawan Ditampilkan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allDepartments
            .filter(d => selectedDepts.length === 0 || selectedDepts.includes(d))
            .map(deptName => {
              const mappedEmps = filteredEmployees.filter(e => e.department === deptName);
              const starCount = mappedEmps.filter(e => e.talentBox.includes('Bintang')).length;
              const highPotCount = mappedEmps.filter(e => e.talentBox.includes('Potensial') || e.talentBox.includes('Tinggi')).length;

              return (
                <div key={deptName} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>{deptName}</span>
                      </h4>
                      <span className="text-[11px] font-extrabold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded border border-teal-200">
                        {mappedEmps.length} Orang
                      </span>
                    </div>

                    {/* Highlights */}
                    <div className="mt-2 flex items-center space-x-2 text-[10px]">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200">
                        ⭐ Star: {starCount}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                        🚀 High Pot: {highPotCount}
                      </span>
                    </div>

                    {/* Employee list mapped to this dept */}
                    <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {mappedEmps.length === 0 ? (
                        <p className="text-[11px] italic text-slate-400">Tidak ada karyawan sesuai filter.</p>
                      ) : (
                        mappedEmps.map(emp => (
                          <div 
                            key={emp.id} 
                            onClick={() => onSelectEmployee(emp)}
                            className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between hover:border-teal-400 cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <p className="font-semibold text-slate-800 truncate">{emp.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{emp.position}</p>
                            </div>
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded shrink-0 border border-teal-200">
                              {emp.talentBox.split(' ')[0]}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
