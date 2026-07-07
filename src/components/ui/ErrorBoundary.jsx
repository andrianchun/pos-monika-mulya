import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary menangkap error:", error, errorInfo);
    // TODO: Kirim ke Sentry/Crashlytics di sini jika sudah terpasang
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900 m-4">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
            Ups! Terjadi Kesalahan pada Modul Ini
          </h2>
          <p className="text-red-600 dark:text-red-300 text-center text-sm mb-6 max-w-md">
            Sistem mendeteksi adanya malfungsi saat memuat tampilan ini. Jangan khawatir, aplikasi utama masih berjalan normal.
          </p>
          
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-semibold transition-colors"
          >
            <RefreshCcw size={18} />
            Muat Ulang Halaman
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 w-full max-w-3xl overflow-auto bg-black/80 text-red-300 p-4 rounded-lg text-xs font-mono text-left">
              <p className="font-bold text-red-400 mb-2">{this.state.error.toString()}</p>
              <pre>{this.state.errorInfo.componentStack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
