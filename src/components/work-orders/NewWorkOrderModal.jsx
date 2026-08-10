import React, { useState } from "react";
import { X, Wrench, User, Phone, Plus, Camera, Trash2, FileCheck } from "lucide-react";
import { saveWorkOrder } from "../../services/storageService";
import { generateEntryReceipt } from "../../services/pdfService";
import SignatureModal from "../common/SignatureModal";

const COMMON_ACCESSORIES = [
  "Cable de Poder",
  "Pedal de Disparo",
  "Cabezal / Aplicador",
  "Gafas de Protección",
  "Manual de Usuario",
  "Embudo de Carga",
  "Estuche / Maletín"
];

const DEVICE_TYPES = [
  "Criolipólisis",
  "VelaShape",
  "Electroporador",
  "Radiofrecuencia",
  "Ultrasonido",
  "Láser de Diodo",
  "Ondas de Choque",
  "Presoterapia",
  "Dermapen",
  "Otros"
];

const BRANDS = [
  "Meditea",
  "Electromedicina Morales",
  "Body Health",
  "Sveltia",
  "Starbene",
  "Cec",
  "Texel",
  "Sorisa",
  "Otros"
];

const PRIORITIES = ["BAJA", "MEDIA", "ALTA"];

const MAX_IMAGES = 4;

const NewWorkOrderModal = ({ isOpen, onClose, onSave, existingOrders = [] }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    deviceType: "",
    customDeviceType: "",
    brandModel: "",
    customBrandModel: "",
    serialNumber: "",
    issueDescription: "",
    estimatedBudget: "",
    priority: "MEDIA"
  });

  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [customAccessory, setCustomAccessory] = useState("");
  const [images, setImages] = useState([]);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [tempOrderData, setTempOrderData] = useState(null);

  if (!isOpen) return null;

  const handleAccessoryToggle = (accessory) => {
    if (selectedAccessories.includes(accessory)) {
      setSelectedAccessories(selectedAccessories.filter((a) => a !== accessory));
    } else {
      setSelectedAccessories([...selectedAccessories, accessory]);
    }
  };

  const handleAddCustomAccessory = (e) => {
    e.preventDefault();
    if (customAccessory.trim() && !selectedAccessories.includes(customAccessory.trim())) {
      setSelectedAccessories([...selectedAccessories, customAccessory.trim()]);
      setCustomAccessory("");
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = MAX_IMAGES - images.length;

    if (files.length > remainingSlots) {
      alert(`Solo puedes subir hasta ${MAX_IMAGES} fotos en total.`);
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith("image/")) {
        alert(`El archivo ${file.name} no es una imagen válida.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalDeviceType = formData.deviceType === "Otros" ? formData.customDeviceType : formData.deviceType;
    const finalBrandModel = formData.brandModel === "Otros" ? formData.customBrandModel : formData.brandModel;

    if (!formData.clientName || !finalDeviceType) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const newOrder = {
      ...formData,
      deviceType: finalDeviceType,
      brandModel: finalBrandModel,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      images: images,
      spareParts: []
    };

    delete newOrder.customDeviceType;
    delete newOrder.customBrandModel;

    // Abrimos el modal de firma antes de guardar definitivamente
    setTempOrderData(newOrder);
    setIsSignatureModalOpen(true);
  };

  const handleFinishWithSignature = async (signatureBase64) => {
    try {
      const orderToSave = { ...tempOrderData, clientSignature: signatureBase64 };
      // Notar el await aquí para Supabase
      await saveWorkOrder(orderToSave);

      // Generar y compartir el comprobante PDF
      await generateEntryReceipt(orderToSave, signatureBase64);

      if (onSave) onSave(orderToSave);
      onClose();
      
      // Reset
      setImages([]);
      setSelectedAccessories([]);
      setFormData({
        clientName: "",
        clientPhone: "",
        deviceType: "",
        customDeviceType: "",
        brandModel: "",
        customBrandModel: "",
        serialNumber: "",
        issueDescription: "",
        estimatedBudget: "",
        priority: "MEDIA"
      });
      setTempOrderData(null);
    } catch (err) {
      alert("Error al procesar el ingreso: " + err.message);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        {/* MODAL - FONDO AZUL PROFUNDO */}
        <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-slate-700 text-slate-100 selection:bg-cyan-500/30">

          {/* HEADER */}
          <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl text-white shadow-lg">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Nuevo Ingreso</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Registro de Orden Técnica</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* SECCIÓN CLIENTE */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Datos del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre Completo *</label>
                  <div className="relative group">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-700 transition-all outline-none"
                      placeholder="Ej. Juan Perez"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teléfono de Contacto *</label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                      type="tel"
                      required
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-700 transition-all outline-none"
                      placeholder="Ej. +54 9 261 ..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN EQUIPO */}
            <div className="space-y-4 pt-2">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Datos Técnicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Equipo *</label>
                  <select
                    required
                    value={formData.deviceType}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 cursor-pointer appearance-none outline-none transition-all"
                  >
                    <option value="">-- Seleccionar --</option>
                    {DEVICE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {formData.deviceType === "Otros" && (
                    <input
                      type="text"
                      required
                      placeholder="Especificar equipo..."
                      value={formData.customDeviceType}
                      onChange={(e) => setFormData({ ...formData, customDeviceType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/50 rounded-xl text-xs text-slate-100 mt-2 animate-fadeIn outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marca / Modelo *</label>
                  <select
                    required
                    value={formData.brandModel}
                    onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 cursor-pointer appearance-none outline-none transition-all"
                  >
                    <option value="">-- Seleccionar --</option>
                    {BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                  {formData.brandModel === "Otros" && (
                    <input
                      type="text"
                      required
                      placeholder="Especificar marca..."
                      value={formData.customBrandModel}
                      onChange={(e) => setFormData({ ...formData, customBrandModel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-cyan-500/50 rounded-xl text-xs text-slate-100 mt-2 animate-fadeIn outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Número de Serie *</label>
                  <input
                    type="text"
                    required
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-700 outline-none transition-all"
                    placeholder="N/S..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prioridad del Servicio *</label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 cursor-pointer appearance-none outline-none transition-all"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Falla Reportada e Inspección</label>
                <textarea
                  required
                  rows={3}
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 text-sm text-slate-100 placeholder-slate-700 resize-none outline-none transition-all"
                  placeholder="Describa los síntomas reportados..."
                />
              </div>
            </div>

            {/* ACCESORIOS */}
            <div className="space-y-4 pt-2">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Accesorios Recibidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_ACCESSORIES.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center justify-between p-3 rounded-xl border text-[11px] cursor-pointer transition-all ${
                      selectedAccessories.includes(item)
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-bold"
                        : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <span>{item}</span>
                    <input
                      type="checkbox"
                      checked={selectedAccessories.includes(item)}
                      onChange={() => handleAccessoryToggle(item)}
                      className="h-4 w-4 rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Añadir accesorio manual..."
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:ring-1 focus:ring-cyan-500/50 text-slate-300 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAccessory}
                  className="px-4 py-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-700 flex items-center gap-2 uppercase tracking-tighter transition-all"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>

            {/* FOTOS - CAMPO DE ADJUNTO */}
            <div className="space-y-4 pt-2">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] border-l-2 border-cyan-500 pl-3">Evidencia Fotográfica</h3>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl group">
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < MAX_IMAGES && (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/50 hover:bg-slate-900/50 hover:border-cyan-500/40 transition-all cursor-pointer group">
                  <div className="p-4 bg-cyan-500/10 rounded-full text-cyan-500 mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="w-8 h-8" />
                  </div>
                  <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Tomar o Adjuntar Fotos</span>
                  <span className="text-[9px] text-slate-600 mt-2 uppercase font-bold">
                    Hasta {MAX_IMAGES} capturas • JPG / PNG
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* ACCIONES */}
            <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-10 py-3 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl shadow-xl shadow-cyan-500/10 active:scale-95 transition-all uppercase tracking-[0.15em] flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" /> Guardar Ingreso
              </button>
            </div>

          </form>
        </div>

        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={handleFinishWithSignature}
          title="Firma de Recepción (Cliente)"
        />
      </div>
    </>
  );
};

export default NewWorkOrderModal;
