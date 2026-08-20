const axios = require('axios');
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

let authToken = null;

async function login() {
    try {
        console.log(`${colors.blue}🔐 Iniciando sesión...${colors.reset}`);
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@gulla.com',
            password: 'admin123'
        });
        
        if (response.data.success) {
            authToken = response.data.data.token;
            console.log(`${colors.green}✅ Login exitoso${colors.reset}`);
            return authToken;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error en login:${colors.reset}`, error.message);
        return null;
    }
}

async function getMyPoints() {
    try {
        console.log(`\n${colors.blue}⭐ Obteniendo mis puntos...${colors.reset}`);
        
        const response = await axios.get(`${API_URL}/loyalty/my-points`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Puntos obtenidos:${colors.reset} ${response.data.data.puntos_actuales}`);
            console.log(`${colors.cyan}📋 Código referido:${colors.reset} ${response.data.data.codigo_referido}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo puntos:${colors.reset}`, error.message);
        return null;
    }
}

async function getRedeemableProducts() {
    try {
        console.log(`\n${colors.blue}🛍️ Obteniendo productos canjeables...${colors.reset}`);
        
        const response = await axios.get(`${API_URL}/loyalty/redeemable`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Productos canjeables:${colors.reset} ${response.data.total}`);
            response.data.data.forEach(p => {
                console.log(`  ${colors.cyan}-${colors.reset} ${p.nombre} (${p.puntos_canjeables} puntos)`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo productos:${colors.reset}`, error.message);
        return [];
    }
}

async function getRanking() {
    try {
        console.log(`\n${colors.blue}🏆 Obteniendo ranking de puntos...${colors.reset}`);
        
        const response = await axios.get(`${API_URL}/loyalty/ranking?limit=5`);
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Ranking obtenido:${colors.reset}`);
            response.data.data.forEach((user, index) => {
                console.log(`  ${colors.yellow}${index + 1}.${colors.reset} ${user.nombre} - ${user.puntos_acumulados} puntos`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo ranking:${colors.reset}`, error.message);
        return [];
    }
}

async function getPointsHistory() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo historial de puntos...${colors.reset}`);
        
        const response = await axios.get(`${API_URL}/loyalty/history?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Historial obtenido:${colors.reset} ${response.data.total} registros`);
            response.data.data.forEach(h => {
                const sign = h.puntos > 0 ? '+' : '';
                const color = h.puntos > 0 ? colors.green : colors.red;
                console.log(`  ${color}${sign}${h.puntos}${colors.reset} - ${h.descripcion} (${h.tipo})`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo historial:${colors.reset}`, error.message);
        return [];
    }
}

async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   ⭐ GULLA API - Pruebas de Sistema de Puntos${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    // Login
    await login();
    
    if (!authToken) {
        console.log(`${colors.red}❌ No se pudo autenticar.${colors.reset}`);
        return;
    }

    // 1. Obtener mis puntos
    const points = await getMyPoints();
    
    // 2. Obtener productos canjeables
    await getRedeemableProducts();
    
    // 3. Obtener ranking
    await getRanking();
    
    // 4. Obtener historial
    await getPointsHistory();

    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}🎉 Pruebas de puntos completadas!${colors.reset}`);
    console.log(`\n${colors.blue}📝 Endpoints de puntos disponibles:${colors.reset}`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/loyalty/my-points     - Mis puntos`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/loyalty/history        - Historial de puntos`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/loyalty/redeemable     - Productos canjeables`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/loyalty/redeem         - Canjear producto`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/loyalty/referral       - Aplicar código referido`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/loyalty/ranking        - Ranking de usuarios`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/loyalty/stats          - Estadísticas (Admin)`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/loyalty/add            - Agregar puntos (Admin)`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/loyalty/transfer       - Transferir puntos (Admin)`);
    console.log(`\n`);
}

runTests().catch(console.error);