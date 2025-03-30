// @ts-nocheck

import express from 'express';
import pool from '../db.js';

const router = express.Router();

function extractFirstNumber(value) {
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }
  return typeof value === 'number' ? value : null;
}

// GET all battles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM battles');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch battles:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET battle by encounter ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM battles WHERE encounter_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to fetch battle:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// POST create/update battle state
router.post('/', async (req, res) => {
    const { encounterId, combatants, round, currentIndex, turnCounter, battleLength } = req.body;
  
    if (!encounterId || !Array.isArray(combatants)) {
      return res.status(400).json({ error: 'Invalid battle data' });
    }
  
    try {
      const result = await pool.query(
        `INSERT INTO battles (encounter_id, combatants, round, current_index, turn_counter, battleLength)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (encounter_id) DO UPDATE
         SET combatants = EXCLUDED.combatants,
             round = EXCLUDED.round,
             current_index = EXCLUDED.current_index,
             turn_counter = EXCLUDED.turn_counter,
             battleLength = EXCLUDED.battleLength
         RETURNING *`,
        [encounterId, JSON.stringify(combatants), round, currentIndex, turnCounter, battleLength]
      );
  
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('❌ Failed to save battle:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

// DELETE battle by encounter ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM battles WHERE encounter_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Battle not found' });
    }
    res.json({ message: 'Battle deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete battle:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
