import React, { useState, useEffect, useMemo } from 'react';

/**
 * Componente especializado BenchTestView para la mesa de mediciones de laboratorio.
 * Brinda un diseño industrial y cibernético de ingeniería para registrar y validar parámetros físicos.
 * 
 * @param {Object} props
 * @param {Object} props.selectedOT - Orden de trabajo seleccionada para ensayar en banco.
 * @param {Function} props.onSaveOT - Callback para guardar los parámetros: (ordenActualizada) => void.
 * @param {Array} props.inventory - Listado de repuestos para referencia de compatibilidad si es necesario.
 * @param {Function} props.onGeneratePDF - Callback para disparar la descarga de reporte técnico / PDF.
 */
export default function BenchTestView({ selectedOT, onSaveOT, inventory, onGeneratePDF }) {
  
  // Estado local para almacenar las mediciones de laboratorio
  const [testForm, setTestForm] = useState({
    coolantFlow: '',
    peltierTemp: '',
    vacuumPressure: '',
    voltageNet: '220',
    voltageHV: '24',
    frequency: '50',
    shotCounter: '',
    hoursOfUse: '',
    qcPassed: false,
    rootCauseReport: '',
    internalNotes: '',
    checklist: {}
  });

  // Checklist dinámico según tipo de equipo
  const getChecklistTemplate = (type) => {
    const common = ["Prueba de seguridad eléctrica", "Limpieza de chasis", "Ajuste de tornillería"];
    const templates = {
      "Criolipólisis": ["Verificación de vacío (bar)", "Prueba de celdas Peltier", "Nivel de líquido refrigerante", "Filtro de agua"],
      "Láser Diodo": ["Potencia de emisión (J)", "Temperatura de zafiro", "Flujo de agua", "Disparos de prueba"],
      "Radiofrecuencia": ["Prueba de impedancia", "Temperatura de contacto", "Integridad del cabezal"],
      "VelaShape": ["Presión de succión", "Rodillos mecánicos", "Infrarrojo OK"]
    };
    return [...(templates[type] || []), ...common];
  };

  const checklistItems = useMemo(() => getChecklistTemplate(selectedOT?.deviceType), [selectedOT?.deviceType]);

  // Al seleccionar una orden, cargamos sus mediciones preexistentes o establecemos valores base
  useEffect(() => {
    if (selectedOT) {
      setTestForm({
        coolantFlow: selectedOT.benchTest?.coolantFlow || '',
        peltierTemp: selectedOT.benchTest?.peltierTemp || '',
        vacuumPressure: selectedOT.benchTest?.vacuumPressure || '',
        voltageNet: selectedOT.benchTest?.voltageNet || '220',
        voltageHV: selectedOT.benchTest?.voltageHV || '24',
        frequency: selectedOT.benchTest?.frequency || '50',
        shotCounter: selectedOT.benchTest?.shotCounter || '',
        hoursOfUse: selectedOT.benchTest?.hoursOfUse || '',
        qcPassed: selectedOT.qcPassed || false,
        rootCauseReport: selectedOT.diagnosis || '',
        internalNotes: selectedOT.internalNotes || '',
        checklist: selectedOT.benchTest?.checklist || {}
      });
    }
  }, [selectedOT]);

  if (!selectedOT) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-12 h-12 mx-auto text-slate-700 mb-3 animate-pulse">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
        </svg>
        <p className="text-sm font-bold uppercase text-slate-500 tracking-wider">Mesa de Mediciones Inactiva</p>
        <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">Selecciona una orden de trabajo activa en la tabla principal para montar el equipo sobre el banco técnico de simulación.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValue(name, type === 'checkbox' ? checked : value);
  };

  const setFormValue = (name, value) => {
    setTestForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Guardado de mediciones en la orden de trabajo
  const handleSave = (e) => {
    e.preventDefault();

    const updatedWorkOrder = {
      ...selectedOT,
      diagnosis: testForm.rootCauseReport.trim(),
      internalNotes: testForm.internalNotes.trim(),
      qcPassed: testForm.qcPassed,
      // Actualizamos automáticamente el estado a 'EN_PRUEBAS' o 'LISTO' según control de calidad
      status: testForm.qcPassed ? 'LISTO' : (selectedOT.status === 'INGRESO' ? 'EN_DIAGNOSTICO' : selectedOT.status),
      benchTest: {
        coolantFlow: testForm.coolantFlow,
        peltierTemp: testForm.peltierTemp,
        vacuumPressure: testForm.vacuumPressure,
        voltageNet: testForm.voltageNet,
        voltageHV: testForm.voltageHV,
        frequency: testForm.frequency,
        shotCounter: testForm.shotCounter,
        hoursOfUse: testForm.hoursOfUse,
        checklist: testForm.checklist
      }
    };

    onSaveOT(updatedWorkOrder);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl max-w-4xl mx-auto">
      
      {/* Banner de Cabecera Industrial */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-glow shadow-cyan-400"></span>
            <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Workbench Terminal v2.16</span>
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-wider mt-1">
            Banco de Ensayos Técnicos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Mesa de pruebas avanzadas para aparatología de estética de alta gama</p>
        </div>

        {/* OT Activa */}
        <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg flex items-center gap-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Orden Vinculada</div>
            <div className="text-sm font-mono font-black text-emerald-400">{selectedOT.id}</div>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Equipo</div>
            <div className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">{selectedOT.equipmentName}</div>
          </div>
        </div>
      </div>

      {/* Formulario de Parámetros */}
      <form onSubmit={handleSave} className="p-6 space-y-6">
        
        {/* Grilla 2x3 de Parámetros de Estética */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Parámetro 1: Refrigeración Líquida */}
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Hidráulica</span>
                <label className="text-xs font-bold text-slate-300 block">Flujo de Líquido Refrigerante</label>
              </div>
              <span className="p-1.5 bg-blue-950 text-blue-400 rounded-lg border border-blue-800/20 text-xs">
                🌊
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                name="coolantFlow"
                value={testForm.coolantFlow}
                onChange={handleChange}
                placeholder="Ej: 4.2"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-xs font-mono font-bold text-slate-500">L/min</span>
            </div>
          </div>

          {/* Parámetro 2: Temperatura de Cabezal / Celdas Peltier */}
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Termodinámica</span>
                <label className="text-xs font-bold text-slate-300 block">Temperatura Celdas Peltier</label>
              </div>
              <span className="p-1.5 bg-cyan-950 text-cyan-400 rounded-lg border border-cyan-800/20 text-xs">
                ❄️
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                name="peltierTemp"
                value={testForm.peltierTemp}
                onChange={handleChange}
                placeholder="Ej: -8"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-xs font-mono font-bold text-slate-500">°C (Subcero)</span>
            </div>
          </div>

          {/* Parámetro 3: Presión de Vacío / Succión */}
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Neumática</span>
                <label className="text-xs font-bold text-slate-300 block">Presión de Vacío / Succión</label>
              </div>
              <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg border border-purple-800/20 text-xs">
                💨
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                name="vacuumPressure"
                value={testForm.vacuumPressure}
                onChange={handleChange}
                placeholder="Ej: -0.65"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-1.5 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <span className="text-xs font-mono font-bold text-slate-500">bar</span>
            </div>
          </div>

          {/* Parámetro 4: Tensión Eléctrica y Frecuencia */}
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors lg:col-span-2">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Potencia</span>
                <label className="text-xs font-bold text-slate-300 block">Tensiones del Sistema Eléctrico</label>
              </div>
              <span className="p-1.5 bg-yellow-950/50 text-yellow-500 rounded-lg border border-yellow-800/20 text-xs">
                ⚡
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Tensión Red</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="voltageNet"
                    value={testForm.voltageNet}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs font-mono font-bold text-slate-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-500">V</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Fuentes HV</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="voltageHV"
                    value={testForm.voltageHV}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs font-mono font-bold text-slate-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-500">V</span>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Frecuencia</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    name="frequency"
                    value={testForm.frequency}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-850 rounded px-2 py-1 text-xs font-mono font-bold text-slate-300 focus:outline-none"
                  />
                  <span className="text-[10px] font-mono font-bold text-slate-500">Hz</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parámetro 5: Métricas de Desgaste (Disparos / Horas) */}
          <div className="bg-slate-800/40 border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Contadores</span>
                <label className="text-xs font-bold text-slate-300 block">Contadores de Emisión</label>
              </div>
              <span className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/20 text-xs">
                📈
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Disparos</span>
                <input
                  type="number"
                  name="shotCounter"
                  value={testForm.shotCounter}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-300 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-semibold">Horas Uso</span>
                <input
                  type="number"
                  name="hoursOfUse"
                  value={testForm.hoursOfUse}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        <hr className="border-slate-800" />

        {/* CHECKLIST DE CONTROL DE CALIDAD */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            Checklist de Control de Calidad (QC)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklistItems.map((item, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  testForm.checklist[item]
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!testForm.checklist[item]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTestForm(prev => ({
                      ...prev,
                      checklist: { ...prev.checklist, [item]: checked }
                    }));
                  }}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs font-bold">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Diagnóstico técnico y causa raíz de la falla */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              Informe para el Cliente (PDF)
            </label>
            <p className="text-[10px] text-slate-500 mb-2 italic">Este texto aparecerá en el presupuesto oficial enviado al cliente.</p>
            <textarea
              name="rootCauseReport"
              rows="4"
              required
              value={testForm.rootCauseReport}
              onChange={handleChange}
              placeholder="Ej: El cabezal presentaba micro-fuga de agua..."
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-3 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500"></span>
              Bitácora Técnica (Privada)
            </label>
            <p className="text-[10px] text-slate-500 mb-2 italic">Notas internas solo para técnicos. No sale en el PDF.</p>
            <textarea
              name="internalNotes"
              rows="4"
              value={testForm.internalNotes}
              onChange={handleChange}
              placeholder="Ej: Pin 5 de la placa lógica oscilando a 12V inestables. Se cambió integrado U3..."
              className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-3 text-xs text-cyan-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* CHECKLIST DE CONTROL DE CALIDAD */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
            Checklist de Control de Calidad (QC)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklistItems.map((item, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  testForm.checklist[item]
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!testForm.checklist[item]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTestForm(prev => ({
                      ...prev,
                      checklist: { ...prev.checklist, [item]: checked }
                    }));
                  }}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs font-bold">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Sección de Certificación y Control de Calidad (QC) */}
        <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center border text-lg transition-all ${
              testForm.qcPassed 
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-inner shadow-emerald-500/10' 
                : 'bg-slate-900 text-slate-600 border-slate-800'
            }`}>
              {testForm.qcPassed ? '✓' : '✗'}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Certificación de Seguridad Eléctrica & QC</h4>
              <p className="text-[10px] text-slate-500">¿El equipo cumple con los estándares de control de calidad para uso clínico?</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox" 
              name="qcPassed"
              checked={testForm.qcPassed}
              onChange={handleChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-cyan-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-slate-100 peer-checked:after:border-emerald-600"></div>
            <span className="ml-3 text-xs font-semibold text-slate-400 peer-checked:text-emerald-400 transition-colors">
              {testForm.qcPassed ? 'Pasa Control de Calidad (QC OK)' : 'Rechazado / En Espera'}
            </span>
          </label>
        </div>

        {/* Botones de Acción de Laboratorio */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800 bg-slate-900/30">
          <button
            type="button"
            onClick={() => onGeneratePDF(selectedOT)}
            disabled={!testForm.qcPassed}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-black text-emerald-400 hover:text-slate-950 bg-emerald-950/20 hover:bg-gradient-to-r hover:from-emerald-400 hover:to-emerald-300 border border-emerald-800/30 hover:border-transparent rounded-lg disabled:opacity-20 disabled:hover:bg-emerald-950/20 disabled:hover:text-emerald-400 disabled:cursor-not-allowed transition-all uppercase tracking-wider shadow-sm shadow-emerald-500/5 shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>Generar Certificado QC (PDF)</span>
          </button>
          
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider font-mono shrink-0"
          >
            Guardar Parámetros de Banco
          </button>
        </div>

      </form>
    </div>
  );
}
