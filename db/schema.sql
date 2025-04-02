-- db/schema.sql

-- Table: public.creatures

-- DROP TABLE IF EXISTS public.creatures;

CREATE TABLE IF NOT EXISTS public.creatures
(
    id integer NOT NULL DEFAULT nextval('creatures_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    meta text COLLATE pg_catalog."default",
    armor_class text COLLATE pg_catalog."default",
    hit_points text COLLATE pg_catalog."default",
    speed text COLLATE pg_catalog."default",
    stats jsonb,
    saving_throws text COLLATE pg_catalog."default",
    skills text COLLATE pg_catalog."default",
    senses text COLLATE pg_catalog."default",
    languages text COLLATE pg_catalog."default",
    challenge text COLLATE pg_catalog."default",
    traits text COLLATE pg_catalog."default",
    actions text COLLATE pg_catalog."default",
    reactions text COLLATE pg_catalog."default",
    legendary_actions text COLLATE pg_catalog."default",
    damage_immunities text COLLATE pg_catalog."default",
    damage_resistances text COLLATE pg_catalog."default",
    damage_vulnerabilities text COLLATE pg_catalog."default",
    condition_immunities text COLLATE pg_catalog."default",
    img_url text COLLATE pg_catalog."default",
    CONSTRAINT creatures_pkey PRIMARY KEY (id)
);


TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.creatures
    OWNER to postgres;

-- Table: public.encounters

-- DROP TABLE IF EXISTS public.encounters;

CREATE TABLE IF NOT EXISTS public.encounters
(
    id integer NOT NULL DEFAULT nextval('encounters_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    party_id integer,
    monsters jsonb NOT NULL,
    initiative jsonb NOT NULL,
    current_round integer DEFAULT 1,
    current_turn_index integer DEFAULT 0,
    total_turns integer DEFAULT 1,
    CONSTRAINT encounters_pkey PRIMARY KEY (id),
    CONSTRAINT encounters_party_id_fkey FOREIGN KEY (party_id)
        REFERENCES public.parties (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.encounters
    OWNER to postgres;


-- Table: public.parties

-- DROP TABLE IF EXISTS public.parties;

CREATE TABLE IF NOT EXISTS public.parties
(
    id integer NOT NULL DEFAULT nextval('parties_id_seq'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    members jsonb NOT NULL,
    CONSTRAINT parties_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.parties
    OWNER to postgres;