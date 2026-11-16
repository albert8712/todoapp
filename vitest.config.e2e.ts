import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Cada aplicación de test usa su propia base SQLite en memoria y aplica
    // las migraciones al inicializar el DataSource.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: ':memory:',
      DB_AUTO_MIGRATE: 'true',
    },
  },
});
