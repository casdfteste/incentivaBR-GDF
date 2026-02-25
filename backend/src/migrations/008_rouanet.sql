-- Migration 008: Lei Rouanet (Lei 8.313/1991)
-- Adiciona grupo de incentivo e fundo oficial para a Lei Rouanet
-- Data: 2026-02-24

-- 1. Grupo de incentivo: Cultura / Lei Rouanet
--    Limite: até 6% do IR devido (art. 26 da Lei 8.313/1991)
INSERT INTO incentive_groups (code, name, max_percentage, period_type, description)
VALUES (
  'rouanet',
  'Lei Rouanet — Incentivo à Cultura',
  6.00,
  'declaration',
  'Permite destinar até 6% do Imposto de Renda devido a projetos culturais aprovados pelo Ministério da Cultura, via mecanismo de patrocínio (dedução integral) ou doação (80% dedutível). Regulamentada pela Lei 8.313/1991.'
)
ON CONFLICT (code) DO NOTHING;

-- 2. Fundo oficial: FNC — Fundo Nacional de Cultura
--    Pessoas físicas podem destinar ao FNC via declaração de IR
INSERT INTO official_funds (
  jurisdiction_id,
  incentive_group_id,
  code,
  name,
  legal_name,
  fund_type,
  federal_law,
  donation_mode,
  bank_code,
  agency,
  account,
  cnpj,
  requires_project,
  requires_pre_approval,
  is_active
)
SELECT
  (SELECT id FROM jurisdictions WHERE uf = 'DF' AND type = 'federal' LIMIT 1),
  (SELECT id FROM incentive_groups WHERE code = 'rouanet'),
  'FNC',
  'Fundo Nacional de Cultura',
  'Fundo Nacional de Cultura — Ministério da Cultura',
  'rouanet',
  'Lei 8.313/1991',
  'declaration',
  '001',   -- Banco do Brasil
  '3902-5',
  '170500-8',
  '00.394.285/0001-41',
  false,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM official_funds WHERE code = 'FNC'
);

-- 3. Índice para o novo fund_type
CREATE INDEX IF NOT EXISTS idx_official_funds_type ON official_funds(fund_type);

-- 4. Índice para buscas por code nos projetos SALIC (PRONAC)
--    O PRONAC fica no campo code dos projetos quando sincronizados
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
