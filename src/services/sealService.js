import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Genera la faja de seguridad/garantía con fecha y número de orden dinámicos.
 * @param {Object} order - Datos de la orden de trabajo.
 */
export const generateSecuritySeal = async (order) => {
  if (!order) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  // Cargamos la plantilla desde la carpeta pública
  img.src = '/faja de garantia.png';

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      // Ajustamos el canvas al tamaño original de la imagen
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujamos la plantilla base
      ctx.drawImage(img, 0, 0);

      // --- CONFIGURACIÓN DE TEXTO ---
      // Estilo de fuente industrial/mono
      ctx.fillStyle = 'black';

      // 1. FECHA (Ubicación: Justo después de "FECHA: ")
      const dateText = new Date().toLocaleDateString('es-AR');
      ctx.font = 'bold 32px Arial'; // Un poco más grande para legibilidad
      ctx.textAlign = 'left';
      // Coordenadas para encuadrar en el espacio en blanco de la línea FECHA
      ctx.fillText(dateText, canvas.width * 0.35, canvas.height * 0.525);

      // 2. NÚMERO DE ORDEN (Debajo del código de barras, centrado)
      const orderId = order.id || order.order_id || 'S/D';
      ctx.font = 'black 40px "Courier New", monospace';
      ctx.textAlign = 'center';
      // Ubicación centrada en la base de la faja (donde borraste el número largo)
      ctx.fillText(orderId, canvas.width * 0.5, canvas.height * 0.94);

      // --- EXPORTACIÓN Y COMPARTICIÓN ---
      const base64Image = canvas.toDataURL('image/png');
      const filename = `Faja_${orderId}.png`;

      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = base64Image.split(',')[1];
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          });

          const fileUri = await Filesystem.getUri({
            directory: Directory.Cache,
            path: filename
          });

          // Compartir con "Fun Print" u otras apps
          await Share.share({
            title: 'Faja de Garantía LabRepair',
            text: 'Impresión de faja de seguridad.',
            url: fileUri.uri,
            dialogTitle: 'Enviar a Fun Print'
          });
          resolve(true);
        } catch (error) {
          console.error('Error compartiendo faja:', error);
          reject(error);
        }
      } else {
        // Navegador: Descarga directa
        const link = document.createElement('a');
        link.download = filename;
        link.href = base64Image;
        link.click();
        resolve(true);
      }
    };

    img.onerror = (err) => {
      console.error("Error cargando plantilla de faja:", err);
      alert("No se encontró la plantilla 'faja de garantia.png' en la carpeta public.");
      reject(err);
    };
  });
};
