import React, { useState } from 'react';
import { 
  Home,
  FileUp, 
  Target, 
  Users, 
  Sparkles,
  Grid,
  Radio,
  RefreshCw
} from 'lucide-react';
import { VisualizationSubTab } from '../types';
import { SyncConnectionStatus, realtimeSync } from '../services/syncService';

interface HeaderProps {
  activeTab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees';
  setActiveTab: (tab: 'visualization' | 'ninebox' | 'upload' | 'idp' | 'employees') => void;
  visualizationSubTab?: VisualizationSubTab;
  onSelectVisualizationSubTab?: (subTab: VisualizationSubTab) => void;
  employeeCount: number;
  onOpenAddModal?: () => void;
  syncStatus?: SyncConnectionStatus;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onSelectVisualizationSubTab,
  employeeCount,
  syncStatus = 'connected'
}) => {
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    await realtimeSync.fetchLatest();
    setTimeout(() => setIsManualSyncing(false), 600);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab('visualization'); onSelectVisualizationSubTab?.('executive_summary'); }}>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  TalentPulse AI
                </h1>
                <span className="text-[10px] uppercase font-semibold tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemetaan Kompetensi Karyawan, Assessment AI & Real-Time IDP
              </p>
            </div>
          </div>

          {/* Real-time Status Badge & Sync Control */}
          <div className="flex items-center space-x-2">
            <div 
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                syncStatus === 'connected' 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : syncStatus === 'connecting' || syncStatus === 'reconnecting'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Perubahan data diperbarui secara otomatis ke semua perangkat dan link share secara real-time"
            >
              <span className="relative flex h-2 w-2">
                {syncStatus === 'connected' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  syncStatus === 'connected' ? 'bg-emerald-400' : syncStatus === 'offline' ? 'bg-slate-500' : 'bg-amber-400 animate-pulse'
                }`}></span>
              </span>
              <span className="font-semibold">
                {syncStatus === 'connected' ? 'Live Real-Time Sync' : syncStatus === 'offline' ? 'Offline' : 'Menyambungkan...'}
              </span>
            </div>

            <button
              onClick={handleManualSync}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Sinkronisasi manual dengan server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto border-t border-slate-800 py-1.5 scrollbar-none">
          {/* Modul Home (Direct Tab) */}
          <button
            onClick={() => {
              setActiveTab('visualization');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'visualization'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4 text-teal-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('ninebox')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ninebox'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Grid className="w-4 h-4 text-teal-400" />
            <span>Pemetaan Talent (9-Box)</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Unggah PDF Assessment AI</span>
          </button>

          <button
            onClick={() => setActiveTab('idp')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'idp'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Dashboard IDP (Manager Real-Time)</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Karyawan ({employeeCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};

