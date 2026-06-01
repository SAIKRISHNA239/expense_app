import { useState, useMemo, useEffect } from 'react';
import { Wallet, Activity, CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBudgetSummary, useTransactions, useCategories } from './hooks';
import { formatINR, formatDate, INCOME_CATEGORY, AUTO_PAY_CATEGORY, parseLocalDate } from './utils';
import { LoadingScreen, ErrorScreen } from './LoadingScreen';

export default function DashboardView() {
  const { data: budgetSummary, isLoading: summaryLoading, isError, refetch } = useBudgetSummary();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: categories = [], isLoading: catLoading } = useCategories();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedDay(null);
  }, [weekOffset]);

  const pieColors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#6366f1', '#14b8a6'];

  const progressData = useMemo(() => {
    if (!budgetSummary) return [];
    return categories
      .map(cat => ({
        cat,
        amt: budgetSummary.current_category_spending[cat] || 0
      }))
      .filter(r => r.amt > 0)
      .sort((a, b) => b.amt - a.amt);
  }, [categories, budgetSummary]);

  const chartInfo = useMemo(() => {
    const total = progressData.reduce((s, d) => s + d.amt, 0);
    if (total === 0) return { total: 0, gradient: '', legend: [] };

    let currentAngle = 0;
    const legend: { cat: string; amt: number; color: string; pct: number }[] = [];
    const gradientStops: string[] = [];

    progressData.forEach((d, i) => {
      const color = pieColors[i % pieColors.length];
      const slicePct = (d.amt / total) * 100;
      const start = currentAngle;
      currentAngle += slicePct;
      gradientStops.push(`${color} ${start}% ${currentAngle}%`);
      legend.push({ cat: d.cat, amt: d.amt, color, pct: slicePct });
    });

    return { total, gradient: `conic-gradient(${gradientStops.join(', ')})`, legend };
  }, [progressData]);

  const weeklyHeatMapData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const now = new Date();
    now.setDate(now.getDate() - (7 * weekOffset));

    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekData: Record<string, { total: number, dateStr: string, txs: typeof transactions }> = {};
    displayDays.forEach((d, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      weekData[d] = { total: 0, dateStr: formatDate(targetDate), txs: [] };
    });

    transactions.forEach(tx => {
      const dateObj = parseLocalDate(tx.date);
      if (
        dateObj >= monday &&
        dateObj <= sunday &&
        tx.category !== AUTO_PAY_CATEGORY &&
        tx.category !== INCOME_CATEGORY &&
        !tx.is_income
      ) {
        const dayName = days[dateObj.getDay()];
        if (weekData[dayName]) {
          weekData[dayName].total += Number(tx.amount);
          weekData[dayName].txs.push(tx);
        }
      }
    });

    const rawValues = Object.values(weekData).map(d => d.total);
    const maxSpend = Math.max(...rawValues, 1);
    const logMax = Math.log1p(maxSpend);

    const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateRangeStr = `${monday.toLocaleDateString('en-US', formatOpts)} - ${sunday.toLocaleDateString('en-US', formatOpts)}`;

    return {
      dateRangeStr,
      heatmap: displayDays.map(day => {
        const dData = weekData[day];
        const rawAmt = dData.total;
        const logPercent = logMax > 0 ? (Math.log1p(rawAmt) / logMax) * 100 : 0;
        return {
          day,
          rawAmt,
          percent: Math.min(logPercent, 100),
          isMax: rawAmt === maxSpend && maxSpend > 0,
          dateStr: dData.dateStr,
          txs: dData.txs
        };
      })
    };
  }, [transactions, weekOffset]);

  if (summaryLoading || txLoading || catLoading) return <LoadingScreen />;
  if (isError || !budgetSummary) return <ErrorScreen message="Could not load dashboard." onRetry={() => refetch()} />;

  const safe = budgetSummary.safe_to_spend;
  const upcomingLiabilities = budgetSummary.upcoming_liabilities;
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="page-scroll h-full text-zinc-200">
      <div className="content-pad pt-2 pb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-5 gap-3">
        <div className="min-w-0">
          <h1 className="section-title text-gradient">Overview</h1>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">{formattedDate}</p>
        </div>
        <div className="glass-card px-3 py-2 flex items-center gap-2 shrink-0">
          <Clock className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold tabular-nums text-white">{formattedTime}</span>
        </div>
      </div>

      {/* Safe to Spend */}
      <div className="mb-5 glass-card glass-card-glow p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500/25 to-rose-500/15 border border-white/10 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5 text-teal-300" />
          </div>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.25em] mb-2">Safe to Spend</span>
          <h2
            className={`amount-medium font-extrabold tabular-nums mb-3 safe-glow ${
              safe < 0 ? 'text-rose-400' : 'text-gradient'
            }`}
          >
            {formatINR(safe)}
          </h2>
          <p className="text-[11px] text-zinc-500 font-medium mb-4 max-w-[16rem]">
            {safe < 0
              ? 'You\'re over budget — check upcoming bills'
              : safe < 2000
                ? 'Spend mindfully — you\'ve got some room'
                : 'Looking good — enjoy with intention'}
          </p>

          <div className="flex gap-2 text-[10px] font-bold flex-wrap justify-center">
            {budgetSummary.current_month_income > 0 && (
              <span className="chip text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                +{formatINR(budgetSummary.current_month_income)} in
              </span>
            )}
            <span className="chip text-zinc-400">
              {budgetSummary.dynamic_rollover >= 0 ? '+' : ''}{formatINR(budgetSummary.dynamic_rollover)} roll
            </span>
            <span className="chip text-rose-300/90 border-rose-500/20 bg-rose-500/10">
              −{formatINR(budgetSummary.total_auto_pays)} auto
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Heat Map */}
      <section className="mb-6 glass-card p-4 sm:p-5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h2 className="text-[12px] font-bold text-white uppercase tracking-wider">{weekOffset === 0 ? 'This Week' : weeklyHeatMapData.dateRangeStr}</h2>
          </div>
          
          {/* Week Scrolling Controls */}
          <div className="flex items-center gap-2">
            <button
              className="w-7 h-7 rounded-full bg-[#0b0c10] border border-zinc-800 flex items-center justify-center text-white active:scale-90 transition-transform"
              onClick={() => setWeekOffset(o => o + 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={weekOffset === 0}
              className="w-7 h-7 rounded-full bg-[#0b0c10] border border-zinc-800 flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-30 disabled:active:scale-100"
              onClick={() => setWeekOffset(o => o - 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex justify-between items-end h-[min(28vw,7rem)] min-h-[5rem] w-full gap-1.5 sm:gap-2 relative z-10">
          {weeklyHeatMapData.heatmap.map((hd) => (
            <button 
              key={hd.day}
              className={`flex flex-col items-center justify-end w-full h-full gap-2 relative group focus:outline-none transition-transform active:scale-95 ${selectedDay === hd.day ? 'scale-105' : ''}`}
              onClick={() => setSelectedDay(selectedDay === hd.day ? null : hd.day)}
            >
              {hd.rawAmt > 0 && (
                <div className="absolute -top-8 bg-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity transform -translate-y-1 group-hover:-translate-y-2 duration-200">
                  {formatINR(hd.rawAmt)}
                </div>
              )}

              <div className={`w-full flex-1 flex items-end bg-[#0b0c10] rounded-t-md overflow-hidden relative border-b border-zinc-800 ${selectedDay === hd.day ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#111216]' : ''}`}>
                <div
                  className={`w-full rounded-t-md transition-all duration-700 ease-out relative
                         ${hd.isMax
                           ? 'bg-gradient-to-t from-teal-500 to-teal-300 shadow-[0_-4px_16px_rgba(45,212,191,0.4)]'
                           : hd.rawAmt > 0 ? 'bg-gradient-to-t from-zinc-700 to-zinc-500' : 'bg-transparent'}`}
                  style={{ height: `${Math.max(hd.percent, hd.rawAmt > 0 ? 8 : 0)}%` }}
                >
                  {hd.rawAmt > 0 && <div className="absolute top-0 inset-x-0 h-1 bg-white/30 rounded-t-md"></div>}
                </div>
              </div>
              <span className={`text-[10px] font-bold ${hd.isMax || selectedDay === hd.day ? 'text-white' : 'text-zinc-500'}`}>{hd.day}</span>
            </button>
          ))}
        </div>

        {/* Selected Day Details */}
        {selectedDay && (() => {
          const selectedData = weeklyHeatMapData.heatmap.find(h => h.day === selectedDay);
          if (!selectedData) return null;
          
          return (
            <div className="mt-6 bg-[#0b0c10] p-4 rounded-2xl border border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{selectedData.day}, {selectedData.dateStr}</h3>
                {selectedData.rawAmt > 0 && <span className="text-white font-bold text-sm">{formatINR(selectedData.rawAmt)}</span>}
              </div>
              
              {selectedData.txs.length > 0 ? (
                <div className="space-y-3">
                  {selectedData.txs.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center glass-card px-3 py-2.5">
                      <div>
                        <p className="font-bold text-[13px] text-white">{tx.category}</p>
                        <p className="text-[10px] text-zinc-500 font-medium">{tx.time}</p>
                      </div>
                      <span className="font-bold text-white text-[14px]">{formatINR(Number(tx.amount))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-zinc-500 text-center py-2 font-medium">No spending recorded on this day.</p>
              )}
            </div>
          );
        })()}
      </section>

      {/* Category Pie/Donut Chart */}
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 mt-6">Monthly by Category</h2>
      {chartInfo.total > 0 ? (
        <div className="glass-card p-5 sm:p-6 relative overflow-hidden flex flex-col items-center mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none -z-10"></div>

          <div className="relative w-[min(44vw,11rem)] h-[min(44vw,11rem)] rounded-full mb-6 flex items-center justify-center shrink-0 border border-white/10" style={{ background: chartInfo.gradient }}>
            <div className="absolute inset-0 m-auto w-[68%] h-[68%] bg-[#111216] rounded-full flex flex-col items-center justify-center border border-white/5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Total</span>
              <span className="text-xl font-bold text-white tracking-tight">{formatINR(chartInfo.total)}</span>
            </div>
          </div>

          <div className="w-full space-y-3 pb-1 px-1">
            {chartInfo.legend.map(item => (
              <div key={item.cat} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full shadow-inner border border-white/20" style={{ backgroundColor: item.color }}></div>
                  <span className="font-bold text-[14px] text-zinc-300 group-hover:text-white transition-colors">{item.cat}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[14px] text-white">{formatINR(item.amt)}</span>
                  <span className="text-[11px] text-zinc-500 w-9 inline-block font-semibold group-hover:text-zinc-400 transition-colors">{Math.round(item.pct)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="py-10 text-center text-zinc-500 text-sm mb-4">No variable spending logged this month.</p>
      )}

      {/* Upcoming Liabilities */}
      {upcomingLiabilities.some(l => l.amount > 0) && (
        <>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 mt-2">Upcoming</h2>
          <div className="space-y-3 mb-4">
            {upcomingLiabilities.filter(l => l.amount > 0).map(({ month, amount }) => (
              <div key={month} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <CalendarDays className="w-5 h-5 text-rose-400" />
                </div>
                <span className="flex-1 font-bold text-white">{month}</span>
                <span className="font-extrabold text-rose-400 tabular-nums">−{formatINR(amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
