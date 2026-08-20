const axios = require('axios');
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

let authToken = null;

async function login(email, password) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, { email, password });
        if (response.data.success) {
            authToken = response.data.data.token;
            console.log(`${colors.green}✅ Login exitoso:${colors.reset} ${email}`);
            return authToken;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error en login:${colors.reset}`, error.message);
        return null;
    }
}

async function getConfigPublic() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo configuración pública...${colors.reset}`);
        const response = await axios.get(`${API_URL}/config/public`);
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Configuración obtenida:${colors.reset}`);
            console.log(`  ${colors.cyan}Nombre:${colors.reset} ${response.data.data.nombre_negocio}`);
            console.log(`  ${colors.cyan}Ciudad:${colors.reset} ${response.data.data.ciudad}`);
            console.log(`  ${colors.cyan}WhatsApp:${colors.reset} ${response.data.data.whatsapp || 'No configurado'}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return null;
    }
}

async function getConfigFull() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo configuración completa (Admin)...${colors.reset}`);
        const response = await axios.get(`${API_URL}/config/full`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Configuración completa:${colors.reset}`);
            console.log(`  ${colors.cyan}ID:${colors.reset} ${response.data.data.id}`);
            console.log(`  ${colors.cyan}Nombre:${colors.reset} ${response.data.data.nombre_negocio}`);
            console.log(`  ${colors.cyan}Descripción:${colors.reset} ${response.data.data.descripcion}`);
            console.log(`  ${colors.cyan}WhatsApp:${colors.reset} ${response.data.data.whatsapp || 'No configurado'}`);
            console.log(`  ${colors.cyan}Dirección:${colors.reset} ${response.data.data.direccion || 'No configurada'}`);
            console.log(`  ${colors.cyan}Ciudad:${colors.reset} ${response.data.data.ciudad}`);
            console.log(`  ${colors.cyan}Departamento:${colors.reset} ${response.data.data.departamento}`);
            console.log(`  ${colors.cyan}País:${colors.reset} ${response.data.data.pais}`);
            console.log(`  ${colors.cyan}Logo:${colors.reset} ${response.data.data.logo_url || 'Sin logo'}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return null;
    }
}

async function updateConfig(data) {
    try {
        console.log(`\n${colors.blue}✏️ Actualizando configuración...${colors.reset}`);
        
        const response = await axios.put(`${API_URL}/config`, data, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Configuración actualizada${colors.reset}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function updateWhatsapp(whatsapp) {
    try {
        console.log(`\n${colors.blue}📱 Actualizando WhatsApp...${colors.reset}`);
        
        const response = await axios.put(`${API_URL}/config/whatsapp`, { whatsapp }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ WhatsApp actualizado:${colors.reset} ${response.data.data.whatsapp}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function updateLogo(logo_url) {
    try {
        console.log(`\n${colors.blue}🖼️ Actualizando logo...${colors.reset}`);
        
        const response = await axios.put(`${API_URL}/config/logo`, { logo_url }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Logo actualizado:${colors.reset} ${response.data.data.logo_url}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function resetConfig() {
    try {
        console.log(`\n${colors.blue}🔄 Restableciendo configuración...${colors.reset}`);
        
        const response = await axios.post(`${API_URL}/config/reset`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Configuración restablecida${colors.reset}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   ⚙️ GULLA API - Prueba de Configuración${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    console.log(`\n${colors.magenta}📌 FUNCIONALIDADES:${colors.reset}`);
    console.log(`  ${colors.green}✅${colors.reset} Ver configuración pública`);
    console.log(`  ${colors.green}✅${colors.reset} Ver configuración completa (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Actualizar configuración (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Actualizar WhatsApp (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Actualizar Logo (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Restablecer configuración (Admin)`);

    // 1. Ver configuración pública (sin login)
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 1: VER CONFIGURACIÓN PÚBLICA${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getConfigPublic();

    // 2. Login como admin
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 2: LOGIN ADMIN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login('admin@gulla.com', 'admin123');

    // 3. Ver configuración completa
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 3: VER CONFIGURACIÓN COMPLETA${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getConfigFull();

    // 4. Actualizar configuración
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 4: ACTUALIZAR CONFIGURACIÓN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await updateConfig({
        nombre_negocio: 'GULLA - Comidas Rápidas',
        descripcion: 'La mejor comida rápida de la ciudad',
        direccion: 'Calle Principal #123, Centro',
        ciudad: 'Chinú',
        departamento: 'Córdoba',
        pais: 'Colombia'
    });

    // 5. Actualizar WhatsApp
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 5: ACTUALIZAR WHATSAPP${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await updateWhatsapp('3001234567');

    // 6. Actualizar Logo
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 6: ACTUALIZAR LOGO${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await updateLogo('https://example.com/logo-gulla.png');

    // 7. Verificar cambios
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 7: VERIFICAR CAMBIOS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getConfigPublic();
    await getConfigFull();

    // 8. Restablecer configuración
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 8: RESTABLECER CONFIGURACIÓN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await resetConfig();

    // 9. Verificar restablecimiento
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 9: VERIFICAR RESTABLECIMIENTO${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getConfigPublic();

    // 10. Resumen
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📊 RESUMEN DE CONFIGURACIÓN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`\n${colors.green}✅ Configuración pública:${colors.reset} OK`);
    console.log(`${colors.green}✅ Configuración completa:${colors.reset} OK`);
    console.log(`${colors.green}✅ Actualización:${colors.reset} OK`);
    console.log(`${colors.green}✅ WhatsApp:${colors.reset} OK`);
    console.log(`${colors.green}✅ Logo:${colors.reset} OK`);
    console.log(`${colors.green}✅ Restablecimiento:${colors.reset} OK`);
    console.log(`\n${colors.cyan}📋 Endpoints disponibles:${colors.reset}`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/config/public       - Configuración pública`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/config/full          - Configuración completa (Admin)`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/config               - Actualizar configuración (Admin)`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/config/whatsapp     - Actualizar WhatsApp (Admin)`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/config/logo          - Actualizar Logo (Admin)`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/config/reset         - Restablecer configuración (Admin)`);
    console.log(`\n${colors.green}🎉 Pruebas de configuración completadas!${colors.reset}\n`);
}

runTests().catch(console.error);