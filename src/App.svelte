<script lang="ts">
  import LogView from './lib/LogView.svelte';
  import DashboardView from './lib/DashboardView.svelte';
  import ManageView from './lib/ManageView.svelte';
  import HistoryView from './lib/HistoryView.svelte';
  import { Calculator, LayoutDashboard, Settings, ClockArrowUp } from 'lucide-svelte';

  type Tab = 'log' | 'dashboard' | 'history' | 'manage';
  let activeTab = $state<Tab>('log');
</script>

<main class="h-screen w-full max-w-md mx-auto flex flex-col relative bg-[var(--color-dark-bg)] overflow-hidden font-sans">

  <!-- Main Content Area -->
  <div class="flex-1 overflow-hidden relative flex flex-col">
    {#if activeTab === 'log'}
      <LogView />
    {:else if activeTab === 'dashboard'}
      <DashboardView />
    {:else if activeTab === 'history'}
      <HistoryView />
    {:else if activeTab === 'manage'}
      <ManageView />
    {/if}
  </div>

  <!-- Floating Bottom Navigation Bar -->
  <nav class="absolute bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm rounded-[2rem] bg-[#0b0c10]/70 backdrop-blur-2xl border border-white/10 p-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.8)] z-50">
    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-emerald-500/10 rounded-[2rem] pointer-events-none -z-10"></div>
    <div class="flex justify-around items-center h-[64px]">

      <button
        class="relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl {activeTab === 'log' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}"
        onclick={() => activeTab = 'log'}
      >
        <Calculator class="w-5 h-5 transition-transform duration-300 {activeTab === 'log' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}" />
        <span class="text-[9px] font-bold tracking-widest uppercase mt-0.5">Log</span>
      </button>

      <button
        class="relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl {activeTab === 'dashboard' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}"
        onclick={() => activeTab = 'dashboard'}
      >
        <LayoutDashboard class="w-5 h-5 transition-transform duration-300 {activeTab === 'dashboard' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}" />
        <span class="text-[9px] font-bold tracking-widest uppercase mt-0.5">Dash</span>
      </button>

      <button
        class="relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl {activeTab === 'history' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}"
        onclick={() => activeTab = 'history'}
      >
        <ClockArrowUp class="w-5 h-5 transition-transform duration-300 {activeTab === 'history' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}" />
        <span class="text-[9px] font-bold tracking-widest uppercase mt-0.5">Hist</span>
      </button>

      <button
        class="relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300 rounded-2xl {activeTab === 'manage' ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}"
        onclick={() => activeTab = 'manage'}
      >
        <Settings class="w-5 h-5 transition-transform duration-300 {activeTab === 'manage' ? 'scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]' : ''}" />
        <span class="text-[9px] font-bold tracking-widest uppercase mt-0.5">Set</span>
      </button>

    </div>
  </nav>

</main>
