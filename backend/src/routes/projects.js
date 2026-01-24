import express from 'express';
import pool from '../../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Validar UUID
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// GET /api/projects - Lista projetos com filtros
router.get('/', async (req, res) => {
  try {
    const {
      fund_id,
      fund_type,
      status = 'active',
      category,
      is_featured,
      limit = 20,
      offset = 0
    } = req.query;

    // Construir query dinamicamente
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (fund_id) {
      if (!isValidUUID(fund_id)) {
        return res.status(400).json({
          status: 'error',
          message: 'fund_id inválido.'
        });
      }
      whereConditions.push(`p.official_fund_id = $${paramIndex++}`);
      params.push(fund_id);
    }

    if (fund_type) {
      whereConditions.push(`f.fund_type = $${paramIndex++}`);
      params.push(fund_type);
    }

    if (status) {
      whereConditions.push(`p.status = $${paramIndex++}`);
      params.push(status);
    }

    if (category) {
      whereConditions.push(`p.category = $${paramIndex++}`);
      params.push(category);
    }

    if (is_featured === 'true') {
      whereConditions.push(`p.is_featured = true`);
    }

    // Filtrar por organização/tenant (se não for 'www', mostrar apenas projetos dessa org)
    if (req.organization && req.organization.slug !== 'www') {
      whereConditions.push(`p.organization_id = $${paramIndex++}`);
      params.push(req.organization.id);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) FROM projects p
      LEFT JOIN official_funds f ON p.official_fund_id = f.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Query principal com paginação
    const query = `
      SELECT
        p.id,
        p.code,
        p.title,
        p.description,
        p.goal_amount,
        p.current_amount,
        p.start_date,
        p.end_date,
        p.category,
        p.status,
        p.cover_image_url,
        p.total_donors,
        p.is_featured,
        p.created_at,
        o.id AS org_id,
        o.name AS org_name,
        o.type AS org_type,
        f.id AS fund_id,
        f.code AS fund_code,
        f.name AS fund_name,
        f.fund_type,
        j.name AS jurisdiction_name,
        j.uf
      FROM projects p
      LEFT JOIN intermediary_organizations o ON p.intermediary_org_id = o.id
      LEFT JOIN official_funds f ON p.official_fund_id = f.id
      LEFT JOIN jurisdictions j ON f.jurisdiction_id = j.id
      ${whereClause}
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);

    res.json({
      status: 'success',
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      count: result.rows.length,
      projects: result.rows.map(row => {
        const goalAmount = parseFloat(row.goal_amount) || 0;
        const currentAmount = parseFloat(row.current_amount) || 0;
        const percentageRaised = goalAmount > 0
          ? Math.round((currentAmount / goalAmount) * 100)
          : 0;

        return {
          id: row.id,
          code: row.code,
          title: row.title,
          description: row.description,
          goal_amount: goalAmount,
          current_amount: currentAmount,
          percentage_raised: percentageRaised,
          start_date: row.start_date,
          end_date: row.end_date,
          category: row.category,
          status: row.status,
          cover_image_url: row.cover_image_url,
          total_donors: row.total_donors,
          is_featured: row.is_featured,
          created_at: row.created_at,
          organization: {
            id: row.org_id,
            name: row.org_name,
            type: row.org_type
          },
          fund: {
            id: row.fund_id,
            code: row.fund_code,
            name: row.fund_name,
            fund_type: row.fund_type
          },
          jurisdiction: {
            name: row.jurisdiction_name,
            uf: row.uf
          }
        };
      })
    });

  } catch (error) {
    console.error('Erro ao listar projetos:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar projetos.'
    });
  }
});

// GET /api/projects/:id - Detalhes de um projeto
router.get('/:id', async (req, res) => {
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
        p.*,
        o.id AS org_id,
        o.name AS org_name,
        o.legal_name AS org_legal_name,
        o.type AS org_type,
        o.cnpj AS org_cnpj,
        o.email AS org_email,
        o.phone AS org_phone,
        o.description AS org_description,
        o.accreditation_status AS org_status,
        f.id AS fund_id,
        f.code AS fund_code,
        f.name AS fund_name,
        f.fund_type,
        f.federal_law,
        f.donation_mode,
        ig.max_percentage,
        ig.name AS group_name,
        j.id AS jurisdiction_id,
        j.name AS jurisdiction_name,
        j.uf
      FROM projects p
      LEFT JOIN intermediary_organizations o ON p.intermediary_org_id = o.id
      LEFT JOIN official_funds f ON p.official_fund_id = f.id
      LEFT JOIN incentive_groups ig ON f.incentive_group_id = ig.id
      LEFT JOIN jurisdictions j ON f.jurisdiction_id = j.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Projeto não encontrado.'
      });
    }

    const row = result.rows[0];
    const goalAmount = parseFloat(row.goal_amount) || 0;
    const currentAmount = parseFloat(row.current_amount) || 0;
    const percentageRaised = goalAmount > 0
      ? Math.round((currentAmount / goalAmount) * 100)
      : 0;

    // Calcular dias restantes
    let daysRemaining = null;
    if (row.end_date) {
      const today = new Date();
      const endDate = new Date(row.end_date);
      const diffTime = endDate - today;
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) daysRemaining = 0;
    }

    res.json({
      status: 'success',
      project: {
        id: row.id,
        code: row.code,
        title: row.title,
        description: row.description,
        goal_amount: goalAmount,
        current_amount: currentAmount,
        percentage_raised: percentageRaised,
        amount_remaining: goalAmount - currentAmount,
        start_date: row.start_date,
        end_date: row.end_date,
        days_remaining: daysRemaining,
        category: row.category,
        status: row.status,
        cover_image_url: row.cover_image_url,
        total_donors: row.total_donors,
        is_featured: row.is_featured,
        created_at: row.created_at,
        // Dados bancários para doação
        bank_name: row.bank_name,
        bank_code: row.bank_code,
        bank_agency: row.bank_agency,
        bank_account: row.bank_account,
        pix_key: row.pix_key,
        pix_key_type: row.pix_key_type,
        beneficiary_name: row.beneficiary_name,
        beneficiary_cnpj: row.beneficiary_cnpj,
        organization: {
          id: row.org_id,
          name: row.org_name,
          legal_name: row.org_legal_name,
          type: row.org_type,
          cnpj: row.org_cnpj,
          email: row.org_email,
          phone: row.org_phone,
          description: row.org_description,
          accreditation_status: row.org_status
        },
        fund: {
          id: row.fund_id,
          code: row.fund_code,
          name: row.fund_name,
          fund_type: row.fund_type,
          federal_law: row.federal_law,
          donation_mode: row.donation_mode,
          max_percentage: row.max_percentage ? parseFloat(row.max_percentage) : null,
          group_name: row.group_name
        },
        jurisdiction: {
          id: row.jurisdiction_id,
          name: row.jurisdiction_name,
          uf: row.uf
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar projeto:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar projeto.'
    });
  }
});

// POST /api/projects - Criar projeto (em desenvolvimento)
router.post('/', authenticateToken, async (req, res) => {
  res.status(501).json({
    status: 'error',
    message: 'Endpoint em desenvolvimento.'
  });
});

export default router;
