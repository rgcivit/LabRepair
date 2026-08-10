import { supabase } from './supabaseClient';

const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";

// --- HELPERS PARA SUPABASE ---

// Mapeo de nombres de campos camelCase (JS) a snake_case (SQL)
const mapToSnakeCase = (obj) => {
  const snake = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snake[snakeKey] = obj[key];
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

// --- ÓRDENES DE TRABAJO ---

export const getWorkOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders = data.map(mapToCamelCase);
    // Guardar copia local como fallback
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(orders));
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
    const { data, error } = await supabase
      .from('work_orders')
      .upsert(snakeOrder)
      .select();

    if (error) throw error;
    return await getWorkOrders();
  } catch (error) {
    console.error("Error al guardar orden en Supabase:", error);
    // Guardado local de emergencia
    const orders = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
    const index = orders.findIndex(o => o.id === workOrder.id);
    let updated;
    if (index >= 0) {
      updated = orders.map(o => o.id === workOrder.id ? { ...o, ...workOrder } : o);
    } else {
      updated = [...orders, workOrder];
    }
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updated));
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
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updated));
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
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
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
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(updated));
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
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(updated));
    return updated;
  }
};
