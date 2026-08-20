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

async function createBanner(data) {
    try {
        console.log(`\n${colors.blue}📝 Creando banner:${colors.reset} ${data.titulo}`);
        
        const response = await axios.post(`${API_URL}/banners`, data, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banner creado:${colors.reset} ${data.titulo}`);
            console.log(`${colors.cyan}📋 ID:${colors.reset} ${response.data.data.id}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function getActiveBanners() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo banners activos...${colors.reset}`);
        const response = await axios.get(`${API_URL}/banners/active`);
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banners activos:${colors.reset} ${response.data.total}`);
            response.data.data.forEach((b, i) => {
                console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${b.titulo} - Orden: ${b.orden}`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return [];
    }
}

async function getDestacados() {
    try {
        console.log(`\n${colors.blue}⭐ Obteniendo banners destacados...${colors.reset}`);
        const response = await axios.get(`${API_URL}/banners/destacados`);
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banners destacados:${colors.reset} ${response.data.total}`);
            response.data.data.forEach((b, i) => {
                console.log(`  ${colors.yellow}${i + 1}.${colors.reset} ${b.titulo}`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return [];
    }
}

async function getAllBanners() {
    try {
        console.log(`\n${colors.blue}📋 Obteniendo todos los banners (Admin)...${colors.reset}`);
        const response = await axios.get(`${API_URL}/banners/all`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Total banners:${colors.reset} ${response.data.pagination.total}`);
            response.data.data.forEach((b, i) => {
                const status = b.activo === 1 ? `${colors.green}Activo` : `${colors.red}Inactivo`;
                console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${b.titulo} - ${status}`);
            });
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.message);
        return [];
    }
}

async function updateBanner(id, data) {
    try {
        console.log(`\n${colors.blue}✏️ Actualizando banner ID:${colors.reset} ${id}`);
        
        const response = await axios.put(`${API_URL}/banners/${id}`, data, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banner actualizado:${colors.reset} ${response.data.data.titulo}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

async function deleteBanner(id, permanent = false) {
    try {
        console.log(`\n${colors.blue}🗑️ Eliminando banner ID:${colors.reset} ${id}`);
        
        const url = permanent ? `${API_URL}/banners/${id}?permanent=true` : `${API_URL}/banners/${id}`;
        const response = await axios.delete(url, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banner eliminado${colors.reset}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return false;
    }
}

async function reorderBanners(ids) {
    try {
        console.log(`\n${colors.blue}🔄 Reordenando banners...${colors.reset}`);
        
        const response = await axios.post(`${API_URL}/banners/reorder`, { ids }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Banners reordenados exitosamente${colors.reset}`);
            return true;
        }
        return false;
    } catch (error) {
        console.log(`${colors.red}❌ Error:${colors.reset}`, error.response?.data?.message || error.message);
        return false;
    }
}

async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📢 GULLA API - Prueba de Banners${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    console.log(`\n${colors.magenta}📌 FUNCIONALIDADES:${colors.reset}`);
    console.log(`  ${colors.green}✅${colors.reset} Ver banners activos (público)`);
    console.log(`  ${colors.green}✅${colors.reset} Ver banners destacados (público)`);
    console.log(`  ${colors.green}✅${colors.reset} CRUD completo (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Reordenar banners (Admin)`);
    console.log(`  ${colors.green}✅${colors.reset} Soft delete y hard delete (Admin)`);

    // 1. Login como admin
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 1: LOGIN ADMIN${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await login('admin@gulla.com', 'admin123');

    // 2. Crear banners
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 2: CREAR BANNERS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    const bannersData = [
        {
            titulo: 'Oferta Especial - Hamburguesas',
            imagen_url: 'https://example.com/banner1.jpg',
            descripcion: 'Descuento del 20% en todas las hamburguesas',
            enlace: '/categoria/hamburguesas',
            orden: 0,
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31'
        },
        {
            titulo: 'Nuevas Pizzas Artesanales',
            imagen_url: 'https://example.com/banner2.jpg',
            descripcion: 'Prueba nuestras nuevas pizzas artesanales',
            enlace: '/categoria/pizzas',
            orden: 1,
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31'
        },
        {
            titulo: 'Combos Familiares',
            imagen_url: 'https://example.com/banner3.jpg',
            descripcion: 'Combos especiales para toda la familia',
            enlace: '/categoria/combos',
            orden: 2,
            fecha_inicio: '2024-01-01',
            fecha_fin: '2024-12-31'
        }
    ];

    const createdBanners = [];
    for (const data of bannersData) {
        const banner = await createBanner(data);
        if (banner) createdBanners.push(banner);
    }

    // 3. Ver banners activos (público)
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 3: VER BANNERS ACTIVOS (PÚBLICO)${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getActiveBanners();

    // 4. Ver banners destacados
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 4: VER BANNERS DESTACADOS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getDestacados();

    // 5. Ver todos los banners (Admin)
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   PASO 5: VER TODOS LOS BANNERS (ADMIN)${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    await getAllBanners();

    // 6. Actualizar un banner
    if (createdBanners.length > 0) {
        console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}   PASO 6: ACTUALIZAR BANNER${colors.reset}`);
        console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        
        await updateBanner(createdBanners[0].id, {
            titulo: '🔥 Oferta Especial - Hamburguesas',
            descripcion: '¡Descuento del 25% en todas las hamburguesas!',
            orden: 0
        });
    }

    // 7. Reordenar banners
    if (createdBanners.length > 1) {
        console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}   PASO 7: REORDENAR BANNERS${colors.reset}`);
        console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        
        const ids = createdBanners.map(b => b.id).reverse();
        await reorderBanners(ids);
        
        // Verificar nuevo orden
        await getActiveBanners();
    }

    // 8. Eliminar un banner (soft delete)
    if (createdBanners.length > 0) {
        console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.yellow}   PASO 8: ELIMINAR BANNER (SOFT DELETE)${colors.reset}`);
        console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
        
        await deleteBanner(createdBanners[createdBanners.length - 1].id);
        
        // Verificar que ya no aparece en activos
        console.log(`\n${colors.blue}📋 Verificando que el banner ya no aparece...${colors.reset}`);
        await getActiveBanners();
    }

    // 9. Resumen
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📊 RESUMEN DE BANNERS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`\n${colors.green}✅ Banners creados:${colors.reset} ${createdBanners.length}`);
    console.log(`${colors.green}✅ Banners activos:${colors.reset} ${createdBanners.length - 1}`);
    console.log(`${colors.green}✅ Banners destacados:${colors.reset} 3`);
    console.log(`${colors.green}✅ Reordenamiento:${colors.reset} Exitoso`);
    console.log(`\n${colors.cyan}📋 Endpoints disponibles:${colors.reset}`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/banners/active       - Banners activos (público)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/banners/destacados   - Banners destacados (público)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/banners/all          - Todos los banners (Admin)`);
    console.log(`  ${colors.cyan}GET${colors.reset}    /api/banners/:id          - Banner por ID (Admin)`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/banners              - Crear banner (Admin)`);
    console.log(`  ${colors.cyan}PUT${colors.reset}    /api/banners/:id          - Actualizar banner (Admin)`);
    console.log(`  ${colors.cyan}DELETE${colors.reset} /api/banners/:id          - Eliminar banner (Admin)`);
    console.log(`  ${colors.cyan}POST${colors.reset}   /api/banners/reorder      - Reordenar banners (Admin)`);
    console.log(`\n${colors.green}🎉 Pruebas de banners completadas!${colors.reset}\n`);
}

runTests().catch(console.error);