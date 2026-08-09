import React, { useState } from "react";
import { X, Wrench, User, Phone, Plus, Camera } from "lucide-react";
import { saveWorkOrder } from "../../services/storageService";

const COMMON_ACCESSORIES = [
  "Cargador / Fuente",
  "Cable de alimentación",
  "Batería",
  "Funda / Estuche",
  "Tarjeta de memoria",
  "Mando / Control remoto"
];

// Máximo de fotos permitidas por orden
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
  const [images, setImages] = useState([]); // Estado para guardar las fotos en Base64

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

  // Manejador para subir y convertir imágenes a Base64
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = MAX_IMAGES - images.length;

    if (files.length > remainingSlots) {
      alert(`Solo puedes subir hasta ${MAX_IMAGES} fotos en total.`);
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`El archivo ${file.name} no es una imagen válida.`);
        return;
      }

      // Validación de tamaño opcional (ej. máx 3MB para cuidar el localStorage)
      if (file.size > 3 * 1024 * 1024) {
         alert(`La imagen ${file.name} es muy pesada (máx 3MB).`);
         return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Agrega la imagen en Base64 al estado
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    
    // Limpiar el input para permitir subir la misma foto si se borró
    e.target.value = '';
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newOrder = {
      ...formData,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      images: images, // Guardamos el array de fotos en Base64 en la OT
      spareParts: []
    };

    saveWorkOrder(newOrder);
    if (onSave) onSave();
    onClose();
    // Limpiar estado local al cerrar
    setImages([]);
    setSelectedAccessories([]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-autoselection:bg-indigo-100">
      {/* PANEL DEL MODAL CON FONDO AZUL CLARO/GRISÁCEO (bg-slate-100) */}
      <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
        
        {/* CABECERA (bg-white) */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">Nueva Orden de Trabajo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400"
                    placeholder="Ej. +54 9 261..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos del Equipo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Equipo</label>
                <input
                  type="text"
                  required
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400"
                  placeholder="Ej. Ecógrafo, Balanza..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marca / Modelo</label>
                <input
                  type="text"
                  required
                  value={formData.brandModel}
                  onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400"
                  placeholder="Ej. Mindray DP-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400"
                  placeholder="N/S..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Falla Reportada</label>
              <textarea
                required
                rows={3}
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/40 bg-white text-slate-900 placeholder-slate-400 resize-none"
                placeholder="Describa la falla indicada por el cliente..."
              />
            </div>
          </div>

          {/* Sección de Accesorios y Fotos (bg-white para destacar) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-6 shadow-inner">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Accesorios Recibidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_ACCESSORIES.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                      selectedAccessories.includes(item)
                        ? "bg-indigo-50 border-indigo-200 text-indigo-800 font-medium"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccessories.includes(item)}
                      onChange={() => handleAccessoryToggle(item)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 bg-white"
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
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAccessory}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Sección de Fotos del Equipo (Estado de Recepción) */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                 <Camera className="w-5 h-5 text-indigo-500" />
                 Fotos del Equipo (Estado de Recepción)
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Vista previa de imágenes subidas */}
                {images.map((image, index) => (
                  <div key={index} className="relative group aspect-square bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shadow-inner">
                    <img src={image} alt={`Vista previa ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Botón para subir fotos */}
                {images.length < MAX_IMAGES && (
                  <label className="flex flex-col items-center justify-center aspect-square bg-slate-50 hover:bg-slate-100 rounded-lg border-2 border-slate-300 border-dashed cursor-pointer transition-colors text-center p-2 group">
                    <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-800">Subir Foto</span>
                    <span className="text-[10px] text-slate-500 mt-1">({images.length} / {MAX_IMAGES})</span>
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
              <p className="text-[11px] text-slate-500">Puedes usar la cámara del celular o subir archivos de la PC (Máx. 4). Ayuda a documentar el estado físico inicial.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 bg-white -mx-6 -mb-6 p-6 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
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