import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';
import type { Response } from 'supertest';
import { HttpErrorFilter } from '../src/shared/http-error.filter';

describe('Todos API (Task 1 unauthenticated)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        process.env.REQUIRE_AUTH = 'false';
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalFilters(new HttpErrorFilter());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('health ok', async () => {
        await request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
    });

    it('CRUD happy path + validation', async () => {
        const create = await request(app.getHttpServer())
            .post('/api/todos')
            .send({ title: 'Buy milk' })
            .expect(201);
        expect(create.body.title).toBe('Buy milk');

        const list = await request(app.getHttpServer()).get('/api/todos').expect(200);
        expect(list.body.length).toBeGreaterThanOrEqual(1);

        const id = create.body.id;
        const patch = await request(app.getHttpServer())
            .patch(`/api/todos/${id}`)
            .send({ completed: true })
            .expect(200);
        expect(patch.body.completed).toBe(true);

        await request(app.getHttpServer())
            .delete('/api/todos/does-not-exist')
            .expect(404)
            .expect({ error: 'not_found', path: '/api/todos/does-not-exist' });

        await request(app.getHttpServer())
            .post('/api/todos')
            .send({ title: '' })
            .expect(400)
            .expect((res: Response) => {
                expect(res.body.error).toMatch(/title is required|should not be empty/);
            });
    });

    it('docs.json present', async () => {
        await request(app.getHttpServer()).get('/api/docs.json').expect(200);
    });
});
