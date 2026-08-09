
const fs = require("fs");

let storagePath = "src/services/storageService.js";
if (fs.existsSync(storagePath)) {
  let content = fs.readFileSync(storagePath, "utf8");
  let fixedSave = `export const saveWorkOrder = (workOrder) => {
  const orders = getWorkOrders();
  const index = orders.findIndex(o => o.id === workOrder.id);
  let updatedOrders;
  if (index >= 0) {
    updatedOrders = orders.map(o => o.id === workOrder.id ? { ...o, ...workOrder } : o);
  } else {
    const newOrder = workOrder.id ? workOrder : { ...workOrder, id: "OT-" + Date.now() };
    updatedOrders = [...orders, newOrder];
  }
  localStorage.setItem(WORK_ORDERS_KEY, JSON.stringify(updatedOrders));
  return updatedOrders;
};`;
  content = content.replace(/export const saveWorkOrder = [\s\S]*?\n\};/, fixedSave);
  fs.writeFileSync(storagePath, content, "utf8");
  console.log("? storageService.js corregido.");
}

let pdfPath = "src/services/pdfService.js";
if (fs.existsSync(pdfPath)) {
  let content = fs.readFileSync(pdfPath, "utf8");
  content = content.replace(/p\.qty/g, "p.quantity");
  fs.writeFileSync(pdfPath, content, "utf8");
  console.log("? pdfService.js corregido.");
}

