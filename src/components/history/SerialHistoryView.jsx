import React, { useState } from 'react';
import { StatusBadge } from '../common/Badges';
import { exportSerialHistoryToPDF } from '../../services/pdfService';

/**
 * Componente SerialHistoryView para la trazabilidad clínica de los equipos médicos.
 * Permite buscar un equipo por su número de serie o clínica, ver su ficha consolidad
 * y recorrer una línea de tiempo (Timeline) cronológica de todas sus reparaciones previas.
 * 
 * @param {Object} props
 * @param {Array} props.workOrders - Historial completo de órdenes de trabajo del taller.
 */
export default function SerialHistoryView({ workOrders }) {
  const [query, setQuery] = useState('');
  const [selectedSerial, setSelectedSerial] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Obtener lista de números de serie únicos y sus metadatos del historial
  const serialsMap = workOrders.reduce((acc, order) => {
    if (order.serialNumber) {
      const sn = order.serialNumber.trim();
      if (!acc[sn]) {
        acc[sn] = {
          serialNumber: sn,
          brand: order.brand,
          model: order.model,
          equipmentType: order.equipmentType,
          clientName: order.clientName,
          clientPhone: order.clientPhone
        };
      }
    }
    return acc;
  }, {});

  const uniqueSerials = Object.values(serialsMap);

  // Filtrar sugerencias de series en tiempo real según lo que tipea el usuario
  const suggestions = uniqueSerials.filter(item => {
    const q = query.toLowerCase().trim();
    if (!q) return false;

    const sn = (item.serialNumber || "").toLowerCase();
    const cn = (item.clientName || "").toLowerCase();
    const md = (item.model || "").toLowerCase();
    const br = (item.brand || "").toLowerCase();

    return sn.includes(q) || cn.includes(q) || md.includes(q) || br.includes(q);
  });

  const handleSelectSerial = (serialNumber) => {
    setSelectedSerial(serialNumber);
    setQuery(serialNumber);
    setShowSuggestions(false);
  };

  // Filtrar OTs vinculadas al número de serie seleccionado ordenadas por fecha descendente (más recientes primero)
  const historyOrders = workOrders
    .filter(order => order.serialNumber && order.serialNumber.trim() === selectedSerial)
    .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

  // Datos consolidados del equipo actual
  const latestEquipmentMeta = serialsMap[selectedSerial] || (historyOrders.length > 0 ? historyOrders[0] : null);
  const totalInterventions = historyOrders.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Cabecera del Historial */}
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-glow shadow-cyan-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Medical Device Clinical Record</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Historial Clínico de Equipos</h2>
        <p className="text-xs text-slate-500 mt-0.5">Trazabilidad técnica completa. Busque por número de serie para auditar parámetros e intervenciones históricas.</p>
      </div>

      {/* Selector y Buscador con Sugerencias en Tiempo Real */}
      <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-3 relative">
        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">Buscar por N° de Serie, Marca o Clínica</label>
        
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Ej: SN-998811-CRIO / Estética Bella..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              if (selectedSerial && e.target.value !== selectedSerial) {
                setSelectedSerial(''); // Resetear si cambia el texto
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono tracking-wider font-semibold"
          />

          {/* Listado Flotante de Sugerencias */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-900">
              {suggestions.map((item) => (
                <button
                  key={item.serialNumber}
                  type="button"
                  onClick={() => handleSelectSerial(item.serialNumber)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-900 transition-colors flex justify-between items-center text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-cyan-400 tracking-wide">{item.serialNumber}</div>
                    <div className="text-slate-400 mt-0.5">{item.brand} {item.model}</div>
                  </div>
                  <div className="text-right">
                    <span className="bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-500 font-semibold block">
                      {item.clientName}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info adicional para guiar */}
        <p className="text-[10px] text-slate-500">
          La sugerencia autocompleta con registros ingresados anteriormente en el sistema.
        </p>
      </div>

      {/* PANEL DE RESULTADOS */}
      {selectedSerial && latestEquipmentMeta ? (
        <div className="space-y-6">
          
          {/* Ficha Resumen del Equipo */}
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="space-y-1 md:col-span-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ficha Clínica de Aparatología</span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{latestEquipmentMeta.brand} {latestEquipmentMeta.model}</span>
                  <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/30 text-[10px] font-bold px-2 py-0.5 rounded">
                    {latestEquipmentMeta.equipmentType}
                  </span>
                </h3>
                
                <button
                  type="button"
                  onClick={() => exportSerialHistoryToPDF(selectedSerial, historyOrders, latestEquipmentMeta)}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg active:scale-95 transition-all uppercase tracking-wider font-sans"
                >
                  📄 Exportar Historial PDF
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-3 text-xs text-slate-400">
                <div>
                  <span className="text-slate-500 font-semibold">Nro. de Serie: </span>
                  <span className="font-mono font-bold text-slate-200">{latestEquipmentMeta.serialNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Propietario / Clínica: </span>
                  <span className="text-slate-200 font-semibold">{latestEquipmentMeta.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">WhatsApp de Contacto: </span>
                  <span className="text-slate-200 font-mono">{latestEquipmentMeta.clientPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Identificación: </span>
                  <span className="text-slate-200">Aprobado para Servicio</span>
                </div>
              </div>
            </div>

            {/* Contador de Intervenciones */}
            <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Intervenciones</span>
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 mt-1">
                {totalInterventions}
              </span>
              <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-wider">Historial Clínico en Lab</p>
            </div>

          </div>

          {/* Línea de Tiempo Cronológica (Timeline) */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Línea de Tiempo de Reparaciones y Calibración
            </h4>

            {/* Contenedor del Timeline */}
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
              
              {historyOrders.map((order, index) => {
                const bench = order.benchTest || {};
                const hasBenchData = Object.keys(bench).length > 0;

                return (
                  <div key={order.id} className="relative group">
                    
                    {/* Punto del Timeline */}
                    <span className="absolute -left-9.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 border-2 border-cyan-500 group-hover:bg-cyan-500 transition-colors shadow">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                    </span>

                    {/* Tarjeta de la OT */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-5 space-y-4 hover:border-slate-700 transition-colors">
                      
                      {/* Cabecera Tarjeta */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-900 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-mono font-black text-cyan-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-850">
                            {order.id}
                          </span>
                          <span className="text-xs text-slate-500 font-mono font-semibold">
                            Fecha de Entrada: {order.entryDate}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          {order.qcPassed && (
                            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800/30 text-[10px] font-bold px-2 py-0.5 rounded">
                              QC PASSED ✓
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fallas y Cosmética */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                          <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Síntoma reportado por el Cliente:</span>
                          <p className="text-slate-300 italic">"{order.problemDescription || "Revisión nominal"}"</p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900">
                          <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">Estado cosmético al ingresar:</span>
                          <p className="text-slate-400 font-mono">
                            {order.cosmeticCondition || "Sin marcas ni observaciones críticas reportadas."}
                          </p>
                        </div>
                      </div>

                      {/* Diagnóstico y Solución */}
                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Diagnóstico Técnico de Ingeniería:</span>
                          <p className="text-slate-300 font-mono mt-1 leading-relaxed bg-slate-900/20 p-2.5 rounded border border-slate-900">
                            {order.diagnosis || "No se ha ingresado un diagnóstico detallado aún."}
                          </p>
                        </div>
                        {order.solution && (
                          <div>
                            <span className="block text-[10px] text-emerald-500 font-black uppercase tracking-wider">Sustitución de Hardware y Ajustes:</span>
                            <p className="text-slate-300 font-mono mt-1 leading-relaxed bg-emerald-950/5 p-2.5 rounded border border-emerald-900/10">
                              {order.solution}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Parámetros de Banco Guardados */}
                      {hasBenchData && (
                        <div className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-900">
                          <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2.5">Parámetros Críticos Calibrados en Banco:</span>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-[11px] text-slate-400">
                            <div>
                              <span className="text-slate-600 block text-[9px] uppercase font-semibold">Flujo Líq.</span>
                              <span className="text-cyan-400 font-bold">{bench.coolantFlow || "N/D"} L/min</span>
                            </div>
                            <div>
                              <span className="text-slate-600 block text-[9px] uppercase font-semibold">Temp Peltier</span>
                              <span className="text-cyan-400 font-bold">{bench.peltierTemp || "N/D"} °C</span>
                            </div>
                            <div>
                              <span className="text-slate-600 block text-[9px] uppercase font-semibold">Vacío / Succ.</span>
                              <span className="text-cyan-400 font-bold">{bench.vacuumPressure || "N/D"} bar</span>
                            </div>
                            <div>
                              <span className="text-slate-600 block text-[9px] uppercase font-semibold">Tens. Red / HV</span>
                              <span className="text-slate-300">{bench.voltageNet || "220"}V / {bench.voltageHV || "24"}V</span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-600 block text-[9px] uppercase font-semibold">Historial Uso</span>
                              <span className="text-slate-300">{bench.shotCounter || 0} disp.</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Repuestos Imputados */}
                      {order.spareParts && order.spareParts.length > 0 && (
                        <div>
                          <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1.5">Repuestos e Insumos Imputados:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {order.spareParts.map((part) => (
                              <span key={part.id} className="bg-slate-900 border border-slate-850 px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                                {part.name} (x{part.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Costo final de la intervención */}
                      {order.cost > 0 && (
                        <div className="flex justify-end text-xs font-mono">
                          <span className="text-slate-500">Costo del Servicio: </span>
                          <span className="font-bold text-slate-300 ml-1.5">$ {order.cost.toLocaleString('es-AR')} ARS</span>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

            </div>
          </div>

        </div>
      ) : (
        selectedSerial ? (
          <p className="text-xs text-slate-500 p-8 bg-slate-950 border border-slate-850 rounded-xl text-center">
            No se han encontrado registros consolidados para el número de serie ingresado.
          </p>
        ) : (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-slate-700 mb-4 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h5 className="text-slate-400 font-bold uppercase tracking-wider">Historial Clínico en Espera</h5>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">Por favor, busque e ingrese un número de serie en el cuadro superior para listar la ficha técnica unificada y ver el histórico de laboratorio.</p>
          </div>
        )
      )}

    </div>
  );
}
