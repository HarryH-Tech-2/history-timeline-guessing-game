/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B0E14',
          raised: '#141924',
          overlay: '#1C2230',
        },
        ink: {
          primary: '#F4F6FB',
          secondary: '#AEB6C6',
          muted: '#6B7488',
        },
        accent: {
          DEFAULT: '#5B8CFF',
          soft: '#8FB0FF',
        },
        success: '#3DDC97',
        warning: '#FFB454',
        danger: '#FF5C7A',
        hair: 'rgba(255,255,255,0.08)',
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
      },
    },
  },
  plugins: [],
};
