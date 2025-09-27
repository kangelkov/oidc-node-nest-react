import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/shared/http-error.filter';
import { OidcService } from '../src/auth/oidc.service';
import { MockOidcService } from './utils/mock-oidc';

describe('Ownership rule (ENFORCE_OWNERSHIP=true)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        process.env.REQUIRE_AUTH = 'true';
        process.env.ENFORCE_OWNERSHIP = 'true';

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

    it('writerA creates; writerB cannot modify; admin can delete', async () => {
        const created = await request(app.getHttpServer())
            .post('/api/todos')
            .set(auth('writerA'))
            .send({ title: 'Owned by A' })
            .expect(201);
        const id = created.body.id;
        expect(created.body.ownerId).toBe('writer-a');

        await request(app.getHttpServer())
            .patch(`/api/todos/${id}`)
            .set(auth('writerB'))
            .send({ completed: true })
            .expect(403)
            .expect(res => {
                expect(res.body.error).toBe('not_owner');
            });

        await request(app.getHttpServer())
            .delete(`/api/todos/${id}`)
            .set(auth('admin'))
            .expect(200);
    });
});
