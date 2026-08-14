import React, { useState } from 'react';
import { login } from '../../services/authService';

/**
 * Componente LoginView de alta tecnología y estética oscura para control de acceso.
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback cuando el login es correcto: (user) => void
 */
export default function LoginView({ onLoginSuccess }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Pequeño timeout artificial para dar sensación de procesamiento seguro
    setTimeout(() => {
      const res = login(usernameOrEmail, password);
      setLoading(false);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error);
      }
    }, 600);
  };

  const handleQuickLogin = () => {
    setUsernameOrEmail('rgcivit');
    setPassword('prinoth');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      
      {/* Elementos geométricos decorativos estilo cyber-taller */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Contenedor principal de Login */}
      <div className="relative w-full max-w-md bg-slate-950 border border-slate-850 p-8 rounded-2xl shadow-2xl space-y-6">
        
        {/* Encabezado Logo/Marca */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 items-center justify-center shadow-lg shadow-cyan-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-8 h-8 text-slate-950">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Ingeniería Biomédica</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Laboratorio de Control</p>
          </div>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-lg text-xs text-rose-400 text-center animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Usuario o Correo Electrónico</label>
            <input
              type="text"
              required
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Ej: rodrigo"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5">Contraseña de Acceso</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider shadow-lg shadow-cyan-500/5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Autenticando..." : "Ingresar al Laboratorio"}
          </button>
        </form>

        {/* Botón de Acceso Rápido para Rodrigo */}
        <div className="border-t border-slate-900 pt-4 text-center">
          <p className="text-[10px] text-slate-600">¿Acceso rápido para desarrollador/administrador?</p>
          <button
            type="button"
            onClick={handleQuickLogin}
            className="mt-2 text-[10px] font-bold text-cyan-500 hover:text-cyan-400 uppercase tracking-widest"
          >
            Cargar Rodrigo (Admin)
          </button>

          <div className="mt-4 pt-4 border-t border-slate-900">
            <p className="text-[9px] text-slate-700 uppercase font-black tracking-widest">
              Desarrollado por Rodrigo Guevara Civit
            </p>
            <p className="text-[8px] text-slate-800 font-bold mt-0.5">Konectaapp.com</p>
          </div>
        </div>

      </div>
    </div>
  );
}
