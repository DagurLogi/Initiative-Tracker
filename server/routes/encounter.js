// @ts-nocheck

// Encounter Api (updated backend route for proper monster initiative and stats)

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

    // 👉 Load party info for player stat mapping
    const partyRes = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
    const partyMembers = partyRes.rows[0]?.members || [];

    // 👉 Load all monsters and create a creature stat map
    const creatureRes = await pool.query('SELECT id, name, stats FROM creatures');
    const creatureMap = new Map();
    creatureRes.rows.forEach(row => {
      const stats = row.stats || {};
      const dex = parseInt(stats.DEX) || 0;
      const mod = parseInt((stats.DEX_mod || '0').replace(/[^-\d]/g, '')) || 0;
      creatureMap.set(row.id, {
        name: row.name,
        dex,
        mod,
        fullStatblock: stats
      });
    });

    // ✅ Add players to initiative, pulling full stats from the party
    for (const player of initiatives) {
      const match = partyMembers.find(m => m.name === player.name);

      fullInitiative.push({
        name: player.name,
        initiative: player.initiative,
        dex: match?.dex || player.dex || 0,
        type: 'player',
        ac: match?.ac || null,
        hp: match?.hp || null,
        maxHp: match?.maxHp || null,
        passivePerception: match?.passivePerception || null,
        statblock: match || {}
      });
    }

    // ✅ Add monsters to initiative
    for (const monster of monsters) {
      const { id, name, count = 1, groupSize = 1 } = monster;
      const totalGroups = Math.ceil(count / groupSize);
      const stat = creatureMap.get(id);

      for (let i = 0; i < totalGroups; i++) {
        const label = totalGroups > 1 ? `${name} Group ${i + 1}` : name;
        const initiative = Math.floor(Math.random() * 20 + 1) + (stat?.mod || 0);

        const members = Array.from({ length: groupSize }, (_, j) => ({
          name: `${label.split(' Group')[0]} ${j + 1}`,
          hp: parseInt(stat?.fullStatblock['Hit Points']) || null,
          maxHp: parseInt(stat?.fullStatblock['Hit Points']) || null,
          ac: parseInt(stat?.fullStatblock['Armor Class']) || null,
          passivePerception: parseInt(stat?.fullStatblock['Passive Perception']) || null,
          statblock: stat?.fullStatblock || {}
        }));

        fullInitiative.push({
          name: label,
          initiative,
          dex: stat?.dex || 0,
          type: 'monster',
          members,
          statblock: stat?.fullStatblock || {}
        });
      }
    }

    // ✅ Sort initiative
    fullInitiative.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
      if ((a.type || 'player') === 'player' && (b.type || 'monster') === 'monster') return -1;
      if ((a.type || 'player') === 'monster' && (b.type || 'player') === 'player') return 1;
      return Math.random() < 0.5 ? -1 : 1;
    });

    // ✅ Save to DB
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
  // Re-sort the initiative list like in POST route
  initiatives.sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
    if ((a.type || 'player') === 'player' && (b.type || 'player') === 'monster') return -1;
    if ((a.type || 'player') === 'monster' && (b.type || 'player') === 'player') return 1;
    return Math.random() < 0.5 ? -1 : 1;
  });

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
