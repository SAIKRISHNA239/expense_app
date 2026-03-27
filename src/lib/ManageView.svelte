<script lang="ts">
  import { financeApi, monthlyIncome, fixedCosts, DEFAULT_FIXED_CATEGORIES } from './store';
  import { Settings, Save, Trash2, Download, Upload } from 'lucide-svelte';

  // Income State
  let incomeInput = $monthlyIncome.toString();

  // Fixed Cost Form State
  let fcName = '';
  let fcAmount = '';
  let fcDay = '1';
  let fcCategory = DEFAULT_FIXED_CATEGORIES[0];

  let fileInput: HTMLInputElement;

  const saveIncome = () => {
    const val = parseFloat(incomeInput);
    if (!isNaN(val) && val >= 0) {
      financeApi.setIncome(val);
      incomeInput = val.toString(); // clean format
    }
  };

  const addFixedCost = () => {
    const amt = parseFloat(fcAmount);
    const day = parseInt(fcDay);
    if (fcName.trim() && !isNaN(amt) && amt > 0 && !isNaN(day) && day >= 1 && day <= 31) {
      financeApi.addFixedCost(fcName.trim(), amt, day, fcCategory);
      fcName = '';
      fcAmount = '';
      fcDay = '1';
    }
  };

  const handleImport = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = financeApi.importData(content);
      if (success) {
        alert("Data imported successfully!");
      } else {
        alert("Failed to import. Invalid file format.");
      }
    };
    reader.readAsText(file);
    // Reset input
    target.value = '';
  };
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24 text-[#F2F2F7]">
  
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center border border-[var(--color-dark-border)]">
      <Settings class="w-5 h-5 text-gray-300" />
    </div>
    <h1 class="text-2xl font-black tracking-tight text-white">Manage</h1>
  </div>

  <!-- Monthly Income Section -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 shadow-sm border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Monthly Income</h2>
    <div class="flex gap-3">
      <div class="relative flex-1">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
        <input 
          type="number" 
          bind:value={incomeInput} 
          class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
          placeholder="0"
        />
      </div>
      <button 
        class="bg-[var(--color-accent-blue)] text-white px-5 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center"
        on:click={saveIncome}
      >
        <Save class="w-5 h-5" />
      </button>
    </div>
  </section>

  <!-- Fixed Costs Setup -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 shadow-sm border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add Fixed Cost</h2>
    <div class="space-y-3 mb-4">
      <input 
        type="text" 
        bind:value={fcName} 
        placeholder="Cost Name (e.g. Netflix)"
        class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 px-4 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
      />
      <div class="flex gap-3">
        <div class="relative flex-[2]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
          <input 
            type="number" 
            bind:value={fcAmount} 
            placeholder="Amount"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-7 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
          />
        </div>
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">Day</span>
          <input 
            type="number" 
            bind:value={fcDay} 
            min="1" max="31"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-11 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
          />
        </div>
      </div>
      <select 
        bind:value={fcCategory}
        class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 px-4 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] appearance-none text-[15px]"
      >
        {#each DEFAULT_FIXED_CATEGORIES as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>
    <button 
      class="w-full bg-white text-black py-3 rounded-xl font-bold active:scale-95 transition-transform"
      on:click={addFixedCost}
    >
      Add Fixed Cost
    </button>
  </section>

  <!-- Active Fixed Costs List -->
  {#if $fixedCosts.length > 0}
    <section class="mb-8">
      <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Active Fixed Costs</h2>
      <div class="space-y-3">
        {#each $fixedCosts as cost (cost.id)}
          <div class="flex items-center justify-between bg-[var(--color-dark-surface)] p-4 rounded-2xl shadow-sm border border-[var(--color-dark-border)]">
            <div class="flex flex-col">
              <span class="font-bold text-[15px]">{cost.name}</span>
              <span class="text-xs text-gray-400 font-medium">Billed on day {cost.billingDay} • {cost.category}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold tracking-tight">₹{cost.amount}</span>
              <button 
                class="w-8 h-8 flex items-center justify-center relative -right-1 text-[var(--color-accent-red)] active:scale-90 transition-transform"
                on:click={() => financeApi.removeFixedCost(cost.id)}
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Data Management -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 shadow-sm border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">Data Management</h2>
    <div class="grid grid-cols-2 gap-3">
      <button 
        class="flex flex-col items-center justify-center py-4 bg-[var(--color-dark-bg)] rounded-xl border border-[var(--color-dark-border)] border-dashed active:bg-[var(--color-dark-border)] transition-colors"
        on:click={() => financeApi.exportData()}
      >
        <Download class="w-6 h-6 mb-2 text-[var(--color-accent-blue)]" />
        <span class="text-[13px] font-semibold text-gray-300">Export JSON</span>
      </button>
      
      <button 
        class="flex flex-col items-center justify-center py-4 bg-[var(--color-dark-bg)] rounded-xl border border-[var(--color-dark-border)] border-dashed active:bg-[var(--color-dark-border)] transition-colors"
        on:click={() => fileInput.click()}
      >
        <Upload class="w-6 h-6 mb-2 text-[var(--color-accent-green)]" />
        <span class="text-[13px] font-semibold text-gray-300">Import JSON</span>
      </button>
      <!-- Hidden File Input for import -->
      <input type="file" accept=".json" bind:this={fileInput} on:change={handleImport} class="hidden" />
    </div>
  </section>

</div>
