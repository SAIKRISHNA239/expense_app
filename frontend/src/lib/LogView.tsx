import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { Trash2, History, TrendingUp } from 'lucide-react';
import Numpad, { type NumpadHandle } from './Numpad';
import SaveCelebration from './SaveCelebration';
import { useTransactions, useCategories, useAddTransaction, useDeleteTransaction } from './hooks';
import { useToast } from './Toast';
import { useConfirm } from './useConfirm';
import { LoadingScreen, ErrorScreen } from './LoadingScreen';
import { getCategoryAccent } from './categoryColors';
import { getCategoryEmoji } from './categoryIcons';
import { getLogPrompt, getSuccessMessage } from './dailyStats';
import { isOnline } from './network';
import type { Transaction } from './api';
import { INCOME_CATEGORY, formatDate, formatTime, formatINR, getErrorMessage } from './utils';

const AmountDisplay = memo(function AmountDisplay({ amountStr }: { amountStr: string }) {
  const hasAmount = (parseFloat(amountStr) || 0) > 0;
  const prompt = getLogPrompt(hasAmount);
  return (
    <section className="log-amount py-2 text-center">
      <p className={`log-prompt ${hasAmount ? 'log-prompt--active' : ''}`}>{prompt}</p>
      <span className={`text-xl font-bold ${hasAmount ? 'text-teal-400' : 'text-zinc-700'}`}>₹</span>
      <div
        className={`amount-hero font-extrabold tabular-nums truncate ${
          hasAmount ? 'amount-hero--live' : 'text-zinc-800'
        }`}
      >
        {amountStr || '0'}
      </div>
    </section>
  );
});

/* ─── Recent entries ───────────────────────────────────────────────────────── */

const RecentLogs = memo(function RecentLogs({
  logs,
  onDelete,
}: {
  logs: Transaction[];
  onDelete: (id: string) => void;
}) {
  if (logs.length === 0) {
    return (
      <p className="text-[11px] text-zinc-500 font-medium py-1 italic">
        Your first log starts the habit ✨
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => {
        const accent = getCategoryAccent(log.category);
        return (
          <div
            key={log.id}
            className="log-panel flex justify-between items-center gap-2 py-1.5 px-2.5"
            style={{ borderColor: accent.border }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent.text }} />
                <span className="text-[9px] font-bold uppercase tracking-wide truncate" style={{ color: accent.text }}>
                  {log.category}
                </span>
                {log.duration_months > 1 && (
                  <span className="text-[8px] font-bold text-blue-400/90 bg-blue-500/10 px-1 rounded">
                    {log.duration_months}mo
                  </span>
                )}
              </div>
              <span
                className={`text-sm font-extrabold tabular-nums leading-tight ${log.is_income ? 'text-emerald-400' : 'text-white'}`}
              >
                {log.is_income ? '+' : ''}
                {formatINR(log.amount)}
              </span>
            </div>
            <button
              type="button"
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-zinc-600 active:text-rose-400 active:bg-rose-500/10"
              onClick={() => onDelete(log.id)}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
});

/* ─── Category grid ────────────────────────────────────────────────────────── */

const CategoryGrid = memo(function CategoryGrid({
  categories,
  ready,
  pending,
  onSave,
}: {
  categories: string[];
  ready: boolean;
  pending: boolean;
  onSave: (cat: string) => void;
}) {
  return (
    <div className={`category-grid ${ready ? 'category-grid--ready' : ''}`}>
      {categories.map((cat) => {
        const accent = getCategoryAccent(cat);
        return (
          <button
            key={cat}
            type="button"
            disabled={!ready || pending}
            className="category-btn"
            style={
              {
                '--cat-bg': accent.bg,
                '--cat-border': accent.border,
                '--cat-text': accent.text,
                '--cat-glow': accent.glow,
              } as React.CSSProperties
            }
            onClick={() => onSave(cat)}
          >
            <span className="category-btn-emoji">{getCategoryEmoji(cat)}</span>
            <span className="leading-tight">{cat}</span>
          </button>
        );
      })}
    </div>
  );
});

/* ─── Date / duration controls ─────────────────────────────────────────────── */

const LogControls = memo(function LogControls({
  selectedMode,
  customDate,
  durationMonths,
  hasAmount,
  pending,
  onModeChange,
  onCustomDateChange,
  onDurationChange,
  onSaveIncome,
  categories,
  onSaveCategory,
}: {
  selectedMode: 'today' | 'yesterday' | 'custom';
  customDate: string;
  durationMonths: number;
  hasAmount: boolean;
  pending: boolean;
  onModeChange: (mode: 'today' | 'yesterday' | 'custom') => void;
  onCustomDateChange: (date: string) => void;
  onDurationChange: (months: number) => void;
  onSaveIncome: () => void;
  categories: string[];
  onSaveCategory: (cat: string) => void;
}) {
  const durationOptions = [1, 2, 3, 6, 12];

  return (
    <div className="log-controls space-y-2 pb-2">
      <div className="flex flex-wrap gap-1.5">
        <div className="log-panel flex items-center gap-0.5 p-0.5 flex-1 min-w-0">
          <History className="w-3 h-3 text-zinc-500 ml-1.5 shrink-0" />
          {(['today', 'yesterday'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`chip flex-1 justify-center py-1.5 text-[9px] ${selectedMode === mode ? 'chip-active' : 'text-zinc-500'}`}
              onClick={() => onModeChange(mode)}
            >
              {mode === 'today' ? 'Today' : 'Yest'}
            </button>
          ))}
          <div className="relative shrink-0">
            <input
              type="date"
              value={customDate}
              onChange={(e) => onCustomDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <span className={`chip block py-1.5 px-2 text-[9px] ${selectedMode === 'custom' ? 'chip-active' : 'text-zinc-500'}`}>
              Date
            </span>
          </div>
        </div>
        <div className="log-panel flex gap-0.5 p-0.5 shrink-0">
          {durationOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`min-w-[2rem] py-1.5 px-1 rounded-lg text-[10px] font-extrabold ${
                durationMonths === opt ? 'bg-white/15 text-white' : 'text-zinc-500'
              }`}
              onClick={() => onDurationChange(opt)}
            >
              {opt}m
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={!hasAmount || pending}
        className="btn-income w-full py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 disabled:opacity-25"
        onClick={onSaveIncome}
      >
        <TrendingUp className="w-4 h-4" />
        {pending ? 'Saving…' : 'Log Income'}
      </button>

      <CategoryGrid categories={categories} ready={hasAmount} pending={pending} onSave={onSaveCategory} />
    </div>
  );
});

/* ─── Main view ────────────────────────────────────────────────────────────── */

export default function LogView() {
  const numpadRef = useRef<NumpadHandle>(null);
  const [displayAmount, setDisplayAmount] = useState('');
  const [hasAmount, setHasAmount] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [durationMonths, setDurationMonths] = useState(1);
  const [selectedMode, setSelectedMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => formatDate(new Date()));

  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { mutate: addTransaction, isPending } = useAddTransaction();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const recentLogs = useMemo(() => (transactions ?? []).slice(0, 2), [transactions]);

  const handleAmountChange = useCallback((str: string, num: number) => {
    setDisplayAmount(str);
    setHasAmount(num > 0);
  }, []);

  const getTargetDateStr = useCallback(() => {
    if (selectedMode === 'today') return formatDate(new Date());
    if (selectedMode === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatDate(d);
    }
    return customDate;
  }, [selectedMode, customDate]);

  const handleSave = useCallback(
    (category: string) => {
      const amount = numpadRef.current?.getAmountNum() ?? 0;
      if (amount <= 0 || isPending) return;
      addTransaction(
        {
          amount,
          category,
          date: getTargetDateStr(),
          time: formatTime(new Date()),
          duration_months: durationMonths,
          is_income: category === INCOME_CATEGORY,
        },
        {
          onSuccess: () => {
            numpadRef.current?.clear();
            setDurationMonths(1);
            setSelectedMode('today');
            setCelebrate(true);
            showToast(
              isOnline() ? getSuccessMessage() : 'Saved offline — syncs when you\'re back online',
              'success',
            );
          },
          onError: (err) => showToast(getErrorMessage(err, 'Failed to log entry'), 'error'),
        },
      );
    },
    [isPending, addTransaction, getTargetDateStr, durationMonths, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await confirm('Delete this transaction?');
      if (!ok) return;
      deleteTransaction(id, {
        onSuccess: () => showToast('Deleted', 'success'),
        onError: (err) => showToast(getErrorMessage(err, 'Failed to delete'), 'error'),
      });
    },
    [confirm, deleteTransaction, showToast],
  );

  const handleCustomDateChange = useCallback((date: string) => {
    setCustomDate(date);
    setSelectedMode('custom');
  }, []);

  if (isLoading || catsLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen message="Could not load data." onRetry={() => refetch()} />;

  return (
    <div className="log-page">
      {dialog}
      <SaveCelebration show={celebrate} onDone={() => setCelebrate(false)} />

      <section className="log-recent content-pad shrink-0 py-1.5">
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">Just logged</p>
        <RecentLogs logs={recentLogs} onDelete={handleDelete} />
      </section>

      <div className="log-body content-pad">
        <AmountDisplay amountStr={displayAmount} />
        <LogControls
          selectedMode={selectedMode}
          customDate={customDate}
          durationMonths={durationMonths}
          hasAmount={hasAmount}
          pending={isPending}
          onModeChange={setSelectedMode}
          onCustomDateChange={handleCustomDateChange}
          onDurationChange={setDurationMonths}
          onSaveIncome={() => handleSave(INCOME_CATEGORY)}
          categories={(categories ?? []).filter((c) => c !== INCOME_CATEGORY)}
          onSaveCategory={handleSave}
        />
      </div>

      <Numpad ref={numpadRef} onAmountChange={handleAmountChange} />
    </div>
  );
}
