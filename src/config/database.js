const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Crear pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promisificar el pool para usar async/await
const promisePool = pool.promise();

module.exports = promisePool;