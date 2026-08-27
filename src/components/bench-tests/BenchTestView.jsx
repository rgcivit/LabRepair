import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Trash2, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { compressImage } from '../../services/imageUtils';

/**
 * Componente especializado BenchTestView para la mesa de mediciones de laboratorio.
 * Brinda un diseño industrial y cibernético de ingeniería para registrar y validar parámetros físicos.
 */
export default function BenchTestView({ selectedOT, onSaveOT, inventory, onGeneratePDF }) {
  const [selectedImage, setSelectedImage] = useState(null); // Para el visor de fotos

  // Estado local para almacenar las mediciones de laboratorio
  const [testForm, setTestForm] = useState({
    coolantFlow: '',
    peltierTemp: '',
    vacuumPressure: '',
    voltageNet: '220',
    voltageHV: '24',
    frequency: '50',
    shotCounter: '',
    hoursOfUse: '',
    qcPassed: false,
    rootCauseReport: '',
    internalNotes: '',
    checklist: {},
    repairImages: []
  });

  // Checklist dinámico según tipo de equipo
  const getChecklistTemplate = (type) => {
    const common = ["Prueba de seguridad eléctrica", "Limpieza de chasis", "Ajuste de tornillería"];
    const templates = {
      "Criolipólisis": ["Verificación de vacío (bar)", "Prueba de celdas Peltier", "Nivel de líquido refrigerante", "Filtro de agua"],
      "Láser Diodo": ["Potencia de emisión (J)", "Temperatura de zafiro", "Flujo de agua", "Disparos de prueba"],
      "Radiofrecuencia": ["Prueba de impedancia", "Temperatura de contacto", "Integridad del cabezal"],
      "VelaShape": ["Presión de succión", "Rodillos mecánicos", "Infrarrojo OK"]
    };
    return [...(templates[type] || []), ...common];
  };

  const checklistItems = useMemo(() => getChecklistTemplate(selectedOT?.deviceType), [selectedOT?.deviceType]);

  // Al seleccionar una orden, cargamos sus mediciones preexistentes
  useEffect(() => {
    if (selectedOT) {
      setTestForm({
        coolantFlow: selectedOT.benchTest?.coolantFlow || '',
        peltierTemp: selectedOT.benchTest?.peltierTemp || '',
        vacuumPressure: selectedOT.benchTest?.vacuumPressure || '',
        voltageNet: selectedOT.benchTest?.voltageNet || '220',
        voltageHV: selectedOT.benchTest?.voltageHV || '24',
        frequency: selectedOT.benchTest?.frequency || '50',
        shotCounter: selectedOT.benchTest?.shotCounter || '',
        hoursOfUse: selectedOT.benchTest?.hoursOfUse || '',
        qcPassed: selectedOT.qcPassed || false,
        rootCauseReport: selectedOT.diagnosis || '',
        internalNotes: selectedOT.internalNotes || '',
        checklist: selectedOT.benchTest?.checklist || {},
        repairImages: Array.isArray(selectedOT.repairImages || selectedOT.repair_images) ? (selectedOT.repairImages || selectedOT.repair_images) : []
      });
    }
  }, [selectedOT]);

  if (!selectedOT) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-12 h-12 mx-auto text-slate-700 mb-3 animate-pulse">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
        <p className="text-sm font-bold uppercase text-slate-500 tracking-wider">Mesa de Mediciones Inactiva</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">Selecciona una orden de trabajo activa para montar el equipo sobre el banco técnico.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValue(name, type === 'checkbox' ? checked : value);
  };

  const setFormValue = (name, value) => {
    setTestForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updatedWorkOrder = {
      ...selectedOT,
      diagnosis: testForm.rootCauseReport.trim(),
      internalNotes: testForm.internalNotes.trim(),
      qcPassed: testForm.qcPassed,
      repairImages: testForm.repairImages,
      repair_images: testForm.repairImages,
      status: testForm.qcPassed ? 'LISTO' : (selectedOT.status === 'INGRESO' ? 'EN_DIAGNOSTICO' : selectedOT.status),
      benchTest: {
        coolantFlow: testForm.coolantFlow,
        peltierTemp: testForm.peltierTemp,
        vacuumPressure: testForm.vacuumPressure,
        voltageNet: testForm.voltageNet,
        voltageHV: testForm.voltageHV,
        frequency: testForm.frequency,
        shotCounter: testForm.shotCounter,
        hoursOfUse: testForm.hoursOfUse,
        checklist: testForm.checklist
      }
    };
    onSaveOT(updatedWorkOrder);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-w-4xl mx-auto">
      
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-glow shadow-cyan-400"></span>
            <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Workbench Terminal v2.16</span>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider mt-1">Banco de Ensayos Técnicos</h3>
        </div>

        <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Orden Vinculada</div>
            <div className="text-sm font-mono font-black text-emerald-400">{selectedOT.id}</div>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Equipo</div>
            <div className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">{selectedOT.equipmentName || selectedOT.deviceType}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        
        {/* PARÁMETROS TÉCNICOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase tracking-widest text-[9px] text-slate-500">Hidráulica</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.1" name="coolantFlow" value={testForm.coolantFlow} onChange={handleChange} placeholder="L/min" className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-slate-500 whitespace-nowrap">L/min</span>
            </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase tracking-widest text-[9px] text-slate-500">Temperatura</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.5" name="peltierTemp" value={testForm.peltierTemp} onChange={handleChange} placeholder="°C" className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-slate-500">°C</span>
            </div>
          </div>
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between">
            <label className="text-xs font-bold text-slate-300 block mb-1 uppercase tracking-widest text-[9px] text-slate-500">Presión</label>
            <div className="flex items-center gap-2">
              <input type="number" step="0.01" name="vacuumPressure" value={testForm.vacuumPressure} onChange={handleChange} placeholder="bar" className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-slate-500">bar</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* EVIDENCIA FOTOGRÁFICA */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ImageIcon size={14} className="text-cyan-500" />
            Evidencia Fotográfica del Trabajo Realizado
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {testForm.repairImages.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group cursor-pointer" onClick={() => setSelectedImage(img)}>
                <img src={img} alt="Evidencia" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <ZoomIn className="text-white" size={24} />
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFormValue('repairImages', testForm.repairImages.filter((_, idx) => idx !== i)); }} className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full text-rose-500 hover:bg-rose-600 hover:text-white transition-all z-10">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {testForm.repairImages.length < 15 && (
              <div onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  try {
                    const image = await CapCamera.getPhoto({ quality: 80, resultType: CameraResultType.Base64, source: CameraSource.Prompt });
                    const compressed = await compressImage(`data:image/jpeg;base64,${image.base64String}`, 1024, 0.6);
                    setTestForm(prev => ({ ...prev, repairImages: [...prev.repairImages, compressed] }));
                  } catch (e) {}
                } else { document.getElementById('repair-photo-input')?.click(); }
              }} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-950 hover:border-cyan-500/50 cursor-pointer text-slate-600 transition-all group">
                <Camera size={24} className="group-hover:text-cyan-500 transition-colors" />
                <span className="text-[8px] mt-1 uppercase font-black tracking-widest group-hover:text-cyan-400">Adjuntar</span>
                <input id="repair-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
                  const files = Array.from(e.target.files);
                  const processedImages = [];
                  for (const file of files) {
                    const reader = new FileReader();
                    const result = await new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result);
                      reader.readAsDataURL(file);
                    });
                    const compressed = await compressImage(result, 1024, 0.6);
                    processedImages.push(compressed);
                  }
                  setTestForm(prev => ({ ...prev, repairImages: [...prev.repairImages, ...processedImages] }));
                  e.target.value = ""; // Limpiar input para re-subida
                }} />
              </div>
            )}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* INFORMES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Informe para el Cliente (PDF)</label>
            <textarea name="rootCauseReport" rows="4" required value={testForm.rootCauseReport} onChange={handleChange} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-3 text-xs text-slate-200 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Bitácora Técnica (Privada)</label>
            <textarea name="internalNotes" rows="4" value={testForm.internalNotes} onChange={handleChange} className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-3 text-xs text-cyan-200 font-mono" />
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* CHECKLIST */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Checklist de Control de Calidad (QC)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklistItems.map((item, idx) => (
              <label key={idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${testForm.checklist[item] ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-700'}`}>
                <input type="checkbox" checked={!!testForm.checklist[item]} onChange={(e) => setFormValue('checklist', { ...testForm.checklist, [item]: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
                <span className="text-xs font-bold">{item}</span>
              </label>
            ))}
          </div>
        </div>

        {/* QC OK */}
        <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center border text-lg ${testForm.qcPassed ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' : 'bg-slate-900 text-slate-600 border-slate-800'}`}>{testForm.qcPassed ? '✓' : '✗'}</div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Certificación de Seguridad Eléctrica & QC</h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="qcPassed" checked={testForm.qcPassed} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-white"></div>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button type="button" onClick={() => onGeneratePDF(selectedOT)} disabled={!testForm.qcPassed} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-black text-emerald-400 hover:text-slate-950 bg-emerald-950/20 hover:bg-emerald-400 rounded-lg disabled:opacity-20 transition-all uppercase tracking-wider">
            <ImageIcon size={14} /> <span>Generar Certificado QC (PDF)</span>
          </button>
          <button type="submit" className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg uppercase tracking-wider font-mono shadow-md">Guardar Parámetros de Banco</button>
        </div>

      </form>

      {/* MODAL VISOR DE IMÁGENES */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
            <X size={28} />
          </button>

          <div className="max-w-5xl max-h-screen relative group" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="Ampliada"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain cursor-zoom-in"
              style={{ touchAction: 'pinch-zoom' }}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-[10px] text-slate-300 font-bold uppercase tracking-widest pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
               Vista Previa de Alta Resolución
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
