/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        copa: {
          red: '#FF2E63',
          green: '#00B874',
          gold: '#FFB703',
          blue: '#2D7DFF',
          purple: '#8B5CF6',
          bg: '#FFF7E8',
          dark: '#12275A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Lilita One"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        shimmer: {
          '0%': { 'background-position': '0% 0' },
          '100%': { 'background-position': '-300% 0' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-7deg)' },
          '50%': { transform: 'rotate(7deg)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 183, 3, 0.55)' },
          '50%': { boxShadow: '0 0 0 10px rgba(255, 183, 3, 0)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-16px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(var(--confetti-distance, 180px)) rotate(540deg)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'gradient-x': 'gradient-x 10s ease infinite',
        shimmer: 'shimmer 1.8s linear infinite',
        'pop-in': 'pop-in 0.45s ease-out both',
        wiggle: 'wiggle 1.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 16s linear infinite',
        'bounce-soft': 'bounce-soft 2.4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
