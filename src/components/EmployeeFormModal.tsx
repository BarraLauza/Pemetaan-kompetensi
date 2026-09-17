import React, { useState } from 'react';
import { Employee, CompetencyScore } from '../types';
import { X, UserCheck, Plus, Sparkles } from 'lucide-react';
import { TextRefinementModal } from './TextRefinementModal';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEmployee: (emp: Employee) => void;
  editingEmployee?: Employee | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSaveEmployee,
  editingEmployee
}) => {
  if (!isOpen) return null;

  const [nip, setNip] = useState<string>(editingEmployee?.nip || `NIP-${Math.floor(100000 + Math.random() * 900000)}`);
  const [name, setName] = useState<string>(editingEmployee?.name || '');
  const [position, setPosition] = useState<string>(editingEmployee?.position || '');
  const [department, setDepartment] = useState<string>(editingEmployee?.department || 'Teknologi Informasi');
  const [targetDepartment, setTargetDepartment] = useState<string>(editingEmployee?.targetDepartment || 'Direksi & Manajemen Strategis');
  const [email, setEmail] = useState<string>(editingEmployee?.email || '');
  const [iqScore, setIqScore] = useState<number>(editingEmployee?.iqScore || 115);
  const [performanceScore, setPerformanceScore] = useState<number>(editingEmployee?.performanceScore || 4.0);
  const [potentialScore, setPotentialScore] = useState<number>(editingEmployee?.potentialScore || 4.0);
  const [talentBox, setTalentBox] = useState<string>(editingEmployee?.talentBox || 'Bintang (Star Player)');
  const [strengthsText, setStrengthsText] = useState<string>(editingEmployee?.strengths?.join('\n') || '');
  const [weaknessesText, setWeaknessesText] = useState<string>(editingEmployee?.weaknesses?.join('\n') || '');
  const [keyInsights, setKeyInsights] = useState<string>(editingEmployee?.keyInsights || '');

  // AI Refinement State
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineModalText, setRefineModalText] = useState('');
  const [refineModalContext, setRefineModalContext] = useState<'executive_summary' | 'catatan_pola' | 'idp_goal' | 'manager_notes' | 'strengths_weaknesses'>('strengths_weaknesses');
  const [refineModalTitle, setRefineModalTitle] = useState('Rapihkan Bahasa (AI Gemini)');
  const [refineApplyHandler, setRefineApplyHandler] = useState<((text: string) => void) | null>(null);

  // Competency scores
  const [compScores, setCompScores] = useState<CompetencyScore>(editingEmployee?.competencies || {
    leadership: 4.0,
    communication: 4.0,
    problemSolving: 4.0,
    technicalExcellence: 4.0,
    collaboration: 4.0,
    innovation: 4.0,
    strategicThinking: 4.0,
    adaptability: 4.0,
  });

  const handleScoreChange = (key: keyof CompetencyScore, val: number) => {
    setCompScores(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !position.trim()) return;

    const strengths = strengthsText.split('\n').map(s => s.trim()).filter(Boolean);
    const weaknesses = weaknessesText.split('\n').map(w => w.trim()).filter(Boolean);

    // Calculate overall score (scale 0-100)
    const sumComp = (Object.values(compScores) as number[]).reduce((a: number, b: number) => a + b, 0);
    const avgComp = sumComp / 8;
    const overallScore = Math.round((avgComp / 5) * 100);

    const newEmp: Employee = {
      id: editingEmployee?.id || `emp-manual-${Date.now()}`,
      nip: nip.trim(),
      name: name.trim(),
      position: position.trim(),
      department: department.trim(),
      targetDepartment: targetDepartment.trim() || department.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@company.co.id`,
      assessmentDate: new Date().toISOString().split('T')[0],
      overallScore,
      iqScore: Number(iqScore) || 115,
      performanceScore,
      potentialScore,
      talentBox,
      competencies: compScores,
      strengths: strengths.length > 0 ? strengths : ['Memiliki motivasi kerja tinggi.'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Perlu peningkatan efisiensi komunikasi.'],
      keyInsights: keyInsights.trim() || `Asesmen menunjukkan kompetensi ${name} berada pada tingkat yang sangat memuaskan.`,
      recommendedRoles: [position],
      idp: editingEmployee?.idp || {
        id: `idp-man-${Date.now()}`,
        employeeId: editingEmployee?.id || `emp-manual-${Date.now()}`,
        targetRole: position,
        overallProgress: 25,
        updatedAt: new Date().toISOString().split('T')[0],
        goals: [
          {
            id: `goal-man-1`,
            title: `Program Penguatan ${position}`,
            category: 'Pelatihan / Kursus',
            competencyTarget: 'Kepemimpinan',
            priority: 'Tinggi',
            status: 'Berjalan',
            targetDate: '2026-11-30',
            metrics: 'Evaluasi berkala',
            managerNotes: 'Pendampingan manajer divisi',
            actionItems: [
              { id: 'act-m1', task: 'Review capaian bulanan', completed: false, dueDate: '2026-09-15' }
            ]
          }
        ]
      }
    };

    onSaveEmployee(newEmp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            <span>{editingEmployee ? 'Edit Data Asesmen Karyawan' : 'Tambah Hasil Asesmen Karyawan Manual'}</span>
          </h3>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Karyawan:</label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Andi Wijaya"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jabatan saat ini:</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Contoh: Senior Engineer"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Departemen Saat Ini:</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Contoh: Teknologi Informasi"
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Departemen Tujuan (Target Mapping):</label>
              <input
                type="text"
                value={targetDepartment}
                onChange={(e) => setTargetDepartment(e.target.value)}
                placeholder="Contoh: Direksi & Manajemen Strategis"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nilai IQ (Psikotes):</label>
              <input
                type="number"
                min="70"
                max="160"
                value={iqScore}
                onChange={(e) => setIqScore(parseInt(e.target.value) || 110)}
                placeholder="Contoh: 118"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skor Kinerja (1-5):</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={performanceScore}
                onChange={(e) => setPerformanceScore(parseFloat(e.target.value) || 3)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Skor Potensi (1-5):</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={potentialScore}
                onChange={(e) => setPotentialScore(parseFloat(e.target.value) || 3)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori 9-Box:</label>
              <select
                value={talentBox}
                onChange={(e) => setTalentBox(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-slate-50 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Bintang (Star Player)">Bintang (Star Player)</option>
                <option value="Potensial Tinggi (High Potential)">Potensial Tinggi</option>
                <option value="Kinerja Tinggi (High Performer)">Kinerja Tinggi</option>
                <option value="Kontributor Kunci (Key Contributor)">Kontributor Kunci</option>
                <option value="Pemain Utama (Core Player)">Pemain Utama</option>
                <option value="Pengembang Diri (Enigma/Dilemma)">Pengembang Diri</option>
                <option value="Perlu Perhatian (Under Performer)">Perlu Perhatian</option>
              </select>
            </div>
          </div>

          {/* 8 Competencies sliders */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <label className="block font-bold text-slate-800">Skor 8 Kompetensi Utama (Skala 1.0 - 5.0):</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(compScores) as Array<keyof CompetencyScore>).map(key => (
                <div key={key} className="flex items-center justify-between space-x-2">
                  <span className="capitalize font-medium text-slate-700 truncate">{key}:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={compScores[key]}
                    onChange={(e) => handleScoreChange(key, parseFloat(e.target.value) || 3)}
                    className="w-16 text-center border border-slate-300 rounded px-1.5 py-0.5 bg-white font-bold text-teal-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-emerald-800">Kekuatan Utama (1 poin per baris):</label>
                {strengthsText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefineModalText(strengthsText);
                      setRefineModalContext('strengths_weaknesses');
                      setRefineModalTitle('Rapihkan Poin Kekuatan (AI Gemini)');
                      setRefineApplyHandler(() => (newText: string) => {
                        setStrengthsText(newText);
                      });
                      setIsRefineModalOpen(true);
                    }}
                    className="text-[10.5px] font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer"
                    title="Rapihkan tata bahasa poin kekuatan dengan AI"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>Rapihkan</span>
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={strengthsText}
                onChange={(e) => setStrengthsText(e.target.value)}
                placeholder="Analisis kekuatan 1&#10;Analisis kekuatan 2"
                className="w-full border border-emerald-300 rounded-lg p-2 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-amber-800">Kelemahan & Area Pengembang:</label>
                {weaknessesText && (
                  <button
                    type="button"
                    onClick={() => {
                      setRefineModalText(weaknessesText);
                      setRefineModalContext('strengths_weaknesses');
                      setRefineModalTitle('Rapihkan Poin Kelemahan & Area Pengembangan (AI Gemini)');
                      setRefineApplyHandler(() => (newText: string) => {
                        setWeaknessesText(newText);
                      });
                      setIsRefineModalOpen(true);
                    }}
                    className="text-[10.5px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100/80 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer"
                    title="Rapihkan tata bahasa poin kelemahan dengan AI"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Rapihkan</span>
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={weaknessesText}
                onChange={(e) => setWeaknessesText(e.target.value)}
                placeholder="Area perbaikan 1&#10;Area perbaikan 2"
                className="w-full border border-amber-300 rounded-lg p-2 bg-amber-50/40 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Rangkuman Analysis AI / Key Insights:</label>
              {keyInsights && (
                <button
                  type="button"
                  onClick={() => {
                    setRefineModalText(keyInsights);
                    setRefineModalContext('executive_summary');
                    setRefineModalTitle('Rapihkan Key Insights (AI Gemini)');
                    setRefineApplyHandler(() => (newText: string) => {
                      setKeyInsights(newText);
                    });
                    setIsRefineModalOpen(true);
                  }}
                  className="text-[10.5px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-100/80 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer"
                  title="Rapihkan tata bahasa rangkuman insight dengan AI"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Rapihkan</span>
                </button>
              )}
            </div>
            <textarea
              rows={2}
              value={keyInsights}
              onChange={(e) => setKeyInsights(e.target.value)}
              placeholder="Ringkasan evaluasi hasil asesmen..."
              className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs"
            >
              Simpan Data Karyawan
            </button>
          </div>
        </form>
      </div>

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
