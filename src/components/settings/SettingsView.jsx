import React, { useState, useEffect } from 'react';
import { getUsers, registerUser } from '../../services/authService';

const DEFAULT_SETTINGS = {
  companyName: 'LABORATORIO DE REPARACIÓN Y CALIBRACIÓN',
  companyCuit: 'CUIT: 30-71628312-9',
  companyAddress: 'Av. Juan de Garay 1420, CABA',
  companyPhone: '+54 11 5110-2200',
  companyEmail: 'calibracion@labrepair.com',
  currency: 'ARS',
  pdfFooter: 'SISTEMA DE GESTIÓN DE CALIDAD - CERTIFICACIÓN OPERACIONAL',
  technicianName: 'Ing. Responsable de Calibración',
  licenseNumber: 'Reg. Nac. Ing. Clínica Nro. 78241',
  logo: '',
  signature: ''
};

/**
 * Componente SettingsView para la configuración del laboratorio, carga de firma digital
 * y exportación/importación de backups del sistema en formato JSON.
 * 
 * @param {Object} props
 * @param {Array} props.workOrders - Listado histórico de órdenes para exportación.
 * @param {Array} props.inventory - Listado del almacén para exportación.
 * @param {Function} props.onRestoreData - Callback para restaurar base de datos importada.
 */
export default function SettingsView({ workOrders, inventory, onRestoreData }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fileError, setFileError] = useState('');

  // Estados de control de accesos / usuarios
  const [users, setUsers] = useState(() => getUsers());
  const [newUser, setNewUser] = useState({ name: '', username: '', email: '', password: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterUser = (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const res = registerUser(newUser);
    if (res.success) {
      setRegSuccess(`Usuario "${newUser.name}" registrado con éxito.`);
      setNewUser({ name: '', username: '', email: '', password: '' });
      setUsers(getUsers()); // Recargar listado
    } else {
      setRegError(res.error);
    }
  };

  // Cargar configuraciones guardadas en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('estetica_lab_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        console.error("Error al decodificar las configuraciones de taller:", e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...settings, [name]: value };
    setSettings(updated);
    localStorage.setItem('estetica_lab_settings', JSON.stringify(updated));
  };

  // Conversión de archivos cargados (PNG/JPG) a Base64
  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setFileError("Por favor, suba únicamente archivos de imagen (PNG, JPG, SVG).");
      return;
    }

    // Límite de tamaño sugerido (e.g. 500KB para evitar sobrecargar localStorage)
    if (file.size > 512 * 1024) {
      alert("La imagen es pesada. Intente subir una imagen menor a 500KB.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const updated = { ...settings, [fieldName]: event.target.result };
      setSettings(updated);
      localStorage.setItem('estetica_lab_settings', JSON.stringify(updated));
      setFileError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (fieldName) => {
    const updated = { ...settings, [fieldName]: '' };
    setSettings(updated);
    localStorage.setItem('estetica_lab_settings', JSON.stringify(updated));
  };

  // --- COPIAS DE SEGURIDAD (BACKUP SYSTEM) ---
  const handleExportJSON = () => {
    const backupPackage = {
      workOrders,
      inventory,
      settings,
      backupVersion: "2.0",
      exportTimestamp: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupPackage, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Backup_LabRepair_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        if (backupData.workOrders && backupData.inventory) {
          if (window.confirm("¿Está seguro de restaurar esta base de datos? Se sobrescribirán las órdenes e inventario actuales.")) {
            onRestoreData(backupData);
            
            // Si el backup contiene configuraciones, cargarlas
            if (backupData.settings) {
              setSettings(backupData.settings);
            }
            alert("Restauración de base de datos completada con éxito.");
          }
        } else {
          alert("Estructura de archivo inválida. Falta el arreglo de órdenes o inventario.");
        }
      } catch (err) {
        alert("Ocurrió un error al decodificar el archivo JSON de respaldo.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Cabecera */}
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-glow shadow-cyan-400 animate-pulse"></span>
          <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Admin Configuration Console</span>
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Configuración y Respaldos</h2>
        <p className="text-xs text-slate-500 mt-0.5">Gestione datos del taller, firmas del personal técnico homologado y resguarde la base de datos.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECCIÓN 1: DATOS GENERALES DEL TALLER */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5 flex items-center gap-2">
            🏢 Identidad de la Empresa / Laboratorio
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Nombre Comercial</label>
              <input
                type="text"
                name="companyName"
                value={settings.companyName}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">CUIT / Identificador</label>
                <input
                  type="text"
                  name="companyCuit"
                  value={settings.companyCuit}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Moneda del Sistema</label>
                <select
                  name="currency"
                  value={settings.currency}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 cursor-pointer focus:outline-none"
                >
                  <option value="ARS">Pesos Argentinos ($ ARS)</option>
                  <option value="USD">Dólar Americano ($ USD)</option>
                  <option value="EUR">Euro (€ EUR)</option>
                  <option value="CLP">Pesos Chilenos ($ CLP)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Dirección Física</label>
              <input
                type="text"
                name="companyAddress"
                value={settings.companyAddress}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-300 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Teléfono</label>
                <input
                  type="text"
                  name="companyPhone"
                  value={settings.companyPhone}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Email</label>
                <input
                  type="email"
                  name="companyEmail"
                  value={settings.companyEmail}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Pie de Página de Certificados PDF</label>
              <textarea
                name="pdfFooter"
                rows="2"
                value={settings.pdfFooter}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-400 focus:outline-none resize-none font-mono text-[11px]"
              />
            </div>
          </div>

        </div>

        {/* SECCIÓN 2: REGISTRO DE INGENIERO / FIRMA TÉCNICA */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5 flex items-center gap-2">
              🖋️ Firmas Digitales y Validaciones
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Técnico/Ing. Responsable</label>
                  <input
                    type="text"
                    name="technicianName"
                    value={settings.technicianName}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-200 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Matrícula Profesional</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={settings.licenseNumber}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Cargador de Firma */}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Imagen de la Firma Digital (Fondo Blanco/Transparente)</label>
                {settings.signature ? (
                  <div className="bg-white border border-slate-300 rounded p-2.5 flex items-center justify-between">
                    <img 
                      src={settings.signature} 
                      alt="Firma Digital" 
                      className="h-12 object-contain bg-white" 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('signature')}
                      className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-4 text-center cursor-pointer group transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'signature')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-350">
                      Seleccionar imagen de Firma (PNG, JPG)
                    </span>
                  </div>
                )}
              </div>

              {/* Cargador de Isotipo / Logo del Taller */}
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1.5">Isotipo o Logo Comercial de Membrete</label>
                {settings.logo ? (
                  <div className="bg-slate-900 border border-slate-800 rounded p-2.5 flex items-center justify-between">
                    <img 
                      src={settings.logo} 
                      alt="Logo de Taller" 
                      className="h-10 object-contain" 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo')}
                      className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/20 px-2 py-1 rounded transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-4 text-center cursor-pointer group transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <span className="text-[11px] text-slate-500 group-hover:text-slate-350">
                      Seleccionar imagen de Logo Membrete (PNG, JPG)
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {fileError && <p className="text-[10px] font-bold text-rose-500 mt-2">{fileError}</p>}
        </div>

      </div>

      {/* SECCIÓN 3: BACKUPS Y COPIAS DE SEGURIDAD GENERALES */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5 flex items-center gap-2 mb-4">
          💾 Copias de Seguridad y Resguardos del Laboratorio
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200">Resguardo Completo Base de Datos</h4>
            <p>
              Exporte la totalidad de las órdenes registradas, repuestos asignados e historial en un solo paquete consolidado en formato JSON. Puede guardar este archivo como copia de seguridad local o migrarlo a otra terminal PWA de inmediato.
            </p>
            
            <button
              type="button"
              onClick={handleExportJSON}
              className="mt-2 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg shadow uppercase tracking-wider active:scale-95 transition-transform"
            >
              📥 Exportar Base de Datos (JSON)
            </button>
          </div>

          <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-900 pt-4 md:pt-0 md:pl-6">
            <h4 className="font-bold text-slate-200">Restauración de Base de Datos</h4>
            <p className="text-rose-400/90 font-medium">
              ¡ATENCIÓN! La importación de un backup JSON sobrescribirá por completo todos los registros vigentes de órdenes de trabajo, inventario y calibraciones guardados en este dispositivo.
            </p>
            
            <div className="relative inline-block w-full sm:w-auto">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <button
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg shadow uppercase tracking-wider"
              >
                📤 Restaurar Backup (JSON)
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN 4: CONTROL DE ACCESOS Y REGISTRO DE USUARIOS */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2.5 flex items-center gap-2 mb-4">
          🔐 Control de Accesos y Alta de Usuarios
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
          {/* Formulario de Alta */}
          <form onSubmit={handleRegisterUser} className="space-y-3.5">
            <h4 className="font-bold text-slate-200">Dar de alta a nuevos usuarios</h4>
            
            {regError && <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded text-[11px] text-rose-400">⚠️ {regError}</div>}
            {regSuccess && <div className="bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded text-[11px] text-emerald-400">✅ {regSuccess}</div>}

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Nombre Completo</label>
              <input
                type="text"
                name="name"
                required
                value={newUser.name}
                onChange={handleUserFormChange}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  name="username"
                  required
                  value={newUser.username}
                  onChange={handleUserFormChange}
                  placeholder="Ej: jperez"
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Contraseña</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={newUser.password}
                  onChange={handleUserFormChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                name="email"
                required
                value={newUser.email}
                onChange={handleUserFormChange}
                placeholder="Ej: jperez@labrepair.com"
                className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-lg shadow uppercase tracking-wider active:scale-95 transition-transform"
            >
              ➕ Dar de Alta Usuario
            </button>
          </form>

          {/* Listado de Usuarios */}
          <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-900 pt-4 md:pt-0 md:pl-6">
            <h4 className="font-bold text-slate-200">Personal Autorizado</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] text-slate-500 uppercase tracking-widest">
                    <th className="py-2 px-3 font-bold">Nombre</th>
                    <th className="py-2 px-3 font-bold">Usuario</th>
                    <th className="py-2 px-3 font-bold text-right">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {users.map((u) => (
                    <tr key={u.username} className="hover:bg-slate-900/30 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-300">{u.name}</td>
                      <td className="py-2 px-3 font-mono text-cyan-400">{u.username}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-500">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] ${u.role === 'ADMIN' ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40' : 'bg-slate-900 text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
