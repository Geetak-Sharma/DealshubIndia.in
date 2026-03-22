<script>
    export let deals = [];

    // Fallback if API is empty
    const fallback = [
        "🔥 Join DealsHub Telegram for Live Drops",
        "⚡ Massive Loots Unlocked Every Hour",
        "💥 Never Pay Full MRP Again!",
        "🚀 Fast Alerts, Big Savings"
    ];

    // Format deals into 1 liner punch-strings
    const displayDeals = deals && deals.length > 0 
        ? deals.map(d => `${d.badge ? d.badge : '🔥'} ${d.title} ${d.price ? '[' + d.price + ']' : ''}`)
        : fallback;

    // Multiply significantly to prevent gap loops on ultra-wide screens
    let duplicatedDeals = [...displayDeals, ...displayDeals, ...displayDeals, ...displayDeals, ...displayDeals];
</script>

<div class="loot-ticker-container">
    <div class="ticker-wrapper">
        <div class="ticker-content">
            {#each duplicatedDeals as deal}
                <span class="deal-item">{deal} <span class="dot-separator">•</span></span>
            {/each}
        </div>
    </div>
</div>

<style>
    .loot-ticker-container {
        width: 100%;
        background-color: var(--surface-color);
        color: var(--text-primary);
        padding: 0.6rem 0;
        overflow: hidden;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-color);
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 0.05em;
        opacity: 0.75;
        transition: opacity 0.2s ease;
        cursor: default;
    }

    .loot-ticker-container:hover {
        opacity: 1;
    }

    .ticker-wrapper {
        display: flex;
        overflow: hidden;
    }

    .ticker-content {
        display: flex;
        white-space: nowrap;
        animation: scroll 60s linear infinite;
    }

    .ticker-content:hover {
        animation-play-state: paused;
    }

    .deal-item {
        padding: 0 1.5rem;
        display: inline-flex;
        align-items: center;
        gap: 1.5rem;
    }
    
    .dot-separator {
        color: var(--border-color);
        font-weight: black;
    }

    @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
    }
</style>
