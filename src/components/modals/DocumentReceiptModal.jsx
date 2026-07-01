import React, { useState, useEffect } from 'react';
import { X, Printer, MessageCircle, Loader2 } from 'lucide-react';
import { formatIDR, playSound } from '../../utils/helpers';
import html2canvas from 'html2canvas';

export default function DocumentReceiptModal({ doc, onClose, storeInfo, colors, isSoundOn, showToast }) {
  const [notaBlob, setNotaBlob] = useState(null);
  const [isRendering, setIsRendering] = useState(doc?.autoAction === 'wa'); // Langsung true jika autoAction WA

  const hasAutoActionRun = React.useRef(false);

  useEffect(() => {
    if (!hasAutoActionRun.current) {
      if (doc?.autoAction === 'cetak') {
        hasAutoActionRun.current = true;
        if (doc?.source === 'POS') {
           setTimeout(() => {
              handlePrint();
           }, 800);
        } else {
           handlePrint();
        }
      } else if (doc?.autoAction === 'wa') {
        hasAutoActionRun.current = true;
        // Jeda 500ms sebelum memanggil handleWA agar browser PASTI sudah me-render DOM dan layar loading
        setTimeout(() => {
           handleWA(true);
        }, 500);
      }
    }
  }, [doc]);

  const handlePrint = () => {
    playSound('pop', isSoundOn);
    const printContent = document.getElementById('receipt-print-area').innerHTML;
    
    // Hapus iframe lama jika ada (mencegah Chrome Print Crash)
    const oldIframe = document.getElementById('receipt-print-iframe');
    if (oldIframe) oldIframe.parentNode.removeChild(oldIframe);

    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
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
            @page { margin: 0; size: 48mm auto; } 
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background-color: #fff;
              height: max-content !important; 
            }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              color: #000; 
              width: 48mm; 
              max-width: 48mm;
              zoom: 0.94;
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
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      
      if (doc?.autoAction === 'cetak') {
        setTimeout(onClose, 1000);
      }
    }, 500);
  };

  const handleWA = async (isAuto = false) => {
     if (isRendering && !isAuto) return;
     playSound('pop', isSoundOn);
     setIsRendering(true);
     
     // Memberi jeda kecil agar peramban sempat menggambar (render) layar loading sebelum thread diblokir oleh html2canvas
     await new Promise(resolve => setTimeout(resolve, 250));
     
     const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
     
     const isSales = doc.type !== 'pembelian';
     let text = `*NOTA TRANSAKSI - ${storeInfo.name}*\n`;
     text += `No: ${doc.nota}\n`;
     text += `Tgl: ${new Date(doc.date).toLocaleString('id-ID')}\n`;
     text += `Kasir: ${doc.kasir || '-'}\n`;
     text += `${isSales ? 'Cust' : 'Sup'}: ${isSales ? (doc.customer || 'Umum') : (doc.supplier || '-')}\n\n`;
     
     const cartItems = doc.cart || doc.items || [];
     cartItems.forEach(item => {
         text += `${item.name}\n${item.qty} ${item.unit || ''} x ${formatIDR(item.unitPrice || item.price)} = ${formatIDR(item.subtotal || item.total)}\n`;
     });
     
     text += `\nSubtotal: Rp ${formatIDR(doc.subtotal)}\n`;
     if (doc.discount > 0) text += `Diskon: -Rp ${formatIDR(doc.discount)}\n`;
     if (doc.ongkir > 0) text += `Ongkir: Rp ${formatIDR(doc.ongkir)}\n`;
     text += `*TOTAL: Rp ${formatIDR(doc.total)}*\n`;
     text += `Bayar: Rp ${formatIDR(doc.paid)}\n`;
     text += `Kembali: Rp ${formatIDR(doc.paid - doc.total)}\n\n`;
     
     text += `Terima kasih telah berbelanja di ${storeInfo.name}!\n`;

     let currentBlob = null;
     try {
         const el = document.getElementById('receipt-print-area');
         if (el) {
             const canvas = await html2canvas(el, { scale: 1.2, backgroundColor: '#ffffff', useCORS: true });
             currentBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
         }
     } catch(e) { console.error("Gambar nota WA:", e); }

     try {
         if (currentBlob && navigator.clipboard && window.isSecureContext) {
             const item = new ClipboardItem({ "image/png": currentBlob });
             await navigator.clipboard.write([item]);
             if (showToast) showToast('Gambar nota berhasil disalin ke clipboard! Silakan Paste (Ctrl+V) di chat WhatsApp.', 'success');
         } else {
             await navigator.clipboard.writeText(text);
             if (showToast) showToast('Hanya teks nota yang disalin. Gambar gagal karena peramban tidak mendukung.', 'warning');
         }
     } catch (clipboardErr) {
         console.warn("Gambar gagal di-copy:", clipboardErr);
         try {
             await navigator.clipboard.writeText(text);
         } catch(err) {
             console.warn("Teks gagal di-copy:", err);
             const tempTextArea = document.createElement('textarea');
             tempTextArea.value = text;
             document.body.appendChild(tempTextArea);
             tempTextArea.select();
             document.execCommand('copy');
             document.body.removeChild(tempTextArea);
         }
     }

     let phone = doc.phone ? String(doc.phone).replace(/\D/g, '') : '';
     if (phone.startsWith('0')) phone = '62' + phone.substring(1);
     
     if (isMobile && currentBlob && navigator.share) {
         try {
             const file = new File([currentBlob], `Nota_${doc.nota}.png`, { type: 'image/png' });
             await navigator.share({
                 title: `Nota Transaksi`,
                 text: text,
                 files: [file]
             });
         } catch (shareErr) {
             window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
         }
     } else {
         const waUrl = phone ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}` : `whatsapp://send?text=${encodeURIComponent(text)}`;
         
         window.isWAFiring = true; 
         const iframe = document.createElement('iframe');
         iframe.style.display = 'none';
         iframe.src = waUrl;
         document.body.appendChild(iframe);
         
         setTimeout(() => {
             if (document.body.contains(iframe)) document.body.removeChild(iframe);
             window.isWAFiring = false;
         }, 3000);
     }
     
     setIsRendering(false);
     if (doc?.autoAction === 'wa') {
         setTimeout(onClose, 800);
     }
  };

  if (!doc) return null;

  const isSales = doc.type !== 'pembelian';
  const watermarkText = doc?.status?.toUpperCase() === 'LUNAS' ? 'LUNAS' : 'TEMPO';

  const isAuto = !!doc?.autoAction;

  return (
     <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 ${isAuto ? 'opacity-0 pointer-events-none' : 'bg-black/70'}`}>
        <div className="w-full max-w-sm rounded-2xl shadow-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
           
           <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
             <h3 className="text-lg font-bold text-gray-800 dark:text-[#FFFDD0]">Preview Nota</h3>
             <button onClick={() => { playSound('pop', isSoundOn); onClose(); }} className="text-red-500 hover:scale-110 p-1"><X size={24}/></button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-100 dark:bg-[#121212] flex flex-col items-center relative">
              
              {isRendering && (
                   <div className="absolute inset-0 bg-white/80 dark:bg-black/80 z-[100] flex flex-col items-center justify-center backdrop-blur-md">
                      <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-[80%] border-2 border-[#D4AF37]">
                         <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={48} />
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Memproses Gambar...</h3>
                         <p className="text-xs text-gray-500 dark:text-gray-400">Sistem sedang merangkai gambar nota.<br/>(Animasi mungkin membeku sesaat, ini normal)</p>
                      </div>
                   </div>
              )}

              <div className="bg-white text-black p-3 shadow-sm w-full mx-auto" style={{ maxWidth: '48mm', minHeight: 'fit-content' }}>
                 
                 <div id="receipt-print-area" style={{ color: '#000', backgroundColor: '#fff', fontSize: '10px', lineHeight: '1.2', fontFamily: 'Arial, sans-serif', width: '100%', maxWidth: '48mm', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
                    
                    {(storeInfo.logoNota || storeInfo.logo) && (
                      <div style={{ textAlign: 'center', marginBottom: '4px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <img src={storeInfo.logoNota || storeInfo.logo} crossOrigin="anonymous" alt="logo" style={{ maxWidth: '35mm', maxHeight: '12mm', objectFit: 'contain', filter: 'grayscale(100%) contrast(1000%)', display: 'block', margin: '0 auto' }}/>
                      </div>
                    )}

                    <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '14px', marginBottom: '2px' }}>{storeInfo.name}</div>
                    <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '4px' }}>{storeInfo.address}<br/>Telp: {storeInfo.phone}</div>
                    
                    <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                    
                    <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', marginBottom: '4px' }}>
                       <tbody>
                          <tr><td style={{ width: '30px', padding: '1px 0' }}>Nota</td><td style={{ padding: '1px 0' }}>: <strong>{doc.nota}</strong></td></tr>
                          <tr><td style={{ padding: '1px 0' }}>Tgl</td><td style={{ padding: '1px 0' }}>: {new Date(doc.date).toLocaleString('id-ID')}</td></tr>
                          <tr><td style={{ padding: '1px 0' }}>Kasir</td><td style={{ padding: '1px 0' }}>: {doc.kasir}</td></tr>
                          <tr><td style={{ padding: '1px 0' }}>{isSales ? 'Cust' : 'Sup'}</td><td style={{ padding: '1px 0' }}>: {isSales ? (doc.customer || 'Umum') : (doc.supplier || '-')}</td></tr>
                       </tbody>
                    </table>
                    
                    <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }}></div>
                    
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

                    <div style={{ border: '2px solid #000', color: '#000', fontSize: '13px', fontWeight: '900', textAlign: 'center', padding: '4px', marginTop: '8px', marginBottom: '0px', width: '100%', letterSpacing: '1px', textTransform: 'uppercase' }}>
                       {watermarkText}
                    </div>
                 </div>

              </div>
           </div>

           {!isAuto && (
             <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0 bg-white dark:bg-[#1e1e1e]">
                <button onClick={() => { handlePrint(); }} className={`flex-1 py-3 text-[#18181B] font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-transform ${colors.goldBg} hover:opacity-90 active:scale-95`}>
                   <Printer size={20}/>
                  <span>Print Nota</span>
                </button>
             </div>
           )}
        </div>
     </div>
  );
}
