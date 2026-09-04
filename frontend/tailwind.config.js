/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sentinel: {
          bg: '#F0FDF4',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          cardSubtle: '#F0FDF4',
          border: '#CCFBF1',
          borderFocused: '#0F766E',
          primary: '#0F766E',        /* Institutional Teal */
          primaryHover: '#0D645D',
          primaryLight: '#2DD4BF',
          primaryDark: '#115E59',
          secondary: '#0D9488',
          accent: '#14B8A6',
          textPrimary: '#064E3B',    /* 9.8:1 contrast */
          textSecondary: '#374151',  /* 7.1:1 contrast */
          textMuted: '#64748B',
          textDark: '#022C22',
          warning: '#D97706',
          danger: '#DC2626',
          success: '#15803D'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'teal-gradient': 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
        'surface-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-teal': 'glowTeal 2s ease-in-out infinite alternate',
        'glow-amber': 'glowAmber 2s ease-in-out infinite alternate',
        'glow-red': 'glowRed 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glowTeal: {
          '0%': { boxShadow: '0 0 12px rgba(15, 118, 110, 0.2)' },
          '100%': { boxShadow: '0 0 35px rgba(15, 118, 110, 0.55)' },
        },
        glowAmber: {
          '0%': { boxShadow: '0 0 10px rgba(245, 158, 11, 0.25)' },
          '100%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)' },
        },
        glowRed: {
          '0%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)' },
          '100%': { boxShadow: '0 0 40px rgba(239, 68, 68, 0.75)' },
        }
      }
    },
  },
  plugins: [],
}
