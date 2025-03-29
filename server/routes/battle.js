// routes/battle.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET battle state by encounter ID
router.get('/:encounterId', async (req, res) => {
  const { encounterId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM battles WHERE encounter_id = $1', [encounterId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Battle not found for this encounter' });
    }

    res.json(result.rows[0].state);
  } catch (err) {
    console.error('❌ Failed to fetch battle state:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create or update battle state
router.post('/', async (req, res) => {
  const { encounterId, combatants, currentIndex, round, turnCounter } = req.body;

  if (!encounterId || !Array.isArray(combatants)) {
    return res.status(400).json({ error: 'Invalid battle data' });
  }

  const state = {
    combatants,
    currentIndex,
    round,
    turnCounter
  };

  try {
    await pool.query(
      `INSERT INTO battles (encounter_id, state)
       VALUES ($1, $2)
       ON CONFLICT (encounter_id)
       DO UPDATE SET state = $2`,
      [encounterId, state]
    );

    res.status(200).json({ message: 'Battle state saved' });
  } catch (err) {
    console.error('❌ Failed to save battle state:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
