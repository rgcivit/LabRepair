import React, { useState } from "react";
import { X, Wrench, User, Phone, Plus, Camera, Trash2 } from "lucide-react";
import { saveWorkOrder } from "../../services/storageService";

const COMMON_ACCESSORIES = [
  "Cargador / Fuente",
  "Cable de alimentación",
  "Batería",
  "Funda / Estuche",
  "Tarjeta de memoria",
  "Mando / Control remoto"
];

const MAX_IMAGES = 4;

export const NewWorkOrderModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    deviceType: "",
    brandModel: "",
    serialNumber: "",
    issueDescription: "",
    estimatedBudget: "",
    priority: "MEDIA"
  });

  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [customAccessory, setCustomAccessory] = useState("");
  const [images, setImages] = useState([]);

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

      if (file.size > 3 * 1024 * 1024) {
        alert(`La imagen ${file.name} es muy pesada (máx 3MB).`);
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
    
    if (!formData.clientName || !formData.deviceType) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }

    const newOrder = {
      ...formData,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      images: images,
      spareParts: []
    };

    try {
      saveWorkOrder(newOrder);
      if (onSave) onSave();
      onClose();
      
      // Limpiar campos
      setImages([]);
      setSelectedAccessories([]);
      setFormData({
        clientName: "",
        clientPhone: "",
        deviceType: "",
        brandModel: "",
        serialNumber: "",
        issueDescription: "",
        estimatedBudget: "",
        priority: "MEDIA"
      });
    } catch (err) {
      alert("Error al guardar la orden: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* PANEL PRINCIPAL DEL MODAL */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 text-slate-800">
        
        {/* ENCABEZADO */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-200">
              <Wrench className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Nueva Orden de Trabajo</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* DATOS DEL CLIENTE */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50"
                    placeholder="Ej. (432) 356-1688"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DATOS DEL EQUIPO */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datos del Equipo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Equipo *</label>
                <input
                  type="text"
                  required
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50"
                  placeholder="Tipo de Equipo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Marca / Modelo</label>
                <input
                  type="text"
                  required
                  value={formData.brandModel}
                  onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50"
                  placeholder="Ej. Mindray DP-10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50"
                  placeholder="N/S..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Falla Reportada</label>
              <textarea
                required
                rows={3}
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-sm text-slate-900 placeholder-slate-400 bg-slate-50/50 resize-none"
                placeholder="Describa la falla indicando lo reportado..."
              />
            </div>
          </div>

          {/* ACCESORIOS RECIBIDOS */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accesorios Recibidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_ACCESSORIES.map((item) => (
                <label
                  key={item}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedAccessories.includes(item)
                      ? "bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold shadow-sm"
                      : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span>{item}</span>
                  <input
                    type="checkbox"
                    checked={selectedAccessories.includes(item)}
                    onChange={() => handleAccessoryToggle(item)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Ingresar otro accesorio..."
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={handleAddCustomAccessory}
                className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
          </div>

          {/* FOTOS DEL EQUIPO (ÁREA ÁREA PRINCIPAL DRAG & DROP / BOTÓN) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fotos del Equipo</h3>
            
            {/* VISTA PREVIA DE FOTOS SUBIDAS */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden group shadow-sm">
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-slate-900/70 hover:bg-rose-600 text-white rounded-full transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ZONA DE CARGA CON ÍCONO DE CÁMARA */}
            {images.length < MAX_IMAGES && (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group text-center">
                <div className="p-3 bg-cyan-50 rounded-full text-cyan-500 group-hover:scale-110 transition-transform mb-2">
                  <Camera className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-slate-700">Tomar foto o subir desde archivos</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Click para capturar o seleccionar fotos ({images.length}/{MAX_IMAGES})
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

          {/* PIE Y BOTÓN GUARDAR */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              Guardar Orden
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NewWorkOrderModal;