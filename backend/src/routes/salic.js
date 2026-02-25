/**
 * Rota: /api/salic
 * Proxy para a API SALIC Web (api.salic.cultura.gov.br)
 * Lei Rouanet — Lei Federal de Incentivo à Cultura (Lei 8.313/1991)
 *
 * Endpoints expostos:
 *   GET /api/salic/projetos          — lista projetos com filtros
 *   GET /api/salic/projetos/:pronac  — detalhe de um projeto
 *   GET /api/salic/areas             — áreas culturais (cached 24h)
 *   GET /api/salic/segmentos         — segmentos culturais (cached 24h)
 */

import express from 'express';

const router = express.Router();

const SALIC_BASE = 'https://api.salic.cultura.gov.br/api/v1';

// Cache simples em memória com TTL
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const TTL_LIST    = 5  * 60 * 1000; // 5 min para listas (dados mudam)
const TTL_DETAIL  = 30 * 60 * 1000; // 30 min para detalhes
const TTL_STATIC  = 24 * 60 * 60 * 1000; // 24h para áreas/segmentos

async function salicFetch(path, params = {}) {
  const url = new URL(`${SALIC_BASE}${path}`);

  // Sempre pedir JSON limpo
  url.searchParams.set('format', 'json');

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, v);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'IncentivaBR/1.0 (contato@incentivabr.com.br)'
    },
    signal: AbortSignal.timeout(10000) // 10s timeout
  });

  if (!response.ok) {
    const err = new Error(`SALIC API error: ${response.status} ${response.statusText}`);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// GET /api/salic/areas — Áreas culturais (Teatro, Música, etc.)
// ─────────────────────────────────────────────────────────────
router.get('/areas', async (req, res) => {
  try {
    const cacheKey = 'salic:areas';
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await salicFetch('/projetos/areas');

    const result = {
      status: 'success',
      source: 'SALIC API — Ministério da Cultura',
      areas: data._embedded?.areas ?? data
    };

    cacheSet(cacheKey, result, TTL_STATIC);
    res.json(result);
  } catch (error) {
    console.error('[SALIC] Erro ao buscar áreas:', error.message);
    res.status(error.status || 502).json({
      status: 'error',
      message: 'Falha ao consultar API SALIC. Tente novamente.',
      detail: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/salic/segmentos — Segmentos culturais
// ─────────────────────────────────────────────────────────────
router.get('/segmentos', async (req, res) => {
  try {
    const cacheKey = 'salic:segmentos';
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await salicFetch('/projetos/segmentos');

    const result = {
      status: 'success',
      source: 'SALIC API — Ministério da Cultura',
      segmentos: data._embedded?.segmentos ?? data
    };

    cacheSet(cacheKey, result, TTL_STATIC);
    res.json(result);
  } catch (error) {
    console.error('[SALIC] Erro ao buscar segmentos:', error.message);
    res.status(error.status || 502).json({
      status: 'error',
      message: 'Falha ao consultar API SALIC. Tente novamente.',
      detail: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/salic/projetos — Lista projetos Rouanet com filtros
//
// Query params aceitos:
//   nome      — busca por nome do projeto
//   PRONAC    — número do projeto no SALIC
//   proponente — nome do proponente
//   UF        — estado (ex: DF, SP, RJ)
//   area      — código da área cultural (ex: 01, 02)
//   segmento  — código do segmento
//   situacao  — situação (ex: "Em andamento")
//   limit     — itens por página (1–100, default 20)
//   offset    — deslocamento para paginação (default 0)
//   sort      — campo de ordenação
// ─────────────────────────────────────────────────────────────
router.get('/projetos', async (req, res) => {
  try {
    const {
      nome,
      PRONAC,
      proponente,
      UF,
      area,
      segmento,
      situacao,
      sort,
      limit = 20,
      offset = 0
    } = req.query;

    // Sanitizar limit/offset
    const safeLimit  = Math.min(Math.max(parseInt(limit)  || 20, 1), 100);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    const params = { nome, PRONAC, proponente, UF, area, segmento, situacao, sort,
                     limit: safeLimit, offset: safeOffset };

    const cacheKey = `salic:projetos:${JSON.stringify(params)}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await salicFetch('/projetos', params);

    // A SALIC retorna HAL+JSON: { _embedded: { projetos: [...] }, total: N, count: N }
    const projetos = data._embedded?.projetos ?? data.projetos ?? [];
    const total    = data.total ?? projetos.length;

    const result = {
      status: 'success',
      source: 'SALIC API — Ministério da Cultura',
      lei: 'Lei Rouanet (Lei 8.313/1991)',
      total,
      count: projetos.length,
      limit: safeLimit,
      offset: safeOffset,
      projetos: projetos.map(normalizarProjeto)
    };

    cacheSet(cacheKey, result, TTL_LIST);
    res.json(result);
  } catch (error) {
    console.error('[SALIC] Erro ao buscar projetos:', error.message);
    res.status(error.status || 502).json({
      status: 'error',
      message: 'Falha ao consultar API SALIC. Tente novamente.',
      detail: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/salic/projetos/:pronac — Detalhe de um projeto
// ─────────────────────────────────────────────────────────────
router.get('/projetos/:pronac', async (req, res) => {
  try {
    const { pronac } = req.params;

    if (!/^\d{6,7}$/.test(pronac)) {
      return res.status(400).json({
        status: 'error',
        message: 'PRONAC inválido. Deve conter 6 ou 7 dígitos numéricos.'
      });
    }

    const cacheKey = `salic:projeto:${pronac}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await salicFetch(`/projetos/${pronac}`);

    const result = {
      status: 'success',
      source: 'SALIC API — Ministério da Cultura',
      lei: 'Lei Rouanet (Lei 8.313/1991)',
      projeto: normalizarProjetoDetalhe(data)
    };

    cacheSet(cacheKey, result, TTL_DETAIL);
    res.json(result);
  } catch (error) {
    console.error('[SALIC] Erro ao buscar projeto:', error.message);
    const statusCode = error.status === 404 ? 404 : (error.status || 502);
    res.status(statusCode).json({
      status: 'error',
      message: error.status === 404
        ? 'Projeto não encontrado no SALIC.'
        : 'Falha ao consultar API SALIC. Tente novamente.',
      detail: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Normalização dos dados vindos da SALIC
// ─────────────────────────────────────────────────────────────

function normalizarProjeto(p) {
  return {
    pronac:            p.PRONAC,
    nome:              p.nome,
    area:              p.area,
    segmento:          p.segmento,
    uf:                p.UF,
    municipio:         p.municipio,
    situacao:          p.situacao,
    mecanismo:         p.mecanismo,
    enquadramento:     p.enquadramento,
    proponente: {
      nome:  p.proponente,
      cgccpf: p.cgccpf
    },
    valores: {
      solicitado:  parseValor(p.valor_solicitado),
      aprovado:    parseValor(p.valor_aprovado),
      captado:     parseValor(p.valor_captado),
      desembolsado: parseValor(p.valor_desembolsado)
    },
    ano_projeto:       p.ano_projeto,
    data_inicio:       p.data_inicio,
    data_termino:      p.data_termino,
    // Link direto para o SALIC público
    link_salic: `https://salic.cultura.gov.br/cidadao/projeto/detalharProjeto/${p.PRONAC}/versao/1`
  };
}

function normalizarProjetoDetalhe(p) {
  const base = normalizarProjeto(p);
  return {
    ...base,
    objetivos:         p.objetivos,
    justificativa:     p.justificativa,
    acessibilidade:    p.acessibilidade,
    democratizacao:    p.democratizacao,
    etapa:             p.etapa,
    ficha_tecnica:     p.ficha_tecnica,
    impacto_ambiental: p.impacto_ambiental,
    especificacao_tecnica: p.especificacao_tecnica,
    providencia:       p.providencia,
    outras_fontes:     p.outras_fontes,
    resumo:            p.resumo
  };
}

function parseValor(v) {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ─────────────────────────────────────────────────────────────
// GET /api/salic/org-project
// Retorna o projeto SALIC vinculado à organização/tenant atual.
// Usado pelo fluxo white-label: o associado vê o projeto da própria org.
// ─────────────────────────────────────────────────────────────
router.get('/org-project', async (req, res) => {
  try {
    const org = req.organization;

    if (!org || !org.pronac) {
      return res.status(404).json({
        status: 'error',
        message: 'Esta organização não possui um projeto SALIC vinculado. Configure o PRONAC no painel admin.'
      });
    }

    const cacheKey = `salic:org-project:${org.pronac}`;
    const cached = cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const data = await salicFetch(`/projetos/${org.pronac}`);

    const result = {
      status: 'success',
      source: 'SALIC API — Ministério da Cultura',
      lei: 'Lei Rouanet (Lei 8.313/1991)',
      organizacao: {
        slug:      org.slug,
        name:      org.name,
        pronac:    org.pronac,
        // Dados bancários para pagamento (configurados pelo admin da org)
        bank_name:         org.bank_name,
        bank_code:         org.bank_code,
        bank_agency:       org.bank_agency,
        bank_account:      org.bank_account,
        pix_key:           org.pix_key,
        pix_key_type:      org.pix_key_type,
        beneficiary_name:  org.beneficiary_name,
        beneficiary_cnpj:  org.beneficiary_cnpj,
        max_percentage:    parseFloat(org.max_percentage) || 6.00,
        contact_email:     org.contact_email,
        contact_phone:     org.contact_phone
      },
      projeto: normalizarProjetoDetalhe(data)
    };

    cacheSet(cacheKey, result, TTL_DETAIL);
    res.json(result);

  } catch (error) {
    console.error('[SALIC] Erro ao buscar projeto da organização:', error.message);

    // Fallback: retorna dados cacheados da org mesmo sem SALIC
    const org = req.organization;
    if (org?.pronac && org?.pronac_titulo) {
      return res.json({
        status: 'success',
        source: 'cache_local',
        aviso: 'API SALIC indisponível — exibindo dados em cache local.',
        organizacao: {
          slug:             org.slug,
          name:             org.name,
          pronac:           org.pronac,
          bank_name:        org.bank_name,
          bank_code:        org.bank_code,
          bank_agency:      org.bank_agency,
          bank_account:     org.bank_account,
          pix_key:          org.pix_key,
          pix_key_type:     org.pix_key_type,
          beneficiary_name: org.beneficiary_name,
          beneficiary_cnpj: org.beneficiary_cnpj,
          max_percentage:   parseFloat(org.max_percentage) || 6.00
        },
        projeto: {
          pronac:     org.pronac,
          nome:       org.pronac_titulo,
          area:       org.pronac_area,
          proponente: { nome: org.pronac_proponente },
          situacao:   null,
          valores:    {},
          link_salic: `https://salic.cultura.gov.br/cidadao/projeto/detalharProjeto/${org.pronac}/versao/1`
        }
      });
    }

    res.status(error.status || 502).json({
      status: 'error',
      message: 'Falha ao consultar API SALIC e nenhum cache local disponível.',
      detail: error.message
    });
  }
});

export default router;
