<script lang="ts">
  import { thisMonthData, weeklyHeatMapData, budgetState, categories } from './store';
  import { Wallet, Activity } from 'lucide-svelte';

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const derivedState = $derived($thisMonthData);
  const safe = $derived(derivedState.safeToSpend);
  const heatmap = $derived($weeklyHeatMapData);

  const limitTotal = $derived($budgetState.baseBudget > 0 ? $budgetState.baseBudget : 30000);
  const catLimit = $derived(limitTotal / Math.max($categories.length, 1));

  const progressData = $derived(
    $categories
      .map(cat => {
        const amt = derivedState.currentCategorySpending[cat] || 0;
        const limit = catLimit;
        const rawPct = limit === 0 ? 0 : (amt / limit) * 100;
        return { cat, amt, limit, pct: Math.min(rawPct, 100), rawPct };
      })
      .filter(r => r.amt > 0)
      .sort((a, b) => b.rawPct - a.rawPct)
  );
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24">

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

  <!-- Category Progress Bars -->
  <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-4 px-1">Monthly Spend by Category</h2>
  <div class="space-y-3">
    {#each progressData as { cat, amt, limit, pct, rawPct }}
      <div class="bg-[var(--color-dark-surface)] rounded-2xl p-4 border border-[var(--color-dark-border)]">
        <div class="flex justify-between items-center mb-2.5">
          <span class="font-semibold text-[15px]">{cat}</span>
          <div class="text-right">
            <span class="font-bold text-[15px]">{formatINR(amt)}</span>
            <span class="text-[11px] text-[var(--color-dark-muted)] ml-1">/ {formatINR(limit)}</span>
          </div>
        </div>

        <div class="h-1.5 bg-[var(--color-dark-elevated)] rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 ease-out"
            style="width: {pct}%; background-color: {rawPct > 100
              ? 'var(--color-accent-red)'
              : rawPct > 80
              ? 'var(--color-accent-yellow)'
              : 'var(--color-accent-blue)'}"
          ></div>
        </div>
      </div>
    {:else}
      <p class="py-10 text-center text-[var(--color-dark-muted)] text-sm">No variable spending logged this month.</p>
    {/each}
  </div>
</div>
