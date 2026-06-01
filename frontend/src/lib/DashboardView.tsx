import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { useBudgetSummary, useTransactions, useCategories } from './hooks';
import { formatINR, INCOME_CATEGORY } from './utils';
import { getTodaySpend, getSafeMessage } from './dailyStats';
import { getCategoryEmoji } from './categoryIcons';
import {
  buildCategoryBreakdown,
  buildWeeklyHeatmap,
  getCurrentMonthLabel,
  getSafeStatus,
  getSafeStatusLabel,
  formatMonthKey,
  type CategorySpendRow,
  type WeekDayData,
} from './dashboardUtils';
import { LoadingScreen, ErrorScreen } from './LoadingScreen';
import { useToast } from './Toast';

/* ─── Safe to spend hero ───────────────────────────────────────────────────── */

const SafeHero = memo(function SafeHero({
  safe,
  income,
  rollover,
  autoPays,
  monthSpend,
}: {
  safe: number;
  income: number;
  rollover: number;
  autoPays: number;
  monthSpend: number;
}) {
  const status = getSafeStatus(safe);
  const statusLabel = getSafeStatusLabel(status);

  return (
    <section className={`dash-hero dash-hero--${status}`}>
      <div className="dash-hero-glow" aria-hidden />
      <div className="dash-hero-top">
        <div className="dash-hero-icon">
          <Wallet className="w-5 h-5" />
        </div>
        <span className={`dash-status-pill dash-status-pill--${status}`}>{statusLabel}</span>
      </div>

      <p className="dash-hero-label">Safe to spend</p>
      <p className={`dash-hero-amount ${safe < 0 ? 'dash-hero-amount--danger' : ''}`}>
        {formatINR(safe)}
      </p>
      <p className="dash-hero-hint">{getSafeMessage(safe)}</p>

      <div className="dash-stat-grid">
        <div className="dash-stat-card">
          <span className="dash-stat-label">Spent this month</span>
          <span className="dash-stat-value dash-stat-value--spend">{formatINR(monthSpend)}</span>
        </div>
        {income > 0 && (
          <div className="dash-stat-card">
            <span className="dash-stat-label">Income</span>
            <span className="dash-stat-value dash-stat-value--in">
              <TrendingUp className="w-3 h-3 inline -mt-0.5" />
              {formatINR(income)}
            </span>
          </div>
        )}
        <div className="dash-stat-card">
          <span className="dash-stat-label">Rollover</span>
          <span className={`dash-stat-value ${rollover >= 0 ? 'dash-stat-value--in' : 'dash-stat-value--spend'}`}>
            {rollover >= 0 ? '+' : ''}
            {formatINR(rollover)}
          </span>
        </div>
        <div className="dash-stat-card">
          <span className="dash-stat-label">Auto-pays</span>
          <span className="dash-stat-value dash-stat-value--spend">
            <TrendingDown className="w-3 h-3 inline -mt-0.5" />
            {formatINR(autoPays)}
          </span>
        </div>
      </div>
    </section>
  );
});

/* ─── Weekly chart ─────────────────────────────────────────────────────────── */

const WeekChart = memo(function WeekChart({
  weekOffset,
  onWeekChange,
  days,
  dateRangeStr,
  weekTotal,
  selectedDay,
  onSelectDay,
}: {
  weekOffset: number;
  onWeekChange: (delta: number) => void;
  days: WeekDayData[];
  dateRangeStr: string;
  weekTotal: number;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  const title = weekOffset === 0 ? 'This week' : dateRangeStr;

  return (
    <section className="dash-card">
      <div className="dash-card-header">
        <div className="min-w-0">
          <h2 className="dash-card-title">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            {title}
          </h2>
          <p className="dash-card-sub">
            {weekTotal > 0 ? `${formatINR(weekTotal)} spent` : 'No spending this week'}
          </p>
        </div>
        <div className="dash-week-nav">
          <button
            type="button"
            className="dash-icon-btn"
            onClick={() => onWeekChange(1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="dash-icon-btn"
            disabled={weekOffset === 0}
            onClick={() => onWeekChange(-1)}
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="dash-week-bars">
        {days.map((hd) => {
          const selected = selectedDay === hd.day;
          const barHeight = Math.max(hd.percent, hd.rawAmt > 0 ? 10 : 0);
          return (
            <button
              key={hd.day}
              type="button"
              className={`dash-week-col ${selected ? 'dash-week-col--selected' : ''} ${hd.isToday ? 'dash-week-col--today' : ''}`}
              onClick={() => onSelectDay(selected ? null : hd.day)}
              aria-label={`${hd.day} ${formatINR(hd.rawAmt)}`}
            >
              {hd.rawAmt > 0 && (
                <span className="dash-week-amount">{formatINR(hd.rawAmt)}</span>
              )}
              <div className="dash-week-track">
                <div
                  className={`dash-week-fill ${hd.isMax ? 'dash-week-fill--peak' : hd.rawAmt > 0 ? 'dash-week-fill--active' : ''}`}
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className="dash-week-day">{hd.shortLabel}</span>
              {hd.isToday && <span className="dash-week-today-dot" />}
            </button>
          );
        })}
      </div>

      {selectedDay && (() => {
        const day = days.find((d) => d.day === selectedDay);
        if (!day) return null;
        return (
          <div className="dash-day-detail">
            <div className="dash-day-detail-header">
              <h3>
                {day.day} · {day.dateStr}
              </h3>
              {day.rawAmt > 0 && <span>{formatINR(day.rawAmt)}</span>}
            </div>
            {day.txs.length > 0 ? (
              <ul className="dash-day-tx-list">
                {day.txs.map((tx) => (
                  <li key={tx.id} className="dash-day-tx">
                    <span className="dash-day-tx-emoji">{getCategoryEmoji(tx.category)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="dash-day-tx-cat">{tx.category}</p>
                      <p className="dash-day-tx-time">{tx.time}</p>
                    </div>
                    <span className="dash-day-tx-amt">{formatINR(Number(tx.amount))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dash-empty-inline">No spending on this day</p>
            )}
          </div>
        );
      })()}
    </section>
  );
});

/* ─── Category breakdown ───────────────────────────────────────────────────── */

const CategoryBreakdown = memo(function CategoryBreakdown({ rows }: { rows: CategorySpendRow[] }) {
  const total = rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0) {
    return (
      <section className="dash-card dash-card--empty">
        <h2 className="dash-card-title">
          <PieChart className="w-4 h-4 text-violet-400" />
          This month by category
        </h2>
        <p className="dash-empty">No variable spending logged this month yet.</p>
      </section>
    );
  }

  return (
    <section className="dash-card">
      <div className="dash-card-header">
        <div>
          <h2 className="dash-card-title">
            <PieChart className="w-4 h-4 text-violet-400" />
            This month by category
          </h2>
          <p className="dash-card-sub">{formatINR(total)} across {rows.length} categories</p>
        </div>
      </div>

      <ul className="dash-cat-list">
        {rows.map((row) => (
          <li key={row.category} className="dash-cat-row">
            <div className="dash-cat-row-top">
              <span className="dash-cat-emoji">{getCategoryEmoji(row.category)}</span>
              <span className="dash-cat-name">{row.category}</span>
              <span className="dash-cat-amt">{formatINR(row.amount)}</span>
            </div>
            <div className="dash-cat-bar-track">
              <div
                className="dash-cat-bar-fill"
                style={{ width: `${row.pct}%`, backgroundColor: row.color }}
              />
            </div>
            <span className="dash-cat-pct">{Math.round(row.pct)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
});

/* ─── Upcoming ─────────────────────────────────────────────────────────────── */

const UpcomingBills = memo(function UpcomingBills({
  items,
}: {
  items: { month: string; amount: number }[];
}) {
  const filtered = items.filter((l) => l.amount > 0);
  if (filtered.length === 0) return null;

  return (
    <section className="dash-card">
      <h2 className="dash-card-title mb-3">
        <CalendarDays className="w-4 h-4 text-rose-400" />
        Upcoming bills
      </h2>
      <ul className="dash-upcoming-list">
        {filtered.map(({ month, amount }) => (
          <li key={month} className="dash-upcoming-item">
            <div className="dash-upcoming-icon">
              <CalendarDays className="w-4 h-4" />
            </div>
            <span className="dash-upcoming-month">{formatMonthKey(month)}</span>
            <span className="dash-upcoming-amt">−{formatINR(amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});

/* ─── Main ─────────────────────────────────────────────────────────────────── */

export default function DashboardView() {
  const { data: budgetSummary, isLoading: summaryLoading, isError, refetch, isFetching } =
    useBudgetSummary();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { showToast } = useToast();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSelectedDay(null);
  }, [weekOffset]);

  const expenseCategories = useMemo(
    () => (categories ?? []).filter((c) => c !== INCOME_CATEGORY),
    [categories],
  );

  const categoryRows = useMemo(() => {
    if (!budgetSummary) return [];
    return buildCategoryBreakdown(expenseCategories, budgetSummary);
  }, [expenseCategories, budgetSummary]);

  const weeklyData = useMemo(
    () => buildWeeklyHeatmap(transactions, weekOffset),
    [transactions, weekOffset],
  );

  const monthSpend = useMemo(
    () => categoryRows.reduce((s, r) => s + r.amount, 0),
    [categoryRows],
  );

  const todaySpend = useMemo(() => getTodaySpend(transactions), [transactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
      showToast('Dashboard updated', 'success');
    } catch {
      showToast('Could not refresh', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [refetch, showToast]);

  const handleWeekChange = useCallback((delta: number) => {
    setWeekOffset((o) => Math.max(0, o + delta));
  }, []);

  if (summaryLoading || txLoading || catLoading) return <LoadingScreen />;
  if (isError || !budgetSummary) {
    return (
      <ErrorScreen
        message="Couldn't load your overview. Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="page-scroll h-full">
      <div className="content-pad dash-page pt-2 pb-4">
        <header className="dash-header">
          <div className="min-w-0">
            <h1 className="section-title text-gradient">Overview</h1>
            <p className="dash-header-sub">{getCurrentMonthLabel()}</p>
          </div>
          <button
            type="button"
            className="dash-icon-btn"
            onClick={handleRefresh}
            disabled={refreshing || isFetching}
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing || isFetching ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {todaySpend > 0 && (
          <p className="dash-today-chip">
            Today&apos;s spending · <strong>{formatINR(todaySpend)}</strong>
          </p>
        )}

        <SafeHero
          safe={Number(budgetSummary.safe_to_spend)}
          income={Number(budgetSummary.current_month_income)}
          rollover={Number(budgetSummary.dynamic_rollover)}
          autoPays={Number(budgetSummary.total_auto_pays)}
          monthSpend={monthSpend}
        />

        <WeekChart
          weekOffset={weekOffset}
          onWeekChange={handleWeekChange}
          days={weeklyData.days}
          dateRangeStr={weeklyData.dateRangeStr}
          weekTotal={weeklyData.weekTotal}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />

        <CategoryBreakdown rows={categoryRows} />

        <UpcomingBills items={budgetSummary.upcoming_liabilities} />
      </div>
    </div>
  );
}
