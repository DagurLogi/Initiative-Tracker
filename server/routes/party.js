// @ts-nocheck

import express from 'express';
import pool from '../db.js';
import xss from 'xss';

const router = express.Router();

// GET all parties
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parties');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Failed to fetch parties:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET party by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM parties WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Failed to fetch party:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create new party
router.post('/', async (req, res) => {
  const { name, members } = req.body;

  // ✅ Sanitize input inside the route
  const sanitizedName = xss(name);
  const sanitizedMembers = members.map(m => ({
    ...m,
    name: xss(m.name),
    class: xss(m.class)
  }));

  try {
    const result = await pool.query(
      'INSERT INTO parties (name, members) VALUES ($1, $2) RETURNING *',
      [sanitizedName, JSON.stringify(sanitizedMembers)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Failed to create party:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT update a party
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, members } = req.body;

  // ✅ Sanitize again here
  const sanitizedName = xss(name);
  const sanitizedMembers = members.map(m => ({
    ...m,
    name: xss(m.name),
    class: xss(m.class)
  }));

  try {
    const result = await pool.query(
      'UPDATE parties SET name = $1, members = $2 WHERE id = $3 RETURNING *',
      [sanitizedName, JSON.stringify(sanitizedMembers), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Failed to update party:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE a party
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM parties WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    res.json({ message: 'Party deleted successfully' });
  } catch (error) {
    console.error('❌ Failed to delete party:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
