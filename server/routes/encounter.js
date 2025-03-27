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

  if (!name || !partyId || !Array.isArray(monsters)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  if (!Array.isArray(initiatives) || initiatives.some(entry => typeof entry.name !== 'string' || typeof entry.initiative !== 'number')) {
    return res.status(400).json({ error: 'Please fill out the initiative before completing the encounter' });
  }

  try {
    const fullInitiative = [];

    // Load all creatures from DB to map their DEX mod
    const creatureRes = await pool.query('SELECT id, stats FROM creatures');
    const creatureDexMap = new Map();
    creatureRes.rows.forEach(row => {
      const dex = parseInt(row.stats?.DEX) || 0;
      const mod = parseInt((row.stats?.DEX_mod || '0').replace(/[^-\d]/g, '')) || 0;
      creatureDexMap.set(row.id, { dex, mod });
    });

    // Add players
    for (const player of initiatives) {
      fullInitiative.push({
        name: player.name,
        initiative: player.initiative,
        dex: player.dex || 0,
        type: 'player'
      });
    }

    // Add monsters
    for (const monster of monsters) {
      const count = monster.count || 1;
      const groupSize = monster.groupSize || 1;
      const totalGroups = Math.ceil(count / groupSize);

      const dexInfo = creatureDexMap.get(monster.id) || { dex: 0, mod: 0 };

      for (let i = 0; i < totalGroups; i++) {
        const label = totalGroups > 1 ? `${monster.name} Group ${i + 1}` : monster.name;
        const roll = Math.floor(Math.random() * 20) + 1;
        const initiative = roll === 1 ? -1 : roll + dexInfo.mod;

        fullInitiative.push({
          name: label,
          initiative,
          dex: dexInfo.dex,
          type: 'monster'
        });
      }
    }

    // Sort initiative with full logic
    fullInitiative.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if (b.dex !== a.dex) return b.dex - a.dex;
      if (a.type === 'player' && b.type === 'monster') return -1;
      if (a.type === 'monster' && b.type === 'player') return 1;
      return Math.random() < 0.5 ? -1 : 1;
    });

    const result = await pool.query(
      'INSERT INTO encounters (name, party_id, monsters, initiative) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, partyId, JSON.stringify(monsters), JSON.stringify(fullInitiative)]
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
