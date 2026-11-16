import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { Task } from '../tasks/task.entity.js';
import { CreateTasks1794863403592 } from './migrations/1794863403592-CreateTasks.js';

export interface DatabaseConfig {
  database: string;
  autoMigrate: boolean;
}

/**
 * Opciones compartidas por la aplicación (`TypeOrmModule.forRootAsync`) y por
 * el CLI de TypeORM (`src/db/data-source.ts`), para que ambos vean el mismo
 * esquema y las mismas migraciones.
 */
export function buildDataSourceOptions({
  database,
  autoMigrate,
}: DatabaseConfig): DataSourceOptions {
  if (database !== ':memory:') {
    mkdirSync(dirname(resolve(database)), { recursive: true });
  }

  return {
    type: 'better-sqlite3',
    database,
    entities: [Task],
    // Lista explícita en lugar de un glob: Vitest transforma la migración como
    // cualquier otro módulo del proyecto (el glob acabaría cargando el `.ts`
    // con el loader nativo de Node) y en `dist/` se resuelve el `.js` compilado.
    // Al generar una migración nueva, añadirla también aquí.
    migrations: [CreateTasks1794863403592],
    migrationsRun: autoMigrate,
    synchronize: false,
    enableWAL: true,
    timeout: 5000,
  };
}
