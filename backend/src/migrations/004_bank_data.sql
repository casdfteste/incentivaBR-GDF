-- Migration: 004_bank_data.sql
-- Descrição: Adicionar dados bancários aos projetos existentes
-- Data: 2026-01-22

-- Adicionar colunas se não existirem
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bank_agency VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pix_key VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS beneficiary_cnpj VARCHAR(20);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS fund_name VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(200);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_percentage DECIMAL(5,2) DEFAULT 6.00;

-- Atualizar projetos existentes com dados bancários de exemplo
UPDATE projects SET
  bank_name = 'BRB - Banco de Brasília',
  bank_code = '070',
  bank_agency = '0001',
  bank_account = '98765-4',
  pix_key = '00394684000107',
  pix_key_type = 'cnpj',
  beneficiary_name = 'FDCA-DF - Fundo da Criança e Adolescente',
  beneficiary_cnpj = '00.394.684/0001-07',
  fund_name = 'Fundo da Criança e Adolescente',
  legal_basis = 'Art. 260 do ECA',
  max_percentage = 6.00
WHERE bank_name IS NULL OR bank_name = '';
