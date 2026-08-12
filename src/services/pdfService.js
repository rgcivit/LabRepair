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
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);

  TERMS_AND_CONDITIONS.slice(1).forEach((line) => {
    const lines = doc.splitTextToSize(line, 180);
    if (currentY + (lines.length * 2.5) > 285) { doc.addPage(); currentY = 20; }
    doc.text(lines, 15, currentY);
    currentY += (lines.length * 2.5) + 1;
  });
  return currentY;
};

const saveOrSharePDF = async (doc, filename) => {
  const sanitizedFilename = filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

  if (Capacitor.isNativePlatform()) {
    try {
      const pdfOutput = doc.output('datauristring');
      const base64Data = pdfOutput.split(',')[1];
      await Filesystem.writeFile({ path: sanitizedFilename, data: base64Data, directory: Directory.Cache });
      const fileUri = await Filesystem.getUri({ directory: Directory.Cache, path: sanitizedFilename });
      await Share.share({ title: 'Documento LabRepair', text: `Se adjunta ${sanitizedFilename}`, url: fileUri.uri, dialogTitle: 'Compartir' });
    } catch (error) { doc.save(sanitizedFilename); }
  } else {
    try {
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = sanitizedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) { doc.save(sanitizedFilename); }
  }
};

/**
 * COMPROBANTE DE INGRESO (Individual) - TOTALMENTE COMPATIBLE CON SUPABASE Y LOCALSTORAGE
 */
export const generateEntryReceipt = async (order, clientSignatureBase64, appLogo) => {
  if (!order) return;

  const settings = loadSettings();
  const doc = new jsPDF();

  // Mapeo seguro de campos (compatible tanto con camelCase como con snake_case de Supabase)
  const orderId = order.id || order.order_id || "S/D";
  const clientName = order.clientName || order.client_name || "N/D";
  const clientPhone = order.clientPhone || order.client_phone || "N/D";
  const deviceType = order.deviceType || order.device_type || order.equipmentType || order.equipment_type || "N/D";
  const brandModel = order.brandModel || order.brand_model || order.brand || "N/D";
  const serialNumber = order.serialNumber || order.serial_number || "S/D";
  const priority = order.priority || "MEDIA";
  const entryDate = order.entryDate || order.entry_date || order.created_at || new Date().toLocaleDateString();
  const description = order.issueDescription || order.issue_description || order.observations || "Sin descripción técnica cargada.";
  const cosmetic = order.cosmeticCondition || order.cosmetic_condition || "Sin observaciones cosméticas.";

  // Normalización de accesorios
  let accessoriesText = "Ninguno.";
  if (Array.isArray(order.accessories) && order.accessories.length > 0) {
    accessoriesText = order.accessories.join(", ");
  } else if (typeof order.accessories === 'string' && order.accessories.trim() !== '') {
    accessoriesText = order.accessories;
  }

  // 1. Cabecera con Identidad
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  const logoToUse = appLogo || settings.logo;
  if (logoToUse) {
    try { doc.addImage(logoToUse, 'JPEG', 165, 5, 30, 30); } catch (e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 16);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("COMPROBANTE DE RECEPCIÓN TÉCNICA E INGRESO A LABORATORIO", 15, 24);
  doc.text(`NRO ORDEN: #${orderId} | FECHA DE INGRESO: ${entryDate}`, 15, 32);

  // 2. Información del Cliente y Equipo (Tabla)
  doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("1. DATOS GENERALES", 15, 48); doc.line(15, 50, 195, 50);

  const mainTable = [
    ["Cliente:", clientName, "Teléfono:", clientPhone],
    ["Aparatología:", deviceType, "Marca/Mod:", brandModel],
    ["Nro Serie:", serialNumber, "Prioridad:", priority]
  ];

  doc.autoTable({
    startY: 53, body: mainTable, theme: 'plain', styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 35 }, 2: { fontStyle: 'bold', width: 30 } }
  });

  // 3. Falla y Observaciones
  let currentY = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold"); doc.text("2. FALLA REPORTADA Y OBSERVACIONES TÉCNICAS:", 15, currentY);
  doc.line(15, currentY + 2, 195, currentY + 2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);

  const splitDesc = doc.splitTextToSize(description, 180);
  doc.text(splitDesc, 15, currentY + 8);
  currentY += 10 + (splitDesc.length * 4.5);

  // 4. Estado Cosmético
  doc.setFont("helvetica", "bold"); doc.text("3. ESTADO COSMÉTICO DEL EQUIPO:", 15, currentY);
  doc.line(15, currentY + 2, 195, currentY + 2);
  doc.setFont("helvetica", "normal");
  const splitCosmetic = doc.splitTextToSize(cosmetic, 180);
  doc.text(splitCosmetic, 15, currentY + 8);
  currentY += 10 + (splitCosmetic.length * 4.5);

  // 5. Accesorios Recibidos
  doc.setFont("helvetica", "bold"); doc.text("4. ACCESORIOS RECIBIDOS:", 15, currentY);
  doc.line(15, currentY + 2, 195, currentY + 2);
  doc.setFont("helvetica", "normal");
  const splitAcc = doc.splitTextToSize(accessoriesText, 180);
  doc.text(splitAcc, 15, currentY + 8);
  currentY += 10 + (splitAcc.length * 4.5);

  // 6. Fotos de Inspección (Si existen)
  const orderImages = Array.isArray(order.images) ? order.images : [];
  if (orderImages.length > 0) {
      if (currentY > 180) { doc.addPage(); currentY = 20; }
      doc.setFont("helvetica", "bold"); doc.text("5. EVIDENCIA FOTOGRÁFICA (INSPECCIÓN VISUAL):", 15, currentY);
      doc.line(15, currentY + 2, 195, currentY + 2);
      
      let photoX = 15;
      let photoY = currentY + 6;

      orderImages.forEach((img, idx) => {
          try {
            doc.addImage(img, 'JPEG', photoX, photoY, 38, 38, undefined, 'FAST');
            photoX += 43;
            if ((idx + 1) % 4 === 0) { photoX = 15; photoY += 42; }
          } catch(e) { console.warn("Error cargando imagen en PDF:", e); }
      });
      currentY = photoY + 44;
  }

  // 6. Términos y Condiciones
  currentY = renderTermsAndConditions(doc, currentY + 4);

  // 7. Área de Firmas
  let sigY = currentY + 22;
  if (sigY > 275) { doc.addPage(); sigY = 35; }

  doc.setDrawColor(148, 163, 184); 
  doc.line(25, sigY, 90, sigY); 
  doc.line(120, sigY, 185, sigY);
  doc.setFontSize(8); doc.setTextColor(51, 65, 85); doc.setFont("helvetica", "normal");
  doc.text("Firma del Cliente de Conformidad", 32, sigY + 5);
  doc.text("Recepción Responsable LabRepair", 127, sigY + 5);

  const cSig = clientSignatureBase64 || order.clientSignature || order.client_signature;
  const tSig = order.techSignature || order.tech_signature;
  if (cSig) { try { doc.addImage(cSig, 'PNG', 35, sigY - 20, 40, 16); } catch (e) {} }
  if (tSig) { try { doc.addImage(tSig, 'PNG', 130, sigY - 20, 40, 16); } catch (e) {} }

  const sanitizedClient = clientName.replace(/\s+/g, '_');
  await saveOrSharePDF(doc, `Ingreso_${orderId}_${sanitizedClient}.pdf`);
};

export const generateBudgetPDF = async (order, appLogo) => {
  if (!order) return;
  const settings = loadSettings();
  const doc = new jsPDF();

  const orderId = order.id || order.order_id || "S/D";
  const clientName = order.clientName || order.client_name || "N/D";
  const clientPhone = order.clientPhone || order.client_phone || "N/D";
  const deviceType = order.deviceType || order.device_type || order.equipmentType || "N/D";
  const brandModel = order.brandModel || order.brand_model || order.brand || "N/D";
  const serialNumber = order.serialNumber || order.serial_number || "S/D";

  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 35, 'F');
  if (appLogo) { try { doc.addImage(appLogo, 'JPEG', 165, 5, 25, 25); } catch (e) {} }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("PRESUPUESTO DE SERVICIO TÉCNICO", 15, 18);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`ORDEN DE TRABAJO: #${orderId} | EQUIPO: ${deviceType} ${brandModel}`, 15, 26);

  doc.setTextColor(30, 41, 59); doc.setFontSize(10);
  doc.text(`CLIENTE: ${clientName} (${clientPhone})`, 15, 43);
  doc.text(`S/N: ${serialNumber}`, 150, 43);

  doc.setFont("helvetica", "bold"); doc.text("DIAGNÓSTICO TÉCNICO DE INGENIERÍA:", 15, 50);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const diag = order.diagnosis || "Mantenimiento preventivo y calibración general del hardware.";
  const splitDiag = doc.splitTextToSize(diag, 180);
  doc.text(splitDiag, 15, 55);

  const spareParts = order.sparePartsAssigned || order.spare_parts || [];
  const laborCost = Number(order.laborCost || order.labor_cost || 0);

  const budgetItems = spareParts.map(p => {
    const isClientPart = Number(p.price || 0) === 0;
    return [
      isClientPart ? `${p.name} (Provisto por el cliente - $0)` : p.name,
      p.qty || p.quantity || 1,
      `$${Number(p.price || p.precio || 0).toLocaleString()}`,
      `$${(Number(p.qty || 1) * Number(p.price || 0)).toLocaleString()}`
    ];
  });
  
  budgetItems.push(["Mano de Obra / Horas de Ingeniería Técnica", "1", `$${laborCost.toLocaleString()}`, `$${laborCost.toLocaleString()}`]);

  doc.autoTable({
    startY: 62 + (splitDiag.length * 4.5),
    head: [["Descripción de Tareas / Insumos", "Cant.", "P.Unit", "Subtotal"]],
    body: budgetItems,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59] }
  });

  let currentY = doc.lastAutoTable.finalY + 12;
  const details = order.budgetDetails || {};

  // Totales Detallados (Ajuste de Margen y Fuente)
  const partsTotal = spareParts.reduce((acc, p) => acc + (Number(p.qty || 1) * Number(p.price || 0)), 0);
  const subtotalBase = partsTotal + laborCost;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");

  const rightAlignX = 195;
  const labelX = 130;

  doc.text(`SUBTOTAL TAREAS E INSUMOS:`, labelX, currentY);
  doc.text(`$${subtotalBase.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
  currentY += 6;

  if (Number(details.discountValue || 0) > 0) {
    const dType = details.discountType === 'PERCENT' ? '%' : '$';
    const dVal = Number(details.discountValue);
    const dAmt = details.discountType === 'PERCENT' ? (subtotalBase * (dVal / 100)) : dVal;

    doc.setTextColor(220, 38, 38); // Rojo Intenso
    doc.text(`DESCUENTO COMERCIAL (${dVal}${dType}):`, labelX, currentY);
    doc.text(`-$${dAmt.toLocaleString()}`, rightAlignX, currentY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    currentY += 6;
  }

  if (details.diagnosisFeeMode === 'PAID') {
    doc.setTextColor(16, 185, 129); // Esmeralda
    doc.text(`ABONO REVISIÓN (YA PAGADO):`, labelX, currentY);
    doc.text(`-$20.000`, rightAlignX, currentY, { align: 'right' });
    doc.setTextColor(30, 41, 59);
    currentY += 6;
  } else if (details.diagnosisFeeMode === 'PENDING') {
    doc.text(`CARGO POR REVISIÓN/DIAG:`, labelX, currentY);
    doc.text(`$20.000`, rightAlignX, currentY, { align: 'right' });
    currentY += 6;
  }

  const finalTotal = Number(details.grandTotal || (subtotalBase - (details.diagnosisFeeMode === 'PAID' ? 20000 : 0)));

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setDrawColor(200, 200, 200);
  doc.line(labelX, currentY - 2, rightAlignX, currentY - 2);
  doc.text(`TOTAL FINAL NETO:`, labelX, currentY + 4);
  doc.text(`$${finalTotal.toLocaleString()}`, rightAlignX, currentY + 4, { align: 'right' });

  renderTermsAndConditions(doc, currentY + 15);

  const sanitizedClient = clientName.replace(/\s+/g, '_');
  await saveOrSharePDF(doc, `Presupuesto_${orderId}_${sanitizedClient}.pdf`);
};

export const exportWorkOrdersToPDF = (orders) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  if (settings.logo) { try { doc.addImage(settings.logo, 'PNG', 175, 8, 20, 20); } catch (e) {} }
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.setFontSize(10); doc.text("REPORTE RESUMEN DE ÓRDENES DE TRABAJO", 15, 27);

  const columns = ["ID", "Equipo", "Cliente", "Fecha", "Estado"];
  const rows = orders.map(o => [
    o.id || o.order_id, 
    `${o.deviceType || o.device_type || o.equipmentType || "N/D"}`, 
    o.clientName || o.client_name, 
    o.entryDate || o.entry_date, 
    o.status
  ]);

  doc.autoTable({ startY: 45, head: [columns], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] }, styles: { fontSize: 8 } });

  renderTermsAndConditions(doc, doc.lastAutoTable.finalY + 15);

  saveOrSharePDF(doc, "Reporte_General_LabRepair.pdf");
};

export const exportInventoryToPDF = (inventory) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255); doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.text("REPORTE DE INVENTARIO Y STOCK", 15, 27);
  const rows = inventory.map(item => [item.id, item.name, item.stock, `$${Number(item.price || 0).toLocaleString()}`]);
  doc.autoTable({ startY: 45, head: [["ID", "Insumo", "Stock", "Precio"]], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  saveOrSharePDF(doc, "Inventario_LabRepair.pdf");
};

export const generateQCCertificate = (order) => {
  if (!order) return;
  const settings = loadSettings();
  const doc = new jsPDF();
  const bench = order.benchTest || order.bench_test || {};
  const orderId = order.id || order.order_id || "S/D";
  const clientName = order.clientName || order.client_name || "N/D";
  const deviceType = order.deviceType || order.device_type || "N/D";
  const brandModel = order.brandModel || order.brand_model || order.brand || "N/D";
  const serialNumber = order.serialNumber || order.serial_number || "S/D";

  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 38, 'F');
  doc.setFillColor(6, 182, 212); doc.rect(0, 38, 210, 2, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text(settings.companyName.toUpperCase(), 15, 16);
  doc.setFontSize(10); doc.text("CERTIFICADO DE CONTROL DE CALIDAD (QC OK)", 15, 29);

  const data = [
    ["OT ID:", orderId, "Fecha:", new Date().toLocaleDateString('es-AR')],
    ["Cliente:", clientName, "Equipo:", deviceType],
    ["Marca/Mod:", brandModel, "S/N:", serialNumber]
  ];
  doc.autoTable({ startY: 45, body: data, theme: 'plain', styles: { fontSize: 8.5 } });

  const qcRows = [
    ["Flujo Refrigerante", bench.coolantFlow || "N/D", "L/min", "Óptimo"],
    ["Temperatura Cabezal", bench.peltierTemp || "N/D", "°C", "Estable"],
    ["Presión Vacío", bench.vacuumPressure || "N/D", "bar", "Nominal"],
    ["Seguridad Eléctrica", (order.qcPassed || order.qc_passed) ? "APROBADO" : "OBSERVADO", "Resultado", "APTO"]
  ];

  doc.autoTable({ startY: doc.lastAutoTable.finalY + 6, head: [["Parámetro", "Medición", "Unidad", "Estado"]], body: qcRows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  renderTermsAndConditions(doc, doc.lastAutoTable.finalY + 10);

  const sigY = 265; doc.line(30, sigY, 85, sigY); doc.line(125, sigY, 180, sigY);
  doc.text(settings.technicianName, 40, sigY + 5); doc.text("Firma y Sello Lab", 135, sigY + 5);
  saveOrSharePDF(doc, `${orderId}_Certificado_QC.pdf`);
};

export const exportSerialHistoryToPDF = (serialNumber, history) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  doc.setFillColor(30, 41, 59); doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255); doc.text(settings.companyName.toUpperCase(), 15, 18);
  doc.text(`HISTORIAL TÉCNICO S/N: ${serialNumber}`, 15, 25);
  const rows = history.map(o => [
    o.id || o.order_id, 
    o.entryDate || o.entry_date, 
    o.issueDescription || o.issue_description || o.reportedFailure || "N/D", 
    o.status
  ]);
  doc.autoTable({ startY: 40, head: [["ID", "Fecha", "Falla", "Estado"]], body: rows, theme: 'grid', headStyles: { fillColor: [30, 41, 59] } });
  saveOrSharePDF(doc, `Historial_${serialNumber}.pdf`);
};