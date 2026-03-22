<script>
  import { onMount } from 'svelte';

  let theme = 'light';

  onMount(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    theme = savedTheme || systemTheme;
    document.documentElement.setAttribute('data-theme', theme);
  });

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
</script>

<button id="theme-toggle" on:click={toggleTheme} aria-label="Toggle System Theme">
  <div class="icon-container">
    {#if theme === 'dark'}
      <svg id="sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      </svg>
    {:else}
      <svg id="moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </svg>
    {/if}
  </div>
</button>

<style>
  #theme-toggle {
    background: var(--text-primary);
    color: var(--bg-color);
    border: none;
    padding: 0.75rem;
    border-radius: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    width: 48px;
    height: 48px;
  }

  #theme-toggle:active {
    transform: scale(0.9) rotate(5deg);
  }

  svg {
    stroke: var(--bg-color);
  }
</style>
