import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const TERMS_AND_CONDITIONS = [
  "TÉRMINOS Y CONDICIONES",
  "1- PLAZOS DE ASISTENCIA TÉCNICA: La Empresa dará cumplimiento a la solicitud de servicio dentro de un plazo estimado de hasta 10 (diez) días hábiles a partir de la fecha de ingreso del equipo. Dicho lapso quedará sujeto a la disponibilidad de repuestos en el mercado y/o a la provisión de la información técnica del producto por parte del fabricante.",
  "2- RETIRO Y GUARDA: En caso de inexistencia de repuestos o por razones ajenas a la firma, se notificará al Cliente al momento de presupuestar. El equipo deberá ser retirado en un plazo máximo de 10 (diez) días hábiles posteriores a la fecha prevista de entrega. Vencido dicho término, La Empresa se deslindará de toda responsabilidad civil o penal por conceptos de robo, hurto, destrucción o daños que afecten al bien.",
  "3- GARANTÍA DEL SERVICIO: Las reparaciones cuentan con una garantía limitada de 90 (noventa) días. En caso de sustitución de componentes de hardware, la garantía será única y exclusivamente la otorgada por el fabricante del repuesto.",
  "4- PAGO Y ABANDONO: Los equipos se entregan únicamente contra cancelación total de los importes. Tras la notificación de disponibilidad, el bien quedará bajo el régimen de guarda, devengando un cargo diario de $1.000 (mil pesos). Transcurridos 90 días sin ser retirado, se configurará la condición de ABANDONO (Art. 2525 y 2526 CCyCN).",
  "5- CONDICIONES DE ENTREGA: La restitución de los productos y/o equipos se efectuará únicamente contra la cancelación total de los importes facturados por diagnósticos, mano de obra, repuestos o guarda, restando el importe abonado al momento de la entrega inicial.",
  "6- EXONERACIÓN DE RESPONSABILIDAD: La Empresa no asume responsabilidad alguna por la procedencia u origen de los bienes recibidos. Asimismo, queda exenta de responder por la pérdida de los bienes ante casos fortuitos, fuerza mayor, siniestros o desastres naturales.",
  "7- LOGÍSTICA: Los costos inherentes a traslados, envíos y/o retiros correrán por cuenta, cargo y riesgo exclusivo del Cliente.",
  "8- CARGOS OPERATIVOS: Los servicios de diagnóstico, análisis de fallas y cotización constituyen tareas con cargo, cuyo valor actual es de $20.000, exceptuando casos cubiertos por garantía vigente."
];

const loadSettings = () => {
  let settings = {
    companyName: 'INGENIERÍA BIOMÉDICA - LABORATORIO DE REPARACIÓN Y CALIBRACIÓN',
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
    if (saved) settings = { ...settings, ...JSON.parse(saved) };
  } catch (e) {}
  return settings;
};

const renderTermsAndConditions = (doc, startY) => {
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  let currentY = startY;

  if (currentY > 210) { doc.addPage(); currentY = 20; }

  doc.setFont("helvetica", "bold");
  doc.text(TERMS_AND_CONDITIONS[0], 15, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);

  TERMS_AND_CONDITIONS.slice(1).forEach((line) => {
    const lines = doc.splitTextToSize(line, 180);
    if (currentY + (lines.length * 3) > 285) { doc.addPage(); currentY = 20; }
    doc.text(lines, 15, currentY);
    currentY += (lines.length * 2.8) + 1;
  });
  return currentY;
};

const saveOrSharePDF = async (doc, filename) => {
  const pdfOutput = doc.output('datauristring');
  const sanitizedFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = pdfOutput.split(',')[1];
      await Filesystem.writeFile({ path: sanitizedFilename, data: base64Data, directory: Directory.Cache });
      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: sanitizedFilename });
      await Share.share({ title: 'Documento LabRepair', text: `Se adjunta ${sanitizedFilename}`, url: fileUri.uri, dialogTitle: 'Compartir' });
    } catch (error) { doc.save(sanitizedFilename); }
  } else { doc.save(sanitizedFilename); }
};

/**
 * COMPROBANTE DE RECEPCIÓN INDIVIDUAL (Completo)
 */
export const generateEntryReceipt = async (order, clientSignatureBase64, appLogo) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  // 1. Header Industrial
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  const logoToUse = appLogo || settings.logo;
  if (logoToUse) { try { doc.addImage(logoToUse, 'JPEG', 165, 5, 30, 30); } catch (e) {} }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("COMPROBANTE DE RECEPCIÓN TÉCNICA E INGRESO A LABORATORIO", 15, 25);
  doc.text(`ORDEN DE TRABAJO: #${order.id} | FECHA: ${order.entryDate}`, 15, 32);

  // 2. Bloques de Datos
  doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE Y EQUIPO", 15, 50); doc.line(15, 52, 195, 52);

  const mainTable = [
    ["Cliente / Clínica:", order.clientName, "Contacto:", order.clientPhone || "N/D"],
    ["Aparatología:", order.deviceType, "Marca/Mod:", order.brandModel],
    ["Nro. Serie (S/N):", order.serialNumber || "S/D", "Prioridad:", order.priority || "MEDIA"]
  ];

  doc.autoTable({
    startY: 55, body: mainTable, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 35 }, 2: { fontStyle: 'bold', width: 25 } }
  });

  // 3. Falla y Observaciones
  let currentY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold"); doc.text("FALLA REPORTADA / OBSERVACIONES:", 15, currentY);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const desc = order.issueDescription || "Sin descripción técnica adicional.";
  const splitDesc = doc.splitTextToSize(desc, 180);
  doc.text(splitDesc, 15, currentY + 6);
  currentY += 12 + (splitDesc.length * 4.5);

  // 4. Accesorios e Insumos
  doc.setFont("helvetica", "bold"); doc.text("ACCESORIOS INCLUIDOS:", 15, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(order.accessories?.join(", ") || "Ninguno detallado.", 15, currentY + 6);
  currentY += 15;

  // 5. Galería de Fotos (Letra Chica / Miniaturas)
  if (Array.isArray(order.images) && order.images.length > 0) {
      doc.setFont("helvetica", "bold"); doc.text("FOTOS DE INSPECCIÓN VISUAL:", 15, currentY);
      let photoX = 15;
      order.images.forEach((img) => {
          try { doc.addImage(img, 'JPEG', photoX, currentY + 4, 30, 30); photoX += 35; } catch(e){}
      });
      currentY += 40;
  }

  // 6. Términos y Condiciones
  currentY = renderTermsAndConditions(doc, currentY + 5);

  // 7. Firmas
  const sigY = 265;
  doc.setDrawColor(148, 163, 184);
  doc.line(30, sigY, 85, sigY); doc.line(125, sigY, 180, sigY);
  doc.setFontSize(8); doc.setTextColor(51, 65, 85);
  doc.text("Firma del Cliente", 45, sigY + 5);
  doc.text("Responsable LabRepair", 138, sigY + 5);

  if (clientSignatureBase64 || order.clientSignature) {
      try { doc.addImage(clientSignatureBase64 || order.clientSignature, 'PNG', 35, sigY - 22, 40, 18); } catch(e){}
  }
  if (order.techSignature) {
      try { doc.addImage(order.techSignature, 'PNG', 130, sigY - 22, 40, 18); } catch(e){}
  }

  const sanitizedClient = (order.clientName || "Cliente").replace(/\s+/g, '_');
  await saveOrSharePDF(doc, `Comprobante_Ingreso_${order.id}_${sanitizedClient}.pdf`);
};

/**
 * PRESUPUESTO TÉCNICO (Individual)
 */
export const generateBudgetPDF = async (order, appLogo) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 35, 'F');
  if (appLogo) { try { doc.addImage(appLogo, 'JPEG', 165, 5, 25, 25); } catch (e) {} }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("PRESUPUESTO DE SERVICIO TÉCNICO", 15, 20);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`COTIZACIÓN PARA OT: #${order.id} | EQUIPO: ${order.deviceType} ${order.brandModel}`, 15, 28);

  doc.setTextColor(30, 41, 59); doc.setFontSize(10);
  doc.text(`CLIENTE: ${order.clientName}`, 15, 45);

  doc.setFont("helvetica", "bold"); doc.text("DIAGNÓSTICO TÉCNICO DE INGENIERÍA:", 15, 52);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const diag = order.diagnosis || "Mantenimiento preventivo y calibración general.";
  const splitDiag = doc.splitTextToSize(diag, 180);
  doc.text(splitDiag, 15, 57);

  const budgetItems = order.sparePartsAssigned?.map(p => [p.name, p.qty, `$${p.price.toLocaleString()}`, `$${(p.qty * p.price).toLocaleString()}`]) || [];
  budgetItems.push(["Mano de Obra / Horas de Ingeniería", "1", `$${(order.laborCost || 0).toLocaleString()}`, `$${(order.laborCost || 0).toLocaleString()}`]);

  doc.autoTable({
    startY: 65 + (splitDiag.length * 5),
    head: [["Descripción de Tareas / Repuestos", "Cant.", "P.Unit", "Subtotal"]],
    body: budgetItems,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] }
  });

  const total = (order.sparePartsAssigned?.reduce((acc, p) => acc + (p.qty * p.price), 0) || 0) + (order.laborCost || 0);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(`TOTAL FINAL NETO: $${total.toLocaleString()}`, 130, doc.lastAutoTable.finalY + 15);

  renderTermsAndConditions(doc, doc.lastAutoTable.finalY + 25);

  const sanitizedClient = (order.clientName || "Cliente").replace(/\s+/g, '_');
  await saveOrSharePDF(doc, `Presupuesto_${order.id}_${sanitizedClient}.pdf`);
};

export const exportWorkOrdersToPDF = (orders) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  if (settings.logo) { try { doc.addImage(settings.logo, 'PNG', 175, 8, 20, 20); } catch (e) {} }
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.text("REPORTE GENERAL DE TALLER", 15, 18);
  const rows = orders.map(o => [o.id, `${o.deviceType}`, o.clientName, o.entryDate, o.status]);
  doc.autoTable({ startY: 45, head: [["ID", "Equipo", "Cliente", "Fecha", "Estado"]], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  saveOrSharePDF(doc, "Reporte_General_LabRepair.pdf");
};

export const exportInventoryToPDF = (inventory) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255); doc.text("REPORTE DE STOCK", 15, 18);
  const rows = inventory.map(item => [item.id, item.name, item.stock, `$${item.price}`]);
  doc.autoTable({ startY: 45, head: [["ID", "Insumo", "Stock", "Precio"]], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  saveOrSharePDF(doc, "Inventario_LabRepair.pdf");
};

export const exportSerialHistoryToPDF = (serialNumber, history) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`HISTORIAL TÉCNICO S/N: ${serialNumber}`, 15, 25);
  const rows = history.map(o => [o.id, o.entryDate, o.reportedFailure || o.issueDescription || "N/D", o.status]);
  doc.autoTable({ startY: 40, head: [["ID", "Fecha", "Falla", "Estado"]], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  saveOrSharePDF(doc, `Historial_${serialNumber}.pdf`);
};

export const generateQCCertificate = (order) => {
  if (!order) return;
  const settings = loadSettings();
  const doc = new jsPDF();
  const bench = order.benchTest || {};
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(6, 182, 212); doc.rect(0, 38, 210, 2, 'F');
  if (settings.logo) { try { doc.addImage(settings.logo, 'PNG', 165, 6, 30, 16); } catch (e) {} }
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 16);
  doc.setFontSize(10.5); doc.text("CERTIFICADO DE CONTROL DE CALIDAD (QC OK)", 15, 31);
  const data = [["OT ID:", order.id, "Fecha:", new Date().toLocaleDateString('es-AR')], ["Cliente:", order.clientName, "Equipo:", order.equipmentType || order.deviceType], ["Marca/Mod:", `${order.brand || ""} ${order.model || ""}`.trim() || order.brandModel, "S/N:", order.serialNumber]];
  doc.autoTable({ startY: 58, body: data, theme: 'plain', styles: { fontSize: 8.5 } });
  const qcRows = [["Flujo Refrigerante", bench.coolantFlow || "N/D", "L/min", "Óptimo"], ["Temperatura Cabezal", bench.peltierTemp || "N/D", "°C", "Estable"], ["Presión Vacío", bench.vacuumPressure || "N/D", "bar", "Nominal"], ["Seguridad Eléctrica", order.qcPassed ? "APROBADO" : "OBSERVADO", "Resultado", "APTO"]];
  doc.autoTable({ startY: doc.lastAutoTable.finalY + 10, head: [["Parámetro", "Medición", "Unidad", "Estado"]], body: qcRows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  renderTermsAndConditions(doc, doc.lastAutoTable.finalY + 15);
  const sigY = 265; doc.line(30, sigY, 85, sigY); doc.line(125, sigY, 180, sigY);
  doc.text(settings.technicianName, 40, sigY + 5); doc.text("Firma y Sello Lab", 135, sigY + 5);
  saveOrSharePDF(doc, `${order.id}_Certificado_QC.pdf`);
};
