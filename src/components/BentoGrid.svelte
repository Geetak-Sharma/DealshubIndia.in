<script>
  export let items = [];
</script>

<section class="bento-grid">
  {#each items as item}
    <a 
      href={item.href} 
      target="_blank" 
      rel="noopener noreferrer" 
      class="bento-card {item.type}"
    >
      <div class="card-content">
        <div class="icon" style="color: {item.color}">
          {@html item.icon}
        </div>
        <div class="label">
          <span class="main-text">{item.label}</span>
          <span class="sub-text">{item.subText || 'Verified Deal →'}</span>
        </div>
      </div>
    </a>
  {/each}
</section>

<style>
  .bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--spacing-3);
    width: 100%;
    margin: 1rem 0;
  }

  .bento-card {
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    padding: 1.5rem;
    text-decoration: none;
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    justify-content: center;
    aspect-ratio: 1/1;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    text-align: left;
  }

  .bento-card:active {
    transform: scale(0.96);
  }

  .icon {
    margin-bottom: 1rem;
  }

  .main-text {
    display: block;
    font-size: 1.1rem;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 0.25rem;
  }

  .sub-text {
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Snap Animation */
  @media (max-width: 600px) {
    .bento-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
