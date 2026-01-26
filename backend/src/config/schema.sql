-- INCENTIVABR - Schema do Banco de Dados
-- Versão 1.0

-- Habilita extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA 1: jurisdictions (entes federativos)
CREATE TABLE jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  uf CHAR(2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('state', 'municipality', 'federal')),
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 2: incentive_groups (grupos de incentivo fiscal)
CREATE TABLE incentive_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  max_percentage DECIMAL(5,2) NOT NULL,
  max_percentage_with_sports DECIMAL(5,2),
  period_type VARCHAR(20) CHECK (period_type IN ('declaration', 'annual')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 3: official_funds (fundos oficiais de incentivo)
CREATE TABLE official_funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  incentive_group_id UUID REFERENCES incentive_groups(id),
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(300),
  fund_type VARCHAR(30) NOT NULL,
  federal_law VARCHAR(50),
  local_law VARCHAR(50),
  donation_mode VARCHAR(20) CHECK (donation_mode IN ('declaration', 'annual', 'both')),
  bank_code VARCHAR(3),
  agency VARCHAR(10),
  account VARCHAR(20),
  cnpj VARCHAR(18),
  requires_project BOOLEAN DEFAULT false,
  requires_pre_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 4: intermediary_organizations (organizações intermediárias)
CREATE TABLE intermediary_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  official_fund_id UUID REFERENCES official_funds(id),
  type VARCHAR(50) CHECK (type IN ('council', 'federation', 'association', 'ngo')),
  name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  representative_name VARCHAR(200),
  representative_cpf VARCHAR(11),
  accreditation_status VARCHAR(20) DEFAULT 'pending' CHECK (accreditation_status IN ('pending', 'approved', 'rejected', 'suspended')),
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 5: projects (projetos específicos)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intermediary_org_id UUID REFERENCES intermediary_organizations(id),
  official_fund_id UUID REFERENCES official_funds(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  goal_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  category VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'funded', 'completed', 'cancelled')),
  cover_image_url TEXT,
  total_donors INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 6: users (usuários/doadores)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id UUID REFERENCES jurisdictions(id),
  cpf VARCHAR(11) UNIQUE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(20),
  senha_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  total_donated DECIMAL(12,2) DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  accepted_terms_at TIMESTAMP,
  accepted_terms_version VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 7: donations (doações)
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  official_fund_id UUID REFERENCES official_funds(id),
  ir_total DECIMAL(10,2) NOT NULL,
  donation_amount DECIMAL(10,2) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABELA 8: accountability_reports (prestação de contas)
CREATE TABLE accountability_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  report_type VARCHAR(20) CHECK (report_type IN ('progress', 'financial', 'completion')),
  reference_period VARCHAR(50),
  amount_received DECIMAL(12,2),
  amount_spent DECIMAL(12,2),
  progress_percentage INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX idx_official_funds_jurisdiction ON official_funds(jurisdiction_id);
CREATE INDEX idx_official_funds_incentive_group ON official_funds(incentive_group_id);
CREATE INDEX idx_projects_fund ON projects(official_fund_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_donations_user ON donations(user_id);
CREATE INDEX idx_donations_fiscal_year ON donations(fiscal_year);
CREATE INDEX idx_users_cpf ON users(cpf);
CREATE INDEX idx_users_email ON users(email);
