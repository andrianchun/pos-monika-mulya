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
      // STANDAR TIPOGRAFI SESUAI DESIGN.MD & GOLDEN RATIO
      // Hierarki 3-Tier utama: 33px (Display), 21px (Card/Action), 16px (Body)
      // Disertai skala mikro (12px, 14px) untuk timestamp, badge, & form compact agar tidak terpotong
      fontSize: {
        'xs': ['0.75rem', '1.4'],     // 12px — timestamp nota, badge, barcode, input tanggal
        'sm': ['0.875rem', '1.4'],    // 14px — label sekunder, tab navigasi kecil
        'base': ['1rem', '1.4'],      // 16px (1rem) — TIER 3: Teks isi standar, nama barang di keranjang
        'md': ['1.3125rem', '1.4'],   // 21px (1.3125rem) — TIER 2: Judul kartu, subtotal, tombol bayar
        'lg': ['1.3125rem', '1.4'],
        'xl': ['1.3125rem', '1.4'],
        '2xl': ['2.0625rem', '1.2'],  // 33px (2.0625rem) — TIER 1: Judul layar, total nota raksasa
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