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

async function createTestOrder() {
    try {
        console.log(`\n${colors.blue}📦 Creando pedido de prueba...${colors.reset}`);
        
        const orderData = {
            cliente_nombre: 'Cliente Test',
            cliente_telefono: '3001234567',
            cliente_direccion: 'Calle 123 #45-67, Centro',
            observaciones: 'Entregar después de las 6pm',
            puntos_usados: 0,
            detalles: [
                {
                    producto_id: 1, // Asumiendo que existe un producto con ID 1
                    cantidad: 2,
                    es_canje: 0,
                    precio_extra_total: 0,
                    observaciones: 'Sin cebolla'
                }
            ]
        };

        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await axios.post(`${API_URL}/orders`, orderData, { headers });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Pedido creado exitosamente!${colors.reset}`);
            console.log(`${colors.cyan}📋 Pedido #:${colors.reset} ${response.data.data.id}`);
            console.log(`${colors.cyan}💰 Total:${colors.reset} $${response.data.data.total_pedido}`);
            console.log(`${colors.cyan}📊 Estado:${colors.reset} ${response.data.data.estado}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error creando pedido:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function getOrders() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo todos los pedidos...${colors.reset}`);
        
        const response = await axios.get(`${API_URL}/orders`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Pedidos obtenidos:${colors.reset} ${response.data.total || response.data.data.length}`);
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo pedidos:${colors.reset}`, error.message);
        return [];
    }
}

async function updateOrderStatus(orderId) {
    try {
        console.log(`\n${colors.blue}🔄 Actualizando estado del pedido #${orderId}...${colors.reset}`);
        
        const response = await axios.put(
            `${API_URL}/orders/${orderId}/status`,
            { estado: 'En Proceso' },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Estado actualizado a:${colors.reset} En Proceso`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`${colors.red}❌ Error actualizando estado:${colors.reset}`, error.message);
        return false;
    }
}

async function markAsPaid(orderId) {
    try {
        console.log(`\n${colors.blue}💰 Marcando pedido #${orderId} como pagado...${colors.reset}`);
        
        const response = await axios.put(
            `${API_URL}/orders/${orderId}/pay`,
            {},
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Pedido marcado como pagado${colors.reset}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`${colors.red}❌ Error marcando como pagado:${colors.reset}`, error.message);
        return false;
    }
}

async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📦 GULLA API - Pruebas de Pedidos${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    // Login
    await login();
    
    if (!authToken) {
        console.log(`${colors.red}❌ No se pudo autenticar. Continuando sin autenticación...${colors.reset}`);
    }

    // Crear pedido
    const order = await createTestOrder();
    
    if (order && authToken) {
        // Actualizar estado
        await updateOrderStatus(order.id);
        
        // Marcar como pagado
        await markAsPaid(order.id);
        
        // Obtener todos los pedidos
        await getOrders();
    }

    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}🎉 Pruebas de pedidos completadas!${colors.reset}`);
    console.log(`\n${colors.blue}📝 Endpoints de pedidos disponibles:${colors.reset}`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/orders           - Crear pedido`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/orders/guest     - Crear pedido anónimo`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/orders           - Listar pedidos (Admin/Empleado)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/orders/stats     - Estadísticas (Admin/Empleado)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/orders/:id       - Obtener pedido (Admin/Empleado)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/orders/my-orders - Mis pedidos (Usuario)`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/orders/:id/status - Actualizar estado`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/orders/:id/pay   - Marcar como pagado`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/orders/:id/cancel - Cancelar pedido`);
    console.log(`\n`);
}

runTests().catch(console.error);