<script lang="ts">
  import { safeToSpend, variableCategorySpending, budgets, monthlyIncome, totalFixedCosts } from './store';
  import { Wallet } from 'lucide-svelte';

  const formatINR = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  $: spending = $variableCategorySpending;
  
  // Create progress bars data. Use user-defined budgets or default to 5000 if not set.
  $: progressData = Object.entries(spending).map(([cat, amt]) => {
    const budgetObj = $budgets.find(b => b.category === cat);
    // If no explicit budget exists, let's just use 5000 as a placeholder to show visual bars
    const limit = budgetObj ? budgetObj.limit : 5000;
    const pct = Math.min((amt / limit) * 100, 100);
    return { cat, amt, limit, pct, rawPct: (amt / limit) * 100 };
  }).sort((a, b) => b.rawPct - a.rawPct);

</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24">
  <!-- Safe to Spend Top Area -->
  <div class="mb-8 flex flex-col items-center">
    <div class="w-16 h-16 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center mb-4 border border-[var(--color-dark-border)] shadow-md">
      <Wallet class="w-8 h-8 text-[#F2F2F7]" />
    </div>
    <span class="text-sm text-gray-400 font-medium uppercase tracking-widest mb-1">Safe to Spend</span>
    <h1 class="text-5xl font-black tracking-tight { $safeToSpend < 0 ? 'text-[var(--color-accent-red)]' : 'text-white' } mb-3">
      {formatINR($safeToSpend)}
    </h1>
    
    <div class="flex gap-4 text-xs font-semibold px-4 py-2 bg-[var(--color-dark-surface)] rounded-full text-gray-400 border border-[var(--color-dark-border)]">
      <span>Income: <span class="text-white">{formatINR($monthlyIncome)}</span></span>
      <div class="w-px h-full bg-[var(--color-dark-border)]"></div>
      <span>Fixed: <span class="text-white">{formatINR($totalFixedCosts)}</span></span>
    </div>
  </div>

  <h2 class="text-lg font-bold mb-4 px-1 text-white tracking-tight">Category Spending</h2>
  
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
        {#if rawPct > 100}
          <div class="text-[10px] text-[var(--color-accent-red)] font-semibold mt-1.5 text-right">Over budget!</div>
        {:else if rawPct > 80}
          <div class="text-[10px] text-[#FFD60A] font-semibold mt-1.5 text-right">Approaching limit</div>
        {/if}
      </div>
    {:else}
      <div class="py-10 text-center text-gray-500 font-medium text-sm">
        No variable spending yet this month.
      </div>
    {/each}
  </div>
</div>
