-- Migration: Multi-tenant básico
-- Data: 2026-01-24

-- 1. CRIAR TABELA DE ORGANIZAÇÕES
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#00A859',
  secondary_color VARCHAR(7) DEFAULT '#1E3A5F',

  -- Dados do Fundo
  fund_type VARCHAR(50),
  fund_name VARCHAR(200),
  legal_basis VARCHAR(200),
  max_percentage DECIMAL(5,2) DEFAULT 6.00,

  -- Dados bancários
  bank_name VARCHAR(100),
  bank_code VARCHAR(10),
  bank_agency VARCHAR(20),
  bank_account VARCHAR(30),
  pix_key VARCHAR(200),
  pix_key_type VARCHAR(20),
  beneficiary_name VARCHAR(200),
  beneficiary_cnpj VARCHAR(20),

  -- Contato
  contact_email VARCHAR(200),
  contact_phone VARCHAR(20),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. INSERIR ORGANIZAÇÕES DE EXEMPLO
INSERT INTO organizations (name, slug, fund_type, fund_name, legal_basis, max_percentage, bank_name, bank_code, bank_agency, bank_account, pix_key, pix_key_type, beneficiary_name, beneficiary_cnpj) VALUES
('IncentivaBR', 'www', 'geral', 'Todos os Fundos', 'Diversos', 9.00, 'BRB', '070', '0001', '12345-6', 'contato@incentivabr.com.br', 'email', 'IncentivaBR', '00.000.000/0001-00'),
('AJUFER - Associação dos Magistrados', 'ajufer', 'esporte', 'Lei de Incentivo ao Esporte', 'Lei 11.438/2006', 7.00, 'BRB', '070', '0001', '11111-1', 'esporte@ajufer.org.br', 'email', 'AJUFER', '01.234.567/0001-89'),
('FIA-DF', 'fia', 'fia', 'Fundo da Criança e Adolescente', 'Art. 260 do ECA', 6.00, 'BRB', '070', '0001', '98765-4', '00394684000107', 'cnpj', 'FDCA-DF', '00.394.684/0001-07'),
('CRM-DF', 'crm', 'pronon', 'PRONON - Oncologia', 'Lei 12.715/2012', 1.00, 'BB', '001', '1234-5', '67890-1', 'pronon@hospitalcancer.org.br', 'email', 'Hospital do Câncer', '12.345.678/0001-90')
ON CONFLICT (slug) DO NOTHING;

-- 3. ADICIONAR ORGANIZATION_ID NOS PROJETOS
ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 4. ASSOCIAR PROJETOS EXISTENTES À ORGANIZAÇÃO PADRÃO
UPDATE projects SET organization_id = (SELECT id FROM organizations WHERE slug = 'www') WHERE organization_id IS NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
