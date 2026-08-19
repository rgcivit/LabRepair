import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from "lucide-react";
import { generateBudgetPDF } from '../../services/pdfService';
import logo from '../logo laboratorio.jpeg';

/**
 * Componente BudgetView de alta gama comercial e ingenieril.
 * Agrupa la pantalla en un diseño de 3 columnas de tarjetas de alta fidelidad estética.
 * @param {Object} props.selectedOT - Orden de trabajo seleccionada.
 * @param {Array} props.inventory - Listado del inventario actual.
 * @param {Function} props.onUpdateBudget - Callback para guardar la OT: (updatedOT) => void.
 * @param {Function} props.onDiscountStock - Callback para descontar stock: (itemId, qty) => void.
 * @param {Function} props.onSaveInventoryItem - Callback para registrar nuevo insumo: (item) => void.
 */
export default function BudgetView({ selectedOT, inventory, onUpdateBudget, onDiscountStock, onSaveInventoryItem }) {
  // --- ESTADOS PRINCIPALES ---
  const [laborCost, setLaborCost] = useState('0');
  const [imputedParts, setImputedParts] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState('PENDIENTE');

  // 1. Selector de repuesto actual
  const [selectedPartId, setSelectedPartId] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [partQuality, setPartQuality] = useState('ORIGINAL'); // ORIGINAL | ALTERNATIVO | REACONDICIONADO
  const [isClientPartAddition, setIsClientPartAddition] = useState(false);

  // Estados para agregar repuesto rápido
  const [isAddingQuickPart, setIsAddingQuickPart] = useState(false);
  const [quickPart, setQuickPart] = useState({ name: '', price: '0', category: 'GENERAL', equipmentType: 'General' });

  // Cargar datos pre-existentes de la OT seleccionada
  const [currency, setCurrency] = useState('ARS'); // ARS | USD
  const [ivaRate, setIvaRate] = useState(0); // 0 | 10.5 | 21
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState('PERCENT'); // PERCENT | FIXED
  const [freightCost, setFreightCost] = useState('0');
  const [diagnosisCost, setDiagnosisCost] = useState('20000');
  const [urgencyCost, setUrgencyCost] = useState('0');
  const [diagnosisFeeMode, setDiagnosisFeeMode] = useState('NONE'); // NONE | PENDING | PAID

  // 3. Condiciones Comerciales (Tarjeta 3)
  const [validityDays, setValidityDays] = useState(10);
  const [etaDays, setEtaDays] = useState('48 hs hábiles');
  const [paymentTerms, setPaymentTerms] = useState('Contado / Transferencia');
  const [warrantyMonths, setWarrantyMonths] = useState(3);
  const [whatsappTemplate, setWhatsappTemplate] = useState('ESTANDAR'); // ESTANDAR | LISTO | RECORDATORIO

  // Cargar datos pre-existentes de la OT seleccionada
  useEffect(() => {
    if (selectedOT) {
      setLaborCost((selectedOT.laborCost || 0).toString());
      setImputedParts(selectedOT.spareParts || selectedOT.sparePartsAssigned || []);
      setBudgetStatus(selectedOT.budgetStatus || 'PENDIENTE');

      const details = selectedOT.budgetDetails || {};
      setCurrency(details.currency || 'ARS');
      setIvaRate(details.ivaRate || 0);
      setDiscountValue((details.discountValue || 0).toString());
      setDiscountType(details.discountType || 'PERCENT');
      setFreightCost((details.freightCost || 0).toString());
      setDiagnosisCost((details.diagnosisCost || 0).toString());
      setUrgencyCost((details.urgencyCost || 0).toString());
      setDiagnosisFeeMode(details.diagnosisFeeMode || 'NONE');
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
  const laborCostNum = parseFloat(laborCost) || 0;
  const freightCostNum = parseFloat(freightCost) || 0;
  const diagnosisCostNum = parseFloat(diagnosisCost) || 0;
  const urgencyCostNum = parseFloat(urgencyCost) || 0;
  const discountValueNum = parseFloat(discountValue) || 0;

  // 1. Subtotal de lo que hay que cobrar por el trabajo actual
  const repairSubtotal = laborCostNum + partsSubtotal + freightCostNum + urgencyCostNum;

  // 2. Cálculo de descuento comercial sobre el trabajo
  const discountAmount = discountType === 'PERCENT'
    ? repairSubtotal * (discountValueNum / 100)
    : discountValueNum;

  // 3. Base antes de impuestos y abonos
  const netBeforeAbono = Math.max(0, repairSubtotal - discountAmount);
  const ivaAmount = netBeforeAbono * (parseFloat(ivaRate || 0) / 100);

  // 4. TOTAL FINAL: Se suma IVA y se AJUSTA por el abono de revisión
  let grandTotal = netBeforeAbono + ivaAmount;

  if (diagnosisFeeMode === 'PENDING') {
    grandTotal += diagnosisCostNum;
  } else if (diagnosisFeeMode === 'PAID') {
    grandTotal -= diagnosisCostNum;
  }

  // Símbolo de moneda visual
  const curSymbol = currency === 'USD' ? 'US$' : '$';

  // --- HANDLERS ---
  const handleAddPart = (e) => {
    e.preventDefault();
    if (!selectedPartId) return;

    const inventoryItem = inventory.find(item => item.id === selectedPartId);
    if (!inventoryItem) return;

    const qtyToAdd = parseInt(addQty) || 1;

    if (inventoryItem.stock < qtyToAdd) {
      alert(`Stock insuficiente de ${inventoryItem.name}. Solo quedan ${inventoryItem.stock} unidades disponibles.`);
      return;
    }

    const existingIndex = imputedParts.findIndex(p => p.id === selectedPartId && p.quality === partQuality);
    let updatedParts = [...imputedParts];

    const finalPrice = isClientPartAddition ? 0 : inventoryItem.price;

    if (existingIndex > -1) {
      updatedParts[existingIndex].quantity += qtyToAdd;
    } else {
      updatedParts.push({
        id: inventoryItem.id,
        name: inventoryItem.name,
        quantity: qtyToAdd,
        price: finalPrice,
        quality: partQuality
      });
    }

    setImputedParts(updatedParts);
    onDiscountStock(selectedPartId, qtyToAdd);

    // Reset selectors
    setSelectedPartId('');
    setAddQty('1');
    setPartQuality('ORIGINAL');
    setIsClientPartAddition(false);
  };

  const handleQuickPartSubmit = async (e) => {
    e.preventDefault();
    if (!quickPart.name) return;

    const newItem = {
      name: quickPart.name.trim(),
      category: quickPart.category || 'GENERAL',
      equipmentType: quickPart.equipmentType || 'General',
      stock: 99,
      minStock: 2,
      price: parseFloat(quickPart.price) || 0
    };

    // Persistir globalmente en el inventario/base de datos
    if (onSaveInventoryItem) {
      await onSaveInventoryItem(newItem);
    }

    // El sistema de inventario asignará un ID.
    // Como queremos imputarlo de inmediato, generamos un ID temporal o esperamos el refresh.
    // Para inmediatez, lo agregamos a la lista local de imputados.
    setImputedParts(prev => [...prev, {
      id: `NEW-${Date.now()}`,
      name: newItem.name,
      quantity: 1,
      price: newItem.price,
      quality: 'ORIGINAL'
    }]);

    setIsAddingQuickPart(false);
    setQuickPart({ name: '', price: '0', category: 'GENERAL', equipmentType: 'General' });
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
        diagnosisFeeMode,
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
        diagnosisFeeMode,
        validityDays,
        etaDays,
        paymentTerms,
        warrantyMonths,
        grandTotal
      }
    };
    await generateBudgetPDF(budgetOrder, logo);
  };

  // --- WHATSAPP TEMPLATES ---
  const handleSendWhatsApp = async () => {
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
• *Aparatología:* ${selectedOT.equipmentType || selectedOT.deviceType}
• *Marca y Modelo:* ${selectedOT.brandModel}
• *N° de Serie:* ${selectedOT.serialNumber}

🔍 *DIAGNÓSTICO:*
${selectedOT.diagnosis || 'Ingresado para control y diagnóstico técnico.'}

💰 *DESGLOSE:*
• *Ingeniería:* ${curSymbol} ${parseFloat(laborCost).toLocaleString('es-AR')}
${freightCost > 0 ? `• *Flete:* ${curSymbol} ${parseFloat(freightCost).toLocaleString('es-AR')}\n` : ''}${diagnosisFeeMode === 'PENDING' ? `• *Abono Revisión:* + ${curSymbol} ${diagnosisCostNum.toLocaleString()}\n` : ''}${diagnosisFeeMode === 'PAID' ? `• *Crédito por Abono:* - ${curSymbol} ${diagnosisCostNum.toLocaleString()}\n` : ''}
*Repuestos:*
${partsTextList}

---------------------------------------
💵 *TOTAL FINAL:* ${formattedTotal}
---------------------------------------
Por favor, responda *APROBADO* para iniciar.`;
    } else {
      mensaje = `✅ *OT #${selectedOT.id} FINALIZADA* \nTotal: ${formattedTotal}. Se adjunta PDF.`;
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
          <p className="text-xs text-slate-500">Propuestas comerciales robustas y profesionales</p>
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

          <form onSubmit={handleAddPart} className="space-y-3.5">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Insumo / Repuesto</label>
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">-- Seleccionar repuesto --</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.stock === 0}>
                    {item.name} {item.price === 0 ? "(Cliente)" : `($${item.price.toLocaleString('es-AR')})`}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Calidad</label>
                <select
                  value={partQuality}
                  onChange={(e) => setPartQuality(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-2 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="ORIGINAL">Original</option>
                  <option value="ALTERNATIVO">Alternativo</option>
                  <option value="REACONDICIONADO">Reacondicionado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cant.</label>
                <input
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-center font-bold text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="clientPartCheck"
                checked={isClientPartAddition}
                onChange={(e) => setIsClientPartAddition(e.target.checked)}
                className="w-3.5 h-3.5 accent-cyan-500"
              />
              <label htmlFor="clientPartCheck" className="text-[10px] text-slate-400 font-bold uppercase cursor-pointer">Insumo provisto por cliente ($0)</label>
            </div>

            <button
              type="submit"
              disabled={!selectedPartId}
              className="w-full py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded shadow uppercase tracking-wider"
            >
              ➕ Imputar Componente
            </button>

            <button
              type="button"
              onClick={() => setIsAddingQuickPart(true)}
              className="w-full py-2 text-[10px] font-bold text-cyan-400 border border-cyan-800/30 rounded uppercase tracking-tighter hover:bg-cyan-950/20"
            >
              ✨ Nuevo Insumo No Listado...
            </button>
          </form>

          {/* MODAL RAPIDO PARA AGREGAR INSUMO */}
          {isAddingQuickPart && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/80" onClick={() => setIsAddingQuickPart(false)} />
              <div className="relative w-full max-w-sm bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Plus className="text-cyan-400" size={18} />
                  Registrar Nuevo Insumo
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Descripción</label>
                    <input
                      type="text"
                      value={quickPart.name}
                      onChange={e => setQuickPart({...quickPart, name: e.target.value})}
                      placeholder="Ej: Manguera siliconada"
                      className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Precio Unit.</label>
                      <input
                        type="number"
                        value={quickPart.price}
                        onChange={e => setQuickPart({...quickPart, price: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Soporte</label>
                      <input
                        type="text"
                        value={quickPart.equipmentType}
                        onChange={e => setQuickPart({...quickPart, equipmentType: e.target.value})}
                        className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsAddingQuickPart(false)} className="flex-1 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cancelar</button>
                  <button onClick={handleQuickPartSubmit} className="flex-1 py-2 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-[10px] font-black rounded uppercase">Registrar e Imputar</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/40 rounded-lg border border-slate-900 overflow-hidden">
            <div className="px-3 py-2 bg-slate-900/80 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              Lista de Insumos Imputados
            </div>
            <div className="max-h-40 overflow-y-auto">
              <table className="w-full text-left text-[11px] text-slate-400">
                <thead className="bg-slate-950/50 text-[9px] uppercase font-black text-slate-500 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Insumo</th>
                    <th className="py-2 px-2 text-center">Cant.</th>
                    <th className="py-2 px-2 text-right">P. Unit</th>
                    <th className="py-2 px-2 text-right">Subtotal</th>
                    <th className="py-2 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {imputedParts.map((part, index) => (
                    <tr key={`${part.id}-${part.quality}-${index}`} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-200 block truncate max-w-[120px]">{part.name}</span>
                        <span className="text-[8px] text-slate-500 uppercase">{part.quality}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-300">x{part.quantity}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-400">{curSymbol}{Number(part.price || 0).toLocaleString('es-AR')}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-cyan-400">
                        {curSymbol}{(Number(part.price || 0) * Number(part.quantity || 1)).toLocaleString('es-AR')}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button type="button" onClick={() => handleRemovePart(part.id, part.quantity, part.quality)} className="text-rose-500 hover:text-rose-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mano de Obra</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 font-bold text-slate-500">{curSymbol}</span>
              <input
                type="number"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-2 text-xs font-bold text-slate-200 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TARJETA 2: COSTOS ADICIONALES Y ABONO REVISIÓN */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            2. Adicionales y Abonos
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Descuento Taller</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Tipo</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-300"
              >
                <option value="PERCENT">%</option>
                <option value="FIXED">{curSymbol}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 flex justify-between">
              <span>Abono de Revisión / Diagnóstico</span>
              <span className="text-cyan-400">Importe: {curSymbol}{diagnosisCostNum.toLocaleString()}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'NONE', label: 'No Aplicar', color: 'slate' },
                { id: 'PENDING', label: 'Pendiente (+)', color: 'cyan' },
                { id: 'PAID', label: 'Ya Pagado (-)', color: 'emerald' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setDiagnosisFeeMode(mode.id)}
                  className={`py-2 text-[8px] font-black uppercase rounded-lg border transition-all ${
                    diagnosisFeeMode === mode.id
                      ? `bg-${mode.color}-950 text-${mode.color}-400 border-${mode.color}-500/60 ring-1 ring-${mode.color}-500/20`
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="block text-[9px] text-slate-600 uppercase font-bold mb-1">Monto de Revisión Personalizado</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-[10px]">{curSymbol}</span>
                <input
                  type="number"
                  value={diagnosisCost}
                  onChange={(e) => setDiagnosisCost(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded pl-7 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
            <p className="text-[7px] text-slate-600 mt-2 px-1 uppercase font-bold tracking-tighter leading-tight">
              * El monto se suma si está Pendiente o se resta si ya fue Pagado (crédito).
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Costo Flete</label>
              <input
                type="number"
                value={freightCost}
                onChange={(e) => setFreightCost(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">IVA (%)</label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 10.5, 21].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setIvaRate(rate)}
                    className={`py-1 rounded border text-xs font-mono transition-all ${ivaRate === rate ? 'bg-amber-950 text-amber-400 border-amber-500/60' : 'bg-slate-900 text-slate-500'}`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 3: RESUMEN Y TOTALES */}
        <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 shadow-xl space-y-4">
          <h4 className="text-xs font-black text-slate-350 uppercase tracking-wider flex items-center gap-2 border-b border-slate-900 pb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            3. Resumen y Confirmación
          </h4>

          <div className="bg-slate-900/60 p-4 border border-slate-900 rounded-xl space-y-2 font-mono text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{curSymbol} {repairSubtotal.toLocaleString('es-AR')}</span>
            </div>

            {parseFloat(discountValue || 0) > 0 && (
              <div className="flex justify-between text-rose-400 font-bold">
                <span>Descuento:</span>
                <span>- {curSymbol} {discountAmount.toLocaleString('es-AR')}</span>
              </div>
            )}

            {diagnosisFeeMode !== 'NONE' && (
              <div className={`flex justify-between font-bold ${diagnosisFeeMode === 'PENDING' ? 'text-cyan-400' : 'text-emerald-400'}`}>
                <span>{diagnosisFeeMode === 'PENDING' ? 'Diagnóstico (+)' : 'Seña/Abono (-)'}:</span>
                <span>{curSymbol} {diagnosisCostNum.toLocaleString('es-AR')}</span>
              </div>
            )}

            <div className="border-t border-slate-800 pt-2.5 mt-2 flex items-center justify-between text-slate-200">
              <span className="text-xs font-black text-white uppercase tracking-widest font-sans">TOTAL NETO:</span>
              <span className="text-sm font-black text-emerald-400 bg-slate-950 px-3 py-1 rounded border border-emerald-500/20">
                {curSymbol} {grandTotal.toLocaleString('es-AR')}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleSaveBudget}
              className="w-full py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded uppercase shadow-lg active:scale-95 transition-all"
            >
              💾 Guardar Presupuesto
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleSendWhatsApp} className="py-2 text-[10px] font-bold text-white bg-green-600 rounded uppercase">📲 WhatsApp</button>
              <button onClick={handleDownloadPDF} className="py-2 text-[10px] font-bold text-white bg-indigo-600 rounded uppercase">📄 PDF</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
