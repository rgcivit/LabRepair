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

const mapToSnakeCase = (obj, table = 'work_orders') => {
  const snake = {};
  const numericFields = ["estimated_budget", "labor_cost", "price", "cost", "stock", "min_stock"];
  const whitelist = table === 'work_orders' ? VALID_WORK_ORDER_COLUMNS : VALID_INVENTORY_COLUMNS;

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
    console.error(`Error de almacenamiento (QuotaExceeded): El backup es demasiado grande para la memoria local del navegador/móvil.`);

    // Intento de guardado de emergencia: Eliminar imágenes para salvar espacio (pesan el 90% del JSON)
    if (key === WORK_ORDERS_KEY && Array.isArray(data)) {
        try {
            const lightData = data.map(o => ({ ...o, images: [], client_signature: null, tech_signature: null }));
            localStorage.setItem(key, JSON.stringify(lightData));
            console.warn("Se guardó una copia local reducida (sin imágenes) para no perder el registro de órdenes.");
        } catch (innerE) {
            localStorage.removeItem(key);
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

    const orders = data.map(mapToCamelCase);
    safeSaveLocal(WORK_ORDERS_KEY, orders);
    return orders;
  } catch (error) {
    console.error("Error al leer órdenes:", error);
    const localData = localStorage.getItem(WORK_ORDERS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveWorkOrder = async (workOrder) => {
  try {
    const snakeOrder = mapToSnakeCase(workOrder, 'work_orders');

    // Asegurar que el ID esté presente
    if (!snakeOrder.id) {
        snakeOrder.id = `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    console.log("Upserting a Supabase (Work Order):", snakeOrder);

    const { error } = await supabase
      .from('work_orders')
      .upsert(snakeOrder);

    if (error) throw error;

    return await getWorkOrders();
  } catch (error) {
    console.error("Fallo guardado en Supabase:", error);
    // Fallback Local
    const orders = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
    const orderId = workOrder.id || `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    const index = orders.findIndex(o => o.id === orderId);
    let updated;
    if (index >= 0) {
      updated = orders.map(o => o.id === orderId ? { ...o, ...workOrder, id: orderId } : o);
    } else {
      updated = [...orders, { ...workOrder, id: orderId }];
    }
    safeSaveLocal(WORK_ORDERS_KEY, updated);
    return updated;
  }
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

    // 3. Restaurar Configuraciones (LocalStorage)
    if (backupData.settings) {
      localStorage.setItem('estetica_lab_settings', JSON.stringify(backupData.settings));
    }

    return { success: true };
  } catch (error) {
    console.error("Error en restauración de backup:", error);
    return { success: false, error: error.message };
  }
};
