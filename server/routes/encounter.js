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

// POST create a new encounter with full statblocks and group-based initiative
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

    const partyRes = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
    const partyMembers = partyRes.rows[0]?.members || [];

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

    // Add players
    for (const player of initiatives) {
      const match = partyMembers.find(m => m.name === player.name);
      fullInitiative.push({
        name: player.name,
        initiative: player.initiative,
        dex: match?.dex || player.dex || 0,
        type: 'player',
        ac: match?.ac || null,
        hp: match?.hp || null,
        maxHp: match?.hp || null,
        passivePerception: match?.passivePerception || null,
        currentHp: match?.hp || null,
        statblock: match || {},
        statusEffects: []
      });
    }

    // Add monsters with individual initiative sharing logic and full statblock
    for (const monster of monsters) {
      const { id, name, count = 1, groupSize = 1 } = monster;
      const stat = creatureMap.get(id);
      const dex = stat?.dex || 0;
      const mod = stat?.mod || 0;

      const numGroups = Math.ceil(count / groupSize);
      const groupRolls = Array.from({ length: numGroups }, () => {
        const roll = Math.floor(Math.random() * 20 + 1);
        return {
          roll,
          final: roll + mod,
          naturalOne: roll === 1
        };
      });

      for (let i = 0; i < count; i++) {
        const groupIndex = Math.floor(i / groupSize);
        const { final, roll, naturalOne } = groupRolls[groupIndex];

        fullInitiative.push({
          name: `${name} ${i + 1}`,
          initiative: final,
          rawInitiative: roll,
          dex,
          type: 'monster',
          ac: extractFirstNumber(stat?.fullStatblock['Armor Class']),
          hp: extractFirstNumber(stat?.fullStatblock['Hit Points']),
          maxHp: extractFirstNumber(stat?.fullStatblock['Hit Points']),
          currentHp: extractFirstNumber(stat?.fullStatblock['Hit Points']),
          passivePerception: extractFirstNumber(stat?.fullStatblock['Passive Perception']),
          statblock: stat?.fullStatblock || {},
          naturalOne,
          statusEffects: []
        });
      }
    }

    fullInitiative.sort((a, b) => {
      if (a.naturalOne && !b.naturalOne) return 1;
      if (!a.naturalOne && b.naturalOne) return -1;
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
      if ((a.type || 'player') === 'player' && (b.type || 'monster') === 'monster') return -1;
      if ((a.type || 'player') === 'monster' && (b.type || 'player') === 'player') return 1;
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

// PUT update encounter
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, partyId, monsters, initiatives } = req.body;

  initiatives.sort((a, b) => {
    if (a.naturalOne && !b.naturalOne) return 1;
    if (!a.naturalOne && b.naturalOne) return -1;
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if ((b.dex || 0) !== (a.dex || 0)) return (b.dex || 0) - (a.dex || 0);
    if ((a.type || 'player') === 'player' && (b.type || 'monster') === 'monster') return -1;
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

// DELETE an encounter and its related battle
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // First, delete any associated battle
    await pool.query('DELETE FROM battles WHERE encounter_id = $1', [id]);

    // Then delete the encounter
    const result = await pool.query('DELETE FROM encounters WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    res.json({ message: 'Encounter and related battle deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete encounter and battle:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


export default router;
