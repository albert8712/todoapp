import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity.js';
import type { ListTasksQuery } from './tasks.schemas.js';

/**
 * Datos necesarios para insertar una tarea. El `id` lo genera SQLite y las
 * fechas las calcula el servicio, así que no forman parte de la entrada.
 */
export type NewTask = Omit<Task, 'id'>;

export interface TaskPage {
  items: Task[];
  total: number;
}

/**
 * Única capa que habla con TypeORM. El servicio no conoce QueryBuilder ni el
 * esquema de la tabla, y aquí se concentra el SQL (filtros, orden y paginación).
 */
@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  create(data: NewTask): Promise<Task> {
    return this.repository.save(this.repository.create(data));
  }

  findById(id: number): Promise<Task | null> {
    return this.repository.findOneBy({ id });
  }

  async findPage(query: ListTasksQuery): Promise<TaskPage> {
    const builder = this.repository.createQueryBuilder('task');

    if (query.status) {
      builder.andWhere('task.status = :status', { status: query.status });
    }

    if (query.assignee) {
      // SQLite no tiene ILIKE y su LIKE no distingue mayúsculas de forma
      // fiable; LOWER en ambos lados es explícito y portable.
      builder.andWhere('LOWER(task.assignee) = LOWER(:assignee)', {
        assignee: query.assignee,
      });
    }

    const [items, total] = await builder
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { items, total };
  }

  save(task: Task): Promise<Task> {
    return this.repository.save(task);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete({ id });
    return (result.affected ?? 0) > 0;
  }
}
