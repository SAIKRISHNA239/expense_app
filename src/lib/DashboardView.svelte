<script lang="ts">
  import { thisMonthData, weeklyHeatMapData, budgetState, CATEGORIES } from './store';
  import { Wallet, Activity } from 'lucide-svelte';

  const formatINR = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  $: derivedState = $thisMonthData;
  $: safe = derivedState.safeToSpend;
  $: heatmap = $weeklyHeatMapData;
  
  $: limitTotal = $budgetState.baseBudget > 0 ? $budgetState.baseBudget : 30000;
  $: catLimit = limitTotal / CATEGORIES.length;

  $: progressData = CATEGORIES.map((cat) => {
    const amt = derivedState.currentCategorySpending[cat] || 0;
    const limit = catLimit;
    const rawPct = limit === 0 ? 0 : (amt / limit) * 100;
    const pct = Math.min(rawPct, 100);
    return { cat, amt, limit, pct, rawPct };
  }).sort((a, b) => b.rawPct - a.rawPct);

</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24">
  
  <!-- Safe to Spend Top Area -->
  <div class="mb-8 flex flex-col items-center">
    <div class="w-16 h-16 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center mb-4 border border-[var(--color-dark-border)] shadow-md">
      <Wallet class="w-8 h-8 text-[#F2F2F7]" />
    </div>
    <span class="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1 text-center">Safe to Spend</span>
    <h1 class="text-5xl font-black tracking-tight { safe < 0 ? 'text-[var(--color-accent-red)]' : 'text-white' } mb-6">
      {formatINR(safe)}
    </h1>
  </div>

  <!-- Pure CSS Weekly Heat Map -->
  <section class="mb-8 bg-[var(--color-dark-surface)] p-5 rounded-3xl border border-[var(--color-dark-border)] shadow-sm">
      <div class="flex items-center gap-2 mb-6">
        <Activity class="w-4 h-4 text-gray-400" />
        <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider">Weekly Heat Map</h2>
      </div>

      <div class="flex justify-between items-end h-32 w-full gap-2 px-1">
        {#each heatmap as hd}
          <div class="flex flex-col items-center justify-end w-full h-full gap-2 relative group">
            <!-- Tooltip -->
            {#if hd.rawAmt > 0}
               <div class="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none z-10">
                 {formatINR(hd.rawAmt)}
               </div>
            {/if}

            <div class="w-full flex-1 flex items-end bg-[#151516] rounded-t-sm rounded-b-sm overflow-hidden">
               <div 
                 class="w-full rounded-t-sm rounded-b-sm transition-all duration-700 ease-out {hd.isMax ? 'bg-[var(--color-accent-blue)] shadow-[0_-5px_15px_rgba(10,132,255,0.4)]' : 'bg-[#434346]'}"
                 style="height: {hd.percent}%"
               ></div>
            </div>
            <span class="text-[10px] font-bold {hd.isMax ? 'text-white' : 'text-gray-500'}">{hd.day}</span>
          </div>
        {/each}
      </div>
  </section>

  <!-- Categories -->
  <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Amortized Sub-Category Spend</h2>
  <div class="space-y-4">
    {#each progressData as { cat, amt, limit, pct, rawPct }}
      <div class="bg-[var(--color-dark-surface)] rounded-2xl p-4 shadow-sm border border-[var(--color-dark-border)]">
        <div class="flex justify-between items-end mb-2">
          <span class="font-semibold text-[15px]">{cat}</span>
          <div class="flex flex-col items-end">
            <span class="font-bold tracking-tight text-[15px]">{formatINR(amt)}</span>
            <span class="text-[11px] text-gray-500 font-medium">/ {formatINR(limit)}</span>
          </div>
        </div>
        
        <div class="h-2 bg-[var(--color-dark-bg)] rounded-full overflow-hidden mt-1 relative">
          <div 
            class="h-full rounded-full transition-all duration-500 ease-out 
              {rawPct > 100 ? 'bg-[var(--color-accent-red)] shadow-[0_0_8px_rgba(255,69,58,0.5)]' : 
               rawPct > 80 ? 'bg-[var(--color-accent-yellow)] shadow-[0_0_8px_rgba(255,214,10,0.5)]' : 
               'bg-[var(--color-accent-blue)] shadow-[0_0_8px_rgba(10,132,255,0.4)]'}"
            style="width: {pct}%; background-color: {rawPct > 100 ? 'var(--color-accent-red)' : rawPct > 80 ? '#FFD60A' : 'var(--color-accent-blue)'}"
          ></div>
        </div>
      </div>
    {:else}
      <div class="py-10 text-center text-gray-500 font-medium text-sm">
        Nothing calculated for this month.
      </div>
    {/each}
  </div>
</div>
