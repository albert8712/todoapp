import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { parseEnv } from '../config/env.js';
import { buildDataSourceOptions } from './data-source-options.js';

// El CLI de TypeORM se ejecuta fuera de Nest, así que aquí no hay ConfigModule:
// cargamos `.env` a mano si existe y validamos con el mismo esquema.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = parseEnv();

/**
 * Data source que usa el CLI de TypeORM (`migration:generate`, `migration:run`,
 * `migration:revert`, `migration:show`). Las migraciones nunca se aplican solas
 * desde aquí: `autoMigrate` se deja en false para que mande el comando.
 */
export default new DataSource(
  buildDataSourceOptions({
    database: env.DATABASE_URL,
    autoMigrate: false,
  }),
);
