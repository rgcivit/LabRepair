/**
 * Comprime una imagen Base64 para reducir su peso antes de subirla a Supabase.
 * @param {string} base64Str - La cadena base64 original.
 * @param {number} maxWidth - Ancho máximo deseado.
 * @param {number} quality - Calidad de compresión (0.1 a 1.0).
 * @returns {Promise<string>} - Nueva cadena base64 comprimida.
 */
export const compressImage = (base64Str, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      return resolve(base64Str);
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calcular nuevas dimensiones manteniendo el aspecto
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir a JPEG comprimido
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = (err) => {
      console.error("Error comprimiendo imagen:", err);
      resolve(base64Str); // Devolver original en caso de error
    };
  });
};
