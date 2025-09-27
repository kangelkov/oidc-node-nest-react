import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from './todo.entity.js';
import { TodosService } from './todos.service.js';
import { TodosController } from './todos.controller.js';

@Module({
    imports: [TypeOrmModule.forFeature([Todo])],
    providers: [TodosService],
    controllers: [TodosController],
    exports: [TodosService]
})
export class TodosModule {}
