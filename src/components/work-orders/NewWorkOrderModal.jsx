import React, { useState } from "react";
import logo from "../logo laboratorio.jpeg";
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

const PRIORITIES = ["BAJA", "MEDIA", "ALTA"];
const MAX_IMAGES = 4;

const NewWorkOrderModal = ({ isOpen, onClose, onSave }) => {
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

  // Gestión de firmas
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState("CLIENT"); // "CLIENT" | "TECH"
  const [clientSig, setClientSig] = useState(null);
  const [tempOrder, setTempOrder] = useState(null);

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
    const orderId = `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split("T")[0];

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
      
      priority: formData.priority,
      status: "INGRESADO",
      
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
    const type = formData.deviceType === "Otros" ? formData.customDeviceType : formData.deviceType;
    if (!formData.clientName || !type) return alert("Complete los campos obligatorios (Nombre y Tipo de equipo) antes de guardar.");

    const newOrder = buildOrderData();
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

      // 1. Guardar en Supabase / Storage
      await saveWorkOrder(finalData);

      // 2. Generar y descargar el PDF de ingreso
      await generateEntryReceipt(finalData, cSig, logo);

      // 3. Notificar al componente padre para actualizar la tabla
      if (onSave) onSave(finalData);

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
      priority: "MEDIA"
    });
    setSelectedAccessories([]);
    setImages([]);
    setClientSig(null);
    setTempOrder(null);
    setIsSignatureModalOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-slate-700 text-slate-100 selection:bg-cyan-500/30">

          <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                <img src={logo} alt="Logo" className="h-full w-full object-cover" />
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
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Nombre Completo *</label>
                  <input type="text" required placeholder="Ej. Juan Perez" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none transition-all" />
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
                <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">Falla Reportada e Inspección Inicial</label>
                <textarea required rows={3} placeholder="Describa los síntomas reportados por el cliente..." value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all" />
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