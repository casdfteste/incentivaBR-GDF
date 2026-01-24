-- Migration: 005_admin_columns.sql
-- Descrição: Adicionar coluna is_admin na tabela users e colunas de confirmação em donations
-- Data: 2026-01-23

-- Adicionar coluna is_admin na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Adicionar colunas de controle de confirmação na tabela donations
ALTER TABLE donations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS receipt_file_path VARCHAR(500);
ALTER TABLE donations ADD COLUMN IF NOT EXISTS proof_file_path VARCHAR(500);

-- Definir usuário Pedro (CPF: 11122233344) como admin para teste
UPDATE users SET is_admin = true WHERE cpf = '11122233344';

-- Criar índice para performance de consultas admin
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
