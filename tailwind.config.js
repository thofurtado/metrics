/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      ringColor: {
        DEFAULT: '#786ce8',
      },
      colors: {
        minsk: {
          50: '#eff1fe',
          100: '#e2e5fd',
          200: '#cbcefa',
          300: '#abaff6',
          400: '#8d89f0',
          500: '#786ce8',
          600: '#6950db',
          700: '#5b41c1',
          800: '#4a379c',
          900: '#3c3176',
          950: '#261e48',
        },
        'vida-loca': {
          50: '#f4fbf2',
          100: '#e7f6e2',
          200: '#cfedc5',
          300: '#a9dd98',
          400: '#7bc563',
          500: '#58a93e',
          600: '#479030',
          700: '#376e27',
          800: '#305724',
          900: '#28481f',
          950: '#11270c',
        },
        stiletto: {
          50: '#fcf5f4',
          100: '#fae9e9',
          200: '#f4d7d7',
          300: '#ebb6b6',
          400: '#e08c8f',
          500: '#d0636b',
          600: '#ba4452',
          700: '#a23645',
          800: '#832e3c',
          900: '#712a39',
          950: '#3e131a',
        },

        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: '#5b41c1',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
