export async function generateDynamicManifest(tenantId = null, directStoreInfo = null) {
  let storeData = directStoreInfo;
  if (!storeData) {
    try {
      const cached = tenantId 
        ? localStorage.getItem(`mmpos_storeInfo_${tenantId}`) || localStorage.getItem('mmpos_storeInfo') || localStorage.getItem('pos_storeInfo')
        : localStorage.getItem('mmpos_storeInfo') || localStorage.getItem('pos_storeInfo');
      if (cached) storeData = JSON.parse(cached);
    } catch (e) {}
  }
  storeData = storeData || {};

  const rawName = storeData.name || (tenantId ? tenantId.charAt(0).toUpperCase() + tenantId.slice(1) : 'TOKOTO');
  const appName = rawName.toUpperCase().includes('POS') ? rawName : `${rawName} POS`;
  const shortName = rawName.length > 12 ? rawName.substring(0, 12) : rawName;
  const logoBase64 = storeData.logo || storeData.logoNota || '';

  // Update dynamic page title
  if (typeof document !== 'undefined') {
    document.title = `${appName} | Tokoto`;
  }

  let iconDataUrl = '';
  const isRemoteLogo = logoBase64 && (logoBase64.startsWith('http://') || logoBase64.startsWith('https://'));

  if (isRemoteLogo) {
    // Jika logo adalah URL remote (misal Firebase Storage), gunakan langsung tanpa canvas
    // Ini 100% mencegah error CORS (net::ERR_FAILED) dan SecurityError tainted canvas
    iconDataUrl = logoBase64;
  } else {
    try {
      // Generate icon using canvas (512x512)
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Fill dark background
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (logoBase64 && logoBase64.startsWith('data:image')) {
        try {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoBase64;
          });

          const padding = 70;
          const availableSize = 512 - (padding * 2);
          const ratio = Math.min(availableSize / img.width, availableSize / img.height);
          const drawWidth = img.width * ratio;
          const drawHeight = img.height * ratio;
          const x = (512 - drawWidth) / 2;
          const y = (512 - drawHeight) / 2;

          ctx.drawImage(img, x, y, drawWidth, drawHeight);
        } catch (e) {
          drawMonogram(ctx, rawName);
        }
      } else {
        drawMonogram(ctx, rawName);
      }

      // 2. Draw Tokoto Co-Branding Badge in the bottom-right corner
      try {
        const tokotoIcon = new Image();
        await new Promise((resolve, reject) => {
          tokotoIcon.onload = resolve;
          tokotoIcon.onerror = reject;
          tokotoIcon.src = '/logo-icon.webp';
        });

        const badgeCenterX = 405;
        const badgeCenterY = 405;
        const badgeRadius = 78;

        // Badge shadow & background
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(badgeCenterX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#D4AF37';
        ctx.stroke();
        ctx.restore();

        // Clip & draw Tokoto logo inside the circular badge
        ctx.save();
        ctx.beginPath();
        ctx.arc(badgeCenterX, badgeCenterY, badgeRadius - 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        const iconSize = (badgeRadius - 4) * 2;
        ctx.drawImage(tokotoIcon, badgeCenterX - (iconSize / 2), badgeCenterY - (iconSize / 2), iconSize, iconSize);
        ctx.restore();
      } catch (badgeErr) {
        // Fallback badge
      }

      iconDataUrl = canvas.toDataURL('image/png');
    } catch (err) {
      iconDataUrl = '/logo-icon.webp';
    }
  }

  // Simpan tenant yang aktif ke localStorage agar PWA standalone tahu toko mana yang dibuka
  if (tenantId) {
    try {
      localStorage.setItem('tokoto_last_tenant', tenantId);
      localStorage.setItem('mmpos_last_tenant', tenantId);
    } catch (e) {}
  }

  // Set Apple Touch Icon
  const appleIcon = document.getElementById('dynamic-apple-icon');
  if (appleIcon && iconDataUrl) {
    appleIcon.href = iconDataUrl;
  }

  // Generate Manifest JSON with proper tenant start_url, id, and root scope
  const startUrl = tenantId ? `/${tenantId}` : "/";
  const manifest = {
    id: tenantId ? `/${tenantId}` : "/",
    name: appName,
    short_name: shortName,
    description: storeData.tagline || `Aplikasi Kasir POS ${rawName} - Didukung oleh Tokoto.id`,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#18181b",
    theme_color: "#18181b",
    icons: [
      {
        src: iconDataUrl || "/logo-icon.webp",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/logo-icon.webp",
        sizes: "192x192",
        type: "image/webp",
        purpose: "any maskable"
      }
    ]
  };

  // Untuk toko utama (Monika Mulya), pastikan link manifest merujuk ke file statis resmi /manifest.json
  // Chrome Android hanya memicu beforeinstallprompt jika manifest berasal dari URL HTTP/HTTPS yang valid
  if (!tenantId || tenantId === 'monikamulya') {
    const link = document.getElementById('dynamic-manifest');
    if (link && link.getAttribute('href') !== '/manifest.json') {
      link.href = '/manifest.json';
    }
    return;
  }

  try {
    const stringManifest = JSON.stringify(manifest);
    // Data URI hanya digunakan jika tenant lain memiliki branding custom
    const dataUriManifest = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(stringManifest);
    
    const oldLink = document.getElementById('dynamic-manifest');
    if (oldLink) {
      oldLink.remove();
    }
    const newLink = document.createElement('link');
    newLink.id = 'dynamic-manifest';
    newLink.rel = 'manifest';
    newLink.href = dataUriManifest;
    document.head.appendChild(newLink);
  } catch (manifestErr) {
    console.warn('Gagal memperbarui dynamic manifest link:', manifestErr);
  }
}

function drawMonogram(ctx, storeName) {
  const initial = storeName ? storeName.charAt(0).toUpperCase() : 'T';
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(256, 256, 150, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#18181b';
  ctx.font = 'bold 160px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 256, 260);
  ctx.restore();
}
