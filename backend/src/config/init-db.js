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

async function executeSqlFile(filePath, description) {
  console.log(`\n📄 Executando: ${description}...`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`✅ ${description} executado com sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao executar ${description}:`, error.message);
    return false;
  }
}

async function dropAllTables() {
  console.log('\n🗑️  Removendo tabelas existentes...');

  const dropQuery = `
    DROP TABLE IF EXISTS accountability_reports CASCADE;
    DROP TABLE IF EXISTS donations CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS projects CASCADE;
    DROP TABLE IF EXISTS intermediary_organizations CASCADE;
    DROP TABLE IF EXISTS official_funds CASCADE;
    DROP TABLE IF EXISTS incentive_groups CASCADE;
    DROP TABLE IF EXISTS jurisdictions CASCADE;
  `;

  try {
    await pool.query(dropQuery);
    console.log('✅ Tabelas removidas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover tabelas:', error.message);
    return false;
  }
}

async function initDatabase() {
  console.log('🚀 Iniciando configuração do banco de dados INCENTIVABR...');
  console.log('━'.repeat(50));

  try {
    // Testar conexão
    const client = await pool.connect();
    console.log('✅ Conexão com PostgreSQL estabelecida!');
    client.release();

    // Remover tabelas existentes (reset completo)
    const dropped = await dropAllTables();
    if (!dropped) {
      throw new Error('Falha ao remover tabelas existentes');
    }

    // Executar schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaOk = await executeSqlFile(schemaPath, 'Schema (criação de tabelas)');
    if (!schemaOk) {
      throw new Error('Falha ao executar schema.sql');
    }

    // Executar seeds
    const seedsPath = path.join(__dirname, 'seeds.sql');
    const seedsOk = await executeSqlFile(seedsPath, 'Seeds (dados iniciais)');
    if (!seedsOk) {
      throw new Error('Falha ao executar seeds.sql');
    }

    // Verificar dados inseridos
    console.log('\n📊 Verificando dados inseridos...');

    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM jurisdictions'),
      pool.query('SELECT COUNT(*) FROM incentive_groups'),
      pool.query('SELECT COUNT(*) FROM official_funds'),
      pool.query('SELECT COUNT(*) FROM intermediary_organizations'),
      pool.query('SELECT COUNT(*) FROM projects'),
    ]);

    console.log('━'.repeat(50));
    console.log('📈 Resumo dos dados:');
    console.log(`   • Jurisdições: ${counts[0].rows[0].count}`);
    console.log(`   • Grupos de Incentivo: ${counts[1].rows[0].count}`);
    console.log(`   • Fundos Oficiais: ${counts[2].rows[0].count}`);
    console.log(`   • Organizações: ${counts[3].rows[0].count}`);
    console.log(`   • Projetos: ${counts[4].rows[0].count}`);
    console.log('━'.repeat(50));

    console.log('\n🎉 Banco de dados inicializado com sucesso!');

  } catch (error) {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
