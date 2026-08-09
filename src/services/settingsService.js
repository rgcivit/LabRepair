const SETTINGS_KEY = 'estetica_lab_settings';

export const DEFAULT_SETTINGS = {
  companyName: 'LABORATORIO DE REPARACIÓN Y CALIBRACIÓN',
  companyCuit: 'CUIT: 30-71628312-9',
  companyAddress: 'Av. Juan de Garay 1420, CABA',
  companyPhone: '+54 11 5110-2200',
  companyEmail: 'calibracion@labrepair.com',
  whatsappNumber: '+54 9 2616625074',
  currency: 'ARS',
  pdfFooter: 'SISTEMA DE GESTIÓN DE CALIDAD - CERTIFICACIÓN OPERACIONAL',
  technicianName: 'Ing. Responsable de Calibración',
  licenseNumber: 'Reg. Nac. Ing. Clínica Nro. 78241',
  logo: '',
  signature: ''
};

/**
 * Retorna las configuraciones del laboratorio combinadas con los valores por defecto.
 * @returns {Object} Configuraciones vigentes.
 */
export const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.error("Error al cargar las configuraciones del laboratorio:", e);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Persiste las configuraciones del laboratorio.
 * @param {Object} settings - Configuraciones a guardar.
 */
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Error al guardar las configuraciones del laboratorio:", e);
  }
};

/**
 * Normaliza un número telefónico al formato que espera la API de enlaces de WhatsApp.
 * @param {string} phone - Número en cualquier formato (con espacios, guiones o signo +).
 * @returns {string} Solo dígitos, sin prefijos ni separadores.
 */
export const toWhatsAppNumber = (phone) => (phone || '').replace(/\D/g, '');
