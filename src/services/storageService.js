import { supabase } from './supabaseClient';

const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";
const CLIENTS_KEY = "labrepair_clients";
const SETTINGS_LOCAL_KEY = 'estetica_lab_settings';

/**
 * Lista blanca de columnas permitidas en Supabase
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

/**
 * Mapeo de objetos JS a Snake Case para PostgreSQL
 */
const mapToSnakeCase = (obj, table = 'work_orders') => {
  if (!obj) return {};
  const snake = {};
  const numericFields = ["estimated_budget", "labor_cost", "price", "cost", "stock", "min_stock"];

  let whitelist = VALID_WORK_ORDER_COLUMNS;
  if (table === 'inventory') whitelist = VALID_INVENTORY_COLUMNS;
  else if (table === 'clients') whitelist = VALID_CLIENT_COLUMNS;
  else if (table === 'settings') whitelist = VALID_SETTINGS_COLUMNS;

  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (!whitelist.includes(snakeKey)) continue;

    let value = obj[key];
    if (numericFields.includes(snakeKey)) {
      if (value === "" || value === undefined || value === null) value = 0;
      else value = parseFloat(value) || 0;
    }

    // Prevención de QuotaExceeded: No permitir Base64 excesivamente grandes en campos directos
    if (typeof value === 'string' && value.length > 800000 && !key.toLowerCase().includes('signature')) {
        value = null;
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

/**
 * Guardado seguro en LocalStorage con manejo de Cuota
 */
const safeSaveLocal = (key, data) => {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
  } catch (e) {
    console.error("QuotaExceeded: Limpiando imágenes pesadas para salvar datos de texto.");
    if (key === WORK_ORDERS_KEY && Array.isArray(data)) {
        const lightData = data.map(o => ({
          ...o,
          images: [],
          client_signature: null,
          tech_signature: null
        }));
        localStorage.setItem(key, JSON.stringify(lightData));
    }
  }
};

/**
 * Sube un archivo Base64 a Supabase Storage
 */
export const uploadFile = async (base64, path) => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const base64Data = base64.split(',')[1];
    const contentType = base64.split(';')[0].split(':')[1];
    const byteCharacters = atob(base64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: contentType });

    const { data, error } = await supabase.storage
      .from('labrepair-assets')
      .upload(path, blob, { upsert: true });

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('labrepair-assets').getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("Error subiendo archivo:", err);
    return base64; // Fallback al base64 si falla la subida
  }
};

// --- ÓRDENES DE TRABAJO ---

export const getWorkOrders = async () => {
  try {
    const localStr = localStorage.getItem(WORK_ORDERS_KEY);
    const localOrders = localStr ? JSON.parse(localStr) : [];

    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Fallo lectura de nube, usando LocalStorage.");
      return localOrders;
    }

    const cloudOrders = data.map(mapToCamelCase);

    // Mezcla inteligente: Unir por ID, prevaleciendo el cambio más reciente
    const ordersMap = new Map();
    localOrders.forEach(o => ordersMap.set(o.id, o));
    cloudOrders.forEach(o => ordersMap.set(o.id, o));

    const finalOrders = Array.from(ordersMap.values()).sort((a,b) => b.id.localeCompare(a.id));
    safeSaveLocal(WORK_ORDERS_KEY, finalOrders);
    return finalOrders;
  } catch (error) {
    const localData = localStorage.getItem(WORK_ORDERS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveWorkOrder = async (workOrder) => {
  const orderId = workOrder.id || `OT-${Math.floor(1000 + Math.random() * 9000)}`;
  let processedOrder = { ...workOrder, id: orderId };

  // 1. Guardado LOCAL inmediato (Seguridad extrema)
  const currentLocal = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
  const index = currentLocal.findIndex(o => o.id === orderId);
  const updatedLocal = index >= 0
    ? currentLocal.map(o => o.id === orderId ? processedOrder : o)
    : [processedOrder, ...currentLocal];

  safeSaveLocal(WORK_ORDERS_KEY, updatedLocal);

  // 2. Intento de subida a Storage si hay Base64
  try {
    if (processedOrder.clientSignature?.startsWith('data:')) {
      processedOrder.clientSignature = await uploadFile(processedOrder.clientSignature, `signatures/${orderId}_client.png`);
    }
    if (processedOrder.techSignature?.startsWith('data:')) {
      processedOrder.techSignature = await uploadFile(processedOrder.techSignature, `signatures/${orderId}_tech.png`);
    }
    if (Array.isArray(processedOrder.images)) {
      const uploadPromises = processedOrder.images.map((img, idx) =>
        img.startsWith('data:') ? uploadFile(img, `photos/${orderId}_${idx}.jpg`) : Promise.resolve(img)
      );
      processedOrder.images = await Promise.all(uploadPromises);
    }
  } catch (e) { console.warn("Error en subida de archivos:", e); }

  // 3. Subida a Database
  try {
    const snakeOrder = mapToSnakeCase(processedOrder, 'work_orders');
    const { error } = await supabase.from('work_orders').upsert(snakeOrder);
    if (error) throw error;
    return await getWorkOrders();
  } catch (error) {
    console.error("Fallo guardado en nube:", error);
    return updatedLocal;
  }
};

export const deleteWorkOrder = async (id) => {
  try {
    await supabase.from('work_orders').delete().eq('id', id);
    const local = JSON.parse(localStorage.getItem(WORK_ORDERS_KEY) || '[]');
    const updated = local.filter(o => o.id !== id);
    safeSaveLocal(WORK_ORDERS_KEY, updated);
    return updated;
  } catch (error) {
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
    const { error } = await supabase.from('inventory').upsert(snakeItem);
    if (error) throw error;
    return await getInventory();
  } catch (error) {
    return JSON.parse(localStorage.getItem(INVENTORY_KEY) || '[]');
  }
};

// --- CONFIGURACIÓN ---

export const getAppSettings = async () => {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'global_settings').maybeSingle();
    if (error) throw error;
    if (data) {
      const camel = mapToCamelCase(data);
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(camel));
      return camel;
    }
    const local = localStorage.getItem(SETTINGS_LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  } catch (error) {
    const local = localStorage.getItem(SETTINGS_LOCAL_KEY);
    return local ? JSON.parse(local) : null;
  }
};

export const saveAppSettings = async (settings) => {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
    const snake = mapToSnakeCase({ ...settings, id: 'global_settings' }, 'settings');
    await supabase.from('settings').upsert(snake);
    return settings;
  } catch (error) {
    return settings;
  }
};

// --- CLIENTES ---

export const getClients = async () => {
  try {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) throw error;
    const items = data.map(mapToCamelCase);
    safeSaveLocal(CLIENTS_KEY, items);
    return items;
  } catch (error) {
    const localData = localStorage.getItem(CLIENTS_KEY);
    return localData ? JSON.parse(localData) : [];
  }
};

export const saveClient = async (client) => {
  try {
    const snake = mapToSnakeCase(client, 'clients');
    await supabase.from('clients').upsert(snake);
    return await getClients();
  } catch (error) {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  }
};

export const deleteClient = async (id) => {
  try {
    await supabase.from('clients').delete().eq('id', id);
    return await getClients();
  } catch (error) {
    return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
  }
};

export const restoreFullBackup = async (backupData) => {
  try {
    if (backupData.workOrders) {
      const snakeOrders = backupData.workOrders.map(o => mapToSnakeCase(o, 'work_orders'));
      await supabase.from('work_orders').upsert(snakeOrders);
    }
    if (backupData.inventory) {
      const snakeInv = backupData.inventory.map(i => mapToSnakeCase(i, 'inventory'));
      await supabase.from('inventory').upsert(snakeInv);
    }
    if (backupData.clients) {
      const snakeCli = backupData.clients.map(c => mapToSnakeCase(c, 'clients'));
      await supabase.from('clients').upsert(snakeCli);
    }
    if (backupData.settings) {
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(backupData.settings));
      const snakeSet = mapToSnakeCase({ ...backupData.settings, id: 'global_settings' }, 'settings');
      await supabase.from('settings').upsert(snakeSet);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
