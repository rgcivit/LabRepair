import React, { useState } from "react";
import { X, Wrench, User, Phone, Plus, Camera, Trash2, FileCheck } from "lucide-react";
import { saveWorkOrder } from "../../services/storageService";
import { generateEntryReceipt } from "../../services/pdfService";
import SignatureModal from "../common/SignatureModal";
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const COMMON_ACCESSORIES = [
  "Cable de Poder", "Pedal de Disparo", "Cabezal / Aplicador", "Gafas de Protección",
  "Manual de Usuario", "Embudo de Carga", "Estuche / Maletín"
];

const DEVICE_TYPES = [
  "Criolipólisis", "VelaShape", "Electroporador", "Radiofrecuencia",
  "Ultrasonido", "Láser de Diodo", "Ondas de Choque", "Presoterapia",
  "Dermapen", "Otros"
];

const BRANDS = [
  "Meditea", "Electromedicina Morales", "Body Health", "Sveltia",
  "Starbene", "Cec", "Texel", "Sorisa", "Otros"
];

const PRIORITIES = ["BAJA", "MEDIA", "ALTA", "URGENTE"];
const STATUSES = [
  { id: "INGRESO", label: "Ingreso" },
  { id: "EN_DIAGNOSTICO", label: "En Diagnóstico" },
  { id: "PRESUPUESTADO", label: "Presupuestado" },
  { id: "ESPERANDO_REPUESTO", label: "Esperando Repuesto" },
  { id: "EN_PRUEBAS", label: "En Pruebas" },
  { id: "LISTO", label: "Listo" },
  { id: "ENTREGADO", label: "Entregado" }
];
const MAX_IMAGES = 4;

const NewWorkOrderModal = ({ isOpen, onClose, onSave, editingOrder, clients = [], onSaveClient }) => {
  const [formData, setFormData] = React.useState({
    clientName: "", clientPhone: "", deviceType: "", customDeviceType: "",
    brandModel: "", customBrandModel: "", serialNumber: "", issueDescription: "",
    cosmeticCondition: "", estimatedBudget: "", priority: "MEDIA", status: "INGRESO"
  });

  const [selectedAccessories, setSelectedAccessories] = React.useState([]);
  const [images, setImages] = React.useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = React.useState(false);

  // Gestión de firmas
  const [isSignatureModalOpen, setIsSignatureModalOpen] = React.useState(false);
  const [signatureType, setSignatureType] = React.useState("CLIENT");
  const [clientSig, setClientSig] = React.useState(null);
  const [tempOrder, setTempOrder] = React.useState(null);
  const [customAccessory, setCustomAccessory] = React.useState("");

  // Sugerencias de clientes
  const filteredClients = React.useMemo(() => {
    if (!clients || !Array.isArray(clients)) return [];
    const q = (formData.clientName || "").toLowerCase().trim();
    if (q.length === 0) return [];

    return clients.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [clients, formData.clientName]);

  // Cargar datos si estamos editando
  React.useEffect(() => {
    if (!isOpen) return;

    if (editingOrder) {
      const isCustomType = !DEVICE_TYPES.includes(editingOrder.deviceType);
      const isCustomBrand = !BRANDS.includes(editingOrder.brandModel);

      setFormData({
        clientName: editingOrder.clientName || "",
        clientPhone: editingOrder.clientPhone || "",
        deviceType: isCustomType ? "Otros" : (editingOrder.deviceType || ""),
        customDeviceType: isCustomType ? editingOrder.deviceType : "",
        brandModel: isCustomBrand ? "Otros" : (editingOrder.brandModel || ""),
        customBrandModel: isCustomBrand ? editingOrder.brandModel : "",
        serialNumber: editingOrder.serialNumber || "",
        issueDescription: editingOrder.issueDescription || "",
        cosmeticCondition: editingOrder.cosmeticCondition || "",
        estimatedBudget: editingOrder.estimatedBudget || "",
        priority: editingOrder.priority || "MEDIA",
        status: editingOrder.status || "INGRESO"
      });
      setSelectedAccessories(Array.isArray(editingOrder.accessories) ? editingOrder.accessories : []);
      setImages(Array.isArray(editingOrder.images) ? editingOrder.images : []);
    } else {
      setFormData({
        clientName: "", clientPhone: "", deviceType: "", customDeviceType: "",
        brandModel: "", customBrandModel: "", serialNumber: "", issueDescription: "",
        cosmeticCondition: "", estimatedBudget: "", priority: "MEDIA", status: "INGRESO"
      });
      setSelectedAccessories([]);
      setImages([]);
    }
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const handleAccessoryToggle = (acc) => {
    setSelectedAccessories(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(acc) ? current.filter(a => a !== acc) : [...current, acc];
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const currentImages = Array.isArray(images) ? images : [];
    const available = MAX_IMAGES - currentImages.length;

    files.slice(0, available).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...(Array.isArray(prev) ? prev : []), reader.result]);
      reader.readAsDataURL(file);
    });
    e.target.value = ""; // Reset input
  };

  const handleCapturePhoto = async () => {
    const currentImages = Array.isArray(images) ? images : [];
    if (currentImages.length >= MAX_IMAGES) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt
        });
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        setImages(prev => [...(Array.isArray(prev) ? prev : []), imageUrl]);
      } catch (err) {
        console.error("Error al capturar foto:", err);
      }
    } else {
      document.getElementById('hidden-photo-input')?.click();
    }
  };

  const removeImage = (idx) => setImages(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== idx));

  // Función constructora del objeto con soporte Dual (camelCase + snake_case)
  const buildOrderData = () => {
    const type = formData.deviceType === "Otros" ? formData.customDeviceType : formData.deviceType;
    const brand = formData.brandModel === "Otros" ? formData.customBrandModel : formData.brandModel;
    const orderId = editingOrder?.id || `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = editingOrder?.entryDate || new Date().toISOString().split("T")[0];

    return {
      id: orderId,
      order_id: orderId,
      
      clientName: formData.clientName,
      client_name: formData.clientName,
      
      clientPhone: formData.clientPhone,
      client_phone: formData.clientPhone,
      
      deviceType: type,
      device_type: type,
      
      brandModel: brand,
      brand_model: brand,
      
      serialNumber: formData.serialNumber,
      serial_number: formData.serialNumber,
      
      issueDescription: formData.issueDescription,
      issue_description: formData.issueDescription,

      cosmeticCondition: formData.cosmeticCondition,
      cosmetic_condition: formData.cosmeticCondition,

      priority: formData.priority,
      status: formData.status,
      
      entryDate: today,
      entry_date: today,
      
      accessories: Array.isArray(selectedAccessories) ? selectedAccessories : [],
      images: Array.isArray(images) ? images : [],
      spareParts: [],
      spare_parts: []
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.clientName || !formData.deviceType) return alert("Complete los campos obligatorios.");

    const newOrder = buildOrderData();
    setTempOrder(newOrder);
    setSignatureType("CLIENT");
    setIsSignatureModalOpen(true);
  };

  const handleSaveWithoutSignatures = async () => {
    const isOtherType = formData.deviceType === "Otros";
    const isOtherBrand = formData.brandModel === "Otros";

    const type = isOtherType ? formData.customDeviceType : formData.deviceType;
    const brand = isOtherBrand ? formData.customBrandModel : formData.brandModel;

    if (!formData.clientName || !type || (isOtherType && !formData.customDeviceType) || (isOtherBrand && !formData.customBrandModel)) {
      return alert("Complete los campos obligatorios. Si seleccionó 'Otros', debe especificar el valor.");
    }

    const newOrder = buildOrderData();
    // Forzamos que guarde sin firmas
    await finalizeOrder(null, null, newOrder);
  };

  const handleSignatureSave = async (signature) => {
    if (signatureType === "CLIENT") {
      setClientSig(signature);
      setSignatureType("TECH");
    } else {
      await finalizeOrder(clientSig, signature, tempOrder);
    }
  };

  const finalizeOrder = async (cSig, tSig, orderToSave) => {
    const order = orderToSave || tempOrder;
    if (!order) return alert("Error: No hay datos de orden para guardar.");

    try {
      const finalData = {
        ...order,
        clientSignature: cSig || null,
        client_signature: cSig || null,
        techSignature: tSig || null,
        tech_signature: tSig || null,
        accessories: Array.isArray(order.accessories) ? order.accessories : [],
        images: Array.isArray(order.images) ? order.images : [],
        spareParts: Array.isArray(order.spareParts) ? order.spareParts : []
      };

      // 0. Auto-registrar cliente si es nuevo
      const clientExists = clients.some(c =>
        c.name.toLowerCase() === finalData.clientName.toLowerCase() ||
        c.phone === finalData.clientPhone
      );

      if (!clientExists && onSaveClient) {
        await onSaveClient({
          name: finalData.clientName,
          phone: finalData.clientPhone,
          notes: "Registrado automáticamente desde ingreso de equipo."
        });
      }

      // 1. Guardar en Supabase / Storage
      const updatedList = await saveWorkOrder(finalData);

      // 2. Generar y descargar el PDF de ingreso
      await generateEntryReceipt(finalData, cSig, null);

      // 3. Notificar al componente padre para actualizar la tabla
      if (onSave) await onSave(updatedList);

      handleClose();
    } catch (err) {
      console.error("Error en finalizeOrder:", err);
      alert("Error al guardar la orden: " + err.message);
    }
  };

  const handleClose = () => {
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
      priority: "MEDIA",
      status: "INGRESO"
    });
    setSelectedAccessories([]);
    setImages([]);
    setClientSig(null);
    setTempOrder(null);
    setIsSignatureModalOpen(false);
    setShowClientSuggestions(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-slate-700 text-slate-100 selection:bg-cyan-500/30">

          <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl text-white shadow-lg">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-widest uppercase">Nuevo Ingreso</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Registro Técnico de Equipo</p>
              </div>
            </div>
            <button type="button" onClick={handleClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Datos del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Perez"
                    value={formData.clientName}
                    onChange={e => {
                      setFormData({...formData, clientName: e.target.value});
                      setShowClientSuggestions(true);
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />

                  {/* SUGERENCIAS DE CLIENTES - MEJORADO PARA MÓVIL */}
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border-2 border-cyan-500 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[999] max-h-60 overflow-y-auto divide-y divide-slate-800 animate-fadeIn">
                      <div className="px-3 py-2 bg-cyan-950/40 text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-slate-800 flex justify-between items-center">
                        <span>Clientes Registrados</span>
                        <span className="bg-cyan-500 text-slate-950 px-1.5 rounded-full">{filteredClients.length}</span>
                      </div>
                      {filteredClients.map(c => (
                        <div
                          key={c.id}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setFormData({
                              ...formData,
                              clientName: c.name,
                              clientPhone: c.phone || ""
                            });
                            setShowClientSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3.5 hover:bg-cyan-500/20 active:bg-cyan-500/30 cursor-pointer transition-all flex justify-between items-center group"
                        >
                          <div className="flex flex-col min-w-0 pr-4">
                            <span className="font-black text-slate-100 group-hover:text-cyan-400 uppercase tracking-tight truncate">{c.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono truncate">{c.email || "Sin correo"}</span>
                          </div>
                          <div className="shrink-0 flex flex-col items-end">
                            <span className="text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 text-cyan-500 font-mono font-bold">
                              {c.phone}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Teléfono de Contacto *</label>
                  <input type="tel" required placeholder="Ej. +54 9 261 ..." value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Datos del Equipo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo de Equipo *</label>
                  <select required value={formData.deviceType} onChange={e => setFormData({...formData, deviceType: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Seleccionar</option>
                    {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Marca / Modelo *</label>
                  <select required value={formData.brandModel} onChange={e => setFormData({...formData, brandModel: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none">
                    <option value="">Seleccionar</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Nro. de Serie *</label>
                  <input type="text" required placeholder="S/N..." value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all" />
                </div>
              </div>
              {formData.deviceType === "Otros" && <input type="text" required placeholder="Especificar tipo" value={formData.customDeviceType} onChange={e => setFormData({...formData, customDeviceType: e.target.value})} className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs" />}
              {formData.brandModel === "Otros" && <input type="text" required placeholder="Especificar marca" value={formData.customBrandModel} onChange={e => setFormData({...formData, customBrandModel: e.target.value})} className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs" />}

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase ml-1">Falla Reportada e Inspección Inicial</label>
                <textarea required rows={2} placeholder="Describa los síntomas reportados por el cliente..." value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all" />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500 font-bold uppercase ml-1">Estado Cosmético al Ingresar</label>
                <textarea rows={2} placeholder="Ej: Rayas en carcasa, pantalla con protector, sin golpes visibles..." value={formData.cosmeticCondition} onChange={e => setFormData({...formData, cosmeticCondition: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all" />
              </div>
            </div>

            {/* SECCIÓN ESTADO Y PRIORIDAD */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Gestión de la Orden</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase ml-1">Estado Actual de la Reparación</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase ml-1">Nivel de Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-widest border-l-2 border-cyan-500 pl-3">Accesorios Recibidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COMMON_ACCESSORIES.map(item => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => handleAccessoryToggle(item)}
                    className={`p-2.5 rounded-xl border text-[9px] text-left transition-all ${selectedAccessories?.includes(item) ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"}`}
                  >
                    {item}
                  </button>
                ))}
                {/* LISTAR ACCESORIOS PERSONALIZADOS YA AGREGADOS */}
                {selectedAccessories?.filter(acc => !COMMON_ACCESSORIES.includes(acc)).map(acc => (
                  <button
                    type="button"
                    key={acc}
                    onClick={() => handleAccessoryToggle(acc)}
                    className="p-2.5 rounded-xl border text-[9px] text-left transition-all bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold flex justify-between items-center"
                  >
                    <span>{acc}</span>
                    <X size={10} className="text-cyan-600" />
                  </button>
                ))}
              </div>

              {/* AGREGAR OTRO ACCESORIO */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Agregar otro accesorio..."
                  value={customAccessory}
                  onChange={(e) => setCustomAccessory(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] outline-none focus:border-cyan-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAccessory.trim()) {
                      handleAccessoryToggle(customAccessory.trim());
                      setCustomAccessory("");
                    }
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Fotos de Inspección Visual</h3>
              <div className="grid grid-cols-4 gap-3">
                {Array.isArray(images) && images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl group">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-rose-500 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={12} /></button>
                  </div>
                ))}
                {(images?.length || 0) < MAX_IMAGES && (
                  <div
                    onClick={handleCapturePhoto}
                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-950 hover:border-cyan-500/50 cursor-pointer text-slate-600 transition-all group"
                  >
                    <Camera size={28} className="group-hover:text-cyan-500 transition-colors" />
                    <span className="text-[8px] mt-1 uppercase font-black tracking-widest group-hover:text-cyan-400">Adjuntar</span>
                    <input id="hidden-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-[9px] text-slate-500 space-y-2 leading-relaxed">
              <p className="font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Términos y Condiciones del Servicio</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <p>• Plazo de asistencia: hasta 10 días hábiles.</p>
                <p>• Garantía: 90 días sobre reparaciones.</p>
                <p>• Retiro: máx 10 días tras aviso (luego guarda $1.000/día).</p>
                <p>• Abandono: configurado a los 90 días sin retiro.</p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-800">
              <button type="button" onClick={handleClose} className="px-6 py-2 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">Cancelar</button>
              <button type="button" onClick={handleSaveWithoutSignatures} className="px-4 py-2 text-[10px] font-bold text-amber-500 hover:text-amber-400 border border-amber-900/30 rounded-xl transition-all uppercase tracking-tighter">Guardar sin Firmas</button>
              <button type="submit" className="px-10 py-3 text-xs font-black bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 rounded-xl uppercase tracking-widest shadow-lg shadow-cyan-500/10 active:scale-95 transition-all flex items-center gap-2">
                <FileCheck size={16} /> Continuar a Firmas
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
        title={signatureType === "CLIENT" ? "Firma de Recepción (Cliente)" : "Firma LabRepair (Responsable)"}
      />
    </>
  );
};

export default NewWorkOrderModal;