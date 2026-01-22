import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

// Validar UUID
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// GET /api/funds - Lista todos os fundos ativos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.code,
        f.name,
        f.legal_name,
        f.fund_type,
        f.federal_law,
        f.local_law,
        f.donation_mode,
        f.bank_code,
        f.agency,
        f.account,
        f.cnpj,
        f.requires_project,
        f.requires_pre_approval,
        f.is_active,
        f.created_at,
        ig.id AS group_id,
        ig.code AS group_code,
        ig.name AS group_name,
        ig.max_percentage,
        ig.max_percentage_with_sports,
        ig.period_type,
        j.id AS jurisdiction_id,
        j.name AS jurisdiction_name,
        j.uf
      FROM official_funds f
      LEFT JOIN incentive_groups ig ON f.incentive_group_id = ig.id
      LEFT JOIN jurisdictions j ON f.jurisdiction_id = j.id
      WHERE f.is_active = true
      ORDER BY ig.code, f.name
    `);

    res.json({
      status: 'success',
      count: result.rows.length,
      funds: result.rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        legal_name: row.legal_name,
        fund_type: row.fund_type,
        federal_law: row.federal_law,
        local_law: row.local_law,
        donation_mode: row.donation_mode,
        bank_code: row.bank_code,
        agency: row.agency,
        account: row.account,
        cnpj: row.cnpj,
        requires_project: row.requires_project,
        requires_pre_approval: row.requires_pre_approval,
        is_active: row.is_active,
        created_at: row.created_at,
        group: {
          id: row.group_id,
          code: row.group_code,
          name: row.group_name,
          max_percentage: parseFloat(row.max_percentage),
          max_percentage_with_sports: row.max_percentage_with_sports ? parseFloat(row.max_percentage_with_sports) : null,
          period_type: row.period_type
        },
        jurisdiction: {
          id: row.jurisdiction_id,
          name: row.jurisdiction_name,
          uf: row.uf
        }
      }))
    });

  } catch (error) {
    console.error('Erro ao listar fundos:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar fundos.'
    });
  }
});

// GET /api/funds/:id - Detalhes de um fundo específico
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
        f.*,
        ig.id AS group_id,
        ig.code AS group_code,
        ig.name AS group_name,
        ig.max_percentage,
        ig.max_percentage_with_sports,
        ig.period_type,
        ig.description AS group_description,
        j.id AS jurisdiction_id,
        j.name AS jurisdiction_name,
        j.uf,
        j.type AS jurisdiction_type
      FROM official_funds f
      LEFT JOIN incentive_groups ig ON f.incentive_group_id = ig.id
      LEFT JOIN jurisdictions j ON f.jurisdiction_id = j.id
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Fundo não encontrado.'
      });
    }

    // Contar projetos ativos
    const projectsCount = await pool.query(`
      SELECT COUNT(*) FROM projects
      WHERE official_fund_id = $1 AND status = 'active'
    `, [id]);

    const row = result.rows[0];

    res.json({
      status: 'success',
      fund: {
        id: row.id,
        code: row.code,
        name: row.name,
        legal_name: row.legal_name,
        fund_type: row.fund_type,
        federal_law: row.federal_law,
        local_law: row.local_law,
        donation_mode: row.donation_mode,
        bank_code: row.bank_code,
        agency: row.agency,
        account: row.account,
        cnpj: row.cnpj,
        requires_project: row.requires_project,
        requires_pre_approval: row.requires_pre_approval,
        is_active: row.is_active,
        created_at: row.created_at,
        group: {
          id: row.group_id,
          code: row.group_code,
          name: row.group_name,
          max_percentage: parseFloat(row.max_percentage),
          max_percentage_with_sports: row.max_percentage_with_sports ? parseFloat(row.max_percentage_with_sports) : null,
          period_type: row.period_type,
          description: row.group_description
        },
        jurisdiction: {
          id: row.jurisdiction_id,
          name: row.jurisdiction_name,
          uf: row.uf,
          type: row.jurisdiction_type
        }
      },
      active_projects_count: parseInt(projectsCount.rows[0].count)
    });

  } catch (error) {
    console.error('Erro ao buscar fundo:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar fundo.'
    });
  }
});

export default router;
