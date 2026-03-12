/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark mode surfaces
        dark: {
          DEFAULT: '#0d1117',
          card: '#161b22',
          input: '#1c2333',
          border: '#2d333b',
          hover: '#1f2937',
        },
        // Light mode surfaces
        cream: {
          DEFAULT: '#fef7f0',
          card: '#ffffff',
          input: '#fdf2f8',
          border: '#f3d5e0',
          hover: '#fce7f3',
        },
        // Love palette
        rose: {
          DEFAULT: '#f43f5e',
          light: '#fb7185',
          dark: '#e11d48',
          glow: '#fda4af',
          soft: '#fff1f2',
          muted: '#f43f5e20',
        },
        peach: {
          DEFAULT: '#fb923c',
          light: '#fdba74',
          soft: '#fff7ed',
        },
        lavender: {
          DEFAULT: '#a78bfa',
          light: '#c4b5fd',
          soft: '#f5f3ff',
        },
        // Status colors
        status: {
          pending: '#f59e0b',
          confirmed: '#f43f5e',
          completed: '#10b981',
          cancelled: '#6b7280',
        },
      },
      backgroundImage: {
        'love-gradient': 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7)',
        'love-gradient-soft': 'linear-gradient(135deg, #fecdd3, #fbcfe8, #e9d5ff)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0))',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(244, 63, 94, 0.15)',
        'glow-lg': '0 0 40px rgba(244, 63, 94, 0.2)',
        'cute': '0 4px 14px rgba(244, 63, 94, 0.1)',
        'soft': '0 2px 15px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
