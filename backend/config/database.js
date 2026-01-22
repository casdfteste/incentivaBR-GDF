import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Função para testar conexão
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexão com PostgreSQL estabelecida com sucesso!');
    client.release();
    return true;
  } catch (error) {
    console.error('Erro ao conectar com PostgreSQL:', error.message);
    return false;
  }
}

export default pool;
