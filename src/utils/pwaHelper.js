export async function generateDynamicManifest() {
  const storeData = JSON.parse(localStorage.getItem('pos_storeInfo')) || {};
  let appName = storeData.name || 'HXPOS Monika';
  const logoBase64 = storeData.logoNota || '';

  // Generate icon using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fill black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let iconDataUrl = '';

  if (logoBase64) {
    try {
      const img = new Image();
      // Need a promise to wait for image load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logoBase64;
      });

      // Calculate size to fit within 512x512 with some padding (e.g., 64px padding)
      const padding = 64;
      const availableSize = 512 - (padding * 2);
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      const ratio = Math.min(availableSize / drawWidth, availableSize / drawHeight);
      
      drawWidth = drawWidth * ratio;
      drawHeight = drawHeight * ratio;

      const x = (512 - drawWidth) / 2;
      const y = (512 - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      iconDataUrl = canvas.toDataURL('image/png');
    } catch (e) {
      console.error('Error generating dynamic icon:', e);
      // Fallback: just use black background if image fails
      iconDataUrl = canvas.toDataURL('image/png');
    }
  } else {
    // If no logo, maybe draw some text 'HX'
    ctx.fillStyle = '#D4AF37'; // Gold
    ctx.font = 'bold 200px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HX', 256, 256);
    iconDataUrl = canvas.toDataURL('image/png');
  }

  // Set Apple Touch Icon
  const appleIcon = document.getElementById('dynamic-apple-icon');
  if (appleIcon) appleIcon.href = iconDataUrl;

  // Generate Manifest JSON
  const manifest = {
    name: appName,
    short_name: appName.length > 12 ? appName.substring(0, 12) : appName,
    description: storeData.tagline || 'Point of Sale System',
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#18181b",
    icons: [
      {
        src: iconDataUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: iconDataUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };

  const stringManifest = JSON.stringify(manifest);
  const blob = new Blob([stringManifest], { type: 'application/manifest+json' });
  const manifestUrl = URL.createObjectURL(blob);
  
  const manifestLink = document.getElementById('dynamic-manifest');
  if (manifestLink) {
    manifestLink.href = manifestUrl;
  }
}
