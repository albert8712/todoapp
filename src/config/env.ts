import { z } from 'zod';

/**
 * Esquema único de las variables de entorno. Se valida al arrancar para que la
 * aplicación falle rápido y con un mensaje claro si la configuración no es
 * válida, en lugar de fallar más tarde dentro de un módulo.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().trim().min(1).default('./data/todo.sqlite'),
  DB_AUTO_MIGRATE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  CORS_ORIGIN: z.string().trim().min(1).default('*'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valida y normaliza un objeto de entorno. `ConfigModule.forRoot({ validate })`
 * lo invoca con el contenido de `.env` combinado con `process.env`, y los
 * scripts de TypeORM lo usan directamente con `process.env`.
 */
export function parseEnv(source: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) =>
          `  - ${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(`Variables de entorno inválidas:\n${details}`);
  }

  return result.data;
}
