import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  createTaskSchema,
  listTasksQuerySchema,
  paginatedTasksResponseSchema,
  taskIdSchema,
  taskResponseSchema,
  updateTaskSchema,
} from './tasks.schemas.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  PaginatedTasksResponse,
  TaskResponse,
  UpdateTaskInput,
} from './tasks.schemas.js';
import { TasksService } from './tasks.service.js';

/**
 * Capa HTTP: traduce rutas y códigos de estado. La validación la hace el
 * `StandardSchemaValidationPipe` global con los esquemas declarados en cada
 * parámetro, y Swagger lee esos mismos esquemas para documentar el contrato.
 */
@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Crea una tarea' })
  @ApiCreatedResponse({
    description: 'Tarea creada',
    standardSchema: taskResponseSchema,
  })
  @ApiBadRequestResponse({
    description:
      'Cuerpo inválido: campo faltante, tipo incorrecto o desconocido',
  })
  create(
    @Body({ schema: createTaskSchema }) input: CreateTaskInput,
  ): Promise<TaskResponse> {
    return this.tasksService.create(input);
  }

  @Get()
  @ApiOperation({ summary: 'Lista tareas con filtros y paginación' })
  @ApiOkResponse({
    description: 'Página de tareas ordenada por fecha límite e id',
    standardSchema: paginatedTasksResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Filtros o paginación inválidos',
  })
  findAll(
    @Query({ schema: listTasksQuerySchema }) query: ListTasksQuery,
  ): Promise<PaginatedTasksResponse> {
    return this.tasksService.findPage(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene una tarea por id' })
  @ApiParam({ name: 'id', description: 'Identificador de la tarea' })
  @ApiOkResponse({
    description: 'Tarea encontrada',
    standardSchema: taskResponseSchema,
  })
  @ApiBadRequestResponse({ description: 'Id no numérico, cero o negativo' })
  @ApiNotFoundResponse({ description: 'No existe una tarea con ese id' })
  findOne(
    @Param('id', { schema: taskIdSchema }) id: number,
  ): Promise<TaskResponse> {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza parcialmente una tarea' })
  @ApiParam({ name: 'id', description: 'Identificador de la tarea' })
  @ApiOkResponse({
    description: 'Tarea actualizada',
    standardSchema: taskResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Id inválido o cuerpo vacío/con campos desconocidos',
  })
  @ApiNotFoundResponse({ description: 'No existe una tarea con ese id' })
  update(
    @Param('id', { schema: taskIdSchema }) id: number,
    @Body({ schema: updateTaskSchema }) input: UpdateTaskInput,
  ): Promise<TaskResponse> {
    return this.tasksService.update(id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una tarea' })
  @ApiParam({ name: 'id', description: 'Identificador de la tarea' })
  @ApiNoContentResponse({ description: 'Tarea eliminada' })
  @ApiBadRequestResponse({ description: 'Id no numérico, cero o negativo' })
  @ApiNotFoundResponse({ description: 'No existe una tarea con ese id' })
  async remove(
    @Param('id', { schema: taskIdSchema }) id: number,
  ): Promise<void> {
    await this.tasksService.remove(id);
  }
}
