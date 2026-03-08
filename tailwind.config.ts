import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aritzia: {
          black: '#0a0a0a',
          dark: '#1a1a1a',
          gray: '#2a2a2a',
          light: '#f5f5f5',
        },
      },
    },
  },
  plugins: [],
};

export default config;
