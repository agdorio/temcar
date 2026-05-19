const express = require('express');
const router = express.Router();

const db = require('../database/pool_connection');

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET /api/bairros
router.get('/api/bairros', async (req, res) => {
  try {
    const { cidade } = req.query;
    let sql = `SELECT id, nome, slug, cidade AS cidade_nome, estado FROM bairros`;
    const params = [];
    if (cidade) {
      sql += ' WHERE cidade = ?';
      params.push(cidade);
    }
    sql += ' ORDER BY cidade, nome';
    const [rows] = await db.query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('Erro ao listar bairros:', err);
    return res.status(500).json({ message: 'Erro interno ao listar bairros.' });
  }
});

// GET /api/bairros/:id
router.get('/api/bairros/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bairros WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Bairro não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar bairro:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
});

// POST /api/bairros
router.post('/api/bairros', async (req, res) => {
  try {
    const { nome, cidade, estado } = req.body;
    if (!nome || !cidade || !estado) {
      return res.status(400).json({ message: 'Campos obrigatórios: nome, cidade, estado.' });
    }
    const slug = slugify(nome);
    await db.query(
      'INSERT INTO bairros (nome, cidade, estado, slug) VALUES (?, ?, ?, ?)',
      [nome.trim(), cidade.trim(), estado.trim().toUpperCase(), slug]
    );
    return res.status(201).json({ message: 'Bairro criado com sucesso!' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um bairro com esse nome.' });
    }
    console.error('Erro ao criar bairro:', err);
    return res.status(500).json({ message: 'Erro interno ao criar bairro.' });
  }
});

// PUT /api/bairros/:id
router.put('/api/bairros/:id', async (req, res) => {
  try {
    const { nome, cidade, estado } = req.body;
    if (!nome || !cidade || !estado) {
      return res.status(400).json({ message: 'Campos obrigatórios: nome, cidade, estado.' });
    }
    const slug = slugify(nome);
    const [result] = await db.query(
      'UPDATE bairros SET nome = ?, cidade = ?, estado = ?, slug = ? WHERE id = ?',
      [nome.trim(), cidade.trim(), estado.trim().toUpperCase(), slug, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Bairro não encontrado.' });
    return res.json({ message: 'Bairro atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar bairro:', err);
    return res.status(500).json({ message: 'Erro interno ao atualizar bairro.' });
  }
});

// DELETE /api/bairros/:id
router.delete('/api/bairros/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM bairros WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Bairro não encontrado.' });
    return res.json({ message: 'Bairro excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir bairro:', err);
    return res.status(500).json({ message: 'Erro interno ao excluir bairro.' });
  }
});

module.exports = router;