import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  X, 
  Check, 
  Search, 
  Building2, 
  CheckSquare, 
  Square, 
  UserCheck, 
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Employee } from '../types';
import { formatIqScoreDisplay } from '../utils/pdfExport';

export interface EmployeeDivisionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployeeIds: string[];
  selectedDivision?: string | string[];
  onApply?: (selectedIds: string[], division: string) => void;
  onApplySelection?: (selectedIds: string[]) => void;
}

export const EmployeeDivisionSelectorModal: React.FC<EmployeeDivisionSelectorModalProps> = ({
  isOpen,
  onClose,
  employees,
  selectedEmployeeIds,
  selectedDivision,
  onApply,
  onApplySelection
}) => {
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [recFilter, setRecFilter] = useState<'ALL' | 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan'>('ALL');
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const [divisionDropdownSearch, setDivisionDropdownSearch] = useState('');
  const [collapsedDivisions, setCollapsedDivisions] = useState<{ [div: string]: boolean }>({});
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group employees by Division
  const groupedByDivision = useMemo(() => {
    const map: { [div: string]: Employee[] } = {};
    employees.forEach(emp => {
      const div = emp.department && emp.department.trim() ? emp.department.trim() : 'Umum / Belum Ditentukan';
      if (!map[div]) map[div] = [];
      map[div].push(emp);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [employees]);

  const allDivisionNames = useMemo(() => groupedByDivision.map(([d]) => d), [groupedByDivision]);

  useEffect(() => {
    if (isOpen) {
      const initialSelectedIds = selectedEmployeeIds.length > 0 ? selectedEmployeeIds : employees.map(e => e.id);
      setTempSelected(initialSelectedIds);
      setSearchQuery('');
      setRecFilter('ALL');
      setDivisionDropdownSearch('');
      setIsDivisionDropdownOpen(false);

      if (selectedDivision && selectedDivision !== 'ALL') {
        const divArray = Array.isArray(selectedDivision) 
          ? selectedDivision 
          : selectedDivision.includes(',') 
          ? selectedDivision.split(',').map(s => s.trim()) 
          : [selectedDivision];
        const validDivs = divArray.filter(d => allDivisionNames.includes(d));
        setSelectedDivisions(validDivs.length > 0 ? validDivs : allDivisionNames);
      } else {
        setSelectedDivisions(allDivisionNames);
      }
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target && !document.body.contains(target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDivisionDropdownOpen(false);
      }
    };
    if (isDivisionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDivisionDropdownOpen]);

  // Displayed groups based on multiple division filter
  const displayedGroupedDivisions = useMemo(() => {
    if (selectedDivisions.length === 0) {
      return [];
    }
    if (selectedDivisions.length === allDivisionNames.length) {
      return groupedByDivision;
    }
    return groupedByDivision.filter(([divName]) => selectedDivisions.includes(divName));
  }, [groupedByDivision, selectedDivisions, allDivisionNames]);

  // Toggle single division in multi-select dropdown
  const handleToggleDivisionCheckbox = (divName: string) => {
    const divEmployees = groupedByDivision.find(([d]) => d === divName)?.[1] || [];
    const divEmpIds = divEmployees.map(e => e.id);

    if (selectedDivisions.includes(divName)) {
      // Remove division and unselect its employees
      const newDivs = selectedDivisions.filter(d => d !== divName);
      setSelectedDivisions(newDivs);
      setTempSelected(prev => prev.filter(id => !divEmpIds.includes(id)));
    } else {
      // Add division and select its employees
      const newDivs = [...selectedDivisions, divName];
      setSelectedDivisions(newDivs);
      setTempSelected(prev => Array.from(new Set([...prev, ...divEmpIds])));
      // Ensure it is expanded
      setCollapsedDivisions(prev => ({ ...prev, [divName]: false }));
    }
  };

  // Select only this specific division
  const handleSelectOnlyThisDivisionInDropdown = (divName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const divEmployees = groupedByDivision.find(([d]) => d === divName)?.[1] || [];
    setSelectedDivisions([divName]);
    setTempSelected(divEmployees.map(e => e.id));
    setCollapsedDivisions(prev => ({ ...prev, [divName]: false }));
  };

  // Select all divisions
  const handleSelectAllDivisionsInDropdown = () => {
    setSelectedDivisions(allDivisionNames);
    setTempSelected(employees.map(e => e.id));
  };

  // Deselect all divisions
  const handleDeselectAllDivisionsInDropdown = () => {
    setSelectedDivisions([]);
    setTempSelected([]);
  };

  const handleToggleEmployee = (id: string) => {
    setTempSelected(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectDivision = (divEmployees: Employee[]) => {
    const divIds = divEmployees.map(e => e.id);
    setTempSelected(prev => {
      const existing = new Set(prev);
      divIds.forEach(id => existing.add(id));
      return Array.from(existing);
    });
  };

  const handleDeselectDivision = (divEmployees: Employee[]) => {
    const divIds = new Set(divEmployees.map(e => e.id));
    setTempSelected(prev => prev.filter(id => !divIds.has(id)));
  };

  const handleSelectOnlyDivision = (divEmployees: Employee[]) => {
    const divName = divEmployees[0]?.department?.trim() || 'Umum / Belum Ditentukan';
    setSelectedDivisions([divName]);
    setTempSelected(divEmployees.map(e => e.id));
  };

  const toggleCollapse = (divName: string) => {
    setCollapsedDivisions(prev => ({ ...prev, [divName]: !prev[divName] }));
  };

  const handleApply = () => {
    let finalSelection = tempSelected;
    let finalDivisionLabel = 'ALL';

    if (selectedDivisions.length === 0) {
      finalSelection = [];
      finalDivisionLabel = 'ALL';
    } else if (selectedDivisions.length === 1) {
      finalDivisionLabel = selectedDivisions[0];
    } else if (selectedDivisions.length > 1 && selectedDivisions.length < allDivisionNames.length) {
      finalDivisionLabel = `${selectedDivisions.length} Divisi Terpilih`;
    } else {
      finalDivisionLabel = 'ALL';
    }

    if (onApply) {
      onApply(finalSelection, finalDivisionLabel);
    } else if (onApplySelection) {
      onApplySelection(finalSelection);
    }
    onClose();
  };

  // Dropdown Button Label Computation
  const isAllDivsActive = selectedDivisions.length === allDivisionNames.length;
  const dropdownButtonLabel = useMemo(() => {
    if (isAllDivsActive) {
      return `Semua Divisi (${allDivisionNames.length} Divisi)`;
    }
    if (selectedDivisions.length === 1) {
      const singleDivName = selectedDivisions[0];
      const divEmps = groupedByDivision.find(([d]) => d === singleDivName)?.[1] || [];
      const selInDiv = divEmps.filter(e => tempSelected.includes(e.id)).length;
      return `${singleDivName} (${selInDiv}/${divEmps.length} dipilih)`;
    }
    return `${selectedDivisions.length} Divisi Terpilih (${tempSelected.length} Karyawan)`;
  }, [isAllDivsActive, selectedDivisions, allDivisionNames.length, groupedByDivision, tempSelected]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-visible flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white flex items-center justify-between shrink-0 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Pilih Karyawan yang Ditampilkan (Per Divisi)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  {tempSelected.length} / {employees.length} Karyawan
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pilih satu atau beberapa divisi serta karyawan tertentu untuk dianalisis dan dicetak dalam Executive Summary.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter & Quick Actions */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, jabatan, atau divisi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            {/* Multi-Select Division Dropdown Popover */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
                className={`pl-3 pr-2.5 py-1.5 bg-white border rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shadow-2xs ${
                  isDivisionDropdownOpen 
                    ? 'border-teal-600 ring-2 ring-teal-600/30 text-teal-950' 
                    : !isAllDivsActive
                    ? 'border-teal-400 bg-teal-50/40 text-teal-900'
                    : 'border-slate-300 hover:border-slate-400 text-slate-800'
                }`}
                title="Klik untuk memilih satu atau lebih divisi"
              >
                <Building2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span className="max-w-[210px] sm:max-w-[260px] truncate text-left">
                  {dropdownButtonLabel}
                </span>
                {!isAllDivsActive && (
                  <span className="px-1.5 py-0.2 rounded bg-teal-700 text-white text-[10px] font-bold">
                    {selectedDivisions.length} Divisi
                  </span>
                )}
                {isDivisionDropdownOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {/* Multi-Select Division Menu Popover */}
              {isDivisionDropdownOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header & Fast Filter */}
                  <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-700" />
                        <span>Pilih Divisi (Bisa Lebih Dari 1)</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {selectedDivisions.length}/{allDivisionNames.length} aktif
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={divisionDropdownSearch}
                        onChange={(e) => setDivisionDropdownSearch(e.target.value)}
                        placeholder="Cari divisi di daftar..."
                        className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-600"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        type="button"
                        onClick={handleSelectAllDivisionsInDropdown}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>Pilih Semua Divisi</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllDivisionsInDropdown}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer flex items-center space-x-1"
                      >
                        <Square className="w-3 h-3" />
                        <span>Batal Semua Divisi</span>
                      </button>
                    </div>
                  </div>

                  {/* Divisions List with Checkboxes */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
                    {groupedByDivision
                      .filter(([divName]) => 
                        !divisionDropdownSearch || 
                        divName.toLowerCase().includes(divisionDropdownSearch.toLowerCase())
                      )
                      .map(([divName, divEmps]) => {
                        const isDivChecked = selectedDivisions.includes(divName);
                        const selInDiv = divEmps.filter(e => tempSelected.includes(e.id)).length;
                        const isFullySelected = selInDiv === divEmps.length && divEmps.length > 0;

                        return (
                          <div
                            key={divName}
                            onClick={() => handleToggleDivisionCheckbox(divName)}
                            className={`px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors cursor-pointer group ${
                              isDivChecked
                                ? 'bg-teal-50/70 text-teal-950 font-medium'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                              <div className="shrink-0">
                                {isDivChecked ? (
                                  <CheckSquare className="w-4 h-4 text-teal-700" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                )}
                              </div>
                              <span className="truncate">{divName}</span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isFullySelected
                                  ? 'bg-teal-100 text-teal-900 border border-teal-200'
                                  : selInDiv > 0
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {selInDiv}/{divEmps.length} dipilih
                              </span>

                              <button
                                type="button"
                                onClick={(e) => handleSelectOnlyThisDivisionInDropdown(divName, e)}
                                className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-semibold bg-white hover:bg-teal-100 text-teal-800 border border-slate-200 rounded transition-all cursor-pointer whitespace-nowrap"
                                title={`Pilih hanya divisi ${divName}`}
                              >
                                Hanya Ini
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {groupedByDivision.filter(([divName]) => 
                      !divisionDropdownSearch || 
                      divName.toLowerCase().includes(divisionDropdownSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Tidak ada divisi yang cocok dengan pencarian.
                      </div>
                    )}
                  </div>

                  {/* Popover Footer Close */}
                  <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">
                      {selectedDivisions.length} divisi aktif ({tempSelected.length} karyawan terpilih)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDivisionDropdownOpen(false)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold text-[11px] cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Filter Rekomendasi:</span>
            </span>
            {(['ALL', 'Dapat Disarankan', 'Dipertimbangkan', 'Tidak Disarankan'] as const).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setRecFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  recFilter === cat
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat === 'ALL' ? 'Semua' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grouped Employees by Division List */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50/50">
          {displayedGroupedDivisions.map(([divisionName, divEmployees]) => {
            const filteredEmployees = divEmployees.filter(emp => {
              const matchesSearch = searchQuery === '' || 
                emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (emp.position || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                divisionName.toLowerCase().includes(searchQuery.toLowerCase());

              const matchesRec = recFilter === 'ALL' || emp.recommendationCategory === recFilter;

              return matchesSearch && matchesRec;
            });

            if (filteredEmployees.length === 0 && searchQuery) return null;

            const selectedCountInDiv = divEmployees.filter(e => tempSelected.includes(e.id)).length;
            const isAllDivSelected = selectedCountInDiv === divEmployees.length && divEmployees.length > 0;
            const isPartiallySelected = selectedCountInDiv > 0 && selectedCountInDiv < divEmployees.length;
            const isCollapsed = !!collapsedDivisions[divisionName];

            return (
              <div 
                key={divisionName}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
              >
                {/* Division Header Banner */}
                <div className="p-3.5 bg-slate-100/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (isAllDivSelected) {
                          handleDeselectDivision(divEmployees);
                        } else {
                          handleSelectDivision(divEmployees);
                        }
                      }}
                      className="cursor-pointer text-slate-700 hover:text-teal-700"
                    >
                      {isAllDivSelected ? (
                        <CheckSquare className="w-5 h-5 text-teal-700" />
                      ) : isPartiallySelected ? (
                        <div className="w-5 h-5 bg-teal-100 border-2 border-teal-700 rounded flex items-center justify-center">
                          <div className="w-2.5 h-1 bg-teal-700 rounded-xs" />
                        </div>
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">{divisionName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        selectedCountInDiv > 0 
                          ? 'bg-teal-100 text-teal-900 border border-teal-200' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {selectedCountInDiv} / {divEmployees.length} dipilih
                      </span>
                    </div>
                  </div>

                  {/* Division Quick Actions */}
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectOnlyDivision(divEmployees)}
                      className="px-2 py-0.5 bg-white hover:bg-teal-50 text-teal-800 border border-slate-200 rounded font-medium hover:border-teal-300 transition-colors cursor-pointer"
                      title="Pilih hanya divisi ini dan hilangkan divisi lain"
                    >
                      Pilih Divisi Ini Saja
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleCollapse(divisionName)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Employees Cards within Division */}
                {!isCollapsed && (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {filteredEmployees.map(emp => {
                      const isSelected = tempSelected.includes(emp.id);
                      const isRec = emp.recommendationCategory === 'Dapat Disarankan';
                      const isCons = emp.recommendationCategory === 'Dipertimbangkan';

                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleToggleEmployee(emp.id)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-2.5 select-none ${
                            isSelected
                              ? 'bg-teal-50/70 border-teal-400 ring-1 ring-teal-500/30 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 opacity-75'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <span className={`text-xs font-bold leading-tight truncate ${
                                isSelected ? 'text-slate-950' : 'text-slate-700'
                              }`}>
                                {emp.name}
                              </span>
                            </div>

                            <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                              {emp.evaluatedPosition || emp.position || 'Karyawan'}
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                isRec 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isCons 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {emp.recommendationCategory || 'Dapat Disarankan'}
                              </span>

                              {emp.iqScore ? (
                                <span className="text-slate-500 font-mono">
                                  IQ: <strong className="text-slate-800">{formatIqScoreDisplay(emp)}</strong>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {displayedGroupedDivisions.length === 0 && (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">Tidak ada divisi yang dipilih</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Silakan buka dropdown divisi di atas dan centang satu atau lebih divisi untuk menampilkan karyawan.
              </p>
              <button
                type="button"
                onClick={handleSelectAllDivisionsInDropdown}
                className="mt-3 px-4 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900 cursor-pointer"
              >
                Pilih Semua Divisi
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Total dipilih: <strong className="text-teal-900 font-bold">{tempSelected.length}</strong> dari {employees.length} karyawan
            {!isAllDivsActive && (
              <span className="text-slate-500 ml-1">
                ({selectedDivisions.length} Divisi Aktif)
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Seleksi ({tempSelected.length} Karyawan)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
