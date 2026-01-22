-- INCENTIVABR - Dados Iniciais (Seeds)
-- Versão 1.0

-- 1. JURISDIÇÃO: Distrito Federal
INSERT INTO jurisdictions (id, name, uf, type, is_active) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Distrito Federal', 'DF', 'state', true);

-- 2. GRUPOS DE INCENTIVO FISCAL
INSERT INTO incentive_groups (id, code, name, max_percentage, max_percentage_with_sports, period_type, description) VALUES
  ('22222222-2222-2222-2222-222222222201', 'GRUPO1', 'Grupo 1 - Fundos Controlados', 3.00, 4.00, 'declaration', 'Fundos dos Direitos da Criança e do Adolescente e Fundos do Idoso - dedução na declaração de ajuste anual'),
  ('22222222-2222-2222-2222-222222222202', 'GRUPO2', 'Grupo 2 - Incentivos Culturais', 6.00, 7.00, 'annual', 'Lei Rouanet, Lei do Audiovisual, Lei de Incentivo ao Esporte - dedução durante o ano-calendário'),
  ('22222222-2222-2222-2222-222222222203', 'GRUPO3', 'Grupo 3 - Saúde', 1.00, NULL, 'annual', 'PRONON e PRONAS/PCD - dedução adicional de 1% cada');

-- 3. FUNDOS OFICIAIS DE INCENTIVO
-- Grupo 1: Fundos Controlados (FDI e FDCA)
INSERT INTO official_funds (id, jurisdiction_id, incentive_group_id, code, name, legal_name, fund_type, federal_law, local_law, donation_mode, bank_code, agency, account, cnpj, requires_project, requires_pre_approval, is_active) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'FDI-DF', 'Fundo do Idoso do DF', 'Fundo dos Direitos da Pessoa Idosa do Distrito Federal', 'elderly', 'Lei 12.213/2010', 'Lei Distrital 5.765/2016', 'declaration', '070', '0100', '062024-4', '35.186.643/0001-56', false, false, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'FDCA-DF', 'Fundo da Criança e Adolescente do DF', 'Fundo dos Direitos da Criança e do Adolescente do Distrito Federal', 'children', 'Lei 8.069/1990 (ECA)', 'Lei Distrital 234/1992', 'declaration', '070', '100', '044149-8', '15.558.339/0001-85', false, false, true);

-- Grupo 2: Incentivos Culturais e Esporte
INSERT INTO official_funds (id, jurisdiction_id, incentive_group_id, code, name, legal_name, fund_type, federal_law, donation_mode, requires_project, requires_pre_approval, is_active) VALUES
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'ROUANET', 'Lei Rouanet', 'Programa Nacional de Apoio à Cultura - PRONAC', 'culture', 'Lei 8.313/1991', 'annual', true, true, true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'AUDIOVISUAL', 'Lei do Audiovisual', 'Incentivo à Atividade Audiovisual', 'audiovisual', 'Lei 8.685/1993', 'annual', true, true, true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'ESPORTE', 'Lei de Incentivo ao Esporte', 'Programa de Incentivo ao Esporte', 'sports', 'Lei 11.438/2006', 'annual', true, true, true),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'RECICLAGEM', 'Fundo de Reciclagem', 'Fundo de Apoio à Reciclagem de Resíduos', 'recycling', 'Lei 14.260/2021', 'annual', false, false, true);

-- Grupo 3: Saúde
INSERT INTO official_funds (id, jurisdiction_id, incentive_group_id, code, name, legal_name, fund_type, federal_law, donation_mode, requires_project, requires_pre_approval, is_active) VALUES
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'PRONON', 'PRONON', 'Programa Nacional de Apoio à Atenção Oncológica', 'health_oncology', 'Lei 12.715/2012', 'annual', true, true, true),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'PRONAS', 'PRONAS/PCD', 'Programa Nacional de Apoio à Atenção da Saúde da Pessoa com Deficiência', 'health_pcd', 'Lei 12.715/2012', 'annual', true, true, true);

-- 4. ORGANIZAÇÕES INTERMEDIÁRIAS
INSERT INTO intermediary_organizations (id, jurisdiction_id, official_fund_id, type, name, legal_name, cnpj, email, phone, accreditation_status, description, is_active) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', 'council', 'Conselho dos Direitos da Criança e do Adolescente do DF', 'CDCA-DF', '00.394.684/0001-07', 'cdca@sejus.df.gov.br', '(61) 3961-4184', 'approved', 'Conselho deliberativo responsável pela gestão do FDCA-DF', true),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333302', 'ngo', 'APAE Brasília', 'Associação de Pais e Amigos dos Excepcionais de Brasília', '00.038.174/0001-03', 'contato@apaebrasilia.org.br', '(61) 3346-1919', 'approved', 'Organização que atende pessoas com deficiência intelectual e múltipla', true);

-- 5. PROJETOS EXEMPLO
INSERT INTO projects (id, intermediary_org_id, official_fund_id, code, title, description, goal_amount, current_amount, start_date, end_date, category, status, total_donors, is_featured) VALUES
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333302', 'CDCA-2025-001', 'Acolhimento Institucional Infantil', 'Projeto para melhoria das casas de acolhimento para crianças e adolescentes em situação de vulnerabilidade no DF.', 500000.00, 125000.00, '2025-01-01', '2025-12-31', 'acolhimento', 'active', 47, true),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', 'APAE-2025-001', 'Capacitação Profissional PCD', 'Programa de capacitação e inclusão profissional para jovens com deficiência intelectual.', 250000.00, 87500.00, '2025-02-01', '2025-11-30', 'educacao', 'active', 23, true),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'FDI-2025-001', 'Convivência e Fortalecimento de Vínculos', 'Atividades de convivência para idosos em situação de isolamento social nas regiões administrativas do DF.', 180000.00, 45000.00, '2025-03-01', '2025-12-31', 'convivencia', 'active', 15, false);
