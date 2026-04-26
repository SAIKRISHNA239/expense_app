<script lang="ts">
  import { Delete } from 'lucide-svelte';

  let { amountStr = $bindable('') } = $props<{ amountStr: string }>();

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'];

  const handlePress = (key: string) => {
    if (key === 'delete') {
      amountStr = amountStr.slice(0, -1);
    } else if (key === '.') {
      if (amountStr.includes('.')) return;
      amountStr = amountStr === '' ? '0.' : amountStr + '.';
    } else {
      amountStr = amountStr === '0' ? key : amountStr + key;
    }
  };
</script>

<div class="grid grid-cols-3 gap-2 px-5 pt-4 pb-32 bg-[#0b0c10]/95 backdrop-blur-3xl rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] border-t border-white/5 select-none touch-none relative z-20">
  <!-- Subtle glowing underlay for numpad -->
  <div class="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none rounded-t-[2.5rem]"></div>

  {#each keys as key}
    <button
      type="button"
      class="h-[64px] flex items-center justify-center text-[32px] font-medium rounded-[1.2rem] relative overflow-hidden group
             bg-transparent text-white
             active:scale-[0.92] transition-all duration-75
             border border-transparent active:border-white/10 active:bg-white/10 border-white/5 shadow-inner"
      onclick={() => handlePress(key)}
    >
      {#if key === 'delete'}
        <Delete class="w-8 h-8 text-zinc-400 group-active:text-white transition-colors" />
      {:else}
        {key}
      {/if}
    </button>
  {/each}
</div>
