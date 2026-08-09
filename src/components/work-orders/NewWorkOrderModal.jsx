import React, { useState } from "react";
import { X, Wrench, User, Phone, FileText, AlertCircle, Plus } from "lucide-react";
import { saveWorkOrder } from "../../services/storageService";

const COMMON_ACCESSORIES = [
  "Cargador / Fuente",
  "Cable de alimentación",
  "Batería",
  "Funda / Estuche",
  "Tarjeta de memoria",
  "Mando / Control remoto"
];

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const newOrder = {
      ...formData,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      spareParts: []
    };

    saveWorkOrder(newOrder);
    if (onSave) onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Nueva Orden de Trabajo</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datos del Cliente</h3>
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
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. +54 9 261..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Datos del Equipo</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Equipo</label>
                <input
                  type="text"
                  required
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej. Mindray DP-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Serie</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Describa la falla indicada por el cliente..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Accesorios Recibidos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_ACCESSORIES.map((item) => (
                <label
                  key={item}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    selectedAccessories.includes(item)
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccessories.includes(item)}
                    onChange={() => handleAccessoryToggle(item)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  {item}
                </label>
              ))}
            </div>

            {/* Input para agregar accesorios personalizados */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Ingresar otro accesorio..."
                value={customAccessory}
                onChange={(e) => setCustomAccessory(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddCustomAccessory}
                className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            {/* Muestra accesorios agregados que no corresponden a la lista estándar */}
            {selectedAccessories.filter((a) => !COMMON_ACCESSORIES.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedAccessories
                  .filter((a) => !COMMON_ACCESSORIES.includes(a))
                  .map((custom) => (
                    <span
                      key={custom}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                    >
                      {custom}
                      <button
                        type="button"
                        onClick={() => handleAccessoryToggle(custom)}
                        className="hover:text-indigo-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Guardar Orden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
