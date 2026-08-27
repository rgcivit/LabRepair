import { supabase } from './supabaseClient';
import { compressImage } from './imageUtils';

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
  "status", "entry_date", "delivery_date", "accessories", "images", "repair_images", "spare_parts",
  "diagnosis", "labor_cost", "client_signature", "tech_signature",
  "budget_details", "budget_status", "qc_passed", "bench_test", "internal_notes"
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

export const mapToCamelCase = (obj) => {
  if (!obj) return {};
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
          repairImages: [],
          repair_images: [],
          client_signature: null,
          tech_signature: null
        }));
        localStorage.setItem(key, JSON.stringify(lightData));
    }
  }
};

/**
 * Sube un archivo Base64 a Supabase Storage (Optimizado para Velocidad)
 */
export const uploadFile = async (base64, path) => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const parts = base64.split(',');
    const base64Data = parts[1];
    const contentType = parts[0].split(';')[0].split(':')[1];

    // Optimización: Conversión directa de Base64 a Blob (mucho más rápido que loops manuales)
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: contentType });

    const { data, error } = await supabase.storage
      .from('labrepair-assets')
      .upload(path, blob, { upsert: true, cacheControl: '3600' });

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('labrepair-assets').getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.error("Error subiendo archivo:", err);
    return base64;
  }
};

// --- ÓRDENES DE TRABAJO ---

export const getWorkOrders = async () => {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Fallo lectura de nube, usando respaldo de memoria local.");
      const localData = localStorage.getItem(WORK_ORDERS_KEY);
      return localData ? JSON.parse(localData) : [];
    }

    const cloudOrders = data.map(mapToCamelCase);

    // LA NUBE ES LA VERDAD: Actualizamos el LocalStorage con lo que hay en internet
    safeSaveLocal(WORK_ORDERS_KEY, cloudOrders);
    return cloudOrders;
  } catch (error) {
    console.error("Error crítico de acceso a datos:", error);
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
      const compressed = await compressImage(processedOrder.clientSignature, 400, 0.6); // Firmas más pequeñas
      processedOrder.clientSignature = await uploadFile(compressed, `signatures/${orderId}_client.png`);
    }
    if (processedOrder.techSignature?.startsWith('data:')) {
      const compressed = await compressImage(processedOrder.techSignature, 400, 0.6);
      processedOrder.techSignature = await uploadFile(compressed, `signatures/${orderId}_tech.png`);
    }
    if (Array.isArray(processedOrder.images)) {
      const uploadPromises = processedOrder.images.map(async (img, idx) => {
        if (img.startsWith('data:')) {
          const compressed = await compressImage(img, 1024, 0.7);
          return await uploadFile(compressed, `photos/${orderId}_in_${idx}.jpg`);
        }
        return img;
      });
      processedOrder.images = await Promise.all(uploadPromises);
    }

    if (Array.isArray(processedOrder.repairImages)) {
      const uploadPromises = processedOrder.repairImages.map(async (img, idx) => {
        if (img.startsWith('data:')) {
          const compressed = await compressImage(img, 1024, 0.7);
          return await uploadFile(compressed, `photos/${orderId}_rep_${idx}.jpg`);
        }
        return img;
      });
      processedOrder.repairImages = await Promise.all(uploadPromises);
    }
  } catch (e) { console.warn("Error en subida de archivos:", e); }

  // 3. Subida a Database
  try {
    const snakeOrder = mapToSnakeCase(processedOrder, 'work_orders');
    const { error } = await supabase.from('work_orders').upsert(snakeOrder);

    if (error) {
      console.error("Error de Supabase al guardar:", error);
      throw error;
    }

    // Devolvemos la lista fresca de la nube
    return await getWorkOrders();
  } catch (error) {
    console.error("Fallo guardado en nube, manteniendo copia local:", error);
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
    const itemId = item.id || `INS-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanItem = { ...item, id: itemId };

    const snakeItem = mapToSnakeCase(cleanItem, 'inventory');
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
        updated = [{ ...item, id: itemId }, ...localData];
    }
    safeSaveLocal(INVENTORY_KEY, updated);
    return updated;
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
    // Generar un ID si no lo tiene para que upsert funcione como insert/update
    const clientId = client.id || crypto.randomUUID();
    const cleanClient = { ...client, id: clientId };

    const snake = mapToSnakeCase(cleanClient, 'clients');
    const { error } = await supabase.from('clients').upsert(snake);

    if (error) throw error;
    return await getClients();
  } catch (error) {
    console.error("Error al guardar cliente:", error);
    const localData = JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]');
    const clientId = client.id || Date.now().toString();
    const index = localData.findIndex(c => c.id === clientId);
    let updated;
    if (index >= 0) {
      updated = localData.map(c => c.id === clientId ? { ...c, ...client } : c);
    } else {
      updated = [{ ...client, id: clientId }, ...localData];
    }
    safeSaveLocal(CLIENTS_KEY, updated);
    return updated;
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
