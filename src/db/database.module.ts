import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './data-source-options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildDataSourceOptions({
          database: config.getOrThrow<string>('DATABASE_URL'),
          autoMigrate: config.getOrThrow<boolean>('DB_AUTO_MIGRATE'),
        }),
    }),
  ],
})
export class DatabaseModule {}
