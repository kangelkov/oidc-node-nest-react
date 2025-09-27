import { Controller, Get } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common/interfaces/nest-application.interface';
import { AppModule } from './app.module.js';
import { NestFactory } from '@nestjs/core';

let cachedDoc: any;

async function generateDoc() {
    if (cachedDoc) return cachedDoc;
    const app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    const config = new DocumentBuilder()
        .setTitle('Todo API')
        .setDescription('OIDC + RBAC secured Todo API')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app as unknown as INestApplication, config);
    await app.close();
    cachedDoc = document;
    return cachedDoc;
}

@Controller('docs.json')
export class DocsController {
    @Get()
    async json() {
        return await generateDoc();
    }
}
