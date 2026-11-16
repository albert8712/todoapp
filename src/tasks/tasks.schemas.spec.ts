import {
  createTaskSchema,
  listTasksQuerySchema,
  paginatedTasksResponseSchema,
  taskIdSchema,
  taskResponseSchema,
  updateTaskSchema,
} from './tasks.schemas.js';

const validTask = {
  title: 'Preparar informe',
  assignee: 'Ana',
  dueDate: '2026-12-01',
};

describe('createTaskSchema', () => {
  it('aplica el estado por defecto y recorta los espacios', () => {
    const parsed = createTaskSchema.parse({
      ...validTask,
      title: '  Preparar informe  ',
      assignee: '  Ana  ',
      description: '  Cerrar el trimestre  ',
    });

    expect(parsed).toEqual({
      title: 'Preparar informe',
      description: 'Cerrar el trimestre',
      status: 'pending',
      assignee: 'Ana',
      dueDate: '2026-12-01',
    });
  });

  it('acepta description ausente o nula y rechaza un título vacío', () => {
    expect(createTaskSchema.parse(validTask).description).toBeUndefined();
    expect(
      createTaskSchema.parse({ ...validTask, description: null }).description,
    ).toBeNull();
    expect(() =>
      createTaskSchema.parse({ ...validTask, title: '   ' }),
    ).toThrow(/title/);
  });

  it('rechaza fechas que no existen en el calendario', () => {
    expect(() =>
      createTaskSchema.parse({ ...validTask, dueDate: '2026-02-30' }),
    ).toThrow(/Invalid ISO date/);
    expect(() =>
      createTaskSchema.parse({ ...validTask, dueDate: '01/12/2026' }),
    ).toThrow(/Invalid ISO date/);
  });

  it('rechaza un estado fuera del dominio', () => {
    expect(() =>
      createTaskSchema.parse({ ...validTask, status: 'hecha' }),
    ).toThrow(/status/);
  });

  it('rechaza campos desconocidos', () => {
    expect(() =>
      createTaskSchema.parse({ ...validTask, priority: 'alta' }),
    ).toThrow(/Unrecognized key/);
  });
});

describe('updateTaskSchema', () => {
  it('acepta una actualización parcial', () => {
    expect(updateTaskSchema.parse({ status: 'done' })).toEqual({
      status: 'done',
    });
    // Sin `status` no debe inyectarse el valor por defecto de creación.
    expect(updateTaskSchema.parse({ title: 'Otro' })).toEqual({
      title: 'Otro',
    });
    // `description: null` es una actualización válida (borra la descripción).
    expect(updateTaskSchema.parse({ description: null })).toEqual({
      description: null,
    });
  });

  it('rechaza un cuerpo vacío', () => {
    expect(() => updateTaskSchema.parse({})).toThrow(/al menos un campo/);
  });

  it('mantiene las validaciones de campos y el rechazo de desconocidos', () => {
    expect(() => updateTaskSchema.parse({ status: 'hecha' })).toThrow(/status/);
    expect(() =>
      updateTaskSchema.parse({ title: 'Otro', priority: 'alta' }),
    ).toThrow(/Unrecognized key/);
  });
});

describe('listTasksQuerySchema', () => {
  it('convierte page y limit y recorta el filtro de responsable', () => {
    expect(
      listTasksQuerySchema.parse({
        page: '2',
        limit: '50',
        status: 'done',
        assignee: '  Ana  ',
      }),
    ).toEqual({ page: 2, limit: 50, status: 'done', assignee: 'Ana' });
  });

  it('aplica page=1 y limit=20 por defecto', () => {
    expect(listTasksQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('rechaza límites fuera de rango y filtros inválidos', () => {
    expect(() => listTasksQuerySchema.parse({ limit: '101' })).toThrow(/limit/);
    expect(() => listTasksQuerySchema.parse({ page: '0' })).toThrow(/page/);
    expect(() => listTasksQuerySchema.parse({ page: 'dos' })).toThrow(/page/);
    expect(() => listTasksQuerySchema.parse({ status: 'pendiente' })).toThrow(
      /status/,
    );
  });
});

describe('taskIdSchema', () => {
  it('convierte un id válido a número', () => {
    expect(taskIdSchema.parse('3')).toBe(3);
  });

  it('rechaza cero, negativos y texto', () => {
    expect(() => taskIdSchema.parse('0')).toThrow();
    expect(() => taskIdSchema.parse('-1')).toThrow();
    expect(() => taskIdSchema.parse('abc')).toThrow();
  });
});

describe('respuesta pública', () => {
  const response = {
    id: 1,
    ...validTask,
    description: null,
    status: 'pending',
    createdAt: '2026-11-16T12:00:00.000Z',
    updatedAt: '2026-11-16T12:00:00.000Z',
  };

  it('acepta una tarea y una página válidas', () => {
    expect(taskResponseSchema.parse(response)).toEqual(response);
    expect(
      paginatedTasksResponseSchema.parse({
        data: [response],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    ).toEqual({
      data: [response],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('rechaza fechas y timestamps con formato inválido', () => {
    expect(() =>
      taskResponseSchema.parse({ ...response, dueDate: '2026-02-30' }),
    ).toThrow(/dueDate/);
    expect(() =>
      taskResponseSchema.parse({ ...response, createdAt: '2026-11-16' }),
    ).toThrow(/createdAt/);
  });
});
