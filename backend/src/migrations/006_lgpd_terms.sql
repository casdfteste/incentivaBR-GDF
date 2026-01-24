-- Migration: 006_lgpd_terms.sql
-- Descricao: Adicionar coluna para registro de aceite dos termos (LGPD)
-- Data: 2026-01-23

-- Adicionar coluna para data/hora do aceite dos termos
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;

-- Adicionar coluna para versao dos termos aceitos (para controle de atualizacoes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_version VARCHAR(20);

-- Criar indice para consultas
CREATE INDEX IF NOT EXISTS idx_users_accepted_terms ON users(accepted_terms_at);
