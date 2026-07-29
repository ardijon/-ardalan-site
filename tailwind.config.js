/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
      },
      fontFamily: {
        display: ['Vazirmatn', 'system-ui', 'sans-serif'],
        body: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
