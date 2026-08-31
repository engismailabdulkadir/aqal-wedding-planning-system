/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Shared Wedding Planner brand — professional blue system
        brand: {
          50: '#EEF3FF',
          100: '#DCE6FF',
          200: '#C5D3F5',
          300: '#A8BAE8',
          400: '#7E96D6',
          500: '#5874C4',
          600: '#3F5DB3',
          700: '#3552A2',
          800: '#2C4488',
          900: '#23366C',
        },
        // Semantic surfaces — values come from CSS variables (light + dark)
        app: {
          bg: 'var(--wp-app-bg)',
          header: 'var(--wp-header)',
          surface: 'var(--wp-surface)',
          'surface-2': 'var(--wp-surface-2)',
          inset: 'var(--wp-surface-inset)',
          border: 'var(--wp-border)',
          text: 'var(--wp-text)',
          muted: 'var(--wp-text-secondary)',
          faint: 'var(--wp-text-muted)',
        },
        success: {
          DEFAULT: '#179447',
          soft: 'var(--wp-success-soft)',
        },
        warning: {
          DEFAULT: '#F5B700',
          soft: 'var(--wp-warning-soft)',
        },
        danger: {
          DEFAULT: '#EF4444',
          soft: 'var(--wp-danger-soft)',
        },
        sidebar: {
          DEFAULT: 'var(--wp-sidebar)',
          hover: 'var(--wp-sidebar-hover)',
          active: 'var(--wp-sidebar-active)',
          soft: 'rgba(238, 243, 255, 0.18)',
          border: 'rgba(255, 255, 255, 0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        soft: 'var(--wp-shadow-soft)',
        card: 'var(--wp-shadow-card)',
      },
    },
  },
  plugins: [],
};
