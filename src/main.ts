import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);

  Logger.log(`API disponible en http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(
    `OpenAPI disponible en http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

await bootstrap();
