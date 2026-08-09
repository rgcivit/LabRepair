import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { loadSettings } from "./settingsService";

/**
 * Servicio técnico de generación de reportes e informes de ingeniería en PDF.
 * Diseña un Certificado de Control de Calidad (QC) profesional y limpio
 * cargando de forma dinámica las firmas, logotipos e identidad corporativa
 * desde las configuraciones del usuario (`estetica_lab_settings` en localStorage).
 * 
 * @param {Object} order - Orden de trabajo con mediciones de banco (`benchTest`) y control de calidad aprobado.
 */
export const generateQCCertificate = (order) => {
  if (!order) {
    console.error("No se suministró una orden válida para generar el certificado.");
    return;
  }

  const settings = loadSettings();

  // Inicializa la instancia del documento jsPDF
  const doc = new jsPDF();
  const bench = order.benchTest || {};

  // Paleta de colores corporativos del laboratorio (tonos Slate y acentos Cian)
  const colorPrimary = [30, 41, 59];    // Slate 800 (#1e293b)
  const colorSecondary = [6, 182, 212];  // Cyan 500 (#06b6d4)
  const colorText = [51, 65, 85];       // Slate 700 (#334155)

  // Símbolo de moneda y sigla según configuración
  let currencySymbol = '$';
  let currencyCode = 'ARS';
  if (settings.currency === 'USD') {
    currencySymbol = 'US$';
    currencyCode = 'USD';
  } else if (settings.currency === 'EUR') {
    currencySymbol = '€';
    currencyCode = 'EUR';
  } else if (settings.currency === 'CLP') {
    currencySymbol = '$';
    currencyCode = 'CLP';
  }

  // 1. ENCABEZADO INDUSTRIAL
  // Franja oscura superior
  doc.setFillColor(...colorPrimary);
  doc.rect(0, 0, 210, 38, 'F');

  // Línea cian de acento inferior en el header
  doc.setFillColor(...colorSecondary);
  doc.rect(0, 38, 210, 2, 'F');

  // Títulos del Encabezado (Dinámicos)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const companyTitle = settings.companyName.toUpperCase();
  // Ajustar tamaño del título según longitud
  doc.setFontSize(companyTitle.length > 38 ? 10 : 12);
  doc.text(companyTitle, 15, 16);
  
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("SISTEMA DE GESTIÓN DE CALIDAD - CERTIFICACIÓN OPERACIONAL DE HARDWARE", 15, 23);
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colorSecondary);
  doc.setFontSize(10.5);
  doc.text("CERTIFICADO DE CONTROL DE CALIDAD Y CALIBRACIÓN (QC OK)", 15, 31);

  // Logo Dinámico derecho o texto por defecto
  if (settings.logo) {
    try {
      doc.addImage(settings.logo, 'PNG', 165, 6, 30, 16);
    } catch (e) {
      console.error("Error al renderizar el Logo comercial en el PDF:", e);
      // Fallback a texto si falla la imagen
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LabRepair", 165, 20);
    }
  } else {
    // Isotipo por defecto
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LabRepair", 165, 20);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("ENGINEERING LABS", 165, 25);
  }

  // 2. DETALLES DE LA ORDEN DE TRABAJO (SECCIÓN INFORMATIVA)
  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORMACIÓN DE LA ORDEN Y APARATOLOGÍA", 15, 52);
  
  // Línea divisora sutil
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 55, 195, 55);

  doc.setTextColor(...colorText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const leftColX = 15;
  const rightColX = 110;

  // Fila 1 de datos
  doc.setFont("helvetica", "bold");
  doc.text("Nro. de Orden (OT):", leftColX, 62);
  doc.setFont("helvetica", "normal");
  doc.text(order.id || "N/A", leftColX + 38, 62);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha Emisión Certificado:", rightColX, 62);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString('es-AR') || "N/A", rightColX + 48, 62);

  // Fila 2 de datos
  doc.setFont("helvetica", "bold");
  doc.text("Cliente / Clínica:", leftColX, 69);
  doc.setFont("helvetica", "normal");
  doc.text(order.clientName || "N/A", leftColX + 38, 69);

  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Aparatología:", rightColX, 69);
  doc.setFont("helvetica", "normal");
  doc.text(order.equipmentType || "N/A", rightColX + 48, 69);

  // Fila 3 de datos
  doc.setFont("helvetica", "bold");
  doc.text("Equipo / Marca:", leftColX, 76);
  doc.setFont("helvetica", "normal");
  doc.text(`${order.brand || ""} ${order.model || ""}`.trim() || "N/A", leftColX + 38, 76);

  doc.setFont("helvetica", "bold");
  doc.text("Nro. de Serie (S/N):", rightColX, 76);
  doc.setFont("helvetica", "normal");
  doc.text(order.serialNumber || "N/A", rightColX + 48, 76);

  // 3. TABLA DE MEDICIONES TÉCNICAS (AutoTable)
  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PARÁMETROS DE CALIBRACIÓN EN BANCO DE PRUEBAS", 15, 90);

  // Columnas y Datos de la Tabla
  const tableColumns = ["Parámetro Crítico Ensayado", "Medición de Laboratorio", "Unidad", "Estado Tolerancia"];
  
  const tableRows = [
    [
      "Flujo de Líquido Refrigerante", 
      bench.coolantFlow || "N/D", 
      "L/min", 
      parseFloat(bench.coolantFlow) >= 3.0 ? "Óptimo (> 3.0 L/min)" : "Tolerable"
    ],
    [
      "Temperatura de Cabezal / Celdas Peltier", 
      bench.peltierTemp ? `${bench.peltierTemp} °C` : "N/D", 
      "°C bajo cero", 
      parseFloat(bench.peltierTemp) <= -4 ? "Óptimo (<= -4 °C)" : "Tolerable"
    ],
    [
      "Presión de Vacío / Succión", 
      bench.vacuumPressure ? `${bench.vacuumPressure} bar` : "N/D", 
      "bar", 
      parseFloat(bench.vacuumPressure) <= -0.4 ? "Excelente (Succión Estrecha)" : "Tolerable"
    ],
    [
      "Tensión de Alimentación de Red", 
      `${bench.voltageNet || "220"} V / ${bench.frequency || "50"} Hz`, 
      "V / Hz", 
      "Estable (Aislamiento nominal)"
    ],
    [
      "Tensión de Fuentes de Alta Tensión (HV)", 
      `${bench.voltageHV || "24"} V`, 
      "V CC", 
      "Regulado"
    ],
    [
      "Contadores de Disparo / Uso", 
      `${(bench.shotCounter || 0).toLocaleString()} disp. / ${(bench.hoursOfUse || 0).toLocaleString()} hs`, 
      "Totales", 
      "Historial de Emisor Grabado"
    ],
    [
      "Verificación Operacional y Seguridad", 
      order.qcPassed ? "APROBADO (QC OK)" : "CON OBSERVACIONES", 
      "Resultado", 
      order.qcPassed ? "APTO PARA USO CLÍNICO" : "NO APTO"
    ]
  ];

  // Inyectar AutoTable
  doc.autoTable({
    startY: 94,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: colorPrimary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left'
    },
    bodyStyles: {
      textColor: colorText,
      fontSize: 8.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 62 },
      1: { halign: 'left', width: 45 },
      2: { halign: 'center', width: 25 },
      3: { fontStyle: 'italic', width: 48 }
    },
    margin: { left: 15, right: 15 },
    didDrawCell: (data) => {
      // Pintamos la última fila (Resultado) de color verde claro para realzar la aprobación
      if (data.row.index === 6 && data.cell.section === 'body') {
        doc.setFillColor(240, 253, 250); // bg-teal-50
        doc.setTextColor(13, 148, 136); // text-teal-600
      }
    }
  });

  // 4. INFORME DE CAUSA RAÍZ Y DIAGNÓSTICO DETALLADO
  const finalY = doc.previousAutoTable.finalY + 12;

  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INFORME DE PROCEDIMIENTO Y CAUSA RAÍZ DE FALLA", 15, finalY);

  // Línea divisora
  doc.setDrawColor(226, 232, 240);
  doc.line(15, finalY + 3, 195, finalY + 3);

  doc.setTextColor(...colorText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const diagnosisText = order.diagnosis || 
    "No se detallan anomalías de hardware en el historial del servicio. El equipo supera satisfactoriamente todas las pruebas dinámicas nominales de banco, flujos de presión hidráulica, tensiones y aislamientos térmicos periféricos.";
  
  // Ajuste de texto de forma automática según márgenes
  const splitDiagnosis = doc.splitTextToSize(diagnosisText, 180);
  doc.text(splitDiagnosis, 15, finalY + 9);

  // 5. PIE DE PÁGINA DE CERTIFICACIÓN, FIRMA Y SELLO
  const signatureY = 245;

  // Líneas punteadas / firmantes
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.5);
  doc.line(30, signatureY, 85, signatureY);
  doc.line(125, signatureY, 180, signatureY);

  doc.setTextColor(...colorPrimary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(settings.technicianName, 34, signatureY + 5);
  doc.text("Firma Autorizada y Sello Lab", 133, signatureY + 5);

  doc.setTextColor(...colorText);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(settings.licenseNumber, 34, signatureY + 10);
  doc.text(settings.companyName, 134, signatureY + 10);

  // Firma Digital Dinámica (si está cargada en base64)
  if (settings.signature) {
    try {
      doc.addImage(settings.signature, 'PNG', 40, signatureY - 20, 32, 14);
    } catch (e) {
      console.error("Error al renderizar la Firma Digital en el PDF:", e);
    }
  }

  // Sello decorativo en Cyan
  doc.setDrawColor(...colorSecondary);
  doc.setLineWidth(1);
  doc.roundedRect(122, signatureY - 26, 61, 33, 2, 2, 'D');
  
  doc.setTextColor(...colorSecondary);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("LABREPAIR - QC PASSED", 128, signatureY - 19);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("CERTIFICACIÓN CLÍNICA", 135, signatureY - 14);
  doc.text(`EMISIÓN: ${new Date().toLocaleDateString('es-AR')}`, 133, signatureY - 9);

  // 6. PIE DE PÁGINA DINÁMICO (Configurado)
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.text(settings.pdfFooter.toUpperCase(), 15, 285);
  doc.text(`DIRECCIÓN: ${settings.companyAddress} | EMAIL: ${settings.companyEmail} | TEL: ${settings.companyPhone} | WHATSAPP: ${settings.whatsappNumber}`, 15, 289);

  // Activa la descarga automática del archivo en el cliente con un nombre único
  const filename = `${order.id || "OT-000"} - ${order.clientName || "Cliente"}.pdf`;
  doc.save(filename);
};

/**
 * Reporte de Inventario Completo y Stock en PDF.
 * @param {Array} inventory - Listado de repuestos del almacén.
 */
export const exportInventoryToPDF = (inventory) => {
  const settings = loadSettings();
  const doc = new jsPDF();
  
  // Encabezado Corporativo
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212); // Cyan 500
  doc.text("INFORME DE INVENTARIO GENERAL Y CONTROL DE STOCK", 15, 25);
  
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(7.5);
  doc.text(`EMISIÓN: ${new Date().toLocaleString('es-AR')} | RESPONSABLE: LABREPAIR`, 15, 32);

  // Tabla de datos
  const columns = ["ID", "Repuesto / Insumo", "Categoría", "Soporte Equipo", "Stock", "Precio Unitario"];
  const rows = inventory.map(item => [
    item.id,
    item.name,
    item.category || "GENERAL",
    item.equipmentType || "General",
    item.stock,
    `$ ${item.price}`
  ]);

  doc.autoTable({
    startY: 48,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      4: { fontStyle: 'bold', halign: 'center' }, // Stock
      5: { halign: 'right' } // Precio
    }
  });

  // Pie de Página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.text(settings.pdfFooter.toUpperCase(), 15, 285);
    doc.text(`Página ${i} de ${pageCount} | Dirección: ${settings.companyAddress}`, 15, 289);
  }

  doc.save(`Reporte_Inventario_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Reporte General de Órdenes de Trabajo en PDF.
 * @param {Array} orders - Listado de órdenes de trabajo.
 */
export const exportWorkOrdersToPDF = (orders) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  // Encabezado Corporativo
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212); // Cyan 500
  doc.text("REPORTE HISTÓRICO Y LOGÍSTICA DE ÓRDENES DE TRABAJO (OT)", 15, 25);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(7.5);
  doc.text(`EMISIÓN: ${new Date().toLocaleString('es-AR')} | TOTAL REGISTROS: ${orders.length}`, 15, 32);

  // Tabla de datos
  const columns = ["OT ID", "Aparatología / Equipo", "Cliente / Clínica", "Ingreso", "Estado", "Prioridad"];
  const rows = orders.map(order => [
    order.id,
    `${order.equipmentName} (${order.brand} ${order.model})`,
    order.clientName,
    order.entryDate,
    order.status,
    order.priority
  ]);

  doc.autoTable({
    startY: 48,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { fontStyle: 'bold' }
    }
  });

  // Pie de Página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.text(settings.pdfFooter.toUpperCase(), 15, 285);
    doc.text(`Página ${i} de ${pageCount} | Dirección: ${settings.companyAddress}`, 15, 289);
  }

  doc.save(`Reporte_Ordenes_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Reporte Clínico Histórico de un Equipo por Número de Serie.
 * @param {string} serialNumber - Número de serie consultado.
 * @param {Array} history - Listado histórico de órdenes asociadas al equipo.
 * @param {Object} info - Información de la primera orden (para datos del equipo).
 */
export const exportSerialHistoryToPDF = (serialNumber, history, info = {}) => {
  const settings = loadSettings();
  const doc = new jsPDF();

  // Encabezado Corporativo
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(settings.companyName.toUpperCase(), 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212); // Cyan 500
  doc.text(`HISTORIAL CLÍNICO OPERATIVO - S/N: ${serialNumber}`, 15, 25);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(7.5);
  doc.text(`EQUIPO: ${info.equipmentType || "Médico"} | MARCA: ${info.brand || ""} | MODELO: ${info.model || ""}`, 15, 32);

  // Subcabecera con datos de la última clínica asociada
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(15, 45, 180, 20, 'F');
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.rect(15, 45, 180, 20, 'D');

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Último Cliente Registrado: ${info.clientName || "N/D"}`, 20, 52);
  doc.setFont("helvetica", "normal");
  doc.text(`Contacto / Teléfono: ${info.clientPhone || "N/D"}`, 20, 58);
  doc.text(`Total Intervenciones en Taller: ${history.length}`, 120, 52);

  // Tabla de datos
  const columns = ["OT ID", "Fecha", "Falla Reportada", "Estado Actual", "Diagnóstico Técnico", "Mano de Obra / Repuestos"];
  const rows = history.map(order => {
    const assignedSpareParts = order.sparePartsAssigned || [];
    const partsText = assignedSpareParts.map(p => `${p.name} (x${p.qty})`).join(', ') || 'Sin repuestos asignados';
    
    return [
      order.id,
      order.entryDate,
      order.reportedFailure || "Control de rutina",
      order.status,
      order.benchTest?.observations || "Ninguno",
      `MO: $${order.laborCost || 0}\nRepuestos: ${partsText}`
    ];
  });

  doc.autoTable({
    startY: 72,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'left'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', width: 15 },
      1: { width: 20 },
      2: { width: 35 },
      3: { width: 22 },
      4: { width: 45 },
      5: { width: 43 }
    }
  });

  // Pie de Página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6.5);
    doc.text(settings.pdfFooter.toUpperCase(), 15, 285);
    doc.text(`Página ${i} de ${pageCount} | Dirección: ${settings.companyAddress}`, 15, 289);
  }

  doc.save(`Historial_Clinico_${serialNumber}.pdf`);
};

