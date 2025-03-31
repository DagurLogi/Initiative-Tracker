// @ts-nocheck

import express from 'express';
import pool from '../db.js';

const router = express.Router();

function extractFirstNumber(value) {
  if (typeof value === 'string') {
    const match = value.match(/^\d+/);
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

// POST create a new encounter
router.post('/', async (req, res) => {
  const { name, partyId, monsters, initiatives } = req.body;

  if (!name || !partyId || !Array.isArray(monsters)) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const fullInitiative = [];
    const partyRes = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
    const partyMembers = partyRes.rows[0]?.members || [];

    const creatureRes = await pool.query('SELECT * FROM creatures');
    const creatureMap = new Map();
    creatureRes.rows.forEach(row => {
      const stats = row.stats || {};
      const dex = parseInt(stats.DEX) || 0;
      const mod = parseInt((stats.DEX_mod || '0').replace(/[^-\d]/g, '')) || 0;
      creatureMap.set(row.id, {
        name: row.name,
        dex,
        mod,
        fullStatblock: row
      });
    });

    for (const player of initiatives) {
      const match = partyMembers.find(m => m.name === player.name);
      const cleanedStatblock = {
        class: match?.class || null,
        level: match?.level || null,
        resistances: match?.resistances || [],
        immunities: match?.immunities || []
      };
      fullInitiative.push({
        name: player.name,
        initiative: player.initiative,
        dex: match?.dex || player.dex || 0,
        type: 'player',
        ac: match?.ac || null,
        hp: match?.hp || null,
        maxHp: match?.hp || null,
        currentHp: match?.hp || null,
        passivePerception: match?.passivePerception || null,
        statblock: cleanedStatblock,
        statusEffects: []
      });
      
    }

    for (const monster of monsters) {
      const { id, name, count = 1, groupSize = 1 } = monster;
      const stat = creatureMap.get(id);
      const dex = stat?.dex || 0;
      const mod = stat?.mod || 0;
      const numGroups = Math.ceil(count / groupSize);
      const groupRolls = Array.from({ length: numGroups }, () => {
        const roll = Math.floor(Math.random() * 20 + 1);
        return { roll, final: roll + mod, naturalOne: roll === 1 };
      });

      for (let i = 0; i < count; i++) {
        const groupIndex = Math.floor(i / groupSize);
        const { final, roll, naturalOne } = groupRolls[groupIndex];
      
        const {
          armor_class,
          hit_points,
          senses,
          stats,
          meta,
          speed,
          skills,
          traits,
          actions,
          img_url,
          challenge,
          languages,
          reactions,
          saving_throws,
          damage_immunities,
          damage_resistances,
          damage_vulnerabilities,
          condition_immunities,
          legendary_actions
        } = stat.fullStatblock;
      
        fullInitiative.push({
          name: `${name} ${i + 1}`,
          initiative: final,
          rawInitiative: roll,
          dex,
          type: 'monster',
          ac: extractFirstNumber(armor_class),
          hp: extractFirstNumber(hit_points),
          maxHp: extractFirstNumber(hit_points),
          currentHp: extractFirstNumber(hit_points),
          passivePerception: extractFirstNumber(senses),
          statblock: {
            meta,
            speed,
            stats,
            senses,
            skills,
            traits,
            actions,
            img_url,
            challenge,
            languages,
            reactions,
            saving_throws,
            damage_immunities,
            damage_resistances,
            damage_vulnerabilities,
            condition_immunities,
            legendary_actions
          },
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

  try {
    const fullInitiative = [];
    const partyRes = await pool.query('SELECT * FROM parties WHERE id = $1', [partyId]);
    const partyMembers = partyRes.rows[0]?.members || [];

    const creatureRes = await pool.query('SELECT * FROM creatures');
    const creatureMap = new Map();
    creatureRes.rows.forEach(row => {
      const stats = row.stats || {};
      const dex = parseInt(stats.DEX) || 0;
      const mod = parseInt((stats.DEX_mod || '0').replace(/[^-\d]/g, '')) || 0;
      creatureMap.set(row.id, {
        name: row.name,
        dex,
        mod,
        fullStatblock: row
      });
    });

    for (const player of initiatives) {
      if (player.type !== 'player') continue;
    
      const match = partyMembers.find(m => m.name === player.name);
      const cleanedStatblock = {
        class: match?.class || null,
        level: match?.level || null,
        resistances: match?.resistances || [],
        immunities: match?.immunities || []
      };
    
      fullInitiative.push({
        name: player.name,
        initiative: player.initiative,
        dex: match?.dex || player.dex || 0,
        type: 'player',
        ac: match?.ac || null,
        hp: match?.hp || null,
        maxHp: match?.hp || null,
        currentHp: match?.hp || null,
        passivePerception: match?.passivePerception || null,
        statblock: cleanedStatblock,
        statusEffects: []
      });
    }
    

    for (const monster of monsters) {
      const { id: monsterId, name, count = 1, groupSize = 1, initiatives: groupInitiatives = [] } = monster;
      const stat = creatureMap.get(monsterId);
      const dex = stat?.dex || 0;

      for (let i = 0; i < count; i++) {
        const groupIndex = Math.floor(i / groupSize);
      
        let initiative = groupInitiatives[groupIndex];
        let rolled = false;
      
        // If it's null or undefined, generate a new initiative
        if (initiative === null || initiative === undefined) {
          const roll = Math.floor(Math.random() * 20 + 1);
          initiative = roll + (stat?.mod || 0);
          rolled = true;
        }
      
        fullInitiative.push({
          name: `${name} ${i + 1}`,
          initiative,
          rawInitiative: rolled ? initiative - (stat?.mod || 0) : initiative,
          dex,
          type: 'monster',
          ac: extractFirstNumber(stat?.fullStatblock.armor_class),
          hp: extractFirstNumber(stat?.fullStatblock.hit_points),
          maxHp: extractFirstNumber(stat?.fullStatblock.hit_points),
          currentHp: extractFirstNumber(stat?.fullStatblock.hit_points),
          passivePerception: extractFirstNumber(stat?.fullStatblock.senses),
          statblock: stat?.fullStatblock || {},
          naturalOne: rolled ? initiative - (stat?.mod || 0) === 1 : false,
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
      'UPDATE encounters SET name = $1, party_id = $2, monsters = $3, initiative = $4 WHERE id = $5 RETURNING *',
      [name, partyId, JSON.stringify(monsters), JSON.stringify(fullInitiative), id]
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

// DELETE encounter
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM battles WHERE encounter_id = $1', [id]);
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
