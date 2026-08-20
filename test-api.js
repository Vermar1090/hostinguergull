const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

// Función para hacer peticiones
async function testEndpoint(name, method, endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const startTime = Date.now();
    
    try {
        console.log(`\n${colors.blue}📡 Probando:${colors.reset} ${name}`);
        console.log(`${colors.cyan}   ${method} ${url}${colors.reset}`);
        
        const config = {
            method: method,
            url: url,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            timeout: 5000,
            ...options
        };
        
        const response = await axios(config);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (response.status >= 200 && response.status < 300) {
            console.log(`${colors.green}✅ Éxito${colors.reset} - Status: ${response.status} (${responseTime}ms)`);
            if (response.data) {
                const dataStr = JSON.stringify(response.data, null, 2);
                console.log(`${colors.cyan}   Respuesta:${colors.reset}`);
                console.log(dataStr.substring(0, 500) + (dataStr.length > 500 ? '...' : ''));
            }
            return { success: true, data: response.data, status: response.status };
        } else {
            console.log(`${colors.red}❌ Error${colors.reset} - Status: ${response.status} (${responseTime}ms)`);
            if (response.data) {
                console.log(`${colors.red}   ${JSON.stringify(response.data, null, 2)}${colors.reset}`);
            }
            return { success: false, data: response.data, status: response.status };
        }
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (error.response) {
            console.log(`${colors.red}❌ Error${colors.reset} - Status: ${error.response.status} (${responseTime}ms)`);
            if (error.response.data) {
                console.log(`${colors.red}   ${JSON.stringify(error.response.data, null, 2)}${colors.reset}`);
            }
            return { success: false, data: error.response.data, status: error.response.status };
        } else if (error.request) {
            console.log(`${colors.red}❌ Error de conexión:${colors.reset} No se pudo conectar al servidor (${responseTime}ms)`);
            return { success: false, error: 'No se pudo conectar al servidor' };
        } else {
            console.log(`${colors.red}❌ Error:${colors.reset} ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

// Función principal de pruebas
async function runTests() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   🚀 GULLA API - Pruebas de Endpoints GET${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`📡 API URL: ${API_URL}\n`);

    const results = [];

    // === 1. PRUEBAS DE AUTENTICACIÓN ===
    console.log(`\n${colors.yellow}═══════ 🔐 AUTENTICACIÓN ═══════${colors.reset}`);
    
    // 1.1 Obtener información de la API
    const apiInfo = await testEndpoint(
        'Información de la API',
        'GET',
        '/'
    );
    results.push({ name: 'API Info', ...apiInfo });

    // === 2. PRUEBAS DE CATEGORÍAS ===
    console.log(`\n${colors.yellow}═══════ 📂 CATEGORÍAS ═══════${colors.reset}`);

    // 2.1 Obtener todas las categorías
    const categoriesAll = await testEndpoint(
        'Obtener todas las categorías',
        'GET',
        '/categories'
    );
    results.push({ name: 'Categorías - Todas', ...categoriesAll });

    // 2.2 Obtener categorías con subcategorías
    const categoriesWithSub = await testEndpoint(
        'Obtener categorías con subcategorías',
        'GET',
        '/categories?subcategorias=true'
    );
    results.push({ name: 'Categorías - Con subcategorías', ...categoriesWithSub });

    // 2.3 Obtener categorías activas
    const categoriesActive = await testEndpoint(
        'Obtener categorías activas',
        'GET',
        '/categories?activo=1'
    );
    results.push({ name: 'Categorías - Activas', ...categoriesActive });

    // 2.4 Obtener categoría por ID (si existe)
    if (categoriesAll.success && categoriesAll.data && categoriesAll.data.data && categoriesAll.data.data.length > 0) {
        const firstCategoryId = categoriesAll.data.data[0].id;
        const categoryById = await testEndpoint(
            `Obtener categoría ID: ${firstCategoryId}`,
            'GET',
            `/categories/${firstCategoryId}`
        );
        results.push({ name: 'Categoría - Por ID', ...categoryById });

        // 2.5 Obtener categoría con productos
        const categoryWithProducts = await testEndpoint(
            `Obtener categoría con productos (ID: ${firstCategoryId})`,
            'GET',
            `/categories/${firstCategoryId}?productos=true`
        );
        results.push({ name: 'Categoría - Con productos', ...categoryWithProducts });
    }

    // === 3. PRUEBAS DE SUBCATEGORÍAS ===
    console.log(`\n${colors.yellow}═══════ 📑 SUBCATEGORÍAS ═══════${colors.reset}`);

    // 3.1 Obtener todas las subcategorías
    const subAll = await testEndpoint(
        'Obtener todas las subcategorías',
        'GET',
        '/subcategories'
    );
    results.push({ name: 'Subcategorías - Todas', ...subAll });

    // 3.2 Obtener subcategorías activas
    const subActive = await testEndpoint(
        'Obtener subcategorías activas',
        'GET',
        '/subcategories?activo=1'
    );
    results.push({ name: 'Subcategorías - Activas', ...subActive });

    // 3.3 Obtener subcategorías por categoría
    if (categoriesAll.success && categoriesAll.data && categoriesAll.data.data && categoriesAll.data.data.length > 0) {
        const firstCategoryId = categoriesAll.data.data[0].id;
        const subByCategory = await testEndpoint(
            `Obtener subcategorías de categoría ID: ${firstCategoryId}`,
            'GET',
            `/subcategories?categoria_id=${firstCategoryId}`
        );
        results.push({ name: 'Subcategorías - Por categoría', ...subByCategory });

        // 3.4 Obtener subcategoría por ID (si existe)
        if (subByCategory.success && subByCategory.data && subByCategory.data.data && subByCategory.data.data.length > 0) {
            const firstSubId = subByCategory.data.data[0].id;
            const subById = await testEndpoint(
                `Obtener subcategoría ID: ${firstSubId}`,
                'GET',
                `/subcategories/${firstSubId}`
            );
            results.push({ name: 'Subcategoría - Por ID', ...subById });

            // 3.5 Obtener subcategoría con productos
            const subWithProducts = await testEndpoint(
                `Obtener subcategoría con productos (ID: ${firstSubId})`,
                'GET',
                `/subcategories/${firstSubId}?productos=true`
            );
            results.push({ name: 'Subcategoría - Con productos', ...subWithProducts });
        }
    }

    // === 4. PRUEBAS DE PRODUCTOS ===
    console.log(`\n${colors.yellow}═══════ 🛍️ PRODUCTOS ═══════${colors.reset}`);

    // 4.1 Obtener todos los productos
    const productsAll = await testEndpoint(
        'Obtener todos los productos',
        'GET',
        '/products'
    );
    results.push({ name: 'Productos - Todos', ...productsAll });

    // 4.2 Obtener productos activos
    const productsActive = await testEndpoint(
        'Obtener productos activos',
        'GET',
        '/products?activo=1'
    );
    results.push({ name: 'Productos - Activos', ...productsActive });

    // 4.3 Obtener productos en oferta
    const productsOfertas = await testEndpoint(
        'Obtener productos en oferta',
        'GET',
        '/products/ofertas'
    );
    results.push({ name: 'Productos - Ofertas', ...productsOfertas });

    // 4.4 Obtener productos por puntos
    const productsByPoints = await testEndpoint(
        'Obtener productos por puntos (mínimo 50)',
        'GET',
        '/products/puntos?min_points=50'
    );
    results.push({ name: 'Productos - Por puntos', ...productsByPoints });

    // 4.5 Obtener categorías con conteo
    const categoriesWithCount = await testEndpoint(
        'Obtener categorías con conteo de productos',
        'GET',
        '/products/categories-with-count'
    );
    results.push({ name: 'Categorías - Con conteo', ...categoriesWithCount });

    // 4.6 Obtener producto por ID (si existe)
    if (productsAll.success && productsAll.data && productsAll.data.data && productsAll.data.data.length > 0) {
        const firstProductId = productsAll.data.data[0].id;
        const productById = await testEndpoint(
            `Obtener producto ID: ${firstProductId}`,
            'GET',
            `/products/${firstProductId}`
        );
        results.push({ name: 'Producto - Por ID', ...productById });

        // 4.7 Obtener productos relacionados
        const relatedProducts = await testEndpoint(
            `Obtener productos relacionados (ID: ${firstProductId})`,
            'GET',
            `/products/${firstProductId}/related?limit=4`
        );
        results.push({ name: 'Productos - Relacionados', ...relatedProducts });
    }

    // 4.8 Productos con filtros
    if (categoriesAll.success && categoriesAll.data && categoriesAll.data.data && categoriesAll.data.data.length > 0) {
        const firstCategoryId = categoriesAll.data.data[0].id;
        const productsByCategory = await testEndpoint(
            `Obtener productos por categoría ID: ${firstCategoryId}`,
            'GET',
            `/products?categoria_id=${firstCategoryId}&activo=1`
        );
        results.push({ name: 'Productos - Por categoría', ...productsByCategory });
    }

    // 4.9 Búsqueda de productos
    const productsSearch = await testEndpoint(
        'Buscar productos por nombre (búsqueda: "hamburguesa")',
        'GET',
        '/products?search=hamburguesa'
    );
    results.push({ name: 'Productos - Búsqueda', ...productsSearch });

    // === 5. RESUMEN FINAL ===
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📊 RESUMEN DE PRUEBAS${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n${colors.blue}📋 Total de pruebas:${colors.reset} ${totalTests}`);
    console.log(`${colors.green}✅ Exitosas:${colors.reset} ${passedTests}`);
    console.log(`${colors.red}❌ Fallidas:${colors.reset} ${failedTests}`);

    console.log(`\n${colors.yellow}📋 Detalle:${colors.reset}`);
    results.forEach(r => {
        const status = r.success ? `${colors.green}✅` : `${colors.red}❌`;
        console.log(`  ${status} ${r.name} - ${r.success ? 'OK' : 'ERROR'}`);
    });

    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}🎉 Pruebas completadas!${colors.reset}\n`);
}

// Ejecutar pruebas
runTests().catch(error => {
    console.error(`${colors.red}Error en las pruebas:${colors.reset}`, error);
});