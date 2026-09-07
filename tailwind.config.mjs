/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#22C55E',
          neon:  '#39FF14',
          dark:  '#0F172A',
        }
      },
      boxShadow: {
        'neon-sm':  '0 0 8px rgba(34, 197, 94, 0.35)',
        'neon-md':  '0 0 18px rgba(34, 197, 94, 0.55)',
        'neon-lg':  '0 0 32px rgba(34, 197, 94, 0.7), 0 0 64px rgba(34, 197, 94, 0.25)',
        'neon-red': '0 0 18px rgba(239, 68, 68, 0.6)',
      },
      animation: {
        // Existing
        'shimmer':    'shimmer 1.5s infinite',
        'dot-pulse':  'dotPulse 1.5s infinite',

        // NEW — Loot Pulse: slow, breathy scale + shadow (3.5s, feels alive not frantic)
        'pulse-glow': 'pulseGlow 3.5s ease-in-out infinite',

        // NEW — Neon hover transition helper (used with group-hover)
        'neon-enter': 'neonEnter 0.4s cubic-bezier(0, 0, 0.2, 1) forwards',

        // NEW — Loot badge pulse (red variant, slightly faster=urgency without being obnoxious)
        'loot-pulse': 'lootPulse 2.8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        dotPulse: {
          '0%':   { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
          '70%':  { transform: 'scale(1)',    boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
        },

        // ── Pulse Glow: scale 1→1.04 + shadow breathes in/out ──
        pulseGlow: {
          '0%':   { transform: 'scale(1)',    boxShadow: '0 0 0px rgba(34, 197, 94, 0)' },
          '50%':  { transform: 'scale(1.04)', boxShadow: '0 0 20px rgba(34, 197, 94, 0.55), 0 0 40px rgba(34, 197, 94, 0.2)' },
          '100%': { transform: 'scale(1)',    boxShadow: '0 0 0px rgba(34, 197, 94, 0)' },
        },

        // ── Neon Enter: shadow fades in on hover ──
        neonEnter: {
          '0%':   { boxShadow: '0 0 0px rgba(34, 197, 94, 0)' },
          '100%': { boxShadow: '0 0 24px rgba(34, 197, 94, 0.65), 0 0 48px rgba(34, 197, 94, 0.2)' },
        },

        // ── Loot Pulse: red glow for urgent/loot cards ──
        lootPulse: {
          '0%':   { boxShadow: '0 0 0px rgba(239, 68, 68, 0)' },
          '50%':  { boxShadow: '0 0 18px rgba(239, 68, 68, 0.6), 0 0 36px rgba(239, 68, 68, 0.2)' },
          '100%': { boxShadow: '0 0 0px rgba(239, 68, 68, 0)' },
        },
      }
    },
  },
  plugins: [],
}
