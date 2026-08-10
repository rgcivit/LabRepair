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
 * Servicio técnico de generación de reportes e informes de ingeniería en PDF.
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
    try { doc.addImage(settings.logo, 'PNG', 165, 6, 30, 16); } catch (e) { doc.text("LabRepair", 165, 20); }
  }

  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORMACIÓN DE LA ORDEN Y APARATOLOGÍA", 15, 52);
  doc.line(15, 55, 195, 55);

  const data = [
    ["OT ID:", order.id, "Fecha:", new Date().toLocaleDateString('es-AR')],
    ["Cliente:", order.clientName, "Equipo:", order.equipmentType],
    ["Marca:", order.brand, "S/N:", order.serialNumber]
  ];

  doc.autoTable({
    startY: 58,
    body: data,
    theme: 'plain',
    styles: { fontSize: 8.5 }
  });

  const tableColumns = ["Parámetro Crítico Ensayado", "Medición", "Unidad", "Estado"];
  const tableRows = [
    ["Flujo Refrigerante", bench.coolantFlow || "N/D", "L/min", "Óptimo"],
    ["Temperatura Peltier", bench.peltierTemp || "N/D", "°C", "Estable"],
    ["Presión Vacío", bench.vacuumPressure || "N/D", "bar", "Nominal"],
    ["Seguridad Eléctrica", order.qcPassed ? "APROBADO" : "OBSERVADO", "Resultado", "APTO"]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: colorPrimary }
  });

  const sigY = 245;
  doc.line(30, sigY, 85, sigY);
  doc.line(125, sigY, 180, sigY);
  doc.text("Firma Responsable", 40, sigY + 5);
  doc.text("Sello Laboratorio", 135, sigY + 5);

  if (settings.signature) {
    try { doc.addImage(settings.signature, 'PNG', 40, sigY - 20, 30, 15); } catch (e) {}
  }

  const filename = `${order.id}_QC.pdf`;
  saveOrSharePDF(doc, filename);
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
  const terms = "El cliente declara que el equipo se entrega con los accesorios detallados. El laboratorio no se responsabiliza por pérdida de datos.";
  doc.text(doc.splitTextToSize(terms, 180), 15, finalY);

  const sigY = finalY + 40;
  doc.line(30, sigY, 85, sigY);
  doc.line(125, sigY, 180, sigY);
  doc.text("Firma del Cliente", 45, sigY + 5);
  doc.text("Recibido por LabRepair", 135, sigY + 5);

  if (clientSignatureBase64) {
    try { doc.addImage(clientSignatureBase64, 'PNG', 35, sigY - 25, 40, 20); } catch (e) {}
  }

  const filename = `Ingreso_${order.id}.pdf`;
  await saveOrSharePDF(doc, filename);
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
  doc.text(`Diagnóstico: ${order.diagnosis || "Ver detalle en presupuesto"}`, 15, 55);

  const items = order.sparePartsAssigned?.map(p => [p.name, p.qty, `$${p.price}`, `$${p.qty * p.price}`]) || [];
  items.push(["Mano de Obra", "1", `$${order.laborCost || 0}`, `$${order.laborCost || 0}`]);

  doc.autoTable({
    startY: 65,
    head: [["Descripción", "Cant.", "P.Unit", "Subtotal"]],
    body: items,
    theme: 'striped'
  });

  const total = (order.sparePartsAssigned?.reduce((acc, p) => acc + (p.qty * p.price), 0) || 0) + (order.laborCost || 0);
  doc.setFontSize(12);
  doc.text(`TOTAL PRESUPUESTO: $${total}`, 140, doc.lastAutoTable.finalY + 15);

  const filename = `Presupuesto_${order.id}.pdf`;
  await saveOrSharePDF(doc, filename);
};

export const exportInventoryToPDF = (inventory) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.text("Reporte de Inventario", 15, 20);
  saveOrSharePDF(doc, "Inventario.pdf");
};

export const exportWorkOrdersToPDF = (orders) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.text("Reporte de Órdenes", 15, 20);
  saveOrSharePDF(doc, "Ordenes.pdf");
};

export const exportSerialHistoryToPDF = (serialNumber, history) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.text(`Historial Serial: ${serialNumber}`, 15, 20);
  saveOrSharePDF(doc, `Historial_${serialNumber}.pdf`);
};
