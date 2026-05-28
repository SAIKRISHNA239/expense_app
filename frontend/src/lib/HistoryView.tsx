import { useMemo } from 'react';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions, useDeleteTransaction } from './hooks';
import { INCOME_CATEGORY, AUTO_PAY_CATEGORY, formatINR } from './utils';

// Human-readable full date label
const formatFullDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00'); // prevent UTC shift
  return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
};

const formatMonthYear = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export default function HistoryView() {
  const { data: transactions = [] } = useTransactions();
  const { mutate: deleteTransaction } = useDeleteTransaction();

  type DayGroup = { date: string; label: string; txs: typeof transactions };
  type MonthGroup = { ym: string; label: string; days: DayGroup[]; total: number; income: number };

  const grouped = useMemo(() => {
    const monthMap = new Map<string, MonthGroup>();

    for (const tx of transactions) {
      const ym = tx.date.substring(0, 7);
      const isInc = tx.is_income || tx.category === INCOME_CATEGORY;

      if (!monthMap.has(ym)) {
        monthMap.set(ym, { ym, label: formatMonthYear(ym), days: [], total: 0, income: 0 });
      }
      const mg = monthMap.get(ym)!;
      if (isInc) mg.income += Number(tx.amount);
      else mg.total += Number(tx.amount);

      // Day group inside the month
      let dayGroup = mg.days.find(d => d.date === tx.date);
      if (!dayGroup) {
        dayGroup = { date: tx.date, label: formatFullDate(tx.date), txs: [] };
        mg.days.push(dayGroup);
      }
      dayGroup.txs.push(tx);
    }

    // Sort months newest first; days newest first within month
    const months = [...monthMap.values()].sort((a, b) => b.ym.localeCompare(a.ym));
    months.forEach(mg => mg.days.sort((a, b) => b.date.localeCompare(a.date)));
    return months;
  }, [transactions]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar h-full pb-32">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-white/5 sticky top-0 bg-[#0b0c10]/90 backdrop-blur-xl z-10 shadow-sm">
        <h1 className="text-[28px] font-black tracking-tighter text-white">Transaction History</h1>
        <p className="text-[12px] text-zinc-500 font-bold tracking-widest uppercase mt-1">{transactions.length} entries recorded</p>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10 shadow-inner">
            <TrendingDown className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-lg font-bold text-zinc-400">No transactions yet</p>
          <p className="text-xs mt-1 font-medium">Log an expense to see it here.</p>
        </div>
      ) : (
        grouped.map(mg => (
          <div key={mg.ym}>
            {/* Month Header */}
            <div className="px-5 pt-8 pb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-black text-white tracking-tight">{mg.label}</h2>
              <div className="flex gap-3 text-[12px] font-bold">
                {mg.income > 0 && (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shadow-inner">+{formatINR(mg.income)} IN</span>
                )}
                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 shadow-inner">-{formatINR(mg.total)} OUT</span>
              </div>
            </div>

            {mg.days.map(dg => (
              <div key={dg.date}>
                {/* Day Label */}
                <div className="px-5 py-2 mt-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] relative before:absolute before:inset-y-1/2 before:left-full before:ml-3 before:w-12 before:h-px before:bg-white/10">{dg.label}</span>
                </div>

                {/* Transactions */}
                <div className="mx-5 mb-6 bg-[#111216]/80 backdrop-blur-md rounded-[1.5rem] border border-zinc-800/80 shadow-xl overflow-hidden divide-y divide-white/5 relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none -z-10"></div>
                  {dg.txs.map(tx => {
                    const isInc = tx.is_income || tx.category === INCOME_CATEGORY;
                    const isAP = tx.category === AUTO_PAY_CATEGORY;
                    return (
                      <div key={tx.id} className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/5 transition-colors">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border shadow-inner ${isInc ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                          {isInc ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-zinc-200 tracking-tight truncate">{tx.category}</p>
                          <p className="text-[11px] text-zinc-500 font-semibold mt-0.5 tracking-wide">
                            {tx.time}
                            {tx.duration_months > 1 && (
                              <span> · <span className="text-blue-400">{tx.duration_months}-month spread</span></span>
                            )}
                            {isAP && (
                              <span> · <span className="text-yellow-400">Auto-Pay</span></span>
                            )}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`font-black text-[15px] tabular-nums tracking-tight ${isInc ? 'text-emerald-400' : 'text-zinc-100'}`}>
                            {isInc ? '+' : ''}{formatINR(Number(tx.amount))}
                          </span>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
                            onClick={() => deleteTransaction(tx.id)}
                            aria-label="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
