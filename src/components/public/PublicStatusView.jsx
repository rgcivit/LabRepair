import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Microscope, CheckCircle2, Clock, Wrench, Package } from 'lucide-react';

export default function PublicStatusView({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, device_type, brand_model, status, qc_passed, created_at')
        .eq('id', orderId)
        .single();

      if (!error) setOrder(data);
      setLoading(false);
    };
    fetchStatus();
  }, [orderId]);

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );

  if (!order) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl max-w-sm shadow-2xl">
        <h2 className="text-xl font-black text-rose-500 uppercase">Orden No Encontrada</h2>
        <p className="text-slate-400 mt-4 text-sm">El código de orden #{orderId} no existe en nuestro laboratorio.</p>
        <a href="/" className="inline-block mt-6 px-6 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold border border-slate-800">Volver al inicio</a>
      </div>
    </div>
  );

  const steps = [
    { id: 'INGRESO', label: 'Ingresado', icon: <Package size={18} /> },
    { id: 'EN_DIAGNOSTICO', label: 'Diagnóstico', icon: <Microscope size={18} /> },
    { id: 'EN_REPARACION', label: 'Reparación', icon: <Wrench size={18} /> },
    { id: 'LISTO', label: 'Finalizado', icon: <CheckCircle2 size={18} /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status) || 0;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-emerald-500"></div>

        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Estado de su Equipo</h1>
            <p className="text-cyan-500 font-mono font-bold tracking-widest text-xs">ORDEN DE TRABAJO #{order.id}</p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-1">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Aparatología / Equipo</span>
            <h2 className="text-lg font-bold text-slate-200 uppercase">{order.device_type}</h2>
            <p className="text-xs text-slate-400">{order.brand_model}</p>
          </div>

          <div className="relative space-y-6">
            <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-slate-800"></div>
            <div className="absolute left-[23px] top-2 w-0.5 bg-emerald-500 transition-all duration-1000" style={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>

            {steps.map((step, idx) => {
              const isCompleted = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.id} className="flex items-center gap-6 relative z-10">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                    isCompleted ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-600'
                  }`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-wider ${isCompleted ? 'text-white' : 'text-slate-600'}`}>
                      {step.label}
                    </h3>
                    {isCurrent && <span className="text-[10px] text-emerald-400 font-bold animate-pulse">● EN PROCESO</span>}
                    {isCompleted && !isCurrent && <span className="text-[10px] text-slate-500 font-bold">COMPLETADO</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {order.status === 'LISTO' && (
            <div className="bg-emerald-950/20 border-2 border-emerald-500/30 p-6 rounded-3xl text-center animate-bounceIn">
              <h4 className="text-emerald-400 font-black uppercase tracking-widest text-sm mb-1">¡Equipo Listo para Retirar!</h4>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">Control de Calidad Aprobado ✓</p>
            </div>
          )}

          <div className="pt-6 border-t border-slate-900 text-center space-y-4">
            <p className="text-[9px] text-slate-600 uppercase font-black tracking-tighter leading-relaxed">
              ESTE ES UN COMPROBANTE DE CONSULTA DIGITAL PROPIEDAD DE<br />
              <span className="text-slate-400">INGENIERÍA BIOMÉDICA - LABREPAIR</span>
            </p>
            <div className="flex justify-center gap-2">
              <div className="h-1 w-8 bg-slate-800 rounded-full"></div>
              <div className="h-1 w-8 bg-slate-800 rounded-full"></div>
              <div className="h-1 w-8 bg-slate-800 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
