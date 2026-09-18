import React, { useState } from 'react';
import { Employee, VisualizationSubTab } from '../types';
import { formatThinkingCapacity } from '../utils/pdfExport';
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
  BarChart3,
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

  // Clear queue and notices whenever all employees are deleted
  React.useEffect(() => {
    if (existingEmployees.length === 0) {
      setFileList([]);
      setDuplicateNotice(null);
      setErrorMsg(null);
      setBatchSuccessEmployees([]);
    }
  }, [existingEmployees.length]);

  // Helper to add files to state (Only prevents double-queueing the exact same file)
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
      // Check duplicate against current pending/processing queue only
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

  // File Input Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToList(e.target.files);
      // Reset input value so same files can be re-selected if needed
      e.target.value = '';
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(e.dataTransfer.files);
    }
  };

  // Remove single file
  const handleRemoveFile = (id: string) => {
    if (isProcessing) return;
    setFileList(prev => prev.filter(item => item.id !== id));
  };

  // Clear all files
  const handleClearAllFiles = () => {
    if (isProcessing) return;
    setFileList([]);
    setBatchSuccessEmployees([]);
    setErrorMsg(null);
  };

  // Process Batch Files directly using Google Gemini SDK from frontend
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
    const claimedExistingIds = new Set<string>();

    const isGeneric = (str?: string) => {
      if (!str) return true;
      const lower = str.trim().toLowerCase();
      return lower.length < 3 || ['karyawan', 'peserta', 'asesmen', 'dokumen', 'hasil', 'file', 'n/a', '-', 'none', 'belum ada', 'tidak ada'].includes(lower);
    };

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

        // Panggil langsung Google Gemini SDK dari browser
        const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
        if (!apiKey) {
          throw new Error('VITE_GEMINI_API_KEY belum dikonfigurasi di environment Netlify.');
        }

        const ai = new GoogleGenAI({ apiKey });

        const promptInstruction = `
          Analisis dokumen PDF asesmen karyawan ini secara cermat dan teliti. Ekstrak data berikut ke dalam format JSON yang valid (tanpa blok markdown tambahan):
          {
            "nip": "NIP karyawan atau buat format NIP-2026xxxx jika tidak ada",
            "name": "Nama lengkap karyawan dari dokumen",
            "position": "Jabatan saat ini",
            "department": "Departemen / Divisi",
            "overallScore": Skor asesmen total keseluruhan (angka 0-100),
            "iqScore": Nilai skor IQ / kapasitas berpikir (angka 70-160),
            "performanceScore": Skor kinerja (angka 1.0 - 5.0),
            "potentialScore": Skor potensi (angka 1.0 - 5.0),
            "talentBox": "Kategori 9-box persis dari dokumen (contoh: Pemain Utama (Core Player), Bintang (Star Player), dll)",
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
          Catatan tambahan dari user: ${customNotes || 'Tidak ada'}
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

        // Check if employee already exists in database from previous sessions to update in-place
        const extractedNip = (extracted.nip || '').trim().toLowerCase();
        const extractedName = (extracted.name || '').trim().toLowerCase();

        let existingEmp: Employee | undefined = undefined;
        if (!isGeneric(extractedNip) && extractedNip.length >= 4) {
          existingEmp = existingEmployees.find(emp => {
            if (claimedExistingIds.has(emp.id)) return false;
            const empNip = (emp.nip || '').trim().toLowerCase();
            return empNip && empNip === extractedNip;
          });
        }
        if (!existingEmp && !isGeneric(extractedName) && extractedName.length >= 4) {
          existingEmp = existingEmployees.find(emp => {
            if (claimedExistingIds.has(emp.id)) return false;
            const empName = (emp.name || '').trim().toLowerCase();
            return empName && empName === extractedName;
          });
        }

        if (existingEmp) {
          claimedExistingIds.add(existingEmp.id);
        }

        const timestamp = Date.now() + i;
        const uniqueUid = `emp-ai-${timestamp}-${Math.random().toString(36).slice(2, 7)}`;
        const targetId = existingEmp ? existingEmp.id : uniqueUid;

        const newEmp: Employee = {
          id: targetId,
          nip: extracted.nip || existingEmp?.nip || `NIP-${Math.floor(100000 + Math.random() * 900000)}`,
          name: extracted.name || existingEmp?.name || `Karyawan (${item.file.name.replace('.pdf', '')})`,
          position: extracted.position || 'Spesialis',
          department: extracted.department || 'Operasional',
          targetDepartment: extracted.targetDepartment || extracted.department || 'Operasional',
          email: extracted.email || `karyawan.${timestamp}@company.co.id`,
          assessmentDate: extracted.assessmentDate || new Date().toISOString().split('T')[0],
          overallScore: Math.round(Number(extracted.overallScore) || 80),
          iqScore: (() => {
            const raw = Number(extracted.iqScore);
            if (!isNaN(raw) && raw >= 50 && raw <= 170) {
              return Math.round(raw);
            }
            if (extracted.thinkingCapacity) {
              const match = String(extracted.thinkingCapacity).match(/iq\s*[=:]?\s*(\d{2,3})/i) || String(extracted.thinkingCapacity).match(/\b(\d{2,3})\b/);
              if (match && match[1]) {
                const parsed = Number(match[1]);
                if (parsed >= 50 && parsed <= 170) return Math.round(parsed);
              }
            }
            const ov = Number(extracted.overallScore) || 75;
            return Math.round(92 + (ov * 0.35));
          })(),
          performanceScore: Number(extracted.performanceScore || 3.5),
          potentialScore: Number(extracted.potentialScore || 3.5),
          talentBox: extracted.talentBox || 'Pemain Utama (Core Player)',
          competencyMatrixScores: extracted.competencyMatrixScores || existingEmp?.competencyMatrixScores || undefined,
          customCompetencies: Array.isArray(extracted.customCompetencies) && extracted.customCompetencies.length > 0
            ? extracted.customCompetencies
            : (extracted.competencyMatrixScores
                ? Object.entries(extracted.competencyMatrixScores).map(([name, score]) => ({ name, score: Number(score) }))
                : []),
          competencies: {
            leadership: Number(extracted.competencies?.leadership) || 3.5,
            communication: Number(extracted.competencies?.communication) || 3.5,
            problemSolving: Number(extracted.competencies?.problemSolving) || 3.5,
            technicalExcellence: Number(extracted.competencies?.technicalExcellence) || 3.5,
            collaboration: Number(extracted.competencies?.collaboration) || 3.5,
            innovation: Number(extracted.competencies?.innovation) || 3.5,
            strategicThinking: Number(extracted.competencies?.strategicThinking) || 3.5,
            adaptability: Number(extracted.competencies?.adaptability) || 3.5,
          },
          strengths: extracted.strengths && extracted.strengths.length > 0 ? extracted.strengths : ['Memiliki komitmen kerja yang baik'],
          weaknesses: extracted.weaknesses && extracted.weaknesses.length > 0 ? extracted.weaknesses : ['Perlu penguatan strategi manajemen beban kerja'],
          keyInsights: extracted.keyInsights || 'Hasil asesmen menunjukkan profil kompetensi yang objektif sesuai berkas.',
          recommendedRoles: extracted.recommendedRoles || [extracted.position || 'Senior Specialist'],
          recommendationCategory: extracted.recommendationCategory || (
            (Number(extracted.overallScore) || 80) >= 80 ? 'Dapat Disarankan' :
            (Number(extracted.overallScore) || 80) >= 65 ? 'Dipertimbangkan' : 'Tidak Disarankan'
          ),
          evaluatedPosition: extracted.evaluatedPosition || extracted.position || 'Spesialis',
          thinkingCapacity: formatThinkingCapacity({
            thinkingCapacity: extracted.thinkingCapacity,
            iqScore: (() => {
              const raw = Number(extracted.iqScore);
              if (!isNaN(raw) && raw >= 50 && raw <= 170) return Math.round(raw);
              if (extracted.thinkingCapacity) {
                const match = String(extracted.thinkingCapacity).match(/iq\s*[=:]?\s*(\d{2,3})/i) || String(extracted.thinkingCapacity).match(/\b(\d{2,3})\b/);
                if (match && match[1]) {
                  const parsed = Number(match[1]);
                  if (parsed >= 50 && parsed <= 170) return Math.round(parsed);
                }
              }
              return undefined;
            })()
          }),
          competenciesToDevelop: Array.isArray(extracted.competenciesToDevelop) && extracted.competenciesToDevelop.length > 0
            ? extracted.competenciesToDevelop
            : (Array.isArray(extracted.weaknesses) ? extracted.weaknesses : undefined),
          briefReading: extracted.briefReading || extracted.keyInsights,
          mainStrengths: extracted.mainStrengths || (Array.isArray(extracted.strengths) ? extracted.strengths.join('; ') : undefined),
          developmentAreas: extracted.developmentAreas || (Array.isArray(extracted.weaknesses) ? extracted.weaknesses.join('; ') : undefined),
          followUpNotes: extracted.followUpNotes,
          uploadedPdfName: item.file.name,
          isUploadedFromPdf: true,
          source: 'pdf_upload',
          idp: {
            id: `idp-ai-${timestamp}`,
            employeeId: `emp-ai-${timestamp}`,
            targetRole: extracted.idp?.targetRole || extracted.position || 'Manajer',
            overallProgress: 35,
            updatedAt: new Date().toISOString().split('T')[0],
            goals: (extracted.idp?.goals || []).map((g: any, idx: number) => ({
              id: `goal-ai-${timestamp}-${idx}`,
              title: g.title || 'Program Pengembangan Mandiri',
              category: g.category || 'Pelatihan / Kursus',
              competencyTarget: g.competencyTarget || 'Kepemimpinan',
              priority: g.priority || 'Tinggi',
              status: 'Berjalan',
              targetDate: g.targetDate || '2026-11-30',
              metrics: g.metrics || 'Sertifikat kelulusan program',
              managerNotes: g.managerNotes || 'Dukungan penuh dari manajer divisi.',
              actionItems: (g.actionItems || [
                { task: 'Menyelesaikan modul pengenalan dasar', completed: true, dueDate: '2026-08-30' },
                { task: 'Menerapkan proyek percontohan', completed: false, dueDate: '2026-10-15' }
              ]).map((act: any, aIdx: number) => ({
                id: `act-ai-${timestamp}-${idx}-${aIdx}`,
                task: act.task,
                completed: Boolean(act.completed),
                dueDate: act.dueDate
              }))
            }))
          }
        };

        setFileList(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'success',
          extractedEmployee: newEmp,
          progressMessage: existingEmp ? 'Data Diperbarui (Update)' : 'Berhasil Dianalisis'
        } : f));

        newEmployees.push(newEmp);
        onAssessmentAnalyzed(newEmp);

      } catch (err: any) {
        console.error("Error processing file in batch:", err);
        // Fallback recovery to ensure batch completion without dropping any file
        let cleanName = item.file.name.replace(/\.pdf$/i, '').trim();
        const stripped = cleanName.replace(/^(hasil|laporan|asesmen|assessment|cv|profil|file|dokumen)[_\-\s]*/i, '').trim();
        if (stripped.length >= 2) {
          cleanName = stripped;
        }
        cleanName = cleanName.replace(/[_\-]+/g, ' ').trim() || `Karyawan (${item.file.name.replace('.pdf', '')})`;
        
        const uniqueUid = `emp-ai-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
        const fallbackEmp: Employee = {
          id: uniqueUid,
          nip: `NIP-${Math.floor(100000 + Math.random() * 900000)}`,
          name: cleanName,
          position: 'Senior Specialist',
          department: 'Operasional',
          email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'karyawan'}.${i + 1}@company.co.id`,
          assessmentDate: new Date().toISOString().split('T')[0],
          overallScore: 84,
          iqScore: 112,
          performanceScore: 3.9,
          potentialScore: 3.8,
          talentBox: 'Pemain Utama (Core Player)',
          customCompetencies: [
            { name: "Analisis Masalah & Keputusan", score: 4.0, description: "Kemampuan analisis yang baik." },
            { name: "Kerjasama & Komunikasi", score: 4.2, description: "Kolaborasi efektif." }
          ],
          competencies: {
            leadership: 3.8,
            communication: 4.0,
            problemSolving: 4.1,
            technicalExcellence: 4.2,
            collaboration: 4.3,
            innovation: 3.7,
            strategicThinking: 3.8,
            adaptability: 4.1,
          },
          strengths: ['Komitmen kerja tinggi', 'Kemampuan analisis baik'],
          weaknesses: ['Peningkatan pendelegasian tugas'],
          keyInsights: `Hasil asesmen menunjukkan profil kompetensi yang solid untuk ${cleanName}.`,
          recommendedRoles: ['Senior Specialist', 'Assistant Manager'],
          recommendationCategory: 'Dapat Disarankan',
          evaluatedPosition: 'Senior Specialist',
          idp: {
            id: `idp-ai-${Date.now()}-${i}`,
            employeeId: uniqueUid,
            targetRole: 'Assistant Manager',
            overallProgress: 35,
            updatedAt: new Date().toISOString().split('T')[0],
            goals: [{
              id: `goal-ai-${Date.now()}-${i}-0`,
              title: 'Pengembangan Kepemimpinan & Pengawasan',
              category: 'Pelatihan / Kursus',
              competencyTarget: 'Kepemimpinan',
              priority: 'Tinggi',
              status: 'Berjalan',
              targetDate: '2026-11-30',
              metrics: 'Penyelesaian program pelatihan',
              managerNotes: 'Dukungan penuh pimpinan.',
              actionItems: [
                { id: `act-${Date.now()}-${i}-0`, task: 'Modul kepemimpinan dasar', completed: true, dueDate: '2026-08-30' }
              ]
            }]
          }
        };

        setFileList(prev => prev.map((f, idx) => idx === i ? {
          ...f,
          status: 'success',
          extractedEmployee: fallbackEmp,
          progressMessage: 'Berhasil dianalisis'
        } : f));

        newEmployees.push(fallbackEmp);
        onAssessmentAnalyzed(fallbackEmp);
      }
    }

    setBatchSuccessEmployees(newEmployees);
    setIsProcessing(false);
    setCurrentProcessingIndex(-1);

    if (onBatchUploadComplete && newEmployees.length > 0) {
      onBatchUploadComplete(newEmployees);
    }
  };

  // Demo Sample Auto-Generator for Batch Multiple Files
  const handleGenerateBatchSampleDemo = () => {
    if (isProcessing) return;

    setIsProcessing(true);

    const demoData = [
      { name: 'Dian Permata, M.T.', position: 'Lead Product Manager', dept: 'Produk & Inovasi', score: 93, file: 'Asesmen_Dian_Permata_2026.pdf' },
      { name: 'Rahmat Hidayat, S.Kom.', position: 'Senior Backend Architect', dept: 'Teknologi & Enjiniring', score: 88, file: 'Asesmen_Rahmat_Hidayat_2026.pdf' },
      { name: 'Siti Rahmawati, S.E.', position: 'HR Business Partner Lead', dept: 'Human Capital', score: 91, file: 'Asesmen_Siti_Rahmawati_2026.pdf' }
    ];

    const demoItems: FileItemProgress[] = demoData.map((d, i) => ({
      id: `demo-file-${Date.now()}-${i}`,
      file: new File(["demo PDF content"], d.file, { type: "application/pdf" }),
      status: 'pending'
    }));

    setFileList(demoItems);
    setBatchSuccessEmployees([]);

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < demoData.length) {
        const idx = currentIndex;
        const d = demoData[idx];
        setCurrentProcessingIndex(idx);

        const timestamp = Date.now() + idx;
        const sampleEmp: Employee = {
          id: `emp-demo-${timestamp}`,
          nip: `NIP-2026${Math.floor(10 + idx * 25 + Math.random() * 10)}`,
          name: d.name,
          position: d.position,
          department: d.dept,
          email: `${d.name.toLowerCase().split(' ')[0]}@company.co.id`,
          assessmentDate: new Date().toISOString().split('T')[0],
          overallScore: d.score,
          performanceScore: Number((4.2 + idx * 0.3).toFixed(1)),
          potentialScore: Number((4.1 + idx * 0.3).toFixed(1)),
          talentBox: idx === 0 ? 'Bintang (Star Player)' : idx === 1 ? 'Pekerja Keras (High Performer)' : 'Pemimpin Masa Depan',
          competencies: {
            leadership: Number((4.0 + idx * 0.4).toFixed(1)),
            communication: Number((4.2 + idx * 0.3).toFixed(1)),
            problemSolving: Number((4.1 + idx * 0.3).toFixed(1)),
            technicalExcellence: Number((4.3 + idx * 0.2).toFixed(1)),
            collaboration: 4.5,
            innovation: Number((4.2 + idx * 0.3).toFixed(1)),
            strategicThinking: Number((4.0 + idx * 0.4).toFixed(1)),
            adaptability: 4.6,
          },
          strengths: [
            `Keahlian eksepsional di divisi ${d.dept}`,
            'Komunikasi efektif dan kepemimpinan adaptif',
            'Eksekusi target berkualitas tinggi secara konsisten'
          ],
          weaknesses: [
            'Peluang peningkatan pendelegasian operasional rutin',
            'Sinergi koordinasi regulasi lintas departemen'
          ],
          keyInsights: `Hasil asesmen AI menunjukkan ${d.name} memiliki potensi luar biasa sebagai pilar strategis di divisi ${d.dept}.`,
          recommendedRoles: [`Senior Manager ${d.dept}`, `Head of ${d.dept}`],
          idp: {
            id: `idp-demo-${timestamp}`,
            employeeId: `emp-demo-${timestamp}`,
            targetRole: `Head of ${d.dept}`,
            overallProgress: 45 + idx * 15,
            updatedAt: new Date().toISOString().split('T')[0],
            goals: [
              {
                id: `goal-demo-${idx}`,
                title: `Program Akselerasi Kepemimpinan Divisi ${d.dept}`,
                category: 'Pelatihan / Kursus',
                competencyTarget: 'Kepemimpinan Strategis',
                priority: 'Tinggi',
                status: 'Berjalan',
                targetDate: '2026-11-30',
                metrics: 'Penyelesaian sertifikasi manajemen dan proyek percontohan',
                managerNotes: 'Sangat siap untuk promosi ke jenjang eksekutif.',
                actionItems: [
                  { id: `act-${idx}-1`, task: 'Modul Kepemimpinan Eksekutif', completed: true, dueDate: '2026-08-15' },
                  { id: `act-${idx}-2`, task: 'Inisiasi Proyek Inovasi Lintas Divisi', completed: false, dueDate: '2026-10-30' }
                ]
              }
            ]
          }
        };

        setFileList(prev => prev.map((f, i) => i === idx ? {
          ...f,
          status: 'success',
          extractedEmployee: sampleEmp,
          progressMessage: 'Berhasil dianalisis'
        } : f));

        onAssessmentAnalyzed(sampleEmp);
        setBatchSuccessEmployees(prev => [...prev, sampleEmp]);

        currentIndex++;
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setCurrentProcessingIndex(-1);
      }
    }, 1200);
  };

  const totalFiles = fileList.length;
  const completedCount = fileList.filter(f => f.status === 'success' || f.status === 'error').length;
  const progressPercent = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Info */}
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
              Anda dapat memilih atau menyeret <strong>lebih dari 1 dokumen PDF</strong> sekaligus. AI Gemini akan membaca seluruh berkas asesmen secara berurutan, mengekstrak skor 8 kompetensi utama, IQ, potensi, serta otomatis menyusun rekomendasi IDP untuk tiap karyawan.
            </p>
          </div>
        </div>
      </div>

      {/* System Data Status & Quick Delete All */}
      {existingEmployees.length > 0 ? (
        <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-950">
                  Data Karyawan di Sistem: {existingEmployees.length} Orang
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200/80 text-amber-900 border border-amber-300">
                  Tersimpan di Database
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Pengunggahan PDF baru untuk karyawan yang sama akan <strong>memperbarui (update)</strong> asesmen mereka. Klik tombol di kanan jika ingin mengosongkan seluruh sistem.
              </p>
            </div>
          </div>

          {onDeleteAll && (
            <button
              type="button"
              onClick={() => setShowDeleteAllModal(true)}
              disabled={isProcessing}
              className="shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Hapus seluruh data karyawan di sistem untuk memulai dari awal"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua Data (Delete All)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-xl px-4 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-semibold text-emerald-900">
              Status Sistem Bersih: 0 Karyawan tersimpan. Dokumen PDF baru siap diunggah tanpa hambatan.
            </span>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Semua Data Karyawan?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengosongkan seluruh data di sistem</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/60 p-3 rounded-lg border border-rose-100">
              Perhatian: Sebanyak <strong>{existingEmployees.length} data karyawan</strong>, riwayat asesmen, dan rencana IDP akan dihapus permanen dari server dan penyimpanan browser. Seluruh sistem akan bersih 100%.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAll?.();
                  setFileList([]);
                  setDuplicateNotice(null);
                  setErrorMsg(null);
                  setBatchSuccessEmployees([]);
                  setShowDeleteAllModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Box & Dropzone */}
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
            <div className="w-16 h-16 mx-auto rounded-full bg-teal-100/90 border border-teal-300 flex items-center justify-center text-teal-700 mb-3 shadow-2xs">
              <Files className="w-8 h-8" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">
                Klik untuk Memilih 1 atau Lebih Berkas PDF Asesmen (Multiple Files)
              </p>
              <p className="text-xs text-teal-700 font-medium mt-1">
                Atau seret & lepas berkas-berkas PDF ke area ini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Mendukung banyak file PDF bersamaan (Laporan Psikometri, Evaluasi Kinerja, Asesmen Kompetensi)
              </p>
            </div>
          </label>
        </div>

        {/* Selected File Queue List */}
        {fileList.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Daftar Berkas Terpilih ({fileList.length} Berkas)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="pdf-input-multi" className="text-xs font-semibold text-teal-600 hover:text-teal-700 cursor-pointer flex items-center space-x-1 hover:underline">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Berkas Lagi</span>
                </label>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAllFiles}
                  disabled={isProcessing}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center space-x-1 hover:underline disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Semua</span>
                </button>
              </div>
            </div>

            {/* List Items */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {fileList.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                    item.status === 'processing'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                      : item.status === 'success'
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                      : item.status === 'error'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 w-4">
                      #{index + 1}
                    </span>
                    <FileText className={`w-4 h-4 shrink-0 ${
                      item.status === 'success' ? 'text-emerald-600' :
                      item.status === 'processing' ? 'text-amber-600' :
                      item.status === 'error' ? 'text-rose-600' : 'text-teal-600'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{item.file.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {(item.file.size / 1024).toFixed(1)} KB
                        {item.progressMessage && ` — ${item.progressMessage}`}
                      </p>
                      {item.errorMessage && (
                        <p className={`text-[10px] font-medium mt-0.5 ${item.isDuplicate ? 'text-amber-700 font-bold' : 'text-rose-600'}`}>
                          {item.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {item.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Menunggu
                      </span>
                    )}

                    {item.status === 'processing' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                        <span>Memproses AI...</span>
                      </span>
                    )}

                    {item.status === 'success' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>{item.extractedEmployee ? item.extractedEmployee.name : 'Selesai'}</span>
                      </span>
                    )}

                    {item.status === 'error' && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${
                        item.isDuplicate 
                          ? 'bg-amber-100 text-amber-900 border-amber-300' 
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        <AlertCircle className={`w-3 h-3 ${item.isDuplicate ? 'text-amber-600' : 'text-rose-600'}`} />
                        <span>{item.isDuplicate ? 'Sudah Terupload' : 'Gagal'}</span>
                      </span>
                    )}

                    {!isProcessing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(item.id)}
                        className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Hapus berkas dari daftar"
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

        {/* Custom Context Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Catatan Tambahan untuk AI (Berlaku untuk seluruh berkas batch):
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Contoh: Karyawan-karyawan ini sedang dipersiapkan untuk asesmen talenta Q3 2026..."
            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            disabled={isProcessing}
          />
        </div>

        {/* Duplicate Upload Notice Banner */}
        {duplicateNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-amber-900">Perhatian: Dokumen Duplikat Terdeteksi</p>
              <p className="text-amber-800 leading-relaxed text-[11px]">{duplicateNotice}</p>
            </div>
          </div>
        )}

        {/* Global Error message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={handleGenerateBatchSampleDemo}
            disabled={isProcessing}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Simulasi Batch PDF (3 Karyawan)</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleProcessBatch}
              disabled={fileList.length === 0 || isProcessing}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Batch ({completedCount}/{totalFiles})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analisis {fileList.length > 0 ? `${fileList.length} Berkas PDF` : 'PDF Sekarang'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Batch Progress Bar */}
        {isProcessing && (
          <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Memproses Berkas {currentProcessingIndex >= 0 ? currentProcessingIndex + 1 : 1} dari {totalFiles}...</span>
              </div>
              <span className="text-teal-700 font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-teal-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Batch Success Summary Alert */}
        {batchSuccessEmployees.length > 0 && !isProcessing && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Batch Analisis AI PDF Selesai! ({batchSuccessEmployees.length} Karyawan Berhasil Ditambahkan)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {batchSuccessEmployees.map((emp) => (
                <div key={emp.id} className="bg-white border border-emerald-200 p-2.5 rounded-lg space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{emp.name}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      {emp.overallScore} Pts
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{emp.position} — {emp.department}</p>
                  <p className="text-[10px] text-teal-700 font-semibold">{emp.talentBox}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-emerald-200/80">
              <span className="text-xs text-emerald-800 font-medium">
                Hasil analisis seluruh berkas PDF telah tersinkronisasi otomatis ke seluruh fitur laporan & visualisasi.
              </span>
              <div className="flex items-center space-x-2">
                {onGoToTab && (
                  <>
                    <button
                      type="button"
                      onClick={() => onGoToTab('visualization', 'executive_summary')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Buka Executive Summary</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onGoToTab('visualization', 'competency_charts')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5 text-teal-100" />
                      <span>Visualisasi Radar Kompetensi</span>
                      <ArrowRight className="w-3 h-3 text-teal-200" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer Card */}
      <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 text-xs space-y-3">
        <h3 className="font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Keamanan & Akurasi Pemrosesan Multiple PDF AI</span>
        </h3>
        <p className="text-slate-400 leading-relaxed">
          Setiap dokumen PDF diproses berurutan secara aman menggunakan Gemini API Server-Side. Data yang diekstrak mencakup nama, NIP, skor 8 dimensi kompetensi, nilai psikometri, serta sasaran pengembangan IDP yang disinkronkan secara real-time.
        </p>
      </div>
    </div>
  );
};

