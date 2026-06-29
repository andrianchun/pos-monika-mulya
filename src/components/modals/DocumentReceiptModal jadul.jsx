import React, { useEffect, useState } from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { formatIDR, playSound, printReceipt, formatDate } from '../../utils/helpers';
import html2canvas from 'html2canvas';

export default function DocumentReceiptModal({ doc, onClose, storeInfo, colors, isSoundOn }) {
  const isSale = doc.nota.includes('INV') || doc.nota.includes(storeInfo.prefixSales);
  const [waLoading, setWaLoading] = useState(false);
  
  useEffect(() => {
    if (doc.autoAction === 'cetak') {
      setTimeout(() => { printReceipt('print-area'); }, 300);
    } else if (doc.autoAction === 'wa') {
      handleKirimWA();
    }
  }, [doc.autoAction]);

  const handleKirimWA = async () => {
    setWaLoading(true);
    const text = `Halo, berikut rincian nota ${doc.nota}.\nTotal Tagihan: Rp ${formatIDR(doc.total)}\nTerbayar: Rp ${formatIDR(doc.paid)}\nSisa: Rp ${formatIDR(doc.total - doc.paid)}\n\nTerima kasih.`;

    try {
      const receiptElement = document.getElementById('print-area');
      
      const clone = receiptElement.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.height = 'auto'; 
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { 
         scale: 2, 
         backgroundColor: '#ffffff', 
         logging: false,
         useCORS: true // Memastikan logo aman difoto
      });
      document.body.removeChild(clone);
      
      let phone = doc.phone || '';
      if (phone) {
         if (phone.startsWith('0')) phone = '62' + phone.substring(1);
         phone = phone.replace(/\D/g, '');
      }

      const waUrl = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch (clipErr) {
          const imgData = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `Nota_${doc.nota}.png`;
          link.href = imgData;
          link.click();
        }
        
        setTimeout(() => {
          window.open(waUrl, '_blank', 'noopener,noreferrer');
          onClose(); 
        }, 500);
      }, 'image/png');

    } catch (err) {
      console.error("Gagal membuat gambar nota", err);
      const phoneFallback = doc.phone ? doc.phone.replace(/^0/, '62').replace(/\D/g, '') : '';
      const waUrl = phoneFallback ? `https://api.whatsapp.com/send?phone=${phoneFallback}&text=${encodeURIComponent(text)}` : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
       <div className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${colors.panel} border ${colors.border} max-h-[90vh] overflow-y-auto custom-scrollbar relative`}>
         <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="absolute top-4 right-4 text-red-500 hover:scale-110 z-50 bg-white rounded-full"><X size={24}/></button>
         
         {waLoading && <div className="text-center font-bold mb-4 animate-pulse text-green-500 text-sm">Menyiapkan Gambar & Membuka WhatsApp...</div>}
         
         <div className="flex justify-center w-full relative pb-4">
             {/* Kertas 58mm Sesungguhnya */}
             <div 
               id="print-area" 
               className="w-[58mm] bg-white text-black p-2 sm:p-3 relative overflow-hidden shadow-lg mx-auto"
               style={{ minHeight: '150px' }}
             >
                 {/* PERBAIKAN: Hapus kotak border, besarkan text jadi text-5xl biar mantap */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden opacity-[0.12]">
                    <p className="watermark-text text-black font-black text-5xl tracking-widest uppercase transform -rotate-[30deg]">
                       {doc.status === 'Lunas' ? 'LUNAS' : 'TEMPO'}
                    </p>
                 </div>

                 {/* Konten Nota */}
                 <div className="relative z-10 w-full">
                   <div className="text-center mb-2 border-b border-dashed border-gray-400 pb-2 flex flex-col items-center">
                     {storeInfo.logo && <img src={storeInfo.logo} crossOrigin="anonymous" className="w-8 h-8 mb-1 rounded-md object-cover" alt="Logo"/>}
                     <h2 className="font-bold text-lg tracking-tight leading-none">{storeInfo.name}</h2>
                     {storeInfo.address && <p className="text-[9px] mt-1">{storeInfo.address}</p>}
                     {storeInfo.phone && <p className="text-[9px]">WA: {storeInfo.phone}</p>}
                   </div>
                   
                   <div className="text-[10px] mb-2 leading-tight space-y-1">
                      <div className="flex justify-between"><span>Nota:</span><span className="font-semibold">{doc.nota}</span></div>
                      <div className="flex justify-between"><span>Tgl:</span><span>{formatDate(doc.date)} {new Date(doc.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span></div>
                      <div className="flex justify-between"><span>{isSale ? 'Cust' : 'Sup'}:</span><span>{doc.customer || doc.supplier}</span></div>
                      <div className="flex justify-between"><span>Kasir:</span><span>{doc.kasir}</span></div>
                   </div>
                   
                   <div className="border-t border-dashed border-gray-400 pt-2 space-y-2 text-[10px]">
                     {doc.items.map((item, i) => (
                       <div key={i} className="flex justify-between">
                         <span className="pr-2">{item.name} <br/><span className="text-[9px] text-gray-500">{String(item.qty).replace('.', ',')} {item.unit} x {formatIDR(item.unitPrice || (isSale ? item.price : item.cost))}</span></span>
                         <span className="font-semibold self-end">Rp {formatIDR(item.subtotal)}</span>
                       </div>
                     ))}
                   </div>
                   
                   <div className="mt-2 border-t border-dashed border-gray-400 pt-2 space-y-1 text-[10px]">
                     <div className="flex justify-between"><span>Subtotal</span><span>Rp {formatIDR(doc.subtotal)}</span></div>
                     {doc.discount > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>- Rp {formatIDR(doc.discount)}</span></div>}
                     {doc.ongkir > 0 && <div className="flex justify-between"><span>Ongkir</span><span>+ Rp {formatIDR(doc.ongkir)}</span></div>}
                   </div>
                   
                   <div className="mt-2 border-y border-solid border-gray-400 py-1 flex justify-between font-bold text-[12px]">
                     <span>TOTAL</span><span>Rp {formatIDR(doc.total)}</span>
                   </div>
                   
                   <div className="mt-2 text-[10px]">
                     <p className="font-bold border-b border-gray-300 mb-1">Pembayaran:</p>
                     {doc.paymentHistory && doc.paymentHistory.length > 0 ? doc.paymentHistory.map((ph, idx) => (
                        <div key={idx} className="flex justify-between">
                           <span>{formatDate(ph.date)}</span>
                           <span className={ph.amount < 0 ? 'text-red-500 font-bold' : ''}>{ph.amount < 0 ? '-' : ''} Rp {formatIDR(Math.abs(ph.amount))}</span>
                        </div>
                     )) : (
                        <div className="flex justify-between">
                           <span>Tunai</span><span>Rp {formatIDR(doc.paid)}</span>
                        </div>
                     )}
                     <div className="flex justify-between mt-1 font-semibold pt-1 border-t border-gray-300">
                       <span>Terbayar</span><span>Rp {formatIDR(doc.paid)}</span>
                     </div>
                   </div>
                   
                   {doc.total > doc.paid && (
                     <div className="flex justify-between mt-2 text-red-600 font-bold text-[11px] bg-red-50 p-1 rounded">
                       <span>KURANG</span><span>Rp {formatIDR(doc.total - doc.paid)}</span>
                     </div>
                   )}
                 </div>
             </div>
         </div>

         {!doc.autoAction && (
             <div className="mt-4 flex gap-3 w-full justify-center">
                <button onClick={() => printReceipt('print-area')} className={`flex-1 py-3 rounded-xl font-bold text-[#18181B] shadow-lg flex justify-center items-center gap-2 transition-transform hover:scale-105 active:scale-95 ${colors.goldBg}`}>
                   <Printer size={18} /> Cetak Nota
                </button>
                <button onClick={handleKirimWA} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg bg-green-600 hover:bg-green-700 flex justify-center items-center gap-2 transition-transform hover:scale-105 active:scale-95">
                   <Share2 size={18} /> Kirim WA
                </button>
             </div>
         )}
       </div>
    </div>
  );
}