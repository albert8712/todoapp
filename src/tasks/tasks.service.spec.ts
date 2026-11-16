import type { Task } from './task.entity.js';
import { TasksService } from './tasks.service.js';
import type { TasksRepository } from './tasks.repository.js';

const task: Task = {
  id: 1,
  title: 'Preparar informe',
  description: 'Cerrar el trimestre',
  status: 'in_progress',
  assignee: 'Ana',
  dueDate: '2026-12-01',
  createdAt: '2026-11-16T12:00:00.000Z',
  updatedAt: '2026-11-16T12:00:00.000Z',
};

/**
 * Copia explícita para que el repositorio mockeado nunca devuelva la misma
 * instancia entre tests. La entidad es una clase, así que se evita el spread
 * (perdería el prototipo y oxlint lo marca).
 */
function cloneTask(overrides: Partial<Task> = {}): Task {
  return Object.assign(
    {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignee: task.assignee,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    },
    overrides,
  );
}

const repository = {
  create: vi.fn(),
  findById: vi.fn(),
  findPage: vi.fn(),
  save: vi.fn(),
  deleteById: vi.fn(),
};

let service: TasksService;

beforeEach(() => {
  vi.resetAllMocks();
  service = new TasksService(repository as unknown as TasksRepository);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TasksService.create', () => {
  it('crea la tarea con description null y timestamps del servidor', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T12:00:00.000Z'));
    repository.create.mockImplementation(async (data) => ({ id: 1, ...data }));

    const result = await service.create({
      title: 'Preparar informe',
      status: 'pending',
      assignee: 'Ana',
      dueDate: '2026-12-01',
    });

    expect(repository.create).toHaveBeenCalledWith({
      title: 'Preparar informe',
      description: null,
      status: 'pending',
      assignee: 'Ana',
      dueDate: '2026-12-01',
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
    });
    expect(result).toEqual({
      id: 1,
      title: 'Preparar informe',
      description: null,
      status: 'pending',
      assignee: 'Ana',
      dueDate: '2026-12-01',
      createdAt: '2026-11-16T12:00:00.000Z',
      updatedAt: '2026-11-16T12:00:00.000Z',
    });
  });

  it('conserva la descripción cuando se envía', async () => {
    repository.create.mockImplementation(async (data) => ({ id: 2, ...data }));

    const result = await service.create({
      title: 'Preparar informe',
      description: 'Cerrar el trimestre',
      status: 'done',
      assignee: 'Ana',
      dueDate: '2026-12-01',
    });

    expect(result.description).toBe('Cerrar el trimestre');
    expect(result.status).toBe('done');
  });
});

describe('TasksService.findOne', () => {
  it('devuelve la tarea mapeada', async () => {
    repository.findById.mockResolvedValue(task);

    await expect(service.findOne(1)).resolves.toEqual(task);
    expect(repository.findById).toHaveBeenCalledWith(1);
  });

  it('lanza NotFoundException si no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(42)).rejects.toThrow('No existe la tarea 42');
  });
});

describe('TasksService.findPage', () => {
  it('propaga los filtros y calcula totalPages', async () => {
    repository.findPage.mockResolvedValue({ items: [task], total: 3 });
    const query = {
      status: 'in_progress',
      assignee: 'Ana',
      page: 2,
      limit: 2,
    } as const;

    const result = await service.findPage(query);

    expect(repository.findPage).toHaveBeenCalledWith(query);
    expect(result).toEqual({
      data: [task],
      meta: { page: 2, limit: 2, total: 3, totalPages: 2 },
    });
  });

  it('devuelve totalPages 0 cuando no hay tareas', async () => {
    repository.findPage.mockResolvedValue({ items: [], total: 0 });

    const result = await service.findPage({ page: 1, limit: 20 });

    expect(result).toEqual({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });
});

describe('TasksService.update', () => {
  it('aplica solo los campos enviados y actualiza updatedAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T13:00:00.000Z'));
    repository.findById.mockResolvedValue(cloneTask());
    repository.save.mockImplementation(async (value) => value);

    const result = await service.update(1, { status: 'done' });

    expect(result).toEqual(
      cloneTask({ status: 'done', updatedAt: '2026-11-16T13:00:00.000Z' }),
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, status: 'done' }),
    );
  });

  it('borra la descripción con null', async () => {
    repository.findById.mockResolvedValue(cloneTask());
    repository.save.mockImplementation(async (value) => value);

    const result = await service.update(1, { description: null });

    expect(result.description).toBeNull();
    expect(result.title).toBe(task.title);
  });

  it('lanza NotFoundException si la tarea no existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.update(99, { status: 'done' })).rejects.toThrow(
      'No existe la tarea 99',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('TasksService.remove', () => {
  it('elimina la tarea existente', async () => {
    repository.deleteById.mockResolvedValue(true);

    await expect(service.remove(1)).resolves.toBeUndefined();
    expect(repository.deleteById).toHaveBeenCalledWith(1);
  });

  it('lanza NotFoundException si no se eliminó ninguna fila', async () => {
    repository.deleteById.mockResolvedValue(false);

    await expect(service.remove(99)).rejects.toThrow('No existe la tarea 99');
  });
});
