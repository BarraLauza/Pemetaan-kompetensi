import React, { useState } from 'react';
import { Employee, VisualizationSubTab } from '../types';
import { formatThinkingCapacity } from '../utils/pdfExport';
import { GoogleGenAI } from '@google/genai';
import { 
  FileUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Loader2, 
  Plus, 
  Zap, 
  ShieldCheck, 
  X, 
  Trash2, 
  Files, 
  Layers, 
  Check,
  ArrowRight,
  Activity,
  Users
} from 'lucide-react';

interface PdfUploaderProps {
  existingEmployees?: Employee[];
  onAssessmentAnalyzed: (newEmployee: Employee) => void;
  onBatchUploadComplete?: (batchEmployees: Employee[]) => void;
  onOpenAddManual?: () => void;
  onGoToTab?: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees', subTab?: VisualizationSubTab) => void;
  onDeleteAll?: () => void;
}

interface FileItemProgress {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  progressMessage?: string;
  extractedEmployee?: Employee;
  errorMessage?: string;
  isDuplicate?: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  existingEmployees = [],
  onAssessmentAnalyzed,
  onBatchUploadComplete,
  onOpenAddManual,
  onGoToTab,
  onDeleteAll
}) => {
  const [fileList, setFileList] = useState<FileItemProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(-1);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [batchSuccessEmployees, setBatchSuccessEmployees] = useState<Employee[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);

  React.useEffect(() => {
    if (existingEmployees.length === 0) {
      setFileList([]);
      setDuplicateNotice(null);
      setErrorMsg(null);
      setBatchSuccessEmployees([]);
    }
  }, [existingEmployees.length]);

  const addFilesToList = (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setErrorMsg('Semua berkas yang dipilih harus berformat PDF (.pdf)');
      return;
    }

    const duplicateInQueue: string[] = [];
    const validFiles: File[] = [];

    pdfFiles.forEach(file => {
      const inQueue = fileList.some(
        item => item.file.name.toLowerCase() === file.name.toLowerCase() && item.file.size === file.size
      );

      if (inQueue) {
        duplicateInQueue.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (duplicateInQueue.length > 0 && validFiles.length === 0) {
      setErrorMsg(`Berkas (${duplicateInQueue.join(', ')}) sudah ada di dalam antrean.`);
      return;
    }

    const newItems: FileItemProgress[] = validFiles.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      file,
      status: 'pending'
    }));

    setFileList(prev => [...prev, ...newItems]);
    setErrorMsg(null);
    setDuplicateNotice(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToList(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    if (isProcessing) return;
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  const handleClearAllFiles = () => {
    if (isProcessing) return;
    setFileList([]);
    setBatchSuccessEmployees([]);
    setErrorMsg(null);
  };

  // Proses Batch langsung menggunakan Google Gemini SDK
  const handleProcessBatch = async () => {
    if (fileList.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setBatchSuccessEmployees([]);

    const updatedList = fileList.map(item => ({
      ...item,
      status: 'pending' as const,
      errorMessage: undefined,
      extractedEmployee: undefined
    }));
    setFileList(updatedList);

    const newEmployees: Employee[] = [];

    for (let i = 0; i < updatedList.length; i++) {
      setCurrentProcessingIndex(i);
      const item = updatedList[i];

      setFileList(prev => prev.map((f, idx) => idx === i ? {
        ...f,
        status: 'processing',
        progressMessage: 'Membaca dokumen PDF...'
      } : f));

      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        reader.readAsDataURL(item.file);

        const dataUrl = await base64Promise;
        const base64Data = dataUrl.split(',')[1];

        setFileList(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'processing',
          progressMessage: 'Menganalisis dokumen secara presisi dengan AI Gemini...'
        } : f));

        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error('VITE_GEMINI_API_KEY belum dikonfigurasi di environment Netlify.');
        }

        const ai = new GoogleGenAI({ apiKey });

        const promptInstruction = `
          Analisis dokumen PDF asesmen karyawan ini secara cermat dan teliti. Ekstrak data berikut ke dalam format JSON yang valid (tanpa blok markdown tambahan):
          {
            "nip": "NIP karyawan atau format NIP-2026xxxx jika tidak ada",
            "name": "Nama lengkap karyawan dari dokumen",
            "position": "Jabatan saat ini",
            "department": "Departemen / Divisi",
            "overallScore": Skor asesmen total keseluruhan (angka 0-100),
            "iqScore": Nilai skor IQ / kapasitas berpikir (angka 70-160),
            "performanceScore": Skor kinerja (angka 1.0 - 5.0),
            "potentialScore": Skor potensi (angka 1.0 - 5.0),
            "talentBox": "Kategori 9-box dari dokumen (contoh: Pemain Utama (Core Player), Bintang (Star Player), dll)",
            "competencies": {
              "leadership": 4.0,
              "communication": 4.0,
              "problemSolving": 4.0,
              "technicalExcellence": 4.0,
              "collaboration": 4.0,
              "innovation": 4.0,
              "strategicThinking": 4.0,
              "adaptability": 4.0
            },
            "strengths": ["Kekuatan 1", "Kekuatan 2", "Kekuatan 3"],
            "weaknesses": ["Area pengembangan 1", "Area pengembangan 2"],
            "keyInsights": "Ringkasan eksekutif (Executive Summary) yang tajam dan mendalam sesuai dokumen.",
            "recommendedRoles": ["Rekomendasi Jabatan 1"],
            "recommendationCategory": "Dapat Disarankan",
            "idp": {
              "targetRole": "Target jabatan pengembangan",
              "goals": [
                {
                  "title": "Program Pengembangan Kompetensi Utama",
                  "category": "Pelatihan / Kursus",
                  "competencyTarget": "Kepemimpinan",
                  "priority": "Tinggi",
                  "status": "Berjalan",
                  "targetDate": "2026-11-30",
                  "metrics": "Penyelesaian program",
                  "managerNotes": "Catatan manajer pendukung",
                  "actionItems": [
                    { "task": "Aksi pengembangan 1", "completed": false, "dueDate": "2026-09-30" }
                  ]
                }
              ]
            }
          }
          Catatan tambahan: ${customNotes || 'Tidak ada'}
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: item.file.type || 'application/pdf',
                    data: base64Data
                  }
                },
                { text: promptInstruction }
              ]
            }
          ]
        });

        const rawText = response.text || '';
        const cleanedJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const extracted = JSON.parse(cleanedJsonText);

        const timestamp = Date.now() + i;
        const uniqueUid = `emp-ai-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

        const newEmp: Employee = {
          id: uniqueUid,
          nip: extracted.nip || `NIP-${Math.floor(100000 + Math.random() * 900000)}`,
          name: extracted.name || item.file.name.replace('.pdf', ''),
          position: extracted.position || 'Spesialis',
          department: extracted.department || 'Operasional',
          targetDepartment: extracted.department || 'Operasional',
          email: `${(extracted.name || 'karyawan').toLowerCase().replace(/[^a-z]/g, '')}@company.co.id`,
          assessmentDate: new Date().toISOString().split('T')[0],
          overallScore: Math.round(Number(extracted.overallScore) || 80),
          iqScore: Math.round(Number(extracted.iqScore) || 112),
          performanceScore: Number(extracted.performanceScore || 3.8),
          potentialScore: Number(extracted.potentialScore || 3.8),
          talentBox: extracted.talentBox || 'Pemain Utama (Core Player)',
          competencies: {
            leadership: Number(extracted.competencies?.leadership) || 3.8,
            communication: Number(extracted.competencies?.communication) || 3.8,
            problemSolving: Number(extracted.competencies?.problemSolving) || 3.8,
            technicalExcellence: Number(extracted.competencies?.technicalExcellence) || 3.8,
            collaboration: Number(extracted.competencies?.collaboration) || 3.8,
            innovation: Number(extracted.competencies?.innovation) || 3.8,
            strategicThinking: Number(extracted.competencies?.strategicThinking) || 3.8,
            adaptability: Number(extracted.competencies?.adaptability) || 3.8,
          },
          strengths: extracted.strengths || ['Komitmen kerja yang sangat baik'],
          weaknesses: extracted.weaknesses || ['Penguatan strategi operasional'],
          keyInsights: extracted.keyInsights || 'Hasil analisis dokumen asesmen.',
          recommendedRoles: extracted.recommendedRoles || ['Spesialis Utama'],
          recommendationCategory: extracted.recommendationCategory || 'Dapat Disarankan',
          evaluatedPosition: extracted.position || 'Spesialis',
          thinkingCapacity: formatThinkingCapacity({ iqScore: Number(extracted.iqScore) || 112 }),
          uploadedPdfName: item.file.name,
          isUploadedFromPdf: true,
          source: 'pdf_upload',
          idp: {
            id: `idp-ai-${timestamp}`,
            employeeId: uniqueUid,
            targetRole: extracted.idp?.targetRole || 'Manajer',
            overallProgress: 35,
            updatedAt: new Date().toISOString().split('T')[0],
            goals: (extracted.idp?.goals || []).map((g: any, gIdx: number) => ({
              id: `goal-ai-${timestamp}-${gIdx}`,
              title: g.title || 'Program Peningkatan Kompetensi',
              category: g.category || 'Pelatihan / Kursus',
              competencyTarget: g.competencyTarget || 'Kepemimpinan',
              priority: g.priority || 'Tinggi',
              status: 'Berjalan',
              targetDate: g.targetDate || '2026-11-30',
              metrics: g.metrics || 'Sertifikasi program',
              managerNotes: g.managerNotes || 'Dukungan penuh pimpinan.',
              actionItems: (g.actionItems || []).map((act: any, aIdx: number) => ({
                id: `act-ai-${timestamp}-${gIdx}-${aIdx}`,
                task: act.task,
                completed: Boolean(act.completed),
                dueDate: act.dueDate || '2026-10-30'
              }))
            }))
          }
        };

        setFileList(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'success',
          extractedEmployee: newEmp,
          progressMessage: 'Berhasil Dianalisis'
        } : f));

        newEmployees.push(newEmp);
        onAssessmentAnalyzed(newEmp);

      } catch (err: any) {
        console.error("Error processing file with Gemini SDK:", err);
        setFileList(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'error',
          errorMessage: err.message || 'Gagal memproses PDF dengan AI'
        } : f));
      }
    }

    setBatchSuccessEmployees(newEmployees);
    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    if (onBatchUploadComplete && newEmployees.length > 0) {
      onBatchUploadComplete(newEmployees);
    }
  };

  const totalFiles = fileList.length;
  const completedCount = fileList.filter(f => f.status === 'success' || f.status === 'error').length;
  const progressPercent = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 flex-shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">
                Unggah & Analisis Banyak Berkas PDF Asesmen Sekaligus (Batch Upload)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 border border-teal-300 uppercase">
                Multi-PDF Support
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Unggah dokumen PDF Anda. AI Gemini akan membaca isi laporan asesmen secara akurat.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-teal-500/60 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40 rounded-xl p-8 text-center transition-all cursor-pointer"
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="pdf-input-multi"
            disabled={isProcessing}
          />
          <label htmlFor="pdf-input-multi" className="cursor-pointer block">
            <div className="w-16 h-16 mx-auto rounded-full bg-teal-100/95 border border-teal-300 flex items-center justify-center text-teal-700 mb-3 shadow-2xs">
              <Files className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Klik untuk Memilih 1 atau Lebih Berkas PDF Asesmen
              </p>
              <p className="text-xs text-teal-700 font-medium mt-1">
                Atau seret & lepas berkas PDF ke area ini
              </p>
            </div>
          </label>
        </div>

        {fileList.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Daftar Berkas Terpilih ({fileList.length} Berkas)
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearAllFiles}
                disabled={isProcessing}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Semua</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {fileList.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border text-xs bg-white border-slate-200 text-slate-700"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 w-4">#{index + 1}</span>
                    <FileText className="w-4 h-4 shrink-0 text-teal-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{item.file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(item.file.size / 1024).toFixed(1)} KB {item.progressMessage && `— ${item.progressMessage}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {item.status === 'processing' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center space-x-1">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Memproses AI...</span>
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Selesai</span>
                      </span>
                    )}
                    {!isProcessing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleProcessBatch}
            disabled={fileList.length === 0 || isProcessing}
            className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses ({completedCount}/{totalFiles})...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analisis {fileList.length > 0 ? `${fileList.length} Berkas PDF` : 'PDF'} dengan AI Gemini</span>
              </>
            )}
          </button>
        </div>

        {isProcessing && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <span>Memproses berkas {currentProcessingIndex + 1} dari {totalFiles}...</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
              <div className="bg-teal-600 h-full transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
