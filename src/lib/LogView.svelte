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
  <div class="px-5 pt-8 pb-3 h-[110px] overflow-hidden flex flex-col justify-end relative">
    <!-- Fade top -->
    <div class="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--color-dark-bg)] to-transparent z-10 pointer-events-none"></div>
    <div class="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    {#each recentLogs as log (log.id)}
      <div in:fly={{ y: -10, duration: 250 }} out:slide={{ duration: 200 }}
        class="flex justify-between items-center py-2 opacity-70 last:opacity-100 hover:opacity-100 transition-opacity">
        <div class="flex flex-col">
          <div class="flex items-center gap-2">
            <span class="text-[10px] {log.isIncome ? 'text-emerald-400' : 'text-zinc-500'} font-black uppercase tracking-[0.15em]">
              {log.category} · {log.time}
            </span>
            {#if log.durationMonths > 1}
              <span class="px-1.5 rounded-sm text-[9px] bg-blue-500/10 text-blue-400 font-bold tracking-widest">{log.durationMonths}M</span>
            {/if}
          </div>
          <span class="text-[16px] font-black tracking-tight {log.isIncome ? 'text-emerald-400' : 'text-white'} flex items-center gap-2">
            {log.isIncome ? '+' : ''}{formatINR(log.amount)}
            {#if log.date !== formatDate(new Date())}
              <span class="text-[10px] font-bold text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">{log.date}</span>
            {/if}
          </span>
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
          onclick={() => financeApi.removeTransaction(log.id)}
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    {:else}
      <p class="h-full flex items-center justify-center text-xs text-zinc-600 font-bold tracking-widest uppercase">No recent entries</p>
    {/each}
  </div>

  <!-- Amount display -->
  <div class="flex-1 flex flex-col items-center justify-center px-6 min-h-[120px] relative">
    <div class="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none -z-10"></div>
    {#if showToast}
      <div transition:fly={{ y: 20, duration: 300 }}
        class="absolute top-2 flex items-center bg-emerald-500/20 border border-emerald-500/50 backdrop-blur-md text-emerald-400 px-5 py-2 rounded-full font-bold text-[13px] shadow-[0_0_24px_rgba(52,211,153,0.4)] z-20">
        <CheckCircle2 class="w-4 h-4 mr-2" /> Logged Successfully
      </div>
    {/if}
    <div class="text-blue-500 text-3xl font-bold mb-0 transition-opacity {amountStr ? 'opacity-100' : 'opacity-30'} shadow-blue-500/50">₹</div>
    <div class="text-[72px] leading-[1] font-black tracking-tighter text-white truncate w-full text-center tabular-nums drop-shadow-[0_8px_24px_rgba(255,255,255,0.15)]">
      {amountStr || '0'}
    </div>
  </div>

  <!-- Config ribbon: date picker + spread -->
  <div class="flex gap-2.5 px-5 mb-4 w-full overflow-x-auto no-scrollbar relative z-10">
    <!-- Date picker -->
    <div class="flex-none bg-[#111216]/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 flex items-center gap-1 shadow-inner">
      <History class="w-4 h-4 text-zinc-500 ml-2 mr-1" />
      {#each (['today', 'yesterday'] as const) as mode}
        <button
          class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300
                 {selectedMode === mode ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}"
          onclick={() => selectedMode = mode}
        >
          {mode === 'today' ? 'Today' : 'Yest'}
        </button>
      {/each}
      <div class="relative flex items-center mr-1 ml-1">
        <input
          type="date"
          bind:value={customDate}
          onchange={() => (selectedMode = 'custom')}
          class="w-10 h-10 opacity-0 absolute inset-0 z-10 cursor-pointer"
          style="touch-action: auto;"
        />
        <button class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] rounded-xl transition-all duration-300
                       {selectedMode === 'custom' ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}">
          Custom
        </button>
      </div>
    </div>

    <!-- Spread -->
    <div class="flex-none bg-[#111216]/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 flex gap-1 shadow-inner">
      {#each durationOptions as opt}
        <button
          class="w-9 py-1.5 text-[12px] font-black rounded-xl transition-all duration-300
                 {durationMonths === opt ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-400'}"
          onclick={() => (durationMonths = opt)}
        >
          {opt}
        </button>
      {/each}
    </div>
  </div>

  <!-- Category 3-column Grid + Income chip -->
  <div class="flex-none px-5 pb-4 relative z-10">
    <!-- Income chip -->
    <button
      disabled={currentAmountNum === 0}
      class="w-full mb-3 py-3.5 rounded-[1.2rem] text-[13px] font-black tracking-[0.15em] uppercase transition-all duration-300 active:scale-[0.98]
             flex items-center justify-center gap-2 relative overflow-hidden group
             bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner
             disabled:opacity-30 disabled:active:scale-100 disabled:grayscale"
      onclick={() => handleSave(INCOME_CATEGORY)}
    >
      <div class="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
      <TrendingUp class="w-5 h-5" />
      Log Income
    </button>

    <!-- Regular categories in 3-col grid -->
    <div class="grid grid-cols-3 gap-2.5">
      {#each $categories as category}
        <button
          type="button"
          disabled={currentAmountNum === 0}
          class="py-3.5 px-1 rounded-[1rem] text-[12px] font-bold tracking-tight transition-all duration-200 active:scale-95
                 bg-white/5 text-zinc-300 border border-white/5 shadow-inner relative overflow-hidden
                 disabled:opacity-30 disabled:active:scale-100
                 hover:bg-white/10 hover:text-white hover:border-white/20"
          onclick={() => handleSave(category)}
        >
          {category}
        </button>
      {/each}
    </div>
  </div>

  <Numpad bind:amountStr />
</div>
