import { Injectable, NotFoundException } from '@nestjs/common';
import type { Task } from './task.entity.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  PaginatedTasksResponse,
  TaskResponse,
  UpdateTaskInput,
} from './tasks.schemas.js';
import { TasksRepository } from './tasks.repository.js';

/**
 * Reglas de negocio: timestamps, existencia del recurso, cálculo de la
 * paginación y conversión de entidad a respuesta pública. El repositorio solo
 * sabe de base de datos y el controlador solo sabe de HTTP.
 */
@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  async create(input: CreateTaskInput): Promise<TaskResponse> {
    const now = new Date().toISOString();

    const task = await this.repository.create({
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      assignee: input.assignee,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now,
    });

    return toResponse(task);
  }

  async findOne(id: number): Promise<TaskResponse> {
    const task = await this.repository.findById(id);

    if (!task) {
      throw new NotFoundException(`No existe la tarea ${id}`);
    }

    return toResponse(task);
  }

  async findPage(query: ListTasksQuery): Promise<PaginatedTasksResponse> {
    const { items, total } = await this.repository.findPage(query);

    return {
      data: items.map(toResponse),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async update(id: number, input: UpdateTaskInput): Promise<TaskResponse> {
    const task = await this.repository.findById(id);

    if (!task) {
      throw new NotFoundException(`No existe la tarea ${id}`);
    }

    // Solo se tocan los campos presentes en el PATCH; `description: null`
    // borra la descripción, mientras que omitirla la deja intacta.
    if (input.title !== undefined) {
      task.title = input.title;
    }
    if (input.description !== undefined) {
      task.description = input.description;
    }
    if (input.status !== undefined) {
      task.status = input.status;
    }
    if (input.assignee !== undefined) {
      task.assignee = input.assignee;
    }
    if (input.dueDate !== undefined) {
      task.dueDate = input.dueDate;
    }

    task.updatedAt = new Date().toISOString();

    return toResponse(await this.repository.save(task));
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.repository.deleteById(id);

    if (!deleted) {
      throw new NotFoundException(`No existe la tarea ${id}`);
    }
  }
}

/**
 * Mapeo explícito para que la respuesta pública no dependa del orden ni de
 * columnas internas que se añadan a la entidad en el futuro.
 */
function toResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
