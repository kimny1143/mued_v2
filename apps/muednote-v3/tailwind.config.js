/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'muednote': {
          'primary': '#1a1a1a',
          'secondary': '#2a2a2a',
          'accent': '#4a90e2',
          'text': '#e0e0e0',
          'muted': '#8a8a8a',
          'success': '#10b981',
          'warning': '#f59e0b',
          'error': '#ef4444',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in',
        'fade-out': 'fadeOut 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}