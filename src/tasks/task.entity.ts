import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Tipos de columna explícitos a propósito: Vitest transforma con esbuild, que
 * no emite `design:type`, así que TypeORM no puede inferir la columna solo con
 * el tipo de TypeScript. Declararlos también hace que la migración generada
 * sea determinista.
 */
@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index('idx_tasks_status')
  @Column({ type: 'simple-enum', enum: TASK_STATUSES, default: 'pending' })
  status: TaskStatus;

  @Index('idx_tasks_assignee')
  @Column({ type: 'text' })
  assignee: string;

  @Index('idx_tasks_due_date')
  @Column({ name: 'due_date', type: 'text' })
  dueDate: string;

  @Column({ name: 'created_at', type: 'text' })
  createdAt: string;

  @Column({ name: 'updated_at', type: 'text' })
  updatedAt: string;
}
