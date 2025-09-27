import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('todos')
export class Todo {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    @Index()
    title!: string;

    @Column({ type: 'boolean', default: false })
    completed!: boolean;

    @Column({ type: 'text', nullable: true })
    ownerId?: string | null;
}
