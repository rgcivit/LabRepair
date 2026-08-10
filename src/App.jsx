import React, { useState, useEffect } from 'react';
import { getWorkOrders, saveWorkOrder, deleteWorkOrder, getInventory, saveInventoryItem } from './services/storageService';
import { StatusBadge, PriorityBadge } from './components/common/Badges';
import NewWorkOrderModal from './components/work-orders/NewWorkOrderModal';
import BenchTestView from './components/bench-tests/BenchTestView';
import BudgetView from './components/bench-tests/BudgetView';
import InventoryView from './components/inventory/InventoryView';
import SerialHistoryView from './components/history/SerialHistoryView';
import SettingsView from './components/settings/SettingsView';
import { generateQCCertificate, exportWorkOrdersToPDF } from './services/pdfService';

// Servicios de autenticación y vista de login
import { getCurrentUser, logout, changePassword } from './services/authService';
import LoginView from './components/common/LoginView';

export default function App() {
  // Estados de autenticación
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  // Campos para cambio de contraseña
  const [passCurrent, setPassCurrent] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Inicialización de estados desde localStorage
  const [orders, setOrders] = useState(() => getWorkOrders());
  const [inventory, setInventory] = useState(() => getInventory());
  
  // Control de modales y paneles
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null); // Orden seleccionada para "Ver Diagnóstico"
  
  // Estado de navegación y búsqueda
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'orders', 'diagnostic', 'repuestos', 'history', 'settings'
  const [benchSubTab, setBenchSubTab] = useState('measurements'); // 'measurements' | 'budget' (Sub-pestañas de Diagnóstico)
  const [filterQuery, setFilterQuery] = useState('');
  
  // Filtros de estado en la pestaña de Órdenes
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Sincroniza datos en tiempo real si es necesario
  const refreshData = () => {
    setOrders(getWorkOrders());
    setInventory(getInventory());
  };

  // Callback de guardado de nueva OT (desde modal)
  const handleCreateOrder = (newOrder) => {
    const updated = saveWorkOrder(newOrder);
    setOrders(updated);
    refreshData();
  };

  // Función para borrar orden de trabajo
  const handleDeleteOrder = (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta Orden de Trabajo?')) {
      const updatedList = deleteWorkOrder(id);
      setOrders(updatedList);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
      refreshData();
    }
  };

  // Acción integrada al hacer clic en "Ver Diagnóstico"
  const handleViewDiagnostic = (order) => {
    setSelectedOrder(order);
    setActiveTab('diagnostic');
    setBenchSubTab('measurements');
  };

  // Callback general para guardar/actualizar una OT
  const handleSaveOT = (updatedOrder) => {
    const updatedList = saveWorkOrder(updatedOrder);
    setOrders(updatedList);
    setSelectedOrder(updatedOrder);
    refreshData();
  };

  // Callback para imputar y descontar stock
  const handleDiscountStock = (itemId, quantity) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      stock: Math.max(0, item.stock - quantity)
    };
    
    const updatedInventory = saveInventoryItem(updatedItem);
    setInventory(updatedInventory);
    refreshData();
  };

  // Callback para repuestos de forma global
  const handleSaveInventoryItemGlobal = (item) => {
    const updatedInventory = saveInventoryItem(item);
    setInventory(updatedInventory);
    refreshData();
  };

  // Callback para restaurar base de datos
  const handleRestoreData = (backupPackage) => {
    if (backupPackage.workOrders) {
      localStorage.setItem('labrepair_work_orders', JSON.stringify(backupPackage.workOrders));
    }
    if (backupPackage.inventory) {
      localStorage.setItem('labrepair_inventory', JSON.stringify(backupPackage.inventory));
    }
    if (backupPackage.settings) {
      localStorage.setItem('estetica_lab_settings', JSON.stringify(backupPackage.settings));
    }
    
    setOrders(backupPackage.workOrders || []);
    setInventory(backupPackage.inventory || []);
    refreshData();
  };

  // --- CÁLCULO DILIGENTE DE MÉTRICAS (KPIs) ---
  const activeOrdersCount = orders.filter(o => o.status !== 'ENTREGADO').length;
  const waitingPartsCount = orders.filter(o => o.status === 'ESPERANDO_REPUESTO').length;
  const readyDeliveryCount = orders.filter(o => o.status === 'LISTO').length;
  const lowStockCount = inventory.filter(item => item.stock <= item.minStock).length;

  // --- AUTENTICACIÓN Y GESTIÓN DE SESIÓN ---
  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
  };

  // --- CONTROL DE INACTIVIDAD (15 MINUTOS) ---
  useEffect(() => {
    if (!currentUser) return;

    let inactivityTimeout;
    const FIFTEEN_MINUTES = 15 * 60 * 1000;

    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        handleLogout();
        console.log("Sesión cerrada por inactividad");
      }, FIFTEEN_MINUTES);
    };

    // Eventos que reinician el contador de inactividad
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Iniciar el temporizador al cargar el componente o loguearse
    resetInactivityTimer();

    return () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [currentUser]);

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (passNew !== passConfirm) {
      setPassError('Las contraseñas nuevas no coinciden.');
      return;
    }

    const res = changePassword(currentUser.username, passCurrent, passNew);
    if (res.success) {
      setPassSuccess('Contraseña cambiada con éxito.');
      setPassCurrent('');
      setPassNew('');
      setPassConfirm('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPassSuccess('');
      }, 1500);
    } else {
      setPassError(res.error);
    }
  };

  // --- FILTRADO DE ÓRDENES EN TIEMPO REAL ---
  const filteredOrders = orders.filter(order => {
    const query = filterQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      (order.id && order.id.toLowerCase().includes(query)) ||
      (order.clientName && order.clientName.toLowerCase().includes(query)) ||
      (order.serialNumber && order.serialNumber.toLowerCase().includes(query)) ||
      (order.brandModel && order.brandModel.toLowerCase().includes(query)) ||
      (order.deviceType && order.deviceType.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!currentUser) {
    return <LoginView onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6 text-slate-950">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.4 24.8l-5.83-5.83M11.42 15.17l2.42-2.42M11.42 15.17L5.75 21A2.67 2.67 0 111.9 17.2l5.83-5.83m4.12 1.42V4.12M11.42 12.83h-2.12m0 0a1.5 1.5 0 01-1.5-1.5v-2.12m0 0a1.5 1.5 0 011.5-1.5h2.12M11.42 7.7a1.5 1.5 0 011.5 1.5v2.12m0 0a1.5 1.5 0 01-1.5 1.5h-2.12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-1.5">
                LABORATORIO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">ESTÉTICA</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Sistema de Gestión e Ingeniería</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:border-slate-700 active:scale-95 transition-all text-left shadow-inner"
              title="Opciones de Cuenta"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-350 font-bold uppercase tracking-wider font-mono text-[10px]">{currentUser?.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {isUserDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-950 border border-slate-850 rounded-lg shadow-2xl py-1.5 z-50 animate-fadeIn">
                <button
                  onClick={() => { setIsUserDropdownOpen(false); setIsChangePasswordOpen(true); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-900 hover:text-white transition-colors flex items-center gap-2"
                >
                  🔑 Cambio de contraseña
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-amber-500 hover:bg-slate-900 hover:text-amber-400 transition-colors flex items-center gap-2"
                >
                  🔒 Bloquear Sesión
                </button>
                <div className="border-t border-slate-900 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-450 hover:bg-slate-900 hover:text-rose-400 transition-colors flex items-center gap-2"
                >
                  🚪 Cierre de sesión
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto max-w-md">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Buscar OT, cliente, serie o marca..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition-all"
            />
            {filterQuery && (
              <button 
                onClick={() => setFilterQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-lg hover:shadow-cyan-400/20 active:scale-95 transition-all shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden md:inline">Nueva Orden</span>
            <span className="inline md:hidden">Nueva</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR LATERAL */}
        <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('TODOS'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'dashboard' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>Dashboard Taller</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('orders'); setStatusFilter('TODOS'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'orders' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Órdenes de Trabajo</span>
            </div>
            <span className="bg-slate-800 text-[11px] text-slate-300 font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('diagnostic'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'diagnostic' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              <span>Diagnóstico & Banco</span>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Activas
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('repuestos'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'repuestos' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <span>Repuestos & Almacén</span>
            </div>
            {lowStockCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('history'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'history' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3m3.75-9H6.75A2.25 2.25 0 004.5 8.25v10.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V14.25m-3-10.5h3m0 0v3m0-3l-6.75 6.75" />
              </svg>
              <span>Historial de Serie</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors shrink-0 md:shrink ${
              activeTab === 'settings' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4.5 h-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213.533a1 1 0 00.92.65h.09a1 1 0 00.92-.65l.214-.533a1.125 1.125 0 011.604-.686l2.246 1.298c.477.275.674.862.45 1.378l-.213.533a1 1 0 00.18 1.1l.063.063a1 1 0 001.1.18l.533-.213a1.125 1.125 0 011.379.45l1.298 2.246a1.125 1.125 0 01-.686 1.604l-.533.214a1 1 0 00-.65.92v.09c0 .412.25.783.65.92l.533.214a1.125 1.125 0 01.686 1.604l-1.298 2.246a1.125 1.125 0 01-1.379.45l-.533-.213a1 1 0 00-1.1.18l-.063.063a1 1 0 00-.18 1.1l.213.533a1.125 1.125 0 01-.45 1.379l-2.246 1.298a1.125 1.125 0 01-1.604-.686l-.214-.533a1 1 0 00-.92-.65h-.09a1 1 0 00-.92.65l-.213.533a1.125 1.125 0 01-1.11.94h-2.594a1.125 1.125 0 01-1.11-.94l-.213-.533a1 1 0 00-.92-.65h-.09a1 1 0 00-.92.65l-.214.533a1.125 1.125 0 01-1.604.686l-2.246-1.298a1.125 1.125 0 01-.45-1.379l.213-.533a1 1 0 00-.18-1.1l-.063-.063a1 1 0 00-1.1-.18l-.533.213a1.125 1.125 0 01-1.379-.45l-1.298-2.246a1.125 1.125 0 01.686-1.604l.533-.214a1 1 0 00.65-.92v-.09a1 1 0 00-.65-.92l-.533-.214a1.125 1.125 0 01-.686-1.604l1.298-2.246a1.125 1.125 0 011.379-.45l.533.213a1 1 0 001.1-.18l.063-.063a1 1 0 00.18-1.1l-.213-.533a1.125 1.125 0 01.45-1.379l2.246-1.298a1.125 1.125 0 011.604.686l.214.533a1 1 0 00.92.65h.09a1 1 0 00.92-.65l.213-.533z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Configuración</span>
            </div>
          </button>
        </aside>

        {/* ÁREA DE CONTENIDO DINÁMICO */}
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          {(activeTab === 'dashboard' || activeTab === 'orders') && (
            <>
              {/* TARJETAS DE MÉTRICAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Órdenes Activas</span>
                    <h3 className="text-3xl font-black text-white mt-1">{activeOrdersCount}</h3>
                    <p className="text-[10px] text-cyan-400 mt-1">En taller actualmente</p>
                  </div>
                  <div className="p-3 bg-cyan-950 text-cyan-400 border border-cyan-800/30 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.4 24.8l-5.83-5.83M11.42 15.17l2.42-2.42M11.42 15.17L5.75 21A2.67 2.67 0 111.9 17.2l5.83-5.83m4.12 1.42V4.12M11.42 12.83h-2.12m0 0a1.5 1.5 0 01-1.5-1.5v-2.12m0 0a1.5 1.5 0 011.5-1.5h2.12M11.42 7.7a1.5 1.5 0 011.5 1.5v2.12m0 0a1.5 1.5 0 01-1.5 1.5h-2.12" />
                    </svg>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Esperando Repuesto</span>
                    <h3 className="text-3xl font-black text-white mt-1">{waitingPartsCount}</h3>
                    <p className="text-[10px] text-amber-500 mt-1">Demoras logísticas</p>
                  </div>
                  <div className="p-3 bg-amber-950/40 text-amber-400 border border-amber-800/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Listos para Entrega</span>
                    <h3 className="text-3xl font-black text-emerald-400 mt-1">{readyDeliveryCount}</h3>
                    <p className="text-[10px] text-emerald-500 mt-1">Control de calidad OK</p>
                  </div>
                  <div className="p-3 bg-emerald-950/40 text-emerald-400 border border-emerald-800/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertas de Stock</span>
                    <h3 className={`text-3xl font-black mt-1 ${lowStockCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>{lowStockCount}</h3>
                    <p className="text-[10px] text-red-500 mt-1">Insumos bajo stock crítico</p>
                  </div>
                  <div className={`p-3 border rounded-lg ${lowStockCount > 0 ? 'bg-red-950/40 text-red-400 border-red-800/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* TABLA PRINCIPAL DE ÓRDENES */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      {activeTab === 'dashboard' ? 'Últimas Órdenes en Laboratorio' : 'Registro Completo de Órdenes'}
                    </h3>
                    <p className="text-xs text-slate-500">Órdenes que se están procesando actualmente en las mesas de pruebas</p>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => exportWorkOrdersToPDF(filteredOrders)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded-lg text-xs font-bold text-slate-300 shadow active:scale-95 transition-transform uppercase tracking-wider font-sans"
                      title="Exportar órdenes de trabajo visibles a PDF"
                    >
                      📄 Exportar PDF
                    </button>

                    {activeTab === 'orders' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">Estado:</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                        >
                          <option value="TODOS">Todos</option>
                          <option value="INGRESO">Ingreso</option>
                          <option value="EN_DIAGNOSTICO">En Diagnóstico</option>
                          <option value="PRESUPUESTADO">Presupuestado</option>
                          <option value="ESPERANDO_REPUESTO">Esperando Repuesto</option>
                          <option value="EN_PRUEBAS">En Pruebas</option>
                          <option value="LISTO">Listo</option>
                          <option value="ENTREGADO">Entregado</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 text-slate-600 mx-auto mb-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <h4 className="text-slate-400 font-semibold">No se encontraron órdenes de trabajo</h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                        Intenta modificando el filtro de búsqueda o el selector de estados.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse border-spacing-0">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase tracking-wider bg-slate-900/40">
                          <th className="py-3 px-6 font-bold">Orden ID</th>
                          <th className="py-3 px-4 font-bold">Aparatología / Equipo</th>
                          <th className="py-3 px-4 font-bold">Cliente / Clínica</th>
                          <th className="py-3 px-4 font-bold text-center">Estado</th>
                          <th className="py-3 px-4 font-bold text-center">Prioridad</th>
                          <th className="py-3 px-6 font-bold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-900/60 transition-colors group">
                            
                            <td className="py-4 px-6 font-semibold text-cyan-400 tracking-wider">
                              <span className="bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 shadow-inner group-hover:border-cyan-500/20 transition-all">
                                {order.id}
                              </span>
                            </td>

                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-200">{order.equipmentName || order.deviceType}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">S/N: {order.serialNumber || 'S/D'}</span>
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <div className="text-slate-300 font-medium">{order.clientName}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className="hover:text-emerald-400 transition-colors">{order.clientPhone}</span>
                              </div>
                            </td>

                            <td className="py-4 px-4 text-center">
                              <StatusBadge status={order.status} />
                            </td>

                            <td className="py-4 px-4 text-center">
                              <PriorityBadge priority={order.priority} />
                            </td>

                            {/* COLUMNA DE ACCIONES CON EL BOTÓN BORRAR */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleViewDiagnostic(order)}
                                  className="px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:text-slate-950 bg-cyan-950/40 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-cyan-300 border border-cyan-800/30 hover:border-transparent rounded-lg transition-all duration-150 inline-flex items-center gap-1"
                                >
                                  <span>Ver Diagnóstico</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                  </svg>
                                </button>

                                <button
                                  onClick={(e) => handleDeleteOrder(order.id, e)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 border border-transparent hover:border-rose-900/50 rounded-lg transition-colors"
                                  title="Borrar Orden"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </>
          )}

          {activeTab === 'diagnostic' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Diagnóstico y Banco de Pruebas Activo</h3>
                  <p className="text-sm text-slate-400">Inspeccione mediciones hidráulicas, termodinámicas, neumáticas, y maneje la cotización financiera del equipo.</p>
                </div>
                
                {selectedOrder && (
                  <button
                    onClick={() => generateQCCertificate(selectedOrder)}
                    disabled={!selectedOrder.qcPassed}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-650/10 transition-all uppercase tracking-wider shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    <span>Descargar Certificado QC</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Equipos en Diagnóstico / Prueba</h4>
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
                    {orders.filter(o => o.status !== 'ENTREGADO').length === 0 ? (
                      <p className="text-xs text-slate-600 p-4 text-center">No hay equipos en banco actualmente.</p>
                    ) : (
                      orders.filter(o => o.status !== 'ENTREGADO').map(order => (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrder(order)}
                          className={`w-full text-left p-3.5 rounded-lg border transition-all block ${
                            selectedOrder?.id === order.id
                              ? 'bg-slate-900 border-cyan-500 shadow-md ring-1 ring-cyan-500/20'
                              : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{order.id}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <h5 className="font-bold text-sm text-slate-200">{order.equipmentName || order.deviceType}</h5>
                          <p className="text-xs text-slate-500 mt-1">Clínica: {order.clientName}</p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <PriorityBadge priority={order.priority} />
                            <span className="text-[10px] text-slate-500 font-mono">Entrada: {order.entryDate}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {selectedOrder ? (
                    <div className="space-y-4">
                      <div className="flex border border-slate-800 bg-slate-950 p-1.5 rounded-xl gap-2">
                        <button
                          type="button"
                          onClick={() => setBenchSubTab('measurements')}
                          className={`flex-1 py-2.5 px-4 text-xs font-black uppercase rounded-lg tracking-wider text-center transition-all ${
                            benchSubTab === 'measurements'
                              ? 'bg-slate-900 text-cyan-400 border border-cyan-500/20 shadow-md shadow-cyan-500/5'
                              : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/20'
                          }`}
                        >
                          🔬 Banco de Mediciones
                        </button>
                        <button
                          type="button"
                          onClick={() => setBenchSubTab('budget')}
                          className={`flex-1 py-2.5 px-4 text-xs font-black uppercase rounded-lg tracking-wider text-center transition-all ${
                            benchSubTab === 'budget'
                              ? 'bg-slate-900 text-emerald-400 border border-emerald-500/20 shadow-md shadow-emerald-500/5'
                              : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/20'
                          }`}
                        >
                          💵 Presupuesto & WhatsApp
                        </button>
                      </div>

                      {benchSubTab === 'measurements' ? (
                        <BenchTestView
                          selectedOT={selectedOrder}
                          onSaveOT={handleSaveOT}
                          inventory={inventory}
                          onGeneratePDF={generateQCCertificate}
                        />
                      ) : (
                        <BudgetView
                          selectedOT={selectedOrder}
                          inventory={inventory}
                          onUpdateBudget={handleSaveOT}
                          onDiscountStock={handleDiscountStock}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-12 text-center text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-slate-700 mb-4 animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.4 24.8l-5.83-5.83M11.42 15.17l2.42-2.42M11.42 15.17L5.75 21A2.67 2.67 0 111.9 17.2l5.83-5.83m4.12 1.42V4.12M11.42 12.83h-2.12m0 0a1.5 1.5 0 01-1.5-1.5v-2.12m0 0a1.5 1.5 0 011.5-1.5h2.12M11.42 7.7a1.5 1.5 0 011.5 1.5v2.12m0 0a1.5 1.5 0 01-1.5 1.5h-2.12" />
                      </svg>
                      <h5 className="text-slate-400 font-bold uppercase tracking-wider">No hay banco de trabajo seleccionado</h5>
                      <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">Seleccione una orden de trabajo de la lista de la izquierda para abrirla en el banco electrónico.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'repuestos' && (
            <InventoryView 
              inventory={inventory}
              onSaveItem={handleSaveInventoryItemGlobal}
            />
          )}

          {activeTab === 'history' && (
            <SerialHistoryView 
              workOrders={orders}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              workOrders={orders}
              inventory={inventory}
              onRestoreData={handleRestoreData}
            />
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 py-3.5 px-6 text-center text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <p className="font-medium">© 2026 Laboratorio LabRepair Inc. Todos los derechos de calibración reservados.</p>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Servidor Local Conectado • LocalStorage Activo</span>
        </div>
      </footer>

      {/* MODAL NUEVA ORDEN */}
      <NewWorkOrderModal 
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSave={handleCreateOrder}
        existingOrders={orders}
      />

      {/* MODAL CAMBIO DE CONTRASEÑA */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsChangePasswordOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-950 border border-slate-850 p-6 rounded-xl shadow-2xl z-10 text-xs">
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-slate-900 pb-2 flex items-center gap-1.5">
              🔑 Cambiar Contraseña
            </h3>
            
            {passError && <div className="bg-rose-950/40 border border-rose-900/50 p-2.5 rounded text-rose-450 mb-3 font-semibold">⚠️ {passError}</div>}
            {passSuccess && <div className="bg-emerald-950/40 border border-emerald-900/50 p-2.5 rounded text-emerald-400 mb-3 font-semibold">✅ {passSuccess}</div>}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  required
                  value={passCurrent}
                  onChange={(e) => setPassCurrent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={passNew}
                  onChange={(e) => setPassNew(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-3.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-[11px] font-black text-slate-950 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded uppercase tracking-wider active:scale-95 transition-transform"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}