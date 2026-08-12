import React, { useState } from 'react';
import { exportInventoryToPDF } from '../../services/pdfService';

// List of standard categories for filtering and input
const CATEGORIES = ['TODOS', 'PELTIER', 'BOMBAS', 'SENSORES', 'CONECTORES', 'FUENTES', 'LÁSER', 'CAPACITORES', 'RESISTENCIAS', 'DIODOS', 'TRANSISTORES', 'INTEGRADOS'];

// Form state template for adding/editing a spare part
const INITIAL_FORM_STATE = {
  name: '',
  category: 'SENSORES',
  stock: 0,
  minStock: 2,
  price: 0,
  equipmentType: 'Criolipólisis'
};

/**
 * Componente especializado para la administración y control del almacén de insumos.
 * Cuenta con filtros rápidos por categoría, alertas visuales de nivel crítico
 * y un modal completo para agregar o editar repuestos.
 * 
 * @param {Object} props
 * @param {Array} props.inventory - Listado del inventario actual en localStorage.
 * @param {Function} props.onSaveItem - Callback para registrar/actualizar un repuesto: (item) => void.
 */
export default function InventoryView({ inventory, onSaveItem }) {
  // Estado para el filtrado de categoría
  const [activeCategory, setActiveCategory] = useState('TODOS');
  
  // Estado para búsqueda por descripción
  const [searchQuery, setSearchQuery] = useState('');

  // Control del modal de inserción / edición
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Si es null, estamos agregando; si no, editando.
  const [form, setForm] = useState(INITIAL_FORM_STATE);

  // Helper para clasificar dinámicamente ítems si no tienen categoría pre-definida
  const getItemCategory = (item) => {
    if (item.category) return item.category.toUpperCase();
    const name = item.name.toLowerCase();
    if (name.includes('sensor') || name.includes('ntc')) return 'SENSORES';
    if (name.includes('switch') || name.includes('pulsador') || name.includes('microswitch')) return 'CONECTORES';
    if (name.includes('peltier') || name.includes('celda')) return 'PELTIER';
    if (name.includes('bomba') || name.includes('motor') || name.includes('refrigeracion')) return 'BOMBAS';
    if (name.includes('fuente') || name.includes('power') || name.includes('tension')) return 'FUENTES';
    if (name.includes('laser') || name.includes('diodo') || name.includes('depil')) return 'LÁSER';
    if (name.includes('capacitor') || name.includes('condensador')) return 'CAPACITORES';
    if (name.includes('resistencia') || name.includes('resistor')) return 'RESISTENCIAS';
    if (name.includes('diodo') || name.includes('puente')) return 'DIODOS';
    if (name.includes('transistor') || name.includes('mosfet') || name.includes('igbt')) return 'TRANSISTORES';
    if (name.includes('integrado') || name.includes('chip') || name.includes('microcontrolador') || name.includes('opamp')) return 'INTEGRADOS';
    return 'GENERAL'; // Categoría de respaldo
  };

  // Manejo del cambio en campos del formulario
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Permitir que el campo esté vacío mientras se edita para evitar el "0" fijo
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Abre el modal para añadir un repuesto nuevo
  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ ...INITIAL_FORM_STATE });
    setIsOpen(true);
  };

  // Abre el modal para editar un repuesto existente
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: getItemCategory(item),
      stock: item.stock.toString(),
      minStock: item.minStock.toString(),
      price: item.price.toString(),
      equipmentType: item.equipmentType || 'Criolipólisis'
    });
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setForm(INITIAL_FORM_STATE);
    setIsOpen(false);
  };

  // Envío del formulario (Guardar o Añadir)
  const handleSubmit = (e) => {
    e.preventDefault();

    const stockVal = parseInt(form.stock, 10);
    const minStockVal = parseInt(form.minStock, 10);
    const priceVal = parseFloat(form.price);

    if (!form.name.trim() || isNaN(priceVal) || isNaN(stockVal)) {
      alert("Por favor, ingrese valores válidos.");
      return;
    }

    const payload = {
      ...editingItem, // Preservar ID si estamos editando
      name: form.name.trim(),
      category: form.category,
      stock: stockVal,
      minStock: minStockVal,
      price: priceVal,
      equipmentType: form.equipmentType
    };

    onSaveItem(payload);
    handleCloseModal();
  };

  // Ajuste rápido de stock de la tabla (+1 / -1)
  const handleQuickStockAdjust = (item, diff) => {
    const updated = {
      ...item,
      category: getItemCategory(item), // Garantiza que persista la categoría
      stock: Math.max(0, item.stock + diff)
    };
    onSaveItem(updated);
  };

  // --- PROCESO DE FILTRADO DE INSUMOS ---
  const filteredInventory = inventory.filter(item => {
    const itemCat = getItemCategory(item);
    
    // Filtro 1: Categoría seleccionada
    const matchesCategory = activeCategory === 'TODOS' || itemCat === activeCategory;

    // Filtro 2: Barra de búsqueda (Nombre, Código o Compatibilidad)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      (item.id && item.id.toString().toLowerCase().includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.equipmentType && item.equipmentType.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Cabecera del Almacén */}
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-glow shadow-emerald-500"></span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">Inventory Management Console</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Control de Repuestos y Almacén</h2>
          <p className="text-xs text-slate-500 mt-0.5">Gestión de existencias críticas, precios de insumos y compatibilidades de aparatología.</p>
        </div>

        {/* Botón de Ingreso de Repuesto */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-lg hover:shadow-cyan-400/10 active:scale-95 transition-all shrink-0 uppercase tracking-wider"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Ingresar Repuesto</span>
        </button>
      </div>

      {/* Controles de Búsqueda y Filtros Rápidos */}
      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4">
        
        {/* Barra de Búsqueda por Texto */}
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-600 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por descripción, código o compatibilidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Filtros horizontales por categorías */}
        <div>
          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Filtrar por Categoría</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    isActive
                      ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 shadow shadow-cyan-500/5'
                      : 'bg-slate-900/30 border-slate-850/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Tabla Principal de Repuestos */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-12 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <h4 className="text-slate-400 font-bold uppercase tracking-wider">No se encontraron insumos</h4>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">Prueba modificando la categoría o los criterios de búsqueda.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/40">
                  <th className="py-3 px-5 font-bold">Código</th>
                  <th className="py-3 px-4 font-bold">Descripción del Insumo</th>
                  <th className="py-3 px-4 font-bold text-center">Categoría</th>
                  <th className="py-3 px-4 font-bold text-center">Nivel de Existencia</th>
                  <th className="py-3 px-4 font-bold text-right">Precio Unitario</th>
                  <th className="py-3 px-5 font-bold text-right">Acciones de Almacén</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredInventory.map((item) => {
                  const itemCat = getItemCategory(item);
                  const isLow = item.stock <= item.minStock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/30 transition-colors group">
                      
                      {/* Código de Insumo */}
                      <td className="py-4 px-5 font-mono font-bold text-cyan-400 tracking-wider">
                        <span className="bg-slate-900/80 border border-slate-850 px-2 py-0.5 rounded shadow-inner">
                          {item.id}
                        </span>
                      </td>

                      {/* Descripción y Compatibilidad */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-200 text-sm">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="bg-slate-900 border border-slate-850/50 px-1.5 py-0.2 rounded text-slate-400">
                            Soporte: {item.equipmentType || "Aparatología General"}
                          </span>
                        </div>
                      </td>

                      {/* Categoría Badge */}
                      <td className="py-4 px-4 text-center">
                        <span className="bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400">
                          {itemCat}
                        </span>
                      </td>

                      {/* Stock / Alerta */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-black ${isLow ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                            {item.stock} <span className="text-[10px] font-normal text-slate-500">unidades</span>
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">Mínimo Crítico: {item.minStock}</span>
                        </div>
                      </td>

                      {/* Precio Unitario */}
                      <td className="py-4 px-4 text-right font-mono font-black text-cyan-400 text-sm">
                        {item.price === 0 ? (
                          <span className="text-emerald-500 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">Traído por Cliente</span>
                        ) : (
                          `$ ${item.price.toLocaleString('es-AR')} ARS`
                        )}
                      </td>

                      {/* Ajuste Rápido y Edición */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Ajustadores Rápidos de Existencias */}
                          <div className="flex items-center bg-slate-900/60 border border-slate-800 rounded overflow-hidden shadow-inner">
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item, -1)}
                              disabled={item.stock === 0}
                              className="px-2.5 py-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/10 disabled:opacity-20 disabled:hover:bg-transparent font-bold transition-all text-xs"
                              title="Descontar 1 unidad"
                            >
                              -
                            </button>
                            <div className="w-8 text-center text-slate-400 text-[10px] font-bold border-l border-r border-slate-800 font-mono">
                              {item.stock}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickStockAdjust(item, 1)}
                              className="px-2.5 py-1 text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/10 font-bold transition-all text-xs"
                              title="Adicionar 1 unidad"
                            >
                              +
                            </button>
                          </div>

                          <span className="h-4 w-px bg-slate-850"></span>

                          {/* Botón de Edición del Registro */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold transition-colors uppercase tracking-wider"
                          >
                            Editar
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL AGREGAR / EDITAR REPUESTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop con desenfoque */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10">
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/40">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                {editingItem ? `Editar Insumo (${editingItem.id})` : "Añadir Nuevo Insumo / Repuesto"}
              </h3>
              <button onClick={handleCloseModal} className="text-zinc-500 hover:text-zinc-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-zinc-300">
              
              {/* Descripción */}
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Descripción / Nombre del Insumo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Ej: Microswitch de disparo metálico"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Categoría */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Categoría <span className="text-red-500">*</span></label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 cursor-pointer focus:outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'TODOS').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Compatibilidad */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Soporte Aparatología</label>
                  <select
                    name="equipmentType"
                    value={form.equipmentType}
                    onChange={handleFormChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 cursor-pointer focus:outline-none"
                  >
                    <option value="Criolipólisis">Criolipólisis</option>
                    <option value="Láser Diodo">Láser Diodo</option>
                    <option value="Radiofrecuencia">Radiofrecuencia</option>
                    <option value="Cavitador">Cavitador</option>
                    <option value="Vacumterapia">Vacumterapia</option>
                    <option value="General">General / Compatible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Stock Actual */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Stock Inicial <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    required
                    value={form.stock}
                    onChange={handleFormChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-semibold"
                  />
                </div>

                {/* Stock Mínimo */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5">Alerta Mín. <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="minStock"
                    min="0"
                    required
                    value={form.minStock}
                    onChange={handleFormChange}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-100 font-semibold"
                  />
                </div>

                {/* Precio Unitario */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1.5 flex justify-between items-center">
                    <span>Precio ($)</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      name="price"
                      min="0"
                      required
                      value={form.price}
                      onChange={handleFormChange}
                      disabled={form.price === "0"}
                      className={`w-full border rounded p-2 text-xs font-mono font-bold focus:ring-1 focus:ring-cyan-500 transition-all ${form.price === "0" ? 'bg-zinc-800 border-zinc-700 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-100'}`}
                    />
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.price === "0"}
                        onChange={(e) => setForm(prev => ({ ...prev, price: e.target.checked ? "0" : "" }))}
                        className="w-3.5 h-3.5 accent-cyan-500"
                      />
                      <span className="text-[9px] text-zinc-500 group-hover:text-cyan-400 uppercase font-black tracking-tighter">Insumo provisto por cliente ($0)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-[10px] font-bold text-zinc-400 hover:text-zinc-200 uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-[10px] font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded uppercase tracking-wider shadow"
                >
                  {editingItem ? "Actualizar Insumo" : "Añadir al Almacén"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
