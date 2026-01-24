import express from 'express';
import pool from '../../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configuração do multer para upload de recibos
const uploadsDir = path.join(__dirname, '../../uploads/receipts');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use PDF, JPG ou PNG.'));
    }
  }
});

// Middleware para verificar se é admin
async function isAdmin(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({
        status: 'error',
        message: 'Acesso negado. Apenas administradores podem acessar este recurso.'
      });
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar admin:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao verificar permissões.'
    });
  }
}

// Validar UUID
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Função para mascarar CPF (***123.456-**)
function maskCPF(cpf) {
  if (!cpf || cpf.length !== 11) return cpf;
  return `***.${cpf.substring(3, 6)}.${cpf.substring(6, 9)}-**`;
}

// GET /api/admin/stats - Estatísticas gerais
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Total pendente
    const pendingResult = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(donation_amount), 0) as total
      FROM donations
      WHERE status = 'pending'
    `);

    // Total confirmado
    const confirmedResult = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(donation_amount), 0) as total
      FROM donations
      WHERE status = 'confirmed'
    `);

    // Total recusado
    const rejectedResult = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(donation_amount), 0) as total
      FROM donations
      WHERE status = 'rejected'
    `);

    // Destinações por fundo
    const byFundResult = await pool.query(`
      SELECT
        f.name as fund_name,
        f.code as fund_code,
        COUNT(d.id) as total_donations,
        COALESCE(SUM(d.donation_amount), 0) as total_amount
      FROM donations d
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.status != 'cancelled'
      GROUP BY f.id, f.name, f.code
      ORDER BY total_amount DESC
    `);

    res.json({
      status: 'success',
      stats: {
        pending: {
          count: parseInt(pendingResult.rows[0].count),
          total: parseFloat(pendingResult.rows[0].total)
        },
        confirmed: {
          count: parseInt(confirmedResult.rows[0].count),
          total: parseFloat(confirmedResult.rows[0].total)
        },
        rejected: {
          count: parseInt(rejectedResult.rows[0].count),
          total: parseFloat(rejectedResult.rows[0].total)
        },
        by_fund: byFundResult.rows.map(row => ({
          fund_name: row.fund_name,
          fund_code: row.fund_code,
          total_donations: parseInt(row.total_donations),
          total_amount: parseFloat(row.total_amount)
        }))
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar estatísticas.'
    });
  }
});

// GET /api/admin/donations/pending - Lista destinações pendentes
router.get('/donations/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        d.id,
        d.donation_amount,
        d.ir_total,
        d.fiscal_year,
        d.status,
        d.created_at,
        d.proof_file_path,
        u.nome as user_name,
        u.cpf as user_cpf,
        u.email as user_email,
        p.title as project_title,
        p.code as project_code,
        f.name as fund_name,
        f.code as fund_code
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.status = 'pending'
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'pending'"
    );

    res.json({
      status: 'success',
      total: parseInt(countResult.rows[0].count),
      donations: result.rows.map(d => ({
        id: d.id,
        donation_amount: parseFloat(d.donation_amount),
        ir_total: parseFloat(d.ir_total),
        percentage: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        proof_file_path: d.proof_file_path,
        user: {
          name: d.user_name,
          cpf_masked: maskCPF(d.user_cpf),
          email: d.user_email
        },
        project: {
          title: d.project_title,
          code: d.project_code
        },
        fund: {
          name: d.fund_name,
          code: d.fund_code
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar destinações pendentes:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar destinações.'
    });
  }
});

// GET /api/admin/donations/confirmed - Lista destinações confirmadas
router.get('/donations/confirmed', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        d.id,
        d.donation_amount,
        d.ir_total,
        d.fiscal_year,
        d.status,
        d.created_at,
        d.confirmed_at,
        d.proof_file_path,
        d.receipt_file_path,
        u.nome as user_name,
        u.cpf as user_cpf,
        u.email as user_email,
        p.title as project_title,
        p.code as project_code,
        f.name as fund_name,
        f.code as fund_code
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.status = 'confirmed'
      ORDER BY d.confirmed_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'confirmed'"
    );

    res.json({
      status: 'success',
      total: parseInt(countResult.rows[0].count),
      donations: result.rows.map(d => ({
        id: d.id,
        donation_amount: parseFloat(d.donation_amount),
        ir_total: parseFloat(d.ir_total),
        percentage: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        confirmed_at: d.confirmed_at,
        proof_file_path: d.proof_file_path,
        receipt_file_path: d.receipt_file_path,
        user: {
          name: d.user_name,
          cpf_masked: maskCPF(d.user_cpf),
          email: d.user_email
        },
        project: {
          title: d.project_title,
          code: d.project_code
        },
        fund: {
          name: d.fund_name,
          code: d.fund_code
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar destinações confirmadas:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar destinações.'
    });
  }
});

// GET /api/admin/donations/rejected - Lista destinações recusadas
router.get('/donations/rejected', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT
        d.id,
        d.donation_amount,
        d.ir_total,
        d.fiscal_year,
        d.status,
        d.created_at,
        d.rejection_reason,
        d.proof_file_path,
        u.nome as user_name,
        u.cpf as user_cpf,
        u.email as user_email,
        p.title as project_title,
        p.code as project_code,
        f.name as fund_name,
        f.code as fund_code
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.status = 'rejected'
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM donations WHERE status = 'rejected'"
    );

    res.json({
      status: 'success',
      total: parseInt(countResult.rows[0].count),
      donations: result.rows.map(d => ({
        id: d.id,
        donation_amount: parseFloat(d.donation_amount),
        ir_total: parseFloat(d.ir_total),
        percentage: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        rejection_reason: d.rejection_reason,
        proof_file_path: d.proof_file_path,
        user: {
          name: d.user_name,
          cpf_masked: maskCPF(d.user_cpf),
          email: d.user_email
        },
        project: {
          title: d.project_title,
          code: d.project_code
        },
        fund: {
          name: d.fund_name,
          code: d.fund_code
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar destinações recusadas:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar destinações.'
    });
  }
});

// PUT /api/admin/donations/:id/confirm - Confirmar destinação
router.put('/donations/:id/confirm', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    // Verificar se a doação existe e está pendente
    const checkResult = await pool.query(
      'SELECT id, status FROM donations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Destinação não encontrada.'
      });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Destinação não pode ser confirmada. Status atual: ${checkResult.rows[0].status}`
      });
    }

    // Confirmar a doação
    const result = await pool.query(`
      UPDATE donations
      SET status = 'confirmed', confirmed_at = NOW()
      WHERE id = $1
      RETURNING id, status, confirmed_at
    `, [id]);

    res.json({
      status: 'success',
      message: 'Destinação confirmada com sucesso!',
      donation: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        confirmed_at: result.rows[0].confirmed_at
      }
    });

  } catch (error) {
    console.error('Erro ao confirmar destinação:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao confirmar destinação.'
    });
  }
});

// PUT /api/admin/donations/:id/reject - Recusar destinação
router.put('/donations/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    // Verificar se a doação existe e está pendente
    const checkResult = await pool.query(
      'SELECT id, status FROM donations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Destinação não encontrada.'
      });
    }

    if (checkResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: `Destinação não pode ser recusada. Status atual: ${checkResult.rows[0].status}`
      });
    }

    // Recusar a doação
    const result = await pool.query(`
      UPDATE donations
      SET status = 'rejected', rejection_reason = $2
      WHERE id = $1
      RETURNING id, status, rejection_reason
    `, [id, reason || null]);

    res.json({
      status: 'success',
      message: 'Destinação recusada.',
      donation: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        rejection_reason: result.rows[0].rejection_reason
      }
    });

  } catch (error) {
    console.error('Erro ao recusar destinação:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao recusar destinação.'
    });
  }
});

// POST /api/admin/donations/:id/upload-receipt - Upload de recibo oficial
router.post('/donations/:id/upload-receipt', authenticateToken, isAdmin, upload.single('receipt'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Arquivo de recibo é obrigatório.'
      });
    }

    // Verificar se a doação existe
    const checkResult = await pool.query(
      'SELECT id, status FROM donations WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Destinação não encontrada.'
      });
    }

    // Caminho relativo para o banco
    const receiptPath = `/uploads/receipts/${req.file.filename}`;

    // Atualizar a doação com o recibo
    const result = await pool.query(`
      UPDATE donations
      SET receipt_file_path = $2
      WHERE id = $1
      RETURNING id, receipt_file_path
    `, [id, receiptPath]);

    res.json({
      status: 'success',
      message: 'Recibo enviado com sucesso!',
      donation: {
        id: result.rows[0].id,
        receipt_file_path: result.rows[0].receipt_file_path
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload do recibo:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao fazer upload do recibo.'
    });
  }
});

// GET /api/admin/donations/:id - Detalhes de uma destinação
router.get('/donations/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    const result = await pool.query(`
      SELECT
        d.*,
        u.nome as user_name,
        u.cpf as user_cpf,
        u.email as user_email,
        u.phone as user_phone,
        p.title as project_title,
        p.code as project_code,
        p.description as project_description,
        f.name as fund_name,
        f.code as fund_code,
        f.bank_code,
        f.agency,
        f.account,
        f.cnpj as fund_cnpj
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Destinação não encontrada.'
      });
    }

    const d = result.rows[0];

    res.json({
      status: 'success',
      donation: {
        id: d.id,
        donation_amount: parseFloat(d.donation_amount),
        ir_total: parseFloat(d.ir_total),
        percentage: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        confirmed_at: d.confirmed_at,
        rejection_reason: d.rejection_reason,
        proof_file_path: d.proof_file_path,
        receipt_file_path: d.receipt_file_path,
        user: {
          name: d.user_name,
          cpf: d.user_cpf,
          cpf_masked: maskCPF(d.user_cpf),
          email: d.user_email,
          phone: d.user_phone
        },
        project: {
          title: d.project_title,
          code: d.project_code,
          description: d.project_description
        },
        fund: {
          name: d.fund_name,
          code: d.fund_code,
          bank_code: d.bank_code,
          agency: d.agency,
          account: d.account,
          cnpj: d.fund_cnpj
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar destinação:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar destinação.'
    });
  }
});

export default router;
