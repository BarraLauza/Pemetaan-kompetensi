/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Employee, IDPGoal, VisualizationSubTab } from './types';
import { INITIAL_EMPLOYEES } from './data/initialData';
import { Header } from './components/Header';
import { CompetencyVisualization } from './components/CompetencyVisualization';
import { NineBoxMapping } from './components/NineBoxMapping';
import { PdfUploader } from './components/PdfUploader';
import { IDPDashboard } from './components/IDPDashboard';
import { EmployeeList } from './components/EmployeeList';
import { EmployeeFormModal } from './components/EmployeeFormModal';
import { realtimeSync, SyncConnectionStatus } from './services/syncService';
import { Trash2, AlertTriangle, Radio } from 'lucide-react';

export default function App() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees'>('visualization');
  const [visualizationSubTab, setVisualizationSubTab] = useState<VisualizationSubTab>('executive_summary');

  // Real-time synchronization status
  const [syncStatus, setSyncStatus] = useState<SyncConnectionStatus>('connecting');
  const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null);

  // Employee State with Local Storage persistence & Server synchronization
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('talentpulse_employees_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load employees from local storage:', e);
    }
    return [];
  });

  const employeesRef = useRef(employees);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  // Subscribe to real-time updates from Server WebSocket & BroadcastChannel
  useEffect(() => {
    // 1. Initial fetch from server
    realtimeSync.fetchLatest().then((serverData) => {
      if (serverData && Array.isArray(serverData)) {
        if (serverData.length > 0) {
          setEmployees(serverData);
        } else {
          // If serverData is empty on startup, check if local storage has valid data and was not explicitly purged
          const isExplicitlyCleared = localStorage.getItem('talentpulse_cleared_v3') === 'true';
          const localSaved = employeesRef.current;
          if (!isExplicitlyCleared && localSaved && localSaved.length > 0) {
            // Push local data to the newly started server so it is never lost across container cold-starts
            realtimeSync.setAllEmployees(localSaved);
          } else if (isExplicitlyCleared) {
            setEmployees([]);
          }
        }
      }
    });

    // 2. Subscribe to real-time live events
    const unsubscribeSync = realtimeSync.subscribe((newEmployees) => {
      setEmployees(newEmployees);
      try {
        localStorage.setItem('talentpulse_employees_v3', JSON.stringify(newEmployees));
      } catch (_) {}
    });

    // 3. Subscribe to connection status
    const unsubscribeStatus = realtimeSync.subscribeStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeSync();
      unsubscribeStatus();
    };
  }, []);

  // Selected Employee for IDP or Deep Dive Detail
  const [selectedEmpForIDP, setSelectedEmpForIDP] = useState<string>('');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Delete Confirmation Modal State
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Save employees to local storage
  useEffect(() => {
    try {
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify(employees));
    } catch (e) {
      console.error('Failed to save employees:', e);
    }
  }, [employees]);

  // Handler: Add or Edit Employee (Updates existing employee safely without false collisions)
  const handleSaveEmployee = (emp: Employee) => {
    const isGeneric = (str?: string) => {
      if (!str) return true;
      const lower = str.trim().toLowerCase();
      return lower.length < 3 || ['karyawan', 'peserta', 'asesmen', 'dokumen', 'hasil', 'file', 'n/a', '-', 'none', 'belum ada', 'tidak ada'].includes(lower);
    };

    setEmployees(prev => {
      const empName = (emp.name || '').trim().toLowerCase();
      const empNip = (emp.nip || '').trim().toLowerCase();

      const existingIndex = prev.findIndex(e => {
        if (e.id === emp.id) return true;
        const eNip = (e.nip || '').trim().toLowerCase();
        const eName = (e.name || '').trim().toLowerCase();
        if (!isGeneric(empNip) && !isGeneric(eNip) && empNip.length >= 4 && empNip === eNip) return true;
        if (!isGeneric(empName) && !isGeneric(eName) && empName.length >= 4 && empName === eName) return true;
        return false;
      });

      let next: Employee[];
      let resolvedEmp = emp;

      if (existingIndex >= 0) {
        resolvedEmp = {
          ...prev[existingIndex],
          ...emp,
          id: prev[existingIndex].id // Preserve existing ID
        };
        next = [...prev];
        next[existingIndex] = resolvedEmp;
      } else {
        next = [emp, ...prev];
      }

      employeesRef.current = next;
      try {
        localStorage.removeItem('talentpulse_cleared_v3');
        localStorage.setItem('talentpulse_employees_v3', JSON.stringify(next));
      } catch (_) {}
      realtimeSync.saveEmployee(resolvedEmp, next);
      return next;
    });
  };

  // Handler: Batch Update Employees (atomic batch commit to guarantee all updates are saved without race conditions)
  const handleBatchUpdateEmployees = (updatedList: Employee[]) => {
    if (!updatedList || updatedList.length === 0) return;

    setEmployees(prev => {
      const next = [...prev];
      const resolvedList: Employee[] = [];

      for (const updated of updatedList) {
        const idx = next.findIndex(e => e.id === updated.id);
        if (idx >= 0) {
          const resolvedEmp = {
            ...next[idx],
            ...updated,
            id: next[idx].id
          };
          next[idx] = resolvedEmp;
          resolvedList.push(resolvedEmp);
        }
      }

      employeesRef.current = next;
      try {
        localStorage.removeItem('talentpulse_cleared_v3');
        localStorage.setItem('talentpulse_employees_v3', JSON.stringify(next));
      } catch (_) {}
      realtimeSync.saveBatch(resolvedList, next);
      return next;
    });
  };

  // Handler: Request Delete Employee (opens custom modal)
  const handleDeleteEmployee = (empId: string) => {
    const target = employees.find(e => e.id === empId);
    if (target) {
      setEmployeeToDelete(target);
    }
  };

  // Handler: Confirm Delete Action
  const confirmDeleteEmployee = () => {
    if (!employeeToDelete) return;
    const empId = employeeToDelete.id;
    const next = employeesRef.current.filter(e => e.id !== empId);
    setEmployees(next);
    realtimeSync.deleteEmployee(empId, next);
    if (selectedEmpForIDP === empId) {
      setSelectedEmpForIDP('');
    }
    setEmployeeToDelete(null);
  };

  // Handler: Delete all employees (Complete purge across state, localStorage, and server)
  const handleDeleteAll = () => {
    setEmployees([]);
    setSelectedEmpForIDP('');
    realtimeSync.deleteAllEmployees();
    try {
      localStorage.setItem('talentpulse_cleared_v3', 'true');
      localStorage.removeItem('talentpulse_employees_v3');
      localStorage.setItem('talentpulse_employees_v3', JSON.stringify([]));
      localStorage.removeItem('talentpulse_custom_hr_remarks_v1');
      localStorage.removeItem('talentpulse_custom_pattern_note_v1');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  };

  // Handler: Update Employee IDP Goals
  const handleUpdateEmployeeIDP = (employeeId: string, updatedGoals: IDPGoal[]) => {
    let updatedEmp: Employee | null = null;
    let nextEmployees: Employee[] = [];
    setEmployees(prev => {
      const next = prev.map(emp => {
        if (emp.id !== employeeId) return emp;

        // Calculate progress %
        let totalActions = 0;
        let completedActions = 0;

        (updatedGoals || []).forEach(g => {
          const items = g.actionItems || [];
          totalActions += items.length;
          completedActions += items.filter(a => a.completed).length;
        });

        const overallProgress = totalActions > 0 
          ? Math.round((completedActions / totalActions) * 100)
          : 0;

        const modified: Employee = {
          ...emp,
          idp: {
            ...emp.idp,
            overallProgress,
            updatedAt: new Date().toISOString().split('T')[0],
            goals: updatedGoals
          }
        };
        updatedEmp = modified;
        return modified;
      });

      nextEmployees = next;
      employeesRef.current = next;
      try {
        localStorage.setItem('talentpulse_employees_v3', JSON.stringify(next));
      } catch (_) {}
      return next;
    });

    if (updatedEmp) {
      realtimeSync.saveEmployee(updatedEmp, nextEmployees);
    }
  };

  // Handler: AI PDF Assessment Analyzed (single file callback)
  const handleAssessmentAnalyzed = (newEmp: Employee) => {
    handleSaveEmployee(newEmp);
    setSelectedEmpForIDP(newEmp.id);
  };

  // Handler: AI Batch Upload Complete (atomic batch commit to guarantee all 40 files are saved without loss)
  const handleBatchAssessmentsAnalyzed = (batchEmployees: Employee[]) => {
    if (!batchEmployees || batchEmployees.length === 0) return;

    setEmployees(prev => {
      const next = [...prev];
      for (const emp of batchEmployees) {
        const idx = next.findIndex(e => e.id === emp.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...emp };
        } else {
          next.unshift(emp);
        }
      }
      employeesRef.current = next;
      try {
        localStorage.removeItem('talentpulse_cleared_v3');
        localStorage.setItem('talentpulse_employees_v3', JSON.stringify(next));
      } catch (_) {}
      realtimeSync.saveBatch(batchEmployees, next);
      return next;
    });

    if (batchEmployees.length > 0) {
      setSelectedEmpForIDP(batchEmployees[batchEmployees.length - 1].id);
    }
  };

  // Handler: Select employee to jump to IDP
  const handleGoToIDP = (emp: Employee) => {
    setSelectedEmpForIDP(emp.id);
    setActiveTab('idp');
  };

  // Handler: Select employee to jump to Competency Visualization & Department
  const handleGoToVisualization = (emp: Employee) => {
    setSelectedEmpForIDP(emp.id);
    setVisualizationSubTab('competency_charts');
    setActiveTab('visualization');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        visualizationSubTab={visualizationSubTab}
        onSelectVisualizationSubTab={setVisualizationSubTab}
        employeeCount={employees.length}
        onOpenAddModal={() => { setEditingEmployee(null); setIsAddModalOpen(true); }}
        syncStatus={syncStatus}
      />

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'visualization' && (
          <CompetencyVisualization
            employees={employees}
            selectedEmployeeId={selectedEmpForIDP}
            activeSubTab={visualizationSubTab}
            onSubTabChange={setVisualizationSubTab}
            onSelectEmployee={(emp) => handleGoToVisualization(emp)}
            onGoToTab={(tab) => setActiveTab(tab)}
            onDeleteEmployee={handleDeleteEmployee}
            onEditEmployee={(emp) => { setEditingEmployee(emp); setIsAddModalOpen(true); }}
            onUpdateEmployee={handleSaveEmployee}
            onBatchUpdateEmployees={handleBatchUpdateEmployees}
          />
        )}

        {activeTab === 'ninebox' && (
          <NineBoxMapping
            employees={employees}
            onSelectEmployee={(emp) => handleGoToVisualization(emp)}
            onGoToTab={(tab) => setActiveTab(tab)}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'upload' && (
          <PdfUploader
            existingEmployees={employees}
            onAssessmentAnalyzed={handleAssessmentAnalyzed}
            onBatchUploadComplete={handleBatchAssessmentsAnalyzed}
            onDeleteAll={handleDeleteAll}
            onGoToTab={(tab, subTab) => {
              setActiveTab(tab);
              if (subTab) setVisualizationSubTab(subTab);
            }}
          />
        )}

        {activeTab === 'idp' && (
          <IDPDashboard
            employees={employees}
            selectedEmployeeId={selectedEmpForIDP}
            onUpdateEmployeeIDP={handleUpdateEmployeeIDP}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeList
            employees={employees}
            onSelectEmployee={(emp) => handleGoToVisualization(emp)}
            onGoToVisualization={(emp) => handleGoToVisualization(emp)}
            onDeleteEmployee={handleDeleteEmployee}
            onGoToIDP={handleGoToIDP}
            onDeleteAll={handleDeleteAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 TalentPulse AI — Platform Pemetaan Kompetensi & IDP Real-Time</p>
          <div className="flex items-center space-x-4">
            <button onClick={() => setActiveTab('upload')} className="hover:text-teal-600">
              PDF Assessment AI
            </button>
            <span>•</span>
            <button onClick={() => setActiveTab('visualization')} className="hover:text-teal-600">
              Pemetaan Kompetensi
            </button>
          </div>
        </div>
      </footer>

      {/* Add / Edit Employee Modal */}
      <EmployeeFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveEmployee={handleSaveEmployee}
        editingEmployee={editingEmployee}
      />

      {/* Custom Confirmation Modal for Deleting Employee */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Data Karyawan</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus data karyawan <strong className="text-slate-900">{employeeToDelete.name}</strong> ({employeeToDelete.nip})?
              </p>
              <div className="bg-rose-50 border border-rose-200/80 p-2.5 rounded-xl text-[11px] text-rose-800 font-medium flex items-center space-x-2 text-left mt-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Seluruh data skor kompetensi, asesmen IQ, dan program IDP karyawan ini akan dihapus permanen.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setEmployeeToDelete(null)}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteEmployee}
                className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-xs"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
