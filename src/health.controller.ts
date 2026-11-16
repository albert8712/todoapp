import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({
    summary: 'Comprueba que el servicio y la base de datos responden',
  })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        database: 'up',
        uptime: 12.34,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  async check(): Promise<{
    status: string;
    database: string;
    uptime: number;
    timestamp: string;
  }> {
    // Falla con 500 si el DataSource no puede consultar la base de datos, que
    // es exactamente lo que debe detectar un HEALTHCHECK en producción.
    await this.dataSource.query('SELECT 1');

    return {
      status: 'ok',
      database: 'up',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
