import html2canvas from 'html2canvas';

export const parseIDR = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  let str = val.toString();
  // Strip all dots (thousands separators)
  str = str.replace(/\./g, '');
  // Replace comma with dot for float parsing
  str = str.replace(/,/g, '.');
  let isNegative = str.trim().startsWith('-');
  // Remove anything except digits and the decimal point
  str = str.replace(/[^0-9.]/g, '');
  
  let parsed = parseFloat(str) || 0;
  return isNegative ? -parsed : parsed;
};

export const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '';
  let numVal = typeof val === 'number' ? val : parseIDR(val);
  if (isNaN(numVal)) return '';
  
  let isNegative = numVal < 0;
  let absVal = Math.abs(numVal);
  
  // SMART ROUNDING:
  // 1. Remove JavaScript floating point imprecision (e.g. 0.1+0.2=0.30000000000000004)
  absVal = parseFloat(absVal.toFixed(10));
  // 2. Cap to maximum 4 decimal places for business logic consistency
  absVal = Math.round(absVal * 10000) / 10000;
  
  let parts = absVal.toString().split('.');
  let intPart = parts[0];
  let decPart = parts.length > 1 ? parts[1] : null;
  
  let formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  let result = formattedInt;
  if (decPart !== null) {
    result += ',' + decPart;
  }
  return isNegative ? '-' + result : result;
};

// Smart string formatter for input fields (keeps trailing comma while typing)
export const smartFormatInput = (val) => {
  if (!val && val !== 0) return '';
  let str = val.toString();
  
  // MAGIC DECIMAL: If user types a dot at the very end, convert it to a comma
  if (str.endsWith('.')) {
    str = str.slice(0, -1) + ',';
  }
  
  // Clean up: allow only digits, dots, and commas
  let cleanStr = str.replace(/[^0-9,.]/g, '');
  if (!cleanStr) return '';
  
  // Keep only the FIRST comma
  let parts = cleanStr.split(',');
  let intPart = parts[0];
  let decPart = parts.length > 1 ? parts.slice(1).join('') : null;
  
  // Remove all dots from integer part (they will be rebuilt as thousands separators)
  intPart = intPart.replace(/\./g, '');
  
  // Format integer part
  let formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Reattach the comma and decimal part
  if (decPart !== null) {
    return formattedInt + ',' + decPart;
  }
  return formattedInt;
};

export const formatWhatsAppNumber = (val) => {
  if (!val) return '';
  // Remove all non-digits except +
  let str = val.toString().replace(/[^0-9+]/g, '');
  if (str.startsWith('+62')) str = '0' + str.slice(3);
  if (str.startsWith('62')) str = '0' + str.slice(2);
  return str;
};

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${mins}`;
};

export const handleImageUpload = (e, callback, showToast, customMaxWidth = 300, customQuality = 0.7) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 20 * 1024 * 1024) { showToast('Ukuran maksimal gambar 20MB!', 'error'); return; }
    const reader = new FileReader();
      reader.onload = (evt) => {
         const img = new Image();
         img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = customMaxWidth;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) {
               scaleSize = MAX_WIDTH / img.width;
            }
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const isPNG = file.type === 'image/png';
            callback(canvas.toDataURL(isPNG ? 'image/png' : 'image/jpeg', customQuality)); 
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

export const calculateDateRange = (filterMode, offset = 0) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  let label = '';

  const getWeekStart = (d) => {
    const date = new Date(d);
    const day = date.getDay() || 7; 
    if (day !== 1) date.setHours(-24 * (day - 1));
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  if (filterMode === 'Harian' || filterMode === 'Hari Ini' || filterMode === 'hari') {
    start.setDate(now.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
    label = formatDate(start.toISOString());
  } else if (filterMode === 'Mingguan' || filterMode === 'Minggu Ini' || filterMode === 'minggu') {
    start = getWeekStart(now);
    start.setDate(start.getDate() + (offset * 7));
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    label = `${formatDate(start.toISOString())} s/d ${formatDate(end.toISOString())}`;
  } else if (filterMode === 'Bulanan' || filterMode === 'Bulan Ini' || filterMode === 'bulan') {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    end.setHours(23, 59, 59, 999);
    label = start.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  } else if (filterMode === 'Tahunan' || filterMode === 'Tahun Ini' || filterMode === 'tahun') {
    start = new Date(now.getFullYear() + offset, 0, 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(now.getFullYear() + offset, 11, 31);
    end.setHours(23, 59, 59, 999);
    label = `${start.getFullYear()}`;
  } else {
    // Keseluruhan or Manual
    start = new Date(0);
    end = new Date(9999, 11, 31);
    label = 'Semua Waktu';
  }

  return { start, end, label };
};

export const printReceipt = async (elementId) => {
  const printElement = document.getElementById(elementId);
  if (!printElement) return;

  try {
    const clone = printElement.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.height = 'auto'; 
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 3, 
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    document.body.removeChild(clone);
    const imgData = canvas.toDataURL('image/png');

    // Buat iframe tersembunyi agar tidak pernah diblokir oleh popup blocker
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

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
              width: 58mm !important;
              display: block;
              filter: grayscale(100%) contrast(120%);
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" onload="window.setTimeout(function() { window.focus(); window.print(); }, 500);" />
        </body>
      </html>
    `);
    iframeDoc.close();

    // Hapus iframe setelah proses selesai (beri jeda waktu aman)
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000); // Hapus setelah 60 detik

  } catch (error) {
    console.error("Gagal membuat gambar struk:", error);
    alert("Maaf, terjadi kesalahan saat memproses gambar struk.");
  }
};
