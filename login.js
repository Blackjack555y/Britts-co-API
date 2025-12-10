require('dotenv').config();

const usuarios = {
  AA1681: {
    nombre: 'Unión Caribe - Aruba',
    user: process.env.USER_AA1681,
    pass: process.env.PASS_AA1681,
  },
  AA1832: {
    nombre: 'Unión Caribe - Curazao',
    user: process.env.USER_AA1832,
    pass: process.env.PASS_AA1832,
  },
  AD3235: {
    nombre: 'Unión Caribe - Sint Maarten',
    user: process.env.USER_AD3235,
    pass: process.env.PASS_AD3235,
  },
  ZZ2006: {
    nombre: 'Administrador',
    user: process.env.USER_ZZ2006,
    pass: process.env.PASS_ZZ2006,
  },
};

/**
 * Verifica credenciales de inicio de sesión.
 * @param {string} inputUser - Nombre de usuario ingresado.
 * @param {string} inputPass - Contraseña ingresada.
 * @returns {{ success: boolean, codigo?: string, nombre?: string, error?: string }}
 */
function verificarLogin(inputUser, inputPass) {
  for (const codigo in usuarios) {
    const { user, pass, nombre } = usuarios[codigo];
    if (inputUser === user && inputPass === pass) {
      return { success: true, codigo, nombre };
    }
  }
  return { success: false, error: 'Credenciales inválidas' };
}

module.exports = { verificarLogin };
