<script lang="ts">
  import LogView from './lib/LogView.svelte';
  import DashboardView from './lib/DashboardView.svelte';
  import ManageView from './lib/ManageView.svelte';
  import { Calculator, LayoutDashboard, Settings } from 'lucide-svelte';

  type Tab = 'log' | 'dashboard' | 'manage';
  let activeTab: Tab = 'log';

  const setTab = (tab: Tab) => {
    activeTab = tab;
  };
</script>

<main class="h-screen w-full max-w-md mx-auto flex flex-col relative bg-[var(--color-dark-bg)] overflow-hidden font-sans">
  
  <!-- Main Content Area -->
  <div class="flex-1 overflow-hidden relative">
    {#if activeTab === 'log'}
      <LogView />
    {:else if activeTab === 'dashboard'}
      <DashboardView />
    {:else if activeTab === 'manage'}
      <ManageView />
    {/if}
  </div>

  <!-- Bottom Navigation Bar -->
  <nav class="flex-none pb-[env(safe-area-inset-bottom)] bg-[var(--color-dark-surface)] border-t border-[var(--color-dark-border)] z-50">
    <div class="flex justify-around items-center h-16 px-2">
      
      <button 
        class="flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors {activeTab === 'log' ? 'text-[var(--color-accent-blue)]' : 'text-gray-500 hover:text-gray-400'}"
        on:click={() => setTab('log')}
      >
        <Calculator class="w-6 h-6 {activeTab === 'log' ? 'fill-[var(--color-accent-blue)]/20' : ''}" />
        <span class="text-[10px] font-semibold tracking-wide">Log</span>
      </button>

      <button 
        class="flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors {activeTab === 'dashboard' ? 'text-[var(--color-accent-blue)]' : 'text-gray-500 hover:text-gray-400'}"
        on:click={() => setTab('dashboard')}
      >
        <LayoutDashboard class="w-6 h-6 {activeTab === 'dashboard' ? 'fill-[var(--color-accent-blue)]/20' : ''}" />
        <span class="text-[10px] font-semibold tracking-wide">Dashboard</span>
      </button>

      <button 
        class="flex-1 h-full flex flex-col items-center justify-center gap-1 transition-colors {activeTab === 'manage' ? 'text-[var(--color-accent-blue)]' : 'text-gray-500 hover:text-gray-400'}"
        on:click={() => setTab('manage')}
      >
        <Settings class="w-6 h-6 {activeTab === 'manage' ? 'fill-[var(--color-accent-blue)]/20' : ''}" />
        <span class="text-[10px] font-semibold tracking-wide">Manage</span>
      </button>

    </div>
  </nav>

</main>
