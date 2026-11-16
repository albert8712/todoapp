# Todo API

API REST para gestionar tareas (CRUD, filtros por estado y responsable, paginación y validación), construida con **NestJS 12**, **TypeScript**, **TypeORM** y **SQLite**.

El proyecto se ejecuta por fases. Este README es a la vez la documentación y el plan de ejecución: cada fase termina con una verificación concreta y se marca su estado.

---

## Estado del proyecto

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Dependencias, configuración, validación de entorno y bootstrap (health + Swagger) | ✅ Completada |
| 2 | Entidad `Task`, conexión TypeORM y migraciones SQLite | ⏳ Pendiente |
| 3 | Esquemas Zod de entrada/salida y contrato HTTP | ⏳ Pendiente |
| 4 | Repositorio, servicio, controlador CRUD y filtros/paginación | ⏳ Pendiente |
| 5 | Tests unitarios y e2e | ⏳ Pendiente |
| 6 | README final, Docker y despliegue a producción | ⏳ Pendiente |

**Ya implementado en la Fase 1**

- Dependencias del stack y `.npmrc` con la decisión sobre peers.
- Validación de variables de entorno con Zod (`src/config/env.ts`).
- Bootstrap con prefijo `/api`, `StandardSchemaValidationPipe`, CORS y Swagger.
- `GET /api/health` y documentación OpenAPI en `/docs`.
- Tests de configuración y e2e del health check.

**Aún no implementado** (fases 2–6): entidad, base de datos, endpoints de tareas, migraciones, Docker y el resto de tests. Las secciones siguientes describen el contrato y el plan completos.

---

## Stack tecnológico

| Pieza | Versión | Por qué |
| --- | --- | --- |
| Node.js | 26 (mínimo 22) | Soporte ESM nativo, `node:sqlite` disponible y `--env-file`; el proyecto ya usa `"type": "module"`. |
| NestJS | 12 | Módulos, inyección de dependencias, pipes, filtros y OpenAPI de primera parte. |
| TypeScript | 6 | Tipado estricto y decoradores para Nest/TypeORM. |
| TypeORM | 1.1 | ORM maduro, `Repository`/`QueryBuilder` y migraciones versionadas. En 1.x el driver SQLite ya usa `better-sqlite3` por defecto. |
| better-sqlite3 | 13.2 | Driver SQLite síncrono y rápido. La v13 publica binarios N-API para Windows, Linux y Alpine, sin compilador local. |
| SQLite | 3.54 | Base de datos embebida en un solo archivo: cero infraestructura para este alcance. |
| Zod | 4.6 | Validación runtime + tipo TypeScript desde un único esquema (`z.infer`). |
| `StandardSchemaValidationPipe` | Nest 12 | Pipe nativo que valida `@Body()`, `@Query()` y `@Param()` contra esquemas Zod, sin DTOs decorados. |
| `@nestjs/config` | 12 | Carga de `.env` y validación centralizada al arrancar. |
| `@nestjs/swagger` | 12 | OpenAPI generado desde los esquemas Zod y los decoradores del controlador. |
| Vitest + Supertest | 4 / 7 | Tests rápidos con el runner que ya trae el proyecto. |
| `tsx` | 4 | Ejecuta el CLI de TypeORM en un proyecto ESM sin `ts-node`. |
| Docker | — | Imagen multi-stage reproducible con volumen persistente para SQLite. |

---

## Modelo de datos

Tabla `tasks`:

| Columna | Tipo SQLite | Reglas |
| --- | --- | --- |
| `id` | INTEGER | Clave primaria autoincremental. |
| `title` | TEXT | Obligatorio, 1–200 caracteres. |
| `description` | TEXT | Opcional, máximo 2000 caracteres. |
| `status` | TEXT | Obligatorio, uno de `pending`, `in_progress`, `done`; por defecto `pending`. |
| `assignee` | TEXT | Obligatorio, 1–120 caracteres. |
| `due_date` | TEXT | Obligatorio, fecha ISO `YYYY-MM-DD`. |
| `created_at` | TEXT | Obligatorio, ISO 8601 UTC. |
| `updated_at` | TEXT | Obligatorio, ISO 8601 UTC. |

Índices previstos: `status`, `assignee` y `due_date`. Orden por defecto: `due_date ASC, id ASC`.

Equivalencias de estado: `pending` → pendiente, `in_progress` → en curso, `done` → hecha.

Las migraciones se guardan en `src/db/migrations/` y se registran en la tabla `migrations` de TypeORM.

---

## Contrato de la API

Prefijo global: `/api`. Swagger UI: `/docs`. OpenAPI JSON: `/docs/json`.

| Método | Ruta | Éxito | Errores |
| --- | --- | --- | --- |
| `POST` | `/api/tasks` | `201` + tarea creada | `400` |
| `GET` | `/api/tasks?status=&assignee=&page=&limit=` | `200` + `{ data, meta }` | `400` |
| `GET` | `/api/tasks/:id` | `200` + tarea | `400` id inválido, `404` |
| `PATCH` | `/api/tasks/:id` | `200` + tarea actualizada | `400`, `404` |
| `DELETE` | `/api/tasks/:id` | `204` sin cuerpo | `400`, `404` |
| `GET` | `/api/health` | `200` + estado | — |

### Ejemplo de creación

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Preparar informe",
    "description": "Cerrar el trimestre",
    "status": "in_progress",
    "assignee": "Ana",
    "dueDate": "2026-12-01"
  }'
```

### Ejemplo de listado

```bash
curl "http://localhost:3000/api/tasks?status=pending&assignee=ana&page=1&limit=20"
```

```json
{
  "data": [
    {
      "id": 1,
      "title": "Preparar informe",
      "description": "Cerrar el trimestre",
      "status": "pending",
      "assignee": "Ana",
      "dueDate": "2026-12-01",
      "createdAt": "2026-11-16T12:00:00.000Z",
      "updatedAt": "2026-11-16T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### Reglas de validación

- `POST` y `PATCH` usan `z.strictObject`: los campos desconocidos devuelven `400`.
- `PATCH` es parcial pero exige al menos un campo; un cuerpo vacío devuelve `400`.
- `status` solo admite los tres valores del dominio.
- `page` y `limit` se convierten desde el query string; fuera de rango (`page < 1`, `limit < 1` o `limit > 100`) devuelven `400`, no se recortan en silencio.
- `assignee` se compara sin distinguir mayúsculas/minúsculas.
- `id` no numérico, `0` o negativo devuelve `400`; un id válido inexistente devuelve `404`.
- Formato de error de Nest:

```json
{
  "statusCode": 400,
  "message": ["title: Too small: expected string to have >=1 characters"],
  "error": "Bad Request"
}
```

---

## Estructura del proyecto

```text
src/
  main.ts                     # bootstrap de la aplicación
  app.module.ts               # ConfigModule + TypeOrmModule + TasksModule (fases 1–2)
  app.setup.ts                # prefijo /api, pipe global, CORS, Swagger
  health.controller.ts        # GET /api/health
  config/
    env.ts                    # esquema Zod de variables de entorno
    env.spec.ts               # tests de la configuración
  db/                         # (fase 2) data source, entidad y migraciones
    data-source.ts
    data-source-options.ts
    migrations/
  tasks/                      # (fases 3–4) entidad, schemas, repositorio, servicio y controlador
    task.entity.ts
    tasks.schemas.ts
    tasks.repository.ts
    tasks.service.ts
    tasks.controller.ts
    tasks.module.ts
test/
  health.e2e-spec.ts          # e2e del health check
  tasks.e2e-spec.ts           # (fase 5) e2e del CRUD
```

---

## Puesta en marcha

Requisitos: **Node.js 22 o superior** y npm.

```bash
npm install
```

Crear el archivo de entorno (opcional; hay valores por defecto):

```bash
# Linux/macOS
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Arrancar en desarrollo:

```bash
npm run start:dev
```

- API: <http://localhost:3000/api>
- Health: <http://localhost:3000/api/health>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/docs/json>

> **Nota sobre `.npmrc`:** TypeORM 1.x declara `better-sqlite3` `^12` como peer opcional, pero la v12 no publica binarios precompilados y en Windows con Node 26 exigiría compilar con Visual Studio Build Tools. El proyecto usa la v13, compatible a nivel de API y con binarios N-API, y `.npmrc` fija `legacy-peer-deps=true` para que `npm install` / `npm ci` funcionen sin intervención manual. Es la única dependencia con esta excepción.

### Scripts

| Script | Qué hace |
| --- | --- |
| `npm run start:dev` | Servidor en modo watch. |
| `npm run build` | Compila a `dist/`. |
| `npm run start:prod` | Ejecuta `dist/main`. |
| `npm test` | Tests unitarios (`*.spec.ts`). |
| `npm run test:e2e` | Tests e2e (`*.e2e-spec.ts`). |
| `npm run test:cov` | Cobertura. |
| `npm run lint` | oxlint con comprobación de tipos. |
| `npm run format` | Prettier sobre `src/` y `test/`. |
| `npm run db:migration:generate -- src/db/migrations/Nombre` | (Fase 2) Genera una migración a partir del diff entre entidades y base de datos. |
| `npm run db:migration:run` | (Fase 2) Aplica migraciones pendientes. |
| `npm run db:migration:revert` | (Fase 2) Revierte la última migración. |
| `npm run db:migration:show` | (Fase 2) Lista migraciones y su estado. |

---

## Migraciones

`synchronize` **siempre está desactivado**: el esquema cambia solo mediante migraciones versionadas. El flujo previsto (Fase 2) es:

```bash
# 1. Cambiar la entidad y generar el SQL
npm run db:migration:generate -- src/db/migrations/AddTaskPriority

# 2. Revisar el archivo generado en src/db/migrations/
# 3. Aplicarlo
npm run db:migration:run
```

Al arrancar, la aplicación aplica las migraciones pendientes si `DB_AUTO_MIGRATE=true` (`migrationsRun`). Con una sola instancia es cómodo y seguro. Con varias instancias, ponerlo en `false` y ejecutar `npm run db:migration:run` como paso del release, para que solo un proceso migre.

Las migraciones se generan con `--esm` porque el proyecto es ESM. El CLI se ejecuta con `tsx` para leer el `data-source.ts` sin necesidad de `ts-node` ni de compilar antes.

---

## Tests

Estado actual:

- `src/config/env.spec.ts`: valores por defecto, coerción de `PORT` y `DB_AUTO_MIGRATE`, y error claro ante variables inválidas.
- `test/health.e2e-spec.ts`: arranca la app real y verifica `GET /api/health`.

Planificados en la Fase 5 (el requisito es un mínimo de 3 tests):

**Unitarios** (`tasks.service.spec.ts`, repositorio mockeado con `vi.fn()`):

1. Crea una tarea con estado por defecto y timestamps.
2. Propaga filtros y paginación al repositorio.
3. Lanza `NotFoundException` al consultar una tarea inexistente.
4. Lanza `NotFoundException` al actualizar o borrar una tarea inexistente.
5. Calcula `totalPages` correctamente, incluida una página vacía.

**E2E** (`tasks.e2e-spec.ts`, app real + SQLite en memoria migrado):

6. CRUD completo: `201` → `200` → `200` → `204` → `404`.
7. `400` por body inválido, campo desconocido e id no numérico.
8. Filtros combinados por `status` y `assignee` (sin distinguir mayúsculas).
9. Paginación: `limit`, `page`, `total` y `totalPages`.

Los e2e usan `DATABASE_URL=:memory:`, de modo que cada aplicación de test tiene su propia base y no hay estado compartido entre pruebas. La configuración de Vitest define esa variable antes de importar `AppModule`.

---

## Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development`, `test` o `production`. |
| `PORT` | `3000` | Puerto HTTP (1–65535). |
| `DATABASE_URL` | `./data/todo.sqlite` | Ruta del archivo SQLite; `:memory:` en tests. |
| `DB_AUTO_MIGRATE` | `true` | Aplica migraciones pendientes al arrancar. |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas. |

El arranque falla con un mensaje explícito si algún valor no es válido.

---

## Plan de ejecución

### Fase 1 — Dependencias, configuración y bootstrap ✅

- [x] Instalar `@nestjs/typeorm`, `typeorm`, `better-sqlite3`, `zod`, `@nestjs/swagger`, `@nestjs/config` y `tsx`.
- [x] Añadir `.npmrc` con la justificación del peer de `better-sqlite3`.
- [x] Crear `.env.example` y `src/config/env.ts` con validación Zod.
- [x] Configurar `ConfigModule` global en `AppModule`.
- [x] Crear `app.setup.ts` con prefijo `/api`, `StandardSchemaValidationPipe`, CORS, shutdown hooks y Swagger.
- [x] Crear `GET /api/health`.
- [x] Eliminar el `Hello World` del scaffold.
- [x] Tests de configuración y e2e del health check.
- [x] Comprobar `build`, `lint`, `test` y `test:e2e`.

**Verificación:** `npm run build`, `npm test`, `npm run test:e2e` y `npm run lint` pasan; `/api/health` y `/docs` responden.

### Fase 2 — Persistencia y migraciones

- [ ] Crear `Task` con decoradores de TypeORM y **tipos de columna explícitos** (los tests con esbuild no emiten `design:type`).
- [ ] Definir `data-source-options.ts` reutilizable por la app y por el CLI.
- [ ] Crear `data-source.ts` para el CLI, cargando `.env` con `process.loadEnvFile()`.
- [ ] Configurar `TypeOrmModule.forRootAsync` con `synchronize: false` y `migrationsRun` según `DB_AUTO_MIGRATE`.
- [ ] Crear la carpeta `data/` al arrancar y aplicar PRAGMAs (`journal_mode=WAL`, `busy_timeout`, `foreign_keys=ON`).
- [ ] Añadir scripts `db:migration:*`.
- [ ] Generar y revisar la migración inicial `CreateTasks`.
- [ ] Test rápido de conexión/migración.

**Verificación:** `npm run db:migration:run` crea `tasks` y `migrations`; el arranque no usa `synchronize`.

### Fase 3 — Validación y contrato

- [ ] `taskStatusSchema` y tipos inferidos.
- [ ] `createTaskSchema` (`z.strictObject`).
- [ ] `updateTaskSchema` (parcial + al menos un campo).
- [ ] `listTasksQuerySchema` (filtros, `page` y `limit` con coerción y límites).
- [ ] `taskIdSchema` y esquema de respuesta pública.
- [ ] Documentar códigos `400` y `404` esperados.

**Verificación:** body inválido y campos desconocidos devuelven `400` con mensajes por campo.

### Fase 4 — Dominio y endpoints

- [ ] `TasksRepository` con `create`, `findById`, `findPage`, `update` y `delete` usando `Repository`/`QueryBuilder`.
- [ ] `TasksService` con reglas de negocio, `updatedAt`, `NotFoundException` y cálculo de `meta`.
- [ ] `TasksController` con `201`, `200`, `204`, `400` y `404`.
- [ ] Decoradores Swagger y ejemplos.
- [ ] `TasksModule` conectado a `AppModule`.

**Verificación:** CRUD completo por `curl` y desde `/docs`; filtros y paginación combinados.

### Fase 5 — Tests

- [ ] Unitarios del servicio con repositorio mockeado (`vi.fn()`).
- [ ] E2E del CRUD, validación, filtros y paginación con SQLite `:memory:`.
- [ ] Configurar `test.env` en `vitest.config.e2e.ts`.
- [ ] Cobertura mínima razonable del servicio y del controlador.

**Verificación:** `npm test` y `npm run test:e2e` pasan; al menos 3 tests, objetivo ~14.

### Fase 6 — README, Docker y producción

- [ ] Completar el README con la API final y las decisiones definitivas.
- [ ] `Dockerfile` multi-stage (`node:26-alpine`, usuario no root, `HEALTHCHECK`).
- [ ] `.dockerignore` y `docker-compose.yml` con volumen `todo-data:/app/data`.
- [ ] Documentar backups, migraciones en release y límites de SQLite.
- [ ] Verificar la imagen con `docker build` y `docker compose up`.

**Verificación:** CRUD contra el contenedor usando un volumen persistente.

---

## Despliegue a producción

### 1. Build y comprobaciones

```bash
npm ci
npm run lint
npm test
npm run test:e2e
npm run build
```

### 2. Docker

`Dockerfile` previsto (Fase 6):

```dockerfile
FROM node:26-alpine AS deps
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci

FROM deps AS build
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/app/data/todo.sqlite \
    DB_AUTO_MIGRATE=false
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
```

`docker-compose.yml` previsto:

```yaml
services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: production
      DATABASE_URL: /app/data/todo.sqlite
      DB_AUTO_MIGRATE: 'false'
      CORS_ORIGIN: https://mi-frontend.example.com
    volumes:
      - todo-data:/app/data
    restart: unless-stopped

volumes:
  todo-data:
```

Despliegue:

```bash
docker compose build
docker compose run --rm api npm run db:migration:run   # migraciones como paso de release
docker compose up -d
```

### 3. Plataformas

- **VPS / Docker Compose:** la opción de referencia. Volumen persistente para `/app/data`, proxy inverso (Caddy, Traefik o Nginx) con TLS y el puerto de la API sin exponer públicamente.
- **Fly.io / Railway / Render:** requieren un **volumen persistente** montado en `/app/data` y una sola instancia. Sin volumen, el archivo SQLite se pierde en cada despliegue.
- **NestJS Mau (`nest deploy`):** opción gestionada; si se elige, revisar que el servicio tenga almacenamiento persistente, o cambiar a PostgreSQL.
- **Alternativa serverless:** no recomendada con SQLite de archivo; usar PostgreSQL y cambiar el driver de TypeORM.

### 4. Operación

- **Migraciones:** ejecutarlas como paso de release (`npm run db:migration:run`) con `DB_AUTO_MIGRATE=false`, o dejar `true` con una única instancia.
- **Backups:** copiar el archivo SQLite con la API parada o usando `sqlite3 /app/data/todo.sqlite ".backup '/backups/todo-$(date +%F).sqlite'"`. Los archivos `-wal` y `-shm` forman parte del estado: no copiarlos por separado. Programar copias diarias y probar la restauración.
- **Escalado:** SQLite admite un escritor y lectores concurrentes con WAL. Para varias réplicas o escritura intensiva, migrar a PostgreSQL: TypeORM solo cambia el driver y las migraciones necesitan revisión.
- **Salud:** `GET /api/health` sirve para el `HEALTHCHECK` y para el balanceador.
- **TLS y CORS:** terminar TLS en el proxy y restringir `CORS_ORIGIN` al dominio real.
- **Observabilidad:** logs de Nest a stdout (los recoge el runtime). Opcionalmente, [NestJS Observe](https://observe.nestjs.com) con `npx @nestjs/observe link` para trazas, errores y métricas en producción.

---

## Decisiones y trade-offs

### TypeORM en lugar de Drizzle

Se pidió explícitamente TypeORM. Aporta un `Repository` y un `QueryBuilder` maduros, entidades con decoradores y un ecosistema muy documentado. El coste es más boilerplate que Drizzle y una capa de metadatos que hay que cuidar en ESM y en tests. Se compensa con `synchronize: false` y migraciones generadas y revisadas.

### TypeORM 1.x con `better-sqlite3` 13

TypeORM 1.x eliminó el driver `sqlite3` y usa `better-sqlite3` por defecto. Su peer declara `^12`, pero la v12 no trae binarios precompilados y este entorno (Windows, Node 26) no tiene compilador de C++. La v13 mantiene la misma API y sí incluye binarios N-API. Se fija `legacy-peer-deps=true` en `.npmrc`, con el motivo documentado. Es un desajuste de versión declarada, no de API.

### SQLite en lugar de PostgreSQL

Cero infraestructura, un archivo, transacciones ACID y suficiente rendimiento para una API de tareas. A cambio: un solo escritor, sin réplicas, y el backup es responsabilidad del despliegue. El código aísla el acceso en un repositorio, así que cambiar a PostgreSQL es acotado.

### Zod y `StandardSchemaValidationPipe` en lugar de DTOs con `class-validator`

Un único esquema produce validación runtime y tipos estáticos, sin duplicar clases ni depender de `emitDecoratorMetadata` para validar. Nest 12 integra Standard Schema de forma nativa y Swagger genera el OpenAPI desde Zod 4.2+. El coste es que el ecosistema de decoradores de Swagger (`@ApiProperty`) no se usa en los DTOs; los esquemas se documentan solos.

### IDs enteros autoincrementales

Simples, ordenables y eficientes en SQLite. Un UUID sería mejor si los ids se expusieran a terceros o se generaran en clientes; no es el caso. La migración sería un cambio de columna más ajuste de los esquemas.

### Fechas como texto ISO

SQLite no tiene un tipo `DATE`. Guardar `YYYY-MM-DD` para `dueDate` y timestamps ISO 8601 UTC para `createdAt`/`updatedAt` evita conversiones ambiguas del driver, se ordena lexicográficamente y es legible en cualquier cliente. La validación de fechas reales la hace Zod, no la base de datos.

### `assignee` como texto, no como tabla de usuarios

El enunciado pide un responsable, no autenticación ni gestión de usuarios. Un campo de texto validado mantiene el alcance pequeño. Si se añaden usuarios, se creará `users` y una FK `assignee_id`, con migración de datos.

### Paginación por offset

`page`/`limit` es fácil de consumir y de documentar. Con millones de filas, el offset profundo se vuelve lento; el siguiente paso sería paginación por cursor (`due_date`, `id`).

### Errores con el formato de Nest

`400` por validación, `404` por recurso inexistente y `204` al borrar. Se usa el formato estándar de Nest (`statusCode`, `message`, `error`) para no inventar un contrato propio y mantener Swagger y los clientes alineados.

### `synchronize: false`

Nunca se modifica el esquema automáticamente, ni en desarrollo. Las migraciones son la única fuente de verdad y se revisan antes de aplicarse; así se evita el riesgo clásico de pérdida de datos de `synchronize: true`.

### ESM y CLI de TypeORM

El proyecto es ESM (`"type": "module"`, imports con `.js`). El CLI de TypeORM se ejecuta con `tsx` y las migraciones se generan con `--esm`, sin `ts-node` ni una compilación previa. En tiempo de ejecución, TypeORM carga las migraciones compiladas de `dist/db/migrations`.

### Sin autenticación (fuera de alcance)

No hay login ni permisos: cualquiera con acceso a la API puede operar. Es una decisión de alcance, no un olvido. Antes de exponerla a internet se añadiría `@nestjs/authentication`, autorización por propietario y rate limiting con `@nestjs/throttler`.

---

## Próximos pasos

1. Terminar las fases 2–6 del plan.
2. Añadir autenticación y una tabla `users` si el responsable debe ser un usuario real.
3. Añadir `GET /api/tasks/stats` y recordatorios por fecha límite (scheduler + email).
4. CI (lint, build y tests en cada push) y publicación de la imagen Docker.
5. Evaluar PostgreSQL si crece el volumen o se necesitan varias réplicas.
