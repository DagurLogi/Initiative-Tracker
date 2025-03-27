// @ts-nocheck

import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all encounters
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM encounters');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Failed to fetch encounters:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET encounter by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM encounters WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to fetch encounter:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST create a new encounter
router.post('/', async (req, res) => {
  const { name, partyId, monsters, initiatives } = req.body;

  console.log('📥 Received POST data:', {
    name,
    partyId,
    monsters,
    initiatives,
  });

  if (!name || !partyId || !Array.isArray(monsters)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  if (
    !Array.isArray(initiatives) ||
    initiatives.some(entry =>
      typeof entry.name !== 'string' ||
      typeof entry.initiative !== 'number' ||
      isNaN(entry.initiative)
    )
  ) {
    return res.status(400).json({ error: 'Initiative entries must include a name and a valid number.' });
  }

  try {
    // Fetch all creatures from DB to get DEX modifiers for monsters
    const creatureRes = await pool.query('SELECT id, stats FROM creatures');
    const creatureMap = new Map();
    creatureRes.rows.forEach(creature => {
      creatureMap.set(creature.id, creature.stats);
    });

    const monsterInitiatives = monsters.map(monster => {
      const stats = creatureMap.get(monster.id);
      let dexMod = 0;
      if (stats && stats.DEX_mod) {
        dexMod = parseInt(stats.DEX_mod.replace(/[^-\d]/g, '')) || 0;
      }
      const roll = Math.floor(Math.random() * 20) + 1;
      return {
        name: monster.name,
        initiative: roll + dexMod
      };
    });

    // Combine and sort all initiatives
    const combinedInitiatives = [...initiatives, ...monsterInitiatives].sort((a, b) => b.initiative - a.initiative);

    const result = await pool.query(
      'INSERT INTO encounters (name, party_id, monsters, initiative) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, partyId, JSON.stringify(monsters), JSON.stringify(combinedInitiatives)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to save encounter:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT update an existing encounter
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, partyId, monsters, initiatives } = req.body;

  try {
    const result = await pool.query(
      'UPDATE encounters SET name = $1, party_id = $2, monsters = $3, initiative = $4 WHERE id = $5 RETURNING *',
      [name, partyId, JSON.stringify(monsters), JSON.stringify(initiatives), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Failed to update encounter:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE an encounter
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM encounters WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    res.json({ message: 'Encounter deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete encounter:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
