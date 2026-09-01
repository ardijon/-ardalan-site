/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // Landscape phones. They are wide enough to satisfy `sm:` while being only
        // ~375px tall, so every vertical padding that reads as generous on a desktop
        // is eating the image instead. Declared here rather than inline so the
        // threshold has one home; extend appends it after the width breakpoints,
        // which is what lets `short:p-2` win over `sm:p-8`.
        short: { raw: '(max-height: 600px)' },
      },
      colors: {
        primary: {
          50: '#f0f1f9',
          100: '#d0d3e8',
          200: '#a1a7d1',
          300: '#727bba',
          400: '#434fa3',
          500: '#0F172A',
          600: '#0c1222',
          700: '#090e1b',
          800: '#060913',
          900: '#03050b',
        },
        accent: {
          50: '#fef7e8',
          100: '#fdead1',
          200: '#fbd5a3',
          300: '#f9c075',
          400: '#f7ab47',
          500: '#D97706',
          600: '#b86405',
          700: '#975104',
          800: '#763e03',
          900: '#552b02',
        },
        tech: {
          50: '#e8f8f6',
          100: '#d0f1ed',
          200: '#a1e3db',
          300: '#72d5c9',
          400: '#43c7b7',
          500: '#0D9488',
          600: '#0a7a6f',
          700: '#08605a',
          800: '#054645',
          900: '#032c30',
        },
        surface: '#F8F6F3',
        // Theme-aware tint utilities. `bg-[var(--color-accent)]/10` generates
        // no CSS at all (arbitrary var + slash opacity is unsupported), so the
        // tints the components meant to express were silently absent. These
        // map the alpha tokens defined in globals.css, which DO flip with the
        // theme — a plain `bg-accent/10` would bake light-theme RGB in.
        'accent-soft': {
          5: 'var(--color-accent-5)',
          10: 'var(--color-accent-10)',
          20: 'var(--color-accent-20)',
          25: 'var(--color-accent-25)',
          30: 'var(--color-accent-30)',
          40: 'var(--color-accent-40)',
          50: 'var(--color-accent-50)',
        },
        'tech-soft': {
          5: 'var(--color-tech-5)',
          10: 'var(--color-tech-10)',
          20: 'var(--color-tech-20)',
          30: 'var(--color-tech-30)',
        },
        'success-soft': {
          5: 'var(--color-success-5)',
          10: 'var(--color-success-10)',
          20: 'var(--color-success-20)',
          30: 'var(--color-success-30)',
        },
        'text-soft': {
          5: 'var(--color-text-5)',
          10: 'var(--color-text-10)',
          20: 'var(--color-text-20)',
          30: 'var(--color-text-30)',
          40: 'var(--color-text-40)',
          45: 'var(--color-text-45)',
          50: 'var(--color-text-50)',
          60: 'var(--color-text-60)',
          70: 'var(--color-text-70)',
          80: 'var(--color-text-80)',
        },
        'danger-soft': {
          5: 'var(--color-danger-5)',
          10: 'var(--color-danger-10)',
        },
        danger: 'var(--color-danger)',
        ink: 'var(--color-text)',
        page: 'var(--color-bg)',
        line: 'var(--color-border)',
        card: 'var(--color-card)',
        'surface-soft': 'var(--color-surface-soft)',
      },
      fontFamily: {
        display: ['Vazirmatn', 'system-ui', 'sans-serif'],
        body: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
