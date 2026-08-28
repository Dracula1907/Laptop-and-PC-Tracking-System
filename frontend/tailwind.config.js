/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgBase: '#070B17',
        surface: '#0F172A',
        surfaceElevated: '#131D32',
        borderDark: '#1E293B',
        brandPrimary: '#6366F1',
        brandSecondary: '#8B5CF6',
        brandInfo: '#06B6D4',
        brandSuccess: '#10B981',
        brandWarning: '#F59E0B',
        brandDanger: '#EF4444',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(99, 102, 241, 0.15)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
