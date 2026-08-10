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
    clientName: "", clientPhone: "", deviceType: "", customDeviceType: "",
    brandModel: "", customBrandModel: "", serialNumber: "", issueDescription: "",
    estimatedBudget: "", priority: "MEDIA"
  });

  const [selectedAccessories, setSelectedAccessories] = useState([]);
  const [customAccessory, setCustomAccessory] = useState("");
  const [images, setImages] = useState([]);

  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureType, setSignatureType] = useState("CLIENT");
  const [clientSig, setClientSig] = useState(null);
  const [tempOrder, setTempOrder] = useState(null);

  if (!isOpen) return null;

  const handleAccessoryToggle = (acc) => {
    setSelectedAccessories(prev => prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const available = MAX_IMAGES - images.length;

    files.slice(0, available).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result]);
      reader.readAsDataURL(file);
    });
  };

  const handleCapturePhoto = async () => {
    if (images.length >= MAX_IMAGES) return;

    if (Capacitor.isNativePlatform()) {
      try {
        const image = await CapCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Prompt
        });
        const imageUrl = `data:image/jpeg;base64,${image.base64String}`;
        setImages(prev => [...prev, imageUrl]);
      } catch (err) {
        console.error("Error al capturar foto:", err);
      }
    } else {
      document.getElementById('hidden-photo-input')?.click();
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e) => {
    e.preventDefault();
    const type = formData.deviceType === "Otros" ? formData.customDeviceType : formData.deviceType;
    const brand = formData.brandModel === "Otros" ? formData.customBrandModel : formData.brandModel;

    if (!formData.clientName || !type) return alert("Complete los campos obligatorios.");

    const orderId = `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      ...formData,
      id: orderId,
      deviceType: type,
      brandModel: brand,
      status: "INGRESADO",
      entryDate: new Date().toISOString().split("T")[0],
      accessories: selectedAccessories,
      images,
      spareParts: []
    };

    setTempOrder(newOrder);
    setSignatureType("CLIENT");
    setIsSignatureModalOpen(true);
  };

  const handleSignatureSave = async (signature) => {
    if (signatureType === "CLIENT") {
      setClientSig(signature);
      setSignatureType("TECH");
    } else {
      await finalizeOrder(clientSig, signature);
    }
  };

  const finalizeOrder = async (cSig, tSig) => {
    try {
      const finalData = { ...tempOrder, clientSignature: cSig, techSignature: tSig };
      await saveWorkOrder(finalData);
      if (onSave) onSave(finalData);
      handleClose();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleClose = () => {
    setFormData({
      clientName: "", clientPhone: "", deviceType: "", customDeviceType: "",
      brandModel: "", customBrandModel: "", serialNumber: "", issueDescription: "",
      estimatedBudget: "", priority: "MEDIA"
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
        <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-slate-700 text-slate-100">
          <div className="flex justify-between items-center p-6 border-b border-slate-800 sticky top-0 bg-[#0f172a] z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-700">
                <img src={logo} alt="Logo" className="h-full w-full object-cover" />
              </div>
              <h2 className="text-xl font-black tracking-widest uppercase">Nuevo Ingreso</h2>
            </div>
            <button onClick={handleClose} className="p-2 text-slate-500 hover:text-white"><X /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* DATOS CLIENTE */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Datos Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" required placeholder="Nombre Completo *" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
                <input type="tel" required placeholder="Teléfono *" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>

            {/* DATOS EQUIPO */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Datos Equipo</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select required value={formData.deviceType} onChange={e => setFormData({...formData, deviceType: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">Tipo Equipo *</option>
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select required value={formData.brandModel} onChange={e => setFormData({...formData, brandModel: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">Marca *</option>
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <input type="text" required placeholder="Nro Serie *" value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
              </div>
              {formData.deviceType === "Otros" && <input type="text" required placeholder="Especificar tipo" value={formData.customDeviceType} onChange={e => setFormData({...formData, customDeviceType: e.target.value})} className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs" />}
              {formData.brandModel === "Otros" && <input type="text" required placeholder="Especificar marca" value={formData.customBrandModel} onChange={e => setFormData({...formData, customBrandModel: e.target.value})} className="w-full bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2 text-xs" />}
              <textarea required rows={3} placeholder="Falla reportada..." value={formData.issueDescription} onChange={e => setFormData({...formData, issueDescription: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm resize-none" />
            </div>

            {/* ACCESORIOS */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Accesorios</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_ACCESSORIES.map(item => (
                  <button type="button" key={item} onClick={() => handleAccessoryToggle(item)} className={`p-3 rounded-xl border text-[10px] text-left transition-all ${selectedAccessories.includes(item) ? "bg-cyan-500/10 border-cyan-500 text-cyan-400" : "bg-slate-950 border-slate-800 text-slate-500"}`}>{item}</button>
                ))}
              </div>
            </div>

            {/* FOTOS */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-cyan-500 uppercase border-l-2 border-cyan-500 pl-3">Fotos de Inspección</h3>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-rose-500"><Trash2 size={12} /></button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <div
                    onClick={handleCapturePhoto}
                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-lg hover:bg-slate-950 cursor-pointer text-slate-600 transition-colors"
                  >
                    <Camera size={24} />
                    <span className="text-[8px] mt-1 uppercase font-bold">Adjuntar</span>
                    <input id="hidden-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl text-[9px] text-slate-500 space-y-1">
              <p className="font-black text-slate-400 mb-1 uppercase tracking-widest">Términos del Servicio</p>
              <p>• Plazo de hasta 10 días hábiles. Garantía de 90 meses.</p>
              <p>• Retiro máximo 10 días tras reparación; luego cargo de guarda.</p>
              <p>• Tras 90 días sin retiro se configura ABANDONO.</p>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-slate-800">
              <button type="button" onClick={() => finalizeOrder(null, null)} className="px-4 py-2 text-xs font-bold text-amber-500">Guardar sin Firmas</button>
              <button type="submit" className="px-10 py-3 text-xs font-black bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 rounded-xl uppercase tracking-widest">Continuar a Firmas</button>
            </div>
          </form>
        </div>
      </div>

      <SignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={handleSignatureSave} title={signatureType === "CLIENT" ? "Firma del Cliente" : "Firma LabRepair"} />
    </>
  );
};

export default NewWorkOrderModal;
