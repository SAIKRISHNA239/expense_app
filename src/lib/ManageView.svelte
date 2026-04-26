<script lang="ts">
  import { financeApi, budgetState, autoPays, categories, transactions } from './store';
  import { Settings, Save, Trash2, Download, Upload, Plus, Tag, TriangleAlert } from 'lucide-svelte';

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

  // Category removal modal
  let showCategoryModal = $state(false);
  let categoryToRemove = $state('');
  let replacementCategory = $state('');
  let affectedTxsCount = $state(0);

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

  const initiateRemoveCategory = (cat: string) => {
    const affected = $transactions.filter(t => t.category === cat).length;
    if (affected > 0) {
      categoryToRemove = cat;
      affectedTxsCount = affected;
      replacementCategory = $categories.filter(c => c !== cat)[0] || 'Misc';
      showCategoryModal = true;
    } else {
      financeApi.removeCategory(cat);
    }
  };

  const confirmRemoveCategory = () => {
    financeApi.removeCategory(categoryToRemove, replacementCategory);
    showCategoryModal = false;
    categoryToRemove = '';
  };

  const ordinal = (n: number) =>
    n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 pt-6 pb-32 h-full text-[#e4e4e7]">

  <!-- Header -->
  <div class="flex items-center gap-3 mb-8 pt-2">
    <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
      <Settings class="w-6 h-6 text-zinc-300" />
    </div>
    <h1 class="text-[28px] font-black tracking-tighter text-white">Manage</h1>
  </div>

  <!-- ── Budget Variables ────────────────────────────────────────────── -->
  <section class="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
    <div class="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none -z-10"></div>
    <h2 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Global Math Variables</h2>
    <div class="space-y-4">
      <div class="flex flex-col">
        <label class="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Assumed Monthly Income</label>
        <div class="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
          <input type="number" bind:value={incomeInput}
            class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <div class="flex flex-col">
        <label class="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Budget Cap (for chart scaling)</label>
        <div class="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
          <input type="number" bind:value={budgetInput}
            class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <div class="flex flex-col">
        <label class="text-[10px] font-black text-white/50 uppercase tracking-wider mb-1.5 ml-1">Initial Rollover</label>
        <div class="relative group-focus-within:drop-shadow-[0_0_12px_rgba(59,130,246,0.2)] transition-shadow">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
          <input type="number" bind:value={rolloverInput}
            class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 pl-9 pr-3 text-white font-bold focus:outline-none focus:border-blue-500/50 focus:bg-[#0b0c10] transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>

      <button
        class="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 py-3 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 shadow-inner hover:bg-blue-500/20"
        onclick={saveBudgetSettings}
      >
        <Save class="w-4 h-4" /> Save Variables
      </button>
    </div>
  </section>

  <!-- ── Categories CRUD ────────────────────────────────────────────── -->
  <section class="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden group">
    <div class="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none -z-10"></div>
    <div class="flex items-center gap-2 mb-4">
      <Tag class="w-4 h-4 text-zinc-500" />
      <h2 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Expense Categories</h2>
    </div>

    <!-- Existing categories -->
    <div class="flex flex-wrap gap-2.5 mb-5">
      {#each $categories as cat}
        <div class="flex items-center gap-1.5 bg-white/5 border border-white/5 shadow-inner rounded-full px-3.5 py-1.5">
          <span class="text-[13px] font-bold text-white tracking-tight">{cat}</span>
          <button
            class="text-rose-500 ml-0.5 hover:text-white hover:bg-rose-500/80 rounded-full p-1 active:scale-75 transition-all"
            onclick={() => initiateRemoveCategory(cat)}
            aria-label="Remove {cat}"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      {/each}
    </div>

    <!-- Inline prompt for category removal migration -->
    {#if showCategoryModal}
      <div class="bg-rose-500/5 p-4 rounded-xl mb-5 border border-rose-500/10 shadow-inner">
        <p class="text-[13px] text-white mb-3 font-semibold leading-relaxed">This category is used in <span class="text-rose-400 font-bold">{affectedTxsCount}</span> transactions. Reassign them to:</p>
        <div class="flex flex-col sm:flex-row gap-2">
          <select bind:value={replacementCategory} class="flex-1 bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-lg py-2.5 px-3 text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors">
            {#each $categories.filter(c => c !== categoryToRemove) as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>
          <button onclick={confirmRemoveCategory} class="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-4 py-2.5 rounded-lg font-bold active:scale-95 transition-all w-full sm:w-auto text-[13px]">Apply & Delete</button>
          <button onclick={() => showCategoryModal = false} class="bg-white/5 text-white border border-white/5 px-4 py-2.5 rounded-lg font-bold active:scale-95 transition-all w-full sm:w-auto text-[13px]">Cancel</button>
        </div>
      </div>
    {/if}

    <!-- Add category -->
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newCategory}
        placeholder="New category name"
        class="flex-1 bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3 px-4
               text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors text-[14px]"
        style="touch-action: auto;"
        onkeydown={e => e.key === 'Enter' && handleAddCategory()}
      />
      <button
        class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:bg-blue-500/20"
        onclick={handleAddCategory}
      >
        <Plus class="w-5 h-5" />
      </button>
    </div>
    {#if catError}
      <p class="text-rose-400 text-xs mt-2.5 font-bold tracking-wide">{catError}</p>
    {/if}
  </section>

  <!-- ── Add Auto-Pay ───────────────────────────────────────────────── -->
  <section class="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
    <h2 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Add Auto-Pay</h2>
    <p class="text-[11px] text-zinc-500/70 mb-4 font-bold tracking-wide">Auto-logged when billing day arrives.</p>
    <div class="space-y-3 mb-5">
      <input
        type="text"
        bind:value={apName}
        placeholder="Name (e.g. Netflix)"
        class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 px-4
               text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
        style="touch-action: auto;"
      />
      <div class="flex gap-3 relative">
        <div class="relative flex-[2]">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
          <input type="number" bind:value={apAmount} placeholder="Amount"
            class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 pl-9 pr-4
                   text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
            style="touch-action: auto;" />
        </div>
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-[9px] uppercase tracking-widest">Day</span>
          <input type="number" bind:value={apDay} min="1" max="31"
            class="w-full bg-[#0b0c10]/80 shadow-inner border border-white/5 rounded-xl py-3.5 pl-11 pr-3
                   text-white font-bold focus:outline-none focus:border-blue-500/50 transition-colors"
            style="touch-action: auto;" />
        </div>
      </div>
    </div>
    <button
      class="w-full bg-white/5 text-white border border-white/10 py-3.5 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all shadow-inner hover:bg-white/10"
      onclick={addAutoPay}
    >
      Save Auto-Pay Rule
    </button>
  </section>

  <!-- ── Active Auto-Pays ───────────────────────────────────────────── -->
  {#if $autoPays.length > 0}
    <section class="mb-8">
      <h2 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-1">Active Auto-Pays</h2>
      <div class="space-y-3">
        {#each $autoPays as ap (ap.id)}
          <div class="flex items-center justify-between bg-[#111216]/80 backdrop-blur-xl p-4 rounded-[1.2rem] border border-white/5 shadow-lg group">
            <div>
              <p class="font-bold text-[15px] text-white tracking-tight">{ap.name}</p>
              <p class="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Bills on the {ordinal(ap.billingDay)}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-black text-rose-400">₹{ap.amount.toLocaleString('en-IN')}</span>
              <button
                class="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full border border-white/5 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 active:scale-90 transition-all"
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
  <section class="bg-[#111216]/80 backdrop-blur-xl rounded-[1.5rem] p-5 mb-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
    <div class="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none -z-10"></div>
    <h2 class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Data Management</h2>
    <div class="grid grid-cols-2 gap-3">
      <button
        class="flex flex-col items-center justify-center py-6 bg-white/5 rounded-[1.2rem] border border-transparent hover:border-white/10 active:bg-white/10 transition-all shadow-inner"
        onclick={() => financeApi.exportData()}
      >
        <Download class="w-7 h-7 mb-2.5 text-blue-400" />
        <span class="text-[12px] font-bold text-zinc-300">Export JSON</span>
      </button>

      <button
        class="flex flex-col items-center justify-center py-6 bg-white/5 rounded-[1.2rem] border border-transparent hover:border-white/10 active:bg-white/10 transition-all shadow-inner"
        onclick={() => fileInput?.click()}
      >
        <Upload class="w-7 h-7 mb-2.5 text-emerald-400" />
        <span class="text-[12px] font-bold text-zinc-300">Import JSON</span>
      </button>
      <input type="file" accept=".json" bind:this={fileInput} onchange={handleImport} class="hidden" />
    </div>
  </section>

  <!-- ── Danger Zone ──────────────────────────────────────────────── -->
  <section class="bg-rose-950/20 backdrop-blur-xl rounded-[1.5rem] p-5 border border-rose-900/50 shadow-2xl">
    <div class="flex items-center gap-2 mb-3">
      <TriangleAlert class="w-5 h-5 text-rose-500" />
      <h2 class="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Danger Zone</h2>
    </div>
    <p class="text-[11px] text-zinc-400 mb-5 font-bold leading-relaxed pr-4">Permanently wipe all transactions, preferences, and auto-pay limits. This cannot be undone.</p>
    <button
      class="w-full py-4 rounded-xl border border-rose-900/80 bg-rose-500/10 text-rose-500 font-bold tracking-widest uppercase text-[12px] shadow-inner hover:bg-rose-500/20 active:scale-[0.98] transition-all"
      onclick={() => {
        if (confirm('Are you absolutely sure you want to nuke all your data? This is permanent.')) {
           financeApi.factoryReset();
           window.location.reload();
        }
      }}
    >
      Factory Reset Data
    </button>
  </section>

</div>
