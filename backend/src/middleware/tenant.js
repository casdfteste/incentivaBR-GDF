import pool from '../../config/database.js';

/**
 * Middleware de Multi-Tenant
 * Detecta o tenant (organização) pelo:
 * - Subdomínio: ajufer.incentivabr.com.br → slug = 'ajufer'
 * - Query param (dev): ?org=ajufer → slug = 'ajufer'
 * - Padrão: slug = 'www'
 */
async function tenantMiddleware(req, res, next) {
  try {
    let slug = 'www'; // padrão

    // 1. Verificar query param (para desenvolvimento)
    if (req.query.org) {
      slug = req.query.org;
    }
    // 2. Verificar subdomínio
    else if (req.hostname) {
      const parts = req.hostname.split('.');
      // Se tiver mais de 2 partes e não for www, usar como slug
      // Ex: ajufer.incentivabr.com.br → parts = ['ajufer', 'incentivabr', 'com', 'br']
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
        slug = parts[0];
      }
      // Para desenvolvimento local com subdomínio
      // Ex: ajufer.localhost → parts = ['ajufer', 'localhost']
      else if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www') {
        slug = parts[0];
      }
    }

    // Buscar organização pelo slug
    const result = await pool.query(
      'SELECT * FROM organizations WHERE slug = $1 AND is_active = true',
      [slug]
    );

    if (result.rows.length > 0) {
      req.organization = result.rows[0];
    } else {
      // Fallback para organização padrão (www)
      const defaultOrg = await pool.query(
        'SELECT * FROM organizations WHERE slug = $1',
        ['www']
      );
      req.organization = defaultOrg.rows[0] || null;
    }

    // Adicionar slug ao request para fácil acesso
    req.tenantSlug = req.organization?.slug || 'www';

    next();
  } catch (error) {
    console.error('Erro no tenant middleware:', error.message);
    // Continuar sem organização em caso de erro
    req.organization = null;
    req.tenantSlug = 'www';
    next();
  }
}

export default tenantMiddleware;
