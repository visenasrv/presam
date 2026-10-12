/* =====================================================================
   image.js — kompres foto di HP hingga ≤ 500 KB (sisi terpanjang ≤ 1600 px)
   ===================================================================== */
'use strict';

const ImageTool = {
  MAX_BYTES: 500 * 1024,
  MAX_SIDE: 1600,

  async decode(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* fallback */ }
    }
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas bukan gambar yang didukung.')); };
      img.src = url;
    });
  },

  toBlob(canvas, q) { return new Promise((r) => canvas.toBlob(r, 'image/jpeg', q)); },

  /** Mengembalikan { blob, dataUrl, width, height, size } */
  async compress(file) {
    const src = await this.decode(file);
    const w0 = src.width, h0 = src.height;
    let scale = Math.min(1, this.MAX_SIDE / Math.max(w0, h0));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let blob = null;
    for (let round = 0; round < 6 && !blob; round++) {
      canvas.width = Math.max(1, Math.round(w0 * scale));
      canvas.height = Math.max(1, Math.round(h0 * scale));
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
      for (const q of [0.82, 0.74, 0.66, 0.58, 0.5]) {
        const b = await this.toBlob(canvas, q);
        if (b && b.size <= this.MAX_BYTES) { blob = b; break; }
      }
      scale *= 0.8;
    }
    if (src.close) src.close();
    if (!blob) throw new Error('Foto tidak dapat dikompres di bawah 500 KB.');
    return { blob, dataUrl: await blobToDataURL(blob), width: canvas.width, height: canvas.height, size: blob.size };
  }
};
