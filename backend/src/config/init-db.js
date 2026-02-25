/**
 * init-db.js
 * Inicializa o banco de dados do IncentivaBR do zero.
 *
 * Ordem de execução:
 *   1. Drop de todas as tabelas
 *   2. schema.sql        — cria as 8 tabelas base
 *   3. seeds.sql         — dados iniciais
 *   4. Migrations 003 a 009 — em ordem
 *
 * Uso: npm run db:init
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'incentivabr',
});

async function runFile(filePath, label) {
  console.log(`\n📄 ${label}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  console.log(`   ✅ OK`);
}

async function dropAllTables() {
  console.log('\n🗑️  Removendo tabelas existentes...');
  await pool.query(`
    DROP TABLE IF EXISTS accountability_reports    CASCADE;
    DROP TABLE IF EXISTS donations                 CASCADE;
    DROP TABLE IF EXISTS users                     CASCADE;
    DROP TABLE IF EXISTS projects                  CASCADE;
    DROP TABLE IF EXISTS intermediary_organizations CASCADE;
    DROP TABLE IF EXISTS official_funds            CASCADE;
    DROP TABLE IF EXISTS incentive_groups          CASCADE;
    DROP TABLE IF EXISTS jurisdictions             CASCADE;
    DROP TABLE IF EXISTS organizations             CASCADE;
  `);
  console.log('   ✅ Tabelas removidas');
}

async function initDatabase() {
  console.log('\n🚀 IncentivaBR — Inicialização do Banco de Dados');
  console.log('='.repeat(50));

  const client = await pool.connect();
  console.log(`✅ Conexão: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'incentivabr'}`);
  client.release();

  await dropAllTables();

  const configDir     = __dirname;
  const migrationsDir = path.join(__dirname, '../migrations');
  const legacyMigDir  = path.join(__dirname, '../../migrations');

  await runFile(path.join(configDir, 'schema.sql'),  'Schema base (8 tabelas)');
  await runFile(path.join(configDir, 'seeds.sql'),   'Seeds (dados iniciais)');

  const migrations = [
    { file: path.join(legacyMigDir,  '003_multi_tenant.sql'),    label: 'Migration 003 — Multi-tenant (organizations)' },
    { file: path.join(migrationsDir, '004_bank_data.sql'),        label: 'Migration 004 — Dados bancários nos projetos' },
    { file: path.join(migrationsDir, '005_admin_columns.sql'),    label: 'Migration 005 — Colunas admin' },
    { file: path.join(migrationsDir, '006_lgpd_terms.sql'),       label: 'Migration 006 — LGPD' },
    { file: path.join(migrationsDir, '007_whatsapp_fields.sql'),  label: 'Migration 007 — WhatsApp' },
    { file: path.join(migrationsDir, '008_rouanet.sql'),          label: 'Migration 008 — Lei Rouanet (FNC)' },
    { file: path.join(migrationsDir, '009_rouanet_tenant.sql'),   label: 'Migration 009 — Rouanet tenant (pronac)' },
  ];

  for (const { file, label } of migrations) {
    if (fs.existsSync(file)) {
      await runFile(file, label);
    } else {
      console.warn(`   ⚠️  Não encontrado (ignorado): ${path.basename(file)}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Verificação final:\n');

  const tables = [
    ['jurisdictions',              'Jurisdições'],
    ['incentive_groups',           'Grupos de Incentivo'],
    ['official_funds',             'Fundos Oficiais'],
    ['organizations',              'Organizações (tenants)'],
    ['intermediary_organizations', 'Orgs. Intermediárias'],
    ['projects',                   'Projetos'],
    ['users',                      'Usuários'],
    ['donations',                  'Destinações'],
  ];

  for (const [table, label] of tables) {
    try {
      const r = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${label.padEnd(28)} ${r.rows[0].count} registros`);
    } catch (e) {
      console.log(`   ${label.padEnd(28)} ERRO: ${e.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Banco inicializado com sucesso!');
  console.log('\n📌 Login de teste:');
  console.log('   CPF:   11122233344');
  console.log('   Senha: teste123');
  console.log('\n🌐 Iniciar servidor:');
  console.log('   npm run dev  →  http://localhost:3000\n');

  await pool.end();
}

initDatabase().catch(async err => {
  console.error('\n💥 Erro fatal:', err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
