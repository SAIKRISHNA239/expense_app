import { useMemo, useState } from 'react';
import { Trash2, TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import {
  useTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
  useCategories,
} from './hooks';
import { useToast } from './Toast';
import { useConfirm } from './useConfirm';
import { LoadingScreen, ErrorScreen } from './LoadingScreen';
import EditTransactionModal from './EditTransactionModal';
import { INCOME_CATEGORY, AUTO_PAY_CATEGORY, formatINR, parseLocalDate, getErrorMessage } from './utils';
import type { Transaction } from './api';

const formatFullDate = (dateStr: string) =>
  parseLocalDate(dateStr).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

const formatMonthYear = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export default function HistoryView() {
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');

  type DayGroup = { date: string; label: string; txs: Transaction[] };
  type MonthGroup = { ym: string; label: string; days: DayGroup[]; total: number; income: number };

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = (transactions ?? []).filter((tx) =>
      !q || tx.category.toLowerCase().includes(q) || tx.date.includes(q)
    );

    const monthMap = new Map<string, MonthGroup>();

    for (const tx of filtered) {
      const ym = tx.date.substring(0, 7);
      const isInc = tx.is_income || tx.category === INCOME_CATEGORY;

      if (!monthMap.has(ym)) {
        monthMap.set(ym, { ym, label: formatMonthYear(ym), days: [], total: 0, income: 0 });
      }
      const mg = monthMap.get(ym)!;
      if (isInc) mg.income += Number(tx.amount);
      else mg.total += Number(tx.amount);

      let dayGroup = mg.days.find((d) => d.date === tx.date);
      if (!dayGroup) {
        dayGroup = { date: tx.date, label: formatFullDate(tx.date), txs: [] };
        mg.days.push(dayGroup);
      }
      dayGroup.txs.push(tx);
    }

    const months = [...monthMap.values()].sort((a, b) => b.ym.localeCompare(a.ym));
    months.forEach((mg) => mg.days.sort((a, b) => b.date.localeCompare(a.date)));
    return months;
  }, [transactions, search]);

  const handleDelete = async (id: string) => {
    const ok = await confirm('Delete this transaction?');
    if (!ok) return;
    deleteTransaction(id, {
      onSuccess: () => showToast('Deleted', 'success'),
      onError: (err) => showToast(getErrorMessage(err, 'Failed to delete'), 'error'),
    });
  };

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message="Could not load history." onRetry={() => refetch()} />;

  const txList = transactions ?? [];

  return (
    <div className="page-scroll h-full">
      {dialog}
      {editing && (
        <EditTransactionModal
          transaction={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          isPending={isUpdating}
          onSave={(data) =>
            updateTransaction(
              { id: editing.id, data },
              {
                onSuccess: () => {
                  setEditing(null);
                  showToast('Updated', 'success');
                },
                onError: (err) => showToast(getErrorMessage(err, 'Failed to update'), 'error'),
              }
            )
          }
        />
      )}

      <div className="content-pad pt-2 pb-4 border-b border-white/5 sticky top-0 bg-[#0b0c10]/85 backdrop-blur-xl z-10">
        <h1 className="section-title text-white">History</h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1">{txList.length} entries</p>
        <input
          type="search"
          placeholder="Search category or date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field mt-3 text-sm py-2.5"
        />
      </div>

      {txList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
          <TrendingDown className="w-8 h-8 opacity-50 mb-4" />
          <p className="text-lg font-bold text-zinc-400">No transactions yet</p>
          <p className="text-xs mt-1">Log an expense to see it here.</p>
        </div>
      ) : grouped.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">No matches for &ldquo;{search}&rdquo;</p>
      ) : (
        grouped.map((mg) => (
          <div key={mg.ym}>
            <div className="px-5 pt-8 pb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-black text-white tracking-tight">{mg.label}</h2>
              <div className="flex gap-3 text-[12px] font-bold">
                {mg.income > 0 && (
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">+{formatINR(mg.income)} IN</span>
                )}
                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">-{formatINR(mg.total)} OUT</span>
              </div>
            </div>

            {mg.days.map((dg) => (
              <div key={dg.date}>
                <div className="px-5 py-2 mt-2">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{dg.label}</span>
                </div>
                <div className="mx-5 mb-6 glass-card overflow-hidden divide-y divide-white/5">
                  {dg.txs.map((tx) => {
                    const isInc = tx.is_income || tx.category === INCOME_CATEGORY;
                    const isAP = tx.category === AUTO_PAY_CATEGORY;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${isInc ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-zinc-400 border-white/10'}`}>
                          {isInc ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[14px] text-zinc-200 truncate">{tx.category}</p>
                          <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                            {tx.time}
                            {tx.duration_months > 1 && <span> · <span className="text-blue-400">{tx.duration_months}mo spread</span></span>}
                            {isAP && <span> · <span className="text-yellow-400">Auto-Pay</span></span>}
                          </p>
                        </div>
                        <span className={`font-black text-[15px] tabular-nums ${isInc ? 'text-emerald-400' : 'text-zinc-100'}`}>
                          {isInc ? '+' : ''}{formatINR(Number(tx.amount))}
                        </span>
                        {!isAP && (
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10"
                            onClick={() => setEditing(tx)}
                            aria-label="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10"
                          onClick={() => handleDelete(tx.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
