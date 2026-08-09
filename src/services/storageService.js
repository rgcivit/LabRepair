const WORK_ORDERS_KEY = "labrepair_work_orders";
const INVENTORY_KEY = "labrepair_inventory";

export const getWorkOrders = () => {
  try {
    const data = localStorage.getItem(WORK_ORDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error al leer órdenes:", error);
    return [];
  }
};

export const saveWorkOrder = (workOrder) => {
  const orders = getWorkOrders();
  const index = orders.findIndex(o => o.id === workOrder.id);
  
  let updatedOrders;
  if (index >= 0) {
    updatedOrders = orders.map(o => o.id === workOrder.id ? { ...o, ...workOrder } : o);
  } else {
    const newOrder = workOrder.id ? workOrder : { ...workOrder, id: `OT-${Date.now()}` };
    updatedOrders = [...orders, newOrder];
  }
  
  localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updatedOrders));
  return updatedOrders;
};

export const deleteWorkOrder = (id) => {
  const orders = getWorkOrders();
  const updated = orders.filter(o => o.id !== id);
  localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updated));
  return updated;
};

export const getInventory = () => {
  try {
    const data = localStorage.getItem(INVENTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error al leer inventario:", error);
    return [];
  }
};

export const saveInventoryItem = (item) => {
  const inventory = getInventory();
  const index = inventory.findIndex(i => i.id === item.id);
  let updated;
  if (index >= 0) {
    updated = inventory.map(i => i.id === item.id ? { ...i, ...item } : i);
  } else {
    const newItem = item.id ? item : { ...item, id: `INV-${Date.now()}` };
    updated = [...inventory, newItem];
  }
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(updated));
  return updated;
};

export const deleteInventoryItem = (id) => {
  const inventory = getInventory();
  const updated = inventory.filter(i => i.id !== id);
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(updated));
  return updated;
};
