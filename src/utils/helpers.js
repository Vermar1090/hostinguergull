// Generar código aleatorio
const generateRandomCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Validar email
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Validar teléfono colombiano
const validatePhone = (phone) => {
    const re = /^3\d{9}$/;
    return re.test(phone);
};

// Sanitizar datos
const sanitize = (data) => {
    if (typeof data === 'string') {
        return data.trim().replace(/[<>]/g, '');
    }
    return data;
};

module.exports = {
    generateRandomCode,
    validateEmail,
    validatePhone,
    sanitize
};