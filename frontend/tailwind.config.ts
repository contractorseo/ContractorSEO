import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#b9dcfe',
          300: '#7cc2fd',
          400: '#36a3fa',
          500: '#0c87eb',
          600: '#006bc9',
          700: '#0156a3',
          800: '#064986',
          900: '#0b3d6f',
          950: '#07254a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
