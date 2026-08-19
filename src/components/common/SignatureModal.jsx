import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { X, Trash2, Check } from 'lucide-react';

export default function SignatureModal({ isOpen, onClose, onSave, title = "Firma del Cliente" }) {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });
      signaturePadRef.current.clear();

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvasRef.current.width = canvasRef.current.offsetWidth * ratio;
      canvasRef.current.height = canvasRef.current.offsetHeight * ratio;
      canvasRef.current.getContext("2d").scale(ratio, ratio);
    }
  }, [isOpen, title]);

  if (!isOpen) return null;

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  const handleSave = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert("Por favor, firme antes de guardar.");
      return;
    }
    const dataUrl = signaturePadRef.current.toDataURL();
    onSave(dataUrl);
    // IMPORTANTE: No llamamos a onClose() aquí, dejamos que el padre decida.
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-slate-100 select-none">
          <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner h-96 touch-none">
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none cursor-crosshair"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-3 text-center uppercase font-bold">Firme dentro del recuadro con el dedo o lápiz óptico</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Limpiar
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 uppercase tracking-wider"
            >
              <Check className="w-4 h-4" /> Confirmar Firma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
