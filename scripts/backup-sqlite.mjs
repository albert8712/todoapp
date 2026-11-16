#!/usr/bin/env node
/**
 * Copia de seguridad en caliente de la base SQLite.
 *
 * Usa la API `backup()` de better-sqlite3, que copia una instantánea coherente
 * aunque la API esté escribiendo y WAL esté activo. Copiar el `.sqlite` con
 * `cp` mientras el proceso corre puede dejar fuera las transacciones que aún
 * viven en `-wal`.
 *
 * Uso:
 *   node scripts/backup-sqlite.mjs \
 *     [--source ./data/todo.sqlite] \
 *     [--dir ./backups] \
 *     [--keep 14]
 *
 * La ruta de origen también se puede indicar con DATABASE_URL.
 */
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import Database from 'better-sqlite3';

const { values } = parseArgs({
  options: {
    source: { type: 'string' },
    dir: { type: 'string' },
    keep: { type: 'string' },
  },
});

const sourceArgument =
  values.source ?? process.env.DATABASE_URL ?? './data/todo.sqlite';

if (sourceArgument === ':memory:') {
  fail('DATABASE_URL=:memory: no se puede copiar: no hay archivo.');
}

const source = resolve(sourceArgument);
const destinationDir = resolve(values.dir ?? './backups');
const keepDays = Number(values.keep ?? '14');

if (!Number.isFinite(keepDays) || keepDays < 0) {
  fail('--keep debe ser un número de días mayor o igual que 0.');
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  try {
    statSync(source);
  } catch {
    fail(`no existe la base de datos de origen: ${source}`);
  }

  mkdirSync(destinationDir, { recursive: true });

  const destination = join(destinationDir, `todo-${timestamp()}.sqlite`);
  const database = new Database(source, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const metadata = await database.backup(destination);
    console.log(
      `Copia creada: ${destination} (${metadata.totalPages} páginas)`,
    );
  } finally {
    database.close();
  }

  // La copia se abre y se comprueba antes de darla por buena: un backup que no
  // se puede restaurar es peor que no tener backup.
  const copy = new Database(destination, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const integrity = copy.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') {
      fail(`la copia no pasa integrity_check: ${String(integrity)}`);
    }
    const { count } = copy.prepare('SELECT COUNT(*) AS count FROM tasks').get();
    console.log(
      `Verificada: integrity_check=ok, ${count} tareas, ${(
        statSync(destination).size / 1024
      ).toFixed(1)} KB`,
    );
  } finally {
    copy.close();
  }

  if (keepDays > 0) {
    removeOldCopies(destinationDir, keepDays);
  }
}

function removeOldCopies(directory, days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const pattern = /^todo-.*\.sqlite$/;

  for (const name of readdirSync(directory)) {
    if (!pattern.test(name)) {
      continue;
    }

    const path = join(directory, name);
    if (statSync(path).mtimeMs < cutoff) {
      unlinkSync(path);
      console.log(`Copia antigua eliminada: ${path}`);
    }
  }
}

await main();
