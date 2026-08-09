const EQUIPMENT_TYPES_KEY = 'labrepair_equipment_types';

/**
 * Catálogo inicial de aparatología, con los modelos históricos de cada tipo.
 */
const INITIAL_EQUIPMENT_TYPES = [
  { id: 'EQT-001', name: 'Criolipólisis', models: ['IceSculpt 360', 'CryoSlim Pro'] },
  { id: 'EQT-002', name: 'Láser Diodo', models: ['Depil Max 808', 'SopranoIce'] },
  { id: 'EQT-003', name: 'Radiofrecuencia', models: ['Accent Prime II'] },
  { id: 'EQT-004', name: 'Cavitador', models: [] },
  { id: 'EQT-005', name: 'Vacumterapia', models: [] }
];

const buildNextId = (items) => {
  const nextNum = items.reduce((max, item) => {
    const num = parseInt(String(item.id).replace('EQT-', ''), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0) + 1;
  return `EQT-${String(nextNum).padStart(3, '0')}`;
};

const persist = (types) => {
  try {
    localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(types));
  } catch (e) {
    console.error("Error al guardar el catálogo de equipos:", e);
  }
  return types;
};

/**
 * Retorna el catálogo de tipos de aparatología con sus modelos.
 * @returns {Array} Listado de tipos { id, name, models }.
 */
export const getEquipmentTypes = () => {
  try {
    const data = localStorage.getItem(EQUIPMENT_TYPES_KEY);
    const parsed = data ? JSON.parse(data) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Error al leer el catálogo de equipos:", e);
  }
  return persist(INITIAL_EQUIPMENT_TYPES);
};

/**
 * Crea o actualiza un tipo de aparatología.
 * @param {Object} type - Tipo { id?, name, models }.
 * @returns {Object} { success: boolean, types: Array, error?: string }
 */
export const saveEquipmentType = (type) => {
  const types = getEquipmentTypes();
  const name = (type.name || '').trim();

  if (!name) {
    return { success: false, types, error: 'El nombre del tipo de equipo es obligatorio.' };
  }

  const duplicated = types.some(t => t.name.toLowerCase() === name.toLowerCase() && t.id !== type.id);
  if (duplicated) {
    return { success: false, types, error: `El tipo "${name}" ya existe en el catálogo.` };
  }

  const models = (type.models || []).map(m => m.trim()).filter(Boolean);
  const updated = type.id && types.some(t => t.id === type.id)
    ? types.map(t => (t.id === type.id ? { ...t, name, models } : t))
    : [...types, { id: buildNextId(types), name, models }];

  return { success: true, types: persist(updated) };
};

/**
 * Elimina un tipo de aparatología del catálogo.
 * @param {string} typeId - Identificador del tipo.
 * @returns {Array} Catálogo actualizado.
 */
export const deleteEquipmentType = (typeId) => {
  const types = getEquipmentTypes();
  return persist(types.filter(t => t.id !== typeId));
};

/**
 * Retorna los modelos registrados para un tipo de aparatología.
 * @param {string} typeName - Nombre del tipo (tal como se guarda en la orden).
 * @returns {Array<string>} Modelos disponibles.
 */
export const getModelsForType = (typeName) => {
  const type = getEquipmentTypes().find(t => t.name === typeName);
  return type ? type.models : [];
};
