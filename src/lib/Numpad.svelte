<script lang="ts">
  import { Delete } from 'lucide-svelte';

  export let amountStr: string = '';

  const handlePress = (key: string) => {
    if (key === 'delete') {
      amountStr = amountStr.slice(0, -1);
    } else {
      // Prevent leading zero unless followed by dot
      if (amountStr === '0' && key !== '.') {
        amountStr = key;
      } else {
        // Prevent multiple dots
        if (key === '.' && amountStr.includes('.')) return;
        
        // Start with 0. if dot pressed first
        if (key === '.' && amountStr === '') {
            amountStr = '0.';
        } else {
            amountStr += key;
        }
      }
    }
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'delete'
  ];
</script>

<div class="grid grid-cols-3 gap-3 p-4 bg-[var(--color-dark-surface)] rounded-t-3xl shadow-2xl pb-8 select-none touch-none">
  {#each keys as key}
    <button
      type="button"
      class="h-16 flex items-center justify-center text-3xl font-medium rounded-2xl bg-[var(--color-dark-bg)] text-[#F2F2F7] active:bg-[var(--color-dark-border)] active:scale-95 transition-all duration-75 border-b border-[var(--color-dark-border)] shadow-sm"
      on:click={() => handlePress(key)}
    >
      {#if key === 'delete'}
        <Delete class="w-8 h-8 text-[#F2F2F7]" />
      {:else}
        {key}
      {/if}
    </button>
  {/each}
</div>
