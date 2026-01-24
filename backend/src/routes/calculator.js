import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

// Tabela IR 2026 (ano-calendário 2025)
const TABELA_IR_2026 = [
  { limite: 28467.20, aliquota: 0, deducao: 0 },
  { limite: 33919.80, aliquota: 0.075, deducao: 2135.04 },
  { limite: 45012.60, aliquota: 0.15, deducao: 4679.03 },
  { limite: 55976.16, aliquota: 0.225, deducao: 8054.97 },
  { limite: Infinity, aliquota: 0.275, deducao: 10853.78 }
];

// Constantes de dedução
const DEDUCAO_DEPENDENTE = 2275.08;
const DEDUCAO_EDUCACAO_MAX = 3561.50;

// Limites de destinação por grupo (% do IR devido) - valores padrão
const LIMITE_GRUPO_1_SEM_ESPORTE = 0.06; // 6% - FDI + FDCA
const LIMITE_GRUPO_1_COM_ESPORTE = 0.07; // 7% - com esporte
const LIMITE_PRONON = 0.01; // 1%
const LIMITE_PRONAS = 0.01; // 1%
const LIMITE_TOTAL_MAXIMO = 0.09; // 9% total

/**
 * Obtém limite máximo baseado na organização/tenant
 * Se organização específica, usa seu max_percentage
 * Se www (geral), usa o total máximo padrão
 */
function getOrganizationLimits(org) {
  if (!org || org.slug === 'www') {
    return {
      grupo_1_sem_esporte: LIMITE_GRUPO_1_SEM_ESPORTE,
      grupo_1_com_esporte: LIMITE_GRUPO_1_COM_ESPORTE,
      pronon: LIMITE_PRONON,
      pronas_pcd: LIMITE_PRONAS,
      total_maximo: LIMITE_TOTAL_MAXIMO
    };
  }

  // Organização específica - usar max_percentage dela
  const maxPercent = parseFloat(org.max_percentage) / 100 || 0.06;

  // Ajustar limites baseado no tipo de fundo da organização
  switch (org.fund_type) {
    case 'fia':
    case 'fdi':
      return {
        grupo_1_sem_esporte: maxPercent,
        grupo_1_com_esporte: maxPercent,
        pronon: 0,
        pronas_pcd: 0,
        total_maximo: maxPercent
      };
    case 'esporte':
      return {
        grupo_1_sem_esporte: 0.06,
        grupo_1_com_esporte: maxPercent,
        pronon: 0,
        pronas_pcd: 0,
        total_maximo: maxPercent
      };
    case 'pronon':
      return {
        grupo_1_sem_esporte: 0,
        grupo_1_com_esporte: 0,
        pronon: maxPercent,
        pronas_pcd: 0,
        total_maximo: maxPercent
      };
    case 'pronas':
      return {
        grupo_1_sem_esporte: 0,
        grupo_1_com_esporte: 0,
        pronon: 0,
        pronas_pcd: maxPercent,
        total_maximo: maxPercent
      };
    default:
      return {
        grupo_1_sem_esporte: Math.min(maxPercent, LIMITE_GRUPO_1_SEM_ESPORTE),
        grupo_1_com_esporte: Math.min(maxPercent, LIMITE_GRUPO_1_COM_ESPORTE),
        pronon: Math.min(maxPercent, LIMITE_PRONON),
        pronas_pcd: Math.min(maxPercent, LIMITE_PRONAS),
        total_maximo: maxPercent
      };
  }
}

function calcularIRDevido(baseCalculo) {
  for (const faixa of TABELA_IR_2026) {
    if (baseCalculo <= faixa.limite) {
      const irBruto = baseCalculo * faixa.aliquota;
      const irDevido = Math.max(0, irBruto - faixa.deducao);
      return {
        ir_devido: Math.round(irDevido * 100) / 100,
        aliquota: faixa.aliquota,
        faixa_limite: faixa.limite
      };
    }
  }
  // Última faixa (acima de 55976.16)
  const ultimaFaixa = TABELA_IR_2026[TABELA_IR_2026.length - 1];
  const irBruto = baseCalculo * ultimaFaixa.aliquota;
  const irDevido = irBruto - ultimaFaixa.deducao;
  return {
    ir_devido: Math.round(irDevido * 100) / 100,
    aliquota: ultimaFaixa.aliquota,
    faixa_limite: ultimaFaixa.limite
  };
}

// POST /api/calculator/ir - Calcular IR e limites de doação (sempre declaração completa)
router.post('/ir', async (req, res) => {
  try {
    const {
      rendimentos_tributaveis,
      rendimento_13 = 0,
      dependentes = 0,
      deducao_saude = 0,
      deducao_educacao = 0,
      inss = 0,
      inss_13 = 0,
      previdencia_privada = 0
    } = req.body;

    // Validações básicas
    if (!rendimentos_tributaveis || rendimentos_tributaveis <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Rendimentos tributáveis deve ser maior que zero.'
      });
    }

    const rendimentosTotal = rendimentos_tributaveis + rendimento_13;

    // Declaração completa: deduções legais
    const deducaoDependentes = dependentes * DEDUCAO_DEPENDENTE;
    const deducaoEducacaoLimitada = Math.min(deducao_educacao, DEDUCAO_EDUCACAO_MAX * (dependentes + 1));

    const totalDeducoes =
      deducaoDependentes +
      deducao_saude +
      deducaoEducacaoLimitada +
      inss +
      inss_13 +
      previdencia_privada;

    const baseCalculo = Math.max(0, rendimentosTotal - totalDeducoes);

    const deducoesDetalhadas = {
      dependentes: Math.round(deducaoDependentes * 100) / 100,
      saude: Math.round(deducao_saude * 100) / 100,
      educacao: Math.round(deducaoEducacaoLimitada * 100) / 100,
      inss: Math.round(inss * 100) / 100,
      inss_13: Math.round(inss_13 * 100) / 100,
      previdencia_privada: Math.round(previdencia_privada * 100) / 100,
      total: Math.round(totalDeducoes * 100) / 100
    };

    // Calcular IR devido
    const { ir_devido, aliquota } = calcularIRDevido(baseCalculo);

    // Alíquota efetiva
    const aliquotaEfetiva = rendimentosTotal > 0
      ? Math.round((ir_devido / rendimentosTotal) * 10000) / 100
      : 0;

    // Obter limites baseado na organização/tenant
    const limites = getOrganizationLimits(req.organization);

    // Calcular limites de doação (sempre disponível - declaração completa)
    const limitesDoacao = {
      grupo_1_sem_esporte: Math.round(ir_devido * limites.grupo_1_sem_esporte * 100) / 100,
      grupo_1_com_esporte: Math.round(ir_devido * limites.grupo_1_com_esporte * 100) / 100,
      pronon: Math.round(ir_devido * limites.pronon * 100) / 100,
      pronas_pcd: Math.round(ir_devido * limites.pronas_pcd * 100) / 100,
      total_maximo: Math.round(ir_devido * limites.total_maximo * 100) / 100
    };

    res.json({
      status: 'success',
      fiscal_year: 2026,
      calendar_year: 2025,
      tipo_declaracao: 'completa',
      pode_destinar: true,
      rendimentos_total: Math.round(rendimentosTotal * 100) / 100,
      deducoes: deducoesDetalhadas,
      base_calculo: Math.round(baseCalculo * 100) / 100,
      ir_devido,
      aliquota_nominal: aliquota * 100,
      aliquota_efetiva: aliquotaEfetiva,
      limites_doacao: limitesDoacao,
      organization: req.organization ? {
        name: req.organization.name,
        slug: req.organization.slug,
        fund_type: req.organization.fund_type,
        max_percentage: parseFloat(req.organization.max_percentage) || 6
      } : null
    });

  } catch (error) {
    console.error('Erro ao calcular IR:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao calcular IR.'
    });
  }
});

// POST /api/calculator/limites-rapido - Calcular limites baseado no IR informado
router.post('/limites-rapido', async (req, res) => {
  try {
    const { ir_devido, fiscal_year = 2026 } = req.body;

    // Validações
    if (!ir_devido || ir_devido <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'IR devido deve ser maior que zero.'
      });
    }

    if (ir_devido > 1000000) {
      return res.status(400).json({
        status: 'error',
        message: 'IR devido não pode exceder R$ 1.000.000,00.'
      });
    }

    // Obter limites baseado na organização/tenant
    const limites = getOrganizationLimits(req.organization);

    // Calcular limites baseado no IR informado
    const limitesDoacao = {
      grupo_1_sem_esporte: Math.round(ir_devido * limites.grupo_1_sem_esporte * 100) / 100,
      grupo_1_com_esporte: Math.round(ir_devido * limites.grupo_1_com_esporte * 100) / 100,
      pronon: Math.round(ir_devido * limites.pronon * 100) / 100,
      pronas_pcd: Math.round(ir_devido * limites.pronas_pcd * 100) / 100,
      total_maximo: Math.round(ir_devido * limites.total_maximo * 100) / 100
    };

    res.json({
      status: 'success',
      fiscal_year,
      calendar_year: fiscal_year - 1,
      ir_devido: Math.round(ir_devido * 100) / 100,
      tipo_declaracao: 'completa',
      pode_destinar: true,
      limites_doacao: limitesDoacao,
      organization: req.organization ? {
        name: req.organization.name,
        slug: req.organization.slug,
        fund_type: req.organization.fund_type,
        max_percentage: parseFloat(req.organization.max_percentage) || 6
      } : null
    });

  } catch (error) {
    console.error('Erro ao calcular limites rápido:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno ao calcular limites.'
    });
  }
});

// POST /api/calculator/distribuir - Validar distribuição de doação
router.post('/distribuir', async (req, res) => {
  try {
    const { ir_devido, distribuicao } = req.body;

    // Validações básicas
    if (!ir_devido || ir_devido <= 0) {
      return res.status(400).json({
        status: 'error',
        valid: false,
        message: 'IR devido deve ser maior que zero.'
      });
    }

    if (!distribuicao || !Array.isArray(distribuicao) || distribuicao.length === 0) {
      return res.status(400).json({
        status: 'error',
        valid: false,
        message: 'Distribuição deve conter pelo menos um fundo.'
      });
    }

    // Buscar informações dos fundos
    const fundIds = distribuicao.map(d => d.fund_id);
    const fundsResult = await pool.query(`
      SELECT
        f.id,
        f.code,
        f.name,
        f.is_active,
        ig.code AS group_code,
        ig.max_percentage
      FROM official_funds f
      LEFT JOIN incentive_groups ig ON f.incentive_group_id = ig.id
      WHERE f.id = ANY($1)
    `, [fundIds]);

    const fundsMap = {};
    for (const fund of fundsResult.rows) {
      fundsMap[fund.id] = fund;
    }

    // Validar e agrupar distribuição
    const errors = [];
    const byGroup = {
      GRUPO1: { total: 0, funds: [] },
      GRUPO2: { total: 0, funds: [] },
      GRUPO3: { total: 0, funds: [] }
    };
    let totalDistribuido = 0;

    for (const item of distribuicao) {
      const fund = fundsMap[item.fund_id];

      if (!fund) {
        errors.push(`Fundo ${item.fund_id} não encontrado.`);
        continue;
      }

      if (!fund.is_active) {
        errors.push(`Fundo ${fund.name} não está ativo.`);
        continue;
      }

      if (!item.valor || item.valor <= 0) {
        errors.push(`Valor para ${fund.name} deve ser maior que zero.`);
        continue;
      }

      const groupCode = fund.group_code;
      if (byGroup[groupCode]) {
        byGroup[groupCode].total += item.valor;
        byGroup[groupCode].funds.push({
          id: fund.id,
          code: fund.code,
          name: fund.name,
          valor: item.valor
        });
      }

      totalDistribuido += item.valor;
    }

    // Calcular limites
    const limiteGrupo1 = ir_devido * LIMITE_GRUPO_1_COM_ESPORTE;
    const limiteGrupo3Pronon = ir_devido * LIMITE_PRONON;
    const limiteGrupo3Pronas = ir_devido * LIMITE_PRONAS;
    const limiteTotal = ir_devido * LIMITE_TOTAL_MAXIMO;

    // Validar limites por grupo
    if (byGroup.GRUPO1.total > limiteGrupo1) {
      errors.push(`Grupo 1 (Fundos Controlados): limite de ${limiteGrupo1.toFixed(2)} excedido. Valor: ${byGroup.GRUPO1.total.toFixed(2)}`);
    }

    // Validar limite total
    if (totalDistribuido > limiteTotal) {
      errors.push(`Limite total de ${limiteTotal.toFixed(2)} (9% do IR) excedido. Valor: ${totalDistribuido.toFixed(2)}`);
    }

    const isValid = errors.length === 0;
    const percentageOfIR = ir_devido > 0 ? Math.round((totalDistribuido / ir_devido) * 10000) / 100 : 0;

    res.json({
      status: isValid ? 'success' : 'error',
      valid: isValid,
      total: Math.round(totalDistribuido * 100) / 100,
      percentage_of_ir: percentageOfIR,
      limites: {
        grupo_1: Math.round(limiteGrupo1 * 100) / 100,
        pronon: Math.round(limiteGrupo3Pronon * 100) / 100,
        pronas_pcd: Math.round(limiteGrupo3Pronas * 100) / 100,
        total: Math.round(limiteTotal * 100) / 100
      },
      by_group: {
        GRUPO1: {
          total: Math.round(byGroup.GRUPO1.total * 100) / 100,
          limite: Math.round(limiteGrupo1 * 100) / 100,
          dentro_limite: byGroup.GRUPO1.total <= limiteGrupo1,
          funds: byGroup.GRUPO1.funds
        },
        GRUPO2: {
          total: Math.round(byGroup.GRUPO2.total * 100) / 100,
          funds: byGroup.GRUPO2.funds
        },
        GRUPO3: {
          total: Math.round(byGroup.GRUPO3.total * 100) / 100,
          funds: byGroup.GRUPO3.funds
        }
      },
      errors
    });

  } catch (error) {
    console.error('Erro ao validar distribuição:', error.message);
    res.status(500).json({
      status: 'error',
      valid: false,
      message: 'Erro interno ao validar distribuição.'
    });
  }
});

export default router;
