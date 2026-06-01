import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { Trash2, Calendar, TrendingUp, Layers } from 'lucide-react';
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
import { addQuickAmount, formatAmountDisplay, parseAmountNum } from './logAmount';
import type { Transaction } from './api';
import {
  INCOME_CATEGORY,
  formatDate,
  formatTime,
  formatINR,
  getErrorMessage,
  parseLocalDate,
} from './utils';

const QUICK_AMOUNTS = [
  { label: '+100', value: 100 },
  { label: '+500', value: 500 },
  { label: '+1K', value: 1000 },
  { label: '+5K', value: 5000 },
] as const;

const DURATION_OPTIONS = [1, 2, 3, 6, 12] as const;

function formatLogDateLabel(mode: 'today' | 'yesterday' | 'custom', customDate: string): string {
  if (mode === 'today') return 'Today';
  if (mode === 'yesterday') return 'Yesterday';
  const d = parseLocalDate(customDate);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatRecentTime(dateStr: string, timeStr: string): string {
  const today = formatDate(new Date());
  if (dateStr === today) return timeStr || 'Today';
  const d = parseLocalDate(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === formatDate(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const AmountDisplay = memo(function AmountDisplay({ amountStr }: { amountStr: string }) {
  const num = parseAmountNum(amountStr);
  const hasAmount = num > 0;
  const prompt = getLogPrompt(hasAmount);
  const display = hasAmount ? formatAmountDisplay(amountStr) : '0';

  return (
    <section className="log-amount" aria-live="polite" aria-atomic="true">
      <p className={`log-prompt ${hasAmount ? 'log-prompt--active' : ''}`}>{prompt}</p>
      <div className="log-amount-row">
        <span className={`log-currency ${hasAmount ? 'log-currency--live' : ''}`}>₹</span>
        <div
          className={`amount-hero font-extrabold tabular-nums truncate ${
            hasAmount ? 'amount-hero--live' : 'text-zinc-800'
          }`}
        >
          {display}
        </div>
      </div>
      {hasAmount && (
        <p className="log-amount-sub">{formatINR(num)} · tap a category below</p>
      )}
    </section>
  );
});

const QuickAmounts = memo(function QuickAmounts({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (delta: number) => void;
}) {
  return (
    <div className="log-quick-amounts">
      {QUICK_AMOUNTS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          className="log-quick-btn"
          onClick={() => onPick(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
});

const RecentLogs = memo(function RecentLogs({
  logs,
  onDelete,
  deletingId,
}: {
  logs: Transaction[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (logs.length === 0) {
    return (
      <div className="log-empty-recent">
        <span className="text-lg">✨</span>
        <p>No entries yet — log your first expense below</p>
      </div>
    );
  }

  return (
    <div className="log-recent-list">
      {logs.map((log) => {
        const accent = getCategoryAccent(log.category);
        const emoji = getCategoryEmoji(log.category);
        return (
          <div
            key={log.id}
            className="log-recent-item"
            style={{ borderColor: accent.border, background: accent.bg }}
          >
            <span className="log-recent-emoji" aria-hidden>
              {emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold truncate" style={{ color: accent.text }}>
                  {log.category}
                </span>
                {log.duration_months > 1 && (
                  <span className="log-recent-badge">{log.duration_months}mo spread</span>
                )}
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span
                  className={`text-sm font-extrabold tabular-nums ${
                    log.is_income ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {log.is_income ? '+' : ''}
                  {formatINR(log.amount)}
                </span>
                <span className="text-[9px] text-zinc-500 font-semibold shrink-0">
                  {formatRecentTime(log.date, log.time)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="log-recent-delete"
              disabled={deletingId === log.id}
              onClick={() => onDelete(log.id)}
              aria-label={`Delete ${log.category} ${formatINR(log.amount)}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
});

const CategoryGrid = memo(function CategoryGrid({
  categories,
  ready,
  pending,
  savingCategory,
  onSave,
}: {
  categories: string[];
  ready: boolean;
  pending: boolean;
  savingCategory: string | null;
  onSave: (cat: string) => void;
}) {
  if (categories.length === 0) {
    return (
      <p className="log-no-categories">
        No categories yet. Add them in Settings → Categories.
      </p>
    );
  }

  return (
    <div className={`category-grid ${ready ? 'category-grid--ready' : ''}`}>
      {categories.map((cat) => {
        const accent = getCategoryAccent(cat);
        const isSaving = savingCategory === cat;
        return (
          <button
            key={cat}
            type="button"
            disabled={!ready || pending}
            className={`category-btn ${isSaving ? 'category-btn--saving' : ''}`}
            style={
              {
                '--cat-bg': accent.bg,
                '--cat-border': accent.border,
                '--cat-text': accent.text,
                '--cat-glow': accent.glow,
              } as React.CSSProperties
            }
            onClick={() => onSave(cat)}
            aria-label={`Log expense under ${cat}`}
          >
            <span className="category-btn-emoji">{getCategoryEmoji(cat)}</span>
            <span className="category-btn-label">{cat}</span>
            {isSaving && <span className="category-btn-spinner" />}
          </button>
        );
      })}
    </div>
  );
});

const LogControls = memo(function LogControls({
  selectedMode,
  customDate,
  durationMonths,
  hasAmount,
  pending,
  savingCategory,
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
  savingCategory: string | null;
  onModeChange: (mode: 'today' | 'yesterday' | 'custom') => void;
  onCustomDateChange: (date: string) => void;
  onDurationChange: (months: number) => void;
  onSaveIncome: () => void;
  categories: string[];
  onSaveCategory: (cat: string) => void;
}) {
  const dateLabel = formatLogDateLabel(selectedMode, customDate);

  return (
    <div className="log-controls">
      <div className="log-meta-row">
        <div className="log-meta-group">
          <span className="log-meta-label">
            <Calendar className="w-3 h-3" />
            Date
          </span>
          <div className="log-date-chips">
            {(['today', 'yesterday'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`log-date-chip ${selectedMode === mode ? 'log-date-chip--active' : ''}`}
                onClick={() => onModeChange(mode)}
              >
                {mode === 'today' ? 'Today' : 'Yesterday'}
              </button>
            ))}
            <label className={`log-date-chip log-date-chip--pick ${selectedMode === 'custom' ? 'log-date-chip--active' : ''}`}>
              <input
                type="date"
                value={customDate}
                max={formatDate(new Date())}
                onChange={(e) => onCustomDateChange(e.target.value)}
                className="log-date-input"
              />
              Pick
            </label>
          </div>
        </div>

        <div className="log-meta-group log-meta-group--spread">
          <span className="log-meta-label" title="Split cost across months in your budget">
            <Layers className="w-3 h-3" />
            Spread
          </span>
          <div className="log-spread-chips">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`log-spread-chip ${durationMonths === opt ? 'log-spread-chip--active' : ''}`}
                onClick={() => onDurationChange(opt)}
              >
                {opt}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="log-target-date">
        Logging to <strong>{dateLabel}</strong>
        {durationMonths > 1 && (
          <span className="text-zinc-500"> · spread over {durationMonths} months</span>
        )}
      </p>

      <button
        type="button"
        disabled={!hasAmount || pending}
        className="btn-income log-income-btn"
        onClick={onSaveIncome}
        aria-label="Log as income"
      >
        <TrendingUp className="w-4 h-4 shrink-0" />
        {pending && savingCategory === INCOME_CATEGORY ? 'Saving…' : 'Log as income'}
      </button>

      <div>
        <p className="log-section-label">Expense categories</p>
        <CategoryGrid
          categories={categories}
          ready={hasAmount}
          pending={pending}
          savingCategory={savingCategory}
          onSave={onSaveCategory}
        />
      </div>
    </div>
  );
});

export default function LogView() {
  const numpadRef = useRef<NumpadHandle>(null);
  const [displayAmount, setDisplayAmount] = useState('');
  const [hasAmount, setHasAmount] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [durationMonths, setDurationMonths] = useState(1);
  const [selectedMode, setSelectedMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(() => formatDate(new Date()));
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { mutate: addTransaction, isPending } = useAddTransaction();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const recentLogs = useMemo(() => (transactions ?? []).slice(0, 3), [transactions]);
  const expenseCategories = useMemo(
    () => (categories ?? []).filter((c) => c !== INCOME_CATEGORY),
    [categories],
  );

  const handleAmountChange = useCallback((str: string, num: number) => {
    setDisplayAmount(str);
    setHasAmount(num > 0);
  }, []);

  const handleQuickAmount = useCallback((delta: number) => {
    const current = numpadRef.current?.getAmountStr() ?? '';
    const next = addQuickAmount(current, delta);
    numpadRef.current?.setAmount(next);
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

      setSavingCategory(category);
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
              isOnline() ? getSuccessMessage() : "Saved offline — syncs when you're back online",
              'success',
            );
          },
          onError: (err) => showToast(getErrorMessage(err, 'Failed to log entry'), 'error'),
          onSettled: () => setSavingCategory(null),
        },
      );
    },
    [isPending, addTransaction, getTargetDateStr, durationMonths, showToast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await confirm('Delete this transaction?');
      if (!ok) return;
      setDeletingId(id);
      deleteTransaction(id, {
        onSuccess: () => showToast('Deleted', 'success'),
        onError: (err) => showToast(getErrorMessage(err, 'Failed to delete'), 'error'),
        onSettled: () => setDeletingId(null),
      });
    },
    [confirm, deleteTransaction, showToast],
  );

  const handleCustomDateChange = useCallback((date: string) => {
    setCustomDate(date);
    setSelectedMode('custom');
  }, []);

  if (isLoading || catsLoading) return <LoadingScreen />;
  if (isError) {
    return (
      <ErrorScreen
        message="Couldn't load your log data. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="log-page">
      {dialog}
      <SaveCelebration show={celebrate} onDone={() => setCelebrate(false)} />

      <section className="log-recent content-pad">
        <div className="log-recent-header">
          <h2 className="log-section-label mb-0">Recent</h2>
          {recentLogs.length > 0 && (
            <span className="log-recent-count">{recentLogs.length} latest</span>
          )}
        </div>
        <RecentLogs logs={recentLogs} onDelete={handleDelete} deletingId={deletingId} />
      </section>

      <div className="log-body content-pad">
        <AmountDisplay amountStr={displayAmount} />
        <QuickAmounts disabled={isPending} onPick={handleQuickAmount} />
        <LogControls
          selectedMode={selectedMode}
          customDate={customDate}
          durationMonths={durationMonths}
          hasAmount={hasAmount}
          pending={isPending}
          savingCategory={savingCategory}
          onModeChange={setSelectedMode}
          onCustomDateChange={handleCustomDateChange}
          onDurationChange={setDurationMonths}
          onSaveIncome={() => handleSave(INCOME_CATEGORY)}
          categories={expenseCategories}
          onSaveCategory={handleSave}
        />
      </div>

      <Numpad ref={numpadRef} onAmountChange={handleAmountChange} />
    </div>
  );
}
