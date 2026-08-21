import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  useEffect(() => {
    if (!isOpen) return;

    // Crear el scanner
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });

    const onScan = (decodedText) => {
      // Si el código es una URL (de nuestras fajas), extraer la OT
      let result = decodedText;
      if (decodedText.includes('/status/')) {
        result = decodedText.split('/status/')[1];
      }

      onScanSuccess(result);
      scanner.clear();
      onClose();
    };

    const onError = (err) => {
      // Ignorar errores de "no se encuentra QR en este frame"
    };

    scanner.render(onScan, onError);

    return () => {
      scanner.clear().catch(error => console.error("Fallo limpieza de scanner:", error));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">

        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-xl">
              <Camera className="text-cyan-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Escáner Óptico</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Apunta al código QR de la faja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-black aspect-square flex items-center justify-center">
          <div id="reader" className="w-full"></div>
        </div>

        <div className="p-6 bg-slate-950/50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            El sistema detectará automáticamente el código OT y lo cargará en el buscador principal.
          </p>
        </div>

      </div>
    </div>
  );
}
