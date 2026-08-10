import { supabase } from './supabaseClient';

const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";

// --- HELPERS PARA SUPABASE ---

const mapToSnakeCase = (obj) => {
  const snake = {};
  for (const key in obj) {
    // Si el valor es una cadena vacía y el campo parece ser numérico, enviamos null
    let value = obj[key];
    if (value === "" && (key === "estimatedBudget" || key === "laborCost")) {
      value = null;
    }
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
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

/**
 * Función para guardar en LocalStorage de forma segura (sin que crashee la app si se llena)
 */
const safeSaveLocal = (key, data) => {
  try {
    const stringData = JSON.stringify(data);
    // Si los datos son muy pesados (ej. muchas fotos), intentamos limpiar para que quepa
    localStorage.setItem(key, stringData);
  } catch (e) {
    console.warn("LocalStorage lleno, no se pudo guardar copia local de seguridad.");
    // Si falla por cuota, intentamos guardar sin imágenes para al menos tener el texto
    try {
      if (key === WORK_ORDERS_KEY) {
        const lightData = data.map(o => ({ ...o, images: [], clientSignature: null }));
        localStorage.setItem(key, JSON.stringify(lightData));
      }
    } catch (e2) {
      console.error("Definitivamente no hay espacio en el dispositivo.");
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
    console.error("Error al leer órdenes de Supabase:", error);
    const localData = localStorage.getItem(WORK_ORDERS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveWorkOrder = async (workOrder) => {
  try {
    const snakeOrder = mapToSnakeCase(workOrder);
    const { error } = await supabase
      .from('work_orders')
      .upsert(snakeOrder);

    if (error) throw error;
    return await getWorkOrders();
  } catch (error) {
    console.error("Error al guardar orden en Supabase:", error);
    // Fallback local
    const orders = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
    const index = orders.findIndex(o => o.id === workOrder.id);
    let updated;
    if (index >= 0) {
      updated = orders.map(o => o.id === workOrder.id ? { ...o, ...workOrder } : o);
    } else {
      updated = [...orders, workOrder];
    }
    safeSaveLocal(WORK_ORDERS_KEY, updated);
    return updated;
  }
};

export const deleteWorkOrder = async (id) => {
  try {
    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return await getWorkOrders();
  } catch (error) {
    console.error("Error al borrar orden en Supabase:", error);
    const orders = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
    const updated = orders.filter(o => o.id !== id);
    safeSaveLocal(WORK_ORDERS_KEY, updated);
    return updated;
  }
};

// --- INVENTARIO ---

export const getInventory = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('name');

    if (error) throw error;

    const items = data.map(mapToCamelCase);
    safeSaveLocal(INVENTORY_KEY, items);
    return items;
  } catch (error) {
    console.error("Error al leer inventario de Supabase:", error);
    const localData = localStorage.getItem(INVENTORY_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveInventoryItem = async (item) => {
  try {
    const snakeItem = mapToSnakeCase(item);
    const { error } = await supabase
      .from('inventory')
      .upsert(snakeItem);

    if (error) throw error;
    return await getInventory();
  } catch (error) {
    console.error("Error al guardar item en Supabase:", error);
    const inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
    const index = inventory.findIndex(i => i.id === item.id);
    let updated;
    if (index >= 0) {
      updated = inventory.map(i => i.id === item.id ? { ...i, ...item } : i);
    } else {
      updated = [...inventory, item];
    }
    safeSaveLocal(INVENTORY_KEY, updated);
    return updated;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return await getInventory();
  } catch (error) {
    console.error("Error al borrar item en Supabase:", error);
    const inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
    const updated = inventory.filter(i => i.id !== id);
    safeSaveLocal(INVENTORY_KEY, updated);
    return updated;
  }
};
