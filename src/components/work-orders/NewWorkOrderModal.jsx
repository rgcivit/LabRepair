import React, { useState } from 'react';

// List of pre-defined accessories for interactive selection
const AVAILABLE_ACCESSORIES = [
  "Cabezal Principal",
  "Cabezal Secundario",
  "Pedal de Disparo",
  "Cable de Poder",
  "Gafas de Operador",
  "Gafas de Paciente",
  "Embudo de Carga",
  "Manual / Documentación"
];

const INITIAL_STATE = {
  clientName: '',
  clientPhone: '',
  brand: '',
  model: '',
  serialNumber: '',
  equipmentType: 'Criolipólisis',
  priority: 'MEDIA',
  accessories: [],
  cosmeticCondition: ''
};

/**
 * Componente Modal para el registro y alta de órdenes de trabajo.
 * Diseñado con una estética oscura ("Taller/Laboratorio Electrónico") y bordes de alta tecnología.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Indica si el modal está abierto.
 * @param {Function} props.onClose - Función para cerrar el modal.
 * @param {Function} props.onSave - Callback al guardar la nueva OT: (nuevaOT) => void.
 * @param {Array} props.existingOrders - Listado de órdenes de trabajo previas para sugerencia de clientes.
 */
export default function NewWorkOrderModal({ isOpen, onClose, onSave, existingOrders = [] }) {
  const [form, setForm] = useState(INITIAL_STATE);

  // Memoizar lista de clientes únicos e históricos para autocompletar
  const uniqueClients = React.useMemo(() => {
    const clientsMap = {};
    existingOrders.forEach(order => {
      if (order.clientName) {
        const name = order.clientName.trim();
        if (!clientsMap[name]) {
          clientsMap[name] = order.clientPhone || '';
        }
      }
    });
    return Object.entries(clientsMap).map(([name, phone]) => ({ name, phone }));
  }, [existingOrders]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'clientName') {
        const matchedClient = uniqueClients.find(c => c.name.toLowerCase() === value.trim().toLowerCase());
        if (matchedClient) {
          updated.clientPhone = matchedClient.phone;
        }
      }
      return updated;
    });
  };

  // Alterna la selección de un accesorio
  const handleToggleAccessory = (accessory) => {
    setForm(prev => {
      const isSelected = prev.accessories.includes(accessory);
      const updatedAccessories = isSelected
        ? prev.accessories.filter(item => item !== accessory)
        : [...prev.accessories, accessory];
      return { ...prev, accessories: updatedAccessories };
    });
  };

  const handleClose = () => {
    setForm(INITIAL_STATE);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validaciones básicas requeridas
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.brand.trim() || !form.model.trim() || !form.serialNumber.trim()) {
      return;
    }

    // Generación de un ID único y aleatorio de OT para este paso (ej: OT-1482)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newId = `OT-${randomNum}`;

    // Construcción del objeto de orden de trabajo según requerimientos del Paso 3
    const newWorkOrder = {
      id: newId,
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim(),
      equipmentType: form.equipmentType,
      equipmentName: `${form.equipmentType} ${form.brand.trim()} ${form.model.trim()}`,
      priority: form.priority,
      status: 'INGRESO', // Estado inicial por defecto
      entryDate: new Date().toISOString().split('T')[0], // Fecha actual YYYY-MM-DD
      accessories: form.accessories,
      cosmeticCondition: form.cosmeticCondition.trim(),
      problemDescription: 'Ingreso inicial para diagnóstico.',
      diagnosis: '',
      solution: '',
      cost: 0,
      spareParts: []
    };

    onSave(newWorkOrder);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop oscuro con desenfoque / glassmorphism */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />

      {/* Caja del Modal */}
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10 my-8">
        
        {/* Encabezado */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
            <h2 className="text-lg font-bold text-zinc-100 tracking-wide uppercase">
              Ingreso de Nuevo Equipo (Alta OT)
            </h2>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Cerrar modal"
          >
            {/* Icono de Cierre (Lucide X) */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-zinc-300">
          
          {/* SECCIÓN 1: DATOS DEL CLIENTE */}
          <div>
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
              1. Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Nombre o Clínica / Centro <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="clientName"
                  list="existing-clients"
                  required
                  value={form.clientName}
                  onChange={handleChange}
                  placeholder="Ej: Estética Bella Express / Dra. Lucía"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                <datalist id="existing-clients">
                  {uniqueClients.map(client => (
                    <option key={client.name} value={client.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Teléfono de WhatsApp <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  name="clientPhone"
                  required
                  value={form.clientPhone}
                  onChange={handleChange}
                  placeholder="Ej: +54 11 9876-5432"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* SECCIÓN 2: DATOS DEL EQUIPO */}
          <div>
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">
              2. Detalles del Equipo Médico/Estético
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Tipo de Aparatología <span className="text-red-500">*</span>
                </label>
                <select 
                  name="equipmentType"
                  value={form.equipmentType}
                  onChange={handleChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Criolipólisis">Criolipólisis</option>
                  <option value="Láser Diodo">Láser Diodo</option>
                  <option value="Radiofrecuencia">Radiofrecuencia</option>
                  <option value="Cavitador">Cavitador</option>
                  <option value="Vacumterapia">Vacumterapia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Marca <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="brand"
                  required
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Ej: Meditech, Alma Lasers"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Modelo <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="model"
                  required
                  value={form.model}
                  onChange={handleChange}
                  placeholder="Ej: IceSculpt 360, Accent Prime"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  N° de Serie <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="serialNumber"
                  required
                  value={form.serialNumber}
                  onChange={handleChange}
                  placeholder="Ej: SN-998811-CRIO"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* SECCIÓN 3: PRIORIDAD */}
          <div>
            <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              3. Nivel de Prioridad de la Reparación
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['BAJA', 'MEDIA', 'ALTA', 'URGENTE'].map((prio) => {
                const isSelected = form.priority === prio;
                let activeStyle = '';
                if (isSelected) {
                  if (prio === 'BAJA') activeStyle = 'bg-gray-800/80 text-gray-200 border-gray-600 ring-2 ring-gray-700/50';
                  if (prio === 'MEDIA') activeStyle = 'bg-blue-900/50 text-blue-300 border-blue-700 ring-2 ring-blue-700/50';
                  if (prio === 'ALTA') activeStyle = 'bg-amber-950/50 text-amber-300 border-amber-700 ring-2 ring-amber-700/50';
                  if (prio === 'URGENTE') activeStyle = 'bg-red-950/60 text-red-200 border-red-700 ring-2 ring-red-700/50 font-semibold animate-pulse';
                }
                return (
                  <button
                    key={prio}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: prio }))}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                      isSelected 
                        ? activeStyle 
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {prio}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* SECCIÓN 4: ACCESORIOS RECIBIDOS */}
          <div>
            <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              4. Accesorios Recibidos
            </label>
            <p className="text-zinc-500 text-xs mb-3">
              Selecciona todos los elementos y partes físicas del equipo que ingresan al taller:
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_ACCESSORIES.map((accessory) => {
                const isSelected = form.accessories.includes(accessory);
                return (
                  <button
                    key={accessory}
                    type="button"
                    onClick={() => handleToggleAccessory(accessory)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60 ring-1 ring-indigo-500/30'
                        : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {isSelected ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                    )}
                    {accessory}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-zinc-900" />

          {/* SECCIÓN 5: INSPECCIÓN VISUAL / COSMÉTICA */}
          <div>
            <label className="block text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1.5">
              5. Inspección Visual / Estado Cosmético de Entrada
            </label>
            <p className="text-zinc-500 text-xs mb-3">
              Describe marcas, rayones, desgaste del cableado, golpes visibles, perillas rotas, etc.
            </p>
            <textarea
              name="cosmeticCondition"
              rows="3"
              value={form.cosmeticCondition}
              onChange={handleChange}
              placeholder="Ej: Gabinete con leves rayones en lateral derecho, cable de poder con encintado de protección, cabezal de criolipólisis con marcas de impacto en carcasa plástica."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

        </form>

        {/* Acciones del pie de página */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-900/30">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!form.clientName.trim() || !form.clientPhone.trim() || !form.brand.trim() || !form.model.trim() || !form.serialNumber.trim()}
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed rounded-lg shadow-lg hover:shadow-indigo-500/20 shadow-indigo-600/10 transition-all duration-200"
          >
            Registrar Ingreso (OT)
          </button>
        </div>

      </div>
    </div>
  );
}
