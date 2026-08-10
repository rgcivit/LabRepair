import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const TERMS_AND_CONDITIONS = [
  "TÉRMINOS Y CONDICIONES",
  "1- PLAZOS DE ASISTENCIA TÉCNICA: La Empresa dará cumplimiento a la solicitud de servicio dentro de un plazo estimado de hasta 10 (diez) días hábiles a partir de la fecha de ingreso del equipo. Dicho lapso quedará sujeto a la disponibilidad de repuestos en el mercado y/o a la provisión de la información técnica del producto por parte del fabricante.",
  "2- RETIRO Y GUARDA: En caso de inexistencia de repuestos o por razones ajenas a la firma, se notificará al Cliente al momento de presupuestar. El equipo deberá ser retirado en un plazo máximo de 10 (diez) días hábiles posteriores a la fecha prevista de entrega. Vencido dicho término, La Empresa se deslindará de toda responsabilidad civil o penal por conceptos de robo, hurto, destrucción o daños que afecten al bien.",
  "3- GARANTÍA DEL SERVICIO: Las reparaciones cuentan con una garantía limitada de 90 (treinta) meses. En caso de sustitución de componentes de hardware, la garantía será única y exclusivamente la otorgada por el fabricante del repuesto.",
  "4- PAGO: Los equipos se entregan únicamente sin excepción efectiva del estado de disponibilidad del equipo (vía WhatsApp o llamada), e independientemente del resultado del diagnóstico, el bien quedará bajo el régimen de guarda, devengando un cargo diario de $1.000 (mil pesos). Dicho concepto se adicionará al costo técnico y deberá cancelarse al retirar el equipo. Transcurridos 90 días sin ser retirado, se configurará la condición de ABANDONO. Pasados los 120 días, el titular perderá todo derecho a reclamo o indemnización, conforme a lo establecido en los Artículos 2525 y 2526 del Código Civil y Comercial de la Nación.",
  "5- CONDICIONES DE ENTREGA: La restitución de los productos y/o equipos se efectuará únicamente contra la cancelación total de los importes facturados por diagnósticos, mano de obra, repuestos o guarda. restando el importe abonado en el momento de la entrega del equipo para su revisión y reparación.",
  "6- EXONERACIÓN DE RESPONSABILIDAD: La Empresa no asume responsabilidad alguna por la procedencia u origen de los bienes recibidos, recayendo la responsabilidad jurídica exclusivamente sobre el firmante de la orden. Asimismo, queda exenta de responder por la pérdida de los bienes ante casos fortuitos, fuerza mayor, siniestros o desastres naturales.",
  "7- LOGÍSTICA: Los costos inherentes a traslados, envíos y/o retiros correrán por cuenta, cargo y riesgo exclusivo del Cliente.",
  "8- CARGOS OPERATIVOS: Los servicios de diagnóstico, análisis de fallas, cotizaciones de componentes y gestión de fletes constituyen tareas con cargo, cuyo valor final quedará determinado en la orden de trabajo que al día de la fecha es de $20.000, quedando exceptuados únicamente los casos cubiertos por la garantía ."
];

/**
 * Función auxiliar para renderizar términos y condiciones en letra chica.
 */
const renderTermsAndConditions = (doc, startY) => {
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  let currentY = startY;

  // Si estamos muy abajo, agregar página
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  TERMS_AND_CONDITIONS.forEach((line, index) => {
    if (index === 0) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");

    const lines = doc.splitTextToSize(line, 180);

    // Verificar si las líneas caben en el resto de la página
    if (currentY + (lines.length * 3) > 280) {
      doc.addPage();
      currentY = 20;
    }

    doc.text(lines, 15, currentY);
    currentY += (lines.length * 3.5);
  });
  return currentY;
};

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
export const generateEntryReceipt = async (order, clientSignatureBase64, appLogo) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 40, 'F');

  // Logo
  const logoToUse = appLogo || settings.logo;
  if (logoToUse) {
    try {
      doc.addImage(logoToUse, 'JPEG', 170, 5, 25, 25);
    } catch (e) {
      console.error("Error al añadir logo al PDF de ingreso:", e);
    }
  }

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

  const finalY = doc.lastAutoTable.finalY + 12;
  renderTermsAndConditions(doc, finalY);

  const sigY = 255;
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
export const generateBudgetPDF = async (order, appLogo) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');

  // Logo
  const logoToUse = appLogo || settings.logo;
  if (logoToUse) {
    try {
      doc.addImage(logoToUse, 'JPEG', 170, 5, 25, 25);
    } catch (e) {
      console.error("Error al añadir logo al PDF de presupuesto:", e);
    }
  }

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
  doc.text(`TOTAL PRESUPUESTO: $${total.toLocaleString()}`, 130, doc.lastAutoTable.finalY + 12);

  renderTermsAndConditions(doc, doc.lastAutoTable.finalY + 22);

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
