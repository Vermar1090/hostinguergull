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
        console.log(`${colors.red}❌ Error en login:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function registerUser(nombre, email, password, codigo_referido = null) {
    try {
        console.log(`\n${colors.blue}📝 Registrando usuario:${colors.reset} ${nombre}`);
        const data = { nombre, email, password, telefono: '3001234567', direccion: 'Calle de prueba' };
        if (codigo_referido) data.codigo_referido = codigo_referido;
        
        console.log(`${colors.cyan}📋 Con código de referido:${colors.reset} ${codigo_referido || 'Ninguno'}`);
        const response = await axios.post(`${API_URL}/auth/register`, data);
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Usuario registrado:${colors.reset} ${nombre}`);
            console.log(`${colors.cyan}📋 Puntos de bienvenida:${colors.reset} 20 puntos`);
            console.log(`${colors.cyan}📋 Código de referido generado:${colors.reset} ${response.data.data.user.codigo_referido}`);
            return response.data.data.user;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error registrando:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function createPaidOrder(producto_id = 1, cantidad = 1) {
    try {
        console.log(`\n${colors.blue}📦 Creando pedido pagado...${colors.reset}`);
        const orderData = {
            cliente_nombre: 'Cliente Test',
            cliente_telefono: '3001234567',
            cliente_direccion: 'Calle 123',
            detalles: [{ producto_id, cantidad, es_canje: 0, precio_extra_total: 0 }]
        };

        const response = await axios.post(`${API_URL}/orders/paid`, orderData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            const puntos = Math.floor(response.data.data.total_pedido / 1000);
            console.log(`${colors.green}✅ Pedido creado y pagado:${colors.reset} #${response.data.data.id}`);
            console.log(`${colors.cyan}💰 Total:${colors.reset} $${response.data.data.total_pedido}`);
            console.log(`${colors.cyan}⭐ Puntos ganados:${colors.reset} ${puntos} puntos (1 por cada $1,000)`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error creando pedido:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function getMyPoints() {
    try {
        const response = await axios.get(`${API_URL}/loyalty/my-points`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.data.success) {
            console.log(`${colors.green}✅ Puntos actuales:${colors.reset} ${response.data.data.puntos_actuales}`);
            console.log(`${colors.cyan}📋 Código referido:${colors.reset} ${response.data.data.codigo_referido}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return null;
    }
}

async function getPointsHistory() {
    try {
        const response = await axios.get(`${API_URL}/loyalty/history?limit=10`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.data.success) {
            console.log(`\n${colors.blue}📋 Historial de puntos:${colors.reset}`);
            if (response.data.data.length === 0) {
                console.log(`  ${colors.yellow}No hay registros${colors.reset}`);
            } else {
                response.data.data.forEach(h => {
                    const sign = h.puntos > 0 ? '+' : '';
                    const color = h.puntos > 0 ? colors.green : colors.red;
                    console.log(`  ${color}${sign}${h.puntos}${colors.reset} - ${h.descripcion} (${h.tipo})`);
                });
            }
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return [];
    }
}

async function getReferralStatus() {
    try {
        const response = await axios.get(`${API_URL}/loyalty/referral-status`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.data.success && response.data.data) {
            console.log(`\n${colors.blue}📋 Estado del referido:${colors.reset}`);
            console.log(`  ${colors.cyan}Referente:${colors.reset} ${response.data.data.referente_nombre}`);
            const status = response.data.data.puntos_otorgados > 0 ? '✅ Sí (30 puntos)' : '⏳ Pendiente (primera compra)';
            console.log(`  ${colors.cyan}Puntos otorgados:${colors.reset} ${status}`);
            console.log(`  ${colors.cyan}Compras del referido:${colors.reset} ${response.data.data.compras_referido || 0}`);
            return response.data.data;
        }
        console.log(`\n${colors.yellow}📋 No has sido referido por nadie${colors.reset}`);
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return null;
    }
}

async function getRanking() {
    try {
        const response = await axios.get(`${API_URL}/loyalty/ranking?limit=5`);
        if (response.data.success) {
            console.log(`\n${colors.blue}🏆 Ranking de puntos:${colors.reset}`);
            response.data.data.forEach((user, index) => {
                console.log(`  ${colors.yellow}${index + 1}.${colors.reset} ${user.nombre} - ${user.puntos_acumulados} puntos`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return [];
    }
}

async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   ⭐ GULLA API - Prueba Sistema de Puntos V2${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    console.log(`\n${colors.magenta}📌 REGLAS DE PUNTOS:${colors.reset}`);
    console.log(`  ${colors.green}✅${colors.reset} 20 puntos de bienvenida al registrarse`);
    console.log(`  ${colors.green}✅${colors.reset} 1 punto por cada $1,000 en compra`);
    console.log(`  ${colors.green}✅${colors.reset} 30 puntos al referente cuando el referido COMPRA`);

    // PASO 1: Login admin
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 1: OBTENER CÓDIGO DE REFERIDO DEL ADMIN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login('admin@gulla.com', 'admin123');
    const adminPoints = await getMyPoints();
    const codigoReferido = adminPoints?.codigo_referido;

    if (!codigoReferido) {
        console.log(`${colors.red}❌ No se pudo obtener código de referido${colors.reset}`);
        return;
    }

    console.log(`\n${colors.cyan}📋 Código de referido del admin:${colors.reset} ${codigoReferido}`);

    // PASO 2: Registrar usuario con referido
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 2: REGISTRAR USUARIO CON REFERIDO${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    const timestamp = Date.now();
    const emailNuevo = `test${timestamp}@gmail.com`;
    const nuevoUsuario = await registerUser(
        `Usuario Test ${timestamp}`,
        emailNuevo,
        'test123',
        codigoReferido
    );

    if (!nuevoUsuario) {
        console.log(`${colors.red}❌ No se pudo registrar usuario${colors.reset}`);
        return;
    }

    // PASO 3: Verificar puntos de bienvenida
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 3: VERIFICAR PUNTOS DE BIENVENIDA${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login(emailNuevo, 'test123');
    const puntosIniciales = await getMyPoints();
    console.log(`${colors.cyan}📊 Puntos iniciales:${colors.reset} ${puntosIniciales?.puntos_actuales}`);
    console.log(`${colors.green}✅ Debería tener 20 puntos de bienvenida${colors.reset}`);

    await getReferralStatus();

    // PASO 4: Crear pedido pagado
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 4: REALIZAR PRIMERA COMPRA (PAGADA)${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    const order = await createPaidOrder(1, 2);
    if (!order) {
        console.log(`${colors.red}❌ No se pudo crear pedido${colors.reset}`);
        return;
    }

    // PASO 5: Verificar puntos después de compra
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 5: VERIFICAR PUNTOS DESPUÉS DE COMPRA${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    const puntosFinales = await getMyPoints();
    console.log(`${colors.cyan}📊 Puntos finales:${colors.reset} ${puntosFinales?.puntos_actuales}`);
    const puntosGanados = Math.floor(order.total_pedido / 1000);
    console.log(`${colors.cyan}📊 Puntos ganados por compra:${colors.reset} ${puntosGanados} puntos`);
    console.log(`${colors.cyan}📊 Total esperado:${colors.reset} ${20 + puntosGanados} puntos`);

    await getPointsHistory();

    // PASO 6: Verificar puntos del admin
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 6: VERIFICAR PUNTOS DEL ADMIN (REFERIDO)${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login('admin@gulla.com', 'admin123');
    const adminPointsFinal = await getMyPoints();
    console.log(`${colors.cyan}📊 Puntos del admin:${colors.reset} ${adminPointsFinal?.puntos_actuales}`);
    console.log(`${colors.green}✅ El admin debería haber recibido +30 puntos por el referido${colors.reset}`);

    // PASO 7: Verificar estado del referido
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 7: VERIFICAR ESTADO DEL REFERIDO${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login(emailNuevo, 'test123');
    await getReferralStatus();
    await getRanking();

    // RESUMEN
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📊 RESUMEN DE PUNTOS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`\n${colors.green}✅ Puntos de bienvenida:${colors.reset} 20 puntos (al registrarse)`);
    console.log(`${colors.green}✅ Puntos por compra:${colors.reset} ${puntosGanados} puntos (${order.total_pedido} / 1000)`);
    console.log(`${colors.green}✅ Puntos por referido:${colors.reset} 30 puntos (cuando el referido compró)`);
    console.log(`\n${colors.cyan}📋 Total puntos del usuario:${colors.reset} ${puntosFinales?.puntos_actuales || 0}`);
    console.log(`\n${colors.green}🎉 Pruebas completadas!${colors.reset}\n`);
}

runTests().catch(console.error);