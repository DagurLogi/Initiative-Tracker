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

// GET encounter by ID with enriched initiative data
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM encounters WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    const encounter = result.rows[0];
    const partyRes = await pool.query('SELECT * FROM parties WHERE id = $1', [encounter.party_id]);
    const party = partyRes.rows[0];
    const partyMembers = party?.members || [];

    const creatureRes = await pool.query('SELECT * FROM creatures');
    const creatureMap = new Map(creatureRes.rows.map(c => [c.name, c]));

    const enhancedInitiative = encounter.initiative.map(entry => {
      if (entry.type === 'player') {
        const member = partyMembers.find(p => p.name === entry.name);
        return {
          ...entry,
          ac: member?.ac ?? '?',
          hp: member?.hp ?? '?',
          maxHp: member?.hp ?? '?',
          passivePerception: member?.passivePerception ?? '?',
        };
      } else {
        const baseName = entry.name.split(' Group')[0];
        const creature = creatureMap.get(baseName);
        return {
          ...entry,
          ac: creature?.ac ?? '?',
          hp: creature?.hp ?? '?',
          maxHp: creature?.hp ?? '?',
          passivePerception: creature?.passivePerception ?? '?',
        };
      }
    });

    res.json({ ...encounter, initiative: enhancedInitiative });
  } catch (err) {
    console.error('❌ Failed to fetch enriched encounter:', err);
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

  const fullInitiative = [...initiatives];

  try {
    const creatureRes = await pool.query('SELECT * FROM creatures');
    const creatureMap = new Map(creatureRes.rows.map(c => [c.id, c]));

    for (const monster of monsters) {
      const creature = creatureMap.get(monster.id);
      if (!creature) continue;

      const hp = creature.hp ?? 10; // fallback
      const count = monster.count || 1;
      const groupSize = monster.groupSize && monster.groupSize > 0 ? monster.groupSize : 1;
      const totalGroups = Math.ceil(count / groupSize);

      for (let i = 0; i < totalGroups; i++) {
        const members = [];
        const groupCount = Math.min(groupSize, count - i * groupSize);
        for (let j = 0; j < groupCount; j++) {
          members.push({ name: `${monster.name} ${j + 1}`, hp, maxHp: hp });
        }

        const label = totalGroups > 1 ? `${monster.name} Group ${i + 1}` : monster.name;
        fullInitiative.push({
          name: label,
          initiative: 0, // set later if needed
          type: 'monster',
          dex: 0,
          members
        });
      }
    }

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
