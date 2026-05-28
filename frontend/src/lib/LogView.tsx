import { useState, useMemo } from 'react';
import { Trash2, CheckCircle2, History, TrendingUp } from 'lucide-react';
import Numpad from './Numpad';
import { useTransactions, useCategories, useAddTransaction, useDeleteTransaction } from './hooks';
import { INCOME_CATEGORY, formatDate, formatTime, formatINR } from './utils';

export default function LogView() {
  const [amountStr, setAmountStr] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [durationMonths, setDurationMonths] = useState(1);
  const [selectedMode, setSelectedMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => formatDate(new Date()));

  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { mutate: addTransaction } = useAddTransaction();
  const { mutate: deleteTransaction } = useDeleteTransaction();

  const durationOptions = [1, 2, 3, 6, 12];

  const currentAmountNum = useMemo(() => parseFloat(amountStr) || 0, [amountStr]);
  const recentLogs = useMemo(() => transactions.slice(0, 3), [transactions]);

  const getTargetDateStr = () => {
    if (selectedMode === 'today') return formatDate(new Date());
    if (selectedMode === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatDate(d);
    }
    return customDate;
  };

  const handleSave = (category: string) => {
    if (currentAmountNum <= 0) return;
    
    addTransaction({
      amount: currentAmountNum,
      category: category,
      date: getTargetDateStr(),
      time: formatTime(new Date()),
      duration_months: durationMonths,
      is_income: category === INCOME_CATEGORY
    });

    setAmountStr('');
    setDurationMonths(1);
    setSelectedMode('today');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1600);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Recents */}
      <div className="px-5 pt-8 pb-3 h-[110px] overflow-hidden flex flex-col justify-end relative">
        {/* Fade top */}
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#0b0c10] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        {recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <div key={log.id} className="flex justify-between items-center py-2 opacity-70 hover:opacity-100 transition-opacity animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${log.is_income ? 'text-emerald-400' : 'text-zinc-500'} font-black uppercase tracking-[0.15em]`}>
                    {log.category} · {log.time}
                  </span>
                  {log.duration_months > 1 && (
                    <span className="px-1.5 rounded-sm text-[9px] bg-blue-500/10 text-blue-400 font-bold tracking-widest">{log.duration_months}M</span>
                  )}
                </div>
                <span className={`text-[16px] font-black tracking-tight ${log.is_income ? 'text-emerald-400' : 'text-white'} flex items-center gap-2`}>
                  {log.is_income ? '+' : ''}{formatINR(log.amount)}
                  {log.date !== formatDate(new Date()) && (
                    <span className="text-[10px] font-bold text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">{log.date}</span>
                  )}
                </span>
              </div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
                onClick={() => deleteTransaction(log.id)}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <p className="h-full flex items-center justify-center text-xs text-zinc-600 font-bold tracking-widest uppercase">No recent entries</p>
        )}
      </div>

      {/* Amount display */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-[120px] relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none -z-10"></div>
        {showToast && (
          <div className="absolute top-2 flex items-center bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md text-emerald-400 px-5 py-2 rounded-full font-bold text-[13px] shadow-[0_0_24px_rgba(52,211,153,0.4)] z-20 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 className="w-4 h-4 mr-2" /> Logged Successfully
          </div>
        )}
        <div className={`text-blue-500 text-3xl font-bold mb-0 transition-opacity ${amountStr ? 'opacity-100' : 'opacity-30'} shadow-blue-500/50`}>₹</div>
        <div className="text-[72px] leading-[1] font-black tracking-tighter text-white truncate w-full text-center tabular-nums drop-shadow-[0_8px_24px_rgba(255,255,255,0.15)]">
          {amountStr || '0'}
        </div>
      </div>

      {/* Config ribbon: date picker + spread */}
      <div className="flex gap-2.5 px-5 mb-4 w-full overflow-x-auto no-scrollbar relative z-10">
        <div className="flex-none bg-[#111216]/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 flex items-center gap-1 shadow-inner">
          <History className="w-4 h-4 text-zinc-500 ml-2 mr-1" />
          {(['today', 'yesterday'] as const).map((mode) => (
            <button
              key={mode}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300
                     ${selectedMode === mode ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}`}
              onClick={() => setSelectedMode(mode)}
            >
              {mode === 'today' ? 'Today' : 'Yest'}
            </button>
          ))}
          <div className="relative flex items-center mr-1 ml-1">
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setSelectedMode('custom');
              }}
              className="w-10 h-10 opacity-0 absolute inset-0 z-10 cursor-pointer"
              style={{ touchAction: 'auto' }}
            />
            <button className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300
                           ${selectedMode === 'custom' ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}`}>
              Custom
            </button>
          </div>
        </div>

        <div className="flex-none bg-[#111216]/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 flex gap-1 shadow-inner">
          {durationOptions.map((opt) => (
            <button
              key={opt}
              className={`w-9 py-1.5 text-[12px] font-black rounded-xl transition-all duration-300
                     ${durationMonths === opt ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}`}
              onClick={() => setDurationMonths(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Category 3-column Grid + Income chip */}
      <div className="flex-none px-5 pb-4 relative z-10">
        {/* Income chip */}
        <button
          disabled={currentAmountNum === 0}
          className="w-full mb-3 py-3.5 rounded-[1.2rem] text-[13px] font-black tracking-[0.15em] uppercase transition-all duration-300 active:scale-[0.98]
                 flex items-center justify-center gap-2 relative overflow-hidden group
                 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner
                 disabled:opacity-30 disabled:active:scale-100 disabled:grayscale"
          onClick={() => handleSave(INCOME_CATEGORY)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          <TrendingUp className="w-5 h-5" />
          Log Income
        </button>

        {/* Regular categories in 3-col grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              disabled={currentAmountNum === 0}
              className="py-3.5 px-1 rounded-[1rem] text-[12px] font-bold tracking-tight transition-all duration-200 active:scale-95
                     bg-white/5 text-zinc-300 border border-white/5 shadow-inner relative overflow-hidden
                     disabled:opacity-30 disabled:active:scale-100
                     hover:bg-white/10 hover:text-white hover:border-white/20"
              onClick={() => handleSave(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <Numpad amountStr={amountStr} setAmountStr={setAmountStr} />
    </div>
  );
}
