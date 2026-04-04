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

<div class="grid grid-cols-3 gap-2 p-4 bg-[var(--color-dark-surface)] rounded-t-3xl shadow-2xl pb-8 select-none touch-none">
  {#each keys as key}
    <button
      type="button"
      class="h-[58px] flex items-center justify-center text-3xl font-medium rounded-2xl
             bg-[var(--color-dark-elevated)] text-[#e4e4e7]
             active:bg-[var(--color-dark-border)] active:scale-95 transition-all duration-75
             border border-[var(--color-dark-border)] shadow-sm"
      onclick={() => handlePress(key)}
    >
      {#if key === 'delete'}
        <Delete class="w-7 h-7 text-[#e4e4e7]" />
      {:else}
        {key}
      {/if}
    </button>
  {/each}
</div>
