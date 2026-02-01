import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

// GET /api/org-dashboard/:slug/stats
// Retorna estatisticas agregadas da organizacao (publico)
router.get('/:slug/stats', async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar a organizacao pelo slug
    const orgResult = await pool.query(
      'SELECT id, name, slug, logo_url, primary_color, secondary_color, fund_type, fund_name FROM organizations WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Organizacao nao encontrada'
      });
    }

    const org = orgResult.rows[0];

    // Buscar estatisticas via intermediary_organizations vinculadas
    // Tenta vincular pelo nome da org com intermediary_organizations
    const statsQuery = `
      SELECT
        COUNT(DISTINCT d.user_id) AS total_doadores,
        COUNT(d.id) AS total_doacoes,
        COALESCE(SUM(d.donation_amount), 0) AS total_destinado,
        COUNT(DISTINCT d.project_id) AS projetos_apoiados
      FROM donations d
      JOIN projects p ON d.project_id = p.id
      WHERE p.organization_id = $1
        AND d.status IN ('confirmed', 'processed')
    `;

    // Fallback: se projects nao tem organization_id, buscar via intermediary_organizations
    const fallbackQuery = `
      SELECT
        COUNT(DISTINCT d.user_id) AS total_doadores,
        COUNT(d.id) AS total_doacoes,
        COALESCE(SUM(d.donation_amount), 0) AS total_destinado,
        COUNT(DISTINCT d.project_id) AS projetos_apoiados
      FROM donations d
      JOIN projects p ON d.project_id = p.id
      JOIN intermediary_organizations io ON p.intermediary_org_id = io.id
      WHERE io.name ILIKE '%' || $1 || '%'
        AND d.status IN ('confirmed', 'processed')
    `;

    let statsResult;
    try {
      statsResult = await pool.query(statsQuery, [org.id]);
    } catch {
      statsResult = await pool.query(fallbackQuery, [org.name]);
    }

    const stats = statsResult.rows[0] || {
      total_doadores: 0,
      total_doacoes: 0,
      total_destinado: 0,
      projetos_apoiados: 0
    };

    // Calcular taxa de engajamento (doadores / total de usuarios cadastrados)
    const usersResult = await pool.query('SELECT COUNT(*) AS total FROM users');
    const totalUsers = parseInt(usersResult.rows[0].total) || 1;
    const taxaEngajamento = totalUsers > 0
      ? Math.round((parseInt(stats.total_doadores) / totalUsers) * 100)
      : 0;

    res.json({
      status: 'success',
      organization: {
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        primary_color: org.primary_color,
        secondary_color: org.secondary_color,
        fund_type: org.fund_type,
        fund_name: org.fund_name
      },
      stats: {
        total_destinado: parseFloat(stats.total_destinado) || 0,
        total_doadores: parseInt(stats.total_doadores) || 0,
        total_doacoes: parseInt(stats.total_doacoes) || 0,
        projetos_apoiados: parseInt(stats.projetos_apoiados) || 0,
        taxa_engajamento: taxaEngajamento
      }
    });
  } catch (error) {
    console.error('Erro ao buscar stats da org:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar estatisticas'
    });
  }
});

// GET /api/org-dashboard/:slug/monthly
// Retorna evolucao mensal para grafico (publico)
router.get('/:slug/monthly', async (req, res) => {
  try {
    const { slug } = req.params;

    const orgResult = await pool.query(
      'SELECT id, name FROM organizations WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Organizacao nao encontrada'
      });
    }

    const org = orgResult.rows[0];

    const monthlyQuery = `
      SELECT
        TO_CHAR(d.created_at, 'YYYY-MM') AS mes,
        COUNT(d.id) AS doacoes,
        COALESCE(SUM(d.donation_amount), 0) AS valor
      FROM donations d
      JOIN projects p ON d.project_id = p.id
      WHERE p.organization_id = $1
        AND d.status IN ('confirmed', 'processed')
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `;

    const fallbackQuery = `
      SELECT
        TO_CHAR(d.created_at, 'YYYY-MM') AS mes,
        COUNT(d.id) AS doacoes,
        COALESCE(SUM(d.donation_amount), 0) AS valor
      FROM donations d
      JOIN projects p ON d.project_id = p.id
      JOIN intermediary_organizations io ON p.intermediary_org_id = io.id
      WHERE io.name ILIKE '%' || $1 || '%'
        AND d.status IN ('confirmed', 'processed')
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `;

    let result;
    try {
      result = await pool.query(monthlyQuery, [org.id]);
    } catch {
      result = await pool.query(fallbackQuery, [org.name]);
    }

    res.json({
      status: 'success',
      monthly: result.rows.map(row => ({
        mes: row.mes,
        doacoes: parseInt(row.doacoes),
        valor: parseFloat(row.valor)
      })).reverse()
    });
  } catch (error) {
    console.error('Erro ao buscar dados mensais:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar dados mensais'
    });
  }
});

// GET /api/org-dashboard/:slug/projects
// Retorna projetos da organizacao com progresso (publico)
router.get('/:slug/projects', async (req, res) => {
  try {
    const { slug } = req.params;

    const orgResult = await pool.query(
      'SELECT id, name FROM organizations WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Organizacao nao encontrada'
      });
    }

    const org = orgResult.rows[0];

    const projectsQuery = `
      SELECT
        p.id, p.title, p.category, p.status,
        p.goal_amount, p.current_amount, p.total_donors,
        p.cover_image_url,
        CASE WHEN p.goal_amount > 0
          THEN ROUND((p.current_amount / p.goal_amount) * 100)
          ELSE 0 END AS progress_pct
      FROM projects p
      WHERE p.organization_id = $1
      ORDER BY p.is_featured DESC, p.current_amount DESC
    `;

    const fallbackQuery = `
      SELECT
        p.id, p.title, p.category, p.status,
        p.goal_amount, p.current_amount, p.total_donors,
        p.cover_image_url,
        CASE WHEN p.goal_amount > 0
          THEN ROUND((p.current_amount / p.goal_amount) * 100)
          ELSE 0 END AS progress_pct
      FROM projects p
      JOIN intermediary_organizations io ON p.intermediary_org_id = io.id
      WHERE io.name ILIKE '%' || $1 || '%'
      ORDER BY p.is_featured DESC, p.current_amount DESC
    `;

    let result;
    try {
      result = await pool.query(projectsQuery, [org.id]);
    } catch {
      result = await pool.query(fallbackQuery, [org.name]);
    }

    res.json({
      status: 'success',
      projects: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        category: row.category,
        status: row.status,
        goal_amount: parseFloat(row.goal_amount) || 0,
        current_amount: parseFloat(row.current_amount) || 0,
        total_donors: parseInt(row.total_donors) || 0,
        cover_image_url: row.cover_image_url,
        progress_pct: parseInt(row.progress_pct) || 0
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar projetos da org:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar projetos'
    });
  }
});

// GET /api/org-dashboard/:slug/ranking
// Retorna ranking de organizacoes (publico)
router.get('/:slug/ranking', async (req, res) => {
  try {
    const rankingQuery = `
      SELECT
        org.name, org.slug, org.logo_url,
        COUNT(DISTINCT d.user_id) AS doadores,
        COALESCE(SUM(d.donation_amount), 0) AS total
      FROM organizations org
      LEFT JOIN projects p ON p.organization_id = org.id
      LEFT JOIN donations d ON d.project_id = p.id AND d.status IN ('confirmed', 'processed')
      WHERE org.is_active = true AND org.slug != 'www'
      GROUP BY org.id, org.name, org.slug, org.logo_url
      ORDER BY total DESC
      LIMIT 10
    `;

    const fallbackQuery = `
      SELECT
        org.name, org.slug, org.logo_url,
        COUNT(DISTINCT d.user_id) AS doadores,
        COALESCE(SUM(d.donation_amount), 0) AS total
      FROM organizations org
      LEFT JOIN intermediary_organizations io ON io.name ILIKE '%' || org.name || '%'
      LEFT JOIN projects p ON p.intermediary_org_id = io.id
      LEFT JOIN donations d ON d.project_id = p.id AND d.status IN ('confirmed', 'processed')
      WHERE org.is_active = true AND org.slug != 'www'
      GROUP BY org.id, org.name, org.slug, org.logo_url
      ORDER BY total DESC
      LIMIT 10
    `;

    let result;
    try {
      result = await pool.query(rankingQuery);
    } catch {
      result = await pool.query(fallbackQuery);
    }

    res.json({
      status: 'success',
      ranking: result.rows.map((row, index) => ({
        posicao: index + 1,
        name: row.name,
        slug: row.slug,
        logo_url: row.logo_url,
        doadores: parseInt(row.doadores) || 0,
        total: parseFloat(row.total) || 0
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar ranking:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar ranking'
    });
  }
});

export default router;
