import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Comprueba que el servicio está vivo' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        uptime: 12.34,
        timestamp: '2026-01-01T00:00:00.000Z',
      },
    },
  })
  check(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
