import { useMemo, useState, useCallback, memo } from 'react';
import {
  Trash2,
  Pencil,
  Search,
  X,
  Clock,
  Receipt,
  Filter,
} from 'lucide-react';
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
import { getCategoryAccent } from './categoryColors';
import { getCategoryEmoji } from './categoryIcons';
import {
  groupTransactions,
  computeHistoryStats,
  isIncomeTx,
  isAutoPayTx,
  type HistoryFilter,
  type MonthGroup,
  type DayGroup,
} from './historyUtils';
import type { Transaction } from './api';
import { formatINR, getErrorMessage } from './utils';

const FILTERS: { id: HistoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
];

/* ─── Transaction row ──────────────────────────────────────────────────────── */

const TxRow = memo(function TxRow({
  tx,
  onEdit,
  onDelete,
  isDeleting,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const isInc = isIncomeTx(tx);
  const isAP = isAutoPayTx(tx);
  const accent = getCategoryAccent(tx.category);
  const emoji = getCategoryEmoji(tx.category);

  return (
    <div className="hist-tx-row">
      <div
        className="hist-tx-emoji-wrap"
        style={{ background: accent.bg, borderColor: accent.border }}
      >
        <span className="hist-tx-emoji" aria-hidden>
          {emoji}
        </span>
      </div>
      <div className="hist-tx-body min-w-0 flex-1">
        <p className="hist-tx-cat">{tx.category}</p>
        <p className="hist-tx-meta">
          <Clock className="w-3 h-3 inline -mt-0.5" />
          {tx.time}
          {tx.duration_months > 1 && (
            <span className="hist-tx-badge hist-tx-badge--spread">{tx.duration_months}mo spread</span>
          )}
          {isAP && <span className="hist-tx-badge hist-tx-badge--auto">Auto-pay</span>}
        </p>
      </div>
      <span className={`hist-tx-amt ${isInc ? 'hist-tx-amt--in' : ''}`}>
        {isInc ? '+' : '−'}
        {formatINR(Number(tx.amount))}
      </span>
      <div className="hist-tx-actions">
        {!isAP && (
          <button
            type="button"
            className="hist-action-btn hist-action-btn--edit"
            onClick={() => onEdit(tx)}
            aria-label={`Edit ${tx.category}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {!isAP && (
          <button
            type="button"
            className="hist-action-btn hist-action-btn--delete"
            disabled={isDeleting}
            onClick={() => onDelete(tx.id)}
            aria-label={`Delete ${tx.category}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

const DaySection = memo(function DaySection({
  day,
  onEdit,
  onDelete,
  deletingId,
}: {
  day: DayGroup;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <section className="hist-day">
      <div className="hist-day-header">
        <h3 className="hist-day-title">{day.label}</h3>
        {day.dayTotal > 0 && <span className="hist-day-total">−{formatINR(day.dayTotal)}</span>}
      </div>
      <div className="hist-tx-list">
        {day.txs.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={deletingId === tx.id}
          />
        ))}
      </div>
    </section>
  );
});

const MonthSection = memo(function MonthSection({
  month,
  onEdit,
  onDelete,
  deletingId,
}: {
  month: MonthGroup;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  return (
    <div className="hist-month">
      <div className="hist-month-header">
        <h2 className="hist-month-title">{month.label}</h2>
        <div className="hist-month-totals">
          {month.incomeTotal > 0 && (
            <span className="hist-pill hist-pill--in">+{formatINR(month.incomeTotal)}</span>
          )}
          {month.expenseTotal > 0 && (
            <span className="hist-pill hist-pill--out">−{formatINR(month.expenseTotal)}</span>
          )}
        </div>
      </div>
      {month.days.map((day) => (
        <DaySection
          key={day.date}
          day={day}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      ))}
    </div>
  );
});

/* ─── Main ─────────────────────────────────────────────────────────────────── */

export default function HistoryView() {
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { showToast } = useToast();
  const { confirm, dialog } = useConfirm();

  const [editing, setEditing] = useState<Transaction | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const txList = transactions ?? [];

  const stats = useMemo(() => computeHistoryStats(txList), [txList]);

  const grouped = useMemo(
    () => groupTransactions(txList, search, filter),
    [txList, search, filter],
  );

  const filteredCount = useMemo(
    () => grouped.reduce((s, m) => s + m.days.reduce((d, day) => d + day.txs.length, 0), 0),
    [grouped],
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

  const handleEdit = useCallback((tx: Transaction) => setEditing(tx), []);

  if (isLoading) return <LoadingScreen />;
  if (isError) {
    return (
      <ErrorScreen
        message="Couldn't load your history. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

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
                  showToast('Transaction updated', 'success');
                },
                onError: (err) => showToast(getErrorMessage(err, 'Failed to update'), 'error'),
              },
            )
          }
        />
      )}

      <header className="hist-header content-pad">
        <div className="hist-header-top">
          <div>
            <h1 className="section-title text-gradient">History</h1>
            <p className="hist-header-sub">
              {stats.count} {stats.count === 1 ? 'entry' : 'entries'} all time
            </p>
          </div>
          <div className="hist-header-icon" aria-hidden>
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {stats.count > 0 && (
          <div className="hist-summary-row">
            <div className="hist-summary-chip">
              <span className="hist-summary-label">Out</span>
              <span className="hist-summary-value hist-summary-value--out">
                {formatINR(stats.expense)}
              </span>
            </div>
            <div className="hist-summary-chip">
              <span className="hist-summary-label">In</span>
              <span className="hist-summary-value hist-summary-value--in">
                {formatINR(stats.income)}
              </span>
            </div>
          </div>
        )}

        <div className="hist-search-wrap">
          <Search className="hist-search-icon w-4 h-4" />
          <input
            type="search"
            placeholder="Search category, date, amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="hist-search input-field"
            aria-label="Search transactions"
          />
          {search && (
            <button
              type="button"
              className="hist-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="hist-filters" role="tablist" aria-label="Filter transactions">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`hist-filter-chip ${filter === f.id ? 'hist-filter-chip--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(search || filter !== 'all') && (
          <p className="hist-result-count">
            Showing {filteredCount} {filteredCount === 1 ? 'result' : 'results'}
          </p>
        )}
      </header>

      <div className="hist-content content-pad">
        {txList.length === 0 ? (
          <div className="hist-empty">
            <span className="hist-empty-icon">📋</span>
            <p className="hist-empty-title">No transactions yet</p>
            <p className="hist-empty-sub">Log an expense on the Log tab to see it here.</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className="hist-empty">
            <span className="hist-empty-icon">🔍</span>
            <p className="hist-empty-title">No matches</p>
            <p className="hist-empty-sub">
              Try a different search or filter
              {search ? ` — "${search}"` : ''}.
            </p>
            <button
              type="button"
              className="hist-reset-btn"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          grouped.map((mg) => (
            <MonthSection
              key={mg.ym}
              month={mg}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))
        )}
      </div>
    </div>
  );
}
