import React, { useState, useEffect, useRef } from 'react';
import { Employee, COMPETENCY_DEFINITIONS, VisualizationSubTab, VISUALIZATION_MENU_OPTIONS } from '../types';
import { 
  Users, 
  Award, 
  Target, 
  TrendingUp, 
  Sparkles,
  CheckCircle2,
  FileText,
  BarChart3,
  Brain,
  AlertTriangle,
  Briefcase,
  Calendar,
  FileUp,
  CheckSquare,
  Square,
  UserCheck,
  Zap,
  ArrowRight,
  Trash2,
  Building2,
  Filter,
  Eye,
  Search,
  Grid,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Layers,
  RotateCcw,
  Edit3,
  Download,
  FileDown,
  FileSpreadsheet,
  ListOrdered,
  Activity
} from 'lucide-react';
import { exportEmployeeAssessmentPdf, formatThinkingCapacity, formatIqScoreDisplay } from '../utils/pdfExport';
import { AssessmentSummaryTable } from './AssessmentSummaryTable';
import { StrengthsWeaknessesTable } from './StrengthsWeaknessesTable';
import { CollectiveDevelopmentView } from './CollectiveDevelopmentView';
import { ExecutiveSummaryDocument } from './ExecutiveSummaryDocument';

import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface CompetencyVisualizationProps {
  employees: Employee[];
  selectedEmployeeId?: string;
  activeSubTab?: VisualizationSubTab;
  onSubTabChange?: (subTab: VisualizationSubTab) => void;
  onSelectEmployee: (emp: Employee) => void;
  onGoToTab: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees') => void;
  onDeleteEmployee?: (empId: string) => void;
  onEditEmployee?: (emp: Employee) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onBatchUpdateEmployees?: (updatedList: Employee[]) => void;
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
  onSelectDirect?: (value: string) => void;
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

  const isImplicitAll = selectedValues.length === 0;
  const isExplicitNone = selectedValues.length === 1 && selectedValues[0] === '__NONE__';
  
  const isOptionSelected = (val: string) => {
    if (isExplicitNone) return false;
    if (isImplicitAll) return true;
    return selectedValues.includes(val);
  };

  const selectedCount = isExplicitNone
    ? 0
    : isImplicitAll
      ? options.length
      : options.filter(o => selectedValues.includes(o.value)).length;

  const isAllSelected = !isExplicitNone && (isImplicitAll || (options.length > 0 && selectedCount === options.length));
  const areAllFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(opt => isOptionSelected(opt.value));

  const toggleOption = (val: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (isImplicitAll) {
      // Uncheck this single option
      const next = options.filter(o => o.value !== val).map(o => o.value);
      onChange(next.length === 0 ? ['__NONE__'] : next);
      return;
    }

    if (isExplicitNone) {
      // Selecting first option from clear state
      onChange([val]);
      return;
    }

    if (selectedValues.includes(val)) {
      const next = selectedValues.filter(v => v !== val);
      onChange(next.length === 0 ? ['__NONE__'] : next);
    } else {
      const next = [...selectedValues, val];
      if (next.length === options.length) {
        onChange([]); // reset to all
      } else {
        onChange(next);
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (searchTerm.trim()) {
      if (areAllFilteredSelected) {
        // Deselect filtered options
        const currentActive = isImplicitAll ? options.map(o => o.value) : isExplicitNone ? [] : selectedValues;
        const next = currentActive.filter(v => !filteredOptions.some(f => f.value === v));
        onChange(next.length === 0 ? ['__NONE__'] : next);
      } else {
        // Select all filtered options
        const currentActive = isImplicitAll ? options.map(o => o.value) : isExplicitNone ? [] : selectedValues;
        const next = Array.from(new Set([...currentActive, ...filteredOptions.map(f => f.value)]));
        onChange(next.length === options.length ? [] : next);
      }
    } else {
      if (isAllSelected) {
        // Deselect all so user can pick individually
        onChange(['__NONE__']);
      } else {
        // Select all
        onChange([]);
      }
    }
  };

  // Button Label Text
  let buttonLabel = `Semua ${title}`;
  if (isExplicitNone) {
    buttonLabel = `0 ${title} Dipilih`;
  } else if (selectedValues.length === 1 && selectedValues[0] !== '__NONE__') {
    const match = options.find(o => o.value === selectedValues[0]);
    buttonLabel = match ? match.label : selectedValues[0];
  } else if (selectedValues.length > 1 && selectedValues.length < options.length) {
    buttonLabel = `${selectedValues.length} ${title} Dipilih`;
  } else if (selectedValues.length === options.length && options.length > 0) {
    buttonLabel = `Semua ${title}`;
  }

  const isFiltered = !isExplicitNone && selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 text-xs border rounded-xl px-3.5 py-2 transition-all font-semibold cursor-pointer ${
          isFiltered
            ? 'bg-teal-600 border-teal-400 text-white shadow-xs ring-2 ring-teal-400/30'
            : 'bg-slate-800 border-teal-500/50 text-slate-100 hover:bg-slate-700'
        }`}
      >
        <span className="text-teal-400">{icon}</span>
        <span className="truncate max-w-[170px]">{buttonLabel}</span>
        {isFiltered && (
          <span className="bg-teal-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-84 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 z-50 p-3 space-y-2.5 animate-in fade-in duration-150 text-white">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-700 rounded-lg bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-500"
            />
          </div>

          {/* Subheader: Toggle All and Count (Reset Filter removed) */}
          <div className="flex items-center justify-between text-[11px] pt-0.5 pb-1 border-b border-slate-800">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-teal-400 hover:text-teal-300 font-bold hover:underline cursor-pointer flex items-center space-x-1"
            >
              <span>
                {areAllFilteredSelected
                  ? `Batal Pilih Semua (${filteredOptions.length})`
                  : `Pilih Semua (${filteredOptions.length})`}
              </span>
            </button>
            <span className="text-slate-400 font-medium">
              <strong className="text-teal-300">{selectedCount}</strong> dari {options.length} Dipilih
            </span>
          </div>

          {/* Options Scrollable List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">Tidak ada data ditemukan</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = isOptionSelected(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-start space-x-2 p-2 rounded-lg cursor-pointer transition-colors text-xs group ${
                      isSelected
                        ? 'bg-teal-950/70 text-teal-200 font-semibold border border-teal-800/60'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-teal-500 border-teal-500 text-slate-950 font-bold' : 'border-slate-600 bg-slate-800 group-hover:border-teal-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium group-hover:text-teal-300">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{opt.sublabel}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer with "Selesai" Button */}
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 truncate">
              <strong className="text-white">{selectedCount}</strong> {title.toLowerCase()} aktif
            </span>
            <button
              type="button"
              onClick={() => {
                // If user deselected everything and clicked Selesai, fallback to all to prevent empty views
                if (isExplicitNone) {
                  onChange([]);
                }
                setIsOpen(false);
              }}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer shrink-0"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CompetencyVisualization: React.FC<CompetencyVisualizationProps> = ({
  employees,
  selectedEmployeeId,
  activeSubTab,
  onSubTabChange,
  onSelectEmployee,
  onGoToTab,
  onDeleteEmployee,
  onEditEmployee,
  onUpdateEmployee,
  onBatchUpdateEmployees
}) => {
  const [localSubTab, setLocalSubTab] = useState<VisualizationSubTab>('executive_summary');
  const currentSubTab = activeSubTab || localSubTab;

  const handleSubTabChange = (tab: VisualizationSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setLocalSubTab(tab);
    }
  };

  const [viewMode, setViewMode] = useState<'individual' | 'department'>('department');
  
  // Multi-select state for Departments & Employees
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [focusedEmpId, setFocusedEmpId] = useState<string>(selectedEmployeeId || (employees.length > 0 ? employees[0].id : ''));
  
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>('');
  
  // Inline IQ Editing State
  const [editingIqEmpId, setEditingIqEmpId] = useState<string | null>(null);
  const [tempIqValue, setTempIqValue] = useState<number>(115);

  // Unified Handler: Navigate directly to Individual Competency View and sync Department
  const handleGoToIndividualView = (empId: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    setFocusedEmpId(empId);
    setSelectedEmpIds([empId]);
    if (targetEmp?.department) {
      setSelectedDepts([targetEmp.department]);
    }
    setViewMode('individual');
    handleSubTabChange('competency_charts');
    setTimeout(() => {
      const section = document.getElementById('employee-selection-section');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Track previous selectedEmployeeId to only sync when a genuinely new employee is selected from outside
  const prevSelectedEmployeeIdRef = useRef<string | undefined>(selectedEmployeeId);

  // Sync state if selectedEmployeeId prop changes to a new employee ID
  useEffect(() => {
    if (selectedEmployeeId && selectedEmployeeId !== prevSelectedEmployeeIdRef.current) {
      prevSelectedEmployeeIdRef.current = selectedEmployeeId;
      const target = employees.find(e => e.id === selectedEmployeeId);
      if (target) {
        setFocusedEmpId(target.id);
        setSelectedEmpIds([target.id]);
        if (target.department) {
          setSelectedDepts([target.department]);
        }
        setViewMode('individual');
      }
    } else if (!selectedEmployeeId) {
      prevSelectedEmployeeIdRef.current = undefined;
    }
  }, [selectedEmployeeId]);

  // Extract all unique departments
  const allDepartments: string[] = Array.from(
    new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d)))
  );

  // Department Multi-Select Options
  const deptOptions: MultiSelectOption[] = allDepartments.map(dept => ({
    value: dept,
    label: dept,
    sublabel: `${employees.filter(e => e.department === dept).length} Karyawan`
  }));

  // Handler: When department selection changes
  const handleDepartmentSelectionChange = (newDepts: string[]) => {
    setSelectedDepts(newDepts);
    // If we are in individual view and the current employee is not in any of the selected departments,
    // automatically switch to the first employee of the selected department
    if (newDepts.length > 0) {
      const empsInDept = employees.filter(e => newDepts.includes(e.department));
      if (empsInDept.length > 0 && !empsInDept.some(e => e.id === focusedEmpId)) {
        setFocusedEmpId(empsInDept[0].id);
        setSelectedEmpIds([empsInDept[0].id]);
      }
    }
  };

  // Handler: When employee is directly selected from dropdown
  const handleDirectSelectEmployee = (empId: string) => {
    handleGoToIndividualView(empId);
  };

  // Handler: When employee multi-selection changes
  const handleEmployeeSelectionChange = (newEmpIds: string[]) => {
    setSelectedEmpIds(newEmpIds);
    if (newEmpIds.length > 0) {
      const latestEmpId = newEmpIds[newEmpIds.length - 1];
      const targetEmp = employees.find(e => e.id === latestEmpId);
      if (targetEmp) {
        setFocusedEmpId(targetEmp.id);
        if (targetEmp.department) {
          setSelectedDepts([targetEmp.department]);
        }
        setViewMode('individual');
        handleSubTabChange('competency_charts');
      }
    }
  };

  // Active departments list (all if selectedDepts is empty or invalid)
  const validSelectedDepts = selectedDepts.filter(d => d !== '__NONE__');
  const activeDeptNames = validSelectedDepts.length === 0 ? allDepartments : validSelectedDepts;

  // Employees available within the active departments
  const availableEmployees = employees.filter(e => activeDeptNames.includes(e.department));

  // Employee Multi-Select Options (Show all employees with clear department tags for instant global access)
  const employeeOptions: MultiSelectOption[] = employees.map(e => ({
    value: e.id,
    label: e.name,
    sublabel: `${e.position} • 🏢 Divisi ${e.department}`
  }));

  // Active employees list (filtered by selectedDepts & selectedEmpIds)
  const validSelectedEmpIds = selectedEmpIds.filter(id => id !== '__NONE__');
  const activeEmployees = availableEmployees.filter(e => 
    validSelectedEmpIds.length === 0 || validSelectedEmpIds.includes(e.id)
  );

  // Filtered employees considering search query
  const filteredDeptEmployees = activeEmployees.filter(e => {
    const matchesSearch = searchEmployeeQuery === '' || 
      e.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
      e.position.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
    return matchesSearch;
  });

  // Currently focused single employee for deep-dive individual view
  const currentEmp = employees.find(e => e.id === focusedEmpId) || 
    (filteredDeptEmployees.length > 0 ? filteredDeptEmployees[0] : (employees.length > 0 ? employees[0] : null));

  // Helper function for IQ classification label
  const getIqCategory = (empOrIq?: Employee | number | null) => {
    if (!empOrIq) return 'Normal / Standar';
    if (typeof empOrIq === 'object') {
      const rawCap = empOrIq.thinkingCapacity || '';
      if (/<80|< 80/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore < 80)) {
        return 'Di Bawah Rata-rata (<80)';
      }
      if (/>130|> 130/i.test(rawCap) || (typeof empOrIq.iqScore === 'number' && empOrIq.iqScore >= 130)) {
        return 'Sangat Unggul (>130)';
      }
      const iq = empOrIq.iqScore;
      if (!iq) return 'Rata-rata (Average)';
      if (iq >= 130) return 'Sangat Unggul (>130)';
      if (iq >= 120) return 'Unggul (Superior)';
      if (iq >= 110) return 'Rata-rata Tinggi (High Average)';
      if (iq >= 90) return 'Rata-rata (Average)';
      if (iq < 80) return 'Di Bawah Rata-rata (<80)';
      return 'Di Bawah Rata-rata (Low Average)';
    }

    const iq = empOrIq;
    if (iq >= 130) return 'Sangat Unggul (>130)';
    if (iq >= 120) return 'Unggul (Superior)';
    if (iq >= 110) return 'Rata-rata Tinggi (High Average)';
    if (iq >= 90) return 'Rata-rata (Average)';
    if (iq < 80) return 'Di Bawah Rata-rata (<80)';
    return 'Di Bawah Rata-rata (Low Average)';
  };

  // Stats Calculations for overview
  const totalEmployees = employees.length;
  const avgOverallScore = totalEmployees > 0 
    ? (employees.reduce((acc, e) => acc + e.overallScore, 0) / totalEmployees).toFixed(1)
    : '0';

  const starPlayersCount = employees.filter(e => e.talentBox.includes('Bintang')).length;
  const totalIDPGoals = employees.reduce((acc, e) => acc + (e.idp?.goals?.length || 0), 0);

  const avgIDPProgress = totalEmployees > 0
    ? Math.round(employees.reduce((acc, e) => acc + (e.idp?.overallProgress || 0), 0) / totalEmployees)
    : 0;

  // Active selection statistics
  const activeDeptAvgScore = activeEmployees.length > 0
    ? (activeEmployees.reduce((acc, e) => acc + e.overallScore, 0) / activeEmployees.length).toFixed(1)
    : '0';

  const activeDeptAvgIq = activeEmployees.length > 0
    ? Math.round(
        activeEmployees.reduce((acc, e) => acc + (e.iqScore ?? 115), 0) /
        activeEmployees.length
      )
    : 115;

  // Department Radar Data (Average score per competency in active selection)
  const deptRadarData = COMPETENCY_DEFINITIONS.map(comp => {
    const deptAvg = activeEmployees.length > 0
      ? Number((activeEmployees.reduce((acc, e) => acc + (e.competencies[comp.key] || 0), 0) / activeEmployees.length).toFixed(1))
      : 0;

    return {
      subject: comp.label.split(' (')[0],
      fullLabel: comp.label,
      RataRataDivisi: deptAvg,
      BenchmarkTarget: 4.0
    };
  });

  // Color palette for multi-employee radar overlay
  const COLOR_PALETTE = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

  // Multi-employee Radar chart data (overlaid profiles of selected employees)
  const multiRadarData = COMPETENCY_DEFINITIONS.map(comp => {
    const item: Record<string, any> = {
      subject: comp.label.split(' (')[0],
      fullLabel: comp.label,
      BenchmarkTarget: 4.0
    };
    activeEmployees.slice(0, 8).forEach(emp => {
      item[emp.id] = emp.competencies ? (emp.competencies[comp.key] || 0) : 0;
    });
    return item;
  });

  // Department Bar Chart Data for employees in current active filter
  const deptBarData = activeEmployees.map(emp => ({
    name: emp.name.length > 12 ? emp.name.substring(0, 10) + '...' : emp.name,
    fullName: emp.name,
    SkorAsesmen: emp.overallScore,
    IQ: emp.iqScore || 120
  }));

  // Prepare Radar Data for the selected single employee vs Department Average
  const radarData = (currentEmp?.customCompetencies && currentEmp.customCompetencies.length > 0)
    ? currentEmp.customCompetencies.map(c => {
        const empScore = c.score || 0;
        const sameDeptEmps = employees.filter(e => e.department === (currentEmp?.department || ''));
        let deptSum = 0;
        let count = 0;
        sameDeptEmps.forEach(e => {
          if (e.customCompetencies) {
            const match = e.customCompetencies.find(cc => cc.name.toLowerCase() === c.name.toLowerCase());
            if (match) {
              deptSum += match.score;
              count++;
            }
          }
        });
        const deptAvg = count > 0 ? Number((deptSum / count).toFixed(1)) : 3.8;
        return {
          subject: c.name.length > 18 ? c.name.substring(0, 16) + '...' : c.name,
          fullLabel: c.name,
          SkorIndividu: empScore,
          RataRataDivisi: deptAvg,
          BenchmarkTarget: 4.0
        };
      })
    : COMPETENCY_DEFINITIONS.map(comp => {
        const empScore = currentEmp?.competencies ? (currentEmp.competencies[comp.key] || 0) : 0;
        const sameDeptEmps = employees.filter(e => e.department === (currentEmp?.department || ''));
        const deptAvg = sameDeptEmps.length > 0
          ? Number((sameDeptEmps.reduce((acc, e) => acc + (e.competencies ? (e.competencies[comp.key] || 0) : 0), 0) / sameDeptEmps.length).toFixed(1))
          : 3.5;

        return {
          subject: comp.label.split(' (')[0],
          fullLabel: comp.label,
          SkorIndividu: empScore,
          RataRataDivisi: deptAvg,
          BenchmarkTarget: 4.0
        };
      });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Sub-Tab Navigation Selector Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-1.5">
        {VISUALIZATION_MENU_OPTIONS.map((tab) => {
          const isActive = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.id === 'executive_summary' && <FileText className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />}
              {tab.id === 'competency_charts' && <Activity className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />}
              <span>{tab.title}</span>
            </button>
          );
        })}
      </div>

      {/* RENDER VIEW 2: TABEL RINGKASAN HASIL ASSESSMENT */}
      {currentSubTab === 'assessment_summary_table' && (
        <AssessmentSummaryTable
          employees={employees}
          onSelectEmployee={onSelectEmployee}
          onGoToIndividualView={handleGoToIndividualView}
          onUpdateEmployee={onUpdateEmployee}
        />
      )}

      {/* RENDER VIEW 3: TABEL KEKUATAN, AREA PENGEMBANGAN, DAN KETERANGAN LAIN */}
      {currentSubTab === 'strengths_weaknesses_table' && (
        <StrengthsWeaknessesTable
          employees={employees}
          onSelectEmployee={onSelectEmployee}
          onGoToIndividualView={handleGoToIndividualView}
        />
      )}

      {/* RENDER VIEW 4: PRIORITAS DEVELOPMENT KOLEKTIF */}
      {currentSubTab === 'collective_development' && (
        <CollectiveDevelopmentView
          employees={employees}
          onSelectEmployee={onSelectEmployee}
          onGoToTab={onGoToTab}
        />
      )}

      {/* RENDER VIEW 1: EXECUTIVE SUMMARY */}
      {currentSubTab === 'executive_summary' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Executive Summary Document Card (Matches Official Assessment Report) */}
          <ExecutiveSummaryDocument
            employees={employees}
            onSelectEmployee={onSelectEmployee}
            onGoToIndividualView={handleGoToIndividualView}
            onUpdateEmployee={onUpdateEmployee}
            onBatchUpdateEmployees={onBatchUpdateEmployees}
            onGoToTab={onGoToTab}
          />
        </div>
      )}

      {/* RENDER VIEW: VISUALISASI KOMPETENSI KARYAWAN & DEPARTEMEN */}
      {currentSubTab === 'competency_charts' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Banner & KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Karyawan</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{totalEmployees}</span>
                  <span className="text-xs text-slate-500">orang</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rata-rata Skor</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{avgOverallScore}</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Star Players (9-Box)</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{starPlayersCount}</span>
                  <span className="text-xs text-slate-500">karyawan</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Program IDP</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{totalIDPGoals}</span>
                  <span className="text-xs text-slate-500">tujuan</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Progres IDP</p>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl font-extrabold text-slate-900">{avgIDPProgress}%</span>
                  <span className="text-xs text-emerald-600 font-medium">real-time</span>
                </div>
              </div>
            </div>
          </div>

      {/* VIEW MODE CONTROL & DEPARTMENT SELECTION HEADER */}
      <div id="employee-selection-section" className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-2xl p-5 sm:p-6 text-white shadow-lg border border-slate-700/60 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center space-x-1">
                <BarChart3 className="w-3 h-3 text-teal-400" />
                <span>Analisis & Pemetaan Kompetensi Organisasi</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-teal-400" />
              <span>Visualisasi Kompetensi Karyawan & Departemen</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Lihat seluruh karyawan dalam 1 departemen beserta matriks kompetensinya, atau pilih karyawan tertentu untuk analisis mendalam individual.
            </p>
          </div>
        </div>

        {/* Filter Bar: Multi-Select Department & Multi-Select Employee */}
        <div className="pt-3 border-t border-slate-700/80 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Department Multi-Select Dropdown */}
              <div className="flex items-center space-x-2 flex-1 sm:flex-none">
                <label className="text-xs font-semibold text-teal-300 flex items-center space-x-1 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pilih Departemen:</span>
                </label>
                <MultiSelectDropdown
                  title="Departemen"
                  icon={<Building2 className="w-3.5 h-3.5" />}
                  options={deptOptions}
                  selectedValues={selectedDepts}
                  onChange={handleDepartmentSelectionChange}
                  onSelectDirect={(dept) => handleDepartmentSelectionChange([dept])}
                  placeholder="Cari departemen..."
                />
              </div>

              {/* Employee Multi-Select Dropdown */}
              <div className="flex items-center space-x-2 flex-1 sm:flex-none">
                <label className="text-xs font-semibold text-teal-300 flex items-center space-x-1 shrink-0">
                  <UserCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Pilih Karyawan:</span>
                </label>
                <MultiSelectDropdown
                  title="Karyawan"
                  icon={<UserCheck className="w-3.5 h-3.5" />}
                  options={employeeOptions}
                  selectedValues={selectedEmpIds}
                  onChange={handleEmployeeSelectionChange}
                  onSelectDirect={handleDirectSelectEmployee}
                  placeholder="Cari nama karyawan atau divisi..."
                />
              </div>
            </div>
          </div>

          {/* Active Filter Chips / Badges Bar */}
          {(selectedDepts.length > 0 || selectedEmpIds.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/50 text-xs">
              <span className="text-slate-400 text-[11px] font-semibold flex items-center space-x-1">
                <Filter className="w-3 h-3 text-teal-400" />
                <span>Filter Aktif:</span>
              </span>

              {/* Department chips */}
              {selectedDepts.length > 0 && selectedDepts.length < allDepartments.length && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-teal-300 font-bold uppercase">Divisi:</span>
                  {selectedDepts.map(dept => (
                    <span
                      key={dept}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-teal-900/80 text-teal-200 border border-teal-600/60 text-[11px] font-medium"
                    >
                      <span>🏢 {dept}</span>
                      <button
                        onClick={() => setSelectedDepts(selectedDepts.filter(d => d !== dept))}
                        className="hover:text-rose-300 text-teal-400 p-0.5"
                        title="Hapus filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Employee chips */}
              {selectedEmpIds.length > 0 && selectedEmpIds.length < availableEmployees.length && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-teal-300 font-bold uppercase">Karyawan:</span>
                  {selectedEmpIds.slice(0, 5).map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    if (!emp) return null;
                    return (
                      <span
                        key={empId}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-900/80 text-indigo-200 border border-indigo-600/60 text-[11px] font-medium"
                      >
                        <span>👤 {emp.name.split(' ')[0]}</span>
                        <button
                          onClick={() => setSelectedEmpIds(selectedEmpIds.filter(id => id !== empId))}
                          className="hover:text-rose-300 text-indigo-400 p-0.5"
                          title="Hapus filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  {selectedEmpIds.length > 5 && (
                    <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg">
                      +{selectedEmpIds.length - 5} lagi
                    </span>
                  )}
                </div>
              )}

              {/* Reset All Filters Button */}
              <button
                onClick={() => {
                  setSelectedDepts([]);
                  setSelectedEmpIds([]);
                }}
                className="ml-auto text-[11px] font-bold text-rose-300 hover:text-rose-200 bg-rose-950/60 hover:bg-rose-900/80 px-2.5 py-1 rounded-lg border border-rose-800/60 transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Semua Filter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MAPPING KOLEKTIF DEPARTEMEN (SEE ALL EMPLOYEES IN DEPARTMENT) */}
      {/* ========================================================================= */}
      {viewMode === 'department' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Department KPI Stats & Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Analisis Agregat Divisi
                  </span>
                  {selectedDepts.length > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      Multi-Departemen ({selectedDepts.length} Divisi)
                    </span>
                  )}
                  {selectedEmpIds.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Multi-Karyawan ({selectedEmpIds.length} Orang)
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mt-1">
                  <Building2 className="w-5 h-5 text-teal-600" />
                  <span>
                    Mapping Kompetensi: {
                      selectedDepts.length === 0 
                        ? 'Seluruh Organisasi (Semua Departemen)' 
                        : selectedDepts.length === 1 
                          ? selectedDepts[0] 
                          : `${selectedDepts.length} Departemen (${selectedDepts.join(', ')})`
                    }
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Ringkasan kompetensi, rata-rata skor asesmen, dan profil <strong>{activeEmployees.length} karyawan</strong> terpilih.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-teal-50 border border-teal-200 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-teal-700 block">Rata-rata Skor</span>
                  <span className="text-lg font-extrabold text-teal-900">{activeDeptAvgScore} / 100</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-indigo-700 block">Rata-rata IQ</span>
                  <span className="text-lg font-extrabold text-indigo-900">{activeDeptAvgIq}</span>
                </div>
              </div>
            </div>

            {/* Department Charts Grid: Radar & Bar comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Radar Chart (Average for Department) */}
              <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Radar Agregat Kompetensi Seleksi Terpilih</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Profil 8 dimensi kompetensi agregat ({activeEmployees.length} Karyawan) vs Target Benchmark (4.0).
                  </p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={deptRadarData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" />
                      <Radar name="Rata-rata Terpilih" dataKey="RataRataDivisi" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                      <Radar name="Target Benchmark (4.0)" dataKey="BenchmarkTarget" stroke="#f59e0b" fill="transparent" strokeDasharray="3 3" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart (Employee Score Comparison) */}
              <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <span>Perbandingan Skor Asesmen Karyawan Terpilih</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Perbandingan langsung skor keseluruhan antar {activeEmployees.length} karyawan terpilih.
                  </p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                        formatter={(value: any, name: any, item: any) => [`${value} Points`, 'Skor Asesmen']}
                      />
                      <Bar dataKey="SkorAsesmen" fill="#0d9488" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* LIST / GRID OF ALL EMPLOYEES IN THIS SELECTION WITH COMPETENCY MAPPING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>Daftar Pemetaan Kompetensi Karyawan ({filteredDeptEmployees.length} Orang)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Berikut adalah daftar karyawan terpilih beserta nilai IQ & pemetaan 8 dimensi kompetensinya.
                </p>
              </div>

              {/* Search filter within active selection */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  placeholder="Cari nama / posisi / divisi..."
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Employee Competency Cards Grid */}
            {filteredDeptEmployees.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada karyawan ditemukan sesuai kriteria filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {filteredDeptEmployees.map(emp => (
                  <div
                    key={emp.id}
                    className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-teal-400 rounded-2xl p-4 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Card Header: Avatar, Name, IQ, Talent Box */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-xs">
                            {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{emp.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{emp.position}</p>
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded border border-teal-200">
                              {emp.department}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {emp.iqScore ? (
                            <span className="text-[10px] font-extrabold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 block mb-1">
                              {formatIqScoreDisplay(emp, { prefix: true })}
                            </span>
                          ) : null}
                          <span className="text-xs font-black text-teal-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            Skor: {emp.overallScore}
                          </span>
                        </div>
                      </div>

                      {/* 8 Competencies Mini Radar / Score Badges Grid */}
                      <div className="mt-3 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 block">Mapping Skor 8 Dimensi Kompetensi:</span>
                        
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          {COMPETENCY_DEFINITIONS.map(comp => {
                            const score = emp.competencies ? (emp.competencies[comp.key] || 0) : 0;
                            return (
                              <div key={comp.key} className="bg-white p-1.5 rounded-lg border border-slate-200/90 flex items-center justify-between">
                                <span className="text-slate-600 truncate pr-1" title={comp.label}>
                                  {comp.label.split(' (')[0]}
                                </span>
                                <span className={`font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                                  score >= 4.2 ? 'bg-emerald-100 text-emerald-800' :
                                  score >= 3.5 ? 'bg-teal-100 text-teal-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {score.toFixed(1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Strengths highlight */}
                      {emp.strengths && emp.strengths.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] font-semibold text-slate-500 block mb-1">Kekuatan Utama:</span>
                          <p className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-medium line-clamp-1">
                            ✔ {emp.strengths[0]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Action button */}
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {emp.talentBox}
                      </span>

                      <button
                        onClick={() => handleGoToIndividualView(emp.id)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>Visualisasi Profil Individu ➔</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DASHBOARD PEMETAAN KOMPETENSI INDIVIDU & PERBANDINGAN MULTI-KARYAWAN */}
      {/* ========================================================================= */}
      {viewMode === 'individual' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Multi-Employee Comparison Dashboard (If > 1 employee active) */}
          {activeEmployees.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center space-x-1">
                      <Layers className="w-3 h-3 text-indigo-600" />
                      <span>Analisis Perbandingan Multi-Karyawan</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                      {activeEmployees.length} Karyawan Terpilih
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mt-1">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <span>Overlay Radar & Tabel Komparatif Kompetensi Side-by-Side</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Membandingkan langsung profil radar 8 dimensi kompetensi dan metrik kinerja antar karyawan terpilih.
                  </p>
                </div>

                {/* Switch focus dropdown */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">Fokus Detail:</span>
                  <select
                    value={focusedEmpId}
                    onChange={(e) => setFocusedEmpId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name} — {emp.position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Employee Radar Overlay Chart & Side-by-side competency grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Overlaid Radar Chart (6 cols) */}
                <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <Radar className="w-4 h-4 text-indigo-600" />
                      <span>Radar Overlaid Kompetensi ({activeEmployees.length} Karyawan)</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Visual perbandingan profil 8 dimensi kompetensi pada grafik radar yang sama.
                    </p>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={multiRadarData}>
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" />
                        <Radar name="Target Benchmark (4.0)" dataKey="BenchmarkTarget" stroke="#f59e0b" fill="transparent" strokeDasharray="3 3" />
                        {activeEmployees.slice(0, 8).map((emp, idx) => (
                          <Radar
                            key={emp.id}
                            name={`${emp.name} (${emp.position})`}
                            dataKey={emp.id}
                            stroke={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                            fill={COLOR_PALETTE[idx % COLOR_PALETTE.length]}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Side-by-side Competency Score Matrix Table (6 cols) */}
                <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 overflow-x-auto">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-teal-600" />
                      <span>Matriks Skor 8 Dimensi Kompetensi Side-by-Side</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Tabel perbandingan angka skor kompetensi antar karyawan terpilih.
                    </p>
                  </div>

                  <table className="w-full text-left border-collapse text-xs min-w-[340px]">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-200/70 text-slate-800">
                        <th className="p-2 font-bold">Kompetensi</th>
                        {activeEmployees.slice(0, 5).map((emp, idx) => (
                          <th key={emp.id} className="p-2 font-bold text-center truncate max-w-[100px]" style={{ color: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}>
                            {emp.name.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {COMPETENCY_DEFINITIONS.map((comp) => (
                        <tr key={comp.key} className="hover:bg-slate-100/80">
                          <td className="p-2 font-semibold text-slate-700">{comp.label.split(' (')[0]}</td>
                          {activeEmployees.slice(0, 5).map((emp) => {
                            const score = emp.competencies ? (emp.competencies[comp.key] || 0) : 0;
                            return (
                              <td key={emp.id} className="p-2 text-center font-extrabold">
                                <span className={`px-2 py-0.5 rounded text-[11px] inline-block min-w-[36px] ${
                                  score >= 4.2 ? 'bg-emerald-100 text-emerald-800' :
                                  score >= 3.5 ? 'bg-teal-100 text-teal-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {score.toFixed(1)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-slate-200/50 font-bold border-t-2 border-slate-300">
                        <td className="p-2 text-slate-900">Skor Asesmen / IQ</td>
                        {activeEmployees.slice(0, 5).map((emp) => (
                          <td key={emp.id} className="p-2 text-center text-slate-900">
                            <div>{emp.overallScore} Pts</div>
                            {emp.iqScore ? (
                              <div className="text-[10px] text-indigo-700 font-bold">{formatIqScoreDisplay(emp, { prefix: true })}</div>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Focused Single Employee Profile Card */}
          {currentEmp && (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              {/* Employee Bio */}
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0 border-2 border-teal-100">
                  {currentEmp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{currentEmp.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      {currentEmp.nip}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {currentEmp.talentBox}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="text-slate-700">{currentEmp.position}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{currentEmp.department}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Asesmen: {currentEmp.assessmentDate}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportEmployeeAssessmentPdf(currentEmp)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-linear-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 rounded-xl transition-all shadow-sm flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                        title="Download Dokumen PDF Laporan Hasil Analisa Asesmen"
                      >
                        <FileDown className="w-4 h-4 text-white" />
                        <span>Download PDF</span>
                      </button>

                      {onEditEmployee && (
                        <button
                          onClick={() => onEditEmployee(currentEmp)}
                          className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center space-x-1 shadow-2xs cursor-pointer"
                          title="Edit Data & Asesmen Karyawan Ini"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Edit Profil / IQ</span>
                        </button>
                      )}
                      {onDeleteEmployee && (
                        <button
                          onClick={() => onDeleteEmployee(currentEmp.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Hapus Karyawan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* IQ Score & Overall Score Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* NILAI IQ CARD */}
                {(() => {
                  const empIq = typeof currentEmp.iqScore === 'number' && !isNaN(currentEmp.iqScore) && currentEmp.iqScore >= 70
                    ? currentEmp.iqScore
                    : Math.round(92 + ((currentEmp.overallScore || 75) * 0.35));

                  const isEditingThisIq = editingIqEmpId === currentEmp.id;

                  const handleSaveIq = (newIqVal: number) => {
                    if (onUpdateEmployee && newIqVal >= 50 && newIqVal <= 170) {
                      onUpdateEmployee({
                        ...currentEmp,
                        iqScore: newIqVal,
                        thinkingCapacity: formatThinkingCapacity({ iqScore: newIqVal })
                      });
                    }
                    setEditingIqEmpId(null);
                  };

                  return (
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white p-3.5 rounded-xl border border-indigo-800 shadow-sm flex flex-col justify-between relative group">
                      <div className="flex items-center justify-between text-indigo-300">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Nilai IQ Psikotes</span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => {
                              setTempIqValue(empIq);
                              setEditingIqEmpId(isEditingThisIq ? null : currentEmp.id);
                            }}
                            className="p-1 rounded bg-indigo-800/80 hover:bg-indigo-700 text-indigo-200 transition-colors"
                            title="Koreksi / Sesuaikan Nilai IQ Sesuai File PDF"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <Brain className="w-4 h-4 text-indigo-300" />
                        </div>
                      </div>

                      {isEditingThisIq ? (
                        <div className="my-1.5 space-y-1.5 animate-in fade-in duration-150">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="70"
                              max="160"
                              value={tempIqValue}
                              onChange={(e) => setTempIqValue(parseInt(e.target.value) || 100)}
                              className="w-20 bg-indigo-950 border border-indigo-400 text-white text-base font-black px-2 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveIq(tempIqValue)}
                              className="px-2 py-1 text-[11px] font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded transition-colors"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setEditingIqEmpId(null)}
                              className="px-1.5 py-1 text-[11px] text-indigo-300 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                          <span className="text-[10px] text-indigo-300 block">
                            Rentang skala: 70 - 160
                          </span>
                        </div>
                      ) : (
                        <div className="my-1">
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-black text-white">{formatIqScoreDisplay(currentEmp)}</span>
                            <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-800/60 px-1.5 py-0.5 rounded">
                              {getIqCategory(currentEmp)}
                            </span>
                          </div>
                          <span className="text-[10px] text-indigo-200 block font-medium mt-0.5">
                            Ekstraksi Berkas Asesmen PDF
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* OVERALL SCORE CARD */}
                <div className="bg-gradient-to-br from-teal-900 to-teal-950 text-white p-3.5 rounded-xl border border-teal-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-teal-300">
                    <span className="text-[10px] uppercase font-bold tracking-wider">Skor Asesmen</span>
                    <Award className="w-4 h-4 text-teal-300" />
                  </div>
                  <div className="my-1">
                    <span className="text-2xl font-black text-white">{currentEmp.overallScore}</span>
                    <span className="text-[10px] text-teal-200 block font-medium">Skala 0 - 100</span>
                  </div>
                </div>

                {/* PERFORMANCE vs POTENTIAL */}
                <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Matriks Kinerja/Potensi</span>
                  <div className="my-1 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Kinerja:</span>
                      <span className="font-bold text-slate-900">{currentEmp.performanceScore} / 5.0</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Potensi:</span>
                      <span className="font-bold text-slate-900">{currentEmp.potentialScore} / 5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Competency Visualization Grid: Spider Radar & Competency Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Spider Radar Chart (5 cols) */}
              <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Radar Spider Kompetensi ({currentEmp.name})</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pemetaan 8 dimensi kompetensi hasil PDF assessment terhadap rata-rata divisi ({currentEmp.department}).
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#334155', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" />
                      <Radar name={currentEmp.name} dataKey="SkorIndividu" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                      <Radar name="Rata-rata Divisi" dataKey="RataRataDivisi" stroke="#6366f1" fill="#818cf8" fillOpacity={0.2} />
                      <Radar name="Benchmark (4.0)" dataKey="BenchmarkTarget" stroke="#f59e0b" fill="transparent" strokeDasharray="3 3" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Competency Score Progress Bars (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-teal-600" />
                    <span>
                      {currentEmp.customCompetencies && currentEmp.customCompetencies.length > 0
                        ? `Rincian ${currentEmp.customCompetencies.length} Skor Kompetensi Hasil PDF Asesmen`
                        : 'Rincian Skor 8 Dimensi Kompetensi'}
                    </span>
                  </span>
                  {currentEmp.customCompetencies && currentEmp.customCompetencies.length > 0 && (
                    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Diekstrak dari PDF
                    </span>
                  )}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentEmp.customCompetencies && currentEmp.customCompetencies.length > 0 ? (
                    currentEmp.customCompetencies.map((comp, idx) => {
                      const score = comp.score || 0;
                      const pct = Math.round((score / 5) * 100);
                      return (
                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-800 truncate pr-2" title={comp.name}>
                              {comp.name}
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] shrink-0 ${
                              score >= 4.5 ? 'bg-emerald-100 text-emerald-800' :
                              score >= 3.8 ? 'bg-teal-100 text-teal-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {score.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                score >= 4.5 ? 'bg-emerald-500' :
                                score >= 3.8 ? 'bg-teal-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {comp.description && (
                            <p className="text-[10px] text-slate-500 line-clamp-2">{comp.description}</p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    COMPETENCY_DEFINITIONS.map(comp => {
                      const score = currentEmp.competencies[comp.key] || 0;
                      const pct = Math.round((score / 5) * 100);
                      return (
                        <div key={comp.key} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-800 truncate pr-2" title={comp.label}>
                              {comp.label.split(' (')[0]}
                            </span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                              score >= 4.5 ? 'bg-emerald-100 text-emerald-800' :
                              score >= 3.8 ? 'bg-teal-100 text-teal-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {score.toFixed(1)} / 5.0
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                score >= 4.5 ? 'bg-emerald-500' :
                                score >= 3.8 ? 'bg-teal-500' :
                                'bg-amber-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{comp.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STRENGTHS & WEAKNESSES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KEKUATAN (STRENGTHS) */}
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center space-x-2 pb-3 border-b border-emerald-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Kekuatan Utama (Strengths)</h4>
                  <p className="text-[11px] text-emerald-700">Hasil analisis keunggulan dari asesmen AI</p>
                </div>
              </div>

              <ul className="space-y-2.5 pt-1">
                {currentEmp.strengths && currentEmp.strengths.length > 0 ? (
                  currentEmp.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                      <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{str}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic text-slate-400">Tidak ada data kekuatan.</li>
                )}
              </ul>
            </div>

            {/* KELEMAHAN (WEAKNESSES) */}
            <div className="bg-white rounded-2xl border border-rose-200 shadow-xs p-5 space-y-3">
              <div className="flex items-center space-x-2 pb-3 border-b border-rose-100">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950">Kelemahan & Area Pengembangan</h4>
                  <p className="text-[11px] text-rose-700">Area kritis yang perlu ditingkatkan melalui IDP</p>
                </div>
              </div>

              <ul className="space-y-2.5 pt-1">
                {currentEmp.weaknesses && currentEmp.weaknesses.length > 0 ? (
                  currentEmp.weaknesses.map((weak, idx) => (
                    <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{weak}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs italic text-slate-400">Tidak ada data kelemahan.</li>
                )}
              </ul>
            </div>
          </div>

          {/* KEY INSIGHTS & RECOMMENDED ROLES */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-teal-600" />
              <h4 className="text-sm font-bold text-slate-900">Analisis Mendalam & Rekomendasi Karir</h4>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              {currentEmp.keyInsights || "Karyawan menunjukkan potensi pengembangan kepemimpinan yang baik."}
            </p>

            {currentEmp.recommendedRoles && currentEmp.recommendedRoles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-600">Rekomendasi Jabatan Masa Depan:</span>
                {currentEmp.recommendedRoles.map((role, rIdx) => (
                  <span key={rIdx} className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    🎯 {role}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RECOMMENDED INDIVIDUAL DEVELOPMENT PLAN (IDP) FROM ASSESSMENT */}
          <div className="bg-white rounded-2xl border border-teal-200 shadow-md p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    Hasil Rekomendasi Asesmen AI
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mt-1">
                  <Target className="w-5 h-5 text-teal-600" />
                  <span>Rencana Pengembangan Diri (Individual Development Plan)</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Target Jabatan:</span>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                    {currentEmp.idp?.targetRole || currentEmp.position}
                  </span>
                </div>

                <button
                  onClick={() => onSelectEmployee(currentEmp)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <span>Buka IDP Lengkap</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* IDP Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Progres Keseluruhan IDP</span>
                <span className="font-bold text-teal-700">{currentEmp.idp?.overallProgress || 0}% Selesai</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${currentEmp.idp?.overallProgress || 0}%` }}
                />
              </div>
            </div>

            {/* List of Recommended IDP Goals */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tujuan Program IDP ({currentEmp.idp?.goals?.length || 0} Program Disarankan):
              </h4>

              {currentEmp.idp?.goals && currentEmp.idp.goals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentEmp.idp.goals.map(goal => (
                    <div key={goal.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            goal.priority === 'Tinggi' ? 'bg-rose-100 text-rose-800' :
                            goal.priority === 'Sedang' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-200 text-slate-800'
                          }`}>
                            Prioritas {goal.priority}
                          </span>
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {goal.category}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-slate-900 leading-snug">{goal.title}</h5>
                        <p className="text-xs text-slate-600">
                          Target Kompetensi: <strong className="text-teal-700">{goal.competencyTarget}</strong>
                        </p>
                      </div>

                      {/* Action Items List */}
                      {goal.actionItems && goal.actionItems.length > 0 && (
                        <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-700 block">Langkah Aksi Konkret:</span>
                          <ul className="space-y-1">
                            {goal.actionItems.map((act, aIdx) => (
                              <li key={aIdx} className="flex items-center space-x-2 text-xs text-slate-600">
                                {act.completed ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span className={act.completed ? 'line-through text-slate-400' : ''}>{act.task}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Target Selesai: {goal.targetDate}</span>
                        <span className="font-semibold text-slate-700">Status: {goal.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-500">Belum ada tujuan IDP yang tercatat untuk karyawan ini.</p>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
};
