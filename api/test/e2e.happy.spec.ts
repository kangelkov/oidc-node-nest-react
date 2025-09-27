import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/shared/http-error.filter';
import { OidcService } from '../src/auth/oidc.service';
import { MockOidcService } from './utils/mock-oidc';

describe('E2E happy path (writer)', () => {
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

    it('writer can create → list → patch → delete', async () => {
        const created = await request(app.getHttpServer())
            .post('/api/todos')
            .set(auth('writerA'))
            .send({ title: 'End-to-end' })
            .expect(201);
        const id = created.body.id;

        await request(app.getHttpServer()).get('/api/todos').set(auth('writerA')).expect(200);

        await request(app.getHttpServer())
            .patch(`/api/todos/${id}`)
            .set(auth('writerA'))
            .send({ completed: true })
            .expect(200);

        await request(app.getHttpServer()).delete(`/api/todos/${id}`).set(auth('writerA')).expect(200);
    });
});
