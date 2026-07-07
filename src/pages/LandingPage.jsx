import React from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      {/* Background Ornaments (Glassmorphism) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Store className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight">
            tokoto<span className="text-orange-500">.id</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 font-medium text-slate-300">
          <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
          <a href="#solusi" className="hover:text-white transition-colors">Solusi</a>
          <a href="#harga" className="hover:text-white transition-colors">Harga</a>
        </div>

        <div className="flex items-center gap-4">
          {/* Untuk Login Kasir, diarahkan ke pencarian toko atau jika tahu URL langsung */}
          <Link to="/register" className="hidden md:block text-slate-300 hover:text-white font-medium transition-colors">
            Masuk Kasir
          </Link>
          <Link 
            to="/register" 
            className="bg-white text-slate-900 hover:bg-orange-50 px-6 py-2.5 rounded-full font-bold transition-all shadow-xl hover:shadow-orange-500/20 hover:-translate-y-0.5"
          >
            Coba Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md text-sm font-medium text-orange-400 mb-8">
            <Zap size={16} />
            <span>Aplikasi POS Kasir Termutakhir 2026</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Revolusi Transaksi <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              Bisnis Bersama
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Satu aplikasi berbasis Cloud dengan fitur lengkap untuk semua jenis usaha. Kelola kasir, inventori, hingga analisa bisnis di mana saja dan kapan saja.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link 
              to="/register" 
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 group"
            >
              Mulai Sekarang - Gratis
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#demo" 
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-lg text-white border border-slate-700 hover:bg-slate-800 transition-colors flex items-center justify-center"
            >
              Lihat Demo
            </a>
          </div>

          <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-slate-500 text-sm font-medium">
            <div className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500 w-5 h-5" /> Gratis 14 Hari</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="text-emerald-500 w-5 h-5" /> Tanpa Kartu Kredit</div>
          </div>
        </div>

        {/* Mockup / Image Graphic */}
        <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
          <div className="aspect-square md:aspect-auto md:h-[600px] w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] border border-slate-700/50 shadow-2xl overflow-hidden relative">
             {/* Mockup Dashboard UI */}
             <div className="absolute inset-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner flex flex-col overflow-hidden">
                <div className="h-12 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="p-6 flex-1 flex flex-col gap-6">
                   <div className="flex gap-4">
                     <div className="h-32 flex-1 bg-gradient-to-br from-orange-500/20 to-orange-500/5 rounded-xl border border-orange-500/20 p-4">
                       <TrendingUp className="text-orange-400 w-8 h-8 mb-2" />
                       <div className="h-4 w-24 bg-orange-400/20 rounded mt-2"></div>
                       <div className="h-8 w-32 bg-orange-400/40 rounded mt-2"></div>
                     </div>
                     <div className="h-32 flex-1 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                       <ShieldCheck className="text-blue-400 w-8 h-8 mb-2" />
                       <div className="h-4 w-24 bg-slate-700 rounded mt-2"></div>
                       <div className="h-8 w-32 bg-slate-600 rounded mt-2"></div>
                     </div>
                   </div>
                   <div className="flex-1 bg-slate-800/30 rounded-xl border border-slate-700/30 p-4 flex gap-4">
                      <div className="w-1/3 space-y-3">
                         <div className="h-4 w-full bg-slate-700 rounded"></div>
                         <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
                         <div className="h-4 w-4/6 bg-slate-700 rounded"></div>
                      </div>
                      <div className="flex-1 bg-slate-800/80 rounded-lg"></div>
                   </div>
                </div>
             </div>
             {/* Floating Badge */}
             <div className="absolute top-12 -left-6 md:-left-12 bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-xl backdrop-blur-md animate-bounce" style={{ animationDuration: '3s' }}>
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                    <CheckCircle2 />
                 </div>
                 <div>
                   <p className="text-xs text-slate-400 font-medium">Berbasis Cloud</p>
                   <p className="text-sm text-white font-bold">Sinkronisasi Realtime</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
