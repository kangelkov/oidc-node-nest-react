import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/shared/http-error.filter';
import { OidcService } from '../src/auth/oidc.service';
import { MockOidcService } from './utils/mock-oidc';

describe('AuthN/AuthZ integration (REQUIRE_AUTH=true)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        process.env.REQUIRE_AUTH = 'true';
        process.env.ENFORCE_OWNERSHIP = 'false';

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule]
        })
            .overrideProvider(OidcService)
            .useClass(MockOidcService as any)
            .compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        app.useGlobalFilters(new HttpErrorFilter());
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    const auth = (b: string) => ({ Authorization: `Bearer ${b}` });

    it('401 when missing Authorization', async () => {
        await request(app.getHttpServer()).get('/api/todos').expect(401).expect(res => {
            expect(res.body.error).toBe('missing_bearer');
        });
    });

    it('reader: can GET 200, cannot POST/PATCH/DELETE (403)', async () => {
        await request(app.getHttpServer())
            .get('/api/todos')
            .set(auth('reader'))
            .expect(200);

        await request(app.getHttpServer())
            .post('/api/todos')
            .set(auth('reader'))
            .send({ title: 'x' })
            .expect(403);

        await request(app.getHttpServer())
            .patch('/api/todos/some-id')
            .set(auth('reader'))
            .send({ completed: true })
            .expect(403);

        await request(app.getHttpServer())
            .delete('/api/todos/some-id')
            .set(auth('reader'))
            .expect(403);
    });

    it('invalid token -> 401', async () => {
        await request(app.getHttpServer())
            .get('/api/todos')
            .set(auth('invalid'))
            .expect(401)
            .expect(res => {
                expect(res.body.error).toBe('invalid_token');
            });
    });

    it('writer: full CRUD happy path', async () => {
        const created = await request(app.getHttpServer())
            .post('/api/todos')
            .set(auth('writerA'))
            .send({ title: 'Buy milk' })
            .expect(201);
        expect(created.body.title).toBe('Buy milk');
        const id = created.body.id;

        const list = await request(app.getHttpServer())
            .get('/api/todos')
            .set(auth('writerA'))
            .expect(200);
        expect(list.body.find((t: any) => t.id === id)).toBeTruthy();

        const patched = await request(app.getHttpServer())
            .patch(`/api/todos/${id}`)
            .set(auth('writerA'))
            .send({ completed: true })
            .expect(200);
        expect(patched.body.completed).toBe(true);

        await request(app.getHttpServer())
            .delete(`/api/todos/${id}`)
            .set(auth('writerA'))
            .expect(200);
    });

    it('validation & not found', async () => {
        await request(app.getHttpServer())
            .post('/api/todos')
            .set(auth('writerA'))
            .send({ title: '' })
            .expect(400)
            .expect(res => {
                expect(res.body.error).toMatch(/title is required|should not be empty/);
            });

        await request(app.getHttpServer())
            .delete('/api/todos/does-not-exist')
            .set(auth('writerA'))
            .expect(404)
            .expect(res => {
                expect(res.body.error).toBe('not_found');
            });
    });

    it('docs.json and health are reachable', async () => {
        await request(app.getHttpServer()).get('/api/docs.json').expect(200);
        await request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok' });
    });
});
