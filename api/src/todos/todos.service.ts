import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from './todo.entity.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';

@Injectable()
export class TodosService {
    constructor(@InjectRepository(Todo) private readonly repo: Repository<Todo>) {}

    async list(): Promise<Todo[]> {
        return this.repo.find({ order: { title: 'ASC' } });
    }

    async create(dto: CreateTodoDto, ownerId?: string | null): Promise<Todo> {
        const todo = this.repo.create({ title: dto.title, completed: false, ownerId: ownerId ?? null });
        return this.repo.save(todo);
    }

    async update(id: string, dto: UpdateTodoDto): Promise<Todo> {
        const todo = await this.repo.findOne({ where: { id } });
        if (!todo) throw new NotFoundException('not_found');
        if (dto.title !== undefined) todo.title = dto.title;
        if (dto.completed !== undefined) todo.completed = dto.completed;
        return this.repo.save(todo);
    }

    async remove(id: string): Promise<void> {
        const result = await this.repo.delete(id);
        if (!result.affected) throw new NotFoundException('not_found');
    }
}
