const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // Crear usuario con puntos de bienvenida
    static async create(userData) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const {
                nombre,
                usuario,
                email,
                password,
                telefono,
                direccion,
                barrio,
                rol = 'Cliente',
                codigo_referido,
                google_id = null
            } = userData;

            if (!nombre || !password) {
                throw new Error('Nombre y contraseña son obligatorios');
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const codigoReferidoNuevo = await this.createUniqueReferralCode();

            const emailValue = email || null;
            const usuarioValue = usuario || null;
            const telefonoValue = telefono || null;
            const direccionValue = direccion || null;
            const barrioValue = barrio || null;
            const googleIdValue = google_id || null;

            const PUNTOS_BIENVENIDA = 20;

            const query = `
                INSERT INTO usuarios (
                    nombre, usuario, email, password, telefono, 
                    direccion, barrio, rol, codigo_referido, google_id,
                    puntos_acumulados
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await connection.execute(query, [
                nombre,
                usuarioValue,
                emailValue,
                hashedPassword,
                telefonoValue,
                direccionValue,
                barrioValue,
                rol,
                codigoReferidoNuevo,
                googleIdValue,
                PUNTOS_BIENVENIDA
            ]);

            const userId = result.insertId;

            // Registrar puntos de bienvenida
            await connection.execute(`
                INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion)
                VALUES (?, 'bienvenida', ?, 'Puntos de bienvenida al registrarse')
            `, [userId, PUNTOS_BIENVENIDA]);

            // Procesar código de referido del referente
            if (codigo_referido) {
                const [referente] = await connection.execute(
                    'SELECT id FROM usuarios WHERE codigo_referido = ? AND activo = 1',
                    [codigo_referido]
                );

                if (referente[0] && referente[0].id !== userId) {
                    await connection.execute(`
                        INSERT INTO referidos (referente_id, referido_id, codigo_usado, puntos_otorgados)
                        VALUES (?, ?, ?, 0)
                    `, [referente[0].id, userId, codigo_referido]);
                }
            }

            await connection.commit();
            return userId;

        } catch (error) {
            await connection.rollback();
            console.error('Error en create user:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        const query = `
            SELECT id, nombre, usuario, email, telefono, direccion, 
                   barrio, rol, puntos_acumulados, codigo_referido,
                   google_id, activo, creado_en
            FROM usuarios 
            WHERE id = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0] || null;
    }

    static async findByEmailOrUsername(identifier) {
        const query = `
            SELECT * FROM usuarios 
            WHERE (email = ? OR usuario = ?) AND activo = 1
        `;
        const [rows] = await db.execute(query, [identifier, identifier]);
        return rows[0] || null;
    }

    static async findByEmail(email) {
        const query = `
            SELECT * FROM usuarios 
            WHERE email = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [email]);
        return rows[0] || null;
    }

    static async findByGoogleId(google_id) {
        const query = `
            SELECT * FROM usuarios 
            WHERE google_id = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [google_id]);
        return rows[0] || null;
    }

    static async findByReferralCode(codigo) {
        if (!codigo) return null;
        const query = `
            SELECT id, nombre, usuario, email, puntos_acumulados
            FROM usuarios 
            WHERE codigo_referido = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [codigo]);
        return rows[0] || null;
    }

    static async exists(email, usuario) {
        const query = `
            SELECT id FROM usuarios 
            WHERE (email = ? OR usuario = ?) AND activo = 1
        `;
        const [rows] = await db.execute(query, [email || '', usuario || '']);
        return rows.length > 0;
    }

    static async update(id, data) {
        const fields = [];
        const values = [];

        const allowedFields = [
            'nombre', 'telefono', 'direccion', 'barrio', 
            'puntos_acumulados', 'activo', 'password'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'password') {
                    const hashedPassword = await bcrypt.hash(data.password, 10);
                    values.push(hashedPassword);
                } else {
                    values.push(data[field]);
                }
            }
        }

        if (fields.length === 0) return null;

        values.push(id);
        const query = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ? AND activo = 1`;
        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    static generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    static async createUniqueReferralCode() {
        let code;
        let exists = true;
        let attempts = 0;
        const MAX_ATTEMPTS = 10;
        
        while (exists && attempts < MAX_ATTEMPTS) {
            code = this.generateReferralCode();
            const user = await this.findByReferralCode(code);
            exists = !!user;
            attempts++;
        }
        return code;
    }

    static async canEarnPoints(usuario_id) {
        const query = `SELECT activo, rol FROM usuarios WHERE id = ? AND activo = 1`;
        const [rows] = await db.execute(query, [usuario_id]);
        return rows[0] && rows[0].activo === 1;
    }

    static async getPointsWithVerification(usuario_id) {
        const query = `
            SELECT puntos_acumulados, activo, codigo_referido
            FROM usuarios WHERE id = ? AND activo = 1
        `;
        const [rows] = await db.execute(query, [usuario_id]);
        return rows[0] || null;
    }

    static async findOrCreateGoogleUser(profile) {
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            const { id: google_id, email, displayName } = profile;
            
            let [rows] = await connection.execute(
                'SELECT * FROM usuarios WHERE google_id = ? OR email = ?',
                [google_id, email]
            );
            
            let user = rows[0];

            if (!user) {
                const codigo_referido = await this.createUniqueReferralCode();
                const nombre = displayName || email.split('@')[0];
                const PUNTOS_BIENVENIDA = 20;
                
                const [result] = await connection.execute(`
                    INSERT INTO usuarios (
                        nombre, email, google_id, codigo_referido, 
                        rol, activo, puntos_acumulados
                    ) VALUES (?, ?, ?, ?, 'Cliente', 1, ?)
                `, [nombre, email, google_id, codigo_referido, PUNTOS_BIENVENIDA]);

                await connection.execute(`
                    INSERT INTO historial_puntos (usuario_id, tipo, puntos, descripcion)
                    VALUES (?, 'bienvenida', ?, 'Puntos de bienvenida al registrarse con Google')
                `, [result.insertId, PUNTOS_BIENVENIDA]);

                user = await this.findById(result.insertId);
            }

            await connection.commit();
            return user;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = User;