import fs from 'fs';
import path from 'path';
import pool from '../server/db.js';

const filePath = path.resolve('monster-stats', 'srd_5e_monsters.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const monsters = JSON.parse(rawData);

async function importMonsters() {
  for (const monster of monsters) {
    try {
      await pool.query(
        `INSERT INTO creatures (
          name, meta, armor_class, hit_points, speed,
          stats, saving_throws, skills, senses, languages,
          challenge, traits, actions, reactions, legendary_actions,
          damage_immunities, damage_resistances, damage_vulnerabilities,
          condition_immunities, img_url
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20
        )`,
        [
          monster.name || null,
          monster.meta || null,
          monster["Armor Class"] || null,
          monster["Hit Points"] || null,
          monster["Speed"] || null,
          JSON.stringify({
            STR: monster.STR,
            DEX: monster.DEX,
            CON: monster.CON,
            INT: monster.INT,
            WIS: monster.WIS,
            CHA: monster.CHA,
            STR_mod: monster.STR_mod,
            DEX_mod: monster.DEX_mod,
            CON_mod: monster.CON_mod,
            INT_mod: monster.INT_mod,
            WIS_mod: monster.WIS_mod,
            CHA_mod: monster.CHA_mod,
          }),
          monster["Saving Throws"] || null,
          monster["Skills"] || null,
          monster["Senses"] || null,
          monster["Languages"] || null,
          monster["Challenge"] || null,
          monster["Traits"] || null,
          monster["Actions"] || null,
          monster["Reactions"] || null,
          monster["Legendary Actions"] || null,
          monster["Damage Immunities"] || null,
          monster["Damage Resistances"] || null,
          monster["Damage Vulnerabilities"] || null,
          monster["Condition Immunities"] || null,
          monster["img_url"] || null
        ]
      );
    } catch (error) {
      console.error(`❌ Failed to import ${monster.name}:`, error.message);
    }
  }

  console.log('✅ Monster import complete!');
  process.exit();
}

importMonsters();
