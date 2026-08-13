import React, { useState } from 'react';

const INITIAL_FORM_STATE = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
};

export default function ClientsView({ clients, onSaveClient, onDeleteClient }) {
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingItem] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [searchQuery, setSearchQuery] = useState('');

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm(INITIAL_FORM_STATE);
    setIsOpen(true);
  };

  const handleOpenEdit = (client) => {
    setEditingItem(client);
    setForm({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setForm(INITIAL_FORM_STATE);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("El nombre es obligatorio.");

    const payload = {
      ...editingClient,
      ...form,
      name: form.name.trim()
    };

    onSaveClient(payload);
    handleCloseModal();
  };

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Gestión de Clientes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Administre la base de datos de clínicas y profesionales.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg shadow-lg active:scale-95 transition-all uppercase tracking-wider"
        >
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-4 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase tracking-widest bg-slate-900/40">
                <th className="py-3 px-5 font-bold">Nombre / Clínica</th>
                <th className="py-3 px-4 font-bold">Contacto</th>
                <th className="py-3 px-4 font-bold">Email</th>
                <th className="py-3 px-5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-900/30 transition-colors group">
                  <td className="py-4 px-5 font-bold text-slate-200 text-sm">{client.name}</td>
                  <td className="py-4 px-4 text-slate-400 font-mono">{client.phone}</td>
                  <td className="py-4 px-4 text-slate-400">{client.email}</td>
                  <td className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(client)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-[10px] font-bold">Editar</button>
                      <button onClick={() => { if(window.confirm('¿Borrar cliente?')) onDeleteClient(client.id) }} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-rose-500 rounded-lg text-[10px] font-bold">Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/40">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-zinc-300">
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Nombre Completo / Clínica *</label>
                <input type="text" name="name" required value={form.name} onChange={handleFormChange} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Teléfono</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Email</label>
                  <input type="email" name="email" value={form.email} onChange={handleFormChange} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Dirección</label>
                <input type="text" name="address" value={form.address} onChange={handleFormChange} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Notas</label>
                <textarea name="notes" rows="3" value={form.notes} onChange={handleFormChange} className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-100 resize-none" />
              </div>
              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-2.5">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-[10px] font-bold text-zinc-400">Cancelar</button>
                <button type="submit" className="px-5 py-2 text-[10px] font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded uppercase">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
