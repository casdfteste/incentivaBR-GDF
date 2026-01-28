import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool, { testConnection } from './config/database.js';
import { initEmailService, getEmailStatus } from './src/services/emailService.js';

// ES modules: criar __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './src/routes/auth.js';
import fundsRoutes from './src/routes/funds.js';
import projectsRoutes from './src/routes/projects.js';
import organizationsRoutes from './src/routes/organizations.js';
import calculatorRoutes from './src/routes/calculator.js';
import donationsRoutes from './src/routes/donations.js';
import uploadsRoutes from './src/routes/uploads.js';
import adminRoutes from './src/routes/admin.js';
import configRoutes from './src/routes/config.js';
import tenantMiddleware from './src/middleware/tenant.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Redirect domínio sem www para www
app.use((req, res, next) => {
  const host = req.get('host');
  if (host === 'incentivabr.com.br') {
    return res.redirect(301, `https://www.incentivabr.com.br${req.originalUrl}`);
  }
  next();
});

// Multi-tenant middleware (detecta organização pelo subdomínio/query param)
app.use(tenantMiddleware);

// Servir arquivos estáticos do frontend
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
console.log('Frontend path:', frontendPath);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Rota de teste do banco de dados
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      status: 'ok',
      message: 'Conexão com banco de dados funcionando',
      serverTime: result.rows[0].current_time
    });
  } catch (error) {
    console.error('Erro no teste de DB:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Falha na conexão com banco de dados',
      error: error.message
    });
  }
});

// Rota de diagnóstico completo do sistema
app.get('/diagnostico', async (req, res) => {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    node_env: process.env.NODE_ENV || 'not set',
    services: {}
  };

  // Status do banco de dados
  try {
    const dbResult = await pool.query('SELECT NOW() as time, current_database() as db');
    diagnostico.services.database = {
      status: 'ok',
      database: dbResult.rows[0].db,
      serverTime: dbResult.rows[0].time
    };
  } catch (error) {
    diagnostico.services.database = {
      status: 'error',
      error: error.message
    };
  }

  // Status do serviço de email
  const emailStatus = getEmailStatus();
  diagnostico.services.email = {
    status: emailStatus.initialized ? 'ok' : 'error',
    mode: emailStatus.mode === 'production' ? 'PRODUCAO (SMTP)' : 'TESTE (Ethereal)',
    host: emailStatus.host,
    user: emailStatus.user,
    port: emailStatus.port,
    secure: emailStatus.secure,
    error: emailStatus.error
  };
  if (emailStatus.etherealUrl) {
    diagnostico.services.email.etherealUrl = emailStatus.etherealUrl;
  }

  // Verificar variáveis de ambiente importantes (sem expor valores sensíveis)
  diagnostico.environment = {
    SMTP_HOST: process.env.SMTP_HOST ? '✅ configurado' : '❌ não configurado',
    SMTP_USER: process.env.SMTP_USER ? '✅ configurado' : '❌ não configurado',
    SMTP_PASS: process.env.SMTP_PASS ? '✅ configurado' : '❌ não configurado',
    JWT_SECRET: process.env.JWT_SECRET ? '✅ configurado' : '❌ não configurado',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ configurado' : '❌ não configurado'
  };

  res.json(diagnostico);
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/funds', fundsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// Servir arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota catch-all: serve index.html para rotas não-API (SPA)
app.get('*', (req, res, next) => {
  // Se for rota de API, retorna 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: 'Rota de API não encontrada'
    });
  }
  // Para outras rotas, serve o index.html do frontend
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro:', err.message);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno do servidor'
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Testar conexão com banco na inicialização
  await testConnection();

  // Inicializar serviço de email
  initEmailService().catch(err => console.error('Erro ao inicializar email:', err));
});
