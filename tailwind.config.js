/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Matrix terminal palette: near-black green surfaces, phosphor green accents.
        paper: { DEFAULT: '#010502', deep: '#061209' },
        surface: '#040C06',
        line: '#0F3319',
        ink: {
          DEFAULT: '#C9FFD5',
          muted: '#6FCF8A',
          subtle: '#3B7A4E',
        },
        primary: {
          50: '#03170A',
          100: '#062810',
          200: '#0B4A1D',
          300: '#13782F',
          400: '#1CB847',
          500: '#00E03A',
          600: '#00FF41',
          700: '#5CFF85',
          800: '#9DFFB4',
          900: '#D2FFDC',
        },
        secondary: {
          50: '#EAF7EE',
          100: '#CFE6D6',
          200: '#A9CDB4',
          300: '#7FAE8D',
          400: '#5C8D6B',
          500: '#446F51',
          600: '#30553C',
          700: '#213D2A',
          800: '#14271A',
          900: '#0A160E',
        },
        danger: {
          50: '#2A1715',
          200: '#5A2A24',
          500: '#E5735F',
          700: '#F09A88',
        },
        warning: {
          50: '#2A2010',
          200: '#5C4520',
          800: '#FCD9A0',
        },
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        display: ['"Share Tech Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Tighter corners read as terminal panels rather than soft app cards.
      borderRadius: {
        lg: '4px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '10px',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(0, 255, 65, 0.05), 0 0 22px -10px rgba(0, 255, 65, 0.35)',
        lift: '0 0 0 1px rgba(0, 255, 65, 0.08), 0 0 40px -12px rgba(0, 255, 65, 0.45)',
      },
      keyframes: {
        'card-enter': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'card-archive': {
          to: { opacity: '0', transform: 'translateX(-130%) rotate(-14deg)' },
        },
        'card-keep': {
          to: { opacity: '0', transform: 'translateX(130%) rotate(14deg)' },
        },
        'card-star': {
          to: { opacity: '0', transform: 'translateY(-130%) scale(0.92)' },
        },
        'reward-float': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.9)' },
          '15%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '80%': { opacity: '1', transform: 'translateY(-6px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-18px) scale(1)' },
        },
      },
      animation: {
        'card-enter': 'card-enter 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'card-archive': 'card-archive 300ms cubic-bezier(0.4, 0, 0.9, 0.6) forwards',
        'card-keep': 'card-keep 300ms cubic-bezier(0.4, 0, 0.9, 0.6) forwards',
        'card-star': 'card-star 300ms cubic-bezier(0.4, 0, 0.9, 0.6) forwards',
        'reward-float': 'reward-float 1300ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
