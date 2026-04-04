<script lang="ts">
  import { financeApi, transactions, CATEGORIES, formatDate, formatTime } from './store';
  import Numpad from './Numpad.svelte';
  import { Trash2, CheckCircle2, History } from 'lucide-svelte';
  import { slide, fly } from 'svelte/transition';

  let amountStr = '';
  let showToast = false;
  let durationMonths = 1;
  const durationOptions = [1, 2, 3, 6, 12];

  // Date Selector Logic
  let selectedMode: 'today' | 'yesterday' | 'custom' = 'today';
  let customDate = formatDate(new Date());

  $: currentAmountNum = parseFloat(amountStr) || 0;
  
  const formatINR = (n: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  $: recentLogs = $transactions.slice(0, 3);

  const getTargetDateStr = () => {
    if (selectedMode === 'today') return formatDate(new Date());
    if (selectedMode === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return formatDate(d);
    }
    return customDate;
  };

  const handleSave = (category: string) => {
    if (currentAmountNum <= 0) return;
    
    // Always use current time for entry
    financeApi.addTransaction(currentAmountNum, category, getTargetDateStr(), formatTime(new Date()), durationMonths);
    
    amountStr = '';
    durationMonths = 1;
    selectedMode = 'today';
    showToast = true;
    setTimeout(() => showToast = false, 1500);
  };

</script>

<div class="flex flex-col flex-1 pb-[env(safe-area-bottom)] h-full overflow-hidden">
  
  <!-- Recents w/ Exact Time -->
  <div class="px-5 py-2 h-24 overflow-hidden flex flex-col justify-end border-b border-[var(--color-dark-border)]">
    {#each recentLogs as log (log.id)}
      <div in:fly={{ y: -10, duration: 250 }} out:slide={{ duration: 200 }} class="flex justify-between items-center py-2 opacity-80 last:opacity-100">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{log.category} ({log.time})</span>
            {#if log.durationMonths > 1}
              <span class="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[var(--color-dark-surface)] text-[var(--color-accent-blue)]">{log.durationMonths}m</span>
            {/if}
          </div>
          <span class="text-[15px] font-semibold tracking-tight text-white flex items-center gap-2">
            {formatINR(log.amount)}
            {#if log.date !== formatDate(new Date())}
               <span class="text-xs font-normal text-gray-500 bg-[var(--color-dark-surface)] px-1.5 rounded">{log.date}</span>
            {/if}
          </span>
        </div>
        <button 
          class="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-dark-surface)] text-[var(--color-accent-red)] active:scale-90 transition-transform"
          on:click={() => financeApi.removeTransaction(log.id)}
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

  <!-- Amount Area -->
  <div class="flex-1 flex flex-col items-center justify-center px-6 min-h-[90px] relative">
    {#if showToast}
      <div transition:fly={{ y: 20, duration: 300 }} class="absolute top-[5px] flex items-center bg-[var(--color-accent-green)] text-black px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(48,209,88,0.3)] z-20">
        <CheckCircle2 class="w-4 h-4 mr-2" /> Saved!
      </div>
    {/if}
    <div class="text-[var(--color-accent-blue)] text-2xl font-semibold mb-1 tracking-wider opacity-90 delay-75 transition-opacity {amountStr ? 'opacity-100' : 'opacity-40'}">₹</div>
    <div class="text-6xl font-black tracking-tighter text-white truncate w-full text-center tabular-nums">
      {amountStr || '0'}
    </div>
  </div>

  <!-- Configurations Ribbon (Date Picker + Spread) -->
  <div class="flex gap-2 px-4 mt-2 mb-2 w-full max-w-full overflow-x-auto no-scrollbar">
    <!-- Date Picker section -->
    <div class="flex-none bg-[var(--color-dark-surface)] p-1 rounded-2xl border border-[var(--color-dark-border)] flex items-center gap-1">
      <History class="w-4 h-4 text-gray-400 ml-2 mr-1" />
      <button 
        class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors {selectedMode === 'today' ? 'bg-[var(--color-dark-border)] text-white' : 'text-gray-400'}"
        on:click={() => selectedMode = 'today'}
      >Today</button>
      <button 
        class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors {selectedMode === 'yesterday' ? 'bg-[var(--color-dark-border)] text-white' : 'text-gray-400'}"
        on:click={() => selectedMode = 'yesterday'}
      >Yesterday</button>
      <div class="relative flex items-center mr-1">
        <input 
          type="date" 
          bind:value={customDate}
          on:change={() => selectedMode = 'custom'}
          class="w-8 h-8 opacity-0 absolute inset-0 z-10 cursor-pointer pointer-events-auto"
        />
        <button class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-colors {selectedMode === 'custom' ? 'bg-[var(--color-dark-border)] text-white' : 'text-gray-400'}">
          Pick
        </button>
      </div>
    </div>

    <!-- Duration Slider section -->
    <div class="flex-none bg-[var(--color-dark-surface)] p-1 rounded-2xl border border-[var(--color-dark-border)] flex gap-1">
      {#each durationOptions as opt}
        <button 
          class="w-8 py-1.5 text-xs font-semibold rounded-xl transition-colors {durationMonths === opt ? 'bg-[var(--color-dark-border)] text-white' : 'text-gray-400'}"
          on:click={() => durationMonths = opt}
        >
          {opt}
        </button>
      {/each}
    </div>
  </div>

  <!-- Action Area -->
  <div class="flex-none">
    <div class="flex overflow-x-auto no-scrollbar gap-3 pb-3 px-4 mask-edges-horizontal touch-pan-x">
      {#each CATEGORIES as category}
        <button
          type="button"
          disabled={currentAmountNum === 0}
          class="whitespace-nowrap px-5 py-3 rounded-2xl text-[14px] font-bold tracking-tight transition-all duration-150 active:scale-95
                 bg-[#171719] text-[#F2F2F7] border border-[var(--color-dark-border)]
                 disabled:opacity-50 disabled:active:scale-100 shadow-xl"
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
