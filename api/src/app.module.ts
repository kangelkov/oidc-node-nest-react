import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller.js';
import { TodosModule } from './todos/todos.module.js';
import { DocsController } from './docs.controller.js';
import { OidcModule } from './auth/oidc.module.js';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (cfg: ConfigService) => ({
                type: 'sqlite',
                database: cfg.get<string>('SQLITE_DB_PATH') ?? './data/db.sqlite',
                autoLoadEntities: true,
                synchronize: true,
                logging: false
            }),
            inject: [ConfigService]
        }),
        OidcModule,
        TodosModule
    ],
    controllers: [HealthController, DocsController]
})
export class AppModule {}
