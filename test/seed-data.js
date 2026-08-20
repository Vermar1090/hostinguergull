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

// Configuración - Cambia estos valores según tu usuario admin
const ADMIN_USER = {
    email: 'admin@gulla.com',
    password: 'admin123'
};

let authToken = null;

// Función para hacer login y obtener token
async function login() {
    try {
        console.log(`${colors.blue}🔐 Iniciando sesión como administrador...${colors.reset}`);
        const response = await axios.post(`${API_URL}/auth/login`, ADMIN_USER);
        
        if (response.data.success && response.data.data.token) {
            authToken = response.data.data.token;
            console.log(`${colors.green}✅ Login exitoso${colors.reset}`);
            return authToken;
        } else {
            console.log(`${colors.red}❌ Error en login:${colors.reset}`, response.data.message);
            return null;
        }
    } catch (error) {
        console.log(`${colors.red}❌ Error en login:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para crear categoría
async function createCategory(nombre, descripcion, imagen_url = null, orden = 0) {
    try {
        const response = await axios.post(
            `${API_URL}/categories`,
            { nombre, descripcion, imagen_url, orden, activo: 1 },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Categoría creada:${colors.reset} ${nombre}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message.includes('ya existe')) {
            console.log(`${colors.yellow}⚠️  Categoría ya existe:${colors.reset} ${nombre}`);
            // Buscar la categoría existente
            const categories = await getCategories();
            return categories.find(c => c.nombre === nombre);
        }
        console.log(`${colors.red}❌ Error creando categoría ${nombre}:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para obtener categorías
async function getCategories() {
    try {
        const response = await axios.get(`${API_URL}/categories`);
        if (response.data.success) {
            return response.data.data;
        }
        return [];
    } catch (error) {
        console.log(`${colors.red}❌ Error obteniendo categorías:${colors.reset}`, error.message);
        return [];
    }
}

// Función para crear subcategoría
async function createSubcategory(categoria_id, nombre, descripcion, orden = 0) {
    try {
        const response = await axios.post(
            `${API_URL}/subcategories`,
            { categoria_id, nombre, descripcion, orden, activo: 1 },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Subcategoría creada:${colors.reset} ${nombre}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message.includes('ya existe')) {
            console.log(`${colors.yellow}⚠️  Subcategoría ya existe:${colors.reset} ${nombre}`);
            return null;
        }
        console.log(`${colors.red}❌ Error creando subcategoría ${nombre}:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para crear producto
async function createProduct(data) {
    try {
        const response = await axios.post(
            `${API_URL}/products`,
            data,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Producto creado:${colors.reset} ${data.nombre}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.message.includes('ya existe')) {
            console.log(`${colors.yellow}⚠️  Producto ya existe:${colors.reset} ${data.nombre}`);
            return null;
        }
        console.log(`${colors.red}❌ Error creando producto ${data.nombre}:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para agregar imagen a producto
async function addProductImage(producto_id, imagen_url, orden = 0) {
    try {
        const response = await axios.post(
            `${API_URL}/products/${producto_id}/images`,
            { imagen_url, orden },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Imagen agregada al producto ID:${colors.reset} ${producto_id}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error agregando imagen:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para agregar opción de personalización
async function addProductOption(producto_id, nombre_grupo, tipo = 'opcion_unica', obligatorio = 1, max_selecciones = 1) {
    try {
        const response = await axios.post(
            `${API_URL}/products/${producto_id}/options`,
            { nombre_grupo, tipo, obligatorio, max_selecciones, activo: 1 },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Opción agregada al producto:${colors.reset} ${nombre_grupo}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error agregando opción:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para agregar valor a opción
async function addOptionValue(opcion_grupo_id, valor, precio_extra = 0, stock_disponible = 999) {
    try {
        const response = await axios.post(
            `${API_URL}/products/options/${opcion_grupo_id}/values`,
            { valor, precio_extra, stock_disponible, activo: 1 },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Valor agregado a opción:${colors.reset} ${valor}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error agregando valor a opción:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para agregar extra a producto
async function addProductExtra(producto_id, extra_nombre, precio_extra, max_por_pedido = 3) {
    try {
        const response = await axios.post(
            `${API_URL}/products/${producto_id}/extras`,
            { extra_nombre, precio_extra, max_por_pedido, activo: 1 },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Extra agregado al producto:${colors.reset} ${extra_nombre}`);
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error agregando extra:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función para registrar entrada de stock
async function updateStock(producto_id, cantidad, tipo_movimiento = 'Entrada', precio_unitario = 0) {
    try {
        const response = await axios.post(
            `${API_URL}/products/${producto_id}/stock`,
            { cantidad, tipo_movimiento, precio_unitario },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );
        
        if (response.data.success) {
            console.log(`${colors.green}✅ Stock actualizado:${colors.reset} ${cantidad} unidades (${tipo_movimiento})`);
            return response.data;
        }
        return null;
    } catch (error) {
        console.log(`${colors.red}❌ Error actualizando stock:${colors.reset}`, error.response?.data?.message || error.message);
        return null;
    }
}

// Función principal
async function seedDatabase() {
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   🌱 GULLA API - Carga de Datos de Prueba${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);

    // 1. Login
    const token = await login();
    if (!token) {
        console.log(`${colors.red}❌ No se pudo autenticar. Verifica las credenciales.${colors.reset}`);
        return;
    }

    // 2. Crear Categorías
    console.log(`\n${colors.yellow}═══════ 📂 CREANDO CATEGORÍAS ═══════${colors.reset}`);
    
    const categoriasData = [
        { nombre: 'Hamburguesas', descripcion: 'Deliciosas hamburguesas gourmet', imagen_url: 'https://example.com/hamburguesas.jpg', orden: 1 },
        { nombre: 'Pizzas', descripcion: 'Pizzas artesanales con ingredientes frescos', imagen_url: 'https://example.com/pizzas.jpg', orden: 2 },
        { nombre: 'Bebidas', descripcion: 'Bebidas refrescantes y naturales', imagen_url: 'https://example.com/bebidas.jpg', orden: 3 },
        { nombre: 'Postres', descripcion: 'Postres caseros y deliciosos', imagen_url: 'https://example.com/postres.jpg', orden: 4 },
        { nombre: 'Combos', descripcion: 'Combos especiales con descuento', imagen_url: 'https://example.com/combos.jpg', orden: 5 },
    ];

    const categoriasCreadas = [];
    for (const cat of categoriasData) {
        const result = await createCategory(cat.nombre, cat.descripcion, cat.imagen_url, cat.orden);
        if (result) categoriasCreadas.push(result);
    }

    // 3. Crear Subcategorías
    console.log(`\n${colors.yellow}═══════ 📑 CREANDO SUBCATEGORÍAS ═══════${colors.reset}`);
    
    // Obtener IDs de categorías
    const categories = await getCategories();
    const catMap = {};
    categories.forEach(c => { catMap[c.nombre] = c.id; });

    const subcategoriasData = [
        // Hamburguesas
        { categoria: 'Hamburguesas', nombre: 'Clásicas', descripcion: 'Hamburguesas tradicionales', orden: 1 },
        { categoria: 'Hamburguesas', nombre: 'Gourmet', descripcion: 'Hamburguesas con ingredientes premium', orden: 2 },
        { categoria: 'Hamburguesas', nombre: 'Vegetarianas', descripcion: 'Opciones sin carne', orden: 3 },
        // Pizzas
        { categoria: 'Pizzas', nombre: 'Pizzas Clásicas', descripcion: 'Pizzas tradicionales', orden: 1 },
        { categoria: 'Pizzas', nombre: 'Pizzas Especiales', descripcion: 'Pizzas con ingredientes especiales', orden: 2 },
        // Bebidas
        { categoria: 'Bebidas', nombre: 'Gaseosas', descripcion: 'Bebidas carbonatadas', orden: 1 },
        { categoria: 'Bebidas', nombre: 'Jugos Naturales', descripcion: 'Jugos de frutas frescas', orden: 2 },
        { categoria: 'Bebidas', nombre: 'Malteadas', descripcion: 'Malteadas cremosas', orden: 3 },
        // Postres
        { categoria: 'Postres', nombre: 'Pasteles', descripcion: 'Pasteles artesanales', orden: 1 },
        { categoria: 'Postres', nombre: 'Helados', descripcion: 'Helados artesanales', orden: 2 },
        // Combos
        { categoria: 'Combos', nombre: 'Combos Familiares', descripcion: 'Combos para compartir', orden: 1 },
        { categoria: 'Combos', nombre: 'Combos Individuales', descripcion: 'Combos para una persona', orden: 2 },
    ];

    for (const sub of subcategoriasData) {
        const catId = catMap[sub.categoria];
        if (catId) {
            await createSubcategory(catId, sub.nombre, sub.descripcion, sub.orden);
        } else {
            console.log(`${colors.yellow}⚠️  Categoría no encontrada:${colors.reset} ${sub.categoria}`);
        }
    }

    // 4. Crear Productos
    console.log(`\n${colors.yellow}═══════ 🛍️ CREANDO PRODUCTOS ═══════${colors.reset}`);

    const productosData = [
        {
            nombre: 'Hamburguesa Clásica',
            categoria: 'Hamburguesas',
            subcategoria: 'Clásicas',
            unidad_medida: 'Unidad',
            precio_venta: 15000,
            puntos_canjeables: 0,
            descripcion: 'Hamburguesa con carne de res, lechuga, tomate, cebolla y salsas',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Hamburguesa Doble',
            categoria: 'Hamburguesas',
            subcategoria: 'Clásicas',
            unidad_medida: 'Unidad',
            precio_venta: 22000,
            puntos_canjeables: 0,
            descripcion: 'Hamburguesa con dos carnes, queso, lechuga, tomate y cebolla',
            es_oferta: 1,
            precio_oferta: 18000,
            disponible_tienda: 1
        },
        {
            nombre: 'Hamburguesa Gourmet',
            categoria: 'Hamburguesas',
            subcategoria: 'Gourmet',
            unidad_medida: 'Unidad',
            precio_venta: 28000,
            puntos_canjeables: 50,
            descripcion: 'Hamburguesa con carne Angus, queso cheddar, bacon, lechuga y tomate',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Pizza Margarita',
            categoria: 'Pizzas',
            subcategoria: 'Pizzas Clásicas',
            unidad_medida: 'Unidad',
            precio_venta: 25000,
            puntos_canjeables: 30,
            descripcion: 'Pizza con salsa de tomate, mozzarella y albahaca',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Pizza Pepperoni',
            categoria: 'Pizzas',
            subcategoria: 'Pizzas Clásicas',
            unidad_medida: 'Unidad',
            precio_venta: 30000,
            puntos_canjeables: 40,
            descripcion: 'Pizza con salsa de tomate, mozzarella y pepperoni',
            es_oferta: 1,
            precio_oferta: 25000,
            disponible_tienda: 1
        },
        {
            nombre: 'Gaseosa Cola',
            categoria: 'Bebidas',
            subcategoria: 'Gaseosas',
            unidad_medida: 'Unidad',
            precio_venta: 5000,
            puntos_canjeables: 0,
            descripcion: 'Gaseosa de cola 500ml',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Jugo Natural de Naranja',
            categoria: 'Bebidas',
            subcategoria: 'Jugos Naturales',
            unidad_medida: 'Unidad',
            precio_venta: 8000,
            puntos_canjeables: 10,
            descripcion: 'Jugo fresco de naranja 500ml',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Malteada de Chocolate',
            categoria: 'Bebidas',
            subcategoria: 'Malteadas',
            unidad_medida: 'Unidad',
            precio_venta: 12000,
            puntos_canjeables: 15,
            descripcion: 'Malteada cremosa de chocolate con helado',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Pastel de Chocolate',
            categoria: 'Postres',
            subcategoria: 'Pasteles',
            unidad_medida: 'Porción',
            precio_venta: 10000,
            puntos_canjeables: 20,
            descripcion: 'Pastel de chocolate con cobertura',
            es_oferta: 0,
            disponible_tienda: 1
        },
        {
            nombre: 'Helado de Vainilla',
            categoria: 'Postres',
            subcategoria: 'Helados',
            unidad_medida: 'Bola',
            precio_venta: 6000,
            puntos_canjeables: 10,
            descripcion: 'Helado artesanal de vainilla',
            es_oferta: 0,
            disponible_tienda: 1
        }
    ];

    // Obtener subcategorías para mapear
    const subcategories = await axios.get(`${API_URL}/subcategories`);
    const subMap = {};
    if (subcategories.data.success) {
        subcategories.data.data.forEach(s => {
            subMap[s.nombre] = s.id;
        });
    }

    const productosCreados = [];
    for (const prod of productosData) {
        const categoriaId = catMap[prod.categoria];
        const subcategoriaId = subMap[prod.subcategoria];
        
        if (categoriaId) {
            const result = await createProduct({
                nombre: prod.nombre,
                categoria_id: categoriaId,
                subcategoria_id: subcategoriaId || null,
                unidad_medida: prod.unidad_medida,
                precio_venta: prod.precio_venta,
                puntos_canjeables: prod.puntos_canjeables || 0,
                descripcion: prod.descripcion,
                es_oferta: prod.es_oferta || 0,
                precio_oferta: prod.precio_oferta || null,
                disponible_tienda: prod.disponible_tienda,
                activo: 1
            });
            if (result) productosCreados.push(result);
        } else {
            console.log(`${colors.yellow}⚠️  Categoría no encontrada para:${colors.reset} ${prod.nombre}`);
        }
    }

    // 5. Agregar imágenes a algunos productos
    console.log(`\n${colors.yellow}═══════ 🖼️ AGREGANDO IMÁGENES ═══════${colors.reset}`);
    
    if (productosCreados.length > 0) {
        for (let i = 0; i < Math.min(5, productosCreados.length); i++) {
            const product = productosCreados[i];
            await addProductImage(
                product.id,
                `https://example.com/productos/${product.id}.jpg`,
                i
            );
        }
    }

    // 6. Agregar opciones de personalización a algunos productos
    console.log(`\n${colors.yellow}═══════ ⚙️ AGREGANDO OPCIONES ═══════${colors.reset}`);
    
    if (productosCreados.length > 0) {
        // Opciones para el primer producto (Hamburguesa Clásica)
        const product1 = productosCreados[0];
        if (product1) {
            const option1 = await addProductOption(product1.id, 'Tamaño', 'opcion_unica', 1, 1);
            if (option1) {
                await addOptionValue(option1.id, 'Pequeño', 0, 50);
                await addOptionValue(option1.id, 'Grande', 3000, 50);
                await addOptionValue(option1.id, 'Extra Grande', 5000, 30);
            }
            
            const option2 = await addProductOption(product1.id, 'Tipo de Pan', 'opcion_unica', 1, 1);
            if (option2) {
                await addOptionValue(option2.id, 'Normal', 0, 100);
                await addOptionValue(option2.id, 'Integral', 1000, 50);
                await addOptionValue(option2.id, 'Con Ajonjolí', 500, 50);
            }
        }

        // Opciones para Pizza
        const product4 = productosCreados.find(p => p.nombre === 'Pizza Margarita');
        if (product4) {
            const option3 = await addProductOption(product4.id, 'Tamaño', 'opcion_unica', 1, 1);
            if (option3) {
                await addOptionValue(option3.id, 'Personal', 0, 30);
                await addOptionValue(option3.id, 'Mediana', 8000, 30);
                await addOptionValue(option3.id, 'Grande', 15000, 20);
            }
        }
    }

    // 7. Agregar extras a algunos productos
    console.log(`\n${colors.yellow}═══════ ➕ AGREGANDO EXTRAS ═══════${colors.reset}`);
    
    if (productosCreados.length > 0) {
        const product1 = productosCreados[0];
        if (product1) {
            await addProductExtra(product1.id, 'Queso Extra', 2500, 3);
            await addProductExtra(product1.id, 'Bacon Extra', 3000, 3);
            await addProductExtra(product1.id, 'Huevo', 2000, 2);
        }

        const product4 = productosCreados.find(p => p.nombre === 'Pizza Margarita');
        if (product4) {
            await addProductExtra(product4.id, 'Queso Extra', 3000, 3);
            await addProductExtra(product4.id, 'Pepperoni', 4000, 3);
            await addProductExtra(product4.id, 'Champiñones', 3000, 3);
        }
    }

    // 8. Registrar entradas de stock
    console.log(`\n${colors.yellow}═══════ 📦 REGISTRANDO STOCK ═══════${colors.reset}`);
    
    for (const product of productosCreados) {
        await updateStock(
            product.id,
            Math.floor(Math.random() * 50) + 20, // Cantidad aleatoria entre 20-70
            'Entrada',
            Math.floor(product.precio_venta * 0.6) // Costo aproximado 60% del precio
        );
    }

    // 9. Resumen final
    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.yellow}   📊 RESUMEN DE CARGA${colors.reset}`);
    console.log(`${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    
    console.log(`\n${colors.green}✅ Categorías creadas:${colors.reset} ${categoriasCreadas.length}`);
    console.log(`${colors.green}✅ Productos creados:${colors.reset} ${productosCreados.length}`);
    console.log(`${colors.green}✅ Imágenes agregadas:${colors.reset} ${Math.min(5, productosCreados.length)}`);
    console.log(`${colors.green}✅ Opciones de personalización agregadas${colors.reset}`);
    console.log(`${colors.green}✅ Extras agregados${colors.reset}`);
    console.log(`${colors.green}✅ Stock registrado para todos los productos${colors.reset}`);

    console.log(`\n${colors.yellow}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}🎉 Datos de prueba cargados exitosamente!${colors.reset}`);
    console.log(`${colors.blue}📝 Puedes probar los endpoints GET nuevamente para ver los datos.${colors.reset}`);
    console.log(`${colors.cyan}🔗 http://localhost:3000/api/products${colors.reset}`);
    console.log(`\n`);
}

// Ejecutar
seedDatabase().catch(error => {
    console.error(`${colors.red}Error en la carga de datos:${colors.reset}`, error);
});