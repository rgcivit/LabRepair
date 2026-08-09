import React, { useState } from 'react';
import { countOrdersForClient } from '../../services/clientService';

const INITIAL_FORM = { name: '', phone: '', email: '', notes: '' };

/**
 * Vista de administración de la cartera de clientes / clínicas.
 *
 * @param {Object} props
 * @param {Array} props.clients - Clientes registrados.
 * @param {Array} props.workOrders - Órdenes de trabajo, para mostrar intervenciones por cliente.
 * @param {Function} props.onSaveClient - Callback de alta/edición: (cliente) => { success, error }.
 * @param {Function} props.onDeleteClient - Callback de borrado: (clientId) => void.
 */
export default function ClientsView({ clients, workOrders, onSaveClient, onDeleteClient }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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
    const res = onSaveClient({ ...form, id: editingId });
    if (res.success) {
      handleCancelEdit();
    } else {
      setError(res.error);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client.id);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      notes: client.notes || ''
    });
    setError('');
  };

  const handleDelete = (client) => {
    const linkedOrders = countOrdersForClient(client.name, workOrders);
    const warning = linkedOrders > 0
      ? `\n\nAtención: tiene ${linkedOrders} orden(es) de trabajo asociadas. Las órdenes NO se eliminan, solo se quita el cliente de la cartera.`
      : '';

    if (window.confirm(`¿Eliminar a "${client.name}" de la cartera de clientes?${warning}`)) {
      onDeleteClient(client.id);
      if (editingId === client.id) handleCancelEdit();
    }
  };

  const query = searchQuery.toLowerCase().trim();
  const filteredClients = clients.filter(client =>
    !query ||
    client.name.toLowerCase().includes(query) ||
    client.phone.toLowerCase().includes(query) ||
    (client.email || '').toLowerCase().includes(query)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Client Relationship Console</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Clientes y Clínicas</h2>
        <p className="text-xs text-slate-500 mt-0.5">Administre la cartera de clientes que se ofrece al registrar nuevas órdenes de trabajo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Formulario de alta / edición */}
        <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3.5 shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5">
            {editingId ? `Editar cliente (${editingId})` : 'Alta de nuevo cliente'}
          </h3>

          {error && (
            <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded text-[11px] text-rose-400">⚠️ {error}</div>
          )}

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Nombre o Clínica <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Estética Bella Express"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Teléfono de WhatsApp <span className="text-red-500">*</span></label>
            <input
              type="tel"
              name="phone"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="Ej: +54 11 9876-5432"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Ej: contacto@clinica.com"
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Notas Internas</label>
            <textarea
              name="notes"
              rows="3"
              value={form.notes}
              onChange={handleChange}
              placeholder="Ej: Retira los equipos por la tarde. Factura A."
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg shadow uppercase tracking-wider active:scale-95 transition-transform"
            >
              {editingId ? 'Guardar Cambios' : 'Dar de Alta'}
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
          <div className="p-4 border-b border-slate-900">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente por nombre, teléfono o email..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-10 text-center">
              <h4 className="text-slate-400 font-bold uppercase tracking-wider text-sm">Sin clientes registrados</h4>
              <p className="text-xs text-slate-600 mt-1">Dé de alta el primer cliente con el formulario de la izquierda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/40">
                    <th className="py-3 px-4 font-bold">Código</th>
                    <th className="py-3 px-4 font-bold">Cliente / Clínica</th>
                    <th className="py-3 px-4 font-bold">Contacto</th>
                    <th className="py-3 px-4 font-bold text-center">Órdenes</th>
                    <th className="py-3 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{client.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{client.name}</div>
                        {client.notes && <div className="text-[10px] text-slate-500 mt-0.5">{client.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        <div>{client.phone}</div>
                        {client.email && <div className="text-[10px] text-slate-600">{client.email}</div>}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-300">
                        {countOrdersForClient(client.name, workOrders)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(client)}
                            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(client)}
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
