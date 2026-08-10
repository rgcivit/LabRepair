import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * Función auxiliar para compartir un PDF en móviles o descargarlo en web.
 */
const saveOrSharePDF = async (doc, filename) => {
  const pdfOutput = doc.output('datauristring');
  const sanitizedFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = pdfOutput.split(',')[1];
      await Filesystem.writeFile({
        path: sanitizedFilename,
        data: base64Data,
        directory: Directory.Cache
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: sanitizedFilename
      });

      await Share.share({
        title: 'Enviar Documento',
        text: `Se adjunta documento: ${sanitizedFilename}`,
        url: fileUri.uri,
        dialogTitle: 'Compartir documento con el cliente'
      });
    } catch (error) {
      console.error('Error al compartir PDF:', error);
      doc.save(sanitizedFilename);
    }
  } else {
    doc.save(sanitizedFilename);
  }
};

/**
 * Carga configuraciones de localStorage de forma segura.
 */
const loadSettings = () => {
  let settings = {
    companyName: 'LABORATORIO DE REPARACIÓN Y CALIBRACIÓN',
    companyCuit: 'CUIT: 30-71628312-9',
    companyAddress: 'Av. Juan de Garay 1420, CABA',
    companyPhone: '+54 11 5110-2200',
    companyEmail: 'calibracion@labrepair.com',
    pdfFooter: 'SISTEMA DE GESTIÓN DE CALIDAD - CERTIFICACIÓN OPERACIONAL',
    technicianName: 'Ing. Responsable de Calibración',
    licenseNumber: 'Reg. Nac. Ing. Clínica Nro. 78241',
  };
  try {
    const saved = localStorage.getItem('estetica_lab_settings');
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Error al cargar configuraciones dinámicas:", e);
  }
  return settings;
};

/**
 * Genera el Certificado de Control de Calidad (QC).
 */
export const generateQCCertificate = (order) => {
  if (!order) return;

  const settings = loadSettings();
  const doc = new jsPDF();
  const bench = order.benchTest || {};

  const colorPrimary = [30, 41, 59];
  const colorSecondary = [6, 182, 212];
  const colorText = [51, 65, 85];

  doc.setFillColor(...colorPrimary);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(...colorSecondary);
  doc.rect(0, 38, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(settings.companyName.toUpperCase(), 15, 16);
  
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("SISTEMA DE GESTIÓN DE CALIDAD - CERTIFICACIÓN OPERACIONAL DE HARDWARE", 15, 23);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorSecondary);
  doc.setFontSize(10.5);
  doc.text("CERTIFICADO DE CONTROL DE CALIDAD Y CALIBRACIÓN (QC OK)", 15, 31);

  if (settings.logo) {
    try { doc.addImage(settings.logo, 'PNG', 165, 6, 30, 16); } catch (e) {}
  }

  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORMACIÓN DE LA ORDEN Y APARATOLOGÍA", 15, 52);
  doc.line(15, 55, 195, 55);

  const data = [
    ["OT ID:", order.id, "Fecha:", new Date().toLocaleDateString('es-AR')],
    ["Cliente:", order.clientName, "Equipo:", order.equipmentType || order.deviceType],
    ["Marca/Mod:", `${order.brand || ""} ${order.model || ""}`.trim() || order.brandModel, "S/N:", order.serialNumber]
  ];

  doc.autoTable({
    startY: 58,
    body: data,
    theme: 'plain',
    styles: { fontSize: 8.5 }
  });

  const tableColumns = ["Parámetro Crítico Ensayado", "Medición de Laboratorio", "Unidad", "Estado Tolerancia"];
  const tableRows = [
    ["Flujo de Líquido Refrigerante", bench.coolantFlow || "N/D", "L/min", "Óptimo"],
    ["Temperatura Cabezal/Celdas", bench.peltierTemp || "N/D", "°C", "Estable"],
    ["Presión de Vacío / Succión", bench.vacuumPressure || "N/D", "bar", "Nominal"],
    ["Tensión de Red / Fuentes", `${bench.voltageNet || "220"}V / ${bench.voltageHV || "24"}V`, "V", "Regulado"],
    ["Resultado Operacional", order.qcPassed ? "APROBADO (QC OK)" : "CON OBSERVACIONES", "Resultado", "APTO"]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: colorPrimary },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.text("INFORME DE PROCEDIMIENTO Y CAUSA RAÍZ", 15, finalY);
  doc.line(15, finalY + 2, 195, finalY + 2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(order.diagnosis || "Sin observaciones adicionales.", 180), 15, finalY + 8);

  const sigY = 245;
  doc.line(30, sigY, 85, sigY);
  doc.line(125, sigY, 180, sigY);
  doc.text(settings.technicianName, 40, sigY + 5);
  doc.text("Firma Autorizada y Sello", 135, sigY + 5);

  if (settings.signature) {
    try { doc.addImage(settings.signature, 'PNG', 40, sigY - 20, 30, 15); } catch (e) {}
  }

  saveOrSharePDF(doc, `${order.id}_Certificado_QC.pdf`);
};

/**
 * Genera el comprobante de ingreso (recepción) con firma del cliente.
 */
export const generateEntryReceipt = async (order, clientSignatureBase64) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212);
  doc.text("COMPROBANTE DE RECEPCIÓN TÉCNICA E INGRESO A LABORATORIO", 15, 25);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text("DETALLE DE RECEPCIÓN", 15, 50);
  doc.line(15, 52, 195, 52);

  const data = [
    ["OT ID:", order.id],
    ["Fecha de Ingreso:", order.entryDate],
    ["Cliente:", order.clientName],
    ["Teléfono:", order.clientPhone],
    ["Equipo:", order.deviceType],
    ["Marca/Modelo:", order.brandModel],
    ["Nro Serie:", order.serialNumber],
    ["Falla Reportada:", order.issueDescription],
    ["Accesorios:", order.accessories?.join(", ") || "Ninguno"]
  ];

  doc.autoTable({
    startY: 55,
    body: data,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
  });

  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const terms = "El cliente declara que el equipo se entrega con los accesorios detallados. El laboratorio no se responsabiliza por pérdida de datos. Todo equipo reparado y no retirado a los 30 días se considera abandonado.";
  doc.text(doc.splitTextToSize(terms, 180), 15, finalY);

  const sigY = finalY + 40;
  doc.line(30, sigY, 85, sigY);
  doc.line(125, sigY, 180, sigY);
  doc.text("Firma del Cliente", 45, sigY + 5);
  doc.text("Recibido por LabRepair", 135, sigY + 5);

  if (clientSignatureBase64) {
    try { doc.addImage(clientSignatureBase64, 'PNG', 35, sigY - 25, 40, 20); } catch (e) {}
  }

  saveOrSharePDF(doc, `Comprobante_Ingreso_${order.id}.pdf`);
};

/**
 * Genera el PDF del presupuesto para compartir.
 */
export const generateBudgetPDF = async (order) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PRESUPUESTO DE SERVICIO TÉCNICO", 15, 20);
  doc.setFontSize(9);
  doc.text(`OT: ${order.id} | EQUIPO: ${order.deviceType} ${order.brandModel}`, 15, 28);

  doc.setTextColor(30, 41, 59);
  doc.text(`Cliente: ${order.clientName}`, 15, 45);
  doc.text(`Diagnóstico Técnico:`, 15, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(doc.splitTextToSize(order.diagnosis || "Control y calibración general.", 180), 15, 57);

  const items = order.sparePartsAssigned?.map(p => [p.name, p.qty, `$${p.price.toLocaleString()}`, `$${(p.qty * p.price).toLocaleString()}`]) || [];
  items.push(["Mano de Obra / Ingeniería", "1", `$${(order.laborCost || 0).toLocaleString()}`, `$${(order.laborCost || 0).toLocaleString()}`]);

  doc.autoTable({
    startY: 65,
    head: [["Descripción", "Cant.", "P.Unit", "Subtotal"]],
    body: items,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] }
  });

  const total = (order.sparePartsAssigned?.reduce((acc, p) => acc + (p.qty * p.price), 0) || 0) + (order.laborCost || 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL PRESUPUESTO: $${total.toLocaleString()}`, 130, doc.lastAutoTable.finalY + 15);

  saveOrSharePDF(doc, `Presupuesto_${order.id}.pdf`);
};

export const exportInventoryToPDF = (inventory) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(9);
  doc.text("INFORME DE INVENTARIO GENERAL Y CONTROL DE STOCK", 15, 25);

  const columns = ["ID", "Repuesto / Insumo", "Categoría", "Stock", "Precio"];
  const rows = inventory.map(item => [item.id, item.name, item.category || "GENERAL", item.stock, `$ ${item.price}`]);

  doc.autoTable({
    startY: 45,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] }
  });

  saveOrSharePDF(doc, "Inventario_LabRepair.pdf");
};

export const exportWorkOrdersToPDF = (orders) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(9);
  doc.text("REPORTE HISTÓRICO Y LOGÍSTICA DE ÓRDENES DE TRABAJO (OT)", 15, 25);

  const columns = ["OT ID", "Equipo", "Cliente", "Ingreso", "Estado"];
  const rows = orders.map(order => [
    order.id,
    `${order.deviceType || order.equipmentName} (${order.brandModel || order.brand})`,
    order.clientName,
    order.entryDate,
    order.status
  ]);

  doc.autoTable({
    startY: 45,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 }
  });

  saveOrSharePDF(doc, "Reporte_Ordenes_LabRepair.pdf");
};

export const exportSerialHistoryToPDF = (serialNumber, history) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(`HISTORIAL TÉCNICO - S/N: ${serialNumber}`, 15, 20);

  const columns = ["OT ID", "Fecha", "Falla Reportada", "Estado", "Diagnóstico"];
  const rows = history.map(order => [
    order.id,
    order.entryDate,
    order.reportedFailure || order.issueDescription || "N/D",
    order.status,
    order.benchTest?.observations || "N/D"
  ]);

  doc.autoTable({
    startY: 40,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 7.5 }
  });

  saveOrSharePDF(doc, `Historial_${serialNumber}.pdf`);
};
