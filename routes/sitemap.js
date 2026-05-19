const express = require('express');
const router = express.Router();
const db = require('../database/pool_connection');
const SITE_URL = (process.env.SITE_URL || 'https://www.temcar.com.br').replace(/\/$/, '');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    const base = SITE_URL;
    const hoje = new Date().toISOString().split('T')[0];

    // Páginas estáticas
    const paginasEstaticas = [
      { loc: '/', priority: '1.0', changefreq: 'daily', lastmod: hoje },
      { loc: '/quem-somos', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/fale-conosco', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/politica-de-privacidade', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/termos-de-uso', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/regras-gerais', priority: '0.3', changefreq: 'yearly', lastmod: hoje },
      { loc: '/buscar-revendas', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/buscar-cidades', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/planos-particular', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/planos-revenda', priority: '0.5', changefreq: 'monthly', lastmod: hoje },
      { loc: '/carros', priority: '0.8', changefreq: 'daily', lastmod: hoje },
      { loc: '/motos', priority: '0.8', changefreq: 'daily', lastmod: hoje },
      { loc: '/comprar', priority: '0.7', changefreq: 'daily', lastmod: hoje },
      { loc: '/vender', priority: '0.7', changefreq: 'monthly', lastmod: hoje },
    ];

    function slugifyLocal(texto) {
      return (texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Cidades dinâmicas (cidade + carros/motos por cidade + /veiculos/)
    let cidadesUrls = [];
    try {
      const [cidades] = await db.query(`SELECT nome, estado FROM cidades`);
      cidades.forEach(c => {
        const slug = slugifyLocal(c.nome);
        const uf = c.estado.toLowerCase();
        cidadesUrls.push({ loc: `/cidade/${slug}/${uf}`, priority: '0.6', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/veiculos/${uf}/${slug}`, priority: '0.7', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/carros/${slug}/${uf}`, priority: '0.6', changefreq: 'daily', lastmod: hoje });
        cidadesUrls.push({ loc: `/motos/${slug}/${uf}`, priority: '0.5', changefreq: 'daily', lastmod: hoje });
      });
    } catch (e) {
      console.error('Sitemap: erro ao buscar cidades', e);
    }

    // Bairros dinâmicos
    let bairrosUrls = [];
    try {
      const [bairros] = await db.query(`
        SELECT b.slug AS bairro_slug, c.nome AS cidade_nome, c.estado
        FROM bairros b
        INNER JOIN cidades c ON c.id = b.cidade_id
      `);
      bairros.forEach(b => {
        const cidadeSlug = slugifyLocal(b.cidade_nome);
        const uf = b.estado.toLowerCase();
        bairrosUrls.push({
          loc: `/veiculos/${uf}/${cidadeSlug}/${b.bairro_slug}`,
          priority: '0.7',
          changefreq: 'daily',
          lastmod: hoje
        });
      });
    } catch (e) {
      console.error('Sitemap: erro ao buscar bairros', e);
    }

    // Revendas dinâmicas
    let revendasUrls = [];
    try {
      const [revendas] = await db.query(`SELECT id FROM usuarios WHERE tipo = 'revenda'`);
      revendasUrls = revendas.map(r => ({
        loc: `/revenda/${r.id}`,
        priority: '0.6',
        changefreq: 'weekly',
        lastmod: hoje
      }));
    } catch (e) {
      console.error('Sitemap: erro ao buscar revendas', e);
    }

    // Anúncios ativos com data de atualização
    let anunciosUrls = [];
    try {
      const [anuncios] = await db.query(`
        SELECT id, COALESCE(atualizado_em, criado_em) AS data_mod
        FROM anuncios
        WHERE status = 'ativo'
        ORDER BY criado_em DESC
        LIMIT 5000
      `);
      anunciosUrls = anuncios.map(a => ({
        loc: `/venda?id=${a.id}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: a.data_mod ? new Date(a.data_mod).toISOString().split('T')[0] : hoje
      }));
    } catch (e) {
      console.error('Sitemap: erro ao buscar anúncios', e);
    }

    const todas = [...paginasEstaticas, ...cidadesUrls, ...bairrosUrls, ...revendasUrls, ...anunciosUrls];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const p of todas) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(base + p.loc)}</loc>\n`;
      if (p.lastmod) xml += `    <lastmod>${escapeXml(p.lastmod)}</lastmod>\n`;
      xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
      xml += `    <priority>${p.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    res.status(500).send('Erro ao gerar sitemap');
  }
});

module.exports = router;
