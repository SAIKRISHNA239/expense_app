<script lang="ts">
  import { thisMonthData, budgetState, categories, transactions, AUTO_PAY_CATEGORY, INCOME_CATEGORY, formatDate } from './store';
  import { Wallet, Activity, CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-svelte';

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const derivedState = $derived($thisMonthData);
  const safe = $derived(derivedState.safeToSpend);

  const pieColors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#a855f7', '#ec4899', '#f97316', '#06b6d4', '#6366f1', '#14b8a6'];

  const progressData = $derived(
    $categories
      .map(cat => {
        const amt = derivedState.currentCategorySpending[cat] || 0;
        return { cat, amt };
      })
      .filter(r => r.amt > 0)
      .sort((a, b) => b.amt - a.amt)
  );

  const chartData = $derived(() => {
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

      legend.push({
        cat: d.cat,
        amt: d.amt,
        color,
        pct: slicePct
      });
    });

    return { total, gradient: `conic-gradient(${gradientStops.join(', ')})`, legend };
  });

  const chartInfo = $derived(chartData());

  let currentTime = $state(new Date());
  $effect(() => {
    const timer = setInterval(() => {
      currentTime = new Date();
    }, 1000);
    return () => clearInterval(timer);
  });

  const formattedDate = $derived(currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' }));
  const formattedTime = $derived(currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  let weekOffset = $state(0);
  let selectedDay = $state<string | null>(null);

  // Clear selected day when changing weeks
  $effect(() => {
    weekOffset;
    selectedDay = null;
  });

  const weeklyHeatMapData = $derived.by(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const displayDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const now = new Date();
    // Offset by -7 days * weekOffset
    now.setDate(now.getDate() - (7 * weekOffset));

    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekData: Record<string, { total: number, dateStr: string, txs: typeof $transactions }> = {};
    displayDays.forEach((d, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      weekData[d] = { total: 0, dateStr: formatDate(targetDate), txs: [] };
    });

    $transactions.forEach(tx => {
      const dateObj = new Date(tx.date);
      if (
        dateObj >= monday &&
        dateObj <= sunday &&
        tx.category !== AUTO_PAY_CATEGORY &&
        tx.category !== INCOME_CATEGORY &&
        !tx.isIncome
      ) {
        const dayName = days[dateObj.getDay()];
        if (weekData[dayName]) {
          weekData[dayName].total += tx.amount;
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
  });
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-32 h-full text-[#e4e4e7]">

  <!-- Header -->
  <div class="flex justify-between items-start mb-6">
    <div>
      <h1 class="text-2xl font-black tracking-tight text-white">Dashboard</h1>
      <p class="text-[11px] font-bold text-[var(--color-dark-muted)] tracking-wider uppercase mt-1">{formattedDate}</p>
    </div>
    <div class="bg-[var(--color-dark-surface)] border border-[var(--color-dark-border)] rounded-2xl px-3 py-2 flex items-center gap-2">
      <Clock class="w-4 h-4 text-[var(--color-accent-blue)]" />
      <span class="text-xs font-bold tracking-tight text-white">{formattedTime}</span>
    </div>
  </div>

  <!-- Safe to Spend -->
  <div class="mb-4 relative rounded-[2rem] overflow-hidden p-6 shadow-2xl border border-zinc-800">
    <!-- Premium Gradient Background -->
    <div class="absolute inset-0 bg-gradient-to-br from-[#1a1c29] via-[#0b0c10] to-[#121626] -z-10"></div>
    <div class="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/15 rounded-full blur-[64px] pointer-events-none -z-10"></div>
    <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[64px] pointer-events-none -z-10"></div>

    <div class="flex flex-col items-center text-center">
      <div class="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/5">
        <Wallet class="w-6 h-6 text-[#e4e4e7]" />
      </div>
      <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mb-1">Safe to Spend</span>
      <h1 class="text-[52px] font-black tracking-tighter mb-4 leading-none {safe < 0 ? 'text-[var(--color-accent-red)]' : 'text-white'}" style="text-shadow: 0 4px 20px rgba(0,0,0,0.4);">
        {formatINR(safe)}
      </h1>

      <!-- Breakdown pills -->
      <div class="flex gap-2 text-[10px] font-bold tracking-wide flex-wrap justify-center uppercase">
        {#if derivedState.currentMonthIncome > 0}
          <span class="px-2.5 py-1 rounded-full bg-emerald-950/40 text-[var(--color-income)] border border-emerald-900/50 backdrop-blur-md">
            +{formatINR(derivedState.currentMonthIncome)} IN
          </span>
        {/if}
        <span class="px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/5 backdrop-blur-md">
          {derivedState.dynamicRollover >= 0 ? '+' : ''}{formatINR(derivedState.dynamicRollover)} Roll
        </span>
        <span class="px-2.5 py-1 rounded-full bg-white/5 text-zinc-400 border border-white/5 backdrop-blur-md">
          -{formatINR(derivedState.totalAutoPays)} AUTO
        </span>
      </div>
    </div>
  </div>

  <!-- Weekly Heat Map -->
  <section class="mb-8 bg-[var(--color-dark-surface)] p-5 rounded-3xl border border-[var(--color-dark-border)] shadow-xl relative overflow-hidden">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <Activity class="w-4 h-4 text-[var(--color-accent-blue)]" />
        <h2 class="text-[12px] font-bold text-white uppercase tracking-wider">{weekOffset === 0 ? 'This Week' : weeklyHeatMapData.dateRangeStr}</h2>
      </div>
      
      <!-- Week Scrolling Controls -->
      <div class="flex items-center gap-2">
        <button
          class="w-7 h-7 rounded-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] flex items-center justify-center text-white active:scale-90 transition-transform"
          onclick={() => weekOffset++}
        >
          <ChevronLeft class="w-4 h-4" />
        </button>
        <button
          disabled={weekOffset === 0}
          class="w-7 h-7 rounded-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] flex items-center justify-center text-white active:scale-90 transition-transform disabled:opacity-30 disabled:active:scale-100"
          onclick={() => weekOffset--}
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex justify-between items-end h-[104px] w-full gap-2 relative z-10">
      {#each weeklyHeatMapData.heatmap as hd}
        <button 
          class="flex flex-col items-center justify-end w-full h-full gap-2 relative group focus:outline-none transition-transform active:scale-95 {selectedDay === hd.day ? 'scale-105' : ''}"
          onclick={() => selectedDay = selectedDay === hd.day ? null : hd.day}
        >
          <!-- Hover tooltip -->
          {#if hd.rawAmt > 0}
            <div class="absolute -top-8 bg-zinc-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg pointer-events-none z-20 
                        opacity-0 group-hover:opacity-100 transition-opacity transform -translate-y-1 group-hover:-translate-y-2 duration-200">
              {formatINR(hd.rawAmt)}
            </div>
          {/if}

          <div class="w-full flex-1 flex items-end bg-[var(--color-dark-bg)] rounded-t-md overflow-hidden relative border-b border-[var(--color-dark-border)] {selectedDay === hd.day ? 'ring-2 ring-[var(--color-accent-blue)] ring-offset-1 ring-offset-[var(--color-dark-surface)]' : ''}">
            <div
              class="w-full rounded-t-md transition-all duration-700 ease-out relative
                     {hd.isMax
                       ? 'bg-gradient-to-t from-[var(--color-accent-blue)] to-blue-400 shadow-[0_-4px_16px_rgba(59,130,246,0.5)]'
                       : hd.rawAmt > 0 ? 'bg-gradient-to-t from-zinc-700 to-zinc-500' : 'bg-transparent'}"
              style="height: {Math.max(hd.percent, hd.rawAmt > 0 ? 8 : 0)}%"
            >
              {#if hd.rawAmt > 0}
                <div class="absolute top-0 inset-x-0 h-1 bg-white/30 rounded-t-md"></div>
              {/if}
            </div>
          </div>
          <span class="text-[10px] font-bold {hd.isMax || selectedDay === hd.day ? 'text-white' : 'text-[var(--color-dark-muted)]'}">{hd.day}</span>
        </button>
      {/each}
    </div>

    <!-- Selected Day Details -->
    {#if selectedDay}
      {@const selectedData = weeklyHeatMapData.heatmap.find(h => h.day === selectedDay)}
      {#if selectedData}
        <div class="mt-6 bg-[var(--color-dark-bg)] p-4 rounded-2xl border border-[var(--color-dark-border)]">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-bold text-[var(--color-dark-muted)] uppercase tracking-wider">{selectedData.day}, {selectedData.dateStr}</h3>
            {#if selectedData.rawAmt > 0}
              <span class="text-white font-bold text-sm">{formatINR(selectedData.rawAmt)}</span>
            {/if}
          </div>
          
          {#if selectedData.txs.length > 0}
            <div class="space-y-3">
              {#each selectedData.txs as tx (tx.id)}
                <div class="flex justify-between items-center bg-[var(--color-dark-surface)] px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)]">
                  <div>
                    <p class="font-bold text-[13px] text-white">{tx.category}</p>
                    <p class="text-[10px] text-[var(--color-dark-muted)] font-medium">{tx.time}</p>
                  </div>
                  <span class="font-bold text-white text-[14px]">{formatINR(tx.amount)}</span>
                </div>
              {/each}
            </div>
          {:else}
            <p class="text-[12px] text-[var(--color-dark-muted)] text-center py-2 font-medium">No spending recorded on this day.</p>
          {/if}
        </div>
      {/if}
    {/if}
  </section>

  <!-- Category Pie/Donut Chart -->
  <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-4 mt-8 px-1">Monthly Spend by Category</h2>
  {#if chartInfo.total > 0}
    <div class="bg-[#111216]/80 backdrop-blur-xl rounded-[2rem] p-6 border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col items-center">
      <!-- Subtle internal gradient -->
      <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none -z-10"></div>

      <!-- Donut Chart Visual -->
      <div class="relative w-44 h-44 rounded-full mb-8 mt-2 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(0,0,0,0.5)] border border-white/10" style="background: {chartInfo.gradient}">
        <!-- Inner Hole -->
        <div class="absolute inset-0 m-auto w-[124px] h-[124px] bg-[#111216] rounded-full flex flex-col items-center justify-center shadow-inner border border-white/5 backdrop-blur-3xl">
          <span class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Total</span>
          <span class="text-xl font-bold text-white tracking-tight">{formatINR(chartInfo.total)}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="w-full space-y-3 pb-1 px-1">
        {#each chartInfo.legend as item}
          <div class="flex items-center justify-between group">
            <div class="flex items-center gap-3">
              <div class="w-3.5 h-3.5 rounded-full shadow-inner border border-white/20" style="background-color: {item.color};"></div>
              <span class="font-bold text-[14px] text-zinc-300 group-hover:text-white transition-colors">{item.cat}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-[14px] text-white">{formatINR(item.amt)}</span>
              <span class="text-[11px] text-zinc-500 w-9 inline-block font-semibold group-hover:text-zinc-400 transition-colors">{Math.round(item.pct)}%</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="py-10 text-center text-[var(--color-dark-muted)] text-sm mb-4">No variable spending logged this month.</p>
  {/if}

  <!-- Upcoming Liabilities -->
  {#if derivedState.upcomingLiabilities && derivedState.upcomingLiabilities.some(l => l.amount > 0)}
    <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-4 mt-8 px-1">Upcoming Liabilities</h2>
    <div class="space-y-4">
      {#each derivedState.upcomingLiabilities.filter(l => l.amount > 0) as { month, amount }}
        <div class="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-4 border border-zinc-800 flex items-center gap-4 relative overflow-hidden shadow-xl group transition-all duration-300">
          <!-- Subtle red highlight line -->
          <div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500/40 via-orange-500/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          
          <div class="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
            <CalendarDays class="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </div>
          <div class="flex-1">
            <span class="font-bold text-[16px] text-zinc-200 group-hover:text-white transition-colors tracking-tight">{month}</span>
          </div>
          <div class="text-right pr-2">
            <span class="font-black text-[16px] text-rose-500">-{formatINR(amount)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
