import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Copy, 
  RotateCcw, 
  Loader2, 
  ArrowRight, 
  FileText, 
  Sliders, 
  ThumbsUp, 
  Wand2,
  BookOpen,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export interface TextRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  context?: 'executive_summary' | 'catatan_pola' | 'idp_goal' | 'manager_notes' | 'strengths_weaknesses' | 'general';
  title?: string;
  description?: string;
  onApply?: (refinedText: string) => void;
}

export const TextRefinementModal: React.FC<TextRefinementModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  context = 'executive_summary',
  title = 'Rapihkan Bahasa (AI Gemini)',
  description = 'Sempurnakan tata bahasa, ejaan baku (EYD V), dan diksi profesional laporan Human Capital dengan AI Gemini.',
  onApply
}) => {
  const [inputText, setInputText] = useState<string>(initialText);
  const [refinedResult, setRefinedResult] = useState<{
    originalText: string;
    refinedText: string;
    summaryChanges: string;
    keyImprovements: string[];
  } | null>(null);
  const [selectedTone, setSelectedTone] = useState<'formal_executive' | 'concise' | 'actionable'>('formal_executive');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setInputText(initialText);
      setRefinedResult(null);
      setErrorMsg(null);
      setCopied(false);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleRefine = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Silakan masukkan teks yang ingin dirapihkan terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/refine-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: inputText.trim(),
          context,
          tone: selectedTone
        })
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Gagal memproses perapihan bahasa.');
      }

      setRefinedResult(resData.data);
    } catch (err: any) {
      console.error('Text polish error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat menghubungi layanan AI Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = refinedResult ? refinedResult.refinedText : inputText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (refinedResult && onApply) {
      onApply(refinedResult.refinedText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-400/20 text-teal-200 border border-teal-300/30 uppercase tracking-wider">
                  Gemini 3 AI
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          {/* Tone & Style Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
              <Sliders className="w-3.5 h-3.5 text-teal-600" />
              <span>Gaya Bahasa & Diksi:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTone('formal_executive')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTone === 'formal_executive'
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">Formal Eksekutif</span>
                  {selectedTone === 'formal_executive' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Bahasa baku EYD V, elegan, dan berbobot manajerial</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTone('concise')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTone === 'concise'
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">Ringkas & Padat</span>
                  {selectedTone === 'concise' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">To-the-point, hilangkan kata berulang, fokus fakta inti</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTone('actionable')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedTone === 'actionable'
                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold">Action-Oriented</span>
                  {selectedTone === 'actionable' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">Fokus langkah aksi konkret, SMART, dan evaluasi</p>
              </button>
            </div>
          </div>

          {/* Text Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Teks yang Ingin Dirapihkan:</span>
              </label>
              {inputText !== initialText && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText(initialText);
                    setRefinedResult(null);
                  }}
                  className="text-[11px] text-teal-600 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kembalikan Teks Awal</span>
                </button>
              )}
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              placeholder="Tulis atau tempel teks catatan laporan asesmen, rekomendasi, evaluasi kinerja, atau ringkasan yang ingin dirapihkan bahasanya..."
              className="w-full text-xs p-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50 leading-relaxed shadow-inner"
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>{inputText.length} karakter</span>
              <span>Bahasa sasaran: Bahasa Indonesia Baku</span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Refined Result Display */}
          {refinedResult && (
            <div className="p-4.5 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3.5 animate-in fade-in duration-300 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1 bg-teal-600 rounded-md text-white">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                    Hasil Poles Bahasa (AI Gemini)
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full border border-teal-300">
                  {refinedResult.summaryChanges}
                </span>
              </div>

              {/* Polished Text Box */}
              <div className="p-3.5 bg-white rounded-xl border border-teal-300/80 text-xs text-slate-900 leading-relaxed shadow-inner font-medium">
                {refinedResult.refinedText}
              </div>

              {/* Improvements highlights */}
              {refinedResult.keyImprovements && refinedResult.keyImprovements.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-teal-900 block mb-1">
                    Poin Penyempurnaan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {refinedResult.keyImprovements.map((imp, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1 text-[10px] font-medium bg-white text-teal-900 px-2 py-0.5 rounded-md border border-teal-200 shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-teal-600" />
                        <span>{imp}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleRefine}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 rounded-xl shadow-sm transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Merapihkan...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Rapihkan Bahasa Sekarang</span>
                </>
              )}
            </button>

            {refinedResult && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Salin hasil teks ke papan klip"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-teal-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Hasil</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {refinedResult && onApply && (
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Terapkan ke Dokumen</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
