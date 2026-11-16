import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasks1794863403592 implements MigrationInterface {
  name = 'CreateTasks1794863403592';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tasks" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "title" text NOT NULL, "description" text, "status" varchar CHECK( "status" IN ('pending','in_progress','done') ) NOT NULL DEFAULT ('pending'), "assignee" text NOT NULL, "due_date" text NOT NULL, "created_at" text NOT NULL, "updated_at" text NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_status" ON "tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_assignee" ON "tasks" ("assignee") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_due_date" ON "tasks" ("due_date") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX "idx_tasks_assignee"`);
    await queryRunner.query(`DROP INDEX "idx_tasks_status"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
  }
}
