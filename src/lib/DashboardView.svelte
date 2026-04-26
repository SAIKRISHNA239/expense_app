<script lang="ts">
  import { thisMonthData, weeklyHeatMapData, budgetState, categories } from './store';
  import { Wallet, Activity, CalendarDays, Clock } from 'lucide-svelte';

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const derivedState = $derived($thisMonthData);
  const safe = $derived(derivedState.safeToSpend);
  const heatmap = $derived($weeklyHeatMapData);

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
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24 text-[#e4e4e7]">

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
  <div class="mb-8 flex flex-col items-center text-center">
    <div class="w-14 h-14 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center mb-4 border border-[var(--color-dark-border)]">
      <Wallet class="w-7 h-7 text-[#e4e4e7]" />
    </div>
    <span class="text-[11px] text-[var(--color-dark-muted)] font-bold uppercase tracking-widest mb-1">Safe to Spend</span>
    <h1 class="text-5xl font-black tracking-tight mb-3 {safe < 0 ? 'text-[var(--color-accent-red)]' : 'text-white'}">
      {formatINR(safe)}
    </h1>

    <!-- Breakdown pills -->
    <div class="flex gap-3 text-xs font-semibold flex-wrap justify-center">
      {#if derivedState.currentMonthIncome > 0}
        <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-[var(--color-income)] border border-emerald-800">
          +{formatINR(derivedState.currentMonthIncome)} logged
        </span>
      {/if}
      <span class="px-2.5 py-1 rounded-full bg-[var(--color-dark-surface)] text-[var(--color-dark-muted)] border border-[var(--color-dark-border)]">
        Rollover {derivedState.dynamicRollover >= 0 ? '+' : ''}{formatINR(derivedState.dynamicRollover)}
      </span>
      <span class="px-2.5 py-1 rounded-full bg-[var(--color-dark-surface)] text-[var(--color-dark-muted)] border border-[var(--color-dark-border)]">
        Auto-pays {formatINR(derivedState.totalAutoPays)}
      </span>
    </div>
  </div>

  <!-- Weekly Heat Map -->
  <section class="mb-8 bg-[var(--color-dark-surface)] p-5 rounded-3xl border border-[var(--color-dark-border)]">
    <div class="flex items-center gap-2 mb-5">
      <Activity class="w-4 h-4 text-[var(--color-dark-muted)]" />
      <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider">This Week</h2>
      <span class="ml-auto text-[11px] text-[var(--color-dark-muted)]">log scale</span>
    </div>

    <div class="flex justify-between items-end h-28 w-full gap-2">
      {#each heatmap as hd}
        <div class="flex flex-col items-center justify-end w-full h-full gap-1.5 relative group">
          <!-- Hover tooltip -->
          {#if hd.rawAmt > 0}
            <div class="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap bg-zinc-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg pointer-events-none z-10">
              {formatINR(hd.rawAmt)}
            </div>
          {/if}

          <div class="w-full flex-1 flex items-end bg-[var(--color-dark-elevated)] rounded-md overflow-hidden">
            <div
              class="w-full rounded-md transition-all duration-700 ease-out
                     {hd.isMax
                       ? 'bg-[var(--color-accent-blue)] shadow-[0_-4px_12px_rgba(59,130,246,0.4)]'
                       : hd.rawAmt > 0 ? 'bg-zinc-500' : 'bg-transparent'}"
              style="height: {Math.max(hd.percent, hd.rawAmt > 0 ? 8 : 0)}%"
            ></div>
          </div>
          <span class="text-[10px] font-bold {hd.isMax ? 'text-white' : 'text-[var(--color-dark-muted)]'}">{hd.day}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Category Pie/Donut Chart -->
  <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-4 px-1">Monthly Spend by Category</h2>
  {#if chartInfo.total > 0}
    <div class="bg-[var(--color-dark-surface)] rounded-3xl p-5 border border-[var(--color-dark-border)] flex flex-col items-center">
      <!-- Donut Chart Visual -->
      <div class="relative w-44 h-44 rounded-full mb-6 flex items-center justify-center shrink-0 shadow-lg" style="background: {chartInfo.gradient}">
        <!-- Inner Hole -->
        <div class="absolute inset-0 m-auto w-[116px] h-[116px] bg-[var(--color-dark-surface)] rounded-full flex flex-col items-center justify-center shadow-inner">
          <span class="text-[9px] font-black text-[var(--color-dark-muted)] uppercase tracking-widest mb-0.5">Total</span>
          <span class="text-xl font-bold text-white tracking-tight">{formatINR(chartInfo.total)}</span>
        </div>
      </div>

      <!-- Legend -->
      <div class="w-full space-y-3 pb-1">
        {#each chartInfo.legend as item}
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full shadow-sm" style="background-color: {item.color};"></div>
              <span class="font-semibold text-[14px] text-white">{item.cat}</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-[14px] text-white">{formatINR(item.amt)}</span>
              <span class="text-[11px] text-[var(--color-dark-muted)] w-9 inline-block font-semibold">{Math.round(item.pct)}%</span>
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
    <div class="space-y-3">
      {#each derivedState.upcomingLiabilities.filter(l => l.amount > 0) as { month, amount }}
        <div class="bg-[var(--color-dark-surface)] rounded-2xl p-4 border border-[var(--color-dark-border)] flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[var(--color-dark-bg)] flex items-center justify-center border border-[var(--color-dark-border)]">
            <CalendarDays class="w-5 h-5 text-[var(--color-dark-muted)]" />
          </div>
          <div class="flex-1">
            <span class="font-bold text-[15px] text-white">{month}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-[15px] text-[var(--color-accent-red)]">-{formatINR(amount)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
