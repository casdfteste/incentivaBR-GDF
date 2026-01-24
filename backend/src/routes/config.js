import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

/**
 * GET /api/config/organization
 * Retorna dados da organização atual (baseado no tenant)
 */
router.get('/organization', async (req, res) => {
  try {
    if (req.organization) {
      res.json({
        status: 'success',
        organization: {
          id: req.organization.id,
          name: req.organization.name,
          slug: req.organization.slug,
          logo_url: req.organization.logo_url,
          primary_color: req.organization.primary_color,
          secondary_color: req.organization.secondary_color,
          fund_type: req.organization.fund_type,
          fund_name: req.organization.fund_name,
          legal_basis: req.organization.legal_basis,
          max_percentage: parseFloat(req.organization.max_percentage) || 6.00,
          // Dados bancários públicos
          bank_name: req.organization.bank_name,
          bank_code: req.organization.bank_code,
          bank_agency: req.organization.bank_agency,
          bank_account: req.organization.bank_account,
          pix_key: req.organization.pix_key,
          pix_key_type: req.organization.pix_key_type,
          beneficiary_name: req.organization.beneficiary_name,
          beneficiary_cnpj: req.organization.beneficiary_cnpj,
          // Contato
          contact_email: req.organization.contact_email,
          contact_phone: req.organization.contact_phone
        }
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Organização não encontrada'
      });
    }
  } catch (error) {
    console.error('Erro ao buscar organização:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao buscar organização'
    });
  }
});

/**
 * GET /api/config/organizations
 * Lista todas as organizações ativas (público)
 */
router.get('/organizations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, logo_url, fund_type, fund_name, max_percentage
       FROM organizations
       WHERE is_active = true
       ORDER BY name`
    );

    res.json({
      status: 'success',
      organizations: result.rows.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        fund_type: org.fund_type,
        fund_name: org.fund_name,
        max_percentage: parseFloat(org.max_percentage) || 6.00
      }))
    });
  } catch (error) {
    console.error('Erro ao listar organizações:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao listar organizações'
    });
  }
});

export default router;
