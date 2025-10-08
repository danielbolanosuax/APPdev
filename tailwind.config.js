/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: { brand: { DEFAULT: '#16a34a', 600: '#16a34a', 700: '#166534' } },
      borderRadius: { '2xl': '20px' },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.08)',
        elev: '0 16px 50px rgba(0,0,0,0.15)'
      }
    }
  },
  plugins: []
}
