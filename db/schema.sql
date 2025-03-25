-- db/schema.sql
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
  legendary_actions TEXT,
  img_url TEXT
);
