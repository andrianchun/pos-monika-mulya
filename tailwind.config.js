/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        heading: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // STANDAR TIPOGRAFI BAKU SESUAI DESIGN.MD & GOLDEN RATIO
      // Seluruh utilitas teks dipetakan ke 3 nilai rem agar bebas font kerdil
      // dan teks membesar mengikuti setelan aksesibilitas pengguna.
      fontSize: {
        'xs': ['1rem', '1.4'],        // 16px (1rem) — teks isi, label, meta, badge
        'sm': ['1rem', '1.4'],
        'base': ['1rem', '1.4'],
        'md': ['1.3125rem', '1.4'],   // 21px (1.3125rem) — judul kartu, angka metrik, tombol kasir
        'lg': ['1.3125rem', '1.4'],
        'xl': ['1.3125rem', '1.4'],
        '2xl': ['2.0625rem', '1.2'],  // 33px (2.0625rem) — judul layar, display besar
        '3xl': ['2.0625rem', '1.2'],
        '4xl': ['2.0625rem', '1.2'],
        '5xl': ['2.0625rem', '1.2'],
        '6xl': ['2.0625rem', '1.2'],
      },
      colors: {
        flame: {
          DEFAULT: '#F97316',
          hover: '#EA580C',
          500: '#F97316',
          600: '#EA580C',
        },
        gold: {
          DEFAULT: '#D4AF37',
          hover: '#B8860B',
          500: '#D4AF37',
          600: '#B8860B',
        },
        obsidian: {
          DEFAULT: '#0B0F19',
          card: '#131927',
        },
      },
      boxShadow: {
        'flame-glow': '0 8px 32px -8px rgba(249,115,22,0.35)',
        'gold-glow': '0 8px 32px -8px rgba(212,175,55,0.35)',
      },
    },
  },
  plugins: [],
}