import React, { useEffect } from 'react';
import { X, Printer, MessageCircle } from 'lucide-react';
import { formatIDR, playSound } from '../../utils/helpers';

export default function DocumentReceiptModal({ doc, onClose, storeInfo, colors, isSoundOn }) {
  useEffect(() => {
    if (doc?.autoAction === 'cetak') {
      setTimeout(() => handlePrint(), 500);
    } else if (doc?.autoAction === 'wa') {
      setTimeout(() => handleWA(), 500);
    }
  }, [doc]);

  const handlePrint = () => {
    playSound('pop', isSoundOn);
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Nota</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page { margin: 0; size: auto; }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              margin: 0; 
              padding: 2mm 1mm; 
              color: #000; 
              background-color: #fff;
              width: 56mm; 
              max-width: 100%;
              overflow: hidden;
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 3000);
    }, 400);
  };

  const handleWA = () => {
     playSound('pop', isSoundOn);
     if (!doc.phone || doc.phone === '-') {
        alert("Customer tidak memiliki nomor WA!");
        return;
     }
     
     let text = `*NOTA TRANSAKSI - ${storeInfo.name}*\n`;
     text += `No: ${doc.nota}\n`;
     text += `Tgl: ${new Date(doc.date).toLocaleString('id-ID')}\n`;
     text += `--------------------------------\n`;
     doc.items.forEach(i => {
        text += `${i.name}\n${i.qty} ${i.unit} x ${formatIDR(i.unitPrice)} = Rp ${formatIDR(i.subtotal)}\n`;
     });
     text += `--------------------------------\n`;
     text += `Subtotal: Rp ${formatIDR(doc.subtotal)}\n`;
     if(doc.discount > 0) text += `Diskon: -Rp ${formatIDR(doc.discount)}\n`;
     if(doc.ongkir > 0) text += `Ongkir: Rp ${formatIDR(doc.ongkir)}\n`;
     text += `*TOTAL: Rp ${formatIDR(doc.total)}*\n`;
     text += `Bayar: Rp ${formatIDR(doc.paid)}\n`;
     text += `Kembali: Rp ${formatIDR(doc.paid - doc.total)}\n\n`;
     text += `Terima Kasih!`;

     const phone = doc.phone.startsWith('0') ? '62' + doc.phone.substring(1) : doc.phone;
     const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
     window.open(url, '_blank');
  };

  if (!doc) return null;

  const isSales = doc.nota.includes(storeInfo.prefixSales);
  const watermarkText = doc?.status?.toUpperCase() === 'LUNAS' ? 'LUNAS / TUNAI' : 'TEMPO';

  return (
     <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4">
        <div className={\`w-full max-w-sm rounded-2xl shadow-2xl \${colors?.panel || 'bg-white'} border \${colors?.border || 'border-gray-200'} flex flex-col max-h-[90vh]\`}>
           
           {/* HEADER MODAL */}
           <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
             <h3 className={\`text-lg font-bold \${colors?.text || 'text-gray-800'}\`}>Preview Nota 58mm</h3>
             <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="text-red-500 hover:scale-110 p-1"><X size={24}/></button>
           </div>

           {/* AREA PREVIEW: Background abu-abu untuk membingkai nota */}
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-100 dark:bg-[#121212] flex flex-col items-center">
              
              {/* KERTAS NOTA (Putih, 58mm max) */}
              <div className="bg-white text-black p-3 shadow-sm w-full mx-auto" style={{ maxWidth: '58mm', minHeight: '80mm' }}>
                 
                 {/* ID INI YANG AKAN DIEKSTRAK KE IFRAME PRINT */}
                 <div id="receipt-print-area" style={{ position: 'relative', zIndex: 1, paddingBottom: '10px', color: '#000', backgroundColor: '#fff', fontSize: '10px', lineHeight: '1.2', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
                    
                    {/* WATERMARK TENGAH BESAR & TRANSPARAN */}
                    <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%) rotate(-40deg)', fontSize: '32px', fontWeight: '900', color: 'rgba(0,0,0,0.15)', zIndex: 0, whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: '2px', textTransform: 'uppercase' }}>
                       {watermarkText}
                    </div>

                    {/* KONTEN TEKS NOTA (Z-INDEX DI ATAS WATERMARK) */}
                    <div style={{ position: 'relative', zIndex: 10 }}>
                       
                       {/* LOGO */}
                       {storeInfo.logo && (
                         <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                           <img src={storeInfo.logo} alt="logo" style={{ maxWidth: '40mm', maxHeight: '12mm', objectFit: 'contain', filter: 'grayscale(100%) contrast(200%)' }}/>
                         </div>
                       )}

                       {/* HEADER TOKO */}
                       <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '14px', marginBottom: '2px' }}>{storeInfo.name}</div>
                       <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '4px' }}>{storeInfo.address}<br/>Telp: {storeInfo.phone}</div>
                       
                       <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                       
                       {/* INFO TRANSAKSI */}
                       <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', marginBottom: '4px' }}>
                          <tbody>
                             <tr><td style={{ width: '30px', padding: '1px 0' }}>Nota</td><td style={{ padding: '1px 0' }}>: <strong>{doc.nota}</strong></td></tr>
                             <tr><td style={{ padding: '1px 0' }}>Tgl</td><td style={{ padding: '1px 0' }}>: {new Date(doc.date).toLocaleString('id-ID')}</td></tr>
                             <tr><td style={{ padding: '1px 0' }}>Kasir</td><td style={{ padding: '1px 0' }}>: {doc.kasir}</td></tr>
                             {doc.customer && <tr><td style={{ padding: '1px 0' }}>{isSales ? 'Plg' : 'Sup'}</td><td style={{ padding: '1px 0' }}>: {isSales ? doc.customer : doc.supplier}</td></tr>}
                          </tbody>
                       </table>
                       
                       <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                       
                       {/* DAFTAR BARANG (SPASI RAPAT) */}
                       <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', marginBottom: '4px' }}>
                          <tbody>
                             {doc.items.map(item => (
                                <React.Fragment key={item.id}>
                                   <tr>
                                      <td colSpan="2" style={{ fontWeight: 'bold', padding: '1px 0' }}>{item.name}</td>
                                   </tr>
                                   <tr>
                                      <td style={{ padding: '0 0 2px 0' }}>{item.qty} {item.unit} x {formatIDR(item.unitPrice)}</td>
                                      <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '0 0 2px 0' }}>Rp {formatIDR(item.subtotal)}</td>
                                   </tr>
                                </React.Fragment>
                             ))}
                          </tbody>
                       </table>
                       
                       <div style={{ borderTop: '1px dashed #000', paddingTop: '4px', marginTop: '2px' }}></div>
                       
                       {/* TOTALAN */}
                       <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                          <tbody>
                             <tr><td style={{ padding: '1px 0' }}>Subtotal</td><td style={{ textAlign: 'right', padding: '1px 0' }}>Rp {formatIDR(doc.subtotal)}</td></tr>
                             {doc.discount > 0 && <tr><td style={{ padding: '1px 0' }}>Diskon</td><td style={{ textAlign: 'right', padding: '1px 0' }}>-Rp {formatIDR(doc.discount)}</td></tr>}
                             {doc.ongkir > 0 && <tr><td style={{ padding: '1px 0' }}>Ongkir</td><td style={{ textAlign: 'right', padding: '1px 0' }}>Rp {formatIDR(doc.ongkir)}</td></tr>}
                             <tr><td style={{ fontWeight: '900', fontSize: '13px', paddingTop: '2px' }}>TOTAL</td><td style={{ textAlign: 'right', fontWeight: '900', fontSize: '13px', paddingTop: '2px' }}>Rp {formatIDR(doc.total)}</td></tr>
                             <tr><td style={{ paddingTop: '2px' }}>Bayar</td><td style={{ textAlign: 'right', paddingTop: '2px' }}>Rp {formatIDR(doc.paid)}</td></tr>
                             <tr><td style={{ fontWeight: 'bold', paddingBottom: '2px' }}>KEMBALI</td><td style={{ textAlign: 'right', fontWeight: 'bold', paddingBottom: '2px' }}>Rp {formatIDR(doc.paid - doc.total)}</td></tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
                 {/* AKHIR ID PRINT */}

              </div>
           </div>

           {/* FOOTER TOMBOL MODAL */}
           <div className={\`p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0 \${colors?.panel || 'bg-white'}\`}>
              <button onClick={handleWA} className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95">
                 <MessageCircle size={20}/> <span className="hidden sm:inline">Kirim WA</span><span className="sm:hidden">WA</span>
              </button>
              <button onClick={handlePrint} className={\`flex-1 py-3 text-[#18181B] font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 \${colors?.goldBg || 'bg-blue-600'}\`}>
                 <Printer size={20}/> <span className="hidden sm:inline">Cetak Nota</span><span className="sm:hidden">Cetak</span>
              </button>
           </div>
        </div>
     </div>
  );
}
