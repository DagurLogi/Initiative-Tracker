import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load monsters from JSON file
const dataPath = path.join(__dirname, '../monster-stats/srd_5e_monsters.json');
const monsters = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const insertMonsters = async () => {
  try {
    for (const monster of monsters) {
      const {
        name, meta, armor_class, hit_points, speed, stats,
        saving_throws, skills, senses, languages,
        challenge, traits, actions, legendary_actions, img_url
      } = monster;

      await pool.query(`
        INSERT INTO creatures (
          name, meta, armor_class, hit_points, speed, stats,
          saving_throws, skills, senses, languages,
          challenge, traits, actions, legendary_actions, img_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                  $11, $12, $13, $14, $15)
      `, [
        name, meta, armor_class, hit_points, speed, stats,
        saving_throws, skills, senses, languages,
        challenge, traits, actions, legendary_actions, img_url
      ]);
    }

    console.log(`✅ Successfully imported ${monsters.length} monsters.`);
  } catch (err) {
    console.error('❌ Error importing monsters:', err);
  } finally {
    await pool.end();
  }
};

insertMonsters();
