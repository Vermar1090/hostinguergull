const db = require('../config/database');

class ConfigNegocio {
    // Obtener configuración (siempre hay solo un registro)
    static async get() {
        const query = 'SELECT * FROM configuracion_negocio LIMIT 1';
        const [rows] = await db.execute(query);
        
        if (rows.length === 0) {
            // Crear configuración por defecto si no existe
            await this.createDefault();
            const [newRows] = await db.execute(query);
            return newRows[0] || null;
        }
        
        return rows[0];
    }

    // Crear configuración por defecto
    static async createDefault() {
        const query = `
            INSERT INTO configuracion_negocio (
                nombre_negocio, descripcion, ciudad, departamento, pais
            ) VALUES (?, ?, ?, ?, ?)
        `;
        await db.execute(query, ['GULLA', 'Sistema de gestión de pedidos', 'Chinú', 'Córdoba', 'Colombia']);
    }

    // Actualizar configuración
    static async update(data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            'logo_url', 'nombre_negocio', 'descripcion', 'whatsapp',
            'direccion', 'ciudad', 'departamento', 'pais'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) return null;

        const query = `
            UPDATE configuracion_negocio 
            SET ${fields.join(', ')} 
            WHERE id = (SELECT id FROM (SELECT id FROM configuracion_negocio LIMIT 1) AS tmp)
        `;
        
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    // Obtener solo datos públicos (para la tienda)
    static async getPublic() {
        const config = await this.get();
        if (!config) return null;

        // Solo devolver campos públicos
        return {
            nombre_negocio: config.nombre_negocio,
            descripcion: config.descripcion,
            logo_url: config.logo_url,
            whatsapp: config.whatsapp,
            direccion: config.direccion,
            ciudad: config.ciudad,
            departamento: config.departamento,
            pais: config.pais
        };
    }

    // Actualizar solo WhatsApp (método rápido)
    static async updateWhatsapp(whatsapp) {
        return await this.update({ whatsapp });
    }

    // Actualizar solo logo
    static async updateLogo(logo_url) {
        return await this.update({ logo_url });
    }
}

module.exports = ConfigNegocio;