<script lang="ts">
  import { thisMonthData, budgetState, CATEGORIES } from './store';
  import { Wallet } from 'lucide-svelte';

  const formatINR = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  $: derivedState = $thisMonthData;
  $: safe = derivedState.safeToSpend;
  
  // Create progress bars data. 
  // We use the basebudget / CATEGORIES.length as a dummy placeholder limit to visualize
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
    <span class="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1 text-center">Safe to Spend<br/>(Adjusted for Amortization & Rollover)</span>
    <h1 class="text-5xl font-black tracking-tight { safe < 0 ? 'text-[var(--color-accent-red)]' : 'text-white' } mb-4">
      {formatINR(safe)}
    </h1>
    
    <div class="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-semibold px-4 py-3 bg-[var(--color-dark-surface)] rounded-2xl text-gray-400 border border-[var(--color-dark-border)] w-full max-w-[300px]">
      <div class="flex w-full justify-between items-center text-center">
        <span class="text-left">Income: <span class="text-white block">{formatINR($budgetState.monthlyIncome)}</span></span>
        <div class="w-px h-6 bg-[var(--color-dark-border)]"></div>
        <span class="text-right">Auto-Pays: <span class="text-white block">{formatINR(derivedState.totalAutoPays)}</span></span>
      </div>
      <div class="w-full h-px bg-[var(--color-dark-border)]"></div>
      <div class="flex w-full justify-between items-center text-center">
        <span class="text-left w-full text-[11px] uppercase tracking-wider">Dynamic Rollover Deficit/Surplus: </span>
        <span class="text-right font-bold pl-2 {derivedState.dynamicRollover < 0 ? 'text-[var(--color-accent-red)]' : 'text-[var(--color-accent-green)]'}">
          {derivedState.dynamicRollover >= 0 ? '+' : ''}{formatINR(derivedState.dynamicRollover)}
        </span>
      </div>
    </div>
  </div>

  <h2 class="text-lg font-bold mb-4 px-1 text-white tracking-tight">Amortized Sub-Category Spend</h2>
  
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
