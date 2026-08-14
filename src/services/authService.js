const USERS_KEY = 'labrepair_users';
const CURRENT_USER_KEY = 'labrepair_current_user';

// Listado de usuarios iniciales - Sincronizado con Vercel
const INITIAL_USERS = [
  {
    name: 'Rodrigo Guevara Civit',
    username: 'rgcivit',
    email: 'rodrigo@labrepair.com',
    password: 'prinoth',
    role: 'ADMIN'
  },
  {
    name: 'Administrador',
    username: 'rodrigo',
    email: 'admin@labrepair.com',
    password: 'admin',
    role: 'ADMIN'
  }
];

/**
 * Inicializa la tabla de usuarios en LocalStorage si no existe.
 */
const initUsers = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  }
};

/**
 * Retorna la lista de todos los usuarios registrados.
 * @returns {Array} Listado de usuarios.
 */
export const getUsers = () => {
  initUsers();
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY));
  } catch (e) {
    console.error("Error al leer usuarios:", e);
    return INITIAL_USERS;
  }
};

/**
 * Retorna el usuario actualmente autenticado o null si no hay sesión.
 * @returns {Object|null} Usuario logueado.
 */
export const getCurrentUser = () => {
  try {
    const userStr = localStorage.getItem(CURRENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    console.error("Error al leer el usuario activo:", e);
    return null;
  }
};

/**
 * Intenta iniciar sesión con un usuario y contraseña.
 * @param {string} usernameOrEmail - Nombre de usuario o correo electrónico.
 * @param {string} password - Contraseña ingresada.
 * @returns {Object} { success: boolean, user?: Object, error?: string }
 */
export const login = (usernameOrEmail, password) => {
  const users = getUsers();
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  
  const user = users.find(u => 
    (u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput) && 
    u.password === password
  );

  if (user) {
    const sessionUser = { ...user };
    delete sessionUser.password; // No guardar la contraseña en la sesión
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  }

  return { success: false, error: 'Usuario o contraseña incorrectos' };
};

/**
 * Cierra la sesión del usuario activo.
 */
export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

/**
 * Registra un nuevo usuario en el sistema.
 * @param {Object} newUser - Datos del usuario { name, username, email, password }
 * @returns {Object} { success: boolean, error?: string }
 */
export const registerUser = (newUser) => {
  const users = getUsers();
  const name = newUser.name.trim();
  const username = newUser.username.trim().toLowerCase();
  const email = newUser.email.trim().toLowerCase();
  const password = newUser.password;

  if (!name || !username || !email || !password) {
    return { success: false, error: 'Todos los campos son obligatorios' };
  }

  // Validar unicidad
  if (users.some(u => u.username.toLowerCase() === username)) {
    return { success: false, error: 'El nombre de usuario ya está registrado' };
  }
  if (users.some(u => u.email.toLowerCase() === email)) {
    return { success: false, error: 'El correo electrónico ya está registrado' };
  }

  const updatedUsers = [...users, { name, username, email, password, role: 'USER' }];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  return { success: true };
};

/**
 * Cambia la contraseña de un usuario.
 * @param {string} username - Nombre de usuario.
 * @param {string} currentPassword - Contraseña actual.
 * @param {string} newPassword - Nueva contraseña.
 * @returns {Object} { success: boolean, error?: string }
 */
export const changePassword = (username, currentPassword, newPassword) => {
  const users = getUsers();
  const userIdx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

  if (userIdx === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  if (users[userIdx].password !== currentPassword) {
    return { success: false, error: 'La contraseña actual es incorrecta' };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'La nueva contraseña debe tener al menos 4 caracteres' };
  }

  users[userIdx].password = newPassword;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true };
};
