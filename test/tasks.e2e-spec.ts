import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';

interface TaskBody {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'done';
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

const seededTasks = {
  done: {
    title: 'Enviar facturas',
    status: 'done',
    assignee: 'ana',
    dueDate: '2026-11-10',
  },
  pending: {
    title: 'Revisar presupuesto',
    status: 'pending',
    assignee: 'Luis',
    dueDate: '2026-11-20',
  },
  inProgress: {
    title: 'Preparar informe',
    status: 'in_progress',
    assignee: 'Ana',
    dueDate: '2026-12-01',
  },
};

describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let created: TaskBody[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // Cada test arranca con las mismas tres tareas y sin ids fijos: no se
  // supone que AUTOINCREMENT vuelva a empezar en 1.
  beforeEach(async () => {
    await dataSource.query('DELETE FROM "tasks"');
    created = [
      await createTask(seededTasks.done),
      await createTask(seededTasks.pending),
      await createTask(seededTasks.inProgress),
    ];
  });

  async function createTask(
    payload: Record<string, unknown>,
  ): Promise<TaskBody> {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .send(payload)
      .expect(201);

    return response.body as TaskBody;
  }

  it('POST crea con defaults, recorta espacios y genera timestamps', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({
        title: '  Nueva tarea  ',
        assignee: '  Ana  ',
        dueDate: '2026-12-05',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Nueva tarea',
      description: null,
      status: 'pending',
      assignee: 'Ana',
      dueDate: '2026-12-05',
    });
    expect(response.body.createdAt).toBe(response.body.updatedAt);
    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
  });

  it('POST rechaza campos desconocidos, fechas imposibles y estados inválidos', async () => {
    const base = {
      title: 'Tarea válida',
      assignee: 'Ana',
      dueDate: '2026-12-01',
    };

    const unknown = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ ...base, priority: 'alta' })
      .expect(400);
    expect(JSON.stringify(unknown.body.message)).toContain('Unrecognized key');

    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ ...base, dueDate: '2026-02-30' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ ...base, status: 'hecha' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ ...base, title: '   ' })
      .expect(400);
  });

  it('GET lista ordenado por dueDate e id con meta', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/tasks')
      .expect(200);

    expect(response.body.data.map((item: TaskBody) => item.title)).toEqual([
      'Enviar facturas',
      'Revisar presupuesto',
      'Preparar informe',
    ]);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it('GET filtra por status y assignee sin distinguir mayúsculas', async () => {
    const combined = await request(app.getHttpServer())
      .get('/api/tasks?status=done&assignee=ANA')
      .expect(200);

    expect(combined.body.data).toHaveLength(1);
    expect(combined.body.data[0].title).toBe('Enviar facturas');

    const byAssignee = await request(app.getHttpServer())
      .get('/api/tasks?assignee=ana')
      .expect(200);

    expect(
      byAssignee.body.data.map((item: TaskBody) => item.title).sort(),
    ).toEqual(['Enviar facturas', 'Preparar informe']);
  });

  it('GET pagina con limit, total y totalPages, incluida una página vacía', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/tasks?page=1&limit=2')
      .expect(200);

    expect(first.body.data).toHaveLength(2);
    expect(first.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });

    const second = await request(app.getHttpServer())
      .get('/api/tasks?page=2&limit=2')
      .expect(200);

    expect(second.body.data).toHaveLength(1);
    expect(second.body.data[0].title).toBe('Preparar informe');

    const beyond = await request(app.getHttpServer())
      .get('/api/tasks?page=99&limit=2')
      .expect(200);

    expect(beyond.body.data).toEqual([]);
    expect(beyond.body.meta.page).toBe(99);
  });

  it('GET /:id devuelve la tarea', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/tasks/${created[2].id}`)
      .expect(200);

    expect(response.body).toEqual(created[2]);
  });

  it('GET /:id devuelve 404 si no existe y 400 si el id es inválido', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/tasks/999999')
      .expect(404);
    expect(missing.body.message).toBe('No existe la tarea 999999');

    await request(app.getHttpServer()).get('/api/tasks/abc').expect(400);
    await request(app.getHttpServer()).get('/api/tasks/0').expect(400);
  });

  it('PATCH actualiza solo los campos enviados y conserva createdAt', async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await request(app.getHttpServer())
      .patch(`/api/tasks/${created[2].id}`)
      .send({ status: 'done' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: created[2].id,
      title: created[2].title,
      description: created[2].description,
      status: 'done',
      assignee: created[2].assignee,
      dueDate: created[2].dueDate,
      createdAt: created[2].createdAt,
    });
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(
      Date.parse(created[2].updatedAt),
    );
  });

  it('PATCH borra la descripción con null y rechaza cuerpo vacío o desconocido', async () => {
    const cleared = await request(app.getHttpServer())
      .patch(`/api/tasks/${created[1].id}`)
      .send({ description: null })
      .expect(200);
    expect(cleared.body.description).toBeNull();

    const empty = await request(app.getHttpServer())
      .patch(`/api/tasks/${created[1].id}`)
      .send({})
      .expect(400);
    expect(JSON.stringify(empty.body.message)).toContain(
      'Debe indicar al menos un campo',
    );

    const unknown = await request(app.getHttpServer())
      .patch(`/api/tasks/${created[1].id}`)
      .send({ priority: 'alta' })
      .expect(400);
    expect(JSON.stringify(unknown.body.message)).toContain('Unrecognized key');
  });

  it('PATCH devuelve 404 si la tarea no existe', async () => {
    const missing = await request(app.getHttpServer())
      .patch('/api/tasks/999999')
      .send({ status: 'done' })
      .expect(404);

    expect(missing.body.message).toBe('No existe la tarea 999999');
  });

  it('DELETE responde 204 sin cuerpo y 404 al repetir', async () => {
    const target = await createTask({
      title: 'Tarea temporal',
      assignee: 'Ana',
      dueDate: '2026-12-31',
    });

    const deleted = await request(app.getHttpServer())
      .delete(`/api/tasks/${target.id}`)
      .expect(204);
    expect(deleted.text ?? '').toBe('');

    await request(app.getHttpServer())
      .delete(`/api/tasks/${target.id}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/api/tasks')
      .expect(200);
    expect(list.body.meta.total).toBe(3);
  });

  it('GET rechaza filtros y paginación inválidos', async () => {
    await request(app.getHttpServer()).get('/api/tasks?limit=101').expect(400);
    await request(app.getHttpServer()).get('/api/tasks?page=0').expect(400);
    await request(app.getHttpServer())
      .get('/api/tasks?status=pendiente')
      .expect(400);
  });
});
