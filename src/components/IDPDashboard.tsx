import React, { useState, useEffect } from 'react';
import { Employee, IDPGoal, IDPActionItem, CategoryType, PriorityLevel, GoalStatus } from '../types';
import { 
  Target, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  UserCheck, 
  MessageSquare, 
  Award,
  Loader2,
  Trash2,
  ListTodo,
  FileDown,
  Edit3,
  Check
} from 'lucide-react';
import { exportEmployeeAssessmentPdf } from '../utils/pdfExport';
import { TextRefinementModal } from './TextRefinementModal';

interface IDPDashboardProps {
  employees: Employee[];
  selectedEmployeeId?: string;
  onUpdateEmployeeIDP: (employeeId: string, updatedGoals: IDPGoal[]) => void;
}

export const IDPDashboard: React.FC<IDPDashboardProps> = ({
  employees,
  selectedEmployeeId,
  onUpdateEmployeeIDP
}) => {
  const [activeEmpId, setActiveEmpId] = useState<string>(
    selectedEmployeeId || employees[0]?.id || ''
  );

  useEffect(() => {
    if (selectedEmployeeId && employees.some(e => e.id === selectedEmployeeId)) {
      setActiveEmpId(selectedEmployeeId);
    } else if (!activeEmpId && employees.length > 0) {
      setActiveEmpId(employees[0].id);
    }
  }, [selectedEmployeeId, employees]);

  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // AI Language Refinement (Rapihkan Bahasa) States
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineModalText, setRefineModalText] = useState('');
  const [refineModalContext, setRefineModalContext] = useState<'executive_summary' | 'catatan_pola' | 'idp_goal' | 'manager_notes' | 'strengths_weaknesses'>('idp_goal');
  const [refineModalTitle, setRefineModalTitle] = useState('Rapihkan Bahasa IDP (AI Gemini)');
  const [refineApplyHandler, setRefineApplyHandler] = useState<((text: string) => void) | null>(null);

  // New Goal Modal State
  const [showAddGoalModal, setShowAddGoalModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<CategoryType>('Pelatihan / Kursus');
  const [newCompetency, setNewCompetency] = useState<string>('Kepemimpinan (Leadership)');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('Tinggi');
  const [newTargetDate, setNewTargetDate] = useState<string>('2026-11-30');
  const [newMetrics, setNewMetrics] = useState<string>('');
  const [newManagerNotes, setNewManagerNotes] = useState<string>('');

  // New Action Item Input State
  const [newActionTasks, setNewActionTasks] = useState<Record<string, string>>({});

  // Editing Goal Modal State
  const [editingGoal, setEditingGoal] = useState<IDPGoal | null>(null);

  const currentEmp = employees.find(e => e.id === activeEmpId) || employees[0];
  const safeGoals = currentEmp?.idp?.goals || [];

  // Toggle goal collapse/expand
  const toggleExpand = (goalId: string) => {
    setExpandedGoals(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  // Recalculate and trigger update
  const saveGoalChanges = (employeeId: string, newGoals: IDPGoal[]) => {
    onUpdateEmployeeIDP(employeeId, newGoals);
  };

  // Toggle Action Item completion
  const handleToggleActionItem = (goalId: string, actionId: string) => {
    if (!currentEmp) return;

    const updatedGoals = safeGoals.map(goal => {
      if (goal.id !== goalId) return goal;

      const updatedActions = (goal.actionItems || []).map(act => {
        if (act.id === actionId) {
          return { ...act, completed: !act.completed };
        }
        return act;
      });

      // Auto update goal status if all completed
      const allDone = updatedActions.length > 0 && updatedActions.every(a => a.completed);
      const newStatus: GoalStatus = allDone ? 'Selesai' : 'Berjalan';

      return {
        ...goal,
        actionItems: updatedActions,
        status: newStatus
      };
    });

    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Add Action Item to Goal
  const handleAddActionItem = (goalId: string) => {
    const taskText = newActionTasks[goalId];
    if (!taskText || !taskText.trim() || !currentEmp) return;

    const updatedGoals = safeGoals.map(goal => {
      if (goal.id !== goalId) return goal;

      const newAction: IDPActionItem = {
        id: `act-user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        task: taskText.trim(),
        completed: false,
        dueDate: '2026-10-30'
      };

      return {
        ...goal,
        actionItems: [...(goal.actionItems || []), newAction]
      };
    });

    saveGoalChanges(currentEmp.id, updatedGoals);
    setNewActionTasks(prev => ({ ...prev, [goalId]: '' }));
  };

  // Delete Goal
  const handleDeleteGoal = (goalId: string) => {
    if (!currentEmp) return;
    const updatedGoals = safeGoals.filter(g => g.id !== goalId);
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Delete Action Item inside Goal
  const handleDeleteActionItem = (goalId: string, actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentEmp) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        actionItems: (g.actionItems || []).filter(a => a.id !== actionId)
      };
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Update Goal Status
  const handleStatusChange = (goalId: string, status: GoalStatus) => {
    if (!currentEmp) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id === goalId) return { ...g, status };
      return g;
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Update Goal Target Date directly
  const handleTargetDateChange = (goalId: string, newDate: string) => {
    if (!currentEmp || !newDate) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id === goalId) return { ...g, targetDate: newDate };
      return g;
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Update Action Item Due Date directly
  const handleActionDueDateChange = (goalId: string, actionId: string, newDueDate: string) => {
    if (!currentEmp || !newDueDate) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        actionItems: (g.actionItems || []).map(a => {
          if (a.id === actionId) return { ...a, dueDate: newDueDate };
          return a;
        })
      };
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Save Full Edited Goal from Modal
  const handleSaveEditedGoal = (updatedGoal: IDPGoal) => {
    if (!currentEmp) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id === updatedGoal.id) return updatedGoal;
      return g;
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
    setEditingGoal(null);
  };

  // Update Manager Notes
  const handleManagerNotesChange = (goalId: string, notes: string) => {
    if (!currentEmp) return;
    const updatedGoals = safeGoals.map(g => {
      if (g.id === goalId) return { ...g, managerNotes: notes };
      return g;
    });
    saveGoalChanges(currentEmp.id, updatedGoals);
  };

  // Create Manual Goal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp || !newTitle.trim()) return;

    const newGoalObj: IDPGoal = {
      id: `goal-manual-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      competencyTarget: newCompetency,
      priority: newPriority,
      status: 'Berjalan',
      targetDate: newTargetDate || '2026-11-30',
      metrics: newMetrics || 'Ukuran keberhasilan target',
      managerNotes: newManagerNotes || 'Catatan manajer penanggung jawab.',
      actionItems: [
        { id: `act-1-${Date.now()}`, task: 'Tinjauan awal rencana kerja bersama mentor', completed: false, dueDate: '2026-08-30' }
      ]
    };

    const updatedGoals = [...safeGoals, newGoalObj];
    saveGoalChanges(currentEmp.id, updatedGoals);

    // Reset Form
    setNewTitle('');
    setShowAddGoalModal(false);
  };

  // AI Auto Generate IDP Goals
  const handleGenerateAIIDP = async () => {
    if (!currentEmp) return;
    setIsGeneratingAI(true);

    try {
      const response = await fetch('/api/generate-idp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName: currentEmp.name,
          position: currentEmp.position,
          department: currentEmp.department,
          weaknesses: currentEmp.weaknesses,
          competencies: currentEmp.competencies,
          targetRole: currentEmp.idp?.targetRole || currentEmp.position
        })
      });

      const result = await response.json();
      if (result.success && Array.isArray(result.goals)) {
        const generatedGoals: IDPGoal[] = result.goals.map((g: any, idx: number) => ({
          id: `goal-ai-gen-${Date.now()}-${idx}`,
          title: g.title || 'Program Akselerasi IDP AI',
          category: g.category || 'Pelatihan / Kursus',
          competencyTarget: g.competencyTarget || 'Kepemimpinan',
          priority: g.priority || 'Tinggi',
          status: 'Berjalan',
          targetDate: g.targetDate || '2026-11-30',
          metrics: g.metrics || 'Sertifikat dan evaluasi kinerja',
          managerNotes: g.managerNotes || 'Rekomendasi otomatis disintesis oleh AI Gemini.',
          actionItems: (g.actionItems || []).map((act: any, aIdx: number) => ({
            id: `act-ai-gen-${Date.now()}-${idx}-${aIdx}`,
            task: act.task || 'Langkah pelaksanaan',
            completed: false,
            dueDate: act.dueDate || '2026-10-15'
          }))
        }));

        const updatedGoals = [...safeGoals, ...generatedGoals];
        saveGoalChanges(currentEmp.id, updatedGoals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Helper Badge Colors
  const getPriorityBadge = (p: PriorityLevel) => {
    switch (p) {
      case 'Tinggi': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Sedang': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Rendah': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusBadge = (s: GoalStatus) => {
    switch (s) {
      case 'Selesai': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Berjalan': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Belum Dimulai': return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Tertunda': return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  if (employees.length === 0 || !currentEmp) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
        <Target className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Belum Ada Data Karyawan</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Silakan unggah dokumen PDF hasil asesmen pada menu <strong>Unggah PDF</strong> untuk melihat dan mengelola Individual Development Plan (IDP).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Employee Selector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Target className="w-5 h-5 text-teal-600" />
              <span>Modul Individual Development Plan (IDP) Real-Time</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pantau kemajuan rencana pengembangan diri karyawan, perbarui status tugas aksi harian, dan berikan catatan evaluasi manajer secara langsung.
            </p>
          </div>

          {/* Select Employee Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Pilih Karyawan:</span>
            <select
              value={activeEmpId}
              onChange={(e) => setActiveEmpId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.position} ({emp.idp?.overallProgress || 0}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Employee Profile Summary & Overall Progress Bar */}
        {currentEmp && (
          <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">{currentEmp.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Target: {currentEmp.idp?.targetRole || currentEmp.position}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                NIP: {currentEmp.nip} • Divisi: {currentEmp.department} • Matriks: {currentEmp.talentBox}
              </p>
            </div>

            {/* Right side: Overall Progress Gauge + Download PDF button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-full sm:w-56 space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Total Progres IDP</span>
                  <span className="text-teal-400 font-bold">{currentEmp.idp?.overallProgress || 0}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-teal-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${currentEmp.idp?.overallProgress || 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => exportEmployeeAssessmentPdf(currentEmp)}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors flex items-center space-x-1.5 shadow-sm whitespace-nowrap cursor-pointer"
                  title="Download Dokumen PDF Laporan Hasil Analisa Asesmen"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Asesmen</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IDP Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ListTodo className="w-4 h-4 text-teal-600" />
          <span>Daftar Tujuan Pengembangan ({currentEmp?.idp?.goals?.length || 0} Goal)</span>
        </h3>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleGenerateAIIDP}
            disabled={isGeneratingAI}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-60"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyintesis AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Rekomendasikan IDP (AI)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowAddGoalModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Goal Baru</span>
          </button>
        </div>
      </div>

      {/* Goals Accordion List */}
      <div className="space-y-4">
        {(!currentEmp?.idp?.goals || currentEmp.idp.goals.length === 0) ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
            <Target className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Belum ada tujuan IDP untuk {currentEmp?.name}.</p>
            <p className="text-xs text-slate-400">Klik tombol "Rekomendasikan IDP (AI Gemini)" atau "Tambah Goal Baru" untuk mulai menyusun rencana.</p>
          </div>
        ) : (
          currentEmp.idp.goals.map((goal) => {
            const isExpanded = expandedGoals[goal.id] ?? true;
            const completedActions = goal.actionItems.filter(a => a.completed).length;
            const totalActions = goal.actionItems.length;
            const goalPct = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                {/* Goal Header Row */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3 cursor-pointer" onClick={() => toggleExpand(goal.id)}>
                    <button className="mt-0.5 text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{goal.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(goal.priority)}`}>
                          {goal.priority}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(goal.status)}`}>
                          {goal.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Kategori: <strong>{goal.category}</strong> • Target Kompetensi: <strong className="text-teal-700">{goal.competencyTarget}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Goal Progress & Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {completedActions}/{totalActions} Aksi Selesai ({goalPct}%)
                      </div>
                      
                      {/* Editable Target Date inline */}
                      <div 
                        className="flex items-center space-x-1.5 mt-1 justify-start sm:justify-end" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-600">Target Waktu:</span>
                        <input
                          type="date"
                          value={goal.targetDate || ''}
                          onChange={(e) => handleTargetDateChange(goal.id, e.target.value)}
                          className="text-xs font-semibold bg-white border border-slate-300 hover:border-teal-500 focus:border-teal-500 rounded-md px-2 py-0.5 text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer transition-colors shadow-2xs"
                          title="Klik untuk mengubah Target Waktu Penyelesaian Goal"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {/* Status select inline */}
                      <select
                        value={goal.status}
                        onChange={(e) => handleStatusChange(goal.id, e.target.value as GoalStatus)}
                        className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white font-medium cursor-pointer"
                      >
                        <option value="Berjalan">Berjalan</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Belum Dimulai">Belum Dimulai</option>
                        <option value="Tertunda">Tertunda</option>
                      </select>

                      {/* Edit Full Goal Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingGoal(goal);
                        }}
                        className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                        title="Edit Detail & Target Goal"
                      >
                        <Edit3 className="w-4 h-4 text-teal-600" />
                      </button>

                      {/* Delete Goal Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(goal.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Hapus Goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Goal Body */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Action Items List */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Rincian Tugas Aksi (Real-Time Action Items)</span>
                      </h5>

                      <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {goal.actionItems.map(action => (
                          <div
                            key={action.id}
                            onClick={() => handleToggleActionItem(goal.id, action.id)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-md bg-white border border-slate-200 hover:border-teal-400 cursor-pointer transition-all group/item gap-2"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                              <input
                                type="checkbox"
                                checked={action.completed}
                                onChange={() => {}} // handled by parent onClick
                                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer shrink-0"
                              />
                              <span className={`text-xs truncate ${action.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}>
                                {action.task}
                              </span>
                            </div>

                            <div 
                              className="flex items-center space-x-2 shrink-0 self-end sm:self-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Tenggat Waktu Tugas">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <input
                                  type="date"
                                  value={action.dueDate || ''}
                                  onChange={(e) => handleActionDueDateChange(goal.id, action.id, e.target.value)}
                                  className="text-[11px] font-mono bg-transparent text-slate-600 focus:outline-none cursor-pointer"
                                />
                              </div>
                              <button
                                onClick={(e) => handleDeleteActionItem(goal.id, action.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Hapus Tugas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add new action item inline */}
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            value={newActionTasks[goal.id] || ''}
                            onChange={(e) => setNewActionTasks({ ...newActionTasks, [goal.id]: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddActionItem(goal.id); }}
                            placeholder="+ Tambahkan tugas aksi baru (Tekan Enter)..."
                            className="w-full text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                          />
                          <button
                            onClick={() => handleAddActionItem(goal.id)}
                            className="px-3 py-1.5 bg-teal-600 text-white rounded-md text-xs font-semibold hover:bg-teal-500 transition-colors whitespace-nowrap"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Manager Notes & Target Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Key Target Metrics */}
                      <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg space-y-1">
                        <span className="font-bold text-teal-900 flex items-center space-x-1">
                          <Award className="w-3.5 h-3.5 text-teal-600" />
                          <span>Indikator Kelulusan (Metrics & KPI):</span>
                        </span>
                        <p className="text-slate-700 leading-relaxed">{goal.metrics || '-'}</p>
                      </div>

                      {/* Manager Review Notes */}
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 flex items-center space-x-1">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            <span>Catatan & Evaluasi Real-Time Manajer:</span>
                          </span>
                          {goal.managerNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setRefineModalText(goal.managerNotes || '');
                                setRefineModalContext('manager_notes');
                                setRefineModalTitle('Rapihkan Catatan Manajer (AI Gemini)');
                                setRefineApplyHandler(() => (newText: string) => {
                                  handleManagerNotesChange(goal.id, newText);
                                });
                                setIsRefineModalOpen(true);
                              }}
                              className="text-[10.5px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Rapihkan tata bahasa catatan evaluasi ini dengan AI Gemini"
                            >
                              <Sparkles className="w-3 h-3 text-amber-700" />
                              <span>Rapihkan</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={goal.managerNotes || ''}
                          onChange={(e) => handleManagerNotesChange(goal.id, e.target.value)}
                          placeholder="Masukkan catatan feedback manajer..."
                          className="w-full text-xs border border-amber-200 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Manual Goal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Tambah Goal IDP Baru untuk {currentEmp?.name}</h3>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Program / Tujuan IDP:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Pelatihan Sertifikasi Certified Scrum Master"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as CategoryType)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Pelatihan / Kursus">Pelatihan / Kursus</option>
                    <option value="Mentoring & Coaching">Mentoring & Coaching</option>
                    <option value="Proyek / Penugasan">Proyek / Penugasan</option>
                    <option value="Sertifikasi">Sertifikasi</option>
                    <option value="Belajar Mandiri">Belajar Mandiri</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioritas:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Kompetensi:</label>
                <input
                  type="text"
                  value={newCompetency}
                  onChange={(e) => setNewCompetency(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Selesai (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={newTargetDate}
                  onChange={(e) => setNewTargetDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Indikator Kelulusan (Metrics):</label>
                <input
                  type="text"
                  value={newMetrics}
                  onChange={(e) => setNewMetrics(e.target.value)}
                  placeholder="Contoh: Lulus exam dengan skor minimal 85%"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Simpan Goal IDP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Goal */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <span>Edit Goal & Target Waktu IDP</span>
              </h3>
              <button
                onClick={() => setEditingGoal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEditedGoal(editingGoal);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Program / Sasaran IDP:</label>
                <input
                  type="text"
                  value={editingGoal.title}
                  onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Waktu Selesai (Due Date):</label>
                  <input
                    type="date"
                    value={editingGoal.targetDate || ''}
                    onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                    required
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-teal-50/50 text-slate-900 font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Goal:</label>
                  <select
                    value={editingGoal.status}
                    onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value as GoalStatus })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Berjalan">Berjalan</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Belum Dimulai">Belum Dimulai</option>
                    <option value="Tertunda">Tertunda</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori:</label>
                  <select
                    value={editingGoal.category}
                    onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value as CategoryType })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Pelatihan / Kursus">Pelatihan / Kursus</option>
                    <option value="Mentoring & Coaching">Mentoring & Coaching</option>
                    <option value="Proyek / Penugasan">Proyek / Penugasan</option>
                    <option value="Sertifikasi">Sertifikasi</option>
                    <option value="Belajar Mandiri">Belajar Mandiri</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioritas:</label>
                  <select
                    value={editingGoal.priority}
                    onChange={(e) => setEditingGoal({ ...editingGoal, priority: e.target.value as PriorityLevel })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Kompetensi:</label>
                <input
                  type="text"
                  value={editingGoal.competencyTarget}
                  onChange={(e) => setEditingGoal({ ...editingGoal, competencyTarget: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Indikator Kelulusan (Metrics):</label>
                <input
                  type="text"
                  value={editingGoal.metrics || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, metrics: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan & Evaluasi Manajer:</label>
                <input
                  type="text"
                  value={editingGoal.managerNotes || ''}
                  onChange={(e) => setEditingGoal({ ...editingGoal, managerNotes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingGoal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Text Refinement Modal */}
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
    </div>
  );
};
