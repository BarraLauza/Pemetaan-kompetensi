import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Employee, COMPETENCY_DEFINITIONS } from '../types';
import { 
  FileText, 
  Printer, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Edit3, 
  Pencil,
  RotateCcw,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Check,
  ExternalLink,
  Brain,
  Download,
  Loader2,
  Building2,
  Building,
  Save,
  X,
  Plus,
  Tag,
  CheckSquare,
  Square,
  UserCheck,
  FileSpreadsheet,
  FileDown,
  ShieldCheck,
  FileCheck,
  FileUp,
  RefreshCw,
  Award,
  Upload
} from 'lucide-react';
import { exportExecutiveSummaryPdf, COMPETENCY_SCORE_MATRIX, resolveEmployeeCompetencyScore, formatThinkingCapacity } from '../utils/pdfExport';
import { TextRefinementModal } from './TextRefinementModal';
import { EmployeeDivisionSelectorModal } from './EmployeeDivisionSelectorModal';
import { FullExecutiveRefinementModal, FullExecutiveRefinementResult } from './FullExecutiveRefinementModal';

interface ExecutiveSummaryDocumentProps {
  employees: Employee[];
  onSelectEmployee?: (emp: Employee) => void;
  onGoToIndividualView?: (empId: string) => void;
  onUpdateEmployee?: (emp: Employee) => void;
  onBatchUpdateEmployees?: (updatedList: Employee[]) => void;
  onGoToTab?: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees', subTab?: any) => void;
}

interface CompetencyGapStat {
  key: string;
  label: string;
  avgScore: number;
  gap: number; // 4.0 - avgScore
  belowTargetCount: number;
  belowTargetPercent: number;
}

export const ExecutiveSummaryDocument: React.FC<ExecutiveSummaryDocumentProps> = ({
  employees,
  onSelectEmployee,
  onGoToIndividualView,
  onUpdateEmployee,
  onBatchUpdateEmployees,
  onGoToTab
}) => {
  // Helper to get authentic uploaded PDF assessment document name
  const getEmployeePdfDocName = useCallback((emp: Employee): string => {
    if (emp.uploadedPdfName && emp.uploadedPdfName.trim().length > 0) {
      return emp.uploadedPdfName;
    }
    const cleanName = emp.name ? emp.name.trim().replace(/\s+/g, '_') : 'Karyawan';
    return `Laporan_Asesmen_${cleanName}.pdf`;
  }, []);
  // Employee Selection & Division Filtering for Executive Summary Display
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<'ALL' | string>('ALL');
  const [selectedDisplayEmployeeIds, setSelectedDisplayEmployeeIds] = useState<string[]>(() => employees.map(e => e.id));
  const [hasUserAppliedFilter, setHasUserAppliedFilter] = useState(false);
  const [isEmployeeSelectorModalOpen, setIsEmployeeSelectorModalOpen] = useState(false);
  const [isFullRefinementModalOpen, setIsFullRefinementModalOpen] = useState(false);
  const [editingEmployeeForSummary, setEditingEmployeeForSummary] = useState<Employee | null>(null);
  const [generalToast, setGeneralToast] = useState<string | null>(null);

  // Sync selected employee IDs when employees list changes
  React.useEffect(() => {
    if (employees.length > 0) {
      setSelectedDisplayEmployeeIds(prev => {
        if (!hasUserAppliedFilter || prev.length === 0) {
          return employees.map(e => e.id);
        }
        const existingSet = new Set(employees.map(e => e.id));
        return prev.filter(id => existingSet.has(id));
      });
    }
  }, [employees, hasUserAppliedFilter]);

  // Active / Displayed Employees (Filtered by Selected Checkboxes / Division)
  const displayedEmployees = useMemo(() => {
    if (!hasUserAppliedFilter) {
      return employees;
    }
    return employees.filter(e => selectedDisplayEmployeeIds.includes(e.id));
  }, [employees, selectedDisplayEmployeeIds, hasUserAppliedFilter]);

  // Toggle detail breakdown of statistical gaps
  const [showGapDetails, setShowGapDetails] = useState(false);

  // Search for Section 2 (Skor Kompetensi)
  const [scoreMatrixSearchQuery, setScoreMatrixSearchQuery] = useState('');

  // Search & Filter for Table 3 (Tabel Ringkasan Hasil Assessment)
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableRecommendationFilter, setTableRecommendationFilter] = useState<'ALL' | 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan'>('ALL');

  // Search & Filter for Table 4 (Tabel Kekuatan, Area Pengembangan dan Keterangan Lain)
  const [table3SearchQuery, setTable3SearchQuery] = useState('');
  const [table3RecommendationFilter, setTable3RecommendationFilter] = useState<'ALL' | 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan'>('ALL');

  // Custom editable remarks for HR table with LocalStorage persistence
  const [customRemarks, setCustomRemarks] = useState<{
    recommended?: string;
    considered?: string;
    notRecommended?: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('talentpulse_custom_hr_remarks_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  const [customNoteOverride, setCustomNoteOverride] = useState<string | null>(() => {
    try {
      return localStorage.getItem('talentpulse_custom_pattern_note_v1');
    } catch (_) {}
    return null;
  });

  // Custom reading & follow-up overrides per employee ID with LocalStorage persistence
  const [customReadingOverrides, setCustomReadingOverrides] = useState<{ [empId: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('talentpulse_custom_reading_overrides_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });
  const [customFollowUpOverrides, setCustomFollowUpOverrides] = useState<{ [empId: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('talentpulse_custom_followup_overrides_v1');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {};
  });

  // Initial benchmark readings ref
  const initialReadingsRef = useRef<{ [id: string]: { briefReading: string; followUpNotes: string } }>({});

  // Populate and keep updated initial benchmark readings ref when employees load
  useEffect(() => {
    employees.forEach(emp => {
      initialReadingsRef.current[emp.id] = {
        briefReading: customReadingOverrides[emp.id] || emp.briefReading || emp.keyInsights || initialReadingsRef.current[emp.id]?.briefReading || '',
        followUpNotes: customFollowUpOverrides[emp.id] || emp.followUpNotes || initialReadingsRef.current[emp.id]?.followUpNotes || ''
      };
    });
  }, [employees, customReadingOverrides, customFollowUpOverrides]);

  // Ideal Reading Singkat Generator (Strictly prioritizing authentic PDF extracted content)
  const getIdealReadingText = useCallback((emp: Employee): string => {
    // 1. Prioritaskan teks otentik langsung dari dokumen PDF assessment
    if (emp.briefReading && emp.briefReading.trim().length > 0) {
      return emp.briefReading.trim();
    }
    if (emp.keyInsights && emp.keyInsights.trim().length > 0) {
      return emp.keyInsights.trim();
    }
    if (emp.summary && emp.summary.trim().length > 0) {
      return emp.summary.trim();
    }
    const initial = initialReadingsRef.current[emp.id]?.briefReading;
    if (initial && initial.trim().length > 0) {
      return initial.trim();
    }
    const score = emp.overallScore || 0;
    const name = emp.name || 'Kandidat';
    const position = emp.evaluatedPosition || emp.position || 'posisi target';
    const iqText = emp.iqScore 
      ? `IQ ${emp.iqScore} (${emp.thinkingCapacity || (emp.iqScore >= 130 ? 'Superior' : emp.iqScore >= 120 ? 'Rata-rata Atas' : 'Rata-rata')})`
      : (emp.thinkingCapacity ? `kapasitas daya pikir ${emp.thinkingCapacity}` : '');
    const rec = emp.recommendationCategory || (score >= 75 ? 'Dapat Disarankan' : score >= 65 ? 'Dipertimbangkan' : 'Tidak Disarankan');
    const strengthsList = Array.isArray(emp.strengths) && emp.strengths.length > 0 
      ? emp.strengths.slice(0, 2).map(s => s.toLowerCase()).join(' serta ')
      : (emp.mainStrengths || 'eksekusi kerja dan komitmen tinggi');

    if (rec === 'Dapat Disarankan') {
      return `${name} memiliki profil intelektual dan potensi kepemimpinan yang menonjol (pemenuhan kompetensi ${score}%${iqText ? ', ' + iqText : ''}) dengan eksekusi kerja yang responsif. Berhasil menunjukkan keunggulan pada ${strengthsList}, serta sangat siap dipromosikan ke jenjang ${position}.`;
    } else if (rec === 'Dipertimbangkan') {
      return `${name} memiliki kapasitas potensial yang baik (pemenuhan kompetensi ${score}%${iqText ? ', ' + iqText : ''}) dan berorientasi pada hasil kerja. Memerlukan penguatan terstruktur pada pendelegasian tugas dan pembimbingan bawahan sebelum transisi ke jenjang ${position}.`;
    } else {
      return `${name} saat ini mencapai tingkat pemenuhan kompetensi ${score}%. Perlu fokus memperkuat pemahaman operasional mendasar dan efisiensi kerja di posisi saat ini sebelum mempertimbangkan promosi.`;
    }
  }, []);

  // Ideal Fokus Follow-up Generator (Strictly prioritizing authentic PDF assessment notes)
  const getIdealFollowUpText = useCallback((emp: Employee): string => {
    // 1. Prioritaskan catatan follow-up otentik dari dokumen PDF assessment
    if (emp.followUpNotes && emp.followUpNotes.trim().length > 0) {
      return emp.followUpNotes.trim();
    }
    if (emp.idp?.goals && emp.idp.goals.length > 0) {
      const topGoal = emp.idp.goals[0];
      if (topGoal.metrics || topGoal.managerNotes) {
        return `${topGoal.title} (${topGoal.competencyTarget}): ${topGoal.managerNotes || topGoal.metrics}`;
      }
    }
    const initial = initialReadingsRef.current[emp.id]?.followUpNotes;
    if (initial && initial.trim().length > 0) {
      return initial.trim();
    }
    const score = emp.overallScore || 0;
    const position = emp.evaluatedPosition || emp.position || 'posisi target';
    const rec = emp.recommendationCategory || (score >= 75 ? 'Dapat Disarankan' : score >= 65 ? 'Dipertimbangkan' : 'Tidak Disarankan');
    const weaknessesList = Array.isArray(emp.weaknesses) && emp.weaknesses.length > 0 
      ? emp.weaknesses.slice(0, 2).join(' & ')
      : (emp.developmentAreas || 'coaching & change management');

    if (rec === 'Dapat Disarankan') {
      return `Dapat dipromosikan / ditempatkan pada ${position} dengan dukungan program akselerasi IDP, mentoring kepemimpinan strategis, dan pendelegasian wewenang lintas divisi.`;
    } else if (rec === 'Dipertimbangkan') {
      return `Dapat dipertimbangkan dengan pendampingan intensif (close coaching) 3-6 bulan. Fokus IDP: penguatan pendelegasian tugas, decisive leadership, dan pengembangan kompetensi pada ${weaknessesList}.`;
    } else {
      return `Belum diprioritaskan untuk ${position}. Fokus IDP: perbaikan kinerja mendasar di peran saat ini, pelatihan teknis terstruktur, dan evaluasi berkala.`;
    }
  }, []);

  // Reset all custom overrides (Keterangan HR, Reading Singkat, Follow-up, Rekomendasi Program) back to authentic PDF assessment data
  const resetAllToAuthenticPdfData = useCallback(() => {
    setCustomRemarks({});
    setCustomNoteOverride(null);
    setCustomCollectivePrograms({});
    setCustomReadingOverrides({});
    setCustomFollowUpOverrides({});
    try {
      localStorage.removeItem('talentpulse_custom_hr_remarks_v1');
      localStorage.removeItem('talentpulse_custom_pattern_note_v1');
      localStorage.removeItem('talentpulse_custom_reading_overrides_v1');
      localStorage.removeItem('talentpulse_custom_followup_overrides_v1');
    } catch (_) {}
    employees.forEach(emp => {
      initialReadingsRef.current[emp.id] = {
        briefReading: emp.briefReading || emp.keyInsights || '',
        followUpNotes: emp.followUpNotes || ''
      };
    });
    setGeneralToast('Seluruh data analisa Executive Summary berhasil disinkronkan 100% sesuai berkas dokumen PDF asesmen.');
    setTimeout(() => setGeneralToast(null), 3500);
  }, [employees]);

  const resetAllCustomToIdeal = resetAllToAuthenticPdfData;

  const [isEditingRemarks, setIsEditingRemarks] = useState(false);

  // Save custom remarks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('talentpulse_custom_hr_remarks_v1', JSON.stringify(customRemarks));
    } catch (_) {}
  }, [customRemarks]);

  // Save custom pattern note override to localStorage
  useEffect(() => {
    try {
      if (customNoteOverride !== null) {
        localStorage.setItem('talentpulse_custom_pattern_note_v1', customNoteOverride);
      } else {
        localStorage.removeItem('talentpulse_custom_pattern_note_v1');
      }
    } catch (_) {}
  }, [customNoteOverride]);

  // Save custom reading overrides to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('talentpulse_custom_reading_overrides_v1', JSON.stringify(customReadingOverrides));
    } catch (_) {}
  }, [customReadingOverrides]);

  // Save custom follow-up overrides to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('talentpulse_custom_followup_overrides_v1', JSON.stringify(customFollowUpOverrides));
    } catch (_) {}
  }, [customFollowUpOverrides]);

  // Open AI Refinement modal for specific category remark
  const handleOpenRefineForCategory = (categoryKey: 'recommended' | 'considered' | 'notRecommended', categoryLabel: string) => {
    const currentText = customRemarks[categoryKey] !== undefined ? customRemarks[categoryKey]! : hrRemarks[categoryKey];
    setRefineModalText(currentText);
    setRefineModalContext('executive_summary');
    setRefineModalTitle(`Rapihkan Bahasa Keterangan HR - ${categoryLabel}`);
    setRefineApplyHandler(() => (refinedText: string) => {
      setCustomRemarks(prev => ({ ...prev, [categoryKey]: refinedText }));
      setGeneralToast(`Keterangan HR (${categoryLabel}) berhasil disempurnakan.`);
      setTimeout(() => setGeneralToast(null), 3000);
    });
    setIsRefineModalOpen(true);
  };

  // Open AI Refinement modal for Catatan Pola Utama
  const handleOpenRefineForPatternNote = () => {
    const currentText = customNoteOverride !== null ? customNoteOverride : synchronizedPattern.rawText;
    setRefineModalText(currentText);
    setRefineModalContext('catatan_pola');
    setRefineModalTitle('Rapihkan Bahasa Catatan Pola Utama');
    setRefineApplyHandler(() => (refinedText: string) => {
      setCustomNoteOverride(refinedText);
      setGeneralToast('Catatan Pola Utama berhasil disempurnakan.');
      setTimeout(() => setGeneralToast(null), 3000);
    });
    setIsRefineModalOpen(true);
  };

  // AI Language Refinement (Rapihkan Bahasa Gemini) States
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineModalText, setRefineModalText] = useState('');
  const [refineModalContext, setRefineModalContext] = useState<'executive_summary' | 'catatan_pola' | 'idp_goal' | 'manager_notes' | 'strengths_weaknesses'>('executive_summary');
  const [refineModalTitle, setRefineModalTitle] = useState('Rapihkan Bahasa (AI Gemini)');
  const [refineApplyHandler, setRefineApplyHandler] = useState<((text: string) => void) | null>(null);

  // Inline editing state for Reading Singkat (Table 3)
  const [editingReadingEmpId, setEditingReadingEmpId] = useState<string | null>(null);
  const [editingReadingText, setEditingReadingText] = useState<string>('');

  const handleStartEditReading = (emp: Employee) => {
    setEditingReadingEmpId(emp.id);
    const initialText = customReadingOverrides[emp.id] || emp.briefReading || emp.keyInsights || getIdealReadingText(emp);
    setEditingReadingText(initialText);
  };

  const handleCancelEditReading = () => {
    setEditingReadingEmpId(null);
    setEditingReadingText('');
  };

  const handleSaveEditReading = (emp: Employee) => {
    setCustomReadingOverrides(prev => {
      const next = { ...prev, [emp.id]: editingReadingText };
      try {
        localStorage.setItem('talentpulse_custom_reading_overrides_v1', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    initialReadingsRef.current[emp.id] = {
      ...initialReadingsRef.current[emp.id],
      briefReading: editingReadingText
    };
    if (onUpdateEmployee) {
      const updated: Employee = {
        ...emp,
        briefReading: editingReadingText,
        keyInsights: editingReadingText
      };
      onUpdateEmployee(updated);
      setGeneralToast(`Reading Singkat untuk ${emp.name} berhasil disimpan.`);
      setTimeout(() => setGeneralToast(null), 3000);
    }
    setEditingReadingEmpId(null);
    setEditingReadingText('');
  };

  const handleRefineReadingWithAI = (emp: Employee, currentDraft?: string) => {
    const textToRefine = currentDraft !== undefined ? currentDraft : (customReadingOverrides[emp.id] || emp.briefReading || emp.keyInsights || getIdealReadingText(emp));
    setRefineModalText(textToRefine);
    setRefineModalContext('executive_summary');
    setRefineModalTitle(`Rapihkan Reading Singkat - ${emp.name}`);
    setRefineApplyHandler(() => (refinedText: string) => {
      if (editingReadingEmpId === emp.id) {
        setEditingReadingText(refinedText);
      } else {
        setCustomReadingOverrides(prev => {
          const next = { ...prev, [emp.id]: refinedText };
          try {
            localStorage.setItem('talentpulse_custom_reading_overrides_v1', JSON.stringify(next));
          } catch (_) {}
          return next;
        });
        initialReadingsRef.current[emp.id] = {
          ...initialReadingsRef.current[emp.id],
          briefReading: refinedText
        };
        if (onUpdateEmployee) {
          const updated: Employee = {
            ...emp,
            briefReading: refinedText,
            keyInsights: refinedText
          };
          onUpdateEmployee(updated);
        }
      }
      setGeneralToast(`Reading Singkat untuk ${emp.name} berhasil dirapikan dengan AI.`);
      setTimeout(() => setGeneralToast(null), 3000);
    });
    setIsRefineModalOpen(true);
  };

  // Inline editing state for Keterangan Lain / Fokus Follow-up (Table 4)
  const [editingFollowUpEmpId, setEditingFollowUpEmpId] = useState<string | null>(null);
  const [editingFollowUpText, setEditingFollowUpText] = useState<string>('');

  // Inline editing state for Rekomendasi Program (Table 5 / Collective Development)
  const [customCollectivePrograms, setCustomCollectivePrograms] = useState<{ [key: string]: string }>({});
  const [editingCollectiveKey, setEditingCollectiveKey] = useState<string | null>(null);
  const [editingCollectiveProgramText, setEditingCollectiveProgramText] = useState<string>('');

  const handleStartEditCollectiveProgram = (item: { key: string; recommendedProgram?: string; program?: string }) => {
    setEditingCollectiveKey(item.key);
    setEditingCollectiveProgramText(customCollectivePrograms[item.key] || item.recommendedProgram || item.program || '');
  };

  const handleCancelEditCollectiveProgram = () => {
    setEditingCollectiveKey(null);
    setEditingCollectiveProgramText('');
  };

  const handleSaveEditCollectiveProgram = (itemKey: string) => {
    setCustomCollectivePrograms(prev => ({
      ...prev,
      [itemKey]: editingCollectiveProgramText
    }));
    setGeneralToast('Rekomendasi program pengembangan kolektif berhasil disimpan.');
    setTimeout(() => setGeneralToast(null), 3000);
    setEditingCollectiveKey(null);
    setEditingCollectiveProgramText('');
  };

  const handleRefineCollectiveProgramWithAI = (item: { key: string; recommendedProgram?: string; program?: string; name: string }, currentDraft?: string) => {
    const textToRefine = currentDraft !== undefined ? currentDraft : (customCollectivePrograms[item.key] || item.recommendedProgram || item.program || '');
    setRefineModalText(textToRefine);
    setRefineModalContext('executive_summary');
    setRefineModalTitle(`Rapihkan Rekomendasi Program - ${item.name}`);
    setRefineApplyHandler(() => (refinedText: string) => {
      if (editingCollectiveKey === item.key) {
        setEditingCollectiveProgramText(refinedText);
      } else {
        setCustomCollectivePrograms(prev => ({
          ...prev,
          [item.key]: refinedText
        }));
      }
      setGeneralToast(`Rekomendasi program untuk ${item.name} berhasil dirapikan dengan AI.`);
      setTimeout(() => setGeneralToast(null), 3000);
    });
    setIsRefineModalOpen(true);
  };

  const getDefaultFollowUpText = (emp: Employee): string => {
    return customFollowUpOverrides[emp.id] || getIdealFollowUpText(emp);
  };

  const handleStartEditFollowUp = (emp: Employee) => {
    setEditingFollowUpEmpId(emp.id);
    const initialText = customFollowUpOverrides[emp.id] || emp.followUpNotes || getIdealFollowUpText(emp);
    setEditingFollowUpText(initialText);
  };

  const handleCancelEditFollowUp = () => {
    setEditingFollowUpEmpId(null);
    setEditingFollowUpText('');
  };

  const handleSaveEditFollowUp = (emp: Employee) => {
    setCustomFollowUpOverrides(prev => {
      const next = { ...prev, [emp.id]: editingFollowUpText };
      try {
        localStorage.setItem('talentpulse_custom_followup_overrides_v1', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    initialReadingsRef.current[emp.id] = {
      ...initialReadingsRef.current[emp.id],
      followUpNotes: editingFollowUpText
    };
    if (onUpdateEmployee) {
      const updated: Employee = {
        ...emp,
        followUpNotes: editingFollowUpText
      };
      onUpdateEmployee(updated);
      setGeneralToast(`Catatan Fokus Follow-up untuk ${emp.name} berhasil disimpan.`);
      setTimeout(() => setGeneralToast(null), 3000);
    }
    setEditingFollowUpEmpId(null);
    setEditingFollowUpText('');
  };

  const handleRefineFollowUpWithAI = (emp: Employee, currentDraft?: string) => {
    const textToRefine = currentDraft !== undefined ? currentDraft : getDefaultFollowUpText(emp);
    setRefineModalText(textToRefine);
    setRefineModalContext('executive_summary');
    setRefineModalTitle(`Rapihkan Catatan Follow-up - ${emp.name}`);
    setRefineApplyHandler(() => (refinedText: string) => {
      if (editingFollowUpEmpId === emp.id) {
        setEditingFollowUpText(refinedText);
      } else {
        setCustomFollowUpOverrides(prev => {
          const next = { ...prev, [emp.id]: refinedText };
          try {
            localStorage.setItem('talentpulse_custom_followup_overrides_v1', JSON.stringify(next));
          } catch (_) {}
          return next;
        });
        initialReadingsRef.current[emp.id] = {
          ...initialReadingsRef.current[emp.id],
          followUpNotes: refinedText
        };
        if (onUpdateEmployee) {
          const updated: Employee = {
            ...emp,
            followUpNotes: refinedText
          };
          onUpdateEmployee(updated);
        }
      }
      setGeneralToast(`Catatan Follow-up untuk ${emp.name} berhasil dirapikan dengan AI.`);
      setTimeout(() => setGeneralToast(null), 3000);
    });
    setIsRefineModalOpen(true);
  };

  // Division Management States
  const [isDivisionModalOpen, setIsDivisionModalOpen] = useState(false);
  const [modalInitialDeptMap, setModalInitialDeptMap] = useState<{ [id: string]: string }>({});
  const [inlineEditingEmpId, setInlineEditingEmpId] = useState<string | null>(null);
  const [inlineEditingDivision, setInlineEditingDivision] = useState<string>('');
  const [divisionToast, setDivisionToast] = useState<string | null>(null);
  const [divisionModalSearch, setDivisionModalSearch] = useState('');
  const [divisionModalFilter, setDivisionModalFilter] = useState('ALL');
  const [selectedDivisionEmpIds, setSelectedDivisionEmpIds] = useState<string[]>([]);
  const [bulkDivisionInput, setBulkDivisionInput] = useState('');
  const [customDivisionInputs, setCustomDivisionInputs] = useState<{ [id: string]: string }>({});
  const [savedRowFeedbacks, setSavedRowFeedbacks] = useState<{ [id: string]: boolean }>({});
  const [modalFeedbackBanner, setModalFeedbackBanner] = useState<string | null>(null);

  // Quick Competency Score Inline Calibration State
  const [editingScoreCell, setEditingScoreCell] = useState<{ empId: string; itemName: string } | null>(null);

  const handleQuickChangeCompetencyScore = (emp: Employee, itemName: string, newScore: number) => {
    const currentScores = emp.competencyMatrixScores || {};
    const updatedScores = {
      ...currentScores,
      [itemName]: newScore
    };
    const updatedEmp: Employee = {
      ...emp,
      competencyMatrixScores: updatedScores
    };

    if (onUpdateEmployee) {
      onUpdateEmployee(updatedEmp);
    }
    setGeneralToast(`Skor "${itemName}" untuk ${emp.name} diperbarui menjadi ${newScore}.`);
    setTimeout(() => setGeneralToast(null), 2500);
    setEditingScoreCell(null);
  };

  // Track how many division edits are pending commit
  const pendingChangesCount = useMemo(() => {
    return employees.filter(emp => {
      const val = customDivisionInputs[emp.id];
      if (val === undefined) return false;
      const clean = val.trim() || 'Umum';
      return clean !== (emp.department || '').trim();
    }).length;
  }, [employees, customDivisionInputs]);

  // List of unique divisions and standard suggestions
  const distinctDivisions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  const commonDivisionSuggestions = useMemo(() => {
    const defaultList = [
      'Teknologi Informasi',
      'Keuangan & Akuntansi',
      'Human Capital / SDM',
      'Operasional & Logistik',
      'Pemasaran & Penjualan',
      'Legal & Kepatuhan',
      'Business Development',
      'Direksi & Manajemen Strategis',
      'Audit Internal',
      'Customer Relations'
    ];
    const combined = new Set([...distinctDivisions, ...defaultList]);
    return Array.from(combined);
  }, [distinctDivisions]);

  // Open Full Division Modal with stable snapshot
  const handleOpenDivisionModal = () => {
    const initialMap: { [id: string]: string } = {};
    employees.forEach(e => {
      initialMap[e.id] = (e.department || '').trim();
    });
    setModalInitialDeptMap(initialMap);
    setCustomDivisionInputs(initialMap);
    setSavedRowFeedbacks({});
    setModalFeedbackBanner(null);
    setSelectedDivisionEmpIds([]);
    setBulkDivisionInput('');
    setDivisionModalSearch('');
    setDivisionModalFilter('ALL');
    setIsDivisionModalOpen(true);
  };

  // Handler: Save Division for single employee (In modal session: saves in-place directly and gives instant feedback)
  const handleSaveDivisionInModal = (empId: string, newDept: string) => {
    const cleanDept = newDept.trim() || 'Umum';
    setCustomDivisionInputs(prev => ({ ...prev, [empId]: cleanDept }));
    setModalInitialDeptMap(prev => ({ ...prev, [empId]: cleanDept }));
    setSavedRowFeedbacks(prev => ({ ...prev, [empId]: true }));

    const targetEmp = employees.find(e => e.id === empId);
    if (targetEmp && (targetEmp.department || '').trim() !== cleanDept) {
      const updatedEmp: Employee = {
        ...targetEmp,
        department: cleanDept,
        targetDepartment: (!targetEmp.targetDepartment || targetEmp.targetDepartment.trim() === (targetEmp.department || '').trim())
          ? cleanDept
          : targetEmp.targetDepartment
      };
      if (onBatchUpdateEmployees) {
        onBatchUpdateEmployees([updatedEmp]);
      } else if (onUpdateEmployee) {
        onUpdateEmployee(updatedEmp);
      }
    }

    setTimeout(() => {
      setSavedRowFeedbacks(prev => ({ ...prev, [empId]: false }));
    }, 2500);
  };

  // Handler: Save Division for inline document card (direct apply)
  const handleSaveDivisionDirect = (empId: string, newDept: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;
    const cleanDept = newDept.trim() || 'Umum';
    const updatedEmp: Employee = {
      ...targetEmp,
      department: cleanDept,
      targetDepartment: (!targetEmp.targetDepartment || targetEmp.targetDepartment.trim() === (targetEmp.department || '').trim())
        ? cleanDept
        : targetEmp.targetDepartment
    };
    if (onBatchUpdateEmployees) {
      onBatchUpdateEmployees([updatedEmp]);
    } else if (onUpdateEmployee) {
      onUpdateEmployee(updatedEmp);
    }
    setDivisionToast(`Divisi ${targetEmp.name} berhasil disimpan ke "${cleanDept}"`);
    setTimeout(() => setDivisionToast(null), 3000);
    setInlineEditingEmpId(null);
  };

  // Handler: Bulk Save Division in modal
  const handleBulkSaveDivisionInModal = (newDept: string) => {
    const cleanDept = newDept.trim() || 'Umum';
    if (!cleanDept || selectedDivisionEmpIds.length === 0) return;

    const updatedMap: { [id: string]: string } = {};
    const feedbackMap: { [id: string]: boolean } = {};
    const employeesToUpdate: Employee[] = [];

    selectedDivisionEmpIds.forEach(id => {
      updatedMap[id] = cleanDept;
      feedbackMap[id] = true;
      const targetEmp = employees.find(e => e.id === id);
      if (targetEmp) {
        employeesToUpdate.push({
          ...targetEmp,
          department: cleanDept,
          targetDepartment: (!targetEmp.targetDepartment || targetEmp.targetDepartment.trim() === (targetEmp.department || '').trim())
            ? cleanDept
            : targetEmp.targetDepartment
        });
      }
    });

    setCustomDivisionInputs(prev => ({ ...prev, ...updatedMap }));
    setModalInitialDeptMap(prev => ({ ...prev, ...updatedMap }));
    setSavedRowFeedbacks(prev => ({ ...prev, ...feedbackMap }));

    // Apply batch update immediately so state and server are in sync
    if (employeesToUpdate.length > 0) {
      if (onBatchUpdateEmployees) {
        onBatchUpdateEmployees(employeesToUpdate);
      } else if (onUpdateEmployee) {
        employeesToUpdate.forEach(emp => onUpdateEmployee(emp));
      }
    }

    setTimeout(() => {
      setSavedRowFeedbacks(prev => {
        const next = { ...prev };
        selectedDivisionEmpIds.forEach(id => {
          next[id] = false;
        });
        return next;
      });
    }, 3000);

    setModalFeedbackBanner(`Divisi untuk ${selectedDivisionEmpIds.length} karyawan terpilih berhasil disimpan ke "${cleanDept}".`);
    setTimeout(() => setModalFeedbackBanner(null), 4000);
    setSelectedDivisionEmpIds([]);
    setBulkDivisionInput('');
  };

  // Handler: Finalize and commit all modified divisions on "Selesai"
  const handleFinishDivisionModal = () => {
    const employeesToUpdate: Employee[] = [];

    employees.forEach(emp => {
      const customVal = customDivisionInputs[emp.id];
      if (customVal !== undefined) {
        const cleanDept = customVal.trim() || 'Umum';
        const currentDept = (emp.department || '').trim();
        if (cleanDept !== currentDept) {
          employeesToUpdate.push({
            ...emp,
            department: cleanDept,
            targetDepartment: (!emp.targetDepartment || emp.targetDepartment.trim() === currentDept)
              ? cleanDept
              : emp.targetDepartment
          });
        }
      }
    });

    if (employeesToUpdate.length > 0) {
      if (onBatchUpdateEmployees) {
        onBatchUpdateEmployees(employeesToUpdate);
      } else if (onUpdateEmployee) {
        employeesToUpdate.forEach(emp => onUpdateEmployee(emp));
      }
      setDivisionToast(`Perubahan divisi untuk ${employeesToUpdate.length} karyawan berhasil disimpan.`);
    } else {
      setDivisionToast('Divisi karyawan sudah mutakhir dan tersimpan.');
    }
    setTimeout(() => setDivisionToast(null), 3500);
    setIsDivisionModalOpen(false);
  };

  // Interactive controls for Collective Development Priority table
  const [expandedPriorityKey, setExpandedPriorityKey] = useState<string | null>(null);
  const [showAllPriorities, setShowAllPriorities] = useState<boolean>(false);

  // Dynamic Collective Development Priorities analyzed from displayed employees
  const collectiveDevelopmentList = useMemo(() => {
    const totalEmployees = displayedEmployees.length;
    if (totalEmployees === 0) return [];

    // Flat list of all matrix items from 14-competency standard assessment matrix
    const allMatrixItems = COMPETENCY_SCORE_MATRIX.flatMap(g => g.items);

    // Catalog of known assessment competency development areas with official impacts and recommended programs
    const CATALOG: Array<{
      key: string;
      displayName: string;
      matrixItemName: string;
      matchers: string[];
      impact: string;
      program: string;
    }> = [
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
    ];

    // For custom or unexpected competencies from newly uploaded PDFs
    const customFoundMap: Record<string, {
      name: string;
      employees: Array<{ id: string; name: string; position: string; department: string }>;
    }> = {};

    // Map each catalog item to affected employees based strictly on resolved competency score (<= 2 is Under Standard / Gap)
    const catalogResults = CATALOG.map(item => {
      const matrixItem = allMatrixItems.find(m => m.name.toLowerCase() === item.matrixItemName.toLowerCase());
      const affectedEmployees: Array<{ id: string; name: string; position: string; department: string }> = [];

      displayedEmployees.forEach(emp => {
        let isNeedDev = false;
        if (matrixItem) {
          const score = resolveEmployeeCompetencyScore(emp, matrixItem);
          // Score 1 or 2 represents below standard / gap requiring development
          if (score <= 2) {
            isNeedDev = true;
          }
        }
        if (!isNeedDev && item.matchers) {
          const hasInList = emp.competenciesToDevelop && emp.competenciesToDevelop.some(c => item.matchers.some(m => c.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.toLowerCase())));
          const hasInDev = emp.developmentAreas && item.matchers.some(m => emp.developmentAreas!.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(emp.developmentAreas!.toLowerCase()));
          const hasInWeak = emp.weaknesses && emp.weaknesses.some(w => item.matchers.some(m => w.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(w.toLowerCase())));
          const hasLowCustom = emp.customCompetencies && emp.customCompetencies.some(c => c.score < 3.0 && item.matchers.some(m => c.name.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(c.name.toLowerCase())));
          if (hasInList || hasInDev || hasInWeak || hasLowCustom) isNeedDev = true;
        }

        if (isNeedDev) {
          affectedEmployees.push({
            id: emp.id,
            name: emp.name,
            position: emp.position,
            department: emp.department
          });
        }
      });

      return {
        key: item.key,
        name: item.displayName,
        count: affectedEmployees.length,
        total: totalEmployees,
        frequencyText: `${affectedEmployees.length} dari ${totalEmployees}`,
        percentage: totalEmployees > 0 ? Math.round((affectedEmployees.length / totalEmployees) * 100) : 0,
        impact: item.impact,
        recommendedProgram: item.program,
        affectedEmployees
      };
    });

    // Also look for unmapped custom competencies from uploaded files
    displayedEmployees.forEach(emp => {
      if (emp.competenciesToDevelop && Array.isArray(emp.competenciesToDevelop)) {
        emp.competenciesToDevelop.forEach(customComp => {
          const trimmed = customComp.trim();
          if (!trimmed) return;
          
          // Check if already matched by any catalog item
          const isCovered = CATALOG.some(cat => 
            cat.matchers.some(m => trimmed.toLowerCase().includes(m.toLowerCase()))
          );

          if (!isCovered) {
            const lowKey = trimmed.toLowerCase();
            if (!customFoundMap[lowKey]) {
              customFoundMap[lowKey] = {
                name: trimmed,
                employees: []
              };
            }
            if (!customFoundMap[lowKey].employees.some(e => e.id === emp.id)) {
              customFoundMap[lowKey].employees.push({
                id: emp.id,
                name: emp.name,
                position: emp.position,
                department: emp.department
              });
            }
          }
        });
      }
    });

    // Transform custom competencies
    const customResults = Object.values(customFoundMap).map(custom => ({
      key: custom.name.toLowerCase().replace(/\s+/g, '-'),
      name: custom.name,
      count: custom.employees.length,
      total: totalEmployees,
      frequencyText: `${custom.employees.length} dari ${totalEmployees}`,
      percentage: totalEmployees > 0 ? Math.round((custom.employees.length / totalEmployees) * 100) : 0,
      impact: `Risiko kesenjangan operasional pada ${custom.name} yang berdampak pada pencapaian target dan efektivitas tim.`,
      recommendedProgram: `Program pelatihan terstruktur & coaching berkala untuk penguatan kompetensi ${custom.name}.`,
      affectedEmployees: custom.employees
    }));

    // Merge and filter items with count > 0, sorted by frequency count descending
    const combined = [...catalogResults, ...customResults]
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    return combined.map(item => ({
      ...item,
      recommendedProgram: customCollectivePrograms[item.key] || item.recommendedProgram,
      program: customCollectivePrograms[item.key] || item.recommendedProgram
    }));
  }, [displayedEmployees, customCollectivePrograms]);

  // Group displayed employees into 3 standard assessment recommendation categories
  const categorized = useMemo(() => {
    const recommended: Employee[] = [];
    const considered: Employee[] = [];
    const notRecommended: Employee[] = [];

    displayedEmployees.forEach(emp => {
      // If employee already has an explicit recommendationCategory
      if (emp.recommendationCategory === 'Dapat Disarankan') {
        recommended.push(emp);
      } else if (emp.recommendationCategory === 'Dipertimbangkan') {
        considered.push(emp);
      } else if (emp.recommendationCategory === 'Tidak Disarankan') {
        notRecommended.push(emp);
      } else {
        // Derive intelligently based on talentBox / overallScore / performance & potential
        const isHigh = 
          emp.talentBox?.includes('Bintang') || 
          emp.talentBox?.includes('Star') || 
          emp.talentBox?.includes('Potensial Tinggi') || 
          emp.talentBox?.includes('Kinerja Tinggi') ||
          emp.overallScore >= 80;

        const isMid = 
          emp.talentBox?.includes('Kontributor') || 
          emp.talentBox?.includes('Pemain Utama') || 
          emp.talentBox?.includes('Professional') || 
          emp.talentBox?.includes('Efektif') ||
          (emp.overallScore >= 68 && emp.overallScore < 80);

        if (isHigh) {
          recommended.push(emp);
        } else if (isMid) {
          considered.push(emp);
        } else {
          notRecommended.push(emp);
        }
      }
    });

    return {
      recommended,
      considered,
      notRecommended
    };
  }, [displayedEmployees]);

  // Statistical Gap Analysis Across Displayed Employees
  const gapAnalysis = useMemo(() => {
    if (displayedEmployees.length === 0) {
      return {
        gapStats: [] as CompetencyGapStat[],
        topGaps: [] as CompetencyGapStat[],
        theme: 'Leadership & Strategic Development'
      };
    }

    // Check if customCompetencies exist on employees
    const hasCustomCompetencies = displayedEmployees.some(e => e.customCompetencies && e.customCompetencies.length > 0);

    let stats: CompetencyGapStat[] = [];

    if (hasCustomCompetencies) {
      // Aggregate custom competencies by name
      const compMap: Record<string, { totalScore: number; count: number; belowCount: number }> = {};
      displayedEmployees.forEach(emp => {
        if (emp.customCompetencies) {
          emp.customCompetencies.forEach(c => {
            if (!compMap[c.name]) {
              compMap[c.name] = { totalScore: 0, count: 0, belowCount: 0 };
            }
            compMap[c.name].totalScore += c.score;
            compMap[c.name].count += 1;
            if (c.score < 4.0) {
              compMap[c.name].belowCount += 1;
            }
          });
        }
      });

      stats = Object.entries(compMap).map(([name, data]) => {
        const avg = data.count > 0 ? Number((data.totalScore / data.count).toFixed(2)) : 0;
        const gap = Number((4.0 - avg).toFixed(2));
        const belowTargetPercent = data.count > 0 ? Math.round((data.belowCount / data.count) * 100) : 0;
        return {
          key: name,
          label: name,
          avgScore: avg,
          gap,
          belowTargetCount: data.belowCount,
          belowTargetPercent
        };
      });
    }

    // If no custom competencies or empty, calculate standard 8 definitions
    if (stats.length === 0) {
      stats = COMPETENCY_DEFINITIONS.map(def => {
        let total = 0;
        let below = 0;
        displayedEmployees.forEach(emp => {
          const score = emp.competencies[def.key] || 0;
          total += score;
          if (score < 4.0) below += 1;
        });
        const avg = displayedEmployees.length > 0 ? Number((total / displayedEmployees.length).toFixed(2)) : 0;
        const gap = Number((4.0 - avg).toFixed(2));
        const belowTargetPercent = displayedEmployees.length > 0 ? Math.round((below / displayedEmployees.length) * 100) : 0;
        return {
          key: def.key,
          label: def.label,
          avgScore: avg,
          gap,
          belowTargetCount: below,
          belowTargetPercent
        };
      });
    }

    // Sort by largest gap (or lowest score / highest % below target)
    stats.sort((a, b) => b.gap - a.gap);

    // Top dominant gaps (positive gap means below 4.0 benchmark)
    const topGaps = stats.slice(0, 3);

    // Determine high-level development theme
    let theme = 'leadership maturity';
    const topKeys = topGaps.map(g => g.label.toLowerCase()).join(' ');
    if (topKeys.includes('bimbing') || topKeys.includes('bawahan') || topKeys.includes('leadership') || topKeys.includes('pimpin')) {
      theme = 'leadership maturity & people coaching';
    } else if (topKeys.includes('strategis') || topKeys.includes('visi') || topKeys.includes('bisnis')) {
      theme = 'strategic business alignment';
    } else if (topKeys.includes('adaptasi') || topKeys.includes('ubah') || topKeys.includes('change')) {
      theme = 'change agility & adaptive execution';
    } else if (topKeys.includes('solusi') || topKeys.includes('analisis') || topKeys.includes('problem')) {
      theme = 'critical problem solving & decision rigor';
    }

    return {
      gapStats: stats,
      topGaps,
      theme
    };
  }, [displayedEmployees]);

  // Generate automated dynamic analytical summary for "Keterangan HR" for each category
  const hrRemarks = useMemo(() => {
    if (displayedEmployees.length === 0) {
      return {
        recommended: customRemarks.recommended || '-',
        considered: customRemarks.considered || '-',
        notRecommended: customRemarks.notRecommended || '-',
        autoRecommended: '-',
        autoConsidered: '-',
        autoNotRecommended: '-',
      };
    }

    // 1. Dapat Disarankan
    let recRemark = '';
    if (categorized.recommended.length === 0) {
      recRemark = 'Saat ini belum ada kandidat yang memenuhi kriteria kesiapan penuh (skor >= 75%); seluruh peserta berada dalam proses akselerasi pengembangan kompetensi.';
    } else {
      const avgScore = Math.round(
        categorized.recommended.reduce((acc, e) => acc + e.overallScore, 0) / categorized.recommended.length
      );
      const avgIQ = categorized.recommended.filter(e => e.iqScore).length > 0
        ? Math.round(categorized.recommended.reduce((acc, e) => acc + (e.iqScore || 0), 0) / categorized.recommended.filter(e => e.iqScore).length)
        : null;
      
      const iqText = avgIQ ? ` serta kapasitas daya pikir prima (IQ rerata ${avgIQ})` : '';
      recRemark = `Kandidat menunjukkan penguasaan kompetensi yang solid (rerata pemenuhan ${avgScore}%)${iqText}. Siap masuk dalam antrean promosi jabatan dengan dukungan program akselerasi IDP.`;
    }

    // 2. Dipertimbangkan
    let consRemark = '';
    if (categorized.considered.length === 0) {
      consRemark = 'Tidak ada kandidat pada kategori dipertimbangkan.';
    } else {
      const avgScore = Math.round(
        categorized.considered.reduce((acc, e) => acc + e.overallScore, 0) / categorized.considered.length
      );
      const dominantGapsInCons = collectiveDevelopmentList.length >= 2
        ? `${collectiveDevelopmentList[0].name.replace(/&/g, 'dan')} dan ${collectiveDevelopmentList[1].name.replace(/&/g, 'dan')}`
        : (gapAnalysis.topGaps.slice(0, 2).map(g => g.label.replace(/&/g, 'dan')).join(' dan ') || 'Membimbing dan Mengembangkan Bawahan dan Menerima dan Melakukan Perubahan');
      consRemark = `Kandidat memiliki potensi berkembang yang baik (rerata pemenuhan ${avgScore}%), namun masih memerlukan bimbingan terarah pada ${dominantGapsInCons || 'kompetensi kepemimpinan'}. Dapat dipertimbangkan dengan program pendampingan (coaching) intensif.`;
    }

    // 3. Tidak Disarankan
    let notRecRemark = '';
    if (categorized.notRecommended.length === 0) {
      notRecRemark = 'Seluruh peserta asesmen memenuhi ambang batas minimal untuk dipertimbangkan atau disarankan ke tahap pengembangan selanjutnya.';
    } else {
      const avgScore = Math.round(
        categorized.notRecommended.reduce((acc, e) => acc + e.overallScore, 0) / categorized.notRecommended.length
      );
      notRecRemark = `Saat ini masih terdapat kesenjangan kompetensi yang cukup besar (rerata ${avgScore}%); belum diprioritaskan untuk promosi jabatan. Disarankan fokus memperkuat kompetensi di peran saat ini dengan evaluasi berkala.`;
    }

    return {
      recommended: customRemarks.recommended || recRemark,
      considered: customRemarks.considered || consRemark,
      notRecommended: customRemarks.notRecommended || notRecRemark,
      autoRecommended: recRemark,
      autoConsidered: consRemark,
      autoNotRecommended: notRecRemark,
    };
  }, [displayedEmployees.length, categorized, gapAnalysis, customRemarks, collectiveDevelopmentList]);

  // Synchronized Dynamic Note for "Catatan pola utama" derived from Table 1 & Table 4 findings
  const synchronizedPattern = useMemo(() => {
    if (displayedEmployees.length === 0) {
      return {
        isEmpty: true,
        rawText: '-',
        item1: null,
        item2: null,
        item3: null,
        theme: ''
      };
    }

    const formatCompLabel = (name: string) => {
      const low = name.toLowerCase();
      if (low.includes('membimbing') || low.includes('bimbing') || low.includes('coaching') || low.includes('bawahan')) {
        return 'kemampuan membimbing dan mengembangkan bawahan';
      }
      if (low.includes('perubahan') || low.includes('change')) {
        return 'kesiapan menghadapi/mendorong perubahan';
      }
      if (low.includes('keputusan') || low.includes('decision')) {
        return 'ketegasan pengambilan keputusan';
      }
      if (low.includes('delegasi') || low.includes('workload')) {
        return 'pendelegasian tugas dan distribusi beban kerja';
      }
      if (low.includes('koordinasi') || low.includes('kolaborasi')) {
        return 'koordinasi dan kolaborasi antar tim';
      }
      if (low.includes('strategi') || low.includes('strategic')) {
        return 'orientasi perencanaan strategi';
      }
      if (low.includes('analisa') || low.includes('analytical')) {
        return 'kemampuan analisa dan pemecahan masalah';
      }
      return name.toLowerCase();
    };

    // Use top items from Table 4 (collectiveDevelopmentList) first
    const topFromCollective = collectiveDevelopmentList.slice(0, 3);
    
    let item1 = '';
    let item2 = '';
    let item3 = '';

    if (topFromCollective.length > 0) {
      item1 = formatCompLabel(topFromCollective[0].name);
      if (topFromCollective[1]) item2 = formatCompLabel(topFromCollective[1].name);
      if (topFromCollective[2]) item3 = formatCompLabel(topFromCollective[2].name);
    } else if (gapAnalysis.topGaps.length > 0) {
      item1 = formatCompLabel(gapAnalysis.topGaps[0].label);
      if (gapAnalysis.topGaps[1]) item2 = formatCompLabel(gapAnalysis.topGaps[1].label);
      if (gapAnalysis.topGaps[2]) item3 = formatCompLabel(gapAnalysis.topGaps[2].label);
    }

    if (!item1) {
      return {
        isEmpty: true,
        rawText: '-',
        item1: null,
        item2: null,
        item3: null,
        theme: ''
      };
    }

    // Determine strategic theme
    const combinedLabels = `${item1} ${item2} ${item3}`.toLowerCase();
    let theme = 'Leadership & Strategic Development';
    if (combinedLabels.includes('analisa') || combinedLabels.includes('kualitas') || combinedLabels.includes('masalah')) {
      theme = 'Analytical Rigor & Operational Problem Solving';
    } else if (combinedLabels.includes('koordinasi') || combinedLabels.includes('komunikasi')) {
      theme = 'Cross-Functional Collaboration & Team Alignment';
    } else {
      theme = 'Leadership & Strategic Development';
    }

    let raw = `Sebagian besar kandidat memiliki komitmen dan eksekusi tugas harian yang solid. Namun, area yang paling membutuhkan bimbingan bersama adalah ${item1}`;
    if (item2) raw += `, ${item2}`;
    if (item3) raw += `, serta ${item3}`;
    raw += `. Hal ini menunjukkan prioritas pengembangan tim perlu difokuskan pada penguatan ${theme}, bukan hanya kemampuan operasional teknis semata.`;

    return {
      isEmpty: false,
      rawText: raw,
      item1,
      item2: item2 || null,
      item3: item3 || null,
      theme
    };
  }, [displayedEmployees.length, collectiveDevelopmentList, gapAnalysis]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      const patternText = customNoteOverride !== null 
        ? customNoteOverride 
        : synchronizedPattern.rawText;

      exportExecutiveSummaryPdf(displayedEmployees, {
        customRemarks: {
          recommended: hrRemarks.recommended,
          considered: hrRemarks.considered,
          notRecommended: hrRemarks.notRecommended,
        },
        patternNote: displayedEmployees.length === 0 ? '' : patternText,
        collectiveDevelopmentList
      });
    } catch (error) {
      console.error('Failed to export executive summary PDF:', error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handler when applying full AI refinement across executive summary and all tables
  const handleApplyFullExecutiveRefinement = (
    refinedPattern: string,
    refinedRemarks: { recommended: string; considered: string; notRecommended: string },
    refinedEmployees: FullExecutiveRefinementResult['refinedEmployees']
  ) => {
    setCustomNoteOverride(refinedPattern);
    setCustomRemarks(refinedRemarks);

    try {
      localStorage.setItem('talentpulse_custom_pattern_note_v1', refinedPattern);
      localStorage.setItem('talentpulse_custom_hr_remarks_v1', JSON.stringify(refinedRemarks));
    } catch (_) {}

    const newReadingOverrides: { [id: string]: string } = {};
    const newFollowUpOverrides: { [id: string]: string } = {};
    const updatedEmployeesList: Employee[] = [];

    if (refinedEmployees && refinedEmployees.length > 0) {
      refinedEmployees.forEach(draft => {
        const target = employees.find(e => e.id === draft.id);
        if (target) {
          const updatedEmp: Employee = {
            ...target,
            briefReading: draft.briefReading || target.briefReading,
            keyInsights: draft.keyInsights || draft.briefReading || target.keyInsights,
            strengths: draft.strengths && draft.strengths.length > 0 ? draft.strengths : target.strengths,
            weaknesses: draft.weaknesses && draft.weaknesses.length > 0 ? draft.weaknesses : target.weaknesses,
            mainStrengths: draft.mainStrengths || target.mainStrengths,
            developmentAreas: draft.developmentAreas || target.developmentAreas,
            followUpNotes: draft.followUpNotes || target.followUpNotes
          };
          updatedEmployeesList.push(updatedEmp);

          if (draft.briefReading) {
            newReadingOverrides[draft.id] = draft.briefReading;
          }
          if (draft.followUpNotes) {
            newFollowUpOverrides[draft.id] = draft.followUpNotes;
          }

          initialReadingsRef.current[draft.id] = {
            briefReading: draft.briefReading || target.briefReading || '',
            followUpNotes: draft.followUpNotes || target.followUpNotes || ''
          };
        }
      });
    }

    if (Object.keys(newReadingOverrides).length > 0) {
      setCustomReadingOverrides(prev => {
        const next = { ...prev, ...newReadingOverrides };
        try {
          localStorage.setItem('talentpulse_custom_reading_overrides_v1', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }

    if (Object.keys(newFollowUpOverrides).length > 0) {
      setCustomFollowUpOverrides(prev => {
        const next = { ...prev, ...newFollowUpOverrides };
        try {
          localStorage.setItem('talentpulse_custom_followup_overrides_v1', JSON.stringify(next));
        } catch (_) {}
        return next;
      });
    }

    if (updatedEmployeesList.length > 0) {
      if (onBatchUpdateEmployees) {
        onBatchUpdateEmployees(updatedEmployeesList);
      } else if (onUpdateEmployee) {
        updatedEmployeesList.forEach(emp => onUpdateEmployee(emp));
      }
    }

    setGeneralToast('Seluruh hasil analisa Executive Summary dan Tabel Karyawan berhasil dirapihkan dengan AI Gemini & tersimpan permanen!');
    setTimeout(() => setGeneralToast(null), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 transition-all">
      {/* Toast Notification */}
      {generalToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-500/40 flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{generalToast}</span>
        </div>
      )}

      {/* Top Header Controls (Print / Document Actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#e9f2f8] text-[#1a4b77] border border-blue-200 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-[#1b4d79]" />
            <span>Laporan Resmi Rekapitulasi Assessment</span>
          </span>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            Ref: DOC-EXEC-SUMMARY-2026
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit Divisi Button */}
          <button
            onClick={handleOpenDivisionModal}
            className="px-3 py-1.5 rounded-lg border border-teal-200 hover:border-teal-300 bg-teal-50/90 hover:bg-teal-100 text-xs font-semibold text-teal-800 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Kelola & Edit Divisi Seluruh Karyawan"
          >
            <Building2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Edit Divisi ({distinctDivisions.length} Divisi)</span>
          </button>

          {/* Pilih Karyawan per Divisi Button */}
          <button
            onClick={() => setIsEmployeeSelectorModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 hover:border-indigo-300 bg-indigo-50/90 hover:bg-indigo-100 text-xs font-semibold text-indigo-900 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Pilih karyawan tertentu per divisi yang akan ditampilkan dalam Executive Summary"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilih Karyawan ({displayedEmployees.length}/{employees.length})</span>
          </button>

          <button
            onClick={() => setShowGapDetails(!showGapDetails)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Lihat Rincian Analisa Gap Kompetensi"
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            <span>{showGapDetails ? 'Sembunyikan Gap Data' : 'Analisa Gap Statistik'}</span>
            {showGapDetails ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>

          {/* Rapihkan Bahasa AI Gemini Button (Full Document) */}
          <button
            onClick={() => setIsFullRefinementModalOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-950 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Rapihkan tata bahasa, ejaan baku EYD V, dan diksi eksekutif untuk seluruh hasil analisa (Executive Summary, Tabel Ringkasan, Tabel Kekuatan & Pengembangan) dengan AI Gemini"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Rapihkan bahasa (AI Gemini)</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            title="Download Executive Summary dalam format Dokumen PDF Resmi"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-teal-100 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-teal-100" />
            )}
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>



      {/* Main Document Content Body */}
      <div className="space-y-4 font-sans text-slate-900">
        {/* Active Filter Notification Banner */}
        {hasUserAppliedFilter && (
          <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-in fade-in">
            <div className="flex items-center space-x-2 text-xs text-indigo-950 font-medium">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Menampilkan <strong>{displayedEmployees.length}</strong> dari <strong>{employees.length}</strong> karyawan
                {selectedDivisionFilter !== 'ALL' ? (
                  <> (Divisi: <strong className="text-indigo-800">{selectedDivisionFilter}</strong>)</>
                ) : (
                  <> (Seleksi Kustom)</>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsEmployeeSelectorModalOpen(true)}
                className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Ubah Seleksi
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDisplayEmployeeIds(employees.map(e => e.id));
                  setSelectedDivisionFilter('ALL');
                  setHasUserAppliedFilter(false);
                  setGeneralToast('Menampilkan seluruh karyawan (Semua Divisi).');
                  setTimeout(() => setGeneralToast(null), 3000);
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Tampilkan Semua ({employees.length})
              </button>
            </div>
          </div>
        )}

        {/* Title: 1. Executive Summary */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b4d79] flex items-center space-x-2">
            <span>1. Executive Summary</span>
          </h1>
          
          {/* Scope Paragraph */}
          <p className="mt-2 text-xs sm:text-[13px] text-slate-800 leading-relaxed">
            <span className="font-semibold text-slate-900">Scope:</span> {displayedEmployees.length} peserta assessment dari file yang diberikan. Ringkasan ini menggabungkan hasil rekomendasi assessment, persentase pemenuhan kompetensi, kategori kapasitas berpikir dan nilai IQ berdasarkan Skala TIKI, kekuatan utama, area pengembangan, dan catatan HR follow-up.
          </p>
        </div>

        {/* Statistical Gap Panel (When Toggled) */}
        {showGapDetails && (
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Hasil Perhitungan Gap Dominan Karyawan Ditampilkan (Standar Benchmark = 4.00)
                </h4>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                Total Dianalisa: {displayedEmployees.length} Karyawan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {gapAnalysis.gapStats.map((item, idx) => {
                const isDominant = idx < 3;
                return (
                  <div
                    key={item.key}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                      isDominant
                        ? 'bg-yellow-100/90 border-yellow-300 shadow-2xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-slate-900 leading-snug">
                        {idx + 1}. {item.label}
                      </span>
                      {isDominant && (
                        <span className="px-1.5 py-0.5 bg-yellow-300 text-yellow-900 text-[10px] font-bold rounded-xs whitespace-nowrap">
                          Gap Dominan #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>Rerata: <strong className="text-slate-900">{item.avgScore}</strong>/5.0</span>
                      <span className={item.gap > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        {item.gap > 0 ? `Gap: -${item.gap}` : `Tercapai (+${Math.abs(item.gap)})`}
                      </span>
                      <span>{item.belowTargetPercent}% di bawah target</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Executive Summary Recommendation Table (Exact Replica of Provided Assessment Report Layout) */}
        <div className="overflow-x-auto rounded-none border border-slate-300 mt-3 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className={`border-b border-slate-300 font-bold transition-colors ${isEditingRemarks ? 'bg-[#dbebf6] text-[#1a4b77]' : 'bg-[#e9f2f8] text-[#1a4b77]'}`}>
                <th className="py-2.5 px-3.5 border-r border-slate-300 w-44 sm:w-48 font-bold">
                  Kategori Assessment
                </th>
                <th className="py-2.5 px-3 border-r border-slate-300 w-24 sm:w-28 text-center font-bold">
                  Jumlah
                </th>
                <th className="py-2.5 px-3.5 border-r border-slate-300 w-64 sm:w-72 font-bold">
                  Nama
                </th>
                <th className="py-2.5 px-3.5 font-bold">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center space-x-1.5">
                      <span>Keterangan HR</span>
                      {(customRemarks.recommended || customRemarks.considered || customRemarks.notRecommended) && !isEditingRemarks && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          Kustom
                        </span>
                      )}
                    </span>
                    {!isEditingRemarks ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingRemarks(true)}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1a4b77] hover:bg-[#12385c] text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer"
                        title="Buka fitur edit Keterangan HR & Catatan Pola"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit Keterangan HR</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomRemarks({});
                            setCustomNoteOverride(null);
                            try {
                              localStorage.removeItem('talentpulse_custom_hr_remarks_v1');
                              localStorage.removeItem('talentpulse_custom_pattern_note_v1');
                            } catch (_) {}
                            setGeneralToast('Keterangan HR dikembalikan ke standar ideal.');
                            setTimeout(() => setGeneralToast(null), 3000);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-semibold transition-all border border-amber-300 cursor-pointer"
                          title="Kembalikan Keterangan HR ke standar analisis ideal"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          <span>Reset Ke Ideal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingRemarks(false);
                            setGeneralToast('Keterangan HR & Catatan pola berhasil disimpan.');
                            setTimeout(() => setGeneralToast(null), 3000);
                          }}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                          title="Simpan perubahan dan selesai edit"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Selesai Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-900">
              {/* Row 1: Dapat Disarankan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3.5 border-r border-slate-300 font-semibold text-slate-900 align-top">
                  Dapat Disarankan
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-center font-medium text-slate-800 align-top whitespace-nowrap">
                  {categorized.recommended.length} orang
                </td>
                <td className="py-3 px-3.5 border-r border-slate-300 text-slate-800 align-top">
                  {categorized.recommended.length === 0 ? (
                    <span className="text-slate-400 italic">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {categorized.recommended.map((emp, idx) => (
                        <span key={emp.id} className="inline-flex items-center">
                          <button
                            onClick={() => onGoToIndividualView ? onGoToIndividualView(emp.id) : onSelectEmployee?.(emp)}
                            className="font-medium hover:text-blue-700 hover:underline transition-colors text-slate-900 text-left cursor-pointer"
                            title={`Lihat profil & radar ${emp.name}`}
                          >
                            {emp.name}
                          </button>
                          {idx < categorized.recommended.length - 1 && <span className="mr-1">,</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3.5 text-slate-800 leading-relaxed align-top">
                  {isEditingRemarks ? (
                    <div className="space-y-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center space-x-1">
                          <span>Catatan Kategori: Dapat Disarankan</span>
                          {customRemarks.recommended ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              Kustom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Otomatis
                            </span>
                          )}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenRefineForCategory('recommended', 'Dapat Disarankan')}
                            className="inline-flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                            title="Rapihkan tata bahasa dan gaya bahasa eksekutif dengan AI Gemini"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Rapihkan (AI)</span>
                          </button>
                          {customRemarks.recommended && (
                            <button
                              type="button"
                              onClick={() => setCustomRemarks(prev => {
                                const next = { ...prev };
                                delete next.recommended;
                                return next;
                              })}
                              className="inline-flex items-center space-x-1 text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                              title="Kembalikan ke analisa otomatis"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={customRemarks.recommended ?? hrRemarks.recommended}
                        onChange={(e) => setCustomRemarks(prev => ({ ...prev, recommended: e.target.value }))}
                        rows={3}
                        className="w-full text-xs sm:text-[13px] p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900"
                        placeholder="Tulis keterangan HR kustom untuk kategori Dapat Disarankan..."
                      />
                    </div>
                  ) : (
                    <div className="group relative flex items-start justify-between gap-2">
                      <div className="leading-relaxed">
                        <span>{hrRemarks.recommended}</span>
                        {customRemarks.recommended && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Diedit Kustom
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingRemarks(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 cursor-pointer"
                        title="Edit keterangan ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>

              {/* Row 2: Dipertimbangkan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3.5 border-r border-slate-300 font-semibold text-slate-900 align-top">
                  Dipertimbangkan
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-center font-medium text-slate-800 align-top whitespace-nowrap">
                  {categorized.considered.length} orang
                </td>
                <td className="py-3 px-3.5 border-r border-slate-300 text-slate-800 align-top">
                  {categorized.considered.length === 0 ? (
                    <span className="text-slate-400 italic">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {categorized.considered.map((emp, idx) => (
                        <span key={emp.id} className="inline-flex items-center">
                          <button
                            onClick={() => onGoToIndividualView ? onGoToIndividualView(emp.id) : onSelectEmployee?.(emp)}
                            className="font-medium hover:text-blue-700 hover:underline transition-colors text-slate-900 text-left cursor-pointer"
                            title={`Lihat profil & radar ${emp.name}`}
                          >
                            {emp.name}
                          </button>
                          {idx < categorized.considered.length - 1 && <span className="mr-1">,</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3.5 text-slate-800 leading-relaxed align-top">
                  {isEditingRemarks ? (
                    <div className="space-y-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center space-x-1">
                          <span>Catatan Kategori: Dipertimbangkan</span>
                          {customRemarks.considered ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              Kustom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Otomatis
                            </span>
                          )}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenRefineForCategory('considered', 'Dipertimbangkan')}
                            className="inline-flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                            title="Rapihkan tata bahasa dan gaya bahasa eksekutif dengan AI Gemini"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Rapihkan (AI)</span>
                          </button>
                          {customRemarks.considered && (
                            <button
                              type="button"
                              onClick={() => setCustomRemarks(prev => {
                                const next = { ...prev };
                                delete next.considered;
                                return next;
                              })}
                              className="inline-flex items-center space-x-1 text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                              title="Kembalikan ke analisa otomatis"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={customRemarks.considered ?? hrRemarks.considered}
                        onChange={(e) => setCustomRemarks(prev => ({ ...prev, considered: e.target.value }))}
                        rows={3}
                        className="w-full text-xs sm:text-[13px] p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900"
                        placeholder="Tulis keterangan HR kustom untuk kategori Dipertimbangkan..."
                      />
                    </div>
                  ) : (
                    <div className="group relative flex items-start justify-between gap-2">
                      <div className="leading-relaxed">
                        <span>{hrRemarks.considered}</span>
                        {customRemarks.considered && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Diedit Kustom
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingRemarks(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 cursor-pointer"
                        title="Edit keterangan ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>

              {/* Row 3: Tidak Disarankan */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-3.5 border-r border-slate-300 font-semibold text-slate-900 align-top">
                  Tidak Disarankan
                </td>
                <td className="py-3 px-3 border-r border-slate-300 text-center font-medium text-slate-800 align-top whitespace-nowrap">
                  {categorized.notRecommended.length} orang
                </td>
                <td className="py-3 px-3.5 border-r border-slate-300 text-slate-800 align-top">
                  {categorized.notRecommended.length === 0 ? (
                    <span className="text-slate-400 italic">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {categorized.notRecommended.map((emp, idx) => (
                        <span key={emp.id} className="inline-flex items-center">
                          <button
                            onClick={() => onGoToIndividualView ? onGoToIndividualView(emp.id) : onSelectEmployee?.(emp)}
                            className="font-medium hover:text-blue-700 hover:underline transition-colors text-slate-900 text-left cursor-pointer"
                            title={`Lihat profil & radar ${emp.name}`}
                          >
                            {emp.name}
                          </button>
                          {idx < categorized.notRecommended.length - 1 && <span className="mr-1">,</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-3 px-3.5 text-slate-800 leading-relaxed align-top">
                  {isEditingRemarks ? (
                    <div className="space-y-2 p-2 bg-blue-50/50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center space-x-1">
                          <span>Catatan Kategori: Tidak Disarankan</span>
                          {customRemarks.notRecommended ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              Kustom
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Otomatis
                            </span>
                          )}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenRefineForCategory('notRecommended', 'Tidak Disarankan')}
                            className="inline-flex items-center space-x-1 text-[11px] text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer"
                            title="Rapihkan tata bahasa dan gaya bahasa eksekutif dengan AI Gemini"
                          >
                            <Sparkles className="w-3 h-3 text-blue-600" />
                            <span>Rapihkan (AI)</span>
                          </button>
                          {customRemarks.notRecommended && (
                            <button
                              type="button"
                              onClick={() => setCustomRemarks(prev => {
                                const next = { ...prev };
                                delete next.notRecommended;
                                return next;
                              })}
                              className="inline-flex items-center space-x-1 text-[11px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                              title="Kembalikan ke analisa otomatis"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={customRemarks.notRecommended ?? hrRemarks.notRecommended}
                        onChange={(e) => setCustomRemarks(prev => ({ ...prev, notRecommended: e.target.value }))}
                        rows={3}
                        className="w-full text-xs sm:text-[13px] p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900"
                        placeholder="Tulis keterangan HR kustom untuk kategori Tidak Disarankan..."
                      />
                    </div>
                  ) : (
                    <div className="group relative flex items-start justify-between gap-2">
                      <div className="leading-relaxed">
                        <span>{hrRemarks.notRecommended}</span>
                        {customRemarks.notRecommended && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 text-[10px] rounded font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Diedit Kustom
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingRemarks(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0 cursor-pointer"
                        title="Edit keterangan ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Catatan Pola Utama (Dynamically synchronized from Table 1 & Table 4 Assessment Findings) */}
        <div className="pt-2">
          {isEditingRemarks ? (
            <div className="bg-slate-50 p-4 rounded-xl border border-blue-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kustomisasi Catatan Pola Utama (Sinkronisasi Analisa):</span>
                  {customNoteOverride !== null && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      Kustom
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={handleOpenRefineForPatternNote}
                  className="inline-flex items-center space-x-1 text-xs text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer"
                  title="Rapihkan narasi catatan pola utama dengan AI Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rapihkan Bahasa (AI Gemini)</span>
                </button>
              </div>
              <textarea
                value={customNoteOverride !== null ? customNoteOverride : synchronizedPattern.rawText}
                onChange={(e) => setCustomNoteOverride(e.target.value)}
                rows={3}
                className="w-full text-xs sm:text-[13px] p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white leading-relaxed text-slate-900"
                placeholder="Tulis catatan pola utama kustom..."
              />
              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => setCustomNoteOverride(null)}
                  className="text-xs text-slate-600 hover:text-rose-600 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Hasil Sinkronisasi Analisa Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingRemarks(false);
                    setGeneralToast('Catatan pola utama & Keterangan HR berhasil disimpan.');
                    setTimeout(() => setGeneralToast(null), 3000);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan & Tutup Editor</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-950 text-xs sm:text-[13px]">Catatan pola utama:</span>
                  {customNoteOverride !== null && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                      Kustom
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingRemarks(true)}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                  title="Edit narasi catatan pola utama"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit Catatan Pola</span>
                </button>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-900 leading-relaxed">
                {customNoteOverride !== null ? (
                  <span>{customNoteOverride}</span>
                ) : synchronizedPattern.isEmpty ? (
                  <span className="text-slate-500 italic">{synchronizedPattern.rawText}</span>
                ) : (
                  <>
                    Sebagian besar kandidat memiliki komitmen dan eksekusi tugas harian yang solid. Namun, area yang paling membutuhkan bimbingan bersama adalah{' '}
                    <mark className="bg-yellow-200 text-slate-950 px-1 py-0.5 font-semibold rounded-xs">
                      {synchronizedPattern.item1}
                    </mark>
                    {synchronizedPattern.item2 && (
                      <>
                        ,{' '}
                        <span>
                          {synchronizedPattern.item2}
                        </span>
                      </>
                    )}
                    {synchronizedPattern.item3 && (
                      <>
                        , serta{' '}
                        <span>
                          {synchronizedPattern.item3}
                        </span>
                      </>
                    )}
                    . Hal ini menunjukkan prioritas pengembangan tim perlu difokuskan pada penguatan{' '}
                    <mark className="bg-yellow-200 text-slate-950 px-1 py-0.5 font-semibold rounded-xs">
                      {synchronizedPattern.theme}
                    </mark>
                    , bukan hanya kemampuan operasional teknis semata.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SKOR KOMPETENSI (MATRIKS INDIKATOR PER DIMENSI SELURUH KARYAWAN)       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title: 2. Skor Kompetensi */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b4d79] flex items-center space-x-2">
              <span>2. Skor Kompetensi</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed max-w-4xl">
              <span className="font-semibold text-slate-900">Scope:</span> Matriks pemetaan skor riil seluruh pilar kompetensi per individu karyawan ({displayedEmployees.length} peserta), dikelompokkan ke dalam 5 dimensi utama: Kemampuan Berpikir, Karakteristik Pribadi, Pengelolaan Tugas, Pengelolaan SDM, dan Kepemimpinan.
            </p>
          </div>

          {/* Quick Category Badges */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1">
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e9f2f8] text-[#1a4b77] border border-[#b4cde1]">
              5 Dimensi
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
              {COMPETENCY_SCORE_MATRIX.reduce((acc, cat) => acc + cat.items.length, 0)} Indikator
            </span>
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {displayedEmployees.length} Karyawan
            </span>
          </div>
        </div>

        {/* Search & Actions Toolbar for Skor Kompetensi */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={scoreMatrixSearchQuery}
              onChange={(e) => setScoreMatrixSearchQuery(e.target.value)}
              placeholder="Cari indikator kompetensi / dimensi..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4b77]"
            />
          </div>

          <div className="flex items-center gap-3">
            {displayedEmployees.length === 0 && onGoToTab && (
              <button
                type="button"
                onClick={() => onGoToTab('upload')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1a4b77] hover:bg-[#153a5c] text-white shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Dokumen PDF Asesmen</span>
              </button>
            )}
            <div className="text-xs text-slate-500 font-medium">
              Skala Penilaian: <strong className="text-slate-900">1 (Sangat Kurang)</strong> s/d <strong className="text-slate-900">5 (Sangat Baik)</strong>
            </div>
          </div>
        </div>

        {/* Empty State Banner when 0 Employees */}
        {displayedEmployees.length === 0 && (
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-950">
                  Data Matriks 14 Kompetensi Belum Dimuat
                </p>
                <p className="text-xs text-blue-800 mt-0.5">
                  Tabel ini secara otomatis mengekstrak dan menampilkan nilai riil (skala 1 s/d 5) 100% presisi langsung dari berkas dokumen PDF asesmen yang Anda unggah.
                </p>
              </div>
            </div>
            {onGoToTab && (
              <button
                type="button"
                onClick={() => onGoToTab('upload')}
                className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#1a4b77] hover:bg-[#143d63] text-white shadow-xs transition-all cursor-pointer"
              >
                Unggah Berkas PDF Sekarang
              </button>
            )}
          </div>
        )}

        {/* Competency Score Matrix Table (Sesuai format lampiran) */}
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                {/* Tier 1 Header */}
                <tr className="bg-[#e9f2f8] text-[#1a4b77] border-b border-slate-300">
                  <th 
                    rowSpan={2} 
                    className="py-3 px-3 font-bold border-r border-slate-300 w-12 text-center align-middle"
                  >
                    No
                  </th>
                  <th 
                    rowSpan={2} 
                    className="py-3 px-4 font-bold border-r border-slate-300 w-80 min-w-[260px] align-middle"
                  >
                    Competency
                  </th>
                  <th 
                    colSpan={Math.max(displayedEmployees.length, 1)} 
                    className="py-2.5 px-4 font-bold border-b border-slate-300 text-center uppercase tracking-wider text-xs"
                  >
                    Nilai
                  </th>
                </tr>

                {/* Tier 2 Header (Employee Names under 'Nilai') */}
                <tr className="bg-[#e9f2f8] text-[#1a4b77] border-b border-slate-300">
                  {displayedEmployees.length === 0 ? (
                    <th className="py-3 px-4 font-medium text-slate-500 text-center italic bg-slate-50">
                      (Belum ada data peserta asesmen — Silakan unggah file PDF pada tab Unggah Asesmen)
                    </th>
                  ) : (
                    displayedEmployees.map((emp) => (
                      <th
                        key={emp.id}
                        className="py-2.5 px-3 font-bold border-r last:border-r-0 border-slate-300 text-center min-w-[130px]"
                      >
                        <button
                          onClick={() => {
                            if (onGoToIndividualView) onGoToIndividualView(emp.id);
                            else if (onSelectEmployee) onSelectEmployee(emp);
                          }}
                          className="font-bold text-[#1a4b77] hover:text-blue-800 hover:underline block truncate w-full text-center cursor-pointer transition-colors"
                          title={`Klik untuk melihat detail ${emp.name}`}
                        >
                          {emp.name}
                        </button>
                        {emp.position && (
                          <span className="text-[10px] font-normal text-slate-500 block truncate mt-0.5">
                            {emp.position}
                          </span>
                        )}
                        <div className="mt-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInlineEditingEmpId(emp.id);
                              setInlineEditingDivision(emp.department || '');
                            }}
                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white hover:bg-teal-50 text-slate-600 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer max-w-[125px] truncate group/div shadow-2xs"
                            title={`Divisi: ${emp.department || 'Belum diatur'}. Klik untuk edit divisi`}
                          >
                            <Building2 className="w-2.5 h-2.5 text-teal-600 shrink-0" />
                            <span className="truncate">{emp.department || 'Set Divisi'}</span>
                            <Edit3 className="w-2 h-2 text-slate-400 group-hover/div:text-teal-600 shrink-0" />
                          </button>
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              <tbody>
                {COMPETENCY_SCORE_MATRIX.map((group) => {
                  const filteredItems = group.items.filter(item => {
                    if (!scoreMatrixSearchQuery) return true;
                    const q = scoreMatrixSearchQuery.toLowerCase();
                    return group.categoryName.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
                  });

                  if (filteredItems.length === 0) return null;

                  return (
                    <React.Fragment key={group.categoryName}>
                      {/* Dimension / Category Row */}
                      <tr className="bg-[#dbeafe] text-[#1a4b77] border-y border-slate-300 font-bold">
                        <td className="py-2.5 px-3 text-center border-r border-slate-300">
                          {group.number}
                        </td>
                        <td className="py-2.5 px-4 border-r border-slate-300 text-slate-900 font-bold">
                          {group.categoryName}
                        </td>
                        {displayedEmployees.length === 0 ? (
                          <td className="py-2.5 px-3 border-r last:border-r-0 border-slate-300 bg-[#dbeafe]"></td>
                        ) : (
                          displayedEmployees.map((emp) => (
                            <td 
                              key={emp.id} 
                              className="py-2.5 px-3 border-r last:border-r-0 border-slate-300 bg-[#dbeafe]"
                            />
                          ))
                        )}
                      </tr>

                      {/* Sub-item Rows */}
                      {filteredItems.map((item) => (
                        <tr 
                          key={item.name} 
                          className="hover:bg-slate-50/80 border-b border-slate-200 transition-colors"
                        >
                          {/* Column 0: Empty / Dash */}
                          <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 text-[11px]">
                            
                          </td>

                          {/* Column 1: Indented Competency Name */}
                          <td className="py-2.5 px-4 border-r border-slate-200 text-slate-800 font-medium pl-8">
                            {item.name}
                          </td>

                          {/* Employee Score Columns */}
                          {displayedEmployees.length === 0 ? (
                            <td className="py-2.5 px-3 text-center border-r last:border-r-0 border-slate-200 text-slate-400">
                              -
                            </td>
                          ) : (
                            displayedEmployees.map((emp) => {
                              const score = resolveEmployeeCompetencyScore(emp, item);
                              const isEditingThisCell = editingScoreCell?.empId === emp.id && editingScoreCell?.itemName === item.name;
                              const scoreColorClass = 
                                score >= 4 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold hover:bg-emerald-100' 
                                  : score === 3 
                                  ? 'bg-slate-100 text-slate-800 border-slate-200 font-semibold hover:bg-slate-200' 
                                  : 'bg-amber-50 text-amber-900 border-amber-300 font-bold hover:bg-amber-100';

                              return (
                                <td 
                                  key={emp.id} 
                                  className="py-2 px-3 text-center border-r last:border-r-0 border-slate-200 relative"
                                >
                                  <div className="flex justify-center items-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditingThisCell) {
                                          setEditingScoreCell(null);
                                        } else {
                                          setEditingScoreCell({ empId: emp.id, itemName: item.name });
                                        }
                                      }}
                                      className={`inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs shadow-2xs transition-all cursor-pointer ${scoreColorClass}`}
                                      title={`${emp.name} - ${item.name}: ${score}. Klik untuk ubah / kalibrasi skor`}
                                    >
                                      {score}
                                    </button>
                                  </div>

                                  {/* Quick Inline Score Selector Popover */}
                                  {isEditingThisCell && (
                                    <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-300 rounded-xl shadow-xl p-2 min-w-[170px] text-left animate-in fade-in zoom-in-95 duration-100">
                                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-700">
                                        <span className="truncate max-w-[120px]">{item.name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingScoreCell(null);
                                          }}
                                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <div className="text-[10px] text-slate-500 mb-1.5 font-medium">
                                        Pilih skor riil sesuai dokumen:
                                      </div>
                                      <div className="grid grid-cols-5 gap-1">
                                        {[1, 2, 3, 4, 5].map((num) => (
                                          <button
                                            key={num}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleQuickChangeCompetencyScore(emp, item.name, num);
                                            }}
                                            className={`py-1 text-xs rounded font-bold border transition-colors cursor-pointer text-center ${
                                              score === num
                                                ? 'bg-[#1b4d79] text-white border-[#1b4d79] ring-2 ring-blue-300'
                                                : num >= 4
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                                : num === 3
                                                ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                                                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                                            }`}
                                          >
                                            {num}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                                        <span>1: Gap</span>
                                        <span>3: Standar</span>
                                        <span>5: Unggul</span>
                                      </div>
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note & Legend for Skor Kompetensi */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">Keterangan Skor:</span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-medium text-slate-700">1 - 2: Di Bawah Standar (Gap)</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="font-medium text-slate-700">3: Memenuhi Standar</span>
            </span>
            <span className="inline-flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-medium text-slate-700">4 - 5: Di Atas Standar (Kekuatan)</span>
            </span>
          </div>

          <div className="text-slate-400 italic">
            * Data skor dihitung berdasarkan profil asesmen terintegrasi & verifikasi assessor.
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABEL RINGKASAN HASIL ASSESSMENT (SESUAI FORMAT DOKUMEN ASESMEN RESMI) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title: 3. Tabel Ringkasan Hasil Assessment */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b4d79] flex items-center space-x-2">
              <span>3. Tabel Ringkasan Hasil Assessment</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed max-w-4xl">
              <span className="font-semibold text-slate-900">Scope:</span> Rekapitulasi komprehensif seluruh karyawan terasesmen ({displayedEmployees.length} peserta) yang mencakup posisi yang dinilai, status rekomendasi kelayakan, persentase pemenuhan kompetensi, kapasitas berpikir & IQ, gap kompetensi prioritas, dan ringkasan reading diagnostik.
            </p>
          </div>

          {/* Quick Filter Counters */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1">
            <button
              onClick={() => setTableRecommendationFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tableRecommendationFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua ({displayedEmployees.length})
            </button>
            <button
              onClick={() => setTableRecommendationFilter('Dapat Disarankan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tableRecommendationFilter === 'Dapat Disarankan'
                  ? 'bg-[#2b542c] text-white shadow-xs'
                  : 'bg-[#dff0d8] text-[#2b542c] hover:bg-[#d0e9c6]'
              }`}
            >
              Dapat Disarankan ({categorized.recommended.length})
            </button>
            <button
              onClick={() => setTableRecommendationFilter('Dipertimbangkan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tableRecommendationFilter === 'Dipertimbangkan'
                  ? 'bg-[#8a6d3b] text-white shadow-xs'
                  : 'bg-[#fcf8e3] text-[#8a6d3b] hover:bg-[#f8f0c9]'
              }`}
            >
              Dipertimbangkan ({categorized.considered.length})
            </button>
            <button
              onClick={() => setTableRecommendationFilter('Tidak Disarankan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tableRecommendationFilter === 'Tidak Disarankan'
                  ? 'bg-[#a94442] text-white shadow-xs'
                  : 'bg-[#f2dede] text-[#a94442] hover:bg-[#eecbcd]'
              }`}
            >
              Tidak Disarankan ({categorized.notRecommended.length})
            </button>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={tableSearchQuery}
              onChange={(e) => setTableSearchQuery(e.target.value)}
              placeholder="Cari nama, divisi, jabatan, atau keyword..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4b77]"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-900">{
              displayedEmployees.filter(emp => {
                const matchQuery = tableSearchQuery === '' || 
                  emp.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                  (emp.department || '').toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                  (emp.evaluatedPosition || emp.position).toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                  (emp.briefReading || emp.keyInsights || '').toLowerCase().includes(tableSearchQuery.toLowerCase());

                const empRec = emp.recommendationCategory || (
                  categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                  categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                );

                const matchFilter = tableRecommendationFilter === 'ALL' || empRec === tableRecommendationFilter;

                return matchQuery && matchFilter;
              }).length
            }</strong> dari {displayedEmployees.length} karyawan terasesmen
          </span>
        </div>

        {/* Comprehensive Assessment Summary Table (Exact Format from Official Report Image) */}
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#e9f2f8] text-[#1a4b77] border-b border-slate-300">
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-44 min-w-[150px]">
                    Nama Karyawan
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-48 min-w-[160px]">
                    Posisi yang Dinilai
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-36 min-w-[130px] text-center">
                    Rekomendasi
                  </th>
                  <th className="py-3 px-3 font-bold border-r border-slate-300 w-28 min-w-[100px] text-center">
                    Pemenuhan Kompetensi
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-44 min-w-[140px]">
                    Kapasitas IQ
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-72 min-w-[200px]">
                    Kompetensi Perlu Dikembangkan
                  </th>
                  <th className="py-3 px-3.5 font-bold min-w-[280px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Reading Singkat</span>
                      <span className="inline-flex items-center space-x-1 text-[10.5px] font-normal text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                        <Pencil className="w-2.5 h-2.5 text-blue-600" />
                        <span>Bisa Diedit</span>
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Belum ada data peserta assessment yang diunggah.
                    </td>
                  </tr>
                ) : displayedEmployees
                  .filter(emp => {
                    const matchQuery = tableSearchQuery === '' || 
                      emp.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                      (emp.department || '').toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                      (emp.evaluatedPosition || emp.position).toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                      (emp.briefReading || emp.keyInsights || '').toLowerCase().includes(tableSearchQuery.toLowerCase());

                    const empRec = emp.recommendationCategory || (
                      categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                      categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                    );

                    const matchFilter = tableRecommendationFilter === 'ALL' || empRec === tableRecommendationFilter;

                    return matchQuery && matchFilter;
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data karyawan yang sesuai dengan kriteria pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  displayedEmployees
                    .filter(emp => {
                      const matchQuery = tableSearchQuery === '' || 
                        emp.name.toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                        (emp.department || '').toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                        (emp.evaluatedPosition || emp.position).toLowerCase().includes(tableSearchQuery.toLowerCase()) ||
                        (emp.briefReading || emp.keyInsights || '').toLowerCase().includes(tableSearchQuery.toLowerCase());

                      const empRec = emp.recommendationCategory || (
                        categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                        categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                      );

                      const matchFilter = tableRecommendationFilter === 'ALL' || empRec === tableRecommendationFilter;

                      return matchQuery && matchFilter;
                    })
                    .map((emp) => {
                      // Recommendation status & styling
                      const rec = emp.recommendationCategory || (
                        categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                        categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                      );

                      const recStyle = 
                        rec === 'Dapat Disarankan' ? 'bg-[#dff0d8] text-[#2b542c] border-[#d6e9c6]' :
                        rec === 'Dipertimbangkan' ? 'bg-[#fcf8e3] text-[#8a6d3b] border-[#faebcc]' :
                        'bg-[#f2dede] text-[#a94442] border-[#ebccd1]';

                      // Formatted Position
                      const evaluatedPos = emp.evaluatedPosition || emp.position;

                      // Formatted Fulfillment %
                      const fulfillmentPct = emp.overallScore.toFixed(1).replace('.', ',') + '%';

                      // Thinking Capacity & IQ (Standardized Indonesian Assessment Format)
                      const thinkingCap = formatThinkingCapacity(emp);

                      // Competencies to develop items
                      let compDevItems: string[] = [];
                      if (emp.competenciesToDevelop && emp.competenciesToDevelop.length > 0) {
                        compDevItems = emp.competenciesToDevelop;
                      } else if (emp.developmentAreas && emp.developmentAreas.trim()) {
                        compDevItems = emp.developmentAreas.split(/\r?\n|;(?=\s*[A-Z0-9•\-])|;\s*(?=[A-Z])/).map(s => s.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
                      } else if (emp.weaknesses && emp.weaknesses.length > 0) {
                        compDevItems = emp.weaknesses;
                      }

                      // Reading singkat
                      const readingText = customReadingOverrides[emp.id] || emp.briefReading || emp.keyInsights || getIdealReadingText(emp);

                      return (
                        <tr 
                          key={emp.id} 
                          className="hover:bg-slate-50/80 transition-colors align-top group"
                        >
                          {/* 1. Nama Karyawan */}
                          <td className="py-3 px-3.5 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-start justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onGoToIndividualView) onGoToIndividualView(emp.id);
                                  else if (onSelectEmployee) onSelectEmployee(emp);
                                }}
                                className="text-left font-bold text-slate-950 hover:text-blue-700 hover:underline flex items-start space-x-1 cursor-pointer"
                                title="Klik untuk membuka profil asesmen & grafik radar individu"
                              >
                                <span>{emp.name}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              {onUpdateEmployee && (
                                <button
                                  type="button"
                                  onClick={() => setEditingEmployeeForSummary(emp)}
                                  className="text-slate-300 hover:text-blue-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Edit data hasil asesmen baris ini"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 2. Posisi yang Dinilai */}
                          <td className="py-3 px-3.5 text-slate-800 border-r border-slate-200">
                            {evaluatedPos}
                          </td>

                          {/* 3. Rekomendasi (Pastel colored cell / badge matching official report format) */}
                          <td className={`py-3 px-3.5 text-center font-bold border-r border-slate-200 ${recStyle}`}>
                            <span>{rec}</span>
                          </td>

                          {/* 4. Pemenuhan Kompetensi */}
                          <td className="py-3 px-3 text-center font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {fulfillmentPct}
                          </td>

                          {/* 5. Kapasitas IQ */}
                          <td className="py-3 px-3.5 text-slate-800 border-r border-slate-200">
                            <div className="flex items-center justify-between gap-1">
                              <span>{thinkingCap}</span>
                              {onUpdateEmployee && (
                                <button
                                  type="button"
                                  onClick={() => setEditingEmployeeForSummary(emp)}
                                  className="text-slate-300 hover:text-indigo-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Edit Skor IQ / Kapasitas Berpikir"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 6. Kompetensi Perlu Dikembangkan */}
                          <td className="py-3 px-3.5 text-slate-800 border-r border-slate-200 leading-relaxed">
                            {compDevItems.length > 0 ? (
                              <ul className="space-y-1.5 list-none">
                                {compDevItems.map((item, iIdx) => (
                                  <li key={iIdx} className="flex items-start space-x-1.5">
                                    <span className="text-slate-900 shrink-0 mt-0.5">•</span>
                                    <span>{item.replace(/^[•\-\*\s]+/, '').trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span>-</span>
                            )}
                          </td>

                          {/* 7. Reading Singkat */}
                          {editingReadingEmpId === emp.id ? (
                            <td className="py-3 px-3.5 text-slate-900 bg-blue-50/50 border-l-2 border-l-blue-600 shadow-inner">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit Reading Singkat ({emp.name}):</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRefineReadingWithAI(emp, editingReadingText)}
                                    className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shadow-2xs"
                                    title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                    <span>Rapihkan (AI)</span>
                                  </button>
                                </div>

                                <textarea
                                  value={editingReadingText}
                                  onChange={(e) => setEditingReadingText(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  className="w-full text-xs sm:text-[13px] p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900 shadow-2xs"
                                  placeholder="Tulis ringkasan profil / reading singkat diagnostik kandidat..."
                                />

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditReading(emp)}
                                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Simpan</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingReadingText(getIdealReadingText(emp))}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                                      title="Kembalikan teks reading ke analisa standar ideal"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Reset Ke Ideal</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditReading}
                                      className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReadingEmpId(null);
                                      setEditingEmployeeForSummary(emp);
                                    }}
                                    className="text-[11px] text-slate-500 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                                    title="Buka form edit data asesmen lengkap"
                                  >
                                    <span>Edit Selengkapnya</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <td className="py-3 px-3.5 text-slate-900 leading-relaxed align-top relative group/reading">
                              <div className="flex flex-col justify-between h-full space-y-2.5">
                                <div className="text-xs sm:text-[13px] leading-relaxed text-slate-900">
                                  {readingText}
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 opacity-95 group-hover/reading:opacity-100 transition-opacity">
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditReading(emp)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1a4b77] hover:text-blue-900 text-[11px] font-semibold transition-colors border border-blue-200 cursor-pointer shadow-2xs"
                                      title="Edit teks reading singkat ini"
                                    >
                                      <Pencil className="w-3 h-3 text-blue-600" />
                                      <span>Edit Reading</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRefineReadingWithAI(emp)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 text-[11px] font-medium transition-colors border border-purple-200 cursor-pointer shadow-2xs"
                                      title="Rapihkan tata bahasa dan gaya eksekutif dengan AI Gemini"
                                    >
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                      <span>Rapihkan AI</span>
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setEditingEmployeeForSummary(emp)}
                                    className="text-[10.5px] text-slate-400 hover:text-blue-600 opacity-0 group-hover/reading:opacity-100 transition-opacity hover:underline cursor-pointer"
                                    title="Buka form edit data asesmen lengkap"
                                  >
                                    Form Lengkap
                                  </button>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Legend & Guidance Note (Only visible when there is assessment data) */}
        {displayedEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-slate-700">Keterangan Rekomendasi:</span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3c763d]" />
                <span className="font-medium text-slate-700">Dapat Disarankan (&ge; 75%)</span>
              </span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8a6d3b]" />
                <span className="font-medium text-slate-700">Dipertimbangkan (65% - 74%)</span>
              </span>
              <span className="inline-flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a94442]" />
                <span className="font-medium text-slate-700">Tidak Disarankan (&lt; 65%)</span>
              </span>
            </div>

            <div className="text-slate-400 italic">
              * Klik nama karyawan untuk membuka visualisasi radar kompetensi dan rekomendasi IDP.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. TABEL KEKUATAN, AREA PENGEMBANGAN DAN KETERANGAN LAIN                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title: 4. Tabel Kekuatan, Area Pengembangan dan Keterangan Lain */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b4d79] flex items-center space-x-2">
              <span>4. Tabel Kekuatan, Area Pengembangan dan Keterangan Lain</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed max-w-4xl">
              <span className="font-semibold text-slate-900">Scope:</span> Matriks komparasi mendalam profil kualitatif seluruh karyawan terasesmen ({displayedEmployees.length} peserta) yang merangkum pilar kekuatan utama, area prioritas pengembangan kompetensi manajerial, serta catatan tindak lanjut dan rekomendasi IDP (Individual Development Plan).
            </p>
          </div>

          {/* Quick Filter Counters for Table 3 */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-1">
            <button
              onClick={() => setTable3RecommendationFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                table3RecommendationFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua ({displayedEmployees.length})
            </button>
            <button
              onClick={() => setTable3RecommendationFilter('Dapat Disarankan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                table3RecommendationFilter === 'Dapat Disarankan'
                  ? 'bg-[#2b542c] text-white shadow-xs'
                  : 'bg-[#dff0d8] text-[#2b542c] hover:bg-[#d0e9c6]'
              }`}
            >
              Dapat Disarankan ({categorized.recommended.length})
            </button>
            <button
              onClick={() => setTable3RecommendationFilter('Dipertimbangkan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                table3RecommendationFilter === 'Dipertimbangkan'
                  ? 'bg-[#8a6d3b] text-white shadow-xs'
                  : 'bg-[#fcf8e3] text-[#8a6d3b] hover:bg-[#f8f0c9]'
              }`}
            >
              Dipertimbangkan ({categorized.considered.length})
            </button>
            <button
              onClick={() => setTable3RecommendationFilter('Tidak Disarankan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                table3RecommendationFilter === 'Tidak Disarankan'
                  ? 'bg-[#a94442] text-white shadow-xs'
                  : 'bg-[#f2dede] text-[#a94442] hover:bg-[#eecbcd]'
              }`}
            >
              Tidak Disarankan ({categorized.notRecommended.length})
            </button>
          </div>
        </div>

        {/* Search Toolbar for Table 4 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={table3SearchQuery}
              onChange={(e) => setTable3SearchQuery(e.target.value)}
              placeholder="Cari nama, divisi, kekuatan, atau catatan follow-up..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a4b77]"
            />
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-900">{
              displayedEmployees.filter(emp => {
                const matchQuery = table3SearchQuery === '' || 
                  emp.name.toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                  (emp.department || '').toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                  (emp.mainStrengths || emp.strengths.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                  (emp.developmentAreas || emp.weaknesses.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                  (emp.followUpNotes || emp.keyInsights || '').toLowerCase().includes(table3SearchQuery.toLowerCase());

                const empRec = emp.recommendationCategory || (
                  categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                  categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                );

                const matchFilter = table3RecommendationFilter === 'ALL' || empRec === table3RecommendationFilter;

                return matchQuery && matchFilter;
              }).length
            }</strong> dari {displayedEmployees.length} karyawan terasesmen
          </span>
        </div>

        {/* Table 4 Content (Matches image format exactly) */}
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#e9f2f8] text-[#1a4b77] border-b border-slate-300">
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-48 min-w-[170px]">
                    Nama Karyawan
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 min-w-[280px]">
                    Kekuatan Utama
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 min-w-[280px]">
                    Area Pengembangan
                  </th>
                  <th className="py-3 px-3.5 font-bold min-w-[280px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Keterangan Lain / Fokus Follow-up</span>
                      <span className="inline-flex items-center space-x-1 text-[10.5px] font-normal text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                        <Pencil className="w-2.5 h-2.5 text-blue-600" />
                        <span>Bisa Diedit</span>
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      Belum ada data peserta assessment yang diunggah.
                    </td>
                  </tr>
                ) : displayedEmployees
                  .filter(emp => {
                    const matchQuery = table3SearchQuery === '' || 
                      emp.name.toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                      (emp.department || '').toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                      (emp.mainStrengths || emp.strengths.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                      (emp.developmentAreas || emp.weaknesses.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                      (emp.followUpNotes || emp.keyInsights || '').toLowerCase().includes(table3SearchQuery.toLowerCase());

                    const empRec = emp.recommendationCategory || (
                      categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                      categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                    );

                    const matchFilter = table3RecommendationFilter === 'ALL' || empRec === table3RecommendationFilter;

                    return matchQuery && matchFilter;
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                      Tidak ada data karyawan yang sesuai dengan kriteria pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  displayedEmployees
                    .filter(emp => {
                      const matchQuery = table3SearchQuery === '' || 
                        emp.name.toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                        (emp.department || '').toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                        (emp.mainStrengths || emp.strengths.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                        (emp.developmentAreas || emp.weaknesses.join(' ')).toLowerCase().includes(table3SearchQuery.toLowerCase()) ||
                        (emp.followUpNotes || emp.keyInsights || '').toLowerCase().includes(table3SearchQuery.toLowerCase());

                      const empRec = emp.recommendationCategory || (
                        categorized.recommended.some(e => e.id === emp.id) ? 'Dapat Disarankan' :
                        categorized.considered.some(e => e.id === emp.id) ? 'Dipertimbangkan' : 'Tidak Disarankan'
                      );

                      const matchFilter = table3RecommendationFilter === 'ALL' || empRec === table3RecommendationFilter;

                      return matchQuery && matchFilter;
                    })
                    .map((emp) => {
                      // Strengths text
                      const strengthsText = emp.mainStrengths || 
                        (emp.strengths && emp.strengths.length > 0 ? emp.strengths.join('; ') : 'Menunjukkan stabilitas kerja dan komitmen tugas.');

                      // Development areas text
                      const devText = emp.developmentAreas || 
                        (emp.competenciesToDevelop && emp.competenciesToDevelop.length > 0 
                          ? emp.competenciesToDevelop.join('; ') 
                          : (emp.weaknesses && emp.weaknesses.length > 0 ? emp.weaknesses.join('; ') : 'Peningkatan kapasitas manajerial dan pemecahan masalah.'));

                      // Follow-up notes text
                      const followUpText = getDefaultFollowUpText(emp);

                      return (
                        <tr 
                          key={emp.id} 
                          className="hover:bg-slate-50/80 transition-colors align-top"
                        >
                          {/* 1. Nama Karyawan */}
                          <td className="py-3.5 px-3.5 font-bold text-slate-900 border-r border-slate-200">
                            <button
                              type="button"
                              onClick={() => {
                                if (onGoToIndividualView) onGoToIndividualView(emp.id);
                                else if (onSelectEmployee) onSelectEmployee(emp);
                              }}
                              className="text-left font-bold text-slate-950 hover:text-blue-700 hover:underline flex items-start space-x-1 group cursor-pointer"
                              title="Klik untuk membuka profil asesmen individu"
                            >
                              <span>{emp.name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* 2. Kekuatan Utama */}
                          <td className="py-3.5 px-3.5 text-slate-900 border-r border-slate-200 leading-relaxed">
                            {strengthsText}
                          </td>

                          {/* 3. Area Pengembangan */}
                          <td className="py-3.5 px-3.5 text-slate-900 border-r border-slate-200 leading-relaxed">
                            {devText}
                          </td>

                          {/* 4. Keterangan Lain / Fokus Follow-up */}
                          {editingFollowUpEmpId === emp.id ? (
                            <td className="py-3.5 px-3.5 text-slate-900 bg-blue-50/50 border-l-2 border-l-blue-600 shadow-inner">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit Fokus Follow-up ({emp.name}):</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRefineFollowUpWithAI(emp, editingFollowUpText)}
                                    className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shadow-2xs"
                                    title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                    <span>Rapihkan (AI)</span>
                                  </button>
                                </div>

                                <textarea
                                  value={editingFollowUpText}
                                  onChange={(e) => setEditingFollowUpText(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  className="w-full text-xs sm:text-[13px] p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900 shadow-2xs"
                                  placeholder="Tuliskan rekomendasi tindakan, program IDP, pembinaan, atau fokus follow-up..."
                                />

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditFollowUp(emp)}
                                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Simpan</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingFollowUpText(getIdealFollowUpText(emp))}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                                      title="Kembalikan catatan follow-up ke standar ideal"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Reset Ke Ideal</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditFollowUp}
                                      className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFollowUpEmpId(null);
                                      setEditingEmployeeForSummary(emp);
                                    }}
                                    className="text-[11px] text-slate-500 hover:text-blue-700 hover:underline flex items-center space-x-1 cursor-pointer"
                                    title="Buka form edit data asesmen lengkap"
                                  >
                                    <span>Edit Selengkapnya</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <td className="py-3.5 px-3.5 text-slate-900 leading-relaxed align-top relative group/followup">
                              <div className="flex flex-col justify-between h-full space-y-2.5">
                                <div className="text-xs sm:text-[13px] leading-relaxed text-slate-900">
                                  {followUpText}
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 opacity-95 group-hover/followup:opacity-100 transition-opacity">
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditFollowUp(emp)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1a4b77] hover:text-blue-900 text-[11px] font-semibold transition-colors border border-blue-200 cursor-pointer shadow-2xs"
                                      title="Edit catatan fokus follow-up ini"
                                    >
                                      <Pencil className="w-3 h-3 text-blue-600" />
                                      <span>Edit Follow-up</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRefineFollowUpWithAI(emp)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 text-[11px] font-medium transition-colors border border-purple-200 cursor-pointer shadow-2xs"
                                      title="Rapihkan tata bahasa dan gaya eksekutif dengan AI Gemini"
                                    >
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                      <span>Rapihkan AI</span>
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setEditingEmployeeForSummary(emp)}
                                    className="text-[10.5px] text-slate-400 hover:text-blue-600 opacity-0 group-hover/followup:opacity-100 transition-opacity hover:underline cursor-pointer"
                                    title="Buka form edit data asesmen lengkap"
                                  >
                                    Form Lengkap
                                  </button>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note (Only visible when there is assessment data) */}
        {displayedEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
            <div className="text-slate-400 italic">
              * Klik nama karyawan untuk membuka radar kompetensi & detail rencana aksi pengembangan.
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. PRIORITAS DEVELOPMENT KOLEKTIF                                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Title: 5. Prioritas Development Kolektif */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1b4d79] flex items-center space-x-2">
              <span>5. Prioritas Development Kolektif</span>
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed max-w-4xl">
              <span className="font-semibold text-slate-900">Scope:</span> Rekapitulasi analisis kebutuhan intervensi pengembangan kolektif untuk seluruh karyawan asesmen ({displayedEmployees.length} peserta), memetakan kompetensi prioritas intervensi HR & L&D, frekuensi temuan gap, mitigasi dampak risiko bila tidak dikembangkan, dan rekomendasi program intervensi spesifik.
            </p>
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 font-medium">
            Confidential HR Summary
          </div>
        </div>

        {/* Collective Development Priority Table (Dynamically analyzed from uploaded employee assessments) */}
        <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#e9f2f8] text-[#1a4b77] border-b border-slate-300">
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-56 min-w-[220px]">
                    Area Development Kolektif
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 w-28 min-w-[100px] text-center">
                    Frekuensi
                  </th>
                  <th className="py-3 px-3.5 font-bold border-r border-slate-300 min-w-[320px]">
                    Dampak Jika Tidak Dikembangkan
                  </th>
                  <th className="py-3 px-3.5 font-bold min-w-[320px]">
                    <div className="flex items-center justify-between gap-2">
                      <span>Rekomendasi Program</span>
                      <span className="inline-flex items-center space-x-1 text-[10.5px] font-normal text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                        <Pencil className="w-2.5 h-2.5 text-blue-600" />
                        <span>Bisa Diedit</span>
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {collectiveDevelopmentList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-slate-400 italic">
                      Tidak ditemukan data area pengembangan dari berkas asesmen yang diunggah.
                    </td>
                  </tr>
                ) : (
                  (showAllPriorities ? collectiveDevelopmentList : collectiveDevelopmentList.slice(0, 7)).map((item, idx) => {
                    const isHighFrequency = item.count >= Math.ceil(displayedEmployees.length * 0.5);
                    const isExpanded = expandedPriorityKey === item.key;

                    return (
                      <React.Fragment key={item.key || idx}>
                        <tr className="hover:bg-slate-50/80 transition-colors align-top">
                          {/* Column 1: Area Development Kolektif */}
                          <td className="py-3.5 px-3.5 font-bold text-slate-900 border-r border-slate-200">
                            <div className="flex items-start justify-between gap-2">
                              <span>{item.name}</span>
                              {item.affectedEmployees.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedPriorityKey(isExpanded ? null : item.key)}
                                  className="text-[10px] text-[#1b4d79] hover:text-blue-800 hover:underline font-semibold shrink-0 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/60 cursor-pointer"
                                  title="Lihat daftar karyawan terkait"
                                >
                                  {isExpanded ? 'Tutup' : 'Peserta'}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Column 2: Frekuensi */}
                          <td className={`py-3.5 px-3.5 text-center font-bold border-r border-slate-200 ${
                            isHighFrequency ? 'bg-amber-50/60 text-slate-900' : 'text-slate-900'
                          }`}>
                            <span className="inline-block">{item.frequencyText}</span>
                          </td>

                          {/* Column 3: Dampak Jika Tidak Dikembangkan */}
                          <td className="py-3.5 px-3.5 text-slate-900 border-r border-slate-200 leading-relaxed">
                            {item.impact}
                          </td>

                          {/* Column 4: Rekomendasi Program */}
                          {editingCollectiveKey === item.key ? (
                            <td className="py-3.5 px-3.5 text-slate-900 bg-blue-50/50 border-l-2 border-l-blue-600 shadow-inner">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-blue-900 flex items-center space-x-1.5">
                                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Edit Rekomendasi Program ({item.name}):</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRefineCollectiveProgramWithAI(item, editingCollectiveProgramText)}
                                    className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer shadow-2xs"
                                    title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                    <span>Rapihkan (AI)</span>
                                  </button>
                                </div>

                                <textarea
                                  value={editingCollectiveProgramText}
                                  onChange={(e) => setEditingCollectiveProgramText(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  className="w-full text-xs sm:text-[13px] p-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white leading-relaxed text-slate-900 shadow-2xs"
                                  placeholder="Tuliskan rekomendasi program pelatihan, lokakarya, atau intervensi L&D..."
                                />

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditCollectiveProgram(item.key)}
                                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Simpan</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingCollectiveProgramText(item.program || '');
                                        setCustomCollectivePrograms(prev => {
                                          const next = { ...prev };
                                          delete next[item.key];
                                          return next;
                                        });
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                                      title="Kembalikan rekomendasi program ke standar ideal"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Reset Ke Ideal</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEditCollectiveProgram}
                                      className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          ) : (
                            <td className="py-3.5 px-3.5 text-slate-900 leading-relaxed align-top relative group/prog">
                              <div className="flex flex-col justify-between h-full space-y-2.5">
                                <div className="text-xs sm:text-[13px] leading-relaxed text-slate-900">
                                  {item.recommendedProgram}
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 opacity-95 group-hover/prog:opacity-100 transition-opacity">
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditCollectiveProgram(item)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#1a4b77] hover:text-blue-900 text-[11px] font-semibold transition-colors border border-blue-200 cursor-pointer shadow-2xs"
                                      title="Edit rekomendasi program ini"
                                    >
                                      <Pencil className="w-3 h-3 text-blue-600" />
                                      <span>Edit Program</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRefineCollectiveProgramWithAI(item)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-900 text-[11px] font-medium transition-colors border border-purple-200 cursor-pointer shadow-2xs"
                                      title="Rapihkan tata bahasa dan gaya eksekutif dengan AI Gemini"
                                    >
                                      <Sparkles className="w-3 h-3 text-purple-600" />
                                      <span>Rapihkan AI</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>

                        {/* Collapsible Sub-Row: Affected Employees */}
                        {isExpanded && item.affectedEmployees.length > 0 && (
                          <tr className="bg-slate-50/95 border-b border-slate-200">
                            <td colSpan={4} className="py-2.5 px-4">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-semibold text-slate-700 flex items-center space-x-1">
                                  <Users className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
                                  <span>Karyawan dengan kebutuhan development ini ({item.affectedEmployees.length}):</span>
                                </span>
                                {item.affectedEmployees.map((emp) => (
                                  <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => {
                                      const fullEmp = employees.find(e => e.id === emp.id);
                                      if (fullEmp && onSelectEmployee) {
                                        onSelectEmployee(fullEmp);
                                      }
                                      if (onGoToIndividualView) {
                                        onGoToIndividualView(emp.id);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer shadow-2xs"
                                    title={`Buka radar kompetensi & profil ${emp.name}`}
                                  >
                                    <span className="font-semibold">{emp.name}</span>
                                    <span className="text-slate-400 ml-1 text-[10px]">({emp.position})</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toggle to view all priorities if more than 7 */}
        {collectiveDevelopmentList.length > 7 && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowAllPriorities(!showAllPriorities)}
              className="px-4 py-2 text-xs font-bold text-[#1b4d79] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <span>
                {showAllPriorities 
                  ? 'Tampilkan 7 Prioritas Utama Saja' 
                  : `Tampilkan Seluruh Area Gap (${collectiveDevelopmentList.length} Area Teridentifikasi)`}
              </span>
              {showAllPriorities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Document Footer Notes & Official Signatures matching official report */}
        {employees.length > 0 && (
          <div className="space-y-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="space-y-1.5 text-[11px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
                <span>Prepared from uploaded assessment reports | Internal use only</span>
                <span>Confidential HR Summary</span>
              </div>
              <div className="italic text-slate-600 font-medium">
                Catatan: Nilai IQ mengacu pada hasil psikotes/assessment dengan Skala TIKI sesuai dokumen masing-masing peserta.
              </div>
            </div>

            {/* 3 Column Signature Block */}
            <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-700">
              <div className="space-y-12">
                <div className="text-xs font-medium text-slate-600">Dipersiapkan oleh,</div>
                <div className="border-t border-slate-300 pt-2 font-bold text-slate-900 text-xs">
                  OD Asst. Manager
                </div>
              </div>
              <div className="space-y-12">
                <div className="text-xs font-medium text-slate-600">Direview oleh,</div>
                <div className="border-t border-slate-300 pt-2 font-bold text-slate-900 text-xs">
                  HR Manager
                </div>
              </div>
              <div className="space-y-12">
                <div className="text-xs font-medium text-slate-600">Disetujui oleh,</div>
                <div className="border-t border-slate-300 pt-2 font-bold text-slate-900 text-xs">
                  Head of Department
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback for Division Updates */}
      {divisionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{divisionToast}</span>
          <button 
            type="button" 
            onClick={() => setDivisionToast(null)} 
            className="p-1 hover:text-slate-300 ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick Edit Single Employee Division Modal */}
      {inlineEditingEmpId && (() => {
        const targetEmp = employees.find(e => e.id === inlineEditingEmpId);
        if (!targetEmp) return null;
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Edit Divisi Karyawan</h3>
                    <p className="text-[11px] text-slate-500">{targetEmp.name} &bull; {targetEmp.evaluatedPosition || targetEmp.position}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInlineEditingEmpId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Divisi / Departemen:
                  </label>
                  <input
                    type="text"
                    value={inlineEditingDivision}
                    onChange={(e) => setInlineEditingDivision(e.target.value)}
                    placeholder="Contoh: Teknologi Informasi, Keuangan, Operasional..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveDivisionDirect(targetEmp.id, inlineEditingDivision);
                      } else if (e.key === 'Escape') {
                        setInlineEditingEmpId(null);
                      }
                    }}
                  />
                </div>

                {/* Quick suggestions pills */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                    Pilih Cepat Divisi yang Ada:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {commonDivisionSuggestions.map(dept => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setInlineEditingDivision(dept)}
                        className={`px-2 py-1 text-[11px] rounded-md transition-colors cursor-pointer border ${
                          inlineEditingDivision === dept
                            ? 'bg-teal-700 text-white border-teal-700 font-semibold'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setInlineEditingEmpId(null);
                    handleOpenDivisionModal();
                  }}
                  className="text-xs text-teal-700 hover:text-teal-800 hover:underline font-medium cursor-pointer"
                >
                  Buka Kelola Semua Divisi &rarr;
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setInlineEditingEmpId(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveDivisionDirect(targetEmp.id, inlineEditingDivision)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Full Division Management Modal */}
      {isDivisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manajemen & Edit Divisi Karyawan</h3>
                  <p className="text-xs text-slate-500">
                    Ubah divisi secara langsung atau pilih cepat. Klik <strong>Simpan</strong> pada baris untuk menyimpan di tempat, lalu klik <strong>Selesai</strong> setelah selesai.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFinishDivisionModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Tutup dan Terapkan Perubahan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner in Modal if active */}
            {modalFeedbackBanner && (
              <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{modalFeedbackBanner}</span>
              </div>
            )}

            {/* Filter & Bulk Action Toolbar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={divisionModalSearch}
                    onChange={(e) => setDivisionModalSearch(e.target.value)}
                    placeholder="Cari nama, NIP, jabatan..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                {/* Filter by Division */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-slate-600 shrink-0">Filter Divisi:</span>
                  <select
                    value={divisionModalFilter}
                    onChange={(e) => setDivisionModalFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Divisi ({employees.length})</option>
                    {distinctDivisions.map(dept => {
                      const count = employees.filter(e => {
                        const initDept = modalInitialDeptMap[e.id] !== undefined ? modalInitialDeptMap[e.id] : (e.department || '').trim();
                        return initDept === dept;
                      }).length;
                      return (
                        <option key={dept} value={dept}>
                          {dept} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Bulk Apply Bar */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = employees.filter(emp => {
                        const initDept = modalInitialDeptMap[emp.id] !== undefined ? modalInitialDeptMap[emp.id] : (emp.department || '').trim();
                        const currentDraft = customDivisionInputs[emp.id] !== undefined ? customDivisionInputs[emp.id] : (emp.department || '').trim();
                        const matchDept = divisionModalFilter === 'ALL' || initDept === divisionModalFilter;
                        const matchSearch = !divisionModalSearch || 
                          emp.name.toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                          (emp.nip || '').toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                          (emp.evaluatedPosition || emp.position).toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                          currentDraft.toLowerCase().includes(divisionModalSearch.toLowerCase());
                        return matchSearch && matchDept;
                      });
                      if (selectedDivisionEmpIds.length === filtered.length && filtered.length > 0) {
                        setSelectedDivisionEmpIds([]);
                      } else {
                        setSelectedDivisionEmpIds(filtered.map(e => e.id));
                      }
                    }}
                    className="flex items-center space-x-1.5 font-semibold text-slate-700 hover:text-slate-900 cursor-pointer px-2 py-1 rounded hover:bg-slate-200/60"
                  >
                    {selectedDivisionEmpIds.length > 0 && selectedDivisionEmpIds.length === employees.length ? (
                      <CheckSquare className="w-4 h-4 text-teal-700" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>Pilih Semua ({selectedDivisionEmpIds.length} terpilih)</span>
                  </button>
                </div>

                {/* Bulk assign input */}
                {selectedDivisionEmpIds.length > 0 && (
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={bulkDivisionInput}
                      onChange={(e) => setBulkDivisionInput(e.target.value)}
                      placeholder="Ketik divisi baru..."
                      className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 w-44"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) setBulkDivisionInput(e.target.value);
                      }}
                      className="text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Pilih Saran --</option>
                      {commonDivisionSuggestions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleBulkSaveDivisionInModal(bulkDivisionInput)}
                      disabled={!bulkDivisionInput.trim()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Terapkan ({selectedDivisionEmpIds.length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="overflow-y-auto p-4 flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="py-2.5 px-3 w-10 text-center">
                      #
                    </th>
                    <th className="py-2.5 px-3 font-bold w-52">
                      Nama & Jabatan
                    </th>
                    <th className="py-2.5 px-3 font-bold w-60">
                      Divisi Saat Ini & Edit
                    </th>
                    <th className="py-2.5 px-3 font-bold min-w-[200px]">
                      Pilih Cepat Divisi
                    </th>
                    <th className="py-2.5 px-3 text-center w-28">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees
                    .filter(emp => {
                      const initDept = modalInitialDeptMap[emp.id] !== undefined ? modalInitialDeptMap[emp.id] : (emp.department || '').trim();
                      const currentDraft = customDivisionInputs[emp.id] !== undefined ? customDivisionInputs[emp.id] : (emp.department || '').trim();
                      const matchDept = divisionModalFilter === 'ALL' || initDept === divisionModalFilter;
                      const matchSearch = !divisionModalSearch || 
                        emp.name.toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                        (emp.nip || '').toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                        (emp.evaluatedPosition || emp.position).toLowerCase().includes(divisionModalSearch.toLowerCase()) ||
                        currentDraft.toLowerCase().includes(divisionModalSearch.toLowerCase());
                      return matchSearch && matchDept;
                    })
                    .map((emp) => {
                      const isSelected = selectedDivisionEmpIds.includes(emp.id);
                      const currentVal = customDivisionInputs[emp.id] !== undefined 
                        ? customDivisionInputs[emp.id] 
                        : (emp.department || '');
                      const isSaved = savedRowFeedbacks[emp.id];
                      const isDifferentFromBase = currentVal.trim() !== (emp.department || '').trim();

                      return (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-teal-50/40' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDivisionEmpIds(prev => [...prev, emp.id]);
                                } else {
                                  setSelectedDivisionEmpIds(prev => prev.filter(id => id !== emp.id));
                                }
                              }}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>

                          {/* Nama & Jabatan */}
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-500">{emp.evaluatedPosition || emp.position}</div>
                            {emp.nip && <div className="text-[10px] font-mono text-slate-400">NIP: {emp.nip}</div>}
                          </td>

                          {/* Editable Division Input */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomDivisionInputs(prev => ({ ...prev, [emp.id]: val }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveDivisionInModal(emp.id, currentVal);
                                  }
                                }}
                                placeholder="Ketik nama divisi..."
                                className={`w-full text-xs px-2.5 py-1.5 border rounded-lg focus:outline-none focus:ring-2 font-medium transition-all ${
                                  isDifferentFromBase 
                                    ? 'border-teal-500 bg-teal-50/20 ring-1 ring-teal-500 focus:ring-teal-600' 
                                    : 'border-slate-300 focus:ring-teal-600'
                                }`}
                              />
                              {isDifferentFromBase && !isSaved && (
                                <div className="text-[10px] text-teal-700 font-semibold flex items-center space-x-1">
                                  <span>• Perubahan belum disimpan di baris ini</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Quick Suggestion Chips */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                              {distinctDivisions.map(dept => {
                                const isCurrentSelected = currentVal.trim() === dept;
                                return (
                                  <button
                                    key={dept}
                                    type="button"
                                    onClick={() => {
                                      handleSaveDivisionInModal(emp.id, dept);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[10.5px] transition-colors cursor-pointer border ${
                                      isCurrentSelected
                                        ? 'bg-teal-700 text-white border-teal-700 font-semibold shadow-2xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                    }`}
                                    title={`Set divisi ke "${dept}"`}
                                  >
                                    {dept}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Save Button */}
                          <td className="py-3 px-3 text-center">
                            {isSaved ? (
                              <button
                                type="button"
                                onClick={() => handleSaveDivisionInModal(emp.id, currentVal)}
                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all cursor-pointer shadow-2xs flex items-center justify-center space-x-1 mx-auto"
                                title="Tersimpan! Klik lagi jika ingin memperbarui"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Tersimpan</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSaveDivisionInModal(emp.id, currentVal)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center justify-center space-x-1 mx-auto ${
                                  isDifferentFromBase 
                                    ? 'bg-teal-700 text-white hover:bg-teal-800 ring-2 ring-teal-600/30' 
                                    : 'bg-teal-50 text-teal-800 hover:bg-teal-700 hover:text-white border border-teal-200'
                                }`}
                                title="Simpan divisi untuk karyawan ini (tetap di halaman ini)"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Simpan</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 flex items-center space-x-2">
                <span>Total <strong>{employees.length}</strong> karyawan &bull; <strong>{distinctDivisions.length}</strong> divisi aktif</span>
                {pendingChangesCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200 animate-pulse">
                    {pendingChangesCount} perubahan siap disimpan
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleFinishDivisionModal}
                className="px-6 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Selesai{pendingChangesCount > 0 ? ` (${pendingChangesCount})` : ''}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Text Refinement (Rapihkan Bahasa) Modal */}
      <TextRefinementModal
        isOpen={isRefineModalOpen}
        onClose={() => setIsRefineModalOpen(false)}
        initialText={refineModalText}
        context={refineModalContext}
        title={refineModalTitle}
        onApply={(refinedText) => {
          if (refineApplyHandler) {
            refineApplyHandler(refinedText);
          }
        }}
      />

      {/* Employee Selector per Division Modal */}
      <EmployeeDivisionSelectorModal
        isOpen={isEmployeeSelectorModalOpen}
        onClose={() => setIsEmployeeSelectorModalOpen(false)}
        employees={employees}
        selectedEmployeeIds={selectedDisplayEmployeeIds}
        selectedDivision={selectedDivisionFilter}
        onApply={(selectedIds, division) => {
          setSelectedDisplayEmployeeIds(selectedIds);
          setSelectedDivisionFilter(division);
          setHasUserAppliedFilter(true);
          setGeneralToast(`Menampilkan ${selectedIds.length} karyawan terpilih untuk Executive Summary.`);
          setTimeout(() => setGeneralToast(null), 3500);
        }}
      />

      {/* Full Executive Document AI Refinement Modal */}
      <FullExecutiveRefinementModal
        isOpen={isFullRefinementModalOpen}
        onClose={() => setIsFullRefinementModalOpen(false)}
        employees={displayedEmployees}
        currentExecutiveNote={customNoteOverride || synchronizedPattern.rawText}
        currentHrRemarks={hrRemarks}
        onApply={handleApplyFullExecutiveRefinement}
      />

      {/* Quick Edit Employee Assessment Summary Modal */}
      {editingEmployeeForSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#1b4d79] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <Edit3 className="w-5 h-5 text-sky-300" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Edit Hasil Asesmen Karyawan</h3>
                  <p className="text-xs text-sky-200">{editingEmployeeForSummary.name} ({editingEmployeeForSummary.department || 'Divisi'})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployeeForSummary(null)}
                className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Posisi yang Dinilai */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Posisi yang Dinilai</label>
                  <input
                    type="text"
                    value={editingEmployeeForSummary.evaluatedPosition || editingEmployeeForSummary.position || ''}
                    onChange={(e) => setEditingEmployeeForSummary({
                      ...editingEmployeeForSummary,
                      evaluatedPosition: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                    placeholder="Contoh: Manager Operasional"
                  />
                </div>

                {/* Status Rekomendasi */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Rekomendasi</label>
                  <select
                    value={editingEmployeeForSummary.recommendationCategory || 'Dapat Disarankan'}
                    onChange={(e) => setEditingEmployeeForSummary({
                      ...editingEmployeeForSummary,
                      recommendationCategory: e.target.value as 'Dapat Disarankan' | 'Dipertimbangkan' | 'Tidak Disarankan'
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none bg-white font-medium"
                  >
                    <option value="Dapat Disarankan">Dapat Disarankan</option>
                    <option value="Dipertimbangkan">Dipertimbangkan</option>
                    <option value="Tidak Disarankan">Tidak Disarankan</option>
                  </select>
                </div>

                {/* Skor Pemenuhan Kompetensi (%) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pemenuhan Kompetensi (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={editingEmployeeForSummary.overallScore}
                    onChange={(e) => setEditingEmployeeForSummary({
                      ...editingEmployeeForSummary,
                      overallScore: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                  />
                </div>

                {/* Skor IQ & Kapasitas IQ */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Skor IQ (Hasil Tes Psikometri)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={50}
                      max={170}
                      value={editingEmployeeForSummary.iqScore || 100}
                      onChange={(e) => {
                        const newIq = Number(e.target.value);
                        setEditingEmployeeForSummary({
                          ...editingEmployeeForSummary,
                          iqScore: newIq,
                          thinkingCapacity: formatThinkingCapacity({ iqScore: newIq })
                        });
                      }}
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200">
                      {formatThinkingCapacity(editingEmployeeForSummary)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Kompetensi yang Perlu Dikembangkan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kompetensi yang Perlu Dikembangkan (Pisahkan dengan titik koma atau baris baru)</label>
                <textarea
                  rows={3}
                  value={
                    editingEmployeeForSummary.competenciesToDevelop && editingEmployeeForSummary.competenciesToDevelop.length > 0
                      ? editingEmployeeForSummary.competenciesToDevelop.join('; ')
                      : (editingEmployeeForSummary.developmentAreas || (editingEmployeeForSummary.weaknesses || []).join('; '))
                  }
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    const items = rawVal.split(/\r?\n|;/).map(s => s.trim()).filter(Boolean);
                    setEditingEmployeeForSummary({
                      ...editingEmployeeForSummary,
                      competenciesToDevelop: items,
                      developmentAreas: rawVal
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                  placeholder="Contoh: Strategic Thinking; Coaching & Mentoring; Delegation"
                />
              </div>

              {/* Kekuatan Utama */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Kekuatan Utama (Strengths)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const curText = editingEmployeeForSummary.mainStrengths || 
                        (editingEmployeeForSummary.strengths && editingEmployeeForSummary.strengths.length > 0 ? editingEmployeeForSummary.strengths.join('; ') : '');
                      setRefineModalText(curText);
                      setRefineModalContext('executive_summary');
                      setRefineModalTitle(`Rapihkan Kekuatan Utama - ${editingEmployeeForSummary.name}`);
                      setRefineApplyHandler(() => (refinedText: string) => {
                        setEditingEmployeeForSummary({
                          ...editingEmployeeForSummary,
                          mainStrengths: refinedText
                        });
                      });
                      setIsRefineModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded font-medium border border-purple-200 transition-colors cursor-pointer"
                    title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Rapihkan AI</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={
                    editingEmployeeForSummary.mainStrengths !== undefined 
                      ? editingEmployeeForSummary.mainStrengths 
                      : (editingEmployeeForSummary.strengths && editingEmployeeForSummary.strengths.length > 0 ? editingEmployeeForSummary.strengths.join('; ') : '')
                  }
                  onChange={(e) => setEditingEmployeeForSummary({
                    ...editingEmployeeForSummary,
                    mainStrengths: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                  placeholder="Kekuatan utama, keunggulan teknis, atau kapabilitas strategis kandidat..."
                />
              </div>

              {/* Matriks 14 Skor Kompetensi (Presisi Sesuai Dokumen) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5 text-[#1a4b77]" />
                      <span>Kalibrasi Skor 14 Indikator Kompetensi (Skala 1 - 5)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pastikan skor tiap indikator akurat dan persis sesuai lembar penilaian dokumen asesmen.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                    <span className="inline-flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span><span>1-2: Gap</span></span>
                    <span className="inline-flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span><span>3: Standar</span></span>
                    <span className="inline-flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span><span>4-5: Kekuatan</span></span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {COMPETENCY_SCORE_MATRIX.map((group) => (
                    <div key={group.categoryName} className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
                      <div className="text-[11px] font-bold text-[#1a4b77] mb-1.5 pb-1 border-b border-slate-100 flex items-center justify-between">
                        <span>{group.number}. {group.categoryName}</span>
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((item) => {
                          const currentScore = resolveEmployeeCompetencyScore(editingEmployeeForSummary, item);
                          return (
                            <div key={item.name} className="flex items-center justify-between py-1 px-1.5 hover:bg-slate-50 rounded transition-colors text-xs">
                              <span className="text-slate-700 font-medium truncate max-w-[280px]">{item.name}</span>
                              <div className="flex items-center space-x-1 shrink-0">
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                      const updatedMatrix = {
                                        ...(editingEmployeeForSummary.competencyMatrixScores || {}),
                                        [item.name]: num
                                      };
                                      setEditingEmployeeForSummary({
                                        ...editingEmployeeForSummary,
                                        competencyMatrixScores: updatedMatrix
                                      });
                                    }}
                                    className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                      currentScore === num
                                        ? num >= 4
                                          ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                                          : num === 3
                                          ? 'bg-slate-700 text-white shadow-2xs ring-2 ring-slate-300'
                                          : 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-300'
                                        : num >= 4
                                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                        : num === 3
                                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reading Singkat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Reading Singkat / Catatan Diagnostik</label>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const ideal = getIdealReadingText(editingEmployeeForSummary);
                        setEditingEmployeeForSummary({
                          ...editingEmployeeForSummary,
                          briefReading: ideal,
                          keyInsights: ideal
                        });
                      }}
                      className="inline-flex items-center space-x-1 text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded font-medium border border-amber-200 transition-colors cursor-pointer"
                      title="Kembalikan ke standar ideal"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-600" />
                      <span>Reset Ideal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curText = editingEmployeeForSummary.briefReading || editingEmployeeForSummary.keyInsights || getIdealReadingText(editingEmployeeForSummary);
                        setRefineModalText(curText);
                        setRefineModalContext('executive_summary');
                        setRefineModalTitle(`Rapihkan Reading Singkat - ${editingEmployeeForSummary.name}`);
                        setRefineApplyHandler(() => (refinedText: string) => {
                          setEditingEmployeeForSummary({
                            ...editingEmployeeForSummary,
                            briefReading: refinedText,
                            keyInsights: refinedText
                          });
                        });
                        setIsRefineModalOpen(true);
                      }}
                      className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded font-medium border border-purple-200 transition-colors cursor-pointer"
                      title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Rapihkan AI</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={editingEmployeeForSummary.briefReading || editingEmployeeForSummary.keyInsights || getIdealReadingText(editingEmployeeForSummary)}
                  onChange={(e) => setEditingEmployeeForSummary({
                    ...editingEmployeeForSummary,
                    briefReading: e.target.value,
                    keyInsights: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                  placeholder="Deskripsi singkat profil diagnostik dan gaya kerja kandidat..."
                />
              </div>

              {/* Keterangan Lain / Fokus Follow-up */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Keterangan Lain / Fokus Follow-up</label>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const ideal = getIdealFollowUpText(editingEmployeeForSummary);
                        setEditingEmployeeForSummary({
                          ...editingEmployeeForSummary,
                          followUpNotes: ideal
                        });
                      }}
                      className="inline-flex items-center space-x-1 text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded font-medium border border-amber-200 transition-colors cursor-pointer"
                      title="Kembalikan ke standar ideal"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-600" />
                      <span>Reset Ideal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curText = editingEmployeeForSummary.followUpNotes || getDefaultFollowUpText(editingEmployeeForSummary);
                        setRefineModalText(curText);
                        setRefineModalContext('executive_summary');
                        setRefineModalTitle(`Rapihkan Catatan Follow-up - ${editingEmployeeForSummary.name}`);
                        setRefineApplyHandler(() => (refinedText: string) => {
                          setEditingEmployeeForSummary({
                            ...editingEmployeeForSummary,
                            followUpNotes: refinedText
                          });
                        });
                        setIsRefineModalOpen(true);
                      }}
                      className="inline-flex items-center space-x-1 text-[11px] text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded font-medium border border-purple-200 transition-colors cursor-pointer"
                      title="Rapihkan tata bahasa eksekutif dengan AI Gemini"
                    >
                      <Sparkles className="w-3 h-3 text-purple-600" />
                      <span>Rapihkan AI</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={
                    editingEmployeeForSummary.followUpNotes !== undefined 
                      ? editingEmployeeForSummary.followUpNotes 
                      : getDefaultFollowUpText(editingEmployeeForSummary)
                  }
                  onChange={(e) => setEditingEmployeeForSummary({
                    ...editingEmployeeForSummary,
                    followUpNotes: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#1b4d79] focus:outline-none"
                  placeholder="Rekomendasi tindak lanjut, mentoring, assignment lintas divisi, atau fokus IDP..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setEditingEmployeeForSummary(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingEmployeeForSummary) {
                    const updated = {
                      ...editingEmployeeForSummary,
                      thinkingCapacity: formatThinkingCapacity(editingEmployeeForSummary)
                    };
                    if (updated.briefReading) {
                      setCustomReadingOverrides(prev => ({ ...prev, [updated.id]: updated.briefReading! }));
                    }
                    if (updated.followUpNotes) {
                      setCustomFollowUpOverrides(prev => ({ ...prev, [updated.id]: updated.followUpNotes! }));
                    }
                    initialReadingsRef.current[updated.id] = {
                      briefReading: updated.briefReading || '',
                      followUpNotes: updated.followUpNotes || ''
                    };
                    if (onUpdateEmployee) {
                      onUpdateEmployee(updated);
                    }
                    setGeneralToast(`Data hasil asesmen untuk ${updated.name} berhasil diperbarui.`);
                    setTimeout(() => setGeneralToast(null), 3500);
                  }
                  setEditingEmployeeForSummary(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1b4d79] hover:bg-[#14395a] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

