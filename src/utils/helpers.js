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

export const formatDate = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const handleImageUpload = (e, callback, showToast, customMaxWidth = 300, customQuality = 0.7) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) { showToast('Ukuran maksimal gambar 5MB!', 'error'); return; }
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
          callback(canvas.toDataURL('image/jpeg', customQuality)); 
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

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      alert("Pop-up diblokir! Tolong izinkan browser untuk membuka pop-up.");
      return;
    }

    printWindow.document.write(`
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
              /* Filter diturunkan jadi 120% agar watermark abu-abu tetap terlihat */
              filter: grayscale(100%) contrast(120%);
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
          <img src="${imgData}" />
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();

  } catch (error) {
    console.error("Gagal membuat gambar struk:", error);
    alert("Maaf, terjadi kesalahan saat memproses gambar struk.");
  }
};
