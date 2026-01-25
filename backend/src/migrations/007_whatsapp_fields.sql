-- Migration 007: Configurar telefones para notificações WhatsApp
-- Data: 2026-01-24

-- Atualizar organização padrão com telefone de teste para notificações admin
UPDATE organizations SET contact_phone = '5561999999999' WHERE slug = 'www' AND contact_phone IS NULL;

-- Nota: As colunas já existem:
-- - organizations.contact_phone: definida na migration 003_multi_tenant.sql
-- - users.phone: definida no schema.sql

-- Para testar as notificações WhatsApp:
-- 1. Cadastre um usuário com telefone
-- 2. Faça uma destinação
-- 3. Verifique os links wa.me no console do servidor
