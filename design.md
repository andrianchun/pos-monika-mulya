# 🎨 Tokoto Design System & Guidelines (`design.md`)

> **ATURAN MUTLAK**: Seluruh antarmuka, komponen, modul kasir, dialog modal, dan pembaruan visual di **Tokoto POS** **WAJIB** mematuhi spesifikasi warna, tipografi, dan tema *Glassmorphism Enterprise* dalam dokumen ini. Tidak diperkenankan menggunakan warna di luar palet resmi atau ukuran font arbitrer yang terlalu kecil untuk layar tablet kasir / HP Android.

---

## 1. Filosofi Desain & Karakter Visual

Tokoto POS mengusung gaya **Modern Retail Glassmorphism & Futurism** yang dirancang untuk kecepatan operasional kasir:
- **Permukaan Kaca Gelap Mewah (*Obsidian Glass*)**: Latar belakang tembus pandang dengan efek blur halus (`backdrop-blur-xl`) dan aksen emas kemewahan (*Royal Gold*) dipadukan oranye energik (*Tokoto Flame*).
- **Hierarki Jelas & Ergonomis Kasir**: Area keranjang belanja, keypad angka, dan tombol bayar memiliki kontras tinggi sehingga kasir tidak salah memencet saat jam ramai (*rush hour*).
- **Target Sentuh Ramah Jari (*Fat-Finger Proof*)**: Tombol aksi utama memiliki tinggi minimal 44px–48px dengan radius membulat modern (`rounded-2xl` s/d `rounded-3xl`).
- **Skala Tipografi Proporsional**: Hanya menggunakan 1 keluarga font (`Inter`) dengan sistem 3 tingkatan ukuran baku berbasis `rem` (skala Golden Ratio).

---

## 2. Palet Warna Resmi (*Color Palette*)

### A. Warna Utama Brand Tokoto & Aksen Kasir
| Nama Token | Hex / Nilai CSS | Preview / Penggunaan |
| :--- | :--- | :--- |
| **Tokoto Flame (Primary)** | `#F97316` (`orange-500`) | Identitas resmi Tokoto, tombol aksi checkout, badge diskon, toggle aktif |
| **Royal Gold (Luxury Accent)** | `#D4AF37` / `#F59E0B` | Aksen angka nominal total belanja, status VIP/Gold, kartu ringkasan omzet |
| **Amber Glow** | `#FBBF24` (`amber-400`) | Highlight input kasir, countdown shift, notifikasi peringatan |
| **Primary Gradient** | `from-[#F97316] to-[#EA580C]` | Tombol "Bayar Sekarang / Simpan Transaksi", Floating Action Button |
| **Gold Gradient** | `from-[#D4AF37] to-[#B8860B]` | Monogram tenant toko, kartu saldo kas utama |

### B. Warna Latar Belakang (*Canvas & Ambient Meshes*)
| Mode | Warna Dasar | Efek Radial Ambient Gradient |
| :--- | :--- | :--- |
| **Dark Mode (`app-bg-dark`)** | `#0B0F19` (Obsidian Deep) | `radial-gradient(ellipse at 15% -10%, rgba(249,115,22,0.18), transparent 60%)` |
| **Light Mode (`app-bg-light`)** | `#F8FAFC` (Clean Slate) | `radial-gradient(ellipse at 15% -10%, rgba(249,115,22,0.08), transparent 60%)` |

### C. Permukaan Kaca (*Glassmorphism Surfaces*)
| Elemen | Tema Gelap (*Dark*) | Tema Terang (*Light*) | Border & Blur |
| :--- | :--- | :--- | :--- |
| **Glass Card (Utama)** | `bg-white/[0.04]` | `bg-white/80` | `border-white/10` (Dark) / `border-black/10` (Light), `backdrop-blur-xl` |
| **Glass Topbar / Header** | `bg-[#0B0F19]/80` | `bg-white/85` | `border-white/10` (Dark) / `border-slate-200` (Light), `backdrop-blur-2xl` |
| **Card Solid (Bebas Kedip)** | `bg-[#131927]` | `bg-white` | Modal transaksi, drawer pembayaran, popup cetak nota |
| **Input Bar / Keypad** | `bg-white/5` | `bg-slate-100` | `border-white/10 focus:ring-2 focus:ring-[#F97316]` |

### D. Warna Status Semantik Kasir
| Status / Fitur | Hex / Utility | Penerapan |
| :--- | :--- | :--- |
| **Emerald / Lunas / Sukses** | `#10B981` (`emerald-500`) | Nota lunas, stok aman, transaksi berhasil disimpan |
| **Rose / Tempo / Stok Habis** | `#F43F5E` (`rose-500`) | Nota tempo/piutang belum lunas, barang out of stock, void transaksi |
| **Amber / Menipis / Pending** | `#F59E0B` (`amber-500`) | Stok menipis (< batas minimum), antrean offline belum tersinkron |
| **White Border Badge** | `ring-2 ring-white` | **Badge Notifikasi Putih**: Angka notifikasi di sudut icon selalu ber-border putih bersih |

---

## 3. Standar Tipografi (1 Font Seragam: `Inter` & 3 Hierarki Golden Ratio)

Menggunakan **1 jenis font seragam: `Inter`** (`font-sans`) dengan **3 Tingkat Ukuran Baku berbasis `rem`**:

| Tingkat | Utility Class | Ukuran REM (PX) | Ketebalan & Tracking | Penggunaan Wajib |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Display / Judul Layar** | `.h1` (`text-2xl`, `3xl`) | **2.0625rem** (~33px) | `font-black tracking-tight leading-tight` | • Header Menu Kasir, Nama Toko, Total Bayar Raksasa |
| **Tier 2: Judul Kartu & Angka Metrik** | `.h2`, `.body-lg` (`text-md`, `lg`) | **1.3125rem** (~21px) | `font-bold leading-snug` | • Nama Produk di POS, Subtotal, Tombol "Bayar", Saldo Kas |
| **Tier 3: Teks Isi, Label & Badge** | `.h3`, `.body-md`, `caption` (`text-sm`, `xs`) | **1.0000rem** (~16px) | `font-semibold / regular leading-relaxed` | • Barcode, SKU, Kategori, Label Input, Catatan Struk, Badge |

> 💡 **Prinsip Bebas Font Kerdil**: Seluruh utilitas teks kecil Tailwind (`text-xs`, `text-sm`) dipetakan ke baseline minimum `1rem` (16px) agar teks kasir tetap terbaca jelas dari jarak 50–70 cm di meja kasir. Dilarang keras memakai `text-[8px]`, `text-[9px]`, atau `text-[10px]`.

---

## 4. Dimensi Komponen & Ergonomi Layar

### A. Sudut Membulat (*Border Radius*)
- **Modal Pembayaran & Dialog Struk**: `rounded-3xl` (24px)
- **Kartu Produk POS & Item Keranjang**: `rounded-2xl` (16px)
- **Tombol Kasir & Input Bar**: `rounded-xl` (12px) s/d `rounded-2xl` (16px)
- **Badge Status & Counter**: `rounded-full`

### B. Target Sentuh Kasir (*Touch Targets*)
- **Tombol Bayar & Checkout**: Tinggi minimal **48px – 56px** (`h-12` s/d `h-14`) dengan padding sentuh luas.
- **Tombol Tambah/Kurang Qty (+ / -)**: Minimal **44px × 44px**.
- **Tombol Hapus Item / Batal**: Minimal **40px × 40px**.

### C. Penanganan Safe Area & Notch Tablet/HP (*Notch Protection*)
Semua layar penuh dan drawer keranjang belanja wajib memiliki padding safe area:
```css
padding-top: max(1rem, env(safe-area-inset-top, 16px));
padding-bottom: max(1rem, env(safe-area-inset-bottom, 16px));
```

---

## 5. Aturan Larangan Keras (*Strict Restrictions*)

1. ❌ **Dilarang Menambahkan Warna Hex Arbitrer**: Seluruh warna wajib merujuk ke token tema resmi (`orange-500`, `amber-500`, `emerald-500`, `rose-500`, `#0B0F19`, `white/[0.04]`).
2. ❌ **Dilarang Font Arbitrer Kecil**: Jangan gunakan `text-[9px]` atau `text-[10px]` di tombol kasir/struk.
3. ❌ **Dilarang Tampilan Berantakan di HP Kentang**: Hindari animasi berlebihan berbasis `box-shadow` berlapis; utamanya gunakan hardware-accelerated CSS (`transform`, `opacity`).
4. ❌ **HARAM Duplikasi Ikon & Emoji**: Pilih salah satu antara Lucide Icon atau badge status, jangan dijejerkan bersamaan secara redundan.
