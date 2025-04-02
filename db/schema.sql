-- Drop tables if they exist (to avoid conflicts when re-running)
DROP TABLE IF EXISTS encounters;
DROP TABLE IF EXISTS parties;
DROP TABLE IF EXISTS creatures;

-- Create creatures table
CREATE TABLE creatures (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    meta TEXT,
    armor_class TEXT,
    hit_points TEXT,
    speed TEXT,
    stats JSONB,
    saving_throws TEXT,
    skills TEXT,
    senses TEXT,
    languages TEXT,
    challenge TEXT,
    traits TEXT,
    actions TEXT,
    reactions TEXT,
    legendary_actions TEXT,
    damage_immunities TEXT,
    damage_resistances TEXT,
    damage_vulnerabilities TEXT,
    condition_immunities TEXT,
    img_url TEXT
);

-- Create parties table
CREATE TABLE parties (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    members JSONB NOT NULL
);

-- Create encounters table
CREATE TABLE encounters (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    party_id INTEGER REFERENCES parties(id),
    monsters JSONB NOT NULL,
    initiative JSONB NOT NULL,
    current_round INTEGER DEFAULT 1,
    current_turn_index INTEGER DEFAULT 0,
    total_turns INTEGER DEFAULT 1
);
