// Convierte una imagen elegida por la persona en un data URL JPEG chico,
// para poder guardarla sin servidor de archivos (foto de perfil, imágenes
// del chat). Se reduce en el navegador con un <canvas>; nunca se guarda el
// archivo original.

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Elegí un archivo de imagen (JPG, PNG o WebP).')); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo abrir la imagen. Probá con otra.')); };
    image.src = url;
  });
}

/**
 * @param {File} file
 * @param {{ maxSize?: number, square?: boolean, maxChars?: number }} options
 *   square: recorta al centro (foto de perfil). maxChars: tamaño máximo del
 *   data URL; si se pasa, se baja la calidad hasta que entre.
 */
export async function imageFileToDataUrl(file, { maxSize = 256, square = false, maxChars = 200_000 } = {}) {
  const image = await loadImage(file);
  let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; sw = side; sh = side;
  }
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= maxChars) return dataUrl;
  }
  throw new Error('La imagen es demasiado grande. Probá con otra más simple.');
}
