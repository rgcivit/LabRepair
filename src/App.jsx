import React, { useState, useEffect } from 'react';
import logo from './components/logo laboratorio.jpeg';
import {
  LayoutDashboard,
  ClipboardList,
  Microscope,
  Users,
  Boxes,
  History,
  Bell,
  Settings2,
  Plus,
  Menu,
  X,
  TrendingUp
} from "lucide-react";
import { supabase } from './services/supabaseClient';
import { getWorkOrders, saveWorkOrder, deleteWorkOrder, getInventory, saveInventoryItem, restoreFullBackup, getAppSettings, getClients, saveClient, deleteClient } from './services/storageService';
import { StatusBadge, PriorityBadge } from './components/common/Badges';
import NewWorkOrderModal from './components/work-orders/NewWorkOrderModal';
import BenchTestView from './components/bench-tests/BenchTestView';
import BudgetView from './components/bench-tests/BudgetView';
import InventoryView from './components/inventory/InventoryView';
import ClientsView from './components/clients/ClientsView';
import SerialHistoryView from './components/history/SerialHistoryView';
import SettingsView from './components/settings/SettingsView';
import FinancialReportsView from './components/reports/FinancialReportsView';
import { generateQCCertificate, exportWorkOrdersToPDF, generateEntryReceipt } from './services/pdfService';
import { generateSecuritySeal } from './services/sealService';

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

  // Inicialización de estados (ahora asíncronos con Supabase)
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Control de modales y paneles
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Estado de navegación y búsqueda
  const [activeTab, setActiveTab] = useState('dashboard');
  const [benchSubTab, setBenchSubTab] = useState('measurements');
  const [filterQuery, setFilterQuery] = useState('');

  // Filtros de estado en la pestaña de Órdenes
  const [statusFilter, setStatusFilter] = useState('TODOS');

  // Control del menú hamburguesa (móvil)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para Pull-to-Refresh (Móvil)
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Carga inicial y suscripción en tiempo real
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      // Cargar configuraciones, órdenes e inventario en paralelo
      const [fetchedOrders, fetchedInventory, fetchedClients] = await Promise.all([
        getWorkOrders(),
        getInventory(),
        getClients(),
        getAppSettings() // Sincroniza configuraciones con la nube al iniciar
      ]);
      setOrders(fetchedOrders);
      setInventory(fetchedInventory);
      setClients(fetchedClients);

      // Verificar conexión real con Supabase
      const { data, error } = await supabase.from('work_orders').select('id').limit(1);
      setIsCloudConnected(!error);

      setIsLoading(false);
    };

    initData();

    // Suscripción en tiempo real a Supabase
    const ordersSubscription = supabase
      .channel('work_orders_realtime')
      .on('postgres_changes', { event: '*', table: 'work_orders', schema: 'public' }, () => {
        console.log("Cambio detectado en la nube, refrescando...");
        refreshData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    const fetchedOrders = await getWorkOrders();
    const fetchedInventory = await getInventory();
    const fetchedClients = await getClients();
    setOrders(fetchedOrders);
    setInventory(fetchedInventory);
    setClients(fetchedClients);
    setIsRefreshing(false);
  };

  const handleTouchStart = (e) => {
    // Solo si el scroll está arriba del todo
    if (window.scrollY <= 0) {
      setStartY(e.touches[0].pageY);
    }
  };

  const handleTouchMove = (e) => {
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY;
    if (window.scrollY <= 0 && distance > 0) {
      // Aplicar resistencia al deslizamiento
      setPullDistance(Math.min(distance / 2.5, 70));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 55) {
      await refreshData();
    }
    setPullDistance(0);
    setStartY(0);
  };

  const handleOpenNewOrder = () => {
    setEditingOrder(null);
    setIsNewOrderModalOpen(true);
  };

  const handleEditOrder = (order, e) => {
    if (e) e.stopPropagation();
    setEditingOrder(order);
    setIsNewOrderModalOpen(true);
  };

  // Función para borrar orden de trabajo
  const handleDeleteOrder = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('¿Estás seguro de que deseas eliminar esta Orden de Trabajo?')) {
      const updatedList = await deleteWorkOrder(id);
      setOrders(updatedList);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    }
  };

  // Acción integrada al hacer clic en "Ver Diagnóstico"
  const handleViewDiagnostic = (order) => {
    setSelectedOrder(order);
    setActiveTab('diagnostic');
    setBenchSubTab('measurements');
  };

  // Callback general para guardar/actualizar una OT
  const handleSaveOT = async (updatedOrder) => {
    const updatedList = await saveWorkOrder(updatedOrder);
    setOrders([...updatedList]); // Forzar nueva referencia de array para React
    if (selectedOrder?.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
  };

  // Callback para imputar y descontar stock
  const handleDiscountStock = async (itemId, quantity) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      stock: Math.max(0, item.stock - quantity)
    };
    
    const updatedInventory = await saveInventoryItem(updatedItem);
    setInventory(updatedInventory);
  };

  // Callback para repuestos de forma global
  const handleSaveInventoryItemGlobal = async (item) => {
    const updatedInventory = await saveInventoryItem(item);
    setInventory(updatedInventory);
  };

  // --- CLIENTES ---
  const handleSaveClient = async (client) => {
    const updated = await saveClient(client);
    setClients(updated);
  };

  const handleDeleteClient = async (id) => {
    const updated = await deleteClient(id);
    setClients(updated);
  };

  // Callback para restaurar base de datos
  const handleRestoreData = async (backupPackage) => {
    try {
      setIsLoading(true);
      // 1. Ejecutar restauración masiva (Nube + Local)
      const res = await restoreFullBackup(backupPackage);

      if (res.success) {
        // 2. Forzar actualización de la UI con los nuevos datos
        await refreshData();
      } else {
        alert("Fallo al restaurar en la nube: " + res.error);
      }
    } catch (e) {
      console.error("Error al procesar restauración:", e);
      alert("Error crítico al restaurar los datos.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- CÁLCULO DILIGENTE DE MÉTRICAS (KPIs) ---
  const activeOrdersCount = orders.filter(o => o.status !== 'ENTREGADO').length;
  const waitingPartsCount = orders.filter(o => o.status === 'ESPERANDO_REPUESTO').length;
  const readyDeliveryCount = orders.filter(o => o.status === 'LISTO').length;
  const lowStockCount = inventory.filter(item => item.stock <= item.minStock).length;

  // --- CÁLCULO DE MANTENIMIENTOS PREVENTIVOS (3 MESES) ---
  const maintenanceReminders = orders.reduce((acc, order) => {
    if (order.status !== 'ENTREGADO' || !order.entryDate || !order.serialNumber) return acc;

    // Solo considerar la última intervención de cada número de serie
    const existing = acc.find(item => item.serialNumber === order.serialNumber);
    if (!existing || new Date(order.entryDate) > new Date(existing.entryDate)) {
      if (existing) acc = acc.filter(item => item.serialNumber !== order.serialNumber);

      const repairDate = new Date(order.entryDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      if (repairDate <= threeMonthsAgo) {
        acc.push(order);
      }
    }
    return acc;
  }, []);

  // --- AUTENTICACIÓN Y GESTIÓN DE SESIÓN ---
  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setIsUserDropdownOpen(false);
  };

  // --- CONTROL DE INACTIVIDAD (15 MINUTOS) ---
  useEffect(() => {
    if (!currentUser) return;

    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    const CHECK_INTERVAL = 30000; // Revisar cada 30 segundos

    const updateLastActivity = () => {
      localStorage.setItem('labrepair_last_activity', Date.now().toString());
    };

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('labrepair_last_activity');
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity, 10);
        if (diff > FIFTEEN_MINUTES) {
          console.log("SESIÓN EXPIRADA: Forzando cierre por inactividad.");
          handleLogout();
        }
      } else {
        updateLastActivity();
      }
    };

    // Eventos que reinician el contador
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    // Revisar al volver a la app (foreground)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Revisar periódicamente mientras la app está abierta
    const interval = setInterval(checkInactivity, CHECK_INTERVAL);

    // Inicializar timestamp al cargar
    updateLastActivity();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
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
    if (!order) return false;
    const q = (filterQuery || "").toLowerCase().trim();

    const id = String(order.id || "").toLowerCase();
    const client = String(order.clientName || "").toLowerCase();
    const sn = String(order.serialNumber || "").toLowerCase();
    const brand = String(order.brandModel || "").toLowerCase();
    const type = String(order.deviceType || "").toLowerCase();

    const matchesSearch = !q || id.includes(q) || client.includes(q) || sn.includes(q) || brand.includes(q) || type.includes(q);
    const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!currentUser) {
    return <LoginView onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* INDICADOR PULL-TO-REFRESH */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[1000] pointer-events-none transition-all duration-200"
        style={{
          top: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0,
          transform: `translateX(-50%) rotate(${pullDistance * 4}deg)`
        }}
      >
        <div className="bg-cyan-500 text-slate-950 p-2 rounded-full shadow-lg shadow-cyan-500/20 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </div>
      </div>
      
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-6 h-6 text-slate-950">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.67 2.67 0 1113.4 24.8l-5.83-5.83M11.42 15.17l2.42-2.42M11.42 15.17L5.75 21A2.67 2.67 0 111.9 17.2l5.83-5.83m4.12 1.42V4.12M11.42 12.83h-2.12m0 0a1.5 1.5 0 01-1.5-1.5v-2.12m0 0a1.5 1.5 0 011.5-1.5h2.12M11.42 7.7a1.5 1.5 0 011.5 1.5v2.12m0 0a1.5 1.5 0 01-1.5 1.5h-2.12" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight flex flex-col leading-none">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 uppercase">Ingeniería Biomédica</span>
                  <span className="text-xs tracking-[0.3em] text-slate-500 uppercase mt-0.5">Laboratorio</span>
                </h1>
              </div>
            </div>

            {/* BOTÓN HAMBURGUESA (SÓLO MÓVIL) */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-all"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
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
            onClick={handleOpenNewOrder}
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
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* SIDEBAR LATERAL (RESPONSIVE HAMBURGUESA) */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800 p-4 transform transition-transform duration-300 ease-in-out flex flex-col gap-2
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex md:w-64
        `}>
          <button
            onClick={() => { setActiveTab('dashboard'); setStatusFilter('TODOS'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} />
              <span>Dashboard Taller</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('orders'); setStatusFilter('TODOS'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'orders' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardList size={18} />
              <span>Órdenes de Trabajo</span>
            </div>
            <span className="bg-slate-800 text-[11px] text-slate-300 font-bold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('diagnostic'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'diagnostic' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Microscope size={18} />
              <span>Diagnóstico & Banco</span>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Activas
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('clientes'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'clientes'
                ? 'bg-slate-900 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} />
              <span>Clientes</span>
            </div>
            <span className="bg-slate-800 text-[11px] text-slate-300 font-bold px-2 py-0.5 rounded-full">
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('repuestos'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'repuestos' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Boxes size={18} />
              <span>Repuestos & Almacén</span>
            </div>
            {lowStockCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <History size={18} />
              <span>Historial de Serie</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={18} />
              <span>Reportes de Ganancias</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('maintenance'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'maintenance'
                ? 'bg-slate-900 text-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell size={18} />
              <span>Recordatorios</span>
            </div>
            {maintenanceReminders.length > 0 && (
              <span className="bg-cyan-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {maintenanceReminders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings' 
                ? 'bg-slate-900 text-cyan-400 font-semibold' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings2 size={18} />
              <span>Configuración</span>
            </div>
          </button>
        </aside>

        {/* OVERLAY PARA CERRAR MENÚ (MÓVIL) */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
          />
        )}

        {/* ÁREA DE CONTENIDO DINÁMICO */}
        <main className="flex-1 p-3 md:p-6 space-y-6 overflow-x-hidden">
          {(activeTab === 'dashboard' || activeTab === 'orders') && (
            <div className="flex flex-col lg:flex-row gap-6">

              {/* COLUMNA IZQUIERDA: MÉTRICAS Y LISTA (PARA TABLET) */}
              <div className={`flex-1 space-y-6 ${selectedOrder ? 'hidden lg:block lg:w-1/3' : 'w-full'}`}>
                {/* TARJETAS DE MÉTRICAS - DISEÑO COMPACTO PARA TABLET */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Activas</span>
                      <h3 className="text-xl font-black text-white">{activeOrdersCount}</h3>
                    </div>
                    <div className="p-2 bg-cyan-950 text-cyan-400 border border-cyan-800/30 rounded-lg">
                      <ClipboardList size={18} />
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-lg">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Mantenimientos</span>
                      <h3 className="text-xl font-black text-cyan-400">{maintenanceReminders.length}</h3>
                    </div>
                    <div className="p-2 bg-amber-950/40 text-amber-400 border border-amber-800/20 rounded-lg">
                      <Bell size={18} />
                    </div>
                  </div>
                </div>

                {/* TABLA / LISTA DE ÓRDENES */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Órdenes</h3>
                    <button
                      type="button"
                      onClick={() => exportWorkOrdersToPDF(filteredOrders)}
                      className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg"
                      title="Exportar PDF"
                    >
                      <ClipboardList size={14} />
                    </button>
                  </div>

                  <div className="overflow-y-auto max-h-[calc(100vh-350px)]">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredOrders.map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`cursor-pointer transition-all ${selectedOrder?.id === order.id ? 'bg-cyan-950/20 border-l-4 border-cyan-500' : 'hover:bg-slate-900/60'}`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex justify-between items-start">
                                <span className="text-[10px] font-mono font-bold text-cyan-400">{order.id}</span>
                                <PriorityBadge priority={order.priority} />
                              </div>
                              <div className="font-bold text-slate-200 text-sm mt-1 truncate">{order.clientName}</div>
                              <div className="text-[11px] text-slate-500 truncate">{order.equipmentName || order.deviceType}</div>
                              <div className="mt-2">
                                <StatusBadge status={order.status} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* COLUMNA DERECHA: DETALLE / BANCO (PARA TABLET) */}
              <div className={`flex-[2] ${!selectedOrder ? 'hidden lg:flex' : 'block'} min-h-[600px]`}>
                {selectedOrder ? (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedOrder(null)} className="lg:hidden p-2 text-slate-400">
                          <X size={20} />
                        </button>
                        <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">Detalle de Intervención</h3>
                          <p className="text-[10px] text-cyan-400 font-mono">OT: {selectedOrder.id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditOrder(selectedOrder)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-amber-500">
                          <Settings2 size={16} />
                        </button>
                        <button onClick={() => generateEntryReceipt(selectedOrder, selectedOrder.clientSignature, null)} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-500">
                          <ClipboardList size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex border border-slate-800 bg-slate-950 p-1 rounded-xl gap-1">
                      <button
                        onClick={() => setBenchSubTab('measurements')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${benchSubTab === 'measurements' ? 'bg-slate-900 text-cyan-400 shadow-md' : 'text-slate-500'}`}
                      >
                        🔬 Mediciones
                      </button>
                      <button
                        onClick={() => setBenchSubTab('budget')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${benchSubTab === 'budget' ? 'bg-slate-900 text-emerald-400 shadow-md' : 'text-slate-500'}`}
                      >
                        💵 Presupuesto
                      </button>
                    </div>

                    {benchSubTab === 'measurements' ? (
                      <BenchTestView selectedOT={selectedOrder} onSaveOT={handleSaveOT} inventory={inventory} onGeneratePDF={generateQCCertificate} />
                    ) : (
                      <BudgetView selectedOT={selectedOrder} inventory={inventory} onUpdateBudget={handleSaveOT} onDiscountStock={handleDiscountStock} />
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-950/30 border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center">
                    <div className="max-w-xs">
                      <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-700">
                        <ClipboardList size={32} />
                      </div>
                      <h4 className="text-slate-400 font-black uppercase tracking-widest text-sm">Vista de Detalle</h4>
                      <p className="text-xs text-slate-600 mt-2">Seleccione una orden de la lista izquierda para gestionar el diagnóstico o presupuesto en esta pantalla.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === 'diagnostic' && (
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Diagnóstico y Banco de Pruebas Activo</h3>
                  <p className="text-sm text-slate-400">Inspeccione mediciones hidráulicas, termodinámicas, neumáticas, y maneje la cotización financiera del equipo.</p>
                </div>
                
                {selectedOrder && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => generateQCCertificate(selectedOrder)}
                      disabled={!selectedOrder.qcPassed}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-650/10 transition-all uppercase tracking-wider shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span>Descargar Certificado QC</span>
                    </button>

                    <button
                      onClick={() => generateSecuritySeal(selectedOrder)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-650/10 transition-all uppercase tracking-wider shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                      </svg>
                      <span>Imprimir Faja</span>
                    </button>
                  </div>
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
                          onSaveInventoryItem={handleSaveInventoryItemGlobal}
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

          {activeTab === 'maintenance' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-glow shadow-cyan-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">Preventive Maintenance Engine</span>
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider mt-1">Equipos para Mantenimiento (+3 meses)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Listado de equipos cuya última intervención fue hace más de 90 días. Se recomienda contactar para service preventivo.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {maintenanceReminders.length === 0 ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="w-16 h-16 mx-auto text-slate-800 mb-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                    </svg>
                    <h5 className="text-slate-400 font-bold uppercase tracking-wider">Sin mantenimientos pendientes</h5>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">No hay equipos que superen los 3 meses desde su última reparación entregada.</p>
                  </div>
                ) : (
                  maintenanceReminders.map(order => (
                    <div key={order.id} className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-cyan-500/30 transition-colors shadow-lg">
                      <div className="flex items-center gap-4 w-full">
                        <div className="h-12 w-12 rounded-full bg-cyan-950/30 border border-cyan-800/20 flex items-center justify-center text-cyan-400 shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12H13.5" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-100 truncate">{order.equipmentName || order.deviceType} <span className="font-mono text-cyan-500 text-xs ml-2">S/N: {order.serialNumber}</span></h4>
                          <p className="text-sm text-slate-400 font-bold">{order.clientName}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              📅 Última: {order.entryDate}
                            </span>
                            <span className="text-[10px] bg-amber-950/40 text-amber-500 border border-amber-800/20 px-1.5 py-0.5 rounded font-black uppercase">
                              Hace {Math.floor((Date.now() - new Date(order.entryDate)) / (1000 * 60 * 60 * 24 * 30))} meses
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const msg = encodeURIComponent(`Hola *${order.clientName}*, te contactamos de *LabRepair* 🔧. Notamos que han pasado 3 meses desde el service de tu *${order.deviceType}* (S/N: ${order.serialNumber}). Recomendamos realizar un mantenimiento preventivo para asegurar el óptimo funcionamiento y evitar desgastes mayores. ¡Avísanos si quieres coordinar un turno!`);
                          window.open(`https://wa.me/${order.clientPhone.replace(/[^\d+]/g, '')}?text=${msg}`, '_blank');
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.274 1.52 5.242 1.522 5.404 0 9.799-4.395 9.802-9.799 0-2.62-1.02-5.084-2.871-6.934-1.852-1.848-4.312-2.868-6.931-2.87-5.404 0-9.802 4.394-9.802 9.799 0 2.131.56 4.202 1.618 6.013l-.945 3.454 3.535-.928zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.353-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.808 2.876 2.056 3.223c.248.348 3.556 5.432 8.613 7.611 1.203.518 2.143.827 2.873 1.058 1.21.384 2.31.33 3.18.201.97-.144 2.03-.83 2.316-1.632.285-.802.285-1.488.201-1.633z"/></svg>
                        Recordar Service
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'repuestos' && (
            <InventoryView 
              inventory={inventory}
              onSaveItem={handleSaveInventoryItemGlobal}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientsView
              clients={clients}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === 'history' && (
            <SerialHistoryView 
              workOrders={orders}
            />
          )}

          {activeTab === 'reports' && (
            <FinancialReportsView
              orders={orders}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              workOrders={orders}
              inventory={inventory}
              clients={clients}
              onRestoreData={handleRestoreData}
            />
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-850 py-3.5 px-6 text-center text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <p className="font-medium">Desarrollado por Rodrigo Guevara Civit - Konectaapp.com</p>
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 shadow-glow shadow-emerald-500' : 'bg-rose-500 animate-pulse shadow-glow shadow-rose-500'}`}></span>
          <span className={`font-mono text-[10px] uppercase tracking-widest ${isCloudConnected ? 'text-slate-500' : 'text-rose-400 font-bold'}`}>
            {isCloudConnected ? 'Servidor Cloud Sincronizado' : 'Sin Sincronización (Modo Local)'}
          </span>
        </div>
      </footer>

      {/* MODAL NUEVA ORDEN */}
      <NewWorkOrderModal 
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        onSave={refreshData}
        editingOrder={editingOrder}
        clients={clients}
        onSaveClient={handleSaveClient}
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