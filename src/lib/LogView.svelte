<script lang="ts">
  import { financeApi, transactions, DEFAULT_VARIABLE_CATEGORIES } from './store';
  import Numpad from './Numpad.svelte';
  import { Trash2, CheckCircle2 } from 'lucide-svelte';
  import { slide, fly, fade } from 'svelte/transition';

  let amountStr = '';
  let showToast = false;
  let isOneTime = false;

  $: currentAmountNum = parseFloat(amountStr) || 0;
  
  // Format Indian Rupees
  const formatINR = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  $: recentLogs = $transactions.slice(0, 3);

  const handleSave = (category: string) => {
    if (currentAmountNum <= 0) return;
    
    financeApi.addTransaction(currentAmountNum, isOneTime ? 'one-time' : 'variable', category);
    
    amountStr = '';
    isOneTime = false;
    showToast = true;
    setTimeout(() => showToast = false, 1500);
  };

  const undo = (id: string) => {
    financeApi.removeTransaction(id);
  };
</script>

<div class="flex flex-col flex-1 pb-[env(safe-area-inset-bottom)] h-full overflow-hidden">
  
  <!-- Recent Logs (Top) -->
  <div class="px-5 py-2 h-24 overflow-hidden flex flex-col justify-end">
    {#each recentLogs as log (log.id)}
      <div in:fly={{ y: -10, duration: 250 }} out:slide={{ duration: 200 }} class="flex justify-between items-center py-2 border-b border-[var(--color-dark-border)] opacity-80 last:border-0 last:opacity-100">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 font-medium">{log.category}</span>
            {#if log.type === 'one-time'}
              <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-dark-surface)] text-[var(--color-accent-blue)]">One-Time</span>
            {/if}
          </div>
          <span class="text-[15px] font-semibold tracking-tight {log.type === 'income' ? 'text-[var(--color-accent-green)]' : 'text-white'}">
            {log.type === 'income' ? '+' : ''}{formatINR(log.amount)}
          </span>
        </div>
        <button 
          class="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-dark-surface)] text-[var(--color-accent-red)] active:scale-90 transition-transform"
          on:click={() => undo(log.id)}
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {:else}
      <div class="h-full flex items-center justify-center text-sm text-gray-500 font-medium tracking-wide">
        No recent expenses
      </div>
    {/each}
  </div>

  <!-- One-Time Toggle -->
  <div class="flex justify-center mt-2 z-10">
    <label class="flex items-center gap-2 text-xs font-semibold text-gray-400 bg-[var(--color-dark-surface)] px-3 py-1.5 rounded-full border border-[var(--color-dark-border)]">
      <input type="checkbox" bind:checked={isOneTime} class="accent-[var(--color-accent-blue)] w-4 h-4" />
      Exclude from Budget (One-Time)
    </label>
  </div>

  <!-- Amount Display Area -->
  <div class="flex-1 flex flex-col items-center justify-center px-6 min-h-[100px] relative">
    {#if showToast}
      <div transition:fly={{ y: 20, duration: 300 }} class="absolute top-[-10px] flex items-center bg-[var(--color-accent-green)] text-black px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(48,209,88,0.3)] z-20">
        <CheckCircle2 class="w-4 h-4 mr-2" /> Saved!
      </div>
    {/if}
    <div class="text-[var(--color-accent-blue)] text-2xl font-semibold mb-1 tracking-wider opacity-90 delay-75 transition-opacity {amountStr ? 'opacity-100' : 'opacity-40'}">₹</div>
    <div class="text-6xl font-black tracking-tighter text-white truncate w-full text-center tabular-nums">
      {amountStr || '0'}
    </div>
  </div>

  <!-- Action Area (Category + Numpad) -->
  <div class="flex-none mb-2">
    <!-- Category Chips inline -->
    <div class="flex overflow-x-auto no-scrollbar gap-3 py-4 px-4 mask-edges-horizontal touch-pan-x">
      {#each DEFAULT_VARIABLE_CATEGORIES as category}
        <button
          type="button"
          disabled={currentAmountNum === 0}
          class="whitespace-nowrap px-5 py-3 rounded-full text-[15px] font-semibold transition-all duration-150 active:scale-95
                 bg-[var(--color-dark-surface)] text-[#F2F2F7] border border-[var(--color-dark-border)]
                 disabled:opacity-50 disabled:active:scale-100 shadow-sm"
          on:click={() => handleSave(category)}
        >
          {category}
        </button>
      {/each}
    </div>
    <Numpad bind:amountStr />
  </div>
</div>

<style>
  .mask-edges-horizontal {
    -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
    mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
  }
</style>
