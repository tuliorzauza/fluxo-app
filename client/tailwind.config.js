/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fundo: '#0f0f13',
        surface: '#16161d',
        border: '#1e1e28',
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        titulo: ['Syne', 'sans-serif'],
        corpo: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
