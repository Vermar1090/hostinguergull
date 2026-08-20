-- ============================================================
-- Schema MySQL (convertido desde SQLite) - Sistema GULLA
-- Nota: la tabla `banners` estaba duplicada en el original
-- (punto 10 y punto 15). Se fusionó usando la versión más
-- completa (con el campo `enlace`).
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    usuario VARCHAR(100) UNIQUE,                -- Nombre de inicio de sesión (admin/empleado)
    email VARCHAR(150) UNIQUE,                  -- Email para registro clientes
    password VARCHAR(255),                      -- Contraseña encriptada (Hash)
    telefono VARCHAR(30),
    direccion VARCHAR(255),
    barrio VARCHAR(100),
    rol ENUM('Administrador', 'Empleado', 'Cliente') DEFAULT 'Cliente',
    puntos_acumulados INT DEFAULT 0,
    codigo_referido VARCHAR(50) UNIQUE NOT NULL,
    google_id VARCHAR(100) UNIQUE,
    activo TINYINT(1) DEFAULT 1,                -- 1 = Activo, 0 = Suspendido
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(255),
    orden INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2.1 Tabla de Subcategorías
CREATE TABLE IF NOT EXISTS subcategorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    categoria_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    orden INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2.2 Tabla de Productos (Insumos, Desechables, etc.)
CREATE TABLE IF NOT EXISTS productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    categoria_id INT,
    subcategoria_id INT,
    unidad_medida VARCHAR(50),
    precio_venta DECIMAL(12,2) DEFAULT 0,
    puntos_canjeables INT DEFAULT 0,
    imagen_url VARCHAR(255),
    descripcion TEXT,
    es_oferta TINYINT(1) DEFAULT 0,
    precio_oferta DECIMAL(12,2),
    disponible_tienda TINYINT(1) DEFAULT 1,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabla de Kardex (Movimientos)
-- Añadimos 'usuario_id' para saber quién registró cada compra o salida
CREATE TABLE IF NOT EXISTS kardex (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT,
    usuario_id INT,
    tipo_movimiento ENUM('Entrada', 'Salida'),
    cantidad DECIMAL(12,2) NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    total_pagado DECIMAL(14,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabla de Activos Fijos (Planchas, Hornos)
CREATE TABLE IF NOT EXISTS inversiones_activos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre_activo VARCHAR(150) NOT NULL,
    costo_compra DECIMAL(12,2) NOT NULL,
    fecha_compra DATE DEFAULT (CURRENT_DATE),
    descripcion TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabla de Mermas (Comida vencida o dañada)
CREATE TABLE IF NOT EXISTS mermas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT,
    usuario_id INT,
    cantidad DECIMAL(12,2) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabla de Configuración del Sistema
CREATE TABLE IF NOT EXISTS configuracion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    descripcion TEXT,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabla de Pedidos (Tienda Virtual)
CREATE TABLE IF NOT EXISTS pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,                             -- Usuario que hizo el pedido (opcional para pedidos anónimos)
    cliente_nombre VARCHAR(150) NOT NULL,
    cliente_telefono VARCHAR(30) NOT NULL,
    cliente_direccion VARCHAR(255) NOT NULL,
    estado ENUM('Pendiente', 'En Proceso', 'Completado', 'Cancelado', 'Pagado') DEFAULT 'Pendiente',
    total_pedido DECIMAL(12,2) NOT NULL,
    puntos_usados INT DEFAULT 0,
    puntos_ganados INT DEFAULT 0,                -- Puntos ganados por la compra (1 punto por cada $1000)
    fecha_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_pago TIMESTAMP NULL,                   -- Cuando se marca como pagado
    observaciones TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE pedidos ADD COLUMN cancelacion_info TEXT NULL AFTER observaciones;

-- 8. Tabla de Detalles de Pedido
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    producto_nombre VARCHAR(150) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    es_canje TINYINT(1) DEFAULT 0,               -- 1 = canjeado por puntos, 0 = comprado con dinero
    observaciones TEXT,                          -- Observaciones específicas del producto
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Tabla para guardar personalización de productos en pedidos
CREATE TABLE IF NOT EXISTS pedido_personalizacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_detalle_id INT NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'opcion' o 'extra'
    nombre VARCHAR(100) NOT NULL,
    valor VARCHAR(100) NOT NULL,
    cantidad INT DEFAULT 1,
    precio_extra DECIMAL(12,2) DEFAULT 0,
    FOREIGN KEY (pedido_detalle_id) REFERENCES pedido_detalles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 9. Tabla de Clientes (para sistema de puntos)
CREATE TABLE IF NOT EXISTS clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) UNIQUE NOT NULL,
    direccion VARCHAR(255),
    barrio VARCHAR(100),
    referencias TEXT,
    puntos_acumulados INT DEFAULT 0,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Tabla de Imágenes de Productos (soporte para múltiples imágenes por producto)
CREATE TABLE IF NOT EXISTS producto_imagenes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT NOT NULL,
    imagen_url VARCHAR(255) NOT NULL,
    orden INT DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Tabla de Referidos (rastrear referencias de usuarios)
CREATE TABLE IF NOT EXISTS referidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referente_id INT NOT NULL,                   -- Usuario que refirió
    referido_id INT NOT NULL,                    -- Usuario referido
    codigo_usado VARCHAR(50) NOT NULL,           -- Código de referido usado
    puntos_otorgados INT DEFAULT 0,              -- Puntos dados al referente (0 = pendiente, 30 = otorgado)
    fecha_referencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_compra_referido TIMESTAMP NULL,         -- Cuando el referido hizo su primera compra
    FOREIGN KEY (referente_id) REFERENCES usuarios(id),
    FOREIGN KEY (referido_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Tabla de Historial de Puntos (movimientos de puntos de usuarios)
CREATE TABLE IF NOT EXISTS historial_puntos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    tipo ENUM('compra', 'canje', 'referido', 'bienvenida', 'manual') NOT NULL,
    puntos INT NOT NULL,                         -- Positivo para ganar, negativo para canjear
    descripcion TEXT,
    pedido_id INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Tabla de Configuración del Negocio (logo, banners, etc.)
CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id INT PRIMARY KEY AUTO_INCREMENT,
    logo_url VARCHAR(255),
    nombre_negocio VARCHAR(150) DEFAULT 'GULLA',
    descripcion TEXT,
    whatsapp VARCHAR(30),
    direccion VARCHAR(255),
    ciudad VARCHAR(100) DEFAULT 'Chinú',
    departamento VARCHAR(100) DEFAULT 'Córdoba',
    pais VARCHAR(100) DEFAULT 'Colombia',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Tabla de Banners (promociones, anuncios, etc.)
-- (Se fusionó la definición duplicada del original; se usó la versión con más campos)
CREATE TABLE IF NOT EXISTS banners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    imagen_url VARCHAR(255) NOT NULL,
    descripcion TEXT,
    enlace VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    orden INT DEFAULT 0,
    fecha_inicio DATE,
    fecha_fin DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- Tabla para registrar cancelaciones de pedidos
CREATE TABLE IF NOT EXISTS cancelaciones_pedidos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    tipo ENUM('no_preparado', 'preparado') NOT NULL,
    puntos_afectados INT DEFAULT 0,
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    INDEX idx_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;





-- ============================================================
-- 1. MODIFICAR TABLA pedido_detalles
-- ============================================================
ALTER TABLE pedido_detalles 
ADD COLUMN precio_base DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER precio_unitario,
ADD COLUMN precio_extra_total DECIMAL(12,2) DEFAULT 0 AFTER precio_base,
ADD COLUMN personalizacion_resumen TEXT AFTER observaciones,
ADD COLUMN es_personalizado TINYINT(1) DEFAULT 0 AFTER es_canje;

-- ============================================================
-- 2. CREAR TABLA opciones_personalizacion (Grupos de opciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS opciones_personalizacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT NOT NULL,
    nombre_grupo VARCHAR(100) NOT NULL,
    tipo ENUM('opcion_unica', 'opcion_multiple', 'extras') DEFAULT 'opcion_unica',
    obligatorio TINYINT(1) DEFAULT 1,
    max_selecciones INT DEFAULT 1,
    orden INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_opciones_producto (producto_id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. CREAR TABLA opciones_valores (Valores de cada grupo)
-- ============================================================
CREATE TABLE IF NOT EXISTS opciones_valores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    opcion_grupo_id INT NOT NULL,
    valor VARCHAR(100) NOT NULL,
    precio_extra DECIMAL(12,2) DEFAULT 0,
    stock_disponible INT DEFAULT 999,
    orden INT DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_valores_grupo (opcion_grupo_id),
    FOREIGN KEY (opcion_grupo_id) REFERENCES opciones_personalizacion(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. CREAR TABLA extras_producto (Extras adicionales)
-- ============================================================
CREATE TABLE IF NOT EXISTS extras_producto (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT NOT NULL,
    extra_nombre VARCHAR(100) NOT NULL,
    precio_extra DECIMAL(12,2) NOT NULL,
    max_por_pedido INT DEFAULT 3,
    activo TINYINT(1) DEFAULT 1,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_extras_producto (producto_id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. CREAR TABLA pedido_personalizaciones (Personalizaciones en pedidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_personalizaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_detalle_id INT NOT NULL,
    opcion_grupo_id INT NOT NULL,
    opcion_valor_id INT NOT NULL,
    opcion_texto TEXT,
    precio_extra_aplicado DECIMAL(12,2) DEFAULT 0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_personalizacion_detalle (pedido_detalle_id),
    FOREIGN KEY (pedido_detalle_id) REFERENCES pedido_detalles(id) ON DELETE CASCADE,
    FOREIGN KEY (opcion_grupo_id) REFERENCES opciones_personalizacion(id),
    FOREIGN KEY (opcion_valor_id) REFERENCES opciones_valores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. CREAR TABLA pedido_extras (Extras en pedidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS pedido_extras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_detalle_id INT NOT NULL,
    extra_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_extras_detalle (pedido_detalle_id),
    FOREIGN KEY (pedido_detalle_id) REFERENCES pedido_detalles(id) ON DELETE CASCADE,
    FOREIGN KEY (extra_id) REFERENCES extras_producto(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. CREAR TABLA opciones_dependencias (Dependencias entre opciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS opciones_dependencias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    opcion_grupo_id INT NOT NULL,
    opcion_valor_id INT NOT NULL,
    dependencia_grupo_id INT NOT NULL,
    dependencia_valor_id INT NOT NULL,
    FOREIGN KEY (opcion_grupo_id) REFERENCES opciones_personalizacion(id),
    FOREIGN KEY (opcion_valor_id) REFERENCES opciones_valores(id),
    FOREIGN KEY (dependencia_grupo_id) REFERENCES opciones_personalizacion(id),
    FOREIGN KEY (dependencia_valor_id) REFERENCES opciones_valores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promos_dia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio_original DECIMAL(10, 2) NOT NULL,
    precio_promo DECIMAL(10, 2) NOT NULL,
    puntos_requeridos INT DEFAULT 0,
    puntos_regalo INT DEFAULT 0,
    imagen_url VARCHAR(255),
    productos_incluidos TEXT, -- JSON con IDs de productos
    activo TINYINT(1) DEFAULT 1,
    fecha_inicio DATE,
    fecha_fin DATE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 12. ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================
CREATE INDEX idx_pedido_detalles_pedido ON pedido_detalles(pedido_id);
CREATE INDEX idx_pedido_detalles_producto ON pedido_detalles(producto_id);
CREATE INDEX idx_pedido_personalizaciones_detalle ON pedido_personalizaciones(pedido_detalle_id);
CREATE INDEX idx_pedido_extras_detalle ON pedido_extras(pedido_detalle_id);
CREATE INDEX idx_opciones_producto ON opciones_personalizacion(producto_id);
CREATE INDEX idx_opciones_valores_grupo ON opciones_valores(opcion_grupo_id);
CREATE INDEX idx_extras_producto ON extras_producto(producto_id);

-- Agregar columna activo a producto_imagenes si no existe
ALTER TABLE producto_imagenes ADD COLUMN activo TINYINT(1) DEFAULT 1 AFTER orden;



-- Agregar columna activo a producto_imagenes
ALTER TABLE producto_imagenes ADD COLUMN IF NOT EXISTS activo TINYINT(1) DEFAULT 1 AFTER orden;

-- Actualizar todas las imágenes existentes como activas
UPDATE producto_imagenes SET activo = 1 WHERE activo IS NULL;








SET FOREIGN_KEY_CHECKS = 1;