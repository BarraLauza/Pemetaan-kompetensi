import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  RotateCcw, 
  Loader2, 
  FileText, 
  Sliders, 
  CheckCircle2,
  Table,
  UserCheck,
  Building2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ThumbsUp
} from 'lucide-react';
import { Employee } from '../types';

export interface FullExecutiveRefinementResult {
  refinedExecutivePatternNote: string;
  refinedHrRemarks: {
    recommended: string;
    considered: string;
    notRecommended: string;
  };
  refinedEmployees: Array<{
    id: string;
    briefReading: string;
    strengths: string[];
    weaknesses: string[];
    mainStrengths: string;
    developmentAreas: string;
    followUpNotes: string;
    keyInsights: string;
  }>;
  summaryChanges?: string;
  keyImprovements?: string[];
}

export interface FullExecutiveRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  currentPatternNote?: string;
  currentExecutiveNote?: string;
  currentHrRemarks: {
    recommended: string;
    considered: string;
    notRecommended: string;
  };
  onApplyAll?: (
    refinedPatternNote: string,
    refinedHrRemarks: { recommended: string; considered: string; notRecommended: string },
    refinedEmployees: FullExecutiveRefinementResult['refinedEmployees']
  ) => void;
  onApply?: (
    refinedPatternNote: string,
    refinedHrRemarks: { recommended: string; considered: string; notRecommended: string },
    refinedEmployees: FullExecutiveRefinementResult['refinedEmployees']
  ) => void;
}

export const FullExecutiveRefinementModal: React.FC<FullExecutiveRefinementModalProps> = ({
  isOpen,
  onClose,
  employees,
  currentPatternNote,
  currentExecutiveNote,
  currentHrRemarks,
  onApplyAll,
  onApply
}) => {
  const [selectedTone, setSelectedTone] = useState<'formal_executive' | 'concise' | 'actionable'>('formal_executive');
  const [activeTab, setActiveTab] = useState<'summary' | 'table3_reading' | 'table4_strengths'>('summary');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refinementData, setRefinementData] = useState<FullExecutiveRefinementResult | null>(null);

  // Editable local draft state once refined
  const [draftPatternNote, setDraftPatternNote] = useState<string>('');
  const [draftRemarks, setDraftRemarks] = useState<{ recommended: string; considered: string; notRecommended: string }>({
    recommended: '',
    considered: '',
    notRecommended: ''
  });
  const [draftEmployees, setDraftEmployees] = useState<FullExecutiveRefinementResult['refinedEmployees']>([]);

  if (!isOpen) return null;

  const effectivePatternNote = currentPatternNote || currentExecutiveNote || '';

  const handleStartRefinement = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/refine-all-executive-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employees: employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            position: emp.evaluatedPosition || emp.position,
            department: emp.department,
            recommendationCategory: emp.recommendationCategory,
            briefReading: emp.briefReading || emp.keyInsights,
            strengths: emp.strengths,
            weaknesses: emp.weaknesses,
            mainStrengths: emp.mainStrengths,
            developmentAreas: emp.developmentAreas,
            followUpNotes: emp.followUpNotes
          })),
          executivePatternNote: effectivePatternNote,
          hrRemarks: currentHrRemarks,
          tone: selectedTone
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal memproses perapihan bahasa dokumen.');
      }

      const result: FullExecutiveRefinementResult = resData.data;
      setRefinementData(result);
      setDraftPatternNote(result.refinedExecutivePatternNote);
      setDraftRemarks(result.refinedHrRemarks);
      setDraftEmployees(result.refinedEmployees);
    } catch (err: any) {
      console.error('Refinement error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses perapihan bahasa dengan AI Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!refinementData) return;
    const applyCallback = onApply || onApplyAll;
    if (applyCallback) {
      applyCallback(
        draftPatternNote || refinementData.refinedExecutivePatternNote,
        draftRemarks || refinementData.refinedHrRemarks,
        draftEmployees.length > 0 ? draftEmployees : refinementData.refinedEmployees
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Rapihkan Seluruh Bahasa Dokumen Eksekutif (AI Gemini)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-200 border border-teal-300/30 uppercase tracking-wider">
                  Gemini 3 HC Expert
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Memoles bahasa pada <strong>Executive Summary</strong>, <strong>Tabel Ringkasan Asesmen</strong>, dan <strong>Tabel Kekuatan & Area Pengembangan</strong> ({employees.length} Karyawan).
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

        {/* Toolbar Settings */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5 shrink-0">
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>Gaya Diksi:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              {[
                { id: 'formal_executive', label: 'Formal Eksekutif Direksi' },
                { id: 'concise', label: 'Ringkas & Tajam' },
                { id: 'actionable', label: 'Actionable & Solutif' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTone(t.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    selectedTone === t.id
                      ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleStartRefinement}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses Seluruh Dokumen...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{refinementData ? 'Proses Ulang dengan AI' : 'Mulai Rapihkan Bahasa Seluruh Dokumen'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!refinementData && !isLoading && (
            <div className="py-12 px-4 text-center max-w-lg mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Penyempurnaan Bahasa Dokumen Executive Summary
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI Gemini akan menelaah dan memoles <strong>seluruh hasil analisa pada dokumen ini</strong> ({employees.length} karyawan), membersihkan diksi robotik/sistem, menyempurnakan EYD V, dan menyelaraskan kalimat menjadi narasi eksekutif yang elegan untuk Direksi dan Manajemen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900">1. Executive Summary</div>
                  <div className="text-[11px] text-slate-500">Pola utama asesmen & narasi rekomendasi HR per kategori.</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900">3. Ringkasan Asesmen</div>
                  <div className="text-[11px] text-slate-500">Reading profil diagnostik & kesiapan peran tiap karyawan.</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900">4. Kekuatan & IDP</div>
                  <div className="text-[11px] text-slate-500">Poin kekuatan, area bimbingan, dan follow-up tindak lanjut.</div>
                </div>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleStartRefinement}
                  className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all inline-flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Jalankan Rapihkan Bahasa Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sedang Menganalisis & Menyempurnakan Bahasa...</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Mengharmonisasikan narasi pola eksekutif, rekomendasi HR, dan uraian diagnostik {employees.length} karyawan dengan standar EYD V dan terminologi Human Capital modern.
                </p>
              </div>
            </div>
          )}

          {refinementData && !isLoading && (
            <div className="space-y-4">
              {/* Navigation Tabs for Preview */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'summary'
                      ? 'border-indigo-600 text-indigo-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>1. Executive Summary & HR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('table3_reading')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'table3_reading'
                      ? 'border-indigo-600 text-indigo-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>3. Ringkasan Profil Asesmen ({draftEmployees.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('table4_strengths')}
                  className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-1.5 ${
                    activeTab === 'table4_strengths'
                      ? 'border-indigo-600 text-indigo-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>4. Kekuatan, Area Dev & Follow-up</span>
                </button>
              </div>

              {/* Tab 1: Executive Summary & Keterangan HR */}
              {activeTab === 'summary' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Catatan Pola Utama */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Catatan Pola Utama Eksekutif (Disempurnakan)</span>
                      </label>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Bahasa Baku EYD V
                      </span>
                    </div>
                    <textarea
                      value={draftPatternNote}
                      onChange={(e) => setDraftPatternNote(e.target.value)}
                      rows={3}
                      className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white leading-relaxed font-medium"
                    />
                  </div>

                  {/* Keterangan HR per Kategori */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-900 block">
                      Keterangan HR Berdasarkan Kategori Rekomendasi (Disempurnakan)
                    </label>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-emerald-800 flex items-center space-x-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span>Dapat Disarankan:</span>
                        </span>
                        <textarea
                          value={draftRemarks.recommended}
                          onChange={(e) => setDraftRemarks(prev => ({ ...prev, recommended: e.target.value }))}
                          rows={2}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                        />
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-amber-800 flex items-center space-x-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                          <span>Dipertimbangkan:</span>
                        </span>
                        <textarea
                          value={draftRemarks.considered}
                          onChange={(e) => setDraftRemarks(prev => ({ ...prev, considered: e.target.value }))}
                          rows={2}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                        />
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-rose-800 flex items-center space-x-1 mb-1">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          <span>Tidak Disarankan:</span>
                        </span>
                        <textarea
                          value={draftRemarks.notRecommended}
                          onChange={(e) => setDraftRemarks(prev => ({ ...prev, notRecommended: e.target.value }))}
                          rows={2}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Tabel Ringkasan Asesmen (Reading Profil) */}
              {activeTab === 'table3_reading' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs text-slate-500 mb-2">
                    Pratinjau uraian <strong>Reading Singkat / Ringkasan Asesmen</strong> yang telah dirapikan untuk masing-masing karyawan:
                  </div>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto bg-white">
                    {draftEmployees.map((empDraft, idx) => {
                      const origEmp = employees.find(e => e.id === empDraft.id);
                      return (
                        <div key={empDraft.id} className="p-3.5 hover:bg-slate-50/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">{idx + 1}. {origEmp?.name || empDraft.id}</span>
                              <span className="text-[10.5px] text-slate-500">({origEmp?.position || 'Karyawan'})</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {origEmp?.recommendationCategory || 'Dapat Disarankan'}
                            </span>
                          </div>
                          <textarea
                            value={empDraft.briefReading}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftEmployees(prev => prev.map(item => item.id === empDraft.id ? { ...item, briefReading: val, keyInsights: val } : item));
                            }}
                            rows={2}
                            className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white leading-relaxed"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Kekuatan, Area Dev & Follow-up */}
              {activeTab === 'table4_strengths' && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs text-slate-500 mb-2">
                    Pratinjau penyempurnaan <strong>Kekuatan Utama</strong>, <strong>Area Pengembangan</strong>, dan <strong>Catatan Follow-up HR</strong>:
                  </div>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden max-h-[450px] overflow-y-auto bg-white">
                    {draftEmployees.map((empDraft, idx) => {
                      const origEmp = employees.find(e => e.id === empDraft.id);
                      return (
                        <div key={empDraft.id} className="p-3.5 hover:bg-slate-50/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">{idx + 1}. {origEmp?.name || empDraft.id}</span>
                              <span className="text-[10.5px] text-slate-500">({origEmp?.department || 'Divisi'})</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <span className="text-[11px] font-semibold text-emerald-800 block mb-1">Kekuatan Utama:</span>
                              <textarea
                                value={empDraft.mainStrengths || empDraft.strengths.join('; ')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftEmployees(prev => prev.map(item => item.id === empDraft.id ? { ...item, mainStrengths: val } : item));
                                }}
                                rows={2}
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                              />
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-amber-800 block mb-1">Area Pengembangan:</span>
                              <textarea
                                value={empDraft.developmentAreas || empDraft.weaknesses.join('; ')}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftEmployees(prev => prev.map(item => item.id === empDraft.id ? { ...item, developmentAreas: val } : item));
                                }}
                                rows={2}
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                              />
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-blue-800 block mb-1">Follow-up HR & IDP:</span>
                              <textarea
                                value={empDraft.followUpNotes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftEmployees(prev => prev.map(item => item.id === empDraft.id ? { ...item, followUpNotes: val } : item));
                                }}
                                rows={2}
                                className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Batal
          </button>

          {refinementData && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleApply}
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan Semua Perubahan Bahasa ke Dokumen</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
