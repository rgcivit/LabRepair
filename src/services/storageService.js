import { initialWorkOrders, initialInventory } from './mockData';

const WORK_ORDERS_KEY = 'labrepair_work_orders';
const INVENTORY_KEY = 'labrepair_inventory';

/**
 * Recupera las órdenes de trabajo desde localStorage.
 * Si no existen, inicializa con los datos de prueba y los guarda.
 * @returns {Array} Listado de órdenes de trabajo.
 */
export const getWorkOrders = () => {
  try {
    const data = localStorage.getItem(WORK_ORDERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Inicializar con datos simulados si no hay registros
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(initialWorkOrders));
    return initialWorkOrders;
  } catch (error) {
    console.error("Error al leer las órdenes de trabajo desde localStorage:", error);
    return initialWorkOrders;
  }
};

/**
 * Genera el próximo identificador correlativo de orden de trabajo (OT-004, OT-005, ...).
 * @param {Array} orders - Listado actual de órdenes.
 * @returns {string} Nuevo identificador.
 */
const buildNextOrderId = (orders) => {
  const nextIdNum = orders.reduce((max, o) => {
    const idNum = parseInt(String(o.id).replace('OT-', ''), 10);
    return !isNaN(idNum) && idNum > max ? idNum : max;
  }, 0) + 1;
  return `OT-${String(nextIdNum).padStart(3, '0')}`;
};

/**
 * Guarda una orden de trabajo: actualiza la existente o la agrega si su ID no está registrado.
 * @param {Object} workOrder - Orden de trabajo a guardar.
 * @returns {Array} Listado actualizado de órdenes de trabajo.
 */
export const saveWorkOrder = (workOrder) => {
  const orders = getWorkOrders();

  try {
    const existingIndex = workOrder.id
      ? orders.findIndex(order => order.id === workOrder.id)
      : -1;

    let updatedOrders;

    if (existingIndex > -1) {
      updatedOrders = orders.map(order =>
        order.id === workOrder.id ? { ...order, ...workOrder } : order
      );
    } else {
      const newOrder = {
        ...workOrder,
        id: workOrder.id || buildNextOrderId(orders),
        entryDate: workOrder.entryDate || new Date().toISOString().split('T')[0]
      };
      updatedOrders = [...orders, newOrder];
    }

    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updatedOrders));
    return updatedOrders;
  } catch (error) {
    console.error("Error al guardar la orden de trabajo en localStorage:", error);
    return orders;
  }
};

/**
 * Elimina definitivamente una orden de trabajo.
 * @param {string} orderId - Identificador de la orden a eliminar.
 * @returns {Array} Listado actualizado de órdenes de trabajo.
 */
export const deleteWorkOrder = (orderId) => {
  const orders = getWorkOrders();

  try {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updatedOrders));
    return updatedOrders;
  } catch (error) {
    console.error("Error al eliminar la orden de trabajo en localStorage:", error);
    return orders;
  }
};

/**
 * Recupera el inventario desde localStorage.
 * Si no existe, inicializa con los datos de prueba y los guarda.
 * @returns {Array} Listado de insumos/repuestos en inventario.
 */
export const getInventory = () => {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Inicializar con datos simulados si no hay registros
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(initialInventory));
    return initialInventory;
  } catch (error) {
    console.error("Error al leer el inventario desde localStorage:", error);
    return initialInventory;
  }
};

/**
 * Guarda o actualiza un ítem de inventario en localStorage.
 * @param {Object} item - Ítem de inventario a guardar.
 * @returns {Array} Listado actualizado del inventario.
 */
export const saveInventoryItem = (item) => {
  const inventory = getInventory();

  try {
    let updatedInventory;

    if (item.id) {
      // Actualizar ítem existente
      updatedInventory = inventory.map(invItem => 
        invItem.id === item.id ? { ...invItem, ...item } : invItem
      );
    } else {
      // Crear nuevo ítem con ID único incremental
      const nextIdNum = inventory.reduce((max, i) => {
        const idNum = parseInt(i.id.replace('INV-', ''), 10);
        return !isNaN(idNum) && idNum > max ? idNum : max;
      }, 0) + 1;

      const newId = `INV-${String(nextIdNum).padStart(3, '0')}`;
      const newItem = {
        ...item,
        id: newId
      };
      updatedInventory = [...inventory, newItem];
    }

    localStorage.setItem(INVENTORY_KEY, JSON.stringify(updatedInventory));
    return updatedInventory;
  } catch (error) {
    console.error("Error al guardar el ítem de inventario en localStorage:", error);
    return inventory;
  }
};
