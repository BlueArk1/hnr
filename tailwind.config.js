/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        m2: {
          bg: '#121212',
          surface: '#1e1e1e',
          'surface-2': '#2c2c2c',
          primary: 'var(--color-primary, #FF6600)',
          secondary: '#80cbc4',
          error: '#cf6679',
          'on-bg': 'rgb(255 255 255 / 0.87)',
          'on-surface': 'rgb(255 255 255 / 0.87)',
          'on-surface-med': 'rgb(255 255 255 / 0.60)',
          'on-surface-disabled': 'rgb(255 255 255 / 0.38)',
        },
      },
    },
  },
  plugins: [],
};