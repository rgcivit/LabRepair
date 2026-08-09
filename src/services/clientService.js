const CLIENTS_KEY = 'labrepair_clients';

const buildNextId = (clients) => {
  const nextNum = clients.reduce((max, client) => {
    const num = parseInt(String(client.id).replace('CLI-', ''), 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0) + 1;
  return `CLI-${String(nextNum).padStart(3, '0')}`;
};

const persist = (clients) => {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  } catch (e) {
    console.error("Error al guardar la cartera de clientes:", e);
  }
  return clients;
};

/**
 * Retorna la cartera de clientes registrada.
 * @returns {Array} Listado de clientes { id, name, phone, email, notes }.
 */
export const getClients = () => {
  try {
    const data = localStorage.getItem(CLIENTS_KEY);
    const parsed = data ? JSON.parse(data) : null;
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.error("Error al leer la cartera de clientes:", e);
  }
  return [];
};

/**
 * Importa a la cartera los clientes que solo existen dentro de órdenes históricas.
 * Se ejecuta una vez por arranque y no pisa los datos ya cargados a mano.
 * @param {Array} workOrders - Órdenes de trabajo registradas.
 * @returns {Array} Cartera de clientes actualizada.
 */
export const syncClientsFromWorkOrders = (workOrders = []) => {
  const clients = getClients();
  const known = new Set(clients.map(c => c.name.trim().toLowerCase()));
  const pending = [];

  workOrders.forEach(order => {
    const name = (order.clientName || '').trim();
    if (!name || known.has(name.toLowerCase())) return;
    known.add(name.toLowerCase());
    pending.push({ name, phone: order.clientPhone || '', email: '', notes: '' });
  });

  if (pending.length === 0) return clients;

  const merged = pending.reduce((acc, client) => [...acc, { ...client, id: buildNextId(acc) }], clients);
  return persist(merged);
};

/**
 * Crea o actualiza un cliente de la cartera.
 * @param {Object} client - Cliente { id?, name, phone, email, notes }.
 * @returns {Object} { success: boolean, clients: Array, client?: Object, error?: string }
 */
export const saveClient = (client) => {
  const clients = getClients();
  const name = (client.name || '').trim();
  const phone = (client.phone || '').trim();

  if (!name) {
    return { success: false, clients, error: 'El nombre de la clínica o cliente es obligatorio.' };
  }
  if (!phone) {
    return { success: false, clients, error: 'El teléfono de contacto es obligatorio.' };
  }

  const duplicated = clients.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== client.id);
  if (duplicated) {
    return { success: false, clients, error: `El cliente "${name}" ya está registrado.` };
  }

  const payload = {
    name,
    phone,
    email: (client.email || '').trim(),
    notes: (client.notes || '').trim()
  };

  const isUpdate = client.id && clients.some(c => c.id === client.id);
  const saved = isUpdate ? { ...payload, id: client.id } : { ...payload, id: buildNextId(clients) };
  const updated = isUpdate
    ? clients.map(c => (c.id === client.id ? saved : c))
    : [...clients, saved];

  return { success: true, clients: persist(updated), client: saved };
};

/**
 * Elimina un cliente de la cartera. No afecta a las órdenes ya registradas.
 * @param {string} clientId - Identificador del cliente.
 * @returns {Array} Cartera actualizada.
 */
export const deleteClient = (clientId) => {
  const clients = getClients();
  return persist(clients.filter(c => c.id !== clientId));
};

/**
 * Cuenta las órdenes de trabajo asociadas a un cliente por nombre.
 * @param {string} clientName - Nombre del cliente.
 * @param {Array} workOrders - Órdenes de trabajo registradas.
 * @returns {number} Cantidad de órdenes vinculadas.
 */
export const countOrdersForClient = (clientName, workOrders = []) =>
  workOrders.filter(order => (order.clientName || '').trim().toLowerCase() === clientName.trim().toLowerCase()).length;
