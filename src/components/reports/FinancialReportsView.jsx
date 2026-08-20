import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Calendar, Clock } from 'lucide-react';

export default function FinancialReportsView({ orders }) {
  // --- LÓGICA DE CÁLCULO ---
  const reports = useMemo(() => {
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

    const stats = {
      daily: 0,
      weekly: 0,
      monthly: 0,
      total: 0
    };

    orders.forEach(order => {
      const details = order.budgetDetails || {};
      const diagFee = parseFloat(details.diagnosisCost || 0);
      const isDiagPaid = details.diagnosisFeeMode === 'PAID';

      // 1. SUMAR ABONOS DE REVISIÓN PAGADOS (En cualquier estado)
      if (isDiagPaid) {
        const orderDate = new Date(order.created_at || order.entryDate);
        const orderDateStr = orderDate.toISOString().split('T')[0];

        if (orderDateStr === today) stats.daily += diagFee;
        if (orderDate >= startOfWeek) stats.weekly += diagFee;
        if (orderDate >= startOfMonth) stats.monthly += diagFee;
        stats.total += diagFee;
      }

      // 2. SUMAR TRABAJOS ENTREGADOS (El saldo facturado)
      if (order.status === 'ENTREGADO') {
        const repairBalance = parseFloat(order.estimatedBudget || details.grandTotal || 0);
        const deliveryDate = new Date(order.entryDate || order.created_at);
        const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

        if (deliveryDateStr === today) stats.daily += repairBalance;
        if (deliveryDate >= startOfWeek) stats.weekly += repairBalance;
        if (deliveryDate >= startOfMonth) stats.monthly += repairBalance;
        stats.total += repairBalance;
      }
    });

    return stats;
  }, [orders]);

  const cards = [
    { title: 'Ganancia Diaria', amount: reports.daily, icon: <Clock className="text-cyan-400" />, color: 'from-cyan-500/20 to-blue-500/5' },
    { title: 'Ganancia Semanal', amount: reports.weekly, icon: <Calendar className="text-emerald-400" />, color: 'from-emerald-500/20 to-teal-500/5' },
    { title: 'Ganancia Mensual', amount: reports.monthly, icon: <TrendingUp className="text-indigo-400" />, color: 'from-indigo-500/20 to-purple-500/5' },
    { title: 'Total Histórico', amount: reports.total, icon: <DollarSign className="text-amber-400" />, color: 'from-amber-500/20 to-orange-500/5' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-cyan-400 w-5 h-5" />
          <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Financial Intelligence Analytics</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Reportes de Ganancias</h2>
        <p className="text-xs text-slate-500 mt-0.5">Análisis de ingresos basados únicamente en equipos marcados como <b>ENTREGADOS</b>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div key={idx} className={`bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden group`}>
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
        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          Últimos Ingresos Confirmados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase font-black text-[9px] tracking-tighter">
                <th className="py-3 px-2">OT</th>
                <th className="py-3 px-2">Fecha Entrega</th>
                <th className="py-3 px-2">Cliente</th>
                <th className="py-3 px-2 text-right">Monto Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {orders
                .filter(o => o.status === 'ENTREGADO')
                .sort((a,b) => new Date(b.entryDate) - new Date(a.entryDate))
                .slice(0, 10)
                .map(o => (
                  <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-cyan-400">{o.id}</td>
                    <td className="py-3 px-2 text-slate-400">{o.entryDate}</td>
                    <td className="py-3 px-2 font-bold text-slate-300">{o.clientName}</td>
                    <td className="py-3 px-2 text-right font-mono font-black text-emerald-400">
                      ${(parseFloat(o.estimatedBudget || o.budgetDetails?.grandTotal || 0)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {orders.filter(o => o.status === 'ENTREGADO').length === 0 && (
            <p className="text-center py-8 text-slate-600 italic">No hay registros de ventas entregadas aún.</p>
          )}
        </div>
      </div>
    </div>
  );
}
