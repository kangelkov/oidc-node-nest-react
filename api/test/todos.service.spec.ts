import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TodosService } from '../src/todos/todos.service';
import { Todo } from '../src/todos/todo.entity';

describe('TodosService', () => {
    let svc: TodosService;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [Todo],
                    synchronize: true
                }),
                TypeOrmModule.forFeature([Todo])
            ],
            providers: [TodosService]
        }).compile();

        svc = moduleRef.get(TodosService);
    });

    it('creates and lists todos', async () => {
        const created = await svc.create({ title: 'Buy milk' }, 'user-1');
        expect(created.id).toBeDefined();
        expect(created.completed).toBe(false);
        const list = await svc.list();
        expect(list.length).toBe(1);
        expect(list[0].title).toBe('Buy milk');
    });

    it('updates and deletes', async () => {
        const t = await svc.create({ title: 'Task' }, null);
        const updated = await svc.update(t.id, { completed: true, title: 'Task updated' });
        expect(updated.completed).toBe(true);
        await svc.remove(t.id);
        await expect(svc.update(t.id, { completed: false })).rejects.toThrow('not_found');
    });
});
