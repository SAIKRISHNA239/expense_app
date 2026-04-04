<script lang="ts">
  import { financeApi, transactions, categories, INCOME_CATEGORY, formatDate, formatTime } from './store';
  import Numpad from './Numpad.svelte';
  import { Trash2, CheckCircle2, History, TrendingUp } from 'lucide-svelte';
  import { slide, fly } from 'svelte/transition';

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  let amountStr = $state('');
  let showToast = $state(false);
  let durationMonths = $state(1);
  let selectedMode = $state<'today' | 'yesterday' | 'custom'>('today');
  let customDate = $state(formatDate(new Date()));

  const durationOptions = [1, 2, 3, 6, 12];

  const currentAmountNum = $derived(parseFloat(amountStr) || 0);
  const recentLogs = $derived($transactions.slice(0, 3));

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
    financeApi.addTransaction(currentAmountNum, category, getTargetDateStr(), formatTime(new Date()), durationMonths);
    amountStr = '';
    durationMonths = 1;
    selectedMode = 'today';
    showToast = true;
    setTimeout(() => (showToast = false), 1600);
  };
</script>

<div class="flex flex-col flex-1 h-full overflow-hidden">

  <!-- Recents -->
  <div class="px-5 py-2 h-[92px] overflow-hidden flex flex-col justify-end border-b border-[var(--color-dark-border)]">
    {#each recentLogs as log (log.id)}
      <div in:fly={{ y: -10, duration: 250 }} out:slide={{ duration: 200 }}
        class="flex justify-between items-center py-1.5 opacity-70 last:opacity-100">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-[11px] {log.isIncome ? 'text-[var(--color-income)]' : 'text-[var(--color-dark-muted)]'} font-bold uppercase tracking-wider">
              {log.category} · {log.time}
            </span>
            {#if log.durationMonths > 1}
              <span class="px-1.5 rounded text-[10px] bg-[var(--color-dark-elevated)] text-[var(--color-accent-blue)] font-bold">{log.durationMonths}m</span>
            {/if}
          </div>
          <span class="text-[15px] font-semibold {log.isIncome ? 'text-[var(--color-income)]' : 'text-white'} flex items-center gap-2">
            {log.isIncome ? '+' : ''}{formatINR(log.amount)}
            {#if log.date !== formatDate(new Date())}
              <span class="text-[11px] font-normal text-[var(--color-dark-muted)] bg-[var(--color-dark-elevated)] px-1.5 rounded">{log.date}</span>
            {/if}
          </span>
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-dark-elevated)] text-[var(--color-accent-red)] active:scale-90 transition-transform"
          onclick={() => financeApi.removeTransaction(log.id)}
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {:else}
      <p class="h-full flex items-center justify-center text-sm text-[var(--color-dark-muted)] font-medium">No recent entries</p>
    {/each}
  </div>

  <!-- Amount display -->
  <div class="flex-1 flex flex-col items-center justify-center px-6 min-h-[80px] relative">
    {#if showToast}
      <div transition:fly={{ y: 20, duration: 300 }}
        class="absolute top-2 flex items-center bg-[var(--color-accent-green)] text-black px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_15px_rgba(34,197,94,0.35)] z-20">
        <CheckCircle2 class="w-4 h-4 mr-2" /> Saved!
      </div>
    {/if}
    <div class="text-[var(--color-accent-blue)] text-2xl font-semibold mb-1 transition-opacity {amountStr ? 'opacity-100' : 'opacity-30'}">₹</div>
    <div class="text-6xl font-black tracking-tighter text-white truncate w-full text-center tabular-nums">
      {amountStr || '0'}
    </div>
  </div>

  <!-- Config ribbon: date picker + spread -->
  <div class="flex gap-2 px-4 mb-2 w-full overflow-x-auto no-scrollbar">
    <!-- Date picker -->
    <div class="flex-none bg-[var(--color-dark-surface)] p-1 rounded-xl border border-[var(--color-dark-border)] flex items-center gap-1">
      <History class="w-3.5 h-3.5 text-[var(--color-dark-muted)] ml-2 mr-0.5" />
      {#each (['today', 'yesterday'] as const) as mode}
        <button
          class="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors capitalize
                 {selectedMode === mode ? 'bg-[var(--color-dark-border)] text-white' : 'text-[var(--color-dark-muted)]'}"
          onclick={() => selectedMode = mode}
        >
          {mode === 'today' ? 'Today' : 'Yest.'}
        </button>
      {/each}
      <div class="relative flex items-center mr-1">
        <input
          type="date"
          bind:value={customDate}
          onchange={() => (selectedMode = 'custom')}
          class="w-8 h-8 opacity-0 absolute inset-0 z-10 cursor-pointer"
          style="touch-action: auto;"
        />
        <button class="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors
                       {selectedMode === 'custom' ? 'bg-[var(--color-dark-border)] text-white' : 'text-[var(--color-dark-muted)]'}">
          Pick
        </button>
      </div>
    </div>

    <!-- Spread -->
    <div class="flex-none bg-[var(--color-dark-surface)] p-1 rounded-xl border border-[var(--color-dark-border)] flex gap-1">
      {#each durationOptions as opt}
        <button
          class="w-8 py-1 text-xs font-semibold rounded-lg transition-colors
                 {durationMonths === opt ? 'bg-[var(--color-dark-border)] text-white' : 'text-[var(--color-dark-muted)]'}"
          onclick={() => (durationMonths = opt)}
        >
          {opt}
        </button>
      {/each}
    </div>
  </div>

  <!-- Category 3-column Grid + Income chip -->
  <div class="flex-none px-4 pb-2">
    <!-- Income chip – full width so it stands out -->
    <button
      disabled={currentAmountNum === 0}
      class="w-full mb-2 py-2.5 rounded-2xl text-[14px] font-bold tracking-tight transition-all duration-150 active:scale-95
             flex items-center justify-center gap-2
             bg-emerald-950 text-[var(--color-income)] border border-emerald-800
             disabled:opacity-40 disabled:active:scale-100"
      onclick={() => handleSave(INCOME_CATEGORY)}
    >
      <TrendingUp class="w-4 h-4" />
      Add Income
    </button>

    <!-- Regular categories in 3-col grid -->
    <div class="grid grid-cols-3 gap-2">
      {#each $categories as category}
        <button
          type="button"
          disabled={currentAmountNum === 0}
          class="py-3 rounded-2xl text-[13px] font-bold tracking-tight transition-all duration-150 active:scale-95
                 bg-[var(--color-dark-elevated)] text-[#e4e4e7] border border-[var(--color-dark-border)]
                 disabled:opacity-40 disabled:active:scale-100"
          onclick={() => handleSave(category)}
        >
          {category}
        </button>
      {/each}
    </div>
  </div>

  <Numpad bind:amountStr />
</div>
