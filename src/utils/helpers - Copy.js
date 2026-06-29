import html2canvas from 'html2canvas';

export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const numString = val.toString().replace(/[^0-9]/g, '');
  return numString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const parseIDR = (val) => {
  if (!val) return 0;
  return parseInt(val.toString().replace(/[^0-9]/g, ''), 10) || 0;
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const handleImageUpload = (e, callback, showToast) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran maksimal gambar 5MB!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
       const img = new Image();
       img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          callback(canvas.toDataURL('image/jpeg', 0.7)); 
       };
       img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
};

export const playSound = (type, isSoundOn) => {
  if (!isSoundOn) return;
  try {
    window.audioCtx = window.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = window.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'pop') { 
       osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.02); gain.gain.setValueAtTime(0.02, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02); osc.start(now); osc.stop(now + 0.02); 
    } 
    else if (type === 'drop') { 
       osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.05); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); osc.start(now); osc.stop(now + 0.05); 
    } 
    else if (type === 'cash' || type === 'success') { 
       osc.type = 'sine'; osc.frequency.setValueAtTime(523.25, now); osc.frequency.setValueAtTime(659.25, now + 0.1); osc.frequency.setValueAtTime(783.99, now + 0.2); osc.frequency.setValueAtTime(1046.50, now + 0.3); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.15, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); osc.start(now); osc.stop(now + 0.8); 
    }
  } catch (e) { console.log("Audio not supported"); }
};

export const calculateDynamicPrice = (item, qty) => {
  let currentPrice = item.price;
  let isWholesale = false;
  if (item.wholesale?.minQty > 0 && qty >= item.wholesale.minQty) { currentPrice = item.wholesale.price; isWholesale = true; }
  return { unitPrice: Math.max(0, currentPrice), isWholesale, basePrice: item.price };
};

// JURUS GABUNGAN: Gambar Murni + Iframe Gaib (Bebas Blokir, Bebas CSS Rusak)
export const printReceipt = async (elementId) => {
  const printElement = document.getElementById(elementId);
  if (!printElement) return;

  try {
    // 1. Trik Kloning: Bikin copy elemennya biar html2canvas bisa motret full tanpa kepotong scroll
    const clone = printElement.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.height = 'auto';
    document.body.appendChild(clone);

    // 2. Jepret elemen HTML jadi gambar
    const canvas = await html2canvas(clone, {
      scale: 3, 
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    
    document.body.removeChild(clone);
    const imgData = canvas.toDataURL('image/png');

    // 3. Buat mesin cetak gaib (Iframe) biar browser gak ngira ini spam pop-up
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    // 4. Masukkan GAMBAR MURNI ke dalam Iframe lalu print otomatis
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Struk</title>
          <style>
            @page { 
              margin: 0 !important; 
              size: 58mm auto; 
            }
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              text-align: left !important;
            }
            img {
              width: 58mm !important; /* Paksa gambar nge-pas ke kertas 58mm */
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" />
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.focus();
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();

    // 5. Sapu bersih Iframe-nya dari memori setelah beberapa detik
    setTimeout(() => {
      if (document.body.contains(iframe)) {
         document.body.removeChild(iframe);
      }
    }, 5000);

  } catch (error) {
    console.error("Gagal membuat gambar struk:", error);
    alert("Maaf, terjadi kesalahan saat memproses gambar struk.");
  }
};