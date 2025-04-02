import fs from 'fs';
import path from 'path';
import pool from '../server/db.js';
import xss from 'xss';

const filePath = path.resolve('monster-stats', 'srd_5e_monsters.json');
const rawData = fs.readFileSync(filePath, 'utf-8');
const monsters = JSON.parse(rawData);

function sanitize(value) {
  return typeof value === 'string' ? xss(value) : value;
}

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
          sanitize(monster.name),
          sanitize(monster.meta),
          sanitize(monster["Armor Class"]),
          sanitize(monster["Hit Points"]),
          sanitize(monster["Speed"]),
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
          sanitize(monster["Saving Throws"]),
          sanitize(monster["Skills"]),
          sanitize(monster["Senses"]),
          sanitize(monster["Languages"]),
          sanitize(monster["Challenge"]),
          sanitize(monster["Traits"]),
          sanitize(monster["Actions"]),
          sanitize(monster["Reactions"]),
          sanitize(monster["Legendary Actions"]),
          sanitize(monster["Damage Immunities"]),
          sanitize(monster["Damage Resistances"]),
          sanitize(monster["Damage Vulnerabilities"]),
          sanitize(monster["Condition Immunities"]),
          sanitize(monster["img_url"])
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
