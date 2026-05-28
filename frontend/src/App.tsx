import { useState } from 'react';
import LogView from './lib/LogView';
import DashboardView from './lib/DashboardView';
import ManageView from './lib/ManageView';
import HistoryView from './lib/HistoryView';
import { Calculator, LayoutDashboard, Settings, ClockArrowUp } from 'lucide-react';

type Tab = 'log' | 'dashboard' | 'history' | 'manage';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('log');

  return (
    <main className="h-screen w-full max-w-md mx-auto flex flex-col relative bg-[#0b0c10] overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'log' && <LogView />}
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'history' && <HistoryView />}
        {activeTab === 'manage' && <ManageView />}
      </div>

      {/* Floating Bottom Navigation Bar */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm rounded-[2rem] bg-[#0b0c10]/70 backdrop-blur-2xl border border-white/10 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.8)] z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-emerald-500/10 rounded-[2rem] pointer-events-none -z-10"></div>
        <div className="flex justify-around items-center h-[64px]">
          <button
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl ${
              activeTab === 'log' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('log')}
          >
            <Calculator className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'log' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}`} />
            <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Log</span>
          </button>

          <button
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl ${
              activeTab === 'dashboard' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'dashboard' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}`} />
            <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Dash</span>
          </button>

          <button
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl ${
              activeTab === 'history' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('history')}
          >
            <ClockArrowUp className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'history' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}`} />
            <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Hist</span>
          </button>

          <button
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl ${
              activeTab === 'manage' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            onClick={() => setActiveTab('manage')}
          >
            <Settings className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'manage' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}`} />
            <span className="text-[9px] font-bold tracking-widest uppercase mt-0.5">Set</span>
          </button>
        </div>
      </nav>
    </main>
  );
}
