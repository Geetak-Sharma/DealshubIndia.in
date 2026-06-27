<script>
  export let items = [];

  // Helper to get secondary color for backgrounds
  function getGlassBg(color) {
    return `rgba(${hexToRgb(color)}, 0.08)`;
  }

  function hexToRgb(hex) {
    if (!hex) return "255, 255, 255";
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      "255, 255, 255";
  }
</script>

<section class="bento-container">
  <div class="bento-grid">
    {#each items as item}
      <a 
        href={item.href} 
        target="_blank" 
        rel="noopener noreferrer" 
        class="bento-card {item.type}"
        style="--accent-rgb: {hexToRgb(item.color)}; --accent-color: {item.color};"
        on:click={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); }}
        on:mousemove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }}
      >
        <div class="card-glass"></div>
        <div class="card-content">
          <div class="top-row">
            <div class="icon-sphere" style="background: rgba(var(--accent-rgb), 0.12); color: var(--accent-color);">
              <div class="icon-inner">
                {@html item.icon}
              </div>
            </div>
            <div class="status-indicator">
              <span class="pulse-dot"></span>
              ACTIVE
            </div>
          </div>
          
          <div class="text-block">
            <h4 class="main-label">{item.label}</h4>
            <p class="description">{item.subText || 'Join our priority alert network'}</p>
          </div>

          <div class="footer-row">
            <span class="action-text">OPEN CHANNEL</span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      </a>
    {/each}
  </div>
</section>

<style>
  .bento-container {
    width: 100%;
    max-width: var(--container-max-width);
    margin: 24px auto;
  }

  .bento-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    width: 100%;
  }

  .bento-card {
    position: relative;
    background: hsla(189, 80%, 10%, 0.2);
    border: 1px solid hsla(189, 80%, 50%, 0.15);
    border-radius: 16px;
    overflow: hidden;
    padding: 24px;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    min-height: 240px;
    backdrop-filter: blur(12px) saturate(2.5) brightness(0.85);
    -webkit-backdrop-filter: blur(12px) saturate(2.5) brightness(0.85);
    background-image: radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(var(--accent-rgb), 0.15), transparent 80%);
  }

  /* Refraction Edge & Noise Overlay */
  .bento-card::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.04;
    z-index: 1;
  }

  .bento-card::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    box-shadow: 
      inset 0 1px 1px rgba(255, 255, 255, 0.1),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 -1px 2px rgba(0, 0, 0, 0.2);
    z-index: 2;
  }

  .card-glass {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top left, rgba(var(--accent-rgb), 0.15), transparent 70%);
    opacity: 0.2;
    transition: opacity 0.4s ease;
    z-index: 0;
  }

  .card-content {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Icons */
  .icon-sphere {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    transition: all 0.4s ease;
  }

  .icon-inner :global(svg) {
    width: 26px;
    height: 26px;
    stroke-width: 2.5;
  }

  /* Status Indicator */
  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
    color: var(--text-muted);
    letter-spacing: 0.5px;
    opacity: 0.7;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: #22C55E;
    border-radius: 50%;
    box-shadow: 0 0 8px #22C55E;
    animation: dotPulse 2s infinite;
  }

  @keyframes dotPulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* Text Content */
  .text-block {
    margin-top: auto;
    margin-bottom: 20px;
  }

  .main-label {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
  }

  .description {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
    font-weight: 500;
  }

  /* Footer */
  .footer-row {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
    opacity: 0.7;
    transition: all 0.3s ease;
  }

  .action-text {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.5px;
    color: var(--text-primary);
  }

  .chevron {
    transition: transform 0.3s ease;
  }

  /* Hover States */
  .bento-card:hover {
    transform: translateY(-8px);
    border-color: rgba(var(--accent-rgb), 0.3);
    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.5);
  }

  .bento-card:hover .card-glass { opacity: 1; }
  .bento-card:hover .icon-sphere { transform: scale(1.1); background: rgba(var(--accent-rgb), 0.2); }
  .bento-card:hover .footer-row { opacity: 1; color: var(--accent-color); }
  .bento-card:hover .chevron { transform: translateX(3px); }

  /* Breakpoints */
  @media (max-width: 1024px) {
    .bento-grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
  }

  @media (max-width: 640px) {
    .bento-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .bento-card { min-height: 180px; padding: 16px; }
    .main-label { font-size: 16px; }
    .status-indicator { font-size: 8px; }
    .icon-sphere { width: 40px; height: 40px; margin-bottom: 12px; }
    .icon-inner :global(svg) { width: 20px; height: 20px; }
  }

  @media (max-width: 400px) {
    .main-label { font-size: 14px; }
    .description { font-size: 11px; }
  }
</style>
