const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

const createAdmin = async () => {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, email, password, rol, activo, codigo_referido) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Administrador', 'admin@gulla.com', hashedPassword, 'Administrador', 1, 'ADMIN001']
    );

    console.log('✅ Administrador creado exitosamente');
    console.log('📧 Email: admin@gulla.com');
    console.log('🔑 Contraseña: admin123');
    console.log(`🆔 ID: ${result.insertId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando administrador:', error);
    process.exit(1);
  }
};

createAdmin();
