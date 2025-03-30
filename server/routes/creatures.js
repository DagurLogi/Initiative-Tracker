// @ts-nocheck

import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM creatures');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ DB query error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM creatures WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ DB query error (get by ID):', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new creature
router.post('/', async (req, res) => {
  const {
    name,
    meta,
    armor_class,
    hit_points,
    speed,
    stats,
    saving_throws,
    skills,
    senses,
    languages,
    challenge,
    traits,
    actions,
    reactions,              
    legendary_actions,
    damage_immunities,      
    damage_resistances,     
    damage_vulnerabilities, 
    condition_immunities,   
    img_url
  } = req.body;
  

  try {
    const result = await pool.query(
      `INSERT INTO creatures (
        name, meta, armor_class, hit_points, speed, stats,
        saving_throws, skills, senses, languages, challenge,
        traits, actions, reactions, legendary_actions,
        damage_immunities, damage_resistances, damage_vulnerabilities, condition_immunities,
        img_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20
      ) RETURNING *`,
      [
        name, meta, armor_class, hit_points, speed, stats,
        saving_throws, skills, senses, languages, challenge,
        traits, actions, reactions, legendary_actions,
        damage_immunities, damage_resistances, damage_vulnerabilities, condition_immunities,
        img_url
      ]
    );
    

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ DB insert error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/creatures/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    meta,
    armor_class,
    hit_points,
    speed,
    stats,
    saving_throws,
    skills,
    senses,
    languages,
    challenge,
    traits,
    actions,
    reactions,
    legendary_actions,
    damage_immunities,
    damage_resistances,
    damage_vulnerabilities,
    condition_immunities,
    img_url
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE creatures SET
        name = $1,
        meta = $2,
        armor_class = $3,
        hit_points = $4,
        speed = $5,
        stats = $6,
        saving_throws = $7,
        skills = $8,
        senses = $9,
        languages = $10,
        challenge = $11,
        traits = $12,
        actions = $13,
        reactions = $14,
        legendary_actions = $15,
        damage_immunities = $16,
        damage_resistances = $17,
        damage_vulnerabilities = $18,
        condition_immunities = $19,
        img_url = $20
      WHERE id = $21
      RETURNING *`,
      [
        name, meta, armor_class, hit_points, speed, stats,
        saving_throws, skills, senses, languages, challenge,
        traits, actions, reactions, legendary_actions,
        damage_immunities, damage_resistances, damage_vulnerabilities, condition_immunities,
        img_url,
        id // This is $21
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ DB update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// DELETE /api/creatures/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM creatures WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    res.json({ message: 'Creature deleted successfully' });
  } catch (error) {
    console.error('❌ DB delete error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



export default router;
