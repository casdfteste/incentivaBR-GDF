-- Migration 009: Suporte a tenant Rouanet (cliente com projeto SALIC vinculado)
-- Data: 2026-02-24

-- 1. Adicionar PRONAC à tabela organizations
--    Cada organização pode vincular um projeto específico da Lei Rouanet (SALIC)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pronac           VARCHAR(7),      -- Número do projeto no SALIC (ex: 241234)
  ADD COLUMN IF NOT EXISTS pronac_titulo    TEXT,            -- Título cacheado do projeto (fallback offline)
  ADD COLUMN IF NOT EXISTS pronac_area      VARCHAR(100),    -- Área cultural (ex: Música, Teatro)
  ADD COLUMN IF NOT EXISTS pronac_proponente TEXT;           -- Nome do proponente cacheado

-- 2. Adicionar campos Rouanet à tabela donations
--    project_id pode ser NULL para destinações Rouanet (projeto vem do SALIC)
ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS pronac           VARCHAR(7),      -- PRONAC do projeto Rouanet
  ADD COLUMN IF NOT EXISTS receipt_url      TEXT,            -- URL do comprovante enviado
  ADD COLUMN IF NOT EXISTS receipt_filename TEXT,            -- Nome original do arquivo
  ADD COLUMN IF NOT EXISTS confirmed_at     TIMESTAMP;       -- Quando foi confirmado pelo admin

-- Ajusta status para incluir 'awaiting_confirmation'
ALTER TABLE donations
  DROP CONSTRAINT IF EXISTS donations_status_check;

ALTER TABLE donations
  ADD CONSTRAINT donations_status_check
  CHECK (status IN ('pending', 'awaiting_confirmation', 'confirmed', 'processed', 'cancelled'));

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_donations_pronac       ON donations(pronac) WHERE pronac IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_pronac   ON organizations(pronac) WHERE pronac IS NOT NULL;
