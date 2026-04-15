-- ═══════════════════════════════════════════════════════════════════════════════
-- NEXUS DATABASE INITIALIZATION
-- Creates required extensions for full-text search and geospatial queries
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Remove accents for search normalization
CREATE EXTENSION IF NOT EXISTS "postgis";        -- Geospatial queries

-- Create custom text search configuration for better search
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS nexus_search (COPY = english);
ALTER TEXT SEARCH CONFIGURATION nexus_search
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE nexus_db TO nexus;
