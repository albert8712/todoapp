# Todo API

API REST para gestionar tareas (CRUD, filtros por estado y responsable, paginación y validación), construida con **NestJS 12**, **TypeScript**, **TypeORM** y **SQLite**.

El proyecto se ejecuta por fases. Este README es a la vez la documentación y el plan de ejecución: cada fase termina con una verificación concreta y se marca su estado.

---

## Estado del proyecto

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Dependencias, configuración, validación de entorno y bootstrap (health + Swagger) | ✅ Completada |
| 2 | Entidad `Task`, conexión TypeORM y migraciones SQLite | ✅ Completada |
| 3 | Esquemas Zod de entrada/salida y contrato HTTP | ✅ Completada |
| 4 | Repositorio, servicio, controlador CRUD y filtros/paginación | ✅ Completada |
| 4.1 | Ejemplos de peticiones de todos los endpoints en el README | ✅ Completada |
| 5 | Tests unitarios y e2e | ✅ Completada |
| 6 | README final, Docker y despliegue a producción | ⏳ Pendiente |

**Ya implementado en la Fase 1**

- Dependencias del stack y `.npmrc` con la decisión sobre peers.
- Validación de variables de entorno con Zod (`src/config/env.ts`).
- Bootstrap con prefijo `/api`, `StandardSchemaValidationPipe`, CORS y Swagger.
- `GET /api/health` y documentación OpenAPI en `/docs`.
- Tests de configuración y e2e del health check.

**Ya implementado en la Fase 2**

- Entidad `Task` con tipos de columna explícitos, CHECK de estado e índices.
- `buildDataSourceOptions()` compartido por la app y por el CLI de TypeORM.
- `DatabaseModule` con `TypeOrmModule.forRootAsync`, `synchronize: false` y `migrationsRun` según `DB_AUTO_MIGRATE`.
- SQLite con WAL, `busy_timeout` de 5 s y creación automática de `data/`.
- Migración inicial `CreateTasks` generada, revisada y aplicada.
- Scripts `db:migration:generate`, `db:migration:run`, `db:migration:revert` y `db:migration:show`.
- Health check que consulta la base de datos (`SELECT 1`).

**Ya implementado en la Fase 3**

- `src/tasks/tasks.schemas.ts`: `createTaskSchema`, `updateTaskSchema`, `listTasksQuerySchema`, `taskIdSchema` y los esquemas de respuesta con sus tipos `z.infer`.
- Creación y actualización con `z.strictObject` (campos desconocidos → `400`) y `description` opcional o nula.
- `status` validado contra `TASK_STATUSES`; `dueDate` con `z.iso.date()`, que rechaza fechas inexistentes como `2026-02-30`.
- `PATCH` parcial que exige al menos un campo y **no inyecta** el `status` por defecto.
- Filtros y paginación con coerción desde el query string: `page ≥ 1`, `limit` entre 1 y 100, valores por defecto 1 y 20.
- `taskIdSchema` convierte el `id` de la ruta y rechaza `0`, negativos y texto.
- Respuestas públicas tipadas: `taskResponseSchema`, `paginationMetaSchema` y `paginatedTasksResponseSchema`.
- `src/tasks/tasks.schemas.spec.ts` con 15 tests de los esquemas.

**Ya implementado en la Fase 4**

- `TasksRepository`: `create`, `findById`, `findPage`, `save` y `deleteById` sobre el `Repository` de TypeORM.
- `TasksService`: timestamps ISO, `NotFoundException`, cálculo de `meta` y mapeo explícito entidad → respuesta.
- `TasksController`: `POST`, `GET` (lista), `GET :id`, `PATCH :id` y `DELETE :id` con los códigos `201`, `200`, `204`, `400` y `404`.
- Filtros por `status` y `assignee` (sin distinguir mayúsculas en ASCII), orden `due_date ASC, id ASC` y paginación por `page`/`limit`.
- `TasksModule` con `TypeOrmModule.forFeature([Task])`, conectado a `AppModule`.
- Swagger genera el contrato desde los esquemas Zod: body del POST/PATCH, parámetros de query y de ruta, y respuestas `201`/`200`/`204`.
- Verificación HTTP completa sobre una base temporal: 59 comprobaciones de CRUD, filtros, paginación, errores y OpenAPI.

**Ya implementado en la Fase 4.1**

- Ejemplos `curl` completos para crear (body completo y mínimo), listar (sin filtros, con todos los filtros y paginación), consultar, actualizar y eliminar.
- Tabla con todas las combinaciones de filtros: `status`, `assignee`, `page` y `limit`.
- Ejemplos de respuestas `201`, `200` y `204`, y de errores `400` y `404`.
- Equivalentes en PowerShell con `Invoke-RestMethod`, incluida la nota sobre `curl.exe`.
- Solo se modificó `README.md`; no hay cambios de código en esta fase.

**Ya implementado en la Fase 5**

- `src/tasks/tasks.service.spec.ts`: 11 tests unitarios del servicio con el repositorio mockeado con `vi.fn()`.
- `test/tasks.e2e-spec.ts`: 12 tests e2e sobre la app real y SQLite `:memory:`, uno por cada comportamiento del contrato.
- La base se reinicia en `beforeEach` y se siembran tres tareas sin suponer ids fijos, así que los tests no comparten estado ni dependen del orden.
- Total del proyecto: **29 tests unitarios y 13 e2e**, todos en verde.

**Aún no implementado** (fase 6): Docker, despliegue a producción y cierre del README. Las secciones siguientes describen el contrato y el plan completos.

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

La migración inicial crea además un `CHECK` de base de datos para `status` (`IN ('pending','in_progress','done')`), de modo que la integridad no depende solo de Zod.

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
| `GET` | `/api/health` | `200` + estado y comprobación de la base de datos | — |

### Ejemplos de peticiones (Fase 4.1)

Todos los ejemplos usan el prefijo global `/api`, el puerto por defecto `3000` y las tareas de ejemplo con ids `1`, `2` y `3`.

- En **bash/zsh** se usa `curl`.
- En **PowerShell**, `curl` es un alias de `Invoke-WebRequest` y no interpreta `-X` ni `-d`: usa `curl.exe` o los [equivalentes en PowerShell](#6-equivalentes-en-powershell).
- Las fechas de respuesta son ISO 8601 UTC; `dueDate` es solo fecha (`YYYY-MM-DD`).

#### 1. Crear una tarea

`POST /api/tasks` con todos los campos:

```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Preparar informe trimestral",
    "description": "Cerrar el trimestre y enviarlo a dirección",
    "status": "in_progress",
    "assignee": "Ana",
    "dueDate": "2026-12-01"
  }'
```

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
  "id": 1,
  "title": "Preparar informe trimestral",
  "description": "Cerrar el trimestre y enviarlo a dirección",
  "status": "in_progress",
  "assignee": "Ana",
  "dueDate": "2026-12-01",
  "createdAt": "2026-11-16T12:00:00.000Z",
  "updatedAt": "2026-11-16T12:00:00.000Z"
}
```

Body mínimo: `status` se guarda como `pending` y `description` como `null`.

```bash
curl -i -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Revisar presupuesto", "assignee": "Luis", "dueDate": "2026-11-20"}'
```

```json
{
  "id": 2,
  "title": "Revisar presupuesto",
  "description": null,
  "status": "pending",
  "assignee": "Luis",
  "dueDate": "2026-11-20",
  "createdAt": "2026-11-16T12:05:00.000Z",
  "updatedAt": "2026-11-16T12:05:00.000Z"
}
```

Un campo desconocido, un `status` fuera del enum, una fecha imposible (`2026-02-30`) o un `title` vacío devuelven `400` (ver [errores de ejemplo](#errores-de-ejemplo)).

Para los ejemplos de listado y paginación se usa una tercera tarea, con el responsable en minúsculas para probar el filtro sin distinguir mayúsculas:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Enviar facturas", "status": "done", "assignee": "ana", "dueDate": "2026-11-10"}'
```

#### 2. Listar tareas con filtros y paginación

`GET /api/tasks` sin filtros aplica `page=1` y `limit=20`:

```bash
curl "http://localhost:3000/api/tasks"
```

Todos los filtros disponibles a la vez:

```bash
curl "http://localhost:3000/api/tasks?status=in_progress&assignee=Ana&page=1&limit=10"
```

```json
{
  "data": [
    {
      "id": 1,
      "title": "Preparar informe trimestral",
      "description": "Cerrar el trimestre y enviarlo a dirección",
      "status": "in_progress",
      "assignee": "Ana",
      "dueDate": "2026-12-01",
      "createdAt": "2026-11-16T12:00:00.000Z",
      "updatedAt": "2026-11-16T12:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Combinaciones de filtros:

| Objetivo | Petición |
| --- | --- |
| Todas las tareas | `GET /api/tasks` |
| Solo pendientes | `GET /api/tasks?status=pending` |
| Solo en curso | `GET /api/tasks?status=in_progress` |
| Solo hechas | `GET /api/tasks?status=done` |
| Por responsable | `GET /api/tasks?assignee=Ana` |
| Responsable sin distinguir mayúsculas | `GET /api/tasks?assignee=ana` |
| Estado y responsable | `GET /api/tasks?status=done&assignee=ana` |
| Paginación | `GET /api/tasks?page=2&limit=5` |
| Todos los filtros | `GET /api/tasks?status=in_progress&assignee=Ana&page=1&limit=10` |

Paginación con `page=1&limit=2`: el orden es `dueDate ASC, id ASC`, así que primero salen las fechas más próximas.

```bash
curl "http://localhost:3000/api/tasks?page=1&limit=2"
```

```json
{
  "data": [
    {
      "id": 3,
      "title": "Enviar facturas",
      "description": null,
      "status": "done",
      "assignee": "ana",
      "dueDate": "2026-11-10",
      "createdAt": "2026-11-16T12:10:00.000Z",
      "updatedAt": "2026-11-16T12:10:00.000Z"
    },
    {
      "id": 2,
      "title": "Revisar presupuesto",
      "description": null,
      "status": "pending",
      "assignee": "Luis",
      "dueDate": "2026-11-20",
      "createdAt": "2026-11-16T12:05:00.000Z",
      "updatedAt": "2026-11-16T12:05:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 2, "total": 3, "totalPages": 2 }
}
```

Un `limit` mayor que 100, un `page` menor que 1 o un `status` desconocido devuelven `400`:

```bash
curl -i "http://localhost:3000/api/tasks?limit=101"
```

#### 3. Consultar una tarea

`GET /api/tasks/:id`:

```bash
curl -i http://localhost:3000/api/tasks/1
```

```json
{
  "id": 1,
  "title": "Preparar informe trimestral",
  "description": "Cerrar el trimestre y enviarlo a dirección",
  "status": "in_progress",
  "assignee": "Ana",
  "dueDate": "2026-12-01",
  "createdAt": "2026-11-16T12:00:00.000Z",
  "updatedAt": "2026-11-16T12:00:00.000Z"
}
```

Si el id es válido pero no existe, responde `404`:

```bash
curl -i http://localhost:3000/api/tasks/999
```

```json
{
  "statusCode": 404,
  "message": "No existe la tarea 999",
  "error": "Not Found"
}
```

#### 4. Actualizar una tarea

`PATCH /api/tasks/:id` solo modifica los campos enviados. Cambiar el estado:

```bash
curl -i -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

```json
{
  "id": 1,
  "title": "Preparar informe trimestral",
  "description": "Cerrar el trimestre y enviarlo a dirección",
  "status": "done",
  "assignee": "Ana",
  "dueDate": "2026-12-01",
  "createdAt": "2026-11-16T12:00:00.000Z",
  "updatedAt": "2026-11-16T12:20:00.000Z"
}
```

Varios campos a la vez:

```bash
curl -i -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Preparar informe anual",
    "status": "in_progress",
    "assignee": "Luis",
    "dueDate": "2026-12-15"
  }'
```

Borrar la descripción con `null` (omitirla, en cambio, la conserva):

```bash
curl -i -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"description": null}'
```

Errores habituales:

| Caso | Petición | Respuesta |
| --- | --- | --- |
| Cuerpo vacío | `PATCH /api/tasks/1` con `{}` | `400` «Debe indicar al menos un campo para actualizar» |
| Campo desconocido | `PATCH /api/tasks/1` con `{"priority": "alta"}` | `400` «Unrecognized key» |
| Estado inválido | `PATCH /api/tasks/1` con `{"status": "hecha"}` | `400` por `status` |
| Id inexistente | `PATCH /api/tasks/999` con `{"status": "done"}` | `404` «No existe la tarea 999» |

```bash
curl -i -X PATCH http://localhost:3000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 5. Eliminar una tarea

`DELETE /api/tasks/:id` responde `204` sin cuerpo:

```bash
curl -i -X DELETE http://localhost:3000/api/tasks/1
```

```http
HTTP/1.1 204 No Content
```

Repetir el borrado del mismo id devuelve `404`:

```bash
curl -i -X DELETE http://localhost:3000/api/tasks/1
```

#### 6. Equivalentes en PowerShell

```powershell
$base = "http://localhost:3000/api"

# Crear
$body = @{
  title       = "Preparar informe trimestral"
  description = "Cerrar el trimestre y enviarlo a dirección"
  status      = "in_progress"
  assignee    = "Ana"
  dueDate     = "2026-12-01"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/tasks" `
  -ContentType "application/json" -Body $body

# Listar con todos los filtros
Invoke-RestMethod "$base/tasks?status=in_progress&assignee=Ana&page=1&limit=10"

# Consultar
Invoke-RestMethod "$base/tasks/1"

# Actualizar
$patch = @{ status = "done" } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "$base/tasks/1" `
  -ContentType "application/json" -Body $patch

# Eliminar (204 sin cuerpo)
Invoke-RestMethod -Method Delete -Uri "$base/tasks/1"
```

`Invoke-RestMethod` lanza una excepción con las respuestas `4XX`; para inspeccionar el código y el cuerpo de un error, usa `curl.exe -i` o `Invoke-WebRequest` dentro de un `try/catch`.

#### Errores de ejemplo

Validación del body (`400`), con un mensaje por campo:

```json
{
  "statusCode": 400,
  "message": ["title: Too small: expected string to have >=1 characters"],
  "error": "Bad Request"
}
```

Query inválido (`400`):

```json
{
  "statusCode": 400,
  "message": ["limit: Too big: expected number to be <=100"],
  "error": "Bad Request"
}
```

Recurso inexistente (`404`):

```json
{
  "statusCode": 404,
  "message": "No existe la tarea 999",
  "error": "Not Found"
}
```

### Comportamiento de los endpoints

- **Crear:** `status` es opcional y por defecto `pending`; `description` es opcional y se guarda como `null` si se omite. `createdAt` y `updatedAt` se generan en el servidor con la misma marca ISO 8601 UTC.
- **Listar:** devuelve `{ data, meta }`. El orden es `due_date ASC, id ASC`, estable cuando varias tareas comparten fecha. `meta.totalPages` es `ceil(total / limit)` y vale `0` si no hay tareas. Pedir una página posterior a la última devuelve `data: []` y conserva la página solicitada en `meta.page`.
- **Consultar:** un id válido inexistente devuelve `404` con `"message": "No existe la tarea <id>"`.
- **Actualizar:** solo cambia los campos presentes; `description: null` borra la descripción y omitirla la conserva. `updatedAt` se actualiza y `createdAt` no cambia.
- **Eliminar:** responde `204` sin cuerpo; repetir el borrado devuelve `404`.

### Reglas de validación

- `POST` y `PATCH` usan `z.strictObject`: los campos desconocidos devuelven `400`.
- `PATCH` es parcial pero exige al menos un campo; un cuerpo vacío devuelve `400` y los campos omitidos no se tocan (el `status` por defecto solo se aplica al crear).
- `status` solo admite los tres valores del dominio.
- `title` admite 1–200 caracteres, `assignee` 1–120 y `description` hasta 2000; los espacios sobrantes se recortan.
- `page` y `limit` se convierten desde el query string; fuera de rango (`page < 1`, `limit < 1` o `limit > 100`) devuelven `400`, no se recortan en silencio.
- El query de listado no es estricto: parámetros desconocidos se ignoran, para no romper enlaces con `utm_*` u otros añadidos por el cliente.
- `assignee` se compara sin distinguir mayúsculas/minúsculas con `LOWER`, que en SQLite cubre ASCII; no normaliza acentos (ver decisiones).
- `id` no numérico, `0` o negativo devuelve `400`; un id válido inexistente devuelve `404`.
- Los errores usan el formato estándar de Nest (`statusCode`, `message`, `error`); hay ejemplos concretos en [errores de ejemplo](#errores-de-ejemplo).

`GET /api/health` devuelve `{ "status": "ok", "database": "up", "uptime": ..., "timestamp": ... }` y responde `500` si la base de datos no contesta.

---

## Estructura del proyecto

```text
src/
  main.ts                     # bootstrap de la aplicación
  app.module.ts               # ConfigModule + TypeOrmModule + TasksModule
  app.setup.ts                # prefijo /api, pipe global, CORS, Swagger
  health.controller.ts        # GET /api/health
  config/
    env.ts                    # esquema Zod de variables de entorno
    env.spec.ts               # tests de la configuración
  db/
    data-source-options.ts    # opciones compartidas por app y CLI
    data-source.ts            # DataSource del CLI de TypeORM
    database.module.ts        # TypeOrmModule.forRootAsync
    migrations/
      1794863403592-CreateTasks.ts
  tasks/
    task.entity.ts            # entidad Task
    tasks.schemas.ts          # esquemas Zod de entrada/salida
    tasks.schemas.spec.ts     # tests de los esquemas
    tasks.repository.ts       # acceso a datos y paginación
    tasks.service.ts          # reglas de negocio y errores
    tasks.service.spec.ts     # tests unitarios del servicio
    tasks.controller.ts       # endpoints y documentación Swagger
    tasks.module.ts           # módulo de tareas
test/
  health.e2e-spec.ts          # e2e del health check
  tasks.e2e-spec.ts           # e2e del CRUD
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
| `npm run db:migration:generate -- src/db/migrations/Nombre` | Genera una migración a partir del diff entre entidades y base de datos. |
| `npm run db:migration:run` | Aplica migraciones pendientes. |
| `npm run db:migration:revert` | Revierte la última migración. |
| `npm run db:migration:show` | Lista migraciones y su estado. |

---

## Migraciones

`synchronize` **siempre está desactivado**: el esquema cambia solo mediante migraciones versionadas. El flujo es:

```bash
# 1. Cambiar la entidad y generar el SQL
npm run db:migration:generate -- src/db/migrations/AddTaskPriority

# 2. Revisar el archivo generado en src/db/migrations/
# 3. Registrarlo en el array `migrations` de src/db/data-source-options.ts
# 4. Aplicarlo
npm run db:migration:run

# 5. Comprobar el estado
npm run db:migration:show
```

Las migraciones se registran de forma explícita (`migrations: [CreateTasks1794863403592, ...]`) en lugar de usar un glob. Con un glob, Vitest acabaría cargando el `.ts` con el loader nativo de Node en vez de transformarlo, y en `dist/` hay que apuntar al `.js`; la lista explícita funciona igual en fuente, tests y producción, a cambio de añadir una línea por migración.

Al generar una migración nueva, cambiar el import a `import type { MigrationInterface, QueryRunner } from 'typeorm'` (TypeORM lo genera como import de valor): el proyecto es ESM y esos símbolos son solo tipos.

La migración inicial `CreateTasks` crea la tabla `tasks`, el `CHECK` de `status` y los tres índices. Se aplicó con `npm run db:migration:run` y quedó registrada en la tabla `migrations`; el archivo local vive en `data/todo.sqlite` (ignorado por git).

Al arrancar, la aplicación aplica las migraciones pendientes si `DB_AUTO_MIGRATE=true` (`migrationsRun`). Con una sola instancia es cómodo y seguro. Con varias instancias, ponerlo en `false` y ejecutar `npm run db:migration:run` como paso del release, para que solo un proceso migre.

Las migraciones se generan con `--esm` porque el proyecto es ESM. El CLI se ejecuta con `tsx` para leer el `data-source.ts` sin necesidad de `ts-node` ni de compilar antes.

---

## Tests

El requisito era un mínimo de 3 tests; el proyecto tiene **29 unitarios y 13 e2e (42 en total)**.

### Unitarios — `npm test`

| Archivo | Tests | Cubre |
| --- | --- | --- |
| `src/config/env.spec.ts` | 3 | Valores por defecto, coerción de `PORT`/`DB_AUTO_MIGRATE` y error claro ante variables inválidas. |
| `src/tasks/tasks.schemas.spec.ts` | 15 | Creación, actualización, query de listado, id y respuesta pública. |
| `src/tasks/tasks.service.spec.ts` | 11 | Reglas de negocio con el repositorio mockeado. |

`tasks.service.spec.ts` usa `vi.fn()` y `vi.useFakeTimers()` para fijar el reloj:

1. `create` guarda `description: null` cuando se omite y genera `createdAt`/`updatedAt` con la misma marca.
2. `create` conserva la descripción y el estado cuando se envían.
3. `findOne` devuelve la tarea mapeada.
4. `findOne` lanza `NotFoundException` con el id en el mensaje.
5. `findPage` propaga los filtros y la paginación al repositorio.
6. `findPage` calcula `totalPages` (`ceil(total / limit)`).
7. `findPage` devuelve `totalPages: 0` sin tareas.
8. `update` aplica solo los campos enviados y avanza `updatedAt`.
9. `update` borra la descripción con `null`.
10. `update` lanza `404` sin llamar a `save` si la tarea no existe.
11. `remove` elimina y lanza `404` cuando no se afectó ninguna fila.

### E2E — `npm run test:e2e`

`test/tasks.e2e-spec.ts` arranca la app real con `DATABASE_URL=:memory:`, aplica las migraciones y siembra tres tareas en `beforeEach`:

1. `POST` crea con estado por defecto, recorta espacios y genera timestamps ISO.
2. `POST` rechaza campos desconocidos, fechas imposibles, estados inválidos y títulos vacíos.
3. `GET` lista ordenado por `dueDate` e `id`, con `meta` correcta.
4. `GET` filtra por `status` y `assignee`, sin distinguir mayúsculas en ASCII.
5. `GET` pagina con `limit`, `total` y `totalPages`, incluida una página fuera de rango.
6. `GET /:id` devuelve la tarea creada.
7. `GET /:id` responde `404` si no existe y `400` con ids inválidos.
8. `PATCH` cambia solo lo enviado y conserva `createdAt`.
9. `PATCH` borra la descripción con `null` y rechaza cuerpo vacío o con campos desconocidos.
10. `PATCH` responde `404` si la tarea no existe.
11. `DELETE` responde `204` sin cuerpo y `404` al repetir.
12. `GET` rechaza filtros y paginación inválidos (`limit=101`, `page=0`, estado inexistente).

`test/health.e2e-spec.ts` verifica `GET /api/health`, incluida la consulta a la base de datos.

Las dos suites e2e usan `DATABASE_URL=:memory:` y `DB_AUTO_MIGRATE=true` definidos en `vitest.config.e2e.ts`, antes de importar `AppModule`. Cada archivo de test crea su propia aplicación y base, y `beforeEach` limpia `tasks`, así que no hay estado compartido ni dependencia del orden. Los ids se toman de las respuestas, no se hardcodean.

La Fase 4 se verificó además con un script HTTP temporal contra `dist/main.js` y una base SQLite de usar y tirar (59 comprobaciones); no se versionó porque los e2e permanentes cubren el mismo contrato.

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

### Fase 2 — Persistencia y migraciones ✅

- [x] Crear `Task` con decoradores de TypeORM y **tipos de columna explícitos** (los tests con esbuild no emiten `design:type`).
- [x] Definir `data-source-options.ts` reutilizable por la app y por el CLI.
- [x] Crear `data-source.ts` para el CLI, cargando `.env` con `process.loadEnvFile()`.
- [x] Configurar `TypeOrmModule.forRootAsync` con `synchronize: false` y `migrationsRun` según `DB_AUTO_MIGRATE`.
- [x] Crear la carpeta `data/` al arrancar, activar WAL y fijar un `busy_timeout` de 5 s (`better-sqlite3` activa las claves foráneas por defecto).
- [x] Añadir scripts `db:migration:*`.
- [x] Generar y revisar la migración inicial `CreateTasks` (tabla, CHECK e índices).
- [x] Verificar conexión y migración: e2e con SQLite en memoria y arranque desde `dist/` con una base nueva.

**Verificación:** `npm run db:migration:show` marca la migración como ejecutada; `npm run db:migration:run` sobre una base limpia crea `tasks` y `migrations`; el e2e y el arranque desde `dist/` responden `database: "up"`.

**Nota de implementación:** las migraciones se importan de forma estática y se registran en el array `migrations` de `data-source-options.ts`. Un glob habría cargado el `.ts` con el loader nativo de Node durante Vitest, en lugar de transformarlo como el resto del proyecto.

### Fase 3 — Validación y contrato ✅

- [x] `taskStatusSchema` y tipos inferidos.
- [x] `createTaskSchema` (`z.strictObject`).
- [x] `updateTaskSchema` (parcial + al menos un campo).
- [x] `listTasksQuerySchema` (filtros, `page` y `limit` con coerción y límites).
- [x] `taskIdSchema` y esquema de respuesta pública (`taskResponseSchema`, `paginatedTasksResponseSchema`).
- [x] Documentar códigos `400` y `404` esperados.

**Verificación:** `npm test` valida los 15 casos de los esquemas (valores por defecto, recorte, fechas imposibles, estados inválidos, campos desconocidos, `PATCH` vacío, coerción de query e ids). La traducción a `400` con un mensaje por campo la hace `StandardSchemaValidationPipe` (formato `campo: mensaje`), y los e2e de la Fase 5 lo comprueban por HTTP.

**Nota de implementación:** en Zod 4 un `ZodDefault` ya cuenta como opcional, así que `createTaskSchema.partial()` conservaba el `status: 'pending'` y un PATCH sin estado habría reseteado tareas. Por eso los campos se declaran una vez y el `default` se aplica solo en el esquema de creación; hay un test que lo protege.

### Fase 4 — Dominio y endpoints ✅

- [x] `TasksRepository` con `create`, `findById`, `findPage`, `save` y `deleteById` usando `Repository`/`QueryBuilder`.
- [x] `TasksService` con reglas de negocio, `updatedAt`, `NotFoundException` y cálculo de `meta`.
- [x] `TasksController` con `201`, `200`, `204`, `400` y `404`.
- [x] Decoradores Swagger y ejemplos.
- [x] `TasksModule` conectado a `AppModule`.

**Verificación:** script HTTP contra `dist/main.js` y una base SQLite temporal: 59 comprobaciones correctas de CRUD, filtros combinados, orden, paginación (incluida página fuera de rango), errores `400`/`404`, `204` sin cuerpo y OpenAPI (`requestBody`, parámetros de query y de ruta, y esquemas de respuesta).

**Nota de implementación:** el controlador declara los esquemas en los parámetros (`@Body({ schema })`, `@Query({ schema })`, `@Param('id', { schema })`). El pipe global valida y transforma, y Swagger 12 reutiliza esos mismos esquemas para generar el contrato; no hay DTOs ni decoradores `@ApiProperty` duplicados. La consulta de `assignee` usa `LOWER(...) = LOWER(...)` porque SQLite no tiene `ILIKE`.

### Fase 4.1 — Ejemplos de peticiones en el README ✅

- [x] Documentar `POST /api/tasks` con body completo y body mínimo.
- [x] Documentar `GET /api/tasks` sin filtros, con todos los filtros y con paginación.
- [x] Añadir una tabla con todas las combinaciones de `status`, `assignee`, `page` y `limit`.
- [x] Documentar `GET /api/tasks/:id`, `PATCH /api/tasks/:id` y `DELETE /api/tasks/:id`.
- [x] Incluir respuestas `201`, `200`, `204` y errores `400`/`404`.
- [x] Añadir equivalentes en PowerShell y la nota sobre `curl.exe`.
- [x] Comprobar que los ejemplos respetan el contrato implementado.

**Verificación:** los ejemplos se contrastaron con el comportamiento real de la Fase 4 (códigos, orden, `meta`, campos opcionales y mensajes de error). Esta fase solo modifica `README.md`; `build`, `lint` y los tests no cambian.

### Fase 5 — Tests ✅

- [x] Unitarios del servicio con repositorio mockeado (`vi.fn()`): `src/tasks/tasks.service.spec.ts` con 11 tests.
- [x] E2E del CRUD, validación, filtros y paginación con SQLite `:memory:`: `test/tasks.e2e-spec.ts` con 12 tests.
- [x] `test.env` en `vitest.config.e2e.ts` (`DATABASE_URL=:memory:`, `DB_AUTO_MIGRATE=true`, `NODE_ENV=test`); ya estaba configurado desde la Fase 1.
- [x] Cobertura del servicio con unitarios y del controlador por HTTP en los e2e (códigos, cuerpos y errores).

**Verificación:** `npm test` → 29 tests en 3 archivos; `npm run test:e2e` → 13 tests en 2 archivos. Ambos en verde, junto con `npm run build` y `npm run lint` sin avisos.

**Nota de implementación:** los e2e reinician la tabla en `beforeEach` con `DELETE FROM "tasks"` sobre el `DataSource` de la app y siembran tres tareas; los ids se leen de las respuestas porque `AUTOINCREMENT` no se reinicia. Los unitarios usan `vi.useFakeTimers()` para fijar los timestamps y `cloneTask()` para que el repositorio mockeado nunca devuelva la misma instancia entre pruebas.

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

### Repositorio, servicio y controlador separados

El repositorio concentra TypeORM y el SQL (filtros, orden, `skip`/`take`); el servicio aplica reglas de negocio (timestamps, `404`, `meta`) y mapea la entidad a la respuesta pública; el controlador solo declara rutas, esquemas y códigos HTTP. La separación permite probar el servicio con el repositorio mockeado y cambiar la persistencia sin tocar el contrato. El coste es una capa más de indirección para un CRUD pequeño, que se compensa con tests y mantenimiento más simples.

### Zod y `StandardSchemaValidationPipe` en lugar de DTOs con `class-validator`

Un único esquema produce validación runtime y tipos estáticos, sin duplicar clases ni depender de `emitDecoratorMetadata` para validar. Nest 12 integra Standard Schema de forma nativa y Swagger genera el OpenAPI desde Zod 4.2+: el esquema declarado en `@Body({ schema })`, `@Query({ schema })` o `@Param(..., { schema })` se convierte a OpenAPI 3.0 mediante Standard JSON Schema, así que el contrato documentado y el validado son el mismo. El coste es que el ecosistema de decoradores de Swagger (`@ApiProperty`) no se usa en los DTOs; los esquemas se documentan solos.

### `default` en creación y `partial()` en actualización

En Zod 4, `ZodDefault` es opcional por sí mismo: `createTaskSchema.partial()` no quitaba el `default` de `status`, y un `PATCH` sin ese campo habría devuelto `{ status: 'pending' }` y reseteado la tarea. Para evitarlo, los campos se declaran una vez en `taskFields` y el `default` se aplica solo al esquema de creación; el de actualización marca cada campo como opcional explícitamente. Un test protege el caso.

### IDs enteros autoincrementales

Simples, ordenables y eficientes en SQLite. Un UUID sería mejor si los ids se expusieran a terceros o se generaran en clientes; no es el caso. La migración sería un cambio de columna más ajuste de los esquemas.

### Fechas como texto ISO

SQLite no tiene un tipo `DATE`. Guardar `YYYY-MM-DD` para `dueDate` y timestamps ISO 8601 UTC para `createdAt`/`updatedAt` evita conversiones ambiguas del driver, se ordena lexicográficamente y es legible en cualquier cliente. La validación de fechas reales la hace Zod, no la base de datos.

### `assignee` como texto, no como tabla de usuarios

El enunciado pide un responsable, no autenticación ni gestión de usuarios. Un campo de texto validado mantiene el alcance pequeño. Si se añaden usuarios, se creará `users` y una FK `assignee_id`, con migración de datos.

### Filtro de `assignee` con `LOWER`

SQLite no tiene `ILIKE`, y su `LIKE`/`COLLATE NOCASE` tampoco distinguen mayúsculas fuera de ASCII. El filtro usa `LOWER(task.assignee) = LOWER(:assignee)`, que es explícito y portable, pero solo cubre ASCII: `ANA` encuentra `Ana`, mientras que `JOSÉ` no encontraría `José` con tilde distinta. Para ese caso haría falta guardar una columna normalizada (por ejemplo, sin acentos y en minúsculas) o usar FTS; se deja fuera del alcance actual y documentado.

### Paginación por offset

`page`/`limit` es fácil de consumir y de documentar. El orden es `due_date ASC, id ASC`: la fecha límite es lo más útil para una lista de tareas y el id desempata para que la paginación sea estable. `totalPages` es `ceil(total / limit)` (0 sin tareas) y una página posterior a la última devuelve `data: []` sin error. Con millones de filas, el offset profundo se vuelve lento; el siguiente paso sería paginación por cursor (`due_date`, `id`).

### Errores con el formato de Nest

`400` por validación, `404` por recurso inexistente y `204` al borrar. Se usa el formato estándar de Nest (`statusCode`, `message`, `error`) para no inventar un contrato propio y mantener Swagger y los clientes alineados.

### Estados: Zod y CHECK en la base de datos

La API valida `status` con Zod, pero la tabla también lleva un `CHECK` (`IN ('pending','in_progress','done')`). La validación de aplicación da mensajes útiles y la restricción de base de datos protege ante escrituras manuales o scripts futuros. El coste es tener que crear una migración si algún día se añade un estado nuevo.

### `synchronize: false`

Nunca se modifica el esquema automáticamente, ni en desarrollo. Las migraciones son la única fuente de verdad y se revisan antes de aplicarse; así se evita el riesgo clásico de pérdida de datos de `synchronize: true`.

### ESM, CLI de TypeORM y migraciones explícitas

El proyecto es ESM (`"type": "module"`, imports con `.js`). El CLI de TypeORM se ejecuta con `tsx` y las migraciones se generan con `--esm`, sin `ts-node` ni una compilación previa. Las migraciones se importan de forma estática y se listan en `data-source-options.ts`: un glob hacía que Vitest cargara el `.ts` con el loader nativo de Node, que no resuelve los tipos de TypeORM como valores. La lista explícita funciona igual en `src/`, en Vitest y en `dist/`. En tiempo de ejecución, TypeORM carga las migraciones compiladas de `dist/db/migrations`.

### Sin autenticación (fuera de alcance)

No hay login ni permisos: cualquiera con acceso a la API puede operar. Es una decisión de alcance, no un olvido. Antes de exponerla a internet se añadiría `@nestjs/authentication`, autorización por propietario y rate limiting con `@nestjs/throttler`.

---

## Próximos pasos

1. Terminar la fase 6 del plan: `Dockerfile`, `.dockerignore`, `docker-compose.yml` y verificación del contenedor.
2. Añadir autenticación y una tabla `users` si el responsable debe ser un usuario real.
3. Añadir `GET /api/tasks/stats` y recordatorios por fecha límite (scheduler + email).
4. CI (lint, build y tests en cada push) y publicación de la imagen Docker.
5. Evaluar PostgreSQL si crece el volumen o se necesitan varias réplicas.
