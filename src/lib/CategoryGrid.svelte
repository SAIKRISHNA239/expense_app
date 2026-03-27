<script lang="ts">
  import { CATEGORIES } from './store';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let disabled = false;

  const handleSelect = (category: string) => {
    if (disabled) return;
    dispatch('save', { category });
  };
</script>

<div class="flex overflow-x-auto no-scrollbar gap-3 py-4 px-4 mask-edges touch-pan-x">
  {#each CATEGORIES as category}
    <button
      type="button"
      disabled={disabled}
      class="whitespace-nowrap px-5 py-3 rounded-full text-[15px] font-semibold transition-all duration-150 active:scale-95
             bg-[var(--color-dark-surface)] text-[#F2F2F7] border border-[var(--color-dark-border)]
             disabled:opacity-50 disabled:active:scale-100 shadow-sm"
      on:click={() => handleSelect(category)}
    >
      {category}
    </button>
  {/each}
</div>

<style>
  /* Subtle fade on edges to indicate scrolling */
  .mask-edges {
    -webkit-mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
    mask-image: linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent);
  }
</style>
