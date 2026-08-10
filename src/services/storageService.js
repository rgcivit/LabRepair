import { supabase } from './supabaseClient';

const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";

// --- HELPERS PARA SUPABASE ---

/**
 * Convierte objetos de CamelCase (JavaScript) a snake_case (Postgres/Supabase)
 * y limpia valores incompatibles para columnas numéricas.
 */
const mapToSnakeCase = (obj) => {
  const snake = {};
  const numericFields = ["estimatedBudget", "laborCost", "price", "cost", "stock", "minStock"];

  for (const key in obj) {
    let value = obj[key];

    // Limpieza de campos numéricos (evitar error 22P02: invalid input syntax for type numeric: "")
    if (numericFields.includes(key)) {
      if (value === "" || value === undefined || value === null) {
        value = null; // Enviar null real a la DB
      } else {
        value = parseFloat(value);
      }
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

const safeSaveLocal = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage lleno, ignorando copia local.");
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
    const snakeOrder = mapToSnakeCase(workOrder);

    // Log para depuración (ver qué se envía realmente)
    console.log("Enviando orden a Supabase:", snakeOrder);

    const { error } = await supabase
      .from('work_orders')
      .upsert(snakeOrder);

    if (error) {
      console.error("Error detallado Supabase:", error);
      throw error;
    }

    return await getWorkOrders();
  } catch (error) {
    console.error("Fallo guardado en la nube, usando fallback local:", error);
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
    console.error("Error al leer inventario:", error);
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
  }
};

export const saveInventoryItem = async (item) => {
  try {
    const snakeItem = mapToSnakeCase(item);
    const { error } = await supabase.from('inventory').upsert(snakeItem);
    if (error) throw error;
    return await getInventory();
  } catch (error) {
    console.error("Error al guardar item:", error);
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
  }
};
