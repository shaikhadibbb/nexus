import path from 'node:path';
import dotenv from 'dotenv';

// Load `apps/api/.env` for local development. In production, rely on real env vars.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

