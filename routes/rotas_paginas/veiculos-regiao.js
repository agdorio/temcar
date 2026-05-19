const express = require('express');
const router = express.Router();
const db = require('../../database/pool_connection');
const { getSeoVeiculos, getSeoBairro } = require('../../helpers/seo');

const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function slugify(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(texto) {
  return (texto || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// =========================================================
// API PÚBLICA: /api/bairros
// Retorna bairros com dados da cidade para autocomplete
// =========================================================

router.get('/api/bairros', async (req, res) => {
  try {
    const { cidade_id } = req.query;

    let sql = `
      SELECT b.id, b.nome, b.slug, b.cidade_id,
             c.nome AS cidade_nome, c.estado AS cidade_estado
      FROM bairros b
      INNER JOIN cidades c ON c.id = b.cidade_id
    `;
    const params = [];

    if (cidade_id) {
      sql += ' WHERE b.cidade_id = ?';
      params.push(cidade_id);
    }

    sql += ' ORDER BY b.nome ASC';

    const [bairros] = await db.query(sql, params);
    res.json(bairros);
  } catch (error) {
    console.error('Erro ao buscar bairros:', error);
    res.status(500).json({ message: 'Erro interno' });
  }
});

// =========================================================
// PÁGINA: /veiculos/:uf
// Filtra veículos do estado inteiro
// =========================================================

router.get('/veiculos/:uf', async (req, res) => {
  const { uf } = req.params;
  if (uf.length > 2) return res.status(404).render('error-page');

  const ufSlug = uf.toLowerCase();
  const ufUpper = ufSlug.toUpperCase();

  const seo = await getSeoVeiculos({ uf: ufSlug });

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: ufUpper, url: `${SITE_URL}/veiculos/${ufSlug}` }
  ];

  res.render('veiculos', {
    seo,
    breadcrumbs,
    filtro: { uf: ufSlug }
  });
});

// =========================================================
// PÁGINA: /veiculos/:uf/:cidade
// Filtra veículos da cidade
// =========================================================

router.get('/veiculos/:uf/:cidade', async (req, res) => {
  const { uf, cidade } = req.params;
  if (uf.length > 2) return res.status(404).render('error-page');

  const ufSlug = uf.toLowerCase();
  const cidadeSlug = slugify(cidade);
  const ufUpper = ufSlug.toUpperCase();
  const nomeCidade = capitalize(cidadeSlug);

  const seo = await getSeoVeiculos({ uf: ufSlug, cidade: cidadeSlug });

  const breadcrumbs = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: ufUpper, url: `${SITE_URL}/veiculos/${ufSlug}` },
    { name: nomeCidade, url: `${SITE_URL}/veiculos/${ufSlug}/${cidadeSlug}` }
  ];

  res.render('veiculos', {
    seo,
    breadcrumbs,
    filtro: { uf: ufSlug, cidade: cidadeSlug }
  });
});

// =========================================================
// PÁGINA: /veiculos/:uf/:cidade/:bairro
// Filtra veículos do bairro - valida contra tabela bairros
// =========================================================

router.get('/veiculos/:uf/:cidade/:bairro', async (req, res) => {
  const { uf, cidade, bairro } = req.params;
  if (uf.length > 2) return res.status(404).render('error-page');

  const ufSlug = uf.toLowerCase();
  const cidadeSlug = slugify(cidade);
  const bairroSlug = slugify(bairro);

  try {
    // Valida cidade
    const [cidades] = await db.query('SELECT * FROM cidades');
    const cidadeObj = cidades.find(
      c => slugify(c.nome) === cidadeSlug && c.estado.toLowerCase() === ufSlug
    );

    if (!cidadeObj) {
      return res.status(404).render('error-page');
    }

    // Valida bairro pertence à cidade
    const [bairros] = await db.query(
      'SELECT * FROM bairros WHERE slug = ? AND cidade_id = ? LIMIT 1',
      [bairroSlug, cidadeObj.id]
    );

    if (!bairros.length) {
      return res.status(404).render('error-page');
    }

    const bairroObj = bairros[0];
    const seo = await getSeoBairro(bairroObj, cidadeObj);

    const ufUpper = ufSlug.toUpperCase();
    const breadcrumbs = [
      { name: 'Home', url: `${SITE_URL}/` },
      { name: ufUpper, url: `${SITE_URL}/veiculos/${ufSlug}` },
      { name: cidadeObj.nome, url: `${SITE_URL}/veiculos/${ufSlug}/${cidadeSlug}` },
      { name: bairroObj.nome, url: `${SITE_URL}/veiculos/${ufSlug}/${cidadeSlug}/${bairroSlug}` }
    ];

    res.render('bairro', {
      cidade: cidadeObj,
      bairro: bairroObj,
      seo,
      breadcrumbs
    });

  } catch (error) {
    console.error('Erro na página de bairro:', error);
    res.status(500).render('error-page');
  }
});

module.exports = router;
