import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

// Validar UUID
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// GET /api/organizations - Lista organizações
router.get('/', async (req, res) => {
  try {
    const {
      type,
      accreditation_status,
      limit = 20,
      offset = 0
    } = req.query;

    // Construir query dinamicamente
    let whereConditions = ['o.is_active = true'];
    let params = [];
    let paramIndex = 1;

    if (type) {
      whereConditions.push(`o.type = $${paramIndex++}`);
      params.push(type);
    }

    if (accreditation_status) {
      whereConditions.push(`o.accreditation_status = $${paramIndex++}`);
      params.push(accreditation_status);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM intermediary_organizations o ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Query principal com estatísticas
    const query = `
      SELECT
        o.id,
        o.name,
        o.legal_name,
        o.type,
        o.cnpj,
        o.email,
        o.phone,
        o.representative_name,
        o.accreditation_status,
        o.logo_url,
        o.description,
        o.created_at,
        j.name AS jurisdiction_name,
        j.uf,
        f.name AS fund_name,
        f.code AS fund_code,
        COUNT(p.id) FILTER (WHERE p.status = 'active') AS active_projects_count,
        COUNT(p.id) AS total_projects_count,
        COALESCE(SUM(p.current_amount), 0) AS total_raised
      FROM intermediary_organizations o
      LEFT JOIN jurisdictions j ON o.jurisdiction_id = j.id
      LEFT JOIN official_funds f ON o.official_fund_id = f.id
      LEFT JOIN projects p ON p.intermediary_org_id = o.id
      ${whereClause}
      GROUP BY o.id, j.name, j.uf, f.name, f.code
      ORDER BY o.name ASC
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
      organizations: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        legal_name: row.legal_name,
        type: row.type,
        cnpj: row.cnpj,
        email: row.email,
        phone: row.phone,
        representative_name: row.representative_name,
        accreditation_status: row.accreditation_status,
        logo_url: row.logo_url,
        description: row.description,
        created_at: row.created_at,
        jurisdiction: {
          name: row.jurisdiction_name,
          uf: row.uf
        },
        fund: {
          name: row.fund_name,
          code: row.fund_code
        },
        stats: {
          active_projects: parseInt(row.active_projects_count),
          total_projects: parseInt(row.total_projects_count),
          total_raised: parseFloat(row.total_raised)
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar organizações:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar organizações.'
    });
  }
});

// GET /api/organizations/:id - Detalhes de uma organização
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID inválido.'
      });
    }

    // Buscar organização
    const orgResult = await pool.query(`
      SELECT
        o.*,
        j.id AS jurisdiction_id,
        j.name AS jurisdiction_name,
        j.uf,
        f.id AS fund_id,
        f.name AS fund_name,
        f.code AS fund_code,
        f.fund_type
      FROM intermediary_organizations o
      LEFT JOIN jurisdictions j ON o.jurisdiction_id = j.id
      LEFT JOIN official_funds f ON o.official_fund_id = f.id
      WHERE o.id = $1
    `, [id]);

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Organização não encontrada.'
      });
    }

    const org = orgResult.rows[0];

    // Buscar projetos da organização
    const projectsResult = await pool.query(`
      SELECT
        p.id,
        p.code,
        p.title,
        p.goal_amount,
        p.current_amount,
        p.status,
        p.category,
        p.is_featured,
        p.total_donors
      FROM projects p
      WHERE p.intermediary_org_id = $1
      ORDER BY p.is_featured DESC, p.created_at DESC
    `, [id]);

    // Calcular estatísticas
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) AS total_projects,
        COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
        COALESCE(SUM(current_amount), 0) AS total_raised,
        COALESCE(SUM(total_donors), 0) AS total_donors
      FROM projects
      WHERE intermediary_org_id = $1
    `, [id]);

    const stats = statsResult.rows[0];

    res.json({
      status: 'success',
      organization: {
        id: org.id,
        name: org.name,
        legal_name: org.legal_name,
        type: org.type,
        cnpj: org.cnpj,
        email: org.email,
        phone: org.phone,
        representative_name: org.representative_name,
        representative_cpf: org.representative_cpf,
        accreditation_status: org.accreditation_status,
        logo_url: org.logo_url,
        description: org.description,
        created_at: org.created_at,
        jurisdiction: {
          id: org.jurisdiction_id,
          name: org.jurisdiction_name,
          uf: org.uf
        },
        fund: {
          id: org.fund_id,
          name: org.fund_name,
          code: org.fund_code,
          fund_type: org.fund_type
        }
      },
      stats: {
        total_projects: parseInt(stats.total_projects),
        active_projects: parseInt(stats.active_projects),
        completed_projects: parseInt(stats.completed_projects),
        total_raised: parseFloat(stats.total_raised),
        total_donors: parseInt(stats.total_donors)
      },
      projects: projectsResult.rows.map(p => ({
        id: p.id,
        code: p.code,
        title: p.title,
        goal_amount: parseFloat(p.goal_amount),
        current_amount: parseFloat(p.current_amount),
        percentage_raised: parseFloat(p.goal_amount) > 0
          ? Math.round((parseFloat(p.current_amount) / parseFloat(p.goal_amount)) * 100)
          : 0,
        status: p.status,
        category: p.category,
        is_featured: p.is_featured,
        total_donors: p.total_donors
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar organização:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar organização.'
    });
  }
});

export default router;
