import express from 'express';
import pool from '../../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { gerarComprovante } from '../services/pdfGenerator.js';
import { notifyDestinationRegistered, notifyAdminNewDonation } from '../services/notificationService.js';

const router = express.Router();

// Validar UUID
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Limite máximo de destinação (9% do IR)
const LIMITE_MAXIMO_PERCENTUAL = 0.09;

// POST /api/donations - Criar doação
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      project_id,
      ir_total,
      donation_amount,
      fiscal_year
    } = req.body;

    const userId = req.user.userId;

    // Validações básicas
    if (!project_id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do projeto é obrigatório.'
      });
    }

    if (!isValidUUID(project_id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID do projeto inválido.'
      });
    }

    if (!ir_total || ir_total <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'IR total deve ser maior que zero.'
      });
    }

    if (!donation_amount || donation_amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valor da doação deve ser maior que zero.'
      });
    }

    if (!fiscal_year || fiscal_year < 2024) {
      return res.status(400).json({
        status: 'error',
        message: 'Ano fiscal inválido.'
      });
    }

    // Validar limite máximo (9% do IR)
    const limiteMaximo = ir_total * LIMITE_MAXIMO_PERCENTUAL;
    if (donation_amount > limiteMaximo) {
      return res.status(400).json({
        status: 'error',
        message: `Valor da doação excede o limite máximo de 9% do IR (R$ ${limiteMaximo.toFixed(2)}).`
      });
    }

    // Verificar projeto existe e está ativo
    const projectResult = await client.query(`
      SELECT p.id, p.title, p.status, p.official_fund_id, f.name AS fund_name
      FROM projects p
      LEFT JOIN official_funds f ON p.official_fund_id = f.id
      WHERE p.id = $1
    `, [project_id]);

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Projeto não encontrado.'
      });
    }

    const project = projectResult.rows[0];

    if (project.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Projeto não está ativo para receber doações.'
      });
    }

    // Verificar doações já feitas no mesmo ano fiscal
    const existingDonations = await client.query(`
      SELECT COALESCE(SUM(donation_amount), 0) AS total_donated
      FROM donations
      WHERE user_id = $1 AND fiscal_year = $2 AND status != 'cancelled'
    `, [userId, fiscal_year]);

    const totalJaDoado = parseFloat(existingDonations.rows[0].total_donated);
    const novoTotal = totalJaDoado + donation_amount;

    if (novoTotal > limiteMaximo) {
      return res.status(400).json({
        status: 'error',
        message: `Total de doações no ano fiscal (R$ ${novoTotal.toFixed(2)}) excederia o limite de 9% do IR (R$ ${limiteMaximo.toFixed(2)}). Você já doou R$ ${totalJaDoado.toFixed(2)}.`
      });
    }

    // Iniciar transação
    await client.query('BEGIN');

    // Inserir doação
    const donationResult = await client.query(`
      INSERT INTO donations (user_id, project_id, official_fund_id, ir_total, donation_amount, fiscal_year, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, created_at
    `, [userId, project_id, project.official_fund_id, ir_total, donation_amount, fiscal_year]);

    const donation = donationResult.rows[0];

    // Atualizar projeto (current_amount e total_donors)
    await client.query(`
      UPDATE projects
      SET
        current_amount = current_amount + $1,
        total_donors = total_donors + 1
      WHERE id = $2
    `, [donation_amount, project_id]);

    // Atualizar total_donated do usuário
    await client.query(`
      UPDATE users
      SET total_donated = total_donated + $1
      WHERE id = $2
    `, [donation_amount, userId]);

    // Commit da transação
    await client.query('COMMIT');

    // Buscar dados do usuário para notificações
    const userResult = await pool.query(
      'SELECT nome, email, phone FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    // Enviar notificações para o usuário (email + WhatsApp) - não bloqueia a resposta
    if (user) {
      notifyDestinationRegistered(
        { name: user.nome, email: user.email, phone: user.phone },
        { amount: donation_amount },
        { title: project.title },
        req.organization
      ).catch(err => console.error('Erro ao enviar notificações de destinação registrada:', err.message));

      // Notificar admin da organização (se tiver contato configurado)
      if (req.organization?.contact_email || req.organization?.contact_phone) {
        notifyAdminNewDonation(
          req.organization.contact_email,
          req.organization.contact_phone,
          { name: user.nome, email: user.email },
          { amount: donation_amount },
          { title: project.title },
          req.organization
        ).catch(err => console.error('Erro ao notificar admin da organização:', err.message));
      }

      // Buscar admins do sistema para notificar
      const adminsResult = await pool.query(
        'SELECT email, phone FROM users WHERE is_admin = true'
      );
      for (const admin of adminsResult.rows) {
        notifyAdminNewDonation(
          admin.email,
          admin.phone,
          { name: user.nome, email: user.email },
          { amount: donation_amount },
          { title: project.title },
          req.organization
        ).catch(err => console.error('Erro ao notificar admin:', err.message));
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Doação registrada com sucesso!',
      donation: {
        id: donation.id,
        project_id,
        project_title: project.title,
        fund_name: project.fund_name,
        ir_total,
        donation_amount,
        percentage_of_ir: Math.round((donation_amount / ir_total) * 10000) / 100,
        fiscal_year,
        status: 'pending',
        created_at: donation.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar doação:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao registrar doação.'
    });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/donations/rouanet
// Registra uma destinação para projeto da Lei Rouanet (SALIC).
// Não exige project_id local — usa PRONAC da organização.
// ─────────────────────────────────────────────────────────────
router.post('/rouanet', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    const { pronac, ir_total, donation_amount, fiscal_year } = req.body;
    const userId = req.user.userId;
    const org    = req.organization;

    // Validar que a organização tem esse PRONAC vinculado
    if (!org || !org.pronac) {
      return res.status(400).json({
        status: 'error',
        message: 'Esta organização não possui projeto Rouanet configurado.'
      });
    }

    if (!pronac || pronac !== org.pronac) {
      return res.status(400).json({
        status: 'error',
        message: 'PRONAC não corresponde ao projeto desta organização.'
      });
    }

    if (!ir_total || ir_total <= 0) {
      return res.status(400).json({ status: 'error', message: 'IR total deve ser maior que zero.' });
    }

    if (!donation_amount || donation_amount <= 0) {
      return res.status(400).json({ status: 'error', message: 'Valor da destinação deve ser maior que zero.' });
    }

    if (!fiscal_year || fiscal_year < 2024) {
      return res.status(400).json({ status: 'error', message: 'Ano fiscal inválido.' });
    }

    // Limite Rouanet: max_percentage da org (padrão 6%)
    const maxPct     = parseFloat(org.max_percentage) / 100 || 0.06;
    const limiteMax  = ir_total * maxPct;

    if (donation_amount > limiteMax) {
      return res.status(400).json({
        status: 'error',
        message: `Valor excede o limite de ${(maxPct * 100).toFixed(0)}% do IR (R$ ${limiteMax.toFixed(2)}).`
      });
    }

    // Verificar total já destinado no mesmo ano/org
    const existingResult = await client.query(`
      SELECT COALESCE(SUM(donation_amount), 0) AS total
      FROM donations
      WHERE user_id = $1 AND fiscal_year = $2 AND pronac = $3 AND status != 'cancelled'
    `, [userId, fiscal_year, pronac]);

    const totalJa   = parseFloat(existingResult.rows[0].total);
    const novoTotal = totalJa + donation_amount;

    if (novoTotal > limiteMax) {
      return res.status(400).json({
        status: 'error',
        message: `Total no ano (R$ ${novoTotal.toFixed(2)}) excederia o limite de ${(maxPct * 100).toFixed(0)}% do IR (R$ ${limiteMax.toFixed(2)}). Já destinado: R$ ${totalJa.toFixed(2)}.`
      });
    }

    // Buscar fundo FNC (Lei Rouanet)
    const fncResult = await client.query(
      `SELECT id FROM official_funds WHERE code = 'FNC' LIMIT 1`
    );
    const fncId = fncResult.rows[0]?.id || null;

    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO donations
        (user_id, pronac, official_fund_id, ir_total, donation_amount, fiscal_year, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, created_at
    `, [userId, pronac, fncId, ir_total, donation_amount, fiscal_year]);

    const donation = result.rows[0];

    // Atualizar total_donated do usuário
    await client.query(
      'UPDATE users SET total_donated = total_donated + $1 WHERE id = $2',
      [donation_amount, userId]
    );

    await client.query('COMMIT');

    // Notificações (não bloqueia resposta)
    try {
      const userRow = await pool.query('SELECT nome, email, phone FROM users WHERE id = $1', [userId]);
      const user    = userRow.rows[0];
      if (user) {
        notifyDestinationRegistered(
          { name: user.nome, email: user.email, phone: user.phone },
          { amount: donation_amount },
          { title: org.pronac_titulo || `Projeto PRONAC ${pronac}` },
          org
        ).catch(() => {});
      }
    } catch (_) {}

    res.status(201).json({
      status: 'success',
      message: 'Destinação registrada com sucesso!',
      donation: {
        id:               donation.id,
        pronac,
        projeto_titulo:   org.pronac_titulo || `Projeto PRONAC ${pronac}`,
        ir_total,
        donation_amount,
        percentage_of_ir: Math.round((donation_amount / ir_total) * 10000) / 100,
        fiscal_year,
        status:           'pending',
        created_at:       donation.created_at,
        // Dados bancários para pagamento
        banco: {
          beneficiary_name: org.beneficiary_name,
          beneficiary_cnpj: org.beneficiary_cnpj,
          bank_name:        org.bank_name,
          bank_code:        org.bank_code,
          bank_agency:      org.bank_agency,
          bank_account:     org.bank_account,
          pix_key:          org.pix_key,
          pix_key_type:     org.pix_key_type
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar destinação Rouanet:', error.message);
    res.status(500).json({ status: 'error', message: 'Erro interno ao registrar destinação.' });
  } finally {
    client.release();
  }
});

// GET /api/donations - Listar doações do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fiscal_year, status, limit = 20, offset = 0 } = req.query;

    let whereConditions = ['d.user_id = $1'];
    let params = [userId];
    let paramIndex = 2;

    if (fiscal_year) {
      whereConditions.push(`d.fiscal_year = $${paramIndex++}`);
      params.push(parseInt(fiscal_year));
    }

    if (status) {
      whereConditions.push(`d.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Contar total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM donations d ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Buscar doações
    const result = await pool.query(`
      SELECT
        d.id,
        d.ir_total,
        d.donation_amount,
        d.fiscal_year,
        d.status,
        d.created_at,
        d.receipt_file_path,
        p.id AS project_id,
        p.code AS project_code,
        p.title AS project_title,
        f.id AS fund_id,
        f.code AS fund_code,
        f.name AS fund_name
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Calcular totais
    const totalsResult = await pool.query(`
      SELECT
        COALESCE(SUM(donation_amount), 0) AS total_donated,
        COUNT(*) AS total_donations
      FROM donations d
      ${whereClause} AND d.status != 'cancelled'
    `, params);

    const totals = totalsResult.rows[0];

    res.json({
      status: 'success',
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      summary: {
        total_donated: parseFloat(totals.total_donated),
        total_donations: parseInt(totals.total_donations)
      },
      donations: result.rows.map(d => ({
        id: d.id,
        ir_total: parseFloat(d.ir_total),
        donation_amount: parseFloat(d.donation_amount),
        percentage_of_ir: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        receipt_file_path: d.receipt_file_path,
        project: {
          id: d.project_id,
          code: d.project_code,
          title: d.project_title
        },
        fund: {
          id: d.fund_id,
          code: d.fund_code,
          name: d.fund_name
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar doações:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar doações.'
    });
  }
});

// GET /api/donations/:id - Detalhes de uma doação
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    const result = await pool.query(`
      SELECT
        d.*,
        p.id AS project_id,
        p.code AS project_code,
        p.title AS project_title,
        p.description AS project_description,
        f.id AS fund_id,
        f.code AS fund_code,
        f.name AS fund_name,
        f.bank_code,
        f.agency,
        f.account,
        f.cnpj AS fund_cnpj,
        o.name AS org_name,
        o.cnpj AS org_cnpj
      FROM donations d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      LEFT JOIN intermediary_organizations o ON p.intermediary_org_id = o.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Doação não encontrada.'
      });
    }

    const d = result.rows[0];

    res.json({
      status: 'success',
      donation: {
        id: d.id,
        ir_total: parseFloat(d.ir_total),
        donation_amount: parseFloat(d.donation_amount),
        percentage_of_ir: parseFloat(d.ir_total) > 0
          ? Math.round((parseFloat(d.donation_amount) / parseFloat(d.ir_total)) * 10000) / 100
          : 0,
        fiscal_year: d.fiscal_year,
        status: d.status,
        created_at: d.created_at,
        project: {
          id: d.project_id,
          code: d.project_code,
          title: d.project_title,
          description: d.project_description
        },
        fund: {
          id: d.fund_id,
          code: d.fund_code,
          name: d.fund_name,
          bank_code: d.bank_code,
          agency: d.agency,
          account: d.account,
          cnpj: d.fund_cnpj
        },
        organization: {
          name: d.org_name,
          cnpj: d.org_cnpj
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar doação:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar doação.'
    });
  }
});

// GET /api/donations/:id/comprovante - Gerar PDF do comprovante
router.get('/:id/comprovante', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    // Buscar doação com todos os dados necessários
    const result = await pool.query(`
      SELECT
        d.*,
        u.nome as user_nome,
        u.cpf as user_cpf,
        u.email as user_email,
        p.title as project_title,
        p.code as project_code,
        f.name as fund_name,
        f.code as fund_code,
        f.cnpj as fund_cnpj,
        f.bank_code,
        f.agency,
        f.account
      FROM donations d
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN official_funds f ON d.official_fund_id = f.id
      WHERE d.id = $1 AND d.user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Destinação não encontrada.'
      });
    }

    const row = result.rows[0];

    // Verificar se está confirmada
    if (row.status !== 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: 'Comprovante disponível apenas para destinações confirmadas.'
      });
    }

    // Preparar dados para o PDF
    const donation = {
      id: row.id,
      donation_amount: parseFloat(row.donation_amount),
      ir_total: parseFloat(row.ir_total),
      fiscal_year: row.fiscal_year,
      created_at: row.created_at,
      confirmed_at: row.confirmed_at
    };

    const user = {
      nome: row.user_nome,
      cpf: row.user_cpf,
      email: row.user_email
    };

    const project = {
      title: row.project_title,
      code: row.project_code
    };

    const fund = {
      name: row.fund_name,
      code: row.fund_code,
      cnpj: row.fund_cnpj,
      bank_code: row.bank_code,
      agency: row.agency,
      account: row.account
    };

    // Gerar PDF
    const doc = gerarComprovante(donation, user, project, fund);

    // Configurar headers para download
    const fileName = `comprovante-${id.substring(0, 8)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Enviar PDF
    doc.pipe(res);
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar comprovante:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao gerar comprovante.'
    });
  }
});

export default router;
