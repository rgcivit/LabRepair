
const fs = require("fs");
const path = require("path");

const targetFolder = path.join("src", "components", "work-orders");
if (!fs.existsSync(targetFolder)) {
  fs.mkdirSync(targetFolder, { recursive: true });
}

const filePath = path.join(targetFolder, "NewWorkOrderModal.jsx");

const code = `import React, { useState } from "react";
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
      alert("Solo puedes subir hasta " + MAX_IMAGES + " fotos por orden.");
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith("image/")) {
        alert("El archivo " + file.name + " no es una imagen válida.");
        return;
      }

      if (file.size > 3 * 1024 * 1024) {
        alert("La imagen " + file.name + " pesa más de 3MB. Elige una más liviana.");
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
    const newOrder = {
      ...formData,
      equipmentName: formData.brandModel ? formData.deviceType + " " + formData.brandModel : formData.deviceType,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      images: images,
      spareParts: []
    };

    saveWorkOrder(newOrder);
    if (onSave) onSave();
    onClose();
    setImages([]);
    setSelectedAccessories([]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"/></svg>
            <h2 className="text-xl font-bold text-white">Nueva Orden de Trabajo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-900 rounded-lg transition-colors text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ej. Clínica Mendoza"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ej. +54 9 261..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Datos del Equipo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tipo de Aparatología</label>
                <input
                  type="text"
                  required
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ej. Ecógrafo, Láser..."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Marca / Modelo</label>
                <input
                  type="text"
                  required
                  value={formData.brandModel}
                  onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ej. Mindray DP-10"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="N/S..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Falla Reportada</label>
              <textarea
                required
                rows={3}
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="Describa la falla expresada por el cliente..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Accesorios Recibidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_ACCESSORIES.map((item) => (
                <label
                  key={item}
                  className={"flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors " +
                    (selectedAccessories.includes(item)
                      ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-medium"
                      : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900")}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccessories.includes(item)}
                    onChange={() => handleAccessoryToggle(item)}
                    className="rounded text-cyan-500 focus:ring-cyan-500 bg-slate-950 border-slate-800"
                  />
                  {item}
                </label>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ingresar otro accesorio no listado..."
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddCustomAccessory}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg border border-slate-700"
              >
                + Agregar
              </button>
            </div>
          </div>

          {/* SECCIÓN DE REGISTRO FOTOGRÁFICO DE RECEPCIÓN */}
          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              ?? Fotos de Estado de Recepción
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                  <img src={image} alt={"Foto " + (index + 1)} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-slate-950/80 hover:bg-rose-950 rounded-full text-rose-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <label className="flex flex-col items-center justify-center aspect-square bg-slate-900/40 hover:bg-slate-900 rounded-lg border-2 border-slate-800 border-dashed cursor-pointer transition-colors text-center p-2 group">
                  <svg className="w-7 h-7 text-slate-500 group-hover:text-cyan-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <span className="text-xs font-semibold text-slate-300">Subir Foto</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">({images.length} / {MAX_IMAGES})</span>
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
            <p className="text-[11px] text-slate-500">Puedes tomar la foto directo con la cámara del celular o seleccionar archivos de la PC (Máx. 4 fotos).</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-lg"
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
`;

fs.writeFileSync(filePath, code, "utf8");
console.log("? Modal actualizado exitosamente con soporte para subir/tomar fotos.");

