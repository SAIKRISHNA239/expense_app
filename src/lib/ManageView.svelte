<script lang="ts">
  import { financeApi, budgetState, autoPays } from './store';
  import { Settings, Save, Trash2, Download, Upload } from 'lucide-svelte';

  // Budget State Form
  let incomeInput = $budgetState.monthlyIncome.toString();
  let budgetInput = $budgetState.baseBudget.toString();
  let rolloverInput = $budgetState.rolloverAmount.toString();

  // Auto-Pay Form
  let apName = '';
  let apAmount = '';
  let apDay = '1';

  let fileInput: HTMLInputElement;

  const saveBudgetSettings = () => {
    const inc = parseFloat(incomeInput) || 0;
    const bud = parseFloat(budgetInput) || 0;
    const rol = parseFloat(rolloverInput) || 0;
    
    financeApi.updateBudget(inc, bud, rol);
    incomeInput = inc.toString();
    budgetInput = bud.toString();
    rolloverInput = rol.toString();
  };

  const addAutoPay = () => {
    const amt = parseFloat(apAmount);
    const day = parseInt(apDay);
    if (apName.trim() && !isNaN(amt) && amt > 0 && !isNaN(day) && day >= 1 && day <= 31) {
      financeApi.addAutoPay(apName.trim(), amt, day);
      apName = '';
      apAmount = '';
      apDay = '1';
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
        alert("V3 Data imported successfully!");
      } else {
        alert("Failed to import. Invalid file format.");
      }
    };
    reader.readAsText(file);
    target.value = '';
  };
</script>

<div class="flex-1 overflow-y-auto no-scrollbar px-5 py-6 h-full pb-24 text-[#F2F2F7]">
  
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-full bg-[var(--color-dark-surface)] flex items-center justify-center border border-[var(--color-dark-border)]">
      <Settings class="w-5 h-5 text-gray-300" />
    </div>
    <h1 class="text-2xl font-black tracking-tight text-white">Manage & Automation</h1>
  </div>

  <!-- Budget State Settings -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 shadow-sm border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3">Global Math Variables</h2>
    <div class="space-y-3">
      
      <!-- Income -->
      <div class="flex flex-col">
        <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 ml-1">Assumed Monthly Income</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
          <input 
            type="number" 
            bind:value={incomeInput} 
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
          />
        </div>
      </div>

      <!-- Base Budget -->
      <div class="flex flex-col">
          <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 ml-1">Theoretical Base Budget Cap</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
            <input 
              type="number" 
              bind:value={budgetInput} 
              class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
              placeholder="(Used for chart scaling)"
            />
          </div>
      </div>

      <!-- Rollover Base Offset -->
      <div class="flex flex-col mb-4">
        <label class="text-[11px] font-bold text-gray-500 uppercase mb-1 ml-1">Initial Rollover Surplus/Deficit</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
          <input 
            type="number" 
            bind:value={rolloverInput} 
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-2 pl-8 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors"
          />
        </div>
      </div>

      <button 
        class="w-full bg-[var(--color-accent-blue)] text-white py-2.5 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
        on:click={saveBudgetSettings}
      >
        <Save class="w-4 h-4" /> Save Variables
      </button>

    </div>
  </section>

  <!-- Auto-Pays Setup -->
  <section class="bg-[var(--color-dark-surface)] rounded-2xl p-5 mb-6 shadow-sm border border-[var(--color-dark-border)]">
    <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Auto-Pay Subscription</h2>
    <p class="text-[11px] text-gray-500 mb-3 font-medium">Billed automatically on the specified day.</p>
    <div class="space-y-3 mb-4">
      <input 
        type="text" 
        bind:value={apName} 
        placeholder="Name (e.g. Netflix, Wifi)"
        class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 px-4 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
      />
      <div class="flex gap-3">
        <div class="relative flex-[2]">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
          <input 
            type="number" 
            bind:value={apAmount} 
            placeholder="Amount"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-7 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
          />
        </div>
        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[11px] uppercase tracking-wider">Day</span>
          <input 
            type="number" 
            bind:value={apDay} 
            min="1" max="31"
            class="w-full bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] rounded-xl py-3 pl-11 pr-3 text-white font-semibold focus:outline-none focus:border-[var(--color-accent-blue)] transition-colors text-[15px]"
          />
        </div>
      </div>
    </div>
    <button 
      class="w-full bg-white text-black py-3 rounded-xl font-bold active:scale-95 transition-transform"
      on:click={addAutoPay}
    >
      Add Auto-Pay
    </button>
  </section>

  <!-- Active Auto-Pays List -->
  {#if $autoPays.length > 0}
    <section class="mb-8">
      <h2 class="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Active Auto-Pays</h2>
      <div class="space-y-3">
        {#each $autoPays as ap (ap.id)}
          <div class="flex items-center justify-between bg-[var(--color-dark-surface)] p-4 rounded-2xl shadow-sm border border-[var(--color-dark-border)]">
            <div class="flex flex-col">
              <span class="font-bold text-[15px] text-white">{ap.name}</span>
              <span class="text-xs text-gray-400 font-medium">Billed on the {ap.billingDay}{#if ap.billingDay===1}st{:else if ap.billingDay===2}nd{:else if ap.billingDay===3}rd{:else}th{/if}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold tracking-tight text-white">₹{ap.amount}</span>
              <button 
                class="w-8 h-8 flex items-center justify-center relative -right-1 text-[var(--color-accent-red)] active:scale-90 transition-transform"
                on:click={() => financeApi.removeAutoPay(ap.id)}
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
        class="flex flex-col items-center justify-center py-4 bg-[var(--color-dark-bg)] rounded-xl border border-[var(--color-dark-border)] border-dashed active:bg-[var(--color-dark-border)] transition-colors cursor-pointer"
        on:click={() => financeApi.exportData()}
      >
        <Download class="w-6 h-6 mb-2 text-[var(--color-accent-blue)]" />
        <span class="text-[13px] font-semibold text-gray-300">Export JSON</span>
      </button>
      
      <button 
        class="flex flex-col items-center justify-center py-4 bg-[var(--color-dark-bg)] rounded-xl border border-[var(--color-dark-border)] border-dashed active:bg-[var(--color-dark-border)] transition-colors cursor-pointer"
        on:click={() => fileInput.click()}
      >
        <Upload class="w-6 h-6 mb-2 text-[var(--color-accent-green)]" />
        <span class="text-[13px] font-semibold text-gray-300">Import JSON</span>
      </button>
      <input type="file" accept=".json" bind:this={fileInput} on:change={handleImport} class="hidden" />
    </div>
  </section>

</div>
