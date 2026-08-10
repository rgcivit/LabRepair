import React, { useState, useEffect } from 'react';
import { generateBudgetPDF } from '../../services/pdfService';

/**
 * Componente BudgetView de alta gama comercial e ingenieril.
 * Agrupa la pantalla en un diseño de 3 columnas de tarjetas de alta fidelidad estética.
 */
export default function BudgetView({ selectedOT, inventory, onUpdateBudget, onDiscountStock }) {
  // --- ESTADOS PRINCIPALES ---
  const [laborCost, setLaborCost] = useState(0);
  const [imputedParts, setImputedParts] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState('PENDIENTE');

  // 1. Selector de repuesto actual
  const [selectedPartId, setSelectedPartId] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [partQuality, setPartQuality] = useState('ORIGINAL'); // ORIGINAL | ALTERNATIVO | REACONDICIONADO

  // 2. Costos Adicionales y Finanzas (Tarjeta 2)
  const [currency, setCurrency] = useState('ARS'); // ARS | USD
  const [ivaRate, setIvaRate] = useState(0); // 0 | 10.5 | 21
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT | FIXED
  const [freightCost, setFreightCost] = useState(0);
  const [diagnosisCost, setDiagnosisCost] = useState(0);
  const [urgencyCost, setUrgencyCost] = useState(0);

  // 3. Condiciones Comerciales (Tarjeta 3)
  const [validityDays, setValidityDays] = useState(10);
  const [etaDays, setEtaDays] = useState('48 hs hábiles');
  const [paymentTerms, setPaymentTerms] = useState('Contado / Transferencia');
  const [warrantyMonths, setWarrantyMonths] = useState(3);
  const [whatsappTemplate, setWhatsappTemplate] = useState('ESTANDAR'); // ESTANDAR | LISTO | RECORDATORIO

  // Cargar datos pre-existentes de la OT seleccionada
  useEffect(() => {
    if (selectedOT) {
      setLaborCost(selectedOT.laborCost || 0);
      setImputedParts(selectedOT.spareParts || selectedOT.sparePartsAssigned || []);
      setBudgetStatus(selectedOT.budgetStatus || 'PENDIENTE');

      const details = selectedOT.budgetDetails || {};
      setCurrency(details.currency || 'ARS');
      setIvaRate(details.ivaRate || 0);
      setDiscountValue(details.discountValue || 0);
      setDiscountType(details.discountType || 'PERCENT');
      setFreightCost(details.freightCost || 0);
      setDiagnosisCost(details.diagnosisCost || 0);
      setUrgencyCost(details.urgencyCost || 0);
      setValidityDays(details.validityDays || 10);
      setEtaDays(details.etaDays || '48 hs hábiles');
      setPaymentTerms(details.paymentTerms || 'Contado / Transferencia');
      setWarrantyMonths(details.warrantyMonths || 3);
    }
  }, [selectedOT]);

  if (!selectedOT) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-12 h-12 mx-auto text-slate-700 mb-3 animate-pulse">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-bold uppercase text-slate-500 tracking-wider">Gestión Financiera Inactiva</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">Selecciona una orden de trabajo activa en la tabla principal para cargar repuestos y cotizar mano de obra.</p>
      </div>
    );
  }

  // --- CÁLCULOS MATEMÁTICOS DE PRESUPUESTO ---
  const partsSubtotal = imputedParts.reduce((acc, part) => acc + (part.price * part.quantity), 0);
  const baseSubtotal = parseFloat(laborCost || 0) + partsSubtotal;
  const logisticsSubtotal = parseFloat(freightCost || 0) + parseFloat(diagnosisCost || 0) + parseFloat(urgencyCost || 0);
  const preTaxSubtotal = baseSubtotal + logisticsSubtotal;

  // Cálculo de descuento
  const discountAmount = discountType === 'PERCENT'
    ? preTaxSubtotal * (parseFloat(discountValue || 0) / 100)
    : parseFloat(discountValue || 0);

  const taxableBase = Math.max(0, preTaxSubtotal - discountAmount);
  const ivaAmount = taxableBase * (parseFloat(ivaRate || 0) / 100);
  const grandTotal = taxableBase + ivaAmount;

  // Símbolo de moneda visual
  const curSymbol = currency === 'USD' ? 'US$' : '$';

  // --- HANDLERS ---
  const handleAddPart = (e) => {
    e.preventDefault();
    if (!selectedPartId) return;

    const inventoryItem = inventory.find(item => item.id === selectedPartId);
    if (!inventoryItem) return;

    if (inventoryItem.stock < addQty) {
      alert(`Stock insuficiente de ${inventoryItem.name}. Solo quedan ${inventoryItem.stock} unidades disponibles.`);
      return;
    }

    const existingIndex = imputedParts.findIndex(p => p.id === selectedPartId && p.quality === partQuality);
    let updatedParts = [...imputedParts];

    if (existingIndex > -1) {
      updatedParts[existingIndex].quantity += addQty;
    } else {
      updatedParts.push({
        id: inventoryItem.id,
        name: inventoryItem.name,
        quantity: addQty,
        price: inventoryItem.price,
        quality: partQuality
      });
    }

    setImputedParts(updatedParts);
    onDiscountStock(selectedPartId, addQty);

    // Reset selectors
    setSelectedPartId('');
    setAddQty(1);
    setPartQuality('ORIGINAL');
  };

  const handleRemovePart = (partId, qty, quality) => {
    const updatedParts = imputedParts.filter(p => !(p.id === partId && p.quality === quality));
    setImputedParts(updatedParts);
    onDiscountStock(partId, -qty);
  };

  const handleSaveBudget = () => {
    const updatedWorkOrder = {
      ...selectedOT,
      cost: grandTotal, // Sincroniza costo general
      laborCost: parseFloat(laborCost) || 0,
      spareParts: imputedParts,
      budgetStatus: budgetStatus,
      status: budgetStatus === 'APROBADO' && selectedOT.status === 'PRESUPUESTADO'
        ? 'EN_REPARACION'
        : (selectedOT.status === 'INGRESO' ? 'PRESUPUESTADO' : selectedOT.status),
      budgetDetails: {
        currency,
        ivaRate,
        discountValue,
        discountType,
        freightCost,
        diagnosisCost,
        urgencyCost,
        validityDays,
        etaDays,
        paymentTerms,
        warrantyMonths,
        grandTotal
      }
    };

    onUpdateBudget(updatedWorkOrder);
    alert('Presupuesto comercial guardado con éxito.');
  };

  // --- EXPORTAR PDF FORMAL DE COTIZACIÓN ---
  const handleDownloadPDF = async () => {
    const budgetOrder = {
      ...selectedOT,
      laborCost,
      sparePartsAssigned: imputedParts,
      diagnosis: selectedOT.diagnosis,
      budgetDetails: {
        currency,
        ivaRate,
        discountValue,
        discountType,
        freightCost,
        diagnosisCost,
        urgencyCost,
        validityDays,
        etaDays,
        paymentTerms,
        warrantyMonths,
        grandTotal
      }
    };
    await generateBudgetPDF(budgetOrder);
  };

  // --- WHATSAPP TEMPLATES ---
  const handleSendWhatsApp = async () => {
    // Primero generamos y compartimos el PDF formal
    await handleDownloadPDF();

    const cleanPhone = selectedOT.clientPhone.replace(/[^\d+]/g, '');
    const formattedTotal = `${curSymbol} ${grandTotal.toLocaleString('es-AR')} ${currency}`;
    const partsTextList = imputedParts.length > 0
      ? imputedParts.map(p => `• *${p.name}* (${p.quality}) (x${p.quantity}): ${curSymbol} ${(p.price * p.quantity).toLocaleString('es-AR')} ${currency}`).join('\n')
      : '• _Ninguno (Únicamente reparaciones de calibración / re-ajuste)_';

    let mensaje = '';

    if (whatsappTemplate === 'ESTANDAR') {
      mensaje = `🔧 *PRESUPUESTO TÉCNICO - LABREPAIR*
---------------------------------------
*Orden de Trabajo:* #${selectedOT.id}
*Cliente:* ${selectedOT.clientName}

🩺 *DETALLES DEL EQUIPO:*
• *Aparatología:* ${selectedOT.equipmentType}
• *Marca y Modelo:* ${selectedOT.brand} ${selectedOT.model}
• *N° de Serie:* ${selectedOT.serialNumber}

🔍 *DIAGNÓSTICO:*
${selectedOT.diagnosis || 'Ingresado para control y diagnóstico técnico.'}

💰 *DESGLOSE DE SERVICIOS:*
• *Mano de Obra / Ingeniería:* ${curSymbol} ${parseFloat(laborCost).toLocaleString('es-AR')} ${currency}
${freightCost > 0 ? `• *Gastos de Flete / Traslado:* ${curSymbol} ${parseFloat(freightCost).toLocaleString('es-AR')} ${currency}\n` : ''}${diagnosisCost > 0 ? `• *Servicio Diagnóstico Base:* ${curSymbol} ${parseFloat(diagnosisCost).toLocaleString('es-AR')} ${currency}\n` : ''}${urgencyCost > 0 ? `• *Recargo Reparación Express:* ${curSymbol} ${parseFloat(urgencyCost).toLocaleString('es-AR')} ${currency}\n` : ''}
*Repuestos e Insumos:*
${partsTextList}

---------------------------------------
📌 *CONDICIONES:*
• *Garantía del Trabajo:* ${warrantyMonths} meses.
• *Validez de la Oferta:* ${validityDays} días.
• *Plazo de Entrega (ETA):* ${etaDays}.
• *Términos de Pago:* ${paymentTerms}.
---------------------------------------
💵 *TOTAL CONSOLIDADO:* ${formattedTotal}
---------------------------------------

Por favor, responda a este mensaje con la palabra *APROBADO* o *RECHAZADO* para continuar con el protocolo correspondiente.`;
    } else if (whatsappTemplate === 'LISTO') {
      mensaje = `✅ *DIAGNÓSTICO TÉCNICO FINALIZADO - LABREPAIR*
---------------------------------------
Estimado cliente de *${selectedOT.clientName}*, le informamos que el diagnóstico de su equipo *${selectedOT.brand} ${selectedOT.model}* (S/N: ${selectedOT.serialNumber}) ha finalizado exitosamente en nuestro banco de pruebas.

Se ha confeccionado un presupuesto formal detallado en formato PDF con todos los ensayos nominales y condiciones comerciales.

💵 *TOTAL ESTIMADO:* ${formattedTotal}
🚚 *ETA de Entrega:* ${etaDays}

Quedamos a la espera de su confirmación para proceder con el inicio inmediato de las tareas de reparación.`;
    } else if (whatsappTemplate === 'RECORDATORIO') {
      mensaje = `⏳ *RECORDATORIO DE PRESUPUESTO PENDIENTE - LABREPAIR*
---------------------------------------
Hola *${selectedOT.clientName}*, le enviamos este recordatorio cordial respecto al presupuesto de su equipo *${selectedOT.brand} ${selectedOT.model}* (OT: #${selectedOT.id}) enviado previamente.

Para poder cumplir con el *ETA de entrega de ${etaDays}* y reservar los repuestos requeridos en almacén, le solicitamos nos indique si el presupuesto de ${formattedTotal} se encuentra *APROBADO* o *RECHAZADO*.

¡Cualquier duda técnica estamos para asesorarlo!`;
    }

    const encodedMessage = encodeURIComponent(mensaje);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-w-full mx-auto">
      
      {/* Cabecera del Panel Presupuestario */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest">Financial, Logistics & Commerce Module</span>
          <h3 className="text-lg font-black text-white uppercase tracking-wider mt-0.5">
            Módulo de Presupuestación Comercial
          </h3>
          <p className="text-xs text-slate-500">Transforme los ensayos técnicos en propuestas comerciales robustas y profesionales</p>
        </div>
        
        <span className="bg-slate-900 px-3 py-1.5 text-xs font-mono font-bold text-cyan-400 rounded border border-slate-850 self-start sm:self-auto shadow-inner">
          OT: {selectedOT.id}
        </span>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* TARJETA 1: IMPUTACIÓN DE REPUESTOS Y MANO DE OBRA */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
            1. Repuestos y Mano de Obra
          </h4>

          {/* Selector de repuestos */}
          <form onSubmit={handleAddPart} className="space-y-3.5">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Insumo / Repuesto</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">-- Seleccionar repuesto --</option>
                {inventory.map((item) => (
                  <option 
                    key={item.id} 
                    value={item.id}
                    disabled={item.stock === 0}
                  >
                    {item.name} (${item.price.toLocaleString('es-AR')} ARS)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Clasificación / Calidad</label>
                <select
                  value={partQuality}
                  onChange={(e) => setPartQuality(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="ORIGINAL">Nuevo Original</option>
                  <option value="ALTERNATIVO">Alternativo</option>
                  <option value="REACONDICIONADO">Reacondicionado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cant. Imputar</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-center font-bold text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedPartId}
              className="w-full py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 disabled:opacity-20 rounded shadow transition-all uppercase tracking-wider active:scale-95"
            >
              ➕ Imputar Componente
            </button>
          </form>

          {/* Tabla de Repuestos */}
          <div className="bg-slate-900/40 rounded-lg border border-slate-900 overflow-hidden">
            <div className="px-3 py-2 bg-slate-900/80 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Lista de Insumos Imputados
            </div>
            
            {imputedParts.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-slate-600 font-mono">
                Sin repuestos imputados aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-400">
                  <tbody className="divide-y divide-slate-900">
                    {imputedParts.map((part, index) => (
                      <tr key={`${part.id}-${part.quality}-${index}`} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-cyan-400 font-bold text-[10px] block">{part.id}</span>
                          <span className="font-bold text-slate-350">{part.name}</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-bold mt-1 ${part.quality === 'ORIGINAL' ? 'bg-indigo-950/60 text-indigo-400' : part.quality === 'ALTERNATIVO' ? 'bg-amber-950/60 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                            {part.quality}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-300">x{part.quantity}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">{curSymbol}{part.price.toLocaleString('es-AR')}</td>
                        <td className="py-2.5 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemovePart(part.id, part.quantity, part.quality)}
                            className="text-rose-500 hover:text-rose-400 text-xs px-1.5 py-1 hover:bg-rose-950/20 rounded transition-colors"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mano de Obra */}
          <div className="border-t border-slate-900 pt-3.5 space-y-2">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mano de Obra de Ingeniería</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-slate-500">{curSymbol}</span>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-12 py-2 text-xs font-bold text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[9px] font-bold text-slate-650">{currency}</span>
            </div>
          </div>
        </div>

        {/* TARJETA 2: COSTOS ADICIONALES (FLETE, DIAGNÓSTICO, IVA, DESCUENTOS) */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            2. Costos Adicionales y Logística
          </h4>

          {/* Selector de moneda */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Moneda Comercial</label>
            <div className="grid grid-cols-2 gap-2">
              {['ARS', 'USD'].map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    currency === cur
                      ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/60'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {cur === 'ARS' ? 'ARS ($ pesos)' : 'USD (US$ dólares)'}
                </button>
              ))}
            </div>
          </div>

          {/* Costos logísticos */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Costo Flete / Retiro de Cabezal</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-slate-500 text-[10px]">{curSymbol}</span>
                <input
                  type="number"
                  value={freightCost}
                  onChange={(e) => setFreightCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Costo de Revisión / Diagnóstico de Banco</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-slate-500 text-[10px]">{curSymbol}</span>
                <input
                  type="number"
                  value={diagnosisCost}
                  onChange={(e) => setDiagnosisCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                  title="Costo cobrable en caso de rechazo del presupuesto"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Recargo Urgencia (Servicio Express)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-slate-500 text-[10px]">{curSymbol}</span>
                <input
                  type="number"
                  value={urgencyCost}
                  onChange={(e) => setUrgencyCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Descuentos e IVA */}
          <div className="border-t border-slate-900 pt-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Descuento Comercial</label>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Tipo de Descuento</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="PERCENT">Porcentaje (%)</option>
                  <option value="FIXED">Fijo ({curSymbol})</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Alícuota IVA (Declaración Fiscal)</label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 10.5, 21].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setIvaRate(rate)}
                    className={`py-1 rounded border text-[11px] font-bold font-mono transition-all ${
                      ivaRate === rate
                        ? 'bg-amber-950/60 text-amber-400 border-amber-500/60'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 3: RESUMEN COMERCIAL, TIEMPOS, GARANTÍA Y ACCIONES */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            3. Oferta y Tiempos de Entrega
          </h4>

          {/* Plazos y garantía */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Validez Cotización</label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value={5}>5 días</option>
                  <option value={10}>10 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Plazo Garantía</label>
                <select
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  <option value={0}>Sin garantía</option>
                  <option value={3}>3 meses</option>
                  <option value={6}>6 meses</option>
                  <option value={12}>12 meses</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Tiempo de Reparación Estimado (ETA)</label>
              <input
                type="text"
                value={etaDays}
                onChange={(e) => setEtaDays(e.target.value)}
                placeholder="Ej: 48 hs hábiles"
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Condiciones de Pago</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="Contado / Transferencia">Contado / Transferencia Bancaria</option>
                <option value="50% anticipo / 50% contra entrega">50% Anticipo / 50% Contra entrega</option>
                <option value="3 Cuotas sin interés">3 Cuotas sin interés</option>
                <option value="Efectivo en recepción">Efectivo en recepción</option>
              </select>
            </div>
          </div>

          {/* Desglose Financiero */}
          <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-xl space-y-2 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-500">Mano de Obra:</span>
              <span>{curSymbol} {parseFloat(laborCost || 0).toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal Repuestos:</span>
              <span>{curSymbol} {partsSubtotal.toLocaleString('es-AR')}</span>
            </div>
            {logisticsSubtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Servicios Adicionales:</span>
                <span>{curSymbol} {logisticsSubtotal.toLocaleString('es-AR')}</span>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between text-rose-400">
                <span>Atención Comercial:</span>
                <span>- {curSymbol} {discountAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            {ivaRate > 0 && (
              <div className="flex justify-between text-amber-500">
                <span>IVA ({ivaRate}%):</span>
                <span>{curSymbol} {ivaAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-2.5 mt-2 flex items-center justify-between text-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Total Neto</span>
              <span className="text-sm font-black text-emerald-400">
                {curSymbol} {grandTotal.toLocaleString('es-AR')} {currency}
              </span>
            </div>
          </div>

          {/* Estado de Aprobación de Presupuesto */}
          <div className="space-y-2 border-t border-slate-900 pt-3">
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado Comercial</label>
            <div className="grid grid-cols-3 gap-2">
              {['PENDIENTE', 'APROBADO', 'RECHAZADO'].map((st) => {
                const isSelected = budgetStatus === st;
                let col = 'bg-slate-900 border-slate-800 text-slate-500';
                if (isSelected) {
                  if (st === 'PENDIENTE') col = 'bg-amber-950/60 text-amber-400 border-amber-500/60 ring-1 ring-amber-500/10';
                  if (st === 'APROBADO') col = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/60 ring-1 ring-emerald-500/10';
                  if (st === 'RECHAZADO') col = 'bg-rose-950/60 text-rose-450 border-rose-500/60 ring-1 ring-rose-500/10';
                }
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBudgetStatus(st)}
                    className={`py-2 rounded border text-[10px] font-black uppercase tracking-wider text-center active:scale-95 transition-all ${col}`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botones de acción (WhatsApp, PDF, Guardar) */}
          <div className="border-t border-slate-900 pt-4 space-y-2.5">
            {/* Selector de plantilla de WhatsApp */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'ESTANDAR', label: 'Económico' },
                { type: 'LISTO', label: 'Listo' },
                { type: 'RECORDATORIO', label: 'Recordatorio' }
              ].map(tpl => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => setWhatsappTemplate(tpl.type)}
                  className={`py-1 text-[10px] font-bold rounded border transition-all ${
                    whatsappTemplate === tpl.type
                      ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                      : 'bg-slate-900 border-slate-850 text-slate-500'
                  }`}
                  title={`Plantilla: ${tpl.type}`}
                >
                  💬 {tpl.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-500 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-wider"
              >
                📲 WhatsApp
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition-all active:scale-95 uppercase tracking-wider"
              >
                📄 Cotizar PDF
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveBudget}
              className="w-full py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg shadow-lg hover:brightness-110 transition-all uppercase tracking-wider active:scale-[0.98]"
            >
              💾 Guardar Presupuesto Técnico
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
