import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('Uso: node run-migration.js <arquivo-sql>');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, migrationFile);

  console.log(`Executando migração: ${migrationFile}...`);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('Migração executada com sucesso!');
  } catch (error) {
    console.error('Erro ao executar migração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
