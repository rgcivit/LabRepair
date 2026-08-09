import React, { useState } from 'react';

const INITIAL_FORM = { name: '', models: '' };

/**
 * Vista de administración del catálogo de aparatología: tipos de equipo y sus modelos.
 *
 * @param {Object} props
 * @param {Array} props.equipmentTypes - Tipos registrados { id, name, models }.
 * @param {Array} props.workOrders - Órdenes de trabajo, para contar equipos por tipo.
 * @param {Function} props.onSaveType - Callback de alta/edición: (tipo) => { success, error }.
 * @param {Function} props.onDeleteType - Callback de borrado: (typeId) => void.
 */
export default function EquipmentCatalogView({ equipmentTypes, workOrders, onSaveType, onDeleteType }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const countOrdersForType = (typeName) =>
    workOrders.filter(order => order.equipmentType === typeName).length;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const res = onSaveType({
      id: editingId,
      name: form.name,
      models: form.models.split(',')
    });

    if (res.success) {
      handleCancelEdit();
    } else {
      setError(res.error);
    }
  };

  const handleEdit = (type) => {
    setEditingId(type.id);
    setForm({ name: type.name, models: type.models.join(', ') });
    setError('');
  };

  const handleDelete = (type) => {
    const linkedOrders = countOrdersForType(type.name);
    const warning = linkedOrders > 0
      ? `\n\nAtención: hay ${linkedOrders} orden(es) de este tipo. Las órdenes NO se modifican, solo deja de ofrecerse el tipo al cargar equipos nuevos.`
      : '';

    if (window.confirm(`¿Eliminar el tipo "${type.name}" del catálogo?${warning}`)) {
      onDeleteType(type.id);
      if (editingId === type.id) handleCancelEdit();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-emerald-400 font-black uppercase tracking-widest">Equipment Catalog Console</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Catálogo de Equipos</h2>
        <p className="text-xs text-slate-500 mt-0.5">Defina los tipos de aparatología y los modelos que se ofrecen al registrar una orden de trabajo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3.5 shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5">
            {editingId ? `Editar tipo (${editingId})` : 'Alta de tipo de equipo'}
          </h3>

          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded text-[11px] text-rose-400">⚠️ {error}</div>
          )}

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Tipo de Aparatología <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Criolipólisis"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Modelos</label>
            <textarea
              name="models"
              rows="4"
              value={form.models}
              onChange={handleChange}
              placeholder="Separe los modelos con comas. Ej: IceSculpt 360, CryoSlim Pro"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
            <p className="text-[9px] text-slate-600 mt-1">Los modelos aparecen como sugerencia al cargar una orden; igual se puede escribir uno nuevo a mano.</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-lg shadow uppercase tracking-wider active:scale-95 transition-transform"
            >
              {editingId ? 'Guardar Cambios' : 'Agregar Tipo'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg uppercase tracking-wider"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Listado */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
          {equipmentTypes.length === 0 ? (
            <div className="p-10 text-center">
              <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Catálogo vacío</h4>
              <p className="text-xs text-slate-600 mt-1">Agregue el primer tipo de aparatología con el formulario de la izquierda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/40">
                    <th className="py-3 px-4 font-bold">Código</th>
                    <th className="py-3 px-4 font-bold">Tipo de Aparatología</th>
                    <th className="py-3 px-4 font-bold">Modelos Registrados</th>
                    <th className="py-3 px-4 font-bold text-center">Órdenes</th>
                    <th className="py-3 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {equipmentTypes.map(type => (
                    <tr key={type.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{type.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">{type.name}</td>
                      <td className="py-3 px-4">
                        {type.models.length === 0 ? (
                          <span className="text-slate-600 text-[11px]">Sin modelos cargados</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {type.models.map(model => (
                              <span key={model} className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                                {model}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-300">{countOrdersForType(type.name)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(type)}
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(type)}
                            className="px-2.5 py-1.5 bg-rose-950/30 border border-rose-900/40 hover:bg-rose-950/60 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
