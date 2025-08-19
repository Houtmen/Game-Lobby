/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-blue-600',
    'bg-blue-700',
    'bg-blue-800',
    'bg-green-600',
    'bg-green-700',
    'bg-green-800',
    'bg-yellow-500',
    'bg-yellow-600',
    'bg-yellow-700',
    'bg-purple-600',
    'bg-purple-700',
    'bg-purple-800',
    'hover:bg-blue-700',
    'hover:bg-blue-800',
    'hover:bg-green-700',
    'hover:bg-green-800',
    'hover:bg-yellow-600',
    'hover:bg-yellow-700',
    'hover:bg-purple-700',
    'hover:bg-purple-800',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
