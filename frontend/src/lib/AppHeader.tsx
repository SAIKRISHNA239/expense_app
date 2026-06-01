import { useMemo } from 'react';
import { LogOut, Flame, Wallet } from 'lucide-react';
import { useTransactions, useBudgetSummary } from './hooks';
import { getTodaySpend, getLogStreak, getGreeting, getSafeMessage } from './dailyStats';
import { formatINR } from './utils';

interface AppHeaderProps {
  username: string;
  onLogout: () => void;
}

export default function AppHeader({ username, onLogout }: AppHeaderProps) {
  const { data: transactions = [] } = useTransactions();
  const { data: budget } = useBudgetSummary();

  const todaySpend = useMemo(() => getTodaySpend(transactions), [transactions]);
  const streak = useMemo(() => getLogStreak(transactions), [transactions]);
  const safe = budget?.safe_to_spend ?? null;

  return (
    <header className="content-pad shrink-0 relative z-20 pt-2 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="brand-mark">
              <span className="brand-mark-inner">₹</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-teal-400/90 uppercase tracking-[0.18em]">
                {getGreeting()}
              </p>
              <p className="text-base font-extrabold text-white truncate leading-tight">{username}</p>
            </div>
          </div>
          {safe !== null && (
            <p className="text-[11px] text-zinc-500 font-medium mt-1 pl-[2.75rem]">
              {getSafeMessage(safe)}
            </p>
          )}
        </div>
        <button
          onClick={onLogout}
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-500 active:text-rose-400 active:border-rose-500/30 active:bg-rose-500/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
        <div className="stat-pill stat-pill--spend shrink-0">
          <span className="stat-pill-label">Today</span>
          <span className="stat-pill-value">{formatINR(todaySpend)}</span>
        </div>
        {safe !== null && (
          <div className={`stat-pill shrink-0 ${safe < 0 ? 'stat-pill--danger' : 'stat-pill--safe'}`}>
            <Wallet className="w-3.5 h-3.5 opacity-70" />
            <span className="stat-pill-label">Safe</span>
            <span className="stat-pill-value">{formatINR(safe)}</span>
          </div>
        )}
        {streak > 0 && (
          <div className="stat-pill stat-pill--streak shrink-0">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="stat-pill-value">{streak}d streak</span>
          </div>
        )}
      </div>
    </header>
  );
}
