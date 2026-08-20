const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function createAdmin() {
    console.log('🔐 Creando usuario administrador...');
    
    const adminData = {
        nombre: 'Administrador GULLA',
        usuario: 'admin',
        email: 'admin@gulla.com',
        password: 'admin123',
        telefono: '3001234567',
        direccion: 'Calle Principal #123',
        barrio: 'Centro',
        rol: 'Administrador'
    };
    
    try {
        const response = await axios.post(`${API_URL}/auth/register`, adminData);
        if (response.data.success) {
            console.log('✅ Administrador creado exitosamente!');
            console.log('📧 Email:', adminData.email);
            console.log('🔑 Password:', adminData.password);
        } else {
            console.log('❌ Error:', response.data.message);
        }
    } catch (error) {
        if (error.response?.status === 400) {
            console.log('⚠️ El administrador ya existe. Puedes iniciar sesión con:', adminData.email);
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

createAdmin();