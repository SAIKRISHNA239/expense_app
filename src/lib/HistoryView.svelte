<script lang="ts">
  import { transactions, financeApi, INCOME_CATEGORY, AUTO_PAY_CATEGORY } from './store';
  import { Trash2, TrendingUp, TrendingDown } from 'lucide-svelte';

  const formatINR = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  // Human-readable full date label
  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00'); // prevent UTC shift
    return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatMonthYear = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Group transactions by month → by date
  type DayGroup = { date: string; label: string; txs: typeof $transactions };
  type MonthGroup = { ym: string; label: string; days: DayGroup[]; total: number; income: number };

  const grouped = $derived(() => {
    const monthMap = new Map<string, MonthGroup>();

    for (const tx of $transactions) {
      const ym = tx.date.substring(0, 7);
      const isInc = tx.isIncome || tx.category === INCOME_CATEGORY;

      if (!monthMap.has(ym)) {
        monthMap.set(ym, { ym, label: formatMonthYear(ym), days: [], total: 0, income: 0 });
      }
      const mg = monthMap.get(ym)!;
      if (isInc) mg.income += tx.amount;
      else mg.total += tx.amount;

      // Day group inside the month
      let dayGroup = mg.days.find(d => d.date === tx.date);
      if (!dayGroup) {
        dayGroup = { date: tx.date, label: formatFullDate(tx.date), txs: [] };
        mg.days.push(dayGroup);
      }
      dayGroup.txs.push(tx);
    }

    // Sort months newest first; days newest first within month
    const months = [...monthMap.values()].sort((a, b) => b.ym.localeCompare(a.ym));
    months.forEach(mg => mg.days.sort((a, b) => b.date.localeCompare(a.date)));
    return months;
  });
</script>

<div class="flex-1 overflow-y-auto no-scrollbar h-full pb-24">

  <!-- Header -->
  <div class="px-5 pt-6 pb-4 border-b border-[var(--color-dark-border)] sticky top-0 bg-[var(--color-dark-bg)] z-10">
    <h1 class="text-2xl font-black tracking-tight text-white">Transaction History</h1>
    <p class="text-[13px] text-[var(--color-dark-muted)] font-medium mt-0.5">{$transactions.length} entries</p>
  </div>

  {#if $transactions.length === 0}
    <div class="flex flex-col items-center justify-center h-64 text-[var(--color-dark-muted)]">
      <p class="text-lg font-semibold">No transactions yet</p>
      <p class="text-sm mt-1">Log an expense to see it here.</p>
    </div>
  {:else}
    {#each grouped() as mg (mg.ym)}
      <!-- Month Header -->
      <div class="px-5 pt-6 pb-2 flex items-center justify-between">
        <h2 class="text-[15px] font-black text-white tracking-tight">{mg.label}</h2>
        <div class="flex gap-3 text-[12px] font-semibold">
          {#if mg.income > 0}
            <span class="text-[var(--color-income)]">+{formatINR(mg.income)}</span>
          {/if}
          <span class="text-[var(--color-dark-muted)]">{formatINR(mg.total)}</span>
        </div>
      </div>

      {#each mg.days as dg (dg.date)}
        <!-- Day Label -->
        <div class="px-5 py-2">
          <span class="text-[11px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider">{dg.label}</span>
        </div>

        <!-- Transactions -->
        <div class="mx-4 mb-3 bg-[var(--color-dark-surface)] rounded-2xl border border-[var(--color-dark-border)] overflow-hidden divide-y divide-[var(--color-dark-border)]">
          {#each dg.txs as tx (tx.id)}
            {@const isInc = tx.isIncome || tx.category === INCOME_CATEGORY}
            {@const isAP = tx.category === AUTO_PAY_CATEGORY}
            <div class="flex items-center gap-3 px-4 py-3">
              <!-- Icon -->
              <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                          {isInc ? 'bg-emerald-950 text-[var(--color-income)]' : 'bg-[var(--color-dark-elevated)] text-[var(--color-dark-muted)]'}">
                {#if isInc}
                  <TrendingUp class="w-4 h-4" />
                {:else}
                  <TrendingDown class="w-4 h-4" />
                {/if}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-[14px] text-white truncate">{tx.category}</p>
                <p class="text-[11px] text-[var(--color-dark-muted)] font-medium">
                  {tx.time}
                  {#if tx.durationMonths > 1}
                    · <span class="text-[var(--color-accent-blue)]">{tx.durationMonths}-month spread</span>
                  {/if}
                  {#if isAP}
                    · <span class="text-[var(--color-accent-yellow)]">Auto-Pay</span>
                  {/if}
                </p>
              </div>

              <!-- Amount -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="font-bold text-[15px] tabular-nums {isInc ? 'text-[var(--color-income)]' : 'text-white'}">
                  {isInc ? '+' : ''}{formatINR(tx.amount)}
                </span>
                <button
                  class="w-7 h-7 flex items-center justify-center rounded-full text-[var(--color-accent-red)] active:scale-90 transition-transform"
                  onclick={() => financeApi.removeTransaction(tx.id)}
                  aria-label="Delete transaction"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/each}
  {/if}

</div>
