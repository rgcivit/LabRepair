import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Calendar, Clock, Filter, List } from 'lucide-react';

export default function FinancialReportsView({ orders }) {
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, DAY, WEEK, MONTH

  // --- LÓGICA DE CÁLCULO ---
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Inicio de semana (Lunes)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);

    // Inicio de mes
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const data = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
      pendingCollection: 0,
      filteredList: []
    };

    orders.forEach(order => {
      const details = order.budgetDetails || {};
      const diagFee = parseFloat(details.diagnosisCost || 0);
      const isDiagPaid = details.diagnosisFeeMode === 'PAID';

      // Fecha de ingreso (para el abono)
      const entryDate = new Date(order.created_at || order.entryDate);
      const entryDateStr = entryDate.toISOString().split('T')[0];

      // 1. PROCESAR ABONOS PAGADOS (Ganancia por seña/revisión)
      if (isDiagPaid && diagFee > 0) {
        const matchesDiag = timeFilter === 'ALL' ||
                           (timeFilter === 'DAY' && entryDateStr === today) ||
                           (timeFilter === 'WEEK' && entryDate >= startOfWeek) ||
                           (timeFilter === 'MONTH' && entryDate >= startOfMonth);

        if (entryDateStr === today) data.daily += diagFee;
        if (entryDate >= startOfWeek) data.weekly += diagFee;
        if (entryDate >= startOfMonth) data.monthly += diagFee;
        data.total += diagFee;

        if (matchesDiag) {
           data.filteredList.push({ ...order, _reportType: 'DIAG_ONLY', _reportDate: entryDate, _reportAmount: diagFee });
        }
      }

      // 2. PROCESAR TRABAJOS ENTREGADOS (Ganancia por el saldo restante)
      if (order.status === 'ENTREGADO') {
        const deliveryDate = new Date(order.deliveryDate || order.delivery_date || order.created_at || order.entryDate);
        const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

        // El saldo de reparación es el dinero extra que entra al entregar.
        // Si el presupuesto dice negativo o cero, significa que ya se cubrió con la seña.
        const repairBalance = Math.max(0, parseFloat(order.estimatedBudget || details.grandTotal || 0));

        const matchesDelivery = timeFilter === 'ALL' ||
                               (timeFilter === 'DAY' && deliveryDateStr === today) ||
                               (timeFilter === 'WEEK' && deliveryDate >= startOfWeek) ||
                               (timeFilter === 'MONTH' && deliveryDate >= startOfMonth);

        if (repairBalance > 0) {
          if (deliveryDateStr === today) data.daily += repairBalance;
          if (deliveryDate >= startOfWeek) data.weekly += repairBalance;
          if (deliveryDate >= startOfMonth) data.monthly += repairBalance;
          data.total += repairBalance;

          if (matchesDelivery) {
            data.filteredList.push({ ...order, _reportType: 'DELIVERY', _reportDate: deliveryDate, _reportAmount: repairBalance });
          }
        }
      }

      // 3. PROCESAR PENDIENTES DE COBRO (Equipos en estado "LISTO")
      if (order.status === 'LISTO') {
        const pendingAmount = Math.max(0, parseFloat(order.estimatedBudget || details.grandTotal || 0));
        data.pendingCollection += pendingAmount;

        // Siempre mostrar los pendientes en la lista de "Todo" o si el usuario quiere ver qué falta cobrar
        if (timeFilter === 'ALL') {
          data.filteredList.push({ ...order, _reportType: 'PENDING_COLLECTION', _reportDate: entryDate, _reportAmount: pendingAmount });
        }
      }
    });

    // Ordenar por la fecha que estamos reportando
    data.filteredList.sort((a,b) => b._reportDate - a._reportDate);

    return data;
  }, [orders, timeFilter]);

  const cards = [
    { title: 'Ganancia Diaria', amount: stats.daily, icon: <Clock className="text-cyan-400" />, color: 'from-cyan-500/20 to-blue-500/5' },
    { title: 'Ganancia Semanal', amount: stats.weekly, icon: <Calendar className="text-emerald-400" />, color: 'from-emerald-500/20 to-teal-500/5' },
    { title: 'Ganancia Mensual', amount: stats.monthly, icon: <TrendingUp className="text-indigo-400" />, color: 'from-indigo-500/20 to-purple-500/5' },
    { title: 'Pendiente de Cobro', amount: stats.pendingCollection, icon: <DollarSign className="text-amber-400" />, color: 'from-amber-500/20 to-orange-500/5' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-cyan-400 w-5 h-5" />
          <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Financial Intelligence Analytics</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Reportes de Ganancias</h2>

          {/* SELECTOR DE FILTRO TEMPORAL */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto shadow-inner">
            {[
              { id: 'DAY', label: 'Hoy' },
              { id: 'WEEK', label: 'Semana' },
              { id: 'MONTH', label: 'Mes' },
              { id: 'ALL', label: 'Todo' }
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setTimeFilter(btn.id)}
                className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                  timeFilter === btn.id
                    ? 'bg-cyan-500 text-slate-950 shadow-glow shadow-cyan-500/20'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Resumen de ingresos confirmados {timeFilter === 'ALL' ? 'históricos' : `de ${timeFilter === 'DAY' ? 'hoy' : (timeFilter === 'WEEK' ? 'la semana' : 'el mes')}`}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50`}></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                  {card.icon}
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.title}</span>
              <h3 className="text-2xl font-black text-white mt-1 font-mono">
                ${card.amount.toLocaleString('es-AR')}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <List size={16} className="text-cyan-400" />
            Detalle de Ingresos ({timeFilter})
          </h3>
          <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-900 px-2 py-1 rounded border border-slate-800">
            {stats.filteredList.length} Registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase font-black text-[9px] tracking-tighter">
                <th className="py-3 px-2">OT / Origen</th>
                <th className="py-3 px-2">Fecha</th>
                <th className="py-3 px-2">Cliente / Concepto</th>
                <th className="py-3 px-2 text-right">Monto Percibido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {stats.filteredList.map((o, idx) => (
                <tr key={`${o.id}-${o._reportType}-${idx}`} className="hover:bg-slate-900/40 transition-colors group">
                  <td className="py-3 px-2 font-mono font-bold text-cyan-400">
                    {o.id}
                  </td>
                  <td className="py-3 px-2 text-slate-400 font-mono text-[10px]">
                    {o._reportDate.toISOString().split('T')[0]}
                  </td>
                  <td className="py-3 px-2">
                    <div className="font-bold text-slate-300">{o.clientName}</div>
                    <div className="text-[9px] text-slate-500 uppercase flex gap-2">
                      {o._reportType === 'DIAG_ONLY' && <span className="text-cyan-600 font-bold">Abono Revisión / Seña</span>}
                      {o._reportType === 'DELIVERY' && <span className="text-emerald-600 font-bold">Saldo de Reparación (Entrega)</span>}
                      {o._reportType === 'PENDING_COLLECTION' && <span className="text-amber-500 font-black animate-pulse">Pendiente de Cobro (Listo)</span>}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-emerald-400">
                    ${o._reportAmount.toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.filteredList.length === 0 && (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-slate-850 mx-auto mb-2" />
              <p className="text-slate-600 italic text-xs uppercase font-bold tracking-widest">Sin registros para este periodo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
