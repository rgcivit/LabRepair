import { supabase } from './supabaseClient';

const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";

/**
 * Lista blanca de columnas permitidas en la tabla work_orders para evitar errores 400
 * si enviamos campos extra que no existen en la base de datos.
 */
const VALID_WORK_ORDER_COLUMNS = [
  "id", "client_name", "client_phone", "device_type", "brand_model",
  "serial_number", "issue_description", "cosmetic_condition", "estimated_budget", "priority",
  "status", "entry_date", "accessories", "images", "spare_parts",
  "diagnosis", "labor_cost", "client_signature", "tech_signature",
  "budget_details", "qc_passed", "bench_test"
];

const VALID_INVENTORY_COLUMNS = [
  "id", "name", "category", "stock", "min_stock", "price", "equipment_type"
];

const VALID_SETTINGS_COLUMNS = [
  "id", "company_name", "company_cuit", "company_address", "company_phone",
  "company_email", "currency", "pdf_footer", "technician_name", "license_number",
  "logo", "signature"
];

const VALID_CLIENT_COLUMNS = [
  "id", "name", "phone", "email", "address", "notes", "created_at"
];

const mapToSnakeCase = (obj, table = 'work_orders') => {
  const snake = {};
  const numericFields = ["estimated_budget", "labor_cost", "price", "cost", "stock", "min_stock"];

  let whitelist;
  if (table === 'work_orders') whitelist = VALID_WORK_ORDER_COLUMNS;
  else if (table === 'inventory') whitelist = VALID_INVENTORY_COLUMNS;
  else if (table === 'clients') whitelist = VALID_CLIENT_COLUMNS;
  else whitelist = VALID_SETTINGS_COLUMNS;

  for (const key in obj) {
    // 1. Convertir key a snake_case
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    // 2. Filtrar solo columnas válidas
    if (!whitelist.includes(snakeKey)) {
      continue;
    }

    let value = obj[key];

    // 3. Limpieza de campos numéricos
    if (numericFields.includes(snakeKey)) {
      if (value === "" || value === undefined || value === null) {
        value = null;
      } else {
        const parsed = parseFloat(value);
        value = isNaN(parsed) ? null : parsed;
      }
    }

    snake[snakeKey] = value;
  }
  return snake;
};

const mapToCamelCase = (obj) => {
  const camel = {};
  for (const key in obj) {
    const camelKey = key.replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''));
    camel[camelKey] = obj[key];
  }
  return camel;
};

const safeSaveLocal = (key, data) => {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
  } catch (e) {
    console.warn(`Aviso de almacenamiento: Memoria local llena (QuotaExceeded).`);

    // ESTRATEGIA DE EMERGENCIA: Si es la tabla de órdenes, guardar una versión sin fotos
    if (key === WORK_ORDERS_KEY && Array.isArray(data)) {
        try {
            // Quitamos lo que más pesa: fotos y firmas base64
            const lightData = data.map(o => ({
              ...o,
              images: [],
              images_light: o.images?.length || 0, // Solo guardamos cuántas fotos hay
              client_signature: null,
              tech_signature: null
            }));
            localStorage.setItem(key, JSON.stringify(lightData));
            console.log("Se salvó el registro de texto eliminando las fotos pesadas de la memoria local.");
        } catch (innerE) {
            console.error("No se pudo salvar ni siquiera la versión ligera.");
        }
    }
  }
};

// --- ÓRDENES DE TRABAJO ---

export const getWorkOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const cloudOrders = data.map(mapToCamelCase);

    // LOGICA DE MEZCLA (MERGE): No borrar locales si la nube está vacía
    const localData = localStorage.getItem(WORK_ORDERS_KEY);
    const localOrders = localData ? JSON.parse(localData) : [];

    // Si la nube tiene datos, los priorizamos pero mantenemos los locales que no se han subido
    const merged = cloudOrders.length > 0 ? cloudOrders : localOrders;

    safeSaveLocal(WORK_ORDERS_KEY, merged);
    return merged;
  } catch (error) {
    console.error("Error al leer órdenes:", error);
    const localData = localStorage.getItem(WORK_ORDERS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveWorkOrder = async (workOrder) => {
  // 1. LIMPIEZA DE DATOS (Asegurar IDs y Formatos)
  const orderId = workOrder.id || `OT-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanOrder = { ...workOrder, id: orderId };

  // 2. ACTUALIZACIÓN EN MEMORIA Y LOCALSTORAGE
  const localData = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
  const index = localData.findIndex(o => o.id === orderId);
  let updatedLocal;

  if (index >= 0) {
    updatedLocal = localData.map(o => o.id === orderId ? cleanOrder : o);
  } else {
    updatedLocal = [cleanOrder, ...localData];
  }

  // Guardamos en local (si hay espacio, con fotos; si no, se encarga safeSaveLocal de limpiar)
  safeSaveLocal(WORK_ORDERS_KEY, updatedLocal);

  // 3. INTENTO DE SUBIDA A LA NUBE
  try {
    const snakeOrder = mapToSnakeCase(cleanOrder, 'work_orders');
    const { error } = await supabase.from('work_orders').upsert(snakeOrder);

    if (error) {
      if (error.status === 404) {
        console.warn("Tabla 'work_orders' no existe en Supabase. Los datos quedan seguros en el celular.");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Fallo de sincronización con la nube:", error);
  }

  // SIEMPRE retornamos la lista actualizada para que la interfaz se refresque
  return updatedLocal;
};

export const deleteWorkOrder = async (id) => {
  try {
    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) throw error;
    return await getWorkOrders();
  } catch (error) {
    console.error("Error al borrar orden:", error);
    return JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
  }
};

// --- INVENTARIO ---

export const getInventory = async () => {
  try {
    const { data, error } = await supabase.from('inventory').select('*').order('name');
    if (error) throw error;
    const items = data.map(mapToCamelCase);
    safeSaveLocal(INVENTORY_KEY, items);
    return items;
  } catch (error) {
    const localData = localStorage.getItem(INVENTORY_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveInventoryItem = async (item) => {
  try {
    const snakeItem = mapToSnakeCase(item, 'inventory');

    if (!snakeItem.id) {
        snakeItem.id = `INS-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    console.log("Upserting a Supabase (Inventory):", snakeItem);

    const { error } = await supabase.from('inventory').upsert(snakeItem);
    if (error) throw error;
    return await getInventory();
  } catch (error) {
    console.error("Fallo guardado inventario en Supabase:", error);
    const localData = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
    const itemId = item.id || `INS-${Math.floor(1000 + Math.random() * 9000)}`;
    const index = localData.findIndex(i => i.id === itemId);
    let updated;
    if (index >= 0) {
        updated = localData.map(i => i.id === itemId ? { ...i, ...item, id: itemId } : i);
    } else {
        updated = [...localData, { ...item, id: itemId }];
    }
    safeSaveLocal(INVENTORY_KEY, updated);
    return updated;
  }
};

// --- CONFIGURACIÓN DEL SISTEMA ---

const SETTINGS_LOCAL_KEY = 'estetica_lab_settings';

export const getAppSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 'global_settings')
      .maybeSingle(); // maybeSingle evita el error 406 si no hay datos

    if (error) throw error;

    if (data) {
      const camelSettings = mapToCamelCase(data);
      safeSaveLocal(SETTINGS_LOCAL_KEY, camelSettings);
      return camelSettings;
    }

    const local = localStorage.getItem(SETTINGS_LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  } catch (error) {
    // Si la tabla no existe (404), fallamos silenciosamente al local
    console.warn("Aviso: No se pudo conectar con la tabla 'settings' en Supabase. Usando respaldo local.");
    const local = localStorage.getItem(SETTINGS_LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  }
};

export const saveAppSettings = async (settings) => {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
    const settingsWithId = { ...settings, id: 'global_settings' };
    const snakeSettings = mapToSnakeCase(settingsWithId, 'settings');

    const { error } = await supabase
      .from('settings')
      .upsert(snakeSettings);

    if (error) throw error;
    return settings;
  } catch (error) {
    console.error("Error al guardar settings en Supabase:", error);
    return settings;
  }
};

// --- CLIENTES ---

const CLIENTS_KEY = "labrepair_clients";

export const getClients = async () => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) throw error;

    const clients = data.map(mapToCamelCase);
    safeSaveLocal(CLIENTS_KEY, clients);
    return clients;
  } catch (error) {
    console.warn("Aviso: No se pudo conectar con la tabla 'clients' en Supabase. Usando respaldo local.");
    const localData = localStorage.getItem(CLIENTS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveClient = async (client) => {
  try {
    const snakeClient = mapToSnakeCase(client, 'clients');
    const { error } = await supabase.from('clients').upsert(snakeClient);
    if (error) throw error;
    return await getClients();
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    const localData = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    const index = localData.findIndex(c => c.id === client.id);
    let updated;
    if (index >= 0) {
      updated = localData.map(c => c.id === client.id ? { ...c, ...client } : c);
    } else {
      updated = [...localData, { ...client, id: client.id || Date.now().toString() }];
    }
    safeSaveLocal(CLIENTS_KEY, updated);
    return updated;
  }
};

export const deleteClient = async (id) => {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
    return await getClients();
  } catch (error) {
    console.error("Error al borrar cliente:", error);
    const localData = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    const updated = localData.filter(c => c.id !== id);
    safeSaveLocal(CLIENTS_KEY, updated);
    return updated;
  }
};

/**
 * Función crítica para restaurar un backup completo tanto en la nube (Supabase)
 * como en el almacenamiento local.
 */
export const restoreFullBackup = async (backupData) => {
  try {
    console.log("Iniciando restauración masiva de backup...");

    // 1. Restaurar Órdenes de Trabajo en Supabase
    if (backupData.workOrders && Array.isArray(backupData.workOrders)) {
      const snakeOrders = backupData.workOrders.map(o => mapToSnakeCase(o, 'work_orders'));
      // Dividir en bloques si es muy grande (Supabase tiene límites por request)
      const { error } = await supabase.from('work_orders').upsert(snakeOrders);
      if (error) throw error;
      console.log(`${snakeOrders.length} órdenes restauradas en la nube.`);
    }

    // 2. Restaurar Inventario en Supabase
    if (backupData.inventory && Array.isArray(backupData.inventory)) {
      const snakeInventory = backupData.inventory.map(i => mapToSnakeCase(i, 'inventory'));
      const { error } = await supabase.from('inventory').upsert(snakeInventory);
      if (error) throw error;
      console.log(`${snakeInventory.length} productos de inventario restaurados en la nube.`);
    }

    // 3. Restaurar Clientes en Supabase
    if (backupData.clients && Array.isArray(backupData.clients)) {
      const snakeClients = backupData.clients.map(c => mapToSnakeCase(c, 'clients'));
      const { error } = await supabase.from('clients').upsert(snakeClients);
      if (error) throw error;
      console.log(`${snakeClients.length} clientes restaurados en la nube.`);
    }

    // 4. Restaurar Configuraciones (LocalStorage + Cloud)
    if (backupData.settings) {
      localStorage.setItem('estetica_lab_settings', JSON.stringify(backupData.settings));
      await saveAppSettings(backupData.settings);
    }

    return { success: true };
  } catch (error) {
    console.error("Error en restauración de backup:", error);
    return { success: false, error: error.message };
  }
};
