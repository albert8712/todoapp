import { INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configuración HTTP compartida entre `main.ts` y los tests e2e, para que lo
 * que se prueba sea exactamente lo que se despliega.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const corsOrigin = config.getOrThrow<string>('CORS_ORIGIN');

  app.setGlobalPrefix('api');

  // Valida body/query/params contra los esquemas Zod declarados con la opción
  // `schema` de `@Body()`, `@Query()` y `@Param()`. Los parámetros sin esquema
  // pasan intactos.
  app.useGlobalPipes(new StandardSchemaValidationPipe());

  app.enableCors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
  });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Todo API')
    .setDescription(
      'API REST para gestionar tareas: CRUD, filtros por estado y responsable, y paginación.',
    )
    .setVersion('1.0')
    .addTag('tasks', 'Gestión de tareas')
    .addTag('health', 'Estado del servicio')
    .build();

  SwaggerModule.setup(
    'docs',
    app,
    () => SwaggerModule.createDocument(app, swaggerConfig),
    { jsonDocumentUrl: 'docs/json' },
  );
}
