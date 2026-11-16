import { z } from 'zod';
import { TASK_STATUSES } from './task.entity.js';

/**
 * Esquemas de entrada y salida de la API. Son la única fuente de verdad del
 * contrato: Nest los valida con `StandardSchemaValidationPipe` y TypeScript
 * infiere los tipos con `z.infer`, así que no hay DTOs duplicados.
 */

export const taskStatusSchema = z.enum(TASK_STATUSES);

/**
 * Campos compartidos por creación y actualización. Se declaran por separado
 * porque en Zod 4 `ZodDefault` ya cuenta como opcional: `partial()` sobre un
 * objeto con `default` conserva el valor por defecto, y un PATCH sin `status`
 * terminaría enviando `status: 'pending'`. Aquí el `default` solo se aplica en
 * la creación.
 */
const taskFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable(),
  status: taskStatusSchema,
  assignee: z.string().trim().min(1).max(120),
  dueDate: z.iso.date(),
};

export const createTaskSchema = z.strictObject({
  title: taskFields.title,
  description: taskFields.description.optional(),
  status: taskFields.status.default('pending'),
  assignee: taskFields.assignee,
  dueDate: taskFields.dueDate,
});

/**
 * Un PATCH parcial, pero con al menos un campo: un cuerpo vacío no describe
 * ninguna actualización y se rechaza con 400. Es `strictObject` como el de
 * creación, así que también rechaza campos desconocidos.
 */
export const updateTaskSchema = z
  .strictObject({
    title: taskFields.title.optional(),
    description: taskFields.description.optional(),
    status: taskFields.status.optional(),
    assignee: taskFields.assignee.optional(),
    dueDate: taskFields.dueDate.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debe indicar al menos un campo para actualizar',
  });

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  assignee: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const taskIdSchema = z.coerce.number().int().positive();

export const taskResponseSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  assignee: z.string(),
  dueDate: z.iso.date(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const paginatedTasksResponseSchema = z.object({
  data: z.array(taskResponseSchema),
  meta: paginationMetaSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskId = z.infer<typeof taskIdSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type PaginatedTasksResponse = z.infer<
  typeof paginatedTasksResponseSchema
>;
