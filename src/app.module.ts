import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller.js';
import { parseEnv } from './config/env.js';
import { DatabaseModule } from './db/database.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: parseEnv,
    }),
    DatabaseModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
