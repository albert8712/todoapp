import { parseEnv } from './env.js';

describe('parseEnv', () => {
  it('aplica valores por defecto cuando no hay configuración', () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: './data/todo.sqlite',
      DB_AUTO_MIGRATE: true,
      CORS_ORIGIN: '*',
    });
  });

  it('convierte el puerto a número y DB_AUTO_MIGRATE a booleano', () => {
    const env = parseEnv({
      PORT: '8080',
      DB_AUTO_MIGRATE: 'false',
      DATABASE_URL: ':memory:',
    });

    expect(env.PORT).toBe(8080);
    expect(env.DB_AUTO_MIGRATE).toBe(false);
    expect(env.DATABASE_URL).toBe(':memory:');
  });

  it('falla con un mensaje claro si una variable es inválida', () => {
    expect(() => parseEnv({ PORT: 'no-es-un-puerto' })).toThrow(
      /Variables de entorno inválidas/,
    );
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
