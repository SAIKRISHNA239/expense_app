<script lang="ts">
  import { financeApi, budgetState, autoPays, categories } from './store';
  import { Settings, Save, Trash2, Download, Upload, Plus, Tag } from 'lucide-svelte';

  // Budget state (mirror store values into local state for the form)
  let incomeInput = $state($budgetState.monthlyIncome.toString());
  let budgetInput = $state($budgetState.baseBudget.toString());
  let rolloverInput = $state($budgetState.rolloverAmount.toString());

  // Auto-Pay form
  let apName = $state('');
  let apAmount = $state('');
  let apDay = $state('1');

  // Category form
  let newCategory = $state('');
  let catError = $state('');

  let fileInput = $state<HTMLInputElement>();

  const saveBudgetSettings = () => {
    const inc = parseFloat(incomeInput) || 0;
    const bud = parseFloat(budgetInput) || 0;
    const rol = parseFloat(rolloverInput) || 0;
    financeApi.updateBudget(inc, bud, rol);
  };

  const addAutoPay = () => {
    const amt = parseFloat(apAmount);
    const day = parseInt(apDay);
    if (!apName.trim() || isNaN(amt) || amt <= 0 || isNaN(day) || day < 1 || day > 31) return;
    financeApi.addAutoPay(apName.trim(), amt, day);
    apName = '';
    apAmount = '';
    apDay = '1';
  };

  const handleAddCategory = () => {
    catError = '';
    const ok = financeApi.addCategory(newCategory);
    if (ok) {
      newCategory = '';
    } else {
      catError = 'Already exists or empty';
    }
  };

  const handleImport = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      const ok = financeApi.importData(content);
      alert(ok ? 'Import successful!' : 'Failed — invalid format.');
    };
    reader.readAsText(file);
    target.value = '';
  };

  const ordinal = (n: number) =>
    n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24 text-[#e4e4e7]">

  <!-- Header -->
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center border border-[var(--color-dark-border)]">
      <Settings class="w-5 h-5 text-gray-300" />
    </div>
    <h1 class="text-2xl font-black tracking-tight text-white">Manage</h1>
  </div>

  <!-- ── Budget Variables ────────────────────────────────────────────── -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-3">Global Math Variables</h2>
    <div class="space-y-3">
      <div class="flex flex-col">
        <label class="text-[11px] font-bold text-[var(--color-dark-muted)] uppercase mb-1 ml-1">Assumed Monthly Income</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-dark-muted)] font-semibold">₹</span>
          <input type="number" bind:value={incomeInput}
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <div class="flex flex-col">
        <label class="text-[11px] font-bold text-[var(--color-dark-muted)] uppercase mb-1 ml-1">Budget Cap (for chart scaling)</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-dark-muted)] font-semibold">₹</span>
          <input type="number" bind:value={budgetInput}
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <div class="flex flex-col">
        <label class="text-[11px] font-bold text-[var(--color-dark-muted)] uppercase mb-1 ml-1">Initial Rollover Surplus/Deficit</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-dark-muted)] font-semibold">₹</span>
          <input type="number" bind:value={rolloverInput}
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <button
        class="w-full bg-[var(--color-accent-blue)] text-white py-2.5 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 mt-1"
        onclick={saveBudgetSettings}
      >
        <Save class="w-4 h-4" /> Save Variables
      </button>
    </div>
  </section>

  <!-- ── Categories CRUD ────────────────────────────────────────────── -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 border border-[var(--color-dark-border)]">
    <div class="flex items-center gap-2 mb-3">
      <Tag class="w-4 h-4 text-[var(--color-dark-muted)]" />
      <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider">Expense Categories</h2>
    </div>

    <!-- Existing categories -->
    <div class="flex flex-wrap gap-2 mb-4">
      {#each $categories as cat}
        <div class="flex items-center gap-1 bg-[var(--color-dark-elevated)] border border-[var(--color-dark-border)] rounded-full px-3 py-1.5">
          <span class="text-[13px] font-semibold text-white">{cat}</span>
          <button
            class="text-[var(--color-accent-red)] ml-1 active:scale-75 transition-transform"
            onclick={() => financeApi.removeCategory(cat)}
            aria-label="Remove {cat}"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
    </div>

    <!-- Add category -->
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newCategory}
        placeholder="New category name"
        class="flex-1 bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2.5 px-4
               text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[14px]"
        style="touch-action: auto;"
        onkeydown={e => e.key === 'Enter' && handleAddCategory()}
      />
      <button
        class="bg-[var(--color-accent-blue)] text-white px-4 rounded-xl font-bold active:scale-95 transition-transform flex items-center gap-1.5"
        onclick={handleAddCategory}
      >
        <Plus class="w-4 h-4" />
      </button>
    </div>
    {#if catError}
      <p class="text-[var(--color-accent-red)] text-xs mt-2 font-medium">{catError}</p>
    {/if}
  </section>

  <!-- ── Add Auto-Pay ───────────────────────────────────────────────── -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-1">Add Auto-Pay</h2>
    <p class="text-[11px] text-[var(--color-dark-muted)] mb-3 font-medium">Auto-logged when billing day arrives.</p>
    <div class="space-y-3 mb-4">
      <input
        type="text"
        bind:value={apName}
        placeholder="Name (e.g. Netflix, WiFi)"
        class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 px-4
               text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
        style="touch-action: auto;"
      />
      <div class="flex gap-3">
        <div class="relative flex-[2]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-dark-muted)] font-semibold text-sm">₹</span>
          <input type="number" bind:value={apAmount} placeholder="Amount"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-7 pr-3
                   text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)]"
            style="touch-action: auto;" />
        </div>
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-dark-muted)] font-semibold text-[11px] uppercase">Day</span>
          <input type="number" bind:value={apDay} min="1" max="31"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-11 pr-3
                   text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)]"
            style="touch-action: auto;" />
        </div>
      </div>
    </div>
    <button
      class="w-full bg-white text-black py-3 rounded-xl font-bold active:scale-95 transition-transform"
      onclick={addAutoPay}
    >
      Add Auto-Pay
    </button>
  </section>

  <!-- ── Active Auto-Pays ───────────────────────────────────────────── -->
  {#if $autoPays.length > 0}
    <section class="mb-6">
      <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-3 px-1">Active Auto-Pays</h2>
      <div class="space-y-3">
        {#each $autoPays as ap (ap.id)}
          <div class="flex items-center justify-between bg-[var(--color-dark-surface)] p-4 rounded-2xl border border-[var(--color-dark-border)]">
            <div>
              <p class="font-bold text-[15px] text-white">{ap.name}</p>
              <p class="text-xs text-[var(--color-dark-muted)] font-medium">Bills on the {ordinal(ap.billingDay)}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold text-white">₹{ap.amount.toLocaleString('en-IN')}</span>
              <button
                class="w-8 h-8 flex items-center justify-center text-[var(--color-accent-red)] active:scale-90 transition-transform"
                onclick={() => financeApi.removeAutoPay(ap.id)}
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── Data Management ────────────────────────────────────────────── -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-[var(--color-dark-muted)] uppercase tracking-wider mb-4">Data Management</h2>
    <div class="grid grid-cols-2 gap-3">
      <button
        class="flex flex-col items-center justify-center py-5 bg-[var(--color-dark-bg)] rounded-xl border border-dashed border-[var(--color-dark-border)] active:bg-[var(--color-dark-elevated)] transition-colors"
        onclick={() => financeApi.exportData()}
      >
        <Download class="w-6 h-6 mb-2 text-[var(--color-accent-blue)]" />
        <span class="text-[13px] font-semibold text-gray-300">Export JSON</span>
      </button>

      <button
        class="flex flex-col items-center justify-center py-5 bg-[var(--color-dark-bg)] rounded-xl border border-dashed border-[var(--color-dark-border)] active:bg-[var(--color-dark-elevated)] transition-colors"
        onclick={() => fileInput?.click()}
      >
        <Upload class="w-6 h-6 mb-2 text-[var(--color-accent-green)]" />
        <span class="text-[13px] font-semibold text-gray-300">Import JSON</span>
      </button>
      <input type="file" accept=".json" bind:this={fileInput} onchange={handleImport} class="hidden" />
    </div>
  </section>

</div>
